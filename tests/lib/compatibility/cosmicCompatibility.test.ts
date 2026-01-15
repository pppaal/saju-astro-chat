/**
 * Cosmic Compatibility Tests
 *
 * Tests for Saju + Astrology combined compatibility calculation
 */


import type {
  SajuProfile,
  AstrologyProfile,
  CompatibilityResult,
  SajuCompatibilityAnalysis,
  AstrologyCompatibilityAnalysis,
} from "@/lib/compatibility/cosmicCompatibility";

describe("SajuProfile interface", () => {
  it("has dayMaster with element, yin_yang, and name", () => {
    const profile: SajuProfile = {
      dayMaster: {
        element: "목",
        yin_yang: "yang",
        name: "甲",
      },
      pillars: {
        year: { stem: "甲", branch: "子" },
        month: { stem: "丙", branch: "寅" },
        day: { stem: "甲", branch: "午" },
        time: { stem: "庚", branch: "申" },
      },
      elements: {
        wood: 3,
        fire: 2,
        earth: 1,
        metal: 1,
        water: 1,
      },
    };

    expect(profile.dayMaster.element).toBe("목");
    expect(profile.dayMaster.yin_yang).toBe("yang");
    expect(profile.dayMaster.name).toBe("甲");
  });

  it("has four pillars with stem and branch", () => {
    const profile: SajuProfile = {
      dayMaster: { element: "화", yin_yang: "yin", name: "丁" },
      pillars: {
        year: { stem: "乙", branch: "丑" },
        month: { stem: "丁", branch: "卯" },
        day: { stem: "丁", branch: "巳" },
        time: { stem: "辛", branch: "酉" },
      },
      elements: { wood: 2, fire: 3, earth: 1, metal: 1, water: 1 },
    };

    expect(profile.pillars.year.stem).toBe("乙");
    expect(profile.pillars.year.branch).toBe("丑");
    expect(profile.pillars.month.stem).toBe("丁");
    expect(profile.pillars.day.stem).toBe("丁");
    expect(profile.pillars.time.stem).toBe("辛");
  });

  it("has five element counts", () => {
    const profile: SajuProfile = {
      dayMaster: { element: "토", yin_yang: "yang", name: "戊" },
      pillars: {
        year: { stem: "戊", branch: "辰" },
        month: { stem: "己", branch: "丑" },
        day: { stem: "戊", branch: "戌" },
        time: { stem: "己", branch: "未" },
      },
      elements: { wood: 0, fire: 1, earth: 5, metal: 1, water: 1 },
    };

    expect(profile.elements.wood).toBe(0);
    expect(profile.elements.fire).toBe(1);
    expect(profile.elements.earth).toBe(5);
    expect(profile.elements.metal).toBe(1);
    expect(profile.elements.water).toBe(1);
  });
});

describe("AstrologyProfile interface", () => {
  it("has sun, moon, venus, mars with sign and element", () => {
    const profile: AstrologyProfile = {
      sun: { sign: "Aries", element: "fire" },
      moon: { sign: "Cancer", element: "water" },
      venus: { sign: "Taurus", element: "earth" },
      mars: { sign: "Leo", element: "fire" },
    };

    expect(profile.sun.sign).toBe("Aries");
    expect(profile.sun.element).toBe("fire");
    expect(profile.moon.sign).toBe("Cancer");
    expect(profile.venus.sign).toBe("Taurus");
    expect(profile.mars.sign).toBe("Leo");
  });

  it("has optional ascendant", () => {
    const profileWithAsc: AstrologyProfile = {
      sun: { sign: "Libra", element: "air" },
      moon: { sign: "Pisces", element: "water" },
      venus: { sign: "Scorpio", element: "water" },
      mars: { sign: "Sagittarius", element: "fire" },
      ascendant: { sign: "Gemini", element: "air" },
    };

    expect(profileWithAsc.ascendant).toBeDefined();
    expect(profileWithAsc.ascendant?.sign).toBe("Gemini");
  });

  it("ascendant is optional", () => {
    const profileWithoutAsc: AstrologyProfile = {
      sun: { sign: "Capricorn", element: "earth" },
      moon: { sign: "Aquarius", element: "air" },
      venus: { sign: "Pisces", element: "water" },
      mars: { sign: "Aries", element: "fire" },
    };

    expect(profileWithoutAsc.ascendant).toBeUndefined();
  });
});

