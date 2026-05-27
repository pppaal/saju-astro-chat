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
import { buildSajuNormalizerInput } from '@/lib/fusion/adapters/saju'
import { buildAstroNormalizerInput } from '@/lib/fusion/adapters/astro'
import { buildDestinyContext } from '@/lib/destiny/counselorContext'
import { getNowInTimezone } from '@/lib/datetime'
import { streamClaudeAsSSE } from '@/lib/llm/claudeSSE'
import { logger } from '@/lib/logger'
import { containsForbidden, safetyMessage } from '@/lib/textGuards'
import { csrfGuard } from '@/lib/security/csrf'
import { rateLimit } from '@/lib/rateLimit'
import { canUseCredits, consumeCredits } from '@/lib/credits/creditService'
import { refundCredits } from '@/lib/credits/creditRefund'
import { cacheGet, cacheSet, cacheDel, CACHE_TTL } from '@/lib/cache/redis-cache'
import { getUserDisplayName } from '@/lib/user/displayName'

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
  /** 사용자 기기(브라우저)의 현재 시간대 — "오늘"/일진 계산 기준. 출생 시간대와
   *  다를 수 있어 별도로 받는다. */
  userTimezone?: string
  /** Optional explicit flag from the form. Otherwise inferred from missing coords. */
  birthCityUnknown?: boolean
  /** Parsed text of a user-attached file (CV/notes). Injected into the
   *  current turn so the LLM can reference it. Not cached. */
  cvText?: string
}

// Cap injected attachment text so a huge upload can't blow the context
// window (the client already trims, this is defense-in-depth).
const MAX_ATTACHMENT_CHARS = 12000

const RATE_LIMIT_PER_MIN = 12

// Session-based billing: 1 credit opens a counselling *session*; every turn
// within SESSION_WINDOW_SECONDS (and up to TURNS_PER_SESSION) is then free.
// Replaces the old per-turn charge so a chatty sitting no longer drains
// credits message-by-message. Session state lives in Redis keyed by user, so
// a client can't replay a truncated history to dodge the charge.
const CREDIT_PER_SESSION = 1
const SESSION_WINDOW_SECONDS = 30 * 60
const TURNS_PER_SESSION = 20
const counselorSessionKey = (userId: string) => `counselor:session:${userId}`

