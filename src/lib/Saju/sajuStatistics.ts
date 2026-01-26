/**
 * sajuStatistics.ts - 사주 통계 분석 엔진 (1000% 레벨)
 *
 * 사주 데이터의 통계적 분석, 분포 분석, 상관관계 분석, 인구 통계
 */

import { FiveElement, StemBranchInfo } from './types';
import { STEMS, BRANCHES, JIJANGGAN } from './constants';

// 간소화된 사주 결과 인터페이스 (이 모듈 내부용)
interface SimplePillar {
  stem: string;
  branch: string;
}

interface SimpleFourPillars {
  year: SimplePillar;
  month: SimplePillar;
  day: SimplePillar;
  hour: SimplePillar;
}

export interface SajuResult {
  fourPillars: SimpleFourPillars;
  dayMaster?: string;
  [key: string]: unknown;
}

// ============================================================================
// 타입 정의
// ============================================================================

export interface ElementDistribution {
  목: number;
  화: number;
  토: number;
  금: number;
  수: number;
  total: number;
}

export interface StemDistribution {
  [key: string]: number;  // 인덱스 시그니처 추가
  甲: number; 乙: number; 丙: number; 丁: number; 戊: number;
  己: number; 庚: number; 辛: number; 壬: number; 癸: number;
  total: number;
}

export interface BranchDistribution {
  [key: string]: number;  // 인덱스 시그니처 추가
  子: number; 丑: number; 寅: number; 卯: number; 辰: number; 巳: number;
  午: number; 未: number; 申: number; 酉: number; 戌: number; 亥: number;
  total: number;
}

export interface StatisticalSummary {
  mean: number;
  median: number;
  mode: number[];
  standardDeviation: number;
  variance: number;
  min: number;
  max: number;
  range: number;
  quartiles: { q1: number; q2: number; q3: number };
  skewness: number;
  kurtosis: number;
}

export interface CorrelationResult {
  variable1: string;
  variable2: string;
  correlation: number;  // -1 to 1
  pValue: number;
  significance: 'strong' | 'moderate' | 'weak' | 'none';
}

export interface FrequencyAnalysis {
  item: string;
  count: number;
  percentage: number;
  rank: number;
}

export interface PopulationStats {
  totalSamples: number;
  elementDistribution: ElementDistribution;
  stemDistribution: StemDistribution;
  branchDistribution: BranchDistribution;
  dayMasterDistribution: StemDistribution;
  yinYangRatio: { yin: number; yang: number };
  monthDistribution: Record<number, number>;
  hourDistribution: Record<number, number>;
  genderDistribution: { male: number; female: number };
}

export interface RarityScore {
  overall: number;  // 0-100, 높을수록 희귀
  elementRarity: number;
  stemRarity: number;
  branchRarity: number;
  combinationRarity: number;
  description: string;
}

export interface TrendAnalysis {
  period: string;
  trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
  changeRate: number;
  forecast: number[];
  confidence: number;
}

export interface ClusterAnalysis {
  clusterId: number;
  centroid: Record<string, number>;
  members: SajuResult[];
  characteristics: string[];
  size: number;
  percentage: number;
}

export interface AnomalyDetection {
  isAnomaly: boolean;
  anomalyScore: number;  // 0-1
  anomalousFeatures: string[];
  explanation: string;
}

// ============================================================================
// 헬퍼 함수
// ============================================================================

function getStemElement(stemName: string): string {
  const stem = STEMS.find(s => s.name === stemName);
  return stem?.element || '토';
}

function getBranchElement(branchName: string): string {
  const branch = BRANCHES.find(b => b.name === branchName);
  return branch?.element || '토';
}

function getStemYinYang(stemName: string): '음' | '양' {
  const stem = STEMS.find(s => s.name === stemName);
  return stem?.yin_yang === '음' ? '음' : '양';
}

function getBranchYinYang(branchName: string): '음' | '양' {
  const branch = BRANCHES.find(b => b.name === branchName);
  return branch?.yin_yang === '음' ? '음' : '양';
}

// ============================================================================
// 기초 통계 함수
// ============================================================================

/**
 * 배열의 통계적 요약
 */
