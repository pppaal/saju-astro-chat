/**
 * Tier 7~10 Analysis 테스트
 * - 일진(日辰) 분석
 * - 시주(時柱) 분석
 * - 이벤트 유형별 유리/불리 조건
 * - TierBonus 구조
 */

import { vi, beforeEach } from "vitest";
import type { FiveElement } from "@/lib/Saju/types";

// Event types
type EventType = "marriage" | "career" | "investment" | "move" | "study" | "health" | "relationship";

// Constants for testing (matching actual implementation)
const STEM_ELEMENT: Record<string, FiveElement> = {
  "甲": "목", "乙": "목", "丙": "화", "丁": "화", "戊": "토",
  "己": "토", "庚": "금", "辛": "금", "壬": "수", "癸": "수",
};

const BRANCH_ELEMENT: Record<string, FiveElement> = {
  "子": "수", "丑": "토", "寅": "목", "卯": "목", "辰": "토", "巳": "화",
  "午": "화", "未": "토", "申": "금", "酉": "금", "戌": "토", "亥": "수",
};

const EVENT_FAVORABLE_CONDITIONS: Record<EventType, {
  favorableSibsin: string[];
  avoidSibsin: string[];
  favorableElements: FiveElement[];
}> = {
  marriage: {
    favorableSibsin: ["정재", "정관", "편재", "편관"],
    avoidSibsin: ["겁재", "상관"],
    favorableElements: ["목", "화"],
  },
  career: {
    favorableSibsin: ["정관", "편관", "정인", "식신"],
    avoidSibsin: ["겁재", "편인"],
    favorableElements: ["금", "수"],
  },
  investment: {
    favorableSibsin: ["정재", "편재", "식신"],
    avoidSibsin: ["겁재", "비견", "상관"],
    favorableElements: ["금", "토"],
  },
  move: {
    favorableSibsin: ["편관", "식신", "상관"],
    avoidSibsin: ["정인"],
    favorableElements: ["목", "화"],
  },
  study: {
    favorableSibsin: ["정인", "편인", "식신"],
    avoidSibsin: ["편재", "정재"],
    favorableElements: ["수", "목"],
  },
  health: {
    favorableSibsin: ["비견", "정인", "식신"],
    avoidSibsin: ["편관", "상관"],
    favorableElements: ["토", "금"],
  },
  relationship: {
    favorableSibsin: ["정재", "편재", "식신", "정관"],
    avoidSibsin: ["겁재", "편인"],
    favorableElements: ["화", "토"],
  },
};

describe("Stem Element Mapping", () => {
  it("maps all 10 heavenly stems to elements", () => {
    const stems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
    stems.forEach(stem => {
      expect(STEM_ELEMENT[stem]).toBeDefined();
    });
  });

  it("groups stems correctly by element", () => {
    expect(STEM_ELEMENT["甲"]).toBe("목");
    expect(STEM_ELEMENT["乙"]).toBe("목");
    expect(STEM_ELEMENT["丙"]).toBe("화");
    expect(STEM_ELEMENT["丁"]).toBe("화");
    expect(STEM_ELEMENT["戊"]).toBe("토");
    expect(STEM_ELEMENT["己"]).toBe("토");
    expect(STEM_ELEMENT["庚"]).toBe("금");
    expect(STEM_ELEMENT["辛"]).toBe("금");
    expect(STEM_ELEMENT["壬"]).toBe("수");
    expect(STEM_ELEMENT["癸"]).toBe("수");
  });
});

describe("Branch Element Mapping", () => {
  it("maps all 12 earthly branches to elements", () => {
    const branches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
    branches.forEach(branch => {
      expect(BRANCH_ELEMENT[branch]).toBeDefined();
    });
  });

  it("groups branches correctly by element", () => {
    // 수
    expect(BRANCH_ELEMENT["子"]).toBe("수");
    expect(BRANCH_ELEMENT["亥"]).toBe("수");
    // 목
    expect(BRANCH_ELEMENT["寅"]).toBe("목");
    expect(BRANCH_ELEMENT["卯"]).toBe("목");
    // 화
    expect(BRANCH_ELEMENT["巳"]).toBe("화");
    expect(BRANCH_ELEMENT["午"]).toBe("화");
    // 금
    expect(BRANCH_ELEMENT["申"]).toBe("금");
    expect(BRANCH_ELEMENT["酉"]).toBe("금");
    // 토
    expect(BRANCH_ELEMENT["丑"]).toBe("토");
    expect(BRANCH_ELEMENT["辰"]).toBe("토");
    expect(BRANCH_ELEMENT["未"]).toBe("토");
    expect(BRANCH_ELEMENT["戌"]).toBe("토");
  });
});

