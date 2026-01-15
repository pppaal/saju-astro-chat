// tests/lib/Saju/sajuStatistics.test.ts

import {
  calculateStatisticalSummary,
  calculateCorrelation,
  chiSquareTest,
  calculateElementDistribution,
  calculateStemDistribution,
  calculateBranchDistribution,
  calculateDayMasterDistribution,
  calculateYinYangRatio,
  performFrequencyAnalysis,
  analyzeGabjaFrequency,
  calculateRarityScore,
  analyzeElementCorrelations,
  performClusterAnalysis,
  detectAnomalies,
  calculatePopulationStats,
  analyzeTrend,
  generateStatisticsReport,
  type SajuResult,
  type ElementDistribution,
  type StemDistribution,
  type BranchDistribution,
  type StatisticalSummary,
  type PopulationStats,
  type RarityScore,
  type AnomalyDetection,
  type TrendAnalysis,
  type FrequencyAnalysis,
  type ClusterAnalysis,
} from "../../../src/lib/Saju/sajuStatistics";

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

// 테스트용 샘플 데이터
const sampleSaju1 = createSajuResult(
  ["甲", "寅"],
  ["乙", "卯"],
  ["丙", "午"],
  ["丁", "巳"]
);

const sampleSaju2 = createSajuResult(
  ["戊", "辰"],
  ["己", "丑"],
  ["庚", "申"],
  ["辛", "酉"]
);

const sampleSaju3 = createSajuResult(
  ["壬", "子"],
  ["癸", "亥"],
  ["甲", "寅"],
  ["乙", "卯"]
);

const sampleSajuList = [sampleSaju1, sampleSaju2, sampleSaju3];

// 극단적 사주 (목 편중)
const extremeWoodSaju = createSajuResult(
  ["甲", "寅"],
  ["甲", "卯"],
  ["乙", "寅"],
  ["乙", "卯"]
);

// 균형 잡힌 사주
const balancedSaju = createSajuResult(
  ["甲", "子"],
  ["丙", "午"],
  ["戊", "辰"],
  ["庚", "申"]
);