export function calculateStatisticalSummary(values: number[]): StatisticalSummary {
  if (values.length === 0) {
    return {
      mean: 0, median: 0, mode: [], standardDeviation: 0, variance: 0,
      min: 0, max: 0, range: 0, quartiles: { q1: 0, q2: 0, q3: 0 },
      skewness: 0, kurtosis: 0
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  // 평균
  const mean = sorted.reduce((sum, v) => sum + v, 0) / n;

  // 중앙값
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];

  // 최빈값
  const frequency: Record<number, number> = {};
  let maxFreq = 0;
  for (const v of sorted) {
    frequency[v] = (frequency[v] || 0) + 1;
    if (frequency[v] > maxFreq) {maxFreq = frequency[v];}
  }
  const mode = Object.entries(frequency)
    .filter(([_, f]) => f === maxFreq)
    .map(([v]) => Number(v));

  // 분산과 표준편차
  const variance = sorted.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const standardDeviation = Math.sqrt(variance);

  // 범위
  const min = sorted[0];
  const max = sorted[n - 1];
  const range = max - min;

  // 사분위수
  const q1 = sorted[Math.floor(n * 0.25)];
  const q2 = median;
  const q3 = sorted[Math.floor(n * 0.75)];

  // 왜도 (Skewness)
  const skewness = sorted.reduce((sum, v) => sum + Math.pow((v - mean) / standardDeviation, 3), 0) / n;

  // 첨도 (Kurtosis)
  const kurtosis = sorted.reduce((sum, v) => sum + Math.pow((v - mean) / standardDeviation, 4), 0) / n - 3;

  return {
    mean, median, mode, standardDeviation, variance,
    min, max, range, quartiles: { q1, q2, q3 },
    skewness, kurtosis
  };
}

/**
 * 피어슨 상관계수 계산
 */
export function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) {return 0;}

  const n = x.length;
  const meanX = x.reduce((sum, v) => sum + v, 0) / n;
  const meanY = y.reduce((sum, v) => sum + v, 0) / n;

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    numerator += diffX * diffY;
    denomX += diffX * diffX;
    denomY += diffY * diffY;
  }

  const denominator = Math.sqrt(denomX) * Math.sqrt(denomY);
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * 카이제곱 검정
 */
export function chiSquareTest(
  observed: number[],
  expected: number[]
): { chiSquare: number; pValue: number; significant: boolean } {
  if (observed.length !== expected.length) {
    return { chiSquare: 0, pValue: 1, significant: false };
  }

  let chiSquare = 0;
  for (let i = 0; i < observed.length; i++) {
    if (expected[i] > 0) {
      chiSquare += Math.pow(observed[i] - expected[i], 2) / expected[i];
    }
  }

  // 간략화된 p-value 추정 (자유도에 따른 임계값 비교)
  const df = observed.length - 1;
  const criticalValues: Record<number, number> = {
    1: 3.84, 2: 5.99, 3: 7.81, 4: 9.49, 5: 11.07,
    6: 12.59, 7: 14.07, 8: 15.51, 9: 16.92, 10: 18.31
  };

  const critical = criticalValues[df] || 3.84 + df * 2;
  const significant = chiSquare > critical;
  const pValue = significant ? 0.01 : 0.5; // 간략화

  return { chiSquare, pValue, significant };
}

// ============================================================================
// 사주 분포 분석
// ============================================================================

/**
 * 오행 분포 계산
 */
export function calculateElementDistribution(sajuList: SajuResult[]): ElementDistribution {
  const distribution: ElementDistribution = {
    목: 0, 화: 0, 토: 0, 금: 0, 수: 0, total: 0
  };

  for (const saju of sajuList) {
    const pillars = saju.fourPillars;

    // 천간 오행
    const stems = [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.hour.stem];
    for (const stem of stems) {
      const element = getStemElement(stem) as keyof ElementDistribution;
      if (element in distribution && element !== 'total') {
        distribution[element]++;
        distribution.total++;
      }
    }

    // 지지 오행
    const branches = [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.hour.branch];
    for (const branch of branches) {
      const element = getBranchElement(branch) as keyof ElementDistribution;
      if (element in distribution && element !== 'total') {
        distribution[element]++;
        distribution.total++;
      }
    }
  }

  return distribution;
}

/**
 * 천간 분포 계산
 */
