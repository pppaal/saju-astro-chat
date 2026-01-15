/**
 * Comprehensive tests for src/lib/ai/recommendations.ts
 * Testing user profile, life recommendation interfaces, and recommendation generation functions
 * Coverage: >90% of all functions and interfaces
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  generateLifeRecommendations,
  type UserProfile,
  type LifeRecommendation,
  type CareerRecommendation,
  type LoveRecommendation,
  type FitnessRecommendation,
  type HealthRecommendation,
  type WealthRecommendation,
  type LifestyleRecommendation,
} from "@/lib/ai/recommendations";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("generateLifeRecommendations", () => {
  const baseProfile: UserProfile = {
    name: "테스트",
    birthDate: "1990-01-15",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_AI_BACKEND = "http://127.0.0.1:5000";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("successful API calls", () => {
    it("calls backend API with correct parameters", async () => {
      const mockRecommendations = createMockRecommendations();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ recommendations: mockRecommendations }),
      });

      await generateLifeRecommendations(baseProfile);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://127.0.0.1:5000/api/recommendations",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: baseProfile }),
        }
      );
    });

    it("returns recommendations from API", async () => {
      const mockRecommendations = createMockRecommendations();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ recommendations: mockRecommendations }),
      });

      const result = await generateLifeRecommendations(baseProfile);

      expect(result).toEqual(mockRecommendations);
      expect(result).toHaveProperty("career");
      expect(result).toHaveProperty("love");
      expect(result).toHaveProperty("fitness");
      expect(result).toHaveProperty("health");
      expect(result).toHaveProperty("wealth");
      expect(result).toHaveProperty("lifestyle");
    });

    it("handles profile with full saju data", async () => {
      const fullProfile: UserProfile = {
        ...baseProfile,
        saju: {
          year: "庚午",
          month: "戊寅",
          day: "甲子",
          hour: "丙寅",
          elements: { wood: 3, fire: 4, earth: 1, metal: 0, water: 0 },
          heavenlyStem: "甲",
          earthlyBranch: "子",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ recommendations: createMockRecommendations() }),
      });

      const result = await generateLifeRecommendations(fullProfile);

      expect(result).toBeDefined();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ profile: fullProfile }),
        })
      );
    });

    it("handles profile with astrology data", async () => {
      const astrologyProfile: UserProfile = {
        ...baseProfile,
        astrology: {
          sunSign: "Capricorn",
          moonSign: "Aries",
          rising: "Leo",
          venus: "Aquarius",
          mars: "Scorpio",
          houses: {
            h1: "Leo",
            h2: "Virgo",
            h7: "Aquarius",
            h10: "Taurus",
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ recommendations: createMockRecommendations() }),
      });

      const result = await generateLifeRecommendations(astrologyProfile);

      expect(result).toBeDefined();
    });
  });

  describe("error handling and fallback", () => {
    it("returns mock recommendations when API fails", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await generateLifeRecommendations(baseProfile);

      expect(result).toBeDefined();
      expect(result).toHaveProperty("career");
      expect(result).toHaveProperty("love");
      expect(result.career.recommendedFields.length).toBeGreaterThan(0);
    });

    it("returns mock recommendations when API returns non-ok status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await generateLifeRecommendations(baseProfile);

      expect(result).toBeDefined();
      expect(result.career).toBeDefined();
    });

    it("returns mock recommendations when API times out", async () => {
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 100)
          )
      );

      const result = await generateLifeRecommendations(baseProfile);

      expect(result).toBeDefined();
    });

    it("generates fire-based recommendations for fire element", async () => {
      mockFetch.mockRejectedValueOnce(new Error("API unavailable"));

      const fireProfile: UserProfile = {
        ...baseProfile,
        saju: {
          year: "丙午",
          month: "戊寅",
          day: "甲子",
          elements: { wood: 1, fire: 5, earth: 1, metal: 1, water: 0 },
          heavenlyStem: "丙",
          earthlyBranch: "午",
        },
      };

      const result = await generateLifeRecommendations(fireProfile);

      expect(result.career.recommendedFields[0].field).toContain("창업");
    });

    it("generates non-fire recommendations for non-fire dominant element", async () => {
      mockFetch.mockRejectedValueOnce(new Error("API unavailable"));

      const waterProfile: UserProfile = {
        ...baseProfile,
        saju: {
          year: "壬子",
          month: "戊寅",
          day: "甲子",
          elements: { wood: 1, fire: 0, earth: 1, metal: 1, water: 5 },
          heavenlyStem: "壬",
          earthlyBranch: "子",
        },
      };

      const result = await generateLifeRecommendations(waterProfile);

      expect(result.career.recommendedFields[0].field).toContain("금융");
    });

    it("uses sunSign in mock recommendations", async () => {
      mockFetch.mockRejectedValueOnce(new Error("API unavailable"));

      const ariesProfile: UserProfile = {
        ...baseProfile,
        astrology: {
          sunSign: "Aries",
          houses: {},
        },
      };

      const result = await generateLifeRecommendations(ariesProfile);

      expect(result.career.recommendedFields[1].field).toContain("IT");
    });

    it("includes income-based wealth analysis in fallback", async () => {
      mockFetch.mockRejectedValueOnce(new Error("API unavailable"));

      const wealthyProfile: UserProfile = {
        ...baseProfile,
        currentSituation: {
          income: 10000000,
        },
      };

      const result = await generateLifeRecommendations(wealthyProfile);

      expect(result.wealth.currentAnalysis.assets).toBe(120000000);
    });

    it("uses default assets when no income provided", async () => {
      mockFetch.mockRejectedValueOnce(new Error("API unavailable"));

      const result = await generateLifeRecommendations(baseProfile);

      expect(result.wealth.currentAnalysis.assets).toBe(30000000);
    });
  });

  describe("mock recommendation structure", () => {
    beforeEach(() => {
      mockFetch.mockRejectedValueOnce(new Error("Force fallback"));
    });

    it("includes career recommendations with all fields", async () => {
      const result = await generateLifeRecommendations(baseProfile);

      expect(result.career.recommendedFields).toBeInstanceOf(Array);
      expect(result.career.recommendedFields.length).toBeGreaterThan(0);
      expect(result.career.recommendedFields[0]).toHaveProperty("field");
      expect(result.career.recommendedFields[0]).toHaveProperty("reason");
      expect(result.career.recommendedFields[0]).toHaveProperty("successRate");
      expect(result.career.recommendedFields[0]).toHaveProperty("timeframe");
      expect(result.career.strengths).toBeInstanceOf(Array);
      expect(result.career.warnings).toBeInstanceOf(Array);
      expect(result.career.actionSteps).toBeInstanceOf(Array);
    });

    it("includes love recommendations with compatibility scores", async () => {
      const result = await generateLifeRecommendations(baseProfile);

      expect(result.love.idealMatches).toBeInstanceOf(Array);
      expect(result.love.idealMatches.length).toBeGreaterThan(0);
      expect(result.love.idealMatches[0].compatibility).toBeGreaterThan(0);
      expect(result.love.idealMatches[0].compatibility).toBeLessThanOrEqual(100);
      expect(result.love.avoidSigns).toBeInstanceOf(Array);
      expect(result.love.bestTimePeriod).toHaveProperty("start");
      expect(result.love.bestTimePeriod).toHaveProperty("end");
      expect(result.love.meetingPlaces).toBeInstanceOf(Array);
      expect(result.love.datingTips).toBeInstanceOf(Array);
    });

    it("includes fitness recommendations with intensity levels", async () => {
      const result = await generateLifeRecommendations(baseProfile);

      expect(result.fitness.recommendedExercises).toBeInstanceOf(Array);
      expect(result.fitness.recommendedExercises.length).toBeGreaterThan(0);
      const exercise = result.fitness.recommendedExercises[0];
      expect(["low", "medium", "high"]).toContain(exercise.intensity);
      expect(result.fitness.bestTimeOfDay).toBeDefined();
      expect(result.fitness.targetGoal).toBeDefined();
      expect(result.fitness.avoidActivities).toBeInstanceOf(Array);
    });

    it("includes health recommendations with severity ratings", async () => {
      const result = await generateLifeRecommendations(baseProfile);

      expect(result.health.vulnerableAreas).toBeInstanceOf(Array);
      expect(result.health.vulnerableAreas.length).toBeGreaterThan(0);
      const area = result.health.vulnerableAreas[0];
      expect(["low", "medium", "high"]).toContain(area.severity);
      expect(result.health.dietRecommendations.recommended).toBeInstanceOf(
        Array
      );
      expect(result.health.dietRecommendations.avoid).toBeInstanceOf(Array);
      expect(result.health.sleepSchedule).toHaveProperty("bedtime");
      expect(result.health.sleepSchedule).toHaveProperty("wakeup");
      expect(result.health.mentalHealth.stressManagement).toBeInstanceOf(Array);
    });

    it("includes wealth recommendations with investment strategy", async () => {
      const result = await generateLifeRecommendations(baseProfile);

      expect(result.wealth.investmentStrategy.conservative.percentage).toBe(50);
      expect(result.wealth.investmentStrategy.moderate.percentage).toBe(30);
      expect(result.wealth.investmentStrategy.aggressive.percentage).toBe(20);
      expect(result.wealth.incomeStreams).toBeInstanceOf(Array);
      expect(result.wealth.luckyPeriods).toBeInstanceOf(Array);
      expect(result.wealth.warnings).toBeInstanceOf(Array);
    });

    it("includes lifestyle recommendations with daily routine", async () => {
      const result = await generateLifeRecommendations(baseProfile);

      expect(result.lifestyle.idealLocation.cities).toBeInstanceOf(Array);
      expect(result.lifestyle.hobbies).toBeInstanceOf(Array);
      expect(result.lifestyle.travel.destinations).toBeInstanceOf(Array);
      expect(result.lifestyle.dailyRoutine.morning).toBeInstanceOf(Array);
      expect(result.lifestyle.dailyRoutine.afternoon).toBeInstanceOf(Array);
      expect(result.lifestyle.dailyRoutine.evening).toBeInstanceOf(Array);
    });
  });

  describe("API backend URL configuration", () => {
    it("uses NEXT_PUBLIC_AI_BACKEND env variable", async () => {
      process.env.NEXT_PUBLIC_AI_BACKEND = "https://custom-backend.com";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ recommendations: createMockRecommendations() }),
      });

      await generateLifeRecommendations(baseProfile);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://custom-backend.com/api/recommendations",
        expect.any(Object)
      );
    });

    it("uses default backend URL when env not set", async () => {
      delete process.env.NEXT_PUBLIC_AI_BACKEND;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ recommendations: createMockRecommendations() }),
      });

      await generateLifeRecommendations(baseProfile);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://127.0.0.1:5000/api/recommendations",
        expect.any(Object)
      );
    });
  });
});

describe("UserProfile interface", () => {
  describe("Basic fields", () => {
    it("has name and birthDate as required", () => {
      const profile: UserProfile = {
        name: "테스트",
        birthDate: "1990-01-15",
      };
      expect(profile.name).toBe("테스트");
      expect(profile.birthDate).toBe("1990-01-15");
    });

    it("supports optional birthTime", () => {
      const profile: UserProfile = {
        name: "테스트",
        birthDate: "1990-01-15",
        birthTime: "14:30",
      };
      expect(profile.birthTime).toBe("14:30");
    });

    it("supports location fields", () => {
      const profile: UserProfile = {
        name: "테스트",
        birthDate: "1990-01-15",
        city: "서울",
        latitude: 37.5665,
        longitude: 126.978,
      };
      expect(profile.city).toBe("서울");
      expect(profile.latitude).toBeCloseTo(37.5665);
      expect(profile.longitude).toBeCloseTo(126.978);
    });

    it("supports gender field", () => {
      const maleProfile: UserProfile = {
        name: "테스트",
        birthDate: "1990-01-15",
        gender: "male",
      };
      const femaleProfile: UserProfile = {
        name: "테스트",
        birthDate: "1990-01-15",
        gender: "female",
      };
      expect(maleProfile.gender).toBe("male");
      expect(femaleProfile.gender).toBe("female");
    });
  });

  describe("Saju data", () => {
    it("supports four pillars", () => {
      const profile: UserProfile = {
        name: "테스트",
        birthDate: "1990-01-15",
        saju: {
          year: "庚午",
          month: "戊寅",
          day: "甲子",
          hour: "丙寅",
          elements: { wood: 3, fire: 2, earth: 1, metal: 1, water: 1 },
          heavenlyStem: "甲",
          earthlyBranch: "子",
        },
      };
      expect(profile.saju?.year).toBe("庚午");
      expect(profile.saju?.month).toBe("戊寅");
      expect(profile.saju?.day).toBe("甲子");
      expect(profile.saju?.hour).toBe("丙寅");
    });

    it("supports five elements distribution", () => {
      const profile: UserProfile = {
        name: "테스트",
        birthDate: "1990-01-15",
        saju: {
          year: "庚午",
          month: "戊寅",
          day: "甲子",
          elements: { wood: 3, fire: 2, earth: 1, metal: 1, water: 1 },
          heavenlyStem: "甲",
          earthlyBranch: "子",
        },
      };
      expect(profile.saju?.elements.wood).toBe(3);
      expect(profile.saju?.elements.fire).toBe(2);
      expect(profile.saju?.elements.earth).toBe(1);
      expect(profile.saju?.elements.metal).toBe(1);
      expect(profile.saju?.elements.water).toBe(1);
    });

    it("supports optional hour pillar", () => {
      const profile: UserProfile = {
        name: "테스트",
        birthDate: "1990-01-15",
        saju: {
          year: "庚午",
          month: "戊寅",
          day: "甲子",
          elements: { wood: 3, fire: 2, earth: 1, metal: 1, water: 1 },
          heavenlyStem: "甲",
          earthlyBranch: "子",
        },
      };
      expect(profile.saju?.hour).toBeUndefined();
    });
  });

  describe("Astrology data", () => {
    it("supports zodiac signs", () => {
      const profile: UserProfile = {
        name: "테스트",
        birthDate: "1990-01-15",
        astrology: {
          sunSign: "Capricorn",
          moonSign: "Aries",
          rising: "Leo",
          houses: {},
        },
      };
      expect(profile.astrology?.sunSign).toBe("Capricorn");
      expect(profile.astrology?.moonSign).toBe("Aries");
      expect(profile.astrology?.rising).toBe("Leo");
    });

    it("supports planet placements", () => {
      const profile: UserProfile = {
        name: "테스트",
        birthDate: "1990-01-15",
        astrology: {
          sunSign: "Capricorn",
          venus: "Aquarius",
          mars: "Scorpio",
          jupiter: "Cancer",
          saturn: "Capricorn",
          houses: {},
        },
      };
      expect(profile.astrology?.venus).toBe("Aquarius");
      expect(profile.astrology?.mars).toBe("Scorpio");
      expect(profile.astrology?.jupiter).toBe("Cancer");
      expect(profile.astrology?.saturn).toBe("Capricorn");
    });

    it("supports house placements", () => {
      const profile: UserProfile = {
        name: "테스트",
        birthDate: "1990-01-15",
        astrology: {
          sunSign: "Capricorn",
          houses: {
            h1: "Leo",
            h2: "Virgo",
            h6: "Capricorn",
            h7: "Aquarius",
            h10: "Taurus",
          },
        },
      };
      expect(profile.astrology?.houses.h1).toBe("Leo");
      expect(profile.astrology?.houses.h7).toBe("Aquarius");
      expect(profile.astrology?.houses.h10).toBe("Taurus");
    });
  });

  describe("Tarot data", () => {
    it("supports tarot reading results", () => {
      const profile: UserProfile = {
        name: "테스트",
        birthDate: "1990-01-15",
        tarot: {
          cards: ["The Fool", "The Magician", "The High Priestess"],
          theme: "새로운 시작",
          date: Date.now(),
        },
      };
      expect(profile.tarot?.cards).toHaveLength(3);
      expect(profile.tarot?.theme).toBe("새로운 시작");
      expect(profile.tarot?.date).toBeGreaterThan(0);
    });
  });

  describe("Current situation", () => {
    it("supports occupation and income", () => {
      const profile: UserProfile = {
        name: "테스트",
        birthDate: "1990-01-15",
        currentSituation: {
          occupation: "개발자",
          income: 5000000,
        },
      };
      expect(profile.currentSituation?.occupation).toBe("개발자");
      expect(profile.currentSituation?.income).toBe(5000000);
    });

    it("supports relationship status", () => {
      const single: UserProfile = {
        name: "테스트",
        birthDate: "1990-01-15",
        currentSituation: { relationshipStatus: "single" },
      };
      const dating: UserProfile = {
        name: "테스트",
        birthDate: "1990-01-15",
        currentSituation: { relationshipStatus: "dating" },
      };
      const married: UserProfile = {
        name: "테스트",
        birthDate: "1990-01-15",
        currentSituation: { relationshipStatus: "married" },
      };
      expect(single.currentSituation?.relationshipStatus).toBe("single");
      expect(dating.currentSituation?.relationshipStatus).toBe("dating");
      expect(married.currentSituation?.relationshipStatus).toBe("married");
    });

    it("supports health issues and goals", () => {
      const profile: UserProfile = {
        name: "테스트",
        birthDate: "1990-01-15",
        currentSituation: {
          healthIssues: ["요통", "불면증"],
          goals: ["체중 감량", "금연"],
        },
      };
      expect(profile.currentSituation?.healthIssues).toContain("요통");
      expect(profile.currentSituation?.goals).toContain("금연");
    });
  });
});

describe("CareerRecommendation interface", () => {
  it("has recommended fields with success rate", () => {
    const career: CareerRecommendation = {
      recommendedFields: [
        {
          field: "IT/테크",
          reason: "분석력이 뛰어남",
          successRate: 85,
          timeframe: "6-12개월",
        },
      ],
      strengths: ["리더십", "문제 해결"],
      warnings: ["과도한 업무 주의"],
      actionSteps: [{ step: "포트폴리오 준비", priority: "high" }],
    };
    expect(career.recommendedFields[0].successRate).toBe(85);
    expect(career.recommendedFields[0].timeframe).toBe("6-12개월");
  });

  it("has action steps with priorities", () => {
    const career: CareerRecommendation = {
      recommendedFields: [],
      strengths: [],
      warnings: [],
      actionSteps: [
        { step: "이력서 업데이트", priority: "high", deadline: "2025-02-01" },
        { step: "네트워킹", priority: "medium" },
        { step: "자격증 취득", priority: "low" },
      ],
    };
    expect(career.actionSteps[0].priority).toBe("high");
    expect(career.actionSteps[0].deadline).toBe("2025-02-01");
    expect(career.actionSteps[1].priority).toBe("medium");
  });
});

describe("LoveRecommendation interface", () => {
  it("has ideal matches with compatibility scores", () => {
    const love: LoveRecommendation = {
      idealMatches: [
        { sign: "Leo", compatibility: 92, reason: "불 기운 조화" },
        { sign: "Sagittarius", compatibility: 88, reason: "모험 정신" },
      ],
      avoidSigns: [{ sign: "Cancer", reason: "감정적 차이" }],
      bestTimePeriod: {
        start: "2025-07-01",
        end: "2025-09-30",
        reason: "목성 행운기",
      },
      meetingPlaces: ["동호회"],
      datingTips: ["솔직한 대화"],
    };
    expect(love.idealMatches[0].compatibility).toBe(92);
    expect(love.avoidSigns[0].sign).toBe("Cancer");
  });

  it("has best time period for romance", () => {
    const love: LoveRecommendation = {
      idealMatches: [],
      avoidSigns: [],
      bestTimePeriod: {
        start: "2025-07-01",
        end: "2025-09-30",
        reason: "금성의 긍정적 배치",
      },
      meetingPlaces: [],
      datingTips: [],
    };
    expect(love.bestTimePeriod.start).toBe("2025-07-01");
    expect(love.bestTimePeriod.end).toBe("2025-09-30");
  });
});

describe("FitnessRecommendation interface", () => {
  it("has exercises with intensity levels", () => {
    const fitness: FitnessRecommendation = {
      recommendedExercises: [
        {
          exercise: "복싱",
          reason: "화 기운 발산",
          frequency: "주 3회",
          intensity: "high",
        },
        {
          exercise: "요가",
          reason: "균형",
          frequency: "주 2회",
          intensity: "low",
        },
      ],
      bestTimeOfDay: "오전 6-8시",
      targetGoal: "근력+유산소 균형",
      avoidActivities: ["과도한 야간 운동"],
    };
    expect(fitness.recommendedExercises[0].intensity).toBe("high");
    expect(fitness.recommendedExercises[1].intensity).toBe("low");
  });
});

describe("HealthRecommendation interface", () => {
  it("has vulnerable areas with severity", () => {
    const health: HealthRecommendation = {
      vulnerableAreas: [
        { area: "심장", severity: "medium", prevention: "정기 검진" },
        { area: "간", severity: "low", prevention: "음주 절제" },
      ],
      dietRecommendations: { recommended: ["채소"], avoid: ["가공식품"] },
      sleepSchedule: { bedtime: "23:00", wakeup: "06:00", reason: "간 회복" },
      mentalHealth: {
        stressManagement: ["명상"],
        mindfulnessPractices: ["감사 일기"],
      },
    };
    expect(health.vulnerableAreas[0].severity).toBe("medium");
    expect(health.vulnerableAreas[1].severity).toBe("low");
  });

  it("has diet recommendations", () => {
    const health: HealthRecommendation = {
      vulnerableAreas: [],
      dietRecommendations: {
        recommended: ["케일", "연어"],
        avoid: ["카페인"],
        supplements: ["오메가3", "비타민D"],
      },
      sleepSchedule: { bedtime: "23:00", wakeup: "06:00", reason: "" },
      mentalHealth: { stressManagement: [], mindfulnessPractices: [] },
    };
    expect(health.dietRecommendations.recommended).toContain("케일");
    expect(health.dietRecommendations.supplements).toContain("오메가3");
  });
});

describe("WealthRecommendation interface", () => {
  it("has investment strategy tiers", () => {
    const wealth: WealthRecommendation = {
      currentAnalysis: {
        assets: 30000000,
        projectedGrowth: 3.5,
        timeframe: "3년",
      },
      investmentStrategy: {
        conservative: { percentage: 50, options: ["채권"] },
        moderate: { percentage: 30, options: ["ETF"] },
        aggressive: { percentage: 20, options: ["성장주"] },
      },
      incomeStreams: [],
      luckyPeriods: [],
      warnings: [],
    };
    expect(wealth.investmentStrategy.conservative.percentage).toBe(50);
    expect(wealth.investmentStrategy.moderate.percentage).toBe(30);
    expect(wealth.investmentStrategy.aggressive.percentage).toBe(20);
  });

  it("has lucky periods", () => {
    const wealth: WealthRecommendation = {
      currentAnalysis: { assets: 0, projectedGrowth: 0, timeframe: "" },
      investmentStrategy: {
        conservative: { percentage: 0, options: [] },
        moderate: { percentage: 0, options: [] },
        aggressive: { percentage: 0, options: [] },
      },
      incomeStreams: [],
      luckyPeriods: [
        { start: "2025-05-01", end: "2025-07-31", focus: "투자" },
        { start: "2025-10-01", end: "2025-12-31", focus: "수익 실현" },
      ],
      warnings: ["충동 투자 금물"],
    };
    expect(wealth.luckyPeriods).toHaveLength(2);
    expect(wealth.luckyPeriods[0].focus).toBe("투자");
  });
});

describe("LifestyleRecommendation interface", () => {
  it("has ideal location recommendations", () => {
    const lifestyle: LifestyleRecommendation = {
      idealLocation: {
        cities: ["강남", "판교"],
        reason: "역동적 환경",
        climate: "온화한 기후",
      },
      hobbies: ["사진"],
      travel: { destinations: [], bestTimes: [], travelStyle: "" },
      socialLife: { idealGroupSize: "", activities: [], networkingTips: [] },
      dailyRoutine: { morning: [], afternoon: [], evening: [] },
    };
    expect(lifestyle.idealLocation.cities).toContain("강남");
    expect(lifestyle.idealLocation.climate).toBe("온화한 기후");
  });

  it("has daily routine structure", () => {
    const lifestyle: LifestyleRecommendation = {
      idealLocation: { cities: [], reason: "", climate: "" },
      hobbies: [],
      travel: { destinations: [], bestTimes: [], travelStyle: "" },
      socialLife: { idealGroupSize: "", activities: [], networkingTips: [] },
      dailyRoutine: {
        morning: ["06:00 기상", "명상 15분"],
        afternoon: ["집중 업무"],
        evening: ["저녁 식사", "23:00 취침"],
      },
    };
    expect(lifestyle.dailyRoutine.morning).toContain("06:00 기상");
    expect(lifestyle.dailyRoutine.evening).toContain("23:00 취침");
  });
});

describe("LifeRecommendation interface", () => {
  it("contains all recommendation categories", () => {
    const recommendations: LifeRecommendation = {
      career: {
        recommendedFields: [],
        strengths: [],
        warnings: [],
        actionSteps: [],
      },
      love: {
        idealMatches: [],
        avoidSigns: [],
        bestTimePeriod: { start: "", end: "", reason: "" },
        meetingPlaces: [],
        datingTips: [],
      },
      fitness: {
        recommendedExercises: [],
        bestTimeOfDay: "",
        targetGoal: "",
        avoidActivities: [],
      },
      health: {
        vulnerableAreas: [],
        dietRecommendations: { recommended: [], avoid: [] },
        sleepSchedule: { bedtime: "", wakeup: "", reason: "" },
        mentalHealth: { stressManagement: [], mindfulnessPractices: [] },
      },
      wealth: {
        currentAnalysis: { assets: 0, projectedGrowth: 0, timeframe: "" },
        investmentStrategy: {
          conservative: { percentage: 0, options: [] },
          moderate: { percentage: 0, options: [] },
          aggressive: { percentage: 0, options: [] },
        },
        incomeStreams: [],
        luckyPeriods: [],
        warnings: [],
      },
      lifestyle: {
        idealLocation: { cities: [], reason: "", climate: "" },
        hobbies: [],
        travel: { destinations: [], bestTimes: [], travelStyle: "" },
        socialLife: { idealGroupSize: "", activities: [], networkingTips: [] },
        dailyRoutine: { morning: [], afternoon: [], evening: [] },
      },
    };

    expect(recommendations).toHaveProperty("career");
    expect(recommendations).toHaveProperty("love");
    expect(recommendations).toHaveProperty("fitness");
    expect(recommendations).toHaveProperty("health");
    expect(recommendations).toHaveProperty("wealth");
    expect(recommendations).toHaveProperty("lifestyle");
  });
});

// Helper function to create mock recommendations
function createMockRecommendations(): LifeRecommendation {
  return {
    career: {
      recommendedFields: [
        {
          field: "IT/테크",
          reason: "분석력이 뛰어남",
          successRate: 85,
          timeframe: "6-12개월",
        },
      ],
      strengths: ["리더십"],
      warnings: ["과도한 업무 주의"],
      actionSteps: [{ step: "포트폴리오 준비", priority: "high" }],
    },
    love: {
      idealMatches: [{ sign: "Leo", compatibility: 92, reason: "불 기운 조화" }],
      avoidSigns: [{ sign: "Cancer", reason: "감정적 차이" }],
      bestTimePeriod: {
        start: "2025-07-01",
        end: "2025-09-30",
        reason: "목성 행운기",
      },
      meetingPlaces: ["동호회"],
      datingTips: ["솔직한 대화"],
    },
    fitness: {
      recommendedExercises: [
        { exercise: "복싱", reason: "화 기운 발산", frequency: "주 3회", intensity: "high" },
      ],
      bestTimeOfDay: "오전 6-8시",
      targetGoal: "근력+유산소 균형",
      avoidActivities: ["과도한 야간 운동"],
    },
    health: {
      vulnerableAreas: [
        { area: "심장", severity: "medium", prevention: "정기 검진" },
      ],
      dietRecommendations: { recommended: ["채소"], avoid: ["가공식품"] },
      sleepSchedule: { bedtime: "23:00", wakeup: "06:00", reason: "간 회복" },
      mentalHealth: {
        stressManagement: ["명상"],
        mindfulnessPractices: ["감사 일기"],
      },
    },
    wealth: {
      currentAnalysis: {
        assets: 30000000,
        projectedGrowth: 3.5,
        timeframe: "3년",
      },
      investmentStrategy: {
        conservative: { percentage: 50, options: ["채권"] },
        moderate: { percentage: 30, options: ["ETF"] },
        aggressive: { percentage: 20, options: ["성장주"] },
      },
      incomeStreams: [],
      luckyPeriods: [],
      warnings: [],
    },
    lifestyle: {
      idealLocation: { cities: ["강남"], reason: "역동적 환경", climate: "온화한 기후" },
      hobbies: ["사진"],
      travel: { destinations: [], bestTimes: [], travelStyle: "" },
      socialLife: { idealGroupSize: "", activities: [], networkingTips: [] },
      dailyRoutine: { morning: [], afternoon: [], evening: [] },
    },
  };
}
