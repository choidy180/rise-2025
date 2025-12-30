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

    // ✅ 기존 설정 유지: gemini-flash-latest 사용
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // 1. 히스토리 변환
    const chatHistory = Array.isArray(history) ? history.map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    })) : [];

    // 2. 에러 방지: 첫 메시지가 model이면 user 메시지 강제 주입 (채팅 모드일 때만 유효)
    if (chatHistory.length > 0 && chatHistory[0].role === "model") {
      chatHistory.unshift({
        role: "user",
        parts: [{ text: `사용자(${userName || '사용자'})의 문진표 결과를 분석해서 먼저 인사해줘.` }]
      });
    }

    const chat = model.startChat({ history: chatHistory });

    let finalPrompt = message;

    // ✅ [수정된 부분] 
    // 요청 메시지에 "의사가 빠르게 파악" 이라는 키워드가 있으면 -> [의사 요약 모드]로 동작
    // 그 외에는 -> 기존 [CliniVoice 채팅 모드]로 동작
    const isDoctorSummaryRequest = message.includes("의사가 빠르게 파악");

    if (isDoctorSummaryRequest && context) {
      // 🏥 Case A: 의사 요약 모드 (인사말 생략, 딱딱한 말투)
      finalPrompt = `
      [시스템 역할]
      당신은 의료 데이터를 분석하여 의료진에게 전달하는 AI 어시스턴트입니다.
      
      [지시사항]
      1. 아래 [건강 문진표 결과]를 바탕으로 의사가 환자 상태를 3초 만에 파악할 수 있도록 3줄로 핵심만 요약하세요.
      2. 사용자와 대화하지 말고, 분석 결과만 출력하세요.
      3. 말투는 반드시 '~함', '~있음', '~없음' 형태의 개조식(건조한체)을 사용하세요. (존댓말 금지)
      
      [건강 문진표 결과]
      ${context}
      `;
    } else if (context) {
      // 🗣️ Case B: 기존 환자 상담 모드 (CliniVoice 페르소나 적용)
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

    console.log(`🚀 Sending request to Gemini (${isDoctorSummaryRequest ? 'Doctor Summary' : 'Chat Mode'})...`);
    
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