// src/app/api/life-prediction/advisor-chat/route.ts
// AI 운세 상담사 채팅 API

import { NextRequest, NextResponse } from 'next/server';

interface ChatRequest {
  message: string;
  context: {
    question: string;
    eventType: string;
    results: Array<{
      startDate: string;
      endDate: string;
      score: number;
      grade: string;
      reasons: string[];
    }>;
    birthDate: string;
    gender: 'M' | 'F';
  };
  history: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  locale: 'ko' | 'en';
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body: ChatRequest = await request.json();
    const { message, context, history, locale } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // 예측 결과 요약 생성
    const resultsSummary = context.results
      .slice(0, 3)
      .map((r, i) => {
        const startDate = new Date(r.startDate).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US');
        const endDate = new Date(r.endDate).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US');
        return `${i + 1}. ${startDate} ~ ${endDate}: ${r.grade}등급 (${r.score}점) - ${r.reasons.slice(0, 2).join(', ')}`;
      })
      .join('\n');

    // 시스템 프롬프트
    const systemPrompt = locale === 'ko'
      ? `당신은 친근하고 지혜로운 운세 상담사입니다. 사용자의 인생 예측 결과를 바탕으로 따뜻하고 실용적인 조언을 제공합니다.

## 사용자 정보
- 생년월일: ${context.birthDate}
- 성별: ${context.gender === 'M' ? '남성' : '여성'}
- 질문: "${context.question}"
- 이벤트 유형: ${context.eventType}

## 예측 결과 (상위 3개)
${resultsSummary}

## 대화 지침
1. 따뜻하고 공감하는 어조로 대화하세요
2. 예측 결과를 바탕으로 구체적이고 실용적인 조언을 제공하세요
3. 긍정적인 면을 강조하되, 필요한 주의사항도 언급하세요
4. 너무 길지 않게, 2-4문장 정도로 간결하게 답변하세요
5. 사주/점성술 용어는 쉬운 말로 풀어서 설명하세요
6. 답변 끝에 이모지를 적절히 사용해 친근감을 더하세요`
      : `You are a warm and wise fortune advisor. Provide warm and practical advice based on the user's life prediction results.

## User Information
- Birth Date: ${context.birthDate}
- Gender: ${context.gender === 'M' ? 'Male' : 'Female'}
- Question: "${context.question}"
- Event Type: ${context.eventType}

## Prediction Results (Top 3)
${resultsSummary}

## Conversation Guidelines
1. Speak with a warm, empathetic tone
2. Provide specific, practical advice based on the prediction results
3. Emphasize positive aspects while mentioning necessary cautions
4. Keep responses concise, about 2-4 sentences
5. Explain any fortune-telling terms in simple language
6. Use appropriate emojis at the end for friendliness`;

    // 대화 히스토리 구성
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({
        role: h.role,
        content: h.content,
      })),
      { role: 'user', content: message },
    ];

    // OpenAI API 호출
    // Note: Using hardcoded key temporarily due to system env var conflict
    const apiKey = process.env.OPENAI_API_KEY?.startsWith('sk-proj-JmRh')
      ? process.env.OPENAI_API_KEY
      : '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';
    if (!apiKey) {
      console.error('[Advisor Chat] OPENAI_API_KEY is not set');
      return NextResponse.json(
        { success: false, error: 'API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[Advisor Chat] OpenAI error:', response.status, errorBody);
      console.error('[Advisor Chat] API Key prefix:', apiKey?.substring(0, 20) + '...');
      throw new Error(`OpenAI API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      reply,
    });

  } catch (error) {
    console.error('[Advisor Chat] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
