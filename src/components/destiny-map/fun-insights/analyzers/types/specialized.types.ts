/**
 * Specialized Analysis Types
 * 도메인별 분석 결과 타입 정의
 */

import type { FiveElement } from '@/lib/Saju/types';
import type { WesternElement } from '@/lib/destiny-matrix/types';
import type { MatrixFusion } from '../matrix/types';

// ============================
// Health Matrix Types
// ============================

export interface HealthMatrixResult {
  vitalityScore: number;
  elementBalance: Array<{ element: string; score: number; status: 'excess' | 'balanced' | 'deficient' }>;
  vulnerableAreas: Array<{
    organ: string;
    element: string;
    risk: 'high' | 'medium' | 'low';
    advice: string;
    icon: string;
  }>;
  lifeCycleStage: {
    stage: string;
    description: { ko: string; en: string };
    vitalityLevel: number;
    advice: string;
  } | null;
  shinsalHealth: Array<{
    shinsal: string;
    planet: string;
    fusion: MatrixFusion;
    healthWarning: { ko: string; en: string };
  }>;
  chironHealing: {
    woundArea: { ko: string; en: string };
    healingPath: { ko: string; en: string };
    healerPotential: { ko: string; en: string };
    score: number;
    icon: string;
  } | null;
}

// ============================
// Karma Matrix Types
// ============================

export interface KarmaMatrixResult {
  karmaScore: number;
  soulPattern: {
    geokguk: string;
    progression: string;
    fusion: MatrixFusion;
    soulTheme: { ko: string; en: string };
  } | null;
  nodeAxis: {
    northNode: {
      element: FiveElement;
      fusion: MatrixFusion;
      direction: { ko: string; en: string };
      lesson: { ko: string; en: string };
    };
    southNode: {
      element: FiveElement;
      fusion: MatrixFusion;
      pastPattern: { ko: string; en: string };
      release: { ko: string; en: string };
    };
  } | null;
  karmicRelations: Array<{
    relation: string;
    aspect: string;
    fusion: MatrixFusion;
    meaning: { ko: string; en: string };
  }>;
  pastLifeHints: Array<{
    shinsal: string;
    planet: string;
    fusion: MatrixFusion;
    hint: { ko: string; en: string };
  }>;
  karmaMessage?: { ko: string; en: string };
}

// ============================
// Career Advanced Types
// ============================

export interface CareerAdvancedResult {
  careerScore: number;
  geokgukCareer: {
    geokguk: string;
    pattern: string;
    fusion: MatrixFusion;
    careerDirection: { ko: string; en: string };
  } | null;
  houseCareerMap: Array<{
    house: number;
    planets: string[];
    careerArea: { ko: string; en: string };
    strength: 'strong' | 'moderate' | 'weak';
    icon: string;
  }>;
  midheaven: {
    sign: string;
    element: WesternElement;
    sajuAlignment: MatrixFusion;
    publicImage: { ko: string; en: string };
  } | null;
  careerTiming: Array<{
    period: string;
    icon: string;
    strength: 'strong' | 'moderate' | 'weak';
    score: number;
    description: { ko: string; en: string };
    goodFor: string[];
  }>;
  // Optional extended properties for legacy UI compatibility
  wealthPattern?: { ko: string; en: string; fusion?: MatrixFusion };
  successTiming?: Array<{
    timing: string;
    transit: string;
    fusion: MatrixFusion;
    advice: { ko: string; en: string };
  }>;
  careerProgression?: {
    phase: string;
    description: { ko: string; en: string };
    fusion: MatrixFusion;
    geokguk: string;
    progression: string;
    direction: { ko: string; en: string };
  };
  nobleHelp?: Array<{
    type: string;
    description: { ko: string; en: string };
    fusion: MatrixFusion;
    shinsal: string;
    planet: string;
    blessing: { ko: string; en: string };
  }>;
  fortunePoint?: {
    sign: string;
    house: number;
    description: { ko: string; en: string };
    fusion: MatrixFusion;
    element: string;
    luckyArea: { ko: string; en: string };
  };
}

// ============================
// Love Timing Types
// ============================

export interface LoveTimingResult {
  loveScore: number;
  currentLuck: {
    icon: string;
    score: number;
    message: { ko: string; en: string };
    timing: 'excellent' | 'good' | 'neutral' | 'challenging';
  };
  venusTiming: {
    sign: string;
    element: WesternElement;
    fusion: MatrixFusion;
    loveStyle: { ko: string; en: string };
  } | null;
  shinsalLoveTiming: Array<{
    shinsal: string;
    planet: string;
    fusion: MatrixFusion;
    timing: { ko: string; en: string };
  }>;
  luckyPeriods: Array<{
    period: string;
    icon: string;
    strength: 'strong' | 'moderate' | 'weak';
    score: number;
    description: { ko: string; en: string };
    goodFor: string[];
  }>;
  // Optional extended properties for tab compatibility
  timingScore?: number;
  timingMessage?: { ko: string; en: string };
  romanticTiming?: Array<{
    period: string;
    score: number;
    description: { ko: string; en: string };
    timing: string;
    transit: string;
    fusion: MatrixFusion;
    advice: { ko: string; en: string };
  }>;
  relationshipPattern?: Array<{
    pattern: string;
    description: { ko: string; en: string };
    fusion: MatrixFusion;
    relation: string;
    aspect: string;
    meaning: { ko: string; en: string };
  }>;
  destinyMeeting?: {
    timing: string;
    description: { ko: string; en: string };
    fusion: MatrixFusion;
    element: string;
    prediction: { ko: string; en: string };
  };
}

