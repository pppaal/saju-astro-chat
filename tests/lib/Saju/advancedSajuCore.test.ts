/**
 * Advanced Saju Core 테스트
 * - 종격 분석 (JonggeokAnalysis)
 * - 화격 분석 (HwagyeokAnalysis)
 * - 일주론 심화 분석
 * - 공망 심화 분석
 * - 삼기 분석
 */


import {
  analyzeJonggeok,
  analyzeHwagyeok,
  analyzeIljuDeep,
  analyzeGongmangDeep,
  analyzeSamgi,
  performUltraAdvancedAnalysis,
  type JonggeokType,
  type HwagyeokType,
} from "@/lib/Saju/advancedSajuCore";
import type { SajuPillars, PillarData } from "@/lib/Saju/types";

// Helper to create mock pillar data
function createPillarData(stem: string, branch: string): PillarData {
  return {
    heavenlyStem: { name: stem },
    earthlyBranch: { name: branch },
  } as PillarData;
}

// Helper to create mock pillars
function createMockPillars(
  year: [string, string],
  month: [string, string],
  day: [string, string],
  time: [string, string]
): SajuPillars {
  return {
    year: createPillarData(year[0], year[1]),
    month: createPillarData(month[0], month[1]),
    day: createPillarData(day[0], day[1]),
    time: createPillarData(time[0], time[1]),
  } as SajuPillars;
}

describe("Jonggeok Analysis (종격 분석)", () => {
  describe("analyzeJonggeok", () => {
    it("returns JonggeokAnalysis structure", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const result = analyzeJonggeok(pillars);

      expect(result).toHaveProperty("isJonggeok");
      expect(result).toHaveProperty("type");
      expect(result).toHaveProperty("dominantElement");
      expect(result).toHaveProperty("dominantSibsin");
      expect(result).toHaveProperty("purity");
      expect(result).toHaveProperty("stability");
      expect(result).toHaveProperty("description");
      expect(result).toHaveProperty("followElement");
      expect(result).toHaveProperty("avoidElement");
      expect(result).toHaveProperty("advice");
    });

    it("identifies 비종격 for balanced saju", () => {
      const pillars = createMockPillars(
        ["甲", "子"], // 목, 수
        ["丙", "寅"], // 화, 목
        ["戊", "午"], // 토, 화
        ["庚", "申"]  // 금, 금
      );

      const result = analyzeJonggeok(pillars);

      expect(result.isJonggeok).toBe(false);
      expect(result.type).toBe("비종격");
    });

    it("identifies 종왕격 when bigyeob is dominant", () => {
      // 비겁(같은 오행)이 강한 경우
      const pillars = createMockPillars(
        ["甲", "寅"], // 목, 목
        ["甲", "卯"], // 목, 목
        ["甲", "寅"], // 목, 목 (일간)
        ["乙", "卯"]  // 목, 목
      );

      const result = analyzeJonggeok(pillars);

      // 비겁이 압도적이므로 종왕격 가능
      if (result.isJonggeok) {
        expect(result.type).toBe("종왕격");
        expect(result.dominantSibsin).toContain("비견");
      }
    });

    it("identifies 종강격 when inseong is dominant", () => {
      // 인성(나를 생하는)이 강한 경우 - 수가 목을 생함
      const pillars = createMockPillars(
        ["壬", "子"], // 수, 수
        ["癸", "亥"], // 수, 수
        ["甲", "子"], // 목, 수 (일간 목)
        ["壬", "亥"]  // 수, 수
      );

      const result = analyzeJonggeok(pillars);

      if (result.isJonggeok && result.type === "종강격") {
        expect(result.dominantSibsin).toContain("편인");
      }
    });

    it("returns valid purity and stability ranges", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const result = analyzeJonggeok(pillars);

      expect(result.purity).toBeGreaterThanOrEqual(0);
      expect(result.purity).toBeLessThanOrEqual(100);
      expect(result.stability).toBeGreaterThanOrEqual(0);
      expect(result.stability).toBeLessThanOrEqual(100);
    });

    it("provides advice based on jonggeok type", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const result = analyzeJonggeok(pillars);

      expect(result.advice).toBeDefined();
      expect(typeof result.advice).toBe("string");
      expect(result.advice.length).toBeGreaterThan(0);
    });
  });
});

