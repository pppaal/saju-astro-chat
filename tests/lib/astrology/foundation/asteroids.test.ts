// @vitest-environment node
// tests/lib/astrology/foundation/asteroids.test.ts
import { describe, it, expect } from 'vitest'
import {
  calculateAsteroid,
  calculateAllAsteroids,
  extendChartWithAsteroids,
  interpretAsteroid,
  findAsteroidAspects,
  findAllAsteroidAspects,
  getAsteroidInfo,
  type Asteroid,
  type AsteroidName,
} from '@/lib/astrology/foundation/asteroids'
import type { Chart, PlanetBase, AspectType } from '@/lib/astrology/foundation/types'

// 순수 수학 헬퍼: 고정 황경으로 결정론적 Asteroid 픽스처를 만든다.
// (천체력 mock 에 의존하지 않으므로 findAsteroidAspects 결과를 실값으로 단언 가능.)
function makeAsteroid(name: AsteroidName, longitude: number): Asteroid {
  const signs = [
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
  ] as const
  const norm = ((longitude % 360) + 360) % 360
  return {
    name,
    longitude: norm,
    sign: signs[Math.floor(norm / 30)],
    degree: Math.floor(norm % 30),
    minute: 0,
    formatted: `${signs[Math.floor(norm / 30)]} ${Math.floor(norm % 30)}deg`,
    house: Math.floor(norm / 30) + 1,
  }
}

function makePlanet(name: string, longitude: number): PlanetBase {
  const signs = [
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
  ] as const
  const norm = ((longitude % 360) + 360) % 360
  return {
    name,
    longitude: norm,
    sign: signs[Math.floor(norm / 30)],
    degree: Math.floor(norm % 30),
    minute: 0,
    formatted: `${signs[Math.floor(norm / 30)]} ${Math.floor(norm % 30)}deg`,
    house: Math.floor(norm / 30) + 1,
    speed: 1,
  }
}

// Helper function to create a mock chart
function createMockChart(): Chart {
  const mockPlanet: PlanetBase = {
    name: 'Sun',
    longitude: 90,
    sign: 'Cancer',
    degree: 0,
    minute: 0,
    formatted: "Cancer 0°00'",
    house: 4,
    speed: 0.95,
  }

  return {
    planets: [mockPlanet],
    ascendant: mockPlanet,
    mc: { ...mockPlanet, longitude: 0, name: 'MC' },
    houses: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1,
      cusp: i * 30,
      sign: [
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
      ][i] as any,
      formatted: `${i * 30}°`,
    })),
  }
}

