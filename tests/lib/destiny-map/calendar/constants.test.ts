/**
 * Tests for destiny-map/calendar/constants.ts
 * 천간/지지 상수 및 사주 관계 데이터 테스트
 */
import { describe, it, expect } from 'vitest';
import {
  STEMS,
  BRANCHES,
  STEM_TO_ELEMENT,
  BRANCH_TO_ELEMENT,
  CHEONEUL_GWIIN_MAP,
  JIJANGGAN,
  SAMHAP,
  YUKHAP,
  CHUNG,
  XING,
  HAI,
  SAMJAE_BY_YEAR_BRANCH,
  YEOKMA_BY_YEAR_BRANCH,
  DOHWA_BY_YEAR_BRANCH,
  GEONROK_BY_DAY_STEM,
  SIPSIN_RELATIONS,
  ELEMENT_RELATIONS,
  ZODIAC_TO_ELEMENT,
  AREA_CONFIG,
  type FortuneArea,
} from '@/lib/destiny-map/calendar/constants';

describe('destiny-map/calendar/constants', () => {
  describe('STEMS', () => {
    it('should have exactly 10 stems', () => {
      expect(STEMS).toHaveLength(10);
    });

    it('should start with 甲', () => {
      expect(STEMS[0]).toBe('甲');
    });

    it('should end with 癸', () => {
      expect(STEMS[9]).toBe('癸');
    });

    it('should contain all unique values', () => {
      const unique = new Set(STEMS);
      expect(unique.size).toBe(10);
    });

    it('should contain correct order', () => {
      expect(STEMS).toEqual(['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']);
    });
  });

  describe('BRANCHES', () => {
    it('should have exactly 12 branches', () => {
      expect(BRANCHES).toHaveLength(12);
    });

    it('should start with 子', () => {
      expect(BRANCHES[0]).toBe('子');
    });

    it('should end with 亥', () => {
      expect(BRANCHES[11]).toBe('亥');
    });

    it('should contain all unique values', () => {
      const unique = new Set(BRANCHES);
      expect(unique.size).toBe(12);
    });

    it('should contain correct order', () => {
      expect(BRANCHES).toEqual(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']);
    });
  });

  describe('STEM_TO_ELEMENT', () => {
    it('should map all 10 stems to elements', () => {
      expect(Object.keys(STEM_TO_ELEMENT)).toHaveLength(10);
    });

    it('should map 甲 to wood', () => {
      expect(STEM_TO_ELEMENT['甲']).toBe('wood');
    });

    it('should map 乙 to wood', () => {
      expect(STEM_TO_ELEMENT['乙']).toBe('wood');
    });

    it('should map 丙 to fire', () => {
      expect(STEM_TO_ELEMENT['丙']).toBe('fire');
    });

    it('should map 丁 to fire', () => {
      expect(STEM_TO_ELEMENT['丁']).toBe('fire');
    });

    it('should map 戊 to earth', () => {
      expect(STEM_TO_ELEMENT['戊']).toBe('earth');
    });

    it('should map 己 to earth', () => {
      expect(STEM_TO_ELEMENT['己']).toBe('earth');
    });

    it('should map 庚 to metal', () => {
      expect(STEM_TO_ELEMENT['庚']).toBe('metal');
    });

    it('should map 辛 to metal', () => {
      expect(STEM_TO_ELEMENT['辛']).toBe('metal');
    });

    it('should map 壬 to water', () => {
      expect(STEM_TO_ELEMENT['壬']).toBe('water');
    });

    it('should map 癸 to water', () => {
      expect(STEM_TO_ELEMENT['癸']).toBe('water');
    });

    it('should have 2 stems for each element', () => {
      const elementCounts: Record<string, number> = {};
      Object.values(STEM_TO_ELEMENT).forEach(el => {
        elementCounts[el] = (elementCounts[el] || 0) + 1;
      });
      expect(elementCounts.wood).toBe(2);
      expect(elementCounts.fire).toBe(2);
      expect(elementCounts.earth).toBe(2);
      expect(elementCounts.metal).toBe(2);
      expect(elementCounts.water).toBe(2);
    });
  });

  describe('BRANCH_TO_ELEMENT', () => {
    it('should map all 12 branches to elements', () => {
      expect(Object.keys(BRANCH_TO_ELEMENT)).toHaveLength(12);
    });

    it('should map 子 to water', () => {
      expect(BRANCH_TO_ELEMENT['子']).toBe('water');
    });

    it('should map 午 to fire', () => {
      expect(BRANCH_TO_ELEMENT['午']).toBe('fire');
    });

    it('should map 卯 to wood', () => {
      expect(BRANCH_TO_ELEMENT['卯']).toBe('wood');
    });

    it('should map 酉 to metal', () => {
      expect(BRANCH_TO_ELEMENT['酉']).toBe('metal');
    });

    it('should have earth branches', () => {
      const earthBranches = Object.entries(BRANCH_TO_ELEMENT)
        .filter(([, el]) => el === 'earth')
        .map(([br]) => br);
      expect(earthBranches).toContain('丑');
      expect(earthBranches).toContain('辰');
      expect(earthBranches).toContain('未');
      expect(earthBranches).toContain('戌');
    });
  });

  describe('CHEONEUL_GWIIN_MAP', () => {
    it('should have entries for all stems', () => {
      expect(Object.keys(CHEONEUL_GWIIN_MAP).length).toBeGreaterThan(0);
    });

    it('should map 甲 to array of branches', () => {
      expect(Array.isArray(CHEONEUL_GWIIN_MAP['甲'])).toBe(true);
    });

    it('should have 2 branches for each stem', () => {
      Object.values(CHEONEUL_GWIIN_MAP).forEach(branches => {
        expect(branches.length).toBe(2);
      });
    });

    it('should map 甲 to 丑 and 未', () => {
      expect(CHEONEUL_GWIIN_MAP['甲']).toEqual(['丑', '未']);
    });

    it('should map 乙 to 子 and 申', () => {
      expect(CHEONEUL_GWIIN_MAP['乙']).toEqual(['子', '申']);
    });
  });

  describe('JIJANGGAN', () => {
    it('should have entries for all 12 branches', () => {
      expect(Object.keys(JIJANGGAN)).toHaveLength(12);
    });

    it('should have 정기 for all branches', () => {
      Object.values(JIJANGGAN).forEach(jj => {
        expect(jj.정기).toBeDefined();
      });
    });

    it('should map 子 to only 정기', () => {
      expect(JIJANGGAN['子']).toEqual({ 정기: '癸' });
    });

    it('should map 丑 to all three types', () => {
      expect(JIJANGGAN['丑']).toHaveProperty('여기');
      expect(JIJANGGAN['丑']).toHaveProperty('중기');
      expect(JIJANGGAN['丑']).toHaveProperty('정기');
    });

    it('should have valid stem values in jijanggan', () => {
      Object.values(JIJANGGAN).forEach(jj => {
        if (jj.여기) expect(STEMS).toContain(jj.여기);
        if (jj.중기) expect(STEMS).toContain(jj.중기);
        expect(STEMS).toContain(jj.정기);
      });
    });
  });

  describe('SAMHAP', () => {
    it('should have 4 element groups', () => {
      expect(Object.keys(SAMHAP)).toHaveLength(4);
    });

    it('should have 3 branches per element', () => {
      Object.values(SAMHAP).forEach(branches => {
        expect(branches).toHaveLength(3);
      });
    });

    it('should map water to 申子辰', () => {
      expect(SAMHAP.water).toEqual(['申', '子', '辰']);
    });

    it('should map wood to 亥卯未', () => {
      expect(SAMHAP.wood).toEqual(['亥', '卯', '未']);
    });

    it('should map fire to 寅午戌', () => {
      expect(SAMHAP.fire).toEqual(['寅', '午', '戌']);
    });

    it('should map metal to 巳酉丑', () => {
      expect(SAMHAP.metal).toEqual(['巳', '酉', '丑']);
    });
  });

  describe('YUKHAP', () => {
    it('should have 12 entries', () => {
      expect(Object.keys(YUKHAP)).toHaveLength(12);
    });

    it('should be bidirectional for 子丑', () => {
      expect(YUKHAP['子']).toBe('丑');
      expect(YUKHAP['丑']).toBe('子');
    });

    it('should be bidirectional for 寅亥', () => {
      expect(YUKHAP['寅']).toBe('亥');
      expect(YUKHAP['亥']).toBe('寅');
    });

    it('should have all branches as keys', () => {
      BRANCHES.forEach(br => {
        expect(YUKHAP[br]).toBeDefined();
      });
    });
  });

  describe('CHUNG', () => {
    it('should have 12 entries', () => {
      expect(Object.keys(CHUNG)).toHaveLength(12);
    });

    it('should be bidirectional for 子午', () => {
      expect(CHUNG['子']).toBe('午');
      expect(CHUNG['午']).toBe('子');
    });

    it('should map opposing branches', () => {
      expect(CHUNG['丑']).toBe('未');
      expect(CHUNG['未']).toBe('丑');
    });

    it('should have all branches as keys', () => {
      BRANCHES.forEach(br => {
        expect(CHUNG[br]).toBeDefined();
      });
    });
  });

  describe('XING', () => {
    it('should have entries for all branches', () => {
      expect(Object.keys(XING)).toHaveLength(12);
    });

    it('should have array values', () => {
      Object.values(XING).forEach(val => {
        expect(Array.isArray(val)).toBe(true);
      });
    });

    it('should map 寅 to 巳申', () => {
      expect(XING['寅']).toContain('巳');
      expect(XING['寅']).toContain('申');
    });

    it('should map self-punishment for 辰', () => {
      expect(XING['辰']).toEqual(['辰']);
    });

    it('should map self-punishment for 午', () => {
      expect(XING['午']).toEqual(['午']);
    });
  });

  describe('HAI', () => {
    it('should have 12 entries', () => {
      expect(Object.keys(HAI)).toHaveLength(12);
    });

    it('should be bidirectional for 子未', () => {
      expect(HAI['子']).toBe('未');
      expect(HAI['未']).toBe('子');
    });

    it('should map 丑 to 午', () => {
      expect(HAI['丑']).toBe('午');
      expect(HAI['午']).toBe('丑');
    });

    it('should have all branches as keys', () => {
      BRANCHES.forEach(br => {
        expect(HAI[br]).toBeDefined();
      });
    });
  });

  describe('SAMJAE_BY_YEAR_BRANCH', () => {
    it('should have entries for all branches', () => {
      expect(Object.keys(SAMJAE_BY_YEAR_BRANCH)).toHaveLength(12);
    });

    it('should have 3 branches per entry', () => {
      Object.values(SAMJAE_BY_YEAR_BRANCH).forEach(branches => {
        expect(branches).toHaveLength(3);
      });
    });

    it('should map 寅 to 申酉戌', () => {
      expect(SAMJAE_BY_YEAR_BRANCH['寅']).toEqual(['申', '酉', '戌']);
    });
  });

  describe('YEOKMA_BY_YEAR_BRANCH', () => {
    it('should have entries for all branches', () => {
      expect(Object.keys(YEOKMA_BY_YEAR_BRANCH)).toHaveLength(12);
    });

    it('should map 寅 to 申', () => {
      expect(YEOKMA_BY_YEAR_BRANCH['寅']).toBe('申');
    });

    it('should map 午 to 申', () => {
      expect(YEOKMA_BY_YEAR_BRANCH['午']).toBe('申');
    });

    it('should have valid branch values', () => {
      Object.values(YEOKMA_BY_YEAR_BRANCH).forEach(br => {
        expect(BRANCHES).toContain(br);
      });
    });
  });

  describe('DOHWA_BY_YEAR_BRANCH', () => {
    it('should have entries for all branches', () => {
      expect(Object.keys(DOHWA_BY_YEAR_BRANCH)).toHaveLength(12);
    });

    it('should map 寅 to 卯', () => {
      expect(DOHWA_BY_YEAR_BRANCH['寅']).toBe('卯');
    });

    it('should have valid branch values', () => {
      Object.values(DOHWA_BY_YEAR_BRANCH).forEach(br => {
        expect(BRANCHES).toContain(br);
      });
    });
  });

  describe('GEONROK_BY_DAY_STEM', () => {
    it('should have entries for all stems', () => {
      expect(Object.keys(GEONROK_BY_DAY_STEM)).toHaveLength(10);
    });

    it('should map 甲 to 寅', () => {
      expect(GEONROK_BY_DAY_STEM['甲']).toBe('寅');
    });

    it('should have valid branch values', () => {
      Object.values(GEONROK_BY_DAY_STEM).forEach(br => {
        expect(BRANCHES).toContain(br);
      });
    });
  });

  describe('SIPSIN_RELATIONS', () => {
    it('should have entries for all 10 stems', () => {
      expect(Object.keys(SIPSIN_RELATIONS)).toHaveLength(10);
    });

    it('should have 10 relations per stem', () => {
      Object.values(SIPSIN_RELATIONS).forEach(relations => {
        expect(Object.keys(relations)).toHaveLength(10);
      });
    });

    it('should map 甲 to itself as 비견', () => {
      expect(SIPSIN_RELATIONS['甲']['甲']).toBe('비견');
    });

    it('should map 甲-乙 as 겁재', () => {
      expect(SIPSIN_RELATIONS['甲']['乙']).toBe('겁재');
    });

    it('should have valid sipsin names', () => {
      const validNames = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
      Object.values(SIPSIN_RELATIONS).forEach(relations => {
        Object.values(relations).forEach(sipsin => {
          expect(validNames).toContain(sipsin);
        });
      });
    });
  });

  describe('ELEMENT_RELATIONS', () => {
    it('should have 5 elements', () => {
      expect(Object.keys(ELEMENT_RELATIONS)).toHaveLength(5);
    });

    it('should have complete relations for each element', () => {
      Object.values(ELEMENT_RELATIONS).forEach(rel => {
        expect(rel).toHaveProperty('generates');
        expect(rel).toHaveProperty('controls');
        expect(rel).toHaveProperty('generatedBy');
        expect(rel).toHaveProperty('controlledBy');
      });
    });

    it('should map wood generates fire', () => {
      expect(ELEMENT_RELATIONS.wood.generates).toBe('fire');
    });

    it('should map fire generates earth', () => {
      expect(ELEMENT_RELATIONS.fire.generates).toBe('earth');
    });

    it('should map earth generates metal', () => {
      expect(ELEMENT_RELATIONS.earth.generates).toBe('metal');
    });

    it('should map metal generates water', () => {
      expect(ELEMENT_RELATIONS.metal.generates).toBe('water');
    });

    it('should map water generates wood', () => {
      expect(ELEMENT_RELATIONS.water.generates).toBe('wood');
    });

    it('should form complete generation cycle', () => {
      let current = 'wood';
      const cycle = [current];
      for (let i = 0; i < 4; i++) {
        current = ELEMENT_RELATIONS[current].generates;
        cycle.push(current);
      }
      expect(cycle).toHaveLength(5);
      expect(ELEMENT_RELATIONS[current].generates).toBe('wood');
    });
  });

  describe('ZODIAC_TO_ELEMENT', () => {
    it('should have 12 zodiac signs', () => {
      expect(Object.keys(ZODIAC_TO_ELEMENT)).toHaveLength(12);
    });

    it('should map fire signs', () => {
      expect(ZODIAC_TO_ELEMENT.Aries).toBe('fire');
      expect(ZODIAC_TO_ELEMENT.Leo).toBe('fire');
      expect(ZODIAC_TO_ELEMENT.Sagittarius).toBe('fire');
    });

    it('should map earth signs', () => {
      expect(ZODIAC_TO_ELEMENT.Taurus).toBe('earth');
      expect(ZODIAC_TO_ELEMENT.Virgo).toBe('earth');
      expect(ZODIAC_TO_ELEMENT.Capricorn).toBe('earth');
    });

    it('should map air signs', () => {
      expect(ZODIAC_TO_ELEMENT.Gemini).toBe('air');
      expect(ZODIAC_TO_ELEMENT.Libra).toBe('air');
      expect(ZODIAC_TO_ELEMENT.Aquarius).toBe('air');
    });

    it('should map water signs', () => {
      expect(ZODIAC_TO_ELEMENT.Cancer).toBe('water');
      expect(ZODIAC_TO_ELEMENT.Scorpio).toBe('water');
      expect(ZODIAC_TO_ELEMENT.Pisces).toBe('water');
    });

    it('should have 3 signs per element', () => {
      const elementCounts: Record<string, number> = {};
      Object.values(ZODIAC_TO_ELEMENT).forEach(el => {
        elementCounts[el] = (elementCounts[el] || 0) + 1;
      });
      expect(elementCounts.fire).toBe(3);
      expect(elementCounts.earth).toBe(3);
      expect(elementCounts.air).toBe(3);
      expect(elementCounts.water).toBe(3);
    });
  });

  describe('AREA_CONFIG', () => {
    it('should have 6 fortune areas', () => {
      expect(Object.keys(AREA_CONFIG)).toHaveLength(6);
    });

    it('should have career config', () => {
      expect(AREA_CONFIG.career).toBeDefined();
    });

    it('should have wealth config', () => {
      expect(AREA_CONFIG.wealth).toBeDefined();
    });

    it('should have love config', () => {
      expect(AREA_CONFIG.love).toBeDefined();
    });

    it('should have health config', () => {
      expect(AREA_CONFIG.health).toBeDefined();
    });

    it('should have study config', () => {
      expect(AREA_CONFIG.study).toBeDefined();
    });

    it('should have travel config', () => {
      expect(AREA_CONFIG.travel).toBeDefined();
    });

    it('should have complete structure for each area', () => {
      Object.values(AREA_CONFIG).forEach(config => {
        expect(config).toHaveProperty('relatedElements');
        expect(config).toHaveProperty('boostSibsin');
        expect(config).toHaveProperty('penaltySibsin');
      });
    });

    it('should have arrays in config', () => {
      Object.values(AREA_CONFIG).forEach(config => {
        expect(Array.isArray(config.relatedElements)).toBe(true);
        expect(Array.isArray(config.boostSibsin)).toBe(true);
        expect(Array.isArray(config.penaltySibsin)).toBe(true);
      });
    });

    it('should have valid elements in career config', () => {
      expect(AREA_CONFIG.career.relatedElements).toContain('metal');
      expect(AREA_CONFIG.career.relatedElements).toContain('earth');
    });

    it('should have valid sipsin in wealth config', () => {
      expect(AREA_CONFIG.wealth.boostSibsin).toContain('정재');
      expect(AREA_CONFIG.wealth.boostSibsin).toContain('편재');
    });
  });
});
