import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getIChingData, getIChingDataKo, getIChingDataByLocale } from '@/lib/iChing/iChingDataLoader';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('iChingDataLoader', () => {
  // Reset module cache between tests to test caching behavior
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getIChingData', () => {
    it('should load English I Ching data', async () => {
      const data = await getIChingData();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    it('should return cached data on second call', async () => {
      const data1 = await getIChingData();
      const data2 = await getIChingData();

      expect(data1).toBe(data2); // Same reference = cached
    });

    it('should have hexagrams with expected structure', async () => {
      const data = await getIChingData();

      if (data.length > 0) {
        const hexagram = data[0];
        expect(hexagram).toHaveProperty('number');
        expect(hexagram).toHaveProperty('name');
        expect(hexagram).toHaveProperty('binary');
        expect(hexagram).toHaveProperty('symbol');
      }
    });

    it('should have 64 hexagrams', async () => {
      const data = await getIChingData();

      expect(data.length).toBe(64);
    });

    it('should have hexagrams numbered 1-64', async () => {
      const data = await getIChingData();

      const numbers = data.map(h => h.number);
      expect(numbers).toContain(1);
      expect(numbers).toContain(64);
      expect(new Set(numbers).size).toBe(64);
    });
  });

  describe('getIChingDataKo', () => {
    it('should load Korean I Ching data', async () => {
      const data = await getIChingDataKo();

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    it('should return cached data on second call', async () => {
      const data1 = await getIChingDataKo();
      const data2 = await getIChingDataKo();

      expect(data1).toBe(data2); // Same reference = cached
    });

    it('should have hexagrams with Korean content', async () => {
      const data = await getIChingDataKo();

      if (data.length > 0) {
        const hexagram = data[0];
        expect(hexagram).toHaveProperty('number');
        expect(hexagram).toHaveProperty('name');
        // Korean data should have Korean names
        expect(hexagram.name).toBeDefined();
      }
    });

    it('should have 64 hexagrams', async () => {
      const data = await getIChingDataKo();

      expect(data.length).toBe(64);
    });
  });

  describe('getIChingDataByLocale', () => {
    it('should return Korean data for "ko" locale', async () => {
      const data = await getIChingDataByLocale('ko');

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(64);
    });

    it('should return English data for "en" locale', async () => {
      const data = await getIChingDataByLocale('en');

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(64);
    });

    it('should return English data for unknown locale', async () => {
      const data = await getIChingDataByLocale('fr');

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(64);
    });

    it('should return English data for empty locale', async () => {
      const data = await getIChingDataByLocale('');

      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(64);
    });

    it('should cache Korean and English data separately', async () => {
      const koData1 = await getIChingDataByLocale('ko');
      const enData1 = await getIChingDataByLocale('en');
      const koData2 = await getIChingDataByLocale('ko');
      const enData2 = await getIChingDataByLocale('en');

      expect(koData1).toBe(koData2); // Same KO reference
      expect(enData1).toBe(enData2); // Same EN reference
      expect(koData1).not.toBe(enData1); // Different datasets
    });
  });

  describe('data integrity', () => {
    it('should have consistent hexagram numbers between EN and KO', async () => {
      const enData = await getIChingData();
      const koData = await getIChingDataKo();

      const enNumbers = enData.map(h => h.number).sort((a, b) => a - b);
      const koNumbers = koData.map(h => h.number).sort((a, b) => a - b);

      expect(enNumbers).toEqual(koNumbers);
    });

    it('should have same binary patterns between EN and KO', async () => {
      const enData = await getIChingData();
      const koData = await getIChingDataKo();

      const enMap = new Map(enData.map(h => [h.number, h.binary]));
      const koMap = new Map(koData.map(h => [h.number, h.binary]));

      for (let i = 1; i <= 64; i++) {
        expect(enMap.get(i)).toBe(koMap.get(i));
      }
    });

    it('should have no duplicate hexagram numbers in EN data', async () => {
      const data = await getIChingData();
      const numbers = data.map(h => h.number);
      const uniqueNumbers = new Set(numbers);

      expect(uniqueNumbers.size).toBe(numbers.length);
    });

    it('should have no duplicate hexagram numbers in KO data', async () => {
      const data = await getIChingDataKo();
      const numbers = data.map(h => h.number);
      const uniqueNumbers = new Set(numbers);

      expect(uniqueNumbers.size).toBe(numbers.length);
    });
  });

  describe('hexagram structure validation', () => {
    it('should have all required fields in English hexagrams', async () => {
      const data = await getIChingData();

      data.forEach(hexagram => {
        expect(hexagram.number).toBeGreaterThanOrEqual(1);
        expect(hexagram.number).toBeLessThanOrEqual(64);
        expect(typeof hexagram.name).toBe('string');
        expect(typeof hexagram.binary).toBe('string');
        expect(typeof hexagram.symbol).toBe('string');
        expect(hexagram.name.length).toBeGreaterThan(0);
      });
    });

    it('should have all required fields in Korean hexagrams', async () => {
      const data = await getIChingDataKo();

      data.forEach(hexagram => {
        expect(hexagram.number).toBeGreaterThanOrEqual(1);
        expect(hexagram.number).toBeLessThanOrEqual(64);
        expect(typeof hexagram.name).toBe('string');
        expect(typeof hexagram.binary).toBe('string');
        expect(typeof hexagram.symbol).toBe('string');
        expect(hexagram.name.length).toBeGreaterThan(0);
      });
    });
  });
});
