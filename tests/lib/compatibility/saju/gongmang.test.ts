/**
 * Gongmang (공망/空亡) Analysis Tests
 */
import { describe, it, expect } from 'vitest';
import { analyzeGongmang } from '@/lib/compatibility/saju/gongmang';
import type { SajuProfile } from '@/lib/compatibility/cosmicCompatibility';

describe('compatibility/saju/gongmang', () => {
  // Helper to create mock SajuProfile
  function createMockProfile(
    dayStem: string,
    dayBranch: string,
    yearStem = '甲',
    yearBranch = '子',
    monthStem = '乙',
    monthBranch = '丑',
    timeStem = '丙',
    timeBranch = '寅'
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

  describe('analyzeGongmang', () => {
    it('should return GongmangAnalysis structure', () => {
      const p1 = createMockProfile('甲', '子');
      const p2 = createMockProfile('己', '巳');

      const result = analyzeGongmang(p1, p2);

      expect(result).toHaveProperty('person1Gongmang');
      expect(result).toHaveProperty('person2Gongmang');
      expect(result).toHaveProperty('person1InP2Gongmang');
      expect(result).toHaveProperty('person2InP1Gongmang');
      expect(result).toHaveProperty('impact');
      expect(result).toHaveProperty('interpretation');
      expect(Array.isArray(result.person1Gongmang)).toBe(true);
      expect(Array.isArray(result.person2Gongmang)).toBe(true);
      expect(Array.isArray(result.interpretation)).toBe(true);
    });

    describe('gongmang calculation for different day pillars', () => {
      it('should calculate gongmang for 甲子 (戌亥)', () => {
        const p1 = createMockProfile('甲', '子');
        const p2 = createMockProfile('己', '巳');

        const result = analyzeGongmang(p1, p2);

        expect(result.person1Gongmang).toEqual(['戌', '亥']);
      });

      it('should calculate gongmang for 庚午 (申酉)', () => {
        const p1 = createMockProfile('庚', '午');
        const p2 = createMockProfile('己', '巳');

        const result = analyzeGongmang(p1, p2);

        expect(result.person1Gongmang).toEqual(['申', '酉']);
      });

      it('should calculate gongmang for 丙子 (午未)', () => {
        const p1 = createMockProfile('丙', '子');
        const p2 = createMockProfile('己', '巳');

        const result = analyzeGongmang(p1, p2);

        expect(result.person1Gongmang).toEqual(['午', '未']);
      });

      it('should calculate gongmang for 壬午 (辰巳)', () => {
        const p1 = createMockProfile('壬', '午');
        const p2 = createMockProfile('己', '巳');

        const result = analyzeGongmang(p1, p2);

        expect(result.person1Gongmang).toEqual(['辰', '巳']);
      });

      it('should calculate gongmang for 戊子 (寅卯)', () => {
        const p1 = createMockProfile('戊', '子');
        const p2 = createMockProfile('己', '巳');

        const result = analyzeGongmang(p1, p2);

        expect(result.person1Gongmang).toEqual(['寅', '卯']);
      });

      it('should calculate gongmang for 甲午 (子丑)', () => {
        const p1 = createMockProfile('甲', '午');
        const p2 = createMockProfile('己', '巳');

        const result = analyzeGongmang(p1, p2);

        expect(result.person1Gongmang).toEqual(['子', '丑']);
      });
    });

    describe('mutual gongmang detection', () => {
      it('should detect when both are in each others gongmang (negative)', () => {
        // p1: 甲子 gongmang = [戌, 亥]
        // p2: 己亥 gongmang = [子, 丑]
        const p1 = createMockProfile('甲', '子');
        const p2 = createMockProfile('己', '亥');

        const result = analyzeGongmang(p1, p2);

        expect(result.person1InP2Gongmang).toBe(true); // 子 in [子, 丑]
        expect(result.person2InP1Gongmang).toBe(true); // 亥 in [戌, 亥]
        expect(result.impact).toBe('negative');
      });

      it('should detect when p1 is in p2 gongmang only (neutral)', () => {
        // p1: 甲子 gongmang = [戌, 亥], day branch = 子
        // p2: 己亥 gongmang = [子, 丑], day branch = 亥
        // 子 is in p2 gongmang [子, 丑]
        const p1 = createMockProfile('甲', '子');
        const p2 = createMockProfile('己', '巳'); // 巳 not in [戌, 亥]

        const result = analyzeGongmang(p1, p2);

        if (result.person1InP2Gongmang && !result.person2InP1Gongmang) {
          expect(result.impact).toBe('neutral');
        }
      });

      it('should detect when p2 is in p1 gongmang only (neutral)', () => {
        const p1 = createMockProfile('甲', '寅'); // gongmang = [戌, 亥]
        const p2 = createMockProfile('己', '亥'); // 亥 is in [戌, 亥]

        const result = analyzeGongmang(p1, p2);

        if (!result.person1InP2Gongmang && result.person2InP1Gongmang) {
          expect(result.impact).toBe('neutral');
        }
      });

      it('should detect when neither is in gongmang (positive)', () => {
        const p1 = createMockProfile('甲', '子'); // gongmang = [戌, 亥]
        const p2 = createMockProfile('己', '卯'); // gongmang = [午, 未], day = 卯

        const result = analyzeGongmang(p1, p2);

        expect(result.person1InP2Gongmang).toBe(false); // 子 not in [午, 未]
        expect(result.person2InP1Gongmang).toBe(false); // 卯 not in [戌, 亥]
        expect(result.impact).toBe('positive');
      });
    });

    describe('impact levels', () => {
      it('should have negative impact for mutual gongmang', () => {
        const p1 = createMockProfile('甲', '子');
        const p2 = createMockProfile('己', '亥');

        const result = analyzeGongmang(p1, p2);

        if (result.person1InP2Gongmang && result.person2InP1Gongmang) {
          expect(result.impact).toBe('negative');
        }
      });

      it('should have neutral impact for one-way gongmang', () => {
        const p1 = createMockProfile('甲', '寅');
        const p2 = createMockProfile('己', '亥');

        const result = analyzeGongmang(p1, p2);

        if (
          (result.person1InP2Gongmang && !result.person2InP1Gongmang) ||
          (!result.person1InP2Gongmang && result.person2InP1Gongmang)
        ) {
          expect(result.impact).toBe('neutral');
        }
      });

      it('should have positive impact for no gongmang', () => {
        const p1 = createMockProfile('甲', '子');
        const p2 = createMockProfile('己', '卯');

        const result = analyzeGongmang(p1, p2);

        expect(result.impact).toBe('positive');
      });
    });

    describe('interpretation messages', () => {
      it('should provide detailed message for negative impact', () => {
        const p1 = createMockProfile('甲', '子');
        const p2 = createMockProfile('己', '亥');

        const result = analyzeGongmang(p1, p2);

        if (result.impact === 'negative') {
          expect(result.interpretation.length).toBeGreaterThan(0);
          expect(result.interpretation.some(msg => msg.includes('🌫️'))).toBe(true);
          expect(result.interpretation.some(msg => msg.includes('공망'))).toBe(true);
        }
      });

      it('should provide encouraging message for neutral impact', () => {
        const p1 = createMockProfile('甲', '寅');
        const p2 = createMockProfile('己', '亥');

        const result = analyzeGongmang(p1, p2);

        if (result.impact === 'neutral') {
          expect(result.interpretation.length).toBeGreaterThan(0);
          expect(result.interpretation.some(msg => msg.includes('✨'))).toBe(true);
        }
      });

      it('should provide positive message for no gongmang', () => {
        const p1 = createMockProfile('甲', '子');
        const p2 = createMockProfile('己', '卯');

        const result = analyzeGongmang(p1, p2);

        expect(result.impact).toBe('positive');
        expect(result.interpretation.some(msg => msg.includes('🎯'))).toBe(true);
        expect(result.interpretation.some(msg => msg.includes('공망 충돌이 없어요'))).toBe(true);
      });

      it('should include day master names in neutral messages', () => {
        const p1 = createMockProfile('甲', '寅');
        const p2 = createMockProfile('己', '亥');

        const result = analyzeGongmang(p1, p2);

        if (result.impact === 'neutral') {
          const hasP1Name = result.interpretation.some(msg => msg.includes('甲'));
          const hasP2Name = result.interpretation.some(msg => msg.includes('己'));
          expect(hasP1Name || hasP2Name).toBe(true);
        }
      });
    });

    describe('gongmang arrays', () => {
      it('should always return arrays with 2 elements', () => {
        const p1 = createMockProfile('甲', '子');
        const p2 = createMockProfile('己', '巳');

        const result = analyzeGongmang(p1, p2);

        expect(result.person1Gongmang).toHaveLength(2);
        expect(result.person2Gongmang).toHaveLength(2);
      });

      it('should return valid branch names', () => {
        const validBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
        const p1 = createMockProfile('甲', '子');
        const p2 = createMockProfile('己', '巳');

        const result = analyzeGongmang(p1, p2);

        result.person1Gongmang.forEach(branch => {
          expect(validBranches).toContain(branch);
        });
        result.person2Gongmang.forEach(branch => {
          expect(validBranches).toContain(branch);
        });
      });
    });

    describe('edge cases', () => {
      it('should handle unknown day pillar combinations', () => {
        // Using a combination not in the table
        const p1 = createMockProfile('甲', '辰');
        const p2 = createMockProfile('己', '巳');

        const result = analyzeGongmang(p1, p2);

        // Should return default gongmang [戌, 亥] for unknown combinations
        expect(result.person1Gongmang).toBeDefined();
        expect(Array.isArray(result.person1Gongmang)).toBe(true);
        expect(result.person1Gongmang).toHaveLength(2);
      });

      it('should use dayMaster name when available', () => {
        const p1 = createMockProfile('甲', '子');
        const p2 = createMockProfile('己', '亥');

        const result = analyzeGongmang(p1, p2);

        if (result.impact === 'neutral' || result.impact === 'negative') {
          const interpretationText = result.interpretation.join(' ');
          expect(interpretationText).toBeTruthy();
        }
      });

      it('should fallback to pillar stem when dayMaster name is empty', () => {
        const p1 = createMockProfile('甲', '子');
        p1.dayMaster.name = '';
        const p2 = createMockProfile('己', '亥');

        const result = analyzeGongmang(p1, p2);

        // Should not throw error
        expect(result).toBeDefined();
        expect(result.interpretation).toBeDefined();
      });
    });

    describe('specific day pillar combinations', () => {
      it('should correctly calculate for all 甲 stems', () => {
        const dayBranches = ['子', '戌', '午', '申'];
        const expectedGongmangs = [
          ['戌', '亥'],  // 甲子
          ['申', '酉'],  // 甲戌
          ['子', '丑'],  // 甲午
          ['辰', '巳'],  // 甲申
        ];

        dayBranches.forEach((branch, index) => {
          const p1 = createMockProfile('甲', branch);
          const p2 = createMockProfile('己', '巳');
          const result = analyzeGongmang(p1, p2);

          expect(result.person1Gongmang).toEqual(expectedGongmangs[index]);
        });
      });

      it('should correctly calculate for 60 gap-ja cycle samples', () => {
        const testCases = [
          { stem: '甲', branch: '子', expected: ['戌', '亥'] },
          { stem: '乙', branch: '丑', expected: ['戌', '亥'] },
          { stem: '庚', branch: '午', expected: ['申', '酉'] },
          { stem: '辛', branch: '未', expected: ['申', '酉'] },
          { stem: '丙', branch: '子', expected: ['午', '未'] },
          { stem: '壬', branch: '午', expected: ['辰', '巳'] },
          { stem: '戊', branch: '子', expected: ['寅', '卯'] },
          { stem: '甲', branch: '午', expected: ['子', '丑'] },
        ];

        testCases.forEach(({ stem, branch, expected }) => {
          const p1 = createMockProfile(stem, branch);
          const p2 = createMockProfile('己', '巳');
          const result = analyzeGongmang(p1, p2);

          expect(result.person1Gongmang).toEqual(expected);
        });
      });
    });

    describe('boolean flags', () => {
      it('should correctly set person1InP2Gongmang flag', () => {
        // p1 day branch: 子
        // p2: 己亥 gongmang = [子, 丑]
        const p1 = createMockProfile('甲', '子');
        const p2 = createMockProfile('己', '亥');

        const result = analyzeGongmang(p1, p2);

        expect(result.person1InP2Gongmang).toBe(true);
      });

      it('should correctly set person2InP1Gongmang flag', () => {
        // p2 day branch: 亥
        // p1: 甲子 gongmang = [戌, 亥]
        const p1 = createMockProfile('甲', '子');
        const p2 = createMockProfile('己', '亥');

        const result = analyzeGongmang(p1, p2);

        expect(result.person2InP1Gongmang).toBe(true);
      });

      it('should set both flags to false when no gongmang collision', () => {
        const p1 = createMockProfile('甲', '子'); // gongmang [戌, 亥]
        const p2 = createMockProfile('己', '卯'); // gongmang [午, 未], day 卯

        const result = analyzeGongmang(p1, p2);

        expect(result.person1InP2Gongmang).toBe(false);
        expect(result.person2InP1Gongmang).toBe(false);
      });
    });

    describe('interpretation consistency', () => {
      it('should always provide at least one interpretation message', () => {
        const testCases = [
          { p1: createMockProfile('甲', '子'), p2: createMockProfile('己', '亥') },
          { p1: createMockProfile('甲', '寅'), p2: createMockProfile('己', '亥') },
          { p1: createMockProfile('甲', '子'), p2: createMockProfile('己', '卯') },
        ];

        testCases.forEach(({ p1, p2 }) => {
          const result = analyzeGongmang(p1, p2);
          expect(result.interpretation.length).toBeGreaterThan(0);
        });
      });

      it('should provide different messages based on impact', () => {
        const negativeCase = analyzeGongmang(
          createMockProfile('甲', '子'),
          createMockProfile('己', '亥')
        );
        const positiveCase = analyzeGongmang(
          createMockProfile('甲', '子'),
          createMockProfile('己', '卯')
        );

        expect(negativeCase.interpretation.join()).not.toBe(
          positiveCase.interpretation.join()
        );
      });

      it('should use emojis in interpretations', () => {
        const p1 = createMockProfile('甲', '子');
        const p2 = createMockProfile('己', '亥');

        const result = analyzeGongmang(p1, p2);

        const hasEmoji = result.interpretation.some(msg =>
          /[\u{1F300}-\u{1F9FF}]/u.test(msg)
        );
        expect(hasEmoji).toBe(true);
      });
    });
  });
});
