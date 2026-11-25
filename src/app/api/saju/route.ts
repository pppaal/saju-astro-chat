// src/app/api/saju/route.ts

import { NextRequest } from 'next/server'
import { calculateSajuData } from '@/lib/saju/saju'
import { normalizeGender } from '@/lib/utils/gender'
import { cacheOrCalculate, CacheKeys, CACHE_TTL } from '@/lib/cache/redis-cache'
import { getCreditBalance } from '@/lib/credits/creditService'
import { getNowInTimezone } from '@/lib/datetime'
// 대운(daeun) single source 는 calculateSajuData 의 sajuResult.daeWoon — 생 UT 출생
// instant 와 절입 instant 비교(OD-1)로 산출해 골든으로 잠긴 값이다. 옛 별도 경로
// (unse.getDaeunCycles)는 2026-06 제거. 현재 대운만 요청마다 currentDaeun 으로 다시 고른다.
import { getAnnualCycles, getMonthlyCycles, getIljinCalendar } from '@/lib/saju/unse'
import { currentDaeun, parseCivilDate } from '@/lib/saju/daeunAge'
import { resolveBirthTimeAnchor } from '@/lib/saju/birthTimeAnchor'
import type { MaybeTimeless, SajuPillars } from '@/lib/saju/types'
import {
  getShinsalHits,
  getTwelveStagesForPillars,
  getTwelveShinsalSingleByPillar,
} from '@/lib/saju/shinsal'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/saju/relations'
import { logger } from '@/lib/logger'
import { withSpan } from '@/lib/telemetry'

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
    birthTimeUnknown: birthTimeUnknownFlag,
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
  // 요청 시각 — 경계(라우트)에서 한 번 읽어 엔진·운세 계산에 주입한다(CLAUDE.md 결정론).
  const now = new Date()
  const effectiveUserTz = userTimezone || timezone
  // 출생시각 미상 — 앱 나머지와 같은 규약: 빈 시각 또는 명시 플래그(birthTimeUnknown).
  // 계산 앵커는 정오(TIME_UNKNOWN_ANCHOR)로 년·월·일주만 고정하고, 시주는 응답에 내지
  // 않으며 오행·신살·12운성·관계·고급 분석은 년·월·일 삼주로 한다(CONVENTIONS §5, OD-5).
  // 클라이언트는 resolveBirthTimeAnchor 로 tri-state 를 이미 풀어 플래그를 보내므로,
  // 여기서는 '00:00' 레거시 휴리스틱을 다시 적용하지 않는다(실제 자정 출생 보호).
  const { time: adjustedBirthTime, timeUnknown } = resolveBirthTimeAnchor(
    String(birthTimeRaw ?? ''),
    birthTimeUnknownFlag === true
  )

  // 'F' / 'Female' / 'female' / 'f' 다 처리하는 공용 normalizer 사용.
  // 기존 `gender.toLowerCase() === 'female'` 패턴은 'F'(한 글자) 가 'f' 로
  // 떨어져 'female' 매칭 실패 → 여자 사용자 'male' 로 잘못 분류 → 대운
  // 순/역행이 거꾸로 가던 회귀.
  const sajuGender: 'male' | 'female' = normalizeGender(gender) === 'female' ? 'female' : 'male'
  // 사주 결과 Redis 캐시 — 생년월일·시간·성별·달력타입 같으면 같은 사주.
  // 30일 TTL (NATAL_CHART) — 원국(네 기둥·대운 목록)은 immutable. 캐시 hit 시 Swiss
  // Ephemeris / 절기 lookup 등 ~150ms CPU 일 통째 절약. 이벤트 트래픽 시
  // 동일 사용자 재방문 / 가족 같은 생년월일 등에서 95%+ hit 기대.
  // 키 prefix 에 SAJU_ENGINE_VERSION(CacheKeys.saju) — 엔진 산식이 바뀌면 옛 결과를 안 쓴다.
  // 캐시 값 중 now 에 의존하는 daeWoon.current 는 아래 5단계에서 요청마다 다시 고른다
  // (엔진 감사 E14 · SAJU-8 — 예전엔 30일 동안 대운 경계 생일을 넘겨도 옛 current 가 나갔다).
  // longitude 가 캐시 키에 들어가야 — 진경도 보정 결과가 도시별로 다르기 때문.
  // 옛 키(longitude 없음) 도 그대로 hit 되도록 별도 segment 로 추가.
  const lonKey =
    typeof longitude === 'number' && Number.isFinite(longitude)
      ? `:lon=${longitude.toFixed(4)}`
      : ''
  // 시간 미상은 정오 앵커라 실제 정오 출생과 키가 같아진다 — 결과(6글자 오행)가 다르므로
  // :tu segment 로 분리한다.
  const tuKey = timeUnknown ? ':tu' : ''
  const sajuResult = await cacheOrCalculate(
    `${CacheKeys.saju(birthDateString, adjustedBirthTime, sajuGender, calendarType, timezone, lunarLeap)}${lonKey}${tuKey}`,
    // Span: Swiss-Ephemeris/사주 핵심 계산. cacheOrCalculate 콜백이라 캐시
    // 미스(=실제 계산)일 때만 실행되어 compute 비용만 정확히 잡힌다.
    async () =>
      withSpan('saju.calculate', 'function', async () =>
        calculateSajuData(
          birthDateString,
          adjustedBirthTime,
          sajuGender,
          calendarType,
          timezone,
          lunarLeap,
          longitude,
          now,
          { timeUnknown }
        )
      ),
    CACHE_TTL.NATAL_CHART
  )

  // 4. Build Saju pillars — 시간 미상이면 time 이 null(정오 앵커 시주는 날짜 고정용 자리표시라
  // 신살·12운성·관계 입력으로 흘리지 않는다).
  const sajuPillars: MaybeTimeless<SajuPillars> = {
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
    time: timeUnknown
      ? null
      : {
          heavenlyStem: withYY(sajuResult.timePillar.heavenlyStem),
          earthlyBranch: toBranch(sajuResult.timePillar.earthlyBranch),
          jijanggan: sajuResult.timePillar.jijanggan,
        },
  }

  // 5. Calculate fortune cycles (운세)
  // 대운: single source = sajuResult.daeWoon (목록·대운수·방향). 응답 shape 호환 —
  // 기존 소비자는 daeun.list (DaeunTimeline/CrossRefTable), daeunsu(startAge) 를 읽으므로
  // cycles/daeunsu 별칭을 둔다.
  const userNow = getNowInTimezone(effectiveUserTz, now)

  // 현재 대운은 캐시된 값(계산 시점의 now)을 쓰지 않고 요청 시각으로 다시 고른다 —
  // 엔진과 같은 순수 함수 currentDaeun(출생지 민용 생일 기준 만 나이, CONVENTIONS §14).
  // 첫 대운 전이면 current = null + preDaeun {startsAtAge}(OD-12). 민용 생일은 엔진이
  // meta.civilBirthDate 로 싣는다(음력 입력이면 변환된 양력). meta 가 없는 옛 결과는
  // 양력 입력만 입력 날짜로 다시 고르고, 음력이면 캐시된 current 를 그대로 둔다.
  const daeunList = sajuResult.daeWoon.list
  const civilBirth =
    parseCivilDate(sajuResult.meta?.civilBirthDate ?? '') ??
    (calendarType === 'solar' ? parseCivilDate(birthDateString) : null)
  const daeunNow = civilBirth
    ? currentDaeun(daeunList, civilBirth, sajuResult.meta?.timeZone ?? timezone, now)
    : { current: sajuResult.daeWoon.current, preDaeun: sajuResult.daeWoon.preDaeun ?? null }

  const daeunInfo = {
    startAge: sajuResult.daeWoon.startAge,
    daeunsu: sajuResult.daeWoon.startAge,
    isForward: sajuResult.daeWoon.isForward,
    current: daeunNow.current,
    preDaeun: daeunNow.preDaeun,
    list: daeunList,
    cycles: daeunList,
  }
  const yeonun = getAnnualCycles(userNow.year, 10, sajuResult.dayMaster)
  const wolun = getMonthlyCycles(userNow.year, sajuResult.dayMaster)
  const iljin = getIljinCalendar(userNow.year, userNow.month, sajuResult.dayMaster)

  // 6. Calculate 12운성/신살/길성 — 시간 미상이면 년·월·일 삼주만(시주 키 없음).
  const twelveStages = getTwelveStagesForPillars(sajuPillars)

  // ruleSet 'your' 는 현침 한 칸(일간 辛 → 未)만 바꾼다. 귀문관은 룰셋과 무관하게
  // 정통 6쌍(일지·년지 기준) 하나 — 예전 'your' 귀문 변형(월지 삼합국)은 제거됐다.
  const twelveShinsalSingle = getTwelveShinsalSingleByPillar(sajuPillars, {
    includeTwelveAll: true,
    ruleSet: 'your',
  })

  const rawShinsal = getShinsalHits(sajuPillars, {
    includeTwelveAll: true,
    includeGeneralShinsal: true,
    includeLuckyDetails: true,
    ruleSet: 'your',
  })

  // 7. Build display data by pillar
  const dayMasterStem = sajuResult.dayPillar.heavenlyStem.name

  // 시주 칸은 시각을 알 때만 만든다(아래 byPillar) — 미상이면 byPillar.time = null.
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
    time: timeUnknown ? null : buildPillar('time'),
    day: buildPillar('day'),
    month: buildPillar('month'),
    year: buildPillar('year'),
  }

  // 8. Analyze relations — 시간 미상이면 시주 없이(삼주) 합충형파해·원진·공망을 찾는다.
  const relationsInput = toAnalyzeInputFromSaju(
    {
      year: sajuResult.yearPillar,
      month: sajuResult.monthPillar,
      day: sajuResult.dayPillar,
      time: timeUnknown ? null : sajuResult.timePillar,
    },
    sajuResult.dayPillar.heavenlyStem.name
  )
  const relations = analyzeRelations(relationsInput)

  // 9. Advanced analysis — 격국·용신·형충·통근·십신을 시간 미상이면 삼주(time/hour = null)로.
  const timePillarSimple = timeUnknown
    ? null
    : {
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
    sajuResult.monthPillar.earthlyBranch.name
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
    // 시간 미상 — 시주는 null(정오 앵커 시주를 지어내지 않는다), fiveElements 는 6글자.
    timeUnknown,
    yearPillar: sajuResult.yearPillar,
    monthPillar: sajuResult.monthPillar,
    dayPillar: sajuResult.dayPillar,
    timePillar: timeUnknown ? null : sajuResult.timePillar,
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