export function calculateStemDistribution(sajuList: SajuResult[]): StemDistribution {
  const distribution: StemDistribution = {
    甲: 0, 乙: 0, 丙: 0, 丁: 0, 戊: 0,
    己: 0, 庚: 0, 辛: 0, 壬: 0, 癸: 0,
    total: 0
  };

  for (const saju of sajuList) {
    const pillars = saju.fourPillars;
    const stems = [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.hour.stem];

    for (const stem of stems) {
      if (stem in distribution && stem !== 'total') {
        distribution[stem]++;
        distribution.total++;
      }
    }
  }

  return distribution;
}

/**
 * 지지 분포 계산
 */
export function calculateBranchDistribution(sajuList: SajuResult[]): BranchDistribution {
  const distribution: BranchDistribution = {
    子: 0, 丑: 0, 寅: 0, 卯: 0, 辰: 0, 巳: 0,
    午: 0, 未: 0, 申: 0, 酉: 0, 戌: 0, 亥: 0,
    total: 0
  };

  for (const saju of sajuList) {
    const pillars = saju.fourPillars;
    const branches = [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.hour.branch];

    for (const branch of branches) {
      if (branch in distribution && branch !== 'total') {
        distribution[branch]++;
        distribution.total++;
      }
    }
  }

  return distribution;
}

/**
 * 일간(일주 천간) 분포 계산
 */
export function calculateDayMasterDistribution(sajuList: SajuResult[]): StemDistribution {
  const distribution: StemDistribution = {
    甲: 0, 乙: 0, 丙: 0, 丁: 0, 戊: 0,
    己: 0, 庚: 0, 辛: 0, 壬: 0, 癸: 0,
    total: 0
  };

  for (const saju of sajuList) {
    const dayMaster = saju.fourPillars.day.stem;
    if (dayMaster in distribution && dayMaster !== 'total') {
      distribution[dayMaster]++;
      distribution.total++;
    }
  }

  return distribution;
}

/**
 * 음양 비율 계산
 */
export function calculateYinYangRatio(sajuList: SajuResult[]): { yin: number; yang: number } {
  let yin = 0;
  let yang = 0;

  for (const saju of sajuList) {
    const dayMaster = saju.fourPillars.day.stem;
    if (getStemYinYang(dayMaster) === '음') {
      yin++;
    } else {
      yang++;
    }
  }

  return { yin, yang };
}

// ============================================================================
// 빈도 분석
// ============================================================================

/**
 * 빈도 분석 수행
 */
export function performFrequencyAnalysis(
  items: string[]
): FrequencyAnalysis[] {
  const counts: Record<string, number> = {};
  const total = items.length;

  for (const item of items) {
    counts[item] = (counts[item] || 0) + 1;
  }

  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([item, count], index) => ({
      item,
      count,
      percentage: (count / total) * 100,
      rank: index + 1
    }));

  return sorted;
}

/**
 * 60갑자 빈도 분석
 */
export function analyzeGabjaFrequency(sajuList: SajuResult[]): {
  yearPillar: FrequencyAnalysis[];
  monthPillar: FrequencyAnalysis[];
  dayPillar: FrequencyAnalysis[];
  hourPillar: FrequencyAnalysis[];
} {
  const yearPillars: string[] = [];
  const monthPillars: string[] = [];
  const dayPillars: string[] = [];
  const hourPillars: string[] = [];

  for (const saju of sajuList) {
    const p = saju.fourPillars;
    yearPillars.push(`${p.year.stem}${p.year.branch}`);
    monthPillars.push(`${p.month.stem}${p.month.branch}`);
    dayPillars.push(`${p.day.stem}${p.day.branch}`);
    hourPillars.push(`${p.hour.stem}${p.hour.branch}`);
  }

  return {
    yearPillar: performFrequencyAnalysis(yearPillars),
    monthPillar: performFrequencyAnalysis(monthPillars),
    dayPillar: performFrequencyAnalysis(dayPillars),
    hourPillar: performFrequencyAnalysis(hourPillars)
  };
}

// ============================================================================
// 희귀도 분석
// ============================================================================

/**
 * 사주 희귀도 점수 계산
 */
