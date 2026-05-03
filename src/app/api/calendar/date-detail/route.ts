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
import { calculateSajuData } from '@/lib/Saju/saju'
import { STEM_TO_ELEMENT } from '@/lib/Saju/constants'
import { analyzeDate } from '@/lib/destiny-map/calendar/date-analysis-orchestrator'
import { calculateYearlyImportantDatesLite } from '@/app/api/calendar/lib/liteYearlyDates'
import { getPillarStemName, getPillarBranchName } from '@/app/api/calendar/lib/helpers'
import { cacheOrCalculate, cacheGet, CacheKeys, CACHE_TTL } from '@/lib/cache/redis-cache'
import type { LiteImportantDate } from '@/app/api/calendar/lib/liteYearlyDates'
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
    let liteForDay: LiteImportantDate | undefined
    for (const cat of ['', 'general', 'career', 'love', 'wealth', 'health', 'travel', 'study'] as const) {
      const yk = CacheKeys.yearlyCalendar(birthDate, birthTime || '', sajuGender, yearOfDate, cat || undefined)
      const cached = await cacheGet<LiteImportantDate[]>(yk)
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
          const liteList = calculateYearlyImportantDatesLite(
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
    })
  },
  createPublicStreamGuard({
    route: 'calendar-date-detail',
    limit: 30,
    windowSeconds: 60,
  })
)
