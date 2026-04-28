// Core types for the Saju × Astrology cross-rule fortune pipeline.
// Stages 2~5 (normalizer / engine / aggregator) consume only these shapes.
// Stage 1 (existing Saju + Astrology engines) is untouched.

export type Layer = 'state' | 'relation' | 'timing'

export type Domain =
  | 'self'
  | 'love'
  | 'money'
  | 'career'
  | 'health'
  | 'family'

export type System = 'saju' | 'astro'

// Hint authored on the rule. The runtime polarity is decided by the engine.
export type PolarityHint = 'pos' | 'neg' | 'mixed'

// Decided by the engine after running both predicates.
export type Polarity = 'confirm' | 'conflict' | 'silent'

// A single normalized observation produced from raw engine output.
// `key` is namespaced as `<system>.<layer>.<sub>` so source is grep-able.
export interface Signal {
  system: System
  layer: Layer
  key: string
  fired: boolean
  strength: number // 0..1 (왕쇠/통근 or aspect orb tightness)
  evidence: Record<string, unknown>
}

export type SajuSignal = Signal & { system: 'saju' }
export type AstroSignal = Signal & { system: 'astro' }

// Predicate output. `evidence` is forwarded to the renderer so the LLM can cite.
export interface Hit {
  fired: boolean
  strength: number // 0..1
  evidence: Record<string, unknown>
}

export interface Rule {
  id: string
  layer: Layer
  domain: Domain
  // Free Korean phrase, NOT an enum. The renderer (LLM) interprets it.
  meaning: string
  polarityHint: PolarityHint
  sajuPredicate: (signals: SajuSignal[]) => Hit
  astroPredicate: (signals: AstroSignal[]) => Hit
}

// One rule's verdict after the engine ran both predicates.
export interface CrossMatch {
  rule: Rule
  saju: Hit
  astro: Hit
  polarity: Polarity
  weight: number // min(saju.strength, astro.strength) × layerPrior, 0 if silent ignored
}

export interface DomainAggregate {
  domain: Domain
  score: number
  confirms: CrossMatch[]
  conflicts: CrossMatch[] // surfaced as "양면성", never discarded
  silents: CrossMatch[] // weak hints; renderer may ignore
}

export interface FortuneReport {
  generatedAt: string // ISO
  byDomain: Record<Domain, DomainAggregate>
}