export function calculateRarityScore(
  saju: SajuResult,
  populationStats: PopulationStats
): RarityScore {
  const pillars = saju.fourPillars;

  // 오행 희귀도
  const elements = [
    getStemElement(pillars.year.stem), getStemElement(pillars.month.stem),
    getStemElement(pillars.day.stem), getStemElement(pillars.hour.stem),
    getBranchElement(pillars.year.branch), getBranchElement(pillars.month.branch),
    getBranchElement(pillars.day.branch), getBranchElement(pillars.hour.branch)
  ];

  const elementCounts: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const el of elements) {
    elementCounts[el]++;
  }

  // 편중도 계산 (편중될수록 희귀)
  const elementValues = Object.values(elementCounts);
  const maxElement = Math.max(...elementValues);
  const minElement = Math.min(...elementValues);
  const elementRarity = ((maxElement - minElement) / 8) * 100;

  // 천간 희귀도
  const dayMaster = pillars.day.stem;
  const dmDistribution = populationStats.dayMasterDistribution;
  const dmCount = (dmDistribution as Record<string, number>)[dayMaster] || 1;
  const dmPercentage = dmCount / dmDistribution.total;
  const stemRarity = (1 - dmPercentage) * 100;

  // 지지 희귀도 (특수한 조합)
  const branches = [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.hour.branch];
  const uniqueBranches = new Set(branches).size;
  const branchRarity = ((4 - uniqueBranches) / 3) * 50 + (uniqueBranches === 4 ? 0 : 50);

  // 조합 희귀도 (특수 격국, 공망 등)
  let combinationRarity = 0;

  // 종격 체크
  if (maxElement >= 6) {
    combinationRarity += 30; // 종격은 희귀
  }

  // 일행득기 체크
  if (Object.values(elementCounts).filter(v => v === 0).length >= 2) {
    combinationRarity += 20;
  }

  // 전체 희귀도
  const overall = (elementRarity * 0.3 + stemRarity * 0.2 + branchRarity * 0.2 + combinationRarity * 0.3);

  // 설명 생성
  let description: string;
  if (overall >= 80) {
    description = '매우 희귀한 사주 구성입니다. 독특한 운명의 소유자입니다.';
  } else if (overall >= 60) {
    description = '다소 희귀한 사주 구성입니다. 특별한 재능이나 운명이 있을 수 있습니다.';
  } else if (overall >= 40) {
    description = '보통 수준의 사주 구성입니다.';
  } else {
    description = '일반적인 사주 구성입니다.';
  }

  return {
    overall: Math.min(100, Math.max(0, overall)),
    elementRarity,
    stemRarity,
    branchRarity,
    combinationRarity,
    description
  };
}

// ============================================================================
// 상관관계 분석
// ============================================================================

/**
 * 오행과 특성 간 상관관계 분석
 */
export function analyzeElementCorrelations(
  sajuList: SajuResult[],
  attributes: { sajuIndex: number; attribute: number }[]
): CorrelationResult[] {
  const results: CorrelationResult[] = [];
  const elements = ['목', '화', '토', '금', '수'];

  for (const element of elements) {
    // 각 사주의 해당 오행 개수
    const elementCounts = sajuList.map(saju => {
      const pillars = saju.fourPillars;
      let count = 0;
      const stems = [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.hour.stem];
      const branches = [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.hour.branch];

      for (const stem of stems) {
        if (getStemElement(stem) === element) {count++;}
      }
      for (const branch of branches) {
        if (getBranchElement(branch) === element) {count++;}
      }
      return count;
    });

    // 속성 값 배열
    const attributeValues = attributes.map(a => a.attribute);

    // 상관계수 계산
    const correlation = calculateCorrelation(elementCounts, attributeValues);

    // 유의성 판단
    let significance: 'strong' | 'moderate' | 'weak' | 'none';
    const absCorr = Math.abs(correlation);
    if (absCorr >= 0.7) {significance = 'strong';}
    else if (absCorr >= 0.4) {significance = 'moderate';}
    else if (absCorr >= 0.2) {significance = 'weak';}
    else {significance = 'none';}

    results.push({
      variable1: `${element} 오행`,
      variable2: '속성',
      correlation,
      pValue: absCorr >= 0.4 ? 0.05 : 0.5, // 간략화
      significance
    });
  }

  return results;
}

// ============================================================================
// 군집 분석
// ============================================================================

/**
 * K-Means 스타일 군집 분석 (간략화)
 */
