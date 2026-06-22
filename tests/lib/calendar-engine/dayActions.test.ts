import { describe, it, expect } from 'vitest'
import { deriveDayActions } from '@/lib/calendar-engine/derivers/dayActions'

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

  it('covers all ten sibsin', () => {
    const ten = ['비견', '겁재', '식신', '상관', '정재', '편재', '정관', '편관', '정인', '편인']
    for (const s of ten) {
      const a = deriveDayActions({ iljinSibsin: s, scoreBand: 'mid' })
      expect(a, s).not.toBeNull()
      expect(a!.do.every((d) => d.length > 0)).toBe(true)
    }
  })

  it('band lead changes the first do item', () => {
    const good = deriveDayActions({ iljinSibsin: '정관', scoreBand: 'good' })
    const low = deriveDayActions({ iljinSibsin: '정관', scoreBand: 'low' })
    expect(good!.do[0]).not.toBe(low!.do[0])
  })
})
