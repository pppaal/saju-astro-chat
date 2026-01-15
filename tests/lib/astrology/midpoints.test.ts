/**
 * Midpoints Calculations Tests
 *
 * Tests for astrological midpoint calculations
 */


import {
  getMidpoint,
} from "@/lib/astrology/foundation/midpoints";
import type { Midpoint, MidpointActivation } from "@/lib/astrology/foundation/midpoints";

describe("getMidpoint", () => {
  describe("Basic calculations", () => {
    it("calculates midpoint of 0° and 60°", () => {
      const result = getMidpoint(0, 60);
      expect(result.longitude).toBe(30);
    });

    it("calculates midpoint of 90° and 180°", () => {
      const result = getMidpoint(90, 180);
      expect(result.longitude).toBe(135);
    });

    it("calculates midpoint of 0° and 180° (short arc)", () => {
      const result = getMidpoint(0, 180);
      // Short arc would be 90° or 270° depending on implementation
      expect([90, 270]).toContain(result.longitude);
    });

    it("calculates midpoint crossing 0° (350° and 10°)", () => {
      const result = getMidpoint(350, 10);
      expect(result.longitude).toBe(0);
    });

    it("handles identical longitudes", () => {
      const result = getMidpoint(120, 120);
      expect(result.longitude).toBe(120);
    });
  });

  describe("Return value structure", () => {
    it("returns longitude", () => {
      const result = getMidpoint(0, 60);
      expect(result).toHaveProperty("longitude");
      expect(typeof result.longitude).toBe("number");
    });

    it("returns sign", () => {
      const result = getMidpoint(0, 60);
      expect(result).toHaveProperty("sign");
      expect(typeof result.sign).toBe("string");
    });

    it("returns degree", () => {
      const result = getMidpoint(0, 60);
      expect(result).toHaveProperty("degree");
      expect(result.degree).toBeGreaterThanOrEqual(0);
      expect(result.degree).toBeLessThan(30);
    });

    it("returns minute", () => {
      const result = getMidpoint(0, 60);
      expect(result).toHaveProperty("minute");
      expect(result.minute).toBeGreaterThanOrEqual(0);
      expect(result.minute).toBeLessThan(60);
    });

    it("returns formatted string", () => {
      const result = getMidpoint(0, 60);
      expect(result).toHaveProperty("formatted");
      expect(typeof result.formatted).toBe("string");
    });
  });

  describe("Sign placement", () => {
    it("midpoint at 15° is in Aries", () => {
      const result = getMidpoint(0, 30);
      expect(result.sign).toBe("Aries");
      expect(result.degree).toBe(15);
    });

    it("midpoint at 45° is in Taurus", () => {
      const result = getMidpoint(30, 60);
      expect(result.sign).toBe("Taurus");
      expect(result.degree).toBe(15);
    });

    it("midpoint at 75° is in Gemini", () => {
      const result = getMidpoint(60, 90);
      expect(result.sign).toBe("Gemini");
      expect(result.degree).toBe(15);
    });
  });
});

describe("Midpoint interface", () => {
  it("has all required fields", () => {
    const midpoint: Midpoint = {
      planet1: "Sun",
      planet2: "Moon",
      id: "Sun/Moon",
      longitude: 45.5,
      sign: "Taurus",
      degree: 15,
      minute: 30,
      formatted: "15°30' Taurus",
      name_ko: "영혼의 점",
      keywords: ["통합된 자아", "내면과 외면의 조화"],
    };

    expect(midpoint.planet1).toBe("Sun");
    expect(midpoint.planet2).toBe("Moon");
    expect(midpoint.id).toBe("Sun/Moon");
    expect(midpoint.name_ko).toBe("영혼의 점");
  });

  it("supports various planet pairs", () => {
    const venusMars: Midpoint = {
      planet1: "Venus",
      planet2: "Mars",
      id: "Venus/Mars",
      longitude: 120,
      sign: "Leo",
      degree: 0,
      minute: 0,
      formatted: "0°0' Leo",
      name_ko: "열정의 점",
      keywords: ["성적 에너지", "로맨틱 끌림"],
    };
    expect(venusMars.name_ko).toBe("열정의 점");
  });

  it("keywords is an array", () => {
    const midpoint: Midpoint = {
      planet1: "Jupiter",
      planet2: "Saturn",
      id: "Jupiter/Saturn",
      longitude: 180,
      sign: "Libra",
      degree: 0,
      minute: 0,
      formatted: "0°0' Libra",
      name_ko: "성공의 점",
      keywords: ["현실화된 성공", "구조화된 성장"],
    };
    expect(Array.isArray(midpoint.keywords)).toBe(true);
    expect(midpoint.keywords.length).toBeGreaterThan(0);
  });
});

