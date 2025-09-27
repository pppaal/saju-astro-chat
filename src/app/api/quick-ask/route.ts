import { NextResponse } from "next/server";
import { callGeminiText } from "@/lib/gemini";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Invalid prompt" }, { status: 400 });
    }
    const { text, model } = await callGeminiText(prompt, 1024);
    return NextResponse.json({ text, model });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}