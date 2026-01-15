/**
 * Destiny Calendar Constants Tests
 *
 * Tests for destiny calendar constants: stems, branches, relationships
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
  type FortuneArea,
} from "@/lib/destiny-map/calendar/constants";

describe("STEMS", () => {
  it("has 10 heavenly stems", () => {
    expect(STEMS).toHaveLength(10);
  });

  it("contains all stems in order", () => {
    expect(STEMS).toEqual(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
  });
});

describe("BRANCHES", () => {
  it("has 12 earthly branches", () => {
    expect(BRANCHES).toHaveLength(12);
  });

  it("contains all branches in order", () => {
    expect(BRANCHES).toEqual(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]);
  });
});

describe("STEM_TO_ELEMENT", () => {
  it("maps all 10 stems", () => {
    expect(Object.keys(STEM_TO_ELEMENT)).toHaveLength(10);
  });

  it("甲 and 乙 are wood", () => {
    expect(STEM_TO_ELEMENT["甲"]).toBe("wood");
    expect(STEM_TO_ELEMENT["乙"]).toBe("wood");
  });

  it("丙 and 丁 are fire", () => {
    expect(STEM_TO_ELEMENT["丙"]).toBe("fire");
    expect(STEM_TO_ELEMENT["丁"]).toBe("fire");
  });

  it("戊 and 己 are earth", () => {
    expect(STEM_TO_ELEMENT["戊"]).toBe("earth");
    expect(STEM_TO_ELEMENT["己"]).toBe("earth");
  });

  it("庚 and 辛 are metal", () => {
    expect(STEM_TO_ELEMENT["庚"]).toBe("metal");
    expect(STEM_TO_ELEMENT["辛"]).toBe("metal");
  });

  it("壬 and 癸 are water", () => {
    expect(STEM_TO_ELEMENT["壬"]).toBe("water");
    expect(STEM_TO_ELEMENT["癸"]).toBe("water");
  });
});

describe("BRANCH_TO_ELEMENT", () => {
  it("maps all 12 branches", () => {
    expect(Object.keys(BRANCH_TO_ELEMENT)).toHaveLength(12);
  });

  it("子 and 亥 are water", () => {
    expect(BRANCH_TO_ELEMENT["子"]).toBe("water");
    expect(BRANCH_TO_ELEMENT["亥"]).toBe("water");
  });

  it("寅 and 卯 are wood", () => {
    expect(BRANCH_TO_ELEMENT["寅"]).toBe("wood");
    expect(BRANCH_TO_ELEMENT["卯"]).toBe("wood");
  });

  it("巳 and 午 are fire", () => {
    expect(BRANCH_TO_ELEMENT["巳"]).toBe("fire");
    expect(BRANCH_TO_ELEMENT["午"]).toBe("fire");
  });

  it("申 and 酉 are metal", () => {
    expect(BRANCH_TO_ELEMENT["申"]).toBe("metal");
    expect(BRANCH_TO_ELEMENT["酉"]).toBe("metal");
  });

  it("丑, 辰, 未, 戌 are earth", () => {
    expect(BRANCH_TO_ELEMENT["丑"]).toBe("earth");
    expect(BRANCH_TO_ELEMENT["辰"]).toBe("earth");
    expect(BRANCH_TO_ELEMENT["未"]).toBe("earth");
    expect(BRANCH_TO_ELEMENT["戌"]).toBe("earth");
  });
});

describe("CHEONEUL_GWIIN_MAP (천을귀인)", () => {
  it("has entries for all 10 stems", () => {
    expect(Object.keys(CHEONEUL_GWIIN_MAP)).toHaveLength(10);
  });

  it("each stem has 2 noble branches", () => {
    Object.values(CHEONEUL_GWIIN_MAP).forEach((branches) => {
      expect(branches).toHaveLength(2);
    });
  });

  it("甲 noble branches are 丑 and 未", () => {
    expect(CHEONEUL_GWIIN_MAP["甲"]).toContain("丑");
    expect(CHEONEUL_GWIIN_MAP["甲"]).toContain("未");
  });
});

describe("JIJANGGAN (지장간)", () => {
  it("has entries for all 12 branches", () => {
    expect(Object.keys(JIJANGGAN)).toHaveLength(12);
  });

  it("子 has only 정기 (癸)", () => {
    expect(JIJANGGAN["子"]).toEqual({ 정기: "癸" });
  });

  it("丑 has 여기, 중기, 정기", () => {
    expect(JIJANGGAN["丑"]).toHaveProperty("여기");
    expect(JIJANGGAN["丑"]).toHaveProperty("중기");
    expect(JIJANGGAN["丑"]).toHaveProperty("정기");
  });

  it("午 has 여기 and 정기 only", () => {
    expect(JIJANGGAN["午"]).toHaveProperty("여기");
    expect(JIJANGGAN["午"]).toHaveProperty("정기");
    expect(JIJANGGAN["午"]).not.toHaveProperty("중기");
  });
});

describe("SAMHAP (삼합)", () => {
  it("has 4 element groups", () => {
    expect(Object.keys(SAMHAP)).toHaveLength(4);
  });

  it("water group is 申子辰", () => {
    expect(SAMHAP.water).toEqual(["申", "子", "辰"]);
  });

  it("wood group is 亥卯未", () => {
    expect(SAMHAP.wood).toEqual(["亥", "卯", "未"]);
  });

  it("fire group is 寅午戌", () => {
    expect(SAMHAP.fire).toEqual(["寅", "午", "戌"]);
  });

  it("metal group is 巳酉丑", () => {
    expect(SAMHAP.metal).toEqual(["巳", "酉", "丑"]);
  });
});

describe("YUKHAP (육합)", () => {
  it("has entries for all 12 branches", () => {
    expect(Object.keys(YUKHAP)).toHaveLength(12);
  });

  it("子 combines with 丑", () => {
    expect(YUKHAP["子"]).toBe("丑");
    expect(YUKHAP["丑"]).toBe("子");
  });

  it("午 combines with 未", () => {
    expect(YUKHAP["午"]).toBe("未");
    expect(YUKHAP["未"]).toBe("午");
  });

  it("combinations are symmetric", () => {
    Object.entries(YUKHAP).forEach(([branch, partner]) => {
      expect(YUKHAP[partner]).toBe(branch);
    });
  });
});

describe("CHUNG (충)", () => {
  it("has entries for all 12 branches", () => {
    expect(Object.keys(CHUNG)).toHaveLength(12);
  });

  it("子 clashes with 午", () => {
    expect(CHUNG["子"]).toBe("午");
    expect(CHUNG["午"]).toBe("子");
  });

  it("卯 clashes with 酉", () => {
    expect(CHUNG["卯"]).toBe("酉");
    expect(CHUNG["酉"]).toBe("卯");
  });

  it("clashes are symmetric", () => {
    Object.entries(CHUNG).forEach(([branch, clash]) => {
      expect(CHUNG[clash]).toBe(branch);
    });
  });
});

describe("XING (형)", () => {
  it("寅 punishes 巳 and 申", () => {
    expect(XING["寅"]).toContain("巳");
    expect(XING["寅"]).toContain("申");
  });

  it("子 punishes 卯", () => {
    expect(XING["子"]).toContain("卯");
  });

  it("辰 is self-punishment", () => {
    expect(XING["辰"]).toContain("辰");
  });

  it("午 is self-punishment", () => {
    expect(XING["午"]).toContain("午");
  });
});

describe("HAI (해)", () => {
  it("子 harms 未", () => {
    expect(HAI["子"]).toBe("未");
    expect(HAI["未"]).toBe("子");
  });

  it("harms are symmetric", () => {
    Object.entries(HAI).forEach(([branch, harm]) => {
      expect(HAI[harm]).toBe(branch);
    });
  });
});

describe("SAMJAE_BY_YEAR_BRANCH (삼재)", () => {
  it("has entries for all 12 branches", () => {
    expect(Object.keys(SAMJAE_BY_YEAR_BRANCH)).toHaveLength(12);
  });

  it("寅 year has 申酉戌 samjae years", () => {
    expect(SAMJAE_BY_YEAR_BRANCH["寅"]).toEqual(["申", "酉", "戌"]);
  });

  it("each group has 3 samjae branches", () => {
    Object.values(SAMJAE_BY_YEAR_BRANCH).forEach((branches) => {
      expect(branches).toHaveLength(3);
    });
  });
});

describe("YEOKMA_BY_YEAR_BRANCH (역마살)", () => {
  it("has entries for all 12 branches", () => {
    expect(Object.keys(YEOKMA_BY_YEAR_BRANCH)).toHaveLength(12);
  });

  it("寅午戌 year branches have 申 yeokma", () => {
    expect(YEOKMA_BY_YEAR_BRANCH["寅"]).toBe("申");
    expect(YEOKMA_BY_YEAR_BRANCH["午"]).toBe("申");
    expect(YEOKMA_BY_YEAR_BRANCH["戌"]).toBe("申");
  });
});

describe("DOHWA_BY_YEAR_BRANCH (도화살)", () => {
  it("has entries for all 12 branches", () => {
    expect(Object.keys(DOHWA_BY_YEAR_BRANCH)).toHaveLength(12);
  });

  it("寅午戌 year branches have 卯 dohwa", () => {
    expect(DOHWA_BY_YEAR_BRANCH["寅"]).toBe("卯");
    expect(DOHWA_BY_YEAR_BRANCH["午"]).toBe("卯");
    expect(DOHWA_BY_YEAR_BRANCH["戌"]).toBe("卯");
  });
});

describe("GEONROK_BY_DAY_STEM (건록)", () => {
  it("has entries for all 10 stems", () => {
    expect(Object.keys(GEONROK_BY_DAY_STEM)).toHaveLength(10);
  });

  it("甲 geonrok is 寅", () => {
    expect(GEONROK_BY_DAY_STEM["甲"]).toBe("寅");
  });

  it("丙 geonrok is 巳", () => {
    expect(GEONROK_BY_DAY_STEM["丙"]).toBe("巳");
  });
});

describe("SIPSIN_RELATIONS (십신)", () => {
  it("has entries for all 10 day stems", () => {
    expect(Object.keys(SIPSIN_RELATIONS)).toHaveLength(10);
  });

  it("each stem maps to all 10 sibsin", () => {
    Object.values(SIPSIN_RELATIONS).forEach((relations) => {
      expect(Object.keys(relations)).toHaveLength(10);
    });
  });

  it("same stem is 비견", () => {
    expect(SIPSIN_RELATIONS["甲"]["甲"]).toBe("비견");
    expect(SIPSIN_RELATIONS["乙"]["乙"]).toBe("비견");
  });

  it("wood controls earth (편관/정관)", () => {
    // 甲 controls 戊己 (earth)
    expect(["편관", "정관"]).toContain(SIPSIN_RELATIONS["戊"]["甲"]);
  });
});

describe("ELEMENT_RELATIONS", () => {
  it("has 5 elements", () => {
    expect(Object.keys(ELEMENT_RELATIONS)).toHaveLength(5);
  });

  it("each element has all 4 relation types", () => {
    Object.values(ELEMENT_RELATIONS).forEach((relations) => {
      expect(relations).toHaveProperty("generates");
      expect(relations).toHaveProperty("controls");
      expect(relations).toHaveProperty("generatedBy");
      expect(relations).toHaveProperty("controlledBy");
    });
  });

  it("wood generates fire", () => {
    expect(ELEMENT_RELATIONS.wood.generates).toBe("fire");
  });

  it("fire generates earth", () => {
    expect(ELEMENT_RELATIONS.fire.generates).toBe("earth");
  });

  it("wood controls earth", () => {
    expect(ELEMENT_RELATIONS.wood.controls).toBe("earth");
  });

  it("generating cycle is complete", () => {
    expect(ELEMENT_RELATIONS.wood.generates).toBe("fire");
    expect(ELEMENT_RELATIONS.fire.generates).toBe("earth");
    expect(ELEMENT_RELATIONS.earth.generates).toBe("metal");
    expect(ELEMENT_RELATIONS.metal.generates).toBe("water");
    expect(ELEMENT_RELATIONS.water.generates).toBe("wood");
  });
});

describe("ZODIAC_TO_ELEMENT", () => {
  it("has 12 zodiac signs", () => {
    expect(Object.keys(ZODIAC_TO_ELEMENT)).toHaveLength(12);
  });

  it("fire signs", () => {
    expect(ZODIAC_TO_ELEMENT.Aries).toBe("fire");
    expect(ZODIAC_TO_ELEMENT.Leo).toBe("fire");
    expect(ZODIAC_TO_ELEMENT.Sagittarius).toBe("fire");
  });

  it("earth signs", () => {
    expect(ZODIAC_TO_ELEMENT.Taurus).toBe("earth");
    expect(ZODIAC_TO_ELEMENT.Virgo).toBe("earth");
    expect(ZODIAC_TO_ELEMENT.Capricorn).toBe("earth");
  });

  it("air signs", () => {
    expect(ZODIAC_TO_ELEMENT.Gemini).toBe("air");
    expect(ZODIAC_TO_ELEMENT.Libra).toBe("air");
    expect(ZODIAC_TO_ELEMENT.Aquarius).toBe("air");
  });

  it("water signs", () => {
    expect(ZODIAC_TO_ELEMENT.Cancer).toBe("water");
    expect(ZODIAC_TO_ELEMENT.Scorpio).toBe("water");
    expect(ZODIAC_TO_ELEMENT.Pisces).toBe("water");
  });
});

describe("AREA_CONFIG", () => {
  const areas: FortuneArea[] = ["career", "wealth", "love", "health", "study", "travel"];

  areas.forEach((area) => {
    it(`has config for ${area}`, () => {
      expect(AREA_CONFIG).toHaveProperty(area);
    });
  });

  it("each area has required properties", () => {
    Object.values(AREA_CONFIG).forEach((config) => {
      expect(config).toHaveProperty("relatedElements");
      expect(config).toHaveProperty("boostSibsin");
      expect(config).toHaveProperty("penaltySibsin");
      expect(Array.isArray(config.relatedElements)).toBe(true);
      expect(Array.isArray(config.boostSibsin)).toBe(true);
      expect(Array.isArray(config.penaltySibsin)).toBe(true);
    });
  });

  it("career boosts 정관", () => {
    expect(AREA_CONFIG.career.boostSibsin).toContain("정관");
  });

  it("wealth boosts 정재", () => {
    expect(AREA_CONFIG.wealth.boostSibsin).toContain("정재");
  });

  it("love boosts 식신", () => {
    expect(AREA_CONFIG.love.boostSibsin).toContain("식신");
  });
});
