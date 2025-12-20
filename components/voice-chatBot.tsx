"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import styled, { keyframes, css } from "styled-components";

// --- Types ---
interface LinkItem {
  title: string;
  url: string;
}

// 봇 응답 데이터의 구조를 정의 (optional 속성 활용)
interface BotResponse {
  text?: string;        // 없을 수도 있음 (?)
  items?: string[];     // 목록
  links?: LinkItem[];   // 없을 수도 있음 (?)
}

interface Message {
  id: number;
  sender: "user" | "bot";
  text?: string;
  items?: string[];
  links?: LinkItem[];
}

type ScenarioType = "prevention" | "support";

// 시나리오 전체 구조 정의
interface ScenarioData {
  user: string;
  bot: BotResponse; // 위에서 정의한 유연한 구조 사용
  label: string;
  desc: string;
}

// --- Data ---
// Record<ScenarioType, ScenarioData>를 통해 타입 강제
const SCENARIOS: Record<ScenarioType, ScenarioData> = {
  prevention: {
    user: "맞춤형 예방 관리",
    bot: {
      // text, links가 없어도 BotResponse 타입 덕분에 에러 안 남
      items: [
        "고혈압 가족력이 있으셔서 짠 음식(국/찌개/라면 등) 섭취를 조금만 줄여보시는 걸 추천드려요.",
        "B형간염 바이러스는 보유하고 있지 않지만, 접종/면역 상태를 모르시면 항체 검사 후 필요 시 예방접종을 권장드려요.",
        "운동은 WHO 권고 수준에 잘 맞는 편이라, 현재 루틴을 꾸준히 유지하시면 좋아요."
      ]
    },
    label: "💊 맞춤형 예방 관리",
    desc: "식습관/운동 추천",
  },
  support: {
    user: "국가지원정보 추천",
    bot: {
      text: "OOO님에게 맞는 국가지원정보는 다음과 같습니다",
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
    label: "📢 국가지원정보 추천",
    desc: "정부 지원 혜택",
  },
};

// --- Component ---
export default function VoiceChatBot() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: SCENARIOS.prevention.user, sender: "user" },
    { 
      id: 2, 
      sender: "bot", 
      items: SCENARIOS.prevention.bot.items 
    },
  ]);

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, transcript]);

  // 시나리오 변경 핸들러
  const handleScenarioChange = (type: ScenarioType) => {
    const data = SCENARIOS[type];
    
    setMessages([
      { id: Date.now(), text: data.user, sender: "user" },
      { 
        id: Date.now() + 1, 
        sender: "bot",
        text: data.bot.text,   // 이제 에러 없이 undefined 할당 가능
        items: data.bot.items,
        links: data.bot.links  // 이제 에러 없이 undefined 할당 가능
      }
    ]);
  };

  const handleSendMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    const newMessage: Message = {
      id: Date.now(),
      text: text,
      sender: "user",
    };

    setMessages((prev) => [...prev, newMessage]);
    setTranscript("");
    
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, text: "말씀하신 내용을 확인했습니다: " + text, sender: "bot" },
      ]);
    }, 1000);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = "ko-KR";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            handleSendMessage(transcriptPart);
          } else {
            interimTranscript += transcriptPart;
          }
        }
        setTranscript(interimTranscript);
      };

      recognition.onerror = (event: any) => {
        if (event.error === "aborted") {
          setIsListening(false);
          return;
        }
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    };
  }, [handleSendMessage]);

  const toggleListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      try {
        recognition.start();
        setIsListening(true);
      } catch (error) {
        console.error("Recognition start failed:", error);
      }
    }
  };

  const handleLinkClick = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <Container>
      <SideMenu>
        <MenuTitle>추천 질문</MenuTitle>
        <MenuButton onClick={() => handleScenarioChange("prevention")}>
          <div className="label">{SCENARIOS.prevention.label}</div>
          <div className="desc">{SCENARIOS.prevention.desc}</div>
        </MenuButton>
        <MenuButton onClick={() => handleScenarioChange("support")}>
          <div className="label">{SCENARIOS.support.label}</div>
          <div className="desc">{SCENARIOS.support.desc}</div>
        </MenuButton>
      </SideMenu>

      <ChatArea>
        {messages.map((msg) => (
          <BubbleWrapper key={msg.id} $isUser={msg.sender === "user"}>
            <Bubble $isUser={msg.sender === "user"}>
              {msg.text && <div className="text-content">{msg.text}</div>}
              
              {msg.items && msg.items.length > 0 && (
                <ListContainer>
                  {msg.items.map((item, idx) => (
                    <ListItem key={idx}>
                      <span className="bullet">•</span>
                      <span className="content">{item}</span>
                    </ListItem>
                  ))}
                </ListContainer>
              )}

              {msg.links && msg.links.length > 0 && (
                <LinkButtonContainer>
                  {msg.links.map((link, idx) => (
                    <LinkButton key={idx} onClick={() => handleLinkClick(link.url)}>
                      {link.title}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </LinkButton>
                  ))}
                </LinkButtonContainer>
              )}
            </Bubble>
          </BubbleWrapper>
        ))}
        
        {isListening && transcript && (
          <BubbleWrapper $isUser={true}>
            <Bubble $isUser={true} style={{ opacity: 0.7 }}>
              {transcript}...
            </Bubble>
          </BubbleWrapper>
        )}
        <div ref={messagesEndRef} />
      </ChatArea>

      <ControlArea>
        <MicButtonWrapper>
          {isListening && <PulseRing />}
          <MicButton onClick={toggleListening} $active={isListening}>
            {isListening ? (
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="6" width="12" height="12" rx="2" fill="white"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 14C14.21 14 16 12.21 16 10V5C16 2.79 14.21 1 12 1C9.79 1 8 2.79 8 5V10C8 12.21 9.79 14 12 14ZM11 5C11 4.45 11.45 4 12 4C12.55 4 13 4.45 13 5V10C13 10.55 12.55 11 12 11C11.45 11 11 10.55 11 10V5Z" fill="white"/>
                <path d="M17 11C16.45 11 16 11.45 16 12C16 14.21 14.21 16 12 16C9.79 16 8 14.21 8 12C8 11.45 7.55 11 7 11C6.45 11 6 11.45 6 12C6 14.97 8.16 17.43 11 17.92V21H9C8.45 21 8 21.45 8 22C8 22.55 8.45 23 9 23H15C15.55 23 16 22.55 16 22C16 21.45 15.55 21 15 21H13V17.92C15.84 17.43 18 14.97 18 12C18 11.45 17.55 11 17 11Z" fill="white"/>
              </svg>
            )}
          </MicButton>
          <StatusText>{isListening ? "듣고 있어요..." : "터치하여 말하기"}</StatusText>
        </MicButtonWrapper>
      </ControlArea>
    </Container>
  );
}

