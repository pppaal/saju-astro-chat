/**
 * Tests for Chart Data Cache (Server-side)
 *
 * NOTE: These tests require Redis to be running.
 * They are skipped if Redis is not available.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveChartData,
  loadChartData,
  hasCachedData,
  clearChartCache,
} from '@/lib/cache/chart-cache-server';

// Check if Redis is available - only run if explicitly enabled for integration tests
// Default to skipped since these require actual Redis connection
const REDIS_AVAILABLE = process.env.VITEST_REDIS_TESTS === '1' &&
  !!(process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL);

// Skip tests if Redis is not available
const describeWithRedis = REDIS_AVAILABLE ? describe : describe.skip;

describeWithRedis('Chart Data Cache (Server)', () => {
  const testBirthDate = '1990-01-15';
  const testBirthTime = '14:30';
  const testLatitude = 37.5665;
  const testLongitude = 126.978;

  const testChartData = {
    saju: {
      year: { heavenly: '庚', earthly: '午' },
      month: { heavenly: '丁', earthly: '丑' },
      day: { heavenly: '癸', earthly: '巳' },
      hour: { heavenly: '己', earthly: '未' },
    },
    astro: {
      sun: { sign: 'Capricorn', degree: 24.5 },
      moon: { sign: 'Pisces', degree: 12.3 },
      ascendant: { sign: 'Gemini', degree: 5.8 },
    },
  };

  beforeEach(async () => {
    // Clear cache before each test
    await clearChartCache(testBirthDate, testBirthTime);
  });

  it('should save and load chart data', async () => {
    const saveResult = await saveChartData(
      testBirthDate,
      testBirthTime,
      testLatitude,
      testLongitude,
      testChartData
    );

    expect(saveResult).toBe(true);

    const loaded = await loadChartData(
      testBirthDate,
      testBirthTime,
      testLatitude,
      testLongitude
    );

    expect(loaded).not.toBeNull();
    expect(loaded?.saju).toEqual(testChartData.saju);
    expect(loaded?.astro).toEqual(testChartData.astro);
  });

  it('should return null for non-existent cache', async () => {
    const loaded = await loadChartData(
      '1995-06-20',
      '10:00',
      testLatitude,
      testLongitude
    );

    expect(loaded).toBeNull();
  });

  it('should detect cached data existence', async () => {
    const beforeCache = await hasCachedData(
      testBirthDate,
      testBirthTime,
      testLatitude,
      testLongitude
    );
    expect(beforeCache).toBe(false);

    await saveChartData(
      testBirthDate,
      testBirthTime,
      testLatitude,
      testLongitude,
      testChartData
    );

    const afterCache = await hasCachedData(
      testBirthDate,
      testBirthTime,
      testLatitude,
      testLongitude
    );
    expect(afterCache).toBe(true);
  });

  it('should validate birth key matches', async () => {
    await saveChartData(
      testBirthDate,
      testBirthTime,
      testLatitude,
      testLongitude,
      testChartData
    );

    // Try to load with different location - should fail
    const loaded = await loadChartData(
      testBirthDate,
      testBirthTime,
      40.7128, // Different latitude (NYC)
      -74.006, // Different longitude (NYC)
    );

    expect(loaded).toBeNull();
  });

  it('should clear specific cache entry', async () => {
    await saveChartData(
      testBirthDate,
      testBirthTime,
      testLatitude,
      testLongitude,
      testChartData
    );

    const beforeClear = await loadChartData(
      testBirthDate,
      testBirthTime,
      testLatitude,
      testLongitude
    );
    expect(beforeClear).not.toBeNull();

    const clearResult = await clearChartCache(testBirthDate, testBirthTime);
    expect(clearResult).toBe(true);

    const afterClear = await loadChartData(
      testBirthDate,
      testBirthTime,
      testLatitude,
      testLongitude
    );
    expect(afterClear).toBeNull();
  });

  it('should handle partial data (saju only)', async () => {
    const sajuOnlyData = {
      saju: testChartData.saju,
    };

    await saveChartData(
      testBirthDate,
      testBirthTime,
      testLatitude,
      testLongitude,
      sajuOnlyData
    );

    const loaded = await loadChartData(
      testBirthDate,
      testBirthTime,
      testLatitude,
      testLongitude
    );

    expect(loaded).not.toBeNull();
    expect(loaded?.saju).toEqual(testChartData.saju);
    expect(loaded?.astro).toBeUndefined();
  });

  it('should handle partial data (astro only)', async () => {
    const astroOnlyData = {
      astro: testChartData.astro,
    };

    await saveChartData(
      testBirthDate,
      testBirthTime,
      testLatitude,
      testLongitude,
      astroOnlyData
    );

    const loaded = await loadChartData(
      testBirthDate,
      testBirthTime,
      testLatitude,
      testLongitude
    );

    expect(loaded).not.toBeNull();
    expect(loaded?.astro).toEqual(testChartData.astro);
    expect(loaded?.saju).toBeUndefined();
  });

  it('should handle advanced astro data', async () => {
    const fullData = {
      ...testChartData,
      advancedAstro: {
        houses: [
          { sign: 'Gemini', degree: 5.8 },
          { sign: 'Cancer', degree: 10.2 },
        ],
        aspects: [
          { planet1: 'Sun', planet2: 'Moon', type: 'trine', orb: 2.3 },
        ],
      },
    };

    await saveChartData(
      testBirthDate,
      testBirthTime,
      testLatitude,
      testLongitude,
      fullData
    );

    const loaded = await loadChartData(
      testBirthDate,
      testBirthTime,
      testLatitude,
      testLongitude
    );

    expect(loaded).not.toBeNull();
    expect(loaded?.advancedAstro).toEqual(fullData.advancedAstro);
  });

  it('should handle multiple different birth dates', async () => {
    const birthDate1 = '1990-01-15';
    const birthDate2 = '1992-06-20';

    const data1 = { saju: { test: 1 } };
    const data2 = { saju: { test: 2 } };

    await saveChartData(birthDate1, testBirthTime, testLatitude, testLongitude, data1);
    await saveChartData(birthDate2, testBirthTime, testLatitude, testLongitude, data2);

    const loaded1 = await loadChartData(
      birthDate1,
      testBirthTime,
      testLatitude,
      testLongitude
    );
    const loaded2 = await loadChartData(
      birthDate2,
      testBirthTime,
      testLatitude,
      testLongitude
    );

    expect(loaded1?.saju).toEqual(data1.saju);
    expect(loaded2?.saju).toEqual(data2.saju);

    // Cleanup
    await clearChartCache(birthDate1, testBirthTime);
    await clearChartCache(birthDate2, testBirthTime);
  });

  it('should gracefully handle cache failures', async () => {
    // Even if cache fails, should return false/null without throwing
    await expect(
      saveChartData(
        testBirthDate,
        testBirthTime,
        testLatitude,
        testLongitude,
        testChartData
      )
    ).resolves.toBeDefined();

    await expect(
      loadChartData(testBirthDate, testBirthTime, testLatitude, testLongitude)
    ).resolves.toBeDefined();
  });
});
