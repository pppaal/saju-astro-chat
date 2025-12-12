import { questions, TOTAL_QUESTIONS } from "@/lib/aura/questions";
import { EFFECTS } from "@/lib/aura/analysis";
import type { AuraAxisKey, AuraPole } from "@/lib/aura/types";

const AXES: AuraAxisKey[] = ["energy", "cognition", "decision", "rhythm"];
const POLES: AuraPole[] = [
  "radiant",
  "grounded",
  "visionary",
  "structured",
  "logic",
  "empathic",
  "flow",
  "anchor",
];

describe("Aura question/effects integrity", () => {
  it("TOTAL_QUESTIONS matches question list", () => {
    expect(questions.length).toBe(TOTAL_QUESTIONS);
  });

  it("every question has effects mapping and only A/B answers", () => {
    const ids = new Set(questions.map((q) => q.id));
    expect(Object.keys(EFFECTS).length).toBe(ids.size);

    for (const q of questions) {
      expect(EFFECTS[q.id]).toBeDefined();
      const answers = EFFECTS[q.id];
      const keys = Object.keys(answers);
      expect(keys.sort()).toEqual(["A", "B"]);
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
