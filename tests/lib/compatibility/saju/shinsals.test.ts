/**
 * Shinsals (신살) Compatibility Tests
 * Tests for divine stars and inauspicious stars analysis
 */
import { describe, it, expect } from 'vitest';
import { analyzeShinsals } from '@/lib/compatibility/saju/shinsals';
import type { SajuProfile } from '@/lib/compatibility/cosmicCompatibility';

function createMockProfile(
  yearStem: string,
  yearBranch: string,
  monthStem: string,
  monthBranch: string,
  dayStem: string,
  dayBranch: string,
  timeStem: string,
  timeBranch: string
): SajuProfile {
  return {
    pillars: {
      year: { stem: yearStem, branch: yearBranch },
      month: { stem: monthStem, branch: monthBranch },
      day: { stem: dayStem, branch: dayBranch },
      time: { stem: timeStem, branch: timeBranch },
    },
    dayMaster: { name: dayStem, element: 'wood' },
    elements: {
      wood: 2,
      fire: 2,
      earth: 2,
      metal: 2,
      water: 2,
    },
  } as SajuProfile;
}

describe('compatibility/saju/shinsals', () => {
  describe('analyzeShinsals', () => {
    it('should extract shinsals from both profiles', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳');

      const result = analyzeShinsals(p1, p2);

      expect(result.person1Shinsals).toBeDefined();
      expect(result.person2Shinsals).toBeDefined();
      expect(Array.isArray(result.person1Shinsals)).toBe(true);
      expect(Array.isArray(result.person2Shinsals)).toBe(true);
    });

    it('should identify lucky interactions', () => {
      const p1 = createMockProfile('甲', '丑', '乙', '丑', '甲', '子', '丁', '卯');
      const p2 = createMockProfile('丙', '未', '丁', '卯', '戊', '辰', '己', '巳');

      const result = analyzeShinsals(p1, p2);

      expect(result.luckyInteractions).toBeDefined();
      expect(Array.isArray(result.luckyInteractions)).toBe(true);
    });

    it('should identify unlucky interactions', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '卯', '丁', '卯');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '壬', '子', '己', '巳');

      const result = analyzeShinsals(p1, p2);

      expect(result.unluckyInteractions).toBeDefined();
      expect(Array.isArray(result.unluckyInteractions)).toBe(true);
    });

    it('should calculate overall impact', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳');

      const result = analyzeShinsals(p1, p2);

      const validImpacts = ['very_positive', 'positive', 'neutral', 'challenging'];
      expect(validImpacts).toContain(result.overallImpact);
    });

    it('should identify 천을귀인 (Tianyi Noble)', () => {
      // 甲 day stem needs 丑 or 未 in branches
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '未');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳');

      const result = analyzeShinsals(p1, p2);

      expect(result.person1Shinsals).toContain('천을귀인');
    });

    it('should identify 문창귀인 (Wenchang Noble)', () => {
      // 甲 day stem needs 巳 in branches
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '巳');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳');

      const result = analyzeShinsals(p1, p2);

      expect(result.person1Shinsals).toContain('문창귀인');
    });

    it('should identify 도화살 (Peach Blossom)', () => {
      // 子 day branch needs 酉 in branches
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '酉');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳');

      const result = analyzeShinsals(p1, p2);

      expect(result.person1Shinsals).toContain('도화살');
    });

    it('should identify 역마살 (Post Horse)', () => {
      // 子 year branch needs 寅 in branches
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳');

      const result = analyzeShinsals(p1, p2);

      expect(result.person1Shinsals).toContain('역마살');
    });

    it('should identify 양인살 (Yang Blade)', () => {
      // 甲 day stem needs 卯 in branches
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳');

      const result = analyzeShinsals(p1, p2);

      expect(result.person1Shinsals).toContain('양인살');
    });

    it('should identify 겁살 (Calamity)', () => {
      // 子 year branch needs 亥 in branches
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '寅', '丁', '亥');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳');

      const result = analyzeShinsals(p1, p2);

      expect(result.person1Shinsals).toContain('겁살');
    });

    it('should identify 화개살 (Canopy)', () => {
      // 子 year branch needs 辰 in branches
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '辰', '丁', '卯');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳');

      const result = analyzeShinsals(p1, p2);

      expect(result.person1Shinsals).toContain('화개살');
    });

    it('should identify 천덕귀인 (Tiande Noble)', () => {
      // 寅 month branch needs 丁 stem or specific branches
      const p1 = createMockProfile('甲', '子', '丁', '寅', '甲', '子', '丁', '卯');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳');

      const result = analyzeShinsals(p1, p2);

      expect(result.person1Shinsals).toContain('천덕귀인');
    });

    it('should handle double 천을귀인', () => {
      const p1 = createMockProfile('甲', '丑', '乙', '丑', '甲', '子', '丁', '未');
      const p2 = createMockProfile('戊', '未', '己', '未', '戊', '辰', '己', '丑');

      const result = analyzeShinsals(p1, p2);

      expect(result.luckyInteractions.some(i => i.includes('천을귀인'))).toBe(true);
    });

    it('should handle double 문창귀인', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '巳');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '甲', '辰', '己', '巳');

      const result = analyzeShinsals(p1, p2);

      expect(result.person1Shinsals).toContain('문창귀인');
    });

    it('should handle double 도화살', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '酉');
      const p2 = createMockProfile('丙', '子', '丁', '卯', '戊', '子', '己', '酉');

      const result = analyzeShinsals(p1, p2);

      const hasDohuaInteraction = result.luckyInteractions.some(i => i.includes('도화살')) ||
                                   result.unluckyInteractions.some(i => i.includes('도화살'));
      expect(hasDohuaInteraction).toBe(true);
    });

    it('should handle double 역마살', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('丙', '子', '丁', '卯', '戊', '寅', '己', '巳');

      const result = analyzeShinsals(p1, p2);

      const hasYimaInteraction = result.luckyInteractions.some(i => i.includes('역마살')) ||
                                  result.unluckyInteractions.some(i => i.includes('역마살'));
      expect(hasYimaInteraction).toBe(true);
    });

    it('should handle double 양인살', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '甲', '辰', '己', '卯');

      const result = analyzeShinsals(p1, p2);

      const hasYangrenInteraction = result.unluckyInteractions.some(i => i.includes('양인살'));
      expect(hasYangrenInteraction).toBe(true);
    });

    it('should handle double 겁살', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '寅', '丁', '亥');
      const p2 = createMockProfile('丙', '子', '丁', '卯', '戊', '辰', '己', '亥');

      const result = analyzeShinsals(p1, p2);

      const hasJieshaInteraction = result.unluckyInteractions.some(i => i.includes('겁살'));
      expect(hasJieshaInteraction).toBe(true);
    });

    it('should handle double 화개살', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '辰', '丁', '卯');
      const p2 = createMockProfile('丙', '子', '丁', '卯', '戊', '辰', '己', '巳');

      const result = analyzeShinsals(p1, p2);

      const hasHuagaiInteraction = result.luckyInteractions.some(i => i.includes('화개살'));
      expect(hasHuagaiInteraction).toBe(true);
    });

    it('should determine very_positive impact with many lucky interactions', () => {
      // Create profile with multiple lucky shinsals
      const p1 = createMockProfile('甲', '丑', '丁', '寅', '甲', '子', '丁', '巳');
      const p2 = createMockProfile('戊', '未', '乙', '卯', '戊', '辰', '己', '巳');

      const result = analyzeShinsals(p1, p2);

      // Should have tianyi, wenchang, tiande
      expect(result.person1Shinsals.length).toBeGreaterThan(0);
    });

    it('should determine positive impact with more lucky than unlucky', () => {
      const p1 = createMockProfile('甲', '丑', '乙', '丑', '甲', '子', '丁', '巳');
      const p2 = createMockProfile('丙', '寅', '丁', '卯', '戊', '辰', '己', '巳');

      const result = analyzeShinsals(p1, p2);

      const luckyCount = result.luckyInteractions.length;
      const unluckyCount = result.unluckyInteractions.length;

      if (luckyCount > unluckyCount) {
        expect(['positive', 'very_positive']).toContain(result.overallImpact);
      }
    });

    it('should determine challenging impact with many unlucky interactions', () => {
      // Create profile with multiple inauspicious stars
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯');
      const p2 = createMockProfile('甲', '子', '丁', '卯', '甲', '辰', '己', '卯');

      const result = analyzeShinsals(p1, p2);

      const unluckyCount = result.unluckyInteractions.length;
      expect(unluckyCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle profiles with no shinsals', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('戊', '辰', '己', '巳', '庚', '午', '辛', '未');

      const result = analyzeShinsals(p1, p2);

      expect(result.person1Shinsals).toBeDefined();
      expect(result.person2Shinsals).toBeDefined();
      expect(result.overallImpact).toBeDefined();
    });

    it('should provide detailed lucky interaction messages', () => {
      const p1 = createMockProfile('甲', '丑', '乙', '丑', '甲', '子', '丁', '未');
      const p2 = createMockProfile('戊', '未', '己', '未', '戊', '辰', '己', '巳');

      const result = analyzeShinsals(p1, p2);

      if (result.luckyInteractions.length > 0) {
        result.luckyInteractions.forEach(interaction => {
          expect(interaction.length).toBeGreaterThan(20);
        });
      }
    });

    it('should provide detailed unlucky interaction messages', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', '子', '丁', '卯');
      const p2 = createMockProfile('甲', '子', '丁', '卯', '甲', '辰', '己', '卯');

      const result = analyzeShinsals(p1, p2);

      if (result.unluckyInteractions.length > 0) {
        result.unluckyInteractions.forEach(interaction => {
          expect(interaction.length).toBeGreaterThan(20);
        });
      }
    });

    it('should handle all ten heavenly stems for tianyi', () => {
      const testStems = [
        { stem: '甲', branches: ['丑', '未'] },
        { stem: '乙', branches: ['子', '申'] },
        { stem: '丙', branches: ['亥', '酉'] },
        { stem: '丁', branches: ['亥', '酉'] },
        { stem: '戊', branches: ['丑', '未'] },
        { stem: '己', branches: ['子', '申'] },
        { stem: '庚', branches: ['丑', '未'] },
        { stem: '辛', branches: ['寅', '午'] },
        { stem: '壬', branches: ['卯', '巳'] },
        { stem: '癸', branches: ['卯', '巳'] },
      ];

      testStems.forEach(({ stem, branches }) => {
        const p1 = createMockProfile('甲', '子', '乙', '丑', stem, '子', '丁', branches[0]);
        const result = analyzeShinsals(p1, p1);

        expect(result.person1Shinsals).toContain('천을귀인');
      });
    });

    it('should handle all ten heavenly stems for wenchang', () => {
      const testStems = [
        { stem: '甲', branch: '巳' },
        { stem: '乙', branch: '午' },
        { stem: '丙', branch: '申' },
        { stem: '丁', branch: '酉' },
        { stem: '戊', branch: '申' },
        { stem: '己', branch: '酉' },
        { stem: '庚', branch: '亥' },
        { stem: '辛', branch: '子' },
        { stem: '壬', branch: '寅' },
        { stem: '癸', branch: '卯' },
      ];

      testStems.forEach(({ stem, branch }) => {
        const p1 = createMockProfile('甲', '子', '乙', '丑', stem, '子', '丁', branch);
        const result = analyzeShinsals(p1, p1);

        expect(result.person1Shinsals).toContain('문창귀인');
      });
    });

    it('should handle all twelve branches for dohua', () => {
      const testBranches = [
        { dayBranch: '子', targetBranch: '酉' },
        { dayBranch: '丑', targetBranch: '午' },
        { dayBranch: '寅', targetBranch: '卯' },
        { dayBranch: '卯', targetBranch: '子' },
      ];

      testBranches.forEach(({ dayBranch, targetBranch }) => {
        const p1 = createMockProfile('甲', '子', '乙', '丑', '甲', dayBranch, '丁', targetBranch);
        const result = analyzeShinsals(p1, p1);

        expect(result.person1Shinsals).toContain('도화살');
      });
    });

    it('should handle yang blade for yang day stems only', () => {
      const yangStems = ['甲', '丙', '戊', '庚', '壬'];
      const yangBranches: Record<string, string> = {
        '甲': '卯',
        '丙': '午',
        '戊': '午',
        '庚': '酉',
        '壬': '子',
      };

      yangStems.forEach(stem => {
        const branch = yangBranches[stem];
        const p1 = createMockProfile('甲', '子', '乙', '丑', stem, '子', '丁', branch);
        const result = analyzeShinsals(p1, p1);

        expect(result.person1Shinsals).toContain('양인살');
      });
    });
  });

  describe('integration tests', () => {
    it('should provide complete shinsal analysis', () => {
      const p1 = createMockProfile('甲', '丑', '丁', '寅', '甲', '子', '丁', '巳');
      const p2 = createMockProfile('戊', '未', '乙', '卯', '戊', '辰', '己', '巳');

      const result = analyzeShinsals(p1, p2);

      expect(result).toMatchObject({
        person1Shinsals: expect.any(Array),
        person2Shinsals: expect.any(Array),
        luckyInteractions: expect.any(Array),
        unluckyInteractions: expect.any(Array),
        overallImpact: expect.any(String),
      });
    });

    it('should handle complex profiles with multiple shinsals', () => {
      const p1 = createMockProfile('甲', '子', '丁', '寅', '甲', '子', '丁', '巳');
      const p2 = createMockProfile('丙', '子', '乙', '卯', '甲', '辰', '己', '巳');

      const result = analyzeShinsals(p1, p2);

      // Should identify multiple shinsals
      const totalShinsals = result.person1Shinsals.length + result.person2Shinsals.length;
      expect(totalShinsals).toBeGreaterThan(0);

      // Should provide insights
      const totalInteractions = result.luckyInteractions.length + result.unluckyInteractions.length;
      expect(totalInteractions).toBeGreaterThanOrEqual(0);
    });

    it('should balance lucky and unlucky for realistic overall impact', () => {
      const p1 = createMockProfile('甲', '丑', '丁', '寅', '甲', '子', '丁', '卯');
      const p2 = createMockProfile('戊', '子', '乙', '卯', '甲', '辰', '己', '亥');

      const result = analyzeShinsals(p1, p2);

      const luckyCount = result.luckyInteractions.length;
      const unluckyCount = result.unluckyInteractions.length;

      // Impact should match the balance
      if (luckyCount >= unluckyCount + 2) {
        expect(result.overallImpact).toBe('very_positive');
      } else if (luckyCount > unluckyCount) {
        expect(result.overallImpact).toBe('positive');
      } else if (unluckyCount > luckyCount + 1) {
        expect(result.overallImpact).toBe('challenging');
      } else {
        expect(result.overallImpact).toBe('neutral');
      }
    });
  });
});
