// src/app/api/tarot/interpret-stream/route.ts
// Direct OpenAI Streaming Tarot Interpretation API

import { NextRequest, NextResponse } from "next/server";
import { initializeApiContext, createPublicStreamGuard } from "@/lib/api/middleware";
import { createSSEStreamProxy, createFallbackSSEStream, createSSEEvent, createSSEDoneEvent } from "@/lib/streaming";
import { apiClient } from "@/lib/api/ApiClient";
import { enforceBodySize } from "@/lib/http";
import { sanitizeString } from "@/lib/api/sanitizers";
import { logger } from '@/lib/logger';

interface CardInput {
  name: string;
  nameKo?: string;
  isReversed: boolean;
  position: string;
  positionKo?: string;
  keywords?: string[];
  keywordsKo?: string[];
}

interface StreamInterpretRequest {
  categoryId: string;
  spreadId: string;
  spreadTitle: string;
  cards: CardInput[];
  userQuestion?: string;
  language?: "ko" | "en";
  // 개인화 정보
  birthdate?: string;  // YYYY-MM-DD
  zodiacSign?: string; // 별자리
  previousReadings?: string[]; // 이전 상담 요약
  questionMood?: 'worried' | 'curious' | 'hopeful' | 'urgent' | 'neutral'; // 질문 감정
}

const MAX_TITLE = 120;
const MAX_QUESTION = 600;
const MAX_CARDS = 15;
const BACKEND_TIMEOUT_MS = 20000;
const OPENAI_TIMEOUT_MS = 20000;

// Use centralized sanitizeString from @/lib/api/sanitizers

function buildFallbackPayload(
  cards: CardInput[],
  language: "ko" | "en"
): { overall: string; cards: { position: string; interpretation: string }[]; advice: string } {
  const isKorean = language === "ko";
  const overall = isKorean
    ? "\uCE74\uB4DC\uC5D0\uC11C \uC804\uD574\uC9C0\uB294 \uD575\uC2EC \uBA54\uC2DC\uC9C0\uB97C \uC815\uB9AC\uD588\uC2B5\uB2C8\uB2E4."
    : "Here is the core message the cards are pointing to.";
  const advice = isKorean
    ? "\uC624\uB298 \uD560 \uC218 \uC788\uB294 \uC791\uC740 \uD589\uB3D9\uBD80\uD130 \uC2DC\uC791\uD574 \uBCF4\uC138\uC694."
    : "Start with one small, concrete step you can take today.";

  const cardsPayload = cards.map((card, index) => {
    const position = (isKorean && card.positionKo ? card.positionKo : card.position) || `Card ${index + 1}`;
    const name = (isKorean && card.nameKo ? card.nameKo : card.name) || `Card ${index + 1}`;
    const orientation = card.isReversed
      ? (isKorean ? "\uC5ED\uBC29\uD5A5" : "reversed")
      : (isKorean ? "\uC815\uBC29\uD5A5" : "upright");
    const interpretation = isKorean
      ? `${name} (${orientation}) \uCE74\uB4DC\uB294 \uD604\uC7AC \uC0C1\uD669\uC5D0\uC11C \uC911\uC694\uD55C \uD3EC\uC778\uD2B8\uB97C \uC9DA\uC5B4 \uC90D\uB2C8\uB2E4.`
      : `${name} (${orientation}) highlights a key point in your current situation.`;
    return { position, interpretation };
  });

  return { overall, cards: cardsPayload, advice };
}

function normalizeAdvice(advice: unknown): string {
  if (typeof advice === "string") return advice;
  if (Array.isArray(advice)) {
    const lines = advice
      .map((entry) => {
        if (!entry || typeof entry !== "object") return "";
        const record = entry as Record<string, unknown>;
        const title = typeof record.title === "string" ? record.title.trim() : "";
        const detail = typeof record.detail === "string" ? record.detail.trim() : "";
        if (title && detail) return `${title}: ${detail}`;
        return title || detail;
      })
      .filter(Boolean);
    return lines.join("\n");
  }
  return "";
}

