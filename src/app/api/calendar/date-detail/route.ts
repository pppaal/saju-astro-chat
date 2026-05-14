/**
 * Calendar date-detail route
 *
 * GET /api/calendar/date-detail
 * Query: birthDate, birthTime?, gender?, date (YYYY-MM-DD), timezone?
 *
 * Runs the full per-date analyzer (사주/점성/다층/고급/일진) for ONE date.
 * The 365-day list still comes from /api/calendar (lite + matrix);
 * this endpoint is what the UI hits when the user opens a single day or
 * when the action planner needs deep evidence.
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  apiError,
  apiSuccess,
  createPublicStreamGuard,
  ErrorCodes,
  extractLocale,
  withApiMiddleware,
} from '@/lib/api/middleware'
import { dateSchema, createValidationErrorResponse } from '@/lib/api/zodValidation'
import { logger } from '@/lib/logger'
import { calculateSajuData } from '@/lib/saju/saju'
import { STEM_TO_ELEMENT } from '@/lib/saju/constants'
import { analyzeDate } from '@/lib/destiny-map/calendar/date-analysis-orchestrator'
import { calculateYearlyImportantDates } from '@/app/api/calendar/lib/yearlyDates'
import { getPillarStemName, getPillarBranchName } from '@/app/api/calendar/lib/helpers'
import { cacheOrCalculate, cacheGet, CacheKeys, CACHE_TTL } from '@/lib/cache/redis-cache'
import type { YearlyImportantDate } from '@/app/api/calendar/lib/yearlyDates'
import type {
  UserSajuProfile,
  UserAstroProfile,
} from '@/lib/destiny-map/calendar/types'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  birthDate: dateSchema,
  birthTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  gender: z.enum(['male', 'female']).optional(),
  date: dateSchema,
  timezone: z.string().max(64).optional(),
})

function deriveSunSign(birthDate: Date): string {
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

const ZODIAC_ELEMENT: Record<string, string> = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
}

export const GET = withApiMiddleware(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    const validation = querySchema.safeParse({
      birthDate: searchParams.get('birthDate'),
      birthTime: searchParams.get('birthTime') || undefined,
      gender: searchParams.get('gender') || undefined,
      date: searchParams.get('date'),
      timezone: searchParams.get('timezone') || undefined,
    })
    if (!validation.success) {
      return createValidationErrorResponse(validation.error, {
        locale: extractLocale(request),
        route: 'calendar-date-detail',
      })
    }

    const { birthDate, birthTime, gender, date, timezone } = validation.data
    const sajuGender = gender || 'male'

    let sajuResult: ReturnType<typeof calculateSajuData>
    try {
      sajuResult = calculateSajuData(
        birthDate,
        birthTime || '12:00',
        sajuGender,
        'solar',
        timezone || 'Asia/Seoul'
      )
    } catch (error) {
      logger.warn('[calendar/date-detail] saju calc failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      return apiError(ErrorCodes.BAD_REQUEST, 'Saju calculation failed')
    }

    const pillars = sajuResult.pillars
    const dayMasterStem = getPillarStemName(pillars.day)
    const dayBranch = getPillarBranchName(pillars.day)
    const yearStem = getPillarStemName(pillars.year)
    const yearBranch = getPillarBranchName(pillars.year)
    const monthStem = getPillarStemName(pillars.month)
    const monthBranch = getPillarBranchName(pillars.month)
    const timeStem = getPillarStemName(pillars.time)
    const timeBranch = getPillarBranchName(pillars.time)
    const dayMasterElement = STEM_TO_ELEMENT[dayMasterStem] || 'earth'

    const birthDateObj = new Date(birthDate + 'T00:00:00')
    const sajuProfile: UserSajuProfile = {
      dayMaster: dayMasterStem,
      dayMasterElement,
      dayBranch,
      yearBranch,
      birthYear: birthDateObj.getFullYear(),
      pillars: {
        year: { stem: yearStem, branch: yearBranch },
        month: { stem: monthStem, branch: monthBranch },
        day: { stem: dayMasterStem, branch: dayBranch },
        time: { stem: timeStem, branch: timeBranch },
      },
    } as UserSajuProfile

    // Advanced natal analysis — strength, geokguk, yongsin. The lite
    // generator's score ladder already uses yongsin alignment if the
    // profile carries it; calling analyzeAdvancedSaju here populates
    // those fields so per-date scoring is yongsin-aware AND we can
    // surface the natal identity ("신강 정관격, 용신 화") on the panel.
    let natalContext:
      | {
          strength: string
          geokguk: string
          yongsin: { primary: string; secondary?: string; type: string; kibsin?: string }
          summary: string
        }
      | undefined
    try {
      const { analyzeAdvancedSaju } = await import('@/lib/saju/advancedAnalysis')
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
        } as Parameters<typeof analyzeAdvancedSaju>[1]
      )
      const kibsin = (advanced.yongsin.unfavorable || []).join('·')
      natalContext = {
        strength: String(advanced.strength.level || ''),
        geokguk: String(advanced.geokguk.type || ''),
        yongsin: {
          primary: String(advanced.yongsin.primary || ''),
          secondary: advanced.yongsin.secondary
            ? String(advanced.yongsin.secondary)
            : undefined,
          type: String(advanced.yongsin.basis || ''),
          kibsin: kibsin || undefined,
        },
        summary: `${advanced.strength.level} ${advanced.geokguk.type}, 용신 ${advanced.yongsin.primary}${kibsin ? ` · 기신 ${kibsin}` : ''}`,
      }
      // Inject yongsin into sajuProfile so the lite generator's yongsin
      // alignment kicks in for this date too.
      ;(sajuProfile as UserSajuProfile & { yongsin?: unknown; geokguk?: unknown }).yongsin = {
        primary: advanced.yongsin.primary,
        secondary: advanced.yongsin.secondary,
        type: advanced.yongsin.basis,
        kibsin: kibsin || undefined,
      }
      ;(sajuProfile as UserSajuProfile & { yongsin?: unknown; geokguk?: unknown }).geokguk = {
        type: advanced.geokguk.type,
        strength: advanced.strength.level,
      }
    } catch (err) {
      logger.warn('[calendar/date-detail] advanced saju analysis failed', {
        error: err instanceof Error ? err.message : String(err),
      })
    }

    const sunSign = deriveSunSign(birthDateObj)
    const astroProfile: UserAstroProfile = {
      sunSign,
      sunElement: ZODIAC_ELEMENT[sunSign] || 'fire',
      birthMonth: birthDateObj.getMonth() + 1,
      birthDay: birthDateObj.getDate(),
    } as UserAstroProfile

    const targetDate = new Date(date + 'T00:00:00')
    const yearOfDate = targetDate.getFullYear()

    // 1) 365 캘린더 뷰가 캐시에 있으면 그걸 권위 있는 답으로 사용 (사용자가 캘린더 페이지 들어왔으면 항상 채워져 있음)
    let liteForDay: YearlyImportantDate | undefined
    for (const cat of ['', 'general', 'career', 'love', 'wealth', 'health', 'travel', 'study'] as const) {
      const yk = CacheKeys.yearlyCalendar(birthDate, birthTime || '', sajuGender, yearOfDate, cat || undefined)
      const cached = await cacheGet<YearlyImportantDate[]>(yk)
      const hit = cached?.find((d) => d.date === date)
      if (hit) {
        liteForDay = hit
        break
      }
    }

    // 2) 캐시 없으면 같은 lite 점수식으로 그 해 한 번 돌려서 사용 (point-of-truth는 lite)
    const cacheKey = `cal-detail:v3:${birthDate}:${birthTime || ''}:${sajuGender}:${date}`
    const merged = await cacheOrCalculate(
      cacheKey,
      async () => {
        const detail = analyzeDate(targetDate, sajuProfile, astroProfile)
        if (!detail) return null
        let lite = liteForDay
        if (!lite) {
          const liteList = calculateYearlyImportantDates(
            yearOfDate,
            sajuProfile,
            astroProfile,
            { locale: 'ko', birthDate }
          )
          lite = liteList.find((d) => d.date === detail.date)
        }
        return { detail, lite }
      },
      CACHE_TTL.CALENDAR_DATA
    )
    if (!merged?.detail) {
      return apiError(ErrorCodes.SERVICE_UNAVAILABLE, 'Date analysis unavailable')
    }
    const { detail, lite } = merged
    // 365 lite를 정답으로 — 365 뷰 grade와 detail grade가 어긋나지 않게
    const canonicalGrade = lite?.grade ?? detail.grade
    const canonicalScore = lite?.score ?? detail.score
    const canonicalDisplayScore = lite?.displayScore ?? detail.displayScore ?? canonicalScore

    // ── Transit aspects on the selected date ──
    // Engine has the same transit module the rest of the app uses; cheap
    // to call once per selected date (Swiss ephemeris ~50ms). Aspect
    // longitudes are location-independent so Seoul defaults work fine —
    // we don't surface house cusps here.
    let transitData:
      | {
          aspects: Array<{ transitPlanet: string; natalPoint: string; aspect: string; orb: number; isApplying: boolean }>
          retrogrades?: string[]
          summary?: string
        }
      | undefined
    let fusionData:
      | {
          overallScore: number
          sajuAxisScore: number
          astroAxisScore: number
          agreement: number
          confidence: number
          domainScores: Record<string, number>
          advice: { do: string[]; avoid: string[] }
          topInsights: string[]
          hourly: {
            slots: Array<{ hour: number; score: number; tone: string; topDomain: string | null; hourPillar?: string; planetaryHour?: string; label: string }>
            bestHours: Array<{ hour: number; score: number; topDomain: string | null; hourPillar?: string; planetaryHour?: string }>
            worstHours: Array<{ hour: number; score: number; topDomain: string | null; hourPillar?: string; planetaryHour?: string }>
            bestByDomain: Record<string, { hour: number; score: number } | undefined>
          }
        }
      | undefined
    // 타로 cross-reading 용 — natalChart 와 transitChart 는 try 블록 안에서 계산되므로,
    // apiSuccess 시점에 접근 가능하도록 hoist 한 변수에 담아둔다.
    let natalAngles:
      | {
          sun?: { sign: string; formatted: string }
          moon?: { sign: string; formatted: string }
          ascendant?: { sign: string; formatted: string }
        }
      | undefined
    let todayMoonPhase: { phase: string; name: string } | undefined
    try {
      const [
        { calculateNatalChart, toChart },
        { calculateTransitChart, findTransitAspects },
      ] = await Promise.all([
        import('@/lib/astrology/foundation/astrologyService'),
        import('@/lib/astrology/foundation/transit'),
      ])
      const birthDateObjForAstro = new Date(birthDate + 'T00:00:00')
      const [bH, bM] = (birthTime || '12:00').split(':').map((v) => Number.parseInt(v, 10))
      const natalChartData = await calculateNatalChart({
        year: birthDateObjForAstro.getFullYear(),
        month: birthDateObjForAstro.getMonth() + 1,
        date: birthDateObjForAstro.getDate(),
        hour: Number.isFinite(bH) ? bH : 12,
        minute: Number.isFinite(bM) ? bM : 0,
        latitude: 37.5665,
        longitude: 126.978,
        timeZone: timezone || 'Asia/Seoul',
      })
      const natalChart = toChart(natalChartData)

      // ── fusion 한 날 분석 (18테마 × 0..100 + 24시간 슬롯) — Redis 캐시 ──
      try {
        const fusionCacheKey = CacheKeys.fusionDateDetail(birthDate, birthTime ?? '12:00', date)
        const { buildCalendarDay, buildCalendarHourly } = await import('@/lib/fusion/adapters')
        const simplePillars = {
          year:  { stem: yearStem,        branch: yearBranch },
          month: { stem: monthStem,       branch: monthBranch },
          day:   { stem: dayMasterStem,   branch: dayBranch },
          hour:  { stem: timeStem,        branch: timeBranch },
        }
        const ageAt = new Date(date).getFullYear() - birthDateObjForAstro.getFullYear()
        const fusionInput = {
          saju: simplePillars,
          astro: natalChart,
          natalInput: {
            year: birthDateObjForAstro.getFullYear(),
            month: birthDateObjForAstro.getMonth() + 1,
            date: birthDateObjForAstro.getDate(),
            hour: Number.isFinite(bH) ? bH : 12,
            minute: Number.isFinite(bM) ? bM : 0,
            latitude: 37.5665,
            longitude: 126.978,
            timeZone: timezone || 'Asia/Seoul',
          },
          age: ageAt,
          birthYear: birthDateObjForAstro.getFullYear(),
          daeunList: sajuResult.daeWoon.list.map((d) => ({
            stem: d.heavenlyStem,
            branch: d.earthlyBranch,
            startAge: d.age,
          })),
        }
        // Redis 캐시 — 같은 생일·같은 날짜 재호출 시 fusion 재계산 안 함
        const fusionResult = await cacheOrCalculate(
          fusionCacheKey,
          async () => {
            const dayRes = await buildCalendarDay(fusionInput, date)
            const hourlyRes = await buildCalendarHourly(fusionInput, date)
            const { buildCalendarMonth } = await import('@/lib/fusion/adapters')
            const [y, m] = date.split('-').map((v) => parseInt(v, 10))
            const monthRes = await buildCalendarMonth(fusionInput, y, m)
            const dayInMonth = monthRes.days.find((dd) => dd.date === date)
            return { dayRes, hourlyRes, dayInMonth }
          },
          CACHE_TTL.CALENDAR_DATA,
        )
        const { dayRes, hourlyRes, dayInMonth } = fusionResult
        fusionData = {
          overallScore: Math.round(
            (Object.values(dayRes.domainScores) as number[]).reduce((a, b) => a + b, 0)
            / Object.keys(dayRes.domainScores).length * 100,
          ),
          sajuAxisScore: dayInMonth?.sajuAxisScore ?? 50,
          astroAxisScore: dayInMonth?.astroAxisScore ?? 50,
          agreement: dayInMonth?.agreement ?? 50,
          confidence: dayInMonth?.confidence ?? 50,
          domainScores: Object.fromEntries(
            Object.entries(dayRes.domainScores).map(([k, v]) => [k, Math.round((v as number) * 100)]),
          ),
          advice: dayRes.advice,
          topInsights: dayRes.topInsights,
          hourly: {
            slots: hourlyRes.slots.map((s) => ({
              hour: s.hour,
              score: s.score,
              tone: s.tone,
              topDomain: s.topDomain,
              hourPillar: s.hourPillar
                ? `${s.hourPillar.stem}${s.hourPillar.branch}` : undefined,
              planetaryHour: s.planetaryHour,
              label: s.label,
            })),
            bestHours: hourlyRes.bestHours.map((s) => ({
              hour: s.hour,
              score: s.score,
              topDomain: s.topDomain,
              hourPillar: s.hourPillar ? `${s.hourPillar.stem}${s.hourPillar.branch}` : undefined,
              planetaryHour: s.planetaryHour,
            })),
            worstHours: hourlyRes.worstHours.map((s) => ({
              hour: s.hour,
              score: s.score,
              topDomain: s.topDomain,
              hourPillar: s.hourPillar ? `${s.hourPillar.stem}${s.hourPillar.branch}` : undefined,
              planetaryHour: s.planetaryHour,
            })),
            bestByDomain: hourlyRes.bestByDomain,
          },
        }
      } catch (fusionErr) {
        logger.warn('[calendar/date-detail] fusion analysis failed', {
          error: fusionErr instanceof Error ? fusionErr.message : String(fusionErr),
        })
      }

      const transitChart = await calculateTransitChart({
        iso: `${date}T12:00:00`,
        latitude: 37.5665,
        longitude: 126.978,
        timeZone: timezone || 'Asia/Seoul',
      })
      const aspects = findTransitAspects(transitChart, natalChart)
      const trimmed = (aspects || [])
        .slice()
        .sort((a, b) => Math.abs(a.orb) - Math.abs(b.orb))
        .slice(0, 6)
        .map((a) => ({
          transitPlanet: a.transitPlanet,
          natalPoint: a.natalPoint,
          aspect: a.type,
          orb: Math.abs(a.orb),
          isApplying: a.isApplying,
        }))
      // 역행 행성 — Mercury / Venus / Mars retrograde flags users care about.
      const retrogrades = (transitChart.planets || [])
        .filter((p) => p.retrograde === true)
        .map((p) => p.name)
      const summaryParts: string[] = []
      if (trimmed.length > 0) {
        summaryParts.push(
          `${trimmed.length}개 aspect — 가장 타이트: ${trimmed[0].transitPlanet} ${trimmed[0].aspect} ${trimmed[0].natalPoint} (오브 ${trimmed[0].orb.toFixed(1)}°)`
        )
      } else {
        summaryParts.push('본명 차트와 타이트한 트랜짓 aspect 없음')
      }
      if (retrogrades.length > 0) {
        summaryParts.push(`역행 중: ${retrogrades.join(', ')}`)
      }
      transitData = {
        aspects: trimmed,
        retrogrades: retrogrades.length > 0 ? retrogrades : undefined,
        summary: summaryParts.join(' · '),
      }

      // 타로 cross-reading 용 추가 필드 — 본명 angle + 오늘 달 위상
      try {
        const sun = natalChart.planets.find((p) => p.name === 'Sun')
        const moon = natalChart.planets.find((p) => p.name === 'Moon')
        natalAngles = {
          sun: sun ? { sign: sun.sign, formatted: sun.formatted } : undefined,
          moon: moon ? { sign: moon.sign, formatted: moon.formatted } : undefined,
          ascendant: natalChart.ascendant
            ? { sign: natalChart.ascendant.sign, formatted: natalChart.ascendant.formatted }
            : undefined,
        }
      } catch {
        // natal angles 추출 실패 — 컨텍스트만 비고 나머지는 그대로.
      }
      try {
        const { getMoonPhase, getMoonPhaseName } = await import(
          '@/lib/astrology/foundation/electional'
        )
        const transitSun = transitChart.planets?.find((p) => p.name === 'Sun')
        const transitMoon = transitChart.planets?.find((p) => p.name === 'Moon')
        if (transitSun && transitMoon) {
          const phase = getMoonPhase(transitSun.longitude, transitMoon.longitude)
          todayMoonPhase = { phase, name: getMoonPhaseName(phase) }
        }
      } catch {
        // moon phase 계산 실패 — 무시.
      }
    } catch (err) {
      logger.warn('[calendar/date-detail] transit aspect calc failed', {
        error: err instanceof Error ? err.message : String(err),
      })
    }

    return apiSuccess({
      date: detail.date,
      grade: canonicalGrade,
      score: canonicalScore,
      displayScore: canonicalDisplayScore,
      // 분석기가 따로 낸 점수 — UI는 안 쓰고 진단/모니터링 용
      analystGrade: detail.grade,
      analystScore: detail.score,
      categories: detail.categories,
      ganzhi: detail.ganzhi,
      transitSunSign: detail.transitSunSign,
      crossVerified: detail.crossVerified,
      crossAgreementPercent: detail.crossAgreementPercent,
      confidence: detail.confidence,
      confidenceNote: detail.confidenceNote,
      sajuFactorKeys: detail.sajuFactorKeys,
      astroFactorKeys: detail.astroFactorKeys,
      recommendationKeys: detail.recommendationKeys,
      warningKeys: detail.warningKeys,
      gongmangStatus: detail.gongmangStatus,
      shinsalActive: detail.shinsalActive,
      energyFlow: detail.energyFlow,
      bestHours: detail.bestHours,
      transitSync: detail.transitSync,
      activityScores: detail.activityScores,
      timeContext: detail.timeContext,
      astroAspectEvidence: detail.astroAspectEvidence,
      // 본명 사주 — 행동플래너가 시간 십신/시지 충 등 정확히 계산하려면 필요
      natalSaju: {
        dayStem: dayMasterStem,
        dayBranch,
        yearBranch,
        monthStem,
        monthBranch,
      },
      // 현재 대운 (10년 큰 흐름) — 타로 cross-reading 에서 장기 톤 anchor 용
      currentDaeun: sajuResult.daeWoon?.current
        ? {
            stem: sajuResult.daeWoon.current.heavenlyStem,
            branch: sajuResult.daeWoon.current.earthlyBranch,
            label: `${sajuResult.daeWoon.current.heavenlyStem}${sajuResult.daeWoon.current.earthlyBranch}`,
            sibsinCheon: sajuResult.daeWoon.current.sibsin?.cheon,
            sibsinJi: sajuResult.daeWoon.current.sibsin?.ji,
          }
        : undefined,
      // 본명 태양/달/ASC + 오늘 달 위상 — try 블록 안에서 채워둔 hoisted 변수 사용
      natalAngles,
      todayMoonPhase,
      longCycleContext: lite?.longCycleContext,
      cycleInteractions: lite?.cycleInteractions,
      transit: transitData,
      fusion: fusionData,
      hourlyTimeSlots: await (async () => {
        try {
          const { analyzeDayTimeSlots } = await import('@/lib/timing/ultra-precision-minute')
          const slots = analyzeDayTimeSlots(
            new Date(date + 'T00:00:00'),
            dayMasterStem,
            dayBranch
          )
          return {
            best: slots.best.slice(0, 4),
            worst: slots.worst.slice(0, 2),
          }
        } catch {
          return undefined
        }
      })(),
      natalContext,
      yongsinActivations: await (async () => {
        if (!natalContext?.yongsin?.primary) return undefined
        try {
          const { findYongsinActivationPeriods } = await import(
            '@/lib/timing/specificDateEngine'
          )
          // Look forward 60 days from the selected date and return the
          // top 5 strongest 용신 activation days. "이번 60일 안에 너의
          // 용신 화가 가장 살아나는 날" reading.
          const periods = findYongsinActivationPeriods(
            natalContext.yongsin.primary,
            dayMasterStem,
            new Date(date + 'T00:00:00'),
            60
          )
          const top = periods.slice(0, 5).map((p) => ({
            date:
              `${p.date.getFullYear()}-${String(p.date.getMonth() + 1).padStart(2, '0')}-${String(p.date.getDate()).padStart(2, '0')}`,
            score: p.score,
            level: p.activationLevel,
            sources: p.sources,
            advice: p.advice,
          }))
          return top.length > 0 ? { yongsin: natalContext.yongsin.primary, top } : undefined
        } catch (err) {
          logger.warn('[calendar/date-detail] yongsin activation calc failed', {
            error: err instanceof Error ? err.message : String(err),
          })
          return undefined
        }
      })(),
      lunarMansion: await (async () => {
        try {
          const { getLunarMansion } = await import('@/lib/timing/modules/lunarMansions')
          const dateObj = new Date(date + 'T00:00:00')
          const lm = getLunarMansion(dateObj)
          return {
            name: lm.name,
            nameKo: lm.nameKo,
            element: lm.element,
            animal: lm.animal,
            isAuspicious: lm.isAuspicious,
            goodFor: lm.goodFor,
            badFor: lm.badFor,
          }
        } catch {
          return undefined
        }
      })(),
    })
  },
  createPublicStreamGuard({
    route: 'calendar-date-detail',
    limit: 30,
    windowSeconds: 60,
  })
)
