/**
 * Analysis Helpers Tests
 */
import { describe, it, expect } from 'vitest';
import {
  convertBranchInteractions,
  extractBranchInteractionFactors,
} from '@/lib/destiny-map/calendar/analysis-helpers';
import type { BranchInteraction } from '@/lib/prediction/advancedTimingEngine';

describe('analysis-helpers', () => {
  describe('convertBranchInteractions', () => {
    it('should convert positive branch interaction', () => {
      const interactions: BranchInteraction[] = [
        {
          type: '육합',
          branches: ['子', '丑'],
          impact: 'positive',
          result: '토',
        },
      ];

      const result = convertBranchInteractions(interactions);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: '육합',
        impact: 'positive',
        element: '토',
      });
    });

    it('should convert negative branch interaction', () => {
      const interactions: BranchInteraction[] = [
        {
          type: '충',
          branches: ['子', '午'],
          impact: 'negative',
        },
      ];

      const result = convertBranchInteractions(interactions);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('충');
      expect(result[0].impact).toBe('negative');
    });

    it('should convert transformative to neutral', () => {
      const interactions: BranchInteraction[] = [
        {
          type: '삼합',
          branches: ['申', '子', '辰'],
          impact: 'transformative',
          result: '수',
        },
      ];

      const result = convertBranchInteractions(interactions);

      expect(result[0].impact).toBe('neutral');
    });

    it('should handle multiple interactions', () => {
      const interactions: BranchInteraction[] = [
        { type: '육합', branches: ['子', '丑'], impact: 'positive', result: '토' },
        { type: '충', branches: ['子', '午'], impact: 'negative' },
        { type: '삼합', branches: ['申', '子', '辰'], impact: 'transformative', result: '수' },
      ];

      const result = convertBranchInteractions(interactions);

      expect(result).toHaveLength(3);
    });

    it('should handle empty array', () => {
      const result = convertBranchInteractions([]);
      expect(result).toHaveLength(0);
    });

    it('should set element to undefined when result is missing', () => {
      const interactions: BranchInteraction[] = [
        { type: '충', branches: ['子', '午'], impact: 'negative' },
      ];

      const result = convertBranchInteractions(interactions);

      expect(result[0].element).toBeUndefined();
    });
  });

  describe('extractBranchInteractionFactors', () => {
    it('should extract factors from positive 육합 interaction', () => {
      const interactions: BranchInteraction[] = [
        { type: '육합', branches: ['子', '丑'], impact: 'positive', result: '토' },
      ];

      const result = extractBranchInteractionFactors(interactions);

      expect(result.sajuFactorKeys).toContain('advanced_육합');
      expect(result.recommendationKeys).toContain('partnership');
      expect(result.recommendationKeys).toContain('harmony');
    });

    it('should extract factors from positive 삼합 interaction', () => {
      const interactions: BranchInteraction[] = [
        { type: '삼합', branches: ['申', '子', '辰'], impact: 'positive', result: '수' },
      ];

      const result = extractBranchInteractionFactors(interactions);

      expect(result.sajuFactorKeys).toContain('advanced_삼합');
      expect(result.recommendationKeys).toContain('collaboration');
      expect(result.recommendationKeys).toContain('synergy');
    });

    it('should extract factors from positive 방합 interaction', () => {
      const interactions: BranchInteraction[] = [
        { type: '방합', branches: ['寅', '卯', '辰'], impact: 'positive' },
      ];

      const result = extractBranchInteractionFactors(interactions);

      expect(result.sajuFactorKeys).toContain('advanced_방합');
      expect(result.recommendationKeys).toContain('expansion');
      expect(result.recommendationKeys).toContain('growth');
    });

    it('should extract factors from negative 충 interaction', () => {
      const interactions: BranchInteraction[] = [
        { type: '충', branches: ['子', '午'], impact: 'negative' },
      ];

      const result = extractBranchInteractionFactors(interactions);

      expect(result.sajuFactorKeys).toContain('advanced_충');
      expect(result.warningKeys).toContain('conflict');
      expect(result.warningKeys).toContain('change');
    });

    it('should extract factors from negative 형 interaction', () => {
      const interactions: BranchInteraction[] = [
        { type: '형', branches: ['寅', '巳'], impact: 'negative' },
      ];

      const result = extractBranchInteractionFactors(interactions);

      expect(result.sajuFactorKeys).toContain('advanced_형');
      expect(result.warningKeys).toContain('tension');
      expect(result.warningKeys).toContain('challenge');
    });

    it('should handle neutral interactions without adding keys', () => {
      const interactions: BranchInteraction[] = [
        { type: '합', branches: ['子', '丑'], impact: 'neutral' },
      ];

      const result = extractBranchInteractionFactors(interactions);

      expect(result.sajuFactorKeys).toHaveLength(0);
      expect(result.recommendationKeys).toHaveLength(0);
      expect(result.warningKeys).toHaveLength(0);
    });

    it('should handle multiple interactions', () => {
      const interactions: BranchInteraction[] = [
        { type: '육합', branches: ['子', '丑'], impact: 'positive', result: '토' },
        { type: '충', branches: ['子', '午'], impact: 'negative' },
      ];

      const result = extractBranchInteractionFactors(interactions);

      expect(result.sajuFactorKeys).toContain('advanced_육합');
      expect(result.sajuFactorKeys).toContain('advanced_충');
      expect(result.recommendationKeys).toContain('partnership');
      expect(result.warningKeys).toContain('conflict');
    });

    it('should handle empty array', () => {
      const result = extractBranchInteractionFactors([]);

      expect(result.sajuFactorKeys).toHaveLength(0);
      expect(result.recommendationKeys).toHaveLength(0);
      expect(result.warningKeys).toHaveLength(0);
    });

    it('should return unique result structure', () => {
      const interactions: BranchInteraction[] = [
        { type: '육합', branches: ['子', '丑'], impact: 'positive' },
      ];

      const result = extractBranchInteractionFactors(interactions);

      expect(result).toHaveProperty('sajuFactorKeys');
      expect(result).toHaveProperty('recommendationKeys');
      expect(result).toHaveProperty('warningKeys');
      expect(Array.isArray(result.sajuFactorKeys)).toBe(true);
      expect(Array.isArray(result.recommendationKeys)).toBe(true);
      expect(Array.isArray(result.warningKeys)).toBe(true);
    });
  });
});
