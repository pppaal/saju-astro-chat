// @vitest-environment node
// tests/lib/astrology/foundation/shared.test.ts
import { describe, it, expect } from 'vitest';
import {
  getPlanetList,
  natalToJD,
  jdToISO,
  isoToJD,
  isSwissEphError,
  throwIfSwissEphError,
  getMidpoint,
  findHouseForLongitude,
  createPlanetData,
  getSwissEphFlags,
} from '@/lib/astrology/foundation/shared';
import type { NatalInput, House } from '@/lib/astrology/foundation/types';

// Helper function to create test natal input
function createNatalInput(overrides?: Partial<NatalInput>): NatalInput {
  return {
    year: 1990,
    month: 6,
    date: 15,
    hour: 12,
    minute: 0,
    latitude: 37.5665,
    longitude: 126.9780,
    timeZone: 'Asia/Seoul',
    ...overrides,
  };
}

// Helper to create mock houses
function createMockHouses(): House[] {
  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ] as const;

  return Array.from({ length: 12 }, (_, i) => ({
    index: i + 1,
    cusp: i * 30,
    sign: signs[i],
    formatted: `${i * 30}deg`,
  }));
}

describe('astrology/foundation/shared', () => {
  describe('getPlanetList', () => {
    it('should return planet list with all major planets', () => {
      const planets = getPlanetList();

      expect(planets).toHaveProperty('Sun');
      expect(planets).toHaveProperty('Moon');
      expect(planets).toHaveProperty('Mercury');
      expect(planets).toHaveProperty('Venus');
      expect(planets).toHaveProperty('Mars');
      expect(planets).toHaveProperty('Jupiter');
      expect(planets).toHaveProperty('Saturn');
      expect(planets).toHaveProperty('Uranus');
      expect(planets).toHaveProperty('Neptune');
      expect(planets).toHaveProperty('Pluto');
      expect(planets).toHaveProperty('True Node');
    });

    it('should return numeric IDs for all planets', () => {
      const planets = getPlanetList();

      for (const [name, id] of Object.entries(planets)) {
        expect(typeof id).toBe('number');
        expect(id).toBeGreaterThanOrEqual(0);
      }
    });

    it('should return cached value on subsequent calls', () => {
      const list1 = getPlanetList();
      const list2 = getPlanetList();

      expect(list1).toBe(list2);
    });
  });

  describe('natalToJD', () => {
    it('should convert natal input to Julian Day', () => {
      const natal = createNatalInput();
      const jd = natalToJD(natal);

      expect(typeof jd).toBe('number');
      expect(jd).toBeGreaterThan(0);
      expect(jd).toBeGreaterThan(2400000); // After 1858
    });

    it('should produce different JD for different dates', () => {
      const natal1 = createNatalInput({ year: 1990, month: 1, date: 1 });
      const natal2 = createNatalInput({ year: 1995, month: 12, date: 31 });

      const jd1 = natalToJD(natal1);
      const jd2 = natalToJD(natal2);

      expect(jd1).not.toBe(jd2);
      expect(jd2).toBeGreaterThan(jd1);
    });

    it('should produce different JD for different times', () => {
      const natalAM = createNatalInput({ hour: 6, minute: 0 });
      const natalPM = createNatalInput({ hour: 18, minute: 0 });

      const jdAM = natalToJD(natalAM);
      const jdPM = natalToJD(natalPM);

      expect(jdAM).not.toBe(jdPM);
      expect(jdPM).toBeGreaterThan(jdAM);
    });

    it('should handle different time zones', () => {
      const natalUTC = createNatalInput({ timeZone: 'UTC' });
      const natalTokyo = createNatalInput({ timeZone: 'Asia/Tokyo' });

      const jdUTC = natalToJD(natalUTC);
      const jdTokyo = natalToJD(natalTokyo);

      // Same local time but different timezone should produce different JDs
      expect(jdUTC).not.toBe(jdTokyo);
    });

    it('should throw error for invalid date', () => {
      const invalidNatal = createNatalInput({ month: 13, date: 32 });

      expect(() => natalToJD(invalidNatal)).toThrow();
    });

    it('should handle leap year dates', () => {
      const leapNatal = createNatalInput({ year: 1992, month: 2, date: 29 });
      const jd = natalToJD(leapNatal);

      expect(jd).toBeGreaterThan(0);
    });
  });

  describe('jdToISO', () => {
    it('should convert Julian Day to ISO string', () => {
      const natal = createNatalInput();
      const jd = natalToJD(natal);
      const iso = jdToISO(jd);

      expect(typeof iso).toBe('string');
      expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    });

    it('should handle round-trip conversion', () => {
      const natal = createNatalInput();
      const jd1 = natalToJD(natal);
      const iso = jdToISO(jd1);
      const jd2 = isoToJD(iso, 'UTC');

      expect(jd2).toBeCloseTo(jd1, 5);
    });

    it('should format with proper zero padding', () => {
      const natal = createNatalInput({
        month: 1,
        date: 1,
        hour: 0,
        minute: 0,
        timeZone: 'UTC',
      });
      const jd = natalToJD(natal);
      const iso = jdToISO(jd);

      expect(iso).toContain('-01-');
      expect(iso).toContain('T00:00:');
    });
  });

  describe('isoToJD', () => {
    it('should convert ISO string to Julian Day', () => {
      const iso = '2000-01-01T12:00:00Z';
      const jd = isoToJD(iso, 'UTC');

      expect(typeof jd).toBe('number');
      expect(jd).toBeGreaterThan(0);
    });

    it('should handle different time zones', () => {
      const iso = '2000-01-01T12:00:00';
      const jdUTC = isoToJD(iso, 'UTC');
      const jdTokyo = isoToJD(iso, 'Asia/Tokyo');

      expect(jdUTC).not.toBe(jdTokyo);
    });

    it('should throw error for invalid ISO string', () => {
      expect(() => isoToJD('invalid-date', 'UTC')).toThrow();
    });
  });

  describe('isSwissEphError', () => {
    it('should return true for error objects', () => {
      const error = { error: 'Test error' };
      expect(isSwissEphError(error)).toBe(true);
    });

    it('should return false for non-error objects', () => {
      const validResult = { longitude: 100, speed: 0.5 };
      expect(isSwissEphError(validResult)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isSwissEphError(null)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isSwissEphError(42)).toBe(false);
      expect(isSwissEphError('string')).toBe(false);
    });
  });

  describe('throwIfSwissEphError', () => {
    it('should throw for error objects', () => {
      const error = { error: 'Test error' };

      expect(() => throwIfSwissEphError(error, 'Test context')).toThrow('Test context');
      expect(() => throwIfSwissEphError(error, 'Test context')).toThrow('Test error');
    });

    it('should not throw for valid results', () => {
      const validResult = { longitude: 100, speed: 0.5 };

      expect(() => throwIfSwissEphError(validResult, 'Test context')).not.toThrow();
    });
  });

  describe('getMidpoint', () => {
    it('should calculate midpoint for nearby longitudes', () => {
      const mid = getMidpoint(10, 20);

      expect(mid).toBe(15);
    });

    it('should calculate midpoint for opposite longitudes', () => {
      const mid = getMidpoint(0, 180);

      expect(mid).toBe(90);
    });

    it('should handle wrapping around 0 degrees', () => {
      const mid = getMidpoint(350, 10);

      expect(mid).toBe(0);
    });

    it('should choose shorter arc', () => {
      const mid = getMidpoint(10, 350);

      expect(mid).toBe(0);
    });

    it('should handle 90 degree separation', () => {
      const mid = getMidpoint(0, 90);

      expect(mid).toBe(45);
    });

    it('should handle 270 degree separation (longer arc)', () => {
      const mid = getMidpoint(0, 270);

      // Should use shorter arc: 0 -> 270 (going backwards) = 90 degrees / 2 = 45 degrees backwards from 0 = 315
      expect(mid).toBeCloseTo(315, 1);
    });

    it('should return value between 0 and 360', () => {
      const mid1 = getMidpoint(350, 10);
      const mid2 = getMidpoint(100, 200);

      expect(mid1).toBeGreaterThanOrEqual(0);
      expect(mid1).toBeLessThan(360);
      expect(mid2).toBeGreaterThanOrEqual(0);
      expect(mid2).toBeLessThan(360);
    });
  });

  describe('findHouseForLongitude', () => {
    it('should find correct house for planet at cusp', () => {
      const houses = createMockHouses();
      const house = findHouseForLongitude(0, houses);

      expect(house).toBe(1);
    });

    it('should find correct house for planet in middle', () => {
      const houses = createMockHouses();
      const house = findHouseForLongitude(15, houses);

      expect(house).toBe(1);
    });

    it('should find correct house for all 12 houses', () => {
      const houses = createMockHouses();

      for (let i = 0; i < 12; i++) {
        const testLon = i * 30 + 10;
        const house = findHouseForLongitude(testLon, houses);
        expect(house).toBe(i + 1);
      }
    });

    it('should handle longitude near 360 degrees', () => {
      const houses = createMockHouses();
      const house = findHouseForLongitude(355, houses);

      expect(house).toBe(12);
    });

    it('should handle longitude wrapping', () => {
      const houses = createMockHouses();
      const house = findHouseForLongitude(0, houses);

      expect(house).toBeGreaterThanOrEqual(1);
      expect(house).toBeLessThanOrEqual(12);
    });
  });

  describe('createPlanetData', () => {
    it('should create planet data with all required fields', () => {
      const houses = createMockHouses();
      const planet = createPlanetData('Sun', 100, houses);

      expect(planet.name).toBe('Sun');
      expect(planet.longitude).toBe(100);
      expect(planet.sign).toBeDefined();
      expect(planet.degree).toBeDefined();
      expect(planet.minute).toBeDefined();
      expect(planet.formatted).toBeDefined();
      expect(planet.house).toBeGreaterThanOrEqual(1);
      expect(planet.house).toBeLessThanOrEqual(12);
    });

    it('should calculate correct sign for longitude', () => {
      const houses = createMockHouses();
      const planet1 = createPlanetData('Sun', 0, houses);
      const planet2 = createPlanetData('Moon', 90, houses);
      const planet3 = createPlanetData('Mercury', 180, houses);

      expect(planet1.sign).toBe('Aries');
      expect(planet2.sign).toBe('Cancer');
      expect(planet3.sign).toBe('Libra');
    });

    it('should mark retrograde when speed is negative', () => {
      const houses = createMockHouses();
      const retrograde = createPlanetData('Mercury', 100, houses, -0.5);

      expect(retrograde.retrograde).toBe(true);
    });

    it('should mark direct when speed is positive', () => {
      const houses = createMockHouses();
      const direct = createPlanetData('Mercury', 100, houses, 1.2);

      expect(direct.retrograde).toBe(false);
    });

    it('should handle undefined speed', () => {
      const houses = createMockHouses();
      const planet = createPlanetData('Sun', 100, houses);

      expect(planet.speed).toBeUndefined();
      expect(planet.retrograde).toBeUndefined();
    });
  });

  describe('getSwissEphFlags', () => {
    it('should return numeric flags', () => {
      const flags = getSwissEphFlags();

      expect(typeof flags).toBe('number');
      expect(flags).toBeGreaterThanOrEqual(0);
    });

    it('should return cached value on subsequent calls', () => {
      const flags1 = getSwissEphFlags();
      const flags2 = getSwissEphFlags();

      expect(flags1).toBe(flags2);
    });
  });

  describe('edge cases', () => {
    it('should handle midpoint across year boundary', () => {
      const mid = getMidpoint(355, 5);

      expect(mid).toBe(0);
    });

    it('should handle planet at exact degree boundaries', () => {
      const houses = createMockHouses();
      const house1 = findHouseForLongitude(30, houses);
      const house2 = findHouseForLongitude(60, houses);

      expect(house1).toBeGreaterThanOrEqual(1);
      expect(house1).toBeLessThanOrEqual(12);
      expect(house2).toBeGreaterThanOrEqual(1);
      expect(house2).toBeLessThanOrEqual(12);
    });

    it('should handle very precise longitudes', () => {
      const houses = createMockHouses();
      const planet = createPlanetData('Sun', 123.456789, houses);

      expect(planet.longitude).toBe(123.456789);
      expect(planet.degree).toBeGreaterThanOrEqual(0);
      expect(planet.degree).toBeLessThan(30);
      expect(planet.minute).toBeGreaterThanOrEqual(0);
      expect(planet.minute).toBeLessThan(60);
    });
  });
});

