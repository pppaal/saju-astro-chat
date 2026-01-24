/**
 * Ganji Helpers Unit Tests
 * 간지 계산 헬퍼 함수 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  calculateYearMonthGanji,
  findDaeunForAge,
  getDaeunGanji,
  type DaeunCycle,
} from '@/lib/prediction/utils/ganji-helpers';

describe('calculateYearMonthGanji', () => {
  it('should return yearGanji and monthGanji objects', () => {
    const result = calculateYearMonthGanji(2024, 6);

    expect(result).toHaveProperty('yearGanji');
    expect(result).toHaveProperty('monthGanji');
    expect(result.yearGanji).toHaveProperty('stem');
    expect(result.yearGanji).toHaveProperty('branch');
    expect(result.monthGanji).toHaveProperty('stem');
    expect(result.monthGanji).toHaveProperty('branch');
  });

  it('should return valid stem and branch for year 2024', () => {
    const result = calculateYearMonthGanji(2024, 1);

    expect(typeof result.yearGanji.stem).toBe('string');
    expect(typeof result.yearGanji.branch).toBe('string');
    expect(result.yearGanji.stem.length).toBeGreaterThan(0);
    expect(result.yearGanji.branch.length).toBeGreaterThan(0);
  });

  it('should return different month ganji for different months', () => {
    const jan = calculateYearMonthGanji(2024, 1);
    const jun = calculateYearMonthGanji(2024, 6);
    const dec = calculateYearMonthGanji(2024, 12);

    // At least some months should have different stems or branches
    const allSame =
      jan.monthGanji.stem === jun.monthGanji.stem &&
      jun.monthGanji.stem === dec.monthGanji.stem;

    expect(allSame).toBe(false);
  });

  it('should handle boundary months correctly', () => {
    // January
    const jan = calculateYearMonthGanji(2024, 1);
    expect(jan.monthGanji).toBeDefined();

    // December
    const dec = calculateYearMonthGanji(2024, 12);
    expect(dec.monthGanji).toBeDefined();
  });

  it('should return consistent results for same input', () => {
    const result1 = calculateYearMonthGanji(2024, 6);
    const result2 = calculateYearMonthGanji(2024, 6);

    expect(result1).toEqual(result2);
  });
});

describe('findDaeunForAge', () => {
  const createDaeunList = (): DaeunCycle[] => [
    { age: 5, startAge: 5, endAge: 14, heavenlyStem: '갑', earthlyBranch: '인', element: 'wood' },
    { age: 15, startAge: 15, endAge: 24, heavenlyStem: '을', earthlyBranch: '묘', element: 'wood' },
    { age: 25, startAge: 25, endAge: 34, heavenlyStem: '병', earthlyBranch: '오', element: 'fire' },
    { age: 35, startAge: 35, endAge: 44, heavenlyStem: '정', earthlyBranch: '사', element: 'fire' },
    { age: 45, startAge: 45, endAge: 54, heavenlyStem: '무', earthlyBranch: '술', element: 'earth' },
  ];

  it('should return undefined for undefined daeunList', () => {
    const result = findDaeunForAge(undefined, 30);
    expect(result).toBeUndefined();
  });

  it('should return undefined for empty daeunList', () => {
    const result = findDaeunForAge([], 30);
    expect(result).toBeUndefined();
  });

  it('should find correct daeun for age within range', () => {
    const daeunList = createDaeunList();

    const result = findDaeunForAge(daeunList, 28);
    expect(result).toBeDefined();
    expect(result?.startAge).toBe(25);
    expect(result?.endAge).toBe(34);
    expect(result?.heavenlyStem).toBe('병');
  });

  it('should find daeun at start age boundary', () => {
    const daeunList = createDaeunList();

    const result = findDaeunForAge(daeunList, 25);
    expect(result).toBeDefined();
    expect(result?.startAge).toBe(25);
  });

  it('should find daeun at end age boundary', () => {
    const daeunList = createDaeunList();

    const result = findDaeunForAge(daeunList, 34);
    expect(result).toBeDefined();
    expect(result?.endAge).toBe(34);
  });

  it('should return undefined for age before first daeun', () => {
    const daeunList = createDaeunList();

    const result = findDaeunForAge(daeunList, 3);
    expect(result).toBeUndefined();
  });

  it('should return undefined for age after last daeun', () => {
    const daeunList = createDaeunList();

    const result = findDaeunForAge(daeunList, 60);
    expect(result).toBeUndefined();
  });

  it('should use fallback calculation when startAge/endAge not provided', () => {
    const daeunListWithoutRange: DaeunCycle[] = [
      { age: 10, heavenlyStem: '갑', earthlyBranch: '자' },
      { age: 20, heavenlyStem: '을', earthlyBranch: '축' },
      { age: 30, heavenlyStem: '병', earthlyBranch: '인' },
    ];

    // Age 15 should fall within age 10's range (10-19)
    const result = findDaeunForAge(daeunListWithoutRange, 15);
    expect(result).toBeDefined();
    expect(result?.age).toBe(10);
  });
});

describe('getDaeunGanji', () => {
  it('should return undefined for undefined daeun', () => {
    const result = getDaeunGanji(undefined);
    expect(result).toBeUndefined();
  });

  it('should return undefined when heavenlyStem is missing', () => {
    const daeun: DaeunCycle = {
      age: 30,
      earthlyBranch: '오',
    };

    const result = getDaeunGanji(daeun);
    expect(result).toBeUndefined();
  });

  it('should return undefined when earthlyBranch is missing', () => {
    const daeun: DaeunCycle = {
      age: 30,
      heavenlyStem: '병',
    };

    const result = getDaeunGanji(daeun);
    expect(result).toBeUndefined();
  });

  it('should return stem and branch when both are present', () => {
    const daeun: DaeunCycle = {
      age: 30,
      heavenlyStem: '병',
      earthlyBranch: '오',
    };

    const result = getDaeunGanji(daeun);
    expect(result).toBeDefined();
    expect(result?.stem).toBe('병');
    expect(result?.branch).toBe('오');
  });

  it('should work with full daeun data', () => {
    const daeun: DaeunCycle = {
      age: 30,
      startAge: 25,
      endAge: 34,
      heavenlyStem: '병',
      earthlyBranch: '오',
      element: 'fire',
      sibsin: '정관',
    };

    const result = getDaeunGanji(daeun);
    expect(result).toEqual({
      stem: '병',
      branch: '오',
    });
  });
});

describe('integration scenarios', () => {
  it('should find daeun and get ganji together', () => {
    const daeunList: DaeunCycle[] = [
      { age: 25, startAge: 25, endAge: 34, heavenlyStem: '병', earthlyBranch: '오', element: 'fire' },
    ];

    const daeun = findDaeunForAge(daeunList, 30);
    const ganji = getDaeunGanji(daeun);

    expect(ganji).toEqual({
      stem: '병',
      branch: '오',
    });
  });

  it('should handle undefined gracefully in chain', () => {
    const daeunList: DaeunCycle[] = [
      { age: 25, startAge: 25, endAge: 34 }, // Missing stem/branch
    ];

    const daeun = findDaeunForAge(daeunList, 30);
    const ganji = getDaeunGanji(daeun);

    expect(daeun).toBeDefined();
    expect(ganji).toBeUndefined();
  });
});
