"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechCallbacks = {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (err: string) => void;
};

export function useSpeechWithMeter(
  opts?: {
    lang?: string;
    interimResults?: boolean;
    continuous?: boolean;
    meterBars?: number;      // 막대 개수
    meterSmoothing?: number; // 0~1 (커질수록 부드러움)
  },
  cbs?: SpeechCallbacks
) {
  const {
    lang = "ko-KR",
    interimResults = true,
    continuous = true,
    meterBars = 16,
    meterSmoothing = 0.8,
  } = opts ?? {};
  const { onInterim, onFinal, onError } = cbs ?? {};

  // ===== STT 상태 =====
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // ===== 레벨 미터 상태 =====
  const [levels, setLevels] = useState<number[]>(Array(meterBars).fill(0)); // 0..1
  const rafRef = useRef<number | null>(null);

  // ===== 오디오/인식 리소스 =====
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const srcNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null); // time-domain data view

  // ===== STT 초기화 =====
  useEffect(() => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    setSupported(true);

    const rec: SpeechRecognition = new SR();
    rec.lang = lang;
    rec.interimResults = interimResults;
    rec.continuous = continuous;

    rec.onstart = () => { setListening(true); setError(null); };
    rec.onerror = (e: any) => {
      const err = e?.error ?? "recognition-error";
      setError(err);
      setListening(false);
      onError?.(err);
      stopAudioGraph(); // 에러 시 오디오도 정리
    };
    rec.onend = () => { setListening(false); stopAudioGraph(); };
    rec.onresult = (ev: SpeechRecognitionEvent) => {
      let _inter = "";
      let _final = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) _final += t;
        else _inter += t;
      }
      if (_inter) { setInterim(_inter); onInterim?.(_inter); }
      else { setInterim(""); }
      if (_final) {
        setFinalText(prev => (prev ? `${prev} ${_final}` : _final));
        onFinal?.(_final);
      }
    };

    recognitionRef.current = rec;
    return () => {
      try { rec.stop(); } catch {}
      recognitionRef.current = null;
      stopAudioGraph(true);
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, interimResults, continuous, onInterim, onFinal, onError]);

  const cancelRaf = () => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  };

  // ===== 오디오 그래프 구성/종료 =====
  const buildAudioGraph = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;

    const Ctor: any = (window as any).AudioContext || (window as any).webkitAudioContext;
    const audioCtx: AudioContext = new Ctor();
    const analyser = audioCtx.createAnalyser();
    const src = audioCtx.createMediaStreamSource(stream);

    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = meterSmoothing;

    // ★ ArrayBuffer로 명시 생성 → Uint8Array view 부여 (TS 타입 충돌 방지)
    const bufferLength = analyser.frequencyBinCount; // 512
    const ab = new ArrayBuffer(bufferLength);        // ArrayBuffer 명시
    const dataView = new Uint8Array(ab);             // time-domain view (0..255)
    dataRef.current = dataView;

    src.connect(analyser);
    audioCtxRef.current = audioCtx;
    analyserRef.current = analyser;
    srcNodeRef.current = src;

    const tick = () => {
      if (!analyserRef.current || !dataRef.current) return;

      // 시그니처가 Uint8Array<ArrayBuffer>를 요구 → view 로컬 변수에 담아 사용
      const view: Uint8Array = dataRef.current;
      analyserRef.current.getByteTimeDomainData(view);

      // 128 기준 편차 → 평균 진폭(0..1)
      let sum = 0;
      for (let i = 0; i < view.length; i++) {
        const v = (view[i] - 128) / 128; // -1..1
        sum += Math.abs(v);
      }
      const avg = sum / view.length;

      // 미터 막대 분포(중앙 강조)
      const bars: number[] = [];
      for (let i = 0; i < meterBars; i++) {
        const t = i / (meterBars - 1);
        const centerBoost = Math.sin(Math.PI * t); // 0..1..0
        const val = Math.min(1, avg * (1 + 1.5 * centerBoost));
        bars.push(val);
      }
      setLevels(bars);

      rafRef.current = requestAnimationFrame(tick);
    };

    cancelRaf();
    rafRef.current = requestAnimationFrame(tick);
  };

  const stopAudioGraph = (suppressStop?: boolean) => {
    try {
      cancelRaf();

      if (srcNodeRef.current) { try { srcNodeRef.current.disconnect(); } catch {} srcNodeRef.current = null; }
      if (analyserRef.current) { try { analyserRef.current.disconnect(); } catch {} analyserRef.current = null; }

      if (audioCtxRef.current) {
        if (!suppressStop) { try { audioCtxRef.current.close(); } catch {} }
        audioCtxRef.current = null;
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }

      dataRef.current = null;
      setLevels(Array(meterBars).fill(0));
    } catch { /* no-op */ }
  };

  // ===== 공개 API =====
  const start = useCallback(async () => {
    if (!recognitionRef.current || listening) return;
    setError(null);
    setInterim("");
    await buildAudioGraph();
    recognitionRef.current.start();
  }, [listening]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    stopAudioGraph();
  }, []);

  const reset = useCallback(() => {
    setInterim("");
    setFinalText("");
    setError(null);
  }, []);

  const isDictating = listening && interim.trim().length > 0;

  return {
    supported,
    listening,
    interim,
    finalText,
    error,
    isDictating,
    levels,         // 0..1 배열
    start,
    stop,
    reset,
    setFinalText,
  };
}
