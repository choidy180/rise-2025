"use client";
import Navigation from "@/components/navigation";
import styled from "styled-components";
import VerticalStepper from "@/components/verticalStepper";
import IntroText from "@/components/intro";
import { useProgressStore } from "@/store/progress-stage";
import TextInputWithKeyboard from "@/components/keyboard/text-input-with-keyboard";
import SimpleMicTester from "@/components/simple-mic-tester";
import VoiceChatBot from "@/components/voice-chatBot";

export default function Home() {
  const {progress, setProgress} = useProgressStore();
  return (
    <Container>
      <Navigation/>
      <StageBox>
        {progress === 0 && <IntroText/>}
        {progress === 1 && <TextInputWithKeyboard/>}
        {progress === 2 && <VerticalStepper/>}
        {/* <SimpleMicTester/>
        <VerticalStepper/> */}
        {/* <VoiceChatBot/> */}

      </StageBox>
    </Container>
  );
}

const Container = styled.div`
  width: 100%;
  height: 100vh;
  min-height: 100vh;
  background-color: #f1f5f9;
  display: flex;
  flex-direction: column;
  justify-content: start;
  align-items: center;
`

const StageBox = styled.div`
  display: flex;

  flex-direction: column;
  justify-content: center;
  align-items: center;

  width: 100%;
  height: 100%;
  padding-top: 50px;
`

export const Card = styled.div<{ shadow?: boolean }>`
  background: #fff;
  padding: 20px;
  border-radius: 12px;
  box-shadow: ${({ shadow }) =>
    shadow ? "0 8px 24px rgba(0,0,0,0.08)" : "none"};
`;
