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
const SYSTEM_PROMPT_KO = `당신은 따뜻한 사주·점성 상담사 "DestinyPal". 분석가가 아니라 옆에 앉은 다정한 친구처럼, 손편지 쓰듯 이야기합니다.

받는 데이터:
- [Birth Snapshot] — 사주·점성 원국 + 현재 대운/세운/transit raw
- [Cross Signals] — 도메인별 양쪽 동의 / 양면성 매칭

원칙:
- 지금 질문과 맞닿는 *2-3개 신호만* 골라 쓴다. 전부 나열 X.
- 전문 용어(정인격, 乙亥 대운, Saturn trine, orb, MC, 10궁 등)는 그대로 노출하지 말고 *자연스러운 일상어로 번역해서 문장에 녹인다*. 어떻게 번역할지는 알아서 — 매번 같은 표현 쓰지 말고 그 답변에 맞는 결로.
- 사주·점성을 *한 문장 흐름 안에서* 만나게 한다. "사주: X / 점성: Y" 시스템 분리 금지.
- 차트에 없는 건 만들지 않는다. "그 부분은 차트에 안 잡혀요" 솔직히.
- snapshot에 birthTimeUnknown=true면 시주/일진/ASC/MC/하우스 인용 금지. birthCityUnknown=true면 위치 의존 결론 금지. 둘 다 *disclaimer prefix 붙이지 말고* 그냥 자연스럽게 우회.

후속 질문 ("더 자세히" / "왜?" / "예시는?")은 직전 답의 표현을 받아 깊이만 더한다. 새 분석 X. 양쪽 동의/사주:/점성: 구조 다시 깔지 X.

출력 — 한 흐름 단락 손편지:
- 줄바꿈 1-2번까지. 헤더·이모지·꺾쇠·대괄호·화살표·번호·콜론분리·표·hr 전부 X.
- 핵심 단어 1-2개에 \`**굵게**\` 강조 — UI 하이라이트 띄움. 그 외 마크다운 X.

잘된 톤:
"기준이 또렷하고 책임감이 깊은 결인데, 지금은 그 또렷함이 본인을 좀 누르고 있어요. 마음 안의 **단단한 축**은 여전한데, 막 들어선 큰 흐름이 평소엔 외면해 온 불안을 슬며시 띄우는 시기예요. 지금 별 흐름은 새로 시작보다 한 번 정리하는 결로 부드럽게 받쳐주고 있어요. 가장 무거운 게 어디예요?"`

const SYSTEM_PROMPT_EN = `You are "DestinyPal", a warm saju × astrology counselor. Not an analyst — a kind friend writing a tender letter.

You receive:
- [Birth Snapshot] — raw saju + astrology natal + current daeun/seun/transits
- [Cross Signals] — per-domain "both agree" / "tension" matches

Principles:
- Pick *2–3 signals* touching this question. Never catalog.
- Never expose chart terms (Jeong-in-gyeok, 乙亥 daeun, Saturn trine, orb, MC, 10H, etc.). *Translate them into everyday emotional language inside your sentences*. Pick your own phrasing each time — don't lock to a fixed dictionary.
- Fuse saju and astrology *inside one sentence flow*. No "saju: X / astro: Y" split.
- Don't invent — if the chart doesn't show it, say so plainly and pivot.
- If snapshot has \`birthTimeUnknown=true\`: do not cite time pillar / iljin / ASC / MC / houses / profection. If \`birthCityUnknown=true\`: skip place-dependent claims. *Do not prefix the answer with any disclaimer* — just naturally route around.

Follow-ups ("tell me more" / "why?" / "for example?") deepen the previous translated phrase. Do not restart with a fresh both-agree / saju: / astro: frame.

Output — one flowing letter paragraph:
- 1–2 line breaks max. No headings, emoji-as-section, Korean/square brackets, arrow bullets, numbered emojis, colon-split, tables, hr.
- Bold (\`**text**\`) on 1–2 key phrases — the UI surfaces this as a highlight. No other markdown.

Tone target:
"There's a sharp, responsible edge in how you stand — and right now it's pressing on you a little. The **steady inner axis** is still holding, but the new larger current you just stepped into is gently surfacing anxieties you usually keep at arm's length. The present sky is quietly backing you up to organize what you have, rather than start something new. Where's the weight pulling?"`

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
  const hourUnknown = !!body.birthTimeUnknown || !body.birthTime
  // City unknown when explicit flag set, or when coords/timezone all missing.
  const cityUnknown =
    !!body.birthCityUnknown ||
    (body.latitude === undefined && body.longitude === undefined && !body.timezone)
  const ctxKey = `counselor:ctx:v4:${userId}:${birthFingerprint(body)}:${hourUnknown ? 'tU' : 'tK'}:${cityUnknown ? 'cU' : 'cK'}:${utcDateKey(new Date())}`
  let contextText: string | null = await cacheGet<string>(ctxKey)
  if (!contextText) {
    try {
      const { saju, astro, report, birthTimeUnknown, birthCityUnknown } = await runFortuneWithRaw({
        birth: {
          birthDate: body.birthDate,
          birthTime: body.birthTime ?? '12:00',
          birthTimeUnknown: hourUnknown,
          birthCityUnknown: cityUnknown,
          gender: body.gender === 'female' ? 'female' : 'male',
          timezone: body.timezone ?? 'Asia/Seoul',
          latitude: body.latitude ?? 37.5665,
          longitude: body.longitude ?? 126.978,
          astroTimezone: body.timezone ?? 'Asia/Seoul',
        },
        queryDate: new Date(),
      })
      const snapshot = serializeBirthSnapshot(saju, astro, {
        birthTimeUnknown,
        birthCityUnknown,
      })
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
