"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";

// ---- 실시간 브라우저 자막용 타입 가드 ----
type SR =
  | (typeof window & { SpeechRecognition: any })["SpeechRecognition"]
  | (typeof window & { webkitSpeechRecognition: any })["webkitSpeechRecognition"];


export default function ADHDVoicePage() {
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState(""); // 실시간 텍스트
  const [finalText, setFinalText] = useState("");     // 최종(Whisper) 텍스트
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);

  // SpeechRecognition
  const recRef = useRef<InstanceType<SR> | null>(null);

  // 타이머
  const startTimer = () => {
    const t0 = Date.now();
    timerRef.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 200) as unknown as number;
  };
  const stopTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  // 브라우저 실시간 인식 시작
  const startBrowserRecognition = useCallback(() => {
    try {
      const SRCtor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SRCtor) return;

      const rec = new SRCtor() as InstanceType<SR>;
      rec.lang = "ko-KR";         // 필요 시 opts로 노출
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (e: SpeechRecognitionEvent) => {
        let interim = "";
        let final = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) final += r[0].transcript;
          else interim += r[0].transcript;
        }
        if (final) {
          // 브라우저 최종 결과는 참고용으로만 누적
          setInterimText("");
          setFinalText((prev) => (prev ? prev + " " : "") + final.trim());
        } else {
          setInterimText(interim);
        }
      };
      rec.onerror = () => {};
      rec.onend = () => {
        // 녹음이 끝나며 자동으로 종료됨. 필요시 재시작 로직 가능
      };
      rec.start();
      recRef.current = rec;
    } catch {}
  }, []);

  const stopBrowserRecognition = useCallback(() => {
    try {
      recRef.current?.stop();
      recRef.current = null;
    } catch {}
  }, []);

  const startRecording = useCallback(async () => {
    setFinalText("");
    setInterimText("");
    setElapsed(0);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });

    audioChunksRef.current = [];
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
    };
    rec.onstop = async () => {
      stopTimer();
      stopBrowserRecognition();

      // Whisper 전송
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const fd = new FormData();
      fd.set("audio", blob, "recording.webm");

      setUploading(true);
      try {
        const res = await fetch("/api/transcribe", { method: "POST", body: fd });
        const json = await res.json();
        if (json?.text) {
          setFinalText(json.text);
        } else if (json?.error) {
          setFinalText(`[서버 오류] ${json.error}`);
        }
      } catch (e: any) {
        setFinalText(`[네트워크 오류] ${e?.message ?? "unknown"}`);
      } finally {
        setUploading(false);
      }
    };

    rec.start(250); // 250ms chunk
    mediaRecorderRef.current = rec;

    setIsRecording(true);
    startTimer();
    startBrowserRecognition();
  }, [startBrowserRecognition, stopBrowserRecognition]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current = null;
  }, []);

  // 업로드 상태
  const [uploading, setUploading] = useState(false);

  // UI 파라미터
  const timeLabel = useMemo(() => {
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, [elapsed]);

  return (
    <Wrap>
      <Header>
        <LogoBox>
          <LogoMark />
          <h1>ADHD DIAGNOSIS</h1>
        </LogoBox>
        <RightBox>
          <GhostBtn>로그인</GhostBtn>
        </RightBox>
      </Header>

      <Main>
        <Card>
          <h2>음성 기반 자가진단</h2>
          <p className="sub">질문을 읽고 대답을 말하세요. 녹음 중 실시간 텍스트가 표시됩니다.</p>

          <MicPanel $active={isRecording}>
            <MicGlow $active={isRecording}>
              <MicDot />
            </MicGlow>
            <div className="stat">
              <span className="badge">{isRecording ? "녹음중" : "대기중"}</span>
              <span className="time">{timeLabel}</span>
            </div>
            <div className="liveText" aria-live="polite" aria-atomic="true">
              {interimText ? (
                <span className="interim">{interimText}</span>
              ) : (
                <span className="placeholder">여기에 실시간 자막이 나타납니다…</span>
              )}
            </div>

            <Controls>
              {!isRecording ? (
                <PrimaryButton onClick={startRecording} aria-label="녹음 시작">시작하기</PrimaryButton>
              ) : (
                <DangerButton onClick={stopRecording} aria-label="녹음 종료">종료하기</DangerButton>
              )}
              <SecondaryButton
                onClick={() => {
                  setInterimText("");
                  setFinalText("");
                  setElapsed(0);
                }}
                disabled={isRecording || uploading}
              >
                초기화
              </SecondaryButton>
            </Controls>
          </MicPanel>

          <ResultBox>
            <div className="title">
              <span>최종 전사 결과</span>
              {uploading && <span className="pill">Whisper 처리중…</span>}
            </div>
            <div className="content">
              {finalText ? finalText : <span className="placeholder">종료 후 결과가 표시됩니다.</span>}
            </div>
          </ResultBox>
        </Card>
      </Main>
    </Wrap>
  );
}

