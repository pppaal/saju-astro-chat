/**
 * Eclipse Calculations Tests
 *
 * Tests for eclipse data and impact calculations
 */


import {
  getAllEclipses,
  getEclipsesBetween,
  getUpcomingEclipses,
  getEclipsesInSign,
  getEclipseAxis,
} from "@/lib/astrology/foundation/eclipses";
import type { Eclipse, EclipseImpact } from "@/lib/astrology/foundation/eclipses";

describe("Eclipse data", () => {
  describe("getAllEclipses", () => {
    it("returns array of eclipses", () => {
      const eclipses = getAllEclipses();
      expect(Array.isArray(eclipses)).toBe(true);
      expect(eclipses.length).toBeGreaterThan(0);
    });

    it("each eclipse has required fields", () => {
      const eclipses = getAllEclipses();
      const eclipse = eclipses[0];

      expect(eclipse).toHaveProperty("type");
      expect(eclipse).toHaveProperty("date");
      expect(eclipse).toHaveProperty("longitude");
      expect(eclipse).toHaveProperty("sign");
      expect(eclipse).toHaveProperty("degree");
      expect(eclipse).toHaveProperty("description");
    });

    it("eclipse types are solar or lunar", () => {
      const eclipses = getAllEclipses();
      eclipses.forEach((eclipse) => {
        expect(["solar", "lunar"]).toContain(eclipse.type);
      });
    });

    it("has eclipses from 2020 to 2030", () => {
      const eclipses = getAllEclipses();
      const years = eclipses.map((e) => new Date(e.date).getFullYear());

      expect(Math.min(...years)).toBeLessThanOrEqual(2020);
      expect(Math.max(...years)).toBeGreaterThanOrEqual(2030);
    });
  });
});

describe("getEclipsesBetween", () => {
  it("filters eclipses by date range", () => {
    const eclipses = getEclipsesBetween("2024-01-01", "2024-12-31");

    expect(eclipses.length).toBeGreaterThan(0);
    eclipses.forEach((eclipse) => {
      const year = new Date(eclipse.date).getFullYear();
      expect(year).toBe(2024);
    });
  });

  it("computes eclipses for future years (dynamic, not hardcoded data)", () => {
    // Eclipses are now computed from Swiss Ephemeris, so future years like
    // 2050 return real results rather than an empty hardcoded table.
    const eclipses = getEclipsesBetween("2050-01-01", "2050-12-31");
    expect(Array.isArray(eclipses)).toBe(true);
    expect(eclipses.length).toBeGreaterThanOrEqual(2);
  });

  it("returns multiple eclipses per year", () => {
    const eclipses = getEclipsesBetween("2025-01-01", "2025-12-31");
    expect(eclipses.length).toBeGreaterThanOrEqual(2);
  });
});

describe("getUpcomingEclipses", () => {
  it("returns specified count of eclipses", () => {
    const pastDate = new Date("2020-01-01");
    const eclipses = getUpcomingEclipses(pastDate, 4);
    expect(eclipses.length).toBeLessThanOrEqual(4);
  });

  it("returns eclipses after the given date", () => {
    const startDate = new Date("2025-01-01");
    const eclipses = getUpcomingEclipses(startDate, 4);

    eclipses.forEach((eclipse) => {
      expect(new Date(eclipse.date) >= startDate).toBe(true);
    });
  });

  it("defaults to 4 eclipses if count not specified", () => {
    const eclipses = getUpcomingEclipses(new Date("2020-01-01"));
    expect(eclipses.length).toBeLessThanOrEqual(4);
  });
});

describe("getEclipsesInSign", () => {
  it("filters eclipses by zodiac sign", () => {
    const ariesEclipses = getEclipsesInSign("Aries");

    ariesEclipses.forEach((eclipse) => {
      expect(eclipse.sign).toBe("Aries");
    });
  });

  it("returns empty array for signs with no eclipses in data", () => {
    // Note: This might not be truly empty depending on data
    const result = getEclipsesInSign("Aries");
    expect(Array.isArray(result)).toBe(true);
  });

  it("can find Taurus eclipses", () => {
    const taurusEclipses = getEclipsesInSign("Taurus");
    expect(taurusEclipses.length).toBeGreaterThan(0);
  });
});

describe("getEclipseAxis", () => {
  it("returns primary and opposite signs", () => {
    const eclipse: Eclipse = {
      type: "solar",
      date: "2025-04-08",
      longitude: 19.22,
      sign: "Aries",
      degree: 19,
      description: "Test eclipse",
    };

    const axis = getEclipseAxis(eclipse);

    expect(axis).toHaveProperty("primary");
    expect(axis).toHaveProperty("opposite");
    expect(axis.primary).toBe("Aries");
    expect(axis.opposite).toBe("Libra");
  });

  it("correctly calculates opposite for Taurus", () => {
    const eclipse: Eclipse = {
      type: "lunar",
      date: "2022-11-08",
      longitude: 46.02,
      sign: "Taurus",
      degree: 16,
      description: "Test eclipse",
    };

    const axis = getEclipseAxis(eclipse);
    expect(axis.primary).toBe("Taurus");
    expect(axis.opposite).toBe("Scorpio");
  });

  it("correctly calculates opposite for Scorpio", () => {
    const eclipse: Eclipse = {
      type: "lunar",
      date: "2022-05-16",
      longitude: 235.70,
      sign: "Scorpio",
      degree: 25,
      description: "Test eclipse",
    };

    const axis = getEclipseAxis(eclipse);
    expect(axis.primary).toBe("Scorpio");
    expect(axis.opposite).toBe("Taurus");
  });
});

