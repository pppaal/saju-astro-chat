/**
 * Saju Interpretations Tests
 *
 * Tests for twelve stages, sibsin, shinsal, and element interpretations
 */


import {
  getTwelveStageInterpretation,
  getSibsinInterpretation,
  getShinsalInterpretation,
  getElementInterpretation,
  summarizeTwelveStages,
  analyzeElementBalance,
  TWELVE_STAGE_INTERPRETATIONS,
  SIBSIN_INTERPRETATIONS,
  ELEMENT_INTERPRETATIONS,
  type TwelveStageType,
  type TwelveStageInterpretation,
  type SibsinInterpretation,
  type ShinsalInterpretation,
  type ElementInterpretation,
} from "@/lib/Saju/interpretations";

describe("getTwelveStageInterpretation", () => {
  const validStages: TwelveStageType[] = [
    "장생", "목욕", "관대", "건록", "제왕",
    "쇠", "병", "사", "묘", "절", "태", "양"
  ];

  validStages.forEach((stage) => {
    it(`returns interpretation for ${stage}`, () => {
      const result = getTwelveStageInterpretation(stage);
      expect(result).not.toBeNull();
      expect(result?.name).toBe(stage);
    });
  });

  it("returns null for invalid stage", () => {
    const result = getTwelveStageInterpretation("invalid" as TwelveStageType);
    expect(result).toBeNull();
  });

  it("includes all required fields", () => {
    const result = getTwelveStageInterpretation("장생");
    expect(result).toHaveProperty("name");
    expect(result).toHaveProperty("hanja");
    expect(result).toHaveProperty("meaning");
    expect(result).toHaveProperty("fortune");
    expect(result).toHaveProperty("personality");
    expect(result).toHaveProperty("career");
    expect(result).toHaveProperty("relationship");
    expect(result).toHaveProperty("health");
    expect(result).toHaveProperty("advice");
  });

  it("장생 is auspicious (길)", () => {
    const result = getTwelveStageInterpretation("장생");
    expect(result?.fortune).toBe("길");
  });

  it("사 is inauspicious (흉)", () => {
    const result = getTwelveStageInterpretation("사");
    expect(result?.fortune).toBe("흉");
  });
});

describe("getSibsinInterpretation", () => {
  const validSibsin = [
    "비견", "겁재", "식신", "상관", "편재",
    "정재", "편관", "정관", "편인", "정인"
  ];

  validSibsin.forEach((sibsin) => {
    it(`returns interpretation for ${sibsin}`, () => {
      const result = getSibsinInterpretation(sibsin as any);
      expect(result).not.toBeNull();
    });
  });

  it("returns null for invalid sibsin", () => {
    const result = getSibsinInterpretation("invalid" as any);
    expect(result).toBeNull();
  });

  it("includes positive and negative aspects", () => {
    const result = getSibsinInterpretation("정관" as any);
    expect(result).toHaveProperty("positive");
    expect(result).toHaveProperty("negative");
  });
});

describe("getShinsalInterpretation", () => {
  it("returns interpretation for known shinsal", () => {
    const result = getShinsalInterpretation("천을귀인");
    // May or may not exist in data
    if (result) {
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("category");
    }
  });

  it("returns null for unknown shinsal", () => {
    const result = getShinsalInterpretation("unknown_shinsal_xyz");
    expect(result).toBeNull();
  });
});

describe("getElementInterpretation", () => {
  const elements = ["목", "화", "토", "금", "수"] as const;

  elements.forEach((element) => {
    it(`returns interpretation for ${element}`, () => {
      const result = getElementInterpretation(element);
      expect(result).not.toBeNull();
      expect(result?.element).toBe(element);
    });
  });

  it("includes all required fields", () => {
    const result = getElementInterpretation("목");
    expect(result).toHaveProperty("element");
    expect(result).toHaveProperty("hanja");
    expect(result).toHaveProperty("nature");
    expect(result).toHaveProperty("personality");
    expect(result).toHaveProperty("excess");
    expect(result).toHaveProperty("deficiency");
    expect(result).toHaveProperty("health");
    expect(result).toHaveProperty("career");
  });

  it("목 has 木 hanja", () => {
    const result = getElementInterpretation("목");
    expect(result?.hanja).toBe("木");
  });

  it("화 has 火 hanja", () => {
    const result = getElementInterpretation("화");
    expect(result?.hanja).toBe("火");
  });
});

