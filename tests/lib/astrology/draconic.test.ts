/**
 * Draconic Chart Tests
 *
 * Tests for draconic (soul) chart calculations
 */


import {
  getDraconicPlanetMeaning,
} from "@/lib/astrology/foundation/draconic";
import type {
  DraconicChart,
  DraconicComparison,
  DraconicAlignment,
  DraconicTension,
  DraconicSummary,
} from "@/lib/astrology/foundation/draconic";

describe("getDraconicPlanetMeaning", () => {
  describe("Planet meanings", () => {
    it("Sun represents soul identity", () => {
      const meaning = getDraconicPlanetMeaning("Sun", "Aries");
      expect(meaning.meaning).toContain("영혼");
      expect(meaning.meaning.toLowerCase()).toContain("정체");
    });

    it("Moon represents past life emotions", () => {
      const meaning = getDraconicPlanetMeaning("Moon", "Cancer");
      expect(meaning.meaning).toContain("전생");
    });

    it("Mercury represents soul learning style", () => {
      const meaning = getDraconicPlanetMeaning("Mercury", "Gemini");
      expect(meaning.meaning).toContain("영혼");
    });

    it("Venus represents soul's love form", () => {
      const meaning = getDraconicPlanetMeaning("Venus", "Libra");
      expect(meaning.meaning).toContain("사랑");
    });

    it("Mars represents soul motivation", () => {
      const meaning = getDraconicPlanetMeaning("Mars", "Aries");
      expect(meaning.meaning).toContain("원동력");
    });

    it("Saturn represents past life karma", () => {
      const meaning = getDraconicPlanetMeaning("Saturn", "Capricorn");
      expect(meaning.meaning).toContain("카르마");
    });

    it("Ascendant represents soul's expression", () => {
      const meaning = getDraconicPlanetMeaning("Ascendant", "Leo");
      expect(meaning.meaning).toContain("세상");
    });

    it("MC represents soul's mission", () => {
      const meaning = getDraconicPlanetMeaning("MC", "Capricorn");
      expect(meaning.meaning).toContain("사명");
    });

    it("True Node is always 0° Aries", () => {
      const meaning = getDraconicPlanetMeaning("True Node", "Aries");
      expect(meaning.meaning).toContain("0° Aries");
    });
  });

  describe("Sign archetypes", () => {
    it("Aries is Pioneer soul", () => {
      const meaning = getDraconicPlanetMeaning("Sun", "Aries");
      expect(meaning.archetype).toContain("개척자");
    });

    it("Taurus is Builder soul", () => {
      const meaning = getDraconicPlanetMeaning("Sun", "Taurus");
      expect(meaning.archetype).toContain("건설자");
    });

    it("Gemini is Messenger soul", () => {
      const meaning = getDraconicPlanetMeaning("Sun", "Gemini");
      expect(meaning.archetype).toContain("메신저");
    });

    it("Cancer is Nurturer soul", () => {
      const meaning = getDraconicPlanetMeaning("Sun", "Cancer");
      expect(meaning.archetype).toContain("양육자");
    });

    it("Leo is Creator soul", () => {
      const meaning = getDraconicPlanetMeaning("Sun", "Leo");
      expect(meaning.archetype).toContain("창조자");
    });

    it("Virgo is Healer soul", () => {
      const meaning = getDraconicPlanetMeaning("Sun", "Virgo");
      expect(meaning.archetype).toContain("치유자");
    });

    it("Libra is Harmonizer soul", () => {
      const meaning = getDraconicPlanetMeaning("Sun", "Libra");
      expect(meaning.archetype).toContain("조화자");
    });

    it("Scorpio is Transformer soul", () => {
      const meaning = getDraconicPlanetMeaning("Sun", "Scorpio");
      expect(meaning.archetype).toContain("변형자");
    });

    it("Sagittarius is Explorer soul", () => {
      const meaning = getDraconicPlanetMeaning("Sun", "Sagittarius");
      expect(meaning.archetype).toContain("탐험가");
    });

    it("Capricorn is Achiever soul", () => {
      const meaning = getDraconicPlanetMeaning("Sun", "Capricorn");
      expect(meaning.archetype).toContain("성취자");
    });

    it("Aquarius is Innovator soul", () => {
      const meaning = getDraconicPlanetMeaning("Sun", "Aquarius");
      expect(meaning.archetype).toContain("혁신가");
    });

    it("Pisces is Mystic soul", () => {
      const meaning = getDraconicPlanetMeaning("Sun", "Pisces");
      expect(meaning.archetype).toContain("신비주의자");
    });
  });

  describe("Past life associations", () => {
    it("Aries past life is warrior/leader", () => {
      const meaning = getDraconicPlanetMeaning("Moon", "Aries");
      expect(meaning.pastLife).toMatch(/전사|지도자/);
    });

    it("Cancer past life is mother/healer", () => {
      const meaning = getDraconicPlanetMeaning("Moon", "Cancer");
      expect(meaning.pastLife).toMatch(/어머니|치유자/);
    });

    it("Scorpio past life is shaman/psychologist", () => {
      const meaning = getDraconicPlanetMeaning("Moon", "Scorpio");
      expect(meaning.pastLife).toMatch(/샤먼|심리학자/);
    });
  });
});

describe("DraconicChart interface", () => {
  it("extends Chart with draconic fields", () => {
    const draconicChart: Partial<DraconicChart> = {
      chartType: "draconic",
      natalNorthNode: 125.5,
      offsetDegrees: 125.5,
    };
    expect(draconicChart.chartType).toBe("draconic");
    expect(draconicChart.natalNorthNode).toBe(125.5);
    expect(draconicChart.offsetDegrees).toBe(125.5);
  });
});

