/**
 * Realtime Counselor — minimal endpoint.
 *
 * Pipeline (the only one we want):
 *   1. Auth + rate-limit + credit check
 *   2. Compute saju + astrology + cross — cached daily per user
 *   3. Hand the cross summary + chat history + question to the LLM
 *   4. Stream the answer back via SSE
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { runFortuneWithRaw, renderToText, serializeBirthSnapshot } from '@/lib/fortune/cross-rules'
import { streamClaudeAsSSE } from '@/lib/llm/claudeSSE'
import { logger } from '@/lib/logger'
import { containsForbidden, safetyMessage } from '@/lib/textGuards'
import { rateLimit } from '@/lib/rateLimit'
import { canUseCredits, consumeCredits } from '@/lib/credits/creditService'
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/cache/redis-cache'
import { compactHistory } from './compactHistory'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface RealtimeBody {
  messages: ChatMessage[]
  lang?: 'ko' | 'en'
  birthDate?: string
  birthTime?: string
  gender?: 'male' | 'female'
  latitude?: number
  longitude?: number
  timezone?: string
}

const RATE_LIMIT_PER_MIN = 12
const CREDIT_PER_TURN = 1

const SYSTEM_PROMPT_KO = `당신은 동양 사주명리와 서양 점성술을 함께 보는 운명 상담사입니다.

당신은 두 종류의 컨텍스트를 받습니다:

1. [Birth Snapshot] — 사주 원국(천간/지지/십성/격국/용신/신살/12운성/지장간 + 현재 대운·세운·월운·일진)과 점성술 원국(행성/사인/하우스/도수 + 현재 transit/return). 룰에 매칭되지 않은 원천 데이터.
2. [Cross Signals] — 위 데이터를 도메인별(자아/사랑/재물/직업/건강/가정)로 룰이 추려낸 "양쪽 동의" / "양면성" 매칭 결과.

규칙:
- 사용자의 질문에 답할 때 먼저 [Cross Signals]를 보고 매칭된 도메인이 있으면 그것을 우선 인용.
- Cross가 비어있거나 질문이 다른 각도이면 [Birth Snapshot] raw에서 직접 패턴을 짚어 설명. (예: 격국+용신 조합, 사주 합화, 행성 aspect, 현재 transit, 12운성)
- 결론을 먼저 1~2문장. 그 다음 근거를 raw 또는 cross에서 인용 (구체적 키워드: "정관격+재성 부귀쌍전" / "Saturn □ natal Moon orb 1.2°" 등).
- 사주만 가리키거나 점성만 가리키면 "단일 신호", 둘 다 가리키면 "양쪽 동의" 표기.
- 모르면 모른다고. 단정·예언 금지.
- 한 번에 한 질문에만 집중.`

const SYSTEM_PROMPT_EN = `You are a destiny counselor combining Eastern Saju and Western Astrology.

You receive two kinds of context:

1. [Birth Snapshot] — raw saju (pillars, ten gods, geokguk, yongsin, shinsal, 12 stages, hidden stems + current daeun/seun/wolun/iljin) and raw astrology (planets with sign/house/degree + current transits/returns).
2. [Cross Signals] — rule-matched per-domain (self/love/money/career/health/family) "both agree" / "tension" findings from the data above.

Rules:
- First check [Cross Signals] for a domain matching the user's question.
- If cross is empty or the angle differs, derive the answer directly from [Birth Snapshot] raw (e.g. geokguk+yongsin combo, saju element transformation, aspect, current transit, 12-stage).
- Lead with the conclusion (1–2 sentences). Then cite specific evidence from raw or cross ("Jeong-gwan-gyeok + Jaeseong fortune-honor pattern" / "Saturn □ natal Moon orb 1.2°" etc.).
- Mark "single signal" when only one system points to it; "both agree" when saju + astro converge.
- Say "I don't know" when uncertain. No absolute claims or prophecies.
- Stay focused on one question per turn.`

function utcDateKey(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function birthFingerprint(b: RealtimeBody): string {
  return [
    b.birthDate ?? '',
    b.birthTime ?? '12:00',
    b.gender ?? 'male',
    b.timezone ?? 'Asia/Seoul',
    b.latitude ?? '',
    b.longitude ?? '',
  ].join('|')
}

export async function POST(req: NextRequest) {
  // 1) Auth
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 2) Rate limit (per user)
  const rl = await rateLimit(`counselor:realtime:${userId}`, {
    limit: RATE_LIMIT_PER_MIN,
    windowSeconds: 60,
  })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfter: rl.retryAfter },
      { status: 429, headers: rl.headers }
    )
  }

  // 3) Parse body
  let body: RealtimeBody
  try {
    body = (await req.json()) as RealtimeBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: 'messages_required' }, { status: 400 })
  }
  if (!body.birthDate) {
    return NextResponse.json({ error: 'birthDate_required' }, { status: 400 })
  }

  const lang: 'ko' | 'en' = body.lang === 'en' ? 'en' : 'ko'
  const userMessage = body.messages[body.messages.length - 1]?.content ?? ''
  if (!userMessage.trim()) {
    return NextResponse.json({ error: 'empty_message' }, { status: 400 })
  }
  if (containsForbidden(userMessage)) {
    return NextResponse.json({ message: safetyMessage(lang) }, { status: 200 })
  }

  // 4) Credit pre-check
  const credit = await canUseCredits(userId, 'reading', CREDIT_PER_TURN)
  if (!credit.allowed) {
    return NextResponse.json(
      { error: 'insufficient_credits', message: credit.reason ?? 'credits required' },
      { status: 402 }
    )
  }

  // 5) Compute (or fetch cached) birth snapshot + cross signals
  const ctxKey = `counselor:ctx:v2:${userId}:${birthFingerprint(body)}:${utcDateKey(new Date())}`
  let contextText: string | null = await cacheGet<string>(ctxKey)
  if (!contextText) {
    try {
      const { saju, astro, report } = await runFortuneWithRaw({
        birth: {
          birthDate: body.birthDate,
          birthTime: body.birthTime ?? '12:00',
          gender: body.gender === 'female' ? 'female' : 'male',
          timezone: body.timezone ?? 'Asia/Seoul',
          latitude: body.latitude ?? 37.5665,
          longitude: body.longitude ?? 126.978,
          astroTimezone: body.timezone ?? 'Asia/Seoul',
        },
        queryDate: new Date(),
      })
      const snapshot = serializeBirthSnapshot(saju, astro)
      const crossText = renderToText(report)
      contextText = `${snapshot}\n\n[Cross Signals]\n${crossText}`
      // Cache for 1 day — transits change daily
      await cacheSet(ctxKey, contextText, CACHE_TTL.CALENDAR_DATA)
    } catch (err) {
      logger.error('[counselor/realtime] context compute failed', { err })
      return NextResponse.json({ error: 'cross_failed' }, { status: 500 })
    }
  }

  // 6) Deduct credits AFTER all validation passed but BEFORE the stream starts.
  // If the stream itself errors mid-way, we still consider the turn paid for —
  // mirrors how every other LLM endpoint in the codebase bills.
  try {
    await consumeCredits(userId, 'reading', CREDIT_PER_TURN)
  } catch (err) {
    logger.warn('[counselor/realtime] credit deduction failed', { err })
    // Don't block the user — observability over enforcement here.
  }

  // 7) Build prompt and stream
  const systemPrompt = lang === 'en' ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_KO
  const history = compactHistory(body.messages)
  const cachedUserContext = contextText
  const userPrompt =
    lang === 'en'
      ? `Conversation so far:\n${history}\n\nAnswer the latest user question using the cross signals.`
      : `이전 대화:\n${history}\n\n위 cross signals를 근거로 마지막 질문에 답하세요.`

  return streamClaudeAsSSE({
    systemPrompt,
    userPrompt,
    cachedUserContext,
    maxTokens: 1500,
    temperature: 0.5,
    label: 'counselor.realtime',
    additionalHeaders: {
      'X-RateLimit-Limit': rl.headers.get('X-RateLimit-Limit') ?? '',
      'X-RateLimit-Remaining': rl.headers.get('X-RateLimit-Remaining') ?? '',
    },
  })
}
