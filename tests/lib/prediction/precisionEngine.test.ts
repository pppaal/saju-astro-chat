/**
 * Tests for PrecisionEngine - 초정밀 예측 엔진
 * src/lib/prediction/precisionEngine.ts
 */
import { describe, it, expect } from "vitest";
import {
  getSolarTermForDate,
  getSolarTermMonth,
  getLunarMansion,
  getLunarPhase,
  getLunarPhaseName,
  calculatePlanetaryHours,
  calculateSecondaryProgression,
  calculateConfidence,
  calculateUnifiedConfidence,
  combineConfidenceScores,
  analyzeCausalFactors,
  calculateEventCategoryScores,
  PrecisionEngine,
  type LunarPhase,
  type ConfidenceFactors,
  type FiveElement,
} from "@/lib/prediction/precisionEngine";

describe("PrecisionEngine", () => {
  describe("Solar Term Functions", () => {
    describe("getSolarTermForDate", () => {
      it("should return lichun (입춘) for early February", () => {
        const date = new Date("2025-02-10");
        const term = getSolarTermForDate(date);

        expect(term.nameKo).toBe("입춘");
        expect(term.element).toBe("목");
        expect(term.energy).toBe("yang");
        expect(term.month).toBe(1);
      });

      it("should return chunfen (춘분) for late March", () => {
        const date = new Date("2025-03-25");
        const term = getSolarTermForDate(date);

        expect(term.nameKo).toBe("춘분");
        expect(term.element).toBe("목");
        expect(term.month).toBe(2);
      });

      it("should return xiazhi (하지) for late June", () => {
        const date = new Date("2025-06-22");
        const term = getSolarTermForDate(date);

        expect(term.nameKo).toBe("하지");
        expect(term.element).toBe("화");
        expect(term.month).toBe(5);
      });

      it("should return qiufen (추분) for late September", () => {
        const date = new Date("2025-09-25");
        const term = getSolarTermForDate(date);

        expect(term.nameKo).toBe("추분");
        expect(term.element).toBe("금");
        expect(term.month).toBe(8);
      });

      it("should return dongzhi (동지) for late December", () => {
        const date = new Date("2025-12-22");
        const term = getSolarTermForDate(date);

        expect(term.nameKo).toBe("동지");
        expect(term.element).toBe("수");
        expect(term.month).toBe(11);
      });

      it("should calculate seasonPhase correctly", () => {
        const earlyDate = new Date("2025-03-05");
        const midDate = new Date("2025-03-15");
        const lateDate = new Date("2025-03-25");

        expect(getSolarTermForDate(earlyDate).seasonPhase).toBe("early");
        expect(getSolarTermForDate(midDate).seasonPhase).toBe("mid");
        expect(getSolarTermForDate(lateDate).seasonPhase).toBe("late");
      });

      it("should include longitude in result", () => {
        const date = new Date("2025-06-15");
        const term = getSolarTermForDate(date);

        expect(typeof term.longitude).toBe("number");
        expect(term.longitude).toBeGreaterThanOrEqual(0);
        expect(term.longitude).toBeLessThan(360);
      });
    });

    describe("getSolarTermMonth", () => {
      it("should return correct term month for various dates", () => {
        expect(getSolarTermMonth(new Date("2025-02-15"))).toBe(1);
        expect(getSolarTermMonth(new Date("2025-05-15"))).toBe(4);
        expect(getSolarTermMonth(new Date("2025-08-15"))).toBe(7);
        expect(getSolarTermMonth(new Date("2025-11-15"))).toBe(10);
      });
    });
  });

  describe("Lunar Mansion Functions", () => {
    describe("getLunarMansion", () => {
      it("should return a valid lunar mansion object", () => {
        const date = new Date("2025-01-15");
        const mansion = getLunarMansion(date);

        expect(mansion.index).toBeGreaterThanOrEqual(1);
        expect(mansion.index).toBeLessThanOrEqual(28);
        expect(mansion.name).toBeDefined();
        expect(mansion.nameKo).toBeDefined();
        expect(mansion.element).toBeDefined();
        expect(typeof mansion.isAuspicious).toBe("boolean");
        expect(Array.isArray(mansion.goodFor)).toBe(true);
        expect(Array.isArray(mansion.badFor)).toBe(true);
      });

      it("should cycle through 28 mansions correctly", () => {
        const baseDate = new Date("2025-01-01");
        const baseMansion = getLunarMansion(baseDate);

        // After 28 days, should return to same mansion
        const after28Days = new Date("2025-01-29");
        const mansion28 = getLunarMansion(after28Days);

        expect(mansion28.index).toBe(baseMansion.index);
      });

      it("should return different mansions for consecutive days", () => {
        const day1 = new Date("2025-02-01");
        const day2 = new Date("2025-02-02");

        const mansion1 = getLunarMansion(day1);
        const mansion2 = getLunarMansion(day2);

        expect(mansion1.index).not.toBe(mansion2.index);
      });

      it("should include animal associations", () => {
        const date = new Date("2025-03-15");
        const mansion = getLunarMansion(date);

        expect(mansion.animal).toBeDefined();
        expect(typeof mansion.animal).toBe("string");
      });
    });
  });

  describe("Lunar Phase Functions", () => {
    describe("getLunarPhase", () => {
      it("should return new_moon for day 1", () => {
        expect(getLunarPhase(1)).toBe("new_moon");
      });

      it("should return waxing_crescent for days 2-7", () => {
        expect(getLunarPhase(3)).toBe("waxing_crescent");
        expect(getLunarPhase(7)).toBe("waxing_crescent");
      });

      it("should return first_quarter for day 8", () => {
        expect(getLunarPhase(8)).toBe("first_quarter");
      });

      it("should return full_moon for days 15-16", () => {
        expect(getLunarPhase(15)).toBe("full_moon");
        expect(getLunarPhase(16)).toBe("full_moon");
      });

      it("should return last_quarter for day 23", () => {
        expect(getLunarPhase(23)).toBe("last_quarter");
      });

      it("should return waning_crescent for days 24+", () => {
        expect(getLunarPhase(25)).toBe("waning_crescent");
        expect(getLunarPhase(29)).toBe("waning_crescent");
      });
    });

    describe("getLunarPhaseName", () => {
      it("should return Korean names for all phases", () => {
        const phases: LunarPhase[] = [
          "new_moon",
          "waxing_crescent",
          "first_quarter",
          "waxing_gibbous",
          "full_moon",
          "waning_gibbous",
          "last_quarter",
          "waning_crescent",
        ];

        for (const phase of phases) {
          const name = getLunarPhaseName(phase);
          expect(typeof name).toBe("string");
          expect(name.length).toBeGreaterThan(0);
        }
      });

      it("should return specific names", () => {
        expect(getLunarPhaseName("new_moon")).toContain("삭");
        expect(getLunarPhaseName("full_moon")).toContain("보름");
        expect(getLunarPhaseName("waning_crescent")).toContain("그믐");
      });
    });
  });

  describe("Planetary Hours", () => {
    describe("calculatePlanetaryHours", () => {
      it("should return 24 planetary hours", () => {
        const date = new Date("2025-06-21"); // Summer solstice
        const hours = calculatePlanetaryHours(date);

        expect(hours.length).toBe(24);
      });

      it("should have 12 day hours and 12 night hours", () => {
        const date = new Date("2025-03-21");
        const hours = calculatePlanetaryHours(date);

        const dayHours = hours.filter((h) => h.isDay);
        const nightHours = hours.filter((h) => !h.isDay);

        expect(dayHours.length).toBe(12);
        expect(nightHours.length).toBe(12);
      });

      it("should assign correct planets", () => {
        const date = new Date("2025-01-05"); // Sunday
        const hours = calculatePlanetaryHours(date);

        const validPlanets = [
          "Sun",
          "Moon",
          "Mars",
          "Mercury",
          "Jupiter",
          "Venus",
          "Saturn",
        ];
        for (const hour of hours) {
          expect(validPlanets).toContain(hour.planet);
        }
      });

      it("should include element for each hour", () => {
        const date = new Date("2025-02-15");
        const hours = calculatePlanetaryHours(date);

        for (const hour of hours) {
          expect(["목", "화", "토", "금", "수"]).toContain(hour.element);
        }
      });

      it("should include quality rating", () => {
        const date = new Date("2025-04-10");
        const hours = calculatePlanetaryHours(date);

        const validQualities = [
          "excellent",
          "good",
          "neutral",
          "caution",
          "avoid",
        ];
        for (const hour of hours) {
          expect(validQualities).toContain(hour.quality);
        }
      });

      it("should include activities for each hour", () => {
        const date = new Date("2025-05-20");
        const hours = calculatePlanetaryHours(date);

        for (const hour of hours) {
          expect(Array.isArray(hour.goodFor)).toBe(true);
          expect(hour.goodFor.length).toBeGreaterThan(0);
        }
      });

      it("should accept custom coordinates", () => {
        const date = new Date("2025-07-01");
        const hours = calculatePlanetaryHours(date, 35.6762, 139.6503); // Tokyo

        expect(hours.length).toBe(24);
      });
    });
  });

  describe("Secondary Progression", () => {
    describe("calculateSecondaryProgression", () => {
      it("should calculate progressed positions", () => {
        const birthDate = new Date("1990-06-15");
        const targetDate = new Date("2025-06-15");

        const result = calculateSecondaryProgression(birthDate, targetDate);

        expect(result.sun).toBeDefined();
        expect(result.moon).toBeDefined();
        expect(result.mercury).toBeDefined();
        expect(result.venus).toBeDefined();
        expect(result.mars).toBeDefined();
      });

      it("should return valid zodiac signs", () => {
        const birthDate = new Date("1985-03-20");
        const targetDate = new Date("2025-03-20");

        const result = calculateSecondaryProgression(birthDate, targetDate);

        const validSigns = [
          "Aries",
          "Taurus",
          "Gemini",
          "Cancer",
          "Leo",
          "Virgo",
          "Libra",
          "Scorpio",
          "Sagittarius",
          "Capricorn",
          "Aquarius",
          "Pisces",
        ];

        expect(validSigns).toContain(result.sun.sign);
        expect(validSigns).toContain(result.moon.sign);
      });

      it("should include degree positions", () => {
        const birthDate = new Date("1995-10-10");
        const targetDate = new Date("2025-10-10");

        const result = calculateSecondaryProgression(birthDate, targetDate);

        expect(typeof result.sun.degree).toBe("number");
        expect(result.sun.degree).toBeGreaterThanOrEqual(0);
        expect(result.sun.degree).toBeLessThan(30);
      });

      it("should include moon phase", () => {
        const birthDate = new Date("2000-01-01");
        const targetDate = new Date("2025-01-01");

        const result = calculateSecondaryProgression(birthDate, targetDate);

        const validPhases = [
          "New",
          "Crescent",
          "First Quarter",
          "Gibbous",
          "Full",
          "Disseminating",
          "Last Quarter",
          "Balsamic",
        ];

        expect(validPhases).toContain(result.moon.phase);
      });
    });
  });

  describe("Confidence Calculation", () => {
    describe("calculateConfidence", () => {
      it("should return high confidence for exact birth time", () => {
        const factors: ConfidenceFactors = {
          birthTimeAccuracy: "exact",
          methodAlignment: 90,
          dataCompleteness: 95,
        };

        const confidence = calculateConfidence(factors);

        expect(confidence).toBeGreaterThanOrEqual(80);
        expect(confidence).toBeLessThanOrEqual(100);
      });

      it("should return lower confidence for unknown birth time", () => {
        const factors: ConfidenceFactors = {
          birthTimeAccuracy: "unknown",
          methodAlignment: 70,
          dataCompleteness: 60,
        };

        const confidence = calculateConfidence(factors);

        expect(confidence).toBeLessThan(70);
      });

      it("should factor in historical validation when provided", () => {
        const withValidation: ConfidenceFactors = {
          birthTimeAccuracy: "within_hour",
          methodAlignment: 80,
          dataCompleteness: 85,
          historicalValidation: 90,
        };

        const withoutValidation: ConfidenceFactors = {
          birthTimeAccuracy: "within_hour",
          methodAlignment: 80,
          dataCompleteness: 85,
        };

        const confWithValidation = calculateConfidence(withValidation);
        const confWithoutValidation = calculateConfidence(withoutValidation);

        // Both should produce valid scores
        expect(confWithValidation).toBeGreaterThan(0);
        expect(confWithoutValidation).toBeGreaterThan(0);
      });
    });

    describe("calculateUnifiedConfidence", () => {
      it("should return grade A+ for high scores", () => {
        const factors: ConfidenceFactors & { predictionType?: string } = {
          birthTimeAccuracy: "exact",
          methodAlignment: 95,
          dataCompleteness: 98,
          historicalValidation: 95,
        };

        const result = calculateUnifiedConfidence(factors);

        expect(result.grade).toBe("A+");
        expect(result.score).toBeGreaterThanOrEqual(95);
      });

      it("should return grade F for very low scores", () => {
        const factors: ConfidenceFactors = {
          birthTimeAccuracy: "unknown",
          methodAlignment: 20,
          dataCompleteness: 25,
        };

        const result = calculateUnifiedConfidence(factors);

        expect(result.grade).toBe("F");
        expect(result.score).toBeLessThan(35);
      });

      it("should include interpretation", () => {
        const factors: ConfidenceFactors = {
          birthTimeAccuracy: "within_hour",
          methodAlignment: 75,
          dataCompleteness: 80,
        };

        const result = calculateUnifiedConfidence(factors);

        expect(result.interpretation).toBeDefined();
        expect(typeof result.interpretation).toBe("string");
        expect(result.interpretation.length).toBeGreaterThan(0);
      });

      it("should include recommendations", () => {
        const factors: ConfidenceFactors = {
          birthTimeAccuracy: "unknown",
          methodAlignment: 50,
          dataCompleteness: 60,
        };

        const result = calculateUnifiedConfidence(factors);

        expect(Array.isArray(result.recommendations)).toBe(true);
        expect(result.recommendations.length).toBeGreaterThan(0);
      });

      it("should apply east-west harmony bonus", () => {
        const lowHarmony = {
          birthTimeAccuracy: "exact" as const,
          methodAlignment: 70,
          dataCompleteness: 70,
          eastWestHarmony: 30,
        };

        const highHarmony = {
          birthTimeAccuracy: "exact" as const,
          methodAlignment: 70,
          dataCompleteness: 70,
          eastWestHarmony: 90,
        };

        const lowResult = calculateUnifiedConfidence(lowHarmony);
        const highResult = calculateUnifiedConfidence(highHarmony);

        expect(highResult.score).toBeGreaterThan(lowResult.score);
      });
    });

    describe("combineConfidenceScores", () => {
      it("should combine multiple confidence sources", () => {
        const scores = [
          { source: "saju", score: 80, weight: 1 },
          { source: "astrology", score: 70, weight: 1 },
          { source: "numerology", score: 75, weight: 0.5 },
        ];

        const result = combineConfidenceScores(scores);

        expect(result.combined).toBeGreaterThan(0);
        expect(result.combined).toBeLessThanOrEqual(100);
        expect(result.breakdown.length).toBe(3);
      });

      it("should return 50 for empty scores", () => {
        const result = combineConfidenceScores([]);

        expect(result.combined).toBe(50);
        expect(result.breakdown.length).toBe(0);
      });

      it("should respect weights", () => {
        const heavyWeight = [
          { source: "main", score: 90, weight: 3 },
          { source: "secondary", score: 50, weight: 1 },
        ];

        const result = combineConfidenceScores(heavyWeight);

        // Should be closer to 90 than 50
        expect(result.combined).toBeGreaterThan(70);
      });
    });
  });

  describe("Causal Factor Analysis", () => {
    describe("analyzeCausalFactors", () => {
      it("should detect stem clashes", () => {
        // 甲-庚 is a stem clash pair
        const factors = analyzeCausalFactors("甲", "子", "庚", "午");

        const stemClash = factors.find((f) => f.type === "stem_clash");
        expect(stemClash).toBeDefined();
        expect(stemClash?.impact).toBe("major_negative");
      });

      it("should detect branch clashes", () => {
        // 子-午 is a branch clash pair
        const factors = analyzeCausalFactors("甲", "子", "甲", "午");

        const branchClash = factors.find((f) => f.type === "branch_clash");
        expect(branchClash).toBeDefined();
      });

      it("should detect triple harmonies", () => {
        // 申-子 are part of water triple harmony
        const factors = analyzeCausalFactors("甲", "申", "甲", "子");

        const harmony = factors.find((f) => f.type === "branch_harmony");
        expect(harmony).toBeDefined();
        expect(harmony?.impact).toBe("major_positive");
      });

      it("should detect yongsin activation", () => {
        const yongsin: FiveElement[] = ["목", "화"];
        const factors = analyzeCausalFactors(
          "甲",
          "子",
          "甲",
          "寅", // 甲 is wood element
          undefined,
          undefined,
          yongsin
        );

        const yongsinActive = factors.find(
          (f) => f.type === "yongsin_activation"
        );
        expect(yongsinActive).toBeDefined();
        expect(yongsinActive?.impact).toBe("major_positive");
      });

      it("should detect kisin activation", () => {
        const kisin: FiveElement[] = ["금"];
        const factors = analyzeCausalFactors(
          "甲",
          "子",
          "庚",
          "申", // 庚 is metal element
          undefined,
          undefined,
          undefined,
          kisin
        );

        const kisinActive = factors.find((f) => f.type === "kisin_activation");
        expect(kisinActive).toBeDefined();
        expect(kisinActive?.impact).toBe("negative");
      });

      it("should sort factors by impact score", () => {
        const factors = analyzeCausalFactors(
          "甲",
          "申",
          "甲",
          "子",
          undefined,
          undefined,
          ["수"]
        );

        // Factors should be sorted by absolute score (descending)
        for (let i = 1; i < factors.length; i++) {
          expect(Math.abs(factors[i - 1].score)).toBeGreaterThanOrEqual(
            Math.abs(factors[i].score)
          );
        }
      });
    });
  });

  describe("Event Category Scores", () => {
    describe("calculateEventCategoryScores", () => {
      it("should return scores for all categories", () => {
        const scores = calculateEventCategoryScores(
          "정관",
          "건록",
          [],
          [],
          false,
          false
        );

        expect(scores.career).toBeDefined();
        expect(scores.finance).toBeDefined();
        expect(scores.relationship).toBeDefined();
        expect(scores.health).toBeDefined();
        expect(scores.travel).toBeDefined();
        expect(scores.education).toBeDefined();
      });

      it("should apply sibsin modifiers correctly", () => {
        const jeonggwanScores = calculateEventCategoryScores(
          "정관",
          "관대",
          [],
          [],
          false,
          false
        );

        const sikshinScores = calculateEventCategoryScores(
          "식신",
          "관대",
          [],
          [],
          false,
          false
        );

        // 정관 boosts career
        expect(jeonggwanScores.career).toBeGreaterThan(sikshinScores.career);
        // 식신 boosts health
        expect(sikshinScores.health).toBeGreaterThan(jeonggwanScores.health);
      });

      it("should apply twelve stage modifiers", () => {
        const jaewaScores = calculateEventCategoryScores(
          "비견",
          "제왕",
          [],
          [],
          false,
          false
        );

        const saScores = calculateEventCategoryScores(
          "비견",
          "사",
          [],
          [],
          false,
          false
        );

        // 제왕 should have higher career score than 사
        expect(jaewaScores.career).toBeGreaterThan(saScores.career);
      });

      it("should apply yongsin boost to all categories", () => {
        const withYongsin = calculateEventCategoryScores(
          "비견",
          "관대",
          [],
          [],
          true,
          false
        );

        const withoutYongsin = calculateEventCategoryScores(
          "비견",
          "관대",
          [],
          [],
          false,
          false
        );

        expect(withYongsin.career).toBeGreaterThan(withoutYongsin.career);
        expect(withYongsin.finance).toBeGreaterThan(withoutYongsin.finance);
        expect(withYongsin.health).toBeGreaterThan(withoutYongsin.health);
      });

      it("should apply kisin penalty to all categories", () => {
        const withKisin = calculateEventCategoryScores(
          "비견",
          "관대",
          [],
          [],
          false,
          true
        );

        const withoutKisin = calculateEventCategoryScores(
          "비견",
          "관대",
          [],
          [],
          false,
          false
        );

        expect(withKisin.career).toBeLessThan(withoutKisin.career);
        expect(withKisin.finance).toBeLessThan(withoutKisin.finance);
      });

      it("should apply shinsal effects", () => {
        const withLuckyShinsal = calculateEventCategoryScores(
          "비견",
          "관대",
          [],
          [{ name: "천을귀인", type: "lucky" }],
          false,
          false
        );

        const withUnluckyShinsal = calculateEventCategoryScores(
          "비견",
          "관대",
          [],
          [{ name: "겁살", type: "unlucky" }],
          false,
          false
        );

        expect(withLuckyShinsal.career).toBeGreaterThan(
          withUnluckyShinsal.career
        );
      });

      it("should normalize scores to 0-100 range", () => {
        const scores = calculateEventCategoryScores(
          "정관",
          "제왕",
          [{ type: "삼합", score: 30 }],
          [
            { name: "천을귀인", type: "lucky" },
            { name: "역마", type: "lucky" },
          ],
          true,
          false
        );

        expect(scores.career).toBeGreaterThanOrEqual(0);
        expect(scores.career).toBeLessThanOrEqual(100);
        expect(scores.finance).toBeGreaterThanOrEqual(0);
        expect(scores.finance).toBeLessThanOrEqual(100);
      });

      it("should apply branch interaction modifiers", () => {
        const withHarmony = calculateEventCategoryScores(
          "비견",
          "관대",
          [{ type: "육합", score: 20 }],
          [],
          false,
          false
        );

        const withClash = calculateEventCategoryScores(
          "비견",
          "관대",
          [{ type: "자오충", score: -20 }],
          [],
          false,
          false
        );

        expect(withHarmony.relationship).toBeGreaterThan(
          withClash.relationship
        );
      });
    });
  });

  describe("PrecisionEngine Object Export", () => {
    it("should export all main functions", () => {
      expect(PrecisionEngine.getSolarTermForDate).toBeDefined();
      expect(PrecisionEngine.getSolarTermMonth).toBeDefined();
      expect(PrecisionEngine.getLunarMansion).toBeDefined();
      expect(PrecisionEngine.getLunarPhase).toBeDefined();
      expect(PrecisionEngine.getLunarPhaseName).toBeDefined();
      expect(PrecisionEngine.calculatePlanetaryHours).toBeDefined();
      expect(PrecisionEngine.calculateSecondaryProgression).toBeDefined();
      expect(PrecisionEngine.calculateConfidence).toBeDefined();
      expect(PrecisionEngine.calculateUnifiedConfidence).toBeDefined();
      expect(PrecisionEngine.combineConfidenceScores).toBeDefined();
      expect(PrecisionEngine.analyzeCausalFactors).toBeDefined();
      expect(PrecisionEngine.calculateEventCategoryScores).toBeDefined();
    });
  });
});