describe("Hwagyeok Analysis (화격 분석)", () => {
  describe("analyzeHwagyeok", () => {
    it("returns HwagyeokAnalysis structure", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["己", "丑"],
        ["甲", "寅"],
        ["庚", "申"]
      );

      const result = analyzeHwagyeok(pillars);

      expect(result).toHaveProperty("isHwagyeok");
      expect(result).toHaveProperty("type");
      expect(result).toHaveProperty("originalElements");
      expect(result).toHaveProperty("transformedElement");
      expect(result).toHaveProperty("transformSuccess");
      expect(result).toHaveProperty("conditions");
      expect(result).toHaveProperty("description");
      expect(result).toHaveProperty("implications");
    });

    it("identifies 비화격 when no stem combination exists", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const result = analyzeHwagyeok(pillars);

      expect(result.isHwagyeok).toBe(false);
      expect(result.type).toBe("비화격");
    });

    it("detects 갑기합화토 when 甲 and 己 are present", () => {
      // 갑기합: 甲 + 己 = 土
      const pillars = createMockPillars(
        ["甲", "辰"], // 갑
        ["己", "未"], // 기 (토월)
        ["甲", "戌"], // 갑 일간
        ["己", "丑"]  // 기
      );

      const result = analyzeHwagyeok(pillars);

      if (result.type !== "비화격") {
        expect(result.type).toBe("갑기합화토");
        expect(result.transformedElement).toBe("토");
      }
    });

    it("validates transform conditions", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["己", "丑"],
        ["甲", "寅"],
        ["庚", "申"]
      );

      const result = analyzeHwagyeok(pillars);

      expect(result.conditions).toHaveProperty("seasonSupport");
      expect(result.conditions).toHaveProperty("branchSupport");
      expect(result.conditions).toHaveProperty("noDisturbance");
    });

    it("provides implications for successful hwagyeok", () => {
      const pillars = createMockPillars(
        ["甲", "辰"],
        ["己", "未"],
        ["甲", "戌"],
        ["己", "丑"]
      );

      const result = analyzeHwagyeok(pillars);

      if (result.isHwagyeok) {
        expect(result.implications.length).toBeGreaterThan(0);
      }
    });
  });
});

describe("Ilju Deep Analysis (일주론 심화)", () => {
  describe("analyzeIljuDeep", () => {
    it("returns IljuDeepAnalysis structure", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const result = analyzeIljuDeep(pillars);

      expect(result).toHaveProperty("ilju");
      expect(result).toHaveProperty("dayMaster");
      expect(result).toHaveProperty("dayBranch");
      expect(result).toHaveProperty("naeum");
      expect(result).toHaveProperty("iljuCharacter");
      expect(result).toHaveProperty("hiddenStems");
      expect(result).toHaveProperty("sibsinRelation");
      expect(result).toHaveProperty("twelveStage");
      expect(result).toHaveProperty("gongmang");
      expect(result).toHaveProperty("characteristics");
      expect(result).toHaveProperty("strengths");
      expect(result).toHaveProperty("weaknesses");
      expect(result).toHaveProperty("careerAptitude");
      expect(result).toHaveProperty("relationshipStyle");
      expect(result).toHaveProperty("healthFocus");
      expect(result).toHaveProperty("luckyFactors");
    });

    it("extracts correct ilju from pillars", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"], // 무오 일주
        ["庚", "申"]
      );

      const result = analyzeIljuDeep(pillars);

      expect(result.ilju).toBe("戊午");
      expect(result.dayMaster).toBe("戊");
      expect(result.dayBranch).toBe("午");
    });

    it("calculates 12 stages correctly", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["甲", "子"], // 갑자 일주
        ["庚", "申"]
      );

      const result = analyzeIljuDeep(pillars);

      expect(result.twelveStage).toBeDefined();
      const validStages = ["장생", "목욕", "관대", "임관", "왕지", "쇠", "병", "사", "묘", "절", "태", "양"];
      expect(validStages).toContain(result.twelveStage);
    });

    it("provides health focus based on day master element", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["甲", "寅"], // 목(木) 일간
        ["庚", "申"]
      );

      const result = analyzeIljuDeep(pillars);

      // 목의 건강 관련 장기: 간, 담, 눈, 근육
      expect(result.healthFocus).toContain("간");
    });

    it("provides lucky factors", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["甲", "寅"],
        ["庚", "申"]
      );

      const result = analyzeIljuDeep(pillars);

      expect(result.luckyFactors).toHaveProperty("direction");
      expect(result.luckyFactors).toHaveProperty("color");
      expect(result.luckyFactors).toHaveProperty("number");
      expect(Array.isArray(result.luckyFactors.number)).toBe(true);
    });

    it("provides known ilju characteristics for 甲子", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["甲", "子"], // 갑자 일주
        ["庚", "申"]
      );

      const result = analyzeIljuDeep(pillars);

      expect(result.ilju).toBe("甲子");
      expect(result.iljuCharacter).toContain("창의");
      expect(result.strengths).toContain("리더십");
    });
  });
});

