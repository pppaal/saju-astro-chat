// Core types for the Saju × Astrology cross-rule fortune pipeline.
// Stages 2~5 (normalizer / engine / aggregator / renderer) consume only these.
// Stage 1 (existing Saju + Astrology engines) is untouched.

export type Layer = 'state' | 'relation' | 'timing'

// timing layer is split by scale so a 10-year signal isn't matched against
// a 1-day signal. Non-timing layers ignore this field.
export type TimeScale =
  | 'longterm' // 격국·평생 테마
  | 'decade'   // 대운, Saturn cycle
  | 'year'     // 세운, Solar Return
  | 'month'    // 월운, Lunar Return
  | 'day'      // 일진, daily transit
  | 'event'    // 합성: 잠복 신호의 활성화

export type Domain =
  | 'self'
  | 'love'
  | 'money'
  | 'career'
  | 'health'
  | 'family'

export type System = 'saju' | 'astro'

export type PolarityHint = 'pos' | 'neg' | 'mixed' | 'context' // context = 런타임 결정
export type Polarity = 'confirm' | 'conflict' | 'silent'
export type Intensity = 'strong' | 'moderate' | 'weak'
export type Tone = 'positive' | 'negative' | 'mixed' | 'neutral'

// A single normalized observation produced from raw engine output.
// `key` is namespaced as `<system>.<layer>.<sub>` so source is grep-able.
export interface Signal {
  system: System
  layer: Layer
  scale?: TimeScale // only meaningful when layer === 'timing'
  key: string
  fired: boolean
  strength: number // 0..1 (왕쇠/통근 or aspect orb tightness)
  evidence: Record<string, unknown>
}

export type SajuSignal = Signal & { system: 'saju' }
export type AstroSignal = Signal & { system: 'astro' }

export interface Hit {
  fired: boolean
  strength: number // 0..1
  // optional dynamic polarity override — used by 'context' polarity rules.
  polarity?: 'pos' | 'neg'
  evidence: Record<string, unknown>
}

// Lookup helpers passed to predicates so context-dependent rules can read
// neighbor signals without scanning manually.
export interface Ctx {
  hasSaju: (key: string) => boolean
  hasAstro: (key: string) => boolean
  sajuStrength: (key: string) => number
  astroStrength: (key: string) => number
  sajuByPrefix: (prefix: string) => SajuSignal[]
  astroByPrefix: (prefix: string) => AstroSignal[]
}

export type SajuPredicate = (signals: SajuSignal[], ctx: Ctx) => Hit
export type AstroPredicate = (signals: AstroSignal[], ctx: Ctx) => Hit

export interface RuleNarrative {
  // Short Korean sentence per polarity outcome — fed to the renderer.
  // Kept short so domain text stays readable when many rules fire.
  confirm: string
  conflict?: string // for 'mixed' / 'context' polarity rules
  silent?: string   // optional — usually omitted from output
}

export interface Rule {
  id: string
  layer: Layer
  scale?: TimeScale // only when layer === 'timing'
  domain: Domain
  meaning: string
  polarityHint: PolarityHint
  narrative: RuleNarrative
  sajuPredicate: SajuPredicate
  astroPredicate: AstroPredicate
}

export interface CrossMatch {
  rule: Rule
  saju: Hit
  astro: Hit
  polarity: Polarity
  intensity: Intensity
  // raw 0..1 used internally for sorting; consumers should prefer `intensity`.
  rawWeight: number
}

export interface DomainAggregate {
  domain: Domain
  tone: Tone
  confirms: CrossMatch[] // sorted strong→weak
  conflicts: CrossMatch[]
  silents: CrossMatch[]
}

// Meta-rule: detects cross-domain themes (e.g. love-conflict + money-loss
// together = relationship+financial strain). Runs AFTER aggregation.
export interface MetaRule {
  id: string
  meaning: string
  narrative: string
  // Returns whether the theme fires given the per-domain aggregates.
  detect: (byDomain: Record<Domain, DomainAggregate>) => boolean
}

export interface MetaHit {
  rule: MetaRule
}

export interface FortuneReport {
  generatedAt: string
  byDomain: Record<Domain, DomainAggregate>
  themes: MetaHit[]
}
