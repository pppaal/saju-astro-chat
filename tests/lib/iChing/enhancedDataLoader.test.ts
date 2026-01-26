/**
 * Tests for enhanced hexagram data loader
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getEnhancedHexagramData,
  getEnhancedHexagramDataKo,
  clearEnhancedDataCache,
  getCacheStats,
} from '@/lib/iChing/enhancedDataLoader';

// Mock fetch globally
global.fetch = vi.fn();

describe('enhancedDataLoader', () => {
  beforeEach(() => {
    clearEnhancedDataCache();
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  describe('getEnhancedHexagramData', () => {
    it('should load hexagram data from JSON', async () => {
      const mockIndex = {
        totalHexagrams: 64,
        chunkSize: 8,
        chunks: [
          { start: 1, end: 8, enFile: 'chunk-1-8-en.json', koFile: 'chunk-1-8-ko.json' }
        ]
      };

      const mockChunkData = {
        1: {
          visualImagery: {
            scene: 'Test scene',
            symbolism: 'Test symbolism',
            colors: ['red', 'blue'],
            emoji: '☰'
          },
          quickSummary: {
            oneLiner: 'Test summary',
            keywords: ['test', 'mock'],
            essence: 'Test essence'
          },
          actionableAdvice: {
            dos: ['Do this'],
            donts: ['Dont do that'],
            timing: 'Now',
            nextSteps: ['Step 1']
          },
          situationTemplates: {
            career: { question: 'Q', advice: 'A', actionItems: ['Item'] },
            love: { question: 'Q', advice: 'A', actionItems: ['Item'] },
            health: { question: 'Q', advice: 'A', actionItems: ['Item'] },
            wealth: { question: 'Q', advice: 'A', actionItems: ['Item'] },
            decision: { question: 'Q', advice: 'A', actionItems: ['Item'] },
            timing: { question: 'Q', advice: 'A', actionItems: ['Item'] }
          },
          plainLanguage: {
            traditionalText: 'Traditional',
            modernExplanation: 'Modern',
            realLifeExample: 'Example',
            metaphor: 'Metaphor'
          },
          relatedConcepts: ['concept1'],
          difficulty: 'easy' as const,
          favorability: 5
        }
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockIndex
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockChunkData
        });

      const data = await getEnhancedHexagramData(1);

      expect(data).toBeDefined();
      expect(data?.visualImagery).toBeDefined();
      expect(data?.quickSummary).toBeDefined();
      expect(data?.actionableAdvice).toBeDefined();
    });

    it('should return null for invalid hexagram numbers', async () => {
      const mockIndex = {
        totalHexagrams: 64,
        chunkSize: 8,
        chunks: [
          { start: 1, end: 8, enFile: 'chunk-1-8-en.json', koFile: 'chunk-1-8-ko.json' }
        ]
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockIndex
      });

      const data = await getEnhancedHexagramData(0);
      expect(data).toBeNull();
    });

    it('should cache loaded data', async () => {
      const mockIndex = {
        totalHexagrams: 64,
        chunkSize: 8,
        chunks: [
          { start: 1, end: 8, enFile: 'enhanced-data-en-1-8.json', koFile: 'enhanced-data-ko-1-8.json' },
          { start: 9, end: 16, enFile: 'enhanced-data-en-9-16.json', koFile: 'enhanced-data-ko-9-16.json' }
        ]
      };

      const createMockHexagramData = (num: number) => ({
        [num]: {
          visualImagery: { scene: 'Test', symbolism: 'Test', colors: [], emoji: '☰' },
          quickSummary: { oneLiner: 'Test', keywords: [], essence: 'Test' },
          actionableAdvice: { dos: [], donts: [], timing: 'Now', nextSteps: [] },
          situationTemplates: {
            career: { question: 'Q', advice: 'A', actionItems: [] },
            love: { question: 'Q', advice: 'A', actionItems: [] },
            health: { question: 'Q', advice: 'A', actionItems: [] },
            wealth: { question: 'Q', advice: 'A', actionItems: [] },
            decision: { question: 'Q', advice: 'A', actionItems: [] },
            timing: { question: 'Q', advice: 'A', actionItems: [] }
          },
          plainLanguage: { traditionalText: 'T', modernExplanation: 'M', realLifeExample: 'E', metaphor: 'M' },
          relatedConcepts: [],
          difficulty: 'easy' as const,
          favorability: 5
        }
      });

      const mockChunk1 = { ...createMockHexagramData(1), ...createMockHexagramData(2) };
      const mockChunk2 = createMockHexagramData(9);

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('index.json')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockIndex
          });
        }
        if (url.includes('enhanced-data-en-1-8.json')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockChunk1
          });
        }
        if (url.includes('enhanced-data-en-9-16.json')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockChunk2
          });
        }
        return Promise.resolve({
          ok: false,
          status: 404
        });
      });

      // First load - loads index + chunk 1-8
      await getEnhancedHexagramData(1);
      const stats1 = getCacheStats();
      expect(stats1.enChunksLoaded).toBe(1);

      // Second load (should use cache) - no new fetch
      await getEnhancedHexagramData(2); // Same chunk (1-8)
      const stats2 = getCacheStats();
      expect(stats2.enChunksLoaded).toBe(1); // Still 1 chunk

      // Different chunk - loads chunk 9-16
      await getEnhancedHexagramData(9); // Different chunk (9-16)
      const stats3 = getCacheStats();
      expect(stats3.enChunksLoaded).toBe(2); // Now 2 chunks
    });
  });

  describe('getEnhancedHexagramDataKo', () => {
    it('should load Korean hexagram data', async () => {
      const mockIndex = {
        totalHexagrams: 64,
        chunkSize: 8,
        chunks: [
          { start: 1, end: 8, enFile: 'enhanced-data-en-1-8.json', koFile: 'enhanced-data-ko-1-8.json' }
        ]
      };

      const mockKoData = {
        1: {
          hanja: {
            name: '乾',
            meaning: 'Heaven'
          },
          traditional: {
            judgment: 'Test judgment',
            image: 'Test image',
            lines: ['Line 1', 'Line 2']
          },
          visualImagery: { scene: 'Test', symbolism: 'Test', colors: [], emoji: '☰' },
          quickSummary: { oneLiner: 'Test', keywords: [], essence: 'Test' },
          actionableAdvice: { dos: [], donts: [], timing: 'Now', nextSteps: [] },
          situationTemplates: {
            career: { question: 'Q', advice: 'A', actionItems: [] },
            love: { question: 'Q', advice: 'A', actionItems: [] },
            health: { question: 'Q', advice: 'A', actionItems: [] },
            wealth: { question: 'Q', advice: 'A', actionItems: [] },
            decision: { question: 'Q', advice: 'A', actionItems: [] },
            timing: { question: 'Q', advice: 'A', actionItems: [] }
          },
          plainLanguage: { traditionalText: 'T', modernExplanation: 'M', realLifeExample: 'E', metaphor: 'M' },
          relatedConcepts: [],
          difficulty: 'easy' as const,
          favorability: 5
        }
      };

      (global.fetch as any).mockImplementation((url: string) => {
        if (url.includes('index.json')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockIndex
          });
        }
        if (url.includes('enhanced-data-ko-1-8.json')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockKoData
          });
        }
        return Promise.resolve({
          ok: false,
          status: 404
        });
      });

      const data = await getEnhancedHexagramDataKo(1);

      expect(data).toBeDefined();
      if (data) {
        expect(data.hanja).toBeDefined();
        expect(data.traditional).toBeDefined();
      }
    });
  });

  describe('cache management', () => {
    it('should clear cache', async () => {
      const mockIndex = {
        totalHexagrams: 64,
        chunkSize: 8,
        chunks: [
          { start: 1, end: 8, enFile: 'chunk-1-8-en.json', koFile: 'chunk-1-8-ko.json' }
        ]
      };

      const mockChunkData = {
        1: {
          visualImagery: { scene: 'Test', symbolism: 'Test', colors: [], emoji: '☰' },
          quickSummary: { oneLiner: 'Test', keywords: [], essence: 'Test' },
          actionableAdvice: { dos: [], donts: [], timing: 'Now', nextSteps: [] },
          situationTemplates: {
            career: { question: 'Q', advice: 'A', actionItems: [] },
            love: { question: 'Q', advice: 'A', actionItems: [] },
            health: { question: 'Q', advice: 'A', actionItems: [] },
            wealth: { question: 'Q', advice: 'A', actionItems: [] },
            decision: { question: 'Q', advice: 'A', actionItems: [] },
            timing: { question: 'Q', advice: 'A', actionItems: [] }
          },
          plainLanguage: { traditionalText: 'T', modernExplanation: 'M', realLifeExample: 'E', metaphor: 'M' },
          relatedConcepts: [],
          difficulty: 'easy' as const,
          favorability: 5
        }
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockIndex
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockChunkData
        });

      await getEnhancedHexagramData(1);
      expect(getCacheStats().enChunksLoaded).toBe(1);

      clearEnhancedDataCache();
      expect(getCacheStats().enChunksLoaded).toBe(0);
    });

    it('should track cache statistics', async () => {
      const mockIndex = {
        totalHexagrams: 64,
        chunkSize: 8,
        chunks: [
          { start: 1, end: 8, enFile: 'chunk-1-8-en.json', koFile: 'chunk-1-8-ko.json' }
        ]
      };

      const mockEnData = {
        1: {
          visualImagery: { scene: 'Test', symbolism: 'Test', colors: [], emoji: '☰' },
          quickSummary: { oneLiner: 'Test', keywords: [], essence: 'Test' },
          actionableAdvice: { dos: [], donts: [], timing: 'Now', nextSteps: [] },
          situationTemplates: {
            career: { question: 'Q', advice: 'A', actionItems: [] },
            love: { question: 'Q', advice: 'A', actionItems: [] },
            health: { question: 'Q', advice: 'A', actionItems: [] },
            wealth: { question: 'Q', advice: 'A', actionItems: [] },
            decision: { question: 'Q', advice: 'A', actionItems: [] },
            timing: { question: 'Q', advice: 'A', actionItems: [] }
          },
          plainLanguage: { traditionalText: 'T', modernExplanation: 'M', realLifeExample: 'E', metaphor: 'M' },
          relatedConcepts: [],
          difficulty: 'easy' as const,
          favorability: 5
        }
      };

      const mockKoData = {
        1: {
          hanja: { name: '乾', meaning: 'Heaven' },
          traditional: { judgment: 'Test', image: 'Test', lines: [] },
          visualImagery: { scene: 'Test', symbolism: 'Test', colors: [], emoji: '☰' },
          quickSummary: { oneLiner: 'Test', keywords: [], essence: 'Test' },
          actionableAdvice: { dos: [], donts: [], timing: 'Now', nextSteps: [] },
          situationTemplates: {
            career: { question: 'Q', advice: 'A', actionItems: [] },
            love: { question: 'Q', advice: 'A', actionItems: [] },
            health: { question: 'Q', advice: 'A', actionItems: [] },
            wealth: { question: 'Q', advice: 'A', actionItems: [] },
            decision: { question: 'Q', advice: 'A', actionItems: [] },
            timing: { question: 'Q', advice: 'A', actionItems: [] }
          },
          plainLanguage: { traditionalText: 'T', modernExplanation: 'M', realLifeExample: 'E', metaphor: 'M' },
          relatedConcepts: [],
          difficulty: 'easy' as const,
          favorability: 5
        }
      };

      const initialStats = getCacheStats();
      expect(initialStats.enChunksLoaded).toBe(0);
      expect(initialStats.koChunksLoaded).toBe(0);

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockIndex
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEnData
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockKoData
        });

      await getEnhancedHexagramData(1);
      await getEnhancedHexagramDataKo(1);

      const finalStats = getCacheStats();
      expect(finalStats.enChunksLoaded).toBe(1);
      expect(finalStats.koChunksLoaded).toBe(1);
    });
  });
});
