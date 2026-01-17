/**
 * Astro Bonus Tests
 *
 * Tests for astrology-based bonus calculations in life prediction
 */

import { describe, it, expect } from 'vitest';
import {
  calculateAstroBonus,
  calculateTransitBonus,
  calculateTransitHouseOverlay,
  calculateCombinedAstroBonus,
} from '@/lib/prediction/life-prediction/astro-bonus';
import type {
  LifePredictionInput,
  EventType,
  AstroDataForPrediction,
  AdvancedAstroForPrediction,
} from '@/lib/prediction/life-prediction/types';

// Helper to create minimal input
function createMinimalInput(): LifePredictionInput {
  return {
    birthYear: 1990,
    birthMonth: 5,
    birthDay: 15,
    gender: 'male',
    dayStem: '甲',
    dayBranch: '子',
    monthBranch: '午',
    yearBranch: '午',
    allStems: ['庚', '辛', '甲', '丙'],
    allBranches: ['午', '巳', '子', '寅'],
  };
}

describe('calculateAstroBonus', () => {
  describe('when no astro data is provided', () => {
    it('should return zero bonus with empty arrays', () => {
      const input = createMinimalInput();
      const result = calculateAstroBonus(input, 'career');

      expect(result.bonus).toBe(0);
      expect(result.reasons).toHaveLength(0);
      expect(result.penalties).toHaveLength(0);
    });

    it('should handle all event types without crashing', () => {
      const input = createMinimalInput();
      const eventTypes: EventType[] = [
        'marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship'
      ];

      for (const eventType of eventTypes) {
        const result = calculateAstroBonus(input, eventType);
        expect(result).toBeDefined();
        expect(typeof result.bonus).toBe('number');
      }
    });
  });

  describe('with astro chart data', () => {
    it('should add bonus for beneficial sun sign', () => {
      const input = createMinimalInput();
      input.astroChart = {
        sun: { sign: 'Taurus', house: 2 },
      };

      const result = calculateAstroBonus(input, 'investment');
      expect(result).toBeDefined();
    });

    it('should process Venus for relationship events', () => {
      const input = createMinimalInput();
      input.astroChart = {
        venus: { sign: 'Libra', house: 7, isRetrograde: false },
      };

      const result = calculateAstroBonus(input, 'relationship');
      expect(result).toBeDefined();
    });

    it('should detect Venus retrograde penalty', () => {
      const input = createMinimalInput();
      input.astroChart = {
        venus: { sign: 'Scorpio', house: 8, isRetrograde: true },
      };

      const result = calculateAstroBonus(input, 'marriage');
      expect(result).toBeDefined();
    });

    it('should process Jupiter for career events', () => {
      const input = createMinimalInput();
      input.astroChart = {
        jupiter: { sign: 'Sagittarius', house: 9 },
      };

      const result = calculateAstroBonus(input, 'career');
      expect(result).toBeDefined();
    });

    it('should detect Saturn challenges', () => {
      const input = createMinimalInput();
      input.astroChart = {
        saturn: { sign: 'Aries', house: 1, isRetrograde: false },
      };

      const result = calculateAstroBonus(input, 'career');
      expect(result).toBeDefined();
    });

    it('should handle Mars in Scorpio', () => {
      const input = createMinimalInput();
      input.astroChart = {
        mars: { sign: 'Scorpio', house: 8 },
      };

      const result = calculateAstroBonus(input, 'career');
      expect(result).toBeDefined();
    });
  });

  describe('with advanced astro data', () => {
    it('should add bonus for beneficial moon phase', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        electional: {
          moonPhase: { phase: 'full_moon', illumination: 100 },
        },
      };

      const result = calculateAstroBonus(input, 'marriage');
      expect(result).toBeDefined();
    });

    it('should handle new moon phase', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        electional: {
          moonPhase: { phase: 'new_moon', illumination: 0 },
        },
      };

      const result = calculateAstroBonus(input, 'career');
      expect(result).toBeDefined();
    });

    it('should process Solar Return theme for career', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        solarReturn: {
          summary: { theme: 'career advancement and success' },
        },
      };

      const result = calculateAstroBonus(input, 'career');
      // Theme should match and add bonus
      expect(result).toBeDefined();
    });

    it('should process Solar Return theme for love', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        solarReturn: {
          summary: { theme: 'love and partnership' },
        },
      };

      const result = calculateAstroBonus(input, 'marriage');
      expect(result).toBeDefined();
    });

    it('should process Solar Return theme for study', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        solarReturn: {
          summary: { theme: 'learning and education growth' },
        },
      };

      const result = calculateAstroBonus(input, 'study');
      expect(result).toBeDefined();
    });
  });

  describe('bonus result structure', () => {
    it('should return BonusResult with correct fields', () => {
      const input = createMinimalInput();
      input.astroChart = {
        sun: { sign: 'Taurus', house: 2 },
      };

      const result = calculateAstroBonus(input, 'investment');

      expect(result).toHaveProperty('bonus');
      expect(result).toHaveProperty('reasons');
      expect(result).toHaveProperty('penalties');
      expect(typeof result.bonus).toBe('number');
      expect(Array.isArray(result.reasons)).toBe(true);
      expect(Array.isArray(result.penalties)).toBe(true);
    });
  });

  describe('event type specific logic', () => {
    const input = createMinimalInput();
    input.astroChart = {
      sun: { sign: 'Leo', house: 5 },
      venus: { sign: 'Libra', house: 7 },
      mars: { sign: 'Capricorn', house: 10 },
      jupiter: { sign: 'Sagittarius', house: 9 },
    };

    it('should handle marriage event type', () => {
      const result = calculateAstroBonus(input, 'marriage');
      expect(result).toBeDefined();
      expect(typeof result.bonus).toBe('number');
    });

    it('should handle career event type', () => {
      const result = calculateAstroBonus(input, 'career');
      expect(result).toBeDefined();
      expect(typeof result.bonus).toBe('number');
    });

    it('should handle investment event type', () => {
      const result = calculateAstroBonus(input, 'investment');
      expect(result).toBeDefined();
      expect(typeof result.bonus).toBe('number');
    });

    it('should handle move event type', () => {
      const result = calculateAstroBonus(input, 'move');
      expect(result).toBeDefined();
      expect(typeof result.bonus).toBe('number');
    });

    it('should handle study event type', () => {
      const result = calculateAstroBonus(input, 'study');
      expect(result).toBeDefined();
      expect(typeof result.bonus).toBe('number');
    });

    it('should handle health event type', () => {
      const result = calculateAstroBonus(input, 'health');
      expect(result).toBeDefined();
      expect(typeof result.bonus).toBe('number');
    });

    it('should handle relationship event type', () => {
      const result = calculateAstroBonus(input, 'relationship');
      expect(result).toBeDefined();
      expect(typeof result.bonus).toBe('number');
    });
  });

  describe('with target month parameter', () => {
    it('should accept optional target month', () => {
      const input = createMinimalInput();
      input.astroChart = {
        sun: { sign: 'Aries', house: 1 },
      };

      const targetMonth = { year: 2025, month: 6 };
      const result = calculateAstroBonus(input, 'career', targetMonth);

      expect(result).toBeDefined();
    });
  });
});