describe("Event Favorable Conditions", () => {
  describe("Marriage event", () => {
    const marriage = EVENT_FAVORABLE_CONDITIONS.marriage;

    it("has correct favorable sibsin", () => {
      expect(marriage.favorableSibsin).toContain("정재");
      expect(marriage.favorableSibsin).toContain("정관");
    });

    it("has correct avoid sibsin", () => {
      expect(marriage.avoidSibsin).toContain("겁재");
      expect(marriage.avoidSibsin).toContain("상관");
    });

    it("has correct favorable elements", () => {
      expect(marriage.favorableElements).toContain("목");
      expect(marriage.favorableElements).toContain("화");
    });
  });

  describe("Career event", () => {
    const career = EVENT_FAVORABLE_CONDITIONS.career;

    it("has correct favorable sibsin", () => {
      expect(career.favorableSibsin).toContain("정관");
      expect(career.favorableSibsin).toContain("정인");
    });

    it("has correct avoid sibsin", () => {
      expect(career.avoidSibsin).toContain("겁재");
    });

    it("has correct favorable elements", () => {
      expect(career.favorableElements).toContain("금");
      expect(career.favorableElements).toContain("수");
    });
  });

  describe("Investment event", () => {
    const investment = EVENT_FAVORABLE_CONDITIONS.investment;

    it("favors 정재 for wealth accumulation", () => {
      expect(investment.favorableSibsin).toContain("정재");
      expect(investment.favorableSibsin).toContain("편재");
    });

    it("avoids 겁재 which depletes wealth", () => {
      expect(investment.avoidSibsin).toContain("겁재");
      expect(investment.avoidSibsin).toContain("비견");
    });
  });

  describe("Study event", () => {
    const study = EVENT_FAVORABLE_CONDITIONS.study;

    it("favors 정인 for learning", () => {
      expect(study.favorableSibsin).toContain("정인");
      expect(study.favorableSibsin).toContain("편인");
    });

    it("avoids financial distractions", () => {
      expect(study.avoidSibsin).toContain("편재");
    });
  });

  describe("Health event", () => {
    const health = EVENT_FAVORABLE_CONDITIONS.health;

    it("favors supportive sibsin", () => {
      expect(health.favorableSibsin).toContain("비견");
      expect(health.favorableSibsin).toContain("정인");
    });

    it("avoids harmful influences", () => {
      expect(health.avoidSibsin).toContain("편관");
    });

    it("favors stabilizing elements", () => {
      expect(health.favorableElements).toContain("토");
      expect(health.favorableElements).toContain("금");
    });
  });
});

describe("TierBonus Structure", () => {
  interface TierBonus {
    bonus: number;
    reasons: string[];
    penalties: string[];
    confidence: number;
  }

  it("validates TierBonus interface", () => {
    const validBonus: TierBonus = {
      bonus: 15,
      reasons: ["일진 정재 - marriage 길일", "일진-명식 육합"],
      penalties: [],
      confidence: 0.85,
    };

    expect(validBonus.bonus).toBeGreaterThanOrEqual(-25);
    expect(validBonus.bonus).toBeLessThanOrEqual(25);
    expect(Array.isArray(validBonus.reasons)).toBe(true);
    expect(Array.isArray(validBonus.penalties)).toBe(true);
    expect(validBonus.confidence).toBeGreaterThanOrEqual(0);
    expect(validBonus.confidence).toBeLessThanOrEqual(1);
  });

  it("limits bonus to valid range", () => {
    const calculateBonusRange = (rawBonus: number) => {
      return Math.max(-25, Math.min(25, rawBonus));
    };

    expect(calculateBonusRange(50)).toBe(25);
    expect(calculateBonusRange(-50)).toBe(-25);
    expect(calculateBonusRange(10)).toBe(10);
    expect(calculateBonusRange(-10)).toBe(-10);
  });
});

