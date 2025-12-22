import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { apiGuard } from "@/lib/apiGuard";
import { guardText, containsForbidden, safetyMessage } from "@/lib/textGuards";
import { sanitizeLocaleText, maskTextWithName } from "@/lib/destiny-map/sanitize";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

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

    const body = await request.json();
    const {
      name,
      birthDate,
      birthTime,
      gender = "male",
      latitude,
      longitude,
      theme = "chat",
      lang = "ko",
      messages = [],
      saju,
      astro,
      userContext, // Premium: persona memory + recent session summaries
      cvText, // CV/Resume text for career consultations
    } = body;

    if (!birthDate || !birthTime) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
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
      cvText ? `\nCV/Resume:\n${guardText(cvText, 3000)}` : "",
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
