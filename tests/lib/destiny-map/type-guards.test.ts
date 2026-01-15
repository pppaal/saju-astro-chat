// tests/lib/destiny-map/type-guards.test.ts
import { describe, it, expect } from 'vitest';
import {
  isChart,
  isAstrologyChartFacts,
  isSajuPillar,
  normalizePillar,
  isPlanet,
  isPlanetArray,
  getNestedProperty,
  assertType,
} from '@/lib/destiny-map/type-guards';

describe('Type Guards', () => {
  describe('isChart', () => {
    it('should return true for valid Chart', () => {
      const chart = {
        planets: [],
        houses: {},
        aspects: {},
      };
      expect(isChart(chart)).toBe(true);
    });

    it('should return false for invalid Chart', () => {
      expect(isChart(null)).toBe(false);
      expect(isChart(undefined)).toBe(false);
      expect(isChart({})).toBe(false);
      expect(isChart({ planets: 'not-array' })).toBe(false);
    });
  });

  describe('isAstrologyChartFacts', () => {
    it('should return true for valid facts', () => {
      const facts = {
        sunSign: 'Aries',
        moonSign: 'Taurus',
        ascendant: 'Gemini',
      };
      expect(isAstrologyChartFacts(facts)).toBe(true);
    });

    it('should return false for invalid facts', () => {
      expect(isAstrologyChartFacts(null)).toBe(false);
      expect(isAstrologyChartFacts({ sunSign: 'Aries' })).toBe(false);
      expect(isAstrologyChartFacts({ sunSign: 123 })).toBe(false);
    });
  });

  describe('isSajuPillar', () => {
    it('should return true for valid pillar', () => {
      const pillar = {
        heavenlyStem: { name: '甲' },
        earthlyBranch: { name: '子' },
      };
      expect(isSajuPillar(pillar)).toBe(true);
    });

    it('should return false for invalid pillar', () => {
      expect(isSajuPillar(null)).toBe(false);
      expect(isSajuPillar({})).toBe(false);
      expect(isSajuPillar({ heavenlyStem: '甲' })).toBe(false);
    });
  });

  describe('normalizePillar', () => {
    it('should return pillar already in correct format', () => {
      const pillar = {
        heavenlyStem: { name: '甲' },
        earthlyBranch: { name: '子' },
      };
      const normalized = normalizePillar(pillar);
      expect(normalized).toEqual(pillar);
    });

    it('should normalize string format', () => {
      const pillar = {
        heavenlyStem: '甲',
        earthlyBranch: '子',
      };
      const normalized = normalizePillar(pillar);
      expect(normalized).toEqual({
        heavenlyStem: { name: '甲' },
        earthlyBranch: { name: '子' },
      });
    });

    it('should normalize stem/branch format', () => {
      const pillar = {
        stem: { name: '甲' },
        branch: { name: '子' },
      };
      const normalized = normalizePillar(pillar);
      expect(normalized).toEqual({
        heavenlyStem: { name: '甲' },
        earthlyBranch: { name: '子' },
      });
    });

    it('should return null for invalid input', () => {
      expect(normalizePillar(null)).toBeNull();
      expect(normalizePillar(undefined)).toBeNull();
      expect(normalizePillar({})).toBeNull();
      expect(normalizePillar({ heavenlyStem: '甲' })).toBeNull();
    });
  });

  describe('isPlanet', () => {
    it('should return true for valid planet', () => {
      const planet = {
        name: 'Sun',
        longitude: 120.5,
      };
      expect(isPlanet(planet)).toBe(true);
    });

    it('should return false for invalid planet', () => {
      expect(isPlanet(null)).toBe(false);
      expect(isPlanet({ name: 'Sun' })).toBe(false);
      expect(isPlanet({ longitude: 120 })).toBe(false);
    });
  });

  describe('isPlanetArray', () => {
    it('should return true for valid planet array', () => {
      const planets = [
        { name: 'Sun', longitude: 120 },
        { name: 'Moon', longitude: 240 },
      ];
      expect(isPlanetArray(planets)).toBe(true);
    });

    it('should return false for invalid array', () => {
      expect(isPlanetArray(null)).toBe(false);
      expect(isPlanetArray([{ name: 'Sun' }])).toBe(false);
      expect(isPlanetArray(['not', 'planets'])).toBe(false);
    });
  });

  describe('getNestedProperty', () => {
    it('should get nested property', () => {
      const obj = {
        a: {
          b: {
            c: 'value',
          },
        },
      };
      expect(getNestedProperty(obj, 'a.b.c', 'default')).toBe('value');
    });

    it('should return default for missing property', () => {
      const obj = { a: { b: {} } };
      expect(getNestedProperty(obj, 'a.b.c', 'default')).toBe('default');
    });

    it('should return default for null object', () => {
      expect(getNestedProperty(null, 'a.b.c', 'default')).toBe('default');
    });

    it('should handle array indices', () => {
      const obj = { items: [{ name: 'first' }, { name: 'second' }] };
      expect(getNestedProperty(obj, 'items.0.name', 'default')).toBe('first');
    });
  });

  describe('assertType', () => {
    it('should return value if guard passes', () => {
      const value = { name: 'Sun', longitude: 120 };
      expect(assertType(value, isPlanet, 'Not a planet')).toEqual(value);
    });

    it('should throw if guard fails', () => {
      const value = { name: 'Sun' };
      expect(() => assertType(value, isPlanet, 'Not a planet')).toThrow('Not a planet');
    });
  });
});
