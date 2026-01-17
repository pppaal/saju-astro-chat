/**
 * @file Tests for destiny-map/calendar module exports
 * 커버리지 향상을 위한 calendar barrel export 테스트
 */

import { describe, it, expect } from 'vitest';

describe('Destiny Calendar Module Exports', () => {
  describe('Cache exports', () => {
    it('should export DestinyCalendarCache', async () => {
      const { DestinyCalendarCache } = await import('@/lib/destiny-map/calendar');
      expect(DestinyCalendarCache).toBeDefined();
    });

    it('should export destinyCache singleton', async () => {
      const { destinyCache } = await import('@/lib/destiny-map/calendar');
      expect(destinyCache).toBeDefined();
    });
  });

  describe('Scoring exports', () => {
    it('should export calculateTotalScore', async () => {
      const { calculateTotalScore } = await import('@/lib/destiny-map/calendar');
      expect(calculateTotalScore).toBeDefined();
      expect(typeof calculateTotalScore).toBe('function');
    });
  });

  describe('Saju Analysis exports', () => {
    it('should export getYearGanzhi', async () => {
      const { getYearGanzhi } = await import('@/lib/destiny-map/calendar');
      expect(getYearGanzhi).toBeDefined();
      expect(typeof getYearGanzhi).toBe('function');
    });

    it('should export calculateSeunScore', async () => {
      const { calculateSeunScore } = await import('@/lib/destiny-map/calendar');
      expect(calculateSeunScore).toBeDefined();
      expect(typeof calculateSeunScore).toBe('function');
    });

    it('should export getMonthGanzhi', async () => {
      const { getMonthGanzhi } = await import('@/lib/destiny-map/calendar');
      expect(getMonthGanzhi).toBeDefined();
      expect(typeof getMonthGanzhi).toBe('function');
    });

    it('should export calculateWolunScore', async () => {
      const { calculateWolunScore } = await import('@/lib/destiny-map/calendar');
      expect(calculateWolunScore).toBeDefined();
      expect(typeof calculateWolunScore).toBe('function');
    });

    it('should export calculateIljinScore', async () => {
      const { calculateIljinScore } = await import('@/lib/destiny-map/calendar');
      expect(calculateIljinScore).toBeDefined();
      expect(typeof calculateIljinScore).toBe('function');
    });

    it('should export analyzeYongsin', async () => {
      const { analyzeYongsin } = await import('@/lib/destiny-map/calendar');
      expect(analyzeYongsin).toBeDefined();
      expect(typeof analyzeYongsin).toBe('function');
    });

    it('should export analyzeGeokguk', async () => {
      const { analyzeGeokguk } = await import('@/lib/destiny-map/calendar');
      expect(analyzeGeokguk).toBeDefined();
      expect(typeof analyzeGeokguk).toBe('function');
    });
  });

  describe('Astrology Analysis exports', () => {
    it('should export getPlanetPosition', async () => {
      const { getPlanetPosition } = await import('@/lib/destiny-map/calendar');
      expect(getPlanetPosition).toBeDefined();
      expect(typeof getPlanetPosition).toBe('function');
    });

    it('should export getPlanetSign', async () => {
      const { getPlanetSign } = await import('@/lib/destiny-map/calendar');
      expect(getPlanetSign).toBeDefined();
      expect(typeof getPlanetSign).toBe('function');
    });

    it('should export isRetrograde', async () => {
      const { isRetrograde } = await import('@/lib/destiny-map/calendar');
      expect(isRetrograde).toBeDefined();
      expect(typeof isRetrograde).toBe('function');
    });

    it('should export getLunarPhase', async () => {
      const { getLunarPhase } = await import('@/lib/destiny-map/calendar');
      expect(getLunarPhase).toBeDefined();
      expect(typeof getLunarPhase).toBe('function');
    });

    it('should export getMoonPhaseDetailed', async () => {
      const { getMoonPhaseDetailed } = await import('@/lib/destiny-map/calendar');
      expect(getMoonPhaseDetailed).toBeDefined();
      expect(typeof getMoonPhaseDetailed).toBe('function');
    });

    it('should export checkVoidOfCourseMoon', async () => {
      const { checkVoidOfCourseMoon } = await import('@/lib/destiny-map/calendar');
      expect(checkVoidOfCourseMoon).toBeDefined();
      expect(typeof checkVoidOfCourseMoon).toBe('function');
    });

    it('should export checkEclipseImpact', async () => {
      const { checkEclipseImpact } = await import('@/lib/destiny-map/calendar');
      expect(checkEclipseImpact).toBeDefined();
      expect(typeof checkEclipseImpact).toBe('function');
    });

    it('should export ECLIPSES constant', async () => {
      const { ECLIPSES } = await import('@/lib/destiny-map/calendar');
      expect(ECLIPSES).toBeDefined();
      expect(Array.isArray(ECLIPSES)).toBe(true);
    });
  });

  describe('Profile Utilities exports', () => {
    it('should export extractSajuProfile', async () => {
      const { extractSajuProfile } = await import('@/lib/destiny-map/calendar');
      expect(extractSajuProfile).toBeDefined();
      expect(typeof extractSajuProfile).toBe('function');
    });

    it('should export extractAstroProfile', async () => {
      const { extractAstroProfile } = await import('@/lib/destiny-map/calendar');
      expect(extractAstroProfile).toBeDefined();
      expect(typeof extractAstroProfile).toBe('function');
    });

    it('should export calculateSajuProfileFromBirthDate', async () => {
      const { calculateSajuProfileFromBirthDate } = await import('@/lib/destiny-map/calendar');
      expect(calculateSajuProfileFromBirthDate).toBeDefined();
      expect(typeof calculateSajuProfileFromBirthDate).toBe('function');
    });

    it('should export calculateAstroProfileFromBirthDate', async () => {
      const { calculateAstroProfileFromBirthDate } = await import('@/lib/destiny-map/calendar');
      expect(calculateAstroProfileFromBirthDate).toBeDefined();
      expect(typeof calculateAstroProfileFromBirthDate).toBe('function');
    });
  });

  describe('Daily Fortune exports', () => {
    it('should export getDailyGanzhi', async () => {
      const { getDailyGanzhi } = await import('@/lib/destiny-map/calendar');
      expect(getDailyGanzhi).toBeDefined();
      expect(typeof getDailyGanzhi).toBe('function');
    });

    it('should export getLuckyColorFromElement', async () => {
      const { getLuckyColorFromElement } = await import('@/lib/destiny-map/calendar');
      expect(getLuckyColorFromElement).toBeDefined();
      expect(typeof getLuckyColorFromElement).toBe('function');
    });

    it('should export getLuckyNumber', async () => {
      const { getLuckyNumber } = await import('@/lib/destiny-map/calendar');
      expect(getLuckyNumber).toBeDefined();
      expect(typeof getLuckyNumber).toBe('function');
    });

    it('should export generateAlerts', async () => {
      const { generateAlerts } = await import('@/lib/destiny-map/calendar');
      expect(generateAlerts).toBeDefined();
      expect(typeof generateAlerts).toBe('function');
    });

    it('should export createDefaultFortuneResult', async () => {
      const { createDefaultFortuneResult } = await import('@/lib/destiny-map/calendar');
      expect(createDefaultFortuneResult).toBeDefined();
      expect(typeof createDefaultFortuneResult).toBe('function');
    });
  });

  describe('Special Days Analysis exports', () => {
    it('should export analyzeTwelveFortuneStar', async () => {
      const { analyzeTwelveFortuneStar } = await import('@/lib/destiny-map/calendar');
      expect(analyzeTwelveFortuneStar).toBeDefined();
      expect(typeof analyzeTwelveFortuneStar).toBe('function');
    });

    it('should export analyzeFortuneFlow', async () => {
      const { analyzeFortuneFlow } = await import('@/lib/destiny-map/calendar');
      expect(analyzeFortuneFlow).toBeDefined();
      expect(typeof analyzeFortuneFlow).toBe('function');
    });

    it('should export getHourlyRecommendation', async () => {
      const { getHourlyRecommendation } = await import('@/lib/destiny-map/calendar');
      expect(getHourlyRecommendation).toBeDefined();
      expect(typeof getHourlyRecommendation).toBe('function');
    });

    it('should export analyzeLunarDate', async () => {
      const { analyzeLunarDate } = await import('@/lib/destiny-map/calendar');
      expect(analyzeLunarDate).toBeDefined();
      expect(typeof analyzeLunarDate).toBe('function');
    });

    it('should export analyzeElementCompatibility', async () => {
      const { analyzeElementCompatibility } = await import('@/lib/destiny-map/calendar');
      expect(analyzeElementCompatibility).toBeDefined();
      expect(typeof analyzeElementCompatibility).toBe('function');
    });

    it('should export ELEMENT_ASTRO_MAPPING', async () => {
      const { ELEMENT_ASTRO_MAPPING } = await import('@/lib/destiny-map/calendar');
      expect(ELEMENT_ASTRO_MAPPING).toBeDefined();
    });

    it('should export getYongsinRecommendations', async () => {
      const { getYongsinRecommendations } = await import('@/lib/destiny-map/calendar');
      expect(getYongsinRecommendations).toBeDefined();
      expect(typeof getYongsinRecommendations).toBe('function');
    });
  });
});
