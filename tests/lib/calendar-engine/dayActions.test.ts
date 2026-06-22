import { describe, it, expect } from 'vitest'
import { deriveDayActions } from '@/lib/calendar-engine/derivers/dayActions'

const TEN = [
  '비견',
  '겁재',
  '식신',
  '상관',
  '정재',
  '편재',
  '정관',
  '편관',
  '정인',
  '편인',
] as const

describe('deriveDayActions', () => {
  it('returns null for an unknown sibsin', () => {
    expect(deriveDayActions({ iljinSibsin: '없음', scoreBand: 'good' })).toBeNull()
  })

  it('builds 3 do items (band lead + 2 sibsin) and 2 avoid for non-low band', () => {
    const a = deriveDayActions({ iljinSibsin: '정재', scoreBand: 'good' })
    expect(a).not.toBeNull()
    expect(a!.do).toHaveLength(3)
    expect(a!.doEn).toHaveLength(3)
    expect(a!.avoid).toHaveLength(2)
    expect(a!.avoidEn).toHaveLength(2)
    expect(a!.tip.length).toBeGreaterThan(0)
    expect(a!.tipEn.length).toBeGreaterThan(0)
  })

  it('adds a third avoid item on a low (headwind) band', () => {
    const a = deriveDayActions({ iljinSibsin: '편관', scoreBand: 'low' })
    expect(a!.avoid).toHaveLength(3)
    expect(a!.avoidEn).toHaveLength(3)
  })

  it('is deterministic — same input gives the same output', () => {
    const x = deriveDayActions({ iljinSibsin: '식신', scoreBand: 'mid', seed: 7 })
    const y = deriveDayActions({ iljinSibsin: '식신', scoreBand: 'mid', seed: 7 })
    expect(x).toEqual(y)
  })

  it('covers all ten sibsin with full, non-empty do/avoid/tip in ko+en', () => {
    for (const s of TEN) {
      for (const band of ['good', 'mid', 'low'] as const) {
        const a = deriveDayActions({ iljinSibsin: s, scoreBand: band })
        expect(a, `${s}/${band}`).not.toBeNull()
        // ko/en arrays index-aligned and same length.
        expect(a!.doEn).toHaveLength(a!.do.length)
        expect(a!.avoidEn).toHaveLength(a!.avoid.length)
        expect(a!.do.every((d) => d.length > 0)).toBe(true)
        expect(a!.doEn.every((d) => d.length > 0)).toBe(true)
        expect(a!.avoid.every((d) => d.length > 0)).toBe(true)
        expect(a!.avoidEn.every((d) => d.length > 0)).toBe(true)
        expect(a!.tip.length).toBeGreaterThan(0)
        expect(a!.tipEn.length).toBeGreaterThan(0)
      }
    }
  })

  it('the two sibsin do items are distinct (not duplicated from the pool)', () => {
    for (const s of TEN) {
      const a = deriveDayActions({ iljinSibsin: s, scoreBand: 'mid', seed: 3 })
      // do[0] is the band lead; do[1] and do[2] are the two sibsin actions.
      expect(a!.do[1], s).not.toBe(a!.do[2])
      expect(a!.avoid[0], s).not.toBe(a!.avoid[1])
    }
  })

  it('band lead changes the first do item', () => {
    const good = deriveDayActions({ iljinSibsin: '정관', scoreBand: 'good' })
    const low = deriveDayActions({ iljinSibsin: '정관', scoreBand: 'low' })
    expect(good!.do[0]).not.toBe(low!.do[0])
  })

  it('low band biases sibsin picks toward different (defensive) actions than good band', () => {
    // The larger pools + band bias should surface different sibsin do/avoid across bands.
    let differs = 0
    for (const s of TEN) {
      const good = deriveDayActions({ iljinSibsin: s, scoreBand: 'good', seed: 11 })
      const low = deriveDayActions({ iljinSibsin: s, scoreBand: 'low', seed: 11 })
      const goodSib = [good!.do[1], good!.do[2]].join('|')
      const lowSib = [low!.do[1], low!.do[2]].join('|')
      if (goodSib !== lowSib) differs++
    }
    // At least most sibsin should show a band-driven difference in the surfaced actions.
    expect(differs).toBeGreaterThanOrEqual(7)
  })

  it('seed rotation yields varied but valid output for the same sibsin/band', () => {
    const variants = new Set<string>()
    for (let seed = 0; seed < 12; seed++) {
      const a = deriveDayActions({ iljinSibsin: '편재', scoreBand: 'mid', seed })
      expect(a!.do).toHaveLength(3)
      expect(a!.avoid).toHaveLength(2)
      variants.add([...a!.do, ...a!.avoid, a!.tip].join('§'))
    }
    // Seed personalization must produce more than one distinct rendering.
    expect(variants.size).toBeGreaterThan(1)
  })

  it('defaults seed to 0 when omitted (stable baseline)', () => {
    const withSeed = deriveDayActions({ iljinSibsin: '상관', scoreBand: 'good', seed: 0 })
    const noSeed = deriveDayActions({ iljinSibsin: '상관', scoreBand: 'good' })
    expect(noSeed).toEqual(withSeed)
  })
})