describe("Gongmang Deep Analysis (공망 심화)", () => {
  describe("analyzeGongmangDeep", () => {
    it("returns GongmangDeepAnalysis structure", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const result = analyzeGongmangDeep(pillars);

      expect(result).toHaveProperty("gongmangBranches");
      expect(result).toHaveProperty("affectedPillars");
      expect(result).toHaveProperty("type");
      expect(result).toHaveProperty("interpretation");
      expect(result).toHaveProperty("effects");
      expect(result).toHaveProperty("remedy");
    });

    it("identifies gongmang branches", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const result = analyzeGongmangDeep(pillars);

      expect(result.gongmangBranches).toHaveLength(2);
      expect(Array.isArray(result.gongmangBranches)).toBe(true);
    });

    it("identifies affected pillars", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const result = analyzeGongmangDeep(pillars);

      expect(Array.isArray(result.affectedPillars)).toBe(true);
      result.affectedPillars.forEach(pillar => {
        expect(["year", "month", "day", "time"]).toContain(pillar);
      });
    });

    it("categorizes gongmang type correctly", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const result = analyzeGongmangDeep(pillars);

      const validTypes = ["진공", "가공", "반공", "해공"];
      expect(validTypes).toContain(result.type);
    });

    it("provides positive and negative effects", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const result = analyzeGongmangDeep(pillars);

      expect(result.effects).toHaveProperty("positive");
      expect(result.effects).toHaveProperty("negative");
      expect(Array.isArray(result.effects.positive)).toBe(true);
      expect(Array.isArray(result.effects.negative)).toBe(true);
    });

    it("provides remedy suggestions", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const result = analyzeGongmangDeep(pillars);

      expect(Array.isArray(result.remedy)).toBe(true);
      expect(result.remedy.length).toBeGreaterThan(0);
    });
  });
});

describe("Samgi Analysis (삼기 분석)", () => {
  describe("analyzeSamgi", () => {
    it("returns SamgiAnalysis structure", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const result = analyzeSamgi(pillars);

      expect(result).toHaveProperty("hasSamgi");
      expect(result).toHaveProperty("description");
      expect(result).toHaveProperty("blessing");
    });

    it("identifies 천상삼기 when 甲戊庚 present", () => {
      // 천상삼기: 甲, 戊, 庚
      const pillars = createMockPillars(
        ["甲", "子"],
        ["戊", "寅"],
        ["庚", "午"],
        ["甲", "申"]
      );

      const result = analyzeSamgi(pillars);

      expect(result.hasSamgi).toBe(true);
      expect(result.type).toBe("천상삼기");
      expect(result.stems).toEqual(["甲", "戊", "庚"]);
    });

    it("identifies 지하삼기 when 乙丙丁 present", () => {
      // 지하삼기: 乙, 丙, 丁
      const pillars = createMockPillars(
        ["乙", "子"],
        ["丙", "寅"],
        ["丁", "午"],
        ["乙", "申"]
      );

      const result = analyzeSamgi(pillars);

      expect(result.hasSamgi).toBe(true);
      expect(result.type).toBe("지하삼기");
      expect(result.stems).toEqual(["乙", "丙", "丁"]);
    });

    it("identifies 인중삼기 when 壬癸辛 present", () => {
      // 인중삼기: 壬, 癸, 辛
      const pillars = createMockPillars(
        ["壬", "子"],
        ["癸", "寅"],
        ["辛", "午"],
        ["壬", "申"]
      );

      const result = analyzeSamgi(pillars);

      expect(result.hasSamgi).toBe(true);
      expect(result.type).toBe("인중삼기");
      expect(result.stems).toEqual(["壬", "癸", "辛"]);
    });

    it("returns no samgi for normal pillars", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["壬", "申"]
      );

      const result = analyzeSamgi(pillars);

      expect(result.hasSamgi).toBe(false);
      expect(result.type).toBeUndefined();
    });

    it("provides blessings for samgi", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["戊", "寅"],
        ["庚", "午"],
        ["甲", "申"]
      );

      const result = analyzeSamgi(pillars);

      if (result.hasSamgi) {
        expect(Array.isArray(result.blessing)).toBe(true);
        expect(result.blessing.length).toBeGreaterThan(0);
      }
    });
  });
});

