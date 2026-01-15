/**
 * Destiny Map Calendar Constants Tests
 *
 * Tests for traditional Korean astrology constants
 */


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
} from "@/lib/destiny-map/calendar/constants";

describe("STEMS (천간)", () => {
  it("has 10 heavenly stems", () => {
    expect(STEMS).toHaveLength(10);
  });

  it("contains all 10 stems in correct order", () => {
    expect(STEMS).toEqual(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
  });
});

describe("BRANCHES (지지)", () => {
  it("has 12 earthly branches", () => {
    expect(BRANCHES).toHaveLength(12);
  });

  it("contains all 12 branches in correct order", () => {
    expect(BRANCHES).toEqual(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]);
  });
});

describe("STEM_TO_ELEMENT", () => {
  it("maps all 10 stems to elements", () => {
    expect(Object.keys(STEM_TO_ELEMENT)).toHaveLength(10);
  });

  it("maps 甲乙 to wood", () => {
    expect(STEM_TO_ELEMENT["甲"]).toBe("wood");
    expect(STEM_TO_ELEMENT["乙"]).toBe("wood");
  });

  it("maps 丙丁 to fire", () => {
    expect(STEM_TO_ELEMENT["丙"]).toBe("fire");
    expect(STEM_TO_ELEMENT["丁"]).toBe("fire");
  });

  it("maps 戊己 to earth", () => {
    expect(STEM_TO_ELEMENT["戊"]).toBe("earth");
    expect(STEM_TO_ELEMENT["己"]).toBe("earth");
  });

  it("maps 庚辛 to metal", () => {
    expect(STEM_TO_ELEMENT["庚"]).toBe("metal");
    expect(STEM_TO_ELEMENT["辛"]).toBe("metal");
  });

  it("maps 壬癸 to water", () => {
    expect(STEM_TO_ELEMENT["壬"]).toBe("water");
    expect(STEM_TO_ELEMENT["癸"]).toBe("water");
  });
});

describe("BRANCH_TO_ELEMENT", () => {
  it("maps all 12 branches to elements", () => {
    expect(Object.keys(BRANCH_TO_ELEMENT)).toHaveLength(12);
  });

  it("maps water branches correctly", () => {
    expect(BRANCH_TO_ELEMENT["子"]).toBe("water");
    expect(BRANCH_TO_ELEMENT["亥"]).toBe("water");
  });

  it("maps wood branches correctly", () => {
    expect(BRANCH_TO_ELEMENT["寅"]).toBe("wood");
    expect(BRANCH_TO_ELEMENT["卯"]).toBe("wood");
  });

  it("maps fire branches correctly", () => {
    expect(BRANCH_TO_ELEMENT["巳"]).toBe("fire");
    expect(BRANCH_TO_ELEMENT["午"]).toBe("fire");
  });

  it("maps earth branches correctly", () => {
    expect(BRANCH_TO_ELEMENT["丑"]).toBe("earth");
    expect(BRANCH_TO_ELEMENT["辰"]).toBe("earth");
    expect(BRANCH_TO_ELEMENT["未"]).toBe("earth");
    expect(BRANCH_TO_ELEMENT["戌"]).toBe("earth");
  });

  it("maps metal branches correctly", () => {
    expect(BRANCH_TO_ELEMENT["申"]).toBe("metal");
    expect(BRANCH_TO_ELEMENT["酉"]).toBe("metal");
  });
});

describe("CHEONEUL_GWIIN_MAP (천을귀인)", () => {
  it("has mappings for all 10 stems", () => {
    expect(Object.keys(CHEONEUL_GWIIN_MAP)).toHaveLength(10);
  });

  it("each stem maps to 2 branches", () => {
    for (const stem of STEMS) {
      expect(CHEONEUL_GWIIN_MAP[stem]).toHaveLength(2);
    }
  });

  it("甲戊庚 share the same noble stars", () => {
    expect(CHEONEUL_GWIIN_MAP["甲"]).toEqual(["丑", "未"]);
    expect(CHEONEUL_GWIIN_MAP["戊"]).toEqual(["丑", "未"]);
    expect(CHEONEUL_GWIIN_MAP["庚"]).toEqual(["丑", "未"]);
  });
});

describe("JIJANGGAN (지장간)", () => {
  it("has mappings for all 12 branches", () => {
    expect(Object.keys(JIJANGGAN)).toHaveLength(12);
  });

  it("each branch has 정기 (main qi)", () => {
    for (const branch of BRANCHES) {
      expect(JIJANGGAN[branch]).toHaveProperty("정기");
    }
  });

  it("子 only has 정기", () => {
    expect(JIJANGGAN["子"]).toEqual({ 정기: "癸" });
  });

  it("丑 has 여기, 중기, 정기", () => {
    expect(JIJANGGAN["丑"]).toEqual({ 여기: "癸", 중기: "辛", 정기: "己" });
  });
});

