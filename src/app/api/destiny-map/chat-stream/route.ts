import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { apiGuard } from "@/lib/apiGuard";
import { guardText, containsForbidden, safetyMessage } from "@/lib/textGuards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function clampMessages(messages: ChatMessage[], max = 6) {
  return messages.slice(-max);
}

export async function POST(request: Request) {
  try {
    const guard = await apiGuard(request, { path: "destiny-map-chat-stream", limit: 60, windowSeconds: 60 });
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
      `Name: ${name || "User"}`,
      `Birth: ${birthDate} ${birthTime}`,
      `Gender: ${gender}`,
      `Theme: ${theme}`,
      historyText ? `\nConversation:\n${historyText}` : "",
      `\nQuestion: ${userQuestion}`,
    ]
      .filter(Boolean)
      .join("\n");

    // Call backend streaming endpoint IMMEDIATELY (no heavy computation)
    const backendUrl = process.env.NEXT_PUBLIC_AI_BACKEND || "http://127.0.0.1:5000";
    const apiKey = process.env.ADMIN_API_TOKEN || "";

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
      }),
    });

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
          },
        }
      );
    }

    // Relay the stream from backend to frontend
    return new Response(backendResponse.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
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
