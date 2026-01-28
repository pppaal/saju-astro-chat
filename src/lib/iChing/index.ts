/**
 * I Ching Library - 1000% Level
 * 주역 라이브러리: 완전한 64괘 분석, 매화역수, 통계, 지혜 생성
 */

// ============================================================
// 공통 타입 및 상수 (중복 방지 - types.ts에서 관리)
// ============================================================
export {
  HEXAGRAM_BINARY_MAP,
  HEXAGRAM_NAMES_KO,
  findHexagramNumberByBinary,
  getHexagramBinary,
  getHexagramNameKo
} from './types';

// ============================================================
// 기본 데이터
// ============================================================
export {
  IChingData,
  type Hexagram
} from './iChingData';

// ============================================================
// 1000% Level - 고급 괘 분석 엔진
// ============================================================
export {
  // 상수
  TRIGRAMS,

  // 타입
  type Trigram,
  type HexagramBasic,
  type HoGwaAnalysis,
  type ChakGwaAnalysis,
  type DoGwaAnalysis,
  type SangbanGwaAnalysis,
  type BokGwaAnalysis,
  type HaekGwaAnalysis,
  type TrigramAnalysis,
  type YaoPositionAnalysis,
  type ChangingLineAnalysis,
  type ComprehensiveHexagramAnalysis,

  // 함수
  analyzeHoGwa,
  analyzeChakGwa,
  analyzeDoGwa,
  analyzeSangbanGwa,
  analyzeBokGwa,
  analyzeHaekGwa,
  analyzeTrigramInteraction,
  analyzeYaoPositions,
  analyzeChangingLines,
  performComprehensiveHexagramAnalysis,
  compareHexagrams
} from './advancedIChingCore';

// ============================================================
// 1000% Level - 수리/시간 기반 괘 (매화역수)
// ============================================================
export {
  // 타입
  type MeihuaReading,
  type BirthHexagram,
  type TimeHexagram,
  type NumberHexagram,
  type YearlyFortune,
  type DirectionalHexagram,

  // 함수
  castMeihuaByTime,
  castMeihuaByNumbers,
  calculateBirthHexagram,
  calculateTimeHexagram,
  calculateYearlyFortune,
  analyzeDirectionalFortune,
  castHexagramByNumbers
} from './ichingNumerology';

// ============================================================
// 1000% Level - 64괘 관계 패턴
// ============================================================
export {
  // 타입
  type HexagramPair,
  type PairRelationship,
  type HexagramGroup,
  type SequenceAnalysis,
  type OppositePairs,
  type SeasonalHexagram,
  type ElementalGroup,
  type PatternMatch,

  // 함수
  analyzeInversionRelations,
  analyzeNuclearHexagram,
  analyzeSequencePosition,
  getXuguaPair,
  classifyByPalace,
  classifyByElement,
  getMonthlyHexagrams,
  getCurrentSeasonalHexagram,
  findOppositePairs,
  findHexagramsByPattern,
  getSpecialPatternHexagrams,
  analyzeHexagramRelationship,
  generateHexagramNetwork
} from './ichingPatterns';

// ============================================================
// 1000% Level - 지혜 생성기
// ============================================================
export {
  // 상수
  HEXAGRAM_WISDOM,
  YAO_POSITION_MEANINGS,

  // 타입
  type YaoWisdomEntry,
  type SituationAdvice,
  type HexagramWisdomData,
  type WisdomPromptContext,

  // 함수
  getHexagramWisdom,
  generateSituationalAdvice,
  generateWisdomPrompt,
  interpretChangingLines,
  generateDailyWisdom,
  analyzeHexagramRelationshipWisdom,
  generatePeriodicWisdom,
  deepWisdomAnalysis
} from './ichingWisdom';

// ============================================================
// 1000% Level - 통계 분석 엔진
// ============================================================
export {
  // 상수
  THEORETICAL_PROBABILITIES,

  // 타입
  type HexagramReading,
  type ReadingCategory,
  type HexagramStatistics,
  type OverallStatistics,

  // 클래스
  IChingStatisticsEngine,

  // 함수
  chiSquareTest,
  generateExpectedDistribution,
  getGlobalStatisticsEngine,
  resetGlobalStatisticsEngine
} from './ichingStatistics';