describe("SAMHAP (삼합)", () => {
  it("has 4 element combinations", () => {
    expect(Object.keys(SAMHAP)).toHaveLength(4);
  });

  it("each element has 3 branches", () => {
    expect(SAMHAP.water).toHaveLength(3);
    expect(SAMHAP.wood).toHaveLength(3);
    expect(SAMHAP.fire).toHaveLength(3);
    expect(SAMHAP.metal).toHaveLength(3);
  });

  it("water samhap is 申子辰", () => {
    expect(SAMHAP.water).toEqual(["申", "子", "辰"]);
  });

  it("fire samhap is 寅午戌", () => {
    expect(SAMHAP.fire).toEqual(["寅", "午", "戌"]);
  });
});

describe("YUKHAP (육합)", () => {
  it("has 12 pairings", () => {
    expect(Object.keys(YUKHAP)).toHaveLength(12);
  });

  it("pairings are bidirectional", () => {
    expect(YUKHAP["子"]).toBe("丑");
    expect(YUKHAP["丑"]).toBe("子");
    expect(YUKHAP["寅"]).toBe("亥");
    expect(YUKHAP["亥"]).toBe("寅");
  });
});

describe("CHUNG (충)", () => {
  it("has 12 pairings", () => {
    expect(Object.keys(CHUNG)).toHaveLength(12);
  });

  it("opposites clash", () => {
    expect(CHUNG["子"]).toBe("午");
    expect(CHUNG["午"]).toBe("子");
    expect(CHUNG["寅"]).toBe("申");
    expect(CHUNG["申"]).toBe("寅");
  });

  it("pairings are bidirectional", () => {
    for (const [a, b] of Object.entries(CHUNG)) {
      expect(CHUNG[b]).toBe(a);
    }
  });
});

describe("XING (형)", () => {
  it("has 12 mappings", () => {
    expect(Object.keys(XING)).toHaveLength(12);
  });

  it("寅巳申 form mutual punishment", () => {
    expect(XING["寅"]).toContain("巳");
    expect(XING["寅"]).toContain("申");
    expect(XING["巳"]).toContain("寅");
    expect(XING["巳"]).toContain("申");
  });

  it("self-punishment branches", () => {
    expect(XING["辰"]).toEqual(["辰"]);
    expect(XING["午"]).toEqual(["午"]);
    expect(XING["酉"]).toEqual(["酉"]);
    expect(XING["亥"]).toEqual(["亥"]);
  });
});

describe("HAI (해)", () => {
  it("has 12 pairings", () => {
    expect(Object.keys(HAI)).toHaveLength(12);
  });

  it("pairings are bidirectional", () => {
    for (const [a, b] of Object.entries(HAI)) {
      expect(HAI[b]).toBe(a);
    }
  });

  it("子未 are harmful to each other", () => {
    expect(HAI["子"]).toBe("未");
    expect(HAI["未"]).toBe("子");
  });
});

describe("SAMJAE_BY_YEAR_BRANCH (삼재)", () => {
  it("has 12 year branch mappings", () => {
    expect(Object.keys(SAMJAE_BY_YEAR_BRANCH)).toHaveLength(12);
  });

  it("each mapping has 3 affected branches", () => {
    for (const branches of Object.values(SAMJAE_BY_YEAR_BRANCH)) {
      expect(branches).toHaveLength(3);
    }
  });

  it("寅午戌 group shares same samjae", () => {
    expect(SAMJAE_BY_YEAR_BRANCH["寅"]).toEqual(["申", "酉", "戌"]);
    expect(SAMJAE_BY_YEAR_BRANCH["午"]).toEqual(["申", "酉", "戌"]);
    expect(SAMJAE_BY_YEAR_BRANCH["戌"]).toEqual(["申", "酉", "戌"]);
  });
});

describe("YEOKMA_BY_YEAR_BRANCH (역마살)", () => {
  it("has 12 mappings", () => {
    expect(Object.keys(YEOKMA_BY_YEAR_BRANCH)).toHaveLength(12);
  });

  it("寅午戌 share same yeokma", () => {
    expect(YEOKMA_BY_YEAR_BRANCH["寅"]).toBe("申");
    expect(YEOKMA_BY_YEAR_BRANCH["午"]).toBe("申");
    expect(YEOKMA_BY_YEAR_BRANCH["戌"]).toBe("申");
  });
});

describe("DOHWA_BY_YEAR_BRANCH (도화살)", () => {
  it("has 12 mappings", () => {
    expect(Object.keys(DOHWA_BY_YEAR_BRANCH)).toHaveLength(12);
  });

  it("寅午戌 share same dohwa", () => {
    expect(DOHWA_BY_YEAR_BRANCH["寅"]).toBe("卯");
    expect(DOHWA_BY_YEAR_BRANCH["午"]).toBe("卯");
    expect(DOHWA_BY_YEAR_BRANCH["戌"]).toBe("卯");
  });
});

describe("GEONROK_BY_DAY_STEM (건록)", () => {
  it("has 10 stem mappings", () => {
    expect(Object.keys(GEONROK_BY_DAY_STEM)).toHaveLength(10);
  });

  it("maps stems to branches", () => {
    expect(GEONROK_BY_DAY_STEM["甲"]).toBe("寅");
    expect(GEONROK_BY_DAY_STEM["乙"]).toBe("卯");
    expect(GEONROK_BY_DAY_STEM["丙"]).toBe("巳");
  });
});

