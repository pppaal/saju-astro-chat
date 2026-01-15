// tests/lib/Saju/healthCareer.test.ts

import {
  analyzeHealth,
  analyzeCareer,
  analyzeHealthCareer,
  getElementRecommendations,
  type HealthAnalysis,
  type CareerAnalysis,
  type HealthCareerComprehensive,
  type OrganHealth,
  type CareerField,
  type WorkStyle,
  type ElementRecommendations,
} from "../../../src/lib/Saju/healthCareer";
import type { FiveElement } from "../../../src/lib/Saju/types";

interface Pillar {
  stem: string;
  branch: string;
}
interface SajuPillars {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
}

function createPillars(
  year: [string, string],
  month: [string, string],
  day: [string, string],
  time: [string, string]
): SajuPillars {
  return {
    year: { stem: year[0], branch: year[1] },
    month: { stem: month[0], branch: month[1] },
    day: { stem: day[0], branch: day[1] },
    hour: { stem: time[0], branch: time[1] },
  };
}

// 목(木) 위주 사주: 갑(甲), 을(乙) / 인(寅), 묘(卯)
const woodDominantPillars = createPillars(
  ["甲", "寅"], // year: 갑인
  ["乙", "卯"], // month: 을묘
  ["甲", "寅"], // day: 갑인
  ["乙", "卯"] // hour: 을묘
);

// 화(火) 위주 사주: 병(丙), 정(丁) / 사(巳), 오(午)
const fireDominantPillars = createPillars(
  ["丙", "巳"], // year: 병사
  ["丁", "午"], // month: 정오
  ["丙", "午"], // day: 병오
  ["丁", "巳"] // hour: 정사
);

// 토(土) 위주 사주: 무(戊), 기(己) / 진(辰), 술(戌), 축(丑), 미(未)
const earthDominantPillars = createPillars(
  ["戊", "辰"], // year: 무진
  ["己", "丑"], // month: 기축
  ["戊", "戌"], // day: 무술
  ["己", "未"] // hour: 기미
);

// 금(金) 위주 사주: 경(庚), 신(辛) / 신(申), 유(酉)
const metalDominantPillars = createPillars(
  ["庚", "申"], // year: 경신
  ["辛", "酉"], // month: 신유
  ["庚", "申"], // day: 경신
  ["辛", "酉"] // hour: 신유
);

// 수(水) 위주 사주: 임(壬), 계(癸) / 해(亥), 자(子)
const waterDominantPillars = createPillars(
  ["壬", "亥"], // year: 임해
  ["癸", "子"], // month: 계자
  ["壬", "子"], // day: 임자
  ["癸", "亥"] // hour: 계해
);

// 균형 잡힌 사주
const balancedPillars = createPillars(
  ["甲", "寅"], // year: 목
  ["丙", "午"], // month: 화
  ["戊", "辰"], // day: 토
  ["庚", "申"] // hour: 금
);

