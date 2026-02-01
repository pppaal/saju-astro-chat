import { describe, it, expect } from 'vitest';
import {
  analyzeMercuryAspects,
  analyzeJupiterAspects,
  analyzeSaturnAspects,
} from '@/lib/compatibility/astrology/planet-analysis';

describe('analyzeMercuryAspects', () => {
  // Use earth sun to avoid Mercury-Sun element interactions affecting base scores
  const neutralSun = { sign: 'Taurus', element: 'earth' };

  describe('same sign Mercury', () => {
    it('should return highest compatibility for same sign', () => {
      const mercury = { sign: 'Gemini', element: 'air' };
      const result = analyzeMercuryAspects(mercury, mercury, neutralSun, neutralSun);
      expect(result.mercuryCompatibility).toBe(95);
      expect(result.strengths.length).toBeGreaterThan(0);
    });
  });

  describe('same element Mercury', () => {
    it('should return high compatibility for same element', () => {
      const p1 = { sign: 'Gemini', element: 'air' };
      const p2 = { sign: 'Libra', element: 'air' };
      const result = analyzeMercuryAspects(p1, p2, neutralSun, neutralSun);
      expect(result.mercuryCompatibility).toBe(85);
    });
  });

  describe('compatible element Mercury', () => {
    it('should return moderate compatibility for compatible elements', () => {
      const p1 = { sign: 'Aries', element: 'fire' };
      const p2 = { sign: 'Gemini', element: 'air' };
      // Use neutral suns so Mercury-Sun interaction doesn't add bonus
      const neutralSun = { sign: 'Taurus', element: 'earth' };
      const result = analyzeMercuryAspects(p1, p2, neutralSun, neutralSun);
      expect(result.mercuryCompatibility).toBe(75);
    });
  });

  describe('incompatible element Mercury', () => {
    it('should return low compatibility for incompatible elements', () => {
      const p1 = { sign: 'Aries', element: 'fire' };
      const p2 = { sign: 'Cancer', element: 'water' };
      // Use neutral suns so Mercury-Sun interaction doesn't add bonus
      const neutralSun = { sign: 'Gemini', element: 'air' };
      const result = analyzeMercuryAspects(p1, p2, neutralSun, neutralSun);
      expect(result.mercuryCompatibility).toBe(45);
      expect(result.potentialMiscommunications.length).toBeGreaterThan(0);
    });
  });

  describe('Mercury-Sun interaction', () => {
    it('should add 10 when Mercury element matches partner Sun element', () => {
      // air + earth are incompatible → base 45
      const p1Mercury = { sign: 'Gemini', element: 'air' };
      const p2Mercury = { sign: 'Taurus', element: 'earth' };
      // p1Mercury (air) matches p2Sun (air) → +10
      const p1Sun = { sign: 'Capricorn', element: 'earth' };
      const p2Sun = { sign: 'Libra', element: 'air' };
      const result = analyzeMercuryAspects(p1Mercury, p2Mercury, p1Sun, p2Sun);
      expect(result.mercuryCompatibility).toBe(55); // 45 + 10
      expect(result.strengths).toContain('상대의 생각을 자연스럽게 이해');
    });
  });

  describe('element pair characteristics', () => {
    it('should add fire-fire characteristics', () => {
      const mercury = { sign: 'Aries', element: 'fire' };
      const result = analyzeMercuryAspects(mercury, mercury, neutralSun, neutralSun);
      expect(result.strengths).toContain('열정적이고 빠른 아이디어 교환');
    });

    it('should add earth-earth characteristics', () => {
      const mercury = { sign: 'Taurus', element: 'earth' };
      const airSun = { sign: 'Gemini', element: 'air' };
      const result = analyzeMercuryAspects(mercury, mercury, airSun, airSun);
      expect(result.strengths).toContain('실용적이고 구체적인 대화');
    });

    it('should add air-air characteristics', () => {
      const mercury = { sign: 'Gemini', element: 'air' };
      const result = analyzeMercuryAspects(mercury, mercury, neutralSun, neutralSun);
      expect(result.strengths).toContain('끝없는 지적 토론 가능');
    });

    it('should add water-water characteristics', () => {
      const mercury = { sign: 'Cancer', element: 'water' };
      const result = analyzeMercuryAspects(mercury, mercury, neutralSun, neutralSun);
      expect(result.strengths).toContain('직관적이고 감정적인 이해');
    });

    it('should add fire-water miscommunication', () => {
      const p1 = { sign: 'Aries', element: 'fire' };
      const p2 = { sign: 'Cancer', element: 'water' };
      const result = analyzeMercuryAspects(p1, p2, neutralSun, neutralSun);
      expect(result.potentialMiscommunications).toContain('직접적 vs 간접적 소통 차이');
    });

    it('should add air-earth miscommunication', () => {
      const p1 = { sign: 'Gemini', element: 'air' };
      const p2 = { sign: 'Taurus', element: 'earth' };
      const result = analyzeMercuryAspects(p1, p2, neutralSun, neutralSun);
      expect(result.potentialMiscommunications).toContain('이론적 vs 실용적 접근 차이');
    });
  });

  it('should cap compatibility at 100', () => {
    // same sign (95) + Sun match (+10) = 105 → capped at 100
    const mercury = { sign: 'Aries', element: 'fire' };
    const fireSun = { sign: 'Leo', element: 'fire' };
    const result = analyzeMercuryAspects(mercury, mercury, fireSun, fireSun);
    expect(result.mercuryCompatibility).toBeLessThanOrEqual(100);
  });
});

