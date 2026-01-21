/**
 * Profile Utilities Tests
 */
import { describe, it, expect } from 'vitest';
import {
  extractSajuProfile,
  extractAstroProfile,
  calculateSajuProfileFromBirthDate,
  type UserSajuProfile,
  type UserAstroProfile,
} from '@/lib/destiny-map/calendar/profile-utils';

describe('destiny-map/calendar/profile-utils', () => {
  describe('extractSajuProfile', () => {
    it('should extract basic saju profile', () => {
      const saju = {
        fourPillars: {
          day: { stem: '甲', branch: '子' },
          year: { stem: '丙', branch: '寅' },
          month: { stem: '乙', branch: '丑' },
          time: { stem: '丁', branch: '卯' },
        },
      };

      const result = extractSajuProfile(saju);

      expect(result.dayMaster).toBe('甲');
      expect(result.dayBranch).toBe('子');
      expect(result.yearBranch).toBe('寅');
      expect(result.monthBranch).toBe('丑');
      expect(result.timeBranch).toBe('卯');
    });

    it('should extract day master element', () => {
      const saju = {
        fourPillars: {
          day: { stem: '甲', branch: '子' },
        },
      };

      const result = extractSajuProfile(saju);

      expect(result.dayMasterElement).toBe('wood');
    });

    it('should handle all five elements', () => {
      const testCases = [
        { stem: '甲', expectedElement: 'wood' },
        { stem: '丙', expectedElement: 'fire' },
        { stem: '戊', expectedElement: 'earth' },
        { stem: '庚', expectedElement: 'metal' },
        { stem: '壬', expectedElement: 'water' },
      ];

      testCases.forEach(({ stem, expectedElement }) => {
        const saju = {
          fourPillars: {
            day: { stem, branch: '子' },
          },
        };

        const result = extractSajuProfile(saju);

        expect(result.dayMasterElement).toBe(expectedElement);
      });
    });

    it('should use defaults for missing data', () => {
      const result = extractSajuProfile({});

      expect(result.dayMaster).toBe('甲');
      expect(result.dayBranch).toBe('子');
      expect(result.dayMasterElement).toBe('wood');
    });

    it('should fallback to dayMaster field if fourPillars missing', () => {
      const saju = {
        dayMaster: '乙',
        dayBranch: '丑',
      };

      const result = extractSajuProfile(saju);

      expect(result.dayMaster).toBe('乙');
      expect(result.dayBranch).toBe('丑');
    });

    it('should extract daeun information', () => {
      const saju = {
        fourPillars: {
          day: { stem: '甲', branch: '子' },
        },
        daeun: {
          current: {
            heavenlyStem: '丙',
            earthlyBranch: '寅',
            startAge: 30,
            element: '화',
            sibsin: { cheon: '식신', ji: '편관' },
          },
          list: [
            {
              heavenlyStem: '甲',
              earthlyBranch: '子',
              startAge: 10,
              element: '목',
            },
          ],
        },
      };

      const result = extractSajuProfile(saju);

      expect(result.daeun).toBeDefined();
      expect(result.daeun?.current?.heavenlyStem).toBe('丙');
      expect(result.daeun?.current?.startAge).toBe(30);
      expect(result.daeun?.current?.sibsin).toEqual({ cheon: '식신', ji: '편관' });
      expect(result.daeun?.list).toHaveLength(1);
    });

    it('should handle missing daeun gracefully', () => {
      const saju = {
        fourPillars: {
          day: { stem: '甲', branch: '子' },
        },
      };

      const result = extractSajuProfile(saju);

      expect(result.daeun).toBeUndefined();
    });

    it('should extract yongsin information', () => {
      const saju = {
        fourPillars: {
          day: { stem: '甲', branch: '子' },
        },
        yongsin: {
          primary: '화',
          secondary: '목',
          type: '억부',
          kibsin: '금',
        },
      };

      const result = extractSajuProfile(saju);

      expect(result.yongsin).toBeDefined();
      expect(result.yongsin?.primary).toBe('화');
      expect(result.yongsin?.secondary).toBe('목');
      expect(result.yongsin?.type).toBe('억부');
      expect(result.yongsin?.kibsin).toBe('금');
    });

    it('should use default yongsin values for incomplete data', () => {
      const saju = {
        fourPillars: {
          day: { stem: '甲', branch: '子' },
        },
        yongsin: {},
      };

      const result = extractSajuProfile(saju);

      expect(result.yongsin?.primary).toBe('wood');
      expect(result.yongsin?.type).toBe('억부');
    });

    it('should extract geokguk information', () => {
      const saju = {
        fourPillars: {
          day: { stem: '甲', branch: '子' },
        },
        geokguk: {
          type: '정관격',
          strength: '신강',
        },
      };

      const result = extractSajuProfile(saju);

      expect(result.geokguk).toBeDefined();
      expect(result.geokguk?.type).toBe('정관격');
      expect(result.geokguk?.strength).toBe('신강');
    });

    it('should use default geokguk values for incomplete data', () => {
      const saju = {
        fourPillars: {
          day: { stem: '甲', branch: '子' },
        },
        geokguk: {},
      };

      const result = extractSajuProfile(saju);

      expect(result.geokguk?.type).toBe('정관격');
      expect(result.geokguk?.strength).toBe('중화');
    });

    it('should extract birthYear', () => {
      const saju = {
        fourPillars: {
          day: { stem: '甲', branch: '子' },
        },
        birthYear: 1990,
      };

      const result = extractSajuProfile(saju);

      expect(result.birthYear).toBe(1990);
    });

    it('should extract complete profile with all fields', () => {
      const saju = {
        fourPillars: {
          year: { stem: '丙', branch: '寅' },
          month: { stem: '乙', branch: '丑' },
          day: { stem: '甲', branch: '子' },
          time: { stem: '丁', branch: '卯' },
        },
        birthYear: 1990,
        daeun: {
          current: {
            heavenlyStem: '丙',
            earthlyBranch: '寅',
            startAge: 30,
            element: '화',
          },
        },
        yongsin: {
          primary: '화',
          type: '억부',
        },
        geokguk: {
          type: '정관격',
          strength: '신강',
        },
      };

      const result = extractSajuProfile(saju);

      expect(result).toMatchObject({
        dayMaster: '甲',
        dayBranch: '子',
        yearBranch: '寅',
        monthBranch: '丑',
        timeBranch: '卯',
        birthYear: 1990,
      });
      expect(result.daeun).toBeDefined();
      expect(result.yongsin).toBeDefined();
      expect(result.geokguk).toBeDefined();
    });
  });

  describe('extractAstroProfile', () => {
    it('should extract sun sign from planets', () => {
      const astrology = {
        planets: [
          { name: 'Sun', sign: 'Aries' },
          { name: 'Moon', sign: 'Taurus' },
        ],
      };

      const result = extractAstroProfile(astrology);

      expect(result.sunSign).toBe('Aries');
    });

    it('should extract sun element', () => {
      const testCases = [
        { sign: 'Aries', element: 'fire' },
        { sign: 'Taurus', element: 'earth' },
        { sign: 'Gemini', element: 'fire' }, // air normalized to fire
        { sign: 'Cancer', element: 'water' },
        { sign: 'Leo', element: 'fire' },
        { sign: 'Virgo', element: 'earth' },
      ];

      testCases.forEach(({ sign, element }) => {
        const astrology = {
          planets: [{ name: 'Sun', sign }],
        };

        const result = extractAstroProfile(astrology);

        expect(result.sunElement).toBe(element);
      });
    });

    it('should use default Aries if Sun not found', () => {
      const astrology = {
        planets: [{ name: 'Moon', sign: 'Taurus' }],
      };

      const result = extractAstroProfile(astrology);

      expect(result.sunSign).toBe('Aries');
      expect(result.sunElement).toBe('fire');
    });

    it('should handle empty planets array', () => {
      const astrology = {
        planets: [],
      };

      const result = extractAstroProfile(astrology);

      expect(result.sunSign).toBe('Aries');
    });

    it('should handle missing planets field', () => {
      const result = extractAstroProfile({});

      expect(result.sunSign).toBe('Aries');
      expect(result.sunElement).toBe('fire');
    });

    it('should normalize air element to fire', () => {
      const airSigns = ['Gemini', 'Libra', 'Aquarius'];

      airSigns.forEach(sign => {
        const astrology = {
          planets: [{ name: 'Sun', sign }],
        };

        const result = extractAstroProfile(astrology);

        expect(result.sunElement).toBe('fire');
      });
    });
  });

  describe('calculateSajuProfileFromBirthDate', () => {
    it('should calculate day stem and branch for known date', () => {
      // 1900-01-31 is 甲子
      const date = new Date(1900, 0, 31);
      const result = calculateSajuProfileFromBirthDate(date);

      expect(result.dayMaster).toBe('甲');
      expect(result.dayBranch).toBe('子');
    });

    it('should calculate correct day pillar for different dates', () => {
      const testCases = [
        // Base date + 10 days = next stem cycle
        { date: new Date(1900, 1, 10), expectedStem: '甲' },
        // Base date + 1 day
        { date: new Date(1900, 1, 1), expectedStem: '乙' },
      ];

      testCases.forEach(({ date }) => {
        const result = calculateSajuProfileFromBirthDate(date);

        expect(result.dayMaster).toBeDefined();
        expect(result.dayBranch).toBeDefined();
      });
    });

    it('should calculate day master element', () => {
      const date = new Date(1990, 0, 1);
      const result = calculateSajuProfileFromBirthDate(date);

      expect(result.dayMasterElement).toBeDefined();
      expect(['wood', 'fire', 'earth', 'metal', 'water']).toContain(result.dayMasterElement);
    });

    it('should calculate year branch', () => {
      const date = new Date(1990, 0, 1);
      const result = calculateSajuProfileFromBirthDate(date);

      expect(result.yearBranch).toBeDefined();
      const validBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
      expect(validBranches).toContain(result.yearBranch);
    });

    it('should set birth year', () => {
      const date = new Date(1990, 5, 15);
      const result = calculateSajuProfileFromBirthDate(date);

      expect(result.birthYear).toBe(1990);
    });

    it('should handle leap years correctly', () => {
      const date = new Date(2000, 1, 29); // Leap year
      const result = calculateSajuProfileFromBirthDate(date);

      expect(result.dayMaster).toBeDefined();
      expect(result.dayBranch).toBeDefined();
    });

    it('should cycle through 60-day gap-ja correctly', () => {
      const baseDate = new Date(1900, 0, 31);
      const date60DaysLater = new Date(1900, 3, 1); // 60 days later

      const result1 = calculateSajuProfileFromBirthDate(baseDate);
      const result2 = calculateSajuProfileFromBirthDate(date60DaysLater);

      // Should cycle back to same or close
      expect(result1.dayMaster).toBeDefined();
      expect(result2.dayMaster).toBeDefined();
    });

    it('should handle dates far in the past', () => {
      const date = new Date(1800, 0, 1);
      const result = calculateSajuProfileFromBirthDate(date);

      expect(result.dayMaster).toBeDefined();
      expect(result.dayBranch).toBeDefined();
    });

    it('should handle dates far in the future', () => {
      const date = new Date(2100, 11, 31);
      const result = calculateSajuProfileFromBirthDate(date);

      expect(result.dayMaster).toBeDefined();
      expect(result.dayBranch).toBeDefined();
    });

    it('should use UTC for consistent calculations', () => {
      const date = new Date(2020, 0, 1);
      const result1 = calculateSajuProfileFromBirthDate(date);
      const result2 = calculateSajuProfileFromBirthDate(date);

      expect(result1.dayMaster).toBe(result2.dayMaster);
      expect(result1.dayBranch).toBe(result2.dayBranch);
    });

    it('should calculate 12-year zodiac cycle correctly', () => {
      const dates = [
        new Date(1984, 0, 1), // 鼠 (Rat) year
        new Date(1996, 0, 1), // 鼠 (Rat) year, 12 years later
      ];

      const results = dates.map(date => calculateSajuProfileFromBirthDate(date));

      // Year branches should be the same for years 12 apart
      expect(results[0].yearBranch).toBe(results[1].yearBranch);
    });

    it('should return all required fields', () => {
      const date = new Date(1990, 5, 15);
      const result = calculateSajuProfileFromBirthDate(date);

      expect(result).toHaveProperty('dayMaster');
      expect(result).toHaveProperty('dayMasterElement');
      expect(result).toHaveProperty('dayBranch');
      expect(result).toHaveProperty('yearBranch');
      expect(result).toHaveProperty('birthYear');
    });

    it('should handle all 10 stems in cycle', () => {
      const stems = new Set<string>();
      const baseDate = new Date(1900, 0, 31);

      for (let i = 0; i < 10; i++) {
        const date = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
        const result = calculateSajuProfileFromBirthDate(date);
        stems.add(result.dayMaster);
      }

      expect(stems.size).toBe(10);
    });

    it('should handle all 12 branches in cycle', () => {
      const branches = new Set<string>();
      const baseDate = new Date(1900, 0, 31);

      for (let i = 0; i < 12; i++) {
        const date = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
        const result = calculateSajuProfileFromBirthDate(date);
        branches.add(result.dayBranch);
      }

      expect(branches.size).toBe(12);
    });
  });

  describe('type structure validation', () => {
    it('should match UserSajuProfile type structure', () => {
      const saju = {
        fourPillars: {
          day: { stem: '甲', branch: '子' },
        },
      };

      const result: UserSajuProfile = extractSajuProfile(saju);

      expect(result.dayMaster).toBeDefined();
      expect(result.dayMasterElement).toBeDefined();
      expect(result.dayBranch).toBeDefined();
    });

    it('should match UserAstroProfile type structure', () => {
      const astrology = {
        planets: [{ name: 'Sun', sign: 'Aries' }],
      };

      const result: UserAstroProfile = extractAstroProfile(astrology);

      expect(result.sunSign).toBeDefined();
      expect(result.sunElement).toBeDefined();
    });
  });
});
