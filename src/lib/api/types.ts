/**
 * Common API request/response types
 *
 * Note: For centralized type definitions, see @/types/api.ts
 * This file contains request body types that need specific validation handling.
 */

import type { DaeunData } from '@/lib/Saju/types'
import type { AspectHit } from '@/lib/astrology/foundation/types'
import type { FiveElementsCount } from '@/types/api'

// ============ Common Types ============

export type Gender = 'male' | 'female'
export type CalendarType = 'solar' | 'lunar'
export type HouseSystem = 'Placidus' | 'WholeSign' | 'Koch' | 'Equal'
export type RelationType = 'friend' | 'lover' | 'other'

// ============ Saju API Types ============

export interface SajuRequestBody {
  birthDate: string // YYYY-MM-DD
  birthTime: string // HH:mm
  gender: Gender
  calendarType: CalendarType
  timezone: string
  userTimezone?: string
  name?: string
  birthPlace?: string
  latitude?: number
  longitude?: number
  isLeapMonth?: boolean
  locale?: string
}

export interface SajuPillarResponse {
  stem: string
  branch: string
  element?: string
  yinYang?: 'Yin' | 'Yang'
}

export interface SajuResponseData {
  pillars: {
    year: SajuPillarResponse
    month: SajuPillarResponse
    day: SajuPillarResponse
    hour: SajuPillarResponse
  }
  dayMaster: string
  birthYear: number
  gender: string
  calendarType: string
  fiveElements?: FiveElementsCount
  daeun?: {
    startAge: number
    isForward: boolean
    cycles: DaeunData[]
  }
}

// ============ Astrology API Types ============

export interface AstrologyRequestBody {
  birthDate: string // YYYY-MM-DD
  birthTime: string // HH:mm
  latitude: number
  longitude: number
  timezone: string
  name?: string
  houseSystem?: HouseSystem
}

export interface PlanetResponse {
  name: string
  sign: string
  degree: number
  minute?: number
  house: number
  retrograde?: boolean
  longitude?: number
}

export interface HouseResponse {
  index: number
  cusp: number
  sign: string
}

export interface AstrologyResponseData {
  planets: PlanetResponse[]
  houses: HouseResponse[]
  aspects: AspectHit[]
  ascendant?: {
    sign: string
    degree: number
  }
  midheaven?: {
    sign: string
    degree: number
  }
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
  relationToP1?: RelationType
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

export interface TarotCardResponse {
  id: number
  name: string
  nameKo?: string
  meaning: string
  reversed?: boolean
  suit?: string
  number?: number
}

export interface TarotResponseData {
  cards: TarotCardResponse[]
  interpretation: string
  guidance?: string
  spread?: string
}

// ============ Life Prediction API Types ============

export type LifePredictionCategory = 'love' | 'career' | 'health' | 'wealth' | 'family' | 'general'

export interface LifePredictionRequestBody {
  question: string
  birthDate: string
  birthTime: string
  gender: Gender
  timezone: string
  calendarType: CalendarType
  category?: LifePredictionCategory
  locale?: string
}

// ============ Destiny Matrix API Types ============

export interface DestinyMatrixRequestBody {
  birthDate: string
  name?: string
  locale?: string
}

// ============ Validation Helper Types ============

/**
 * Type for fields that can be validated with validateRequired
 */
export type ValidatableFields<T> = {
  [K in keyof T]: T[K]
}