// ============================
// Shadow Personality Types
// ============================

export interface ShadowPersonalityResult {
  shadowScore: number;
  shinsalShadows: Array<{
    shinsal: string;
    planet: string;
    fusion: MatrixFusion;
    shadowTrait: { ko: string; en: string };
    integration: { ko: string; en: string };
  }>;
  chironWound: {
    area: { ko: string; en: string };
    manifestation: { ko: string; en: string };
    healing: { ko: string; en: string };
    gift: { ko: string; en: string };
  } | null;
  lilithEnergy: {
    element: FiveElement;
    fusion: MatrixFusion;
    suppressed: { ko: string; en: string };
    expression: { ko: string; en: string };
  } | null;
  // Optional extended properties for tab compatibility
  lilithShadow?: {
    ko: string;
    en: string;
    shadowSelf?: { ko: string; en: string };
    integration?: { ko: string; en: string };
    fusion?: MatrixFusion;
    element?: FiveElement;
    icon?: string;
    sibsin?: string;
    description?: { ko: string; en: string };
  };
  hiddenPotential?: {
    ko: string;
    en: string;
    potential?: { ko: string; en: string };
    fusion?: MatrixFusion;
    element?: FiveElement;
    icon?: string;
    description?: { ko: string; en: string };
    activation?: { ko: string; en: string };
  };
  projection: Array<{
    pattern: string;
    from: string;
    to: string;
    recognition: { ko: string; en: string };
    integration: { ko: string; en: string };
  }>;
}

// ============================
// Timing Matrix Types
// ============================

export interface TimingMatrixResult {
  overallScore: number;
  overallMessage: { ko: string; en: string };
  daeunTimeline: Array<{
    startAge: number;
    endAge?: number;
    isCurrent: boolean;
    element: FiveElement;
    score: number;
    description: { ko: string; en: string };
    icon: string;
    period?: string;
    heavenlyStem?: string;
    earthlyBranch?: string;
    advice?: { ko: string; en: string };
    sequence?: Array<unknown>;
    transition?: Array<unknown>;
  }>;
  majorTransits: Array<{
    transit: string;
    planet: string;
    timing: string;
    score: number;
    description: { ko: string; en: string };
    icon: string;
    isActive?: boolean;
    isUpcoming?: boolean;
    name?: string;
    period?: string;
    advice?: { ko: string; en: string };
  }>;
  retrogrades: Array<{
    planet: string;
    element: WesternElement;
    fusion: MatrixFusion;
    effect: { ko: string; en: string };
    advice: { ko: string; en: string };
    planets?: Array<unknown>;
    upcoming?: Array<unknown>;
  }>;
  periodLuck: {
    year: { element: string; score: number; description: { ko: string; en: string }; icon?: string; stem?: string; branch?: string };
    month: { element: string; score: number; description: { ko: string; en: string }; icon?: string; stem?: string; branch?: string };
    day: { element: string; score: number; description: { ko: string; en: string }; icon?: string; stem?: string; branch?: string };
  };
  luckyPeriods: Array<{
    icon: string;
    period: string;
    strength: 'strong' | 'moderate' | 'weak';
    score: number;
    description: { ko: string; en: string };
    goodFor: string[];
  }>;
}

// ============================
// Extended Saju Data Type
// ============================

import type { SibsinKind, TwelveStage } from '@/lib/Saju/types';

export interface ExtendedSajuData {
  dayMaster?: { element?: string; name?: string; heavenlyStem?: string };
  sibsin?: {
    year?: SibsinKind;
    month?: SibsinKind;
    day?: SibsinKind;
    hour?: SibsinKind;
  };
  twelveStages?: {
    year?: TwelveStage;
    month?: TwelveStage;
    day?: TwelveStage;
    hour?: TwelveStage;
  };
  shinsal?: Array<{ name?: string; shinsal?: string } | string> | Record<string, unknown>;
  sinsal?: {
    luckyList?: Array<{ name?: string } | string>;
    unluckyList?: Array<{ name?: string } | string>;
    twelveAll?: Array<{ name?: string }>;
  };
  advancedAnalysis?: {
    sibsin?: { sibsinDistribution?: Record<string, number> };
    geokguk?: { name?: string; type?: string; description?: string };
    yongsin?: { element?: string; name?: string; type?: string; reason?: string };
    hyungChungHoeHap?: {
      chung?: string[];
      conflicts?: string[];
      hap?: string[];
      harmony?: string[];
    };
    sinsal?: {
      luckyList?: Array<{ name?: string } | string>;
      unluckyList?: Array<{ name?: string } | string>;
    };
  };
  daeun?: Array<{
    current?: boolean;
    isCurrent?: boolean;
    element?: string;
    heavenlyStem?: string;
    earthlyBranch?: string;
    startAge?: number;
  }>;
  birthYear?: number;
}
