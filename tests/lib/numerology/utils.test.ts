import { describe, it, expect } from 'vitest';
import { reduceToCore, MASTER_SET } from '@/lib/numerology/utils';

describe('numerology utils', () => {
  describe('MASTER_SET', () => {
    it('should contain master numbers 11, 22, 33', () => {
      expect(MASTER_SET.has(11)).toBe(true);
      expect(MASTER_SET.has(22)).toBe(true);
      expect(MASTER_SET.has(33)).toBe(true);
    });

    it('should not contain non-master numbers', () => {
      expect(MASTER_SET.has(1)).toBe(false);
      expect(MASTER_SET.has(9)).toBe(false);
      expect(MASTER_SET.has(10)).toBe(false);
      expect(MASTER_SET.has(44)).toBe(false);
    });
  });

  describe('reduceToCore', () => {
    it('should reduce single digit numbers to themselves', () => {
      expect(reduceToCore(1)).toBe(1);
      expect(reduceToCore(5)).toBe(5);
      expect(reduceToCore(9)).toBe(9);
    });

    it('should keep master numbers as-is', () => {
      expect(reduceToCore(11)).toBe(11);
      expect(reduceToCore(22)).toBe(22);
      expect(reduceToCore(33)).toBe(33);
    });

    it('should reduce double digit non-master numbers', () => {
      expect(reduceToCore(10)).toBe(1);
      expect(reduceToCore(12)).toBe(3);
      expect(reduceToCore(25)).toBe(7);
    });

    it('should reduce large numbers', () => {
      expect(reduceToCore(123)).toBe(6);
      expect(reduceToCore(999)).toBe(9);
      expect(reduceToCore(1234)).toBe(1);
    });

    it('should handle zero as 1', () => {
      expect(reduceToCore(0)).toBe(1);
    });

    it('should handle negative numbers by taking absolute', () => {
      expect(reduceToCore(-5)).toBe(5);
      expect(reduceToCore(-123)).toBe(6);
    });

    it('should handle non-numeric input as 0 then 1', () => {
      expect(reduceToCore('invalid')).toBe(1);
      expect(reduceToCore(null)).toBe(1);
      expect(reduceToCore(undefined)).toBe(1);
    });

    it('should handle decimal numbers by flooring', () => {
      expect(reduceToCore(12.9)).toBe(3);
      expect(reduceToCore(25.1)).toBe(7);
    });

    it('should handle string numbers', () => {
      expect(reduceToCore('11')).toBe(11);
      expect(reduceToCore('123')).toBe(6);
    });
  });
});
