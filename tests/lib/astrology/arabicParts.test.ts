import { describe, it, expect } from 'vitest'
import {
  calculateArabicLots,
  getLotInterpretation,
} from '@/lib/astrology/foundation/arabicParts'
import type { Chart } from '@/lib/astrology/foundation/types'

const fixture: Chart = {
  ascendant: { name: 'Ascendant', longitude: 0, sign: 'Aries', degree: 0, minute: 0, formatted: '', house: 1 },
  mc: { name: 'MC', longitude: 270, sign: 'Capricorn', degree: 0, minute: 0, formatted: '', house: 10 },
  houses: [],
  planets: [
    { name: 'Sun',     longitude: 30,  sign: 'Taurus', degree: 0, minute: 0, formatted: '', house: 2 },
    { name: 'Moon',    longitude: 60,  sign: 'Gemini', degree: 0, minute: 0, formatted: '', house: 3 },
    { name: 'Mercury', longitude: 90,  sign: 'Cancer', degree: 0, minute: 0, formatted: '', house: 4 },
    { name: 'Venus',   longitude: 120, sign: 'Leo',    degree: 0, minute: 0, formatted: '', house: 5 },
    { name: 'Mars',    longitude: 150, sign: 'Virgo',  degree: 0, minute: 0, formatted: '', house: 6 },
    { name: 'Jupiter', longitude: 180, sign: 'Libra',  degree: 0, minute: 0, formatted: '', house: 7 },
    { name: 'Saturn',  longitude: 210, sign: 'Scorpio',degree: 0, minute: 0, formatted: '', house: 8 },
  ],
}

describe('arabic parts (lots)', () => {
  it('Day chart: Fortune = ASC + Moon - Sun', () => {
    const lots = calculateArabicLots(fixture, true)
    const fortune = lots.find((l) => l.name === 'Fortune')!
    expect(fortune.longitude).toBeCloseTo((0 + 60 - 30 + 360) % 360, 5)
    expect(fortune.formula).toContain('ASC + Moon - Sun')
  })

  it('Night chart: Fortune = ASC + Sun - Moon (inverse)', () => {
    const lots = calculateArabicLots(fixture, false)
    const fortune = lots.find((l) => l.name === 'Fortune')!
    expect(fortune.longitude).toBeCloseTo((0 + 30 - 60 + 360) % 360, 5)
  })

  it('Spirit = Fortune의 inverse', () => {
    const lotsDay = calculateArabicLots(fixture, true)
    const fortune = lotsDay.find((l) => l.name === 'Fortune')!.longitude
    const spirit = lotsDay.find((l) => l.name === 'Spirit')!.longitude
    // Fortune + Spirit ≈ 2*ASC mod 360 (inverse 관계)
    expect((fortune + spirit) % 360).toBeCloseTo(0, 1)
  })

  it('7개 lot 모두 산출', () => {
    const lots = calculateArabicLots(fixture, true)
    const names = lots.map((l) => l.name).sort()
    expect(names).toEqual([
      'Courage', 'Eros', 'Fortune', 'Necessity', 'Nemesis', 'Spirit', 'Victory',
    ])
  })

  it('Lot interpretation 텍스트', () => {
    const lots = calculateArabicLots(fixture, true)
    const eros = lots.find((l) => l.name === 'Eros')!
    const text = getLotInterpretation(eros)
    expect(text).toContain('Eros')
    expect(text).toContain('사랑')
  })
})
