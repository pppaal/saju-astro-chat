// src/app/api/tarot/chat/stream/route.ts
// Streaming Tarot Chat API - Real-time SSE proxy to backend

import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { requirePublicToken } from "@/lib/auth/publicToken";
import { enforceBodySize } from "@/lib/http";

function pickBackendUrl() {
  const url =
    process.env.AI_BACKEND_URL ||
    process.env.BACKEND_AI_URL ||
    process.env.NEXT_PUBLIC_AI_BACKEND ||
    "http://localhost:5000";
  if (!url.startsWith("https://") && process.env.NODE_ENV === "production") {
    console.warn("[tarot chat-stream] Using non-HTTPS AI backend in production");
  }
  if (process.env.NEXT_PUBLIC_AI_BACKEND && !process.env.AI_BACKEND_URL) {
    console.warn("[tarot chat-stream] NEXT_PUBLIC_AI_BACKEND is public; prefer AI_BACKEND_URL");
  }
  return url;
}

interface CardContext {
  position: string;
  name: string;
  isReversed?: boolean;
  is_reversed?: boolean;
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
  role: "user" | "assistant" | "system";
  content: string;
}

interface StreamRequest {
  messages: ChatMessage[];
  context: TarotContext;
  language?: "ko" | "en";
}

const ALLOWED_TAROT_LANG = new Set(["ko", "en"]);
const ALLOWED_TAROT_ROLES = new Set<ChatMessage["role"]>(["user", "assistant", "system"]);
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_CARD_COUNT = 20;
const MAX_CARD_TEXT = 400;
const MAX_TITLE_TEXT = 200;
const MAX_GUIDANCE_TEXT = 1200;
const MAX_KEYWORD_LEN = 60;

function cleanStringArray(value: unknown, maxItems = 20, maxLen = MAX_KEYWORD_LEN): string[] {
  if (!Array.isArray(value)) return [];
  const cleaned: string[] = [];
  for (const entry of value.slice(0, maxItems)) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (!trimmed) continue;
    cleaned.push(trimmed.slice(0, maxLen));
  }
  return cleaned;
}

function normalizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const normalized: ChatMessage[] = [];
  for (const m of raw.slice(-MAX_MESSAGES)) {
    if (!m || typeof m !== "object") continue;
    const role = typeof (m as any).role === "string" && ALLOWED_TAROT_ROLES.has((m as any).role)
      ? (m as any).role as ChatMessage["role"]
      : null;
    const content = typeof (m as any).content === "string" ? (m as any).content.trim() : "";
    if (!role || !content) continue;
    normalized.push({ role, content: content.slice(0, MAX_MESSAGE_LENGTH) });
  }
  return normalized;
}

function sanitizeCards(raw: unknown): CardContext[] {
  if (!Array.isArray(raw)) return [];
  const cards: CardContext[] = [];
  for (const card of raw.slice(0, MAX_CARD_COUNT)) {
    if (!card || typeof card !== "object") continue;
    const position = typeof (card as any).position === "string" ? (card as any).position.trim().slice(0, MAX_TITLE_TEXT) : "";
    const name = typeof (card as any).name === "string" ? (card as any).name.trim().slice(0, MAX_TITLE_TEXT) : "";
    const meaning = typeof (card as any).meaning === "string" ? (card as any).meaning.trim().slice(0, MAX_CARD_TEXT) : "";
    if (!position || !name || !meaning) continue;
    const isReversed = Boolean((card as any).is_reversed ?? (card as any).isReversed);
    const keywords = cleanStringArray((card as any).keywords);
    cards.push({
      position,
      name,
      is_reversed: isReversed,
      meaning,
      keywords,
    });
  }
  return cards;
}