// --- Styles ---

const Container = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 740px;
  height: 100vh;
  margin: 0 auto;
  background-color: #ffffff;
  position: relative;
  box-shadow: 0 0 20px rgba(0,0,0,0.05);
`;

const SideMenu = styled.div`
  position: absolute;
  top: 100px;
  left: 100%;
  margin-left: 20px;
  width: 200px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 10;

  @media (max-width: 1200px) {
    position: absolute;
    top: 20px;
    left: auto;
    right: 20px;
    margin-left: 0;
    width: auto;
    flex-direction: row;

    .desc { display: none; }
    .label { font-size: 0.8rem; }
  }
`;

const MenuTitle = styled.div`
  font-size: 0.85rem;
  font-weight: 700;
  color: #888;
  margin-bottom: 4px;
  padding-left: 4px;

  @media (max-width: 1200px) {
    display: none;
  }
`;

const MenuButton = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  transition: all 0.2s ease;
  text-align: left;
  white-space: nowrap; 

  .label {
    font-size: 0.95rem;
    font-weight: 600;
    color: #333;
  }
  
  .desc {
    font-size: 0.8rem;
    color: #888;
    line-height: 1.4;
  }

  &:hover {
    border-color: #4285f4;
    background: #f8fbff;
    transform: translateX(4px);
    box-shadow: 0 4px 12px rgba(66, 133, 244, 0.15);
    .label { color: #4285f4; }
  }

  @media (max-width: 1200px) {
    padding: 8px 14px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(4px);
    
    &:hover {
      transform: translateY(-2px);
    }
  }
`;

const ChatArea = styled.div`
  flex: 1;
  padding: 20px;
  padding-top: 40px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
  
  &::-webkit-scrollbar {
    display: none;
  }
  -ms-overflow-style: none;
  scrollbar-width: none;
`;

const BubbleWrapper = styled.div<{ $isUser: boolean }>`
  display: flex;
  justify-content: ${({ $isUser }) => ($isUser ? "flex-end" : "flex-start")};
`;

const Bubble = styled.div<{ $isUser: boolean }>`
  max-width: 70%;
  padding: 16px 20px;
  border-radius: 20px;
  font-size: 1rem;
  line-height: 1.6;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  word-break: break-word;
  
  ${({ $isUser }) =>
    $isUser
      ? css`
          background-color: #4285f4;
          color: white;
          border-top-right-radius: 4px;
        `
      : css`
          background-color: #f8f9fa; 
          color: #37352f;
          border: 1px solid #edf0f2;
          border-top-left-radius: 4px;
        `}
    
  .text-content {
    margin-bottom: 12px;
    font-weight: 500;
  }
`;

const ListContainer = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px; 
`;

const ListItem = styled.li`
  display: flex;
  align-items: flex-start;
  font-size: 0.95rem;
  color: #444;
  line-height: 1.6;

  .bullet {
    margin-right: 8px;
    color: #999;
    font-size: 1.2rem;
    line-height: 1.4;
  }

  .content {
    flex: 1;
  }
`;

const LinkButtonContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(0,0,0,0.06);
`;

const LinkButton = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  border: 1px solid #d0d7de;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #0969da;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);

  &:hover {
    background-color: #f6f8fa;
    border-color: #0969da;
    transform: translateY(-1px);
  }

  svg {
    opacity: 0.7;
  }
`;

const ControlArea = styled.div`
  padding: 30px 20px;
  background: white;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 30%);
`;

const MicButtonWrapper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
`;

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.6); opacity: 0; }
`;

const PulseRing = styled.div`
  position: absolute;
  top: 0; left: 0; right: 0;
  width: 64px; height: 64px;
  margin: 0 auto;
  border-radius: 50%;
  background-color: #ff5252;
  animation: ${pulse} 1.5s infinite;
  z-index: 0;
`;

const MicButton = styled.button<{ $active: boolean }>`
  width: 64px; height: 64px;
  border-radius: 50%;
  border: none;
  background: ${({ $active }) => ($active ? "#ff5252" : "#4285f4")};
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  transition: all 0.3s ease;
  z-index: 1;

  &:hover {
    transform: scale(1.05);
    background: ${({ $active }) => ($active ? "#ff1744" : "#3367d6")};
  }
  svg { width: 28px; height: 28px; }
`;

const StatusText = styled.span`
  font-size: 0.9rem;
  color: #666;
  font-weight: 500;
`;