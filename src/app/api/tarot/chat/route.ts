// src/app/api/tarot/chat/route.ts
// Tarot Chat API - Follow-up conversation about tarot readings

import { NextRequest, NextResponse } from 'next/server'
import { initializeApiContext, createAuthenticatedGuard, extractLocale } from '@/lib/api/middleware'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { apiClient } from '@/lib/api/ApiClient'
import { captureServerError } from '@/lib/telemetry'
import { type ChatMessage } from '@/lib/api'
import { logger } from '@/lib/logger'
import { tarotChatRequestSchema, createValidationErrorResponse } from '@/lib/api/zodValidation'
import { composeTarotFallbackReply } from '@/lib/Tarot/fallbackReply'
import { optimizeTarotMessagesForBackend } from './_lib/messageOptimizer'
interface CardContext {
  position: string
  name: string
  isReversed?: boolean // camelCase (old)
  is_reversed?: boolean // snake_case (new)
  meaning: string
  keywords?: string[]
}

interface TarotContext {
  spread_title: string
  category: string
  cards: CardContext[]
  overall_message: string
  guidance: string
}

import { HTTP_STATUS as _HTTP_STATUS } from '@/lib/constants/http'

function buildSystemInstruction(context: TarotContext, language: 'ko' | 'en') {
  const cardLines = context.cards
    .map((c, idx) => {
      const pos = c.position || `Card ${idx + 1}`
      const orient =
        (c.is_reversed ?? c.isReversed)
          ? language === 'ko'
            ? '역위'
            : 'reversed'
          : language === 'ko'
            ? '정위'
            : 'upright'
      return `- ${pos}: ${c.name} (${orient})`
    })
    .join('\n')

  const baseKo = [
    '너는 타로 상담사다. 항상 실제로 뽑힌 카드와 위치를 근거로 이야기해.',
    '출력 형식:',
    '1) 한 줄 핵심 메시지(카드·포지션을 명시)',
    '2) 카드별 해석 3줄 이내: 카드명/포지션/정위·역위 근거 + 의미(왜 그렇게 해석하는지 포함)',
    '3) 실행 가능한 행동 제안 2~3개 (오늘/이번주 등 구체적 시간·행동)',
    '4) 후속 질문 1개로 마무리',
    '안전: 의료/법률/투자/응급 상황은 전문 상담을 권유하고 조언은 일반 정보임을 명시해.',
    '길이: 전체 160단어(또는 8문장) 이내, 불필요한 영성 어휘 줄이고 현실적 조언을 줘.',
    '항상 카드 이름과 포지션을 인용하고, 카드가 왜 그런 조언을 주는지 명확히 설명해.',
    '스프레드와 카드 목록:',
    `스프레드: ${context.spread_title} (${context.category})`,
    cardLines || '(카드 없음)',
  ].join('\n')

  const baseEn = [
    'You are a tarot counselor. Always ground the response in the drawn cards and their positions.',
    'Output format:',
    '1) One-line core message (cite card + position)',
    '2) Card insights in <=3 lines: name/position/upright|reversed + meaning + why it implies that',
    '3) 2–3 actionable steps with concrete timeframes',
    '4) End with one follow-up question.',
    'Safety: for medical/legal/finance/emergency, add a disclaimer and suggest professional help.',
    'Length: keep it within ~160 words (<=8 sentences); minimize fluffy mysticism and favor practical advice.',
    'Always cite the card and position, and explain why the card supports the advice.',
    'Spread and cards:',
    `Spread: ${context.spread_title} (${context.category})`,
    cardLines || '(no cards)',
  ].join('\n')

  return language === 'ko' ? baseKo : baseEn
}

