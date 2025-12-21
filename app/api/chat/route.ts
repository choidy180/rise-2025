// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
  try {
    const { message, history, context, userName } = await req.json();
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "API Key not found" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // ✅ [핵심 수정] 
    // 1.5-flash (404 에러) -> gemini-flash-latest (디버그 리스트에 존재함, 사용량 넉넉함)
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // 1. 히스토리 변환
    const chatHistory = Array.isArray(history) ? history.map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    })) : [];

    // 2. 에러 방지: 첫 메시지가 model이면 user 메시지 강제 주입
    if (chatHistory.length > 0 && chatHistory[0].role === "model") {
      chatHistory.unshift({
        role: "user",
        parts: [{ text: `사용자(${userName || '사용자'})의 문진표 결과를 분석해서 먼저 인사해줘.` }]
      });
    }

    const chat = model.startChat({ history: chatHistory });

    let finalPrompt = message;
    
    // 3. 페르소나 설정
    if (context) {
      finalPrompt = `
      [시스템 역할 설정]
      당신은 'CliniVoice' AI 건강 분석가입니다.
      사용자의 이름은 '${userName || "사용자"}'입니다.
      
      [지시사항]
      1. 사용자의 이름('${userName || "사용자"}님')을 자연스럽게 불러주세요.
      2. 전문적인 태도로 정중한 존댓말을 사용하세요. (노인 전문 말투 X, 일반 성인 대상)
      3. 아래 [건강 문진표 결과]를 바탕으로 핵심적인 피드백을 제공하세요.
      
      [건강 문진표 결과]
      ${context}

      사용자 질문: ${message}
      `;
    }

    console.log("🚀 Sending request to Gemini (gemini-flash-latest)...");
    
    const result = await chat.sendMessage(finalPrompt);
    const response = await result.response;
    const text = response.text();
    
    console.log("✅ Response received");

    return NextResponse.json({ text });

  } catch (error: any) {
    console.error("🔥 Gemini API Error:", error);
    
    // 사용량 초과 에러 처리
    if (error.message?.includes("429")) {
        return NextResponse.json({ text: "죄송합니다. 현재 AI 사용량이 많아 잠시 후 다시 시도해 주세요." });
    }

    return NextResponse.json(
      { error: error.message, details: error.toString() },
      { status: 500 }
    );
  }
}