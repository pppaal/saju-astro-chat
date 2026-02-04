// src/app/api/dream/stream/route.ts
// Streaming Dream Interpretation API - Real-time SSE for fast display

import { createStreamRoute } from '@/lib/streaming'
import { createPublicStreamGuard } from '@/lib/api/middleware'
import { dreamStreamSchema, type DreamStreamValidated } from '@/lib/api/zodValidation'
import { cleanStringArray, isRecord } from '@/lib/api'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { BODY_LIMITS, TEXT_LIMITS } from '@/lib/constants/api-limits'
import { DATE_RE, TIME_RE, LIMITS } from '@/lib/validation/patterns'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_TEXT_LEN = TEXT_LIMITS.MAX_DREAM_TEXT
const MAX_TIMEZONE_LEN = LIMITS.TIMEZONE

function sanitizeBirth(raw: unknown) {
  if (!isRecord(raw)) return undefined
  const date = typeof raw.date === 'string' && DATE_RE.test(raw.date) ? raw.date : undefined
  const time = typeof raw.time === 'string' && TIME_RE.test(raw.time) ? raw.time : undefined
  const timezone =
    typeof raw.timezone === 'string' ? raw.timezone.trim().slice(0, MAX_TIMEZONE_LEN) : undefined
  const latNum = Number(raw.latitude)
  const lonNum = Number(raw.longitude)
  const latitude = Number.isFinite(latNum) && latNum >= -90 && latNum <= 90 ? latNum : undefined
  const longitude = Number.isFinite(lonNum) && lonNum >= -180 && lonNum <= 180 ? lonNum : undefined
  const gender = typeof raw.gender === 'string' ? raw.gender.trim().slice(0, 20) : undefined

  if (!date && !time && latitude === undefined && longitude === undefined && !timezone && !gender) {
    return undefined
  }
  return { date, time, timezone, latitude, longitude, gender }
}

export const POST = createStreamRoute<DreamStreamValidated>({
  route: 'DreamStream',
  guard: createPublicStreamGuard({
    route: 'dream-stream',
    limit: 10,
    windowSeconds: 60,
    requireCredits: true,
    creditType: 'reading',
    creditAmount: 1,
  }),
  schema: dreamStreamSchema,
  maxBodySize: BODY_LIMITS.STREAM,
  fallbackMessage: {
    ko: '일시적으로 꿈 해석 서비스를 이용할 수 없습니다. 잠시 후 다시 시도해주세요.',
    en: 'Dream interpretation service temporarily unavailable. Please try again later.',
  },
  async buildPayload(validated, context) {
    const dreamText = validated.dreamText.slice(0, MAX_TEXT_LEN)
    const symbols = cleanStringArray(validated.symbols)
    const emotions = cleanStringArray(validated.emotions)
    const themes = cleanStringArray(validated.themes)
    const contextArray = cleanStringArray(validated.context)
    const locale = (validated.locale || context.locale) as 'ko' | 'en'
    const koreanTypes = cleanStringArray(validated.koreanTypes)
    const koreanLucky = cleanStringArray(validated.koreanLucky)
    const chinese = cleanStringArray(validated.chinese)
    const islamicTypes = cleanStringArray(validated.islamicTypes)
    const western = cleanStringArray(validated.western)
    const hindu = cleanStringArray(validated.hindu)
    const japanese = cleanStringArray(validated.japanese)
    const birth = sanitizeBirth(validated.birth)
    const sajuInfluence = isRecord(validated.sajuInfluence) ? validated.sajuInfluence : undefined

    return {
      endpoint: '/api/dream/interpret-stream',
      body: {
        dream: dreamText,
        symbols,
        emotions,
        themes,
        context: contextArray,
        locale,
        koreanTypes,
        koreanLucky,
        chinese,
        islamicTypes,
        western,
        hindu,
        japanese,
        birth,
        sajuInfluence,
      },
    }
  },
  async afterStream(validated, context) {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id || context.userId
    if (!userId) return

    try {
      const symbols = cleanStringArray(validated.symbols)
      const symbolsStr = symbols.slice(0, 5).join(', ')
      await prisma.reading.create({
        data: {
          userId,
          type: 'dream',
          title: symbolsStr ? `꿈 해석: ${symbolsStr}` : '꿈 해석',
          content: JSON.stringify({
            dreamText: validated.dreamText.slice(0, 500),
            symbols,
            emotions: cleanStringArray(validated.emotions),
            themes: cleanStringArray(validated.themes),
            context: cleanStringArray(validated.context),
            koreanTypes: cleanStringArray(validated.koreanTypes),
            koreanLucky: cleanStringArray(validated.koreanLucky),
          }),
        },
      })
    } catch (saveErr) {
      logger.warn('[Dream API] Failed to save reading:', saveErr)
    }
  },
})
