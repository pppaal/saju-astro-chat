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
import {
  calculateFusionCompatibility,
  type FusionCompatibilityResult,
} from '@/lib/compatibility/compatibilityFusion'
import { performExtendedSajuAnalysis } from '@/lib/compatibility/saju/comprehensive'
import { performExtendedAstrologyAnalysis } from '@/lib/compatibility/astrology/comprehensive'
import { HTTP_STATUS } from '@/lib/constants/http'
import { compatibilityCounselorRequestSchema } from '@/lib/api/zodValidation'
import { buildThemeDepthGuide, buildEvidenceGroundingGuide } from '@/lib/prompts/fortuneWithIcp'
import { counselorVoiceBase, type CounselorLang } from '@/lib/ai/counselorVoiceBase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 90

// In-memory LRU for couple-matrix prompt context. Keyed by the
// (date|time|gender|lat|lon) hash of both people. Multi-turn chats with
// the same pair reuse the same matrix instead of recalculating saju +
// natal + 9-layer cross every turn (saves 1-2s per message).
const COUPLE_MATRIX_CACHE = new Map<string, { value: string; expiresAt: number }>()
const COUPLE_MATRIX_TTL_MS = 30 * 60 * 1000 // 30 min
const COUPLE_MATRIX_MAX = 200

function getCachedCoupleMatrixContext(key: string): string | null {
  const hit = COUPLE_MATRIX_CACHE.get(key)
  if (!hit) return null
  if (hit.expiresAt < Date.now()) {
    COUPLE_MATRIX_CACHE.delete(key)
    return null
  }
  // touch for LRU
  COUPLE_MATRIX_CACHE.delete(key)
  COUPLE_MATRIX_CACHE.set(key, hit)
  return hit.value
}

