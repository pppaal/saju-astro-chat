import { describe, it, expect } from 'vitest'
import { IChingDataKo } from '@/lib/iChing/iChingData.ko'

describe('iChingData.ko', () => {
  it('should export IChingDataKo array', () => {
    expect(Array.isArray(IChingDataKo)).toBe(true)
  })

  it('should have 64 hexagrams', () => {
    expect(IChingDataKo).toHaveLength(64)
  })

  it('each hexagram should have required properties', () => {
    for (const hexagram of IChingDataKo) {
      expect(hexagram).toHaveProperty('number')
      expect(hexagram).toHaveProperty('binary')
      expect(hexagram).toHaveProperty('name')
      expect(hexagram).toHaveProperty('symbol')
      expect(hexagram).toHaveProperty('judgment')
      expect(hexagram).toHaveProperty('image')
      expect(hexagram).toHaveProperty('lines')
    }
  })

  it('hexagram numbers should range from 1 to 64', () => {
    const numbers = IChingDataKo.map((h) => h.number)
    expect(Math.min(...numbers)).toBe(1)
    expect(Math.max(...numbers)).toBe(64)
  })

  it('each hexagram should have 6 lines', () => {
    for (const hexagram of IChingDataKo) {
      expect(hexagram.lines).toHaveLength(6)
    }
  })

  it('binary representation should be 6 characters long', () => {
    for (const hexagram of IChingDataKo) {
      expect(hexagram.binary).toHaveLength(6)
      expect(hexagram.binary).toMatch(/^[01]{6}$/)
    }
  })

  it('first hexagram should be Qian (heaven)', () => {
    const first = IChingDataKo.find((h) => h.number === 1)
    expect(first).toBeDefined()
    expect(first?.binary).toBe('111111')
    expect(first?.name).toContain('건')
  })

  it('second hexagram should be Kun (earth)', () => {
    const second = IChingDataKo.find((h) => h.number === 2)
    expect(second).toBeDefined()
    expect(second?.binary).toBe('000000')
    expect(second?.name).toContain('곤')
  })

  it('hexagram names should be in Korean', () => {
    // Check that names contain Korean characters
    const koreanRegex = /[\uAC00-\uD7AF]/
    for (const hexagram of IChingDataKo) {
      expect(koreanRegex.test(hexagram.name)).toBe(true)
    }
  })

  it('symbols should be valid I Ching Unicode characters', () => {
    // I Ching hexagram symbols are in range U+4DC0 to U+4DFF
    for (const hexagram of IChingDataKo) {
      const charCode = hexagram.symbol.charCodeAt(0)
      expect(charCode).toBeGreaterThanOrEqual(0x4dc0)
      expect(charCode).toBeLessThanOrEqual(0x4dff)
    }
  })
})
