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
import { ensureCounselorContext } from '@/lib/facts/counselorContextCache'
import { streamClaudeAsSSE } from '@/lib/llm/claudeSSE'
import { PREMIUM_CLAUDE_MODEL } from '@/lib/llm/claude'
import { sanitizeForXmlTagBoundary, sanitizePriorTurns } from '@/lib/llm/promptSafety'
import { logger } from '@/lib/logger'
import { containsForbidden, safetyMessage } from '@/lib/textGuards'
import { isSelfHarm, crisisMessage } from '@/lib/safety/crisis'
import { csrfGuard } from '@/lib/security/csrf'
import { rateLimit } from '@/lib/rateLimit'
import { canUseCredits, consumeCredits } from '@/lib/credits/creditService'
import { createIdempotencyStore } from '@/lib/api/idempotency'
import { buildDestinyCounselorPrompt } from '@/lib/prompts/destinyCounselorPrompt'

// 새로고침/뒤로가기/다른 탭 등으로 같은 user turn 이 재진입할 때 크레딧
// 중복 차감 방지. 클라이언트가 매 user 메시지에 UUID 를 x-idempotency-key
// 헤더로 보냄. 같은 키 재진입 시 차감만 스킵.
const idemStore = createIdempotencyStore('counselor-realtime')

import { refundCreditsOnce } from '@/lib/credits/refundOnce'
import { cacheSet } from '@/lib/cache/redis-cache'
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
  /** 이 턴의 고유 id(클라 생성). 연결이 끊겨도 서버가 끝까지 생성한 답을 이
   *  키로 캐시에 저장해 두면, 사용자가 돌아왔을 때 result 엔드포인트로 복원한다. */
  turnId?: string
}

// 끊긴 턴의 완성 답안을 잠깐 보관하는 캐시 키 — result 엔드포인트가 같은 키로 읽음.
// userId 를 키에 포함해 ownership 검증 (다른 사용자가 turnId 알아도 조회 불가).
export const counselorTurnResultKey = (userId: string, turnId: string) =>
  `counselor:turn-result:${userId}:${turnId}`

// 돌아와서 받아갈 시간을 충분히 (30분) — 크레딧 충전하러 갔다 오는 왕복도
// 커버. 받아가면 그만이고 TTL 로 자동 소멸.
const TURN_RESULT_TTL_SEC = 1800

// Cap injected attachment text so a huge upload can't blow the context
// window (the client already trims, this is defense-in-depth).
const MAX_ATTACHMENT_CHARS = 12000

const RATE_LIMIT_PER_MIN = 12

