import {
  getElementOfChar,
  getGanjiName,
  ELEMENT_COLORS,
  type ElementEN,
} from '@/lib/Saju/stemBranchUtils';

describe('Saju Element Utils', () => {
  describe('ELEMENT_COLORS', () => {
    it('should have colors for all five elements', () => {
      expect(ELEMENT_COLORS.Wood).toBe('#2dbd7f');
      expect(ELEMENT_COLORS.Fire).toBe('#ff6b6b');
      expect(ELEMENT_COLORS.Earth).toBe('#f3a73f');
      expect(ELEMENT_COLORS.Metal).toBe('#4a90e2');
      expect(ELEMENT_COLORS.Water).toBe('#5b6bfa');
    });

    it('should have all colors in hex format', () => {
      Object.values(ELEMENT_COLORS).forEach((color) => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe('getElementOfChar - Heavenly Stems (Korean)', () => {
    it('should return Wood for 갑 and 을', () => {
      expect(getElementOfChar('갑')).toBe('Wood');
      expect(getElementOfChar('을')).toBe('Wood');
    });

    it('should return Fire for 병 and 정', () => {
      expect(getElementOfChar('병')).toBe('Fire');
      expect(getElementOfChar('정')).toBe('Fire');
    });

    it('should return Earth for 무 and 기', () => {
      expect(getElementOfChar('무')).toBe('Earth');
      expect(getElementOfChar('기')).toBe('Earth');
    });

    it('should return Metal for 경 and 신', () => {
      expect(getElementOfChar('경')).toBe('Metal');
      expect(getElementOfChar('신')).toBe('Metal');
    });

    it('should return Water for 임 and 계', () => {
      expect(getElementOfChar('임')).toBe('Water');
      expect(getElementOfChar('계')).toBe('Water');
    });
  });

  describe('getElementOfChar - Heavenly Stems (Chinese)', () => {
    it('should return Wood for 甲 and 乙', () => {
      expect(getElementOfChar('甲')).toBe('Wood');
      expect(getElementOfChar('乙')).toBe('Wood');
    });

    it('should return Fire for 丙 and 丁', () => {
      expect(getElementOfChar('丙')).toBe('Fire');
      expect(getElementOfChar('丁')).toBe('Fire');
    });

    it('should return Earth for 戊 and 己', () => {
      expect(getElementOfChar('戊')).toBe('Earth');
      expect(getElementOfChar('己')).toBe('Earth');
    });

    it('should return Metal for 庚 and 辛', () => {
      expect(getElementOfChar('庚')).toBe('Metal');
      expect(getElementOfChar('辛')).toBe('Metal');
    });

    it('should return Water for 壬 and 癸', () => {
      expect(getElementOfChar('壬')).toBe('Water');
      expect(getElementOfChar('癸')).toBe('Water');
    });
  });

  describe('getElementOfChar - Earthly Branches (Korean)', () => {
    it('should return correct elements for all branches', () => {
      expect(getElementOfChar('자')).toBe('Water');
      expect(getElementOfChar('축')).toBe('Earth');
      expect(getElementOfChar('인')).toBe('Wood');
      expect(getElementOfChar('묘')).toBe('Wood');
      expect(getElementOfChar('진')).toBe('Earth');
      expect(getElementOfChar('사')).toBe('Fire');
      expect(getElementOfChar('오')).toBe('Fire');
      expect(getElementOfChar('미')).toBe('Earth');
      expect(getElementOfChar('신')).toBe('Metal');
      expect(getElementOfChar('유')).toBe('Metal');
      expect(getElementOfChar('술')).toBe('Earth');
      expect(getElementOfChar('해')).toBe('Water');
    });
  });

  describe('getElementOfChar - Earthly Branches (Chinese)', () => {
    it('should return correct elements for all branches', () => {
      expect(getElementOfChar('子')).toBe('Water');
      expect(getElementOfChar('丑')).toBe('Earth');
      expect(getElementOfChar('寅')).toBe('Wood');
      expect(getElementOfChar('卯')).toBe('Wood');
      expect(getElementOfChar('辰')).toBe('Earth');
      expect(getElementOfChar('巳')).toBe('Fire');
      expect(getElementOfChar('午')).toBe('Fire');
      expect(getElementOfChar('未')).toBe('Earth');
      expect(getElementOfChar('申')).toBe('Metal');
      expect(getElementOfChar('酉')).toBe('Metal');
      expect(getElementOfChar('戌')).toBe('Earth');
      expect(getElementOfChar('亥')).toBe('Water');
    });
  });

  describe('getElementOfChar - Invalid input', () => {
    it('should return null for unknown characters', () => {
      expect(getElementOfChar('x')).toBeNull();
      expect(getElementOfChar('A')).toBeNull();
      expect(getElementOfChar('1')).toBeNull();
      expect(getElementOfChar('가')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(getElementOfChar('')).toBeNull();
    });

    it('should return null for special characters', () => {
      expect(getElementOfChar('!')).toBeNull();
      expect(getElementOfChar('@')).toBeNull();
      expect(getElementOfChar('#')).toBeNull();
    });
  });

  describe('getElementOfChar - Element distribution', () => {
    it('should have exactly 2 stems per element', () => {
      const elements = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
      const counts: Record<string, number> = {};

      elements.forEach((char) => {
        const element = getElementOfChar(char);
        if (element) {
          counts[element] = (counts[element] || 0) + 1;
        }
      });

      expect(counts.Wood).toBe(2);
      expect(counts.Fire).toBe(2);
      expect(counts.Earth).toBe(2);
      expect(counts.Metal).toBe(2);
      expect(counts.Water).toBe(2);
    });

    it('should have correct branch element distribution', () => {
      const branches = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
      const counts: Record<string, number> = {};

      branches.forEach((char) => {
        const element = getElementOfChar(char);
        if (element) {
          counts[element] = (counts[element] || 0) + 1;
        }
      });

      expect(counts.Wood).toBe(2); // 인, 묘
      expect(counts.Fire).toBe(2); // 사, 오
      expect(counts.Earth).toBe(4); // 축, 진, 미, 술
      expect(counts.Metal).toBe(2); // 신, 유
      expect(counts.Water).toBe(2); // 자, 해
    });
  });

  describe('getGanjiName', () => {
    it('should return string directly', () => {
      expect(getGanjiName('갑자')).toBe('갑자');
      expect(getGanjiName('乙丑')).toBe('乙丑');
    });

    it('should extract name from object with name property', () => {
      expect(getGanjiName({ name: '병인' })).toBe('병인');
      expect(getGanjiName({ name: '丁卯' })).toBe('丁卯');
    });

    it('should return empty string for null', () => {
      expect(getGanjiName(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(getGanjiName(undefined)).toBe('');
    });

    it('should return empty string for object without name', () => {
      expect(getGanjiName({} as any)).toBe('');
      expect(getGanjiName({ value: 'test' } as any)).toBe('');
    });

    it('should handle object with empty name', () => {
      expect(getGanjiName({ name: '' })).toBe('');
    });

    it('should handle nested objects', () => {
      expect(getGanjiName({ name: '무진', other: { nested: 'value' } })).toBe('무진');
    });

    it('should handle numbers as strings', () => {
      expect(getGanjiName('123')).toBe('123');
    });
  });

  describe('Edge cases and integration', () => {
    it('should handle both Korean and Chinese characters consistently', () => {
      // Same stem in different scripts should return same element
      expect(getElementOfChar('갑')).toBe(getElementOfChar('甲')); // Wood
      expect(getElementOfChar('자')).toBe(getElementOfChar('子')); // Water
    });

    it('should work with typical Ganji pairs', () => {
      const pairs = [
        { kor: '갑자', chi: '甲子', expectedStem: 'Wood', expectedBranch: 'Water' },
        { kor: '을축', chi: '乙丑', expectedStem: 'Wood', expectedBranch: 'Earth' },
        { kor: '병인', chi: '丙寅', expectedStem: 'Fire', expectedBranch: 'Wood' },
      ];

      pairs.forEach(({ kor, chi, expectedStem, expectedBranch }) => {
        // Korean
        expect(getElementOfChar(kor[0])).toBe(expectedStem);
        expect(getElementOfChar(kor[1])).toBe(expectedBranch);

        // Chinese
        expect(getElementOfChar(chi[0])).toBe(expectedStem);
        expect(getElementOfChar(chi[1])).toBe(expectedBranch);
      });
    });

    it('should handle mixed Korean-Chinese input to getGanjiName', () => {
      expect(getGanjiName({ name: '갑甲' })).toBe('갑甲');
    });

    it('should preserve whitespace in ganji names', () => {
      expect(getGanjiName('갑 자')).toBe('갑 자');
      expect(getGanjiName({ name: '甲 子' })).toBe('甲 子');
    });
  });

  describe('Type checking', () => {
    it('should return correct type for all elements', () => {
      const elements: ElementEN[] = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

      elements.forEach((element) => {
        expect(ELEMENT_COLORS[element]).toBeTruthy();
      });
    });

    it('should handle case sensitivity', () => {
      // Korean characters are case-sensitive but these are specific characters
      expect(getElementOfChar('갑')).toBe('Wood');
      expect(getElementOfChar('Ê°')).toBeNull(); // Different character
    });
  });
});
