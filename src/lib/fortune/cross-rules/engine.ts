// Rule engine: runs every rule against the normalized signal sets and
// returns CrossMatch[]. Pure, deterministic, no I/O.

import type {
  AstroSignal,
  CrossMatch,
  Hit,
  Layer,
  Polarity,
  Rule,
  SajuSignal,
} from './types'

// Layer prior: relation/timing tend to drive event-level fortune more than
// raw state. Tuned conservatively; can be revisited with empirical data.
const LAYER_PRIOR: Record<Layer, number> = {
  state: 0.7,
  relation: 1.0,
  timing: 1.0,
}

function decidePolarity(saju: Hit, astro: Hit, hint: Rule['polarityHint']): Polarity {
  const s = saju.fired
  const a = astro.fired
  if (s && a) return hint === 'mixed' ? 'conflict' : 'confirm'
  if (!s && !a) return 'silent'
  // Exactly one fired: when the rule itself encodes a tension, treat as conflict.
  return hint === 'mixed' ? 'conflict' : 'silent'
}

export function runRules(
  rules: Rule[],
  saju: SajuSignal[],
  astro: AstroSignal[],
): CrossMatch[] {
  const out: CrossMatch[] = []
  for (const rule of rules) {
    const sajuHit = rule.sajuPredicate(saju)
    const astroHit = rule.astroPredicate(astro)
    const polarity = decidePolarity(sajuHit, astroHit, rule.polarityHint)
    const baseWeight = Math.min(sajuHit.strength, astroHit.strength)
    const weight =
      polarity === 'confirm' || polarity === 'conflict'
        ? baseWeight * LAYER_PRIOR[rule.layer]
        : 0
    out.push({ rule, saju: sajuHit, astro: astroHit, polarity, weight })
  }
  return out
}

// Helper exported for rule authors: find the strongest fired signal whose
// `key` matches any of the candidate keys (exact match).
export function hitByKeys(
  signals: Signal[],
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

// Helper: prefix match — pick strongest fired signal whose key starts with any prefix.
export function hitByPrefix(
  signals: Signal[],
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

type Signal = SajuSignal | AstroSignal