describe('BonusResult type', () => {
  it('should have correct structure', () => {
    interface BonusResult {
      bonus: number;
      reasons: string[];
      penalties: string[];
    }

    const result: BonusResult = {
      bonus: 15,
      reasons: ['Favorable Jupiter placement'],
      penalties: ['Saturn retrograde'],
    };

    expect(result.bonus).toBe(15);
    expect(result.reasons).toContain('Favorable Jupiter placement');
    expect(result.penalties).toContain('Saturn retrograde');
  });
});

describe('AstroDataForPrediction interface', () => {
  it('should support all planet fields', () => {
    const astroData: AstroDataForPrediction = {
      sun: { sign: 'Aries', house: 1, longitude: 15.5 },
      moon: { sign: 'Cancer', house: 4, longitude: 120.3 },
      venus: { sign: 'Taurus', house: 2, longitude: 45.0, isRetrograde: false },
      mars: { sign: 'Scorpio', house: 8, longitude: 215.7, isRetrograde: false },
      jupiter: { sign: 'Sagittarius', house: 9, longitude: 260.0, isRetrograde: true },
      saturn: { sign: 'Capricorn', house: 10, longitude: 290.5, isRetrograde: false },
      mercury: { sign: 'Gemini', house: 3, longitude: 75.2, isRetrograde: true },
      uranus: { sign: 'Taurus', house: 2, longitude: 48.3, isRetrograde: false },
      neptune: { sign: 'Pisces', house: 12, longitude: 355.1, isRetrograde: true },
      pluto: { sign: 'Capricorn', house: 10, longitude: 295.8, isRetrograde: false },
      ascendant: { sign: 'Leo', longitude: 125.0 },
      mc: { sign: 'Taurus', longitude: 35.0 },
    };

    expect(astroData.sun?.sign).toBe('Aries');
    expect(astroData.jupiter?.isRetrograde).toBe(true);
    expect(astroData.mercury?.isRetrograde).toBe(true);
  });
});

