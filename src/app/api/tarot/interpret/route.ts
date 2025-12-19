// src/app/api/tarot/interpret/route.ts
// Premium Tarot Interpretation API using Hybrid RAG

import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { captureServerError } from "@/lib/telemetry";
import { requirePublicToken } from "@/lib/auth/publicToken";

function pickBackendUrl() {
  const url =
    process.env.AI_BACKEND_URL ||
    process.env.BACKEND_AI_URL ||
    process.env.NEXT_PUBLIC_AI_BACKEND ||
    "http://localhost:5000";
  if (!url.startsWith("https://") && process.env.NODE_ENV === "production") {
    console.warn("[tarot interpret] Using non-HTTPS AI backend in production");
  }
  if (process.env.NEXT_PUBLIC_AI_BACKEND && !process.env.AI_BACKEND_URL) {
    console.warn("[tarot interpret] NEXT_PUBLIC_AI_BACKEND is public; prefer AI_BACKEND_URL");
  }
  return url;
}

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

    const body: InterpretRequest = await req.json();
    const { categoryId, spreadId, spreadTitle, cards, userQuestion, language = "ko", birthdate, moonPhase } = body;

    if (!categoryId || !spreadId || !cards || cards.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: categoryId, spreadId, cards" },
        { status: 400, headers: limit.headers }
      );
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
          cards: cards.map(c => ({
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
    if (interpretation && !interpretation.error) {
      const res = NextResponse.json(interpretation);
      limit.headers.forEach((value, key) => res.headers.set(key, value));
      return res;
    }

    // Fallback interpretation
    console.warn("Using fallback interpretation");
    const fallbackResult = generateFallbackInterpretation(cards, spreadTitle, language);
    const res = NextResponse.json(fallbackResult);
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
  language: string
) {
  const isKorean = language === "ko";

  // Generate meaningful overall message based on card meanings
  const cardSummary = cards.map(c => {
    const cardName = isKorean && c.nameKo ? c.nameKo : c.name;
    const keywords = isKorean && c.keywordsKo ? c.keywordsKo : c.keywords;
    return keywords?.slice(0, 2).join(", ") || cardName;
  }).join(", ");

  return {
    overall_message: isKorean
      ? `이번 리딩에서는 ${cardSummary}의 에너지가 함께 나타났습니다. 이 카드들의 조화로운 메시지를 통해 현재 상황에 대한 통찰을 얻어보세요.`
      : `This reading reveals the energies of ${cardSummary}. Let the harmonious messages of these cards provide insight into your current situation.`,

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
          ? `【${positionName}】 ${cardName}${reversedText}가 이 자리에 나타났습니다.\n\n${meaning}\n\n핵심 키워드: ${keywordText}`
          : `【${positionName}】 ${cardName}${reversedText} appears in this position.\n\n${meaning}\n\nKey themes: ${keywordText}`;
      } else {
        interpretation = isKorean
          ? `${positionName} 자리의 ${cardName}${reversedText}는 ${keywordText}의 에너지를 가져옵니다.`
          : `${cardName}${reversedText} in the ${positionName} position brings the energy of ${keywordText}.`;
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

    guidance: isKorean
      ? "이 카드들이 전하는 지혜에 마음을 열어보세요. 당신의 내면은 이미 답을 알고 있습니다. 조용히 앉아 카드들이 보여주는 이미지와 상징을 떠올려보며, 어떤 감정과 생각이 떠오르는지 관찰해보세요."
      : "Open your heart to the wisdom these cards convey. Your inner self already knows the answers. Sit quietly and visualize the images and symbols shown by the cards, observing what emotions and thoughts arise.",

    affirmation: isKorean
      ? "나는 우주의 지혜와 연결되어 있으며, 내 안의 직관을 신뢰합니다."
      : "I am connected to the wisdom of the universe and trust my inner intuition.",

    combinations: [],
    followup_questions: isKorean
      ? [
          "이 카드들의 조합이 내 현재 상황과 어떻게 연결되나요?",
          "각 카드에서 가장 끌리는 이미지나 상징은 무엇인가요?",
          "이 리딩에서 가장 중요하게 느껴지는 메시지는 무엇인가요?"
        ]
      : [
          "How does this combination of cards connect to my current situation?",
          "What images or symbols from each card draw you the most?",
          "What feels like the most important message from this reading?"
        ],

    fallback: true
  };
}
