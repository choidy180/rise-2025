// components/VerticalStepper.tsx
"use client";

import {
  useLayoutEffect,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import styled from "styled-components";
import ADHDVoiceRecorder, {
  ADHDVoiceRecorderHandle,
} from "./adhd-voice-recorder";

// ✅ 데이터 파일 import
import { CHECKUP_QUESTIONS, AnswerOption } from "@/data/questionnaire/questionnaire-data";
import MicVisualizer from "./mic-visualizer";

const IS_DEV = process.env.NODE_ENV !== "production";

export interface SurveyItem {
  index: number;
  question: string;
  answer: number | null;
}

export interface SurveyResult {
  total: number;
  answeredCount: number;
  sum: number;
  mean: number | null;
  items: SurveyItem[];
  answers: Array<number | null>;
}

interface Props {
  total?: number;
  onFinish?: (result: SurveyResult) => void;
  height?: string;
  questions?: string[];
}

// --- TTS 설정 ---
const TTS_DEFAULT_RATE = 1.0;
const TTS_DEFAULT_PITCH = 1.0;
const TTS_DEFAULT_LANG = "ko-KR";

// --- 기본 옵션 ---
const DEFAULT_OPTIONS: AnswerOption[] = [
  { value: 1, label: "전혀 그렇지 않다" },
  { value: 2, label: "거의 그렇지 않다" },
  { value: 3, label: "가끔 그렇다" },
  { value: 4, label: "자주 그렇다" },
  { value: 5, label: "매우 그렇다" },
];

// --- 매칭 함수 ---
function matchVoiceToOption(spokenText: string, options: AnswerOption[]): number | null {
  const text = spokenText.replace(/\s+/g, "");

  const indexPatterns = [
    { idx: 0, keywords: ["1번", "일번", "첫번째", "첫번", "하나", "원"] },
    { idx: 1, keywords: ["2번", "이번", "두번째", "두번", "둘", "투"] },
    { idx: 2, keywords: ["3번", "삼번", "세번째", "세번", "셋", "쓰리"] },
    { idx: 3, keywords: ["4번", "사번", "네번째", "네번", "넷", "포"] },
    { idx: 4, keywords: ["5번", "오번", "다섯번째", "다섯번", "다섯", "파이브", "마지막"] },
  ];

  for (const p of indexPatterns) {
    if (p.idx >= options.length) continue;
    if (p.keywords.some((k) => text.includes(k))) return options[p.idx].value;
  }

  for (const opt of options) {
    const label = opt.label.replace(/\s+/g, "");
    const keywords: string[] = [label];

    if (label.includes("예") || label.includes("그렇다")) keywords.push("네", "맞아", "응", "어", "ok");
    if (label.includes("아니") || label.includes("안함")) keywords.push("아니", "안해", "없어", "no");
    if (label.includes("전혀")) keywords.push("네버", "아예", "하나도");
    if (label.includes("가끔") || label.includes("보통")) keywords.push("중간", "그저", "때때로");
    if (label.includes("자주")) keywords.push("종종", "빈번");
    if (label.includes("매우") || label.includes("항상")) keywords.push("맨날", "아주", "꼭", "완전", "엄청", "진짜");

    if (keywords.some((k) => text.includes(k))) return opt.value;
  }
  return null;
}

export default function VerticalStepper({
  total = 0,
  onFinish,
  height = "100vh",
  questions,
}: Props) {

  // --- States ---
  const [hasStarted, setHasStarted] = useState(false);

  const qData = useMemo(() => {
    if (questions && questions.length > 0) {
      return questions.map((q, i) => ({
        id: i,
        category: "general",
        type: "scale" as const,
        question: q.replace(/^\d+\.\s*/, ""),
        options: undefined,
      }));
    }
    const limit = total > 0 ? total : CHECKUP_QUESTIONS.length;
    return CHECKUP_QUESTIONS.slice(0, limit);
  }, [questions, total]);

  const qTexts = useMemo(() => qData.map((item, i) => `${i + 1}. ${item.question}`), [qData]);

  const [active, setActive] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>(() => Array.from({ length: qTexts.length }, () => null));

  // --- Refs ---
  const activeRef = useRef(0);
  const answersRef = useRef<Array<number | null>>([]);
  const commandRecRef = useRef<any>(null);
  const [commandListening, setCommandListening] = useState(false);

  // Layout Refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [translateY, setTranslateY] = useState(0);

  // TTS & Mic Control Refs (중요)
  const [speaking, setSpeaking] = useState(false);
  const isSpeakingRef = useRef(false); // [핵심] State보다 빠른 동기 상태 관리
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const autoReadDoneForIndexRef = useRef<Record<number, boolean>>({});

  const recorderRef = useRef<ADHDVoiceRecorderHandle | null>(null);
  const answerModeRef = useRef(false);
  const [answerLiveText, setAnswerLiveText] = useState("");

  // --- Helpers ---

  // 1. 레이아웃 계산
  const recalcTranslate = useCallback(() => {
    const container = containerRef.current;
    const target = itemRefs.current[active];
    const track = trackRef.current;
    if (!container || !target || !track) return;

    const containerH = container.clientHeight;
    const targetTop = target.offsetTop;
    const targetH = target.offsetHeight;
    setTranslateY(containerH / 2 - (targetTop + targetH / 2));
  }, [active]);

  useLayoutEffect(() => {
    const raf = requestAnimationFrame(recalcTranslate);
    return () => cancelAnimationFrame(raf);
  }, [recalcTranslate]);

  useEffect(() => {
    window.addEventListener("resize", recalcTranslate);
    return () => window.removeEventListener("resize", recalcTranslate);
  }, [recalcTranslate]);

  // 2. 마이크 & TTS 종료 (Cleanup)
  const killAudio = useCallback(() => {
    try { window.speechSynthesis.cancel(); } catch { }
    try { commandRecRef.current?.abort(); } catch { }
    setSpeaking(false);
    isSpeakingRef.current = false;
  }, []);

  useEffect(() => {
    return () => killAudio();
  }, [killAudio]);


  // =========================================================
  //  🎙️ Voice Recognition (Enhanced for iOS)
  // =========================================================

  const startHotwordListening = useCallback(() => {
    // 1. 방어 로직: 말하는 중이면 절대 켜지 않음 (Ref 사용으로 즉시 차단)
    if (isSpeakingRef.current || !hasStarted) return;
    if (commandRecRef.current) return;

    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec: any = new SR();
    rec.lang = "ko-KR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => setCommandListening(true);

    rec.onend = () => {
      setCommandListening(false);
      commandRecRef.current = null;

      // [핵심] 재시작 로직
      // 말하는 중이 아닐 때만 재시작 (iOS 자원 반환 대기 300ms)
      if (!isSpeakingRef.current && hasStarted) {
        setTimeout(() => startHotwordListening(), 300);
      }
    };

    rec.onerror = (e: any) => {
      // 에러 시 무조건 종료 처리 후 재시작 시도
      setCommandListening(false);
      commandRecRef.current = null;
      if (e.error !== "no-speech" && e.error !== "aborted") {
        console.warn("Mic Error:", e.error);
      }
      if (!isSpeakingRef.current && hasStarted) {
        setTimeout(() => startHotwordListening(), 500);
      }
    };

    rec.onresult = (ev: SpeechRecognitionEvent) => {
      // 말하는 중이면 결과 무시
      if (isSpeakingRef.current) return;

      let text = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        text += ev.results[i][0].transcript;
      }
      const normalized = text.trim();
      setAnswerLiveText(normalized);

      // 로직 처리
      const currentActive = activeRef.current;
      const currentQItem = qData[currentActive];
      const matchedValue = matchVoiceToOption(normalized, currentQItem?.options || DEFAULT_OPTIONS);

      if (matchedValue !== null) {
        selectAnswer(currentActive, matchedValue);
      } else if (normalized.includes("다음") || normalized.includes("넘어")) {
        // Ref를 통해 최신 답변 상태 확인 (setAnswers 대기 없이 즉시 반응)
        if (answersRef.current[currentActive] != null && currentActive < qTexts.length - 1) {
          goNext();
        }
      }
    };

    commandRecRef.current = rec;
    try { rec.start(); } catch { }
  }, [hasStarted, qData, qTexts.length]);


  // =========================================================
  //  🔊 TTS Logic (Aggressive & Safe)
  // =========================================================

  const playOnce = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;

    // 1. 기존 오디오 정리
    window.speechSynthesis.cancel();

    // 2. 마이크 즉시 끄기 (Ref 업데이트 먼저)
    isSpeakingRef.current = true;
    setSpeaking(true);
    if (commandRecRef.current) {
      commandRecRef.current.abort(); // stop 대신 abort가 더 빠름 (onend 즉시 발생)
      commandRecRef.current = null;
    }

    const u = new SpeechSynthesisUtterance(text);
    u.lang = TTS_DEFAULT_LANG;
    u.rate = TTS_DEFAULT_RATE;

    // iOS 호환성을 위해 목소리 지정 (있으면)
    const voices = window.speechSynthesis.getVoices();
    const korVoice = voices.find(v => v.lang.includes("ko"));
    if (korVoice) u.voice = korVoice;

    u.onend = () => {
      // 말하기 끝
      isSpeakingRef.current = false;
      setSpeaking(false);
      autoReadDoneForIndexRef.current[active] = true;

      // 마이크 재시작 (딜레이)
      setTimeout(() => {
        if (hasStarted) startHotwordListening();
      }, 300);
    };

    u.onerror = (e) => {
      console.error("TTS Error:", e);
      isSpeakingRef.current = false;
      setSpeaking(false);
      // 에러나도 마이크는 켜줌
      setTimeout(() => {
        if (hasStarted) startHotwordListening();
      }, 300);
    };

    window.speechSynthesis.speak(u);
  }, [active, hasStarted, startHotwordListening]);


  // =========================================================
  //  Controls
  // =========================================================

  const selectAnswer = (i: number, value: number) => {
    // 말 끊기
    window.speechSynthesis.cancel();
    isSpeakingRef.current = false;
    setSpeaking(false);

    // Ref 즉시 업데이트 (음성인식 '다음' 명령어 대응)
    const nextAnswers = [...answersRef.current];
    nextAnswers[i] = value;
    answersRef.current = nextAnswers;

    setAnswers(nextAnswers);

    // 마이크가 꺼져있다면 켜기
    if (!commandRecRef.current) startHotwordListening();
  };

  const goNext = () => {
    if (active < qTexts.length - 1) {
      setActive(prev => prev + 1);
    }
  };

  const goPrev = () => {
    if (active > 0) setActive(prev => prev - 1);
  };

  // 질문 변경 시 자동 재생
  useEffect(() => {
    activeRef.current = active;
    if (hasStarted && !autoReadDoneForIndexRef.current[active]) {
      // 약간의 딜레이 후 재생 (화면 전환 안정화)
      setTimeout(() => playOnce(qTexts[active]), 300);
    }
  }, [active, hasStarted, qTexts, playOnce]);


  // ✅ [시작 버튼 핸들러] - iOS 강력 대응
  const handleStartSurvey = () => {
    // 1. 상태 변경
    setHasStarted(true);

    // 2. [매우 중요] 기존 대기열 모두 제거
    window.speechSynthesis.cancel();

    // 3. [핵심] 빈 소리 말고, 실제 첫 번째 질문을 "클릭 이벤트 안에서" 실행
    const firstQ = qTexts[0];
    const u = new SpeechSynthesisUtterance(firstQ);
    u.lang = "ko-KR";

    // iOS에서는 클릭 핸들러 안에서 speak()가 호출되어야 권한이 풀림
    // playOnce 함수를 쓰면 비동기나 꼬임이 발생할 수 있으니 여기서 직접 실행
    isSpeakingRef.current = true;
    setSpeaking(true);

    u.onend = () => {
      isSpeakingRef.current = false;
      setSpeaking(false);
      autoReadDoneForIndexRef.current[0] = true; // 0번 읽음 처리
      setTimeout(startHotwordListening, 300); // 끝나면 마이크 켜기
    };

    window.speechSynthesis.speak(u);
  };

  // =========================================================
  //  Render
  // =========================================================

  if (!hasStarted) {
    return (
      <IntroContainer style={{ height }}>
        <IntroCard>
          <IntroTitle>설문 시작</IntroTitle>
          <IntroDesc>
            <b>시작하기</b> 버튼을 눌러주세요.<br />
            (마이크 권한 허용이 필요합니다)
          </IntroDesc>
          <StartButton onClick={handleStartSurvey}>
            시작하기
          </StartButton>
        </IntroCard>
      </IntroContainer>
    );
  }

  const currentQ = qData[active];
  const currentOpts = currentQ?.options || DEFAULT_OPTIONS;
  const isLast = active === qTexts.length - 1;

  return (
    <Viewport ref={containerRef} $h={height}>
      <MicVisualizer isListening={commandListening} />

      <Track ref={trackRef} style={{ transform: `translateY(${translateY}px)` }}>
        <Spacer style={{ height: "30vh" }} />

        {qTexts.map((txt, i) => {
          const isActive = i === active;
          const state = i < active ? "past" : i === active ? "active" : "future";

          return (
            <Card key={i} ref={el => { itemRefs.current[i] = el; }} $state={state}>
              <QHeader>
                <QText>{txt}</QText>
                <IconButton onClick={() => playOnce(txt)}>
                  {speaking && isActive ? "🔇" : "🔊"}
                </IconButton>
              </QHeader>

              <ContentRow>
                <LiveAnswerBox>
                  {isActive ? (answerLiveText || "말씀해주세요...") : ""}
                </LiveAnswerBox>

                <OptionsRow>
                  {currentOpts.map(opt => (
                    <OptionButton
                      key={opt.value}
                      $selected={answers[i] === opt.value}
                      onClick={() => selectAnswer(i, opt.value)}
                    >
                      <span className="num">{opt.value}</span>
                      <span className="label">{opt.label}</span>
                    </OptionButton>
                  ))}
                </OptionsRow>
              </ContentRow>

              <Footer>
                <Btn onClick={goPrev} disabled={i === 0}>이전</Btn>
                {!isLast ? (
                  <Btn onClick={goNext} disabled={answers[i] == null}>다음</Btn>
                ) : (
                  <BtnDanger onClick={onFinish} disabled={answers[i] == null}>완료</BtnDanger>
                )}
              </Footer>
            </Card>
          )
        })}

        <Spacer style={{ height: "30vh" }} />
      </Track>
    </Viewport>
  );
}

