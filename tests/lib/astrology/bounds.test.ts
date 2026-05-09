import { describe, it, expect } from 'vitest'
import { getEgyptianBound, getBoundInterpretation } from '@/lib/astrology/foundation/bounds'

describe('bounds (Egyptian Terms)', () => {
  describe('getEgyptianBound', () => {
    it('Aries 0° → Jupiter (0-6°)', () => {
      const r = getEgyptianBound(0)
      expect(r.sign).toBe('Aries')
      expect(r.ruler).toBe('Jupiter')
      expect(r.range.start).toBe(0)
      expect(r.range.end).toBe(6)
    })

    it('Aries 5° → Jupiter (still in 0-6 range)', () => {
      expect(getEgyptianBound(5).ruler).toBe('Jupiter')
    })

    it('Aries 6° → Venus (6-12°)', () => {
      const r = getEgyptianBound(6)
      expect(r.ruler).toBe('Venus')
    })

    it('Aries 15° → Mercury (12-20°)', () => {
      expect(getEgyptianBound(15).ruler).toBe('Mercury')
    })

    it('Aries 22° → Mars (20-25°)', () => {
      expect(getEgyptianBound(22).ruler).toBe('Mars')
    })

    it('Aries 27° → Saturn (25-30°)', () => {
      expect(getEgyptianBound(27).ruler).toBe('Saturn')
    })

    it('Cancer 0° (90°) → Mars (Egyptian: Cancer 0-7 Mars)', () => {
      const r = getEgyptianBound(90)
      expect(r.sign).toBe('Cancer')
      expect(r.ruler).toBe('Mars')
    })

    it('Capricorn 0° (270°) → Mercury (Egyptian: Capricorn 0-7 Mercury)', () => {
      const r = getEgyptianBound(270)
      expect(r.sign).toBe('Capricorn')
      expect(r.ruler).toBe('Mercury')
    })

    it('Pisces 28° (358°) → Saturn (28-30°)', () => {
      const r = getEgyptianBound(358)
      expect(r.sign).toBe('Pisces')
      expect(r.ruler).toBe('Saturn')
    })

    it('30° edge → 다음 사인 first bound', () => {
      const r = getEgyptianBound(30)
      expect(r.sign).toBe('Taurus')
      expect(r.ruler).toBe('Venus')
    })

    it('negative longitude', () => {
      const r = getEgyptianBound(-1)
      expect(r.sign).toBe('Pisces')
      expect(r.degreeInSign).toBeCloseTo(29, 5)
    })

    it('over 360°', () => {
      const r = getEgyptianBound(361)
      expect(r.sign).toBe('Aries')
      expect(r.degreeInSign).toBeCloseTo(1, 5)
    })
  })

  describe('getBoundInterpretation', () => {
    it('Jupiter bound 해석 텍스트 포함', () => {
      const b = getEgyptianBound(0)
      const text = getBoundInterpretation(b, 'Sun')
      expect(text).toContain('Sun')
      expect(text).toContain('Aries')
      expect(text).toContain('Jupiter')
      expect(text).toContain('확장')
    })
  })
})
