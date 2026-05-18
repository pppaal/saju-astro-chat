// src/lib/fusion/lifeReport/types.ts
// Deterministic, LLM-free life-report types. 100% data-driven.

import type { MainSajuOutput } from '@/lib/saju/main'
import type {
  Chart,
  AspectHit,
  ExtraPoint,
} from '@/lib/astrology/foundation/types'
import type { Asteroid } from '@/lib/astrology/foundation/asteroids'
import type { FortuneReport } from '@/lib/fusion/types'

// ─── Bilingual paragraph ─────────────────────────────────────
export interface Paragraph {
  ko: string
  en: string
}

// ─── Per-domain output ───────────────────────────────────────
export type DomainId =
  | 'career'
  | 'love'
  | 'children'
  | 'money'
  | 'health'
  | 'family'

export interface DomainSignals {
  saju: string[] // raw saju field labels actually consumed
  astro: string[] // raw astro field labels actually consumed
  fusion: string[] // fusion rule ids actually consumed
}

export interface DomainNarrative {
  id: DomainId
  title: { ko: string; en: string }
  paragraphs: Paragraph[] // 3–4 paragraphs
  signals: DomainSignals
  // Children domain only — estimated number of children.
  estimatedChildCount?: {
    min: number
    max: number
    confidence: 'high' | 'medium' | 'low'
  }
}

// ─── Top-level life report ───────────────────────────────────
export interface LifeReport {
  generatedAt: string
  generator: 'lifeReport-v1-deterministic'
  domains: DomainNarrative[]
}

// ─── Builder input (loose; every field is optional except saju.astro) ───
export interface LifeReportInput {
  saju: MainSajuOutput
  astro: AstrologyLikeChart
  fusion?: FortuneReport
}

// ─── Loose astrology chart shape (works with /api/astrology response or
//     foundation Chart). All fields optional — builders must tolerate gaps.
export interface AstrologyLikeChart {
  planets?: Chart['planets']
  ascendant?: Chart['ascendant']
  mc?: Chart['mc']
  houses?: Chart['houses']
  aspects?: AspectHit[]
  // Extended points
  chiron?: ExtraPoint
  lilith?: ExtraPoint
  partOfFortune?: ExtraPoint
  vertex?: ExtraPoint
  // Asteroids
  asteroids?: Partial<Record<'Ceres' | 'Pallas' | 'Juno' | 'Vesta', Asteroid>>
  // Returns / progressions / fixedStars / declinations / eclipses
  solarReturn?: {
    chart?: Chart
    aspects?: AspectHit[]
  }
  progressions?: {
    secondary?: {
      progressedSun?: { sign?: string; house?: number }
    }
  }
  fixedStars?: Array<{
    star: string
    planet: string
    orb: number
  }>
  declinations?: {
    outOfBounds?: string[]
  }
  eclipses?: {
    nearestSolar?: { date?: string; degree?: number }
  }
  // Misc passthrough — builders may probe these defensively.
  extraPoints?: {
    juno?: ExtraPoint
    vertex?: ExtraPoint
    partOfFortune?: ExtraPoint
    ceres?: ExtraPoint
  }
}

// ─── Internal helper used by domain builders ─────────────────
export interface BuilderInput extends LifeReportInput {
  isKo: true // kept for future expansion; builders always render both
}
