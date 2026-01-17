/**
 * Daily Fortune Module Tests
 * Tests for daily fortune utilities
 */

import { describe, it, expect } from 'vitest';
import {
  getDailyGanzhi,
  getYearGanzhiDaily,
  getMonthGanzhiDaily,
  getLuckyColorFromElement,
  getLuckyColorRandom,
  getLuckyNumber,
  generateAlerts,
  createDefaultFortuneResult,
  type DailyGanzhiResult,
  type AlertInfo,
} from '@/lib/destiny-map/calendar/daily-fortune';

describe('Daily Ganzhi Functions', () => {
  describe('getDailyGanzhi', () => {
    it('should return valid DailyGanzhiResult', () => {
      const date = new Date(2024, 0, 15);
      const result = getDailyGanzhi(date);

      expect(result).toHaveProperty('stem');
      expect(result).toHaveProperty('branch');
      expect(result).toHaveProperty('stemElement');
      expect(result).toHaveProperty('branchElement');
    });

    it('should return consistent results for same date', () => {
      const date = new Date(2024, 0, 15);
      const result1 = getDailyGanzhi(date);
      const result2 = getDailyGanzhi(date);

      expect(result1.stem).toBe(result2.stem);
      expect(result1.branch).toBe(result2.branch);
    });

    it('should return different results for different dates', () => {
      const date1 = new Date(2024, 0, 15);
      const date2 = new Date(2024, 0, 16);
      const result1 = getDailyGanzhi(date1);
      const result2 = getDailyGanzhi(date2);

      // At least one should be different (could be same stem or branch individually)
      expect(result1.stem !== result2.stem || result1.branch !== result2.branch).toBe(true);
    });

    it('should handle leap years', () => {
      const leapDate = new Date(2024, 1, 29); // Feb 29, 2024
      const result = getDailyGanzhi(leapDate);

      expect(result.stem).toBeDefined();
      expect(result.branch).toBeDefined();
    });

    it('should cycle through 60 day cycle', () => {
      const startDate = new Date(2024, 0, 1);
      const seen = new Set<string>();

      for (let i = 0; i < 60; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const result = getDailyGanzhi(date);
        seen.add(`${result.stem}${result.branch}`);
      }

      // Should have 60 unique combinations in 60 days
      expect(seen.size).toBe(60);
    });
  });

  describe('getYearGanzhiDaily', () => {
    it('should return valid result for any year', () => {
      const result = getYearGanzhiDaily(2024);

      expect(result).toHaveProperty('stem');
      expect(result).toHaveProperty('branch');
      expect(result).toHaveProperty('stemElement');
      expect(result).toHaveProperty('branchElement');
    });

    it('should return 甲子 for 1984', () => {
      const result = getYearGanzhiDaily(1984);
      expect(result.stem).toBe('甲');
      expect(result.branch).toBe('子');
    });

    it('should return consistent results', () => {
      const result1 = getYearGanzhiDaily(2024);
      const result2 = getYearGanzhiDaily(2024);

      expect(result1.stem).toBe(result2.stem);
      expect(result1.branch).toBe(result2.branch);
    });

    it('should cycle through 60 year cycle', () => {
      const result2044 = getYearGanzhiDaily(2044);
      const result1984 = getYearGanzhiDaily(1984);

      expect(result2044.stem).toBe(result1984.stem);
      expect(result2044.branch).toBe(result1984.branch);
    });

    it('should handle negative years', () => {
      const result = getYearGanzhiDaily(1900);
      expect(result.stem).toBeDefined();
      expect(result.branch).toBeDefined();
    });
  });

  describe('getMonthGanzhiDaily', () => {
    it('should return valid result', () => {
      const result = getMonthGanzhiDaily(2024, 1);

      expect(result).toHaveProperty('stem');
      expect(result).toHaveProperty('branch');
      expect(result).toHaveProperty('stemElement');
      expect(result).toHaveProperty('branchElement');
    });

    it('should return different results for different months', () => {
      const jan = getMonthGanzhiDaily(2024, 1);
      const feb = getMonthGanzhiDaily(2024, 2);

      expect(jan.stem !== feb.stem || jan.branch !== feb.branch).toBe(true);
    });

    it('should handle all 12 months', () => {
      for (let month = 1; month <= 12; month++) {
        const result = getMonthGanzhiDaily(2024, month);
        expect(result.stem).toBeDefined();
        expect(result.branch).toBeDefined();
      }
    });

    it('should vary by year', () => {
      const jan2024 = getMonthGanzhiDaily(2024, 1);
      const jan2025 = getMonthGanzhiDaily(2025, 1);

      // Same month in different years should have different stem
      expect(jan2024.stem !== jan2025.stem || jan2024.branch !== jan2025.branch).toBe(true);
    });
  });
});