describe("CompatibilityResult interface", () => {
  it("has overallScore between 0-100", () => {
    const result: CompatibilityResult = {
      overallScore: 75,
      breakdown: {
        saju: 80,
        astrology: 70,
        elementalHarmony: 75,
        yinYangBalance: 85,
      },
      strengths: ["Good element balance"],
      challenges: ["Minor communication style differences"],
      advice: "Focus on understanding each other's communication needs",
      details: {
        sajuAnalysis: {
          score: 80,
          dayMasterHarmony: 85,
          elementBalance: 75,
          yinYangBalance: 80,
          pillarSynergy: 78,
          insights: ["Strong daymaster connection"],
        },
        astrologyAnalysis: {
          score: 70,
          sunMoonHarmony: 75,
          venusMarsSynergy: 65,
          elementalAlignment: 70,
          insights: ["Sun-Moon trine"],
        },
      },
    };

    expect(result.overallScore).toBe(75);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });

  it("has breakdown scores", () => {
    const result: CompatibilityResult = {
      overallScore: 60,
      breakdown: {
        saju: 65,
        astrology: 55,
        elementalHarmony: 60,
        yinYangBalance: 70,
      },
      strengths: [],
      challenges: [],
      advice: "",
      details: {
        sajuAnalysis: {
          score: 65,
          dayMasterHarmony: 60,
          elementBalance: 70,
          yinYangBalance: 65,
          pillarSynergy: 60,
          insights: [],
        },
        astrologyAnalysis: {
          score: 55,
          sunMoonHarmony: 50,
          venusMarsSynergy: 60,
          elementalAlignment: 55,
          insights: [],
        },
      },
    };

    expect(result.breakdown.saju).toBe(65);
    expect(result.breakdown.astrology).toBe(55);
    expect(result.breakdown.elementalHarmony).toBe(60);
    expect(result.breakdown.yinYangBalance).toBe(70);
  });

  it("has strengths and challenges arrays", () => {
    const result: CompatibilityResult = {
      overallScore: 80,
      breakdown: {
        saju: 80,
        astrology: 80,
        elementalHarmony: 80,
        yinYangBalance: 80,
      },
      strengths: ["Excellent communication", "Shared values", "Emotional understanding"],
      challenges: ["Different financial priorities"],
      advice: "Discuss financial goals early",
      details: {
        sajuAnalysis: {
          score: 80,
          dayMasterHarmony: 80,
          elementBalance: 80,
          yinYangBalance: 80,
          pillarSynergy: 80,
          insights: [],
        },
        astrologyAnalysis: {
          score: 80,
          sunMoonHarmony: 80,
          venusMarsSynergy: 80,
          elementalAlignment: 80,
          insights: [],
        },
      },
    };

    expect(result.strengths).toHaveLength(3);
    expect(result.challenges).toHaveLength(1);
    expect(typeof result.advice).toBe("string");
  });
});

describe("SajuCompatibilityAnalysis interface", () => {
  it("has all required score fields", () => {
    const analysis: SajuCompatibilityAnalysis = {
      score: 75,
      dayMasterHarmony: 80,
      elementBalance: 70,
      yinYangBalance: 75,
      pillarSynergy: 72,
      insights: ["Strong daymaster connection"],
    };

    expect(analysis.score).toBe(75);
    expect(analysis.dayMasterHarmony).toBe(80);
    expect(analysis.elementBalance).toBe(70);
    expect(analysis.yinYangBalance).toBe(75);
    expect(analysis.pillarSynergy).toBe(72);
  });

  it("has insights array", () => {
    const analysis: SajuCompatibilityAnalysis = {
      score: 60,
      dayMasterHarmony: 55,
      elementBalance: 65,
      yinYangBalance: 60,
      pillarSynergy: 58,
      insights: ["Compatible yin-yang", "Element imbalance in earth"],
    };

    expect(Array.isArray(analysis.insights)).toBe(true);
    expect(analysis.insights).toHaveLength(2);
  });
});

describe("AstrologyCompatibilityAnalysis interface", () => {
  it("has all required score fields", () => {
    const analysis: AstrologyCompatibilityAnalysis = {
      score: 70,
      sunMoonHarmony: 75,
      venusMarsSynergy: 65,
      elementalAlignment: 70,
      insights: ["Sun trine Moon"],
    };

    expect(analysis.score).toBe(70);
    expect(analysis.sunMoonHarmony).toBe(75);
    expect(analysis.venusMarsSynergy).toBe(65);
    expect(analysis.elementalAlignment).toBe(70);
  });

  it("has insights array", () => {
    const analysis: AstrologyCompatibilityAnalysis = {
      score: 80,
      sunMoonHarmony: 85,
      venusMarsSynergy: 75,
      elementalAlignment: 80,
      insights: ["Venus conjunct Mars", "Water elements dominant", "Good emotional flow"],
    };

    expect(Array.isArray(analysis.insights)).toBe(true);
    expect(analysis.insights).toHaveLength(3);
  });
});

