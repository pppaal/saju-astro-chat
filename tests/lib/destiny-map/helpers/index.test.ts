// tests/lib/destiny-map/helpers/index.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getDateInTimezone,
  extractDefaultElements,
  hashName,
  maskDisplayName,
  maskTextWithName,
  cleanseText,
  isJsonResponse,
  REQUIRED_SECTIONS,
  validateSections,
  validateSectionsDetailed,
} from '@/lib/destiny-map/helpers';

describe('destiny-map helpers', () => {
  describe('getDateInTimezone', () => {
    it('should return date in YYYY-MM-DD format without timezone', () => {
      const result = getDateInTimezone();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return date in YYYY-MM-DD format with valid timezone', () => {
      const result = getDateInTimezone('Asia/Seoul');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return date in YYYY-MM-DD format with America timezone', () => {
      const result = getDateInTimezone('America/New_York');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle invalid timezone gracefully', () => {
      const result = getDateInTimezone('Invalid/Timezone');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return UTC date for undefined timezone', () => {
      const result = getDateInTimezone(undefined);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('extractDefaultElements', () => {
    it('should return default five elements', () => {
      const result = extractDefaultElements('');
      expect(result).toHaveProperty('fiveElements');
    });

    it('should have all five elements', () => {
      const result = extractDefaultElements('');
      const { fiveElements } = result;
      expect(fiveElements).toHaveProperty('wood');
      expect(fiveElements).toHaveProperty('fire');
      expect(fiveElements).toHaveProperty('earth');
      expect(fiveElements).toHaveProperty('metal');
      expect(fiveElements).toHaveProperty('water');
    });

    it('should return numeric values for each element', () => {
      const result = extractDefaultElements('');
      const { fiveElements } = result;
      expect(typeof fiveElements.wood).toBe('number');
      expect(typeof fiveElements.fire).toBe('number');
      expect(typeof fiveElements.earth).toBe('number');
      expect(typeof fiveElements.metal).toBe('number');
      expect(typeof fiveElements.water).toBe('number');
    });

    it('should return same values regardless of input text', () => {
      const result1 = extractDefaultElements('');
      const result2 = extractDefaultElements('some text');
      expect(result1).toEqual(result2);
    });

    it('element values should sum to 105', () => {
      const result = extractDefaultElements('');
      const { fiveElements } = result;
      const sum = Object.values(fiveElements).reduce((a, b) => a + b, 0);
      expect(sum).toBe(105);
    });
  });

  describe('security functions (re-exported)', () => {
    it('should export hashName function', () => {
      expect(typeof hashName).toBe('function');
    });

    it('should export maskDisplayName function', () => {
      expect(typeof maskDisplayName).toBe('function');
    });

    it('should export maskTextWithName function', () => {
      expect(typeof maskTextWithName).toBe('function');
    });
  });

  describe('text sanitization (re-exported)', () => {
    it('should export cleanseText function', () => {
      expect(typeof cleanseText).toBe('function');
    });

    it('should export isJsonResponse function', () => {
      expect(typeof isJsonResponse).toBe('function');
    });
  });

  describe('report validation (re-exported)', () => {
    it('should export REQUIRED_SECTIONS constant', () => {
      expect(typeof REQUIRED_SECTIONS).toBe('object');
      expect(REQUIRED_SECTIONS).not.toBeNull();
    });

    it('should export validateSections function', () => {
      expect(typeof validateSections).toBe('function');
    });

    it('should export validateSectionsDetailed function', () => {
      expect(typeof validateSectionsDetailed).toBe('function');
    });
  });
});