// --- Styles ---
const IntroContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  width: 100%;
`;

const IntroCard = styled.div`
  background: white;
  padding: 40px;
  border-radius: 24px;
  text-align: center;
  width: 90%;
  max-width: 400px;
  box-shadow: rgba(0, 0, 0, 0.15) 1.95px 1.95px 2.6px;
`;

const IntroTitle = styled.h2`
  font-size: 24px;
  margin-bottom: 16px;
`;

const IntroDesc = styled.p`
  color: #64748b;
  margin-bottom: 32px;
  
  b {
    color: #4f46e5;
  }
`;

const StartButton = styled.button`
  width: 100%;
  padding: 16px;
  background: #4f46e5;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
`;

const Viewport = styled.div<{ $h: string }>`
  position: relative;
  width: 100%;
  min-width: 100vw;
  height: ${({ $h }) => $h};
  overflow: hidden;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Track = styled.div`
  width: 100%;
  max-width: 600px;
  padding: 0 20px;
  transition: transform 0.5s ease;
`;

const Spacer = styled.div`
  width: 100%;
`;

const Card = styled.div<{ $state: string }>`
  background: white;
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 40px;
  transition: all 0.5s;
  opacity: ${({ $state }) => ($state === "active" ? 1 : 0.4)};
  transform: ${({ $state }) => ($state === "active" ? "scale(1)" : "scale(0.95)")};
  filter: ${({ $state }) => ($state === "active" ? "none" : "blur(2px)")};
  pointer-events: ${({ $state }) => ($state === "active" ? "auto" : "none")};
  border: 1px solid ${({ $state }) => ($state === "active" ? "#6366f1" : "transparent")};
`;

const QHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const QText = styled.h2`
  font-size: 19px;
  margin: 0;
  word-break: keep-all;
`;

const IconButton = styled.button`
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
`;

const ContentRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const LiveAnswerBox = styled.div`
  background: #f1f5f9;
  padding: 12px;
  border-radius: 12px;
  min-height: 44px;
  color: #334155;
`;

const OptionsRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const OptionButton = styled.button<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${({ $selected }) => ($selected ? "#6366f1" : "#e2e8f0")};
  background: ${({ $selected }) => ($selected ? "#e0e7ff" : "white")};

  .num {
    background: ${({ $selected }) => ($selected ? "#6366f1" : "#cbd5e1")};
    color: white;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12px;
    font-size: 12px;
  }

  .label {
    font-size: 15px;
    color: ${({ $selected }) => ($selected ? "#312e81" : "#475569")};
  }
`;

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;
  border-top: 1px solid #f1f5f9;
  padding-top: 16px;
`;

const Btn = styled.button`
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  background: #3b82f6;
  color: white;
  font-weight: 600;

  &:disabled {
    background: #cbd5e1;
  }
`;

const BtnDanger = styled(Btn)`
  background: #ef4444;
`;