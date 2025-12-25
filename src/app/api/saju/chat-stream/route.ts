import { getServerSession } from "next-auth";
import { getBackendUrl as pickBackendUrl } from "@/lib/backend-url";
import { authOptions } from "@/lib/auth/authOptions";
import { apiGuard } from "@/lib/apiGuard";
import { guardText, containsForbidden, safetyMessage } from "@/lib/textGuards";
import { sanitizeLocaleText, maskTextWithName } from "@/lib/destiny-map/sanitize";
import { checkAndConsumeCredits, creditErrorResponse } from "@/lib/credits/withCredits";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function clampMessages(messages: ChatMessage[], max = 6) {
  return messages.slice(-max);
}

function sajuCounselorSystemPrompt(lang: string) {
  const base = [
    "You are a Saju (Four Pillars of Destiny) counselor specializing in Eastern fortune-telling.",
    "",
    "ABSOLUTE RULES:",
    "1. NO GREETING - Start directly with analysis. Never say 'welcome', 'hello', etc.",
    "2. ONLY use daeun/seun data provided in context - NEVER invent periods",
    "3. Focus ONLY on Saju analysis - do NOT mix with Western astrology",
    "4. Use proper Korean Saju terminology when appropriate",
    "",
    "Response format (START IMMEDIATELY, no greeting):",
    "【일간】 Day master characteristics and current state",
    "【대운】 Major luck cycle analysis FROM PROVIDED DATA",
    "【세운】 Annual luck for this year",
    "【오행】 Five elements balance and recommendations",
    "【조언】 2-3 practical actions based on saju reading",
    "",
    "Length: 200-300 words.",
  ];
  return lang === "ko"
    ? [
        "너는 사주(四柱) 전문 상담사다. 동양 명리학 전문가로서 상담해.",
        "",
        "절대 규칙:",
        "1. 인사 금지 - '안녕하세요', '반가워요' 등 인사 없이 바로 분석 시작. 첫 문장부터 【일간】으로 시작해.",
        "2. 제공된 대운/세운 데이터만 사용 - 데이터에 있는 그대로만 말해.",
        "3. 사주 분석에만 집중 - 서양 점성술과 섞지 마.",
        "4. 한국 사주 용어를 적절히 사용해 (일간, 용신, 대운, 세운, 오행 등)",
        "",
        "응답 형식 (인사 없이 바로):",
        "【일간】 일간의 특성과 현재 상태",
        "【대운】 현재 대운 분석 (제공된 데이터 기반)",
        "【세운】 올해 세운 분석",
        "【오행】 오행 균형과 보완 방법",
        "【조언】 사주 기반 2-3개 실천 조언",
        "",
        "길이: 200-300단어.",
      ].join("\n")
    : base.join("\n");
}

export async function POST(request: Request) {
  try {
    const guard = await apiGuard(request, { path: "saju-chat-stream", limit: 60, windowSeconds: 60 });
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

    const body = await request.json();
    const {
      name,
      birthDate,
      birthTime,
      gender = "male",
      theme = "life",
      lang = "ko",
      messages = [],
      saju,
      userContext,
    } = body;

    if (!birthDate || !birthTime) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
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

    // Build saju-focused prompt
    const chatPrompt = [
      sajuCounselorSystemPrompt(lang),
      `Name: ${name || "User"}`,
      `Birth: ${birthDate} ${birthTime}`,
      `Gender: ${gender}`,
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

    const backendResponse = await fetch(`${backendUrl}/saju/ask-stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({
        theme,
        prompt: chatPrompt,
        locale: lang,
        saju: saju || undefined,
        birth: { date: birthDate, time: birthTime, gender },
        history: trimmedHistory.filter((m) => m.role !== "system"),
        session_id: sessionId,
        user_context: userContext || undefined,
        counselor_type: "saju", // Indicate saju-only mode
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
            console.error("[saju chat-stream sanitize error]", err);
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
    const message = err instanceof Error ? err.message : "Internal Server Error";
    console.error("[Saju Chat-Stream API error]", err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
