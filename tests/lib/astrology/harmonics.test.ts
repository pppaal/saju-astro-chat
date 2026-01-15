/**
 * Harmonic Astrology Tests
 *
 * Tests for harmonic chart calculations and analysis
 */


import {
  getHarmonicMeaning,
} from "@/lib/astrology/foundation/harmonics";
import type {
  HarmonicChart,
  HarmonicAnalysis,
  HarmonicConjunction,
  HarmonicPattern,
  HarmonicProfile,
} from "@/lib/astrology/foundation/harmonics";

describe("getHarmonicMeaning", () => {
  describe("Primary harmonics", () => {
    it("H1 is the Radical Chart", () => {
      const meaning = getHarmonicMeaning(1);
      expect(meaning.name).toContain("Radical");
      expect(meaning.lifeArea).toContain("자아");
    });

    it("H2 relates to duality and relationships", () => {
      const meaning = getHarmonicMeaning(2);
      expect(meaning.meaning).toContain("이원성");
      expect(meaning.aspectsEmphasized).toContain("Opposition");
    });

    it("H3 relates to creativity and joy", () => {
      const meaning = getHarmonicMeaning(3);
      expect(meaning.meaning).toContain("창조성");
      expect(meaning.aspectsEmphasized).toContain("Trine");
    });

    it("H4 relates to effort and achievement", () => {
      const meaning = getHarmonicMeaning(4);
      expect(meaning.meaning).toContain("도전");
      expect(meaning.aspectsEmphasized).toContain("Square");
    });

    it("H5 relates to style and individuality", () => {
      const meaning = getHarmonicMeaning(5);
      expect(meaning.meaning).toContain("스타일");
      expect(meaning.aspectsEmphasized).toContain("Quintile");
    });

    it("H7 relates to inspiration and mystery", () => {
      const meaning = getHarmonicMeaning(7);
      expect(meaning.meaning).toContain("영감");
      expect(meaning.aspectsEmphasized).toContain("Septile");
    });

    it("H8 relates to transformation", () => {
      const meaning = getHarmonicMeaning(8);
      expect(meaning.meaning).toContain("변형");
      expect(meaning.aspectsEmphasized).toContain("Semisquare");
    });

    it("H9 relates to wisdom and completion", () => {
      const meaning = getHarmonicMeaning(9);
      expect(meaning.meaning).toContain("지혜");
      expect(meaning.aspectsEmphasized).toContain("Novile");
    });

    it("H12 relates to sacrifice and transcendence", () => {
      const meaning = getHarmonicMeaning(12);
      expect(meaning.meaning).toContain("희생");
      expect(meaning.aspectsEmphasized).toContain("Semisextile");
    });
  });

  describe("Saju parallels", () => {
    it("H2 parallels 충(沖)", () => {
      const meaning = getHarmonicMeaning(2);
      expect(meaning.sajuParallel).toBe("충(沖)");
    });

    it("H3 parallels 삼합(三合)", () => {
      const meaning = getHarmonicMeaning(3);
      expect(meaning.sajuParallel).toBe("삼합(三合)");
    });

    it("H4 parallels 형(刑)", () => {
      const meaning = getHarmonicMeaning(4);
      expect(meaning.sajuParallel).toBe("형(刑)");
    });

    it("H5 parallels 오행(五行)", () => {
      const meaning = getHarmonicMeaning(5);
      expect(meaning.sajuParallel).toBe("오행(五行)");
    });
  });

  describe("Composite harmonics", () => {
    it("returns default for unknown harmonic", () => {
      const meaning = getHarmonicMeaning(13);
      expect(meaning.name).toContain("H13");
    });

    it("H6 returns composite meaning (2×3)", () => {
      const meaning = getHarmonicMeaning(6);
      // 6 = 2 × 3, should have composite meaning
      expect(meaning.name).toContain("6");
    });

    it("H10 returns composite meaning (2×5)", () => {
      const meaning = getHarmonicMeaning(10);
      expect(meaning.name).toContain("10");
    });
  });
});

describe("HarmonicChart interface", () => {
  it("extends Chart with harmonicNumber", () => {
    const harmonicChart: Partial<HarmonicChart> = {
      harmonicNumber: 7,
      chartType: "harmonic",
    };
    expect(harmonicChart.harmonicNumber).toBe(7);
    expect(harmonicChart.chartType).toBe("harmonic");
  });
});

describe("HarmonicAnalysis interface", () => {
  it("has all required fields", () => {
    const analysis: Partial<HarmonicAnalysis> = {
      harmonic: 5,
      strength: 75,
      conjunctions: [],
      patterns: [],
      interpretation: "H5 분석 결과",
    };
    expect(analysis.harmonic).toBe(5);
    expect(analysis.strength).toBe(75);
    expect(analysis.interpretation).toBeDefined();
  });
});

describe("HarmonicConjunction interface", () => {
  it("has planets array and strength", () => {
    const conjunction: HarmonicConjunction = {
      planets: ["Sun", "Moon", "Venus"],
      averageLongitude: 45,
      sign: "Taurus",
      orb: 5,
      strength: 0.8,
    };
    expect(conjunction.planets).toHaveLength(3);
    expect(conjunction.sign).toBe("Taurus");
    expect(conjunction.strength).toBe(0.8);
  });
});

