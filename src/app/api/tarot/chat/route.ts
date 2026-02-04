// src/app/api/tarot/chat/route.ts
// Tarot Chat API - Follow-up conversation about tarot readings

import { NextRequest, NextResponse } from 'next/server'
import { initializeApiContext, createAuthenticatedGuard } from '@/lib/api/middleware'
import { apiClient } from '@/lib/api/ApiClient'
import { captureServerError } from '@/lib/telemetry'
import { type ChatMessage } from '@/lib/api'
import { logger } from '@/lib/logger'
import { tarotChatRequestSchema } from '@/lib/api/zodValidation'
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

import { HTTP_STATUS } from '@/lib/constants/http'

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
      return NextResponse.json(
        {
          error: 'validation_failed',
          details: validationResult.error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const {
      messages: validatedMessages,
      context: validatedContext,
      language = 'ko',
    } = validationResult.data
    messages = validatedMessages as ChatMessage[]
    context = validatedContext as TarotContext

    // Credits already consumed by middleware

    // Inject system instruction for consistent, card-grounded replies
    const systemInstruction = buildSystemInstruction(context, language)
    const messagesWithSystem: ChatMessage[] = [
      { role: 'system', content: systemInstruction },
      ...messages,
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

    // Use backend response or fallback
    const responseData = response.data as { reply?: string } | null | undefined
    if (response.ok && responseData && 'reply' in responseData && responseData.reply) {
      const res = NextResponse.json({ reply: responseData.reply })
      res.headers.set('X-Fallback', '0')
      return res
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
    const fallbackReply = generateFallbackReply(messages, context, language)
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

    return NextResponse.json(
      {
        error: 'Internal Server Error',
      },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}

// Fallback response when backend is unavailable
function generateFallbackReply(
  messages: ChatMessage[],
  context: TarotContext,
  language: string
): string {
  const isKorean = language === 'ko'
  const lastMessage = messages[messages.length - 1]?.content.toLowerCase() || ''

  // Check for common intents
  const wantsMoreCards =
    lastMessage.includes('더 뽑') ||
    lastMessage.includes('more card') ||
    lastMessage.includes('draw')
  const asksAboutLove =
    lastMessage.includes('연애') ||
    lastMessage.includes('사랑') ||
    lastMessage.includes('love') ||
    lastMessage.includes('relationship')
  const asksAboutCareer =
    lastMessage.includes('직장') ||
    lastMessage.includes('직업') ||
    lastMessage.includes('career') ||
    lastMessage.includes('work') ||
    lastMessage.includes('job')

  if (wantsMoreCards) {
    return isKorean
      ? `현재 ${context.spread_title} 스프레드로 ${context.cards.length}장의 카드를 뽑으셨습니다. 추가 카드를 뽑으시려면 새로운 리딩을 시작해 주세요. 지금 뽑은 카드들의 메시지에 먼저 집중해 보시는 것도 좋습니다.`
      : `You've drawn ${context.cards.length} cards with the ${context.spread_title} spread. To draw additional cards, please start a new reading. Consider focusing on the messages from your current cards first.`
  }

  if (asksAboutLove) {
    const loveCard = context.cards.find(
      (c) =>
        c.name.toLowerCase().includes('lovers') ||
        c.name.toLowerCase().includes('cups') ||
        c.name.toLowerCase().includes('empress')
    )

    if (loveCard) {
      return isKorean
        ? `당신의 리딩에서 ${loveCard.name} 카드가 연애와 관계에 대한 중요한 메시지를 담고 있습니다. ${loveCard.meaning} 이 카드는 현재 당신의 감정 상태와 관계의 방향을 보여줍니다.`
        : `In your reading, ${loveCard.name} holds important messages about love and relationships. ${loveCard.meaning} This card reflects your current emotional state and relationship direction.`
    }

    return isKorean
      ? `현재 리딩된 카드들을 연애 관점에서 보면, 전반적인 메시지는 다음과 같습니다: ${context.overall_message}`
      : `Looking at your cards from a love perspective, the overall message is: ${context.overall_message}`
  }

  if (asksAboutCareer) {
    const careerCard = context.cards.find(
      (c) =>
        c.name.toLowerCase().includes('pentacles') ||
        c.name.toLowerCase().includes('emperor') ||
        c.name.toLowerCase().includes('wheel')
    )

    if (careerCard) {
      return isKorean
        ? `당신의 리딩에서 ${careerCard.name} 카드가 직업과 경력에 대한 통찰을 제공합니다. ${careerCard.meaning}`
        : `In your reading, ${careerCard.name} provides insight about your career and work. ${careerCard.meaning}`
    }

    return isKorean
      ? `직업적 관점에서 보면, 카드들이 전하는 메시지는: ${context.guidance}`
      : `From a career perspective, the cards' guidance is: ${context.guidance}`
  }

  // Default response - build from actual card data
  const cardSummary = context.cards
    .map((c) => {
      const reversed = (c.is_reversed ?? c.isReversed) ? '(역방향)' : ''
      return `${c.position}: ${c.name}${reversed}`
    })
    .join(', ')

  if (context.overall_message && context.guidance) {
    return isKorean
      ? `${context.spread_title} 리딩에서 ${cardSummary} 카드가 나왔습니다. ${context.overall_message} ${context.guidance}`
      : `Your ${context.spread_title} reading shows: ${cardSummary}. ${context.overall_message} ${context.guidance}`
  }

  // If no interpretation available, give card-based response
  const firstCard = context.cards[0]
  if (firstCard) {
    return isKorean
      ? `${context.spread_title} 리딩에서 ${cardSummary} 카드가 나왔습니다. 특히 ${firstCard.position}에 나온 ${firstCard.name} 카드는 "${firstCard.meaning}" 을 의미합니다. 질문에 대해 더 구체적으로 물어보시면 상세한 해석을 드릴 수 있습니다.`
      : `Your ${context.spread_title} reading shows: ${cardSummary}. The ${firstCard.name} in ${firstCard.position} means "${firstCard.meaning}". Ask more specific questions for detailed interpretation.`
  }

  return isKorean
    ? '카드 정보를 불러오는 중 문제가 발생했습니다. 다시 시도해 주세요.'
    : 'There was an issue loading card information. Please try again.'
}
