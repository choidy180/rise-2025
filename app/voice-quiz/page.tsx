"use client";

import { useMemo, useState } from "react";
import styled from "styled-components";
import { VoiceRecorder } from "@/components/voice-Recorder"; // ← VoiceRecorder 위치에 맞게 경로만 수정

/** ====== 설정 ====== */
const TOTAL_QUESTIONS = 50;

// 데모 질문 (실서비스에선 API/JSON으로 주입)
const QUESTIONS = [
  "어떤 일의 어려운 부분은 끝내 놓고, 그 일을 마무리를 짓지 못해 곤란을 겪은 적이 있습니까?",
  "일상 업무를 시작하기까지 많은 노력이 필요한 편입니까?",
  "회의 중에 딴생각이 자주 드나요?",
] as const;

/** ====== 메인 컴포넌트 ====== */
export default function VoiceQuizPage() {
  const [index, setIndex] = useState(0); // 0-based
  const [answers, setAnswers] = useState<Record<number, number>>({}); // {qIndex: 1~5}

  /** 진행도 */
  const currentNo = index + 1;
  const progress = Math.min((currentNo / TOTAL_QUESTIONS) * 100, 100);

  /** 🔴 여기! currentQ 정의 부분이 반드시 있어야 함 */
  const currentQ = useMemo(
    () => QUESTIONS[index] ?? "질문을 불러오는 중...",
    [index]
  );

  /** 응답 클릭 (1~5) */
  const handleAnswer = (score: number) => {
    setAnswers((prev) => ({ ...prev, [index]: score }));
    // 다음 문항 이동 (데모: QUESTIONS 길이까지만)
    if (index < QUESTIONS.length - 1) {
      setIndex((i) => i + 1);
    }
  };

  /** 이전/다음 네비게이션 */
  const goPrev = () => {
    if (index === 0) return;
    setIndex((i) => i - 1);
  };
  const goNext = () => {
    if (index >= QUESTIONS.length - 1) return;
    setIndex((i) => i + 1);
  };

  return (
    <Wrap>
      <TopBar>
        <Brand>
          <LogoDot /> <span>ADHD DIAGNOSIS</span>
        </Brand>

        <UserBox>
          <UserAvatar>{/* 이미지 가능 */}</UserAvatar>
          <span>leesy215님</span>
          <LogoutBtn type="button">로그아웃</LogoutBtn>
        </UserBox>
      </TopBar>

      <Main>
        <Card>
          {/* 진행도 */}
          <ProgressHeader>
            <div className="label">
              {currentNo}/{TOTAL_QUESTIONS}
            </div>
            <ProgressOuter aria-label="진행도">
              <ProgressInner style={{ width: `${progress}%` }} />
            </ProgressOuter>
          </ProgressHeader>

          {/* 질문 */}
          <QuestionRow>
            <QNo>{currentNo}.</QNo>
            <QText>{currentQ}</QText>
            <MicIcon
              title="마이크 사용 안내"
              aria-label="마이크 사용 안내"
              role="img"
            >
              🎤
            </MicIcon>
          </QuestionRow>

          {/* 음성 녹음 + 자동 자막 컴포넌트 */}
          {/* key={index} 로 질문이 바뀔 때마다 초기화되도록 함 */}
          <VoiceRecorder key={index} lang="ko-KR" />

          {/* 응답 버튼 (1~5) */}
          <ScaleRow>
            {[
              { v: 1, t: "전혀 그렇지 않다" },
              { v: 2, t: "거의 그렇지 않다" },
              { v: 3, t: "가끔 그렇다" },
              { v: 4, t: "자주 그렇다" },
              { v: 5, t: "매우 그렇다" },
            ].map((it) => (
              <ScaleBtn
                key={it.v}
                type="button"
                onClick={() => handleAnswer(it.v)}
                $selected={answers[index] === it.v}
                aria-pressed={answers[index] === it.v}
              >
                <strong>{it.v}</strong>
                <small>{it.t}</small>
              </ScaleBtn>
            ))}
          </ScaleRow>

          {/* 하단 네비게이션 */}
          <NavRow>
            <NavBtn type="button" onClick={goPrev} disabled={index === 0}>
              이전
            </NavBtn>
            <NavBtn
              type="button"
              onClick={goNext}
              disabled={index >= QUESTIONS.length - 1}
            >
              다음
            </NavBtn>
          </NavRow>
        </Card>
      </Main>
    </Wrap>
  );
}

/** ===== 스타일 ===== */

const Wrap = styled.div`
  min-height: 100vh;
  background: #f3f6fb;
  display: flex;
  flex-direction: column;
`;

const TopBar = styled.header`
  height: 56px;
  background: #ffffffcc;
  backdrop-filter: blur(6px);
  border-bottom: 1px solid #e9eef6;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const Brand = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  font-weight: 800;
  color: #1565d8;
  letter-spacing: 0.2px;

  span {
    user-select: none;
  }
`;

const LogoDot = styled.div`
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
  box-shadow: 0 4px 10px rgba(59, 130, 246, 0.35);
`;

const UserBox = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  color: #334155;
`;

const UserAvatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #dbeafe;
  border: 1px solid #bfdbfe;
`;

const LogoutBtn = styled.button`
  border: 0;
  background: #eef2ff;
  color: #4f46e5;
  padding: 6px 10px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: #e0e7ff;
  }
`;

const Main = styled.main`
  flex: 1;
  display: grid;
  place-items: start center;
  padding: 36px 16px 64px;
`;

const Card = styled.section`
  width: min(820px, 92vw);
  background: #fff;
  border: 1px solid #e6ecf4;
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(79, 114, 205, 0.15);
  padding: 18px 20px 22px;
`;

const ProgressHeader = styled.div`
  margin-bottom: 14px;

  .label {
    font-weight: 700;
    color: #0f172a;
    margin-bottom: 8px;
  }
`;

const ProgressOuter = styled.div`
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: #eef2f7;
  overflow: hidden;
  border: 1px solid #e2e8f0;
`;

const ProgressInner = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #3b82f6);
  transition: width 240ms ease;
`;

const QuestionRow = styled.div`
  margin-top: 10px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: start;
`;

const QNo = styled.div`
  margin-top: 2px;
  color: #334155;
  font-weight: 700;
`;

const QText = styled.div`
  line-height: 1.55;
  color: #0f172a;
  font-size: 16px;
`;

const MicIcon = styled.div`
  opacity: 0.6;
  font-size: 18px;
  user-select: none;
`;

const ScaleRow = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-top: 16px;
`;

const ScaleBtn = styled.button<{ $selected?: boolean }>`
  display: grid;
  gap: 6px;
  justify-items: center;
  padding: 10px 8px;
  border-radius: 12px;
  border: 1px solid ${({ $selected }) => ($selected ? "#60a5fa" : "#e5e7eb")};
  background: ${({ $selected }) => ($selected ? "#eff6ff" : "#fff")};
  cursor: pointer;

  strong {
    font-size: 16px;
  }

  small {
    font-size: 11px;
    color: #64748b;
  }

  &:hover {
    border-color: #93c5fd;
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.08);
  }
`;

const NavRow = styled.div`
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const NavBtn = styled.button`
  background: #f1f5f9;
  color: #0f172a;
  border: 1px solid #e2e8f0;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background: #e9eef6;
  }
`;
