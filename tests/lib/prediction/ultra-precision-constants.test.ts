/**
 * Ultra Precision Constants Tests
 */
import { describe, it, expect } from 'vitest';
import {
  STEMS,
  BRANCHES,
  HOUR_BRANCHES,
  HIDDEN_STEMS,
  BRANCH_MEANINGS,
  SIBSIN_SCORES,
  SHINSAL_RULES,
} from '@/lib/prediction/ultra-precision-constants';

describe('Ultra Precision Constants', () => {
  describe('STEMS (천간)', () => {
    it('should have exactly 10 stems', () => {
      expect(STEMS).toHaveLength(10);
    });

    it('should contain all traditional stems', () => {
      expect(STEMS).toContain('甲');
      expect(STEMS).toContain('乙');
      expect(STEMS).toContain('丙');
      expect(STEMS).toContain('丁');
      expect(STEMS).toContain('戊');
      expect(STEMS).toContain('己');
      expect(STEMS).toContain('庚');
      expect(STEMS).toContain('辛');
      expect(STEMS).toContain('壬');
      expect(STEMS).toContain('癸');
    });

    it('should be in correct order', () => {
      expect(STEMS[0]).toBe('甲');
      expect(STEMS[9]).toBe('癸');
    });
  });

  describe('BRANCHES (지지)', () => {
    it('should have exactly 12 branches', () => {
      expect(BRANCHES).toHaveLength(12);
    });

    it('should contain all traditional branches', () => {
      const expectedBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
      for (const branch of expectedBranches) {
        expect(BRANCHES).toContain(branch);
      }
    });

    it('should start with 子 (Rat)', () => {
      expect(BRANCHES[0]).toBe('子');
    });

    it('should end with 亥 (Pig)', () => {
      expect(BRANCHES[11]).toBe('亥');
    });
  });

  describe('HOUR_BRANCHES', () => {
    it('should have exactly 12 branches for hours', () => {
      expect(HOUR_BRANCHES).toHaveLength(12);
    });

    it('should match BRANCHES order', () => {
      expect(HOUR_BRANCHES).toEqual(BRANCHES);
    });
  });

  describe('HIDDEN_STEMS (지장간)', () => {
    it('should have entries for all 12 branches', () => {
      expect(Object.keys(HIDDEN_STEMS)).toHaveLength(12);
    });

    it('should have 子 containing 癸', () => {
      expect(HIDDEN_STEMS['子']).toContain('癸');
    });

    it('should have 丑 containing 己, 癸, 辛', () => {
      expect(HIDDEN_STEMS['丑']).toContain('己');
      expect(HIDDEN_STEMS['丑']).toContain('癸');
      expect(HIDDEN_STEMS['丑']).toContain('辛');
    });

    it('should have 寅 containing 甲, 丙, 戊', () => {
      expect(HIDDEN_STEMS['寅']).toContain('甲');
      expect(HIDDEN_STEMS['寅']).toContain('丙');
      expect(HIDDEN_STEMS['寅']).toContain('戊');
    });

    it('should have 卯 containing only 乙', () => {
      expect(HIDDEN_STEMS['卯']).toHaveLength(1);
      expect(HIDDEN_STEMS['卯']).toContain('乙');
    });

    it('should have 酉 containing only 辛', () => {
      expect(HIDDEN_STEMS['酉']).toHaveLength(1);
      expect(HIDDEN_STEMS['酉']).toContain('辛');
    });

    it('each hidden stem should be a valid stem', () => {
      for (const branch of Object.keys(HIDDEN_STEMS)) {
        for (const stem of HIDDEN_STEMS[branch]) {
          expect(STEMS).toContain(stem);
        }
      }
    });
  });

  describe('BRANCH_MEANINGS', () => {
    it('should have entries for all 12 branches', () => {
      expect(Object.keys(BRANCH_MEANINGS)).toHaveLength(12);
    });

    it('should have 子 related to 재물 and 시작', () => {
      expect(BRANCH_MEANINGS['子']).toContain('재물');
      expect(BRANCH_MEANINGS['子']).toContain('시작');
    });

    it('should have 午 related to 명예 and 승진', () => {
      expect(BRANCH_MEANINGS['午']).toContain('명예');
      expect(BRANCH_MEANINGS['午']).toContain('승진');
    });

    it('should have 酉 related to 결실 and 수확', () => {
      expect(BRANCH_MEANINGS['酉']).toContain('결실');
      expect(BRANCH_MEANINGS['酉']).toContain('수확');
    });

    it('each branch should have at least one meaning', () => {
      for (const branch of Object.keys(BRANCH_MEANINGS)) {
        expect(BRANCH_MEANINGS[branch].length).toBeGreaterThan(0);
      }
    });
  });

  describe('SIBSIN_SCORES (십신 점수)', () => {
    it('should have scores for all 10 sibsins', () => {
      expect(Object.keys(SIBSIN_SCORES)).toHaveLength(10);
    });

    it('should have positive score for 정관', () => {
      expect(SIBSIN_SCORES['정관']).toBe(15);
    });

    it('should have positive score for 정재', () => {
      expect(SIBSIN_SCORES['정재']).toBe(12);
    });

    it('should have positive score for 정인', () => {
      expect(SIBSIN_SCORES['정인']).toBe(10);
    });

    it('should have positive score for 식신', () => {
      expect(SIBSIN_SCORES['식신']).toBe(8);
    });

    it('should have negative score for 비견', () => {
      expect(SIBSIN_SCORES['비견']).toBeLessThan(0);
    });

    it('should have negative score for 겁재', () => {
      expect(SIBSIN_SCORES['겁재']).toBeLessThan(0);
    });

    it('정관 should have highest positive score', () => {
      const values = Object.values(SIBSIN_SCORES);
      expect(SIBSIN_SCORES['정관']).toBe(Math.max(...values));
    });

    it('겁재 should have lowest score', () => {
      const values = Object.values(SIBSIN_SCORES);
      expect(SIBSIN_SCORES['겁재']).toBe(Math.min(...values));
    });
  });

  describe('SHINSAL_RULES (신살 규칙)', () => {
    it('should have multiple shinsal rules', () => {
      expect(SHINSAL_RULES.length).toBeGreaterThan(0);
    });

    it('should include 천을귀인 rule', () => {
      const cheoneulGwiin = SHINSAL_RULES.find(r => r.name === '천을귀인');
      expect(cheoneulGwiin).toBeDefined();
      expect(cheoneulGwiin?.type).toBe('lucky');
      expect(cheoneulGwiin?.score).toBeGreaterThan(0);
    });

    it('should include 역마 rule', () => {
      const yeokma = SHINSAL_RULES.find(r => r.name === '역마');
      expect(yeokma).toBeDefined();
      expect(yeokma?.type).toBe('special');
    });

    it('should include 도화 rule', () => {
      const dohwa = SHINSAL_RULES.find(r => r.name === '도화');
      expect(dohwa).toBeDefined();
      expect(dohwa?.type).toBe('special');
    });

    it('each rule should have required properties', () => {
      for (const rule of SHINSAL_RULES) {
        expect(rule).toHaveProperty('name');
        expect(rule).toHaveProperty('type');
        expect(rule).toHaveProperty('check');
        expect(rule).toHaveProperty('score');
        expect(rule).toHaveProperty('description');
        expect(rule).toHaveProperty('affectedArea');
      }
    });

    it('each rule type should be valid', () => {
      const validTypes = ['lucky', 'unlucky', 'special'];
      for (const rule of SHINSAL_RULES) {
        expect(validTypes).toContain(rule.type);
      }
    });

    describe('역마 (yeokma) check function', () => {
      const yeokma = SHINSAL_RULES.find(r => r.name === '역마');

      it('should match 寅 with 申', () => {
        expect(yeokma?.check('寅', '申')).toBe(true);
        expect(yeokma?.check('申', '寅')).toBe(true);
      });

      it('should match 巳 with 亥', () => {
        expect(yeokma?.check('巳', '亥')).toBe(true);
        expect(yeokma?.check('亥', '巳')).toBe(true);
      });

      it('should not match unrelated branches', () => {
        expect(yeokma?.check('寅', '卯')).toBe(false);
        expect(yeokma?.check('子', '丑')).toBe(false);
      });
    });
  });

  describe('Data Integrity', () => {
    it('STEMS and BRANCHES should have no duplicates', () => {
      expect(new Set(STEMS).size).toBe(STEMS.length);
      expect(new Set(BRANCHES).size).toBe(BRANCHES.length);
    });

    it('all hidden stems should reference valid stems', () => {
      for (const branch of Object.keys(HIDDEN_STEMS)) {
        for (const stem of HIDDEN_STEMS[branch]) {
          expect(STEMS).toContain(stem);
        }
      }
    });

    it('all branch meanings should be non-empty strings', () => {
      for (const branch of Object.keys(BRANCH_MEANINGS)) {
        for (const meaning of BRANCH_MEANINGS[branch]) {
          expect(typeof meaning).toBe('string');
          expect(meaning.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
