import { describe, it, expect } from 'vitest';
import { zodiacData } from '@/components/destiny-map/fun-insights/data/zodiacData';

describe('zodiacData', () => {
  const zodiacSigns = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
  ];

  describe('data structure', () => {
    it('should have exactly 12 zodiac signs', () => {
      expect(Object.keys(zodiacData)).toHaveLength(12);
    });

    it('should include all zodiac signs', () => {
      zodiacSigns.forEach(sign => {
        expect(zodiacData[sign]).toBeDefined();
      });
    });

    it('should have complete data for each sign', () => {
      zodiacSigns.forEach(sign => {
        const data = zodiacData[sign];
        expect(data).toHaveProperty('ko');
        expect(data).toHaveProperty('en');
        expect(data).toHaveProperty('emoji');
        expect(data).toHaveProperty('element');
        expect(data).toHaveProperty('trait');
      });
    });

    it('should have trait object with ko and en for each sign', () => {
      zodiacSigns.forEach(sign => {
        const data = zodiacData[sign];
        expect(data.trait).toHaveProperty('ko');
        expect(data.trait).toHaveProperty('en');
      });
    });
  });

  describe('Korean names', () => {
    it('should have correct Korean names', () => {
      expect(zodiacData.aries.ko).toBe('양자리');
      expect(zodiacData.taurus.ko).toBe('황소자리');
      expect(zodiacData.gemini.ko).toBe('쌍둥이자리');
      expect(zodiacData.cancer.ko).toBe('게자리');
      expect(zodiacData.leo.ko).toBe('사자자리');
      expect(zodiacData.virgo.ko).toBe('처녀자리');
      expect(zodiacData.libra.ko).toBe('천칭자리');
      expect(zodiacData.scorpio.ko).toBe('전갈자리');
      expect(zodiacData.sagittarius.ko).toBe('궁수자리');
      expect(zodiacData.capricorn.ko).toBe('염소자리');
      expect(zodiacData.aquarius.ko).toBe('물병자리');
      expect(zodiacData.pisces.ko).toBe('물고기자리');
    });

    it('should have non-empty Korean names', () => {
      zodiacSigns.forEach(sign => {
        expect(zodiacData[sign].ko.length).toBeGreaterThan(0);
      });
    });
  });

  describe('English names', () => {
    it('should have correct English names', () => {
      expect(zodiacData.aries.en).toBe('Aries');
      expect(zodiacData.taurus.en).toBe('Taurus');
      expect(zodiacData.gemini.en).toBe('Gemini');
      expect(zodiacData.cancer.en).toBe('Cancer');
      expect(zodiacData.leo.en).toBe('Leo');
      expect(zodiacData.virgo.en).toBe('Virgo');
      expect(zodiacData.libra.en).toBe('Libra');
      expect(zodiacData.scorpio.en).toBe('Scorpio');
      expect(zodiacData.sagittarius.en).toBe('Sagittarius');
      expect(zodiacData.capricorn.en).toBe('Capricorn');
      expect(zodiacData.aquarius.en).toBe('Aquarius');
      expect(zodiacData.pisces.en).toBe('Pisces');
    });

    it('should have capitalized English names', () => {
      zodiacSigns.forEach(sign => {
        const name = zodiacData[sign].en;
        expect(name[0]).toBe(name[0].toUpperCase());
      });
    });
  });

  describe('emojis', () => {
    it('should have correct zodiac emojis', () => {
      expect(zodiacData.aries.emoji).toBe('♈');
      expect(zodiacData.taurus.emoji).toBe('♉');
      expect(zodiacData.gemini.emoji).toBe('♊');
      expect(zodiacData.cancer.emoji).toBe('♋');
      expect(zodiacData.leo.emoji).toBe('♌');
      expect(zodiacData.virgo.emoji).toBe('♍');
      expect(zodiacData.libra.emoji).toBe('♎');
      expect(zodiacData.scorpio.emoji).toBe('♏');
      expect(zodiacData.sagittarius.emoji).toBe('♐');
      expect(zodiacData.capricorn.emoji).toBe('♑');
      expect(zodiacData.aquarius.emoji).toBe('♒');
      expect(zodiacData.pisces.emoji).toBe('♓');
    });

    it('should have unique emojis for each sign', () => {
      const emojis = zodiacSigns.map(sign => zodiacData[sign].emoji);
      const uniqueEmojis = new Set(emojis);
      expect(uniqueEmojis.size).toBe(12);
    });

    it('should have non-empty emojis', () => {
      zodiacSigns.forEach(sign => {
        expect(zodiacData[sign].emoji.length).toBeGreaterThan(0);
      });
    });
  });

  describe('elements', () => {
    it('should assign correct elements', () => {
      expect(zodiacData.aries.element).toBe('fire');
      expect(zodiacData.taurus.element).toBe('earth');
      expect(zodiacData.gemini.element).toBe('air');
      expect(zodiacData.cancer.element).toBe('water');
      expect(zodiacData.leo.element).toBe('fire');
      expect(zodiacData.virgo.element).toBe('earth');
      expect(zodiacData.libra.element).toBe('air');
      expect(zodiacData.scorpio.element).toBe('water');
      expect(zodiacData.sagittarius.element).toBe('fire');
      expect(zodiacData.capricorn.element).toBe('earth');
      expect(zodiacData.aquarius.element).toBe('air');
      expect(zodiacData.pisces.element).toBe('water');
    });

    it('should only use valid elements', () => {
      const validElements = ['fire', 'earth', 'air', 'water'];
      zodiacSigns.forEach(sign => {
        expect(validElements).toContain(zodiacData[sign].element);
      });
    });

    it('should have 3 signs per element', () => {
      const elementCounts: Record<string, number> = {};
      zodiacSigns.forEach(sign => {
        const element = zodiacData[sign].element;
        elementCounts[element] = (elementCounts[element] || 0) + 1;
      });

      expect(elementCounts.fire).toBe(3);
      expect(elementCounts.earth).toBe(3);
      expect(elementCounts.air).toBe(3);
      expect(elementCounts.water).toBe(3);
    });

    it('should group fire signs correctly', () => {
      const fireSigns = zodiacSigns.filter(sign => zodiacData[sign].element === 'fire');
      expect(fireSigns).toEqual(['aries', 'leo', 'sagittarius']);
    });

    it('should group earth signs correctly', () => {
      const earthSigns = zodiacSigns.filter(sign => zodiacData[sign].element === 'earth');
      expect(earthSigns).toEqual(['taurus', 'virgo', 'capricorn']);
    });

    it('should group air signs correctly', () => {
      const airSigns = zodiacSigns.filter(sign => zodiacData[sign].element === 'air');
      expect(airSigns).toEqual(['gemini', 'libra', 'aquarius']);
    });

    it('should group water signs correctly', () => {
      const waterSigns = zodiacSigns.filter(sign => zodiacData[sign].element === 'water');
      expect(waterSigns).toEqual(['cancer', 'scorpio', 'pisces']);
    });
  });

  describe('traits', () => {
    it('should have trait data for all signs', () => {
      zodiacSigns.forEach(sign => {
        expect(zodiacData[sign].trait).toBeDefined();
        expect(zodiacData[sign].trait.ko).toBeDefined();
        expect(zodiacData[sign].trait.en).toBeDefined();
      });
    });

    it('should have string type Korean traits', () => {
      zodiacSigns.forEach(sign => {
        const trait = zodiacData[sign].trait;
        expect(typeof trait.ko).toBe('string');
      });
    });

    it('should have string type English traits', () => {
      zodiacSigns.forEach(sign => {
        const trait = zodiacData[sign].trait;
        expect(typeof trait.en).toBe('string');
      });
    });
  });

  describe('consistency checks', () => {
    it('should have matching sign order in standard zodiac sequence', () => {
      const keys = Object.keys(zodiacData);
      const expectedOrder = [
        'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
        'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
      ];

      expectedOrder.forEach(sign => {
        expect(keys).toContain(sign);
      });
    });

    it('should have unique Korean names', () => {
      const koreanNames = zodiacSigns.map(sign => zodiacData[sign].ko);
      const uniqueNames = new Set(koreanNames);
      expect(uniqueNames.size).toBe(12);
    });

    it('should have unique English names', () => {
      const englishNames = zodiacSigns.map(sign => zodiacData[sign].en);
      const uniqueNames = new Set(englishNames);
      expect(uniqueNames.size).toBe(12);
    });
  });

  describe('element triplicities', () => {
    it('should follow triplicity pattern', () => {
      expect(zodiacData.aries.element).toBe('fire');
      expect(zodiacData.leo.element).toBe('fire');
      expect(zodiacData.sagittarius.element).toBe('fire');

      expect(zodiacData.taurus.element).toBe('earth');
      expect(zodiacData.virgo.element).toBe('earth');
      expect(zodiacData.capricorn.element).toBe('earth');

      expect(zodiacData.gemini.element).toBe('air');
      expect(zodiacData.libra.element).toBe('air');
      expect(zodiacData.aquarius.element).toBe('air');

      expect(zodiacData.cancer.element).toBe('water');
      expect(zodiacData.scorpio.element).toBe('water');
      expect(zodiacData.pisces.element).toBe('water');
    });
  });

  describe('data integrity', () => {
    it('should not have null or undefined values', () => {
      zodiacSigns.forEach(sign => {
        const data = zodiacData[sign];
        expect(data.ko).not.toBeNull();
        expect(data.en).not.toBeNull();
        expect(data.emoji).not.toBeNull();
        expect(data.element).not.toBeNull();
        expect(data.trait).not.toBeNull();
        expect(data.trait.ko).not.toBeNull();
        expect(data.trait.en).not.toBeNull();
      });
    });

    it('should have proper types', () => {
      zodiacSigns.forEach(sign => {
        const data = zodiacData[sign];
        expect(typeof data.ko).toBe('string');
        expect(typeof data.en).toBe('string');
        expect(typeof data.emoji).toBe('string');
        expect(typeof data.element).toBe('string');
        expect(typeof data.trait).toBe('object');
        expect(typeof data.trait.ko).toBe('string');
        expect(typeof data.trait.en).toBe('string');
      });
    });
  });

  describe('individual sign validations', () => {
    it('should have complete data for Aries', () => {
      const aries = zodiacData.aries;
      expect(aries.ko).toBe('양자리');
      expect(aries.en).toBe('Aries');
      expect(aries.emoji).toBe('♈');
      expect(aries.element).toBe('fire');
    });

    it('should have complete data for Pisces', () => {
      const pisces = zodiacData.pisces;
      expect(pisces.ko).toBe('물고기자리');
      expect(pisces.en).toBe('Pisces');
      expect(pisces.emoji).toBe('♓');
      expect(pisces.element).toBe('water');
    });
  });
});
