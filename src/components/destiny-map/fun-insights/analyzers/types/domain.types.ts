// Domain-Specific Analysis Result Types
// Extracted from matrixAnalyzer.ts

import type { ShinsalPlanetResult, AsteroidHouseResult, SibsinHouseResult, MatrixFusion } from './matrix.types';
import type { FiveElement } from '@/lib/Saju/types';

// Love Domain
export interface LoveMatrixResult {
  shinsalLove: ShinsalPlanetResult[];
  asteroidLove: AsteroidHouseResult[];
  loveScore: number;
  loveMessage: { ko: string; en: string };
}

// Career Domain
export interface CareerMatrixResult {
  sibsinCareer: SibsinHouseResult[];
  careerStrengths: Array<{ area: string; score: number; icon: string }>;
  careerScore: number;
  careerMessage: { ko: string; en: string };
}

// Health Domain
export interface HealthMatrixResult {
  elementBalance: {
    wood: number;
    fire: number;
    earth: number;
    metal: number;
    water: number;
  };
  vulnerableAreas: Array<{
    organ: string;
    organKo: string;
    element: string;
    risk: 'high' | 'medium' | 'low';
    advice: { ko: string; en: string };
  }>;
  vitalityScore: number;
  healthMessage: { ko: string; en: string };
}

// Karma/Soul Domain
export interface KarmaMatrixResult {
  soulPattern: { ko: string; en: string };
  nodeAxis: { ko: string; en: string };
  karmicRelations: Array<{ ko: string; en: string }>;
  pastLifeHints: Array<{ ko: string; en: string }>;
  karmaScore: number;
  karmaMessage: { ko: string; en: string };
}

// Advanced Career Analysis
export interface CareerAdvancedResult {
  careerScore?: number;
  wealthPatterns?: Array<{ ko: string; en: string; strength: number }>;
  careerTiming?: Array<{ period: string; strength: number; advice: { ko: string; en: string } }>;
  progressionInsights?: Array<{ ko: string; en: string }>;
  careerAdvancedScore?: number;
  careerAdvancedMessage?: { ko: string; en: string };
  // Optional extended properties for legacy compatibility
  wealthPattern?: { ko: string; en: string; fusion?: MatrixFusion };
  successTiming?: Array<{ period: string; score: number; description: { ko: string; en: string } }>;
  careerProgression?: { phase: string; description: { ko: string; en: string } };
  nobleHelp?: Array<{ type: string; description: { ko: string; en: string } }>;
  fortunePoint?: { sign: string; house: number; description: { ko: string; en: string } };
  midheaven?: { sign: string; element: string; fusion?: MatrixFusion; publicImage?: { ko: string; en: string } };
  geokgukCareer?: { geokguk: string; pattern: string; fusion?: MatrixFusion; careerDirection?: { ko: string; en: string } };
  houseCareerMap?: Array<{ house: number; planets: string[]; careerArea: { ko: string; en: string }; strength: string; icon: string }>;
}

// Love Timing Analysis
export interface LoveTimingResult {
  romanticWindows: Array<{ period: string; strength: number; description: { ko: string; en: string } }>;
  relationshipPatterns: Array<{ ko: string; en: string }>;
  loveTimingScore: number;
  loveTimingMessage: { ko: string; en: string };
  // Optional extended properties for legacy compatibility
  timingScore?: number;
  timingMessage?: { ko: string; en: string };
  romanticTiming?: Array<{ period: string; score: number; description: { ko: string; en: string } }>;
  relationshipPattern?: Array<{ pattern: string; description: { ko: string; en: string } }>;
  destinyMeeting?: { timing: string; description: { ko: string; en: string } };
}

// Shadow Personality Analysis
export interface ShadowPersonalityResult {
  shadowScore: number;
  shadowMessage?: { ko: string; en: string };
  shinsalShadows?: Array<{
    shinsal: string;
    planet: string;
    fusion?: MatrixFusion;
    shadowTrait?: { ko: string; en: string };
    integration?: { ko: string; en: string };
  }>;
  chironWound?: {
    area?: { ko: string; en: string };
    manifestation?: { ko: string; en: string };
    healing?: { ko: string; en: string };
    gift?: { ko: string; en: string };
  } | null;
  lilithEnergy?: {
    element?: FiveElement;
    fusion?: MatrixFusion;
    suppressed?: { ko: string; en: string };
    expression?: { ko: string; en: string };
  } | null;
  // Legacy properties
  lilithShadow?: {
    ko?: string;
    en?: string;
    fusion?: MatrixFusion;
    element?: FiveElement;
    shadowSelf?: { ko: string; en: string };
    integration?: { ko: string; en: string };
  };
  hiddenPotential?: {
    ko?: string;
    en?: string;
    fusion?: MatrixFusion;
    potential?: { ko: string; en: string };
  };
}

// Timing Matrix Analysis
export interface TimingMatrixResult {
  overallScore?: number;
  overallMessage?: { ko: string; en: string };
  currentPeriod?: {
    ko?: string;
    en?: string;
    advice?: { ko: string; en: string };
  };
  daeunTimeline?: Array<{
    startAge: number;
    endAge?: number;
    isCurrent?: boolean;
    isPast?: boolean;
    element: string;
    stem?: string;
    branch?: string;
    ageRange?: string;
    score?: number;
    description?: { ko: string; en: string };
    icon?: string;
    period?: string;
    heavenlyStem?: string;
    earthlyBranch?: string;
    advice?: { ko: string; en: string };
    ko?: string;
    en?: string;
  }>;
  majorTransits?: Array<{
    transit?: string;
    planet?: string;
    timing?: string;
    score?: number;
    description?: { ko: string; en: string };
    icon?: string;
    isActive?: boolean;
    isUpcoming?: boolean;
    name?: string;
    period?: string;
    advice?: { ko: string; en: string };
    impact?: { ko: string; en: string };
  }>;
  retrogrades?: Array<{
    name: string;
    icon: string;
    isRetrograde?: boolean;
    planet?: string;
    period?: string;
  }>;
  luckyPeriods?: Array<{ period: string; description: { ko: string; en: string } }>;
  timingScore?: number;
  timingMessage?: { ko: string; en: string };
}
