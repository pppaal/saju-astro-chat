/**
 * Tests for src/lib/destiny-map/calendar/analyzers/advanced-predictor.ts
 * 고급 예측 분석 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prediction/ultraPrecisionEngine', () => ({
  calculateDailyPillar: vi.fn(() => ({
    stem: '甲',
    branch: '子',
  })),
  analyzeGongmang: vi.fn(() => ({
    'isToday空': false,
    emptyBranches: ['午', '未'],
    affectedAreas: ['재물', '건강'],
  })),
  analyzeShinsal: vi.fn(() => ({
    active: [
      { name: '천을귀인', type: 'lucky', affectedArea: '인연' },
    ],
  })),
  analyzeEnergyFlow: vi.fn(() => ({
    energyStrength: 'strong',
    dominantElement: '木',
    tonggeun: [{ stem: '甲', branch: '寅' }],
    tuechul: [{ stem: '甲', element: '木' }],
  })),
  generateHourlyAdvice: vi.fn(() => [
    { hour: 5, siGan: '묘시', quality: 'excellent' },
    { hour: 9, siGan: '사시', quality: 'good' },
    { hour: 13, siGan: '미시', quality: 'neutral' },
    { hour: 17, siGan: '유시', quality: 'caution' },
    { hour: 21, siGan: '해시', quality: 'good' },
  ]),
}));

vi.mock('@/lib/prediction/daeunTransitSync', () => ({
  analyzeDaeunTransitSync: vi.fn(() => ({
    majorTransitions: [],
  })),
  convertSajuDaeunToInfo: vi.fn(() => []),
}));

import { analyzeAdvancedPrediction } from '@/lib/destiny-map/calendar/analyzers/advanced-predictor';
import {
  calculateDailyPillar,
  analyzeGongmang,
  analyzeShinsal,
  analyzeEnergyFlow,
  generateHourlyAdvice,
} from '@/lib/prediction/ultraPrecisionEngine';
import {
  analyzeDaeunTransitSync,
} from '@/lib/prediction/daeunTransitSync';

describe('advanced-predictor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseInput = {
    date: new Date(2024, 5, 15),
    year: 2024,
    sajuProfile: {
      pillars: {
        year: { stem: '甲', branch: '子' },
        month: { stem: '丙', branch: '寅' },
        day: { stem: '戊', branch: '辰' },
        time: { stem: '庚', branch: '午' },
      },
      birthYear: 1990,
      daeunCycles: [
        { age: 5, heavenlyStem: '乙', earthlyBranch: '丑' },
      ],
    } as any,
    dayMasterStem: '甲',
    dayBranch: '子',
  };

  describe('analyzeAdvancedPrediction', () => {
    it('should return complete prediction result', () => {
      const result = analyzeAdvancedPrediction(baseInput);

      expect(result).toHaveProperty('dailyPillar');
      expect(result).toHaveProperty('gongmangStatus');
      expect(result).toHaveProperty('shinsalActive');
      expect(result).toHaveProperty('energyFlow');
      expect(result).toHaveProperty('bestHours');
      expect(result).toHaveProperty('transitSync');
    });

    it('should calculate daily pillar', () => {
      const result = analyzeAdvancedPrediction(baseInput);

      expect(calculateDailyPillar).toHaveBeenCalledWith(baseInput.date);
      expect(result.dailyPillar).toEqual({ stem: '甲', branch: '子' });
    });

    it('should analyze gongmang status', () => {
      const result = analyzeAdvancedPrediction(baseInput);

      expect(result.gongmangStatus.isEmpty).toBe(false);
      expect(result.gongmangStatus.emptyBranches).toEqual(['午', '未']);
      expect(result.gongmangStatus.affectedAreas).toEqual(['재물', '건강']);
    });

    it('should analyze shinsal', () => {
      const result = analyzeAdvancedPrediction(baseInput);

      expect(result.shinsalActive).toHaveLength(1);
      expect(result.shinsalActive[0].name).toBe('천을귀인');
      expect(result.shinsalActive[0].type).toBe('lucky');
    });

    it('should analyze energy flow', () => {
      const result = analyzeAdvancedPrediction(baseInput);

      expect(result.energyFlow.strength).toBe('strong');
      expect(result.energyFlow.dominantElement).toBe('木');
      expect(result.energyFlow.tonggeunCount).toBe(1);
      expect(result.energyFlow.tuechulCount).toBe(1);
    });

    it('should filter best hours (excellent and good only)', () => {
      const result = analyzeAdvancedPrediction(baseInput);

      // excellent: 5, good: 9, 21 (neutral and caution are filtered)
      expect(result.bestHours).toHaveLength(3);
      expect(result.bestHours.every(h =>
        h.quality === 'excellent' || h.quality === 'good'
      )).toBe(true);
    });

    it('should limit best hours to 4', () => {
      (generateHourlyAdvice as any).mockReturnValueOnce([
        { hour: 1, siGan: '축시', quality: 'excellent' },
        { hour: 3, siGan: '인시', quality: 'excellent' },
        { hour: 5, siGan: '묘시', quality: 'excellent' },
        { hour: 7, siGan: '진시', quality: 'good' },
        { hour: 9, siGan: '사시', quality: 'good' },
      ]);

      const result = analyzeAdvancedPrediction(baseInput);

      expect(result.bestHours).toHaveLength(4);
    });

    it('should default to non-major transit year', () => {
      const result = analyzeAdvancedPrediction(baseInput);

      expect(result.transitSync.isMajorTransitYear).toBe(false);
    });

    it('should detect major transit year', () => {
      (analyzeDaeunTransitSync as any).mockReturnValueOnce({
        majorTransitions: [
          {
            year: 2024,
            transits: [{ type: '대운 전환' }],
            synergyType: 'amplify',
            synergyScore: 85,
          },
        ],
      });

      const result = analyzeAdvancedPrediction(baseInput);

      expect(result.transitSync.isMajorTransitYear).toBe(true);
      expect(result.transitSync.transitType).toBe('대운 전환');
      expect(result.transitSync.synergyType).toBe('amplify');
      expect(result.transitSync.synergyScore).toBe(85);
    });

    it('should use dayMasterStem when provided', () => {
      analyzeAdvancedPrediction(baseInput);

      expect(analyzeGongmang).toHaveBeenCalledWith('甲', '子', '子');
    });

    it('should use all pillar stems for energy analysis', () => {
      analyzeAdvancedPrediction(baseInput);

      expect(analyzeEnergyFlow).toHaveBeenCalledWith(
        '甲',
        ['甲', '丙', '戊', '庚'],
        ['子', '寅', '辰', '午']
      );
    });

    it('should handle profile without pillars', () => {
      const input = {
        ...baseInput,
        sajuProfile: {
          birthYear: 1990,
        } as any,
      };

      const result = analyzeAdvancedPrediction(input);

      // Should fall back to dayMasterStem and dailyPillar
      expect(analyzeEnergyFlow).toHaveBeenCalledWith(
        '甲',
        ['甲'],
        ['子']
      );
      expect(result.energyFlow).toBeDefined();
    });

    it('should skip transit sync without daeun cycles', () => {
      const input = {
        ...baseInput,
        sajuProfile: {
          ...baseInput.sajuProfile,
          daeunCycles: undefined,
        } as any,
      };

      const result = analyzeAdvancedPrediction(input);

      expect(result.transitSync.isMajorTransitYear).toBe(false);
      expect(analyzeDaeunTransitSync).not.toHaveBeenCalled();
    });

    it('should skip transit sync without birthYear', () => {
      const input = {
        ...baseInput,
        sajuProfile: {
          ...baseInput.sajuProfile,
          birthYear: undefined,
        } as any,
      };

      const result = analyzeAdvancedPrediction(input);

      expect(result.transitSync.isMajorTransitYear).toBe(false);
    });

    it('should handle major transition with empty transits', () => {
      (analyzeDaeunTransitSync as any).mockReturnValueOnce({
        majorTransitions: [
          {
            year: 2024,
            transits: [],
            synergyType: 'neutral',
            synergyScore: 50,
          },
        ],
      });

      const result = analyzeAdvancedPrediction(baseInput);

      expect(result.transitSync.isMajorTransitYear).toBe(true);
      expect(result.transitSync.transitType).toBe('daeun_transition');
    });
  });
});
