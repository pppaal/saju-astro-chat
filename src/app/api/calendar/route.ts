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
import { STEM_TO_ELEMENT_EN } from '@/lib/saju/constants'
import koTranslations from '@/i18n/locales/ko'
import enTranslations from '@/i18n/locales/en'
import type { TranslationData } from '@/types/calendar-api'
import { logger } from '@/lib/logger'
import { cacheOrCalculate, CacheKeys, CACHE_TTL } from '@/lib/cache/redis-cache'
import { calendarMainQuerySchema, createValidationErrorResponse } from '@/lib/api/zodValidation'
import { calculateYearlyImportantDates } from './lib/yearlyDates'
import type { CalendarCoreAdapterResult } from '@/lib/destiny-matrix/core/adapters'

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
import type { DomainKey } from './lib/types'
import type { CalendarMatrixEvidencePacketMap } from './lib/matrixEvidencePacket'
import type { NatalChartData } from '@/lib/astrology/foundation/astrologyService'

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

function mapCoreSignalDomainToCalendarDomain(domain: string | undefined): DomainKey | null {
  if (!domain) return null
  return CORE_SIGNAL_DOMAIN_TO_CALENDAR_DOMAIN[domain] ?? null
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
      const { analyzeDayTimeSlots } =
        await import('@/lib/calendar-engine/timing-helpers/ultra-precision-minute')
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

    // destiny-matrix 코어 제거로 항상 비어 있음 — 다운스트림(presentation/응답)은
    // 이 값들이 없으면 해당 섹션(국면·evidence 등)을 graceful하게 숨긴다.
    const matrixCalendarContext: MatrixCalendarContext = null
    const matrixEvidencePackets: CalendarMatrixEvidencePacketMap | null = null
    const calendarCoreCanonical = null as CalendarCoreAdapterResult | null
    const calendarCoreDataQuality = null as {
      missingFields: string[]
      derivedFields: string[]
      conflictingFields: string[]
      qualityPenalties: string[]
      confidenceReason: string
    } | null
    const calendarMatrixContract:
      | {
          coreHash?: string
          overallPhase?: string
          overallPhaseLabel?: string
          topClaimId?: string
          topClaim?: string
          focusDomain?: string
        }
      | undefined = undefined

    // destiny-matrix 코어 제거됨 — 캘린더는 사주×점성 교차(v2 점수 + v3 narrative +
    // cycleRelations)만으로 구성된다. matrix가 주던 국면/evidence 코어 요약은
    // 더 이상 계산하지 않으며, 관련 변수는 null로 남아 다운스트림이 graceful degrade한다.

    // ── v2(calendar-engine) 점수 선계산 → v3 narrative 주입 ──
    // 1년 전체 365일을 v2 셀 점수로 채워 yearlyDates의 narrative grade·title·
    // description이 모두 같은 점수 모델(=v2 cell.derivedScore)로 만들어지게 한다.
    // 이전엔 ±1달만 v2였고 나머지 10개월은 v3 blend((engineSub+transitSub)/2)라
    // 같은 사용자가 1월 보다가 4월 가면 점수 모델이 바뀌어 들쭉날쭉했다.
    // 비용: cold 시 12 build × ~150ms. 캐시(cell-cache in-memory + DB)로 warm은 즉시.
    const engineScoreByDate: Record<string, number> = {}
    try {
      const { buildNatalContext } = await import('@/lib/calendar-engine/context/build')
      const { getOrBuildMonth, makeBirthKey } = await import('@/lib/calendar-engine/cell-cache')
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
          astroChart: isNatalChartData(astroProfile.natalChart)
            ? astroProfile.natalChart
            : undefined,
        }
      )
      const birthKey = makeBirthKey({
        birthDate: birthDateParam,
        birthTime: birthTimeParam || '12:00',
        birthPlace,
        gender: gender || 'Male',
      })
      // 셀 datetime은 UTC 미드나잇 키(`isoForCell` in calendar-engine/index.ts).
      // 서버 TZ가 UTC가 아니면 `new Date(y,m,1).toISOString()`이 전날 UTC가 돼서
      // 셀의 slice(0,10)이 -1일 어긋남. Date.UTC로 UTC 미드나잇 명시.
      for (let month = 0; month < 12; month++) {
        const start = new Date(Date.UTC(year, month, 1))
        const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59))
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
        const { cells } = await getOrBuildMonth({
          birthKey,
          monthKey,
          natal: ceNatal,
          range: { start: start.toISOString(), end: end.toISOString(), granularity: 'day' },
          options: { includeEvidence: true },
        })
        for (const c of cells) {
          const k = c.datetime.slice(0, 10)
          if (typeof c.derivedScore === 'number') engineScoreByDate[k] = c.derivedScore
        }
      }
    } catch (err) {
      logger.warn?.(
        '[calendar-engine v2 prescore] skipped:',
        err instanceof Error ? err.message : String(err)
      )
    }
    const hasEngineScores = Object.keys(engineScoreByDate).length > 0

    // 365일 전체에 v2 점수가 들어가니 cacheKey에 month 의존이 사라짐 — 보는 달
    // 바꿔도 같은 응답. 이전엔 ±1달만 v2였어서 보는 달에 따라 다른 응답이 캐시됐다.
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
          engineScores: hasEngineScores ? engineScoreByDate : undefined,
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
        matrixEvidencePackets || undefined
      )

    // rebalance는 augment 후로 미룬다 — augment가 displayScore를 v2 셀로 덮어쓰는데,
    // 그 전에 rank를 매기면 옛 score 기준 displayGrade가 새 displayScore와 어긋나
    // 같은 카드 안에서 배지(grade)와 숫자(score)가 불일치한다.
    const formattedDates = matrixRegradedDates.map((d) => formatCalendarDate(d))

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
        }
      )
      // augment 윈도우는 12개월 전체 — prescore가 같은 12달을 이미 cell-cache에
      // 워밍업했으므로 여기서 다시 호출해도 모두 in-memory HIT(추가 비용 ~0). 이전엔
      // ±1달만 augment했어서 score는 365일 v2지만 narrative/engineSignals/matchedPatterns
      // /themeScores 부착은 ±1달뿐 → 다른 달 카드에서 점수↔서사 모순(서사가 fallback).
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

      // 빌드 대상 12달: year 전체. Date.UTC로 TZ 독립 보장 (prescore 블록과 동일).
      const monthsToBuild = Array.from({ length: 12 }, (_, month) => {
        const start = new Date(Date.UTC(year, month, 1))
        const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59))
        return {
          year,
          month,
          monthKey: `${year}-${String(month + 1).padStart(2, '0')}`,
          rangeStart: start,
          rangeEnd: end,
        }
      })

      let ceCells: Awaited<ReturnType<typeof getOrBuildMonth>>['cells'] = []
      let prevMonthCells: Awaited<ReturnType<typeof getOrBuildMonth>>['cells'] = []
      const allCells: typeof ceCells = []
      const prevDateUtc = new Date(Date.UTC(targetYear, targetMonth - 1, 1))
      const prevYear = prevDateUtc.getUTCFullYear()
      const prevMonth = prevDateUtc.getUTCMonth()
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
        logger.info?.(
          `[calendar-engine v2] ${cached ? 'cache HIT' : 'cache MISS'} for ${m.monthKey}, cells=${cells.length}`
        )
        allCells.push(...cells)
        if (m.month === targetMonth && m.year === targetYear) {
          ceCells = cells // narrative는 current month 기준
        }
        if (m.month === prevMonth && m.year === prevYear) {
          prevMonthCells = cells // "지난달 대비" 비교 기준
        }
      }

      // 그 달 narrative 생성 (룰 DB 기반, LLM 0번 호출)
      try {
        const { buildInterpretation } = await import('@/lib/calendar-engine/interpretation')
        const interpLang: 'ko' | 'en' = locale === 'en' ? 'en' : 'ko'
        const interp = buildInterpretation({
          natal: ceNatal,
          cells: ceCells,
          scope: 'monthly',
          lang: interpLang,
          prevCells: prevMonthCells,
        })
        // 로그인 사용자면 narrative 맨 앞에 호명 인사 추가.
        // (template 변경 없이 최소 침범 — guest 면 인사 없이 기존 흐름 유지.)
        try {
          const { getServerSession } = await import('next-auth')
          const { authOptions } = await import('@/lib/auth/authOptions')
          const session = await getServerSession(authOptions)
          const userName = session?.user?.name?.trim()
          if (userName && interp.narrative) {
            const greeting =
              interpLang === 'ko'
                ? `${userName}님의 이번 달 흐름을 살펴봤어요.\n\n`
                : `Hi ${userName}, here's the flow I see for this month.\n\n`
            interp.narrative = greeting + interp.narrative
          }
        } catch {
          // 세션 조회 실패 시 인사 생략 — 본 narrative 는 그대로.
        }
        ;(formattedDates as unknown as { __interpretation?: unknown }).__interpretation = undefined
        // 올해 큰 날(연간 수렴)은 1년 풀빌드라 비싸서(~1.7s) 여기서 계산하지 않음.
        // 달력/날짜는 즉시 응답하고, 큰 날 카드는 클라가 /api/calendar/convergence를
        // 따로(지연) 불러와 채운다. interp.yearlyConvergence는 undefined로 남김.
        // interpretation은 그 달 전체 단위라 셀별 부착 X.
        // 모든 셀에 동일 narrative 부착 — 클라가 어느 날짜든 같은 텍스트 사용.
        for (const d of formattedDates) {
          d.monthlyInterpretation = interp
        }
        // ★ themeScores 동기화 — interp.themeScores(룰 의도 기반)를
        //   cells에 overwrite. UI 그래프(love/wealth/health 바)가
        //   cell.themeScores 읽으므로, narrative와 점수가 같은 모델로
        //   계산됨. cell의 신호 기반 themeScores와 narrative 톤 사이
        //   mismatch 해소.
        if (interp.themeScores) {
          for (const cell of ceCells) {
            cell.themeScores = { ...cell.themeScores, ...interp.themeScores }
          }
        }
      } catch (err) {
        logger.warn?.('[interpretation] skipped:', err instanceof Error ? err.message : String(err))
      }

      // 3달 모든 cell을 date 키로 — prev/next month 이동해도 그 달 engineSignals/
      // matchedPatterns/themeScores 부착됨 (현재 달만 부착하면 다른 달은 fallback).
      // ※ displayScore는 더 이상 여기서 덮어쓰지 않는다. yearlyDates가 이미 engineScores
      //    주입으로 cell.derivedScore + dailyShiftAdjustment(천간충·지지형·공망 보정)를
      //    score = displayScore로 두기 때문에, 여기서 raw cell.derivedScore로 다시 덮으면
      //    dailyShift 보정이 사라져 "narrative는 압박 들어옴 / 숫자는 60+" 모순이
      //    augment HIT 경로에서 그대로 재발한다.
      const cellByDate = new Map(allCells.map((c) => [c.datetime.slice(0, 10), c]))
      for (const d of formattedDates) {
        const cell = cellByDate.get(d.date.slice(0, 10))
        if (!cell) continue
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

      // 일진 (60갑자) 한 줄 narrative — 매일 다른 ganji + 본명 일간 기준
      // 십신 개인화. 룰 DB 무관 (LLM 0번).
      try {
        const { computeDayStem, computeDayBranch } =
          await import('@/lib/calendar-engine/extractors/saju-shinsal')
        const { getGanjiTransitNarrative, dailyIljinSibsinLine } =
          await import('@/lib/calendar-engine/data/ganjiTransitNarrative')
        const { buildInterpretation: buildDailyInterp } =
          await import('@/lib/calendar-engine/interpretation')
        const lang = locale === 'en' ? 'en' : 'ko'
        for (const d of formattedDates) {
          // d.date 는 ISO (YYYY-MM-DDTHH:mm:ss±) — UTC noon 으로 정규화해 ganji 안정.
          const dateOnly = d.date.slice(0, 10)
          const probe = new Date(`${dateOnly}T12:00:00.000Z`)
          if (Number.isNaN(probe.valueOf())) continue
          const stem = computeDayStem(probe)
          const branch = computeDayBranch(probe)
          if (!stem || !branch) continue
          const ganji = `${stem}${branch}`
          const ganjiText = getGanjiTransitNarrative(ganji, 'daily', lang)
          // 그 날 cell 의 일진 십신 신호 (pillar-sibsin, layer=daily) → 개인화 한 줄
          const cell = cellByDate.get(dateOnly)
          const sibsinSig = cell?.signals.find(
            (s) => s.layer === 'daily' && s.kind === 'pillar-sibsin' && s.evidence?.sibsin
          )
          const sibsinLine = dailyIljinSibsinLine(
            sibsinSig?.evidence?.sibsin as string | undefined,
            lang
          )
          const combined = [ganjiText, sibsinLine].filter(Boolean).join(' ')
          if (combined) d.dailyGanjiNarrative = combined

          // 일진 scope 룰 → "오늘 한 줄" 액션 (그 날 cell 신호로 daily 룰 매칭)
          if (cell) {
            try {
              const di = buildDailyInterp({ natal: ceNatal, cells: [cell], scope: 'daily', lang })
              const today = di.sections.find((s) => s.section === 'today')
              const lines = today?.text
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean)
              if (lines && lines.length > 0) d.dailyActions = lines
            } catch {
              /* daily 해석 실패는 무시 — ganji 한 줄로 충분 */
            }
          }
        }
      } catch (err) {
        logger.warn?.(
          '[calendar-engine daily ganji] skipped:',
          err instanceof Error ? err.message : String(err)
        )
      }
    } catch (err) {
      logger.warn?.(
        '[calendar-engine v2 augment] skipped:',
        err instanceof Error ? err.message : String(err)
      )
    }

    // rank 기반 displayGrade 재배치는 카드 안 모순의 뿌리였다. yearlyDates가 이미
    // displayScore에서 scoreToGrade로 grade를 도출해 narrative(title/description/
    // warnings/recommendations)를 그 grade로 만든다. 그 후 별도 분포로 displayGrade를
    // 다시 매기면 같은 카드에서 "좋음 배지(=displayGrade) + 보통 톤 본문(=grade로 만든
    // 문구)" 모순이 다시 난다. displayGrade는 formatDateForResponse가 이미
    // date.grade로 부착하므로 추가 작업 불필요.

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
      timingCalibration: undefined,
      overlapTimelineByDomain: undefined,
      domainScores: undefined,
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
      matrixContract: calendarMatrixContract,
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
      allDates: formattedDates,
      monthSummary: presentationView.monthSummary,
      calendarDailyView: presentationView.dailyView,
      calendarMonthView: presentationView.monthView,
      relationshipWeather: presentationView.relationshipWeather,
      workMoneyWeather: presentationView.workMoneyWeather,
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
