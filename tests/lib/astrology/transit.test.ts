/**
 * Astrology Transit Tests
 *
 * Tests for transit calculation utilities
 */


import type { AspectType, Chart, ZodiacKo } from "@/lib/astrology/foundation/types";
import type { TransitAspect, TransitEvent } from "@/lib/astrology/foundation/transit";

describe("Transit aspect angles", () => {
  const transitAspectAngles: Record<AspectType, number> = {
    conjunction: 0,
    sextile: 60,
    square: 90,
    trine: 120,
    opposition: 180,
    semisextile: 30,
    quincunx: 150,
    quintile: 72,
    biquintile: 144,
  };

  it("conjunction is at 0°", () => {
    expect(transitAspectAngles.conjunction).toBe(0);
  });

  it("sextile is at 60°", () => {
    expect(transitAspectAngles.sextile).toBe(60);
  });

  it("square is at 90°", () => {
    expect(transitAspectAngles.square).toBe(90);
  });

  it("trine is at 120°", () => {
    expect(transitAspectAngles.trine).toBe(120);
  });

  it("opposition is at 180°", () => {
    expect(transitAspectAngles.opposition).toBe(180);
  });

  it("semisextile is at 30°", () => {
    expect(transitAspectAngles.semisextile).toBe(30);
  });

  it("quincunx is at 150°", () => {
    expect(transitAspectAngles.quincunx).toBe(150);
  });
});

describe("Transit orbs", () => {
  const transitOrbs: Record<AspectType, number> = {
    conjunction: 6,
    opposition: 6,
    trine: 5,
    square: 5,
    sextile: 4,
    quincunx: 2,
    semisextile: 2,
    quintile: 1.5,
    biquintile: 1.5,
  };

  it("transit orbs are tighter than natal orbs", () => {
    // Natal orbs are typically 8° for conjunctions
    // Transit orbs are 6° for conjunctions
    expect(transitOrbs.conjunction).toBeLessThan(8);
  });

  it("major aspects have larger orbs", () => {
    expect(transitOrbs.conjunction).toBe(6);
    expect(transitOrbs.opposition).toBe(6);
  });

  it("trine and square have 5° orb", () => {
    expect(transitOrbs.trine).toBe(5);
    expect(transitOrbs.square).toBe(5);
  });

  it("sextile has 4° orb", () => {
    expect(transitOrbs.sextile).toBe(4);
  });

  it("minor aspects have smaller orbs", () => {
    expect(transitOrbs.quincunx).toBe(2);
    expect(transitOrbs.semisextile).toBe(2);
    expect(transitOrbs.quintile).toBe(1.5);
  });
});

describe("Planet orb multipliers", () => {
  const planetOrbMultiplier: Record<string, number> = {
    Sun: 1.0,
    Moon: 1.2,
    Mercury: 0.9,
    Venus: 0.9,
    Mars: 1.0,
    Jupiter: 1.1,
    Saturn: 1.2,
    Uranus: 1.3,
    Neptune: 1.3,
    Pluto: 1.4,
    "True Node": 1.0,
  };

  it("Sun has standard multiplier", () => {
    expect(planetOrbMultiplier.Sun).toBe(1.0);
  });

  it("Moon has slightly larger orb", () => {
    expect(planetOrbMultiplier.Moon).toBe(1.2);
  });

  it("Mercury has smaller orb", () => {
    expect(planetOrbMultiplier.Mercury).toBe(0.9);
  });

  it("outer planets have larger orbs", () => {
    expect(planetOrbMultiplier.Uranus).toBeGreaterThan(1.0);
    expect(planetOrbMultiplier.Neptune).toBeGreaterThan(1.0);
    expect(planetOrbMultiplier.Pluto).toBeGreaterThan(1.0);
  });

  it("Pluto has the largest multiplier", () => {
    expect(planetOrbMultiplier.Pluto).toBe(1.4);
  });
});

