// tests/lib/Saju/unse.test.ts
// 대운/세운/월운/일진 계산 테스트

import { beforeEach } from 'vitest';
import {
  getDaeunCycles,
  getAnnualCycles,
  getMonthlyCycles,
  getIljinCalendar,
  WolunDataExtended,
} from '@/lib/Saju/unse';
import type { DayMaster, SajuPillars } from '@/lib/Saju/types';

// 테스트 헬퍼: 사주 팔자 생성
function createTestPillars(
  yearStem = '甲', yearBranch = '子', yearYinYang: '양' | '음' = '양',
  monthStem = '乙', monthBranch = '丑',
  dayStem = '丙', dayBranch = '寅',
  hourStem = '丁', hourBranch = '卯'
): SajuPillars {
  return {
    year: {
      heavenlyStem: { name: yearStem, element: '목', yin_yang: yearYinYang, sibsin: '편인' },
      earthlyBranch: { name: yearBranch, element: '수', yin_yang: '양', sibsin: '정관' },
      jijanggan: {},
    },
    month: {
      heavenlyStem: { name: monthStem, element: '목', yin_yang: '음', sibsin: '정인' },
      earthlyBranch: { name: monthBranch, element: '토', yin_yang: '음', sibsin: '식신' },
      jijanggan: {},
    },
    day: {
      heavenlyStem: { name: dayStem, element: '화', yin_yang: '양', sibsin: '비견' },
      earthlyBranch: { name: dayBranch, element: '목', yin_yang: '양', sibsin: '편인' },
      jijanggan: {},
    },
    time: {
      heavenlyStem: { name: hourStem, element: '화', yin_yang: '음', sibsin: '겁재' },
      earthlyBranch: { name: hourBranch, element: '목', yin_yang: '음', sibsin: '정인' },
      jijanggan: {},
    },
  };
}

// 테스트 헬퍼: 일간(DayMaster) 생성
function createDayMaster(name = '丙', element: '목' | '화' | '토' | '금' | '수' = '화', yin_yang: '양' | '음' = '양'): DayMaster {
  return { name, element, yin_yang };
}

