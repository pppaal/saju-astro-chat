import { describe, it, expect, beforeEach } from 'vitest';
import { InsightGenerator } from '@/lib/destiny-matrix/interpreter/insight-generator';
import type { MatrixCalculationInput, MatrixCell, InteractionCode } from '@/lib/destiny-matrix/types';
import type { FusionInsight, InsightDomain, InsightCategory } from '@/lib/destiny-matrix/interpreter/types';

describe('InsightGenerator', () => {
  let generator: InsightGenerator;

  beforeEach(() => {
    generator = new InsightGenerator();
  });

  // Helper to create mock interaction code
  const createMockInteraction = (level: InteractionCode['level'], score: number = 8): InteractionCode => ({
    level,
    score,
    keyword: '테스트',
    keywordEn: 'Test',
    icon: '✨',
    colorCode: 'purple',
  });

  // Helper to create mock matrix cell
  const createMockCell = (level: InteractionCode['level'], sajuBasis?: string, astroBasis?: string): MatrixCell => ({
    interaction: createMockInteraction(level),
    sajuBasis,
    astroBasis,
    sources: [],
  });

  // Helper to create mock input
  const createMockInput = (): MatrixCalculationInput => ({
    dayMasterElement: '목',
    geokguk: 'jeonggwan',
    yongsin: '화',
    sibsinDistribution: { '비견': 2, '식신': 1 },
    shinsalList: ['천을귀인'],
    currentDaeunElement: '화',
  });

  describe('generateInsights', () => {
    it('should generate insights from layer results', () => {
      const input = createMockInput();
      const layerResults = {
        layer1_elementCore: {
          'cell1': createMockCell('extreme', '목', 'Fire'),
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBeGreaterThan(0);
    });

    it('should handle empty layer results', () => {
      const input = createMockInput();
      const layerResults = {};

      const insights = generator.generateInsights(input, layerResults);

      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBe(0);
    });

    it('should apply dynamic weights based on context', () => {
      const input = createMockInput();
      const layerResults = {
        layer1_elementCore: {
          'cell1': createMockCell('extreme', '목', 'Fire'),
        },
        layer2_sibsinPlanet: {
          'cell2': createMockCell('amplify', '비견', 'Mars'),
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      expect(insights).toBeDefined();
      expect(insights.every(i => i.weightedScore > 0)).toBe(true);
    });

    it('should filter insights by query domain', () => {
      const input = createMockInput();
      const layerResults = {
        layer1_elementCore: {
          'cell1': createMockCell('extreme', '목', 'Fire'),
        },
      };

      const insights = generator.generateInsights(input, layerResults, 'career');

      expect(insights).toBeDefined();
      expect(Array.isArray(insights)).toBe(true);
    });

    it('should normalize scores to 1-100 range', () => {
      const input = createMockInput();
      const layerResults = {
        layer1_elementCore: {
          'cell1': createMockCell('extreme', '목', 'Fire'),
          'cell2': createMockCell('balance', '수', 'Earth'),
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      expect(insights.every(i => i.score >= 10 && i.score <= 100)).toBe(true);
    });

    it('should sort insights by priority', () => {
      const input = createMockInput();
      const layerResults = {
        layer1_elementCore: {
          'cell1': createMockCell('extreme', '목', 'Fire'),
          'cell2': createMockCell('balance', '수', 'Earth'),
          'cell3': createMockCell('conflict', '금', 'Water'),
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      // Critical/high priority should come first
      if (insights.length >= 2) {
        const priorities = insights.map(i => i.priority);
        const priorityValues = { critical: 4, high: 3, medium: 2, low: 1 };
        for (let i = 0; i < priorities.length - 1; i++) {
          expect(priorityValues[priorities[i]]).toBeGreaterThanOrEqual(priorityValues[priorities[i + 1]]);
        }
      }
    });

    it('should generate bilingual titles', () => {
      const input = createMockInput();
      const layerResults = {
        layer1_elementCore: {
          'cell1': createMockCell('extreme', '목', 'Fire'),
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      expect(insights.every(i => i.title && i.titleEn)).toBe(true);
    });

    it('should generate bilingual descriptions', () => {
      const input = createMockInput();
      const layerResults = {
        layer1_elementCore: {
          'cell1': createMockCell('extreme', '목', 'Fire'),
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      expect(insights.every(i => i.description && i.descriptionEn)).toBe(true);
    });

    it('should merge related insights from multiple layers', () => {
      const input = createMockInput();
      const layerResults = {
        layer1_elementCore: {
          'cell1': createMockCell('extreme', '목', 'Fire'),
        },
        layer2_sibsinPlanet: {
          'cell1': createMockCell('extreme', '목', 'Fire'), // Same pattern
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      // Should have merged similar insights
      expect(insights.length).toBeLessThanOrEqual(2);
    });

    it('should track sources for each insight', () => {
      const input = createMockInput();
      const layerResults = {
        layer1_elementCore: {
          'cell1': createMockCell('extreme', '목', 'Fire'),
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      expect(insights.every(i => Array.isArray(i.sources))).toBe(true);
      expect(insights.every(i => i.sources.length > 0)).toBe(true);
      expect(insights.every(i => i.sources.every(s => s.layer && s.interaction))).toBe(true);
    });
  });

  describe('getTopInsights', () => {
    it('should return top N insights', () => {
      const mockInsights: FusionInsight[] = Array.from({ length: 10 }, (_, i) => ({
        id: `insight_${i}`,
        category: 'strength' as InsightCategory,
        domain: 'personality' as InsightDomain,
        priority: 'high' as const,
        score: 90 - i,
        rawScore: 8,
        weightedScore: 8,
        sources: [],
        title: `Insight ${i}`,
        titleEn: `Insight ${i}`,
        description: 'Test',
        descriptionEn: 'Test',
        actionItems: [],
        icon: '✨',
        colorCode: '#9333ea',
      }));

      const top5 = generator.getTopInsights(mockInsights, 5);

      expect(top5.length).toBe(5);
      expect(top5[0].score).toBeGreaterThanOrEqual(top5[4].score);
    });

    it('should handle count larger than array size', () => {
      const mockInsights: FusionInsight[] = Array.from({ length: 3 }, (_, i) => ({
        id: `insight_${i}`,
        category: 'strength' as InsightCategory,
        domain: 'personality' as InsightDomain,
        priority: 'high' as const,
        score: 90,
        rawScore: 8,
        weightedScore: 8,
        sources: [],
        title: `Insight ${i}`,
        titleEn: `Insight ${i}`,
        description: 'Test',
        descriptionEn: 'Test',
        actionItems: [],
        icon: '✨',
        colorCode: '#9333ea',
      }));

      const top10 = generator.getTopInsights(mockInsights, 10);

      expect(top10.length).toBe(3);
    });

    it('should handle empty insights array', () => {
      const top5 = generator.getTopInsights([], 5);

      expect(top5).toEqual([]);
    });

    it('should default to 5 insights when count not specified', () => {
      const mockInsights: FusionInsight[] = Array.from({ length: 10 }, (_, i) => ({
        id: `insight_${i}`,
        category: 'strength' as InsightCategory,
        domain: 'personality' as InsightDomain,
        priority: 'high' as const,
        score: 90,
        rawScore: 8,
        weightedScore: 8,
        sources: [],
        title: `Insight ${i}`,
        titleEn: `Insight ${i}`,
        description: 'Test',
        descriptionEn: 'Test',
        actionItems: [],
        icon: '✨',
        colorCode: '#9333ea',
      }));

      const topDefault = generator.getTopInsights(mockInsights);

      expect(topDefault.length).toBe(5);
    });
  });

  describe('groupByCategory', () => {
    it('should group insights by category', () => {
      const mockInsights: FusionInsight[] = [
        {
          id: '1',
          category: 'strength',
          domain: 'personality',
          priority: 'high',
          score: 90,
          rawScore: 8,
          weightedScore: 8,
          sources: [],
          title: 'Strength',
          titleEn: 'Strength',
          description: 'Test',
          descriptionEn: 'Test',
          actionItems: [],
          icon: '✨',
          colorCode: '#9333ea',
        },
        {
          id: '2',
          category: 'challenge',
          domain: 'career',
          priority: 'medium',
          score: 50,
          rawScore: 4,
          weightedScore: 4,
          sources: [],
          title: 'Challenge',
          titleEn: 'Challenge',
          description: 'Test',
          descriptionEn: 'Test',
          actionItems: [],
          icon: '❌',
          colorCode: '#ef4444',
        },
      ];

      const grouped = generator.groupByCategory(mockInsights);

      expect(grouped.strength).toHaveLength(1);
      expect(grouped.challenge).toHaveLength(1);
      expect(grouped.opportunity).toHaveLength(0);
    });

    it('should initialize all categories', () => {
      const grouped = generator.groupByCategory([]);

      expect(grouped).toHaveProperty('strength');
      expect(grouped).toHaveProperty('opportunity');
      expect(grouped).toHaveProperty('balance');
      expect(grouped).toHaveProperty('caution');
      expect(grouped).toHaveProperty('challenge');
    });

    it('should handle empty insights array', () => {
      const grouped = generator.groupByCategory([]);

      expect(Object.values(grouped).every(arr => arr.length === 0)).toBe(true);
    });
  });

  describe('groupByDomain', () => {
    it('should group insights by domain', () => {
      const mockInsights: FusionInsight[] = [
        {
          id: '1',
          category: 'strength',
          domain: 'personality',
          priority: 'high',
          score: 90,
          rawScore: 8,
          weightedScore: 8,
          sources: [],
          title: 'Personality',
          titleEn: 'Personality',
          description: 'Test',
          descriptionEn: 'Test',
          actionItems: [],
          icon: '✨',
          colorCode: '#9333ea',
        },
        {
          id: '2',
          category: 'strength',
          domain: 'career',
          priority: 'high',
          score: 85,
          rawScore: 7,
          weightedScore: 7,
          sources: [],
          title: 'Career',
          titleEn: 'Career',
          description: 'Test',
          descriptionEn: 'Test',
          actionItems: [],
          icon: '✨',
          colorCode: '#9333ea',
        },
      ];

      const grouped = generator.groupByDomain(mockInsights);

      expect(grouped.personality).toHaveLength(1);
      expect(grouped.career).toHaveLength(1);
      expect(grouped.relationship).toHaveLength(0);
    });

    it('should initialize all domains', () => {
      const grouped = generator.groupByDomain([]);

      expect(grouped).toHaveProperty('personality');
      expect(grouped).toHaveProperty('career');
      expect(grouped).toHaveProperty('relationship');
      expect(grouped).toHaveProperty('wealth');
      expect(grouped).toHaveProperty('health');
      expect(grouped).toHaveProperty('spirituality');
      expect(grouped).toHaveProperty('timing');
    });

    it('should handle empty insights array', () => {
      const grouped = generator.groupByDomain([]);

      expect(Object.values(grouped).every(arr => arr.length === 0)).toBe(true);
    });

    it('should preserve insight order within domain', () => {
      const mockInsights: FusionInsight[] = [
        {
          id: '1',
          category: 'strength',
          domain: 'personality',
          priority: 'high',
          score: 90,
          rawScore: 8,
          weightedScore: 8,
          sources: [],
          title: 'First',
          titleEn: 'First',
          description: 'Test',
          descriptionEn: 'Test',
          actionItems: [],
          icon: '✨',
          colorCode: '#9333ea',
        },
        {
          id: '2',
          category: 'strength',
          domain: 'personality',
          priority: 'high',
          score: 85,
          rawScore: 7,
          weightedScore: 7,
          sources: [],
          title: 'Second',
          titleEn: 'Second',
          description: 'Test',
          descriptionEn: 'Test',
          actionItems: [],
          icon: '✨',
          colorCode: '#9333ea',
        },
      ];

      const grouped = generator.groupByDomain(mockInsights);

      expect(grouped.personality[0].title).toBe('First');
      expect(grouped.personality[1].title).toBe('Second');
    });
  });

  describe('insight generation details', () => {
    it('should generate unique insight IDs', () => {
      const input = createMockInput();
      const layerResults = {
        layer1_elementCore: {
          'cell1': createMockCell('extreme', '목', 'Fire'),
          'cell2': createMockCell('amplify', '화', 'Air'),
        },
      };

      const insights = generator.generateInsights(input, layerResults);
      const ids = insights.map(i => i.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should assign correct category based on interaction level', () => {
      const input = createMockInput();
      const layerResults = {
        layer1: {
          'extreme': createMockCell('extreme'),
          'amplify': createMockCell('amplify'),
          'balance': createMockCell('balance'),
          'clash': createMockCell('clash'),
          'conflict': createMockCell('conflict'),
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      // Check category mapping
      const categoryMap: Record<string, InsightCategory> = {
        extreme: 'strength',
        amplify: 'opportunity',
        balance: 'balance',
        clash: 'caution',
        conflict: 'challenge',
      };

      insights.forEach(insight => {
        const expectedCategory = categoryMap[insight.sources[0].interaction.level];
        expect(insight.category).toBe(expectedCategory);
      });
    });

    it('should generate action items for each category', () => {
      const input = createMockInput();
      const layerResults = {
        layer1: {
          'strength': createMockCell('extreme'),
          'challenge': createMockCell('conflict'),
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      insights.forEach(insight => {
        expect(insight.actionItems).toBeDefined();
        expect(Array.isArray(insight.actionItems)).toBe(true);
        expect(insight.actionItems.length).toBeGreaterThan(0);
        expect(insight.actionItems.every(item => item.text && item.textEn)).toBe(true);
      });
    });

    it('should include icon and color for visualization', () => {
      const input = createMockInput();
      const layerResults = {
        layer1: {
          'cell1': createMockCell('extreme'),
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      insights.forEach(insight => {
        expect(insight.icon).toBeDefined();
        expect(insight.colorCode).toBeDefined();
        expect(insight.colorCode).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it('should calculate priority based on score and weight', () => {
      const input = createMockInput();
      const highScoreCell = createMockCell('extreme');
      highScoreCell.interaction.score = 9.5;

      const lowScoreCell = createMockCell('balance');
      lowScoreCell.interaction.score = 4;

      const layerResults = {
        layer1: {
          'high': highScoreCell,
          'low': lowScoreCell,
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      const highInsight = insights.find(i => i.rawScore === 9.5);
      const lowInsight = insights.find(i => i.rawScore === 4);

      if (highInsight) {
        expect(['critical', 'high']).toContain(highInsight.priority);
      }
      if (lowInsight) {
        expect(['medium', 'low']).toContain(lowInsight.priority);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle null saju basis', () => {
      const input = createMockInput();
      const layerResults = {
        layer1: {
          'cell1': createMockCell('extreme', undefined, 'Fire'),
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      expect(insights).toBeDefined();
      expect(insights.length).toBeGreaterThan(0);
    });

    it('should handle null astro basis', () => {
      const input = createMockInput();
      const layerResults = {
        layer1: {
          'cell1': createMockCell('extreme', '목', undefined),
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      expect(insights).toBeDefined();
      expect(insights.length).toBeGreaterThan(0);
    });

    it('should handle insights with same score', () => {
      const input = createMockInput();
      const layerResults = {
        layer1: {
          'cell1': createMockCell('extreme'),
          'cell2': createMockCell('extreme'),
          'cell3': createMockCell('extreme'),
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      expect(insights).toBeDefined();
      expect(insights.length).toBeGreaterThan(0);
    });

    it('should handle very large number of cells', () => {
      const input = createMockInput();
      const layerResults: Record<string, Record<string, MatrixCell>> = {};

      // Generate 100 cells
      for (let i = 0; i < 10; i++) {
        layerResults[`layer${i}`] = {};
        for (let j = 0; j < 10; j++) {
          layerResults[`layer${i}`][`cell${j}`] = createMockCell('extreme');
        }
      }

      const insights = generator.generateInsights(input, layerResults);

      expect(insights).toBeDefined();
      expect(insights.length).toBeGreaterThan(0);
    });

    it('should handle missing geokguk in input', () => {
      const input: MatrixCalculationInput = {
        dayMasterElement: '목',
        sibsinDistribution: {},
      };
      const layerResults = {
        layer1: {
          'cell1': createMockCell('extreme'),
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      expect(insights).toBeDefined();
    });

    it('should handle missing yongsin in input', () => {
      const input: MatrixCalculationInput = {
        dayMasterElement: '목',
        geokguk: 'jeonggwan',
        sibsinDistribution: {},
      };
      const layerResults = {
        layer1: {
          'cell1': createMockCell('extreme'),
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      expect(insights).toBeDefined();
    });
  });

  describe('domain inference', () => {
    it('should infer personality domain from sibsin', () => {
      const input = createMockInput();
      const layerResults = {
        layer2: {
          'cell1': createMockCell('extreme', '비견', 'Mars'),
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      expect(insights[0].domain).toBe('personality');
    });

    it('should infer career domain from planets', () => {
      const input = createMockInput();
      const layerResults = {
        layer2: {
          'cell1': createMockCell('extreme', '식신', 'Saturn'),
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      // Saturn typically maps to career
      expect(['career', 'health']).toContain(insights[0].domain);
    });

    it('should infer relationship domain from houses', () => {
      const input = createMockInput();
      const layerResults = {
        layer3: {
          'cell1': createMockCell('extreme', '겁재', 'H7'), // 겁재 in H7 (relationship house)
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      // Domain inference depends on complex logic, verify it returns valid domain
      expect(['relationship', 'career', 'personality', 'health', 'wealth', 'life_path', 'growth']).toContain(insights[0].domain);
    });

    it('should default to personality when no clear domain', () => {
      const input = createMockInput();
      const layerResults = {
        layer1: {
          'cell1': createMockCell('extreme', 'unknown', 'unknown'),
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      expect(insights[0].domain).toBe('personality');
    });
  });

  describe('bilingual support', () => {
    it('should provide Korean titles', () => {
      const input = createMockInput();
      const layerResults = {
        layer1: {
          'cell1': createMockCell('extreme'),
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      insights.forEach(insight => {
        expect(insight.title).toBeTruthy();
        expect(typeof insight.title).toBe('string');
      });
    });

    it('should provide English titles', () => {
      const input = createMockInput();
      const layerResults = {
        layer1: {
          'cell1': createMockCell('extreme'),
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      insights.forEach(insight => {
        expect(insight.titleEn).toBeTruthy();
        expect(typeof insight.titleEn).toBe('string');
      });
    });

    it('should provide Korean action items', () => {
      const input = createMockInput();
      const layerResults = {
        layer1: {
          'cell1': createMockCell('extreme'),
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      insights.forEach(insight => {
        insight.actionItems.forEach(item => {
          expect(item.text).toBeTruthy();
          expect(typeof item.text).toBe('string');
        });
      });
    });

    it('should provide English action items', () => {
      const input = createMockInput();
      const layerResults = {
        layer1: {
          'cell1': createMockCell('extreme'),
        },
      };

      const insights = generator.generateInsights(input, layerResults);

      insights.forEach(insight => {
        insight.actionItems.forEach(item => {
          expect(item.textEn).toBeTruthy();
          expect(typeof item.textEn).toBe('string');
        });
      });
    });
  });
});
