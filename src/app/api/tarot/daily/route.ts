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

import { createHash, randomUUID } from 'crypto'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import {
  withApiMiddleware,
  createPublicStreamGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { tarotDeck } from '@/lib/tarot/data'
import { TAROT_REVERSED_BYTE_THRESHOLD } from '@/lib/tarot/reversedProbability'
import type { Card } from '@/lib/tarot/tarot.types'
import { callClaude, extractJsonObject, isClaudeAvailable } from '@/lib/llm/claude'
import { cacheGet, cacheSet } from '@/lib/cache/redis-cache'
import { recordCounter } from '@/lib/metrics/index'
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
const DAILY_CACHE_VERSION = 'v5'
const dailyKey = (id: string, date: string) => `tarot:daily:${DAILY_CACHE_VERSION}:${id}:${date}`
const dailyLockKey = (id: string, date: string) =>
  `tarot:daily:lock:${DAILY_CACHE_VERSION}:${id}:${date}`

// 로그인 없이도 "오늘의 카드" 1장은 맛보게 한다(바이럴 유입 — 받은 사람이
// 가입 없이 결과부터 본다). 게스트 식별:
//  1) 로그인 → u:{userId}
//  2) 클라가 보낸 안정적 게스트 id(localStorage) → g:{id}
//  3) 둘 다 없으면 IP+UA 지문 → 쿠키 없이도 같은 기기는 같은 카드(당일 캐시·
//     결정적 추첨·1일 1장이 흔들리지 않게). 비용은 라우트 IP 레이트리밋이 가둠.
function clientFingerprint(req: NextRequest): string {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'noip'
  const ua = req.headers.get('user-agent') || 'noua'
  return createHash('sha256').update(`${ip}|${ua}`).digest('base64url').slice(0, 16)
}

const GUEST_ID_RE = /^[A-Za-z0-9_-]{8,64}$/
const GUEST_COOKIE = 'dp_guest'

// 새 게스트에게 발급할 브라우저 고유 id — 쿠키에 심어 다음 요청부터 안정 식별.
function randomGuestId(): string {
  return randomUUID().replace(/-/g, '').slice(0, 24)
}

// 게스트/유저 식별. 우선순위:
//  1) 로그인 → u:{userId}
//  2) localStorage 게스트 id(x-dp-guest 헤더) → g:{id}
//  3) 서버 발급 게스트 쿠키 → g:{id}
//  4) 둘 다 없으면(예: 인앱 브라우저가 localStorage 를 막은 신규 게스트):
//     이번 응답은 안정적 지문으로 답하되(당일 캐시·1일1장 유지), 브라우저
//     고유 쿠키를 새로 발급해 *다음* 요청부터 g:{쿠키} 로 승격시킨다. 이렇게
//     하면 같은 IP+UA(같은 와이파이+같은 기종) 두 사람이 같은 카드를 받던 지문
//     충돌이 사라진다. 쿠키까지 막힌 극단적 환경에서도 지문 덕에 기존과
//     동일하게 안정적으로 동작한다.
//
// 쿠키는 next/headers 로 심는다 — Set-Cookie 를 NextResponse init 헤더로 넣으면
// undici 가 제거하지만(금지 헤더), cookies().set() 은 프레임워크가 최종 응답에
// 확실히 붙여준다. HttpOnly 라 서버만 읽고 클라 localStorage 와 독립적이다.
async function resolveDailyId(
  req: NextRequest,
  userId: string | null | undefined
): Promise<string> {
  if (userId) return `u:${userId}`

  const raw = (req.headers.get('x-dp-guest') || '').trim()
  if (GUEST_ID_RE.test(raw)) return `g:${raw}`

  const cookieId = (req.cookies.get(GUEST_COOKIE)?.value || '').trim()
  if (GUEST_ID_RE.test(cookieId)) return `g:${cookieId}`

  const fresh = randomGuestId()
  try {
    const jar = await cookies()
    jar.set(GUEST_COOKIE, fresh, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 34560000, // ~400일(브라우저 상한)
    })
  } catch {
    // request scope 밖(비정상 실행 경로)이면 쿠키 발급만 건너뛴다 — 식별은 지문으로 계속.
  }
  return `g:${clientFingerprint(req)}`
}

interface DailyReading {
  date: string
  card: { name: string; nameKo: string; isReversed: boolean; image: string }
  /** 한 줄 후크(공유 카드 펀치라인). */
  hook: string
  /** 맛보기 본문 — 2문장 이내. */
  message: string
}

