import { describe, it, expect } from 'vitest';

describe('Destiny Matrix Data Layers', () => {
  describe('Layer 1: Element Core Grid', () => {
    it('should export ELEMENT_CORE_GRID', async () => {
      const { ELEMENT_CORE_GRID } = await import('@/lib/destiny-matrix/data/layer1-element-core');

      expect(ELEMENT_CORE_GRID).toBeDefined();
      expect(typeof ELEMENT_CORE_GRID).toBe('object');
    });

    it('should have all five elements', async () => {
      const { ELEMENT_CORE_GRID } = await import('@/lib/destiny-matrix/data/layer1-element-core');

      expect(ELEMENT_CORE_GRID['목']).toBeDefined();
      expect(ELEMENT_CORE_GRID['화']).toBeDefined();
      expect(ELEMENT_CORE_GRID['토']).toBeDefined();
      expect(ELEMENT_CORE_GRID['금']).toBeDefined();
      expect(ELEMENT_CORE_GRID['수']).toBeDefined();
    });

    it('should have four western elements for each', async () => {
      const { ELEMENT_CORE_GRID } = await import('@/lib/destiny-matrix/data/layer1-element-core');

      for (const element of ['목', '화', '토', '금', '수']) {
        const grid = ELEMENT_CORE_GRID[element as keyof typeof ELEMENT_CORE_GRID];
        expect(grid.fire).toBeDefined();
        expect(grid.earth).toBeDefined();
        expect(grid.air).toBeDefined();
        expect(grid.water).toBeDefined();
      }
    });

    it('should have valid interaction codes', async () => {
      const { ELEMENT_CORE_GRID } = await import('@/lib/destiny-matrix/data/layer1-element-core');

      const interaction = ELEMENT_CORE_GRID['목'].fire;
      expect(interaction.level).toBeDefined();
      expect(interaction.score).toBeGreaterThanOrEqual(0);
      expect(interaction.score).toBeLessThanOrEqual(10);
      expect(interaction.icon).toBeDefined();
      expect(interaction.keyword).toBeDefined();
      expect(interaction.keywordEn).toBeDefined();
    });

    it('should export SIGN_TO_ELEMENT mapping', async () => {
      const { SIGN_TO_ELEMENT } = await import('@/lib/destiny-matrix/data/layer1-element-core');

      expect(SIGN_TO_ELEMENT).toBeDefined();
      expect(SIGN_TO_ELEMENT.Aries).toBe('fire');
      expect(SIGN_TO_ELEMENT.Taurus).toBe('earth');
      expect(SIGN_TO_ELEMENT.Gemini).toBe('air');
      expect(SIGN_TO_ELEMENT.Cancer).toBe('water');
    });

    it('should export FIVE_ELEMENT_RELATIONS', async () => {
      const { FIVE_ELEMENT_RELATIONS } = await import('@/lib/destiny-matrix/data/layer1-element-core');

      expect(FIVE_ELEMENT_RELATIONS).toBeDefined();
      expect(FIVE_ELEMENT_RELATIONS.generates).toBeDefined();
      expect(FIVE_ELEMENT_RELATIONS.controls).toBeDefined();
    });
  });

  describe('Layer 2: Sibsin Planet Matrix', () => {
    it('should export SIBSIN_PLANET_MATRIX', async () => {
      const { SIBSIN_PLANET_MATRIX } = await import('@/lib/destiny-matrix/data/layer2-sibsin-planet');

      expect(SIBSIN_PLANET_MATRIX).toBeDefined();
      expect(typeof SIBSIN_PLANET_MATRIX).toBe('object');
    });

    it('should have all ten sibsin types', async () => {
      const { SIBSIN_PLANET_MATRIX } = await import('@/lib/destiny-matrix/data/layer2-sibsin-planet');

      const sibsinTypes = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
      for (const sibsin of sibsinTypes) {
        expect(SIBSIN_PLANET_MATRIX[sibsin as keyof typeof SIBSIN_PLANET_MATRIX]).toBeDefined();
      }
    });

    it('should have planet mappings for each sibsin', async () => {
      const { SIBSIN_PLANET_MATRIX } = await import('@/lib/destiny-matrix/data/layer2-sibsin-planet');

      const sibsin = SIBSIN_PLANET_MATRIX['비견'];
      expect(sibsin.Sun).toBeDefined();
      expect(sibsin.Moon).toBeDefined();
    });

    it('should export PLANET_KEYWORDS', async () => {
      const { PLANET_KEYWORDS } = await import('@/lib/destiny-matrix/data/layer2-sibsin-planet');

      expect(PLANET_KEYWORDS).toBeDefined();
      expect(PLANET_KEYWORDS.Sun).toBeDefined();
      expect(PLANET_KEYWORDS.Moon).toBeDefined();
    });

    it('should export SIBSIN_KEYWORDS', async () => {
      const { SIBSIN_KEYWORDS } = await import('@/lib/destiny-matrix/data/layer2-sibsin-planet');

      expect(SIBSIN_KEYWORDS).toBeDefined();
      expect(SIBSIN_KEYWORDS['비견']).toBeDefined();
    });
  });

  describe('Layer 3: Sibsin House Matrix', () => {
    it('should export SIBSIN_HOUSE_MATRIX', async () => {
      const { SIBSIN_HOUSE_MATRIX } = await import('@/lib/destiny-matrix/data/layer3-sibsin-house');

      expect(SIBSIN_HOUSE_MATRIX).toBeDefined();
      expect(typeof SIBSIN_HOUSE_MATRIX).toBe('object');
    });

    it('should have house mappings for each sibsin', async () => {
      const { SIBSIN_HOUSE_MATRIX } = await import('@/lib/destiny-matrix/data/layer3-sibsin-house');

      const sibsin = SIBSIN_HOUSE_MATRIX['비견'];
      expect(sibsin).toBeDefined();
      // Should have 12 houses
      expect(sibsin[1]).toBeDefined();
      expect(sibsin[12]).toBeDefined();
    });

    it('should export HOUSE_KEYWORDS', async () => {
      const { HOUSE_KEYWORDS } = await import('@/lib/destiny-matrix/data/layer3-sibsin-house');

      expect(HOUSE_KEYWORDS).toBeDefined();
      expect(HOUSE_KEYWORDS[1]).toBeDefined();
      expect(HOUSE_KEYWORDS[12]).toBeDefined();
    });
  });

  describe('Layer 5: Relation Aspect Matrix', () => {
    it('should export RELATION_ASPECT_MATRIX', async () => {
      const { RELATION_ASPECT_MATRIX } = await import('@/lib/destiny-matrix/data/layer5-relation-aspect');

      expect(RELATION_ASPECT_MATRIX).toBeDefined();
      expect(typeof RELATION_ASPECT_MATRIX).toBe('object');
    });

    it('should have relation mappings', async () => {
      const { RELATION_ASPECT_MATRIX } = await import('@/lib/destiny-matrix/data/layer5-relation-aspect');

      const keys = Object.keys(RELATION_ASPECT_MATRIX);
      expect(keys.length).toBeGreaterThan(0);
    });

    it('should export BRANCH_RELATION_INFO', async () => {
      const { BRANCH_RELATION_INFO } = await import('@/lib/destiny-matrix/data/layer5-relation-aspect');

      expect(BRANCH_RELATION_INFO).toBeDefined();
    });

    it('should export ASPECT_INFO', async () => {
      const { ASPECT_INFO } = await import('@/lib/destiny-matrix/data/layer5-relation-aspect');

      expect(ASPECT_INFO).toBeDefined();
      expect(ASPECT_INFO.conjunction).toBeDefined();
      expect(ASPECT_INFO.opposition).toBeDefined();
    });
  });

  describe('Layer 7: Advanced Analysis', () => {
    it('should export advanced analysis matrix', async () => {
      const { ADVANCED_ANALYSIS_MATRIX } = await import('@/lib/destiny-matrix/data/layer7-advanced-analysis');

      expect(ADVANCED_ANALYSIS_MATRIX).toBeDefined();
    });

    it('should export GEOKGUK_INFO', async () => {
      const { GEOKGUK_INFO } = await import('@/lib/destiny-matrix/data/layer7-advanced-analysis');

      expect(GEOKGUK_INFO).toBeDefined();
    });

    it('should export PROGRESSION_INFO', async () => {
      const { PROGRESSION_INFO } = await import('@/lib/destiny-matrix/data/layer7-advanced-analysis');

      expect(PROGRESSION_INFO).toBeDefined();
    });

    it('should export HARMONICS_SAJU_MAPPING', async () => {
      const { HARMONICS_SAJU_MAPPING } = await import('@/lib/destiny-matrix/data/layer7-advanced-analysis');

      expect(HARMONICS_SAJU_MAPPING).toBeDefined();
    });
  });

  describe('Layer 4: Timing Overlay', () => {
    it('should export TIMING_OVERLAY_MATRIX', async () => {
      const { TIMING_OVERLAY_MATRIX } = await import('@/lib/destiny-matrix/data/layer4-timing-overlay');

      expect(TIMING_OVERLAY_MATRIX).toBeDefined();
    });

    it('should export TRANSIT_CYCLE_INFO', async () => {
      const { TRANSIT_CYCLE_INFO } = await import('@/lib/destiny-matrix/data/layer4-timing-overlay');

      expect(TRANSIT_CYCLE_INFO).toBeDefined();
    });

    it('should export RETROGRADE_SCHEDULE', async () => {
      const { RETROGRADE_SCHEDULE } = await import('@/lib/destiny-matrix/data/layer4-timing-overlay');

      expect(RETROGRADE_SCHEDULE).toBeDefined();
    });
  });

  describe('Layer 6: Stage House', () => {
    it('should export TWELVE_STAGE_HOUSE_MATRIX', async () => {
      const { TWELVE_STAGE_HOUSE_MATRIX } = await import('@/lib/destiny-matrix/data/layer6-stage-house');

      expect(TWELVE_STAGE_HOUSE_MATRIX).toBeDefined();
    });

    it('should export TWELVE_STAGE_INFO', async () => {
      const { TWELVE_STAGE_INFO } = await import('@/lib/destiny-matrix/data/layer6-stage-house');

      expect(TWELVE_STAGE_INFO).toBeDefined();
    });
  });

  describe('Layer 8: Shinsal Planet', () => {
    it('should export SHINSAL_PLANET_MATRIX', async () => {
      const { SHINSAL_PLANET_MATRIX } = await import('@/lib/destiny-matrix/data/layer8-shinsal-planet');

      expect(SHINSAL_PLANET_MATRIX).toBeDefined();
    });

    it('should export SHINSAL_INFO', async () => {
      const { SHINSAL_INFO } = await import('@/lib/destiny-matrix/data/layer8-shinsal-planet');

      expect(SHINSAL_INFO).toBeDefined();
    });
  });

  describe('Layer 9: Asteroid House', () => {
    it('should export ASTEROID_HOUSE_MATRIX', async () => {
      const { ASTEROID_HOUSE_MATRIX } = await import('@/lib/destiny-matrix/data/layer9-asteroid-house');

      expect(ASTEROID_HOUSE_MATRIX).toBeDefined();
    });

    it('should export ASTEROID_INFO', async () => {
      const { ASTEROID_INFO } = await import('@/lib/destiny-matrix/data/layer9-asteroid-house');

      expect(ASTEROID_INFO).toBeDefined();
    });
  });

  describe('Layer 10: Extrapoint Element', () => {
    it('should export EXTRAPOINT_ELEMENT_MATRIX', async () => {
      const { EXTRAPOINT_ELEMENT_MATRIX } = await import('@/lib/destiny-matrix/data/layer10-extrapoint-element');

      expect(EXTRAPOINT_ELEMENT_MATRIX).toBeDefined();
    });

    it('should export EXTRAPOINT_INFO', async () => {
      const { EXTRAPOINT_INFO } = await import('@/lib/destiny-matrix/data/layer10-extrapoint-element');

      expect(EXTRAPOINT_INFO).toBeDefined();
    });
  });
});

