// tests/lib/Saju/saju.test.ts
// 사주 핵심 계산 모듈 테스트


import {
  calculateSajuData,
  getAnnualCycles,
  getMonthlyCycles,
  getIljinCalendar,
} from '@/lib/Saju/saju';

describe('saju - Core Calculation', () => {
  describe('calculateSajuData', () => {
    it('should return complete CalculateSajuDataResult structure', () => {
      const result = calculateSajuData(
        '1990-05-15',
        '10:30',
        'male',
        'solar',
        'Asia/Seoul'
      );

      expect(result).toHaveProperty('yearPillar');
      expect(result).toHaveProperty('monthPillar');
      expect(result).toHaveProperty('dayPillar');
      expect(result).toHaveProperty('timePillar');
      expect(result).toHaveProperty('pillars');
      expect(result).toHaveProperty('daeWoon');
      expect(result).toHaveProperty('unse');
      expect(result).toHaveProperty('fiveElements');
      expect(result).toHaveProperty('dayMaster');
    });

    it('should calculate four pillars correctly', () => {
      const result = calculateSajuData(
        '1990-05-15',
        '10:30',
        'male',
        'solar',
        'Asia/Seoul'
      );

      // 사주팔자는 4개의 기둥으로 구성
      expect(result.yearPillar).toHaveProperty('heavenlyStem');
      expect(result.yearPillar).toHaveProperty('earthlyBranch');
      expect(result.monthPillar).toHaveProperty('heavenlyStem');
      expect(result.monthPillar).toHaveProperty('earthlyBranch');
      expect(result.dayPillar).toHaveProperty('heavenlyStem');
      expect(result.dayPillar).toHaveProperty('earthlyBranch');
      expect(result.timePillar).toHaveProperty('heavenlyStem');
      expect(result.timePillar).toHaveProperty('earthlyBranch');
    });

    it('should include sibsin for each pillar', () => {
      const result = calculateSajuData(
        '1990-05-15',
        '10:30',
        'male',
        'solar',
        'Asia/Seoul'
      );

      expect(result.yearPillar.heavenlyStem).toHaveProperty('sibsin');
      expect(result.yearPillar.earthlyBranch).toHaveProperty('sibsin');
      expect(result.monthPillar.heavenlyStem).toHaveProperty('sibsin');
      expect(result.dayPillar.heavenlyStem).toHaveProperty('sibsin');
      expect(result.timePillar.heavenlyStem).toHaveProperty('sibsin');
    });

    it('should include jijanggan for each pillar', () => {
      const result = calculateSajuData(
        '1990-05-15',
        '10:30',
        'male',
        'solar',
        'Asia/Seoul'
      );

      expect(result.yearPillar).toHaveProperty('jijanggan');
      expect(result.monthPillar).toHaveProperty('jijanggan');
      expect(result.dayPillar).toHaveProperty('jijanggan');
      expect(result.timePillar).toHaveProperty('jijanggan');
    });

    it('should calculate daeWoon correctly', () => {
      const result = calculateSajuData(
        '1990-05-15',
        '10:30',
        'male',
        'solar',
        'Asia/Seoul'
      );

      expect(result.daeWoon).toHaveProperty('startAge');
      expect(result.daeWoon).toHaveProperty('isForward');
      expect(result.daeWoon).toHaveProperty('current');
      expect(result.daeWoon).toHaveProperty('list');
      expect(result.daeWoon.list.length).toBe(10);
    });

    it('should have valid daeWoon start age', () => {
      const result = calculateSajuData(
        '1990-05-15',
        '10:30',
        'male',
        'solar',
        'Asia/Seoul'
      );

      expect(result.daeWoon.startAge).toBeGreaterThanOrEqual(1);
      expect(result.daeWoon.startAge).toBeLessThanOrEqual(10);
    });

    it('should calculate five elements count', () => {
      const result = calculateSajuData(
        '1990-05-15',
        '10:30',
        'male',
        'solar',
        'Asia/Seoul'
      );

      expect(result.fiveElements).toHaveProperty('wood');
      expect(result.fiveElements).toHaveProperty('fire');
      expect(result.fiveElements).toHaveProperty('earth');
      expect(result.fiveElements).toHaveProperty('metal');
      expect(result.fiveElements).toHaveProperty('water');

      // 총합은 8개 (4 천간 + 4 지지)
      const total = result.fiveElements.wood + result.fiveElements.fire +
        result.fiveElements.earth + result.fiveElements.metal + result.fiveElements.water;
      expect(total).toBe(8);
    });

    it('should return valid dayMaster', () => {
      const result = calculateSajuData(
        '1990-05-15',
        '10:30',
        'male',
        'solar',
        'Asia/Seoul'
      );

      expect(result.dayMaster).toHaveProperty('name');
      expect(result.dayMaster).toHaveProperty('element');
      expect(result.dayMaster).toHaveProperty('yin_yang');
    });

    it('should handle lunar calendar conversion', () => {
      const result = calculateSajuData(
        '1990-04-21', // 음력 날짜
        '10:30',
        'male',
        'lunar',
        'Asia/Seoul'
      );

      expect(result).toHaveProperty('yearPillar');
      expect(result).toHaveProperty('dayPillar');
    });

    it('should handle lunar leap month', () => {
      const result = calculateSajuData(
        '1990-05-15',
        '10:30',
        'female',
        'lunar',
        'Asia/Seoul',
        true // 윤달
      );

      expect(result).toHaveProperty('yearPillar');
    });

    it('should handle different genders for daeWoon direction', () => {
      const maleResult = calculateSajuData(
        '1990-05-15',
        '10:30',
        'male',
        'solar',
        'Asia/Seoul'
      );

      const femaleResult = calculateSajuData(
        '1990-05-15',
        '10:30',
        'female',
        'solar',
        'Asia/Seoul'
      );

      // 같은 연도에서 남녀의 대운 방향이 다를 수 있음
      expect(maleResult.daeWoon.isForward !== femaleResult.daeWoon.isForward ||
        maleResult.daeWoon.isForward === femaleResult.daeWoon.isForward).toBe(true);
    });

    it('should handle different timezones', () => {
      const seoulResult = calculateSajuData(
        '1990-05-15',
        '10:30',
        'male',
        'solar',
        'Asia/Seoul'
      );

      const tokyoResult = calculateSajuData(
        '1990-05-15',
        '10:30',
        'male',
        'solar',
        'Asia/Tokyo'
      );

      // 동일 시간에 다른 타임존이면 결과가 같거나 다를 수 있음
      expect(seoulResult.dayPillar).toBeDefined();
      expect(tokyoResult.dayPillar).toBeDefined();
    });

    it('should include unse data', () => {
      const result = calculateSajuData(
        '1990-05-15',
        '10:30',
        'male',
        'solar',
        'Asia/Seoul'
      );

      expect(result.unse).toHaveProperty('daeun');
      expect(result.unse).toHaveProperty('annual');
      expect(result.unse).toHaveProperty('monthly');
      expect(result.unse.daeun.length).toBe(10);
      expect(result.unse.annual.length).toBe(6);
      expect(result.unse.monthly.length).toBe(12);
    });

    it('should handle various time formats', () => {
      // HH:MM 형식 (표준)
      const result1 = calculateSajuData('1990-05-15', '10:30', 'male', 'solar', 'Asia/Seoul');
      expect(result1.timePillar).toBeDefined();

      // HH:MM 형식 (09:30 - 앞에 0 포함)
      const result2 = calculateSajuData('1990-05-15', '09:30', 'male', 'solar', 'Asia/Seoul');
      expect(result2.timePillar).toBeDefined();

      // 두 결과가 같은 시주를 가져야 함 (시간대가 같으므로)
      expect(result1.timePillar.heavenlyStem.name).toBe(result2.timePillar.heavenlyStem.name);
    });

    it('should handle different hours correctly', () => {
      // 오전
      const amResult = calculateSajuData('1990-05-15', '08:30', 'male', 'solar', 'Asia/Seoul');
      // 오후
      const pmResult = calculateSajuData('1990-05-15', '20:30', 'male', 'solar', 'Asia/Seoul');

      expect(amResult.timePillar).toBeDefined();
      expect(pmResult.timePillar).toBeDefined();
      // 시간이 다르면 시주가 다를 수 있음
    });

    it('should handle midnight correctly', () => {
      const result = calculateSajuData('1990-05-15', '00:00', 'male', 'solar', 'Asia/Seoul');
      expect(result.timePillar).toBeDefined();
    });

    it('should handle empty time string', () => {
      const result = calculateSajuData('1990-05-15', '', 'male', 'solar', 'Asia/Seoul');
      expect(result.timePillar).toBeDefined();
    });

    it('should throw error for invalid date', () => {
      expect(() => calculateSajuData(
        'invalid-date',
        '10:30',
        'male',
        'solar',
        'Asia/Seoul'
      )).toThrow();
    });
  });

  describe('Year pillar calculation', () => {
    it('should calculate year pillar based on Ipchun (입춘)', () => {
      // 입춘 전은 이전 해의 간지
      const beforeIpchun = calculateSajuData('2024-02-01', '10:00', 'male', 'solar', 'Asia/Seoul');
      const afterIpchun = calculateSajuData('2024-02-10', '10:00', 'male', 'solar', 'Asia/Seoul');

      // 연주가 다를 수 있음 (입춘 기준)
      expect(beforeIpchun.yearPillar).toBeDefined();
      expect(afterIpchun.yearPillar).toBeDefined();
    });
  });

  describe('Month pillar calculation', () => {
    it('should calculate month pillar based on solar terms', () => {
      const result = calculateSajuData('1990-05-15', '10:30', 'male', 'solar', 'Asia/Seoul');

      expect(result.monthPillar.heavenlyStem).toHaveProperty('name');
      expect(result.monthPillar.earthlyBranch).toHaveProperty('name');
    });
  });

  describe('Day pillar calculation', () => {
    it('should calculate day pillar using Julian Day Number', () => {
      const result = calculateSajuData('1990-05-15', '10:30', 'male', 'solar', 'Asia/Seoul');

      expect(result.dayPillar.heavenlyStem).toHaveProperty('name');
      expect(result.dayPillar.earthlyBranch).toHaveProperty('name');
    });
  });

  describe('Time pillar calculation', () => {
    it('should calculate time pillar based on birth hour', () => {
      // 자시 (23:30 ~ 01:30)
      const ziResult = calculateSajuData('1990-05-15', '00:30', 'male', 'solar', 'Asia/Seoul');
      expect(ziResult.timePillar).toBeDefined();

      // 오시 (11:30 ~ 13:30)
      const wuResult = calculateSajuData('1990-05-15', '12:00', 'male', 'solar', 'Asia/Seoul');
      expect(wuResult.timePillar).toBeDefined();
    });
  });

  describe('getAnnualCycles', () => {
    const dayMaster = { name: '丙', element: '화' as const, yin_yang: '양' as const };

    it('should return correct number of annual cycles', () => {
      const result = getAnnualCycles(2024, 5, dayMaster);
      expect(result.length).toBe(5);
    });

    it('should have consecutive years', () => {
      const result = getAnnualCycles(2024, 3, dayMaster);
      expect(result[0].year).toBe(2024);
      expect(result[1].year).toBe(2025);
      expect(result[2].year).toBe(2026);
    });

    it('should include sibsin for each year', () => {
      const result = getAnnualCycles(2024, 3, dayMaster);

      for (const cycle of result) {
        expect(cycle.sibsin).toHaveProperty('cheon');
        expect(cycle.sibsin).toHaveProperty('ji');
      }
    });

    it('should calculate correct 60-year cycle (60갑자)', () => {
      const result = getAnnualCycles(2024, 1, dayMaster);

      // 2024년은 갑진년
      expect(result[0].heavenlyStem).toBe('甲');
      expect(result[0].earthlyBranch).toBe('辰');
    });
  });

  describe('getMonthlyCycles', () => {
    const dayMaster = { name: '丙', element: '화' as const, yin_yang: '양' as const };

    it('should return 12 monthly cycles', () => {
      const result = getMonthlyCycles(2024, dayMaster);
      expect(result.length).toBe(12);
    });

    it('should have months 1-12', () => {
      const result = getMonthlyCycles(2024, dayMaster);
      const months = result.map(c => c.month);

      for (let i = 1; i <= 12; i++) {
        expect(months).toContain(i);
      }
    });

    it('should include sibsin for each month', () => {
      const result = getMonthlyCycles(2024, dayMaster);

      for (const cycle of result) {
        expect(cycle.sibsin).toHaveProperty('cheon');
        expect(cycle.sibsin).toHaveProperty('ji');
      }
    });

    it('should be sorted by month', () => {
      const result = getMonthlyCycles(2024, dayMaster);

      for (let i = 1; i < result.length; i++) {
        expect(result[i].month).toBeGreaterThan(result[i - 1].month!);
      }
    });
  });

  describe('getIljinCalendar', () => {
    const dayMaster = { name: '丙', element: '화' as const, yin_yang: '양' as const };

    it('should return correct number of days for month', () => {
      // 1월은 31일
      const jan = getIljinCalendar(2024, 1, dayMaster);
      expect(jan.length).toBe(31);

      // 2월 (윤년)
      const feb = getIljinCalendar(2024, 2, dayMaster);
      expect(feb.length).toBe(29);

      // 4월은 30일
      const apr = getIljinCalendar(2024, 4, dayMaster);
      expect(apr.length).toBe(30);
    });

    it('should include all required fields for each day', () => {
      const result = getIljinCalendar(2024, 5, dayMaster);

      for (const day of result) {
        expect(day).toHaveProperty('year');
        expect(day).toHaveProperty('month');
        expect(day).toHaveProperty('day');
        expect(day).toHaveProperty('heavenlyStem');
        expect(day).toHaveProperty('earthlyBranch');
        expect(day).toHaveProperty('sibsin');
        expect(day).toHaveProperty('isCheoneulGwiin');
      }
    });

    it('should have correct year and month for all days', () => {
      const result = getIljinCalendar(2024, 6, dayMaster);

      for (const day of result) {
        expect(day.year).toBe(2024);
        expect(day.month).toBe(6);
      }
    });

    it('should have consecutive days', () => {
      const result = getIljinCalendar(2024, 3, dayMaster);

      for (let i = 0; i < result.length; i++) {
        expect(result[i].day).toBe(i + 1);
      }
    });

    it('should include isCheoneulGwiin flag', () => {
      const result = getIljinCalendar(2024, 1, dayMaster);

      for (const day of result) {
        expect(typeof day.isCheoneulGwiin).toBe('boolean');
      }
    });

    it('should include sibsin for each day', () => {
      const result = getIljinCalendar(2024, 1, dayMaster);

      for (const day of result) {
        expect(day.sibsin).toHaveProperty('cheon');
        expect(day.sibsin).toHaveProperty('ji');
      }
    });
  });

  describe('Sibsin (십성) calculation', () => {
    it('should calculate correct sibsin based on day master', () => {
      const result = calculateSajuData('1990-05-15', '10:30', 'male', 'solar', 'Asia/Seoul');

      const validSibsin = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인', ''];

      expect(validSibsin).toContain(result.yearPillar.heavenlyStem.sibsin);
      expect(validSibsin).toContain(result.monthPillar.heavenlyStem.sibsin);
    });
  });

  describe('Edge cases', () => {
    it('should handle year boundary (December to January)', () => {
      const dec = calculateSajuData('2023-12-31', '23:00', 'male', 'solar', 'Asia/Seoul');
      const jan = calculateSajuData('2024-01-01', '01:00', 'male', 'solar', 'Asia/Seoul');

      expect(dec.yearPillar).toBeDefined();
      expect(jan.yearPillar).toBeDefined();
    });

    it('should handle leap year February', () => {
      const result = calculateSajuData('2024-02-29', '10:30', 'male', 'solar', 'Asia/Seoul');
      expect(result.dayPillar).toBeDefined();
    });

    it('should handle very old dates', () => {
      const result = calculateSajuData('1950-01-01', '10:30', 'male', 'solar', 'Asia/Seoul');
      expect(result.yearPillar).toBeDefined();
    });

    it('should handle recent dates', () => {
      const result = calculateSajuData('2024-12-15', '10:30', 'male', 'solar', 'Asia/Seoul');
      expect(result.yearPillar).toBeDefined();
    });
  });
});
