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
import { normalizeGender } from '@/lib/utils/gender'
import { nowInTimezone } from '@/lib/utils/timezone'
import { cellsToImportantDates } from './lib/cellsToImportantDates'

import {
  getPillarStemName,
  getPillarBranchName,
  parseBirthDate,
  formatDateForResponse,
  LOCATION_COORDS,
} from './lib/helpers'
import { buildCalendarPresentationView } from './lib/presentationAdapter'
import type { NatalChartData } from '@/lib/astrology/foundation/astrologyService'

export const dynamic = 'force-dynamic'

import { LIMITS } from '@/lib/validation/patterns'
import { normalizeMojibakePayload } from '@/lib/text/mojibake'
import { getUserDisplayName } from '@/lib/user/displayName'
import { translateSignalLabel } from '@/lib/calendar-engine/derivers/signalI18n'
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
    // Default 'current year' to the user's local year — `new Date()` on a
    // UTC server flips a day early for users west of UTC and a day late
    // for users east of UTC on Dec 31.
    const year = yearFromZod ?? nowInTimezone(timezone).getUTCFullYear()

    // 정확한 사주 계산 (saju.ts 사용 - 절기 기반 월주, 자시 교차 처리)
    let sajuResult
    try {
      // 'F' 한 글자도 처리 — 기존 lowercase==='female' 매칭은 'F'→'f' 가
      // 매칭 실패해 여자 사용자의 대운 방향이 거꾸로 가던 회귀.
      const sajuGender: 'male' | 'female' = normalizeGender(gender) === 'female' ? 'female' : 'male'
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
      // "today" must be the user's local today, not the server's UTC
      // today — otherwise a US-West user opening the calendar at 5pm
      // local sees tomorrow's hourly slots and a Korean user just past
      // midnight sees yesterday's. Anchor the same Date at the user's
      // timezone before handing it to the timing analyzer.
      const slots = analyzeDayTimeSlots(
        nowInTimezone(timezone),
        pillars.day.stem,
        pillars.day.branch
      )
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
      const birthHour = Number.parseInt((birthTimeParam || '00:00').split(':')[0] || '0', 10)
      const birthMinute = Number.parseInt((birthTimeParam || '00:00').split(':')[1] || '0', 10)
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
        // transit batch (365일 행성 위치) 는 결정적 — year + timezone 만 의존.
        // 사용자 별로 다시 계산하지 않고 Redis 공유 캐시 → 첫 사용자가 ~350ms
        // 부담하면 그 다음 같은 (year, tz) 모든 사용자 즉시 HIT.
        const batch = await cacheOrCalculate(
          CacheKeys.transitBatch(year, timezone),
          async () => calculateTransitPlanetsBatch(isoList, timezone),
          CACHE_TTL.NATAL_CHART // 30일 — 트랜짓 데이터는 연도 단위로 결정됨
        )
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

    // destiny-matrix 코어 제거됨 — 캘린더는 사주×점성 교차(v2 점수 + v3 narrative +
    // cycleRelations)만으로 구성된다. 이전엔 null 변수 5개 (matrixCalendarContext,
    // matrixEvidencePackets, calendarCoreCanonical, calendarCoreDataQuality,
    // calendarMatrixContract) 가 선언되어 다운스트림 호출에 전달됐으나, 모두 noop
    // 호출이라 단순화. 다운스트림은 graceful degrade 한다.

    // v2 엔진 본명 컨텍스트는 prescore + augment 두 블록이 같이 쓰니 한 번만 빌드.
    // 이전엔 두 곳에서 각각 호출해 Swiss Ephemeris를 2번 돌려 cold ~300ms 손해.
    let sharedCeNatal: Awaited<
      ReturnType<typeof import('@/lib/calendar-engine/context/build').buildNatalContext>
    > | null = null
    try {
      // Redis → DB NatalContextCache → 재계산 cascade. Redis 만 쓰던 시절은
      // 30일 만료 시 매번 ~500ms 재계산했는데 이젠 DB 영구 + Redis 앞단.
      const { getOrBuildNatalContext } = await import('@/lib/calendar-engine/context/cache')
      const { context, source } = await getOrBuildNatalContext(
        {
          birthDate: birthDateParam,
          birthTime: birthTimeParam || '00:00',
          gender: normalizeGender(gender) === 'female' ? 'female' : 'male',
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
      sharedCeNatal = context
      logger.info?.('[calendar] natal context', { source })
    } catch (err) {
      logger.warn?.(
        '[calendar-engine v2 natal-context] failed:',
        err instanceof Error ? err.message : String(err)
      )
    }

    // ── v2(calendar-engine) 단일 점수·서사 출처 ───────────────────────────
    // [마이그레이션 단계 4] 구 calculateYearlyImportantDates(사주·점성 blend) 제거.
    // 12달 셀을 빌드해 cellsToImportantDates 로 ImportantDate[] 를 직접 만든다.
    // 점수·등급·축분해·교차검증은 셀에서, formatDateForResponse 의 모순방지 게이트가
    // 먹는 recommendation/warningKeys 는 순수 빌더로 재현(브릿지 내부). 아래 augment
    // 블록이 같은 12달(cell-cache in-memory HIT)로 narrative/신호/패턴/일진을 부착한다
    // — 점수·문구·신호·게이트가 전부 단일 v2 출처. 구 v3 blend·engineScores 주입 폐기.
    const prescoreMonths = Array.from({ length: 12 }, (_, i) => i)

    const prescoreCells: import('@/lib/calendar-engine/types').CalendarCell[] = []
    try {
      if (!sharedCeNatal) throw new Error('natal context unavailable')
      const ceNatal = sharedCeNatal
      const { getOrBuildMonth, makeBirthKey } = await import('@/lib/calendar-engine/cell-cache')
      const birthKey = makeBirthKey({
        birthDate: birthDateParam,
        birthTime: birthTimeParam || '00:00',
        birthPlace,
        gender: gender || 'Male',
      })
      const monthResults = await Promise.all(
        prescoreMonths.map((month) => {
          const start = new Date(Date.UTC(year, month, 1))
          const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59))
          const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
          return getOrBuildMonth({
            birthKey,
            monthKey,
            natal: ceNatal,
            range: { start: start.toISOString(), end: end.toISOString(), granularity: 'day' },
            options: { includeEvidence: true },
          })
        })
      )
      for (const { cells } of monthResults) prescoreCells.push(...cells)
    } catch (err) {
      logger.warn?.(
        '[calendar-engine v2 build] skipped:',
        err instanceof Error ? err.message : String(err)
      )
    }

    // 365일 ImportantDate — v2 셀에서 직접. minGrade 게이팅은 셀 점수 기준이라 불필요
    // (전 날짜 포함). 카테고리 필터는 아래에서 적용.
    const localDates = cellsToImportantDates(prescoreCells, {
      locale: locale === 'en' ? 'en' : 'ko',
      sunSign: astroProfile.sunSign,
      natal: {
        dayMaster: sajuProfile.dayMaster,
        dayBranch: sajuProfile.dayBranch || sajuProfile.pillars?.day?.branch || '',
        daeunCycles: sajuProfile.daeunCycles,
        birthYear: sajuProfile.birthYear,
      },
    })

    // 카테고리 필터링
    let filteredDates = localDates
    if (category) {
      filteredDates = localDates.filter((d) => d.categories.includes(category))
    }
    // matrix context 제거로 regrade 함수는 noop (즉시 return date) → 호출 자체 제거.
    const matrixRegradedDates = [...filteredDates].sort((a, b) => {
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
        enTranslations as unknown as TranslationData
      )

    // rebalance는 augment 후로 미룬다 — augment가 displayScore를 v2 셀로 덮어쓰는데,
    // 그 전에 rank를 매기면 옛 score 기준 displayGrade가 새 displayScore와 어긋나
    // 같은 카드 안에서 배지(grade)와 숫자(score)가 불일치한다.
    const formattedDates = matrixRegradedDates.map((d) => formatCalendarDate(d))

    // 캘린더 SSOT 통합 — evidence.matrixVerdict 의 자연어 (verdict/guardrail/topClaim/
    // topAnchorSummary) 는 응답에서 strip. 캘린더 행동 추천 SSOT 는 matchedPatterns.action
    // + advice.do + oneLine 만 (다른 컨텍스트). attackPercent/defensePercent/phase/
    // focusDomain 은 displayScore bias 계산에 쓰여 client 에 보낼 필요 없지만 strip 하면
    // 회귀 위험 — 일단 자연어만 제거.
    for (const d of formattedDates) {
      if (d.evidence?.matrixVerdict) {
        const mv = d.evidence.matrixVerdict
        d.evidence.matrixVerdict = {
          focusDomain: mv.focusDomain,
          phase: mv.phase,
          attackPercent: mv.attackPercent,
          defensePercent: mv.defensePercent,
        } as typeof mv
      }
    }

    // ── calendar-engine v2 augmentation (non-blocking, opt-in via fields) ──
    // 새 신호 엔진 호출 → matchedPatterns / engineSignals / themeScores 부착.
    // 실패해도 기존 응답 그대로 반환. UI는 새 필드 없으면 기존 동작 유지.
    // top-level monthlyInterpretation 으로 응답에 한 번만 포함 — 이전 365 copies 회귀 fix.
    let monthlyInterp: import('@/lib/calendar-engine/interpretation/types').Interpretation | null =
      null
    try {
      if (!sharedCeNatal) throw new Error('natal context unavailable')
      const ceNatal = sharedCeNatal
      // augment 윈도우는 12개월 전체 — prescore가 같은 12달을 이미 cell-cache에
      // 워밍업했으므로 여기서 다시 호출해도 모두 in-memory HIT(추가 비용 ~0). 이전엔
      // ±1달만 augment했어서 score는 365일 v2지만 narrative/engineSignals/matchedPatterns
      // /themeScores 부착은 ±1달뿐 → 다른 달 카드에서 점수↔서사 모순(서사가 fallback).
      const monthParam = searchParams.get('month')
      const monthMatch = monthParam?.match(/^(\d{4})-(\d{1,2})$/)
      const targetYear = monthMatch ? Number(monthMatch[1]) : year
      // Same reason as the `year` default — fall back to the user's local
      // month, not the server's UTC month.
      const targetMonth = monthMatch
        ? Number(monthMatch[2]) - 1
        : nowInTimezone(timezone).getUTCMonth()

      const { getOrBuildMonth, makeBirthKey } = await import('@/lib/calendar-engine/cell-cache')
      const birthKey = makeBirthKey({
        birthDate: birthDateParam,
        birthTime: birthTimeParam || '00:00',
        birthPlace,
        gender: gender || 'Male',
      })

      // 빌드 대상 12달 전부 — 응답에 12달 narrative/engineSignals/themeScores 포함되어야
      // 다른 달 클릭 시 monthInsights 빈 화면 안 나옴. prescore 3달은 in-memory HIT,
      // 나머지 9 달은 cell-cache MISS → 빌드 (~150ms × 9 ≈ 1.35s, cell-cache 적재).
      const monthsToBuildAugment = Array.from({ length: 12 }, (_, month) => {
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
      // 병렬 빌드 — prescore가 이미 같은 12달을 cell-cache에 적재했으므로 여기선
      // 사실상 전부 in-memory HIT (~0ms). 직렬이어도 빠르나 일관성으로 Promise.all 사용.
      const builtMonths = await Promise.all(
        monthsToBuildAugment.map(async (m) => {
          const result = await getOrBuildMonth({
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
            `[calendar-engine v2] ${result.cached ? 'cache HIT' : 'cache MISS'} for ${m.monthKey}, cells=${result.cells.length}`
          )
          return { m, ...result }
        })
      )
      for (const { m, cells } of builtMonths) {
        allCells.push(...cells)
        if (m.month === targetMonth && m.year === targetYear) {
          ceCells = cells // narrative는 current month 기준
        }
        if (m.month === prevMonth && m.year === prevYear) {
          prevMonthCells = cells // "지난달 대비" 비교 기준
        }
      }

      // 그 달 narrative 생성 (룰 DB 기반, LLM 0번 호출)
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
        // 로그인 사용자면 narrative 맨 앞에 호명 인사 추가 — 메인페이지에서
        // 저장된 이름(DB User.name)을 사용해 즉시 반영. 게스트는 인사 생략.
        const calendarUserName = await getUserDisplayName(context.userId)
        if (calendarUserName && interp.narrative) {
          const greeting =
            interpLang === 'ko'
              ? `${calendarUserName}님의 이번 달 흐름을 살펴봤어요.\n\n`
              : `Hi ${calendarUserName}, here's the flow I see for this month.\n\n`
          interp.narrative = greeting + interp.narrative
        }
        ;(formattedDates as unknown as { __interpretation?: unknown }).__interpretation = undefined
        monthlyInterp = interp
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

      // 12달 모든 cell을 date 키로 — 어느 달 카드를 봐도 engineSignals/matchedPatterns/
      // themeScores 부착됨. ±1달만 augment하던 시절엔 다른 달 카드 narrative가 fallback
      // 으로 빠져 점수↔서사 모순이 났다. score(=cell.derivedScore)와 narrative가 같은
      // 12달 셀 데이터에서 나오니 어느 달에서도 정합.
      // ※ displayScore는 여기서 덮어쓰지 않는다. yearlyDates가 engineScores 주입으로
      //   cell.derivedScore를 score=displayScore 둘 다에 동일 할당했으므로 그대로 흐름.
      const cellByDate = new Map(allCells.map((c) => [c.datetime.slice(0, 10), c]))

      // [마이그레이션 단계 2b] v2-native 서사·신뢰지표 오버레이.
      // 2a 가 displayScore·grade 를 12달 v2 로 통일했지만, 카드의 title/description/
      // summary 는 구 yearlyDates 의 pickBySeed 텍스트, evidence.confidence/
      // crossAgreementPercent 는 구 함수 계산값이라 "점수는 v2인데 문구·신뢰지표는 구
      // 함수 출처" 라는 잔여 불일치가 있었다. 같은 allCells 로 어댑터를 돌려 패턴 기반
      // 제목·본문과 cross-verify 지표를 뽑아 덮어쓴다 → 카드의 점수·문구·신뢰지표가
      // 전부 같은 v2 셀에서 나온다. categories/factors/scoreBreakdown 은 구 경로 유지
      // (golden 튜플·category 필터 시맨틱 보존, 단계 4 에서 마저 이관).
      const v2ByDate = new Map<
        string,
        import('@/lib/calendar-engine/adapters/cellsToYearlyDates').V2CalendarDate
      >()
      try {
        const { cellsToYearlyDates } = await import(
          '@/lib/calendar-engine/adapters/cellsToYearlyDates'
        )
        const v2Lang: 'ko' | 'en' = locale === 'en' ? 'en' : 'ko'
        const v2Dates = cellsToYearlyDates(allCells, { lang: v2Lang })
        for (const v of v2Dates) v2ByDate.set(v.date.slice(0, 10), v)
      } catch (err) {
        logger.warn?.(
          '[calendar-engine v2 adapter overlay] skipped:',
          err instanceof Error ? err.message : String(err)
        )
      }

      for (const d of formattedDates) {
        const cell = cellByDate.get(d.date.slice(0, 10))
        if (!cell) continue
        if (cell.matchedPatterns.length > 0) {
          const { PATTERN_I18N_EN } = await import('@/lib/calendar-engine/derivers/patternsI18n')
          const useEn = locale === 'en'
          d.matchedPatterns = cell.matchedPatterns.map((p) => {
            const en = useEn ? PATTERN_I18N_EN[p.id] : undefined
            return {
              id: p.id,
              name: en?.name ?? p.name,
              themes: p.themes,
              strength: p.strength,
              description: p.description,
              headline: en?.headline ?? p.headline,
              action: en?.action ?? p.action,
            }
          })
        }
        // engineSignals — hourly layer 만 부착. 나머지 layer (decadal/yearly/
        // monthly/daily/instant) 는 UI 사용처 없어 365 × 130 bytes = ~600KB
        // 부풀림 제거. hourly 는 ~30/day × 365 = 1.6MB raw (~400KB gzip) 유지
        // 해 DailyHourlyChart 가 fusion 백필 기다리지 않고 즉시 렌더.
        if (cell.signals.length > 0) {
          const hourlySigs = cell.signals.filter((s) => s.layer === 'hourly')
          if (hourlySigs.length > 0) {
            d.engineSignals = hourlySigs.map((s) => ({
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
        }
        if (Object.keys(cell.themeScores).length > 0) {
          d.themeScores = cell.themeScores
        }

        // [단계 2b] 패턴 기반 v2 서사·신뢰지표로 덮어쓰기 — 점수와 같은 셀 출처로 정합.
        const v2 = v2ByDate.get(d.date.slice(0, 10))
        if (v2) {
          if (v2.title?.trim()) d.title = v2.title
          if (v2.description?.trim()) {
            d.description = v2.description
            d.summary = v2.description
          }
          // evidence 객체(matrix.domain 등)는 보존하고 cross-verify 수치만 v2 로 동기화.
          if (d.evidence) {
            d.evidence.confidence = v2.confidence
            d.evidence.crossAgreementPercent = v2.crossAgreementPercent
          }
          // [단계 2c] 요인 칩(saju/astro factors)도 v2 셀 신호 기반으로 정합 —
          // 구 함수가 v2 셀과 무관하게 만든 factorKeys 가 카드의 engineSignals/
          // matchedPatterns 와 어긋나던 표시 불일치를 해소. recommendations/warnings 는
          // 구 formatDateForResponse 의 coherence 게이팅(통신주의↔비가역행동 모순 방지)
          // 을 유지해야 하므로 여기서 덮어쓰지 않는다(단계 4 에서 게이트째 이관).
          if (v2.sajuFactors.length > 0) d.sajuFactors = v2.sajuFactors
          if (v2.astroFactors.length > 0) d.astroFactors = v2.astroFactors
        }
      }

      // 일진 (60갑자) 한 줄 narrative — 매일 다른 ganji + 본명 일간 기준
      // 십신 개인화. 룰 DB 무관 (LLM 0번).
      try {
        const { computeDayStem, computeDayBranch } =
          await import('@/lib/calendar-engine/extractors/saju-shinsal')
        const { getGanjiTransitNarrative, dailyIljinSibsinLine } =
          await import('@/lib/calendar-engine/data/ganjiTransitNarrative')
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
      preferredFocusDomain: category
        ? presentationDomainMap[category as keyof typeof presentationDomainMap]
        : undefined,
    })

    const { persistDestinyPredictionSnapshot } =
      await import('@/lib/destiny-matrix/predictionSnapshot')
    // matrix 코어 제거됨 — focus/timing 관련 필드 다 undefined. predictionClaim 만 의미.
    const predictionId = await persistDestinyPredictionSnapshot({
      userId: context.userId,
      service: 'calendar',
      lang: locale === 'en' ? 'en' : 'ko',
      theme: category || 'yearly',
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
      // matrixContract: 항상 undefined (matrix 코어 제거됨). 응답 필드도 제거.
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
      // 그 달 narrative — top-level 1개로 dedupe (이전 365 copies 회귀 fix).
      // EN locale 이면 themeBreakdown 라벨 + convergence keyDays 의 신호명 영문 swap.
      monthlyInterpretation: (() => {
        if (!monthlyInterp || locale !== 'en') return monthlyInterp
        const next = { ...monthlyInterp }
        if (next.themeBreakdown) {
          next.themeBreakdown = Object.fromEntries(
            Object.entries(next.themeBreakdown).map(([theme, items]) => [
              theme,
              items?.map((it) => ({ ...it, label: translateSignalLabel(it.label, 'en') })),
            ])
          ) as typeof next.themeBreakdown
        }
        if (next.convergence?.keyDays) {
          next.convergence = {
            ...next.convergence,
            keyDays: next.convergence.keyDays.map((d) => ({
              ...d,
              astro: d.astro.map((sig) => translateSignalLabel(sig, 'en')),
              saju: d.saju.map((sig) => translateSignalLabel(sig, 'en')),
            })),
          }
        }
        if (next.yearlyConvergence?.keyDays) {
          next.yearlyConvergence = {
            ...next.yearlyConvergence,
            keyDays: next.yearlyConvergence.keyDays.map((d) => ({
              ...d,
              astro: d.astro.map((sig) => translateSignalLabel(sig, 'en')),
              saju: d.saju.map((sig) => translateSignalLabel(sig, 'en')),
            })),
          }
        }
        return next
      })(),
      monthSummary: presentationView.monthSummary,
      calendarDailyView: presentationView.dailyView,
      calendarMonthView: presentationView.monthView,
    })
    const res = NextResponse.json(responsePayload)

    // Cache for 1 hour - calendar data is deterministic for the same birthDate/year
    res.headers.set('Cache-Control', 'private, max-age=3600, stale-while-revalidate=1800')
    return res
  },
  // Rate limit 만 8/min (이전 30/min 익명 fan-out 보호용). token gate 는 prod
  // NEXT_PUBLIC_API_TOKEN 미설정 시 캘린더 전체 차단 위험이라 제거 — 그래프 사라짐
  // 회귀 직후 revert. DoS 표면은 rate limit + year range 제한으로만 방어.
  createSimpleGuard({
    route: 'calendar',
    limit: 8,
    windowSeconds: 60,
  })
)
