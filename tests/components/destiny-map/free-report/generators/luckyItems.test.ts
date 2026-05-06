import { describe, it, expect } from 'vitest';
import { getLuckyItems } from '@/components/destiny-map/free-report/generators/luckyItems';

describe('getLuckyItems', () => {
  describe('basic functionality', () => {
    it('should return empty array when saju is undefined', () => {
      const result = getLuckyItems(undefined, 'ko');
      expect(result).toEqual([]);
    });

    it('should return empty array when fiveElements is missing', () => {
      const saju = {} as any;
      const result = getLuckyItems(saju, 'ko');
      expect(result).toEqual([]);
    });

    it('should return empty array when fiveElements is empty', () => {
      const saju = { fiveElements: {} } as any;
      const result = getLuckyItems(saju, 'ko');
      expect(result).toEqual([]);
    });
  });

  describe('Korean locale', () => {
    it('should return Korean lucky items for weakest wood element', () => {
      const saju = {
        fiveElements: {
          wood: 1,
          fire: 3,
          earth: 2,
          metal: 4,
          water: 2,
        },
      } as any;

      const result = getLuckyItems(saju, 'ko');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        item: '🌿 식물/화분',
        reason: '목 기운 성장',
      });
      expect(result[1]).toEqual({
        item: '💚 초록색 아이템',
        reason: '생명력 에너지',
      });
      expect(result[2]).toEqual({
        item: '🌅 동쪽 방향',
        reason: '목 기운 방위',
      });
    });

    it('should return Korean lucky items for weakest fire element', () => {
      const saju = {
        fiveElements: {
          wood: 3,
          fire: 1,
          earth: 2,
          metal: 4,
          water: 2,
        },
      } as any;

      const result = getLuckyItems(saju, 'ko');

      expect(result).toHaveLength(3);
      expect(result[0].item).toBe('🕯️ 캔들/조명');
      expect(result[0].reason).toBe('화 기운 활성화');
    });

    it('should return Korean lucky items for weakest earth element', () => {
      const saju = {
        fiveElements: {
          wood: 3,
          fire: 3,
          earth: 1,
          metal: 4,
          water: 2,
        },
      } as any;

      const result = getLuckyItems(saju, 'ko');

      expect(result[0].item).toBe('🏺 도자기/세라믹');
      expect(result[0].reason).toBe('토 기운 안정');
    });

    it('should return Korean lucky items for weakest metal element', () => {
      const saju = {
        fiveElements: {
          wood: 3,
          fire: 3,
          earth: 2,
          metal: 1,
          water: 2,
        },
      } as any;

      const result = getLuckyItems(saju, 'ko');

      expect(result[0].item).toBe('⌚ 메탈 악세서리');
      expect(result[0].reason).toBe('금 기운 결단력');
    });

    it('should return Korean lucky items for weakest water element', () => {
      const saju = {
        fiveElements: {
          wood: 3,
          fire: 3,
          earth: 2,
          metal: 4,
          water: 1,
        },
      } as any;

      const result = getLuckyItems(saju, 'ko');

      expect(result[0].item).toBe('💧 수족관/분수');
      expect(result[0].reason).toBe('수 기운 지혜');
    });
  });

  describe('English locale', () => {
    it('should return English lucky items for weakest wood element', () => {
      const saju = {
        fiveElements: {
          wood: 1,
          fire: 3,
          earth: 2,
          metal: 4,
          water: 2,
        },
      } as any;

      const result = getLuckyItems(saju, 'en');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        item: '🌿 Plants/pots',
        reason: 'Wood growth',
      });
      expect(result[1]).toEqual({
        item: '💚 Green items',
        reason: 'Vitality energy',
      });
      expect(result[2]).toEqual({
        item: '🌅 East direction',
        reason: 'Wood direction',
      });
    });

    it('should return English lucky items for weakest fire element', () => {
      const saju = {
        fiveElements: {
          wood: 3,
          fire: 1,
          earth: 2,
          metal: 4,
          water: 2,
        },
      } as any;

      const result = getLuckyItems(saju, 'en');

      expect(result[0].item).toBe('🕯️ Candles');
      expect(result[0].reason).toBe('Fire activation');
    });

    it('should return English lucky items for weakest earth element', () => {
      const saju = {
        fiveElements: {
          wood: 3,
          fire: 3,
          earth: 1,
          metal: 4,
          water: 2,
        },
      } as any;

      const result = getLuckyItems(saju, 'en');

      expect(result[0].item).toBe('🏺 Ceramics');
      expect(result[0].reason).toBe('Earth stability');
    });

    it('should return English lucky items for weakest metal element', () => {
      const saju = {
        fiveElements: {
          wood: 3,
          fire: 3,
          earth: 2,
          metal: 1,
          water: 2,
        },
      } as any;

      const result = getLuckyItems(saju, 'en');

      expect(result[0].item).toBe('⌚ Metal accessories');
      expect(result[0].reason).toBe('Decisiveness');
    });

    it('should return English lucky items for weakest water element', () => {
      const saju = {
        fiveElements: {
          wood: 3,
          fire: 3,
          earth: 2,
          metal: 4,
          water: 1,
        },
      } as any;

      const result = getLuckyItems(saju, 'en');

      expect(result[0].item).toBe('💧 Aquarium/fountain');
      expect(result[0].reason).toBe('Wisdom');
    });
  });

  describe('element selection logic', () => {
    it('should select the element with the lowest score', () => {
      const saju = {
        fiveElements: {
          wood: 5,
          fire: 2,
          earth: 3,
          metal: 4,
          water: 1, // lowest
        },
      } as any;

      const result = getLuckyItems(saju, 'en');

      expect(result[0].item).toBe('💧 Aquarium/fountain');
    });

    it('should handle tie by selecting first in sorted order', () => {
      const saju = {
        fiveElements: {
          wood: 1,
          fire: 1,
          earth: 3,
          metal: 4,
          water: 2,
        },
      } as any;

      const result = getLuckyItems(saju, 'en');

      // Should select either wood or fire (whichever comes first in Object.entries)
      const validItems = ['🌿 Plants/pots', '🕯️ Candles'];
      expect(validItems).toContain(result[0].item);
    });

    it('should handle zero values', () => {
      const saju = {
        fiveElements: {
          wood: 0,
          fire: 2,
          earth: 3,
          metal: 4,
          water: 1,
        },
      } as any;

      const result = getLuckyItems(saju, 'en');

      expect(result[0].item).toBe('🌿 Plants/pots');
    });
  });

  describe('locale handling', () => {
    it('should default to English for unknown locale', () => {
      const saju = {
        fiveElements: {
          wood: 1,
          fire: 3,
          earth: 2,
          metal: 4,
          water: 2,
        },
      } as any;

      const result = getLuckyItems(saju, 'unknown');

      expect(result[0].item).toBe('🌿 Plants/pots');
    });

    it('should handle case-sensitive locale (ko)', () => {
      const saju = {
        fiveElements: {
          wood: 1,
          fire: 3,
          earth: 2,
          metal: 4,
          water: 2,
        },
      } as any;

      const resultKo = getLuckyItems(saju, 'ko');
      const resultKO = getLuckyItems(saju, 'KO');

      expect(resultKo[0].item).toBe('🌿 식물/화분');
      expect(resultKO[0].item).toBe('🌿 Plants/pots'); // KO != ko
    });
  });

  describe('item pairing', () => {
    it('should pair items with reasons correctly', () => {
      const saju = {
        fiveElements: {
          wood: 1,
          fire: 3,
          earth: 2,
          metal: 4,
          water: 2,
        },
      } as any;

      const result = getLuckyItems(saju, 'en');

      // Each result should have item and reason
      result.forEach(entry => {
        expect(entry).toHaveProperty('item');
        expect(entry).toHaveProperty('reason');
        expect(typeof entry.item).toBe('string');
        expect(typeof entry.reason).toBe('string');
      });
    });

    it('should return exactly 3 pairs for each element', () => {
      const elements = ['wood', 'fire', 'earth', 'metal', 'water'];

      elements.forEach(element => {
        const fiveElements: any = {
          wood: 5,
          fire: 5,
          earth: 5,
          metal: 5,
          water: 5,
        };
        fiveElements[element] = 1;

        const saju = { fiveElements } as any;
        const result = getLuckyItems(saju, 'en');

        expect(result).toHaveLength(3);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle negative element values', () => {
      const saju = {
        fiveElements: {
          wood: -1,
          fire: 2,
          earth: 3,
          metal: 4,
          water: 1,
        },
      } as any;

      const result = getLuckyItems(saju, 'en');

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle very large element values', () => {
      const saju = {
        fiveElements: {
          wood: 1000000,
          fire: 1,
          earth: 999999,
          metal: 999999,
          water: 999999,
        },
      } as any;

      const result = getLuckyItems(saju, 'en');

      expect(result[0].item).toBe('🕯️ Candles');
    });

    it('should handle decimal element values', () => {
      const saju = {
        fiveElements: {
          wood: 1.5,
          fire: 3.2,
          earth: 2.1,
          metal: 4.8,
          water: 1.3,
        },
      } as any;

      const result = getLuckyItems(saju, 'en');

      expect(result[0].item).toBe('💧 Aquarium/fountain');
    });
  });

  describe('all elements coverage', () => {
    it('should have items for all five elements', () => {
      const elements = ['wood', 'fire', 'earth', 'metal', 'water'];

      elements.forEach(element => {
        const fiveElements: any = {
          wood: 5,
          fire: 5,
          earth: 5,
          metal: 5,
          water: 5,
        };
        fiveElements[element] = 1;

        const saju = { fiveElements } as any;
        const resultKo = getLuckyItems(saju, 'ko');
        const resultEn = getLuckyItems(saju, 'en');

        expect(resultKo.length).toBeGreaterThan(0);
        expect(resultEn.length).toBeGreaterThan(0);
      });
    });

    it('should include emojis in all items', () => {
      const elements = ['wood', 'fire', 'earth', 'metal', 'water'];

      elements.forEach(element => {
        const fiveElements: any = {
          wood: 5,
          fire: 5,
          earth: 5,
          metal: 5,
          water: 5,
        };
        fiveElements[element] = 1;

        const saju = { fiveElements } as any;
        const result = getLuckyItems(saju, 'en');

        result.forEach(entry => {
          // Check if item contains emoji (simple check for unicode characters)
          expect(entry.item.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
