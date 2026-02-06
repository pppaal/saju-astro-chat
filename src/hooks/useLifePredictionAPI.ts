'use client'

import { useCallback } from 'react'
import { logger } from '@/lib/logger'
import type { UserProfile, GuestBirthInfo } from './useLifePredictionProfile'
import { resolveBirthInfo, transformPeriods } from './lifePredictionUtils'
import type { PredictionResult } from './lifePredictionUtils'
import type { EventType } from '@/components/life-prediction/PredictionChat/hooks/useEventTypeDetector'
import { useLifePredictionFallback } from './useLifePredictionFallback'

/**
 * Return type for useLifePredictionAPI hook
 */
export interface UseLifePredictionAPIReturn {
  /** Submit prediction request */
  handleSubmit: (question: string, eventType: EventType | null) => Promise<PredictionResult | null>
}

/**
 * Hook to handle life prediction API calls
 *
 * @param userProfile - User profile (authenticated users)
 * @param guestBirthInfo - Guest birth info (non-authenticated users)
 * @param locale - Current locale
 * @param onError - Error callback
 * @returns API handler
 */
export function useLifePredictionAPI(
  userProfile: UserProfile | null,
  guestBirthInfo: GuestBirthInfo | null,
  locale: string,
  onError: (error: string) => void
): UseLifePredictionAPIReturn {
  const { handleFallback } = useLifePredictionFallback(locale, onError)

  /**
   * Main submit handler - tries backend first, then fallback
   */
  const handleSubmit = useCallback(
    async (question: string, eventType: EventType | null): Promise<PredictionResult | null> => {
      // Get birth info
      const birthInfo = resolveBirthInfo(userProfile, guestBirthInfo)

      if (!birthInfo) {
        onError(
          locale === 'ko'
            ? '먼저 생년월일 정보가 필요합니다.'
            : 'Please enter your birth information first.'
        )
        return null
      }

      try {
        // Parse birth date
        const [birthYear, birthMonth, birthDay] = birthInfo.birthDate.split('-').map(Number)
        const [birthHour] = (birthInfo.birthTime || '12:00').split(':').map(Number)
        const gender = birthInfo.gender === 'M' ? 'male' : 'female'

        // Try backend RAG prediction first
        const response = await fetch('/api/life-prediction/backend-predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            birthYear,
            birthMonth,
            birthDay,
            birthHour,
            gender,
            type: 'timing',
            locale,
          }),
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          // Backend unavailable or error, use fallback
          const errorMsg = data.error || 'Backend service unavailable'
          logger.warn('[Life Prediction] Backend unavailable, using fallback:', {
            status: response.status,
            error: errorMsg,
            hasFallback: data.fallback,
          })

          if (data.fallback) {
            logger.info('[Life Prediction] Backend marked as fallback, trying frontend prediction')
          }

          return await handleFallback(question, eventType, birthInfo)
        }

        // Backend response successful
        if (data.data?.optimalPeriods) {
          const periods = transformPeriods(data.data.optimalPeriods)
          const generalAdvice = data.data.generalAdvice || data.data.naturalAnswer || ''
          return { periods, generalAdvice }
        }

        return null
      } catch (err) {
        logger.error('Prediction failed:', err)
        onError(
          locale === 'ko'
            ? '예측 분석 중 오류가 발생했습니다. 다시 시도해주세요.'
            : 'An error occurred during analysis. Please try again.'
        )
        return null
      }
    },
    [userProfile, guestBirthInfo, locale, onError, handleFallback]
  )

  return {
    handleSubmit,
  }
}
