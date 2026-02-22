// src/app/api/tarot/chat/stream/route.ts
// Streaming Tarot Chat API - Real-time SSE proxy to backend

import { NextRequest } from 'next/server'
import { initializeApiContext, createPublicStreamGuard, extractLocale } from '@/lib/api/middleware'
import { createSSEStreamProxy, createFallbackSSEStream } from '@/lib/streaming'
import { apiClient } from '@/lib/api/ApiClient'
import { enforceBodySize } from '@/lib/http'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import {
  cleanStringArray,
  normalizeMessages as normalizeMessagesBase,
  type ChatMessage,
} from '@/lib/api'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { optimizeTarotMessagesForBackend } from '../_lib/messageOptimizer'

import { parseRequestBody } from '@/lib/api/requestParser'
import { tarotChatStreamRequestSchema, createValidationErrorResponse } from '@/lib/api/zodValidation'
interface CardContext {
  position: string
  name: string
  is_reversed: boolean
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

import { MESSAGE_LIMITS, TEXT_LIMITS, LIST_LIMITS } from '@/lib/constants/api-limits'
import { HTTP_STATUS as _HTTP_STATUS } from '@/lib/constants/http'
const MAX_MESSAGES = MESSAGE_LIMITS.MAX_MESSAGES
const MAX_MESSAGE_LENGTH = MESSAGE_LIMITS.MAX_MESSAGE_LENGTH
const MAX_CARD_COUNT = LIST_LIMITS.MAX_CARDS
const MAX_CARD_TEXT = TEXT_LIMITS.MAX_CARD_TEXT
const MAX_TITLE_TEXT = TEXT_LIMITS.MAX_TITLE
const MAX_GUIDANCE_TEXT = TEXT_LIMITS.MAX_GUIDANCE
const MAX_CHAT_CONTEXT_CARDS = 8

// Use shared normalizeMessages with local config
function normalizeMessages(raw: unknown): ChatMessage[] {
  return normalizeMessagesBase(raw, {
    maxMessages: MAX_MESSAGES,
    maxLength: MAX_MESSAGE_LENGTH,
  })
}

function sanitizeCards(raw: unknown): CardContext[] {
  if (!Array.isArray(raw)) {
    return []
  }
  const cards: CardContext[] = []
  for (const card of raw.slice(0, Math.min(MAX_CARD_COUNT, MAX_CHAT_CONTEXT_CARDS))) {
    if (!card || typeof card !== 'object') {
      continue
    }
    const record = card as Record<string, unknown>
    const position =
      typeof record.position === 'string' ? record.position.trim().slice(0, MAX_TITLE_TEXT) : ''
    const name = typeof record.name === 'string' ? record.name.trim().slice(0, MAX_TITLE_TEXT) : ''
    const meaning =
      typeof record.meaning === 'string' ? record.meaning.trim().slice(0, MAX_CARD_TEXT) : ''
    if (!position || !name || !meaning) {
      continue
    }
    const isReversed = Boolean(record.is_reversed ?? record.isReversed)
    const keywords = cleanStringArray(record.keywords)
    cards.push({
      position,
      name,
      is_reversed: isReversed,
      meaning,
      keywords,
    })
  }
  return cards
}

function sanitizeContext(raw: unknown): TarotContext | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const record = raw as Record<string, unknown>
  const spread_title =
    typeof record.spread_title === 'string'
      ? record.spread_title.trim().slice(0, MAX_TITLE_TEXT)
      : ''
  const category =
    typeof record.category === 'string' ? record.category.trim().slice(0, MAX_TITLE_TEXT) : ''
  const cards = sanitizeCards(record.cards)
  const overall_message =
    typeof record.overall_message === 'string'
      ? record.overall_message.trim().slice(0, MAX_GUIDANCE_TEXT)
      : ''
  const guidance =
    typeof record.guidance === 'string' ? record.guidance.trim().slice(0, MAX_GUIDANCE_TEXT) : ''

  if (!spread_title || !category || cards.length === 0) {
    return null
  }

