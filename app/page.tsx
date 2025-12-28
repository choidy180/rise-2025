"use client";
import React, { useState } from "react";
import Navigation from "@/components/navigation";
import styled from "styled-components";
import VerticalStepper, { SurveyResult } from "@/components/verticalStepper";
import IntroText from "@/components/intro";
import { useProgressStore } from "@/store/progress-stage";
import TextInputWithKeyboard from "@/components/keyboard/text-input-with-keyboard";
import { generateHealthReport } from "@/utils/survey-summary"; 
import ResultPage from "@/components/result-page"; 
import VoiceChatBot from "@/components/voice-chatBot";

export default function Home() {
  const { progress, setProgress } = useProgressStore();
  const [surveyResult, setSurveyResult] = useState<SurveyResult | null>(null);

  // ✅ 사용자 이름 상태 추가
  const [userName, setUserName] = useState("사용자");

  // 예: TextInput 컴포넌트에서 완료 시 이름을 받아오는 핸들러 (구조에 따라 맞춰주세요)
  const handleNameSubmit = (name: string) => {
      setUserName(name); // 이름 저장
      setProgress(2);    // 다음 단계(문진)로 이동
  };

  const handleSurveyFinish = (result: SurveyResult) => {
    const reportText = generateHealthReport(result);
    console.log(reportText);
    setSurveyResult(result);
    setProgress(3);
  };

  const handleRestart = () => {
    setSurveyResult(null);
    setProgress(0);
  };

  return (
    <Container>
      <Navigation />
      <StageBox>
        {progress === 0 && <IntroText />}
        {progress === 1 && (
            <TextInputWithKeyboard 
                onComplete={handleNameSubmit} // 이 부분은 TextInputWithKeyboard 구현에 맞춰 수정 필요
            />
            // <VoiceChatBot/>
        )}
        
        {progress === 2 && (
          <VerticalStepper 
            total={33} 
            onFinish={handleSurveyFinish} 
          />
        )}

        {progress === 3 && surveyResult && (
          <ResultPage 
            result={surveyResult} 
            onRestart={handleRestart}
            // ✅ ResultPage가 있다면 여기에도 userName을 넘겨줘야 합니다
            // (ResultPage 컴포넌트도 userName prop을 받도록 수정 필요)
            userName={userName} 
          />
        )}
      </StageBox>
    </Container>
  );
}

// ✅ 스타일 수정: 화면 전체 스크롤을 막고 100vh로 고정
const Container = styled.div`
  width: 100%;
  height: 100vh; /* min-height 대신 height 고정 */
  overflow: hidden; /* 화면 전체 스크롤 방지 */
  background-color: #f1f5f9;
  display: flex;
  flex-direction: column;
  justify-content: start;
  align-items: center;
`;

const StageBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  /* justify-content: center; <-- 제거 (내부 스크롤을 위해 상단 정렬 권장) */

  width: 100%;
  height: 100%; /* 부모 높이 가득 채움 */
  padding-top: 60px; /* 네비게이션 높이만큼 패딩 (Navigation 높이에 맞춰 조절하세요) */
  box-sizing: border-box;
`;

export const Card = styled.div<{ shadow?: boolean }>`
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: ${({ shadow }) =>
    shadow ? "0 8px 24px rgba(0,0,0,0.08)" : "none"};
`;