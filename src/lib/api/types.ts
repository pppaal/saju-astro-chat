/**
 * Common API request/response types
 */

// ============ Saju API Types ============

export interface SajuRequestBody {
  birthDate: string // YYYY-MM-DD
  birthTime: string // HH:mm ('' = 시간 미상)
  /** 출생시각 미상 — 시주 없이 삼주 분석(응답 timePillar = null). */
  birthTimeUnknown?: boolean | null
  gender: 'male' | 'female'
  calendarType: 'solar' | 'lunar'
  timezone: string
  userTimezone?: string
  name?: string
  birthPlace?: string
  latitude?: number
  longitude?: number
  [key: string]: unknown // Allow index signature for validateRequired
}
