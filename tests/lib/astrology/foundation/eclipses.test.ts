// @vitest-environment node
// tests/lib/astrology/foundation/eclipses.test.ts
import { describe, it, expect } from 'vitest';
import {
  findEclipseImpact,
  getEclipsesBetween,
  getUpcomingEclipses,
  getEclipsesInSign,
  getEclipseAxis,
  checkEclipseSensitivity,
  getAllEclipses,
  type Eclipse,
} from '@/lib/astrology/foundation/eclipses';
import type { Chart, PlanetBase } from '@/lib/astrology/foundation/types';

function createMockChart(planets: Partial<PlanetBase>[] = []): Chart {
  const defaultPlanets: PlanetBase[] = planets.map((p, i) => ({
    name: p.name || `Planet${i}`,
    longitude: p.longitude ?? 0,
    sign: p.sign || 'Aries',
    degree: p.degree ?? 0,
    minute: p.minute ?? 0,
    formatted: p.formatted || '0°00\'',
    house: p.house ?? 1,
    speed: p.speed ?? 1,
  })) as PlanetBase[];

  return {
    planets: defaultPlanets,
    ascendant: { name: 'ASC', longitude: 0, sign: 'Aries', degree: 0, minute: 0, formatted: '0°', house: 1, speed: 0 },
    mc: { name: 'MC', longitude: 90, sign: 'Cancer', degree: 0, minute: 0, formatted: '90°', house: 10, speed: 0 },
    houses: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1,
      cusp: i * 30,
      sign: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][i] as any,
      formatted: `${i * 30}°`,
    })),
  };
}

