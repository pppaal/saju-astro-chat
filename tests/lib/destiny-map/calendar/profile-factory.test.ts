/**
 * Profile Factory Tests
 * Tests for Saju and Astrology profile extraction and calculation
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/destiny-map/calendar/astrology-planets", () => ({
  getPlanetPosition: vi.fn(() => ({ longitude: 120.5 })),
}));

import {
  extractSajuProfile,
  extractAstroProfile,
  calculateSajuProfileFromBirthDate,
  calculateAstroProfileFromBirthDate,
  UserSajuProfile,
  UserAstroProfile,
} from "@/lib/destiny-map/calendar/profile-factory";

describe("Profile Factory", () => {
  describe("extractSajuProfile", () => {
    it("extracts dayMaster from string", () => {
      const result = extractSajuProfile({
        dayMaster: "甲",
      });
      expect(result.dayMaster).toBe("甲");
    });

    it("extracts dayMaster from object with name", () => {
      const result = extractSajuProfile({
        dayMaster: { name: "乙" },
      });
      expect(result.dayMaster).toBe("乙");
    });

    it("extracts dayMaster from object with heavenlyStem", () => {
      const result = extractSajuProfile({
        dayMaster: { heavenlyStem: "丙" },
      });
      expect(result.dayMaster).toBe("丙");
    });

    it("defaults to 甲 when dayMaster is missing", () => {
      const result = extractSajuProfile({});
      expect(result.dayMaster).toBe("甲");
    });

    it("extracts first character from multi-char string", () => {
      const result = extractSajuProfile({
        dayMaster: "甲木",
      });
      expect(result.dayMaster).toBe("甲");
    });

    it("maps dayMaster to element correctly", () => {
      const wood = extractSajuProfile({ dayMaster: "甲" });
      expect(wood.dayMasterElement).toBe("wood");

      const fire = extractSajuProfile({ dayMaster: "丙" });
      expect(fire.dayMasterElement).toBe("fire");

      const earth = extractSajuProfile({ dayMaster: "戊" });
      expect(earth.dayMasterElement).toBe("earth");

      const metal = extractSajuProfile({ dayMaster: "庚" });
      expect(metal.dayMasterElement).toBe("metal");

      const water = extractSajuProfile({ dayMaster: "壬" });
      expect(water.dayMasterElement).toBe("water");
    });

    it("extracts dayBranch from earthlyBranch string", () => {
      const result = extractSajuProfile({
        dayMaster: "甲",
        pillars: {
          day: { earthlyBranch: "子" },
        },
      });
      expect(result.dayBranch).toBe("子");
    });

    it("extracts dayBranch from earthlyBranch object", () => {
      const result = extractSajuProfile({
        dayMaster: "甲",
        pillars: {
          day: { earthlyBranch: { name: "丑" } },
        },
      });
      expect(result.dayBranch).toBe("丑");
    });

    it("extracts dayBranch from branch property", () => {
      const result = extractSajuProfile({
        dayMaster: "甲",
        pillars: {
          day: { branch: "寅" },
        },
      });
      expect(result.dayBranch).toBe("寅");
    });

    it("extracts yearBranch", () => {
      const result = extractSajuProfile({
        dayMaster: "甲",
        pillars: {
          day: { earthlyBranch: "子" },
          year: { earthlyBranch: "寅" },
        },
      });
      expect(result.yearBranch).toBe("寅");
    });

    it("extracts daeun cycles", () => {
      const result = extractSajuProfile({
        dayMaster: "甲",
        unse: {
          daeun: [
            { age: 5, heavenlyStem: "丙", earthlyBranch: "寅" },
            { age: 15, heavenlyStem: "丁", earthlyBranch: "卯" },
          ],
          daeunsu: 5,
        },
      });

      expect(result.daeunCycles).toHaveLength(2);
      expect(result.daeunCycles![0].age).toBe(5);
      expect(result.daeunCycles![0].heavenlyStem).toBe("丙");
      expect(result.daeunsu).toBe(5);
    });

    it("filters incomplete daeun cycles", () => {
      const result = extractSajuProfile({
        dayMaster: "甲",
        unse: {
          daeun: [
            { age: 5, heavenlyStem: "丙", earthlyBranch: "寅" },
            { age: 15, heavenlyStem: "", earthlyBranch: "卯" }, // Missing stem
            { age: 25 }, // Missing both
          ],
        },
      });

      expect(result.daeunCycles).toHaveLength(1);
    });

    it("extracts birthYear from birthDate string", () => {
      const result = extractSajuProfile({
        dayMaster: "甲",
        birthDate: "1990-01-15",
      });
      expect(result.birthYear).toBe(1990);
    });

    it("extracts birthYear from facts.birthDate", () => {
      const result = extractSajuProfile({
        dayMaster: "甲",
        facts: { birthDate: "1985-06-20" },
      });
      expect(result.birthYear).toBe(1985);
    });

    it("handles invalid birthDate gracefully", () => {
      const result = extractSajuProfile({
        dayMaster: "甲",
        birthDate: "invalid-date",
      });
      expect(result.birthYear).toBeUndefined();
    });

    it("returns undefined for empty dayBranch", () => {
      const result = extractSajuProfile({
        dayMaster: "甲",
        pillars: {
          day: { earthlyBranch: "" },
        },
      });
      expect(result.dayBranch).toBeUndefined();
    });
  });

  describe("extractAstroProfile", () => {
    it("extracts sunSign from planets array", () => {
      const result = extractAstroProfile({
        planets: [
          { name: "Sun", sign: "Leo" },
          { name: "Moon", sign: "Cancer" },
        ],
      });
      expect(result.sunSign).toBe("Leo");
    });

    it("defaults to Aries when Sun not found", () => {
      const result = extractAstroProfile({
        planets: [{ name: "Moon", sign: "Cancer" }],
      });
      expect(result.sunSign).toBe("Aries");
    });

    it("defaults to Aries when planets empty", () => {
      const result = extractAstroProfile({ planets: [] });
      expect(result.sunSign).toBe("Aries");
    });

    it("maps zodiac sign to element (air normalized to metal)", () => {
      const fire = extractAstroProfile({
        planets: [{ name: "Sun", sign: "Aries" }],
      });
      expect(fire.sunElement).toBe("fire");

      const earth = extractAstroProfile({
        planets: [{ name: "Sun", sign: "Taurus" }],
      });
      expect(earth.sunElement).toBe("earth");

      // Note: air signs are normalized to "metal" in this system
      const metal = extractAstroProfile({
        planets: [{ name: "Sun", sign: "Gemini" }],
      });
      expect(metal.sunElement).toBe("metal");

      const water = extractAstroProfile({
        planets: [{ name: "Sun", sign: "Cancer" }],
      });
      expect(water.sunElement).toBe("water");
    });

    it("handles missing astrology data", () => {
      const result = extractAstroProfile(null);
      expect(result.sunSign).toBe("Aries");
    });

    it("handles undefined planets", () => {
      const result = extractAstroProfile({});
      expect(result.sunSign).toBe("Aries");
    });
  });

  describe("calculateSajuProfileFromBirthDate", () => {
    it("calculates correct day for base date 1900-01-31", () => {
      const result = calculateSajuProfileFromBirthDate(new Date(1900, 0, 31));
      expect(result.dayMaster).toBe("甲");
      expect(result.dayBranch).toBe("子");
    });

    it("calculates correct day one day later", () => {
      const result = calculateSajuProfileFromBirthDate(new Date(1900, 1, 1));
      expect(result.dayMaster).toBe("乙");
      expect(result.dayBranch).toBe("丑");
    });

    it("completes 60-day cycle correctly", () => {
      const baseDate = new Date(1900, 0, 31);
      const day61 = new Date(baseDate.getTime() + 60 * 24 * 60 * 60 * 1000);
      const result = calculateSajuProfileFromBirthDate(day61);
      expect(result.dayMaster).toBe("甲");
      expect(result.dayBranch).toBe("子");
    });

    it("handles modern dates", () => {
      const result = calculateSajuProfileFromBirthDate(new Date(2025, 0, 15));
      expect(result.dayMaster).toBeDefined();
      expect(result.dayBranch).toBeDefined();
      expect(result.dayMasterElement).toBeDefined();
    });

    it("handles dates before base date", () => {
      const result = calculateSajuProfileFromBirthDate(new Date(1899, 11, 31));
      expect(result.dayMaster).toBeDefined();
      expect(result.dayBranch).toBeDefined();
    });

    it("returns correct element for calculated stem", () => {
      const result = calculateSajuProfileFromBirthDate(new Date(1900, 0, 31));
      expect(result.dayMasterElement).toBe("wood"); // 甲 = wood
    });

    it("stems cycle through 10 values", () => {
      const stems = new Set<string>();
      const baseDate = new Date(1900, 0, 31);

      for (let i = 0; i < 10; i++) {
        const date = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
        const result = calculateSajuProfileFromBirthDate(date);
        stems.add(result.dayMaster);
      }

      expect(stems.size).toBe(10);
    });

    it("branches cycle through 12 values", () => {
      const branches = new Set<string>();
      const baseDate = new Date(1900, 0, 31);

      for (let i = 0; i < 12; i++) {
        const date = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
        const result = calculateSajuProfileFromBirthDate(date);
        branches.add(result.dayBranch!);
      }

      expect(branches.size).toBe(12);
    });
  });

  describe("calculateAstroProfileFromBirthDate", () => {
    it("calculates Aries for late March", () => {
      const result = calculateAstroProfileFromBirthDate(new Date(1990, 2, 25)); // March 25
      expect(result.sunSign).toBe("Aries");
      expect(result.sunElement).toBe("fire");
    });

    it("calculates Taurus for late April", () => {
      const result = calculateAstroProfileFromBirthDate(new Date(1990, 3, 25)); // April 25
      expect(result.sunSign).toBe("Taurus");
    });

    it("calculates Gemini for late May", () => {
      const result = calculateAstroProfileFromBirthDate(new Date(1990, 4, 25)); // May 25
      expect(result.sunSign).toBe("Gemini");
    });

    it("calculates Cancer for late June", () => {
      const result = calculateAstroProfileFromBirthDate(new Date(1990, 5, 25)); // June 25
      expect(result.sunSign).toBe("Cancer");
    });

    it("calculates Leo for late July", () => {
      const result = calculateAstroProfileFromBirthDate(new Date(1990, 6, 25)); // July 25
      expect(result.sunSign).toBe("Leo");
    });

    it("calculates Virgo for late August", () => {
      const result = calculateAstroProfileFromBirthDate(new Date(1990, 7, 25)); // August 25
      expect(result.sunSign).toBe("Virgo");
    });

    it("calculates Libra for late September", () => {
      const result = calculateAstroProfileFromBirthDate(new Date(1990, 8, 25)); // September 25
      expect(result.sunSign).toBe("Libra");
    });

    it("calculates Scorpio for late October", () => {
      const result = calculateAstroProfileFromBirthDate(new Date(1990, 9, 25)); // October 25
      expect(result.sunSign).toBe("Scorpio");
    });

    it("calculates Sagittarius for late November", () => {
      const result = calculateAstroProfileFromBirthDate(new Date(1990, 10, 25)); // November 25
      expect(result.sunSign).toBe("Sagittarius");
    });

    it("calculates Capricorn for late December", () => {
      const result = calculateAstroProfileFromBirthDate(new Date(1990, 11, 25)); // December 25
      expect(result.sunSign).toBe("Capricorn");
    });

    it("calculates Aquarius for late January", () => {
      const result = calculateAstroProfileFromBirthDate(new Date(1990, 0, 25)); // January 25
      expect(result.sunSign).toBe("Aquarius");
    });

    it("calculates Pisces for late February", () => {
      const result = calculateAstroProfileFromBirthDate(new Date(1990, 1, 25)); // February 25
      expect(result.sunSign).toBe("Pisces");
    });

    it("includes sunLongitude", () => {
      const result = calculateAstroProfileFromBirthDate(new Date(1990, 6, 15));
      expect(result.sunLongitude).toBeDefined();
    });

    it("includes birthMonth and birthDay", () => {
      const result = calculateAstroProfileFromBirthDate(new Date(1990, 6, 15));
      expect(result.birthMonth).toBe(7); // 1-indexed
      expect(result.birthDay).toBe(15);
    });

    it("maps fire signs correctly", () => {
      const aries = calculateAstroProfileFromBirthDate(new Date(1990, 2, 25));
      const leo = calculateAstroProfileFromBirthDate(new Date(1990, 6, 25));
      const sagittarius = calculateAstroProfileFromBirthDate(new Date(1990, 10, 25));

      expect(aries.sunElement).toBe("fire");
      expect(leo.sunElement).toBe("fire");
      expect(sagittarius.sunElement).toBe("fire");
    });

    it("maps earth signs correctly", () => {
      const taurus = calculateAstroProfileFromBirthDate(new Date(1990, 3, 25));
      const virgo = calculateAstroProfileFromBirthDate(new Date(1990, 7, 25));
      const capricorn = calculateAstroProfileFromBirthDate(new Date(1990, 11, 25));

      expect(taurus.sunElement).toBe("earth");
      expect(virgo.sunElement).toBe("earth");
      expect(capricorn.sunElement).toBe("earth");
    });

    it("maps air signs to metal (normalized)", () => {
      const gemini = calculateAstroProfileFromBirthDate(new Date(1990, 4, 25));
      const libra = calculateAstroProfileFromBirthDate(new Date(1990, 8, 25));
      const aquarius = calculateAstroProfileFromBirthDate(new Date(1990, 0, 25));

      // Air signs are normalized to "metal" in this five-element system
      expect(gemini.sunElement).toBe("metal");
      expect(libra.sunElement).toBe("metal");
      expect(aquarius.sunElement).toBe("metal");
    });

    it("maps water signs correctly", () => {
      const cancer = calculateAstroProfileFromBirthDate(new Date(1990, 5, 25));
      const scorpio = calculateAstroProfileFromBirthDate(new Date(1990, 9, 25));
      const pisces = calculateAstroProfileFromBirthDate(new Date(1990, 1, 25));

      expect(cancer.sunElement).toBe("water");
      expect(scorpio.sunElement).toBe("water");
      expect(pisces.sunElement).toBe("water");
    });

    describe("boundary dates", () => {
      it("handles Aries start (March 21)", () => {
        const result = calculateAstroProfileFromBirthDate(new Date(1990, 2, 21));
        expect(result.sunSign).toBe("Aries");
      });

      it("handles Pisces end (March 20)", () => {
        const result = calculateAstroProfileFromBirthDate(new Date(1990, 2, 20));
        expect(result.sunSign).toBe("Pisces");
      });

      it("handles Capricorn spanning year end", () => {
        const dec25 = calculateAstroProfileFromBirthDate(new Date(1990, 11, 25));
        const jan5 = calculateAstroProfileFromBirthDate(new Date(1990, 0, 5));

        expect(dec25.sunSign).toBe("Capricorn");
        expect(jan5.sunSign).toBe("Capricorn");
      });
    });
  });

  describe("UserSajuProfile interface", () => {
    it("allows optional properties", () => {
      const profile: UserSajuProfile = {
        dayMaster: "甲",
        dayMasterElement: "wood",
      };

      expect(profile.dayBranch).toBeUndefined();
      expect(profile.yearBranch).toBeUndefined();
      expect(profile.birthYear).toBeUndefined();
      expect(profile.daeunCycles).toBeUndefined();
      expect(profile.daeunsu).toBeUndefined();
    });

    it("accepts all properties", () => {
      const profile: UserSajuProfile = {
        dayMaster: "甲",
        dayMasterElement: "wood",
        dayBranch: "子",
        yearBranch: "寅",
        birthYear: 1990,
        daeunCycles: [{ age: 5, heavenlyStem: "丙", earthlyBranch: "寅" }],
        daeunsu: 5,
      };

      expect(profile.dayMaster).toBe("甲");
      expect(profile.daeunCycles).toHaveLength(1);
    });
  });

  describe("UserAstroProfile interface", () => {
    it("allows optional properties", () => {
      const profile: UserAstroProfile = {
        sunSign: "Aries",
        sunElement: "fire",
      };

      expect(profile.sunLongitude).toBeUndefined();
      expect(profile.birthMonth).toBeUndefined();
      expect(profile.birthDay).toBeUndefined();
    });

    it("accepts all properties", () => {
      const profile: UserAstroProfile = {
        sunSign: "Leo",
        sunElement: "fire",
        sunLongitude: 125.5,
        birthMonth: 7,
        birthDay: 25,
      };

      expect(profile.sunSign).toBe("Leo");
      expect(profile.sunLongitude).toBe(125.5);
    });
  });
});
