import { describe, expect, it } from 'vitest'

import {
  getEssentialDignity,
  getRulerOfSign,
  getPairTone,
  getPlanetTone,
} from '@/lib/astrology/foundation/dignities'

describe('getEssentialDignity', () => {
  it('returns rulership for canonical placements', () => {
    expect(getEssentialDignity('Sun', 'Leo').kind).toBe('rulership')
    expect(getEssentialDignity('Moon', 'Cancer').kind).toBe('rulership')
    expect(getEssentialDignity('Mercury', 'Gemini').kind).toBe('rulership')
    expect(getEssentialDignity('Mercury', 'Virgo').kind).toBe('rulership')
    expect(getEssentialDignity('Venus', 'Libra').kind).toBe('rulership')
    expect(getEssentialDignity('Mars', 'Aries').kind).toBe('rulership')
    expect(getEssentialDignity('Saturn', 'Capricorn').kind).toBe('rulership')
  })

  it('returns exaltation for canonical placements', () => {
    expect(getEssentialDignity('Sun', 'Aries').kind).toBe('exaltation')
    expect(getEssentialDignity('Moon', 'Taurus').kind).toBe('exaltation')
    expect(getEssentialDignity('Jupiter', 'Cancer').kind).toBe('exaltation')
    expect(getEssentialDignity('Saturn', 'Libra').kind).toBe('exaltation')
  })

  it('returns detriment for opposite-of-rulership placements', () => {
    expect(getEssentialDignity('Sun', 'Aquarius').kind).toBe('detriment')
    expect(getEssentialDignity('Mars', 'Libra').kind).toBe('detriment')
    expect(getEssentialDignity('Venus', 'Aries').kind).toBe('detriment')
  })

  it('returns fall for canonical placements', () => {
    expect(getEssentialDignity('Sun', 'Libra').kind).toBe('fall')
    expect(getEssentialDignity('Saturn', 'Aries').kind).toBe('fall')
    expect(getEssentialDignity('Jupiter', 'Capricorn').kind).toBe('fall')
  })

  it('returns triplicity for element-matching placements without other dignity', () => {
    // Sun in fire signs other than Leo (its rulership) → triplicity
    expect(getEssentialDignity('Sun', 'Sagittarius').kind).toBe('triplicity')
    // Saturn in air signs other than rulership/exaltation → triplicity
    expect(getEssentialDignity('Saturn', 'Gemini').kind).toBe('triplicity')
  })

  it('rulership scores higher than fall (sanity)', () => {
    const rulership = getEssentialDignity('Sun', 'Leo')
    const fall = getEssentialDignity('Sun', 'Libra')
    expect(rulership.score).toBeGreaterThan(fall.score)
  })
})

describe('getRulerOfSign', () => {
  it('maps signs to traditional rulers', () => {
    expect(getRulerOfSign('Leo')).toBe('Sun')
    expect(getRulerOfSign('Cancer')).toBe('Moon')
    expect(getRulerOfSign('Aries')).toBe('Mars')
    expect(getRulerOfSign('Capricorn')).toBe('Saturn')
  })
})

describe('getPlanetTone / getPairTone', () => {
  it('marks Jupiter as great-benefic and Saturn as great-malefic', () => {
    expect(getPlanetTone('Jupiter')).toBe('great-benefic')
    expect(getPlanetTone('Saturn')).toBe('great-malefic')
    expect(getPlanetTone('Venus')).toBe('lesser-benefic')
    expect(getPlanetTone('Mars')).toBe('lesser-malefic')
  })

  it('venus + jupiter pair scores positive; mars + saturn negative', () => {
    expect(getPairTone('Venus', 'Jupiter')).toBeGreaterThan(0)
    expect(getPairTone('Mars', 'Saturn')).toBeLessThan(0)
  })
})
