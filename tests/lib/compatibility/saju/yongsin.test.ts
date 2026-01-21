/**
 * Yongsin (용신) Compatibility Tests
 * Tests for beneficial god (용신) and supporting god (희신) analysis
 */
import { describe, it, expect } from 'vitest';
import {
  analyzeYongsinCompatibility,
  calculateYongsin,
  calculateHuisin,
} from '@/lib/compatibility/saju/yongsin';
import type { SajuProfile } from '@/lib/compatibility/cosmicCompatibility';

function createMockProfile(
  dayStem: string,
  dayBranch: string,
  dayElement: string,
  elements: Record<string, number> = {}
): SajuProfile {
  return {
    pillars: {
      year: { stem: '甲', branch: '子' },
      month: { stem: '乙', branch: '丑' },
      day: { stem: dayStem, branch: dayBranch },
      time: { stem: '丁', branch: '卯' },
    },
    dayMaster: { name: dayStem, element: dayElement },
    elements: {
      wood: elements.wood || 1,
      fire: elements.fire || 1,
      earth: elements.earth || 1,
      metal: elements.metal || 1,
      water: elements.water || 1,
    },
  } as SajuProfile;
}

describe('compatibility/saju/yongsin', () => {
  describe('calculateYongsin', () => {
    it('should calculate yongsin for weak day master', () => {
      const profile = createMockProfile('甲', '子', 'wood', { wood: 1 });

      const yongsin = calculateYongsin(profile);

      // Weak wood needs water (generating element)
      expect(yongsin).toBe('water');
    });

    it('should calculate yongsin for strong day master', () => {
      const profile = createMockProfile('甲', '子', 'wood', { wood: 4 });

      const yongsin = calculateYongsin(profile);

      // Strong wood needs metal (controlling element)
      expect(yongsin).toBe('metal');
    });

    it('should handle all five elements', () => {
      const testCases = [
        { element: 'wood', weak: 'water', strong: 'metal' },
        { element: 'fire', weak: 'wood', strong: 'water' },
        { element: 'earth', weak: 'fire', strong: 'wood' },
        { element: 'metal', weak: 'earth', strong: 'fire' },
        { element: 'water', weak: 'metal', strong: 'earth' },
      ];

      testCases.forEach(({ element, weak, strong }) => {
        const weakProfile = createMockProfile('甲', '子', element, { [element]: 1 });
        const strongProfile = createMockProfile('甲', '子', element, { [element]: 4 });

        expect(calculateYongsin(weakProfile)).toBe(weak);
        expect(calculateYongsin(strongProfile)).toBe(strong);
      });
    });

    it('should determine strength based on element count', () => {
      const weakProfile = createMockProfile('甲', '子', 'wood', { wood: 2 });
      const strongProfile = createMockProfile('甲', '子', 'wood', { wood: 3 });

      const weakYongsin = calculateYongsin(weakProfile);
      const strongYongsin = calculateYongsin(strongProfile);

      expect(weakYongsin).toBe('water'); // Weak
      expect(strongYongsin).toBe('metal'); // Strong
    });

    it('should handle missing element counts', () => {
      const profile = createMockProfile('甲', '子', 'wood', {});

      const yongsin = calculateYongsin(profile);

      expect(yongsin).toBeDefined();
      expect(['wood', 'fire', 'earth', 'metal', 'water']).toContain(yongsin);
    });
  });

  describe('calculateHuisin', () => {
    it('should calculate huisin that generates yongsin', () => {
      const testCases = [
        { yongsin: 'wood', expectedHuisin: 'water' },
        { yongsin: 'fire', expectedHuisin: 'wood' },
        { yongsin: 'earth', expectedHuisin: 'fire' },
        { yongsin: 'metal', expectedHuisin: 'earth' },
        { yongsin: 'water', expectedHuisin: 'metal' },
      ];

      testCases.forEach(({ yongsin, expectedHuisin }) => {
        const profile = createMockProfile('甲', '子', 'wood');
        const huisin = calculateHuisin(profile, yongsin);

        expect(huisin).toBe(expectedHuisin);
      });
    });

    it('should return earth as default for invalid yongsin', () => {
      const profile = createMockProfile('甲', '子', 'wood');
      const huisin = calculateHuisin(profile, 'invalid');

      expect(huisin).toBe('earth');
    });

    it('should follow generation cycle', () => {
      const profile = createMockProfile('甲', '子', 'wood');

      // Water generates wood, wood generates fire
      const huisinForWood = calculateHuisin(profile, 'wood');
      const huisinForFire = calculateHuisin(profile, 'fire');

      expect(huisinForWood).toBe('water');
      expect(huisinForFire).toBe('wood');
    });
  });

  describe('analyzeYongsinCompatibility', () => {
    it('should identify mutual yongsin support', () => {
      const p1 = createMockProfile('甲', '子', 'wood', { wood: 1, water: 3 });
      const p2 = createMockProfile('壬', '申', 'water', { water: 1, metal: 3 });

      const result = analyzeYongsinCompatibility(p1, p2);

      // Should have reasonable compatibility
      expect(result.compatibility).toBeGreaterThan(40);
      expect(result.interpretation.length).toBeGreaterThan(0);
    });

    it('should identify one-way yongsin support', () => {
      const p1 = createMockProfile('甲', '子', 'wood', { wood: 1 });
      const p2 = createMockProfile('壬', '申', 'water', { water: 3 });

      const result = analyzeYongsinCompatibility(p1, p2);

      // P2 has P1's yongsin (water)
      expect(result.compatibility).toBeGreaterThanOrEqual(70);
      expect(result.interpretation.length).toBeGreaterThan(0);
    });

    it('should handle no yongsin match', () => {
      const p1 = createMockProfile('甲', '子', 'wood', { wood: 1 });
      const p2 = createMockProfile('己', '丑', 'earth', { earth: 1 });

      const result = analyzeYongsinCompatibility(p1, p2);

      expect(result.mutualSupport).toBe(false);
      expect(result.compatibility).toBeLessThan(70);
    });

    it('should calculate yongsin for both profiles', () => {
      const p1 = createMockProfile('甲', '子', 'wood', { wood: 1 });
      const p2 = createMockProfile('己', '丑', 'earth', { earth: 1 });

      const result = analyzeYongsinCompatibility(p1, p2);

      expect(result.person1Yongsin).toBeDefined();
      expect(result.person2Yongsin).toBeDefined();
      expect(['wood', 'fire', 'earth', 'metal', 'water']).toContain(result.person1Yongsin);
      expect(['wood', 'fire', 'earth', 'metal', 'water']).toContain(result.person2Yongsin);
    });

    it('should calculate huisin for both profiles', () => {
      const p1 = createMockProfile('甲', '子', 'wood', { wood: 1 });
      const p2 = createMockProfile('己', '丑', 'earth', { earth: 1 });

      const result = analyzeYongsinCompatibility(p1, p2);

      expect(result.person1Huisin).toBeDefined();
      expect(result.person2Huisin).toBeDefined();
      expect(['wood', 'fire', 'earth', 'metal', 'water']).toContain(result.person1Huisin);
      expect(['wood', 'fire', 'earth', 'metal', 'water']).toContain(result.person2Huisin);
    });

    it('should provide interpretation', () => {
      const p1 = createMockProfile('甲', '子', 'wood', { wood: 1 });
      const p2 = createMockProfile('壬', '申', 'water', { water: 3 });

      const result = analyzeYongsinCompatibility(p1, p2);

      expect(result.interpretation).toBeDefined();
      expect(result.interpretation.length).toBeGreaterThan(0);
      expect(result.interpretation[0].length).toBeGreaterThan(0);
    });

    it('should include day master names in interpretation', () => {
      const p1 = createMockProfile('甲', '子', 'wood', { wood: 1 });
      const p2 = createMockProfile('壬', '申', 'water', { water: 3 });

      const result = analyzeYongsinCompatibility(p1, p2);

      const allInterpretation = result.interpretation.join(' ');
      expect(allInterpretation).toContain('甲');
      expect(allInterpretation).toContain('壬');
    });

    it('should cap compatibility at 100', () => {
      const p1 = createMockProfile('甲', '子', 'wood', { wood: 1, water: 5 });
      const p2 = createMockProfile('壬', '申', 'water', { water: 1, metal: 5 });

      const result = analyzeYongsinCompatibility(p1, p2);

      expect(result.compatibility).toBeLessThanOrEqual(100);
    });

    it('should add bonus for huisin support', () => {
      const p1 = createMockProfile('甲', '子', 'wood', { wood: 1, water: 2, metal: 2 });
      const p2 = createMockProfile('壬', '申', 'water', { water: 1, metal: 2, earth: 2 });

      const result = analyzeYongsinCompatibility(p1, p2);

      // Should have base compatibility plus huisin bonus
      expect(result.interpretation.some(i => i.includes('희신'))).toBe(true);
    });

    it('should handle different element strengths', () => {
      const strongWood = createMockProfile('甲', '子', 'wood', { wood: 4 });
      const weakWood = createMockProfile('乙', '丑', 'wood', { wood: 1 });

      const result = analyzeYongsinCompatibility(strongWood, weakWood);

      expect(result.person1Yongsin).toBe('metal'); // Strong needs control
      expect(result.person2Yongsin).toBe('water'); // Weak needs generation
    });

    it('should provide different interpretations based on match quality', () => {
      const p1 = createMockProfile('甲', '子', 'wood', { wood: 1 });

      const mutualMatch = createMockProfile('壬', '申', 'water', { water: 1, metal: 3 });
      const oneWayMatch = createMockProfile('壬', '申', 'water', { water: 3 });
      const noMatch = createMockProfile('己', '丑', 'earth', { earth: 1 });

      const result1 = analyzeYongsinCompatibility(p1, mutualMatch);
      const result2 = analyzeYongsinCompatibility(p1, oneWayMatch);
      const result3 = analyzeYongsinCompatibility(p1, noMatch);

      // All should provide valid compatibility scores
      expect(result1.compatibility).toBeGreaterThan(0);
      expect(result2.compatibility).toBeGreaterThan(0);
      expect(result3.compatibility).toBeGreaterThan(0);
    });

    it('should use element description helpers', () => {
      const p1 = createMockProfile('甲', '子', 'wood', { wood: 1 });
      const p2 = createMockProfile('壬', '申', 'water', { water: 3 });

      const result = analyzeYongsinCompatibility(p1, p2);

      const allInterpretation = result.interpretation.join(' ');
      // Check for element descriptions - should have meaningful content
      expect(allInterpretation.length).toBeGreaterThan(0);
      expect(result.interpretation.length).toBeGreaterThan(0);
    });

    it('should check element strength threshold', () => {
      const p1 = createMockProfile('甲', '子', 'wood', { wood: 1 });
      const p2LowWater = createMockProfile('壬', '申', 'water', { water: 1 });
      const p2HighWater = createMockProfile('壬', '申', 'water', { water: 2 });

      const result1 = analyzeYongsinCompatibility(p1, p2LowWater);
      const result2 = analyzeYongsinCompatibility(p1, p2HighWater);

      // High water should provide yongsin support
      expect(result2.compatibility).toBeGreaterThanOrEqual(result1.compatibility);
    });

    it('should handle profiles with balanced elements', () => {
      const p1 = createMockProfile('甲', '子', 'wood', {
        wood: 2, fire: 2, earth: 2, metal: 2, water: 2,
      });
      const p2 = createMockProfile('己', '丑', 'earth', {
        wood: 2, fire: 2, earth: 2, metal: 2, water: 2,
      });

      const result = analyzeYongsinCompatibility(p1, p2);

      expect(result.compatibility).toBeDefined();
      expect(result.compatibility).toBeGreaterThanOrEqual(0);
      expect(result.compatibility).toBeLessThanOrEqual(100);
    });
  });

  describe('integration tests', () => {
    it('should provide complete yongsin analysis', () => {
      const p1 = createMockProfile('甲', '子', 'wood', { wood: 1 });
      const p2 = createMockProfile('壬', '申', 'water', { water: 3 });

      const result = analyzeYongsinCompatibility(p1, p2);

      expect(result).toMatchObject({
        person1Yongsin: expect.any(String),
        person1Huisin: expect.any(String),
        person2Yongsin: expect.any(String),
        person2Huisin: expect.any(String),
        mutualSupport: expect.any(Boolean),
        compatibility: expect.any(Number),
        interpretation: expect.any(Array),
      });
    });

    it('should match yongsin with huisin generation cycle', () => {
      const p1 = createMockProfile('甲', '子', 'wood', { wood: 1 });

      const yongsin = calculateYongsin(p1);
      const huisin = calculateHuisin(p1, yongsin);

      // Huisin should generate yongsin
      const generationMap: Record<string, string> = {
        wood: 'water',
        fire: 'wood',
        earth: 'fire',
        metal: 'earth',
        water: 'metal',
      };

      expect(huisin).toBe(generationMap[yongsin]);
    });

    it('should handle real-world compatibility scenarios', () => {
      // Scenario 1: Perfect match
      const perfect1 = createMockProfile('甲', '子', 'wood', { wood: 1, water: 3 });
      const perfect2 = createMockProfile('壬', '申', 'water', { water: 1, metal: 3 });
      const perfectResult = analyzeYongsinCompatibility(perfect1, perfect2);
      expect(perfectResult.compatibility).toBeGreaterThan(50);

      // Scenario 2: One-way support
      const oneWay1 = createMockProfile('甲', '子', 'wood', { wood: 1 });
      const oneWay2 = createMockProfile('壬', '申', 'water', { water: 3 });
      const oneWayResult = analyzeYongsinCompatibility(oneWay1, oneWay2);
      expect(oneWayResult.compatibility).toBeGreaterThan(50);

      // Scenario 3: No support
      const noSupport1 = createMockProfile('甲', '子', 'wood', { wood: 1 });
      const noSupport2 = createMockProfile('己', '丑', 'earth', { earth: 1 });
      const noSupportResult = analyzeYongsinCompatibility(noSupport1, noSupport2);
      expect(noSupportResult.compatibility).toBeLessThan(70);
    });
  });
});
