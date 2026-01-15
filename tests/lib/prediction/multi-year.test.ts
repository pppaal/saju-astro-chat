import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeMultiYearTrend } from '@/lib/prediction/life-prediction/multi-year';
import type { LifePredictionInput, DaeunInfo, PreciseTwelveStage, BranchInteraction } from '@/lib/prediction/life-prediction/types';

// Mock advancedTimingEngine functions
vi.mock('@/lib/prediction/advancedTimingEngine', () => ({
  calculateYearlyGanji: vi.fn((year: number) => {
    // Simplified calculation for testing
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    const stemIndex = (year - 4) % 10;
    const branchIndex = (year - 4) % 12;
    return {
      stem: stems[stemIndex],
      branch: branches[branchIndex],
    };
  }),
  calculatePreciseTwelveStage: vi.fn((dayStem: string, branch: string): PreciseTwelveStage => {
    // Return different stages based on branch for variety
    const energyMap: Record<string, 'peak' | 'rising' | 'declining' | 'dormant'> = {
      '子': 'dormant', '丑': 'rising', '寅': 'rising', '卯': 'peak',
      '辰': 'peak', '巳': 'declining', '午': 'declining', '未': 'dormant',
      '申': 'rising', '酉': 'peak', '戌': 'declining', '亥': 'dormant',
    };
    const scoreMap: Record<string, number> = {
      '子': 30, '丑': 45, '寅': 55, '卯': 75,
      '辰': 80, '巳': 50, '午': 45, '未': 35,
      '申': 60, '酉': 85, '戌': 55, '亥': 40,
    };
    return {
      stage: '건록',
      energy: energyMap[branch] || 'rising',
      score: scoreMap[branch] || 50,
      description: 'test description',
    };
  }),
  calculateSibsin: vi.fn((dayStem: string, targetStem: string) => {
    // Return various sibsin for testing
    const sibsinList = ['정관', '정재', '정인', '식신', '편관', '편재', '편인', '상관', '비견', '겁재'];
    const index = Math.abs(targetStem.charCodeAt(0)) % sibsinList.length;
    return sibsinList[index];
  }),
  analyzeBranchInteractions: vi.fn((branches: string[]): BranchInteraction[] => {
    // Return sample interactions
    return [
      { type: '육합', branches: ['子', '丑'], score: 10, description: '육합' },
    ];
  }),
}));

