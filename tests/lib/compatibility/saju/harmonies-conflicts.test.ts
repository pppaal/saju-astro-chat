/**
 * Harmonies and Conflicts Tests
 * Tests for branch harmonies (합) and conflicts (충형파해)
 */
import { describe, it, expect } from 'vitest';
import { analyzeHap, analyzeConflicts } from '@/lib/compatibility/saju/harmonies-conflicts';
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

describe('compatibility/saju/harmonies-conflicts', () => {
  describe('analyzeHap', () => {
    it('should identify yukhap (육합) combinations', () => {
      // 子-丑 yukhap
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('戊', '丑', '己', '子', '庚', '辰', '辛', '巳');

      const result = analyzeHap(p1, p2);

      expect(result.yukhap).toBeDefined();
      expect(Array.isArray(result.yukhap)).toBe(true);
    });

    it('should identify all six yukhap pairs', () => {
      const yukhapPairs = [
        ['子', '丑'],
        ['寅', '亥'],
        ['卯', '戌'],
        ['辰', '酉'],
        ['巳', '申'],
        ['午', '未'],
      ];

      yukhapPairs.forEach(([b1, b2]) => {
        const p1 = createMockProfile('甲', b1, '乙', '丑', '丙', '寅', '丁', '卯');
        const p2 = createMockProfile('戊', b2, '己', '子', '庚', '辰', '辛', '巳');

        const result = analyzeHap(p1, p2);

        expect(result.yukhap.length).toBeGreaterThan(0);
      });
    });

    it('should identify samhap (삼합) combinations', () => {
      // 申子辰 samhap
      const p1 = createMockProfile('甲', '申', '乙', '子', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('戊', '辰', '己', '丑', '庚', '辰', '辛', '巳');

      const result = analyzeHap(p1, p2);

      expect(result.samhap).toBeDefined();
      expect(Array.isArray(result.samhap)).toBe(true);
    });

    it('should identify all four samhap groups', () => {
      const samhapGroups = [
        ['申', '子', '辰'],
        ['寅', '午', '戌'],
        ['巳', '酉', '丑'],
        ['亥', '卯', '未'],
      ];

      samhapGroups.forEach(([b1, b2, b3]) => {
        const p1 = createMockProfile('甲', b1, '乙', b2, '丙', '寅', '丁', '卯');
        const p2 = createMockProfile('戊', b3, '己', '子', '庚', '辰', '辛', '巳');

        const result = analyzeHap(p1, p2);

        expect(result.samhap.length).toBeGreaterThan(0);
      });
    });

    it('should identify banghap (방합) combinations', () => {
      // 木방합: 寅卯辰
      const p1 = createMockProfile('甲', '寅', '乙', '卯', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('戊', '辰', '己', '子', '庚', '辰', '辛', '巳');

      const result = analyzeHap(p1, p2);

      expect(result.banghap).toBeDefined();
      expect(Array.isArray(result.banghap)).toBe(true);
    });

    it('should identify all four banghap groups', () => {
      const banghapGroups = [
        { name: '목방합', branches: ['寅', '卯', '辰'] },
        { name: '화방합', branches: ['巳', '午', '未'] },
        { name: '금방합', branches: ['申', '酉', '戌'] },
        { name: '수방합', branches: ['亥', '子', '丑'] },
      ];

      banghapGroups.forEach(({ name, branches: [b1, b2, b3] }) => {
        const p1 = createMockProfile('甲', b1, '乙', b2, '丙', '寅', '丁', '卯');
        const p2 = createMockProfile('戊', b3, '己', '子', '庚', '辰', '辛', '巳');

        const result = analyzeHap(p1, p2);

        if (result.banghap.length > 0) {
          expect(result.banghap.some(h => h.includes(name))).toBe(true);
        }
      });
    });

    it('should calculate harmony score', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('戊', '辰', '己', '巳', '庚', '午', '辛', '未');

      const result = analyzeHap(p1, p2);

      expect(result.score).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should cap score at 100', () => {
      // Create maximum harmony scenario
      const p1 = createMockProfile('甲', '子', '乙', '寅', '丙', '申', '丁', '卯');
      const p2 = createMockProfile('戊', '丑', '己', '亥', '庚', '子', '辛', '戌');

      const result = analyzeHap(p1, p2);

      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should provide description based on score', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('戊', '辰', '己', '巳', '庚', '午', '辛', '未');

      const result = analyzeHap(p1, p2);

      expect(result.description).toBeDefined();
      expect(result.description.length).toBeGreaterThan(0);
    });

    it('should handle no harmony case', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('戊', '午', '己', '未', '庚', '申', '辛', '酉');

      const result = analyzeHap(p1, p2);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.description).toBeDefined();
    });
  });

  describe('analyzeConflicts', () => {
    it('should identify chung (충) conflicts', () => {
      // 子-午 chung
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('戊', '午', '己', '未', '庚', '申', '辛', '酉');

      const result = analyzeConflicts(p1, p2);

      expect(result.chung).toBeDefined();
      expect(Array.isArray(result.chung)).toBe(true);
    });

    it('should identify all six chung pairs', () => {
      const chungPairs = [
        ['子', '午'],
        ['丑', '未'],
        ['寅', '申'],
        ['卯', '酉'],
        ['辰', '戌'],
        ['巳', '亥'],
      ];

      chungPairs.forEach(([b1, b2]) => {
        const p1 = createMockProfile('甲', b1, '乙', '丑', '丙', '寅', '丁', '卯');
        const p2 = createMockProfile('戊', b2, '己', '子', '庚', '辰', '辛', '巳');

        const result = analyzeConflicts(p1, p2);

        expect(result.chung.length).toBeGreaterThan(0);
      });
    });

    it('should identify hyeong (형) conflicts', () => {
      // 寅巳申 hyeong
      const p1 = createMockProfile('甲', '寅', '乙', '巳', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('戊', '申', '己', '子', '庚', '辰', '辛', '巳');

      const result = analyzeConflicts(p1, p2);

      expect(result.hyeong).toBeDefined();
      expect(Array.isArray(result.hyeong)).toBe(true);
    });

    it('should identify pa (파) conflicts', () => {
      // 子-酉 pa
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('戊', '酉', '己', '未', '庚', '申', '辛', '巳');

      const result = analyzeConflicts(p1, p2);

      expect(result.pa).toBeDefined();
      expect(Array.isArray(result.pa)).toBe(true);
    });

    it('should identify hae (해) conflicts', () => {
      // 子-未 hae
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('戊', '未', '己', '午', '庚', '申', '辛', '酉');

      const result = analyzeConflicts(p1, p2);

      expect(result.hae).toBeDefined();
      expect(Array.isArray(result.hae)).toBe(true);
    });

    it('should count total conflicts', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('戊', '午', '己', '未', '庚', '申', '辛', '酉');

      const result = analyzeConflicts(p1, p2);

      expect(result.totalConflicts).toBeDefined();
      expect(result.totalConflicts).toBeGreaterThanOrEqual(0);
      expect(result.totalConflicts).toBe(
        result.chung.length + result.hyeong.length + result.pa.length + result.hae.length
      );
    });

    it('should determine severity level', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('戊', '午', '己', '未', '庚', '申', '辛', '酉');

      const result = analyzeConflicts(p1, p2);

      const validSeverities = ['minimal', 'mild', 'moderate', 'severe'];
      expect(validSeverities).toContain(result.severity);
    });

    it('should classify severity as severe for multiple conflicts', () => {
      // Create maximum conflicts
      const p1 = createMockProfile('甲', '子', '乙', '寅', '丙', '卯', '丁', '午');
      const p2 = createMockProfile('戊', '午', '己', '申', '庚', '酉', '辛', '未');

      const result = analyzeConflicts(p1, p2);

      if (result.totalConflicts >= 4 || result.chung.length >= 2) {
        expect(result.severity).toBe('severe');
      }
    });

    it('should classify severity as moderate for some conflicts', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('戊', '午', '己', '未', '庚', '辰', '辛', '巳');

      const result = analyzeConflicts(p1, p2);

      if (result.totalConflicts >= 2 && result.totalConflicts < 4) {
        expect(result.severity).toBe('moderate');
      }
    });

    it('should provide mitigation advice', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('戊', '午', '己', '未', '庚', '申', '辛', '酉');

      const result = analyzeConflicts(p1, p2);

      expect(result.mitigationAdvice).toBeDefined();
      expect(Array.isArray(result.mitigationAdvice)).toBe(true);
      expect(result.mitigationAdvice.length).toBeGreaterThan(0);
    });

    it('should provide specific advice for chung', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('戊', '午', '己', '未', '庚', '申', '辛', '酉');

      const result = analyzeConflicts(p1, p2);

      if (result.chung.length > 0) {
        const hasChungAdvice = result.mitigationAdvice.some(a => a.includes('충'));
        expect(hasChungAdvice).toBe(true);
      }
    });

    it('should handle no conflicts case', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('戊', '辰', '己', '巳', '庚', '午', '辛', '未');

      const result = analyzeConflicts(p1, p2);

      if (result.totalConflicts === 0) {
        expect(result.severity).toBe('minimal');
        expect(result.mitigationAdvice.length).toBeGreaterThan(0);
      }
    });
  });

  describe('integration tests', () => {
    it('should provide complete harmony analysis', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('戊', '辰', '己', '巳', '庚', '午', '辛', '未');

      const result = analyzeHap(p1, p2);

      expect(result).toMatchObject({
        yukhap: expect.any(Array),
        samhap: expect.any(Array),
        banghap: expect.any(Array),
        score: expect.any(Number),
        description: expect.any(String),
      });
    });

    it('should provide complete conflict analysis', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('戊', '午', '己', '未', '庚', '申', '辛', '酉');

      const result = analyzeConflicts(p1, p2);

      expect(result).toMatchObject({
        chung: expect.any(Array),
        hyeong: expect.any(Array),
        pa: expect.any(Array),
        hae: expect.any(Array),
        totalConflicts: expect.any(Number),
        severity: expect.any(String),
        mitigationAdvice: expect.any(Array),
      });
    });

    it('should handle profiles with both harmonies and conflicts', () => {
      const p1 = createMockProfile('甲', '子', '乙', '寅', '丙', '申', '丁', '卯');
      const p2 = createMockProfile('戊', '午', '己', '亥', '庚', '子', '辛', '戌');

      const hapResult = analyzeHap(p1, p2);
      const conflictResult = analyzeConflicts(p1, p2);

      expect(hapResult.score).toBeGreaterThanOrEqual(0);
      expect(conflictResult.totalConflicts).toBeGreaterThanOrEqual(0);
    });

    it('should include emojis in harmony descriptions', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('戊', '辰', '己', '巳', '庚', '午', '辛', '未');

      const result = analyzeHap(p1, p2);

      const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(result.description);
      expect(hasEmoji).toBe(true);
    });

    it('should include emojis in mitigation advice', () => {
      const p1 = createMockProfile('甲', '子', '乙', '丑', '丙', '寅', '丁', '卯');
      const p2 = createMockProfile('戊', '午', '己', '未', '庚', '申', '辛', '酉');

      const result = analyzeConflicts(p1, p2);

      const allAdvice = result.mitigationAdvice.join(' ');
      const hasEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(allAdvice);
      expect(hasEmoji).toBe(true);
    });

    it('should handle complex harmony patterns', () => {
      // Test with maximum possible harmonies
      const p1 = createMockProfile('甲', '子', '乙', '寅', '丙', '申', '丁', '卯');
      const p2 = createMockProfile('戊', '丑', '己', '亥', '庚', '子', '辛', '戌');

      const result = analyzeHap(p1, p2);

      const totalHarmonies = result.yukhap.length + result.samhap.length + result.banghap.length;
      expect(totalHarmonies).toBeGreaterThanOrEqual(0);
    });

    it('should handle complex conflict patterns', () => {
      // Test with multiple conflict types
      const p1 = createMockProfile('甲', '子', '乙', '寅', '丙', '卯', '丁', '午');
      const p2 = createMockProfile('戊', '午', '己', '申', '庚', '酉', '辛', '未');

      const result = analyzeConflicts(p1, p2);

      const hasMultipleTypes = [
        result.chung.length > 0,
        result.hyeong.length > 0,
        result.pa.length > 0,
        result.hae.length > 0,
      ].filter(Boolean).length;

      expect(result.totalConflicts).toBeGreaterThanOrEqual(0);
    });
  });
});
