/**
 * Life Prediction Types Tests
 *
 * Tests for type definitions used in the life prediction engine
 */

import { expectTypeOf } from "vitest";
import type {
  PredictionGrade,
  SolarTerm,
  LunarMansion,
  LunarPhase,
  PlanetaryHour,
  CausalFactor,
  ConfidenceFactors,
  EventCategoryScores,
  AstroDataForPrediction,
  TransitAspectForPrediction,
  OuterPlanetPosition,
  AdvancedAstroForPrediction,
  LifePredictionInput,
  MultiYearTrend,
  YearlyScore,
  DaeunTransitionPoint,
  LifeCyclePhase,
  PastRetrospective,
  EventType,
  EventTimingResult,
  OptimalPeriod,
  AvoidPeriod,
  WeeklyEventTimingResult,
  WeeklyPeriod,
  ComprehensivePrediction,
  UpcomingHighlight,
  BonusResult,
  EventFavorableConditions,
  AstroEventConditions,
  TransitEventConditions,
  ShinsalResult,
} from "@/lib/prediction/life-prediction/types";

describe("PredictionGrade type", () => {
  it("includes all valid grades", () => {
    const validGrades: PredictionGrade[] = ["S", "A", "B", "C", "D"];
    expect(validGrades).toHaveLength(5);
  });

  it("S is the best grade", () => {
    const grade: PredictionGrade = "S";
    expect(grade).toBe("S");
  });
});

describe("SolarTerm interface", () => {
  it("has all required properties", () => {
    const solarTerm: SolarTerm = {
      index: 1,
      name: "lichun",
      nameKo: "입춘",
      element: "목",
      startDate: new Date("2024-02-04"),
      endDate: new Date("2024-02-19"),
      energy: "yang",
    };

    expect(solarTerm.index).toBe(1);
    expect(solarTerm.name).toBe("lichun");
    expect(solarTerm.nameKo).toBe("입춘");
    expect(solarTerm.element).toBe("목");
    expect(solarTerm.startDate).toBeInstanceOf(Date);
    expect(solarTerm.endDate).toBeInstanceOf(Date);
    expect(solarTerm.energy).toBe("yang");
  });

  it("energy can be yin or yang", () => {
    const yangTerm: SolarTerm = {
      index: 1,
      name: "test",
      nameKo: "테스트",
      element: "화",
      startDate: new Date(),
      endDate: new Date(),
      energy: "yang",
    };

    const yinTerm: SolarTerm = {
      index: 2,
      name: "test2",
      nameKo: "테스트2",
      element: "수",
      startDate: new Date(),
      endDate: new Date(),
      energy: "yin",
    };

    expect(yangTerm.energy).toBe("yang");
    expect(yinTerm.energy).toBe("yin");
  });
});

describe("LunarMansion interface", () => {
  it("has all required properties", () => {
    const mansion: LunarMansion = {
      index: 1,
      name: "Horn",
      nameKo: "각",
      element: "wood",
      isAuspicious: true,
      goodFor: ["travel", "business"],
      badFor: ["construction"],
    };

    expect(mansion.index).toBe(1);
    expect(mansion.name).toBe("Horn");
    expect(mansion.nameKo).toBe("각");
    expect(mansion.element).toBe("wood");
    expect(mansion.isAuspicious).toBe(true);
    expect(mansion.goodFor).toContain("travel");
    expect(mansion.badFor).toContain("construction");
  });
});

describe("LunarPhase interface", () => {
  it("has all required properties", () => {
    const phase: LunarPhase = {
      phase: "full_moon",
      illumination: 100,
      isWaxing: false,
    };

    expect(phase.phase).toBe("full_moon");
    expect(phase.illumination).toBe(100);
    expect(phase.isWaxing).toBe(false);
  });

  it("waxing is true before full moon", () => {
    const waxingMoon: LunarPhase = {
      phase: "waxing_gibbous",
      illumination: 75,
      isWaxing: true,
    };

    expect(waxingMoon.isWaxing).toBe(true);
  });
});

describe("PlanetaryHour interface", () => {
  it("has all required properties", () => {
    const hour: PlanetaryHour = {
      planet: "Sun",
      startHour: 6,
      endHour: 7,
    };

    expect(hour.planet).toBe("Sun");
    expect(hour.startHour).toBe(6);
    expect(hour.endHour).toBe(7);
  });
});

