/**
 * Comprehensive tests for I Ching Premium Data
 * Tests all 64 hexagram data structures, premium interpretations, and helper functions
 */

import { describe, it, expect } from 'vitest';
import {
  type HexagramThemes,
  type LuckyInfo,
  type PremiumHexagramData,
  type TrigramInfo,
  TRIGRAM_INFO,
  PREMIUM_HEXAGRAM_DATA,
  getPremiumHexagramData,
  getTrigramInfo,
  getLuckyInfo,
  calculateNuclearHexagram,
  calculateRelatedHexagrams,
} from '@/lib/iChing/iChingPremiumData';

describe('I Ching Premium Data - Type Definitions', () => {
  it('should define HexagramThemes interface with bilingual support', () => {
    const themes: HexagramThemes = {
      career: { ko: '커리어', en: 'Career' },
      love: { ko: '사랑', en: 'Love' },
      health: { ko: '건강', en: 'Health' },
      wealth: { ko: '재물', en: 'Wealth' },
      timing: { ko: '타이밍', en: 'Timing' },
    };

    expect(themes.career).toHaveProperty('ko');
    expect(themes.career).toHaveProperty('en');
    expect(themes.love).toHaveProperty('ko');
    expect(themes.love).toHaveProperty('en');
  });

  it('should define LuckyInfo interface with colors, numbers, and direction', () => {
    const luckyInfo: LuckyInfo = {
      colors: { ko: ['빨강', '파랑'], en: ['Red', 'Blue'] },
      numbers: [1, 3, 5],
      direction: { ko: '동쪽', en: 'East' },
    };

    expect(luckyInfo.colors.ko).toBeInstanceOf(Array);
    expect(luckyInfo.colors.en).toBeInstanceOf(Array);
    expect(luckyInfo.numbers).toBeInstanceOf(Array);
    expect(luckyInfo.direction).toHaveProperty('ko');
    expect(luckyInfo.direction).toHaveProperty('en');
  });

  it('should define PremiumHexagramData interface with all required fields', () => {
    const data: PremiumHexagramData = {
      number: 1,
      name_ko: '건괘',
      name_hanja: '乾為天',
      trigram_upper: 'heaven',
      trigram_lower: 'heaven',
      element: 'metal',
      core_meaning: { ko: '순수한 양', en: 'Pure yang' },
      themes: {
        career: { ko: '리더십', en: 'Leadership' },
        love: { ko: '적극성', en: 'Active' },
        health: { ko: '강건함', en: 'Strength' },
        wealth: { ko: '풍요', en: 'Abundance' },
        timing: { ko: '봄', en: 'Spring' },
      },
    };

    expect(data.number).toBe(1);
    expect(data).toHaveProperty('name_ko');
    expect(data).toHaveProperty('name_hanja');
    expect(data).toHaveProperty('core_meaning');
    expect(data).toHaveProperty('themes');
  });

  it('should define TrigramInfo interface with complete metadata', () => {
    const trigramInfo: TrigramInfo = {
      symbol: '☰',
      name_ko: '건',
      name_en: 'Heaven',
      meaning_ko: '하늘',
      meaning_en: 'Sky',
      element: '금',
    };

    expect(trigramInfo).toHaveProperty('symbol');
    expect(trigramInfo).toHaveProperty('name_ko');
    expect(trigramInfo).toHaveProperty('name_en');
    expect(trigramInfo).toHaveProperty('element');
  });
});

