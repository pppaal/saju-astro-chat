import { getServerSession } from "next-auth";
import { getBackendUrl as pickBackendUrl } from "@/lib/backend-url";
import { authOptions } from "@/lib/auth/authOptions";
import { apiGuard } from "@/lib/apiGuard";
import { guardText, containsForbidden, safetyMessage } from "@/lib/textGuards";
import { sanitizeLocaleText, maskTextWithName } from "@/lib/destiny-map/sanitize";
import { enforceBodySize } from "@/lib/http";
import { checkAndConsumeCredits, creditErrorResponse } from "@/lib/credits/withCredits";
import { normalizeMessages as normalizeMessagesBase, type ChatMessage } from "@/lib/api";

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

export async function POST(request: Request) {
  try {
    const guard = await apiGuard(request, { path: "astrology-chat-stream", limit: 60, windowSeconds: 60 });
    if (guard instanceof Response) return guard;

    // Dev mode: skip auth check
    const isDev = process.env.NODE_ENV === "development";
    if (!isDev) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        return new Response(JSON.stringify({ error: "not_authenticated" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const oversized = enforceBodySize(request, BODY_LIMIT);
    if (oversized) return oversized;

    const body = (await request.json().catch(() => null)) as {
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
      return new Response(JSON.stringify({ error: "invalid_body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
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
    const lang = typeof body.lang === "string" && ALLOWED_LANG.has(body.lang) ? body.lang : "ko";
    const messages = normalizeMessages(body.messages);
    const astro = typeof body.astro === "object" && body.astro !== null ? body.astro : undefined;
    const userContext = typeof body.userContext === "string"
      ? body.userContext.slice(0, 1000)
      : undefined;

    if (!birthDate || !birthTime || !DATE_RE.test(birthDate) || !TIME_RE.test(birthTime)) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return new Response(JSON.stringify({ error: "Invalid coordinates" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!messages.length) {
      return new Response(JSON.stringify({ error: "Missing messages" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check credits and consume (required for chat)
    const creditResult = await checkAndConsumeCredits("reading", 1);
    if (!creditResult.allowed) {
      return creditErrorResponse(creditResult);
    }

    const trimmedHistory = clampMessages(messages);

    // Safety check
    const lastUser = [...trimmedHistory].reverse().find((m) => m.role === "user");
    if (lastUser && containsForbidden(lastUser.content)) {
      const encoder = new TextEncoder();
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${safetyMessage(lang)}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        }),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        }
      );
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

    // Call backend streaming endpoint
    const backendUrl = pickBackendUrl();
    const apiKey = process.env.ADMIN_API_TOKEN || "";

    // Get session_id from header for RAG cache
    const sessionId = request.headers.get("x-session-id") || undefined;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const backendResponse = await fetch(`${backendUrl}/astrology/ask-stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        theme,
        prompt: chatPrompt,
        locale: lang,
        astro: astro || undefined,
        birth: { date: birthDate, time: birthTime, gender, lat: latitude, lon: longitude },
        history: trimmedHistory.filter((m) => m.role !== "system"),
        session_id: sessionId,
        user_context: userContext || undefined,
        counselor_type: "astrology", // Indicate astrology-only mode
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!backendResponse.ok || !backendResponse.body) {
      const encoder = new TextEncoder();
      const fallback = lang === "ko"
        ? "AI 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."
        : "Could not connect to AI service. Please try again.";
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${fallback}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        }),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "X-Fallback": "1",
          },
        }
      );
    }

    // Relay the stream from backend to frontend with sanitization
    const encoder = new TextEncoder();
    const sanitizedStream = new ReadableStream({
      start(controller) {
        const reader = backendResponse.body!.getReader();
        const decoder = new TextDecoder();
        const read = (): void => {
          reader.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }
            const chunk = decoder.decode(value, { stream: true });
            const masked = maskTextWithName(sanitizeLocaleText(chunk, lang), name);
            controller.enqueue(encoder.encode(masked));
            read();
          }).catch((err) => {
            console.error("[astrology chat-stream sanitize error]", err);
            controller.close();
          });
        };
        read();
      },
    });

    return new Response(sanitizedStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Fallback": backendResponse.headers.get("x-fallback") || "0",
      },
    });
  } catch (err: unknown) {
    console.error("[Astrology Chat-Stream API error]", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
