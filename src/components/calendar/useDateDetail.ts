import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api/ApiClient'
import { logger } from '@/lib/logger'
import type { BirthInfo } from './types'

export type DateDetailResponse = {
  date: string
  grade: number
  score: number
  displayScore?: number
  categories: string[]
  ganzhi: string
  transitSunSign: string
  crossVerified: boolean
  crossAgreementPercent?: number
  confidence?: number
  confidenceNote?: string
  sajuFactorKeys: string[]
  astroFactorKeys: string[]
  recommendationKeys: string[]
  warningKeys: string[]
  gongmangStatus?: { isEmpty: boolean; emptyBranches: string[]; affectedAreas: string[] }
  shinsalActive?: { name: string; type: string; affectedArea: string }[]
  energyFlow?: {
    strength: string
    dominantElement: string
    tonggeunCount: number
    tuechulCount: number
  }
  bestHours?: { hour: number; siGan: string; quality: string }[]
  transitSync?: {
    isMajorTransitYear: boolean
    transitType?: string
    synergyType?: string
    synergyScore?: number
  }
  activityScores?: Record<string, number | undefined>
  timeContext?: {
    isPast: boolean
    isFuture: boolean
    isToday: boolean
    daysFromToday: number
    retrospectiveNote?: string
  }
  natalSaju?: {
    dayStem: string
    dayBranch: string
    yearBranch: string
    monthStem: string
    monthBranch: string
  }
  /** fusion 엔진 출력 — 18테마·24슬롯·사주축/점성축 (route 에서 채움) */
  fusion?: {
    overallScore: number
    sajuAxisScore: number
    astroAxisScore: number
    agreement: number
    confidence: number
    domainScores: Record<string, number>
    advice: { do: string[]; avoid: string[] }
    topInsights: string[]
    hourly: {
      slots: Array<{
        hour: number
        score: number
        tone: string
        topDomain: string | null
        hourPillar?: string
        planetaryHour?: string
        label: string
      }>
      bestHours: Array<{
        hour: number
        score: number
        topDomain: string | null
        hourPillar?: string
        planetaryHour?: string
      }>
      worstHours: Array<{
        hour: number
        score: number
        topDomain: string | null
        hourPillar?: string
        planetaryHour?: string
      }>
      bestByDomain: Record<string, { hour: number; score: number } | undefined>
    }
  }
}

type Cache = Record<string, DateDetailResponse>

function dateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 사용자가 클릭한 단일 날짜에 대해 풀 엔진 분석을 가져옵니다.
 * 캘린더 365일 lite 응답에는 없는 일진/공망/신살/energy flow/bestHours 등을 포함.
 */
export function useDateDetail(input: {
  birthInfo: BirthInfo | undefined
  selectedDay: Date | null
  enabled?: boolean
}): { detail: DateDetailResponse | null; status: 'idle' | 'loading' | 'ready' | 'error' } {
  const { birthInfo, selectedDay, enabled = true } = input
  const [detail, setDetail] = useState<DateDetailResponse | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const cacheRef = useRef<Cache>({})
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!enabled || !selectedDay || !birthInfo?.birthDate) {
      setDetail(null)
      setStatus('idle')
      return
    }

    const target = dateKey(selectedDay)
    const cacheKey = `${birthInfo.birthDate}|${birthInfo.birthTime ?? ''}|${birthInfo.gender ?? ''}|${birthInfo.birthPlace ?? ''}|${target}`
    const cached = cacheRef.current[cacheKey]
    if (cached) {
      setDetail(cached)
      setStatus('ready')
      return
    }

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setStatus('loading')

    const params = new URLSearchParams()
    params.set('birthDate', birthInfo.birthDate)
    if (birthInfo.birthTime) params.set('birthTime', birthInfo.birthTime)
    const lowerGender = birthInfo.gender ? birthInfo.gender.toLowerCase() : ''
    if (lowerGender === 'male' || lowerGender === 'female') {
      params.set('gender', lowerGender)
    }
    // 메인 캘린더와 같은 본명 좌표를 쓰도록 출생지 전달 — fusion 점수를 grid와 동기화.
    if (birthInfo.birthPlace) params.set('birthPlace', birthInfo.birthPlace)
    // 사용자 timezone 우선 — 해외 거주자가 birthPlace='Seoul' 이라도 현재 timezone
    // 이 다르면 hour pillar 경계 + "지금" reference line 이 어긋남 (4차 audit).
    if (birthInfo.timezone) params.set('timezone', birthInfo.timezone)
    params.set('date', target)

    void (async () => {
      try {
        const response = await apiFetch(`/api/calendar/date-detail?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const json = (await response.json()) as { success?: boolean; data?: DateDetailResponse }
        if (!json.success || !json.data) {
          throw new Error('invalid response')
        }
        cacheRef.current[cacheKey] = json.data
        setDetail(json.data)
        setStatus('ready')
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return
        logger.warn('[useDateDetail] fetch failed', {
          error: error instanceof Error ? error.message : String(error),
        })
        setDetail(null)
        setStatus('error')
      }
    })()

    return () => {
      controller.abort()
    }
  }, [
    enabled,
    selectedDay,
    birthInfo?.birthDate,
    birthInfo?.birthTime,
    birthInfo?.gender,
    birthInfo?.birthPlace,
    birthInfo?.timezone,
  ])

  return { detail, status }
}
