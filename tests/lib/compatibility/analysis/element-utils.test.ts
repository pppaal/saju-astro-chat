/**
 * Element Utils Tests
 * Tests for element utility functions in Saju analysis
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeElement,
  getElementKorean,
  areElementsHarmonious,
  areElementsClashing,
  getElementRelation,
  getElementStrength,
} from '@/lib/compatibility/analysis/element-utils';

describe('normalizeElement', () => {
  it('should convert Korean wood to English', () => {
    expect(normalizeElement('목')).toBe('wood');
  });

  it('should convert Korean fire to English', () => {
    expect(normalizeElement('화')).toBe('fire');
  });

  it('should convert Korean earth to English', () => {
    expect(normalizeElement('토')).toBe('earth');
  });

  it('should convert Korean metal to English', () => {
    expect(normalizeElement('금')).toBe('metal');
  });

  it('should convert Korean water to English', () => {
    expect(normalizeElement('수')).toBe('water');
  });

  it('should return English as-is', () => {
    expect(normalizeElement('wood')).toBe('wood');
    expect(normalizeElement('fire')).toBe('fire');
    expect(normalizeElement('earth')).toBe('earth');
    expect(normalizeElement('metal')).toBe('metal');
    expect(normalizeElement('water')).toBe('water');
  });

  it('should return unknown input as-is', () => {
    expect(normalizeElement('unknown')).toBe('unknown');
  });
});

describe('getElementKorean', () => {
  it('should convert wood to Korean', () => {
    expect(getElementKorean('wood')).toBe('목');
  });

  it('should convert fire to Korean', () => {
    expect(getElementKorean('fire')).toBe('화');
  });

  it('should convert earth to Korean', () => {
    expect(getElementKorean('earth')).toBe('토');
  });

  it('should convert metal to Korean', () => {
    expect(getElementKorean('metal')).toBe('금');
  });

  it('should convert water to Korean', () => {
    expect(getElementKorean('water')).toBe('수');
  });

  it('should return unknown input as-is', () => {
    expect(getElementKorean('unknown')).toBe('unknown');
  });
});

describe('areElementsHarmonious', () => {
  describe('generating cycle (상생)', () => {
    it('wood generates fire', () => {
      expect(areElementsHarmonious('wood', 'fire')).toBe(true);
      expect(areElementsHarmonious('fire', 'wood')).toBe(true);
    });

    it('fire generates earth', () => {
      expect(areElementsHarmonious('fire', 'earth')).toBe(true);
      expect(areElementsHarmonious('earth', 'fire')).toBe(true);
    });

    it('earth generates metal', () => {
      expect(areElementsHarmonious('earth', 'metal')).toBe(true);
      expect(areElementsHarmonious('metal', 'earth')).toBe(true);
    });

    it('metal generates water', () => {
      expect(areElementsHarmonious('metal', 'water')).toBe(true);
      expect(areElementsHarmonious('water', 'metal')).toBe(true);
    });

    it('water generates wood', () => {
      expect(areElementsHarmonious('water', 'wood')).toBe(true);
      expect(areElementsHarmonious('wood', 'water')).toBe(true);
    });
  });

  describe('same element', () => {
    it('same elements are harmonious', () => {
      expect(areElementsHarmonious('wood', 'wood')).toBe(true);
      expect(areElementsHarmonious('fire', 'fire')).toBe(true);
      expect(areElementsHarmonious('earth', 'earth')).toBe(true);
      expect(areElementsHarmonious('metal', 'metal')).toBe(true);
      expect(areElementsHarmonious('water', 'water')).toBe(true);
    });
  });

  describe('with Korean input', () => {
    it('works with Korean element names', () => {
      expect(areElementsHarmonious('목', 'fire')).toBe(true);
      expect(areElementsHarmonious('wood', '화')).toBe(true);
      expect(areElementsHarmonious('목', '화')).toBe(true);
    });
  });
});

describe('areElementsClashing', () => {
  describe('controlling cycle (상극)', () => {
    it('wood controls earth', () => {
      expect(areElementsClashing('wood', 'earth')).toBe(true);
      expect(areElementsClashing('earth', 'wood')).toBe(true);
    });

    it('earth controls water', () => {
      expect(areElementsClashing('earth', 'water')).toBe(true);
      expect(areElementsClashing('water', 'earth')).toBe(true);
    });

    it('water controls fire', () => {
      expect(areElementsClashing('water', 'fire')).toBe(true);
      expect(areElementsClashing('fire', 'water')).toBe(true);
    });

    it('fire controls metal', () => {
      expect(areElementsClashing('fire', 'metal')).toBe(true);
      expect(areElementsClashing('metal', 'fire')).toBe(true);
    });

    it('metal controls wood', () => {
      expect(areElementsClashing('metal', 'wood')).toBe(true);
      expect(areElementsClashing('wood', 'metal')).toBe(true);
    });
  });

  describe('non-clashing pairs', () => {
    it('same elements do not clash', () => {
      expect(areElementsClashing('wood', 'wood')).toBe(false);
    });

    it('generating pairs do not clash', () => {
      expect(areElementsClashing('wood', 'fire')).toBe(false);
    });
  });

  describe('with Korean input', () => {
    it('works with Korean element names', () => {
      expect(areElementsClashing('목', 'earth')).toBe(true);
      expect(areElementsClashing('wood', '토')).toBe(true);
    });
  });
});

describe('getElementRelation', () => {
  describe('same relation', () => {
    it('returns same for identical elements', () => {
      expect(getElementRelation('wood', 'wood')).toBe('same');
      expect(getElementRelation('fire', 'fire')).toBe('same');
      expect(getElementRelation('earth', 'earth')).toBe('same');
      expect(getElementRelation('metal', 'metal')).toBe('same');
      expect(getElementRelation('water', 'water')).toBe('same');
    });
  });

  describe('generating relation', () => {
    it('returns generating for generating cycle pairs', () => {
      expect(getElementRelation('wood', 'fire')).toBe('generating');
      expect(getElementRelation('fire', 'earth')).toBe('generating');
      expect(getElementRelation('earth', 'metal')).toBe('generating');
      expect(getElementRelation('metal', 'water')).toBe('generating');
      expect(getElementRelation('water', 'wood')).toBe('generating');
    });

    it('returns generating in both directions', () => {
      expect(getElementRelation('fire', 'wood')).toBe('generating');
      expect(getElementRelation('earth', 'fire')).toBe('generating');
    });
  });

  describe('controlling relation', () => {
    it('returns controlling for controlling cycle pairs', () => {
      expect(getElementRelation('wood', 'earth')).toBe('controlling');
      expect(getElementRelation('earth', 'water')).toBe('controlling');
      expect(getElementRelation('water', 'fire')).toBe('controlling');
      expect(getElementRelation('fire', 'metal')).toBe('controlling');
      expect(getElementRelation('metal', 'wood')).toBe('controlling');
    });

    it('returns controlling in both directions', () => {
      expect(getElementRelation('earth', 'wood')).toBe('controlling');
      expect(getElementRelation('water', 'earth')).toBe('controlling');
    });
  });

  describe('with Korean input', () => {
    it('works with Korean element names', () => {
      expect(getElementRelation('목', '목')).toBe('same');
      expect(getElementRelation('목', '화')).toBe('generating');
      expect(getElementRelation('목', '토')).toBe('controlling');
    });
  });
});

describe('getElementStrength', () => {
  it('returns strength from elementBalance', () => {
    const profile = {
      elementBalance: {
        wood: 30,
        fire: 20,
        earth: 15,
        metal: 25,
        water: 10,
      },
    };

    expect(getElementStrength(profile, 'wood')).toBe(30);
    expect(getElementStrength(profile, 'fire')).toBe(20);
    expect(getElementStrength(profile, 'earth')).toBe(15);
    expect(getElementStrength(profile, 'metal')).toBe(25);
    expect(getElementStrength(profile, 'water')).toBe(10);
  });

  it('returns 0 for missing element', () => {
    const profile = {
      elementBalance: {
        wood: 30,
      },
    };

    expect(getElementStrength(profile, 'fire')).toBe(0);
  });

  it('returns 0 for missing elementBalance', () => {
    const profile = {};
    expect(getElementStrength(profile, 'wood')).toBe(0);
  });

  it('returns 0 for undefined elementBalance', () => {
    const profile = { elementBalance: undefined };
    expect(getElementStrength(profile, 'wood')).toBe(0);
  });

  it('normalizes Korean element names', () => {
    const profile = {
      elementBalance: {
        wood: 30,
      },
    };

    expect(getElementStrength(profile, '목')).toBe(30);
  });
});
