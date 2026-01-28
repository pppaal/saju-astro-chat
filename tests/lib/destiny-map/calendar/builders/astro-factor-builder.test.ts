/**
 * Tests for src/lib/destiny-map/calendar/builders/astro-factor-builder.ts
 * 점성술 요소 키 생성 테스트
 */

import { describe, it, expect } from 'vitest';
import { buildAstroFactorKeys, type AstroFactorBuilderInput } from '@/lib/destiny-map/calendar/builders/astro-factor-builder';

describe('astro-factor-builder', () => {
  const baseInput: AstroFactorBuilderInput = {
    transitSunElement: 'fire',
    natalSunElement: 'fire',
    lunarPhaseName: 'newMoon',
    retrogradePlanets: [],
    hasVoidOfCourse: false,
    eclipseImpact: { hasImpact: false },
    planetaryHourDayRuler: 'Sun',
    planetTransitFactorKeys: [],
    solarReturnFactorKeys: [],
    progressionFactorKeys: [],
    moonPhaseFactorKey: 'waxingCrescent',
    moonPhaseScore: 70,
    ganzhiStemElement: 'fire',
    crossVerified: false,
    sajuPositive: false,
    astroPositive: false,
    sajuNegative: false,
    astroNegative: false,
  };

  describe('element relationships', () => {
    it('should detect same element', () => {
      const result = buildAstroFactorKeys({
        ...baseInput,
        transitSunElement: 'fire',
        natalSunElement: 'fire',
      });
      expect(result.factorKeys).toContain('sameElement');
    });

    it('should detect support element (generatedBy)', () => {
      // wood is generatedBy water
      const result = buildAstroFactorKeys({
        ...baseInput,
        transitSunElement: 'water',
        natalSunElement: 'wood',
      });
      expect(result.factorKeys).toContain('supportElement');
    });

    it('should detect giving element (generates)', () => {
      // wood generates fire
      const result = buildAstroFactorKeys({
        ...baseInput,
        transitSunElement: 'fire',
        natalSunElement: 'wood',
      });
      expect(result.factorKeys).toContain('givingElement');
    });

    it('should detect conflict element (controlledBy)', () => {
      // wood is controlledBy metal
      const result = buildAstroFactorKeys({
        ...baseInput,
        transitSunElement: 'metal',
        natalSunElement: 'wood',
      });
      expect(result.factorKeys).toContain('conflictElement');
    });

    it('should detect control element (controls)', () => {
      // wood controls earth
      const result = buildAstroFactorKeys({
        ...baseInput,
        transitSunElement: 'earth',
        natalSunElement: 'wood',
      });
      expect(result.factorKeys).toContain('controlElement');
    });
  });

  describe('lunar phases', () => {
    it('should detect new moon', () => {
      const result = buildAstroFactorKeys({
        ...baseInput,
        lunarPhaseName: 'newMoon',
      });
      expect(result.factorKeys).toContain('lunarNewMoon');
    });

    it('should detect full moon', () => {
      const result = buildAstroFactorKeys({
        ...baseInput,
        lunarPhaseName: 'fullMoon',
      });
      expect(result.factorKeys).toContain('lunarFullMoon');
    });

    it('should detect first quarter', () => {
      const result = buildAstroFactorKeys({
        ...baseInput,
        lunarPhaseName: 'firstQuarter',
      });
      expect(result.factorKeys).toContain('lunarFirstQuarter');
    });

    it('should detect last quarter', () => {
      const result = buildAstroFactorKeys({
        ...baseInput,
        lunarPhaseName: 'lastQuarter',
      });
      expect(result.factorKeys).toContain('lunarLastQuarter');
    });

    it('should not add lunar key for other phases', () => {
      const result = buildAstroFactorKeys({
        ...baseInput,
        lunarPhaseName: 'waxingGibbous',
      });
      expect(result.factorKeys).not.toContain('lunarNewMoon');
      expect(result.factorKeys).not.toContain('lunarFullMoon');
    });
  });

  describe('retrograde planets', () => {
    it('should add retrograde keys for each planet', () => {
      const result = buildAstroFactorKeys({
        ...baseInput,
        retrogradePlanets: ['mercury', 'venus'],
      });
      expect(result.factorKeys).toContain('retrogradeMercury');
      expect(result.factorKeys).toContain('retrogradeVenus');
    });

    it('should handle no retrograde planets', () => {
      const result = buildAstroFactorKeys({
        ...baseInput,
        retrogradePlanets: [],
      });
      expect(result.factorKeys.filter(k => k.startsWith('retrograde'))).toHaveLength(0);
    });
  });

  describe('void of course', () => {
    it('should add voidOfCourse when active', () => {
      const result = buildAstroFactorKeys({
        ...baseInput,
        hasVoidOfCourse: true,
      });
      expect(result.factorKeys).toContain('voidOfCourse');
    });

    it('should not add voidOfCourse when inactive', () => {
      const result = buildAstroFactorKeys({
        ...baseInput,
        hasVoidOfCourse: false,
      });
      expect(result.factorKeys).not.toContain('voidOfCourse');
    });
  });

  describe('eclipse impact', () => {
    it('should add solar eclipse key', () => {
      const result = buildAstroFactorKeys({
        ...baseInput,
        eclipseImpact: { hasImpact: true, type: 'solar', intensity: 'Strong' },
      });
      expect(result.factorKeys).toContain('solarEclipseStrong');
    });

    it('should add lunar eclipse key', () => {
      const result = buildAstroFactorKeys({
        ...baseInput,
        eclipseImpact: { hasImpact: true, type: 'lunar', intensity: 'Moderate' },
      });
      expect(result.factorKeys).toContain('lunarEclipseModerate');
    });

    it('should not add eclipse key when no impact', () => {
      const result = buildAstroFactorKeys({
        ...baseInput,
        eclipseImpact: { hasImpact: false },
      });
      expect(result.factorKeys.filter(k => k.includes('Eclipse'))).toHaveLength(0);
    });
  });

  describe('cross verification', () => {
    it('should add crossVerified when true', () => {
      const result = buildAstroFactorKeys({
        ...baseInput,
        crossVerified: true,
      });
      expect(result.factorKeys).toContain('crossVerified');
    });

    it('should add crossNegative when both saju and astro are negative', () => {
      const result = buildAstroFactorKeys({
        ...baseInput,
        sajuNegative: true,
        astroNegative: true,
      });
      expect(result.factorKeys).toContain('crossNegative');
    });

    it('should add mixedSignals when saju positive and astro negative', () => {
      const result = buildAstroFactorKeys({
        ...baseInput,
        sajuPositive: true,
        astroNegative: true,
      });
      expect(result.factorKeys).toContain('mixedSignals');
    });

    it('should add mixedSignals when saju negative and astro positive', () => {
      const result = buildAstroFactorKeys({
        ...baseInput,
        sajuNegative: true,
        astroPositive: true,
      });
      expect(result.factorKeys).toContain('mixedSignals');
    });
  });

  describe('aligned element', () => {
    it('should add alignedElement when ganzhi matches transit sun', () => {
      const result = buildAstroFactorKeys({
        ...baseInput,
        ganzhiStemElement: 'fire',
        transitSunElement: 'fire',
      });
      expect(result.factorKeys).toContain('alignedElement');
    });
  });

  describe('composite factor keys', () => {
    it('should include planet transit, solar return, and progression factor keys', () => {
      const result = buildAstroFactorKeys({
        ...baseInput,
        planetTransitFactorKeys: ['transitJupiterConjunction'],
        solarReturnFactorKeys: ['solarReturnSunHouse1'],
        progressionFactorKeys: ['progressionMoonPhaseNew'],
      });

      expect(result.factorKeys).toContain('transitJupiterConjunction');
      expect(result.factorKeys).toContain('solarReturnSunHouse1');
      expect(result.factorKeys).toContain('progressionMoonPhaseNew');
    });

    it('should always include moonPhaseFactorKey', () => {
      const result = buildAstroFactorKeys(baseInput);
      expect(result.factorKeys).toContain('waxingCrescent');
    });

    it('should always include dayRuler key', () => {
      const result = buildAstroFactorKeys(baseInput);
      expect(result.factorKeys).toContain('dayRulerSun');
    });
  });
});
