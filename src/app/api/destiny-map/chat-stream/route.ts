import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { apiGuard } from "@/lib/apiGuard";
import { guardText, containsForbidden, safetyMessage } from "@/lib/textGuards";
import { sanitizeLocaleText, maskTextWithName } from "@/lib/destiny-map/sanitize";
import { enforceBodySize } from "@/lib/http";
import { calculateSajuData } from "@/lib/Saju/saju";
import { calculateNatalChart } from "@/lib/astrology";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const ALLOWED_LANG = new Set(["ko", "en"]);
const ALLOWED_ROLE = new Set(["system", "user", "assistant"]);
const ALLOWED_GENDER = new Set(["male", "female", "other", "prefer_not"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const MAX_THEME = 40;
const MAX_MESSAGES = 10;
const MAX_NAME = 80;
const MAX_CV = 1200;

function clampMessages(messages: ChatMessage[], max = 6) {
  return messages.slice(-max);
}

function pickBackendUrl() {
  const url =
    process.env.AI_BACKEND_URL ||
    process.env.NEXT_PUBLIC_AI_BACKEND ||
    "http://127.0.0.1:5000";
  if (!url.startsWith("https://") && process.env.NODE_ENV === "production") {
    console.warn("[destiny-map chat-stream] Using non-HTTPS AI backend in production");
  }
  if (process.env.NEXT_PUBLIC_AI_BACKEND && !process.env.AI_BACKEND_URL) {
    console.warn("[destiny-map chat-stream] NEXT_PUBLIC_AI_BACKEND is public; prefer AI_BACKEND_URL");
  }
  return url;
}

function counselorSystemPrompt(lang: string) {
  const base = [
    "You are DestinyPal's counselor combining Eastern (Saju) and Western (Astrology) wisdom.",
    "",
    "ABSOLUTE RULES:",
    "1. NO GREETING - Never say 'welcome', 'nice to see you', 'hello', etc.",
    "2. NO IDENTITY RECAP - NEVER start with 'Your day master is X' or 'You are a Y person'. The user already knows their chart. Jump straight to answering their question.",
    "3. ONLY use daeun/seun data provided in context - NEVER invent periods like '경금 대운'",
    "4. If data shows '辛卯', say '신묘', not something else",
    "5. Use BOTH saju AND astrology equally",
    "6. Be DETAILED and THOROUGH - provide deep analysis, not surface-level summaries",
    "",
    "Response style:",
    "- Answer the user's question DIRECTLY from the first sentence",
    "- Weave in saju and astrology insights naturally while answering",
    "- Explain the 'why' behind your analysis in detail",
    "- Include specific dates and timing when relevant",
    "- Provide actionable, concrete advice",
    "",
    "Length: 400-600 words. Be comprehensive.",
  ];
  return lang === "ko"
    ? [
        "너는 DestinyPal 상담사다.",
        "",
        "절대 규칙:",
        "1. 인사 금지 - '안녕하세요', '반가워요' 등 인사 절대 금지",
        "2. 신상 소개 금지 - '일간이 X입니다', '당신은 Y 성향' 같은 기본 설명 금지. 사용자는 자기 사주를 이미 안다. 바로 질문에 답해.",
        "3. 제공된 대운/세운 데이터만 사용 - '경금 대운' 같이 지어내지 마. 데이터에 있는 그대로만.",
        "4. 사주와 점성술 모두 균형있게 활용",
        "5. 피상적 요약 금지 - 깊이 있는 분석을 상세하게 설명해",
        "",
        "응답 스타일:",
        "- 첫 문장부터 사용자 질문에 바로 답변",
        "- 답변하면서 사주와 점성술 통찰을 자연스럽게 녹여내",
        "- '왜 그런지' 이유를 상세히 설명",
        "- 구체적인 날짜와 시기 포함",
        "- 실천 가능한 구체적 조언 제공",
        "",
        "길이: 400-600단어. 충분히 상세하게.",
      ].join("\n")
    : base.join("\n");
}

export async function POST(request: Request) {
  try {
    const oversized = enforceBodySize(request as any, 64 * 1024);
    if (oversized) return oversized;

    const guard = await apiGuard(request, { path: "destiny-map-chat-stream", limit: 60, windowSeconds: 60 });
    if (guard instanceof Response) return guard;

    // Dev mode: skip auth check (only for local dev)
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

    const body = await request.json().catch(() => null);
    if (!body) {
      return new Response(JSON.stringify({ error: "invalid_body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_NAME) : undefined;
    const birthDate = typeof body.birthDate === "string" ? body.birthDate.trim() : "";
    const birthTime = typeof body.birthTime === "string" ? body.birthTime.trim() : "";
    const gender = typeof body.gender === "string" && ALLOWED_GENDER.has(body.gender) ? body.gender : "male";
    const latitude = typeof body.latitude === "number" ? body.latitude : Number(body.latitude);
    const longitude = typeof body.longitude === "number" ? body.longitude : Number(body.longitude);
    const theme = typeof body.theme === "string" ? body.theme.trim().slice(0, MAX_THEME) : "chat";
    const lang = typeof body.lang === "string" && ALLOWED_LANG.has(body.lang) ? body.lang : "ko";
    const messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
    let saju = body.saju;
    let astro = body.astro;
    const advancedAstro = body.advancedAstro;  // Advanced astrology features
    const userContext = body.userContext;
    const cvText = typeof body.cvText === "string" ? body.cvText : "";

    if (!birthDate || !birthTime || latitude === undefined || longitude === undefined) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!DATE_RE.test(birthDate) || Number.isNaN(Date.parse(birthDate))) {
      return new Response(JSON.stringify({ error: "Invalid birthDate" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!TIME_RE.test(birthTime)) {
      return new Response(JSON.stringify({ error: "Invalid birthTime" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return new Response(JSON.stringify({ error: "Invalid latitude" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return new Response(JSON.stringify({ error: "Invalid longitude" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Compute saju if not provided or empty
    if (!saju || !saju.dayMaster) {
      try {
        const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul";
        saju = calculateSajuData(birthDate, birthTime, gender, "solar", userTz);
        console.log("[chat-stream] Computed saju:", saju?.dayMaster?.heavenlyStem);
      } catch (e) {
        console.warn("[chat-stream] Failed to compute saju:", e);
      }
    }

    // Compute astro if not provided or empty
    if (!astro || !astro.sun) {
      try {
        const [year, month, day] = birthDate.split("-").map(Number);
        const [hour, minute] = birthTime.split(":").map(Number);
        const natalData = await calculateNatalChart({
          year,
          month,
          date: day,
          hour,
          minute,
          latitude,
          longitude,
          timeZone: "Asia/Seoul", // Default timezone
        });
        // Transform planets array to expected format
        const getPlanet = (name: string) => natalData.planets.find((p) => p.name === name);
        astro = {
          sun: getPlanet("Sun"),
          moon: getPlanet("Moon"),
          mercury: getPlanet("Mercury"),
          venus: getPlanet("Venus"),
          mars: getPlanet("Mars"),
          jupiter: getPlanet("Jupiter"),
          saturn: getPlanet("Saturn"),
          ascendant: natalData.ascendant,
        };
        console.log("[chat-stream] Computed astro:", astro?.sun?.sign);
      } catch (e) {
        console.warn("[chat-stream] Failed to compute astro:", e);
      }
    }

    const normalizedMessages: ChatMessage[] = [];
    for (const m of messages) {
      if (!m || typeof m !== "object") continue;
      const role = typeof (m as any).role === "string" && ALLOWED_ROLE.has((m as any).role) ? ((m as any).role as ChatMessage["role"]) : null;
      const content = typeof (m as any).content === "string" ? (m as any).content.trim() : "";
      if (!role || !content) continue;
      normalizedMessages.push({ role, content: content.slice(0, 2000) });
    }

    const trimmedHistory = clampMessages(normalizedMessages);

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

    // Build simple conversation context (NO heavy computation)
    const historyText = trimmedHistory
      .filter((m) => m.role !== "system")
      .map((m) => `${m.role === "user" ? "Q" : "A"}: ${guardText(m.content, 300)}`)
      .join("\n")
      .slice(0, 1500);

    const userQuestion = lastUser ? guardText(lastUser.content, 500) : "";

    // Simple prompt - backend will add context
    const chatPrompt = [
      counselorSystemPrompt(lang),
      `Name: ${name || "User"}`,
      `Birth: ${birthDate} ${birthTime}`,
      `Gender: ${gender}`,
      `Theme: ${theme}`,
      // Include CV summary if provided (for career consultations)
      cvText ? `\nCV/Resume:\n${guardText(cvText, MAX_CV)}` : "",
      historyText ? `\nConversation:\n${historyText}` : "",
      `\nQuestion: ${userQuestion}`,
    ]
      .filter(Boolean)
      .join("\n");

    // Call backend streaming endpoint IMMEDIATELY (no heavy computation)
    const backendUrl = pickBackendUrl();
    const apiKey = process.env.ADMIN_API_TOKEN || "";

    // Get session_id from header for RAG cache
    const sessionId = request.headers.get("x-session-id") || undefined;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const backendResponse = await fetch(`${backendUrl}/ask-stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        theme,
        prompt: chatPrompt,
        locale: lang,
        // Pass pre-computed chart data if available (instant response)
        saju: saju || undefined,
        astro: astro || undefined,
        // Advanced astrology features (draconic, harmonics, progressions, etc.)
        advanced_astro: advancedAstro || undefined,
        // Fallback: Pass birth info for backend to compute if needed
        birth: { date: birthDate, time: birthTime, gender, lat: latitude, lon: longitude },
        // Conversation history for context-aware responses
        history: trimmedHistory.filter((m) => m.role !== "system"),
        // Session ID for RAG cache
        session_id: sessionId,
        // Premium: user context for returning users
        user_context: userContext || undefined,
        // CV/Resume text for career-related questions
        cv_text: cvText || undefined,
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

    // Relay the stream from backend to frontend
    // Sanitize/mask the stream on the fly
    const encoder = new TextEncoder();
    const sanitizedStream = new ReadableStream({
      start(controller) {
        const reader = backendResponse.body!.getReader();
        const decoder = new TextDecoder();
        const read = (): any => {
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
            console.error("[chat-stream sanitize error]", err);
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
  } catch (err: any) {
    console.error("[Chat-Stream API error]", err);
    return new Response(JSON.stringify({ error: err.message ?? "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
