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
import { buildEvidenceGroundingGuide } from '@/lib/prompts/fortuneWithIcp'
import { counselorVoiceBase, type CounselorLang } from '@/lib/ai/counselorVoiceBase'
import { relationLabel } from '../routeSupportCommon'
import type { Relation } from '../types'
import {
  formatSajuAsTable,
  formatAstroAsTable,
} from '@/lib/compatibility/sajuTableFormatter'

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
  buildSajuProfile,
  buildAstroProfile,
  buildExtendedAstroProfile,
  getAgeFromBirthDate,
  formatFusionForPrompt,
  formatExtendedSajuForPrompt,
  formatExtendedAstroForPrompt,
  formatTimingForPrompt,
  scoreLabel,
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
    const fullContextText = fullContext
      ? stringifyForPrompt(prunePromptContext(resolvedFullContext))
      : [
          formatSajuAsTable(
            effectivePerson1Saju as Parameters<typeof formatSajuAsTable>[0],
            'A',
          ),
          formatSajuAsTable(
            effectivePerson2Saju as Parameters<typeof formatSajuAsTable>[0],
            'B',
          ),
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
    // contextTrace는 prompt에서 빠졌으므로 server-side 디버깅 용도로만 남긴다.
    logger.debug('[compatibility/counselor] context trace', { contextTrace })

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
    type CompatPerson = {
      date?: string
      time?: string
      gender?: string
      timeZone?: string
      latitude?: number
      longitude?: number
    }
    let coupleMatrixContext = ''
    const p1ForMatrix = (persons as CompatPerson[])[0]
    const p2ForMatrix = (persons as CompatPerson[])[1]
    if (p1ForMatrix?.date && p2ForMatrix?.date) {
      const personKey = (p: CompatPerson) =>
        [p.date, p.time || '', p.gender || '', p.latitude ?? '', p.longitude ?? ''].join('|')
      const cacheKey = `${personKey(p1ForMatrix)}__${personKey(p2ForMatrix)}`
      const cached = getCachedCoupleMatrixContext(cacheKey)
      if (cached) {
        coupleMatrixContext = cached
      } else {
        try {
          const [
            { buildCoupleMatrix },
            { calculateSajuData },
            { calculateNatalChart },
            { buildOrthodoxInterpretation },
          ] = await Promise.all([
            import('@/lib/compatibility/coupleMatrix'),
            import('@/lib/saju/saju'),
            import('@/lib/astrology/foundation/astrologyService'),
            import('@/lib/saju/orthodoxInterpretation'),
          ])
          /**
           * Reuse already-computed saju + natal from the buildAuto*Context
           * pass when possible. Previously this block re-ran calculateSajuData
           * + calculateNatalChart for both people on every fresh request,
           * doubling the per-pair compute. Falls back to fresh calculation
           * only when the auto* enrichment didn't run (e.g., user supplied
           * partial pre-computed data without the matrix-required shape).
           */
          const buildPerson = async (
            p: CompatPerson,
            cachedSaju: Record<string, unknown> | null,
            cachedAstro: Record<string, unknown> | null
          ) => {
            const tz = p.timeZone || 'Asia/Seoul'
            const gender = p.gender === 'female' || p.gender === 'F' ? 'female' : 'male'
            const koreanAge =
              new Date().getFullYear() - parseInt(String(p.date).split('-')[0], 10) + 1

            // Saju: reuse if it has the shape the matrix needs (pillars +
            // dayMaster). calculateSajuData is sync and the matrix needs
            // its output exactly.
            type SajuShape = ReturnType<typeof calculateSajuData> & {
              orthodoxInterpretation?: unknown
            }
            const cachedAsRecord = cachedSaju as
              | (Record<string, unknown> & { pillars?: unknown; dayMaster?: unknown })
              | null
            const looksLikeSaju = !!(
              cachedAsRecord &&
              cachedAsRecord.pillars &&
              cachedAsRecord.dayMaster
            )
            const saju: SajuShape = looksLikeSaju
              ? (cachedSaju as unknown as SajuShape)
              : (calculateSajuData(
                  p.date!,
                  p.time || '12:00',
                  gender,
                  'solar',
                  tz
                ) as SajuShape)
            if (!saju.orthodoxInterpretation) {
              saju.orthodoxInterpretation = buildOrthodoxInterpretation(saju, { koreanAge })
            }

            // Natal: reuse from cachedAstro.natalData when present. Only
            // planets + ascendant are needed for the matrix.
            const cachedNatalData = (cachedAstro as { natalData?: Record<string, unknown> } | null)
              ?.natalData
            let natal: { planets: unknown; ascendant: unknown }
            if (
              cachedNatalData &&
              Array.isArray(cachedNatalData.planets) &&
              cachedNatalData.ascendant
            ) {
              natal = {
                planets: cachedNatalData.planets,
                ascendant: cachedNatalData.ascendant,
              }
            } else {
              const [Y, M, D] = String(p.date).split('-').map(Number)
              const [h, mi] = String(p.time || '12:00').split(':').map(Number)
              const lat = typeof p.latitude === 'number' ? p.latitude : 37.5665
              const lon = typeof p.longitude === 'number' ? p.longitude : 126.978
              const fresh = await calculateNatalChart({
                year: Y,
                month: M,
                date: D,
                hour: h,
                minute: mi,
                latitude: lat,
                longitude: lon,
                timeZone: tz,
              })
              natal = { planets: fresh.planets, ascendant: fresh.ascendant }
            }
            return { saju, natal, koreanAge }
          }
          const [A, B] = await Promise.all([
            buildPerson(p1ForMatrix, effectivePerson1Saju, effectivePerson1Astro),
            buildPerson(p2ForMatrix, effectivePerson2Saju, effectivePerson2Astro),
          ])
          const matrix = buildCoupleMatrix(
            {
              saju: A.saju,
              natal: A.natal as unknown as Parameters<typeof buildCoupleMatrix>[0]['natal'],
              koreanAge: A.koreanAge,
            },
            {
              saju: B.saju,
              natal: B.natal as unknown as Parameters<typeof buildCoupleMatrix>[0]['natal'],
              koreanAge: B.koreanAge,
            }
          )
          const s = matrix.summary
          const top = s.topPositiveCells
            .slice(0, 5)
            .map((c) => `+ ${c.description} [${c.sajuBasis} × ${c.astroBasis}]`)
            .join('\n')
          const bot = s.topCautionCells
            .slice(0, 5)
            .map((c) => `- ${c.description} [${c.sajuBasis} × ${c.astroBasis}]`)
            .join('\n')
          // 레이어별 대표 셀 1개씩 — 전체 Top-5만 보면 어떤 레이어는 한 줄도
          // 안 들어가는 사각지대가 생긴다. 각 레이어에서 |score|가 가장 큰 셀을
          // 하나씩 뽑아 9개 레이어 모두 최소 한 줄은 보장한다.
          const layerLabels: Record<number, string> = {
            1: 'L1 오행',
            2: 'L2 십성-행성',
            3: 'L3 천간합',
            4: 'L4 지지합충',
            5: 'L5 어스펙트',
            6: 'L6 대운동조',
            7: 'L7 대운-네이탈',
            8: 'L8 신살-행성',
            9: 'L9 격국',
          }
          const layerEntries = Object.entries(matrix.layers) as Array<
            [string, typeof matrix.layers.L1_element]
          >
          const perLayer = layerEntries
            .map(([, cells]) => {
              if (!cells || cells.length === 0) return null
              const pick = [...cells].sort(
                (a, b) => Math.abs(b.score) - Math.abs(a.score)
              )[0]
              if (!pick) return null
              const mark =
                pick.polarity === 'positive' ? '+' : pick.polarity === 'negative' ? '-' : '·'
              const tag = layerLabels[pick.layer] || `L${pick.layer}`
              return `${mark} [${tag}] ${pick.description} [${pick.sajuBasis} × ${pick.astroBasis}]`
            })
            .filter((line): line is string => Boolean(line))
            .join('\n')
          // 점수는 bucket label을 primary로, raw 숫자는 괄호 안에 보조로.
          // 시스템 룰("raw 숫자 그대로 인용 금지")과 source 표기를 일치시켜
          // LLM drift를 더 확실히 줄인다.
          const langKey: 'ko' | 'en' = lang === 'ko' ? 'ko' : 'en'
          const ds = s.domainScores
          coupleMatrixContext = [
            '== 커플 매트릭스 (9 레이어 셀-단위 사주×점성 교차) ==',
            `종합 ${scoreLabel(s.totalScore, langKey)} (${s.totalScore}) · ${langKey === 'ko' ? '신호 겹침' : 'overlap'} ${scoreLabel(s.overlapStrength * 100, langKey)} · polarity +${s.polarityBalance.positive}/-${s.polarityBalance.negative}`,
            `${langKey === 'ko' ? '도메인' : 'domains'}: ${langKey === 'ko' ? '매력' : 'attraction'} ${scoreLabel(ds.attraction, langKey)} · ${langKey === 'ko' ? '안정' : 'stability'} ${scoreLabel(ds.stability, langKey)} · ${langKey === 'ko' ? '성장' : 'growth'} ${scoreLabel(ds.growth, langKey)} · ${langKey === 'ko' ? '갈등견딤' : 'conflict'} ${scoreLabel(ds.conflict, langKey)} · ${langKey === 'ko' ? '시기동기' : 'timing'} ${scoreLabel(ds.timing, langKey)}`,
            `Drivers: ${s.drivers.join(' / ') || (langKey === 'ko' ? '없음' : 'none')}`,
            `Cautions: ${s.cautions.join(' / ') || (langKey === 'ko' ? '없음' : 'none')}`,
            `\n[Top positive cells]\n${top}`,
            `\n[Top caution cells]\n${bot}`,
            `\n[${langKey === 'ko' ? '레이어별 대표 셀' : 'per-layer representative cells'}]\n${perLayer}`,
          ].join('\n')
          setCachedCoupleMatrixContext(cacheKey, coupleMatrixContext)
        } catch (err) {
          logger.warn('[Compatibility Counselor] couple-matrix context build failed', { err })
        }
      }
    }

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
          return `${head}: ${p.date} ${p.time}${rel}`
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
    // 우리 엔진이 만든 2차 분석 텍스트는 빼서:
    //   1. 토큰 ~60% 감축 (12,400 → ~5,000자)
    //   2. 모델이 우리 점수/등급을 그대로 받아쓰는 환각 차단
    //   3. raw에서 직접 추론하게 함
    // (분석 변수들은 다른 흐름에서 쓰일 수 있어 import는 유지.)
    void coupleMatrixContext
    void fusionContext
    void extendedSajuCompatibility
    void extendedAstroCompatibility
    const cachedUserContext = [
      `== 참여자 정보 ==`,
      personsInfo,
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