// Billing: 매 메시지 1 credit 차감. 팩 크레딧 자체가 2배라서 사용자 입장
// 가치는 동일하면서 "질문 1개 = 1 credit" 단순 모델 유지. 옛 30분/20턴
// 세션 모델은 worst case 적자라 제거됨.

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
//
// The prompt itself now lives in @/lib/prompts/destinyCounselorPrompt as
// co-located ko/en pairs — edit Korean there and the English sits right
// beside it, so the two languages can't silently drift apart.

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

  // 1) Auth — 로그인 필수. 비로그인은 401 로 로그인 유도.
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json(
      { error: 'not_authenticated', message: '로그인이 필요합니다.' },
      { status: 401 }
    )
  }

  // 2) Rate limit — 사용자 키 기준.
  const rlKey = `counselor:realtime:${userId}`
  const rl = await rateLimit(rlKey, {
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

  const userMessage = body.messages[body.messages.length - 1]?.content ?? ''
  // Answer language follows the app i18n setting: the client sends it as
  // body.lang, and the I18nProvider also mirrors it into the `locale` cookie
  // (auto-sent with every request), so we still honor the toggle even if the
  // body flag is ever missing.
  const cookieLocale = req.cookies.get('locale')?.value
  const lang: 'ko' | 'en' =
    body.lang === 'en' || body.lang === 'ko' ? body.lang : cookieLocale === 'en' ? 'en' : 'ko'
  if (!userMessage.trim()) {
    return NextResponse.json({ error: 'empty_message' }, { status: 400 })
  }
  // Self-harm / suicidal intent → crisis hotline, NOT the dry "restricted
  // topic" refusal. Checked before containsForbidden (which is English-only
  // for self-harm) and before any credit charge.
  // Screen EVERY user turn in the request, not just the latest: the client
  // replays prior user turns to the model via priorTurns, so a self-harm
  // expression in an earlier turn must still route to crisis even if the
  // current message looks benign. Messages are already in memory — cheap.
  // 첨부파일(cvText)도 동일하게 위기/금지어 검사 대상에 포함. 시스템 프롬프트가
  // <attached_file> 내용을 "읽고 조언에 녹여라"고 지시하므로, 파일에 자살/금지
  // 표현을 넣으면 채팅 메시지만 검사하던 기존 로직을 우회해 위기 핫라인 안내를
  // 건너뛰고 일반 운세 답변이 나가던 안전 구멍을 막는다.
  const cvTextForScreen = typeof body.cvText === 'string' ? body.cvText : ''
  const anyUserSelfHarm =
    body.messages.some((m) => m.role === 'user' && isSelfHarm(m.content ?? '')) ||
    isSelfHarm(cvTextForScreen)
  if (anyUserSelfHarm) {
    return NextResponse.json({ message: crisisMessage(lang) }, { status: 200 })
  }
  if (containsForbidden(userMessage) || containsForbidden(cvTextForScreen)) {
    return NextResponse.json({ message: safetyMessage(lang) }, { status: 200 })
  }

  // 4) Pre-check credit availability. 매 메시지 1 credit. 차감은 아래
  // validation 이후 stream 직전에 실제 consume.
  const credit = await canUseCredits(userId, 'reading', 1)
  if (!credit.allowed) {
    return NextResponse.json(
      { error: 'insufficient_credits', message: credit.reason ?? 'credits required' },
      { status: 402 }
    )
  }

  // 5) 본명(stable·30d) + 일진/타이밍(daily·1d) 컨텍스트 — 공유 캐시 함수
  //    (ensureCounselorContext). 진입 시 /api/counselor/warm 이 동일 키로 미리
  //    워밍하므로, "그날 첫 답변"의 무거운 천체력 빌드를 critical path 에서
  //    제거(캐시 hit)해 첫 응답을 빠르게 한다.
  let stableContext: string
  let dailyContext: string
  try {
    const ctx = await ensureCounselorContext(body, userId, lang)
    stableContext = ctx.stableContext
    dailyContext = ctx.dailyContext
  } catch (err) {
    logger.error('[counselor/realtime] context compute failed', { err })
    return NextResponse.json({ error: 'cross_failed' }, { status: 500 })
  }

  // 6) Consume credit BEFORE stream starts. canUseCredits 통과 후라 보통 성공;
  // race(다른 탭) 등으로 실패해도 block 보다 observability 우선.
  // 새로고침/탭 복제 등 idempotent replay 면 차감 스킵 (스트림은 정상 진행).
  let chargedThisTurn = false
  {
    const scopedIdemKey = idemStore.keyFor(req, `user:${userId}`)
    const idempotentReplay = scopedIdemKey ? await idemStore.isReplay(scopedIdemKey) : false
    if (idempotentReplay) {
      logger.info('[counselor/realtime] idempotent replay, skip credit consume', { userId })
    } else {
      try {
        const res = await consumeCredits(userId, 'reading', 1)
        chargedThisTurn = res.success
        if (chargedThisTurn && scopedIdemKey) await idemStore.mark(scopedIdemKey)
      } catch (err) {
        logger.warn('[counselor/realtime] credit deduction failed', { err })
      }
    }
  }

  // 7) Build prompt and stream — 진짜 multi-turn 구조.
  // 직전 답변을 assistant role로 정확히 LLM에 전달해야 모델이 "내가 한
  // 말"로 인식하고 새 질문에 깔끔히 답한다. 예전엔 history를 통째로
  // string으로 박아서 직전 답 톤이 다음 답에 묻어 나왔음.
  // role 필터: Anthropic Messages API는 user/assistant만 받음. 클라가
  // 'system'을 messages 배열에 넣어 보내면 400 invalid_request_error.
  const systemPrompt = buildDestinyCounselorPrompt(lang === 'en' ? 'en' : 'ko')
  const cachedUserContext = stableContext
  const dialogTurns = body.messages.filter(
    (m): m is ChatMessage => m.role === 'user' || m.role === 'assistant'
  )
  // Sanitize + validate prior turns from the client. Drops any forged
  // role: 'system' turn, caps each content at 8KB, and replaces `<`/`>`
  // with full-width chars so a replayed turn can't smuggle a tag-close
  // (e.g. fake </birth_data>) into the prompt window. See promptSafety.ts.
  const priorTurns = sanitizePriorTurns(dialogTurns.slice(0, -1))
  const rawUserPromptRaw = dialogTurns[dialogTurns.length - 1]?.content ?? ''
  if (!rawUserPromptRaw.trim()) {
    return NextResponse.json({ error: 'empty_message' }, { status: 400 })
  }
  // Sanitize the latest user message before it gets concatenated next to
  // server-injected XML tags (<daily_context>, <attached_file>) — without
  // this, an attacker can paste `</birth_data>` or `<system>...</system>`
  // and try to break out of the wrapping block. sanitizeForXmlTagBoundary
  // replaces `<`/`>` with full-width equivalents that render identically
  // but don't trigger the model's tag-close lexer.
  const rawUserPrompt = sanitizeForXmlTagBoundary(rawUserPromptRaw)
  // Prepend the user's attached file (if any) as XML-tagged context on the
  // current turn. Kept out of the cached birth context so a different file
  // (or none) on the next turn doesn't get a stale cache hit.
  const attachmentTextRaw =
    typeof body.cvText === 'string' ? body.cvText.trim().slice(0, MAX_ATTACHMENT_CHARS) : ''
  // Strip tag-boundary chars from cvText before wrapping in <attached_file>
  // — a malicious upload could otherwise close the tag early and inject
  // adversarial instructions into the rest of the turn.
  const attachmentText = sanitizeForXmlTagBoundary(attachmentTextRaw)
  // 호출자 이름 + 만 나이는 cachedUserContext 밖에서 주입 — 둘 다 휘발성
  // 메타라 cache prefix 에 들어가면 prompt-cache 무효화 (이름 변경 / 생일
  // 통과 시). 매 턴 userPrompt prefix 로 붙여 chart 데이터만으로 prefix
  // 안정.
  const userName = await getUserDisplayName(userId)
  const ageYearsFromBirth = computeAgeYears(body.birthDate)
  const metaParts: string[] = []
  if (userName) {
    // 호명은 인사/강조 시에만 자연스럽게. 매 답변마다 "○○님" 박는 인공
    // 적인 톤을 회피한다 (Sonnet 4.5 승격 후 톤 자연화).
    metaParts.push(
      lang === 'en'
        ? `[Caller] ${userName} — address by name only when it feels natural (greetings, emphasis). Avoid repeating the name in every reply.`
        : `[호출자] ${userName} — 인사·강조 시에만 '${userName}님'으로 자연스럽게 호명한다. 매 답변마다 이름 박는 인공적인 톤 금지.`
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
  const turnId = typeof body.turnId === 'string' ? body.turnId.slice(0, 80) : ''

  const refundKey = turnId ? `counselor-realtime:${userId}:${turnId}` : null
  const onFailure = chargedThisTurn
    ? async () => {
        try {
          await refundCreditsOnce(refundKey, {
            userId,
            creditType: 'reading',
            amount: 1,
            reason: 'counselor_stream_empty',
            apiRoute: '/api/counselor/realtime',
          })
        } catch (err) {
          logger.warn('[counselor/realtime] stream-failure refund failed', { err })
        }
      }
    : undefined

  return streamClaudeAsSSE({
    // req.signal 은 여전히 넘기지만, keepGeneratingOnDisconnect 가 true 라
    // 클라가 끊겨도 업스트림을 중단하지 않고 끝까지 생성한다 (아래 onComplete
    // 로 캐시 저장 → 사용자가 돌아오면 result 엔드포인트로 복원).
    abortSignal: req.signal,
    keepGeneratingOnDisconnect: true,
    // 생성이 끝나면(클라 연결 여부 무관) 완성 답안을 캐시에 저장. 끊겼다가
    // 돌아온 사용자가 /api/counselor/realtime/result?turnId=… 로 받아간다.
    onComplete: turnId
      ? async (full) => {
          try {
            await cacheSet(counselorTurnResultKey(userId, turnId), full, TURN_RESULT_TTL_SEC)
          } catch {
            /* 캐시 실패는 무시 — 단순히 복원이 안 될 뿐, 스트림엔 영향 없음 */
          }
        }
      : undefined,
    systemPrompt,
    userPrompt,
    cachedUserContext,
    priorTurns,
    // 운명상담사는 사주+점성 통합 reasoning 과 자연스러운 한국어 톤이
    // 핵심이라 Haiku 4.5 → Sonnet 4.5 승격. 다른 라우트(타로 interpret-
    // stream 등)는 Haiku 그대로. maxTokens 2500 이면 Sonnet 30~40s 안에
    // 완료 — 기존 120s timeout 안에 여유.
    model: PREMIUM_CLAUDE_MODEL,
    maxTokens: 2500,
    // maxTokens 도달해도 자동 이어쓰기 — 답이 중간에 안 잘림.
    // 운명상담사도 본문 깊게 답할 때 가끔 2500 cap 도달.
    enableContinuation: true,
    // 0.5 → 0.7 — 비유·스토리텔링이 핵심인 채널이라 약간 풀어준다.
    // (타로 interpret-stream 도 0.7 사용 중)
    temperature: 0.7,
    label: 'counselor.realtime',
    onFailure,
    additionalHeaders: {
      'X-RateLimit-Limit': rl.headers.get('X-RateLimit-Limit') ?? '',
      'X-RateLimit-Remaining': rl.headers.get('X-RateLimit-Remaining') ?? '',
    },
  })
}
