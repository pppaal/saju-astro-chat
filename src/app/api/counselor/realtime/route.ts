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
import { buildSajuNormalizerInput } from '@/lib/fortune/cross-rules/adapters/saju'
import { buildAstroNormalizerInput } from '@/lib/fortune/cross-rules/adapters/astro'
import {
  formatSajuAsTable,
  formatDestinyTiming,
  formatDestinyAstro,
  formatSajuExtras,
} from '@/lib/compatibility/sajuTableFormatter'
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
  /** true when the user did not know their birth hour. */
  birthTimeUnknown?: boolean
  gender?: 'male' | 'female'
  latitude?: number
  longitude?: number
  timezone?: string
  /** Optional explicit flag from the form. Otherwise inferred from missing coords. */
  birthCityUnknown?: boolean
}

const RATE_LIMIT_PER_MIN = 12
const CREDIT_PER_TURN = 1

// DestinyPal warm-counselor system prompts.
//
// Design: state the policy, trust the LLM. The previous version listed
// dozens of jargon-to-prose translation pairs ("정인격 → 단단한 책임감의
// 결", "Saturn trine → 하늘이 받쳐주는 흐름", …) and a long catalog of
// banned markdown / emoji-header patterns. That bloated tokens, broke
// prompt caching, and — worse — kept tripping the LLM into the very
// analyst-report shape we were trying to suppress, since reading the
// rules made the rules salient. Keep policies, drop the catalog.
// Mirrors the compat counselor's minimal prompt (PR #195). The previous
// build encoded voice-coaching ("warm friend writing a letter") + a
// long anti-pattern list + a tone exemplar — ~1,100 chars of stage
// direction the model treated as scripture, copying the tone exemplar
// verbatim into otherwise unrelated answers. Stripped to four hard
// guards. Tone is whatever the chart data suggests.
const SYSTEM_PROMPT_KO = `[Birth Snapshot] 의 사주·점성 데이터를 근거로 사용자의 질문에 직접 답변한다.

규칙:
- 사주와 점성을 한 흐름 안에서 통합해 답한다. 시스템 분리 X.
- 마크다운 헤더(##)·번호 list 사용 금지. 자연스러운 단락으로.
- snapshot에 birthTimeUnknown=true면 시주/일진/ASC/MC/하우스 인용 금지. birthCityUnknown=true면 위치 의존 결론 금지.
- AI/모델/상담사 정체 노출 금지.
- 사주·점성 전문 용어(일간, 십성, 대운, 천을귀인, 트랜짓, 어스펙트, 하우스 등)는 최대한 쓰지 말 것. 데이터는 근거로만 읽고, 일상 언어로 자연스럽게 풀어서 답한다. 꼭 필요할 때만 짧은 괄호 설명과 함께 한 번 언급.`

