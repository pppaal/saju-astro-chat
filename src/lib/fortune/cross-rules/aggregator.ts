// Aggregator: groups CrossMatch[] by domain and computes a per-domain score.
// Conflicts are surfaced (not subtracted into oblivion) so the renderer can
// produce "양면성" notes — that's the whole point of crossing two systems.

import type { CrossMatch, Domain, DomainAggregate, FortuneReport } from './types'

const DOMAINS: Domain[] = ['self', 'love', 'money', 'career', 'health', 'family']

export function aggregate(matches: CrossMatch[]): FortuneReport {
  const byDomain = Object.fromEntries(
    DOMAINS.map((d) => [
      d,
      {
        domain: d,
        score: 0,
        confirms: [] as CrossMatch[],
        conflicts: [] as CrossMatch[],
        silents: [] as CrossMatch[],
      } satisfies DomainAggregate,
    ]),
  ) as Record<Domain, DomainAggregate>

  for (const m of matches) {
    const bucket = byDomain[m.rule.domain]
    if (m.polarity === 'confirm') {
      bucket.confirms.push(m)
      bucket.score += m.weight * (m.rule.polarityHint === 'neg' ? -1 : 1)
    } else if (m.polarity === 'conflict') {
      bucket.conflicts.push(m)
      // Conflicts dampen score but don't zero it; signal ambivalence.
      bucket.score += m.weight * 0.3 * (m.rule.polarityHint === 'neg' ? -1 : 1)
    } else {
      bucket.silents.push(m)
    }
  }

  // Sort each bucket by weight desc for renderer ergonomics.
  for (const d of DOMAINS) {
    byDomain[d].confirms.sort((a, b) => b.weight - a.weight)
    byDomain[d].conflicts.sort((a, b) => b.weight - a.weight)
  }

  return {
    generatedAt: new Date().toISOString(),
    byDomain,
  }
}
