"use client";

import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes, css } from "styled-components";

interface Props {
  isListening: boolean;
}

export default function MicVisualizer({ isListening }: Props) {
  const [volume, setVolume] = useState(0);
  
  // Refs for Audio API
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // 이펙트 내부에서 사용할 유효성 플래그
    let isCancelled = false;

    const startVisualizer = async () => {
      try {
        if (!navigator.mediaDevices) return;

        // 1. 스트림 요청 (비동기)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // 중요: await 하는 동안 컴포넌트가 언마운트되거나 isListening이 꺼졌다면
        // 즉시 스트림을 닫고 종료해야 함 (Race Condition 방지)
        if (isCancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        // 2. AudioContext 설정
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
        audioContextRef.current = ctx;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);
        sourceRef.current = source;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        dataArrayRef.current = dataArray;

        // 3. 애니메이션 루프 시작
        updateVolume();
      } catch (e) {
        console.error("Mic visualizer error:", e);
      }
    };

    const updateVolume = () => {
      if (isCancelled) return; // 취소된 경우 루프 중단

      if (!analyserRef.current || !dataArrayRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArrayRef.current);

      let sum = 0;
      const len = dataArrayRef.current.length;
      for (let i = 0; i < len; i++) {
        sum += dataArrayRef.current[i];
      }
      const avg = sum / len;

      setVolume(avg);
      rafIdRef.current = requestAnimationFrame(updateVolume);
    };

    // 로직 실행
    if (isListening) {
      startVisualizer();
    } else {
      // isListening이 false일 때는 볼륨 초기화
      setVolume(0);
    }

    // Cleanup 함수
    return () => {
      isCancelled = true; // 플래그를 true로 설정하여 진행 중인 비동기 작업 무효화

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }

      if (audioContextRef.current) {
        // AudioContext는 닫아주는 것이 메모리 누수 방지에 좋음
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      
      // 소스 노드 연결 해제 (Optional, but good practice)
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
    };
  }, [isListening]);

  // 볼륨 계산 (기존 로직 유지)
  const h1 = Math.min(100, Math.max(10, volume * 1.5));
  const h2 = Math.min(100, Math.max(10, volume * 2.0));
  const h3 = Math.min(100, Math.max(10, volume * 1.2));

  return (
    <Container $active={isListening}>
      <Label>{isListening ? "Listening..." : "Mic Off"}</Label>
      <Visualizer>
        <Bar style={{ height: `${h1}%` }} />
        <Bar style={{ height: `${h2}%` }} $delay />
        <Bar style={{ height: `${h3}%` }} />
      </Visualizer>
      <StatusDot $active={isListening} />
    </Container>
  );
}

// --- Styles (기존과 동일) ---
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
`;

const Container = styled.div<{ $active: boolean }>`
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 9999;
  
  display: flex;
  align-items: center;
  gap: 12px;
  
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
  border-radius: 30px;
  border: 1px solid rgba(255,255,255,0.6);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);

  transition: all 0.3s ease;
  animation: ${fadeIn} 0.5s ease-out;

  opacity: ${({ $active }) => ($active ? 1 : 0.6)};
  filter: ${({ $active }) => ($active ? "none" : "grayscale(100%)")};
`;

const Label = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  letter-spacing: -0.3px;
`;

const Visualizer = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
  height: 16px;
  width: 24px;
`;

const Bar = styled.div<{ $delay?: boolean }>`
  width: 4px;
  background: #6366f1;
  border-radius: 4px;
  min-height: 4px;
  transition: height 0.1s ease;
  display: flex;
  align-self: center;
`;

const StatusDot = styled.div<{ $active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({ $active }) => ($active ? "#ef4444" : "#cbd5e1")};
  
  ${({ $active }) =>
    $active &&
    css`
      animation: ${pulse} 2s infinite;
    `}
`;