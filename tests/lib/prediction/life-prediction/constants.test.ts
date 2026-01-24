/**
 * Life Prediction Constants Tests
 *
 * Tests for constant values used in the life prediction engine
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
  SIBSIN_SCORES_RELATIVE,
  STEM_COMBINATIONS,
  STEM_CLASHES,
  SIX_COMBOS,
  PARTIAL_TRINES,
  BRANCH_CLASHES,
  BRANCH_PUNISHMENTS,
  EVENT_NAMES_FULL,
} from "@/lib/prediction/life-prediction/constants";

describe("STEMS constant", () => {
  it("has exactly 10 heavenly stems", () => {
    expect(STEMS).toHaveLength(10);
  });

  it("contains all 10 stems in order", () => {
    expect(STEMS).toEqual([
      "甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸",
    ]);
  });

  it("starts with 甲 (Gap)", () => {
    expect(STEMS[0]).toBe("甲");
  });

  it("ends with 癸 (Gye)", () => {
    expect(STEMS[9]).toBe("癸");
  });
});

describe("BRANCHES constant", () => {
  it("has exactly 12 earthly branches", () => {
    expect(BRANCHES).toHaveLength(12);
  });

  it("contains all 12 branches in order", () => {
    expect(BRANCHES).toEqual([
      "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥",
    ]);
  });

  it("starts with 子 (Ja - Rat)", () => {
    expect(BRANCHES[0]).toBe("子");
  });

  it("ends with 亥 (Hae - Pig)", () => {
    expect(BRANCHES[11]).toBe("亥");
  });
});

describe("STEM_ELEMENT mapping", () => {
  it("maps all 10 stems to elements", () => {
    expect(Object.keys(STEM_ELEMENT)).toHaveLength(10);
  });

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

  it("each element has two stems", () => {
    const elements = Object.values(STEM_ELEMENT);
    const counts = elements.reduce((acc, el) => {
      acc[el] = (acc[el] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    expect(counts["목"]).toBe(2);
    expect(counts["화"]).toBe(2);
    expect(counts["토"]).toBe(2);
    expect(counts["금"]).toBe(2);
    expect(counts["수"]).toBe(2);
  });
});

describe("EVENT_FAVORABLE_CONDITIONS", () => {
  const eventTypes = ["marriage", "career", "investment", "move", "study", "health", "relationship"];

  it("has conditions for all 7 event types", () => {
    expect(Object.keys(EVENT_FAVORABLE_CONDITIONS)).toHaveLength(7);
  });

  it.each(eventTypes)("has favorable conditions for %s", (eventType) => {
    const conditions = EVENT_FAVORABLE_CONDITIONS[eventType as keyof typeof EVENT_FAVORABLE_CONDITIONS];
    expect(conditions).toBeDefined();
    expect(conditions.favorableSibsin).toBeDefined();
    expect(conditions.favorableStages).toBeDefined();
    expect(conditions.favorableElements).toBeDefined();
    expect(conditions.avoidSibsin).toBeDefined();
    expect(conditions.avoidStages).toBeDefined();
  });

  it("marriage has 정관, 정재 as favorable sibsin", () => {
    const marriage = EVENT_FAVORABLE_CONDITIONS.marriage;
    expect(marriage.favorableSibsin).toContain("정관");
    expect(marriage.favorableSibsin).toContain("정재");
  });

  it("career has favorable stages including 건록", () => {
    const career = EVENT_FAVORABLE_CONDITIONS.career;
    expect(career.favorableStages).toContain("건록");
    expect(career.favorableStages).toContain("제왕");
  });

  it("investment avoids 겁재 sibsin", () => {
    const investment = EVENT_FAVORABLE_CONDITIONS.investment;
    expect(investment.avoidSibsin).toContain("겁재");
  });

  it("study favors 수 and 목 elements", () => {
    const study = EVENT_FAVORABLE_CONDITIONS.study;
    expect(study.favorableElements).toContain("수");
    expect(study.favorableElements).toContain("목");
  });

  it("health avoids 병 stage", () => {
    const health = EVENT_FAVORABLE_CONDITIONS.health;
    expect(health.avoidStages).toContain("병");
  });
});

describe("ASTRO_EVENT_CONDITIONS", () => {
  const eventTypes = ["marriage", "career", "investment", "move", "study", "health", "relationship"];

  it("has conditions for all 7 event types", () => {
    expect(Object.keys(ASTRO_EVENT_CONDITIONS)).toHaveLength(7);
  });

  it.each(eventTypes)("has astro conditions for %s", (eventType) => {
    const conditions = ASTRO_EVENT_CONDITIONS[eventType as keyof typeof ASTRO_EVENT_CONDITIONS];
    expect(conditions).toBeDefined();
    expect(conditions.beneficSigns).toBeDefined();
    expect(conditions.beneficPlanets).toBeDefined();
    expect(conditions.maleficPlanets).toBeDefined();
    expect(conditions.moonPhaseBonus).toBeDefined();
  });

  it("marriage has Venus as benefic planet", () => {
    const marriage = ASTRO_EVENT_CONDITIONS.marriage;
    expect(marriage.beneficPlanets).toContain("Venus");
    expect(marriage.beneficPlanets).toContain("Jupiter");
  });

  it("career has Capricorn as benefic sign", () => {
    const career = ASTRO_EVENT_CONDITIONS.career;
    expect(career.beneficSigns).toContain("Capricorn");
    expect(career.beneficSigns).toContain("Leo");
  });

  it("investment has moon phase bonuses", () => {
    const investment = ASTRO_EVENT_CONDITIONS.investment;
    expect(investment.moonPhaseBonus.new_moon).toBeGreaterThan(0);
    expect(investment.moonPhaseBonus.waxing_crescent).toBeGreaterThan(0);
  });

  it("study has Mercury as benefic planet", () => {
    const study = ASTRO_EVENT_CONDITIONS.study;
    expect(study.beneficPlanets).toContain("Mercury");
    expect(study.beneficSigns).toContain("Gemini");
  });

  it("extends base EVENT_FAVORABLE_CONDITIONS", () => {
    const marriage = ASTRO_EVENT_CONDITIONS.marriage;
    expect(marriage.favorableSibsin).toBeDefined();
    expect(marriage.favorableStages).toBeDefined();
  });
});

describe("TRANSIT_EVENT_CONDITIONS", () => {
  const eventTypes = ["marriage", "career", "investment", "move", "study", "health", "relationship"];

  it("has conditions for all 7 event types", () => {
    expect(Object.keys(TRANSIT_EVENT_CONDITIONS)).toHaveLength(7);
  });

  it.each(eventTypes)("has transit conditions for %s", (eventType) => {
    const conditions = TRANSIT_EVENT_CONDITIONS[eventType as keyof typeof TRANSIT_EVENT_CONDITIONS];
    expect(conditions).toBeDefined();
    expect(conditions.beneficPlanets).toBeDefined();
    expect(conditions.maleficPlanets).toBeDefined();
    expect(conditions.keyNatalPoints).toBeDefined();
    expect(conditions.beneficAspects).toBeDefined();
    expect(conditions.maleficAspects).toBeDefined();
    expect(conditions.favorableHouses).toBeDefined();
  });

  it("marriage uses 7th house as primary", () => {
    const marriage = TRANSIT_EVENT_CONDITIONS.marriage;
    expect(marriage.favorableHouses).toContain(7);
    expect(marriage.keyNatalPoints).toContain("Venus");
  });

  it("career uses 10th house as primary", () => {
    const career = TRANSIT_EVENT_CONDITIONS.career;
    expect(career.favorableHouses).toContain(10);
    expect(career.keyNatalPoints).toContain("MC");
  });

  it("benefic aspects include trine and sextile", () => {
    const investment = TRANSIT_EVENT_CONDITIONS.investment;
    expect(investment.beneficAspects).toContain("trine");
    expect(investment.beneficAspects).toContain("sextile");
    expect(investment.beneficAspects).toContain("conjunction");
  });

  it("malefic aspects include square and opposition", () => {
    const health = TRANSIT_EVENT_CONDITIONS.health;
    expect(health.maleficAspects).toContain("square");
    expect(health.maleficAspects).toContain("opposition");
  });
});

describe("EVENT_HOUSES", () => {
  const eventTypes = ["marriage", "career", "investment", "move", "study", "health", "relationship"];

  it("has house info for all 7 event types", () => {
    expect(Object.keys(EVENT_HOUSES)).toHaveLength(7);
  });

  it.each(eventTypes)("has primary, secondary, and avoid houses for %s", (eventType) => {
    const houses = EVENT_HOUSES[eventType as keyof typeof EVENT_HOUSES];
    expect(houses.primary).toBeDefined();
    expect(houses.secondary).toBeDefined();
    expect(houses.avoid).toBeDefined();
    expect(Array.isArray(houses.primary)).toBe(true);
    expect(Array.isArray(houses.secondary)).toBe(true);
    expect(Array.isArray(houses.avoid)).toBe(true);
  });

  it("marriage has 7th house as primary", () => {
    expect(EVENT_HOUSES.marriage.primary).toContain(7);
  });

  it("career has 10th and 6th houses as primary", () => {
    expect(EVENT_HOUSES.career.primary).toContain(10);
    expect(EVENT_HOUSES.career.primary).toContain(6);
  });

  it("most events avoid 12th house", () => {
    expect(EVENT_HOUSES.marriage.avoid).toContain(12);
    expect(EVENT_HOUSES.career.avoid).toContain(12);
    expect(EVENT_HOUSES.investment.avoid).toContain(12);
  });
});

describe("SIBSIN_SCORES (0-100 scale)", () => {
  it("has scores for 10 sibsin types", () => {
    expect(Object.keys(SIBSIN_SCORES)).toHaveLength(10);
  });

  it("정관 has highest score (80)", () => {
    expect(SIBSIN_SCORES["정관"]).toBe(80);
  });

  it("정재 has positive score (75)", () => {
    expect(SIBSIN_SCORES["정재"]).toBe(75);
  });

  it("겁재 has lowest score (45)", () => {
    expect(SIBSIN_SCORES["겁재"]).toBe(45);
  });

  it("상관 is neutral (50)", () => {
    expect(SIBSIN_SCORES["상관"]).toBe(50);
  });

  it("all scores are in 0-100 range", () => {
    Object.values(SIBSIN_SCORES).forEach(score => {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});

describe("SIBSIN_SCORES_RELATIVE (relative weights)", () => {
  it("has scores for 10 sibsin types", () => {
    expect(Object.keys(SIBSIN_SCORES_RELATIVE)).toHaveLength(10);
  });

  it("정관 has highest positive weight (15)", () => {
    expect(SIBSIN_SCORES_RELATIVE["정관"]).toBe(15);
  });

  it("겁재 has most negative weight (-8)", () => {
    expect(SIBSIN_SCORES_RELATIVE["겁재"]).toBe(-8);
  });

  it("all scores are in -10 to 20 range", () => {
    Object.values(SIBSIN_SCORES_RELATIVE).forEach(score => {
      expect(score).toBeGreaterThanOrEqual(-10);
      expect(score).toBeLessThanOrEqual(20);
    });
  });
});

describe("STEM_COMBINATIONS (천간합)", () => {
  it("has 10 combinations (5 pairs, bidirectional)", () => {
    expect(Object.keys(STEM_COMBINATIONS)).toHaveLength(10);
  });

  it("甲己 combines to earth", () => {
    expect(STEM_COMBINATIONS["甲己"]).toContain("토");
    expect(STEM_COMBINATIONS["己甲"]).toContain("토");
  });

  it("乙庚 combines to metal", () => {
    expect(STEM_COMBINATIONS["乙庚"]).toContain("금");
    expect(STEM_COMBINATIONS["庚乙"]).toContain("금");
  });

  it("丙辛 combines to water", () => {
    expect(STEM_COMBINATIONS["丙辛"]).toContain("수");
    expect(STEM_COMBINATIONS["辛丙"]).toContain("수");
  });

  it("丁壬 combines to wood", () => {
    expect(STEM_COMBINATIONS["丁壬"]).toContain("목");
    expect(STEM_COMBINATIONS["壬丁"]).toContain("목");
  });

  it("戊癸 combines to fire", () => {
    expect(STEM_COMBINATIONS["戊癸"]).toContain("화");
    expect(STEM_COMBINATIONS["癸戊"]).toContain("화");
  });
});

describe("STEM_CLASHES (천간충)", () => {
  it("has 8 clashes (4 pairs, bidirectional)", () => {
    expect(STEM_CLASHES).toHaveLength(8);
  });

  it("includes 甲庚 clash", () => {
    expect(STEM_CLASHES).toContain("甲庚");
    expect(STEM_CLASHES).toContain("庚甲");
  });

  it("includes 乙辛 clash", () => {
    expect(STEM_CLASHES).toContain("乙辛");
    expect(STEM_CLASHES).toContain("辛乙");
  });

  it("includes 丙壬 clash", () => {
    expect(STEM_CLASHES).toContain("丙壬");
    expect(STEM_CLASHES).toContain("壬丙");
  });

  it("includes 丁癸 clash", () => {
    expect(STEM_CLASHES).toContain("丁癸");
    expect(STEM_CLASHES).toContain("癸丁");
  });
});

describe("SIX_COMBOS (육합)", () => {
  it("has 12 combinations (6 pairs, bidirectional)", () => {
    expect(Object.keys(SIX_COMBOS)).toHaveLength(12);
  });

  it("子丑 is 육합", () => {
    expect(SIX_COMBOS["子丑"]).toBe("육합");
    expect(SIX_COMBOS["丑子"]).toBe("육합");
  });

  it("寅亥 is 육합", () => {
    expect(SIX_COMBOS["寅亥"]).toBe("육합");
    expect(SIX_COMBOS["亥寅"]).toBe("육합");
  });

  it("卯戌 is 육합", () => {
    expect(SIX_COMBOS["卯戌"]).toBe("육합");
    expect(SIX_COMBOS["戌卯"]).toBe("육합");
  });

  it("all values are 육합", () => {
    Object.values(SIX_COMBOS).forEach(value => {
      expect(value).toBe("육합");
    });
  });
});

describe("PARTIAL_TRINES (삼합)", () => {
  it("has partial trine combinations", () => {
    expect(Object.keys(PARTIAL_TRINES).length).toBeGreaterThan(0);
  });

  it("寅午 is fire trine", () => {
    expect(PARTIAL_TRINES["寅午"]).toContain("화국");
  });

  it("申子 is water trine", () => {
    expect(PARTIAL_TRINES["申子"]).toContain("수국");
  });

  it("巳酉 is metal trine", () => {
    expect(PARTIAL_TRINES["巳酉"]).toContain("금국");
  });

  it("亥卯 is wood trine", () => {
    expect(PARTIAL_TRINES["亥卯"]).toContain("목국");
  });

  it("all values contain 삼합", () => {
    Object.values(PARTIAL_TRINES).forEach(value => {
      expect(value).toContain("삼합");
    });
  });
});

describe("BRANCH_CLASHES (충)", () => {
  it("has 12 clashes (6 pairs, bidirectional)", () => {
    expect(Object.keys(BRANCH_CLASHES)).toHaveLength(12);
  });

  it("子午 is clash", () => {
    expect(BRANCH_CLASHES["子午"]).toBe("충");
    expect(BRANCH_CLASHES["午子"]).toBe("충");
  });

  it("丑未 is clash", () => {
    expect(BRANCH_CLASHES["丑未"]).toBe("충");
    expect(BRANCH_CLASHES["未丑"]).toBe("충");
  });

  it("寅申 is clash", () => {
    expect(BRANCH_CLASHES["寅申"]).toBe("충");
    expect(BRANCH_CLASHES["申寅"]).toBe("충");
  });

  it("卯酉 is clash", () => {
    expect(BRANCH_CLASHES["卯酉"]).toBe("충");
    expect(BRANCH_CLASHES["酉卯"]).toBe("충");
  });

  it("辰戌 is clash", () => {
    expect(BRANCH_CLASHES["辰戌"]).toBe("충");
    expect(BRANCH_CLASHES["戌辰"]).toBe("충");
  });

  it("巳亥 is clash", () => {
    expect(BRANCH_CLASHES["巳亥"]).toBe("충");
    expect(BRANCH_CLASHES["亥巳"]).toBe("충");
  });
});

describe("BRANCH_PUNISHMENTS (형)", () => {
  it("has punishment combinations", () => {
    expect(Object.keys(BRANCH_PUNISHMENTS).length).toBeGreaterThan(0);
  });

  it("寅巳 is punishment", () => {
    expect(BRANCH_PUNISHMENTS["寅巳"]).toBe("형");
    expect(BRANCH_PUNISHMENTS["巳寅"]).toBe("형");
  });

  it("丑戌 is punishment", () => {
    expect(BRANCH_PUNISHMENTS["丑戌"]).toBe("형");
    expect(BRANCH_PUNISHMENTS["戌丑"]).toBe("형");
  });

  it("子卯 is punishment", () => {
    expect(BRANCH_PUNISHMENTS["子卯"]).toBe("형");
    expect(BRANCH_PUNISHMENTS["卯子"]).toBe("형");
  });

  it("all values are 형", () => {
    Object.values(BRANCH_PUNISHMENTS).forEach(value => {
      expect(value).toBe("형");
    });
  });
});

describe("EVENT_NAMES_FULL", () => {
  const eventTypes = ["marriage", "career", "investment", "move", "study", "health", "relationship"];

  it("has names for all 7 event types", () => {
    expect(Object.keys(EVENT_NAMES_FULL)).toHaveLength(7);
  });

  it.each(eventTypes)("has Korean and English names for %s", (eventType) => {
    const names = EVENT_NAMES_FULL[eventType as keyof typeof EVENT_NAMES_FULL];
    expect(names.ko).toBeDefined();
    expect(names.en).toBeDefined();
    expect(typeof names.ko).toBe("string");
    expect(typeof names.en).toBe("string");
  });

  it("marriage is 결혼 in Korean", () => {
    expect(EVENT_NAMES_FULL.marriage.ko).toBe("결혼");
    expect(EVENT_NAMES_FULL.marriage.en).toBe("Marriage");
  });

  it("career is 취업/이직 in Korean", () => {
    expect(EVENT_NAMES_FULL.career.ko).toBe("취업/이직");
    expect(EVENT_NAMES_FULL.career.en).toBe("Career");
  });

  it("investment is 투자 in Korean", () => {
    expect(EVENT_NAMES_FULL.investment.ko).toBe("투자");
    expect(EVENT_NAMES_FULL.investment.en).toBe("Investment");
  });

  it("move is 이사 in Korean", () => {
    expect(EVENT_NAMES_FULL.move.ko).toBe("이사");
    expect(EVENT_NAMES_FULL.move.en).toBe("Move");
  });

  it("study is 학업/시험 in Korean", () => {
    expect(EVENT_NAMES_FULL.study.ko).toBe("학업/시험");
    expect(EVENT_NAMES_FULL.study.en).toBe("Study");
  });
});
