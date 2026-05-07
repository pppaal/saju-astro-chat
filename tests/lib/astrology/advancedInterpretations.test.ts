import { describe, expect, it } from 'vitest'

import {
  getAsteroidSignInterpretation,
  getAsteroidThemeKo,
} from '@/lib/astrology/asteroidInterpretations'
import {
  getPartOfFortuneSignInterpretation,
  getPartOfFortuneHouseInterpretation,
  getVertexSignInterpretation,
} from '@/lib/astrology/pofVertexInterpretations'
import {
  getEclipseInterpretation,
  getMidpointActivationInterpretation,
  getFixedStarPlanetTone,
  getDraconicAlignmentTone,
  getDraconicTensionTone,
} from '@/lib/astrology/advancedInterpretations'
import { getAspectPairInterpretation } from '@/lib/astrology/aspectPairInterpretations'

describe('asteroid × sign', () => {
  it('Ceres home sign is Cancer', () => {
    expect(getAsteroidSignInterpretation('Ceres', 'Cancer', 'ko')).toMatch(/본거지/)
    expect(getAsteroidSignInterpretation('Ceres', 'Cancer', 'en')).toMatch(/home/i)
  })
  it('Juno home sign is Libra', () => {
    expect(getAsteroidSignInterpretation('Juno', 'Libra', 'ko')).toMatch(/본거지/)
  })
  it('returns ko theme labels', () => {
    expect(getAsteroidThemeKo('Vesta')).toMatch(/헌신/)
  })
  it('covers all 12 signs for all 4 asteroids both languages', () => {
    const signs = [
      'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
      'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
    ] as const
    for (const ast of ['Ceres','Pallas','Juno','Vesta'] as const) {
      for (const s of signs) {
        expect(getAsteroidSignInterpretation(ast, s, 'ko').length).toBeGreaterThan(0)
        expect(getAsteroidSignInterpretation(ast, s, 'en').length).toBeGreaterThan(0)
      }
    }
  })
})

describe('Part of Fortune + Vertex', () => {
  it('returns sign + house lines for PoF', () => {
    expect(getPartOfFortuneSignInterpretation('Leo', 'ko').length).toBeGreaterThan(0)
    expect(getPartOfFortuneHouseInterpretation(7, 'en')).toMatch(/partnership/i)
  })
  it('returns vertex sign lines', () => {
    expect(getVertexSignInterpretation('Scorpio', 'ko')).toMatch(/운명/)
  })
})

describe('eclipse interpretation', () => {
  it('marks square on Sun as immediate identity turning point', () => {
    const line = getEclipseInterpretation({
      aspect: 'square', axis: 'Sun', house: 7, language: 'ko',
    })
    expect(line).toMatch(/사각|마찰/)
    expect(line).toMatch(/정체성/)
  })
  it('handles unknown axis with fallback', () => {
    const line = getEclipseInterpretation({
      aspect: 'conjunction', axis: 'Custom', house: null, language: 'en',
    })
    expect(line).toMatch(/Custom/)
  })
})

describe('midpoint activation interpretation', () => {
  it('describes activator + aspect on a named midpoint', () => {
    const line = getMidpointActivationInterpretation({
      midpointNameKo: '각성의 점',
      midpointKeywords: ['독립','혁신','각성'],
      activator: 'Mercury',
      aspect: 'conjunction',
      language: 'ko',
    })
    expect(line).toMatch(/각성의 점/)
    expect(line).toMatch(/사고|말/)
    expect(line).toMatch(/합/)
  })
})

describe('fixed star + planet tone', () => {
  it('returns planet-flavoured tone', () => {
    expect(getFixedStarPlanetTone('Sun', 'ko')).toMatch(/정체성/)
    expect(getFixedStarPlanetTone('Mars', 'en')).toMatch(/drive/i)
  })
})

describe('draconic alignment / tension tone', () => {
  it('returns alignment tone for known theme', () => {
    expect(getDraconicAlignmentTone('identity', 'ko')).toMatch(/사명/)
  })
  it('returns tension tone for known theme', () => {
    expect(getDraconicTensionTone('emotion', 'en')).toMatch(/loneliness/i)
  })
})

describe('aspect pair interpretation', () => {
  it('uses curated override for Sun-Moon conjunction', () => {
    const line = getAspectPairInterpretation({
      fromPlanet: 'Sun', toPlanet: 'Moon', kind: 'conjunction', language: 'ko',
    })
    expect(line).toMatch(/내면|자아/)
  })
  it('falls back to function-based template for less-canonical pairs', () => {
    const line = getAspectPairInterpretation({
      fromPlanet: 'Uranus', toPlanet: 'Pluto', kind: 'sextile', language: 'ko',
    })
    expect(line.length).toBeGreaterThan(0)
  })
  it('reverses the pair lookup (A-B == B-A)', () => {
    const ab = getAspectPairInterpretation({
      fromPlanet: 'Venus', toPlanet: 'Mars', kind: 'square', language: 'ko',
    })
    const ba = getAspectPairInterpretation({
      fromPlanet: 'Mars', toPlanet: 'Venus', kind: 'square', language: 'ko',
    })
    expect(ab).toBe(ba)
  })
})
