// components/FancyButton.tsx
"use client";

import React from "react";
import styled, { keyframes } from "styled-components";

type Size = "sm" | "md" | "lg";

export interface FancyButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

const sheen = keyframes`
  0%   { transform: skewX(-20deg) translateX(-150%); opacity: 0; }
  50%  { opacity: .35; }
  100% { transform: skewX(-20deg) translateX(250%); opacity: 0; }
`;

const pulse = keyframes`
  0% { box-shadow: 0 8px 22px rgba(99,102,241,0.28); }
  50% { box-shadow: 0 10px 26px rgba(99,102,241,0.36); }
  100% { box-shadow: 0 8px 22px rgba(99,102,241,0.28); }
`;

const sizes: Record<Size, { h: number; px: number; gap: number; fs: number; rd: number }> = {
  sm: { h: 38, px: 14, gap: 8, fs: 14, rd: 10 },
  md: { h: 44, px: 16, gap: 10, fs: 15, rd: 12 },
  lg: { h: 62, px: 70, gap: 20, fs: 22, rd: 14 },
};

const Btn = styled.button<{
  $size: Size;
  $full: boolean;
  $loading: boolean;
}>`
  --indigo: #6366f1;
  --indigo-dark: #4f46e5;
  --indigo-darker: #4338ca;

  position: relative;
  display: inline-grid;
  grid-auto-flow: column;
  align-items: center;
  justify-content: center;
  gap: ${({ $size }) => sizes[$size].gap}px;

  height: ${({ $size }) => sizes[$size].h}px;
  padding: 0 ${({ $size }) => sizes[$size].px}px;
  width: ${({ $full }) => ($full ? "100%" : "auto")};

  border: 0;
  border-radius: ${({ $size }) => sizes[$size].rd}px;
  background: linear-gradient(180deg, var(--indigo), var(--indigo-dark));
  color: #fff;
  font-weight: 800;
  font-size: ${({ $size }) => sizes[$size].fs}px;
  letter-spacing: 0.2px;

  box-shadow: 0 8px 22px rgba(99, 102, 241, 0.28);
  animation: ${pulse} 2.8s ease-in-out infinite;

  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  outline: none;

  transition:
    transform 0.12s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease,
    background 0.2s ease;

  /* 광택 이펙트 */
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(
      120deg,
      transparent 0%,
      rgba(255, 255, 255, 0.6) 18%,
      transparent 36%
    );
    transform: skewX(-20deg) translateX(-150%);
    pointer-events: none;
  }
  &:hover::after {
    animation: ${sheen} 0.9s ease forwards;
  }

  /* 호버/포커스/액티브 */
  &:hover {
    filter: brightness(1.02);
    box-shadow: 0 12px 28px rgba(99, 102, 241, 0.34);
    transform: translateY(-1px);
  }
  &:active {
    transform: translateY(0);
    box-shadow: 0 6px 16px rgba(99, 102, 241, 0.26);
    background: linear-gradient(180deg, var(--indigo-dark), var(--indigo-darker));
  }
  &:focus-visible {
    box-shadow:
      0 0 0 3px rgba(99, 102, 241, 0.25),
      0 8px 22px rgba(99, 102, 241, 0.28);
  }

  /* 로딩/비활성 */
  ${({ $loading }) =>
    $loading &&
    `
    cursor: wait;
    filter: saturate(.9);
  `}

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
    animation: none;
    transform: none;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.18);
  }
`;

const Spinner = styled.span`
  width: 1.1em;
  height: 1.1em;
  border: 2px solid rgba(255, 255, 255, 0.55);
  border-top-color: #fff;
  border-radius: 999px;
  display: inline-block;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const IconWrap = styled.span`
  display: inline-grid;
  place-items: center;
  line-height: 0;
  svg {
    display: block;
  }
`;

const Label = styled.span`
  line-height: 1;
  white-space: nowrap;
`;

const FancyButton: React.FC<FancyButtonProps> = ({
  children,
  size = "md",
  fullWidth = false,
  loading = false,
  startIcon,
  endIcon,
  disabled,
  ...rest
}) => {
  const isDisabled = disabled || loading;

  return (
    <Btn
      type="button"
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      disabled={isDisabled}
      $size={size}
      $full={fullWidth}
      $loading={loading}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner aria-hidden="true" />
          <Label>처리 중…</Label>
        </>
      ) : (
        <>
          {startIcon && <IconWrap>{startIcon}</IconWrap>}
          <Label>{children}</Label>
          {endIcon && <IconWrap>{endIcon}</IconWrap>}
        </>
      )}
    </Btn>
  );
};

export default FancyButton;
