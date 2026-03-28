/**
 * Destiny Calendar API
 * Saju + Astrology fused yearly important dates
 * AI-assisted calculations (optional backend)
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  withApiMiddleware,
  createSimpleGuard,
  extractLocale,
  type ApiContext,
} from '@/lib/api/middleware'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { BRANCH_TO_ELEMENT, STEM_TO_ELEMENT, STEM_TO_ELEMENT_EN } from '@/lib/Saju/constants'
import type { FiveElement } from '@/lib/Saju/types'
import koTranslations from '@/i18n/locales/ko'
import enTranslations from '@/i18n/locales/en'
import type { TranslationData } from '@/types/calendar-api'
import { logger } from '@/lib/logger'
import { cacheOrCalculate, CacheKeys, CACHE_TTL } from '@/lib/cache/redis-cache'
import { calendarMainQuerySchema, createValidationErrorResponse } from '@/lib/api/zodValidation'
import { calculateYearlyImportantDatesLite } from './lib/liteYearlyDates'
import type { CalendarCoreAdapterResult } from '@/lib/destiny-matrix/core/adapters'
import type { CounselorEvidencePacket } from '@/lib/destiny-matrix/counselorEvidence'

import {
  getPillarStemName,
  getPillarBranchName,
  parseBirthDate,
  applyMatrixPreformatRegrade,
  formatDateForResponse,
  LOCATION_COORDS,
  type MatrixCalendarContext,
} from './lib/helpers'
import { buildCalendarPresentationView } from './lib/presentationAdapter'
import type { DomainKey, MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import type { CalendarMatrixEvidencePacketMap } from './lib/matrixEvidencePacket'

export const dynamic = 'force-dynamic'

import { LIMITS } from '@/lib/validation/patterns'
import { normalizeMojibakePayload } from '@/lib/text/mojibake'
// HTTP_STATUS not used directly, status codes used via createErrorResponse
const _VALID_CALENDAR_PLACES = new Set(Object.keys(LOCATION_COORDS))
const MAX_PLACE_LEN = LIMITS.PLACE

// Zodiac to element mapping (extracted to avoid duplication in try/catch blocks)
const ZODIAC_TO_ELEMENT: Record<string, string> = {
  Aries: 'fire',
  Leo: 'fire',
  Sagittarius: 'fire',
  Taurus: 'earth',
  Virgo: 'earth',
  Capricorn: 'earth',
  Gemini: 'metal',
  Libra: 'metal',
  Aquarius: 'metal',
  Cancer: 'water',
  Scorpio: 'water',
  Pisces: 'water',
}

// AI enrichment should be best-effort by default.
// Enable strict failure only when explicitly opted in.
const CALENDAR_STRICT_AI_ENRICHMENT =
  process.env.NODE_ENV !== 'test' && process.env.CALENDAR_STRICT_AI_ENRICHMENT === 'true'

const ZODIAC_TO_WESTERN_ELEMENT: Record<
  string,
  NonNullable<MatrixCalculationInput['dominantWesternElement']>
> = {
  Aries: 'fire',
  Leo: 'fire',
  Sagittarius: 'fire',
  Taurus: 'earth',
  Virgo: 'earth',
  Capricorn: 'earth',
  Gemini: 'air',
  Libra: 'air',
  Aquarius: 'air',
  Cancer: 'water',
  Scorpio: 'water',
  Pisces: 'water',
}

const CORE_SIGNAL_DOMAIN_TO_CALENDAR_DOMAIN: Record<string, DomainKey | null> = {
  career: 'career',
  relationship: 'love',
  wealth: 'money',
  health: 'health',
  move: 'move',
  personality: null,
  spirituality: null,
  timing: null,
}

const CALENDAR_PACKET_THEME_MAP = {
  career: { theme: 'career', focusDomainOverride: 'career' },
  love: { theme: 'love', focusDomainOverride: 'relationship' },
  wealth: { theme: 'wealth', focusDomainOverride: 'wealth' },
  health: { theme: 'health', focusDomainOverride: 'health' },
  today: { theme: 'today', focusDomainOverride: undefined },
  general: { theme: 'today', focusDomainOverride: undefined },
} as const

function normalizeFiveElement(value: unknown): FiveElement | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (
    trimmed === '목' ||
    trimmed === '화' ||
    trimmed === '토' ||
    trimmed === '금' ||
    trimmed === '수'
  ) {
    return trimmed
  }
  if (trimmed === 'wood') return '목'
  if (trimmed === 'fire') return '화'
  if (trimmed === 'earth') return '토'
  if (trimmed === 'metal') return '금'
  if (trimmed === 'water') return '수'
  return undefined
}

function mapCoreSignalDomainToCalendarDomain(domain: string | undefined): DomainKey | null {
  if (!domain) return null
  return CORE_SIGNAL_DOMAIN_TO_CALENDAR_DOMAIN[domain] ?? null
}

function pickCurrentDaeunStem(
  daeunCycles: Array<{ age: number; heavenlyStem: string }>,
  birthYear: number,
  targetYear: number
): string | undefined {
  const currentAge = Math.max(1, targetYear - birthYear + 1)
  return [...daeunCycles]
    .filter((cycle) => Number.isFinite(cycle.age) && cycle.age <= currentAge && cycle.heavenlyStem)
    .sort((a, b) => b.age - a.age)[0]?.heavenlyStem
}

function buildCalendarMatrixInput(params: {
  birthDate: string
  birthTime?: string
  birthPlace: string
  year: number
  timezone: string
  latitude: number
  longitude: number
  locale: 'ko' | 'en'
  category?: string
  sajuResult: Record<string, unknown>
  sajuProfile: {
    dayMasterElement: string
    birthYear: number
    daeunCycles: Array<{ age: number; heavenlyStem: string; earthlyBranch: string }>
    pillars: {
      year: { stem: string; branch: string }
      month: { stem: string; branch: string }
      day: { stem: string; branch: string }
      hour: { stem: string; branch: string }
    }
  }
  astroProfile: {
    sunSign: string
    sunElement: string
  }
}): MatrixCalculationInput {
  const { sajuProfile, astroProfile } = params
  const pillarElements = [
    STEM_TO_ELEMENT[sajuProfile.pillars.year.stem],
    BRANCH_TO_ELEMENT[sajuProfile.pillars.year.branch],
    STEM_TO_ELEMENT[sajuProfile.pillars.month.stem],
    BRANCH_TO_ELEMENT[sajuProfile.pillars.month.branch],
    STEM_TO_ELEMENT[sajuProfile.pillars.day.stem],
    BRANCH_TO_ELEMENT[sajuProfile.pillars.day.branch],
    STEM_TO_ELEMENT[sajuProfile.pillars.hour.stem],
    BRANCH_TO_ELEMENT[sajuProfile.pillars.hour.branch],
  ]
    .map((value) => normalizeFiveElement(value))
    .filter((value): value is FiveElement => Boolean(value))

  const dayMasterElement =
    normalizeFiveElement(STEM_TO_ELEMENT[sajuProfile.pillars.day.stem]) ||
    normalizeFiveElement(sajuProfile.dayMasterElement) ||
    '목'

  const currentDaeunElement = normalizeFiveElement(
    STEM_TO_ELEMENT[
      pickCurrentDaeunStem(sajuProfile.daeunCycles, sajuProfile.birthYear, params.year) || ''
    ]
  )

  const currentDateIso = `${params.year}-01-01`
  const dominantWesternElement = ZODIAC_TO_WESTERN_ELEMENT[astroProfile.sunSign] || 'fire'

  return {
    dayMasterElement,
    pillarElements,
    sibsinDistribution: {},
    twelveStages: {},
    relations: [],
    currentDaeunElement,
    currentIljinElement: currentDaeunElement || dayMasterElement,
    currentIljinDate: currentDateIso,
    shinsalList: [],
    dominantWesternElement,
    planetHouses: {},
    planetSigns: {
      Sun: astroProfile.sunSign as MatrixCalculationInput['planetSigns']['Sun'],
      Moon: astroProfile.sunSign as MatrixCalculationInput['planetSigns']['Moon'],
    },
    aspects: [],
    activeTransits: [],
    asteroidHouses: {},
    extraPointSigns: {},
    advancedAstroSignals: {},
    sajuSnapshot: params.sajuResult,
    astrologySnapshot: {
      currentTransits: {
        asOfIso: currentDateIso,
      },
    },
    crossSnapshot: {
      source: 'calendar-route',
      theme: params.category || 'yearly',
      category: params.category || 'yearly',
      currentDateIso,
      coverage: {
        hasAstrologySnapshot: true,
        hasSajuSnapshot: true,
      },
      anchors: {
        dayMasterElement,
        currentDaeunElement,
        currentIljinElement: currentDaeunElement || dayMasterElement,
        currentIljinDate: currentDateIso,
      },
    },
    currentDateIso,
    lang: params.locale,
    startYearMonth: `${params.year}-01`,
    profileContext: {
      birthDate: params.birthDate,
      birthTime: params.birthTime,
      birthCity: params.birthPlace,
      timezone: params.timezone,
      latitude: params.latitude,
      longitude: params.longitude,
      analysisAt: new Date().toISOString(),
    },
  }
}

function deriveFallbackSunSign(birthDate: Date): string {
  const month = birthDate.getMonth()
  const day = birthDate.getDate()
  if ((month === 2 && day >= 21) || (month === 3 && day <= 19)) return 'Aries'
  if ((month === 3 && day >= 20) || (month === 4 && day <= 20)) return 'Taurus'
  if ((month === 4 && day >= 21) || (month === 5 && day <= 20)) return 'Gemini'
  if ((month === 5 && day >= 21) || (month === 6 && day <= 22)) return 'Cancer'
  if ((month === 6 && day >= 23) || (month === 7 && day <= 22)) return 'Leo'
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Virgo'
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Libra'
  if ((month === 9 && day >= 23) || (month === 10 && day <= 21)) return 'Scorpio'
  if ((month === 10 && day >= 22) || (month === 11 && day <= 21)) return 'Sagittarius'
  if ((month === 11 && day >= 22) || (month === 0 && day <= 19)) return 'Capricorn'
  if ((month === 0 && day >= 20) || (month === 1 && day <= 18)) return 'Aquarius'
  return 'Pisces'
}

/**
 * GET /api/calendar
 * 중요 날짜 조회 (인증 불필요)
 *
 * Query params:
 * - birthDate: 생년월일 (YYYY-MM-DD) - 필수
 * - birthTime: 출생시간 (HH:MM) - 선택
 * - birthPlace: 출생장소 - 선택
 * - year: 연도 (기본: 현재년도)
 * - category: 카테고리 필터
 * - locale: 언어 (ko, en)
 */
