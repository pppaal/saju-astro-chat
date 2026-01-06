/**
 * I Ching Statistics Engine - 1000% Level
 * 주역 통계 분석 엔진: 괘 분포, 변효 패턴, 역사적 통계, 개인 이력 분석
 */

// 통계 데이터 타입
export interface HexagramReading {
  id: string;
  timestamp: Date;
  hexagramNumber: number;
  changingLines: number[];
  targetHexagram?: number;
  question?: string;
  category?: ReadingCategory;
  outcome?: 'positive' | 'neutral' | 'negative';
  notes?: string;
}

export type ReadingCategory =
  | 'career'
  | 'relationship'
  | 'health'
  | 'wealth'
  | 'spiritual'
  | 'decision'
  | 'general';

export interface HexagramStatistics {
  hexagramNumber: number;
  frequency: number;
  percentage: number;
  asOriginal: number;
  asTarget: number;
  avgChangingLines: number;
  mostCommonChangingLine: number;
  outcomeDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  categoryDistribution: Record<ReadingCategory, number>;
}

export interface OverallStatistics {
  totalReadings: number;
  dateRange: { start: Date; end: Date };
  hexagramDistribution: Record<number, number>;
  changingLineDistribution: Record<number, number>;
  categoryDistribution: Record<ReadingCategory, number>;
  outcomeDistribution: Record<string, number>;
  avgChangingLinesPerReading: number;
  mostFrequentHexagram: number;
  leastFrequentHexagram: number;
  mostFrequentTransition: { from: number; to: number; count: number };
}

// 통계 엔진 클래스
export class IChingStatisticsEngine {
  private readings: HexagramReading[] = [];

  constructor(initialReadings?: HexagramReading[]) {
    if (initialReadings) {
      this.readings = initialReadings;
    }
  }

  // 리딩 추가
  addReading(reading: HexagramReading): void {
    this.readings.push(reading);
  }

  // 다수 리딩 추가
  addReadings(readings: HexagramReading[]): void {
    this.readings.push(...readings);
  }

  // 전체 통계 계산
  calculateOverallStatistics(): OverallStatistics {
    if (this.readings.length === 0) {
      return this.getEmptyStatistics();
    }

    const hexDist: Record<number, number> = {};
    const lineDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const catDist: Record<ReadingCategory, number> = {
      career: 0, relationship: 0, health: 0, wealth: 0,
      spiritual: 0, decision: 0, general: 0
    };
    const outcomeDist: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
    const transitions: Map<string, number> = new Map();

    let totalChangingLines = 0;

    const timestamps = this.readings.map(r => r.timestamp.getTime());
    const startDate = new Date(Math.min(...timestamps));
    const endDate = new Date(Math.max(...timestamps));

    for (const reading of this.readings) {
      // 괘 분포
      hexDist[reading.hexagramNumber] = (hexDist[reading.hexagramNumber] || 0) + 1;

      // 변효 분포
      for (const line of reading.changingLines) {
        lineDist[line]++;
        totalChangingLines++;
      }

      // 카테고리 분포
      if (reading.category) {
        catDist[reading.category]++;
      }

      // 결과 분포
      if (reading.outcome) {
        outcomeDist[reading.outcome]++;
      }

      // 전환 패턴
      if (reading.targetHexagram) {
        const key = `${reading.hexagramNumber}->${reading.targetHexagram}`;
        transitions.set(key, (transitions.get(key) || 0) + 1);
      }
    }

    // 가장 빈번한 전환 찾기
    let mostFrequentTransition = { from: 0, to: 0, count: 0 };
    transitions.forEach((count, key) => {
      if (count > mostFrequentTransition.count) {
        const [from, to] = key.split('->').map(Number);
        mostFrequentTransition = { from, to, count };
      }
    });

    // 가장/적게 빈번한 괘
    const hexEntries = Object.entries(hexDist);
    const sortedHex = hexEntries.sort((a, b) => b[1] - a[1]);
    const mostFrequent = sortedHex.length > 0 ? parseInt(sortedHex[0][0]) : 0;
    const leastFrequent = sortedHex.length > 0 ? parseInt(sortedHex[sortedHex.length - 1][0]) : 0;

    return {
      totalReadings: this.readings.length,
      dateRange: { start: startDate, end: endDate },
      hexagramDistribution: hexDist,
      changingLineDistribution: lineDist,
      categoryDistribution: catDist,
      outcomeDistribution: outcomeDist,
      avgChangingLinesPerReading: totalChangingLines / this.readings.length,
      mostFrequentHexagram: mostFrequent,
      leastFrequentHexagram: leastFrequent,
      mostFrequentTransition
    };
  }

