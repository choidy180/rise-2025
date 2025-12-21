"use client";

import React from "react";
import styled, { keyframes, css } from "styled-components";

interface Props {
  isListening: boolean;
}

export default function MicVisualizer({ isListening }: Props) {
  return (
    <FloatingIsland $active={isListening}>
      <IconWrapper>
        {/* 마이크 아이콘 */}
        <MicIcon viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </MicIcon>
        
        {/* 애니메이션 바 */}
        <WaveContainer>
          <Bar $delay={0.0} $active={isListening} />
          <Bar $delay={0.2} $active={isListening} />
          <Bar $delay={0.4} $active={isListening} />
          <Bar $delay={0.1} $active={isListening} />
          <Bar $delay={0.3} $active={isListening} />
        </WaveContainer>
      </IconWrapper>
      
      <StatusText>
        {isListening ? "지금 말씀해주세요" : "잠시만 기다려주세요..."}
      </StatusText>
    </FloatingIsland>
  );
}

// --- Animations ---
const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); }
  70% { box-shadow: 0 0 0 15px rgba(99, 102, 241, 0); }
  100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
`;

const wave = keyframes`
  0%, 100% { height: 8px; }
  50% { height: 24px; }
`;

// --- Styles ---
const FloatingIsland = styled.div<{ $active: boolean }>`
  position: fixed;
  bottom: 40px; /* 화면 하단 배치 */
  left: 50%;
  transform: translateX(-50%) ${({ $active }) => ($active ? "scale(1)" : "scale(0.9)")};
  
  display: flex;
  align-items: center;
  gap: 16px;
  
  padding: 16px 32px;
  border-radius: 50px;
  background: ${({ $active }) => ($active ? "#1e293b" : "#94a3b8")}; /* 활성 시 진한 남색 */
  color: white;
  
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  opacity: ${({ $active }) => ($active ? 1 : 0)}; /* 안들을 땐 숨김 */
  pointer-events: none;
  z-index: 100;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  /* 듣고 있을 때 글로우 효과 및 펄스 */
  ${({ $active }) => $active && css`
    border: 2px solid #6366f1;
    animation: ${pulse} 2s infinite;
  `}
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 40px;
  height: 40px;
  background: #4f46e5;
  border-radius: 50%;
`;

const MicIcon = styled.svg`
  width: 24px;
  height: 24px;
  color: white;
`;

const WaveContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  height: 30px;
`;

const Bar = styled.div<{ $delay: number; $active: boolean }>`
  width: 4px;
  background: #818cf8;
  border-radius: 4px;
  height: 8px;
  
  animation: ${({ $active }) => $active ? css`${wave} 1s ease-in-out infinite` : "none"};
  animation-delay: ${({ $delay }) => $delay}s;
`;

const StatusText = styled.span`
  font-size: 18px;
  font-weight: 700;
  white-space: nowrap;
`;