export const GET = withApiMiddleware(
  async (request: NextRequest, context: ApiContext) => {
    const { searchParams } = new URL(request.url)

    // Validate query params with Zod
    const queryValidation = calendarMainQuerySchema.safeParse({
      birthDate: searchParams.get('birthDate'),
      birthTime: searchParams.get('birthTime') || undefined,
      birthPlace: searchParams.get('birthPlace') || undefined,
      year: searchParams.get('year') || undefined,
      gender: searchParams.get('gender') || undefined,
      locale: searchParams.get('locale') || undefined,
      category: searchParams.get('category') || undefined,
    })
    if (!queryValidation.success) {
      logger.warn('[Calendar] query validation failed', { errors: queryValidation.error.issues })
      return createValidationErrorResponse(queryValidation.error, {
        locale: extractLocale(request),
        route: 'calendar',
      })
    }

    const {
      birthDate: birthDateParam,
      birthTime: birthTimeParam,
      birthPlace: birthPlaceRaw,
      year: yearFromZod,
      gender,
      locale,
      category,
    } = queryValidation.data
    const year = yearFromZod ?? new Date().getFullYear()
    const birthPlace =
      birthPlaceRaw.length > 0 && birthPlaceRaw.length <= MAX_PLACE_LEN ? birthPlaceRaw : 'Seoul'

    // 생년월일 파싱 (UTC 오프셋 영향 없이 고정)
    const birthDate = parseBirthDate(birthDateParam)
    if (!birthDate) {
      return createErrorResponse({
        code: ErrorCodes.INVALID_DATE,
        locale: extractLocale(request),
        route: 'calendar',
      })
    }
    // birthPlace는 항상 유효한 값이 있음 (기본값: Seoul)
    const coords = LOCATION_COORDS[birthPlace] || LOCATION_COORDS['Seoul']
    const timezone = coords.tz

    // 정확한 사주 계산 (saju.ts 사용 - 절기 기반 월주, 자시 교차 처리)
    let sajuResult
    try {
      const sajuGender = gender.toLowerCase() === 'female' ? ('female' as const) : ('male' as const)
      const { calculateSajuData } = await import('@/lib/Saju/saju')
      sajuResult = calculateSajuData(birthDateParam, birthTimeParam, sajuGender, 'solar', timezone)
    } catch (sajuError) {
      logger.error('[Calendar] Saju calculation error:', sajuError)
      return createErrorResponse({
        code: ErrorCodes.INTERNAL_ERROR,
        message: 'Failed to calculate saju data',
        locale: extractLocale(request),
        route: 'calendar',
        originalError: sajuError instanceof Error ? sajuError : new Error(String(sajuError)),
      })
    }

    // 사주 데이터에서 필요한 정보 추출
    // Null safety: pillars 객체가 없을 수 있음
    const sajuPillars = sajuResult?.pillars || {}
    const pillars = {
      year: {
        stem: getPillarStemName(sajuPillars.year),
        branch: getPillarBranchName(sajuPillars.year),
      },
      month: {
        stem: getPillarStemName(sajuPillars.month),
        branch: getPillarBranchName(sajuPillars.month),
      },
      day: {
        stem: getPillarStemName(sajuPillars.day),
        branch: getPillarBranchName(sajuPillars.day),
      },
      hour: {
        stem: getPillarStemName(sajuPillars.time),
        branch: getPillarBranchName(sajuPillars.time),
      },
    }

    const dayMasterStem = pillars.day.stem
    const dayMasterElement = STEM_TO_ELEMENT_EN[dayMasterStem] || 'wood'

    // 대운 추출 - DaeunCycle 타입에 맞춤
    const daeunCycles =
      sajuResult.unse?.daeun
        ?.map((d) => ({
          age: d.age || 0,
          heavenlyStem: d.heavenlyStem || '',
          earthlyBranch: d.earthlyBranch || '',
        }))
        .filter((d) => d.heavenlyStem && d.earthlyBranch) || []

    const sajuProfile = {
      dayMaster: dayMasterStem,
      dayMasterElement,
      dayBranch: pillars.day.branch,
      birthYear: birthDate.getFullYear(),
      yearBranch: pillars.year.branch,
      daeunCycles,
      daeunsu: sajuResult.daeWoon?.startAge ?? 0,
      pillars,
    }

    const sunSign = deriveFallbackSunSign(birthDate)
    const astroProfile = {
      sunSign,
      sunElement: ZODIAC_TO_ELEMENT[sunSign] || 'fire',
      birthMonth: birthDate.getMonth() + 1,
      birthDay: birthDate.getDate(),
    }

    let matrixCalendarContext: MatrixCalendarContext = null
    let matrixInputCoverage: Record<string, unknown> | null = null
    let matrixEvidencePackets: CalendarMatrixEvidencePacketMap | null = null
    let responseMatrixEvidencePackets: Record<string, CounselorEvidencePacket> | null = null
    let calendarCoreCanonical = null as CalendarCoreAdapterResult | null
    let calendarCoreDataQuality = null as {
      missingFields: string[]
      derivedFields: string[]
      conflictingFields: string[]
      qualityPenalties: string[]
      confidenceReason: string
    } | null
    let topMatchedPatterns: Array<{
      id: string
      label: string
      score: number
      confidence: number
      domains: string[]
      activationReason: string
    }> = []
    let calendarMatrixContract:
      | {
          coreHash?: string
          overallPhase?: string
          overallPhaseLabel?: string
          topClaimId?: string
          topClaim?: string
          focusDomain?: string
        }
      | undefined

    try {
      const [
        { buildCalendarCoreEnvelope },
        { adaptCoreToCalendar },
        {
          ensureMatrixInputCrossCompleteness,
          buildServiceInputCrossAudit,
          listMissingCrossKeysForService,
        },
        { deriveCalendarSignals },
        { buildCounselorEvidencePacket },
      ] = await Promise.all([
        import('@/lib/destiny-matrix/core/buildCalendarCoreEnvelope'),
        import('@/lib/destiny-matrix/core/adapters'),
        import('@/lib/destiny-matrix/inputCross'),
        import('@/lib/destiny-matrix/calendarSignals'),
        import('@/lib/destiny-matrix/counselorEvidence'),
      ])

      const matrixInput = buildCalendarMatrixInput({
        birthDate: birthDateParam,
        birthTime: birthTimeParam,
        birthPlace,
        year,
        timezone,
        latitude: coords.lat,
        longitude: coords.lng,
        locale: locale === 'en' ? 'en' : 'ko',
        category: category || undefined,
        sajuResult: sajuResult as unknown as Record<string, unknown>,
        sajuProfile,
        astroProfile,
      })
      const crossCompleteInput = ensureMatrixInputCrossCompleteness(matrixInput)
      const engineEnvelope = buildCalendarCoreEnvelope({
        lang: locale === 'en' ? 'en' : 'ko',
        matrixInput: crossCompleteInput,
      })
      const coreSummary = engineEnvelope.matrix.summary
      calendarCoreCanonical = adaptCoreToCalendar(
        engineEnvelope.coreSeed,
        locale === 'en' ? 'en' : 'ko'
      )
      calendarCoreDataQuality = engineEnvelope.coreSeed.quality.dataQuality
      responseMatrixEvidencePackets = Object.fromEntries(
        Object.entries(CALENDAR_PACKET_THEME_MAP).map(([key, config]) => [
          key,
          buildCounselorEvidencePacket({
            theme: config.theme,
            lang: locale === 'en' ? 'en' : 'ko',
            focusDomainOverride: config.focusDomainOverride,
            matrixInput: engineEnvelope.normalizedInput,
            matrixReport: engineEnvelope.matrixReport,
            matrixSummary: coreSummary,
            signalSynthesis: engineEnvelope.coreSeed.signalSynthesis,
            strategyEngine: engineEnvelope.coreSeed.strategyEngine,
            core: engineEnvelope.coreSeed,
            birthDate: birthDateParam,
          }),
        ])
      )
      matrixEvidencePackets =
        responseMatrixEvidencePackets as unknown as CalendarMatrixEvidencePacketMap
      matrixCalendarContext = {
        calendarSignals:
          coreSummary.calendarSignals && coreSummary.calendarSignals.length > 0
            ? coreSummary.calendarSignals
            : deriveCalendarSignals(coreSummary),
        overlapTimeline: coreSummary.overlapTimeline,
        overlapTimelineByDomain: coreSummary.overlapTimelineByDomain,
        timingCalibration: coreSummary.timingCalibration,
        domainScores: coreSummary.domainScores,
      }
      const crossAudit = buildServiceInputCrossAudit(crossCompleteInput, 'calendar')
      matrixInputCoverage = {
        availability: engineEnvelope.coreSeed.availability,
        qualityScore: engineEnvelope.coreSeed.quality.score,
        qualityGrade: engineEnvelope.coreSeed.quality.grade,
        dataQuality: engineEnvelope.coreSeed.quality.dataQuality,
        missingServiceKeys: listMissingCrossKeysForService(crossAudit, 'calendar'),
      }
      topMatchedPatterns = engineEnvelope.coreSeed.patterns.slice(0, 10).map((pattern) => ({
        id: pattern.id,
        label: pattern.label,
        score: pattern.score,
        confidence: pattern.confidence,
        domains: [...pattern.domains],
        activationReason: pattern.activationReason,
      }))
      calendarMatrixContract = {
        coreHash: calendarCoreCanonical.coreHash,
        overallPhase: calendarCoreCanonical.phase,
        overallPhaseLabel: calendarCoreCanonical.phaseLabel,
        topClaimId: calendarCoreCanonical.claimIds[0],
        topClaim: calendarCoreCanonical.thesis,
        focusDomain:
          mapCoreSignalDomainToCalendarDomain(calendarCoreCanonical.focusDomain) || undefined,
      }
    } catch (matrixError) {
      logger.warn(
        '[Calendar] destiny-matrix core unavailable; continuing with lightweight calendar',
        {
          error: matrixError instanceof Error ? matrixError.message : String(matrixError),
        }
      )
    }

    // 로컬 계산으로 중요 날짜 가져오기 (Redis 캐싱 적용)
    const cacheKey = CacheKeys.yearlyCalendar(
      birthDateParam,
      birthTimeParam,
      gender,
      year,
      category || undefined,
      birthPlace
    )
    const localDates = await cacheOrCalculate(
      cacheKey,
      async () =>
        calculateYearlyImportantDatesLite(year, sajuProfile, astroProfile, {
          minGrade: 4, // grade 4(최악의 날)까지 포함
          locale: locale === 'en' ? 'en' : 'ko',
          matrixContext: matrixCalendarContext || undefined,
        }),
      CACHE_TTL.CALENDAR_DATA // 1 day
    )

    // 카테고리 필터링
    let filteredDates = localDates
    if (category) {
      filteredDates = localDates.filter((d) => d.categories.includes(category))
    }
    const matrixRegradedDates = filteredDates
      .map((date) =>
        applyMatrixPreformatRegrade(
          date,
          matrixCalendarContext || undefined,
          matrixEvidencePackets || undefined
        )
      )
      .sort((a, b) => {
        if (a.grade !== b.grade) return a.grade - b.grade
        return (b.displayScore ?? b.score) - (a.displayScore ?? a.score)
      })

    // AI 백엔드에서 추가 정보 시도
    const sajuData = {
      birth_date: birthDateParam,
      birth_time: birthTimeParam,
      gender,
      day_master: pillars.day.stem,
      pillars,
      elements: sajuProfile,
    }

    const astroData = {
      birth_date: birthDateParam,
      birth_time: birthTimeParam,
      latitude: coords.lat,
      longitude: coords.lng,
      timezone: coords.tz,
      sun_sign: astroProfile.sunSign,
      planets: {
        sun: { sign: astroProfile.sunSign, degree: 15 },
        moon: {
          sign: astroProfile.sunSign,
          degree: 15,
        },
      },
    }

    // AI 백엔드 호출 시도
    const { fetchAIDates } = await import('./lib/helpers')
    const aiDates = await fetchAIDates(sajuData, astroData, category || 'overall')
    if (!aiDates && CALENDAR_STRICT_AI_ENRICHMENT) {
      logger.error('[Calendar] AI date enrichment unavailable (strict mode)')
      return createErrorResponse({
        code: ErrorCodes.SERVICE_UNAVAILABLE,
        message: 'AI date enrichment unavailable',
        locale: extractLocale(request),
        route: 'calendar',
      })
    }
    if (!aiDates && !CALENDAR_STRICT_AI_ENRICHMENT) {
      logger.warn('[Calendar] AI date enrichment unavailable (fallback to local rules)')
    }
    const aiEnrichmentFailed = !aiDates
    const formatCalendarDate = (d: (typeof matrixRegradedDates)[number]) =>
      formatDateForResponse(
        d,
        locale,
        koTranslations as unknown as TranslationData,
        enTranslations as unknown as TranslationData,
        matrixCalendarContext,
        matrixEvidencePackets || undefined,
        aiEnrichmentFailed
      )

    const formattedDatesBase = matrixRegradedDates.map((d) => formatCalendarDate(d))
    const auspiciousDateSet = new Set(
      (aiDates?.auspicious || []).map((item) => item.date).filter(Boolean)
    )
    const cautionDateSet = new Set(
      (aiDates?.caution || []).map((item) => item.date).filter(Boolean)
    )
    const formattedDates = formattedDatesBase.map((item) => {
      const aiNotes: string[] = []
      if (auspiciousDateSet.has(item.date)) {
        aiNotes.push(
          locale === 'en'
            ? 'AI review also marks this date as favorable.'
            : 'AI 보강에서도 이 날짜를 유리한 날로 봅니다.'
        )
      }
      if (cautionDateSet.has(item.date)) {
        aiNotes.push(
          locale === 'en'
            ? 'AI review flags this date for extra caution.'
            : 'AI 보강에서는 이 날짜를 주의 구간으로 봅니다.'
        )
      }
      if (aiNotes.length === 0) {
        return item
      }
      return {
        ...item,
        recommendations: auspiciousDateSet.has(item.date)
          ? [...item.recommendations, ...aiNotes]
          : item.recommendations,
        warnings: cautionDateSet.has(item.date) ? [...item.warnings, ...aiNotes] : item.warnings,
        summary: [item.summary, ...aiNotes].join(' '),
      }
    })
    const sortByDisplayScoreDesc = (
      a: (typeof formattedDates)[number],
      b: (typeof formattedDates)[number]
    ) => (b.displayScore ?? b.score) - (a.displayScore ?? a.score)
    const sortByDisplayScoreAsc = (
      a: (typeof formattedDates)[number],
      b: (typeof formattedDates)[number]
    ) => (a.displayScore ?? a.score) - (b.displayScore ?? b.score)

    // Group by the final display grade so API summaries match what the UI actually shows.
    const gradeGroups: Record<number, typeof formattedDates> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
    }
    for (const d of formattedDates) {
      const effectiveGrade = d.displayGrade ?? d.grade
      if (effectiveGrade >= 0 && effectiveGrade <= 4) {
        gradeGroups[effectiveGrade].push(d)
      }
    }
    const grade0 = gradeGroups[0] // 천운의 날
    const grade1 = gradeGroups[1] // 아주 좋은 날
    const grade2 = gradeGroups[2] // 좋은 날
    const grade3 = gradeGroups[3] // 보통 날
    const grade4 = gradeGroups[4] // 최악의 날

    // AI 날짜 병합
    let aiEnhanced = false
    if (aiDates) {
      aiEnhanced = true
    }

    const presentationDomainMap = {
      career: 'career',
      study: 'career',
      love: 'love',
      relationship: 'love',
      wealth: 'money',
      money: 'money',
      health: 'health',
      travel: 'move',
      move: 'move',
    } as const

    const presentationView = buildCalendarPresentationView({
      allDates: formattedDates,
      locale: locale === 'en' ? 'en' : 'ko',
      timeZone: timezone,
      canonicalCore: calendarCoreCanonical || undefined,
      preferredFocusDomain: category
        ? presentationDomainMap[category as keyof typeof presentationDomainMap]
        : undefined,
      matrixContract: calendarMatrixContract,
      dataQuality: calendarCoreDataQuality || undefined,
      timingCalibration: matrixCalendarContext?.timingCalibration,
      overlapTimelineByDomain: matrixCalendarContext?.overlapTimelineByDomain,
      domainScores: matrixCalendarContext?.domainScores,
    })

    const { persistDestinyPredictionSnapshot } =
      await import('@/lib/destiny-matrix/predictionSnapshot')
    const predictionId = await persistDestinyPredictionSnapshot({
      userId: context.userId,
      service: 'calendar',
      lang: locale === 'en' ? 'en' : 'ko',
      theme: category || 'yearly',
      focusDomain:
        mapCoreSignalDomainToCalendarDomain(calendarCoreCanonical?.focusDomain) || undefined,
      actionFocusDomain:
        mapCoreSignalDomainToCalendarDomain(calendarCoreCanonical?.actionFocusDomain) || undefined,
      phase: calendarCoreCanonical?.phase,
      phaseLabel: calendarCoreCanonical?.phaseLabel,
      topDecisionId: calendarCoreCanonical?.topDecisionId || undefined,
      topDecisionAction: calendarCoreCanonical?.topDecisionAction || undefined,
      topDecisionLabel: calendarCoreCanonical?.topDecisionLabel || undefined,
      timingWindow: calendarCoreCanonical?.domainTimingWindows?.[0]?.window,
      timingGranularity: calendarCoreCanonical?.domainTimingWindows?.[0]?.timingGranularity,
      precisionReason: calendarCoreCanonical?.domainTimingWindows?.[0]?.precisionReason,
      timingConflictMode: calendarCoreCanonical?.domainTimingWindows?.[0]?.timingConflictMode,
      timingConflictNarrative:
        calendarCoreCanonical?.domainTimingWindows?.[0]?.timingConflictNarrative,
      readinessScore: calendarCoreCanonical?.domainTimingWindows?.[0]?.readinessScore,
      triggerScore: calendarCoreCanonical?.domainTimingWindows?.[0]?.triggerScore,
      convergenceScore: calendarCoreCanonical?.domainTimingWindows?.[0]?.convergenceScore,
      timingReliabilityScore: null,
      timingReliabilityBand: null,
      predictionClaim:
        typeof presentationView.daySummary === 'string'
          ? presentationView.daySummary
          : presentationView.daySummary.summary,
    })

    const responsePayload = normalizeMojibakePayload({
      success: true,
      predictionId,
      type: 'yearly',
      year,
      aiEnhanced,
      matrixStrictMode: true,
      matrixContract: calendarMatrixContract,
      canonicalCore: calendarCoreCanonical,
      birthInfo: {
        date: birthDateParam,
        time: birthTimeParam,
        place: birthPlace,
      },
      summary: {
        total: formattedDates.length,
        grade0: grade0.length, // 천운의 날
        grade1: grade1.length, // 아주 좋은 날
        grade2: grade2.length, // 좋은 날
        grade3: grade3.length, // 보통 날
        grade4: grade4.length, // 최악의 날
      },
      topDates: (() => {
        // grade0 + grade1 + grade2가 부족하면 grade3 중 높은 점수 날짜도 포함
        const topCandidates = [...grade0, ...grade1, ...grade2]
        if (topCandidates.length < 5) {
          const topGrade3 = grade3.sort(sortByDisplayScoreDesc).slice(0, 5 - topCandidates.length)
          topCandidates.push(...topGrade3)
        }
        return topCandidates.sort(sortByDisplayScoreDesc).slice(0, 10)
      })(),
      goodDates: [...grade1, ...grade2].sort(sortByDisplayScoreDesc).slice(0, 20),
      badDates: [...grade4, ...grade3].sort(sortByDisplayScoreAsc).slice(0, 10),
      worstDates: [...grade4].sort(sortByDisplayScoreAsc).slice(0, 5),
      allDates: formattedDates,
      daySummary: presentationView.daySummary,
      weekSummary: presentationView.weekSummary,
      monthSummary: presentationView.monthSummary,
      surfaceCards: presentationView.surfaceCards,
      topDomains: presentationView.topDomains,
      timingSignals: presentationView.timingSignals,
      cautions: presentationView.cautions,
      recommendedActions: presentationView.recommendedActions,
      relationshipWeather: presentationView.relationshipWeather,
      workMoneyWeather: presentationView.workMoneyWeather,
      matrixInputCoverage,
      matrixEvidencePackets: responseMatrixEvidencePackets,
      topMatchedPatterns,
      ...(aiDates && {
        aiInsights: {
          auspicious: aiDates.auspicious,
          caution: aiDates.caution,
        },
      }),
    })
    const res = NextResponse.json(responsePayload)

    // Cache for 1 hour - calendar data is deterministic for the same birthDate/year
    res.headers.set('Cache-Control', 'private, max-age=3600, stale-while-revalidate=1800')
    return res
  },
  createSimpleGuard({
    route: 'calendar',
    limit: 30,
    windowSeconds: 60,
  })
)