describe('analyzeJupiterAspects', () => {
  // Use earth sun to avoid Jupiter-Sun element interactions affecting base scores
  const neutralSun = { sign: 'Taurus', element: 'earth' };

  describe('same sign Jupiter', () => {
    it('should return highest compatibility', () => {
      const jupiter = { sign: 'Sagittarius', element: 'fire' };
      const result = analyzeJupiterAspects(jupiter, jupiter, neutralSun, neutralSun);
      expect(result.expansionCompatibility).toBe(95);
      expect(result.blessingAreas.length).toBeGreaterThan(0);
    });
  });

  describe('same element Jupiter', () => {
    it('should return high compatibility', () => {
      const p1 = { sign: 'Aries', element: 'fire' };
      const p2 = { sign: 'Leo', element: 'fire' };
      const result = analyzeJupiterAspects(p1, p2, neutralSun, neutralSun);
      expect(result.expansionCompatibility).toBe(85);
    });
  });

  describe('compatible element Jupiter', () => {
    it('should return moderate compatibility', () => {
      const p1 = { sign: 'Aries', element: 'fire' };
      const p2 = { sign: 'Gemini', element: 'air' };
      // Use neutral suns so Jupiter-Sun interaction doesn't add bonus
      const neutralSun = { sign: 'Taurus', element: 'earth' };
      const result = analyzeJupiterAspects(p1, p2, neutralSun, neutralSun);
      expect(result.expansionCompatibility).toBe(70);
    });
  });

  describe('incompatible element Jupiter', () => {
    it('should return low compatibility', () => {
      const p1 = { sign: 'Gemini', element: 'air' };
      const p2 = { sign: 'Taurus', element: 'earth' };
      // Use fire sun which doesn't match air or earth Jupiter
      const fireSun = { sign: 'Aries', element: 'fire' };
      const result = analyzeJupiterAspects(p1, p2, fireSun, fireSun);
      expect(result.expansionCompatibility).toBe(40);
      expect(result.potentialConflicts.length).toBeGreaterThan(0);
    });
  });

  describe('Jupiter-Sun interaction', () => {
    it('should add 10 for each Sun-Jupiter element match', () => {
      const p1Jupiter = { sign: 'Leo', element: 'fire' };
      const p2Jupiter = { sign: 'Sagittarius', element: 'fire' };
      const p1Sun = { sign: 'Aries', element: 'fire' };
      const p2Sun = { sign: 'Leo', element: 'fire' };
      const result = analyzeJupiterAspects(p1Jupiter, p2Jupiter, p1Sun, p2Sun);
      // same element: 85, p1Jup matches p2Sun: +10, p2Jup matches p1Sun: +10 = 105 → capped
      expect(result.expansionCompatibility).toBeLessThanOrEqual(100);
      expect(result.blessingAreas.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('element-specific growth themes', () => {
    it('should include fire growth area', () => {
      const jupiter = { sign: 'Aries', element: 'fire' };
      const result = analyzeJupiterAspects(jupiter, jupiter, neutralSun, neutralSun);
      expect(result.growthAreas.some(g => g.includes('모험'))).toBe(true);
    });

    it('should include earth growth area', () => {
      const jupiter = { sign: 'Taurus', element: 'earth' };
      const airSun = { sign: 'Gemini', element: 'air' };
      const result = analyzeJupiterAspects(jupiter, jupiter, airSun, airSun);
      expect(result.growthAreas.some(g => g.includes('물질적'))).toBe(true);
    });

    it('should include air growth area', () => {
      const jupiter = { sign: 'Gemini', element: 'air' };
      const result = analyzeJupiterAspects(jupiter, jupiter, neutralSun, neutralSun);
      expect(result.growthAreas.some(g => g.includes('지식'))).toBe(true);
    });

    it('should include water growth area', () => {
      const jupiter = { sign: 'Cancer', element: 'water' };
      const result = analyzeJupiterAspects(jupiter, jupiter, neutralSun, neutralSun);
      expect(result.growthAreas.some(g => g.includes('감정적'))).toBe(true);
    });
  });
});

describe('analyzeSaturnAspects', () => {
  // Use fire sun and air moon to avoid Saturn element interactions
  const neutralSun = { sign: 'Aries', element: 'fire' };
  const neutralMoon = { sign: 'Gemini', element: 'air' };

  describe('same element Saturn', () => {
    it('should return high stability and long-term potential', () => {
      const saturn = { sign: 'Capricorn', element: 'earth' };
      const result = analyzeSaturnAspects(saturn, saturn, neutralSun, neutralSun, neutralMoon, neutralMoon);
      expect(result.stabilityCompatibility).toBe(80);
      expect(result.longTermPotential).toBe(85);
    });
  });

  describe('compatible element Saturn', () => {
    it('should return moderate stability', () => {
      const p1 = { sign: 'Capricorn', element: 'earth' };
      const p2 = { sign: 'Scorpio', element: 'water' };
      // Use air moons to avoid Saturn-Moon element matches
      const airMoon = { sign: 'Gemini', element: 'air' };
      const result = analyzeSaturnAspects(p1, p2, neutralSun, neutralSun, airMoon, airMoon);
      expect(result.stabilityCompatibility).toBe(65);
      expect(result.longTermPotential).toBe(75);
    });
  });

  describe('incompatible element Saturn', () => {
    it('should return low stability with challenges', () => {
      const p1 = { sign: 'Gemini', element: 'air' };
      const p2 = { sign: 'Taurus', element: 'earth' };
      // Use moons that don't match Saturn elements
      const fireMoon = { sign: 'Leo', element: 'fire' };
      const result = analyzeSaturnAspects(p1, p2, neutralSun, neutralSun, fireMoon, fireMoon);
      expect(result.stabilityCompatibility).toBe(40);
      expect(result.challenges.length).toBeGreaterThan(0);
      expect(result.longTermPotential).toBe(55);
    });
  });

  describe('Saturn-Sun interaction', () => {
    it('should add challenges when Saturn element matches partner Sun', () => {
      const p1Saturn = { sign: 'Aries', element: 'fire' };
      const p2Saturn = { sign: 'Cancer', element: 'water' };
      const p1Sun = { sign: 'Taurus', element: 'earth' };
      const p2Sun = { sign: 'Leo', element: 'fire' };
      // p1Saturn (fire) === p2Sun (fire) → challenge
      const result = analyzeSaturnAspects(p1Saturn, p2Saturn, p1Sun, p2Sun, neutralMoon, neutralMoon);
      expect(result.challenges.some(c => c.includes('제한적'))).toBe(true);
      expect(result.maturityAreas.some(m => m.includes('자기 훈련'))).toBe(true);
    });
  });

  describe('Saturn-Moon interaction', () => {
    it('should add emotional stability for compatible elements', () => {
      const p1Saturn = { sign: 'Taurus', element: 'earth' };
      const p2Saturn = { sign: 'Virgo', element: 'earth' };
      const p2Moon = { sign: 'Capricorn', element: 'earth' };

      const result = analyzeSaturnAspects(p1Saturn, p2Saturn, neutralSun, neutralSun, neutralMoon, p2Moon);
      expect(result.maturityAreas.some(m => m.includes('감정적 안정'))).toBe(true);
    });
  });

  it('should always include maturity message', () => {
    const saturn = { sign: 'Capricorn', element: 'earth' };
    const result = analyzeSaturnAspects(saturn, saturn, neutralSun, neutralSun, neutralMoon, neutralMoon);
    expect(result.maturityAreas).toContain('시간이 지날수록 관계가 성숙해짐');
  });

  it('should cap longTermPotential at 100', () => {
    const saturn = { sign: 'Capricorn', element: 'earth' };
    const earthMoon = { sign: 'Taurus', element: 'earth' };
    const result = analyzeSaturnAspects(saturn, saturn, neutralSun, neutralSun, earthMoon, earthMoon);
    expect(result.longTermPotential).toBeLessThanOrEqual(100);
  });
});
