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

interface Props {
  total?: number;        // 기본 10
  onFinish?: () => void; // 마지막 박스 '종료'
  height?: string;       // 컨테이너 높이 (예: "70vh")
  questions?: string[];  // 질문 문구 배열 (옵션)
}

export default function VerticalStepper({
  total = 10,
  onFinish,
  height = "70vh",
  questions,
}: Props) {
  const qTexts =
    questions && questions.length
      ? questions
      : Array.from({ length: total }, (_, i) => `${i + 1}. 약속이나 해야 할 일을 잊어버려 곤란을 겪은 적이 있습니까?`);

  const [active, setActive] = useState(0);
  // 각 카드의 선택값(1~5). 선택 전엔 null.
  const [answers, setAnswers] = useState<Array<number | null>>(
    Array.from({ length: qTexts.length }, () => null)
  );
  // (옵션) 음성 상태 예시
  const [voiceBusy] = useState(false);

  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);

  const setItemRef = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      itemRefs.current[index] = el;
    },
    []
  );

  const indexes = useMemo(
    () => Array.from({ length: qTexts.length }, (_, i) => i),
    [qTexts.length]
  );

  /** 윈도우 기준 중앙 정렬 */
  const scrollToViewportCenter = useCallback(
    (el: HTMLElement, behavior: ScrollBehavior) => {
      const rect = el.getBoundingClientRect();
      const targetTop =
        window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2;
      window.scrollTo({ top: targetTop, behavior });
    },
    []
  );

  // 첫 진입: 1번 카드를 윈도우 세로 중앙에
  useLayoutEffect(() => {
    const firstEl = itemRefs.current[0];
    if (!firstEl) return;
    requestAnimationFrame(() => {
      scrollToViewportCenter(firstEl, "auto");
      firstEl.focus({ preventScroll: true });
    });
  }, [scrollToViewportCenter]);

  // 활성 카드 변경 시에도 항상 화면 중앙 + 포커스
  useEffect(() => {
    const el = itemRefs.current[active];
    if (!el) return;
    scrollToViewportCenter(el, "smooth");
    el.focus({ preventScroll: true });
  }, [active, scrollToViewportCenter]);

  const goPrev = () => setActive((i) => Math.max(0, i - 1));
  const goNext = () => setActive((i) => Math.min(qTexts.length - 1, i + 1));
  const handleFinish = () =>
    answers[active] == null
      ? undefined
      : onFinish
      ? onFinish()
      : alert("종료되었습니다.");

  // 현재 카드에서 선택되었는지
  const hasSelection = answers[active] != null;

  // 옵션 클릭
  const selectAnswer = (i: number, value: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
  };

  // 키보드 네비 (↑/↓, Home/End, 1~5, Enter)
  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowUp":
      case "PageUp":
        e.preventDefault();
        goPrev();
        break;
      case "ArrowDown":
      case "PageDown":
        e.preventDefault();
        goNext();
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(qTexts.length - 1);
        break;
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
        e.preventDefault();
        selectAnswer(active, Number(e.key));
        break;
      case "Enter":
        if (!hasSelection) return;
        if (active === qTexts.length - 1) handleFinish();
        else goNext();
        break;
    }
  };

  return (
    <Wrap
      $h={height}
      onKeyDown={onKeyDown}
      role="listbox"
      aria-activedescendant={`step-${active}`}
    >
      {indexes.map((i) => {
        const isFirst = i === 0;
        const isLast = i === qTexts.length - 1;
        const isActive = i === active;
        const selected = answers[i];

        // 상태: 과거/현재/미래
        const state: "past" | "active" | "future" =
          i < active ? "past" : i === active ? "active" : "future";

        return (
          <Card
            key={i}
            id={`step-${i}`}
            ref={setItemRef(i)}
            // 미래 박스는 포커스/탭 불가
            tabIndex={state === "future" ? -1 : 0}
            $state={state}
            role="option"
            aria-selected={isActive}
            aria-disabled={state === "future" || undefined}
            aria-label={`${i + 1}번째 문항 ${isActive ? "현재 포커스" : ""}`}
          >
            {/* 질문 헤더 */}
            <QHeader>
              <QIndex>{i + 1}</QIndex>
              <QText>{qTexts[i]}</QText>
              {/* (옵션) 우측 음성 아이콘 자리 */}
              <IconBadge aria-label="음성">🔊</IconBadge>
            </QHeader>

            {/* 녹음 / 상태 버튼 + 상태바 */}
            <VoiceRow>
              <VoiceButton type="button">🎤 음성 응답</VoiceButton>
            </VoiceRow>

            <VoiceStatus $busy={voiceBusy}>
              {voiceBusy ? "음성 처리 중…" : " "}
            </VoiceStatus>

            {/* 1~5 선택 영역 */}
            <OptionsRow>
              {([1, 2, 3, 4, 5] as const).map((val) => (
                <OptionButton
                  key={val}
                  type="button"
                  onClick={() => selectAnswer(i, val)}
                  $selected={selected === val}
                >
                  <span className="num">{val}</span>
                  <span className="label">
                    {val === 1
                      ? "전혀 그렇지 않다"
                      : val === 2
                      ? "거의 그렇지 않다"
                      : val === 3
                      ? "가끔 그렇다"
                      : val === 4
                      ? "자주 그렇다"
                      : "매우 그렇다"}
                  </span>
                </OptionButton>
              ))}
            </OptionsRow>

            {/* 하단 이전/다음(또는 종료) — 선택 전엔 다음/종료 비활성 */}
            <Footer>
              <BtnPrev onClick={goPrev} disabled={isFirst} aria-disabled={isFirst}>
                이전
              </BtnPrev>
              {!isLast ? (
                <Btn onClick={goNext} disabled={!hasSelection} aria-disabled={!hasSelection}>
                  다음
                </Btn>
              ) : (
                <BtnDanger
                  onClick={handleFinish}
                  disabled={!hasSelection}
                  aria-disabled={!hasSelection}
                >
                  종료
                </BtnDanger>
              )}
            </Footer>
          </Card>
        );
      })}
    </Wrap>
  );
}

