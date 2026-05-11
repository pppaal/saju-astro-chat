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
import { BRANCH_TO_ELEMENT, STEM_TO_ELEMENT, STEM_TO_ELEMENT_EN } from '@/lib/Saju/foundation/constants'
import type { FiveElement } from '@/lib/Saju/foundation/types'
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
  rebalanceCalendarDisplayGrades,
  LOCATION_COORDS,
  type MatrixCalendarContext,
} from './lib/helpers'
import { buildCalendarPresentationView } from './lib/presentationAdapter'
import type { DomainKey, MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import type { CalendarMatrixEvidencePacketMap } from './lib/matrixEvidencePacket'
import type { NatalChartData } from '@/lib/astrology/foundation/astrologyService'
import { buildDerivedCrossSnapshot } from '@/app/api/destiny-matrix/ai-report/routeDerivedContext'

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

type CalendarAstroProfile = {
  sunSign: string
  sunElement: string
  birthMonth?: number
  birthDay?: number
  inputMode?: 'full-chart' | 'lite'
  natalChart?:
    | {
        planets?: Array<{
          name?: string
          sign?: string
          degree?: number
          house?: number
          retrograde?: boolean
        }>
        houses?: Array<{ index?: number; sign?: string; cusp?: number; formatted?: string }>
      }
    | NatalChartData
    | null
  transitChart?: {
    planets?: Array<{
      name?: string
      sign?: string
      degree?: number
      house?: number
      retrograde?: boolean
    }>
  } | null
  natalAspects?: Array<{
    from?: { name?: string }
    to?: { name?: string }
    type?: string
    orb?: number
  }>
  transitAspects?: Array<{
    transitPlanet?: string
    natalPoint?: string
    type?: string
    orb?: number
  }>
  majorTransits?: Array<{
    transitPlanet?: string
    natalPoint?: string
    type?: string
    orb?: number
  }>
}

const MATRIX_PLANET_NAMES = new Set<keyof MatrixCalculationInput['planetSigns']>([
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
])

const MATRIX_ASPECT_TYPES = new Set<NonNullable<MatrixCalculationInput['aspects']>[number]['type']>(
  [
    'conjunction',
    'sextile',
    'square',
    'trine',
    'opposition',
    'semisextile',
    'quincunx',
    'quintile',
    'biquintile',
  ]
)

function isMatrixPlanetName(
  value: string | undefined
): value is NonNullable<MatrixCalculationInput['aspects']>[number]['planet1'] {
  return Boolean(
    value && MATRIX_PLANET_NAMES.has(value as keyof MatrixCalculationInput['planetSigns'])
  )
}

function isMatrixAspectType(
  value: string | undefined
): value is NonNullable<MatrixCalculationInput['aspects']>[number]['type'] {
  return Boolean(
    value &&
    MATRIX_ASPECT_TYPES.has(value as NonNullable<MatrixCalculationInput['aspects']>[number]['type'])
  )
}

function clampHouseNumber(
  value: number | undefined
):
  | MatrixCalculationInput['planetHouses'][keyof MatrixCalculationInput['planetHouses']]
  | undefined {
  if (typeof value !== 'number' || !Number.isInteger(value)) return undefined
  if (value < 1 || value > 12) return undefined
  return value as MatrixCalculationInput['planetHouses'][keyof MatrixCalculationInput['planetHouses']]
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

function buildActiveTransitCycles(
  astroProfile: CalendarAstroProfile
): NonNullable<MatrixCalculationInput['activeTransits']> {
  const cycles = new Set<NonNullable<MatrixCalculationInput['activeTransits']>[number]>()
  for (const aspect of astroProfile.majorTransits || []) {
    if (aspect.transitPlanet === 'Saturn' && aspect.natalPoint === 'Saturn')
      cycles.add('saturnReturn')
    if (aspect.transitPlanet === 'Jupiter' && aspect.natalPoint === 'Jupiter')
      cycles.add('jupiterReturn')
    if (aspect.transitPlanet === 'Uranus' && aspect.type === 'square') cycles.add('uranusSquare')
    if (aspect.transitPlanet === 'Neptune' && aspect.type === 'square') cycles.add('neptuneSquare')
    if (aspect.transitPlanet === 'Pluto') cycles.add('plutoTransit')
  }

  for (const planet of astroProfile.transitChart?.planets || []) {
    if (!planet?.retrograde) continue
    if (planet.name === 'Mercury') cycles.add('mercuryRetrograde')
    if (planet.name === 'Venus') cycles.add('venusRetrograde')
    if (planet.name === 'Mars') cycles.add('marsRetrograde')
    if (planet.name === 'Jupiter') cycles.add('jupiterRetrograde')
    if (planet.name === 'Saturn') cycles.add('saturnRetrograde')
  }

  return [...cycles]
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
  astroProfile: CalendarAstroProfile
  enrichedSlots?: {
    sibsinDistribution: MatrixCalculationInput['sibsinDistribution']
    twelveStages: MatrixCalculationInput['twelveStages']
    relations: MatrixCalculationInput['relations']
    shinsalList: MatrixCalculationInput['shinsalList']
    geokguk: MatrixCalculationInput['geokguk']
    yongsin: MatrixCalculationInput['yongsin']
    asteroidHouses: MatrixCalculationInput['asteroidHouses']
    extraPointSigns: MatrixCalculationInput['extraPointSigns']
    advancedAstroSignals: NonNullable<MatrixCalculationInput['advancedAstroSignals']>
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

  const currentDateIso = `${params.year}-01-01T12:00:00`
  const dominantWesternElement = ZODIAC_TO_WESTERN_ELEMENT[astroProfile.sunSign] || 'fire'

  const planetHouses: MatrixCalculationInput['planetHouses'] = {}
  const planetSigns: MatrixCalculationInput['planetSigns'] = {}
  for (const planet of astroProfile.natalChart?.planets || []) {
    if (!isMatrixPlanetName(planet?.name)) continue
    const house = clampHouseNumber(planet.house)
    if (house) planetHouses[planet.name] = house
    if (planet.sign && MATRIX_PLANET_NAMES.has(planet.name)) {
      planetSigns[planet.name] =
        planet.sign as MatrixCalculationInput['planetSigns'][typeof planet.name]
    }
  }

  if (!planetSigns.Sun) {
    planetSigns.Sun = astroProfile.sunSign as MatrixCalculationInput['planetSigns']['Sun']
  }
  if (!planetSigns.Moon) {
    planetSigns.Moon = astroProfile.sunSign as MatrixCalculationInput['planetSigns']['Moon']
  }

  const aspects: MatrixCalculationInput['aspects'] = (astroProfile.natalAspects || [])
    .map((aspect) => {
      const planet1 = aspect.from?.name
      const planet2 = aspect.to?.name
      const type = aspect.type
      if (
        !isMatrixPlanetName(planet1) ||
        !isMatrixPlanetName(planet2) ||
        !isMatrixAspectType(type)
      ) {
        return null
      }
      return {
        planet1,
        planet2,
        type,
        orb: typeof aspect.orb === 'number' ? aspect.orb : undefined,
      }
    })
    .filter(isDefined)

  const activeTransits = buildActiveTransitCycles(astroProfile)

  const enriched = params.enrichedSlots
  const asteroidHouses: MatrixCalculationInput['asteroidHouses'] = enriched?.asteroidHouses ?? {}
  const extraPointSigns: MatrixCalculationInput['extraPointSigns'] = enriched?.extraPointSigns ?? {}
  const advancedAstroSignals: NonNullable<MatrixCalculationInput['advancedAstroSignals']> =
    enriched?.advancedAstroSignals ?? {
      progressions: false,
      solarReturn: false,
      lunarReturn: false,
      draconic: false,
      harmonics: false,
      fixedStars: false,
      eclipses: false,
      midpoints: false,
      asteroids: Boolean(Object.keys(asteroidHouses).length),
      extraPoints: Boolean(Object.keys(extraPointSigns).length),
    }

  const baseMatrixInput: MatrixCalculationInput = {
    dayMasterElement,
    pillarElements,
    sibsinDistribution: enriched?.sibsinDistribution ?? {},
    twelveStages: enriched?.twelveStages ?? {},
    relations: enriched?.relations ?? [],
    currentDaeunElement,
    currentIljinElement: currentDaeunElement || dayMasterElement,
    currentIljinDate: currentDateIso,
    shinsalList: enriched?.shinsalList ?? [],
    geokguk: enriched?.geokguk,
    yongsin: enriched?.yongsin,
    dominantWesternElement,
    planetHouses,
    planetSigns,
    aspects,
    activeTransits,
    asteroidHouses,
    extraPointSigns,
    advancedAstroSignals,
    sajuSnapshot: params.sajuResult,
    astrologySnapshot: {
      natalChart: astroProfile.natalChart || undefined,
      natalAspects: astroProfile.natalAspects || undefined,
      currentTransits: {
        asOfIso: currentDateIso,
        majorTransits: astroProfile.majorTransits || undefined,
      },
      transits: astroProfile.transitAspects || undefined,
      advancedCoverage: {
        inputMode: astroProfile.inputMode || 'lite',
        hasNatalChart: Boolean(astroProfile.natalChart),
        hasTransitChart: Boolean(astroProfile.transitChart),
        natalAspectCount: astroProfile.natalAspects?.length || 0,
        transitAspectCount: astroProfile.transitAspects?.length || 0,
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
  return {
    ...baseMatrixInput,
    crossSnapshot: buildDerivedCrossSnapshot(
      baseMatrixInput as unknown as Record<string, unknown>,
      {
        source: 'calendar-route',
        theme: params.category || 'yearly',
        category: params.category || 'yearly',
      }
    ),
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

    const sajuProfile: {
      dayMaster: string
      dayMasterElement: string
      dayBranch: string
      birthYear: number
      yearBranch: string
      daeunCycles: typeof daeunCycles
      daeunsu: number
      pillars: typeof pillars
      yongsin?: {
        primary: string
        secondary?: string
        type: string
        kibsin?: string
      }
      geokguk?: { type: string; strength: string }
    } = {
      dayMaster: dayMasterStem,
      dayMasterElement,
      dayBranch: pillars.day.branch,
      birthYear: birthDate.getFullYear(),
      yearBranch: pillars.year.branch,
      daeunCycles,
      daeunsu: sajuResult.daeWoon?.startAge ?? 0,
      pillars,
    }

    // Canonical 사주 정통 격국·용신 분석. date-detail 엔드포인트는 이미
    // 동일한 호출을 하지만 main calendar route는 sajuProfile에
    // yongsin/geokguk을 안 넣어서 365일 score ladder의 용신 정렬 가중치가
    // 죽어 있었음. 이제 main에서도 채워줌.
    try {
      const { analyzeAdvancedSaju } = await import('@/lib/Saju/foundation/advancedSajuAnalysis')
      const advanced = analyzeAdvancedSaju(
        {
          name: dayMasterStem,
          element: dayMasterElement,
          yin_yang: ['甲', '丙', '戊', '庚', '壬'].includes(dayMasterStem) ? '양' : '음',
        } as Parameters<typeof analyzeAdvancedSaju>[0],
        {
          yearPillar: sajuResult.yearPillar,
          monthPillar: sajuResult.monthPillar,
          dayPillar: sajuResult.dayPillar,
          timePillar: sajuResult.timePillar,
        } as Parameters<typeof analyzeAdvancedSaju>[1],
      )
      const primaryYongsin = String(advanced.yongsin.primary || '')
      const yongsinType = String(advanced.yongsin.basis || '')
      if (primaryYongsin && yongsinType) {
        const kibsin = (advanced.yongsin.unfavorable || []).join('·')
        sajuProfile.yongsin = {
          primary: primaryYongsin,
          secondary: advanced.yongsin.secondary
            ? String(advanced.yongsin.secondary)
            : undefined,
          type: yongsinType,
          kibsin: kibsin || undefined,
        }
      }
      const geokgukType = String(advanced.geokguk.type || '')
      const strengthLevel = String(advanced.strength.level || '')
      if (geokgukType && strengthLevel) {
        sajuProfile.geokguk = {
          type: geokgukType,
          strength: strengthLevel,
        }
      }
    } catch (err) {
      logger.warn('[calendar] canonical advanced saju analysis failed', {
        error: err instanceof Error ? err.message : String(err),
      })
    }

    const sunSign = deriveFallbackSunSign(birthDate)
    const astroProfile: CalendarAstroProfile = {
      sunSign,
      sunElement: ZODIAC_TO_ELEMENT[sunSign] || 'fire',
      birthMonth: birthDate.getMonth() + 1,
      birthDay: birthDate.getDate(),
      inputMode: 'lite',
    }
    const degradationReasons: string[] = []
    const matrixDegradationReasons: string[] = []

    try {
      const birthHour = Number.parseInt((birthTimeParam || '12:00').split(':')[0] || '12', 10)
      const birthMinute = Number.parseInt((birthTimeParam || '12:00').split(':')[1] || '0', 10)
      const [
        { calculateNatalChart, toChart },
        { calculateTransitChart, findMajorTransits, findTransitAspects },
        { findNatalAspects },
      ] = await Promise.all([
        import('@/lib/astrology/foundation/astrologyService'),
        import('@/lib/astrology/foundation/transit'),
        import('@/lib/astrology/foundation/aspects'),
      ])

      const natalChartData = await calculateNatalChart({
        year: birthDate.getFullYear(),
        month: birthDate.getMonth() + 1,
        date: birthDate.getDate(),
        hour: Number.isFinite(birthHour) ? birthHour : 12,
        minute: Number.isFinite(birthMinute) ? birthMinute : 0,
        latitude: coords.lat,
        longitude: coords.lng,
        timeZone: timezone,
      })
      const natalChart = toChart(natalChartData)
      const transitChart = await calculateTransitChart({
        iso: `${year}-01-01T12:00:00`,
        latitude: coords.lat,
        longitude: coords.lng,
        timeZone: timezone,
      })
      const natalAspects = findNatalAspects(natalChart)
      const transitAspects = findTransitAspects(transitChart, natalChart)
      const majorTransits = findMajorTransits(transitChart, natalChart)

      astroProfile.sunSign =
        natalChart.planets.find((planet) => planet.name === 'Sun')?.sign || sunSign
      astroProfile.sunElement = ZODIAC_TO_ELEMENT[astroProfile.sunSign] || astroProfile.sunElement
      astroProfile.inputMode = 'full-chart'
      astroProfile.natalChart = natalChartData
      astroProfile.transitChart = transitChart
      astroProfile.natalAspects = natalAspects
      astroProfile.transitAspects = transitAspects
      astroProfile.majorTransits = majorTransits

      // ── Full-year transit scores ──
      // Compute longitude-only transit aspects for all 365 days against
      // the user's natal chart. ~350ms total (Swiss ephemeris is fast
      // enough for batch). Results threaded into lite generator as a new
      // dailyTransitScores axis.
      try {
        const { calculateTransitPlanetsBatch, scoreTransitDay } = await import(
          '@/lib/astrology/foundation/transitBatch'
        )
        const isoList: string[] = []
        const dateKeys: string[] = []
        const yearStart = new Date(year, 0, 1)
        const yearEnd = new Date(year, 11, 31)
        for (let d = new Date(yearStart); d <= yearEnd; d.setDate(d.getDate() + 1)) {
          const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          dateKeys.push(ymd)
          isoList.push(`${ymd}T12:00:00`)
        }
        const batch = calculateTransitPlanetsBatch(isoList, timezone)
        const natalLongs: Record<string, number> = {}
        for (const p of natalChartData.planets || []) natalLongs[p.name] = p.longitude
        if (natalChartData.ascendant) natalLongs['Ascendant'] = natalChartData.ascendant.longitude
        if (natalChartData.mc) natalLongs['MC'] = natalChartData.mc.longitude
        const dailyTransitScores: Record<string, number> = {}
        const dailyTransitTightest: Record<
          string,
          Array<{ transitPlanet: string; natalPoint: string; aspect: string; orb: number }>
        > = {}
        const dailyRetrograde: Record<string, string[]> = {}
        for (let i = 0; i < batch.length; i++) {
          const result = scoreTransitDay(natalLongs, batch[i])
          dailyTransitScores[dateKeys[i]] = result.score
          dailyTransitTightest[dateKeys[i]] = result.tightest
          const rxs = batch[i].planets.filter((p) => p.retrograde).map((p) => p.name)
          if (rxs.length > 0) dailyRetrograde[dateKeys[i]] = rxs
        }
        ;(astroProfile as { dailyTransitScores?: Record<string, number> }).dailyTransitScores =
          dailyTransitScores
        ;(
          astroProfile as {
            dailyTransitTightest?: Record<
              string,
              Array<{ transitPlanet: string; natalPoint: string; aspect: string; orb: number }>
            >
          }
        ).dailyTransitTightest = dailyTransitTightest
        ;(astroProfile as { dailyRetrograde?: Record<string, string[]> }).dailyRetrograde =
          dailyRetrograde
      } catch (batchError) {
        logger.warn('[calendar] full-year transit batch failed', {
          error: batchError instanceof Error ? batchError.message : String(batchError),
        })
      }

      // ── Advanced astro layers (Eclipse / Profection / SR / LR / Lots) ──
      // fusion/astroLayers 가 모든 점성 raw 데이터 수집 — 12달 호출해서
      // 점성 활용률을 30% → 95% 끌어올림. 결과는 daily modifier 로 변환.
      try {
        const { getAstroLayersForDate } = await import('@/lib/astrology/astroLayers')
        const ageAtYear = year - birthDate.getFullYear()
        const dailyAstroAdvanced: Record<string, number> = {}

        for (let m = 1; m <= 12; m++) {
          const monthLayers = await getAstroLayersForDate({
            natal: natalChart,
            natalInput: {
              year: birthDate.getFullYear(),
              month: birthDate.getMonth() + 1,
              date: birthDate.getDate(),
              hour: Number.isFinite(birthHour) ? birthHour : 12,
              minute: Number.isFinite(birthMinute) ? birthMinute : 0,
              latitude: coords.lat,
              longitude: coords.lng,
              timeZone: timezone,
            },
            age: ageAtYear,
            year,
            month: m,
          })

          // Eclipse: 해당 달 모든 날에 강한 modifier
          const eclipses = monthLayers.raw.eclipses ?? []
          const daysInMonth = new Date(year, m, 0).getDate()
          for (const ecl of eclipses) {
            // eclipse 날짜와 가까울수록 강함 (±3일 -15, ±7일 -8)
            const eclDate = new Date(ecl.date)
            for (let d = 1; d <= daysInMonth; d++) {
              const dt = new Date(year, m - 1, d)
              const diffDays = Math.abs((dt.getTime() - eclDate.getTime()) / 86400000)
              if (diffDays <= 7) {
                const key = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                const impact = diffDays <= 3 ? -15 : -8
                dailyAstroAdvanced[key] = (dailyAstroAdvanced[key] ?? 0) + impact
              }
            }
          }

          // Profection: 해당 해 전체 — 6궁(건강 부담)/12궁(은둔) 약함, 10궁(성공) 강함
          if (monthLayers.raw.profection) {
            const profHouse = monthLayers.raw.profection.activatedHouse
            const profBonus =
              profHouse === 10 ? 6 :    // 성공·명예
              profHouse === 11 ? 5 :    // 사회·재물
              profHouse === 5  ? 4 :    // 연애·창조
              profHouse === 1  ? 3 :    // 자기·건강
              profHouse === 4  ? 2 :    // 가정
              profHouse === 6  ? -4 :   // 일·질병
              profHouse === 12 ? -5 :   // 은둔·고립
              profHouse === 8  ? -3 :   // 위기·변환
              0
            for (let d = 1; d <= daysInMonth; d++) {
              const key = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
              dailyAstroAdvanced[key] = (dailyAstroAdvanced[key] ?? 0) + profBonus
            }
          }

          // Lunar Return: 해당 달 angular benefic — 가벼운 boost
          if (monthLayers.raw.lunarReturn) {
            const angularBenefics = monthLayers.raw.lunarReturn.planets.filter(
              (p) => [1, 4, 7, 10].includes(p.house) && ['Venus', 'Jupiter'].includes(p.name),
            ).length
            const angularMalefics = monthLayers.raw.lunarReturn.planets.filter(
              (p) => [1, 4, 7, 10].includes(p.house) && ['Mars', 'Saturn'].includes(p.name),
            ).length
            const lrBonus = angularBenefics * 3 - angularMalefics * 3
            if (lrBonus !== 0) {
              for (let d = 1; d <= daysInMonth; d++) {
                const key = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                dailyAstroAdvanced[key] = (dailyAstroAdvanced[key] ?? 0) + lrBonus
              }
            }
          }
        }

        // Solar Return: 해 전체 — angular benefic 강한 boost
        try {
          const { calculateSolarReturn } = await import('@/lib/astrology/foundation/returns')
          const sr = await calculateSolarReturn({
            natal: {
              year: birthDate.getFullYear(),
              month: birthDate.getMonth() + 1,
              date: birthDate.getDate(),
              hour: Number.isFinite(birthHour) ? birthHour : 12,
              minute: Number.isFinite(birthMinute) ? birthMinute : 0,
              latitude: coords.lat,
              longitude: coords.lng,
              timeZone: timezone,
            },
            year,
          })
          const srAngBenefic = sr.planets.filter(
            (p) => [1, 4, 7, 10].includes(p.house) && ['Venus', 'Jupiter'].includes(p.name),
          ).length
          const srAngMalefic = sr.planets.filter(
            (p) => [1, 4, 7, 10].includes(p.house) && ['Mars', 'Saturn'].includes(p.name),
          ).length
          const srBonus = srAngBenefic * 2 - srAngMalefic * 2
          if (srBonus !== 0) {
            for (const k of Object.keys(dailyAstroAdvanced)) {
              dailyAstroAdvanced[k] += srBonus
            }
            // SR 만 적용된 날 (modifier 없는 날) 도 채움
            for (let m = 1; m <= 12; m++) {
              const daysInMonth = new Date(year, m, 0).getDate()
              for (let d = 1; d <= daysInMonth; d++) {
                const key = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                if (dailyAstroAdvanced[key] === undefined) dailyAstroAdvanced[key] = srBonus
              }
            }
          }
        } catch { /* skip */ }

        // 결과를 -20..+20 으로 clamp
        for (const k of Object.keys(dailyAstroAdvanced)) {
          dailyAstroAdvanced[k] = Math.max(-20, Math.min(20, dailyAstroAdvanced[k]))
        }
        ;(astroProfile as { dailyAstroAdvanced?: Record<string, number> }).dailyAstroAdvanced =
          dailyAstroAdvanced
      } catch (advError) {
        logger.warn('[calendar] advanced astro layers failed', {
          error: advError instanceof Error ? advError.message : String(advError),
        })
      }
    } catch (astroError) {
      degradationReasons.push('astrology_input_lite')
      matrixDegradationReasons.push('astrology_input_lite')
      logger.warn('[Calendar] full astrology input unavailable; using lite astrology profile', {
        error: astroError instanceof Error ? astroError.message : String(astroError),
      })
    }

    let matrixCalendarContext: MatrixCalendarContext = null
    let crossFortune:
      | Awaited<ReturnType<typeof import('@/lib/fortune/cross-rules').runFortune>>
      | null = null
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

    let matrixEngineAvailable = false

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

      // 🔥 교차 룰 엔진 (5106 라인) — 사주×점성 클래식 패턴 + 격국·용신·신살
      // ·dignity·stellium·sect·lots·triplicity·profection·planetary joys·
      // bonification·cazimi·zodiacal releasing 등 모든 정통 신호를 한 번에
      // 컴퓨팅. 이전엔 cross-augment endpoint에서만 호출했는데, 메인 라우트
      // 응답에도 포함시켜서 UI/리포트/매트릭스가 같은 결과를 공유하게 함.
      try {
        const { runFortune } = await import('@/lib/fortune/cross-rules')
        crossFortune = await runFortune({
          birth: {
            birthDate: birthDateParam,
            birthTime: birthTimeParam || '12:00',
            gender: gender.toLowerCase() === 'female' ? 'female' : 'male',
            timezone,
            latitude: coords.lat,
            longitude: coords.lng,
          },
          skipReturns: true,
        })
      } catch (crossErr) {
        logger.warn('[calendar] cross-rules engine failed', {
          error: crossErr instanceof Error ? crossErr.message : String(crossErr),
        })
      }

      // Compute the saju + astro advanced slots (sibsin / 12운성 / 신살 /
      // 격국 / 용신 + asteroids / extra points / advanced engine flags) so
      // the matrix isn't fed empty arrays. This mirrors what the saju route
      // and chat-stream counselor already do.
      const { enrichSajuMatrixSlots, enrichAstroMatrixSlots } = await import(
        '@/lib/destiny-matrix/matrixInputEnricher'
      )
      let enrichedSlots: Parameters<typeof buildCalendarMatrixInput>[0]['enrichedSlots']
      try {
        const sajuSlots = enrichSajuMatrixSlots(
          sajuResult as unknown as Parameters<typeof enrichSajuMatrixSlots>[0],
        )
        const astroSlots = await enrichAstroMatrixSlots({
          natalChartData: (astroProfile.natalChart as Parameters<typeof enrichAstroMatrixSlots>[0]['natalChartData']) || null,
          birthYear: sajuProfile.birthYear,
        })
        enrichedSlots = { ...sajuSlots, ...astroSlots }
      } catch (enrichErr) {
        logger.warn('[calendar] matrix enrichment failed', {
          error: enrichErr instanceof Error ? enrichErr.message : String(enrichErr),
        })
      }

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
        enrichedSlots,
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
      matrixEngineAvailable = true
    } catch (matrixError) {
      degradationReasons.push('matrix_core_unavailable')
      matrixDegradationReasons.push('matrix_core_unavailable')
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
          birthDate: birthDateParam,
          dailyTransitScores: (astroProfile as { dailyTransitScores?: Record<string, number> })
            .dailyTransitScores,
          dailyTransitTightest: (
            astroProfile as {
              dailyTransitTightest?: Record<
                string,
                Array<{ transitPlanet: string; natalPoint: string; aspect: string; orb: number }>
              >
            }
          ).dailyTransitTightest,
          dailyRetrograde: (astroProfile as { dailyRetrograde?: Record<string, string[]> })
            .dailyRetrograde,
          dailyAstroAdvanced: (
            astroProfile as { dailyAstroAdvanced?: Record<string, number> }
          ).dailyAstroAdvanced,
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
        sun: {
          sign:
            astroProfile.natalChart?.planets?.find((planet) => planet?.name === 'Sun')?.sign ||
            astroProfile.sunSign,
          degree:
            Number(
              astroProfile.natalChart?.planets?.find((planet) => planet?.name === 'Sun')?.degree
            ) || 15,
        },
        moon: {
          sign:
            astroProfile.natalChart?.planets?.find((planet) => planet?.name === 'Moon')?.sign ||
            astroProfile.sunSign,
          degree:
            Number(
              astroProfile.natalChart?.planets?.find((planet) => planet?.name === 'Moon')?.degree
            ) || 15,
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
      degradationReasons.push('ai_enrichment_unavailable')
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
    const formattedDatesWithAI = formattedDatesBase.map((item) => {
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
    const formattedDates = rebalanceCalendarDisplayGrades(formattedDatesWithAI)
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
    const degradationReasonSet = [...new Set(degradationReasons)]
    const matrixDegradationReasonSet = [...new Set(matrixDegradationReasons)]
    const matrixInputMode = astroProfile.inputMode === 'full-chart' ? 'full-chart' : 'lite'
    const degradedMode = {
      active: degradationReasonSet.length > 0,
      level: !matrixEngineAvailable
        ? ('fallback-lite' as const)
        : degradationReasonSet.length > 0
          ? ('engine-degraded' as const)
          : ('full-engine' as const),
      reasons: degradationReasonSet,
      labels:
        locale === 'en'
          ? degradationReasonSet.map((reason) => {
              switch (reason) {
                case 'astrology_input_lite':
                  return 'Using lite astrology input instead of full natal/transit chart data.'
                case 'matrix_core_unavailable':
                  return 'Destiny matrix core is unavailable; lightweight calendar fallback is active.'
                case 'ai_enrichment_unavailable':
                  return 'AI date enrichment is unavailable; local rules are being used.'
                default:
                  return reason
              }
            })
          : degradationReasonSet.map((reason) => {
              switch (reason) {
                case 'astrology_input_lite':
                  return '풀 natal/transit 차트 대신 lite 점성 입력으로 계산했습니다.'
                case 'matrix_core_unavailable':
                  return 'destiny-matrix core를 사용할 수 없어 경량 캘린더 fallback으로 동작했습니다.'
                case 'ai_enrichment_unavailable':
                  return 'AI 날짜 보강을 사용할 수 없어 로컬 규칙으로 계산했습니다.'
                default:
                  return reason
              }
            }),
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
      matrixStrictMode: matrixEngineAvailable && matrixDegradationReasonSet.length === 0,
      matrixInputMode,
      degradedMode,
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
      calendarDailyView: presentationView.dailyView,
      calendarWeekView: presentationView.weekView,
      calendarMonthView: presentationView.monthView,
      surfaceCards: presentationView.surfaceCards,
      topDomains: presentationView.topDomains,
      timingSignals: presentationView.timingSignals,
      cautions: presentationView.cautions,
      recommendedActions: presentationView.recommendedActions,
      relationshipWeather: presentationView.relationshipWeather,
      workMoneyWeather: presentationView.workMoneyWeather,
      matrixInputCoverage,
      matrixEvidencePackets: responseMatrixEvidencePackets,
      // 교차 엔진 풀 결과 — UI 어디서든 동일한 정통 패턴 신호 사용 가능.
      crossFortune: crossFortune
        ? {
            byDomain: crossFortune.byDomain,
            themes: crossFortune.themes.map((t) => ({
              id: t.rule.id,
              meaning: t.rule.meaning,
              narrative: t.rule.narrative,
            })),
            context: crossFortune.context,
          }
        : null,
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
