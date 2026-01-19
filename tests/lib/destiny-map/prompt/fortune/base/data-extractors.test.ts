/**
 * Data Extractors Tests
 * Tests for data extraction utilities used in prompt generation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  extractPlanetaryData,
  extractSajuData,
  extractAdvancedAstrology,
  formatPillar,
  getCurrentTimeInfo,
  calculateAgeInfo,
} from '@/lib/destiny-map/prompt/fortune/base/data-extractors';
import type { CombinedResult } from '@/lib/destiny-map/astrology/types';

describe('data-extractors', () => {
  describe('extractPlanetaryData', () => {
    it('should extract all major planets', () => {
      const mockData: Partial<CombinedResult> = {
        astrology: {
          planets: [
            { name: 'Sun', longitude: 0, sign: 'Aries' },
            { name: 'Moon', longitude: 30, sign: 'Taurus' },
            { name: 'Mercury', longitude: 60, sign: 'Gemini' },
            { name: 'Venus', longitude: 90, sign: 'Cancer' },
            { name: 'Mars', longitude: 120, sign: 'Leo' },
            { name: 'Jupiter', longitude: 150, sign: 'Virgo' },
            { name: 'Saturn', longitude: 180, sign: 'Libra' },
            { name: 'Uranus', longitude: 210, sign: 'Scorpio' },
            { name: 'Neptune', longitude: 240, sign: 'Sagittarius' },
            { name: 'Pluto', longitude: 270, sign: 'Capricorn' },
          ],
          houses: [],
          aspects: [],
          transits: [],
        },
      };

      const result = extractPlanetaryData(mockData as CombinedResult);

      expect(result.sun?.name).toBe('Sun');
      expect(result.moon?.name).toBe('Moon');
      expect(result.mercury?.name).toBe('Mercury');
      expect(result.venus?.name).toBe('Venus');
      expect(result.mars?.name).toBe('Mars');
      expect(result.jupiter?.name).toBe('Jupiter');
      expect(result.saturn?.name).toBe('Saturn');
      expect(result.uranus?.name).toBe('Uranus');
      expect(result.neptune?.name).toBe('Neptune');
      expect(result.pluto?.name).toBe('Pluto');
    });

    it('should extract North Node', () => {
      const mockData: Partial<CombinedResult> = {
        astrology: {
          planets: [
            { name: 'North Node', longitude: 45, sign: 'Taurus' },
          ],
          houses: [],
          aspects: [],
          transits: [],
        },
      };

      const result = extractPlanetaryData(mockData as CombinedResult);

      expect(result.northNode?.name).toBe('North Node');
    });

    it('should extract houses', () => {
      const mockData: Partial<CombinedResult> = {
        astrology: {
          planets: [],
          houses: [
            { cusp: 0, formatted: '0°00\' Aries' },
            { cusp: 30, formatted: '0°00\' Taurus' },
          ],
          aspects: [],
          transits: [],
        },
      };

      const result = extractPlanetaryData(mockData as CombinedResult);

      expect(result.houses).toHaveLength(2);
      expect(result.houses[0].cusp).toBe(0);
    });

    it('should extract aspects', () => {
      const mockData: Partial<CombinedResult> = {
        astrology: {
          planets: [],
          houses: [],
          aspects: [
            { type: 'conjunction', p1: 'Sun', p2: 'Moon', orb: 0 },
          ],
          transits: [],
        },
      };

      const result = extractPlanetaryData(mockData as CombinedResult);

      expect(result.aspects).toHaveLength(1);
    });

    it('should extract ascendant and MC', () => {
      const mockData: Partial<CombinedResult> = {
        astrology: {
          planets: [],
          houses: [],
          aspects: [],
          transits: [],
          ascendant: { name: 'Ascendant', longitude: 15, sign: 'Aries' },
          mc: { name: 'MC', longitude: 285, sign: 'Capricorn' },
        },
      };

      const result = extractPlanetaryData(mockData as CombinedResult);

      expect(result.ascendant?.name).toBe('Ascendant');
      expect(result.mc?.name).toBe('MC');
    });

    it('should handle null/undefined data gracefully', () => {
      const result = extractPlanetaryData(null as unknown as CombinedResult);

      expect(result.planets).toEqual([]);
      expect(result.houses).toEqual([]);
      expect(result.aspects).toEqual([]);
      expect(result.transits).toEqual([]);
    });

    it('should handle empty astrology object', () => {
      const mockData: Partial<CombinedResult> = {
        astrology: undefined,
      };

      const result = extractPlanetaryData(mockData as CombinedResult);

      expect(result.planets).toEqual([]);
      expect(result.sun).toBeUndefined();
    });
  });

  describe('extractSajuData', () => {
    it('should extract pillars', () => {
      const mockData: Partial<CombinedResult> = {
        saju: {
          pillars: {
            year: { heavenlyStem: { name: '甲' }, earthlyBranch: { name: '子' } },
            month: { heavenlyStem: { name: '乙' }, earthlyBranch: { name: '丑' } },
            day: { heavenlyStem: { name: '丙' }, earthlyBranch: { name: '寅' } },
            time: { heavenlyStem: { name: '丁' }, earthlyBranch: { name: '卯' } },
          },
          dayMaster: {},
          unse: { daeun: [], annual: [], monthly: [], iljin: [] },
          sinsal: {},
        },
      };

      const result = extractSajuData(mockData as CombinedResult);

      expect(result.pillars.year).toBeDefined();
      expect(result.pillars.month).toBeDefined();
      expect(result.pillars.day).toBeDefined();
      expect(result.pillars.time).toBeDefined();
    });

    it('should extract day master', () => {
      const mockData: Partial<CombinedResult> = {
        saju: {
          pillars: {},
          dayMaster: {
            name: '甲',
            element: 'Wood',
            yinYang: 'Yang',
            strength: 'strong',
          },
          unse: { daeun: [], annual: [], monthly: [], iljin: [] },
          sinsal: {},
        },
      };

      const result = extractSajuData(mockData as CombinedResult);

      expect(result.dayMaster.name).toBe('甲');
      expect(result.dayMaster.element).toBe('Wood');
    });

    it('should extract unse (luck cycles)', () => {
      const mockData: Partial<CombinedResult> = {
        saju: {
          pillars: {},
          dayMaster: {},
          unse: {
            daeun: [{ age: 1, stem: '甲' }],
            annual: [{ year: 2024, stem: '甲' }],
            monthly: [{ month: 1, stem: '甲' }],
            iljin: [{ day: 1, stem: '甲' }],
          },
          sinsal: {},
        },
      };

      const result = extractSajuData(mockData as CombinedResult);

      expect(result.unse.daeun).toHaveLength(1);
      expect(result.unse.annual).toHaveLength(1);
    });

    it('should handle null/undefined data gracefully', () => {
      const result = extractSajuData(null as unknown as CombinedResult);

      expect(result.pillars).toEqual({});
      expect(result.dayMaster).toEqual({});
      expect(result.unse.daeun).toEqual([]);
    });
  });

  describe('extractAdvancedAstrology', () => {
    it('should extract extra points', () => {
      const mockData: Partial<CombinedResult> = {
        extraPoints: {
          chiron: { name: 'Chiron', longitude: 45 },
          lilith: { name: 'Lilith', longitude: 90 },
          vertex: { name: 'Vertex', longitude: 135 },
          partOfFortune: { name: 'Part of Fortune', longitude: 180 },
        },
      };

      const result = extractAdvancedAstrology(mockData as CombinedResult);

      expect(result.extraPoints.chiron?.name).toBe('Chiron');
      expect(result.extraPoints.lilith?.name).toBe('Lilith');
      expect(result.extraPoints.vertex?.name).toBe('Vertex');
      expect(result.extraPoints.partOfFortune?.name).toBe('Part of Fortune');
    });

    it('should extract asteroids', () => {
      const mockData: Partial<CombinedResult> = {
        asteroids: {
          ceres: { name: 'Ceres', longitude: 60 },
          pallas: { name: 'Pallas', longitude: 120 },
          juno: { name: 'Juno', longitude: 180 },
          vesta: { name: 'Vesta', longitude: 240 },
        },
      };

      const result = extractAdvancedAstrology(mockData as CombinedResult);

      expect(result.asteroids.ceres?.name).toBe('Ceres');
      expect(result.asteroids.pallas?.name).toBe('Pallas');
      expect(result.asteroids.juno?.name).toBe('Juno');
      expect(result.asteroids.vesta?.name).toBe('Vesta');
    });

    it('should extract solar and lunar returns', () => {
      const mockData: Partial<CombinedResult> = {
        solarReturn: { date: '2024-01-01' },
        lunarReturn: { date: '2024-01-15' },
      };

      const result = extractAdvancedAstrology(mockData as CombinedResult);

      expect(result.solarReturn).toBeDefined();
      expect(result.lunarReturn).toBeDefined();
    });

    it('should extract progressions', () => {
      const mockData: Partial<CombinedResult> = {
        progressions: { sun: { longitude: 45 } },
      };

      const result = extractAdvancedAstrology(mockData as CombinedResult);

      expect(result.progressions).toBeDefined();
    });

    it('should handle undefined extra points gracefully', () => {
      const mockData: Partial<CombinedResult> = {};

      const result = extractAdvancedAstrology(mockData as CombinedResult);

      expect(result.extraPoints.chiron).toBeUndefined();
      expect(result.asteroids.ceres).toBeUndefined();
    });
  });

  describe('formatPillar', () => {
    it('should format pillar with heavenly stem and earthly branch', () => {
      const pillar = {
        heavenlyStem: { name: '甲' },
        earthlyBranch: { name: '子' },
      };

      const result = formatPillar(pillar);

      expect(result).toBe('甲子');
    });

    it('should format pillar from ganji string', () => {
      const pillar = {
        ganji: '甲子',
      };

      const result = formatPillar(pillar);

      expect(result).toBe('甲子');
    });

    it('should return null for undefined pillar', () => {
      const result = formatPillar(undefined);

      expect(result).toBeNull();
    });

    it('should return null for pillar without stem and branch', () => {
      const pillar = {};

      const result = formatPillar(pillar);

      expect(result).toBeNull();
    });

    it('should return null for pillar with only stem', () => {
      const pillar = {
        heavenlyStem: { name: '甲' },
      };

      const result = formatPillar(pillar);

      expect(result).toBeNull();
    });

    it('should return null for pillar with only branch', () => {
      const pillar = {
        earthlyBranch: { name: '子' },
      };

      const result = formatPillar(pillar);

      expect(result).toBeNull();
    });

    it('should prefer heavenlyStem/earthlyBranch over ganji', () => {
      const pillar = {
        heavenlyStem: { name: '乙' },
        earthlyBranch: { name: '丑' },
        ganji: '甲子',
      };

      const result = formatPillar(pillar);

      expect(result).toBe('乙丑');
    });
  });

  describe('getCurrentTimeInfo', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return current year', () => {
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));

      const result = getCurrentTimeInfo();

      expect(result.currentYear).toBe(2024);
    });

    it('should return current month (1-indexed)', () => {
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));

      const result = getCurrentTimeInfo();

      expect(result.currentMonth).toBe(6);
    });

    it('should return current date object', () => {
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));

      const result = getCurrentTimeInfo();

      expect(result.currentDate).toBeInstanceOf(Date);
    });

    it('should handle January correctly (month = 1)', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

      const result = getCurrentTimeInfo();

      expect(result.currentMonth).toBe(1);
    });

    it('should handle December correctly (month = 12)', () => {
      // Use noon UTC to avoid timezone issues
      vi.setSystemTime(new Date('2024-12-15T12:00:00Z'));

      const result = getCurrentTimeInfo();

      expect(result.currentMonth).toBe(12);
    });
  });

  describe('calculateAgeInfo', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should calculate age from facts birthDate', () => {
      const facts = { birthDate: '1990-01-01' };

      const result = calculateAgeInfo(facts, undefined);

      expect(result.birthYear).toBe(1990);
      expect(result.currentAge).toBe(34);
    });

    it('should calculate age from pillars year', () => {
      const pillars = { year: { year: 1985 } };

      const result = calculateAgeInfo(undefined, pillars);

      expect(result.birthYear).toBe(1985);
      expect(result.currentAge).toBe(39);
    });

    it('should prefer facts.birthDate over pillars.year', () => {
      const facts = { birthDate: '1990-01-01' };
      const pillars = { year: { year: 1985 } };

      const result = calculateAgeInfo(facts, pillars);

      expect(result.birthYear).toBe(1990);
    });

    it('should default to current year - 30 when no data', () => {
      const result = calculateAgeInfo(undefined, undefined);

      expect(result.birthYear).toBe(1994); // 2024 - 30
      expect(result.currentAge).toBe(30);
    });

    it('should handle undefined facts with pillars year', () => {
      const pillars = { year: { year: 2000 } };

      const result = calculateAgeInfo(undefined, pillars);

      expect(result.birthYear).toBe(2000);
      expect(result.currentAge).toBe(24);
    });

    it('should handle empty facts object', () => {
      const facts = {};
      const pillars = { year: { year: 1995 } };

      const result = calculateAgeInfo(facts, pillars);

      expect(result.birthYear).toBe(1995);
      expect(result.currentAge).toBe(29);
    });
  });
});
