// src/app/api/dream/chat/route.ts
// Dream Follow-up Chat API - Streaming SSE proxy to backend

import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { requirePublicToken } from "@/lib/auth/publicToken";

function pickBackendUrl() {
  const url =
    process.env.AI_BACKEND_URL ||
    process.env.BACKEND_AI_URL ||
    process.env.NEXT_PUBLIC_AI_BACKEND ||
    "http://localhost:5000";
  if (!url.startsWith("https://") && process.env.NODE_ENV === "production") {
    console.warn("[dream-chat] Using non-HTTPS AI backend in production");
  }
  return url;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface DreamChatRequest {
  messages: Message[];
  dreamContext: {
    dreamText: string;
    summary?: string;
    symbols?: string[];
    emotions?: string[];
    themes?: string[];
    recommendations?: string[];
  };
  locale?: "ko" | "en";
}

function buildSystemInstruction(dreamContext: DreamChatRequest["dreamContext"], locale: "ko" | "en") {
  const symbolsStr = dreamContext.symbols?.join(", ") || "없음";
  const emotionsStr = dreamContext.emotions?.join(", ") || "없음";
  const themesStr = dreamContext.themes?.join(", ") || "없음";
  const recommendationsStr = dreamContext.recommendations?.join(" / ") || "없음";

  if (locale === "ko") {
    return `당신은 전문 꿈 해석 상담사입니다. 사용자가 이미 받은 꿈 해석을 기반으로 추가 질문에 답변합니다.

역할:
- 꿈의 심볼과 의미에 대해 더 깊이 설명
- 사용자의 개인적 상황과 연결하여 해석
- 실용적인 조언과 통찰 제공
- 심리학적, 문화적 관점에서 꿈 분석
- 한국 전통 해몽 지식 활용

톤:
- 따뜻하고 공감적
- 전문적이지만 이해하기 쉽게
- 긍정적이고 지지적

제한:
- 의학적 조언 금지
- 미래 예측 (복권 번호 등) 금지
- 답변은 간결하게 (3-4문장)

[꿈 해석 컨텍스트]
원래 꿈: ${dreamContext.dreamText || ""}
해석 요약: ${dreamContext.summary || ""}
주요 심볼: ${symbolsStr}
감정: ${emotionsStr}
테마: ${themesStr}
조언: ${recommendationsStr}`;
  } else {
    return `You are a professional dream interpretation counselor. You answer follow-up questions based on the dream interpretation the user has already received.

Role:
- Explain dream symbols and meanings in more depth
- Connect interpretations to the user's personal situation
- Provide practical advice and insights
- Analyze dreams from psychological and cultural perspectives
- Utilize knowledge of various dream interpretation traditions

Tone:
- Warm and empathetic
- Professional but easy to understand
- Positive and supportive

Limitations:
- No medical advice
- No future predictions (lottery numbers, etc.)
- Keep responses concise (3-4 sentences)

[Dream Interpretation Context]
Original Dream: ${dreamContext.dreamText || ""}
Summary: ${dreamContext.summary || ""}
Key Symbols: ${symbolsStr}
Emotions: ${emotionsStr}
Themes: ${themesStr}
Recommendations: ${recommendationsStr}`;
  }
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers);
    const limit = await rateLimit(`dream-chat:${ip}`, { limit: 20, windowSeconds: 60 });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait." },
        { status: 429, headers: limit.headers }
      );
    }

    if (!requirePublicToken(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const body: DreamChatRequest = await req.json();
    const { messages, dreamContext, locale = "ko" } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages required" },
        { status: 400, headers: limit.headers }
      );
    }

    // Build system instruction with dream context
    const systemInstruction = buildSystemInstruction(dreamContext, locale);
    const messagesWithSystem: Message[] = [
      { role: "system", content: systemInstruction },
      ...messages,
    ];

    // Call backend streaming endpoint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const backendResponse = await fetch(`${pickBackendUrl()}/api/dream/chat-stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ADMIN_API_TOKEN || ""}`
      },
      body: JSON.stringify({
        messages: messagesWithSystem,
        dream_context: {
          dream_text: dreamContext.dreamText,
          summary: dreamContext.summary,
          symbols: dreamContext.symbols,
          emotions: dreamContext.emotions,
          themes: dreamContext.themes,
          recommendations: dreamContext.recommendations,
        },
        language: locale
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeoutId);

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error("[DreamChat] Backend error:", backendResponse.status, errorText);
      return NextResponse.json(
        { error: "Backend error", detail: errorText },
        { status: backendResponse.status, headers: limit.headers }
      );
    }

    // Check if response is SSE
    const contentType = backendResponse.headers.get("content-type");
    if (!contentType?.includes("text/event-stream")) {
      // Fallback to regular JSON response
      const data = await backendResponse.json();
      return NextResponse.json(data, { headers: limit.headers });
    }

    // Stream the SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(streamController) {
        const reader = backendResponse.body?.getReader();
        if (!reader) {
          streamController.close();
          return;
        }

        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Pass through the SSE data
            const text = decoder.decode(value, { stream: true });
            streamController.enqueue(encoder.encode(text));
          }
        } catch (error) {
          console.error("[DreamChat] Stream error:", error);
        } finally {
          streamController.close();
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
    console.error("Dream chat error:", err);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
