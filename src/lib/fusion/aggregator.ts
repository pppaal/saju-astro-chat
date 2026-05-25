// Aggregator: groups CrossMatch[] by domain and assigns a categorical Tone.
// Conflicts are surfaced (never discarded) — that's the whole point of crossing.

import type {
  CrossMatch,
  Domain,
  DomainAggregate,
  FortuneContext,
  FortuneReport,
  MetaHit,
  MetaRule,
  Tone,
} from './types'

const DOMAINS: Domain[] = ['self', 'love', 'money', 'career', 'health', 'family']

// Tone calibration. The old count-based rule ("any conflict ⇒ mixed; positive
// only when zero conflicts") made positive/negative effectively unreachable —
// across a 352-chart sweep self/career/family were 100% mixed, so tone carried
// no information. We now weigh the *balance* of confirmed-positive vs
// (conflict + confirmed-negative) signal. Thresholds tuned against that sweep
// so each domain shows a real spread.
export const TONE_THRESHOLDS = {
  /** Total weighted signal below this ⇒ neutral (too little to call). */
  neutralFloor: 1.0,
  /** Net balance (−1..1) at/above which the domain reads positive. */
  positiveNet: 0.15,
  /** Net balance at/below −this which the domain reads negative. */
  negativeNet: 0.3,
  /**
   * Conflicts mark cross-system *tension*, not a bad domain — a domain with
   * strong positive confirms plus some tension is "mixed", not "negative".
   * So conflicts weigh less than confirmed traits when deciding tone.
   */
  conflictWeight: 0.5,
}

// Continuous weight per match; falls back to intensity buckets if rawWeight
// is missing so the function stays robust to hand-built fixtures.
function matchWeight(m: CrossMatch): number {
  if (typeof m.rawWeight === 'number' && m.rawWeight > 0) return m.rawWeight
  return m.intensity === 'strong' ? 1 : m.intensity === 'moderate' ? 0.6 : 0.3
}

function decideTone(confirms: CrossMatch[], conflicts: CrossMatch[]): Tone {
  let pos = 0
  let neg = 0
  for (const m of confirms) {
    const w = matchWeight(m)
    const hint = m.rule.polarityHint
    if (hint === 'pos') pos += w
    else if (hint === 'neg') neg += w
    // 'mixed' / 'context' confirms are genuinely double-edged → split evenly.
    else {
      pos += w * 0.5
      neg += w * 0.5
    }
  }
  for (const m of conflicts) neg += matchWeight(m) * TONE_THRESHOLDS.conflictWeight

  const total = pos + neg
  if (total < TONE_THRESHOLDS.neutralFloor) return 'neutral'
  const net = (pos - neg) / total
  if (net >= TONE_THRESHOLDS.positiveNet) return 'positive'
  if (net <= -TONE_THRESHOLDS.negativeNet) return 'negative'
  return 'mixed'
}

export function aggregate(
  matches: CrossMatch[],
  metaRules: MetaRule[] = [],
  context?: FortuneContext
): FortuneReport {
  const byDomain = Object.fromEntries(
    DOMAINS.map((d) => [
      d,
      {
        domain: d,
        tone: 'neutral' as Tone,
        confirms: [] as CrossMatch[],
        conflicts: [] as CrossMatch[],
        silents: [] as CrossMatch[],
      } satisfies DomainAggregate,
    ])
  ) as Record<Domain, DomainAggregate>

  for (const m of matches) {
    const bucket = byDomain[m.rule.domain]
    if (m.polarity === 'confirm') bucket.confirms.push(m)
    else if (m.polarity === 'conflict') bucket.conflicts.push(m)
    else bucket.silents.push(m)
  }

  for (const d of DOMAINS) {
    const b = byDomain[d]
    b.confirms.sort((a, c) => c.rawWeight - a.rawWeight)
    b.conflicts.sort((a, c) => c.rawWeight - a.rawWeight)
    b.tone = decideTone(b.confirms, b.conflicts)
  }

  const themes: MetaHit[] = []
  for (const mr of metaRules) {
    if (mr.detect(byDomain)) themes.push({ rule: mr })
  }

  return {
    generatedAt: new Date().toISOString(),
    byDomain,
    themes,
    context,
  }
}
