// @vitest-environment node
// tests/lib/astrology/foundation/aspects.test.ts
import { describe, it, expect } from 'vitest';
import { findAspects, findNatalAspects } from '@/lib/astrology/foundation/aspects';
import type { Chart, AspectRules, PlanetBase } from '@/lib/astrology/foundation/types';

// 테스트용 헬퍼 함수
function createPlanet(name: string, longitude: number, speed = 1): PlanetBase {
  const signIndex = Math.floor((longitude % 360) / 30);
  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
  ] as const;
  return {
    name,
    longitude,
    sign: signs[signIndex],
    degree: Math.floor(longitude % 30),
    minute: Math.floor(((longitude % 30) % 1) * 60),
    formatted: `${signs[signIndex]} ${Math.floor(longitude % 30)}deg`,
    house: Math.floor(longitude / 30) + 1,
    speed,
  };
}

function createChart(planets: PlanetBase[], ascLon = 0, mcLon = 90): Chart {
  return {
    planets,
    ascendant: createPlanet('Ascendant', ascLon),
    mc: createPlanet('MC', mcLon),
    houses: Array.from({ length: 12 }, (_, i) => ({
      index: i + 1,
      cusp: i * 30,
      sign: ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
             'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][i] as any,
      formatted: `${i * 30}deg`,
    })),
  };
}

