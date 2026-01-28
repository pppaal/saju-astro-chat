/**
 * Tests for src/lib/destiny-map/calendar/astrology-aspects.ts
 * 점성학 어스펙트 계산 테스트
 */

import { describe, it, expect } from 'vitest';
import { getAspect, type AspectResult } from '@/lib/destiny-map/calendar/astrology-aspects';

describe('astrology-aspects', () => {
  describe('getAspect', () => {
    // ═══ Conjunction (합, 0°) - ±8° ═══
    describe('Conjunction', () => {
      it('should detect exact conjunction (0°)', () => {
        const result = getAspect(120, 120);
        expect(result).toEqual({ aspect: 'conjunction', orb: 0 });
      });

      it('should detect conjunction within orb (5°)', () => {
        const result = getAspect(120, 125);
        expect(result).toEqual({ aspect: 'conjunction', orb: 5 });
      });

      it('should detect conjunction at boundary (8°)', () => {
        const result = getAspect(100, 108);
        expect(result).toEqual({ aspect: 'conjunction', orb: 8 });
      });

      it('should not detect conjunction beyond orb (9°)', () => {
        const result = getAspect(100, 109);
        expect(result.aspect).not.toBe('conjunction');
      });

      it('should detect conjunction across 0°/360° boundary', () => {
        const result = getAspect(355, 3);
        expect(result).toEqual({ aspect: 'conjunction', orb: 8 });
      });
    });

    // ═══ Sextile (육분, 60°) - ±6° ═══
    describe('Sextile', () => {
      it('should detect exact sextile (60°)', () => {
        const result = getAspect(120, 180);
        expect(result).toEqual({ aspect: 'sextile', orb: 0 });
      });

      it('should detect sextile within orb', () => {
        const result = getAspect(120, 175);
        expect(result.aspect).toBe('sextile');
        expect(result.orb).toBe(5);
      });

      it('should detect sextile at boundary (6°)', () => {
        const result = getAspect(120, 186);
        expect(result.aspect).toBe('sextile');
        expect(result.orb).toBe(6);
      });

      it('should not detect sextile beyond orb (7°)', () => {
        const result = getAspect(120, 187);
        expect(result.aspect).not.toBe('sextile');
      });
    });

    // ═══ Square (사각, 90°) - ±8° ═══
    describe('Square', () => {
      it('should detect exact square (90°)', () => {
        const result = getAspect(90, 180);
        expect(result).toEqual({ aspect: 'square', orb: 0 });
      });

      it('should detect square within orb', () => {
        const result = getAspect(90, 175);
        expect(result.aspect).toBe('square');
        expect(result.orb).toBe(5);
      });

      it('should detect square at boundary (8°)', () => {
        const result = getAspect(90, 188);
        expect(result.aspect).toBe('square');
      });
    });

    // ═══ Trine (삼분, 120°) - ±8° ═══
    describe('Trine', () => {
      it('should detect exact trine (120°)', () => {
        const result = getAspect(120, 240);
        expect(result).toEqual({ aspect: 'trine', orb: 0 });
      });

      it('should detect trine within orb', () => {
        const result = getAspect(0, 123);
        expect(result.aspect).toBe('trine');
        expect(result.orb).toBe(3);
      });

      it('should detect trine at boundary', () => {
        const result = getAspect(0, 128);
        expect(result.aspect).toBe('trine');
        expect(result.orb).toBe(8);
      });
    });

    // ═══ Opposition (충, 180°) - ±8° ═══
    describe('Opposition', () => {
      it('should detect exact opposition (180°)', () => {
        const result = getAspect(45, 225);
        expect(result).toEqual({ aspect: 'opposition', orb: 0 });
      });

      it('should detect opposition within orb', () => {
        const result = getAspect(0, 175);
        expect(result.aspect).toBe('opposition');
        expect(result.orb).toBe(5);
      });

      it('should detect opposition across 0°/360°', () => {
        const result = getAspect(10, 190);
        expect(result).toEqual({ aspect: 'opposition', orb: 0 });
      });
    });

    // ═══ No Aspect ═══
    describe('No aspect', () => {
      it('should return null for 45° (no aspect)', () => {
        const result = getAspect(0, 45);
        expect(result.aspect).toBeNull();
        expect(result.orb).toBe(45);
      });

      it('should return null for 100° (between square and trine)', () => {
        const result = getAspect(0, 100);
        expect(result.aspect).toBeNull();
      });

      it('should return null for 150° (quincunx, not tracked)', () => {
        const result = getAspect(0, 150);
        expect(result.aspect).toBeNull();
      });
    });

    // ═══ Edge cases ═══
    describe('Edge cases', () => {
      it('should handle reversed longitudes', () => {
        const result1 = getAspect(120, 240);
        const result2 = getAspect(240, 120);
        expect(result1).toEqual(result2);
      });

      it('should handle longitude at 0', () => {
        const result = getAspect(0, 0);
        expect(result).toEqual({ aspect: 'conjunction', orb: 0 });
      });

      it('should handle longitude at 360', () => {
        const result = getAspect(0, 360);
        expect(result).toEqual({ aspect: 'conjunction', orb: 0 });
      });

      it('should handle large diff wrapping (e.g. 350 vs 10)', () => {
        // diff = 340, 360 - 340 = 20 → no aspect
        const result = getAspect(350, 10);
        expect(result.aspect).toBeNull();
        expect(result.orb).toBe(20);
      });
    });
  });
});
