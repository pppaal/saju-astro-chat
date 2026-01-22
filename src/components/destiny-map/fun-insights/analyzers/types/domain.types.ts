// Domain-Specific Analysis Result Types
// Extracted from matrixAnalyzer.ts

import type { ShinsalPlanetResult, AsteroidHouseResult, SibsinHouseResult } from './matrix.types';

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
  wealthPatterns: Array<{ ko: string; en: string; strength: number }>;
  careerTiming: Array<{ period: string; strength: number; advice: { ko: string; en: string } }>;
  progressionInsights: Array<{ ko: string; en: string }>;
  careerAdvancedScore: number;
  careerAdvancedMessage: { ko: string; en: string };
}

// Love Timing Analysis
export interface LoveTimingResult {
  romanticWindows: Array<{ period: string; strength: number; description: { ko: string; en: string } }>;
  relationshipPatterns: Array<{ ko: string; en: string }>;
  loveTimingScore: number;
  loveTimingMessage: { ko: string; en: string };
}

// Shadow Personality Analysis
export interface ShadowPersonalityResult {
  lilithShadow: { ko: string; en: string };
  hiddenPotential: { ko: string; en: string };
  shadowScore: number;
  shadowMessage: { ko: string; en: string };
}

// Timing Matrix Analysis
export interface TimingMatrixResult {
  currentPeriod: { ko: string; en: string };
  majorTransits: Array<{ transit: string; impact: { ko: string; en: string } }>;
  luckyPeriods: Array<{ period: string; description: { ko: string; en: string } }>;
  timingScore: number;
  timingMessage: { ko: string; en: string };
}
