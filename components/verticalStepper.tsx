"use client";

import {
  useLayoutEffect,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
// ✅ [수정] keyframes import 추가
import styled, { keyframes } from "styled-components";
import MicVisualizer from "./mic-visualizer"; 
import { CHECKUP_QUESTIONS, AnswerOption } from "@/data/questionnaire/questionnaire-data";

// --- Types ---
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

// --- Constants ---
const TTS_DEFAULT_RATE = 1.0;
const TTS_DEFAULT_LANG = "ko-KR";

const DEFAULT_OPTIONS: AnswerOption[] = [
  { value: 1, label: "전혀 그렇지 않다" },
  { value: 2, label: "거의 그렇지 않다" },
  { value: 3, label: "가끔 그렇다" },
  { value: 4, label: "자주 그렇다" },
  { value: 5, label: "매우 그렇다" },
  { value: -1, label: "잘 모르겠음" },
];

function matchVoiceToOption(spokenText: string, options: AnswerOption[]): number | null {
  const text = spokenText.replace(/\s+/g, "").toLowerCase();

  const indexPatterns = [
    { idx: 0, keywords: ["1번", "일번", "첫번째", "첫번", "하나", "원"] },
    { idx: 1, keywords: ["2번", "이번", "두번째", "두번", "둘", "투"] },
    { idx: 2, keywords: ["3번", "삼번", "세번째", "세번", "셋", "쓰리"] },
    { idx: 3, keywords: ["4번", "사번", "네번째", "네번", "넷", "포"] },
    { idx: 4, keywords: ["5번", "오번", "다섯번째", "다섯번", "다섯", "파이브"] },
    { 
      idx: -1, 
      keywords: [
        "모름", "몰라", "마지막", 
        "모르겠는데", "모르겠어", "모르겠", "잘모르", "전혀모르", "아직모르",
        "글쎄", "확실하지않", "확실치않", 
        "기억안", "기억이안", "생각안", "가물가물",
        "패스", "넘어가", "답변불가", "알수없"
      ] 
    },
  ];

  for (const p of indexPatterns) {
    if (p.idx === -1) {
       if (p.keywords.some(k => text.includes(k))) {
          const unknownOpt = options.find(o => o.value === -1);
          if (unknownOpt) return unknownOpt.value;
       }
       continue;
    }

    if (p.idx >= options.length) continue; 
    
    if (p.keywords.some((k) => text.includes(k))) {
      return options[p.idx].value;
    }
  }

  for (const opt of options) {
    const label = opt.label.replace(/\s+/g, ""); 
    const keywords: string[] = [label];

    if (
      label.includes("않음") || 
      label.includes("없음") || 
      label.includes("안함") || 
      label.includes("비흡연") || 
      label.includes("전혀")
    ) {
      keywords.push("아니", "아니요", "노", "no", "never", "아뇨", "안해", "안피워", "안펴", "끊었어", "없어", "안먹어");
    }

    if (
      label.includes("피움") || 
      label.includes("흡연") || 
      label.includes("합니다") || 
      label.includes("있음") ||
      label.includes("매우") || 
      label.includes("자주")
    ) {
      keywords.push("네", "예", "응", "어", "yes", "맞아", "그렇", "오케이", "ok", "피워", "피움", "펴", "함", "해", "있어");
    }

    if (label.includes("가끔") || label.includes("보통")) keywords.push("중간", "그저", "때때로");
    if (label.includes("자주")) keywords.push("종종", "빈번", "많이");

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

  const [hasStarted, setHasStarted] = useState(false);
  const [isMicError, setIsMicError] = useState(false);

  const qData = useMemo(() => {
    let rawItems;
    if (questions && questions.length > 0) {
      rawItems = questions.map((q, i) => ({
        id: i,
        category: "general",
        type: "scale" as const,
        question: q,
        options: undefined, 
      }));
    } else {
      const limit = total > 0 ? total : CHECKUP_QUESTIONS.length;
      rawItems = CHECKUP_QUESTIONS.slice(0, limit);
    }
    
    return rawItems.map((item) => ({
      ...item,
      question: item.question.replace(/^[\d\.]+\s*/, "")
    }));
  }, [questions, total]);

  const qTexts = useMemo(() => qData.map((item, i) => `${i + 1}. ${item.question}`), [qData]);

  const [active, setActive] = useState(0);
  const [answers, setAnswers] = useState<Array<number | null>>(() => Array.from({ length: qTexts.length }, () => null));

  const activeRef = useRef(0);
  const answersRef = useRef<Array<number | null>>([]);
  const commandRecRef = useRef<any>(null);
  const [commandListening, setCommandListening] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [translateY, setTranslateY] = useState(0);

  const [speaking, setSpeaking] = useState(false);
  const isSpeakingRef = useRef(false);
  
  const ttsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPlayedRef = useRef<number>(-1);
  const isTransitioningRef = useRef(false);
  const [answerLiveText, setAnswerLiveText] = useState("");

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

  const killAudio = useCallback(() => {
    if (ttsTimeoutRef.current) {
      clearTimeout(ttsTimeoutRef.current);
      ttsTimeoutRef.current = null;
    }
    try { window.speechSynthesis.cancel(); } catch { }
    try { commandRecRef.current?.abort(); } catch { }
    setSpeaking(false);
    isSpeakingRef.current = false;
  }, []);

  useEffect(() => {
    return () => killAudio();
  }, [killAudio]);

  const checkMicrophoneAvailability = async (): Promise<boolean> => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasAudioInput = devices.some(device => device.kind === 'audioinput');
        if (!hasAudioInput) return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setIsMicError(false);
      return true;
    } catch (err) {
      setIsMicError(true);
      return false;
    }
  };

  const speakText = useCallback((text: string, index: number) => {
    if (!("speechSynthesis" in window)) return;
    if (isMicError) return;

    window.speechSynthesis.cancel();
    if (commandRecRef.current) commandRecRef.current.abort();

    isSpeakingRef.current = true;
    setSpeaking(true);

    const cleanText = text.replace(/^[\d\.\s]+/, "");
    
    const num = index + 1;
    const korNums = ["영", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구", "십"];
    const numString = num <= 10 ? korNums[num] : num;
    
    const textToSpeak = `${numString}번 문항, ${cleanText}`;

    const u = new SpeechSynthesisUtterance(textToSpeak);
    u.lang = TTS_DEFAULT_LANG;
    u.rate = TTS_DEFAULT_RATE;

    const voices = window.speechSynthesis.getVoices();
    const korVoice = voices.find(v => v.lang.includes("ko"));
    if (korVoice) u.voice = korVoice;

    u.onend = () => {
      isSpeakingRef.current = false;
      setSpeaking(false);
      if (hasStarted && !isMicError && !isTransitioningRef.current) {
          setTimeout(startHotwordListening, 100);
      }
    };
    
    u.onerror = () => {
       isSpeakingRef.current = false;
       setSpeaking(false);
    };

    window.speechSynthesis.speak(u);
  }, [hasStarted, isMicError]);

  const startHotwordListening = useCallback(async () => {
    if (isMicError) return;
    if (isSpeakingRef.current || !hasStarted) return;
    if (commandRecRef.current) return;
    if (isTransitioningRef.current) return;

    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setIsMicError(true); return; }

    const rec: any = new SR();
    rec.lang = "ko-KR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setCommandListening(true);
      setIsMicError(false);
    };

    rec.onend = () => {
      setCommandListening(false);
      commandRecRef.current = null;
      if (!isMicError && !isSpeakingRef.current && hasStarted && !isTransitioningRef.current) {
        setTimeout(() => startHotwordListening(), 200);
      }
    };

    rec.onerror = (e: any) => {
      setCommandListening(false);
      commandRecRef.current = null;
      if (['audio-capture', 'not-allowed', 'service-not-allowed'].includes(e.error)) {
        setIsMicError(true);
        killAudio();
        return;
      }
      if (!isMicError && !isSpeakingRef.current && hasStarted && !isTransitioningRef.current) {
        setTimeout(() => startHotwordListening(), 500);
      }
    };

    rec.onresult = (ev: SpeechRecognitionEvent) => {
      if (isSpeakingRef.current || isTransitioningRef.current) return;

      let text = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        text += ev.results[i][0].transcript;
      }
      const normalized = text.trim();
      setAnswerLiveText(normalized);

      const currentActive = activeRef.current;
      const currentQItem = qData[currentActive];
      
      const matchedValue = matchVoiceToOption(normalized, currentQItem?.options || DEFAULT_OPTIONS);
      let answerUpdated = false;

      if (matchedValue !== null) {
        selectAnswer(currentActive, matchedValue);
        answerUpdated = true;
      }

      const hasNextCommand = normalized.includes("다음") || normalized.includes("넘어") || normalized.includes("넥스트");
      if (hasNextCommand) {
        const currentAnswer = answersRef.current[currentActive];
        if ((answerUpdated || currentAnswer !== null) && currentActive < qTexts.length - 1) {
          if (commandRecRef.current) commandRecRef.current.abort(); 
          triggerNext(answerUpdated ? 500 : 0);
        }
      }
    };

    commandRecRef.current = rec;
    try { rec.start(); } catch (err) { setIsMicError(true); }
  }, [hasStarted, qData, qTexts.length, isMicError, killAudio]);

  const triggerNext = (delay: number) => {
    if (isTransitioningRef.current) return;

    isTransitioningRef.current = true;
    if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
    
    setTimeout(() => {
      setAnswerLiveText("");
      setActive(prev => prev + 1);
    }, delay);
  };

  const triggerPrev = () => {
    if (active > 0) {
      isTransitioningRef.current = true;
      if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
      setAnswerLiveText("");
      setActive(prev => prev - 1);
    }
  };

  useEffect(() => {
    if (!hasStarted) return;
    
    activeRef.current = active;
    setAnswerLiveText("");

    if (lastPlayedRef.current === active) return;
    lastPlayedRef.current = active;

    if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);

    const delay = active === 0 ? 800 : 500;

    ttsTimeoutRef.current = setTimeout(() => {
      isTransitioningRef.current = false;
      const q = qData[active];
      if (q) {
        speakText(q.question, active);
      }
      ttsTimeoutRef.current = null;
    }, delay);

    return () => {
      if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
      window.speechSynthesis.cancel();
    };
  }, [active, hasStarted, qData, speakText]);

  const handleStartSurvey = async () => {
    window.speechSynthesis.cancel();
    
    const isMicReady = await checkMicrophoneAvailability();
    if (!isMicReady) {
      setHasStarted(true);
      setIsMicError(true);
      return; 
    }
    
    setHasStarted(true);
    setIsMicError(false);
  };

  const handleRetryMic = async () => {
    const isMicReady = await checkMicrophoneAvailability();
    if (isMicReady) {
      setIsMicError(false);
      const q = qData[active];
      if (q) {
        speakText(q.question, active);
      }
    }
  };

  const selectAnswer = (i: number, value: number) => {
    const nextAnswers = [...answersRef.current];
    nextAnswers[i] = value;
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
  };

  const handleFinishClick = () => {
    // onFinish가 없어도 안전하게 실행
    const validAnswers = answers.filter((v) => v !== null) as number[];
    const sum = validAnswers.reduce((a, b) => {
        return a + (b === -1 ? 0 : b);
    }, 0);
    
    const effectiveCount = validAnswers.filter(v => v !== -1).length;
    const mean = effectiveCount > 0 ? sum / effectiveCount : null;

    const result: SurveyResult = {
      total: qTexts.length,
      answeredCount: validAnswers.length,
      sum,
      mean,
      items: qData.map((q, idx) => ({
        index: idx,
        question: q.question,
        answer: answers[idx],
      })),
      answers,
    };

    if (onFinish) {
      onFinish(result);
    }
  };

  const manualPlay = () => {
      const q = qData[active];
      if (q) {
        speakText(q.question, active);
      }
  };

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

  // 기존에는 여기서 active를 기준으로 isLast를 계산했기 때문에
  // 마지막 페이지에 도달하면 모든 이전 카드들이 isLast = true가 되어버리는 문제가 있었습니다.
  // const isLast = active === qTexts.length - 1; <--- (삭제됨)

  return (
    <Viewport ref={containerRef} $h={height}>
      {isMicError && (
        <ModalOverlay>
          <ModalContent>
            <ModalTitle>🎤 마이크 연결 필요</ModalTitle>
            <ModalText>
              마이크가 감지되지 않습니다.<br />
              마이크를 연결하고 권한을 허용한 뒤<br />
              <b>다시 시도</b> 버튼을 눌러주세요.
            </ModalText>
            <StartButton onClick={handleRetryMic}>
              연결 확인 및 다시 시도
            </StartButton>
          </ModalContent>
        </ModalOverlay>
      )}

      <MicVisualizer isListening={commandListening} />

      <Track ref={trackRef} style={{ transform: `translateY(${translateY}px)` }}>
        <Spacer style={{ height: "30vh" }} />

        {qTexts.map((txt, i) => {
          const isActive = i === active;
          const state = i < active ? "past" : i === active ? "active" : "future";
          const itemOpts = qData[i].options || DEFAULT_OPTIONS;
          
          // ✅ 수정됨: 각 카드가 스스로 마지막 문항인지 확인해야 함
          const isItemLast = i === qTexts.length - 1;

          return (
            <Card key={i} ref={el => { itemRefs.current[i] = el; }} $state={state}>
              <QHeader>
                <QText>{txt}</QText>
                <IconButton onClick={manualPlay}>
                  {speaking && isActive ? "🔇" : "🔊"}
                </IconButton>
              </QHeader>

              <ContentRow>
                <LiveAnswerBox $active={isActive}>
                  {isActive 
                    ? (answerLiveText !== "" ? answerLiveText : <GuideText>아래에 마이크 아이콘이 활성화되면 말씀해주세요</GuideText>) 
                    : ""}
                </LiveAnswerBox>

                <OptionsRow>
                  {itemOpts.map((opt, optIndex) => (
                    <OptionButton
                      key={opt.value}
                      $selected={answers[i] === opt.value}
                      onClick={() => {
                          selectAnswer(i, opt.value);
                          if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
                          if ("speechSynthesis" in window) window.speechSynthesis.cancel();
                          setSpeaking(false);
                          isSpeakingRef.current = false;
                          startHotwordListening();
                      }}
                    >
                      <span className="num">
                        {opt.value === -1 ? "?" : optIndex + 1}
                      </span>
                      <span className="label">{opt.label}</span>
                    </OptionButton>
                  ))}
                </OptionsRow>
              </ContentRow>

              <Footer>
                <Btn onClick={triggerPrev} disabled={i === 0}>이전</Btn>
                {/* ✅ 수정됨: isItemLast 변수를 사용하여 해당 카드만 완료 버튼을 표시 */}
                {!isItemLast ? (
                  <Btn onClick={() => triggerNext(0)} disabled={answers[i] == null}>다음</Btn>
                ) : (
                  <BtnDanger onClick={handleFinishClick} disabled={answers[i] == null}>
                    완료
                  </BtnDanger>
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

// ✅ [수정] Keyframes를 별도로 정의해야 styled-components 문법 오류 방지
const popIn = keyframes`
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`;

const ModalOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
`;

// ✅ [수정] 정의된 keyframes 변수를 사용
const ModalContent = styled.div`
  background: white;
  padding: 32px;
  border-radius: 20px;
  width: 85%;
  max-width: 360px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  animation: ${popIn} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
`;

const ModalTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 12px;
  color: #ef4444;
`;

const ModalText = styled.p`
  color: #475569;
  margin-bottom: 24px;
  line-height: 1.5;
`;

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
  cursor: pointer;
  
  &:active {
    transform: scale(0.98);
  }
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

const LiveAnswerBox = styled.div<{ $active: boolean }>`
  background: #f1f5f9;
  padding: 12px;
  border-radius: 12px;
  min-height: 44px;
  color: #334155;
  display: flex;
  align-items: center;
`;

const GuideText = styled.span`
  color: #94a3b8;
  font-size: 14px;
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
  cursor: pointer;

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
  cursor: pointer;

  &:disabled {
    background: #cbd5e1;
    cursor: not-allowed;
  }
`;

const BtnDanger = styled(Btn)`
  background: #ef4444;
`;