describe("sajuStatistics - Statistical Summary", () => {
  describe("calculateStatisticalSummary", () => {
    it("returns correct mean", () => {
      const result = calculateStatisticalSummary([1, 2, 3, 4, 5]);
      expect(result.mean).toBe(3);
    });

    it("returns correct median for odd length", () => {
      const result = calculateStatisticalSummary([1, 2, 3, 4, 5]);
      expect(result.median).toBe(3);
    });

    it("returns correct median for even length", () => {
      const result = calculateStatisticalSummary([1, 2, 3, 4]);
      expect(result.median).toBe(2.5);
    });

    it("returns correct mode", () => {
      const result = calculateStatisticalSummary([1, 2, 2, 3, 3, 3]);
      expect(result.mode).toContain(3);
    });

    it("returns multiple modes when applicable", () => {
      const result = calculateStatisticalSummary([1, 1, 2, 2, 3]);
      expect(result.mode).toContain(1);
      expect(result.mode).toContain(2);
    });

    it("returns correct variance and standard deviation", () => {
      const result = calculateStatisticalSummary([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(result.variance).toBeGreaterThan(0);
      expect(result.standardDeviation).toBe(Math.sqrt(result.variance));
    });

    it("returns correct min, max, range", () => {
      const result = calculateStatisticalSummary([1, 5, 3, 9, 2]);
      expect(result.min).toBe(1);
      expect(result.max).toBe(9);
      expect(result.range).toBe(8);
    });

    it("returns quartiles", () => {
      const result = calculateStatisticalSummary([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(result.quartiles.q1).toBeDefined();
      expect(result.quartiles.q2).toBe(result.median);
      expect(result.quartiles.q3).toBeDefined();
    });

    it("returns skewness and kurtosis", () => {
      const result = calculateStatisticalSummary([1, 2, 3, 4, 5]);
      expect(typeof result.skewness).toBe("number");
      expect(typeof result.kurtosis).toBe("number");
    });

    it("handles empty array", () => {
      const result = calculateStatisticalSummary([]);
      expect(result.mean).toBe(0);
      expect(result.median).toBe(0);
      expect(result.mode).toEqual([]);
      expect(result.variance).toBe(0);
    });

    it("handles single element", () => {
      const result = calculateStatisticalSummary([5]);
      expect(result.mean).toBe(5);
      expect(result.median).toBe(5);
      expect(result.min).toBe(5);
      expect(result.max).toBe(5);
    });
  });
});

describe("sajuStatistics - Correlation", () => {
  describe("calculateCorrelation", () => {
    it("returns 1 for perfect positive correlation", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      const result = calculateCorrelation(x, y);
      expect(result).toBeCloseTo(1, 5);
    });

    it("returns -1 for perfect negative correlation", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [10, 8, 6, 4, 2];
      const result = calculateCorrelation(x, y);
      expect(result).toBeCloseTo(-1, 5);
    });

    it("returns 0 for no correlation", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [5, 4, 3, 2, 1];
      // 이 경우는 완벽한 음의 상관관계
      const result = calculateCorrelation([1, 2, 3, 4, 5], [3, 1, 4, 1, 5]);
      expect(Math.abs(result)).toBeLessThan(1);
    });

    it("returns 0 for mismatched lengths", () => {
      const result = calculateCorrelation([1, 2, 3], [1, 2]);
      expect(result).toBe(0);
    });

    it("returns 0 for empty arrays", () => {
      const result = calculateCorrelation([], []);
      expect(result).toBe(0);
    });

    it("handles constant values", () => {
      const x = [5, 5, 5, 5];
      const y = [1, 2, 3, 4];
      const result = calculateCorrelation(x, y);
      expect(result).toBe(0); // 분산이 0이면 0 반환
    });
  });
});

describe("sajuStatistics - Chi-Square Test", () => {
  describe("chiSquareTest", () => {
    it("returns chi-square value", () => {
      const observed = [10, 20, 30, 40];
      const expected = [25, 25, 25, 25];
      const result = chiSquareTest(observed, expected);
      expect(result.chiSquare).toBeGreaterThan(0);
    });

    it("returns significance flag", () => {
      const observed = [50, 50];
      const expected = [50, 50];
      const result = chiSquareTest(observed, expected);
      expect(typeof result.significant).toBe("boolean");
    });

    it("returns pValue", () => {
      const observed = [10, 20];
      const expected = [15, 15];
      const result = chiSquareTest(observed, expected);
      expect(result.pValue).toBeDefined();
    });

    it("handles mismatched lengths", () => {
      const result = chiSquareTest([10, 20], [10]);
      expect(result.chiSquare).toBe(0);
      expect(result.significant).toBe(false);
    });

    it("handles zero expected values gracefully", () => {
      const observed = [10, 0, 20];
      const expected = [10, 0, 20];
      expect(() => chiSquareTest(observed, expected)).not.toThrow();
    });
  });
});

describe("sajuStatistics - Element Distribution", () => {
  describe("calculateElementDistribution", () => {
    it("returns proper ElementDistribution structure", () => {
      const result = calculateElementDistribution(sampleSajuList);
      expect(result).toHaveProperty("목");
      expect(result).toHaveProperty("화");
      expect(result).toHaveProperty("토");
      expect(result).toHaveProperty("금");
      expect(result).toHaveProperty("수");
      expect(result).toHaveProperty("total");
    });

    it("total equals sum of all elements", () => {
      const result = calculateElementDistribution(sampleSajuList);
      const sum = result.목 + result.화 + result.토 + result.금 + result.수;
      expect(result.total).toBe(sum);
    });

    it("counts both stems and branches", () => {
      // 각 사주는 8개 요소 (4 천간 + 4 지지)
      const result = calculateElementDistribution([sampleSaju1]);
      expect(result.total).toBe(8);
    });

    it("handles empty list", () => {
      const result = calculateElementDistribution([]);
      expect(result.total).toBe(0);
      expect(result.목).toBe(0);
    });

    it("correctly identifies wood-heavy saju", () => {
      const result = calculateElementDistribution([extremeWoodSaju]);
      expect(result.목).toBeGreaterThan(result.화);
      expect(result.목).toBeGreaterThan(result.토);
      expect(result.목).toBeGreaterThan(result.금);
      expect(result.목).toBeGreaterThan(result.수);
    });
  });
});

describe("sajuStatistics - Stem Distribution", () => {
  describe("calculateStemDistribution", () => {
    it("returns proper StemDistribution structure", () => {
      const result = calculateStemDistribution(sampleSajuList);
      expect(result).toHaveProperty("甲");
      expect(result).toHaveProperty("乙");
      expect(result).toHaveProperty("丙");
      expect(result).toHaveProperty("丁");
      expect(result).toHaveProperty("戊");
      expect(result).toHaveProperty("己");
      expect(result).toHaveProperty("庚");
      expect(result).toHaveProperty("辛");
      expect(result).toHaveProperty("壬");
      expect(result).toHaveProperty("癸");
      expect(result).toHaveProperty("total");
    });

    it("counts 4 stems per saju", () => {
      const result = calculateStemDistribution([sampleSaju1]);
      expect(result.total).toBe(4);
    });

    it("handles empty list", () => {
      const result = calculateStemDistribution([]);
      expect(result.total).toBe(0);
    });
  });
});

describe("sajuStatistics - Branch Distribution", () => {
  describe("calculateBranchDistribution", () => {
    it("returns proper BranchDistribution structure", () => {
      const result = calculateBranchDistribution(sampleSajuList);
      expect(result).toHaveProperty("子");
      expect(result).toHaveProperty("丑");
      expect(result).toHaveProperty("寅");
      expect(result).toHaveProperty("卯");
      expect(result).toHaveProperty("辰");
      expect(result).toHaveProperty("巳");
      expect(result).toHaveProperty("午");
      expect(result).toHaveProperty("未");
      expect(result).toHaveProperty("申");
      expect(result).toHaveProperty("酉");
      expect(result).toHaveProperty("戌");
      expect(result).toHaveProperty("亥");
      expect(result).toHaveProperty("total");
    });

    it("counts 4 branches per saju", () => {
      const result = calculateBranchDistribution([sampleSaju1]);
      expect(result.total).toBe(4);
    });

    it("handles empty list", () => {
      const result = calculateBranchDistribution([]);
      expect(result.total).toBe(0);
    });
  });
});

describe("sajuStatistics - Day Master Distribution", () => {
  describe("calculateDayMasterDistribution", () => {
    it("returns proper StemDistribution structure", () => {
      const result = calculateDayMasterDistribution(sampleSajuList);
      expect(result).toHaveProperty("total");
    });

    it("counts 1 day master per saju", () => {
      const result = calculateDayMasterDistribution(sampleSajuList);
      expect(result.total).toBe(sampleSajuList.length);
    });

    it("correctly identifies day master", () => {
      const result = calculateDayMasterDistribution([sampleSaju1]);
      expect(result["丙"]).toBe(1);
    });

    it("handles empty list", () => {
      const result = calculateDayMasterDistribution([]);
      expect(result.total).toBe(0);
    });
  });
});

describe("sajuStatistics - Yin Yang Ratio", () => {
  describe("calculateYinYangRatio", () => {
    it("returns yin and yang counts", () => {
      const result = calculateYinYangRatio(sampleSajuList);
      expect(result).toHaveProperty("yin");
      expect(result).toHaveProperty("yang");
    });

    it("total equals sample count", () => {
      const result = calculateYinYangRatio(sampleSajuList);
      expect(result.yin + result.yang).toBe(sampleSajuList.length);
    });

    it("handles empty list", () => {
      const result = calculateYinYangRatio([]);
      expect(result.yin).toBe(0);
      expect(result.yang).toBe(0);
    });
  });
});

describe("sajuStatistics - Frequency Analysis", () => {
  describe("performFrequencyAnalysis", () => {
    it("returns sorted frequency analysis", () => {
      const result = performFrequencyAnalysis(["a", "b", "a", "c", "a", "b"]);
      expect(result[0].item).toBe("a");
      expect(result[0].count).toBe(3);
    });

    it("calculates correct percentage", () => {
      const result = performFrequencyAnalysis(["a", "a", "b", "b"]);
      expect(result[0].percentage).toBe(50);
    });

    it("assigns correct ranks", () => {
      const result = performFrequencyAnalysis(["a", "a", "b"]);
      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(2);
    });

    it("handles empty array", () => {
      const result = performFrequencyAnalysis([]);
      expect(result).toHaveLength(0);
    });

    it("handles single item", () => {
      const result = performFrequencyAnalysis(["a"]);
      expect(result[0].count).toBe(1);
      expect(result[0].percentage).toBe(100);
    });
  });

  describe("analyzeGabjaFrequency", () => {
    it("returns frequency for all four pillars", () => {
      const result = analyzeGabjaFrequency(sampleSajuList);
      expect(result).toHaveProperty("yearPillar");
      expect(result).toHaveProperty("monthPillar");
      expect(result).toHaveProperty("dayPillar");
      expect(result).toHaveProperty("hourPillar");
    });

    it("each pillar has frequency entries", () => {
      const result = analyzeGabjaFrequency(sampleSajuList);
      expect(result.yearPillar.length).toBeGreaterThan(0);
      expect(result.monthPillar.length).toBeGreaterThan(0);
      expect(result.dayPillar.length).toBeGreaterThan(0);
      expect(result.hourPillar.length).toBeGreaterThan(0);
    });

    it("handles empty list", () => {
      const result = analyzeGabjaFrequency([]);
      expect(result.yearPillar).toHaveLength(0);
    });
  });
});

describe("sajuStatistics - Rarity Score", () => {
  describe("calculateRarityScore", () => {
    const populationStats: PopulationStats = {
      totalSamples: 100,
      elementDistribution: { 목: 20, 화: 20, 토: 20, 금: 20, 수: 20, total: 100 },
      stemDistribution: {
        甲: 10,
        乙: 10,
        丙: 10,
        丁: 10,
        戊: 10,
        己: 10,
        庚: 10,
        辛: 10,
        壬: 10,
        癸: 10,
        total: 100,
      },
      branchDistribution: {
        子: 8,
        丑: 8,
        寅: 9,
        卯: 8,
        辰: 8,
        巳: 9,
        午: 8,
        未: 8,
        申: 9,
        酉: 8,
        戌: 9,
        亥: 8,
        total: 100,
      },
      dayMasterDistribution: {
        甲: 10,
        乙: 10,
        丙: 10,
        丁: 10,
        戊: 10,
        己: 10,
        庚: 10,
        辛: 10,
        壬: 10,
        癸: 10,
        total: 100,
      },
      yinYangRatio: { yin: 50, yang: 50 },
      monthDistribution: {},
      hourDistribution: {},
      genderDistribution: { male: 50, female: 50 },
    };

    it("returns proper RarityScore structure", () => {
      const result = calculateRarityScore(balancedSaju, populationStats);
      expect(result).toHaveProperty("overall");
      expect(result).toHaveProperty("elementRarity");
      expect(result).toHaveProperty("stemRarity");
      expect(result).toHaveProperty("branchRarity");
      expect(result).toHaveProperty("combinationRarity");
      expect(result).toHaveProperty("description");
    });

    it("overall score is between 0 and 100", () => {
      const result = calculateRarityScore(balancedSaju, populationStats);
      expect(result.overall).toBeGreaterThanOrEqual(0);
      expect(result.overall).toBeLessThanOrEqual(100);
    });

    it("extreme saju has higher rarity", () => {
      const extremeResult = calculateRarityScore(
        extremeWoodSaju,
        populationStats
      );
      const balancedResult = calculateRarityScore(balancedSaju, populationStats);
      expect(extremeResult.overall).toBeGreaterThan(balancedResult.overall);
    });

    it("provides appropriate description", () => {
      const result = calculateRarityScore(balancedSaju, populationStats);
      expect(result.description.length).toBeGreaterThan(0);
    });
  });
});

describe("sajuStatistics - Element Correlations", () => {
  describe("analyzeElementCorrelations", () => {
    it("returns correlation for all 5 elements", () => {
      const attributes = sampleSajuList.map((_, i) => ({
        sajuIndex: i,
        attribute: i * 10,
      }));
      const result = analyzeElementCorrelations(sampleSajuList, attributes);
      expect(result).toHaveLength(5);
    });

    it("each result has proper structure", () => {
      const attributes = sampleSajuList.map((_, i) => ({
        sajuIndex: i,
        attribute: i * 10,
      }));
      const result = analyzeElementCorrelations(sampleSajuList, attributes);

      for (const corr of result) {
        expect(corr).toHaveProperty("variable1");
        expect(corr).toHaveProperty("variable2");
        expect(corr).toHaveProperty("correlation");
        expect(corr).toHaveProperty("pValue");
        expect(corr).toHaveProperty("significance");
      }
    });

    it("correlation is between -1 and 1", () => {
      const attributes = sampleSajuList.map((_, i) => ({
        sajuIndex: i,
        attribute: i * 10,
      }));
      const result = analyzeElementCorrelations(sampleSajuList, attributes);

      for (const corr of result) {
        expect(corr.correlation).toBeGreaterThanOrEqual(-1);
        expect(corr.correlation).toBeLessThanOrEqual(1);
      }
    });

    it("significance is valid value", () => {
      const attributes = sampleSajuList.map((_, i) => ({
        sajuIndex: i,
        attribute: i * 10,
      }));
      const result = analyzeElementCorrelations(sampleSajuList, attributes);
      const validSignificance = ["strong", "moderate", "weak", "none"];

      for (const corr of result) {
        expect(validSignificance).toContain(corr.significance);
      }
    });
  });
});

describe("sajuStatistics - Cluster Analysis", () => {
  describe("performClusterAnalysis", () => {
    it("returns cluster array", () => {
      const result = performClusterAnalysis(sampleSajuList, 3);
      expect(Array.isArray(result)).toBe(true);
    });

    it("each cluster has proper structure", () => {
      const result = performClusterAnalysis(sampleSajuList, 2);

      for (const cluster of result) {
        expect(cluster).toHaveProperty("clusterId");
        expect(cluster).toHaveProperty("centroid");
        expect(cluster).toHaveProperty("members");
        expect(cluster).toHaveProperty("characteristics");
        expect(cluster).toHaveProperty("size");
        expect(cluster).toHaveProperty("percentage");
      }
    });

    it("total members equals input size", () => {
      const result = performClusterAnalysis(sampleSajuList, 2);
      const totalMembers = result.reduce((sum, c) => sum + c.size, 0);
      expect(totalMembers).toBe(sampleSajuList.length);
    });

    it("percentages sum to 100", () => {
      const result = performClusterAnalysis(sampleSajuList, 2);
      const totalPercentage = result.reduce((sum, c) => sum + c.percentage, 0);
      expect(totalPercentage).toBeCloseTo(100, 1);
    });

    it("handles empty list", () => {
      const result = performClusterAnalysis([], 3);
      expect(result).toHaveLength(0);
    });

    it("handles k larger than samples", () => {
      const result = performClusterAnalysis(sampleSajuList, 10);
      expect(result.length).toBeLessThanOrEqual(sampleSajuList.length);
    });
  });
});

describe("sajuStatistics - Anomaly Detection", () => {
  describe("detectAnomalies", () => {
    const populationStats: PopulationStats = {
      totalSamples: 100,
      elementDistribution: { 목: 20, 화: 20, 토: 20, 금: 20, 수: 20, total: 100 },
      stemDistribution: {
        甲: 10,
        乙: 10,
        丙: 10,
        丁: 10,
        戊: 10,
        己: 10,
        庚: 10,
        辛: 10,
        壬: 10,
        癸: 10,
        total: 100,
      },
      branchDistribution: {
        子: 8,
        丑: 8,
        寅: 9,
        卯: 8,
        辰: 8,
        巳: 9,
        午: 8,
        未: 8,
        申: 9,
        酉: 8,
        戌: 9,
        亥: 8,
        total: 100,
      },
      dayMasterDistribution: {
        甲: 10,
        乙: 10,
        丙: 10,
        丁: 10,
        戊: 10,
        己: 10,
        庚: 10,
        辛: 10,
        壬: 10,
        癸: 10,
        total: 100,
      },
      yinYangRatio: { yin: 50, yang: 50 },
      monthDistribution: {},
      hourDistribution: {},
      genderDistribution: { male: 50, female: 50 },
    };

    it("returns proper AnomalyDetection structure", () => {
      const result = detectAnomalies(balancedSaju, populationStats);
      expect(result).toHaveProperty("isAnomaly");
      expect(result).toHaveProperty("anomalyScore");
      expect(result).toHaveProperty("anomalousFeatures");
      expect(result).toHaveProperty("explanation");
    });

    it("anomalyScore is between 0 and 1", () => {
      const result = detectAnomalies(balancedSaju, populationStats);
      expect(result.anomalyScore).toBeGreaterThanOrEqual(0);
      expect(result.anomalyScore).toBeLessThanOrEqual(1);
    });

    it("extreme saju has higher anomaly score", () => {
      const extremeResult = detectAnomalies(extremeWoodSaju, populationStats);
      const balancedResult = detectAnomalies(balancedSaju, populationStats);
      expect(extremeResult.anomalyScore).toBeGreaterThanOrEqual(
        balancedResult.anomalyScore
      );
    });

    it("provides explanation", () => {
      const result = detectAnomalies(balancedSaju, populationStats);
      expect(result.explanation.length).toBeGreaterThan(0);
    });

    it("identifies anomalous features", () => {
      const result = detectAnomalies(extremeWoodSaju, populationStats);
      expect(Array.isArray(result.anomalousFeatures)).toBe(true);
    });
  });
});

describe("sajuStatistics - Population Stats", () => {
  describe("calculatePopulationStats", () => {
    it("returns proper PopulationStats structure", () => {
      const result = calculatePopulationStats(sampleSajuList);
      expect(result).toHaveProperty("totalSamples");
      expect(result).toHaveProperty("elementDistribution");
      expect(result).toHaveProperty("stemDistribution");
      expect(result).toHaveProperty("branchDistribution");
      expect(result).toHaveProperty("dayMasterDistribution");
      expect(result).toHaveProperty("yinYangRatio");
      expect(result).toHaveProperty("monthDistribution");
      expect(result).toHaveProperty("hourDistribution");
      expect(result).toHaveProperty("genderDistribution");
    });

    it("totalSamples matches input length", () => {
      const result = calculatePopulationStats(sampleSajuList);
      expect(result.totalSamples).toBe(sampleSajuList.length);
    });

    it("handles metadata correctly", () => {
      const metadata = {
        gender: ["male", "female", "male"] as ("male" | "female")[],
        birthMonth: [1, 2, 3],
        birthHour: [10, 11, 12],
      };
      const result = calculatePopulationStats(sampleSajuList, metadata);
      expect(result.genderDistribution.male).toBe(2);
      expect(result.genderDistribution.female).toBe(1);
    });

    it("handles empty list", () => {
      const result = calculatePopulationStats([]);
      expect(result.totalSamples).toBe(0);
    });
  });
});

describe("sajuStatistics - Trend Analysis", () => {
  describe("analyzeTrend", () => {
    it("returns proper TrendAnalysis structure", () => {
      const result = analyzeTrend([1, 2, 3, 4, 5], ["A", "B", "C", "D", "E"]);
      expect(result).toHaveProperty("period");
      expect(result).toHaveProperty("trend");
      expect(result).toHaveProperty("changeRate");
      expect(result).toHaveProperty("forecast");
      expect(result).toHaveProperty("confidence");
    });

    it("identifies increasing trend", () => {
      const result = analyzeTrend([1, 2, 3, 4, 5], ["A", "B", "C", "D", "E"]);
      expect(result.trend).toBe("increasing");
      expect(result.changeRate).toBeGreaterThan(0);
    });

    it("identifies decreasing trend", () => {
      const result = analyzeTrend([5, 4, 3, 2, 1], ["A", "B", "C", "D", "E"]);
      expect(result.trend).toBe("decreasing");
      expect(result.changeRate).toBeLessThan(0);
    });

    it("identifies stable trend", () => {
      const result = analyzeTrend([5, 5, 5, 5, 5], ["A", "B", "C", "D", "E"]);
      expect(result.trend).toBe("stable");
    });

    it("identifies fluctuating trend", () => {
      const result = analyzeTrend([1, 10, 2, 9, 3], ["A", "B", "C", "D", "E"]);
      expect(result.trend).toBe("fluctuating");
    });

    it("provides forecast values", () => {
      const result = analyzeTrend([1, 2, 3, 4, 5], ["A", "B", "C", "D", "E"]);
      expect(result.forecast.length).toBe(3);
    });

    it("handles short arrays", () => {
      const result = analyzeTrend([1], ["A"]);
      expect(result.trend).toBe("stable");
      expect(result.forecast).toHaveLength(0);
    });

    it("confidence is between 0 and 100", () => {
      const result = analyzeTrend([1, 2, 3, 4, 5], ["A", "B", "C", "D", "E"]);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });
  });
});

describe("sajuStatistics - Statistics Report", () => {
  describe("generateStatisticsReport", () => {
    it("returns proper report structure", () => {
      const result = generateStatisticsReport(sampleSajuList);
      expect(result).toHaveProperty("populationStats");
      expect(result).toHaveProperty("frequencyAnalysis");
      expect(result).toHaveProperty("clusterAnalysis");
      expect(result).toHaveProperty("insights");
    });

    it("includes target rarity when target provided", () => {
      const result = generateStatisticsReport(sampleSajuList, sampleSaju1);
      expect(result.targetRarity).toBeDefined();
    });

    it("includes target anomaly when target provided", () => {
      const result = generateStatisticsReport(sampleSajuList, sampleSaju1);
      expect(result.targetAnomaly).toBeDefined();
    });

    it("generates insights", () => {
      const result = generateStatisticsReport(sampleSajuList);
      expect(result.insights.length).toBeGreaterThan(0);
    });

    it("handles empty list gracefully", () => {
      expect(() => generateStatisticsReport([])).not.toThrow();
    });
  });
});

describe("sajuStatistics - Type Definitions", () => {
  it("ElementDistribution has correct properties", () => {
    const dist: ElementDistribution = {
      목: 1,
      화: 2,
      토: 3,
      금: 4,
      수: 5,
      total: 15,
    };
    expect(dist.목 + dist.화 + dist.토 + dist.금 + dist.수).toBe(dist.total);
  });

  it("StatisticalSummary has all required properties", () => {
    const summary: StatisticalSummary = {
      mean: 5,
      median: 5,
      mode: [5],
      standardDeviation: 1,
      variance: 1,
      min: 1,
      max: 10,
      range: 9,
      quartiles: { q1: 3, q2: 5, q3: 7 },
      skewness: 0,
      kurtosis: 0,
    };
    expect(summary.range).toBe(summary.max - summary.min);
  });
});

describe("sajuStatistics - Edge Cases", () => {
  it("handles saju with all same stems", () => {
    const sameStemSaju = createSajuResult(
      ["甲", "子"],
      ["甲", "丑"],
      ["甲", "寅"],
      ["甲", "卯"]
    );
    const result = calculateStemDistribution([sameStemSaju]);
    expect(result["甲"]).toBe(4);
  });

  it("handles saju with all same branches", () => {
    const sameBranchSaju = createSajuResult(
      ["甲", "子"],
      ["乙", "子"],
      ["丙", "子"],
      ["丁", "子"]
    );
    const result = calculateBranchDistribution([sameBranchSaju]);
    expect(result["子"]).toBe(4);
  });

  it("handles large sample size", () => {
    const largeSample = Array(100).fill(sampleSaju1);
    expect(() => calculatePopulationStats(largeSample)).not.toThrow();
    expect(() => performClusterAnalysis(largeSample, 5)).not.toThrow();
  });

  it("cluster analysis handles k=1", () => {
    const result = performClusterAnalysis(sampleSajuList, 1);
    expect(result.length).toBe(1);
    expect(result[0].size).toBe(sampleSajuList.length);
  });
});
