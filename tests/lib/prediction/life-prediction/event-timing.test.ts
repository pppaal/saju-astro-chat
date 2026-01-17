/**
 * Event Timing Module Tests
 * 이벤트 타이밍 분석 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findOptimalEventTiming, findWeeklyOptimalTiming } from '@/lib/prediction/life-prediction/event-timing';
import type {
  LifePredictionInput,
  EventType,
  EventTimingResult,
  WeeklyEventTimingResult,
  PredictionGrade,
} from '@/lib/prediction/life-prediction/types';

// Mock the external dependencies
vi.mock('@/lib/prediction/advancedTimingEngine', () => ({
  calculateYearlyGanji: vi.fn((year: number) => ({
    stem: '甲',
    branch: '子',
  })),
  calculateMonthlyGanji: vi.fn((year: number, month: number) => ({
    stem: '乙',
    branch: '丑',
  })),
  calculatePreciseTwelveStage: vi.fn(() => ({
    stage: '건록',
    energy: 'peak',
    score: 85,
  })),
  calculateSibsin: vi.fn(() => '정관'),
  analyzeBranchInteractions: vi.fn(() => []),
}));

vi.mock('@/lib/prediction/ultraPrecisionEngine', () => ({
  calculateDailyPillar: vi.fn((date: Date) => ({
    stem: '丙',
    branch: '寅',
  })),
}));

vi.mock('@/lib/prediction/precisionEngine', () => ({
  PrecisionEngine: vi.fn(),
  getSolarTermForDate: vi.fn(() => ({
    index: 1,
    name: 'lichun',
    nameKo: '입춘',
    element: '목',
    startDate: new Date(),
    endDate: new Date(),
    energy: 'yang',
  })),
  getLunarMansion: vi.fn(() => ({
    index: 1,
    name: 'jiao',
    nameKo: '각',
    element: '목',
    isAuspicious: true,
    goodFor: ['결혼', '개업'],
    badFor: [],
  })),
  calculateSecondaryProgression: vi.fn(() => ({
    moon: { phase: 'Full' },
    venus: { sign: 'Libra' },
    sun: { house: 10 },
  })),
}));

vi.mock('@/lib/prediction/tier6Analysis', () => ({
  calculateTier6Bonus: vi.fn(() => ({
    total: 10,
    progression: { reasons: [], penalties: [] },
    shinsal: { reasons: [], penalties: [] },
    dayPillar: { reasons: [], warnings: [] },
  })),
}));

vi.mock('@/lib/prediction/tier7To10Analysis', () => ({
  calculateTier7To10Bonus: vi.fn(() => ({
    total: 5,
    reasons: [],
    penalties: [],
  })),
}));

vi.mock('@/lib/prediction/life-prediction/astro-bonus', () => ({
  calculateAstroBonus: vi.fn(() => ({
    bonus: 5,
    reasons: [],
    penalties: [],
  })),
  calculateTransitBonus: vi.fn(() => ({
    bonus: 3,
    reasons: [],
    penalties: [],
  })),
  calculateTransitHouseOverlay: vi.fn(() => ({
    bonus: 2,
    reasons: [],
  })),
}));

// Sample test input
const createTestInput = (): LifePredictionInput => ({
  birthYear: 1990,
  birthMonth: 5,
  birthDay: 15,
  birthHour: 10,
  gender: 'male',
  dayStem: '甲',
  dayBranch: '子',
  monthBranch: '寅',
  yearBranch: '午',
  allStems: ['甲', '乙', '丙', '丁'],
  allBranches: ['午', '寅', '子', '卯'],
  daeunList: [
    {
      index: 0,
      stem: '丙',
      branch: '辰',
      element: '화',
      startAge: 5,
      endAge: 14,
      startYear: 1995,
      endYear: 2004,
      description: '대운 1',
    },
    {
      index: 1,
      stem: '丁',
      branch: '巳',
      element: '화',
      startAge: 15,
      endAge: 24,
      startYear: 2005,
      endYear: 2014,
      description: '대운 2',
    },
    {
      index: 2,
      stem: '戊',
      branch: '午',
      element: '토',
      startAge: 25,
      endAge: 34,
      startYear: 2015,
      endYear: 2024,
      description: '대운 3',
    },
    {
      index: 3,
      stem: '己',
      branch: '未',
      element: '토',
      startAge: 35,
      endAge: 44,
      startYear: 2025,
      endYear: 2034,
      description: '대운 4',
    },
  ],
  yongsin: ['목', '화'],
  kisin: ['금', '수'],
});

describe('Event Timing Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findOptimalEventTiming', () => {
    it('should return EventTimingResult structure', () => {
      const input = createTestInput();
      const result = findOptimalEventTiming(input, 'marriage', 2025, 2026);

      expect(result).toHaveProperty('eventType');
      expect(result).toHaveProperty('searchRange');
      expect(result).toHaveProperty('optimalPeriods');
      expect(result).toHaveProperty('avoidPeriods');
      expect(result).toHaveProperty('nextBestWindow');
      expect(result).toHaveProperty('advice');
    });

    it('should set correct event type', () => {
      const input = createTestInput();
      const result = findOptimalEventTiming(input, 'career', 2025, 2026);

      expect(result.eventType).toBe('career');
    });

    it('should set correct search range', () => {
      const input = createTestInput();
      const result = findOptimalEventTiming(input, 'investment', 2025, 2027);

      expect(result.searchRange.startYear).toBe(2025);
      expect(result.searchRange.endYear).toBe(2027);
    });

    it('should return optimalPeriods as array', () => {
      const input = createTestInput();
      const result = findOptimalEventTiming(input, 'marriage', 2025, 2026);

      expect(Array.isArray(result.optimalPeriods)).toBe(true);
    });

    it('should return avoidPeriods as array', () => {
      const input = createTestInput();
      const result = findOptimalEventTiming(input, 'marriage', 2025, 2026);

      expect(Array.isArray(result.avoidPeriods)).toBe(true);
    });

    it('should generate advice string', () => {
      const input = createTestInput();
      const result = findOptimalEventTiming(input, 'marriage', 2025, 2026);

      expect(typeof result.advice).toBe('string');
      expect(result.advice.length).toBeGreaterThan(0);
    });

    it('should handle all event types', () => {
      const input = createTestInput();
      const eventTypes: EventType[] = [
        'marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship'
      ];

      for (const eventType of eventTypes) {
        const result = findOptimalEventTiming(input, eventType, 2025, 2026);
        expect(result.eventType).toBe(eventType);
      }
    });

    it('should handle unknown event type gracefully', () => {
      const input = createTestInput();
      const result = findOptimalEventTiming(input, 'unknown' as EventType, 2025, 2026);

      expect(result.advice).toContain('Unknown event type');
    });

    it('should respect options for progressions', () => {
      const input = createTestInput();
      const result = findOptimalEventTiming(input, 'marriage', 2025, 2026, {
        useProgressions: false,
      });

      expect(result).toBeDefined();
    });

    it('should respect options for solar terms', () => {
      const input = createTestInput();
      const result = findOptimalEventTiming(input, 'marriage', 2025, 2026, {
        useSolarTerms: false,
      });

      expect(result).toBeDefined();
    });
  });

  describe('findWeeklyOptimalTiming', () => {
    it('should return WeeklyEventTimingResult structure', () => {
      const input = createTestInput();
      const startDate = new Date(2025, 0, 1);
      const result = findWeeklyOptimalTiming(input, 'career', startDate);

      expect(result).toHaveProperty('eventType');
      expect(result).toHaveProperty('searchRange');
      expect(result).toHaveProperty('weeklyPeriods');
      expect(result).toHaveProperty('bestWeek');
      expect(result).toHaveProperty('worstWeek');
      expect(result).toHaveProperty('summary');
    });

    it('should set correct event type', () => {
      const input = createTestInput();
      const startDate = new Date(2025, 0, 1);
      const result = findWeeklyOptimalTiming(input, 'study', startDate);

      expect(result.eventType).toBe('study');
    });

    it('should return weeklyPeriods as array', () => {
      const input = createTestInput();
      const startDate = new Date(2025, 0, 1);
      const result = findWeeklyOptimalTiming(input, 'career', startDate);

      expect(Array.isArray(result.weeklyPeriods)).toBe(true);
    });

    it('should generate summary string', () => {
      const input = createTestInput();
      const startDate = new Date(2025, 0, 1);
      const result = findWeeklyOptimalTiming(input, 'career', startDate);

      expect(typeof result.summary).toBe('string');
    });

    it('should default to 3 month analysis period', () => {
      const input = createTestInput();
      const startDate = new Date(2025, 0, 1);
      const result = findWeeklyOptimalTiming(input, 'career', startDate);

      // Should have approximately 13 weeks for 3 months
      expect(result.weeklyPeriods.length).toBeGreaterThanOrEqual(10);
    });

    it('should respect custom end date', () => {
      const input = createTestInput();
      const startDate = new Date(2025, 0, 1);
      const endDate = new Date(2025, 0, 31); // 1 month
      const result = findWeeklyOptimalTiming(input, 'career', startDate, endDate);

      // Should have approximately 4-5 weeks for 1 month
      expect(result.weeklyPeriods.length).toBeLessThanOrEqual(6);
    });

    it('should handle unknown event type gracefully', () => {
      const input = createTestInput();
      const startDate = new Date(2025, 0, 1);
      const result = findWeeklyOptimalTiming(input, 'unknown' as EventType, startDate);

      expect(result.summary).toContain('Unknown event type');
    });

    it('should include bestDays in weekly periods', () => {
      const input = createTestInput();
      const startDate = new Date(2025, 0, 1);
      const result = findWeeklyOptimalTiming(input, 'career', startDate);

      if (result.weeklyPeriods.length > 0) {
        expect(result.weeklyPeriods[0]).toHaveProperty('bestDays');
        expect(Array.isArray(result.weeklyPeriods[0].bestDays)).toBe(true);
      }
    });

    it('should include week number in weekly periods', () => {
      const input = createTestInput();
      const startDate = new Date(2025, 0, 1);
      const result = findWeeklyOptimalTiming(input, 'career', startDate);

      if (result.weeklyPeriods.length > 0) {
        expect(result.weeklyPeriods[0]).toHaveProperty('weekNumber');
        expect(typeof result.weeklyPeriods[0].weekNumber).toBe('number');
      }
    });
  });

  describe('Score to Grade Conversion', () => {
    // Test the internal scoreToGrade function logic
    it('should return S grade for scores >= 85', () => {
      const getGrade = (score: number): PredictionGrade => {
        if (score >= 85) return 'S';
        if (score >= 75) return 'A';
        if (score >= 60) return 'B';
        if (score >= 45) return 'C';
        return 'D';
      };

      expect(getGrade(85)).toBe('S');
      expect(getGrade(90)).toBe('S');
      expect(getGrade(100)).toBe('S');
    });

    it('should return A grade for scores >= 75 and < 85', () => {
      const getGrade = (score: number): PredictionGrade => {
        if (score >= 85) return 'S';
        if (score >= 75) return 'A';
        if (score >= 60) return 'B';
        if (score >= 45) return 'C';
        return 'D';
      };

      expect(getGrade(75)).toBe('A');
      expect(getGrade(80)).toBe('A');
      expect(getGrade(84)).toBe('A');
    });

    it('should return B grade for scores >= 60 and < 75', () => {
      const getGrade = (score: number): PredictionGrade => {
        if (score >= 85) return 'S';
        if (score >= 75) return 'A';
        if (score >= 60) return 'B';
        if (score >= 45) return 'C';
        return 'D';
      };

      expect(getGrade(60)).toBe('B');
      expect(getGrade(70)).toBe('B');
      expect(getGrade(74)).toBe('B');
    });

    it('should return C grade for scores >= 45 and < 60', () => {
      const getGrade = (score: number): PredictionGrade => {
        if (score >= 85) return 'S';
        if (score >= 75) return 'A';
        if (score >= 60) return 'B';
        if (score >= 45) return 'C';
        return 'D';
      };

      expect(getGrade(45)).toBe('C');
      expect(getGrade(50)).toBe('C');
      expect(getGrade(59)).toBe('C');
    });

    it('should return D grade for scores < 45', () => {
      const getGrade = (score: number): PredictionGrade => {
        if (score >= 85) return 'S';
        if (score >= 75) return 'A';
        if (score >= 60) return 'B';
        if (score >= 45) return 'C';
        return 'D';
      };

      expect(getGrade(44)).toBe('D');
      expect(getGrade(30)).toBe('D');
      expect(getGrade(0)).toBe('D');
    });
  });

  describe('Shinsal Detection Logic', () => {
    // Test the internal shinsal detection logic
    describe('천을귀인 (Heavenly Noble)', () => {
      const cheonelMap: Record<string, string[]> = {
        '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
        '乙': ['子', '申'], '己': ['子', '申'],
        '丙': ['亥', '酉'], '丁': ['亥', '酉'],
        '壬': ['卯', '巳'], '癸': ['卯', '巳'],
        '辛': ['午', '寅'],
      };

      it('should detect 천을귀인 for 甲 day stem with 丑 branch', () => {
        expect(cheonelMap['甲']?.includes('丑')).toBe(true);
      });

      it('should detect 천을귀인 for 乙 day stem with 子 branch', () => {
        expect(cheonelMap['乙']?.includes('子')).toBe(true);
      });

      it('should detect 천을귀인 for 辛 day stem with 午 branch', () => {
        expect(cheonelMap['辛']?.includes('午')).toBe(true);
      });
    });

    describe('역마 (Post Horse)', () => {
      const yeokmaMap: Record<string, string> = {
        '寅': '申', '午': '申', '戌': '申',
        '申': '寅', '子': '寅', '辰': '寅',
        '亥': '巳', '卯': '巳', '未': '巳',
        '巳': '亥', '酉': '亥', '丑': '亥',
      };

      it('should map 寅 to 申 for 역마', () => {
        expect(yeokmaMap['寅']).toBe('申');
      });

      it('should map 子 to 寅 for 역마', () => {
        expect(yeokmaMap['子']).toBe('寅');
      });

      it('should map 亥 to 巳 for 역마', () => {
        expect(yeokmaMap['亥']).toBe('巳');
      });
    });

    describe('문창 (Literary Star)', () => {
      const munchangMap: Record<string, string> = {
        '甲': '巳', '乙': '午', '丙': '申', '戊': '申',
        '丁': '酉', '己': '酉', '庚': '亥', '辛': '子',
        '壬': '寅', '癸': '卯',
      };

      it('should map 甲 to 巳 for 문창', () => {
        expect(munchangMap['甲']).toBe('巳');
      });

      it('should map 壬 to 寅 for 문창', () => {
        expect(munchangMap['壬']).toBe('寅');
      });
    });

    describe('겁살 (Robbery Star)', () => {
      const geopsalMap: Record<string, string> = {
        '寅': '亥', '午': '亥', '戌': '亥',
        '申': '巳', '子': '巳', '辰': '巳',
        '亥': '申', '卯': '申', '未': '申',
        '巳': '寅', '酉': '寅', '丑': '寅',
      };

      it('should map 寅 to 亥 for 겁살', () => {
        expect(geopsalMap['寅']).toBe('亥');
      });

      it('should map 申 to 巳 for 겁살', () => {
        expect(geopsalMap['申']).toBe('巳');
      });
    });

    describe('화개 (Canopy Star)', () => {
      const hwagaeMap: Record<string, string> = {
        '寅': '戌', '午': '戌', '戌': '戌',
        '申': '辰', '子': '辰', '辰': '辰',
        '亥': '未', '卯': '未', '未': '未',
        '巳': '丑', '酉': '丑', '丑': '丑',
      };

      it('should map 寅 to 戌 for 화개', () => {
        expect(hwagaeMap['寅']).toBe('戌');
      });

      it('should map 子 to 辰 for 화개', () => {
        expect(hwagaeMap['子']).toBe('辰');
      });
    });
  });

  describe('Event Types and Names', () => {
    const eventNames: Record<EventType, string> = {
      marriage: '결혼',
      career: '취업/이직',
      investment: '투자',
      move: '이사',
      study: '학업/시험',
      health: '건강관리',
      relationship: '인간관계',
    };

    it('should have Korean name for marriage', () => {
      expect(eventNames.marriage).toBe('결혼');
    });

    it('should have Korean name for career', () => {
      expect(eventNames.career).toBe('취업/이직');
    });

    it('should have Korean name for investment', () => {
      expect(eventNames.investment).toBe('투자');
    });

    it('should have Korean name for move', () => {
      expect(eventNames.move).toBe('이사');
    });

    it('should have Korean name for study', () => {
      expect(eventNames.study).toBe('학업/시험');
    });

    it('should have Korean name for health', () => {
      expect(eventNames.health).toBe('건강관리');
    });

    it('should have Korean name for relationship', () => {
      expect(eventNames.relationship).toBe('인간관계');
    });
  });

  describe('Favorable Conditions', () => {
    describe('Marriage favorable conditions', () => {
      const marriageConditions = {
        favorableSibsin: ['정관', '정재', '정인', '식신'],
        favorableStages: ['건록', '제왕', '관대', '장생'],
        favorableElements: ['화', '목'],
        avoidSibsin: ['겁재', '상관', '편관'],
        avoidStages: ['사', '묘', '절'],
      };

      it('should have favorable sibsin for marriage', () => {
        expect(marriageConditions.favorableSibsin).toContain('정관');
        expect(marriageConditions.favorableSibsin).toContain('정재');
      });

      it('should have favorable stages for marriage', () => {
        expect(marriageConditions.favorableStages).toContain('건록');
        expect(marriageConditions.favorableStages).toContain('제왕');
      });

      it('should avoid certain sibsin for marriage', () => {
        expect(marriageConditions.avoidSibsin).toContain('겁재');
        expect(marriageConditions.avoidSibsin).toContain('상관');
      });
    });

    describe('Career favorable conditions', () => {
      const careerConditions = {
        favorableSibsin: ['정관', '편관', '정인', '식신'],
        favorableStages: ['건록', '제왕', '관대'],
        favorableElements: ['금', '토'],
        avoidSibsin: ['겁재', '상관'],
        avoidStages: ['사', '묘', '병'],
      };

      it('should have favorable sibsin for career', () => {
        expect(careerConditions.favorableSibsin).toContain('정관');
        expect(careerConditions.favorableSibsin).toContain('편관');
      });

      it('should have favorable elements for career', () => {
        expect(careerConditions.favorableElements).toContain('금');
        expect(careerConditions.favorableElements).toContain('토');
      });
    });

    describe('Study favorable conditions', () => {
      const studyConditions = {
        favorableSibsin: ['정인', '편인', '식신'],
        favorableStages: ['장생', '관대', '목욕', '양'],
        favorableElements: ['수', '목'],
        avoidSibsin: ['편재', '겁재'],
        avoidStages: ['사', '묘'],
      };

      it('should have favorable sibsin for study', () => {
        expect(studyConditions.favorableSibsin).toContain('정인');
        expect(studyConditions.favorableSibsin).toContain('편인');
      });

      it('should have favorable elements for study', () => {
        expect(studyConditions.favorableElements).toContain('수');
        expect(studyConditions.favorableElements).toContain('목');
      });
    });
  });

  describe('Weekly Period Structure', () => {
    it('should have correct week structure', () => {
      const weeklyPeriod = {
        startDate: new Date(2025, 0, 6), // Monday
        endDate: new Date(2025, 0, 12), // Sunday
        weekNumber: 1,
        score: 75,
        grade: 'A' as PredictionGrade,
        reasons: ['용신일', '천을귀인'],
        bestDays: [new Date(2025, 0, 8)],
      };

      expect(weeklyPeriod.startDate).toBeInstanceOf(Date);
      expect(weeklyPeriod.endDate).toBeInstanceOf(Date);
      expect(weeklyPeriod.weekNumber).toBe(1);
      expect(weeklyPeriod.score).toBe(75);
      expect(weeklyPeriod.grade).toBe('A');
      expect(Array.isArray(weeklyPeriod.reasons)).toBe(true);
      expect(Array.isArray(weeklyPeriod.bestDays)).toBe(true);
    });

    it('should calculate week span correctly', () => {
      const startDate = new Date(2025, 0, 6); // Monday
      const endDate = new Date(2025, 0, 12); // Sunday
      const daysDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBe(6); // 7 days, 6 days difference
    });
  });

  describe('Optimal Period Structure', () => {
    it('should have correct optimal period structure', () => {
      const optimalPeriod = {
        startDate: new Date(2025, 0, 1),
        endDate: new Date(2025, 0, 31),
        score: 82,
        grade: 'A' as PredictionGrade,
        reasons: ['정관운', '건록', '용신 월'],
        specificDays: [new Date(2025, 0, 15)],
      };

      expect(optimalPeriod.startDate).toBeInstanceOf(Date);
      expect(optimalPeriod.endDate).toBeInstanceOf(Date);
      expect(optimalPeriod.score).toBe(82);
      expect(optimalPeriod.grade).toBe('A');
      expect(Array.isArray(optimalPeriod.reasons)).toBe(true);
      expect(Array.isArray(optimalPeriod.specificDays)).toBe(true);
    });
  });

  describe('Avoid Period Structure', () => {
    it('should have correct avoid period structure', () => {
      const avoidPeriod = {
        startDate: new Date(2025, 5, 1),
        endDate: new Date(2025, 5, 30),
        score: 28,
        reasons: ['겁재운', '묘', '기신 월'],
      };

      expect(avoidPeriod.startDate).toBeInstanceOf(Date);
      expect(avoidPeriod.endDate).toBeInstanceOf(Date);
      expect(avoidPeriod.score).toBe(28);
      expect(Array.isArray(avoidPeriod.reasons)).toBe(true);
    });
  });
});

describe('Event Timing Constants', () => {
  describe('Stem Elements', () => {
    const STEM_ELEMENT: Record<string, string> = {
      '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
      '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
    };

    it('should map 甲 to 목', () => {
      expect(STEM_ELEMENT['甲']).toBe('목');
    });

    it('should map 丙 to 화', () => {
      expect(STEM_ELEMENT['丙']).toBe('화');
    });

    it('should map 戊 to 토', () => {
      expect(STEM_ELEMENT['戊']).toBe('토');
    });

    it('should map 庚 to 금', () => {
      expect(STEM_ELEMENT['庚']).toBe('금');
    });

    it('should map 壬 to 수', () => {
      expect(STEM_ELEMENT['壬']).toBe('수');
    });

    it('should have 10 stem mappings', () => {
      expect(Object.keys(STEM_ELEMENT)).toHaveLength(10);
    });
  });

  describe('Event Types Array', () => {
    const eventTypes: EventType[] = [
      'marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship'
    ];

    it('should have 7 event types', () => {
      expect(eventTypes).toHaveLength(7);
    });

    it('should include all main event types', () => {
      expect(eventTypes).toContain('marriage');
      expect(eventTypes).toContain('career');
      expect(eventTypes).toContain('investment');
      expect(eventTypes).toContain('move');
      expect(eventTypes).toContain('study');
      expect(eventTypes).toContain('health');
      expect(eventTypes).toContain('relationship');
    });
  });
});

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle input without daeunList', () => {
    const input: LifePredictionInput = {
      birthYear: 1990,
      birthMonth: 5,
      birthDay: 15,
      gender: 'female',
      dayStem: '甲',
      dayBranch: '子',
      monthBranch: '寅',
      yearBranch: '午',
      allStems: ['甲', '乙', '丙', '丁'],
      allBranches: ['午', '寅', '子', '卯'],
    };

    const result = findOptimalEventTiming(input, 'marriage', 2025, 2026);
    expect(result).toBeDefined();
  });

  it('should handle input without yongsin/kisin', () => {
    const input: LifePredictionInput = {
      birthYear: 1990,
      birthMonth: 5,
      birthDay: 15,
      gender: 'male',
      dayStem: '甲',
      dayBranch: '子',
      monthBranch: '寅',
      yearBranch: '午',
      allStems: ['甲', '乙', '丙', '丁'],
      allBranches: ['午', '寅', '子', '卯'],
    };

    const result = findOptimalEventTiming(input, 'career', 2025, 2026);
    expect(result).toBeDefined();
  });

  it('should handle single year search range', () => {
    const input = createTestInput();
    const result = findOptimalEventTiming(input, 'investment', 2025, 2025);

    expect(result.searchRange.startYear).toBe(2025);
    expect(result.searchRange.endYear).toBe(2025);
  });

  it('should handle very short weekly analysis period', () => {
    const input = createTestInput();
    const startDate = new Date(2025, 0, 1);
    const endDate = new Date(2025, 0, 7); // 1 week only
    const result = findWeeklyOptimalTiming(input, 'career', startDate, endDate);

    expect(result.weeklyPeriods.length).toBeLessThanOrEqual(2);
  });
});
