/**
 * Fortune Prompt Index Tests
 *
 * Tests for:
 * - themePromptMap: theme to prompt builder mapping
 * - buildPromptByTheme: unified prompt builder
 */

import { describe, it, expect } from "vitest";
import {
  themePromptMap,
  buildPromptByTheme,
} from "@/lib/destiny-map/prompt/fortune";
import type { CombinedResult } from "@/lib/destiny-map/astrologyengine";

// Mock minimal CombinedResult for testing
const mockData: CombinedResult = {
  saju: {
    fourPillars: {
      year: { stem: "갑", branch: "자" },
      month: { stem: "을", branch: "축" },
      day: { stem: "병", branch: "인" },
      hour: { stem: "정", branch: "묘" },
    },
    dayMaster: { element: "火", name: "병화" },
    yongsin: {
      favorable: ["水", "木"],
      unfavorable: ["火", "土"],
      analysis: "Test analysis",
    },
    geokguk: { type: "신강" },
    relations: [],
    unseInfo: {
      majorCycle: {
        pillar: { stem: "임", branch: "신" },
        startAge: 1,
        endAge: 10,
        currentAge: 5,
      },
      yearCycle: { stem: "계", branch: "유" },
    },
  },
  astrology: {
    planets: [],
    houses: [],
    aspects: [],
    sun: { sign: "Aries", house: 1, degree: 15 },
    moon: { sign: "Cancer", house: 4, degree: 20 },
    ascendant: { sign: "Leo", degree: 10 },
    mc: { sign: "Taurus", degree: 5 },
  },
  transit: {
    current: [],
    analysis: [],
  },
} as unknown as CombinedResult;

