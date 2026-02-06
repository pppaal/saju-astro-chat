/**
 * Common API request/response types
 */

// ============ Saju API Types ============

export interface SajuRequestBody {
  birthDate: string // YYYY-MM-DD
  birthTime: string // HH:mm
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

export interface SajuResponseData {
  pillars: {
    year: { stem: string; branch: string }
    month: { stem: string; branch: string }
    day: { stem: string; branch: string }
    hour: { stem: string; branch: string }
  }
  dayMaster: string
  birthYear: number
  gender: string
  calendarType: string
  daeun?: unknown
  [key: string]: unknown
}

// ============ Astrology API Types ============

export interface AstrologyRequestBody {
  birthDate: string // YYYY-MM-DD
  birthTime: string // HH:mm
  latitude: number
  longitude: number
  timezone: string
  name?: string
  houseSystem?: string
}

export interface AstrologyResponseData {
  planets: Record<string, unknown>
  houses: Record<string, unknown>
  aspects: unknown[]
  chart?: unknown
  [key: string]: unknown
}

// ============ Compatibility API Types ============

export interface PersonInput {
  name?: string
  date: string
  time: string
  timeZone: string
  latitude: number
  longitude: number
  city?: string
  relationToP1?: 'friend' | 'lover' | 'other'
  relationNoteToP1?: string
}

export interface CompatibilityRequestBody {
  persons: PersonInput[]
  locale?: string
}

// ============ Tarot API Types ============

export interface TarotRequestBody {
  question?: string
  spread?: string
  cards?: number[]
  locale?: string
}

export interface TarotResponseData {
  cards: Array<{
    id: number
    name: string
    meaning: string
    reversed?: boolean
  }>
  interpretation: string
  [key: string]: unknown
}

// ============ Life Prediction API Types ============

export interface LifePredictionRequestBody {
  question: string
  birthDate: string
  birthTime: string
  gender: string
  timezone: string
  calendarType: string
  category?: string
  locale?: string
}

// ============ Destiny Matrix API Types ============

export interface DestinyMatrixRequestBody {
  birthDate: string
  name?: string
  locale?: string
}