// ---------------------- styled ----------------------
const Wrap = styled.div`
  min-height: 100vh;
  background: #f3f6fb;
  color: #0f172a;
`;
const Header = styled.header`
  height: 64px;
  padding: 0 20px;
  display: flex; align-items: center; justify-content: space-between;
`;
const LogoBox = styled.div`
  display: flex; align-items: center; gap: 10px;
  h1 { font-size: 18px; letter-spacing: 0.6px; color: #2d4bf0; font-weight: 800; }
`;
const LogoMark = styled.div`
  width: 28px; height: 28px; border-radius: 8px; background: #2d4bf0;
  box-shadow: 0 6px 18px rgba(45, 75, 240, 0.35);
`;
const RightBox = styled.div``;
const GhostBtn = styled.button`
  padding: 8px 12px; border-radius: 10px; border: 1px solid #cdd5ff; background: #eef2ff; color: #2d4bf0;
  font-weight: 600;
`;

const Main = styled.main`
  max-width: 980px; margin: 40px auto; padding: 0 16px;
`;
const Card = styled.section`
  margin: 0 auto; background: #fff; border-radius: 16px; border: 1px solid #e5e7eb;
  padding: 32px; box-shadow: 0 10px 30px rgba(16,24,40,0.04);

  h2 { font-size: 24px; font-weight: 800; color: #3b3f67; margin: 0 0 6px; text-align: center; }
  .sub { color: #8f95b2; text-align: center; margin-bottom: 22px; }
`;

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(79,70,229,0.35); }
  70% { box-shadow: 0 0 0 14px rgba(79,70,229,0); }
  100% { box-shadow: 0 0 0 0 rgba(79,70,229,0); }
`;
const breathe = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.03); }
  100% { transform: scale(1); }
`;

const MicPanel = styled.div<{ $active: boolean }>`
  background: #fafbff; border: 1px solid #e8ebff; border-radius: 14px; padding: 20px;
  display: grid; gap: 14px;
  grid-template-columns: 72px 1fr; grid-template-rows: auto auto;
  grid-template-areas:
    "glow stat"
    "glow live";
  .stat { grid-area: stat; display: flex; align-items: center; gap: 10px; }
  .badge {
    background: ${({ $active }) => ($active ? "#e8e9ff" : "#e9f5ff")};
    color: ${({ $active }) => ($active ? "#4338ca" : "#0ea5e9")};
    font-weight: 700; padding: 6px 10px; border-radius: 999px; font-size: 12px;
    border: 1px solid ${({ $active }) => ($active ? "#c7ccff" : "#c8ecff")};
  }
  .time { font-weight: 800; color: #475569; }
  .liveText {
    grid-area: live; min-height: 72px; background: #fff; border: 1px dashed #d9def7;
    border-radius: 12px; padding: 12px 14px; display: flex; align-items: center;
  }
  .interim { color: #1f2937; font-size: 16px; }
  .placeholder { color: #9aa3b2; }
`;

const MicGlow = styled.div<{ $active: boolean }>`
  grid-area: glow; width: 72px; height: 72px; border-radius: 16px; background: #eef2ff;
  display: grid; place-items: center; border: 1px solid #dfe4ff;
  animation: ${({ $active }) => ($active ? breathe : "none")} 1.8s ease-in-out infinite;
  position: relative;
  &::after {
    content: ""; position: absolute; inset: 0; border-radius: 16px;
    animation: ${({ $active }) => ($active ? pulse : "none")} 1.8s ease-out infinite;
  }
`;
const MicDot = styled.div`
  width: 18px; height: 18px; border-radius: 999px; background: #4f46e5;
  box-shadow: 0 6px 16px rgba(79,70,229,0.5), inset 0 -2px 4px rgba(0,0,0,0.15);
`;

const Controls = styled.div`
  grid-column: 1 / -1; display: flex; gap: 10px; justify-content: center; margin-top: 2px;
`;
const PrimaryButton = styled.button`
  padding: 12px 18px; border-radius: 12px; font-weight: 800; color: #fff; background: #6366f1; border: none;
  box-shadow: 0 8px 20px rgba(99,102,241,0.35);
  &:hover { transform: translateY(-1px); }
`;
const DangerButton = styled(PrimaryButton)`
  background: #ef4444; box-shadow: 0 8px 20px rgba(239,68,68,0.25);
`;
const SecondaryButton = styled.button`
  padding: 12px 16px; border-radius: 12px; font-weight: 700; color: #475569; background: #fff; border: 1px solid #e2e8f0;
`;

const ResultBox = styled.div`
  margin-top: 18px; background: #fff; border: 1px solid #e8ebff; border-radius: 14px; padding: 16px;
  .title { display: flex; align-items: center; gap: 8px; font-weight: 800; color: #3b3f67; margin-bottom: 8px; }
  .pill { font-size: 12px; padding: 4px 8px; border-radius: 999px; background: #f1f5ff; color: #4f46e5; border: 1px solid #dfe4ff; }
  .content { min-height: 64px; color: #1f2937; line-height: 1.6; }
  .placeholder { color: #9aa3b2; }
`;
