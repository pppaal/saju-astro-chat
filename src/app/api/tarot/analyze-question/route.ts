// src/app/api/tarot/analyze-question/route.ts
// GPT-4o-mini를 사용해서 사용자 질문을 분석하고 적절한 스프레드 추천

import { NextRequest, NextResponse } from "next/server";
import { tarotThemes } from "@/lib/Tarot/tarot-spreads-data";

// ============================================================
// OpenAI API 호출 헬퍼
// ============================================================
async function callOpenAI(messages: { role: string; content: string }[], maxTokens = 300) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: maxTokens,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// 스프레드 정보를 GPT에게 전달할 형식으로 변환
function getSpreadOptions() {
  const options: { id: string; themeId: string; title: string; titleKo: string; description: string; cardCount: number }[] = [];

  for (const theme of tarotThemes) {
    for (const spread of theme.spreads) {
      options.push({
        id: spread.id,
        themeId: theme.id,
        title: spread.title,
        titleKo: spread.titleKo || spread.title,
        description: spread.descriptionKo || spread.description,
        cardCount: spread.cardCount,
      });
    }
  }

  return options;
}

// 위험한 질문 체크
const dangerousKeywords = [
  "자살", "죽고 싶", "죽을래", "살기 싫", "끝내고 싶", "죽어버릴",
  "자해", "목숨", "생을 마감", "세상 떠나",
  "suicide", "kill myself", "end my life", "want to die"
];

function checkDangerous(question: string): boolean {
  const normalized = question.toLowerCase();
  return dangerousKeywords.some(kw => normalized.includes(kw.toLowerCase()));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, language = "ko" } = body;

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const trimmedQuestion = question.trim().slice(0, 500);

    // 위험한 질문 체크
    if (checkDangerous(trimmedQuestion)) {
      return NextResponse.json({
        isDangerous: true,
        message: language === "ko"
          ? "힘든 시간을 보내고 계신 것 같아요. 전문가의 도움을 받으시길 권해드려요. 자살예방상담전화: 1393 (24시간)"
          : "I sense you might be going through a difficult time. Please reach out to a professional who can help. Crisis helpline: 1393 (Korea) or your local emergency services.",
      });
    }

    // 스프레드 옵션 목록
    const spreadOptions = getSpreadOptions();
    const spreadListForPrompt = spreadOptions.map(s =>
      `- ${s.themeId}/${s.id}: ${s.titleKo} (${s.cardCount}장) - ${s.description}`
    ).join("\n");

    // GPT-4o-mini로 분석
    const systemPrompt = `당신은 타로 전문가입니다. 사용자의 질문을 분석하고 가장 적합한 타로 스프레드를 추천해야 합니다.

다음 스프레드 중에서 선택하세요:
${spreadListForPrompt}

응답 형식 (JSON만 반환):
{
  "themeId": "선택한 테마 ID",
  "spreadId": "선택한 스프레드 ID",
  "reason": "이 스프레드를 선택한 이유 (한 문장)",
  "userFriendlyExplanation": "사용자에게 보여줄 친근한 설명 (예: '연애 고민이시군요! 상대방의 마음을 볼 수 있는 3장 스프레드를 준비했어요')"
}`;

    const responseText = await callOpenAI([
      { role: "system", content: systemPrompt },
      { role: "user", content: `사용자 질문: "${trimmedQuestion}"` }
    ]);

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch {
      // 파싱 실패시 기본값
      parsed = {
        themeId: "general-insight",
        spreadId: "past-present-future",
        reason: "일반적인 운세 확인",
        userFriendlyExplanation: language === "ko"
          ? "전반적인 흐름을 볼 수 있는 스프레드를 준비했어요"
          : "I've prepared a spread to see the overall flow"
      };
    }

    // 선택된 스프레드 정보 찾기
    const selectedSpread = spreadOptions.find(
      s => s.themeId === parsed.themeId && s.id === parsed.spreadId
    );

    if (!selectedSpread) {
      // 못 찾으면 기본값
      return NextResponse.json({
        isDangerous: false,
        themeId: "general-insight",
        spreadId: "past-present-future",
        spreadTitle: "과거, 현재, 미래",
        cardCount: 3,
        reason: "일반적인 운세 확인",
        userFriendlyExplanation: language === "ko"
          ? "전반적인 흐름을 볼 수 있는 스프레드를 준비했어요"
          : "I've prepared a spread to see the overall flow",
        path: `/tarot/general-insight/past-present-future?question=${encodeURIComponent(trimmedQuestion)}`,
      });
    }

    return NextResponse.json({
      isDangerous: false,
      themeId: parsed.themeId,
      spreadId: parsed.spreadId,
      spreadTitle: selectedSpread.titleKo,
      cardCount: selectedSpread.cardCount,
      reason: parsed.reason,
      userFriendlyExplanation: parsed.userFriendlyExplanation,
      path: `/tarot/${parsed.themeId}/${parsed.spreadId}?question=${encodeURIComponent(trimmedQuestion)}`,
    });

  } catch (error) {
    console.error("Error analyzing question:", error);
    return NextResponse.json(
      { error: "Failed to analyze question" },
      { status: 500 }
    );
  }
}
