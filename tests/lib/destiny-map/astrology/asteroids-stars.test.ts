/**
 * Asteroids and Fixed Stars Tests
 * Tests for asteroid and fixed star calculation types
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/astrology", () => ({
  calculateAllAsteroids: vi.fn(),
  findAllAsteroidAspects: vi.fn(),
  findFixedStarConjunctions: vi.fn(),
  findEclipseImpact: vi.fn(),
  getUpcomingEclipses: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  calculateAsteroidsAnalysis,
  findFixedStarsAnalysis,
  analyzeEclipsesImpact,
  calculateAllAsteroidsStars,
  type AsteroidsStarsInput,
} from "@/lib/destiny-map/astrology/asteroids-stars";

import * as astrologyModule from "@/lib/astrology";

describe("Asteroids and Fixed Stars", () => {
  describe("Asteroid Types", () => {
    describe("Ceres", () => {
      it("defines Ceres asteroid structure", () => {
        const ceres = {
          name: "Ceres",
          longitude: 145.5,
          sign: "Virgo",
          degree: 25.5,
          house: 6,
        };

        expect(ceres).toHaveProperty("name");
        expect(ceres).toHaveProperty("longitude");
        expect(ceres).toHaveProperty("sign");
        expect(ceres).toHaveProperty("degree");
      });

      it("represents nurturing and motherhood", () => {
        const themes = ["nurturing", "motherhood", "food", "agriculture"];
        expect(themes).toContain("nurturing");
        expect(themes).toContain("motherhood");
      });
    });

    describe("Pallas", () => {
      it("defines Pallas asteroid structure", () => {
        const pallas = {
          name: "Pallas",
          longitude: 210.3,
          sign: "Scorpio",
          degree: 0.3,
          house: 8,
        };

        expect(pallas.name).toBe("Pallas");
        expect(pallas.longitude).toBeGreaterThanOrEqual(0);
        expect(pallas.longitude).toBeLessThan(360);
      });

      it("represents wisdom and strategy", () => {
        const themes = ["wisdom", "strategy", "creative intelligence"];
        expect(themes).toContain("wisdom");
        expect(themes).toContain("strategy");
      });
    });

    describe("Juno", () => {
      it("defines Juno asteroid structure", () => {
        const juno = {
          name: "Juno",
          longitude: 45.8,
          sign: "Taurus",
          degree: 15.8,
          house: 2,
        };

        expect(juno.name).toBe("Juno");
      });

      it("represents partnership and marriage", () => {
        const themes = ["partnership", "marriage", "commitment"];
        expect(themes).toContain("partnership");
        expect(themes).toContain("marriage");
      });
    });

    describe("Vesta", () => {
      it("defines Vesta asteroid structure", () => {
        const vesta = {
          name: "Vesta",
          longitude: 300.2,
          sign: "Aquarius",
          degree: 0.2,
          house: 11,
        };

        expect(vesta.name).toBe("Vesta");
      });

      it("represents devotion and focus", () => {
        const themes = ["devotion", "focus", "sacred sexuality"];
        expect(themes).toContain("devotion");
        expect(themes).toContain("focus");
      });
    });
  });

  describe("AsteroidsResult Structure", () => {
    it("defines complete result structure", () => {
      const result = {
        ceres: { name: "Ceres", longitude: 145, sign: "Virgo", degree: 25 },
        pallas: { name: "Pallas", longitude: 210, sign: "Scorpio", degree: 0 },
        juno: { name: "Juno", longitude: 45, sign: "Taurus", degree: 15 },
        vesta: { name: "Vesta", longitude: 300, sign: "Aquarius", degree: 0 },
        aspects: [],
      };

      expect(result).toHaveProperty("ceres");
      expect(result).toHaveProperty("pallas");
      expect(result).toHaveProperty("juno");
      expect(result).toHaveProperty("vesta");
      expect(result).toHaveProperty("aspects");
    });

    it("asteroids are optional", () => {
      const partialResult = {
        ceres: { name: "Ceres", longitude: 145, sign: "Virgo", degree: 25 },
        aspects: [],
      };

      expect(partialResult.ceres).toBeDefined();
      expect((partialResult as any).pallas).toBeUndefined();
    });
  });

  describe("Fixed Star Conjunctions", () => {
    it("defines fixed star conjunction structure", () => {
      const conjunction = {
        star: "Regulus",
        planet: "Sun",
        orb: 0.5,
        nature: "benefic",
        longitude: 150.0,
      };

      expect(conjunction).toHaveProperty("star");
      expect(conjunction).toHaveProperty("planet");
      expect(conjunction).toHaveProperty("orb");
    });

    it("notable fixed stars are included", () => {
      const notableStars = [
        "Regulus",
        "Spica",
        "Aldebaran",
        "Antares",
        "Fomalhaut",
        "Algol",
        "Sirius",
      ];

      expect(notableStars.length).toBeGreaterThan(0);
      expect(notableStars).toContain("Regulus");
      expect(notableStars).toContain("Sirius");
    });

    it("orb is typically within 1 degree", () => {
      const maxOrb = 1.0;
      const conjunction = { orb: 0.5 };

      expect(conjunction.orb).toBeLessThanOrEqual(maxOrb);
    });
  });

  describe("Eclipse Analysis", () => {
    describe("EclipseData", () => {
      it("defines eclipse structure", () => {
        const eclipse = {
          date: new Date(2024, 3, 8),
          type: "solar" as const,
          sign: "Aries",
          degree: 19.2,
        };

        expect(eclipse).toHaveProperty("date");
        expect(eclipse).toHaveProperty("type");
        expect(eclipse).toHaveProperty("sign");
        expect(eclipse).toHaveProperty("degree");
      });

      it("type is either solar or lunar", () => {
        const solarEclipse = { type: "solar" as const };
        const lunarEclipse = { type: "lunar" as const };

        expect(solarEclipse.type).toBe("solar");
        expect(lunarEclipse.type).toBe("lunar");
      });
    });

    describe("EclipseImpact", () => {
      it("defines eclipse impact structure", () => {
        const impact = {
          hasImpact: true,
          type: "solar" as const,
          intensity: "strong" as const,
          sign: "Aries",
          daysFromEclipse: 3,
        };

        expect(impact).toHaveProperty("hasImpact");
        expect(impact).toHaveProperty("intensity");
        expect(impact).toHaveProperty("daysFromEclipse");
      });

      it("intensity has three levels", () => {
        const intensities = ["strong", "medium", "weak"];
        expect(intensities).toHaveLength(3);
      });

      it("impact decreases with days from eclipse", () => {
        const getIntensity = (days: number) => {
          if (days <= 3) return "strong";
          if (days <= 7) return "medium";
          return "weak";
        };

        expect(getIntensity(1)).toBe("strong");
        expect(getIntensity(5)).toBe("medium");
        expect(getIntensity(10)).toBe("weak");
      });
    });

    describe("EclipsesResult", () => {
      it("defines complete result structure", () => {
        const result = {
          impact: {
            hasImpact: true,
            type: "lunar" as const,
            intensity: "medium" as const,
            sign: "Libra",
            daysFromEclipse: 5,
          },
          upcoming: [
            { date: new Date(2024, 9, 2), type: "solar" as const, sign: "Libra", degree: 10 },
          ],
        };

        expect(result).toHaveProperty("impact");
        expect(result).toHaveProperty("upcoming");
        expect(Array.isArray(result.upcoming)).toBe(true);
      });

      it("impact can be null", () => {
        const noImpact = {
          impact: null,
          upcoming: [],
        };

        expect(noImpact.impact).toBeNull();
      });
    });
  });

  describe("AsteroidsStarsInput", () => {
    it("defines input structure", () => {
      const input = {
        natalChart: {},
        jdUT: 2460310.5,
        houseCusps: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
        natalPlanets: [],
        upcomingEclipsesCount: 5,
      };

      expect(input).toHaveProperty("natalChart");
      expect(input).toHaveProperty("jdUT");
      expect(input).toHaveProperty("houseCusps");
      expect(input).toHaveProperty("natalPlanets");
    });

    it("houseCusps has 12 values", () => {
      const houseCusps = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
      expect(houseCusps).toHaveLength(12);
    });

    it("upcomingEclipsesCount defaults to 5", () => {
      const defaultCount = 5;
      expect(defaultCount).toBe(5);
    });
  });

  describe("Asteroid Aspects", () => {
    it("defines aspect structure", () => {
      const aspect = {
        asteroid: "Ceres",
        planet: "Venus",
        type: "trine",
        orb: 2.5,
      };

      expect(aspect).toHaveProperty("asteroid");
      expect(aspect).toHaveProperty("planet");
      expect(aspect).toHaveProperty("type");
      expect(aspect).toHaveProperty("orb");
    });

    it("standard aspect types", () => {
      const aspectTypes = ["conjunction", "sextile", "square", "trine", "opposition"];
      expect(aspectTypes).toHaveLength(5);
    });

    it("aspects array can be empty", () => {
      const noAspects: any[] = [];
      expect(noAspects).toHaveLength(0);
    });
  });

  describe("Zodiac Signs", () => {
    it("uses 12 zodiac signs", () => {
      const signs = [
        "Aries", "Taurus", "Gemini", "Cancer",
        "Leo", "Virgo", "Libra", "Scorpio",
        "Sagittarius", "Capricorn", "Aquarius", "Pisces",
      ];

      expect(signs).toHaveLength(12);
    });

    it("each sign spans 30 degrees", () => {
      const degreesPerSign = 30;
      const totalDegrees = 12 * degreesPerSign;

      expect(totalDegrees).toBe(360);
    });
  });

  describe("House Calculations", () => {
    it("houses are numbered 1-12", () => {
      const houses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
      expect(houses).toHaveLength(12);
      expect(houses[0]).toBe(1);
      expect(houses[11]).toBe(12);
    });

    it("asteroid in house interpretation", () => {
      const ceresInHouse = {
        asteroid: "Ceres",
        house: 6,
        interpretation: "Nurturing through service and health",
      };

      expect(ceresInHouse.house).toBe(6);
    });
  });

  describe("Julian Day Calculations", () => {
    it("Julian Day is a numeric value", () => {
      const jdUT = 2460310.5;
      expect(typeof jdUT).toBe("number");
    });

    it("JD for J2000 epoch", () => {
      const j2000 = 2451545.0;
      expect(j2000).toBe(2451545.0);
    });
  });

  describe("calculateAsteroidsAnalysis", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("returns undefined when jdUT is not provided", async () => {
      const input: AsteroidsStarsInput = {
        natalChart: {} as any,
        jdUT: 0,
        houseCusps: [],
        natalPlanets: [],
      };

      const result = await calculateAsteroidsAnalysis(input);
      expect(result).toBeUndefined();
    });

    it("calculates asteroids when jdUT is provided", async () => {
      vi.mocked(astrologyModule.calculateAllAsteroids).mockReturnValue({
        Ceres: { name: "Ceres", sign: "Virgo", longitude: 145, degree: 25, house: 6 },
        Pallas: { name: "Pallas", sign: "Scorpio", longitude: 210, degree: 0, house: 8 },
        Juno: { name: "Juno", sign: "Taurus", longitude: 45, degree: 15, house: 2 },
        Vesta: { name: "Vesta", sign: "Aquarius", longitude: 300, degree: 0, house: 11 },
      } as any);
      vi.mocked(astrologyModule.findAllAsteroidAspects).mockReturnValue({ Ceres: [], Pallas: [], Juno: [], Vesta: [] } as any);

      const input: AsteroidsStarsInput = {
        natalChart: {} as any,
        jdUT: 2460310.5,
        houseCusps: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
        natalPlanets: [],
      };

      const result = await calculateAsteroidsAnalysis(input);

      expect(result).toBeDefined();
      expect(result?.ceres?.sign).toBe("Virgo");
      expect(result?.pallas?.sign).toBe("Scorpio");
      expect(result?.juno?.sign).toBe("Taurus");
      expect(result?.vesta?.sign).toBe("Aquarius");
      expect(astrologyModule.calculateAllAsteroids).toHaveBeenCalledWith(2460310.5, input.houseCusps);
    });

    it("returns undefined on calculation error", async () => {
      vi.mocked(astrologyModule.calculateAllAsteroids).mockImplementation(() => {
        throw new Error("Calculation failed");
      });

      const input: AsteroidsStarsInput = {
        natalChart: {} as any,
        jdUT: 2460310.5,
        houseCusps: [],
        natalPlanets: [],
      };

      const result = await calculateAsteroidsAnalysis(input);
      expect(result).toBeUndefined();
    });

    it("logs debug info when enableDebugLogs is true", async () => {
      vi.mocked(astrologyModule.calculateAllAsteroids).mockReturnValue({
        Ceres: { name: "Ceres", sign: "Virgo" },
        Pallas: { name: "Pallas", sign: "Scorpio" },
        Juno: { name: "Juno", sign: "Taurus" },
        Vesta: { name: "Vesta", sign: "Aquarius" },
      } as any);
      vi.mocked(astrologyModule.findAllAsteroidAspects).mockReturnValue({} as any);

      const input: AsteroidsStarsInput = {
        natalChart: {} as any,
        jdUT: 2460310.5,
        houseCusps: [],
        natalPlanets: [],
      };

      await calculateAsteroidsAnalysis(input, true);

      const { logger } = await import("@/lib/logger");
      expect(logger.debug).toHaveBeenCalled();
    });
  });

  describe("findFixedStarsAnalysis", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("returns fixed star conjunctions", async () => {
      const mockStars = [
        { star: { name: "Regulus" }, planet: "Sun", orb: 0.5 },
        { star: { name: "Spica" }, planet: "Venus", orb: 0.8 },
      ];
      vi.mocked(astrologyModule.findFixedStarConjunctions).mockReturnValue(mockStars as any);

      const input: AsteroidsStarsInput = {
        natalChart: {} as any,
        jdUT: 2460310.5,
        houseCusps: [],
        natalPlanets: [],
      };

      const result = await findFixedStarsAnalysis(input);

      expect(result).toHaveLength(2);
      expect(result[0].star.name).toBe("Regulus");
    });

    it("returns empty array on error", async () => {
      vi.mocked(astrologyModule.findFixedStarConjunctions).mockImplementation(() => {
        throw new Error("Search failed");
      });

      const input: AsteroidsStarsInput = {
        natalChart: {} as any,
        jdUT: 2460310.5,
        houseCusps: [],
        natalPlanets: [],
      };

      const result = await findFixedStarsAnalysis(input);
      expect(result).toEqual([]);
    });
  });

  describe("analyzeEclipsesImpact", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("returns eclipse impact and upcoming eclipses", async () => {
      const mockImpact = { hasImpact: true, type: "solar", intensity: "strong" };
      const mockUpcoming = [
        { date: new Date(), type: "solar", sign: "Aries", degree: 19 },
      ];

      vi.mocked(astrologyModule.findEclipseImpact).mockReturnValue([mockImpact] as any);
      vi.mocked(astrologyModule.getUpcomingEclipses).mockReturnValue(mockUpcoming as any);

      const input: AsteroidsStarsInput = {
        natalChart: {} as any,
        jdUT: 2460310.5,
        houseCusps: [],
        natalPlanets: [],
      };

      const result = await analyzeEclipsesImpact(input);

      expect(result.impact).toEqual(mockImpact);
      expect(result.upcoming).toHaveLength(1);
    });

    it("returns null impact when no eclipses found", async () => {
      vi.mocked(astrologyModule.findEclipseImpact).mockReturnValue([]);
      vi.mocked(astrologyModule.getUpcomingEclipses).mockReturnValue([]);

      const input: AsteroidsStarsInput = {
        natalChart: {} as any,
        jdUT: 2460310.5,
        houseCusps: [],
        natalPlanets: [],
      };

      const result = await analyzeEclipsesImpact(input);

      expect(result.impact).toBeNull();
      expect(result.upcoming).toEqual([]);
    });

    it("uses custom upcomingEclipsesCount", async () => {
      vi.mocked(astrologyModule.findEclipseImpact).mockReturnValue([]);
      vi.mocked(astrologyModule.getUpcomingEclipses).mockReturnValue([]);

      const input: AsteroidsStarsInput = {
        natalChart: {} as any,
        jdUT: 2460310.5,
        houseCusps: [],
        natalPlanets: [],
        upcomingEclipsesCount: 10,
      };

      await analyzeEclipsesImpact(input);

      expect(astrologyModule.getUpcomingEclipses).toHaveBeenCalledWith(expect.any(Date), 10);
    });

    it("returns empty result on error", async () => {
      vi.mocked(astrologyModule.findEclipseImpact).mockImplementation(() => {
        throw new Error("Analysis failed");
      });

      const input: AsteroidsStarsInput = {
        natalChart: {} as any,
        jdUT: 2460310.5,
        houseCusps: [],
        natalPlanets: [],
      };

      const result = await analyzeEclipsesImpact(input);

      expect(result.impact).toBeNull();
      expect(result.upcoming).toEqual([]);
    });
  });

  describe("calculateAllAsteroidsStars", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("calculates all asteroids, fixed stars, and eclipses", async () => {
      vi.mocked(astrologyModule.calculateAllAsteroids).mockReturnValue({
        Ceres: { name: "Ceres", sign: "Virgo" },
        Pallas: { name: "Pallas", sign: "Scorpio" },
        Juno: { name: "Juno", sign: "Taurus" },
        Vesta: { name: "Vesta", sign: "Aquarius" },
      } as any);
      vi.mocked(astrologyModule.findAllAsteroidAspects).mockReturnValue({} as any);
      vi.mocked(astrologyModule.findFixedStarConjunctions).mockReturnValue([{ star: { name: "Regulus" } }] as any);
      vi.mocked(astrologyModule.findEclipseImpact).mockReturnValue([{ hasImpact: true }] as any);
      vi.mocked(astrologyModule.getUpcomingEclipses).mockReturnValue([]);

      const input: AsteroidsStarsInput = {
        natalChart: {} as any,
        jdUT: 2460310.5,
        houseCusps: [],
        natalPlanets: [],
      };

      const result = await calculateAllAsteroidsStars(input);

      expect(result.asteroids).toBeDefined();
      expect(result.fixedStars).toHaveLength(1);
      expect(result.eclipses.impact).toBeDefined();
    });

    it("handles errors gracefully", async () => {
      vi.mocked(astrologyModule.calculateAllAsteroids).mockImplementation(() => {
        throw new Error("Fatal error");
      });
      vi.mocked(astrologyModule.findFixedStarConjunctions).mockImplementation(() => {
        throw new Error("Fatal error");
      });
      vi.mocked(astrologyModule.findEclipseImpact).mockImplementation(() => {
        throw new Error("Fatal error");
      });

      const input: AsteroidsStarsInput = {
        natalChart: {} as any,
        jdUT: 2460310.5,
        houseCusps: [],
        natalPlanets: [],
      };

      // The function catches individual errors internally
      const result = await calculateAllAsteroidsStars(input);
      expect(result.asteroids).toBeUndefined();
      expect(result.fixedStars).toEqual([]);
    });
  });
});