  return { spread_title, category, cards, overall_message, guidance }
}

interface PersonalityData {
  typeCode: string
  personaName: string
  energyScore: number
  cognitionScore: number
  decisionScore: number
  rhythmScore: number
  analysisData: {
    summary?: string
    keyMotivations?: string[]
    strengths?: string[]
    challenges?: string[]
  }
}

function getPersonalityLabel(score: number, trueLabel: string, falseLabel: string): string {
  return score >= 50 ? trueLabel : falseLabel
}

function buildPersonalityContext(personality: PersonalityData, language: 'ko' | 'en'): string {
  const {
    typeCode,
    personaName,
    energyScore,
    cognitionScore,
    decisionScore,
    rhythmScore,
    analysisData,
  } = personality

  if (language === 'ko') {
    return [
      '\n\n사용자 성격 정보 (Nova Persona):',
      `- 페르소나: ${personaName} (${typeCode})`,
      `- 에너지: ${getPersonalityLabel(energyScore, 'Radiant(외향적)', 'Grounded(내향적)')} ${energyScore}`,
      `- 인지: ${getPersonalityLabel(cognitionScore, 'Visionary(직관적)', 'Structured(체계적)')} ${cognitionScore}`,
      `- 결정: ${getPersonalityLabel(decisionScore, 'Logic(논리적)', 'Empathic(공감적)')} ${decisionScore}`,
      `- 리듬: ${getPersonalityLabel(rhythmScore, 'Flow(유동적)', 'Anchor(안정적)')} ${rhythmScore}`,
      analysisData.keyMotivations
        ? `- 핵심 동기: ${analysisData.keyMotivations.slice(0, 2).join(', ')}`
        : '',
      analysisData.strengths ? `- 강점: ${analysisData.strengths.slice(0, 2).join(', ')}` : '',
      '\n이 성격 정보를 바탕으로 사용자의 성향에 맞춰 조언을 개인화해줘.',
      `예: ${getPersonalityLabel(energyScore, '외향적이므로 다른 사람과 함께하는 행동 제안', '내향적이므로 혼자 성찰하는 시간 제안')}`,
      `${getPersonalityLabel(cognitionScore, '비전과 가능성 중심으로', '구체적이고 단계별로')} 설명해줘.`,
    ]
      .filter(Boolean)
      .join('\n')
  } else {
    return [
      '\n\nUser Personality (Nova Persona):',
      `- Persona: ${personaName} (${typeCode})`,
      `- Energy: ${getPersonalityLabel(energyScore, 'Radiant(extroverted)', 'Grounded(introverted)')} ${energyScore}`,
      `- Cognition: ${getPersonalityLabel(cognitionScore, 'Visionary(intuitive)', 'Structured(systematic)')} ${cognitionScore}`,
      `- Decision: ${getPersonalityLabel(decisionScore, 'Logic-focused', 'Empathy-focused')} ${decisionScore}`,
      `- Rhythm: ${getPersonalityLabel(rhythmScore, 'Flow(flexible)', 'Anchor(stable)')} ${rhythmScore}`,
      analysisData.keyMotivations
        ? `- Key motivations: ${analysisData.keyMotivations.slice(0, 2).join(', ')}`
        : '',
      analysisData.strengths ? `- Strengths: ${analysisData.strengths.slice(0, 2).join(', ')}` : '',
      '\nPersonalize advice based on this personality.',
      `E.g., ${getPersonalityLabel(energyScore, 'suggest social actions', 'suggest introspective time')},`,
      `${getPersonalityLabel(cognitionScore, 'focus on vision and possibilities', 'provide concrete step-by-step guidance')}.`,
    ]
      .filter(Boolean)
      .join('\n')
  }
}

function formatCardLines(cards: CardContext[], language: 'ko' | 'en'): string {
  return cards
    .map((c, idx) => {
      const pos = c.position || `Card ${idx + 1}`
      const orient = c.is_reversed
        ? language === 'ko'
          ? '역위'
          : 'reversed'
        : language === 'ko'
          ? '정위'
          : 'upright'
      return `- ${pos}: ${c.name} (${orient})`
    })
    .join('\n')
}

