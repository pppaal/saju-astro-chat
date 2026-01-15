/**
 * ICP (Interpersonal Circumplex) Types Tests
 *
 * Tests for ICP type definitions and structures
 */


import type {
  ICPQuizAnswers,
  ICPOctantCode,
  ICPOctant,
  ICPAnalysis,
  ICPCompatibility,
} from "@/lib/icp/types";

describe("ICPOctantCode type", () => {
  const allOctantCodes: ICPOctantCode[] = [
    "PA", "BC", "DE", "FG", "HI", "JK", "LM", "NO"
  ];

  it("has exactly 8 octant codes", () => {
    expect(allOctantCodes).toHaveLength(8);
  });

  it("PA represents Dominant-Assured", () => {
    const code: ICPOctantCode = "PA";
    expect(code).toBe("PA");
  });

  it("BC represents Arrogant-Calculating", () => {
    const code: ICPOctantCode = "BC";
    expect(code).toBe("BC");
  });

  it("DE represents Cold-Hearted", () => {
    const code: ICPOctantCode = "DE";
    expect(code).toBe("DE");
  });

  it("FG represents Aloof-Introverted", () => {
    const code: ICPOctantCode = "FG";
    expect(code).toBe("FG");
  });

  it("HI represents Unassured-Submissive", () => {
    const code: ICPOctantCode = "HI";
    expect(code).toBe("HI");
  });

  it("JK represents Unassuming-Ingenuous", () => {
    const code: ICPOctantCode = "JK";
    expect(code).toBe("JK");
  });

  it("LM represents Warm-Agreeable", () => {
    const code: ICPOctantCode = "LM";
    expect(code).toBe("LM");
  });

  it("NO represents Gregarious-Extraverted", () => {
    const code: ICPOctantCode = "NO";
    expect(code).toBe("NO");
  });
});

describe("ICPQuizAnswers type", () => {
  it("can hold string answers keyed by question id", () => {
    const answers: ICPQuizAnswers = {
      "q1": "strongly_agree",
      "q2": "agree",
      "q3": "neutral",
      "q4": "disagree",
      "q5": "strongly_disagree",
    };

    expect(Object.keys(answers)).toHaveLength(5);
    expect(answers.q1).toBe("strongly_agree");
  });

  it("can be empty", () => {
    const answers: ICPQuizAnswers = {};
    expect(Object.keys(answers)).toHaveLength(0);
  });
});

describe("ICPOctant interface", () => {
  it("has all required properties", () => {
    const octant: ICPOctant = {
      code: "PA",
      name: "Dominant-Assured",
      korean: "지배적-확신적",
      traits: ["confident", "assertive", "leader"],
      traitsKo: ["자신감", "주장적", "리더"],
      shadow: "May become controlling",
      shadowKo: "통제적이 될 수 있음",
      dominance: 0.8,
      affiliation: 0.2,
      description: "Natural leaders who take charge",
      descriptionKo: "책임지는 천성적 리더",
      therapeuticQuestions: ["How do you handle disagreement?"],
      therapeuticQuestionsKo: ["의견 불일치를 어떻게 처리하나요?"],
      growthRecommendations: ["Practice active listening"],
      growthRecommendationsKo: ["적극적 경청 연습하기"],
    };

    expect(octant.code).toBe("PA");
    expect(octant.name).toBe("Dominant-Assured");
    expect(octant.korean).toBe("지배적-확신적");
    expect(octant.traits).toContain("confident");
    expect(octant.traitsKo).toContain("자신감");
    expect(octant.dominance).toBe(0.8);
    expect(octant.affiliation).toBe(0.2);
  });

  it("dominance value ranges from -1 to 1", () => {
    const submissiveOctant: ICPOctant = {
      code: "HI",
      name: "Unassured-Submissive",
      korean: "불확실-복종적",
      traits: ["humble"],
      traitsKo: ["겸손"],
      shadow: "May lack assertiveness",
      shadowKo: "주장력 부족",
      dominance: -0.8,
      affiliation: 0.3,
      description: "Tends to defer to others",
      descriptionKo: "다른 사람에게 양보하는 경향",
      therapeuticQuestions: [],
      therapeuticQuestionsKo: [],
      growthRecommendations: [],
      growthRecommendationsKo: [],
    };

    expect(submissiveOctant.dominance).toBeGreaterThanOrEqual(-1);
    expect(submissiveOctant.dominance).toBeLessThanOrEqual(1);
  });

  it("affiliation value ranges from -1 to 1", () => {
    const hostileOctant: ICPOctant = {
      code: "DE",
      name: "Cold-Hearted",
      korean: "냉담한",
      traits: ["detached"],
      traitsKo: ["거리를 둠"],
      shadow: "May seem uncaring",
      shadowKo: "무관심해 보일 수 있음",
      dominance: 0.0,
      affiliation: -0.8,
      description: "Maintains emotional distance",
      descriptionKo: "감정적 거리 유지",
      therapeuticQuestions: [],
      therapeuticQuestionsKo: [],
      growthRecommendations: [],
      growthRecommendationsKo: [],
    };

    expect(hostileOctant.affiliation).toBeGreaterThanOrEqual(-1);
    expect(hostileOctant.affiliation).toBeLessThanOrEqual(1);
  });
});

