import { describe, it, expect } from 'vitest';
import {
  elementColors,
  stemElement,
  branchElement,
  pillarLabelMap,
  type ElementEN,
} from '@/components/saju/result-display/constants';

describe('saju/result-display/constants', () => {
  describe('elementColors', () => {
    it('should have colors for all five elements', () => {
      expect(elementColors.Wood).toBe('#2dbd7f');
      expect(elementColors.Fire).toBe('#ff6b6b');
      expect(elementColors.Earth).toBe('#f3a73f');
      expect(elementColors.Metal).toBe('#4a90e2');
      expect(elementColors.Water).toBe('#5b6bfa');
    });

    it('should have exactly 5 elements', () => {
      expect(Object.keys(elementColors)).toHaveLength(5);
    });

    it('should have valid hex color codes', () => {
      Object.values(elementColors).forEach(color => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it('should have unique colors', () => {
      const colors = Object.values(elementColors);
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(5);
    });
  });

  describe('stemElement', () => {
    describe('Korean heavenly stems', () => {
      it('should map Wood stems', () => {
        expect(stemElement['갑']).toBe('Wood');
        expect(stemElement['을']).toBe('Wood');
      });

      it('should map Fire stems', () => {
        expect(stemElement['병']).toBe('Fire');
        expect(stemElement['정']).toBe('Fire');
      });

      it('should map Earth stems', () => {
        expect(stemElement['무']).toBe('Earth');
        expect(stemElement['기']).toBe('Earth');
      });

      it('should map Metal stems', () => {
        expect(stemElement['경']).toBe('Metal');
        expect(stemElement['신']).toBe('Metal');
      });

      it('should map Water stems', () => {
        expect(stemElement['임']).toBe('Water');
        expect(stemElement['계']).toBe('Water');
      });
    });

    describe('Chinese heavenly stems', () => {
      it('should map Wood stems', () => {
        expect(stemElement['甲']).toBe('Wood');
        expect(stemElement['乙']).toBe('Wood');
      });

      it('should map Fire stems', () => {
        expect(stemElement['丙']).toBe('Fire');
        expect(stemElement['丁']).toBe('Fire');
      });

      it('should map Earth stems', () => {
        expect(stemElement['戊']).toBe('Earth');
        expect(stemElement['己']).toBe('Earth');
      });

      it('should map Metal stems', () => {
        expect(stemElement['庚']).toBe('Metal');
        expect(stemElement['辛']).toBe('Metal');
      });

      it('should map Water stems', () => {
        expect(stemElement['壬']).toBe('Water');
        expect(stemElement['癸']).toBe('Water');
      });
    });

    it('should have exactly 20 stem mappings (10 Korean + 10 Chinese)', () => {
      expect(Object.keys(stemElement)).toHaveLength(20);
    });

    it('should have 2 stems per element', () => {
      const elementCounts: Record<string, number> = {};
      Object.values(stemElement).forEach(element => {
        elementCounts[element] = (elementCounts[element] || 0) + 1;
      });

      expect(elementCounts.Wood).toBe(4); // 2 Korean + 2 Chinese
      expect(elementCounts.Fire).toBe(4);
      expect(elementCounts.Earth).toBe(4);
      expect(elementCounts.Metal).toBe(4);
      expect(elementCounts.Water).toBe(4);
    });

    it('should have matching Korean and Chinese pairs', () => {
      expect(stemElement['갑']).toBe(stemElement['甲']); // Wood
      expect(stemElement['을']).toBe(stemElement['乙']); // Wood
      expect(stemElement['병']).toBe(stemElement['丙']); // Fire
      expect(stemElement['정']).toBe(stemElement['丁']); // Fire
      expect(stemElement['무']).toBe(stemElement['戊']); // Earth
      expect(stemElement['기']).toBe(stemElement['己']); // Earth
      expect(stemElement['경']).toBe(stemElement['庚']); // Metal
      expect(stemElement['신']).toBe(stemElement['辛']); // Metal
      expect(stemElement['임']).toBe(stemElement['壬']); // Water
      expect(stemElement['계']).toBe(stemElement['癸']); // Water
    });
  });

  describe('branchElement', () => {
    describe('Korean earthly branches', () => {
      it('should map Water branches', () => {
        expect(branchElement['자']).toBe('Water');
        expect(branchElement['해']).toBe('Water');
      });

      it('should map Earth branches', () => {
        expect(branchElement['축']).toBe('Earth');
        expect(branchElement['진']).toBe('Earth');
        expect(branchElement['미']).toBe('Earth');
        expect(branchElement['술']).toBe('Earth');
      });

      it('should map Wood branches', () => {
        expect(branchElement['인']).toBe('Wood');
        expect(branchElement['묘']).toBe('Wood');
      });

      it('should map Fire branches', () => {
        expect(branchElement['사']).toBe('Fire');
        expect(branchElement['오']).toBe('Fire');
      });

      it('should map Metal branches', () => {
        expect(branchElement['신']).toBe('Metal');
        expect(branchElement['유']).toBe('Metal');
      });
    });

    describe('Chinese earthly branches', () => {
      it('should map Water branches', () => {
        expect(branchElement['子']).toBe('Water');
        expect(branchElement['亥']).toBe('Water');
      });

      it('should map Earth branches', () => {
        expect(branchElement['丑']).toBe('Earth');
        expect(branchElement['辰']).toBe('Earth');
        expect(branchElement['未']).toBe('Earth');
        expect(branchElement['戌']).toBe('Earth');
      });

      it('should map Wood branches', () => {
        expect(branchElement['寅']).toBe('Wood');
        expect(branchElement['卯']).toBe('Wood');
      });

      it('should map Fire branches', () => {
        expect(branchElement['巳']).toBe('Fire');
        expect(branchElement['午']).toBe('Fire');
      });

      it('should map Metal branches', () => {
        expect(branchElement['申']).toBe('Metal');
        expect(branchElement['酉']).toBe('Metal');
      });
    });

    it('should have exactly 24 branch mappings (12 Korean + 12 Chinese)', () => {
      expect(Object.keys(branchElement)).toHaveLength(24);
    });

    it('should have correct element distribution', () => {
      const elementCounts: Record<string, number> = {};
      Object.values(branchElement).forEach(element => {
        elementCounts[element] = (elementCounts[element] || 0) + 1;
      });

      expect(elementCounts.Wood).toBe(4); // 2 Korean + 2 Chinese
      expect(elementCounts.Fire).toBe(4);
      expect(elementCounts.Earth).toBe(8); // 4 Korean + 4 Chinese
      expect(elementCounts.Metal).toBe(4);
      expect(elementCounts.Water).toBe(4);
    });

    it('should have matching Korean and Chinese pairs', () => {
      expect(branchElement['자']).toBe(branchElement['子']); // Water
      expect(branchElement['축']).toBe(branchElement['丑']); // Earth
      expect(branchElement['인']).toBe(branchElement['寅']); // Wood
      expect(branchElement['묘']).toBe(branchElement['卯']); // Wood
      expect(branchElement['진']).toBe(branchElement['辰']); // Earth
      expect(branchElement['사']).toBe(branchElement['巳']); // Fire
      expect(branchElement['오']).toBe(branchElement['午']); // Fire
      expect(branchElement['미']).toBe(branchElement['未']); // Earth
      expect(branchElement['신']).toBe(branchElement['申']); // Metal
      expect(branchElement['유']).toBe(branchElement['酉']); // Metal
      expect(branchElement['술']).toBe(branchElement['戌']); // Earth
      expect(branchElement['해']).toBe(branchElement['亥']); // Water
    });
  });

  describe('pillarLabelMap', () => {
    it('should have labels for all four pillars', () => {
      expect(pillarLabelMap.time).toBe('시지');
      expect(pillarLabelMap.day).toBe('일지');
      expect(pillarLabelMap.month).toBe('월지');
      expect(pillarLabelMap.year).toBe('연지');
    });

    it('should have exactly 4 pillars', () => {
      expect(Object.keys(pillarLabelMap)).toHaveLength(4);
    });

    it('should have non-empty Korean labels', () => {
      Object.values(pillarLabelMap).forEach(label => {
        expect(label.length).toBeGreaterThan(0);
      });
    });

    it('should have unique labels', () => {
      const labels = Object.values(pillarLabelMap);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(4);
    });

    it('should use correct Korean terminology', () => {
      expect(pillarLabelMap.time).toContain('시');
      expect(pillarLabelMap.day).toContain('일');
      expect(pillarLabelMap.month).toContain('월');
      expect(pillarLabelMap.year).toContain('연');
    });
  });

  describe('integration and consistency', () => {
    it('should use same element type across all constants', () => {
      const stemElements = new Set(Object.values(stemElement));
      const branchElements = new Set(Object.values(branchElement));
      const colorElements = new Set(Object.keys(elementColors) as ElementEN[]);

      expect(stemElements).toEqual(colorElements);
      branchElements.forEach(element => {
        expect(colorElements.has(element)).toBe(true);
      });
    });

    it('should have consistent element naming', () => {
      const validElements: ElementEN[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

      Object.values(stemElement).forEach(element => {
        expect(validElements).toContain(element);
      });

      Object.values(branchElement).forEach(element => {
        expect(validElements).toContain(element);
      });
    });

    it('should have colors defined for all stem elements', () => {
      const stemElements = new Set(Object.values(stemElement));
      stemElements.forEach(element => {
        expect(elementColors[element]).toBeDefined();
      });
    });

    it('should have colors defined for all branch elements', () => {
      const branchElements = new Set(Object.values(branchElement));
      branchElements.forEach(element => {
        expect(elementColors[element]).toBeDefined();
      });
    });
  });

  describe('element color palette', () => {
    it('should use green-ish color for Wood', () => {
      expect(elementColors.Wood).toBe('#2dbd7f');
    });

    it('should use red color for Fire', () => {
      expect(elementColors.Fire).toBe('#ff6b6b');
    });

    it('should use yellow/orange color for Earth', () => {
      expect(elementColors.Earth).toBe('#f3a73f');
    });

    it('should use blue color for Metal', () => {
      expect(elementColors.Metal).toBe('#4a90e2');
    });

    it('should use blue/purple color for Water', () => {
      expect(elementColors.Water).toBe('#5b6bfa');
    });
  });
});
