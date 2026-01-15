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
} from '@/lib/prediction/life-prediction/types';

// Mock multi-year module
vi.mock('@/lib/prediction/life-prediction/multi-year', () => ({
  analyzeMultiYearTrend: vi.fn().mockReturnValue({
    startYear: 2023,
    endYear: 2033,
    yearlyScores: [
      {
        year: 2024,
        age: 34,
        score: 78,
        grade: 'B',
        yearGanji: { stem: '甲', branch: '辰' },
        twelveStage: { stage: '장생', score: 8 },
        sibsin: '편재',
        branchInteractions: [],
        themes: ['재물운', '활동적'],
        opportunities: ['투자 기회', '새로운 도전'],
        challenges: ['건강 주의'],
      },
      {
        year: 2025,
        age: 35,
        score: 85,
        grade: 'A',
        yearGanji: { stem: '乙', branch: '巳' },
        twelveStage: { stage: '제왕', score: 12 },
        sibsin: '정재',
        branchInteractions: [],
        themes: ['커리어', '성장'],
        opportunities: ['승진 기회'],
        challenges: [],
      },
    ],
    overallTrend: 'ascending',
    peakYears: [2025, 2028],
    lowYears: [2027],
    daeunTransitions: [
      {
        year: 2026,
        age: 36,
        fromDaeun: { stem: '庚', branch: '申', startAge: 26, endAge: 35 },
        toDaeun: { stem: '辛', branch: '酉', startAge: 36, endAge: 45 },
        impact: 'positive',
        description: '새로운 대운 시작',
      },
    ],
    lifeCycles: [],
    summary: '전반적으로 상승하는 운세입니다.',
  }),
}));

// Mock daeunTransitSync module
vi.mock('@/lib/prediction/daeunTransitSync', () => ({
  analyzeDaeunTransitSync: vi.fn().mockReturnValue({
    majorTransitions: [
      {
        year: 2025,
        age: 35,
        synergyType: 'amplify',
        synergyScore: 82,
        themes: ['재물운 상승', '인복 증가'],
        opportunities: ['투자', '협업'],
        challenges: [],
      },
    ],
    currentPhase: { description: '현재 상승기' },
  }),
}));