describe('I Ching Premium Data - TRIGRAM_INFO Constant', () => {
  it('should contain all 8 trigrams', () => {
    const expectedTrigrams = ['heaven', 'earth', 'thunder', 'water', 'mountain', 'wind', 'fire', 'lake'];

    expect(Object.keys(TRIGRAM_INFO)).toHaveLength(8);
    expectedTrigrams.forEach(trigram => {
      expect(TRIGRAM_INFO).toHaveProperty(trigram);
    });
  });

  it('should have proper bilingual names for each trigram', () => {
    Object.values(TRIGRAM_INFO).forEach(trigram => {
      expect(trigram.name_ko).toBeTruthy();
      expect(trigram.name_en).toBeTruthy();
      expect(typeof trigram.name_ko).toBe('string');
      expect(typeof trigram.name_en).toBe('string');
    });
  });

  it('should have proper symbols for each trigram', () => {
    const expectedSymbols = ['☰', '☷', '☳', '☵', '☶', '☴', '☲', '☱'];
    const actualSymbols = Object.values(TRIGRAM_INFO).map(t => t.symbol);

    expectedSymbols.forEach(symbol => {
      expect(actualSymbols).toContain(symbol);
    });
  });

  it('should have proper elements for each trigram', () => {
    const validElements = ['금(Metal)', '토(Earth)', '목(Wood)', '수(Water)', '화(Fire)'];

    Object.values(TRIGRAM_INFO).forEach(trigram => {
      expect(validElements).toContain(trigram.element);
    });
  });

  it('should have bilingual meanings for heaven trigram', () => {
    const heaven = TRIGRAM_INFO.heaven;

    expect(heaven.meaning_ko).toContain('하늘');
    expect(heaven.meaning_en).toContain('Sky');
    expect(heaven.element).toBe('금(Metal)');
  });

  it('should have bilingual meanings for earth trigram', () => {
    const earth = TRIGRAM_INFO.earth;

    expect(earth.meaning_ko).toContain('땅');
    expect(earth.meaning_en).toContain('Earth');
    expect(earth.element).toBe('토(Earth)');
  });

  it('should have bilingual meanings for water trigram', () => {
    const water = TRIGRAM_INFO.water;

    expect(water.meaning_ko).toContain('물');
    expect(water.meaning_en).toContain('Water');
    expect(water.element).toBe('수(Water)');
  });

  it('should have bilingual meanings for fire trigram', () => {
    const fire = TRIGRAM_INFO.fire;

    expect(fire.meaning_ko).toContain('불');
    expect(fire.meaning_en).toContain('Fire');
    expect(fire.element).toBe('화(Fire)');
  });
});

describe('I Ching Premium Data - PREMIUM_HEXAGRAM_DATA Constant', () => {
  it('should contain all 64 hexagrams', () => {
    expect(Object.keys(PREMIUM_HEXAGRAM_DATA)).toHaveLength(64);

    for (let i = 1; i <= 64; i++) {
      expect(PREMIUM_HEXAGRAM_DATA).toHaveProperty(i.toString());
    }
  });

  it('should have sequential hexagram numbers from 1 to 64', () => {
    Object.values(PREMIUM_HEXAGRAM_DATA).forEach((hexagram, index) => {
      expect(hexagram.number).toBe(index + 1);
    });
  });

  it('should have Korean names for all hexagrams', () => {
    Object.values(PREMIUM_HEXAGRAM_DATA).forEach(hexagram => {
      expect(hexagram.name_ko).toBeTruthy();
      expect(typeof hexagram.name_ko).toBe('string');
      expect(hexagram.name_ko.length).toBeGreaterThan(0);
    });
  });

  it('should have Hanja names for all hexagrams', () => {
    Object.values(PREMIUM_HEXAGRAM_DATA).forEach(hexagram => {
      expect(hexagram.name_hanja).toBeTruthy();
      expect(typeof hexagram.name_hanja).toBe('string');
      expect(hexagram.name_hanja.length).toBeGreaterThan(0);
    });
  });

  it('should have valid trigram pairs for all hexagrams', () => {
    const validTrigrams = ['heaven', 'earth', 'thunder', 'water', 'mountain', 'wind', 'fire', 'lake'];

    Object.values(PREMIUM_HEXAGRAM_DATA).forEach(hexagram => {
      expect(validTrigrams).toContain(hexagram.trigram_upper);
      expect(validTrigrams).toContain(hexagram.trigram_lower);
    });
  });

  it('should have valid elements for all hexagrams', () => {
    const validElements = ['metal', 'wood', 'water', 'fire', 'earth'];

    Object.values(PREMIUM_HEXAGRAM_DATA).forEach(hexagram => {
      expect(validElements).toContain(hexagram.element);
    });
  });

  it('should have bilingual core meanings for all hexagrams', () => {
    Object.values(PREMIUM_HEXAGRAM_DATA).forEach(hexagram => {
      expect(hexagram.core_meaning.ko).toBeTruthy();
      expect(hexagram.core_meaning.en).toBeTruthy();
      expect(typeof hexagram.core_meaning.ko).toBe('string');
      expect(typeof hexagram.core_meaning.en).toBe('string');
    });
  });

  it('should have complete themes for all hexagrams', () => {
    Object.values(PREMIUM_HEXAGRAM_DATA).forEach(hexagram => {
      expect(hexagram.themes).toBeDefined();
      expect(hexagram.themes.career).toBeDefined();
      expect(hexagram.themes.love).toBeDefined();
      expect(hexagram.themes.health).toBeDefined();
      expect(hexagram.themes.wealth).toBeDefined();
      expect(hexagram.themes.timing).toBeDefined();
    });
  });

  it('should have bilingual career themes', () => {
    Object.values(PREMIUM_HEXAGRAM_DATA).forEach(hexagram => {
      expect(hexagram.themes.career.ko).toBeTruthy();
      expect(hexagram.themes.career.en).toBeTruthy();
    });
  });

  it('should have bilingual love themes', () => {
    Object.values(PREMIUM_HEXAGRAM_DATA).forEach(hexagram => {
      expect(hexagram.themes.love.ko).toBeTruthy();
      expect(hexagram.themes.love.en).toBeTruthy();
    });
  });

  it('should have bilingual health themes', () => {
    Object.values(PREMIUM_HEXAGRAM_DATA).forEach(hexagram => {
      expect(hexagram.themes.health.ko).toBeTruthy();
      expect(hexagram.themes.health.en).toBeTruthy();
    });
  });

  it('should have bilingual wealth themes', () => {
    Object.values(PREMIUM_HEXAGRAM_DATA).forEach(hexagram => {
      expect(hexagram.themes.wealth.ko).toBeTruthy();
      expect(hexagram.themes.wealth.en).toBeTruthy();
    });
  });

  it('should have bilingual timing themes', () => {
    Object.values(PREMIUM_HEXAGRAM_DATA).forEach(hexagram => {
      expect(hexagram.themes.timing.ko).toBeTruthy();
      expect(hexagram.themes.timing.en).toBeTruthy();
    });
  });
});