describe('aspects', () => {
  describe('findAspects', () => {
    describe('structure validation', () => {
      it('should return an array of AspectHit', () => {
        const natal = createChart([createPlanet('Sun', 0)]);
        const transit = createChart([createPlanet('Sun', 0)]);

        const result = findAspects(natal, transit);

        expect(Array.isArray(result)).toBe(true);
      });

      it('should return aspects with correct structure', () => {
        const natal = createChart([createPlanet('Sun', 0)]);
        const transit = createChart([createPlanet('Mars', 0)]);

        const result = findAspects(natal, transit);

        if (result.length > 0) {
          const aspect = result[0];
          expect(aspect).toHaveProperty('from');
          expect(aspect).toHaveProperty('to');
          expect(aspect).toHaveProperty('type');
          expect(aspect).toHaveProperty('orb');
          expect(aspect).toHaveProperty('applying');
          expect(aspect).toHaveProperty('score');
        }
      });
    });

    describe('conjunction detection', () => {
      it('should detect exact conjunction (0 degrees)', () => {
        const natal = createChart([createPlanet('Sun', 100)]);
        const transit = createChart([createPlanet('Mars', 100)]);

        const result = findAspects(natal, transit);
        const conjunction = result.find(a => a.type === 'conjunction');

        expect(conjunction).toBeDefined();
        expect(conjunction?.orb).toBe(0);
      });

      it('should detect conjunction within orb', () => {
        const natal = createChart([createPlanet('Sun', 100)]);
        const transit = createChart([createPlanet('Mars', 101)]);

        const result = findAspects(natal, transit);
        const conjunction = result.find(a => a.type === 'conjunction');

        expect(conjunction).toBeDefined();
        expect(conjunction?.orb).toBeCloseTo(1, 1);
      });
    });

    describe('opposition detection', () => {
      it('should detect exact opposition (180 degrees)', () => {
        const natal = createChart([createPlanet('Sun', 0)]);
        const transit = createChart([createPlanet('Mars', 180)]);

        const result = findAspects(natal, transit);
        const opposition = result.find(a => a.type === 'opposition');

        expect(opposition).toBeDefined();
        expect(opposition?.orb).toBe(0);
      });
    });

    describe('square detection', () => {
      it('should detect exact square (90 degrees)', () => {
        const natal = createChart([createPlanet('Sun', 0)]);
        const transit = createChart([createPlanet('Mars', 90)]);

        const result = findAspects(natal, transit);
        const square = result.find(a => a.type === 'square');

        expect(square).toBeDefined();
        expect(square?.orb).toBe(0);
      });
    });

    describe('trine detection', () => {
      it('should detect exact trine (120 degrees)', () => {
        const natal = createChart([createPlanet('Sun', 0)]);
        const transit = createChart([createPlanet('Mars', 120)]);

        const result = findAspects(natal, transit);
        const trine = result.find(a => a.type === 'trine');

        expect(trine).toBeDefined();
        expect(trine?.orb).toBe(0);
      });
    });

    describe('sextile detection', () => {
      it('should detect exact sextile (60 degrees)', () => {
        const natal = createChart([createPlanet('Sun', 0)]);
        const transit = createChart([createPlanet('Mars', 60)]);

        const result = findAspects(natal, transit);
        const sextile = result.find(a => a.type === 'sextile');

        expect(sextile).toBeDefined();
        expect(sextile?.orb).toBe(0);
      });
    });

    describe('minor aspects', () => {
      it('should detect minor aspects when includeMinor is true', () => {
        const natal = createChart([createPlanet('Sun', 0)]);
        const transit = createChart([createPlanet('Mars', 30)]); // semisextile

        const rules: AspectRules = { includeMinor: true };
        const result = findAspects(natal, transit, rules);
        const semisextile = result.find(a => a.type === 'semisextile');

        expect(semisextile).toBeDefined();
      });

      it('should detect quincunx (150 degrees)', () => {
        const natal = createChart([createPlanet('Sun', 0)]);
        const transit = createChart([createPlanet('Mars', 150)]);

        const rules: AspectRules = { includeMinor: true };
        const result = findAspects(natal, transit, rules);
        const quincunx = result.find(a => a.type === 'quincunx');

        expect(quincunx).toBeDefined();
      });
    });

    describe('aspects to angles', () => {
      it('should detect aspects to Ascendant', () => {
        const natal = createChart([createPlanet('Sun', 100)], 100, 190);
        const transit = createChart([createPlanet('Mars', 100)]);

        const result = findAspects(natal, transit);
        const ascAspect = result.find(a => a.to.name === 'Ascendant');

        expect(ascAspect).toBeDefined();
      });

      it('should detect aspects to MC', () => {
        const natal = createChart([createPlanet('Sun', 100)], 10, 90);
        const transit = createChart([createPlanet('Mars', 90)]);

        const result = findAspects(natal, transit);
        const mcAspect = result.find(a => a.to.name === 'MC');

        expect(mcAspect).toBeDefined();
      });
    });

    describe('applying vs separating', () => {
      it('should mark applying aspects correctly', () => {
        const natal = createChart([createPlanet('Sun', 100)]);
        const transit = createChart([createPlanet('Mars', 99, 1)]); // moving towards

        const result = findAspects(natal, transit);

        if (result.length > 0) {
          expect(result[0]).toHaveProperty('applying');
        }
      });
    });

    describe('scoring', () => {
      it('should assign higher scores to tighter orbs', () => {
        const natal = createChart([
          createPlanet('Sun', 0),
          createPlanet('Moon', 10),
        ]);
        const transit = createChart([
          createPlanet('Mars', 0),   // exact conjunction to Sun
          createPlanet('Venus', 12), // 2 deg orb to Moon
        ]);

        const result = findAspects(natal, transit);

        // Expect results sorted by score (highest first)
        for (let i = 1; i < result.length; i++) {
          expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score!);
        }
      });
    });

    describe('maxResults', () => {
      it('should respect maxResults limit', () => {
        const natal = createChart([
          createPlanet('Sun', 0),
          createPlanet('Moon', 30),
          createPlanet('Mercury', 60),
        ]);
        const transit = createChart([
          createPlanet('Mars', 0),
          createPlanet('Venus', 30),
          createPlanet('Jupiter', 60),
        ]);

        const rules: AspectRules = { maxResults: 3 };
        const result = findAspects(natal, transit, rules);

        expect(result.length).toBeLessThanOrEqual(3);
      });
    });

    describe('orb configuration', () => {
      it('should use custom orb for Sun', () => {
        const natal = createChart([createPlanet('Sun', 0)]);
        const transit = createChart([createPlanet('Sun', 3)]);

        const rulesLargeOrb: AspectRules = { orbs: { Sun: 5 } };
        const rulesSmallOrb: AspectRules = { orbs: { Sun: 1 } };

        const resultLarge = findAspects(natal, transit, rulesLargeOrb);
        const resultSmall = findAspects(natal, transit, rulesSmallOrb);

        expect(resultLarge.length).toBeGreaterThan(0);
        expect(resultSmall.length).toBe(0);
      });
    });

    describe('empty chart handling', () => {
      it('should handle empty natal planets', () => {
        const natal = createChart([]);
        const transit = createChart([createPlanet('Mars', 0)]);

        const result = findAspects(natal, transit);

        expect(Array.isArray(result)).toBe(true);
      });

      it('should handle empty transit planets', () => {
        const natal = createChart([createPlanet('Sun', 0)]);
        const transit = createChart([]);

        const result = findAspects(natal, transit);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
      });

      it('should handle undefined planets array', () => {
        const natal = { planets: undefined } as any;
        const transit = createChart([createPlanet('Mars', 0)]);

        const result = findAspects(natal, transit);

        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe('findNatalAspects', () => {
    describe('structure validation', () => {
      it('should return an array of AspectHit', () => {
        const natal = createChart([
          createPlanet('Sun', 0),
          createPlanet('Moon', 90),
        ]);

        const result = findNatalAspects(natal);

        expect(Array.isArray(result)).toBe(true);
      });

      it('should return aspects with natal kind for both ends', () => {
        const natal = createChart([
          createPlanet('Sun', 0),
          createPlanet('Moon', 90),
        ]);

        const result = findNatalAspects(natal);

        if (result.length > 0) {
          expect(result[0].from.kind).toBe('natal');
          expect(result[0].to.kind).toBe('natal');
        }
      });
    });

    describe('natal aspect detection', () => {
      it('should detect conjunction between natal planets', () => {
        const natal = createChart([
          createPlanet('Sun', 100),
          createPlanet('Moon', 100),
        ]);

        const result = findNatalAspects(natal);
        const conjunction = result.find(a => a.type === 'conjunction');

        expect(conjunction).toBeDefined();
      });

      it('should detect square between natal planets', () => {
        const natal = createChart([
          createPlanet('Sun', 0),
          createPlanet('Moon', 90),
        ]);

        const result = findNatalAspects(natal);
        const square = result.find(a => a.type === 'square');

        expect(square).toBeDefined();
      });

      it('should detect trine between natal planets', () => {
        const natal = createChart([
          createPlanet('Sun', 0),
          createPlanet('Jupiter', 120),
        ]);

        const result = findNatalAspects(natal);
        const trine = result.find(a => a.type === 'trine');

        expect(trine).toBeDefined();
      });

      it('should detect opposition between natal planets', () => {
        const natal = createChart([
          createPlanet('Sun', 0),
          createPlanet('Saturn', 180),
        ]);

        const result = findNatalAspects(natal);
        const opposition = result.find(a => a.type === 'opposition');

        expect(opposition).toBeDefined();
      });
    });

    describe('no self-aspects', () => {
      it('should not create aspects between same planet', () => {
        const natal = createChart([
          createPlanet('Sun', 0),
        ]);

        const result = findNatalAspects(natal);

        // Single planet should have no aspects
        expect(result.length).toBe(0);
      });
    });

    describe('multiple planets', () => {
      it('should find all valid aspects between multiple planets', () => {
        const natal = createChart([
          createPlanet('Sun', 0),
          createPlanet('Moon', 60),     // sextile to Sun
          createPlanet('Mercury', 120), // trine to Sun, sextile to Moon
        ]);

        const result = findNatalAspects(natal);

        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe('wider orbs for natal', () => {
      it('should use wider orbs for natal aspects (+3 degrees)', () => {
        const natal = createChart([
          createPlanet('Sun', 0),
          createPlanet('Moon', 5), // Should be within natal orb
        ]);

        const result = findNatalAspects(natal);
        const conjunction = result.find(a => a.type === 'conjunction');

        expect(conjunction).toBeDefined();
      });
    });

    describe('maxResults', () => {
      it('should respect maxResults limit', () => {
        const natal = createChart([
          createPlanet('Sun', 0),
          createPlanet('Moon', 30),
          createPlanet('Mercury', 60),
          createPlanet('Venus', 90),
          createPlanet('Mars', 120),
        ]);

        const rules: AspectRules = { maxResults: 5 };
        const result = findNatalAspects(natal, rules);

        expect(result.length).toBeLessThanOrEqual(5);
      });
    });

    describe('empty chart handling', () => {
      it('should handle empty planets array', () => {
        const natal = createChart([]);

        const result = findNatalAspects(natal);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBe(0);
      });
    });

    describe('sorting by score', () => {
      it('should return aspects sorted by score descending', () => {
        const natal = createChart([
          createPlanet('Sun', 0),
          createPlanet('Moon', 90),
          createPlanet('Mercury', 120),
          createPlanet('Venus', 180),
        ]);

        const result = findNatalAspects(natal);

        for (let i = 1; i < result.length; i++) {
          expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score!);
        }
      });
    });
  });
});