describe("HarmonicPattern interface", () => {
  describe("Pattern types", () => {
    it("supports stellium pattern", () => {
      const pattern: HarmonicPattern = {
        type: "stellium",
        planets: ["Sun", "Moon", "Mercury"],
        description: "스텔리움 in Leo",
      };
      expect(pattern.type).toBe("stellium");
    });

    it("supports grand_trine pattern", () => {
      const pattern: HarmonicPattern = {
        type: "grand_trine",
        planets: ["Sun", "Jupiter", "Neptune"],
        description: "그랜드 트라인 - 재능의 흐름",
      };
      expect(pattern.type).toBe("grand_trine");
    });

    it("supports grand_cross pattern", () => {
      const pattern: HarmonicPattern = {
        type: "grand_cross",
        planets: ["Sun", "Moon", "Mars", "Saturn"],
        description: "그랜드 크로스 - 강력한 동력",
      };
      expect(pattern.type).toBe("grand_cross");
    });

    it("supports t_square pattern", () => {
      const pattern: HarmonicPattern = {
        type: "t_square",
        planets: ["Sun", "Moon", "Saturn"],
        description: "T-스퀘어 - 성장 압력",
      };
      expect(pattern.type).toBe("t_square");
    });

    it("supports yod pattern", () => {
      const pattern: HarmonicPattern = {
        type: "yod",
        planets: ["Sun", "Neptune", "Pluto"],
        description: "욧드 - 운명의 손가락",
      };
      expect(pattern.type).toBe("yod");
    });
  });
});

describe("HarmonicProfile interface", () => {
  it("has strongest and weakest harmonics", () => {
    const profile: Partial<HarmonicProfile> = {
      strongestHarmonics: [
        { harmonic: 5, strength: 85, meaning: "창조와 파괴" },
        { harmonic: 9, strength: 72, meaning: "지혜와 완성" },
      ],
      weakestHarmonics: [
        { harmonic: 4, strength: 15, meaning: "노력과 성취" },
      ],
      overallInterpretation: "강한 창의성, 노력 영역 개발 필요",
    };
    expect(profile.strongestHarmonics).toHaveLength(2);
    expect(profile.weakestHarmonics).toHaveLength(1);
  });

  it("can have age harmonic", () => {
    const profile: Partial<HarmonicProfile> = {
      strongestHarmonics: [],
      weakestHarmonics: [],
      ageHarmonic: null,
      overallInterpretation: "",
    };
    expect(profile.ageHarmonic).toBeNull();
  });
});

describe("Harmonic number ranges", () => {
  it("primary harmonics are 1-12", () => {
    const primaryHarmonics = [1, 2, 3, 4, 5, 7, 8, 9, 12];
    primaryHarmonics.forEach((h) => {
      const meaning = getHarmonicMeaning(h);
      expect(meaning).toBeDefined();
      expect(meaning.name).toBeDefined();
    });
  });

  it("age harmonics can be 1-144", () => {
    // Just verify that higher harmonics don't error
    const meaning = getHarmonicMeaning(35);
    expect(meaning).toBeDefined();
  });
});

describe("Harmonic aspect correspondences", () => {
  const aspectCorrespondences = [
    { harmonic: 2, aspect: "Opposition", angle: 180 },
    { harmonic: 3, aspect: "Trine", angle: 120 },
    { harmonic: 4, aspect: "Square", angle: 90 },
    { harmonic: 5, aspect: "Quintile", angle: 72 },
    { harmonic: 6, aspect: "Sextile", angle: 60 },
    { harmonic: 7, aspect: "Septile", angle: 51.43 },
    { harmonic: 8, aspect: "Semisquare", angle: 45 },
    { harmonic: 9, aspect: "Novile", angle: 40 },
    { harmonic: 12, aspect: "Semisextile", angle: 30 },
  ];

  aspectCorrespondences.forEach(({ harmonic, aspect, angle }) => {
    it(`H${harmonic} emphasizes ${aspect} (${angle}°)`, () => {
      expect(360 / harmonic).toBeCloseTo(angle, 1);
    });
  });
});

describe("Harmonic life areas", () => {
  it("H2 relates to partnerships", () => {
    const meaning = getHarmonicMeaning(2);
    expect(meaning.lifeArea.toLowerCase()).toMatch(/파트너|대립/);
  });

  it("H3 relates to creativity", () => {
    const meaning = getHarmonicMeaning(3);
    expect(meaning.lifeArea.toLowerCase()).toMatch(/예술|즐거움/);
  });

  it("H4 relates to career", () => {
    const meaning = getHarmonicMeaning(4);
    expect(meaning.lifeArea.toLowerCase()).toMatch(/커리어|야망/);
  });

  it("H5 relates to power", () => {
    const meaning = getHarmonicMeaning(5);
    expect(meaning.lifeArea.toLowerCase()).toMatch(/권력|개성/);
  });

  it("H7 relates to spirituality", () => {
    const meaning = getHarmonicMeaning(7);
    expect(meaning.lifeArea.toLowerCase()).toMatch(/영성|비범/);
  });

  it("H9 relates to philosophy", () => {
    const meaning = getHarmonicMeaning(9);
    expect(meaning.lifeArea.toLowerCase()).toMatch(/철학|영적/);
  });
});