describe("CausalFactor interface", () => {
  it("has all required properties", () => {
    const factor: CausalFactor = {
      factor: "Jupiter transit",
      description: "Expansion and growth energy",
      impact: "major_positive",
      affectedAreas: ["career", "finance"],
    };

    expect(factor.factor).toBe("Jupiter transit");
    expect(factor.description).toBe("Expansion and growth energy");
    expect(factor.impact).toBe("major_positive");
    expect(factor.affectedAreas).toContain("career");
  });

  it("impact covers all valid values", () => {
    const impacts: CausalFactor["impact"][] = [
      "major_positive",
      "positive",
      "neutral",
      "negative",
      "major_negative",
    ];
    expect(impacts).toHaveLength(5);
  });
});

describe("ConfidenceFactors interface", () => {
  it("has all required properties", () => {
    const factors: ConfidenceFactors = {
      birthTimeAccuracy: "exact",
      methodAlignment: 85,
      dataCompleteness: 90,
    };

    expect(factors.birthTimeAccuracy).toBe("exact");
    expect(factors.methodAlignment).toBe(85);
    expect(factors.dataCompleteness).toBe(90);
  });

  it("birthTimeAccuracy has valid options", () => {
    const accuracies: ConfidenceFactors["birthTimeAccuracy"][] = [
      "exact",
      "approximate",
      "unknown",
    ];
    expect(accuracies).toHaveLength(3);
  });
});

describe("EventCategoryScores interface", () => {
  it("has all six categories", () => {
    const scores: EventCategoryScores = {
      career: 80,
      finance: 75,
      relationship: 85,
      health: 70,
      travel: 65,
      education: 90,
    };

    expect(Object.keys(scores)).toHaveLength(6);
    expect(scores.career).toBe(80);
    expect(scores.finance).toBe(75);
    expect(scores.relationship).toBe(85);
    expect(scores.health).toBe(70);
    expect(scores.travel).toBe(65);
    expect(scores.education).toBe(90);
  });
});

describe("AstroDataForPrediction interface", () => {
  it("handles minimal data", () => {
    const minimalData: AstroDataForPrediction = {};
    expect(minimalData).toEqual({});
  });

  it("handles full planetary data", () => {
    const fullData: AstroDataForPrediction = {
      sun: { sign: "Aries", house: 1, longitude: 15.5 },
      moon: { sign: "Cancer", house: 4, longitude: 90.3 },
      venus: { sign: "Taurus", house: 2, longitude: 45.2, isRetrograde: false },
      mars: { sign: "Leo", house: 5, longitude: 120.8, isRetrograde: false },
      jupiter: { sign: "Sagittarius", house: 9, longitude: 250.4, isRetrograde: true },
      saturn: { sign: "Capricorn", house: 10, longitude: 280.6, isRetrograde: false },
      mercury: { sign: "Gemini", house: 3, longitude: 75.9, isRetrograde: true },
    };

    expect(fullData.sun?.sign).toBe("Aries");
    expect(fullData.moon?.house).toBe(4);
    expect(fullData.jupiter?.isRetrograde).toBe(true);
    expect(fullData.mercury?.isRetrograde).toBe(true);
  });
});

describe("TransitAspectForPrediction interface", () => {
  it("has all required properties", () => {
    const aspect: TransitAspectForPrediction = {
      transitPlanet: "Jupiter",
      natalPoint: "Sun",
      type: "conjunction",
      orb: 2.5,
      isApplying: true,
    };

    expect(aspect.transitPlanet).toBe("Jupiter");
    expect(aspect.natalPoint).toBe("Sun");
    expect(aspect.type).toBe("conjunction");
    expect(aspect.orb).toBe(2.5);
    expect(aspect.isApplying).toBe(true);
  });
});

describe("OuterPlanetPosition interface", () => {
  it("has all required properties", () => {
    const position: OuterPlanetPosition = {
      name: "Uranus",
      longitude: 50.5,
      sign: "Taurus",
      house: 2,
      retrograde: true,
    };

    expect(position.name).toBe("Uranus");
    expect(position.longitude).toBe(50.5);
    expect(position.sign).toBe("Taurus");
    expect(position.house).toBe(2);
    expect(position.retrograde).toBe(true);
  });

  it("retrograde is optional", () => {
    const position: OuterPlanetPosition = {
      name: "Neptune",
      longitude: 355.2,
      sign: "Pisces",
      house: 12,
    };

    expect(position.retrograde).toBeUndefined();
  });
});