function normalizeBackendPayload(
  data: unknown,
  fallback: { overall: string; cards: { position: string; interpretation: string }[]; advice: string }
): { overall: string; cards: { position: string; interpretation: string }[]; advice: string } | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  const overall = typeof record.overall_message === "string" && record.overall_message.trim()
    ? record.overall_message
    : fallback.overall;
  const advice = normalizeAdvice(record.guidance) || fallback.advice;

  const insights = Array.isArray(record.card_insights) ? record.card_insights : [];
  const cards = insights.length > 0
    ? insights.map((entry, index) => {
      const cardRecord = entry as Record<string, unknown>;
      const position = typeof cardRecord.position === "string" && cardRecord.position.trim()
        ? cardRecord.position
        : (fallback.cards[index]?.position || `Card ${index + 1}`);
      const interpretation = typeof cardRecord.interpretation === "string" && cardRecord.interpretation.trim()
        ? cardRecord.interpretation
        : (fallback.cards[index]?.interpretation || "");
      return { position, interpretation };
    })
    : fallback.cards;

  return { overall, cards, advice };
}

function streamJsonPayload(
  payload: { overall: string; cards: { position: string; interpretation: string }[]; advice: string },
  extraHeaders?: Record<string, string>
): Response {
  const encoder = new TextEncoder();
  const jsonText = JSON.stringify(payload);
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(createSSEEvent({ content: jsonText })));
      controller.enqueue(encoder.encode(createSSEDoneEvent()));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      ...(extraHeaders || {})
    }
  });
}

async function fetchBackendFallback(payload: {
  categoryId: string;
  spreadId: string;
  spreadTitle: string;
  cards: CardInput[];
  userQuestion: string;
  language: "ko" | "en";
  birthdate: string;
}): Promise<unknown | null> {
  try {
    const result = await apiClient.post("/api/tarot/interpret", {
      category: payload.categoryId,
      spread_id: payload.spreadId,
      spread_title: payload.spreadTitle,
      cards: payload.cards.map((card) => ({
        name: card.name,
        is_reversed: card.isReversed,
        position: card.position
      })),
      user_question: payload.userQuestion,
      language: payload.language,
      birthdate: payload.birthdate || undefined
    }, { timeout: BACKEND_TIMEOUT_MS });

    if (!result.ok) {
      logger.error("Tarot stream backend fallback error:", { status: result.status, error: result.error });
      return null;
    }

    return result.data;
  } catch (error) {
    logger.error("Tarot stream backend fallback exception:", { error });
    return null;
  }
}

// 별자리 계산 함수
function getZodiacSign(birthdate: string): { sign: string; signKo: string; element: string } | null {
  const date = new Date(birthdate);
  if (isNaN(date.getTime())) return null;

  const month = date.getMonth() + 1;
  const day = date.getDate();

  const zodiacData = [
    { sign: 'Capricorn', signKo: '염소자리', element: '흙', start: [12, 22], end: [1, 19] },
    { sign: 'Aquarius', signKo: '물병자리', element: '공기', start: [1, 20], end: [2, 18] },
    { sign: 'Pisces', signKo: '물고기자리', element: '물', start: [2, 19], end: [3, 20] },
    { sign: 'Aries', signKo: '양자리', element: '불', start: [3, 21], end: [4, 19] },
    { sign: 'Taurus', signKo: '황소자리', element: '흙', start: [4, 20], end: [5, 20] },
    { sign: 'Gemini', signKo: '쌍둥이자리', element: '공기', start: [5, 21], end: [6, 20] },
    { sign: 'Cancer', signKo: '게자리', element: '물', start: [6, 21], end: [7, 22] },
    { sign: 'Leo', signKo: '사자자리', element: '불', start: [7, 23], end: [8, 22] },
    { sign: 'Virgo', signKo: '처녀자리', element: '흙', start: [8, 23], end: [9, 22] },
    { sign: 'Libra', signKo: '천칭자리', element: '공기', start: [9, 23], end: [10, 22] },
    { sign: 'Scorpio', signKo: '전갈자리', element: '물', start: [10, 23], end: [11, 21] },
    { sign: 'Sagittarius', signKo: '사수자리', element: '불', start: [11, 22], end: [12, 21] },
  ];

  for (const z of zodiacData) {
    const [startM, startD] = z.start;
    const [endM, endD] = z.end;

    if (startM > endM) {
      // 염소자리 같이 연도를 걸치는 경우
      if ((month === startM && day >= startD) || (month === endM && day <= endD)) {
        return { sign: z.sign, signKo: z.signKo, element: z.element };
      }
    } else {
      if ((month === startM && day >= startD) || (month === endM && day <= endD) || (month > startM && month < endM)) {
        return { sign: z.sign, signKo: z.signKo, element: z.element };
      }
    }
  }
  return null;
}