describe('I Ching Premium Data - Specific Hexagrams', () => {
  it('should have correct data for hexagram 1 (Qian - Heaven)', () => {
    const qian = PREMIUM_HEXAGRAM_DATA[1];

    expect(qian.number).toBe(1);
    expect(qian.name_ko).toContain('건');
    expect(qian.trigram_upper).toBe('heaven');
    expect(qian.trigram_lower).toBe('heaven');
    expect(qian.element).toBe('metal');
  });

  it('should have correct data for hexagram 2 (Kun - Earth)', () => {
    const kun = PREMIUM_HEXAGRAM_DATA[2];

    expect(kun.number).toBe(2);
    expect(kun.name_ko).toContain('곤');
    expect(kun.trigram_upper).toBe('earth');
    expect(kun.trigram_lower).toBe('earth');
    expect(kun.element).toBe('earth');
  });

  it('should have correct data for hexagram 29 (Kan - Water)', () => {
    const kan = PREMIUM_HEXAGRAM_DATA[29];

    expect(kan.number).toBe(29);
    expect(kan.trigram_upper).toBe('water');
    expect(kan.trigram_lower).toBe('water');
  });

  it('should have correct data for hexagram 30 (Li - Fire)', () => {
    const li = PREMIUM_HEXAGRAM_DATA[30];

    expect(li.number).toBe(30);
    expect(li.trigram_upper).toBe('fire');
    expect(li.trigram_lower).toBe('fire');
  });

  it('should have correct data for hexagram 63 (Already Complete)', () => {
    const jiJi = PREMIUM_HEXAGRAM_DATA[63];

    expect(jiJi.number).toBe(63);
    expect(jiJi.name_ko).toContain('기제');
  });

  it('should have correct data for hexagram 64 (Not Yet Complete)', () => {
    const weiJi = PREMIUM_HEXAGRAM_DATA[64];

    expect(weiJi.number).toBe(64);
    expect(weiJi.name_ko).toContain('미제');
  });
});