function sanitizeContext(raw: unknown): TarotContext | null {
  if (!raw || typeof raw !== "object") return null;
  const spread_title = typeof (raw as any).spread_title === "string" ? (raw as any).spread_title.trim().slice(0, MAX_TITLE_TEXT) : "";
  const category = typeof (raw as any).category === "string" ? (raw as any).category.trim().slice(0, MAX_TITLE_TEXT) : "";
  const cards = sanitizeCards((raw as any).cards);
  const overall_message = typeof (raw as any).overall_message === "string" ? (raw as any).overall_message.trim().slice(0, MAX_GUIDANCE_TEXT) : "";
  const guidance = typeof (raw as any).guidance === "string" ? (raw as any).guidance.trim().slice(0, MAX_GUIDANCE_TEXT) : "";

  if (!spread_title || !category || cards.length === 0) {
    return null;
  }

  return { spread_title, category, cards, overall_message, guidance };
}

function buildSystemInstruction(context: TarotContext, language: "ko" | "en") {
  const cardLines = context.cards
    .map((c, idx) => {
      const pos = c.position || `Card ${idx + 1}`;
      const orient = c.is_reversed ?? c.isReversed ? (language === "ko" ? "역위" : "reversed") : (language === "ko" ? "정위" : "upright");
      return `- ${pos}: ${c.name} (${orient})`;
    })
    .join("\n");

  const baseKo = [
    "너는 타로 상담사다. 항상 실제로 뽑힌 카드와 위치를 근거로 이야기해.",
    "출력 형식:",
    "1) 한 줄 핵심 메시지(카드·포지션을 명시)",
    "2) 카드별 해석 3줄 이내: 카드명/포지션/정위·역위 근거 + 의미(왜 그렇게 해석하는지 포함)",
    "3) 실행 가능한 행동 제안 2~3개 (오늘/이번주 등 구체적 시간·행동)",
    "4) 후속 질문 1개로 마무리",
    "안전: 의료/법률/투자/응급 상황은 전문 상담을 권유하고 조언은 일반 정보임을 명시해.",
    "길이: 전체 160단어(또는 8문장) 이내, 불필요한 영성 어휘 줄이고 현실적 조언을 줘.",
    "항상 카드 이름과 포지션을 인용하고, 카드가 왜 그런 조언을 주는지 명확히 설명해.",
    "스프레드와 카드 목록:",
    `스프레드: ${context.spread_title} (${context.category})`,
    cardLines || "(카드 없음)"
  ].join("\n");

  const baseEn = [
    "You are a tarot counselor. Always ground the response in the drawn cards and their positions.",
    "Output format:",
    "1) One-line core message (cite card + position)",
    "2) Card insights in <=3 lines: name/position/upright|reversed + meaning + why it implies that",
    "3) 2–3 actionable steps with concrete timeframes",
    "4) End with one follow-up question.",
    "Safety: for medical/legal/finance/emergency, add a disclaimer and suggest professional help.",
    "Length: keep it within ~160 words (<=8 sentences); minimize fluffy mysticism and favor practical advice.",
    "Always cite the card and position, and explain why the card supports the advice.",
    "Spread and cards:",
    `Spread: ${context.spread_title} (${context.category})`,
    cardLines || "(no cards)"
  ].join("\n");

  return language === "ko" ? baseKo : baseEn;
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`tarot-chat-stream:${ip}`, { limit: 30, windowSeconds: 60 });

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

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "invalid_body" },
        { status: 400, headers: limit.headers }
      );
    }

    const language = typeof (body as any).language === "string" && ALLOWED_TAROT_LANG.has((body as any).language)
      ? (body as any).language as "ko" | "en"
      : "ko";
    const messages = normalizeMessages((body as any).messages);
    const context = sanitizeContext((body as any).context);

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Missing messages" },
        { status: 400, headers: limit.headers }
      );
    }
    if (!context) {
      return NextResponse.json(
        { error: "Invalid tarot context" },
        { status: 400, headers: limit.headers }
      );
    }

    // Call backend streaming endpoint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    // Inject system guardrails for consistent, card-grounded answers
    const systemInstruction = buildSystemInstruction(context, language);
    const messagesWithSystem: ChatMessage[] = [
      { role: "system", content: systemInstruction },
      ...messages,
    ];

    let backendResponse: Response;
    try {
      backendResponse = await fetch(`${pickBackendUrl()}/api/tarot/chat-stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.ADMIN_API_TOKEN || ""}`
        },
        body: JSON.stringify({
          messages: messagesWithSystem,
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
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error("[TarotChatStream] Backend connection failed, using fallback:", fetchError);

      // Generate fallback response based on context
      const lastUserMessage = messages.filter(m => m.role === "user").pop()?.content || "";
      const cardSummary = context.cards.map(c => `${c.position}: ${c.name}`).join(", ");

      const fallbackMessage = language === "ko"
        ? `${context.spread_title} 리딩에서 ${cardSummary} 카드가 나왔네요. "${lastUserMessage}"에 대해 말씀드리면, 카드들이 전하는 메시지는 ${context.overall_message || "내면의 지혜를 믿으라는 것"}입니다. ${context.guidance || "카드의 조언에 귀 기울여보세요."}\n\n다음으로 물어볼 것: 특정 카드에 대해 더 자세히 알고 싶으신가요?`
        : `In your ${context.spread_title} reading with ${cardSummary}, regarding "${lastUserMessage}", the cards suggest: ${context.overall_message || "trust your inner wisdom"}. ${context.guidance || "Listen to the guidance of the cards."}\n\nNext question: Would you like to explore any specific card in more detail?`;

      // Return as SSE stream format for consistency
      const encoder = new TextEncoder();
      const fallbackStream = new ReadableStream({
        start(controller) {
          const data = `data: ${JSON.stringify({ content: fallbackMessage, done: true })}\n\n`;
          controller.enqueue(encoder.encode(data));
          controller.close();
        }
      });

      return new Response(fallbackStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "X-Fallback": "1",
          ...Object.fromEntries(limit.headers.entries())
        }
      });
    }

    clearTimeout(timeoutId);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error("[TarotChatStream] Backend error:", backendResponse.status, errorText);

      // Return fallback instead of error
      const lastUserMessage = messages.filter(m => m.role === "user").pop()?.content || "";
      const fallbackMessage = language === "ko"
        ? `"${lastUserMessage}"에 대해 카드가 전하는 메시지를 전해드릴게요. ${context.overall_message || "지금은 내면의 직관을 믿을 때입니다."} 다른 질문이 있으시면 말씀해주세요.`
        : `Regarding "${lastUserMessage}", the cards suggest: ${context.overall_message || "Trust your intuition at this time."} Feel free to ask another question.`;

      const encoder = new TextEncoder();
      const fallbackStream = new ReadableStream({
        start(controller) {
          const data = `data: ${JSON.stringify({ content: fallbackMessage, done: true })}\n\n`;
          controller.enqueue(encoder.encode(data));
          controller.close();
        }
      });

      return new Response(fallbackStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "X-Fallback": "1",
          ...Object.fromEntries(limit.headers.entries())
        }
      });
    }

    // Check if response is SSE
    const contentType = backendResponse.headers.get("content-type");
    if (!contentType?.includes("text/event-stream")) {
      // Fallback to regular JSON response
      const data = await backendResponse.json();
      return NextResponse.json(data, { headers: { ...Object.fromEntries(limit.headers.entries()), "X-Fallback": "1" } });
    }

    // Stream the SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = backendResponse.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Pass through the SSE data
            const text = decoder.decode(value, { stream: true });
            controller.enqueue(encoder.encode(text));
          }
        } catch (error) {
          console.error("[TarotChatStream] Stream error:", error);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        ...Object.fromEntries(limit.headers.entries())
      }
    });

  } catch (err: unknown) {
    console.error("Tarot chat stream error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