// ============================================================
// 통합 분석 함수
// ============================================================

import { performComprehensiveHexagramAnalysis, compareHexagrams, type HexagramBasic } from './advancedIChingCore';
import { castMeihuaByTime, calculateBirthHexagram, type MeihuaReading, type BirthHexagram } from './ichingNumerology';
import { analyzeHexagramRelationship, generateHexagramNetwork } from './ichingPatterns';
import { generateWisdomPrompt, deepWisdomAnalysis, getHexagramWisdom, type HexagramWisdomData } from './ichingWisdom';
import { getGlobalStatisticsEngine, type HexagramReading } from './ichingStatistics';

/**
 * 완전 통합 주역 분석
 * 모든 1000% 레벨 분석을 수행
 */
export interface CompleteIChingAnalysis {
  // 기본 분석
  hexagram: {
    number: number;
    binary: string;
    name: string;
  };

  // 고급 분석
  comprehensive: ReturnType<typeof performComprehensiveHexagramAnalysis>;

  // 관계 패턴
  relationships: ReturnType<typeof analyzeHexagramRelationship>;

  // 지혜
  wisdom: HexagramWisdomData | null;

  // AI 프롬프트
  aiPrompt: string;

  // 개인화 분석
  personalizedAdvice?: ReturnType<typeof deepWisdomAnalysis>;

  // 변화괘 비교
  targetComparison?: ReturnType<typeof compareHexagrams>;
}

// 공통 데이터는 types.ts에서 import (HEXAGRAM_BINARY_MAP, HEXAGRAM_NAMES_KO)
import { HEXAGRAM_BINARY_MAP, HEXAGRAM_NAMES_KO, findHexagramNumberByBinary } from './types';

export function performCompleteAnalysis(
  hexagramNumber: number,
  changingLines: number[] = [],
  options?: {
    userQuestion?: string;
    consultationType?: 'general' | 'career' | 'relationship' | 'health' | 'wealth' | 'spiritual';
    userProfile?: { birthYear?: number; gender?: 'M' | 'F' };
    locale?: 'en' | 'ko';
  }
): CompleteIChingAnalysis {
  const locale = options?.locale ?? 'ko';
  const binary = HEXAGRAM_BINARY_MAP[hexagramNumber] || '111111';
  const comprehensive = performComprehensiveHexagramAnalysis(binary, locale);
  const relationships = analyzeHexagramRelationship(hexagramNumber, hexagramNumber);
  const wisdom = getHexagramWisdom(hexagramNumber, locale);

  // 변효 적용하여 지괘 계산
  let targetHexagramNumber: number | undefined;
  if (changingLines.length > 0) {
    const binaryArr = binary.split('');
    for (const line of changingLines) {
      const idx = line - 1;
      binaryArr[idx] = binaryArr[idx] === '1' ? '0' : '1';
    }
    const targetBinary = binaryArr.join('');
    // binary에서 number 찾기
    for (const [num, bin] of Object.entries(HEXAGRAM_BINARY_MAP)) {
      if (bin === targetBinary) {
        targetHexagramNumber = parseInt(num);
        break;
      }
    }
  }

  const aiPrompt = generateWisdomPrompt({
    hexagramNumber,
    changingLines,
    targetHexagram: targetHexagramNumber,
    userQuestion: options?.userQuestion,
    consultationType: options?.consultationType
  });

  const result: CompleteIChingAnalysis = {
    hexagram: {
      number: hexagramNumber,
      binary,
      name: HEXAGRAM_NAMES_KO[hexagramNumber] || 'Unknown'
    },
    comprehensive,
    relationships,
    wisdom,
    aiPrompt
  };

  if (options?.userProfile) {
    result.personalizedAdvice = deepWisdomAnalysis(hexagramNumber, options.userProfile, locale);
  }

  if (targetHexagramNumber) {
    const targetBinary = HEXAGRAM_BINARY_MAP[targetHexagramNumber];
    result.targetComparison = compareHexagrams(binary, targetBinary, locale);
  }

  return result;
}

