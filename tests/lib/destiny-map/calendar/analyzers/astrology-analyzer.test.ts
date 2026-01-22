/**
 * Tests for astrology-analyzer.ts
 */
import { describe, it, expect } from 'vitest';
import { analyzeAstrology, type AstrologyAnalysisInput } from '@/lib/destiny-map/calendar/analyzers/astrology-analyzer';
import type { UserAstroProfile } from '@/lib/destiny-map/calendar/types';

describe('astrology-analyzer', () => {
  const mockProfile: UserAstroProfile = {
    sunSign: 'Aries',
    moonSign: 'Taurus',
    ascendant: 'Gemini',
    sunLongitude: 15.5,
    moonLongitude: 45.3,
    birthMonth: 4,
    birthDay: 15,
    sunElement: 'fire',
  };

  const baseInput: AstrologyAnalysisInput = {
    date: new Date('2024-04-15T12:00:00Z'),
    astroProfile: mockProfile,
    natalSunElement: 'fire',
    dayMasterElement: 'Wood',
    birthYear: 1990,
  };

  it('should return complete analysis', () => {
    const result = analyzeAstrology(baseInput);
    expect(result).toHaveProperty('lunarPhase');
    expect(result).toHaveProperty('moonPhaseDetailed');
    expect(result).toHaveProperty('planetTransits');
    expect(result).toHaveProperty('retrogradePlanets');
    expect(result).toHaveProperty('voidOfCourse');
    expect(result).toHaveProperty('eclipseImpact');
    expect(result).toHaveProperty('planetaryHour');
    expect(result).toHaveProperty('solarReturnAnalysis');
    expect(result).toHaveProperty('progressionAnalysis');
  });

  it('should include lunar phase', () => {
    const result = analyzeAstrology(baseInput);
    expect(result.lunarPhase).toBeDefined();
  });

  it('should include moon phase detailed', () => {
    const result = analyzeAstrology(baseInput);
    expect(result.moonPhaseDetailed).toBeDefined();
  });

  it('should include planet transits', () => {
    const result = analyzeAstrology(baseInput);
    expect(result.planetTransits).toBeDefined();
  });

  it('should include retrograde planets array', () => {
    const result = analyzeAstrology(baseInput);
    expect(Array.isArray(result.retrogradePlanets)).toBe(true);
  });

  it('should include void of course', () => {
    const result = analyzeAstrology(baseInput);
    expect(result.voidOfCourse).toBeDefined();
    expect(result.voidOfCourse).toHaveProperty('isVoid');
  });

  it('should include eclipse impact', () => {
    const result = analyzeAstrology(baseInput);
    expect(result.eclipseImpact).toBeDefined();
  });

  it('should include planetary hour', () => {
    const result = analyzeAstrology(baseInput);
    expect(result.planetaryHour).toBeDefined();
  });

  it('should include solar return', () => {
    const result = analyzeAstrology(baseInput);
    expect(result.solarReturnAnalysis).toBeDefined();
  });

  it('should include progressions', () => {
    const result = analyzeAstrology(baseInput);
    expect(result.progressionAnalysis).toBeDefined();
  });

  it('should handle different dates', () => {
    const winter = analyzeAstrology({ ...baseInput, date: new Date('2024-01-15') });
    const summer = analyzeAstrology({ ...baseInput, date: new Date('2024-07-15') });
    expect(winter).toBeDefined();
    expect(summer).toBeDefined();
  });

  it('should handle different sun signs', () => {
    const leo = analyzeAstrology({
      ...baseInput,
      astroProfile: { ...mockProfile, sunSign: 'Leo' },
    });
    expect(leo).toBeDefined();
  });

  it('should handle missing birth year', () => {
    const result = analyzeAstrology({ ...baseInput, birthYear: undefined });
    expect(result).toBeDefined();
  });

  it('should handle future dates', () => {
    const future = analyzeAstrology({ ...baseInput, date: new Date('2030-06-15') });
    expect(future).toBeDefined();
  });

  it('should return consistent results', () => {
    const result1 = analyzeAstrology(baseInput);
    const result2 = analyzeAstrology(baseInput);
    expect(result1.retrogradePlanets.length).toBe(result2.retrogradePlanets.length);
  });
});