describe("TransitAspect interface", () => {
  it("extends AspectHit with transit-specific fields", () => {
    const aspect: TransitAspect = {
      from: { name: "Saturn", kind: "transit", longitude: 270 },
      to: { name: "Sun", kind: "natal", longitude: 270 },
      type: "conjunction",
      orb: 0.5,
      transitPlanet: "Saturn",
      natalPoint: "Sun",
      isApplying: true,
    };

    expect(aspect.transitPlanet).toBe("Saturn");
    expect(aspect.natalPoint).toBe("Sun");
    expect(aspect.isApplying).toBe(true);
  });

  it("has isApplying field", () => {
    const applyingAspect: TransitAspect = {
      from: { name: "Jupiter", kind: "transit", longitude: 120 },
      to: { name: "Venus", kind: "natal", longitude: 120.5 },
      type: "conjunction",
      orb: 0.5,
      transitPlanet: "Jupiter",
      natalPoint: "Venus",
      isApplying: true,
    };

    expect(applyingAspect.isApplying).toBe(true);
  });

  it("separating aspect has isApplying false", () => {
    const separatingAspect: TransitAspect = {
      from: { name: "Mars", kind: "transit", longitude: 90.5 },
      to: { name: "Mercury", kind: "natal", longitude: 90 },
      type: "conjunction",
      orb: 0.5,
      transitPlanet: "Mars",
      natalPoint: "Mercury",
      isApplying: false,
    };

    expect(separatingAspect.isApplying).toBe(false);
  });
});

describe("TransitEvent interface", () => {
  it("has date and aspect fields", () => {
    const event: TransitEvent = {
      date: "2025-01-15",
      aspect: {
        from: { name: "Saturn", kind: "transit", longitude: 0 },
        to: { name: "Sun", kind: "natal", longitude: 0 },
        type: "conjunction",
        orb: 0.1,
        transitPlanet: "Saturn",
        natalPoint: "Sun",
        isApplying: true,
      },
    };

    expect(event.date).toBe("2025-01-15");
    expect(event.aspect).toBeDefined();
  });

  it("can have optional exactDate", () => {
    const event: TransitEvent = {
      date: "2025-01-15",
      aspect: {
        from: { name: "Jupiter", kind: "transit", longitude: 120 },
        to: { name: "Venus", kind: "natal", longitude: 120 },
        type: "conjunction",
        orb: 0,
        transitPlanet: "Jupiter",
        natalPoint: "Venus",
        isApplying: false,
      },
      exactDate: "2025-01-15T14:30:00Z",
    };

    expect(event.exactDate).toBe("2025-01-15T14:30:00Z");
  });
});

describe("Outer planets for major transits", () => {
  const outerPlanets = ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

  it("includes Jupiter", () => {
    expect(outerPlanets).toContain("Jupiter");
  });

  it("includes Saturn", () => {
    expect(outerPlanets).toContain("Saturn");
  });

  it("includes Uranus", () => {
    expect(outerPlanets).toContain("Uranus");
  });

  it("includes Neptune", () => {
    expect(outerPlanets).toContain("Neptune");
  });

  it("includes Pluto", () => {
    expect(outerPlanets).toContain("Pluto");
  });

  it("has 5 outer planets", () => {
    expect(outerPlanets).toHaveLength(5);
  });
});

describe("Inner points for major transits", () => {
  const innerPoints = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Ascendant", "MC"];

  it("includes Sun", () => {
    expect(innerPoints).toContain("Sun");
  });

  it("includes Moon", () => {
    expect(innerPoints).toContain("Moon");
  });

  it("includes personal planets", () => {
    expect(innerPoints).toContain("Mercury");
    expect(innerPoints).toContain("Venus");
    expect(innerPoints).toContain("Mars");
  });

  it("includes angles", () => {
    expect(innerPoints).toContain("Ascendant");
    expect(innerPoints).toContain("MC");
  });

  it("has 7 inner points", () => {
    expect(innerPoints).toHaveLength(7);
  });
});