export function performClusterAnalysis(
  sajuList: SajuResult[],
  k: number = 5
): ClusterAnalysis[] {
  if (sajuList.length === 0) {return [];}

  // 특성 벡터 생성
  const features = sajuList.map(saju => extractFeatureVector(saju));

  // 초기 중심점 (첫 k개 또는 랜덤)
  const centroids = features.slice(0, Math.min(k, features.length));

  // 클러스터 할당
  const assignments: number[] = new Array(sajuList.length).fill(0);

  // 간단한 반복 (실제로는 더 정교한 알고리즘 필요)
  for (let iter = 0; iter < 10; iter++) {
    // 각 포인트를 가장 가까운 중심점에 할당
    for (let i = 0; i < features.length; i++) {
      let minDist = Infinity;
      let minCluster = 0;

      for (let j = 0; j < centroids.length; j++) {
        const dist = euclideanDistance(features[i], centroids[j]);
        if (dist < minDist) {
          minDist = dist;
          minCluster = j;
        }
      }
      assignments[i] = minCluster;
    }

    // 중심점 업데이트
    for (let j = 0; j < centroids.length; j++) {
      const clusterPoints = features.filter((_, i) => assignments[i] === j);
      if (clusterPoints.length > 0) {
        centroids[j] = calculateCentroid(clusterPoints);
      }
    }
  }

  // 결과 구성
  const clusters: ClusterAnalysis[] = [];
  for (let j = 0; j < centroids.length; j++) {
    const members = sajuList.filter((_, i) => assignments[i] === j);
    const centroidObj: Record<string, number> = {};
    ['목', '화', '토', '금', '수'].forEach((el, idx) => {
      centroidObj[el] = centroids[j][idx];
    });

    clusters.push({
      clusterId: j,
      centroid: centroidObj,
      members,
      characteristics: generateClusterCharacteristics(centroidObj),
      size: members.length,
      percentage: (members.length / sajuList.length) * 100
    });
  }

  return clusters.filter(c => c.size > 0);
}

function extractFeatureVector(saju: SajuResult): number[] {
  const pillars = saju.fourPillars;
  const elements = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };

  const stems = [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.hour.stem];
  const branches = [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.hour.branch];

  for (const stem of stems) {
    const el = getStemElement(stem);
    if (el in elements) {(elements as Record<string, number>)[el]++;}
  }
  for (const branch of branches) {
    const el = getBranchElement(branch);
    if (el in elements) {(elements as Record<string, number>)[el]++;}
  }

  return [elements.목, elements.화, elements.토, elements.금, elements.수];
}

function euclideanDistance(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - (b[i] || 0), 2), 0));
}

function calculateCentroid(points: number[][]): number[] {
  if (points.length === 0) {return [];}
  const dims = points[0].length;
  const centroid = new Array(dims).fill(0);

  for (const point of points) {
    for (let i = 0; i < dims; i++) {
      centroid[i] += point[i];
    }
  }

  return centroid.map(v => v / points.length);
}

function generateClusterCharacteristics(centroid: Record<string, number>): string[] {
  const characteristics: string[] = [];
  const sorted = Object.entries(centroid).sort((a, b) => b[1] - a[1]);

  if (sorted[0][1] > 3) {
    characteristics.push(`${sorted[0][0]} 우세형`);
  }
  if (sorted[sorted.length - 1][1] < 1) {
    characteristics.push(`${sorted[sorted.length - 1][0]} 부족형`);
  }

  const total = Object.values(centroid).reduce((sum, v) => sum + v, 0);
  const balanced = Object.values(centroid).every(v => Math.abs(v - total / 5) < 1);
  if (balanced) {
    characteristics.push('균형형');
  }

  return characteristics.length > 0 ? characteristics : ['일반형'];
}

// ============================================================================
// 이상치 탐지
// ============================================================================

/**
 * 이상치 탐지
 */