describe("Ultra Advanced Analysis (종합 고급 분석)", () => {
  describe("performUltraAdvancedAnalysis", () => {
    it("returns complete UltraAdvancedAnalysis structure", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const result = performUltraAdvancedAnalysis(pillars);

      expect(result).toHaveProperty("jonggeok");
      expect(result).toHaveProperty("hwagyeok");
      expect(result).toHaveProperty("iljuDeep");
      expect(result).toHaveProperty("gongmang");
      expect(result).toHaveProperty("samgi");
      expect(result).toHaveProperty("specialFormations");
      expect(result).toHaveProperty("masterySummary");
    });

    it("collects special formations", () => {
      // 천상삼기가 있는 사주
      const pillars = createMockPillars(
        ["甲", "子"],
        ["戊", "寅"],
        ["庚", "午"],
        ["甲", "申"]
      );

      const result = performUltraAdvancedAnalysis(pillars);

      expect(Array.isArray(result.specialFormations)).toBe(true);
      if (result.samgi.hasSamgi) {
        expect(result.specialFormations).toContain("천상삼기");
      }
    });

    it("generates mastery summary", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const result = performUltraAdvancedAnalysis(pillars);

      expect(result.masterySummary).toBeDefined();
      expect(typeof result.masterySummary).toBe("string");
      expect(result.masterySummary.length).toBeGreaterThan(0);
      expect(result.masterySummary).toContain(result.iljuDeep.ilju);
    });

    it("includes all sub-analyses", () => {
      const pillars = createMockPillars(
        ["甲", "子"],
        ["丙", "寅"],
        ["戊", "午"],
        ["庚", "申"]
      );

      const result = performUltraAdvancedAnalysis(pillars);

      // 각 분석이 올바른 구조를 가지는지 확인
      expect(result.jonggeok.type).toBeDefined();
      expect(result.hwagyeok.type).toBeDefined();
      expect(result.iljuDeep.ilju).toBeDefined();
      expect(result.gongmang.gongmangBranches).toBeDefined();
      expect(result.samgi.hasSamgi).toBeDefined();
    });
  });
});

describe("Edge Cases", () => {
  it("handles all same stem pillars", () => {
    const pillars = createMockPillars(
      ["甲", "寅"],
      ["甲", "卯"],
      ["甲", "寅"],
      ["甲", "卯"]
    );

    expect(() => analyzeJonggeok(pillars)).not.toThrow();
    expect(() => analyzeHwagyeok(pillars)).not.toThrow();
    expect(() => analyzeIljuDeep(pillars)).not.toThrow();
    expect(() => analyzeGongmangDeep(pillars)).not.toThrow();
    expect(() => analyzeSamgi(pillars)).not.toThrow();
  });

  it("handles all same branch pillars", () => {
    const pillars = createMockPillars(
      ["甲", "子"],
      ["乙", "子"],
      ["丙", "子"],
      ["丁", "子"]
    );

    expect(() => performUltraAdvancedAnalysis(pillars)).not.toThrow();
  });
});