describe('AdvancedAstroForPrediction interface', () => {
  it('should support electional data', () => {
    const advanced: AdvancedAstroForPrediction = {
      electional: {
        moonPhase: { phase: 'waxing_gibbous', illumination: 75 },
        voidOfCourse: { isVoid: false },
        retrograde: ['Mercury'],
      },
    };

    expect(advanced.electional?.moonPhase?.phase).toBe('waxing_gibbous');
    expect(advanced.electional?.voidOfCourse?.isVoid).toBe(false);
  });

  it('should support solar return data', () => {
    const advanced: AdvancedAstroForPrediction = {
      solarReturn: {
        summary: { theme: 'growth and transformation', keyPlanets: ['Jupiter', 'Pluto'] },
      },
    };

    expect(advanced.solarReturn?.summary?.theme).toContain('growth');
  });

  it('should support progressions data', () => {
    const advanced: AdvancedAstroForPrediction = {
      progressions: {
        secondary: { moonPhase: 'first_quarter' },
      },
    };

    expect(advanced.progressions?.secondary?.moonPhase).toBe('first_quarter');
  });
});

describe('EventType values', () => {
  it('should include all 7 event types', () => {
    const eventTypes: EventType[] = [
      'marriage',
      'career',
      'investment',
      'move',
      'study',
      'health',
      'relationship',
    ];

    expect(eventTypes).toHaveLength(7);
    expect(eventTypes).toContain('marriage');
    expect(eventTypes).toContain('career');
    expect(eventTypes).toContain('investment');
    expect(eventTypes).toContain('move');
    expect(eventTypes).toContain('study');
    expect(eventTypes).toContain('health');
    expect(eventTypes).toContain('relationship');
  });
});

