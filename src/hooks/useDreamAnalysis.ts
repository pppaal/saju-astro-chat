import { useState, useCallback } from 'react'
import type { InsightResponse, UserProfile, GuestBirthInfo } from '@/lib/dream/types'
import { apiFetch } from '@/lib/api'
import { logger } from '@/lib/logger'

export function useDreamAnalysis(
  locale: string,
  userProfile: UserProfile | null,
  guestBirthInfo: GuestBirthInfo | null
) {
  const [dreamText, setDreamText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<InsightResponse | null>(null)

  const analyzeDream = useCallback(async () => {
    if (!dreamText.trim() || dreamText.trim().length < 10) {
      setError(
        locale === 'ko'
          ? '꿈 내용을 최소 10자 이상 입력해주세요.'
          : 'Please describe your dream in at least 10 characters.'
      )
      return false
    }

    const birthInfo = userProfile?.birthDate
      ? {
          birthDate: userProfile.birthDate,
          birthTime: userProfile.birthTime || '12:00',
          gender: userProfile.gender || ('M' as 'M' | 'F'),
          latitude: userProfile.latitude ?? 37.5665,
          longitude: userProfile.longitude ?? 126.978,
          timezone: userProfile.timezone ?? 'Asia/Seoul',
        }
      : guestBirthInfo
        ? {
            ...guestBirthInfo,
            latitude: 37.5665,
            longitude: 126.978,
            timezone: 'Asia/Seoul',
          }
        : null

    setError(null)
    setIsLoading(true)

    try {
      const res = await apiFetch('/api/dream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dream: dreamText.trim(),
          locale,
          birth: birthInfo?.birthDate
            ? {
                birthDate: birthInfo.birthDate,
                birthTime: birthInfo.birthTime || '12:00',
                latitude: birthInfo.latitude || 37.5665,
                longitude: birthInfo.longitude || 126.978,
                timezone: birthInfo.timezone || 'Asia/Seoul',
              }
            : undefined,
        }),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to analyze dream')
      }

      const data = await res.json()
      setResult(data)
      return true
    } catch (err) {
      logger.error('Dream analysis failed:', err)
      const message = err instanceof Error ? err.message : ''
      // Show specific error messages from the server
      if (
        message.includes('로그인') ||
        message.includes('authenticated') ||
        message.includes('Unauthorized')
      ) {
        setError(
          locale === 'ko'
            ? '로그인이 필요합니다. 로그인 후 다시 시도해주세요.'
            : 'Please log in to use dream interpretation.'
        )
      } else if (
        message.includes('크레딧') ||
        message.includes('credit') ||
        message.includes('Payment')
      ) {
        setError(
          locale === 'ko'
            ? '크레딧이 부족합니다. 플랜을 업그레이드해주세요.'
            : 'Insufficient credits. Please upgrade your plan.'
        )
      } else if (message.includes('Too many') || message.includes('rate')) {
        setError(
          locale === 'ko'
            ? '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
            : 'Too many requests. Please try again later.'
        )
      } else {
        setError(
          locale === 'ko'
            ? '분석 중 오류가 발생했습니다. 다시 시도해주세요.'
            : 'An error occurred. Please try again.'
        )
      }
      return false
    } finally {
      setIsLoading(false)
    }
  }, [dreamText, userProfile, guestBirthInfo, locale])

  const resetAnalysis = useCallback(() => {
    setDreamText('')
    setResult(null)
    setError(null)
  }, [])

  return {
    dreamText,
    setDreamText,
    isLoading,
    error,
    setError,
    result,
    analyzeDream,
    resetAnalysis,
  }
}
