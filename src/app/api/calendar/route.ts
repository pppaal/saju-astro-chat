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
import { BRANCH_TO_ELEMENT, STEM_TO_ELEMENT, STEM_TO_ELEMENT_EN } from '@/lib/saju/constants'
import type { FiveElement } from '@/lib/saju/types'
import koTranslations from '@/i18n/locales/ko'
import enTranslations from '@/i18n/locales/en'
import type { TranslationData } from '@/types/calendar-api'
import { logger } from '@/lib/logger'
import { cacheOrCalculate, CacheKeys, CACHE_TTL } from '@/lib/cache/redis-cache'
import { calendarMainQuerySchema, createValidationErrorResponse } from '@/lib/api/zodValidation'
import { calculateYearlyImportantDates } from './lib/yearlyDates'
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
import { calculateAllAsteroids } from '@/lib/astrology/foundation/asteroids'
import { calculateExtraPoints } from '@/lib/astrology/foundation/extraPoints'
import {
  buildDerivedCrossSnapshot,
  deriveAdvancedSajuMatrixFields,
  deriveSibsinDistributionFromSaju,
} from '@/lib/destiny-matrix/derived'
import type { CalculateSajuDataResult } from '@/lib/saju/types'
import { buildOrthodoxInterpretation } from '@/lib/saju/orthodoxInterpretation'

export const dynamic = 'force-dynamic'

import { LIMITS } from '@/lib/validation/patterns'
import { normalizeMojibakePayload } from '@/lib/text/mojibake'
// HTTP_STATUS not used directly, status codes used via createErrorResponse
const _VALID_CALENDAR_PLACES = new Set(Object.keys(LOCATION_COORDS))
const MAX_PLACE_LEN = LIMITS.PLACE

/** astroProfile.natalChart가 NatalChartData 모양인지 검사 (calendar-engine v2 augmentation 용) */
function isNatalChartData(chart: unknown): chart is NatalChartData {
  if (!chart || typeof chart !== 'object') return false
  const c = chart as { planets?: unknown; ascendant?: unknown; mc?: unknown }
  if (!Array.isArray(c.planets) || c.planets.length === 0) return false
  const firstPlanet = c.planets[0] as { longitude?: unknown }
  return typeof firstPlanet?.longitude === 'number'
}

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