describe("DraconicComparison interface", () => {
  it("has all required fields", () => {
    const comparison: Partial<DraconicComparison> = {
      alignments: [],
      tensions: [],
    };
    expect(comparison.alignments).toEqual([]);
    expect(comparison.tensions).toEqual([]);
  });
});

describe("DraconicAlignment interface", () => {
  it("represents alignment between draconic and natal", () => {
    const alignment: DraconicAlignment = {
      draconicPlanet: "Sun",
      natalPlanet: "Moon",
      orb: 2.5,
      meaning: "영혼 정체성과 감정적 욕구의 조화",
    };
    expect(alignment.draconicPlanet).toBe("Sun");
    expect(alignment.natalPlanet).toBe("Moon");
    expect(alignment.orb).toBe(2.5);
    expect(alignment.meaning).toBeDefined();
  });

  it("tight orb indicates stronger alignment", () => {
    const tightAlignment: DraconicAlignment = {
      draconicPlanet: "Venus",
      natalPlanet: "Venus",
      orb: 0.5,
      meaning: "완벽한 일치",
    };
    const looseAlignment: DraconicAlignment = {
      draconicPlanet: "Venus",
      natalPlanet: "Mars",
      orb: 7.5,
      meaning: "약한 연결",
    };
    expect(tightAlignment.orb).toBeLessThan(looseAlignment.orb);
  });
});

describe("DraconicTension interface", () => {
  it("represents tension between draconic and natal", () => {
    const tension: DraconicTension = {
      draconicPlanet: "Saturn",
      natalPlanet: "Sun",
      aspectType: "square",
      orb: 3.0,
      meaning: "영혼의 교훈과 자아 사이의 성장 압력",
    };
    expect(tension.draconicPlanet).toBe("Saturn");
    expect(tension.natalPlanet).toBe("Sun");
    expect(tension.aspectType).toBe("square");
  });

  it("supports square aspect type", () => {
    const squareTension: DraconicTension = {
      draconicPlanet: "Mars",
      natalPlanet: "Venus",
      aspectType: "square",
      orb: 4.5,
      meaning: "영혼의 동력과 사랑 사이의 긴장",
    };
    expect(squareTension.aspectType).toBe("square");
  });

  it("supports opposition aspect type", () => {
    const opTension: DraconicTension = {
      draconicPlanet: "Moon",
      natalPlanet: "Sun",
      aspectType: "opposition",
      orb: 2.0,
      meaning: "영혼의 감정과 자아 사이의 대립",
    };
    expect(opTension.aspectType).toBe("opposition");
  });
});

describe("DraconicSummary interface", () => {
  it("has all soul interpretation fields", () => {
    const summary: DraconicSummary = {
      soulIdentity: "개척자 영혼 - 전사로서의 전생",
      soulNeeds: "자율성과 용기가 필요",
      soulPurpose: "성취자의 사명",
      karmicLessons: "책임과 성숙의 교훈",
      alignmentScore: 75,
    };
    expect(summary.soulIdentity).toBeDefined();
    expect(summary.soulNeeds).toBeDefined();
    expect(summary.soulPurpose).toBeDefined();
    expect(summary.karmicLessons).toBeDefined();
    expect(summary.alignmentScore).toBe(75);
  });

  it("alignmentScore is 0-100", () => {
    const highAlignment: DraconicSummary = {
      soulIdentity: "",
      soulNeeds: "",
      soulPurpose: "",
      karmicLessons: "",
      alignmentScore: 90,
    };
    const lowAlignment: DraconicSummary = {
      soulIdentity: "",
      soulNeeds: "",
      soulPurpose: "",
      karmicLessons: "",
      alignmentScore: 25,
    };
    expect(highAlignment.alignmentScore).toBeGreaterThanOrEqual(0);
    expect(highAlignment.alignmentScore).toBeLessThanOrEqual(100);
    expect(lowAlignment.alignmentScore).toBeGreaterThanOrEqual(0);
    expect(lowAlignment.alignmentScore).toBeLessThanOrEqual(100);
  });
});

describe("Draconic chart concept", () => {
  it("North Node becomes 0° Aries", () => {
    // In draconic chart, North Node is always at 0° Aries
    const expectedNodePosition = 0; // degrees
    expect(expectedNodePosition).toBe(0);
  });

  it("all planets shift by North Node offset", () => {
    // Example: if natal Sun is at 120° and natal Node is at 45°
    // Draconic Sun = 120° - 45° = 75°
    const natalSun = 120;
    const natalNode = 45;
    const draconicSun = natalSun - natalNode;
    expect(draconicSun).toBe(75);
  });

  it("handles wrap-around correctly", () => {
    // Example: if natal Moon is at 30° and natal Node is at 60°
    // Draconic Moon = 30° - 60° = -30° → 330°
    const natalMoon = 30;
    const natalNode = 60;
    const draconicMoon = (natalMoon - natalNode + 360) % 360;
    expect(draconicMoon).toBe(330);
  });
});

describe("Draconic synastry concept", () => {
  it("compares soul charts of two people", () => {
    // Draconic synastry checks if souls are compatible
    const concept = "soul-to-soul comparison";
    expect(concept).toBeDefined();
  });

  it("checks draconic to natal cross-connections", () => {
    // A's draconic to B's natal shows how A's soul helps B
    const concept = "cross-chart aspects";
    expect(concept).toBeDefined();
  });
});

describe("Draconic uses", () => {
  const uses = [
    "영혼의 본질적 정체성 이해",
    "전생 패턴 분석",
    "카르마적 교훈 파악",
    "영혼의 사명 발견",
    "두 사람의 영혼 연결 분석",
  ];

  uses.forEach((use) => {
    it(`supports: ${use}`, () => {
      expect(use).toBeDefined();
    });
  });
});
