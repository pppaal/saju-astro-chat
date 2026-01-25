/**
 * useHexagramData Hook Tests
 * 역경 괘 데이터 훅 테스트
 */

import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHexagramData, type UseHexagramDataParams } from '@/components/iching/hooks/useHexagramData';
import type { IChingResult } from '@/components/iching/types';

// Mock all data modules
vi.mock('@/lib/iChing/iChingPremiumData', () => ({
  getPremiumHexagramData: vi.fn((num: number) => {
    if (num === 1) {
      return {
        trigram_upper: 'qian',
        trigram_lower: 'qian',
        core_meaning: { ko: '창조', en: 'Creative' },
        themes: {
          career: { ko: '성공', en: 'Success' },
          love: { ko: '조화', en: 'Harmony' },
        },
      };
    }
    if (num === 2) {
      return {
        trigram_upper: 'kun',
        trigram_lower: 'kun',
        core_meaning: { ko: '수용', en: 'Receptive' },
      };
    }
    return null;
  }),
  getTrigramInfo: vi.fn((trigram: string) => {
    const trigramMap: Record<string, { name: string; element: string }> = {
      qian: { name: 'Heaven', element: 'Metal' },
      kun: { name: 'Earth', element: 'Earth' },
      zhen: { name: 'Thunder', element: 'Wood' },
      kan: { name: 'Water', element: 'Water' },
      gen: { name: 'Mountain', element: 'Earth' },
      xun: { name: 'Wind', element: 'Wood' },
      li: { name: 'Fire', element: 'Fire' },
      dui: { name: 'Lake', element: 'Metal' },
    };
    return trigramMap[trigram] || null;
  }),
  getLuckyInfo: vi.fn((num: number) => ({
    colors: ['gold', 'white'],
    numbers: [1, 6],
    direction: 'northwest',
    element: 'Metal',
  })),
  calculateNuclearHexagram: vi.fn((num: number) => ({
    number: 23,
    name_ko: '박',
    name_en: 'Splitting Apart',
  })),
  calculateRelatedHexagrams: vi.fn((num: number) => ({
    inverted: { number: 2, name_ko: '곤', name_en: 'The Receptive' },
    opposite: { number: 44, name_ko: '구', name_en: 'Coming to Meet' },
  })),
}));

vi.mock('@/lib/iChing/enhancedData', () => ({
  enhancedHexagramData: {
    1: {
      interpretation: 'Creative power',
      advice: 'Take action',
      keywords: ['strength', 'leadership'],
    },
    2: {
      interpretation: 'Receptive energy',
      advice: 'Be patient',
      keywords: ['patience', 'nurturing'],
    },
  },
  enhancedHexagramDataKo: {
    1: {
      interpretation: '창조적 힘',
      advice: '행동을 취하세요',
      keywords: ['강함', '리더십'],
    },
    2: {
      interpretation: '수용적 에너지',
      advice: '인내하세요',
      keywords: ['인내', '양육'],
    },
  },
}));

vi.mock('@/lib/iChing/ichingWisdom', () => ({
  getHexagramWisdom: vi.fn((num: number) => ({
    traditionalName: num === 1 ? '乾' : '坤',
    modernInterpretation: 'Modern wisdom text',
    ancientWisdom: 'Ancient wisdom quote',
    lifeLesson: 'Life lesson text',
  })),
}));

vi.mock('@/lib/iChing/ichingPatterns', () => ({
  analyzeSequencePosition: vi.fn((num: number) => ({
    position: num,
    phase: 'beginning',
    meaning: 'Starting phase of the cycle',
    cyclicPattern: 'ascending',
  })),
  getXuguaPair: vi.fn((num: number) => {
    if (num === 1) {
      return { primary: 1, pair: 2, relationship: 'complementary' };
    }
    return { primary: num, pair: num + 1, relationship: 'sequential' };
  }),
}));