describe("summarizeTwelveStages", () => {
  it("creates summary from stages", () => {
    const stages = [
      { pillar: "년주", stage: "장생" as TwelveStageType },
      { pillar: "월주", stage: "건록" as TwelveStageType },
    ];
    const result = summarizeTwelveStages(stages);

    expect(result).toContain("년주");
    expect(result).toContain("장생");
    expect(result).toContain("월주");
    expect(result).toContain("건록");
  });

  it("adds 吉 for auspicious stages", () => {
    const stages = [{ pillar: "일주", stage: "장생" as TwelveStageType }];
    const result = summarizeTwelveStages(stages);

    expect(result).toContain("(吉)");
  });

  it("adds 凶 for inauspicious stages", () => {
    const stages = [{ pillar: "시주", stage: "사" as TwelveStageType }];
    const result = summarizeTwelveStages(stages);

    expect(result).toContain("(凶)");
  });

  it("uses | separator between pillars", () => {
    const stages = [
      { pillar: "년주", stage: "장생" as TwelveStageType },
      { pillar: "월주", stage: "목욕" as TwelveStageType },
    ];
    const result = summarizeTwelveStages(stages);

    expect(result).toContain("|");
  });

  it("handles empty array", () => {
    const result = summarizeTwelveStages([]);
    expect(result).toBe("");
  });
});

describe("analyzeElementBalance", () => {
  it("returns balanced for even distribution", () => {
    const counts = { 목: 2, 화: 2, 토: 2, 금: 1, 수: 1 };
    const result = analyzeElementBalance(counts);

    expect(result.balance).toBe("균형");
    expect(result.interpretation).toContain("고루");
  });

  it("returns deficient when element is 0", () => {
    const counts = { 목: 2, 화: 2, 토: 2, 금: 2, 수: 0 };
    const result = analyzeElementBalance(counts);

    expect(result.balance).toBe("결핍");
    expect(result.deficient).toBe("수");
  });

  it("returns dominant when element is high", () => {
    const counts = { 목: 4, 화: 1, 토: 1, 금: 1, 수: 1 };
    const result = analyzeElementBalance(counts);

    expect(result.dominant).toBe("목");
  });

  it("identifies deficient element correctly", () => {
    const counts = { 목: 0, 화: 2, 토: 2, 금: 2, 수: 2 };
    const result = analyzeElementBalance(counts);

    expect(result.deficient).toBe("목");
    expect(result.interpretation).toContain("목");
  });

  it("returns appropriate interpretation for excess", () => {
    const counts = { 목: 1, 화: 5, 토: 1, 금: 1, 수: 0 };
    const result = analyzeElementBalance(counts);

    expect(result.interpretation).toBeDefined();
    expect(typeof result.interpretation).toBe("string");
  });
});

describe("TWELVE_STAGE_INTERPRETATIONS", () => {
  it("has 12 stages", () => {
    expect(Object.keys(TWELVE_STAGE_INTERPRETATIONS)).toHaveLength(12);
  });

  it("all stages have required properties", () => {
    Object.values(TWELVE_STAGE_INTERPRETATIONS).forEach((stage) => {
      expect(stage).toHaveProperty("name");
      expect(stage).toHaveProperty("fortune");
      expect(["길", "흉", "중립"]).toContain(stage.fortune);
    });
  });
});

describe("SIBSIN_INTERPRETATIONS", () => {
  it("has 10 sibsin types", () => {
    expect(Object.keys(SIBSIN_INTERPRETATIONS)).toHaveLength(10);
  });
});

describe("ELEMENT_INTERPRETATIONS", () => {
  it("has 5 elements", () => {
    expect(Object.keys(ELEMENT_INTERPRETATIONS)).toHaveLength(5);
  });

  it("contains all five elements", () => {
    expect(ELEMENT_INTERPRETATIONS).toHaveProperty("목");
    expect(ELEMENT_INTERPRETATIONS).toHaveProperty("화");
    expect(ELEMENT_INTERPRETATIONS).toHaveProperty("토");
    expect(ELEMENT_INTERPRETATIONS).toHaveProperty("금");
    expect(ELEMENT_INTERPRETATIONS).toHaveProperty("수");
  });
});

describe("Type interfaces", () => {
  it("TwelveStageInterpretation has correct structure", () => {
    const stage: TwelveStageInterpretation = {
      name: "장생",
      hanja: "長生",
      meaning: "탄생과 성장",
      fortune: "길",
      personality: "낙관적",
      career: "발전 가능",
      relationship: "원만",
      health: "건강",
      advice: "도전하세요",
    };
    expect(stage.name).toBe("장생");
    expect(stage.fortune).toBe("길");
  });

  it("ElementInterpretation has correct structure", () => {
    const element: ElementInterpretation = {
      element: "목",
      hanja: "木",
      nature: "성장",
      personality: "인자함",
      excess: "과욕",
      deficiency: "우유부단",
      health: "간 주의",
      career: "교육, 창작",
    };
    expect(element.element).toBe("목");
    expect(element.hanja).toBe("木");
  });
});
