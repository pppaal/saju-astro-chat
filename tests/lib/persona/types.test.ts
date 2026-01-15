/**
 * Persona Types Tests
 *
 * Tests for personality analysis type definitions
 */


import type {
  PersonaQuizAnswers,
  PersonalityProfile,
  PersonaAxisKey,
  PersonaPole,
  PersonaAxisResult,
  PersonaArchetype,
  PersonaAnalysis,
} from "@/lib/persona/types";

describe("PersonaQuizAnswers type", () => {
  it("can hold string answers keyed by question id", () => {
    const answers: PersonaQuizAnswers = {
      q1: "strongly_agree",
      q2: "agree",
      q3: "neutral",
    };

    expect(answers.q1).toBe("strongly_agree");
    expect(Object.keys(answers)).toHaveLength(3);
  });

  it("can have undefined values", () => {
    const answers: PersonaQuizAnswers = {
      q1: "agree",
      q2: undefined,
    };

    expect(answers.q1).toBe("agree");
    expect(answers.q2).toBeUndefined();
  });

  it("can be empty", () => {
    const answers: PersonaQuizAnswers = {};
    expect(Object.keys(answers)).toHaveLength(0);
  });
});

describe("PersonalityProfile interface (Big 5 / MBTI)", () => {
  it("has all Big 5 traits", () => {
    const profile: PersonalityProfile = {
      openness: 75,
      conscientiousness: 80,
      extraversion: 45,
      agreeableness: 65,
      neuroticism: 30,
      introversion: 55,
      intuition: 70,
      thinking: 60,
      perceiving: 40,
      enneagram: { "1": 20, "4": 60, "5": 70 },
    };

    expect(profile.openness).toBe(75);
    expect(profile.conscientiousness).toBe(80);
    expect(profile.extraversion).toBe(45);
    expect(profile.agreeableness).toBe(65);
    expect(profile.neuroticism).toBe(30);
  });

  it("has MBTI-like dimensions", () => {
    const profile: PersonalityProfile = {
      openness: 50,
      conscientiousness: 50,
      extraversion: 50,
      agreeableness: 50,
      neuroticism: 50,
      introversion: 60,
      intuition: 70,
      thinking: 55,
      perceiving: 45,
      enneagram: {},
    };

    expect(profile.introversion).toBe(60);
    expect(profile.intuition).toBe(70);
    expect(profile.thinking).toBe(55);
    expect(profile.perceiving).toBe(45);
  });

  it("has enneagram scores", () => {
    const profile: PersonalityProfile = {
      openness: 50,
      conscientiousness: 50,
      extraversion: 50,
      agreeableness: 50,
      neuroticism: 50,
      introversion: 50,
      intuition: 50,
      thinking: 50,
      perceiving: 50,
      enneagram: {
        "1": 15,
        "2": 20,
        "3": 25,
        "4": 40,
        "5": 60,
        "6": 35,
        "7": 30,
        "8": 25,
        "9": 50,
      },
    };

    expect(profile.enneagram["5"]).toBe(60);
    expect(Object.keys(profile.enneagram)).toHaveLength(9);
  });
});

describe("PersonaAxisKey type", () => {
  it("has four axis keys", () => {
    const axisKeys: PersonaAxisKey[] = ["energy", "cognition", "decision", "rhythm"];
    expect(axisKeys).toHaveLength(4);
  });

  it("energy axis exists", () => {
    const key: PersonaAxisKey = "energy";
    expect(key).toBe("energy");
  });

  it("cognition axis exists", () => {
    const key: PersonaAxisKey = "cognition";
    expect(key).toBe("cognition");
  });

  it("decision axis exists", () => {
    const key: PersonaAxisKey = "decision";
    expect(key).toBe("decision");
  });

  it("rhythm axis exists", () => {
    const key: PersonaAxisKey = "rhythm";
    expect(key).toBe("rhythm");
  });
});

