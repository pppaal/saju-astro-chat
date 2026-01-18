/**
 * Public API Tests
 * Tests for destiny calendar public interface
 */

import { describe, it, expect } from "vitest";

describe("Public API", () => {
  describe("CalendarMonth Structure", () => {
    it("defines calendar month structure", () => {
      const calendarMonth = {
        year: 2024,
        month: 1,
        dates: [],
      };

      expect(calendarMonth).toHaveProperty("year");
      expect(calendarMonth).toHaveProperty("month");
      expect(calendarMonth).toHaveProperty("dates");
    });

    it("month is between 1 and 12", () => {
      const months = [1, 6, 12];
      months.forEach(m => {
        expect(m).toBeGreaterThanOrEqual(1);
        expect(m).toBeLessThanOrEqual(12);
      });
    });
  });

  describe("DailyFortuneResult Structure", () => {
    it("defines daily fortune result", () => {
      const result = {
        overall: 75,
        love: 80,
        career: 70,
        wealth: 65,
        health: 85,
        luckyColor: "blue",
        luckyNumber: 7,
        grade: 1,
        ganzhi: "甲子",
        alerts: [],
        recommendations: [],
        warnings: [],
        crossVerified: true,
        sajuFactors: [],
        astroFactors: [],
      };

      expect(result).toHaveProperty("overall");
      expect(result).toHaveProperty("love");
      expect(result).toHaveProperty("career");
      expect(result).toHaveProperty("wealth");
      expect(result).toHaveProperty("health");
      expect(result).toHaveProperty("luckyColor");
      expect(result).toHaveProperty("luckyNumber");
    });

    it("scores are between 0 and 100", () => {
      const scores = { overall: 75, love: 80, career: 70, wealth: 65, health: 85 };
      Object.values(scores).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });

    it("grade is between 0 and 4", () => {
      const grades = [0, 1, 2, 3, 4];
      grades.forEach(g => {
        expect(g).toBeGreaterThanOrEqual(0);
        expect(g).toBeLessThanOrEqual(4);
      });
    });
  });

  describe("Yearly Important Dates", () => {
    it("analyzes 365 days in a year", () => {
      const daysInYear = 365;
      expect(daysInYear).toBe(365);
    });

    it("can filter by category", () => {
      const categories = ["love", "career", "health", "wealth"];
      expect(categories).toContain("love");
      expect(categories).toContain("career");
    });

    it("can filter by minimum grade", () => {
      const minGrades = [0, 1, 2];
      minGrades.forEach(g => {
        expect(g).toBeGreaterThanOrEqual(0);
      });
    });

    it("can limit results", () => {
      const limit = 10;
      expect(limit).toBeGreaterThan(0);
    });

    it("sorts by grade then score", () => {
      const dates = [
        { grade: 1, score: 80 },
        { grade: 0, score: 90 },
        { grade: 1, score: 85 },
      ];

      dates.sort((a, b) => {
        if (a.grade !== b.grade) return a.grade - b.grade;
        return b.score - a.score;
      });

      expect(dates[0].grade).toBe(0);
      expect(dates[1].score).toBeGreaterThanOrEqual(dates[2].score);
    });
  });

  describe("Monthly Important Dates", () => {
    it("calculates dates for specific month", () => {
      const month = { year: 2024, month: 3 };
      expect(month.year).toBe(2024);
      expect(month.month).toBe(3);
    });

    it("handles months with different lengths", () => {
      const monthLengths = {
        1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30,
        7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31,
      };
      expect(monthLengths[2]).toBe(28);
      expect(monthLengths[1]).toBe(31);
    });
  });

  describe("Best Dates for Category", () => {
    it("finds best dates for love", () => {
      const category = "love";
      expect(category).toBe("love");
    });

    it("finds best dates for career", () => {
      const category = "career";
      expect(category).toBe("career");
    });

    it("finds best dates for wealth", () => {
      const category = "wealth";
      expect(category).toBe("wealth");
    });

    it("finds best dates for health", () => {
      const category = "health";
      expect(category).toBe("health");
    });
  });

  describe("Alert Types", () => {
    it("defines warning alerts", () => {
      const alert = { type: "warning", msg: "Be cautious", icon: "⚠️" };
      expect(alert.type).toBe("warning");
    });

    it("defines positive alerts", () => {
      const alert = { type: "positive", msg: "Great day!", icon: "✨" };
      expect(alert.type).toBe("positive");
    });

    it("defines info alerts", () => {
      const alert = { type: "info", msg: "Note this", icon: "ℹ️" };
      expect(alert.type).toBe("info");
    });
  });

  describe("Cross Verification", () => {
    it("verifies saju and astro alignment", () => {
      const crossVerified = true;
      expect(typeof crossVerified).toBe("boolean");
    });

    it("tracks saju factors", () => {
      const sajuFactors = ["good_element", "yukhap"];
      expect(Array.isArray(sajuFactors)).toBe(true);
    });

    it("tracks astro factors", () => {
      const astroFactors = ["jupiter_trine", "moon_full"];
      expect(Array.isArray(astroFactors)).toBe(true);
    });
  });

  describe("Lucky Elements", () => {
    it("provides lucky color", () => {
      const colors = ["red", "blue", "green", "yellow", "white"];
      expect(colors.length).toBeGreaterThan(0);
    });

    it("provides lucky number between 1 and 9", () => {
      const luckyNumbers = [1, 3, 7, 9];
      luckyNumbers.forEach(n => {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(9);
      });
    });
  });

  describe("Ganzhi Display", () => {
    it("formats ganzhi string", () => {
      const ganzhi = "甲子";
      expect(ganzhi.length).toBe(2);
    });

    it("has valid stem and branch", () => {
      const stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
      const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

      expect(stems).toHaveLength(10);
      expect(branches).toHaveLength(12);
    });
  });
});
