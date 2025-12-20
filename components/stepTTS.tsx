"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import styled from "styled-components";

/** 외부에서 끌 수 있도록 노출되는 핸들(필요시 확장) */
export interface StepTTSHandle {
  stopAll: () => void;
}

/** Props */
export interface StepTTSProps {
  text: string;
  active: boolean;
  disabled?: boolean;

  /** ▶/⏹ 버튼 표시 여부 (아이콘 버튼) */
  showControls?: boolean;     // 기본 true

  /** 시작 전 alert. (⚠️ 현재는 내부에서 alert 호출하지 않음. 상위에서 처리 권장) */
  alertOnStart?: boolean | string;

  /** 자동 낭독 시도 여부 (게이트/버튼 없이 자동으로 시작). 기본 true */
  autoplay?: boolean;

  /** “처음으로 실제 음성이 재생되었을 때” 콜백 */
  onFirstPlay?: () => void;

  /** 게이트(“시작하기” 오버레이) 보이기 */
  showGate?: boolean;         // 기본 true

  /** 자동재생 실패 시 “🔈 음성 활성화” 힌트 표시 여부 */
  showUnlockHint?: boolean;   // 기본 true

  /** 게이트/버튼을 완전 숨김(아이콘 버튼 포함). 필요시 true */
  hideAllButtons?: boolean;   // 기본 false
}

/* =========================================================
  ====== TTS 내부 설정(UI 없음, 코드에서만 제어) ======
   ========================================================= */
const TTS_FORCE_VOICE_NAME: string | null = null;
const TTS_VOICE_PREF = [
  /wavenet|natural|neural/i,
  /korean|ko-kr|한국|korea/i,
  /female|여성|woman|girl/i,
  /google|samsung|narae|yuna|mina|yujin|soo/i,
];
const TTS_VOICE_AVOID = [/robot|test|default/i];
const TTS_DEFAULT_RATE = 1.0;   // ✋ 레이트/톤(피치) 건드리지 않음
const TTS_DEFAULT_PITCH = 0.9;  // ✋
const TTS_DEFAULT_LANG = "ko-KR";