  private getEmptyStatistics(): OverallStatistics {
    return {
      totalReadings: 0,
      dateRange: { start: new Date(), end: new Date() },
      hexagramDistribution: {},
      changingLineDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
      categoryDistribution: {
        career: 0, relationship: 0, health: 0, wealth: 0,
        spiritual: 0, decision: 0, general: 0
      },
      outcomeDistribution: { positive: 0, neutral: 0, negative: 0 },
      avgChangingLinesPerReading: 0,
      mostFrequentHexagram: 0,
      leastFrequentHexagram: 0,
      mostFrequentTransition: { from: 0, to: 0, count: 0 }
    };
  }

  // 특정 괘 통계
  getHexagramStatistics(hexagramNumber: number): HexagramStatistics {
    const relevantReadings = this.readings.filter(
      r => r.hexagramNumber === hexagramNumber || r.targetHexagram === hexagramNumber
    );

    const asOriginal = this.readings.filter(r => r.hexagramNumber === hexagramNumber).length;
    const asTarget = this.readings.filter(r => r.targetHexagram === hexagramNumber).length;

    const lineCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    let totalLines = 0;

    const catDist: Record<ReadingCategory, number> = {
      career: 0, relationship: 0, health: 0, wealth: 0,
      spiritual: 0, decision: 0, general: 0
    };

    const outcomeDist = { positive: 0, neutral: 0, negative: 0 };

    for (const reading of relevantReadings) {
      if (reading.hexagramNumber === hexagramNumber) {
        for (const line of reading.changingLines) {
          lineCounts[line]++;
          totalLines++;
        }
      }
      if (reading.category) catDist[reading.category]++;
      if (reading.outcome) outcomeDist[reading.outcome]++;
    }

    // 가장 빈번한 변효
    const mostCommonLine = Object.entries(lineCounts)
      .sort((a, b) => b[1] - a[1])[0];

    return {
      hexagramNumber,
      frequency: relevantReadings.length,
      percentage: this.readings.length > 0
        ? (relevantReadings.length / this.readings.length) * 100
        : 0,
      asOriginal,
      asTarget,
      avgChangingLines: asOriginal > 0 ? totalLines / asOriginal : 0,
      mostCommonChangingLine: mostCommonLine ? parseInt(mostCommonLine[0]) : 0,
      outcomeDistribution: outcomeDist,
      categoryDistribution: catDist
    };
  }

  // 기간별 통계
  getStatisticsByPeriod(startDate: Date, endDate: Date): OverallStatistics {
    const filteredReadings = this.readings.filter(r =>
      r.timestamp >= startDate && r.timestamp <= endDate
    );

    const tempEngine = new IChingStatisticsEngine(filteredReadings);
    return tempEngine.calculateOverallStatistics();
  }

