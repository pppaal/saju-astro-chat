// src/components/numerology/compatibility/types.ts
// CompatibilityAnalyzer 타입 정의

export interface Person {
  birthDate: string;
  birthTime: string;
  name: string;
  gender?: 'male' | 'female';
}

// Simple astrology profile type (compatible with CompatibilityFunInsights AstroRawData)
export interface SimpleAstroProfile {
  sun: { sign: string; element: string };
  moon: { sign: string; element: string };
  venus: { sign: string; element: string };
  mars: { sign: string; element: string };
  mercury: { sign: string; element: string };
  ascendant: { sign: string; element: string };
  jupiter: { sign: string; element: string };
  saturn: { sign: string; element: string };
  [key: string]: unknown; // Index signature for compatibility
}

// Raw Saju data type (compatible with CompatibilityFunInsights SajuRawData)
export interface RawSajuData {
  yearPillar?: { heavenlyStem?: string; earthlyBranch?: string };
  monthPillar?: { heavenlyStem?: string; earthlyBranch?: string };
  dayPillar?: { heavenlyStem?: string; earthlyBranch?: string };
  timePillar?: { heavenlyStem?: string; earthlyBranch?: string };
  fiveElements?: Record<string, number>;
  dayMaster?: { name?: string; heavenlyStem?: string; element?: string };
  [key: string]: unknown; // Index signature for compatibility
}

export interface PairScore {
  score: number;
  saju_details?: string[];
  astro_details?: string[];
  fusion_insights?: string[];
  element_harmony?: {
    score: number;
    details: string[];
  };
  branch_analysis?: {
    samhap?: string[];
    yukhap?: string[];
    chung?: string[];
  };
}

export interface TimingAnalysis {
  yearly?: {
    score: number;
    description: string;
  };
  monthly?: {
    score: number;
    description: string;
  };
  best_periods?: string[];
  caution_periods?: string[];
}

// Frontend calculated analysis
export interface FrontendSajuAnalysis {
  elementCompatibility: {
    score: number;
    harmony: string[];
    conflict: string[];
    complementary: string[];
    analysis: string;
  };
  stemCompatibility: {
    score: number;
    hapPairs: Array<{ stem1: string; stem2: string; result: string }>;
    chungPairs: Array<{ stem1: string; stem2: string }>;
    analysis: string;
  };
  branchCompatibility: {
    score: number;
    yukhapPairs: Array<{ branch1: string; branch2: string; result: string }>;
    samhapGroups: Array<{ branches: string[]; result: string }>;
    chungPairs: Array<{ branch1: string; branch2: string }>;
    analysis: string;
  };
  dayMasterRelation: {
    person1DayMaster: string;
    person2DayMaster: string;
    relation: string;
    sibsin: string;
    dynamics: string;
    score: number;
  };
  categoryScores: Array<{
    category: string;
    score: number;
    strengths: string[];
    challenges: string[];
    advice: string;
  }>;
}

export interface CompatibilityResult {
  // Basic
  overall_score: number;
  average?: number;
  interpretation?: string;
  aiInterpretation?: string;

  // Advanced Saju/Astrology
  pair_score?: PairScore;
  timing?: TimingAnalysis;
  action_items?: string[];
  fusion_enabled?: boolean;

  // Frontend calculated Saju analysis
  frontendAnalysis?: FrontendSajuAnalysis;

  // Raw Saju data for Fun Insights
  person1SajuRaw?: RawSajuData;
  person2SajuRaw?: RawSajuData;

  // Raw Astrology data for Fun Insights
  person1AstroRaw?: SimpleAstroProfile;
  person2AstroRaw?: SimpleAstroProfile;

  // Legacy numerology fields
  level?: string;
  description?: string;
  life_path_comparison?: {
    person1: number;
    person2: number;
    base_score: number;
  };
  expression_comparison?: {
    person1: number;
    person2: number;
    score: number;
  };
  pairing_insight?: {
    compatibility: string;
    description: string;
  };
}

export type RelationshipType = 'lover' | 'spouse' | 'friend' | 'business' | 'family';
