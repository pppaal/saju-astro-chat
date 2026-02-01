import { describe, it, expect, vi } from 'vitest';
import { analyzeLifeCycles } from '@/lib/prediction/life-prediction/lifecycle/analyzer';

// Mock the text-generators module
vi.mock('@/lib/prediction/life-prediction/formatters/text-generators', () => ({
  generatePhaseTheme: vi.fn((daeun: any, energy: string) => `Theme for ${daeun.stem}${daeun.branch} (${energy})`),
  generatePhaseRecommendations: vi.fn((energy: string, element: string) => [`Recommendation for ${energy} ${element}`]),
}));

describe('analyzeLifeCycles', () => {
  const makeDaeun = (stem: string, branch: string, element: string, startAge: number, endAge: number) => ({
    stem,
    branch,
    element,
    startAge,
    endAge,
  });

  const makeYearlyScore = (year: number, score: number, daeun: any) => ({
    year,
    score,
    daeun,
  });

  it('should return empty array for empty inputs', () => {
    expect(analyzeLifeCycles([], [])).toEqual([]);
  });

  it('should create phases grouped by daeun', () => {
    const daeun1 = makeDaeun('甲', '子', 'wood', 10, 19);
    const daeun2 = makeDaeun('乙', '丑', 'wood', 20, 29);

    const yearlyScores = [
      makeYearlyScore(2000, 75, daeun1),
      makeYearlyScore(2001, 80, daeun1),
      makeYearlyScore(2010, 50, daeun2),
      makeYearlyScore(2011, 45, daeun2),
    ];

    const result = analyzeLifeCycles(yearlyScores as any, [daeun1, daeun2] as any);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('甲子 대운');
    expect(result[1].name).toBe('乙丑 대운');
  });

  it('should set start and end years from yearly scores', () => {
    const daeun = makeDaeun('甲', '子', 'wood', 10, 19);
    const yearlyScores = [
      makeYearlyScore(2000, 70, daeun),
      makeYearlyScore(2001, 75, daeun),
      makeYearlyScore(2002, 80, daeun),
    ];

    const result = analyzeLifeCycles(yearlyScores as any, [daeun] as any);
    expect(result[0].startYear).toBe(2000);
    expect(result[0].endYear).toBe(2002);
  });

  it('should set startAge and endAge from daeun', () => {
    const daeun = makeDaeun('甲', '子', 'wood', 15, 24);
    const yearlyScores = [makeYearlyScore(2005, 60, daeun)];

    const result = analyzeLifeCycles(yearlyScores as any, [daeun] as any);
    expect(result[0].startAge).toBe(15);
    expect(result[0].endAge).toBe(24);
  });

  describe('energy level classification', () => {
    it('should classify avgScore >= 70 as peak', () => {
      const daeun = makeDaeun('甲', '子', 'fire', 10, 19);
      const yearlyScores = [
        makeYearlyScore(2000, 80, daeun),
        makeYearlyScore(2001, 70, daeun),
      ];

      const result = analyzeLifeCycles(yearlyScores as any, [daeun] as any);
      expect(result[0].energy).toBe('peak');
    });

    it('should classify 55 <= avgScore < 70 as rising', () => {
      const daeun = makeDaeun('乙', '丑', 'earth', 20, 29);
      const yearlyScores = [
        makeYearlyScore(2010, 60, daeun),
        makeYearlyScore(2011, 65, daeun),
      ];

      const result = analyzeLifeCycles(yearlyScores as any, [daeun] as any);
      expect(result[0].energy).toBe('rising');
    });

    it('should classify 40 <= avgScore < 55 as declining', () => {
      const daeun = makeDaeun('丙', '寅', 'fire', 30, 39);
      const yearlyScores = [
        makeYearlyScore(2020, 45, daeun),
        makeYearlyScore(2021, 50, daeun),
      ];

      const result = analyzeLifeCycles(yearlyScores as any, [daeun] as any);
      expect(result[0].energy).toBe('declining');
    });

    it('should classify avgScore < 40 as dormant', () => {
      const daeun = makeDaeun('丁', '卯', 'fire', 40, 49);
      const yearlyScores = [
        makeYearlyScore(2030, 30, daeun),
        makeYearlyScore(2031, 35, daeun),
      ];

      const result = analyzeLifeCycles(yearlyScores as any, [daeun] as any);
      expect(result[0].energy).toBe('dormant');
    });
  });

  it('should skip daeun with no matching yearly scores', () => {
    const daeun1 = makeDaeun('甲', '子', 'wood', 10, 19);
    const daeun2 = makeDaeun('乙', '丑', 'wood', 20, 29);

    const yearlyScores = [
      makeYearlyScore(2000, 75, daeun1),
    ];

    const result = analyzeLifeCycles(yearlyScores as any, [daeun1, daeun2] as any);
    expect(result).toHaveLength(1);
  });

  it('should include theme and recommendations from generators', () => {
    const daeun = makeDaeun('甲', '子', 'wood', 10, 19);
    const yearlyScores = [makeYearlyScore(2000, 75, daeun)];

    const result = analyzeLifeCycles(yearlyScores as any, [daeun] as any);
    expect(result[0].theme).toBe('Theme for 甲子 (peak)');
    expect(result[0].recommendations).toEqual(['Recommendation for peak wood']);
  });

  it('should handle exact boundary scores', () => {
    const daeun70 = makeDaeun('甲', '子', 'wood', 10, 19);
    const daeun55 = makeDaeun('乙', '丑', 'wood', 20, 29);
    const daeun40 = makeDaeun('丙', '寅', 'fire', 30, 39);

    const yearlyScores = [
      makeYearlyScore(2000, 70, daeun70),
      makeYearlyScore(2010, 55, daeun55),
      makeYearlyScore(2020, 40, daeun40),
    ];

    const result = analyzeLifeCycles(yearlyScores as any, [daeun70, daeun55, daeun40] as any);
    expect(result[0].energy).toBe('peak');
    expect(result[1].energy).toBe('rising');
    expect(result[2].energy).toBe('declining');
  });
});