describe('Lucky Color Functions', () => {
  describe('getLuckyColorFromElement', () => {
    it('should return green for wood', () => {
      expect(getLuckyColorFromElement('wood')).toBe('Green');
    });

    it('should return red for fire', () => {
      expect(getLuckyColorFromElement('fire')).toBe('Red');
    });

    it('should return yellow for earth', () => {
      expect(getLuckyColorFromElement('earth')).toBe('Yellow');
    });

    it('should return white for metal', () => {
      expect(getLuckyColorFromElement('metal')).toBe('White');
    });

    it('should return blue for water', () => {
      expect(getLuckyColorFromElement('water')).toBe('Blue');
    });

    it('should return default for unknown element', () => {
      expect(getLuckyColorFromElement('unknown')).toBe('Green');
    });

    it('should be consistent for same element', () => {
      const result1 = getLuckyColorFromElement('fire');
      const result2 = getLuckyColorFromElement('fire');
      expect(result1).toBe(result2);
    });
  });

  describe('getLuckyColorRandom', () => {
    it('should return valid color for wood', () => {
      const result = getLuckyColorRandom('wood');
      expect(['Green', 'Teal', 'Emerald']).toContain(result);
    });

    it('should return valid color for fire', () => {
      const result = getLuckyColorRandom('fire');
      expect(['Red', 'Orange', 'Pink']).toContain(result);
    });

    it('should return valid color for earth', () => {
      const result = getLuckyColorRandom('earth');
      expect(['Yellow', 'Brown', 'Beige']).toContain(result);
    });

    it('should return valid color for metal', () => {
      const result = getLuckyColorRandom('metal');
      expect(['White', 'Silver', 'Gold']).toContain(result);
    });

    it('should return valid color for water', () => {
      const result = getLuckyColorRandom('water');
      expect(['Blue', 'Black', 'Navy']).toContain(result);
    });

    it('should return default for unknown element', () => {
      const result = getLuckyColorRandom('unknown');
      expect(['Green', 'Teal', 'Emerald']).toContain(result);
    });
  });
});