export default function StepTTS({
  text,
  active,
  disabled,
  showControls = true,
  alertOnStart = false,         // 상위에서 자체 alert 처리 권장
  autoplay = true,
  onFirstPlay,
  showGate = true,
  showUnlockHint = true,
  hideAllButtons = false,
}: StepTTSProps) {
  const mountedRef = useRef(true);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const primedRef = useRef(false);
  const voicesReadyRef = useRef(false);
  const autoplayAllowedRef = useRef<boolean>(true);
  const askedConfirmRef = useRef(false);
  const autoReadDoneRef = useRef(false);
  const firstPlayFiredRef = useRef(false);

  const [speaking, setSpeaking] = useState(false);
  const [needUnlock, setNeedUnlock] = useState(false);
  const [gateVisible, setGateVisible] = useState(showGate);

  // 마운트/언마운트
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      try {
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      } catch {}
    };
  }, []);

  // 세션 단위 자동재생 허용 여부 질문(최초 1회)
  useEffect(() => {
    if (askedConfirmRef.current) return;
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
  }, []);

  /** 전역 워치독: 크롬 speechSynthesis 멈춤 방지 */
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const id = setInterval(() => {
      try { window.speechSynthesis.resume(); } catch {}
    }, 600);
    return () => clearInterval(id);
  }, []);

  /** 하드 캔슬(현재 발화만 안전하게 중단) */
  const hardCancel = useCallback(() => {
    if (!("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      utterRef.current = null;
    } catch {}
    setSpeaking(false);
    setNeedUnlock(false);
  }, []);

  /** 음성 목록 준비 대기 */
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

  /** 보이스 점수화/선택 */
  const scoreVoice = (v: SpeechSynthesisVoice) => {
    let s = 0;
    const name = v.name || "";
    const lang = v.lang || "";
    if (TTS_FORCE_VOICE_NAME && name === TTS_FORCE_VOICE_NAME) return 9999;
    if (/^ko/i.test(lang)) s += 10;
    TTS_VOICE_PREF.forEach((re, i) => re.test(name) && (s += (TTS_VOICE_PREF.length - i) * 3));
    TTS_VOICE_AVOID.forEach((re) => re.test(name) && (s -= 5));
    return s;
  };

  const selectBestVoice = useCallback((): SpeechSynthesisVoice | undefined => {
    if (!("speechSynthesis" in window)) return;
    const vs = window.speechSynthesis.getVoices();
    if (!vs || !vs.length) return;
    if (TTS_FORCE_VOICE_NAME) {
      const exact = vs.find((v) => v.name === TTS_FORCE_VOICE_NAME);
      if (exact) return exact;
    }
    return [...vs].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
  }, []);

  /** 스피치 엔진 프라임(무음 1회) */
  const primeSpeechEngine = useCallback(async () => {
    if (primedRef.current) return;
    if (!("speechSynthesis" in window)) return;
    await ensureVoicesReady();
    try {
      const u = new SpeechSynthesisUtterance(" ");
      u.lang = TTS_DEFAULT_LANG;
      u.rate = 2;
      u.pitch = 1;
      u.volume = 0; // 무음
      const done = new Promise<void>((res) => { u.onend = () => res(); u.onerror = () => res(); });
      window.speechSynthesis.speak(u);
      await done;
    } catch {}
    primedRef.current = true;
  }, [ensureVoicesReady]);

  /** 실제 1회 낭독 (⚠️ alert 호출 제거됨) */
  const playOnce = useCallback((value: string, opts?: { cancelBefore?: boolean }) => {
    if (!("speechSynthesis" in window)) return;
    if (!value || disabled) return;

    const cancelBefore = opts?.cancelBefore ?? true;
    if (cancelBefore) hardCancel();

    // 처음 재생 시점 콜백만 실행 (alert 내부 호출 제거)
    if (!firstPlayFiredRef.current) {
      firstPlayFiredRef.current = true;
      try { onFirstPlay?.(); } catch {}
    }

    const u = new SpeechSynthesisUtterance(value);
    utterRef.current = u;

    const chosen = selectBestVoice();
    if (chosen) {
      u.voice = chosen;
      u.lang = chosen.lang || TTS_DEFAULT_LANG;
    } else {
      u.lang = TTS_DEFAULT_LANG;
    }

    // ✋ 레이트/피치 변경 금지
    u.rate = TTS_DEFAULT_RATE;
    u.pitch = TTS_DEFAULT_PITCH;

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
  }, [disabled, hardCancel, onFirstPlay, selectBestVoice]);

  /** 사용자 제스처로 조용히 unlock + 재생 */
  const unlockAndSpeak = useCallback(async (value: string) => {
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AC) {
        const ac = new AC();
        if (ac.state === "suspended") await ac.resume();
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        gain.gain.value = 0.0001; // 무음
        osc.connect(gain).connect(ac.destination);
        osc.frequency.value = 440;
        osc.start();
        osc.stop(ac.currentTime + 0.05);
        await new Promise((r) => setTimeout(r, 80));
      }
    } catch {}
    playOnce(value, { cancelBefore: true });
  }, [playOnce]);

  /** 자동재생 1회 시도 (옵션) */
  const tryAutoRead = useCallback(async () => {
    if (!active) return;
    if (!autoplay) return;
    if (!autoplayAllowedRef.current) return;
    if (!text || autoReadDoneRef.current) return;

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
    await primeSpeechEngine();
    await ensureVoicesReady();

    playOnce(text, { cancelBefore: true });

    setTimeout(() => {
      if (!speaking && !autoReadDoneRef.current) {
        playOnce(text, { cancelBefore: true });
      }
    }, 180);

    setTimeout(() => {
      if (!speaking && !autoReadDoneRef.current) {
        if (showUnlockHint) setNeedUnlock(true);
        if (showGate) setGateVisible(true);
      }
    }, 700);
  }, [active, autoplay, text, primeSpeechEngine, ensureVoicesReady, playOnce, speaking, showUnlockHint, showGate]);

  // 활성/텍스트 변경 시 자동재생 재시도
  useEffect(() => {
    autoReadDoneRef.current = false;
    if (active) {
      hardCancel();
      void tryAutoRead();
    } else {
      hardCancel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, text]);

  return (
    <>
      {/* 아이콘 컨트롤 (숨김 가능) */}
      {!hideAllButtons && showControls && (
        <ControlsWrap>
          {!speaking ? (
            <IconButton
              type="button"
              aria-label="듣기 시작"
              title="듣기 시작"
              disabled={!active || !!disabled}
              onClick={() => unlockAndSpeak(text)}
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
              onClick={hardCancel}
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

      {/* 시작 게이트(오버레이). 버튼 전체 숨김 모드면 미표시 */}
      {!hideAllButtons && gateVisible && showGate && active && !speaking && (
        <GateOverlay role="dialog" aria-modal="true">
          <GateCard>
            <GateTitle>당신의 답변은 안전하게 기록되며<br/>오직 맞춤 안내에만 사용됩니다.</GateTitle>
            {/* <GateDesc>브라우저가 자동재생을 제한하고 있어요. 한 번만 눌러주면 이어집니다.</GateDesc> */}
            <GateBtn
              type="button"
              onClick={() => {
                setGateVisible(false);
                setNeedUnlock(false);
                unlockAndSpeak(text);
              }}
            >
              시작하기
            </GateBtn>
          </GateCard>
        </GateOverlay>
      )}
    </>
  );
}

/* ===== styled ===== */
const ControlsWrap = styled.div`
  display: grid;
  gap: 6px;
  justify-items: end;
`;
const IconButton = styled.button`
  width: 36px; height: 36px; border-radius: 10px; opacity: 0;
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
const GateOverlay = styled.div`
  position: fixed; inset: 0; background: rgba(15,23,42,0.45);
  display: grid; place-items: center; z-index: 9999;
`;
const GateCard = styled.div`
  width: min(520px, calc(100vw - 32px)); border-radius: 16px; background: #fff;
  padding: 20px 18px; border: 1px solid #e5e7eb; box-shadow: 0 12px 30px rgba(0,0,0,0.15);
`;
const GateTitle = styled.div` width: 100%; text-align:center; font-weight: 600; font-size: 22px; color: #111827; `;
const GateDesc = styled.div` margin-top: 8px; font-size: 18px; color: #6b7280; line-height: 1.45; `;
const GateBtn = styled.button`
  margin-top: 28px; width: 100%; padding: 12px 14px; border-radius: 12px; font-size: 22px;
  border: 1px solid #c7d2fe; background: #eef2ff; color: #4338ca; font-weight: 800; cursor: pointer;
  &:hover { background: #e0e7ff; }
`;