export async function POST(req: NextRequest) {
  // Declare variables outside try block for error handling
  let apiContext: Awaited<ReturnType<typeof initializeApiContext>>['context'] | undefined
  let messages: ChatMessage[] | undefined
  let context: TarotContext | null = null

  try {
    // Apply middleware: auth + rate limiting + credit consumption
    const guardOptions = createAuthenticatedGuard({
      route: 'tarot-chat',
      limit: 20,
      windowSeconds: 60,
      requireCredits: true,
      creditType: 'followUp', // 타로 후속 질문은 followUp 타입 사용
      creditAmount: 1,
    })

    const initResult = await initializeApiContext(req, guardOptions)
    if (initResult.error) {
      return initResult.error
    }
    apiContext = initResult.context

    const rawBody = await req.json()
    const validationResult = tarotChatRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[tarot/chat] validation failed', { errors: validationResult.error.issues })
      return createValidationErrorResponse(validationResult.error, {
        locale: extractLocale(req),
        route: 'tarot-chat',
      })
    }

    const {
      messages: validatedMessages,
      context: validatedContext,
      language = 'ko',
    } = validationResult.data
    messages = validatedMessages as ChatMessage[]
    context = validatedContext as TarotContext
    const optimizedMessages = optimizeTarotMessagesForBackend(messages, language, {
      maxMessages: 8,
      maxUserLength: 1400,
      maxAssistantLength: 650,
    })

    // Credits already consumed by middleware

    // Inject system instruction for consistent, card-grounded replies
    const systemInstruction = buildSystemInstruction(context, language)
    const messagesWithSystem: ChatMessage[] = [
      { role: 'system', content: systemInstruction },
      ...optimizedMessages,
    ]

    // Call Python backend for chat (with fallback on connection failure)
    const response = await apiClient.post(
      '/api/tarot/chat',
      {
        messages: messagesWithSystem,
        context: {
          spread_title: context.spread_title,
          category: context.category,
          cards: context.cards.map((c) => ({
            position: c.position,
            name: c.name,
            is_reversed: c.is_reversed ?? c.isReversed ?? false,
            meaning: c.meaning,
            keywords: c.keywords || [],
          })),
          overall_message: context.overall_message,
          guidance: context.guidance,
        },
        language,
      },
      { timeout: 20000 }
    )

    // Use backend response or fallback with runtime type validation
    if (response.ok && response.data) {
      const responseData = response.data as Record<string, unknown>
      const reply = responseData?.reply

      // Validate that reply is a non-empty string before using
      if (typeof reply === 'string' && reply.length > 0) {
        const res = NextResponse.json({ reply })
        res.headers.set('X-Fallback', '0')
        return res
      }
    }

    // 🔄 Backend 실패 시 크레딧 환불 (Fallback 사용은 품질 저하이므로)
    if (!response.ok && apiContext.refundCreditsOnError) {
      await apiContext.refundCreditsOnError(`Backend failed: ${response.status}`, {
        backendStatus: response.status,
        usingFallback: true,
      })
      logger.warn('[Tarot] Credits refunded due to backend failure, using fallback')
    }

    // Fallback response
    logger.warn('Using fallback chat response')
    const fallbackReply = generateFallbackReply(optimizedMessages, context, language)
    const res = NextResponse.json({ reply: fallbackReply })
    res.headers.set('X-Fallback', '1')
    return res
  } catch (err: unknown) {
    captureServerError(err as Error, { route: '/api/tarot/chat' })
    const rawErrorMessage = err instanceof Error ? err.message : String(err)
    logger.error('Tarot chat error:', { message: rawErrorMessage, error: err })

    // 🔄 크레딧 자동 환불 (API 에러 발생 시)
    if (apiContext?.refundCreditsOnError) {
      await apiContext.refundCreditsOnError(rawErrorMessage, {
        errorType: err instanceof Error ? err.constructor.name : 'UnknownError',
        hasMessages: !!messages,
        hasContext: !!context,
      })
    }

    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      locale: extractLocale(req),
      route: 'tarot-chat',
      originalError: err instanceof Error ? err : new Error(String(err)),
    })
  }
}

// Fallback response when backend is unavailable
function generateFallbackReply(
  messages: ChatMessage[],
  context: TarotContext,
  language: string
): string {
  return composeTarotFallbackReply({
    messages,
    context,
    language,
  })
}
