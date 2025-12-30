// app/api/debug/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const apiKey = 'AIzaSyBe1YRvHky1oHzLfloAqlu5XSwaMBqafGU';

  if (!apiKey) {
    return NextResponse.json({ error: "API Key Missing" }, { status: 500 });
  }

  try {
    // SDK 대신 직접 REST API로 모델 리스트 조회
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    
    const data = await response.json();

    return NextResponse.json({ 
      models: data.models?.map((m: any) => m.name) || "No models found",
      raw: data 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}