import { PERSONA_ARCHETYPES } from "@/lib/persona/archetypes";

describe("Persona Archetypes", () => {
  const archetypeCodes = Object.keys(PERSONA_ARCHETYPES);

  describe("structure", () => {
    it("has 16 archetypes", () => {
      expect(archetypeCodes.length).toBe(16);
    });

    it("all codes follow 4-letter pattern", () => {
      archetypeCodes.forEach((code) => {
        expect(code).toMatch(/^[RG][VS][LH][AF]$/);
      });
    });

    it("all archetypes have required properties", () => {
      archetypeCodes.forEach((code) => {
        const archetype = PERSONA_ARCHETYPES[code];
        expect(archetype).toHaveProperty("code");
        expect(archetype).toHaveProperty("name");
        expect(archetype).toHaveProperty("summary");
        expect(archetype).toHaveProperty("strengths");
        expect(archetype).toHaveProperty("cautions");
        expect(archetype).toHaveProperty("idealRoles");
        expect(archetype).toHaveProperty("growth");
        expect(archetype).toHaveProperty("compatibilityHint");
      });
    });

    it("code property matches key", () => {
      archetypeCodes.forEach((code) => {
        expect(PERSONA_ARCHETYPES[code].code).toBe(code);
      });
    });
  });

  describe("content quality", () => {
    it("all archetypes have unique names", () => {
      const names = archetypeCodes.map((code) => PERSONA_ARCHETYPES[code].name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(16);
    });

    it("all archetypes have non-empty summaries", () => {
      archetypeCodes.forEach((code) => {
        const summary = PERSONA_ARCHETYPES[code].summary;
        expect(summary.length).toBeGreaterThan(100);
      });
    });

    it("all archetypes have at least 3 strengths", () => {
      archetypeCodes.forEach((code) => {
        expect(PERSONA_ARCHETYPES[code].strengths.length).toBeGreaterThanOrEqual(3);
      });
    });

    it("all archetypes have at least 1 caution", () => {
      archetypeCodes.forEach((code) => {
        expect(PERSONA_ARCHETYPES[code].cautions.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("all archetypes have at least 2 ideal roles", () => {
      archetypeCodes.forEach((code) => {
        expect(PERSONA_ARCHETYPES[code].idealRoles.length).toBeGreaterThanOrEqual(2);
      });
    });

    it("all archetypes have at least 1 growth suggestion", () => {
      archetypeCodes.forEach((code) => {
        expect(PERSONA_ARCHETYPES[code].growth.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("all archetypes have compatibility hints", () => {
      archetypeCodes.forEach((code) => {
        const hint = PERSONA_ARCHETYPES[code].compatibilityHint;
        expect(hint.length).toBeGreaterThan(20);
      });
    });
  });

  describe("4-axis combinations", () => {
    it("covers all Energy axis combinations (R/G)", () => {
      const radiant = archetypeCodes.filter((c) => c.startsWith("R"));
      const grounded = archetypeCodes.filter((c) => c.startsWith("G"));
      expect(radiant.length).toBe(8);
      expect(grounded.length).toBe(8);
    });

    it("covers all Cognition axis combinations (V/S)", () => {
      const visionary = archetypeCodes.filter((c) => c[1] === "V");
      const structured = archetypeCodes.filter((c) => c[1] === "S");
      expect(visionary.length).toBe(8);
      expect(structured.length).toBe(8);
    });

    it("covers all Decision axis combinations (L/H)", () => {
      const logic = archetypeCodes.filter((c) => c[2] === "L");
      const empathic = archetypeCodes.filter((c) => c[2] === "H");
      expect(logic.length).toBe(8);
      expect(empathic.length).toBe(8);
    });

    it("covers all Rhythm axis combinations (A/F)", () => {
      const anchor = archetypeCodes.filter((c) => c[3] === "A");
      const flow = archetypeCodes.filter((c) => c[3] === "F");
      expect(anchor.length).toBe(8);
      expect(flow.length).toBe(8);
    });
  });

  describe("specific archetypes", () => {
    it("RVLA is Starforge Architect", () => {
      expect(PERSONA_ARCHETYPES.RVLA.name).toBe("Starforge Architect");
    });

    it("RVLF is Catalyst Inventor", () => {
      expect(PERSONA_ARCHETYPES.RVLF.name).toBe("Catalyst Inventor");
    });

    it("GVLA is Quiet Architect", () => {
      expect(PERSONA_ARCHETYPES.GVLA.name).toBe("Quiet Architect");
    });

    it("RSHF is Warm Facilitator", () => {
      expect(PERSONA_ARCHETYPES.RSHF.name).toBe("Warm Facilitator");
    });
  });
});