describe("PersonaPole type", () => {
  it("has 8 poles (2 per axis)", () => {
    const poles: PersonaPole[] = [
      "radiant", "grounded",     // energy axis
      "visionary", "structured", // cognition axis
      "logic", "empathic",       // decision axis
      "flow", "anchor",          // rhythm axis
    ];
    expect(poles).toHaveLength(8);
  });

  describe("energy axis poles", () => {
    it("radiant represents outward energy", () => {
      const pole: PersonaPole = "radiant";
      expect(pole).toBe("radiant");
    });

    it("grounded represents inward energy", () => {
      const pole: PersonaPole = "grounded";
      expect(pole).toBe("grounded");
    });
  });

  describe("cognition axis poles", () => {
    it("visionary represents abstract thinking", () => {
      const pole: PersonaPole = "visionary";
      expect(pole).toBe("visionary");
    });

    it("structured represents concrete thinking", () => {
      const pole: PersonaPole = "structured";
      expect(pole).toBe("structured");
    });
  });

  describe("decision axis poles", () => {
    it("logic represents analytical decisions", () => {
      const pole: PersonaPole = "logic";
      expect(pole).toBe("logic");
    });

    it("empathic represents value-based decisions", () => {
      const pole: PersonaPole = "empathic";
      expect(pole).toBe("empathic");
    });
  });

  describe("rhythm axis poles", () => {
    it("flow represents flexible approach", () => {
      const pole: PersonaPole = "flow";
      expect(pole).toBe("flow");
    });

    it("anchor represents planned approach", () => {
      const pole: PersonaPole = "anchor";
      expect(pole).toBe("anchor");
    });
  });
});

describe("PersonaAxisResult interface", () => {
  it("has pole and score", () => {
    const result: PersonaAxisResult = {
      pole: "radiant",
      score: 75,
    };

    expect(result.pole).toBe("radiant");
    expect(result.score).toBe(75);
  });

  it("score represents position on spectrum (0-100)", () => {
    const leftResult: PersonaAxisResult = {
      pole: "grounded",
      score: 20,
    };

    const rightResult: PersonaAxisResult = {
      pole: "radiant",
      score: 80,
    };

    expect(leftResult.score).toBeLessThan(50);
    expect(rightResult.score).toBeGreaterThan(50);
  });

  it("score 0 means fully left pole", () => {
    const result: PersonaAxisResult = {
      pole: "grounded",
      score: 0,
    };
    expect(result.score).toBe(0);
  });

  it("score 100 means fully right pole", () => {
    const result: PersonaAxisResult = {
      pole: "radiant",
      score: 100,
    };
    expect(result.score).toBe(100);
  });
});

describe("PersonaArchetype interface", () => {
  it("has all required properties", () => {
    const archetype: PersonaArchetype = {
      code: "RVLA",
      name: "Starforge Navigator",
      summary: "A visionary leader who combines creativity with logical precision",
      strengths: ["Strategic thinking", "Innovation", "Leadership"],
      cautions: ["May overlook emotional nuances", "Can be too focused on efficiency"],
      idealRoles: ["Strategist", "Innovator", "Tech Lead"],
      growth: ["Practice empathy", "Slow down to appreciate process"],
      compatibilityHint: "Works well with empathic types who ground their vision",
    };

    expect(archetype.code).toBe("RVLA");
    expect(archetype.name).toBe("Starforge Navigator");
    expect(archetype.strengths).toContain("Strategic thinking");
    expect(archetype.cautions.length).toBeGreaterThan(0);
  });

  it("code is 4 characters (one per axis)", () => {
    const archetype: PersonaArchetype = {
      code: "GSEF",
      name: "Test Archetype",
      summary: "",
      strengths: [],
      cautions: [],
      idealRoles: [],
      growth: [],
      compatibilityHint: "",
    };

    expect(archetype.code).toHaveLength(4);
  });
});

