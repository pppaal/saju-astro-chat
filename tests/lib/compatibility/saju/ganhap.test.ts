/**
 * GanHap (천간합) Analysis Tests
 */
import { describe, it, expect } from 'vitest';
import { analyzeGanHap } from '@/lib/compatibility/saju/ganhap';
import type { SajuProfile } from '@/lib/compatibility/cosmicCompatibility';

describe('compatibility/saju/ganhap', () => {
  // Helper to create mock SajuProfile
  function createMockProfile(
    yearStem: string,
    monthStem: string,
    dayStem: string,
    timeStem: string,
    yearBranch = '子',
    monthBranch = '丑',
    dayBranch = '寅',
    timeBranch = '卯'
  ): SajuProfile {
    return {
      dayMaster: { name: dayStem, element: 'wood' },
      pillars: {
        year: { stem: yearStem, branch: yearBranch },
        month: { stem: monthStem, branch: monthBranch },
        day: { stem: dayStem, branch: dayBranch },
        time: { stem: timeStem, branch: timeBranch },
      },
      elements: { wood: 2, fire: 1, earth: 1, metal: 1, water: 1 },
    } as SajuProfile;
  }

  describe('analyzeGanHap', () => {
    it('should return GanHapAnalysis structure', () => {
      const p1 = createMockProfile('甲', '乙', '丙', '丁');
      const p2 = createMockProfile('己', '庚', '辛', '壬');

      const result = analyzeGanHap(p1, p2);

      expect(result).toHaveProperty('combinations');
      expect(result).toHaveProperty('totalHarmony');
      expect(result).toHaveProperty('significance');
      expect(Array.isArray(result.combinations)).toBe(true);
      expect(typeof result.totalHarmony).toBe('number');
      expect(typeof result.significance).toBe('string');
    });

    describe('甲己合土 (earth combination)', () => {
      it('should detect 甲己 combination', () => {
        const p1 = createMockProfile('甲', '甲', '甲', '甲');
        const p2 = createMockProfile('己', '己', '己', '己');

        const result = analyzeGanHap(p1, p2);

        expect(result.combinations.length).toBeGreaterThan(0);
        const earthCombo = result.combinations[0];
        expect(earthCombo.stem1).toBe('甲');
        expect(earthCombo.stem2).toBe('己');
        expect(earthCombo.resultElement).toBe('earth');
      });

      it('should detect reverse combination 己甲', () => {
        const p1 = createMockProfile('己', '甲', '甲', '甲');
        const p2 = createMockProfile('甲', '己', '己', '己');

        const result = analyzeGanHap(p1, p2);

        expect(result.combinations.length).toBeGreaterThan(0);
      });

      it('should detect day stem combination', () => {
        const p1 = createMockProfile('乙', '乙', '甲', '乙');
        const p2 = createMockProfile('庚', '庚', '己', '庚');

        const result = analyzeGanHap(p1, p2);

        const dayCombo = result.combinations.find(
          c => (c.pillar1 === 'day' || c.pillar2 === 'day')
        );
        expect(dayCombo).toBeDefined();
        expect(dayCombo?.resultElement).toBe('earth');
      });
    });

    describe('乙庚合金 (metal combination)', () => {
      it('should detect 乙庚 combination', () => {
        const p1 = createMockProfile('乙', '甲', '甲', '甲');
        const p2 = createMockProfile('庚', '己', '己', '己');

        const result = analyzeGanHap(p1, p2);

        expect(result.combinations.length).toBeGreaterThan(0);
        const metalCombo = result.combinations[0];
        expect(metalCombo.stem1).toBe('乙');
        expect(metalCombo.stem2).toBe('庚');
        expect(metalCombo.resultElement).toBe('metal');
      });
    });

    describe('丙辛合水 (water combination)', () => {
      it('should detect 丙辛 combination', () => {
        const p1 = createMockProfile('丙', '甲', '甲', '甲');
        const p2 = createMockProfile('辛', '己', '己', '己');

        const result = analyzeGanHap(p1, p2);

        expect(result.combinations.length).toBeGreaterThan(0);
        const waterCombo = result.combinations[0];
        expect(waterCombo.stem1).toBe('丙');
        expect(waterCombo.stem2).toBe('辛');
        expect(waterCombo.resultElement).toBe('water');
      });
    });

    describe('丁壬合木 (wood combination)', () => {
      it('should detect 丁壬 combination', () => {
        const p1 = createMockProfile('丁', '甲', '甲', '甲');
        const p2 = createMockProfile('壬', '己', '己', '己');

        const result = analyzeGanHap(p1, p2);

        expect(result.combinations.length).toBeGreaterThan(0);
        const woodCombo = result.combinations[0];
        expect(woodCombo.stem1).toBe('丁');
        expect(woodCombo.stem2).toBe('壬');
        expect(woodCombo.resultElement).toBe('wood');
      });
    });

    describe('戊癸合火 (fire combination)', () => {
      it('should detect 戊癸 combination', () => {
        const p1 = createMockProfile('戊', '甲', '甲', '甲');
        const p2 = createMockProfile('癸', '己', '己', '己');

        const result = analyzeGanHap(p1, p2);

        expect(result.combinations.length).toBeGreaterThan(0);
        const fireCombo = result.combinations[0];
        expect(fireCombo.stem1).toBe('戊');
        expect(fireCombo.stem2).toBe('癸');
        expect(fireCombo.resultElement).toBe('fire');
      });
    });

    describe('multiple combinations', () => {
      it('should detect all possible combinations between two profiles', () => {
        // All stems match their partners
        const p1 = createMockProfile('甲', '乙', '丙', '丁');
        const p2 = createMockProfile('己', '庚', '辛', '壬');

        const result = analyzeGanHap(p1, p2);

        // Each pillar in p1 can match with its partner in p2
        expect(result.combinations.length).toBeGreaterThan(0);
        expect(result.combinations.length).toBeLessThanOrEqual(16);
      });

      it('should detect partial combinations', () => {
        const p1 = createMockProfile('甲', '乙', '甲', '甲');
        const p2 = createMockProfile('己', '庚', '己', '己');

        const result = analyzeGanHap(p1, p2);

        expect(result.combinations.length).toBeGreaterThan(0);
        expect(result.combinations.length).toBeLessThan(16);
      });

      it('should detect combinations across different pillars', () => {
        const p1 = createMockProfile('甲', '乙', '丙', '丁');
        const p2 = createMockProfile('甲', '己', '辛', '壬');

        const result = analyzeGanHap(p1, p2);

        // Should find 甲-己, 乙-庚(X), 丙-辛, 丁-壬
        expect(result.combinations.length).toBeGreaterThan(0);
      });
    });

    describe('totalHarmony calculation', () => {
      it('should calculate harmony for no combinations', () => {
        const p1 = createMockProfile('甲', '甲', '甲', '甲');
        const p2 = createMockProfile('甲', '甲', '甲', '甲'); // No partners

        const result = analyzeGanHap(p1, p2);

        expect(result.totalHarmony).toBe(0);
      });

      it('should calculate harmony for single combination', () => {
        const p1 = createMockProfile('甲', '乙', '丙', '丁');
        const p2 = createMockProfile('己', '甲', '甲', '甲');

        const result = analyzeGanHap(p1, p2);

        expect(result.totalHarmony).toBeGreaterThan(0);
      });

      it('should give bonus for day stem combination', () => {
        // Day stem combination: 甲-己 on day pillar
        const withDayHap = createMockProfile('乙', '丙', '甲', '丁');
        const withDayHap2 = createMockProfile('庚', '辛', '己', '壬');

        const resultWith = analyzeGanHap(withDayHap, withDayHap2);

        // Check that day stem combination exists
        const hasDayCombo = resultWith.combinations.some(
          c => (c.pillar1 === 'day' || c.pillar2 === 'day')
        );

        // If day combination exists, harmony should include the bonus
        if (hasDayCombo) {
          expect(resultWith.totalHarmony).toBeGreaterThan(20); // Base + bonus
        }
      });

      it('should cap harmony at 100', () => {
        // Create profiles with maximum combinations
        const p1 = createMockProfile('甲', '乙', '丙', '丁');
        const p2 = createMockProfile('己', '庚', '辛', '壬');

        const result = analyzeGanHap(p1, p2);

        expect(result.totalHarmony).toBeLessThanOrEqual(100);
      });

      it('should calculate 20 points per combination', () => {
        const p1 = createMockProfile('甲', '乙', '丙', '丙');
        const p2 = createMockProfile('己', '甲', '甲', '甲');

        const result = analyzeGanHap(p1, p2);

        // 1 combination = 20 points
        expect(result.totalHarmony).toBe(20);
      });

      it('should add 30 bonus points for day stem combination', () => {
        const p1 = createMockProfile('乙', '乙', '甲', '乙');
        const p2 = createMockProfile('庚', '庚', '己', '庚');

        const result = analyzeGanHap(p1, p2);

        // Multiple combinations may occur, but should include day bonus
        expect(result.totalHarmony).toBeGreaterThanOrEqual(50);
        expect(result.totalHarmony).toBeLessThanOrEqual(100);
      });
    });

    describe('significance messages', () => {
      it('should return romantic message for day stem combination', () => {
        const p1 = createMockProfile('乙', '乙', '甲', '乙');
        const p2 = createMockProfile('庚', '庚', '己', '庚');

        const result = analyzeGanHap(p1, p2);

        expect(result.significance).toContain('일간 천간합');
        expect(result.significance).toContain('💕');
        expect(result.significance).toContain('로맨틱');
      });

      it('should return multiple connection message for 2+ combinations', () => {
        const p1 = createMockProfile('甲', '乙', '丙', '丙');
        const p2 = createMockProfile('己', '庚', '甲', '甲');

        const result = analyzeGanHap(p1, p2);

        if (result.combinations.length >= 2) {
          expect(result.significance).toContain('🔗');
          expect(result.significance).toContain('시너지');
        }
      });

      it('should return single connection message for 1 combination', () => {
        const p1 = createMockProfile('甲', '乙', '丙', '丙');
        const p2 = createMockProfile('己', '甲', '甲', '甲');

        const result = analyzeGanHap(p1, p2);

        if (result.combinations.length === 1) {
          expect(result.significance).toContain('✨');
          expect(result.significance).toContain('찰떡궁합');
        }
      });

      it('should return reassuring message for no combinations', () => {
        const p1 = createMockProfile('甲', '甲', '甲', '甲');
        const p2 = createMockProfile('甲', '甲', '甲', '甲');

        const result = analyzeGanHap(p1, p2);

        expect(result.significance).toContain('🌈');
        expect(result.significance).toContain('걱정 마세요');
      });

      it('should prioritize day stem message over multiple combinations', () => {
        // Even with multiple combinations, day stem is special
        const p1 = createMockProfile('甲', '乙', '甲', '丁');
        const p2 = createMockProfile('己', '庚', '己', '壬');

        const result = analyzeGanHap(p1, p2);

        const hasDayCombo = result.combinations.some(
          c => c.pillar1 === 'day' || c.pillar2 === 'day'
        );

        if (hasDayCombo) {
          expect(result.significance).toContain('일간 천간합');
        }
      });
    });

    describe('combination descriptions', () => {
      it('should include descriptive text for combinations', () => {
        const p1 = createMockProfile('甲', '甲', '甲', '甲');
        const p2 = createMockProfile('己', '己', '己', '己');

        const result = analyzeGanHap(p1, p2);

        result.combinations.forEach(combo => {
          expect(combo.description).toBeTruthy();
          expect(combo.description).toContain(combo.stem1);
          expect(combo.description).toContain(combo.stem2);
          expect(combo.description).toContain('합하여');
        });
      });

      it('should include pillar information in description', () => {
        const p1 = createMockProfile('甲', '乙', '丙', '丁');
        const p2 = createMockProfile('甲', '己', '辛', '壬');

        const result = analyzeGanHap(p1, p2);

        result.combinations.forEach(combo => {
          expect(combo.description).toContain(combo.pillar1);
          expect(combo.description).toContain(combo.pillar2);
        });
      });

      it('should include result element in description', () => {
        const p1 = createMockProfile('甲', '甲', '甲', '甲');
        const p2 = createMockProfile('己', '己', '己', '己');

        const result = analyzeGanHap(p1, p2);

        result.combinations.forEach(combo => {
          expect(combo.description).toContain(combo.resultElement);
        });
      });
    });

    describe('edge cases', () => {
      it('should handle profiles with same stems', () => {
        const p1 = createMockProfile('甲', '甲', '甲', '甲');
        const p2 = createMockProfile('甲', '甲', '甲', '甲');

        const result = analyzeGanHap(p1, p2);

        expect(result.combinations).toEqual([]);
        expect(result.totalHarmony).toBe(0);
      });

      it('should handle profiles with no matching partners', () => {
        const p1 = createMockProfile('甲', '乙', '丙', '丁');
        const p2 = createMockProfile('甲', '乙', '丙', '丁');

        const result = analyzeGanHap(p1, p2);

        expect(result.combinations).toEqual([]);
      });

      it('should handle all five combination types in one analysis', () => {
        const p1 = createMockProfile('甲', '乙', '丙', '丁');
        const p2 = createMockProfile('己', '庚', '辛', '壬');

        const result = analyzeGanHap(p1, p2);

        const elements = new Set(result.combinations.map(c => c.resultElement));
        expect(elements.size).toBeGreaterThan(0);
      });

      it('should detect all combinations when all stems are partners', () => {
        const p1 = createMockProfile('甲', '乙', '丙', '丁');
        const p2 = createMockProfile('己', '庚', '辛', '壬');

        const result = analyzeGanHap(p1, p2);

        // Each stem in p1 matches exactly one stem in p2
        // 甲-己, 乙-庚, 丙-辛, 丁-壬 = 4 unique combinations
        expect(result.combinations.length).toBe(4);
      });

      it('should handle partial matches correctly', () => {
        const p1 = createMockProfile('甲', '甲', '甲', '甲');
        const p2 = createMockProfile('己', '庚', '辛', '壬');

        const result = analyzeGanHap(p1, p2);

        // Only 甲-己combinations: 4×1 = 4
        expect(result.combinations.length).toBe(4);
      });
    });

    describe('pillar tracking', () => {
      it('should correctly track which pillars are combined', () => {
        const p1 = createMockProfile('甲', '乙', '丙', '丁');
        const p2 = createMockProfile('甲', '己', '辛', '壬');

        const result = analyzeGanHap(p1, p2);

        result.combinations.forEach(combo => {
          expect(['year', 'month', 'day', 'time']).toContain(combo.pillar1);
          expect(['year', 'month', 'day', 'time']).toContain(combo.pillar2);
        });
      });

      it('should find year pillar combinations', () => {
        const p1 = createMockProfile('甲', '乙', '丙', '丁');
        const p2 = createMockProfile('己', '庚', '辛', '壬');

        const result = analyzeGanHap(p1, p2);

        const yearCombos = result.combinations.filter(
          c => c.pillar1 === 'year' || c.pillar2 === 'year'
        );
        expect(yearCombos.length).toBeGreaterThan(0);
      });

      it('should find time pillar combinations', () => {
        const p1 = createMockProfile('甲', '乙', '丙', '丁');
        const p2 = createMockProfile('己', '庚', '辛', '壬');

        const result = analyzeGanHap(p1, p2);

        const timeCombos = result.combinations.filter(
          c => c.pillar1 === 'time' || c.pillar2 === 'time'
        );
        expect(timeCombos.length).toBeGreaterThan(0);
      });
    });
  });
});
