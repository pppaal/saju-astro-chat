import { describe, it, expect, beforeEach } from 'vitest';
import {
  DynamicWeightCalculator,
  DEFAULT_LAYER_WEIGHTS,
  getLayerDisplayName,
  weightToPercent,
} from '@/lib/destiny-matrix/interpreter/weight-calculator';
import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types';
import type { LayerWeights, InsightDomain } from '@/lib/destiny-matrix/interpreter/types';

describe('DynamicWeightCalculator', () => {
  let calculator: DynamicWeightCalculator;

  beforeEach(() => {
    calculator = new DynamicWeightCalculator();
  });

  const createMockInput = (
    overrides?: Partial<MatrixCalculationInput>
  ): MatrixCalculationInput => ({
    dayMasterElement: '목',
    geokguk: 'jeonggwan',
    yongsin: '화',
    sibsinDistribution: { '비견': 2 },
    activeTransits: [],
    ...overrides,
  });

  describe('calculateWeights', () => {
    it('should calculate weights with default input', () => {
      const input = createMockInput();
      const result = calculator.calculateWeights(input);

      expect(result.weights).toBeDefined();
      expect(result.logs).toBeDefined();
      expect(Array.isArray(result.logs)).toBe(true);
    });

    it('should apply geokguk modifiers', () => {
      const input = createMockInput({ geokguk: 'jeonggwan' });
      const result = calculator.calculateWeights(input);

      expect(result.weights.layer2_sibsinPlanet).toBeGreaterThan(
        DEFAULT_LAYER_WEIGHTS.layer2_sibsinPlanet * 1.05
      );
    });

    it('should apply yongsin modifiers', () => {
      const input = createMockInput({ yongsin: '목' });
      const result = calculator.calculateWeights(input);

      expect(result.weights.layer1_elementCore).toBeGreaterThan(
        DEFAULT_LAYER_WEIGHTS.layer1_elementCore
      );
    });

    it('should apply query domain modifiers', () => {
      const input = createMockInput();
      const result = calculator.calculateWeights(input, 'career');

      expect(result.weights.layer2_sibsinPlanet).toBeGreaterThan(
        DEFAULT_LAYER_WEIGHTS.layer2_sibsinPlanet
      );
    });

    it('should apply transit modifiers', () => {
      const input = createMockInput({
        activeTransits: ['saturnReturn'],
      });
      const result = calculator.calculateWeights(input);

      expect(result.weights.layer4_timing).toBeGreaterThan(
        DEFAULT_LAYER_WEIGHTS.layer4_timing
      );
    });

    it('should normalize weights to 0.3-1.5 range', () => {
      const input = createMockInput({
        geokguk: 'jeonggwan',
        yongsin: '목',
        activeTransits: ['saturnReturn', 'jupiterReturn'],
      });
      const result = calculator.calculateWeights(input);

      const weights = Object.values(result.weights);
      expect(weights.every(w => w >= 0.3 && w <= 1.5)).toBe(true);
    });

    it('should handle missing geokguk', () => {
      const input = createMockInput({ geokguk: undefined });
      const result = calculator.calculateWeights(input);

      expect(result.weights).toBeDefined();
      expect(result.logs.length).toBeGreaterThan(0);
    });

    it('should handle missing yongsin', () => {
      const input = createMockInput({ yongsin: undefined });
      const result = calculator.calculateWeights(input);

      expect(result.weights).toBeDefined();
    });

    it('should handle empty active transits', () => {
      const input = createMockInput({ activeTransits: [] });
      const result = calculator.calculateWeights(input);

      expect(result.weights).toBeDefined();
    });

    it('should handle multiple transits', () => {
      const input = createMockInput({
        activeTransits: ['saturnReturn', 'jupiterReturn', 'mercuryRetrograde'],
      });
      const result = calculator.calculateWeights(input);

      expect(result.weights).toBeDefined();
      expect(result.logs.length).toBeGreaterThan(5);
    });

    it('should log all calculation steps', () => {
      const input = createMockInput({
        geokguk: 'jeonggwan',
        yongsin: '화',
      });
      const result = calculator.calculateWeights(input, 'career');

      expect(result.logs.length).toBeGreaterThan(0);
      expect(result.logs.every(log => log.step && log.reason)).toBe(true);
    });

    it('should include initialization step in logs', () => {
      const input = createMockInput();
      const result = calculator.calculateWeights(input);

      const initLog = result.logs.find(log => log.step === '초기화');
      expect(initLog).toBeDefined();
    });

    it('should include normalization step in logs', () => {
      const input = createMockInput();
      const result = calculator.calculateWeights(input);

      const normLog = result.logs.find(log => log.step === '정규화');
      expect(normLog).toBeDefined();
    });

    it('should apply cumulative modifiers correctly', () => {
      const input = createMockInput({
        geokguk: 'jeonggwan',
        yongsin: '목',
      });
      const result = calculator.calculateWeights(input);

      // Multiple modifiers should compound
      expect(result.weights.layer1_elementCore).toBeGreaterThan(
        DEFAULT_LAYER_WEIGHTS.layer1_elementCore
      );
    });
  });

  describe('getBoostedDomains', () => {
    it('should return empty array for no transits', () => {
      const domains = calculator.getBoostedDomains([]);

      expect(domains).toEqual([]);
    });

    it('should return boosted domains for Saturn Return', () => {
      const domains = calculator.getBoostedDomains(['saturnReturn']);

      expect(domains).toContain('career');
      expect(domains).toContain('personality');
    });

    it('should return boosted domains for Jupiter Return', () => {
      const domains = calculator.getBoostedDomains(['jupiterReturn']);

      expect(domains).toContain('wealth');
      expect(domains).toContain('spirituality');
    });

    it('should combine domains from multiple transits', () => {
      const domains = calculator.getBoostedDomains([
        'saturnReturn',
        'jupiterReturn',
      ]);

      expect(domains.length).toBeGreaterThan(2);
      expect(new Set(domains).size).toBe(domains.length); // No duplicates
    });

    it('should handle unknown transits gracefully', () => {
      const domains = calculator.getBoostedDomains(['unknownTransit' as any]);

      expect(Array.isArray(domains)).toBe(true);
    });
  });

  describe('getWeightSummary', () => {
    it('should return top 3 layers', () => {
      const weights: LayerWeights = {
        ...DEFAULT_LAYER_WEIGHTS,
        layer1_elementCore: 1.5,
        layer2_sibsinPlanet: 1.4,
        layer3_sibsinHouse: 1.3,
      };

      const summary = calculator.getWeightSummary(weights);

      expect(summary.topLayers).toHaveLength(3);
      expect(summary.topLayers[0]).toBe('layer1_elementCore');
    });

    it('should return bottom 3 layers', () => {
      const weights: LayerWeights = {
        ...DEFAULT_LAYER_WEIGHTS,
        layer9_asteroid: 0.3,
        layer10_extraPoint: 0.4,
      };

      const summary = calculator.getWeightSummary(weights);

      expect(summary.bottomLayers).toHaveLength(3);
      expect(summary.bottomLayers).toContain('layer9_asteroid');
    });

    it('should calculate total weight', () => {
      const weights: LayerWeights = { ...DEFAULT_LAYER_WEIGHTS };
      const summary = calculator.getWeightSummary(weights);

      expect(summary.totalWeight).toBeGreaterThan(0);
      expect(typeof summary.totalWeight).toBe('number');
    });

    it('should sort layers by weight', () => {
      const weights: LayerWeights = {
        ...DEFAULT_LAYER_WEIGHTS,
        layer1_elementCore: 1.0,
        layer2_sibsinPlanet: 1.5,
        layer3_sibsinHouse: 0.5,
      };

      const summary = calculator.getWeightSummary(weights);

      expect(summary.topLayers[0]).toBe('layer2_sibsinPlanet');
    });
  });

  describe('edge cases', () => {
    it('should handle all five elements as yongsin', () => {
      const elements: Array<'목' | '화' | '토' | '금' | '수'> = ['목', '화', '토', '금', '수'];

      elements.forEach(yongsin => {
        const input = createMockInput({ yongsin });
        const result = calculator.calculateWeights(input);

        expect(result.weights).toBeDefined();
      });
    });

    it('should handle all special geokguk patterns', () => {
      const patterns = ['geonrok', 'yangin', 'jonga', 'jongjae'];

      patterns.forEach(geokguk => {
        const input = createMockInput({ geokguk: geokguk as any });
        const result = calculator.calculateWeights(input);

        expect(result.weights).toBeDefined();
      });
    });

    it('should handle all domains', () => {
      const domains: InsightDomain[] = [
        'personality',
        'career',
        'relationship',
        'wealth',
        'health',
        'spirituality',
        'timing',
      ];

      domains.forEach(domain => {
        const input = createMockInput();
        const result = calculator.calculateWeights(input, domain);

        expect(result.weights).toBeDefined();
      });
    });

    it('should handle all retrograde transits', () => {
      const retrogrades = [
        'mercuryRetrograde',
        'venusRetrograde',
        'marsRetrograde',
        'jupiterRetrograde',
        'saturnRetrograde',
      ];

      retrogrades.forEach(retrograde => {
        const input = createMockInput({ activeTransits: [retrograde as any] });
        const result = calculator.calculateWeights(input);

        expect(result.weights).toBeDefined();
      });
    });
  });

  describe('custom base weights', () => {
    it('should use custom base weights', () => {
      const customWeights: LayerWeights = {
        ...DEFAULT_LAYER_WEIGHTS,
        layer1_elementCore: 2.0,
      };

      const customCalculator = new DynamicWeightCalculator(customWeights);
      const input = createMockInput();
      const result = customCalculator.calculateWeights(input);

      // Should be normalized to max 1.5
      expect(result.weights.layer1_elementCore).toBeLessThanOrEqual(1.5);
    });

    it('should apply modifiers on top of custom base weights', () => {
      const customWeights: LayerWeights = {
        ...DEFAULT_LAYER_WEIGHTS,
        layer1_elementCore: 0.5,
      };

      const customCalculator = new DynamicWeightCalculator(customWeights);
      const input = createMockInput({ yongsin: '목' });
      const result = customCalculator.calculateWeights(input);

      expect(result.weights.layer1_elementCore).toBeGreaterThan(0.5);
    });
  });
});

