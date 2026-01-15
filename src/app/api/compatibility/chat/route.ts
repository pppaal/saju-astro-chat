import { getServerSession } from "next-auth";
import { getBackendUrl as pickBackendUrl } from "@/lib/backend-url";
import { authOptions } from "@/lib/auth/authOptions";
import { apiGuard } from "@/lib/apiGuard";
import { guardText, containsForbidden, safetyMessage } from "@/lib/textGuards";
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function clampMessages(messages: ChatMessage[], max = 6) {
  return messages.slice(-max);
}

export async function POST(request: Request) {
  try {
    const guard = await apiGuard(request, { path: "compatibility-chat", limit: 60, windowSeconds: 60 });
    if (guard instanceof Response) return guard;

    // DEV MODE: Skip auth check
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
      persons = [],
      compatibilityResult = "",
      lang = "ko",
      messages = [],
    } = body;

    if (!persons || persons.length < 2) {
      return new Response(JSON.stringify({ error: "At least 2 persons required" }), {
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

    // Build conversation context
    const historyText = trimmedHistory
      .filter((m) => m.role !== "system")
      .map((m) => `${m.role === "user" ? "Q" : "A"}: ${guardText(m.content, 300)}`)
      .join("\n")
      .slice(0, 1500);

    const userQuestion = lastUser ? guardText(lastUser.content, 500) : "";

    // Format persons info
    const personsInfo = persons.map((p: { name?: string; date?: string; time?: string; relation?: string }, i: number) =>
      `Person ${i + 1}: ${p.name || `Person ${i + 1}`} (${p.date} ${p.time})${i > 0 ? ` - ${p.relation || 'partner'}` : ''}`
    ).join("\n");

    // Build prompt for compatibility chat
    const chatPrompt = [
      `== 궁합 상담 ==`,
      personsInfo,
      compatibilityResult ? `\n== 이전 분석 결과 ==\n${guardText(compatibilityResult, 2000)}` : "",
      historyText ? `\n== 대화 ==\n${historyText}` : "",
      `\n== 질문 ==\n${userQuestion}`,
    ].filter(Boolean).join("\n");

    // Call backend AI
    const backendUrl = pickBackendUrl();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    const apiToken = process.env.ADMIN_API_TOKEN;
    if (apiToken) {
      headers["X-API-KEY"] = apiToken;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const aiResponse = await fetch(`${backendUrl}/api/compatibility/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          persons,
          prompt: chatPrompt,
          question: userQuestion,
          history: trimmedHistory,
          locale: lang,
          compatibility_context: compatibilityResult,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!aiResponse.ok) {
        throw new Error(`Backend returned ${aiResponse.status}`);
      }

      // Stream response
      const encoder = new TextEncoder();
      const aiData = await aiResponse.json();
      const answer = aiData?.data?.response || aiData?.response || aiData?.interpretation ||
        "죄송합니다. 응답을 생성할 수 없습니다. 다시 시도해 주세요.";

      return new Response(
        new ReadableStream({
          start(controller) {
            // Send answer in chunks for streaming effect
            const chunks = answer.match(/.{1,50}/g) || [answer];
            chunks.forEach((chunk: string, index: number) => {
              setTimeout(() => {
                controller.enqueue(encoder.encode(`data: ${chunk}\n\n`));
                if (index === chunks.length - 1) {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  controller.close();
                }
              }, index * 20);
            });
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
    } catch (fetchError) {
      clearTimeout(timeoutId);
      logger.error("[Compatibility Chat] Backend error:", fetchError);

      // Fallback response
      const fallback = lang === "ko"
        ? "AI 서버 연결에 문제가 있습니다. 잠시 후 다시 시도해 주세요."
        : "AI server connection issue. Please try again later.";

      const encoder = new TextEncoder();
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
          },
        }
      );
    }
  } catch (error) {
    logger.error("[Compatibility Chat] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
