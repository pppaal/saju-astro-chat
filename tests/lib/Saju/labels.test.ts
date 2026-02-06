import { describe, it, expect } from 'vitest';
import { STEM_LABELS, BRANCH_LABELS } from '@/lib/Saju/constants';

describe('Saju/labels', () => {
  describe('STEM_LABELS', () => {
    describe('structure validation', () => {
      it('should have exactly 10 heavenly stems', () => {
        expect(Object.keys(STEM_LABELS)).toHaveLength(10);
      });

      it('should have hangul and roman properties for each stem', () => {
        Object.values(STEM_LABELS).forEach(label => {
          expect(label).toHaveProperty('hangul');
          expect(label).toHaveProperty('roman');
        });
      });

      it('should have non-empty strings for all properties', () => {
        Object.values(STEM_LABELS).forEach(label => {
          expect(label.hangul.length).toBeGreaterThan(0);
          expect(label.roman.length).toBeGreaterThan(0);
        });
      });
    });

    describe('Chinese character mappings', () => {
      it('should map 甲 correctly', () => {
        expect(STEM_LABELS['甲']).toEqual({ hangul: '갑', roman: 'Gap' });
      });

      it('should map 乙 correctly', () => {
        expect(STEM_LABELS['乙']).toEqual({ hangul: '을', roman: 'Eul' });
      });

      it('should map 丙 correctly', () => {
        expect(STEM_LABELS['丙']).toEqual({ hangul: '병', roman: 'Byeong' });
      });

      it('should map 丁 correctly', () => {
        expect(STEM_LABELS['丁']).toEqual({ hangul: '정', roman: 'Jeong' });
      });

      it('should map 戊 correctly', () => {
        expect(STEM_LABELS['戊']).toEqual({ hangul: '무', roman: 'Mu' });
      });

      it('should map 己 correctly', () => {
        expect(STEM_LABELS['己']).toEqual({ hangul: '기', roman: 'Gi' });
      });

      it('should map 庚 correctly', () => {
        expect(STEM_LABELS['庚']).toEqual({ hangul: '경', roman: 'Gyeong' });
      });

      it('should map 辛 correctly', () => {
        expect(STEM_LABELS['辛']).toEqual({ hangul: '신', roman: 'Sin' });
      });

      it('should map 壬 correctly', () => {
        expect(STEM_LABELS['壬']).toEqual({ hangul: '임', roman: 'Im' });
      });

      it('should map 癸 correctly', () => {
        expect(STEM_LABELS['癸']).toEqual({ hangul: '계', roman: 'Gye' });
      });
    });

    describe('uniqueness', () => {
      it('should have unique hangul values', () => {
        const hangulValues = Object.values(STEM_LABELS).map(l => l.hangul);
        const uniqueHangul = new Set(hangulValues);
        expect(uniqueHangul.size).toBe(10);
      });

      it('should have unique roman values', () => {
        const romanValues = Object.values(STEM_LABELS).map(l => l.roman);
        const uniqueRoman = new Set(romanValues);
        expect(uniqueRoman.size).toBe(10);
      });
    });

    describe('romanization consistency', () => {
      it('should use consistent capitalization', () => {
        Object.values(STEM_LABELS).forEach(label => {
          const firstChar = label.roman.charAt(0);
          expect(firstChar).toBe(firstChar.toUpperCase());
        });
      });

      it('should not have trailing spaces', () => {
        Object.values(STEM_LABELS).forEach(label => {
          expect(label.roman).toBe(label.roman.trim());
          expect(label.hangul).toBe(label.hangul.trim());
        });
      });
    });
  });

  describe('BRANCH_LABELS', () => {
    describe('structure validation', () => {
      it('should have exactly 12 earthly branches', () => {
        expect(Object.keys(BRANCH_LABELS)).toHaveLength(12);
      });

      it('should have hangul and roman properties for each branch', () => {
        Object.values(BRANCH_LABELS).forEach(label => {
          expect(label).toHaveProperty('hangul');
          expect(label).toHaveProperty('roman');
        });
      });

      it('should have non-empty strings for all properties', () => {
        Object.values(BRANCH_LABELS).forEach(label => {
          expect(label.hangul.length).toBeGreaterThan(0);
          expect(label.roman.length).toBeGreaterThan(0);
        });
      });
    });

    describe('Chinese character mappings', () => {
      it('should map 子 correctly', () => {
        expect(BRANCH_LABELS['子']).toEqual({ hangul: '자', roman: 'Ja' });
      });

      it('should map 丑 correctly', () => {
        expect(BRANCH_LABELS['丑']).toEqual({ hangul: '축', roman: 'Chuk' });
      });

      it('should map 寅 correctly', () => {
        expect(BRANCH_LABELS['寅']).toEqual({ hangul: '인', roman: 'In' });
      });

      it('should map 卯 correctly', () => {
        expect(BRANCH_LABELS['卯']).toEqual({ hangul: '묘', roman: 'Myo' });
      });

      it('should map 辰 correctly', () => {
        expect(BRANCH_LABELS['辰']).toEqual({ hangul: '진', roman: 'Jin' });
      });

      it('should map 巳 correctly', () => {
        expect(BRANCH_LABELS['巳']).toEqual({ hangul: '사', roman: 'Sa' });
      });

      it('should map 午 correctly', () => {
        expect(BRANCH_LABELS['午']).toEqual({ hangul: '오', roman: 'O' });
      });

      it('should map 未 correctly', () => {
        expect(BRANCH_LABELS['未']).toEqual({ hangul: '미', roman: 'Mi' });
      });

      it('should map 申 correctly', () => {
        expect(BRANCH_LABELS['申']).toEqual({ hangul: '신', roman: 'Sin' });
      });

      it('should map 酉 correctly', () => {
        expect(BRANCH_LABELS['酉']).toEqual({ hangul: '유', roman: 'Yu' });
      });

      it('should map 戌 correctly', () => {
        expect(BRANCH_LABELS['戌']).toEqual({ hangul: '술', roman: 'Sul' });
      });

      it('should map 亥 correctly', () => {
        expect(BRANCH_LABELS['亥']).toEqual({ hangul: '해', roman: 'Hae' });
      });
    });

    describe('uniqueness', () => {
      it('should have unique hangul values', () => {
        const hangulValues = Object.values(BRANCH_LABELS).map(l => l.hangul);
        const uniqueHangul = new Set(hangulValues);
        expect(uniqueHangul.size).toBe(12);
      });

      it('should have unique roman values', () => {
        const romanValues = Object.values(BRANCH_LABELS).map(l => l.roman);
        const uniqueRoman = new Set(romanValues);
        expect(uniqueRoman.size).toBe(12);
      });
    });

    describe('romanization consistency', () => {
      it('should use consistent capitalization', () => {
        Object.values(BRANCH_LABELS).forEach(label => {
          const firstChar = label.roman.charAt(0);
          expect(firstChar).toBe(firstChar.toUpperCase());
        });
      });

      it('should not have trailing spaces', () => {
        Object.values(BRANCH_LABELS).forEach(label => {
          expect(label.roman).toBe(label.roman.trim());
          expect(label.hangul).toBe(label.hangul.trim());
        });
      });
    });
  });

  describe('integration tests', () => {
    it('should have different counts for stems and branches', () => {
      expect(Object.keys(STEM_LABELS).length).toBe(10);
      expect(Object.keys(BRANCH_LABELS).length).toBe(12);
    });

    it('should have no overlapping Chinese characters between stems and branches', () => {
      const stemKeys = new Set(Object.keys(STEM_LABELS));
      const branchKeys = new Set(Object.keys(BRANCH_LABELS));

      stemKeys.forEach(key => {
        expect(branchKeys.has(key)).toBe(false);
      });
    });

    it('should use consistent data structure across stems and branches', () => {
      const stemProps = Object.keys(Object.values(STEM_LABELS)[0]).sort();
      const branchProps = Object.keys(Object.values(BRANCH_LABELS)[0]).sort();

      expect(stemProps).toEqual(branchProps);
      expect(stemProps).toEqual(['hangul', 'roman']);
    });

    it('should have matching hangul lengths (single character)', () => {
      Object.values(STEM_LABELS).forEach(label => {
        expect(label.hangul.length).toBe(1);
      });

      Object.values(BRANCH_LABELS).forEach(label => {
        expect(label.hangul.length).toBe(1);
      });
    });

    it('should have "신" appearing in both stems and branches with same romanization', () => {
      expect(STEM_LABELS['辛'].hangul).toBe('신');
      expect(BRANCH_LABELS['申'].hangul).toBe('신');
      expect(STEM_LABELS['辛'].roman).toBe('Sin');
      expect(BRANCH_LABELS['申'].roman).toBe('Sin');
    });
  });
});
