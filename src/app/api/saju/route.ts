// src/app/api/saju/route.ts

import { NextRequest } from 'next/server'
import { toDate } from 'date-fns-tz'
import { prisma } from '@/lib/db/prisma'
import { calculateSajuData } from '@/lib/Saju/saju'
import { getCreditBalance } from '@/lib/credits/creditService'
import { apiClient } from '@/lib/api/ApiClient'
import { getNowInTimezone } from '@/lib/datetime'
import {
  getDaeunCycles,
  getAnnualCycles,
  getMonthlyCycles,
  getIljinCalendar,
} from '@/lib/Saju/unse'
import type { SajuPillars } from '@/lib/Saju/types'
import {
  getShinsalHits,
  getTwelveStagesForPillars,
  getTwelveShinsalSingleByPillar,
} from '@/lib/Saju/shinsal'
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/Saju/relations'
import { logger } from '@/lib/logger'
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/cache/redis-cache'

// Middleware imports
import {
  withApiMiddleware,
  createSajuGuard,
  parseJsonBody,
  validateRequired,
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
  formatSajuForGPT,
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
  } = validationResult.data

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

  const sajuGender = gender.toLowerCase() === 'female' ? ('female' as const) : ('male' as const)
  const sajuResult = calculateSajuData(
    birthDateString,
    adjustedBirthTime,
    sajuGender,
    calendarType,
    timezone,
    false
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
  const daeunInfo = getDaeunCycles(
    birthDate,
    sajuGender,
    sajuPillars,
    sajuResult.dayMaster,
    'Asia/Seoul'
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

  const gptPrompt = formatSajuForGPT({
    ...sajuResult,
    birthDate: birthDateString,
    daeun: daeunInfo,
  })

  const analysisDate = `${userNow.year}-${String(userNow.month).padStart(2, '0')}-${String(userNow.day).padStart(2, '0')}`
  const fullAdvancedAnalysis = advancedResult

  // 10. AI backend call (GPT) with caching
  let aiInterpretation = ''
  let aiModelUsed = ''

  // Cache key: birthDate + birthTime + gender + calendar + locale + premium status
  const aiCacheKey = `saju:ai:v1:${birthDateString}:${adjustedBirthTime}:${gender}:${calendarType}:${context.locale}:${isPremium ? 'premium' : 'free'}`

  const cachedAI = await cacheGet<{ interpretation: string; model: string }>(aiCacheKey)

  if (cachedAI) {
    aiInterpretation = cachedAI.interpretation
    aiModelUsed = cachedAI.model
  } else {
    try {
      const response = await apiClient.post(
        '/ask',
        {
          theme: 'saju',
          prompt: gptPrompt,
          saju: {
            dayMaster: sajuResult.dayMaster,
            fiveElements: sajuResult.fiveElements,
            pillars: simplePillars,
            daeun: daeunInfo,
            yeonun,
            wolun,
          },
          locale: context.locale,
          advancedSaju: isPremium ? fullAdvancedAnalysis : null,
        },
        { timeout: 90000 }
      )

      if (response.ok) {
        const data = (response.data as Record<string, unknown>)?.data as
          | Record<string, unknown>
          | undefined
        aiInterpretation = (data?.fusion_layer || data?.report || '') as string
        aiModelUsed = (data?.model || 'gpt-4o') as string

        // Cache the AI interpretation for 7 days
        await cacheSet(
          aiCacheKey,
          { interpretation: aiInterpretation, model: aiModelUsed },
          CACHE_TTL.SAJU_RESULT
        )
      }
    } catch (aiErr) {
      logger.warn('[Saju API] AI backend call failed:', aiErr)
      const dayMasterName = sajuResult.dayMaster?.name || ''
      aiInterpretation =
        context.locale === 'ko'
          ? `${dayMasterName} 일간으로 태어나셨습니다. 현재 AI 해석 서비스가 일시적으로 이용 불가합니다. 기본 사주 분석 결과를 확인해주세요.`
          : `You were born with ${dayMasterName} as your day master. AI interpretation is temporarily unavailable. Please check the basic Saju analysis results.`
      aiModelUsed = 'fallback'
    }
  }

  // 11. Save reading record (logged-in users only)
  if (context.userId) {
    try {
      await prisma.reading.create({
        data: {
          userId: context.userId,
          type: 'saju',
          title: `${sajuResult.dayMaster?.name || ''} 일간 사주 분석`,
          content: JSON.stringify({
            birthDate: birthDateString,
            birthTime: adjustedBirthTime,
            gender,
            timezone,
            dayMaster: sajuResult.dayMaster,
            fiveElements: sajuResult.fiveElements,
            pillars: {
              year: sajuResult.yearPillar,
              month: sajuResult.monthPillar,
              day: sajuResult.dayPillar,
              time: sajuResult.timePillar,
            },
          }),
        },
      })
    } catch (saveErr) {
      logger.warn('[Saju API] Failed to save reading:', saveErr)
    }
  }

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
    shinsalRaw: rawShinsal,
    relations,
    gptPrompt,
    aiInterpretation,
    aiModelUsed,
    advancedAnalysis: fullAdvancedAnalysis,
  })
}, createSajuGuard())
