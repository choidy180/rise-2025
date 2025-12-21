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
  
  // ✅ [수정 핵심 1] 중복 실행 방지를 위한 Ref 추가
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // ✅ [수정 핵심 2] 초기 자동 분석 로직 강화
  useEffect(() => {
    const initAnalysis = async () => {
      // 1. 이미 실행했거나, 읽기 전용이거나, 이미 메시지가 있으면 중단
      if (hasInitialized.current || readOnly || messages.length > 0) return;

      // 실행 플래그를 true로 설정 (중복 실행 방지)
      hasInitialized.current = true;
      
      console.log("🚀 Gemini 자동 분석 시작..."); // 디버깅용 로그
      setIsTyping(true);

      try {
        // 리포트 생성 (데이터가 제대로 넘어왔는지 확인)
        const reportText = generateHealthReport(result);
        console.log("생성된 리포트 길이:", reportText.length);

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

        // 성공 시 메시지 추가
        setMessages((prev) => [
          ...prev, 
          { id: "init", role: "ai", text: data.text }
        ]);
        
      } catch (error) {
        console.error("Gemini Error:", error);
        setMessages((prev) => [
          ...prev, 
          { id: "err", role: "ai", text: "죄송합니다. 분석 데이터를 불러오는 중 오류가 발생했습니다." }
        ]);
      } finally {
        setIsTyping(false);
      }
    };
    
    // 컴포넌트가 마운트되고 result가 있을 때 실행
    if (result) {
        initAnalysis();
    }
    
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // ✅ 의존성 배열을 비워서 마운트 시 딱 한 번만 실행되게 함

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userText = input;
    const newMsg: ChatMessage = { id: Date.now().toString(), role: "user", text: userText };
    setMessages((prev) => [...prev, newMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // 사용자 질문 시에는 context(리포트 전문)를 다시 보낼 필요가 없는 경우가 많음 (토큰 절약)
      // 하지만 문맥 유지가 필요하다면 history를 잘 활용해야 함
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: messages.map((m) => ({ role: m.role, text: m.text })),
          // 필요하다면 여기에도 context를 넣을 수 있음
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

  return (
    <ChatContainer>
      <ChatHeader>
        <HeaderIcon>📊</HeaderIcon>
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
        {/* 로딩 인디케이터: 메시지가 없거나 타이핑 중일 때 표시 */}
        {(isTyping || (messages.length === 0 && !readOnly)) && (
          <TypingIndicator><span>•</span><span>•</span><span>•</span></TypingIndicator>
        )}
      </MessageList>

      {!readOnly && (
        <InputArea>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && handleSend()}
            placeholder="추가로 궁금한 점을 물어보세요..."
            disabled={isTyping}
          />
          <SendButton onClick={handleSend} disabled={!input.trim() || isTyping}>➤</SendButton>
        </InputArea>
      )}
    </ChatContainer>
  );
}

// ... 스타일 컴포넌트들은 그대로 유지 ...
const ChatContainer = styled.div` display: flex; flex-direction: column; height: 100%; background: white; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; overflow: hidden; `;
const ChatHeader = styled.div` padding: 20px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 12px; background: #f8fafc; `;
const HeaderIcon = styled.div` width: 40px; height: 40px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); `;
const HeaderTitle = styled.div` h3 { font-size: 16px; font-weight: 700; color: #1e293b; margin: 0; } span { font-size: 12px; color: #64748b; } `;
const MessageList = styled.div` flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; background: #fff; &::-webkit-scrollbar { width: 6px; } &::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 3px; } `;
const MessageBubble = styled.div<{ $isUser: boolean }>` max-width: 85%; padding: 12px 16px; border-radius: 16px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; align-self: ${({ $isUser }) => ($isUser ? "flex-end" : "flex-start")}; background: ${({ $isUser }) => ($isUser ? "#3b82f6" : "#f8fafc")}; color: ${({ $isUser }) => ($isUser ? "white" : "#334155")}; border-bottom-right-radius: ${({ $isUser }) => ($isUser ? "4px" : "16px")}; border-bottom-left-radius: ${({ $isUser }) => ($isUser ? "16px" : "4px")}; border: ${({ $isUser }) => ($isUser ? "none" : "1px solid #e2e8f0")}; box-shadow: 0 2px 5px rgba(0,0,0,0.02); `;
const BubbleText = styled.div``;
const TypingIndicator = styled.div` display: flex; gap: 4px; padding: 12px 16px; background: #f1f5f9; border-radius: 16px; align-self: flex-start; color: #94a3b8; font-size: 20px; line-height: 10px; span { animation: blink 1.4s infinite both; } span:nth-child(2) { animation-delay: 0.2s; } span:nth-child(3) { animation-delay: 0.4s; } @keyframes blink { 0% { opacity: 0.2; } 20% { opacity: 1; } 100% { opacity: 0.2; } } `;
const InputArea = styled.div` padding: 16px; border-top: 1px solid #f1f5f9; display: flex; gap: 10px; background: white; `;
const Input = styled.input` flex: 1; padding: 12px 16px; border-radius: 24px; border: 1px solid #e2e8f0; outline: none; font-size: 14px; transition: border-color 0.2s; &:focus { border-color: #3b82f6; } &:disabled { background: #f1f5f9; cursor: not-allowed; } `;
const SendButton = styled.button` width: 44px; height: 44px; border-radius: 50%; background: #3b82f6; color: white; border: none; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background 0.2s; &:hover { background: #2563eb; } &:disabled { background: #cbd5e1; cursor: not-allowed; } `;