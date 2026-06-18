// src/app/api/tarot/daily/route.ts
//
// 오늘의 타로 — 하루 1장 무료 데일리 리딩. 크레딧 차감 없음(checkAndConsume
// 호출 안 함). 재방문 습관 루프 + 매일 공유거리를 만드는 가벼운 진입점.
//
// 남용 방지: 결과를 *당일 캐시* 에 저장해, 같은 날 다시 열면 LLM 재호출 없이
// 같은 카드를 돌려준다(무료라 토큰만이 비용 — 캐시로 1인 1일 1콜로 수렴).
// in-flight 락 + 라우트 레이트리밋으로 동시요청 중복 호출도 완화.
//
// GET  : 오늘 이미 뽑았으면 그 결과, 아니면 ready:false (아직 안 뽑음).
// POST : 오늘 처음이면 뽑고 LLM 해석해 캐시 후 반환, 이미 있으면 그대로.

import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { tarotDeck } from '@/lib/tarot/data'
import type { Card } from '@/lib/tarot/tarot.types'
import { buildInterpretStreamPrompts, type PromptCardInput } from '@/lib/tarot/promptBuild'
import {
  callClaude,
  extractJsonObject,
  isClaudeAvailable,
  PREMIUM_CLAUDE_MODEL,
} from '@/lib/llm/claude'
import { cacheGet, cacheSet } from '@/lib/cache/redis-cache'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

// 한국 제품이라 "오늘" 은 KST 기준. 자정에 카드가 갱신된다.
function todayKeyKST(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10) // YYYY-MM-DD
}

// 자정(KST)까지 남은 초 — 데일리 캐시 TTL. 최소 60초 가드.
function secondsUntilKstMidnight(now: Date = new Date()): number {
  const kstMs = now.getTime() + 9 * 60 * 60 * 1000
  const kst = new Date(kstMs)
  const endOfDay = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + 1, 0, 0, 0)
  return Math.max(60, Math.round((endOfDay - kstMs) / 1000))
}

const dailyKey = (userId: string, date: string) => `tarot:daily:${userId}:${date}`
const dailyLockKey = (userId: string, date: string) => `tarot:daily:lock:${userId}:${date}`

interface DailyReading {
  date: string
  card: { name: string; nameKo: string; isReversed: boolean; image: string }
  overall: string
  interpretation: string
  advice: string
  hook: string
}

function drawOne(): { card: Card; isReversed: boolean } {
  const card = tarotDeck[Math.floor(Math.random() * tarotDeck.length)]
  return { card, isReversed: Math.random() < 0.3 }
}

export const GET = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    const date = todayKeyKST()
    const cached = await cacheGet<DailyReading>(dailyKey(context.userId!, date))
    if (cached) return apiSuccess({ ready: true, reading: cached })
    return apiSuccess({ ready: false })
  },
  createAuthenticatedGuard({ route: '/api/tarot/daily', limit: 30, windowSeconds: 60 })
)

export const POST = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    const userId = context.userId!
    const date = todayKeyKST()
    const key = dailyKey(userId, date)

    // 이미 오늘 뽑았으면 그대로 (무료·동일 카드).
    const existing = await cacheGet<DailyReading>(key)
    if (existing) return apiSuccess({ reading: existing, fresh: false })

    if (!isClaudeAvailable()) {
      return apiError(ErrorCodes.SERVICE_UNAVAILABLE, 'daily_unavailable')
    }

    // in-flight 락 — 같은 사용자의 동시 POST 가 LLM 을 두 번 부르지 않게 베스트
    // 에포트로 막는다(원자적이진 않지만 결과 캐시가 곧 채워져 수렴).
    const lockKey = dailyLockKey(userId, date)
    if (await cacheGet<string>(lockKey)) {
      return apiError(ErrorCodes.RATE_LIMITED, 'daily_in_progress')
    }
    await cacheSet(lockKey, '1', 60)

    try {
      const locale = context.locale === 'en' ? 'en' : 'ko'
      const { card, isReversed } = drawOne()
      const meaning = isReversed ? card.reversed : card.upright
      const promptCard: PromptCardInput = {
        name: card.name,
        nameKo: card.nameKo,
        isReversed,
        keywords: (meaning.keywords || []).slice(0, 8),
        keywordsKo: (meaning.keywordsKo || []).slice(0, 8),
      }
      const dailyQuestion =
        locale === 'ko'
          ? '오늘 하루, 나에게 가장 도움이 될 한 가지는?'
          : 'What one thing will help me most today?'
      const { systemPrompt, userPrompt } = buildInterpretStreamPrompts({
        language: locale,
        spreadTitle: locale === 'ko' ? '오늘의 타로' : "Today's Tarot",
        cards: [promptCard],
        userQuestion: dailyQuestion,
      })

      const { text } = await callClaude({
        systemPrompt,
        userPrompt,
        model: PREMIUM_CLAUDE_MODEL,
        maxTokens: 1200,
        temperature: 0.8,
        timeoutMs: 40000,
        label: 'tarot-daily',
      })

      const parsed = extractJsonObject<{
        overall?: string
        cards?: Array<{ interpretation?: string }>
        advice?: string
        hook?: string
      }>(text)

      const interpretation = (parsed?.cards?.[0]?.interpretation || '').trim()
      const overall = (parsed?.overall || '').trim()
      if (!overall && !interpretation) {
        // 파싱 실패 — 캐시하지 않고 에러(다음 시도에서 재생성).
        logger.warn('[tarot-daily] unusable LLM output', { preview: text.slice(0, 160) })
        return apiError(ErrorCodes.INTERNAL_ERROR, 'daily_generation_failed')
      }

      const reading: DailyReading = {
        date,
        card: {
          name: card.name,
          nameKo: card.nameKo,
          isReversed,
          image: card.image,
        },
        overall,
        interpretation,
        advice: (parsed?.advice || '').trim(),
        hook: (parsed?.hook || '').trim(),
      }

      await cacheSet(key, reading, secondsUntilKstMidnight())
      return apiSuccess({ reading, fresh: true })
    } catch (error) {
      logger.error('[tarot-daily] generation error', error)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'daily_generation_failed')
    } finally {
      await cacheSet(lockKey, '', 1).catch(() => {})
    }
  },
  createAuthenticatedGuard({ route: '/api/tarot/daily', limit: 20, windowSeconds: 60 })
)
