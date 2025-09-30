import { NextResponse } from 'next/server';
import { generatePromptForGemini, NatalChartInput } from '@/lib/astrology';
import { callGeminiText } from '@/lib/gemini'; // 사용 중인 함수 경로에 맞게 조정

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NatalChartInput;

    // 필수 필드 검증
    const required = ['year', 'month', 'date', 'hour', 'minute', 'latitude', 'longitude', 'timeZone'] as const;
    for (const k of required) {
      if ((body as any)[k] == null) {
        return NextResponse.json({ error: `필드 누락: ${k}` }, { status: 400 });
      }
    }

    const prompt = generatePromptForGemini(body);
    const { text, model } = await callGeminiText(prompt, 1024);

    return NextResponse.json({ interpretation: text, model });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}