describe('useHexagramData', () => {
  const mockResult: IChingResult = {
    primaryHexagram: {
      number: 1,
      name: 'The Creative',
      symbol: '☰',
      judgment: 'Supreme success',
      image: 'Heaven above heaven',
    },
    resultingHexagram: {
      number: 2,
      name: 'The Receptive',
      symbol: '☷',
      judgment: 'Sublime success',
    },
    changingLines: [1, 4],
  } as IChingResult;

  const defaultParams: UseHexagramDataParams = {
    result: mockResult,
    language: 'en',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return all hexagram data fields', () => {
      const { result } = renderHook(() => useHexagramData(defaultParams));

      expect(result.current).toHaveProperty('primaryNumber');
      expect(result.current).toHaveProperty('resultingNumber');
      expect(result.current).toHaveProperty('premiumData');
      expect(result.current).toHaveProperty('resultingPremiumData');
      expect(result.current).toHaveProperty('upperTrigram');
      expect(result.current).toHaveProperty('lowerTrigram');
      expect(result.current).toHaveProperty('luckyInfo');
      expect(result.current).toHaveProperty('nuclearHexagram');
      expect(result.current).toHaveProperty('relatedHexagrams');
      expect(result.current).toHaveProperty('enhancedData');
      expect(result.current).toHaveProperty('wisdomData');
      expect(result.current).toHaveProperty('sequenceData');
      expect(result.current).toHaveProperty('xuguaPairData');
    });

    it('should extract primary and resulting numbers', () => {
      const { result } = renderHook(() => useHexagramData(defaultParams));

      expect(result.current.primaryNumber).toBe(1);
      expect(result.current.resultingNumber).toBe(2);
    });
  });

  describe('null result handling', () => {
    it('should return nulls when result is null', () => {
      const { result } = renderHook(() =>
        useHexagramData({ result: null, language: 'en' })
      );

      expect(result.current.primaryNumber).toBeUndefined();
      expect(result.current.resultingNumber).toBeUndefined();
      expect(result.current.premiumData).toBeNull();
      expect(result.current.resultingPremiumData).toBeNull();
      expect(result.current.upperTrigram).toBeNull();
      expect(result.current.lowerTrigram).toBeNull();
      expect(result.current.luckyInfo).toBeNull();
      expect(result.current.nuclearHexagram).toBeNull();
      expect(result.current.relatedHexagrams).toBeNull();
      expect(result.current.enhancedData).toBeNull();
      expect(result.current.wisdomData).toBeNull();
      expect(result.current.sequenceData).toBeNull();
      expect(result.current.xuguaPairData).toBeNull();
    });

    it('should handle result without primaryHexagram', () => {
      const { result } = renderHook(() =>
        useHexagramData({
          result: { primaryHexagram: null } as unknown as IChingResult,
          language: 'en',
        })
      );

      expect(result.current.primaryNumber).toBeUndefined();
      expect(result.current.premiumData).toBeNull();
    });

    it('should handle result without resultingHexagram', () => {
      const resultWithoutResulting = {
        ...mockResult,
        resultingHexagram: undefined,
      } as IChingResult;

      const { result } = renderHook(() =>
        useHexagramData({ result: resultWithoutResulting, language: 'en' })
      );

      expect(result.current.primaryNumber).toBe(1);
      expect(result.current.resultingNumber).toBeUndefined();
      expect(result.current.resultingPremiumData).toBeNull();
    });
  });

  describe('premium data', () => {
    it('should fetch premium data for primary hexagram', () => {
      const { result } = renderHook(() => useHexagramData(defaultParams));

      expect(result.current.premiumData).not.toBeNull();
      expect(result.current.premiumData?.trigram_upper).toBe('qian');
      expect(result.current.premiumData?.trigram_lower).toBe('qian');
    });

    it('should fetch premium data for resulting hexagram', () => {
      const { result } = renderHook(() => useHexagramData(defaultParams));

      expect(result.current.resultingPremiumData).not.toBeNull();
      expect(result.current.resultingPremiumData?.trigram_upper).toBe('kun');
    });
  });

  describe('trigram data', () => {
    it('should get upper trigram info', () => {
      const { result } = renderHook(() => useHexagramData(defaultParams));

      expect(result.current.upperTrigram).not.toBeNull();
      expect(result.current.upperTrigram?.name).toBe('Heaven');
      expect(result.current.upperTrigram?.element).toBe('Metal');
    });

    it('should get lower trigram info', () => {
      const { result } = renderHook(() => useHexagramData(defaultParams));

      expect(result.current.lowerTrigram).not.toBeNull();
      expect(result.current.lowerTrigram?.name).toBe('Heaven');
    });

    it('should return null trigrams when primaryHexagram is missing', () => {
      const { result } = renderHook(() =>
        useHexagramData({ result: null, language: 'en' })
      );

      expect(result.current.upperTrigram).toBeNull();
      expect(result.current.lowerTrigram).toBeNull();
    });
  });

  describe('lucky info', () => {
    it('should get lucky info for primary hexagram', () => {
      const { result } = renderHook(() => useHexagramData(defaultParams));

      expect(result.current.luckyInfo).not.toBeNull();
      expect(result.current.luckyInfo?.colors).toContain('gold');
      expect(result.current.luckyInfo?.numbers).toContain(1);
      expect(result.current.luckyInfo?.direction).toBe('northwest');
    });
  });

  describe('nuclear hexagram', () => {
    it('should calculate nuclear hexagram', () => {
      const { result } = renderHook(() => useHexagramData(defaultParams));

      expect(result.current.nuclearHexagram).not.toBeNull();
      expect(result.current.nuclearHexagram?.number).toBe(23);
      expect(result.current.nuclearHexagram?.name_en).toBe('Splitting Apart');
    });
  });

  describe('related hexagrams', () => {
    it('should calculate related hexagrams', () => {
      const { result } = renderHook(() => useHexagramData(defaultParams));

      expect(result.current.relatedHexagrams).not.toBeNull();
      expect(result.current.relatedHexagrams?.inverted?.number).toBe(2);
      expect(result.current.relatedHexagrams?.opposite?.number).toBe(44);
    });
  });

  describe('enhanced data', () => {
    it('should get English enhanced data when language is en', () => {
      const { result } = renderHook(() =>
        useHexagramData({ ...defaultParams, language: 'en' })
      );

      expect(result.current.enhancedData).not.toBeNull();
      expect(result.current.enhancedData?.interpretation).toBe('Creative power');
      expect(result.current.enhancedData?.advice).toBe('Take action');
    });

    it('should get Korean enhanced data when language is ko', () => {
      const { result } = renderHook(() =>
        useHexagramData({ ...defaultParams, language: 'ko' })
      );

      expect(result.current.enhancedData).not.toBeNull();
      expect(result.current.enhancedData?.interpretation).toBe('창조적 힘');
      expect(result.current.enhancedData?.advice).toBe('행동을 취하세요');
    });
  });

  describe('wisdom data', () => {
    it('should get hexagram wisdom', () => {
      const { result } = renderHook(() => useHexagramData(defaultParams));

      expect(result.current.wisdomData).not.toBeNull();
      expect(result.current.wisdomData?.traditionalName).toBe('乾');
      expect(result.current.wisdomData?.modernInterpretation).toBe('Modern wisdom text');
    });
  });

  describe('sequence data', () => {
    it('should analyze sequence position', () => {
      const { result } = renderHook(() => useHexagramData(defaultParams));

      expect(result.current.sequenceData).not.toBeNull();
      expect(result.current.sequenceData?.position).toBe(1);
      expect(result.current.sequenceData?.phase).toBe('beginning');
    });
  });

  describe('xugua pair data', () => {
    it('should get xugua pair', () => {
      const { result } = renderHook(() => useHexagramData(defaultParams));

      expect(result.current.xuguaPairData).not.toBeNull();
      expect(result.current.xuguaPairData?.primary).toBe(1);
      expect(result.current.xuguaPairData?.pair).toBe(2);
      expect(result.current.xuguaPairData?.relationship).toBe('complementary');
    });
  });

  describe('memoization', () => {
    it('should return stable data on rerender with same props', () => {
      const { result, rerender } = renderHook(
        ({ result: r, language }: UseHexagramDataParams) =>
          useHexagramData({ result: r, language }),
        { initialProps: defaultParams }
      );

      const firstPremiumData = result.current.premiumData;
      const firstLuckyInfo = result.current.luckyInfo;

      // Rerender with same props
      rerender(defaultParams);

      // Should return same memoized data
      expect(result.current.premiumData).toBe(firstPremiumData);
      expect(result.current.luckyInfo).toBe(firstLuckyInfo);
    });

    it('should update data when hexagram number changes', () => {
      const { result, rerender } = renderHook(
        ({ result: r, language }: UseHexagramDataParams) =>
          useHexagramData({ result: r, language }),
        { initialProps: defaultParams }
      );

      expect(result.current.primaryNumber).toBe(1);

      // Change hexagram number to 2
      const newResult: IChingResult = {
        ...mockResult,
        primaryHexagram: {
          ...mockResult.primaryHexagram!,
          number: 2,
        },
      } as IChingResult;

      rerender({ result: newResult, language: 'en' });

      expect(result.current.primaryNumber).toBe(2);
      // Premium data should update for the new hexagram
      expect(result.current.premiumData?.trigram_upper).toBe('kun');
    });

    it('should update enhanced data when language changes', () => {
      const { result, rerender } = renderHook(
        ({ result: r, language }: UseHexagramDataParams) =>
          useHexagramData({ result: r, language }),
        { initialProps: defaultParams }
      );

      expect(result.current.enhancedData?.interpretation).toBe('Creative power');

      rerender({ ...defaultParams, language: 'ko' });

      expect(result.current.enhancedData?.interpretation).toBe('창조적 힘');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined primaryHexagram number', () => {
      const undefinedResult: IChingResult = {
        primaryHexagram: { name: 'Unknown' } as IChingResult['primaryHexagram'],
      } as IChingResult;

      const { result } = renderHook(() =>
        useHexagramData({ result: undefinedResult, language: 'en' })
      );

      expect(result.current.primaryNumber).toBeUndefined();
      expect(result.current.premiumData).toBeNull();
    });

    it('should handle result with only primaryHexagram', () => {
      const minimalResult: IChingResult = {
        primaryHexagram: mockResult.primaryHexagram,
      } as IChingResult;

      const { result } = renderHook(() =>
        useHexagramData({ result: minimalResult, language: 'en' })
      );

      expect(result.current.primaryNumber).toBe(1);
      expect(result.current.resultingNumber).toBeUndefined();
      expect(result.current.premiumData).not.toBeNull();
      expect(result.current.resultingPremiumData).toBeNull();
    });
  });
});
