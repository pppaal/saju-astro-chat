/**
 * Tests for src/lib/destiny-map/calendar/analyzers/multilayer-analyzer.ts
 * 다층 레이어 분석 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prediction/advancedTimingEngine', () => ({
  analyzeMultiLayer: vi.fn(() => ({
    interactions: [
      { scoreModifier: 10 },
      { scoreModifier: -5 },
    ],
    branchInteractions: [
      { type: 'samhap', score: 8, description: '삼합' },
    ],
  })),
  calculatePreciseTwelveStage: vi.fn(() => ({
    stage: '건록',
    energy: 'peak',
  })),
  calculateYearlyGanji: vi.fn(() => ({
    stem: '甲',
    branch: '辰',
  })),
  calculateMonthlyGanji: vi.fn(() => ({
    stem: '丙',
    branch: '午',
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { analyzeMultiLayer } from '@/lib/destiny-map/calendar/analyzers/multilayer-analyzer';
import {
  analyzeMultiLayer as analyzeMultiLayerImport,
  calculatePreciseTwelveStage,
} from '@/lib/prediction/advancedTimingEngine';

describe('multilayer-analyzer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('analyzeMultiLayer', () => {
    const baseInput = {
      dayMasterStem: '甲',
      dayBranch: '子',
      sajuProfile: {
        daeunCycles: [
          { age: 5, heavenlyStem: '乙', earthlyBranch: '丑' },
          { age: 15, heavenlyStem: '丙', earthlyBranch: '寅' },
        ],
        birthYear: 1990,
      } as any,
      year: 2024,
      month: 6,
    };

    it('should return valid multi-layer analysis result', () => {
      const result = analyzeMultiLayer(baseInput);

      expect(result).toHaveProperty('advancedMultiLayerScore');
      expect(result).toHaveProperty('advancedBranchInteractions');
      expect(typeof result.advancedMultiLayerScore).toBe('number');
      expect(Array.isArray(result.advancedBranchInteractions)).toBe(true);
    });

    it('should calculate score from interactions and branch interactions', () => {
      const result = analyzeMultiLayer(baseInput);

      // interactions: (10 * 0.3) + (-5 * 0.3) = 1.5
      // branchInteractions: 8 * 0.25 = 2
      // peak energy bonus: +8
      // total: 1.5 + 2 + 8 = 11.5
      expect(result.advancedMultiLayerScore).toBe(11.5);
    });

    it('should return branch interactions', () => {
      const result = analyzeMultiLayer(baseInput);

      expect(result.advancedBranchInteractions).toHaveLength(1);
      expect(result.advancedBranchInteractions[0].type).toBe('samhap');
    });

    it('should return zero score when dayMasterStem is empty', () => {
      const result = analyzeMultiLayer({
        ...baseInput,
        dayMasterStem: '',
      });

      expect(result.advancedMultiLayerScore).toBe(0);
      expect(result.advancedBranchInteractions).toEqual([]);
    });

    it('should return zero score when dayBranch is empty', () => {
      const result = analyzeMultiLayer({
        ...baseInput,
        dayBranch: '',
      });

      expect(result.advancedMultiLayerScore).toBe(0);
      expect(result.advancedBranchInteractions).toEqual([]);
    });

    it('should pass daeun info when available', () => {
      analyzeMultiLayer(baseInput);

      // currentAge = 2024 - 1990 = 34, matches second daeun (age 15, last cycle)
      expect(analyzeMultiLayerImport).toHaveBeenCalledWith(
        expect.objectContaining({
          dayStem: '甲',
          dayBranch: '子',
          daeun: { stem: '丙', branch: '寅' },
        })
      );
    });

    it('should work without daeun cycles', () => {
      const result = analyzeMultiLayer({
        ...baseInput,
        sajuProfile: { birthYear: 1990 } as any,
      });

      expect(analyzeMultiLayerImport).toHaveBeenCalledWith(
        expect.objectContaining({
          daeun: undefined,
        })
      );
      expect(typeof result.advancedMultiLayerScore).toBe('number');
    });

    it('should apply rising energy bonus', () => {
      (calculatePreciseTwelveStage as any).mockReturnValueOnce({
        stage: '관대',
        energy: 'rising',
      });

      const result = analyzeMultiLayer(baseInput);

      // interactions: 1.5, branch: 2, rising bonus: +4 = 7.5
      expect(result.advancedMultiLayerScore).toBe(7.5);
    });

    it('should apply declining energy penalty', () => {
      (calculatePreciseTwelveStage as any).mockReturnValueOnce({
        stage: '쇠',
        energy: 'declining',
      });

      const result = analyzeMultiLayer(baseInput);

      // interactions: 1.5, branch: 2, declining penalty: -2 = 1.5
      expect(result.advancedMultiLayerScore).toBe(1.5);
    });

    it('should apply dormant energy penalty', () => {
      (calculatePreciseTwelveStage as any).mockReturnValueOnce({
        stage: '절',
        energy: 'dormant',
      });

      const result = analyzeMultiLayer(baseInput);

      // interactions: 1.5, branch: 2, dormant penalty: -5 = -1.5
      expect(result.advancedMultiLayerScore).toBe(-1.5);
    });

    it('should not apply bonus for neutral energy', () => {
      (calculatePreciseTwelveStage as any).mockReturnValueOnce({
        stage: '양',
        energy: 'neutral',
      });

      const result = analyzeMultiLayer(baseInput);

      // interactions: 1.5, branch: 2, no bonus = 3.5
      expect(result.advancedMultiLayerScore).toBe(3.5);
    });

    it('should handle errors gracefully and return default values', () => {
      (analyzeMultiLayerImport as any).mockImplementationOnce(() => {
        throw new Error('Analysis failed');
      });

      const result = analyzeMultiLayer(baseInput);

      expect(result.advancedMultiLayerScore).toBe(0);
      expect(result.advancedBranchInteractions).toEqual([]);
    });

    it('should find correct daeun for current age', () => {
      // currentAge = 2024 - 1990 = 34, should match age 15 (second daeun)
      analyzeMultiLayer(baseInput);

      expect(analyzeMultiLayerImport).toHaveBeenCalledWith(
        expect.objectContaining({
          daeun: { stem: '丙', branch: '寅' },
        })
      );
    });
  });
});