describe('asteroids module', () => {
  describe('getAsteroidInfo', () => {
    it('should return info for Ceres', () => {
      const info = getAsteroidInfo('Ceres')
      expect(info).toBeDefined()
      expect(info.korean).toBe('세레스')
      expect(info.themes).toContain('양육')
    })

    it('should return info for Pallas', () => {
      const info = getAsteroidInfo('Pallas')
      expect(info).toBeDefined()
      expect(info.korean).toBe('팔라스 아테나')
      expect(info.themes).toContain('지혜')
    })

    it('should return info for Juno', () => {
      const info = getAsteroidInfo('Juno')
      expect(info).toBeDefined()
      expect(info.korean).toBe('주노')
      expect(info.themes).toContain('결혼')
    })

    it('should return info for Vesta', () => {
      const info = getAsteroidInfo('Vesta')
      expect(info).toBeDefined()
      expect(info.korean).toBe('베스타')
      expect(info.themes).toContain('헌신')
    })
  })

  describe('calculateAsteroid', () => {
    it('should calculate asteroid position', () => {
      const jd = 2451545.0 // J2000.0
      const result = calculateAsteroid('Ceres', jd)

      expect(result).toBeDefined()
      expect(result.name).toBe('Ceres')
      expect(result.longitude).toBeGreaterThanOrEqual(0)
      expect(result.longitude).toBeLessThan(360)
      expect(result.sign).toBeDefined()
      expect(result.degree).toBeGreaterThanOrEqual(0)
      expect(result.degree).toBeLessThan(30)
      expect(result.house).toBeGreaterThanOrEqual(1)
      expect(result.house).toBeLessThanOrEqual(12)
    })

    it('should calculate different asteroids', () => {
      const jd = 2451545.0
      const asteroids: AsteroidName[] = ['Ceres', 'Pallas', 'Juno', 'Vesta']

      asteroids.forEach((name) => {
        const result = calculateAsteroid(name, jd)
        expect(result.name).toBe(name)
        expect(result.longitude).toBeGreaterThanOrEqual(0)
      })
    })

    it('should include speed information', () => {
      const jd = 2451545.0
      const result = calculateAsteroid('Ceres', jd)

      expect(result.speed).toBeDefined()
      expect(typeof result.speed).toBe('number')
    })

    it('should detect retrograde motion', () => {
      const jd = 2451545.0
      const result = calculateAsteroid('Ceres', jd)

      expect(result).toHaveProperty('retrograde')
      expect(typeof result.retrograde).toBe('boolean')
    })
  })

  describe('calculateAllAsteroids', () => {
    it('should calculate all four asteroids', () => {
      const jd = 2451545.0
      const result = calculateAllAsteroids(jd)

      expect(result).toHaveLength(4)
      expect(result.map((a) => a.name).sort()).toEqual(['Ceres', 'Juno', 'Pallas', 'Vesta'])
    })

    it('should return valid positions for all asteroids', () => {
      const jd = 2451545.0
      const result = calculateAllAsteroids(jd)

      result.forEach((asteroid) => {
        expect(asteroid.longitude).toBeGreaterThanOrEqual(0)
        expect(asteroid.longitude).toBeLessThan(360)
        expect(asteroid.sign).toBeDefined()
        expect(asteroid.house).toBeGreaterThanOrEqual(1)
        expect(asteroid.house).toBeLessThanOrEqual(12)
      })
    })
  })

  describe('extendChartWithAsteroids', () => {
    it('should add asteroids to chart', () => {
      const chart = createMockChart()
      const jd = 2451545.0
      const extended = extendChartWithAsteroids(chart, jd)

      expect(extended.ceres).toBeDefined()
      expect(extended.pallas).toBeDefined()
      expect(extended.juno).toBeDefined()
      expect(extended.vesta).toBeDefined()
    })

    it('should preserve original chart properties', () => {
      const chart = createMockChart()
      const jd = 2451545.0
      const extended = extendChartWithAsteroids(chart, jd)

      expect(extended.planets).toEqual(chart.planets)
      expect(extended.ascendant).toEqual(chart.ascendant)
      expect(extended.mc).toEqual(chart.mc)
      expect(extended.houses).toEqual(chart.houses)
    })
  })

  describe('interpretAsteroid', () => {
    it('should provide interpretation for Ceres', () => {
      const asteroid: Asteroid = {
        name: 'Ceres',
        longitude: 90,
        sign: 'Cancer',
        degree: 0,
        minute: 0,
        formatted: "Cancer 0°00'",
        house: 4,
      }

      const interpretation = interpretAsteroid(asteroid)

      expect(interpretation).toBeDefined()
      expect(interpretation.asteroid).toBe('Ceres')
      expect(interpretation.sign).toBe('Cancer')
      expect(interpretation.house).toBe(4)
      expect(interpretation.themes).toBeDefined()
      expect(interpretation.themes.length).toBeGreaterThan(0)
      expect(interpretation.shadow).toBeDefined()
    })

    it('should include Ceres-specific nurturing style', () => {
      const asteroid: Asteroid = {
        name: 'Ceres',
        longitude: 30,
        sign: 'Taurus',
        degree: 0,
        minute: 0,
        formatted: "Taurus 0°00'",
        house: 2,
      }

      const interpretation = interpretAsteroid(asteroid)

      expect(interpretation.nurturingStyle).toBeDefined()
      expect(interpretation.healing).toBeDefined()
    })

    it('should include Pallas-specific intelligence style', () => {
      const asteroid: Asteroid = {
        name: 'Pallas',
        longitude: 60,
        sign: 'Gemini',
        degree: 0,
        minute: 0,
        formatted: "Gemini 0°00'",
        house: 3,
      }

      const interpretation = interpretAsteroid(asteroid)

      expect(interpretation.intelligenceStyle).toBeDefined()
    })

    it('should include Juno-specific partner needs', () => {
      const asteroid: Asteroid = {
        name: 'Juno',
        longitude: 210,
        sign: 'Scorpio',
        degree: 0,
        minute: 0,
        formatted: "Scorpio 0°00'",
        house: 8,
      }

      const interpretation = interpretAsteroid(asteroid)

      expect(interpretation.partnerNeed).toBeDefined()
    })

    it('should include Vesta-specific devotion focus', () => {
      const asteroid: Asteroid = {
        name: 'Vesta',
        longitude: 0,
        sign: 'Aries',
        degree: 0,
        minute: 0,
        formatted: "Aries 0°00'",
        house: 1,
      }

      const interpretation = interpretAsteroid(asteroid)

      expect(interpretation.devotionFocus).toBeDefined()
    })
  })

  describe('findAsteroidAspects', () => {
    it('should find aspects between asteroid and chart planets', () => {
      const asteroid: Asteroid = {
        name: 'Ceres',
        longitude: 90,
        sign: 'Cancer',
        degree: 0,
        minute: 0,
        formatted: "Cancer 0°00'",
        house: 4,
      }

      const chart = createMockChart()
      const aspects = findAsteroidAspects(asteroid, chart)

      expect(Array.isArray(aspects)).toBe(true)
    })

    it('should detect conjunction aspect', () => {
      const asteroid: Asteroid = {
        name: 'Ceres',
        longitude: 90,
        sign: 'Cancer',
        degree: 0,
        minute: 0,
        formatted: "Cancer 0°00'",
        house: 4,
      }

      const chart = createMockChart() // Sun at 90 degrees
      const aspects = findAsteroidAspects(asteroid, chart)

      const conjunction = aspects.find((a) => a.type === 'conjunction')
      expect(conjunction).toBeDefined()
    })

    it('should include aspect details', () => {
      const asteroid: Asteroid = {
        name: 'Ceres',
        longitude: 90,
        sign: 'Cancer',
        degree: 0,
        minute: 0,
        formatted: "Cancer 0°00'",
        house: 4,
      }

      const chart = createMockChart()
      const aspects = findAsteroidAspects(asteroid, chart)

      if (aspects.length > 0) {
        const aspect = aspects[0]
        expect(aspect).toHaveProperty('from')
        expect(aspect).toHaveProperty('to')
        expect(aspect).toHaveProperty('type')
        expect(aspect).toHaveProperty('orb')
      }
    })
  })

  describe('edge cases', () => {
    it('should handle asteroid at 0 degrees Aries', () => {
      const jd = 2451545.0
      const result = calculateAsteroid('Ceres', jd)

      expect(result.longitude).toBeGreaterThanOrEqual(0)
      expect(result.sign).toBeDefined()
    })

    it('should handle asteroid near 360 degrees', () => {
      const asteroid: Asteroid = {
        name: 'Ceres',
        longitude: 359,
        sign: 'Pisces',
        degree: 29,
        minute: 0,
        formatted: "Pisces 29°00'",
        house: 12,
      }

      const interpretation = interpretAsteroid(asteroid)
      expect(interpretation).toBeDefined()
    })

    it('should handle empty chart gracefully', () => {
      const asteroid: Asteroid = {
        name: 'Ceres',
        longitude: 90,
        sign: 'Cancer',
        degree: 0,
        minute: 0,
        formatted: "Cancer 0°00'",
        house: 4,
      }

      const emptyChart: Chart = {
        planets: [],
        ascendant: {} as PlanetBase,
        mc: {} as PlanetBase,
        houses: [],
      }

      expect(() => findAsteroidAspects(asteroid, emptyChart)).not.toThrow()
    })
  })

  // ── 추가: 미커버 분기 타겟 ──────────────────────────────────────────

  describe('calculateAsteroid overloads & house cusps', () => {
    it('accepts the (jdUT, name) argument order', () => {
      const jd = 2451545.0
      const result = calculateAsteroid(jd, 'Pallas')
      expect(result.name).toBe('Pallas')
      expect(result.longitude).toBeGreaterThanOrEqual(0)
      expect(result.longitude).toBeLessThan(360)
    })

    it('accepts the (name, jdUT) argument order', () => {
      const jd = 2451545.0
      const result = calculateAsteroid('Juno', jd)
      expect(result.name).toBe('Juno')
    })

    it('uses provided house cusps when computing house', () => {
      const jd = 2451545.0
      // 30° 시프트된 cusp → inferHouseOf 가 다른 하우스를 줄 수 있음.
      const cusps = Array.from({ length: 12 }, (_, i) => (i * 30 + 15) % 360)
      const result = calculateAsteroid('Ceres', jd, cusps)
      expect(result.house).toBeGreaterThanOrEqual(1)
      expect(result.house).toBeLessThanOrEqual(12)
    })
  })

  describe('findAsteroidAspects — aspect type detection (pure math)', () => {
    // asteroid 고정 0°, planet 을 정확한 aspect 각도에 두어 각 분기 검증.
    const asteroid = makeAsteroid('Vesta', 0)

    const cases: Array<[AspectType, number]> = [
      ['conjunction', 0],
      ['sextile', 60],
      ['square', 90],
      ['trine', 120],
      ['opposition', 180],
    ]

    cases.forEach(([type, angle]) => {
      it(`detects exact ${type} at ${angle}°`, () => {
        const planets = [makePlanet('Sun', angle)]
        const aspects = findAsteroidAspects(asteroid, planets)
        const hit = aspects.find((a) => a.type === type)
        expect(hit).toBeDefined()
        expect(hit?.orb).toBeCloseTo(0, 5)
        // exact 매치 → score 는 1 (1 - 0/orb).
        expect(hit?.score).toBeCloseTo(1, 5)
      })
    })

    it('computes a nonzero orb within tolerance', () => {
      const planets = [makePlanet('Mars', 122)] // trine target 120 → orb 2
      const aspects = findAsteroidAspects(asteroid, planets)
      const trine = aspects.find((a) => a.type === 'trine')
      expect(trine).toBeDefined()
      expect(trine?.orb).toBeCloseTo(2, 5)
      expect(trine?.score).toBeCloseTo(1 - 2 / 5, 5) // default trine orb = 5
    })

    it('rejects aspects beyond the orb', () => {
      // square target 90, default orb 5. 98° → orb 8 > 5 → 거부.
      const planets = [makePlanet('Mars', 98)]
      const aspects = findAsteroidAspects(asteroid, planets)
      expect(aspects.find((a) => a.type === 'square')).toBeUndefined()
    })

    it('honors a custom orb override (tightening rejects, loosening accepts)', () => {
      const planets = [makePlanet('Mars', 94)] // square target 90 → orb 4
      const tight = findAsteroidAspects(asteroid, planets, { square: 2 })
      expect(tight.find((a) => a.type === 'square')).toBeUndefined()
      const loose = findAsteroidAspects(asteroid, planets, { square: 6 })
      const sq = loose.find((a) => a.type === 'square')
      expect(sq).toBeDefined()
      expect(sq?.orb).toBeCloseTo(4, 5)
    })

    it('accepts a Chart object and reads its planets array', () => {
      const chart = createMockChart() // Sun at 90°
      const ceres = makeAsteroid('Ceres', 90) // conjunct Sun
      const aspects = findAsteroidAspects(ceres, chart)
      const conj = aspects.find((a) => a.type === 'conjunction' && a.to.name === 'Sun')
      expect(conj).toBeDefined()
      expect(conj?.orb).toBeCloseTo(0, 5)
    })

    it('returns results sorted by score descending', () => {
      const planets = [
        makePlanet('Sun', 0), // exact conjunction → score 1
        makePlanet('Mars', 64), // sextile target 60 → orb 4 (orb 4) → lower score
      ]
      const aspects = findAsteroidAspects(asteroid, planets)
      expect(aspects.length).toBeGreaterThanOrEqual(2)
      for (let i = 1; i < aspects.length; i++) {
        expect(aspects[i - 1].score ?? 0).toBeGreaterThanOrEqual(aspects[i].score ?? 0)
      }
    })

    it('handles a null/undefined-ish chart planets via fallback', () => {
      const ceres = makeAsteroid('Ceres', 0)
      const aspects = findAsteroidAspects(ceres, { planets: undefined } as unknown as Chart)
      expect(aspects).toEqual([])
    })
  })

  describe('findAllAsteroidAspects', () => {
    it('returns aspect arrays keyed by each asteroid name', () => {
      const asteroids = {
        Ceres: makeAsteroid('Ceres', 0),
        Pallas: makeAsteroid('Pallas', 60),
        Juno: makeAsteroid('Juno', 90),
        Vesta: makeAsteroid('Vesta', 120),
      }
      const planets = [makePlanet('Sun', 0)]
      const result = findAllAsteroidAspects(asteroids, planets)

      expect(Object.keys(result).sort()).toEqual(['Ceres', 'Juno', 'Pallas', 'Vesta'])
      // Ceres at 0° conjunct Sun at 0°.
      expect(result.Ceres.some((a) => a.type === 'conjunction')).toBe(true)
      // Pallas at 60° sextile Sun at 0°.
      expect(result.Pallas.some((a) => a.type === 'sextile')).toBe(true)
      // Juno at 90° square Sun.
      expect(result.Juno.some((a) => a.type === 'square')).toBe(true)
      // Vesta at 120° trine Sun.
      expect(result.Vesta.some((a) => a.type === 'trine')).toBe(true)
    })
  })

  describe('interpretAsteroid — Pallas fixed shadow & all signs', () => {
    it('uses the fixed Pallas shadow string', () => {
      const interp = interpretAsteroid(makeAsteroid('Pallas', 0))
      expect(interp.shadow).toBe('패턴에 갇힘')
      expect(interp.intelligenceStyle).toBeDefined()
    })

    it('populates Juno partnerNeed and sign-specific shadow', () => {
      const interp = interpretAsteroid(makeAsteroid('Juno', 30)) // Taurus
      expect(interp.partnerNeed).toBeDefined()
      expect(interp.shadow.length).toBeGreaterThan(0)
    })

    it('populates Vesta devotionFocus', () => {
      const interp = interpretAsteroid(makeAsteroid('Vesta', 270)) // Capricorn
      expect(interp.devotionFocus).toBeDefined()
      expect(interp.shadow.length).toBeGreaterThan(0)
    })
  })
})