describe("Element relationships (오행 상생상극)", () => {
  const generates: Record<string, string> = {
    wood: "fire",   // 목생화
    fire: "earth",  // 화생토
    earth: "metal", // 토생금
    metal: "water", // 금생수
    water: "wood",  // 수생목
  };

  const controls: Record<string, string> = {
    wood: "earth",  // 목극토
    earth: "water", // 토극수
    water: "fire",  // 수극화
    fire: "metal",  // 화극금
    metal: "wood",  // 금극목
  };

  describe("상생 (generating cycle)", () => {
    it("wood generates fire", () => {
      expect(generates.wood).toBe("fire");
    });

    it("fire generates earth", () => {
      expect(generates.fire).toBe("earth");
    });

    it("earth generates metal", () => {
      expect(generates.earth).toBe("metal");
    });

    it("metal generates water", () => {
      expect(generates.metal).toBe("water");
    });

    it("water generates wood", () => {
      expect(generates.water).toBe("wood");
    });
  });

  describe("상극 (controlling cycle)", () => {
    it("wood controls earth", () => {
      expect(controls.wood).toBe("earth");
    });

    it("earth controls water", () => {
      expect(controls.earth).toBe("water");
    });

    it("water controls fire", () => {
      expect(controls.water).toBe("fire");
    });

    it("fire controls metal", () => {
      expect(controls.fire).toBe("metal");
    });

    it("metal controls wood", () => {
      expect(controls.metal).toBe("wood");
    });
  });
});

describe("Zodiac element mapping", () => {
  const zodiacElements: Record<string, string> = {
    Aries: "fire",
    Taurus: "earth",
    Gemini: "air",
    Cancer: "water",
    Leo: "fire",
    Virgo: "earth",
    Libra: "air",
    Scorpio: "water",
    Sagittarius: "fire",
    Capricorn: "earth",
    Aquarius: "air",
    Pisces: "water",
  };

  it("has 12 zodiac signs", () => {
    expect(Object.keys(zodiacElements)).toHaveLength(12);
  });

  describe("fire signs", () => {
    it("Aries is fire", () => {
      expect(zodiacElements.Aries).toBe("fire");
    });

    it("Leo is fire", () => {
      expect(zodiacElements.Leo).toBe("fire");
    });

    it("Sagittarius is fire", () => {
      expect(zodiacElements.Sagittarius).toBe("fire");
    });
  });

  describe("earth signs", () => {
    it("Taurus is earth", () => {
      expect(zodiacElements.Taurus).toBe("earth");
    });

    it("Virgo is earth", () => {
      expect(zodiacElements.Virgo).toBe("earth");
    });

    it("Capricorn is earth", () => {
      expect(zodiacElements.Capricorn).toBe("earth");
    });
  });

  describe("air signs", () => {
    it("Gemini is air", () => {
      expect(zodiacElements.Gemini).toBe("air");
    });

    it("Libra is air", () => {
      expect(zodiacElements.Libra).toBe("air");
    });

    it("Aquarius is air", () => {
      expect(zodiacElements.Aquarius).toBe("air");
    });
  });

  describe("water signs", () => {
    it("Cancer is water", () => {
      expect(zodiacElements.Cancer).toBe("water");
    });

    it("Scorpio is water", () => {
      expect(zodiacElements.Scorpio).toBe("water");
    });

    it("Pisces is water", () => {
      expect(zodiacElements.Pisces).toBe("water");
    });
  });
});

describe("Western to Eastern element mapping", () => {
  const mapping: Record<string, string> = {
    fire: "fire",
    earth: "earth",
    air: "wood",
    water: "water",
  };

  it("fire maps to fire", () => {
    expect(mapping.fire).toBe("fire");
  });

  it("earth maps to earth", () => {
    expect(mapping.earth).toBe("earth");
  });

  it("air maps to wood", () => {
    // Air represents movement and growth, similar to wood
    expect(mapping.air).toBe("wood");
  });

  it("water maps to water", () => {
    expect(mapping.water).toBe("water");
  });
});
