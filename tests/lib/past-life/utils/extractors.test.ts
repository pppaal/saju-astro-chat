/**
 * Tests for src/lib/past-life/utils/extractors.ts
 * 전생 분석 데이터 추출 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  findPlanetHouse,
  findPlanetByAliases,
  extractDayMasterChar,
} from '@/lib/past-life/utils/extractors';

describe('past-life extractors', () => {
  describe('findPlanetHouse', () => {
    it('should return null for null astro', () => {
      expect(findPlanetHouse(null, 'Saturn')).toBeNull();
    });

    it('should return null for astro without planets', () => {
      expect(findPlanetHouse({ planets: undefined } as any, 'Saturn')).toBeNull();
    });

    it('should find planet by name (case-insensitive)', () => {
      const astro = {
        planets: [
          { name: 'Saturn', house: 5 },
          { name: 'Jupiter', house: 10 },
        ],
      };
      expect(findPlanetHouse(astro, 'saturn')).toBe(5);
    });

    it('should match partial names', () => {
      const astro = {
        planets: [{ name: 'North Node', house: 7 }],
      };
      expect(findPlanetHouse(astro, 'north')).toBe(7);
    });

    it('should return null for invalid house number', () => {
      const astro = { planets: [{ name: 'Saturn', house: 0 }] };
      expect(findPlanetHouse(astro, 'Saturn')).toBeNull();
    });

    it('should return null for house > 12', () => {
      const astro = { planets: [{ name: 'Saturn', house: 13 }] };
      expect(findPlanetHouse(astro, 'Saturn')).toBeNull();
    });

    it('should return null when planet not found', () => {
      const astro = { planets: [{ name: 'Mars', house: 5 }] };
      expect(findPlanetHouse(astro, 'Saturn')).toBeNull();
    });

    it('should handle planets with undefined house', () => {
      const astro = { planets: [{ name: 'Saturn' }] };
      expect(findPlanetHouse(astro, 'Saturn')).toBeNull();
    });
  });

  describe('findPlanetByAliases', () => {
    it('should return null for null astro', () => {
      expect(findPlanetByAliases(null, ['Saturn'])).toBeNull();
    });

    it('should find planet using first matching alias', () => {
      const astro = {
        planets: [{ name: 'North Node', house: 3 }],
      };
      expect(findPlanetByAliases(astro, ['Rahu', 'North Node'])).toBe(3);
    });

    it('should try all aliases until match', () => {
      const astro = {
        planets: [{ name: 'Saturn', house: 11 }],
      };
      expect(findPlanetByAliases(astro, ['Jupiter', 'Mars', 'Saturn'])).toBe(11);
    });

    it('should return null when no alias matches', () => {
      const astro = {
        planets: [{ name: 'Mars', house: 5 }],
      };
      expect(findPlanetByAliases(astro, ['Saturn', 'Jupiter'])).toBeNull();
    });
  });

  describe('extractDayMasterChar', () => {
    it('should return null for null saju', () => {
      expect(extractDayMasterChar(null)).toBeNull();
    });

    it('should extract from dayMaster.name', () => {
      const saju = { dayMaster: { name: '갑목' } };
      expect(extractDayMasterChar(saju as any)).toBe('갑');
    });

    it('should extract from dayMaster.heavenlyStem', () => {
      const saju = { dayMaster: { heavenlyStem: '을' } };
      expect(extractDayMasterChar(saju as any)).toBe('을');
    });

    it('should extract from pillars.day.heavenlyStem string', () => {
      const saju = { pillars: { day: { heavenlyStem: '병화' } } };
      expect(extractDayMasterChar(saju as any)).toBe('병');
    });

    it('should extract from pillars.day.heavenlyStem.name', () => {
      const saju = { pillars: { day: { heavenlyStem: { name: '정' } } } };
      expect(extractDayMasterChar(saju as any)).toBe('정');
    });

    it('should extract from fourPillars.day.heavenlyStem', () => {
      const saju = { fourPillars: { day: { heavenlyStem: '무' } } };
      expect(extractDayMasterChar(saju as any)).toBe('무');
    });

    it('should return null for invalid heavenly stem', () => {
      const saju = { dayMaster: { name: 'X' } };
      expect(extractDayMasterChar(saju as any)).toBeNull();
    });

    it('should return null for empty string sources', () => {
      const saju = { dayMaster: { name: '' } };
      expect(extractDayMasterChar(saju as any)).toBeNull();
    });

    it('should return null for saju with no day master sources', () => {
      const saju = { advancedAnalysis: { geokguk: { name: '식신' } } };
      expect(extractDayMasterChar(saju as any)).toBeNull();
    });

    it('should prefer first available source', () => {
      const saju = {
        dayMaster: { name: '갑' },
        pillars: { day: { heavenlyStem: '을' } },
      };
      // dayMaster.name comes first in the sources array
      expect(extractDayMasterChar(saju as any)).toBe('갑');
    });
  });
});