describe('Destiny Matrix Engine', () => {
  it('should export engine functions', async () => {
    const { calculateDestinyMatrix } = await import('@/lib/destiny-matrix/engine');

    expect(typeof calculateDestinyMatrix).toBe('function');
  });

  it('should export additional engine functions', async () => {
    const module = await import('@/lib/destiny-matrix/engine');

    expect(module).toBeDefined();
    const exports = Object.keys(module);
    expect(exports.length).toBeGreaterThan(0);
  });
});

describe('Destiny Matrix Cache', () => {
  it('should export cache functions', async () => {
    const module = await import('@/lib/destiny-matrix/cache');

    expect(module).toBeDefined();
    expect(typeof module.initMatrixCache).toBe('function');
    expect(typeof module.getCachedMatrix).toBe('function');
    expect(typeof module.setCachedMatrix).toBe('function');
  });

  it('should initialize cache', async () => {
    const { initMatrixCache, getMatrixCacheStats } = await import('@/lib/destiny-matrix/cache');

    initMatrixCache();
    const stats = getMatrixCacheStats();

    expect(stats).toBeDefined();
    expect(typeof stats.size).toBe('number');
  });

  it('should export hash function', async () => {
    const { hashMatrixInput } = await import('@/lib/destiny-matrix/cache');

    expect(typeof hashMatrixInput).toBe('function');
  });

  it('should export cache clear function', async () => {
    const { clearMatrixCache } = await import('@/lib/destiny-matrix/cache');

    expect(typeof clearMatrixCache).toBe('function');
  });

  it('should export caching status check', async () => {
    const { isCachingEnabled } = await import('@/lib/destiny-matrix/cache');

    expect(typeof isCachingEnabled).toBe('function');
  });
});

