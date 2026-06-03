import { NextRequest, NextResponse } from 'next/server'
import {
  initializeApiContext,
  createAuthenticatedGuard,
  type MiddlewareOptions,
} from '@/lib/api/middleware'
import { createFallbackSSEStream } from '@/lib/streaming'
import { streamClaudeAsSSE } from '@/lib/llm/claudeSSE'
import { PREMIUM_CLAUDE_MODEL } from '@/lib/llm/claude'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { extractLocale } from '@/lib/api/middleware'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { guardText, containsForbidden, safetyMessage } from '@/lib/textGuards'
import { isSelfHarm, crisisMessage } from '@/lib/safety/crisis'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { compatibilityCounselorRequestSchema } from '@/lib/api/zodValidation'
import { buildEvidenceGroundingGuide } from '@/lib/prompts/evidenceGroundingGuide'
import { buildCompatibilityCounselorPrompt } from '@/lib/prompts/compatibilityCounselorPrompt'
import { sanitizeForXmlTagBoundary, sanitizePriorTurns } from '@/lib/llm/promptSafety'
import { consumeCredits } from '@/lib/credits/creditService'
import { refundCreditsOnce } from '@/lib/credits/refundOnce'
import { createIdempotencyStore } from '@/lib/api/idempotency'
import { cacheSet } from '@/lib/cache/redis-cache'
import type { Relation } from '../types'

// 끊긴 턴 복원용 캐시 키 — userId 를 포함해 ownership 검증 (다른 사용자가
// turnId 알아도 조회 불가). 게스트는 끊김 복구 미지원 (turnId 보관 안 함).
export const compatTurnResultKey = (userId: string, turnId: string) =>
  `compat:turn-result:${userId}:${turnId}`

// 30분 — 크레딧 충전하러 갔다 오는 왕복도 복구되게 (10→30분).
export const COMPAT_TURN_RESULT_TTL_SEC = 1800

// 새로고침/뒤로가기/다른 탭 등으로 같은 user turn 이 재진입할 때 크레딧
// 중복 차감 방지. 클라이언트가 매 메시지에 UUID 를 x-idempotency-key 헤더로
// 보냄. 같은 키 재진입 시 차감만 스킵.
const idemStore = createIdempotencyStore('compatibility-counselor')

// Inlined from the now-deleted routeSupportCommon (which served the
// retired results/narrative-stream flow). The counselor route is the
// only remaining caller. Keep in lockstep with Relation in ../types and
// the <select> in src/app/compatibility/components/form/PersonCard.tsx.
function relationLabel(locale: 'ko' | 'en', relation?: Relation, note?: string): string {
  const isKo = locale === 'ko'
  if (relation === 'lover') return isKo ? '연인' : 'lover'
  if (relation === 'spouse') return isKo ? '배우자' : 'spouse'
  if (relation === 'family') return isKo ? '가족' : 'family'
  if (relation === 'sibling') return isKo ? '형제자매' : 'sibling'
  if (relation === 'friend') return isKo ? '친구' : 'friend'
  if (relation === 'colleague') return isKo ? '동료' : 'colleague'
  if (relation === 'other') return note?.trim() || (isKo ? '기타' : 'other')
  return isKo ? '관계' : 'related'
}
import { formatSajuSynastry } from '@/lib/compatibility/sajuSynastryFormatter'
import { formatAstroSynastry } from '@/lib/compatibility/astroSynastryFormatter'
import { formatCompositeChart } from '@/lib/compatibility/compositeChartFormatter'
import { calculateNatalChart, toChart } from '@/lib/astrology/foundation/astrologyService'
import { getUserDisplayName } from '@/lib/user/displayName'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 90

// Guest free trial — 2 turns of compatibility counselor before login wall
const GUEST_COMPAT_TURN_LIMIT = 2
const GUEST_COMPAT_TURN_COOKIE = 'guest_compat_counselor_turns'
const GUEST_COMPAT_COOKIE_MAX_AGE = 60 * 60 * 24 * 30
const GUEST_COMPAT_RATE_LIMIT = { limit: 12, windowSeconds: 60 } as const

