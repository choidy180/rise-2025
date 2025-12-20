"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type SpeechCallbacks = {
  onInterim?: (text: string) => void; // 인식 중간결과 콜백
  onFinal?: (text: string) => void;   // 인식 최종결과 콜백
  onError?: (err: string) => void;    // 에러 콜백
};

export function useSpeechRecognition(
  opts?: {
    lang?: string;
    interimResults?: boolean;
    continuous?: boolean;
  },
  cbs?: SpeechCallbacks
) {
  const { lang = "ko-KR", interimResults = true, continuous = true } = opts ?? {};
  const { onInterim, onFinal, onError } = cbs ?? {};

  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [finalText, setFinalText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    setSupported(true);

    const rec: SpeechRecognition = new SR();
    rec.lang = lang;
    rec.interimResults = interimResults;
    rec.continuous = continuous;

    rec.addEventListener("start", () => {
      setListening(true);
      setError(null);
    });

    rec.onerror = (e: any) => {
      const err = e?.error ?? "recognition-error";
      setError(err);
      setListening(false);
      onError?.(err);
    };
    rec.onend = () => setListening(false);

    rec.onresult = (ev: SpeechRecognitionEvent) => {
      let _interim = "";
      let _final = "";

      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const transcript = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) _final += transcript;
        else _interim += transcript;
      }

      if (_interim) {
        setInterim(_interim);
        onInterim?.(_interim);
      } else {
        setInterim("");
      }

      if (_final) {
        setFinalText(prev => (prev ? prev + " " + _final : _final));
        onFinal?.(_final);
      }
    };

    recognitionRef.current = rec;
    return () => {
      try { rec.stop(); } catch {}
      recognitionRef.current = null;
    };
  }, [lang, interimResults, continuous, onInterim, onFinal, onError]);

  const start = useMemo(() => () => {
    if (!recognitionRef.current || listening) return;
    setError(null);
    setInterim("");
    recognitionRef.current.start();
  }, [listening]);

  const stop = useMemo(() => () => {
    recognitionRef.current?.stop();
  }, []);

  const reset = useMemo(() => () => {
    setInterim("");
    setFinalText("");
    setError(null);
  }, []);

  // ✅ “입력 중” 식별 플래그
  const isDictating = listening && interim.trim().length > 0;

  return {
    supported,
    listening,
    interim,
    finalText,
    error,
    isDictating,     // ← 추가
    start,
    stop,
    reset,
    setFinalText,
  };
}