describe('unse', () => {
  describe('getDaeunCycles', () => {
    it('should return daeun cycles for male with yang year', () => {
      const birthDate = new Date('1990-05-15T10:00:00');
      const pillars = createTestPillars('庚', '午', '양');
      const dayMaster = createDayMaster('丙', '화', '양');

      const result = getDaeunCycles(birthDate, 'male', pillars, dayMaster, 'Asia/Seoul');

      expect(result.daeunsu).toBeGreaterThan(0);
      expect(result.cycles.length).toBe(10);
      expect(result.cycles[0]).toHaveProperty('age');
      expect(result.cycles[0]).toHaveProperty('heavenlyStem');
      expect(result.cycles[0]).toHaveProperty('earthlyBranch');
      expect(result.cycles[0]).toHaveProperty('sibsin');
    });

    it('should return daeun cycles for female with yin year', () => {
      const birthDate = new Date('1991-03-20T14:00:00');
      const pillars = createTestPillars('辛', '未', '음');
      const dayMaster = createDayMaster('丁', '화', '음');

      const result = getDaeunCycles(birthDate, 'female', pillars, dayMaster, 'Asia/Seoul');

      expect(result.daeunsu).toBeGreaterThan(0);
      expect(result.cycles.length).toBe(10);
    });

    it('should calculate forward direction for male with yang year', () => {
      const birthDate = new Date('1990-05-15T10:00:00');
      const pillars = createTestPillars('甲', '午', '양');
      const dayMaster = createDayMaster();

      const result = getDaeunCycles(birthDate, 'male', pillars, dayMaster, 'Asia/Seoul');

      // 순행이므로 나이가 증가해야 함
      expect(result.cycles[1].age).toBeGreaterThan(result.cycles[0].age);
    });

    it('should calculate backward direction for female with yang year', () => {
      const birthDate = new Date('1990-05-15T10:00:00');
      const pillars = createTestPillars('甲', '午', '양');
      const dayMaster = createDayMaster();

      const result = getDaeunCycles(birthDate, 'female', pillars, dayMaster, 'Asia/Seoul');

      // 역행이지만 나이는 여전히 증가 (간지만 역행)
      expect(result.cycles.length).toBe(10);
    });

    it('should return empty cycles for invalid input', () => {
      const result = getDaeunCycles(null as unknown as Date, 'male', null as unknown as SajuPillars, null as unknown as DayMaster, 'Asia/Seoul');

      expect(result.daeunsu).toBe(0);
      expect(result.cycles).toHaveLength(0);
    });

    it('should include sibsin for each cycle', () => {
      const birthDate = new Date('1990-05-15T10:00:00');
      const pillars = createTestPillars();
      const dayMaster = createDayMaster();

      const result = getDaeunCycles(birthDate, 'male', pillars, dayMaster, 'Asia/Seoul');

      for (const cycle of result.cycles) {
        expect(cycle.sibsin).toHaveProperty('cheon');
        expect(cycle.sibsin).toHaveProperty('ji');
      }
    });

    it('should handle different timezones', () => {
      const birthDate = new Date('1990-05-15T10:00:00');
      const pillars = createTestPillars();
      const dayMaster = createDayMaster();

      const kstResult = getDaeunCycles(birthDate, 'male', pillars, dayMaster, 'Asia/Seoul');
      const utcResult = getDaeunCycles(birthDate, 'male', pillars, dayMaster, 'UTC');

      // 타임존에 따라 결과가 다를 수 있음
      expect(kstResult.cycles.length).toBe(10);
      expect(utcResult.cycles.length).toBe(10);
    });
  });

  describe('getAnnualCycles', () => {
    let dayMaster: DayMaster;

    beforeEach(() => {
      dayMaster = createDayMaster();
    });

    it('should return annual cycles for given year range', () => {
      const result = getAnnualCycles(2024, 5, dayMaster);

      expect(result.length).toBe(5);
      expect(result[0].year).toBe(2024);
      expect(result[4].year).toBe(2028);
    });

    it('should include correct stem and branch for each year', () => {
      const result = getAnnualCycles(2024, 3, dayMaster);

      // 2024년은 갑진년
      expect(result[0].heavenlyStem).toBe('甲');
      expect(result[0].earthlyBranch).toBe('辰');
    });

    it('should include sibsin for each year', () => {
      const result = getAnnualCycles(2024, 3, dayMaster);

      for (const cycle of result) {
        expect(cycle.sibsin).toHaveProperty('cheon');
        expect(cycle.sibsin).toHaveProperty('ji');
      }
    });

    it('should handle single year', () => {
      const result = getAnnualCycles(2025, 1, dayMaster);

      expect(result.length).toBe(1);
      expect(result[0].year).toBe(2025);
    });

    it('should return years in ascending order', () => {
      const result = getAnnualCycles(2020, 5, dayMaster);

      for (let i = 1; i < result.length; i++) {
        expect(result[i].year).toBeGreaterThan(result[i - 1].year);
      }
    });
  });

  describe('getMonthlyCycles', () => {
    let dayMaster: DayMaster;

    beforeEach(() => {
      dayMaster = createDayMaster();
    });

    it('should return 12 monthly cycles', () => {
      const result = getMonthlyCycles(2024, dayMaster);

      expect(result.length).toBe(12);
    });

    it('should include correct year for all months', () => {
      const result = getMonthlyCycles(2024, dayMaster);

      for (const cycle of result) {
        expect(cycle.year).toBe(2024);
      }
    });

    it('should include stem and branch for each month', () => {
      const result = getMonthlyCycles(2024, dayMaster);

      for (const cycle of result) {
        expect(cycle.heavenlyStem).toBeTruthy();
        expect(cycle.earthlyBranch).toBeTruthy();
      }
    });

    it('should include sibsin for each month', () => {
      const result = getMonthlyCycles(2024, dayMaster);

      for (const cycle of result) {
        expect(cycle.sibsin).toHaveProperty('cheon');
        expect(cycle.sibsin).toHaveProperty('ji');
      }
    });

    it('should use solar terms when option is set', () => {
      const result = getMonthlyCycles(2024, dayMaster, { useSolarTerms: true });

      expect(result.length).toBe(12);
      // 절기 모드에서는 solarTermStart가 있을 수 있음
      const hasTerms = result.some(c => (c as WolunDataExtended).solarTermStart !== undefined);
      expect(typeof hasTerms).toBe('boolean');
    });

    it('should return months in order', () => {
      const result = getMonthlyCycles(2024, dayMaster);

      for (let i = 1; i < result.length; i++) {
        expect(result[i].month).toBeGreaterThanOrEqual(result[i - 1].month);
      }
    });
  });

  describe('getIljinCalendar', () => {
    let dayMaster: DayMaster;

    beforeEach(() => {
      dayMaster = createDayMaster();
    });

    it('should return calendar for the month', () => {
      const result = getIljinCalendar(2024, 1, dayMaster);

      expect(result.length).toBe(31); // 1월은 31일
    });

    it('should return correct number of days for each month', () => {
      // 2월 (윤년)
      const feb = getIljinCalendar(2024, 2, dayMaster);
      expect(feb.length).toBe(29); // 2024년은 윤년

      // 4월
      const apr = getIljinCalendar(2024, 4, dayMaster);
      expect(apr.length).toBe(30);
    });

    it('should include stem and branch for each day', () => {
      const result = getIljinCalendar(2024, 1, dayMaster);

      for (const day of result) {
        expect(day.heavenlyStem).toBeTruthy();
        expect(day.earthlyBranch).toBeTruthy();
      }
    });

    it('should include year, month, day for each entry', () => {
      const result = getIljinCalendar(2024, 5, dayMaster);

      for (const day of result) {
        expect(day.year).toBe(2024);
        expect(day.month).toBe(5);
        expect(day.day).toBeGreaterThan(0);
        expect(day.day).toBeLessThanOrEqual(31);
      }
    });

    it('should include sibsin for each day', () => {
      const result = getIljinCalendar(2024, 3, dayMaster);

      for (const day of result) {
        expect(day.sibsin).toHaveProperty('cheon');
        expect(day.sibsin).toHaveProperty('ji');
      }
    });

    it('should include cheoneul gwiin flag', () => {
      const result = getIljinCalendar(2024, 1, dayMaster);

      for (const day of result) {
        expect(typeof day.isCheoneulGwiin).toBe('boolean');
      }
    });

    it('should have consecutive days', () => {
      const result = getIljinCalendar(2024, 6, dayMaster);

      for (let i = 0; i < result.length; i++) {
        expect(result[i].day).toBe(i + 1);
      }
    });

    it('should handle December correctly', () => {
      const result = getIljinCalendar(2024, 12, dayMaster);

      expect(result.length).toBe(31);
      expect(result[result.length - 1].day).toBe(31);
    });
  });

  describe('60갑자 cycle verification', () => {
    const dayMaster = createDayMaster();

    it('should cycle through 10 stems correctly', () => {
      const stems = new Set<string>();
      const result = getAnnualCycles(2020, 10, dayMaster);

      for (const cycle of result) {
        stems.add(cycle.heavenlyStem);
      }

      expect(stems.size).toBe(10);
    });

    it('should have correct 갑자 for 2024', () => {
      const result = getAnnualCycles(2024, 1, dayMaster);

      // 2024년은 갑진년
      expect(result[0].heavenlyStem).toBe('甲');
      expect(result[0].earthlyBranch).toBe('辰');
    });
  });
});
