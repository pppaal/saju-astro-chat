// src/app/api/life-prediction/route.ts
// 종합 인생 예측 API - 다년간 트렌드 + 과거 회고 + 이벤트 타이밍
// TIER 1~3 고급 분석 엔진 통합

import { NextRequest } from 'next/server'
import {
  analyzeMultiYearTrend,
  analyzePastDate,
  analyzePastPeriod,
  findOptimalEventTiming,
  findWeeklyOptimalTiming,
  generateComprehensivePrediction,
  generateLifePredictionPromptContext,
  generateEventTimingPromptContext,
  generatePastAnalysisPromptContext,
} from '@/lib/prediction'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'

// Response builders
import { createSuccessResponse, createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'

// Date formatters
import { formatDateToISO } from '@/lib/prediction/utils'

// Type definitions
import type { PredictionRequest, WeeklyTimingRequest } from './types'

// Service layer
import {
  performAdvancedAnalysis,
  analyzeYearWithAdvanced,
  generateAdvancedPromptContext,
  buildPredictionInput,
} from './services'

// Zod validation
import { lifePredictionRequestSchema } from '@/lib/api/zodValidation'

// ============================================================
// API 핸들러
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers)
    const limit = await rateLimit(`life-predict:${ip}`, { limit: 10, windowSeconds: 60 })
    if (!limit.allowed) {
      return createErrorResponse({
        code: ErrorCodes.RATE_LIMITED,
        message: 'Too many requests. Try again soon.',
        headers: limit.headers,
      })
    }

    const rawBody = (await request.json()) as PredictionRequest

    // Zod 유효성 검사
    const validationResult = lifePredictionRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Life prediction] validation failed', { errors: validationResult.error.issues })
      return createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Validation failed',
        details: validationResult.error.issues.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      })
    }

    const body = validationResult.data as PredictionRequest

    const input = buildPredictionInput(body)
    const locale = body.locale || 'ko'

    switch (body.type) {
      case 'multi-year': {
        const { startYear, endYear } = body

        if (!startYear || !endYear) {
          return createErrorResponse({
            code: ErrorCodes.BAD_REQUEST,
            message: 'startYear and endYear are required for multi-year analysis',
          })
        }

        const trend = analyzeMultiYearTrend(input, startYear, endYear)

        // TIER 1~3 고급 분석 추가 (주요 연도별)
        const peakYearsAnalysis = trend.peakYears
          .slice(0, 3)
          .map((year) => analyzeYearWithAdvanced(body, input, year))
        const currentYearAnalysis = performAdvancedAnalysis(body, input, new Date())

        const promptContext =
          generateLifePredictionPromptContext(
            {
              input,
              generatedAt: new Date(),
              multiYearTrend: trend,
              upcomingHighlights: [],
              confidence: 85,
            },
            locale
          ) + generateAdvancedPromptContext(currentYearAnalysis, locale)

        return createSuccessResponse(
          {
            trend,
            summary: trend.summary,
            peakYears: trend.peakYears,
            lowYears: trend.lowYears,
            daeunTransitions: trend.daeunTransitions,
            lifeCycles: trend.lifeCycles,
            advancedAnalysis: {
              currentYear: currentYearAnalysis,
              peakYearsInsights: peakYearsAnalysis,
            },
          },
          { meta: { type: 'multi-year', promptContext } }
        )
      }

      case 'past-analysis': {
        const { targetDate, startDate, endDate } = body

        if (targetDate) {
          // 단일 날짜 분석
          const date = new Date(targetDate)
          if (isNaN(date.getTime())) {
            return createErrorResponse({
              code: ErrorCodes.INVALID_DATE,
              message: 'Invalid date format. Use YYYY-MM-DD',
              details: { field: 'targetDate' },
            })
          }

          const retrospective = analyzePastDate(input, date)

          // TIER 1~3 고급 분석 추가
          const advancedAnalysis = performAdvancedAnalysis(body, input, date)

          const promptContext =
            generatePastAnalysisPromptContext(retrospective, locale) +
            generateAdvancedPromptContext(advancedAnalysis, locale)

          return createSuccessResponse(
            {
              ...retrospective,
              advancedAnalysis,
            },
            { meta: { type: 'past-analysis', mode: 'single', promptContext } }
          )
        } else if (startDate && endDate) {
          // 기간 분석
          const start = new Date(startDate)
          const end = new Date(endDate)

          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return createErrorResponse({
              code: ErrorCodes.INVALID_DATE,
              message: 'Invalid date format. Use YYYY-MM-DD',
              details: { field: 'date' },
            })
          }

          // 최대 30일로 제한
          const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
          if (daysDiff > 30) {
            return createErrorResponse({
              code: ErrorCodes.BAD_REQUEST,
              message: 'Period cannot exceed 30 days',
            })
          }

          const retrospectives = analyzePastPeriod(input, start, end)

          // 기간의 첫날, 마지막날, 가장 좋은/나쁜 날에 대한 고급 분석
          const bestDay = retrospectives.reduce((best, r) => (r.score > best.score ? r : best))
          const worstDay = retrospectives.reduce((worst, r) => (r.score < worst.score ? r : worst))

          const advancedInsights = {
            periodStart: performAdvancedAnalysis(body, input, start),
            periodEnd: performAdvancedAnalysis(body, input, end),
            bestDayAnalysis: performAdvancedAnalysis(body, input, bestDay.targetDate),
            worstDayAnalysis: performAdvancedAnalysis(body, input, worstDay.targetDate),
          }

          const summary = {
            totalDays: retrospectives.length,
            averageScore: Math.round(
              retrospectives.reduce((sum, r) => sum + r.score, 0) / retrospectives.length
            ),
            bestDay,
            worstDay,
          }

          return createSuccessResponse(
            {
              retrospectives,
              summary,
              advancedInsights,
            },
            { meta: { type: 'past-analysis', mode: 'period' } }
          )
        } else {
          return createErrorResponse({
            code: ErrorCodes.BAD_REQUEST,
            message: 'Either targetDate or both startDate and endDate are required',
          })
        }
      }

      case 'event-timing': {
        const { eventType, startYear, endYear } = body

        if (!eventType) {
          return createErrorResponse({
            code: ErrorCodes.MISSING_FIELD,
            message:
              'eventType is required (marriage, career, investment, move, study, health, relationship)',
          })
        }

        if (!startYear || !endYear) {
          return createErrorResponse({
            code: ErrorCodes.MISSING_FIELD,
            message: 'startYear and endYear are required',
          })
        }

        const result = findOptimalEventTiming(input, eventType, startYear, endYear)

        // 최적 기간들에 대한 TIER 1~3 고급 분석
        const optimalPeriodsWithAdvanced = result.optimalPeriods.slice(0, 3).map((period) => {
          const analysis = performAdvancedAnalysis(body, input, period.startDate)
          return {
            ...period,
            startDate: formatDateToISO(period.startDate),
            endDate: formatDateToISO(period.endDate),
            specificDays: period.specificDays?.map((d) => formatDateToISO(d)),
            advancedAnalysis: analysis,
          }
        })

        // 현재 시점 분석
        const currentAnalysis = performAdvancedAnalysis(body, input, new Date())

        const promptContext =
          generateEventTimingPromptContext(result, locale) +
          generateAdvancedPromptContext(currentAnalysis, locale)

        return createSuccessResponse(
          {
            eventType: result.eventType,
            searchRange: result.searchRange,
            optimalPeriods: optimalPeriodsWithAdvanced,
            avoidPeriods: result.avoidPeriods.map((p) => ({
              ...p,
              startDate: formatDateToISO(p.startDate),
              endDate: formatDateToISO(p.endDate),
            })),
            nextBestWindow: result.nextBestWindow
              ? {
                  ...result.nextBestWindow,
                  startDate: formatDateToISO(result.nextBestWindow.startDate),
                  endDate: formatDateToISO(result.nextBestWindow.endDate),
                  specificDays: result.nextBestWindow.specificDays?.map((d) => formatDateToISO(d)),
                }
              : null,
            advice: result.advice,
            currentAnalysis,
          },
          { meta: { type: 'event-timing', promptContext } }
        )
      }

      case 'comprehensive': {
        const yearsRange = body.yearsRange || 10

        const prediction = generateComprehensivePrediction(input, yearsRange)

        // TIER 1~3 종합 고급 분석
        const now = new Date()
        const currentAnalysis = performAdvancedAnalysis(body, input, now)

        // 하이라이트 날짜들에 대한 고급 분석
        const highlightsWithAdvanced = prediction.upcomingHighlights.slice(0, 5).map((h) => ({
          ...h,
          date: formatDateToISO(h.date),
          advancedAnalysis: performAdvancedAnalysis(body, input, h.date),
        }))

        // 향후 5년간 각 연도 분석
        const currentYear = now.getFullYear()
        const yearlyAdvancedInsights = []
        for (let year = currentYear; year <= currentYear + Math.min(yearsRange, 5); year++) {
          yearlyAdvancedInsights.push(analyzeYearWithAdvanced(body, input, year))
        }

        // 종합 신뢰도 계산 (TIER 추가로 향상)
        const enhancedConfidence = Math.min(95, prediction.confidence + 15)

        const promptContext =
          generateLifePredictionPromptContext(
            { ...prediction, confidence: enhancedConfidence },
            locale
          ) + generateAdvancedPromptContext(currentAnalysis, locale)

        return createSuccessResponse(
          {
            generatedAt: formatDateToISO(prediction.generatedAt),
            confidence: enhancedConfidence,
            multiYearTrend: {
              ...prediction.multiYearTrend,
              yearlyScores: prediction.multiYearTrend.yearlyScores.map((y) => ({
                ...y,
                yearGanji: y.yearGanji,
                twelveStage: y.twelveStage,
              })),
            },
            upcomingHighlights: highlightsWithAdvanced,
            lifeSync: prediction.lifeSync,
            advancedAnalysis: {
              current: currentAnalysis,
              yearlyInsights: yearlyAdvancedInsights,
              analysisLevels: [
                'TIER1_UltraPrecision',
                'TIER2_DaeunTransit',
                'TIER3_AdvancedAstrology',
              ],
            },
          },
          { meta: { type: 'comprehensive', promptContext } }
        )
      }

      case 'weekly-timing': {
        const {
          eventType,
          startDate: startDateStr,
          endDate: endDateStr,
        } = body as WeeklyTimingRequest

        if (!eventType) {
          return createErrorResponse({
            code: ErrorCodes.MISSING_FIELD,
            message: 'eventType is required',
          })
        }

        const startDate = startDateStr ? new Date(startDateStr) : new Date()
        const endDate = endDateStr ? new Date(endDateStr) : undefined

        const weeklyResult = findWeeklyOptimalTiming(input, eventType, startDate, endDate)

        // 날짜를 ISO 문자열로 변환
        const weeklyPeriodsFormatted = weeklyResult.weeklyPeriods.map((w) => ({
          ...w,
          startDate: formatDateToISO(w.startDate),
          endDate: formatDateToISO(w.endDate),
          bestDays: (w.bestDays ?? []).map((d) => formatDateToISO(d)),
        }))

        return createSuccessResponse(
          {
            eventType: weeklyResult.eventType,
            searchRange: {
              startDate: formatDateToISO(weeklyResult.searchRange.startDate),
              endDate: formatDateToISO(weeklyResult.searchRange.endDate),
            },
            weeklyPeriods: weeklyPeriodsFormatted,
            bestWeek: weeklyResult.bestWeek
              ? {
                  ...weeklyResult.bestWeek,
                  startDate: formatDateToISO(weeklyResult.bestWeek.startDate),
                  endDate: formatDateToISO(weeklyResult.bestWeek.endDate),
                  bestDays: (weeklyResult.bestWeek.bestDays ?? []).map((d) => formatDateToISO(d)),
                }
              : null,
            worstWeek: weeklyResult.worstWeek
              ? {
                  ...weeklyResult.worstWeek,
                  startDate: formatDateToISO(weeklyResult.worstWeek.startDate),
                  endDate: formatDateToISO(weeklyResult.worstWeek.endDate),
                  bestDays: (weeklyResult.worstWeek.bestDays ?? []).map((d) => formatDateToISO(d)),
                }
              : null,
            summary: weeklyResult.summary,
          },
          { meta: { type: 'weekly-timing' } }
        )
      }

      default:
        return createErrorResponse({
          code: ErrorCodes.BAD_REQUEST,
          message:
            'Invalid type. Use multi-year, past-analysis, event-timing, weekly-timing, or comprehensive',
        })
    }
  } catch (error) {
    logger.error('[life-prediction API error]', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      message: errorMessage,
      originalError: error instanceof Error ? error : undefined,
    })
  }
}

