import { describe, it, expect } from 'vitest';
import { analyzeOuterPlanets } from '@/lib/compatibility/astrology/outer-planets';
import type { OuterPlanetAnalysis } from '@/lib/compatibility/astrology/outer-planets';

describe('analyzeOuterPlanets', () => {
  const baseSun = { sign: 'Aries', element: 'fire' };
  // Earth sun avoids element matches with air/water/fire outer planets
  const earthSun = { sign: 'Taurus', element: 'earth' };

  describe('same sign analysis', () => {
    it('should return high scores when all outer planets share signs', () => {
      const outer = {
        uranus: { sign: 'Aquarius', element: 'air' },
        neptune: { sign: 'Pisces', element: 'water' },
        pluto: { sign: 'Sagittarius', element: 'fire' },
      };
      const result = analyzeOuterPlanets(outer, outer, earthSun, earthSun);

      expect(result.uranusInfluence.changeCompatibility).toBe(90);
      expect(result.neptuneInfluence.spiritualConnection).toBe(90);
      expect(result.plutoInfluence.transformationPotential).toBe(90);
      expect(result.generationalThemes.length).toBeGreaterThanOrEqual(3);
    });

    it('should set proper descriptions for same-sign Uranus', () => {
      const outer = {
        uranus: { sign: 'Aquarius', element: 'air' },
      };
      const result = analyzeOuterPlanets(outer, outer, earthSun, earthSun);
      expect(result.uranusInfluence.revolutionaryEnergy).toContain('세대적');
    });
  });

  describe('same element analysis', () => {
    it('should return moderate scores for same element different sign', () => {
      const p1Outer = {
        uranus: { sign: 'Aquarius', element: 'air' },
        neptune: { sign: 'Pisces', element: 'water' },
        pluto: { sign: 'Sagittarius', element: 'fire' },
      };
      const p2Outer = {
        uranus: { sign: 'Gemini', element: 'air' },
        neptune: { sign: 'Cancer', element: 'water' },
        pluto: { sign: 'Aries', element: 'fire' },
      };
      const result = analyzeOuterPlanets(p1Outer, p2Outer, earthSun, earthSun);

      expect(result.uranusInfluence.changeCompatibility).toBe(75);
      expect(result.neptuneInfluence.spiritualConnection).toBe(75);
      expect(result.plutoInfluence.transformationPotential).toBe(75);
    });
  });

  describe('different element analysis', () => {
    it('should return base scores for different elements', () => {
      const p1Outer = {
        uranus: { sign: 'Aquarius', element: 'air' },
      };
      const p2Outer = {
        uranus: { sign: 'Taurus', element: 'earth' },
      };
      // Use water sun to avoid matching either air or earth uranus elements
      const waterSun = { sign: 'Cancer', element: 'water' };
      const result = analyzeOuterPlanets(p1Outer, p2Outer, waterSun, waterSun);
      expect(result.uranusInfluence.changeCompatibility).toBe(50);
    });
  });

  describe('Sun interactions', () => {
    it('should add bonus for Uranus-Sun element match', () => {
      const p1Outer = {
        uranus: { sign: 'Aries', element: 'fire' },
      };
      const p2Outer = {
        uranus: { sign: 'Taurus', element: 'earth' },
      };
      const p1Sun = { sign: 'Aries', element: 'fire' };
      const p2Sun = { sign: 'Leo', element: 'fire' };

      const result = analyzeOuterPlanets(p1Outer, p2Outer, p1Sun, p2Sun);
      // p1 uranus fire === p2Sun fire, so +5
      expect(result.uranusInfluence.changeCompatibility).toBe(55);
      expect(result.uranusInfluence.unexpectedEvents.length).toBeGreaterThan(0);
    });

    it('should add bonus for Neptune-Sun element match', () => {
      const p1Outer = {
        neptune: { sign: 'Pisces', element: 'water' },
      };
      const p2Outer = {
        neptune: { sign: 'Scorpio', element: 'water' },
      };
      const p1Sun = baseSun;
      const p2Sun = { sign: 'Cancer', element: 'water' };

      const result = analyzeOuterPlanets(p1Outer, p2Outer, p1Sun, p2Sun);
      // same element: 75, + Neptune-Sun match: +10
      expect(result.neptuneInfluence.spiritualConnection).toBe(85);
      expect(result.neptuneInfluence.illusionWarnings.length).toBeGreaterThan(0);
    });

    it('should add bonus for Pluto-Sun element match on both sides', () => {
      const p1Outer = {
        pluto: { sign: 'Sagittarius', element: 'fire' },
      };
      const p2Outer = {
        pluto: { sign: 'Leo', element: 'fire' },
      };
      const p1Sun = { sign: 'Leo', element: 'fire' };
      const p2Sun = { sign: 'Aries', element: 'fire' };

      const result = analyzeOuterPlanets(p1Outer, p2Outer, p1Sun, p2Sun);
      // same element: 75, + p1Pluto-p2Sun: +10, + p2Pluto-p1Sun: +10
      expect(result.plutoInfluence.transformationPotential).toBe(95);
      expect(result.plutoInfluence.deepHealingAreas.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('missing planets', () => {
    it('should handle empty outer planets gracefully', () => {
      const result = analyzeOuterPlanets({}, {}, baseSun, baseSun);
      expect(result.uranusInfluence.changeCompatibility).toBe(50);
      expect(result.neptuneInfluence.spiritualConnection).toBe(50);
      expect(result.plutoInfluence.transformationPotential).toBe(50);
      expect(result.overallTranscendentScore).toBe(50);
    });
  });

  describe('overall transcendent score', () => {
    it('should be average of all three planet scores', () => {
      const outer = {
        uranus: { sign: 'Aquarius', element: 'air' },
        neptune: { sign: 'Pisces', element: 'water' },
        pluto: { sign: 'Sagittarius', element: 'fire' },
      };
      const result = analyzeOuterPlanets(outer, outer, earthSun, earthSun);
      // All same sign: each 90, avg = 90
      expect(result.overallTranscendentScore).toBe(90);
    });

    it('should cap individual scores at 100', () => {
      const p1Outer = {
        pluto: { sign: 'Sagittarius', element: 'fire' },
      };
      const p2Outer = {
        pluto: { sign: 'Sagittarius', element: 'fire' },
      };
      const fireSun = { sign: 'Leo', element: 'fire' };
      // same sign: 90, + deepHealing from p1->p2 Sun: +10, + p2->p1: +10 = 110 -> capped at 100
      const result = analyzeOuterPlanets(p1Outer, p2Outer, fireSun, fireSun);
      expect(result.plutoInfluence.transformationPotential).toBeLessThanOrEqual(100);
    });
  });
});