// 데일리 카드는 (userId, KST날짜)의 순수 함수 — 같은 날 같은 사람은 항상 같은
// 카드. 캐시가 사라지거나(에빅션·인스턴스 교체) 동시 요청 레이스가 나도 재추첨
// 시 동일 카드가 나와, "하루 1장(같은 카드)" 불변식이 캐시에 의존하지 않는다.
function drawDaily(userId: string, date: string): { card: Card; isReversed: boolean } {
  const h = createHash('sha256').update(`${userId}:${date}`).digest()
  const idx = h.readUInt32BE(0) % tarotDeck.length
  // 역방향 확률 SSOT 를 바이트 임계값으로 환산(byte<threshold). 38/256 ≈ 0.15.
  const reversed = h[4] < TAROT_REVERSED_BYTE_THRESHOLD
  return { card: tarotDeck[idx], isReversed: reversed }
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
        '- 말투: 마주 앉아 카드를 펴주며 말해주듯 따뜻한 *해요체 존댓말*("~해요/~예요/~보세요"). 반말("~해/~할 거야/~네") 절대 금지.',
        '- 따뜻하고 구체적으로, 충분히 읽을거리가 되게 쓴다. 단, 한 장짜리라 "오늘 하루"에 집중한다.',
        '- 마크다운(*, _, #, `), 해시태그(#), 따옴표로 문장 전체 감싸기 금지.',
        '- 저주·불행·공포 조장 금지. 양면이 있되 희망의 여지를 남긴다.',
        '- 막연한 덕담 금지. 카드 키워드를 오늘의 상황·감정·행동으로 풀어 구체적으로.',
        '반드시 아래 JSON 만 출력:',
        '{"hook": "한 줄 후크", "message": "본문(4~6문장)"}',
        'hook 규칙: *완결된 한 문장* (22자 이내). 물음표·말줄임표(…)·따옴표 금지 — 공유 이미지에서 잘린 것처럼 보이면 안 된다. 2인칭("당신")으로 나를 콕 집어 말하듯 *단정적으로*, 구체적 디테일 1개. *해요체 존댓말*, 반말 금지. (예: "오늘 당신, 미뤄둔 그 일에 드디어 손이 가요.")',
        'message 규칙: 4~6문장 *해요체 존댓말*. ①오늘의 큰 흐름 ②카드가 비추는 마음/관계/일의 한 면 ③오늘 해보면 좋은 구체적 행동 1가지 ④따뜻한 마무리 한 줄. *한 문단으로 자연스럽게 이어 쓰고, 중간에 줄바꿈(빈 줄)은 넣지 마라.*',
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
      'hook rules: ONE complete sentence, max 10 words. NO question mark, NO ellipsis, NO quotes — it must not look cut off in a share image. Second person ("you"), a blunt declarative call-out with one concrete detail. A statement, not a question. (e.g. "You finally reach for the thing you kept putting off.")',
      'message rules: 4-6 sentences. (1) the overall flow of today (2) one facet the card highlights in your heart/relationships/work (3) one concrete thing worth doing today (4) a warm closing line. Write it as ONE flowing paragraph — do not insert line breaks or blank lines.',
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
  async (req: NextRequest, context: ApiContext) => {
    const id = await resolveDailyId(req, context.userId)
    const date = todayKeyKST()
    const cached = await cacheGet<DailyReading>(dailyKey(id, date))
    if (cached) return apiSuccess({ ready: true, reading: cached })
    return apiSuccess({ ready: false })
  },
  createPublicStreamGuard({ route: '/api/tarot/daily', limit: 30, windowSeconds: 60 })
)

export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const id = await resolveDailyId(req, context.userId)
    const date = todayKeyKST()
    const key = dailyKey(id, date)

    // 이미 오늘 뽑았으면 그대로 (무료·동일 카드).
    const existing = await cacheGet<DailyReading>(key)
    if (existing) return apiSuccess({ reading: existing, fresh: false })

    if (!isClaudeAvailable()) {
      return apiError(ErrorCodes.SERVICE_UNAVAILABLE, 'daily_unavailable')
    }

    // in-flight 락 — 같은 사용자의 동시 POST 가 LLM 을 두 번 부르지 않게 베스트
    // 에포트로 막는다(원자적이진 않지만 결과 캐시가 곧 채워져 수렴).
    const lockKey = dailyLockKey(id, date)
    if (await cacheGet<string>(lockKey)) {
      return apiError(ErrorCodes.RATE_LIMITED, 'daily_in_progress')
    }
    await cacheSet(lockKey, '1', 60)

    try {
      const locale = context.locale === 'en' ? 'en' : 'ko'
      const { card, isReversed } = drawDaily(id, date)
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
        maxTokens: 550,
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
      // 퍼널 측정 — 신규 데일리 1장(게스트/유저 구분). 시딩 효과를 숫자로 본다.
      recordCounter('tarot.daily.drawn', 1, { source: context.userId ? 'user' : 'guest' })
      return apiSuccess({ reading, fresh: true })
    } catch (error) {
      logger.error('[tarot-daily] generation error', error)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'daily_generation_failed')
    } finally {
      await cacheSet(lockKey, '', 1).catch(() => {})
    }
  },
  // failClosed: Claude call — deny on Redis outage rather than fail open (cost guard).
  createPublicStreamGuard({
    route: '/api/tarot/daily',
    limit: 20,
    windowSeconds: 60,
    failClosed: true,
  })
)
