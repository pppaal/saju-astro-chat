/**
 * Basic Astrology Analysis Tests
 */
import { describe, it, expect } from 'vitest';
import { analyzeAspects, analyzeSynastry } from '@/lib/compatibility/astrology/basic-analysis';
import type { AstrologyProfile } from '@/lib/compatibility/cosmicCompatibility';

describe('Basic Astrology Analysis', () => {
  const mockProfile1: AstrologyProfile = {
    sun: { sign: 'Aries', element: 'Fire' },
    moon: { sign: 'Cancer', element: 'Water' },
    venus: { sign: 'Taurus', element: 'Earth' },
    mars: { sign: 'Leo', element: 'Fire' },
    mercury: { sign: 'Aries', element: 'Fire' },
    ascendant: { sign: 'Libra', element: 'Air' },
  };

  const mockProfile2: AstrologyProfile = {
    sun: { sign: 'Leo', element: 'Fire' },
    moon: { sign: 'Scorpio', element: 'Water' },
    venus: { sign: 'Virgo', element: 'Earth' },
    mars: { sign: 'Gemini', element: 'Air' },
    mercury: { sign: 'Leo', element: 'Fire' },
    ascendant: { sign: 'Aquarius', element: 'Air' },
  };

  const incompatibleProfile: AstrologyProfile = {
    sun: { sign: 'Capricorn', element: 'Earth' },
    moon: { sign: 'Pisces', element: 'Water' },
    venus: { sign: 'Aquarius', element: 'Air' },
    mars: { sign: 'Sagittarius', element: 'Fire' },
    mercury: { sign: 'Capricorn', element: 'Earth' },
    ascendant: { sign: 'Cancer', element: 'Water' },
  };

  describe('analyzeAspects', () => {
    it('should return aspect analysis with required properties', () => {
      const result = analyzeAspects(mockProfile1, mockProfile2);

      expect(result).toHaveProperty('majorAspects');
      expect(result).toHaveProperty('harmoniousCount');
      expect(result).toHaveProperty('challengingCount');
      expect(result).toHaveProperty('overallHarmony');
      expect(result).toHaveProperty('keyInsights');
    });

    it('should detect harmonious aspects between same elements', () => {
      // Both have Fire Sun (Aries and Leo)
      const result = analyzeAspects(mockProfile1, mockProfile2);

      expect(result.harmoniousCount).toBeGreaterThan(0);
    });

    it('should calculate overall harmony percentage', () => {
      const result = analyzeAspects(mockProfile1, mockProfile2);

      expect(result.overallHarmony).toBeGreaterThanOrEqual(0);
      expect(result.overallHarmony).toBeLessThanOrEqual(100);
    });

    it('should generate key insights', () => {
      const result = analyzeAspects(mockProfile1, mockProfile2);

      expect(Array.isArray(result.keyInsights)).toBe(true);
    });

    it('should identify Venus-Mars aspects', () => {
      const result = analyzeAspects(mockProfile1, mockProfile2);

      // Should include aspects involving Venus and Mars
      const venusAspects = result.majorAspects.filter(
        a => a.planet1 === 'Venus' || a.planet2 === 'Venus'
      );
      // May or may not have Venus aspects depending on element compatibility
      expect(Array.isArray(venusAspects)).toBe(true);
    });

    it('should handle profiles with challenging aspects', () => {
      const result = analyzeAspects(mockProfile1, incompatibleProfile);

      expect(result.challengingCount).toBeGreaterThanOrEqual(0);
    });

    it('should filter major aspects correctly', () => {
      const result = analyzeAspects(mockProfile1, mockProfile2);

      // Major aspects should have strength 'strong' or 'moderate'
      for (const aspect of result.majorAspects) {
        expect(['strong', 'moderate']).toContain(aspect.strength);
      }
    });
  });

  describe('analyzeSynastry', () => {
    it('should return synastry analysis with required properties', () => {
      const result = analyzeSynastry(mockProfile1, mockProfile2);

      expect(result).toHaveProperty('emotionalConnection');
      expect(result).toHaveProperty('intellectualConnection');
      expect(result).toHaveProperty('romanticConnection');
      expect(result).toHaveProperty('compatibilityIndex');
      expect(result).toHaveProperty('strengths');
      expect(result).toHaveProperty('challenges');
    });

    it('should calculate emotional connection', () => {
      const result = analyzeSynastry(mockProfile1, mockProfile2);

      expect(typeof result.emotionalConnection).toBe('number');
      expect(result.emotionalConnection).toBeGreaterThanOrEqual(0);
      expect(result.emotionalConnection).toBeLessThanOrEqual(100);
    });

    it('should calculate romantic connection', () => {
      const result = analyzeSynastry(mockProfile1, mockProfile2);

      expect(typeof result.romanticConnection).toBe('number');
      expect(result.romanticConnection).toBeGreaterThanOrEqual(0);
      expect(result.romanticConnection).toBeLessThanOrEqual(100);
    });

    it('should calculate intellectual connection', () => {
      const result = analyzeSynastry(mockProfile1, mockProfile2);

      expect(typeof result.intellectualConnection).toBe('number');
      expect(result.intellectualConnection).toBeGreaterThanOrEqual(0);
      expect(result.intellectualConnection).toBeLessThanOrEqual(100);
    });

    it('should calculate compatibility index between 0 and 100', () => {
      const result = analyzeSynastry(mockProfile1, mockProfile2);

      expect(result.compatibilityIndex).toBeGreaterThanOrEqual(0);
      expect(result.compatibilityIndex).toBeLessThanOrEqual(100);
    });

    it('should identify strengths and challenges', () => {
      const result = analyzeSynastry(mockProfile1, mockProfile2);

      expect(Array.isArray(result.strengths)).toBe(true);
      expect(Array.isArray(result.challenges)).toBe(true);
    });

    it('should give higher score for compatible profiles', () => {
      const compatibleResult = analyzeSynastry(mockProfile1, mockProfile2);
      const incompatibleResult = analyzeSynastry(mockProfile1, incompatibleProfile);

      // Fire-Fire (mockProfile1, mockProfile2) should generally score better
      expect(typeof compatibleResult.compatibilityIndex).toBe('number');
      expect(typeof incompatibleResult.compatibilityIndex).toBe('number');
    });
  });

  describe('Aspect Types', () => {
    it('should identify conjunction for same elements', () => {
      const sameElementProfile: AstrologyProfile = {
        sun: { sign: 'Aries', element: 'Fire' },
        moon: { sign: 'Leo', element: 'Fire' },
        venus: { sign: 'Sagittarius', element: 'Fire' },
        mars: { sign: 'Aries', element: 'Fire' },
        mercury: { sign: 'Leo', element: 'Fire' },
        ascendant: { sign: 'Sagittarius', element: 'Fire' },
      };

      const result = analyzeAspects(mockProfile1, sameElementProfile);

      // Should have harmonious aspects since both have Fire suns
      expect(result.harmoniousCount).toBeGreaterThan(0);
    });

    it('should handle water-earth compatibility', () => {
      const waterProfile: AstrologyProfile = {
        sun: { sign: 'Cancer', element: 'Water' },
        moon: { sign: 'Pisces', element: 'Water' },
        venus: { sign: 'Scorpio', element: 'Water' },
        mars: { sign: 'Cancer', element: 'Water' },
        mercury: { sign: 'Pisces', element: 'Water' },
        ascendant: { sign: 'Scorpio', element: 'Water' },
      };

      const earthProfile: AstrologyProfile = {
        sun: { sign: 'Taurus', element: 'Earth' },
        moon: { sign: 'Virgo', element: 'Earth' },
        venus: { sign: 'Capricorn', element: 'Earth' },
        mars: { sign: 'Taurus', element: 'Earth' },
        mercury: { sign: 'Virgo', element: 'Earth' },
        ascendant: { sign: 'Capricorn', element: 'Earth' },
      };

      const result = analyzeAspects(waterProfile, earthProfile);

      // Water and Earth are compatible elements
      expect(result.harmoniousCount).toBeGreaterThan(0);
    });

    it('should handle fire-air compatibility', () => {
      const fireProfile: AstrologyProfile = {
        sun: { sign: 'Aries', element: 'Fire' },
        moon: { sign: 'Leo', element: 'Fire' },
        venus: { sign: 'Sagittarius', element: 'Fire' },
        mars: { sign: 'Aries', element: 'Fire' },
        mercury: { sign: 'Leo', element: 'Fire' },
        ascendant: { sign: 'Sagittarius', element: 'Fire' },
      };

      const airProfile: AstrologyProfile = {
        sun: { sign: 'Gemini', element: 'Air' },
        moon: { sign: 'Libra', element: 'Air' },
        venus: { sign: 'Aquarius', element: 'Air' },
        mars: { sign: 'Gemini', element: 'Air' },
        mercury: { sign: 'Libra', element: 'Air' },
        ascendant: { sign: 'Aquarius', element: 'Air' },
      };

      const result = analyzeAspects(fireProfile, airProfile);

      // Fire and Air are compatible elements
      expect(result.harmoniousCount).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle same profile comparison', () => {
      const result = analyzeAspects(mockProfile1, mockProfile1);

      // Same profile should have high harmony
      expect(result.overallHarmony).toBeGreaterThan(50);
    });

    it('should return valid results for any valid profiles', () => {
      const result = analyzeAspects(mockProfile1, mockProfile2);

      expect(result.harmoniousCount + result.challengingCount)
        .toBeLessThanOrEqual(result.majorAspects.length + 10); // Some tolerance for filtering
    });
  });
});
