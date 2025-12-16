import { questions, TOTAL_QUESTIONS } from "@/lib/persona/questions";
import { EFFECTS } from "@/lib/persona/analysis";
import type { PersonaAxisKey, PersonaPole } from "@/lib/persona/types";

const AXES: PersonaAxisKey[] = ["energy", "cognition", "decision", "rhythm"];
const POLES: PersonaPole[] = [
  "radiant",
  "grounded",
  "visionary",
  "structured",
  "logic",
  "empathic",
  "flow",
  "anchor",
];

describe("Persona question/effects integrity", () => {
  it("TOTAL_QUESTIONS matches question list", () => {
    expect(questions.length).toBe(TOTAL_QUESTIONS);
  });

  it("every question has effects mapping and valid answers (A/B or A/B/C)", () => {
    const ids = new Set(questions.map((q) => q.id));
    expect(Object.keys(EFFECTS).length).toBe(ids.size);

    for (const q of questions) {
      expect(EFFECTS[q.id]).toBeDefined();
      const answers = EFFECTS[q.id];
      const keys = Object.keys(answers).sort();
      // Allow both binary (A/B) and ternary (A/B/C) question formats
      expect(keys).toEqual(["A", "B", "C"]);
    }
  });

  it("effects only use valid axes/poles and numeric weights", () => {
    for (const perQuestion of Object.values(EFFECTS)) {
      for (const perAnswer of Object.values(perQuestion)) {
        perAnswer.forEach((eff) => {
          expect(AXES).toContain(eff.axis);
          expect(POLES).toContain(eff.pole);
          expect(typeof eff.weight).toBe("number");
          expect(eff.weight).toBeGreaterThan(0);
        });
      }
    }
  });
});
