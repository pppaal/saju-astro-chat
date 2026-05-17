// Rule engine: runs every rule against the normalized signal sets and
// returns CrossMatch[]. Pure, deterministic, no I/O.

import type {
  AstroSignal,
  CrossMatch,
  Ctx,
  Hit,
  Intensity,
  Layer,
  Polarity,
  Rule,
  SajuSignal,
} from './types'

const LAYER_PRIOR: Record<Layer, number> = {
  state: 0.7,
  relation: 1.0,
  timing: 1.0,
}

function tier(raw: number): Intensity {
  if (raw >= 0.7) return 'strong'
  if (raw >= 0.4) return 'moderate'
  return 'weak'
}

function decidePolarity(saju: Hit, astro: Hit, hint: Rule['polarityHint']): Polarity {
  const s = saju.fired
  const a = astro.fired
  if (s && a) {
    // 'mixed' rules treat double-fire as conflict (양면성).
    if (hint === 'mixed') return 'conflict'
    // 'context' rules: if both predicates returned a polarity and they
    // disagree, that is a conflict.
    if (hint === 'context' && saju.polarity && astro.polarity) {
      return saju.polarity === astro.polarity ? 'confirm' : 'conflict'
    }
    return 'confirm'
  }
  if (!s && !a) return 'silent'
  return hint === 'mixed' ? 'conflict' : 'silent'
}

function makeCtx(saju: SajuSignal[], astro: AstroSignal[]): Ctx {
  return {
    hasSaju: (k) => saju.some((s) => s.key === k && s.fired),
    hasAstro: (k) => astro.some((s) => s.key === k && s.fired),
    sajuStrength: (k) => {
      const hit = saju.find((s) => s.key === k && s.fired)
      return hit?.strength ?? 0
    },
    astroStrength: (k) => {
      const hit = astro.find((s) => s.key === k && s.fired)
      return hit?.strength ?? 0
    },
    sajuByPrefix: (p) => saju.filter((s) => s.fired && s.key.startsWith(p)),
    astroByPrefix: (p) => astro.filter((s) => s.fired && s.key.startsWith(p)),
  }
}

export function runRules(
  rules: Rule[],
  saju: SajuSignal[],
  astro: AstroSignal[],
): CrossMatch[] {
  const ctx = makeCtx(saju, astro)
  const out: CrossMatch[] = []

  for (const rule of rules) {
    // Time-scale gate: a timing rule only sees signals of matching scale.
    let sajuPool = saju
    let astroPool = astro
    if (rule.layer === 'timing' && rule.scale) {
      sajuPool = saju.filter((s) => s.layer !== 'timing' || s.scale === rule.scale)
      astroPool = astro.filter((s) => s.layer !== 'timing' || s.scale === rule.scale)
    }

    const sajuHit = rule.sajuPredicate(sajuPool, ctx)
    const astroHit = rule.astroPredicate(astroPool, ctx)
    const polarity = decidePolarity(sajuHit, astroHit, rule.polarityHint)
    const baseRaw = Math.min(sajuHit.strength, astroHit.strength)
    const rawWeight =
      polarity === 'confirm' || polarity === 'conflict'
        ? baseRaw * LAYER_PRIOR[rule.layer]
        : 0
    out.push({
      rule,
      saju: sajuHit,
      astro: astroHit,
      polarity,
      intensity: tier(rawWeight),
      rawWeight,
    })
  }
  return out
}

// ── helpers for rule authors ────────────────────────────────

export function hitByKeys<T extends SajuSignal | AstroSignal>(
  signals: T[],
  keys: string[],
): Hit {
  let best: Hit = { fired: false, strength: 0, evidence: {} }
  for (const k of keys) {
    for (const s of signals) {
      if (s.key === k && s.fired && s.strength > best.strength) {
        best = { fired: true, strength: s.strength, evidence: s.evidence }
      }
    }
  }
  return best
}

export function hitByPrefix<T extends SajuSignal | AstroSignal>(
  signals: T[],
  prefixes: string[],
): Hit {
  let best: Hit = { fired: false, strength: 0, evidence: {} }
  for (const s of signals) {
    if (!s.fired) continue
    if (prefixes.some((p) => s.key.startsWith(p)) && s.strength > best.strength) {
      best = { fired: true, strength: s.strength, evidence: s.evidence }
    }
  }
  return best
}

export const noHit: Hit = { fired: false, strength: 0, evidence: {} }
