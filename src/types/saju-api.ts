/**
 * Saju API Types
 * Type definitions for the /api/saju endpoint
 */

import type {
  FiveElement,
  SibsinKind,
  PillarData,
  DaeunData,
  StemBranchInfo,
  RelationHit,
  ShinsalHit,
  TwelveStage,
} from "@/lib/Saju/types";

// ============ Request Types ============

export interface SajuApiRequest {
  birthDate: string; // YYYY-MM-DD
  birthTime: string; // HH:mm
  gender: "male" | "female";
  calendarType: "solar" | "lunar";
  timezone: string; // e.g., "Asia/Seoul"
  userTimezone?: string; // User's current timezone for fortune calculation
  locale?: string; // "ko" | "en"
  isLeapMonth?: boolean; // For lunar calendar
}

// ============ Response Types ============

export interface SajuPillarDisplay {
  stem: string;
  branch: string;
  jijanggan: {
    raw: string;
    list: string[];
    display: string;
    object: {
      chogi?: { name?: string; sibsin?: string };
      junggi?: { name?: string; sibsin?: string };
      jeonggi?: { name?: string; sibsin?: string };
    };
  };
  twelveStage: TwelveStage | string;
  twelveShinsal: string[];
  lucky: string[];
  shinsal: string[];
  shinsalSummary: string;
}

export interface SajuTableData {
  byPillar: {
    time: SajuPillarDisplay;
    day: SajuPillarDisplay;
    month: SajuPillarDisplay;
    year: SajuPillarDisplay;
  };
}

export interface ShinsalDisplayItem {
  name: string;
  scope: string; // "연주" | "월주" | "일주" | "시주"
  from: string;
  to: string;
  note: string;
}

// Advanced Analysis Types
export interface GeokgukAnalysis {
  primary: string;
  category: string;
  confidence: number;
  description?: string;
}

export interface YongsinAnalysis {
  primaryYongsin: FiveElement;
  secondaryYongsin?: FiveElement;
  kibsin?: FiveElement;
  description?: string;
  luckyColors?: string[];
  luckyDirection?: string;
  luckyNumbers?: number[];
}

export interface HyeongchungAnalysis {
  chung: Array<{ branches: string[]; type: string }>;
  hyeong: Array<{ branches: string[]; type: string }>;
  hae: Array<{ branches: string[]; type: string }>;
  hap: Array<{ branches: string[]; type: string }>;
}

export interface TonggeunAnalysis {
  score: number;
  details: Array<{
    pillar: string;
    branch: string;
    stems: string[];
    score: number;
  }>;
}

export interface DeukryeongAnalysis {
  isDeukryeong: boolean;
  monthBranch: string;
  dayMaster: string;
  strength: "strong" | "weak" | "neutral";
}

export interface JohuYongsinAnalysis {
  primary: string;
  secondary?: string;
  description: string;
}

export interface SibsinAnalysis {
  distribution: Record<SibsinKind, number>;
  dominant: SibsinKind[];
  missing: SibsinKind[];
  balance: "balanced" | "imbalanced" | "extreme";
}

export interface HealthAnalysis {
  vulnerableOrgans: string[];
  strengths: string[];
  recommendations: string[];
  overallScore: number;
}

export interface CareerAnalysis {
  suitableFields: string[];
  strengths: string[];
  challenges: string[];
  recommendations: string[];
}

export interface ComprehensiveScore {
  overall: number;
  grade: "S" | "A" | "B" | "C" | "D" | "F";
  breakdown: {
    balance: number;
    strength: number;
    harmony: number;
    fortune: number;
  };
}

export interface ComprehensiveReport {
  summary: string;
  personality: string;
  career: string;
  relationships: string;
  health: string;
  fortune: string;
}

export interface AdvancedSajuAnalysis {
  geokguk: GeokgukAnalysis | null;
  yongsin: YongsinAnalysis | null;
  hyeongchung: HyeongchungAnalysis | null;
  tonggeun: TonggeunAnalysis | null;
  deukryeong: DeukryeongAnalysis | null;
  johuYongsin: JohuYongsinAnalysis | null;
  sibsin: SibsinAnalysis | null;
  health: HealthAnalysis | null;
  career: CareerAnalysis | null;
  score: ComprehensiveScore | null;
  report: ComprehensiveReport | null;
  interpretations: {
    twelveStages: Record<string, unknown>;
    elements: Record<string, unknown>;
  } | null;
}

// Main API Response
export interface SajuApiResponse {
  // Status flags
  isPremium: boolean;
  isLoggedIn: boolean;

  // Birth info
  birthYear: number;
  birthDate: string;
  analysisDate: string;
  userTimezone: string;

  // Pillars (legacy format)
  yearPillar: PillarData;
  monthPillar: PillarData;
  dayPillar: PillarData;
  timePillar: PillarData;

  // Core data
  fiveElements: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  dayMaster: StemBranchInfo;

  // Fortune cycles
  daeun: {
    startAge: number;
    isForward: boolean;
    cycles: DaeunData[];
  };
  yeonun: Array<{
    year: number;
    heavenlyStem: string;
    earthlyBranch: string;
    element: string;
    sibsin: { cheon: string; ji: string };
  }>;
  wolun: Array<{
    year: number;
    month: number;
    heavenlyStem: string;
    earthlyBranch: string;
    ganji: string;
    element: string;
    sibsin: { cheon: string; ji: string };
  }>;
  iljin: Array<{
    year: number;
    month: number;
    day: number;
    heavenlyStem: string;
    earthlyBranch: string;
    ganji: string;
    isCheoneulGwiin: boolean;
    sibsin: { cheon: string; ji: string };
  }>;

  // Display data
  table: SajuTableData;
  shinsal: ShinsalDisplayItem[];
  shinsalRaw: ShinsalHit[];
  relations: RelationHit[];

  // AI interpretation
  gptPrompt: string;
  aiInterpretation: string;
  aiModelUsed: string;

  // Premium content
  advancedAnalysis: AdvancedSajuAnalysis | null;
}

// ============ Internal Types ============

export interface DaeunCycle {
  age: number;
  heavenlyStem: string;
  earthlyBranch: string;
}

export interface SajuPromptPillar {
  heavenlyStem: { name: string };
  earthlyBranch: { name: string };
}

export interface SajuPromptData {
  yearPillar: SajuPromptPillar;
  monthPillar: SajuPromptPillar;
  dayPillar: SajuPromptPillar;
  timePillar: SajuPromptPillar;
  fiveElements: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  daeun?: { cycles?: DaeunCycle[] };
  birthDate: string;
}

// Jijanggan processing types
export interface JGItem {
  name?: string;
  sibsin?: string;
}

export interface JijangganObject {
  chogi?: JGItem;
  junggi?: JGItem;
  jeonggi?: JGItem;
}

export type JijangganAny =
  | string
  | Record<string, unknown>
  | JGItem[]
  | JijangganObject
  | null
  | undefined;

// Premium check cache
export interface PremiumCacheEntry {
  value: boolean;
  expires: number;
}