function buildKoreanInstruction(
  context: TarotContext,
  cardLines: string,
  personalityContext: string
): string {
  return [
    '너는 따뜻하고 통찰력 있는 타로 상담사다. 항상 실제로 뽑힌 카드와 위치를 근거로 깊이 있는 해석을 제공해.',
    '',
    '출력 형식 (반드시 모든 섹션을 포함할 것):',
    '1) 핵심 메시지: 카드명과 포지션을 명시하며 한 문장으로 핵심 통찰 전달',
    '',
    '2) 카드 해석 (각 카드별 4-5줄):',
    '   - 카드명, 포지션, 정위/역위 여부 명시',
    '   - 이 카드가 이 위치에서 갖는 전통적 의미',
    '   - 질문자의 상황에 맞춘 구체적 해석',
    '   - 카드의 상징과 이미지가 전하는 메시지',
    '',
    '3) 카드 조합 해석: 여러 카드가 함께 만들어내는 스토리와 시너지 설명 (2-3줄)',
    '',
    '4) 실행 가능한 조언 3가지:',
    '   - 오늘 할 수 있는 구체적 행동',
    '   - 이번 주 실천할 수 있는 것',
    '   - 장기적으로 염두에 둘 방향',
    '',
    '5) 마무리: 따뜻한 격려의 말과 함께 생각해볼 후속 질문 1개',
    '',
    '안전: 의료/법률/투자/응급 상황은 전문 상담을 권유하고 조언은 일반 정보임을 명시해.',
    '길이: 전체 300-400단어로 충실하게 작성. 각 섹션을 빠짐없이 포함할 것.',
    '톤: 신비롭지만 현실적이고, 공감하면서도 구체적인 조언을 제공.',
    personalityContext,
    '스프레드와 카드 목록:',
    `스프레드: ${context.spread_title} (${context.category})`,
    cardLines || '(카드 없음)',
  ].join('\n')
}

function buildEnglishInstruction(
  context: TarotContext,
  cardLines: string,
  personalityContext: string
): string {
  return [
    'You are a warm and insightful tarot counselor. Always ground your interpretations in the actual drawn cards and their positions.',
    '',
    'Output format (include ALL sections):',
    '1) Core Message: One sentence with card name and position, delivering the key insight',
    '',
    '2) Card Interpretation (4-5 lines per card):',
    '   - State card name, position, and upright/reversed',
    '   - Traditional meaning of this card in this position',
    "   - Specific interpretation tailored to the querent's situation",
    '   - Symbolic imagery and what message it conveys',
    '',
    '3) Card Combination: Explain the story and synergy created by multiple cards together (2-3 lines)',
    '',
    '4) Three Actionable Steps:',
    '   - Something concrete to do today',
    '   - Something to practice this week',
    '   - A long-term direction to keep in mind',
    '',
    '5) Closing: Warm encouragement with one follow-up question to ponder',
    '',
    'Safety: For medical/legal/financial/emergency matters, recommend professional help and note this is general guidance.',
    'Length: Write thoroughly in 300-400 words. Include every section without skipping.',
    'Tone: Mystical yet practical, empathetic yet specific in advice.',
    personalityContext,
    'Spread and cards:',
    `Spread: ${context.spread_title} (${context.category})`,
    cardLines || '(no cards)',
  ].join('\n')
}

function buildSystemInstruction(
  context: TarotContext,
  language: 'ko' | 'en',
  personality?: PersonalityData | null
): string {
  const cardLines = formatCardLines(context.cards, language)
  const personalityContext = personality ? buildPersonalityContext(personality, language) : ''

  return language === 'ko'
    ? buildKoreanInstruction(context, cardLines, personalityContext)
    : buildEnglishInstruction(context, cardLines, personalityContext)
}