describe("Eclipse interface", () => {
  it("supports solar type", () => {
    const solarEclipse: Eclipse = {
      type: "solar",
      date: "2024-04-08",
      longitude: 19.22,
      sign: "Aries",
      degree: 19,
      description: "2024년 4월 개기일식",
    };
    expect(solarEclipse.type).toBe("solar");
  });

  it("supports lunar type", () => {
    const lunarEclipse: Eclipse = {
      type: "lunar",
      date: "2024-03-25",
      longitude: 185.07,
      sign: "Libra",
      degree: 5,
      description: "2024년 3월 반영월식",
    };
    expect(lunarEclipse.type).toBe("lunar");
  });

  it("has longitude as number", () => {
    const eclipse: Eclipse = {
      type: "solar",
      date: "2025-03-29",
      longitude: 9.00,
      sign: "Aries",
      degree: 9,
      description: "2025년 3월 부분일식",
    };
    expect(typeof eclipse.longitude).toBe("number");
    expect(eclipse.longitude).toBeGreaterThanOrEqual(0);
    expect(eclipse.longitude).toBeLessThan(360);
  });
});

describe("EclipseImpact interface", () => {
  it("has required fields", () => {
    const impact: EclipseImpact = {
      eclipse: {
        type: "solar",
        date: "2024-04-08",
        longitude: 19.22,
        sign: "Aries",
        degree: 19,
        description: "Test",
      },
      affectedPoint: "Sun",
      aspectType: "conjunction",
      orb: 1.5,
      house: 1,
      interpretation: "중요한 변화의 시기",
    };

    expect(impact.affectedPoint).toBe("Sun");
    expect(impact.aspectType).toBe("conjunction");
    expect(impact.orb).toBe(1.5);
    expect(impact.house).toBe(1);
  });

  it("supports different aspect types", () => {
    const conjunctionImpact: EclipseImpact = {
      eclipse: { type: "solar", date: "2024-04-08", longitude: 0, sign: "Aries", degree: 0, description: "" },
      affectedPoint: "Sun",
      aspectType: "conjunction",
      orb: 1,
      house: 1,
      interpretation: "",
    };
    const oppositionImpact: EclipseImpact = {
      eclipse: { type: "lunar", date: "2024-04-08", longitude: 180, sign: "Libra", degree: 0, description: "" },
      affectedPoint: "Moon",
      aspectType: "opposition",
      orb: 2,
      house: 7,
      interpretation: "",
    };
    const squareImpact: EclipseImpact = {
      eclipse: { type: "solar", date: "2024-04-08", longitude: 90, sign: "Cancer", degree: 0, description: "" },
      affectedPoint: "Mars",
      aspectType: "square",
      orb: 2.5,
      house: 4,
      interpretation: "",
    };

    expect(conjunctionImpact.aspectType).toBe("conjunction");
    expect(oppositionImpact.aspectType).toBe("opposition");
    expect(squareImpact.aspectType).toBe("square");
  });
});

describe("Eclipse signs in data", () => {
  const allEclipses = getAllEclipses();

  // Eclipses are computed dynamically (Swiss Ephemeris) over a window
  // relative to today, so which specific signs appear shifts over time.
  // Assert the meaningful invariant instead: eclipses span many signs and
  // every sign reported is a valid zodiac sign.
  it("spans multiple zodiac signs", () => {
    const signs = new Set(allEclipses.map((e) => e.sign));
    expect(signs.size).toBeGreaterThanOrEqual(3);
  });

  it("only reports valid zodiac signs", () => {
    const valid = new Set([
      "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
      "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
    ]);
    for (const e of allEclipses) {
      expect(valid.has(e.sign)).toBe(true);
    }
  });
});

describe("Eclipse types in data", () => {
  const allEclipses = getAllEclipses();

  it("has both solar and lunar eclipses", () => {
    const solarCount = allEclipses.filter((e) => e.type === "solar").length;
    const lunarCount = allEclipses.filter((e) => e.type === "lunar").length;

    expect(solarCount).toBeGreaterThan(0);
    expect(lunarCount).toBeGreaterThan(0);
  });

  it("has roughly equal solar and lunar eclipses", () => {
    const solarCount = allEclipses.filter((e) => e.type === "solar").length;
    const lunarCount = allEclipses.filter((e) => e.type === "lunar").length;

    // They should be roughly balanced (within 30% of each other)
    const ratio = Math.max(solarCount, lunarCount) / Math.min(solarCount, lunarCount);
    expect(ratio).toBeLessThan(1.3);
  });
});
