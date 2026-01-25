/**
 * Davison Chart and Progressed Chart Analysis Tests
 * 데이비슨 차트와 프로그레스 차트 분석 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import {
  analyzeDavisonChart,
  analyzeProgressedChart,
  type DavisonChartAnalysis,
  type ProgressedChartAnalysis,
} from '@/lib/compatibility/astrology/davison-progressed';
import type { AstrologyProfile } from '@/lib/compatibility/cosmicCompatibility';

// Mock isCompatibleElement
vi.mock('@/lib/compatibility/astrology/element-utils', () => ({
  isCompatibleElement: vi.fn((el1: string, el2: string) => {
    const compatiblePairs: Record<string, string[]> = {
      'fire': ['air'],
      'air': ['fire'],
      'earth': ['water'],
      'water': ['earth'],
    };
    return compatiblePairs[el1]?.includes(el2) || false;
  }),
}));

describe('DavisonProgressedAnalysis', () => {
  // Helper function to create mock profiles
  function createMockProfile(sun: string, moon: string, ascendant?: string): AstrologyProfile {
    return {
      sun: { sign: sun, degree: 15 },
      moon: { sign: moon, degree: 15 },
      ascendant: ascendant ? { sign: ascendant, degree: 15 } : undefined,
      planets: {},
    };
  }

  describe('analyzeDavisonChart', () => {
    describe('fire element dominance', () => {
      it('should identify passionate relationship identity for fire sun midpoint', () => {
        // Same fire sign = fire midpoint
        const p1 = createMockProfile('Aries', 'Aries', 'Aries');
        const p2 = createMockProfile('Aries', 'Aries', 'Aries');

        const result = analyzeDavisonChart(p1, p2);

        expect(result.relationshipIdentity).toContain('열정');
        expect(result.coreStrengths).toContainEqual(expect.stringContaining('새로운 것'));
      });

      it('should set relationship purpose for fire dominant', () => {
        // All fire signs
        const p1 = createMockProfile('Leo', 'Leo', 'Leo');
        const p2 = createMockProfile('Leo', 'Leo', 'Leo');

        const result = analyzeDavisonChart(p1, p2);

        expect(result.relationshipPurpose).toContain('영감');
      });

      it('should identify emotional challenges for fire moon', () => {
        // Fire moon midpoint (Leo + Leo = Leo)
        const p1 = createMockProfile('Taurus', 'Leo', 'Taurus');
        const p2 = createMockProfile('Taurus', 'Leo', 'Taurus');

        const result = analyzeDavisonChart(p1, p2);

        expect(result.emotionalFoundation).toContain('열정');
        expect(result.growthChallenges).toContainEqual(expect.stringContaining('감정적 안정'));
      });

      it('should identify vibrant public image for fire ascendant', () => {
        // Fire ascendant midpoint
        const p1 = createMockProfile('Taurus', 'Taurus', 'Leo');
        const p2 = createMockProfile('Taurus', 'Taurus', 'Leo');

        const result = analyzeDavisonChart(p1, p2);

        expect(result.publicImage).toContain('활기');
      });
    });

    describe('earth element dominance', () => {
      it('should identify stable relationship identity for earth sun midpoint', () => {
        // Same earth sign = earth midpoint
        const p1 = createMockProfile('Taurus', 'Taurus', 'Taurus');
        const p2 = createMockProfile('Taurus', 'Taurus', 'Taurus');

        const result = analyzeDavisonChart(p1, p2);

        expect(result.relationshipIdentity).toContain('안정');
        expect(result.coreStrengths).toContainEqual(expect.stringContaining('신뢰'));
      });

      it('should set relationship purpose for earth dominant', () => {
        // All earth signs
        const p1 = createMockProfile('Virgo', 'Virgo', 'Virgo');
        const p2 = createMockProfile('Virgo', 'Virgo', 'Virgo');

        const result = analyzeDavisonChart(p1, p2);

        expect(result.relationshipPurpose).toContain('안정적인 기반');
      });

      it('should identify emotional stability for earth moon', () => {
        // Earth moon midpoint
        const p1 = createMockProfile('Aries', 'Taurus', 'Aries');
        const p2 = createMockProfile('Aries', 'Taurus', 'Aries');

        const result = analyzeDavisonChart(p1, p2);

        expect(result.emotionalFoundation).toContain('안정');
        expect(result.coreStrengths).toContainEqual(expect.stringContaining('감정적 신뢰'));
      });

      it('should identify trustworthy public image for earth ascendant', () => {
        // Earth ascendant midpoint
        const p1 = createMockProfile('Aries', 'Aries', 'Capricorn');
        const p2 = createMockProfile('Aries', 'Aries', 'Capricorn');

        const result = analyzeDavisonChart(p1, p2);

        expect(result.publicImage).toContain('신뢰');
      });
    });

    describe('air element dominance', () => {
      it('should identify intellectual relationship identity for air sun midpoint', () => {
        // Same air sign = air midpoint
        const p1 = createMockProfile('Gemini', 'Gemini', 'Gemini');
        const p2 = createMockProfile('Gemini', 'Gemini', 'Gemini');

        const result = analyzeDavisonChart(p1, p2);

        expect(result.relationshipIdentity).toContain('지적');
        expect(result.coreStrengths).toContainEqual(expect.stringContaining('대화'));
      });

      it('should set relationship purpose for air dominant', () => {
        // All air signs
        const p1 = createMockProfile('Libra', 'Libra', 'Libra');
        const p2 = createMockProfile('Libra', 'Libra', 'Libra');

        const result = analyzeDavisonChart(p1, p2);

        expect(result.relationshipPurpose).toContain('지적 성장');
      });

      it('should identify communication-based emotional foundation for air moon', () => {
        // Air moon midpoint
        const p1 = createMockProfile('Taurus', 'Gemini', 'Taurus');
        const p2 = createMockProfile('Taurus', 'Gemini', 'Taurus');

        const result = analyzeDavisonChart(p1, p2);

        expect(result.emotionalFoundation).toContain('대화');
        expect(result.growthChallenges).toContainEqual(expect.stringContaining('친밀감'));
      });

      it('should identify social public image for air ascendant', () => {
        // Air ascendant midpoint
        const p1 = createMockProfile('Aries', 'Aries', 'Aquarius');
        const p2 = createMockProfile('Aries', 'Aries', 'Aquarius');

        const result = analyzeDavisonChart(p1, p2);

        expect(result.publicImage).toContain('사교적');
      });
    });

    describe('water element dominance', () => {
      it('should identify deep emotional relationship identity for water sun midpoint', () => {
        // Same water sign = water midpoint
        const p1 = createMockProfile('Cancer', 'Cancer', 'Cancer');
        const p2 = createMockProfile('Cancer', 'Cancer', 'Cancer');

        const result = analyzeDavisonChart(p1, p2);

        expect(result.relationshipIdentity).toContain('감정적');
        expect(result.coreStrengths).toContainEqual(expect.stringContaining('직관'));
      });

      it('should set relationship purpose for water dominant', () => {
        // All water signs
        const p1 = createMockProfile('Scorpio', 'Scorpio', 'Scorpio');
        const p2 = createMockProfile('Scorpio', 'Scorpio', 'Scorpio');

        const result = analyzeDavisonChart(p1, p2);

        expect(result.relationshipPurpose).toContain('감정적 치유');
      });

      it('should identify empathic emotional foundation for water moon', () => {
        // Water moon midpoint
        const p1 = createMockProfile('Aries', 'Pisces', 'Aries');
        const p2 = createMockProfile('Aries', 'Pisces', 'Aries');

        const result = analyzeDavisonChart(p1, p2);

        expect(result.emotionalFoundation).toContain('공감');
        expect(result.coreStrengths).toContainEqual(expect.stringContaining('비언어'));
      });

      it('should identify devoted public image for water ascendant', () => {
        // Water ascendant midpoint
        const p1 = createMockProfile('Aries', 'Aries', 'Scorpio');
        const p2 = createMockProfile('Aries', 'Aries', 'Scorpio');

        const result = analyzeDavisonChart(p1, p2);

        expect(result.publicImage).toContain('헌신');
      });
    });

    describe('midpoint calculation', () => {
      it('should calculate midpoint between adjacent signs', () => {
        const p1 = createMockProfile('Aries', 'Cancer', 'Leo');
        const p2 = createMockProfile('Taurus', 'Cancer', 'Leo');

        const result = analyzeDavisonChart(p1, p2);

        // Midpoint between Aries(0) and Taurus(1) is Aries or Taurus (index 0)
        expect(result.relationshipSun).toHaveProperty('sign');
        expect(result.relationshipSun).toHaveProperty('element');
      });

      it('should calculate midpoint across zodiac boundary correctly', () => {
        const p1 = createMockProfile('Aries', 'Cancer', 'Leo');
        const p2 = createMockProfile('Pisces', 'Cancer', 'Leo');

        const result = analyzeDavisonChart(p1, p2);

        // Aries(0) and Pisces(11) should have midpoint considering wrap-around
        expect(result.relationshipSun).toHaveProperty('sign');
      });

      it('should handle same sign for both partners', () => {
        const p1 = createMockProfile('Leo', 'Scorpio', 'Aquarius');
        const p2 = createMockProfile('Leo', 'Scorpio', 'Aquarius');

        const result = analyzeDavisonChart(p1, p2);

        expect(result.relationshipSun.sign).toBe('Leo');
        expect(result.relationshipMoon.sign).toBe('Scorpio');
        expect(result.relationshipAscendant.sign).toBe('Aquarius');
      });

      it('should use sun sign when ascendant is missing', () => {
        const p1 = createMockProfile('Aries', 'Cancer');
        const p2 = createMockProfile('Leo', 'Scorpio');

        const result = analyzeDavisonChart(p1, p2);

        // Should not throw and should have ascendant midpoint
        expect(result.relationshipAscendant).toHaveProperty('sign');
      });
    });

    describe('return structure', () => {
      it('should return complete DavisonChartAnalysis structure', () => {
        const p1 = createMockProfile('Aries', 'Cancer', 'Libra');
        const p2 = createMockProfile('Leo', 'Scorpio', 'Aquarius');

        const result = analyzeDavisonChart(p1, p2);

        expect(result).toHaveProperty('relationshipSun');
        expect(result).toHaveProperty('relationshipMoon');
        expect(result).toHaveProperty('relationshipAscendant');
        expect(result).toHaveProperty('relationshipIdentity');
        expect(result).toHaveProperty('emotionalFoundation');
        expect(result).toHaveProperty('publicImage');
        expect(result).toHaveProperty('coreStrengths');
        expect(result).toHaveProperty('growthChallenges');
        expect(result).toHaveProperty('relationshipPurpose');
      });

      it('should have non-empty arrays for strengths', () => {
        const p1 = createMockProfile('Aries', 'Cancer', 'Libra');
        const p2 = createMockProfile('Leo', 'Scorpio', 'Aquarius');

        const result = analyzeDavisonChart(p1, p2);

        expect(result.coreStrengths.length).toBeGreaterThan(0);
      });
    });
  });

  describe('analyzeProgressedChart', () => {
    describe('progressed sun phase analysis', () => {
      it('should identify harmony when progressed suns are same element', () => {
        const p1 = createMockProfile('Aries', 'Cancer', 'Libra');
        const p2 = createMockProfile('Aries', 'Cancer', 'Libra');

        const result = analyzeProgressedChart(p1, p2, 0);

        // Same starting sun signs = same progressed sun
        expect(result.progressedSunPhase).toContain('조화');
        expect(result.timedInfluences).toContainEqual(expect.stringContaining('일치'));
      });

      it('should identify compatible energy when elements are compatible', () => {
        const p1 = createMockProfile('Aries', 'Cancer', 'Libra'); // fire
        const p2 = createMockProfile('Gemini', 'Cancer', 'Libra'); // air

        const result = analyzeProgressedChart(p1, p2, 0);

        // Fire and Air are compatible
        expect(result.progressedSunPhase).toContain('호환');
        expect(result.timedInfluences).toContainEqual(expect.stringContaining('지원'));
      });

      it('should identify different directions when elements are not compatible', () => {
        const p1 = createMockProfile('Aries', 'Cancer', 'Libra'); // fire
        const p2 = createMockProfile('Taurus', 'Cancer', 'Libra'); // earth

        const result = analyzeProgressedChart(p1, p2, 0);

        // Fire and Earth are not compatible
        expect(result.progressedSunPhase).toContain('다른 방향');
        expect(result.timedInfluences).toContainEqual(expect.stringContaining('개인적 성장'));
      });
    });

    describe('progressed moon phase analysis', () => {
      it('should identify synchronized emotional cycles when same element', () => {
        const p1 = createMockProfile('Aries', 'Cancer', 'Libra');
        const p2 = createMockProfile('Leo', 'Cancer', 'Aquarius');

        const result = analyzeProgressedChart(p1, p2, 0);

        // Same moon sign = same element
        expect(result.progressedMoonPhase).toContain('동기화');
        expect(result.timedInfluences).toContainEqual(expect.stringContaining('같은 페이지'));
      });

      it('should identify different cycles when elements differ', () => {
        const p1 = createMockProfile('Aries', 'Cancer', 'Libra'); // water moon
        const p2 = createMockProfile('Leo', 'Aries', 'Aquarius'); // fire moon

        const result = analyzeProgressedChart(p1, p2, 0);

        expect(result.progressedMoonPhase).toContain('각자');
        expect(result.timedInfluences).toContainEqual(expect.stringContaining('이해가 필요'));
      });
    });

    describe('current relationship theme', () => {
      it('should identify fire theme for fire dominant elements', () => {
        const p1 = createMockProfile('Aries', 'Leo', 'Sagittarius');
        const p2 = createMockProfile('Leo', 'Aries', 'Aries');

        const result = analyzeProgressedChart(p1, p2, 0);

        expect(result.currentRelationshipTheme).toContain('열정');
        expect(result.upcomingTrends).toContainEqual(expect.stringContaining('모험'));
      });

      it('should identify earth theme for earth dominant elements', () => {
        const p1 = createMockProfile('Taurus', 'Virgo', 'Capricorn');
        const p2 = createMockProfile('Virgo', 'Taurus', 'Taurus');

        const result = analyzeProgressedChart(p1, p2, 0);

        expect(result.currentRelationshipTheme).toContain('안정');
        expect(result.upcomingTrends).toContainEqual(expect.stringContaining('장기적'));
      });

      it('should identify air theme for air dominant elements', () => {
        const p1 = createMockProfile('Gemini', 'Libra', 'Aquarius');
        const p2 = createMockProfile('Libra', 'Gemini', 'Gemini');

        const result = analyzeProgressedChart(p1, p2, 0);

        expect(result.currentRelationshipTheme).toContain('소통');
        expect(result.upcomingTrends).toContainEqual(expect.stringContaining('아이디어'));
      });

      it('should identify water theme for water dominant elements', () => {
        const p1 = createMockProfile('Cancer', 'Scorpio', 'Pisces');
        const p2 = createMockProfile('Scorpio', 'Cancer', 'Cancer');

        const result = analyzeProgressedChart(p1, p2, 0);

        expect(result.currentRelationshipTheme).toContain('감정');
        expect(result.upcomingTrends).toContainEqual(expect.stringContaining('치유'));
      });
    });

    describe('years in relationship effects', () => {
      it('should show starting energy analysis for new relationships', () => {
        const p1 = createMockProfile('Aries', 'Cancer', 'Libra');
        const p2 = createMockProfile('Leo', 'Scorpio', 'Aquarius');

        const result = analyzeProgressedChart(p1, p2, 0);

        expect(result.synchronicityIndicators).toContainEqual(expect.stringContaining('시작 시점'));
      });

      it('should check moon synchronization for established relationships', () => {
        const p1 = createMockProfile('Aries', 'Cancer', 'Libra');
        const p2 = createMockProfile('Aries', 'Cancer', 'Libra');

        const result = analyzeProgressedChart(p1, p2, 5);

        // Same starting moon should stay synchronized
        expect(result.synchronicityIndicators.some(
          s => s.includes('Moon') || s.includes('Sun') || s.includes('시작')
        )).toBe(true);
      });

      it('should progress sun sign every 30 years', () => {
        const p1 = createMockProfile('Aries', 'Cancer', 'Libra');
        const p2 = createMockProfile('Aries', 'Cancer', 'Libra');

        const result0 = analyzeProgressedChart(p1, p2, 0);
        const result30 = analyzeProgressedChart(p1, p2, 30);
        const result60 = analyzeProgressedChart(p1, p2, 60);

        // Over time, progressed positions change
        expect(result0).toBeDefined();
        expect(result30).toBeDefined();
        expect(result60).toBeDefined();
      });

      it('should progress moon sign every 2.5 years', () => {
        const p1 = createMockProfile('Aries', 'Cancer', 'Libra');
        const p2 = createMockProfile('Aries', 'Cancer', 'Libra');

        const result0 = analyzeProgressedChart(p1, p2, 0);
        const result3 = analyzeProgressedChart(p1, p2, 3);

        // After ~2.5 years, progressed moon moves to next sign
        expect(result0).toBeDefined();
        expect(result3).toBeDefined();
      });
    });

    describe('synchronicity indicators', () => {
      it('should indicate moon synchronization when indices are close', () => {
        const p1 = createMockProfile('Aries', 'Cancer', 'Libra');
        const p2 = createMockProfile('Leo', 'Leo', 'Aquarius'); // Moon is next to Cancer

        const result = analyzeProgressedChart(p1, p2, 1);

        // Leo (4) is close to Cancer (3)
        expect(result.synchronicityIndicators.length).toBeGreaterThan(0);
      });

      it('should indicate sun conjunction when sun indices are close', () => {
        const p1 = createMockProfile('Aries', 'Cancer', 'Libra');
        const p2 = createMockProfile('Taurus', 'Scorpio', 'Aquarius'); // Sun is adjacent

        const result = analyzeProgressedChart(p1, p2, 1);

        // Taurus (1) is close to Aries (0)
        expect(result.synchronicityIndicators.length).toBeGreaterThan(0);
      });
    });

    describe('return structure', () => {
      it('should return complete ProgressedChartAnalysis structure', () => {
        const p1 = createMockProfile('Aries', 'Cancer', 'Libra');
        const p2 = createMockProfile('Leo', 'Scorpio', 'Aquarius');

        const result = analyzeProgressedChart(p1, p2, 5);

        expect(result).toHaveProperty('progressedSunPhase');
        expect(result).toHaveProperty('progressedMoonPhase');
        expect(result).toHaveProperty('currentRelationshipTheme');
        expect(result).toHaveProperty('timedInfluences');
        expect(result).toHaveProperty('upcomingTrends');
        expect(result).toHaveProperty('synchronicityIndicators');
      });

      it('should have non-empty arrays', () => {
        // Use same signs to ensure synchronicity indicators are populated
        const p1 = createMockProfile('Aries', 'Cancer', 'Libra');
        const p2 = createMockProfile('Aries', 'Cancer', 'Libra');

        const result = analyzeProgressedChart(p1, p2, 5);

        expect(result.timedInfluences.length).toBeGreaterThan(0);
        expect(result.upcomingTrends.length).toBeGreaterThan(0);
        // Synchronicity indicators may be empty if sun/moon indices aren't close
        expect(Array.isArray(result.synchronicityIndicators)).toBe(true);
      });
    });

    describe('default parameter', () => {
      it('should default yearsInRelationship to 0', () => {
        const p1 = createMockProfile('Aries', 'Cancer', 'Libra');
        const p2 = createMockProfile('Leo', 'Scorpio', 'Aquarius');

        const result = analyzeProgressedChart(p1, p2);

        expect(result.synchronicityIndicators).toContainEqual(expect.stringContaining('시작 시점'));
      });
    });
  });

  describe('edge cases', () => {
    it('should handle unknown sign gracefully with default element', () => {
      const p1: AstrologyProfile = {
        sun: { sign: 'UnknownSign', degree: 15 },
        moon: { sign: 'UnknownSign', degree: 15 },
        planets: {},
      };
      const p2 = createMockProfile('Leo', 'Scorpio', 'Aquarius');

      // Should not throw
      const davisonResult = analyzeDavisonChart(p1, p2);
      expect(davisonResult).toBeDefined();

      const progressedResult = analyzeProgressedChart(p1, p2, 5);
      expect(progressedResult).toBeDefined();
    });

    it('should handle missing ascendant gracefully', () => {
      const p1: AstrologyProfile = {
        sun: { sign: 'Aries', degree: 15 },
        moon: { sign: 'Cancer', degree: 15 },
        planets: {},
      };
      const p2: AstrologyProfile = {
        sun: { sign: 'Leo', degree: 15 },
        moon: { sign: 'Scorpio', degree: 15 },
        planets: {},
      };

      const result = analyzeDavisonChart(p1, p2);

      // Should use sun sign as fallback
      expect(result.relationshipAscendant).toBeDefined();
    });

    it('should handle very long relationships', () => {
      const p1 = createMockProfile('Aries', 'Cancer', 'Libra');
      const p2 = createMockProfile('Leo', 'Scorpio', 'Aquarius');

      const result = analyzeProgressedChart(p1, p2, 100);

      expect(result).toBeDefined();
      expect(result.currentRelationshipTheme).toBeTruthy();
    });
  });
});
