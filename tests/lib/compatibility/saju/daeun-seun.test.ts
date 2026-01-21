/**
 * Daeun & Seun Compatibility Tests
 * Tests for major fortune (대운) and annual fortune (세운) analysis
 */
import { describe, it, expect } from 'vitest';
import {
  analyzeDaeunCompatibility,
  analyzeSeunCompatibility,
} from '@/lib/compatibility/saju/daeun-seun';
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

describe('compatibility/saju/daeun-seun', () => {
  describe('analyzeDaeunCompatibility', () => {
    it('should calculate current daeun for both profiles', () => {
      const p1 = createMockProfile('甲', '子', 'wood');
      const p2 = createMockProfile('己', '丑', 'earth');

      const result = analyzeDaeunCompatibility(p1, p2, 35, 30);

      expect(result.person1CurrentDaeun).toBeDefined();
      expect(result.person2CurrentDaeun).toBeDefined();
      expect(result.person1CurrentDaeun.stem).toBeDefined();
      expect(result.person2CurrentDaeun.branch).toBeDefined();
    });

    it('should identify harmonic periods when elements are same', () => {
      const p1 = createMockProfile('甲', '子', 'wood');
      const p2 = createMockProfile('乙', '丑', 'wood');

      const result = analyzeDaeunCompatibility(p1, p2, 35, 35);

      expect(result.currentSynergy).toBeGreaterThanOrEqual(75);
      expect(result.harmonicPeriods.length).toBeGreaterThan(0);
    });

    it('should identify harmonic periods when elements are harmonious', () => {
      const p1 = createMockProfile('甲', '子', 'wood');
      const p2 = createMockProfile('丙', '寅', 'fire');

      const result = analyzeDaeunCompatibility(p1, p2, 35, 35);

      // Wood generates fire - harmonious relationship
      expect(result.currentSynergy).toBeGreaterThan(50);
      expect(result.harmonicPeriods.length).toBeGreaterThan(0);
    });

    it('should identify challenging periods when elements clash', () => {
      const p1 = createMockProfile('甲', '子', 'wood', { wood: 1 });
      const p2 = createMockProfile('庚', '申', 'metal', { metal: 1 });

      const result = analyzeDaeunCompatibility(p1, p2, 35, 35);

      // Should have synergy score calculated
      expect(result.currentSynergy).toBeGreaterThan(0);
      expect(result.currentSynergy).toBeLessThanOrEqual(100);
    });

    it('should calculate daeun periods based on age', () => {
      const p1 = createMockProfile('甲', '子', 'wood');
      const p2 = createMockProfile('己', '丑', 'earth');

      const result1 = analyzeDaeunCompatibility(p1, p2, 15, 20);
      const result2 = analyzeDaeunCompatibility(p1, p2, 35, 40);

      // Different ages should potentially result in different daeun periods
      expect(result1.person1CurrentDaeun.startAge).toBe(10);
      expect(result2.person1CurrentDaeun.startAge).toBe(30);
    });

    it('should include daeun theme description', () => {
      const p1 = createMockProfile('甲', '子', 'wood');
      const p2 = createMockProfile('己', '丑', 'earth');

      const result = analyzeDaeunCompatibility(p1, p2, 35, 30);

      expect(result.person1CurrentDaeun.theme).toBeDefined();
      expect(result.person2CurrentDaeun.theme).toBeDefined();
    });

    it('should provide future outlook', () => {
      const p1 = createMockProfile('甲', '子', 'wood');
      const p2 = createMockProfile('己', '丑', 'earth');

      const result = analyzeDaeunCompatibility(p1, p2, 35, 30);

      expect(result.futureOutlook).toBeDefined();
      expect(result.futureOutlook.length).toBeGreaterThan(0);
    });

    it('should cap synergy at 100', () => {
      const p1 = createMockProfile('甲', '子', 'wood');
      const p2 = createMockProfile('乙', '丑', 'wood');

      const result = analyzeDaeunCompatibility(p1, p2, 35, 35);

      expect(result.currentSynergy).toBeLessThanOrEqual(100);
    });

    it('should have positive outlook for high synergy', () => {
      const p1 = createMockProfile('甲', '子', 'wood');
      const p2 = createMockProfile('乙', '丑', 'wood');

      const result = analyzeDaeunCompatibility(p1, p2, 35, 35);

      expect(result.currentSynergy).toBeGreaterThanOrEqual(75);
      // Should have positive outlook with emojis
      expect(/[\u{1F300}-\u{1F9FF}]/u.test(result.futureOutlook)).toBe(true);
    });

    it('should handle yongsin compatibility bonus', () => {
      const p1 = createMockProfile('甲', '子', 'wood', { wood: 1 }); // Weak wood needs water
      const p2 = createMockProfile('壬', '申', 'water', { water: 3 }); // Water daeun

      const result = analyzeDaeunCompatibility(p1, p2, 35, 35);

      // Should have good synergy due to yongsin compatibility
      expect(result.currentSynergy).toBeGreaterThan(50);
      expect(result.harmonicPeriods.length).toBeGreaterThan(0);
    });

    it('should calculate daeun element correctly', () => {
      const p1 = createMockProfile('甲', '子', 'wood');
      const p2 = createMockProfile('己', '丑', 'earth');

      const result = analyzeDaeunCompatibility(p1, p2, 35, 30);

      const validElements = ['wood', 'fire', 'earth', 'metal', 'water'];
      expect(validElements).toContain(result.person1CurrentDaeun.element);
      expect(validElements).toContain(result.person2CurrentDaeun.element);
    });

    it('should handle different age ranges', () => {
      const p1 = createMockProfile('甲', '子', 'wood');
      const p2 = createMockProfile('己', '丑', 'earth');

      const testCases = [
        { age: 5, expectedStartAge: 0 },
        { age: 15, expectedStartAge: 10 },
        { age: 25, expectedStartAge: 20 },
        { age: 35, expectedStartAge: 30 },
        { age: 45, expectedStartAge: 40 },
      ];

      testCases.forEach(({ age, expectedStartAge }) => {
        const result = analyzeDaeunCompatibility(p1, p2, age, age);
        expect(result.person1CurrentDaeun.startAge).toBe(expectedStartAge);
        expect(result.person1CurrentDaeun.endAge).toBe(expectedStartAge + 10);
      });
    });
  });

  describe('analyzeSeunCompatibility', () => {
    it('should calculate year stem and branch', () => {
      const p1 = createMockProfile('甲', '子', 'wood');
      const p2 = createMockProfile('己', '丑', 'earth');

      const result = analyzeSeunCompatibility(p1, p2, 2024);

      expect(result.year).toBe(2024);
      expect(result.yearStem).toBeDefined();
      expect(result.yearBranch).toBeDefined();
      expect(result.yearElement).toBeDefined();
    });

    it('should provide person impact assessments', () => {
      const p1 = createMockProfile('甲', '子', 'wood');
      const p2 = createMockProfile('己', '丑', 'earth');

      const result = analyzeSeunCompatibility(p1, p2, 2024);

      const validImpacts = ['very_favorable', 'favorable', 'neutral', 'challenging', 'very_challenging'];
      expect(validImpacts).toContain(result.person1Impact);
      expect(validImpacts).toContain(result.person2Impact);
    });

    it('should provide combined outlook', () => {
      const p1 = createMockProfile('甲', '子', 'wood');
      const p2 = createMockProfile('己', '丑', 'earth');

      const result = analyzeSeunCompatibility(p1, p2, 2024);

      expect(result.combinedOutlook).toBeDefined();
      expect(result.combinedOutlook.length).toBeGreaterThan(0);
    });

    it('should provide advice based on year impact', () => {
      const p1 = createMockProfile('甲', '子', 'wood');
      const p2 = createMockProfile('己', '丑', 'earth');

      const result = analyzeSeunCompatibility(p1, p2, 2024);

      expect(result.advice).toBeDefined();
      expect(result.advice.length).toBeGreaterThan(0);
    });

    it('should handle very favorable year impacts', () => {
      const p1 = createMockProfile('甲', '子', 'wood', { wood: 1 }); // Weak needs water
      const p2 = createMockProfile('乙', '丑', 'wood', { wood: 1 });

      // Test multiple years to find favorable one
      const result = analyzeSeunCompatibility(p1, p2, 2032); // Water year

      expect(result.combinedOutlook).toBeDefined();
      expect(result.advice.length).toBeGreaterThan(0);
    });

    it('should calculate consistent year data', () => {
      const p1 = createMockProfile('甲', '子', 'wood');
      const p2 = createMockProfile('己', '丑', 'earth');

      const result1 = analyzeSeunCompatibility(p1, p2, 2024);
      const result2 = analyzeSeunCompatibility(p1, p2, 2024);

      expect(result1.yearStem).toBe(result2.yearStem);
      expect(result1.yearBranch).toBe(result2.yearBranch);
      expect(result1.yearElement).toBe(result2.yearElement);
    });

    it('should handle different years correctly', () => {
      const p1 = createMockProfile('甲', '子', 'wood');
      const p2 = createMockProfile('己', '丑', 'earth');

      const result2024 = analyzeSeunCompatibility(p1, p2, 2024);
      const result2025 = analyzeSeunCompatibility(p1, p2, 2025);

      // Different years should have different stems/branches
      expect(result2024.yearStem).not.toBe(result2025.yearStem);
    });

    it('should cycle through 60-year gap-ja correctly', () => {
      const p1 = createMockProfile('甲', '子', 'wood');
      const p2 = createMockProfile('己', '丑', 'earth');

      const result1 = analyzeSeunCompatibility(p1, p2, 2024);
      const result2 = analyzeSeunCompatibility(p1, p2, 2024 + 60);

      // 60 years later should be same stem and branch
      expect(result1.yearStem).toBe(result2.yearStem);
      expect(result1.yearBranch).toBe(result2.yearBranch);
    });

    it('should provide year element in five elements', () => {
      const p1 = createMockProfile('甲', '子', 'wood');
      const p2 = createMockProfile('己', '丑', 'earth');

      const result = analyzeSeunCompatibility(p1, p2, 2024);

      const validElements = ['wood', 'fire', 'earth', 'metal', 'water'];
      expect(validElements).toContain(result.yearElement);
    });

    it('should handle challenging years with appropriate advice', () => {
      const p1 = createMockProfile('甲', '子', 'wood', { wood: 4 }); // Strong wood
      const p2 = createMockProfile('乙', '丑', 'wood', { wood: 4 });

      // Test year that might be challenging
      const result = analyzeSeunCompatibility(p1, p2, 2028); // Metal year controls wood

      expect(result.advice).toBeDefined();
      expect(result.combinedOutlook).toBeDefined();
    });

    it('should include emojis in outlook and advice', () => {
      const p1 = createMockProfile('甲', '子', 'wood');
      const p2 = createMockProfile('己', '丑', 'earth');

      const result = analyzeSeunCompatibility(p1, p2, 2024);

      // Check that outlook contains emojis
      const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(result.combinedOutlook);
      expect(hasEmoji).toBe(true);
    });
  });

  describe('integration tests', () => {
    it('should provide comprehensive daeun analysis', () => {
      const p1 = createMockProfile('甲', '子', 'wood');
      const p2 = createMockProfile('己', '丑', 'earth');

      const result = analyzeDaeunCompatibility(p1, p2, 35, 30);

      expect(result).toMatchObject({
        person1CurrentDaeun: expect.objectContaining({
          stem: expect.any(String),
          branch: expect.any(String),
          element: expect.any(String),
          startAge: expect.any(Number),
          endAge: expect.any(Number),
          theme: expect.any(String),
        }),
        person2CurrentDaeun: expect.any(Object),
        harmonicPeriods: expect.any(Array),
        challengingPeriods: expect.any(Array),
        currentSynergy: expect.any(Number),
        futureOutlook: expect.any(String),
      });
    });

    it('should provide comprehensive seun analysis', () => {
      const p1 = createMockProfile('甲', '子', 'wood');
      const p2 = createMockProfile('己', '丑', 'earth');

      const result = analyzeSeunCompatibility(p1, p2, 2024);

      expect(result).toMatchObject({
        year: 2024,
        yearStem: expect.any(String),
        yearBranch: expect.any(String),
        yearElement: expect.any(String),
        person1Impact: expect.any(String),
        person2Impact: expect.any(String),
        combinedOutlook: expect.any(String),
        advice: expect.any(Array),
      });
    });

    it('should handle combined daeun and seun analysis', () => {
      const p1 = createMockProfile('甲', '子', 'wood');
      const p2 = createMockProfile('己', '丑', 'earth');

      const daeunResult = analyzeDaeunCompatibility(p1, p2, 35, 30);
      const seunResult = analyzeSeunCompatibility(p1, p2, 2024);

      expect(daeunResult.currentSynergy).toBeDefined();
      expect(seunResult.combinedOutlook).toBeDefined();

      // Both should provide valuable insights
      expect(daeunResult.futureOutlook.length).toBeGreaterThan(50);
      expect(seunResult.advice.length).toBeGreaterThan(0);
    });
  });
});