describe('Lucky Number Function', () => {
  describe('getLuckyNumber', () => {
    it('should return number between 1 and 9', () => {
      const targetDate = new Date(2024, 0, 15);
      const birthDate = new Date(1990, 5, 20);
      const result = getLuckyNumber(targetDate, birthDate);

      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(9);
    });

    it('should be consistent for same inputs', () => {
      const targetDate = new Date(2024, 0, 15);
      const birthDate = new Date(1990, 5, 20);

      const result1 = getLuckyNumber(targetDate, birthDate);
      const result2 = getLuckyNumber(targetDate, birthDate);

      expect(result1).toBe(result2);
    });

    it('should vary by target date', () => {
      const birthDate = new Date(1990, 5, 20);
      const results = new Set<number>();

      for (let i = 0; i < 10; i++) {
        const targetDate = new Date(2024, 0, i + 1);
        results.add(getLuckyNumber(targetDate, birthDate));
      }

      // Should have some variation
      expect(results.size).toBeGreaterThan(1);
    });

    it('should vary by birth date', () => {
      const targetDate = new Date(2024, 0, 15);
      const results = new Set<number>();

      for (let i = 1; i <= 10; i++) {
        const birthDate = new Date(1990, 5, i);
        results.add(getLuckyNumber(targetDate, birthDate));
      }

      expect(results.size).toBeGreaterThan(1);
    });

    it('should handle different years', () => {
      const birthDate = new Date(1990, 5, 20);
      const date2024 = new Date(2024, 0, 15);
      const date2025 = new Date(2025, 0, 15);

      const result1 = getLuckyNumber(date2024, birthDate);
      const result2 = getLuckyNumber(date2025, birthDate);

      expect(result1).toBeGreaterThanOrEqual(1);
      expect(result2).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('Alert Generation', () => {
  describe('generateAlerts', () => {
    it('should return empty array for neutral conditions', () => {
      const result = generateAlerts(2, [], [], false);
      expect(result).toEqual([]);
    });

    it('should add positive alert for grade 0', () => {
      const result = generateAlerts(0, [], [], false);
      expect(result.some(a => a.type === 'positive' && a.msg.includes('천운'))).toBe(true);
    });

    it('should add positive alert for grade 1', () => {
      const result = generateAlerts(1, [], [], false);
      expect(result.some(a => a.type === 'positive' && a.msg.includes('좋은 날'))).toBe(true);
    });

    it('should add warning alert for grade 4', () => {
      const result = generateAlerts(4, [], [], false);
      expect(result.some(a => a.type === 'warning' && a.msg.includes('조심'))).toBe(true);
    });

    it('should add alert for cheoneulGwiin', () => {
      const result = generateAlerts(2, ['cheoneulGwiin'], [], false);
      expect(result.some(a => a.msg.includes('천을귀인'))).toBe(true);
    });

    it('should add alert for dohwaDay', () => {
      const result = generateAlerts(2, ['dohwaDay'], [], false);
      expect(result.some(a => a.type === 'info' && a.msg.includes('도화살'))).toBe(true);
    });

    it('should add alert for mercury retrograde', () => {
      const result = generateAlerts(2, [], ['retrogradeMercury'], false);
      expect(result.some(a => a.type === 'warning' && a.msg.includes('수성 역행'))).toBe(true);
    });

    it('should add alert for cross verification', () => {
      const result = generateAlerts(2, [], [], true);
      expect(result.some(a => a.msg.includes('사주와 점성술이 일치'))).toBe(true);
    });

    it('should combine multiple alerts', () => {
      const result = generateAlerts(0, ['cheoneulGwiin', 'dohwaDay'], ['retrogradeMercury'], true);
      expect(result.length).toBeGreaterThanOrEqual(4);
    });

    it('should include icons in alerts', () => {
      const result = generateAlerts(0, [], [], false);
      result.forEach(alert => {
        expect(alert.icon).toBeDefined();
      });
    });
  });
});

describe('Default Fortune Result', () => {
  describe('createDefaultFortuneResult', () => {
    it('should return complete DefaultFortuneResult', () => {
      const targetDate = new Date(2024, 0, 15);
      const birthDate = new Date(1990, 5, 20);
      const result = createDefaultFortuneResult(70, targetDate, birthDate);

      expect(result).toHaveProperty('overall', 70);
      expect(result).toHaveProperty('love');
      expect(result).toHaveProperty('career');
      expect(result).toHaveProperty('wealth');
      expect(result).toHaveProperty('health');
      expect(result).toHaveProperty('luckyColor');
      expect(result).toHaveProperty('luckyNumber');
      expect(result).toHaveProperty('grade', 3);
      expect(result).toHaveProperty('ganzhi');
      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('crossVerified', false);
      expect(result).toHaveProperty('sajuFactors');
      expect(result).toHaveProperty('astroFactors');
    });

    it('should have scores within valid range', () => {
      const targetDate = new Date(2024, 0, 15);
      const birthDate = new Date(1990, 5, 20);
      const result = createDefaultFortuneResult(70, targetDate, birthDate);

      expect(result.love).toBeGreaterThanOrEqual(60);
      expect(result.love).toBeLessThanOrEqual(80);
      expect(result.career).toBeGreaterThanOrEqual(60);
      expect(result.career).toBeLessThanOrEqual(80);
    });

    it('should have valid ganzhi format', () => {
      const targetDate = new Date(2024, 0, 15);
      const birthDate = new Date(1990, 5, 20);
      const result = createDefaultFortuneResult(70, targetDate, birthDate);

      expect(result.ganzhi).toHaveLength(2);
    });

    it('should have valid lucky number', () => {
      const targetDate = new Date(2024, 0, 15);
      const birthDate = new Date(1990, 5, 20);
      const result = createDefaultFortuneResult(70, targetDate, birthDate);

      expect(result.luckyNumber).toBeGreaterThanOrEqual(1);
      expect(result.luckyNumber).toBeLessThanOrEqual(9);
    });

    it('should have empty arrays for factors', () => {
      const targetDate = new Date(2024, 0, 15);
      const birthDate = new Date(1990, 5, 20);
      const result = createDefaultFortuneResult(70, targetDate, birthDate);

      expect(result.alerts).toEqual([]);
      expect(result.recommendations).toEqual([]);
      expect(result.warnings).toEqual([]);
      expect(result.sajuFactors).toEqual([]);
      expect(result.astroFactors).toEqual([]);
    });

    it('should handle different scores', () => {
      const targetDate = new Date(2024, 0, 15);
      const birthDate = new Date(1990, 5, 20);

      const result50 = createDefaultFortuneResult(50, targetDate, birthDate);
      const result90 = createDefaultFortuneResult(90, targetDate, birthDate);

      expect(result50.overall).toBe(50);
      expect(result90.overall).toBe(90);
    });
  });
});

describe('Type Definitions', () => {
  it('DailyGanzhiResult should have correct structure', () => {
    const result: DailyGanzhiResult = {
      stem: '甲',
      branch: '子',
      stemElement: 'wood',
      branchElement: 'water',
    };

    expect(result.stem).toBeDefined();
    expect(result.branch).toBeDefined();
    expect(result.stemElement).toBeDefined();
    expect(result.branchElement).toBeDefined();
  });

  it('AlertInfo should have correct structure', () => {
    const alert: AlertInfo = {
      type: 'positive',
      msg: 'Test message',
      icon: '🔮',
    };

    expect(alert.type).toBe('positive');
    expect(alert.msg).toBeDefined();
    expect(alert.icon).toBeDefined();
  });

  it('AlertInfo type should be one of valid types', () => {
    const types: AlertInfo['type'][] = ['warning', 'positive', 'info'];
    types.forEach(type => {
      expect(['warning', 'positive', 'info']).toContain(type);
    });
  });
});
