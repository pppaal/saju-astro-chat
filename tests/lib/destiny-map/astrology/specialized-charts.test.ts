/**
 * Specialized Charts Tests
 * Tests for Draconic and Harmonic chart calculations
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
const mockDraconicChart = {
  planets: [
    { name: "Sun", sign: "Leo", longitude: 125.5 },
    { name: "Moon", sign: "Cancer", longitude: 95.3 },
    { name: "Mercury", sign: "Virgo", longitude: 155.2 },
  ],
  ascendant: { sign: "Aries", longitude: 5.0 },
};

const mockDraconicComparison = {
  sunComparison: { natalSign: "Taurus", draconicSign: "Leo", difference: 90 },
  moonComparison: { natalSign: "Aries", draconicSign: "Cancer", difference: 90 },
  highlights: ["Soul seeks creative expression", "Emotional needs differ from surface"],
};

const mockHarmonicChart = {
  harmonic: 5,
  planets: [
    { name: "Sun", sign: "Gemini", longitude: 62.5 },
    { name: "Moon", sign: "Pisces", longitude: 350.5 },
  ],
  aspects: [],
};

const mockHarmonicProfile = {
  strongestHarmonics: [
    { harmonic: 5, strength: 85, meaning: "Creativity" },
    { harmonic: 9, strength: 72, meaning: "Completion" },
  ],
  dominantHarmonics: [5, 9],
  ageRelevantHarmonic: 34,
};

vi.mock("@/lib/astrology", () => ({
  calculateDraconicChart: vi.fn(() => mockDraconicChart),
  compareDraconicToNatal: vi.fn(() => mockDraconicComparison),
  calculateHarmonicChart: vi.fn((chart, harmonic) => ({
    ...mockHarmonicChart,
    harmonic,
  })),
  generateHarmonicProfile: vi.fn(() => mockHarmonicProfile),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

import {
  calculateDraconicChartAnalysis,
  calculateHarmonicChartsAnalysis,
  calculateAllSpecializedCharts,
  type DraconicResult,
  type HarmonicsResult,
  type SpecializedChartsInput,
} from "@/lib/destiny-map/astrology/specialized-charts";
import {
  calculateDraconicChart,
  compareDraconicToNatal,
  calculateHarmonicChart,
  generateHarmonicProfile,
} from "@/lib/astrology";
import { logger } from "@/lib/logger";

describe("Specialized Charts", () => {
  const mockNatalChart = {
    planets: [
      { name: "Sun", sign: "Taurus", longitude: 35.5 },
      { name: "Moon", sign: "Aries", longitude: 5.3 },
    ],
    houses: [],
    ascendant: { sign: "Cancer", longitude: 95.0 },
  };

  const mockInput: SpecializedChartsInput = {
    natalChart: mockNatalChart as any,
    currentAge: 34,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("calculateDraconicChartAnalysis", () => {
    it("returns DraconicResult structure", async () => {
      const result = await calculateDraconicChartAnalysis(mockInput);

      expect(result).toHaveProperty("chart");
      expect(result).toHaveProperty("comparison");
    });

    it("calculates draconic chart", async () => {
      const result = await calculateDraconicChartAnalysis(mockInput);

      expect(calculateDraconicChart).toHaveBeenCalledWith(mockNatalChart);
      expect(result.chart).toEqual(mockDraconicChart);
    });

    it("compares draconic to natal", async () => {
      const result = await calculateDraconicChartAnalysis(mockInput);

      expect(compareDraconicToNatal).toHaveBeenCalledWith(mockNatalChart);
      expect(result.comparison).toEqual(mockDraconicComparison);
    });

    it("includes planets in draconic chart", async () => {
      const result = await calculateDraconicChartAnalysis(mockInput);

      expect(result.chart.planets).toBeDefined();
      expect(result.chart.planets.length).toBeGreaterThan(0);
      expect(result.chart.planets[0]).toHaveProperty("name");
      expect(result.chart.planets[0]).toHaveProperty("sign");
    });

    it("includes ascendant in draconic chart", async () => {
      const result = await calculateDraconicChartAnalysis(mockInput);

      expect(result.chart.ascendant).toBeDefined();
      expect(result.chart.ascendant.sign).toBe("Aries");
    });

    it("includes sun comparison", async () => {
      const result = await calculateDraconicChartAnalysis(mockInput);

      expect(result.comparison.sunComparison).toBeDefined();
      expect(result.comparison.sunComparison.natalSign).toBe("Taurus");
      expect(result.comparison.sunComparison.draconicSign).toBe("Leo");
    });

    describe("with debug logs enabled", () => {
      it("logs debug information", async () => {
        await calculateDraconicChartAnalysis(mockInput, true);

        expect(logger.debug).toHaveBeenCalledWith(
          "[Draconic] Starting calculation"
        );
        expect(logger.debug).toHaveBeenCalledWith(
          "[Draconic] Calculation complete",
          expect.any(Object)
        );
      });
    });

    describe("error handling", () => {
      it("throws and logs error on calculation failure", async () => {
        const error = new Error("Calculation failed");
        vi.mocked(calculateDraconicChart).mockImplementationOnce(() => {
          throw error;
        });

        await expect(calculateDraconicChartAnalysis(mockInput)).rejects.toThrow(
          "Calculation failed"
        );
        expect(logger.error).toHaveBeenCalledWith(
          "[Draconic] Calculation failed",
          error
        );
      });
    });
  });

  describe("calculateHarmonicChartsAnalysis", () => {
    it("returns HarmonicsResult structure", async () => {
      const result = await calculateHarmonicChartsAnalysis(mockInput);

      expect(result).toHaveProperty("h5");
      expect(result).toHaveProperty("h7");
      expect(result).toHaveProperty("h9");
      expect(result).toHaveProperty("profile");
    });

    it("calculates 5th harmonic chart", async () => {
      const result = await calculateHarmonicChartsAnalysis(mockInput);

      expect(calculateHarmonicChart).toHaveBeenCalledWith(mockNatalChart, 5);
      expect(result.h5.harmonic).toBe(5);
    });

    it("calculates 7th harmonic chart", async () => {
      const result = await calculateHarmonicChartsAnalysis(mockInput);

      expect(calculateHarmonicChart).toHaveBeenCalledWith(mockNatalChart, 7);
      expect(result.h7.harmonic).toBe(7);
    });

    it("calculates 9th harmonic chart", async () => {
      const result = await calculateHarmonicChartsAnalysis(mockInput);

      expect(calculateHarmonicChart).toHaveBeenCalledWith(mockNatalChart, 9);
      expect(result.h9.harmonic).toBe(9);
    });

    it("generates harmonic profile", async () => {
      const result = await calculateHarmonicChartsAnalysis(mockInput);

      expect(generateHarmonicProfile).toHaveBeenCalledWith(mockNatalChart, 34);
      expect(result.profile).toEqual(mockHarmonicProfile);
    });

    it("includes strongest harmonics in profile", async () => {
      const result = await calculateHarmonicChartsAnalysis(mockInput);

      expect(result.profile.strongestHarmonics).toBeDefined();
      expect(result.profile.strongestHarmonics.length).toBeGreaterThan(0);
      expect(result.profile.strongestHarmonics[0]).toHaveProperty("harmonic");
      expect(result.profile.strongestHarmonics[0]).toHaveProperty("strength");
    });

    it("includes dominant harmonics in profile", async () => {
      const result = await calculateHarmonicChartsAnalysis(mockInput);

      expect(result.profile.dominantHarmonics).toContain(5);
      expect(result.profile.dominantHarmonics).toContain(9);
    });

    describe("with debug logs enabled", () => {
      it("logs debug information", async () => {
        await calculateHarmonicChartsAnalysis(mockInput, true);

        expect(logger.debug).toHaveBeenCalledWith(
          "[Harmonics] Starting calculation",
          expect.objectContaining({ currentAge: 34 })
        );
        expect(logger.debug).toHaveBeenCalledWith(
          "[Harmonics] Calculation complete",
          expect.any(Object)
        );
      });
    });

    describe("error handling", () => {
      it("throws and logs error on calculation failure", async () => {
        const error = new Error("Harmonic calculation failed");
        vi.mocked(calculateHarmonicChart).mockImplementationOnce(() => {
          throw error;
        });

        await expect(calculateHarmonicChartsAnalysis(mockInput)).rejects.toThrow(
          "Harmonic calculation failed"
        );
        expect(logger.error).toHaveBeenCalledWith(
          "[Harmonics] Calculation failed",
          error
        );
      });
    });
  });

  describe("calculateAllSpecializedCharts", () => {
    it("returns combined draconic and harmonics result", async () => {
      const result = await calculateAllSpecializedCharts(mockInput);

      expect(result).toHaveProperty("draconic");
      expect(result).toHaveProperty("harmonics");
    });

    it("calculates draconic chart", async () => {
      const result = await calculateAllSpecializedCharts(mockInput);

      expect(result.draconic.chart).toEqual(mockDraconicChart);
      expect(result.draconic.comparison).toEqual(mockDraconicComparison);
    });

    it("calculates all harmonic charts", async () => {
      const result = await calculateAllSpecializedCharts(mockInput);

      expect(result.harmonics.h5.harmonic).toBe(5);
      expect(result.harmonics.h7.harmonic).toBe(7);
      expect(result.harmonics.h9.harmonic).toBe(9);
    });

    it("includes harmonic profile", async () => {
      const result = await calculateAllSpecializedCharts(mockInput);

      expect(result.harmonics.profile).toEqual(mockHarmonicProfile);
    });

    it("calculates draconic and harmonics in parallel", async () => {
      await calculateAllSpecializedCharts(mockInput);

      // Both calculations should be called
      expect(calculateDraconicChart).toHaveBeenCalled();
      expect(calculateHarmonicChart).toHaveBeenCalled();
    });

    describe("with debug logs enabled", () => {
      it("logs debug information", async () => {
        await calculateAllSpecializedCharts(mockInput, true);

        expect(logger.debug).toHaveBeenCalledWith(
          "[Specialized Charts] Starting all calculations"
        );
        expect(logger.debug).toHaveBeenCalledWith(
          "[Specialized Charts] All calculations complete"
        );
      });
    });

    describe("error handling", () => {
      it("throws and logs error on draconic calculation failure", async () => {
        const error = new Error("Draconic failed");
        vi.mocked(calculateDraconicChart).mockImplementationOnce(() => {
          throw error;
        });

        await expect(calculateAllSpecializedCharts(mockInput)).rejects.toThrow(
          "Draconic failed"
        );
        expect(logger.error).toHaveBeenCalled();
      });

      it("throws and logs error on harmonic calculation failure", async () => {
        const error = new Error("Harmonic failed");
        vi.mocked(calculateHarmonicChart).mockImplementationOnce(() => {
          throw error;
        });

        await expect(calculateAllSpecializedCharts(mockInput)).rejects.toThrow(
          "Harmonic failed"
        );
        expect(logger.error).toHaveBeenCalled();
      });
    });
  });

  describe("Type interfaces", () => {
    it("DraconicResult has correct shape", async () => {
      const result: DraconicResult = await calculateDraconicChartAnalysis(mockInput);

      expect(result.chart).toBeDefined();
      expect(result.comparison).toBeDefined();
    });

    it("HarmonicsResult has correct shape", async () => {
      const result: HarmonicsResult = await calculateHarmonicChartsAnalysis(mockInput);

      expect(result.h5).toBeDefined();
      expect(result.h7).toBeDefined();
      expect(result.h9).toBeDefined();
      expect(result.profile).toBeDefined();
    });

    it("SpecializedChartsInput has correct shape", () => {
      const input: SpecializedChartsInput = {
        natalChart: mockNatalChart as any,
        currentAge: 25,
      };

      expect(input.natalChart).toBeDefined();
      expect(input.currentAge).toBe(25);
    });
  });

  describe("Harmonic chart meanings", () => {
    it("5th harmonic represents creativity", async () => {
      const result = await calculateHarmonicChartsAnalysis(mockInput);

      expect(result.h5.harmonic).toBe(5);
      // H5 is for creativity, artistic talent
    });

    it("7th harmonic represents spirituality", async () => {
      const result = await calculateHarmonicChartsAnalysis(mockInput);

      expect(result.h7.harmonic).toBe(7);
      // H7 is for spiritual insights, inspiration
    });

    it("9th harmonic represents completion", async () => {
      const result = await calculateHarmonicChartsAnalysis(mockInput);

      expect(result.h9.harmonic).toBe(9);
      // H9 is for mastery, wholeness
    });
  });
});
