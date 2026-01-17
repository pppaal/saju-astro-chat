/**
 * Astrology Element Utils Tests
 * Tests for element compatibility utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  isCompatibleElement,
  isNeutralElement,
  isIncompatibleElement,
  getElementForSign,
  calculateEclipticDegree,
  calculateExactAngle,
  getSignFromDegree,
  getDegreeInSign,
} from '@/lib/compatibility/astrology/element-utils';

describe('isCompatibleElement', () => {
  describe('fire element', () => {
    it('fire is compatible with air', () => {
      expect(isCompatibleElement('fire', 'air')).toBe(true);
    });

    it('fire is compatible with fire', () => {
      expect(isCompatibleElement('fire', 'fire')).toBe(true);
    });

    it('fire is not compatible with water', () => {
      expect(isCompatibleElement('fire', 'water')).toBe(false);
    });

    it('fire is not compatible with earth', () => {
      expect(isCompatibleElement('fire', 'earth')).toBe(false);
    });
  });

  describe('earth element', () => {
    it('earth is compatible with water', () => {
      expect(isCompatibleElement('earth', 'water')).toBe(true);
    });

    it('earth is compatible with earth', () => {
      expect(isCompatibleElement('earth', 'earth')).toBe(true);
    });

    it('earth is not compatible with air', () => {
      expect(isCompatibleElement('earth', 'air')).toBe(false);
    });
  });

  describe('air element', () => {
    it('air is compatible with fire', () => {
      expect(isCompatibleElement('air', 'fire')).toBe(true);
    });

    it('air is compatible with air', () => {
      expect(isCompatibleElement('air', 'air')).toBe(true);
    });
  });

  describe('water element', () => {
    it('water is compatible with earth', () => {
      expect(isCompatibleElement('water', 'earth')).toBe(true);
    });

    it('water is compatible with water', () => {
      expect(isCompatibleElement('water', 'water')).toBe(true);
    });
  });

  it('returns false for unknown elements', () => {
    expect(isCompatibleElement('unknown', 'fire')).toBe(false);
  });
});

describe('isIncompatibleElement', () => {
  it('fire is incompatible with water', () => {
    expect(isIncompatibleElement('fire', 'water')).toBe(true);
    expect(isIncompatibleElement('water', 'fire')).toBe(true);
  });

  it('air is incompatible with earth', () => {
    expect(isIncompatibleElement('air', 'earth')).toBe(true);
    expect(isIncompatibleElement('earth', 'air')).toBe(true);
  });

  it('fire is not incompatible with fire', () => {
    expect(isIncompatibleElement('fire', 'fire')).toBe(false);
  });

  it('returns false for unknown elements', () => {
    expect(isIncompatibleElement('unknown', 'fire')).toBe(false);
  });
});

describe('isNeutralElement', () => {
  it('fire and earth are neutral', () => {
    expect(isNeutralElement('fire', 'earth')).toBe(true);
  });

  it('air and water are neutral', () => {
    expect(isNeutralElement('air', 'water')).toBe(true);
  });

  it('compatible elements are not neutral', () => {
    expect(isNeutralElement('fire', 'air')).toBe(false);
  });

  it('incompatible elements are not neutral', () => {
    expect(isNeutralElement('fire', 'water')).toBe(false);
  });
});

describe('getElementForSign', () => {
  describe('fire signs', () => {
    it('Aries is fire', () => {
      expect(getElementForSign('Aries')).toBe('fire');
    });

    it('Leo is fire', () => {
      expect(getElementForSign('Leo')).toBe('fire');
    });

    it('Sagittarius is fire', () => {
      expect(getElementForSign('Sagittarius')).toBe('fire');
    });
  });

  describe('earth signs', () => {
    it('Taurus is earth', () => {
      expect(getElementForSign('Taurus')).toBe('earth');
    });

    it('Virgo is earth', () => {
      expect(getElementForSign('Virgo')).toBe('earth');
    });

    it('Capricorn is earth', () => {
      expect(getElementForSign('Capricorn')).toBe('earth');
    });
  });

  describe('air signs', () => {
    it('Gemini is air', () => {
      expect(getElementForSign('Gemini')).toBe('air');
    });

    it('Libra is air', () => {
      expect(getElementForSign('Libra')).toBe('air');
    });

    it('Aquarius is air', () => {
      expect(getElementForSign('Aquarius')).toBe('air');
    });
  });

  describe('water signs', () => {
    it('Cancer is water', () => {
      expect(getElementForSign('Cancer')).toBe('water');
    });

    it('Scorpio is water', () => {
      expect(getElementForSign('Scorpio')).toBe('water');
    });

    it('Pisces is water', () => {
      expect(getElementForSign('Pisces')).toBe('water');
    });
  });

  it('returns unknown for invalid sign', () => {
    expect(getElementForSign('Invalid')).toBe('unknown');
  });
});

describe('calculateEclipticDegree', () => {
  it('Aries 0 degrees is 0', () => {
    expect(calculateEclipticDegree('Aries', 0)).toBe(0);
  });

  it('Aries 15 degrees is 15', () => {
    expect(calculateEclipticDegree('Aries', 15)).toBe(15);
  });

  it('Taurus 0 degrees is 30', () => {
    expect(calculateEclipticDegree('Taurus', 0)).toBe(30);
  });

  it('Gemini 0 degrees is 60', () => {
    expect(calculateEclipticDegree('Gemini', 0)).toBe(60);
  });

  it('Leo 15 degrees is 135', () => {
    expect(calculateEclipticDegree('Leo', 15)).toBe(135);
  });

  it('Pisces 29 degrees is 359', () => {
    expect(calculateEclipticDegree('Pisces', 29)).toBe(359);
  });

  it('defaults to 15 degrees if not specified', () => {
    expect(calculateEclipticDegree('Aries')).toBe(15);
    expect(calculateEclipticDegree('Taurus')).toBe(45);
  });

  it('returns 0 for invalid sign', () => {
    expect(calculateEclipticDegree('Invalid', 15)).toBe(0);
  });
});

describe('calculateExactAngle', () => {
  it('calculates angle between 0 and 90', () => {
    expect(calculateExactAngle(0, 90)).toBe(90);
  });

  it('calculates angle between 0 and 180', () => {
    expect(calculateExactAngle(0, 180)).toBe(180);
  });

  it('calculates angle between 0 and 270 as 90', () => {
    expect(calculateExactAngle(0, 270)).toBe(90);
  });

  it('calculates angle between 10 and 20', () => {
    expect(calculateExactAngle(10, 20)).toBe(10);
  });

  it('handles angles > 180 correctly', () => {
    expect(calculateExactAngle(0, 350)).toBe(10);
    expect(calculateExactAngle(350, 0)).toBe(10);
  });

  it('same degree returns 0', () => {
    expect(calculateExactAngle(100, 100)).toBe(0);
  });

  it('handles negative difference', () => {
    expect(calculateExactAngle(100, 90)).toBe(10);
  });
});

describe('getSignFromDegree', () => {
  it('0 degrees is Aries', () => {
    expect(getSignFromDegree(0)).toBe('Aries');
  });

  it('29 degrees is Aries', () => {
    expect(getSignFromDegree(29)).toBe('Aries');
  });

  it('30 degrees is Taurus', () => {
    expect(getSignFromDegree(30)).toBe('Taurus');
  });

  it('60 degrees is Gemini', () => {
    expect(getSignFromDegree(60)).toBe('Gemini');
  });

  it('120 degrees is Leo', () => {
    expect(getSignFromDegree(120)).toBe('Leo');
  });

  it('359 degrees is Pisces', () => {
    expect(getSignFromDegree(359)).toBe('Pisces');
  });

  it('handles negative degrees', () => {
    expect(getSignFromDegree(-30)).toBe('Pisces');
  });

  it('handles degrees > 360', () => {
    expect(getSignFromDegree(390)).toBe('Taurus');
  });
});

describe('getDegreeInSign', () => {
  it('0 ecliptic degree is 0 in sign', () => {
    expect(getDegreeInSign(0)).toBe(0);
  });

  it('15 ecliptic degree is 15 in sign', () => {
    expect(getDegreeInSign(15)).toBe(15);
  });

  it('30 ecliptic degree is 0 in sign', () => {
    expect(getDegreeInSign(30)).toBe(0);
  });

  it('45 ecliptic degree is 15 in sign', () => {
    expect(getDegreeInSign(45)).toBe(15);
  });

  it('359 ecliptic degree is 29 in sign', () => {
    expect(getDegreeInSign(359)).toBe(29);
  });
});