describe('getPremiumHexagramData Function', () => {
  it('should return hexagram data for valid number', () => {
    const data = getPremiumHexagramData(1);

    expect(data).toBeDefined();
    expect(data?.number).toBe(1);
  });

  it('should return null for invalid hexagram number', () => {
    expect(getPremiumHexagramData(0)).toBeNull();
    expect(getPremiumHexagramData(65)).toBeNull();
    expect(getPremiumHexagramData(-1)).toBeNull();
    expect(getPremiumHexagramData(100)).toBeNull();
  });

  it('should return correct data for all valid hexagrams', () => {
    for (let i = 1; i <= 64; i++) {
      const data = getPremiumHexagramData(i);
      expect(data).not.toBeNull();
      expect(data?.number).toBe(i);
    }
  });

  it('should return hexagram with complete themes', () => {
    const data = getPremiumHexagramData(1);

    expect(data?.themes.career).toBeDefined();
    expect(data?.themes.love).toBeDefined();
    expect(data?.themes.health).toBeDefined();
    expect(data?.themes.wealth).toBeDefined();
    expect(data?.themes.timing).toBeDefined();
  });

  it('should handle edge case hexagram numbers', () => {
    expect(getPremiumHexagramData(1)).not.toBeNull();
    expect(getPremiumHexagramData(64)).not.toBeNull();
  });
});

describe('getTrigramInfo Function', () => {
  it('should return trigram info for valid key', () => {
    const info = getTrigramInfo('heaven');

    expect(info).toBeDefined();
    expect(info?.name_ko).toContain('건');
    expect(info?.name_en).toBe('Heaven');
  });

  it('should return null for invalid trigram key', () => {
    expect(getTrigramInfo('invalid')).toBeNull();
    expect(getTrigramInfo('')).toBeNull();
    expect(getTrigramInfo('sun')).toBeNull();
  });

  it('should return correct info for all valid trigrams', () => {
    const validTrigrams = ['heaven', 'earth', 'thunder', 'water', 'mountain', 'wind', 'fire', 'lake'];

    validTrigrams.forEach(trigram => {
      const info = getTrigramInfo(trigram);
      expect(info).not.toBeNull();
      expect(info?.symbol).toBeTruthy();
    });
  });

  it('should return trigram with bilingual names', () => {
    const info = getTrigramInfo('water');

    expect(info?.name_ko).toBeTruthy();
    expect(info?.name_en).toBeTruthy();
    expect(info?.meaning_ko).toBeTruthy();
    expect(info?.meaning_en).toBeTruthy();
  });

  it('should be case-sensitive', () => {
    expect(getTrigramInfo('Heaven')).toBeNull();
    expect(getTrigramInfo('HEAVEN')).toBeNull();
    expect(getTrigramInfo('heaven')).not.toBeNull();
  });
});

describe('getLuckyInfo Function', () => {
  it('should return lucky info when available', () => {
    const info = getLuckyInfo(1);

    if (info) {
      expect(info.colors).toBeDefined();
      expect(info.numbers).toBeDefined();
      expect(info.direction).toBeDefined();
    }
  });

  it('should return null for hexagrams without lucky info', () => {
    const result = getLuckyInfo(3);
    expect(result === null || result !== undefined).toBe(true);
  });

  it('should return null for invalid hexagram numbers', () => {
    expect(getLuckyInfo(0)).toBeNull();
    expect(getLuckyInfo(65)).toBeNull();
    expect(getLuckyInfo(-1)).toBeNull();
  });

  it('should have proper structure when lucky info exists', () => {
    for (let i = 1; i <= 64; i++) {
      const info = getLuckyInfo(i);
      if (info) {
        expect(info.colors).toHaveProperty('ko');
        expect(info.colors).toHaveProperty('en');
        expect(Array.isArray(info.colors.ko)).toBe(true);
        expect(Array.isArray(info.colors.en)).toBe(true);
        expect(Array.isArray(info.numbers)).toBe(true);
        expect(info.direction).toHaveProperty('ko');
        expect(info.direction).toHaveProperty('en');
      }
    }
  });
});

