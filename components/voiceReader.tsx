// components/VoiceReader.tsx
"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import styled from "styled-components";

/** 외부에서 끌 수 있도록 노출되는 핸들 */
export interface VoiceReaderHandle {
  stopAll: () => void;
}

/** 톤 프리셋과 성별 선호 타입 */
type TonePreset = "neutral" | "gentle" | "energetic";
type GenderPref = "any" | "female" | "male";

/** 컴포넌트 Props */
export interface VoiceReaderProps {
  /** 읽을 텍스트 */
  text: string;
  /** 활성 상태(해당 카드가 포커스/활성일 때 true) */
  active?: boolean;

  /** 활성 상태에서 자동 1회 재생 시도 (기본 true) */
  autoplay?: boolean;

  /** 세션 첫 진입 시 자동재생 허용 여부 묻기 (confirm) */
  askAutoplayOnce?: boolean;

  /** ▶/⏹ 버튼 표시 */
  showControls?: boolean;

  /** "음성 활성화" 작은 힌트 표시 (모달 말고 작은 버튼) */
  showUnlockHint?: boolean;

  /** UI 없이 첫 사용자 제스처만으로 조용히 unlock+재생 */
  silentUnlockOnFirstGesture?: boolean;

  /** 친절/활기 등 톤 프리셋 */
  tone?: TonePreset;           // 기본 gentle
  /** 성별 선호(후보 보이스 가점) */
  preferGender?: GenderPref;   // 기본 female

  /** 직접 파라미터(프리셋보다 우선) */
  preferLang?: string;         // 기본 "ko-KR"
  preferRate?: number;         // 기본 톤 프리셋 rate
  preferPitch?: number;        // 기본 톤 프리셋 pitch

  /** speaking 변경 콜백 */
  onSpeakingChange?: (speaking: boolean) => void;
}

/* ===== 기본값/유틸 ===== */
const DEFAULT_LANG = "ko-KR";
const DEFAULT_TONE: TonePreset = "gentle";
const DEFAULT_GENDER: GenderPref = "female";

/** 톤 프리셋 → rate/pitch 매핑 */
const toneToParams = (t: TonePreset) => {
  switch (t) {
    case "gentle":    return { rate: 1.0, pitch: 1.08 };
    case "energetic": return { rate: 1.06, pitch: 1.03 };
    default:          return { rate: 1.0,  pitch: 1.0  };
  }
};

/** 한국어 낭독을 위한 간단한 쉐이핑 */
const shapeKoreanTextForTTS = (raw: string) => {
  let t = (raw ?? "").trim();
  t = t.replace(/^\s*1\.\s*/, "첫번째, ");
  t = t.replace(/^\s*2\.\s*/, "두번째, ");
  t = t.replace(/^\s*3\.\s*/, "세번째, ");
  t = t.replace(/^\s*4\.\s*/, "네번째, ");
  t = t.replace(/^\s*5\.\s*/, "다섯번째, ");
  t = t.replace(/^\s*6\.\s*/, "여섯번째, ");
  t = t.replace(/^\s*7\.\s*/, "일곱번째, ");
  t = t.replace(/^\s*8\.\s*/, "여덟번째, ");
  t = t.replace(/^\s*9\.\s*/, "아홉번째, ");
  t = t.replace(/^\s*10\.\s*/, "열번째, ");

  if (t && !/[.!?？！]$/.test(t)) t += ".";
  t = t.replace(/(습니까|있습니까|있나요|했나요|했습니까)([^\s])/g, "$1, $2");

  return t;
};

/** 보이스 가중치 계산 */
const VOICE_PREF = [/wavenet|natural|neural/i, /korean|ko-kr|한국/i];
const VOICE_AVOID = [/robot|test|default/i];
const FEMALE_HINT = [/female|여성|woman|girl|sunhi|yuna|narae|yujin|mina|jiyoon|heami/i];
const MALE_HINT   = [/male|남성|man|boy|minsik|woo|jihun|jun/i];

const scoreVoice = (v: SpeechSynthesisVoice, preferGender: GenderPref) => {
  let s = 0;
  const name = v.name || "";
  const lang = v.lang || "";

  if (/^ko/i.test(lang)) s += 10;
  VOICE_PREF.forEach((re, i) => re.test(name) && (s += (VOICE_PREF.length - i) * 3));
  VOICE_AVOID.forEach((re) => re.test(name) && (s -= 5));

  if (preferGender === "female" && FEMALE_HINT.some(re => re.test(name))) s += 4;
  if (preferGender === "male"   && MALE_HINT.some(re => re.test(name)))   s += 4;

  return s;
};