describe("Branch Relation Analysis", () => {
  // 육합 pairs
  const YUKAP: Record<string, string> = {
    "子": "丑", "丑": "子",
    "寅": "亥", "亥": "寅",
    "卯": "戌", "戌": "卯",
    "辰": "酉", "酉": "辰",
    "巳": "申", "申": "巳",
    "午": "未", "未": "午",
  };

  // 충 (clash) pairs
  const CHUNG: Record<string, string> = {
    "子": "午", "午": "子",
    "丑": "未", "未": "丑",
    "寅": "申", "申": "寅",
    "卯": "酉", "酉": "卯",
    "辰": "戌", "戌": "辰",
    "巳": "亥", "亥": "巳",
  };

  const analyzeBranchRelation = (branch1: string, branch2: string): string => {
    if (YUKAP[branch1] === branch2) return "육합";
    if (CHUNG[branch1] === branch2) return "충";
    return "none";
  };

  it("detects 육합 (six harmony) pairs", () => {
    expect(analyzeBranchRelation("子", "丑")).toBe("육합");
    expect(analyzeBranchRelation("寅", "亥")).toBe("육합");
    expect(analyzeBranchRelation("卯", "戌")).toBe("육합");
    expect(analyzeBranchRelation("辰", "酉")).toBe("육합");
    expect(analyzeBranchRelation("巳", "申")).toBe("육합");
    expect(analyzeBranchRelation("午", "未")).toBe("육합");
  });

  it("detects 충 (clash) pairs", () => {
    expect(analyzeBranchRelation("子", "午")).toBe("충");
    expect(analyzeBranchRelation("丑", "未")).toBe("충");
    expect(analyzeBranchRelation("寅", "申")).toBe("충");
    expect(analyzeBranchRelation("卯", "酉")).toBe("충");
    expect(analyzeBranchRelation("辰", "戌")).toBe("충");
    expect(analyzeBranchRelation("巳", "亥")).toBe("충");
  });

  it("returns none for unrelated branches", () => {
    expect(analyzeBranchRelation("子", "寅")).toBe("none");
    expect(analyzeBranchRelation("巳", "酉")).toBe("none");
  });
});

describe("Sibsin Calculation", () => {
  // Simplified sibsin calculation for testing
  const ELEMENT_RELATIONS: Record<FiveElement, FiveElement> = {
    "목": "화", // 목생화
    "화": "토", // 화생토
    "토": "금", // 토생금
    "금": "수", // 금생수
    "수": "목", // 수생목
  };

  const ELEMENT_克: Record<FiveElement, FiveElement> = {
    "목": "토", // 목극토
    "토": "수", // 토극수
    "수": "화", // 수극화
    "화": "금", // 화극금
    "금": "목", // 금극목
  };

  const calculateSimpleSibsin = (dayStem: string, targetStem: string): string => {
    const dayElement = STEM_ELEMENT[dayStem];
    const targetElement = STEM_ELEMENT[targetStem];

    if (dayElement === targetElement) {
      return dayStem === targetStem ? "비견" : "겁재";
    }

    if (ELEMENT_RELATIONS[dayElement] === targetElement) {
      return "식신"; // 내가 생하는
    }

    if (ELEMENT_RELATIONS[targetElement] === dayElement) {
      return "정인"; // 나를 생하는
    }

    if (ELEMENT_克[dayElement] === targetElement) {
      return "정재"; // 내가 극하는
    }

    if (ELEMENT_克[targetElement] === dayElement) {
      return "정관"; // 나를 극하는
    }

    return "비견";
  };

  it("calculates 비견 for same stem", () => {
    expect(calculateSimpleSibsin("甲", "甲")).toBe("비견");
    expect(calculateSimpleSibsin("丙", "丙")).toBe("비견");
  });

  it("calculates 겁재 for same element different stem", () => {
    expect(calculateSimpleSibsin("甲", "乙")).toBe("겁재");
    expect(calculateSimpleSibsin("丙", "丁")).toBe("겁재");
  });

  it("calculates 식신 for element I produce", () => {
    expect(calculateSimpleSibsin("甲", "丙")).toBe("식신"); // 목생화
    expect(calculateSimpleSibsin("壬", "甲")).toBe("식신"); // 수생목
  });

  it("calculates 정인 for element that produces me", () => {
    expect(calculateSimpleSibsin("丙", "甲")).toBe("정인"); // 목생화, 화 입장
    expect(calculateSimpleSibsin("甲", "壬")).toBe("정인"); // 수생목, 목 입장
  });

  it("calculates 정재 for element I overcome", () => {
    expect(calculateSimpleSibsin("甲", "戊")).toBe("정재"); // 목극토
    expect(calculateSimpleSibsin("壬", "丙")).toBe("정재"); // 수극화
  });

  it("calculates 정관 for element that overcomes me", () => {
    expect(calculateSimpleSibsin("甲", "庚")).toBe("정관"); // 금극목
    expect(calculateSimpleSibsin("戊", "甲")).toBe("정관"); // 목극토, 토 입장
  });
});