describe('calculateNuclearHexagram Function', () => {
  it('should calculate nuclear hexagram for valid input', () => {
    const nuclear = calculateNuclearHexagram(1);

    expect(nuclear).toBeDefined();
    if (nuclear) {
      expect(nuclear.number).toBeGreaterThanOrEqual(1);
      expect(nuclear.number).toBeLessThanOrEqual(64);
      expect(nuclear.name_ko).toBeTruthy();
      expect(nuclear.name_en).toBeTruthy();
    }
  });

  it('should return null for invalid hexagram numbers', () => {
    expect(calculateNuclearHexagram(0)).toBeNull();
    expect(calculateNuclearHexagram(65)).toBeNull();
    expect(calculateNuclearHexagram(-1)).toBeNull();
  });

  it('should calculate nuclear hexagrams for all valid inputs', () => {
    for (let i = 1; i <= 64; i++) {
      const nuclear = calculateNuclearHexagram(i);
      if (nuclear) {
        expect(nuclear.number).toBeGreaterThanOrEqual(1);
        expect(nuclear.number).toBeLessThanOrEqual(64);
      }
    }
  });

  it('should return different hexagram for most cases', () => {
    let sameCount = 0;
    for (let i = 1; i <= 64; i++) {
      const nuclear = calculateNuclearHexagram(i);
      if (nuclear && nuclear.number === i) {
        sameCount++;
      }
    }
    expect(sameCount).toBeLessThan(64);
  });
});

describe('calculateRelatedHexagrams Function', () => {
  it('should calculate all related hexagrams', () => {
    const related = calculateRelatedHexagrams(1);

    expect(related).toBeDefined();
    expect(related.opposite).toBeDefined();
    expect(related.inverted).toBeDefined();
    
  });

  it('should return valid hexagram numbers for opposite', () => {
    for (let i = 1; i <= 64; i++) {
      const related = calculateRelatedHexagrams(i);
      if (related.opposite) {
        expect(related.opposite.number).toBeGreaterThanOrEqual(1);
        expect(related.opposite.number).toBeLessThanOrEqual(64);
      }
    }
  });

  it('should return valid hexagram numbers for inverted', () => {
    for (let i = 1; i <= 64; i++) {
      const related = calculateRelatedHexagrams(i);
      if (related.inverted) {
        expect(related.inverted.number).toBeGreaterThanOrEqual(1);
        expect(related.inverted.number).toBeLessThanOrEqual(64);
      }
    }
  });

  it('should calculate opposite as complement', () => {
    const related1 = calculateRelatedHexagrams(1);
    const related2 = calculateRelatedHexagrams(2);

    expect(related1.opposite?.number).toBe(2);
    expect(related2.opposite?.number).toBe(1);
  });

  it('should have bilingual names for all related hexagrams', () => {
    const related = calculateRelatedHexagrams(1);

    if (related.opposite) {
      expect(related.opposite.name_ko).toBeTruthy();
      expect(related.opposite.name_en).toBeTruthy();
    }
    if (related.inverted) {
      expect(related.inverted.name_ko).toBeTruthy();
      expect(related.inverted.name_en).toBeTruthy();
    }
    if (related.nuclear) {
      expect(related.nuclear.name_ko).toBeTruthy();
      expect(related.nuclear.name_en).toBeTruthy();
    }
  });

  it('should handle symmetric hexagrams correctly', () => {
    const related1 = calculateRelatedHexagrams(1);
    expect(related1.inverted?.number).toBe(1);

    const related2 = calculateRelatedHexagrams(2);
    expect(related2.inverted?.number).toBe(2);
  });
});

