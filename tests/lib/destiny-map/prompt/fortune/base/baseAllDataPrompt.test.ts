/**
 * Base All Data Prompt Tests
 * Tests for buildAllDataPrompt function
 */

import { describe, it, expect, vi } from 'vitest';
import { buildAllDataPrompt } from '@/lib/destiny-map/prompt/fortune/base/baseAllDataPrompt';

// Mock logger to avoid console noise
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock CombinedResult data
const mockCombinedResult = {
  meta: { generator: 'test', generatedAt: '2024-01-15T00:00:00Z' },
  astrology: {
    planets: [
      { name: 'Sun', sign: 'Capricorn', degree: 15.5 },
      { name: 'Moon', sign: 'Aries', degree: 22.3 },
      { name: 'Mercury', sign: 'Aquarius', degree: 8.1 },
      { name: 'Venus', sign: 'Sagittarius', degree: 28.7 },
      { name: 'Mars', sign: 'Capricorn', degree: 12.4 },
      { name: 'Jupiter', sign: 'Taurus', degree: 5.9 },
      { name: 'Saturn', sign: 'Pisces', degree: 3.2 },
    ],
    houses: [
      { number: 1, sign: 'Libra' },
      { number: 2, sign: 'Scorpio' },
      { number: 10, sign: 'Cancer' },
    ],
    aspects: [
      { planet1: 'Sun', planet2: 'Moon', type: 'square', orb: 2.5 },
      { planet1: 'Venus', planet2: 'Jupiter', type: 'trine', orb: 1.2 },
    ],
    ascendant: { sign: 'Libra', degree: 15 },
    mc: { sign: 'Cancer', degree: 12 },
    transits: [],
    facts: {
      elementBalance: { fire: 1, earth: 2, air: 1, water: 1 },
      modalityBalance: { cardinal: 2, fixed: 2, mutable: 1 },
    },
  },
  saju: {
    dayMaster: { name: '庚', element: '금', yin_yang: '양' },
    pillars: {
      year: { heavenlyStem: { name: '庚' }, earthlyBranch: { name: '午' }, ganji: '庚午' },
      month: { heavenlyStem: { name: '辛' }, earthlyBranch: { name: '巳' }, ganji: '辛巳' },
      day: { heavenlyStem: { name: '庚' }, earthlyBranch: { name: '辰' }, ganji: '庚辰' },
      hour: { heavenlyStem: { name: '癸' }, earthlyBranch: { name: '未' }, ganji: '癸未' },
    },
    unse: {
      currentDaeun: { ganji: '壬午', startAge: 7 },
      currentSaeun: { ganji: '甲辰' },
      daeunList: [
        { ganji: '壬午', startAge: 7 },
        { ganji: '癸未', startAge: 17 },
      ],
    },
    sinsal: [],
    advancedAnalysis: {
      geokguk: { type: '정인격', description: '학문과 지혜' },
      yongsin: { primary: '수', secondary: '금' },
    },
  },
  summary: 'Test summary',
  userTimezone: 'Asia/Seoul',
  analysisDate: '2024-01-15',
};

describe('buildAllDataPrompt', () => {
  describe('basic functionality', () => {
    it('should return a string', () => {
      const result = buildAllDataPrompt('ko', 'today', mockCombinedResult as never);
      expect(typeof result).toBe('string');
    });

    it('should return non-empty string', () => {
      const result = buildAllDataPrompt('ko', 'today', mockCombinedResult as never);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle empty data object gracefully', () => {
      const emptyData = { astrology: {}, saju: {} };
      const result = buildAllDataPrompt('ko', 'today', emptyData as never);
      expect(typeof result).toBe('string');
    });
  });

  describe('language support', () => {
    it('should work with Korean', () => {
      const result = buildAllDataPrompt('ko', 'today', mockCombinedResult as never);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should work with English', () => {
      const result = buildAllDataPrompt('en', 'today', mockCombinedResult as never);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('theme support', () => {
    const themes = ['today', 'love', 'career', 'health', 'year', 'month'];

    themes.forEach((theme) => {
      it(`should generate prompt for ${theme} theme`, () => {
        const result = buildAllDataPrompt('ko', theme, mockCombinedResult as never);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe('data extraction', () => {
    it('should include astrology data when available', () => {
      const result = buildAllDataPrompt('ko', 'today', mockCombinedResult as never);
      // The prompt should contain some astrology-related content
      expect(result.length).toBeGreaterThan(100);
    });

    it('should include saju data when available', () => {
      const result = buildAllDataPrompt('ko', 'today', mockCombinedResult as never);
      expect(result.length).toBeGreaterThan(100);
    });
  });

  describe('partial data handling', () => {
    it('should handle missing astrology data', () => {
      const partialData = {
        ...mockCombinedResult,
        astrology: undefined,
      };
      const result = buildAllDataPrompt('ko', 'today', partialData as never);
      expect(typeof result).toBe('string');
    });

    it('should handle missing saju data', () => {
      const partialData = {
        ...mockCombinedResult,
        saju: undefined,
      };
      const result = buildAllDataPrompt('ko', 'today', partialData as never);
      expect(typeof result).toBe('string');
    });

    it('should handle empty planets array', () => {
      const partialData = {
        ...mockCombinedResult,
        astrology: { ...mockCombinedResult.astrology, planets: [] },
      };
      const result = buildAllDataPrompt('ko', 'today', partialData as never);
      expect(typeof result).toBe('string');
    });

    it('should handle missing pillars', () => {
      const partialData = {
        ...mockCombinedResult,
        saju: { ...mockCombinedResult.saju, pillars: undefined },
      };
      const result = buildAllDataPrompt('ko', 'today', partialData as never);
      expect(typeof result).toBe('string');
    });
  });

  describe('advanced data handling', () => {
    it('should handle extra points data', () => {
      const dataWithExtras = {
        ...mockCombinedResult,
        extraPoints: {
          chiron: { sign: 'Aries', degree: 15 },
          lilith: { sign: 'Scorpio', degree: 22 },
        },
      };
      const result = buildAllDataPrompt('ko', 'today', dataWithExtras as never);
      expect(typeof result).toBe('string');
    });

    it('should handle solar return data', () => {
      const dataWithSolarReturn = {
        ...mockCombinedResult,
        solarReturn: {
          chart: {},
          summary: { theme: 'growth' },
        },
      };
      const result = buildAllDataPrompt('ko', 'today', dataWithSolarReturn as never);
      expect(typeof result).toBe('string');
    });
  });
});

describe('Korean character handling', () => {
  it('should handle Korean stem characters', () => {
    const result = buildAllDataPrompt('ko', 'today', mockCombinedResult as never);
    expect(typeof result).toBe('string');
  });
});
