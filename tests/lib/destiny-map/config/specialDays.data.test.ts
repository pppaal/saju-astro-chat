/**
 * SpecialDays Data Tests
 * Tests for Saju lookup tables: shinsal, samhap, napeum, etc.
 */

import { describe, it, expect } from "vitest";
import {
  STEMS_LOCAL,
  BRANCHES_LOCAL,
  SAMJAE_BY_YEAR_BRANCH,
  YEOKMA_BY_YEAR_BRANCH,
  DOHWA_BY_YEAR_BRANCH,
  GEONROK_BY_DAY_STEM,
  SIPSIN_RELATIONS,
  WONJIN,
  GWIMUN,
  BRANCH_MAIN_STEM,
  STEM_COMBO_PAIRS,
  PA,
  HAE,
  CHUNGAN_HAP,
  HWAGAE_BY_YEAR_BRANCH,
  GEOBSAL_BY_YEAR_BRANCH,
  BAEKHO_BY_YEAR_BRANCH,
  CHEONDEOK_BY_MONTH_BRANCH,
  WOLDEOK_BY_MONTH_BRANCH,
  CHEONHEE_BY_YEAR_BRANCH,
  HONGYEOM_BY_YEAR_BRANCH,
  CHEONUI_BY_MONTH_BRANCH,
  JANGSEONG_BY_YEAR_BRANCH,
  BANAN_BY_YEAR_BRANCH,
  MUNCHANG_BY_DAY_STEM,
  HAKDANG_BY_DAY_STEM,
  NAPEUM_ELEMENT_TABLE,
  TWELVE_SPIRITS,
  TWELVE_SPIRITS_MEANINGS,
  TWENTY_EIGHT_MANSIONS,
  HOUR_BRANCH_MEANINGS,
  SOLAR_TERMS,
  SAMHAP_GROUPS,
  BANGHAP_GROUPS,
  SPECIAL_SAL_COMBINATIONS,
  STEM_ELEMENTS,
  BRANCH_ELEMENTS,
  ELEMENT_RELATIONS_LOCAL,
} from "@/lib/destiny-map/config/specialDays.data";

