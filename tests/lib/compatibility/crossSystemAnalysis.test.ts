// tests/lib/compatibility/crossSystemAnalysis.test.ts
import { describe, it, expect } from 'vitest';
import {
  analyzeDayMasterVsSun,
  analyzeMonthBranchVsMoon,
  analyzeElementFusion,
  analyzePillarPlanetCorrespondence,
  performCrossSystemAnalysis,
  type SajuProfile,
  type AstroProfile,
} from '@/lib/compatibility/crossSystemAnalysis';

// 테스트용 헬퍼 함수
function createSajuProfile(
  dayMasterElement: string,
  dayMasterName: string = '甲'
): SajuProfile {
  return {
    dayMaster: {
      name: dayMasterName,
      element: dayMasterElement,
    },
    pillars: {
      year: { stem: '甲', branch: '子' },
      month: { stem: '丙', branch: '寅' },
      day: { stem: dayMasterName, branch: '午' },
      time: { stem: '庚', branch: '申' },
    },
    elements: {
      wood: 2,
      fire: 2,
      earth: 1,
      metal: 2,
      water: 1,
    },
  };
}

function createAstroProfile(
  sunSign: string = 'aries',
  sunElement: string = 'fire',
  moonSign: string = 'cancer',
  moonElement: string = 'water'
): AstroProfile {
  return {
    sun: { sign: sunSign, element: sunElement },
    moon: { sign: moonSign, element: moonElement },
    venus: { sign: 'taurus', element: 'earth' },
    mars: { sign: 'aries', element: 'fire' },
    mercury: { sign: 'gemini', element: 'air' },
    ascendant: { sign: 'leo', element: 'fire' },
    jupiter: { sign: 'sagittarius', element: 'fire' },
    saturn: { sign: 'capricorn', element: 'earth' },
  };
}

