/**
 * Event Timing Helpers Tests
 * 이벤트 타이밍 분석 헬퍼 함수 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateProgressionBonus,
  calculateSibsinStageScore,
  applyElementScoring,
  applySolarTermScoring,
  applyBranchInteractionScoring,
  applyDaeunScoring,
  calculateMonthlyEventScore,
  type MonthlyTimingInput,
} from '@/lib/prediction/utils/event-timing-helpers';
import type { EventType, LifePredictionInput } from '@/lib/prediction/life-prediction-types';
import type { PreciseTwelveStage } from '@/lib/prediction/advancedTimingEngine';

// Mock dependencies
vi.mock('@/lib/prediction/advancedTimingEngine', () => ({
  calculateYearlyGanji: vi.fn((year: number) => ({
    stem: '갑',
    branch: '자',
    element: '목',
  })),
  calculateMonthlyGanji: vi.fn((year: number, month: number) => ({
    stem: '을',
    branch: '축',
    element: '목',
  })),
  calculatePreciseTwelveStage: vi.fn(() => ({
    stage: '건록',
    score: 80,
    description: '건록 운성',
  })),
  calculateSibsin: vi.fn(() => '정재'),
  analyzeBranchInteractions: vi.fn(() => [
    { type: '육합', impact: 'positive', score: 10, description: '자축 육합' },
  ]),
}));

vi.mock('@/lib/prediction/precisionEngine', () => ({
  getSolarTermForDate: vi.fn((date: Date) => ({
    name: 'DongZhi',
    nameKo: '동지',
    element: '수',
    startDate: new Date(2024, 11, 21),
    endDate: new Date(2025, 0, 5),
  })),
  calculateSecondaryProgression: vi.fn((birthDate: Date, targetDate: Date) => ({
    moon: { phase: 'Full', sign: 'Cancer' },
    sun: { sign: 'Aries', house: 10 },
    venus: { sign: 'Libra', house: 7 },
  })),
  PrecisionEngine: class {
    analyze() {
      return {};
    }
  },
}));

vi.mock('@/lib/prediction/constants/scoring', () => ({
  EVENT_SCORING: {
    BUSINESS_FAVORABLE: 10,
    FAVORABLE_STAGE: 8,
    MARRIAGE_FAVORABLE_SIBSIN: 12,
    MARRIAGE_UNFAVORABLE_SIBSIN: 10,
    CAREER_FAVORABLE_SIBSIN: 10,
    CAREER_UNFAVORABLE_SIBSIN: 8,
    BUSINESS_UNFAVORABLE: 8,
    TRANSITION_FAVORABLE: 6,
  },
  SCORING_WEIGHTS: {
    SOLAR_TERM_MATCH: 5,
    BRANCH_INTERACTION: 0.5,
  },
}));

vi.mock('@/lib/prediction/life-prediction-constants', () => ({
  EVENT_FAVORABLE_CONDITIONS: {
    marriage: {
      favorableSibsin: ['정재', '정관'],
      avoidSibsin: ['상관', '겁재'],
      favorableStages: ['건록', '제왕'],
      avoidStages: ['사', '절'],
      favorableElements: ['화', '토'],
    },
    career: {
      favorableSibsin: ['정관', '편관', '식신'],
      avoidSibsin: ['겁재', '비견'],
      favorableStages: ['건록', '관대', '제왕'],
      avoidStages: ['사', '절', '병'],
      favorableElements: ['목', '화'],
    },
    investment: {
      favorableSibsin: ['편재', '식신'],
      avoidSibsin: ['겁재', '양인'],
      favorableStages: ['장생', '건록'],
      avoidStages: ['사', '절'],
      favorableElements: ['금', '토'],
    },
    relationship: {
      favorableSibsin: ['정재', '정관', '편재'],
      avoidSibsin: ['상관'],
      favorableStages: ['건록', '관대'],
      avoidStages: ['사'],
      favorableElements: ['화', '수'],
    },
    move: {
      favorableSibsin: ['편인', '식신'],
      avoidSibsin: ['상관'],
      favorableStages: ['장생', '목욕'],
      avoidStages: ['사', '절'],
      favorableElements: ['토', '목'],
    },
    study: {
      favorableSibsin: ['정인', '편인'],
      avoidSibsin: ['상관'],
      favorableStages: ['장생', '관대'],
      avoidStages: ['절'],
      favorableElements: ['수', '목'],
    },
    health: {
      favorableSibsin: ['정인', '식신'],
      avoidSibsin: ['상관', '편관'],
      favorableStages: ['건록', '제왕'],
      avoidStages: ['사', '절', '병'],
      favorableElements: ['수', '목'],
    },
  },
}));

describe('EventTimingHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateProgressionBonus', () => {
    it('should return bonus for Full Moon phase', async () => {
      const result = calculateProgressionBonus(
        'marriage',
        new Date(1990, 0, 15),
        new Date(2024, 5, 15)
      );

      // Mock returns Full Moon + Venus in Libra, reason will be the last one set
      expect(result.bonus).toBeGreaterThan(0);
      // Reason could be from moon phase or Venus position
      expect(result.reason.length).toBeGreaterThan(0);
    });

    it('should return bonus for marriage event with Venus in Libra', async () => {
      const result = calculateProgressionBonus(
        'marriage',
        new Date(1990, 0, 15),
        new Date(2024, 5, 15)
      );

      // Venus in Libra gives bonus for marriage/relationship
      expect(result.bonus).toBeGreaterThan(0);
    });

    it('should return bonus for career event with Sun in house 10', async () => {
      const result = calculateProgressionBonus(
        'career',
        new Date(1990, 0, 15),
        new Date(2024, 5, 15)
      );

      expect(result.bonus).toBeGreaterThan(0);
    });

    it('should handle relationship event same as marriage', async () => {
      const result = calculateProgressionBonus(
        'relationship',
        new Date(1990, 0, 15),
        new Date(2024, 5, 15)
      );

      expect(result).toHaveProperty('bonus');
      expect(result).toHaveProperty('reason');
    });

    it('should handle investment event', async () => {
      const result = calculateProgressionBonus(
        'investment',
        new Date(1990, 0, 15),
        new Date(2024, 5, 15)
      );

      // Investment doesn't have specific Venus/Sun house bonuses
      expect(result).toHaveProperty('bonus');
    });
  });

  describe('calculateSibsinStageScore', () => {
    const mockTwelveStage: PreciseTwelveStage = {
      stage: '건록',
      score: 80,
      description: '건록 운성',
    };

    it('should add score for favorable sibsin', () => {
      const result = calculateSibsinStageScore('marriage', '정재', mockTwelveStage);

      expect(result.score).toBeGreaterThan(50);
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.reasons.some(r => r.includes('정재'))).toBe(true);
    });

    it('should subtract score for avoid sibsin', () => {
      const unfavorableStage: PreciseTwelveStage = {
        stage: '사',
        score: 20,
        description: '사 운성',
      };
      const result = calculateSibsinStageScore('marriage', '상관', unfavorableStage);

      expect(result.avoidReasons.length).toBeGreaterThan(0);
      expect(result.avoidReasons.some(r => r.includes('상관'))).toBe(true);
    });

    it('should add score for favorable twelve stage', () => {
      const result = calculateSibsinStageScore('career', '비견', mockTwelveStage);

      expect(result.reasons.some(r => r.includes('건록'))).toBe(true);
    });

    it('should subtract score for avoid twelve stage', () => {
      const avoidStage: PreciseTwelveStage = {
        stage: '절',
        score: 10,
        description: '절 운성',
      };
      const result = calculateSibsinStageScore('career', '정관', avoidStage);

      expect(result.avoidReasons.some(r => r.includes('절'))).toBe(true);
    });

    it('should return base score of 50 with neutral conditions', () => {
      const neutralStage: PreciseTwelveStage = {
        stage: '양',
        score: 50,
        description: '양 운성',
      };
      const result = calculateSibsinStageScore('investment', '정인', neutralStage);

      // neutral sibsin and stage for investment
      expect(result.score).toBe(50);
    });

    it('should handle all event types', () => {
      const eventTypes: EventType[] = ['marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship'];

      for (const eventType of eventTypes) {
        const result = calculateSibsinStageScore(eventType, '정재', mockTwelveStage);
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('reasons');
        expect(result).toHaveProperty('avoidReasons');
      }
    });
  });

  describe('applyElementScoring', () => {
    const mockInput: LifePredictionInput = {
      birthYear: 1990,
      dayStem: '갑',
      dayBranch: '자',
      monthBranch: '인',
      yongsin: ['수', '목'],
      kisin: ['화'],
    };

    it('should add score for favorable element', () => {
      const reasons: string[] = [];
      const avoidReasons: string[] = [];

      const result = applyElementScoring(
        'career',
        mockInput,
        '목',
        50,
        reasons,
        avoidReasons
      );

      expect(result).toBeGreaterThan(50);
      expect(reasons.some(r => r.includes('목'))).toBe(true);
    });

    it('should add score for yongsin month', () => {
      const reasons: string[] = [];
      const avoidReasons: string[] = [];

      const result = applyElementScoring(
        'marriage',
        mockInput,
        '수',
        50,
        reasons,
        avoidReasons
      );

      expect(result).toBeGreaterThan(50);
      expect(reasons.some(r => r.includes('용신'))).toBe(true);
    });

    it('should subtract score for kisin month', () => {
      const reasons: string[] = [];
      const avoidReasons: string[] = [];

      const result = applyElementScoring(
        'career',
        mockInput,
        '화',
        50,
        reasons,
        avoidReasons
      );

      expect(avoidReasons.some(r => r.includes('기신'))).toBe(true);
    });

    it('should handle missing yongsin/kisin gracefully', () => {
      const inputWithoutYongsin: LifePredictionInput = {
        birthYear: 1990,
        dayStem: '갑',
        dayBranch: '자',
        monthBranch: '인',
      };
      const reasons: string[] = [];
      const avoidReasons: string[] = [];

      const result = applyElementScoring(
        'career',
        inputWithoutYongsin,
        '토',
        50,
        reasons,
        avoidReasons
      );

      expect(typeof result).toBe('number');
    });
  });

  describe('applySolarTermScoring', () => {
    const mockInput: LifePredictionInput = {
      birthYear: 1990,
      dayStem: '갑',
      dayBranch: '자',
      monthBranch: '인',
      yongsin: ['수'],
    };

    const mockSolarTerm = {
      name: 'DongZhi',
      nameKo: '동지',
      element: '수' as const,
      startDate: new Date(2024, 11, 21),
      endDate: new Date(2025, 0, 5),
    };

    it('should return original score when solarTerm is null', () => {
      const reasons: string[] = [];
      const result = applySolarTermScoring('career', mockInput, null, 50, reasons);

      expect(result).toBe(50);
      expect(reasons.length).toBe(0);
    });

    it('should add score when solar term element matches favorable conditions', () => {
      const reasons: string[] = [];
      // study event favors 수 element, and mockSolarTerm has 수
      const result = applySolarTermScoring('study', mockInput, mockSolarTerm, 50, reasons);

      expect(result).toBeGreaterThan(50);
      expect(reasons.some(r => r.includes('동지'))).toBe(true);
    });

    it('should add score when solar term element matches yongsin', () => {
      const reasons: string[] = [];
      const result = applySolarTermScoring('career', mockInput, mockSolarTerm, 50, reasons);

      expect(result).toBeGreaterThan(50);
      expect(reasons.some(r => r.includes('용신'))).toBe(true);
    });

    it('should not add duplicate bonus for same element', () => {
      const inputWithStudyYongsin: LifePredictionInput = {
        ...mockInput,
        yongsin: ['수'],
      };
      const reasons: string[] = [];

      const result = applySolarTermScoring('study', inputWithStudyYongsin, mockSolarTerm, 50, reasons);

      // Should add both favorable element bonus and yongsin bonus
      expect(reasons.length).toBe(2);
    });
  });

  describe('applyBranchInteractionScoring', () => {
    const mockInput: LifePredictionInput = {
      birthYear: 1990,
      dayStem: '갑',
      dayBranch: '자',
      monthBranch: '축',
    };

    it('should add score for positive branch interactions', () => {
      const reasons: string[] = [];
      const avoidReasons: string[] = [];

      const result = applyBranchInteractionScoring(
        mockInput,
        '자',
        '축',
        50,
        reasons,
        avoidReasons
      );

      expect(result).toBeGreaterThan(50);
      expect(reasons.length).toBeGreaterThan(0);
    });

    it('should add reason for 육합 interaction', () => {
      const reasons: string[] = [];
      const avoidReasons: string[] = [];

      applyBranchInteractionScoring(
        mockInput,
        '자',
        '축',
        50,
        reasons,
        avoidReasons
      );

      expect(reasons.some(r => r.includes('육합'))).toBe(true);
    });

    it('should handle negative interactions and add to avoidReasons', async () => {
      const { analyzeBranchInteractions } = await import('@/lib/prediction/advancedTimingEngine');
      (analyzeBranchInteractions as ReturnType<typeof vi.fn>).mockReturnValueOnce([
        { type: '충', impact: 'negative', score: -10, description: '자오 충' },
      ]);

      const reasons: string[] = [];
      const avoidReasons: string[] = [];

      const result = applyBranchInteractionScoring(
        mockInput,
        '오',
        '자',
        50,
        reasons,
        avoidReasons
      );

      expect(result).toBeLessThan(50);
      expect(avoidReasons.some(r => r.includes('충'))).toBe(true);
    });

    it('should handle 삼합 interaction', async () => {
      const { analyzeBranchInteractions } = await import('@/lib/prediction/advancedTimingEngine');
      (analyzeBranchInteractions as ReturnType<typeof vi.fn>).mockReturnValueOnce([
        { type: '삼합', impact: 'positive', score: 15, description: '인오술 삼합' },
      ]);

      const reasons: string[] = [];
      const avoidReasons: string[] = [];

      applyBranchInteractionScoring(
        mockInput,
        '인',
        '오',
        50,
        reasons,
        avoidReasons
      );

      expect(reasons.some(r => r.includes('삼합'))).toBe(true);
    });
  });

  describe('applyDaeunScoring', () => {
    const mockInputWithDaeun: LifePredictionInput = {
      birthYear: 1990,
      dayStem: '갑',
      dayBranch: '자',
      monthBranch: '인',
      daeunList: [
        { startAge: 30, endAge: 39, stem: '병', branch: '인', element: '화' },
        { startAge: 40, endAge: 49, stem: '정', branch: '묘', element: '화' },
      ],
    };

    const mockSolarTerm = {
      name: 'LiXia',
      nameKo: '입하',
      element: '화' as const,
      startDate: new Date(2024, 4, 5),
      endDate: new Date(2024, 4, 20),
    };

    it('should add score when daeun stage is favorable', () => {
      const reasons: string[] = [];
      const result = applyDaeunScoring(
        'career',
        mockInputWithDaeun,
        35,
        null,
        50,
        reasons
      );

      expect(result).toBeGreaterThan(50);
      expect(reasons.some(r => r.includes('대운'))).toBe(true);
    });

    it('should add bonus for daeun-solar term synchronization', () => {
      const reasons: string[] = [];
      const result = applyDaeunScoring(
        'career',
        mockInputWithDaeun,
        35,
        mockSolarTerm,
        50,
        reasons
      );

      // Daeun element is 화 and solar term element is also 화
      expect(reasons.some(r => r.includes('동기화'))).toBe(true);
    });

    it('should not apply daeun scoring when age is out of range', () => {
      const reasons: string[] = [];
      const result = applyDaeunScoring(
        'career',
        mockInputWithDaeun,
        25, // out of daeun range
        null,
        50,
        reasons
      );

      // Score should remain unchanged
      expect(result).toBe(50);
    });

    it('should handle input without daeunList', () => {
      const inputWithoutDaeun: LifePredictionInput = {
        birthYear: 1990,
        dayStem: '갑',
        dayBranch: '자',
        monthBranch: '인',
      };
      const reasons: string[] = [];

      const result = applyDaeunScoring(
        'career',
        inputWithoutDaeun,
        35,
        null,
        50,
        reasons
      );

      expect(result).toBe(50);
    });
  });

  describe('calculateMonthlyEventScore', () => {
    const mockInput: LifePredictionInput = {
      birthYear: 1990,
      birthMonth: 5,
      birthDay: 15,
      dayStem: '갑',
      dayBranch: '자',
      monthBranch: '인',
      yongsin: ['수'],
      daeunList: [
        { startAge: 30, endAge: 39, stem: '병', branch: '인', element: '화' },
      ],
    };

    it('should return complete MonthlyTimingResult structure', () => {
      const params: MonthlyTimingInput = {
        input: mockInput,
        eventType: 'marriage',
        year: 2024,
        month: 6,
        age: 34,
      };

      const result = calculateMonthlyEventScore(params);

      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('reasons');
      expect(result).toHaveProperty('avoidReasons');
      expect(result).toHaveProperty('monthStart');
      expect(result).toHaveProperty('monthEnd');
      expect(result).toHaveProperty('midMonth');
    });

    it('should calculate correct date range', () => {
      const params: MonthlyTimingInput = {
        input: mockInput,
        eventType: 'career',
        year: 2024,
        month: 3,
        age: 34,
      };

      const result = calculateMonthlyEventScore(params);

      expect(result.monthStart.getFullYear()).toBe(2024);
      expect(result.monthStart.getMonth()).toBe(2); // March (0-indexed)
      expect(result.monthStart.getDate()).toBe(1);

      expect(result.midMonth.getDate()).toBe(15);
    });

    it('should include progression analysis when useProgressions is true', () => {
      const params: MonthlyTimingInput = {
        input: mockInput,
        eventType: 'marriage',
        year: 2024,
        month: 6,
        age: 34,
        useProgressions: true,
      };

      const result = calculateMonthlyEventScore(params);

      // Progression adds reasons for moon phase or planet positions
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should skip progression analysis when useProgressions is false', () => {
      const params: MonthlyTimingInput = {
        input: mockInput,
        eventType: 'marriage',
        year: 2024,
        month: 6,
        age: 34,
        useProgressions: false,
      };

      const result = calculateMonthlyEventScore(params);

      expect(result.reasons.every(r => !r.includes('진행'))).toBe(true);
    });

    it('should handle all event types', () => {
      const eventTypes: EventType[] = ['marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship'];

      for (const eventType of eventTypes) {
        const params: MonthlyTimingInput = {
          input: mockInput,
          eventType,
          year: 2024,
          month: 6,
          age: 34,
        };

        const result = calculateMonthlyEventScore(params);
        expect(typeof result.score).toBe('number');
        expect(Array.isArray(result.reasons)).toBe(true);
      }
    });

    it('should aggregate scores from all scoring functions', () => {
      const params: MonthlyTimingInput = {
        input: mockInput,
        eventType: 'career',
        year: 2024,
        month: 6,
        age: 34,
        useProgressions: true,
        useSolarTerms: true,
      };

      const result = calculateMonthlyEventScore(params);

      // Score should be modified from base 50 by various factors
      expect(result.score).not.toBe(50);
    });

    it('should handle missing optional birth fields', () => {
      const inputMinimal: LifePredictionInput = {
        birthYear: 1990,
        dayStem: '갑',
        dayBranch: '자',
        monthBranch: '인',
      };

      const params: MonthlyTimingInput = {
        input: inputMinimal,
        eventType: 'career',
        year: 2024,
        month: 6,
        age: 34,
      };

      // Should not throw
      const result = calculateMonthlyEventScore(params);
      expect(result).toHaveProperty('score');
    });

    it('should skip solar term analysis when useSolarTerms is false', async () => {
      const { getSolarTermForDate } = await import('@/lib/prediction/precisionEngine');

      const params: MonthlyTimingInput = {
        input: mockInput,
        eventType: 'career',
        year: 2024,
        month: 6,
        age: 34,
        useSolarTerms: false,
      };

      vi.clearAllMocks();
      calculateMonthlyEventScore(params);

      expect(getSolarTermForDate).not.toHaveBeenCalled();
    });

    it('should include branch interaction analysis', () => {
      const params: MonthlyTimingInput = {
        input: mockInput,
        eventType: 'marriage',
        year: 2024,
        month: 6,
        age: 34,
      };

      const result = calculateMonthlyEventScore(params);

      // Mock returns 육합 interaction
      expect(result.reasons.some(r => r.includes('육합'))).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    const comprehensiveInput: LifePredictionInput = {
      birthYear: 1990,
      birthMonth: 1,
      birthDay: 15,
      dayStem: '갑',
      dayBranch: '자',
      monthBranch: '인',
      yongsin: ['수', '목'],
      kisin: ['화', '토'],
      daeunList: [
        { startAge: 34, endAge: 43, stem: '임', branch: '자', element: '수' },
      ],
    };

    it('should handle favorable scenario with high score', () => {
      const params: MonthlyTimingInput = {
        input: comprehensiveInput,
        eventType: 'career',
        year: 2024,
        month: 6,
        age: 34,
      };

      const result = calculateMonthlyEventScore(params);

      // With yongsin month and favorable interactions, score should be positive
      expect(result.score).toBeGreaterThan(50);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should handle unfavorable scenario with lower score', async () => {
      const { analyzeBranchInteractions, calculateSibsin } = await import('@/lib/prediction/advancedTimingEngine');

      (analyzeBranchInteractions as ReturnType<typeof vi.fn>).mockReturnValueOnce([
        { type: '충', impact: 'negative', score: -15, description: '자오 충' },
      ]);
      (calculateSibsin as ReturnType<typeof vi.fn>).mockReturnValueOnce('상관');

      const unfavorableInput: LifePredictionInput = {
        ...comprehensiveInput,
        yongsin: ['금'],
        kisin: ['목', '화'],
      };

      const params: MonthlyTimingInput = {
        input: unfavorableInput,
        eventType: 'marriage',
        year: 2024,
        month: 6,
        age: 34,
      };

      const result = calculateMonthlyEventScore(params);

      expect(result.avoidReasons.length).toBeGreaterThan(0);
    });
  });
});
