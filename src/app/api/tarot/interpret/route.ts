// src/app/api/tarot/interpret/route.ts
// Premium Tarot Interpretation API using Hybrid RAG

import { NextResponse } from "next/server";
import { getBackendUrl as pickBackendUrl } from "@/lib/backend-url";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { captureServerError } from "@/lib/telemetry";
import { requirePublicToken } from "@/lib/auth/publicToken";
import { enforceBodySize } from "@/lib/http";


interface CardInput {
  name: string;
  nameKo?: string;
  isReversed: boolean;
  position: string;
  positionKo?: string;
  meaning?: string;
  meaningKo?: string;
  keywords?: string[];
  keywordsKo?: string[];
}

interface InterpretRequest {
  categoryId: string;
  spreadId: string;
  spreadTitle: string;
  cards: CardInput[];
  userQuestion?: string;
  language?: "ko" | "en";
  birthdate?: string;  // User's birthdate 'YYYY-MM-DD' for personalization (Tier 4)
  moonPhase?: string;  // Current moon phase for realtime context
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TITLE = 120;
const MAX_QUESTION = 600;
const MAX_POSITION = 80;
const MAX_KEYWORDS = 8;
const MAX_CARDS = 15;

const sanitize = (value: unknown, max = 120) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

function validateCard(card: Partial<CardInput> | null | undefined, idx: number): { error?: string; card?: CardInput } {
  const name = sanitize(card?.name, MAX_TITLE);
  const position = sanitize(card?.position, MAX_POSITION);
  if (!name || !position) {
    return { error: `cards[${idx}]: name and position are required.` };
  }
  if (typeof card?.isReversed !== "boolean") {
    return { error: `cards[${idx}]: isReversed must be boolean.` };
  }
  const keywords = Array.isArray(card?.keywords)
    ? card.keywords.filter((k: unknown): k is string => typeof k === "string").slice(0, MAX_KEYWORDS)
    : undefined;
  const keywordsKo = Array.isArray(card?.keywordsKo)
    ? card.keywordsKo.filter((k: unknown): k is string => typeof k === "string").slice(0, MAX_KEYWORDS)
    : undefined;

  return {
    card: {
      name,
      nameKo: sanitize(card?.nameKo, MAX_TITLE) || undefined,
      isReversed: card.isReversed,
      position,
      positionKo: sanitize(card?.positionKo, MAX_POSITION) || undefined,
      meaning: sanitize(card?.meaning, MAX_TITLE) || undefined,
      meaningKo: sanitize(card?.meaningKo, MAX_TITLE) || undefined,
      keywords,
      keywordsKo,
    } as CardInput,
  };
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`tarot-interpret:${ip}`, { limit: 10, windowSeconds: 60 });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
        { status: 429, headers: limit.headers }
      );
    }

    if (!requirePublicToken(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const oversized = enforceBodySize(req as any, 256 * 1024, limit.headers);
    if (oversized) return oversized;

    const body: InterpretRequest = await req.json();
    const categoryId = sanitize(body?.categoryId, MAX_TITLE);
    const spreadId = sanitize(body?.spreadId, MAX_TITLE);
    const spreadTitle = sanitize(body?.spreadTitle, MAX_TITLE);
    const language: "ko" | "en" = body?.language === "en" ? "en" : "ko";
    const birthdate = sanitize(body?.birthdate, 20);
    const moonPhase = sanitize(body?.moonPhase, 40);
    const rawCards = Array.isArray(body?.cards) ? body.cards : [];
    const userQuestion = sanitize(body?.userQuestion, MAX_QUESTION);

    if (!categoryId || !spreadId || rawCards.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: categoryId, spreadId, cards" },
        { status: 400, headers: limit.headers }
      );
    }

    if (rawCards.length > MAX_CARDS) {
      return NextResponse.json(
        { error: `Too many cards. Maximum ${MAX_CARDS} supported.` },
        { status: 400, headers: limit.headers }
      );
    }

    const validatedCards: CardInput[] = [];
    for (let i = 0; i < rawCards.length; i++) {
      const { card, error } = validateCard(rawCards[i], i);
      if (error) {
        return NextResponse.json({ error }, { status: 400, headers: limit.headers });
      }
      validatedCards.push(card!);
    }

    if (birthdate && (!DATE_RE.test(birthdate) || Number.isNaN(Date.parse(birthdate)))) {
      return NextResponse.json({ error: "birthdate must be YYYY-MM-DD" }, { status: 400, headers: limit.headers });
    }

    if (moonPhase && moonPhase.length < 2) {
      return NextResponse.json({ error: "moonPhase is too short" }, { status: 400, headers: limit.headers });
    }

    // Call Python backend for Hybrid RAG interpretation (with fallback on connection failure)
    let interpretation = null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const backendResponse = await fetch(`${pickBackendUrl()}/api/tarot/interpret`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.ADMIN_API_TOKEN || ""}`
        },
        body: JSON.stringify({
          category: categoryId,
          spread_id: spreadId,
          spread_title: spreadTitle,
          cards: validatedCards.map(c => ({
            name: c.name,
            is_reversed: c.isReversed,
            position: c.position
          })),
          user_question: userQuestion,
          language,
          birthdate,
          moon_phase: moonPhase
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeoutId);

      if (backendResponse.ok) {
        interpretation = await backendResponse.json();
      }
    } catch (fetchError) {
      console.warn("Backend connection failed, using fallback:", fetchError);
    }

    // Use backend response or GPT fallback
    let result;
    if (interpretation && !interpretation.error) {
      result = interpretation;
    } else {
      console.warn("Backend unavailable, using GPT interpretation");
      result = await generateGPTInterpretation(validatedCards, spreadTitle, language, userQuestion);
    }

    // ======== 기록 저장 (로그인 사용자만) ========
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      try {
        await prisma.reading.create({
          data: {
            userId: session.user.id,
            type: 'tarot',
            title: `${spreadTitle} - ${validatedCards.map((c: CardInput) => c.nameKo || c.name).join(', ')}`,
            content: JSON.stringify({
              categoryId,
              spreadId,
              spreadTitle,
              cards: validatedCards.map((c: CardInput) => ({
                name: c.name,
                nameKo: c.nameKo,
                isReversed: c.isReversed,
                position: c.position,
              })),
              userQuestion,
            }),
          },
        });
      } catch (saveErr) {
        console.warn('[Tarot API] Failed to save reading:', saveErr);
      }
    }

    const res = NextResponse.json(result);
    limit.headers.forEach((value, key) => res.headers.set(key, value));
    return res;

  } catch (err: unknown) {
    captureServerError(err as Error, { route: "/api/tarot/interpret" });

    // Return fallback even on error
    console.error("Tarot interpretation error:", err);
    return NextResponse.json(
      { error: "Server error", fallback: true },
      { status: 500 }
    );
  }
}

// GPT-4o-mini API 호출 헬퍼
async function callGPT(prompt: string, maxTokens = 400): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// GPT를 사용한 해석 생성 (백엔드 없이 직접 호출)
async function generateGPTInterpretation(
  cards: CardInput[],
  spreadTitle: string,
  language: string,
  userQuestion?: string
) {
  const isKorean = language === "ko";
  const cardsStr = cards.map(c => {
    const name = isKorean && c.nameKo ? c.nameKo : c.name;
    return `${name}${c.isReversed ? '(역방향)' : ''}`;
  }).join(', ');

  // 전체 해석과 개별 카드 해석을 병렬로 생성
  const overallPrompt = isKorean
    ? `당신은 10년 경력의 타로 리더입니다.

질문: "${userQuestion || '일반 운세'}"
스프레드: ${spreadTitle}
카드: ${cardsStr}

위 카드들을 종합해서 300-400자로 해석해주세요.
- 질문에 직접 답변
- 카드 이미지의 상징을 구체적으로 언급
- AI스러운 표현 피하기 (긍정적 에너지, ~하시면 좋을 것 같습니다 등)
- 자연스러운 한국어`
    : `You are a tarot reader with 10 years of experience.

Question: "${userQuestion || 'General reading'}"
Spread: ${spreadTitle}
Cards: ${cardsStr}

Interpret these cards in 200-300 words.
- Answer the question directly
- Reference specific card symbolism
- Avoid AI-sounding phrases
- Natural English`;

  // 각 카드별 해석 프롬프트 생성
  const cardPrompts = cards.map((card, i) => {
    const cardName = isKorean && card.nameKo ? card.nameKo : card.name;
    const position = isKorean && card.positionKo ? card.positionKo : card.position;
    const meaning = isKorean && card.meaningKo ? card.meaningKo : card.meaning;
    const keywords = isKorean && card.keywordsKo ? card.keywordsKo : card.keywords;
    const reversedText = card.isReversed ? (isKorean ? '(역방향)' : '(Reversed)') : '';

    return isKorean
      ? `타로 리더로서 아래 카드를 100-150자로 해석하세요.

카드: ${cardName}${reversedText}
위치: ${position}
질문: ${userQuestion || '일반 운세'}
카드 의미: ${meaning || ''}
키워드: ${keywords?.join(', ') || ''}

해석 방향:
- 이 위치(${position})에서 카드가 의미하는 바
- 카드 이미지의 상징 언급
- AI스러운 표현 피하기`
      : `As a tarot reader, interpret this card in 80-120 words.

Card: ${cardName}${reversedText}
Position: ${position}
Question: ${userQuestion || 'General reading'}
Meaning: ${meaning || ''}
Keywords: ${keywords?.join(', ') || ''}

Focus on what this card means in this position.`;
  });

  // 조언 프롬프트
  const guidancePrompt = isKorean
    ? `타로 상담사로서 아래 카드들을 바탕으로 실용적인 조언을 150-200자로 작성하세요.

질문: "${userQuestion || '일반 운세'}"
카드: ${cardsStr}

조언 방향:
- 구체적이고 실행 가능한 조언
- 질문에 직접적으로 답하는 내용
- "~하세요", "~해보세요" 같은 행동 지침
- AI스러운 표현 피하기 (긍정적 에너지, ~하시면 좋을 것 같습니다 등)`
    : `As a tarot counselor, give practical advice in 100-150 words based on these cards.

Question: "${userQuestion || 'General reading'}"
Cards: ${cardsStr}

Give specific, actionable advice that directly answers the question.`;

  try {
    // 모든 GPT 호출을 병렬로 실행 (조언도 포함)
    const [overallResult, guidanceResult, ...cardResults] = await Promise.all([
      callGPT(overallPrompt, 600),
      callGPT(guidancePrompt, 300),
      ...cardPrompts.map(prompt => callGPT(prompt, 250))
    ]);

    return {
      overall_message: overallResult,
      card_insights: cards.map((card, i) => ({
        position: card.position,
        card_name: card.name,
        is_reversed: card.isReversed,
        interpretation: cardResults[i] || '',
        spirit_animal: null,
        chakra: null,
        element: null,
        shadow: null
      })),
      guidance: guidanceResult || (isKorean ? "카드의 메시지에 귀 기울여보세요." : "Listen to the cards."),
      affirmation: isKorean
        ? "오늘 하루도 나답게 가면 돼요."
        : "Just be yourself today.",
      combinations: [],
      followup_questions: [],
      fallback: false
    };
  } catch (error) {
    console.error("GPT interpretation failed:", error);
    // GPT 실패 시 기본 fallback
    return generateSimpleFallback(cards, spreadTitle, language, userQuestion);
  }
}

// 간단한 fallback (GPT도 실패한 경우)
function generateSimpleFallback(
  cards: CardInput[],
  spreadTitle: string,
  language: string,
  userQuestion?: string
) {
  const isKorean = language === "ko";

  return {
    overall_message: isKorean
      ? `${cards.map(c => c.nameKo || c.name).join(', ')} 카드가 나왔습니다.`
      : `You drew: ${cards.map(c => c.name).join(', ')}.`,
    card_insights: cards.map((card) => ({
      position: card.position,
      card_name: card.name,
      is_reversed: card.isReversed,
      interpretation: isKorean && card.meaningKo ? card.meaningKo : (card.meaning || ''),
      spirit_animal: null,
      chakra: null,
      element: null,
      shadow: null
    })),
    guidance: isKorean ? "카드의 메시지에 귀 기울여보세요." : "Listen to the cards.",
    affirmation: isKorean ? "오늘도 화이팅!" : "You got this!",
    combinations: [],
    followup_questions: [],
    fallback: true
  };
}
