// src/app/api/saju/route.ts

import { NextRequest } from 'next/server'
import { toDate } from 'date-fns-tz'
import { calculateSajuData } from '@/lib/saju/saju'
import { normalizeGender } from '@/lib/utils/gender'
import { cacheOrCalculate, CacheKeys, CACHE_TTL } from '@/lib/cache/redis-cache'
import { getCreditBalance } from '@/lib/credits/creditService'
import { getNowInTimezone } from '@/lib/datetime'
import {
  getDaeunCycles,
  getAnnualCycles,
  getMonthlyCycles,
  getIljinCalendar,
} from '@/lib/saju/unse'
import type { SajuPillars } from '@/lib/saju/types'
import {
  getShinsalHits,
  getTwelveStagesForPillars,
  getTwelveShinsalSingleByPillar,
} from '@/lib/saju/shinsal'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/saju/relations'
import { logger } from '@/lib/logger'

// Middleware imports
import {
  withApiMiddleware,
  createSajuGuard,
  parseJsonBody,
  apiError,
  apiSuccess,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import type { SajuRequestBody } from '@/lib/api/types'
import { sajuCalculationRequestSchema } from '@/lib/api/zodValidation'

// Services
import {
  checkPremiumStatus,
  withYY,
  toBranch,
  pickLucky,
  coerceJijanggan,
  enrichSibsin,
  buildJijangganRaw,
  performAdvancedAnalysis,
} from './services'

/* -----------------------------
   Handler
------------------------------*/
export const POST = withApiMiddleware(async (req: NextRequest, context: ApiContext) => {
  // 1. Parse and validate request body
  const rawBody = await parseJsonBody<SajuRequestBody>(req)

  // Validate with Zod
  const validationResult = sajuCalculationRequestSchema.safeParse(rawBody)
  if (!validationResult.success) {
    logger.warn('[Saju] validation failed', { errors: validationResult.error.issues })
    return apiError(
      ErrorCodes.VALIDATION_ERROR,
      `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
    )
  }

  const {
    birthDate: birthDateString,
    birthTime: birthTimeRaw,
    gender,
    calendarType,
    timezone,
    userTimezone,
    lunarLeap: lunarLeapRaw,
    longitude,
  } = validationResult.data
  // calendarType==='solar' 인데 lunarLeap=true 가 들어와도 무시되도록 정규화.
  const lunarLeap = calendarType === 'lunar' && lunarLeapRaw === true

  // 2. Check premium status (credit-based)
  let isPremium = false
  let creditBalance = null

  if (context.userId) {
    // 초기 사주 분석은 무료 (크레딧 차감 없음)
    creditBalance = await getCreditBalance(context.userId)
    isPremium = creditBalance.plan !== 'free'
  } else if (context.session?.user?.email) {
    // 비로그인 사용자: 기존 Stripe 체크 (호환성)
    isPremium = await checkPremiumStatus(context.session.user.email, context.ip)
  }

  // 3. Calculate Saju
  const effectiveUserTz = userTimezone || timezone
  const birthDate = toDate(`${birthDateString}T${birthTimeRaw}:00`, { timeZone: timezone })
  const adjustedBirthTime = String(birthTimeRaw)

  // 'F' / 'Female' / 'female' / 'f' 다 처리하는 공용 normalizer 사용.
  // 기존 `gender.toLowerCase() === 'female'` 패턴은 'F'(한 글자) 가 'f' 로
  // 떨어져 'female' 매칭 실패 → 여자 사용자 'male' 로 잘못 분류 → 대운
  // 순/역행이 거꾸로 가던 회귀.
  const sajuGender: 'male' | 'female' = normalizeGender(gender) === 'female' ? 'female' : 'male'
  // 사주 결과 Redis 캐시 — 생년월일·시간·성별·달력타입 같으면 같은 사주.
  // 30일 TTL (NATAL_CHART) — 사주 데이터는 immutable. 캐시 hit 시 Swiss
  // Ephemeris / 절기 lookup 등 ~150ms CPU 일 통째 절약. 이벤트 트래픽 시
  // 동일 사용자 재방문 / 가족 같은 생년월일 등에서 95%+ hit 기대.
  // longitude 가 캐시 키에 들어가야 — 진경도 보정 결과가 도시별로 다르기 때문.
  // 옛 키(longitude 없음) 도 그대로 hit 되도록 별도 segment 로 추가.
  const lonKey =
    typeof longitude === 'number' && Number.isFinite(longitude)
      ? `:lon=${longitude.toFixed(4)}`
      : ''
  const sajuResult = await cacheOrCalculate(
    `${CacheKeys.saju(birthDateString, adjustedBirthTime, sajuGender, calendarType, timezone, lunarLeap)}${lonKey}`,
    async () =>
      calculateSajuData(
        birthDateString,
        adjustedBirthTime,
        sajuGender,
        calendarType,
        timezone,
        lunarLeap,
        longitude
      ),
    CACHE_TTL.NATAL_CHART
  )

  // 4. Build Saju pillars
  const sajuPillars: SajuPillars = {
    year: {
      heavenlyStem: withYY(sajuResult.yearPillar.heavenlyStem),
      earthlyBranch: toBranch(sajuResult.yearPillar.earthlyBranch),
      jijanggan: sajuResult.yearPillar.jijanggan,
    },
    month: {
      heavenlyStem: withYY(sajuResult.monthPillar.heavenlyStem),
      earthlyBranch: toBranch(sajuResult.monthPillar.earthlyBranch),
      jijanggan: sajuResult.monthPillar.jijanggan,
    },
    day: {
      heavenlyStem: withYY(sajuResult.dayPillar.heavenlyStem),
      earthlyBranch: toBranch(sajuResult.dayPillar.earthlyBranch),
      jijanggan: sajuResult.dayPillar.jijanggan,
    },
    time: {
      heavenlyStem: withYY(sajuResult.timePillar.heavenlyStem),
      earthlyBranch: toBranch(sajuResult.timePillar.earthlyBranch),
      jijanggan: sajuResult.timePillar.jijanggan,
    },
  }

  // 5. Calculate fortune cycles (운세)
  // birthDate 는 이미 UTC instant (toDate 결과). 옛 코드는 5번째 인자에
  // 'Asia/Seoul' 하드코딩 → unse.ts 의 normalizeBirthToUTC 가 비한국 출생자
  // 의 UTC instant 를 KST 로 잘못 재해석 (S2). normalizeBirthToUTC 는 PR
  // #1019 에서 identity 로 fix 됐고 timezone 인자도 unused 지만 BC 위해
  // 정확한 timezone 전달.
  const daeunInfo = getDaeunCycles(
    birthDate,
    sajuGender,
    sajuPillars,
    sajuResult.dayMaster,
    timezone
  )
  const userNow = getNowInTimezone(effectiveUserTz)
  const yeonun = getAnnualCycles(userNow.year, 10, sajuResult.dayMaster)
  const wolun = getMonthlyCycles(userNow.year, sajuResult.dayMaster)
  const iljin = getIljinCalendar(userNow.year, userNow.month, sajuResult.dayMaster)

  // 6. Calculate 12운성/신살/길성
  const twelveStages = getTwelveStagesForPillars(sajuPillars)

  const twelveShinsalSingle = getTwelveShinsalSingleByPillar(sajuPillars, {
    includeTwelveAll: true,
    useMonthCompletion: false,
    ruleSet: 'your',
  })

  const rawShinsal = getShinsalHits(sajuPillars, {
    includeLucky: true,
    includeUnlucky: true,
    includeTwelveAll: true,
    useMonthCompletion: false,
    includeGeneralShinsal: true,
    includeLuckyDetails: true,
    ruleSet: 'your',
  })

  // 7. Build display data by pillar
  const dayMasterStem = sajuResult.dayPillar.heavenlyStem.name

  const buildPillar = (pillar: 'time' | 'day' | 'month' | 'year') => {
    const p = sajuResult[`${pillar}Pillar` as const]
    const jgRaw = buildJijangganRaw(p.jijanggan)
    const jgObj = enrichSibsin(coerceJijanggan(p.jijanggan), dayMasterStem)
    const display = (['chogi', 'junggi', 'jeonggi'] as const)
      .map((k) => {
        const it = jgObj[k]
        if (!it?.name) return ''
        const han = it.name
        const sib = it.sibsin ? `(${it.sibsin})` : ''
        return `${han}${sib}`
      })
      .filter(Boolean)
      .join(' · ')
    const shinsalKinds = rawShinsal.filter((h) => h.pillars.includes(pillar)).map((h) => h.kind)

    return {
      stem: p.heavenlyStem.name,
      branch: p.earthlyBranch.name,
      jijanggan: {
        raw: jgRaw.raw,
        list: jgRaw.list,
        display,
        object: jgObj,
      },
      twelveStage: twelveStages[pillar],
      twelveShinsal: Array.isArray(twelveShinsalSingle[pillar])
        ? twelveShinsalSingle[pillar]
        : [twelveShinsalSingle[pillar]].filter(Boolean),
      lucky: pickLucky(rawShinsal, pillar),
      shinsal: shinsalKinds,
      shinsalSummary: pickLucky(rawShinsal, pillar).join('·'),
    }
  }

  const byPillar = {
    time: buildPillar('time'),
    day: buildPillar('day'),
    month: buildPillar('month'),
    year: buildPillar('year'),
  }

  // 8. Analyze relations
  const relationsInput = toAnalyzeInputFromSaju(
    {
      year: sajuResult.yearPillar,
      month: sajuResult.monthPillar,
      day: sajuResult.dayPillar,
      time: sajuResult.timePillar,
    },
    sajuResult.dayPillar.heavenlyStem.name
  )
  const relations = analyzeRelations(relationsInput)

  // 9. Advanced analysis
  const timePillarSimple = {
    stem: sajuResult.timePillar.heavenlyStem.name,
    branch: sajuResult.timePillar.earthlyBranch.name,
  }
  const simplePillars = {
    year: {
      stem: sajuResult.yearPillar.heavenlyStem.name,
      branch: sajuResult.yearPillar.earthlyBranch.name,
    },
    month: {
      stem: sajuResult.monthPillar.heavenlyStem.name,
      branch: sajuResult.monthPillar.earthlyBranch.name,
    },
    day: {
      stem: sajuResult.dayPillar.heavenlyStem.name,
      branch: sajuResult.dayPillar.earthlyBranch.name,
    },
    time: timePillarSimple,
    hour: timePillarSimple,
  }
  const pillarsWithHour = {
    year: simplePillars.year,
    month: simplePillars.month,
    day: simplePillars.day,
    hour: simplePillars.time,
  }

  const advancedResult = performAdvancedAnalysis(
    simplePillars,
    pillarsWithHour,
    sajuPillars,
    dayMasterStem,
    sajuResult.monthPillar.earthlyBranch.name,
    twelveStages,
    sajuResult.fiveElements
  )

  const analysisDate = `${userNow.year}-${String(userNow.month).padStart(2, '0')}-${String(userNow.day).padStart(2, '0')}`
  const fullAdvancedAnalysis = advancedResult

  // 12. Return success response
  return apiSuccess({
    isPremium,
    isLoggedIn: context.isAuthenticated,
    birthYear: new Date(birthDateString).getFullYear(),
    birthDate: birthDateString,
    analysisDate,
    userTimezone: effectiveUserTz,
    yearPillar: sajuResult.yearPillar,
    monthPillar: sajuResult.monthPillar,
    dayPillar: sajuResult.dayPillar,
    timePillar: sajuResult.timePillar,
    fiveElements: sajuResult.fiveElements,
    dayMaster: sajuResult.dayMaster,
    daeun: daeunInfo,
    yeonun,
    wolun,
    iljin,
    table: { byPillar },
    shinsal: (rawShinsal || [])
      .map((h) => {
        const first = h.pillars?.[0]
        const scope =
          first === 'year'
            ? '연주'
            : first === 'month'
              ? '월주'
              : first === 'day'
                ? '일주'
                : first === 'time'
                  ? '시주'
                  : ''
        return {
          name: h.kind,
          scope,
          from: h.target ?? '',
          to: '',
          note: h.detail ?? '',
        }
      })
      .filter((x) => x.name && x.scope),
    relations,
    advancedAnalysis: fullAdvancedAnalysis,
  })
}, createSajuGuard())
