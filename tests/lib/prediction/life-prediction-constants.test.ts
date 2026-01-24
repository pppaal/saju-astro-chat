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
  });
});
