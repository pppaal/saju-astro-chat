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

function validateCard(card: any, idx: number) {
  const name = sanitize(card?.name, MAX_TITLE);
  const position = sanitize(card?.position, MAX_POSITION);
  if (!name || !position) {
    return { error: `cards[${idx}]: name and position are required.` };
  }
  if (typeof card?.isReversed !== "boolean") {
    return { error: `cards[${idx}]: isReversed must be boolean.` };
  }
  const keywords = Array.isArray(card?.keywords)
    ? card.keywords.filter((k: any) => typeof k === "string").slice(0, MAX_KEYWORDS)
    : undefined;
  const keywordsKo = Array.isArray(card?.keywordsKo)
    ? card.keywordsKo.filter((k: any) => typeof k === "string").slice(0, MAX_KEYWORDS)
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

    // Use backend response or fallback
    const result = (interpretation && !interpretation.error)
      ? interpretation
      : generateFallbackInterpretation(validatedCards, spreadTitle, language, userQuestion);

    if (!interpretation || interpretation.error) {
      console.warn("Using fallback interpretation");
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

// Fallback interpretation when backend is unavailable
function generateFallbackInterpretation(
  cards: CardInput[],
  spreadTitle: string,
  language: string,
  userQuestion?: string
) {
  const isKorean = language === "ko";

  // Generate meaningful overall message based on card meanings
  const cardSummary = cards.map(c => {
    const cardName = isKorean && c.nameKo ? c.nameKo : c.name;
    const keywords = isKorean && c.keywordsKo ? c.keywordsKo : c.keywords;
    return keywords?.slice(0, 2).join(", ") || cardName;
  }).join(", ");

  // Build topic-aware overall message
  let overallMessage: string;
  if (userQuestion && userQuestion.trim()) {
    overallMessage = isKorean
      ? `"${userQuestion}"에 대해 ${cardSummary} 카드가 나왔어요. 이 카드들이 어떤 이야기를 하는지 같이 살펴볼게요.`
      : `Regarding your question "${userQuestion}", the cards ${cardSummary} came up. Let's see what story they're telling.`;
  } else {
    overallMessage = isKorean
      ? `이번 리딩에서 ${cardSummary} 카드가 나왔네요. 카드들이 무슨 말을 하려는지 같이 봐요.`
      : `This reading shows ${cardSummary}. Let's see what these cards are saying.`;
  }

  return {
    overall_message: overallMessage,

    card_insights: cards.map((card) => {
      const cardName = isKorean && card.nameKo ? card.nameKo : card.name;
      const positionName = isKorean && card.positionKo ? card.positionKo : card.position;
      const meaning = isKorean && card.meaningKo ? card.meaningKo : card.meaning;
      const keywords = isKorean && card.keywordsKo ? card.keywordsKo : card.keywords;
      const keywordText = keywords?.slice(0, 3).join(", ") || "";
      const reversedText = card.isReversed ? (isKorean ? " (역방향)" : " (Reversed)") : "";

      // Create a rich interpretation combining position context and card meaning
      let interpretation: string;
      if (meaning) {
        interpretation = isKorean
          ? `【${positionName}】 ${cardName}${reversedText}가 나왔어요.\n\n${meaning}\n\n키워드: ${keywordText}`
          : `【${positionName}】 ${cardName}${reversedText} came up.\n\n${meaning}\n\nKeywords: ${keywordText}`;
      } else {
        interpretation = isKorean
          ? `${positionName} 자리에 ${cardName}${reversedText}가 나왔어요. ${keywordText}와 관련이 있어요.`
          : `${cardName}${reversedText} in the ${positionName} position relates to ${keywordText}.`;
      }

      return {
        position: card.position,
        card_name: card.name,
        is_reversed: card.isReversed,
        interpretation,
        spirit_animal: null,
        chakra: null,
        element: null,
        shadow: null
      };
    }),

    guidance: userQuestion && userQuestion.trim()
      ? (isKorean
          ? `"${userQuestion}"에 대해 카드가 하는 말을 참고해보세요. 상황에 맞게 적용해보시면 될 것 같아요.`
          : `Consider what the cards are saying about "${userQuestion}". Apply it to your situation as you see fit.`)
      : (isKorean
          ? "카드를 보면서 떠오르는 생각이나 느낌이 있다면 그걸 잘 기억해두세요. 의외로 도움이 될 수 있어요."
          : "If any thoughts or feelings come to mind while looking at the cards, keep them in mind. They might be helpful."),

    affirmation: isKorean
      ? "오늘 하루도 나답게, 내 페이스대로 가면 돼요."
      : "Just be yourself and go at your own pace today.",

    combinations: [],
    followup_questions: userQuestion && userQuestion.trim()
      ? (isKorean
          ? [
              `"${userQuestion}"랑 관련해서 가장 눈에 띄는 카드가 뭐예요?`,
              "이 상황에서 조심할 건 뭐가 있을까요?",
              "다음에 어떻게 하면 좋을까요?"
            ]
          : [
              `Which card stands out most regarding "${userQuestion}"?`,
              "What should I watch out for in this situation?",
              "What should I do next?"
            ])
      : (isKorean
          ? [
              "이 카드들이 지금 제 상황과 어떻게 연결될까요?",
              "어떤 카드가 가장 마음에 와닿아요?",
              "이 리딩에서 제일 중요한 게 뭘까요?"
            ]
          : [
              "How do these cards connect to my current situation?",
              "Which card resonates with you the most?",
              "What's the most important takeaway from this reading?"
            ]),

    fallback: true
  };
}
