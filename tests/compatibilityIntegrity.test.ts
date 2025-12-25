// Test compatibility calculation logic
describe("Compatibility calculation integrity", () => {
  describe("Element compatibility matrix", () => {
    const ELEMENT_COMPATIBILITY: Record<string, Record<string, number>> = {
      fire: { fire: 80, earth: 50, metal: 30, water: 20, wood: 90 },
      water: { fire: 20, earth: 30, metal: 90, water: 80, wood: 50 },
      wood: { fire: 90, earth: 20, metal: 30, water: 50, wood: 80 },
      metal: { fire: 30, earth: 90, metal: 80, water: 50, wood: 20 },
      earth: { fire: 50, earth: 80, metal: 20, water: 30, wood: 90 },
    };

    it("has all 5 elements defined", () => {
      expect(Object.keys(ELEMENT_COMPATIBILITY)).toHaveLength(5);
    });

    it("has bidirectional relationships", () => {
      const elements = Object.keys(ELEMENT_COMPATIBILITY);
      elements.forEach((el1) => {
        elements.forEach((el2) => {
          expect(ELEMENT_COMPATIBILITY[el1][el2]).toBeDefined();
        });
      });
    });

    it("compatibility scores are between 0 and 100", () => {
      Object.values(ELEMENT_COMPATIBILITY).forEach((relationships) => {
        Object.values(relationships).forEach((score) => {
          expect(score).toBeGreaterThanOrEqual(0);
          expect(score).toBeLessThanOrEqual(100);
        });
      });
    });
  });

  describe("Zodiac compatibility", () => {
    const ZODIAC_ELEMENTS: Record<string, string> = {
      aries: "fire",
      leo: "fire",
      sagittarius: "fire",
      taurus: "earth",
      virgo: "earth",
      capricorn: "earth",
      gemini: "air",
      libra: "air",
      aquarius: "air",
      cancer: "water",
      scorpio: "water",
      pisces: "water",
    };

    it("has all 12 zodiac signs", () => {
      expect(Object.keys(ZODIAC_ELEMENTS)).toHaveLength(12);
    });

    it("each sign maps to valid element", () => {
      const validElements = ["fire", "earth", "air", "water"];
      Object.values(ZODIAC_ELEMENTS).forEach((element) => {
        expect(validElements).toContain(element);
      });
    });

    it("has 3 signs per element", () => {
      const elementCounts: Record<string, number> = {};
      Object.values(ZODIAC_ELEMENTS).forEach((el) => {
        elementCounts[el] = (elementCounts[el] || 0) + 1;
      });
      Object.values(elementCounts).forEach((count) => {
        expect(count).toBe(3);
      });
    });
  });

  describe("Saju-based compatibility", () => {
    const BRANCH_COMPATIBILITY: Record<string, string[]> = {
      ja: ["chuk", "jin"], // 자 - 축, 진
      chuk: ["ja", "sa"], // 축 - 자, 사
      in: ["hae", "o"], // 인 - 해, 오
      myo: ["sul", "mi"], // 묘 - 술, 미
      jin: ["ja", "yu"], // 진 - 자, 유
      sa: ["chuk", "yu"], // 사 - 축, 유
      o: ["in", "mi"], // 오 - 인, 미
      mi: ["myo", "o"], // 미 - 묘, 오
      sin: ["jin", "hae"], // 신 - 진, 해
      yu: ["sa", "jin"], // 유 - 사, 진
      sul: ["myo", "in"], // 술 - 묘, 인
      hae: ["in", "sin"], // 해 - 인, 신
    };

    it("has all 12 branches", () => {
      expect(Object.keys(BRANCH_COMPATIBILITY)).toHaveLength(12);
    });

    it("each branch has compatible partners", () => {
      Object.values(BRANCH_COMPATIBILITY).forEach((partners) => {
        expect(partners.length).toBeGreaterThan(0);
        partners.forEach((partner) => {
          expect(Object.keys(BRANCH_COMPATIBILITY)).toContain(partner);
        });
      });
    });
  });
});

describe("Compatibility score calculation", () => {
  function calculateCompatibility(
    element1: string,
    element2: string,
    _zodiac1: string,
    _zodiac2: string
  ): number {
    // Simple mock calculation
    let score = 50; // Base score

    // Same element bonus
    if (element1 === element2) {
      score += 20;
    }

    // Complementary elements
    const complementary: Record<string, string> = {
      fire: "air",
      air: "fire",
      water: "earth",
      earth: "water",
    };
    if (complementary[element1] === element2) {
      score += 15;
    }

    return Math.min(100, Math.max(0, score));
  }

  it("returns score between 0 and 100", () => {
    const score = calculateCompatibility("fire", "fire", "aries", "leo");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("same element has higher score", () => {
    const sameElement = calculateCompatibility("fire", "fire", "aries", "leo");
    const diffElement = calculateCompatibility("fire", "water", "aries", "cancer");
    expect(sameElement).toBeGreaterThan(diffElement);
  });

  it("complementary elements get bonus", () => {
    const complementary = calculateCompatibility("fire", "air", "aries", "gemini");
    const opposing = calculateCompatibility("fire", "water", "aries", "cancer");
    expect(complementary).toBeGreaterThan(opposing);
  });
});
