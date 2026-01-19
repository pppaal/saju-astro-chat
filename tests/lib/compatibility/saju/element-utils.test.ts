/**
 * Saju Element Utils Tests
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeElement,
  getElementKorean,
  areElementsHarmonious,
  areElementsClashing,
  stemElements,
  getElementFromStem,
  getElementStrength,
} from '@/lib/compatibility/saju/element-utils';

describe('saju/element-utils', () => {
  describe('normalizeElement', () => {
    it('should normalize Korean wood to English', () => {
      expect(normalizeElement('목')).toBe('wood');
    });

    it('should normalize Korean fire to English', () => {
      expect(normalizeElement('화')).toBe('fire');
    });

    it('should normalize Korean earth to English', () => {
      expect(normalizeElement('토')).toBe('earth');
    });

    it('should normalize Korean metal to English', () => {
      expect(normalizeElement('금')).toBe('metal');
    });

    it('should normalize Korean water to English', () => {
      expect(normalizeElement('수')).toBe('water');
    });

    it('should return English element as-is', () => {
      expect(normalizeElement('wood')).toBe('wood');
      expect(normalizeElement('fire')).toBe('fire');
      expect(normalizeElement('earth')).toBe('earth');
      expect(normalizeElement('metal')).toBe('metal');
      expect(normalizeElement('water')).toBe('water');
    });

    it('should return unknown element as-is', () => {
      expect(normalizeElement('unknown')).toBe('unknown');
    });
  });

  describe('getElementKorean', () => {
    it('should get Korean for wood', () => {
      expect(getElementKorean('wood')).toBe('목');
    });

    it('should get Korean for fire', () => {
      expect(getElementKorean('fire')).toBe('화');
    });

    it('should get Korean for earth', () => {
      expect(getElementKorean('earth')).toBe('토');
    });

    it('should get Korean for metal', () => {
      expect(getElementKorean('metal')).toBe('금');
    });

    it('should get Korean for water', () => {
      expect(getElementKorean('water')).toBe('수');
    });

    it('should return input for unknown element', () => {
      expect(getElementKorean('unknown')).toBe('unknown');
    });
  });

  describe('areElementsHarmonious', () => {
    describe('wood harmonies', () => {
      it('should identify wood-water as harmonious (water generates wood)', () => {
        expect(areElementsHarmonious('wood', 'water')).toBe(true);
      });

      it('should identify wood-fire as harmonious (wood generates fire)', () => {
        expect(areElementsHarmonious('wood', 'fire')).toBe(true);
      });
    });

    describe('fire harmonies', () => {
      it('should identify fire-wood as harmonious', () => {
        expect(areElementsHarmonious('fire', 'wood')).toBe(true);
      });

      it('should identify fire-earth as harmonious', () => {
        expect(areElementsHarmonious('fire', 'earth')).toBe(true);
      });
    });

    describe('earth harmonies', () => {
      it('should identify earth-fire as harmonious', () => {
        expect(areElementsHarmonious('earth', 'fire')).toBe(true);
      });

      it('should identify earth-metal as harmonious', () => {
        expect(areElementsHarmonious('earth', 'metal')).toBe(true);
      });
    });

    describe('metal harmonies', () => {
      it('should identify metal-earth as harmonious', () => {
        expect(areElementsHarmonious('metal', 'earth')).toBe(true);
      });

      it('should identify metal-water as harmonious', () => {
        expect(areElementsHarmonious('metal', 'water')).toBe(true);
      });
    });

    describe('water harmonies', () => {
      it('should identify water-metal as harmonious', () => {
        expect(areElementsHarmonious('water', 'metal')).toBe(true);
      });

      it('should identify water-wood as harmonious', () => {
        expect(areElementsHarmonious('water', 'wood')).toBe(true);
      });
    });

    it('should return false for non-harmonious elements', () => {
      expect(areElementsHarmonious('wood', 'metal')).toBe(false);
      expect(areElementsHarmonious('fire', 'water')).toBe(false);
      expect(areElementsHarmonious('earth', 'wood')).toBe(false);
    });

    it('should return false for unknown elements', () => {
      expect(areElementsHarmonious('unknown', 'wood')).toBe(false);
      expect(areElementsHarmonious('wood', 'unknown')).toBe(false);
    });
  });

  describe('areElementsClashing', () => {
    it('should identify wood-metal clash', () => {
      expect(areElementsClashing('wood', 'metal')).toBe(true);
      expect(areElementsClashing('metal', 'wood')).toBe(true);
    });

    it('should identify fire-water clash', () => {
      expect(areElementsClashing('fire', 'water')).toBe(true);
      expect(areElementsClashing('water', 'fire')).toBe(true);
    });

    it('should identify earth-wood clash', () => {
      expect(areElementsClashing('earth', 'wood')).toBe(true);
      expect(areElementsClashing('wood', 'earth')).toBe(true);
    });

    it('should identify metal-fire clash', () => {
      expect(areElementsClashing('metal', 'fire')).toBe(true);
      expect(areElementsClashing('fire', 'metal')).toBe(true);
    });

    it('should identify water-earth clash', () => {
      expect(areElementsClashing('water', 'earth')).toBe(true);
      expect(areElementsClashing('earth', 'water')).toBe(true);
    });

    it('should return false for non-clashing elements', () => {
      expect(areElementsClashing('wood', 'fire')).toBe(false);
      expect(areElementsClashing('water', 'wood')).toBe(false);
    });

    it('should return false for same elements', () => {
      expect(areElementsClashing('wood', 'wood')).toBe(false);
      expect(areElementsClashing('fire', 'fire')).toBe(false);
    });
  });

  describe('stemElements', () => {
    it('should have all 10 heavenly stems', () => {
      expect(Object.keys(stemElements)).toHaveLength(10);
    });

    it('should map wood stems correctly', () => {
      expect(stemElements['甲']).toBe('wood');
      expect(stemElements['乙']).toBe('wood');
    });

    it('should map fire stems correctly', () => {
      expect(stemElements['丙']).toBe('fire');
      expect(stemElements['丁']).toBe('fire');
    });

    it('should map earth stems correctly', () => {
      expect(stemElements['戊']).toBe('earth');
      expect(stemElements['己']).toBe('earth');
    });

    it('should map metal stems correctly', () => {
      expect(stemElements['庚']).toBe('metal');
      expect(stemElements['辛']).toBe('metal');
    });

    it('should map water stems correctly', () => {
      expect(stemElements['壬']).toBe('water');
      expect(stemElements['癸']).toBe('water');
    });
  });

  describe('getElementFromStem', () => {
    it('should get wood from 甲', () => {
      expect(getElementFromStem('甲')).toBe('wood');
    });

    it('should get fire from 丙', () => {
      expect(getElementFromStem('丙')).toBe('fire');
    });

    it('should get earth from 戊', () => {
      expect(getElementFromStem('戊')).toBe('earth');
    });

    it('should get metal from 庚', () => {
      expect(getElementFromStem('庚')).toBe('metal');
    });

    it('should get water from 壬', () => {
      expect(getElementFromStem('壬')).toBe('water');
    });

    it('should return earth for unknown stem', () => {
      expect(getElementFromStem('X')).toBe('earth');
      expect(getElementFromStem('')).toBe('earth');
    });
  });

  describe('getElementStrength', () => {
    const elements = {
      wood: 3,
      fire: 2,
      earth: 1,
      metal: 0,
      water: 4,
    };

    it('should return correct strength for wood', () => {
      expect(getElementStrength(elements, 'wood')).toBe(3);
    });

    it('should return correct strength for fire', () => {
      expect(getElementStrength(elements, 'fire')).toBe(2);
    });

    it('should return correct strength for earth', () => {
      expect(getElementStrength(elements, 'earth')).toBe(1);
    });

    it('should return correct strength for metal', () => {
      expect(getElementStrength(elements, 'metal')).toBe(0);
    });

    it('should return correct strength for water', () => {
      expect(getElementStrength(elements, 'water')).toBe(4);
    });

    it('should return 0 for unknown element', () => {
      expect(getElementStrength(elements, 'unknown')).toBe(0);
    });

    it('should handle empty elements object', () => {
      expect(getElementStrength({}, 'wood')).toBe(0);
    });
  });
});
