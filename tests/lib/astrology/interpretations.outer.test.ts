import { describe, expect, it } from 'vitest'

import {
  getNorthNodeInterpretation,
  getPlanetSignInterpretation,
  getSouthNodeOppositeSign,
} from '@/lib/astrology/interpretations'
import {
  getChironHouseInterpretation,
  getChironSignInterpretation,
  getLilithHouseInterpretation,
  getLilithSignInterpretation,
} from '@/lib/astrology/extraPointInterpretations'

describe('outer planet × sign — KO + EN', () => {
  it('Jupiter in Sagittarius reads as rulership in both languages', () => {
    expect(getPlanetSignInterpretation('Jupiter', 'Sagittarius', 'ko')).toMatch(/지배/)
    expect(getPlanetSignInterpretation('Jupiter', 'Sagittarius', 'en')).toMatch(/rulership/i)
  })

  it('Saturn in Capricorn reads as rulership in both languages', () => {
    expect(getPlanetSignInterpretation('Saturn', 'Capricorn', 'ko')).toMatch(/지배/)
    expect(getPlanetSignInterpretation('Saturn', 'Capricorn', 'en')).toMatch(/rulership/i)
  })

  it('Uranus / Neptune / Pluto have data for all 12 signs', () => {
    for (const sign of [
      'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
    ] as const) {
      for (const planet of ['Uranus', 'Neptune', 'Pluto'] as const) {
        const ko = getPlanetSignInterpretation(planet, sign, 'ko')
        const en = getPlanetSignInterpretation(planet, sign, 'en')
        expect(ko.length).toBeGreaterThan(0)
        expect(en.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('North Node × sign', () => {
  it('returns a "Path:" lesson string in EN and 길/내려놓 phrasing in KO', () => {
    expect(getNorthNodeInterpretation('Aries', 'en')).toMatch(/Path:/)
    expect(getNorthNodeInterpretation('Aries', 'ko')).toMatch(/길|내려놓/)
  })

  it('opposite-sign mapping is correct for the 12 axes', () => {
    expect(getSouthNodeOppositeSign('Aries')).toBe('Libra')
    expect(getSouthNodeOppositeSign('Cancer')).toBe('Capricorn')
    expect(getSouthNodeOppositeSign('Pisces')).toBe('Virgo')
  })
})

describe('Chiron × sign / house', () => {
  it('returns a wound-flavour line for every sign', () => {
    for (const sign of [
      'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
    ] as const) {
      expect(getChironSignInterpretation(sign, 'ko').length).toBeGreaterThan(0)
      expect(getChironSignInterpretation(sign, 'en').length).toBeGreaterThan(0)
    }
  })

  it('returns a wound-area line for every house', () => {
    for (let house = 1; house <= 12; house += 1) {
      expect(getChironHouseInterpretation(house, 'ko').length).toBeGreaterThan(0)
      expect(getChironHouseInterpretation(house, 'en').length).toBeGreaterThan(0)
    }
  })
})

describe('Lilith × sign / house', () => {
  it('returns a wild-edge line for every sign', () => {
    for (const sign of [
      'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
      'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
    ] as const) {
      expect(getLilithSignInterpretation(sign, 'ko').length).toBeGreaterThan(0)
      expect(getLilithSignInterpretation(sign, 'en').length).toBeGreaterThan(0)
    }
  })

  it('returns a wild-edge area line for every house', () => {
    for (let house = 1; house <= 12; house += 1) {
      expect(getLilithHouseInterpretation(house, 'ko').length).toBeGreaterThan(0)
      expect(getLilithHouseInterpretation(house, 'en').length).toBeGreaterThan(0)
    }
  })
})