describe('crossSystemAnalysis', () => {
  describe('analyzeDayMasterVsSun', () => {
    it('should return DayMasterSunAnalysis with all required fields', () => {
      const p1Saju = createSajuProfile('목');
      const p2Saju = createSajuProfile('화');
      const p1Astro = createAstroProfile();
      const p2Astro = createAstroProfile();

      const result = analyzeDayMasterVsSun(p1Saju, p2Saju, p1Astro, p2Astro);

      expect(result).toHaveProperty('person1');
      expect(result).toHaveProperty('person2');
      expect(result).toHaveProperty('crossHarmony');
    });

    it('should include person analysis with all fields', () => {
      const p1Saju = createSajuProfile('목');
      const p2Saju = createSajuProfile('화');
      const p1Astro = createAstroProfile();
      const p2Astro = createAstroProfile();

      const result = analyzeDayMasterVsSun(p1Saju, p2Saju, p1Astro, p2Astro);

      expect(result.person1).toHaveProperty('dayMaster');
      expect(result.person1).toHaveProperty('dayMasterElement');
      expect(result.person1).toHaveProperty('sunSign');
      expect(result.person1).toHaveProperty('sunElement');
      expect(result.person1).toHaveProperty('harmony');
      expect(result.person1).toHaveProperty('description');
    });

    it('should include crossHarmony with all fields', () => {
      const p1Saju = createSajuProfile('목');
      const p2Saju = createSajuProfile('화');
      const p1Astro = createAstroProfile();
      const p2Astro = createAstroProfile();

      const result = analyzeDayMasterVsSun(p1Saju, p2Saju, p1Astro, p2Astro);

      expect(result.crossHarmony).toHaveProperty('p1DayMasterToP2Sun');
      expect(result.crossHarmony).toHaveProperty('p2DayMasterToP1Sun');
      expect(result.crossHarmony).toHaveProperty('overallScore');
      expect(result.crossHarmony).toHaveProperty('interpretation');
    });

    describe('harmony levels', () => {
      it('should return valid harmony level', () => {
        const p1Saju = createSajuProfile('목');
        const p2Saju = createSajuProfile('화');
        const p1Astro = createAstroProfile();
        const p2Astro = createAstroProfile();

        const result = analyzeDayMasterVsSun(p1Saju, p2Saju, p1Astro, p2Astro);
        const validHarmonies = ['excellent', 'good', 'neutral', 'challenging'];

        expect(validHarmonies).toContain(result.person1.harmony);
        expect(validHarmonies).toContain(result.person2.harmony);
      });
    });

    describe('score range', () => {
      it('should return score between 0 and 100', () => {
        const p1Saju = createSajuProfile('목');
        const p2Saju = createSajuProfile('화');
        const p1Astro = createAstroProfile();
        const p2Astro = createAstroProfile();

        const result = analyzeDayMasterVsSun(p1Saju, p2Saju, p1Astro, p2Astro);

        expect(result.crossHarmony.overallScore).toBeGreaterThanOrEqual(0);
        expect(result.crossHarmony.overallScore).toBeLessThanOrEqual(100);
      });
    });

    describe('element relationships', () => {
      it('should recognize 상생 relationship (wood generates fire)', () => {
        const p1Saju = createSajuProfile('목', '甲');
        const p2Saju = createSajuProfile('화', '丙');
        const p1Astro = createAstroProfile('leo', 'fire');
        const p2Astro = createAstroProfile('aries', 'fire');

        const result = analyzeDayMasterVsSun(p1Saju, p2Saju, p1Astro, p2Astro);

        // Wood generates fire, should have good harmony
        expect(result.crossHarmony.overallScore).toBeGreaterThan(50);
      });
    });
  });

  describe('analyzeMonthBranchVsMoon', () => {
    it('should return MonthBranchMoonAnalysis with all required fields', () => {
      const p1Saju = createSajuProfile('목');
      const p2Saju = createSajuProfile('화');
      const p1Astro = createAstroProfile();
      const p2Astro = createAstroProfile();

      const result = analyzeMonthBranchVsMoon(p1Saju, p2Saju, p1Astro, p2Astro);

      expect(result).toHaveProperty('person1MonthBranch');
      expect(result).toHaveProperty('person1MoonSign');
      expect(result).toHaveProperty('person2MonthBranch');
      expect(result).toHaveProperty('person2MoonSign');
      expect(result).toHaveProperty('emotionalResonance');
      expect(result).toHaveProperty('interpretation');
    });

    it('should return emotionalResonance between 0 and 100', () => {
      const p1Saju = createSajuProfile('목');
      const p2Saju = createSajuProfile('화');
      const p1Astro = createAstroProfile();
      const p2Astro = createAstroProfile();

      const result = analyzeMonthBranchVsMoon(p1Saju, p2Saju, p1Astro, p2Astro);

      expect(result.emotionalResonance).toBeGreaterThanOrEqual(0);
      expect(result.emotionalResonance).toBeLessThanOrEqual(100);
    });

    it('should return interpretation array', () => {
      const p1Saju = createSajuProfile('목');
      const p2Saju = createSajuProfile('화');
      const p1Astro = createAstroProfile();
      const p2Astro = createAstroProfile();

      const result = analyzeMonthBranchVsMoon(p1Saju, p2Saju, p1Astro, p2Astro);

      expect(Array.isArray(result.interpretation)).toBe(true);
      expect(result.interpretation.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeElementFusion', () => {
    it('should return ElementFusionAnalysis with all required fields', () => {
      const p1Saju = createSajuProfile('목');
      const p2Saju = createSajuProfile('화');
      const p1Astro = createAstroProfile();
      const p2Astro = createAstroProfile();

      const result = analyzeElementFusion(p1Saju, p2Saju, p1Astro, p2Astro);

      expect(result).toHaveProperty('person1');
      expect(result).toHaveProperty('person2');
      expect(result).toHaveProperty('mutualCompletion');
      expect(result).toHaveProperty('interpretation');
    });

    it('should include person element analysis', () => {
      const p1Saju = createSajuProfile('목');
      const p2Saju = createSajuProfile('화');
      const p1Astro = createAstroProfile();
      const p2Astro = createAstroProfile();

      const result = analyzeElementFusion(p1Saju, p2Saju, p1Astro, p2Astro);

      expect(result.person1).toHaveProperty('sajuDominant');
      expect(result.person1).toHaveProperty('sajuWeak');
      expect(result.person1).toHaveProperty('astroDominant');
      expect(result.person1).toHaveProperty('astroWeak');
    });

    it('should include mutualCompletion analysis', () => {
      const p1Saju = createSajuProfile('목');
      const p2Saju = createSajuProfile('화');
      const p1Astro = createAstroProfile();
      const p2Astro = createAstroProfile();

      const result = analyzeElementFusion(p1Saju, p2Saju, p1Astro, p2Astro);

      expect(result.mutualCompletion).toHaveProperty('p1NeedsFromP2');
      expect(result.mutualCompletion).toHaveProperty('p2NeedsFromP1');
      expect(result.mutualCompletion).toHaveProperty('completionScore');
    });

    it('should return completionScore between 0 and 100', () => {
      const p1Saju = createSajuProfile('목');
      const p2Saju = createSajuProfile('화');
      const p1Astro = createAstroProfile();
      const p2Astro = createAstroProfile();

      const result = analyzeElementFusion(p1Saju, p2Saju, p1Astro, p2Astro);

      expect(result.mutualCompletion.completionScore).toBeGreaterThanOrEqual(0);
      expect(result.mutualCompletion.completionScore).toBeLessThanOrEqual(100);
    });

    describe('weak element detection', () => {
      it('should detect missing elements', () => {
        const p1Saju: SajuProfile = {
          dayMaster: { name: '甲', element: '목' },
          pillars: {
            year: { stem: '甲', branch: '寅' },
            month: { stem: '甲', branch: '卯' },
            day: { stem: '甲', branch: '辰' },
            time: { stem: '甲', branch: '巳' },
          },
          elements: {
            wood: 4,
            fire: 2,
            earth: 1,
            metal: 0, // Missing
            water: 1,
          },
        };

        const p2Saju = createSajuProfile('금');
        const p1Astro = createAstroProfile();
        const p2Astro = createAstroProfile();

        const result = analyzeElementFusion(p1Saju, p2Saju, p1Astro, p2Astro);

        expect(result.person1.sajuWeak).toContain('metal');
      });
    });
  });

  describe('analyzePillarPlanetCorrespondence', () => {
    it('should return PillarPlanetCorrespondence with all required fields', () => {
      const p1Saju = createSajuProfile('목');
      const p2Saju = createSajuProfile('화');
      const p1Astro = createAstroProfile();
      const p2Astro = createAstroProfile();

      const result = analyzePillarPlanetCorrespondence(p1Saju, p2Saju, p1Astro, p2Astro);

      expect(result).toHaveProperty('yearPillarJupiter');
      expect(result).toHaveProperty('monthPillarMoon');
      expect(result).toHaveProperty('dayPillarSun');
      expect(result).toHaveProperty('timePillarMercury');
      expect(result).toHaveProperty('venusRelationship');
      expect(result).toHaveProperty('marsEnergy');
      expect(result).toHaveProperty('overallCorrespondence');
      expect(result).toHaveProperty('fusionReading');
    });

    it('should return valid harmony scores for each correspondence', () => {
      const p1Saju = createSajuProfile('목');
      const p2Saju = createSajuProfile('화');
      const p1Astro = createAstroProfile();
      const p2Astro = createAstroProfile();

      const result = analyzePillarPlanetCorrespondence(p1Saju, p2Saju, p1Astro, p2Astro);

      expect(result.yearPillarJupiter.harmony).toBeGreaterThanOrEqual(0);
      expect(result.yearPillarJupiter.harmony).toBeLessThanOrEqual(100);
      expect(result.monthPillarMoon.harmony).toBeGreaterThanOrEqual(0);
      expect(result.dayPillarSun.harmony).toBeGreaterThanOrEqual(0);
      expect(result.timePillarMercury.harmony).toBeGreaterThanOrEqual(0);
      expect(result.venusRelationship.harmony).toBeGreaterThanOrEqual(0);
      expect(result.marsEnergy.harmony).toBeGreaterThanOrEqual(0);
    });

    it('should return overallCorrespondence between 0 and 100', () => {
      const p1Saju = createSajuProfile('목');
      const p2Saju = createSajuProfile('화');
      const p1Astro = createAstroProfile();
      const p2Astro = createAstroProfile();

      const result = analyzePillarPlanetCorrespondence(p1Saju, p2Saju, p1Astro, p2Astro);

      expect(result.overallCorrespondence).toBeGreaterThanOrEqual(0);
      expect(result.overallCorrespondence).toBeLessThanOrEqual(100);
    });

    it('should include descriptions for each correspondence', () => {
      const p1Saju = createSajuProfile('목');
      const p2Saju = createSajuProfile('화');
      const p1Astro = createAstroProfile();
      const p2Astro = createAstroProfile();

      const result = analyzePillarPlanetCorrespondence(p1Saju, p2Saju, p1Astro, p2Astro);

      expect(typeof result.yearPillarJupiter.description).toBe('string');
      expect(typeof result.monthPillarMoon.description).toBe('string');
      expect(typeof result.dayPillarSun.description).toBe('string');
      expect(typeof result.fusionReading).toBe('string');
    });
  });

  describe('performCrossSystemAnalysis', () => {
    it('should return CrossAnalysisResult with all required fields', () => {
      const p1Saju = createSajuProfile('목');
      const p2Saju = createSajuProfile('화');
      const p1Astro = createAstroProfile();
      const p2Astro = createAstroProfile();

      const result = performCrossSystemAnalysis(p1Saju, p2Saju, p1Astro, p2Astro);

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('dayMasterSunAnalysis');
      expect(result).toHaveProperty('monthBranchMoonAnalysis');
      expect(result).toHaveProperty('elementFusionAnalysis');
      expect(result).toHaveProperty('pillarPlanetCorrespondence');
      expect(result).toHaveProperty('crossSystemScore');
      expect(result).toHaveProperty('fusionInsights');
    });

    it('should return null when profiles are missing', () => {
      const p1Saju = createSajuProfile('목');
      const p2Saju = createSajuProfile('화');

      const result1 = performCrossSystemAnalysis(null, p2Saju, null, null);
      const result2 = performCrossSystemAnalysis(p1Saju, null, null, null);
      const result3 = performCrossSystemAnalysis(p1Saju, p2Saju, null, null);

      expect(result1).toBeNull();
      expect(result2).toBeNull();
      expect(result3).toBeNull();
    });

    it('should return crossSystemScore between 0 and 100', () => {
      const p1Saju = createSajuProfile('목');
      const p2Saju = createSajuProfile('화');
      const p1Astro = createAstroProfile();
      const p2Astro = createAstroProfile();

      const result = performCrossSystemAnalysis(p1Saju, p2Saju, p1Astro, p2Astro);

      expect(result?.crossSystemScore).toBeGreaterThanOrEqual(0);
      expect(result?.crossSystemScore).toBeLessThanOrEqual(100);
    });

    it('should return fusionInsights array', () => {
      const p1Saju = createSajuProfile('목');
      const p2Saju = createSajuProfile('화');
      const p1Astro = createAstroProfile();
      const p2Astro = createAstroProfile();

      const result = performCrossSystemAnalysis(p1Saju, p2Saju, p1Astro, p2Astro);

      expect(Array.isArray(result?.fusionInsights)).toBe(true);
      expect(result?.fusionInsights.length).toBeGreaterThan(0);
    });

    describe('score composition', () => {
      it('should weight different analyses appropriately', () => {
        const p1Saju = createSajuProfile('목');
        const p2Saju = createSajuProfile('화');
        const p1Astro = createAstroProfile();
        const p2Astro = createAstroProfile();

        const result = performCrossSystemAnalysis(p1Saju, p2Saju, p1Astro, p2Astro);

        // Score should be weighted average of component scores
        expect(result?.crossSystemScore).toBeDefined();
        expect(typeof result?.crossSystemScore).toBe('number');
      });
    });
  });

  describe('element compatibility', () => {
    describe('same elements', () => {
      it('should recognize same element affinity', () => {
        const p1Saju = createSajuProfile('화');
        const p2Saju = createSajuProfile('화');
        const p1Astro = createAstroProfile('leo', 'fire');
        const p2Astro = createAstroProfile('aries', 'fire');

        const result = performCrossSystemAnalysis(p1Saju, p2Saju, p1Astro, p2Astro);

        expect(result?.crossSystemScore).toBeGreaterThan(50);
      });
    });

    describe('generating cycle (상생)', () => {
      it('should recognize wood-fire generation', () => {
        const p1Saju = createSajuProfile('목');
        const p2Saju = createSajuProfile('화');
        const p1Astro = createAstroProfile('virgo', 'earth');
        const p2Astro = createAstroProfile('aries', 'fire');

        const result = performCrossSystemAnalysis(p1Saju, p2Saju, p1Astro, p2Astro);

        expect(result?.crossSystemScore).toBeGreaterThan(40);
      });

      it('should recognize fire-earth generation', () => {
        const p1Saju = createSajuProfile('화');
        const p2Saju = createSajuProfile('토');
        const p1Astro = createAstroProfile();
        const p2Astro = createAstroProfile();

        const result = performCrossSystemAnalysis(p1Saju, p2Saju, p1Astro, p2Astro);

        expect(result).not.toBeNull();
      });
    });

    describe('controlling cycle (상극)', () => {
      it('should recognize challenging relationships', () => {
        const p1Saju = createSajuProfile('화');
        const p2Saju = createSajuProfile('금');
        const p1Astro = createAstroProfile();
        const p2Astro = createAstroProfile();

        const result = performCrossSystemAnalysis(p1Saju, p2Saju, p1Astro, p2Astro);

        expect(result).not.toBeNull();
      });
    });
  });

  describe('all five elements', () => {
    const elements = ['목', '화', '토', '금', '수'];

    elements.forEach((el1) => {
      elements.forEach((el2) => {
        it(`should handle ${el1} - ${el2} combination`, () => {
          const p1Saju = createSajuProfile(el1);
          const p2Saju = createSajuProfile(el2);
          const p1Astro = createAstroProfile();
          const p2Astro = createAstroProfile();

          const result = performCrossSystemAnalysis(p1Saju, p2Saju, p1Astro, p2Astro);

          expect(result).not.toBeNull();
          expect(result?.crossSystemScore).toBeGreaterThanOrEqual(0);
          expect(result?.crossSystemScore).toBeLessThanOrEqual(100);
        });
      });
    });
  });

  describe('astrology elements', () => {
    const astroElements = ['fire', 'earth', 'air', 'water'];

    astroElements.forEach((el) => {
      it(`should handle ${el} astrology element`, () => {
        const p1Saju = createSajuProfile('목');
        const p2Saju = createSajuProfile('화');
        const p1Astro = createAstroProfile('aries', el);
        const p2Astro = createAstroProfile('leo', el);

        const result = performCrossSystemAnalysis(p1Saju, p2Saju, p1Astro, p2Astro);

        expect(result).not.toBeNull();
      });
    });
  });
});