describe('Multi-Year Trend Analysis', () => {
  const mockDaeunList: DaeunInfo[] = [
    {
      startAge: 3,
      endAge: 12,
      stem: '甲',
      branch: '子',
      element: '목',
    },
    {
      startAge: 13,
      endAge: 22,
      stem: '乙',
      branch: '丑',
      element: '목',
    },
    {
      startAge: 23,
      endAge: 32,
      stem: '丙',
      branch: '寅',
      element: '화',
    },
    {
      startAge: 33,
      endAge: 42,
      stem: '丁',
      branch: '卯',
      element: '화',
    },
    {
      startAge: 43,
      endAge: 52,
      stem: '戊',
      branch: '辰',
      element: '토',
    },
  ];

  const baseInput: LifePredictionInput = {
    birthYear: 1990,
    birthMonth: 5,
    birthDay: 15,
    birthHour: 10,
    gender: 'male',
    dayStem: '甲',
    dayBranch: '子',
    monthBranch: '巳',
    yearBranch: '午',
    allStems: ['甲', '乙', '丙', '丁'],
    allBranches: ['子', '丑', '寅', '卯'],
    daeunList: mockDaeunList,
    yongsin: ['목', '화'],
    kisin: ['금'],
  };

  describe('analyzeMultiYearTrend', () => {
    it('should return valid multi-year trend structure', () => {
      const result = analyzeMultiYearTrend(baseInput, 2020, 2030);

      expect(result.startYear).toBe(2020);
      expect(result.endYear).toBe(2030);
      expect(result.yearlyScores).toBeInstanceOf(Array);
      expect(result.overallTrend).toBeDefined();
      expect(result.peakYears).toBeInstanceOf(Array);
      expect(result.lowYears).toBeInstanceOf(Array);
      expect(result.daeunTransitions).toBeInstanceOf(Array);
      expect(result.lifeCycles).toBeInstanceOf(Array);
      expect(result.summary).toBeDefined();
    });

    it('should generate yearly scores for each year in range', () => {
      const result = analyzeMultiYearTrend(baseInput, 2020, 2025);

      expect(result.yearlyScores.length).toBe(6); // 2020, 2021, 2022, 2023, 2024, 2025

      result.yearlyScores.forEach((yearly) => {
        expect(yearly.year).toBeGreaterThanOrEqual(2020);
        expect(yearly.year).toBeLessThanOrEqual(2025);
        expect(yearly.age).toBeDefined();
        expect(yearly.score).toBeGreaterThanOrEqual(0);
        expect(yearly.score).toBeLessThanOrEqual(100);
        expect(yearly.grade).toBeDefined();
        expect(yearly.yearGanji).toBeDefined();
        expect(yearly.yearGanji.stem).toBeDefined();
        expect(yearly.yearGanji.branch).toBeDefined();
        expect(yearly.twelveStage).toBeDefined();
        expect(yearly.sibsin).toBeDefined();
        expect(yearly.themes).toBeInstanceOf(Array);
        expect(yearly.opportunities).toBeInstanceOf(Array);
        expect(yearly.challenges).toBeInstanceOf(Array);
      });
    });

    it('should calculate correct age for each year', () => {
      const result = analyzeMultiYearTrend(baseInput, 2020, 2025);

      result.yearlyScores.forEach((yearly) => {
        expect(yearly.age).toBe(yearly.year - baseInput.birthYear);
      });
    });

    it('should assign grades based on scores', () => {
      const result = analyzeMultiYearTrend(baseInput, 2020, 2030);

      result.yearlyScores.forEach((yearly) => {
        if (yearly.score >= 85) expect(yearly.grade).toBe('S');
        else if (yearly.score >= 75) expect(yearly.grade).toBe('A');
        else if (yearly.score >= 60) expect(yearly.grade).toBe('B');
        else if (yearly.score >= 45) expect(yearly.grade).toBe('C');
        else expect(yearly.grade).toBe('D');
      });
    });

    it('should identify peak years (top 3 scores)', () => {
      const result = analyzeMultiYearTrend(baseInput, 2020, 2030);

      expect(result.peakYears.length).toBeLessThanOrEqual(3);

      // Verify peak years have higher scores than non-peak years
      const peakScores = result.yearlyScores
        .filter(y => result.peakYears.includes(y.year))
        .map(y => y.score);

      const nonPeakScores = result.yearlyScores
        .filter(y => !result.peakYears.includes(y.year))
        .map(y => y.score);

      if (nonPeakScores.length > 0 && peakScores.length > 0) {
        const minPeak = Math.min(...peakScores);
        const maxNonPeak = Math.max(...nonPeakScores);
        expect(minPeak).toBeGreaterThanOrEqual(maxNonPeak);
      }
    });

    it('should identify low years (bottom 3 scores)', () => {
      const result = analyzeMultiYearTrend(baseInput, 2020, 2030);

      expect(result.lowYears.length).toBeLessThanOrEqual(3);

      // Verify low years have lower scores than non-low years
      const lowScores = result.yearlyScores
        .filter(y => result.lowYears.includes(y.year))
        .map(y => y.score);

      const nonLowScores = result.yearlyScores
        .filter(y => !result.lowYears.includes(y.year))
        .map(y => y.score);

      if (nonLowScores.length > 0 && lowScores.length > 0) {
        const maxLow = Math.max(...lowScores);
        const minNonLow = Math.min(...nonLowScores);
        expect(maxLow).toBeLessThanOrEqual(minNonLow);
      }
    });

    it('should detect overall trend as ascending, descending, stable, or volatile', () => {
      const result = analyzeMultiYearTrend(baseInput, 2020, 2030);

      expect(['ascending', 'descending', 'stable', 'volatile']).toContain(result.overallTrend);
    });

    it('should include themes based on twelve stage energy', () => {
      const result = analyzeMultiYearTrend(baseInput, 2020, 2025);

      result.yearlyScores.forEach((yearly) => {
        expect(yearly.themes.length).toBeGreaterThan(0);

        // Themes should match energy levels
        const energy = yearly.twelveStage.energy;
        if (energy === 'peak') {
          expect(yearly.themes).toContain('전성기');
        } else if (energy === 'rising') {
          expect(yearly.themes).toContain('상승기');
        } else if (energy === 'declining') {
          expect(yearly.themes).toContain('안정기');
        } else {
          expect(yearly.themes).toContain('준비기');
        }
      });
    });

    it('should generate summary text', () => {
      const result = analyzeMultiYearTrend(baseInput, 2020, 2030);

      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe('string');
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it('should skip years before birth', () => {
      const youngInput = { ...baseInput, birthYear: 2010 };
      const result = analyzeMultiYearTrend(youngInput, 2000, 2015);

      // Should only have years from 2010 onwards
      result.yearlyScores.forEach((yearly) => {
        expect(yearly.year).toBeGreaterThanOrEqual(2010);
        expect(yearly.age).toBeGreaterThanOrEqual(0);
      });
    });

    it('should clamp scores between 0 and 100', () => {
      const result = analyzeMultiYearTrend(baseInput, 2020, 2050);

      result.yearlyScores.forEach((yearly) => {
        expect(yearly.score).toBeGreaterThanOrEqual(0);
        expect(yearly.score).toBeLessThanOrEqual(100);
      });
    });

    it('should apply yongsin bonus to scores', () => {
      const inputWithYongsin = {
        ...baseInput,
        yongsin: ['목', '화', '토', '금', '수'] as const,
        kisin: [],
      };
      const resultWith = analyzeMultiYearTrend(inputWithYongsin, 2020, 2025);

      const inputWithoutYongsin = {
        ...baseInput,
        yongsin: [],
        kisin: [],
      };
      const resultWithout = analyzeMultiYearTrend(inputWithoutYongsin, 2020, 2025);

      // At least some years should have higher scores with yongsin
      const avgWith = resultWith.yearlyScores.reduce((sum, y) => sum + y.score, 0) / resultWith.yearlyScores.length;
      const avgWithout = resultWithout.yearlyScores.reduce((sum, y) => sum + y.score, 0) / resultWithout.yearlyScores.length;

      expect(avgWith).toBeGreaterThanOrEqual(avgWithout);
    });

    it('should apply kisin penalty to scores', () => {
      const inputWithKisin = {
        ...baseInput,
        yongsin: [],
        kisin: ['목', '화', '토', '금', '수'] as const,
      };
      const resultWith = analyzeMultiYearTrend(inputWithKisin, 2020, 2025);

      const inputWithoutKisin = {
        ...baseInput,
        yongsin: [],
        kisin: [],
      };
      const resultWithout = analyzeMultiYearTrend(inputWithoutKisin, 2020, 2025);

      // At least some years should have lower scores with kisin
      const avgWith = resultWith.yearlyScores.reduce((sum, y) => sum + y.score, 0) / resultWith.yearlyScores.length;
      const avgWithout = resultWithout.yearlyScores.reduce((sum, y) => sum + y.score, 0) / resultWithout.yearlyScores.length;

      expect(avgWith).toBeLessThanOrEqual(avgWithout);
    });

    it('should handle input without daeunList', () => {
      const inputWithoutDaeun = { ...baseInput, daeunList: [] };
      const result = analyzeMultiYearTrend(inputWithoutDaeun, 2020, 2025);

      expect(result.yearlyScores.length).toBe(6);
      expect(result.daeunTransitions.length).toBe(0);
      expect(result.lifeCycles.length).toBe(0);
    });

    it('should handle single year range', () => {
      const result = analyzeMultiYearTrend(baseInput, 2025, 2025);

      expect(result.yearlyScores.length).toBe(1);
      expect(result.yearlyScores[0].year).toBe(2025);
    });

    it('should analyze life cycles based on daeun', () => {
      const result = analyzeMultiYearTrend(baseInput, 2000, 2050);

      // Life cycles should be created for daeun periods that overlap with the analysis range
      result.lifeCycles.forEach((phase) => {
        expect(phase.name).toContain('대운');
        expect(phase.startYear).toBeDefined();
        expect(phase.endYear).toBeDefined();
        expect(phase.startAge).toBeDefined();
        expect(phase.endAge).toBeDefined();
        expect(phase.theme).toBeDefined();
        expect(['peak', 'rising', 'declining', 'dormant']).toContain(phase.energy);
        expect(phase.recommendations).toBeInstanceOf(Array);
        expect(phase.recommendations.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Daeun Transitions', () => {
    it('should detect daeun transition points', () => {
      // Create input that will span multiple daeun periods
      const inputWithDaeun = {
        ...baseInput,
        birthYear: 1990,
      };

      const result = analyzeMultiYearTrend(inputWithDaeun, 2000, 2040);

      // Should detect transitions when person enters a new daeun
      result.daeunTransitions.forEach((transition) => {
        expect(transition.year).toBeDefined();
        expect(transition.age).toBeDefined();
        expect(transition.fromDaeun).toBeDefined();
        expect(transition.toDaeun).toBeDefined();
        expect(['major_positive', 'positive', 'neutral', 'challenging', 'major_challenging'])
          .toContain(transition.impact);
        expect(transition.description).toContain('대운 전환');
      });
    });

    it('should include transition description with daeun names', () => {
      const result = analyzeMultiYearTrend(baseInput, 2000, 2040);

      result.daeunTransitions.forEach((transition) => {
        expect(transition.description).toContain(transition.fromDaeun.stem);
        expect(transition.description).toContain(transition.fromDaeun.branch);
        expect(transition.description).toContain(transition.toDaeun.stem);
        expect(transition.description).toContain(transition.toDaeun.branch);
      });
    });
  });

  describe('Summary Generation', () => {
    it('should mention ascending trend in summary', () => {
      // This test depends on the mock data producing an ascending trend
      const result = analyzeMultiYearTrend(baseInput, 2020, 2030);

      if (result.overallTrend === 'ascending') {
        expect(result.summary).toContain('상승');
      }
    });

    it('should mention descending trend in summary', () => {
      const result = analyzeMultiYearTrend(baseInput, 2020, 2030);

      if (result.overallTrend === 'descending') {
        expect(result.summary).toContain('후반부');
      }
    });

    it('should mention stable trend in summary', () => {
      const result = analyzeMultiYearTrend(baseInput, 2020, 2030);

      if (result.overallTrend === 'stable') {
        expect(result.summary).toContain('안정적');
      }
    });

    it('should mention volatile trend in summary', () => {
      const result = analyzeMultiYearTrend(baseInput, 2020, 2030);

      if (result.overallTrend === 'volatile') {
        expect(result.summary).toContain('변동');
      }
    });
  });

  describe('Life Cycle Phases', () => {
    it('should generate recommendations for peak energy phase', () => {
      const result = analyzeMultiYearTrend(baseInput, 2000, 2050);

      const peakPhase = result.lifeCycles.find(p => p.energy === 'peak');
      if (peakPhase) {
        expect(peakPhase.recommendations).toContain('중요한 결정과 큰 프로젝트 추진');
        expect(peakPhase.recommendations).toContain('적극적인 도전과 확장');
      }
    });

    it('should generate recommendations for rising energy phase', () => {
      const result = analyzeMultiYearTrend(baseInput, 2000, 2050);

      const risingPhase = result.lifeCycles.find(p => p.energy === 'rising');
      if (risingPhase) {
        expect(risingPhase.recommendations).toContain('새로운 시작과 계획 수립');
        expect(risingPhase.recommendations).toContain('학습과 자기 개발');
      }
    });

    it('should generate recommendations for declining energy phase', () => {
      const result = analyzeMultiYearTrend(baseInput, 2000, 2050);

      const decliningPhase = result.lifeCycles.find(p => p.energy === 'declining');
      if (decliningPhase) {
        expect(decliningPhase.recommendations).toContain('기존 성과의 정리와 보존');
        expect(decliningPhase.recommendations).toContain('무리한 확장보다 안정 추구');
      }
    });

    it('should generate recommendations for dormant energy phase', () => {
      const result = analyzeMultiYearTrend(baseInput, 2000, 2050);

      const dormantPhase = result.lifeCycles.find(p => p.energy === 'dormant');
      if (dormantPhase) {
        expect(dormantPhase.recommendations).toContain('내면 성찰과 재충전');
        expect(dormantPhase.recommendations).toContain('건강 관리와 휴식');
      }
    });

    it('should include element-based recommendations', () => {
      const result = analyzeMultiYearTrend(baseInput, 2000, 2050);

      // Each phase should have at least 4 recommendations (3 energy-based + 1 element-based)
      result.lifeCycles.forEach((phase) => {
        expect(phase.recommendations.length).toBeGreaterThanOrEqual(4);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle future birth year gracefully', () => {
      const futureInput = { ...baseInput, birthYear: 2100 };
      const result = analyzeMultiYearTrend(futureInput, 2020, 2030);

      // All years would be before birth, so no scores
      expect(result.yearlyScores.length).toBe(0);
    });

    it('should handle empty yongsin and kisin', () => {
      const inputEmpty = { ...baseInput, yongsin: undefined, kisin: undefined };
      const result = analyzeMultiYearTrend(inputEmpty, 2020, 2025);

      expect(result.yearlyScores.length).toBe(6);
    });

    it('should handle very long date range', () => {
      const result = analyzeMultiYearTrend(baseInput, 2000, 2100);

      expect(result.yearlyScores.length).toBe(101); // 2000-2100 inclusive
      expect(result.peakYears.length).toBe(3);
      expect(result.lowYears.length).toBe(3);
    });

    it('should handle reversed year range (start > end)', () => {
      const result = analyzeMultiYearTrend(baseInput, 2030, 2020);

      // Should return empty results for reversed range
      expect(result.yearlyScores.length).toBe(0);
    });
  });
});
