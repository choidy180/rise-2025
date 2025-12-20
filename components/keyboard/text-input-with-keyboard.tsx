import React, { useState } from "react";
import styled from "styled-components";
import CustomKeyboard from "../customKeyboard";
import "react-simple-keyboard/build/css/index.css";
import NumericKeyboard from "./number-input-with-keyboard";
import { isValidRRN } from "@/lib/rrn";
import { useProgressStore } from "@/store/progress-stage";

const TextInputWithKeyboard: React.FC = () => {
  // Store에서 데이터 저장 액션을 가져옵니다 (가정: setUserName, setUserRrn 등)
  // 만약 Store에 이 기능이 없다면 아래 2번 항목을 참고하여 추가해주세요.
  const { setProgress } = useProgressStore(); 

  const [inputProgress, setInputProgress] = useState(1);
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

  // [수정됨] 다음 버튼 클릭 핸들러
  const handleNextStep = async () => {
    if (!isRrnValid) return;

    try {
      // 1. Store에 데이터 저장 (다음 페이지에서 쓰기 위함)
      // setSubmitData({ name, rrn: privateNumber }); 
      // 또는
      // setUserName(name);
      // setUserRrn(privateNumber);

      // 2. (필요하다면) 여기서 API 호출
      // console.log("데이터 전송:", name, privateNumber);
      // await submitUserInfo({ name, rrn: privateNumber });

      // 3. 모든 처리가 끝나면 다음 단계로 이동
      setProgress(2);
      
    } catch (error) {
      console.error("처리 중 오류 발생", error);
      alert("오류가 발생했습니다.");
    }
  };

  return (
    <PageWrapper>
      <Card>
        <Title>{inputProgress === 1 ? "이름을 입력해주세요" : "주민번호를 입력해주세요"}</Title>

        <InputRow $focused={inputProgress === 1}>
          <InputLabel>이름</InputLabel>
          <InputDisplay>
            {name ? name : <Placeholder>이름을 입력해 주세요</Placeholder>}
          </InputDisplay>
        </InputRow>

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
          {inputProgress === 1 && (
            <CustomKeyboard
              text={name}
              setText={setName}
              onEnter={() => setInputProgress(2)}
            />
          )}

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