describe("ICPAnalysis interface", () => {
  it("has all required score properties", () => {
    const analysis: ICPAnalysis = {
      dominanceScore: 75,
      affiliationScore: 60,
      dominanceNormalized: 0.5,
      affiliationNormalized: 0.2,
      octantScores: {
        PA: 0.8,
        BC: 0.3,
        DE: 0.1,
        FG: 0.1,
        HI: 0.2,
        JK: 0.4,
        LM: 0.6,
        NO: 0.5,
      },
      primaryStyle: "PA",
      secondaryStyle: "LM",
      primaryOctant: {
        code: "PA",
        name: "Dominant-Assured",
        korean: "지배적-확신적",
        traits: [],
        traitsKo: [],
        shadow: "",
        shadowKo: "",
        dominance: 0.8,
        affiliation: 0.2,
        description: "",
        descriptionKo: "",
        therapeuticQuestions: [],
        therapeuticQuestionsKo: [],
        growthRecommendations: [],
        growthRecommendationsKo: [],
      },
      secondaryOctant: null,
      summary: "You have a dominant interpersonal style",
      summaryKo: "지배적인 대인관계 스타일을 가지고 있습니다",
      consistencyScore: 0.85,
    };

    expect(analysis.dominanceScore).toBe(75);
    expect(analysis.affiliationScore).toBe(60);
    expect(analysis.primaryStyle).toBe("PA");
    expect(analysis.consistencyScore).toBe(0.85);
  });

  it("dominanceScore ranges from 0 to 100", () => {
    const analysis: ICPAnalysis = {
      dominanceScore: 50,
      affiliationScore: 50,
      dominanceNormalized: 0,
      affiliationNormalized: 0,
      octantScores: { PA: 0, BC: 0, DE: 0, FG: 0, HI: 0, JK: 0, LM: 0, NO: 0 },
      primaryStyle: "PA",
      secondaryStyle: null,
      primaryOctant: {} as ICPOctant,
      secondaryOctant: null,
      summary: "",
      summaryKo: "",
      consistencyScore: 0.5,
    };

    expect(analysis.dominanceScore).toBeGreaterThanOrEqual(0);
    expect(analysis.dominanceScore).toBeLessThanOrEqual(100);
  });

  it("octantScores has all 8 octant codes", () => {
    const scores: ICPAnalysis["octantScores"] = {
      PA: 0.5,
      BC: 0.3,
      DE: 0.2,
      FG: 0.1,
      HI: 0.1,
      JK: 0.2,
      LM: 0.4,
      NO: 0.6,
    };

    expect(Object.keys(scores)).toHaveLength(8);
    expect(scores.PA).toBeDefined();
    expect(scores.NO).toBeDefined();
  });

  it("secondaryStyle can be null", () => {
    const analysis: ICPAnalysis = {
      dominanceScore: 50,
      affiliationScore: 50,
      dominanceNormalized: 0,
      affiliationNormalized: 0,
      octantScores: { PA: 0, BC: 0, DE: 0, FG: 0, HI: 0, JK: 0, LM: 0, NO: 0 },
      primaryStyle: "LM",
      secondaryStyle: null,
      primaryOctant: {} as ICPOctant,
      secondaryOctant: null,
      summary: "",
      summaryKo: "",
      consistencyScore: 0.9,
    };

    expect(analysis.secondaryStyle).toBeNull();
    expect(analysis.secondaryOctant).toBeNull();
  });
});