describe("SpecialDays Data Module", () => {
  describe("Basic constants", () => {
    it("STEMS_LOCAL contains 10 heavenly stems", () => {
      expect(STEMS_LOCAL).toHaveLength(10);
      expect(STEMS_LOCAL).toContain("甲");
      expect(STEMS_LOCAL).toContain("癸");
    });

    it("BRANCHES_LOCAL contains 12 earthly branches", () => {
      expect(BRANCHES_LOCAL).toHaveLength(12);
      expect(BRANCHES_LOCAL).toContain("子");
      expect(BRANCHES_LOCAL).toContain("亥");
    });
  });

  describe("SAMJAE_BY_YEAR_BRANCH (삼재)", () => {
    it("covers all 12 branches", () => {
      expect(Object.keys(SAMJAE_BY_YEAR_BRANCH)).toHaveLength(12);
    });

    it("each branch has 3 samjae years", () => {
      for (const branch of BRANCHES_LOCAL) {
        const samjaeYears = SAMJAE_BY_YEAR_BRANCH[branch];
        expect(samjaeYears).toHaveLength(3);
        // Each samjae year should be a valid branch
        for (const year of samjaeYears) {
          expect(BRANCHES_LOCAL).toContain(year);
        }
      }
    });

    it("寅午戌 group has 申酉戌 samjae", () => {
      expect(SAMJAE_BY_YEAR_BRANCH["寅"]).toEqual(["申", "酉", "戌"]);
      expect(SAMJAE_BY_YEAR_BRANCH["午"]).toEqual(["申", "酉", "戌"]);
      expect(SAMJAE_BY_YEAR_BRANCH["戌"]).toEqual(["申", "酉", "戌"]);
    });

    it("巳酉丑 group has 寅卯辰 samjae", () => {
      expect(SAMJAE_BY_YEAR_BRANCH["巳"]).toEqual(["寅", "卯", "辰"]);
      expect(SAMJAE_BY_YEAR_BRANCH["酉"]).toEqual(["寅", "卯", "辰"]);
      expect(SAMJAE_BY_YEAR_BRANCH["丑"]).toEqual(["寅", "卯", "辰"]);
    });
  });

  describe("YEOKMA_BY_YEAR_BRANCH (역마살)", () => {
    it("covers all 12 branches", () => {
      expect(Object.keys(YEOKMA_BY_YEAR_BRANCH)).toHaveLength(12);
    });

    it("each value is a valid branch", () => {
      for (const branch of BRANCHES_LOCAL) {
        const yeokma = YEOKMA_BY_YEAR_BRANCH[branch];
        expect(BRANCHES_LOCAL).toContain(yeokma);
      }
    });

    it("寅午戌 group has 申 yeokma", () => {
      expect(YEOKMA_BY_YEAR_BRANCH["寅"]).toBe("申");
      expect(YEOKMA_BY_YEAR_BRANCH["午"]).toBe("申");
      expect(YEOKMA_BY_YEAR_BRANCH["戌"]).toBe("申");
    });
  });

  describe("DOHWA_BY_YEAR_BRANCH (도화살)", () => {
    it("covers all 12 branches", () => {
      expect(Object.keys(DOHWA_BY_YEAR_BRANCH)).toHaveLength(12);
    });

    it("寅午戌 group has 卯 dohwa", () => {
      expect(DOHWA_BY_YEAR_BRANCH["寅"]).toBe("卯");
      expect(DOHWA_BY_YEAR_BRANCH["午"]).toBe("卯");
      expect(DOHWA_BY_YEAR_BRANCH["戌"]).toBe("卯");
    });
  });

  describe("GEONROK_BY_DAY_STEM (건록)", () => {
    it("covers all 10 stems", () => {
      expect(Object.keys(GEONROK_BY_DAY_STEM)).toHaveLength(10);
    });

    it("each value is a valid branch", () => {
      for (const stem of STEMS_LOCAL) {
        const geonrok = GEONROK_BY_DAY_STEM[stem];
        expect(BRANCHES_LOCAL).toContain(geonrok);
      }
    });

    it("甲 has 寅 geonrok", () => {
      expect(GEONROK_BY_DAY_STEM["甲"]).toBe("寅");
    });

    it("癸 has 子 geonrok", () => {
      expect(GEONROK_BY_DAY_STEM["癸"]).toBe("子");
    });
  });

  describe("SIPSIN_RELATIONS (십신)", () => {
    const sipsinTypes = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"];

    it("covers all 10 stems as keys", () => {
      expect(Object.keys(SIPSIN_RELATIONS)).toHaveLength(10);
    });

    it("each stem has relations with all 10 stems", () => {
      for (const stem of STEMS_LOCAL) {
        const relations = SIPSIN_RELATIONS[stem];
        expect(Object.keys(relations)).toHaveLength(10);
      }
    });

    it("same stem is 비견", () => {
      expect(SIPSIN_RELATIONS["甲"]["甲"]).toBe("비견");
      expect(SIPSIN_RELATIONS["乙"]["乙"]).toBe("비견");
      expect(SIPSIN_RELATIONS["丙"]["丙"]).toBe("비견");
    });

    it("甲 to 乙 is 겁재 (sibling relationship)", () => {
      expect(SIPSIN_RELATIONS["甲"]["乙"]).toBe("겁재");
    });

    it("contains all sipsin types", () => {
      const allTypes = new Set<string>();
      for (const stem of STEMS_LOCAL) {
        for (const targetStem of STEMS_LOCAL) {
          allTypes.add(SIPSIN_RELATIONS[stem][targetStem]);
        }
      }
      for (const type of sipsinTypes) {
        expect(allTypes.has(type)).toBe(true);
      }
    });
  });

  describe("WONJIN (원진)", () => {
    it("covers all 12 branches", () => {
      expect(Object.keys(WONJIN)).toHaveLength(12);
    });

    it("pairs are bidirectional", () => {
      for (const [branch1, branch2] of Object.entries(WONJIN)) {
        expect(WONJIN[branch2]).toBe(branch1);
      }
    });

    it("子 and 未 are wonjin pair", () => {
      expect(WONJIN["子"]).toBe("未");
      expect(WONJIN["未"]).toBe("子");
    });
  });

  describe("GWIMUN (귀문관살)", () => {
    it("covers all 12 branches", () => {
      expect(Object.keys(GWIMUN)).toHaveLength(12);
    });

    it("each value is a valid branch", () => {
      for (const branch of BRANCHES_LOCAL) {
        expect(BRANCHES_LOCAL).toContain(GWIMUN[branch]);
      }
    });
  });

  describe("BRANCH_MAIN_STEM (지장간 정기)", () => {
    it("covers all 12 branches", () => {
      expect(Object.keys(BRANCH_MAIN_STEM)).toHaveLength(12);
    });

    it("each value is a valid stem", () => {
      for (const branch of BRANCHES_LOCAL) {
        expect(STEMS_LOCAL).toContain(BRANCH_MAIN_STEM[branch]);
      }
    });

    it("子 main stem is 癸", () => {
      expect(BRANCH_MAIN_STEM["子"]).toBe("癸");
    });

    it("寅 main stem is 甲", () => {
      expect(BRANCH_MAIN_STEM["寅"]).toBe("甲");
    });
  });

  describe("STEM_COMBO_PAIRS (천간합 쌍)", () => {
    it("has 5 pairs", () => {
      expect(STEM_COMBO_PAIRS).toHaveLength(5);
    });

    it("all pairs are valid stem combinations", () => {
      for (const [stem1, stem2] of STEM_COMBO_PAIRS) {
        expect(STEMS_LOCAL).toContain(stem1);
        expect(STEMS_LOCAL).toContain(stem2);
      }
    });

    it("includes 甲己 pair", () => {
      expect(STEM_COMBO_PAIRS).toContainEqual(["甲", "己"]);
    });
  });

  describe("PA (파)", () => {
    it("covers all 12 branches", () => {
      expect(Object.keys(PA)).toHaveLength(12);
    });

    it("pairs are bidirectional", () => {
      for (const [branch1, branch2] of Object.entries(PA)) {
        expect(PA[branch2]).toBe(branch1);
      }
    });
  });

  describe("HAE (해/육해)", () => {
    it("covers all 12 branches", () => {
      expect(Object.keys(HAE)).toHaveLength(12);
    });

    it("pairs are bidirectional", () => {
      for (const [branch1, branch2] of Object.entries(HAE)) {
        expect(HAE[branch2]).toBe(branch1);
      }
    });
  });

  describe("CHUNGAN_HAP (천간합)", () => {
    it("covers all 10 stems", () => {
      expect(Object.keys(CHUNGAN_HAP)).toHaveLength(10);
    });

    it("each entry has partner and result", () => {
      for (const stem of STEMS_LOCAL) {
        const hap = CHUNGAN_HAP[stem];
        expect(hap).toHaveProperty("partner");
        expect(hap).toHaveProperty("result");
        expect(STEMS_LOCAL).toContain(hap.partner);
      }
    });

    it("甲己 produces earth", () => {
      expect(CHUNGAN_HAP["甲"].partner).toBe("己");
      expect(CHUNGAN_HAP["甲"].result).toBe("earth");
      expect(CHUNGAN_HAP["己"].partner).toBe("甲");
    });

    it("乙庚 produces metal", () => {
      expect(CHUNGAN_HAP["乙"].partner).toBe("庚");
      expect(CHUNGAN_HAP["乙"].result).toBe("metal");
    });
  });

  describe("Shinsal by year branch lookups", () => {
    const yearBranchLookups = [
      { name: "HWAGAE_BY_YEAR_BRANCH", data: HWAGAE_BY_YEAR_BRANCH },
      { name: "GEOBSAL_BY_YEAR_BRANCH", data: GEOBSAL_BY_YEAR_BRANCH },
      { name: "BAEKHO_BY_YEAR_BRANCH", data: BAEKHO_BY_YEAR_BRANCH },
      { name: "CHEONHEE_BY_YEAR_BRANCH", data: CHEONHEE_BY_YEAR_BRANCH },
      { name: "HONGYEOM_BY_YEAR_BRANCH", data: HONGYEOM_BY_YEAR_BRANCH },
      { name: "JANGSEONG_BY_YEAR_BRANCH", data: JANGSEONG_BY_YEAR_BRANCH },
      { name: "BANAN_BY_YEAR_BRANCH", data: BANAN_BY_YEAR_BRANCH },
    ];

    for (const { name, data } of yearBranchLookups) {
      describe(name, () => {
        it("covers all 12 branches", () => {
          expect(Object.keys(data)).toHaveLength(12);
        });

        it("all values are valid branches", () => {
          for (const branch of BRANCHES_LOCAL) {
            expect(BRANCHES_LOCAL).toContain(data[branch]);
          }
        });
      });
    }
  });

  describe("Shinsal by month branch lookups", () => {
    const monthBranchLookups = [
      { name: "CHEONDEOK_BY_MONTH_BRANCH", data: CHEONDEOK_BY_MONTH_BRANCH },
      { name: "WOLDEOK_BY_MONTH_BRANCH", data: WOLDEOK_BY_MONTH_BRANCH },
      { name: "CHEONUI_BY_MONTH_BRANCH", data: CHEONUI_BY_MONTH_BRANCH },
    ];

    for (const { name, data } of monthBranchLookups) {
      describe(name, () => {
        it("covers all 12 branches", () => {
          expect(Object.keys(data)).toHaveLength(12);
        });
      });
    }
  });

  describe("Shinsal by day stem lookups", () => {
    const dayStemLookups = [
      { name: "MUNCHANG_BY_DAY_STEM", data: MUNCHANG_BY_DAY_STEM },
      { name: "HAKDANG_BY_DAY_STEM", data: HAKDANG_BY_DAY_STEM },
    ];

    for (const { name, data } of dayStemLookups) {
      describe(name, () => {
        it("covers all 10 stems", () => {
          expect(Object.keys(data)).toHaveLength(10);
        });

        it("all values are valid branches", () => {
          for (const stem of STEMS_LOCAL) {
            expect(BRANCHES_LOCAL).toContain(data[stem]);
          }
        });
      });
    }
  });

  describe("NAPEUM_ELEMENT_TABLE (납음)", () => {
    const validElements = ["wood", "fire", "earth", "metal", "water"];

    it("has 60 entries (60 Jiazi cycle)", () => {
      expect(Object.keys(NAPEUM_ELEMENT_TABLE)).toHaveLength(60);
    });

    it("all values are valid elements", () => {
      for (const element of Object.values(NAPEUM_ELEMENT_TABLE)) {
        expect(validElements).toContain(element);
      }
    });

    it("甲子 is metal (해중금)", () => {
      expect(NAPEUM_ELEMENT_TABLE["甲子"]).toBe("metal");
    });

    it("丙寅 is fire (노중화)", () => {
      expect(NAPEUM_ELEMENT_TABLE["丙寅"]).toBe("fire");
    });

    it("癸亥 is water (대해수)", () => {
      expect(NAPEUM_ELEMENT_TABLE["癸亥"]).toBe("water");
    });
  });

  describe("TWELVE_SPIRITS (12신살)", () => {
    it("has 12 spirits", () => {
      expect(TWELVE_SPIRITS).toHaveLength(12);
    });

    it("includes key spirits", () => {
      expect(TWELVE_SPIRITS).toContain("건");
      expect(TWELVE_SPIRITS).toContain("만");
      expect(TWELVE_SPIRITS).toContain("파");
      expect(TWELVE_SPIRITS).toContain("성");
    });
  });

  describe("TWELVE_SPIRITS_MEANINGS", () => {
    it("has meanings for all 12 spirits", () => {
      expect(Object.keys(TWELVE_SPIRITS_MEANINGS)).toHaveLength(12);
    });

    it("each entry has meaning and score", () => {
      for (const spirit of TWELVE_SPIRITS) {
        const meaning = TWELVE_SPIRITS_MEANINGS[spirit];
        expect(meaning).toHaveProperty("meaning");
        expect(meaning).toHaveProperty("score");
        expect(typeof meaning.meaning).toBe("string");
        expect(typeof meaning.score).toBe("number");
      }
    });

    it("만 has highest positive score", () => {
      const scores = Object.values(TWELVE_SPIRITS_MEANINGS).map(m => m.score);
      expect(TWELVE_SPIRITS_MEANINGS["만"].score).toBe(Math.max(...scores));
    });

    it("파 has negative score", () => {
      expect(TWELVE_SPIRITS_MEANINGS["파"].score).toBeLessThan(0);
    });
  });

  describe("TWENTY_EIGHT_MANSIONS (28수)", () => {
    it("has 28 mansions", () => {
      expect(TWENTY_EIGHT_MANSIONS).toHaveLength(28);
    });

    it("each mansion has required properties", () => {
      for (const mansion of TWENTY_EIGHT_MANSIONS) {
        expect(mansion).toHaveProperty("name");
        expect(mansion).toHaveProperty("meaning");
        expect(mansion).toHaveProperty("score");
        expect(typeof mansion.score).toBe("number");
      }
    });

    it("includes key mansions", () => {
      const names = TWENTY_EIGHT_MANSIONS.map(m => m.name);
      expect(names).toContain("각");
      expect(names).toContain("방");
      expect(names).toContain("실");
    });
  });

  describe("HOUR_BRANCH_MEANINGS (시진)", () => {
    it("covers all 12 branches", () => {
      expect(Object.keys(HOUR_BRANCH_MEANINGS)).toHaveLength(12);
    });

    it("each entry has period, nature, and score", () => {
      for (const branch of BRANCHES_LOCAL) {
        const meaning = HOUR_BRANCH_MEANINGS[branch];
        expect(meaning).toHaveProperty("period");
        expect(meaning).toHaveProperty("nature");
        expect(meaning).toHaveProperty("score");
      }
    });

    it("巳 (09:00-11:00) has highest score for work focus", () => {
      expect(HOUR_BRANCH_MEANINGS["巳"].period).toBe("09:00-11:00");
      expect(HOUR_BRANCH_MEANINGS["巳"].score).toBe(12);
    });

    it("子 is late night period", () => {
      expect(HOUR_BRANCH_MEANINGS["子"].period).toBe("23:00-01:00");
    });
  });

  describe("SOLAR_TERMS (24절기)", () => {
    it("has 24 terms", () => {
      expect(SOLAR_TERMS).toHaveLength(24);
    });

    it("each term has required properties", () => {
      for (const term of SOLAR_TERMS) {
        expect(term).toHaveProperty("name");
        expect(term).toHaveProperty("koreanName");
        expect(term).toHaveProperty("longitude");
        expect(term).toHaveProperty("meaning");
        expect(term).toHaveProperty("score");
        expect(term).toHaveProperty("type");
        expect(["major", "minor"]).toContain(term.type);
      }
    });

    it("longitudes are in 0-360 range", () => {
      for (const term of SOLAR_TERMS) {
        expect(term.longitude).toBeGreaterThanOrEqual(0);
        expect(term.longitude).toBeLessThan(360);
      }
    });

    it("입춘 starts at 315 degrees", () => {
      const lichun = SOLAR_TERMS.find(t => t.name === "lichun");
      expect(lichun?.longitude).toBe(315);
      expect(lichun?.koreanName).toBe("입춘");
    });

    it("동지 is at 270 degrees (winter solstice)", () => {
      const dongzhi = SOLAR_TERMS.find(t => t.name === "dongzhi");
      expect(dongzhi?.longitude).toBe(270);
      expect(dongzhi?.koreanName).toBe("동지");
    });

    it("하지 is at 90 degrees (summer solstice)", () => {
      const xiazhi = SOLAR_TERMS.find(t => t.name === "xiazhi");
      expect(xiazhi?.longitude).toBe(90);
      expect(xiazhi?.koreanName).toBe("하지");
    });
  });

  describe("SAMHAP_GROUPS (삼합)", () => {
    it("has 4 element groups", () => {
      expect(Object.keys(SAMHAP_GROUPS)).toHaveLength(4);
    });

    it("each group has 3 branches", () => {
      for (const group of Object.values(SAMHAP_GROUPS)) {
        expect(group.branches).toHaveLength(3);
        expect(group).toHaveProperty("element");
        expect(group).toHaveProperty("meaning");
      }
    });

    it("木局 (wood) is 亥卯未", () => {
      expect(SAMHAP_GROUPS.wood.branches).toEqual(["亥", "卯", "未"]);
    });

    it("火局 (fire) is 寅午戌", () => {
      expect(SAMHAP_GROUPS.fire.branches).toEqual(["寅", "午", "戌"]);
    });
  });

  describe("BANGHAP_GROUPS (방합)", () => {
    it("has 4 seasonal groups", () => {
      expect(Object.keys(BANGHAP_GROUPS)).toHaveLength(4);
    });

    it("each group has 3 branches and season", () => {
      for (const group of Object.values(BANGHAP_GROUPS)) {
        expect(group.branches).toHaveLength(3);
        expect(group).toHaveProperty("element");
        expect(group).toHaveProperty("season");
      }
    });

    it("spring is 寅卯辰 (wood)", () => {
      expect(BANGHAP_GROUPS.spring.branches).toEqual(["寅", "卯", "辰"]);
      expect(BANGHAP_GROUPS.spring.element).toBe("wood");
    });

    it("winter is 亥子丑 (water)", () => {
      expect(BANGHAP_GROUPS.winter.branches).toEqual(["亥", "子", "丑"]);
      expect(BANGHAP_GROUPS.winter.element).toBe("water");
    });
  });

  describe("SPECIAL_SAL_COMBINATIONS", () => {
    it("has combination entries", () => {
      expect(SPECIAL_SAL_COMBINATIONS.length).toBeGreaterThan(0);
    });

    it("each entry has required properties", () => {
      for (const combo of SPECIAL_SAL_COMBINATIONS) {
        expect(combo).toHaveProperty("combination");
        expect(combo).toHaveProperty("type");
        expect(combo).toHaveProperty("effect");
        expect(combo).toHaveProperty("scoreModifier");
        expect(["synergy", "conflict", "neutral"]).toContain(combo.type);
        expect(Array.isArray(combo.combination)).toBe(true);
        expect(combo.combination.length).toBeGreaterThanOrEqual(2);
      }
    });

    it("includes 천을귀인+천덕귀인 synergy", () => {
      const doubleBenefactor = SPECIAL_SAL_COMBINATIONS.find(
        c => c.combination.includes("천을귀인") && c.combination.includes("천덕귀인")
      );
      expect(doubleBenefactor).toBeDefined();
      expect(doubleBenefactor?.type).toBe("synergy");
      expect(doubleBenefactor?.scoreModifier).toBeGreaterThan(0);
    });

    it("includes 삼재+백호살 double negative", () => {
      const doubleNegative = SPECIAL_SAL_COMBINATIONS.find(
        c => c.combination.includes("삼재") && c.combination.includes("백호살")
      );
      expect(doubleNegative).toBeDefined();
      expect(doubleNegative?.scoreModifier).toBeLessThan(0);
    });
  });

  describe("STEM_ELEMENTS", () => {
    const validElements = ["wood", "fire", "earth", "metal", "water"];

    it("covers all 10 stems", () => {
      expect(Object.keys(STEM_ELEMENTS)).toHaveLength(10);
    });

    it("all values are valid elements", () => {
      for (const element of Object.values(STEM_ELEMENTS)) {
        expect(validElements).toContain(element);
      }
    });

    it("甲乙 are wood", () => {
      expect(STEM_ELEMENTS["甲"]).toBe("wood");
      expect(STEM_ELEMENTS["乙"]).toBe("wood");
    });

    it("壬癸 are water", () => {
      expect(STEM_ELEMENTS["壬"]).toBe("water");
      expect(STEM_ELEMENTS["癸"]).toBe("water");
    });
  });

  describe("BRANCH_ELEMENTS", () => {
    const validElements = ["wood", "fire", "earth", "metal", "water"];

    it("covers all 12 branches", () => {
      expect(Object.keys(BRANCH_ELEMENTS)).toHaveLength(12);
    });

    it("all values are valid elements", () => {
      for (const element of Object.values(BRANCH_ELEMENTS)) {
        expect(validElements).toContain(element);
      }
    });

    it("子 and 亥 are water", () => {
      expect(BRANCH_ELEMENTS["子"]).toBe("water");
      expect(BRANCH_ELEMENTS["亥"]).toBe("water");
    });

    it("寅 and 卯 are wood", () => {
      expect(BRANCH_ELEMENTS["寅"]).toBe("wood");
      expect(BRANCH_ELEMENTS["卯"]).toBe("wood");
    });
  });

  describe("ELEMENT_RELATIONS_LOCAL", () => {
    const elements = ["wood", "fire", "earth", "metal", "water"];

    it("covers all 5 elements", () => {
      expect(Object.keys(ELEMENT_RELATIONS_LOCAL)).toHaveLength(5);
    });

    it("each element has generates, generatedBy, controls, controlledBy", () => {
      for (const element of elements) {
        const relations = ELEMENT_RELATIONS_LOCAL[element];
        expect(relations).toHaveProperty("generates");
        expect(relations).toHaveProperty("generatedBy");
        expect(relations).toHaveProperty("controls");
        expect(relations).toHaveProperty("controlledBy");
        expect(elements).toContain(relations.generates);
        expect(elements).toContain(relations.generatedBy);
        expect(elements).toContain(relations.controls);
        expect(elements).toContain(relations.controlledBy);
      }
    });

    it("wood generates fire, is generated by water", () => {
      expect(ELEMENT_RELATIONS_LOCAL.wood.generates).toBe("fire");
      expect(ELEMENT_RELATIONS_LOCAL.wood.generatedBy).toBe("water");
    });

    it("fire controls metal, is controlled by water", () => {
      expect(ELEMENT_RELATIONS_LOCAL.fire.controls).toBe("metal");
      expect(ELEMENT_RELATIONS_LOCAL.fire.controlledBy).toBe("water");
    });

    it("generation cycle is consistent", () => {
      // wood -> fire -> earth -> metal -> water -> wood
      expect(ELEMENT_RELATIONS_LOCAL.wood.generates).toBe("fire");
      expect(ELEMENT_RELATIONS_LOCAL.fire.generates).toBe("earth");
      expect(ELEMENT_RELATIONS_LOCAL.earth.generates).toBe("metal");
      expect(ELEMENT_RELATIONS_LOCAL.metal.generates).toBe("water");
      expect(ELEMENT_RELATIONS_LOCAL.water.generates).toBe("wood");
    });

    it("control cycle is consistent", () => {
      // wood -> earth -> water -> fire -> metal -> wood
      expect(ELEMENT_RELATIONS_LOCAL.wood.controls).toBe("earth");
      expect(ELEMENT_RELATIONS_LOCAL.earth.controls).toBe("water");
      expect(ELEMENT_RELATIONS_LOCAL.water.controls).toBe("fire");
      expect(ELEMENT_RELATIONS_LOCAL.fire.controls).toBe("metal");
      expect(ELEMENT_RELATIONS_LOCAL.metal.controls).toBe("wood");
    });
  });
});