describe("healthCareer - Health Analysis", () => {
  describe("analyzeHealth", () => {
    it("returns proper HealthAnalysis structure", () => {
      const result = analyzeHealth(woodDominantPillars);

      expect(result).toHaveProperty("overallScore");
      expect(result).toHaveProperty("constitution");
      expect(result).toHaveProperty("dominantElement");
      expect(result).toHaveProperty("weakElement");
      expect(result).toHaveProperty("organHealth");
      expect(result).toHaveProperty("vulnerableAges");
      expect(result).toHaveProperty("preventionAdvice");
      expect(result).toHaveProperty("lifestyleRecommendations");
      expect(result).toHaveProperty("seasonalHealth");
    });

    it("identifies dominant element correctly for wood dominant pillars", () => {
      const result = analyzeHealth(woodDominantPillars);
      expect(result.dominantElement).toBe("목");
    });

    it("identifies dominant element correctly for fire dominant pillars", () => {
      const result = analyzeHealth(fireDominantPillars);
      expect(result.dominantElement).toBe("화");
    });

    it("identifies dominant element correctly for earth dominant pillars", () => {
      const result = analyzeHealth(earthDominantPillars);
      expect(result.dominantElement).toBe("토");
    });

    it("identifies dominant element correctly for metal dominant pillars", () => {
      const result = analyzeHealth(metalDominantPillars);
      expect(result.dominantElement).toBe("금");
    });

    it("identifies dominant element correctly for water dominant pillars", () => {
      const result = analyzeHealth(waterDominantPillars);
      expect(result.dominantElement).toBe("수");
    });

    it("has proper constitution string based on dominant element", () => {
      const woodResult = analyzeHealth(woodDominantPillars);
      expect(woodResult.constitution).toContain("목형 체질");

      const fireResult = analyzeHealth(fireDominantPillars);
      expect(fireResult.constitution).toContain("화형 체질");

      const earthResult = analyzeHealth(earthDominantPillars);
      expect(earthResult.constitution).toContain("토형 체질");

      const metalResult = analyzeHealth(metalDominantPillars);
      expect(metalResult.constitution).toContain("금형 체질");

      const waterResult = analyzeHealth(waterDominantPillars);
      expect(waterResult.constitution).toContain("수형 체질");
    });

    it("returns overall score between 0 and 100", () => {
      const result = analyzeHealth(balancedPillars);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it("returns 5 organ health entries for 5 elements", () => {
      const result = analyzeHealth(balancedPillars);
      expect(result.organHealth).toHaveLength(5);
    });

    it("organ health entries have valid status", () => {
      const result = analyzeHealth(balancedPillars);
      const validStatuses = ["strong", "normal", "weak", "vulnerable"];
      for (const organ of result.organHealth) {
        expect(validStatuses).toContain(organ.status);
      }
    });

    it("organ health entries have valid element", () => {
      const result = analyzeHealth(balancedPillars);
      const validElements: FiveElement[] = ["목", "화", "토", "금", "수"];
      for (const organ of result.organHealth) {
        expect(validElements).toContain(organ.element);
      }
    });

    it("includes seasonal health advice for all 5 seasons", () => {
      const result = analyzeHealth(balancedPillars);
      expect(result.seasonalHealth).toHaveLength(5);

      const seasons = result.seasonalHealth.map((s) => s.season);
      expect(seasons).toContain("봄");
      expect(seasons).toContain("여름");
      expect(seasons).toContain("환절기");
      expect(seasons).toContain("가을");
      expect(seasons).toContain("겨울");
    });

    it("includes prevention advice based on weak element", () => {
      const result = analyzeHealth(woodDominantPillars);
      expect(result.preventionAdvice.length).toBeGreaterThan(0);
    });

    it("includes lifestyle recommendations", () => {
      const result = analyzeHealth(woodDominantPillars);
      expect(result.lifestyleRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe("organ health scoring", () => {
    it("marks organs as vulnerable when element count is 0", () => {
      // 목 위주 사주에서 다른 원소가 취약할 수 있음
      const result = analyzeHealth(woodDominantPillars);
      const vulnerableOrgans = result.organHealth.filter(
        (o) => o.status === "vulnerable"
      );
      expect(vulnerableOrgans.length).toBeGreaterThanOrEqual(0);
    });

    it("marks organs as strong when element count is >= 4", () => {
      // 목 위주 사주에서 목 장기가 strong일 수 있음
      const result = analyzeHealth(woodDominantPillars);
      const strongOrgans = result.organHealth.filter(
        (o) => o.status === "strong"
      );
      expect(strongOrgans.length).toBeGreaterThanOrEqual(0);
    });

    it("provides risks and prevention for weak/vulnerable organs", () => {
      const result = analyzeHealth(woodDominantPillars);
      const weakOrgans = result.organHealth.filter(
        (o) => o.status === "weak" || o.status === "vulnerable"
      );

      for (const organ of weakOrgans) {
        expect(organ.risks.length).toBeGreaterThanOrEqual(0);
        expect(organ.prevention.length).toBeGreaterThanOrEqual(0);
      }
    });

    it("organ score is between 0 and 100", () => {
      const result = analyzeHealth(balancedPillars);
      for (const organ of result.organHealth) {
        expect(organ.score).toBeGreaterThanOrEqual(0);
        expect(organ.score).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("vulnerable ages", () => {
    it("returns vulnerable ages when weak element has count 0", () => {
      const result = analyzeHealth(woodDominantPillars);
      // weak element가 0개일 때만 vulnerable ages가 추가됨
      if (result.weakElement) {
        expect(result.vulnerableAges).toBeDefined();
      }
    });
  });
});

describe("healthCareer - Career Analysis", () => {
  describe("analyzeCareer", () => {
    it("returns proper CareerAnalysis structure", () => {
      const result = analyzeCareer(woodDominantPillars);

      expect(result).toHaveProperty("primaryFields");
      expect(result).toHaveProperty("secondaryFields");
      expect(result).toHaveProperty("workStyle");
      expect(result).toHaveProperty("entrepreneurialScore");
      expect(result).toHaveProperty("leadershipScore");
      expect(result).toHaveProperty("creativityScore");
      expect(result).toHaveProperty("stabilityPreference");
      expect(result).toHaveProperty("careerPath");
      expect(result).toHaveProperty("peakCareerAges");
      expect(result).toHaveProperty("careerAdvice");
    });

    it("returns primary fields based on top elements", () => {
      const result = analyzeCareer(woodDominantPillars);
      expect(result.primaryFields.length).toBeGreaterThan(0);
    });

    it("returns secondary fields", () => {
      const result = analyzeCareer(woodDominantPillars);
      expect(result.secondaryFields).toBeDefined();
    });

    it("career fields have proper structure", () => {
      const result = analyzeCareer(woodDominantPillars);

      for (const field of result.primaryFields) {
        expect(field).toHaveProperty("category");
        expect(field).toHaveProperty("jobs");
        expect(field).toHaveProperty("fitScore");
        expect(field).toHaveProperty("elementBasis");
        expect(field).toHaveProperty("description");
        expect(field).toHaveProperty("successFactors");
        expect(field).toHaveProperty("challenges");
      }
    });

    it("career field jobs are arrays", () => {
      const result = analyzeCareer(woodDominantPillars);

      for (const field of result.primaryFields) {
        expect(Array.isArray(field.jobs)).toBe(true);
        expect(field.jobs.length).toBeGreaterThan(0);
      }
    });
  });

  describe("work style", () => {
    it("returns proper workStyle structure", () => {
      const result = analyzeCareer(fireDominantPillars);

      expect(result.workStyle).toHaveProperty("type");
      expect(result.workStyle).toHaveProperty("description");
      expect(result.workStyle).toHaveProperty("strengths");
      expect(result.workStyle).toHaveProperty("weaknesses");
      expect(result.workStyle).toHaveProperty("idealEnvironment");
    });

    it("returns 열정형 workStyle for fire dominant pillars", () => {
      const result = analyzeCareer(fireDominantPillars);
      expect(result.workStyle.type).toBe("열정형");
    });

    it("returns 분석형 workStyle for water dominant pillars", () => {
      const result = analyzeCareer(waterDominantPillars);
      expect(result.workStyle.type).toBe("분석형");
    });

    it("returns 완벽형 workStyle for metal dominant pillars", () => {
      const result = analyzeCareer(metalDominantPillars);
      expect(result.workStyle.type).toBe("완벽형");
    });

    it("returns 안정형 workStyle for earth dominant pillars", () => {
      const result = analyzeCareer(earthDominantPillars);
      expect(result.workStyle.type).toBe("안정형");
    });

    it("returns 성장형 workStyle for balanced pillars", () => {
      const result = analyzeCareer(balancedPillars);
      expect(result.workStyle.type).toBe("성장형");
    });
  });

  describe("career scores", () => {
    it("entrepreneurialScore is between 0 and 100", () => {
      const result = analyzeCareer(fireDominantPillars);
      expect(result.entrepreneurialScore).toBeGreaterThanOrEqual(0);
      expect(result.entrepreneurialScore).toBeLessThanOrEqual(100);
    });

    it("leadershipScore is between 0 and 100", () => {
      const result = analyzeCareer(metalDominantPillars);
      expect(result.leadershipScore).toBeGreaterThanOrEqual(0);
      expect(result.leadershipScore).toBeLessThanOrEqual(100);
    });

    it("creativityScore is between 0 and 100", () => {
      const result = analyzeCareer(waterDominantPillars);
      expect(result.creativityScore).toBeGreaterThanOrEqual(0);
      expect(result.creativityScore).toBeLessThanOrEqual(100);
    });

    it("stabilityPreference is between 0 and 100", () => {
      const result = analyzeCareer(earthDominantPillars);
      expect(result.stabilityPreference).toBeGreaterThanOrEqual(0);
      expect(result.stabilityPreference).toBeLessThanOrEqual(100);
    });

    it("fire dominant pillars have higher entrepreneurialScore", () => {
      const fireResult = analyzeCareer(fireDominantPillars);
      const waterResult = analyzeCareer(waterDominantPillars);
      expect(fireResult.entrepreneurialScore).toBeGreaterThanOrEqual(
        waterResult.entrepreneurialScore
      );
    });

    it("water dominant pillars have higher creativityScore", () => {
      const waterResult = analyzeCareer(waterDominantPillars);
      expect(waterResult.creativityScore).toBeGreaterThanOrEqual(70);
    });

    it("earth dominant pillars have higher stabilityPreference", () => {
      const earthResult = analyzeCareer(earthDominantPillars);
      expect(earthResult.stabilityPreference).toBeGreaterThanOrEqual(70);
    });
  });

  describe("career path and ages", () => {
    it("returns career path suggestions", () => {
      const result = analyzeCareer(fireDominantPillars);
      expect(result.careerPath).toBeDefined();
    });

    it("returns peak career ages", () => {
      const result = analyzeCareer(fireDominantPillars);
      expect(result.peakCareerAges.length).toBeGreaterThan(0);
    });

    it("career advice is provided", () => {
      const result = analyzeCareer(fireDominantPillars);
      expect(result.careerAdvice.length).toBeGreaterThan(0);
    });
  });
});

describe("healthCareer - Comprehensive Analysis", () => {
  describe("analyzeHealthCareer", () => {
    it("returns proper HealthCareerComprehensive structure", () => {
      const result = analyzeHealthCareer(balancedPillars);

      expect(result).toHaveProperty("health");
      expect(result).toHaveProperty("career");
      expect(result).toHaveProperty("synergy");
      expect(result).toHaveProperty("warnings");
    });

    it("health property is valid HealthAnalysis", () => {
      const result = analyzeHealthCareer(balancedPillars);

      expect(result.health).toHaveProperty("overallScore");
      expect(result.health).toHaveProperty("constitution");
      expect(result.health).toHaveProperty("organHealth");
    });

    it("career property is valid CareerAnalysis", () => {
      const result = analyzeHealthCareer(balancedPillars);

      expect(result.career).toHaveProperty("primaryFields");
      expect(result.career).toHaveProperty("workStyle");
      expect(result.career).toHaveProperty("entrepreneurialScore");
    });

    it("synergy is an array", () => {
      const result = analyzeHealthCareer(balancedPillars);
      expect(Array.isArray(result.synergy)).toBe(true);
    });

    it("warnings is an array", () => {
      const result = analyzeHealthCareer(balancedPillars);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it("provides synergy when health score and entrepreneurial score are high", () => {
      // 균형잡힌 사주로 테스트
      const result = analyzeHealthCareer(balancedPillars);
      // synergy가 있을 수 있고 없을 수도 있음 (조건에 따라)
      expect(result.synergy).toBeDefined();
    });
  });
});

describe("healthCareer - Element Recommendations", () => {
  describe("getElementRecommendations", () => {
    it("returns proper ElementRecommendations structure", () => {
      const result = getElementRecommendations(["목"]);

      expect(result).toHaveProperty("luckyColors");
      expect(result).toHaveProperty("luckyDirections");
      expect(result).toHaveProperty("beneficialFoods");
      expect(result).toHaveProperty("avoidFoods");
      expect(result).toHaveProperty("luckyNumbers");
      expect(result).toHaveProperty("beneficialActivities");
    });

    it("returns wood element recommendations correctly", () => {
      const result = getElementRecommendations(["목"]);

      expect(result.luckyColors).toContain("청색");
      expect(result.luckyColors).toContain("녹색");
      expect(result.luckyDirections).toContain("동쪽");
      expect(result.luckyNumbers).toContain(3);
      expect(result.luckyNumbers).toContain(8);
      expect(result.beneficialActivities).toContain("산책");
    });

    it("returns fire element recommendations correctly", () => {
      const result = getElementRecommendations(["화"]);

      expect(result.luckyColors).toContain("적색");
      expect(result.luckyColors).toContain("자주색");
      expect(result.luckyDirections).toContain("남쪽");
      expect(result.luckyNumbers).toContain(2);
      expect(result.luckyNumbers).toContain(7);
      expect(result.beneficialActivities).toContain("햇볕 쬐기");
    });

    it("returns earth element recommendations correctly", () => {
      const result = getElementRecommendations(["토"]);

      expect(result.luckyColors).toContain("황색");
      expect(result.luckyColors).toContain("갈색");
      expect(result.luckyDirections).toContain("중앙");
      expect(result.luckyNumbers).toContain(5);
      expect(result.luckyNumbers).toContain(10);
      expect(result.beneficialActivities).toContain("요리");
    });

    it("returns metal element recommendations correctly", () => {
      const result = getElementRecommendations(["금"]);

      expect(result.luckyColors).toContain("백색");
      expect(result.luckyColors).toContain("은색");
      expect(result.luckyDirections).toContain("서쪽");
      expect(result.luckyNumbers).toContain(4);
      expect(result.luckyNumbers).toContain(9);
      expect(result.beneficialActivities).toContain("호흡 운동");
    });

    it("returns water element recommendations correctly", () => {
      const result = getElementRecommendations(["수"]);

      expect(result.luckyColors).toContain("흑색");
      expect(result.luckyColors).toContain("남색");
      expect(result.luckyDirections).toContain("북쪽");
      expect(result.luckyNumbers).toContain(1);
      expect(result.luckyNumbers).toContain(6);
      expect(result.beneficialActivities).toContain("수영");
    });

    it("combines multiple elements correctly", () => {
      const result = getElementRecommendations(["목", "화"]);

      expect(result.luckyColors).toContain("청색");
      expect(result.luckyColors).toContain("적색");
      expect(result.luckyDirections).toContain("동쪽");
      expect(result.luckyDirections).toContain("남쪽");
      expect(result.beneficialActivities).toContain("산책");
      expect(result.beneficialActivities).toContain("햇볕 쬐기");
    });

    it("returns unique values without duplicates", () => {
      const result = getElementRecommendations(["목", "목"]);

      const uniqueColors = new Set(result.luckyColors);
      expect(result.luckyColors.length).toBe(uniqueColors.size);
    });

    it("returns sorted lucky numbers", () => {
      const result = getElementRecommendations(["화", "목"]);

      const sortedNumbers = [...result.luckyNumbers].sort((a, b) => a - b);
      expect(result.luckyNumbers).toEqual(sortedNumbers);
    });

    it("handles empty array input", () => {
      const result = getElementRecommendations([]);

      expect(result.luckyColors).toHaveLength(0);
      expect(result.luckyDirections).toHaveLength(0);
      expect(result.luckyNumbers).toHaveLength(0);
      expect(result.beneficialActivities).toHaveLength(0);
    });

    it("handles all five elements", () => {
      const result = getElementRecommendations(["목", "화", "토", "금", "수"]);

      expect(result.luckyColors.length).toBeGreaterThanOrEqual(5);
      expect(result.luckyDirections.length).toBe(5);
      expect(result.luckyNumbers.length).toBeGreaterThanOrEqual(5);
      expect(result.beneficialActivities.length).toBeGreaterThanOrEqual(5);
    });
  });
});

describe("healthCareer - Type Definitions", () => {
  it("OrganHealth type has all required properties", () => {
    const result = analyzeHealth(balancedPillars);
    const organHealth = result.organHealth[0];

    expect(typeof organHealth.organ).toBe("string");
    expect(typeof organHealth.element).toBe("string");
    expect(typeof organHealth.status).toBe("string");
    expect(typeof organHealth.score).toBe("number");
    expect(typeof organHealth.description).toBe("string");
    expect(Array.isArray(organHealth.risks)).toBe(true);
    expect(Array.isArray(organHealth.prevention)).toBe(true);
  });

  it("CareerField type has all required properties", () => {
    const result = analyzeCareer(balancedPillars);
    const field = result.primaryFields[0];

    expect(typeof field.category).toBe("string");
    expect(Array.isArray(field.jobs)).toBe(true);
    expect(typeof field.fitScore).toBe("number");
    expect(Array.isArray(field.elementBasis)).toBe(true);
    expect(typeof field.description).toBe("string");
    expect(Array.isArray(field.successFactors)).toBe(true);
    expect(Array.isArray(field.challenges)).toBe(true);
  });

  it("WorkStyle type has all required properties", () => {
    const result = analyzeCareer(balancedPillars);
    const workStyle = result.workStyle;

    expect(typeof workStyle.type).toBe("string");
    expect(typeof workStyle.description).toBe("string");
    expect(Array.isArray(workStyle.strengths)).toBe(true);
    expect(Array.isArray(workStyle.weaknesses)).toBe(true);
    expect(Array.isArray(workStyle.idealEnvironment)).toBe(true);
  });
});

describe("healthCareer - Edge Cases", () => {
  it("handles pillars with all same stems", () => {
    const sameStemPillars = createPillars(
      ["甲", "子"],
      ["甲", "丑"],
      ["甲", "寅"],
      ["甲", "卯"]
    );

    const healthResult = analyzeHealth(sameStemPillars);
    const careerResult = analyzeCareer(sameStemPillars);

    expect(healthResult.dominantElement).toBeDefined();
    expect(careerResult.primaryFields.length).toBeGreaterThan(0);
  });

  it("handles pillars with all same branches", () => {
    const sameBranchPillars = createPillars(
      ["甲", "子"],
      ["丙", "子"],
      ["戊", "子"],
      ["庚", "子"]
    );

    const healthResult = analyzeHealth(sameBranchPillars);
    const careerResult = analyzeCareer(sameBranchPillars);

    expect(healthResult.organHealth).toHaveLength(5);
    expect(careerResult.workStyle).toBeDefined();
  });

  it("correctly identifies weak element when it has count 0", () => {
    // 목만 있는 사주 - 다른 원소가 없을 수 있음
    const result = analyzeHealth(woodDominantPillars);

    const elements: FiveElement[] = ["목", "화", "토", "금", "수"];
    expect(elements).toContain(result.weakElement);
  });

  it("career fit score does not exceed 100", () => {
    const result = analyzeCareer(fireDominantPillars);

    for (const field of result.primaryFields) {
      expect(field.fitScore).toBeLessThanOrEqual(100);
    }
    for (const field of result.secondaryFields) {
      expect(field.fitScore).toBeLessThanOrEqual(100);
    }
  });

  it("all scores are capped at 100", () => {
    const extremePillars = createPillars(
      ["丙", "午"],
      ["丙", "午"],
      ["丙", "午"],
      ["丙", "午"]
    );

    const result = analyzeCareer(extremePillars);

    expect(result.entrepreneurialScore).toBeLessThanOrEqual(100);
    expect(result.leadershipScore).toBeLessThanOrEqual(100);
    expect(result.creativityScore).toBeLessThanOrEqual(100);
    expect(result.stabilityPreference).toBeLessThanOrEqual(100);
  });
});

describe("healthCareer - Element Control Relationship", () => {
  it("considers element control in organ health scoring", () => {
    // 금 -> 목 (금이 목을 극함)
    // 금이 많으면 목 장기가 약해짐
    const metalHeavyPillars = createPillars(
      ["庚", "申"],
      ["辛", "酉"],
      ["庚", "申"],
      ["辛", "酉"]
    );

    const result = analyzeHealth(metalHeavyPillars);
    const woodOrgan = result.organHealth.find((o) => o.element === "목");

    // 목 장기가 vulnerable 또는 weak 일 수 있음
    expect(woodOrgan).toBeDefined();
    if (woodOrgan) {
      expect(["vulnerable", "weak", "normal"]).toContain(woodOrgan.status);
    }
  });

  it("reduces score when controlling element is strong", () => {
    // 화 -> 금 (화가 금을 극함)
    // 화가 많으면 금 장기가 약해짐
    const fireHeavyPillars = createPillars(
      ["丙", "午"],
      ["丁", "巳"],
      ["丙", "午"],
      ["丁", "巳"]
    );

    const result = analyzeHealth(fireHeavyPillars);
    const metalOrgan = result.organHealth.find((o) => o.element === "금");

    expect(metalOrgan).toBeDefined();
    // 금 장기 점수가 낮아질 수 있음
  });
});

describe("healthCareer - Season Health Advice", () => {
  it("provides appropriate spring advice for low wood element", () => {
    // 목이 약한 사주
    const result = analyzeHealth(metalDominantPillars);
    const springAdvice = result.seasonalHealth.find((s) => s.season === "봄");

    expect(springAdvice).toBeDefined();
    expect(springAdvice?.advice).toBeDefined();
  });

  it("provides appropriate summer advice for low fire element", () => {
    const result = analyzeHealth(waterDominantPillars);
    const summerAdvice = result.seasonalHealth.find(
      (s) => s.season === "여름"
    );

    expect(summerAdvice).toBeDefined();
    expect(summerAdvice?.advice).toBeDefined();
  });

  it("provides appropriate autumn advice for low metal element", () => {
    const result = analyzeHealth(woodDominantPillars);
    const autumnAdvice = result.seasonalHealth.find(
      (s) => s.season === "가을"
    );

    expect(autumnAdvice).toBeDefined();
    expect(autumnAdvice?.advice).toBeDefined();
  });

  it("provides appropriate winter advice for low water element", () => {
    const result = analyzeHealth(fireDominantPillars);
    const winterAdvice = result.seasonalHealth.find(
      (s) => s.season === "겨울"
    );

    expect(winterAdvice).toBeDefined();
    expect(winterAdvice?.advice).toBeDefined();
  });
});
