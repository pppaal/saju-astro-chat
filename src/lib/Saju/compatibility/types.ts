// src/lib/Saju/compatibility/types.ts
// 궁합 분석 타입 정의

import { FiveElement, SajuPillars, SibsinKind } from '../types';

/** 궁합 대상 정보 */
export interface CompatibilitySubject {
  id: string;
  name?: string;
  pillars: SajuPillars;
  gender?: 'male' | 'female';
  birthYear?: number;
}

/** 오행 궁합 분석 */
export interface ElementCompatibility {
  score: number;
  harmony: FiveElement[];
  conflict: FiveElement[];
  missing: FiveElement[];
  complementary: FiveElement[];
  analysis: string;
}

/** 천간 궁합 */
export interface StemCompatibility {
  score: number;
  hapPairs: Array<{ stem1: string; stem2: string; result: string }>;
  chungPairs: Array<{ stem1: string; stem2: string }>;
  analysis: string;
}

/** 지지 궁합 */
export interface BranchCompatibility {
  score: number;
  yukhapPairs: Array<{ branch1: string; branch2: string; result: FiveElement }>;
  samhapGroups: Array<{ branches: string[]; result: FiveElement }>;
  chungPairs: Array<{ branch1: string; branch2: string }>;
  hyeongPairs: Array<{ branch1: string; branch2: string; type: string }>;
  haePairs: Array<{ branch1: string; branch2: string }>;
  analysis: string;
}

/** 일간 관계 분석 */
export interface DayMasterRelation {
  person1DayMaster: string;
  person2DayMaster: string;
  relation: string;
  sibsin: SibsinKind;
  reverseSibsin: SibsinKind;
  dynamics: string;
  score: number;
}

/** 궁합 카테고리 */
export type CompatibilityCategory =
  | 'love'
  | 'business'
  | 'friendship'
  | 'family'
  | 'work';

/** 카테고리별 궁합 결과 */
export interface CategoryCompatibility {
  category: CompatibilityCategory;
  score: number;
  strengths: string[];
  challenges: string[];
  advice: string;
}

/** 시간대별 궁합 변화 */
export interface TemporalCompatibility {
  period: string;
  score: number;
  trend: 'improving' | 'stable' | 'declining';
  keyEvents: string[];
  advice: string;
}

/** 종합 궁합 결과 */
export interface ComprehensiveCompatibility {
  overallScore: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  elementCompatibility: ElementCompatibility;
  stemCompatibility: StemCompatibility;
  branchCompatibility: BranchCompatibility;
  dayMasterRelation: DayMasterRelation;
  categoryScores: CategoryCompatibility[];
  temporalAnalysis?: TemporalCompatibility[];
  summary: string;
  strengths: string[];
  challenges: string[];
  recommendations: string[];
}

/** 다자간 궁합 (3인 이상) */
export interface MultiPersonCompatibility {
  participants: CompatibilitySubject[];
  pairwiseScores: Array<{ person1: string; person2: string; score: number }>;
  groupHarmony: number;
  groupDynamics: string;
  bestPairs: string[];
  challengingPairs: string[];
  recommendations: string[];
}
