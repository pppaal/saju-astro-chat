// tests/lib/Saju/familyLineage.test.ts


import {
  analyzeElementHarmony,
  analyzeStemRelation,
  analyzeBranchRelation,
  analyzeRoleHarmony,
  analyzeInheritedTraits,
  analyzeConflictPoints,
  analyzeGenerationalPatterns,
  analyzeParentChild,
  analyzeSiblings,
  analyzeSpouse,
  analyzeFamilyDynamic,
  performCompleteFamilyAnalysis,
  type SajuResult,
  type FamilyMember,
  type FamilyRole,
  type ElementHarmonyResult,
  type StemRelationResult,
  type BranchRelationResult,
  type RoleHarmonyResult,
  type InheritedTrait,
  type ConflictPoint,
  type GenerationalPattern,
  type ParentChildAnalysis,
  type SiblingAnalysis,
  type SpouseAnalysis,
  type FamilyDynamic,
} from "../../../src/lib/Saju/familyLineage";

// 헬퍼 함수
function createSajuResult(
  year: [string, string],
  month: [string, string],
  day: [string, string],
  hour: [string, string]
): SajuResult {
  return {
    fourPillars: {
      year: { stem: year[0], branch: year[1] },
      month: { stem: month[0], branch: month[1] },
      day: { stem: day[0], branch: day[1] },
      hour: { stem: hour[0], branch: hour[1] },
    },
  };
}

function createFamilyMember(
  id: string,
  name: string,
  role: FamilyRole,
  gender: "male" | "female"
): FamilyMember {
  return {
    id,
    name,
    role,
    birthDate: new Date(1990, 0, 1),
    gender,
  };
}

// 샘플 사주
const fatherSaju = createSajuResult(
  ["甲", "寅"],
  ["丙", "午"],
  ["戊", "辰"],
  ["庚", "申"]
);

const motherSaju = createSajuResult(
  ["乙", "卯"],
  ["丁", "巳"],
  ["己", "丑"],
  ["辛", "酉"]
);

const childSaju = createSajuResult(
  ["丙", "午"],
  ["戊", "辰"],
  ["庚", "申"],
  ["壬", "子"]
);

const spouseSaju = createSajuResult(
  ["癸", "亥"],
  ["乙", "卯"],
  ["丁", "巳"],
  ["己", "未"]
);

