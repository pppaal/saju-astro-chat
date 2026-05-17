// Aggregator: groups CrossMatch[] by domain and assigns a categorical Tone.
// Conflicts are surfaced (never discarded) — that's the whole point of crossing.

import type { CrossMatch, Domain, DomainAggregate, FortuneContext, FortuneReport, MetaHit, MetaRule, Tone } from './types'

const DOMAINS: Domain[] = ['self', 'love', 'money', 'career', 'health', 'family']

function decideTone(confirms: CrossMatch[], conflicts: CrossMatch[]): Tone {
  if (confirms.length === 0 && conflicts.length === 0) return 'neutral'
  if (conflicts.length >= confirms.length && conflicts.length > 0) return 'mixed'
  const posCount = confirms.filter((m) => m.rule.polarityHint === 'pos').length
  const negCount = confirms.filter((m) => m.rule.polarityHint === 'neg').length
  if (posCount > negCount && conflicts.length === 0) return 'positive'
  if (negCount > posCount && conflicts.length === 0) return 'negative'
  return 'mixed'
}

export function aggregate(matches: CrossMatch[], metaRules: MetaRule[] = [], context?: FortuneContext): FortuneReport {
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
    ]),
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
