/**
 * Strengths Analyzer Tests
 * 강점/약점 분석 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStrengthsAndWeaknesses } from '@/components/destiny-map/fun-insights/analyzers/strengthsAnalyzer';
import type { SajuData, AstroData } from '@/components/destiny-map/fun-insights/types';

// Mock utils
vi.mock('@/components/destiny-map/fun-insights/analyzers/utils', () => ({
  extractFiveElementsSorted: vi.fn((saju) => {
    if (!saju?.fiveElements) return [];
    return Object.entries(saju.fiveElements).sort(([, a], [, b]) => (b as number) - (a as number));
  }),
  selectLang: vi.fn((isKo, obj) => isKo ? obj.ko : obj.en),
}));

// Mock data modules
vi.mock('@/components/destiny-map/fun-insights/data/elementAnalysisTraits', () => ({
  elementStrengthDescriptions: {
    wood: { ko: '창의력과 성장 에너지가 강해요', en: 'Strong creativity and growth energy' },
    fire: { ko: '열정과 표현력이 뛰어나요', en: 'Excellent passion and expression' },
    earth: { ko: '안정적이고 신뢰할 수 있어요', en: 'Stable and reliable' },
    metal: { ko: '결단력과 분석력이 좋아요', en: 'Good decisiveness and analysis' },
    water: { ko: '지혜롭고 유연해요', en: 'Wise and flexible' },
  },
  elementWeaknessDescriptions: {
    wood: {
      text: { ko: '목 에너지가 부족해요', en: 'Lacking wood energy' },
      advice: { ko: '녹색 음식과 자연을 접하세요', en: 'Connect with green foods and nature' },
    },
    fire: {
      text: { ko: '화 에너지가 부족해요', en: 'Lacking fire energy' },
      advice: { ko: '적극적으로 활동하세요', en: 'Be actively engaged' },
    },
    earth: {
      text: { ko: '토 에너지가 부족해요', en: 'Lacking earth energy' },
      advice: { ko: '규칙적인 생활을 하세요', en: 'Have a regular routine' },
    },
    metal: {
      text: { ko: '금 에너지가 부족해요', en: 'Lacking metal energy' },
      advice: { ko: '결단력을 키우세요', en: 'Build decisiveness' },
    },
    water: {
      text: { ko: '수 에너지가 부족해요', en: 'Lacking water energy' },
      advice: { ko: '휴식과 명상을 하세요', en: 'Rest and meditate' },
    },
  },
}));

describe('getStrengthsAndWeaknesses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createBasicSaju = (): SajuData => ({
    fiveElements: { wood: 35, fire: 25, earth: 20, metal: 15, water: 5 },
  } as unknown as SajuData);

  const createBasicAstro = (): AstroData => ({
    aspects: [
      { type: 'Trine', orb: 2, from: 'sun', to: 'moon' },
      { type: 'Sextile', orb: 1, from: 'venus', to: 'mars' },
    ],
  } as unknown as AstroData);

  describe('saju element analysis', () => {
    it('should return null if no data is available', () => {
      const result = getStrengthsAndWeaknesses(undefined, undefined, 'ko');
      expect(result).toBeNull();
    });

    it('should identify strongest element as strength', () => {
      const saju = createBasicSaju();
      const result = getStrengthsAndWeaknesses(saju, undefined, 'ko');

      expect(result).not.toBeNull();
      expect(result?.strengths.length).toBeGreaterThan(0);
      expect(result?.strengths[0].text).toContain('창의력');
      expect(result?.strengths[0].source).toBe('사주');
    });

    it('should identify weakest element as weakness', () => {
      const saju = createBasicSaju();
      const result = getStrengthsAndWeaknesses(saju, undefined, 'ko');

      expect(result?.weaknesses.length).toBeGreaterThan(0);
      expect(result?.weaknesses[0].text).toContain('수 에너지');
      expect(result?.weaknesses[0].advice).toContain('휴식');
    });

    it('should return English text when lang is en', () => {
      const saju = createBasicSaju();
      const result = getStrengthsAndWeaknesses(saju, undefined, 'en');

      expect(result?.strengths[0].text).toContain('creativity');
      expect(result?.strengths[0].source).toBe('Saju');
      expect(result?.weaknesses[0].text).toContain('water');
    });
  });

  describe('different strongest elements', () => {
    it('should handle fire as strongest', () => {
      const saju: SajuData = {
        fiveElements: { fire: 40, wood: 20, earth: 15, metal: 15, water: 10 },
      } as unknown as SajuData;

      const result = getStrengthsAndWeaknesses(saju, undefined, 'ko');

      expect(result?.strengths[0].text).toContain('열정');
    });

    it('should handle earth as strongest', () => {
      const saju: SajuData = {
        fiveElements: { earth: 40, fire: 20, wood: 15, metal: 15, water: 10 },
      } as unknown as SajuData;

      const result = getStrengthsAndWeaknesses(saju, undefined, 'ko');

      expect(result?.strengths[0].text).toContain('안정적');
    });

    it('should handle metal as strongest', () => {
      const saju: SajuData = {
        fiveElements: { metal: 40, earth: 20, fire: 15, wood: 15, water: 10 },
      } as unknown as SajuData;

      const result = getStrengthsAndWeaknesses(saju, undefined, 'ko');

      expect(result?.strengths[0].text).toContain('결단력');
    });
  });

  describe('astrology aspects analysis', () => {
    it('should identify harmonious aspects as strength', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getStrengthsAndWeaknesses(saju, astro, 'ko');

      const astroStrength = result?.strengths.find(s => s.source === '점성술');
      expect(astroStrength).toBeDefined();
      expect(astroStrength?.text).toContain('조화로운');
      expect(astroStrength?.text).toContain('2개');
    });

    it('should not add strength for aspects with high orb', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        aspects: [
          { type: 'Trine', orb: 5, from: 'sun', to: 'moon' },
        ],
      } as unknown as AstroData;

      const result = getStrengthsAndWeaknesses(saju, astro, 'ko');

      const astroStrength = result?.strengths.find(s => s.source === '점성술');
      expect(astroStrength).toBeUndefined();
    });

    it('should identify challenging aspects as weakness', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        aspects: [
          { type: 'Square', orb: 1, from: 'sun', to: 'saturn' },
          { type: 'Opposition', orb: 2, from: 'moon', to: 'mars' },
          { type: 'Square', orb: 0.5, from: 'venus', to: 'pluto' },
        ],
      } as unknown as AstroData;

      const result = getStrengthsAndWeaknesses(saju, astro, 'ko');

      const astroWeakness = result?.weaknesses.find(w => w.source === '점성술');
      expect(astroWeakness).toBeDefined();
      expect(astroWeakness?.text).toContain('긴장');
      expect(astroWeakness?.advice).toContain('성장');
    });

    it('should not add weakness for fewer than 3 challenging aspects', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        aspects: [
          { type: 'Square', orb: 1, from: 'sun', to: 'saturn' },
          { type: 'Opposition', orb: 2, from: 'moon', to: 'mars' },
        ],
      } as unknown as AstroData;

      const result = getStrengthsAndWeaknesses(saju, astro, 'ko');

      const astroWeakness = result?.weaknesses.find(w => w.source === '점성술');
      expect(astroWeakness).toBeUndefined();
    });
  });

  describe('combined analysis', () => {
    it('should combine saju and astro strengths', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getStrengthsAndWeaknesses(saju, astro, 'ko');

      const sajuStrength = result?.strengths.find(s => s.source === '사주');
      const astroStrength = result?.strengths.find(s => s.source === '점성술');

      expect(sajuStrength).toBeDefined();
      expect(astroStrength).toBeDefined();
    });

    it('should combine saju and astro weaknesses', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        aspects: [
          { type: 'Square', orb: 1, from: 'sun', to: 'saturn' },
          { type: 'Square', orb: 1, from: 'moon', to: 'mars' },
          { type: 'Opposition', orb: 2, from: 'venus', to: 'pluto' },
        ],
      } as unknown as AstroData;

      const result = getStrengthsAndWeaknesses(saju, astro, 'ko');

      const sajuWeakness = result?.weaknesses.find(w => w.source === '사주');
      const astroWeakness = result?.weaknesses.find(w => w.source === '점성술');

      expect(sajuWeakness).toBeDefined();
      expect(astroWeakness).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty fiveElements', () => {
      const saju = { fiveElements: {} } as unknown as SajuData;
      const result = getStrengthsAndWeaknesses(saju, undefined, 'ko');

      expect(result).toBeNull();
    });

    it('should handle empty aspects array', () => {
      const saju = createBasicSaju();
      const astro = { aspects: [] } as unknown as AstroData;

      const result = getStrengthsAndWeaknesses(saju, astro, 'ko');

      expect(result).not.toBeNull();
      const astroStrength = result?.strengths.find(s => s.source === '점성술');
      expect(astroStrength).toBeUndefined();
    });

    it('should handle aspects without orb (default to 10)', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        aspects: [
          { type: 'Trine', from: 'sun', to: 'moon' }, // no orb
        ],
      } as unknown as AstroData;

      const result = getStrengthsAndWeaknesses(saju, astro, 'ko');

      // Should not be counted because default orb of 10 is >= 3
      const astroStrength = result?.strengths.find(s => s.source === '점성술');
      expect(astroStrength).toBeUndefined();
    });

    it('should handle non-array aspects', () => {
      const saju = createBasicSaju();
      const astro = { aspects: 'invalid' } as unknown as AstroData;

      const result = getStrengthsAndWeaknesses(saju, astro, 'ko');

      expect(result).not.toBeNull();
    });

    it('should return null for astro-only with no qualifying aspects', () => {
      const astro: AstroData = {
        aspects: [{ type: 'Conjunction', orb: 5, from: 'sun', to: 'moon' }],
      } as unknown as AstroData;

      const result = getStrengthsAndWeaknesses(undefined, astro, 'ko');

      expect(result).toBeNull();
    });
  });
});
