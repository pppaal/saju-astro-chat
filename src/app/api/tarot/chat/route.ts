// src/app/api/tarot/chat/route.ts
// Tarot Chat API - Follow-up conversation about tarot readings

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
    console.warn("[tarot chat] Using non-HTTPS AI backend in production");
  }
  if (process.env.NEXT_PUBLIC_AI_BACKEND && !process.env.AI_BACKEND_URL) {
    console.warn("[tarot chat] NEXT_PUBLIC_AI_BACKEND is public; prefer AI_BACKEND_URL");
  }
  return url;
}

interface CardContext {
  position: string;
  name: string;
  isReversed?: boolean;   // camelCase (old)
  is_reversed?: boolean;  // snake_case (new)
  meaning: string;
  keywords?: string[];
}

interface TarotContext {
  spread_title: string;
  category: string;
  cards: CardContext[];
  overall_message: string;
  guidance: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  context: TarotContext;
  language?: "ko" | "en";
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`tarot-chat:${ip}`, { limit: 20, windowSeconds: 60 });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
        { status: 429, headers: limit.headers }
      );
    }

    if (!requirePublicToken(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const body: ChatRequest = await req.json();
    const { messages, context, language = "ko" } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Missing messages" },
        { status: 400, headers: limit.headers }
      );
    }

    // Call Python backend for chat (with fallback on connection failure)
    let backendData: { reply?: string } | null = null;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const backendResponse = await fetch(`${pickBackendUrl()}/api/tarot/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.ADMIN_API_TOKEN || ""}`
        },
        body: JSON.stringify({
          messages,
          context: {
            spread_title: context.spread_title,
            category: context.category,
            cards: context.cards.map(c => ({
              position: c.position,
              name: c.name,
              is_reversed: c.is_reversed ?? c.isReversed ?? false,
              meaning: c.meaning,
              keywords: c.keywords || []
            })),
            overall_message: context.overall_message,
            guidance: context.guidance
          },
          language
        }),
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeoutId);

      if (backendResponse.ok) {
        backendData = await backendResponse.json();
      }
    } catch (fetchError) {
      console.warn("Backend connection failed, using fallback:", fetchError);
    }

    // Use backend response or fallback
    if (backendData?.reply) {
      const res = NextResponse.json({ reply: backendData.reply });
      limit.headers.forEach((value, key) => res.headers.set(key, value));
      return res;
    }

    // Fallback response
    console.warn("Using fallback chat response");
    const fallbackReply = generateFallbackReply(messages, context, language);
    const res = NextResponse.json({ reply: fallbackReply });
    limit.headers.forEach((value, key) => res.headers.set(key, value));
    return res;

  } catch (err: unknown) {
    captureServerError(err as Error, { route: "/api/tarot/chat" });
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("Tarot chat error:", errorMessage, err);
    return NextResponse.json(
      { error: "Server error", detail: process.env.NODE_ENV === "development" ? errorMessage : undefined },
      { status: 500 }
    );
  }
}

// Fallback response when backend is unavailable
function generateFallbackReply(
  messages: ChatMessage[],
  context: TarotContext,
  language: string
): string {
  const isKorean = language === "ko";
  const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || "";

  // Check for common intents
  const wantsMoreCards = lastMessage.includes("더 뽑") || lastMessage.includes("more card") || lastMessage.includes("draw");
  const asksAboutLove = lastMessage.includes("연애") || lastMessage.includes("사랑") || lastMessage.includes("love") || lastMessage.includes("relationship");
  const asksAboutCareer = lastMessage.includes("직장") || lastMessage.includes("직업") || lastMessage.includes("career") || lastMessage.includes("work") || lastMessage.includes("job");

  if (wantsMoreCards) {
    return isKorean
      ? `현재 ${context.spread_title} 스프레드로 ${context.cards.length}장의 카드를 뽑으셨습니다. 추가 카드를 뽑으시려면 새로운 리딩을 시작해 주세요. 지금 뽑은 카드들의 메시지에 먼저 집중해 보시는 것도 좋습니다.`
      : `You've drawn ${context.cards.length} cards with the ${context.spread_title} spread. To draw additional cards, please start a new reading. Consider focusing on the messages from your current cards first.`;
  }

  if (asksAboutLove) {
    const loveCard = context.cards.find(c =>
      c.name.toLowerCase().includes("lovers") ||
      c.name.toLowerCase().includes("cups") ||
      c.name.toLowerCase().includes("empress")
    );

    if (loveCard) {
      return isKorean
        ? `당신의 리딩에서 ${loveCard.name} 카드가 연애와 관계에 대한 중요한 메시지를 담고 있습니다. ${loveCard.meaning} 이 카드는 현재 당신의 감정 상태와 관계의 방향을 보여줍니다.`
        : `In your reading, ${loveCard.name} holds important messages about love and relationships. ${loveCard.meaning} This card reflects your current emotional state and relationship direction.`;
    }

    return isKorean
      ? `현재 리딩된 카드들을 연애 관점에서 보면, 전반적인 메시지는 다음과 같습니다: ${context.overall_message}`
      : `Looking at your cards from a love perspective, the overall message is: ${context.overall_message}`;
  }

  if (asksAboutCareer) {
    const careerCard = context.cards.find(c =>
      c.name.toLowerCase().includes("pentacles") ||
      c.name.toLowerCase().includes("emperor") ||
      c.name.toLowerCase().includes("wheel")
    );

    if (careerCard) {
      return isKorean
        ? `당신의 리딩에서 ${careerCard.name} 카드가 직업과 경력에 대한 통찰을 제공합니다. ${careerCard.meaning}`
        : `In your reading, ${careerCard.name} provides insight about your career and work. ${careerCard.meaning}`;
    }

    return isKorean
      ? `직업적 관점에서 보면, 카드들이 전하는 메시지는: ${context.guidance}`
      : `From a career perspective, the cards' guidance is: ${context.guidance}`;
  }

  // Default response - build from actual card data
  const cardSummary = context.cards
    .map(c => {
      const reversed = (c.is_reversed ?? c.isReversed) ? "(역방향)" : "";
      return `${c.position}: ${c.name}${reversed}`;
    })
    .join(", ");

  if (context.overall_message && context.guidance) {
    return isKorean
      ? `${context.spread_title} 리딩에서 ${cardSummary} 카드가 나왔습니다. ${context.overall_message} ${context.guidance}`
      : `Your ${context.spread_title} reading shows: ${cardSummary}. ${context.overall_message} ${context.guidance}`;
  }

  // If no interpretation available, give card-based response
  const firstCard = context.cards[0];
  if (firstCard) {
    return isKorean
      ? `${context.spread_title} 리딩에서 ${cardSummary} 카드가 나왔습니다. 특히 ${firstCard.position}에 나온 ${firstCard.name} 카드는 "${firstCard.meaning}" 을 의미합니다. 질문에 대해 더 구체적으로 물어보시면 상세한 해석을 드릴 수 있습니다.`
      : `Your ${context.spread_title} reading shows: ${cardSummary}. The ${firstCard.name} in ${firstCard.position} means "${firstCard.meaning}". Ask more specific questions for detailed interpretation.`;
  }

  return isKorean
    ? "카드 정보를 불러오는 중 문제가 발생했습니다. 다시 시도해 주세요."
    : "There was an issue loading card information. Please try again.";
}