// 감정 분석 함수
function analyzeQuestionMood(question: string): 'worried' | 'curious' | 'hopeful' | 'urgent' | 'neutral' {
  const lowerQ = question.toLowerCase();
  const koreanQ = question;

  // 걱정/불안 패턴
  if (/걱정|불안|두렵|힘들|무서|어떡|망하|실패|잃|끝|포기/i.test(koreanQ) ||
      /worried|anxious|scared|afraid|fail|lose|end/i.test(lowerQ)) {
    return 'worried';
  }

  // 긴급 패턴
  if (/급해|빨리|당장|지금|바로|언제|오늘/i.test(koreanQ) ||
      /urgent|asap|now|immediately|today|when/i.test(lowerQ)) {
    return 'urgent';
  }

  // 희망/긍정 패턴
  if (/잘될|좋아질|성공|행복|사랑|만날|이룰|희망/i.test(koreanQ) ||
      /hope|success|love|happy|better|achieve/i.test(lowerQ)) {
    return 'hopeful';
  }

  // 호기심 패턴
  if (/어떨까|궁금|알고싶|보여줘|뭘까|왜/i.test(koreanQ) ||
      /what|how|why|curious|wonder/i.test(lowerQ)) {
    return 'curious';
  }

  return 'neutral';
}

export async function POST(req: NextRequest) {
  try {
    // Apply middleware: rate limiting + public token auth + credit consumption
    const guardOptions = createPublicStreamGuard({
      route: "tarot-interpret-stream",
      limit: 10,
      windowSeconds: 60,
      requireCredits: true,
      creditType: "reading",
      creditAmount: 1,
    });

    const { context, error } = await initializeApiContext(req, guardOptions);
    if (error) return error;

    logger.info("Tarot stream request", { ip: context.ip });

    const oversized = enforceBodySize(req, 256 * 1024);
    if (oversized) return oversized;

    const body: StreamInterpretRequest = await req.json();
    const categoryId = sanitizeString(body?.categoryId, MAX_TITLE);
    const spreadId = sanitizeString(body?.spreadId, MAX_TITLE);
    const spreadTitle = sanitizeString(body?.spreadTitle, MAX_TITLE);
    const language = body?.language === "en" ? "en" : (context.locale as "ko" | "en");
    const rawCards = Array.isArray(body?.cards) ? body.cards.slice(0, MAX_CARDS) : [];
    const userQuestion = sanitizeString(body?.userQuestion, MAX_QUESTION);
    const birthdate = sanitizeString(body?.birthdate, 12);
    const previousReadings = Array.isArray(body?.previousReadings)
      ? body.previousReadings.slice(0, 3).map(r => sanitizeString(r, 200))
      : [];

    logger.info("Tarot stream payload", {
      categoryId,
      spreadId,
      language,
      cards: rawCards.length,
      hasQuestion: Boolean(userQuestion),
      hasBirthdate: Boolean(birthdate),
      previousReadings: previousReadings.length
    });

    if (!categoryId || rawCards.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Credits already consumed by middleware

    const isKorean = language === "ko";
    const cardListText = rawCards.map((c, i) => {
      const name = isKorean && c.nameKo ? c.nameKo : c.name;
      const pos = isKorean && c.positionKo ? c.positionKo : c.position;
      const keywords = (isKorean && c.keywordsKo ? c.keywordsKo : c.keywords) || [];
      return `${i + 1}. [${pos}] ${name}${c.isReversed ? '(역방향)' : ''} - ${keywords.slice(0, 3).join(', ')}`;
    }).join('\n');

    const q = userQuestion || (isKorean ? '일반 운세' : 'general reading');

    // 개인화 정보 구성
    const zodiac = birthdate ? getZodiacSign(birthdate) : null;
    const mood = analyzeQuestionMood(q);

    // 개인화 컨텍스트 생성
    let personalizationContext = '';
    if (isKorean) {
      if (zodiac) {
        personalizationContext += `\n## 질문자 정보\n- 별자리: ${zodiac.signKo} (${zodiac.element} 원소)\n`;
      }
      if (previousReadings.length > 0) {
        personalizationContext += `\n## 이전 상담 요약 (맥락 참고용)\n${previousReadings.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n`;
      }
      const moodGuide: Record<typeof mood, string> = {
        worried: '질문자가 걱정하고 있어요. 안심시키면서도 현실적인 조언을 해주세요.',
        urgent: '질문자가 급한 상황이에요. 핵심을 먼저 말하고 구체적인 행동 지침을 주세요.',
        hopeful: '질문자가 희망적이에요. 긍정적인 에너지를 유지하면서 균형 잡힌 조언을 해주세요.',
        curious: '질문자가 호기심이 많아요. 흥미롭게 설명하면서 깊이 있는 통찰을 주세요.',
        neutral: '',
      };
      if (moodGuide[mood]) {
        personalizationContext += `\n## 말투 힌트\n${moodGuide[mood]}\n`;
      }
    } else {
      if (zodiac) {
        personalizationContext += `\n## Querent Info\n- Zodiac: ${zodiac.sign} (${zodiac.element} element)\n`;
      }
      if (previousReadings.length > 0) {
        personalizationContext += `\n## Previous Readings Summary (for context)\n${previousReadings.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n`;
      }
    }

    // 간결한 프롬프트 (스트리밍용) + 개인화
    const prompt = isKorean
      ? `당신은 친근한 타로 리더예요. 따뜻하고 공감하는 말투로 해석해주세요.

## 스프레드: ${spreadTitle}
## 질문: "${q}"
${personalizationContext}
## 뽑힌 카드
${cardListText}

## 출력 형식 (JSON)
{
  "overall": "전체 메시지 (400-600자). 친근한 말투로 카드들이 전하는 큰 그림을 설명해요.${zodiac ? ` ${zodiac.signKo}의 ${zodiac.element} 원소 특성을 자연스럽게 연결해요.` : ''}${previousReadings.length > 0 ? ' 이전 상담 내용과의 연결점이 있다면 언급해요.' : ''}",
  "cards": [
    {"position": "위치명", "interpretation": "카드 해석 (300-500자). 이 위치에서 이 카드가 의미하는 바를 구체적으로 설명해요."}
  ],
  "advice": "실용적인 조언 (100-150자). 구체적인 행동 지침."
}

## 말투 규칙
✅ 사용: "~해요", "~네요", "~거든요", "~죠"
❌ 금지: "~것입니다", "~하겠습니다" (딱딱한 말투)`
      : `You are a warm, intuitive tarot reader. Give interpretations in a friendly, conversational tone.

## Spread: ${spreadTitle}
## Question: "${q}"
${personalizationContext}
## Cards Drawn
${cardListText}

## Output Format (JSON)
{
  "overall": "Overall message (250-350 words). Explain the big picture from these cards warmly.${zodiac ? ` Naturally incorporate ${zodiac.sign}'s ${zodiac.element} element traits.` : ''}${previousReadings.length > 0 ? ' Reference connections to previous readings if relevant.' : ''}",
  "cards": [
    {"position": "Position name", "interpretation": "Card interpretation (180-280 words). Explain what this card means in this position specifically."}
  ],
  "advice": "Practical advice (60-90 words). Specific action steps."
}`;

    // OpenAI Streaming
    if (!process.env.OPENAI_API_KEY) {
      logger.warn("Tarot stream missing OPENAI_API_KEY, using fallback");
      const fallback = buildFallbackPayload(rawCards, language);
      return streamJsonPayload(fallback, { "X-Fallback": "1" });
    }

    const openaiController = new AbortController();
    const openaiTimeoutId = setTimeout(() => openaiController.abort(), OPENAI_TIMEOUT_MS);
    let openaiResponse: Response;
    try {
      logger.info("Tarot stream OpenAI request", { model: "gpt-4o-mini", promptLength: prompt.length });
      openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 4000,
          temperature: 0.75,
          stream: true,
          response_format: { type: "json_object" },
        }),
        signal: openaiController.signal,
      });
    } catch (error) {
      clearTimeout(openaiTimeoutId);
      logger.error('OpenAI stream fetch error:', { error });
      logger.warn("Tarot stream fallback to backend");
      const fallbackBase = buildFallbackPayload(rawCards, language);
      const backendFallback = await fetchBackendFallback({
        categoryId,
        spreadId,
        spreadTitle,
        cards: rawCards,
        userQuestion: userQuestion,
        language,
        birthdate
      });
      const fallback = normalizeBackendPayload(backendFallback, fallbackBase) || fallbackBase;
      return streamJsonPayload(fallback, { "X-Fallback": "1" });
    }
    clearTimeout(openaiTimeoutId);

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      logger.error('OpenAI stream error:', { status: openaiResponse.status, error: errorText });
      logger.warn("Tarot stream fallback to backend");
      const fallbackBase = buildFallbackPayload(rawCards, language);
      const backendFallback = await fetchBackendFallback({
        categoryId,
        spreadId,
        spreadTitle,
        cards: rawCards,
        userQuestion: userQuestion,
        language,
        birthdate
      });
      const fallback = normalizeBackendPayload(backendFallback, fallbackBase) || fallbackBase;
      return streamJsonPayload(fallback, { "X-Fallback": "1" });
    }

    // SSE
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = openaiResponse.body?.getReader();
        logger.info("Tarot stream SSE start", { hasReader: Boolean(reader) });
        if (!reader) {
          const fallbackBase = buildFallbackPayload(rawCards, language);
          const backendFallback = await fetchBackendFallback({
            categoryId,
            spreadId,
            spreadTitle,
            cards: rawCards,
            userQuestion: userQuestion,
            language,
            birthdate
          });
          const fallback = normalizeBackendPayload(backendFallback, fallbackBase) || fallbackBase;
          controller.enqueue(encoder.encode(createSSEEvent({ content: JSON.stringify(fallback) })));
          controller.enqueue(encoder.encode(createSSEDoneEvent()));
          controller.close();
          return;
        }

        let buffer = '';

        const handleLine = (line: string) => {
          if (!line.startsWith('data: ')) return;
          const data = line.slice(6);
          if (data === '[DONE]') {
            controller.enqueue(encoder.encode(createSSEDoneEvent()));
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              controller.enqueue(encoder.encode(createSSEEvent({ content })));
            }
          } catch {
            // Skip invalid JSON
          }
        };

        let sawContent = false;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!sawContent && line.startsWith("data: ")) {
                sawContent = true;
                logger.info("Tarot stream first chunk");
              }
              handleLine(line);
            }
          }

          if (buffer.trim()) {
            handleLine(buffer);
          }
        } catch (error) {
          logger.error('Stream error:', { error: error });
        } finally {
          logger.info("Tarot stream SSE finished", { sawContent });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (err) {
    logger.error('Tarot stream error:', { error: err });
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