describe("PersonaAnalysis interface", () => {
  it("has core persona properties", () => {
    const analysis: PersonaAnalysis = {
      title: "The Visionary Leader",
      summary: "You combine big-picture thinking with logical precision",
      typeCode: "RVLA",
      personaName: "Starforge Navigator",
      axes: {
        energy: { pole: "radiant", score: 75 },
        cognition: { pole: "visionary", score: 80 },
        decision: { pole: "logic", score: 65 },
        rhythm: { pole: "anchor", score: 40 },
      },
      primaryColor: "#4A90D9",
      secondaryColor: "#7B68EE",
      strengths: ["Strategic vision", "Analytical skills"],
      challenges: ["May neglect emotions", "Can be impatient"],
      career: "Leadership, Strategy, Technology",
      relationships: "Values intellectual connection",
      guidance: "Balance logic with empathy",
      growthTips: ["Practice active listening", "Appreciate the journey"],
      keyMotivations: ["Achievement", "Knowledge", "Impact"],
      recommendedRoles: ["CEO", "Strategist", "Architect"],
      compatibilityHint: "Pairs well with empathic grounded types",
      profile: {
        openness: 80,
        conscientiousness: 75,
        extraversion: 60,
        agreeableness: 50,
        neuroticism: 35,
        introversion: 40,
        intuition: 80,
        thinking: 65,
        perceiving: 40,
        enneagram: { "5": 70, "3": 60 },
      },
    };

    expect(analysis.title).toBe("The Visionary Leader");
    expect(analysis.typeCode).toBe("RVLA");
    expect(analysis.axes.energy.pole).toBe("radiant");
  });

  it("axes contain all four dimensions", () => {
    const axes: PersonaAnalysis["axes"] = {
      energy: { pole: "radiant", score: 50 },
      cognition: { pole: "structured", score: 50 },
      decision: { pole: "empathic", score: 50 },
      rhythm: { pole: "flow", score: 50 },
    };

    expect(Object.keys(axes)).toContain("energy");
    expect(Object.keys(axes)).toContain("cognition");
    expect(Object.keys(axes)).toContain("decision");
    expect(Object.keys(axes)).toContain("rhythm");
  });

  it("has optional consistency properties", () => {
    const analysisWithConsistency: PersonaAnalysis = {
      title: "Test",
      summary: "Test summary",
      typeCode: "GSEF",
      personaName: "Test Persona",
      axes: {
        energy: { pole: "grounded", score: 30 },
        cognition: { pole: "structured", score: 35 },
        decision: { pole: "empathic", score: 25 },
        rhythm: { pole: "flow", score: 60 },
      },
      consistencyScore: 0.85,
      consistencyLabel: "High",
      primaryColor: "#333",
      secondaryColor: "#666",
      strengths: [],
      challenges: [],
      career: "",
      relationships: "",
      guidance: "",
      growthTips: [],
      keyMotivations: [],
      recommendedRoles: [],
      compatibilityHint: "",
      profile: {
        openness: 50,
        conscientiousness: 50,
        extraversion: 50,
        agreeableness: 50,
        neuroticism: 50,
        introversion: 50,
        intuition: 50,
        thinking: 50,
        perceiving: 50,
        enneagram: {},
      },
    };

    expect(analysisWithConsistency.consistencyScore).toBe(0.85);
    expect(analysisWithConsistency.consistencyLabel).toBe("High");
  });

  it("has color properties for UI", () => {
    const analysis: PersonaAnalysis = {
      title: "Test",
      summary: "",
      typeCode: "TEST",
      personaName: "",
      axes: {
        energy: { pole: "radiant", score: 50 },
        cognition: { pole: "visionary", score: 50 },
        decision: { pole: "logic", score: 50 },
        rhythm: { pole: "anchor", score: 50 },
      },
      primaryColor: "#FF6B6B",
      secondaryColor: "#4ECDC4",
      strengths: [],
      challenges: [],
      career: "",
      relationships: "",
      guidance: "",
      growthTips: [],
      keyMotivations: [],
      recommendedRoles: [],
      compatibilityHint: "",
      profile: {
        openness: 50,
        conscientiousness: 50,
        extraversion: 50,
        agreeableness: 50,
        neuroticism: 50,
        introversion: 50,
        intuition: 50,
        thinking: 50,
        perceiving: 50,
        enneagram: {},
      },
    };

    expect(analysis.primaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(analysis.secondaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

describe("Type code generation logic", () => {
  // Type code is formed from first letter of each pole
  // R/G (energy) + V/S (cognition) + L/E (decision) + F/A (rhythm)

  it("RVLF type represents radiant-visionary-logic-flow", () => {
    const typeCode = "RVLF";
    expect(typeCode[0]).toBe("R"); // Radiant
    expect(typeCode[1]).toBe("V"); // Visionary
    expect(typeCode[2]).toBe("L"); // Logic
    expect(typeCode[3]).toBe("F"); // Flow
  });

  it("GSEA type represents grounded-structured-empathic-anchor", () => {
    const typeCode = "GSEA";
    expect(typeCode[0]).toBe("G"); // Grounded
    expect(typeCode[1]).toBe("S"); // Structured
    expect(typeCode[2]).toBe("E"); // Empathic
    expect(typeCode[3]).toBe("A"); // Anchor
  });

  it("there are 16 possible type codes (2^4)", () => {
    const energyPoles = ["R", "G"];
    const cognitionPoles = ["V", "S"];
    const decisionPoles = ["L", "E"];
    const rhythmPoles = ["F", "A"];

    const totalCombinations =
      energyPoles.length *
      cognitionPoles.length *
      decisionPoles.length *
      rhythmPoles.length;

    expect(totalCombinations).toBe(16);
  });
});