export function detectAnomalies(
  saju: SajuResult,
  populationStats: PopulationStats
): AnomalyDetection {
  const anomalousFeatures: string[] = [];
  let anomalyScore = 0;

  const pillars = saju.fourPillars;

  // 오행 분포 이상
  const elements = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const stems = [pillars.year.stem, pillars.month.stem, pillars.day.stem, pillars.hour.stem];
  const branches = [pillars.year.branch, pillars.month.branch, pillars.day.branch, pillars.hour.branch];

  for (const stem of stems) {
    const el = getStemElement(stem);
    if (el in elements) {(elements as Record<string, number>)[el]++;}
  }
  for (const branch of branches) {
    const el = getBranchElement(branch);
    if (el in elements) {(elements as Record<string, number>)[el]++;}
  }

  // 극단적 편중 (7개 이상)
  for (const [el, count] of Object.entries(elements)) {
    if (count >= 7) {
      anomalousFeatures.push(`${el} 극단적 편중 (${count}/8)`);
      anomalyScore += 0.3;
    }
  }

  // 완전 부재
  const missingElements = Object.entries(elements).filter(([_, count]) => count === 0);
  if (missingElements.length >= 2) {
    anomalousFeatures.push(`다중 오행 부재 (${missingElements.map(([el]) => el).join(', ')})`);
    anomalyScore += 0.2 * missingElements.length;
  }

  // 일간 희귀도
  const dayMaster = pillars.day.stem;
  const dmDist = populationStats.dayMasterDistribution;
  const dmPercentage = ((dmDist as Record<string, number>)[dayMaster] || 0) / dmDist.total;
  if (dmPercentage < 0.05) {
    anomalousFeatures.push(`희귀한 일간 (${dayMaster})`);
    anomalyScore += 0.15;
  }

  // 같은 지지 반복
  const branchCounts: Record<string, number> = {};
  for (const branch of branches) {
    branchCounts[branch] = (branchCounts[branch] || 0) + 1;
  }
  for (const [branch, count] of Object.entries(branchCounts)) {
    if (count >= 3) {
      anomalousFeatures.push(`지지 삼중 (${branch})`);
      anomalyScore += 0.2;
    }
  }

  const isAnomaly = anomalyScore > 0.5;
  let explanation: string;

  if (anomalyScore > 0.7) {
    explanation = '매우 특이한 사주 구성입니다. 일반적인 해석 방법으로는 한계가 있을 수 있습니다.';
  } else if (anomalyScore > 0.5) {
    explanation = '다소 특이한 사주 구성입니다. 특별한 관점에서의 해석이 필요합니다.';
  } else if (anomalyScore > 0.3) {
    explanation = '약간의 특이점이 있지만 정상 범주입니다.';
  } else {
    explanation = '일반적인 사주 구성입니다.';
  }

  return {
    isAnomaly,
    anomalyScore: Math.min(1, anomalyScore),
    anomalousFeatures,
    explanation
  };
}

// ============================================================================
// 인구 통계
// ============================================================================

/**
 * 인구 통계 계산
 */
export function calculatePopulationStats(
  sajuList: SajuResult[],
  metadata?: { gender?: ('male' | 'female')[]; birthMonth?: number[]; birthHour?: number[] }
): PopulationStats {
  const elementDistribution = calculateElementDistribution(sajuList);
  const stemDistribution = calculateStemDistribution(sajuList);
  const branchDistribution = calculateBranchDistribution(sajuList);
  const dayMasterDistribution = calculateDayMasterDistribution(sajuList);
  const yinYangRatio = calculateYinYangRatio(sajuList);

  // 월별 분포
  const monthDistribution: Record<number, number> = {};
  for (let i = 1; i <= 12; i++) {monthDistribution[i] = 0;}
  if (metadata?.birthMonth) {
    for (const month of metadata.birthMonth) {
      monthDistribution[month] = (monthDistribution[month] || 0) + 1;
    }
  }

  // 시간별 분포
  const hourDistribution: Record<number, number> = {};
  for (let i = 0; i < 24; i++) {hourDistribution[i] = 0;}
  if (metadata?.birthHour) {
    for (const hour of metadata.birthHour) {
      hourDistribution[hour] = (hourDistribution[hour] || 0) + 1;
    }
  }

  // 성별 분포
  const genderDistribution = { male: 0, female: 0 };
  if (metadata?.gender) {
    for (const g of metadata.gender) {
      genderDistribution[g]++;
    }
  }

  return {
    totalSamples: sajuList.length,
    elementDistribution,
    stemDistribution,
    branchDistribution,
    dayMasterDistribution,
    yinYangRatio,
    monthDistribution,
    hourDistribution,
    genderDistribution
  };
}

// ============================================================================
// 추세 분석
// ============================================================================

/**
 * 시계열 추세 분석
 */
