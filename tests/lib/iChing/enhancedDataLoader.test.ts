/**
 * Tests for enhanced hexagram data loader
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getEnhancedHexagramData,
  getEnhancedHexagramDataKo,
  clearEnhancedDataCache,
  preloadEnhancedData,
} from '@/lib/iChing/enhancedDataLoader';

// Mock the enhancedData module that is dynamically imported
const mockEnhancedHexagramData: Record<number, any> = {
  1: {
    visualImagery: {
      scene: 'Test scene',
      symbolism: 'Test symbolism',
      colors: ['red', 'blue'],
      emoji: '☰',
    },
    quickSummary: {
      oneLiner: 'Test summary',
      keywords: ['test', 'mock'],
      essence: 'Test essence',
    },
    actionableAdvice: {
      dos: ['Do this'],
      donts: ['Dont do that'],
      timing: 'Now',
      nextSteps: ['Step 1'],
    },
    situationTemplates: {
      career: { question: 'Q', advice: 'A', actionItems: ['Item'] },
      love: { question: 'Q', advice: 'A', actionItems: ['Item'] },
      health: { question: 'Q', advice: 'A', actionItems: ['Item'] },
      wealth: { question: 'Q', advice: 'A', actionItems: ['Item'] },
      decision: { question: 'Q', advice: 'A', actionItems: ['Item'] },
      timing: { question: 'Q', advice: 'A', actionItems: ['Item'] },
    },
    plainLanguage: {
      traditionalText: 'Traditional',
      modernExplanation: 'Modern',
      realLifeExample: 'Example',
      metaphor: 'Metaphor',
    },
    relatedConcepts: ['concept1'],
    difficulty: 'easy' as const,
    favorability: 5,
  },
  2: {
    visualImagery: { scene: 'Scene 2', symbolism: 'Sym 2', colors: [], emoji: '☷' },
    quickSummary: { oneLiner: 'Summary 2', keywords: [], essence: 'Essence 2' },
    actionableAdvice: { dos: [], donts: [], timing: 'Later', nextSteps: [] },
    situationTemplates: {
      career: { question: 'Q', advice: 'A', actionItems: [] },
      love: { question: 'Q', advice: 'A', actionItems: [] },
      health: { question: 'Q', advice: 'A', actionItems: [] },
      wealth: { question: 'Q', advice: 'A', actionItems: [] },
      decision: { question: 'Q', advice: 'A', actionItems: [] },
      timing: { question: 'Q', advice: 'A', actionItems: [] },
    },
    plainLanguage: { traditionalText: 'T', modernExplanation: 'M', realLifeExample: 'E', metaphor: 'M' },
    relatedConcepts: [],
    difficulty: 'easy' as const,
    favorability: 4,
  },
};

const mockEnhancedHexagramDataKo: Record<number, any> = {
  1: {
    hanja: { name: '乾', meaning: 'Heaven' },
    traditional: { judgment: 'Test judgment', image: 'Test image', lines: ['Line 1'] },
    visualImagery: { scene: 'Test', symbolism: 'Test', colors: [], emoji: '☰' },
    quickSummary: { oneLiner: 'Test', keywords: [], essence: 'Test' },
    actionableAdvice: { dos: [], donts: [], timing: 'Now', nextSteps: [] },
    situationTemplates: {
      career: { question: 'Q', advice: 'A', actionItems: [] },
      love: { question: 'Q', advice: 'A', actionItems: [] },
      health: { question: 'Q', advice: 'A', actionItems: [] },
      wealth: { question: 'Q', advice: 'A', actionItems: [] },
      decision: { question: 'Q', advice: 'A', actionItems: [] },
      timing: { question: 'Q', advice: 'A', actionItems: [] },
    },
    plainLanguage: { traditionalText: 'T', modernExplanation: 'M', realLifeExample: 'E', metaphor: 'M' },
    relatedConcepts: [],
    difficulty: 'easy' as const,
    favorability: 5,
  },
};

vi.mock('@/lib/iChing/enhancedData', () => ({
  enhancedHexagramData: mockEnhancedHexagramData,
  enhancedHexagramDataKo: mockEnhancedHexagramDataKo,
}));

describe('enhancedDataLoader', () => {
  beforeEach(() => {
    clearEnhancedDataCache();
    vi.clearAllMocks();
  });

  describe('getEnhancedHexagramData', () => {
    it('should load hexagram data via dynamic import', async () => {
      const data = await getEnhancedHexagramData(1);

      expect(data).toBeDefined();
      expect(data?.visualImagery).toBeDefined();
      expect(data?.visualImagery.scene).toBe('Test scene');
      expect(data?.quickSummary).toBeDefined();
      expect(data?.quickSummary.oneLiner).toBe('Test summary');
      expect(data?.actionableAdvice).toBeDefined();
    });

    it('should return null for hexagram number below 1', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const data = await getEnhancedHexagramData(0);
      expect(data).toBeNull();
      consoleSpy.mockRestore();
    });

    it('should return null for hexagram number above 64', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const data = await getEnhancedHexagramData(65);
      expect(data).toBeNull();
      consoleSpy.mockRestore();
    });

    it('should return null for negative hexagram number', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const data = await getEnhancedHexagramData(-1);
      expect(data).toBeNull();
      consoleSpy.mockRestore();
    });

    it('should return null for hexagram number not in data', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const data = await getEnhancedHexagramData(50);
      expect(data).toBeNull();
      consoleSpy.mockRestore();
    });

    it('should cache loaded data', async () => {
      const data1 = await getEnhancedHexagramData(1);
      const data2 = await getEnhancedHexagramData(1);

      // Should return the same cached reference
      expect(data1).toBe(data2);
    });

    it('should load different hexagrams independently', async () => {
      const data1 = await getEnhancedHexagramData(1);
      const data2 = await getEnhancedHexagramData(2);

      expect(data1).toBeDefined();
      expect(data2).toBeDefined();
      expect(data1?.quickSummary.oneLiner).toBe('Test summary');
      expect(data2?.quickSummary.oneLiner).toBe('Summary 2');
    });
  });

  describe('getEnhancedHexagramDataKo', () => {
    it('should load Korean hexagram data', async () => {
      const data = await getEnhancedHexagramDataKo(1);

      expect(data).toBeDefined();
      if (data) {
        expect(data.hanja).toBeDefined();
        expect(data.hanja.name).toBe('乾');
        expect(data.traditional).toBeDefined();
        expect(data.traditional.judgment).toBe('Test judgment');
      }
    });

    it('should return null for invalid hexagram numbers', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const data = await getEnhancedHexagramDataKo(0);
      expect(data).toBeNull();
      consoleSpy.mockRestore();
    });

    it('should return null for hexagram number not in Korean data', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const data = await getEnhancedHexagramDataKo(50);
      expect(data).toBeNull();
      consoleSpy.mockRestore();
    });

    it('should cache Korean data independently from English', async () => {
      const enData = await getEnhancedHexagramData(1);
      const koData = await getEnhancedHexagramDataKo(1);

      expect(enData).toBeDefined();
      expect(koData).toBeDefined();
      expect(enData).not.toBe(koData);
    });
  });

  describe('preloadEnhancedData', () => {
    it('should preload multiple hexagrams in English', async () => {
      await preloadEnhancedData([1, 2]);

      const data1 = await getEnhancedHexagramData(1);
      const data2 = await getEnhancedHexagramData(2);

      expect(data1).toBeDefined();
      expect(data2).toBeDefined();
    });

    it('should preload multiple hexagrams in Korean', async () => {
      await preloadEnhancedData([1], 'ko');

      const data = await getEnhancedHexagramDataKo(1);
      expect(data).toBeDefined();
    });

    it('should default to English preloading', async () => {
      await preloadEnhancedData([1]);

      const data = await getEnhancedHexagramData(1);
      expect(data).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should return null and log error when dynamic import fails (EN)', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Temporarily override the mock to simulate import failure
      vi.doMock('@/lib/iChing/enhancedData', () => {
        throw new Error('Module load failed');
      });

      // Clear cache and re-import to pick up the failing mock
      clearEnhancedDataCache();
      vi.resetModules();

      const { getEnhancedHexagramData: freshGet } = await import(
        '@/lib/iChing/enhancedDataLoader'
      );
      const data = await freshGet(1);

      expect(data).toBeNull();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load enhanced data for hexagram 1'),
        expect.objectContaining({ message: expect.any(String) })
      );

      errorSpy.mockRestore();
    });

    it('should return null and log error when dynamic import fails (KO)', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.doMock('@/lib/iChing/enhancedData', () => {
        throw new Error('Module load failed');
      });

      clearEnhancedDataCache();
      vi.resetModules();

      const { getEnhancedHexagramDataKo: freshGetKo } = await import(
        '@/lib/iChing/enhancedDataLoader'
      );
      const data = await freshGetKo(1);

      expect(data).toBeNull();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load enhanced Korean data for hexagram 1'),
        expect.objectContaining({ message: expect.any(String) })
      );

      errorSpy.mockRestore();
    });
  });

  describe('clearEnhancedDataCache', () => {
    it('should clear all cached data so re-import is needed', async () => {
      const data1 = await getEnhancedHexagramData(1);
      expect(data1).toBeDefined();

      clearEnhancedDataCache();

      // Data should still be loadable (re-imported from module)
      const data2 = await getEnhancedHexagramData(1);
      expect(data2).toBeDefined();
    });
  });
});
