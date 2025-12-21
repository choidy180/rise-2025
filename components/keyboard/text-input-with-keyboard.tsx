"use client";

import React, { useState } from "react";
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

  const formattedRrn =
    privateNumber.length <= 6
      ? privateNumber
      : `${privateNumber.slice(0, 6)}-${privateNumber.slice(6)}`;

  const isRrnValid = privateNumber.length > 0 && isValidRRN(privateNumber);

  // ✅ [수정됨] 이름 입력 완료 핸들러
  // 여기서 onComplete를 호출하면 부모가 페이지를 바꿔버리므로, 호출하지 않습니다!
  const handleNameSubmit = () => {
    if (!name.trim()) return;

    // 내부 상태만 2단계(주민번호)로 변경 -> 화면이 리렌더링되며 주민번호 창이 뜸
    setInputProgress(2);
  };

  // ✅ [수정됨] 주민번호까지 입력 후 '다음' 버튼 핸들러
  // 여기서 비로소 부모에게 알립니다.
  const handleNextStep = async () => {
    if (!isRrnValid) return;

    try {
      // 1. 이름 저장 및 페이지 전환 요청 (부모에게 전달)
      if (onComplete) {
        onComplete(name); 
        // 주의: 부모의 onComplete에서 setProgress(2)를 한다면 
        // 아래의 setProgress(2)는 중복일 수 있으나, 안전을 위해 둡니다.
      } else {
        // onComplete가 없을 경우를 대비한 강제 이동
        setProgress(2);
      }
      
      // (필요하다면 여기에 주민번호 저장 로직 추가)
      // 예: useProgressStore.setState({ userRrn: privateNumber }) 등
      
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
        {/* inputProgress가 2일 때 이 부분이 확실히 렌더링됩니다 */}
        {inputProgress === 2 && (
          <div>
            <InputRow $focused={inputProgress === 2}>
              <InputLabel>주민번호</InputLabel>
              <InputDisplay>
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
              onEnter={handleNameSubmit} // 엔터 -> 2단계로 이동
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
                onClick={handleNextStep} // 클릭 -> 부모 페이지 전환
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
`;

const Placeholder = styled.span`
  color: #9ca3af;
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