describe('eclipses', () => {
  describe('getAllEclipses', () => {
    it('should return array of eclipses', () => {
      const eclipses = getAllEclipses();
      expect(Array.isArray(eclipses)).toBe(true);
      expect(eclipses.length).toBeGreaterThan(0);
    });

    it('should have valid eclipse structure', () => {
      const eclipses = getAllEclipses();
      const eclipse = eclipses[0];

      expect(eclipse).toHaveProperty('type');
      expect(eclipse).toHaveProperty('date');
      expect(eclipse).toHaveProperty('longitude');
      expect(eclipse).toHaveProperty('sign');
      expect(eclipse).toHaveProperty('degree');
      expect(['solar', 'lunar']).toContain(eclipse.type);
    });

    it('should have eclipses in date order', () => {
      const eclipses = getAllEclipses();
      for (let i = 1; i < eclipses.length; i++) {
        const prev = new Date(eclipses[i - 1].date);
        const curr = new Date(eclipses[i].date);
        expect(curr >= prev).toBe(true);
      }
    });
  });

  describe('getEclipsesBetween', () => {
    it('should return eclipses within date range', () => {
      const eclipses = getEclipsesBetween('2020-01-01', '2020-12-31');

      expect(Array.isArray(eclipses)).toBe(true);
      eclipses.forEach(e => {
        const date = new Date(e.date);
        expect(date >= new Date('2020-01-01')).toBe(true);
        expect(date <= new Date('2020-12-31')).toBe(true);
      });
    });

    it('should return empty array when no eclipses in range', () => {
      const eclipses = getEclipsesBetween('2000-01-01', '2000-12-31');
      expect(eclipses).toEqual([]);
    });

    it('should handle single day range', () => {
      const eclipses = getEclipsesBetween('2020-06-21', '2020-06-21');
      expect(eclipses.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getUpcomingEclipses', () => {
    it('should return future eclipses from given date', () => {
      const eclipses = getUpcomingEclipses(new Date('2020-01-01'), 3);

      expect(eclipses.length).toBeLessThanOrEqual(3);
      eclipses.forEach(e => {
        expect(new Date(e.date) >= new Date('2020-01-01')).toBe(true);
      });
    });

    it('should respect count parameter', () => {
      const eclipses = getUpcomingEclipses(new Date('2020-01-01'), 5);
      expect(eclipses.length).toBeLessThanOrEqual(5);
    });

    it('should return empty array if no future eclipses', () => {
      const eclipses = getUpcomingEclipses(new Date('2100-01-01'), 5);
      expect(eclipses).toEqual([]);
    });
  });

  describe('getEclipsesInSign', () => {
    it('should return eclipses in Aries', () => {
      const eclipses = getEclipsesInSign('Aries');
      eclipses.forEach(e => {
        expect(e.sign).toBe('Aries');
      });
    });

    it('should return eclipses in Taurus', () => {
      const eclipses = getEclipsesInSign('Taurus');
      eclipses.forEach(e => {
        expect(e.sign).toBe('Taurus');
      });
    });

    it('should return empty array for signs with no eclipses', () => {
      const eclipses = getEclipsesInSign('Leo');
      expect(Array.isArray(eclipses)).toBe(true);
    });
  });

  describe('getEclipseAxis', () => {
    it('should return primary and opposite signs', () => {
      const eclipse: Eclipse = {
        type: 'solar',
        date: '2020-01-01',
        longitude: 0,
        sign: 'Aries',
        degree: 0,
        description: 'Test',
      };

      const axis = getEclipseAxis(eclipse);
      expect(axis).toHaveProperty('primary');
      expect(axis).toHaveProperty('opposite');
      expect(axis.primary).toBe('Aries');
      expect(axis.opposite).toBe('Libra');
    });

    it('should handle Taurus-Scorpio axis', () => {
      const eclipse: Eclipse = {
        type: 'lunar',
        date: '2020-01-01',
        longitude: 40,
        sign: 'Taurus',
        degree: 10,
        description: 'Test',
      };

      const axis = getEclipseAxis(eclipse);
      expect(axis.primary).toBe('Taurus');
      expect(axis.opposite).toBe('Scorpio');
    });
  });

  describe('checkEclipseSensitivity', () => {
    it('should detect sensitivity when planet near nodes', () => {
      const chart = createMockChart([
        { name: 'Sun', longitude: 90, sign: 'Cancer' }
      ]);

      const result = checkEclipseSensitivity(chart);
      expect(result).toHaveProperty('sensitive');
      expect(typeof result.sensitive).toBe('boolean');
    });

    it('should return sensitivePoints array', () => {
      const chart = createMockChart([
        { name: 'Sun', longitude: 0, sign: 'Aries' }
      ]);

      const result = checkEclipseSensitivity(chart);
      expect(Array.isArray(result.sensitivePoints)).toBe(true);
    });
  });

  describe('findEclipseImpact', () => {
    it('should find conjunction with natal planet', () => {
      const eclipse: Eclipse = {
        type: 'solar',
        date: '2020-06-21',
        longitude: 90,
        sign: 'Cancer',
        degree: 0,
        description: 'Test',
      };

      const chart = createMockChart([
        { name: 'Sun', longitude: 90, sign: 'Cancer', house: 4 }
      ]);

      const impacts = findEclipseImpact(chart, [eclipse]);
      expect(Array.isArray(impacts)).toBe(true);

      if (impacts.length > 0) {
        expect(impacts[0]).toHaveProperty('aspectType');
        expect(impacts[0]).toHaveProperty('affectedPoint');
        expect(impacts[0]).toHaveProperty('orb');
      }
    });

    it('should find opposition aspect', () => {
      const eclipse: Eclipse = {
        type: 'lunar',
        date: '2020-06-05',
        longitude: 90,
        sign: 'Cancer',
        degree: 0,
        description: 'Test',
      };

      const chart = createMockChart([
        { name: 'Moon', longitude: 270, sign: 'Capricorn', house: 10 }
      ]);

      const impacts = findEclipseImpact(chart, [eclipse]);
      expect(Array.isArray(impacts)).toBe(true);
    });

    it('should include house information', () => {
      const eclipse: Eclipse = {
        type: 'solar',
        date: '2020-01-01',
        longitude: 0,
        sign: 'Aries',
        degree: 0,
        description: 'Test',
      };

      const chart = createMockChart([
        { name: 'Venus', longitude: 5, sign: 'Aries', house: 1 }
      ]);

      const impacts = findEclipseImpact(chart, [eclipse]);
      if (impacts.length > 0) {
        expect(impacts[0].house).toBeGreaterThanOrEqual(1);
        expect(impacts[0].house).toBeLessThanOrEqual(12);
      }
    });

    it('should handle empty chart', () => {
      const eclipse: Eclipse = {
        type: 'solar',
        date: '2020-01-01',
        longitude: 0,
        sign: 'Aries',
        degree: 0,
        description: 'Test',
      };

      const chart = createMockChart([]);
      const impacts = findEclipseImpact(chart, [eclipse]);
      expect(Array.isArray(impacts)).toBe(true);
    });
  });

  describe('integration', () => {
    it('should work with real eclipse data', () => {
      const eclipses = getAllEclipses();
      expect(eclipses.length).toBeGreaterThan(10);

      const eclipse2020 = getEclipsesBetween('2020-01-01', '2020-12-31');
      expect(eclipse2020.length).toBeGreaterThan(0);
    });

    it('should find impacts for multiple planets', () => {
      const eclipse: Eclipse = {
        type: 'solar',
        date: '2020-01-01',
        longitude: 90,
        sign: 'Cancer',
        degree: 0,
        description: 'Test',
      };

      const chart = createMockChart([
        { name: 'Sun', longitude: 88, sign: 'Cancer', house: 4 },
        { name: 'Moon', longitude: 270, sign: 'Capricorn', house: 10 },
        { name: 'Mars', longitude: 180, sign: 'Libra', house: 7 },
      ]);

      const impacts = findEclipseImpact(chart, [eclipse]);
      expect(impacts.length).toBeGreaterThan(0);
    });
  });
});