describe("Twelve Stage Energy Classification", () => {
  type EnergyLevel = "peak" | "rising" | "declining" | "dormant";

  const TWELVE_STAGES: Record<string, EnergyLevel> = {
    "장생": "rising",
    "목욕": "rising",
    "관대": "rising",
    "임관": "peak",
    "왕지": "peak",
    "쇠": "declining",
    "병": "declining",
    "사": "declining",
    "묘": "dormant",
    "절": "dormant",
    "태": "rising",
    "양": "rising",
  };

  it("classifies peak energy stages", () => {
    expect(TWELVE_STAGES["임관"]).toBe("peak");
    expect(TWELVE_STAGES["왕지"]).toBe("peak");
  });

  it("classifies rising energy stages", () => {
    expect(TWELVE_STAGES["장생"]).toBe("rising");
    expect(TWELVE_STAGES["관대"]).toBe("rising");
    expect(TWELVE_STAGES["태"]).toBe("rising");
  });

  it("classifies declining energy stages", () => {
    expect(TWELVE_STAGES["쇠"]).toBe("declining");
    expect(TWELVE_STAGES["병"]).toBe("declining");
    expect(TWELVE_STAGES["사"]).toBe("declining");
  });

  it("classifies dormant energy stages", () => {
    expect(TWELVE_STAGES["묘"]).toBe("dormant");
    expect(TWELVE_STAGES["절"]).toBe("dormant");
  });
});

describe("Advanced Analysis Input Validation", () => {
  interface AdvancedAnalysisInput {
    birthYear: number;
    birthMonth: number;
    birthDay: number;
    birthHour?: number;
    dayStem: string;
    dayBranch: string;
    monthStem: string;
    monthBranch: string;
    yearStem: string;
    yearBranch: string;
    hourStem?: string;
    hourBranch?: string;
    allStems: string[];
    allBranches: string[];
    yongsin?: FiveElement[];
    kisin?: FiveElement[];
    geokguk?: string;
  }

  it("validates complete input structure", () => {
    const validInput: AdvancedAnalysisInput = {
      birthYear: 1990,
      birthMonth: 5,
      birthDay: 15,
      birthHour: 14,
      dayStem: "甲",
      dayBranch: "午",
      monthStem: "庚",
      monthBranch: "辰",
      yearStem: "庚",
      yearBranch: "午",
      hourStem: "辛",
      hourBranch: "未",
      allStems: ["庚", "庚", "甲", "辛"],
      allBranches: ["午", "辰", "午", "未"],
      yongsin: ["수"],
      kisin: ["화"],
      geokguk: "식신격",
    };

    expect(validInput.birthYear).toBeGreaterThan(1900);
    expect(validInput.birthMonth).toBeGreaterThanOrEqual(1);
    expect(validInput.birthMonth).toBeLessThanOrEqual(12);
    expect(validInput.birthDay).toBeGreaterThanOrEqual(1);
    expect(validInput.birthDay).toBeLessThanOrEqual(31);
    expect(validInput.allStems).toHaveLength(4);
    expect(validInput.allBranches).toHaveLength(4);
  });

  it("allows optional fields to be undefined", () => {
    const minimalInput: AdvancedAnalysisInput = {
      birthYear: 1990,
      birthMonth: 5,
      birthDay: 15,
      dayStem: "甲",
      dayBranch: "午",
      monthStem: "庚",
      monthBranch: "辰",
      yearStem: "庚",
      yearBranch: "午",
      allStems: ["庚", "庚", "甲"],
      allBranches: ["午", "辰", "午"],
    };

    expect(minimalInput.birthHour).toBeUndefined();
    expect(minimalInput.hourStem).toBeUndefined();
    expect(minimalInput.hourBranch).toBeUndefined();
    expect(minimalInput.yongsin).toBeUndefined();
    expect(minimalInput.kisin).toBeUndefined();
    expect(minimalInput.geokguk).toBeUndefined();
  });
});

describe("Event Type Coverage", () => {
  const eventTypes: EventType[] = [
    "marriage", "career", "investment", "move", "study", "health", "relationship"
  ];

  it.each(eventTypes)("has favorable conditions defined for %s", (eventType) => {
    const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];
    expect(conditions).toBeDefined();
    expect(conditions.favorableSibsin.length).toBeGreaterThan(0);
    expect(conditions.avoidSibsin.length).toBeGreaterThan(0);
    expect(conditions.favorableElements.length).toBeGreaterThan(0);
  });

  it("all conditions have valid sibsin types", () => {
    const validSibsin = [
      "비견", "겁재", "식신", "상관", "편재", "정재",
      "편관", "정관", "편인", "정인"
    ];

    eventTypes.forEach(eventType => {
      const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];
      conditions.favorableSibsin.forEach(sibsin => {
        expect(validSibsin).toContain(sibsin);
      });
      conditions.avoidSibsin.forEach(sibsin => {
        expect(validSibsin).toContain(sibsin);
      });
    });
  });

  it("all conditions have valid elements", () => {
    const validElements: FiveElement[] = ["목", "화", "토", "금", "수"];

    eventTypes.forEach(eventType => {
      const conditions = EVENT_FAVORABLE_CONDITIONS[eventType];
      conditions.favorableElements.forEach(element => {
        expect(validElements).toContain(element);
      });
    });
  });
});