// GET 요청 - API 정보
export async function GET() {
  return createSuccessResponse({
    name: 'Life Prediction API',
    version: '2.0.0',
    description: '종합 인생 예측 API - TIER 1~3 고급 분석 엔진 통합',
    features: {
      tier1: {
        name: '초정밀 분석 (Ultra-Precision)',
        capabilities: [
          '공망(空亡) 분석 - 빈 기운 영역 탐지',
          '신살(神殺) 분석 - 길흉 신살 활성화 체크',
          '에너지 흐름 - 통근/투출 분석',
          '시간대별 조언 - 최적 활동 시간 추천',
        ],
      },
      tier2: {
        name: '대운-트랜짓 동기화',
        capabilities: ['현재 대운 분석', '트랜짓 정렬도 계산', '주요 테마 도출'],
      },
      tier3: {
        name: '고급 점성술 + 패턴',
        capabilities: [
          '달 위상 (Moon Phase) 분석',
          'Void of Course 체크',
          '역행 행성 (Retrogrades) 감지',
          '사주 패턴 분석 & 희귀도 점수',
        ],
      },
    },
    endpoints: {
      POST: {
        types: {
          'multi-year': {
            description: '다년간 트렌드 분석 + TIER 1~3 고급 분석',
            requiredParams: ['startYear', 'endYear'],
            response: ['trend', 'peakYears', 'lowYears', 'advancedAnalysis'],
            example: {
              type: 'multi-year',
              birthYear: 1990,
              birthMonth: 5,
              birthDay: 15,
              gender: 'male',
              dayStem: '甲',
              dayBranch: '子',
              monthBranch: '巳',
              yearBranch: '午',
              startYear: 2020,
              endYear: 2030,
            },
          },
          'past-analysis': {
            description: '과거 특정 날짜/기간 분석 + TIER 1~3',
            requiredParams: ['targetDate (or startDate + endDate)'],
            response: ['retrospective', 'advancedAnalysis'],
            example: {
              type: 'past-analysis',
              birthYear: 1990,
              birthMonth: 5,
              birthDay: 15,
              gender: 'male',
              dayStem: '甲',
              dayBranch: '子',
              monthBranch: '巳',
              yearBranch: '午',
              targetDate: '2023-06-15',
            },
          },
          'event-timing': {
            description: '이벤트 최적 타이밍 + 기간별 고급 분석',
            requiredParams: ['eventType', 'startYear', 'endYear'],
            eventTypes: [
              'marriage',
              'career',
              'investment',
              'move',
              'study',
              'health',
              'relationship',
            ],
            response: ['optimalPeriods (with advancedAnalysis)', 'avoidPeriods', 'currentAnalysis'],
            example: {
              type: 'event-timing',
              birthYear: 1990,
              birthMonth: 5,
              birthDay: 15,
              gender: 'male',
              dayStem: '甲',
              dayBranch: '子',
              monthBranch: '巳',
              yearBranch: '午',
              eventType: 'marriage',
              startYear: 2025,
              endYear: 2028,
            },
          },
          comprehensive: {
            description: '종합 예측 - 모든 TIER 통합 분석',
            optionalParams: ['yearsRange (default: 10)'],
            response: [
              'multiYearTrend',
              'upcomingHighlights',
              'advancedAnalysis (current + yearlyInsights)',
            ],
            example: {
              type: 'comprehensive',
              birthYear: 1990,
              birthMonth: 5,
              birthDay: 15,
              gender: 'male',
              dayStem: '甲',
              dayBranch: '子',
              monthBranch: '巳',
              yearBranch: '午',
              yearsRange: 10,
            },
          },
        },
        commonParams: {
          required: [
            'type',
            'birthYear',
            'birthMonth',
            'birthDay',
            'gender',
            'dayStem',
            'dayBranch',
            'monthBranch',
            'yearBranch',
          ],
          optional: [
            'birthHour',
            'allStems',
            'allBranches',
            'daeunList',
            'yongsin',
            'kisin',
            'locale',
          ],
        },
      },
    },
  })
}
