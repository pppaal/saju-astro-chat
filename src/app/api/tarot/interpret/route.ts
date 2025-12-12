// src/app/api/tarot/interpret/route.ts
// Premium Tarot Interpretation API using Hybrid RAG

import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { captureServerError } from "@/lib/telemetry";
import { requirePublicToken } from "@/lib/auth/publicToken";

const BACKEND_URL = process.env.BACKEND_AI_URL || "http://localhost:5000";

interface CardInput {
  name: string;
  isReversed: boolean;
  position: string;
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

    // Call Python backend for Hybrid RAG interpretation
    const backendResponse = await fetch(`${BACKEND_URL}/api/tarot/interpret`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
        // Premium personalization (Tier 4-6)
        birthdate,      // User's birthdate for birth card / year card calculation
        moon_phase: moonPhase  // Current moon phase for realtime context
      })
    });

    if (!backendResponse.ok) {
      // Fallback to basic interpretation if backend is unavailable
      console.warn("Backend unavailable, using fallback interpretation");
      const fallbackResult = generateFallbackInterpretation(cards, spreadTitle, language);
      const res = NextResponse.json(fallbackResult);
      limit.headers.forEach((value, key) => res.headers.set(key, value));
      return res;
    }

    const interpretation = await backendResponse.json();
    const res = NextResponse.json(interpretation);
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

  return {
    overall_message: isKorean
      ? `${spreadTitle} 리딩에서 ${cards.length}장의 카드가 나왔습니다. 각 카드의 의미를 종합하여 당신의 상황을 해석해보세요.`
      : `Your ${spreadTitle} reading revealed ${cards.length} cards. Consider the meaning of each card in relation to your question.`,

    card_insights: cards.map((card) => ({
      position: card.position,
      card_name: card.name,
      is_reversed: card.isReversed,
      interpretation: isKorean
        ? `${card.position} 위치에 ${card.name}${card.isReversed ? " (역방향)" : ""}이(가) 나왔습니다.`
        : `${card.name}${card.isReversed ? " (Reversed)" : ""} appeared in the ${card.position} position.`,
      spirit_animal: null,
      chakra: null,
      element: null,
      shadow: null
    })),

    guidance: isKorean
      ? "카드의 메시지에 마음을 열고 직관을 믿으세요."
      : "Open your heart to the cards' messages and trust your intuition.",

    affirmation: isKorean
      ? "나는 내 안의 지혜를 신뢰합니다."
      : "I trust the wisdom within me.",

    combinations: [],
    followup_questions: isKorean
      ? ["이 카드들이 전하는 핵심 메시지는 무엇인가요?", "구체적인 행동 조언이 있나요?"]
      : ["What is the core message of these cards?", "Any specific action advice?"],

    fallback: true
  };
}
