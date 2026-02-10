'use client'

import { useCallback } from 'react'
import { logger } from '@/lib/logger'
import type { EventType } from '@/components/life-prediction/PredictionChat/hooks/useEventTypeDetector'
import type { TimingPeriod } from '@/components/life-prediction/ResultCards/TimingCard'
import type { BirthInfo, PredictionResult } from './lifePredictionUtils'
import { extractSajuPillars, transformPeriod } from './lifePredictionUtils'
import { normalizeGender } from '@/lib/utils/gender'

/**
 * Hook for fallback prediction using frontend API
 * Extracted from useLifePredictionAPI to reduce file size
 */
export function useLifePredictionFallback(locale: string, _onError: (error: string) => void) {
  const handleFallback = useCallback(
    async (
      question: string,
      eventType: EventType | null,
      birthInfo: BirthInfo
    ): Promise<PredictionResult | null> => {
      try {
        // AI question analysis
        let analyzedEventType = eventType
        let eventLabel = ''
        try {
          const analyzeRes = await fetch('/api/life-prediction/analyze-question', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question, locale }),
          })
          const analyzeData = await analyzeRes.json()
          if (analyzeData.success && analyzeData.data) {
            analyzedEventType = analyzeData.data.eventType as EventType
            eventLabel = analyzeData.data.eventLabel
          }
        } catch (e) {
          logger.warn('AI question analysis failed:', e)
          analyzedEventType = eventType || 'career'
        }

        // Parse birth date
        const [birthYear, birthMonth, birthDay] = birthInfo.birthDate.split('-').map(Number)
        const normalizedGender = normalizeGender(birthInfo.gender)
        const gender = normalizedGender === 'female' ? 'female' : 'male'
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1

        // Calculate saju + astro chart (no credit cost)
        let chartData: {
          saju?: Record<string, unknown>
          astro?: Record<string, unknown>
          advancedAstro?: Record<string, unknown>
        } | null = null

        try {
          const defaultLat = 37.5665
          const defaultLon = 126.978

          const chartRes = await fetch('/api/precompute-chart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              birthDate: birthInfo.birthDate,
              birthTime: birthInfo.birthTime || '12:00',
              gender: normalizeGender(birthInfo.gender) ?? birthInfo.gender,
              latitude: defaultLat,
              longitude: defaultLon,
              timezone: 'Asia/Seoul',
            }),
          })
          const chartResult = await chartRes.json()
          if (chartResult.saju) {
            chartData = {
              saju: chartResult.saju,
              astro: chartResult.astro,
              advancedAstro: chartResult.advancedAstro,
            }
          }
        } catch (e) {
          logger.warn('Chart calculation failed:', e)
        }

        // Extract saju data
        const sajuData = chartData?.saju as Record<string, unknown> | null

        if (!sajuData) {
          const periods: TimingPeriod[] = [
            {
              startDate: `${currentYear + 1}-03-01`,
              endDate: `${currentYear + 1}-05-31`,
              score: 75,
              grade: 'B' as const,
              reasons: ['✨ 전반적으로 좋은 시기입니다', '🌱 새로운 시작에 적합한 에너지'],
            },
          ]
          return { periods, generalAdvice: '' }
        }

        const extracted = extractSajuPillars(sajuData)

        if (!extracted) {
          const periods: TimingPeriod[] = [
            {
              startDate: `${currentYear + 1}-03-01`,
              endDate: `${currentYear + 1}-05-31`,
              score: 75,
              grade: 'B' as const,
              reasons: ['✨ 전반적으로 좋은 시기입니다', '🌱 새로운 시작에 적합한 에너지'],
            },
          ]
          return { periods, generalAdvice: '' }
        }

        // Extract astro data
        const astroData = chartData?.astro as Record<string, unknown> | null
        const advancedAstroData = chartData?.advancedAstro as Record<string, unknown> | null

        // Determine optimal prediction range
        const predictionStartYear = currentMonth <= 6 ? currentYear : currentYear + 1
        const predictionEndYear = predictionStartYear + 2

        // Call frontend prediction API
        const response = await fetch('/api/life-prediction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'event-timing',
            birthYear,
            birthMonth,
            birthDay,
            gender,
            dayStem: extracted.dayStem,
            dayBranch: extracted.dayBranch,
            monthBranch: extracted.monthBranch,
            yearBranch: extracted.yearBranch,
            allStems: extracted.allStems,
            allBranches: extracted.allBranches,
            eventType: analyzedEventType || 'career',
            startYear: predictionStartYear,
            endYear: predictionEndYear,
            locale,
            astroChart: astroData,
            advancedAstro: advancedAstroData,
          }),
        })

        const data = await response.json()

        if (data.success && data.data?.optimalPeriods) {
          // Try AI explanation
          let aiExplainedPeriods = null
          try {
            const explainRes = await fetch('/api/life-prediction/explain-results', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                question,
                eventType: analyzedEventType || 'career',
                eventLabel: eventLabel || analyzedEventType || 'career',
                optimalPeriods: data.data.optimalPeriods,
                locale,
              }),
            })
            const explainData = await explainRes.json()
            if (explainData.success && explainData.data?.periods) {
              aiExplainedPeriods = explainData.data.periods
            }
          } catch {
            logger.warn('AI explanation failed, using raw results')
          }

          const periods: TimingPeriod[] = data.data.optimalPeriods.map(
            (p: Parameters<typeof transformPeriod>[0], index: number) =>
              transformPeriod(p, aiExplainedPeriods?.[index]?.reasons)
          )

          return { periods, generalAdvice: '' }
        } else {
          throw new Error(data.error || 'Fallback API failed')
        }
      } catch (err) {
        logger.error('Fallback prediction failed:', err)
        throw err
      }
    },
    [locale]
  )

  return { handleFallback }
}