/* ================= styles ================= */

const Wrap = styled.div<{ $h: string }>`
  height: ${({ $h }) => $h};
  /* 내부 스크롤 제거 → 페이지 스크롤 사용 */
  overflow-y: visible;
  padding: 12px 16px;
  display: grid;
  gap: 12px;
  background: #f6f7fb;

  /* 첫 번째/마지막 카드 여백 */
  & > :first-child {
    margin-top: 30vh;
  }
  & > :last-child {
    margin-bottom: 30vh;
  }
`;

const Card = styled.div<{ $state: "past" | "active" | "future" }>`
  outline: none;
  border-radius: 14px;
  padding: 16px;
  background: #ffffff;

  border: 2px solid
    ${({ $state }) => ($state === "active" ? "#5C7CFA" : "#eef0f5")};
  box-shadow: ${({ $state }) =>
    $state === "active"
      ? "0 8px 22px rgba(92,124,250,0.18)"
      : "0 2px 6px rgba(0,0,0,0.04)"};

  /* 과거는 0.45, 미래는 완전 투명, 현재는 1 */
  opacity: ${({ $state }) =>
    $state === "active" ? 1 : $state === "past" ? 0.45 : 0};
  transform: ${({ $state }) =>
    $state === "active" ? "translateZ(0)" : "scale(0.98)"};
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;

  /* 미래 박스는 클릭/포인터/선택 불가 */
  pointer-events: ${({ $state }) => ($state === "future" ? "none" : "auto")};
  user-select: ${({ $state }) => ($state === "future" ? "none" : "auto")};

  &:focus-visible {
    border-color: #5c7cfa;
    box-shadow: 0 0 0 3px rgba(92, 124, 250, 0.25);
  }
`;

/* --- 상단 질문 영역 --- */
const QHeader = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: start;
  gap: 10px;
`;

const QIndex = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #eef1ff;
  color: #334155;
  font-weight: 800;
  font-size: 13px;
`;

const QText = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.45;
`;

const IconBadge = styled.span`
  user-select: none;
  font-size: 16px;
  line-height: 1;
  opacity: 0.75;
`;

/* --- 음성 버튼/상태 --- */
const VoiceRow = styled.div`
  margin-top: 12px;
`;

const VoiceButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #22c55e;
  background: #22c55e;
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
`;

const VoiceStatus = styled.div<{ $busy: boolean }>`
  margin-top: 10px;
  min-height: 40px;
  border-radius: 10px;
  border: 1px dashed #cfd6e4;
  background: #f9fbff;
  color: ${({ $busy }) => ($busy ? "#0f172a" : "transparent")};
  display: flex;
  align-items: center;
  padding: 10px 12px;
`;

/* --- 하단 1~5 선택 --- */
const OptionsRow = styled.div`
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const OptionButton = styled.button<{ $selected?: boolean }>`
  display: grid;
  grid-template-rows: auto auto;
  place-items: center;
  gap: 6px;
  width: 100%;
  padding: 12px 6px;
  border-radius: 12px;
  border: 1px solid ${({ $selected }) => ($selected ? "#5C7CFA" : "#e6e8ee")};
  background: ${({ $selected }) => ($selected ? "#EEF2FF" : "#ffffff")};
  box-shadow: ${({ $selected }) =>
    $selected ? "inset 0 0 0 2px rgba(92,124,250,0.1)" : "none"};
  cursor: pointer;

  .num {
    font-weight: 800;
    font-size: 14px;
    color: ${({ $selected }) => ($selected ? "#3b5bfd" : "#0f172a")};
  }
  .label {
    font-size: 12px;
    color: #475569;
    white-space: nowrap;
  }

  &:hover {
    background: ${({ $selected }) => ($selected ? "#E7ECFF" : "#f7f8fb")};
  }
`;

/* --- 하단 이전/다음 --- */
const Footer = styled.div`
  margin-top: 16px;
  display: flex;
  gap: 8px;
  align-items: center;
`;

const Btn = styled.button`
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid #d7d9e0;
  background: #ffffff;
  color: #0f172a;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:not(:disabled):hover {
    background: #f3f4f6;
  }
`;

/* 왼쪽 끝으로 붙이기 */
const BtnPrev = styled(Btn)`
  margin-right: auto;
`;

const BtnDanger = styled(Btn)`
  border-color: #ffd7dc;
  background: #ffecef;
  color: #b91c1c;

  &:hover:enabled {
    background: #ffdfe5;
  }
`;