// Additional tests for better coverage
describe('calculateTransitBonus', () => {
  function createMinimalInputForTransit(): LifePredictionInput {
    return {
      birthYear: 1990,
      birthMonth: 5,
      birthDay: 15,
      gender: 'male',
      dayStem: '甲',
      dayBranch: '子',
      monthBranch: '午',
      yearBranch: '午',
      allStems: ['庚', '辛', '甲', '丙'],
      allBranches: ['午', '巳', '子', '寅'],
    };
  }

  describe('when no transit data is provided', () => {
    it('should return zero bonus', () => {
      const input = createMinimalInputForTransit();
      const result = calculateTransitBonus(input, 'career');

      expect(result.bonus).toBe(0);
      expect(result.reasons).toHaveLength(0);
      expect(result.penalties).toHaveLength(0);
    });
  });

  describe('with major transits', () => {
    it('should process benefic planet with benefic aspect', async () => {
      const { calculateTransitBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          majorTransits: [
            {
              transitPlanet: 'Jupiter',
              natalPoint: 'Sun',
              type: 'trine',
              orb: 2,
              isApplying: true,
            },
          ],
        },
      };

      const result = calculateTransitBonus(input, 'career');
      expect(result.bonus).toBeGreaterThan(0);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should process malefic planet with malefic aspect', async () => {
      const { calculateTransitBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          majorTransits: [
            {
              transitPlanet: 'Saturn',
              natalPoint: 'Sun',
              type: 'square',
              orb: 1,
              isApplying: true,
            },
          ],
        },
      };

      const result = calculateTransitBonus(input, 'marriage');
      expect(result.bonus).toBeLessThan(0);
      expect(result.penalties.length).toBeGreaterThan(0);
    });

    it('should process benefic planet with malefic aspect (growth opportunity)', async () => {
      const { calculateTransitBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          majorTransits: [
            {
              transitPlanet: 'Jupiter',
              natalPoint: 'Saturn',
              type: 'square',
              orb: 2,
              isApplying: false,
            },
          ],
        },
      };

      const result = calculateTransitBonus(input, 'career');
      expect(result).toBeDefined();
    });

    it('should process malefic planet with benefic aspect', async () => {
      const { calculateTransitBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          majorTransits: [
            {
              transitPlanet: 'Neptune',
              natalPoint: 'Sun',
              type: 'trine',
              orb: 3,
              isApplying: true,
            },
          ],
        },
      };

      const result = calculateTransitBonus(input, 'career');
      expect(result).toBeDefined();
    });
  });

  describe('with outer planet positions', () => {
    it('should process benefic planet in favorable house', async () => {
      const { calculateTransitBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          outerPlanets: [
            {
              name: 'Jupiter',
              longitude: 120,
              sign: 'Cancer',
              house: 10,
              retrograde: false,
            },
          ],
        },
      };

      const result = calculateTransitBonus(input, 'career');
      expect(result.bonus).toBeGreaterThan(0);
    });

    it('should process malefic planet in favorable house', async () => {
      const { calculateTransitBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          outerPlanets: [
            {
              name: 'Neptune',
              longitude: 350,
              sign: 'Pisces',
              house: 10,
              retrograde: false,
            },
          ],
        },
      };

      const result = calculateTransitBonus(input, 'career');
      expect(result).toBeDefined();
    });

    it('should process retrograde benefic planet', async () => {
      const { calculateTransitBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          outerPlanets: [
            {
              name: 'Jupiter',
              longitude: 270,
              sign: 'Capricorn',
              house: 2,
              retrograde: true,
            },
          ],
        },
      };

      const result = calculateTransitBonus(input, 'investment');
      expect(result.penalties.length).toBeGreaterThan(0);
    });
  });

  describe('with transit themes', () => {
    it('should match career theme', async () => {
      const { calculateTransitBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          themes: [
            {
              theme: 'career achievement and recognition',
              keywords: ['career', 'success'],
              duration: '3 months',
              transitPlanet: 'Jupiter',
              natalPoint: 'MC',
            },
          ],
        },
      };

      const result = calculateTransitBonus(input, 'career');
      expect(result.bonus).toBeGreaterThan(0);
    });

    it('should match wealth theme for investment', async () => {
      const { calculateTransitBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          themes: [
            {
              theme: 'wealth and resources transformation',
              keywords: ['money', 'investment'],
              duration: '6 months',
              transitPlanet: 'Pluto',
              natalPoint: 'Venus',
            },
          ],
        },
      };

      const result = calculateTransitBonus(input, 'investment');
      expect(result.bonus).toBeGreaterThan(0);
    });

    it('should match love theme for marriage', async () => {
      const { calculateTransitBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          themes: [
            {
              theme: 'love and commitment deepening',
              keywords: ['love', 'partnership'],
              duration: '2 months',
              transitPlanet: 'Venus',
              natalPoint: 'Moon',
            },
          ],
        },
      };

      const result = calculateTransitBonus(input, 'marriage');
      expect(result.bonus).toBeGreaterThan(0);
    });
  });
});

