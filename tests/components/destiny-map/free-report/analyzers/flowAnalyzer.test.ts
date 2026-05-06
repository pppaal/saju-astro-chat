/**
 * Flow Analyzer Tests
 * 현재 흐름 분석 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCurrentFlowAnalysis } from '@/components/destiny-map/free-report/analyzers/flowAnalyzer';
import type { SajuData } from '@/components/destiny-map/free-report/types';

describe('getCurrentFlowAnalysis', () => {
  const currentYear = 2024;
  const birthYear = 1990;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(currentYear, 6, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createBasicSaju = (): SajuData => ({
    facts: { birthDate: `${birthYear}-03-15` },
    unse: {
      daeun: [
        { age: 1, heavenlyStem: '甲', earthlyBranch: '子', sibsin: '비견' },
        { age: 11, heavenlyStem: '乙', earthlyBranch: '丑', sibsin: '겁재' },
        { age: 21, heavenlyStem: '丙', earthlyBranch: '寅', sibsin: '식신' },
        { age: 31, heavenlyStem: '丁', earthlyBranch: '卯', sibsin: '상관' },
        { age: 41, heavenlyStem: '戊', earthlyBranch: '辰', sibsin: '편재' },
      ],
      annual: [
        { year: currentYear, heavenlyStem: '甲', earthlyBranch: '辰', sibsin: '비견' },
        { year: currentYear + 1, heavenlyStem: '乙', earthlyBranch: '巳', sibsin: '겁재' },
      ],
    },
  } as unknown as SajuData);

  describe('basic analysis', () => {
    it('should return null if no unse data', () => {
      const result = getCurrentFlowAnalysis({} as SajuData, 'ko');
      expect(result).toBeNull();
    });

    it('should return null if undefined saju', () => {
      const result = getCurrentFlowAnalysis(undefined, 'ko');
      expect(result).toBeNull();
    });

    it('should return flow analysis with daeun and annual', () => {
      const saju = createBasicSaju();
      const result = getCurrentFlowAnalysis(saju, 'ko');

      expect(result).not.toBeNull();
      expect(result?.title).toBe('지금 내 흐름');
      expect(result?.flow).toContain('대운');
      expect(result?.flow).toContain('세운');
      expect(result?.emoji).toBe('🌊');
    });

    it('should return English text when lang is en', () => {
      const saju = createBasicSaju();
      const result = getCurrentFlowAnalysis(saju, 'en');

      expect(result?.title).toBe('Current Flow');
      expect(result?.flow).toContain('Daeun');
      expect(result?.flow).toContain('Annual');
    });
  });

  describe('daeun calculation', () => {
    it('should find current daeun based on Korean age', () => {
      const saju = createBasicSaju();
      // Korean age = 2024 - 1990 + 1 = 35
      // Should be in 31-40 daeun (丁卯)
      const result = getCurrentFlowAnalysis(saju, 'ko');

      expect(result?.flow).toContain('丁卯');
      expect(result?.flow).toContain('31-40세');
    });

    it('should display daeun sibsin flow', () => {
      const saju = createBasicSaju();
      const result = getCurrentFlowAnalysis(saju, 'ko');

      expect(result?.flow).toContain('표현·혁신'); // 상관
    });

    it('should handle sibsin as object with cheon', () => {
      const saju = createBasicSaju();
      saju.unse!.daeun![3].sibsin = { cheon: '상관', ji: '식신' } as unknown as string;

      const result = getCurrentFlowAnalysis(saju, 'ko');

      expect(result?.flow).toContain('표현·혁신');
    });
  });

  describe('annual calculation', () => {
    it('should find current year annual luck', () => {
      const saju = createBasicSaju();
      const result = getCurrentFlowAnalysis(saju, 'ko');

      expect(result?.flow).toContain(`${currentYear}년`);
      expect(result?.flow).toContain('甲辰');
    });

    it('should display annual sibsin flow', () => {
      const saju = createBasicSaju();
      const result = getCurrentFlowAnalysis(saju, 'ko');

      expect(result?.flow).toContain('독립·경쟁'); // 비견
    });
  });

  describe('sibsin flow descriptions', () => {
    const testCases = [
      { sibsin: '비견', ko: '독립·경쟁', en: 'Independence' },
      { sibsin: '겁재', ko: '변화·도전', en: 'Challenge' },
      { sibsin: '식신', ko: '창작·여유', en: 'Creativity' },
      { sibsin: '상관', ko: '표현·혁신', en: 'Expression' },
      { sibsin: '편재', ko: '사업·활동', en: 'Business' },
      { sibsin: '정재', ko: '안정·재물', en: 'Stability' },
      { sibsin: '편관', ko: '변화·추진', en: 'Drive' },
      { sibsin: '정관', ko: '명예·질서', en: 'Honor' },
      { sibsin: '편인', ko: '탐구·자유', en: 'Exploration' },
      { sibsin: '정인', ko: '학습·성장', en: 'Learning' },
    ];

    testCases.forEach(({ sibsin, ko, en }) => {
      it(`should show ${sibsin} as ${ko} in Korean`, () => {
        const saju = createBasicSaju();
        saju.unse!.annual![0].sibsin = sibsin;

        const result = getCurrentFlowAnalysis(saju, 'ko');

        expect(result?.flow).toContain(ko);
      });

      it(`should show ${sibsin} as ${en} in English`, () => {
        const saju = createBasicSaju();
        saju.unse!.annual![0].sibsin = sibsin;

        const result = getCurrentFlowAnalysis(saju, 'en');

        expect(result?.flow).toContain(en);
      });
    });
  });

  describe('advice generation', () => {
    it('should generate advice combining daeun and annual flow', () => {
      const saju = createBasicSaju();
      const result = getCurrentFlowAnalysis(saju, 'ko');

      expect(result?.advice).toContain('에너지');
      expect(result?.advice).toContain('집중');
    });

    it('should generate default advice when sibsin missing', () => {
      const saju = createBasicSaju();
      saju.unse!.daeun![3].sibsin = undefined as unknown as string;
      saju.unse!.annual![0].sibsin = undefined as unknown as string;

      const result = getCurrentFlowAnalysis(saju, 'ko');

      expect(result?.advice).toContain('차근차근');
    });

    it('should generate English advice', () => {
      const saju = createBasicSaju();
      const result = getCurrentFlowAnalysis(saju, 'en');

      expect(result?.advice).toContain('Focus');
      expect(result?.advice).toContain('energy');
    });
  });

  describe('birth year extraction', () => {
    it('should use facts.birthDate for age calculation', () => {
      const saju = createBasicSaju();
      const result = getCurrentFlowAnalysis(saju, 'ko');

      // With birthYear 1990, Korean age is 35, so should be in 31-40 daeun
      expect(result?.flow).toContain('31-40세');
    });

    it('should fallback to pillars when birthDate missing', () => {
      const saju: SajuData = {
        pillars: { year: { heavenlyStem: '庚' } },
        unse: {
          daeun: [
            { age: 21, heavenlyStem: '丙', earthlyBranch: '寅', sibsin: '식신' },
            { age: 31, heavenlyStem: '丁', earthlyBranch: '卯', sibsin: '상관' },
          ],
          annual: [
            { year: currentYear, heavenlyStem: '甲', earthlyBranch: '辰', sibsin: '비견' },
          ],
        },
      } as unknown as SajuData;

      const result = getCurrentFlowAnalysis(saju, 'ko');

      expect(result).not.toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty daeun list', () => {
      const saju: SajuData = {
        facts: { birthDate: `${birthYear}-03-15` },
        unse: {
          daeun: [],
          annual: [
            { year: currentYear, heavenlyStem: '甲', earthlyBranch: '辰', sibsin: '비견' },
          ],
        },
      } as unknown as SajuData;

      const result = getCurrentFlowAnalysis(saju, 'ko');

      expect(result).not.toBeNull();
      expect(result?.flow).toContain('정보 없음');
    });

    it('should handle empty annual list', () => {
      const saju: SajuData = {
        facts: { birthDate: `${birthYear}-03-15` },
        unse: {
          daeun: [
            { age: 31, heavenlyStem: '丁', earthlyBranch: '卯', sibsin: '상관' },
          ],
          annual: [],
        },
      } as unknown as SajuData;

      const result = getCurrentFlowAnalysis(saju, 'ko');

      expect(result).not.toBeNull();
      expect(result?.flow).toContain('정보 없음');
    });

    it('should return null if no daeun and no annual found', () => {
      const saju: SajuData = {
        facts: { birthDate: `${birthYear}-03-15` },
        unse: {
          daeun: [
            { age: 1, heavenlyStem: '甲', earthlyBranch: '子', sibsin: '비견' },
          ],
          annual: [
            { year: currentYear - 10, heavenlyStem: '甲', earthlyBranch: '辰', sibsin: '비견' },
          ],
        },
      } as unknown as SajuData;

      const result = getCurrentFlowAnalysis(saju, 'ko');

      // No current daeun (age 35 not in 1-10) and no current year annual
      expect(result).toBeNull();
    });

    it('should handle non-array daeun', () => {
      const saju: SajuData = {
        facts: { birthDate: `${birthYear}-03-15` },
        unse: {
          daeun: 'invalid' as unknown as [],
          annual: [
            { year: currentYear, heavenlyStem: '甲', earthlyBranch: '辰', sibsin: '비견' },
          ],
        },
      } as unknown as SajuData;

      const result = getCurrentFlowAnalysis(saju, 'ko');

      expect(result).not.toBeNull();
    });

    it('should handle missing stems in daeun', () => {
      const saju: SajuData = {
        facts: { birthDate: `${birthYear}-03-15` },
        unse: {
          daeun: [
            { age: 31, sibsin: '상관' },
          ],
          annual: [
            { year: currentYear, heavenlyStem: '甲', earthlyBranch: '辰', sibsin: '비견' },
          ],
        },
      } as unknown as SajuData;

      const result = getCurrentFlowAnalysis(saju, 'ko');

      expect(result).not.toBeNull();
    });

    it('should handle unknown sibsin', () => {
      const saju = createBasicSaju();
      saju.unse!.annual![0].sibsin = '알수없음';

      const result = getCurrentFlowAnalysis(saju, 'ko');

      // Should not contain sibsin description but still work
      expect(result).not.toBeNull();
    });
  });

  describe('age calculation variants', () => {
    it('should try western age if korean age does not match', () => {
      // Set up so Korean age doesn't match but western age does
      const saju: SajuData = {
        facts: { birthDate: `${currentYear - 30}-12-31` }, // Born late in year
        unse: {
          daeun: [
            { age: 30, heavenlyStem: '丁', earthlyBranch: '卯', sibsin: '상관' },
          ],
          annual: [
            { year: currentYear, heavenlyStem: '甲', earthlyBranch: '辰', sibsin: '비견' },
          ],
        },
      } as unknown as SajuData;

      const result = getCurrentFlowAnalysis(saju, 'ko');

      expect(result).not.toBeNull();
    });
  });
});
