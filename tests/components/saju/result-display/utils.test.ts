import { describe, it, expect } from 'vitest';
import { getGanjiName, getElementOfChar, makeKstDateUTC } from '@/components/saju/result-display/utils';

describe('saju/result-display/utils', () => {
  describe('getGanjiName', () => {
    it('should return string value as-is', () => {
      expect(getGanjiName('갑')).toBe('갑');
      expect(getGanjiName('을')).toBe('을');
      expect(getGanjiName('hello')).toBe('hello');
    });

    it('should extract name property from object', () => {
      expect(getGanjiName({ name: '갑' })).toBe('갑');
      expect(getGanjiName({ name: '을목' })).toBe('을목');
    });

    it('should return empty string for invalid input', () => {
      expect(getGanjiName(null)).toBe('');
      expect(getGanjiName(undefined)).toBe('');
      expect(getGanjiName({})).toBe('');
      expect(getGanjiName(123)).toBe('');
    });

    it('should handle object with name property', () => {
      const obj = { name: '병화', other: 'data' };
      expect(getGanjiName(obj)).toBe('병화');
    });

    it('should handle nested object', () => {
      const nested = { name: '정화', nested: { value: 'test' } };
      expect(getGanjiName(nested)).toBe('정화');
    });
  });

  describe('getElementOfChar', () => {
    describe('heavenly stems (천간)', () => {
      it('should return Wood for 갑/을', () => {
        expect(getElementOfChar('갑')).toBe('Wood');
        expect(getElementOfChar('을')).toBe('Wood');
      });

      it('should return Fire for 병/정', () => {
        expect(getElementOfChar('병')).toBe('Fire');
        expect(getElementOfChar('정')).toBe('Fire');
      });

      it('should return Earth for 무/기', () => {
        expect(getElementOfChar('무')).toBe('Earth');
        expect(getElementOfChar('기')).toBe('Earth');
      });

      it('should return Metal for 경/신', () => {
        expect(getElementOfChar('경')).toBe('Metal');
        expect(getElementOfChar('신')).toBe('Metal');
      });

      it('should return Water for 임/계', () => {
        expect(getElementOfChar('임')).toBe('Water');
        expect(getElementOfChar('계')).toBe('Water');
      });

      it('should handle Chinese characters for stems', () => {
        expect(getElementOfChar('甲')).toBe('Wood');
        expect(getElementOfChar('乙')).toBe('Wood');
        expect(getElementOfChar('丙')).toBe('Fire');
        expect(getElementOfChar('丁')).toBe('Fire');
        expect(getElementOfChar('戊')).toBe('Earth');
        expect(getElementOfChar('己')).toBe('Earth');
        expect(getElementOfChar('庚')).toBe('Metal');
        expect(getElementOfChar('辛')).toBe('Metal');
        expect(getElementOfChar('壬')).toBe('Water');
        expect(getElementOfChar('癸')).toBe('Water');
      });
    });

    describe('earthly branches (지지)', () => {
      it('should return Water for 자/해', () => {
        expect(getElementOfChar('자')).toBe('Water');
        expect(getElementOfChar('해')).toBe('Water');
      });

      it('should return Earth for 축/진/미/술', () => {
        expect(getElementOfChar('축')).toBe('Earth');
        expect(getElementOfChar('진')).toBe('Earth');
        expect(getElementOfChar('미')).toBe('Earth');
        expect(getElementOfChar('술')).toBe('Earth');
      });

      it('should return Wood for 인/묘', () => {
        expect(getElementOfChar('인')).toBe('Wood');
        expect(getElementOfChar('묘')).toBe('Wood');
      });

      it('should return Fire for 사/오', () => {
        expect(getElementOfChar('사')).toBe('Fire');
        expect(getElementOfChar('오')).toBe('Fire');
      });

      it('should return Metal for 신/유', () => {
        // Note: 신 appears in both stems (Metal) and branches (Metal)
        expect(getElementOfChar('유')).toBe('Metal');
      });

      it('should handle Chinese characters for branches', () => {
        expect(getElementOfChar('子')).toBe('Water');
        expect(getElementOfChar('丑')).toBe('Earth');
        expect(getElementOfChar('寅')).toBe('Wood');
        expect(getElementOfChar('卯')).toBe('Wood');
        expect(getElementOfChar('辰')).toBe('Earth');
        expect(getElementOfChar('巳')).toBe('Fire');
        expect(getElementOfChar('午')).toBe('Fire');
        expect(getElementOfChar('未')).toBe('Earth');
        expect(getElementOfChar('申')).toBe('Metal');
        expect(getElementOfChar('酉')).toBe('Metal');
        expect(getElementOfChar('戌')).toBe('Earth');
        expect(getElementOfChar('亥')).toBe('Water');
      });
    });

    it('should return null for unknown characters', () => {
      expect(getElementOfChar('unknown')).toBeNull();
      expect(getElementOfChar('abc')).toBeNull();
      expect(getElementOfChar('123')).toBeNull();
      expect(getElementOfChar('')).toBeNull();
    });

    it('should prioritize stem element when character exists in both', () => {
      // 신 exists in both stemElement and branchElement
      // Should return stemElement first
      const result = getElementOfChar('신');
      expect(result).toBe('Metal');
    });
  });

  describe('makeKstDateUTC', () => {
    it('should create UTC date with KST noon time', () => {
      const date = makeKstDateUTC(2023, 0, 1); // Jan 1, 2023
      expect(date.getUTCFullYear()).toBe(2023);
      expect(date.getUTCMonth()).toBe(0);
      expect(date.getUTCDate()).toBe(1);
      expect(date.getUTCHours()).toBe(15);
      expect(date.getUTCMinutes()).toBe(0);
      expect(date.getUTCSeconds()).toBe(0);
      expect(date.getUTCMilliseconds()).toBe(0);
    });

    it('should handle different months', () => {
      for (let month = 0; month < 12; month++) {
        const date = makeKstDateUTC(2023, month, 15);
        expect(date.getUTCMonth()).toBe(month);
        expect(date.getUTCDate()).toBe(15);
      }
    });

    it('should handle different years', () => {
      const years = [2020, 2021, 2022, 2023, 2024];
      years.forEach(year => {
        const date = makeKstDateUTC(year, 5, 15);
        expect(date.getUTCFullYear()).toBe(year);
      });
    });

    it('should handle different days', () => {
      const date1 = makeKstDateUTC(2023, 0, 1); // January has 31 days
      const date28 = makeKstDateUTC(2023, 1, 28); // February 28
      const date30 = makeKstDateUTC(2023, 3, 30); // April 30

      expect(date1.getUTCDate()).toBe(1);
      expect(date28.getUTCDate()).toBe(28);
      expect(date30.getUTCDate()).toBe(30);
    });

    it('should always use 15:00:00.000 UTC time', () => {
      const dates = [
        makeKstDateUTC(2023, 0, 1),
        makeKstDateUTC(2023, 6, 15),
        makeKstDateUTC(2023, 11, 31),
      ];

      dates.forEach(date => {
        expect(date.getUTCHours()).toBe(15);
        expect(date.getUTCMinutes()).toBe(0);
        expect(date.getUTCSeconds()).toBe(0);
        expect(date.getUTCMilliseconds()).toBe(0);
      });
    });

    it('should create valid Date objects', () => {
      const date = makeKstDateUTC(2023, 5, 15);
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBeGreaterThan(0);
    });

    it('should handle leap year', () => {
      const leapDay = makeKstDateUTC(2024, 1, 29); // Feb 29, 2024
      expect(leapDay.getUTCFullYear()).toBe(2024);
      expect(leapDay.getUTCMonth()).toBe(1);
      expect(leapDay.getUTCDate()).toBe(29);
    });

    it('should handle year boundaries', () => {
      const newYear = makeKstDateUTC(2023, 0, 1);
      const yearEnd = makeKstDateUTC(2023, 11, 31);

      expect(newYear.getUTCMonth()).toBe(0);
      expect(newYear.getUTCDate()).toBe(1);
      expect(yearEnd.getUTCMonth()).toBe(11);
      expect(yearEnd.getUTCDate()).toBe(31);
    });
  });

  describe('edge cases', () => {
    it('should handle getGanjiName with array', () => {
      expect(getGanjiName([])).toBe('');
      expect(getGanjiName(['갑'])).toBe('');
    });

    it('should handle getElementOfChar with special characters', () => {
      expect(getElementOfChar(' ')).toBeNull();
      expect(getElementOfChar('\n')).toBeNull();
      expect(getElementOfChar('\t')).toBeNull();
    });

    it('should handle makeKstDateUTC with reasonable dates', () => {
      // Test a reasonable date range
      const date2000 = makeKstDateUTC(2000, 0, 1);
      expect(date2000.getUTCFullYear()).toBe(2000);

      const date2050 = makeKstDateUTC(2050, 11, 31);
      expect(date2050.getUTCFullYear()).toBe(2050);
    });
  });
});
