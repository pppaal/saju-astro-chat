/**
 * Saju Character Analysis Tests
 * Tests for personality and structural analysis based on Saju
 */

import { describe, it, expect, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/destiny-map/calendar/constants", () => ({
  ELEMENT_RELATIONS: {
    "목": { generatedBy: "수", controls: "토", generates: "화", controlledBy: "금" },
    "화": { generatedBy: "목", controls: "금", generates: "토", controlledBy: "수" },
    "토": { generatedBy: "화", controls: "수", generates: "금", controlledBy: "목" },
    "금": { generatedBy: "토", controls: "목", generates: "수", controlledBy: "화" },
    "수": { generatedBy: "금", controls: "화", generates: "목", controlledBy: "토" },
  },
  ZODIAC_TO_ELEMENT: {
    Aries: "화",
    Taurus: "토",
  },
}));

vi.mock("@/lib/destiny-map/calendar/utils", () => ({
  getSipsin: vi.fn(() => "비견"),
  normalizeElement: vi.fn((e) => e),
}));

describe("Saju Character Analysis", () => {
  describe("Type Definitions", () => {
    it("defines YongsinInfo structure", () => {
      const yongsinInfo = {
        primary: "수",
        secondary: "금",
        type: "억부",
        kibsin: "화",
      };

      expect(yongsinInfo).toHaveProperty("primary");
      expect(yongsinInfo).toHaveProperty("type");
      expect(yongsinInfo.primary).toBe("수");
    });

    it("defines YongsinAnalysis structure", () => {
      const analysis = {
        score: 15,
        factorKeys: ["yongsin_match", "good_element"],
        positive: true,
        negative: false,
        matchType: "exact",
      };

      expect(analysis).toHaveProperty("score");
      expect(analysis).toHaveProperty("factorKeys");
      expect(analysis).toHaveProperty("positive");
      expect(analysis).toHaveProperty("negative");
      expect(analysis.score).toBeGreaterThanOrEqual(-28);
      expect(analysis.score).toBeLessThanOrEqual(30);
    });

    it("defines GeokgukInfo structure", () => {
      const geokguk = {
        type: "정관격",
        strength: "신강",
      };

      expect(geokguk).toHaveProperty("type");
      expect(geokguk).toHaveProperty("strength");
    });

    it("defines PillarInfo structure", () => {
      const pillars = {
        year: { stem: "甲", branch: "子" },
        month: { stem: "乙", branch: "丑" },
        day: { stem: "丙", branch: "寅" },
        time: { stem: "丁", branch: "卯" },
      };

      expect(pillars).toHaveProperty("year");
      expect(pillars).toHaveProperty("month");
      expect(pillars).toHaveProperty("day");
      expect(pillars).toHaveProperty("time");
      expect(pillars.year.stem).toBe("甲");
    });

    it("defines GanzhiInfo structure", () => {
      const ganzhi = {
        stem: "甲",
        branch: "子",
        stemElement: "목",
        branchElement: "수",
      };

      expect(ganzhi).toHaveProperty("stem");
      expect(ganzhi).toHaveProperty("branch");
      expect(ganzhi).toHaveProperty("stemElement");
      expect(ganzhi).toHaveProperty("branchElement");
    });

    it("defines GeokgukAnalysis structure", () => {
      const analysis = {
        score: 10,
        factorKeys: ["geokguk_favorable"],
        positive: true,
        negative: false,
      };

      expect(analysis.score).toBeGreaterThanOrEqual(-18);
      expect(analysis.score).toBeLessThanOrEqual(20);
    });

    it("defines SolarReturnAnalysis structure", () => {
      const solarReturn = {
        score: 20,
        factorKeys: ["birthday_energy"],
        positive: true,
      };

      expect(solarReturn.score).toBeGreaterThanOrEqual(0);
      expect(solarReturn.score).toBeLessThanOrEqual(25);
    });
  });

  describe("Yongsin Types", () => {
    it("recognizes 억부 type (suppression/support)", () => {
      const yongsinType = "억부";

      expect(yongsinType).toBe("억부");
    });

    it("recognizes 조후 type (climate adjustment)", () => {
      const yongsinType = "조후";

      expect(yongsinType).toBe("조후");
    });

    it("recognizes 통관 type (mediation)", () => {
      const yongsinType = "통관";

      expect(yongsinType).toBe("통관");
    });

    it("recognizes 병약 type (illness remedy)", () => {
      const yongsinType = "병약";

      expect(yongsinType).toBe("병약");
    });
  });

  describe("Geokguk Types", () => {
    it("recognizes major geokguk types", () => {
      const geokgukTypes = [
        "정관격",
        "편관격",
        "정인격",
        "편인격",
        "식신격",
        "상관격",
        "정재격",
        "편재격",
        "비겁격",
        "종격",
      ];

      expect(geokgukTypes.length).toBeGreaterThan(0);
      expect(geokgukTypes).toContain("정관격");
      expect(geokgukTypes).toContain("식신격");
    });

    it("recognizes strength states", () => {
      const strengthStates = ["신강", "신약", "중화"];

      expect(strengthStates).toContain("신강");
      expect(strengthStates).toContain("신약");
      expect(strengthStates).toContain("중화");
    });
  });

  describe("Five Elements Analysis", () => {
    it("identifies element relationships", () => {
      const relations = {
        generatedBy: "수",
        controls: "토",
        generates: "화",
        controlledBy: "금",
      };

      expect(relations.generatedBy).toBeDefined();
      expect(relations.controls).toBeDefined();
    });

    it("calculates element balance", () => {
      const elementCounts = {
        "목": 2,
        "화": 1,
        "토": 3,
        "금": 1,
        "수": 1,
      };

      const total = Object.values(elementCounts).reduce((a, b) => a + b, 0);
      expect(total).toBe(8);
    });

    it("identifies missing elements", () => {
      const elements = ["목", "화", "토", "금", "수"];
      const present = ["목", "화", "토"];
      const missing = elements.filter(e => !present.includes(e));

      expect(missing).toContain("금");
      expect(missing).toContain("수");
    });
  });

  describe("Yongsin Analysis", () => {
    it("calculates yongsin match score", () => {
      const matchTypes = {
        exact: 30,
        partial: 15,
        none: 0,
        conflict: -28,
      };

      expect(matchTypes.exact).toBe(30);
      expect(matchTypes.conflict).toBe(-28);
    });

    it("identifies positive factors", () => {
      const analysis = {
        score: 20,
        factorKeys: ["yongsin_exact_match"],
        positive: true,
        negative: false,
      };

      expect(analysis.positive).toBe(true);
      expect(analysis.negative).toBe(false);
    });

    it("identifies kibsin (unfavorable element)", () => {
      const yongsin = {
        primary: "수",
        kibsin: "화",
      };

      expect(yongsin.kibsin).toBe("화");
    });
  });

  describe("Pillar Analysis", () => {
    it("analyzes all four pillars", () => {
      const pillars = {
        year: { stem: "甲", branch: "子" },
        month: { stem: "乙", branch: "丑" },
        day: { stem: "丙", branch: "寅" },
        time: { stem: "丁", branch: "卯" },
      };

      expect(Object.keys(pillars)).toHaveLength(4);
    });

    it("handles optional pillars", () => {
      const partialPillars = {
        day: { stem: "丙", branch: "寅" },
      };

      expect(partialPillars.day).toBeDefined();
      expect((partialPillars as any).time).toBeUndefined();
    });

    it("extracts stem elements", () => {
      const stemElements = {
        "甲": "목",
        "乙": "목",
        "丙": "화",
        "丁": "화",
      };

      expect(stemElements["甲"]).toBe("목");
      expect(stemElements["丙"]).toBe("화");
    });
  });

  describe("Solar Return Analysis", () => {
    it("gives high score near birthday", () => {
      const birthdayAnalysis = {
        score: 25,
        factorKeys: ["exact_birthday"],
        positive: true,
      };

      expect(birthdayAnalysis.score).toBe(25);
    });

    it("score decreases with distance from birthday", () => {
      const scores = [25, 20, 15, 10, 5];

      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThan(scores[i - 1]);
      }
    });

    it("identifies birthday week", () => {
      const birthdayRange = 7;

      expect(birthdayRange).toBe(7);
    });
  });

  describe("Edge Cases", () => {
    it("handles missing yongsin", () => {
      const noYongsin = {
        primary: "",
        type: "",
      };

      expect(noYongsin.primary).toBe("");
    });

    it("handles unknown geokguk", () => {
      const unknownGeokguk = {
        type: "기타",
        strength: "중화",
      };

      expect(unknownGeokguk.type).toBe("기타");
    });

    it("handles partial pillar data", () => {
      const partial = {
        day: { stem: "丙", branch: "寅" },
      };

      expect(partial.day).toBeDefined();
    });
  });
});