  // 카테고리별 통계
  getStatisticsByCategory(category: ReadingCategory): {
    readings: HexagramReading[];
    topHexagrams: { hexagram: number; count: number }[];
    outcomeRate: { positive: number; neutral: number; negative: number };
  } {
    const categoryReadings = this.readings.filter(r => r.category === category);

    const hexCounts: Record<number, number> = {};
    const outcomes = { positive: 0, neutral: 0, negative: 0 };

    for (const reading of categoryReadings) {
      hexCounts[reading.hexagramNumber] = (hexCounts[reading.hexagramNumber] || 0) + 1;
      if (reading.outcome) outcomes[reading.outcome]++;
    }

    const topHexagrams = Object.entries(hexCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hex, count]) => ({ hexagram: parseInt(hex), count }));

    const total = categoryReadings.length || 1;
    const outcomeRate = {
      positive: (outcomes.positive / total) * 100,
      neutral: (outcomes.neutral / total) * 100,
      negative: (outcomes.negative / total) * 100
    };

    return { readings: categoryReadings, topHexagrams, outcomeRate };
  }

  // 변효 패턴 분석
  analyzeChangingLinePatterns(): {
    singleLine: Record<number, number>;
    doubleLine: Record<string, number>;
    noChange: number;
    fullChange: number;
    avgLines: number;
  } {
    const singleLine: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    const doubleLine: Record<string, number> = {};
    let noChange = 0;
    let fullChange = 0;
    let totalLines = 0;

    for (const reading of this.readings) {
      const lines = reading.changingLines;
      totalLines += lines.length;

      if (lines.length === 0) {
        noChange++;
      } else if (lines.length === 6) {
        fullChange++;
      } else if (lines.length === 1) {
        singleLine[lines[0]]++;
      } else if (lines.length === 2) {
        const key = lines.sort((a, b) => a - b).join('-');
        doubleLine[key] = (doubleLine[key] || 0) + 1;
      }
    }

    return {
      singleLine,
      doubleLine,
      noChange,
      fullChange,
      avgLines: this.readings.length > 0 ? totalLines / this.readings.length : 0
    };
  }

  // 전환 패턴 분석
  analyzeTransitionPatterns(): {
    transitions: Map<string, number>;
    reversiblePairs: { pair: [number, number]; count: number }[];
    mostStable: number[];
    mostVolatile: number[];
  } {
    const transitions = new Map<string, number>();
    const hexagramAsOriginal = new Map<number, number>();
    const hexagramAsTarget = new Map<number, number>();

    for (const reading of this.readings) {
      hexagramAsOriginal.set(
        reading.hexagramNumber,
        (hexagramAsOriginal.get(reading.hexagramNumber) || 0) + 1
      );

      if (reading.targetHexagram) {
        const key = `${reading.hexagramNumber}->${reading.targetHexagram}`;
        transitions.set(key, (transitions.get(key) || 0) + 1);

        hexagramAsTarget.set(
          reading.targetHexagram,
          (hexagramAsTarget.get(reading.targetHexagram) || 0) + 1
        );
      }
    }

    // 가역적 쌍 찾기
    const reversiblePairs: { pair: [number, number]; count: number }[] = [];
    transitions.forEach((count, key) => {
      const [from, to] = key.split('->').map(Number);
      const reverseKey = `${to}->${from}`;
      if (transitions.has(reverseKey) && from < to) {
        reversiblePairs.push({
          pair: [from, to],
          count: count + (transitions.get(reverseKey) || 0)
        });
      }
    });

    // 안정적인 괘 (변화가 적은)
    const noChangeReadings = this.readings.filter(r => r.changingLines.length === 0);
    const stableCounts = new Map<number, number>();
    for (const r of noChangeReadings) {
      stableCounts.set(r.hexagramNumber, (stableCounts.get(r.hexagramNumber) || 0) + 1);
    }
    const mostStable = Array.from(stableCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hex]) => hex);

    // 변화가 많은 괘
    const manyChangesReadings = this.readings.filter(r => r.changingLines.length >= 4);
    const volatileCounts = new Map<number, number>();
    for (const r of manyChangesReadings) {
      volatileCounts.set(r.hexagramNumber, (volatileCounts.get(r.hexagramNumber) || 0) + 1);
    }
    const mostVolatile = Array.from(volatileCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hex]) => hex);

    return { transitions, reversiblePairs, mostStable, mostVolatile };
  }

  // 시간대별 통계
  analyzeTimePatterns(): {
    byHour: Record<number, number>;
    byDayOfWeek: Record<number, number>;
    byMonth: Record<number, number>;
    peakHour: number;
    peakDay: number;
    peakMonth: number;
  } {
    const byHour: Record<number, number> = {};
    const byDayOfWeek: Record<number, number> = {};
    const byMonth: Record<number, number> = {};

    for (const reading of this.readings) {
      const date = reading.timestamp;
      const hour = date.getHours();
      const day = date.getDay();
      const month = date.getMonth() + 1;

      byHour[hour] = (byHour[hour] || 0) + 1;
      byDayOfWeek[day] = (byDayOfWeek[day] || 0) + 1;
      byMonth[month] = (byMonth[month] || 0) + 1;
    }

    const peakHour = this.findPeak(byHour);
    const peakDay = this.findPeak(byDayOfWeek);
    const peakMonth = this.findPeak(byMonth);

    return { byHour, byDayOfWeek, byMonth, peakHour, peakDay, peakMonth };
  }

  private findPeak(dist: Record<number, number>): number {
    const entries = Object.entries(dist);
    if (entries.length === 0) return 0;
    return parseInt(entries.sort((a, b) => b[1] - a[1])[0][0]);
  }

  // 팔궁별 통계
  analyzeByPalace(): Record<string, { count: number; hexagrams: number[] }> {
    // 팔궁 분류
    const palaces: Record<string, number[]> = {
      '건궁(乾宮)': [1, 44, 33, 12, 20, 23, 35, 14],
      '태궁(兌宮)': [58, 47, 45, 31, 39, 52, 15, 10],
      '이궁(離宮)': [30, 56, 50, 64, 4, 59, 6, 13],
      '진궁(震宮)': [51, 16, 40, 32, 46, 48, 28, 17],
      '손궁(巽宮)': [57, 9, 37, 42, 25, 21, 27, 18],
      '감궁(坎宮)': [29, 60, 3, 63, 49, 55, 36, 7],
      '간궁(艮宮)': [52, 22, 26, 41, 38, 10, 61, 53],
      '곤궁(坤宮)': [2, 24, 19, 11, 34, 43, 5, 8]
    };

    const result: Record<string, { count: number; hexagrams: number[] }> = {};

    for (const [palace, hexagrams] of Object.entries(palaces)) {
      const count = this.readings.filter(r => hexagrams.includes(r.hexagramNumber)).length;
      result[palace] = { count, hexagrams };
    }

    return result;
  }

  // 결과 예측 분석 (기존 데이터 기반)
  predictOutcome(hexagramNumber: number, changingLines: number[]): {
    predictedOutcome: 'positive' | 'neutral' | 'negative';
    confidence: number;
    basedOn: number;
  } {
    // 유사한 리딩 찾기
    const similarReadings = this.readings.filter(r =>
      r.hexagramNumber === hexagramNumber &&
      r.outcome !== undefined
    );

    // 변효 유사도 고려
    const scoredReadings = similarReadings.map(r => {
      const commonLines = r.changingLines.filter(l => changingLines.includes(l)).length;
      const totalLines = new Set([...r.changingLines, ...changingLines]).size;
      const similarity = totalLines > 0 ? commonLines / totalLines : 0;
      return { reading: r, similarity };
    });

    // 유사도 가중 투표
    const votes = { positive: 0, neutral: 0, negative: 0 };
    for (const { reading, similarity } of scoredReadings) {
      if (reading.outcome) {
        votes[reading.outcome] += 0.5 + similarity * 0.5;
      }
    }

    const totalVotes = votes.positive + votes.neutral + votes.negative;
    if (totalVotes === 0) {
      return { predictedOutcome: 'neutral', confidence: 0, basedOn: 0 };
    }

    let predictedOutcome: 'positive' | 'neutral' | 'negative' = 'neutral';
    let maxVotes = votes.neutral;

    if (votes.positive > maxVotes) {
      predictedOutcome = 'positive';
      maxVotes = votes.positive;
    }
    if (votes.negative > maxVotes) {
      predictedOutcome = 'negative';
      maxVotes = votes.negative;
    }

    const confidence = (maxVotes / totalVotes) * 100;

    return {
      predictedOutcome,
      confidence: Math.round(confidence),
      basedOn: similarReadings.length
    };
  }

  // 통계 리포트 생성
  generateStatisticsReport(): string {
    const stats = this.calculateOverallStatistics();
    const linePatterns = this.analyzeChangingLinePatterns();
    const timePatterns = this.analyzeTimePatterns();
    const palaceStats = this.analyzeByPalace();

    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

    const report = `# 주역 통계 리포트

## 개요
- 총 리딩 수: ${stats.totalReadings}
- 분석 기간: ${stats.dateRange.start.toLocaleDateString()} ~ ${stats.dateRange.end.toLocaleDateString()}
- 평균 변효 수: ${stats.avgChangingLinesPerReading.toFixed(2)}개

## 가장 자주 나온 괘
- 최다 출현: 제${stats.mostFrequentHexagram}괘
- 최소 출현: 제${stats.leastFrequentHexagram}괘
- 가장 빈번한 전환: ${stats.mostFrequentTransition.from}괘 → ${stats.mostFrequentTransition.to}괘 (${stats.mostFrequentTransition.count}회)

## 변효 패턴
- 불변괘 비율: ${((linePatterns.noChange / stats.totalReadings) * 100).toFixed(1)}%
- 전효변 비율: ${((linePatterns.fullChange / stats.totalReadings) * 100).toFixed(1)}%
- 가장 빈번한 단일 변효: ${Object.entries(linePatterns.singleLine).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'}효

## 시간 패턴
- 피크 시간: ${timePatterns.peakHour}시
- 피크 요일: ${dayNames[timePatterns.peakDay]}요일
- 피크 월: ${monthNames[timePatterns.peakMonth - 1]}

## 결과 분포
- 긍정: ${stats.outcomeDistribution.positive}건 (${((stats.outcomeDistribution.positive / stats.totalReadings) * 100).toFixed(1)}%)
- 중립: ${stats.outcomeDistribution.neutral}건 (${((stats.outcomeDistribution.neutral / stats.totalReadings) * 100).toFixed(1)}%)
- 부정: ${stats.outcomeDistribution.negative}건 (${((stats.outcomeDistribution.negative / stats.totalReadings) * 100).toFixed(1)}%)

## 팔궁별 분포
${Object.entries(palaceStats)
  .sort((a, b) => b[1].count - a[1].count)
  .map(([palace, data]) => `- ${palace}: ${data.count}건`)
  .join('\n')}
`;

    return report;
  }

  // 데이터 내보내기
  exportData(): HexagramReading[] {
    return [...this.readings];
  }

  // 데이터 초기화
  clearData(): void {
    this.readings = [];
  }

  // 리딩 개수
  get count(): number {
    return this.readings.length;
  }
}

