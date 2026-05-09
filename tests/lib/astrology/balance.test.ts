import { describe, it, expect } from 'vitest'
import {
  calculateChartBalance,
  getChartBalanceInterpretation,
} from '@/lib/astrology/foundation/balance'

describe('balance', () => {
  it('fire 우세 차트', () => {
    const planets = [
      { name: 'Sun',     sign: 'Aries' as const,       house: 1 },
      { name: 'Moon',    sign: 'Leo' as const,         house: 5 },
      { name: 'Mars',    sign: 'Sagittarius' as const, house: 9 },
      { name: 'Mercury', sign: 'Aries' as const,       house: 1 },
    ]
    const b = calculateChartBalance(planets)
    expect(b.dominantElement).toBe('fire')
    expect(b.elements.fire).toBe(4)
    expect(b.elements.earth).toBe(0)
  })

  it('weakest = 0인 element', () => {
    const planets = [
      { name: 'Sun', sign: 'Aries' as const, house: 1 },
      { name: 'Moon', sign: 'Leo' as const, house: 5 },
    ]
    const b = calculateChartBalance(planets)
    expect(b.weakestElement).not.toBe(null)
  })

  it('Interpretation 텍스트', () => {
    const planets = [
      { name: 'Sun', sign: 'Aries' as const, house: 1 },
      { name: 'Moon', sign: 'Leo' as const, house: 5 },
    ]
    const b = calculateChartBalance(planets)
    const interp = getChartBalanceInterpretation(b)
    expect(interp.dominantElementText).toContain('fire')
    expect(interp.overall.length).toBeGreaterThan(20)
  })

  it('Hemisphere — 1-6궁 below', () => {
    const planets = [
      { name: 'Sun', sign: 'Aries' as const, house: 1 },
      { name: 'Moon', sign: 'Taurus' as const, house: 2 },
      { name: 'Mars', sign: 'Gemini' as const, house: 3 },
    ]
    const b = calculateChartBalance(planets)
    expect(b.hemispheres.below).toBe(3)
    expect(b.hemispheres.above).toBe(0)
  })

  it('빈 planets', () => {
    const b = calculateChartBalance([])
    expect(b.total).toBe(0)
    expect(b.dominantElement).toBe(null)
  })
})