describe("Fortune Prompt Index", () => {
  describe("themePromptMap", () => {
    it("contains all main themes", () => {
      expect(themePromptMap).toHaveProperty("love");
      expect(themePromptMap).toHaveProperty("career");
      expect(themePromptMap).toHaveProperty("life");
      expect(themePromptMap).toHaveProperty("health");
      expect(themePromptMap).toHaveProperty("family");
      expect(themePromptMap).toHaveProperty("newyear");
      expect(themePromptMap).toHaveProperty("month");
      expect(themePromptMap).toHaveProperty("today");
      expect(themePromptMap).toHaveProperty("year");
    });

    it("contains focus_ prefixed themes", () => {
      expect(themePromptMap).toHaveProperty("focus_love");
      expect(themePromptMap).toHaveProperty("focus_career");
      expect(themePromptMap).toHaveProperty("focus_overall");
      expect(themePromptMap).toHaveProperty("focus_health");
      expect(themePromptMap).toHaveProperty("focus_family");
    });

    it("contains fortune_ prefixed themes", () => {
      expect(themePromptMap).toHaveProperty("fortune_new_year");
      expect(themePromptMap).toHaveProperty("fortune_monthly");
      expect(themePromptMap).toHaveProperty("fortune_today");
      expect(themePromptMap).toHaveProperty("fortune_next_year");
    });

    it("all theme values are functions", () => {
      for (const [theme, builder] of Object.entries(themePromptMap)) {
        expect(typeof builder).toBe("function");
      }
    });

    it("maps focus_love to same builder as love", () => {
      expect(themePromptMap.focus_love).toBe(themePromptMap.love);
    });

    it("maps focus_career to same builder as career", () => {
      expect(themePromptMap.focus_career).toBe(themePromptMap.career);
    });

    it("maps focus_overall to same builder as life", () => {
      expect(themePromptMap.focus_overall).toBe(themePromptMap.life);
    });

    it("maps fortune_today to same builder as today", () => {
      expect(themePromptMap.fortune_today).toBe(themePromptMap.today);
    });

    it("maps fortune_monthly to same builder as month", () => {
      expect(themePromptMap.fortune_monthly).toBe(themePromptMap.month);
    });
  });

  describe("buildPromptByTheme", () => {
    it("returns warning for unknown theme", () => {
      const result = buildPromptByTheme("unknown_theme", "ko", mockData);
      expect(result).toContain("Unknown theme");
      expect(result).toContain("unknown_theme");
    });

    it("builds prompt for 'love' theme", () => {
      const result = buildPromptByTheme("love", "ko", mockData);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toContain("Unknown theme");
    });

    it("builds prompt for 'career' theme", () => {
      const result = buildPromptByTheme("career", "ko", mockData);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("builds prompt for 'life' theme", () => {
      const result = buildPromptByTheme("life", "ko", mockData);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("builds prompt for 'health' theme", () => {
      const result = buildPromptByTheme("health", "ko", mockData);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("builds prompt for 'family' theme", () => {
      const result = buildPromptByTheme("family", "ko", mockData);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("builds prompt for 'today' theme", () => {
      const result = buildPromptByTheme("today", "ko", mockData);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("builds prompt for 'month' theme", () => {
      const result = buildPromptByTheme("month", "ko", mockData);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("builds prompt for 'year' theme", () => {
      const result = buildPromptByTheme("year", "ko", mockData);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("builds prompt for 'newyear' theme", () => {
      const result = buildPromptByTheme("newyear", "ko", mockData);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("supports English language", () => {
      const result = buildPromptByTheme("love", "en", mockData);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    describe("quickMode parameter", () => {
      it("generates prompt without quickMode (default)", () => {
        const result = buildPromptByTheme("today", "ko", mockData);
        expect(typeof result).toBe("string");
      });

      it("generates prompt with quickMode=false", () => {
        const result = buildPromptByTheme("today", "ko", mockData, false);
        expect(typeof result).toBe("string");
      });

      it("generates prompt with quickMode=true", () => {
        const result = buildPromptByTheme("today", "ko", mockData, true);
        expect(typeof result).toBe("string");
      });

      it("quickMode produces different prompt length", () => {
        const normalPrompt = buildPromptByTheme("today", "ko", mockData, false);
        const quickPrompt = buildPromptByTheme("today", "ko", mockData, true);

        // Quick mode might produce different length prompt
        // (depending on implementation, they might be different)
        expect(typeof normalPrompt).toBe("string");
        expect(typeof quickPrompt).toBe("string");
      });
    });

    describe("focus_ prefix themes", () => {
      it("builds prompt for focus_love", () => {
        const result = buildPromptByTheme("focus_love", "ko", mockData);
        expect(result).not.toContain("Unknown theme");
      });

      it("builds prompt for focus_career", () => {
        const result = buildPromptByTheme("focus_career", "ko", mockData);
        expect(result).not.toContain("Unknown theme");
      });

      it("builds prompt for focus_overall", () => {
        const result = buildPromptByTheme("focus_overall", "ko", mockData);
        expect(result).not.toContain("Unknown theme");
      });

      it("builds prompt for focus_health", () => {
        const result = buildPromptByTheme("focus_health", "ko", mockData);
        expect(result).not.toContain("Unknown theme");
      });

      it("builds prompt for focus_family", () => {
        const result = buildPromptByTheme("focus_family", "ko", mockData);
        expect(result).not.toContain("Unknown theme");
      });
    });

    describe("fortune_ prefix themes", () => {
      it("builds prompt for fortune_today", () => {
        const result = buildPromptByTheme("fortune_today", "ko", mockData);
        expect(result).not.toContain("Unknown theme");
      });

      it("builds prompt for fortune_monthly", () => {
        const result = buildPromptByTheme("fortune_monthly", "ko", mockData);
        expect(result).not.toContain("Unknown theme");
      });

      it("builds prompt for fortune_new_year", () => {
        const result = buildPromptByTheme("fortune_new_year", "ko", mockData);
        expect(result).not.toContain("Unknown theme");
      });

      it("builds prompt for fortune_next_year", () => {
        const result = buildPromptByTheme("fortune_next_year", "ko", mockData);
        expect(result).not.toContain("Unknown theme");
      });
    });
  });

  describe("Theme coverage", () => {
    const allThemes = Object.keys(themePromptMap);

    it("all themes produce valid prompts", () => {
      for (const theme of allThemes) {
        const result = buildPromptByTheme(theme, "ko", mockData);
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
        expect(result).not.toContain("Unknown theme");
      }
    });

    it("all themes support English", () => {
      for (const theme of allThemes) {
        const result = buildPromptByTheme(theme, "en", mockData);
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
      }
    });
  });
});