// 64괘 이론적 확률 분석
export const THEORETICAL_PROBABILITIES = {
  // 전통적 시초점(蓍草占)에서 각 효의 확률
  yarrowStalk: {
    oldYin: 1 / 16,     // 6 (변하는 음)
    youngYang: 5 / 16,  // 7 (고정 양)
    youngYin: 7 / 16,   // 8 (고정 음)
    oldYang: 3 / 16     // 9 (변하는 양)
  },
  // 동전점에서 각 효의 확률
  coinToss: {
    oldYin: 1 / 8,      // 6
    youngYang: 3 / 8,   // 7
    youngYin: 3 / 8,    // 8
    oldYang: 1 / 8      // 9
  },
  // 각 괘가 나올 확률 (동전점 기준)
  hexagramProbability: 1 / 64
};

// 통계적 유의성 테스트
export function chiSquareTest(
  observed: Record<number, number>,
  expected: Record<number, number>
): { chiSquare: number; degreesOfFreedom: number; significant: boolean } {
  let chiSquare = 0;
  let df = 0;

  for (const key of Object.keys(observed)) {
    const numKey = parseInt(key);
    const obs = observed[numKey] || 0;
    const exp = expected[numKey] || 0;

    if (exp > 0) {
      chiSquare += Math.pow(obs - exp, 2) / exp;
      df++;
    }
  }

  df = Math.max(df - 1, 1);

  // 95% 신뢰수준에서의 임계값 (근사)
  // df=63일 때 약 82.5
  const criticalValue = df + 2 * Math.sqrt(2 * df);

  return {
    chiSquare,
    degreesOfFreedom: df,
    significant: chiSquare > criticalValue
  };
}

// 기대 분포 생성 (균등 분포)
export function generateExpectedDistribution(
  totalReadings: number,
  numCategories: number = 64
): Record<number, number> {
  const expected: Record<number, number> = {};
  const expectedPerCategory = totalReadings / numCategories;

  for (let i = 1; i <= numCategories; i++) {
    expected[i] = expectedPerCategory;
  }

  return expected;
}

// 싱글톤 인스턴스
let globalStatisticsEngine: IChingStatisticsEngine | null = null;

export function getGlobalStatisticsEngine(): IChingStatisticsEngine {
  if (!globalStatisticsEngine) {
    globalStatisticsEngine = new IChingStatisticsEngine();
  }
  return globalStatisticsEngine;
}

export function resetGlobalStatisticsEngine(): void {
  globalStatisticsEngine = new IChingStatisticsEngine();
}