describe('getLayerDisplayName', () => {
  it('should return Korean name by default', () => {
    const name = getLayerDisplayName('layer1_elementCore');

    expect(name).toBe('기운 핵심');
    expect(typeof name).toBe('string');
  });

  it('should return Korean name explicitly', () => {
    const name = getLayerDisplayName('layer1_elementCore', 'ko');

    expect(name).toBe('기운 핵심');
  });

  it('should return English name', () => {
    const name = getLayerDisplayName('layer1_elementCore', 'en');

    expect(name).toBe('Element Core');
  });

  it('should handle all layer keys in Korean', () => {
    const layerKeys: (keyof LayerWeights)[] = [
      'layer1_elementCore',
      'layer2_sibsinPlanet',
      'layer3_sibsinHouse',
      'layer4_timing',
      'layer5_relationAspect',
      'layer6_stageHouse',
      'layer7_advanced',
      'layer8_shinsal',
      'layer9_asteroid',
      'layer10_extraPoint',
    ];

    layerKeys.forEach(key => {
      const name = getLayerDisplayName(key, 'ko');
      expect(name).toBeTruthy();
      expect(typeof name).toBe('string');
    });
  });

  it('should handle all layer keys in English', () => {
    const layerKeys: (keyof LayerWeights)[] = [
      'layer1_elementCore',
      'layer2_sibsinPlanet',
      'layer3_sibsinHouse',
      'layer4_timing',
      'layer5_relationAspect',
      'layer6_stageHouse',
      'layer7_advanced',
      'layer8_shinsal',
      'layer9_asteroid',
      'layer10_extraPoint',
    ];

    layerKeys.forEach(key => {
      const name = getLayerDisplayName(key, 'en');
      expect(name).toBeTruthy();
      expect(typeof name).toBe('string');
    });
  });

  it('should fallback to key if not found', () => {
    const name = getLayerDisplayName('unknown' as any);

    expect(name).toBe('unknown');
  });
});