describe("familyLineage - Element Harmony Analysis", () => {
  describe("analyzeElementHarmony", () => {
    it("returns proper ElementHarmonyResult structure", () => {
      const result = analyzeElementHarmony(fatherSaju, motherSaju);

      expect(result).toHaveProperty("dominant1");
      expect(result).toHaveProperty("dominant2");
      expect(result).toHaveProperty("relation");
      expect(result).toHaveProperty("score");
      expect(result).toHaveProperty("description");
    });

    it("identifies dominant elements", () => {
      const result = analyzeElementHarmony(fatherSaju, childSaju);

      const validElements = ["목", "화", "토", "금", "수"];
      expect(validElements).toContain(result.dominant1);
      expect(validElements).toContain(result.dominant2);
    });

    it("relation is valid type", () => {
      const result = analyzeElementHarmony(fatherSaju, motherSaju);

      const validRelations = ["상생", "상극", "비화", "균형"];
      expect(validRelations).toContain(result.relation);
    });

    it("score is between 0 and 100", () => {
      const result = analyzeElementHarmony(fatherSaju, childSaju);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("description is non-empty string", () => {
      const result = analyzeElementHarmony(motherSaju, childSaju);

      expect(result.description.length).toBeGreaterThan(0);
    });

    it("identifies 비화 when same dominant elements", () => {
      // 같은 사주 비교
      const result = analyzeElementHarmony(fatherSaju, fatherSaju);

      expect(result.relation).toBe("비화");
    });
  });
});

describe("familyLineage - Stem Relation Analysis", () => {
  describe("analyzeStemRelation", () => {
    it("returns proper StemRelationResult structure", () => {
      const result = analyzeStemRelation(fatherSaju, motherSaju);

      expect(result).toHaveProperty("dayMasterRelation");
      expect(result).toHaveProperty("合");
      expect(result).toHaveProperty("沖");
      expect(result).toHaveProperty("score");
    });

    it("合 is array of string", () => {
      const result = analyzeStemRelation(fatherSaju, motherSaju);

      expect(Array.isArray(result.合)).toBe(true);
    });

    it("沖 is array of string", () => {
      const result = analyzeStemRelation(fatherSaju, childSaju);

      expect(Array.isArray(result.沖)).toBe(true);
    });

    it("score is between 0 and 100", () => {
      const result = analyzeStemRelation(motherSaju, childSaju);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it("dayMasterRelation describes the relationship", () => {
      const result = analyzeStemRelation(fatherSaju, motherSaju);

      expect(result.dayMasterRelation.length).toBeGreaterThan(0);
    });
  });
});

describe("familyLineage - Branch Relation Analysis", () => {
  describe("analyzeBranchRelation", () => {
    it("returns proper BranchRelationResult structure", () => {
      const result = analyzeBranchRelation(fatherSaju, motherSaju);

      expect(result).toHaveProperty("三合");
      expect(result).toHaveProperty("六合");
      expect(result).toHaveProperty("沖");
      expect(result).toHaveProperty("刑");
      expect(result).toHaveProperty("score");
    });

    it("三合 is array", () => {
      const result = analyzeBranchRelation(fatherSaju, childSaju);
      expect(Array.isArray(result.三合)).toBe(true);
    });

    it("六合 is array", () => {
      const result = analyzeBranchRelation(motherSaju, spouseSaju);
      expect(Array.isArray(result.六合)).toBe(true);
    });

    it("沖 is array", () => {
      const result = analyzeBranchRelation(fatherSaju, motherSaju);
      expect(Array.isArray(result.沖)).toBe(true);
    });

    it("score is between 0 and 100", () => {
      const result = analyzeBranchRelation(childSaju, spouseSaju);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });
});

describe("familyLineage - Role Harmony Analysis", () => {
  describe("analyzeRoleHarmony", () => {
    it("returns proper RoleHarmonyResult structure", () => {
      const member = createFamilyMember("1", "Father", "father", "male");
      const result = analyzeRoleHarmony(member, fatherSaju);

      expect(result).toHaveProperty("expectedRole");
      expect(result).toHaveProperty("actualEnergy");
      expect(result).toHaveProperty("alignment");
      expect(result).toHaveProperty("suggestions");
    });

    it("alignment is valid value", () => {
      const member = createFamilyMember("2", "Mother", "mother", "female");
      const result = analyzeRoleHarmony(member, motherSaju);

      const validAlignments = ["strong", "moderate", "weak", "conflict"];
      expect(validAlignments).toContain(result.alignment);
    });

    it("suggestions is array of strings", () => {
      const member = createFamilyMember("3", "Child", "child", "male");
      const result = analyzeRoleHarmony(member, childSaju);

      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it("works for all family roles", () => {
      const roles: FamilyRole[] = [
        "father", "mother", "self", "spouse", "child", "sibling", "grandparent"
      ];

      for (const role of roles) {
        const member = createFamilyMember("test", "Test", role, "male");
        expect(() => analyzeRoleHarmony(member, fatherSaju)).not.toThrow();
      }
    });
  });
});

describe("familyLineage - Inherited Traits Analysis", () => {
  describe("analyzeInheritedTraits", () => {
    it("returns array of InheritedTrait", () => {
      const result = analyzeInheritedTraits(childSaju, fatherSaju, motherSaju);

      expect(Array.isArray(result)).toBe(true);
    });

    it("each trait has required properties", () => {
      const result = analyzeInheritedTraits(childSaju, fatherSaju, motherSaju);

      for (const trait of result) {
        expect(trait).toHaveProperty("trait");
        expect(trait).toHaveProperty("source");
        expect(trait).toHaveProperty("element");
        expect(trait).toHaveProperty("manifestation");
        expect(trait).toHaveProperty("strength");
      }
    });

    it("source is valid value", () => {
      const result = analyzeInheritedTraits(childSaju, fatherSaju, motherSaju);

      const validSources = ["father", "mother", "both", "unique"];
      for (const trait of result) {
        expect(validSources).toContain(trait.source);
      }
    });

    it("strength is valid value", () => {
      const result = analyzeInheritedTraits(childSaju, fatherSaju, motherSaju);

      const validStrengths = ["strong", "moderate", "latent"];
      for (const trait of result) {
        expect(validStrengths).toContain(trait.strength);
      }
    });

    it("handles missing father", () => {
      const result = analyzeInheritedTraits(childSaju, undefined, motherSaju);
      expect(result.length).toBeGreaterThan(0);
    });

    it("handles missing mother", () => {
      const result = analyzeInheritedTraits(childSaju, fatherSaju, undefined);
      expect(result.length).toBeGreaterThan(0);
    });

    it("handles both parents missing", () => {
      const result = analyzeInheritedTraits(childSaju);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

describe("familyLineage - Conflict Points Analysis", () => {
  describe("analyzeConflictPoints", () => {
    it("returns array of ConflictPoint", () => {
      const members = [
        createFamilyMember("1", "Father", "father", "male"),
        createFamilyMember("2", "Mother", "mother", "female"),
      ];
      const sajuMap = new Map<string, SajuResult>();
      sajuMap.set("1", fatherSaju);
      sajuMap.set("2", motherSaju);

      const result = analyzeConflictPoints(members, sajuMap);
      expect(Array.isArray(result)).toBe(true);
    });

    it("conflict has required properties", () => {
      const members = [
        createFamilyMember("1", "Father", "father", "male"),
        createFamilyMember("2", "Mother", "mother", "female"),
        createFamilyMember("3", "Child", "child", "male"),
      ];
      const sajuMap = new Map<string, SajuResult>();
      sajuMap.set("1", fatherSaju);
      sajuMap.set("2", motherSaju);
      sajuMap.set("3", childSaju);

      const result = analyzeConflictPoints(members, sajuMap);

      for (const conflict of result) {
        expect(conflict).toHaveProperty("area");
        expect(conflict).toHaveProperty("severity");
        expect(conflict).toHaveProperty("members");
        expect(conflict).toHaveProperty("resolution");
      }
    });

    it("severity is valid value", () => {
      const members = [
        createFamilyMember("1", "A", "father", "male"),
        createFamilyMember("2", "B", "mother", "female"),
      ];
      const sajuMap = new Map<string, SajuResult>();
      sajuMap.set("1", fatherSaju);
      sajuMap.set("2", motherSaju);

      const result = analyzeConflictPoints(members, sajuMap);

      const validSeverities = ["major", "minor", "latent"];
      for (const conflict of result) {
        expect(validSeverities).toContain(conflict.severity);
      }
    });

    it("handles empty members array", () => {
      const result = analyzeConflictPoints([], new Map());
      expect(result).toHaveLength(0);
    });

    it("handles single member", () => {
      const members = [createFamilyMember("1", "Solo", "self", "male")];
      const sajuMap = new Map<string, SajuResult>();
      sajuMap.set("1", fatherSaju);

      const result = analyzeConflictPoints(members, sajuMap);
      expect(result).toHaveLength(0);
    });
  });
});

describe("familyLineage - Generational Patterns Analysis", () => {
  describe("analyzeGenerationalPatterns", () => {
    it("returns array of GenerationalPattern", () => {
      const result = analyzeGenerationalPatterns(
        [fatherSaju],
        [motherSaju],
        [childSaju]
      );

      expect(Array.isArray(result)).toBe(true);
    });

    it("pattern has required properties", () => {
      const result = analyzeGenerationalPatterns(
        [fatherSaju],
        [motherSaju, fatherSaju],
        [childSaju, spouseSaju]
      );

      for (const pattern of result) {
        expect(pattern).toHaveProperty("pattern");
        expect(pattern).toHaveProperty("description");
        expect(pattern).toHaveProperty("affectedElements");
        expect(pattern).toHaveProperty("manifestation");
        expect(pattern).toHaveProperty("karmaType");
      }
    });

    it("karmaType is valid value", () => {
      const result = analyzeGenerationalPatterns(
        [motherSaju],
        [fatherSaju],
        [childSaju]
      );

      const validTypes = ["positive", "negative", "transformative"];
      for (const pattern of result) {
        expect(validTypes).toContain(pattern.karmaType);
      }
    });

    it("handles empty arrays", () => {
      const result = analyzeGenerationalPatterns([], [], []);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("handles single generation", () => {
      const result = analyzeGenerationalPatterns([], [], [childSaju]);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe("familyLineage - Parent-Child Analysis", () => {
  describe("analyzeParentChild", () => {
    it("returns proper ParentChildAnalysis structure", () => {
      const result = analyzeParentChild(fatherSaju, childSaju, "father");

      expect(result).toHaveProperty("nurturingStyle");
      expect(result).toHaveProperty("learningStyle");
      expect(result).toHaveProperty("communicationGap");
      expect(result).toHaveProperty("growthOpportunities");
      expect(result).toHaveProperty("karmicLessons");
      expect(result).toHaveProperty("supportStrategies");
    });

    it("arrays are non-empty", () => {
      const result = analyzeParentChild(motherSaju, childSaju, "mother");

      expect(result.communicationGap.length).toBeGreaterThan(0);
      expect(result.growthOpportunities.length).toBeGreaterThan(0);
      expect(result.karmicLessons.length).toBeGreaterThan(0);
      expect(result.supportStrategies.length).toBeGreaterThan(0);
    });

    it("nurturingStyle is descriptive", () => {
      const result = analyzeParentChild(fatherSaju, childSaju, "father");
      expect(result.nurturingStyle.length).toBeGreaterThan(0);
    });

    it("learningStyle is descriptive", () => {
      const result = analyzeParentChild(motherSaju, childSaju, "mother");
      expect(result.learningStyle.length).toBeGreaterThan(0);
    });

    it("works for both parent roles", () => {
      const fatherResult = analyzeParentChild(fatherSaju, childSaju, "father");
      const motherResult = analyzeParentChild(motherSaju, childSaju, "mother");

      expect(fatherResult).toBeDefined();
      expect(motherResult).toBeDefined();
    });
  });
});

describe("familyLineage - Sibling Analysis", () => {
  describe("analyzeSiblings", () => {
    it("returns proper SiblingAnalysis structure", () => {
      const siblings = [childSaju, spouseSaju];
      const names = ["Child1", "Child2"];
      const result = analyzeSiblings(siblings, names);

      expect(result).toHaveProperty("birthOrderInfluence");
      expect(result).toHaveProperty("elementDistribution");
      expect(result).toHaveProperty("conflictPotential");
      expect(result).toHaveProperty("cooperationAreas");
      expect(result).toHaveProperty("inheritancePatterns");
    });

    it("elementDistribution has all five elements", () => {
      const siblings = [childSaju, spouseSaju];
      const result = analyzeSiblings(siblings, ["A", "B"]);

      expect(result.elementDistribution).toHaveProperty("목");
      expect(result.elementDistribution).toHaveProperty("화");
      expect(result.elementDistribution).toHaveProperty("토");
      expect(result.elementDistribution).toHaveProperty("금");
      expect(result.elementDistribution).toHaveProperty("수");
    });

    it("handles single sibling", () => {
      const result = analyzeSiblings([childSaju], ["Only"]);

      expect(result.birthOrderInfluence).toContain("외동");
    });

    it("conflictPotential and cooperationAreas are arrays", () => {
      const result = analyzeSiblings([childSaju, spouseSaju], ["A", "B"]);

      expect(Array.isArray(result.conflictPotential)).toBe(true);
      expect(Array.isArray(result.cooperationAreas)).toBe(true);
    });
  });
});

describe("familyLineage - Spouse Analysis", () => {
  describe("analyzeSpouse", () => {
    it("returns proper SpouseAnalysis structure", () => {
      const result = analyzeSpouse(fatherSaju, motherSaju, 2020);

      expect(result).toHaveProperty("marriageQuality");
      expect(result).toHaveProperty("complementaryAspects");
      expect(result).toHaveProperty("frictionAreas");
      expect(result).toHaveProperty("growthTogether");
      expect(result).toHaveProperty("yearlyForecast");
    });

    it("marriageQuality is descriptive", () => {
      const result = analyzeSpouse(childSaju, spouseSaju, 2024);
      expect(result.marriageQuality.length).toBeGreaterThan(0);
    });

    it("yearlyForecast covers 5 years", () => {
      const result = analyzeSpouse(fatherSaju, motherSaju, 2020);
      expect(result.yearlyForecast).toHaveLength(5);
    });

    it("yearlyForecast has year and theme", () => {
      const result = analyzeSpouse(fatherSaju, motherSaju, 2020);

      for (const forecast of result.yearlyForecast) {
        expect(forecast).toHaveProperty("year");
        expect(forecast).toHaveProperty("theme");
      }
    });

    it("yearlyForecast years are sequential from marriage year", () => {
      const marriageYear = 2020;
      const result = analyzeSpouse(fatherSaju, motherSaju, marriageYear);

      for (let i = 0; i < 5; i++) {
        expect(result.yearlyForecast[i].year).toBe(marriageYear + i);
      }
    });

    it("arrays contain strings", () => {
      const result = analyzeSpouse(childSaju, spouseSaju, 2024);

      expect(Array.isArray(result.complementaryAspects)).toBe(true);
      expect(Array.isArray(result.frictionAreas)).toBe(true);
      expect(Array.isArray(result.growthTogether)).toBe(true);
    });
  });
});

describe("familyLineage - Family Dynamic Analysis", () => {
  describe("analyzeFamilyDynamic", () => {
    it("returns proper FamilyDynamic structure", () => {
      const members = [
        createFamilyMember("1", "Father", "father", "male"),
        createFamilyMember("2", "Mother", "mother", "female"),
      ];
      const sajuMap = new Map<string, SajuResult>();
      sajuMap.set("1", fatherSaju);
      sajuMap.set("2", motherSaju);

      const result = analyzeFamilyDynamic(members, sajuMap);

      expect(result).toHaveProperty("overallHarmony");
      expect(result).toHaveProperty("dominantElement");
      expect(result).toHaveProperty("weakElement");
      expect(result).toHaveProperty("familyKarma");
      expect(result).toHaveProperty("generationalPatterns");
      expect(result).toHaveProperty("collectiveLessons");
      expect(result).toHaveProperty("strengthenFamily");
    });

    it("overallHarmony is between 0 and 100", () => {
      const members = [
        createFamilyMember("1", "A", "father", "male"),
        createFamilyMember("2", "B", "mother", "female"),
        createFamilyMember("3", "C", "child", "male"),
      ];
      const sajuMap = new Map<string, SajuResult>();
      sajuMap.set("1", fatherSaju);
      sajuMap.set("2", motherSaju);
      sajuMap.set("3", childSaju);

      const result = analyzeFamilyDynamic(members, sajuMap);

      expect(result.overallHarmony).toBeGreaterThanOrEqual(0);
      expect(result.overallHarmony).toBeLessThanOrEqual(100);
    });

    it("dominantElement and weakElement are valid", () => {
      const members = [createFamilyMember("1", "A", "self", "male")];
      const sajuMap = new Map<string, SajuResult>();
      sajuMap.set("1", fatherSaju);

      const result = analyzeFamilyDynamic(members, sajuMap);

      const validElements = ["목", "화", "토", "금", "수"];
      expect(validElements).toContain(result.dominantElement);
      expect(validElements).toContain(result.weakElement);
    });

    it("strengthenFamily has suggestions", () => {
      const members = [
        createFamilyMember("1", "A", "father", "male"),
        createFamilyMember("2", "B", "mother", "female"),
      ];
      const sajuMap = new Map<string, SajuResult>();
      sajuMap.set("1", fatherSaju);
      sajuMap.set("2", motherSaju);

      const result = analyzeFamilyDynamic(members, sajuMap);

      expect(result.strengthenFamily.length).toBeGreaterThan(0);
    });
  });
});

describe("familyLineage - Complete Family Analysis", () => {
  describe("performCompleteFamilyAnalysis", () => {
    it("returns comprehensive result", () => {
      const members = [
        createFamilyMember("1", "Father", "father", "male"),
        createFamilyMember("2", "Mother", "mother", "female"),
        createFamilyMember("3", "Child", "child", "male"),
      ];
      const sajuMap = new Map<string, SajuResult>();
      sajuMap.set("1", fatherSaju);
      sajuMap.set("2", motherSaju);
      sajuMap.set("3", childSaju);

      const result = performCompleteFamilyAnalysis(members, sajuMap);

      expect(result).toHaveProperty("familyDynamic");
      expect(result).toHaveProperty("memberRoles");
      expect(result).toHaveProperty("relations");
      expect(result).toHaveProperty("conflicts");
      expect(result).toHaveProperty("recommendations");
    });

    it("memberRoles is a Map", () => {
      const members = [createFamilyMember("1", "A", "self", "male")];
      const sajuMap = new Map<string, SajuResult>();
      sajuMap.set("1", fatherSaju);

      const result = performCompleteFamilyAnalysis(members, sajuMap);

      expect(result.memberRoles).toBeInstanceOf(Map);
    });

    it("relations covers all member pairs", () => {
      const members = [
        createFamilyMember("1", "A", "father", "male"),
        createFamilyMember("2", "B", "mother", "female"),
        createFamilyMember("3", "C", "child", "male"),
      ];
      const sajuMap = new Map<string, SajuResult>();
      sajuMap.set("1", fatherSaju);
      sajuMap.set("2", motherSaju);
      sajuMap.set("3", childSaju);

      const result = performCompleteFamilyAnalysis(members, sajuMap);

      // 3 members = 3 pairs (3C2)
      expect(result.relations.length).toBe(3);
    });

    it("recommendations is array of strings", () => {
      const members = [
        createFamilyMember("1", "A", "father", "male"),
        createFamilyMember("2", "B", "mother", "female"),
      ];
      const sajuMap = new Map<string, SajuResult>();
      sajuMap.set("1", fatherSaju);
      sajuMap.set("2", motherSaju);

      const result = performCompleteFamilyAnalysis(members, sajuMap);

      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it("handles empty family", () => {
      const result = performCompleteFamilyAnalysis([], new Map());

      expect(result.relations).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
    });
  });
});

describe("familyLineage - Edge Cases", () => {
  it("handles saju with all same stems", () => {
    const sameStemSaju = createSajuResult(
      ["甲", "子"],
      ["甲", "丑"],
      ["甲", "寅"],
      ["甲", "卯"]
    );

    expect(() => analyzeElementHarmony(sameStemSaju, fatherSaju)).not.toThrow();
  });

  it("handles saju with all same branches", () => {
    const sameBranchSaju = createSajuResult(
      ["甲", "子"],
      ["乙", "子"],
      ["丙", "子"],
      ["丁", "子"]
    );

    expect(() => analyzeBranchRelation(sameBranchSaju, motherSaju)).not.toThrow();
  });

  it("handles large family", () => {
    const members: FamilyMember[] = [];
    const sajuMap = new Map<string, SajuResult>();

    for (let i = 0; i < 10; i++) {
      members.push(createFamilyMember(`${i}`, `Member${i}`, "sibling", "male"));
      sajuMap.set(`${i}`, fatherSaju);
    }

    expect(() => performCompleteFamilyAnalysis(members, sajuMap)).not.toThrow();
  });
});