describe("LifePredictionInput interface", () => {
  it("has all required properties", () => {
    const input: LifePredictionInput = {
      birthYear: 1990,
      birthMonth: 5,
      birthDay: 15,
      gender: "male",
      dayStem: "甲",
      dayBranch: "子",
      monthBranch: "午",
      yearBranch: "寅",
      allStems: ["甲", "乙", "丙", "丁"],
      allBranches: ["子", "丑", "寅", "卯"],
    };

    expect(input.birthYear).toBe(1990);
    expect(input.birthMonth).toBe(5);
    expect(input.birthDay).toBe(15);
    expect(input.gender).toBe("male");
    expect(input.dayStem).toBe("甲");
    expect(input.dayBranch).toBe("子");
    expect(input.allStems).toHaveLength(4);
    expect(input.allBranches).toHaveLength(4);
  });

  it("birthHour is optional", () => {
    const input: LifePredictionInput = {
      birthYear: 1990,
      birthMonth: 5,
      birthDay: 15,
      birthHour: 14,
      gender: "female",
      dayStem: "乙",
      dayBranch: "丑",
      monthBranch: "未",
      yearBranch: "卯",
      allStems: ["乙", "丙", "丁", "戊"],
      allBranches: ["丑", "寅", "卯", "辰"],
    };

    expect(input.birthHour).toBe(14);
  });
});

describe("EventType union", () => {
  it("includes all valid event types", () => {
    const eventTypes: EventType[] = [
      "marriage",
      "career",
      "investment",
      "move",
      "study",
      "health",
      "relationship",
    ];
    expect(eventTypes).toHaveLength(7);
  });
});

describe("MultiYearTrend interface", () => {
  it("has all required properties", () => {
    const trend: MultiYearTrend = {
      startYear: 2020,
      endYear: 2030,
      yearlyScores: [],
      overallTrend: "ascending",
      peakYears: [2025, 2028],
      lowYears: [2022],
      daeunTransitions: [],
      lifeCycles: [],
      summary: "Positive growth period",
    };

    expect(trend.startYear).toBe(2020);
    expect(trend.endYear).toBe(2030);
    expect(trend.overallTrend).toBe("ascending");
    expect(trend.peakYears).toContain(2025);
    expect(trend.lowYears).toContain(2022);
  });

  it("overallTrend has valid options", () => {
    const trends: MultiYearTrend["overallTrend"][] = [
      "ascending",
      "descending",
      "stable",
      "volatile",
    ];
    expect(trends).toHaveLength(4);
  });
});

describe("DaeunTransitionPoint interface", () => {
  it("has all required properties", () => {
    const transition: DaeunTransitionPoint = {
      year: 2025,
      age: 35,
      fromDaeun: { index: 3 } as any,
      toDaeun: { index: 4 } as any,
      impact: "major_positive",
      description: "Major life transition period",
    };

    expect(transition.year).toBe(2025);
    expect(transition.age).toBe(35);
    expect(transition.impact).toBe("major_positive");
  });

  it("impact has valid options", () => {
    const impacts: DaeunTransitionPoint["impact"][] = [
      "major_positive",
      "positive",
      "neutral",
      "challenging",
      "major_challenging",
    ];
    expect(impacts).toHaveLength(5);
  });
});

describe("LifeCyclePhase interface", () => {
  it("has all required properties", () => {
    const phase: LifeCyclePhase = {
      name: "Growth Phase",
      startYear: 2020,
      endYear: 2025,
      startAge: 30,
      endAge: 35,
      theme: "Career development",
      energy: "rising",
      recommendations: ["Focus on skills", "Build network"],
    };

    expect(phase.name).toBe("Growth Phase");
    expect(phase.startYear).toBe(2020);
    expect(phase.endYear).toBe(2025);
    expect(phase.theme).toBe("Career development");
    expect(phase.energy).toBe("rising");
    expect(phase.recommendations).toHaveLength(2);
  });

  it("energy has valid options", () => {
    const energies: LifeCyclePhase["energy"][] = [
      "rising",
      "peak",
      "declining",
      "dormant",
    ];
    expect(energies).toHaveLength(4);
  });
});

describe("OptimalPeriod interface", () => {
  it("has all required properties", () => {
    const period: OptimalPeriod = {
      startDate: new Date("2024-03-01"),
      endDate: new Date("2024-03-15"),
      score: 85,
      grade: "A",
      reasons: ["Favorable transits", "Strong support energy"],
    };

    expect(period.startDate).toBeInstanceOf(Date);
    expect(period.endDate).toBeInstanceOf(Date);
    expect(period.score).toBe(85);
    expect(period.grade).toBe("A");
    expect(period.reasons).toHaveLength(2);
  });

  it("specificDays is optional", () => {
    const period: OptimalPeriod = {
      startDate: new Date("2024-03-01"),
      endDate: new Date("2024-03-15"),
      score: 85,
      grade: "A",
      reasons: ["Test"],
      specificDays: [new Date("2024-03-07"), new Date("2024-03-10")],
    };

    expect(period.specificDays).toHaveLength(2);
  });
});

