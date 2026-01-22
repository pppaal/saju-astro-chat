import { describe, it, expect } from 'vitest';
import {
  elementKeyMap,
  tianGanMap,
  elementRelations,
  astroToSaju,
  monthElements,
} from '@/components/destiny-map/fun-insights/data/constants';

describe('destiny-map/fun-insights/data/constants', () => {
  describe('elementKeyMap', () => {
    it('should map Korean Hangul elements to English', () => {
      expect(elementKeyMap['목']).toBe('wood');
      expect(elementKeyMap['화']).toBe('fire');
      expect(elementKeyMap['토']).toBe('earth');
      expect(elementKeyMap['금']).toBe('metal');
      expect(elementKeyMap['수']).toBe('water');
    });

    it('should map Chinese characters to English', () => {
      expect(elementKeyMap['木']).toBe('wood');
      expect(elementKeyMap['火']).toBe('fire');
      expect(elementKeyMap['土']).toBe('earth');
      expect(elementKeyMap['金']).toBe('metal');
      expect(elementKeyMap['水']).toBe('water');
    });

    it('should have exactly 10 mappings (5 Korean + 5 Chinese)', () => {
      expect(Object.keys(elementKeyMap)).toHaveLength(10);
    });

    it('should only map to five element values', () => {
      const values = Object.values(elementKeyMap);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(5);
      expect(uniqueValues).toContain('wood');
      expect(uniqueValues).toContain('fire');
      expect(uniqueValues).toContain('earth');
      expect(uniqueValues).toContain('metal');
      expect(uniqueValues).toContain('water');
    });
  });

  describe('tianGanMap', () => {
    describe('Chinese characters', () => {
      it('should map Chinese heavenly stems to Korean', () => {
        expect(tianGanMap['甲']).toBe('갑');
        expect(tianGanMap['乙']).toBe('을');
        expect(tianGanMap['丙']).toBe('병');
        expect(tianGanMap['丁']).toBe('정');
        expect(tianGanMap['戊']).toBe('무');
        expect(tianGanMap['己']).toBe('기');
        expect(tianGanMap['庚']).toBe('경');
        expect(tianGanMap['辛']).toBe('신');
        expect(tianGanMap['壬']).toBe('임');
        expect(tianGanMap['癸']).toBe('계');
      });
    });

    describe('Romanization', () => {
      it('should map romanized stems to Korean', () => {
        expect(tianGanMap['Gab']).toBe('갑');
        expect(tianGanMap['Eul']).toBe('을');
        expect(tianGanMap['Byung']).toBe('병');
        expect(tianGanMap['Jung']).toBe('정');
        expect(tianGanMap['Mu']).toBe('무');
        expect(tianGanMap['Gi']).toBe('기');
        expect(tianGanMap['Gyung']).toBe('경');
        expect(tianGanMap['Shin']).toBe('신');
        expect(tianGanMap['Im']).toBe('임');
        expect(tianGanMap['Gye']).toBe('계');
      });
    });

    it('should have exactly 20 mappings (10 Chinese + 10 romanized)', () => {
      expect(Object.keys(tianGanMap)).toHaveLength(20);
    });

    it('should only map to 10 unique Korean characters', () => {
      const values = Object.values(tianGanMap);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(10);
    });
  });

  describe('elementRelations', () => {
    describe('generates (생성 관계)', () => {
      it('should define generation cycle correctly', () => {
        expect(elementRelations.generates.wood).toBe('fire');
        expect(elementRelations.generates.fire).toBe('earth');
        expect(elementRelations.generates.earth).toBe('metal');
        expect(elementRelations.generates.metal).toBe('water');
        expect(elementRelations.generates.water).toBe('wood');
      });

      it('should form a complete cycle', () => {
        const cycle = [
          'wood',
          elementRelations.generates.wood,
          elementRelations.generates.fire,
          elementRelations.generates.earth,
          elementRelations.generates.metal,
        ];

        expect(cycle).toEqual(['wood', 'fire', 'earth', 'metal', 'water']);
      });

      it('should have exactly 5 relations', () => {
        expect(Object.keys(elementRelations.generates)).toHaveLength(5);
      });
    });

    describe('controls (극제 관계)', () => {
      it('should define control relationships correctly', () => {
        expect(elementRelations.controls.wood).toBe('earth');
        expect(elementRelations.controls.earth).toBe('water');
        expect(elementRelations.controls.water).toBe('fire');
        expect(elementRelations.controls.fire).toBe('metal');
        expect(elementRelations.controls.metal).toBe('wood');
      });

      it('should form a star pattern (not cyclic)', () => {
        // Controls relationship is pentagram pattern
        expect(elementRelations.controls.wood).not.toBe(elementRelations.generates.wood);
      });

      it('should have exactly 5 relations', () => {
        expect(Object.keys(elementRelations.controls)).toHaveLength(5);
      });
    });

    describe('supportedBy (지원 관계)', () => {
      it('should define support relationships correctly', () => {
        expect(elementRelations.supportedBy.wood).toBe('water');
        expect(elementRelations.supportedBy.fire).toBe('wood');
        expect(elementRelations.supportedBy.earth).toBe('fire');
        expect(elementRelations.supportedBy.metal).toBe('earth');
        expect(elementRelations.supportedBy.water).toBe('metal');
      });

      it('should be inverse of generates relationship', () => {
        // If A generates B, then B is supported by A
        expect(elementRelations.supportedBy.fire).toBe('wood');
        expect(elementRelations.generates.wood).toBe('fire');

        expect(elementRelations.supportedBy.earth).toBe('fire');
        expect(elementRelations.generates.fire).toBe('earth');
      });

      it('should have exactly 5 relations', () => {
        expect(Object.keys(elementRelations.supportedBy)).toHaveLength(5);
      });
    });

    it('should have exactly 3 relationship types', () => {
      expect(Object.keys(elementRelations)).toHaveLength(3);
    });
  });

  describe('astroToSaju', () => {
    it('should map astrology elements to Saju elements', () => {
      expect(astroToSaju.fire).toBe('fire');
      expect(astroToSaju.earth).toBe('earth');
      expect(astroToSaju.air).toBe('metal');
      expect(astroToSaju.water).toBe('water');
    });

    it('should map air to metal (correspondence)', () => {
      expect(astroToSaju.air).toBe('metal');
    });

    it('should not include wood (no direct correspondence)', () => {
      expect(astroToSaju.wood).toBeUndefined();
    });

    it('should have exactly 4 mappings', () => {
      expect(Object.keys(astroToSaju)).toHaveLength(4);
    });

    it('should only map to Saju elements', () => {
      const values = Object.values(astroToSaju);
      values.forEach(value => {
        expect(['wood', 'fire', 'earth', 'metal', 'water']).toContain(value);
      });
    });
  });

  describe('monthElements', () => {
    it('should map each month to an element', () => {
      expect(monthElements[1]).toBe('water');
      expect(monthElements[2]).toBe('wood');
      expect(monthElements[3]).toBe('wood');
      expect(monthElements[4]).toBe('earth');
      expect(monthElements[5]).toBe('fire');
      expect(monthElements[6]).toBe('fire');
      expect(monthElements[7]).toBe('earth');
      expect(monthElements[8]).toBe('metal');
      expect(monthElements[9]).toBe('metal');
      expect(monthElements[10]).toBe('earth');
      expect(monthElements[11]).toBe('water');
      expect(monthElements[12]).toBe('water');
    });

    it('should have exactly 12 months', () => {
      expect(Object.keys(monthElements)).toHaveLength(12);
    });

    it('should cover all 12 months sequentially', () => {
      for (let i = 1; i <= 12; i++) {
        expect(monthElements[i]).toBeDefined();
      }
    });

    it('should only assign valid elements', () => {
      const validElements = ['wood', 'fire', 'earth', 'metal', 'water'];
      Object.values(monthElements).forEach(element => {
        expect(validElements).toContain(element);
      });
    });

    describe('seasonal distribution', () => {
      it('should assign spring months to wood', () => {
        expect(monthElements[2]).toBe('wood'); // February
        expect(monthElements[3]).toBe('wood'); // March
      });

      it('should assign summer months to fire', () => {
        expect(monthElements[5]).toBe('fire'); // May
        expect(monthElements[6]).toBe('fire'); // June
      });

      it('should assign fall months to metal', () => {
        expect(monthElements[8]).toBe('metal'); // August
        expect(monthElements[9]).toBe('metal'); // September
      });

      it('should assign winter months to water', () => {
        expect(monthElements[1]).toBe('water');  // January
        expect(monthElements[11]).toBe('water'); // November
        expect(monthElements[12]).toBe('water'); // December
      });

      it('should assign transition months to earth', () => {
        expect(monthElements[4]).toBe('earth');  // April
        expect(monthElements[7]).toBe('earth');  // July
        expect(monthElements[10]).toBe('earth'); // October
      });
    });

    it('should have earth appearing 3 times (transition months)', () => {
      const earthCount = Object.values(monthElements).filter(e => e === 'earth').length;
      expect(earthCount).toBe(3);
    });

    it('should have each other element appearing at least twice', () => {
      const elementCounts: Record<string, number> = {};
      Object.values(monthElements).forEach(element => {
        elementCounts[element] = (elementCounts[element] || 0) + 1;
      });

      expect(elementCounts.wood).toBeGreaterThanOrEqual(2);
      expect(elementCounts.fire).toBeGreaterThanOrEqual(2);
      expect(elementCounts.metal).toBeGreaterThanOrEqual(2);
      expect(elementCounts.water).toBeGreaterThanOrEqual(2);
    });
  });

  describe('integration tests', () => {
    it('should have consistent element naming across all constants', () => {
      const allElements = [
        ...Object.values(elementKeyMap),
        ...Object.values(astroToSaju),
        ...Object.values(monthElements),
      ];

      const validElements = ['wood', 'fire', 'earth', 'metal', 'water'];
      allElements.forEach(element => {
        expect(validElements).toContain(element);
      });
    });

    it('should support full element cycle through relations', () => {
      // Start with wood and go through generation cycle
      let current = 'wood';
      const cycle = [current];

      for (let i = 0; i < 4; i++) {
        current = elementRelations.generates[current];
        cycle.push(current);
      }

      expect(cycle).toEqual(['wood', 'fire', 'earth', 'metal', 'water']);
    });
  });
});
