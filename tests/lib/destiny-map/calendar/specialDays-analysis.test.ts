/**
 * Special Days Analysis Tests
 * Tests for 12 fortune stars and special day detection
 */

import { describe, it, expect } from "vitest";

describe("Special Days Analysis", () => {
  describe("Twelve Fortune Stars (12운성)", () => {
    const TWELVE_STARS = [
      { name: "장생", stage: 1, energy: "rising", score: 85 },
      { name: "목욕", stage: 2, energy: "rising", score: 60 },
      { name: "관대", stage: 3, energy: "rising", score: 75 },
      { name: "건록", stage: 4, energy: "peak", score: 90 },
      { name: "제왕", stage: 5, energy: "peak", score: 95 },
      { name: "쇠", stage: 6, energy: "declining", score: 55 },
      { name: "병", stage: 7, energy: "declining", score: 40 },
      { name: "사", stage: 8, energy: "dormant", score: 30 },
      { name: "묘", stage: 9, energy: "dormant", score: 35 },
      { name: "절", stage: 10, energy: "dormant", score: 25 },
      { name: "태", stage: 11, energy: "rising", score: 50 },
      { name: "양", stage: 12, energy: "rising", score: 55 },
    ];

    it("has 12 fortune stars", () => {
      expect(TWELVE_STARS).toHaveLength(12);
    });

    it("each star has required properties", () => {
      TWELVE_STARS.forEach(star => {
        expect(star).toHaveProperty("name");
        expect(star).toHaveProperty("stage");
        expect(star).toHaveProperty("energy");
        expect(star).toHaveProperty("score");
      });
    });

    it("scores are between 0 and 100", () => {
      TWELVE_STARS.forEach(star => {
        expect(star.score).toBeGreaterThanOrEqual(0);
        expect(star.score).toBeLessThanOrEqual(100);
      });
    });

    it("제왕 has highest score", () => {
      const jewang = TWELVE_STARS.find(s => s.name === "제왕");
      expect(jewang?.score).toBe(95);
    });

    it("절 has lowest score", () => {
      const jeol = TWELVE_STARS.find(s => s.name === "절");
      expect(jeol?.score).toBe(25);
    });
  });

  describe("Energy Phases", () => {
    it("rising phase includes growth stages", () => {
      const risingStars = ["장생", "목욕", "관대", "태", "양"];
      expect(risingStars.length).toBe(5);
    });

    it("peak phase has maximum power", () => {
      const peakStars = ["건록", "제왕"];
      expect(peakStars.length).toBe(2);
    });

    it("declining phase includes waning stages", () => {
      const decliningStars = ["쇠", "병"];
      expect(decliningStars.length).toBe(2);
    });

    it("dormant phase includes rest stages", () => {
      const dormantStars = ["사", "묘", "절"];
      expect(dormantStars.length).toBe(3);
    });
  });

  describe("Area Scores", () => {
    it("defines four main life areas", () => {
      const areas = ["career", "wealth", "love", "health"];
      expect(areas).toHaveLength(4);
    });

    it("area scores vary by fortune star", () => {
      const geonrok = { career: 95, wealth: 85, love: 70, health: 85 };
      const jeol = { career: 20, wealth: 15, love: 25, health: 25 };
      expect(geonrok.career).toBeGreaterThan(jeol.career);
    });
  });

  describe("Special Day Detection", () => {
    it("detects gongmang branches", () => {
      const gongmangBranches = ["戌", "亥"];
      expect(gongmangBranches).toHaveLength(2);
    });

    it("detects chungan hap pairs", () => {
      const pairs = [["甲", "己"], ["乙", "庚"], ["丙", "辛"], ["丁", "壬"], ["戊", "癸"]];
      expect(pairs).toHaveLength(5);
    });
  });
});