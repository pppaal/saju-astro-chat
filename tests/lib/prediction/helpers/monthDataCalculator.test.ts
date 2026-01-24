/**
 * MonthDataCalculator Tests
 * 월별 사주 데이터 계산 헬퍼 모듈 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateMonthData,
  calculateMonthsData,
  type MonthData,
  type MonthDataInput,
  type CalculationOptions,
} from '@/lib/prediction/helpers/monthDataCalculator';

// Mock the dependencies
vi.mock('@/lib/prediction/advancedTimingEngine', () => ({
  calculateYearlyGanji: vi.fn((year: number) => ({
    stem: '甲',
    branch: '子',
    fullGanji: '甲子',
    stemIndex: (year - 4) % 10,
    branchIndex: (year - 4) % 12,
  })),
  calculateMonthlyGanji: vi.fn((year: number, month: number) => ({
    stem: '丙',
    branch: '寅',
    fullGanji: '丙寅',
    stemIndex: ((year - 4) * 12 + month + 1) % 10,
    branchIndex: (month + 1) % 12,
  })),
  calculatePreciseTwelveStage: vi.fn(() => ({
    stage: '장생',
    stageIndex: 1,
    strength: 'strong',
    description: '시작의 기운',
  })),
  calculateSibsin: vi.fn(() => '정인'),
}));

vi.mock('@/lib/prediction/ultraPrecisionEngine', () => ({
  getSolarTermForDate: vi.fn((date: Date) => {
    const month = date.getMonth() + 1;
    if (month === 2) return { name: '입춘', date: new Date(date.getFullYear(), 1, 4) };
    if (month === 6) return { name: '하지', date: new Date(date.getFullYear(), 5, 21) };
    return null;
  }),
  PrecisionEngine: {
    getSolarTermMonth: vi.fn((date: Date) => date.getMonth() + 1),
  },
}));

describe('MonthDataCalculator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateMonthData', () => {
    const defaultInput: MonthDataInput = {
      birthYear: 1990,
      dayStem: '甲',
    };

    describe('basic calculations', () => {
      it('should calculate month data with correct year and month', () => {
        const result = calculateMonthData(defaultInput, 2024, 6);

        expect(result.year).toBe(2024);
        expect(result.month).toBe(6);
      });

      it('should calculate age correctly', () => {
        const result = calculateMonthData(defaultInput, 2024, 6);

        expect(result.age).toBe(34); // 2024 - 1990
      });

      it('should calculate age for different birth years', () => {
        const input2000: MonthDataInput = { birthYear: 2000, dayStem: '甲' };
        const result = calculateMonthData(input2000, 2024, 6);

        expect(result.age).toBe(24); // 2024 - 2000
      });
    });

    describe('date calculations', () => {
      it('should set correct month start date', () => {
        const result = calculateMonthData(defaultInput, 2024, 6);

        expect(result.monthStart.getFullYear()).toBe(2024);
        expect(result.monthStart.getMonth()).toBe(5); // June (0-indexed)
        expect(result.monthStart.getDate()).toBe(1);
      });

      it('should set correct month end date', () => {
        const result = calculateMonthData(defaultInput, 2024, 6);

        expect(result.monthEnd.getFullYear()).toBe(2024);
        expect(result.monthEnd.getMonth()).toBe(5); // June
        expect(result.monthEnd.getDate()).toBe(30); // June has 30 days
      });

      it('should handle February end date in leap year', () => {
        const result = calculateMonthData(defaultInput, 2024, 2);

        expect(result.monthEnd.getMonth()).toBe(1); // February
        expect(result.monthEnd.getDate()).toBe(29); // Leap year
      });

      it('should handle February end date in non-leap year', () => {
        const result = calculateMonthData(defaultInput, 2023, 2);

        expect(result.monthEnd.getMonth()).toBe(1);
        expect(result.monthEnd.getDate()).toBe(28);
      });

      it('should set mid-month date to 15th', () => {
        const result = calculateMonthData(defaultInput, 2024, 6);

        expect(result.midMonth.getFullYear()).toBe(2024);
        expect(result.midMonth.getMonth()).toBe(5);
        expect(result.midMonth.getDate()).toBe(15);
      });
    });

    describe('ganji calculations', () => {
      it('should include month ganji', () => {
        const result = calculateMonthData(defaultInput, 2024, 6);

        expect(result.monthGanji).toBeDefined();
        expect(result.monthGanji.stem).toBeDefined();
        expect(result.monthGanji.branch).toBeDefined();
      });

      it('should include year ganji', () => {
        const result = calculateMonthData(defaultInput, 2024, 6);

        expect(result.yearGanji).toBeDefined();
        expect(result.yearGanji.stem).toBeDefined();
        expect(result.yearGanji.branch).toBeDefined();
      });
    });

    describe('twelve stage calculation', () => {
      it('should include twelve stage data', () => {
        const result = calculateMonthData(defaultInput, 2024, 6);

        expect(result.twelveStage).toBeDefined();
        expect(result.twelveStage.stage).toBeDefined();
      });
    });

    describe('sibsin calculation', () => {
      it('should include sibsin data', () => {
        const result = calculateMonthData(defaultInput, 2024, 6);

        expect(result.sibsin).toBeDefined();
      });
    });

    describe('solar term options', () => {
      it('should include solar term by default', () => {
        const result = calculateMonthData(defaultInput, 2024, 2);

        expect(result.solarTerm).not.toBeNull();
      });

      it('should include solar term when useSolarTerms is true', () => {
        const result = calculateMonthData(defaultInput, 2024, 2, { useSolarTerms: true });

        expect(result.solarTerm).not.toBeNull();
      });

      it('should not include solar term when useSolarTerms is false', () => {
        const result = calculateMonthData(defaultInput, 2024, 2, { useSolarTerms: false });

        expect(result.solarTerm).toBeNull();
      });

      it('should calculate solar term month when useSolarTerms is true', () => {
        const result = calculateMonthData(defaultInput, 2024, 6, { useSolarTerms: true });

        expect(result.solarTermMonth).toBeDefined();
      });

      it('should use regular month when useSolarTerms is false', () => {
        const result = calculateMonthData(defaultInput, 2024, 6, { useSolarTerms: false });

        expect(result.solarTermMonth).toBe(6);
      });
    });

    describe('edge cases', () => {
      it('should handle January correctly', () => {
        const result = calculateMonthData(defaultInput, 2024, 1);

        expect(result.month).toBe(1);
        expect(result.monthStart.getMonth()).toBe(0);
        expect(result.monthEnd.getDate()).toBe(31);
      });

      it('should handle December correctly', () => {
        const result = calculateMonthData(defaultInput, 2024, 12);

        expect(result.month).toBe(12);
        expect(result.monthStart.getMonth()).toBe(11);
        expect(result.monthEnd.getDate()).toBe(31);
      });

      it('should handle months with 31 days', () => {
        const thirtyOneDayMonths = [1, 3, 5, 7, 8, 10, 12];

        thirtyOneDayMonths.forEach((month) => {
          const result = calculateMonthData(defaultInput, 2024, month);
          expect(result.monthEnd.getDate()).toBe(31);
        });
      });

      it('should handle months with 30 days', () => {
        const thirtyDayMonths = [4, 6, 9, 11];

        thirtyDayMonths.forEach((month) => {
          const result = calculateMonthData(defaultInput, 2024, month);
          expect(result.monthEnd.getDate()).toBe(30);
        });
      });
    });

    describe('different day stems', () => {
      it('should work with different day stems', () => {
        const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

        stems.forEach((dayStem) => {
          const input: MonthDataInput = { birthYear: 1990, dayStem };
          const result = calculateMonthData(input, 2024, 6);

          expect(result).toBeDefined();
          expect(result.year).toBe(2024);
        });
      });
    });
  });

  describe('calculateMonthsData', () => {
    const defaultInput: MonthDataInput = {
      birthYear: 1990,
      dayStem: '甲',
    };

    describe('basic functionality', () => {
      it('should return array of month data', () => {
        const result = calculateMonthsData(defaultInput, 2024, 2024);

        expect(Array.isArray(result)).toBe(true);
      });

      it('should calculate 12 months for single year', () => {
        const result = calculateMonthsData(defaultInput, 2024, 2024);

        expect(result).toHaveLength(12);
      });

      it('should calculate 24 months for two years', () => {
        const result = calculateMonthsData(defaultInput, 2024, 2025);

        expect(result).toHaveLength(24);
      });

      it('should calculate 36 months for three years', () => {
        const result = calculateMonthsData(defaultInput, 2024, 2026);

        expect(result).toHaveLength(36);
      });
    });

    describe('order and completeness', () => {
      it('should start with January of start year', () => {
        const result = calculateMonthsData(defaultInput, 2024, 2025);

        expect(result[0].year).toBe(2024);
        expect(result[0].month).toBe(1);
      });

      it('should end with December of end year', () => {
        const result = calculateMonthsData(defaultInput, 2024, 2025);

        const lastItem = result[result.length - 1];
        expect(lastItem.year).toBe(2025);
        expect(lastItem.month).toBe(12);
      });

      it('should have months in sequential order', () => {
        const result = calculateMonthsData(defaultInput, 2024, 2024);

        for (let i = 0; i < 12; i++) {
          expect(result[i].month).toBe(i + 1);
        }
      });

      it('should correctly transition between years', () => {
        const result = calculateMonthsData(defaultInput, 2024, 2025);

        // December 2024 is index 11
        expect(result[11].year).toBe(2024);
        expect(result[11].month).toBe(12);

        // January 2025 is index 12
        expect(result[12].year).toBe(2025);
        expect(result[12].month).toBe(1);
      });
    });

    describe('options propagation', () => {
      it('should pass options to each month calculation', () => {
        const result = calculateMonthsData(defaultInput, 2024, 2024, { useSolarTerms: false });

        result.forEach((monthData) => {
          expect(monthData.solarTerm).toBeNull();
        });
      });

      it('should use default options when not specified', () => {
        const result = calculateMonthsData(defaultInput, 2024, 2024);

        // February has solar term in our mock
        const february = result.find((m) => m.month === 2);
        expect(february?.solarTerm).not.toBeNull();
      });
    });

    describe('data consistency', () => {
      it('should calculate correct age for each month', () => {
        const result = calculateMonthsData(defaultInput, 2024, 2025);

        // All months in 2024 should have age 34
        result.filter((m) => m.year === 2024).forEach((monthData) => {
          expect(monthData.age).toBe(34);
        });

        // All months in 2025 should have age 35
        result.filter((m) => m.year === 2025).forEach((monthData) => {
          expect(monthData.age).toBe(35);
        });
      });

      it('should have unique month data for each entry', () => {
        const result = calculateMonthsData(defaultInput, 2024, 2024);

        // Each month should have unique month value
        const months = result.map((m) => m.month);
        const uniqueMonths = new Set(months);
        expect(uniqueMonths.size).toBe(12);
      });
    });

    describe('edge cases', () => {
      it('should handle same start and end year', () => {
        const result = calculateMonthsData(defaultInput, 2024, 2024);

        expect(result).toHaveLength(12);
        expect(result.every((m) => m.year === 2024)).toBe(true);
      });

      it('should handle long range (5 years)', () => {
        const result = calculateMonthsData(defaultInput, 2024, 2028);

        expect(result).toHaveLength(60); // 5 years × 12 months
      });

      it('should work with different birth years', () => {
        const input: MonthDataInput = { birthYear: 2000, dayStem: '甲' };
        const result = calculateMonthsData(input, 2024, 2024);

        expect(result[0].age).toBe(24);
      });
    });

    describe('return type structure', () => {
      it('should return proper MonthData structure for each element', () => {
        const result = calculateMonthsData(defaultInput, 2024, 2024);

        result.forEach((monthData) => {
          expect(monthData).toHaveProperty('year');
          expect(monthData).toHaveProperty('month');
          expect(monthData).toHaveProperty('age');
          expect(monthData).toHaveProperty('monthStart');
          expect(monthData).toHaveProperty('monthEnd');
          expect(monthData).toHaveProperty('midMonth');
          expect(monthData).toHaveProperty('monthGanji');
          expect(monthData).toHaveProperty('yearGanji');
          expect(monthData).toHaveProperty('twelveStage');
          expect(monthData).toHaveProperty('sibsin');
          expect(monthData).toHaveProperty('solarTerm');
          expect(monthData).toHaveProperty('solarTermMonth');
        });
      });
    });
  });

  describe('type exports', () => {
    it('should export MonthData type', () => {
      const monthData: MonthData = {
        year: 2024,
        month: 6,
        age: 34,
        monthStart: new Date(2024, 5, 1),
        monthEnd: new Date(2024, 5, 30),
        midMonth: new Date(2024, 5, 15),
        monthGanji: { stem: '甲', branch: '子', fullGanji: '甲子', stemIndex: 0, branchIndex: 0 },
        yearGanji: { stem: '甲', branch: '子', fullGanji: '甲子', stemIndex: 0, branchIndex: 0 },
        twelveStage: { stage: '장생', stageIndex: 1, strength: 'strong', description: '' } as any,
        sibsin: '정인' as any,
        solarTerm: null,
        solarTermMonth: 6,
      };

      expect(monthData.year).toBe(2024);
    });

    it('should export MonthDataInput type', () => {
      const input: MonthDataInput = {
        birthYear: 1990,
        dayStem: '甲',
      };

      expect(input.birthYear).toBe(1990);
    });

    it('should export CalculationOptions type', () => {
      const options: CalculationOptions = {
        useSolarTerms: true,
      };

      expect(options.useSolarTerms).toBe(true);
    });
  });
});