const VoiceReader = forwardRef<VoiceReaderHandle, VoiceReaderProps>(
  (
    {
      text,
      active = false,
      autoplay = true,
      askAutoplayOnce = false,
      showControls = false,
      showUnlockHint = false,
      silentUnlockOnFirstGesture = true,

      tone = DEFAULT_TONE,
      preferGender = DEFAULT_GENDER,

      preferLang = DEFAULT_LANG,
      preferRate,
      preferPitch,
      onSpeakingChange,
    },
    ref
  ) => {
    /* ===== 상태/레퍼런스 ===== */
    const mountedRef = useRef(true);
    const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

    const [speaking, setSpeaking] = useState(false);
    const [needUnlock, setNeedUnlock] = useState(false);

    const primedRef = useRef(false);
    const voicesReadyRef = useRef(false);
    const askedConfirmRef = useRef(false);
    const autoplayAllowedRef = useRef<boolean>(true);
    const autoReadDoneRef = useRef(false);

    /* ===== 외부에 stopAll 노출 ===== */
    const stopAll = useCallback(() => {
      if (!("speechSynthesis" in window)) return;
      try {
        window.speechSynthesis.cancel();
      } catch {}
      utterRef.current = null;
      setSpeaking(false);
      setNeedUnlock(false);
    }, []);
    useImperativeHandle(ref, () => ({ stopAll }), [stopAll]);

    useEffect(() => onSpeakingChange?.(speaking), [speaking, onSpeakingChange]);

    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
        stopAll();
      };
    }, [stopAll]);

    /* ===== 세션 단위 자동재생 허용 확인(옵션) ===== */
    useEffect(() => {
      if (!askAutoplayOnce || askedConfirmRef.current) return;
      askedConfirmRef.current = true;
      try {
        const prev = sessionStorage.getItem("tts_autoplay_pref");
        if (prev === "allow") autoplayAllowedRef.current = true;
        else if (prev === "deny") autoplayAllowedRef.current = false;
        else {
          const choice = window.confirm("음성을 자동 재생할까요?");
          autoplayAllowedRef.current = !!choice;
          sessionStorage.setItem("tts_autoplay_pref", choice ? "allow" : "deny");
        }
      } catch {
        autoplayAllowedRef.current = true;
      }
    }, [askAutoplayOnce]);

    /* ===== 보이스 준비/프라임 ===== */
    const ensureVoicesReady = useCallback((): Promise<void> => {
      return new Promise((resolve) => {
        if (!("speechSynthesis" in window)) return resolve();
        const synth = window.speechSynthesis;
        if (synth.getVoices().length > 0) {
          voicesReadyRef.current = true;
          return resolve();
        }
        const onVoices = () => {
          voicesReadyRef.current = true;
          synth.removeEventListener("voiceschanged", onVoices as any);
          resolve();
        };
        synth.addEventListener("voiceschanged", onVoices as any);
        setTimeout(() => {
          if (!voicesReadyRef.current) resolve();
        }, 700);
      });
    }, []);

    const primeEngine = useCallback(async () => {
      if (primedRef.current || !("speechSynthesis" in window)) return;
      await ensureVoicesReady();
      try {
        const u = new SpeechSynthesisUtterance(" ");
        u.lang = preferLang || DEFAULT_LANG;
        u.rate = 2;
        u.pitch = 1;
        u.volume = 0;
        const done = new Promise<void>((res) => {
          u.onend = () => res();
          u.onerror = () => res();
        });
        window.speechSynthesis.speak(u);
        await done;
      } catch {}
      primedRef.current = true;
    }, [ensureVoicesReady, preferLang]);

    /* ===== 보이스 선택 ===== */
    const chooseVoice = useCallback((): SpeechSynthesisVoice | undefined => {
      if (!("speechSynthesis" in window)) return;
      const vs = window.speechSynthesis.getVoices();
      if (!vs?.length) return;
      const sorted = [...vs].sort(
        (a, b) => scoreVoice(b, preferGender) - scoreVoice(a, preferGender)
      );

      const sameLang = sorted.filter(v =>
        v.lang?.toLowerCase().startsWith((preferLang || DEFAULT_LANG).slice(0, 2).toLowerCase())
      );
      return sameLang[0] || sorted[0];
    }, [preferGender, preferLang]);

    /* ===== 낭독 1회 ===== */
    const speakOnce = useCallback(
      (value: string, opts?: { cancelBefore?: boolean }) => {
        if (!("speechSynthesis" in window) || !value) return;
        if (opts?.cancelBefore ?? true) stopAll();

        const shaped = shapeKoreanTextForTTS(value);
        const u = new SpeechSynthesisUtterance(shaped);
        utterRef.current = u;

        const v = chooseVoice();
        if (v) {
          u.voice = v;
          u.lang = v.lang || preferLang || DEFAULT_LANG;
        } else {
          u.lang = preferLang || DEFAULT_LANG;
        }

        const base = toneToParams(tone);
        u.rate  = (preferRate  ?? base.rate);
        u.pitch = (preferPitch ?? base.pitch);

        u.onstart = () => {
          if (!mountedRef.current) return;
          setSpeaking(true);
          setNeedUnlock(false);
        };
        const finish = () => {
          if (!mountedRef.current) return;
          if (utterRef.current === u) {
            setSpeaking(false);
            utterRef.current = null;
            autoReadDoneRef.current = true;
          }
        };
        u.onerror = finish;
        u.onend = finish;

        window.speechSynthesis.speak(u);
      },
      [chooseVoice, preferLang, preferRate, preferPitch, tone, stopAll]
    );

    /* ===== 사용자 제스처로 조용히 unlock+speak ===== */
    const unlockAndSpeak = useCallback(
      async (value: string) => {
        try {
          // 오디오 컨텍스트 킥스타트 (iOS 등 대응)
          const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
          if (AC) {
            const ac = new AC();
            if (ac.state === "suspended") await ac.resume();
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            gain.gain.value = 0.0001; // 무음
            osc.connect(gain).connect(ac.destination);
            osc.start();
            osc.stop(ac.currentTime + 0.05);
            await new Promise((r) => setTimeout(r, 50));
          }
        } catch {}
        speakOnce(value, { cancelBefore: true });
      },
      [speakOnce]
    );

    /* ===== 자동재생 1회 시도 ===== */
    const tryAutoRead = useCallback(async () => {
      if (!active || !autoplay) return;
      if (!autoplayAllowedRef.current) return;
      if (!text || autoReadDoneRef.current) return;

      // 탭이 활성화 상태일 때만 재생 시도
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        await new Promise<void>((res) => {
          const fn = () => {
            if (document.visibilityState === "visible") {
              document.removeEventListener("visibilitychange", fn);
              res();
            }
          };
          document.addEventListener("visibilitychange", fn);
        });
      }
      await primeEngine();
      await ensureVoicesReady();

      speakOnce(text, { cancelBefore: true });

      // 빠르게 실패하면 한 번 더 (브라우저 타이밍 이슈 대응)
      setTimeout(() => {
        if (!speaking && !autoReadDoneRef.current) {
          speakOnce(text, { cancelBefore: true });
        }
      }, 150);

      // 실패 시 Gate 모달 띄우는 로직 제거됨.
      // 대신 showUnlockHint(작은 버튼) 옵션이 있다면 그것만 켬.
      setTimeout(() => {
        if (!speaking && !autoReadDoneRef.current) {
          if (showUnlockHint) setNeedUnlock(true);
        }
      }, 700);
    }, [
      active,
      autoplay,
      text,
      ensureVoicesReady,
      primeEngine,
      speakOnce,
      speaking,
      showUnlockHint,
      // showGate 제거됨
    ]);

    /* 활성/텍스트 변경 시 자동재생 */
    useEffect(() => {
      autoReadDoneRef.current = false;
      if (active) {
        stopAll();
        void tryAutoRead();
      } else {
        stopAll();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, text]);

    /* 첫 사용자 제스처로 조용히 시작 (매우 중요) */
    useEffect(() => {
      if (!silentUnlockOnFirstGesture) return;

      const handler = () => {
        // 아직 읽지 않았고, 활성 상태이며, 말하고 있지 않다면 -> 즉시 재생 시도
        if (!autoReadDoneRef.current && active && !speaking && text) {
          setNeedUnlock(false);
          unlockAndSpeak(text);
        }
        // 한 번 동작하면 리스너 제거
        window.removeEventListener("pointerdown", handler, true);
        window.removeEventListener("touchstart", handler, true);
        window.removeEventListener("mousedown", handler, true);
        window.removeEventListener("keydown", handler, true);
      };

      // 캡처링 단계에서 빠르게 감지
      window.addEventListener("pointerdown", handler, { once: true, capture: true });
      window.addEventListener("touchstart", handler, { once: true, capture: true });
      window.addEventListener("mousedown", handler, { once: true, capture: true });
      window.addEventListener("keydown", handler, { once: true, capture: true });
      return () => {
        window.removeEventListener("pointerdown", handler, true);
        window.removeEventListener("touchstart", handler, true);
        window.removeEventListener("mousedown", handler, true);
        window.removeEventListener("keydown", handler, true);
      };
    }, [silentUnlockOnFirstGesture, active, speaking, text, unlockAndSpeak]);

    /* 크롬 resume 워치독 */
    useEffect(() => {
      if (!("speechSynthesis" in window)) return;
      const id = setInterval(() => {
        try {
          window.speechSynthesis.resume();
        } catch {}
      }, 600);
      return () => clearInterval(id);
    }, []);

    /* ===== 렌더 ===== */
    return (
      <>
        {showControls && (
          <ControlsWrap>
            {!speaking ? (
              <IconButton
                type="button"
                aria-label="듣기 시작"
                title="듣기 시작"
                disabled={!active}
                onClick={() => speakOnce(text, { cancelBefore: true })}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="vg1" x1="0" y1="0" x2="24" y2="24">
                      <stop offset="0" stopColor="#86A8E7" />
                      <stop offset="1" stopColor="#7F7FD5" />
                    </linearGradient>
                  </defs>
                  <circle cx="12" cy="12" r="11" stroke="url(#vg1)" strokeWidth="2" fill="#ffffff"/>
                  <path d="M10 8L16 12L10 16V8Z" fill="#4F46E5"/>
                </svg>
              </IconButton>
            ) : (
              <IconButton
                type="button"
                aria-label="재생 중지"
                title="재생 중지"
                onClick={stopAll}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <defs>
                    <linearGradient id="vg2" x1="0" y1="0" x2="24" y2="24">
                      <stop offset="0" stopColor="#FF9A9E" />
                      <stop offset="1" stopColor="#FECFEF" />
                    </linearGradient>
                  </defs>
                  <circle cx="12" cy="12" r="11" stroke="url(#vg2)" strokeWidth="2" fill="#ffffff"/>
                  <rect x="9" y="9" width="6" height="6" rx="1.5" fill="#EF4444"/>
                </svg>
              </IconButton>
            )}
          </ControlsWrap>
        )}

        {/* GateOverlay 모달은 완전히 삭제되었습니다. */}
        {/* showUnlockHint가 켜져있을 때만 표시되는 작은 힌트 버튼 (원하시면 이것도 showUnlockHint={false}로 끌 수 있습니다) */}
        {showUnlockHint && needUnlock && active && !speaking && (
          <UnlockRow>
            <UnlockBtn type="button" onClick={() => unlockAndSpeak(text)}>
              🔈 음성 활성화
            </UnlockBtn>
            <Hint>터치하면 소리가 나옵니다.</Hint>
          </UnlockRow>
        )}
      </>
    );
  }
);

VoiceReader.displayName = "VoiceReader";
export default VoiceReader;

/* ===== styled ===== */
const ControlsWrap = styled.div`
  display: grid;
  gap: 6px;
  justify-items: end;
`;
const IconButton = styled.button`
  width: 36px; height: 36px; border-radius: 10px;
  border: 1px solid #cbd5e1; background: #fff;
  display: inline-grid; place-items: center; padding: 0; cursor: pointer;
  svg { display: block; }
  &:disabled { cursor: not-allowed; opacity: 0.6; }
  &:not(:disabled):hover { background: #f3f4f6; }
`;
const UnlockRow = styled.div`
  margin-top: 10px; display: grid; grid-template-columns: auto 1fr; gap: 8px; align-items: center;
`;
const UnlockBtn = styled.button`
  padding: 8px 10px; border-radius: 10px; border: 1px solid #cbd5e1; background: #fff; font-weight: 700; cursor: pointer;
  &:hover { background: #f3f4f6; }
`;
const Hint = styled.div` font-size: 12px; color: #64748b; `;

// Gate 관련 스타일 컴포넌트(GateOverlay, GateCard 등)는 모두 삭제했습니다.