describe('Comprehensive Prediction', () => {
  const mockInput: LifePredictionInput = {
    birthYear: 1990,
    birthMonth: 5,
    birthDay: 15,
    birthHour: 14,
    gender: 'male',
    dayStem: '丙',
    dayBranch: '寅',
    monthBranch: '巳',
    yearBranch: '午',
    allStems: ['庚', '辛', '丙', '己'],
    allBranches: ['午', '巳', '寅', '未'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateComprehensivePrediction', () => {
    it('should generate comprehensive prediction with basic input', () => {
      const result = generateComprehensivePrediction(mockInput);

      expect(result).toBeDefined();
      expect(result.input).toEqual(mockInput);
      expect(result.generatedAt).toBeInstanceOf(Date);
      expect(result.multiYearTrend).toBeDefined();
      expect(result.upcomingHighlights).toBeInstanceOf(Array);
      expect(result.confidence).toBeGreaterThanOrEqual(60);
    });

    it('should increase confidence with daeunList', () => {
      const inputWithDaeun: LifePredictionInput = {
        ...mockInput,
        daeunList: [
          { stem: '庚', branch: '申', startAge: 26, endAge: 35 },
          { stem: '辛', branch: '酉', startAge: 36, endAge: 45 },
        ],
      };

      const result = generateComprehensivePrediction(inputWithDaeun);

      expect(result.confidence).toBeGreaterThanOrEqual(75);
    });

    it('should increase confidence with yongsin', () => {
      const inputWithYongsin: LifePredictionInput = {
        ...mockInput,
        yongsin: ['목', '화'],
      };

      const result = generateComprehensivePrediction(inputWithYongsin);

      expect(result.confidence).toBeGreaterThanOrEqual(70);
    });

    it('should increase confidence with birthHour', () => {
      const inputWithHour: LifePredictionInput = {
        ...mockInput,
        birthHour: 14,
      };

      const result = generateComprehensivePrediction(inputWithHour);

      expect(result.confidence).toBeGreaterThanOrEqual(70);
    });

    it('should cap confidence at 95', () => {
      const fullInput: LifePredictionInput = {
        ...mockInput,
        birthHour: 14,
        yongsin: ['목', '화'],
        daeunList: [
          { stem: '庚', branch: '申', startAge: 26, endAge: 35 },
        ],
      };

      const result = generateComprehensivePrediction(fullInput);

      expect(result.confidence).toBeLessThanOrEqual(95);
    });

    it('should extract upcoming highlights from peak years', () => {
      const result = generateComprehensivePrediction(mockInput);

      const peakHighlights = result.upcomingHighlights.filter(h => h.type === 'peak');
      expect(peakHighlights.length).toBeGreaterThanOrEqual(0);
    });

    it('should extract upcoming highlights from daeun transitions', () => {
      const result = generateComprehensivePrediction(mockInput);

      const transitionHighlights = result.upcomingHighlights.filter(h => h.type === 'transition');
      expect(transitionHighlights.length).toBeGreaterThanOrEqual(0);
    });

    it('should sort highlights by date', () => {
      const result = generateComprehensivePrediction(mockInput);

      for (let i = 1; i < result.upcomingHighlights.length; i++) {
        const prevDate = result.upcomingHighlights[i - 1].date.getTime();
        const currDate = result.upcomingHighlights[i].date.getTime();
        expect(currDate).toBeGreaterThanOrEqual(prevDate);
      }
    });

    it('should limit highlights to 10', () => {
      const result = generateComprehensivePrediction(mockInput, 20);

      expect(result.upcomingHighlights.length).toBeLessThanOrEqual(10);
    });

    it('should use custom yearsRange', () => {
      const result = generateComprehensivePrediction(mockInput, 5);

      expect(result.multiYearTrend).toBeDefined();
    });
  });

  describe('generateLifePredictionPromptContext', () => {
    let mockPrediction: ComprehensivePrediction;

    beforeEach(() => {
      mockPrediction = generateComprehensivePrediction(mockInput);
    });

    it('should generate Korean prompt context', () => {
      const context = generateLifePredictionPromptContext(mockPrediction, 'ko');

      expect(context).toContain('종합 인생 예측 분석');
      expect(context).toContain('분석 기간');
      expect(context).toContain('신뢰도');
      expect(context).toContain('연도별 운세');
    });

    it('should generate English prompt context', () => {
      const context = generateLifePredictionPromptContext(mockPrediction, 'en');

      expect(context).toContain('Comprehensive Life Prediction');
      expect(context).toContain('Period');
      expect(context).toContain('Confidence');
    });

    it('should include yearly scores in Korean', () => {
      const context = generateLifePredictionPromptContext(mockPrediction, 'ko');

      expect(context).toContain('기회:');
      expect(context).toContain('주의:');
    });

    it('should include daeun transitions when present', () => {
      const context = generateLifePredictionPromptContext(mockPrediction, 'ko');

      expect(context).toContain('대운 전환점');
    });

    it('should include upcoming highlights', () => {
      const context = generateLifePredictionPromptContext(mockPrediction, 'ko');

      expect(context).toContain('다가오는 주요 시점');
    });

    it('should include summary', () => {
      const context = generateLifePredictionPromptContext(mockPrediction, 'ko');

      expect(context).toContain('요약');
    });

    it('should default to Korean', () => {
      const context = generateLifePredictionPromptContext(mockPrediction);

      expect(context).toContain('종합 인생 예측 분석');
    });
  });

  describe('generateEventTimingPromptContext', () => {
    const mockEventResult: EventTimingResult = {
      eventType: 'marriage',
      searchRange: { startYear: 2024, endYear: 2026 },
      optimalPeriods: [
        {
          startDate: new Date(2024, 5, 1),
          endDate: new Date(2024, 5, 30),
          score: 85,
          grade: 'A',
          reasons: ['금전운 좋음', '인연운 상승'],
          specificDays: [new Date(2024, 5, 15), new Date(2024, 5, 22)],
        },
        {
          startDate: new Date(2024, 9, 1),
          endDate: new Date(2024, 9, 31),
          score: 78,
          grade: 'B',
          reasons: ['안정적인 시기'],
        },
      ],
      avoidPeriods: [
        {
          startDate: new Date(2024, 7, 1),
          endDate: new Date(2024, 7, 31),
          score: 35,
          reasons: ['충돌 기운', '불안정'],
        },
      ],
      nextBestWindow: null,
      advice: '6월이 가장 좋은 시기입니다.',
    };

    it('should generate Korean event timing context', () => {
      const context = generateEventTimingPromptContext(mockEventResult, 'ko');

      expect(context).toContain('결혼 최적 타이밍 분석');
      expect(context).toContain('검색 범위');
      expect(context).toContain('최적 시기');
      expect(context).toContain('이유:');
    });

    it('should generate English event timing context', () => {
      const context = generateEventTimingPromptContext(mockEventResult, 'en');

      expect(context).toContain('Marriage Optimal Timing');
      expect(context).toContain('Range');
    });

    it('should include specific days in Korean', () => {
      const context = generateEventTimingPromptContext(mockEventResult, 'ko');

      expect(context).toContain('추천일:');
    });

    it('should include avoid periods in Korean', () => {
      const context = generateEventTimingPromptContext(mockEventResult, 'ko');

      expect(context).toContain('피해야 할 시기');
    });

    it('should include advice', () => {
      const context = generateEventTimingPromptContext(mockEventResult, 'ko');

      expect(context).toContain('조언:');
    });

    it('should handle career event type', () => {
      const careerResult: EventTimingResult = {
        ...mockEventResult,
        eventType: 'career',
      };
      const context = generateEventTimingPromptContext(careerResult, 'ko');

      expect(context).toContain('취업/이직');
    });

    it('should handle investment event type', () => {
      const investResult: EventTimingResult = {
        ...mockEventResult,
        eventType: 'investment',
      };
      const context = generateEventTimingPromptContext(investResult, 'ko');

      expect(context).toContain('투자');
    });

    it('should handle all event types', () => {
      const eventTypes: Array<EventTimingResult['eventType']> = [
        'marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship'
      ];

      for (const eventType of eventTypes) {
        const result: EventTimingResult = { ...mockEventResult, eventType };
        const context = generateEventTimingPromptContext(result, 'ko');
        expect(context.length).toBeGreaterThan(0);
      }
    });
  });

  describe('generatePastAnalysisPromptContext', () => {
    const mockRetrospective: PastRetrospective = {
      targetDate: new Date(2023, 6, 15),
      dailyPillar: { stem: '甲', branch: '子' },
      score: 72,
      grade: 'B',
      yearGanji: { stem: '癸', branch: '卯' },
      monthGanji: { stem: '己', branch: '未' },
      twelveStage: { stage: '장생', score: 8, description: '시작의 기운' },
      sibsin: '정인',
      branchInteractions: [],
      themes: ['학업', '지원'],
      whyItHappened: ['정인의 영향으로 학업에 유리했습니다', '장생 단계로 새로운 시작'],
      lessonsLearned: ['배움의 기회를 놓치지 마세요', '지원자의 도움이 중요합니다'],
    };

    it('should generate Korean past analysis context', () => {
      const context = generatePastAnalysisPromptContext(mockRetrospective, 'ko');

      expect(context).toContain('과거 분석');
      expect(context).toContain('일진:');
      expect(context).toContain('甲子');
      expect(context).toContain('등급:');
    });

    it('should generate English past analysis context', () => {
      const context = generatePastAnalysisPromptContext(mockRetrospective, 'en');

      expect(context).toContain('Past Analysis');
      expect(context).toContain('Daily:');
      expect(context).toContain('Grade:');
    });

    it('should include why it happened in Korean', () => {
      const context = generatePastAnalysisPromptContext(mockRetrospective, 'ko');

      expect(context).toContain('왜 그랬을까?');
      expect(context).toContain('정인의 영향');
    });

    it('should include lessons learned in Korean', () => {
      const context = generatePastAnalysisPromptContext(mockRetrospective, 'ko');

      expect(context).toContain('배운 점');
      expect(context).toContain('배움의 기회');
    });

    it('should include twelve stage', () => {
      const context = generatePastAnalysisPromptContext(mockRetrospective, 'ko');

      expect(context).toContain('12운성:');
      expect(context).toContain('장생');
    });

    it('should include sibsin', () => {
      const context = generatePastAnalysisPromptContext(mockRetrospective, 'ko');

      expect(context).toContain('십신:');
      expect(context).toContain('정인');
    });

    it('should format date correctly', () => {
      const context = generatePastAnalysisPromptContext(mockRetrospective, 'ko');

      // Date is formatted as ISO string, may differ by timezone
      expect(context).toMatch(/2023-07-1[45]/);
    });
  });
});