/**
 * 매화역수 기반 완전 분석
 */
export interface MeihuaCompleteAnalysis {
  casting: MeihuaReading;
  analysis: CompleteIChingAnalysis;
}

export function performMeihuaAnalysis(
  date?: Date,
  options?: {
    userQuestion?: string;
    consultationType?: 'general' | 'career' | 'relationship' | 'health' | 'wealth' | 'spiritual';
    userProfile?: { birthYear?: number; gender?: 'M' | 'F' };
  }
): MeihuaCompleteAnalysis {
  const casting = castMeihuaByTime(date);

  // 본괘 binary에서 번호 찾기
  let hexagramNumber = 1;
  for (const [num, bin] of Object.entries(HEXAGRAM_BINARY_MAP)) {
    if (bin === casting.본괘Binary) {
      hexagramNumber = parseInt(num);
      break;
    }
  }

  const analysis = performCompleteAnalysis(
    hexagramNumber,
    [casting.변효],
    options
  );

  return { casting, analysis };
}

/**
 * 생년월일 기반 완전 분석
 */
export interface BirthHexagramCompleteAnalysis {
  birthHexagram: BirthHexagram;
  lifeAnalysis: CompleteIChingAnalysis;
}

export function performBirthAnalysis(
  birthDate: Date,
  birthTime?: { hour: number; minute: number },
  gender?: 'M' | 'F',
  options?: {
    userQuestion?: string;
    consultationType?: 'general' | 'career' | 'relationship' | 'health' | 'wealth' | 'spiritual';
  }
): BirthHexagramCompleteAnalysis {
  const year = birthDate.getFullYear();
  const month = birthDate.getMonth() + 1;
  const day = birthDate.getDate();
  const hour = birthTime?.hour;

  const birthHexagram = calculateBirthHexagram(year, month, day, hour);
  const lifeAnalysis = performCompleteAnalysis(
    birthHexagram.본명괘.number,
    [],
    {
      ...options,
      userProfile: { birthYear: year, gender }
    }
  );

  return { birthHexagram, lifeAnalysis };
}

/**
 * 64괘 네트워크 생성
 */
export function generateFullHexagramNetwork(): ReturnType<typeof generateHexagramNetwork> {
  return generateHexagramNetwork();
}

/**
 * 리딩 기록 및 통계 추적
 */
export function recordReading(
  hexagramNumber: number,
  changingLines: number[],
  options?: {
    question?: string;
    category?: 'career' | 'relationship' | 'health' | 'wealth' | 'spiritual' | 'decision' | 'general';
    outcome?: 'positive' | 'neutral' | 'negative';
    notes?: string;
  }
): void {
  const engine = getGlobalStatisticsEngine();

  const reading: HexagramReading = {
    id: `reading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    hexagramNumber,
    changingLines,
    question: options?.question,
    category: options?.category,
    outcome: options?.outcome,
    notes: options?.notes
  };

  // 지괘 계산
  if (changingLines.length > 0) {
    const binary = HEXAGRAM_BINARY_MAP[hexagramNumber] || '111111';
    const binaryArr = binary.split('');
    for (const line of changingLines) {
      const idx = line - 1;
      binaryArr[idx] = binaryArr[idx] === '1' ? '0' : '1';
    }
    const targetBinary = binaryArr.join('');
    for (const [num, bin] of Object.entries(HEXAGRAM_BINARY_MAP)) {
      if (bin === targetBinary) {
        reading.targetHexagram = parseInt(num);
        break;
      }
    }
  }

  engine.addReading(reading);
}

/**
 * 통계 리포트 가져오기
 */
export function getStatisticsReport(): string {
  const engine = getGlobalStatisticsEngine();
  return engine.generateStatisticsReport();
}