async function buildCalendarMatrixInput(params: {
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
}): Promise<MatrixCalculationInput> {
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

  const asteroidHouses: MatrixCalculationInput['asteroidHouses'] = {}
  const extraPointSigns: MatrixCalculationInput['extraPointSigns'] = {}

  // L9 / L10 inputs: when the full natal chart is available, compute the
  // four major asteroids and the four extra points so layers 9 (asteroid
  // × house) and 10 (extra-point × element) populate per-user.
  const fullNatal = astroProfile.natalChart as NatalChartData | undefined
  if (fullNatal && fullNatal.meta?.jdUT && Array.isArray(fullNatal.houses)) {
    try {
      const houseCusps = fullNatal.houses
        .map((h) => h.cusp)
        .filter((c): c is number => typeof c === 'number')
      if (houseCusps.length === 12) {
        const asteroids = calculateAllAsteroids(fullNatal.meta.jdUT, houseCusps)
        const setH = (name: string, h: number | undefined) => {
          if (typeof h === 'number' && h >= 1 && h <= 12) {
            ;(asteroidHouses as Record<string, number>)[name] = h
          }
        }
        setH('Ceres', asteroids.Ceres?.house)
        setH('Pallas', asteroids.Pallas?.house)
        setH('Juno', asteroids.Juno?.house)
        setH('Vesta', asteroids.Vesta?.house)

        const sunPlanet = fullNatal.planets.find((p) => p.name === 'Sun')
        const moonPlanet = fullNatal.planets.find((p) => p.name === 'Moon')
        const ascLon = fullNatal.ascendant?.longitude
        if (
          sunPlanet &&
          moonPlanet &&
          typeof ascLon === 'number' &&
          typeof sunPlanet.longitude === 'number' &&
          typeof moonPlanet.longitude === 'number' &&
          typeof sunPlanet.house === 'number'
        ) {
          const ep = await calculateExtraPoints(
            fullNatal.meta.jdUT,
            params.latitude,
            params.longitude,
            ascLon,
            sunPlanet.longitude,
            moonPlanet.longitude,
            sunPlanet.house,
            houseCusps
          )
          const setSign = (
            name: 'Vertex' | 'PartOfFortune' | 'Chiron' | 'Lilith',
            sign: string | undefined
          ) => {
            if (sign) {
              ;(extraPointSigns as Record<string, string>)[name] = sign
            }
          }
          setSign('Vertex', ep.vertex?.sign)
          setSign('PartOfFortune', ep.partOfFortune?.sign)
          setSign('Chiron', ep.chiron?.sign)
          setSign('Lilith', ep.lilith?.sign)
        }
      }
    } catch {
      // Asteroid / extra-point derivation is non-fatal.
    }
  }
  const advancedAstroSignals: NonNullable<MatrixCalculationInput['advancedAstroSignals']> = {
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

  // Derive sibsin / 12-stages / relations / shinsal / saeun / wolun / iljin
  // from the full saju calculation result so layers 2/3/4/5/6/8 fire for
  // every user instead of being silently empty.
  const sajuFull = params.sajuResult as unknown as CalculateSajuDataResult
  let derivedSibsin: Record<string, number> = {}
  let derivedTwelveStages: Record<string, number> = {}
  let derivedRelations: MatrixCalculationInput['relations'] = []
  let derivedShinsal: NonNullable<MatrixCalculationInput['shinsalList']> = []
  let derivedSaeunElement: MatrixCalculationInput['currentSaeunElement']
  let derivedWolunElement: MatrixCalculationInput['currentWolunElement']
  let derivedIljinElement: MatrixCalculationInput['currentIljinElement']
  try {
    derivedSibsin = deriveSibsinDistributionFromSaju(sajuFull)
    const adv = deriveAdvancedSajuMatrixFields(sajuFull)
    derivedTwelveStages = (adv.twelveStages || {}) as Record<string, number>
    derivedRelations = (adv.relations || []) as MatrixCalculationInput['relations']
    derivedShinsal = (adv.shinsalList || []) as NonNullable<MatrixCalculationInput['shinsalList']>
    const ELEMENT_MAP: Record<string, MatrixCalculationInput['dayMasterElement']> = {
      목: '목',
      화: '화',
      토: '토',
      금: '금',
      수: '수',
    }
    const annualNow = (sajuFull.unse?.annual || []).find((row) => row.year === params.year)
    const annualEl = (annualNow as { element?: string } | undefined)?.element
    if (annualEl && ELEMENT_MAP[annualEl]) derivedSaeunElement = ELEMENT_MAP[annualEl]
    const monthlyNow = (sajuFull.unse?.monthly || []).find(
      (row) => row.year === params.year && row.month === new Date().getMonth() + 1
    )
    const monthlyEl = (monthlyNow as { element?: string } | undefined)?.element
    if (monthlyEl && ELEMENT_MAP[monthlyEl]) derivedWolunElement = ELEMENT_MAP[monthlyEl]
    derivedIljinElement = currentDaeunElement || dayMasterElement
  } catch {
    // Derivation failures are non-fatal; matrix runs with whatever we have.
  }

  const baseMatrixInput: MatrixCalculationInput = {
    dayMasterElement,
    pillarElements,
    sibsinDistribution: derivedSibsin as MatrixCalculationInput['sibsinDistribution'],
    twelveStages: derivedTwelveStages as MatrixCalculationInput['twelveStages'],
    relations: derivedRelations,
    currentDaeunElement,
    currentSaeunElement: derivedSaeunElement,
    currentWolunElement: derivedWolunElement,
    currentIljinElement: derivedIljinElement || currentDaeunElement || dayMasterElement,
    currentIljinDate: currentDateIso,
    shinsalList: derivedShinsal,
    dominantWesternElement,
    planetHouses,
    planetSigns,
    aspects,
    activeTransits,
    asteroidHouses,
    extraPointSigns,
    advancedAstroSignals,
    sajuSnapshot: (() => {
      // Augment the saju snapshot with the orthodox interpretation so
      // calendar consumers (matrix evidence, AI prompt) see pillar
      // positions, stem combinations, same-element pillars, and the
      // aggregated advanced analyses.
      const koreanAge = new Date().getFullYear() - new Date(params.birthDate).getFullYear() + 1
      try {
        const orthodox = buildOrthodoxInterpretation(sajuFull, { koreanAge })
        return {
          ...(params.sajuResult as Record<string, unknown>),
          orthodoxInterpretation: orthodox,
        }
      } catch {
        return params.sajuResult
      }
    })(),
    astrologySnapshot: {
      natalChart: astroProfile.natalChart || undefined,
      natalAspects: astroProfile.natalAspects || undefined,
      currentTransits: {
        asOfIso: currentDateIso,
        majorTransits: astroProfile.majorTransits || undefined,
      },
      transits: astroProfile.transitAspects || undefined,
      advancedCoverage: {
        inputMode: 'full-chart',
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
      const { calculateSajuData } = await import('@/lib/saju/saju')
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

    // ── Today's hourly precision time slots (for the daily view's
    // time-of-day card). Cheap (~24 hour-level evaluations against the
    // user's day master); computed once per yearly request.
    let todayHourlyTimeSlots:
      | {
          best: Array<{ hour: number; score: number; reason: string }>
          worst: Array<{ hour: number; score: number; reason: string }>
        }
      | undefined
    try {
      const { analyzeDayTimeSlots } = await import('@/lib/calendar-engine/timing-helpers/ultra-precision-minute')
      const slots = analyzeDayTimeSlots(new Date(), pillars.day.stem, pillars.day.branch)
      if (slots.best.length > 0 || slots.worst.length > 0) {
        todayHourlyTimeSlots = {
          best: slots.best.slice(0, 4),
          worst: slots.worst.slice(0, 2),
        }
      }
    } catch (err) {
      logger.warn('[calendar] today hourly time slots skipped', {
        error: err instanceof Error ? err.message : String(err),
      })
    }

    const sunSign = deriveFallbackSunSign(birthDate)
    const astroProfile: CalendarAstroProfile = {
      sunSign,
      sunElement: ZODIAC_TO_ELEMENT[sunSign] || 'fire',
      birthMonth: birthDate.getMonth() + 1,
      birthDay: birthDate.getDate(),
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
      astroProfile.natalChart = natalChartData
      astroProfile.transitChart = transitChart
      astroProfile.natalAspects = natalAspects
      astroProfile.transitAspects = transitAspects
      astroProfile.majorTransits = majorTransits

      // ── Full-year transit scores ──
      // Compute longitude-only transit aspects for all 365 days against
      // the user's natal chart. ~350ms total (Swiss ephemeris is fast
      // enough for batch). Results threaded into engine as a new
      // dailyTransitScores axis.
      try {
        const { calculateTransitPlanetsBatch, scoreTransitDay } =
          await import('@/lib/astrology/foundation/transitBatch')
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
    } catch (astroError) {
      logger.error('[Calendar] full astrology input failed', {
        error: astroError instanceof Error ? astroError.message : String(astroError),
      })
      throw astroError
    }

    let matrixCalendarContext: MatrixCalendarContext = null
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
        { ensureMatrixInputCrossCompleteness },
        { deriveCalendarSignals },
        { buildCounselorEvidencePacket },
      ] = await Promise.all([
        import('@/lib/destiny-matrix/core/buildCalendarCoreEnvelope'),
        import('@/lib/destiny-matrix/core/adapters'),
        import('@/lib/destiny-matrix/inputCross'),
        import('@/lib/destiny-matrix/calendarSignals'),
        import('@/lib/destiny-matrix/counselorEvidence'),
      ])

      const matrixInput = await buildCalendarMatrixInput({
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
      // matrixInputCoverage + topMatchedPatterns used to be computed here
      // and returned in the response, but no UI consumer ever reads them.
      // Dropped the compute + response surface; if a future client needs
      // either, fish it back out of engineEnvelope.coreSeed.
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
        calculateYearlyImportantDates(year, sajuProfile, astroProfile, {
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

    // AI date enrichment was wired up in v1 to call /api/theme/important-dates
    // and decorate dates with AI-flagged auspicious/caution markers; the
    // backing route never shipped (or was retired), so fetchAIDates has
    // returned null on every prod call since. Dropped the whole branch.
    const formatCalendarDate = (d: (typeof matrixRegradedDates)[number]) =>
      formatDateForResponse(
        d,
        locale,
        koTranslations as unknown as TranslationData,
        enTranslations as unknown as TranslationData,
        matrixCalendarContext,
        matrixEvidencePackets || undefined,
      )

    const formattedDatesBase = matrixRegradedDates.map((d) => formatCalendarDate(d))
    const formattedDates = rebalanceCalendarDisplayGrades(formattedDatesBase)

    // ── calendar-engine v2 augmentation (non-blocking, opt-in via fields) ──
    // 새 신호 엔진 호출 → matchedPatterns / engineSignals / themeScores 부착.
    // 실패해도 기존 응답 그대로 반환. UI는 새 필드 없으면 기존 동작 유지.
    try {
      const { buildNatalContext } = await import('@/lib/calendar-engine/context/build')
      // 본명 차트 재사용 — 기존 엔진이 이미 계산했다면 Swiss Ephemeris 재호출 방지.
      // astroProfile.natalChart가 있으면 그것 전달 (없으면 buildNatalContext가 직접 계산).
      const ceNatal = await buildNatalContext(
        {
          birthDate: birthDateParam,
          birthTime: birthTimeParam || '12:00',
          gender: gender.toLowerCase() === 'female' ? 'female' : 'male',
          latitude: coords.lat,
          longitude: coords.lng,
          timeZone: timezone,
        },
        {
          saju: sajuResult,
          // astroProfile.natalChart는 NatalChartData | null | 느슨한 shape의 union.
          // NatalChartData만 buildNatalContext에 전달 (그 외엔 직접 계산하게 함).
          astroChart: isNatalChartData(astroProfile.natalChart)
            ? astroProfile.natalChart
            : undefined,
        },
      )
      // 사용자가 보고 있는 달만 빌드 — 1년 365일 다 돌리면 너무 비쌈.
      // 엔진 자체는 1년 능력 유지 (range만 좁힘). 클라가 ?month=YYYY-MM 보내면 그 달,
      // 안 보내면 오늘의 달.
      // 3-month window: 사용자가 prev/next 한 번 누르면 그 달이 이미 계산돼 있음.
      // 1년치 다 빌드하면 비싸고, 1달만 빌드하면 prev/next 갈 때 fallback score 봄.
      // ±1달이 trade-off 가장 좋음.
      const monthParam = searchParams.get('month')
      const monthMatch = monthParam?.match(/^(\d{4})-(\d{1,2})$/)
      const targetYear = monthMatch ? Number(monthMatch[1]) : year
      const targetMonth = monthMatch ? Number(monthMatch[2]) - 1 : new Date().getMonth()

      const { getOrBuildMonth, makeBirthKey } = await import('@/lib/calendar-engine/cell-cache')
      const birthKey = makeBirthKey({
        birthDate: birthDateParam,
        birthTime: birthTimeParam || '12:00',
        birthPlace,
        gender: gender || 'Male',
      })

      // 빌드 대상 3달: [prev, current, next]. 같은 본명·달이면 cell-cache에서 instant.
      const monthsToBuild = [-1, 0, 1].map((offset) => {
        const d = new Date(targetYear, targetMonth + offset, 1)
        return {
          year: d.getFullYear(),
          month: d.getMonth(),
          monthKey: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          rangeStart: d,
          rangeEnd: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
        }
      })

      const allCells: typeof ceCells = []
      let ceCells: Awaited<ReturnType<typeof getOrBuildMonth>>['cells'] = []
      for (const m of monthsToBuild) {
        const { cells, cached } = await getOrBuildMonth({
          birthKey,
          monthKey: m.monthKey,
          natal: ceNatal,
          range: {
            start: m.rangeStart.toISOString(),
            end: m.rangeEnd.toISOString(),
            granularity: 'day',
          },
          options: { includeEvidence: true },
        })
        logger.info?.(`[calendar-engine v2] ${cached ? 'cache HIT' : 'cache MISS'} for ${m.monthKey}, cells=${cells.length}`)
        allCells.push(...cells)
        if (m.month === targetMonth && m.year === targetYear) {
          ceCells = cells // narrative는 current month 기준
        }
      }

      // 그 달 narrative 생성 (룰 DB 기반, LLM 0번 호출)
      try {
        const { buildInterpretation } = await import('@/lib/calendar-engine/interpretation')
        const interp = buildInterpretation({ natal: ceNatal, cells: ceCells, scope: 'monthly' })
        ;(formattedDates as unknown as { __interpretation?: unknown }).__interpretation = undefined
        // interpretation은 그 달 전체 단위라 셀별 부착 X.
        // 모든 셀에 동일 narrative 부착 — 클라가 어느 날짜든 같은 텍스트 사용.
        for (const d of formattedDates) {
          d.monthlyInterpretation = interp
        }
      } catch (err) {
        logger.warn?.('[interpretation] skipped:', err instanceof Error ? err.message : String(err))
      }

      // 3달 모든 cell을 date 키로 — prev/next month 이동해도 그 달 displayScore/
      // engineSignals 부착됨 (현재 달만 부착하면 다른 달은 fallback yearlyDates.score).
      const cellByDate = new Map(allCells.map((c) => [c.datetime.slice(0, 10), c]))
      for (const d of formattedDates) {
        const cell = cellByDate.get(d.date.slice(0, 10))
        if (!cell) continue
        // ★ 점수 교체 — 새 엔진 점수를 displayScore로 우선 노출
        //   기존 score는 그대로 유지 (rollback 가능).
        d.displayScore = cell.derivedScore
        if (cell.matchedPatterns.length > 0) {
          d.matchedPatterns = cell.matchedPatterns.map((p) => ({
            id: p.id,
            name: p.name,
            themes: p.themes,
            strength: p.strength,
            description: p.description,
            headline: p.headline,
            action: p.action,
          }))
        }
        if (cell.signals.length > 0) {
          d.engineSignals = cell.signals.map((s) => ({
            id: s.id,
            source: s.source,
            kind: s.kind,
            name: s.name,
            korean: s.korean,
            themes: s.themes,
            polarity: s.polarity,
            layer: s.layer,
            weight: s.weight,
          }))
        }
        if (Object.keys(cell.themeScores).length > 0) {
          d.themeScores = cell.themeScores
        }
      }
    } catch (err) {
      logger.warn?.('[calendar-engine v2 augment] skipped:', err instanceof Error ? err.message : String(err))
    }

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

    const degradationReasonSet = [...new Set(degradationReasons)]
    const matrixDegradationReasonSet = [...new Set(matrixDegradationReasons)]
    const matrixInputMode = 'full-chart' as const
    const degradedMode = {
      active: degradationReasonSet.length > 0,
      level:
        degradationReasonSet.length > 0 ? ('engine-degraded' as const) : ('full-engine' as const),
      reasons: degradationReasonSet,
      labels:
        locale === 'en'
          ? degradationReasonSet.map((reason) => {
              switch (reason) {
                case 'matrix_core_unavailable':
                  return 'Destiny matrix core is unavailable.'
                case 'ai_enrichment_unavailable':
                  return 'AI date enrichment is unavailable; local rules are being used.'
                default:
                  return reason
              }
            })
          : degradationReasonSet.map((reason) => {
              switch (reason) {
                case 'matrix_core_unavailable':
                  return 'destiny-matrix core를 사용할 수 없습니다.'
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
      matrixStrictMode: matrixEngineAvailable && matrixDegradationReasonSet.length === 0,
      matrixInputMode,
      degradedMode,
      matrixContract: calendarMatrixContract,
      canonicalCore: calendarCoreCanonical,
      todayHourlyTimeSlots,
      // 헤더 뱃지 / 프로필 카드용 본명 정체성
      astroIdentity: (() => {
        const sunSign = astroProfile.sunSign
        const natal = astroProfile.natalChart as
          | { ascendant?: { sign?: string }; planets?: Array<{ name?: string; sign?: string }> }
          | null
          | undefined
        const ascendantSign = natal?.ascendant?.sign
        const moonSign = natal?.planets?.find((p) => p?.name === 'Moon')?.sign
        return {
          sunSign,
          ascendantSign: ascendantSign || undefined,
          moonSign: moonSign || undefined,
        }
      })(),
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
      monthSummary: presentationView.monthSummary,
      calendarDailyView: presentationView.dailyView,
      calendarMonthView: presentationView.monthView,
      timingSignals: presentationView.timingSignals,
      cautions: presentationView.cautions,
      recommendedActions: presentationView.recommendedActions,
      relationshipWeather: presentationView.relationshipWeather,
      workMoneyWeather: presentationView.workMoneyWeather,
      matrixEvidencePackets: responseMatrixEvidencePackets,
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
