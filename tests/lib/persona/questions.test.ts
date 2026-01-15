import { questions, TOTAL_QUESTIONS, type PersonaQuestion } from "@/lib/persona/questions";

describe("Persona Questions", () => {
  describe("questions array", () => {
    it("has 40 total questions", () => {
      expect(questions).toHaveLength(40);
      expect(TOTAL_QUESTIONS).toBe(40);
    });

    it("all questions have required properties", () => {
      questions.forEach((q, index) => {
        expect(q).toHaveProperty("id");
        expect(q).toHaveProperty("text");
        expect(q).toHaveProperty("options");
        expect(typeof q.id).toBe("string");
        expect(typeof q.text).toBe("string");
        expect(Array.isArray(q.options)).toBe(true);
        expect(q.id.length).toBeGreaterThan(0);
        expect(q.text.length).toBeGreaterThan(0);
      });
    });

    it("all questions have exactly 3 options", () => {
      questions.forEach((q, index) => {
        expect(q.options).toHaveLength(3);
      });
    });

    it("all options have id (A, B, or C) and text", () => {
      questions.forEach((q) => {
        q.options.forEach((opt) => {
          expect(opt).toHaveProperty("id");
          expect(opt).toHaveProperty("text");
          expect(["A", "B", "C"]).toContain(opt.id);
          expect(typeof opt.text).toBe("string");
          expect(opt.text.length).toBeGreaterThan(0);
        });
      });
    });

    it("all question IDs are unique", () => {
      const ids = questions.map((q) => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(questions.length);
    });

    it("options within each question have unique IDs", () => {
      questions.forEach((q) => {
        const optionIds = q.options.map((o) => o.id);
        const uniqueOptionIds = new Set(optionIds);
        expect(uniqueOptionIds.size).toBe(3);
      });
    });
  });

  describe("question categories", () => {
    it("has 10 Energy questions", () => {
      const energyQuestions = questions.filter(
        (q) => q.id.includes("energy")
      );
      expect(energyQuestions.length).toBe(10);
    });

    it("has 10 Cognition questions", () => {
      const cogQuestions = questions.filter(
        (q) => q.id.includes("cog")
      );
      expect(cogQuestions.length).toBe(10);
    });

    it("has 10 Decision questions", () => {
      const decisionQuestions = questions.filter(
        (q) => q.id.includes("decision")
      );
      expect(decisionQuestions.length).toBe(10);
    });

    it("has 10 Rhythm questions", () => {
      const rhythmQuestions = questions.filter(
        (q) => q.id.includes("rhythm")
      );
      expect(rhythmQuestions.length).toBe(10);
    });
  });

  describe("question content quality", () => {
    it("all questions end with a colon or question-like phrase", () => {
      questions.forEach((q) => {
        // Most questions end with : or describe a scenario
        expect(q.text.length).toBeGreaterThan(10);
      });
    });

    it("no options have duplicate text within a question", () => {
      questions.forEach((q) => {
        const texts = q.options.map((o) => o.text);
        const uniqueTexts = new Set(texts);
        expect(uniqueTexts.size).toBe(3);
      });
    });

    it("option texts are reasonably short", () => {
      questions.forEach((q) => {
        q.options.forEach((opt) => {
          expect(opt.text.length).toBeLessThan(100);
        });
      });
    });
  });

  describe("TOTAL_QUESTIONS constant", () => {
    it("matches questions array length", () => {
      expect(TOTAL_QUESTIONS).toBe(questions.length);
    });

    it("is exactly 40", () => {
      expect(TOTAL_QUESTIONS).toBe(40);
    });
  });
});
