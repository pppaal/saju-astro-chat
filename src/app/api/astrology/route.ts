import { NextRequest, NextResponse } from "next/server";
import { generatePromptForGemini, NatalChartInput } from "@/lib/astrology/astrology";
import { callGeminiText } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as NatalChartInput;
    const required = ["year","month","date","hour","minute","latitude","longitude"] as const;
    for (const k of required) if ((body as any)[k] == null) return NextResponse.json({ error: `필드 누락: ${k}` }, { status: 400 });
    const prompt = generatePromptForGemini(body);
    const { text, model } = await callGeminiText(prompt, 1024);
    return NextResponse.json({ interpretation: text, model });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}