describe("ICPCompatibility interface", () => {
  it("has all required properties", () => {
    const compatibility: ICPCompatibility = {
      person1Style: "PA",
      person2Style: "JK",
      score: 85,
      level: "High",
      levelKo: "높음",
      description: "Complementary styles that balance each other",
      descriptionKo: "서로 균형을 이루는 보완적인 스타일",
      dynamics: {
        strengths: ["Leadership-followership balance", "Clear role definition"],
        strengthsKo: ["리더십-팔로워십 균형", "명확한 역할 정의"],
        challenges: ["Power imbalance risk", "Need for mutual respect"],
        challengesKo: ["권력 불균형 위험", "상호 존중 필요"],
        tips: ["Practice shared decision making", "Acknowledge contributions"],
        tipsKo: ["공동 의사결정 연습", "기여 인정하기"],
      },
    };

    expect(compatibility.person1Style).toBe("PA");
    expect(compatibility.person2Style).toBe("JK");
    expect(compatibility.score).toBe(85);
    expect(compatibility.level).toBe("High");
  });

  it("score ranges from 0 to 100", () => {
    const lowCompatibility: ICPCompatibility = {
      person1Style: "DE",
      person2Style: "DE",
      score: 25,
      level: "Low",
      levelKo: "낮음",
      description: "Similar styles may compete",
      descriptionKo: "유사한 스타일은 경쟁할 수 있음",
      dynamics: {
        strengths: [],
        strengthsKo: [],
        challenges: ["Both may be emotionally distant"],
        challengesKo: ["둘 다 감정적으로 거리를 둘 수 있음"],
        tips: [],
        tipsKo: [],
      },
    };

    expect(lowCompatibility.score).toBeGreaterThanOrEqual(0);
    expect(lowCompatibility.score).toBeLessThanOrEqual(100);
  });

  it("dynamics has all required arrays", () => {
    const compatibility: ICPCompatibility = {
      person1Style: "LM",
      person2Style: "NO",
      score: 90,
      level: "Very High",
      levelKo: "매우 높음",
      description: "Warm and social styles complement well",
      descriptionKo: "따뜻하고 사교적인 스타일이 잘 어울림",
      dynamics: {
        strengths: ["Mutual warmth"],
        strengthsKo: ["상호 따뜻함"],
        challenges: ["May avoid necessary conflicts"],
        challengesKo: ["필요한 갈등을 피할 수 있음"],
        tips: ["Address issues directly when needed"],
        tipsKo: ["필요할 때 문제를 직접적으로 다루기"],
      },
    };

    expect(Array.isArray(compatibility.dynamics.strengths)).toBe(true);
    expect(Array.isArray(compatibility.dynamics.strengthsKo)).toBe(true);
    expect(Array.isArray(compatibility.dynamics.challenges)).toBe(true);
    expect(Array.isArray(compatibility.dynamics.challengesKo)).toBe(true);
    expect(Array.isArray(compatibility.dynamics.tips)).toBe(true);
    expect(Array.isArray(compatibility.dynamics.tipsKo)).toBe(true);
  });
});

describe("ICP Octant circle positions", () => {
  // Octants are arranged in a circle: PA (top), BC, DE, FG (bottom), HI, JK, LM, NO
  const octantPositions: Record<ICPOctantCode, { angle: number }> = {
    PA: { angle: 90 },   // Top (dominant, neutral affiliation)
    BC: { angle: 135 },  // Top-left (dominant, hostile)
    DE: { angle: 180 },  // Left (neutral, hostile)
    FG: { angle: 225 },  // Bottom-left (submissive, hostile)
    HI: { angle: 270 },  // Bottom (submissive, neutral affiliation)
    JK: { angle: 315 },  // Bottom-right (submissive, friendly)
    LM: { angle: 0 },    // Right (neutral, friendly)
    NO: { angle: 45 },   // Top-right (dominant, friendly)
  };

  it("has 8 octants positioned around the circle", () => {
    expect(Object.keys(octantPositions)).toHaveLength(8);
  });

  it("PA is at the top (90 degrees)", () => {
    expect(octantPositions.PA.angle).toBe(90);
  });

  it("HI is at the bottom (270 degrees)", () => {
    expect(octantPositions.HI.angle).toBe(270);
  });

  it("LM is on the right (0 degrees - friendly)", () => {
    expect(octantPositions.LM.angle).toBe(0);
  });

  it("DE is on the left (180 degrees - hostile)", () => {
    expect(octantPositions.DE.angle).toBe(180);
  });

  it("octants are evenly spaced 45 degrees apart", () => {
    const angles = Object.values(octantPositions).map(p => p.angle);
    const sorted = [...angles].sort((a, b) => a - b);

    for (let i = 0; i < sorted.length - 1; i++) {
      const diff = sorted[i + 1] - sorted[i];
      expect(diff).toBe(45);
    }
  });
});