function generateFallbackMessage(
  tarotContext: TarotContext,
  lastUserMessage: string,
  language: 'ko' | 'en'
): string {
  const cardSummary = tarotContext.cards.map((c) => `${c.position}: ${c.name}`).join(', ')

  if (language === 'ko') {
    return `${tarotContext.spread_title} 리딩에서 ${cardSummary} 카드가 나왔네요. "${lastUserMessage}"에 대해 말씀드리면, 카드들이 전하는 메시지는 ${tarotContext.overall_message || '내면의 지혜를 믿으라는 것'}입니다. ${tarotContext.guidance || '카드의 조언에 귀 기울여보세요.'}\n\n다음으로 물어볼 것: 특정 카드에 대해 더 자세히 알고 싶으신가요?`
  } else {
    return `In your ${tarotContext.spread_title} reading with ${cardSummary}, regarding "${lastUserMessage}", the cards suggest: ${tarotContext.overall_message || 'trust your inner wisdom'}. ${tarotContext.guidance || 'Listen to the guidance of the cards.'}\n\nNext question: Would you like to explore any specific card in more detail?`
  }
}

// LRU-style in-memory cache for personality data with TTL and periodic cleanup
const PERSONALITY_CACHE_MAX = 100
const PERSONALITY_CACHE_TTL = 1000 * 60 * 60 // 1시간
const personalityCache = new Map<string, { data: PersonalityData | null; timestamp: number }>()

// Periodic cleanup of expired entries (runs every 10 minutes)
let _cleanupTimer: ReturnType<typeof setInterval> | null = null
function ensureCacheCleanup() {
  if (_cleanupTimer) return
  _cleanupTimer = setInterval(
    () => {
      const now = Date.now()
      for (const [key, entry] of personalityCache) {
        if (now - entry.timestamp > PERSONALITY_CACHE_TTL) {
          personalityCache.delete(key)
        }
      }
    },
    10 * 60 * 1000
  )
  // Allow the process to exit without waiting for this timer
  if (_cleanupTimer && typeof _cleanupTimer === 'object' && 'unref' in _cleanupTimer) {
    _cleanupTimer.unref()
  }
}

