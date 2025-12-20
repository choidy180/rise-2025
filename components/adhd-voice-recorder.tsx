// components/adhd-voice-recorder.tsx
"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import styled from "styled-components";

export interface ADHDVoiceRecorderHandle {
  // 외부에서 stream을 넘겨줄 수도 있고, 안 넘기면 내부에서 getUserMedia 사용
  startRecording: (stream?: MediaStream) => void;
  stopRecording: () => void;
}

interface Props {
  // 필요하면 나중에 props 추가 가능
}

/**
 * 🎤 안전하게 마이크 스트림을 가져오는 헬퍼 함수
 * iOS/iPadOS Safari는 HTTPS가 아니면 navigator.mediaDevices 객체 자체를 숨겨버립니다.
 * 이를 감지하여 명확한 에러를 던지거나 구형 API를 시도합니다.
 */
const getSafeMediaStream = async (): Promise<MediaStream> => {
  // 1. 최신 표준 API 확인 (HTTPS 환경)
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    return navigator.mediaDevices.getUserMedia({ audio: true });
  }

  // 2. 구형 Webkit (iOS Safari Legacy) 확인
  const anyNav = navigator as any;
  const getUserMedia =
    anyNav.getUserMedia ||
    anyNav.webkitGetUserMedia ||
    anyNav.mozGetUserMedia ||
    anyNav.msGetUserMedia;

  if (getUserMedia) {
    return new Promise((resolve, reject) => {
      getUserMedia.call(navigator, { audio: true }, resolve, reject);
    });
  }

  // 3. API가 아예 없는 경우 (주로 HTTP 환경일 때)
  throw new Error(
    "HTTPS_REQUIRED" // 에러 식별용 키워드
  );
};

const ADHDVoiceRecorder = forwardRef<ADHDVoiceRecorderHandle, Props>((props, ref) => {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState(""); // 실시간(브라우저) 텍스트
  const [finalText, setFinalText] = useState("");     // Whisper 결과
  const [uploading, setUploading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<number | null>(null);

  // 🕒 타이머
  const startTimer = () => {
    const t0 = Date.now();
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 300) as unknown as number;
  };
  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // 🎤 Web Speech API — 브라우저 실시간 자막(선택)
  const recRef = useRef<SpeechRecognition | null>(null);

  const startBrowserRecognition = useCallback(() => {
    try {
      const AnyWin = window as any;
      const SR = AnyWin.SpeechRecognition || AnyWin.webkitSpeechRecognition;
      if (!SR) return;

      const rec: SpeechRecognition = new SR();
      rec.lang = "ko-KR";
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (e: SpeechRecognitionEvent) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (!r.isFinal) interim += r[0].transcript;
        }
        setInterimText(interim);
      };
      rec.onerror = () => {};
      rec.onend = () => {};

      rec.start();
      recRef.current = rec;
    } catch {
      // 브라우저 미지원 등은 조용히 무시
    }
  }, []);

  const stopBrowserRecognition = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {}
    recRef.current = null;
    setInterimText("");
  }, []);

  // 🔴 녹음 시작
  const startRecording = useCallback(
    async (externalStream?: MediaStream) => {
      console.log("[REC] startRecording called", {
        externalStream: !!externalStream,
      });

      if (isRecording) {
        console.log("[REC] already recording, skip.");
        return;
      }

      setFinalText("");
      setInterimText("");
      setElapsed(0);

      try {
        // 1) 우선 외부에서 받은 stream 사용 (Gate 버튼에서 만든 것)
        let stream = externalStream;

        // 2) 없으면 fallback으로 내부에서 안전하게 getUserMedia 호출
        if (!stream) {
          console.log("[REC] no externalStream, calling getSafeMediaStream inside recorder");
          stream = await getSafeMediaStream();
        }

        // 3) MediaRecorder 생성 (아이패드 호환성 고려)
        let rec: MediaRecorder;
        try {
            // Chrome/Desktop 등은 audio/webm 선호
            rec = new MediaRecorder(stream!, { mimeType: "audio/webm" });
        } catch (e) {
            // iOS Safari 등에서 mimeType을 지정하면 에러가 날 수 있음 -> 기본값 사용
            console.warn("audio/webm not supported, trying default mimeType");
            rec = new MediaRecorder(stream!);
        }
        
        audioChunksRef.current = [];

        rec.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        rec.onstop = async () => {
          console.log("[REC] mediaRecorder.onstop");
          stopTimer();
          stopBrowserRecognition();

          try {
            const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            const fd = new FormData();
            fd.set("audio", blob, "recording.webm");

            setUploading(true);
            const res = await fetch("/api/transcribe", {
              method: "POST",
              body: fd,
            });
            const json = await res.json();
            if (json?.text) {
              setFinalText(json.text);
            } else if (json?.error) {
              setFinalText(`[서버 오류] ${json.error}`);
            } else {
              setFinalText("[결과를 해석할 수 없습니다]");
            }
          } catch (e: any) {
            console.error("[REC] transcribe error", e);
            setFinalText(`[네트워크 오류] ${e?.message ?? "unknown"}`);
          } finally {
            setUploading(false);
          }

          // stream 정리 (외부/내부 상관없이 여기서 한 번에 종료)
          try {
            stream!.getTracks().forEach((t) => t.stop());
          } catch {}
        };

        mediaRecorderRef.current = rec;
        
        // iOS Safari 호환성을 위해 timeslice 지정 권장
        rec.start(250); 
        
        setIsRecording(true);
        startTimer();
        startBrowserRecognition();
      } catch (err: any) {
        console.error("[REC] startRecording error", err);
        
        let msg = err?.message ?? String(err);
        
        // 에러 메시지 사용자 친화적으로 변환
        if (msg.includes("HTTPS_REQUIRED") || msg.includes("undefined is not an object")) {
            msg = "아이패드/아이폰에서는 보안 정책상 HTTPS 환경에서만 마이크 사용이 가능합니다. (ngrok 등을 이용해 https로 접속해주세요)";
        }

        alert("녹음을 시작할 수 없습니다: \n" + msg);
        
        setIsRecording(false);
        stopTimer();
        stopBrowserRecognition();
      }
    },
    [isRecording, startBrowserRecognition]
  );


  // ⏹ 녹음 정지
  const stopRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }, []);

  // 🔌 부모에서 쓸 수 있게 핸들 노출
  useImperativeHandle(ref, () => ({
    startRecording,
    stopRecording,
  }));

  // 언마운트 시 정리
  useEffect(() => {
    return () => {
      try {
        mediaRecorderRef.current?.stop();
        mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      } catch {}
      stopTimer();
      stopBrowserRecognition();
    };
  }, [stopBrowserRecognition]);

  const timeLabel = (() => {
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  })();

  return (
    <Wrap>
      {/* <TopRow>
        <Status $active={isRecording}>
          <Dot $active={isRecording} />
          <span>{isRecording ? "녹음중" : "대기중"}</span>
        </Status>
        <TimeText>{timeLabel}</TimeText>
      </TopRow>
      */}

      {/* <ButtonRow>
        <PrimaryBtn
          type="button"
          onClick={() => (isRecording ? stopRecording() : startRecording())}
        >
          {isRecording ? "녹음 종료하기" : "녹음 시작하기"}
        </PrimaryBtn>
      </ButtonRow> 
      */}

      {/* <LiveBox>
        <LiveLabel>실시간 자막</LiveLabel>
        <LiveText>
          {interimText || <Placeholder>말씀하시면 여기에 실시간으로 표시됩니다.</Placeholder>}
        </LiveText>
      </LiveBox>

      <ResultBox>
        <ResultHeader>
          <span>전사 결과 (Whisper)</span>
          {uploading && <Tag>처리중…</Tag>}
        </ResultHeader>
        <ResultText>
          {finalText || <Placeholder>녹음을 종료하면 결과가 여기에 표시됩니다.</Placeholder>}
        </ResultText>
      </ResultBox> 
      */}
    </Wrap>
  );
});

