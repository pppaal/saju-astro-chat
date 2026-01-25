/**
 * Comprehensive Prediction Tests
 * 종합 예측 생성 및 프롬프트 컨텍스트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateComprehensivePrediction,
  generateLifePredictionPromptContext,
  generateEventTimingPromptContext,
  generatePastAnalysisPromptContext,
} from '@/lib/prediction/life-prediction/comprehensive';
import type {
  LifePredictionInput,
  ComprehensivePrediction,
  EventTimingResult,
  PastRetrospective,
  EventType,
} from '@/lib/prediction/life-prediction/types';

// Mock dependencies
vi.mock('@/lib/prediction/life-prediction/multi-year', () => ({
  analyzeMultiYearTrend: vi.fn(() => ({
    startYear: 2023,
    endYear: 2033,
    overallTrend: 'ascending',
    yearlyScores: [
      {
        year: 2024,
        age: 34,
        score: 75,
        grade: 'A',
        sibsin: '정관',
        twelveStage: { stage: '건록' },
        themes: ['성장', '발전'],
        opportunities: ['새로운 시작', '도전'],
        challenges: ['과로 주의'],
      },
      {
        year: 2025,
        age: 35,
        score: 82,
        grade: 'S',
        sibsin: '정인',
        twelveStage: { stage: '제왕' },
        themes: ['최고조', '성공'],
        opportunities: ['성취', '인정'],
        challenges: [],
      },
    ],
    peakYears: [2025, 2028],
    daeunTransitions: [
      {
        year: 2026,
        age: 36,
        description: '대운 전환기',
        impact: 'positive transition',
      },
    ],
    summary: '전반적으로 상승하는 운세입니다.',
  })),
}));

vi.mock('@/lib/prediction/daeunTransitSync', () => ({
  analyzeDaeunTransitSync: vi.fn(() => ({
    majorTransitions: [
      {
        year: 2025,
        age: 35,
        synergyType: 'amplify',
        synergyScore: 85,
        themes: ['성공', '발전'],
        opportunities: ['큰 성과'],
        challenges: [],
      },
    ],
  })),
}));

describe('ComprehensivePrediction', () => {
  const mockInput: LifePredictionInput = {
    birthYear: 1990,
    birthMonth: 5,
    birthDay: 15,
    birthHour: 10,
    dayMasterElement: 'wood',
    dayMasterStem: '甲',
    dayBranch: '寅',
    yongsin: ['water'],
    kisin: ['metal'],
    daeunList: [
      { age: 4, stem: '丙', branch: '寅' },
      { age: 14, stem: '丁', branch: '卯' },
      { age: 24, stem: '戊', branch: '辰' },
      { age: 34, stem: '己', branch: '巳' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateComprehensivePrediction', () => {
    it('should generate comprehensive prediction with all required fields', () => {
      const result = generateComprehensivePrediction(mockInput);

      expect(result).toHaveProperty('input');
      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('multiYearTrend');
      expect(result).toHaveProperty('upcomingHighlights');
      expect(result).toHaveProperty('confidence');
    });

    it('should include input in result', () => {
      const result = generateComprehensivePrediction(mockInput);
      expect(result.input).toEqual(mockInput);
    });

    it('should set generatedAt to current date', () => {
      const before = new Date();
      const result = generateComprehensivePrediction(mockInput);
      const after = new Date();

      expect(result.generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.generatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should generate upcoming highlights', () => {
      const result = generateComprehensivePrediction(mockInput);
      expect(Array.isArray(result.upcomingHighlights)).toBe(true);
    });

    it('should limit highlights to 10 items', () => {
      const result = generateComprehensivePrediction(mockInput);
      expect(result.upcomingHighlights.length).toBeLessThanOrEqual(10);
    });

    it('should calculate confidence based on input completeness', () => {
      const result = generateComprehensivePrediction(mockInput);
      // With daeunList (+15), yongsin (+10), birthHour (+10) = 60 + 35 = 95
      expect(result.confidence).toBeGreaterThan(60);
      expect(result.confidence).toBeLessThanOrEqual(95);
    });

    it('should have lower confidence without optional data', () => {
      const minimalInput: LifePredictionInput = {
        birthYear: 1990,
        birthMonth: 5,
        birthDay: 15,
        dayMasterElement: 'wood',
        dayMasterStem: '甲',
        dayBranch: '寅',
      };
      const result = generateComprehensivePrediction(minimalInput);
      expect(result.confidence).toBe(60);
    });

    it('should accept custom years range', () => {
      const result = generateComprehensivePrediction(mockInput, 5);
      expect(result).toHaveProperty('multiYearTrend');
    });

    it('should include lifeSync when daeunList provided', () => {
      const result = generateComprehensivePrediction(mockInput);
      expect(result.lifeSync).toBeDefined();
    });

    it('should not include lifeSync when no daeunList', () => {
      const inputWithoutDaeun = { ...mockInput, daeunList: undefined };
      const result = generateComprehensivePrediction(inputWithoutDaeun);
      expect(result.lifeSync).toBeUndefined();
    });
  });

  describe('generateLifePredictionPromptContext', () => {
    let mockPrediction: ComprehensivePrediction;

    beforeEach(() => {
      mockPrediction = {
        input: mockInput,
        generatedAt: new Date(),
        multiYearTrend: {
          startYear: 2023,
          endYear: 2033,
          overallTrend: 'ascending',
          yearlyScores: [
            {
              year: 2024,
              age: 34,
              score: 75,
              grade: 'A',
              sibsin: '정관',
              twelveStage: { stage: '건록' },
              themes: ['성장'],
              opportunities: ['새로운 시작'],
              challenges: ['과로 주의'],
            },
          ],
          peakYears: [2025],
          daeunTransitions: [
            { year: 2026, age: 36, description: '대운 전환', impact: 'positive' },
          ],
          summary: '상승하는 운세입니다.',
        },
        upcomingHighlights: [
          {
            type: 'peak',
            date: new Date(2025, 0, 1),
            title: '2025년 최고 운세',
            description: '좋은 시기',
            score: 85,
            actionItems: ['도전하세요'],
          },
        ],
        confidence: 85,
      };
    });

    describe('Korean output', () => {
      it('should include Korean header', () => {
        const result = generateLifePredictionPromptContext(mockPrediction, 'ko');
        expect(result).toContain('종합 인생 예측 분석');
      });

      it('should include analysis period', () => {
        const result = generateLifePredictionPromptContext(mockPrediction, 'ko');
        expect(result).toContain('분석 기간: 2023~2033년');
      });

      it('should include overall trend', () => {
        const result = generateLifePredictionPromptContext(mockPrediction, 'ko');
        expect(result).toContain('전체 트렌드: ascending');
      });

      it('should include confidence', () => {
        const result = generateLifePredictionPromptContext(mockPrediction, 'ko');
        expect(result).toContain('신뢰도: 85%');
      });

      it('should include yearly scores section', () => {
        const result = generateLifePredictionPromptContext(mockPrediction, 'ko');
        expect(result).toContain('연도별 운세');
        expect(result).toContain('2024년');
        expect(result).toContain('A등급');
      });

      it('should include opportunities and challenges', () => {
        const result = generateLifePredictionPromptContext(mockPrediction, 'ko');
        expect(result).toContain('기회: 새로운 시작');
        expect(result).toContain('주의: 과로 주의');
      });

      it('should include daeun transitions', () => {
        const result = generateLifePredictionPromptContext(mockPrediction, 'ko');
        expect(result).toContain('대운 전환점');
        expect(result).toContain('2026년');
      });

      it('should include upcoming highlights', () => {
        const result = generateLifePredictionPromptContext(mockPrediction, 'ko');
        expect(result).toContain('다가오는 주요 시점');
        expect(result).toContain('2025년 최고 운세');
      });

      it('should include summary', () => {
        const result = generateLifePredictionPromptContext(mockPrediction, 'ko');
        expect(result).toContain('요약: 상승하는 운세입니다.');
      });
    });

    describe('English output', () => {
      it('should include English header', () => {
        const result = generateLifePredictionPromptContext(mockPrediction, 'en');
        expect(result).toContain('Comprehensive Life Prediction');
      });

      it('should include period', () => {
        const result = generateLifePredictionPromptContext(mockPrediction, 'en');
        expect(result).toContain('Period: 2023-2033');
      });

      it('should include trend', () => {
        const result = generateLifePredictionPromptContext(mockPrediction, 'en');
        expect(result).toContain('Trend: ascending');
      });

      it('should include confidence', () => {
        const result = generateLifePredictionPromptContext(mockPrediction, 'en');
        expect(result).toContain('Confidence: 85%');
      });
    });

    it('should default to Korean', () => {
      const result = generateLifePredictionPromptContext(mockPrediction);
      expect(result).toContain('종합 인생 예측 분석');
    });
  });

  describe('generateEventTimingPromptContext', () => {
    const mockEventResult: EventTimingResult = {
      eventType: 'marriage' as EventType,
      searchRange: { startYear: 2024, endYear: 2026 },
      optimalPeriods: [
        {
          startDate: new Date(2024, 5, 1),
          endDate: new Date(2024, 5, 30),
          score: 85,
          grade: 'S',
          reasons: ['좋은 시기', '운이 좋음', '천을귀인'],
          specificDays: [new Date(2024, 5, 15), new Date(2024, 5, 20)],
        },
        {
          startDate: new Date(2024, 9, 1),
          endDate: new Date(2024, 9, 31),
          score: 78,
          grade: 'A',
          reasons: ['안정적', '조화로움'],
          specificDays: [],
        },
      ],
      avoidPeriods: [
        {
          startDate: new Date(2024, 7, 1),
          endDate: new Date(2024, 7, 31),
          reasons: ['충돌', '불안정'],
          grade: 'D',
        },
      ],
      advice: '봄이나 가을이 좋습니다.',
    };

    describe('Korean output', () => {
      it('should include event type in Korean', () => {
        const result = generateEventTimingPromptContext(mockEventResult, 'ko');
        expect(result).toContain('결혼 최적 타이밍 분석');
      });

      it('should include search range', () => {
        const result = generateEventTimingPromptContext(mockEventResult, 'ko');
        expect(result).toContain('검색 범위: 2024~2026년');
      });

      it('should include optimal periods', () => {
        const result = generateEventTimingPromptContext(mockEventResult, 'ko');
        expect(result).toContain('최적 시기');
        expect(result).toContain('2024년 6월');
        expect(result).toContain('S등급');
      });

      it('should include reasons', () => {
        const result = generateEventTimingPromptContext(mockEventResult, 'ko');
        expect(result).toContain('이유:');
        expect(result).toContain('좋은 시기');
      });

      it('should include specific days when available', () => {
        const result = generateEventTimingPromptContext(mockEventResult, 'ko');
        expect(result).toContain('추천일:');
        expect(result).toContain('15일');
      });

      it('should include avoid periods', () => {
        const result = generateEventTimingPromptContext(mockEventResult, 'ko');
        expect(result).toContain('피해야 할 시기');
        expect(result).toContain('2024년 8월');
      });

      it('should include advice', () => {
        const result = generateEventTimingPromptContext(mockEventResult, 'ko');
        expect(result).toContain('조언: 봄이나 가을이 좋습니다.');
      });
    });

    describe('English output', () => {
      it('should include event type in English', () => {
        const result = generateEventTimingPromptContext(mockEventResult, 'en');
        expect(result).toContain('Marriage Optimal Timing');
      });

      it('should include range', () => {
        const result = generateEventTimingPromptContext(mockEventResult, 'en');
        expect(result).toContain('Range: 2024-2026');
      });
    });

    describe('different event types', () => {
      const eventTypes: EventType[] = ['marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship'];
      const koreanNames = ['결혼', '취업/이직', '투자', '이사', '학업/시험', '건강관리', '인간관계'];

      eventTypes.forEach((eventType, index) => {
        it(`should show correct Korean name for ${eventType}`, () => {
          const result = generateEventTimingPromptContext(
            { ...mockEventResult, eventType },
            'ko'
          );
          expect(result).toContain(koreanNames[index]);
        });
      });
    });
  });

  describe('generatePastAnalysisPromptContext', () => {
    const mockRetrospective: PastRetrospective = {
      targetDate: new Date(2023, 5, 15),
      dailyPillar: { stem: '甲', branch: '子' },
      score: 72,
      grade: 'A',
      twelveStage: { stage: '장생' },
      sibsin: '정인',
      whyItHappened: ['좋은 운이 작용', '귀인의 도움'],
      lessonsLearned: ['기회를 잡아야 함', '준비의 중요성'],
    };

    describe('Korean output', () => {
      it('should include date', () => {
        const result = generatePastAnalysisPromptContext(mockRetrospective, 'ko');
        // Date is formatted as ISO string split by 'T'
        expect(result).toContain('2023');
        expect(result).toContain('과거 분석');
      });

      it('should include daily pillar', () => {
        const result = generatePastAnalysisPromptContext(mockRetrospective, 'ko');
        expect(result).toContain('일진: 甲子');
      });

      it('should include grade and score', () => {
        const result = generatePastAnalysisPromptContext(mockRetrospective, 'ko');
        expect(result).toContain('등급: A (72점)');
      });

      it('should include twelve stage', () => {
        const result = generatePastAnalysisPromptContext(mockRetrospective, 'ko');
        expect(result).toContain('12운성: 장생');
      });

      it('should include sibsin', () => {
        const result = generatePastAnalysisPromptContext(mockRetrospective, 'ko');
        expect(result).toContain('십신: 정인');
      });

      it('should include why it happened section', () => {
        const result = generatePastAnalysisPromptContext(mockRetrospective, 'ko');
        expect(result).toContain('왜 그랬을까?');
        expect(result).toContain('좋은 운이 작용');
        expect(result).toContain('귀인의 도움');
      });

      it('should include lessons learned section', () => {
        const result = generatePastAnalysisPromptContext(mockRetrospective, 'ko');
        expect(result).toContain('배운 점');
        expect(result).toContain('기회를 잡아야 함');
        expect(result).toContain('준비의 중요성');
      });
    });

    describe('English output', () => {
      it('should include English header', () => {
        const result = generatePastAnalysisPromptContext(mockRetrospective, 'en');
        expect(result).toContain('Past Analysis');
      });

      it('should include daily pillar', () => {
        const result = generatePastAnalysisPromptContext(mockRetrospective, 'en');
        expect(result).toContain('Daily: 甲子');
      });

      it('should include grade', () => {
        const result = generatePastAnalysisPromptContext(mockRetrospective, 'en');
        expect(result).toContain('Grade: A (72)');
      });
    });
  });
});
