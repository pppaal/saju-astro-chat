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

    const oversized = enforceBodySize(req, 256 * 1024, limit.headers);
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

// GPT-4o API 호출 헬퍼 (최고 품질 모델)
async function callGPT(prompt: string, maxTokens = 400): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',  // gpt-4o-mini → gpt-4o 업그레이드
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.75,  // 창의성 약간 증가
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// GPT를 사용한 해석 생성 (백엔드 없이 직접 호출) - 통합 프롬프트로 속도 최적화
async function generateGPTInterpretation(
  cards: CardInput[],
  spreadTitle: string,
  language: string,
  userQuestion?: string
) {
  const isKorean = language === "ko";

  // 위치별 카드 정보
  const cardListText = cards.map((c, i) => {
    const name = isKorean && c.nameKo ? c.nameKo : c.name;
    const pos = isKorean && c.positionKo ? c.positionKo : c.position;
    const keywords = (isKorean && c.keywordsKo ? c.keywordsKo : c.keywords) || [];
    return `${i + 1}. [${pos}] ${name}${c.isReversed ? '(역방향)' : ''} - ${keywords.slice(0, 3).join(', ')}`;
  }).join('\n');

  const q = userQuestion || (isKorean ? '일반 운세' : 'general reading');

  // 통합 프롬프트 (전체 해석 + 카드별 해석 + 조언을 한번에)
  const unifiedPrompt = isKorean
    ? `당신은 20년 경력의 직관적인 타로 리더예요. 유튜브에서 수백만 뷰를 받는 타로 채널처럼, 깊이 있고 섬세하게 해석해주세요.

## 스프레드: ${spreadTitle}
## 질문: "${q}"

## 뽑힌 카드
${cardListText}

## 출력 형식 (JSON)
다음 형식으로 JSON 응답해:
{
  "overall": "전체 메시지 (800-1200자). 마치 친한 언니/오빠가 카페에서 타로를 봐주듯, 진심 어린 이야기로 시작해요. 카드들이 전체적으로 그리는 큰 그림을 먼저 보여주고, 질문자의 현재 에너지와 앞으로의 흐름을 자연스럽게 풀어주세요. 마지막엔 '결론:'으로 핵심 메시지 정리.",
  "cards": [
    {"position": "위치명", "interpretation": "카드 해석 (700-1000자, 최소 12-15줄). 유튜브 타로 리더처럼 풍성하게:\n\n1) **카드 비주얼 묘사** (2-3줄): '이 카드를 보면요~' 하며 색깔, 인물의 표정, 배경 상징물을 생생하게 그려내요. 예: '여기 보이는 노란 옷을 입은 사람이...'\n\n2) **위치별 의미** (3-4줄): 이 위치(과거/현재/미래/장애물 등)에서 이 카드가 나온 게 왜 의미 있는지, 질문자의 상황과 어떻게 맞아떨어지는지 구체적으로 연결해요.\n\n3) **감정적 레이어** (2-3줄): 이 카드가 전하는 감정, 에너지, 분위기를 섬세하게 전달해요. '지금 이런 느낌 받고 계시죠?' 같은 공감의 언어로.\n\n4) **실용적 메시지** (3-4줄): 이 카드가 말하는 구체적인 조언. 무엇을 하면 좋을지, 무엇을 조심해야 할지, 어떤 마음가짐이 필요한지 실천 가능하게.\n\n5) **숨은 의미** (1-2줄): 역방향이나 카드 조합에서만 보이는 깊은 통찰, 숨겨진 기회나 경고."}
  ],
  "advice": "실용적이고 구체적한 행동 지침 (180-250자). '오늘부터 이렇게 해보세요' 식의 단계별 조언. 추상적이지 않고 실천 가능한 것만."
}

## 해석 원칙 (매우 중요!)
1. **질문에 직접 답변**: "${q}"를 항상 염두에 두고, 이 질문에 대한 답을 카드에서 찾아요
2. **스토리텔링**: 각 카드를 따로따로 보지 말고, 전체가 하나의 이야기를 만들도록 연결해요
3. **디테일 묘사**: "좋은 카드네요" 같은 뻔한 말 대신, 카드 속 구체적인 이미지를 언급하며 설명해요
4. **공감과 솔직함**: 듣기 좋은 말만 하지 않고, 필요하면 경고도 따뜻하게 전달해요
5. **역방향 의미**: 역방향 카드는 단순히 "반대"가 아니라, 에너지의 차단/과잉/내면화를 섬세하게 구분해요

## 말투 (절대 규칙!)
✅ 사용: "~해요", "~네요", "~거든요", "~죠", "~ㄹ 거예요"
❌ 금지: "~것입니다", "~하겠습니다", "~합니다", "~하옵니다" (딱딱한 격식체/고어체)
✅ 예시: "지금 좀 힘드시죠? 이 카드가 말해주고 있어요."
❌ 나쁜 예: "현재 어려움을 겪고 계실 것입니다."

## 금지 사항
- AI 티 나는 표현: "제 생각에는", "저는 믿습니다", "추천드립니다" ❌
- 뻔한 일반론: "긍정적인 마음가짐이 중요합니다" ❌
- 짧은 해석: 각 카드는 최소 700자 이상, 풍성하게!`
    : `You are a 20-year veteran intuitive tarot reader. Read like a million-view YouTube tarot channel - deep, detailed, and insightful.

## Spread: ${spreadTitle}
## Question: "${q}"

## Cards Drawn
${cardListText}

## Output Format (JSON)
Respond in this JSON format:
{
  "overall": "Overall message (500-700 words). Like a close friend reading tarot at a coffee shop, start with genuine insight. Show the big picture these cards paint together, the querent's current energy, and the flow ahead. End with 'Conclusion:' summarizing the core message.",
  "cards": [
    {"position": "Position name", "interpretation": "Card interpretation (450-600 words, at least 12-15 lines). Rich like YouTube tarot readers:\n\n1) **Visual Description** (2-3 lines): 'When I look at this card...' Paint colors, facial expressions, background symbols vividly. Ex: 'The figure in yellow robes...'\n\n2) **Position Meaning** (3-4 lines): Why this card appearing in this position (past/present/future/obstacle) matters, how it connects to the querent's situation specifically.\n\n3) **Emotional Layer** (2-3 lines): The feelings, energy, atmosphere this card conveys delicately. Use empathetic language like 'You might be feeling this...'\n\n4) **Practical Message** (3-4 lines): Specific advice from this card. What to do, what to watch out for, what mindset is needed - actionable.\n\n5) **Hidden Meaning** (1-2 lines): Deep insights only visible in reversals or card combinations, hidden opportunities or warnings."}
  ],
  "advice": "Practical, specific action steps (120-150 words). 'Starting today, try this...' style step-by-step guidance. Nothing abstract, only actionable."
}

## Reading Principles (Critical!)
1. **Answer the Question**: Always keep "${q}" in mind, find answers in the cards
2. **Storytelling**: Connect all cards into one cohesive narrative, not separate readings
3. **Detail Description**: Instead of generic "good card", mention specific imagery from the card
4. **Empathy & Honesty**: Don't just say nice things - give warnings warmly when needed
5. **Reversal Nuance**: Reversed cards aren't just "opposite" - distinguish blocked/excess/internalized energy

## Tone Rules (Absolute!)
✅ Use: Natural, conversational, warm but honest
❌ Avoid: "I believe", "I think", "I suggest", "In my opinion" (AI-like phrases)
✅ Example: "You're going through a tough time, aren't you? This card is telling you..."
❌ Bad: "I believe you may be experiencing difficulties."

## Prohibited
- AI-sounding: "I believe", "I suggest", "I recommend" ❌
- Generic platitudes: "Positive mindset is important" ❌
- Short readings: Each card minimum 450 words, make it rich!`;

  try {
    const result = await callGPT(unifiedPrompt, 8000);  // 6000 → 8000 토큰으로 증가

    // Parse JSON response
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      return {
        overall_message: parsed.overall || '',
        card_insights: cards.map((card, i) => {
          const cardData = parsed.cards?.[i] || {};
          return {
            position: card.position,
            card_name: card.name,
            is_reversed: card.isReversed,
            interpretation: cardData.interpretation || '',
            spirit_animal: null,
            chakra: null,
            element: null,
            shadow: null
          };
        }),
        guidance: parsed.advice || (isKorean ? "카드의 메시지에 귀 기울여보세요." : "Listen to the cards."),
        affirmation: isKorean
          ? "오늘 하루도 나답게 가면 돼요."
          : "Just be yourself today.",
        combinations: [],
        followup_questions: [],
        fallback: false
      };
    }

    // JSON 파싱 실패 시 전체 텍스트를 overall로 사용
    return {
      overall_message: result,
      card_insights: cards.map((card) => ({
        position: card.position,
        card_name: card.name,
        is_reversed: card.isReversed,
        interpretation: '',
        spirit_animal: null,
        chakra: null,
        element: null,
        shadow: null
      })),
      guidance: isKorean ? "카드의 메시지에 귀 기울여보세요." : "Listen to the cards.",
      affirmation: isKorean ? "오늘도 화이팅!" : "You got this!",
      combinations: [],
      followup_questions: [],
      fallback: false
    };
  } catch (error) {
    console.error("GPT interpretation failed:", error);
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