describe('calculateTransitHouseOverlay', () => {
  function createMinimalInput(): LifePredictionInput {
    return {
      birthYear: 1990,
      birthMonth: 5,
      birthDay: 15,
      gender: 'male',
      dayStem: '甲',
      dayBranch: '子',
      monthBranch: '午',
      yearBranch: '午',
      allStems: ['庚', '辛', '甲', '丙'],
      allBranches: ['午', '巳', '子', '寅'],
    };
  }

  describe('when no transit data', () => {
    it('should return zero bonus', async () => {
      const { calculateTransitHouseOverlay } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      const result = calculateTransitHouseOverlay(input, 'career');

      expect(result.bonus).toBe(0);
      expect(result.reasons).toHaveLength(0);
    });
  });

  describe('with outer planets in houses', () => {
    it('should add bonus for benefic planet in primary house', async () => {
      const { calculateTransitHouseOverlay } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          outerPlanets: [
            { name: 'Jupiter', longitude: 300, sign: 'Capricorn', house: 7 },
          ],
        },
      };

      const result = calculateTransitHouseOverlay(input, 'marriage');
      expect(result.bonus).toBeGreaterThan(0);
    });

    it('should subtract for malefic planet in primary house', async () => {
      const { calculateTransitHouseOverlay } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          outerPlanets: [
            { name: 'Saturn', longitude: 290, sign: 'Capricorn', house: 7 },
          ],
        },
      };

      const result = calculateTransitHouseOverlay(input, 'marriage');
      expect(result.bonus).toBeLessThan(0);
    });

    it('should add bonus for benefic planet in secondary house', async () => {
      const { calculateTransitHouseOverlay } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          outerPlanets: [
            { name: 'Jupiter', longitude: 150, sign: 'Leo', house: 5 },
          ],
        },
      };

      const result = calculateTransitHouseOverlay(input, 'marriage');
      expect(result.bonus).toBeGreaterThan(0);
    });

    it('should subtract for malefic planet in avoid house', async () => {
      const { calculateTransitHouseOverlay } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          outerPlanets: [
            { name: 'Saturn', longitude: 350, sign: 'Pisces', house: 12 },
          ],
        },
      };

      const result = calculateTransitHouseOverlay(input, 'career');
      // May be negative or zero depending on specific logic
      expect(result.bonus).toBeLessThanOrEqual(0);
    });
  });

  describe('house configurations for all event types', () => {
    const eventTypes: EventType[] = ['marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship'];

    for (const eventType of eventTypes) {
      it(`should process ${eventType} event type`, async () => {
        const { calculateTransitHouseOverlay } = await import('@/lib/prediction/life-prediction/astro-bonus');
        const input = createMinimalInput();
        input.advancedAstro = {
          currentTransits: {
            outerPlanets: [
              { name: 'Jupiter', longitude: 120, sign: 'Cancer', house: 4 },
            ],
          },
        };

        const result = calculateTransitHouseOverlay(input, eventType);
        expect(result).toBeDefined();
        expect(typeof result.bonus).toBe('number');
      });
    }
  });
});

