// src/app/api/tarot/chat/stream/route.ts
// Streaming Tarot Chat API - Real-time SSE proxy to backend

import { NextResponse } from "next/server";
import { getBackendUrl as pickBackendUrl } from "@/lib/backend-url";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { requirePublicToken } from "@/lib/auth/publicToken";
import { enforceBodySize } from "@/lib/http";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import { checkAndConsumeCredits, creditErrorResponse } from "@/lib/credits/withCredits";
import {
  cleanStringArray,
  normalizeMessages as normalizeMessagesBase,
  type ChatMessage,
} from "@/lib/api";

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

const ALLOWED_TAROT_LANG = new Set(["ko", "en"]);
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_CARD_COUNT = 20;
const MAX_CARD_TEXT = 400;
const MAX_TITLE_TEXT = 200;
const MAX_GUIDANCE_TEXT = 1200;

// Use shared normalizeMessages with local config
function normalizeMessages(raw: unknown): ChatMessage[] {
  return normalizeMessagesBase(raw, {
    maxMessages: MAX_MESSAGES,
    maxLength: MAX_MESSAGE_LENGTH,
  });
}

function sanitizeCards(raw: unknown): CardContext[] {
  if (!Array.isArray(raw)) return [];
  const cards: CardContext[] = [];
  for (const card of raw.slice(0, MAX_CARD_COUNT)) {
    if (!card || typeof card !== "object") continue;
    const record = card as Record<string, unknown>;
    const position = typeof record.position === "string" ? record.position.trim().slice(0, MAX_TITLE_TEXT) : "";
    const name = typeof record.name === "string" ? record.name.trim().slice(0, MAX_TITLE_TEXT) : "";
    const meaning = typeof record.meaning === "string" ? record.meaning.trim().slice(0, MAX_CARD_TEXT) : "";
    if (!position || !name || !meaning) continue;
    const isReversed = Boolean((record.is_reversed ?? record.isReversed));
    const keywords = cleanStringArray(record.keywords);
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
  const record = raw as Record<string, unknown>;
  const spread_title = typeof record.spread_title === "string" ? record.spread_title.trim().slice(0, MAX_TITLE_TEXT) : "";
  const category = typeof record.category === "string" ? record.category.trim().slice(0, MAX_TITLE_TEXT) : "";
  const cards = sanitizeCards(record.cards);
  const overall_message = typeof record.overall_message === "string" ? record.overall_message.trim().slice(0, MAX_GUIDANCE_TEXT) : "";
  const guidance = typeof record.guidance === "string" ? record.guidance.trim().slice(0, MAX_GUIDANCE_TEXT) : "";

  if (!spread_title || !category || cards.length === 0) {
    return null;
  }

  return { spread_title, category, cards, overall_message, guidance };
}

interface PersonalityData {
  typeCode: string;
  personaName: string;
  energyScore: number;
  cognitionScore: number;
  decisionScore: number;
  rhythmScore: number;
  analysisData: {
    summary?: string;
    keyMotivations?: string[];
    strengths?: string[];
    challenges?: string[];
  };
}

function buildSystemInstruction(
  context: TarotContext,
  language: "ko" | "en",
  personality?: PersonalityData | null
) {
  const cardLines = context.cards
    .map((c, idx) => {
      const pos = c.position || `Card ${idx + 1}`;
      const orient = c.is_reversed ?? c.isReversed ? (language === "ko" ? "역위" : "reversed") : (language === "ko" ? "정위" : "upright");
      return `- ${pos}: ${c.name} (${orient})`;
    })
    .join("\n");

  // Personality context for counselor
  let personalityContext = "";
  if (personality) {
    const { typeCode, personaName, energyScore, cognitionScore, decisionScore, rhythmScore, analysisData } = personality;

    if (language === "ko") {
      personalityContext = [
        "\n\n사용자 성격 정보 (Nova Persona):",
        `- 페르소나: ${personaName} (${typeCode})`,
        `- 에너지: ${energyScore >= 50 ? 'Radiant(외향적)' : 'Grounded(내향적)'} ${energyScore}`,
        `- 인지: ${cognitionScore >= 50 ? 'Visionary(직관적)' : 'Structured(체계적)'} ${cognitionScore}`,
        `- 결정: ${decisionScore >= 50 ? 'Logic(논리적)' : 'Empathic(공감적)'} ${decisionScore}`,
        `- 리듬: ${rhythmScore >= 50 ? 'Flow(유동적)' : 'Anchor(안정적)'} ${rhythmScore}`,
        analysisData.keyMotivations ? `- 핵심 동기: ${analysisData.keyMotivations.slice(0, 2).join(', ')}` : "",
        analysisData.strengths ? `- 강점: ${analysisData.strengths.slice(0, 2).join(', ')}` : "",
        "\n이 성격 정보를 바탕으로 사용자의 성향에 맞춰 조언을 개인화해줘.",
        `예: ${energyScore >= 50 ? '외향적이므로 다른 사람과 함께하는 행동 제안' : '내향적이므로 혼자 성찰하는 시간 제안'}`,
        `${cognitionScore >= 50 ? '비전과 가능성 중심으로' : '구체적이고 단계별로'} 설명해줘.`,
      ].filter(Boolean).join("\n");
    } else {
      personalityContext = [
        "\n\nUser Personality (Nova Persona):",
        `- Persona: ${personaName} (${typeCode})`,
        `- Energy: ${energyScore >= 50 ? 'Radiant(extroverted)' : 'Grounded(introverted)'} ${energyScore}`,
        `- Cognition: ${cognitionScore >= 50 ? 'Visionary(intuitive)' : 'Structured(systematic)'} ${cognitionScore}`,
        `- Decision: ${decisionScore >= 50 ? 'Logic-focused' : 'Empathy-focused'} ${decisionScore}`,
        `- Rhythm: ${rhythmScore >= 50 ? 'Flow(flexible)' : 'Anchor(stable)'} ${rhythmScore}`,
        analysisData.keyMotivations ? `- Key motivations: ${analysisData.keyMotivations.slice(0, 2).join(', ')}` : "",
        analysisData.strengths ? `- Strengths: ${analysisData.strengths.slice(0, 2).join(', ')}` : "",
        "\nPersonalize advice based on this personality.",
        `E.g., ${energyScore >= 50 ? 'suggest social actions' : 'suggest introspective time'},`,
        `${cognitionScore >= 50 ? 'focus on vision and possibilities' : 'provide concrete step-by-step guidance'}.`,
      ].filter(Boolean).join("\n");
    }
  }

  const baseKo = [
    "너는 따뜻하고 통찰력 있는 타로 상담사다. 항상 실제로 뽑힌 카드와 위치를 근거로 깊이 있는 해석을 제공해.",
    "",
    "출력 형식 (반드시 모든 섹션을 포함할 것):",
    "1) 핵심 메시지: 카드명과 포지션을 명시하며 한 문장으로 핵심 통찰 전달",
    "",
    "2) 카드 해석 (각 카드별 4-5줄):",
    "   - 카드명, 포지션, 정위/역위 여부 명시",
    "   - 이 카드가 이 위치에서 갖는 전통적 의미",
    "   - 질문자의 상황에 맞춘 구체적 해석",
    "   - 카드의 상징과 이미지가 전하는 메시지",
    "",
    "3) 카드 조합 해석: 여러 카드가 함께 만들어내는 스토리와 시너지 설명 (2-3줄)",
    "",
    "4) 실행 가능한 조언 3가지:",
    "   - 오늘 할 수 있는 구체적 행동",
    "   - 이번 주 실천할 수 있는 것",
    "   - 장기적으로 염두에 둘 방향",
    "",
    "5) 마무리: 따뜻한 격려의 말과 함께 생각해볼 후속 질문 1개",
    "",
    "안전: 의료/법률/투자/응급 상황은 전문 상담을 권유하고 조언은 일반 정보임을 명시해.",
    "길이: 전체 300-400단어로 충실하게 작성. 각 섹션을 빠짐없이 포함할 것.",
    "톤: 신비롭지만 현실적이고, 공감하면서도 구체적인 조언을 제공.",
    personalityContext,
    "스프레드와 카드 목록:",
    `스프레드: ${context.spread_title} (${context.category})`,
    cardLines || "(카드 없음)"
  ].join("\n");

  const baseEn = [
    "You are a warm and insightful tarot counselor. Always ground your interpretations in the actual drawn cards and their positions.",
    "",
    "Output format (include ALL sections):",
    "1) Core Message: One sentence with card name and position, delivering the key insight",
    "",
    "2) Card Interpretation (4-5 lines per card):",
    "   - State card name, position, and upright/reversed",
    "   - Traditional meaning of this card in this position",
    "   - Specific interpretation tailored to the querent's situation",
    "   - Symbolic imagery and what message it conveys",
    "",
    "3) Card Combination: Explain the story and synergy created by multiple cards together (2-3 lines)",
    "",
    "4) Three Actionable Steps:",
    "   - Something concrete to do today",
    "   - Something to practice this week",
    "   - A long-term direction to keep in mind",
    "",
    "5) Closing: Warm encouragement with one follow-up question to ponder",
    "",
    "Safety: For medical/legal/financial/emergency matters, recommend professional help and note this is general guidance.",
    "Length: Write thoroughly in 300-400 words. Include every section without skipping.",
    "Tone: Mystical yet practical, empathetic yet specific in advice.",
    personalityContext,
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

    const oversized = enforceBodySize(req, 256 * 1024, limit.headers);
    if (oversized) return oversized;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "invalid_body" },
        { status: 400, headers: limit.headers }
      );
    }

    const bodyObj = body as Record<string, unknown>;
    const language = typeof bodyObj.language === "string" && ALLOWED_TAROT_LANG.has(bodyObj.language)
      ? (bodyObj.language as "ko" | "en")
      : "ko";
    const messages = normalizeMessages(bodyObj.messages);
    const context = sanitizeContext(bodyObj.context);
    const counselorId = typeof bodyObj.counselor_id === "string" ? bodyObj.counselor_id : undefined;
    const counselorStyle = typeof bodyObj.counselor_style === "string" ? bodyObj.counselor_style : undefined;

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

    // Check credits and consume (required for chat)
    const creditResult = await checkAndConsumeCredits("reading", 1);
    if (!creditResult.allowed) {
      const res = creditErrorResponse(creditResult);
      limit.headers.forEach((value, key) => res.headers.set(key, value));
      return res;
    }

    // Fetch user's personality result (if authenticated)
    let personalityData: PersonalityData | null = null;
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        const personalityResult = await prisma.personalityResult.findUnique({
          where: { userId: session.user.id },
          select: {
            typeCode: true,
            personaName: true,
            energyScore: true,
            cognitionScore: true,
            decisionScore: true,
            rhythmScore: true,
            analysisData: true,
          },
        });

        if (personalityResult && personalityResult.analysisData) {
          const analysisData = personalityResult.analysisData as Record<string, unknown>;
          personalityData = {
            typeCode: personalityResult.typeCode,
            personaName: personalityResult.personaName,
            energyScore: personalityResult.energyScore,
            cognitionScore: personalityResult.cognitionScore,
            decisionScore: personalityResult.decisionScore,
            rhythmScore: personalityResult.rhythmScore,
            analysisData: {
              summary: typeof analysisData.summary === 'string' ? analysisData.summary : undefined,
              keyMotivations: Array.isArray(analysisData.keyMotivations)
                ? analysisData.keyMotivations.filter((x): x is string => typeof x === 'string')
                : undefined,
              strengths: Array.isArray(analysisData.strengths)
                ? analysisData.strengths.filter((x): x is string => typeof x === 'string')
                : undefined,
              challenges: Array.isArray(analysisData.challenges)
                ? analysisData.challenges.filter((x): x is string => typeof x === 'string')
                : undefined,
            },
          };
        }
      }
    } catch (err) {
      console.error("[TarotChatStream] Failed to fetch personality:", err);
      // Continue without personality data
    }

    // Call backend streaming endpoint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    // Inject system guardrails for consistent, card-grounded answers with personality
    const systemInstruction = buildSystemInstruction(context, language, personalityData);
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
          language,
          counselor_id: counselorId,
          counselor_style: counselorStyle
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