describe("AvoidPeriod interface", () => {
  it("has all required properties", () => {
    const period: AvoidPeriod = {
      startDate: new Date("2024-04-01"),
      endDate: new Date("2024-04-15"),
      score: 30,
      reasons: ["Mercury retrograde", "Saturn square"],
    };

    expect(period.startDate).toBeInstanceOf(Date);
    expect(period.endDate).toBeInstanceOf(Date);
    expect(period.score).toBe(30);
    expect(period.reasons).toHaveLength(2);
  });
});

describe("UpcomingHighlight interface", () => {
  it("has all required properties", () => {
    const highlight: UpcomingHighlight = {
      type: "opportunity",
      date: new Date("2024-06-15"),
      title: "Career Breakthrough",
      description: "Favorable period for career advancement",
      score: 90,
      actionItems: ["Update resume", "Network actively"],
    };

    expect(highlight.type).toBe("opportunity");
    expect(highlight.date).toBeInstanceOf(Date);
    expect(highlight.title).toBe("Career Breakthrough");
    expect(highlight.score).toBe(90);
    expect(highlight.actionItems).toHaveLength(2);
  });

  it("type has valid options", () => {
    const types: UpcomingHighlight["type"][] = [
      "peak",
      "transition",
      "challenge",
      "opportunity",
    ];
    expect(types).toHaveLength(4);
  });
});

describe("BonusResult interface", () => {
  it("has all required properties", () => {
    const bonus: BonusResult = {
      bonus: 15,
      reasons: ["Auspicious day", "Favorable transit"],
      penalties: ["Mercury retrograde"],
    };

    expect(bonus.bonus).toBe(15);
    expect(bonus.reasons).toHaveLength(2);
    expect(bonus.penalties).toHaveLength(1);
  });
});

describe("EventFavorableConditions interface", () => {
  it("has all required properties", () => {
    const conditions: EventFavorableConditions = {
      favorableSibsin: ["정관", "정재"],
      favorableStages: ["건록", "제왕"],
      favorableElements: ["목", "화"],
      avoidSibsin: ["겁재", "상관"],
      avoidStages: ["사", "묘"],
    };

    expect(conditions.favorableSibsin).toContain("정관");
    expect(conditions.favorableStages).toContain("건록");
    expect(conditions.favorableElements).toContain("목");
    expect(conditions.avoidSibsin).toContain("겁재");
    expect(conditions.avoidStages).toContain("사");
  });
});

describe("AstroEventConditions interface", () => {
  it("extends EventFavorableConditions", () => {
    const conditions: AstroEventConditions = {
      favorableSibsin: ["정관"],
      favorableStages: ["건록"],
      favorableElements: ["화"],
      avoidSibsin: ["겁재"],
      avoidStages: ["사"],
      beneficSigns: ["Libra", "Taurus"],
      beneficPlanets: ["Venus", "Jupiter"],
      maleficPlanets: ["Saturn"],
      moonPhaseBonus: { full_moon: 8, new_moon: 5 },
    };

    expect(conditions.beneficSigns).toContain("Libra");
    expect(conditions.beneficPlanets).toContain("Venus");
    expect(conditions.maleficPlanets).toContain("Saturn");
    expect(conditions.moonPhaseBonus.full_moon).toBe(8);
  });
});

describe("TransitEventConditions interface", () => {
  it("has all required properties", () => {
    const conditions: TransitEventConditions = {
      beneficPlanets: ["Jupiter", "Venus"],
      maleficPlanets: ["Saturn"],
      keyNatalPoints: ["Sun", "Moon"],
      beneficAspects: ["conjunction", "trine"],
      maleficAspects: ["square", "opposition"],
      favorableHouses: [7, 5, 1],
    };

    expect(conditions.beneficPlanets).toContain("Jupiter");
    expect(conditions.maleficPlanets).toContain("Saturn");
    expect(conditions.keyNatalPoints).toContain("Sun");
    expect(conditions.beneficAspects).toContain("trine");
    expect(conditions.maleficAspects).toContain("square");
    expect(conditions.favorableHouses).toContain(7);
  });
});

describe("ShinsalResult interface", () => {
  it("has all required properties", () => {
    const shinsal: ShinsalResult = {
      name: "천을귀인",
      type: "lucky",
      description: "Noble helper from heaven",
    };

    expect(shinsal.name).toBe("천을귀인");
    expect(shinsal.type).toBe("lucky");
    expect(shinsal.description).toBe("Noble helper from heaven");
  });

  it("type is either lucky or unlucky", () => {
    const luckyType: ShinsalResult["type"] = "lucky";
    const unluckyType: ShinsalResult["type"] = "unlucky";

    expect(luckyType).toBe("lucky");
    expect(unluckyType).toBe("unlucky");
  });

  it("description is optional", () => {
    const shinsal: ShinsalResult = {
      name: "역마살",
      type: "unlucky",
    };

    expect(shinsal.description).toBeUndefined();
  });
});