describe('Destiny Matrix House System', () => {
  it('should export house system configuration', async () => {
    const { HOUSE_SYSTEM_CONFIG, getHouseSystem } = await import('@/lib/destiny-matrix/house-system');

    expect(HOUSE_SYSTEM_CONFIG).toBeDefined();
    expect(typeof getHouseSystem).toBe('function');
  });

  it('should return correct house system for latitude', async () => {
    const { getHouseSystem } = await import('@/lib/destiny-matrix/house-system');

    // Normal latitude should use Placidus
    const normalResult = getHouseSystem(37.5);
    expect(normalResult).toBe('placidus');

    // High latitude should use Whole Sign
    const highLatResult = getHouseSystem(70);
    expect(highLatResult).toBe('whole-sign');
  });

  it('should export HOUSE_SYSTEM_INFO', async () => {
    const { HOUSE_SYSTEM_INFO } = await import('@/lib/destiny-matrix/house-system');

    expect(HOUSE_SYSTEM_INFO).toBeDefined();
    expect(HOUSE_SYSTEM_INFO.placidus).toBeDefined();
    expect(HOUSE_SYSTEM_INFO['whole-sign']).toBeDefined();
  });

  it('should export validateLatitude function', async () => {
    const { validateLatitude } = await import('@/lib/destiny-matrix/house-system');

    expect(typeof validateLatitude).toBe('function');
    expect(validateLatitude(45)).toBe(true);
    expect(validateLatitude(100)).toBe(false);
    expect(validateLatitude(-100)).toBe(false);
  });

  it('should export getHouseSystemWarning function', async () => {
    const { getHouseSystemWarning } = await import('@/lib/destiny-matrix/house-system');

    expect(typeof getHouseSystemWarning).toBe('function');

    // Normal latitude - no warning
    expect(getHouseSystemWarning(37.5)).toBeNull();

    // High latitude - should return warning
    const warning = getHouseSystemWarning(70);
    expect(warning).not.toBeNull();
  });
});
