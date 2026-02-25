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
import { calculateNatalChart } from '@/lib/astrology/foundation/astrologyService'
import { findNatalAspects } from '@/lib/astrology/foundation/aspects'
import { toChart } from '@/lib/astrology/foundation/astrologyService'
import { STEM_TO_ELEMENT_EN as STEM_TO_ELEMENT, BRANCH_TO_ELEMENT_EN } from '@/lib/Saju/constants'
import { calculateDestinyMatrix } from '@/lib/destiny-matrix'
import type { FiveElement } from '@/lib/Saju/types'
import type { MatrixCalculationInput, PlanetName } from '@/lib/destiny-matrix/types'
import { analyzeAdvancedSaju } from '@/lib/Saju/astrologyengine'
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

// Zodiac â†’ element mapping (extracted to avoid duplication in try/catch blocks)
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
const CALENDAR_STRICT_AI_ENRICHMENT =
  process.env.NODE_ENV !== 'test' && process.env.CALENDAR_STRICT_AI_ENRICHMENT !== 'false'

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
 * ì¤‘ìš” ë‚ ì§œ ì¡°íšŒ (ì¸ì¦ ë¶ˆí•„ìš”)
 *
 * Query params:
 * - birthDate: ìƒë…„ì›”ì¼ (YYYY-MM-DD) - í•„ìˆ˜
 * - birthTime: ì¶œìƒì‹œê°„ (HH:MM) - ì„ íƒ
 * - birthPlace: ì¶œìƒìž¥ì†Œ - ì„ íƒ
 * - year: ì—°ë„ (ê¸°ë³¸: í˜„ìž¬ë…„ë„)
 * - category: ì¹´í…Œê³ ë¦¬ í•„í„°
 * - locale: ì–¸ì–´ (ko, en)
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

    // ìƒë…„ì›”ì¼ íŒŒì‹± (UTC ì˜¤í”„ì…‹ ì˜í–¥ ì—†ì´ ê³ ì •)
    const birthDate = parseBirthDate(birthDateParam)
    if (!birthDate) {
      return createErrorResponse({
        code: ErrorCodes.INVALID_DATE,
        locale: extractLocale(request),
        route: 'calendar',
      })
    }
    // birthPlaceëŠ” í•­ìƒ ìœ íš¨í•œ ê°’ì´ ìžˆìŒ (ê¸°ë³¸ê°’: Seoul)
    const coords = LOCATION_COORDS[birthPlace] || LOCATION_COORDS['Seoul']
    const timezone = coords.tz

    // âœ… ì •í™•í•œ ì‚¬ì£¼ ê³„ì‚° (saju.ts ì‚¬ìš© - ì ˆê¸° ê¸°ë°˜ ì›”ì£¼, ìžì‹œ êµì°¨ ì²˜ë¦¬)
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

    // ì‚¬ì£¼ ë°ì´í„°ì—ì„œ í•„ìš”í•œ ì •ë³´ ì¶”ì¶œ
    // Null safety: pillars ê°ì²´ê°€ ì—†ì„ ìˆ˜ ìžˆìŒ
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

    // ëŒ€ìš´ ì¶”ì¶œ - DaeunCycle íƒ€ìž…ì— ë§žì¶¤
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

    // âœ… ì •í™•í•œ ì ì„±ìˆ  ê³„ì‚° (Swiss Ephemeris ì‚¬ìš©)
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

      // íƒœì–‘ ì •ë³´ ì¶”ì¶œ
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

      const matrixInput: MatrixCalculationInput = {
        dayMasterElement: dayMasterElementKo,
        pillarElements,
        sibsinDistribution,
        twelveStages: {},
        relations: [],
        geokguk: advanced.geokguk.type as MatrixCalculationInput['geokguk'],
        yongsin: advanced.yongsin.primary,
        currentDaeunElement,
        currentSaeunElement,
        shinsalList: [],
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
        activeTransits: [],
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

      if (CALENDAR_STRICT_MATRIX) {
        const missing = collectCalendarMatrixMissing(matrixInput)
        if (missing.length > 0) {
          return createErrorResponse({
            code: ErrorCodes.SERVICE_UNAVAILABLE,
            message: `Calendar matrix input incomplete: ${missing.join(', ')}`,
            locale: extractLocale(request),
            route: 'calendar',
          })
        }
      }

      const matrix = calculateDestinyMatrix(matrixInput)
      matrixInputCoverage = {
        saju: {
          pillarElementCount: pillarElements.length,
          sibsinKeyCount: Object.keys(sibsinDistribution).length,
          geokguk: matrixInput.geokguk || null,
          yongsin: matrixInput.yongsin || null,
          hasCurrentDaeun: !!matrixInput.currentDaeunElement,
          hasCurrentSaeun: !!matrixInput.currentSaeunElement,
          snapshotKeys: Object.keys(matrixInput.sajuSnapshot || {}).length,
        },
        astrology: {
          planetHouseCount: Object.keys(matrixInput.planetHouses || {}).length,
          planetSignCount: Object.keys(matrixInput.planetSigns || {}).length,
          aspectCount: Array.isArray(matrixInput.aspects) ? matrixInput.aspects.length : 0,
          dominantWesternElement: matrixInput.dominantWesternElement || null,
          snapshotKeys: Object.keys(matrixInput.astrologySnapshot || {}).length,
        },
        cross: {
          snapshotKeys: Object.keys(matrixInput.crossSnapshot || {}).length,
          currentDateIso: matrixInput.currentDateIso || null,
        },
      }

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

    // ë¡œì»¬ ê³„ì‚°ìœ¼ë¡œ ì¤‘ìš” ë‚ ì§œ ê°€ì ¸ì˜¤ê¸° (Redis ìºì‹± ì ìš©)
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
          minGrade: 4, // grade 4(ìµœì•…ì˜ ë‚ )ê¹Œì§€ í¬í•¨
        })
      },
      CACHE_TTL.CALENDAR_DATA // 1 day
    )

    // ì¹´í…Œê³ ë¦¬ í•„í„°ë§
    let filteredDates = localDates
    if (category) {
      filteredDates = localDates.filter((d) => d.categories.includes(category))
    }

    // AI ë°±ì—”ë“œì—ì„œ ì¶”ê°€ ì •ë³´ ì‹œë„
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

    // AI ë°±ì—”ë“œ í˜¸ì¶œ ì‹œë„
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
    const formatCalendarDate = (d: (typeof filteredDates)[number]) =>
      formatDateForResponse(
        d,
        locale,
        koTranslations as unknown as TranslationData,
        enTranslations as unknown as TranslationData,
        matrixCalendarContext
      )

    // 5ë“±ê¸‰ë³„ ê·¸ë£¹í™” (single-pass instead of repeated filter calls)
    const gradeGroups: Record<number, typeof filteredDates> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
    }
    for (const d of filteredDates) {
      if (d.grade >= 0 && d.grade <= 4) {
        gradeGroups[d.grade].push(d)
      }
    }
    const grade0 = gradeGroups[0] // ì²œìš´ì˜ ë‚
    const grade1 = gradeGroups[1] // ì•„ì£¼ ì¢‹ì€ ë‚
    const grade2 = gradeGroups[2] // ì¢‹ì€ ë‚
    const grade3 = gradeGroups[3] // ë³´í†µ ë‚
    const grade4 = gradeGroups[4] // ìµœì•…ì˜ ë‚

    // AI ë‚ ì§œ ë³‘í•©
    let aiEnhanced = false
    if (aiDates) {
      aiEnhanced = true
      // AI ë‚ ì§œë¥¼ ê¸°ì¡´ ë‚ ì§œì— ë³‘í•© ê°€ëŠ¥
    }

    const responsePayload = normalizeMojibakePayload({
      success: true,
      type: 'yearly',
      year,
      aiEnhanced,
      birthInfo: {
        date: birthDateParam,
        time: birthTimeParam,
        place: birthPlace,
      },
      summary: {
        total: filteredDates.length,
        grade0: grade0.length, // ì²œìš´ì˜ ë‚
        grade1: grade1.length, // ì•„ì£¼ ì¢‹ì€ ë‚
        grade2: grade2.length, // ì¢‹ì€ ë‚
        grade3: grade3.length, // ë³´í†µ ë‚
        grade4: grade4.length, // ìµœì•…ì˜ ë‚
      },
      topDates: (() => {
        // grade0 + grade1 + grade2ê°€ ë¶€ì¡±í•˜ë©´ grade3 ì¤‘ ë†’ì€ ì ìˆ˜ ë‚ ì§œë„ í¬í•¨
        const topCandidates = [...grade0, ...grade1, ...grade2]
        if (topCandidates.length < 5) {
          const topGrade3 = grade3
            .sort((a, b) => b.score - a.score)
            .slice(0, 5 - topCandidates.length)
          topCandidates.push(...topGrade3)
        }
        return topCandidates.slice(0, 10).map((d) => formatCalendarDate(d))
      })(),
      goodDates: [...grade1, ...grade2].slice(0, 20).map((d) => formatCalendarDate(d)),
      badDates: [...grade4, ...grade3].slice(0, 10).map((d) => formatCalendarDate(d)),
      worstDates: grade4.slice(0, 5).map((d) => formatCalendarDate(d)),
      allDates: filteredDates.map((d) => formatCalendarDate(d)),
      matrixInputCoverage,
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
