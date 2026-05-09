import { describe, it, expect } from 'vitest'
import {
  calculateProfection,
  calculateProfectionTimeline,
  getProfectionInterpretation,
} from '@/lib/astrology/foundation/profections'
import type { Chart } from '@/lib/astrology/foundation/types'

const fixtureChart: Chart = {
  planets: [],
  ascendant: { name: 'Ascendant', longitude: 0, sign: 'Aries', degree: 0, minute: 0, formatted: 'Aries 0deg', house: 1 },
  mc: { name: 'MC', longitude: 270, sign: 'Capricorn', degree: 0, minute: 0, formatted: 'Capricorn 0deg', house: 10 },
  houses: [
    { index: 1,  cusp: 0,   sign: 'Aries',       formatted: '' },
    { index: 2,  cusp: 30,  sign: 'Taurus',      formatted: '' },
    { index: 3,  cusp: 60,  sign: 'Gemini',      formatted: '' },
    { index: 4,  cusp: 90,  sign: 'Cancer',      formatted: '' },
    { index: 5,  cusp: 120, sign: 'Leo',         formatted: '' },
    { index: 6,  cusp: 150, sign: 'Virgo',       formatted: '' },
    { index: 7,  cusp: 180, sign: 'Libra',       formatted: '' },
    { index: 8,  cusp: 210, sign: 'Scorpio',     formatted: '' },
    { index: 9,  cusp: 240, sign: 'Sagittarius', formatted: '' },
    { index: 10, cusp: 270, sign: 'Capricorn',   formatted: '' },
    { index: 11, cusp: 300, sign: 'Aquarius',    formatted: '' },
    { index: 12, cusp: 330, sign: 'Pisces',      formatted: '' },
  ],
}

describe('profections', () => {
  it('age 0 → 1궁 활성, ASC sign', () => {
    const r = calculateProfection(fixtureChart, 0)
    expect(r.activatedHouse).toBe(1)
    expect(r.activatedSign).toBe('Aries')
    expect(r.lordOfYear).toBe('Mars')
  })

  it('age 6 → 7궁 활성', () => {
    const r = calculateProfection(fixtureChart, 6)
    expect(r.activatedHouse).toBe(7)
    expect(r.activatedSign).toBe('Libra')
    expect(r.lordOfYear).toBe('Venus')
  })

  it('age 12 → 1궁 (12년 주기 반환)', () => {
    const r = calculateProfection(fixtureChart, 12)
    expect(r.activatedHouse).toBe(1)
  })

  it('age 13 → 2궁', () => {
    const r = calculateProfection(fixtureChart, 13)
    expect(r.activatedHouse).toBe(2)
  })

  it('age 24 → 1궁 다시', () => {
    expect(calculateProfection(fixtureChart, 24).activatedHouse).toBe(1)
  })

  it('소수 age float → floor', () => {
    expect(calculateProfection(fixtureChart, 6.7).activatedHouse).toBe(7)
  })

  it('음수 age throw', () => {
    expect(() => calculateProfection(fixtureChart, -1)).toThrow()
  })

  it('Timeline 5년치', () => {
    const list = calculateProfectionTimeline(fixtureChart, 0, 4)
    expect(list).toHaveLength(5)
    expect(list[0].activatedHouse).toBe(1)
    expect(list[4].activatedHouse).toBe(5)
  })

  it('Interpretation 텍스트 포함', () => {
    const r = calculateProfection(fixtureChart, 0)
    const text = getProfectionInterpretation(r)
    expect(text).toContain('Age 0')
    expect(text).toContain('1궁')
    expect(text).toContain('자기')
  })
})
