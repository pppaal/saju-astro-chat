/**
 * Formatter Utils Tests
 * Tests for prompt data formatting utilities
 */

import { describe, it, expect, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/destiny-map/prompt/fortune/base/translation-maps", () => ({
  formatGanjiEasy: vi.fn((stem: string, branch: string) => `${stem}${branch}`),
  parseGanjiEasy: vi.fn((ganji: string) => ganji),
}));

vi.mock("@/lib/destiny-map/prompt/fortune/base/data-extractors", () => ({
  formatPillar: vi.fn((pillar: any) => {
    if (!pillar) return "";
    return `${pillar.heavenlyStem?.name ?? pillar.stem ?? ""}${pillar.earthlyBranch?.name ?? pillar.branch ?? ""}`;
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  formatPlanetLines,
  formatHouseLines,
  formatAspectLines,
  formatElements,
  formatPillarText,
  extractDayMaster,
  findCurrentDaeun,
  formatDaeunText,
  formatAllDaeunText,
  formatFutureAnnualList,
  formatFutureMonthlyList,
  formatSinsalLists,
  formatAdvancedSajuAnalysis,
  formatSignificantTransits,
} from "@/lib/destiny-map/prompt/fortune/base/formatter-utils";

describe("Formatter Utils", () => {
  describe("formatPlanetLines", () => {
    it("formats empty array", () => {
      const result = formatPlanetLines([]);
      expect(result).toBe("");
    });

    it("formats single planet", () => {
      const planets = [{ name: "Sun", sign: "Aries", house: 1 }];
      const result = formatPlanetLines(planets);
      expect(result).toBe("Sun: Aries (H1)");
    });

    it("formats multiple planets", () => {
      const planets = [
        { name: "Sun", sign: "Aries", house: 1 },
        { name: "Moon", sign: "Taurus", house: 2 },
      ];
      const result = formatPlanetLines(planets);
      expect(result).toBe("Sun: Aries (H1); Moon: Taurus (H2)");
    });

    it("handles missing properties", () => {
      const planets = [{ name: undefined, sign: undefined, house: undefined }];
      const result = formatPlanetLines(planets);
      expect(result).toBe("?: - (H-)");
    });

    it("limits to 12 planets", () => {
      const planets = Array.from({ length: 15 }, (_, i) => ({
        name: `Planet${i}`,
        sign: "Aries",
        house: i + 1,
      }));
      const result = formatPlanetLines(planets);
      expect(result.split(";").length).toBe(12);
    });
  });

  describe("formatHouseLines", () => {
    it("formats empty array", () => {
      const result = formatHouseLines([]);
      expect(result).toBe("");
    });

    it("formats house array", () => {
      const houses = [
        { sign: "Aries" },
        { sign: "Taurus" },
      ];
      const result = formatHouseLines(houses);
      expect(result).toBe("H1: Aries; H2: Taurus");
    });

    it("formats house array with formatted field", () => {
      const houses = [
        { formatted: "Aries 0°" },
        { formatted: "Taurus 15°" },
      ];
      const result = formatHouseLines(houses);
      expect(result).toBe("H1: Aries 0°; H2: Taurus 15°");
    });

    it("formats house object", () => {
      const houses = {
        "1": { sign: "Aries" },
        "2": { sign: "Taurus" },
      };
      const result = formatHouseLines(houses);
      expect(result).toContain("H1: Aries");
      expect(result).toContain("H2: Taurus");
    });

    it("handles undefined houses", () => {
      const result = formatHouseLines(undefined as any);
      expect(result).toBe("");
    });

    it("limits to 12 houses", () => {
      const houses = Array.from({ length: 15 }, (_, i) => ({ sign: "Aries" }));
      const result = formatHouseLines(houses);
      expect(result.split(";").length).toBe(12);
    });
  });

  describe("formatAspectLines", () => {
    it("formats empty array", () => {
      const result = formatAspectLines([]);
      expect(result).toBe("");
    });

    it("formats aspects with planet1/planet2", () => {
      const aspects = [
        { planet1: { name: "Sun" }, type: "trine", planet2: { name: "Moon" } },
      ];
      const result = formatAspectLines(aspects);
      expect(result).toBe("Sun-trine-Moon");
    });

    it("formats aspects with from/to", () => {
      const aspects = [
        { from: { name: "Mars" }, aspect: "square", to: { name: "Saturn" } },
      ];
      const result = formatAspectLines(aspects);
      expect(result).toBe("Mars-square-Saturn");
    });

    it("handles missing properties", () => {
      const aspects = [{}];
      const result = formatAspectLines(aspects);
      expect(result).toBe("?--?");
    });

    it("limits to 12 aspects", () => {
      const aspects = Array.from({ length: 15 }, () => ({
        planet1: { name: "Sun" },
        type: "trine",
        planet2: { name: "Moon" },
      }));
      const result = formatAspectLines(aspects);
      expect(result.split(";").length).toBe(12);
    });
  });

  describe("formatElements", () => {
    it("returns dash for undefined", () => {
      const result = formatElements(undefined);
      expect(result).toBe("-");
    });

    it("formats element ratios", () => {
      const ratios = { Fire: 3.2, Earth: 2.1, Air: 1.5 };
      const result = formatElements(ratios);
      expect(result).toContain("Fire:3.2");
      expect(result).toContain("Earth:2.1");
      expect(result).toContain("Air:1.5");
    });

    it("handles non-numeric values", () => {
      const ratios = { Fire: "high" as any };
      const result = formatElements(ratios);
      expect(result).toBe("Fire:high");
    });
  });

  describe("formatPillarText", () => {
    it("returns dash for empty pillars", () => {
      const result = formatPillarText(undefined);
      expect(result).toBe("-");
    });

    it("formats four pillars", () => {
      const pillars = {
        year: { heavenlyStem: { name: "甲" }, earthlyBranch: { name: "子" } },
        month: { heavenlyStem: { name: "丙" }, earthlyBranch: { name: "寅" } },
        day: { heavenlyStem: { name: "戊" }, earthlyBranch: { name: "辰" } },
        time: { heavenlyStem: { name: "庚" }, earthlyBranch: { name: "午" } },
      };
      const result = formatPillarText(pillars);
      expect(result).toContain("甲子");
      expect(result).toContain(" / ");
    });
  });

  describe("extractDayMaster", () => {
    it("extracts from dayMaster object", () => {
      const result = extractDayMaster({}, { name: "甲", element: "목" });
      expect(result.name).toBe("甲");
      expect(result.element).toBe("목");
    });

    it("extracts from pillars when dayMaster is undefined", () => {
      const pillars = {
        day: {
          heavenlyStem: { name: "甲", element: "목" },
        },
      };
      const result = extractDayMaster(pillars, undefined);
      expect(result.name).toBe("甲");
      expect(result.element).toBe("목");
    });

    it("returns dash for missing data", () => {
      const result = extractDayMaster(undefined, undefined);
      expect(result.name).toBe("-");
      expect(result.element).toBe("-");
    });
  });

  describe("findCurrentDaeun", () => {
    const unse = {
      daeun: [
        { age: 5, heavenlyStem: "甲", earthlyBranch: "子" },
        { age: 15, heavenlyStem: "乙", earthlyBranch: "丑" },
        { age: 25, heavenlyStem: "丙", earthlyBranch: "寅" },
      ],
    };

    it("finds daeun for age within range", () => {
      const result = findCurrentDaeun(unse, 20);
      expect(result.age).toBe(15);
    });

    it("finds first daeun for young age", () => {
      const result = findCurrentDaeun(unse, 8);
      expect(result.age).toBe(5);
    });

    it("finds last daeun for older age", () => {
      const result = findCurrentDaeun(unse, 30);
      expect(result.age).toBe(25);
    });

    it("returns undefined for empty daeun", () => {
      const result = findCurrentDaeun({}, 20);
      expect(result).toBeUndefined();
    });
  });

  describe("formatDaeunText", () => {
    const unse = {
      daeun: [
        { age: 5, heavenlyStem: "甲", earthlyBranch: "子" },
        { age: 15, heavenlyStem: "乙", earthlyBranch: "丑" },
        { age: 25, heavenlyStem: "丙", earthlyBranch: "寅" },
      ],
    };

    it("formats current daeun", () => {
      const result = formatDaeunText(unse, 20);
      expect(result).toContain("15-24세");
      expect(result).toContain("乙丑");
    });

    it("formats fallback when no current daeun", () => {
      const result = formatDaeunText(unse, 1);
      expect(result).toContain("甲子");
      expect(result).toContain("; ");
    });

    it("handles empty daeun", () => {
      const result = formatDaeunText({}, 20);
      expect(result).toBe("");
    });
  });

  describe("formatAllDaeunText", () => {
    const unse = {
      daeun: [
        { age: 5, heavenlyStem: "甲", earthlyBranch: "子" },
        { age: 15, heavenlyStem: "乙", earthlyBranch: "丑" },
        { age: 25, heavenlyStem: "丙", earthlyBranch: "寅" },
      ],
    };

    it("formats all daeun with current marker", () => {
      const result = formatAllDaeunText(unse, 20);
      expect(result).toContain("★현재★");
      expect(result).toContain("15-24세");
      expect(result).toContain("\n");
    });

    it("does not mark current when age outside range", () => {
      const result = formatAllDaeunText(unse, 1);
      expect(result).not.toContain("★현재★");
    });
  });

  describe("formatFutureAnnualList", () => {
    const unse = {
      annual: [
        { year: 2024, ganji: "甲辰" },
        { year: 2025, ganji: "乙巳" },
        { year: 2026, ganji: "丙午" },
        { year: 2030, ganji: "庚戌" },
      ],
    };

    it("formats future annual cycles", () => {
      const result = formatFutureAnnualList(unse, 2025);
      expect(result).toContain("2025년");
      expect(result).toContain("2026년");
      expect(result).not.toContain("2024년");
    });

    it("marks current year", () => {
      const result = formatFutureAnnualList(unse, 2025);
      expect(result).toContain("2025년");
      expect(result).toContain("★현재★");
    });

    it("includes years up to currentYear + 5", () => {
      const result = formatFutureAnnualList(unse, 2025);
      // Filter includes years from currentYear to currentYear + 5 (2025-2030 inclusive)
      expect(result).toContain("2025년");
      expect(result).toContain("2026년");
      // 2030 is within the range (2025 + 5 = 2030)
      expect(result).toContain("2030년");
    });
  });

  describe("formatFutureMonthlyList", () => {
    const unse = {
      monthly: [
        { year: 2025, month: 1, ganji: "丙寅" },
        { year: 2025, month: 2, ganji: "丁卯" },
        { year: 2025, month: 6, ganji: "辛未" },
        { year: 2026, month: 1, ganji: "戊寅" },
      ],
    };

    it("formats future monthly cycles", () => {
      const result = formatFutureMonthlyList(unse, 2025, 2);
      expect(result).toContain("2025년 2월");
      expect(result).toContain("2025년 6월");
      expect(result).not.toContain("2025년 1월");
    });

    it("marks current month", () => {
      const result = formatFutureMonthlyList(unse, 2025, 2);
      expect(result).toContain("★현재★");
    });

    it("includes future years", () => {
      const result = formatFutureMonthlyList(unse, 2025, 2);
      expect(result).toContain("2026년 1월");
    });

    it("limits to 12 months", () => {
      const manyMonths = {
        monthly: Array.from({ length: 24 }, (_, i) => ({
          year: 2025,
          month: i + 1,
          ganji: "甲子",
        })),
      };
      const result = formatFutureMonthlyList(manyMonths, 2025, 1);
      expect(result.split("\n").length).toBeLessThanOrEqual(12);
    });
  });

  describe("formatSinsalLists", () => {
    it("formats lucky and unlucky lists", () => {
      const sinsal = {
        luckyList: [{ name: "천을귀인" }, { name: "문창귀인" }],
        unluckyList: [{ name: "백호" }, { name: "도화" }],
      };
      const result = formatSinsalLists(sinsal);
      expect(result.lucky).toBe("천을귀인, 문창귀인");
      expect(result.unlucky).toBe("백호, 도화");
    });

    it("handles empty lists", () => {
      const result = formatSinsalLists({});
      expect(result.lucky).toBe("");
      expect(result.unlucky).toBe("");
    });

    it("handles undefined sinsal", () => {
      const result = formatSinsalLists(undefined);
      expect(result.lucky).toBe("");
      expect(result.unlucky).toBe("");
    });
  });

  describe("formatAdvancedSajuAnalysis", () => {
    it("formats complete advanced analysis", () => {
      const analysis = {
        extended: {
          strength: { level: "신강", score: 75, rootCount: 3 },
        },
        geokguk: { type: "정관격", description: "정관이 월지에 있는 격" },
        yongsin: { primary: { element: "수" }, secondary: { element: "금" }, avoid: { element: "토" } },
        sibsin: {
          count: { 정관: 2, 편관: 1, 식신: 1 },
          dominantSibsin: ["정관"],
          missingSibsin: ["편인"],
          relationships: [{ type: "부", quality: "좋음" }],
          careerAptitudes: [{ field: "공직", score: 85 }],
        },
        hyeongchung: {
          chung: [{ branch1: "子", branch2: "午" }],
          hap: [{ branch1: "子", branch2: "丑", result: "토" }],
          samhap: [{ branches: ["寅", "午", "戌"] }],
        },
        healthCareer: {
          health: { vulnerabilities: ["심장", "소장"] },
          career: { suitableFields: ["공무원", "교육"] },
        },
        score: { total: 78, business: 70, wealth: 75, health: 80 },
        tonggeun: { stem: "甲", rootBranch: "寅", strength: "강" },
        tuechul: [{ element: "甲", type: "정투" }],
        hoeguk: [{ type: "목국", resultElement: "목" }],
        deukryeong: { status: "득령", score: 20 },
        ultraAdvanced: {
          jonggeok: { type: "정종격" },
          iljuAnalysis: { character: "리더형" },
          gongmang: { branches: ["戌", "亥"] },
        },
      };

      const result = formatAdvancedSajuAnalysis(analysis);

      expect(result.strengthText).toContain("신강");
      expect(result.geokgukText).toBe("정관격");
      expect(result.yongsinPrimary).toBe("수");
      expect(result.sibsinDistText).toContain("정관(2)");
      expect(result.chungText).toContain("子-午");
      expect(result.hapText).toContain("토");
      expect(result.samhapText).toContain("寅-午-戌");
      expect(result.healthWeak).toContain("심장");
      expect(result.scoreText).toContain("총78/100");
      expect(result.tonggeunText).toContain("甲→寅");
      expect(result.jonggeokText).toBe("정종격");
      expect(result.iljuText).toBe("리더형");
      expect(result.gongmangText).toContain("戌");
    });

    it("returns dashes for missing data", () => {
      const result = formatAdvancedSajuAnalysis(undefined);

      expect(result.strengthText).toBe("-");
      expect(result.geokgukText).toBe("-");
      expect(result.yongsinPrimary).toBe("-");
      expect(result.sibsinDistText).toBe("");
      expect(result.sibsinDominant).toBe("-");
      expect(result.chungText).toBe("-");
      expect(result.hapText).toBe("-");
      expect(result.scoreText).toBe("-");
    });

    it("handles partial data", () => {
      const analysis = {
        geokguk: { type: "식신격" },
        sibsin: { dominant: "식신" },
      };
      const result = formatAdvancedSajuAnalysis(analysis);

      expect(result.geokgukText).toBe("식신격");
      expect(result.sibsinDominant).toBe("식신");
      expect(result.strengthText).toBe("-");
    });
  });

  describe("formatSignificantTransits", () => {
    it("formats transits with transitPlanet/natalPoint", () => {
      const transits = [
        { transitPlanet: "Jupiter", natalPoint: "Sun", aspectType: "trine", isApplying: true },
      ];
      const result = formatSignificantTransits(transits);
      expect(result).toBe("Jupiter-trine-Sun (접근중)");
    });

    it("formats transits with from/to", () => {
      const transits = [
        { from: { name: "Saturn" }, to: { name: "Moon" }, type: "square", isApplying: false },
      ];
      const result = formatSignificantTransits(transits);
      expect(result).toBe("Saturn-square-Moon (분리중)");
    });

    it("filters to significant aspects only", () => {
      const transits = [
        { transitPlanet: "Jupiter", natalPoint: "Sun", aspectType: "conjunction" },
        { transitPlanet: "Mars", natalPoint: "Venus", aspectType: "sextile" },
        { transitPlanet: "Saturn", natalPoint: "Moon", aspectType: "square" },
      ];
      const result = formatSignificantTransits(transits);
      expect(result).toContain("conjunction");
      expect(result).toContain("square");
      expect(result).not.toContain("sextile");
    });

    it("limits to 8 transits", () => {
      const transits = Array.from({ length: 15 }, () => ({
        transitPlanet: "Jupiter",
        natalPoint: "Sun",
        aspectType: "trine",
      }));
      const result = formatSignificantTransits(transits);
      expect(result.split(";").length).toBe(8);
    });

    it("handles empty array", () => {
      const result = formatSignificantTransits([]);
      expect(result).toBe("");
    });
  });
});
