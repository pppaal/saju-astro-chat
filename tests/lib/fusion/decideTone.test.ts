import { describe, it, expect } from 'vitest'
import { aggregate } from '@/lib/fusion/aggregator'
import type { CrossMatch, Domain, Intensity, Polarity, PolarityHint } from '@/lib/fusion/types'

// Build a minimal CrossMatch for tone tests. decideTone only reads
// rule.domain, rule.polarityHint, polarity, intensity, rawWeight.
function match(
  domain: Domain,
  polarity: Polarity,
  hint: PolarityHint,
  rawWeight: number,
  intensity: Intensity = 'moderate'
): CrossMatch {
  return {
    rule: {
      id: `${domain}.${hint}.${Math.random()}`,
      layer: 'state',
      domain,
      meaning: '',
      polarityHint: hint,
      narrative: { confirm: '' },
      sajuPredicate: () => ({ fired: false, strength: 0, evidence: {} }),
      astroPredicate: () => ({ fired: false, strength: 0, evidence: {} }),
    },
    saju: { fired: true, strength: 1, evidence: {} },
    astro: { fired: true, strength: 1, evidence: {} },
    polarity,
    intensity,
    rawWeight,
  }
}

const toneOf = (matches: CrossMatch[]) => aggregate(matches, []).byDomain.money.tone

describe('decideTone — weighted balance of signal', () => {
  it('reads positive when positive confirms clearly outweigh tension', () => {
    expect(
      toneOf([
        match('money', 'confirm', 'pos', 1),
        match('money', 'confirm', 'pos', 1),
        match('money', 'conflict', 'mixed', 0.5),
      ])
    ).toBe('positive')
  })

  it('keeps a strong-positive domain positive despite minor tension (old code returned mixed)', () => {
    expect(
      toneOf([
        match('money', 'confirm', 'pos', 1),
        match('money', 'confirm', 'pos', 1),
        match('money', 'confirm', 'pos', 1),
        match('money', 'conflict', 'mixed', 0.4),
        match('money', 'conflict', 'mixed', 0.4),
      ])
    ).toBe('positive')
  })

  it('reads negative when conflicts and negative confirms dominate', () => {
    expect(
      toneOf([
        match('money', 'confirm', 'pos', 0.3),
        match('money', 'confirm', 'neg', 1),
        match('money', 'conflict', 'mixed', 1),
        match('money', 'conflict', 'mixed', 1),
      ])
    ).toBe('negative')
  })

  it('reads mixed when positive and negative are roughly balanced', () => {
    expect(
      toneOf([
        match('money', 'confirm', 'pos', 1),
        match('money', 'confirm', 'neg', 1),
        match('money', 'conflict', 'mixed', 1),
      ])
    ).toBe('mixed')
  })

  it('reads neutral when total signal is below the floor', () => {
    expect(toneOf([match('money', 'confirm', 'pos', 0.3)])).toBe('neutral')
    expect(aggregate([], []).byDomain.money.tone).toBe('neutral')
  })
})
