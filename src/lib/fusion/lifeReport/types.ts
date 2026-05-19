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
import type { CalendarEngineSignals } from './adapters/fromCalendarEngine'

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
  | 'wisdom'
  | 'creativity'
  | 'spirituality'

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

// ─── Headline (한 줄 정의) ───────────────────────────────────
export interface HeadlineSignals {
  saju: string[]
  astro: string[]
}

export interface Headline {
  ko: string
  en: string
  signals: HeadlineSignals
}

// ─── Life stages (생애 단계 4개) ─────────────────────────────
export type LifeStageId = 'early' | 'young' | 'middle' | 'late'

export interface LifeStage {
  id: LifeStageId
  years: string // '0-20', '20-40', '40-60', '60+'
  title: { ko: string; en: string }
  paragraphs: Paragraph[]
  signals: { saju: string[]; astro: string[] }
}

export interface LifeStages {
  early: LifeStage
  young: LifeStage
  middle: LifeStage
  late: LifeStage
}

// ─── Decisive timing (결정적 타이밍) ─────────────────────────
export interface DecisiveYear {
  age: number
  year: number
  domain: string // 'career' | 'love' | 'health' | 'wealth' | 'crisis' | ...
  description: { ko: string; en: string }
  sources: { saju?: string; astro?: string }
}

export interface DecisiveTiming {
  decisiveYears: DecisiveYear[]
  paragraphs: Paragraph[]
  signals: { saju: string[]; astro: string[] }
}

// ─── Karma / 잠재력 ──────────────────────────────────────────
export interface KarmaSection {
  paragraphs: Paragraph[]
  signals: { saju: string[]; astro: string[] }
}

// ─── Top-level life report ───────────────────────────────────
export interface LifeReport {
  generatedAt: string
  generator:
    | 'lifeReport-v1-deterministic'
    | 'lifeReport-v2-deterministic'
    | 'lifeReport-v3-deterministic'
  headline: Headline
  lifeStages: LifeStages
  decisiveTiming: DecisiveTiming
  karma: KarmaSection
  domains: DomainNarrative[]
}

// ─── Builder input (loose; every field is optional except saju.astro) ───
export interface LifeReportInput {
  saju: MainSajuOutput
  astro: AstrologyLikeChart
  fusion?: FortuneReport
  /**
   * Optional pre-computed calendar-engine signals. When omitted, the
   * builder will populate it automatically via adaptCalendarEngineSignals.
   */
  calendarSignals?: CalendarEngineSignals
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
      progressedMoon?: { sign?: string; house?: number }
      progressedAscendant?: { sign?: string }
    }
    /** Solar Arc Direction — every natal point advanced by the same arc
     *  (≈ 1° per year of life). Optional; defensive.
     */
    solarArc?: {
      /** Solar-arc advanced planet positions (subset). Sign-change ages let
       *  decisiveTiming describe a planet's solar-arc ingress.
       */
      planets?: Array<{
        name: string
        sign?: string
        ingressAge?: number // age when this planet enters the listed sign
      }>
      /** Solar-arc MC / ASC if available. */
      mc?: { sign?: string; ingressAge?: number }
      asc?: { sign?: string; ingressAge?: number }
    }
  }
  fixedStars?: Array<{
    star: string
    planet: string
    orb: number
  }>
  declinations?: {
    outOfBounds?: string[]
    /** Declination aspects — parallel (same declination ±1°) /
     *  contraparallel (opposite ±1°). Defensive: may be empty/undefined. */
    parallel?: Array<{ a: string; b: string; orb?: number }>
    contraparallel?: Array<{ a: string; b: string; orb?: number }>
  }
  eclipses?: {
    nearestSolar?: { date?: string; degree?: number; sign?: string }
    /** Closest lunar eclipse around birth — date/degree/sign. */
    nearestLunar?: { date?: string; degree?: number; sign?: string }
    /** Multi-year window (before + after birth) — used by karma P5 /
     *  lifeStages early P3. Optional. */
    list?: Array<{
      type?: 'solar' | 'lunar'
      date?: string
      sign?: string
      degree?: number
      // 'before' = pre-birth, 'after' = post-birth (within window)
      relativeToBirth?: 'before' | 'after'
    }>
  }
  // Misc passthrough — builders may probe these defensively.
  extraPoints?: {
    juno?: ExtraPoint
    vertex?: ExtraPoint
    partOfFortune?: ExtraPoint
    ceres?: ExtraPoint
    northNode?: ExtraPoint
    southNode?: ExtraPoint
  }
  /** Active transits — optional defensive map for decisive timing. */
  transits?: Array<{
    planet?: string
    target?: string
    aspect?: string
    exactAt?: string // ISO
    orb?: number
  }>
}

// ─── Internal helper used by domain builders ─────────────────
export interface BuilderInput extends LifeReportInput {
  isKo: true // kept for future expansion; builders always render both
}

// Re-export the adapter shape so consumers can pre-build calendarSignals.
export type { CalendarEngineSignals } from './adapters/fromCalendarEngine'
