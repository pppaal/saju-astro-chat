/**
 * ICP Questions Tests
 *
 * Tests for ICP (Interpersonal Circumplex) questionnaire
 */


import {
  icpQuestions,
  TOTAL_ICP_QUESTIONS,
  type ICPQuestion,
  type ICPOption,
} from "@/lib/icp/questions";

describe("TOTAL_ICP_QUESTIONS constant", () => {
  it("equals 32", () => {
    expect(TOTAL_ICP_QUESTIONS).toBe(32);
  });

  it("matches actual question count", () => {
    expect(icpQuestions.length).toBe(TOTAL_ICP_QUESTIONS);
  });
});

describe("icpQuestions array", () => {
  it("has 32 questions total", () => {
    expect(icpQuestions).toHaveLength(32);
  });

  describe("question distribution by axis", () => {
    it("has 16 dominance questions", () => {
      const dominanceQuestions = icpQuestions.filter(q => q.axis === "dominance");
      expect(dominanceQuestions).toHaveLength(16);
    });

    it("has 16 affiliation questions", () => {
      const affiliationQuestions = icpQuestions.filter(q => q.axis === "affiliation");
      expect(affiliationQuestions).toHaveLength(16);
    });
  });

  describe("question IDs", () => {
    it("all question IDs are unique", () => {
      const ids = icpQuestions.map(q => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("dominance question IDs start with dom_", () => {
      const dominanceQuestions = icpQuestions.filter(q => q.axis === "dominance");
      for (const q of dominanceQuestions) {
        expect(q.id).toMatch(/^dom_\d+$/);
      }
    });

    it("affiliation question IDs start with aff_", () => {
      const affiliationQuestions = icpQuestions.filter(q => q.axis === "affiliation");
      for (const q of affiliationQuestions) {
        expect(q.id).toMatch(/^aff_\d+$/);
      }
    });
  });

  describe("question content", () => {
    it("every question has English text", () => {
      for (const q of icpQuestions) {
        expect(q.text).toBeDefined();
        expect(q.text.length).toBeGreaterThan(0);
      }
    });

    it("every question has Korean text", () => {
      for (const q of icpQuestions) {
        expect(q.textKo).toBeDefined();
        expect(q.textKo.length).toBeGreaterThan(0);
      }
    });

    it("English text differs from Korean text", () => {
      for (const q of icpQuestions) {
        expect(q.text).not.toBe(q.textKo);
      }
    });
  });
});

describe("ICPOption structure", () => {
  it("every question has exactly 3 options", () => {
    for (const q of icpQuestions) {
      expect(q.options).toHaveLength(3);
    }
  });

  it("options have IDs A, B, C", () => {
    for (const q of icpQuestions) {
      const optionIds = q.options.map(o => o.id);
      expect(optionIds).toContain("A");
      expect(optionIds).toContain("B");
      expect(optionIds).toContain("C");
    }
  });

  it("all options have English text", () => {
    for (const q of icpQuestions) {
      for (const opt of q.options) {
        expect(opt.text).toBeDefined();
        expect(opt.text.length).toBeGreaterThan(0);
      }
    }
  });

  it("all options have Korean text", () => {
    for (const q of icpQuestions) {
      for (const opt of q.options) {
        expect(opt.textKo).toBeDefined();
        expect(opt.textKo.length).toBeGreaterThan(0);
      }
    }
  });

  it("option English and Korean texts differ", () => {
    for (const q of icpQuestions) {
      for (const opt of q.options) {
        expect(opt.text).not.toBe(opt.textKo);
      }
    }
  });
});

describe("Option scoring logic", () => {
  // A typically represents high dominance/high affiliation
  // B typically represents neutral/moderate
  // C typically represents low dominance/low affiliation

  describe("dominance axis options", () => {
    it("A options represent dominant behavior", () => {
      const firstDomQuestion = icpQuestions.find(q => q.id === "dom_1");
      expect(firstDomQuestion).toBeDefined();

      const optionA = firstDomQuestion!.options.find(o => o.id === "A");
      expect(optionA!.text).toContain("lead");
    });

    it("C options represent submissive behavior", () => {
      const firstDomQuestion = icpQuestions.find(q => q.id === "dom_1");
      expect(firstDomQuestion).toBeDefined();

      const optionC = firstDomQuestion!.options.find(o => o.id === "C");
      expect(optionC!.text).toContain("follow");
    });
  });

  describe("affiliation axis options", () => {
    it("A options represent friendly/warm behavior", () => {
      const firstAffQuestion = icpQuestions.find(q => q.id === "aff_1");
      expect(firstAffQuestion).toBeDefined();

      const optionA = firstAffQuestion!.options.find(o => o.id === "A");
      expect(optionA!.text).toContain("support");
    });

    it("C options represent distant/cold behavior", () => {
      const firstAffQuestion = icpQuestions.find(q => q.id === "aff_1");
      expect(firstAffQuestion).toBeDefined();

      const optionC = firstAffQuestion!.options.find(o => o.id === "C");
      expect(optionC!.text).toContain("themselves");
    });
  });
});

describe("Specific question content checks", () => {
  describe("dominance questions", () => {
    it("dom_1 is about group discussions", () => {
      const q = icpQuestions.find(q => q.id === "dom_1");
      expect(q!.text).toContain("group discussions");
      expect(q!.textKo).toContain("그룹 토론");
    });

    it("dom_3 is about conflicts", () => {
      const q = icpQuestions.find(q => q.id === "dom_3");
      expect(q!.text).toContain("conflicts");
      expect(q!.textKo).toContain("갈등");
    });

    it("dom_5 is about work/school", () => {
      const q = icpQuestions.find(q => q.id === "dom_5");
      expect(q!.text).toContain("work or school");
      expect(q!.textKo).toContain("직장이나 학교");
    });

    it("dom_14 is about competition", () => {
      const q = icpQuestions.find(q => q.id === "dom_14");
      expect(q!.text).toContain("competitive");
      expect(q!.textKo).toContain("경쟁");
    });
  });

  describe("affiliation questions", () => {
    it("aff_1 is about supporting upset friends", () => {
      const q = icpQuestions.find(q => q.id === "aff_1");
      expect(q!.text).toContain("friend is upset");
      expect(q!.textKo).toContain("친구가 속상해");
    });

    it("aff_3 is about sharing personal feelings", () => {
      const q = icpQuestions.find(q => q.id === "aff_3");
      expect(q!.text).toContain("personal feelings");
      expect(q!.textKo).toContain("개인적인 감정");
    });

    it("aff_8 is about trust", () => {
      const q = icpQuestions.find(q => q.id === "aff_8");
      expect(q!.text).toContain("Trust");
      expect(q!.textKo).toContain("신뢰");
    });

    it("aff_14 is about cooperation vs competition", () => {
      const q = icpQuestions.find(q => q.id === "aff_14");
      expect(q!.text).toContain("Cooperation");
      expect(q!.textKo).toContain("협력");
    });
  });
});

describe("Question numbering", () => {
  it("dominance questions are numbered 1-16", () => {
    const domQuestions = icpQuestions.filter(q => q.axis === "dominance");
    const numbers = domQuestions.map(q => parseInt(q.id.replace("dom_", "")));

    for (let i = 1; i <= 16; i++) {
      expect(numbers).toContain(i);
    }
  });

  it("affiliation questions are numbered 1-16", () => {
    const affQuestions = icpQuestions.filter(q => q.axis === "affiliation");
    const numbers = affQuestions.map(q => parseInt(q.id.replace("aff_", "")));

    for (let i = 1; i <= 16; i++) {
      expect(numbers).toContain(i);
    }
  });
});

describe("ICPQuestion type structure", () => {
  it("has required id property", () => {
    const question: ICPQuestion = icpQuestions[0];
    expect(question.id).toBeDefined();
    expect(typeof question.id).toBe("string");
  });

  it("has required axis property", () => {
    const question: ICPQuestion = icpQuestions[0];
    expect(question.axis).toBeDefined();
    expect(["dominance", "affiliation"]).toContain(question.axis);
  });

  it("has required text property", () => {
    const question: ICPQuestion = icpQuestions[0];
    expect(question.text).toBeDefined();
    expect(typeof question.text).toBe("string");
  });

  it("has required textKo property", () => {
    const question: ICPQuestion = icpQuestions[0];
    expect(question.textKo).toBeDefined();
    expect(typeof question.textKo).toBe("string");
  });

  it("has required options array", () => {
    const question: ICPQuestion = icpQuestions[0];
    expect(question.options).toBeDefined();
    expect(Array.isArray(question.options)).toBe(true);
  });
});

describe("ICPOption type structure", () => {
  it("has required id property", () => {
    const option: ICPOption = icpQuestions[0].options[0];
    expect(option.id).toBeDefined();
    expect(typeof option.id).toBe("string");
  });

  it("has required text property", () => {
    const option: ICPOption = icpQuestions[0].options[0];
    expect(option.text).toBeDefined();
    expect(typeof option.text).toBe("string");
  });

  it("has required textKo property", () => {
    const option: ICPOption = icpQuestions[0].options[0];
    expect(option.textKo).toBeDefined();
    expect(typeof option.textKo).toBe("string");
  });
});

describe("Bilingual consistency", () => {
  it("Korean text is in Korean characters", () => {
    for (const q of icpQuestions) {
      // Check that textKo contains at least some Korean characters
      expect(q.textKo).toMatch(/[\uAC00-\uD7AF]/); // Korean Hangul range
    }
  });

  it("English text does not contain Korean characters", () => {
    for (const q of icpQuestions) {
      expect(q.text).not.toMatch(/[\uAC00-\uD7AF]/);
    }
  });
});