function setCachedCoupleMatrixContext(key: string, value: string): void {
  if (COUPLE_MATRIX_CACHE.size >= COUPLE_MATRIX_MAX) {
    const oldest = COUPLE_MATRIX_CACHE.keys().next().value
    if (oldest) COUPLE_MATRIX_CACHE.delete(oldest)
  }
  COUPLE_MATRIX_CACHE.set(key, {
    value,
    expiresAt: Date.now() + COUPLE_MATRIX_TTL_MS,
  })
}

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
  countObjectKeys,
  extractTimingDetails,
  buildPersonSeed,
  buildAutoSajuContext,
  buildAutoAstroContext,
  collectMissingSajuKeys,
  collectMissingAstroKeys,
  mergeSajuContext,
  mergeAstroContext,
  buildSajuProfile,
  buildAstroProfile,
  buildExtendedAstroProfile,
  getAgeFromBirthDate,
  formatFusionForPrompt,
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
      theme = 'general',
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

    // Build profiles and run Fusion analysis
    let fusionResult: FusionCompatibilityResult | null = null
    let fusionContext = ''
    let extendedSajuCompatibility: ReturnType<typeof performExtendedSajuAnalysis> | null = null
    let extendedAstroCompatibility: ReturnType<typeof performExtendedAstrologyAnalysis> | null =
      null
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
    const currentYear = now.getFullYear()
    const timingDetails = {
      person1: extractTimingDetails(effectivePerson1Saju, p1Age, now),
      person2: extractTimingDetails(effectivePerson2Saju, p2Age, now),
    }

    try {
      const p1Saju = buildSajuProfile(effectivePerson1Saju)
      const p2Saju = buildSajuProfile(effectivePerson2Saju)
      const p1Astro = buildAstroProfile(effectivePerson1Astro)
      const p2Astro = buildAstroProfile(effectivePerson2Astro)
      const p1ExtendedAstro = buildExtendedAstroProfile(effectivePerson1Astro)
      const p2ExtendedAstro = buildExtendedAstroProfile(effectivePerson2Astro)

      if (p1Saju && p2Saju && p1Astro && p2Astro) {
        fusionResult = calculateFusionCompatibility(p1Saju, p1Astro, p2Saju, p2Astro)
        fusionContext = formatFusionForPrompt(fusionResult, lang)
        extendedSajuCompatibility = performExtendedSajuAnalysis(
          p1Saju,
          p2Saju,
          p1Age,
          p2Age,
          currentYear
        )
      }

      if (p1ExtendedAstro && p2ExtendedAstro) {
        extendedAstroCompatibility = performExtendedAstrologyAnalysis(
          p1ExtendedAstro,
          p2ExtendedAstro,
          Math.abs(p1Age - p2Age)
        )
      }
    } catch (fusionError) {
      logger.error('[Compatibility Counselor] Fusion error:', { error: fusionError })
    }

    const resolvedFullContext =
      fullContext ||
      ({
        persons,
        person1Saju: effectivePerson1Saju,
        person2Saju: effectivePerson2Saju,
        person1Astro: effectivePerson1Astro,
        person2Astro: effectivePerson2Astro,
        autoEnrichment: {
          person1: {
            seed: person1Seed,
            hasAutoSaju: !!autoPerson1Saju,
            hasAutoAstro: !!autoPerson1Astro,
          },
          person2: {
            seed: person2Seed,
            hasAutoSaju: !!autoPerson2Saju,
            hasAutoAstro: !!autoPerson2Astro,
          },
        },
        fusionResult,
        extendedSajuCompatibility,
        extendedAstroCompatibility,
        timingDetails,
        theme,
      } as Record<string, unknown>)
    const fullContextText = stringifyForPrompt(resolvedFullContext)
    const contextTrace = {
      currentDateIso: new Date().toISOString().slice(0, 10),
      hasFusionResult: !!fusionResult,
      hasExtendedSajuCompatibility: !!extendedSajuCompatibility,
      hasExtendedAstroCompatibility: !!extendedAstroCompatibility,
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

    // Build conversation context
    const historyText = trimmedHistory
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role === 'user' ? 'Q' : 'A'}: ${guardText(m.content, 400)}`)
      .join('\n')
      .slice(0, 2000)

    const userQuestion = lastUser ? guardText(lastUser.content, 600) : ''

    // Couple Matrix context — cell-level cross between A's and B's
    // saju+astro. Provides the AI with concrete cited cells (천간합 일주합,
    // 해묘미 목국 완성, Venus trine Sun, 寅-申 충 등) instead of just
    // aggregate scores.
    //
    // Cached by (date|time|gender|lat|lon)×2 hash so multi-turn chats
    // don't rebuild calculateSajuData + calculateNatalChart + 9-layer
    // couple matrix on every message — first turn pays the cost, rest
    // are O(1) lookups.
    let coupleMatrixContext = ''
    const p1ForMatrix = (persons as any[])[0]
    const p2ForMatrix = (persons as any[])[1]
    if (p1ForMatrix?.date && p2ForMatrix?.date) {
      const personKey = (p: any) =>
        [p.date, p.time || '', p.gender || '', p.latitude ?? '', p.longitude ?? ''].join('|')
      const cacheKey = `${personKey(p1ForMatrix)}__${personKey(p2ForMatrix)}`
      const cached = getCachedCoupleMatrixContext(cacheKey)
      if (cached) {
        coupleMatrixContext = cached
      } else {
        try {
          const [{ buildCoupleMatrix }, { calculateSajuData }, { calculateNatalChart }, { buildOrthodoxInterpretation }] =
            await Promise.all([
              import('@/lib/compatibility/coupleMatrix'),
              import('@/lib/saju/saju'),
              import('@/lib/astro/astrologyService'),
              import('@/lib/saju/orthodox'),
            ])
          const buildPerson = async (p: any) => {
            const tz = p.timeZone || 'Asia/Seoul'
            const gender = (p.gender === 'female' || p.gender === 'F') ? 'female' : 'male'
            const koreanAge = new Date().getFullYear() - parseInt(String(p.date).split('-')[0], 10) + 1
            const saju = calculateSajuData(p.date, p.time || '12:00', gender, 'solar', tz)
            ;(saju as unknown as Record<string, unknown>).orthodoxInterpretation =
              buildOrthodoxInterpretation(saju, { koreanAge })
            const [Y, M, D] = String(p.date).split('-').map(Number)
            const [h, mi] = String(p.time || '12:00').split(':').map(Number)
            const lat = typeof p.latitude === 'number' ? p.latitude : 37.5665
            const lon = typeof p.longitude === 'number' ? p.longitude : 126.978
            const natal = await calculateNatalChart({
              year: Y, month: M, date: D, hour: h, minute: mi,
              latitude: lat, longitude: lon, timeZone: tz,
            })
            return {
              saju,
              natal: { planets: natal.planets, ascendant: natal.ascendant },
              koreanAge,
            }
          }
          const [A, B] = await Promise.all([buildPerson(p1ForMatrix), buildPerson(p2ForMatrix)])
          const matrix = buildCoupleMatrix(
            { saju: A.saju, natal: A.natal as any, koreanAge: A.koreanAge },
            { saju: B.saju, natal: B.natal as any, koreanAge: B.koreanAge }
          )
          const s = matrix.summary
          const top = s.topPositiveCells.slice(0, 5).map((c) => `+ ${c.description} [${c.sajuBasis} × ${c.astroBasis}]`).join('\n')
          const bot = s.topCautionCells.slice(0, 5).map((c) => `- ${c.description} [${c.sajuBasis} × ${c.astroBasis}]`).join('\n')
          coupleMatrixContext = [
            '== 커플 매트릭스 (9 레이어 셀-단위 사주×점성 교차) ==',
            `종합 ${s.totalScore} / overlap ${s.overlapStrength} / polarity +${s.polarityBalance.positive}/-${s.polarityBalance.negative}`,
            `도메인: 매력 ${s.domainScores.attraction} · 안정 ${s.domainScores.stability} · 성장 ${s.domainScores.growth} · 갈등견딤 ${s.domainScores.conflict} · 시기동기 ${s.domainScores.timing}`,
            `Drivers: ${s.drivers.join(' / ') || '없음'}`,
            `Cautions: ${s.cautions.join(' / ') || '없음'}`,
            `\n[Top positive cells]\n${top}`,
            `\n[Top caution cells]\n${bot}`,
          ].join('\n')
          setCachedCoupleMatrixContext(cacheKey, coupleMatrixContext)
        } catch (err) {
          logger.warn('[Compatibility Counselor] couple-matrix context build failed', { err })
        }
      }
    }

    // Format persons info
    const personsInfo = persons
      .map(
        (p: { name?: string; date?: string; time?: string; relation?: string }, i: number) =>
          `Person ${i + 1}: ${p.name || `Person ${i + 1}`} (${p.date} ${p.time})${i > 0 ? ` - ${p.relation || 'partner'}` : ''}`
      )
      .join('\n')

    // Theme-specific context
    const themeContextMap: Record<string, string> = {
      general: lang === 'ko' ? '전반적인 궁합 상담' : 'General compatibility counseling',
      love: lang === 'ko' ? '연애/결혼 궁합 전문 상담' : 'Romance/Marriage compatibility',
      business:
        lang === 'ko' ? '비즈니스 파트너십 궁합 상담' : 'Business partnership compatibility',
      family: lang === 'ko' ? '가족 관계 궁합 상담' : 'Family relationship compatibility',
    }
    const themeContext =
      themeContextMap[theme as string] || (lang === 'ko' ? '궁합 상담' : 'Compatibility counseling')
    const normalizedLang = lang === 'ko' ? 'ko' : 'en'
    const themeDepthGuide = buildThemeDepthGuide(String(theme || 'general'), normalizedLang)
    const evidenceGuide = buildEvidenceGroundingGuide(normalizedLang)

    // System prompt — counselor role.
    // 공통 voice (counselorVoiceBase) + 궁합 카운슬러에만 해당하는 도메인 규칙.
    const counselorLang: CounselorLang = lang === 'ko' ? 'ko' : 'en'
    const voice = counselorVoiceBase(counselorLang)
    const systemPrompt =
      counselorLang === 'ko'
        ? [
            voice,
            '',
            '[궁합 카운슬러 도메인 규칙]',
            '- *두 사람의 결*을 본다. 한 사람만 칭찬하거나 한 사람만 꼬집지 말 것.',
            '- 시너지 1개 + 마찰 1개를 최소 한 답변에 같이 보여준다 — 한쪽으로 치우치면 진단이 아니라 응원/저주가 됨.',
            '- 사주·점성 cross 데이터가 들어오면 두 시스템이 *같은 방향을 가리키는지 다른 방향인지* 짚어준다.',
            '- 시기 데이터(대운·세운·트랜짓)가 있을 땐 "지금 어느 시기에 있는가"가 진단을 바꾸는 축이다.',
            '- 두 사람이 함께 결정해야 하는 일(이사·결혼·창업)에 caution 신호가 잡히면 *비가역 행동을 미루는 결*로 마무리.',
            '- 궁합은 *고정 점수*가 아니라 *시기와 자세에 따라 바뀌는 결*이라는 톤을 유지.',
          ].join('\n')
        : [
            voice,
            '',
            '[Compatibility counselor domain rules]',
            '- Read *both people\'s edges*. Never praise only one or critique only one.',
            '- Show one synergy + one friction in every answer. A one-sided read is cheerleading or a curse, not diagnosis.',
            '- When saju×astro cross data is provided, name whether the two systems point the *same direction* or pull apart.',
            '- When timing data (daeun / seun / transits) is present, *which season they are in* is the axis that changes the read.',
            '- For joint irreversible decisions (move-in, marriage, business) with caution flags, end on *deferring the irreversible*.',
            '- Hold the line that compatibility is not a *fixed score* — it is a flow that shifts with timing and posture.',
          ].join('\n')

    // User prompt를 두 블록으로 분할 — multi-turn caching:
    //  - cachedUserContext: 두 사람의 차트 + 사주/점성/시기 분석 + 가이드 (안정)
    //  - userPrompt: 이번 턴의 history + 새 질문 (변동)
    const cachedUserContext = [
      `테마: ${themeContext}`,
      ``,
      `== 참여자 정보 ==`,
      personsInfo,
      coupleMatrixContext ? `\n${coupleMatrixContext}` : '',
      fusionContext ? `\n${fusionContext}` : '',
      extendedSajuCompatibility
        ? `\n== 사주 심화 분석 ==\n${stringifyForPrompt(extendedSajuCompatibility)}`
        : '',
      extendedAstroCompatibility
        ? `\n== 점성 심화 분석 ==\n${stringifyForPrompt(extendedAstroCompatibility)}`
        : '',
      `\n== 시기 흐름 (대운/세운/월운/일운) ==\n${stringifyForPrompt(timingDetails)}`,
      `\n== 결정적 컨텍스트 ==\n${stringifyForPrompt(contextTrace)}`,
      fullContextText ? `\n== 전체 raw 컨텍스트 ==\n${fullContextText}` : '',
      `\n== 품질 기준 ==\n${themeDepthGuide}`,
      `\n== 근거 사용 가이드 ==\n${evidenceGuide}`,
    ]
      .filter(Boolean)
      .join('\n')

    const userPrompt = [
      historyText ? `== 이전 대화 ==\n${historyText}` : '',
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: HTTP_STATUS.SERVER_ERROR }
    )
  }
}