async function fetchUserPersonality(userId: string): Promise<PersonalityData | null> {
  ensureCacheCleanup()

  // 캐시 확인 (LRU: move accessed entry to end)
  const cached = personalityCache.get(userId)
  if (cached && Date.now() - cached.timestamp < PERSONALITY_CACHE_TTL) {
    // Move to end for LRU ordering
    personalityCache.delete(userId)
    personalityCache.set(userId, cached)
    return cached.data
  }

  try {
    const personalityResult = await prisma.personalityResult.findUnique({
      where: { userId },
      select: {
        typeCode: true,
        personaName: true,
        energyScore: true,
        cognitionScore: true,
        decisionScore: true,
        rhythmScore: true,
        analysisData: true,
      },
    })

    if (!personalityResult || !personalityResult.analysisData) {
      personalityCache.set(userId, { data: null, timestamp: Date.now() })
      return null
    }

    const analysisData = personalityResult.analysisData as Record<string, unknown>
    const result: PersonalityData = {
      typeCode: personalityResult.typeCode,
      personaName: personalityResult.personaName,
      energyScore: personalityResult.energyScore,
      cognitionScore: personalityResult.cognitionScore,
      decisionScore: personalityResult.decisionScore,
      rhythmScore: personalityResult.rhythmScore,
      analysisData: {
        summary: typeof analysisData.summary === 'string' ? analysisData.summary : undefined,
        keyMotivations: Array.isArray(analysisData.keyMotivations)
          ? analysisData.keyMotivations.filter((x): x is string => typeof x === 'string')
          : undefined,
        strengths: Array.isArray(analysisData.strengths)
          ? analysisData.strengths.filter((x): x is string => typeof x === 'string')
          : undefined,
        challenges: Array.isArray(analysisData.challenges)
          ? analysisData.challenges.filter((x): x is string => typeof x === 'string')
          : undefined,
      },
    }

    personalityCache.set(userId, { data: result, timestamp: Date.now() })
    // LRU eviction: remove oldest entries when cache exceeds limit
    while (personalityCache.size > PERSONALITY_CACHE_MAX) {
      const oldestKey = personalityCache.keys().next().value
      if (oldestKey) personalityCache.delete(oldestKey)
      else break
    }

    return result
  } catch (err) {
    logger.error('[TarotChatStream] Failed to fetch personality:', err)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    // Apply middleware: rate limiting + public token auth + credit consumption
    const guardOptions = createPublicStreamGuard({
      route: 'tarot-chat-stream',
      limit: 30,
      windowSeconds: 60,
      requireCredits: true,
      creditType: 'followUp', // 타로 후속 질문은 followUp 타입 사용
      creditAmount: 1,
    })

    const { context, error } = await initializeApiContext(req, guardOptions)
    if (error) {
      return error
    }

    const oversized = enforceBodySize(req, 256 * 1024)
    if (oversized) {
      return oversized
    }

    const rawBody = await parseRequestBody<Record<string, unknown>>(req, {
      context: 'Tarot Chat Stream',
    })
    if (!rawBody || typeof rawBody !== 'object') {
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
        locale: extractLocale(req),
        route: 'tarot/chat/stream',
      })
    }

    // Validate with Zod
    const validationResult = tarotChatStreamRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Tarot chat-stream] validation failed', {
        errors: validationResult.error.issues,
      })
      return createValidationErrorResponse(validationResult.error, {
        locale: extractLocale(req),
        route: 'tarot/chat/stream',
      })
    }

    const validatedData = validationResult.data
    const language = (validatedData.language || context.locale) as 'ko' | 'en'
    const messages = normalizeMessages(validatedData.messages)
    const optimizedMessages = optimizeTarotMessagesForBackend(messages, language, {
      maxMessages: 8,
      maxUserLength: 1400,
      maxAssistantLength: 650,
    })
    const tarotContext = sanitizeContext(validatedData.context)
    const counselorId = validatedData.counselor_id
    const counselorStyle = validatedData.counselor_style

    if (!messages || messages.length === 0) {
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Missing messages',
        locale: extractLocale(req),
        route: 'tarot/chat/stream',
      })
    }
    if (!tarotContext) {
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid tarot context',
        locale: extractLocale(req),
        route: 'tarot/chat/stream',
      })
    }

    // Credits already consumed by middleware

    // Fetch user's personality result (if authenticated)
    let personalityData: PersonalityData | null = null
    const session = await getServerSession(authOptions)
    if (session?.user?.id) {
      personalityData = await fetchUserPersonality(session.user.id)
    }

    // Inject system guardrails for consistent, card-grounded answers with personality
    const systemInstruction = buildSystemInstruction(tarotContext, language, personalityData)
    const messagesWithSystem: ChatMessage[] = [
      { role: 'system', content: systemInstruction },
      ...optimizedMessages,
    ]

    // Call backend streaming endpoint using apiClient
    const streamResult = await apiClient.postSSEStream('/api/tarot/chat-stream', {
      messages: messagesWithSystem,
      context: tarotContext,
      language,
      counselor_id: counselorId,
      counselor_style: counselorStyle,
    })

    if (!streamResult.ok) {
      logger.error('[TarotChatStream] Backend error:', {
        status: streamResult.status,
        error: streamResult.error,
      })

      // Generate fallback response based on context
      const lastUserMessage = optimizedMessages.filter((m) => m.role === 'user').pop()?.content || ''
      const fallbackMessage = generateFallbackMessage(tarotContext, lastUserMessage, language)

      return createFallbackSSEStream({
        content: fallbackMessage,
        done: true,
        'X-Fallback': '1',
      })
    }

    // Proxy the SSE stream from backend to client
    return createSSEStreamProxy({
      source: streamResult.response,
      route: 'TarotChatStream',
      additionalHeaders: {
        'X-Fallback': '0',
      },
    })
  } catch (err: unknown) {
    logger.error('Tarot chat stream error:', err)
    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      route: 'tarot/chat/stream',
      originalError: err instanceof Error ? err : new Error(String(err)),
    })
  }
}
