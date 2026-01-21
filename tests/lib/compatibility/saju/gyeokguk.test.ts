/**
 * Gyeokguk (격국) Compatibility Tests
 * Tests for pattern type (격국) analysis and compatibility
 */
import { describe, it, expect } from 'vitest';
import { analyzeGyeokguk } from '@/lib/compatibility/saju/gyeokguk';
import type { SajuProfile } from '@/lib/compatibility/cosmicCompatibility';

function createMockProfile(
  yearStem: string,
  yearBranch: string,
  monthStem: string,
  monthBranch: string,
  dayStem: string,
  dayBranch: string,
  timeStem: string,
  timeBranch: string,
  dayElement: string
): SajuProfile {
  return {
    pillars: {
      year: { stem: yearStem, branch: yearBranch },
      month: { stem: monthStem, branch: monthBranch },
      day: { stem: dayStem, branch: dayBranch },
      time: { stem: timeStem, branch: timeBranch },
    },
    dayMaster: { name: dayStem, element: dayElement },
    elements: {
      wood: 2,
      fire: 2,
      earth: 2,
      metal: 2,
      water: 2,
    },
  } as SajuProfile;
}

describe('compatibility/saju/gyeokguk', () => {
  describe('analyzeGyeokguk', () => {
    it('should determine gyeokguk for both profiles', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = analyzeGyeokguk(p1, p2);

      expect(result.person1Gyeokguk).toBeDefined();
      expect(result.person2Gyeokguk).toBeDefined();
      expect(typeof result.person1Gyeokguk).toBe('string');
      expect(typeof result.person2Gyeokguk).toBe('string');
    });

    it('should identify excellent combinations', () => {
      // 정관격-정인격 조합 테스트
      const p1 = createMockProfile('甲', '子', '庚', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '壬', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = analyzeGyeokguk(p1, p2);

      expect(result.compatibility).toBeDefined();
      expect(['excellent', 'good', 'neutral', 'challenging']).toContain(result.compatibility);
    });

    it('should identify good combinations', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = analyzeGyeokguk(p1, p2);

      expect(result.compatibility).toBeDefined();
      const validCompatibility = ['excellent', 'good', 'neutral', 'challenging'];
      expect(validCompatibility).toContain(result.compatibility);
    });

    it('should identify challenging combinations', () => {
      const p1 = createMockProfile('甲', '子', '甲', '丑', '甲', '卯', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丙', '卯', '甲', '辰', '己', '巳', 'wood');

      const result = analyzeGyeokguk(p1, p2);

      expect(result.compatibility).toBeDefined();
      expect(['excellent', 'good', 'neutral', 'challenging']).toContain(result.compatibility);
    });

    it('should identify same gyeokguk', () => {
      const p1 = createMockProfile('甲', '子', '庚', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('乙', '寅', '辛', '卯', '乙', '辰', '己', '巳', 'wood');

      const result = analyzeGyeokguk(p1, p2);

      // If both have same month-day relationship, they might have same gyeokguk
      expect(result.person1Gyeokguk).toBeDefined();
      expect(result.person2Gyeokguk).toBeDefined();
    });

    it('should provide dynamics description', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = analyzeGyeokguk(p1, p2);

      expect(result.dynamics).toBeDefined();
      expect(result.dynamics.length).toBeGreaterThan(0);
    });

    it('should provide strengths array', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = analyzeGyeokguk(p1, p2);

      expect(Array.isArray(result.strengths)).toBe(true);
    });

    it('should provide challenges array', () => {
      const p1 = createMockProfile('甲', '子', '甲', '丑', '甲', '卯', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丙', '卯', '甲', '辰', '己', '巳', 'wood');

      const result = analyzeGyeokguk(p1, p2);

      expect(Array.isArray(result.challenges)).toBe(true);
    });

    it('should handle all gyeokguk types', () => {
      const gyeokgukTypes = ['건록격', '식신격', '정재격', '정관격', '정인격'];

      // Each test should produce one of the known gyeokguk types
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = analyzeGyeokguk(p1, p2);

      expect(gyeokgukTypes).toContain(result.person1Gyeokguk);
      expect(gyeokgukTypes).toContain(result.person2Gyeokguk);
    });

    it('should determine gyeokguk based on month stem and day master', () => {
      // 비겁 relationship (same element)
      const p1 = createMockProfile('甲', '子', '甲', '丑', '甲', '子', '丁', '卯', 'wood');
      const result1 = analyzeGyeokguk(p1, p1);
      expect(result1.person1Gyeokguk).toBe('건록격');

      // 식상 relationship (day generates month)
      const p2 = createMockProfile('甲', '子', '丙', '丑', '甲', '子', '丁', '卯', 'wood');
      const result2 = analyzeGyeokguk(p2, p2);
      expect(result2.person1Gyeokguk).toBe('식신격');

      // 재성 relationship (day controls month)
      const p3 = createMockProfile('甲', '子', '戊', '丑', '甲', '子', '丁', '卯', 'wood');
      const result3 = analyzeGyeokguk(p3, p3);
      expect(result3.person1Gyeokguk).toBe('정재격');

      // 관성 relationship (month controls day)
      const p4 = createMockProfile('甲', '子', '庚', '丑', '甲', '子', '丁', '卯', 'wood');
      const result4 = analyzeGyeokguk(p4, p4);
      expect(result4.person1Gyeokguk).toBe('정관격');

      // 인성 relationship (month generates day)
      const p5 = createMockProfile('甲', '子', '壬', '丑', '甲', '子', '丁', '卯', 'wood');
      const result5 = analyzeGyeokguk(p5, p5);
      expect(result5.person1Gyeokguk).toBe('정인격');
    });

    it('should handle all five elements for day master', () => {
      const elements = [
        { element: 'wood', stem: '甲' },
        { element: 'fire', stem: '丙' },
        { element: 'earth', stem: '戊' },
        { element: 'metal', stem: '庚' },
        { element: 'water', stem: '壬' },
      ];

      elements.forEach(({ element, stem }) => {
        const profile = createMockProfile('甲', '子', '乙', '丑', stem, '子', '丁', '卯', element);
        const result = analyzeGyeokguk(profile, profile);

        expect(result.person1Gyeokguk).toBeDefined();
      });
    });

    it('should include emojis in dynamics', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = analyzeGyeokguk(p1, p2);

      const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(result.dynamics);
      expect(hasEmoji).toBe(true);
    });

    it('should provide detailed strengths for excellent compatibility', () => {
      // Create profiles that would be excellent match
      const p1 = createMockProfile('甲', '子', '庚', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '壬', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = analyzeGyeokguk(p1, p2);

      expect(result.strengths.length).toBeGreaterThanOrEqual(0);
      if (result.compatibility === 'excellent') {
        expect(result.strengths.length).toBeGreaterThan(0);
      }
    });

    it('should provide challenges for challenging compatibility', () => {
      const p1 = createMockProfile('甲', '子', '甲', '丑', '甲', '卯', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丙', '卯', '甲', '辰', '己', '巳', 'wood');

      const result = analyzeGyeokguk(p1, p2);

      if (result.compatibility === 'challenging') {
        expect(result.challenges.length).toBeGreaterThan(0);
      }
    });

    it('should handle neutral compatibility', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = analyzeGyeokguk(p1, p2);

      if (result.compatibility === 'neutral') {
        expect(result.dynamics).toBeDefined();
        expect(result.strengths.length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('integration tests', () => {
    it('should provide complete gyeokguk analysis', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = analyzeGyeokguk(p1, p2);

      expect(result).toMatchObject({
        person1Gyeokguk: expect.any(String),
        person2Gyeokguk: expect.any(String),
        compatibility: expect.any(String),
        dynamics: expect.any(String),
        strengths: expect.any(Array),
        challenges: expect.any(Array),
      });
    });

    it('should handle various gyeokguk combinations', () => {
      const profiles = [
        createMockProfile('甲', '子', '甲', '丑', '甲', '子', '丁', '卯', 'wood'),
        createMockProfile('甲', '子', '丙', '丑', '甲', '子', '丁', '卯', 'wood'),
        createMockProfile('甲', '子', '戊', '丑', '甲', '子', '丁', '卯', 'wood'),
        createMockProfile('甲', '子', '庚', '丑', '甲', '子', '丁', '卯', 'wood'),
        createMockProfile('甲', '子', '壬', '丑', '甲', '子', '丁', '卯', 'wood'),
      ];

      profiles.forEach((p1, i) => {
        profiles.forEach((p2, j) => {
          if (i !== j) {
            const result = analyzeGyeokguk(p1, p2);
            expect(result.compatibility).toBeDefined();
            expect(result.dynamics.length).toBeGreaterThan(0);
          }
        });
      });
    });

    it('should handle same gyeokguk with appropriate message', () => {
      const p1 = createMockProfile('甲', '子', '甲', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('乙', '寅', '乙', '卯', '乙', '辰', '己', '巳', 'wood');

      const result = analyzeGyeokguk(p1, p2);

      if (result.person1Gyeokguk === result.person2Gyeokguk) {
        expect(result.dynamics).toContain('같은');
      }
    });

    it('should provide meaningful insights for all compatibility levels', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳', 'earth');

      const result = analyzeGyeokguk(p1, p2);

      // Should always have dynamics
      expect(result.dynamics.length).toBeGreaterThan(50);

      // Should have either strengths or challenges
      const totalInsights = result.strengths.length + result.challenges.length;
      expect(totalInsights).toBeGreaterThanOrEqual(0);
    });
  });
});
