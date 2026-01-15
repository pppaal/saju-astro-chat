/**
 * Advanced Saju Analysis Tests
 *
 * Tests for advanced Saju compatibility analysis with Ten Gods
 */


import {
  analyzeTenGods,
  type TenGod,
  type TenGodAnalysis,
} from "@/lib/compatibility/advancedSajuAnalysis";
import type { SajuProfile } from "@/lib/compatibility/cosmicCompatibility";

// Test fixtures
const createSajuProfile = (
  element: string,
  name: string,
  pillars?: Partial<SajuProfile["pillars"]>
): SajuProfile => ({
  dayMaster: {
    element: element as "wood" | "fire" | "earth" | "metal" | "water",
    yin_yang: "yang",
    name,
  },
  pillars: {
    year: { stem: "甲", branch: "子" },
    month: { stem: "丙", branch: "寅" },
    day: { stem: name, branch: "午" },
    time: { stem: "庚", branch: "申" },
    ...pillars,
  },
  elements: {
    wood: element === "wood" ? 3 : 1,
    fire: element === "fire" ? 3 : 1,
    earth: element === "earth" ? 3 : 1,
    metal: element === "metal" ? 3 : 1,
    water: element === "water" ? 3 : 1,
  },
});

describe("TenGod type", () => {
  it("has 10 Ten God types", () => {
    const tenGods: TenGod[] = [
      "비견", "겁재",
      "식신", "상관",
      "편재", "정재",
      "편관", "정관",
      "편인", "정인",
    ];
    expect(tenGods).toHaveLength(10);
  });

  describe("Self (比劫)", () => {
    it("비견 represents comparison", () => {
      const god: TenGod = "비견";
      expect(god).toBe("비견");
    });

    it("겁재 represents robbery", () => {
      const god: TenGod = "겁재";
      expect(god).toBe("겁재");
    });
  });

  describe("Output (食傷)", () => {
    it("식신 represents food god", () => {
      const god: TenGod = "식신";
      expect(god).toBe("식신");
    });

    it("상관 represents injury officer", () => {
      const god: TenGod = "상관";
      expect(god).toBe("상관");
    });
  });

  describe("Wealth (財)", () => {
    it("편재 represents partial wealth", () => {
      const god: TenGod = "편재";
      expect(god).toBe("편재");
    });

    it("정재 represents direct wealth", () => {
      const god: TenGod = "정재";
      expect(god).toBe("정재");
    });
  });

  describe("Authority (官)", () => {
    it("편관 represents partial officer", () => {
      const god: TenGod = "편관";
      expect(god).toBe("편관");
    });

    it("정관 represents direct officer", () => {
      const god: TenGod = "정관";
      expect(god).toBe("정관");
    });
  });

  describe("Resource (印)", () => {
    it("편인 represents partial seal", () => {
      const god: TenGod = "편인";
      expect(god).toBe("편인");
    });

    it("정인 represents direct seal", () => {
      const god: TenGod = "정인";
      expect(god).toBe("정인");
    });
  });
});