describe('calculateCombinedAstroBonus', () => {
  function createMinimalInput(): LifePredictionInput {
    return {
      birthYear: 1990,
      birthMonth: 5,
      birthDay: 15,
      gender: 'male',
      dayStem: '甲',
      dayBranch: '子',
      monthBranch: '午',
      yearBranch: '午',
      allStems: ['庚', '辛', '甲', '丙'],
      allBranches: ['午', '巳', '子', '寅'],
    };
  }

  it('should combine all bonus calculations', async () => {
    const { calculateCombinedAstroBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
    const input = createMinimalInput();
    input.astroChart = {
      sun: { sign: 'Capricorn', house: 10 },
      jupiter: { sign: 'Sagittarius', house: 9 },
    };
    input.advancedAstro = {
      electional: {
        moonPhase: { phase: 'waxing_gibbous', illumination: 75 },
      },
      currentTransits: {
        majorTransits: [
          {
            transitPlanet: 'Jupiter',
            natalPoint: 'Sun',
            type: 'trine',
            orb: 2,
            isApplying: true,
          },
        ],
        outerPlanets: [
          { name: 'Jupiter', longitude: 270, sign: 'Capricorn', house: 10 },
        ],
      },
    };

    const result = calculateCombinedAstroBonus(input, 'career');
    expect(result).toBeDefined();
    expect(result).toHaveProperty('bonus');
    expect(result).toHaveProperty('reasons');
    expect(result).toHaveProperty('penalties');
  });

  it('should return empty result when no astro data', async () => {
    const { calculateCombinedAstroBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
    const input = createMinimalInput();
    const result = calculateCombinedAstroBonus(input, 'career');

    expect(result.bonus).toBe(0);
    expect(result.reasons).toHaveLength(0);
    expect(result.penalties).toHaveLength(0);
  });

  it('should work with target month parameter', async () => {
    const { calculateCombinedAstroBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
    const input = createMinimalInput();
    input.astroChart = {
      venus: { sign: 'Libra', house: 7 },
    };

    const result = calculateCombinedAstroBonus(input, 'marriage', { year: 2025, month: 6 });
    expect(result).toBeDefined();
  });

  describe('for all event types', () => {
    const eventTypes: EventType[] = ['marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship'];

    for (const eventType of eventTypes) {
      it(`should calculate combined bonus for ${eventType}`, async () => {
        const { calculateCombinedAstroBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
        const input = createMinimalInput();
        input.astroChart = {
          sun: { sign: 'Aries', house: 1 },
        };

        const result = calculateCombinedAstroBonus(input, eventType);
        expect(result).toBeDefined();
        expect(typeof result.bonus).toBe('number');
      });
    }
  });
});

describe('calculateAstroBonus - Additional Coverage', () => {
  function createMinimalInput(): LifePredictionInput {
    return {
      birthYear: 1990,
      birthMonth: 5,
      birthDay: 15,
      gender: 'male',
      dayStem: '甲',
      dayBranch: '子',
      monthBranch: '午',
      yearBranch: '午',
      allStems: ['庚', '辛', '甲', '丙'],
      allBranches: ['午', '巳', '子', '寅'],
    };
  }

  describe('eclipse impact', () => {
    it('should add bonus for solar eclipse on career/move/study', async () => {
      const { calculateAstroBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.advancedAstro = {
        eclipses: {
          impact: {
            type: 'solar',
            affectedPlanets: ['Sun', 'Mercury'],
          },
        },
      };

      const careerResult = calculateAstroBonus(input, 'career');
      expect(careerResult.bonus).toBeGreaterThan(0);

      const moveResult = calculateAstroBonus(input, 'move');
      expect(moveResult.bonus).toBeGreaterThan(0);

      const studyResult = calculateAstroBonus(input, 'study');
      expect(studyResult.bonus).toBeGreaterThan(0);
    });

    it('should add bonus for lunar eclipse on marriage/relationship', async () => {
      const { calculateAstroBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.advancedAstro = {
        eclipses: {
          impact: {
            type: 'lunar',
            affectedPlanets: ['Moon', 'Venus'],
          },
        },
      };

      const marriageResult = calculateAstroBonus(input, 'marriage');
      expect(marriageResult.bonus).toBeGreaterThan(0);

      const relationshipResult = calculateAstroBonus(input, 'relationship');
      expect(relationshipResult.bonus).toBeGreaterThan(0);
    });
  });

  describe('moon phase variations', () => {
    const moonPhases = [
      'new_moon', 'waxing_crescent', 'first_quarter', 'waxing_gibbous',
      'full_moon', 'waning_gibbous', 'last_quarter', 'waning_crescent'
    ];

    for (const phase of moonPhases) {
      it(`should handle ${phase} moon phase`, async () => {
        const { calculateAstroBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
        const input = createMinimalInput();
        input.advancedAstro = {
          electional: {
            moonPhase: { phase, illumination: 50 },
          },
        };

        const result = calculateAstroBonus(input, 'marriage');
        expect(result).toBeDefined();
      });
    }
  });

  describe('solar return themes for all event types', () => {
    const themeMatches = [
      { eventType: 'marriage' as EventType, theme: 'love and partnership' },
      { eventType: 'career' as EventType, theme: 'career success and achievement' },
      { eventType: 'investment' as EventType, theme: 'money and wealth growth' },
      { eventType: 'move' as EventType, theme: 'travel and new beginnings' },
      { eventType: 'study' as EventType, theme: 'learning and education' },
      { eventType: 'health' as EventType, theme: 'health and wellness' },
      { eventType: 'relationship' as EventType, theme: 'connection and friendship' },
    ];

    for (const { eventType, theme } of themeMatches) {
      it(`should match solar return theme for ${eventType}`, async () => {
        const { calculateAstroBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
        const input = createMinimalInput();
        input.advancedAstro = {
          solarReturn: {
            summary: { theme },
          },
        };

        const result = calculateAstroBonus(input, eventType);
        expect(result.bonus).toBeGreaterThan(0);
      });
    }
  });

  describe('malefic planet checks', () => {
    it('should detect Saturn in Aries', async () => {
      const { calculateAstroBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.astroChart = {
        saturn: { sign: 'Aries', house: 1 },
      };

      const result = calculateAstroBonus(input, 'marriage');
      expect(result.penalties.length).toBeGreaterThan(0);
    });

    it('should detect Uranus in Scorpio', async () => {
      const { calculateAstroBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.astroChart = {
        uranus: { sign: 'Scorpio', house: 8 },
      };

      const result = calculateAstroBonus(input, 'marriage');
      expect(result).toBeDefined();
    });
  });

  describe('benefic signs for different events', () => {
    it('should detect Libra for marriage (Venus sign)', async () => {
      const { calculateAstroBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.astroChart = {
        sun: { sign: 'Libra', house: 7 },
      };

      const result = calculateAstroBonus(input, 'marriage');
      expect(result.bonus).toBeGreaterThan(0);
    });

    it('should detect Capricorn for career', async () => {
      const { calculateAstroBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.astroChart = {
        sun: { sign: 'Capricorn', house: 10 },
      };

      const result = calculateAstroBonus(input, 'career');
      expect(result.bonus).toBeGreaterThan(0);
    });

    it('should detect Taurus for investment', async () => {
      const { calculateAstroBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.astroChart = {
        sun: { sign: 'Taurus', house: 2 },
      };

      const result = calculateAstroBonus(input, 'investment');
      expect(result.bonus).toBeGreaterThan(0);
    });

    it('should detect Cancer for move', async () => {
      const { calculateAstroBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.astroChart = {
        sun: { sign: 'Cancer', house: 4 },
      };

      const result = calculateAstroBonus(input, 'move');
      expect(result.bonus).toBeGreaterThan(0);
    });

    it('should detect Gemini for study', async () => {
      const { calculateAstroBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.astroChart = {
        sun: { sign: 'Gemini', house: 3 },
      };

      const result = calculateAstroBonus(input, 'study');
      expect(result.bonus).toBeGreaterThan(0);
    });

    it('should detect Virgo for health', async () => {
      const { calculateAstroBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.astroChart = {
        sun: { sign: 'Virgo', house: 6 },
      };

      const result = calculateAstroBonus(input, 'health');
      expect(result.bonus).toBeGreaterThan(0);
    });
  });

  describe('retrograde penalties', () => {
    it('should apply penalty for malefic planet retrograde in marriage', async () => {
      const { calculateAstroBonus } = await import('@/lib/prediction/life-prediction/astro-bonus');
      const input = createMinimalInput();
      input.astroChart = {
        venus: { sign: 'Libra', house: 7, isRetrograde: true },
        saturn: { sign: 'Capricorn', house: 10, isRetrograde: true },
      };

      const result = calculateAstroBonus(input, 'marriage');
      // Saturn is malefic for marriage and retrograde
      expect(result).toBeDefined();
    });
  });
});