export function analyzeTrend(
  values: number[],
  labels: string[]
): TrendAnalysis {
  if (values.length < 2) {
    return {
      period: labels.join(' - '),
      trend: 'stable',
      changeRate: 0,
      forecast: [],
      confidence: 0
    };
  }

  // 변화율 계산
  const changes: number[] = [];
  for (let i = 1; i < values.length; i++) {
    changes.push(values[i] - values[i - 1]);
  }

  const avgChange = changes.reduce((sum, c) => sum + c, 0) / changes.length;
  const changeVariance = changes.reduce((sum, c) => sum + Math.pow(c - avgChange, 2), 0) / changes.length;

  // 추세 판단
  let trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
  if (changeVariance > Math.abs(avgChange) * 2) {
    trend = 'fluctuating';
  } else if (avgChange > 0.1) {
    trend = 'increasing';
  } else if (avgChange < -0.1) {
    trend = 'decreasing';
  } else {
    trend = 'stable';
  }

  // 간단한 선형 예측
  const forecast: number[] = [];
  const lastValue = values[values.length - 1];
  for (let i = 1; i <= 3; i++) {
    forecast.push(lastValue + avgChange * i);
  }

  // 신뢰도 (변동성 반비례)
  const confidence = Math.max(0, Math.min(100, 100 - changeVariance * 10));

  return {
    period: `${labels[0]} - ${labels[labels.length - 1]}`,
    trend,
    changeRate: avgChange,
    forecast,
    confidence
  };
}

// ============================================================================
// 종합 통계 보고서
// ============================================================================

/**
 * 종합 통계 보고서 생성
 */
export function generateStatisticsReport(
  sajuList: SajuResult[],
  targetSaju?: SajuResult
): {
  populationStats: PopulationStats;
  frequencyAnalysis: ReturnType<typeof analyzeGabjaFrequency>;
  clusterAnalysis: ClusterAnalysis[];
  targetRarity?: RarityScore;
  targetAnomaly?: AnomalyDetection;
  insights: string[];
} {
  const populationStats = calculatePopulationStats(sajuList);
  const frequencyAnalysis = analyzeGabjaFrequency(sajuList);
  const clusterAnalysis = performClusterAnalysis(sajuList, 5);

  let targetRarity: RarityScore | undefined;
  let targetAnomaly: AnomalyDetection | undefined;

  if (targetSaju) {
    targetRarity = calculateRarityScore(targetSaju, populationStats);
    targetAnomaly = detectAnomalies(targetSaju, populationStats);
  }

  // 인사이트 생성
  const insights: string[] = [];

  // 오행 분포 인사이트
  const elementDist = populationStats.elementDistribution;
  const sortedElements = Object.entries(elementDist)
    .filter(([key]) => key !== 'total')
    .sort((a, b) => b[1] - a[1]);

  insights.push(`전체 샘플에서 가장 많은 오행은 ${sortedElements[0][0]} (${((sortedElements[0][1] / elementDist.total) * 100).toFixed(1)}%)입니다.`);

  // 일간 분포 인사이트
  const dmDist = populationStats.dayMasterDistribution;
  const sortedDM = Object.entries(dmDist)
    .filter(([key]) => key !== 'total')
    .sort((a, b) => b[1] - a[1]);

  insights.push(`가장 흔한 일간은 ${sortedDM[0][0]} (${((sortedDM[0][1] / dmDist.total) * 100).toFixed(1)}%)입니다.`);

  // 음양 비율
  const yyRatio = populationStats.yinYangRatio;
  const total = yyRatio.yin + yyRatio.yang;
  if (total > 0) {
    insights.push(`음양 비율: 음 ${((yyRatio.yin / total) * 100).toFixed(1)}%, 양 ${((yyRatio.yang / total) * 100).toFixed(1)}%`);
  }

  // 클러스터 인사이트
  if (clusterAnalysis.length > 0) {
    const largestCluster = clusterAnalysis.sort((a, b) => b.size - a.size)[0];
    insights.push(`가장 큰 그룹은 "${largestCluster.characteristics.join(', ')}" 유형으로 전체의 ${largestCluster.percentage.toFixed(1)}%를 차지합니다.`);
  }

  return {
    populationStats,
    frequencyAnalysis,
    clusterAnalysis,
    targetRarity,
    targetAnomaly,
    insights
  };
}