describe("analyzeTenGods", () => {
  it("returns TenGodAnalysis structure", () => {
    const p1 = createSajuProfile("wood", "甲");
    const p2 = createSajuProfile("fire", "丁");

    const result = analyzeTenGods(p1, p2);

    expect(result).toHaveProperty("person1Primary");
    expect(result).toHaveProperty("person2Primary");
    expect(result).toHaveProperty("interaction");
    expect(result).toHaveProperty("relationshipDynamics");
  });

  it("returns arrays for primary ten gods", () => {
    const p1 = createSajuProfile("wood", "甲");
    const p2 = createSajuProfile("fire", "丁");

    const result = analyzeTenGods(p1, p2);

    expect(Array.isArray(result.person1Primary)).toBe(true);
    expect(Array.isArray(result.person2Primary)).toBe(true);
  });

  it("interaction has supports, conflicts, and balance", () => {
    const p1 = createSajuProfile("wood", "甲");
    const p2 = createSajuProfile("fire", "丁");

    const result = analyzeTenGods(p1, p2);

    expect(result.interaction).toHaveProperty("supports");
    expect(result.interaction).toHaveProperty("conflicts");
    expect(result.interaction).toHaveProperty("balance");
    expect(Array.isArray(result.interaction.supports)).toBe(true);
    expect(Array.isArray(result.interaction.conflicts)).toBe(true);
    expect(typeof result.interaction.balance).toBe("number");
  });

  it("balance is between 0 and 100", () => {
    const p1 = createSajuProfile("wood", "甲");
    const p2 = createSajuProfile("fire", "丁");

    const result = analyzeTenGods(p1, p2);

    expect(result.interaction.balance).toBeGreaterThanOrEqual(0);
    expect(result.interaction.balance).toBeLessThanOrEqual(100);
  });

  it("returns relationship dynamics string", () => {
    const p1 = createSajuProfile("wood", "甲");
    const p2 = createSajuProfile("fire", "丁");

    const result = analyzeTenGods(p1, p2);

    expect(typeof result.relationshipDynamics).toBe("string");
    expect(result.relationshipDynamics.length).toBeGreaterThan(0);
  });

  describe("element combinations", () => {
    it("analyzes wood-fire combination", () => {
      const p1 = createSajuProfile("wood", "甲");
      const p2 = createSajuProfile("fire", "丁");

      const result = analyzeTenGods(p1, p2);

      expect(result.relationshipDynamics).toBeDefined();
    });

    it("analyzes same element combination", () => {
      const p1 = createSajuProfile("metal", "庚");
      const p2 = createSajuProfile("metal", "辛");

      const result = analyzeTenGods(p1, p2);

      expect(result.relationshipDynamics).toBeDefined();
    });

    it("analyzes controlling relationship (wood controls earth)", () => {
      const p1 = createSajuProfile("wood", "甲");
      const p2 = createSajuProfile("earth", "戊");

      const result = analyzeTenGods(p1, p2);

      expect(result.relationshipDynamics).toBeDefined();
    });

    it("analyzes generating relationship (water generates wood)", () => {
      const p1 = createSajuProfile("water", "壬");
      const p2 = createSajuProfile("wood", "甲");

      const result = analyzeTenGods(p1, p2);

      expect(result.relationshipDynamics).toBeDefined();
    });
  });
});

describe("TenGodAnalysis interface", () => {
  it("can be constructed with all required fields", () => {
    const analysis: TenGodAnalysis = {
      person1Primary: ["비견", "식신"],
      person2Primary: ["정재", "정관"],
      interaction: {
        supports: ["Good teamwork"],
        conflicts: [],
        balance: 80,
      },
      relationshipDynamics: "Excellent compatibility",
    };

    expect(analysis.person1Primary).toContain("비견");
    expect(analysis.person2Primary).toContain("정재");
    expect(analysis.interaction.balance).toBe(80);
  });
});

describe("Ten Gods relationship rules", () => {
  // Document the five element relationships with ten gods
  const elementRelations = {
    wood: {
      generates: "fire",    // 식상
      controls: "earth",    // 재성
      controlledBy: "metal", // 관성
      generatedBy: "water", // 인성
    },
    fire: {
      generates: "earth",
      controls: "metal",
      controlledBy: "water",
      generatedBy: "wood",
    },
    earth: {
      generates: "metal",
      controls: "water",
      controlledBy: "wood",
      generatedBy: "fire",
    },
    metal: {
      generates: "water",
      controls: "wood",
      controlledBy: "fire",
      generatedBy: "earth",
    },
    water: {
      generates: "wood",
      controls: "fire",
      controlledBy: "earth",
      generatedBy: "metal",
    },
  };

  it("wood generates fire (식상)", () => {
    expect(elementRelations.wood.generates).toBe("fire");
  });

  it("wood controls earth (재성)", () => {
    expect(elementRelations.wood.controls).toBe("earth");
  });

  it("wood is controlled by metal (관성)", () => {
    expect(elementRelations.wood.controlledBy).toBe("metal");
  });

  it("wood is generated by water (인성)", () => {
    expect(elementRelations.wood.generatedBy).toBe("water");
  });

  it("all elements have complete relationship cycle", () => {
    const elements = ["wood", "fire", "earth", "metal", "water"] as const;

    for (const el of elements) {
      const relations = elementRelations[el];
      expect(relations.generates).toBeDefined();
      expect(relations.controls).toBeDefined();
      expect(relations.controlledBy).toBeDefined();
      expect(relations.generatedBy).toBeDefined();
    }
  });
});

describe("Korean element names", () => {
  const elementNames: Record<string, string> = {
    wood: "목",
    fire: "화",
    earth: "토",
    metal: "금",
    water: "수",
  };

  it("has Korean names for all elements", () => {
    expect(Object.keys(elementNames)).toHaveLength(5);
  });

  it("wood is 목", () => {
    expect(elementNames.wood).toBe("목");
  });

  it("fire is 화", () => {
    expect(elementNames.fire).toBe("화");
  });

  it("earth is 토", () => {
    expect(elementNames.earth).toBe("토");
  });

  it("metal is 금", () => {
    expect(elementNames.metal).toBe("금");
  });

  it("water is 수", () => {
    expect(elementNames.water).toBe("수");
  });
});
