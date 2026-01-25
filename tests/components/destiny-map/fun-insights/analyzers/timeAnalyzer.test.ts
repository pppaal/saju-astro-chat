/**
 * Time Analyzer Tests
 * 시간 기반 운세 분석 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getTimeBasedFortune } from '@/components/destiny-map/fun-insights/analyzers/timeAnalyzer';
import type { SajuData, AstroData } from '@/components/destiny-map/fun-insights/types';

// Mock data modules
vi.mock('@/components/destiny-map/fun-insights/data', () => ({
  elementTraits: {},
  elementKeyMap: {},
  monthElements: {},
}));

describe('getTimeBasedFortune', () => {
  const realDate = Date;
  const currentYear = 2024;
  const currentMonth = 6; // July (0-indexed)

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Date to return consistent values
    vi.useFakeTimers();
    vi.setSystemTime(new Date(currentYear, currentMonth, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('year fortune', () => {
    it('should return null if no saju or astro data', () => {
      const result = getTimeBasedFortune(undefined, undefined, 'ko');
      expect(result).toBeNull();
    });

    it('should return year fortune from solar return', () => {
      const astro: AstroData = {
        solarReturn: { summary: 'Great year ahead with new opportunities' },
      } as unknown as AstroData;

      const result = getTimeBasedFortune(undefined, astro, 'ko');

      expect(result?.year).toBeDefined();
      expect(result?.year?.message).toContain('opportunities');
      expect(result?.year?.emoji).toBe('☀️');
    });

    it('should return year fortune for 갑/을 (wood) year', () => {
      const saju: SajuData = {
        unse: {
          annual: [{ year: currentYear, ganji: '甲辰' }],
        },
      } as unknown as SajuData;

      const result = getTimeBasedFortune(saju, undefined, 'ko');

      expect(result?.year).toBeDefined();
      expect(result?.year?.message).toContain('새로운');
      expect(result?.year?.advice).toContain('실행');
    });

    it('should return year fortune for 병/정 (fire) year', () => {
      const saju: SajuData = {
        unse: {
          annual: [{ year: currentYear, ganji: '丙辰' }],
        },
      } as unknown as SajuData;

      const result = getTimeBasedFortune(saju, undefined, 'ko');

      expect(result?.year?.message).toContain('숨어');
      expect(result?.year?.advice).toContain('나서세요');
    });

    it('should return year fortune for 무/기 (earth) year', () => {
      const saju: SajuData = {
        unse: {
          annual: [{ year: currentYear, ganji: '戊辰' }],
        },
      } as unknown as SajuData;

      const result = getTimeBasedFortune(saju, undefined, 'ko');

      expect(result?.year?.message).toContain('기반');
      expect(result?.year?.advice).toContain('조급');
    });

    it('should return year fortune for 경/신 (metal) year', () => {
      const saju: SajuData = {
        unse: {
          annual: [{ year: currentYear, ganji: '庚辰' }],
        },
      } as unknown as SajuData;

      const result = getTimeBasedFortune(saju, undefined, 'ko');

      expect(result?.year?.message).toContain('정리');
      expect(result?.year?.advice).toContain('단순');
    });

    it('should return year fortune for 임/계 (water) year', () => {
      const saju: SajuData = {
        unse: {
          annual: [{ year: currentYear, ganji: '壬辰' }],
        },
      } as unknown as SajuData;

      const result = getTimeBasedFortune(saju, undefined, 'ko');

      expect(result?.year?.message).toContain('내실');
      expect(result?.year?.advice).toContain('축적');
    });

    it('should return English year fortune', () => {
      const saju: SajuData = {
        unse: {
          annual: [{ year: currentYear, ganji: '甲辰' }],
        },
      } as unknown as SajuData;

      const result = getTimeBasedFortune(saju, undefined, 'en');

      expect(result?.year?.title).toBe("How's This Year?");
      expect(result?.year?.message).toContain('new');
    });
  });

  describe('month fortune', () => {
    it('should return month fortune from lunar return', () => {
      const astro: AstroData = {
        lunarReturn: { summary: 'This is a detailed lunar return summary that is more than fifty characters long for testing purposes' },
      } as unknown as AstroData;

      const result = getTimeBasedFortune(undefined, astro, 'ko');

      expect(result?.month).toBeDefined();
      expect(result?.month?.emoji).toBe('🌙');
    });

    it('should return month fortune for 갑/을 month', () => {
      const saju: SajuData = {
        unse: {
          monthly: [{ month: currentMonth + 1, ganji: '甲午' }],
        },
      } as unknown as SajuData;

      const result = getTimeBasedFortune(saju, undefined, 'ko');

      expect(result?.month?.message).toContain('시작');
      expect(result?.month?.advice).toContain('망설이지');
    });

    it('should return month fortune for 병/정 month', () => {
      const saju: SajuData = {
        unse: {
          monthly: [{ month: currentMonth + 1, ganji: '丙午' }],
        },
      } as unknown as SajuData;

      const result = getTimeBasedFortune(saju, undefined, 'ko');

      expect(result?.month?.message).toContain('보여줘야');
    });

    it('should return month fortune for 무/기 month', () => {
      const saju: SajuData = {
        unse: {
          monthly: [{ month: currentMonth + 1, ganji: '戊午' }],
        },
      } as unknown as SajuData;

      const result = getTimeBasedFortune(saju, undefined, 'ko');

      expect(result?.month?.message).toContain('안정적');
    });

    it('should return month fortune for 경/신 month', () => {
      const saju: SajuData = {
        unse: {
          monthly: [{ month: currentMonth + 1, ganji: '庚午' }],
        },
      } as unknown as SajuData;

      const result = getTimeBasedFortune(saju, undefined, 'ko');

      expect(result?.month?.message).toContain('정리');
    });

    it('should return month fortune for 임/계 month', () => {
      const saju: SajuData = {
        unse: {
          monthly: [{ month: currentMonth + 1, ganji: '壬午' }],
        },
      } as unknown as SajuData;

      const result = getTimeBasedFortune(saju, undefined, 'ko');

      expect(result?.month?.message).toContain('내면');
    });

    it('should handle month_ganji property', () => {
      const saju: SajuData = {
        unse: {
          monthly: [{ month: currentMonth + 1, month_ganji: '甲午' }],
        },
      } as unknown as SajuData;

      const result = getTimeBasedFortune(saju, undefined, 'ko');

      expect(result?.month?.message).toContain('시작');
    });
  });

  describe('today fortune', () => {
    it('should return today fortune for 갑/을 day', () => {
      const todayDate = new Date().toISOString().slice(0, 10);
      const saju: SajuData = {
        unse: {
          iljin: [{ day: todayDate, ganji: '甲子' }],
        },
      } as unknown as SajuData;

      const result = getTimeBasedFortune(saju, undefined, 'ko');

      expect(result?.today).toBeDefined();
      expect(result?.today?.message).toContain('새로운');
      expect(result?.today?.tip).toContain('활기차게');
      expect(result?.today?.emoji).toBe('📅');
    });

    it('should return today fortune for 병/정 day', () => {
      const todayDate = new Date().toISOString().slice(0, 10);
      const saju: SajuData = {
        unse: {
          iljin: [{ day: todayDate, ganji: '丙子' }],
        },
      } as unknown as SajuData;

      const result = getTimeBasedFortune(saju, undefined, 'ko');

      expect(result?.today?.message).toContain('사람');
      expect(result?.today?.tip).toContain('웃으며');
    });

    it('should return today fortune for 무/기 day', () => {
      const todayDate = new Date().toISOString().slice(0, 10);
      const saju: SajuData = {
        unse: {
          iljin: [{ day: todayDate, ganji: '戊子' }],
        },
      } as unknown as SajuData;

      const result = getTimeBasedFortune(saju, undefined, 'ko');

      expect(result?.today?.message).toContain('차분하게');
    });

    it('should return today fortune for 경/신 day', () => {
      const todayDate = new Date().toISOString().slice(0, 10);
      const saju: SajuData = {
        unse: {
          iljin: [{ day: todayDate, ganji: '庚子' }],
        },
      } as unknown as SajuData;

      const result = getTimeBasedFortune(saju, undefined, 'ko');

      expect(result?.today?.message).toContain('정리');
    });

    it('should return today fortune for other days (water)', () => {
      const todayDate = new Date().toISOString().slice(0, 10);
      const saju: SajuData = {
        unse: {
          iljin: [{ day: todayDate, ganji: '壬子' }],
        },
      } as unknown as SajuData;

      const result = getTimeBasedFortune(saju, undefined, 'ko');

      expect(result?.today?.message).toContain('혼자만의');
    });

    it('should match iljin by day number', () => {
      const todayDayNum = new Date().getDate();
      const saju: SajuData = {
        unse: {
          iljin: [{ day: todayDayNum, ganji: '甲子' }],
        },
      } as unknown as SajuData;

      const result = getTimeBasedFortune(saju, undefined, 'ko');

      expect(result?.today).toBeDefined();
    });
  });

  describe('growth stage', () => {
    it('should return new moon growth stage', () => {
      const astro: AstroData = {
        progressions: {
          secondary: { moonPhase: 'New Moon' },
        },
      } as unknown as AstroData;

      const result = getTimeBasedFortune(undefined, astro, 'ko');

      expect(result?.growth).toBeDefined();
      expect(result?.growth?.stage).toContain('씨앗');
      expect(result?.growth?.message).toContain('시작');
      expect(result?.growth?.emoji).toBe('🦋');
    });

    it('should return crescent/quarter growth stage', () => {
      const astro: AstroData = {
        progressions: {
          secondary: { moonPhase: 'First Quarter' },
        },
      } as unknown as AstroData;

      const result = getTimeBasedFortune(undefined, astro, 'ko');

      expect(result?.growth?.stage).toContain('자라는');
      expect(result?.growth?.message).toContain('성장');
    });

    it('should return full moon growth stage', () => {
      const astro: AstroData = {
        progressions: {
          secondary: { moonPhase: 'Full Moon' },
        },
      } as unknown as AstroData;

      const result = getTimeBasedFortune(undefined, astro, 'ko');

      expect(result?.growth?.stage).toContain('꽃');
      expect(result?.growth?.message).toContain('결과');
    });

    it('should return organizing growth stage for other phases', () => {
      const astro: AstroData = {
        progressions: {
          secondary: { moonPhase: 'Waning Gibbous' },
        },
      } as unknown as AstroData;

      const result = getTimeBasedFortune(undefined, astro, 'ko');

      expect(result?.growth?.stage).toContain('정리');
      expect(result?.growth?.message).toContain('비워야');
    });

    it('should return English growth stage', () => {
      const astro: AstroData = {
        progressions: {
          secondary: { moonPhase: 'New Moon' },
        },
      } as unknown as AstroData;

      const result = getTimeBasedFortune(undefined, astro, 'en');

      expect(result?.growth?.title).toBe('What Stage Now?');
      expect(result?.growth?.stage).toBe('Planting Seeds');
    });
  });

  describe('combined results', () => {
    it('should combine all available fortunes', () => {
      const todayDate = new Date().toISOString().slice(0, 10);
      const saju: SajuData = {
        unse: {
          annual: [{ year: currentYear, ganji: '甲辰' }],
          monthly: [{ month: currentMonth + 1, ganji: '丙午' }],
          iljin: [{ day: todayDate, ganji: '戊子' }],
        },
      } as unknown as SajuData;

      const astro: AstroData = {
        progressions: {
          secondary: { moonPhase: 'Full Moon' },
        },
      } as unknown as AstroData;

      const result = getTimeBasedFortune(saju, astro, 'ko');

      expect(result?.year).toBeDefined();
      expect(result?.month).toBeDefined();
      expect(result?.today).toBeDefined();
      expect(result?.growth).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle missing annual list', () => {
      const saju: SajuData = {
        unse: { monthly: [] },
      } as unknown as SajuData;

      const result = getTimeBasedFortune(saju, undefined, 'ko');

      expect(result).toBeNull();
    });

    it('should handle non-array annual list', () => {
      const saju: SajuData = {
        unse: { annual: 'invalid' },
      } as unknown as SajuData;

      const result = getTimeBasedFortune(saju, undefined, 'ko');

      expect(result).toBeNull();
    });

    it('should handle missing ganji in annual', () => {
      const saju: SajuData = {
        unse: {
          annual: [{ year: currentYear }],
        },
      } as unknown as SajuData;

      const result = getTimeBasedFortune(saju, undefined, 'ko');

      // Should still work but with default message
      expect(result?.year?.message).toContain('내실');
    });

    it('should handle empty progressions', () => {
      const astro: AstroData = {
        progressions: {},
      } as unknown as AstroData;

      const result = getTimeBasedFortune(undefined, astro, 'ko');

      expect(result).toBeNull();
    });
  });
});
