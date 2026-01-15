/**
 * Destiny Matrix Cache Tests
 *
 * Tests for LRU caching system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initMatrixCache,
  getMatrixCache,
  hashMatrixInput,
  getCachedMatrix,
  setCachedMatrix,
  clearMatrixCache,
  getMatrixCacheStats,
  isCachingEnabled,
  disableCache,
} from '@/lib/destiny-matrix/cache';
import type { MatrixCalculationInput, DestinyFusionMatrixComputed } from '@/lib/destiny-matrix/types';

describe('Matrix Cache Initialization', () => {
  afterEach(() => {
    disableCache();
  });

  it('initializes cache with default config', () => {
    const cache = initMatrixCache();
    expect(cache).toBeDefined();
    expect(cache.max).toBe(100);
  });

  it('initializes cache with custom config', () => {
    const cache = initMatrixCache({ max: 50, ttl: 1000 * 60 * 15 });
    expect(cache.max).toBe(50);
  });

  it('returns same instance on multiple calls', () => {
    const cache1 = getMatrixCache();
    const cache2 = getMatrixCache();
    expect(cache1).toBe(cache2);
  });

  it('reports caching enabled after init', () => {
    initMatrixCache();
    expect(isCachingEnabled()).toBe(true);
  });
});

describe('Hash Generation', () => {
  const createTestInput = (): MatrixCalculationInput => ({
    dayMasterElement: '목',
    pillarElements: ['목', '화', '토', '금'],
    sibsinDistribution: { 비견: 2, 식신: 1 },
    twelveStages: { 장생: 1, 왕지: 1 },
    relations: [],
    planetHouses: { Sun: 1, Moon: 4 },
    planetSigns: {},
    aspects: [],
  });

  it('generates consistent hash for same input', () => {
    const input = createTestInput();
    const hash1 = hashMatrixInput(input);
    const hash2 = hashMatrixInput(input);
    expect(hash1).toBe(hash2);
  });

  it('generates different hash for different input', () => {
    const input1 = createTestInput();
    const input2 = { ...createTestInput(), dayMasterElement: '화' as const };
    const hash1 = hashMatrixInput(input1);
    const hash2 = hashMatrixInput(input2);
    expect(hash1).not.toBe(hash2);
  });

  it('generates same hash for reordered arrays', () => {
    const input1 = createTestInput();
    input1.pillarElements = ['목', '화', '토', '금'];

    const input2 = createTestInput();
    input2.pillarElements = ['금', '토', '화', '목']; // Different order

    const hash1 = hashMatrixInput(input1);
    const hash2 = hashMatrixInput(input2);
    expect(hash1).toBe(hash2); // Should be same after sorting
  });

  it('ignores lang in hash', () => {
    const input1 = { ...createTestInput(), lang: 'ko' as const };
    const input2 = { ...createTestInput(), lang: 'en' as const };
    const hash1 = hashMatrixInput(input1);
    const hash2 = hashMatrixInput(input2);
    expect(hash1).toBe(hash2); // Lang should not affect hash
  });

  it('includes optional fields in hash when present', () => {
    const input1 = createTestInput();
    const input2 = { ...createTestInput(), geokguk: 'jeonggwan' as const };
    const hash1 = hashMatrixInput(input1);
    const hash2 = hashMatrixInput(input2);
    expect(hash1).not.toBe(hash2);
  });

  it('handles complex input with all layers', () => {
    const complexInput: MatrixCalculationInput = {
      dayMasterElement: '목',
      pillarElements: ['목', '화', '토', '금', '수', '목', '화', '토'],
      sibsinDistribution: { 비견: 2, 식신: 1, 정재: 1, 정관: 2 },
      twelveStages: { 장생: 1, 왕지: 2, 쇠: 1 },
      relations: [
        { kind: '지지삼합', detail: '寅午戌' },
        { kind: '지지육합', detail: '子丑' },
      ],
      dominantWesternElement: 'fire',
      planetHouses: { Sun: 5, Moon: 11, Mercury: 4, Venus: 6, Mars: 8 },
      planetSigns: { Sun: '사자자리', Moon: '물병자리' },
      aspects: [
        { planet1: 'Sun', planet2: 'Moon', type: 'opposition' },
        { planet1: 'Venus', planet2: 'Mars', type: 'trine' },
      ],
      activeTransits: ['saturnReturn', 'mercuryRetrograde'],
      currentDaeunElement: '화',
      geokguk: 'jeonggwan',
      yongsin: '수',
      shinsalList: ['천을귀인', '역마', '도화'],
      asteroidHouses: { Ceres: 6, Pallas: 9 },
      extraPointSigns: { Chiron: '양자리', NorthNode: '쌍둥이자리' },
    };

    const hash = hashMatrixInput(complexInput);
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });
});

describe('Cache Operations', () => {
  const createMockResult = (): DestinyFusionMatrixComputed => ({
    layer1_elementCore: {},
    layer2_sibsinPlanet: {},
    layer3_sibsinHouse: {},
    layer4_timing: {},
    layer5_relationAspect: {},
    layer6_stageHouse: {},
    layer7_advanced: {},
    layer8_shinsalPlanet: {},
    layer9_asteroidHouse: {},
    layer10_extraPointElement: {},
    summary: {
      totalScore: 7.5,
      strengthPoints: [],
      balancePoints: [],
      cautionPoints: [],
      topSynergies: [],
    },
  });

  beforeEach(() => {
    initMatrixCache();
  });

  afterEach(() => {
    disableCache();
  });

  it('stores and retrieves cached result', () => {
    const input: MatrixCalculationInput = {
      dayMasterElement: '목',
      pillarElements: [],
      sibsinDistribution: {},
      twelveStages: {},
      relations: [],
      planetHouses: {},
      planetSigns: {},
      aspects: [],
    };

    const result = createMockResult();
    setCachedMatrix(input, result);

    const cached = getCachedMatrix(input);
    expect(cached).toBeDefined();
    expect(cached?.summary.totalScore).toBe(7.5);
  });

  it('returns undefined for uncached input', () => {
    const input: MatrixCalculationInput = {
      dayMasterElement: '화',
      pillarElements: [],
      sibsinDistribution: {},
      twelveStages: {},
      relations: [],
      planetHouses: {},
      planetSigns: {},
      aspects: [],
    };

    const cached = getCachedMatrix(input);
    expect(cached).toBeUndefined();
  });

  it('updates cache size after storing', () => {
    const stats1 = getMatrixCacheStats();
    const initialSize = stats1.size;

    const input: MatrixCalculationInput = {
      dayMasterElement: '토',
      pillarElements: [],
      sibsinDistribution: {},
      twelveStages: {},
      relations: [],
      planetHouses: {},
      planetSigns: {},
      aspects: [],
    };

    setCachedMatrix(input, createMockResult());

    const stats2 = getMatrixCacheStats();
    expect(stats2.size).toBe(initialSize + 1);
  });

  it('clears all cache entries', () => {
    const input1: MatrixCalculationInput = {
      dayMasterElement: '목',
      pillarElements: [],
      sibsinDistribution: {},
      twelveStages: {},
      relations: [],
      planetHouses: {},
      planetSigns: {},
      aspects: [],
    };

    const input2: MatrixCalculationInput = {
      dayMasterElement: '화',
      pillarElements: [],
      sibsinDistribution: {},
      twelveStages: {},
      relations: [],
      planetHouses: {},
      planetSigns: {},
      aspects: [],
    };

    setCachedMatrix(input1, createMockResult());
    setCachedMatrix(input2, createMockResult());

    expect(getMatrixCacheStats().size).toBeGreaterThan(0);

    clearMatrixCache();
    expect(getMatrixCacheStats().size).toBe(0);
  });

  it('respects max cache size', () => {
    initMatrixCache({ max: 3 });

    for (let i = 0; i < 5; i++) {
      const input: MatrixCalculationInput = {
        dayMasterElement: ['목', '화', '토', '금', '수'][i] as any,
        pillarElements: [],
        sibsinDistribution: {},
        twelveStages: {},
        relations: [],
        planetHouses: {},
        planetSigns: {},
        aspects: [],
      };
      setCachedMatrix(input, createMockResult());
    }

    const stats = getMatrixCacheStats();
    expect(stats.size).toBeLessThanOrEqual(3);
  });
});

describe('Cache Statistics', () => {
  beforeEach(() => {
    initMatrixCache();
  });

  afterEach(() => {
    disableCache();
  });

  it('returns cache stats', () => {
    const stats = getMatrixCacheStats();
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('max');
    expect(typeof stats.size).toBe('number');
    expect(typeof stats.max).toBe('number');
  });

  it('tracks cache size correctly', () => {
    const initialStats = getMatrixCacheStats();
    expect(initialStats.size).toBe(0);

    const input: MatrixCalculationInput = {
      dayMasterElement: '금',
      pillarElements: [],
      sibsinDistribution: {},
      twelveStages: {},
      relations: [],
      planetHouses: {},
      planetSigns: {},
      aspects: [],
    };

    setCachedMatrix(input, {
      layer1_elementCore: {},
      layer2_sibsinPlanet: {},
      layer3_sibsinHouse: {},
      layer4_timing: {},
      layer5_relationAspect: {},
      layer6_stageHouse: {},
      layer7_advanced: {},
      layer8_shinsalPlanet: {},
      layer9_asteroidHouse: {},
      layer10_extraPointElement: {},
      summary: {
        totalScore: 6.0,
        strengthPoints: [],
        balancePoints: [],
        cautionPoints: [],
        topSynergies: [],
      },
    });

    const afterStats = getMatrixCacheStats();
    expect(afterStats.size).toBe(1);
  });
});

describe('Cache Disable/Enable', () => {
  it('disables caching', () => {
    initMatrixCache();
    expect(isCachingEnabled()).toBe(true);

    disableCache();
    expect(isCachingEnabled()).toBe(false);
  });

  it('returns undefined when caching disabled', () => {
    disableCache();

    const input: MatrixCalculationInput = {
      dayMasterElement: '수',
      pillarElements: [],
      sibsinDistribution: {},
      twelveStages: {},
      relations: [],
      planetHouses: {},
      planetSigns: {},
      aspects: [],
    };

    // This should not throw, but caching is disabled
    const result = getCachedMatrix(input);
    expect(result).toBeUndefined();
  });
});

describe('Edge Cases', () => {
  beforeEach(() => {
    initMatrixCache();
  });

  afterEach(() => {
    disableCache();
  });

  it('handles empty sibsinDistribution', () => {
    const input: MatrixCalculationInput = {
      dayMasterElement: '목',
      pillarElements: [],
      sibsinDistribution: {},
      twelveStages: {},
      relations: [],
      planetHouses: {},
      planetSigns: {},
      aspects: [],
    };

    const hash1 = hashMatrixInput(input);
    const hash2 = hashMatrixInput(input);
    expect(hash1).toBe(hash2);
  });

  it('handles empty arrays', () => {
    const input: MatrixCalculationInput = {
      dayMasterElement: '화',
      pillarElements: [],
      sibsinDistribution: {},
      twelveStages: {},
      relations: [],
      planetHouses: {},
      planetSigns: {},
      aspects: [],
    };

    const hash = hashMatrixInput(input);
    expect(hash).toBeDefined();
  });

  it('handles partial optional fields', () => {
    const input: MatrixCalculationInput = {
      dayMasterElement: '토',
      pillarElements: ['목'],
      sibsinDistribution: { 정관: 1 },
      twelveStages: { 장생: 1 },
      relations: [],
      planetHouses: { Sun: 1 },
      planetSigns: {},
      aspects: [],
      asteroidHouses: { Ceres: 4 }, // Only one asteroid
    };

    const hash = hashMatrixInput(input);
    expect(hash).toBeDefined();
  });
});
