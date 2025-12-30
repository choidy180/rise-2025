"use client";

import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { SurveyResult, generateHealthReport } from "@/utils/survey-summary";
import { ChatMessage } from "@/utils/storage";

interface Props {
  result: SurveyResult;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  readOnly?: boolean;
}

export default function GeminiChat({ result, messages, setMessages, readOnly = false }: Props) {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const hasInitialized = useRef(false);

  // 스크롤 자동 이동 (메시지 추가 시)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // ✅ [초기 분석 로직]
  useEffect(() => {
    const initAnalysis = async () => {
      if (hasInitialized.current || messages.length > 0) return;
      if (readOnly && messages.length === 0) return;

      hasInitialized.current = true;
      setIsTyping(true);

      try {
        const reportText = generateHealthReport(result);
        
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: "내 문진 결과 요약해줘",
            history: [], 
            context: reportText,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "API Error");

        setMessages((prev) => [
          ...prev, 
          { id: "init", role: "ai", text: data.text }
        ]);
        
      } catch (error) {
        console.error("Gemini Error:", error);
        setMessages((prev) => [
          ...prev, 
          { id: "err", role: "ai", text: "분석 데이터를 불러오는 중 오류가 발생했습니다." }
        ]);
      } finally {
        setIsTyping(false);
      }
    };
    
    if (result) {
        initAnalysis();
    }
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userText = input;
    const newMsg: ChatMessage = { id: Date.now().toString(), role: "user", text: userText };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: messages.map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json();
      const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: "ai", text: data.text };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [...prev, { id: "err", role: "ai", text: "오류가 발생했습니다." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const showInputArea = !readOnly || result !== undefined;

  return (
    <ChatContainer>
      <ChatHeader>
        <HeaderIcon>✨</HeaderIcon>
        <HeaderTitle>
          <h3>AI 문진 결과 분석</h3>
          <span>CliniVoice AI Report</span>
        </HeaderTitle>
      </ChatHeader>

      <MessageList ref={scrollRef}>
        {messages.map((msg) => (
          <MessageBubble key={msg.id} $isUser={msg.role === "user"}>
            <BubbleText>{msg.text}</BubbleText>
          </MessageBubble>
        ))}
        {(isTyping || (messages.length === 0 && !readOnly)) && (
          <TypingIndicator><span>•</span><span>•</span><span>•</span></TypingIndicator>
        )}
      </MessageList>

      {showInputArea && (
        <InputArea>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSend()}
            placeholder="결과에 대해 추가로 물어보세요..."
            disabled={isTyping}
          />
          <SendButton onClick={handleSend} disabled={!input.trim() || isTyping}>
            ➤
          </SendButton>
        </InputArea>
      )}
    </ChatContainer>
  );
}

// ----------------------------------------------------------------------
// ✨ 스타일 컴포넌트 (채팅 앱 UI 최적화)
// ----------------------------------------------------------------------

const ChatContainer = styled.div`
  display: flex; 
  flex-direction: column; 
  /* 화면 높이에 맞춤 (상하단 여백 80px 제외) */
  height: calc(100vh - 120px); 
  background: white; 
  border-radius: 24px; 
  box-shadow: 0 10px 30px rgba(0,0,0,0.08); 
  border: 1px solid #e2e8f0; 
  overflow: hidden; /* 모서리 둥글게 유지 */
`;

const ChatHeader = styled.div`
  flex-shrink: 0; /* 높이 고정 */
  padding: 18px 24px; 
  border-bottom: 1px solid #f1f5f9; 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  z-index: 10;
`;

const HeaderIcon = styled.div`
  width: 42px; height: 42px; 
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); 
  border-radius: 12px; 
  display: flex; align-items: center; justify-content: center; 
  font-size: 20px; 
  box-shadow: 0 2px 5px rgba(0,0,0,0.03); 
`;

const HeaderTitle = styled.div`
  display: flex; flex-direction: column; gap: 2px;
  h3 { font-size: 16px; font-weight: 700; color: #1e293b; margin: 0; }
  span { font-size: 12px; color: #64748b; font-weight: 500; }
`;

const MessageList = styled.div`
  flex: 1; /* 남은 공간 모두 차지 */
  min-height: 0; /* Flexbox 스크롤 버그 방지 */
  padding: 20px; 
  overflow-y: auto; /* 내부 스크롤 활성화 */
  display: flex; 
  flex-direction: column; 
  gap: 16px; 
  background: #fdfdfd; 

  /* ✨ 스크롤바 커스텀 */
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { 
    background-color: #cbd5e1; 
    border-radius: 3px; 
  }
  &::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
`;

const MessageBubble = styled.div<{ $isUser: boolean }>`
  max-width: 85%; 
  padding: 14px 18px; 
  border-radius: 18px; 
  font-size: 14.5px; 
  line-height: 1.6; 
  white-space: pre-wrap; 
  word-break: break-word; 
  
  /* 사용자 vs AI 스타일 분기 */
  align-self: ${({ $isUser }) => ($isUser ? "flex-end" : "flex-start")}; 
  background: ${({ $isUser }) => ($isUser ? "#3b82f6" : "#f1f5f9")}; 
  color: ${({ $isUser }) => ($isUser ? "white" : "#334155")}; 
  
  /* 말풍선 꼬리 효과 */
  border-bottom-right-radius: ${({ $isUser }) => ($isUser ? "4px" : "18px")}; 
  border-bottom-left-radius: ${({ $isUser }) => ($isUser ? "18px" : "4px")}; 
  
  box-shadow: 0 2px 4px rgba(0,0,0,0.02); 
`;

const BubbleText = styled.div``;

const TypingIndicator = styled.div`
  display: flex; gap: 4px; padding: 12px 16px; 
  background: #f1f5f9; border-radius: 16px; 
  align-self: flex-start; 
  color: #94a3b8; font-size: 24px; line-height: 10px; 
  
  span { animation: blink 1.4s infinite both; }
  span:nth-child(2) { animation-delay: 0.2s; }
  span:nth-child(3) { animation-delay: 0.4s; }
  
  @keyframes blink { 
    0% { opacity: 0.2; transform: scale(0.8); } 
    20% { opacity: 1; transform: scale(1); } 
    100% { opacity: 0.2; transform: scale(0.8); } 
  }
`;

const InputArea = styled.div`
  flex-shrink: 0; /* 높이 고정 */
  padding: 16px 20px; 
  border-top: 1px solid #f1f5f9; 
  display: flex; gap: 10px; 
  background: white; 
`;

const Input = styled.input`
  flex: 1; 
  padding: 12px 18px; 
  border-radius: 24px; 
  border: 1px solid #e2e8f0; 
  background: #f8fafc;
  outline: none; 
  font-size: 14px; 
  color: #1e293b;
  transition: all 0.2s; 
  
  &:focus { 
    border-color: #3b82f6; 
    background: white; 
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); 
  } 
  &:disabled { 
    background: #f1f5f9; 
    color: #94a3b8;
    cursor: not-allowed; 
  } 
`;

const SendButton = styled.button`
  width: 44px; height: 44px; 
  border-radius: 50%; 
  background: #3b82f6; 
  color: white; 
  border: none; 
  font-size: 16px; 
  cursor: pointer; 
  display: flex; align-items: center; justify-content: center; 
  transition: all 0.2s; 
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);

  &:hover { background: #2563eb; transform: translateY(-1px); } 
  &:active { transform: translateY(0); }
  &:disabled { 
    background: #cbd5e1; 
    box-shadow: none;
    cursor: not-allowed; 
    transform: none;
  } 
`;