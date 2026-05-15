import { describe, expect, it } from 'vitest'
import { getZodiacSign } from '@/lib/tarot/zodiacSign'

describe('getZodiacSign', () => {
  it('returns Capricorn for late Dec', () => {
    const z = getZodiacSign('1990-12-25')
    expect(z?.sign).toBe('Capricorn')
    expect(z?.signKo).toBe('염소자리')
  })

  it('returns Capricorn for early Jan (year-wrapping range)', () => {
    const z = getZodiacSign('1990-01-15')
    expect(z?.sign).toBe('Capricorn')
  })

  it('handles range boundaries correctly', () => {
    expect(getZodiacSign('1990-01-19')?.sign).toBe('Capricorn')
    expect(getZodiacSign('1990-01-20')?.sign).toBe('Aquarius')
    expect(getZodiacSign('1990-02-18')?.sign).toBe('Aquarius')
    expect(getZodiacSign('1990-02-19')?.sign).toBe('Pisces')
  })

  it('returns null for invalid input', () => {
    expect(getZodiacSign('')).toBeNull()
    expect(getZodiacSign('not-a-date')).toBeNull()
    expect(getZodiacSign('1990-13-01')).toBeNull()
  })

  // Regression: 옛 버그 — element 가 한국어만 있어서 EN 프롬프트에 "Mention Capricorn's 흙 element" 박힘.
  describe('element (EN) / elementKo (KO) parity', () => {
    it('Capricorn → earth / 흙', () => {
      const z = getZodiacSign('1990-12-25')!
      expect(z.element).toBe('earth')
      expect(z.elementKo).toBe('흙')
    })

    it('Aquarius → air / 공기', () => {
      const z = getZodiacSign('1990-02-01')!
      expect(z.element).toBe('air')
      expect(z.elementKo).toBe('공기')
    })

    it('Pisces → water / 물', () => {
      const z = getZodiacSign('1990-03-01')!
      expect(z.element).toBe('water')
      expect(z.elementKo).toBe('물')
    })

    it('Aries → fire / 불', () => {
      const z = getZodiacSign('1990-04-01')!
      expect(z.element).toBe('fire')
      expect(z.elementKo).toBe('불')
    })

    it('every sign has both element and elementKo populated (non-empty)', () => {
      const dates = [
        '1990-01-25', '1990-02-15', '1990-03-15', '1990-04-15', '1990-05-15', '1990-06-15',
        '1990-07-15', '1990-08-15', '1990-09-15', '1990-10-15', '1990-11-15', '1990-12-15',
      ]
      for (const d of dates) {
        const z = getZodiacSign(d)
        expect(z, `date ${d}`).not.toBeNull()
        expect(z!.element.length).toBeGreaterThan(0)
        expect(z!.elementKo.length).toBeGreaterThan(0)
        // 핵심: element 는 ASCII (영어), elementKo 는 한국어
        expect(/^[a-z]+$/.test(z!.element), `${d} element is ASCII`).toBe(true)
      }
    })
  })
})
