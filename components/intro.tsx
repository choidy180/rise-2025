"use client";

import { useEffect, useState } from "react";
import SplitText from "./split-text";
import StepTTS from "./stepTTS";
import AnimatedContent from "./animated-content";
import FancyButton from "./fancyButton";
import { useProgressStore } from "@/store/progress-stage";

const handleAnimationComplete = () => {
  console.log("All letters have animated!");
};

const IntroText = () => {
  const [showIntro, setShowIntro] = useState(true);
  const intro = "지금부터 건강 문진을 시작하겠습니다. 편안하게 말씀해 주세요.";
  const [showStartBtn, setShowStartBtn] = useState(false);

  const { setProgress } = useProgressStore();
  useEffect(() => {
    if (!showIntro) return;
    const id = setTimeout(() => setShowStartBtn(true), 2000);
    return () => clearTimeout(id);
  }, [showIntro]);

  return (
    <>
      {showIntro && (
        <SplitText
          text={intro}
          className="intro-text"
          delay={100}
          duration={0.5}
          ease="power3.out"
          splitType="chars"
          from={{ opacity: 0, y: 40 }}
          to={{ opacity: 1, y: 0 }}
          threshold={0.1}
          rootMargin="-100px"
          textAlign="center"
          onLetterAnimationComplete={handleAnimationComplete}
          lineHeight={1.4}
        />
      )}
      <div style={{height: "70px", marginTop: "10px"}}>
        {
          showStartBtn && (
            <AnimatedContent>
              <FancyButton size="lg" onClick={() => setProgress(1)}>
                시작하기
              </FancyButton>
            </AnimatedContent>
          )
        }
      </div>
    </>
  );
};

export default IntroText;
