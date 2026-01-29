/**
 * @file Recommendation Builder Tests
 *
 * Comprehensive test coverage for recommendation-builder.ts
 * Target: 80%+ lines, 75%+ branches
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildRecommendationKeys,
  type RecommendationBuilderInput,
  type RecommendationBuilderResult,
} from '@/lib/destiny-map/calendar/builders/recommendation-builder';
import type { BranchInteraction } from '@/lib/prediction/advancedTimingEngine';

describe('Recommendation Builder Module', () => {
  let baseInput: RecommendationBuilderInput;

  beforeEach(() => {
    baseInput = {
      ganzhi: { stem: '甲', branch: '子' },
      dayMasterStem: '甲',
      dayBranch: '子',
      retrogradePlanets: [],
      branchInteractions: [],
      specialFlags: {
        hasCheoneulGwiin: false,
        hasSonEomneun: false,
        hasGeonrok: false,
        isSamjaeYear: false,
        hasYeokma: false,
        hasDohwa: false,
      },
      planetaryHourDayRuler: '',
      relations: {
        generates: '',
        generatedBy: '',
        controls: '',
        controlledBy: '',
      },
    };
  });

  describe('buildRecommendationKeys - Basic Functionality', () => {
    it('should return empty arrays when no special conditions', () => {
      const result = buildRecommendationKeys(baseInput);

      expect(result).toHaveProperty('recommendationKeys');
      expect(result).toHaveProperty('warningKeys');
      expect(Array.isArray(result.recommendationKeys)).toBe(true);
      expect(Array.isArray(result.warningKeys)).toBe(true);
    });

    it('should return result structure with arrays', () => {
      const result = buildRecommendationKeys(baseInput);

      expect(result.recommendationKeys).toEqual([]);
      expect(result.warningKeys).toEqual([]);
    });
  });

  describe('Branch Interactions - Positive', () => {
    it('should add partnership and harmony for 육합 (positive)', () => {
      const interaction: BranchInteraction = {
        branches: ['子', '丑'],
        type: '육합',
        impact: 'positive',
        score: 10,
      };

      const input = { ...baseInput, branchInteractions: [interaction] };
      const result = buildRecommendationKeys(input);

      expect(result.recommendationKeys).toContain('partnership');
      expect(result.recommendationKeys).toContain('harmony');
    });

    it('should add collaboration and synergy for 삼합 (positive)', () => {
      const interaction: BranchInteraction = {
        branches: ['子', '辰', '申'],
        type: '삼합',
        impact: 'positive',
        score: 15,
      };

      const input = { ...baseInput, branchInteractions: [interaction] };
      const result = buildRecommendationKeys(input);

      expect(result.recommendationKeys).toContain('collaboration');
      expect(result.recommendationKeys).toContain('synergy');
    });

    it('should add expansion and growth for 방합 (positive)', () => {
      const interaction: BranchInteraction = {
        branches: ['寅', '卯', '辰'],
        type: '방합',
        impact: 'positive',
        score: 12,
      };

      const input = { ...baseInput, branchInteractions: [interaction] };
      const result = buildRecommendationKeys(input);

      expect(result.recommendationKeys).toContain('expansion');
      expect(result.recommendationKeys).toContain('growth');
    });

    it('should handle multiple positive interactions', () => {
      const interactions: BranchInteraction[] = [
        { branches: ['子', '丑'], type: '육합', impact: 'positive', score: 10 },
        { branches: ['子', '辰', '申'], type: '삼합', impact: 'positive', score: 15 },
      ];

      const input = { ...baseInput, branchInteractions: interactions };
      const result = buildRecommendationKeys(input);

      expect(result.recommendationKeys).toContain('partnership');
      expect(result.recommendationKeys).toContain('collaboration');
    });
  });

  describe('Branch Interactions - Negative', () => {
    it('should add conflict and change for 충 (negative)', () => {
      const interaction: BranchInteraction = {
        branches: ['子', '午'],
        type: '충',
        impact: 'negative',
        score: -15,
      };

      const input = { ...baseInput, branchInteractions: [interaction] };
      const result = buildRecommendationKeys(input);

      expect(result.warningKeys).toContain('conflict');
      expect(result.warningKeys).toContain('change');
    });

    it('should add tension and challenge for 형 (negative)', () => {
      const interaction: BranchInteraction = {
        branches: ['子', '卯'],
        type: '형',
        impact: 'negative',
        score: -10,
      };

      const input = { ...baseInput, branchInteractions: [interaction] };
      const result = buildRecommendationKeys(input);

      expect(result.warningKeys).toContain('tension');
      expect(result.warningKeys).toContain('challenge');
    });

    it('should handle multiple negative interactions', () => {
      const interactions: BranchInteraction[] = [
        { branches: ['子', '午'], type: '충', impact: 'negative', score: -15 },
        { branches: ['子', '卯'], type: '형', impact: 'negative', score: -10 },
      ];

      const input = { ...baseInput, branchInteractions: interactions };
      const result = buildRecommendationKeys(input);

      expect(result.warningKeys).toContain('conflict');
      expect(result.warningKeys).toContain('tension');
    });
  });

  describe('Branch Interactions - Mixed', () => {
    it('should handle both positive and negative interactions', () => {
      const interactions: BranchInteraction[] = [
        { branches: ['子', '丑'], type: '육합', impact: 'positive', score: 10 },
        { branches: ['子', '午'], type: '충', impact: 'negative', score: -15 },
      ];

      const input = { ...baseInput, branchInteractions: interactions };
      const result = buildRecommendationKeys(input);

      expect(result.recommendationKeys).toContain('partnership');
      expect(result.warningKeys).toContain('conflict');
    });

    it('should handle neutral impact interactions (ignored)', () => {
      const interaction: BranchInteraction = {
        branches: ['子', '丑'],
        type: '육합',
        impact: 'neutral' as any,
        score: 0,
      };

      const input = { ...baseInput, branchInteractions: [interaction] };
      const result = buildRecommendationKeys(input);

      // Neutral impacts should not add recommendations or warnings
      expect(result.recommendationKeys.length).toBe(0);
      expect(result.warningKeys.length).toBe(0);
    });
  });

  describe('Special Flags - 천을귀인', () => {
    it('should add major decision keys when 천을귀인 is true', () => {
      const input = {
        ...baseInput,
        specialFlags: { ...baseInput.specialFlags, hasCheoneulGwiin: true },
      };
      const result = buildRecommendationKeys(input);

      expect(result.recommendationKeys).toContain('majorDecision');
      expect(result.recommendationKeys).toContain('contract');
      expect(result.recommendationKeys).toContain('meeting');
    });

    it('should not add keys when 천을귀인 is false', () => {
      const result = buildRecommendationKeys(baseInput);

      expect(result.recommendationKeys).not.toContain('majorDecision');
    });
  });

  describe('Special Flags - 손없는 날', () => {
    it('should add moving/wedding/business when 손없는 날 is true', () => {
      const input = {
        ...baseInput,
        specialFlags: { ...baseInput.specialFlags, hasSonEomneun: true },
      };
      const result = buildRecommendationKeys(input);

      expect(result.recommendationKeys).toContain('moving');
      expect(result.recommendationKeys).toContain('wedding');
      expect(result.recommendationKeys).toContain('business');
    });
  });

  describe('Special Flags - 건록', () => {
    it('should add career/authority/promotion when 건록 is true', () => {
      const input = {
        ...baseInput,
        specialFlags: { ...baseInput.specialFlags, hasGeonrok: true },
      };
      const result = buildRecommendationKeys(input);

      expect(result.recommendationKeys).toContain('career');
      expect(result.recommendationKeys).toContain('authority');
      expect(result.recommendationKeys).toContain('promotion');
    });
  });

  describe('Special Flags - 삼재', () => {
    it('should add samjae warning when 삼재 is true', () => {
      const input = {
        ...baseInput,
        specialFlags: { ...baseInput.specialFlags, isSamjaeYear: true },
      };
      const result = buildRecommendationKeys(input);

      expect(result.warningKeys).toContain('samjae');
      expect(result.warningKeys).toContain('caution');
    });
  });

  describe('Special Flags - 역마살', () => {
    it('should add travel recommendations and instability warning when 역마 is true', () => {
      const input = {
        ...baseInput,
        specialFlags: { ...baseInput.specialFlags, hasYeokma: true },
      };
      const result = buildRecommendationKeys(input);

      expect(result.recommendationKeys).toContain('travel');
      expect(result.recommendationKeys).toContain('change');
      expect(result.recommendationKeys).toContain('interview');
      expect(result.warningKeys).toContain('instability');
    });
  });

  describe('Special Flags - 도화살', () => {
    it('should add dating/socializing/charm when 도화 is true', () => {
      const input = {
        ...baseInput,
        specialFlags: { ...baseInput.specialFlags, hasDohwa: true },
      };
      const result = buildRecommendationKeys(input);

      expect(result.recommendationKeys).toContain('dating');
      expect(result.recommendationKeys).toContain('socializing');
      expect(result.recommendationKeys).toContain('charm');
    });
  });

  describe('Special Flags - Multiple Flags', () => {
    it('should handle all flags enabled simultaneously', () => {
      const input = {
        ...baseInput,
        specialFlags: {
          hasCheoneulGwiin: true,
          hasSonEomneun: true,
          hasGeonrok: true,
          isSamjaeYear: true,
          hasYeokma: true,
          hasDohwa: true,
        },
      };
      const result = buildRecommendationKeys(input);

      // Should have many recommendations and warnings
      expect(result.recommendationKeys.length).toBeGreaterThan(10);
      expect(result.warningKeys.length).toBeGreaterThan(0);
      expect(result.recommendationKeys).toContain('majorDecision');
      expect(result.recommendationKeys).toContain('moving');
      expect(result.warningKeys).toContain('samjae');
    });
  });

  describe('Sipsin (십신) Recommendations', () => {
    it('should add stable wealth for 정재', () => {
      const input = {
        ...baseInput,
        dayMasterStem: '甲',
        ganzhi: { stem: '己', branch: '子' }, // 己 is 정재 for 甲
      };
      const result = buildRecommendationKeys(input);

      expect(result.recommendationKeys).toContain('stableWealth');
      expect(result.recommendationKeys).toContain('savings');
    });

    it('should add speculation and windfall for 편재', () => {
      const input = {
        ...baseInput,
        dayMasterStem: '甲',
        ganzhi: { stem: '戊', branch: '子' }, // 戊 is 편재 for 甲
      };
      const result = buildRecommendationKeys(input);

      expect(result.recommendationKeys).toContain('speculation');
      expect(result.recommendationKeys).toContain('windfall');
      expect(result.warningKeys).toContain('riskManagement');
    });

    it('should add learning for 정인', () => {
      const input = {
        ...baseInput,
        dayMasterStem: '甲',
        ganzhi: { stem: '癸', branch: '子' }, // 癸 is 정인 for 甲
      };
      const result = buildRecommendationKeys(input);

      expect(result.recommendationKeys).toContain('learning');
      expect(result.recommendationKeys).toContain('certification');
      expect(result.recommendationKeys).toContain('mother');
    });

    it('should add spirituality for 편인', () => {
      const input = {
        ...baseInput,
        dayMasterStem: '甲',
        ganzhi: { stem: '壬', branch: '子' }, // 壬 is 편인 for 甲
      };
      const result = buildRecommendationKeys(input);

      expect(result.recommendationKeys).toContain('spirituality');
      expect(result.recommendationKeys).toContain('unique');
    });

    it('should add rivalry warning for 겁재', () => {
      const input = {
        ...baseInput,
        dayMasterStem: '甲',
        ganzhi: { stem: '乙', branch: '子' }, // 乙 is 겁재 for 甲
      };
      const result = buildRecommendationKeys(input);

      expect(result.warningKeys).toContain('rivalry');
      expect(result.warningKeys).toContain('loss');
    });

    it('should handle dayMasterStem without adding sipsin keys for non-matched', () => {
      const input = {
        ...baseInput,
        dayMasterStem: '甲',
        ganzhi: { stem: '庚', branch: '子' }, // 庚 is 편관 (not in switch cases)
      };
      const result = buildRecommendationKeys(input);

      // Should not have sipsin-specific keys if not in switch
      expect(result.recommendationKeys).not.toContain('stableWealth');
      expect(result.warningKeys).not.toContain('rivalry');
    });

    it('should handle empty dayMasterStem', () => {
      const input = {
        ...baseInput,
        dayMasterStem: '',
        ganzhi: { stem: '己', branch: '子' },
      };
      const result = buildRecommendationKeys(input);

      // Should complete without sipsin analysis
      expect(result).toBeDefined();
    });
  });

  describe('Day Branch Relations - 육합', () => {
    it('should add love/meeting/reconciliation for 육합 (子-丑)', () => {
      const input = {
        ...baseInput,
        dayBranch: '子',
        ganzhi: { stem: '甲', branch: '丑' }, // 子-丑 육합
      };
      const result = buildRecommendationKeys(input);

      expect(result.recommendationKeys).toContain('love');
      expect(result.recommendationKeys).toContain('meeting');
      expect(result.recommendationKeys).toContain('reconciliation');
    });

    it('should add keys for all 6 육합 pairs', () => {
      const yukhapPairs = [
        ['子', '丑'],
        ['寅', '亥'],
        ['卯', '戌'],
        ['辰', '酉'],
        ['巳', '申'],
        ['午', '未'],
      ];

      yukhapPairs.forEach(([day, target]) => {
        const input = {
          ...baseInput,
          dayBranch: day,
          ganzhi: { stem: '甲', branch: target },
        };
        const result = buildRecommendationKeys(input);

        expect(result.recommendationKeys).toContain('love');
      });
    });
  });

  describe('Day Branch Relations - 충', () => {
    it('should add warnings and careful recommendation for 충 (子-午)', () => {
      const input = {
        ...baseInput,
        dayBranch: '子',
        ganzhi: { stem: '甲', branch: '午' }, // 子-午 충
      };
      const result = buildRecommendationKeys(input);

      expect(result.warningKeys).toContain('avoidTravel');
      expect(result.warningKeys).toContain('conflict');
      expect(result.warningKeys).toContain('accident');
      expect(result.warningKeys).toContain('avoidChange');
      expect(result.recommendationKeys).toContain('careful');
      expect(result.recommendationKeys).toContain('postpone');
    });

    it('should handle all 6 충 pairs', () => {
      const chungPairs = [
        ['子', '午'],
        ['丑', '未'],
        ['寅', '申'],
        ['卯', '酉'],
        ['辰', '戌'],
        ['巳', '亥'],
      ];

      chungPairs.forEach(([day, target]) => {
        const input = {
          ...baseInput,
          dayBranch: day,
          ganzhi: { stem: '甲', branch: target },
        };
        const result = buildRecommendationKeys(input);

        expect(result.warningKeys).toContain('conflict');
        expect(result.recommendationKeys).toContain('careful');
      });
    });
  });

  describe('Day Branch Relations - 형', () => {
    it('should add legal/injury warnings for 형', () => {
      const input = {
        ...baseInput,
        dayBranch: '子',
        ganzhi: { stem: '甲', branch: '卯' }, // 子-卯 형
      };
      const result = buildRecommendationKeys(input);

      expect(result.warningKeys).toContain('legal');
      expect(result.warningKeys).toContain('injury');
    });
  });

  describe('Day Branch Relations - 해 (害)', () => {
    it('should add betrayal/misunderstanding warnings for 해 (子-未)', () => {
      const input = {
        ...baseInput,
        dayBranch: '子',
        ganzhi: { stem: '甲', branch: '未' }, // 子-未 해
      };
      const result = buildRecommendationKeys(input);

      expect(result.warningKeys).toContain('betrayal');
      expect(result.warningKeys).toContain('misunderstanding');
    });

    it('should handle all 12 해 pairs', () => {
      const haiPairs = [
        ['子', '未'],
        ['未', '子'],
        ['丑', '午'],
        ['午', '丑'],
        ['寅', '巳'],
        ['巳', '寅'],
        ['卯', '辰'],
        ['辰', '卯'],
        ['申', '亥'],
        ['亥', '申'],
        ['酉', '戌'],
        ['戌', '酉'],
      ];

      haiPairs.forEach(([day, target]) => {
        const input = {
          ...baseInput,
          dayBranch: day,
          ganzhi: { stem: '甲', branch: target },
        };
        const result = buildRecommendationKeys(input);

        expect(result.warningKeys).toContain('betrayal');
      });
    });
  });

  describe('Day Branch Relations - Empty dayBranch', () => {
    it('should handle empty dayBranch gracefully', () => {
      const input = {
        ...baseInput,
        dayBranch: '',
        ganzhi: { stem: '甲', branch: '丑' },
      };
      const result = buildRecommendationKeys(input);

      // Should complete without branch relation checks
      expect(result).toBeDefined();
      expect(result.recommendationKeys).not.toContain('love');
    });
  });

  describe('Retrograde Planets', () => {
    it('should add mercury retrograde warning', () => {
      const input = {
        ...baseInput,
        retrogradePlanets: ['mercury'],
      };
      const result = buildRecommendationKeys(input);

      expect(result.warningKeys).toContain('mercuryRetrograde');
    });

    it('should add venus retrograde warning', () => {
      const input = {
        ...baseInput,
        retrogradePlanets: ['venus'],
      };
      const result = buildRecommendationKeys(input);

      expect(result.warningKeys).toContain('venusRetrograde');
    });

    it('should add mars retrograde warning', () => {
      const input = {
        ...baseInput,
        retrogradePlanets: ['mars'],
      };
      const result = buildRecommendationKeys(input);

      expect(result.warningKeys).toContain('marsRetrograde');
    });

    it('should handle multiple retrograde planets', () => {
      const input = {
        ...baseInput,
        retrogradePlanets: ['mercury', 'venus', 'mars'],
      };
      const result = buildRecommendationKeys(input);

      expect(result.warningKeys).toContain('mercuryRetrograde');
      expect(result.warningKeys).toContain('venusRetrograde');
      expect(result.warningKeys).toContain('marsRetrograde');
    });

    it('should handle unknown retrograde planet (ignored)', () => {
      const input = {
        ...baseInput,
        retrogradePlanets: ['jupiter', 'saturn'],
      };
      const result = buildRecommendationKeys(input);

      // Only mercury, venus, mars are checked
      expect(result.warningKeys.length).toBe(0);
    });

    it('should handle empty retrograde planets array', () => {
      const input = {
        ...baseInput,
        retrogradePlanets: [],
      };
      const result = buildRecommendationKeys(input);

      expect(result.warningKeys).not.toContain('mercuryRetrograde');
    });
  });

  describe('Planetary Hour Ruler', () => {
    it('should add expansion/luck for Jupiter', () => {
      const input = {
        ...baseInput,
        planetaryHourDayRuler: 'Jupiter',
      };
      const result = buildRecommendationKeys(input);

      expect(result.recommendationKeys).toContain('expansion');
      expect(result.recommendationKeys).toContain('luck');
    });

    it('should add love/beauty for Venus', () => {
      const input = {
        ...baseInput,
        planetaryHourDayRuler: 'Venus',
      };
      const result = buildRecommendationKeys(input);

      expect(result.recommendationKeys).toContain('love');
      expect(result.recommendationKeys).toContain('beauty');
    });

    it('should handle other planetary rulers (ignored)', () => {
      const rulers = ['Sun', 'Moon', 'Mars', 'Mercury', 'Saturn'];

      rulers.forEach((ruler) => {
        const input = {
          ...baseInput,
          planetaryHourDayRuler: ruler,
        };
        const result = buildRecommendationKeys(input);

        // Only Jupiter and Venus are checked
        expect(result.recommendationKeys).not.toContain('expansion');
        expect(result.recommendationKeys).not.toContain('beauty');
      });
    });

    it('should handle empty planetary ruler', () => {
      const input = {
        ...baseInput,
        planetaryHourDayRuler: '',
      };
      const result = buildRecommendationKeys(input);

      expect(result).toBeDefined();
    });
  });

  describe('Integration - Complex Scenarios', () => {
    it('should handle maximum complexity with all features enabled', () => {
      const input: RecommendationBuilderInput = {
        ganzhi: { stem: '己', branch: '午' },
        dayMasterStem: '甲',
        dayBranch: '子',
        retrogradePlanets: ['mercury', 'venus', 'mars'],
        branchInteractions: [
          { branches: ['子', '丑'], type: '육합', impact: 'positive', score: 10 },
          { branches: ['子', '午'], type: '충', impact: 'negative', score: -15 },
        ],
        specialFlags: {
          hasCheoneulGwiin: true,
          hasSonEomneun: true,
          hasGeonrok: true,
          isSamjaeYear: true,
          hasYeokma: true,
          hasDohwa: true,
        },
        planetaryHourDayRuler: 'Jupiter',
        relations: {
          generates: '',
          generatedBy: '',
          controls: '',
          controlledBy: '',
        },
      };

      const result = buildRecommendationKeys(input);

      // Should have many recommendations
      expect(result.recommendationKeys.length).toBeGreaterThan(15);
      // Should have many warnings
      expect(result.warningKeys.length).toBeGreaterThan(10);

      // Verify specific keys
      expect(result.recommendationKeys).toContain('majorDecision');
      expect(result.recommendationKeys).toContain('stableWealth');
      expect(result.warningKeys).toContain('conflict');
      expect(result.warningKeys).toContain('mercuryRetrograde');
    });

    it('should handle conflicting signals (positive + negative)', () => {
      const input = {
        ...baseInput,
        dayBranch: '子',
        ganzhi: { stem: '甲', branch: '午' }, // 子-午 충
        specialFlags: { ...baseInput.specialFlags, hasCheoneulGwiin: true },
      };

      const result = buildRecommendationKeys(input);

      // Should have both recommendations and warnings
      expect(result.recommendationKeys).toContain('majorDecision');
      expect(result.warningKeys).toContain('conflict');
    });

    it('should handle minimal input (empty branches, no flags)', () => {
      const input: RecommendationBuilderInput = {
        ganzhi: { stem: '', branch: '' },
        dayMasterStem: '',
        dayBranch: '',
        retrogradePlanets: [],
        branchInteractions: [],
        specialFlags: {
          hasCheoneulGwiin: false,
          hasSonEomneun: false,
          hasGeonrok: false,
          isSamjaeYear: false,
          hasYeokma: false,
          hasDohwa: false,
        },
        planetaryHourDayRuler: '',
        relations: {
          generates: '',
          generatedBy: '',
          controls: '',
          controlledBy: '',
        },
      };

      const result = buildRecommendationKeys(input);

      expect(result.recommendationKeys).toEqual([]);
      expect(result.warningKeys).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should not mutate input object', () => {
      const originalInput = JSON.parse(JSON.stringify(baseInput));

      buildRecommendationKeys(baseInput);

      expect(baseInput).toEqual(originalInput);
    });

    it('should return new arrays each time (not references)', () => {
      const result1 = buildRecommendationKeys(baseInput);
      const result2 = buildRecommendationKeys(baseInput);

      expect(result1.recommendationKeys).not.toBe(result2.recommendationKeys);
      expect(result1.warningKeys).not.toBe(result2.warningKeys);
    });

    it('should handle duplicate keys gracefully (added multiple times)', () => {
      const interactions: BranchInteraction[] = [
        { branches: ['子', '丑'], type: '육합', impact: 'positive', score: 10 },
        { branches: ['子', '辰'], type: '육합', impact: 'positive', score: 10 },
      ];

      const input = { ...baseInput, branchInteractions: interactions };
      const result = buildRecommendationKeys(input);

      // May have duplicates - that's okay for this module
      expect(result.recommendationKeys.filter((k) => k === 'partnership').length).toBeGreaterThan(
        0
      );
    });

    it('should handle very large branchInteractions array', () => {
      const manyInteractions: BranchInteraction[] = Array.from({ length: 100 }, (_, i) => ({
        branches: ['子', '丑'],
        type: '육합',
        impact: 'positive',
        score: 10,
      }));

      const input = { ...baseInput, branchInteractions: manyInteractions };
      const result = buildRecommendationKeys(input);

      // Should complete without issues
      expect(result.recommendationKeys.length).toBeGreaterThan(0);
    });
  });
});
