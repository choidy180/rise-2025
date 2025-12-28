"use client";

import React, { useState, useMemo } from "react";
import styled from "styled-components";
import CustomKeyboard from "../customKeyboard";
import "react-simple-keyboard/build/css/index.css";
import NumericKeyboard from "./number-input-with-keyboard";
import { isValidRRN } from "@/lib/rrn";
import { useProgressStore } from "@/store/progress-stage";

interface Props {
  onComplete?: (name: string) => void;
}

const TextInputWithKeyboard: React.FC<Props> = ({ onComplete }) => {
  const { setProgress } = useProgressStore();

  const [inputProgress, setInputProgress] = useState(1); // 1: 이름, 2: 주민번호
  const [name, setName] = useState("");
  const [privateNumber, setPrivateNumber] = useState("");

  const handlePrivateNumberChange: React.Dispatch<React.SetStateAction<string>> = (updater) => {
    setPrivateNumber((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      const digits = next.replace(/\D/g, "").slice(0, 13);
      return digits;
    });
  };

  const formattedRrn = useMemo(() => {
    if (privateNumber.length <= 6) {
      return privateNumber;
    }
    const front = privateNumber.slice(0, 6);
    const backRaw = privateNumber.slice(6);
    const gender = backRaw.slice(0, 1);
    
    const maskCount = Math.max(0, backRaw.length - 1);
    const mask = "●".repeat(maskCount); 

    return `${front}-${gender}${mask}`;
  }, [privateNumber]);

  const isRrnValid = privateNumber.length > 0 && isValidRRN(privateNumber);

  const handleNameSubmit = () => {
    if (!name.trim()) return;
    setInputProgress(2);
  };

  const handleNextStep = async () => {
    if (!isRrnValid) return;

    try {
      if (onComplete) {
        onComplete(name);
      } else {
        setProgress(2);
      }
    } catch (error) {
      console.error("처리 중 오류 발생", error);
      alert("오류가 발생했습니다.");
    }
  };

  return (
    <PageWrapper>
      <Card>
        <Title>{inputProgress === 1 ? "이름을 입력해주세요" : "주민번호를 입력해주세요"}</Title>

        {/* --- 이름 입력 필드 --- */}
        <InputRow $focused={inputProgress === 1}>
          <InputLabel>이름</InputLabel>
          <InputDisplay>
            {name ? name : <Placeholder>이름을 입력해 주세요</Placeholder>}
          </InputDisplay>
        </InputRow>

        {/* --- 주민번호 입력 필드 (2단계일 때 표시) --- */}
        {inputProgress === 2 && (
          <div>
            <InputRow $focused={inputProgress === 2}>
              <InputLabel>주민번호</InputLabel>
              <InputDisplay>
                {/* formattedRrn 변수가 마스킹된 값을 보여줍니다 */}
                {privateNumber ? formattedRrn : <Placeholder>주민번호</Placeholder>}
              </InputDisplay>
            </InputRow>
            {privateNumber.length > 12 && !isRrnValid && (
              <Msg role="alert">
                올바른 주민등록번호가 아닙니다. (날짜/성별코드/체크섬 검증 실패)
              </Msg>
            )}
          </div>
        )}

        <KeyboardArea>
          {/* 1단계: 한글 키보드 */}
          {inputProgress === 1 && (
            <CustomKeyboard
              text={name}
              setText={setName}
              onEnter={handleNameSubmit}
            />
          )}

          {/* 2단계: 숫자 키보드 */}
          {inputProgress === 2 && (
            <>
              <NumericKeyboard
                value={privateNumber}
                setValue={handlePrivateNumberChange}
              />
              <NextButton
                type="button"
                disabled={!isRrnValid}
                onClick={handleNextStep}
              >
                다음
              </NextButton>
            </>
          )}
        </KeyboardArea>
      </Card>
    </PageWrapper>
  );
};

export default TextInputWithKeyboard;

// ---------- styled-components ----------

const PageWrapper = styled.div`
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fb;
`;

const Card = styled.div`
  width: 720px;
  max-width: 100%;
  background: #ffffff;
  border-radius: 28px;
  border: 1px solid #c4d5ff;
  box-shadow: 0 8px 24px rgba(28, 60, 138, 0.08);
  padding: 32px 32px 24px;
  box-sizing: border-box;
`;

const Title = styled.h2`
  margin: 0 0 24px;
  text-align: center;
  font-size: 24px;
  font-weight: 700;
  color: #111827;
`;

const InputRow = styled.div<{ $focused: boolean }>`
  display: flex;
  align-items: center;
  padding: 18px 20px;
  border-radius: 18px;
  border: 1px solid ${({ $focused }) => ($focused ? "#4464ff" : "#e5e7eb")};
  background: ${({ $focused }) => ($focused ? "#f3f6ff" : "#ffffff")};
  box-shadow: ${({ $focused }) =>
    $focused ? "inset 0 0 0 1px rgba(68, 100, 255, 0.1)" : "none"};
  cursor: text;
  transition: all 0.15s ease;
  margin-top: 10px;

  &:hover {
    border-color: #c7cff9;
  }
`;

const InputLabel = styled.div`
  width: 88px;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-right: 12px;
  white-space: nowrap;
`;

const InputDisplay = styled.div`
  flex: 1;
  font-size: 16px;
  color: #111827;
  min-height: 22px;
  display: flex;
  align-items: center;
  letter-spacing: 1px; /* 마스킹 문자 간격 조정을 위해 추가 */
  font-style: normal; /* 기울임체 제거 */
`;

const Placeholder = styled.span`
  color: #9ca3af;
  letter-spacing: normal;
  font-style: normal; /* 기울임체 제거 */
`;

const KeyboardArea = styled.div`
  margin-top: 24px;
`;

const Msg = styled.p`
  width: 100%;
  text-align: center;
  margin-top: 6px;
  font-size: 16px;
  color: #ef4444;
`;

const NextButton = styled.button`
  width: 100%;
  margin-top: 16px;
  padding: 12px 0;
  border-radius: 12px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  background: #4f46e5;
  color: #ffffff;
  cursor: pointer;
  transition: background 0.18s ease, opacity 0.18s ease;

  &:hover {
    background: #4338ca;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;