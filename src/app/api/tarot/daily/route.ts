// src/app/api/tarot/daily/route.ts
//
// 오늘의 타로 — 하루 1장 무료 "맛보기" 데일리. 크레딧 차감 없음
// (checkAndConsume 호출 안 함). 재방문 습관 루프 + 매일 공유거리를 만드는
// 가벼운 진입점이자, 유료 리딩으로 가는 미끼(teaser)다.
//
// 의도적으로 "얕게": 한 줄 후크 + 2문장 메시지까지만. 깊은 해석/조언은 유료
// 리딩의 몫이라 여기선 주지 않는다(그래야 "더 깊이 = 질문하기" 전환이 산다).
// 비용도 싸게 — 프리미엄(Sonnet) 대신 기본 Haiku, 출력 토큰도 작게 잡는다.
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
import { callClaude, extractJsonObject, isClaudeAvailable } from '@/lib/llm/claude'
import { cacheGet, cacheSet } from '@/lib/cache/redis-cache'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

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

// 캐시 스키마/프롬프트가 바뀌면 이 버전을 올린다 — 당일 자정 전에도 오래된
// 캐시(예: 짧은 본문)를 우회해 새 결과가 즉시 나오게 한다.
const DAILY_CACHE_VERSION = 'v2'
const dailyKey = (userId: string, date: string) =>
  `tarot:daily:${DAILY_CACHE_VERSION}:${userId}:${date}`
const dailyLockKey = (userId: string, date: string) =>
  `tarot:daily:lock:${DAILY_CACHE_VERSION}:${userId}:${date}`

interface DailyReading {
  date: string
  card: { name: string; nameKo: string; isReversed: boolean; image: string }
  /** 한 줄 후크(공유 카드 펀치라인). */
  hook: string
  /** 맛보기 본문 — 2문장 이내. */
  message: string
}

function drawOne(): { card: Card; isReversed: boolean } {
  const card = tarotDeck[Math.floor(Math.random() * tarotDeck.length)]
  return { card, isReversed: Math.random() < 0.3 }
}

// 데일리 프롬프트 — 한 줄 후크 + 충분히 읽을거리가 되는 본문. 무료지만
// "읽고 나면 만족스러운" 분량(오늘의 흐름 + 구체적 행동 제안)을 준다.
function buildDailyTeaserPrompt(
  locale: 'ko' | 'en',
  cardName: string,
  isReversed: boolean,
  keywords: string[]
): { systemPrompt: string; userPrompt: string } {
  const orientation = isReversed
    ? locale === 'ko'
      ? '역방향'
      : 'reversed'
    : locale === 'ko'
      ? '정방향'
      : 'upright'
  const kw = keywords.slice(0, 6).join(', ')

  if (locale === 'ko') {
    return {
      systemPrompt: [
        '너는 따뜻하고 통찰력 있는 타로 리더다. "오늘의 한 장" 무료 리딩을 준다.',
        '규칙:',
        '- 따뜻하고 구체적으로, 충분히 읽을거리가 되게 쓴다. 단, 한 장짜리라 "오늘 하루"에 집중한다.',
        '- 마크다운(*, _, #, `), 해시태그(#), 따옴표로 문장 전체 감싸기 금지.',
        '- 저주·불행·공포 조장 금지. 양면이 있되 희망의 여지를 남긴다.',
        '- 막연한 덕담 금지. 카드 키워드를 오늘의 상황·감정·행동으로 풀어 구체적으로.',
        '반드시 아래 JSON 만 출력:',
        '{"hook": "한 줄 후크", "message": "본문(4~6문장)"}',
        'hook 규칙: 28자 이내. 2인칭("당신/너")으로 단언하고, 구체적인 디테일 1개를 넣고, 살짝 양면의 트위스트로 여운을 남긴다.',
        'message 규칙: 4~6문장. ①오늘의 큰 흐름 ②카드가 비추는 마음/관계/일의 한 면 ③오늘 해보면 좋은 구체적 행동 1가지 ④따뜻한 마무리 한 줄. 줄바꿈으로 문단을 나눠도 좋다.',
      ].join('\n'),
      userPrompt: [
        `오늘의 카드: ${cardName} (${orientation})`,
        kw ? `키워드: ${kw}` : '',
        '이 한 장으로 "오늘 하루"의 후크 한 줄과 4~6문장 본문을 써라.',
      ]
        .filter(Boolean)
        .join('\n'),
    }
  }

  return {
    systemPrompt: [
      'You are a warm, insightful tarot reader giving a free "card of the day" reading.',
      'Rules:',
      '- Warm, specific, and a satisfying read — but focused on "today" since it is a single card.',
      '- No markdown (*, _, #, `), no hashtags, do not wrap the whole line in quotes.',
      '- No curses, doom, or fear-mongering. Acknowledge both sides but leave hope.',
      '- No vague platitudes. Translate the card keywords into concrete situations, feelings, and actions for today.',
      'Output ONLY this JSON:',
      '{"hook": "one-line hook", "message": "body (4-6 sentences)"}',
      'hook rules: max 12 words. Speak in second person ("you"), make a confident claim, include one concrete detail, end with a slight two-sided twist.',
      'message rules: 4-6 sentences. (1) the overall flow of today (2) one facet the card highlights in your heart/relationships/work (3) one concrete thing worth doing today (4) a warm closing line. Paragraph breaks are fine.',
    ].join('\n'),
    userPrompt: [
      `Card of the day: ${cardName} (${orientation})`,
      kw ? `Keywords: ${kw}` : '',
      'Write a one-line hook and a 4-6 sentence body for "today" from this single card.',
    ]
      .filter(Boolean)
      .join('\n'),
  }
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
      const keywords =
        locale === 'ko' ? meaning.keywordsKo || meaning.keywords || [] : meaning.keywords || []
      const cardName = locale === 'ko' ? card.nameKo || card.name : card.name

      const { systemPrompt, userPrompt } = buildDailyTeaserPrompt(
        locale,
        cardName,
        isReversed,
        keywords
      )

      // 싸게: 기본 모델(Haiku). 무료지만 본문 4~6문장이 잘리지 않게 토큰 여유.
      const { text } = await callClaude({
        systemPrompt,
        userPrompt,
        maxTokens: 900,
        temperature: 0.85,
        timeoutMs: 25000,
        label: 'tarot-daily',
      })

      const parsed = extractJsonObject<{ hook?: string; message?: string }>(text)
      const hook = (parsed?.hook || '').trim()
      const message = (parsed?.message || '').trim()

      // 방탄 폴백 — 모델이 뭘 뱉든 사용자는 항상 한 장의 메시지를 본다.
      // (LLM 이 JSON 을 깨도 키워드로 최소한의 맛보기를 구성.)
      const fallbackMessage =
        locale === 'ko'
          ? `오늘은 ${keywords.slice(0, 3).join(', ') || '변화'}의 기운이 함께해요.`
          : `Today carries the energy of ${keywords.slice(0, 3).join(', ') || 'change'}.`

      const reading: DailyReading = {
        date,
        card: {
          name: card.name,
          nameKo: card.nameKo,
          isReversed,
          image: card.image,
        },
        hook,
        message: message || fallbackMessage,
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