ADHDVoiceRecorder.displayName = "ADHDVoiceRecorder";

export default ADHDVoiceRecorder;

/* ============ styled ============ */

const Wrap = styled.div`
  width: 100%;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 12px 12px 10px;
  /* display: flex; */
  display: none;
  flex-direction: column;
  gap: 8px;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Status = styled.div<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: ${({ $active }) => ($active ? "#b91c1c" : "#64748b")};
  font-weight: 600;
`;

const Dot = styled.span<{ $active: boolean }>`
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: ${({ $active }) => ($active ? "#ef4444" : "#94a3b8")};
`;

const TimeText = styled.div`
  font-family: "SF Mono", ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-size: 12px;
  color: #475569;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-start;
`;

const PrimaryBtn = styled.button`
  padding: 8px 14px;
  border-radius: 999px;
  border: none;
  background: #4f46e5;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: #4338ca;
  }
`;

const LiveBox = styled.div`
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  padding: 8px 10px;
`;

const LiveLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  margin-bottom: 4px;
`;

const LiveText = styled.div`
  font-size: 14px;
  color: #0f172a;
  min-height: 40px;
`;

const ResultBox = styled.div`
  border-radius: 10px;
  border: 1px dashed #cbd5e1;
  background: #f9fafb;
  padding: 8px 10px;
`;

const ResultHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
  margin-bottom: 4px;
`;

const Tag = styled.span`
  padding: 2px 6px;
  border-radius: 999px;
  border: 1px solid #c4b5fd;
  background: #ede9fe;
  color: #4c1d95;
  font-size: 10px;
  font-weight: 700;
`;

const ResultText = styled.div`
  font-size: 14px;
  color: #111827;
  min-height: 40px;
`;

const Placeholder = styled.span`
  color: #9ca3af;
`;