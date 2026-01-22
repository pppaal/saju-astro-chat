import { NextRequest, NextResponse } from "next/server";
import { initializeApiContext, createAuthenticatedGuard } from "@/lib/api/middleware";
import { createTransformedSSEStream, createFallbackSSEStream } from "@/lib/streaming";
import { apiClient } from "@/lib/api/ApiClient";
import { guardText, containsForbidden, safetyMessage } from "@/lib/textGuards";
import { sanitizeLocaleText, maskTextWithName } from "@/lib/destiny-map/sanitize";
import { normalizeMessages as normalizeMessagesBase, type ChatMessage } from "@/lib/api";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_LANG = new Set(["ko", "en"]);
const ALLOWED_GENDER = new Set(["male", "female", "other"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const MAX_NAME = 120;
const MAX_THEME = 64;
const MAX_MESSAGE_LEN = 2000;
const MAX_MESSAGES = 10;
const BODY_LIMIT = 64 * 1024;

function clampMessages(messages: ChatMessage[], max = 6) {
  return messages.slice(-max);
}

// Use shared normalizeMessages with local config
function normalizeMessages(raw: unknown): ChatMessage[] {
  return normalizeMessagesBase(raw, {
    maxMessages: MAX_MESSAGES,
    maxLength: MAX_MESSAGE_LEN,
  });
}

function astrologyCounselorSystemPrompt(lang: string) {
  const base = [
    "You are a Western Astrology counselor specializing in birth chart analysis and planetary transits.",
    "",
    "ABSOLUTE RULES:",
    "1. NO GREETING - Start directly with analysis. Never say 'welcome', 'hello', etc.",
    "2. Focus ONLY on Western Astrology - do NOT mix with Eastern fortune-telling like Saju",
    "3. Use proper astrological terminology (signs, houses, aspects, transits)",
    "4. Include specific planetary positions and aspects when relevant",
    "",
    "Response format (START IMMEDIATELY, no greeting):",
    "【Sun/Moon】 Core personality from Sun and Moon signs",
    "【Rising】 Ascendant influence on outer persona",
    "【Transits】 Current planetary transits and their effects",
    "【Houses】 Relevant house placements for the question",
    "【Guidance】 2-3 practical actions based on chart reading",
    "",
    "Length: 200-300 words.",
  ];
  return lang === "ko"
    ? [
        "너는 서양 점성술 전문 상담사다. 출생 차트 분석과 행성 트랜짓 전문가야.",
        "",
        "절대 규칙:",
        "1. 인사 금지 - '안녕하세요', '반가워요' 등 인사 없이 바로 분석 시작. 첫 문장부터 【태양/달】으로 시작해.",
        "2. 서양 점성술에만 집중 - 사주 같은 동양 역술과 섞지 마.",
        "3. 점성술 용어를 적절히 사용해 (별자리, 하우스, 애스펙트, 트랜짓 등)",
        "4. 관련된 행성 위치와 각도를 구체적으로 언급해.",
        "",
        "응답 형식 (인사 없이 바로):",
        "【태양/달】 태양과 달 별자리의 핵심 성격",
        "【상승궁】 어센던트가 외적 페르소나에 미치는 영향",
        "【트랜짓】 현재 행성 트랜짓과 그 영향",
        "【하우스】 질문과 관련된 하우스 배치",
        "【조언】 차트 분석 기반 2-3개 실천 조언",
        "",
        "길이: 200-300단어.",
      ].join("\n")
    : base.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    // Apply middleware: authentication + rate limiting + credit consumption
    const guardOptions = createAuthenticatedGuard({
      route: "astrology-chat-stream",
      limit: 60,
      windowSeconds: 60,
      requireCredits: true,
      creditType: "reading",
      creditAmount: 1,
    });

    const { context, error } = await initializeApiContext(req, guardOptions);
    if (error) return error;

    const body = (await req.json().catch(() => null)) as {
      name?: string;
      birthDate?: string;
      birthTime?: string;
      gender?: string;
      latitude?: number | string;
      longitude?: number | string;
      theme?: string;
      lang?: string;
      messages?: unknown;
      astro?: unknown;
      userContext?: string;
    } | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_NAME) : undefined;
    const birthDate = typeof body.birthDate === "string" ? body.birthDate.trim().slice(0, 10) : "";
    const birthTime = typeof body.birthTime === "string" ? body.birthTime.trim().slice(0, 5) : "";
    const gender = typeof body.gender === "string" && ALLOWED_GENDER.has(body.gender)
      ? body.gender
      : "male";
    const latitude = typeof body.latitude === "number" ? body.latitude : Number(body.latitude);
    const longitude = typeof body.longitude === "number" ? body.longitude : Number(body.longitude);
    const themeRaw = typeof body.theme === "string" ? body.theme.trim() : "life";
    const theme = themeRaw.slice(0, MAX_THEME) || "life";
    const lang = typeof body.lang === "string" && ALLOWED_LANG.has(body.lang) ? body.lang : context.locale;
    const messages = normalizeMessages(body.messages);
    const astro = typeof body.astro === "object" && body.astro !== null ? body.astro : undefined;
    const userContext = typeof body.userContext === "string"
      ? body.userContext.slice(0, 1000)
      : undefined;

    if (!birthDate || !birthTime || !DATE_RE.test(birthDate) || !TIME_RE.test(birthTime)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }
    if (!messages.length) {
      return NextResponse.json({ error: "Missing messages" }, { status: 400 });
    }

    // Credits already consumed by middleware

    const trimmedHistory = clampMessages(messages);

    // Safety check
    const lastUser = [...trimmedHistory].reverse().find((m) => m.role === "user");
    if (lastUser && containsForbidden(lastUser.content)) {
      return createFallbackSSEStream({
        content: safetyMessage(lang),
        done: true,
      });
    }

    // Build conversation context
    const historyText = trimmedHistory
      .filter((m) => m.role !== "system")
      .map((m) => `${m.role === "user" ? "Q" : "A"}: ${guardText(m.content, 300)}`)
      .join("\n")
      .slice(0, 1500);

    const userQuestion = lastUser ? guardText(lastUser.content, 500) : "";

    // Build astrology-focused prompt
    const chatPrompt = [
      astrologyCounselorSystemPrompt(lang),
      `Name: ${name || "User"}`,
      `Birth: ${birthDate} ${birthTime}`,
      `Gender: ${gender}`,
      `Location: lat=${latitude}, lon=${longitude}`,
      `Theme: ${theme}`,
      historyText ? `\nConversation:\n${historyText}` : "",
      `\nQuestion: ${userQuestion}`,
    ]
      .filter(Boolean)
      .join("\n");

    // Get session_id from header for RAG cache
    const sessionId = req.headers.get("x-session-id") || undefined;

    // Call backend streaming endpoint using apiClient
    const streamResult = await apiClient.postSSEStream("/astrology/ask-stream", {
      theme,
      prompt: chatPrompt,
      locale: lang,
      astro: astro || undefined,
      birth: { date: birthDate, time: birthTime, gender, lat: latitude, lon: longitude },
      history: trimmedHistory.filter((m) => m.role !== "system"),
      session_id: sessionId,
      user_context: userContext || undefined,
      counselor_type: "astrology", // Indicate astrology-only mode
    }, { timeout: 60000 });

    if (!streamResult.ok) {
      logger.error("[AstrologyChatStream] Backend error:", { status: streamResult.status, error: streamResult.error });

      const fallback = lang === "ko"
        ? "AI 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."
        : "Could not connect to AI service. Please try again.";

      return createFallbackSSEStream({
        content: fallback,
        done: true,
        "X-Fallback": "1"
      });
    }

    // Relay the stream from backend to frontend with sanitization
    return createTransformedSSEStream({
      source: streamResult.response,
      transform: (chunk) => {
        const masked = maskTextWithName(sanitizeLocaleText(chunk, lang), name);
        return masked;
      },
      route: "AstrologyChatStream",
      additionalHeaders: {
        "X-Fallback": streamResult.response.headers.get("x-fallback") || "0",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    logger.error("[Astrology Chat-Stream API error]", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