const SYSTEM_PROMPT_EN = `Answer the user directly from the saju and astrology data in [Birth Snapshot].

Rules:
- Fuse saju and astrology in one flow. No system-split.
- No markdown headers (##) or numbered lists. Plain prose paragraphs.
- If snapshot has birthTimeUnknown=true: do not cite time pillar / iljin / ASC / MC / houses. If birthCityUnknown=true: skip place-dependent claims.
- Never reveal you're an AI / model / counselor system.
- Avoid jargon (day master, ten gods, daeun, transit, aspect, house, etc.). Use the data as evidence but speak in plain, natural language. Only mention a technical term once with a short parenthetical when truly needed.`

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

  // 5) Compute (or fetch cached) birth snapshot
  const hourUnknown = !!body.birthTimeUnknown || !body.birthTime
  // City unknown when explicit flag set, or when coords/timezone all missing.
  const cityUnknown =
    !!body.birthCityUnknown ||
    (body.latitude === undefined && body.longitude === undefined && !body.timezone)
  // v5: dropped Cross Signals from context; previous v4 entries are stale.
  const ctxKey = `counselor:ctx:v5:${userId}:${birthFingerprint(body)}:${hourUnknown ? 'tU' : 'tK'}:${cityUnknown ? 'cU' : 'cK'}:${utcDateKey(new Date())}`
  let contextText: string | null = await cacheGet<string>(ctxKey)
  if (!contextText) {
    try {
      // Raw saju + astro only. Previously this route ran the full
      // fortune cross-rules pipeline via runFortuneWithRaw and threw
      // away the resulting `report` — the cross-signal renderer's
      // ▶/■/domain-name markers were bleeding into the model's response
      // template, so the LLM does its own picking now. Calling the two
      // normalizer builders directly skips the wasted cross-rules pass.
      const queryDate = new Date()
      const tz = body.timezone ?? 'Asia/Seoul'
      const birthDate = body.birthDate
      const birthTime = body.birthTime ?? '12:00'
      const gender = body.gender === 'female' ? 'female' : 'male'
      const latitude = body.latitude ?? 37.5665
      const longitude = body.longitude ?? 126.978
      const sajuPromise = Promise.resolve(
        buildSajuNormalizerInput({
          birthDate,
          birthTime,
          gender,
          timezone: tz,
          queryDate,
          longitude,
        }),
      )
      const [y, m, d] = birthDate.split('-').map(Number)
      const [hh, mm] = birthTime.split(':').map(Number)
      const astroPromise = buildAstroNormalizerInput({
        year: y,
        month: m,
        date: d,
        hour: hh,
        minute: mm,
        latitude,
        longitude,
        timeZone: tz,
        queryDate,
        includeSolarReturn: true,
        includeLunarReturn: true,
      })
      const [saju, astro] = await Promise.all([sajuPromise, astroPromise])
      const birthTimeUnknown = hourUnknown
      const birthCityUnknown = cityUnknown
      // Compact table form — replaces the older pretty-JSON snapshot
      // (PR #204 had made it compact-JSON, this PR makes it a real
      // pipe-table same shape compat counselor uses). Same data,
      // ~5× fewer chars.
      const parts: string[] = ['[Birth Snapshot]']
      if (birthTimeUnknown) parts.push('# 시간 미상 — 시주/일진/ASC/MC/하우스 인용 금지.')
      if (birthCityUnknown) parts.push('# 출생지 미상 — 위치 의존 결론 금지.')
      // Pin the current age so the LLM stops conflating "current age"
      // with "daeun stage start age" (e.g. 32세 대운 시작 vs 만 35세
      // 현재). SajuNormalizerInput carries ageYears already.
      const ageYears = (saju as { ageYears?: number }).ageYears
      if (typeof ageYears === 'number' && Number.isFinite(ageYears)) {
        parts.push(`# 오늘 기준: 만 ${ageYears}세 (한국 ${ageYears + 1}세)`)
      }
      parts.push('')
      parts.push(formatSajuAsTable(saju.saju, '나'))
      // 격국·용신·신살·12운성 + 합/충/형/파/해/공망. Calculated by
      // runFortuneWithRaw → buildSajuNormalizerInput and previously
      // dropped from the prompt; users noticed neither shinsal nor
      // gongmang were ever cited.
      const extrasBlock = formatSajuExtras({
        extras: (saju as { extras?: Parameters<typeof formatSajuExtras>[0]['extras'] }).extras,
        natalRelations: (saju as { natalRelations?: Parameters<typeof formatSajuExtras>[0]['natalRelations'] }).natalRelations,
      })
      if (extrasBlock) {
        parts.push('')
        parts.push(extrasBlock)
      }
      const timingBlock = formatDestinyTiming(saju)
      if (timingBlock) {
        parts.push('')
        parts.push(timingBlock)
      }
      parts.push('')
      parts.push(formatDestinyAstro(astro))
      contextText = parts.join('\n')
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
      ? `Conversation so far:\n${history}\n\nAnswer the latest question, drawing on the birth snapshot above.`
      : `이전 대화:\n${history}\n\n위 birth snapshot을 바탕으로 마지막 질문에 답하세요.`

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
