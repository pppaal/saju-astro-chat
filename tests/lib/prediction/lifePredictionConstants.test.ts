/**
 * Life Prediction Constants Tests
 *
 * Tests for Saju event timing constants and configurations
 */


import {
  STEMS,
  BRANCHES,
  STEM_ELEMENT,
  EVENT_FAVORABLE_CONDITIONS,
  ASTRO_EVENT_CONDITIONS,
  TRANSIT_EVENT_CONDITIONS,
  EVENT_HOUSES,
  SIBSIN_SCORES,
  STEM_COMBINATIONS,
  STEM_CLASHES,
  SIX_COMBOS,
  PARTIAL_TRINES,
  BRANCH_CLASHES,
  BRANCH_PUNISHMENTS,
  EVENT_NAMES_FULL,
} from "@/lib/prediction/life-prediction/constants";

describe("Basic Saju constants", () => {
  describe("STEMS (천간)", () => {
    it("has 10 heavenly stems", () => {
      expect(STEMS).toHaveLength(10);
    });

    it("starts with 甲 (wood yang)", () => {
      expect(STEMS[0]).toBe("甲");
    });

    it("ends with 癸 (water yin)", () => {
      expect(STEMS[9]).toBe("癸");
    });

    it("contains all stems in correct order", () => {
      expect(STEMS).toEqual(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
    });
  });

  describe("BRANCHES (지지)", () => {
    it("has 12 earthly branches", () => {
      expect(BRANCHES).toHaveLength(12);
    });

    it("starts with 子 (rat)", () => {
      expect(BRANCHES[0]).toBe("子");
    });

    it("ends with 亥 (pig)", () => {
      expect(BRANCHES[11]).toBe("亥");
    });

    it("contains all branches in correct order", () => {
      expect(BRANCHES).toEqual([
        "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"
      ]);
    });
  });

  describe("STEM_ELEMENT mapping", () => {
    it("maps wood stems correctly", () => {
      expect(STEM_ELEMENT["甲"]).toBe("목");
      expect(STEM_ELEMENT["乙"]).toBe("목");
    });

    it("maps fire stems correctly", () => {
      expect(STEM_ELEMENT["丙"]).toBe("화");
      expect(STEM_ELEMENT["丁"]).toBe("화");
    });

    it("maps earth stems correctly", () => {
      expect(STEM_ELEMENT["戊"]).toBe("토");
      expect(STEM_ELEMENT["己"]).toBe("토");
    });

    it("maps metal stems correctly", () => {
      expect(STEM_ELEMENT["庚"]).toBe("금");
      expect(STEM_ELEMENT["辛"]).toBe("금");
    });

    it("maps water stems correctly", () => {
      expect(STEM_ELEMENT["壬"]).toBe("수");
      expect(STEM_ELEMENT["癸"]).toBe("수");
    });
  });
});

describe("EVENT_FAVORABLE_CONDITIONS", () => {
  describe("Marriage conditions", () => {
    it("has favorable sibsin for marriage", () => {
      expect(EVENT_FAVORABLE_CONDITIONS.marriage.favorableSibsin).toContain("정관");
      expect(EVENT_FAVORABLE_CONDITIONS.marriage.favorableSibsin).toContain("정재");
    });

    it("has favorable stages for marriage", () => {
      expect(EVENT_FAVORABLE_CONDITIONS.marriage.favorableStages).toContain("건록");
      expect(EVENT_FAVORABLE_CONDITIONS.marriage.favorableStages).toContain("제왕");
    });

    it("has avoid sibsin for marriage", () => {
      expect(EVENT_FAVORABLE_CONDITIONS.marriage.avoidSibsin).toContain("겁재");
    });

    it("has avoid stages for marriage", () => {
      expect(EVENT_FAVORABLE_CONDITIONS.marriage.avoidStages).toContain("사");
      expect(EVENT_FAVORABLE_CONDITIONS.marriage.avoidStages).toContain("묘");
    });
  });

  describe("Career conditions", () => {
    it("has favorable elements for career", () => {
      expect(EVENT_FAVORABLE_CONDITIONS.career.favorableElements).toContain("금");
      expect(EVENT_FAVORABLE_CONDITIONS.career.favorableElements).toContain("토");
    });

    it("favors 정관 and 정인 for career", () => {
      expect(EVENT_FAVORABLE_CONDITIONS.career.favorableSibsin).toContain("정관");
      expect(EVENT_FAVORABLE_CONDITIONS.career.favorableSibsin).toContain("정인");
    });
  });

  describe("Investment conditions", () => {
    it("has favorable sibsin for investment", () => {
      expect(EVENT_FAVORABLE_CONDITIONS.investment.favorableSibsin).toContain("정재");
      expect(EVENT_FAVORABLE_CONDITIONS.investment.favorableSibsin).toContain("편재");
    });

    it("avoids risky sibsin for investment", () => {
      expect(EVENT_FAVORABLE_CONDITIONS.investment.avoidSibsin).toContain("겁재");
    });
  });

  describe("All event types exist", () => {
    const eventTypes = ["marriage", "career", "investment", "move", "study", "health", "relationship"];

    eventTypes.forEach((type) => {
      it(`has conditions for ${type}`, () => {
        expect(EVENT_FAVORABLE_CONDITIONS).toHaveProperty(type);
        expect(EVENT_FAVORABLE_CONDITIONS[type as keyof typeof EVENT_FAVORABLE_CONDITIONS]).toHaveProperty("favorableSibsin");
        expect(EVENT_FAVORABLE_CONDITIONS[type as keyof typeof EVENT_FAVORABLE_CONDITIONS]).toHaveProperty("favorableStages");
        expect(EVENT_FAVORABLE_CONDITIONS[type as keyof typeof EVENT_FAVORABLE_CONDITIONS]).toHaveProperty("favorableElements");
      });
    });
  });
});

describe("ASTRO_EVENT_CONDITIONS", () => {
  it("extends marriage conditions with astrology", () => {
    expect(ASTRO_EVENT_CONDITIONS.marriage.beneficSigns).toContain("Libra");
    expect(ASTRO_EVENT_CONDITIONS.marriage.beneficPlanets).toContain("Venus");
    expect(ASTRO_EVENT_CONDITIONS.marriage.maleficPlanets).toContain("Saturn");
  });

  it("has moon phase bonuses for marriage", () => {
    expect(ASTRO_EVENT_CONDITIONS.marriage.moonPhaseBonus).toHaveProperty("full_moon");
    expect(ASTRO_EVENT_CONDITIONS.marriage.moonPhaseBonus.full_moon).toBe(8);
  });

  it("has career benefic signs", () => {
    expect(ASTRO_EVENT_CONDITIONS.career.beneficSigns).toContain("Capricorn");
    expect(ASTRO_EVENT_CONDITIONS.career.beneficSigns).toContain("Leo");
  });

  it("has investment benefic planets", () => {
    expect(ASTRO_EVENT_CONDITIONS.investment.beneficPlanets).toContain("Jupiter");
    expect(ASTRO_EVENT_CONDITIONS.investment.beneficPlanets).toContain("Pluto");
  });

  it("has study benefic signs", () => {
    expect(ASTRO_EVENT_CONDITIONS.study.beneficSigns).toContain("Gemini");
    expect(ASTRO_EVENT_CONDITIONS.study.beneficSigns).toContain("Virgo");
  });
});

describe("TRANSIT_EVENT_CONDITIONS", () => {
  it("has marriage transit conditions", () => {
    expect(TRANSIT_EVENT_CONDITIONS.marriage.beneficPlanets).toContain("Jupiter");
    expect(TRANSIT_EVENT_CONDITIONS.marriage.keyNatalPoints).toContain("Venus");
    expect(TRANSIT_EVENT_CONDITIONS.marriage.favorableHouses).toContain(7);
  });

  it("has career transit conditions", () => {
    expect(TRANSIT_EVENT_CONDITIONS.career.keyNatalPoints).toContain("MC");
    expect(TRANSIT_EVENT_CONDITIONS.career.favorableHouses).toContain(10);
  });

  it("has investment transit conditions", () => {
    expect(TRANSIT_EVENT_CONDITIONS.investment.favorableHouses).toContain(2);
    expect(TRANSIT_EVENT_CONDITIONS.investment.favorableHouses).toContain(8);
  });

  it("specifies benefic and malefic aspects", () => {
    expect(TRANSIT_EVENT_CONDITIONS.marriage.beneficAspects).toContain("conjunction");
    expect(TRANSIT_EVENT_CONDITIONS.marriage.beneficAspects).toContain("trine");
    expect(TRANSIT_EVENT_CONDITIONS.marriage.maleficAspects).toContain("square");
  });
});

describe("EVENT_HOUSES", () => {
  it("has marriage house assignments", () => {
    expect(EVENT_HOUSES.marriage.primary).toContain(7);
    expect(EVENT_HOUSES.marriage.secondary).toContain(5);
    expect(EVENT_HOUSES.marriage.avoid).toContain(12);
  });

  it("has career house assignments", () => {
    expect(EVENT_HOUSES.career.primary).toContain(10);
    expect(EVENT_HOUSES.career.primary).toContain(6);
  });

  it("has investment house assignments", () => {
    expect(EVENT_HOUSES.investment.primary).toContain(2);
    expect(EVENT_HOUSES.investment.primary).toContain(8);
  });

  it("12th house is generally avoided", () => {
    const eventTypes = ["marriage", "career", "investment", "move", "study", "health", "relationship"];
    eventTypes.forEach((type) => {
      expect(EVENT_HOUSES[type as keyof typeof EVENT_HOUSES].avoid).toContain(12);
    });
  });
});

describe("SIBSIN_SCORES (0-100 scale)", () => {
  it("gives highest score to 정관 (80)", () => {
    expect(SIBSIN_SCORES["정관"]).toBe(80);
  });

  it("gives positive score to 정재 (75)", () => {
    expect(SIBSIN_SCORES["정재"]).toBe(75);
  });

  it("gives lowest score to 겁재 (45)", () => {
    expect(SIBSIN_SCORES["겁재"]).toBe(45);
  });

  it("gives neutral score to 상관 (50)", () => {
    expect(SIBSIN_SCORES["상관"]).toBe(50);
  });

  it("has scores for all 10 sibsin", () => {
    const sibsin = ["정관", "정재", "정인", "식신", "편관", "편재", "편인", "상관", "비견", "겁재"];
    sibsin.forEach((s) => {
      expect(SIBSIN_SCORES).toHaveProperty(s);
    });
  });
});

describe("Stem relationships", () => {
  describe("STEM_COMBINATIONS (천간합)", () => {
    it("has 甲己 combination transforming to earth", () => {
      expect(STEM_COMBINATIONS["甲己"]).toContain("토");
      expect(STEM_COMBINATIONS["己甲"]).toContain("토");
    });

    it("has 乙庚 combination transforming to metal", () => {
      expect(STEM_COMBINATIONS["乙庚"]).toContain("금");
    });

    it("has 丙辛 combination transforming to water", () => {
      expect(STEM_COMBINATIONS["丙辛"]).toContain("수");
    });

    it("has 丁壬 combination transforming to wood", () => {
      expect(STEM_COMBINATIONS["丁壬"]).toContain("목");
    });

    it("has 戊癸 combination transforming to fire", () => {
      expect(STEM_COMBINATIONS["戊癸"]).toContain("화");
    });
  });

  describe("STEM_CLASHES (천간충)", () => {
    it("includes 甲庚 clash", () => {
      expect(STEM_CLASHES).toContain("甲庚");
      expect(STEM_CLASHES).toContain("庚甲");
    });

    it("includes 丙壬 clash", () => {
      expect(STEM_CLASHES).toContain("丙壬");
    });

    it("has 8 clash pairs (both directions)", () => {
      expect(STEM_CLASHES).toHaveLength(8);
    });
  });
});

describe("Branch relationships", () => {
  describe("SIX_COMBOS (육합)", () => {
    it("has 子丑 combination", () => {
      expect(SIX_COMBOS["子丑"]).toBe("육합");
      expect(SIX_COMBOS["丑子"]).toBe("육합");
    });

    it("has 寅亥 combination", () => {
      expect(SIX_COMBOS["寅亥"]).toBe("육합");
    });

    it("has 午未 combination", () => {
      expect(SIX_COMBOS["午未"]).toBe("육합");
    });
  });

  describe("PARTIAL_TRINES (삼합)", () => {
    it("has fire trine (寅午戌)", () => {
      expect(PARTIAL_TRINES["寅午"]).toContain("화국");
      expect(PARTIAL_TRINES["午戌"]).toContain("화국");
    });

    it("has water trine (申子辰)", () => {
      expect(PARTIAL_TRINES["申子"]).toContain("수국");
      expect(PARTIAL_TRINES["子辰"]).toContain("수국");
    });

    it("has metal trine (巳酉丑)", () => {
      expect(PARTIAL_TRINES["巳酉"]).toContain("금국");
    });

    it("has wood trine (亥卯未)", () => {
      expect(PARTIAL_TRINES["亥卯"]).toContain("목국");
    });
  });

  describe("BRANCH_CLASHES (충)", () => {
    it("has 子午 clash", () => {
      expect(BRANCH_CLASHES["子午"]).toBe("충");
      expect(BRANCH_CLASHES["午子"]).toBe("충");
    });

    it("has 寅申 clash", () => {
      expect(BRANCH_CLASHES["寅申"]).toBe("충");
    });

    it("has 卯酉 clash", () => {
      expect(BRANCH_CLASHES["卯酉"]).toBe("충");
    });

    it("has all 6 clash pairs (both directions)", () => {
      const clashes = Object.keys(BRANCH_CLASHES);
      expect(clashes.length).toBe(12); // 6 pairs × 2 directions
    });
  });

  describe("BRANCH_PUNISHMENTS (형)", () => {
    it("has 寅巳 punishment", () => {
      expect(BRANCH_PUNISHMENTS["寅巳"]).toBe("형");
    });

    it("has 子卯 punishment (ungrateful punishment)", () => {
      expect(BRANCH_PUNISHMENTS["子卯"]).toBe("형");
    });

    it("has 丑戌 punishment", () => {
      expect(BRANCH_PUNISHMENTS["丑戌"]).toBe("형");
    });
  });
});

describe("EVENT_NAMES_FULL", () => {
  it("has bilingual names for all events", () => {
    expect(EVENT_NAMES_FULL.marriage.ko).toBe("결혼");
    expect(EVENT_NAMES_FULL.marriage.en).toBe("Marriage");
  });

  it("has career event names", () => {
    expect(EVENT_NAMES_FULL.career.ko).toBe("취업/이직");
    expect(EVENT_NAMES_FULL.career.en).toBe("Career");
  });

  it("has all 7 event types", () => {
    const types = ["marriage", "career", "investment", "move", "study", "health", "relationship"];
    types.forEach((type) => {
      expect(EVENT_NAMES_FULL).toHaveProperty(type);
      expect(EVENT_NAMES_FULL[type as keyof typeof EVENT_NAMES_FULL]).toHaveProperty("ko");
      expect(EVENT_NAMES_FULL[type as keyof typeof EVENT_NAMES_FULL]).toHaveProperty("en");
    });
  });
});
