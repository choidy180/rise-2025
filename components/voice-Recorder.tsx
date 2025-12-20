"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styled, { keyframes, css } from "styled-components";

/** ====== Web Speech API 타입 & 헬퍼 ====== */
type SpeechRecognitionConstructor =
  typeof window extends object
    ? (typeof window & {
        SpeechRecognition?: new () => SpeechRecognition;
        webkitSpeechRecognition?: new () => SpeechRecognition;
      })
    : any;

function createRecognition(lang = "ko-KR"): SpeechRecognition | null {
  if (typeof window === "undefined") return null;

  const win = window as SpeechRecognitionConstructor;
  const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = lang;
  rec.continuous = true;      // 계속 듣기
  rec.interimResults = true;  // 실시간 자막(임시 결과) 활성화
  return rec;
}

export interface VoiceRecorderProps {
  lang?: string;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ lang = "ko-KR" }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [finalText, setFinalText] = useState("");   // 확정된 텍스트 누적
  const [interim, setInterim] = useState("");       // 실시간 임시 텍스트
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SpeechRecognition | null>(null);

  /** 음성 인식 인스턴스 준비 + 이벤트 바인딩 */
  useEffect(() => {
    const rec = createRecognition(lang);
    recRef.current = rec;

    if (!rec) {
      setError("이 브라우저에서는 음성 인식을 지원하지 않습니다. (Chrome 권장)");
      return;
    }

    const onResult = (e: SpeechRecognitionEvent) => {
      let finalStr = "";
      let interimStr = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalStr += chunk;
        } else {
          interimStr += chunk;
        }
      }

      if (finalStr) {
        setFinalText((prev) =>
          (prev ? prev + " " : "") + finalStr.trim()
        );
      }
      setInterim(interimStr);
    };

    const onError = (e: SpeechRecognitionErrorEvent) => {
      setError(`음성 인식 오류: ${e.error}`);
      setIsRecording(false);
    };

    const onEnd = () => {
      // 자동 종료(무음 등)나 수동 stop 모두 여기로 들어옴
      setIsRecording(false);
      setInterim(""); // 종료 시 임시 자막은 지우고 확정 텍스트만 남김
    };

    rec.addEventListener("result", onResult as any);
    rec.addEventListener("error", onError as any);
    rec.addEventListener("end", onEnd as any);

    return () => {
      rec.removeEventListener("result", onResult as any);
      rec.removeEventListener("error", onError as any);
      rec.removeEventListener("end", onEnd as any);
      try {
        rec.stop();
      } catch {}
    };
  }, [lang]);

  /** 버튼 토글: 1번 클릭 → start, 다시 클릭 → stop */
  const toggleRecord = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;

    if (isRecording) {
      // 녹음 중이면 종료
      try {
        rec.stop();
      } catch {}
      setIsRecording(false);
    } else {
      // 새로 녹음 시작할 때, 기존 텍스트는 유지/초기화 선택 가능
      // 질문 바뀔 때는 부모에서 key를 바꿔 컴포넌트를 리마운트하도록 할 거라
      // 여기서는 이전 값은 그대로 두는 게 자연스러움
      setError(null);
      try {
        rec.start();
        setIsRecording(true);
      } catch {
        setError("마이크 권한을 허용해 주세요.");
      }
    }
  }, [isRecording]);

  return (
    <Wrapper>
      <VoiceBar>
        <RecordBtn
          type="button"
          $active={isRecording}
          onClick={toggleRecord}
          aria-pressed={isRecording}
        >
          {isRecording ? "녹음 중단" : "음성으로 답변하기"}
        </RecordBtn>

        <Hint>
          {isRecording
            ? "지금 말씀하시면 됩니다. 다시 누르면 녹음이 종료돼요."
            : "버튼을 누르고 말한 뒤, 다시 눌러서 녹음을 끝내세요."}
        </Hint>
      </VoiceBar>

      <TranscriptArea $recording={isRecording}>
        <span className="leading">{isRecording ? "🟢" : "📝"}</span>
        <div className="text">
          {finalText}
          {/* 실시간 자막 */}
          <Interim>{interim}</Interim>
        </div>
      </TranscriptArea>

      {error && <ErrorBox>{error}</ErrorBox>}
    </Wrapper>
  );
};

/** ===== 스타일 ===== */

const Wrapper = styled.div`
  margin: 14px 0 0;
`;

const VoiceBar = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 10px;
`;

const pulse = keyframes`
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.45);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 18px rgba(34, 197, 94, 0);
  }
`;

const RecordBtn = styled.button<{ $active?: boolean }>`
  border: 0;
  padding: 12px 18px;
  border-radius: 12px;
  font-weight: 800;
  color: #fff;
  background: ${({ $active }) => ($active ? "#ef4444" : "#10b981")};
  cursor: pointer;
  transition: transform 0.1s ease;

  &:active {
    transform: translateY(1px);
  }

  ${({ $active }) =>
    $active &&
    css`
      animation: ${pulse} 1.2s ease-out infinite;
    `}
`;

const Hint = styled.span`
  color: #64748b;
  font-size: 13px;
`;

const TranscriptArea = styled.div<{ $recording?: boolean }>`
  display: grid;
  grid-template-columns: 24px 1fr;
  gap: 10px;
  border: 1px solid ${({ $recording }) => ($recording ? "#fecaca" : "#e2e8f0")};
  background: ${({ $recording }) => ($recording ? "#fff7f7" : "#f8fafc")};
  border-radius: 12px;
  padding: 12px 14px;
  min-height: 70px;

  .leading {
    font-size: 14px;
    margin-top: 2px;
  }

  .text {
    color: #0f172a;
    white-space: pre-wrap;
    word-break: break-word;
  }
`;

const Interim = styled.span`
  opacity: 0.6;
  margin-left: 4px;
`;

const ErrorBox = styled.div`
  margin-top: 10px;
  background: #fff1f2;
  border: 1px solid #fecdd3;
  color: #b91c1c;
  padding: 10px 12px;
  border-radius: 10px;
`;