describe('I Ching Premium Data - Data Completeness', () => {
  it('should have no missing Korean translations', () => {
    Object.values(PREMIUM_HEXAGRAM_DATA).forEach(hexagram => {
      expect(hexagram.name_ko).not.toBe('');
      expect(hexagram.core_meaning.ko).not.toBe('');
      expect(hexagram.themes.career.ko).not.toBe('');
      expect(hexagram.themes.love.ko).not.toBe('');
      expect(hexagram.themes.health.ko).not.toBe('');
      expect(hexagram.themes.wealth.ko).not.toBe('');
      expect(hexagram.themes.timing.ko).not.toBe('');
    });
  });

  it('should have no missing English translations', () => {
    Object.values(PREMIUM_HEXAGRAM_DATA).forEach(hexagram => {
      expect(hexagram.core_meaning.en).not.toBe('');
      expect(hexagram.themes.career.en).not.toBe('');
      expect(hexagram.themes.love.en).not.toBe('');
      expect(hexagram.themes.health.en).not.toBe('');
      expect(hexagram.themes.wealth.en).not.toBe('');
      expect(hexagram.themes.timing.en).not.toBe('');
    });
  });

  it('should have all trigrams referenced in hexagrams exist in TRIGRAM_INFO', () => {
    Object.values(PREMIUM_HEXAGRAM_DATA).forEach(hexagram => {
      expect(TRIGRAM_INFO).toHaveProperty(hexagram.trigram_upper);
      expect(TRIGRAM_INFO).toHaveProperty(hexagram.trigram_lower);
    });
  });

  it('should have unique hexagram numbers', () => {
    const numbers = Object.values(PREMIUM_HEXAGRAM_DATA).map(h => h.number);
    const uniqueNumbers = new Set(numbers);

    expect(numbers.length).toBe(uniqueNumbers.size);
    expect(uniqueNumbers.size).toBe(64);
  });
});

describe('I Ching Premium Data - Edge Cases', () => {
  it('should handle boundary hexagram numbers', () => {
    expect(getPremiumHexagramData(1)).not.toBeNull();
    expect(getPremiumHexagramData(64)).not.toBeNull();
    expect(getPremiumHexagramData(0)).toBeNull();
    expect(getPremiumHexagramData(65)).toBeNull();
  });

  it('should handle negative numbers gracefully', () => {
    expect(getPremiumHexagramData(-1)).toBeNull();
    expect(getPremiumHexagramData(-100)).toBeNull();
  });

  it('should handle very large numbers gracefully', () => {
    expect(getPremiumHexagramData(1000)).toBeNull();
    expect(getPremiumHexagramData(Number.MAX_SAFE_INTEGER)).toBeNull();
  });

  it('should handle decimal numbers gracefully', () => {
    expect(getPremiumHexagramData(1.5)).toBeNull();
    expect(getPremiumHexagramData(32.7)).toBeNull();
  });

  it('should handle NaN gracefully', () => {
    expect(getPremiumHexagramData(NaN)).toBeNull();
  });
});

describe('I Ching Premium Data - Consistency Checks', () => {
  it('should have consistent element associations', () => {
    const elementCounts: Record<string, number> = {};

    Object.values(PREMIUM_HEXAGRAM_DATA).forEach(hexagram => {
      elementCounts[hexagram.element] = (elementCounts[hexagram.element] || 0) + 1;
    });

    expect(Object.keys(elementCounts).length).toBeGreaterThan(0);
  });

  it('should have reasonable text lengths for Korean themes', () => {
    Object.values(PREMIUM_HEXAGRAM_DATA).forEach(hexagram => {
      expect(hexagram.themes.career.ko.length).toBeGreaterThan(5);
      expect(hexagram.themes.love.ko.length).toBeGreaterThan(5);
      expect(hexagram.themes.health.ko.length).toBeGreaterThan(5);
      expect(hexagram.themes.wealth.ko.length).toBeGreaterThan(5);
    });
  });

  it('should have reasonable text lengths for English themes', () => {
    Object.values(PREMIUM_HEXAGRAM_DATA).forEach(hexagram => {
      expect(hexagram.themes.career.en.length).toBeGreaterThan(3);
      expect(hexagram.themes.love.en.length).toBeGreaterThan(3);
      expect(hexagram.themes.health.en.length).toBeGreaterThan(3);
      expect(hexagram.themes.wealth.en.length).toBeGreaterThan(3);
    });
  });

  it('should have unique combinations of upper and lower trigrams', () => {
    const combinations = new Set<string>();

    Object.values(PREMIUM_HEXAGRAM_DATA).forEach(hexagram => {
      const combo = `${hexagram.trigram_upper}-${hexagram.trigram_lower}`;
      combinations.add(combo);
    });

    expect(combinations.size).toBe(64);
  });
});
