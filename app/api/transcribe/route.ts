// import { NextRequest, NextResponse } from "next/server";

// export const runtime = "nodejs";

// export async function POST(req: NextRequest) {
//   try {
//     const formData = await req.formData();
//     const audioBlob = formData.get("audio") as File; // webm/ogg/wav 등
//     if (!audioBlob) {
//       return NextResponse.json({ error: "No audio provided" }, { status: 400 });
//     }

//     const openaiRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
//       method: "POST",
//       headers: {
//         Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
//       },
//       body: (() => {
//         const fd = new FormData();
//         // whisper-1 또는 gpt-4o-mini-transcribe(계정에 따라)
//         fd.set("model", "whisper-1");
//         fd.set("temperature", "0");
//         fd.set("response_format", "json");
//         fd.set("file", audioBlob, `recording.${audioBlob.type.split("/")[1] || "webm"}`);
//         return fd;
//       })(),
//     });

//     if (!openaiRes.ok) {
//       const err = await openaiRes.text();
//       return NextResponse.json({ error: err }, { status: 500 });
//     }

//     const json = await openaiRes.json();
//     // OpenAI Whisper 응답: { text: "..." }
//     return NextResponse.json(json);
//   } catch (e: any) {
//     return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
//   }
// }

// /app/api/transcribe/route.ts (Next 13+ 예시)
import { NextRequest } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

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