function readGuestCompatTurns(req: NextRequest): number {
  const raw = req.cookies.get(GUEST_COMPAT_TURN_COOKIE)?.value
  if (!raw) return 0
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function buildGuestCompatTurnCookie(next: number): string {
  const parts = [
    `${GUEST_COMPAT_TURN_COOKIE}=${next}`,
    'Path=/',
    `Max-Age=${GUEST_COMPAT_COOKIE_MAX_AGE}`,
    'SameSite=Lax',
    'HttpOnly',
  ]
  if (process.env.NODE_ENV === 'production') parts.push('Secure')
  return parts.join('; ')
}

import {
  clampMessages,
  stringifyForPrompt,
  prunePromptContext,
  countObjectKeys,
  extractTimingDetails,
  buildPersonSeed,
  buildAutoSajuContext,
  buildAutoAstroContext,
  collectMissingSajuKeys,
  collectMissingAstroKeys,
  mergeSajuContext,
  mergeAstroContext,
  getAgeFromBirthDate,
} from './routeSupport'

// 개별(self) 신살 — 각자 타고난 신살은 extras.shinsal에 이미 계산돼 있으나
// self 블록이 voided라 궁합 프롬프트엔 안 들어가던 신호. 단, 전부 쏟으면
// 다시 노이즈가 되므로 *관계 해석에 유효한 특수 신살만* 화이트리스트로
// 큐레이션 + 짧은 뜻을 붙인다. 12신살(자리)은 synastry [12신살] cross가,
// 도화·홍염살·백호·괴강·천을귀인은 sajuSynastryFormatter 의 신살 cross
// 블록이 양방향 deterministic 으로 다루므로 self 중복 제거 — 여기엔
// 오직 *cross 가 없는* personality-only 신살만 남긴다.
const PILLAR_KO: Record<string, string> = { year: '년', month: '월', day: '일', time: '시' }
const PERSONAL_SHINSAL_KEEP: Record<string, string> = {
  양인: '날카로움·과격',
  귀문관: '집착·예민',
  원진: '미묘한 반감',
  고신: '고독 기질',
  금여성: '배우자 복·기품',
  천덕귀인: '보호·덕',
  월덕귀인: '보호·덕',
}

function formatPersonalShinsal(label: string, shinsal: unknown): string | null {
  if (!Array.isArray(shinsal) || shinsal.length === 0) return null
  const byKind = new Map<string, Set<string>>()
  for (const raw of shinsal) {
    const h = raw as { kind?: string; pillars?: string[] }
    if (!h?.kind || !(h.kind in PERSONAL_SHINSAL_KEEP)) continue
    const set = byKind.get(h.kind) ?? new Set<string>()
    for (const p of h.pillars ?? []) set.add(PILLAR_KO[p] ?? p)
    byKind.set(h.kind, set)
  }
  if (byKind.size === 0) return null
  const parts = [...byKind.entries()].map(([kind, ps]) => {
    const loc = [...ps].join('·')
    return `${kind}(${loc ? `${loc}, ` : ''}${PERSONAL_SHINSAL_KEEP[kind]})`
  })
  return `${label}: ${parts.join(' · ')}`
}

export async function POST(req: NextRequest) {
  // Hoisted to function scope so the outer catch can refund a credit that was
  // charged before a failure (e.g. a throw during chart building, which the
  // stream's own onFailure/claudeErr refunds never reach). refundKey is the
  // shared per-turn idempotency key so inner + outer refunds never double-pay.
  let chargedUserId: string | null = null
  let refundKey: string | null = null
  try {
    // Apply middleware: prefer authenticated guard (with credits) but fall
    // back to guest guard so first-time visitors can sample 2 turns before
    // the login wall — same pattern as destiny-map/chat-stream.
    // requireCredits 는 false — 새로고침 idempotent replay 일 때 차감을
    // 스킵해야 하는데 middleware 가 먼저 차감하면 늦음. 핸들러 안에서
    // idempotency 체크 후 consumeCredits 명시 호출.
    const authedGuardOptions = createAuthenticatedGuard({
      route: 'compatibility-counselor',
      limit: 30,
      windowSeconds: 60,
      requireCredits: false,
    })

    const guestGuardOptions: MiddlewareOptions = {
      route: 'compatibility-counselor-guest',
      rateLimit: {
        limit: GUEST_COMPAT_RATE_LIMIT.limit,
        windowSeconds: GUEST_COMPAT_RATE_LIMIT.windowSeconds,
      },
    }

    let prefersAuthedGuard = false
    try {
      const session = await getServerSession(authOptions)
      prefersAuthedGuard = Boolean(session?.user)
    } catch {
      prefersAuthedGuard = false
    }

    let initialized = await initializeApiContext(
      req,
      prefersAuthedGuard ? authedGuardOptions : guestGuardOptions
    )
    if (prefersAuthedGuard && initialized.error && initialized.error.status === 401) {
      initialized = await initializeApiContext(req, guestGuardOptions)
    }

    const { context, error } = initialized
    if (error) {
      return error
    }

    const isGuestMode = !context.userId

    // Guest free-trial gate
    let guestTurnsUsed = 0
    if (isGuestMode) {
      guestTurnsUsed = readGuestCompatTurns(req)
      if (guestTurnsUsed >= GUEST_COMPAT_TURN_LIMIT) {
        return createErrorResponse({
          code: ErrorCodes.UNAUTHORIZED,
          message:
            '궁합 상담 무료 체험 2회를 모두 사용했어요. 로그인하면 가입 보너스 5 크레딧으로 계속 이용할 수 있어요.',
          locale: extractLocale(req),
          route: 'compatibility/counselor',
          headers: { 'X-Guest-Limit-Reached': '1' },
        })
      }
    }

    const rawBody = await req.json()
    const validationResult = compatibilityCounselorRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[compatibility/counselor] validation failed', {
        errors: validationResult.error.issues,
      })
      return NextResponse.json(
        {
          error: 'validation_failed',
          details: validationResult.error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    const {
      persons,
      person1Saju = null,
      person2Saju = null,
      person1Astro = null,
      person2Astro = null,
      fullContext,
      lang: bodyLang,
      messages = [],
      cvText,
      turnId: rawTurnId,
    } = validationResult.data

    // 끊김 복구용 턴 식별자. 로그인 사용자만 캐시 → 게스트는 turnId 가 있어도
    // 복원 대상에서 제외(아래 onComplete 가 recoverUserId 가드).
    const turnId = typeof rawTurnId === 'string' ? rawTurnId.slice(0, 80) : ''
    const recoverUserId = context.userId // string | null — 로그인 사용자만 복구 캐시

    const trimmedHistory = clampMessages(messages)

    // Safety check
    const lastUser = [...trimmedHistory].reverse().find((m) => m.role === 'user')
    // Answer language follows the app i18n setting: the client sends it as
    // body.lang and the I18nProvider mirrors it into the `locale` cookie
    // (auto-sent), so the toggle is honored. Accept-Language is last resort.
    const cookieLocale = req.cookies.get('locale')?.value
    const lang: 'ko' | 'en' =
      bodyLang === 'en' || bodyLang === 'ko'
        ? bodyLang
        : cookieLocale === 'en' || cookieLocale === 'ko'
          ? cookieLocale
          : context.locale === 'ko'
            ? 'ko'
            : 'en'
    // Self-harm / suicidal intent → crisis hotline, before the dry "restricted
    // topic" refusal and before any credit charge. containsForbidden is
    // English-only for self-harm, so this also covers Korean distress.
    // Screen EVERY user turn in the request, not just the latest: the client
    // replays prior user turns to the model via priorTurns, so a self-harm
    // expression in an earlier turn must still route to crisis even if the
    // current message looks benign. Messages are already in memory — cheap.
    const anyUserSelfHarm = trimmedHistory.some(
      (m) => m.role === 'user' && isSelfHarm(m.content ?? '')
    )
    if (anyUserSelfHarm) {
      return createFallbackSSEStream(
        { content: crisisMessage(lang), done: true },
        { 'X-Counselor-Fallback': '1' }
      )
    }
    if (lastUser && containsForbidden(lastUser.content)) {
      // X-Counselor-Fallback: 1 — 클라이언트가 "스트림이 잘림" 으로 잘못
      // 인식해 retry 칩을 띄우지 않도록. fallback / 안전 응답은 ||FOLLOWUP||
      // 마커가 없는 *완결된* 메시지다.
      return createFallbackSSEStream(
        { content: safetyMessage(lang), done: true },
        { 'X-Counselor-Fallback': '1' }
      )
    }

    // 크레딧 차감 — 인증 사용자만. 새로고침/탭 복제 idempotent replay 시
    // 차감 스킵. 게스트는 위 GUEST_COMPAT_TURN_LIMIT cookie counter 로 별도
    // 처리. middleware 의 requireCredits 가 false 라서 여기서 명시 처리.
    // chargedUserId 는 함수 스코프에 hoist 됨 (외부 catch 환불용).
    if (!isGuestMode && context.userId) {
      const scopedIdemKey = idemStore.keyFor(req, `user:${context.userId}`)
      const idempotentReplay = scopedIdemKey ? await idemStore.isReplay(scopedIdemKey) : false
      if (idempotentReplay) {
        logger.info('[compat/counselor] idempotent replay, skip credit consume', {
          userId: context.userId,
        })
      } else {
        const res = await consumeCredits(context.userId, 'compatibility', 1)
        if (!res.success) {
          return createErrorResponse({
            code: ErrorCodes.PAYMENT_REQUIRED,
            message:
              lang === 'ko'
                ? '크레딧이 부족해요. 충전 후 다시 시도해주세요.'
                : 'Insufficient credits. Please top up and try again.',
            locale: lang,
            route: 'compatibility/counselor',
          })
        }
        chargedUserId = context.userId
        refundKey = turnId ? `compat:${chargedUserId}:${turnId}` : null
        if (scopedIdemKey) await idemStore.mark(scopedIdemKey)
      }
    }

    // Claude 호출 실패 시 차감된 1 크레딧 환불 (인증 사용자 + 이번 turn 에
    // 실제 차감한 경우만). idempotent replay 일 땐 chargedUserId === null
    // 이므로 no-op.
    const refundChargedCredit = async (reason: string) => {
      if (!chargedUserId) return
      try {
        await refundCreditsOnce(refundKey, {
          userId: chargedUserId,
          creditType: 'compatibility',
          amount: 1,
          reason: 'api_error',
          apiRoute: 'compatibility/counselor',
          errorMessage: reason,
        })
        logger.info('[compat/counselor] credit refunded on failure', {
          userId: chargedUserId,
          reason,
        })
      } catch (err) {
        logger.error('[compat/counselor] refund failed', { err })
      }
    }

    // Build raw saju + astro contexts. We hand the LLM raw chart tables
    // (saju pillars, natal planets/houses/aspects) and let it do its
    // own picking — previously we also fed it fusion scores, extended
    // saju/astro compatibility analyses, and a 9-layer couple matrix,
    // but those structured outputs were bleeding into the model's
    // response template and effectively duplicating work the LLM does
    // better itself.
    const person1Seed = buildPersonSeed((persons?.[0] as Record<string, unknown>) || null)
    const person2Seed = buildPersonSeed((persons?.[1] as Record<string, unknown>) || null)
    const now = new Date()
    const autoPerson1Saju = await buildAutoSajuContext(person1Seed, now)
    const autoPerson2Saju = await buildAutoSajuContext(person2Seed, now)
    const autoPerson1Astro = await buildAutoAstroContext(person1Seed, now)
    const autoPerson2Astro = await buildAutoAstroContext(person2Seed, now)
    const effectivePerson1Saju = mergeSajuContext(person1Saju, autoPerson1Saju)
    const effectivePerson2Saju = mergeSajuContext(person2Saju, autoPerson2Saju)
    const effectivePerson1Astro = mergeAstroContext(person1Astro, autoPerson1Astro)
    const effectivePerson2Astro = mergeAstroContext(person2Astro, autoPerson2Astro)
    const strictCompleteness =
      process.env.NODE_ENV !== 'test' && process.env.COMPATIBILITY_COUNSELOR_STRICT === 'true'
    const completenessMissing = [
      ...collectMissingSajuKeys('person1', effectivePerson1Saju),
      ...collectMissingSajuKeys('person2', effectivePerson2Saju),
      ...collectMissingAstroKeys('person1', effectivePerson1Astro),
      ...collectMissingAstroKeys('person2', effectivePerson2Astro),
    ]
    if (strictCompleteness && completenessMissing.length > 0) {
      logger.error('[compatibility/counselor] strict completeness failed', {
        missing: completenessMissing,
      })
      return createFallbackSSEStream(
        {
          content:
            lang === 'ko'
              ? `필수 데이터 누락으로 리포트 생성을 중단했습니다. 누락: ${completenessMissing.join(', ')}`
              : `Report generation stopped due to missing required data: ${completenessMissing.join(', ')}`,
          done: true,
        },
        { 'X-Counselor-Fallback': '1' }
      )
    }
    if (!strictCompleteness && completenessMissing.length > 0) {
      logger.warn('[compatibility/counselor] continuing with partial context', {
        missing: completenessMissing,
      })
    }
    const p1Age = getAgeFromBirthDate(persons?.[0]?.date)
    const p2Age = getAgeFromBirthDate(persons?.[1]?.date)
    const timingDetails = {
      person1: extractTimingDetails(effectivePerson1Saju, p1Age, now),
      person2: extractTimingDetails(effectivePerson2Saju, p2Age, now),
    }

    // Raw chart context. Previously this was a pruned JSON dump of the
    // saju + natal objects (~25k chars even after PR #197's prunes).
    // 99% of the bytes were JSON quotes, brackets, and repeated key
    // names ("heavenlyStem", "earthlyBranch", "sibsin"...) that say
    // nothing to the model — the actual signal per character was tiny.
    //
    // Replaced with a flat, pipe-separated table form. Same info,
    // ~5× less tokens. The model reads pipes fine; we don't need a
    // visual table on the wire.
    //
    // If the caller supplies a pre-baked fullContext (legacy clients),
    // we still serialize that as JSON because we can't guarantee its
    // shape.
    const resolvedFullContext =
      fullContext ||
      ({
        persons,
        person1Saju: effectivePerson1Saju,
        person2Saju: effectivePerson2Saju,
        person1Astro: effectivePerson1Astro,
        person2Astro: effectivePerson2Astro,
      } as Record<string, unknown>)
    // Surface time-unknown flags as a header so the LLM can see which
    // sides should skip time-pillar / 일진 / ASC / MC / hour-dependent
    // signals. Without this the model just sees `time: 00:00` and
    // treats it as a real midnight birth.
    const personA = persons[0] as { timeUnknown?: boolean } | undefined
    const personB = persons[1] as { timeUnknown?: boolean } | undefined
    const unknownNotices: string[] = []
    if (personA?.timeUnknown) unknownNotices.push('# A 시간 미상.')
    if (personB?.timeUnknown) unknownNotices.push('# B 시간 미상.')

    // legacy fullContext 입력(있을 때)만 raw JSON으로 직렬화. self 블록이
    // 각 사람 raw + cross 다 cover하므로 fullContext가 없으면 fullContextText는
    // 빈 string — cached의 == 전체 raw 컨텍스트 == 섹션 자체가 생략됨.
    const fullContextText = fullContext
      ? stringifyForPrompt(prunePromptContext(resolvedFullContext))
      : [...unknownNotices].filter(Boolean).join('\n')
    const contextTrace = {
      currentDateIso: new Date().toISOString().slice(0, 10),
      hasDaeun: Boolean(timingDetails.person1.hasDaeun) || Boolean(timingDetails.person2.hasDaeun),
      hasSaeun: Boolean(timingDetails.person1.hasSaeun) || Boolean(timingDetails.person2.hasSaeun),
      hasWolun: Boolean(timingDetails.person1.hasWolun) || Boolean(timingDetails.person2.hasWolun),
      hasIlun: Boolean(timingDetails.person1.hasIlun) || Boolean(timingDetails.person2.hasIlun),
      timingCoverage: {
        person1: (timingDetails.person1.counts as Record<string, number>) || {},
        person2: (timingDetails.person2.counts as Record<string, number>) || {},
      },
      autoEnrichment: {
        person1: {
          hasSeed: !!person1Seed,
          hasAutoSaju: !!autoPerson1Saju,
          hasAutoAstro: !!autoPerson1Astro,
        },
        person2: {
          hasSeed: !!person2Seed,
          hasAutoSaju: !!autoPerson2Saju,
          hasAutoAstro: !!autoPerson2Astro,
        },
      },
      person1SajuKeys: countObjectKeys(effectivePerson1Saju),
      person2SajuKeys: countObjectKeys(effectivePerson2Saju),
      person1AstroKeys: countObjectKeys(effectivePerson1Astro),
      person2AstroKeys: countObjectKeys(effectivePerson2Astro),
      fullContextKeys: countObjectKeys(resolvedFullContext),
      strictCompleteness,
      missingFields: completenessMissing,
    }
    // contextTrace는 prompt에서 빠졌으므로 server-side 디버깅 용도로만 남긴다.
    logger.debug('[compatibility/counselor] context trace', { contextTrace })

    // 진짜 multi-turn — assistant 답변을 LLM이 자기 발화로 정확히
    // 인식하게. 예전엔 Q:/A: 한 덩어리 string으로 박아서 직전 답 톤이
    // 다음 답에 묻어 나왔다.
    const dialogTurns = trimmedHistory.filter(
      (m): m is { role: 'user' | 'assistant'; content: string } =>
        m.role === 'user' || m.role === 'assistant'
    )
    // 마지막 user 턴까지만 prior, 마지막 user 턴 자체는 userPrompt로.
    const lastUserIdxInDialog = (() => {
      for (let i = dialogTurns.length - 1; i >= 0; i--) {
        if (dialogTurns[i].role === 'user') return i
      }
      return -1
    })()
    // Sanitize prior turns from the client — drops forged 'system' roles,
    // caps length, and strips `<`/`>` to prevent fake tag-close injection.
    // See src/lib/llm/promptSafety.ts. We still apply guardText on the
    // remaining valid turns to keep the existing 400-char cap behavior
    // (sanitizePriorTurns' own 8000-char cap is the upper bound).
    const priorTurns =
      lastUserIdxInDialog >= 0
        ? sanitizePriorTurns(
            dialogTurns
              .slice(0, lastUserIdxInDialog)
              .map((m) => ({ role: m.role, content: guardText(m.content, 400) }))
          )
        : []
    // sanitizeForXmlTagBoundary replaces `<`/`>` with full-width chars so
    // attacker text in the question can't break out of the adjacent
    // <attached_file> wrapper or fake a new tag.
    const rawUserQuestion = lastUser
      ? sanitizeForXmlTagBoundary(guardText(lastUser.content, 600))
      : ''
    // Prepend the user's attached file (if any) as XML-tagged context on the
    // current turn — same approach as the destiny counselor (realtime route).
    const attachmentText =
      typeof cvText === 'string' ? sanitizeForXmlTagBoundary(cvText.trim().slice(0, 8000)) : ''
    const userQuestion = attachmentText
      ? `<attached_file>\n${attachmentText}\n</attached_file>\n\n${rawUserQuestion}`
      : rawUserQuestion

    // Format persons info. 라벨을 A/B로 통일해 커플 매트릭스의 "A의 갑목 일간
    // ↔ B의 기토 일간" 같은 prose 셀과 매핑이 즉시 명확하다. 이름이 있으면
    // 함께 표기해 응답에서 자연어로 부르기 쉽게 한다.
    const normalizedLang = lang === 'ko' ? 'ko' : 'en'
    const personsInfo = persons
      .map(
        (
          p: {
            name?: string
            date?: string
            time?: string
            relation?: string
            relationNote?: string
          },
          i: number
        ) => {
          const label = i === 0 ? 'A' : i === 1 ? 'B' : `P${i + 1}`
          // T2 fix: partner name 은 클라 입력 (zod 120 chars 임의 문자열). 다른
          // free-text 필드 (userQuestion, cvText, prior turns) 는 모두
          // sanitizeForXmlTagBoundary 거치는데 name 만 raw 로 prompt 에 삽입돼
          // prompt injection 가능했다.
          const name = p.name ? sanitizeForXmlTagBoundary(p.name).slice(0, 120) : ''
          const head = name ? `${label} (${name})` : label
          // Show the current age inline. Without this the LLM has to
          // derive "what age is this person now" from the birth year
          // and the current date — and it kept getting confused
          // between current age and the daeun stage start age (e.g.
          // 32세 대운 시작 vs 만 35세 현재) in earlier production
          // turns. Korean age = ageYears + 1 (one for the year of
          // birth, conventional 만 vs 한국나이 offset).
          const age = p.date ? getAgeFromBirthDate(p.date) : null
          const ageNote =
            age != null ? (normalizedLang === 'ko' ? ` (만 ${age}세)` : ` (age ${age})`) : ''
          // Person 1 is always the anchor — no relation suffix. For
          // everyone else, pipe through relationLabel so the LLM
          // sees "연인 / 배우자 / 가족 / 형제자매 / 친구 / 동료 / 기타"
          // in Korean (or the English equivalent) instead of the raw
          // English enum key. relationLabel falls back to the freeform
          // relationNote when the user picked "other".
          const rel =
            i > 0
              ? ` - ${relationLabel(normalizedLang, p.relation as Relation | undefined, p.relationNote)}`
              : ''
          return `${head}: ${p.date} ${p.time}${ageNote}${rel}`
        }
      )
      .join('\n')

    const evidenceGuide = buildEvidenceGroundingGuide(normalizedLang)

    // System prompt — minimal. The previous build pulled in the full
    // counselorVoiceBase (identity + listening protocol + 16 signature
    // sentences + absolute rules + anti-patterns + length guide) plus
    // compat domain rules plus citation rules — ~3k tokens of stage
    // direction that the model treated as scripture. Two side effects:
    //   1. answers got copy-pasted from the "한계 인정" signature
    //      block ("그 부분은 차트에 안 잡혀요…") even when the chart
    //      *could* speak to the question.
    //   2. every turn paid the full prompt cost.
    // User asked for raw-data-in, direct-answer-out. We keep only the
    // four hard safety/format guards. Tone is whatever the data
    // suggests; the model is no longer told *how* to sound.
    const counselorLang: 'ko' | 'en' = lang === 'ko' ? 'ko' : 'en'
    const systemPrompt = buildCompatibilityCounselorPrompt(counselorLang)

    // User prompt를 두 블록으로 분할 — multi-turn caching:
    //  - cachedUserContext: 두 사람의 차트와 분석 (테마·세션 무관, 진짜 안정)
    //  - userPrompt: 테마·시기 흐름·가이드·이력·질문 (테마 바뀌면 변동)
    //
    // 테마/품질가이드/시기 흐름(wolun/ilun이 테마 의존)을 변동 블록으로 옮겨
    // 같은 페어로 테마만 바꿔도 캐시 prefix가 hit하도록 한다.
    // cached에는 raw 차트만 둔다. 매트릭스/종합/사주심화/점성심화 등
    // 우리 엔진이 만든 2차 분석 텍스트는 더 이상 계산하지 않는다:
    //   1. 토큰 ~60% 감축 (12,400 → ~5,000자)
    //   2. 모델이 우리 점수/등급을 그대로 받아쓰는 환각 차단
    //   3. raw에서 직접 추론하게 함
    //   4. 호출당 계산 비용 절감 (cross-rules / 9-layer matrix 패스 스킵)
    // ── Synastry (두 사람 사이 cross 신호) ──────────────────────
    // 각자 natal/사주 raw만 주면 LLM이 *두 사람 관계*를 매번 직접 추론해야
    // 함. cross 신호(천간합·지지충·천을귀인 발동·점성 aspect orb·house
    // overlay)를 라인 단위로 미리 제공하면 정통 깊이 ↑↑ 토큰 ~5K 추가지만
    // cached prefix라 prompt caching이 cover.
    let sajuSynastryBlock = ''
    let astroSynastryBlock = ''
    let compositeChartBlock = ''
    try {
      const aP = (
        effectivePerson1Saju as {
          pillars?: Record<
            string,
            { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } }
          >
        } | null
      )?.pillars
      const bP = (
        effectivePerson2Saju as {
          pillars?: Record<
            string,
            { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } }
          >
        } | null
      )?.pillars
      if (aP && bP) {
        const toPair = (
          p: { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } } | undefined
        ) => ({
          stem: p?.heavenlyStem?.name ?? '',
          branch: p?.earthlyBranch?.name ?? '',
        })
        const aDae = (
          effectivePerson1Saju as {
            daeWoon?: {
              current?: { heavenlyStem?: string; earthlyBranch?: string; age?: number }
            } | null
          } | null
        )?.daeWoon?.current
        const bDae = (
          effectivePerson2Saju as {
            daeWoon?: {
              current?: { heavenlyStem?: string; earthlyBranch?: string; age?: number }
            } | null
          } | null
        )?.daeWoon?.current
        sajuSynastryBlock = formatSajuSynastry({
          pillarsA: [toPair(aP.year), toPair(aP.month), toPair(aP.day), toPair(aP.time)],
          pillarsB: [toPair(bP.year), toPair(bP.month), toPair(bP.day), toPair(bP.time)],
          currentDaeunA: aDae
            ? { stem: aDae.heavenlyStem ?? '', branch: aDae.earthlyBranch ?? '', age: aDae.age }
            : null,
          currentDaeunB: bDae
            ? { stem: bDae.heavenlyStem ?? '', branch: bDae.earthlyBranch ?? '', age: bDae.age }
            : null,
          nameA: (persons?.[0] as { name?: string } | undefined)?.name ?? null,
          nameB: (persons?.[1] as { name?: string } | undefined)?.name ?? null,
        })
      }
    } catch (err) {
      logger.warn('[compat counselor] saju synastry failed', {
        err: err instanceof Error ? err.message : String(err),
      })
    }
    if (person1Seed && person2Seed && process.env.NODE_ENV !== 'test') {
      try {
        const [Y1, M1, D1] = person1Seed.date.split('-').map(Number)
        const [h1, mi1] = person1Seed.time.split(':').map(Number)
        const [Y2, M2, D2] = person2Seed.date.split('-').map(Number)
        const [h2, mi2] = person2Seed.time.split(':').map(Number)
        if ([Y1, M1, D1, h1, mi1, Y2, M2, D2, h2, mi2].every(Number.isFinite)) {
          const [natalA, natalB] = await Promise.all([
            calculateNatalChart({
              year: Y1,
              month: M1,
              date: D1,
              hour: h1,
              minute: mi1,
              latitude: person1Seed.latitude,
              longitude: person1Seed.longitude,
              timeZone: person1Seed.timeZone,
            }),
            calculateNatalChart({
              year: Y2,
              month: M2,
              date: D2,
              hour: h2,
              minute: mi2,
              latitude: person2Seed.latitude,
              longitude: person2Seed.longitude,
              timeZone: person2Seed.timeZone,
            }),
          ])
          const chartA = toChart(natalA)
          const chartB = toChart(natalB)
          const nA = (persons?.[0] as { name?: string } | undefined)?.name ?? null
          const nB = (persons?.[1] as { name?: string } | undefined)?.name ?? null
          astroSynastryBlock = formatAstroSynastry({
            chartA,
            chartB,
            latA: person1Seed.latitude,
            lonA: person1Seed.longitude,
            latB: person2Seed.latitude,
            lonB: person2Seed.longitude,
            nameA: nA,
            nameB: nB,
          })
          // Composite chart — 두 차트의 entity 톤 (관계 자체). synastry 가
          // "서로에게 어떻게 반응하나" 면 composite 은 "둘이 같이 만드는 분위기".
          compositeChartBlock = formatCompositeChart({ chartA, chartB, nameA: nA, nameB: nB })
        }
      } catch (err) {
        logger.warn('[compat counselor] astro synastry failed', {
          err: err instanceof Error ? err.message : String(err),
        })
      }
    }

    // [Meta] 라인 — A/B 각자의 birthTimeUnknown / birthCityUnknown
    // 플래그 + location/timezone. system prompt 의 "[Meta] 의 ...=true
    // 면 인용 금지" 룰이 concrete 값에 매칭되게.
    const metaLines: string[] = []
    ;[person1Seed, person2Seed].forEach((seed, i) => {
      if (!seed) return
      const label = i === 0 ? 'A' : 'B'
      const raw = persons?.[i] as { time?: string; birthTimeUnknown?: boolean } | undefined
      const timeUnknown = !!raw?.birthTimeUnknown || !raw?.time || raw.time === '00:00'
      const cityUnknown = !!seed.source?.usedDefaultLocation
      // location/timezone 은 LLM 한테 직접 의미 없음 (이미 사주/점성 계산이
      // 적용된 결과만 전달). unknown 플래그만 가드 룰 위해 명시.
      metaLines.push(`[Meta] ${label}: timeUnknown=${timeUnknown}, cityUnknown=${cityUnknown}`)
    })
    const metaBlock = metaLines.join('\n')

    // 개별 신살 — 각자 타고난 self 신살 중 *cross 없는* personality 신살
    // (양인·귀문관·원진·고신·금여성·천덕/월덕귀인) 만 1인 1줄로. 도화·홍염·
    // 백호·괴강·천을귀인 은 sajuSynastryFormatter 가 양방향 cross 처리해
    // 중복 제거.
    // T2 fix: name 을 sanitize 후 prompt 에 삽입.
    const safeNameOf = (idx: number): string => {
      const raw = (persons?.[idx] as { name?: string } | undefined)?.name
      return raw ? sanitizeForXmlTagBoundary(raw).slice(0, 120) : ''
    }
    const personalShinsalLines = [
      formatPersonalShinsal(
        safeNameOf(0) ? `A(${safeNameOf(0)})` : 'A',
        (effectivePerson1Saju as { extras?: { shinsal?: unknown } } | null)?.extras?.shinsal
      ),
      formatPersonalShinsal(
        safeNameOf(1) ? `B(${safeNameOf(1)})` : 'B',
        (effectivePerson2Saju as { extras?: { shinsal?: unknown } } | null)?.extras?.shinsal
      ),
    ].filter(Boolean)
    const personalShinsalBlock = personalShinsalLines.length
      ? `[개별 신살 (self)]\n${personalShinsalLines.join('\n')}`
      : ''

    // 각 블록은 빈 string 일 수 있어 filter(Boolean) 으로 거름. join('\n')
    // 만으로 블록 사이 한 줄 띄움 (이전엔 prefix \n 추가해 빈 라인 중복).
    const cachedUserContext = [
      `== 참여자 정보 ==`,
      personsInfo,
      metaBlock,
      personalShinsalBlock,
      sajuSynastryBlock,
      astroSynastryBlock,
      compositeChartBlock,
      fullContextText, // legacy fullContext (보통 빈 string)
    ]
      .filter(Boolean)
      .join('\n')

    // 궁합은 오로지 교차(synastry + 세운 cross). 1인 개별 타이밍 (세운/
    // 월운/일진·트랜짓·리턴) 은 "두 사람이 어떻게 얽히나"가 아니라 개인 운세라
    // 궁합 철학과 안 맞고 토큰만 먹어 제거. 관계 시기는 cached 의 사주
    // synastry 안 세운 cross 가 담당.
    void evidenceGuide
    // 호출자 이름은 cachedUserContext 밖에서 주입 — 이전엔 callerLine
    // 이 cached prefix 안에 들어가서 (a) 유저 간 prompt-cache 공유 불가,
    // (b) 이름 변경시 다음 세션 캐시 무효화. 이제 휘발성 userPrompt
    // prefix 라 차트 데이터만으로 캐시 안정.
    const callerName = await getUserDisplayName(context.userId)
    const callerLine = callerName
      ? lang === 'ko'
        ? `[호출자(질문자)] ${callerName} — 한국어로 답할 때 '${callerName}님'으로 호명한다.\n\n`
        : `[Caller] ${callerName} — address as 'Hi ${callerName},' naturally.\n\n`
      : ''
    const userPrompt = `${callerLine}${userQuestion}`

    try {
      return await streamClaudeAsSSE({
        // req.signal 은 여전히 넘기지만, keepGeneratingOnDisconnect 가 true 라
        // 클라가 끊겨도 업스트림을 중단하지 않고 끝까지 생성한다 (아래 onComplete
        // 로 캐시 저장 → 사용자가 돌아오면 result 엔드포인트로 복원).
        abortSignal: req.signal,
        keepGeneratingOnDisconnect: true,
        // 생성이 끝나면(클라 연결 여부 무관) 완성 답안을 캐시에 저장. 끊겼다가
        // 돌아온 사용자가 /api/compatibility/counselor/result?turnId=… 로 받아간다.
        // 게스트(recoverUserId 없음) 는 끊김 복구 미지원 — turnId 가 있어도 캐시 안 함.
        onComplete:
          turnId && recoverUserId
            ? async (full) => {
                try {
                  await cacheSet(
                    compatTurnResultKey(recoverUserId, turnId),
                    full,
                    COMPAT_TURN_RESULT_TTL_SEC
                  )
                } catch {
                  /* 캐시 실패는 무시 — 단순히 복원이 안 될 뿐, 스트림엔 영향 없음 */
                }
              }
            : undefined,
        systemPrompt,
        cachedUserContext,
        userPrompt,
        priorTurns,
        // Haiku → Sonnet 4.5 통일. 운명 상담사와 같은 깊이·톤. 캐싱(1h)
        // 으로 cachedUserContext 비용 회수.
        model: PREMIUM_CLAUDE_MODEL,
        // maxTokens 5000 + continuation hook — 5000 도달해도 자동으로 이어
        // 써서 답이 절대 중간에 안 잘림 (최대 2회 continuation, 누적 24000
        // chars 절대 cap). claudeWithContinuation 참고.
        maxTokens: 5000,
        enableContinuation: true,
        temperature: 0.7,
        timeoutMs: 80000,
        label: 'compatibility-counselor',
        // Mid-stream failures (empty completion / backend error) surface
        // inside the SSE body, not as a thrown error, so the catch below
        // never sees them. Refund the consumed credit here too. Guests
        // aren't credit-charged → chargedUserId === null → no-op.
        onFailure: chargedUserId
          ? async () => {
              await refundChargedCredit('compatibility-counselor stream delivered no content')
            }
          : undefined,
        additionalHeaders: {
          'X-Guest-Mode': isGuestMode ? '1' : '0',
          ...(isGuestMode
            ? {
                'Set-Cookie': buildGuestCompatTurnCookie(guestTurnsUsed + 1),
                'X-Guest-Turns-Remaining': String(
                  Math.max(0, GUEST_COMPAT_TURN_LIMIT - (guestTurnsUsed + 1))
                ),
              }
            : {}),
        },
      })
    } catch (claudeErr) {
      logger.error('[Compatibility Counselor] Claude error:', {
        error: claudeErr instanceof Error ? claudeErr.message : String(claudeErr),
      })

      // Refund credit if Claude failed (authed users only, this turn 차감 후)
      await refundChargedCredit(
        `Claude error: ${claudeErr instanceof Error ? claudeErr.message : 'unknown'}`
      )

      const fallback =
        lang === 'ko'
          ? 'AI \uC11C\uBC84 \uC5F0\uACB0\uC5D0 \uBB38\uC81C\uAC00 \uC788\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.'
          : 'AI server connection issue. Please try again later.'

      return createFallbackSSEStream(
        { content: fallback, done: true },
        { 'X-Counselor-Fallback': '1' }
      )
    }
  } catch (error) {
    // Charge-without-delivery guard: if a credit was consumed before the
    // failure (e.g. chart building threw before the stream started), refund it
    // here. The inner claudeErr catch returns instead of rethrowing, so this
    // only runs for pre-stream failures → no double refund.
    if (chargedUserId) {
      try {
        // Idempotent: same key as refundChargedCredit, so if an inner path
        // already refunded this turn, this is a no-op (no double refund).
        await refundCreditsOnce(refundKey, {
          userId: chargedUserId,
          creditType: 'compatibility',
          amount: 1,
          reason: 'api_error',
          apiRoute: 'compatibility/counselor',
          errorMessage: `handler error: ${error instanceof Error ? error.name : 'Unknown'}`,
        })
        logger.info('[compat/counselor] credit refunded in outer catch', { userId: chargedUserId })
      } catch (refundErr) {
        logger.error('[compat/counselor] outer-catch refund failed', { refundErr })
      }
    }
    logger.error('[Compatibility Counselor] Error:', { error: error })
    // Never reflect raw internal/DB error text to the client (project policy:
    // "don't reflect raw errors"). The detail is captured server-side via the
    // logger.error above. In non-production only, attach a *short* error tag
    // (name + first 120 chars of message) as a debug aid — the prod response
    // stays generic.
    const body: { error: string; errorTag?: string } = { error: 'Internal server error' }
    if (process.env.NODE_ENV !== 'production') {
      const errName = error instanceof Error ? error.name : 'UnknownError'
      const errMsg =
        error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120)
      body.errorTag = `${errName}: ${errMsg}`
    }
    return NextResponse.json(body, { status: HTTP_STATUS.SERVER_ERROR })
  }
}
