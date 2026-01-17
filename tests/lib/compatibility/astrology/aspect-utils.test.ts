/**
 * Aspect Utils Tests
 * Tests for aspect calculation utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  determineAspectType,
  isAspectHarmonious,
  calculateAspectStrength,
  getAspectInterpretation,
} from '@/lib/compatibility/astrology/aspect-utils';

describe('determineAspectType', () => {
  describe('conjunction (0°)', () => {
    it('exact conjunction', () => {
      const result = determineAspectType(0);
      expect(result.type).toBe('conjunction');
      expect(result.orb).toBe(0);
    });

    it('conjunction within orb', () => {
      const result = determineAspectType(8);
      expect(result.type).toBe('conjunction');
      expect(result.orb).toBe(8);
    });

    it('conjunction at max orb', () => {
      const result = determineAspectType(10);
      expect(result.type).toBe('conjunction');
      expect(result.orb).toBe(10);
    });
  });

  describe('sextile (60°)', () => {
    it('exact sextile', () => {
      const result = determineAspectType(60);
      expect(result.type).toBe('sextile');
      expect(result.orb).toBe(0);
    });

    it('sextile within orb', () => {
      const result = determineAspectType(63);
      expect(result.type).toBe('sextile');
      expect(result.orb).toBe(3);
    });
  });

  describe('square (90°)', () => {
    it('exact square', () => {
      const result = determineAspectType(90);
      expect(result.type).toBe('square');
      expect(result.orb).toBe(0);
    });

    it('square within orb', () => {
      const result = determineAspectType(95);
      expect(result.type).toBe('square');
      expect(result.orb).toBe(5);
    });
  });

  describe('trine (120°)', () => {
    it('exact trine', () => {
      const result = determineAspectType(120);
      expect(result.type).toBe('trine');
      expect(result.orb).toBe(0);
    });

    it('trine within orb', () => {
      const result = determineAspectType(125);
      expect(result.type).toBe('trine');
      expect(result.orb).toBe(5);
    });
  });

  describe('opposition (180°)', () => {
    it('exact opposition', () => {
      const result = determineAspectType(180);
      expect(result.type).toBe('opposition');
      expect(result.orb).toBe(0);
    });

    it('opposition within orb', () => {
      const result = determineAspectType(175);
      expect(result.type).toBe('opposition');
      expect(result.orb).toBe(5);
    });
  });

  describe('minor aspects', () => {
    it('semisextile (30°)', () => {
      const result = determineAspectType(30);
      expect(result.type).toBe('semisextile');
      expect(result.orb).toBe(0);
    });

    it('semisquare (45°)', () => {
      const result = determineAspectType(45);
      expect(result.type).toBe('semisquare');
      expect(result.orb).toBe(0);
    });

    it('sesquiquadrate (135°)', () => {
      const result = determineAspectType(135);
      expect(result.type).toBe('sesquiquadrate');
      expect(result.orb).toBe(0);
    });

    it('quincunx (150°)', () => {
      const result = determineAspectType(150);
      expect(result.type).toBe('quincunx');
      expect(result.orb).toBe(0);
    });
  });

  describe('no aspect', () => {
    it('returns null for angle without aspect', () => {
      const result = determineAspectType(75);
      expect(result.type).toBeNull();
      expect(result.orb).toBe(0);
    });

    it('returns null for angle outside all orbs', () => {
      const result = determineAspectType(160);
      expect(result.type).toBeNull();
    });
  });
});

describe('isAspectHarmonious', () => {
  describe('harmonious aspects', () => {
    it('conjunction is harmonious', () => {
      expect(isAspectHarmonious('conjunction')).toBe(true);
    });

    it('sextile is harmonious', () => {
      expect(isAspectHarmonious('sextile')).toBe(true);
    });

    it('trine is harmonious', () => {
      expect(isAspectHarmonious('trine')).toBe(true);
    });

    it('semisextile is harmonious', () => {
      expect(isAspectHarmonious('semisextile')).toBe(true);
    });
  });

  describe('challenging aspects', () => {
    it('square is not harmonious', () => {
      expect(isAspectHarmonious('square')).toBe(false);
    });

    it('opposition is not harmonious', () => {
      expect(isAspectHarmonious('opposition')).toBe(false);
    });

    it('quincunx is not harmonious', () => {
      expect(isAspectHarmonious('quincunx')).toBe(false);
    });

    it('semisquare is not harmonious', () => {
      expect(isAspectHarmonious('semisquare')).toBe(false);
    });

    it('sesquiquadrate is not harmonious', () => {
      expect(isAspectHarmonious('sesquiquadrate')).toBe(false);
    });
  });
});

describe('calculateAspectStrength', () => {
  it('returns 100 for exact aspect (orb 0)', () => {
    expect(calculateAspectStrength(0, 10)).toBe(100);
  });

  it('returns 0 at max orb', () => {
    expect(calculateAspectStrength(10, 10)).toBe(0);
  });

  it('returns 50 at half orb', () => {
    expect(calculateAspectStrength(5, 10)).toBe(50);
  });

  it('returns rounded value', () => {
    expect(calculateAspectStrength(3, 10)).toBe(70);
    expect(calculateAspectStrength(7, 10)).toBe(30);
  });

  it('returns 0 for orb exceeding max', () => {
    expect(calculateAspectStrength(15, 10)).toBe(0);
  });

  it('handles different max orbs', () => {
    expect(calculateAspectStrength(4, 8)).toBe(50);
    expect(calculateAspectStrength(3, 6)).toBe(50);
  });
});

describe('getAspectInterpretation', () => {
  describe('Sun-Moon aspects', () => {
    it('returns Korean interpretation by default', () => {
      const result = getAspectInterpretation('Sun', 'Moon', 'conjunction');
      expect(result).toContain('태양과 달');
    });

    it('returns English interpretation when specified', () => {
      const result = getAspectInterpretation('Sun', 'Moon', 'conjunction', 'en');
      expect(result).toContain('Sun and Moon');
    });

    it('handles different aspect types', () => {
      expect(getAspectInterpretation('Sun', 'Moon', 'trine')).toContain('트라인');
      expect(getAspectInterpretation('Sun', 'Moon', 'square')).toContain('스퀘어');
      expect(getAspectInterpretation('Sun', 'Moon', 'opposition')).toContain('대립');
    });
  });

  describe('Venus-Mars aspects', () => {
    it('returns Korean interpretation', () => {
      const result = getAspectInterpretation('Venus', 'Mars', 'conjunction');
      expect(result).toContain('금성과 화성');
    });

    it('returns English interpretation', () => {
      const result = getAspectInterpretation('Venus', 'Mars', 'conjunction', 'en');
      expect(result).toContain('Venus-Mars');
    });
  });

  describe('unknown planet pairs', () => {
    it('returns general interpretation for unknown pairs', () => {
      const result = getAspectInterpretation('Jupiter', 'Saturn', 'conjunction');
      expect(typeof result).toBe('string');
    });
  });
});
