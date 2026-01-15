// tests/lib/destiny-map/config/elements.config.test.ts
import { describe, it, expect } from 'vitest';
import {
  ELEMENT_RELATIONS,
  BRANCH_TO_ELEMENT,
  SAMHAP,
  ZODIAC_TO_ELEMENT,
  ELEMENT_KO_TO_EN,
} from '@/lib/destiny-map/config/elements.config';

describe('ELEMENT_RELATIONS', () => {
  const elements = ['wood', 'fire', 'earth', 'metal', 'water'];

  it('should have relations for all five elements', () => {
    elements.forEach(element => {
      expect(ELEMENT_RELATIONS).toHaveProperty(element);
    });
  });

  it('should have complete relations for each element', () => {
    elements.forEach(element => {
      const rel = ELEMENT_RELATIONS[element];
      expect(rel).toHaveProperty('generates');
      expect(rel).toHaveProperty('controls');
      expect(rel).toHaveProperty('generatedBy');
      expect(rel).toHaveProperty('controlledBy');
    });
  });

  it('should follow generation cycle', () => {
    expect(ELEMENT_RELATIONS.wood.generates).toBe('fire');
    expect(ELEMENT_RELATIONS.fire.generates).toBe('earth');
    expect(ELEMENT_RELATIONS.earth.generates).toBe('metal');
    expect(ELEMENT_RELATIONS.metal.generates).toBe('water');
    expect(ELEMENT_RELATIONS.water.generates).toBe('wood');
  });

  it('should follow control cycle', () => {
    expect(ELEMENT_RELATIONS.wood.controls).toBe('earth');
    expect(ELEMENT_RELATIONS.fire.controls).toBe('metal');
    expect(ELEMENT_RELATIONS.earth.controls).toBe('water');
    expect(ELEMENT_RELATIONS.metal.controls).toBe('wood');
    expect(ELEMENT_RELATIONS.water.controls).toBe('fire');
  });

  it('should have reciprocal generation relations', () => {
    elements.forEach(element => {
      const rel = ELEMENT_RELATIONS[element];
      const generated = ELEMENT_RELATIONS[rel.generates];
      expect(generated.generatedBy).toBe(element);
    });
  });
});

describe('BRANCH_TO_ELEMENT', () => {
  it('should have element for all 12 branches', () => {
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    branches.forEach(branch => {
      expect(BRANCH_TO_ELEMENT).toHaveProperty(branch);
    });
  });

  it('should have valid element values', () => {
    const validElements = ['wood', 'fire', 'earth', 'metal', 'water'];
    Object.values(BRANCH_TO_ELEMENT).forEach(element => {
      expect(validElements).toContain(element);
    });
  });

  it('should have correct seasonal elements', () => {
    expect(BRANCH_TO_ELEMENT['子']).toBe('water'); // Winter
    expect(BRANCH_TO_ELEMENT['午']).toBe('fire');  // Summer
    expect(BRANCH_TO_ELEMENT['卯']).toBe('wood');  // Spring
    expect(BRANCH_TO_ELEMENT['酉']).toBe('metal'); // Autumn
  });
});

describe('SAMHAP', () => {
  it('should have samhap for four elements', () => {
    expect(SAMHAP).toHaveProperty('water');
    expect(SAMHAP).toHaveProperty('wood');
    expect(SAMHAP).toHaveProperty('fire');
    expect(SAMHAP).toHaveProperty('metal');
  });

  it('should have three branches for each samhap', () => {
    Object.values(SAMHAP).forEach(branches => {
      expect(branches).toHaveLength(3);
    });
  });

  it('should have valid branch characters', () => {
    const validBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    
    Object.values(SAMHAP).forEach(branches => {
      branches.forEach(branch => {
        expect(validBranches).toContain(branch);
      });
    });
  });
});

describe('ZODIAC_TO_ELEMENT', () => {
  it('should have element for all 12 zodiac signs', () => {
    const signs = [
      'aries', 'taurus', 'gemini', 'cancer',
      'leo', 'virgo', 'libra', 'scorpio',
      'sagittarius', 'capricorn', 'aquarius', 'pisces'
    ];
    
    signs.forEach(sign => {
      expect(ZODIAC_TO_ELEMENT).toHaveProperty(sign);
    });
  });

  it('should have three signs per element', () => {
    const elementCounts = Object.values(ZODIAC_TO_ELEMENT).reduce((acc, element) => {
      acc[element] = (acc[element] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Fire, Earth, Metal, Water should each have 3 signs
    Object.values(elementCounts).forEach(count => {
      expect(count).toBe(3);
    });
  });

  it('should map fire signs correctly', () => {
    expect(ZODIAC_TO_ELEMENT.aries).toBe('fire');
    expect(ZODIAC_TO_ELEMENT.leo).toBe('fire');
    expect(ZODIAC_TO_ELEMENT.sagittarius).toBe('fire');
  });
});

describe('ELEMENT_KO_TO_EN', () => {
  it('should convert Korean elements to English', () => {
    expect(ELEMENT_KO_TO_EN['목']).toBe('wood');
    expect(ELEMENT_KO_TO_EN['화']).toBe('fire');
    expect(ELEMENT_KO_TO_EN['토']).toBe('earth');
    expect(ELEMENT_KO_TO_EN['금']).toBe('metal');
    expect(ELEMENT_KO_TO_EN['수']).toBe('water');
  });

  it('should convert Chinese characters to English', () => {
    expect(ELEMENT_KO_TO_EN['木']).toBe('wood');
    expect(ELEMENT_KO_TO_EN['火']).toBe('fire');
    expect(ELEMENT_KO_TO_EN['土']).toBe('earth');
    expect(ELEMENT_KO_TO_EN['金']).toBe('metal');
    expect(ELEMENT_KO_TO_EN['水']).toBe('water');
  });

  it('should have all valid English element values', () => {
    const validElements = ['wood', 'fire', 'earth', 'metal', 'water'];
    Object.values(ELEMENT_KO_TO_EN).forEach(element => {
      expect(validElements).toContain(element);
    });
  });
});
