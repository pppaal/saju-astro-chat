// src/app/api/destiny-map/chat-stream/lib/types.ts
// Type definitions for chat-stream API

import type { FiveElement } from '@/lib/prediction/timingScore'
import type { ChatMessage } from '@/lib/api/validator'

export type { ChatMessage }

// Type definitions for Saju data structure
export interface SajuPillar {
  heavenlyStem?: { name?: string }
  earthlyBranch?: { name?: string }
}

export interface SajuUnse {
  daeun?: unknown[]
}

export interface SajuAdvancedAnalysis {
  yongsin?: {
    primary?: FiveElement
    avoid?: FiveElement
  }
}

export interface SajuDayMaster {
  name?: string
  heavenlyStem?: string
  element?: FiveElement
  yin_yang?: string
}

export interface SajuDataStructure {
  dayMaster?: SajuDayMaster
  pillars?: {
    year?: SajuPillar
    month?: SajuPillar
    day?: SajuPillar
    time?: SajuPillar
  }
  unse?: SajuUnse
  advancedAnalysis?: SajuAdvancedAnalysis
  daeun?: { cycles?: unknown[] }
  daeunCycles?: unknown[]
  yongsin?: { elements?: unknown } | unknown
  kisin?: { elements?: unknown } | unknown
  [key: string]: unknown
}

// Astro data structure with planets
export interface AstroDataStructure {
  sun?: unknown
  moon?: unknown
  mercury?: unknown
  venus?: unknown
  mars?: unknown
  jupiter?: unknown
  saturn?: unknown
  ascendant?: unknown
  planets?: unknown[]
  extraPoints?: {
    vertex?: unknown
    partOfFortune?: unknown
  }
  transits?: unknown[]
  [key: string]: unknown
}

// Daeun cycle type
export interface DaeunCycleItem {
  startAge?: number
  stem?: string
  heavenlyStem?: string
  branch?: string
  earthlyBranch?: string
}

// Current Daeun extracted
export interface CurrentDaeun {
  stem: string
  branch: string
}
