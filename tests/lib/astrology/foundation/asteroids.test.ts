// @vitest-environment node
// tests/lib/astrology/foundation/asteroids.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculateAsteroid,
  calculateAllAsteroids,
  extendChartWithAsteroids,
  interpretAsteroid,
  findAsteroidAspects,
  getAsteroidInfo,
  type Asteroid,
  type AsteroidName,
} from '@/lib/astrology/foundation/asteroids';
import type { Chart, PlanetBase } from '@/lib/astrology/foundation/types';

// Helper function to create a mock chart
function createMockChart(): Chart {
  const mockPlanet: PlanetBase = {
    name: 'Sun',
    longitude: 90,
    sign: 'Cancer',
    degree: 0,
    minute: 0,
    formatted: 'Cancer 0°00\'',
    house: 4,
    speed: 0.95,
  };

  return {
    planets: [mockPlanet],
    ascendant: mockPlanet,
    mc: { ...mockPlanet, longitude: 0, name: 'MC' },
    houses: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1,
      cusp: i * 30,
      sign: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
             'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][i] as any,
      formatted: `${i * 30}°`,
    })),
  };
}

describe('asteroids module', () => {
  describe('getAsteroidInfo', () => {
    it('should return info for Ceres', () => {
      const info = getAsteroidInfo('Ceres');
      expect(info).toBeDefined();
      expect(info.korean).toBe('세레스');
      expect(info.themes).toContain('양육');
    });

    it('should return info for Pallas', () => {
      const info = getAsteroidInfo('Pallas');
      expect(info).toBeDefined();
      expect(info.korean).toBe('팔라스 아테나');
      expect(info.themes).toContain('지혜');
    });

    it('should return info for Juno', () => {
      const info = getAsteroidInfo('Juno');
      expect(info).toBeDefined();
      expect(info.korean).toBe('주노');
      expect(info.themes).toContain('결혼');
    });

    it('should return info for Vesta', () => {
      const info = getAsteroidInfo('Vesta');
      expect(info).toBeDefined();
      expect(info.korean).toBe('베스타');
      expect(info.themes).toContain('헌신');
    });
  });

  describe('calculateAsteroid', () => {
    it('should calculate asteroid position', () => {
      const jd = 2451545.0; // J2000.0
      const result = calculateAsteroid('Ceres', jd);

      expect(result).toBeDefined();
      expect(result.name).toBe('Ceres');
      expect(result.longitude).toBeGreaterThanOrEqual(0);
      expect(result.longitude).toBeLessThan(360);
      expect(result.sign).toBeDefined();
      expect(result.degree).toBeGreaterThanOrEqual(0);
      expect(result.degree).toBeLessThan(30);
      expect(result.house).toBeGreaterThanOrEqual(1);
      expect(result.house).toBeLessThanOrEqual(12);
    });

    it('should calculate different asteroids', () => {
      const jd = 2451545.0;
      const asteroids: AsteroidName[] = ['Ceres', 'Pallas', 'Juno', 'Vesta'];

      asteroids.forEach(name => {
        const result = calculateAsteroid(name, jd);
        expect(result.name).toBe(name);
        expect(result.longitude).toBeGreaterThanOrEqual(0);
      });
    });

    it('should include speed information', () => {
      const jd = 2451545.0;
      const result = calculateAsteroid('Ceres', jd);

      expect(result.speed).toBeDefined();
      expect(typeof result.speed).toBe('number');
    });

    it('should detect retrograde motion', () => {
      const jd = 2451545.0;
      const result = calculateAsteroid('Ceres', jd);

      expect(result).toHaveProperty('retrograde');
      expect(typeof result.retrograde).toBe('boolean');
    });
  });

  describe('calculateAllAsteroids', () => {
    it('should calculate all four asteroids', () => {
      const jd = 2451545.0;
      const result = calculateAllAsteroids(jd);

      expect(result).toHaveLength(4);
      expect(result.map(a => a.name).sort()).toEqual(['Ceres', 'Juno', 'Pallas', 'Vesta']);
    });

    it('should return valid positions for all asteroids', () => {
      const jd = 2451545.0;
      const result = calculateAllAsteroids(jd);

      result.forEach(asteroid => {
        expect(asteroid.longitude).toBeGreaterThanOrEqual(0);
        expect(asteroid.longitude).toBeLessThan(360);
        expect(asteroid.sign).toBeDefined();
        expect(asteroid.house).toBeGreaterThanOrEqual(1);
        expect(asteroid.house).toBeLessThanOrEqual(12);
      });
    });
  });

  describe('extendChartWithAsteroids', () => {
    it('should add asteroids to chart', () => {
      const chart = createMockChart();
      const jd = 2451545.0;
      const extended = extendChartWithAsteroids(chart, jd);

      expect(extended.ceres).toBeDefined();
      expect(extended.pallas).toBeDefined();
      expect(extended.juno).toBeDefined();
      expect(extended.vesta).toBeDefined();
    });

    it('should preserve original chart properties', () => {
      const chart = createMockChart();
      const jd = 2451545.0;
      const extended = extendChartWithAsteroids(chart, jd);

      expect(extended.planets).toEqual(chart.planets);
      expect(extended.ascendant).toEqual(chart.ascendant);
      expect(extended.mc).toEqual(chart.mc);
      expect(extended.houses).toEqual(chart.houses);
    });
  });

  describe('interpretAsteroid', () => {
    it('should provide interpretation for Ceres', () => {
      const asteroid: Asteroid = {
        name: 'Ceres',
        longitude: 90,
        sign: 'Cancer',
        degree: 0,
        minute: 0,
        formatted: 'Cancer 0°00\'',
        house: 4,
      };

      const interpretation = interpretAsteroid(asteroid);

      expect(interpretation).toBeDefined();
      expect(interpretation.asteroid).toBe('Ceres');
      expect(interpretation.sign).toBe('Cancer');
      expect(interpretation.house).toBe(4);
      expect(interpretation.themes).toBeDefined();
      expect(interpretation.themes.length).toBeGreaterThan(0);
      expect(interpretation.shadow).toBeDefined();
    });

    it('should include Ceres-specific nurturing style', () => {
      const asteroid: Asteroid = {
        name: 'Ceres',
        longitude: 30,
        sign: 'Taurus',
        degree: 0,
        minute: 0,
        formatted: 'Taurus 0°00\'',
        house: 2,
      };

      const interpretation = interpretAsteroid(asteroid);

      expect(interpretation.nurturingStyle).toBeDefined();
      expect(interpretation.healing).toBeDefined();
    });

    it('should include Pallas-specific intelligence style', () => {
      const asteroid: Asteroid = {
        name: 'Pallas',
        longitude: 60,
        sign: 'Gemini',
        degree: 0,
        minute: 0,
        formatted: 'Gemini 0°00\'',
        house: 3,
      };

      const interpretation = interpretAsteroid(asteroid);

      expect(interpretation.intelligenceStyle).toBeDefined();
    });

    it('should include Juno-specific partner needs', () => {
      const asteroid: Asteroid = {
        name: 'Juno',
        longitude: 210,
        sign: 'Scorpio',
        degree: 0,
        minute: 0,
        formatted: 'Scorpio 0°00\'',
        house: 8,
      };

      const interpretation = interpretAsteroid(asteroid);

      expect(interpretation.partnerNeed).toBeDefined();
    });

    it('should include Vesta-specific devotion focus', () => {
      const asteroid: Asteroid = {
        name: 'Vesta',
        longitude: 0,
        sign: 'Aries',
        degree: 0,
        minute: 0,
        formatted: 'Aries 0°00\'',
        house: 1,
      };

      const interpretation = interpretAsteroid(asteroid);

      expect(interpretation.devotionFocus).toBeDefined();
    });
  });

  describe('findAsteroidAspects', () => {
    it('should find aspects between asteroid and chart planets', () => {
      const asteroid: Asteroid = {
        name: 'Ceres',
        longitude: 90,
        sign: 'Cancer',
        degree: 0,
        minute: 0,
        formatted: 'Cancer 0°00\'',
        house: 4,
      };

      const chart = createMockChart();
      const aspects = findAsteroidAspects(asteroid, chart);

      expect(Array.isArray(aspects)).toBe(true);
    });

    it('should detect conjunction aspect', () => {
      const asteroid: Asteroid = {
        name: 'Ceres',
        longitude: 90,
        sign: 'Cancer',
        degree: 0,
        minute: 0,
        formatted: 'Cancer 0°00\'',
        house: 4,
      };

      const chart = createMockChart(); // Sun at 90 degrees
      const aspects = findAsteroidAspects(asteroid, chart);

      const conjunction = aspects.find(a => a.type === 'conjunction');
      expect(conjunction).toBeDefined();
    });

    it('should include aspect details', () => {
      const asteroid: Asteroid = {
        name: 'Ceres',
        longitude: 90,
        sign: 'Cancer',
        degree: 0,
        minute: 0,
        formatted: 'Cancer 0°00\'',
        house: 4,
      };

      const chart = createMockChart();
      const aspects = findAsteroidAspects(asteroid, chart);

      if (aspects.length > 0) {
        const aspect = aspects[0];
        expect(aspect).toHaveProperty('from');
        expect(aspect).toHaveProperty('to');
        expect(aspect).toHaveProperty('type');
        expect(aspect).toHaveProperty('orb');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle asteroid at 0 degrees Aries', () => {
      const jd = 2451545.0;
      const result = calculateAsteroid('Ceres', jd);

      expect(result.longitude).toBeGreaterThanOrEqual(0);
      expect(result.sign).toBeDefined();
    });

    it('should handle asteroid near 360 degrees', () => {
      const asteroid: Asteroid = {
        name: 'Ceres',
        longitude: 359,
        sign: 'Pisces',
        degree: 29,
        minute: 0,
        formatted: 'Pisces 29°00\'',
        house: 12,
      };

      const interpretation = interpretAsteroid(asteroid);
      expect(interpretation).toBeDefined();
    });

    it('should handle empty chart gracefully', () => {
      const asteroid: Asteroid = {
        name: 'Ceres',
        longitude: 90,
        sign: 'Cancer',
        degree: 0,
        minute: 0,
        formatted: 'Cancer 0°00\'',
        house: 4,
      };

      const emptyChart: Chart = {
        planets: [],
        ascendant: {} as PlanetBase,
        mc: {} as PlanetBase,
        houses: [],
      };

      expect(() => findAsteroidAspects(asteroid, emptyChart)).not.toThrow();
    });
  });
});

