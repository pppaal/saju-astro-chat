import { describe, it, expect } from 'vitest';
import { formatLongitude, angleDiff, shortestAngle, normalize360, clamp, ZODIAC_SIGNS } from '@/lib/astrology/foundation/utils';

describe('Astrology Utils', () => {
  describe('ZODIAC_SIGNS', () => {
    it('should have 12 zodiac signs', () => {
      expect(ZODIAC_SIGNS.length).toBe(12);
    });

    it('should start with Aries', () => {
      expect(ZODIAC_SIGNS[0]).toBe('Aries');
    });

    it('should end with Pisces', () => {
      expect(ZODIAC_SIGNS[11]).toBe('Pisces');
    });
  });

  describe('formatLongitude', () => {
    it('should format 0 degrees as Aries 0', () => {
      const result = formatLongitude(0);
      expect(result.sign).toBe('Aries');
      expect(result.degree).toBe(0);
      expect(result.minute).toBe(0);
    });

    it('should format 30 degrees as Taurus 0', () => {
      const result = formatLongitude(30);
      expect(result.sign).toBe('Taurus');
      expect(result.degree).toBe(0);
    });

    it('should format 45.5 degrees as Taurus 15deg 30min', () => {
      const result = formatLongitude(45.5);
      expect(result.sign).toBe('Taurus');
      expect(result.degree).toBe(15);
      expect(result.minute).toBe(30);
    });

    it('should handle negative angles', () => {
      const result = formatLongitude(-30);
      expect(result.sign).toBe('Pisces');
      expect(result.degree).toBe(0);
    });

    it('should normalize angles over 360', () => {
      const result = formatLongitude(390);
      expect(result.sign).toBe('Taurus');
      expect(result.degree).toBe(0);
    });

    it('should format output string correctly', () => {
      const result = formatLongitude(45.5);
      expect(result.formatted).toBe('Taurus 15deg 30\'');
    });
  });

  describe('angleDiff', () => {
    it('should return 180 for same angles', () => {
      expect(angleDiff(0, 0)).toBe(180);
      expect(angleDiff(90, 90)).toBe(180);
    });

    it('should return 0 for opposite angles', () => {
      expect(angleDiff(0, 180)).toBe(0);
      expect(angleDiff(90, 270)).toBe(0);
    });

    it('should return 90 for 90-degree angles', () => {
      expect(angleDiff(0, 90)).toBe(90);
      expect(angleDiff(180, 270)).toBe(90);
    });
  });

  describe('shortestAngle', () => {
    it('should return 0 for same angles', () => {
      expect(shortestAngle(0, 0)).toBe(0);
      expect(shortestAngle(90, 90)).toBe(0);
    });

    it('should return 180 for opposite angles', () => {
      expect(shortestAngle(0, 180)).toBe(180);
      expect(shortestAngle(90, 270)).toBe(180);
    });

    it('should return 90 for perpendicular angles', () => {
      expect(shortestAngle(0, 90)).toBe(90);
      expect(shortestAngle(45, 135)).toBe(90);
    });

    it('should handle angles over 360', () => {
      expect(shortestAngle(10, 370)).toBe(0);
    });
  });

  describe('normalize360', () => {
    it('should keep angles between 0-360 as-is', () => {
      expect(normalize360(45)).toBe(45);
      expect(normalize360(180)).toBe(180);
      expect(normalize360(359)).toBe(359);
    });

    it('should normalize negative angles', () => {
      expect(normalize360(-10)).toBe(350);
      expect(normalize360(-90)).toBe(270);
    });

    it('should normalize angles over 360', () => {
      expect(normalize360(370)).toBe(10);
      expect(normalize360(720)).toBe(0);
    });
  });

  describe('clamp', () => {
    it('should clamp values below min', () => {
      expect(clamp(5, 10, 20)).toBe(10);
    });

    it('should clamp values above max', () => {
      expect(clamp(25, 10, 20)).toBe(20);
    });

    it('should keep values within range', () => {
      expect(clamp(15, 10, 20)).toBe(15);
    });

    it('should handle edge values', () => {
      expect(clamp(10, 10, 20)).toBe(10);
      expect(clamp(20, 10, 20)).toBe(20);
    });
  });
});
