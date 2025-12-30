"use client";

import { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";
import { motion } from "framer-motion";
import FancyButton from "./fancyButton";
import { useProgressStore } from "@/store/progress-stage";
// SplitText는 서브 타이틀용으로 두거나, 필요 없으면 제거하셔도 됩니다.
import SplitText from "./split-text"; 

const IntroText = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [showStartBtn, setShowStartBtn] = useState(false);
  const { setProgress } = useProgressStore();

  const serviceName = "CliniVoice AI";
  const description = "AI가 당신의 건강 상태를 분석해드려요";

  useEffect(() => {
    if (!showIntro) return;
    const id = setTimeout(() => setShowStartBtn(true), 1200); // 버튼 등장 시간 조절
    return () => clearTimeout(id);
  }, [showIntro]);

  return (
    <Wrapper>
      <GridBackground />
      <BackgroundBlob1 />
      <BackgroundBlob2 />

      <Content>
        <GlassCard
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* 아이콘 */}
          <IconWrapper
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            📋
          </IconWrapper>

          {showIntro && (
            <TitleBox>
              {/* ✅ 수정됨: SplitText 대신 motion.h1 사용 (안정성 확보) */}
              <BrandTitle
                initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
              >
                {serviceName}
              </BrandTitle>
              
              {/* 설명 문구 */}
              <SubTitle
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.5 }}
              >
                {description}
              </SubTitle>
            </TitleBox>
          )}

          <ButtonArea>
            {showStartBtn && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <FancyButton size="lg" onClick={() => setProgress(1)}>
                  문진 시작하기
                </FancyButton>
              </motion.div>
            )}
          </ButtonArea>
        </GlassCard>
      </Content>
    </Wrapper>
  );
};

export default IntroText;

// --- Animations ---

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const blobMove = keyframes`
  0% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0, 0) scale(1); }
`;

// --- Styles ---

const Wrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  background-color: #f8fafc;
`;

const GridBackground = styled.div`
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  z-index: 1;
`;

const Content = styled.div`
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 500px;
  padding: 20px;
  display: flex;
  justify-content: center;
`;

const GlassCard = styled(motion.div)`
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 32px;
  padding: 50px 30px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const IconWrapper = styled(motion.div)`
  font-size: 56px;
  margin-bottom: 24px;
  animation: ${float} 3s ease-in-out infinite;
  filter: drop-shadow(0 8px 12px rgba(99, 102, 241, 0.2));
`;

const TitleBox = styled.div`
  margin-bottom: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

// ✅ 브랜드 타이틀 스타일 (직접 motion.h1 사용)
const BrandTitle = styled(motion.h1)`
  font-family: 'Pretendard', sans-serif;
  font-size: 2.4rem;
  font-weight: 800;
  margin: 0 0 12px 0;
  letter-spacing: -0.02em;
  line-height: 1.2;
  
  /* 그라데이션 적용 */
  background: linear-gradient(135deg, #5b50e6 0%, #3b82f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  display: inline-block;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const SubTitle = styled(motion.p)`
  font-size: 1rem;
  color: #64748b;
  font-weight: 500;
  margin: 0;
  word-break: keep-all;
  line-height: 1.5;
`;

const ButtonArea = styled.div`
  height: 56px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

// --- Background Blobs ---

const Blob = styled.div`
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.6;
  z-index: 0;
  animation: ${blobMove} 12s infinite ease-in-out;
`;

const BackgroundBlob1 = styled(Blob)`
  top: 5%;
  left: 5%;
  width: 450px;
  height: 450px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%);
`;

const BackgroundBlob2 = styled(Blob)`
  bottom: 5%;
  right: 5%;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, transparent 70%);
  animation-delay: -6s;
`;