interface CounselorSession {
  startedAt: number
  turns: number
}

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
const SYSTEM_PROMPT_KO = `<birth_data> 안의 사주·점성 데이터를 근거로 사용자의 질문에 직접 답변한다. <birth_data> 는 시스템이 주입한 백그라운드 컨텍스트일 뿐, 사용자가 직접 타이핑한 게 아니다. 답변에 그 태그명은 절대 노출하지 않는다.

말투: 다정하고 공감 능력 있는 따뜻한 멘토. 자연스러운 경어체 (해요체 기본, 필요시 합쇼체 섞기). 분석가 톤·진단서 X.

규칙:
- 사주와 점성을 한 흐름 안에서 통합해 답한다. 시스템 분리 X.
- 두 데이터가 같은 방향을 가리킬 때 (예: 사주의 목 기운 강함 + 점성의 목성 확장기) 하나의 비유/스토리로 엮는다. 양쪽 따로 나열 X.
- 단, 사주의 합·충과 점성의 conjunction·opposition이 비슷해 보여도 같은 사건으로 이중 계산하지 말 것.
- 마크다운 헤더(##) / 번호 리스트 / 글머리 기호(-, *) 사용 금지. 오직 줄글 단락으로.
- [Meta] 의 birthTimeUnknown=true면 시주/일진/ASC/MC/하우스 인용 금지. birthCityUnknown=true면 위치 의존 결론 금지.
- AI/모델/상담사 정체 노출 금지.
- 일진/날짜 질문(오늘·내일·이번 주 등)엔 ## 일진 7일 의 그 날 간지(예: 乙丑)를 근거로 내 일간과 비교해 일상어로 답한다. 비견·식신 같은 십성 용어를 그대로 말하지 말 것. 7일 목록 너머 먼 날짜는 "캘린더에서 더 정확히 볼 수 있어요"라고 안내.
- 다른 생년월일·다른 사람 분석 요청은 정중히 거절: 이 채널은 본인 차트 전용임을 안내한다.
- 사용자가 <attached_file> 로 이력서·메모·계획서 등을 첨부했으면, **내용을 읽고 본인 사주·점성과 엮어 더 구체적인 조언** (예: 이력 흐름과 대운 매칭, 강점·약점 보완, 다음 스텝 제안). "이 채널은 사주 전용이라 이력서 상담은 못 한다"는 식으로 거절 X — 첨부 내용을 본인 chart 의 보조 자료로 활용.
- 사용자 메시지가 "🃏 보충 카드 한 장을 더 뽑았어요: **카드명**" 패턴(타로 클래리파이어) 으로 시작하면: 방금까지의 대화·타로 해석 흐름에 그 카드가 어떤 추가 단서를 주는지 같은 톤으로 **한 단락**(2-3 문장) 보충 설명. 카드명·키워드 일반론은 짧게, 흐름·맥락 연결을 중심으로. 이미지 자체는 사용자 메시지에 이미 들어 있으니 다시 언급/요약 X.

★ jargon 기본 금지 — 평소엔 raw 텍스트 그대로 인용 X:
  - 한자 (甲乙丙... / 寅卯辰... / 未丑충 / 卯戌합 등) 출력 X
  - 용어 (일간, 십성, 대운, 천을귀인, 트랜짓, 어스펙트, 하우스, 합·충·형·해, Conjunction·Square·Trine 등) 출력 X
  - 데이터를 일상 한국어로 *완전 번역*해서 답:
    · "辛 일간 음금" → "예민하고 정제된 결"
    · "未丑충" → "감정·생활 패턴이 부딪힘"
    · "Moon Square Saturn" → "감정에 무게가 실리는 흐름"
    · "천을귀인 발화" → "보호받는 기운"

★ 예외 — 사용자가 *직접 그 용어로 물으면* 답해도 됨:
  - "내 일간 뭐야?" / "내 Sun sign?" / "Moon square Saturn 어때?" 같은 질문엔
    해당 용어를 그대로 쓰고 짧게 설명해도 자연스러움. 회피하지 말 것.
  - 단, 사용자가 일상어로 물었으면 (예: "내 성격 어때?") 답도 일상어로.

답변 맨 끝에 *반드시* 이 줄을 추가 (사용자에겐 안 보이고 후속질문 버튼으로 렌더됨):
||FOLLOWUP||["후속1", "후속2"]
  - 정확히 2개. JSON 문자열 배열. 각 20자 이내. 1인칭 말투("나 ~?", "그럼 ~?").
  - 반드시 *방금 답변에서 구체적으로 말한 것*(특정 시기·사람·강점·사건 등)을 콕 집어 한 발 더 들어가게 — 솔깃해서 누르고 싶게. 답 내용과 무관한 일반 질문 금지 · "더 알려줘/조언해줘/왜?" 류 generic 금지 · 이미 답한 것 반복 금지.
  - 예: 답이 "올해 봄 이직운"을 짚었으면 → ["이직하면 연봉도 올라?", "지금 회사 더 버텨야 해?"]`

