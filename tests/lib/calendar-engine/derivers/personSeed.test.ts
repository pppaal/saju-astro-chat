import { describe, it, expect } from 'vitest'
import { hashStringToInt, personSeed, pickBySeed } from '@/lib/calendar-engine/derivers/personSeed'

describe('personSeed', () => {
  it('hashStringToInt is deterministic and varies by input', () => {
    expect(hashStringToInt('辛')).toBe(hashStringToInt('辛'))
    expect(hashStringToInt('辛')).not.toBe(hashStringToInt('甲'))
  })

  it('personSeed: same parts → same seed, different parts → different seed', () => {
    const a = personSeed(['辛', '화·토', '편재격', '약'])
    const b = personSeed(['辛', '화·토', '편재격', '약'])
    const c = personSeed(['甲', '수·목', '정관격', '강'])
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it('personSeed tolerates undefined/null parts', () => {
    expect(() => personSeed(['辛', undefined, null, 3])).not.toThrow()
  })

  describe('pickBySeed', () => {
    const pool = ['a', 'b', 'c', 'd', 'e']

    it('is deterministic for the same seed + key', () => {
      expect(pickBySeed(pool, 100, 3)).toBe(pickBySeed(pool, 100, 3))
    })

    it('different seeds can pick different items for the same key (personalization)', () => {
      // across many seeds, the same key should NOT always map to one item
      const got = new Set<string>()
      for (let s = 0; s < 50; s++) got.add(pickBySeed(pool, s, 7))
      expect(got.size).toBeGreaterThan(1)
    })

    it('different keys rotate within a fixed seed', () => {
      const got = new Set<string>()
      for (let k = 0; k < pool.length; k++) got.add(pickBySeed(pool, 0, k))
      expect(got.size).toBe(pool.length)
    })

    it('handles negative keys safely', () => {
      expect(pool).toContain(pickBySeed(pool, 0, -3))
    })

    it('throws on an empty pool', () => {
      expect(() => pickBySeed([], 1, 1)).toThrow()
    })
  })
})