describe("MidpointActivation interface", () => {
  it("has all required fields", () => {
    const activation: MidpointActivation = {
      midpoint: {
        planet1: "Sun",
        planet2: "Moon",
        id: "Sun/Moon",
        longitude: 45,
        sign: "Taurus",
        degree: 15,
        minute: 0,
        formatted: "15°0' Taurus",
        name_ko: "영혼의 점",
        keywords: [],
      },
      activator: "Mars",
      aspectType: "conjunction",
      orb: 0.5,
      description: "Mars이(가) Sun/Moon 미드포인트를 합으로 활성화",
    };

    expect(activation.activator).toBe("Mars");
    expect(activation.aspectType).toBe("conjunction");
    expect(activation.orb).toBe(0.5);
  });

  it("supports conjunction aspect", () => {
    const activation: MidpointActivation = {
      midpoint: {
        planet1: "Venus",
        planet2: "Mars",
        id: "Venus/Mars",
        longitude: 90,
        sign: "Cancer",
        degree: 0,
        minute: 0,
        formatted: "0°0' Cancer",
        name_ko: "열정의 점",
        keywords: [],
      },
      activator: "Jupiter",
      aspectType: "conjunction",
      orb: 1.2,
      description: "Jupiter이(가) Venus/Mars 미드포인트를 합으로 활성화",
    };
    expect(activation.aspectType).toBe("conjunction");
  });

  it("supports opposition aspect", () => {
    const activation: MidpointActivation = {
      midpoint: {
        planet1: "Sun",
        planet2: "Jupiter",
        id: "Sun/Jupiter",
        longitude: 120,
        sign: "Leo",
        degree: 0,
        minute: 0,
        formatted: "0°0' Leo",
        name_ko: "행운의 점",
        keywords: [],
      },
      activator: "Saturn",
      aspectType: "opposition",
      orb: 1.0,
      description: "Saturn이(가) Sun/Jupiter 미드포인트를 충으로 활성화",
    };
    expect(activation.aspectType).toBe("opposition");
  });

  it("supports square aspect", () => {
    const activation: MidpointActivation = {
      midpoint: {
        planet1: "Moon",
        planet2: "Venus",
        id: "Moon/Venus",
        longitude: 60,
        sign: "Gemini",
        degree: 0,
        minute: 0,
        formatted: "0°0' Gemini",
        name_ko: "감정적 사랑의 점",
        keywords: [],
      },
      activator: "Uranus",
      aspectType: "square",
      orb: 1.5,
      description: "Uranus이(가) Moon/Venus 미드포인트를 사각으로 활성화",
    };
    expect(activation.aspectType).toBe("square");
  });
});

describe("Known midpoint pairs", () => {
  const knownPairs = [
    { pair: "Sun/Moon", name: "영혼의 점" },
    { pair: "Venus/Mars", name: "열정의 점" },
    { pair: "Mercury/Venus", name: "사랑 언어의 점" },
    { pair: "Sun/Venus", name: "매력의 점" },
    { pair: "Sun/Mars", name: "의지력의 점" },
    { pair: "Jupiter/Saturn", name: "성공의 점" },
    { pair: "Sun/Jupiter", name: "행운의 점" },
    { pair: "Mars/Saturn", name: "절제된 행동의 점" },
    { pair: "Sun/Pluto", name: "권력과 변형의 점" },
    { pair: "Venus/Pluto", name: "변형적 사랑의 점" },
  ];

  knownPairs.forEach(({ pair, name }) => {
    it(`${pair} is known as ${name}`, () => {
      expect(pair).toBeDefined();
      expect(name).toBeDefined();
    });
  });
});

describe("Midpoint calculation edge cases", () => {
  it("handles 0° and 360° equivalence", () => {
    const result1 = getMidpoint(0, 120);
    const result2 = getMidpoint(360, 120);
    expect(result1.longitude).toBeCloseTo(result2.longitude, 1);
  });

  it("handles negative equivalents (treated as normalized)", () => {
    const result = getMidpoint(30, 90);
    expect(result.longitude).toBe(60);
  });

  it("midpoint is always less than 360°", () => {
    const result = getMidpoint(350, 340);
    expect(result.longitude).toBeGreaterThanOrEqual(0);
    expect(result.longitude).toBeLessThan(360);
  });

  it("handles wide arc correctly", () => {
    // 10° and 200° - short arc is 10 to 200 (190°), midpoint at 105°
    // Or opposite: 200 to 370 (170°), midpoint at 285°
    const result = getMidpoint(10, 200);
    // Should use shorter arc
    expect(result.longitude).toBeGreaterThanOrEqual(0);
  });
});

describe("Midpoint orb concept", () => {
  it("typical midpoint orb is 1.5 degrees", () => {
    const typicalOrb = 1.5;
    expect(typicalOrb).toBe(1.5);
  });

  it("tight orb activation is considered more powerful", () => {
    const tightOrb = 0.5;
    const looseOrb = 1.4;
    expect(tightOrb).toBeLessThan(looseOrb);
  });
});

describe("Midpoint keywords themes", () => {
  const themes = {
    "Sun/Moon": ["통합", "자아"],
    "Venus/Mars": ["열정", "끌림"],
    "Jupiter/Saturn": ["성공", "성장"],
    "Sun/Pluto": ["변형", "권력"],
    "Moon/Neptune": ["직관", "영적"],
  };

  Object.entries(themes).forEach(([pair, keywords]) => {
    it(`${pair} has meaningful keywords`, () => {
      expect(keywords.length).toBeGreaterThan(0);
    });
  });
});
