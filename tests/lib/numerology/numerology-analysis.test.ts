/**
 * Numerology Analysis Tests
 *
 * Tests for synergy analysis between numerology numbers
 */


import { getSynergyAnalysis } from "@/lib/numerology/numerology-analysis";
import type { CoreNumerologyProfile } from "@/lib/numerology/numerology";

describe("getSynergyAnalysis", () => {
  it("returns an array of analysis strings", () => {
    const profile: CoreNumerologyProfile = {
      lifePathNumber: 1,
      expressionNumber: 1,
      soulUrgeNumber: 2,
      personalityNumber: 3,
      birthdayNumber: 15,
      maturityNumber: 2,
    };

    const result = getSynergyAnalysis(profile);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes core identity analysis section", () => {
    const profile: CoreNumerologyProfile = {
      lifePathNumber: 1,
      expressionNumber: 5,
      soulUrgeNumber: 2,
      personalityNumber: 3,
      birthdayNumber: 15,
      maturityNumber: 2,
    };

    const result = getSynergyAnalysis(profile);
    const hasSection = result.some((line) => line.includes("핵심 정체성 분석"));
    expect(hasSection).toBe(true);
  });

  it("includes inner and outer analysis section", () => {
    const profile: CoreNumerologyProfile = {
      lifePathNumber: 1,
      expressionNumber: 5,
      soulUrgeNumber: 2,
      personalityNumber: 3,
      birthdayNumber: 15,
      maturityNumber: 2,
    };

    const result = getSynergyAnalysis(profile);
    const hasSection = result.some((line) => line.includes("내면과 외면 분석"));
    expect(hasSection).toBe(true);
  });

  it("includes potential and challenge section", () => {
    const profile: CoreNumerologyProfile = {
      lifePathNumber: 1,
      expressionNumber: 5,
      soulUrgeNumber: 2,
      personalityNumber: 3,
      birthdayNumber: 15,
      maturityNumber: 2,
    };

    const result = getSynergyAnalysis(profile);
    const hasSection = result.some((line) => line.includes("잠재력과 과제 분석"));
    expect(hasSection).toBe(true);
  });

  describe("perfect harmony (same numbers)", () => {
    it("detects perfect harmony when lifePathNumber equals expressionNumber", () => {
      const profile: CoreNumerologyProfile = {
        lifePathNumber: 5,
        expressionNumber: 5,
        soulUrgeNumber: 2,
        personalityNumber: 3,
        birthdayNumber: 15,
        maturityNumber: 7,
      };

      const result = getSynergyAnalysis(profile);
      const hasHarmony = result.some((line) => line.includes("완벽한 조화"));
      expect(hasHarmony).toBe(true);
    });

    it("detects transparent self when soulUrge equals personality", () => {
      const profile: CoreNumerologyProfile = {
        lifePathNumber: 1,
        expressionNumber: 5,
        soulUrgeNumber: 3,
        personalityNumber: 3,
        birthdayNumber: 15,
        maturityNumber: 6,
      };

      const result = getSynergyAnalysis(profile);
      const hasTransparent = result.some((line) => line.includes("투명한 자아"));
      expect(hasTransparent).toBe(true);
    });
  });

  describe("essence-based harmony", () => {
    it("detects natural flow for same essence numbers", () => {
      // 1 and 5 are both "정신적/독립적" essence
      const profile: CoreNumerologyProfile = {
        lifePathNumber: 1,
        expressionNumber: 5,
        soulUrgeNumber: 2,
        personalityNumber: 4,
        birthdayNumber: 15,
        maturityNumber: 6,
      };

      const result = getSynergyAnalysis(profile);
      const hasNaturalFlow = result.some((line) => line.includes("자연스러운 흐름"));
      expect(hasNaturalFlow).toBe(true);
    });

    it("detects charming consistency for same soul/personality essence", () => {
      // 2 and 4 are both "물질적/현실적" essence
      const profile: CoreNumerologyProfile = {
        lifePathNumber: 3,
        expressionNumber: 6,
        soulUrgeNumber: 2,
        personalityNumber: 4,
        birthdayNumber: 15,
        maturityNumber: 5,
      };

      const result = getSynergyAnalysis(profile);
      const hasCharm = result.some((line) => line.includes("매력적인 일관성"));
      expect(hasCharm).toBe(true);
    });
  });

  describe("challenge detection", () => {
    it("detects growth opportunity for opposing essences", () => {
      // 1 (정신적) vs 4 (물질적) - opposing
      const profile: CoreNumerologyProfile = {
        lifePathNumber: 1,
        expressionNumber: 4,
        soulUrgeNumber: 3,
        personalityNumber: 6,
        birthdayNumber: 15,
        maturityNumber: 5,
      };

      const result = getSynergyAnalysis(profile);
      const hasChallenge = result.some((line) => line.includes("성장의 기회"));
      expect(hasChallenge).toBe(true);
    });

    it("detects mysterious charm for different soul/personality", () => {
      // 3 (창의적) vs 1 (정신적) - different but not directly opposing
      const profile: CoreNumerologyProfile = {
        lifePathNumber: 2,
        expressionNumber: 4,
        soulUrgeNumber: 3,
        personalityNumber: 1,
        birthdayNumber: 15,
        maturityNumber: 4,
      };

      const result = getSynergyAnalysis(profile);
      const hasMystery = result.some((line) => line.includes("신비로운 매력"));
      expect(hasMystery).toBe(true);
    });
  });

  describe("bridge number", () => {
    it("calculates bridge number when different", () => {
      const profile: CoreNumerologyProfile = {
        lifePathNumber: 7,
        expressionNumber: 3,
        soulUrgeNumber: 2,
        personalityNumber: 4,
        birthdayNumber: 15,
        maturityNumber: 1,
      };

      const result = getSynergyAnalysis(profile);
      const hasBridge = result.some((line) => line.includes("브릿지"));
      expect(hasBridge).toBe(true);
    });
  });

  describe("birthday talent", () => {
    it("includes birthday number talent", () => {
      const profile: CoreNumerologyProfile = {
        lifePathNumber: 1,
        expressionNumber: 5,
        soulUrgeNumber: 2,
        personalityNumber: 3,
        birthdayNumber: 15,
        maturityNumber: 6,
      };

      const result = getSynergyAnalysis(profile);
      const hasTalent = result.some((line) => line.includes("타고난 재능") && line.includes("15"));
      expect(hasTalent).toBe(true);
    });
  });

  describe("dominant essence", () => {
    it("identifies dominant essence when 3 or more numbers share same essence", () => {
      // 1, 5, 7 are all "정신적/독립적"
      const profile: CoreNumerologyProfile = {
        lifePathNumber: 1,
        expressionNumber: 5,
        soulUrgeNumber: 7,
        personalityNumber: 11,
        birthdayNumber: 15,
        maturityNumber: 4,
      };

      const result = getSynergyAnalysis(profile);
      const hasDominant = result.some((line) => line.includes("전체 성향") && line.includes("정신적/독립적"));
      expect(hasDominant).toBe(true);
    });

    it("identifies material/realistic dominant essence", () => {
      // 2, 4, 8 are all "물질적/현실적"
      const profile: CoreNumerologyProfile = {
        lifePathNumber: 2,
        expressionNumber: 4,
        soulUrgeNumber: 8,
        personalityNumber: 22,
        birthdayNumber: 20,
        maturityNumber: 6,
      };

      const result = getSynergyAnalysis(profile);
      const hasDominant = result.some((line) => line.includes("전체 성향") && line.includes("물질적/현실적"));
      expect(hasDominant).toBe(true);
    });

    it("identifies creative/emotional dominant essence", () => {
      // 3, 6, 9 are all "창의적/감성적"
      const profile: CoreNumerologyProfile = {
        lifePathNumber: 3,
        expressionNumber: 6,
        soulUrgeNumber: 9,
        personalityNumber: 33,
        birthdayNumber: 18,
        maturityNumber: 9,
      };

      const result = getSynergyAnalysis(profile);
      const hasDominant = result.some((line) => line.includes("전체 성향") && line.includes("창의적/감성적"));
      expect(hasDominant).toBe(true);
    });
  });

  describe("master numbers", () => {
    it("handles master number 11 (spiritual/independent essence)", () => {
      const profile: CoreNumerologyProfile = {
        lifePathNumber: 11,
        expressionNumber: 1,
        soulUrgeNumber: 5,
        personalityNumber: 7,
        birthdayNumber: 11,
        maturityNumber: 3,
      };

      const result = getSynergyAnalysis(profile);
      expect(result.length).toBeGreaterThan(0);
    });

    it("handles master number 22 (material/realistic essence)", () => {
      const profile: CoreNumerologyProfile = {
        lifePathNumber: 22,
        expressionNumber: 4,
        soulUrgeNumber: 8,
        personalityNumber: 2,
        birthdayNumber: 22,
        maturityNumber: 8,
      };

      const result = getSynergyAnalysis(profile);
      expect(result.length).toBeGreaterThan(0);
    });

    it("handles master number 33 (creative/emotional essence)", () => {
      const profile: CoreNumerologyProfile = {
        lifePathNumber: 33,
        expressionNumber: 6,
        soulUrgeNumber: 9,
        personalityNumber: 3,
        birthdayNumber: 6,
        maturityNumber: 3,
      };

      const result = getSynergyAnalysis(profile);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
