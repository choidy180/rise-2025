"use client";

import React, { useState } from "react";
import styled, { keyframes, css } from "styled-components";

// --- Types ---
interface LinkItem {
  title: string;
  url: string;
}

interface BotResponse {
  text?: string;
  items?: string[];
  links?: LinkItem[];
}

type ScenarioType = "prevention" | "support";

interface ScenarioData {
  user: string;     // 사용자 질문 (모달 우측)
  bot: BotResponse; // 봇 답변 (모달 좌측)
  label: string;    // 버튼 제목
  desc: string;     // 버튼 설명
  icon: string;     // 버튼 아이콘
}

// --- Data (시나리오 데이터) ---
const SCENARIOS: Record<ScenarioType, ScenarioData> = {
  prevention: {
    label: "맞춤형 예방 관리",
    desc: "나에게 필요한 식습관과 운동 가이드를 확인해보세요.",
    icon: "💪",
    user: "맞춤형 예방 관리법 알려줘",
    bot: {
      items: [
        "고혈압 가족력이 있으셔서 짠 음식(국/찌개/라면 등) 섭취를 조금만 줄여보시는 걸 추천드려요.",
        "B형간염 바이러스는 보유하고 있지 않지만, 접종/면역 상태를 모르시면 항체 검사 후 필요 시 예방접종을 권장드려요.",
        "운동은 WHO 권고 수준에 잘 맞는 편이라, 현재 루틴을 꾸준히 유지하시면 좋아요."
      ]
    },
  },
  support: {
    label: "국가지원정보 추천",
    desc: "놓치고 있는 정부 지원 혜택이 있는지 확인해보세요.",
    icon: "🏛️",
    user: "내가 받을 수 있는 국가지원정보 추천해줘",
    bot: {
      text: "OOO님에게 딱 맞는 국가지원정보는 다음과 같습니다.",
      items: [
        "인플루엔자 국가예방접종 지원사업",
        "정신건강복지센터 운영",
        "암검진사업"
      ],
      links: [
        { title: "예방접종 신청하기", url: "https://nip.kdca.go.kr/" },
        { title: "복지센터 찾기", url: "https://www.ncmh.go.kr/" },
        { title: "암검진 안내", url: "https://www.nhis.or.kr/" }
      ]
    },
  },
};

// --------------------------------------------------------------------------
// [Component] ScenarioModal 
// 버튼 클릭 시 뜨는 '대화 내용' 팝업
// --------------------------------------------------------------------------
interface ScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ScenarioData | null;
}

const ScenarioModal = ({ isOpen, onClose, data }: ScenarioModalProps) => {
  if (!isOpen || !data) return null;

  const handleLinkClick = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{data.label}</ModalTitle>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </ModalHeader>
        
        <ModalBody>
          {/* 1. 사용자 질문 (오른쪽 말풍선) */}
          <BubbleWrapper $isUser={true}>
            <Bubble $isUser={true}>
              <div className="text-content">{data.user}</div>
            </Bubble>
          </BubbleWrapper>

          {/* 2. AI 답변 (왼쪽 말풍선) */}
          <BubbleWrapper $isUser={false}>
            <BubbleIcon>{data.icon}</BubbleIcon>
            <Bubble $isUser={false}>
              {data.bot.text && <div className="text-content">{data.bot.text}</div>}
              
              {data.bot.items && data.bot.items.length > 0 && (
                <ListContainer>
                  {data.bot.items.map((item, idx) => (
                    <ListItem key={idx}>
                      <span className="bullet">•</span>
                      <span className="content">{item}</span>
                    </ListItem>
                  ))}
                </ListContainer>
              )}

              {data.bot.links && data.bot.links.length > 0 && (
                <LinkButtonContainer>
                  {data.bot.links.map((link, idx) => (
                    <LinkButton key={idx} onClick={() => handleLinkClick(link.url)}>
                      {link.title} →
                    </LinkButton>
                  ))}
                </LinkButtonContainer>
              )}
            </Bubble>
          </BubbleWrapper>
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
};

