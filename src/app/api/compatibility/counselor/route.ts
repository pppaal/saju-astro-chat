import { NextRequest, NextResponse } from 'next/server'
import {
  initializeApiContext,
  createAuthenticatedGuard,
  type MiddlewareOptions,
} from '@/lib/api/middleware'
import { createFallbackSSEStream } from '@/lib/streaming'
import { streamClaudeAsSSE } from '@/lib/llm/claudeSSE'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { extractLocale } from '@/lib/api/middleware'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { guardText, containsForbidden, safetyMessage } from '@/lib/textGuards'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { compatibilityCounselorRequestSchema } from '@/lib/api/zodValidation'
import { buildEvidenceGroundingGuide } from '@/lib/prompts/fortuneWithIcp'
import { counselorVoiceBase, type CounselorLang } from '@/lib/ai/counselorVoiceBase'
import type { Relation } from '../types'

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
import {
  formatSajuAsTable,
  formatAstroAsTable,
  formatSajuExtras,
} from '@/lib/compatibility/sajuTableFormatter'

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
  formatTimingForPrompt,
} from './routeSupport'

export async function POST(req: NextRequest) {
  try {
    // Apply middleware: prefer authenticated guard (with credits) but fall
    // back to guest guard so first-time visitors can sample 2 turns before
    // the login wall — same pattern as destiny-map/chat-stream.
    const authedGuardOptions = createAuthenticatedGuard({
      route: 'compatibility-counselor',
      limit: 30,
      windowSeconds: 60,
      requireCredits: true,
      creditType: 'compatibility',
      creditAmount: 1,
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
            '궁합 상담 무료 체험 2회를 모두 사용했어요. 로그인하면 가입 보너스 2 크레딧으로 계속 이용할 수 있어요.',
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
      lang = context.locale,
      messages = [],
    } = validationResult.data

    const trimmedHistory = clampMessages(messages)

    // Safety check
    const lastUser = [...trimmedHistory].reverse().find((m) => m.role === 'user')
    if (lastUser && containsForbidden(lastUser.content)) {
      return createFallbackSSEStream({
        content: safetyMessage(lang),
        done: true,
      })
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
      return createFallbackSSEStream({
        content:
          lang === 'ko'
            ? `필수 데이터 누락으로 리포트 생성을 중단했습니다. 누락: ${completenessMissing.join(', ')}`
            : `Report generation stopped due to missing required data: ${completenessMissing.join(', ')}`,
        done: true,
      })
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

    // Pull extras + natalRelations out of each effective saju (they
    // live next to the raw pillars on buildAutoSajuContext output) so
    // formatSajuExtras can emit 격국·용신·신살·12운성 + 합/충/형/파/해/공망.
    type ExtrasSource = Parameters<typeof formatSajuExtras>[0]
    const extras1 = formatSajuExtras({
      extras: (effectivePerson1Saju as { extras?: ExtrasSource['extras'] })?.extras,
      natalRelations: (effectivePerson1Saju as { natalRelations?: ExtrasSource['natalRelations'] })?.natalRelations,
    })
    const extras2 = formatSajuExtras({
      extras: (effectivePerson2Saju as { extras?: ExtrasSource['extras'] })?.extras,
      natalRelations: (effectivePerson2Saju as { natalRelations?: ExtrasSource['natalRelations'] })?.natalRelations,
    })

    const fullContextText = fullContext
      ? stringifyForPrompt(prunePromptContext(resolvedFullContext))
      : [
          ...unknownNotices,
          ...(unknownNotices.length > 0 ? [''] : []),
          formatSajuAsTable(
            effectivePerson1Saju as Parameters<typeof formatSajuAsTable>[0],
            'A',
          ),
          extras1 ? `A의 ${extras1}` : '',
          formatSajuAsTable(
            effectivePerson2Saju as Parameters<typeof formatSajuAsTable>[0],
            'B',
          ),
          extras2 ? `B의 ${extras2}` : '',
          formatAstroAsTable(
            effectivePerson1Astro as Parameters<typeof formatAstroAsTable>[0],
            'A',
          ),
          formatAstroAsTable(
            effectivePerson2Astro as Parameters<typeof formatAstroAsTable>[0],
            'B',
          ),
        ]
          .filter((block) => !/\(없음\)/.test(block))
          .join('\n\n')
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

    // Build conversation context
    const historyText = trimmedHistory
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role === 'user' ? 'Q' : 'A'}: ${guardText(m.content, 400)}`)
      .join('\n')
      .slice(0, 2000)

    const userQuestion = lastUser ? guardText(lastUser.content, 600) : ''


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
          const name = p.name || ''
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
            age != null
              ? normalizedLang === 'ko'
                ? ` (만 ${age}세 / 한국 ${age + 1}세)`
                : ` (age ${age})`
              : ''
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
    const counselorLang: CounselorLang = lang === 'ko' ? 'ko' : 'en'
    void counselorVoiceBase // intentionally unused — kept imported for other counselors
    const systemPrompt =
      counselorLang === 'ko'
        ? [
            '아래 == 참여자 정보 == 블록의 사주·점성 데이터를 근거로 사용자의 질문에 직접 답변한다.',
            '',
            '규칙:',
            '- 두 사람의 관계 역학에 답한다. 한 명만 분석하지 말 것.',
            '- 사주와 점성을 한 흐름 안에서 통합해 답한다. 시스템 분리 X.',
            '- 마크다운 헤더(##)·번호 list 사용 금지. 자연스러운 단락으로.',
            '- "A/B 시간 미상" 표시가 있으면 그쪽 시주/일진/ASC/MC/하우스 인용 금지.',
            '- AI/모델/상담사 정체 노출 금지.',
            '- 사주·점성 전문 용어(일간, 십성, 대운, 천을귀인, 트랜짓, 어스펙트, 하우스 등)는 최대한 쓰지 말 것. 데이터는 근거로만 읽고, 일상 언어로 자연스럽게 풀어서 답한다. 꼭 필요할 때만 짧은 괄호 설명과 함께 한 번 언급.',
          ].join('\n')
        : [
            'Answer the user directly from the saju and astrology data in the == 참여자 정보 == block.',
            '',
            'Rules:',
            '- Answer about the relationship dynamic. Never analyze only one person.',
            '- Fuse saju and astrology in one flow. No system-split.',
            '- No markdown headers (##) or numbered lists. Plain prose paragraphs.',
            '- If "A/B 시간 미상" is marked, do not cite that side\'s hour pillar / 일진 / ASC / MC / houses.',
            "- Never reveal you're an AI / model / counselor system.",
            '- Avoid jargon (day master, ten gods, daeun, transit, aspect, house, etc.). Use the data as evidence but speak in plain, natural language. Only mention a technical term once with a short parenthetical when truly needed.',
          ].join('\n')

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
    const cachedUserContext = [
      `== 참여자 정보 ==`,
      personsInfo,
      // contextTrace(키 개수, 커버리지 플래그 등)는 디버그 메타데이터 — 응답에
      // 쓸 정보가 아니므로 server log로만 남기고 prompt에는 포함하지 않는다.
      fullContextText ? `\n== 전체 raw 컨텍스트 ==\n${fullContextText}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    // formatTimingForPrompt now emits only astro transits/returns (saju
    // is already in the cached table). Returns '' when no astro data —
    // the .filter(Boolean) below drops it.
    const timingBlock = formatTimingForPrompt(
      timingDetails as { person1: Record<string, unknown>; person2: Record<string, unknown> },
      {
        person1: effectivePerson1Astro as Record<string, unknown> | null,
        person2: effectivePerson2Astro as Record<string, unknown> | null,
      },
      normalizedLang,
    )
    // evidenceGuide used to live here as a 300-char block reminding the
    // model to cite saju/astro and avoid pushing irreversible actions.
    // After PR #195 the system prompt's three rules cover the same
    // ground in 60 chars — kept the local variable for future opt-in
    // toggles but dropped from the wire.
    void evidenceGuide
    const userPrompt = [
      timingBlock,
      historyText ? `\n== 이전 대화 ==\n${historyText}` : '',
      `\n== 사용자 질문 ==\n${userQuestion}`,
    ]
      .filter(Boolean)
      .join('\n')

    try {
      return await streamClaudeAsSSE({
        systemPrompt,
        cachedUserContext,
        userPrompt,
        maxTokens: 3500,
        temperature: 0.7,
        timeoutMs: 80000,
        label: 'compatibility-counselor',
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

      // Refund credit if Claude failed (authed users only)
      if (context?.refundCreditsOnError) {
        await context.refundCreditsOnError(
          `Claude error: ${claudeErr instanceof Error ? claudeErr.message : 'unknown'}`,
          { route: 'compatibility-counselor' }
        )
      }

      const fallback =
        lang === 'ko'
          ? 'AI \uC11C\uBC84 \uC5F0\uACB0\uC5D0 \uBB38\uC81C\uAC00 \uC788\uC5B4\uC694. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574\uC8FC\uC138\uC694.'
          : 'AI server connection issue. Please try again later.'

      return createFallbackSSEStream({
        content: fallback,
        done: true,
      })
    }
  } catch (error) {
    logger.error('[Compatibility Counselor] Error:', { error: error })
    // We've been chasing a recurring generic "오류가 발생했습니다" on the
    // client and have no signal beyond "something threw inside the
    // route." Surface a *short* error tag (name + first 120 chars of
    // message) so the next failure shows up directly in the chat
    // bubble — no stack trace, no internals. Remove once stable.
    const errName = error instanceof Error ? error.name : 'UnknownError'
    const errMsg = error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120)
    return NextResponse.json(
      { error: 'Internal server error', errorTag: `${errName}: ${errMsg}` },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}