describe('weightToPercent', () => {
  it('should convert 1.0 to 100', () => {
    expect(weightToPercent(1.0)).toBe(100);
  });

  it('should convert 0.5 to 50', () => {
    expect(weightToPercent(0.5)).toBe(50);
  });

  it('should convert 1.5 to 150', () => {
    expect(weightToPercent(1.5)).toBe(150);
  });

  it('should convert 0 to 0', () => {
    expect(weightToPercent(0)).toBe(0);
  });

  it('should round to integer', () => {
    expect(weightToPercent(0.456)).toBe(46);
    expect(weightToPercent(0.999)).toBe(100);
  });

  it('should handle very small weights', () => {
    expect(weightToPercent(0.01)).toBe(1);
  });

  it('should handle very large weights', () => {
    expect(weightToPercent(10.0)).toBe(1000);
  });
});

describe('DEFAULT_LAYER_WEIGHTS', () => {
  it('should have all 10 layers defined', () => {
    expect(Object.keys(DEFAULT_LAYER_WEIGHTS)).toHaveLength(10);
  });

  it('should have positive weights', () => {
    const weights = Object.values(DEFAULT_LAYER_WEIGHTS);
    expect(weights.every(w => w > 0)).toBe(true);
  });

  it('should have timing layer weighted high', () => {
    expect(DEFAULT_LAYER_WEIGHTS.layer4_timing).toBeGreaterThan(0.9);
  });

  it('should have asteroid layer weighted low', () => {
    expect(DEFAULT_LAYER_WEIGHTS.layer9_asteroid).toBeLessThan(0.6);
  });

  it('should have element core at 1.0', () => {
    expect(DEFAULT_LAYER_WEIGHTS.layer1_elementCore).toBe(1.0);
  });
});

