// src/app/api/saju/route.ts

import { NextRequest } from 'next/server'
import { calculateSajuData } from '@/lib/saju/saju'
import { normalizeGender } from '@/lib/utils/gender'
import { cacheOrCalculate, CacheKeys, CACHE_TTL } from '@/lib/cache/redis-cache'
import { getCreditBalance } from '@/lib/credits/creditService'
import { getNowInTimezone } from '@/lib/datetime'
// 대운(daeun)은 더 이상 unse.getDaeunCycles 로 재계산하지 않는다 — single
// source 는 calculateSajuData 가 LMT/진경도 보정된 출생 instant 로 산출한
// sajuResult.daeWoon (determinism-golden 으로 잠긴 정답). 옛 코드는 raw(보정
// 전) instant 를 unse.getDaeunCycles 에 넘겨 절기 경계 출생자의 대운수가 ±1
// 어긋나고, 음력 출생은 solar 변환 전 날짜로 계산되는 divergence 가 있었다.
import { getAnnualCycles, getMonthlyCycles, getIljinCalendar } from '@/lib/saju/unse'
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
  performAnalyses,
} from './services'

/**
 * 대운(daeun) current 항목을 viewer 타임존 연도 기준으로 선택한다.
 *
 * saju.ts 의 daeWoon.current 는 출생 타임존의 "now" 연도로 선택되지만,
 * 연운/월운/일진은 viewer 타임존 연도로 산출된다. 1/1 경계에서 두 타임존의
 * "현재 연도"가 다르면 같은 화면에서 대운 current 가 연운과 한 해 어긋난다.
 * 이 헬퍼는 viewer 연도로 current 를 재선택해 일치시킨다.
 *
 * 선택 규칙은 saju.ts 와 동일: 한국식 나이(viewerYear - birthYear + 1)가
 * 진입 나이(d.age) 이상인 가장 높은(가장 늦게 진입한) 대운 항목.
 */
export function pickCurrentDaeun<T extends { age: number }>(
  list: readonly T[],
  viewerYear: number,
  birthYear: number,
  fallback: T | null
): T | null {
  if (!Number.isFinite(birthYear) || !Number.isFinite(viewerYear) || list.length === 0) {
    return fallback
  }
  const viewerAge = viewerYear - birthYear + 1
  return (
    list
      .slice()
      .reverse()
      .find((d) => viewerAge >= d.age) ?? list[0]
  )
}

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
  // 대운: single source = sajuResult.daeWoon. calculateSajuData 안에서
  // LMT/진경도 보정된 출생 instant + 절기-연도 롤백 로직으로 산출되어
  // determinism-golden 테스트로 잠긴 정답이다. 옛 코드는 여기서
  // unse.getDaeunCycles 를 raw(보정 전) instant 로 다시 호출해 같은 사람에게
  // 두 개의 대운수가 존재했고(절기 경계 ±1, 음력 solar 변환 누락), 서빙되는
  // 값은 보정 안 된 쪽이었다. 이제 보정된 daeWoon 하나만 서빙한다.
  //
  // 응답 shape 호환: 기존 소비자는 daeun.list (DaeunTimeline/CrossRefTable),
  // daeunsu(startAge) 를 읽는다. daeWoon 은 startAge/isForward/current/list
  // 를 갖고 있으므로 cycles/daeunsu 별칭만 추가해 모든 reader 를 만족시킨다.
  const userNow = getNowInTimezone(effectiveUserTz)

  // daeWoon.current 는 saju.ts 에서 출생 타임존("now")의 연도로 선택된다.
  // 하지만 연운/월운/일진(아래 yeonun/wolun/iljin)은 viewer 타임존 연도
  // (userNow.year)로 산출된다. 1/1 경계에서 한국 사주를 보는 미국 사용자처럼
  // 두 타임존의 "현재 연도"가 다르면, 같은 화면에서 대운 current 가 연운과
  // 한 해 어긋나 보인다. viewer 타임존 연도로 current 를 재선택해 일치시킨다.
  // 선택 로직은 saju.ts 와 동일: 한국식 나이(현재연도 - 출생연도 + 1)가
  // 진입 나이(d.age) 이상인 가장 높은 대운 항목.
  const birthYear = Number(birthDateString.slice(0, 4))
  const daeunList = sajuResult.daeWoon.list
  const daeunCurrent = pickCurrentDaeun(
    daeunList,
    userNow.year,
    birthYear,
    sajuResult.daeWoon.current
  )

  const daeunInfo = {
    startAge: sajuResult.daeWoon.startAge,
    daeunsu: sajuResult.daeWoon.startAge,
    isForward: sajuResult.daeWoon.isForward,
    current: daeunCurrent,
    list: daeunList,
    cycles: daeunList,
  }
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

  const advancedResult = performAnalyses(
    simplePillars,
    pillarsWithHour,
    dayMasterStem,
    sajuResult.monthPillar.earthlyBranch.name,
  )

  const analysisDate = `${userNow.year}-${String(userNow.month).padStart(2, '0')}-${String(userNow.day).padStart(2, '0')}`
  const fullAdvancedAnalysis = advancedResult

  // 12. Return success response
  return apiSuccess({
    isPremium,
    isLoggedIn: context.isAuthenticated,
    // birthYear = 출생지 그레고리력 연도. 옛 코드 new Date("YYYY-MM-DD")
    // 는 자정 UTC 로 파싱돼 음수 offset 서버 TZ 에서 전년으로 어긋났다
    // (예: LA 서버에서 1990-01-01 → 1989). 입력 문자열의 연도 4자리를 직접
    // 쓰면 TZ 무관하게 사용자가 입력한 달력 연도를 그대로 보존한다.
    // (UI 의 currentAge = thisYear − birthYear 용도라 그레고리 연도가 정답.)
    birthYear: Number(birthDateString.slice(0, 4)),
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
    analyses: fullAdvancedAnalysis,
  })
}, createSajuGuard())
