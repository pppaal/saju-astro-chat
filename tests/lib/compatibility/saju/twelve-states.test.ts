/**
 * Twelve States (12운성) Compatibility Tests
 * Tests for twelve life stages analysis and energy compatibility
 */
import { describe, it, expect } from 'vitest';
import { analyzeTwelveStates } from '@/lib/compatibility/saju/twelve-states';
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

describe('compatibility/saju/twelve-states', () => {
  describe('analyzeTwelveStates', () => {
    it('should calculate twelve states for both profiles', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '寅', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '巳', '己', '巳', 'earth');

      const result = analyzeTwelveStates(p1, p2);

      expect(result.person1States).toBeDefined();
      expect(result.person2States).toBeDefined();
      expect(Array.isArray(result.person1States)).toBe(true);
      expect(Array.isArray(result.person2States)).toBe(true);
    });

    it('should calculate states for all four pillars', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '寅', '丁', '卯', 'wood');

      const result = analyzeTwelveStates(p1, p1);

      expect(result.person1States.length).toBe(4);
      const pillars = result.person1States.map(s => s.pillar);
      expect(pillars).toContain('year');
      expect(pillars).toContain('month');
      expect(pillars).toContain('day');
      expect(pillars).toContain('time');
    });

    it('should identify strong states', () => {
      // Wood in 寅 (건록) - strong
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '寅', '丁', '卯', 'wood');

      const result = analyzeTwelveStates(p1, p1);

      const dayState = result.person1States.find(s => s.pillar === 'day');
      expect(dayState).toBeDefined();
      expect(dayState?.state).toBe('건록');
    });

    it('should identify weak states', () => {
      // Wood in 午 (사) - weak
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '午', '丁', '卯', 'wood');

      const result = analyzeTwelveStates(p1, p1);

      const dayState = result.person1States.find(s => s.pillar === 'day');
      expect(dayState).toBeDefined();
      expect(dayState?.state).toBe('사');
    });

    it('should calculate energy compatibility for strong-strong combination', () => {
      // Both wood in strong positions
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '寅', '丁', '卯', 'wood');
      const p2 = createMockProfile('甲', '子', '乙', '丑', '甲', '卯', '丁', '卯', 'wood');

      const result = analyzeTwelveStates(p1, p2);

      expect(result.energyCompatibility).toBeGreaterThan(50);
      expect(result.energyCompatibility).toBeLessThanOrEqual(100);
    });

    it('should calculate energy compatibility for weak-weak combination', () => {
      // Both wood in weak positions
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '午', '丁', '卯', 'wood');
      const p2 = createMockProfile('甲', '子', '乙', '丑', '甲', '巳', '丁', '卯', 'wood');

      const result = analyzeTwelveStates(p1, p2);

      expect(result.energyCompatibility).toBeGreaterThan(0);
      expect(result.energyCompatibility).toBeLessThanOrEqual(100);
    });

    it('should calculate energy compatibility for strong-weak combination', () => {
      // One strong, one weak
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '寅', '丁', '卯', 'wood');
      const p2 = createMockProfile('甲', '子', '乙', '丑', '甲', '午', '丁', '卯', 'wood');

      const result = analyzeTwelveStates(p1, p2);

      expect(result.energyCompatibility).toBeGreaterThan(50);
      expect(result.energyCompatibility).toBeLessThanOrEqual(100);
    });

    it('should provide interpretation array', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '寅', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '巳', '己', '巳', 'earth');

      const result = analyzeTwelveStates(p1, p2);

      expect(Array.isArray(result.interpretation)).toBe(true);
      expect(result.interpretation.length).toBeGreaterThan(0);
    });

    it('should include day master names in interpretation', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '寅', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '巳', '己', '巳', 'earth');

      const result = analyzeTwelveStates(p1, p2);

      const allInterpretation = result.interpretation.join(' ');
      expect(allInterpretation).toContain('甲');
      expect(allInterpretation).toContain('戊');
    });

    it('should handle all twelve states', () => {
      const twelveStates = [
        '장생', '목욕', '관대', '건록', '제왕', '쇠',
        '병', '사', '묘', '절', '태', '양',
      ];

      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '寅', '丁', '卯', 'wood');

      const result = analyzeTwelveStates(p1, p1);

      result.person1States.forEach(state => {
        expect(twelveStates).toContain(state.state);
      });
    });

    it('should include state meanings', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '寅', '丁', '卯', 'wood');

      const result = analyzeTwelveStates(p1, p1);

      result.person1States.forEach(state => {
        expect(state.meaning).toBeDefined();
        expect(state.meaning.length).toBeGreaterThan(0);
      });
    });

    it('should handle all five elements', () => {
      const elements = [
        { element: 'wood', stem: '甲', branch: '寅' },
        { element: 'fire', stem: '丙', branch: '巳' },
        { element: 'earth', stem: '戊', branch: '巳' },
        { element: 'metal', stem: '庚', branch: '申' },
        { element: 'water', stem: '壬', branch: '亥' },
      ];

      elements.forEach(({ element, stem, branch }) => {
        const profile = createMockProfile('甲', '子', '乙', '丑', stem, branch, '丁', '卯', element);
        const result = analyzeTwelveStates(profile, profile);

        expect(result.person1States.length).toBe(4);
        const dayState = result.person1States.find(s => s.pillar === 'day');
        expect(dayState).toBeDefined();
      });
    });

    it('should calculate correct states for wood element', () => {
      // Wood element: 亥(장생), 子(목욕), 丑(관대), 寅(건록), 卯(제왕), 辰(쇠)
      const testCases = [
        { branch: '亥', expectedState: '장생' },
        { branch: '子', expectedState: '목욕' },
        { branch: '寅', expectedState: '건록' },
        { branch: '卯', expectedState: '제왕' },
      ];

      testCases.forEach(({ branch, expectedState }) => {
        const profile = createMockProfile('甲', '子', '乙', '丑', '甲', branch, '丁', '卯', 'wood');
        const result = analyzeTwelveStates(profile, profile);

        const dayState = result.person1States.find(s => s.pillar === 'day');
        expect(dayState?.state).toBe(expectedState);
      });
    });

    it('should calculate correct states for fire element', () => {
      // Fire element: 寅(장생), 卯(목욕), 辰(관대), 巳(건록), 午(제왕), 未(쇠)
      const testCases = [
        { branch: '寅', expectedState: '장생' },
        { branch: '巳', expectedState: '건록' },
        { branch: '午', expectedState: '제왕' },
      ];

      testCases.forEach(({ branch, expectedState }) => {
        const profile = createMockProfile('甲', '子', '乙', '丑', '丙', branch, '丁', '卯', 'fire');
        const result = analyzeTwelveStates(profile, profile);

        const dayState = result.person1States.find(s => s.pillar === 'day');
        expect(dayState?.state).toBe(expectedState);
      });
    });

    it('should calculate correct states for metal element', () => {
      // Metal element: 巳(장생), 午(목욕), 未(관대), 申(건록), 酉(제왕), 戌(쇠)
      const testCases = [
        { branch: '巳', expectedState: '장생' },
        { branch: '申', expectedState: '건록' },
        { branch: '酉', expectedState: '제왕' },
      ];

      testCases.forEach(({ branch, expectedState }) => {
        const profile = createMockProfile('甲', '子', '乙', '丑', '庚', branch, '丁', '卯', 'metal');
        const result = analyzeTwelveStates(profile, profile);

        const dayState = result.person1States.find(s => s.pillar === 'day');
        expect(dayState?.state).toBe(expectedState);
      });
    });

    it('should calculate correct states for water element', () => {
      // Water element: 申(장생), 酉(목욕), 戌(관대), 亥(건록), 子(제왕), 丑(쇠)
      const testCases = [
        { branch: '申', expectedState: '장생' },
        { branch: '亥', expectedState: '건록' },
        { branch: '子', expectedState: '제왕' },
      ];

      testCases.forEach(({ branch, expectedState }) => {
        const profile = createMockProfile('甲', '子', '乙', '丑', '壬', branch, '丁', '卯', 'water');
        const result = analyzeTwelveStates(profile, profile);

        const dayState = result.person1States.find(s => s.pillar === 'day');
        expect(dayState?.state).toBe(expectedState);
      });
    });

    it('should include emojis in interpretation', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '寅', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '巳', '己', '巳', 'earth');

      const result = analyzeTwelveStates(p1, p2);

      const allInterpretation = result.interpretation.join(' ');
      const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(allInterpretation);
      expect(hasEmoji).toBe(true);
    });

    it('should provide different interpretations based on energy levels', () => {
      // Strong-Strong
      const ss1 = createMockProfile('甲', '子', '乙', '丑', '甲', '寅', '丁', '卯', 'wood');
      const ss2 = createMockProfile('甲', '子', '乙', '丑', '甲', '卯', '丁', '卯', 'wood');
      const ssResult = analyzeTwelveStates(ss1, ss2);

      // Weak-Weak
      const ww1 = createMockProfile('甲', '子', '乙', '丑', '甲', '午', '丁', '卯', 'wood');
      const ww2 = createMockProfile('甲', '子', '乙', '丑', '甲', '巳', '丁', '卯', 'wood');
      const wwResult = analyzeTwelveStates(ww1, ww2);

      // Strong-Weak
      const sw1 = createMockProfile('甲', '子', '乙', '丑', '甲', '寅', '丁', '卯', 'wood');
      const sw2 = createMockProfile('甲', '子', '乙', '丑', '甲', '午', '丁', '卯', 'wood');
      const swResult = analyzeTwelveStates(sw1, sw2);

      // All should have different interpretations
      expect(ssResult.interpretation[0]).not.toBe(wwResult.interpretation[0]);
      expect(ssResult.interpretation[0]).not.toBe(swResult.interpretation[0]);
    });

    it('should handle neutral energy combinations', () => {
      // Neither strong nor weak
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '丑', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '未', '己', '巳', 'earth');

      const result = analyzeTwelveStates(p1, p2);

      expect(result.energyCompatibility).toBeGreaterThan(40);
      expect(result.energyCompatibility).toBeLessThan(90);
    });
  });

  describe('integration tests', () => {
    it('should provide complete twelve states analysis', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '寅', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '巳', '己', '巳', 'earth');

      const result = analyzeTwelveStates(p1, p2);

      expect(result).toMatchObject({
        person1States: expect.any(Array),
        person2States: expect.any(Array),
        energyCompatibility: expect.any(Number),
        interpretation: expect.any(Array),
      });

      expect(result.person1States.length).toBe(4);
      expect(result.person2States.length).toBe(4);
      expect(result.interpretation.length).toBeGreaterThan(0);
    });

    it('should handle all twelve states across different elements', () => {
      const twelveStates = [
        '장생', '목욕', '관대', '건록', '제왕', '쇠',
        '병', '사', '묘', '절', '태', '양',
      ];

      const foundStates = new Set<string>();

      const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

      branches.forEach(branch => {
        const profile = createMockProfile('甲', '子', '乙', '丑', '甲', branch, '丁', '卯', 'wood');
        const result = analyzeTwelveStates(profile, profile);

        result.person1States.forEach(s => foundStates.add(s.state));
      });

      // Should have found all or most states
      expect(foundStates.size).toBeGreaterThanOrEqual(10);
    });

    it('should maintain state consistency for same input', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '寅', '丁', '卯', 'wood');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '巳', '己', '巳', 'earth');

      const result1 = analyzeTwelveStates(p1, p2);
      const result2 = analyzeTwelveStates(p1, p2);

      expect(result1.person1States).toEqual(result2.person1States);
      expect(result1.person2States).toEqual(result2.person2States);
      expect(result1.energyCompatibility).toBe(result2.energyCompatibility);
    });
  });
});
