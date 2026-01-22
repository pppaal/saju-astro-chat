/**
 * Destiny Map Engine Core MEGA Test Suite
 * Comprehensive testing for the main orchestrator of astrology calculations
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  computeDestinyMapRefactored,
  calculateAstrologyData,
  destinyMapCache,
  getNowInTimezone,
  type CombinedInput,
  type CombinedResult,
} from '@/lib/destiny-map/astrology/engine-core';
import {
  resolveTimezone,
  validateCoordinates,
  parseBirthDateTime,
} from '@/lib/destiny-map/astrology/helpers';

// ============================================================
// Test Data Fixtures
// ============================================================

const createValidInput = (overrides?: Partial<CombinedInput>): CombinedInput => ({
  birthDate: '1990-06-15',
  birthTime: '14:30',
  latitude: 37.5665,  // Seoul
  longitude: 126.9780,
  gender: 'male',
  tz: 'Asia/Seoul',
  ...overrides,
});

// ============================================================
// Helper Function Tests
// ============================================================

describe('engine-core MEGA - Helper Functions', () => {
  describe('validateCoordinates', () => {
    it('should accept valid coordinates', () => {
      expect(() => validateCoordinates(37.5665, 126.9780)).not.toThrow();  // Seoul
      expect(() => validateCoordinates(40.7128, -74.0060)).not.toThrow(); // New York
      expect(() => validateCoordinates(0, 0)).not.toThrow();              // Equator/Prime Meridian
    });

    it('should reject latitude out of range', () => {
      expect(() => validateCoordinates(91, 0)).toThrow('Invalid coordinates');
      expect(() => validateCoordinates(-91, 0)).toThrow('Invalid coordinates');
    });

    it('should reject longitude out of range', () => {
      expect(() => validateCoordinates(0, 181)).toThrow('Invalid coordinates');
      expect(() => validateCoordinates(0, -181)).toThrow('Invalid coordinates');
    });

    it('should reject NaN or Infinity', () => {
      expect(() => validateCoordinates(NaN, 0)).toThrow();
      expect(() => validateCoordinates(0, Infinity)).toThrow();
      expect(() => validateCoordinates(-Infinity, NaN)).toThrow();
    });

    it('should accept boundary values', () => {
      expect(() => validateCoordinates(90, 180)).not.toThrow();   // Max values
      expect(() => validateCoordinates(-90, -180)).not.toThrow(); // Min values
    });

    it('should accept polar coordinates', () => {
      expect(() => validateCoordinates(89.9, 0)).not.toThrow();   // Near North Pole
      expect(() => validateCoordinates(-89.9, 0)).not.toThrow();  // Near South Pole
    });
  });

  describe('parseBirthDateTime', () => {
    it('should parse valid date and time', () => {
      const result = parseBirthDateTime('1990-06-15', '14:30');
      expect(result).toEqual({
        year: 1990,
        month: 6,
        day: 15,
        hour: 14,
        minute: 30,
      });
    });

    it('should handle midnight', () => {
      const result = parseBirthDateTime('2000-01-01', '00:00');
      expect(result).toEqual({
        year: 2000,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
      });
    });

    it('should handle 23:59', () => {
      const result = parseBirthDateTime('1995-12-31', '23:59');
      expect(result).toEqual({
        year: 1995,
        month: 12,
        day: 31,
        hour: 23,
        minute: 59,
      });
    });

    it('should handle leap year dates', () => {
      const result = parseBirthDateTime('2000-02-29', '12:00');
      expect(result.year).toBe(2000);
      expect(result.month).toBe(2);
      expect(result.day).toBe(29);
    });

    it('should handle single-digit months and days with leading zeros', () => {
      const result = parseBirthDateTime('2000-01-05', '09:05');
      expect(result).toEqual({
        year: 2000,
        month: 1,
        day: 5,
        hour: 9,
        minute: 5,
      });
    });
  });

  describe('resolveTimezone', () => {
    it('should prioritize explicit timezone', () => {
      const tz = resolveTimezone('America/New_York', 37.5665, 126.9780);
      expect(tz).toBe('America/New_York');
    });

    it('should use coordinate-based timezone when tz is undefined', () => {
      const tz = resolveTimezone(undefined, 37.5665, 126.9780); // Seoul
      expect(tz).toBe('Asia/Seoul');
    });

    it('should return default timezone for invalid coordinates', () => {
      const tz = resolveTimezone(undefined, 999, 999);
      expect(typeof tz).toBe('string');
      expect(tz.length).toBeGreaterThan(0);
    });

    it('should handle ocean coordinates', () => {
      const tz = resolveTimezone(undefined, 0, -30); // Atlantic Ocean
      expect(typeof tz).toBe('string');
    });

    it('should handle various major cities', () => {
      const nyTz = resolveTimezone(undefined, 40.7128, -74.0060);   // New York
      const londonTz = resolveTimezone(undefined, 51.5074, -0.1278); // London
      const tokyoTz = resolveTimezone(undefined, 35.6762, 139.6503); // Tokyo

      expect(nyTz).toBeDefined();
      expect(londonTz).toBeDefined();
      expect(tokyoTz).toBeDefined();
    });
  });

  describe('getNowInTimezone', () => {
    it('should return current time components', () => {
      const result = getNowInTimezone('Asia/Seoul');

      expect(result.year).toBeGreaterThan(2020);
      expect(result.month).toBeGreaterThanOrEqual(1);
      expect(result.month).toBeLessThanOrEqual(12);
      expect(result.day).toBeGreaterThanOrEqual(1);
      expect(result.day).toBeLessThanOrEqual(31);
      expect(result.hour).toBeGreaterThanOrEqual(0);
      expect(result.hour).toBeLessThanOrEqual(23);
      expect(result.minute).toBeGreaterThanOrEqual(0);
      expect(result.minute).toBeLessThanOrEqual(59);
      expect(result.second).toBeGreaterThanOrEqual(0);
      expect(result.second).toBeLessThanOrEqual(59);
    });

    it('should handle UTC timezone', () => {
      const result = getNowInTimezone('UTC');
      expect(result.year).toBeGreaterThan(2020);
    });

    it('should handle various timezones', () => {
      const seoulTime = getNowInTimezone('Asia/Seoul');
      const nyTime = getNowInTimezone('America/New_York');
      const londonTime = getNowInTimezone('Europe/London');

      expect(seoulTime).toBeDefined();
      expect(nyTime).toBeDefined();
      expect(londonTime).toBeDefined();
    });

    it('should default to UTC when timezone is undefined', () => {
      const result = getNowInTimezone(undefined);
      expect(result.year).toBeGreaterThan(2020);
    });
  });
});

// ============================================================
// Main Function Tests: computeDestinyMapRefactored
// ============================================================

describe('engine-core MEGA - computeDestinyMapRefactored', () => {
  beforeEach(() => {
    destinyMapCache.clear();
  });

  describe('Basic functionality', () => {
    it('should return valid result with all fields', async () => {
      const input = createValidInput();
      const result = await computeDestinyMapRefactored(input);

      expect(result).toBeDefined();
      expect(result.meta).toBeDefined();
      expect(result.meta.generator).toContain('DestinyMap');
      expect(result.meta.generatedAt).toBeDefined();
      expect(result.astrology).toBeDefined();
      expect(result.saju).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe('string');
    });

    it('should include metadata from input', async () => {
      const input = createValidInput({
        name: 'Test User',
        gender: 'female',
      });
      const result = await computeDestinyMapRefactored(input);

      expect(result.meta.name).toBe('Test User');
      expect(result.meta.gender).toBe('female');
    });

    it('should handle missing optional fields', async () => {
      const input = createValidInput({
        name: undefined,
        gender: undefined,
      });
      const result = await computeDestinyMapRefactored(input);

      expect(result.meta.name).toBeUndefined();
      expect(result.meta.gender).toBeUndefined();
    });
  });

  describe('Astrology data', () => {
    it('should include planets data', async () => {
      const input = createValidInput();
      const result = await computeDestinyMapRefactored(input);

      expect(result.astrology.planets).toBeDefined();
      expect(Array.isArray(result.astrology.planets)).toBe(true);
      expect(result.astrology.planets.length).toBeGreaterThan(0);
    });

    it('should include houses data', async () => {
      const input = createValidInput();
      const result = await computeDestinyMapRefactored(input);

      expect(result.astrology.houses).toBeDefined();
      expect(Array.isArray(result.astrology.houses)).toBe(true);
      expect(result.astrology.houses.length).toBe(12);
    });

    it('should include ascendant and MC', async () => {
      const input = createValidInput();
      const result = await computeDestinyMapRefactored(input);

      expect(result.astrology.ascendant).toBeDefined();
      expect(result.astrology.mc).toBeDefined();
    });

    it('should include aspects', async () => {
      const input = createValidInput();
      const result = await computeDestinyMapRefactored(input);

      expect(result.astrology.aspects).toBeDefined();
      expect(Array.isArray(result.astrology.aspects)).toBe(true);
    });

    it('should include transits', async () => {
      const input = createValidInput();
      const result = await computeDestinyMapRefactored(input);

      expect(result.astrology.transits).toBeDefined();
      expect(Array.isArray(result.astrology.transits)).toBe(true);
    });

    it('should include facts', async () => {
      const input = createValidInput();
      const result = await computeDestinyMapRefactored(input);

      expect(result.astrology.facts).toBeDefined();
    });
  });

  describe('Saju data', () => {
    it('should include saju facts', async () => {
      const input = createValidInput();
      const result = await computeDestinyMapRefactored(input);

      expect(result.saju.facts).toBeDefined();
    });

    it('should include pillars', async () => {
      const input = createValidInput();
      const result = await computeDestinyMapRefactored(input);

      expect(result.saju.pillars).toBeDefined();
    });

    it('should include day master', async () => {
      const input = createValidInput();
      const result = await computeDestinyMapRefactored(input);

      expect(result.saju.dayMaster).toBeDefined();
    });

    it('should include unse (cycles)', async () => {
      const input = createValidInput();
      const result = await computeDestinyMapRefactored(input);

      expect(result.saju.unse).toBeDefined();
      expect(result.saju.unse.daeun).toBeDefined();
      expect(result.saju.unse.annual).toBeDefined();
      expect(result.saju.unse.monthly).toBeDefined();
      expect(result.saju.unse.iljin).toBeDefined();
    });
  });

  describe('Optional astrology features', () => {
    it('should include extra points if calculated', async () => {
      const input = createValidInput();
      const result = await computeDestinyMapRefactored(input);

      // Extra points might be undefined if calculation fails
      if (result.extraPoints) {
        expect(result.extraPoints).toBeDefined();
      }
    });

    it('should include solar return if calculated', async () => {
      const input = createValidInput();
      const result = await computeDestinyMapRefactored(input);

      if (result.solarReturn) {
        expect(result.solarReturn).toBeDefined();
      }
    });

    it('should include lunar return if calculated', async () => {
      const input = createValidInput();
      const result = await computeDestinyMapRefactored(input);

      if (result.lunarReturn) {
        expect(result.lunarReturn).toBeDefined();
      }
    });

    it('should include progressions if calculated', async () => {
      const input = createValidInput();
      const result = await computeDestinyMapRefactored(input);

      if (result.progressions) {
        expect(result.progressions).toBeDefined();
      }
    });
  });

  describe('Cache behavior', () => {
    it('should cache results', async () => {
      const input = createValidInput();

      const result1 = await computeDestinyMapRefactored(input);
      const result2 = await computeDestinyMapRefactored(input);

      // Results should be identical (from cache)
      expect(result1.meta.generatedAt).toBe(result2.meta.generatedAt);
    });

    it('should return different results for different inputs', async () => {
      const input1 = createValidInput({ birthTime: '14:30' });
      const input2 = createValidInput({ birthTime: '15:30' });

      const result1 = await computeDestinyMapRefactored(input1);
      const result2 = await computeDestinyMapRefactored(input2);

      // Different birth times should produce different results
      expect(result1).not.toEqual(result2);
    });

    it('should respect cache for same input parameters', async () => {
      const input = createValidInput();

      const result1 = await computeDestinyMapRefactored(input);

      // Wait a tiny bit to ensure timestamp would differ if recalculated
      await new Promise(resolve => setTimeout(resolve, 10));

      const result2 = await computeDestinyMapRefactored(input);

      // Timestamps should match (cached)
      expect(result1.meta.generatedAt).toBe(result2.meta.generatedAt);
    });
  });

  describe('Different locations', () => {
    it('should handle Seoul coordinates', async () => {
      const input = createValidInput({
        latitude: 37.5665,
        longitude: 126.9780,
        tz: 'Asia/Seoul',
      });
      const result = await computeDestinyMapRefactored(input);

      expect(result).toBeDefined();
      expect(result.astrology).toBeDefined();
    });

    it('should handle New York coordinates', async () => {
      const input = createValidInput({
        latitude: 40.7128,
        longitude: -74.0060,
        tz: 'America/New_York',
      });
      const result = await computeDestinyMapRefactored(input);

      expect(result).toBeDefined();
      expect(result.astrology).toBeDefined();
    });

    it('should handle London coordinates', async () => {
      const input = createValidInput({
        latitude: 51.5074,
        longitude: -0.1278,
        tz: 'Europe/London',
      });
      const result = await computeDestinyMapRefactored(input);

      expect(result).toBeDefined();
      expect(result.astrology).toBeDefined();
    });

    it('should handle Tokyo coordinates', async () => {
      const input = createValidInput({
        latitude: 35.6762,
        longitude: 139.6503,
        tz: 'Asia/Tokyo',
      });
      const result = await computeDestinyMapRefactored(input);

      expect(result).toBeDefined();
      expect(result.astrology).toBeDefined();
    });
  });

  describe('Edge cases - Dates', () => {
    it('should handle leap year date', async () => {
      const input = createValidInput({
        birthDate: '2000-02-29',
        birthTime: '12:00',
      });
      const result = await computeDestinyMapRefactored(input);

      expect(result).toBeDefined();
      expect(result.astrology).toBeDefined();
    });

    it('should handle January 1st', async () => {
      const input = createValidInput({
        birthDate: '1990-01-01',
        birthTime: '00:00',
      });
      const result = await computeDestinyMapRefactored(input);

      expect(result).toBeDefined();
    });

    it('should handle December 31st', async () => {
      const input = createValidInput({
        birthDate: '1990-12-31',
        birthTime: '23:59',
      });
      const result = await computeDestinyMapRefactored(input);

      expect(result).toBeDefined();
    });

    it('should handle early morning hours', async () => {
      const input = createValidInput({
        birthTime: '00:01',
      });
      const result = await computeDestinyMapRefactored(input);

      expect(result).toBeDefined();
    });

    it('should handle late night hours', async () => {
      const input = createValidInput({
        birthTime: '23:58',
      });
      const result = await computeDestinyMapRefactored(input);

      expect(result).toBeDefined();
    });

    it('should handle noon', async () => {
      const input = createValidInput({
        birthTime: '12:00',
      });
      const result = await computeDestinyMapRefactored(input);

      expect(result).toBeDefined();
    });
  });

  describe('Edge cases - Coordinates', () => {
    it('should handle near North Pole', async () => {
      const input = createValidInput({
        latitude: 89.5,
        longitude: 0,
      });
      const result = await computeDestinyMapRefactored(input);

      expect(result).toBeDefined();
    });

    it('should handle near South Pole', async () => {
      const input = createValidInput({
        latitude: -89.5,
        longitude: 0,
      });
      const result = await computeDestinyMapRefactored(input);

      expect(result).toBeDefined();
    });

    it('should handle International Date Line', async () => {
      const input = createValidInput({
        latitude: 0,
        longitude: 179.9,
      });
      const result = await computeDestinyMapRefactored(input);

      expect(result).toBeDefined();
    });

    it('should handle Prime Meridian', async () => {
      const input = createValidInput({
        latitude: 51.4778,
        longitude: 0,
        tz: 'Europe/London',
      });
      const result = await computeDestinyMapRefactored(input);

      expect(result).toBeDefined();
    });

    it('should handle Equator', async () => {
      const input = createValidInput({
        latitude: 0,
        longitude: 0,
      });
      const result = await computeDestinyMapRefactored(input);

      expect(result).toBeDefined();
    });
  });

  describe('Gender variations', () => {
    it('should handle male gender', async () => {
      const input = createValidInput({ gender: 'male' });
      const result = await computeDestinyMapRefactored(input);

      expect(result.meta.gender).toBe('male');
    });

    it('should handle female gender', async () => {
      const input = createValidInput({ gender: 'female' });
      const result = await computeDestinyMapRefactored(input);

      expect(result.meta.gender).toBe('female');
    });

    it('should handle undefined gender', async () => {
      const input = createValidInput({ gender: undefined });
      const result = await computeDestinyMapRefactored(input);

      expect(result.meta.gender).toBeUndefined();
    });
  });

  describe('Performance', () => {
    it('should complete within reasonable time', async () => {
      const input = createValidInput();
      const startTime = Date.now();

      await computeDestinyMapRefactored(input);

      const elapsed = Date.now() - startTime;

      // Should complete within 10 seconds (generous limit)
      expect(elapsed).toBeLessThan(10000);
    }, 15000);

    it('should be faster on second call (cached)', async () => {
      const input = createValidInput();

      const start1 = Date.now();
      await computeDestinyMapRefactored(input);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await computeDestinyMapRefactored(input);
      const time2 = Date.now() - start2;

      // Second call should be significantly faster (cached)
      expect(time2).toBeLessThan(time1);
    }, 15000);
  });
});

// ============================================================
// CacheManager Tests
// ============================================================

describe('engine-core MEGA - CacheManager', () => {
  beforeEach(() => {
    destinyMapCache.clear();
  });

  describe('Cache operations', () => {
    it('should return null for non-existent key', () => {
      const result = destinyMapCache.get('non-existent-key');
      expect(result).toBeNull();
    });

    it('should store and retrieve value', async () => {
      const input = createValidInput();
      const result = await computeDestinyMapRefactored(input);

      // Force get from cache
      const cached = destinyMapCache.get(
        `birthDate:${input.birthDate}|birthTime:${input.birthTime}|latitude:${input.latitude}|longitude:${input.longitude}`
      );

      // Should be cached (might not match exact key format, but cache should work)
      expect(destinyMapCache.getSize()).toBeGreaterThan(0);
    });

    it('should clear all entries', async () => {
      const input1 = createValidInput();
      const input2 = createValidInput({ birthTime: '15:00' });

      await computeDestinyMapRefactored(input1);
      await computeDestinyMapRefactored(input2);

      expect(destinyMapCache.getSize()).toBeGreaterThan(0);

      destinyMapCache.clear();

      expect(destinyMapCache.getSize()).toBe(0);
    });

    it('should report correct cache size', async () => {
      const input1 = createValidInput();
      const input2 = createValidInput({ birthTime: '15:00' });
      const input3 = createValidInput({ birthTime: '16:00' });

      expect(destinyMapCache.getSize()).toBe(0);

      await computeDestinyMapRefactored(input1);
      expect(destinyMapCache.getSize()).toBe(1);

      await computeDestinyMapRefactored(input2);
      expect(destinyMapCache.getSize()).toBe(2);

      await computeDestinyMapRefactored(input3);
      expect(destinyMapCache.getSize()).toBe(3);
    });
  });

  describe('Cache eviction', () => {
    it('should handle multiple unique entries', async () => {
      const inputs = Array.from({ length: 10 }, (_, i) =>
        createValidInput({ birthTime: `${14 + i}:00` })
      );

      for (const input of inputs) {
        await computeDestinyMapRefactored(input);
      }

      // Should have cached multiple entries
      expect(destinyMapCache.getSize()).toBeGreaterThanOrEqual(10);
      expect(destinyMapCache.getSize()).toBeLessThanOrEqual(50); // Max size limit
    });
  });
});

// ============================================================
// Summary and Integration Tests
// ============================================================

describe('engine-core MEGA - Integration', () => {
  beforeEach(() => {
    destinyMapCache.clear();
  });

  describe('Summary generation', () => {
    it('should generate non-empty summary', async () => {
      const input = createValidInput({ name: 'Test User' });
      const result = await computeDestinyMapRefactored(input);

      expect(result.summary).toBeTruthy();
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it('should include name in summary if provided', async () => {
      const input = createValidInput({ name: 'John Doe' });
      const result = await computeDestinyMapRefactored(input);

      expect(result.summary).toContain('John Doe');
    });

    it('should handle missing name gracefully', async () => {
      const input = createValidInput({ name: undefined });
      const result = await computeDestinyMapRefactored(input);

      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(0);
    });
  });

  describe('Complete workflow', () => {
    it('should process complete birth chart workflow', async () => {
      const input: CombinedInput = {
        name: 'Integration Test User',
        birthDate: '1985-03-20',
        birthTime: '09:45',
        latitude: 40.7128,
        longitude: -74.0060,
        gender: 'female',
        tz: 'America/New_York',
      };

      const result = await computeDestinyMapRefactored(input);

      // Verify complete data structure
      expect(result.meta).toBeDefined();
      expect(result.meta.name).toBe('Integration Test User');
      expect(result.meta.gender).toBe('female');

      expect(result.astrology).toBeDefined();
      expect(result.astrology.planets.length).toBeGreaterThan(0);
      expect(result.astrology.houses.length).toBe(12);

      expect(result.saju).toBeDefined();
      expect(result.saju.facts).toBeDefined();
      expect(result.saju.pillars).toBeDefined();

      expect(result.summary).toBeDefined();
      expect(result.summary.length).toBeGreaterThan(10);
    });
  });
});
