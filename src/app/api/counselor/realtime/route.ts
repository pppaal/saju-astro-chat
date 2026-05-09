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
import { runFortune, renderToText } from '@/lib/fortune/cross-rules'
import { streamClaudeAsSSE } from '@/lib/llm/claudeSSE'
import { logger } from '@/lib/logger'
import { containsForbidden, safetyMessage } from '@/lib/textGuards'
import { rateLimit } from '@/lib/rateLimit'
import { canUseCredits, consumeCredits } from '@/lib/credits/creditService'
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/cache/redis-cache'

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
const HISTORY_KEEP_TURNS = 4 // last N turns sent verbatim
const CREDIT_PER_TURN = 1

const SYSTEM_PROMPT_KO = `당신은 동양 사주명리와 서양 점성술을 함께 보는 운명 상담사입니다.

규칙:
- 아래 [Cross Signals] 블록에 사주·점성·교차분석이 이미 정리되어 있습니다.
- 사용자의 질문을 그 신호에 비추어 직접 답하세요.
- 결론을 먼저 1~2문장. 그다음 근거를 cross signal로 연결.
- 양쪽 시스템이 같이 가리키면 "강한 신호", 한쪽만이면 "약함" 또는 "참고용"으로 표시.
- 모르면 모른다고. 단정 금지.
- 한 번에 한 가지에 집중. 산만한 만물상담 금지.`

const SYSTEM_PROMPT_EN = `You are a destiny counselor combining Eastern Saju and Western Astrology.

Rules:
- The [Cross Signals] block below already contains the computed saju, astrology, and cross-analysis.
- Answer the user's question by interpreting those signals directly.
- Lead with the conclusion (1–2 sentences). Then link evidence from cross signals.
- If both systems agree, mark as "strong signal". If only one, mark as "weak" or "for reference".
- Say "I don't know" when uncertain. No absolute claims.
- Focus on one question at a time.`

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

/** Keep last N turns verbatim; collapse older ones into a single tag line. */
function compactHistory(messages: ChatMessage[]): string {
  if (messages.length === 0) return ''
  const recent = messages.slice(-HISTORY_KEEP_TURNS)
  const olderCount = Math.max(0, messages.length - recent.length)
  const olderLine =
    olderCount > 0 ? `(earlier ${olderCount} turn${olderCount > 1 ? 's' : ''} omitted)\n` : ''
  return (
    olderLine +
    recent.map((m) => `${m.role === 'user' ? 'User' : 'Counselor'}: ${m.content}`).join('\n')
  )
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
      { status: 429, headers: rl.headers },
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
      { status: 402 },
    )
  }

  // 5) Compute (or fetch cached) cross signals
  const crossKey = `cross:v1:${userId}:${birthFingerprint(body)}:${utcDateKey(new Date())}`
  let crossText: string | null = await cacheGet<string>(crossKey)
  if (!crossText) {
    try {
      const report = await runFortune({
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
      crossText = renderToText(report)
      // Cache for 1 day — transits change daily
      await cacheSet(crossKey, crossText, CACHE_TTL.CALENDAR_DATA)
    } catch (err) {
      logger.error('[counselor/realtime] cross compute failed', { err })
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
  const cachedUserContext = `[Cross Signals]\n${crossText}`
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