const SYSTEM_PROMPT_EN = `Answer the user directly from the saju and astrology data inside <birth_data>. <birth_data> is system-injected background context, NOT something the user typed. Never expose that tag name in your reply.

Tone: warm, empathetic mentor. Conversational, not analytical or clinical.

Rules:
- Fuse saju and astrology in one flow. No system-split.
- When the two systems point the same way (e.g. saju wood-growth + Jupiter expansion), weave them into one metaphor/story, not two parallel listings.
- But even if saju 합/충 and astro conjunction/opposition look alike, don't double-count them as one event.
- No markdown headers (##), numbered lists, or bullet symbols (-, *). Plain prose paragraphs only.
- If [Meta] has birthTimeUnknown=true: do not cite time pillar / iljin / ASC / MC / houses. If birthCityUnknown=true: skip place-dependent claims.
- Never reveal you're an AI / model / counselor system.
- For day/date questions (today, tomorrow, this week), answer from that day's ganji in ## DAILY (7 days) (e.g. 乙丑), compared to the user's day-master, in plain language. Do not output ten-gods terms (비견/식신 etc.) verbatim. For dates beyond the 7-day list, say it can be checked more precisely in the Calendar.
- Politely refuse analysis of another birth date / another person: this channel is for the user's own chart only.
- If the user attached a file (<attached_file> — resume, notes, plans, etc.), **read it and weave it into saju/astro advice** (e.g., career history vs. luck cycles, strengths/blind spots, next steps). Don't refuse with "this channel is only for saju" — use the file as supporting material for their own chart.
- If the user message starts with "🃏 One more clarifier card drawn: **CardName**" (tarot clarifier), give a focused **one-paragraph** (2-3 sentences) addition tied to the conversation/reading so far. Light on generic card meanings, heavy on flow/context. The image is already in the user message — don't re-summarize it.
- Default to plain natural language (avoid jargon like day master, ten gods, daeun, transit, aspect, house). Use the data as evidence but translate it.
- Exception: if the user asks *directly using a term* ("what's my Sun sign?", "how about Moon square Saturn?"), use the term and answer briefly. Don't dodge.

At the very end, append *exactly* this line (hidden from the user, rendered as buttons):
||FOLLOWUP||["q1", "q2"]
  - Exactly 2. JSON string array. Each under ~40 chars. First-person ("Will I...?", "So should I...?").
  - Must pick *one specific thing you just said* (a timing, person, strength, event) and go one level deeper — tempting enough to tap. No question unrelated to your answer · no generic ("tell me more", "explain", "why?", "any advice?") · no repeating what you covered.
  - e.g. if the reply flagged "a job change this spring" → ["Will my pay go up if I switch?", "Should I tough it out where I am?"]`

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

// birthDate (YYYY-MM-DD) 기준 만 나이를 직접 계산 — saju 빌더를 거치지
// 않고도 가능. cache 밖에서 매 턴 휘발성 userPrompt prefix 로 주입하기
// 위한 헬퍼.
function computeAgeYears(birthDate: string | undefined | null): number | null {
  if (!birthDate || typeof birthDate !== 'string') return null
  const m = birthDate.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const by = Number(m[1])
  const bm = Number(m[2])
  const bd = Number(m[3])
  if (!Number.isFinite(by) || !Number.isFinite(bm) || !Number.isFinite(bd)) return null
  const now = new Date()
  let age = now.getFullYear() - by
  const passed = now.getMonth() + 1 > bm || (now.getMonth() + 1 === bm && now.getDate() >= bd)
  if (!passed) age -= 1
  return age >= 0 && age < 150 ? age : null
}