describe("SIPSIN_RELATIONS (십신)", () => {
  it("has 10 stem mappings", () => {
    expect(Object.keys(SIPSIN_RELATIONS)).toHaveLength(10);
  });

  it("each stem has relations with all 10 stems", () => {
    for (const stem of STEMS) {
      expect(Object.keys(SIPSIN_RELATIONS[stem])).toHaveLength(10);
    }
  });

  it("same stem is 비견", () => {
    for (const stem of STEMS) {
      expect(SIPSIN_RELATIONS[stem][stem]).toBe("비견");
    }
  });

  it("甲 relations are correct", () => {
    expect(SIPSIN_RELATIONS["甲"]["乙"]).toBe("겁재");
    expect(SIPSIN_RELATIONS["甲"]["丙"]).toBe("식신");
    expect(SIPSIN_RELATIONS["甲"]["庚"]).toBe("편관");
    expect(SIPSIN_RELATIONS["甲"]["癸"]).toBe("정인");
  });
});

describe("ELEMENT_RELATIONS (오행상생상극)", () => {
  it("has 5 elements", () => {
    expect(Object.keys(ELEMENT_RELATIONS)).toHaveLength(5);
  });

  it("each element has all 4 relations", () => {
    for (const element of Object.values(ELEMENT_RELATIONS)) {
      expect(element).toHaveProperty("generates");
      expect(element).toHaveProperty("controls");
      expect(element).toHaveProperty("generatedBy");
      expect(element).toHaveProperty("controlledBy");
    }
  });

  it("wood generates fire and controls earth", () => {
    expect(ELEMENT_RELATIONS.wood.generates).toBe("fire");
    expect(ELEMENT_RELATIONS.wood.controls).toBe("earth");
  });

  it("fire generates earth and controls metal", () => {
    expect(ELEMENT_RELATIONS.fire.generates).toBe("earth");
    expect(ELEMENT_RELATIONS.fire.controls).toBe("metal");
  });

  it("generation cycle forms a loop", () => {
    let current: keyof typeof ELEMENT_RELATIONS = "wood";
    const seen: string[] = [];
    for (let i = 0; i < 5; i++) {
      seen.push(current);
      current = ELEMENT_RELATIONS[current].generates as keyof typeof ELEMENT_RELATIONS;
    }
    expect(seen).toEqual(["wood", "fire", "earth", "metal", "water"]);
    expect(current).toBe("wood"); // back to start
  });
});

describe("ZODIAC_TO_ELEMENT", () => {
  it("has 12 zodiac signs", () => {
    expect(Object.keys(ZODIAC_TO_ELEMENT)).toHaveLength(12);
  });

  it("fire signs are correct", () => {
    expect(ZODIAC_TO_ELEMENT.Aries).toBe("fire");
    expect(ZODIAC_TO_ELEMENT.Leo).toBe("fire");
    expect(ZODIAC_TO_ELEMENT.Sagittarius).toBe("fire");
  });

  it("water signs are correct", () => {
    expect(ZODIAC_TO_ELEMENT.Cancer).toBe("water");
    expect(ZODIAC_TO_ELEMENT.Scorpio).toBe("water");
    expect(ZODIAC_TO_ELEMENT.Pisces).toBe("water");
  });

  it("earth signs are correct", () => {
    expect(ZODIAC_TO_ELEMENT.Taurus).toBe("earth");
    expect(ZODIAC_TO_ELEMENT.Virgo).toBe("earth");
    expect(ZODIAC_TO_ELEMENT.Capricorn).toBe("earth");
  });

  it("air signs are correct", () => {
    expect(ZODIAC_TO_ELEMENT.Gemini).toBe("air");
    expect(ZODIAC_TO_ELEMENT.Libra).toBe("air");
    expect(ZODIAC_TO_ELEMENT.Aquarius).toBe("air");
  });
});

describe("AREA_CONFIG", () => {
  const areas = ["career", "wealth", "love", "health", "study", "travel"] as const;

  it("has 6 fortune areas", () => {
    expect(Object.keys(AREA_CONFIG)).toHaveLength(6);
  });

  it("each area has required properties", () => {
    for (const area of areas) {
      expect(AREA_CONFIG[area]).toHaveProperty("relatedElements");
      expect(AREA_CONFIG[area]).toHaveProperty("boostSibsin");
      expect(AREA_CONFIG[area]).toHaveProperty("penaltySibsin");
    }
  });

  it("career config is correct", () => {
    expect(AREA_CONFIG.career.relatedElements).toContain("metal");
    expect(AREA_CONFIG.career.boostSibsin).toContain("정관");
    expect(AREA_CONFIG.career.penaltySibsin).toContain("상관");
  });

  it("wealth config is correct", () => {
    expect(AREA_CONFIG.wealth.relatedElements).toContain("earth");
    expect(AREA_CONFIG.wealth.boostSibsin).toContain("정재");
    expect(AREA_CONFIG.wealth.penaltySibsin).toContain("겁재");
  });
});
