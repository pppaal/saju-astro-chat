import { beforeEach } from "vitest";
import {
  IChingStatisticsEngine,
  THEORETICAL_PROBABILITIES,
  chiSquareTest,
  generateExpectedDistribution,
  getGlobalStatisticsEngine,
  resetGlobalStatisticsEngine,
  type HexagramReading,
  type ReadingCategory,
} from "@/lib/iChing/ichingStatistics";

// Helper to create mock readings
function createReading(
  hexagramNumber: number,
  changingLines: number[] = [],
  options: Partial<HexagramReading> = {}
): HexagramReading {
  return {
    id: `reading-${Math.random().toString(36).slice(2)}`,
    timestamp: options.timestamp || new Date(),
    hexagramNumber,
    changingLines,
    targetHexagram: options.targetHexagram,
    question: options.question,
    category: options.category,
    outcome: options.outcome,
    notes: options.notes,
  };
}

describe("ichingStatistics", () => {
  describe("IChingStatisticsEngine", () => {
    let engine: IChingStatisticsEngine;

    beforeEach(() => {
      engine = new IChingStatisticsEngine();
    });

    describe("basic operations", () => {
      it("initializes with empty readings", () => {
        expect(engine.count).toBe(0);
      });

      it("initializes with provided readings", () => {
        const readings = [createReading(1), createReading(2)];
        const engineWithData = new IChingStatisticsEngine(readings);
        expect(engineWithData.count).toBe(2);
      });

      it("adds single reading", () => {
        engine.addReading(createReading(1));
        expect(engine.count).toBe(1);
      });

      it("adds multiple readings", () => {
        engine.addReadings([createReading(1), createReading(2), createReading(3)]);
        expect(engine.count).toBe(3);
      });

      it("clears all data", () => {
        engine.addReadings([createReading(1), createReading(2)]);
        engine.clearData();
        expect(engine.count).toBe(0);
      });

      it("exports data correctly", () => {
        const readings = [createReading(1), createReading(2)];
        engine.addReadings(readings);
        const exported = engine.exportData();
        expect(exported).toHaveLength(2);
        expect(exported[0].hexagramNumber).toBe(1);
      });
    });

    describe("calculateOverallStatistics", () => {
      it("returns empty statistics for no readings", () => {
        const stats = engine.calculateOverallStatistics();

        expect(stats.totalReadings).toBe(0);
        expect(stats.avgChangingLinesPerReading).toBe(0);
        expect(stats.mostFrequentHexagram).toBe(0);
      });

      it("calculates hexagram distribution", () => {
        engine.addReadings([
          createReading(1),
          createReading(1),
          createReading(2),
        ]);

        const stats = engine.calculateOverallStatistics();

        expect(stats.hexagramDistribution[1]).toBe(2);
        expect(stats.hexagramDistribution[2]).toBe(1);
        expect(stats.mostFrequentHexagram).toBe(1);
      });

      it("calculates changing line distribution", () => {
        engine.addReadings([
          createReading(1, [1, 3]),
          createReading(2, [3, 5]),
          createReading(3, [1]),
        ]);

        const stats = engine.calculateOverallStatistics();

        expect(stats.changingLineDistribution[1]).toBe(2);
        expect(stats.changingLineDistribution[3]).toBe(2);
        expect(stats.changingLineDistribution[5]).toBe(1);
      });

      it("calculates average changing lines", () => {
        engine.addReadings([
          createReading(1, [1, 2, 3]),
          createReading(2, [4, 5]),
          createReading(3, []),
        ]);

        const stats = engine.calculateOverallStatistics();

        // (3 + 2 + 0) / 3 = 5/3 ≈ 1.67
        expect(stats.avgChangingLinesPerReading).toBeCloseTo(5 / 3, 2);
      });

      it("calculates category distribution", () => {
        engine.addReadings([
          createReading(1, [], { category: "career" }),
          createReading(2, [], { category: "career" }),
          createReading(3, [], { category: "relationship" }),
        ]);

        const stats = engine.calculateOverallStatistics();

        expect(stats.categoryDistribution.career).toBe(2);
        expect(stats.categoryDistribution.relationship).toBe(1);
      });

      it("calculates outcome distribution", () => {
        engine.addReadings([
          createReading(1, [], { outcome: "positive" }),
          createReading(2, [], { outcome: "positive" }),
          createReading(3, [], { outcome: "negative" }),
        ]);

        const stats = engine.calculateOverallStatistics();

        expect(stats.outcomeDistribution.positive).toBe(2);
        expect(stats.outcomeDistribution.negative).toBe(1);
      });

      it("tracks most frequent transition", () => {
        engine.addReadings([
          createReading(1, [1], { targetHexagram: 2 }),
          createReading(1, [1], { targetHexagram: 2 }),
          createReading(3, [3], { targetHexagram: 4 }),
        ]);

        const stats = engine.calculateOverallStatistics();

        expect(stats.mostFrequentTransition.from).toBe(1);
        expect(stats.mostFrequentTransition.to).toBe(2);
        expect(stats.mostFrequentTransition.count).toBe(2);
      });
    });

    describe("getHexagramStatistics", () => {
      it("returns statistics for specific hexagram", () => {
        engine.addReadings([
          createReading(1, [1, 2], { outcome: "positive" }),
          createReading(1, [3], { outcome: "neutral" }),
          createReading(2, [1], { targetHexagram: 1 }),
        ]);

        const stats = engine.getHexagramStatistics(1);

        expect(stats.hexagramNumber).toBe(1);
        expect(stats.frequency).toBe(3); // 2 as original + 1 as target
        expect(stats.asOriginal).toBe(2);
        expect(stats.asTarget).toBe(1);
      });

      it("calculates average changing lines for hexagram", () => {
        engine.addReadings([
          createReading(1, [1, 2, 3]),
          createReading(1, [4]),
        ]);

        const stats = engine.getHexagramStatistics(1);

        // (3 + 1) / 2 = 2
        expect(stats.avgChangingLines).toBe(2);
      });

      it("tracks most common changing line", () => {
        engine.addReadings([
          createReading(1, [3]),
          createReading(1, [3, 5]),
          createReading(1, [3]),
        ]);

        const stats = engine.getHexagramStatistics(1);

        expect(stats.mostCommonChangingLine).toBe(3);
      });
    });

    describe("getStatisticsByPeriod", () => {
      it("filters readings by date range", () => {
        const date1 = new Date("2024-01-01");
        const date2 = new Date("2024-02-01");
        const date3 = new Date("2024-03-01");

        engine.addReadings([
          createReading(1, [], { timestamp: date1 }),
          createReading(2, [], { timestamp: date2 }),
          createReading(3, [], { timestamp: date3 }),
        ]);

        const stats = engine.getStatisticsByPeriod(
          new Date("2024-01-15"),
          new Date("2024-02-15")
        );

        expect(stats.totalReadings).toBe(1);
        expect(stats.hexagramDistribution[2]).toBe(1);
      });
    });

    describe("getStatisticsByCategory", () => {
      it("filters readings by category", () => {
        engine.addReadings([
          createReading(1, [], { category: "career", outcome: "positive" }),
          createReading(2, [], { category: "career", outcome: "positive" }),
          createReading(3, [], { category: "relationship" }),
        ]);

        const result = engine.getStatisticsByCategory("career");

        expect(result.readings).toHaveLength(2);
        expect(result.topHexagrams.length).toBeGreaterThan(0);
        expect(result.outcomeRate.positive).toBe(100);
      });
    });

    describe("analyzeChangingLinePatterns", () => {
      it("counts no change readings", () => {
        engine.addReadings([
          createReading(1, []),
          createReading(2, []),
          createReading(3, [1]),
        ]);

        const patterns = engine.analyzeChangingLinePatterns();

        expect(patterns.noChange).toBe(2);
      });

      it("counts full change readings", () => {
        engine.addReadings([
          createReading(1, [1, 2, 3, 4, 5, 6]),
          createReading(2, [1]),
        ]);

        const patterns = engine.analyzeChangingLinePatterns();

        expect(patterns.fullChange).toBe(1);
      });

      it("tracks single line changes", () => {
        engine.addReadings([
          createReading(1, [3]),
          createReading(2, [3]),
          createReading(3, [5]),
        ]);

        const patterns = engine.analyzeChangingLinePatterns();

        expect(patterns.singleLine[3]).toBe(2);
        expect(patterns.singleLine[5]).toBe(1);
      });

      it("tracks double line changes", () => {
        engine.addReadings([
          createReading(1, [1, 3]),
          createReading(2, [1, 3]),
          createReading(3, [2, 5]),
        ]);

        const patterns = engine.analyzeChangingLinePatterns();

        expect(patterns.doubleLine["1-3"]).toBe(2);
        expect(patterns.doubleLine["2-5"]).toBe(1);
      });
    });

    describe("analyzeTransitionPatterns", () => {
      it("tracks transitions between hexagrams", () => {
        engine.addReadings([
          createReading(1, [1], { targetHexagram: 2 }),
          createReading(2, [1], { targetHexagram: 1 }),
          createReading(1, [1], { targetHexagram: 2 }),
        ]);

        const patterns = engine.analyzeTransitionPatterns();

        expect(patterns.transitions.get("1->2")).toBe(2);
        expect(patterns.transitions.get("2->1")).toBe(1);
      });

      it("identifies reversible pairs", () => {
        engine.addReadings([
          createReading(1, [1], { targetHexagram: 2 }),
          createReading(2, [1], { targetHexagram: 1 }),
        ]);

        const patterns = engine.analyzeTransitionPatterns();

        expect(patterns.reversiblePairs.length).toBeGreaterThan(0);
        expect(patterns.reversiblePairs[0].pair).toEqual([1, 2]);
      });

      it("identifies stable hexagrams", () => {
        engine.addReadings([
          createReading(1, []),
          createReading(1, []),
          createReading(2, [1]),
        ]);

        const patterns = engine.analyzeTransitionPatterns();

        expect(patterns.mostStable).toContain(1);
      });

      it("identifies volatile hexagrams", () => {
        engine.addReadings([
          createReading(1, [1, 2, 3, 4]),
          createReading(1, [2, 3, 4, 5]),
          createReading(2, [1]),
        ]);

        const patterns = engine.analyzeTransitionPatterns();

        expect(patterns.mostVolatile).toContain(1);
      });
    });

    describe("analyzeTimePatterns", () => {
      it("tracks readings by hour", () => {
        const morning = new Date("2024-01-01T09:00:00");
        const evening = new Date("2024-01-01T21:00:00");

        engine.addReadings([
          createReading(1, [], { timestamp: morning }),
          createReading(2, [], { timestamp: morning }),
          createReading(3, [], { timestamp: evening }),
        ]);

        const patterns = engine.analyzeTimePatterns();

        expect(patterns.byHour[9]).toBe(2);
        expect(patterns.byHour[21]).toBe(1);
        expect(patterns.peakHour).toBe(9);
      });

      it("tracks readings by day of week", () => {
        const monday = new Date("2024-01-01"); // Monday
        const tuesday = new Date("2024-01-02"); // Tuesday

        engine.addReadings([
          createReading(1, [], { timestamp: monday }),
          createReading(2, [], { timestamp: monday }),
          createReading(3, [], { timestamp: tuesday }),
        ]);

        const patterns = engine.analyzeTimePatterns();

        expect(patterns.peakDay).toBe(1); // Monday
      });
    });

    describe("analyzeByPalace", () => {
      it("groups hexagrams by palace", () => {
        engine.addReadings([
          createReading(1, []), // 건궁
          createReading(44, []), // 건궁
          createReading(58, []), // 태궁
        ]);

        const palaceStats = engine.analyzeByPalace();

        expect(palaceStats["건궁(乾宮)"].count).toBe(2);
        expect(palaceStats["태궁(兌宮)"].count).toBe(1);
      });
    });

    describe("predictOutcome", () => {
      it("predicts based on similar readings", () => {
        engine.addReadings([
          createReading(1, [1], { outcome: "positive" }),
          createReading(1, [1], { outcome: "positive" }),
          createReading(1, [2], { outcome: "negative" }),
        ]);

        const prediction = engine.predictOutcome(1, [1]);

        expect(prediction.predictedOutcome).toBe("positive");
        expect(prediction.basedOn).toBe(3);
        expect(prediction.confidence).toBeGreaterThan(0);
      });

      it("returns neutral with zero confidence when no data", () => {
        const prediction = engine.predictOutcome(1, [1]);

        expect(prediction.predictedOutcome).toBe("neutral");
        expect(prediction.confidence).toBe(0);
        expect(prediction.basedOn).toBe(0);
      });
    });

    describe("generateStatisticsReport", () => {
      it("generates markdown report", () => {
        engine.addReadings([
          createReading(1, [1], { outcome: "positive", category: "career" }),
          createReading(2, [2], { outcome: "neutral" }),
        ]);

        const report = engine.generateStatisticsReport();

        expect(report).toContain("# 주역 통계 리포트");
        expect(report).toContain("총 리딩 수: 2");
        expect(report).toContain("변효 패턴");
        expect(report).toContain("결과 분포");
        expect(report).toContain("팔궁별 분포");
      });
    });
  });

  describe("THEORETICAL_PROBABILITIES", () => {
    it("yarrow stalk probabilities sum to 1", () => {
      const { oldYin, youngYang, youngYin, oldYang } = THEORETICAL_PROBABILITIES.yarrowStalk;
      expect(oldYin + youngYang + youngYin + oldYang).toBeCloseTo(1, 10);
    });

    it("coin toss probabilities sum to 1", () => {
      const { oldYin, youngYang, youngYin, oldYang } = THEORETICAL_PROBABILITIES.coinToss;
      expect(oldYin + youngYang + youngYin + oldYang).toBeCloseTo(1, 10);
    });

    it("hexagram probability is 1/64", () => {
      expect(THEORETICAL_PROBABILITIES.hexagramProbability).toBeCloseTo(1 / 64, 10);
    });
  });

  describe("chiSquareTest", () => {
    it("returns chi-square value and significance", () => {
      const observed = { 1: 20, 2: 15, 3: 25 };
      const expected = { 1: 20, 2: 20, 3: 20 };

      const result = chiSquareTest(observed, expected);

      expect(result.chiSquare).toBeGreaterThanOrEqual(0);
      expect(result.degreesOfFreedom).toBeGreaterThan(0);
      expect(typeof result.significant).toBe("boolean");
    });

    it("returns low chi-square for matching distributions", () => {
      const observed = { 1: 10, 2: 10, 3: 10 };
      const expected = { 1: 10, 2: 10, 3: 10 };

      const result = chiSquareTest(observed, expected);

      expect(result.chiSquare).toBe(0);
      expect(result.significant).toBe(false);
    });
  });

  describe("generateExpectedDistribution", () => {
    it("generates uniform distribution for 64 categories", () => {
      const expected = generateExpectedDistribution(640, 64);

      expect(Object.keys(expected)).toHaveLength(64);
      expect(expected[1]).toBe(10);
      expect(expected[64]).toBe(10);
    });

    it("uses default 64 categories", () => {
      const expected = generateExpectedDistribution(128);

      expect(Object.keys(expected)).toHaveLength(64);
      expect(expected[1]).toBe(2);
    });
  });

  describe("global statistics engine", () => {
    it("returns singleton instance", () => {
      resetGlobalStatisticsEngine();
      const engine1 = getGlobalStatisticsEngine();
      const engine2 = getGlobalStatisticsEngine();

      expect(engine1).toBe(engine2);
    });

    it("resets global engine", () => {
      const engine1 = getGlobalStatisticsEngine();
      engine1.addReading(createReading(1));
      expect(engine1.count).toBe(1);

      resetGlobalStatisticsEngine();
      const engine2 = getGlobalStatisticsEngine();
      expect(engine2.count).toBe(0);
    });
  });
});
