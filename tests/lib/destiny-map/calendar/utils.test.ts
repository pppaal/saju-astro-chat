// tests/lib/destiny-map/calendar/utils.test.ts
import { describe, it, expect } from 'vitest';
import {
  isCheoneulGwiin,
  getSipsin,
  isSamjaeYear,
  isYeokmaDay,
  isDohwaDay,
  isGeonrokDay,
  isSonEomneunDay,
  approximateLunarDay,
  normalizeElement,
  calculateDailyGanji,
  calculateYearlyGanjiSimple,
  calculateMonthlyGanjiSimple,
  isYukhap,
  isSamhapPartial,
  isSamhapFull,
  isChung,
  isXing,
  getJijanggan,
  getStemElement,
  getBranchElement,
} from '@/lib/destiny-map/calendar/utils';

describe('calendar utils', () => {
  describe('isCheoneulGwiin', () => {
    it('should return true for valid cheoneul gwiin combinations', () => {
      // 갑(甲)일간의 천을귀인은 축(丑)과 미(未)
      expect(isCheoneulGwiin('甲', '丑')).toBe(true);
      expect(isCheoneulGwiin('甲', '未')).toBe(true);
    });

    it('should return false for invalid combinations', () => {
      expect(isCheoneulGwiin('甲', '子')).toBe(false);
      expect(isCheoneulGwiin('甲', '寅')).toBe(false);
    });

    it('should return false for unknown stem', () => {
      expect(isCheoneulGwiin('X', '丑')).toBe(false);
    });
  });

  describe('getSipsin', () => {
    it('should return sipsin for valid stem combinations', () => {
      // 갑(甲)일간 기준 십신
      const result = getSipsin('甲', '甲');
      expect(typeof result).toBe('string');
    });

    it('should return empty string for unknown stems', () => {
      expect(getSipsin('X', 'Y')).toBe('');
    });
  });

  describe('isSamjaeYear', () => {
    it('should return true for samjae year', () => {
      // 자(子)년생의 삼재년은 사(巳), 오(午), 미(未)
      expect(isSamjaeYear('子', '巳')).toBe(true);
      expect(isSamjaeYear('子', '午')).toBe(true);
      expect(isSamjaeYear('子', '未')).toBe(true);
    });

    it('should return false for non-samjae year', () => {
      expect(isSamjaeYear('子', '寅')).toBe(false);
      expect(isSamjaeYear('子', '申')).toBe(false);
    });

    it('should return false for unknown birth year branch', () => {
      expect(isSamjaeYear('X', '寅')).toBe(false);
    });
  });

  describe('isYeokmaDay', () => {
    it('should return true for yeokma day', () => {
      // 자(子)년생의 역마살은 인(寅)
      expect(isYeokmaDay('子', '寅')).toBe(true);
    });

    it('should return false for non-yeokma day', () => {
      expect(isYeokmaDay('子', '卯')).toBe(false);
    });

    it('should return false for unknown year branch', () => {
      expect(isYeokmaDay('X', '寅')).toBe(false);
    });
  });

  describe('isDohwaDay', () => {
    it('should return true for dohwa day', () => {
      // 자(子)년생의 도화살은 유(酉)
      expect(isDohwaDay('子', '酉')).toBe(true);
    });

    it('should return false for non-dohwa day', () => {
      expect(isDohwaDay('子', '寅')).toBe(false);
    });

    it('should return false for unknown year branch', () => {
      expect(isDohwaDay('X', '酉')).toBe(false);
    });
  });

  describe('isGeonrokDay', () => {
    it('should return true for geonrok day', () => {
      // 갑(甲)일간의 건록은 인(寅)
      expect(isGeonrokDay('甲', '寅')).toBe(true);
    });

    it('should return false for non-geonrok day', () => {
      expect(isGeonrokDay('甲', '卯')).toBe(false);
    });

    it('should return false for unknown day stem', () => {
      expect(isGeonrokDay('X', '寅')).toBe(false);
    });
  });

  describe('isSonEomneunDay', () => {
    it('should return true for lunar days 9, 10, 19, 20, 29, 30', () => {
      expect(isSonEomneunDay(9)).toBe(true);
      expect(isSonEomneunDay(10)).toBe(true);
      expect(isSonEomneunDay(19)).toBe(true);
      expect(isSonEomneunDay(20)).toBe(true);
      expect(isSonEomneunDay(29)).toBe(true);
      expect(isSonEomneunDay(30)).toBe(true);
    });

    it('should return false for other lunar days', () => {
      expect(isSonEomneunDay(1)).toBe(false);
      expect(isSonEomneunDay(5)).toBe(false);
      expect(isSonEomneunDay(15)).toBe(false);
      expect(isSonEomneunDay(25)).toBe(false);
    });
  });

  describe('approximateLunarDay', () => {
    it('should return a number between 1 and 30', () => {
      const date = new Date(2024, 0, 15);
      const result = approximateLunarDay(date);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(30);
    });

    it('should return different values for different dates', () => {
      const date1 = new Date(2024, 0, 1);
      const date2 = new Date(2024, 0, 15);
      const result1 = approximateLunarDay(date1);
      const result2 = approximateLunarDay(date2);
      expect(result1).not.toBe(result2);
    });
  });

  describe('normalizeElement', () => {
    it('should convert air to metal', () => {
      expect(normalizeElement('air')).toBe('metal');
    });

    it('should return other elements unchanged', () => {
      expect(normalizeElement('wood')).toBe('wood');
      expect(normalizeElement('fire')).toBe('fire');
      expect(normalizeElement('earth')).toBe('earth');
      expect(normalizeElement('metal')).toBe('metal');
      expect(normalizeElement('water')).toBe('water');
    });
  });

  describe('calculateDailyGanji', () => {
    it('should return an object with stem and branch', () => {
      const date = new Date(2024, 0, 1);
      const result = calculateDailyGanji(date);
      expect(result).toHaveProperty('stem');
      expect(result).toHaveProperty('branch');
    });

    it('should return valid stem (one of 10 천간)', () => {
      const date = new Date(2024, 0, 1);
      const result = calculateDailyGanji(date);
      const validStems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
      expect(validStems).toContain(result.stem);
    });

    it('should return valid branch (one of 12 지지)', () => {
      const date = new Date(2024, 0, 1);
      const result = calculateDailyGanji(date);
      const validBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
      expect(validBranches).toContain(result.branch);
    });

    it('should return different ganji for consecutive days', () => {
      const date1 = new Date(2024, 0, 1);
      const date2 = new Date(2024, 0, 2);
      const result1 = calculateDailyGanji(date1);
      const result2 = calculateDailyGanji(date2);
      expect(result1.stem !== result2.stem || result1.branch !== result2.branch).toBe(true);
    });
  });

  describe('calculateYearlyGanjiSimple', () => {
    it('should return an object with stem and branch', () => {
      const result = calculateYearlyGanjiSimple(2024);
      expect(result).toHaveProperty('stem');
      expect(result).toHaveProperty('branch');
    });

    it('should return 甲辰 for 2024', () => {
      const result = calculateYearlyGanjiSimple(2024);
      expect(result.stem).toBe('甲');
      expect(result.branch).toBe('辰');
    });

    it('should return 乙巳 for 2025', () => {
      const result = calculateYearlyGanjiSimple(2025);
      expect(result.stem).toBe('乙');
      expect(result.branch).toBe('巳');
    });

    it('should cycle through 60 years', () => {
      const result2024 = calculateYearlyGanjiSimple(2024);
      const result2084 = calculateYearlyGanjiSimple(2084);
      expect(result2024.stem).toBe(result2084.stem);
      expect(result2024.branch).toBe(result2084.branch);
    });
  });

  describe('calculateMonthlyGanjiSimple', () => {
    it('should return an object with stem and branch', () => {
      const result = calculateMonthlyGanjiSimple(2024, 2);
      expect(result).toHaveProperty('stem');
      expect(result).toHaveProperty('branch');
    });

    it('should return valid stem and branch', () => {
      const result = calculateMonthlyGanjiSimple(2024, 1);
      const validStems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
      const validBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
      expect(validStems).toContain(result.stem);
      expect(validBranches).toContain(result.branch);
    });

    it('should return different results for different months', () => {
      const jan = calculateMonthlyGanjiSimple(2024, 1);
      const jun = calculateMonthlyGanjiSimple(2024, 6);
      expect(jan.branch).not.toBe(jun.branch);
    });
  });

  describe('isYukhap', () => {
    it('should return true for yukhap pairs', () => {
      // 육합: 자축(子丑), 인해(寅亥), 묘술(卯戌), 진유(辰酉), 사신(巳申), 오미(午未)
      expect(isYukhap('子', '丑')).toBe(true);
      expect(isYukhap('丑', '子')).toBe(true);
      expect(isYukhap('寅', '亥')).toBe(true);
      expect(isYukhap('卯', '戌')).toBe(true);
    });

    it('should return false for non-yukhap pairs', () => {
      expect(isYukhap('子', '寅')).toBe(false);
      expect(isYukhap('丑', '卯')).toBe(false);
    });
  });

  describe('isSamhapPartial', () => {
    it('should return true for partial samhap (2 out of 3)', () => {
      // 수국삼합: 신(申)-자(子)-진(辰)
      expect(isSamhapPartial(['申', '子'])).toBe(true);
      expect(isSamhapPartial(['子', '辰'])).toBe(true);
      expect(isSamhapPartial(['申', '辰'])).toBe(true);
    });

    it('should return false for no samhap match', () => {
      expect(isSamhapPartial(['子', '丑'])).toBe(false);
      expect(isSamhapPartial(['寅', '丑'])).toBe(false);
    });

    it('should return true for full samhap', () => {
      expect(isSamhapPartial(['申', '子', '辰'])).toBe(true);
    });
  });

  describe('isSamhapFull', () => {
    it('should return element for full samhap', () => {
      // 수국삼합: 신(申)-자(子)-진(辰)
      expect(isSamhapFull(['申', '子', '辰'])).toBe('water');
      // 화국삼합: 인(寅)-오(午)-술(戌)
      expect(isSamhapFull(['寅', '午', '戌'])).toBe('fire');
      // 목국삼합: 해(亥)-묘(卯)-미(未)
      expect(isSamhapFull(['亥', '卯', '未'])).toBe('wood');
      // 금국삼합: 사(巳)-유(酉)-축(丑)
      expect(isSamhapFull(['巳', '酉', '丑'])).toBe('metal');
    });

    it('should return null for partial samhap', () => {
      expect(isSamhapFull(['申', '子'])).toBeNull();
      expect(isSamhapFull(['申', '子', '丑'])).toBeNull();
    });

    it('should return null for no samhap', () => {
      expect(isSamhapFull(['子', '丑', '寅'])).toBeNull();
    });
  });

  describe('isChung', () => {
    it('should return true for chung pairs', () => {
      // 충: 자오(子午), 축미(丑未), 인신(寅申), 묘유(卯酉), 진술(辰戌), 사해(巳亥)
      expect(isChung('子', '午')).toBe(true);
      expect(isChung('午', '子')).toBe(true);
      expect(isChung('丑', '未')).toBe(true);
      expect(isChung('寅', '申')).toBe(true);
    });

    it('should return false for non-chung pairs', () => {
      expect(isChung('子', '丑')).toBe(false);
      expect(isChung('子', '子')).toBe(false);
    });
  });

  describe('isXing', () => {
    it('should return true for xing pairs', () => {
      // 형: 인사(寅巳), 사신(巳申), 인신(寅申) 등
      expect(isXing('寅', '巳')).toBe(true);
      expect(isXing('巳', '申')).toBe(true);
    });

    it('should return false for non-xing pairs', () => {
      expect(isXing('子', '丑')).toBe(false);
    });

    it('should return false for unknown branch', () => {
      expect(isXing('X', 'Y')).toBe(false);
    });
  });

  describe('getJijanggan', () => {
    it('should return array of jijanggan for valid branch', () => {
      const result = getJijanggan('子');
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown branch', () => {
      const result = getJijanggan('X');
      expect(result).toEqual([]);
    });

    it('should return proper jijanggan for 寅 (인)', () => {
      const result = getJijanggan('寅');
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getStemElement', () => {
    it('should return correct element for stems', () => {
      // 갑을 = 목, 병정 = 화, 무기 = 토, 경신 = 금, 임계 = 수
      expect(getStemElement('甲')).toBe('wood');
      expect(getStemElement('乙')).toBe('wood');
      expect(getStemElement('丙')).toBe('fire');
      expect(getStemElement('丁')).toBe('fire');
      expect(getStemElement('戊')).toBe('earth');
      expect(getStemElement('己')).toBe('earth');
      expect(getStemElement('庚')).toBe('metal');
      expect(getStemElement('辛')).toBe('metal');
      expect(getStemElement('壬')).toBe('water');
      expect(getStemElement('癸')).toBe('water');
    });

    it('should return empty string for unknown stem', () => {
      expect(getStemElement('X')).toBe('');
    });
  });

  describe('getBranchElement', () => {
    it('should return correct element for branches', () => {
      // 인묘 = 목, 사오 = 화, 신유 = 금, 해자 = 수, 진술축미 = 토
      expect(getBranchElement('寅')).toBe('wood');
      expect(getBranchElement('卯')).toBe('wood');
      expect(getBranchElement('巳')).toBe('fire');
      expect(getBranchElement('午')).toBe('fire');
      expect(getBranchElement('申')).toBe('metal');
      expect(getBranchElement('酉')).toBe('metal');
      expect(getBranchElement('亥')).toBe('water');
      expect(getBranchElement('子')).toBe('water');
      expect(getBranchElement('辰')).toBe('earth');
      expect(getBranchElement('戌')).toBe('earth');
      expect(getBranchElement('丑')).toBe('earth');
      expect(getBranchElement('未')).toBe('earth');
    });

    it('should return empty string for unknown branch', () => {
      expect(getBranchElement('X')).toBe('');
    });
  });
});