export async function POST(req: NextRequest) {
  // 0) CSRF — this route bypasses withApiMiddleware, so guard the origin
  // explicitly. Without it, any third-party page could POST in a logged-in
  // user's browser (cookie auth) and burn their session credits.
  const csrfError = csrfGuard(req.headers)
  if (csrfError) return csrfError

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

  // 4) Resolve session + credit pre-check. A credit is only required to start
  // a *new* session — no active session, the window elapsed, or the turn cap
  // was reached. Continuing an active session costs nothing.
  const sessionKey = counselorSessionKey(userId)
  const nowMs = Date.now()
  const existingSession = await cacheGet<CounselorSession>(sessionKey)
  const sessionActive =
    !!existingSession &&
    nowMs - existingSession.startedAt < SESSION_WINDOW_SECONDS * 1000 &&
    existingSession.turns < TURNS_PER_SESSION
  const isNewSession = !sessionActive

  if (isNewSession) {
    const credit = await canUseCredits(userId, 'reading', CREDIT_PER_SESSION)
    if (!credit.allowed) {
      return NextResponse.json(
        { error: 'insufficient_credits', message: credit.reason ?? 'credits required' },
        { status: 402 }
      )
    }
  }

  // 5) Compute (or fetch cached) birth snapshot
  const hourUnknown = !!body.birthTimeUnknown || !body.birthTime
  // City unknown when explicit flag set, or when coords/timezone all missing.
  const cityUnknown =
    !!body.birthCityUnknown ||
    (body.latitude === undefined && body.longitude === undefined && !body.timezone)
  // v8: [Meta] 에 raw birthDate/birthTime/location/timezone 추가. v7
  // entry 는 그 정보 없이 저장돼서 LLM 이 한자→날짜 역산 → "내 생년
  // 월일?" 같은 직접 질문에 틀린 답.
  // "오늘"/일진은 기기 시간대 기준 → 캐시도 그 로컬 날짜로 회전해야 새벽에 안 어긋남.
  // v9: 일진 7일 블록 추가로 컨텍스트 shape 변경(이전 캐시 무효화).
  // v10: 호출자 이름(userName)을 cached context 에서 제거 → Anthropic
  // prompt cache prefix 가 차트 데이터만으로 고정. 이전 v9 엔트리에는
  // 이름이 박혀 있어 캐시 미스 증가 원인이었음.
  // v11: 만 나이도 cached context 에서 제거 → 생일 통과 시 prefix 무효화
  // 방지. 이름 + 나이 둘 다 휘발성 userPrompt prefix 로 옮겨감.
  // v12: destiny context 를 stable(natal — 평생) + daily(타이밍/일진/
  // 트랜짓 — 매일) 두 블록으로 split. stable 만 cachedUserContext 로
  // 보내 Anthropic prompt cache 가 사용자 평생 hit. daily 는 휘발성
  // userPrompt prefix 로. Redis 캐시 키도 두 개로 분리 — stable 은
  // localDate 미포함 / 30 일 TTL, daily 는 localDate 포함 / 1 일 TTL.
  const userTz = body.userTimezone || body.timezone || 'Asia/Seoul'
  const localNow = getNowInTimezone(userTz)
  const localDateKey = `${localNow.year}-${localNow.month}-${localNow.day}`
  const stableCtxKey = `counselor:ctx:stable:v12:${userId}:${birthFingerprint(body)}:${hourUnknown ? 'tU' : 'tK'}:${cityUnknown ? 'cU' : 'cK'}:${userTz}`
  const dailyCtxKey = `counselor:ctx:daily:v12:${userId}:${birthFingerprint(body)}:${hourUnknown ? 'tU' : 'tK'}:${cityUnknown ? 'cU' : 'cK'}:${userTz}:${localDateKey}`
  let stableContext: string | null = await cacheGet<string>(stableCtxKey)
  let dailyContext: string | null = await cacheGet<string>(dailyCtxKey)
  if (!stableContext || !dailyContext) {
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
        })
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
      const [saju, _astro] = await Promise.all([sajuPromise, astroPromise])
      const birthTimeUnknown = hourUnknown
      const birthCityUnknown = cityUnknown
      // Compact table form — replaces the older pretty-JSON snapshot
      // (PR #204 had made it compact-JSON, this PR makes it a real
      // pipe-table same shape compat counselor uses). Same data,
      // ~5× fewer chars.
      const parts: string[] = ['[Birth Snapshot]']
      // Metadata block always present so the system prompt's
      // birthTimeUnknown / birthCityUnknown rules can match on a
      // concrete value (true OR false). Raw birthDate / birthTime /
      // location / timezone included so the LLM can answer "내 생년월일
      // 뭐야?" directly instead of trying to reverse-derive the date
      // from saju 한자 pillars + astro planet signs (low accuracy).
      const locTag = birthCityUnknown
        ? '미상'
        : `${body.latitude?.toFixed(4) ?? '?'},${body.longitude?.toFixed(4) ?? '?'}`
      const timeTag = birthTimeUnknown ? '미상' : (body.birthTime ?? '미상')
      parts.push(
        `[Meta] birthDate: ${body.birthDate} | birthTime: ${timeTag} | location: ${locTag} | timezone: ${body.timezone ?? 'Asia/Seoul'} | birthTimeUnknown: ${birthTimeUnknown ? 'true' : 'false'} | birthCityUnknown: ${birthCityUnknown ? 'true' : 'false'}`
      )
      if (birthTimeUnknown) parts.push('# 시간 미상 — 시주/일진/ASC/MC/하우스 인용 금지.')
      if (birthCityUnknown) parts.push('# 출생지 미상 — 위치 의존 결론 금지.')
      // (이전엔 여기서 만 나이를 parts 에 push 했음 → cached context
      //  안에 들어가서 생일 지날 때마다 prefix 무효화. 이제 cache 밖
      //  userPrompt prefix 로 옮김 — 아래 callerLine 인근 참조.)
      // ── Destiny counselor layer: SAJU (from raw) + ASTRO/CURRENT
      //    (raw→refined) + reading rules. Replaces the old formatSajuSelf /
      //    formatAstroSelf + slim chain here; compat counselor keeps those.
      let stableCtxBody = ''
      let dailyCtxBody = ''
      try {
        const sn = saju as unknown as {
          currentSeun?: { heavenlyStem?: string; earthlyBranch?: string } | null
          currentWolun?: { heavenlyStem?: string; earthlyBranch?: string } | null
          currentIljin?: { heavenlyStem?: string; earthlyBranch?: string } | null
          unseRelations?: Array<{
            source: string
            relation: { kind: string; detail?: string; pillars?: string[] }
          }>
        }
        const un = (u?: { heavenlyStem?: string; earthlyBranch?: string } | null) =>
          u ? { stem: u.heavenlyStem ?? '', branch: u.earthlyBranch ?? '' } : null
        const split = await buildDestinyContext(
          {
            birthDate,
            birthTime,
            gender,
            timezone: tz,
            latitude,
            longitude,
            birthTimeUnknown: hourUnknown,
            birthCityUnknown: cityUnknown,
          },
          queryDate,
          lang,
          {
            seun: un(sn.currentSeun),
            wolun: un(sn.currentWolun),
            iljin: un(sn.currentIljin),
            relations: sn.unseRelations,
          },
          userTz
        )
        stableCtxBody = split.stable
        dailyCtxBody = split.daily
      } catch (err) {
        logger.warn('[counselor/realtime] destiny context build failed', {
          err: err instanceof Error ? err.message : String(err),
        })
      }

      // STABLE: [Birth Snapshot] meta + 본명 사주/점성 + 규칙. <birth_data>
      // 태그로 감싸 LLM 이 system-injected background 로 인식.
      stableContext = `<birth_data>\n${parts.join('\n')}${stableCtxBody ? `\n\n${stableCtxBody}` : ''}\n</birth_data>`
      // DAILY: 타이밍 + 일진 윈도우 + today 앵커. cached prefix 밖.
      dailyContext = dailyCtxBody

      await cacheSet(stableCtxKey, stableContext, CACHE_TTL.NATAL_CHART) // 30d
      await cacheSet(dailyCtxKey, dailyContext, CACHE_TTL.CALENDAR_DATA) // 1d
    } catch (err) {
      logger.error('[counselor/realtime] context compute failed', { err })
      return NextResponse.json({ error: 'cross_failed' }, { status: 500 })
    }
  }

  // 6) Charge + advance the session marker AFTER validation but BEFORE the
  // stream starts. New session → consume 1 credit and open the window.
  // Continuing session → free; just bump the turn counter while keeping the
  // original window (fixed, not sliding).
  let chargedThisTurn = false
  if (isNewSession) {
    try {
      const res = await consumeCredits(userId, 'reading', CREDIT_PER_SESSION)
      chargedThisTurn = res.success
    } catch (err) {
      logger.warn('[counselor/realtime] credit deduction failed', { err })
      // Don't block the user — observability over enforcement here.
    }
    await cacheSet(sessionKey, { startedAt: nowMs, turns: 1 }, SESSION_WINDOW_SECONDS)
  } else {
    const startedAt = existingSession?.startedAt ?? nowMs
    const turns = (existingSession?.turns ?? 0) + 1
    const remainingSec = Math.max(
      1,
      Math.ceil((SESSION_WINDOW_SECONDS * 1000 - (nowMs - startedAt)) / 1000)
    )
    await cacheSet(sessionKey, { startedAt, turns }, remainingSec)
  }

  // 7) Build prompt and stream — 진짜 multi-turn 구조.
  // 직전 답변을 assistant role로 정확히 LLM에 전달해야 모델이 "내가 한
  // 말"로 인식하고 새 질문에 깔끔히 답한다. 예전엔 history를 통째로
  // string으로 박아서 직전 답 톤이 다음 답에 묻어 나왔음.
  // role 필터: Anthropic Messages API는 user/assistant만 받음. 클라가
  // 'system'을 messages 배열에 넣어 보내면 400 invalid_request_error.
  const systemPrompt = lang === 'en' ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_KO
  const cachedUserContext = stableContext
  const dialogTurns = body.messages.filter(
    (m): m is ChatMessage => m.role === 'user' || m.role === 'assistant'
  )
  const priorTurns = dialogTurns.slice(0, -1).map((m) => ({ role: m.role, content: m.content }))
  const rawUserPrompt = dialogTurns[dialogTurns.length - 1]?.content ?? ''
  if (!rawUserPrompt.trim()) {
    return NextResponse.json({ error: 'empty_message' }, { status: 400 })
  }
  // Prepend the user's attached file (if any) as XML-tagged context on the
  // current turn. Kept out of the cached birth context so a different file
  // (or none) on the next turn doesn't get a stale cache hit.
  const attachmentText =
    typeof body.cvText === 'string' ? body.cvText.trim().slice(0, MAX_ATTACHMENT_CHARS) : ''
  // 호출자 이름 + 만 나이는 cachedUserContext 밖에서 주입 — 둘 다 휘발성
  // 메타라 cache prefix 에 들어가면 prompt-cache 무효화 (이름 변경 / 생일
  // 통과 시). 매 턴 userPrompt prefix 로 붙여 chart 데이터만으로 prefix
  // 안정.
  const userName = await getUserDisplayName(userId)
  const ageYearsFromBirth = computeAgeYears(body.birthDate)
  const metaParts: string[] = []
  if (userName) {
    metaParts.push(
      lang === 'en'
        ? `[Caller] ${userName} — address as 'Hi ${userName},' naturally.`
        : `[호출자] ${userName} — 한국어로 답할 때 '${userName}님'으로 정중히 호명한다.`
    )
  }
  if (typeof ageYearsFromBirth === 'number') {
    metaParts.push(
      lang === 'en'
        ? `[Age today] ${ageYearsFromBirth} (use as the 'current age' anchor; do not confuse with daeun start ages).`
        : `[오늘 기준 만나이] ${ageYearsFromBirth}세 (한국 ${ageYearsFromBirth + 1}세) — 현재 나이 앵커로 사용, 대운 시작 나이와 혼동 금지.`
    )
  }
  const metaLine = metaParts.length ? `${metaParts.join('\n')}\n\n` : ''
  // 일별 회전 컨텐츠(타이밍/일진/today)는 cached prefix 밖에서 매 턴 새로
  // 주입. <daily_context> 태그로 감싸 LLM 이 background data 로 인식.
  const dailyBlock = dailyContext?.trim()
    ? `<daily_context>\n${dailyContext.trim()}\n</daily_context>\n\n`
    : ''
  const userPromptBody = attachmentText
    ? `<attached_file>\n${attachmentText}\n</attached_file>\n\n${rawUserPrompt}`
    : rawUserPrompt
  const userPrompt = `${dailyBlock}${metaLine}${userPromptBody}`

  // If we charged for a new session but the stream delivers nothing (backend
  // error or empty completion), refund the credit and drop the session marker
  // so the user isn't billed for an empty response or left inside a paid
  // window they never got to use. Continuing turns weren't charged → no-op.
  const onFailure = chargedThisTurn
    ? async () => {
        try {
          await refundCredits({
            userId,
            creditType: 'reading',
            amount: CREDIT_PER_SESSION,
            reason: 'counselor_stream_empty',
            apiRoute: '/api/counselor/realtime',
          })
          await cacheDel(sessionKey)
        } catch (err) {
          logger.warn('[counselor/realtime] stream-failure refund failed', { err })
        }
      }
    : undefined

  return streamClaudeAsSSE({
    systemPrompt,
    userPrompt,
    cachedUserContext,
    priorTurns,
    maxTokens: 2500,
    temperature: 0.5,
    label: 'counselor.realtime',
    onFailure,
    additionalHeaders: {
      'X-RateLimit-Limit': rl.headers.get('X-RateLimit-Limit') ?? '',
      'X-RateLimit-Remaining': rl.headers.get('X-RateLimit-Remaining') ?? '',
    },
  })
}