// --------------------------------------------------------------------------
// [Main Page] Simple Scenario Launcher
// --------------------------------------------------------------------------
export default function SimpleScenarioPage() {
  const [activeScenario, setActiveScenario] = useState<ScenarioData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = (type: ScenarioType) => {
    setActiveScenario(SCENARIOS[type]);
    setIsModalOpen(true);
  };

  return (
    <PageContainer>
      <ButtonGrid>
        {/* 버튼 1: 예방 관리 */}
        <ScenarioCard onClick={() => handleOpenModal("prevention")}>
          <IconWrapper>💊</IconWrapper>
          <CardText>
            <h3>{SCENARIOS.prevention.label}</h3>
          </CardText>
        </ScenarioCard>

        {/* 버튼 2: 지원 정보 */}
        <ScenarioCard onClick={() => handleOpenModal("support")}>
          <IconWrapper>📢</IconWrapper>
          <CardText>
            <h3>{SCENARIOS.support.label}</h3>
          </CardText>
        </ScenarioCard>
      </ButtonGrid>

      {/* 모달 컴포넌트 */}
      <ScenarioModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        data={activeScenario} 
      />
    </PageContainer>
  );
}

// --------------------------------------------------------------------------
// Styles
// --------------------------------------------------------------------------

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const ButtonGrid = styled.div`
  display: flex;
  gap: 14px;
  width: 100%;
`;

const ScenarioCard = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 6px rgba(0,0,0,0.02);
  text-align: left;

  &:hover {
    /* transform: translateY(-4px); */
    box-shadow: 0 12px 20px rgba(0,0,0,0.08);
    border-color: #3b82f6;
  }
`;

const IconWrapper = styled.div`
  width: 40px;
  height: 40px;
  background: #eff6ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
`;

const CardText = styled.div`
  h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #1e293b;
  }
  p {
    margin: 0;
    font-size: 0.9rem;
    color: #64748b;
    line-height: 1.4;
  }
`;

// --- Modal & Bubble Styles ---

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const slideUp = keyframes`
  from { transform: translateY(40px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: ${fadeIn} 0.2s ease-out;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: #fff;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  border-radius: 24px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${slideUp} 0.3s cubic-bezier(0.16, 1, 0.3, 1);
`;

const ModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
`;

const ModalTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
`;

const CloseButton = styled.button`
  background: #f1f5f9;
  border: none;
  width: 32px; height: 32px;
  border-radius: 50%;
  font-size: 1rem;
  color: #64748b;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: 0.2s;
  &:hover { background: #e2e8f0; color: #1e293b; }
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const BubbleWrapper = styled.div<{ $isUser: boolean }>`
  display: flex;
  gap: 12px;
  justify-content: ${({ $isUser }) => ($isUser ? "flex-end" : "flex-start")};
  align-items: flex-end;
`;

const BubbleIcon = styled.div`
  width: 36px; height: 36px;
  background: white; border: 1px solid #e2e8f0;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
`;

const Bubble = styled.div<{ $isUser: boolean }>`
  max-width: 80%;
  padding: 16px 20px;
  border-radius: 20px;
  font-size: 0.95rem;
  line-height: 1.6;
  box-shadow: 0 2px 4px rgba(0,0,0,0.03);
  word-break: break-word;
  
  ${({ $isUser }) =>
    $isUser
      ? css`
          background-color: #3b82f6;
          color: white;
          border-bottom-right-radius: 4px;
        `
      : css`
          background-color: white; 
          color: #334155;
          border: 1px solid #e2e8f0;
          border-bottom-left-radius: 4px;
        `}
    
  .text-content {
    margin-bottom: 10px;
    font-weight: 500;
  }
  .text-content:last-child { margin-bottom: 0; }
`;

const ListContainer = styled.ul`
  margin: 8px 0 0 0; padding: 0; list-style: none;
  display: flex; flex-direction: column; gap: 8px; 
`;

const ListItem = styled.li`
  display: flex; align-items: flex-start;
  font-size: 0.95rem; color: #475569;
  .bullet { margin-right: 8px; color: #94a3b8; }
  .content { flex: 1; }
`;

const LinkButtonContainer = styled.div`
  display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #f1f5f9;
`;

const LinkButton = styled.button`
  background: #f8fafc; border: 1px solid #cbd5e1;
  padding: 8px 14px; border-radius: 20px;
  font-size: 0.85rem; font-weight: 600; color: #2563eb;
  cursor: pointer; transition: 0.2s;
  &:hover { background: #eff6ff; border-color: #3b82f6; }
`;