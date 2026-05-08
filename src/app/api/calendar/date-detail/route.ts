/**
 * Calendar date-detail route
 *
 * GET /api/calendar/date-detail
 * Query: birthDate, birthTime?, gender?, date (YYYY-MM-DD), timezone?
 *
 * Runs the full per-date analyzer (사주/점성/다층/고급/일진) for ONE date.
 * The 365-day list still comes from /api/calendar (engine + matrix);
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
import { calculateSajuData } from '@/lib/Saju/saju'
import { STEM_TO_ELEMENT } from '@/lib/Saju/constants'
import { analyzeDate } from '@/lib/destiny-map/calendar/date-analysis-orchestrator'
import { calculateYearlyImportantDates } from '@/app/api/calendar/lib/yearlyDates'
import { getPillarStemName, getPillarBranchName } from '@/app/api/calendar/lib/helpers'
import { cacheOrCalculate, cacheGet, CacheKeys, CACHE_TTL } from '@/lib/cache/redis-cache'
import type { YearlyImportantDate } from '@/app/api/calendar/lib/yearlyDates'
import type { UserSajuProfile, UserAstroProfile } from '@/lib/destiny-map/calendar/types'

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

    // Advanced natal analysis — strength, geokguk, yongsin. The engine
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
      const { analyzeAdvancedSaju } = await import('@/lib/Saju/advancedAnalysis')
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
          secondary: advanced.yongsin.secondary ? String(advanced.yongsin.secondary) : undefined,
          type: String(advanced.yongsin.basis || ''),
          kibsin: kibsin || undefined,
        },
        summary: `${advanced.strength.level} ${advanced.geokguk.type}, 용신 ${advanced.yongsin.primary}${kibsin ? ` · 기신 ${kibsin}` : ''}`,
      }
      // Inject yongsin into sajuProfile so the engine's yongsin
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
    let yearlyForDay: YearlyImportantDate | undefined
    for (const cat of [
      '',
      'general',
      'career',
      'love',
      'wealth',
      'health',
      'travel',
      'study',
    ] as const) {
      const yk = CacheKeys.yearlyCalendar(
        birthDate,
        birthTime || '',
        sajuGender,
        yearOfDate,
        cat || undefined
      )
      const cached = await cacheGet<YearlyImportantDate[]>(yk)
      const hit = cached?.find((d) => d.date === date)
      if (hit) {
        yearlyForDay = hit
        break
      }
    }

    // 2) 캐시 없으면 같은 엔진 점수식으로 그 해 한 번 돌려서 사용 (point-of-truth는 엔진)
    const cacheKey = `cal-detail:v3:${birthDate}:${birthTime || ''}:${sajuGender}:${date}`
    const merged = await cacheOrCalculate(
      cacheKey,
      async () => {
        const detail = analyzeDate(targetDate, sajuProfile, astroProfile)
        if (!detail) return null
        let yearly = yearlyForDay
        if (!yearly) {
          const yearlyList = calculateYearlyImportantDates(yearOfDate, sajuProfile, astroProfile, {
            locale: 'ko',
            birthDate,
          })
          yearly = yearlyList.find((d) => d.date === detail.date)
        }
        return { detail, yearly }
      },
      CACHE_TTL.CALENDAR_DATA
    )
    if (!merged?.detail) {
      return apiError(ErrorCodes.SERVICE_UNAVAILABLE, 'Date analysis unavailable')
    }
    const { detail, yearly } = merged
    // 365 엔진 결과를 정답으로 — 365 뷰 grade와 detail grade가 어긋나지 않게
    const canonicalGrade = yearly?.grade ?? detail.grade
    const canonicalScore = yearly?.score ?? detail.score
    const canonicalDisplayScore = yearly?.displayScore ?? detail.displayScore ?? canonicalScore

    // ── Transit aspects on the selected date ──
    // Engine has the same transit module the rest of the app uses; cheap
    // to call once per selected date (Swiss ephemeris ~50ms). Aspect
    // longitudes are location-independent so Seoul defaults work fine —
    // we don't surface house cusps here.
    let transitData:
      | {
          aspects: Array<{
            transitPlanet: string
            natalPoint: string
            aspect: string
            orb: number
            isApplying: boolean
          }>
          retrogrades?: string[]
          summary?: string
        }
      | undefined
    try {
      const [{ calculateNatalChart, toChart }, { calculateTransitChart, findTransitAspects }] =
        await Promise.all([
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
      longCycleContext: yearly?.longCycleContext,
      cycleInteractions: yearly?.cycleInteractions,
      transit: transitData,
      hourlyTimeSlots: await (async () => {
        try {
          const { analyzeMinutePrecision } = await import('@/lib/prediction/ultra-precision-minute')

          // 그 날 트랜짓 aspect 중 가장 강한 우호/긴장 행성을 추출.
          // - 우호: trine·sextile·conjunction 중 오브가 가장 작은 것
          // - 긴장: square·opposition 중 오브가 가장 작은 것
          // 두 행성을 그 시간의 행성시 지배 행성과 매칭해서 시간대마다
          // bonus/penalty를 더한다 — 사주 시지(時支)·행성시·점성 트랜짓
          // 세 축이 모두 합의하는 시간대를 찾는 진짜 cross-validation.
          const aspects = transitData?.aspects ?? []
          const HARMONIOUS = new Set(['trine', 'sextile', 'conjunction'])
          const TENSE = new Set(['square', 'opposition'])
          const benevolent = aspects.find((a) => HARMONIOUS.has(a.aspect))
          const malevolent = aspects.find((a) => TENSE.has(a.aspect))

          const targetDateObj = new Date(date + 'T00:00:00')
          const allHours: Array<{
            hour: number
            sajuScore: number
            astroModifier: number
            finalScore: number
            ruler: string
            reason: string
            crossSources: string[]
          }> = []

          for (let h = 0; h < 24; h++) {
            const dt = new Date(targetDateObj)
            dt.setHours(h, 30, 0, 0)
            const sajuAnalysis = analyzeMinutePrecision(dt, dayMasterStem, dayBranch)
            const ruler = String(sajuAnalysis.planetaryHour?.planet || 'Unknown')
            let astroModifier = 0
            const sources: string[] = []
            if (benevolent && ruler === benevolent.transitPlanet) {
              const tightness = Math.max(0, 6 - benevolent.orb)
              astroModifier += Math.round(8 + tightness * 1.5)
              sources.push(
                `트랜짓 ${benevolent.transitPlanet} ${benevolent.aspect} ${benevolent.natalPoint}`
              )
            }
            if (malevolent && ruler === malevolent.transitPlanet) {
              const tightness = Math.max(0, 6 - malevolent.orb)
              astroModifier -= Math.round(7 + tightness * 1.3)
              sources.push(
                `트랜짓 ${malevolent.transitPlanet} ${malevolent.aspect} ${malevolent.natalPoint}`
              )
            }
            const finalScore = Math.max(0, Math.min(100, sajuAnalysis.score + astroModifier))
            const sajuTag = `${ruler}시 · ${sajuAnalysis.grade}등급`
            const reason =
              astroModifier > 0
                ? `${sajuTag} + 점성 우호 (+${astroModifier})`
                : astroModifier < 0
                  ? `${sajuTag} + 점성 긴장 (${astroModifier})`
                  : sajuTag
            allHours.push({
              hour: h,
              sajuScore: sajuAnalysis.score,
              astroModifier,
              finalScore,
              ruler,
              reason,
              crossSources: sources,
            })
          }

          const sorted = [...allHours].sort((a, b) => b.finalScore - a.finalScore)
          const best = sorted.slice(0, 4).map((h) => ({
            hour: h.hour,
            score: h.finalScore,
            reason: h.reason,
          }))
          const worst = sorted
            .slice(-2)
            .reverse()
            .map((h) => ({
              hour: h.hour,
              score: h.finalScore,
              reason: h.reason,
            }))

          // 시간대 차원에서 점성이 실제로 시간대 간 차이를 만들었는지
          // (같은 행성이 룰러인 시간대만 modifier 받음). UI는 이 플래그
          // 보고 "사주↔점성 교차" 라벨을 정직하게 띄우거나 숨길 수 있다.
          const crossActive = allHours.some((h) => h.astroModifier !== 0)

          return {
            best,
            worst,
            crossValidated: crossActive,
            crossSources: crossActive
              ? [
                  benevolent
                    ? `우호: ${benevolent.transitPlanet} ${benevolent.aspect} ${benevolent.natalPoint} (오브 ${benevolent.orb.toFixed(1)}°)`
                    : null,
                  malevolent
                    ? `긴장: ${malevolent.transitPlanet} ${malevolent.aspect} ${malevolent.natalPoint} (오브 ${malevolent.orb.toFixed(1)}°)`
                    : null,
                ].filter((x): x is string => x !== null)
              : undefined,
          }
        } catch {
          return undefined
        }
      })(),
      natalContext,
      yongsinActivations: await (async () => {
        if (!natalContext?.yongsin?.primary) return undefined
        try {
          const { findYongsinActivationPeriods } =
            await import('@/lib/prediction/specificDateEngine')
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
            date: `${p.date.getFullYear()}-${String(p.date.getMonth() + 1).padStart(2, '0')}-${String(p.date.getDate()).padStart(2, '0')}`,
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
          const { getLunarMansion } = await import('@/lib/prediction/modules/lunarMansions')
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