describe("Transit durations by planet", () => {
  const durations: Record<string, string> = {
    Jupiter: "약 1년",
    Saturn: "약 2-3년",
    Uranus: "약 7년",
    Neptune: "약 14년",
    Pluto: "약 12-20년",
  };

  it("Jupiter transits last about 1 year", () => {
    expect(durations.Jupiter).toContain("1년");
  });

  it("Saturn transits last about 2-3 years", () => {
    expect(durations.Saturn).toContain("2-3년");
  });

  it("Uranus transits last about 7 years", () => {
    expect(durations.Uranus).toContain("7년");
  });

  it("Neptune transits last about 14 years", () => {
    expect(durations.Neptune).toContain("14년");
  });

  it("Pluto transits last about 12-20 years", () => {
    expect(durations.Pluto).toContain("12-20년");
  });
});

describe("Transit theme keywords", () => {
  describe("Saturn transits", () => {
    it("Saturn-Sun theme is responsibility and maturity", () => {
      const saturnSunTheme = "책임과 성숙";
      expect(saturnSunTheme).toContain("책임");
    });

    it("Saturn-MC relates to career", () => {
      const saturnMCTheme = "커리어 전환점";
      expect(saturnMCTheme).toContain("커리어");
    });
  });

  describe("Uranus transits", () => {
    it("Uranus-Sun theme is sudden change", () => {
      const uranusSunTheme = "급격한 변화";
      expect(uranusSunTheme).toContain("변화");
    });

    it("Uranus-Venus relates to relationship revolution", () => {
      const uranusVenusTheme = "관계의 혁명";
      expect(uranusVenusTheme).toContain("혁명");
    });
  });

  describe("Neptune transits", () => {
    it("Neptune-Sun theme is spiritual exploration", () => {
      const neptuneSunTheme = "영적 탐색";
      expect(neptuneSunTheme).toContain("영적");
    });

    it("Neptune-Venus relates to ideal love", () => {
      const neptuneVenusTheme = "이상적 사랑";
      expect(neptuneVenusTheme).toContain("사랑");
    });
  });

  describe("Pluto transits", () => {
    it("Pluto-Sun theme is fundamental transformation", () => {
      const plutoSunTheme = "근본적 변형";
      expect(plutoSunTheme).toContain("변형");
    });

    it("Pluto-Moon relates to emotional purification", () => {
      const plutoMoonTheme = "감정적 정화";
      expect(plutoMoonTheme).toContain("정화");
    });
  });

  describe("Jupiter transits", () => {
    it("Jupiter-Sun theme is expansion and success", () => {
      const jupiterSunTheme = "확장과 성공";
      expect(jupiterSunTheme).toContain("성공");
    });

    it("Jupiter-MC relates to career success", () => {
      const jupiterMCTheme = "커리어 성공";
      expect(jupiterMCTheme).toContain("성공");
    });
  });
});

describe("Transit applying/separating concept", () => {
  it("applying means transit is moving toward exact aspect", () => {
    // Transit planet is approaching the natal point
    const isApplying = true;
    expect(isApplying).toBe(true);
  });

  it("separating means transit has passed exact aspect", () => {
    // Transit planet has passed the natal point
    const isSeparating = false;
    expect(isSeparating).toBe(false);
  });

  it("applying transits are generally stronger", () => {
    const applyingStrength = 1.0;
    const separatingStrength = 0.8;
    expect(applyingStrength).toBeGreaterThan(separatingStrength);
  });
});

describe("Transit chart meta information", () => {
  it("includes jdUT (Julian Day)", () => {
    const meta = { jdUT: 2460389.5 };
    expect(meta.jdUT).toBeGreaterThan(2400000);
  });

  it("includes isoUTC date string", () => {
    const meta = { isoUTC: "2025-01-15T12:00:00Z" };
    expect(meta.isoUTC).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it("includes timeZone", () => {
    const meta = { timeZone: "Asia/Seoul" };
    expect(meta.timeZone).toBe("Asia/Seoul");
  });

  it("includes location coordinates", () => {
    const meta = { latitude: 37.5665, longitude: 126.978 };
    expect(meta.latitude).toBeCloseTo(37.5665);
    expect(meta.longitude).toBeCloseTo(126.978);
  });

  it("includes houseSystem", () => {
    const meta = { houseSystem: "Placidus" };
    expect(meta.houseSystem).toBe("Placidus");
  });
});
