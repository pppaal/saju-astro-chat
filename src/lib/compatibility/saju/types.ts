/**
 * Saju Compatibility Analysis Types
 * All shared types for saju compatibility analysis modules
 */

// ============================================================
// Ten Gods Types
// ============================================================

export type TenGod =
  | '비견' | '겁재'      // 比劫 (Self)
  | '식신' | '상관'      // 食傷 (Output)
  | '편재' | '정재'      // 財 (Wealth)
  | '편관' | '정관'      // 官 (Authority)
  | '편인' | '정인';     // 印 (Resource)

export interface TenGodAnalysis {
  person1Primary: TenGod[];
  person2Primary: TenGod[];
  interaction: {
    supports: string[];
    conflicts: string[];
    balance: number;
  };
  relationshipDynamics: string;
}

// ============================================================
// Shinsal Types
// ============================================================

export interface ShinsalAnalysis {
  person1Shinsals: string[];
  person2Shinsals: string[];
  luckyInteractions: string[];
  unluckyInteractions: string[];
  overallImpact: 'very_positive' | 'positive' | 'neutral' | 'challenging';
}

// ============================================================
// Harmony Types
// ============================================================

export interface HapAnalysis {
  yukhap: string[];
  samhap: string[];
  banghap: string[];
  score: number;
  description: string;
}

// ============================================================
// Conflict Types
// ============================================================

export interface ConflictAnalysis {
  chung: string[];
  hyeong: string[];
  pa: string[];
  hae: string[];
  totalConflicts: number;
  severity: 'severe' | 'moderate' | 'mild' | 'minimal';
  mitigationAdvice: string[];
}

// ============================================================
// Yongsin Types
// ============================================================

export interface YongsinAnalysis {
  person1Yongsin: string;
  person1Huisin: string;
  person2Yongsin: string;
  person2Huisin: string;
  mutualSupport: boolean;
  compatibility: number;
  interpretation: string[];
}

// ============================================================
// Daeun Types
// ============================================================

export interface DaeunPeriod {
  stem: string;
  branch: string;
  element: string;
  startAge: number;
  endAge: number;
  theme: string;
}

export interface DaeunCompatibility {
  person1CurrentDaeun: DaeunPeriod;
  person2CurrentDaeun: DaeunPeriod;
  harmonicPeriods: string[];
  challengingPeriods: string[];
  currentSynergy: number;
  futureOutlook: string;
}

// ============================================================
// Seun Types
// ============================================================

export interface SeunCompatibility {
  year: number;
  yearStem: string;
  yearBranch: string;
  yearElement: string;
  person1Impact: 'very_favorable' | 'favorable' | 'neutral' | 'challenging' | 'very_challenging';
  person2Impact: 'very_favorable' | 'favorable' | 'neutral' | 'challenging' | 'very_challenging';
  combinedOutlook: string;
  advice: string[];
}

// ============================================================
// Gongmang Types
// ============================================================

export interface GongmangAnalysis {
  person1Gongmang: string[];
  person2Gongmang: string[];
  person1InP2Gongmang: boolean;
  person2InP1Gongmang: boolean;
  impact: 'positive' | 'neutral' | 'negative';
  interpretation: string[];
}

// ============================================================
// GanHap Types
// ============================================================

export interface GanHapCombination {
  stem1: string;
  stem2: string;
  pillar1: string;
  pillar2: string;
  resultElement: string;
  description: string;
}

export interface GanHapAnalysis {
  combinations: GanHapCombination[];
  totalHarmony: number;
  significance: string;
}

// ============================================================
// Gyeokguk Types
// ============================================================

export type GyeokgukType =
  | '정관격' | '편관격' | '정인격' | '편인격'
  | '정재격' | '편재격' | '식신격' | '상관격'
  | '건록격' | '양인격' | '종격';

export interface GyeokgukAnalysis {
  person1Gyeokguk: GyeokgukType;
  person2Gyeokguk: GyeokgukType;
  compatibility: 'excellent' | 'good' | 'neutral' | 'challenging';
  dynamics: string;
  strengths: string[];
  challenges: string[];
}

// ============================================================
// Twelve States Types
// ============================================================

export type TwelveState =
  | '장생' | '목욕' | '관대' | '건록' | '제왕' | '쇠'
  | '병' | '사' | '묘' | '절' | '태' | '양';

export interface TwelveStatesAnalysis {
  person1States: { pillar: string; state: TwelveState; meaning: string }[];
  person2States: { pillar: string; state: TwelveState; meaning: string }[];
  energyCompatibility: number;
  interpretation: string[];
}

// ============================================================
// Comprehensive Analysis Types
// ============================================================

export interface ComprehensiveSajuCompatibility {
  tenGods: TenGodAnalysis;
  shinsals: ShinsalAnalysis;
  harmonies: HapAnalysis;
  conflicts: ConflictAnalysis;
  overallScore: number;
  grade: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
  detailedInsights: string[];
}

export interface ExtendedSajuCompatibility extends ComprehensiveSajuCompatibility {
  yongsin: YongsinAnalysis;
  daeun: DaeunCompatibility;
  seun: SeunCompatibility;
  gongmang: GongmangAnalysis;
  ganHap: GanHapAnalysis;
  gyeokguk: GyeokgukAnalysis;
  twelveStates: TwelveStatesAnalysis;
}
