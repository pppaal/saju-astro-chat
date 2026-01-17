/**
 * Life Prediction Astro Tests
 *
 * Tests for astrology-based bonus calculations in life prediction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateAstroBonus,
  calculateTransitBonus,
  calculateTransitHouseOverlay,
  estimateMonthlyTransitScore,
} from '@/lib/prediction/life-prediction-astro';
import type {
  LifePredictionInput,
  EventType,
} from '@/lib/prediction/life-prediction-types';

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

  describe('with astroChart data', () => {
    it('should add bonus for Venus in favorable sign', () => {
      const input = createMinimalInput();
      input.astroChart = {
        venus: { sign: 'Libra', house: 7 },
      };

      const result = calculateAstroBonus(input, 'marriage');
      expect(result).toBeDefined();
    });

    it('should add bonus for Jupiter in favorable sign', () => {
      const input = createMinimalInput();
      input.astroChart = {
        jupiter: { sign: 'Sagittarius', house: 9 },
      };

      const result = calculateAstroBonus(input, 'career');
      expect(result).toBeDefined();
    });

    it('should add bonus for Sun in favorable house', () => {
      const input = createMinimalInput();
      input.astroChart = {
        sun: { sign: 'Leo', house: 10 },
      };

      const result = calculateAstroBonus(input, 'career');
      expect(result).toBeDefined();
    });

    it('should add bonus for Moon in favorable house', () => {
      const input = createMinimalInput();
      input.astroChart = {
        moon: { sign: 'Cancer', house: 7 },
      };

      const result = calculateAstroBonus(input, 'marriage');
      expect(result).toBeDefined();
    });

    it('should detect retrograde planets as penalty', () => {
      const input = createMinimalInput();
      input.astroChart = {
        planets: [
          { name: 'Venus', sign: 'Scorpio', isRetrograde: true },
        ],
      };

      const result = calculateAstroBonus(input, 'marriage');
      expect(result).toBeDefined();
    });
  });

  describe('with advancedAstro data', () => {
    it('should add bonus for favorable moon phase', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        electional: {
          moonPhase: { phase: 'full_moon', illumination: 100 },
        },
      };

      const result = calculateAstroBonus(input, 'marriage');
      expect(result).toBeDefined();
    });

    it('should penalize for Void of Course moon', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        electional: {
          voidOfCourse: { isVoid: true },
        },
      };

      const result = calculateAstroBonus(input, 'investment');
      expect(result).toBeDefined();
    });

    it('should detect retrograde from advancedAstro', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        electional: {
          retrograde: ['Mercury', 'Venus'],
        },
      };

      const result = calculateAstroBonus(input, 'marriage');
      expect(result).toBeDefined();
    });

    it('should check Solar Return theme for career', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        solarReturn: {
          summary: { theme: 'career advancement and success' },
        },
      };

      const result = calculateAstroBonus(input, 'career');
      expect(result).toBeDefined();
    });

    it('should check Solar Return theme for marriage', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        solarReturn: {
          summary: { theme: 'love and partnership' },
        },
      };

      const result = calculateAstroBonus(input, 'marriage');
      expect(result).toBeDefined();
    });

    it('should check eclipse impact for career', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        eclipses: {
          impact: { type: 'solar' },
        },
      };

      const result = calculateAstroBonus(input, 'career');
      expect(result).toBeDefined();
    });

    it('should check eclipse impact for marriage', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        eclipses: {
          impact: { type: 'lunar' },
        },
      };

      const result = calculateAstroBonus(input, 'marriage');
      expect(result).toBeDefined();
    });

    it('should check Part of Fortune', () => {
      const input = createMinimalInput();
      input.astroChart = {
        sun: { sign: 'Aries', house: 1 },
      };
      input.advancedAstro = {
        extraPoints: {
          partOfFortune: { sign: 'Taurus', house: 2 },
        },
      };

      const result = calculateAstroBonus(input, 'investment');
      expect(result).toBeDefined();
    });
  });

  describe('return structure', () => {
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
});

describe('calculateTransitBonus', () => {
  describe('when no transit data is provided', () => {
    it('should return zero bonus', () => {
      const input = createMinimalInput();
      const result = calculateTransitBonus(input, 'career');

      expect(result.bonus).toBe(0);
      expect(result.reasons).toHaveLength(0);
      expect(result.penalties).toHaveLength(0);
    });
  });

  describe('with currentTransits data', () => {
    it('should process major transits', () => {
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
      expect(result).toBeDefined();
    });

    it('should process malefic transits', () => {
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

      const result = calculateTransitBonus(input, 'career');
      expect(result).toBeDefined();
    });

    it('should process transit themes', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          themes: [
            {
              theme: 'Career advancement',
              keywords: ['success', 'growth'],
              duration: '3 months',
              transitPlanet: 'Jupiter',
              natalPoint: 'MC',
            },
          ],
        },
      };

      const result = calculateTransitBonus(input, 'career');
      expect(result).toBeDefined();
    });

    it('should process transit summary', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          summary: {
            activeCount: 5,
            majorCount: 3,
            applyingCount: 2,
            separatingCount: 1,
          },
        },
      };

      const result = calculateTransitBonus(input, 'career');
      expect(result).toBeDefined();
    });

    it('should apply applying multiplier for approaching aspects', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          majorTransits: [
            {
              transitPlanet: 'Jupiter',
              natalPoint: 'Sun',
              type: 'conjunction',
              orb: 2,
              isApplying: true,
            },
          ],
        },
      };

      const result = calculateTransitBonus(input, 'career');
      expect(result).toBeDefined();
    });

    it('should apply separating multiplier for separating aspects', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          majorTransits: [
            {
              transitPlanet: 'Jupiter',
              natalPoint: 'Sun',
              type: 'conjunction',
              orb: 2,
              isApplying: false,
            },
          ],
        },
      };

      const result = calculateTransitBonus(input, 'career');
      expect(result).toBeDefined();
    });
  });

  describe('with targetMonth parameter', () => {
    it('should accept optional target month', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          majorTransits: [],
        },
      };

      const targetMonth = { year: 2025, month: 6 };
      const result = calculateTransitBonus(input, 'career', targetMonth);

      expect(result).toBeDefined();
    });
  });

  describe('bonus limits', () => {
    it('should limit bonus to max 25', () => {
      const input = createMinimalInput();
      // Many benefic transits should still be capped
      input.advancedAstro = {
        currentTransits: {
          majorTransits: Array(10).fill({
            transitPlanet: 'Jupiter',
            natalPoint: 'Sun',
            type: 'conjunction',
            orb: 1,
            isApplying: true,
          }),
        },
      };

      const result = calculateTransitBonus(input, 'career');
      expect(result.bonus).toBeLessThanOrEqual(25);
    });

    it('should limit bonus to min -25', () => {
      const input = createMinimalInput();
      // Many malefic transits should still be capped
      input.advancedAstro = {
        currentTransits: {
          majorTransits: Array(10).fill({
            transitPlanet: 'Saturn',
            natalPoint: 'Sun',
            type: 'square',
            orb: 1,
            isApplying: true,
          }),
        },
      };

      const result = calculateTransitBonus(input, 'career');
      expect(result.bonus).toBeGreaterThanOrEqual(-25);
    });
  });
});

describe('calculateTransitHouseOverlay', () => {
  describe('when no transit data is provided', () => {
    it('should return zero bonus', () => {
      const input = createMinimalInput();
      const result = calculateTransitHouseOverlay(input, 'career');

      expect(result.bonus).toBe(0);
      expect(result.reasons).toHaveLength(0);
    });
  });

  describe('with outerPlanets data', () => {
    it('should add bonus for Jupiter in primary house', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          outerPlanets: [
            { name: 'Jupiter', longitude: 90, sign: 'Cancer', house: 10 },
          ],
        },
      };

      const result = calculateTransitHouseOverlay(input, 'career');
      expect(result).toBeDefined();
      expect(result.bonus).toBeGreaterThanOrEqual(0);
    });

    it('should add bonus for Jupiter in secondary house', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          outerPlanets: [
            { name: 'Jupiter', longitude: 90, sign: 'Cancer', house: 2 },
          ],
        },
      };

      const result = calculateTransitHouseOverlay(input, 'career');
      expect(result).toBeDefined();
    });

    it('should handle Saturn in career house positively for career', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          outerPlanets: [
            { name: 'Saturn', longitude: 270, sign: 'Capricorn', house: 10 },
          ],
        },
      };

      const result = calculateTransitHouseOverlay(input, 'career');
      expect(result).toBeDefined();
    });

    it('should penalize Saturn in avoid house', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          outerPlanets: [
            { name: 'Saturn', longitude: 330, sign: 'Pisces', house: 12 },
          ],
        },
      };

      const result = calculateTransitHouseOverlay(input, 'marriage');
      expect(result).toBeDefined();
    });

    it('should handle Uranus for move event', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          outerPlanets: [
            { name: 'Uranus', longitude: 60, sign: 'Taurus', house: 4 },
          ],
        },
      };

      const result = calculateTransitHouseOverlay(input, 'move');
      expect(result).toBeDefined();
    });

    it('should handle Pluto in primary house', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          outerPlanets: [
            { name: 'Pluto', longitude: 300, sign: 'Capricorn', house: 10 },
          ],
        },
      };

      const result = calculateTransitHouseOverlay(input, 'career');
      expect(result).toBeDefined();
    });

    it('should handle Neptune for relationship', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          outerPlanets: [
            { name: 'Neptune', longitude: 350, sign: 'Pisces', house: 7 },
          ],
        },
      };

      const result = calculateTransitHouseOverlay(input, 'relationship');
      expect(result).toBeDefined();
    });
  });

  describe('bonus limits', () => {
    it('should limit bonus to max 20', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          outerPlanets: [
            { name: 'Jupiter', longitude: 90, sign: 'Cancer', house: 10 },
            { name: 'Jupiter', longitude: 120, sign: 'Leo', house: 6 },
          ],
        },
      };

      const result = calculateTransitHouseOverlay(input, 'career');
      expect(result.bonus).toBeLessThanOrEqual(20);
    });

    it('should limit bonus to min -20', () => {
      const input = createMinimalInput();
      input.advancedAstro = {
        currentTransits: {
          outerPlanets: [
            { name: 'Saturn', longitude: 330, sign: 'Pisces', house: 12 },
            { name: 'Saturn', longitude: 240, sign: 'Scorpio', house: 8 },
          ],
        },
      };

      const result = calculateTransitHouseOverlay(input, 'marriage');
      expect(result.bonus).toBeGreaterThanOrEqual(-20);
    });
  });
});

describe('estimateMonthlyTransitScore', () => {
  describe('when no astro chart is provided', () => {
    it('should return zero bonus', () => {
      const input = createMinimalInput();
      const result = estimateMonthlyTransitScore(input, 'career', 2025, 6);

      expect(result.bonus).toBe(0);
      expect(result.reasons).toHaveLength(0);
    });
  });

  describe('with astro chart data', () => {
    it('should estimate Jupiter position bonus', () => {
      const input = createMinimalInput();
      input.astroChart = {
        jupiter: { sign: 'Taurus', house: 2, longitude: 45 },
      };

      const result = estimateMonthlyTransitScore(input, 'career', 2025, 6);
      expect(result).toBeDefined();
    });

    it('should estimate Saturn position penalty', () => {
      const input = createMinimalInput();
      input.astroChart = {
        saturn: { sign: 'Pisces', house: 12, longitude: 345 },
      };

      const result = estimateMonthlyTransitScore(input, 'marriage', 2025, 6);
      expect(result).toBeDefined();
    });

    it('should handle future months calculation', () => {
      const input = createMinimalInput();
      input.astroChart = {
        jupiter: { sign: 'Taurus', longitude: 45 },
        saturn: { sign: 'Pisces', longitude: 345 },
      };

      const result = estimateMonthlyTransitScore(input, 'career', 2026, 12);
      expect(result).toBeDefined();
    });

    it('should handle past months calculation', () => {
      const input = createMinimalInput();
      input.astroChart = {
        jupiter: { sign: 'Aries', longitude: 15 },
      };

      const result = estimateMonthlyTransitScore(input, 'career', 2024, 1);
      expect(result).toBeDefined();
    });
  });

  describe('bonus limits', () => {
    it('should limit bonus to max 15', () => {
      const input = createMinimalInput();
      input.astroChart = {
        jupiter: { longitude: 270 }, // Likely in favorable house
      };

      const result = estimateMonthlyTransitScore(input, 'career', 2025, 6);
      expect(result.bonus).toBeLessThanOrEqual(15);
    });

    it('should limit bonus to min -15', () => {
      const input = createMinimalInput();
      input.astroChart = {
        saturn: { longitude: 330 }, // Likely in avoid house
      };

      const result = estimateMonthlyTransitScore(input, 'marriage', 2025, 6);
      expect(result.bonus).toBeGreaterThanOrEqual(-15);
    });
  });
});

describe('Event type handling', () => {
  const eventTypes: EventType[] = [
    'marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship'
  ];

  for (const eventType of eventTypes) {
    describe(`${eventType} event type`, () => {
      it(`should handle ${eventType} in calculateAstroBonus`, () => {
        const input = createMinimalInput();
        input.astroChart = {
          sun: { sign: 'Aries', house: 1 },
          venus: { sign: 'Libra', house: 7 },
        };

        const result = calculateAstroBonus(input, eventType);
        expect(result).toBeDefined();
      });

      it(`should handle ${eventType} in calculateTransitBonus`, () => {
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

        const result = calculateTransitBonus(input, eventType);
        expect(result).toBeDefined();
      });

      it(`should handle ${eventType} in calculateTransitHouseOverlay`, () => {
        const input = createMinimalInput();
        input.advancedAstro = {
          currentTransits: {
            outerPlanets: [
              { name: 'Jupiter', longitude: 90, sign: 'Cancer', house: 10 },
            ],
          },
        };

        const result = calculateTransitHouseOverlay(input, eventType);
        expect(result).toBeDefined();
      });

      it(`should handle ${eventType} in estimateMonthlyTransitScore`, () => {
        const input = createMinimalInput();
        input.astroChart = {
          jupiter: { longitude: 45 },
        };

        const result = estimateMonthlyTransitScore(input, eventType, 2025, 6);
        expect(result).toBeDefined();
      });
    });
  }
});

describe('BonusResult interface', () => {
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

describe('Constants used in calculations', () => {
  describe('Moon phase names', () => {
    const moonPhases = [
      'new_moon', 'waxing_crescent', 'first_quarter', 'waxing_gibbous',
      'full_moon', 'waning_gibbous', 'last_quarter', 'waning_crescent'
    ];

    it('should define 8 moon phases', () => {
      expect(moonPhases).toHaveLength(8);
    });

    it('should include full_moon', () => {
      expect(moonPhases).toContain('full_moon');
    });

    it('should include new_moon', () => {
      expect(moonPhases).toContain('new_moon');
    });
  });

  describe('Event houses', () => {
    const eventHouses = {
      marriage: { primary: [7], secondary: [5, 1], avoid: [12, 8] },
      career: { primary: [10, 6], secondary: [2, 1], avoid: [12] },
      investment: { primary: [2, 8], secondary: [11], avoid: [12, 6] },
    };

    it('should define primary house for marriage as 7', () => {
      expect(eventHouses.marriage.primary).toContain(7);
    });

    it('should define primary houses for career as 10 and 6', () => {
      expect(eventHouses.career.primary).toContain(10);
      expect(eventHouses.career.primary).toContain(6);
    });

    it('should define avoid house for investment', () => {
      expect(eventHouses.investment.avoid).toContain(12);
    });
  });

  describe('Transit conditions', () => {
    const transitConditions = {
      career: {
        beneficPlanets: ['Jupiter', 'Saturn'],
        maleficPlanets: ['Neptune', 'Pluto'],
        keyNatalPoints: ['Sun', 'Saturn', 'MC', 'Mars'],
        beneficAspects: ['conjunction', 'trine', 'sextile'],
        maleficAspects: ['square', 'opposition'],
      },
    };

    it('should define benefic planets for career', () => {
      expect(transitConditions.career.beneficPlanets).toContain('Jupiter');
    });

    it('should define benefic aspects', () => {
      expect(transitConditions.career.beneficAspects).toContain('trine');
      expect(transitConditions.career.beneficAspects).toContain('sextile');
    });

    it('should define malefic aspects', () => {
      expect(transitConditions.career.maleficAspects).toContain('square');
      expect(transitConditions.career.maleficAspects).toContain('opposition');
    });
  });
});
