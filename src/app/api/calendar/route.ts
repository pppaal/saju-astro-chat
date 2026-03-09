/**
 * Destiny Calendar API
 * Saju + Astrology fused yearly important dates
 * AI-assisted calculations (optional backend)
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  withApiMiddleware,
  createPublicStreamGuard,
  extractLocale,
  type ApiContext,
} from '@/lib/api/middleware'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { calculateYearlyImportantDates } from '@/lib/destiny-map/destinyCalendar'
import { calculateSajuData } from '@/lib/Saju/saju'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/Saju/relations'
import { getShinsalHits, getTwelveStagesForPillars, toSajuPillarsLike } from '@/lib/Saju/shinsal'
import { calculateNatalChart } from '@/lib/astrology/foundation/astrologyService'
import { findNatalAspects } from '@/lib/astrology/foundation/aspects'
import { toChart } from '@/lib/astrology/foundation/astrologyService'
import { STEM_TO_ELEMENT_EN as STEM_TO_ELEMENT, BRANCH_TO_ELEMENT_EN } from '@/lib/Saju/constants'
import { calculateDestinyMatrix } from '@/lib/destiny-matrix'
import type { FiveElement } from '@/lib/Saju/types'
import type { MatrixCalculationInput, PlanetName } from '@/lib/destiny-matrix/types'
import { analyzeAdvancedSaju } from '@/lib/Saju/astrologyengine'
import { getRetrogradePlanetsForDate } from '@/lib/destiny-map/calendar/astrology/retrograde'
import {
  buildNormalizedMatrixInput,
  runDestinyCore,
} from '@/lib/destiny-matrix/core/runDestinyCore'
import { reportGenerator } from '@/lib/destiny-matrix/interpreter'
import {
  buildCounselorEvidencePacket,
  type CounselorEvidencePacket,
} from '@/lib/destiny-matrix/counselorEvidence'
import koTranslations from '@/i18n/locales/ko'
import enTranslations from '@/i18n/locales/en'
import type { TranslationData } from '@/types/calendar-api'
import { logger } from '@/lib/logger'
import { cacheOrCalculate, CacheKeys, CACHE_TTL } from '@/lib/cache/redis-cache'
import { calendarMainQuerySchema, createValidationErrorResponse } from '@/lib/api/zodValidation'
import type { MatrixCalendarContext } from './lib/helpers'

// Import from extracted modules
import {
  getPillarStemName,
  getPillarBranchName,
  parseBirthDate,
  applyMatrixPreformatRegrade,
  formatDateForResponse,
  fetchAIDates,
  LOCATION_COORDS,
} from './lib'

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

const EN_TO_KO_ELEMENT: Record<string, FiveElement> = {
  wood: '\uBAA9',
  fire: '\uD654',
  earth: '\uD1A0',
  metal: '\uAE08',
  water: '\uC218',
}

const MAJOR_PLANETS: readonly PlanetName[] = [
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
]

const MAJOR_PLANET_SET = new Set<string>(MAJOR_PLANETS)

const MATRIX_SHINSAL_KIND_SET = new Set<NonNullable<MatrixCalculationInput['shinsalList']>[number]>(
  [
    '천을귀인',
    '태극귀인',
    '천덕귀인',
    '월덕귀인',
    '문창귀인',
    '학당귀인',
    '금여록',
    '천주귀인',
    '암록',
    '건록',
    '제왕',
    '도화',
    '홍염살',
    '양인',
    '백호',
    '겁살',
    '재살',
    '천살',
    '지살',
    '년살',
    '월살',
    '망신',
    '고신',
    '괴강',
    '현침',
    '귀문관',
    '병부',
    '효신살',
    '상문살',
    '역마',
    '화개',
    '장성',
    '반안',
    '천라지망',
    '공망',
    '삼재',
    '원진',
  ]
)

const SHINSAL_KIND_ALIASES: Record<
  string,
  NonNullable<MatrixCalculationInput['shinsalList']>[number]
> = {
  문창: '문창귀인',
  학당귀인: '학당귀인',
  금여성: '금여록',
  금여록: '금여록',
  공망살: '공망',
  홍염: '홍염살',
}

const TRANSIT_CYCLE_SET = new Set<NonNullable<MatrixCalculationInput['activeTransits']>[number]>([
  'saturnReturn',
  'jupiterReturn',
  'uranusSquare',
  'neptuneSquare',
  'plutoTransit',
  'nodeReturn',
  'eclipse',
  'mercuryRetrograde',
  'venusRetrograde',
  'marsRetrograde',
  'jupiterRetrograde',
  'saturnRetrograde',
])

const CALENDAR_PACKET_THEME_BY_KEY: Record<
  string,
  'career' | 'love' | 'wealth' | 'health' | 'today'
> = {
  career: 'career',
  study: 'career',
  love: 'love',
  relationship: 'love',
  wealth: 'wealth',
  money: 'wealth',
  health: 'health',
  travel: 'today',
  move: 'today',
  general: 'today',
  today: 'today',
}

function buildCalendarEvidencePacketMap(input: {
  lang: 'ko' | 'en'
  matrixInput: MatrixCalculationInput
  matrixReport: ReturnType<typeof reportGenerator.generateReport>
  matrixSummary: ReturnType<typeof calculateDestinyMatrix>['summary']
  coreSeed: ReturnType<typeof runDestinyCore>
  birthDate?: string
}): Record<string, CounselorEvidencePacket> {
  const cache = new Map<string, CounselorEvidencePacket>()
  const out: Record<string, CounselorEvidencePacket> = {}

  for (const [key, theme] of Object.entries(CALENDAR_PACKET_THEME_BY_KEY)) {
    let packet = cache.get(theme)
    if (!packet) {
      packet = buildCounselorEvidencePacket({
        theme,
        lang: input.lang,
        matrixInput: input.matrixInput,
        matrixReport: input.matrixReport,
        matrixSummary: input.matrixSummary,
        signalSynthesis: input.coreSeed.signalSynthesis,
        strategyEngine: input.coreSeed.strategyEngine,
        birthDate: input.birthDate,
      })
      cache.set(theme, packet)
    }
    out[key] = packet
  }

  return out
}

function normalizeShinsalKind(
  raw: unknown
): NonNullable<MatrixCalculationInput['shinsalList']>[number] | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  const aliased = SHINSAL_KIND_ALIASES[trimmed] || trimmed
  if (
    !MATRIX_SHINSAL_KIND_SET.has(
      aliased as NonNullable<MatrixCalculationInput['shinsalList']>[number]
    )
  ) {
    return null
  }
  return aliased as NonNullable<MatrixCalculationInput['shinsalList']>[number]
}

function toDatePartsInTimeZone(
  date: Date,
  timeZone: string
): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const getPart = (type: 'year' | 'month' | 'day') =>
    Number(parts.find((part) => part.type === type)?.value ?? '0')

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
  }
}

function calculateAgeAtDate(birthDate: string, targetDate: Date, timeZone: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate.trim())
  if (!match) return 0
  const birthYear = Number(match[1])
  const birthMonth = Number(match[2])
  const birthDay = Number(match[3])
  const { year, month, day } = toDatePartsInTimeZone(targetDate, timeZone)

  let age = year - birthYear
  if (month < birthMonth || (month === birthMonth && day < birthDay)) age -= 1
  return Math.max(0, age)
}

function inferLifecycleTransitCyclesForCalendar(
  age: number
): NonNullable<MatrixCalculationInput['activeTransits']> {
  const out = new Set<NonNullable<MatrixCalculationInput['activeTransits']>[number]>()
  const withinOneYear = (value: number, target: number) => Math.abs(value - target) <= 1

  for (let trigger = 12; trigger <= 96; trigger += 12) {
    if (withinOneYear(age, trigger)) {
      out.add('jupiterReturn')
      break
    }
  }
  for (const trigger of [29, 58, 87]) {
    if (withinOneYear(age, trigger)) {
      out.add('saturnReturn')
      break
    }
  }
  for (const trigger of [21, 42, 63]) {
    if (withinOneYear(age, trigger)) {
      out.add('uranusSquare')
      break
    }
  }
  for (const trigger of [41, 82]) {
    if (withinOneYear(age, trigger)) {
      out.add('neptuneSquare')
      break
    }
  }
  for (const trigger of [18, 37, 56, 74]) {
    if (withinOneYear(age, trigger)) {
      out.add('nodeReturn')
      break
    }
  }
  if (age >= 36 && age <= 44) out.add('plutoTransit')
  return [...out]
}

function inferRetrogradeTransitCyclesForCalendar(
  targetDate: Date
): NonNullable<MatrixCalculationInput['activeTransits']> {
  const retrogrades = getRetrogradePlanetsForDate(targetDate)
  const map: Record<string, NonNullable<MatrixCalculationInput['activeTransits']>[number]> = {
    mercury: 'mercuryRetrograde',
    venus: 'venusRetrograde',
    mars: 'marsRetrograde',
    jupiter: 'jupiterRetrograde',
    saturn: 'saturnRetrograde',
  }

  const out = new Set<NonNullable<MatrixCalculationInput['activeTransits']>[number]>()
  for (const planet of retrogrades) {
    const cycle = map[planet]
    if (cycle && TRANSIT_CYCLE_SET.has(cycle)) out.add(cycle)
  }
  return [...out]
}

function toTwelveStageCounts(
  stageMap: ReturnType<typeof getTwelveStagesForPillars>
): MatrixCalculationInput['twelveStages'] {
  return Object.values(stageMap).reduce<Record<string, number>>((acc, stage) => {
    acc[stage] = (acc[stage] || 0) + 1
    return acc
  }, {})
}

const ASPECT_ANGLE_MAP: Record<
  | 'conjunction'
  | 'opposition'
  | 'trine'
  | 'square'
  | 'sextile'
  | 'quincunx'
  | 'semisextile'
  | 'quintile'
  | 'biquintile',
  number
> = {
  conjunction: 0,
  opposition: 180,
  trine: 120,
  square: 90,
  sextile: 60,
  quincunx: 150,
  semisextile: 30,
  quintile: 72,
  biquintile: 144,
}

const CALENDAR_STRICT_ASTROLOGY =
  process.env.NODE_ENV !== 'test' && process.env.CALENDAR_STRICT_ASTROLOGY !== 'false'
const CALENDAR_STRICT_MATRIX =
  process.env.NODE_ENV !== 'test' && process.env.CALENDAR_STRICT_MATRIX !== 'false'
// AI enrichment should be best-effort by default.
// Enable strict failure only when explicitly opted in.
const CALENDAR_STRICT_AI_ENRICHMENT =
  process.env.NODE_ENV !== 'test' && process.env.CALENDAR_STRICT_AI_ENRICHMENT === 'true'

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

function toOptionalRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

function toKoElement(value?: string): FiveElement | undefined {
  if (!value) return undefined
  const direct: FiveElement[] = ['\uBAA9', '\uD654', '\uD1A0', '\uAE08', '\uC218']
  if (direct.includes(value as FiveElement)) return value as FiveElement
  return EN_TO_KO_ELEMENT[value]
}

function collectCalendarMatrixMissing(input: MatrixCalculationInput): string[] {
  const missing: string[] = []
  if (!input.sajuSnapshot || Object.keys(input.sajuSnapshot).length === 0)
    missing.push('sajuSnapshot')
  if (!input.astrologySnapshot || Object.keys(input.astrologySnapshot).length === 0)
    missing.push('astrologySnapshot')
  if (!input.crossSnapshot || Object.keys(input.crossSnapshot).length === 0)
    missing.push('crossSnapshot')
  if (!input.currentDaeunElement) missing.push('currentDaeunElement')
  if (!input.currentSaeunElement) missing.push('currentSaeunElement')
  if (!input.planetSigns || Object.keys(input.planetSigns).length === 0) missing.push('planetSigns')
  if (!input.planetHouses || Object.keys(input.planetHouses).length === 0)
    missing.push('planetHouses')
  if (!Array.isArray(input.aspects) || input.aspects.length === 0) missing.push('aspects')
  return missing
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
  async (request: NextRequest, _context: ApiContext) => {
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
    const dayMasterElement = STEM_TO_ELEMENT[dayMasterStem] || 'wood'

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

    // 정확한 점성술 계산 (Swiss Ephemeris 사용)
    const [birthHour, birthMinute] = birthTimeParam.split(':').map(Number)
    let astroProfile
    let natalChartData: Awaited<ReturnType<typeof calculateNatalChart>> | null = null
    let natalAspectData: ReturnType<typeof findNatalAspects> = []
    try {
      const natalChart = await calculateNatalChart({
        year: birthDate.getFullYear(),
        month: birthDate.getMonth() + 1,
        date: birthDate.getDate(),
        hour: birthHour || 12,
        minute: birthMinute || 0,
        latitude: coords.lat,
        longitude: coords.lng,
        timeZone: timezone,
      })
      natalChartData = natalChart
      natalAspectData = findNatalAspects(toChart(natalChart), {
        includeMinor: true,
        maxResults: 60,
      })

      // 태양 정보 추출
      const sunPlanet = natalChart.planets.find((p) => p.name === 'Sun')
      const sunSign = sunPlanet?.sign || 'Aries'
      const sunLongitude = sunPlanet?.longitude || 0

      astroProfile = {
        sunSign,
        sunElement: ZODIAC_TO_ELEMENT[sunSign] || 'fire',
        sunLongitude,
        birthMonth: birthDate.getMonth() + 1,
        birthDay: birthDate.getDate(),
      }
    } catch (astroError) {
      if (CALENDAR_STRICT_ASTROLOGY) {
        logger.error('[Calendar] Astrology calculation failed (strict mode):', astroError)
        return createErrorResponse({
          code: ErrorCodes.SERVICE_UNAVAILABLE,
          message: 'Advanced astrology calculation unavailable',
          locale: extractLocale(request),
          route: 'calendar',
          originalError: astroError instanceof Error ? astroError : new Error(String(astroError)),
        })
      }
      logger.warn('[Calendar] Astrology calculation fallback:', astroError)
      const sunSign = deriveFallbackSunSign(birthDate)
      astroProfile = {
        sunSign,
        sunElement: ZODIAC_TO_ELEMENT[sunSign] || 'fire',
        birthMonth: birthDate.getMonth() + 1,
        birthDay: birthDate.getDate(),
      }
    }

    let matrixCalendarContext: MatrixCalendarContext = null
    let matrixInputCoverage: Record<string, unknown> | null = null
    let matrixEvidencePackets: Record<string, CounselorEvidencePacket> | null = null
    let topMatchedPatterns: Array<{
      id: string
      label: string
      score: number
      confidence: number
      domains: string[]
      activationReason: string
    }> = []
    try {
      const stemElements = [
        pillars.year.stem,
        pillars.month.stem,
        pillars.day.stem,
        pillars.hour.stem,
      ]
        .map((stem) => STEM_TO_ELEMENT[stem])
        .filter((el): el is string => Boolean(el))

      const branchElements = [
        pillars.year.branch,
        pillars.month.branch,
        pillars.day.branch,
        pillars.hour.branch,
      ]
        .map((branch) => BRANCH_TO_ELEMENT_EN[branch])
        .filter((el): el is string => Boolean(el))

      const pillarElements = [...stemElements, ...branchElements]
        .map((el) => EN_TO_KO_ELEMENT[el])
        .filter((el): el is FiveElement => Boolean(el))

      const dayMasterElementKo = EN_TO_KO_ELEMENT[dayMasterElement] || '\uBAA9'
      const sibsinDistribution: Record<string, number> = {}
      const pillarRows = [
        sajuResult.yearPillar,
        sajuResult.monthPillar,
        sajuResult.dayPillar,
        sajuResult.timePillar,
      ]
      for (const row of pillarRows) {
        const cheon = row?.heavenlyStem?.sibsin
        const ji = row?.earthlyBranch?.sibsin
        if (typeof cheon === 'string' && cheon.trim().length > 0) {
          sibsinDistribution[cheon] = (sibsinDistribution[cheon] || 0) + 1
        }
        if (typeof ji === 'string' && ji.trim().length > 0) {
          sibsinDistribution[ji] = (sibsinDistribution[ji] || 0) + 1
        }
      }

      const advanced = analyzeAdvancedSaju(
        {
          name: sajuResult.dayPillar.heavenlyStem.name,
          element: sajuResult.dayPillar.heavenlyStem.element,
          yin_yang: sajuResult.dayPillar.heavenlyStem.yin_yang || '\uC591',
        },
        {
          yearPillar: sajuResult.yearPillar,
          monthPillar: sajuResult.monthPillar,
          dayPillar: sajuResult.dayPillar,
          timePillar: sajuResult.timePillar,
        }
      )

      const planetHouses: Partial<
        Record<PlanetName, MatrixCalculationInput['planetHouses'][PlanetName]>
      > = {}
      const planetSigns: Partial<
        Record<PlanetName, MatrixCalculationInput['planetSigns'][PlanetName]>
      > = {}
      if (natalChartData) {
        for (const p of natalChartData.planets) {
          if (!MAJOR_PLANET_SET.has(p.name)) continue
          const planet = p.name as PlanetName
          if (typeof p.house === 'number' && p.house >= 1 && p.house <= 12) {
            planetHouses[planet] = p.house as MatrixCalculationInput['planetHouses'][PlanetName]
          }
          if (typeof p.sign === 'string' && p.sign.length > 0) {
            planetSigns[planet] = p.sign as MatrixCalculationInput['planetSigns'][PlanetName]
          }
        }
      }

      const aspects = natalAspectData
        .filter((a) => MAJOR_PLANET_SET.has(a.from.name) && MAJOR_PLANET_SET.has(a.to.name))
        .map((a) => ({
          planet1: a.from.name as PlanetName,
          planet2: a.to.name as PlanetName,
          type: a.type,
          orb: typeof a.orb === 'number' ? a.orb : undefined,
          angle: ASPECT_ANGLE_MAP[a.type],
        }))

      const currentDaeunElement = toKoElement(
        STEM_TO_ELEMENT[sajuResult.daeWoon?.current?.heavenlyStem || '']
      )
      const currentSaeunElement = toKoElement(sajuResult.unse?.annual?.[0]?.element)
      const now = new Date()
      const age = calculateAgeAtDate(birthDateParam, now, timezone)
      const activeTransits = Array.from(
        new Set<NonNullable<MatrixCalculationInput['activeTransits']>[number]>([
          ...inferLifecycleTransitCyclesForCalendar(age),
          ...inferRetrogradeTransitCyclesForCalendar(now),
        ])
      )

      let relations: MatrixCalculationInput['relations'] = []
      let twelveStages: MatrixCalculationInput['twelveStages'] = {}
      let shinsalList: NonNullable<MatrixCalculationInput['shinsalList']> = []
      try {
        const hasCompletePillars =
          Boolean(sajuResult?.yearPillar?.heavenlyStem?.name) &&
          Boolean(sajuResult?.monthPillar?.heavenlyStem?.name) &&
          Boolean(sajuResult?.dayPillar?.heavenlyStem?.name) &&
          Boolean(sajuResult?.timePillar?.heavenlyStem?.name) &&
          Boolean(sajuResult?.yearPillar?.earthlyBranch?.name) &&
          Boolean(sajuResult?.monthPillar?.earthlyBranch?.name) &&
          Boolean(sajuResult?.dayPillar?.earthlyBranch?.name) &&
          Boolean(sajuResult?.timePillar?.earthlyBranch?.name)

        if (hasCompletePillars) {
          const relationInput = toAnalyzeInputFromSaju(
            {
              year: sajuResult.yearPillar,
              month: sajuResult.monthPillar,
              day: sajuResult.dayPillar,
              time: sajuResult.timePillar,
            },
            sajuResult.dayPillar.heavenlyStem.name
          )
          relations = analyzeRelations(relationInput)

          const pillarsLike = toSajuPillarsLike({
            yearPillar: sajuResult.yearPillar,
            monthPillar: sajuResult.monthPillar,
            dayPillar: sajuResult.dayPillar,
            timePillar: sajuResult.timePillar,
          })
          twelveStages = toTwelveStageCounts(getTwelveStagesForPillars(pillarsLike))

          const shinsalHits = getShinsalHits(pillarsLike, {
            includeTwelveAll: true,
            includeGeneralShinsal: true,
            includeLuckyDetails: true,
            ruleSet: 'standard',
          })
          shinsalList = Array.from(
            new Set(
              shinsalHits
                .map((hit) => normalizeShinsalKind(hit.kind))
                .filter(
                  (kind): kind is NonNullable<MatrixCalculationInput['shinsalList']>[number] =>
                    Boolean(kind)
                )
            )
          )
        }
      } catch (sajuSignalError) {
        logger.warn('[Calendar] Failed to derive saju signals for matrix input', sajuSignalError)
      }

      const matrixInput: MatrixCalculationInput = {
        dayMasterElement: dayMasterElementKo,
        pillarElements,
        sibsinDistribution,
        twelveStages,
        relations,
        geokguk: advanced.geokguk.type as MatrixCalculationInput['geokguk'],
        yongsin: advanced.yongsin.primary,
        currentDaeunElement,
        currentSaeunElement,
        shinsalList,
        dominantWesternElement:
          astroProfile.sunElement === 'air' ||
          astroProfile.sunElement === 'fire' ||
          astroProfile.sunElement === 'earth' ||
          astroProfile.sunElement === 'water'
            ? astroProfile.sunElement
            : undefined,
        planetHouses,
        planetSigns,
        aspects,
        activeTransits,
        sajuSnapshot: toOptionalRecord(sajuResult),
        astrologySnapshot: natalChartData
          ? ({
              natalChart: natalChartData,
              natalAspects: natalAspectData,
            } as Record<string, unknown>)
          : undefined,
        crossSnapshot: {
          source: 'calendar-route',
          category: category || null,
        },
        currentDateIso: new Date().toISOString().slice(0, 10),
        profileContext: {
          birthDate: birthDateParam,
          birthTime: birthTimeParam,
          birthCity: birthPlace,
          timezone,
          latitude: coords.lat,
          longitude: coords.lng,
          analysisAt: new Date().toISOString(),
        },
        lang: locale === 'en' ? 'en' : 'ko',
        startYearMonth: `${year}-01`,
      }
      const normalizedMatrixInput = buildNormalizedMatrixInput(matrixInput)

      if (CALENDAR_STRICT_MATRIX) {
        const missing = collectCalendarMatrixMissing(normalizedMatrixInput)
        if (missing.length > 0) {
          return createErrorResponse({
            code: ErrorCodes.SERVICE_UNAVAILABLE,
            message: `Calendar matrix input incomplete: ${missing.join(', ')}`,
            locale: extractLocale(request),
            route: 'calendar',
          })
        }
      }

      const matrix = calculateDestinyMatrix(normalizedMatrixInput)
      const matrixReport = reportGenerator.generateReport(normalizedMatrixInput, {
        layer1_elementCore: matrix.layer1_elementCore,
        layer2_sibsinPlanet: matrix.layer2_sibsinPlanet,
        layer3_sibsinHouse: matrix.layer3_sibsinHouse,
        layer4_timing: matrix.layer4_timing,
        layer5_relationAspect: matrix.layer5_relationAspect,
        layer6_stageHouse: matrix.layer6_stageHouse,
        layer7_advanced: matrix.layer7_advanced,
        layer8_shinsalPlanet: matrix.layer8_shinsalPlanet,
        layer9_asteroidHouse: matrix.layer9_asteroidHouse,
        layer10_extraPointElement: matrix.layer10_extraPointElement,
      })
      const coreSeed = runDestinyCore({
        mode: 'calendar',
        lang: locale === 'en' ? 'en' : 'ko',
        matrixInput: normalizedMatrixInput,
        matrixReport,
        matrixSummary: matrix.summary,
      })
      topMatchedPatterns = coreSeed.patterns.slice(0, 10).map((pattern) => ({
        id: pattern.id,
        label: pattern.label,
        score: pattern.score,
        confidence: pattern.confidence,
        domains: [...(pattern.domains || [])],
        activationReason: pattern.activationReason,
      }))
      matrixInputCoverage = {
        saju: {
          pillarElementCount: pillarElements.length,
          sibsinKeyCount: Object.keys(sibsinDistribution).length,
          twelveStageCount: Object.keys(normalizedMatrixInput.twelveStages || {}).length,
          relationCount: Array.isArray(normalizedMatrixInput.relations)
            ? normalizedMatrixInput.relations.length
            : 0,
          shinsalCount: Array.isArray(normalizedMatrixInput.shinsalList)
            ? normalizedMatrixInput.shinsalList.length
            : 0,
          geokguk: normalizedMatrixInput.geokguk || null,
          yongsin: normalizedMatrixInput.yongsin || null,
          hasCurrentDaeun: !!normalizedMatrixInput.currentDaeunElement,
          hasCurrentSaeun: !!normalizedMatrixInput.currentSaeunElement,
          snapshotKeys: Object.keys(normalizedMatrixInput.sajuSnapshot || {}).length,
        },
        astrology: {
          planetHouseCount: Object.keys(normalizedMatrixInput.planetHouses || {}).length,
          planetSignCount: Object.keys(normalizedMatrixInput.planetSigns || {}).length,
          aspectCount: Array.isArray(normalizedMatrixInput.aspects)
            ? normalizedMatrixInput.aspects.length
            : 0,
          activeTransitCount: Array.isArray(normalizedMatrixInput.activeTransits)
            ? normalizedMatrixInput.activeTransits.length
            : 0,
          dominantWesternElement: normalizedMatrixInput.dominantWesternElement || null,
          snapshotKeys: Object.keys(normalizedMatrixInput.astrologySnapshot || {}).length,
        },
        cross: {
          snapshotKeys: Object.keys(normalizedMatrixInput.crossSnapshot || {}).length,
          currentDateIso: normalizedMatrixInput.currentDateIso || null,
          availability: normalizedMatrixInput.availability,
        },
        core: {
          coreHash: coreSeed.coreHash,
          patternCount: coreSeed.patterns.length,
          scenarioCount: coreSeed.scenarios.length,
          qualityScore: coreSeed.quality.score,
          qualityGrade: coreSeed.quality.grade,
          qualityWarnings: coreSeed.quality.warnings,
          topPatternIds: topMatchedPatterns.map((pattern) => pattern.id),
        },
      }
      matrixEvidencePackets = buildCalendarEvidencePacketMap({
        lang: locale === 'en' ? 'en' : 'ko',
        matrixInput: normalizedMatrixInput,
        matrixReport,
        matrixSummary: matrix.summary,
        coreSeed,
        birthDate: birthDateParam,
      })

      matrixCalendarContext = {
        calendarSignals: matrix.summary.calendarSignals || [],
        overlapTimeline: matrix.summary.overlapTimeline || [],
        overlapTimelineByDomain: matrix.summary.overlapTimelineByDomain || undefined,
        domainScores: matrix.summary.domainScores || undefined,
      }
    } catch (matrixError) {
      if (CALENDAR_STRICT_MATRIX) {
        logger.error('[Calendar] Matrix overlay failed (strict mode):', matrixError)
        return createErrorResponse({
          code: ErrorCodes.SERVICE_UNAVAILABLE,
          message: 'Destiny matrix calculation unavailable',
          locale: extractLocale(request),
          route: 'calendar',
          originalError:
            matrixError instanceof Error ? matrixError : new Error(String(matrixError)),
        })
      }
      logger.warn('[Calendar] Matrix overlay fallback:', matrixError)
    }

    // 로컬 계산으로 중요 날짜 가져오기 (Redis 캐싱 적용)
    const cacheKey = CacheKeys.yearlyCalendar(
      birthDateParam,
      birthTimeParam,
      gender,
      year,
      category || undefined
    )
    const localDates = await cacheOrCalculate(
      cacheKey,
      async () => {
        return calculateYearlyImportantDates(year, sajuProfile, astroProfile, {
          minGrade: 4, // grade 4(최악의 날)까지 포함
        })
      },
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
      gender: 'unknown',
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
        moon: { sign: astroProfile.sunSign, degree: 15 },
      },
    }

    // AI 백엔드 호출 시도
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

    const formattedDates = matrixRegradedDates.map((d) => formatCalendarDate(d))
    const sortByDisplayScoreDesc = (
      a: (typeof formattedDates)[number],
      b: (typeof formattedDates)[number]
    ) => (b.displayScore ?? b.score) - (a.displayScore ?? a.score)

    // 5등급별 그룹화 (single-pass instead of repeated filter calls)
    const gradeGroups: Record<number, typeof formattedDates> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
    }
    for (const d of formattedDates) {
      if (d.grade >= 0 && d.grade <= 4) {
        gradeGroups[d.grade].push(d)
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
      // AI 날짜를 기존 날짜에 병합 가능
    }

    const todayPacket = matrixEvidencePackets?.today || matrixEvidencePackets?.general
    const coreCoverage = (matrixInputCoverage as { core?: { coreHash?: string } } | undefined)?.core
    const calendarMatrixContract =
      coreCoverage || todayPacket
        ? {
            coreHash: coreCoverage?.coreHash,
            overallPhase: todayPacket?.strategyBrief?.overallPhase,
            overallPhaseLabel: todayPacket?.strategyBrief?.overallPhaseLabel,
            topClaimId: todayPacket?.topClaims?.[0]?.id,
            topClaim: todayPacket?.topClaims?.[0]?.text,
            focusDomain: todayPacket?.focusDomain,
          }
        : undefined

    const responsePayload = normalizeMojibakePayload({
      success: true,
      type: 'yearly',
      year,
      aiEnhanced,
      matrixContract: calendarMatrixContract,
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
      badDates: [...grade4, ...grade3].sort(sortByDisplayScoreDesc).slice(0, 10),
      worstDates: [...grade4].sort(sortByDisplayScoreDesc).slice(0, 5),
      allDates: formattedDates,
      matrixInputCoverage,
      matrixEvidencePackets,
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
  createPublicStreamGuard({
    route: 'calendar',
    limit: 30,
    windowSeconds: 60,
  })
)
