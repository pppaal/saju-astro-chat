// @vitest-environment node
// Verification that findTransitAspects now surfaces the 5 minor aspect types
// (semisextile, quincunx, quintile, biquintile, sesquiquadrate) when explicitly
// requested, with the tightened TRANSIT_ORBS (1.5°) applied via foundation.
import { describe, it, expect } from 'vitest'
import { findTransitAspects } from '@/lib/astrology/foundation/transit'
import type { AspectType, Chart, PlanetBase, ZodiacKo } from '@/lib/astrology/foundation/types'

const signs: ZodiacKo[] = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
]

const makePlanet = (name: string, longitude: number, speed = 0.5): PlanetBase => ({
  name,
  longitude,
  sign: signs[Math.floor(longitude / 30) % 12],
  degree: Math.floor(longitude % 30),
  minute: 0,
  formatted: `${signs[Math.floor(longitude / 30) % 12]} ${Math.floor(longitude % 30)}deg`,
  house: 1,
  speed,
})

const makeChart = (planets: PlanetBase[]): Chart => ({
  planets,
  ascendant: { ...makePlanet('Ascendant', 0), house: 1 },
  mc: { ...makePlanet('MC', 90), house: 10 },
  houses: Array.from({ length: 12 }, (_, i) => ({
    index: i + 1,
    cusp: i * 30,
    sign: signs[i],
    formatted: `${i * 30}deg`,
  })),
})

const ALL_ASPECTS: AspectType[] = [
  'conjunction',
  'sextile',
  'square',
  'trine',
  'opposition',
  'semisextile',
  'quincunx',
  'quintile',
  'biquintile',
  'sesquiquadrate',
]

describe('findTransitAspects (minor aspects)', () => {
  it('detects all 5 minor aspect types within 1.5° orb of natal Sun', () => {
    const natal = makeChart([makePlanet('Sun', 0, 1)])
    // Transit planets placed at exact minor-aspect angles to natal Sun (0°).
    const transit = makeChart([
      makePlanet('Mercury', 30, 0.5), // semisextile
      makePlanet('Venus', 72, 0.5), // quintile
      makePlanet('Mars', 135, 0.5), // sesquiquadrate
      makePlanet('Jupiter', 144, 0.5), // biquintile
      makePlanet('Saturn', 150, 0.5), // quincunx
    ])

    const hits = findTransitAspects(transit, natal, ALL_ASPECTS).filter(
      (h) => h.natalPoint === 'Sun'
    )

    const byPlanet = Object.fromEntries(hits.map((h) => [h.transitPlanet, h.type]))
    expect(byPlanet.Mercury).toBe('semisextile')
    expect(byPlanet.Venus).toBe('quintile')
    expect(byPlanet.Mars).toBe('sesquiquadrate')
    expect(byPlanet.Jupiter).toBe('biquintile')
    expect(byPlanet.Saturn).toBe('quincunx')
  })

  it('does NOT emit minor aspect signal when angle is outside the 1.5° orb', () => {
    const natal = makeChart([makePlanet('Sun', 0, 1)])
    // Place transit planet at 33° — 3° off semisextile (30°), outside 1.5° orb.
    const transit = makeChart([makePlanet('Mercury', 33, 0.5)])

    const hits = findTransitAspects(transit, natal, ['semisextile']).filter(
      (h) => h.natalPoint === 'Sun'
    )
    expect(hits.length).toBe(0)
  })

  it('legacy default call (no aspectTypes arg) keeps the major-only behavior', () => {
    const natal = makeChart([makePlanet('Sun', 0, 1)])
    const transit = makeChart([
      makePlanet('Mercury', 30, 0.5), // semisextile — should NOT appear with default call
      makePlanet('Mars', 90, 0.5), // square — major, should appear
    ])

    const hits = findTransitAspects(transit, natal).filter((h) => h.natalPoint === 'Sun')
    const types = new Set(hits.map((h) => h.type))
    expect(types.has('semisextile')).toBe(false)
    expect(types.has('square')).toBe(true)
  })
})
