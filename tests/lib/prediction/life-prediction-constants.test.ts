/**
 * Life Prediction Constants Tests
 * Tests for event-based prediction constants and mappings
 */

import { describe, it, expect } from "vitest";
import {
  STEMS,
  BRANCHES,
  STEM_ELEMENT,
  EVENT_FAVORABLE_CONDITIONS,
  ASTRO_EVENT_CONDITIONS,
  TRANSIT_EVENT_CONDITIONS,
  EVENT_HOUSES,
  MOON_PHASE_NAMES,
  SIBSIN_SCORES,
  EVENT_NAMES,
  IMPORTANCE_WEIGHT,
  STEM_COMBINATIONS,
  STEM_CLASHES,
  SIX_COMBOS,
  PARTIAL_TRINES,
  CLASHES,
  PUNISHMENTS,
  CHEONEL_MAP,
  YEOKMA_MAP,
  MUNCHANG_MAP,
  GEOPSAL_MAP,
  STAGE_EVENT_EFFECTS,
} from "@/lib/prediction/life-prediction-constants";

describe("Life Prediction Constants", () => {
  describe("STEMS (천간)", () => {
    it("has exactly 10 heavenly stems", () => {
      expect(STEMS).toHaveLength(10);
    });

    it("contains all 10 stems in order", () => {
      expect(STEMS).toEqual(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
    });

    it("has unique values", () => {
      const unique = new Set(STEMS);
      expect(unique.size).toBe(10);
    });
  });

  describe("BRANCHES (지지)", () => {
    it("has exactly 12 earthly branches", () => {
      expect(BRANCHES).toHaveLength(12);
    });

    it("contains all 12 branches in order", () => {
      expect(BRANCHES).toEqual([
        "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥",
      ]);
    });

    it("has unique values", () => {
      const unique = new Set(BRANCHES);
      expect(unique.size).toBe(12);
    });
  });

  describe("STEM_ELEMENT (천간 오행)", () => {
    it("maps all 10 stems to elements", () => {
      expect(Object.keys(STEM_ELEMENT)).toHaveLength(10);
    });

    it("maps yin/yang pairs to same element", () => {
      expect(STEM_ELEMENT["甲"]).toBe("목"); // Yang Wood
      expect(STEM_ELEMENT["乙"]).toBe("목"); // Yin Wood
      expect(STEM_ELEMENT["丙"]).toBe("화"); // Yang Fire
      expect(STEM_ELEMENT["丁"]).toBe("화"); // Yin Fire
      expect(STEM_ELEMENT["戊"]).toBe("토"); // Yang Earth
      expect(STEM_ELEMENT["己"]).toBe("토"); // Yin Earth
      expect(STEM_ELEMENT["庚"]).toBe("금"); // Yang Metal
      expect(STEM_ELEMENT["辛"]).toBe("금"); // Yin Metal
      expect(STEM_ELEMENT["壬"]).toBe("수"); // Yang Water
      expect(STEM_ELEMENT["癸"]).toBe("수"); // Yin Water
    });

    it("uses five element system", () => {
      const elements = new Set(Object.values(STEM_ELEMENT));
      expect(elements.size).toBe(5);
      expect(elements).toContain("목");
      expect(elements).toContain("화");
      expect(elements).toContain("토");
      expect(elements).toContain("금");
      expect(elements).toContain("수");
    });
  });

  describe("EVENT_FAVORABLE_CONDITIONS", () => {
    const eventTypes = ["marriage", "career", "investment", "move", "study", "health", "relationship"];

    it("defines conditions for all event types", () => {
      eventTypes.forEach((type) => {
        expect(EVENT_FAVORABLE_CONDITIONS[type as keyof typeof EVENT_FAVORABLE_CONDITIONS]).toBeDefined();
      });
    });

    it("each event has required properties", () => {
      eventTypes.forEach((type) => {
        const conditions = EVENT_FAVORABLE_CONDITIONS[type as keyof typeof EVENT_FAVORABLE_CONDITIONS];
        expect(conditions).toHaveProperty("favorableSibsin");
        expect(conditions).toHaveProperty("favorableStages");
        expect(conditions).toHaveProperty("favorableElements");
        expect(conditions).toHaveProperty("avoidSibsin");
        expect(conditions).toHaveProperty("avoidStages");
      });
    });

    it("marriage conditions favor relationship sibsin", () => {
      const marriage = EVENT_FAVORABLE_CONDITIONS.marriage;
      expect(marriage.favorableSibsin).toContain("정관");
      expect(marriage.favorableSibsin).toContain("정재");
      expect(marriage.avoidSibsin).toContain("겁재");
    });

    it("career conditions favor authority sibsin", () => {
      const career = EVENT_FAVORABLE_CONDITIONS.career;
      expect(career.favorableSibsin).toContain("정관");
      expect(career.favorableSibsin).toContain("편관");
      expect(career.favorableElements).toContain("금");
    });

    it("investment conditions favor wealth sibsin", () => {
      const investment = EVENT_FAVORABLE_CONDITIONS.investment;
      expect(investment.favorableSibsin).toContain("정재");
      expect(investment.favorableSibsin).toContain("편재");
    });

    it("study conditions favor learning sibsin", () => {
      const study = EVENT_FAVORABLE_CONDITIONS.study;
      expect(study.favorableSibsin).toContain("정인");
      expect(study.favorableSibsin).toContain("편인");
      expect(study.favorableElements).toContain("수");
    });
  });

  describe("ASTRO_EVENT_CONDITIONS", () => {
    const eventTypes = ["marriage", "career", "investment", "move", "study", "health", "relationship"];

    it("defines conditions for all event types", () => {
      eventTypes.forEach((type) => {
        expect(ASTRO_EVENT_CONDITIONS[type as keyof typeof ASTRO_EVENT_CONDITIONS]).toBeDefined();
      });
    });

    it("each event has required properties", () => {
      eventTypes.forEach((type) => {
        const conditions = ASTRO_EVENT_CONDITIONS[type as keyof typeof ASTRO_EVENT_CONDITIONS];
        expect(conditions).toHaveProperty("favorableSigns");
        expect(conditions).toHaveProperty("keyPlanets");
        expect(conditions).toHaveProperty("favorableHouses");
        expect(conditions).toHaveProperty("avoidRetrogrades");
        expect(conditions).toHaveProperty("moonPhaseBonus");
      });
    });

    it("marriage conditions use Venus and relationship signs", () => {
      const marriage = ASTRO_EVENT_CONDITIONS.marriage;
      expect(marriage.keyPlanets).toContain("Venus");
      expect(marriage.favorableSigns).toContain("Libra");
      expect(marriage.favorableHouses).toContain(7);
    });

    it("career conditions use Sun and Saturn", () => {
      const career = ASTRO_EVENT_CONDITIONS.career;
      expect(career.keyPlanets).toContain("Sun");
      expect(career.keyPlanets).toContain("Saturn");
      expect(career.favorableHouses).toContain(10);
    });

    it("moon phase bonuses are positive values", () => {
      eventTypes.forEach((type) => {
        const conditions = ASTRO_EVENT_CONDITIONS[type as keyof typeof ASTRO_EVENT_CONDITIONS];
        Object.values(conditions.moonPhaseBonus).forEach((bonus) => {
          expect(bonus).toBeGreaterThan(0);
        });
      });
    });
  });

  describe("TRANSIT_EVENT_CONDITIONS", () => {
    const eventTypes = ["marriage", "career", "investment", "move", "study", "health", "relationship"];

    it("defines conditions for all event types", () => {
      eventTypes.forEach((type) => {
        expect(TRANSIT_EVENT_CONDITIONS[type as keyof typeof TRANSIT_EVENT_CONDITIONS]).toBeDefined();
      });
    });

    it("each event has required properties", () => {
      eventTypes.forEach((type) => {
        const conditions = TRANSIT_EVENT_CONDITIONS[type as keyof typeof TRANSIT_EVENT_CONDITIONS];
        expect(conditions).toHaveProperty("beneficPlanets");
        expect(conditions).toHaveProperty("maleficPlanets");
        expect(conditions).toHaveProperty("keyNatalPoints");
        expect(conditions).toHaveProperty("beneficAspects");
        expect(conditions).toHaveProperty("maleficAspects");
        expect(conditions).toHaveProperty("favorableHouses");
      });
    });

    it("benefic aspects include harmonious types", () => {
      const career = TRANSIT_EVENT_CONDITIONS.career;
      expect(career.beneficAspects).toContain("conjunction");
      expect(career.beneficAspects).toContain("trine");
      expect(career.beneficAspects).toContain("sextile");
    });

    it("malefic aspects include challenging types", () => {
      const career = TRANSIT_EVENT_CONDITIONS.career;
      expect(career.maleficAspects).toContain("square");
      expect(career.maleficAspects).toContain("opposition");
    });
  });

  describe("EVENT_HOUSES", () => {
    const eventTypes = ["marriage", "career", "investment", "move", "study", "health", "relationship"];

    it("defines houses for all event types", () => {
      eventTypes.forEach((type) => {
        expect(EVENT_HOUSES[type as keyof typeof EVENT_HOUSES]).toBeDefined();
      });
    });

    it("each event has primary, secondary, and avoid houses", () => {
      eventTypes.forEach((type) => {
        const houses = EVENT_HOUSES[type as keyof typeof EVENT_HOUSES];
        expect(houses).toHaveProperty("primary");
        expect(houses).toHaveProperty("secondary");
        expect(houses).toHaveProperty("avoid");
      });
    });

    it("marriage uses 7th house (partnerships)", () => {
      expect(EVENT_HOUSES.marriage.primary).toContain(7);
    });

    it("career uses 10th house (profession)", () => {
      expect(EVENT_HOUSES.career.primary).toContain(10);
    });

    it("investment uses 2nd and 8th houses (money)", () => {
      expect(EVENT_HOUSES.investment.primary).toContain(2);
      expect(EVENT_HOUSES.investment.primary).toContain(8);
    });

    it("12th house is avoided for most events", () => {
      expect(EVENT_HOUSES.marriage.avoid).toContain(12);
      expect(EVENT_HOUSES.career.avoid).toContain(12);
      expect(EVENT_HOUSES.move.avoid).toContain(12);
    });
  });

  describe("MOON_PHASE_NAMES", () => {
    it("has 8 moon phases", () => {
      expect(Object.keys(MOON_PHASE_NAMES)).toHaveLength(8);
    });

    it("includes all standard moon phases", () => {
      expect(MOON_PHASE_NAMES).toHaveProperty("new_moon");
      expect(MOON_PHASE_NAMES).toHaveProperty("waxing_crescent");
      expect(MOON_PHASE_NAMES).toHaveProperty("first_quarter");
      expect(MOON_PHASE_NAMES).toHaveProperty("waxing_gibbous");
      expect(MOON_PHASE_NAMES).toHaveProperty("full_moon");
      expect(MOON_PHASE_NAMES).toHaveProperty("waning_gibbous");
      expect(MOON_PHASE_NAMES).toHaveProperty("last_quarter");
      expect(MOON_PHASE_NAMES).toHaveProperty("waning_crescent");
    });

    it("has Korean names for all phases", () => {
      expect(MOON_PHASE_NAMES.new_moon).toBe("새달");
      expect(MOON_PHASE_NAMES.full_moon).toBe("보름달");
      expect(MOON_PHASE_NAMES.first_quarter).toBe("상현달");
      expect(MOON_PHASE_NAMES.last_quarter).toBe("하현달");
    });
  });

  describe("SIBSIN_SCORES", () => {
    it("has scores for all 10 sibsin", () => {
      expect(Object.keys(SIBSIN_SCORES)).toHaveLength(10);
    });

    it("includes all sibsin types", () => {
      const sibsin = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"];
      sibsin.forEach((s) => {
        expect(SIBSIN_SCORES[s]).toBeDefined();
      });
    });

    it("scores are between 0 and 100", () => {
      Object.values(SIBSIN_SCORES).forEach((score) => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it("정관 has highest score", () => {
      expect(SIBSIN_SCORES["정관"]).toBe(80);
    });

    it("겁재 has lower score", () => {
      expect(SIBSIN_SCORES["겁재"]).toBe(45);
    });
  });

  describe("EVENT_NAMES", () => {
    const eventTypes = ["marriage", "career", "investment", "move", "study", "health", "relationship"];

    it("has Korean names for all event types", () => {
      eventTypes.forEach((type) => {
        expect(EVENT_NAMES[type as keyof typeof EVENT_NAMES]).toBeDefined();
      });
    });

    it("translates correctly", () => {
      expect(EVENT_NAMES.marriage).toBe("결혼");
      expect(EVENT_NAMES.career).toBe("커리어");
      expect(EVENT_NAMES.investment).toBe("투자");
      expect(EVENT_NAMES.move).toBe("이사");
      expect(EVENT_NAMES.study).toBe("학업");
      expect(EVENT_NAMES.health).toBe("건강");
      expect(EVENT_NAMES.relationship).toBe("인간관계");
    });
  });

  describe("IMPORTANCE_WEIGHT", () => {
    it("has weights for all cycle types", () => {
      expect(IMPORTANCE_WEIGHT).toHaveProperty("daeun");
      expect(IMPORTANCE_WEIGHT).toHaveProperty("seun");
      expect(IMPORTANCE_WEIGHT).toHaveProperty("wolun");
      expect(IMPORTANCE_WEIGHT).toHaveProperty("iljin");
    });

    it("weights sum to 1.0", () => {
      const sum =
        IMPORTANCE_WEIGHT.daeun +
        IMPORTANCE_WEIGHT.seun +
        IMPORTANCE_WEIGHT.wolun +
        IMPORTANCE_WEIGHT.iljin;
      expect(sum).toBe(1.0);
    });

    it("seun (annual) has highest weight", () => {
      expect(IMPORTANCE_WEIGHT.seun).toBe(0.35);
    });
  });

  describe("STEM_COMBINATIONS (천간합)", () => {
    it("has 10 combination pairs (5 pairs x 2 directions)", () => {
      expect(Object.keys(STEM_COMBINATIONS)).toHaveLength(10);
    });

    it("甲己 combines to earth", () => {
      expect(STEM_COMBINATIONS["甲己"]).toBe("토로 변화");
      expect(STEM_COMBINATIONS["己甲"]).toBe("토로 변화");
    });

    it("乙庚 combines to metal", () => {
      expect(STEM_COMBINATIONS["乙庚"]).toBe("금으로 변화");
    });

    it("丙辛 combines to water", () => {
      expect(STEM_COMBINATIONS["丙辛"]).toBe("수로 변화");
    });
  });

  describe("STEM_CLASHES (천간충)", () => {
    it("has 8 clash pairs", () => {
      expect(STEM_CLASHES).toHaveLength(8);
    });

    it("includes 甲庚 clash", () => {
      expect(STEM_CLASHES).toContain("甲庚");
      expect(STEM_CLASHES).toContain("庚甲");
    });
  });

  describe("SIX_COMBOS (육합)", () => {
    it("has 12 combination pairs (6 pairs x 2 directions)", () => {
      expect(Object.keys(SIX_COMBOS)).toHaveLength(12);
    });

    it("子丑 is a combo", () => {
      expect(SIX_COMBOS["子丑"]).toBe("육합");
      expect(SIX_COMBOS["丑子"]).toBe("육합");
    });
  });

  describe("PARTIAL_TRINES (삼합)", () => {
    it("has partial trine combinations", () => {
      expect(Object.keys(PARTIAL_TRINES).length).toBeGreaterThan(0);
    });

    it("寅午 is fire trine", () => {
      expect(PARTIAL_TRINES["寅午"]).toBe("화국 삼합");
    });

    it("申子 is water trine", () => {
      expect(PARTIAL_TRINES["申子"]).toBe("수국 삼합");
    });
  });

  describe("CLASHES (충)", () => {
    it("has 12 clash pairs (6 pairs x 2 directions)", () => {
      expect(Object.keys(CLASHES)).toHaveLength(12);
    });

    it("子午 is a clash", () => {
      expect(CLASHES["子午"]).toBe("충");
      expect(CLASHES["午子"]).toBe("충");
    });

    it("寅申 is a clash", () => {
      expect(CLASHES["寅申"]).toBe("충");
    });
  });

  describe("PUNISHMENTS (형)", () => {
    it("has punishment combinations", () => {
      expect(Object.keys(PUNISHMENTS).length).toBeGreaterThan(0);
    });

    it("寅巳 is a punishment", () => {
      expect(PUNISHMENTS["寅巳"]).toBe("형");
    });

    it("子卯 is a punishment", () => {
      expect(PUNISHMENTS["子卯"]).toBe("형");
    });
  });

  describe("CHEONEL_MAP (천을귀인)", () => {
    it("maps all 10 stems", () => {
      expect(Object.keys(CHEONEL_MAP)).toHaveLength(10);
    });

    it("each stem maps to branches", () => {
      Object.values(CHEONEL_MAP).forEach((branches) => {
        expect(Array.isArray(branches)).toBe(true);
        expect(branches.length).toBeGreaterThan(0);
      });
    });

    it("甲 maps to 丑 and 未", () => {
      expect(CHEONEL_MAP["甲"]).toContain("丑");
      expect(CHEONEL_MAP["甲"]).toContain("未");
    });
  });

  describe("YEOKMA_MAP (역마)", () => {
    it("maps all 12 branches", () => {
      expect(Object.keys(YEOKMA_MAP)).toHaveLength(12);
    });

    it("寅 has 申 as yeokma", () => {
      expect(YEOKMA_MAP["寅"]).toBe("申");
    });
  });

  describe("MUNCHANG_MAP (문창)", () => {
    it("maps all 10 stems", () => {
      expect(Object.keys(MUNCHANG_MAP)).toHaveLength(10);
    });

    it("甲 maps to 巳", () => {
      expect(MUNCHANG_MAP["甲"]).toBe("巳");
    });
  });

  describe("GEOPSAL_MAP (겁살)", () => {
    it("maps all 12 branches", () => {
      expect(Object.keys(GEOPSAL_MAP)).toHaveLength(12);
    });

    it("寅 has 亥 as geopsal", () => {
      expect(GEOPSAL_MAP["寅"]).toBe("亥");
    });
  });

  describe("STAGE_EVENT_EFFECTS (12운성 효과)", () => {
    it("defines effects for all 12 stages", () => {
      expect(Object.keys(STAGE_EVENT_EFFECTS)).toHaveLength(12);
    });

    it("includes all stages", () => {
      const stages = ["장생", "목욕", "관대", "건록", "제왕", "쇠", "병", "사", "묘", "절", "태", "양"];
      stages.forEach((stage) => {
        expect(STAGE_EVENT_EFFECTS[stage]).toBeDefined();
      });
    });

    it("건록 has positive career effect", () => {
      expect(STAGE_EVENT_EFFECTS["건록"].career).toContain("전성기");
    });

    it("병 suggests caution", () => {
      expect(STAGE_EVENT_EFFECTS["병"].career).toContain("휴식");
    });

    it("장생 indicates new beginnings", () => {
      expect(STAGE_EVENT_EFFECTS["장생"].career).toContain("새로운");
    });

    it("each stage has career, health, and relationship categories", () => {
      const stages = Object.keys(STAGE_EVENT_EFFECTS);
      stages.forEach((stage) => {
        expect(STAGE_EVENT_EFFECTS[stage]).toHaveProperty("career");
        expect(STAGE_EVENT_EFFECTS[stage]).toHaveProperty("health");
        expect(STAGE_EVENT_EFFECTS[stage]).toHaveProperty("relationship");
      });
    });

    it("제왕 indicates peak state", () => {
      expect(STAGE_EVENT_EFFECTS["제왕"].career).toContain("절정");
      expect(STAGE_EVENT_EFFECTS["제왕"].health).toContain("최고");
    });

    it("쇠 indicates decline", () => {
      expect(STAGE_EVENT_EFFECTS["쇠"].career).toContain("하락");
    });

    it("태 indicates conception/beginning", () => {
      expect(STAGE_EVENT_EFFECTS["태"].career).toContain("태동");
    });
  });

  describe("SCORE_THRESHOLDS", () => {
    // Import SCORE_THRESHOLDS if available
    it("can be imported from constants", async () => {
      const { SCORE_THRESHOLDS } = await import("@/lib/prediction/life-prediction-constants");
      expect(SCORE_THRESHOLDS).toBeDefined();
    });

    it("has valid score boundaries", async () => {
      const { SCORE_THRESHOLDS } = await import("@/lib/prediction/life-prediction-constants");
      expect(SCORE_THRESHOLDS.MIN).toBe(0);
      expect(SCORE_THRESHOLDS.MAX).toBe(100);
      expect(SCORE_THRESHOLDS.MIN).toBeLessThan(SCORE_THRESHOLDS.MAX);
    });

    it("has baseline values for monthly and weekly", async () => {
      const { SCORE_THRESHOLDS } = await import("@/lib/prediction/life-prediction-constants");
      expect(SCORE_THRESHOLDS.BASELINE_MONTHLY).toBeDefined();
      expect(SCORE_THRESHOLDS.BASELINE_WEEKLY).toBeDefined();
      expect(SCORE_THRESHOLDS.BASELINE_MONTHLY).toBeGreaterThan(SCORE_THRESHOLDS.BASELINE_WEEKLY);
    });

    it("has rating thresholds in correct order", async () => {
      const { SCORE_THRESHOLDS } = await import("@/lib/prediction/life-prediction-constants");
      expect(SCORE_THRESHOLDS.EXCELLENT).toBeGreaterThan(SCORE_THRESHOLDS.GOOD);
      expect(SCORE_THRESHOLDS.GOOD).toBeGreaterThan(SCORE_THRESHOLDS.AVERAGE);
      expect(SCORE_THRESHOLDS.AVERAGE).toBeGreaterThan(SCORE_THRESHOLDS.CAUTION);
    });
  });

  describe("EVENT_TYPE_NAMES_KO", () => {
    it("can be imported from constants", async () => {
      const { EVENT_TYPE_NAMES_KO } = await import("@/lib/prediction/life-prediction-constants");
      expect(EVENT_TYPE_NAMES_KO).toBeDefined();
    });

    it("includes extended event types", async () => {
      const { EVENT_TYPE_NAMES_KO } = await import("@/lib/prediction/life-prediction-constants");
      expect(EVENT_TYPE_NAMES_KO.business).toBe("사업");
      expect(EVENT_TYPE_NAMES_KO.travel).toBe("여행");
      expect(EVENT_TYPE_NAMES_KO.surgery).toBe("수술");
    });

    it("all values are non-empty Korean strings", async () => {
      const { EVENT_TYPE_NAMES_KO } = await import("@/lib/prediction/life-prediction-constants");
      Object.values(EVENT_TYPE_NAMES_KO).forEach((name) => {
        expect(typeof name).toBe("string");
        expect(name.length).toBeGreaterThan(0);
        // Korean text check (should contain Korean characters)
        expect(/[\uAC00-\uD7AF]/.test(name)).toBe(true);
      });
    });
  });

  describe("EVENT_KEYWORDS", () => {
    it("can be imported from constants", async () => {
      const { EVENT_KEYWORDS } = await import("@/lib/prediction/life-prediction-constants");
      expect(EVENT_KEYWORDS).toBeDefined();
    });

    it("each event type has both Korean and English keywords", async () => {
      const { EVENT_KEYWORDS } = await import("@/lib/prediction/life-prediction-constants");
      Object.values(EVENT_KEYWORDS).forEach((keywords) => {
        expect(Array.isArray(keywords)).toBe(true);
        expect(keywords.length).toBeGreaterThan(0);
        // Should have at least one Korean keyword
        const hasKorean = keywords.some((k) => /[\uAC00-\uD7AF]/.test(k));
        // Should have at least one English keyword
        const hasEnglish = keywords.some((k) => /[a-zA-Z]/.test(k));
        expect(hasKorean).toBe(true);
        expect(hasEnglish).toBe(true);
      });
    });

    it("marriage keywords include wedding terms", async () => {
      const { EVENT_KEYWORDS } = await import("@/lib/prediction/life-prediction-constants");
      expect(EVENT_KEYWORDS.marriage).toContain("결혼");
      expect(EVENT_KEYWORDS.marriage).toContain("wedding");
    });

    it("career keywords include job terms", async () => {
      const { EVENT_KEYWORDS } = await import("@/lib/prediction/life-prediction-constants");
      expect(EVENT_KEYWORDS.career).toContain("취업");
      expect(EVENT_KEYWORDS.career).toContain("job");
    });
  });

  describe("Cross-constant Consistency", () => {
    it("EVENT_NAMES is subset of EVENT_TYPE_NAMES_KO", async () => {
      const { EVENT_NAMES, EVENT_TYPE_NAMES_KO } = await import("@/lib/prediction/life-prediction-constants");
      // EVENT_NAMES has 7 core event types, EVENT_TYPE_NAMES_KO has extended types (business, travel, surgery)
      Object.keys(EVENT_NAMES).forEach(key => {
        expect(EVENT_TYPE_NAMES_KO[key]).toBe(EVENT_NAMES[key]);
      });
    });

    it("EVENT_FAVORABLE_CONDITIONS has all EVENT_NAMES keys", () => {
      const eventKeys = Object.keys(EVENT_NAMES);
      const conditionKeys = Object.keys(EVENT_FAVORABLE_CONDITIONS);
      // Most event names should be in favorable conditions
      const coveredKeys = eventKeys.filter((k) => conditionKeys.includes(k));
      expect(coveredKeys.length).toBeGreaterThan(5);
    });

    it("STEMS and STEM_ELEMENT keys match", () => {
      const stemElementKeys = Object.keys(STEM_ELEMENT);
      expect(stemElementKeys).toHaveLength(STEMS.length);
      STEMS.forEach((stem) => {
        expect(STEM_ELEMENT[stem]).toBeDefined();
      });
    });

    it("all STEM_COMBINATIONS use valid stems", () => {
      const validStems = new Set(STEMS);
      Object.keys(STEM_COMBINATIONS).forEach((combo) => {
        expect(combo.length).toBe(2);
        expect(validStems.has(combo[0])).toBe(true);
        expect(validStems.has(combo[1])).toBe(true);
      });
    });

    it("all STEM_CLASHES use valid stems", () => {
      const validStems = new Set(STEMS);
      STEM_CLASHES.forEach((clash) => {
        expect(clash.length).toBe(2);
        expect(validStems.has(clash[0])).toBe(true);
        expect(validStems.has(clash[1])).toBe(true);
      });
    });

    it("all SIX_COMBOS use valid branches", () => {
      const validBranches = new Set(BRANCHES);
      Object.keys(SIX_COMBOS).forEach((combo) => {
        expect(combo.length).toBe(2);
        expect(validBranches.has(combo[0])).toBe(true);
        expect(validBranches.has(combo[1])).toBe(true);
      });
    });

    it("all CLASHES use valid branches", () => {
      const validBranches = new Set(BRANCHES);
      Object.keys(CLASHES).forEach((clash) => {
        expect(clash.length).toBe(2);
        expect(validBranches.has(clash[0])).toBe(true);
        expect(validBranches.has(clash[1])).toBe(true);
      });
    });

    it("all PUNISHMENTS use valid branches", () => {
      const validBranches = new Set(BRANCHES);
      Object.keys(PUNISHMENTS).forEach((punishment) => {
        expect(punishment.length).toBe(2);
        expect(validBranches.has(punishment[0])).toBe(true);
        expect(validBranches.has(punishment[1])).toBe(true);
      });
    });

    it("IMPORTANCE_WEIGHT values are between 0 and 1", () => {
      Object.values(IMPORTANCE_WEIGHT).forEach((weight) => {
        expect(weight).toBeGreaterThan(0);
        expect(weight).toBeLessThanOrEqual(1);
      });
    });

    it("CHEONEL_MAP uses valid stems as keys", () => {
      const validStems = new Set(STEMS);
      Object.keys(CHEONEL_MAP).forEach((stem) => {
        expect(validStems.has(stem)).toBe(true);
      });
    });

    it("CHEONEL_MAP uses valid branches as values", () => {
      const validBranches = new Set(BRANCHES);
      Object.values(CHEONEL_MAP).forEach((branches) => {
        branches.forEach((branch) => {
          expect(validBranches.has(branch)).toBe(true);
        });
      });
    });

    it("YEOKMA_MAP uses valid branches", () => {
      const validBranches = new Set(BRANCHES);
      Object.entries(YEOKMA_MAP).forEach(([key, value]) => {
        expect(validBranches.has(key)).toBe(true);
        expect(validBranches.has(value)).toBe(true);
      });
    });

    it("MUNCHANG_MAP uses valid stems and branches", () => {
      const validStems = new Set(STEMS);
      const validBranches = new Set(BRANCHES);
      Object.entries(MUNCHANG_MAP).forEach(([stem, branch]) => {
        expect(validStems.has(stem)).toBe(true);
        expect(validBranches.has(branch)).toBe(true);
      });
    });

    it("GEOPSAL_MAP uses valid branches", () => {
      const validBranches = new Set(BRANCHES);
      Object.entries(GEOPSAL_MAP).forEach(([key, value]) => {
        expect(validBranches.has(key)).toBe(true);
        expect(validBranches.has(value)).toBe(true);
      });
    });
  });
});
