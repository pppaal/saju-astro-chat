import { describe, it, expect } from 'vitest'
import { getDecan, getDecanInterpretation } from '@/lib/astrology/foundation/decans'

describe('decans', () => {
  describe('getDecan', () => {
    it('Aries 0° → 1번째 decan, Mars ruler', () => {
      const r = getDecan(0)
      expect(r.sign).toBe('Aries')
      expect(r.decan).toBe(1)
      expect(r.ruler).toBe('Mars')
      expect(r.degreeInSign).toBe(0)
    })

    it('Aries 5° → 1번째 decan, Mars ruler', () => {
      const r = getDecan(5)
      expect(r.decan).toBe(1)
      expect(r.ruler).toBe('Mars')
    })

    it('Aries 10° → 2번째 decan, Sun ruler', () => {
      const r = getDecan(10)
      expect(r.decan).toBe(2)
      expect(r.ruler).toBe('Sun')
    })

    it('Aries 25° → 3번째 decan, Venus ruler', () => {
      const r = getDecan(25)
      expect(r.decan).toBe(3)
      expect(r.ruler).toBe('Venus')
    })

    it('Cancer 5° (95°) → Venus ruler (Chaldean order)', () => {
      const r = getDecan(95)
      expect(r.sign).toBe('Cancer')
      expect(r.ruler).toBe('Venus')
    })

    it('Leo 0° (120°) → Saturn ruler (Chaldean)', () => {
      const r = getDecan(120)
      expect(r.sign).toBe('Leo')
      expect(r.ruler).toBe('Saturn')
    })

    it('Pisces 25° (355°) → Mars ruler (3rd decan)', () => {
      const r = getDecan(355)
      expect(r.sign).toBe('Pisces')
      expect(r.decan).toBe(3)
      expect(r.ruler).toBe('Mars')
    })

    it('negative longitude wrap', () => {
      const r = getDecan(-30)
      expect(r.sign).toBe('Pisces')
    })

    it('over 360°', () => {
      const r = getDecan(370)
      expect(r.sign).toBe('Aries')
      expect(r.degreeInSign).toBeCloseTo(10, 5)
    })

    it('30° edge → 다음 사인 0°', () => {
      const r = getDecan(30)
      expect(r.sign).toBe('Taurus')
      expect(r.degreeInSign).toBe(0)
    })
  })

  describe('getDecanInterpretation', () => {
    it('Mars decan 해석 텍스트 포함', () => {
      const decan = getDecan(0)
      const text = getDecanInterpretation(decan, 'Sun')
      expect(text).toContain('Sun')
      expect(text).toContain('Aries')
      expect(text).toContain('Mars')
      expect(text).toContain('추진')
    })

    it('planet 없이 호출 가능', () => {
      const decan = getDecan(0)
      const text = getDecanInterpretation(decan)
      expect(text).not.toContain('undefined')
    })
  })
})
