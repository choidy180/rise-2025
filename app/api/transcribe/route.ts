// /app/api/transcribe/route.ts (Next 13+ 예시)
import { NextRequest } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("audio") as File | null;
  if (!file) {
    return new Response(JSON.stringify({ error: "no audio" }), { status: 400 });
  }

  const transcript = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "ko",
  });

  return Response.json({ text: transcript.text });
}