describe('weight calculation consistency', () => {
  let calculator: DynamicWeightCalculator;

  beforeEach(() => {
    calculator = new DynamicWeightCalculator();
  });

  it('should produce same results for same input', () => {
    const input = {
      dayMasterElement: '목' as const,
      geokguk: 'jeonggwan' as const,
      yongsin: '화' as const,
      sibsinDistribution: { '비견': 2 },
      activeTransits: [] as any[],
    };

    const result1 = calculator.calculateWeights(input);
    const result2 = calculator.calculateWeights(input);

    expect(result1.weights).toEqual(result2.weights);
  });

  it('should produce different results for different geokguk', () => {
    const input1 = {
      dayMasterElement: '목' as const,
      geokguk: 'jeonggwan' as const,
      sibsinDistribution: {},
    };

    const input2 = {
      dayMasterElement: '목' as const,
      geokguk: 'geonrok' as const,
      sibsinDistribution: {},
    };

    const result1 = calculator.calculateWeights(input1);
    const result2 = calculator.calculateWeights(input2);

    expect(result1.weights).not.toEqual(result2.weights);
  });

  it('should always normalize to valid range', () => {
    const extremeInput = {
      dayMasterElement: '목' as const,
      geokguk: 'jeonggwan' as const,
      yongsin: '목' as const,
      sibsinDistribution: {},
      activeTransits: [
        'saturnReturn',
        'jupiterReturn',
        'plutoTransit',
      ] as any[],
    };

    const result = calculator.calculateWeights(extremeInput, 'career');
    const weights = Object.values(result.weights);

    expect(weights.every(w => w >= 0.3 && w <= 1.5)).toBe(true);
  });
});
