/**
 * Type Definitions for Life Prediction API
 * Centralized types for request/response structures and advanced analysis
 */

import type { EventType } from '@/lib/prediction/lifePredictionEngine';

// ============================================================
// Advanced Analysis Result Types
// ============================================================

export interface AdvancedAnalysis {
  // TIER 1: Ultra-precision analysis
  tier1?: {
    gongmang?: {
      emptyBranches: string[];
      isAffected: boolean;
      affectedAreas: string[];
    };
    shinsal?: {
      active: Array<{
        name: string;
        type: 'lucky' | 'unlucky' | 'special';
        description: string;
      }>;
      score: number;
    };
    energyFlow?: {
      strength: string;
      dominantElement: string;
      tonggeunCount: number;
      tuechulCount: number;
    };
    hourlyAdvice?: Array<{
      hour: number;
      quality: string;
      activity: string;
    }>;
  };

  // TIER 2: Daeun-transit synchronization
  tier2?: {
    daeunSync?: {
      currentDaeun?: {
        stem: string;
        branch: string;
        age: number;
      };
      transitAlignment: number;
      majorThemes: string[];
    };
  };

  // TIER 3: Advanced astrology + patterns
  tier3?: {
    moonPhase?: {
      phase: string;
      illumination: number;
      name: string;
    };
    voidOfCourse?: {
      isVoid: boolean;
      endsAt?: string;
    };
    retrogrades?: string[];
    sajuPatterns?: {
      found: Array<{
        name: string;
        rarity: number;
        description: string;
      }>;
      rarityScore: number;
    };
  };
}

// ============================================================
// Astrology Data Types
// ============================================================

export interface PlanetData {
  sign?: string;
  signKo?: string;
  house?: number;
  longitude?: number;
  isRetrograde?: boolean;
}

export interface AstroChartData {
  sun?: PlanetData;
  moon?: PlanetData;
  mercury?: PlanetData;
  venus?: PlanetData;
  mars?: PlanetData;
  jupiter?: PlanetData;
  saturn?: PlanetData;
  ascendant?: { sign?: string; signKo?: string; longitude?: number };
  mc?: { sign?: string; signKo?: string; longitude?: number };
  planets?: Array<{
    name: string;
    sign?: string;
    signKo?: string;
    house?: number;
    longitude?: number;
    isRetrograde?: boolean;
  }>;
}

export interface AdvancedAstroData {
  extraPoints?: {
    chiron?: { sign?: string; house?: number };
    lilith?: { sign?: string; house?: number };
    partOfFortune?: { sign?: string; house?: number; longitude?: number };
    vertex?: { sign?: string; house?: number };
  };
  solarReturn?: {
    chart?: unknown;
    summary?: { year?: number; theme?: string; keyPlanets?: string[] };
  };
  lunarReturn?: {
    chart?: unknown;
    summary?: { month?: number; theme?: string };
  };
  progressions?: {
    secondary?: { chart?: unknown; moonPhase?: string; summary?: unknown };
    solarArc?: { chart?: unknown; summary?: unknown };
  };
  draconic?: {
    chart?: unknown;
    comparison?: unknown;
  };
  harmonics?: {
    h5?: unknown;
    h7?: unknown;
    h9?: unknown;
    profile?: unknown;
  };
  eclipses?: {
    impact?: { type?: string; date?: string; affectedPlanets?: string[] };
    upcoming?: Array<{ date?: string; type?: string }>;
  };
  electional?: {
    moonPhase?: { phase?: string; illumination?: number; name?: string };
    voidOfCourse?: { isVoid?: boolean; endsAt?: string };
    retrograde?: string[];
  };
  midpoints?: {
    sunMoon?: { longitude?: number };
    ascMc?: { longitude?: number };
    activations?: unknown[];
  };
}

// ============================================================
// Request Types
// ============================================================

export interface BaseRequest {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour?: number;
  gender: 'male' | 'female';
  dayStem: string;
  dayBranch: string;
  monthBranch: string;
  yearBranch: string;
  allStems?: string[];
  allBranches?: string[];
  daeunList?: Array<{
    startAge?: number;
    age?: number;
    stem?: string;
    heavenlyStem?: string;
    branch?: string;
    earthlyBranch?: string;
  }>;
  yongsin?: string[];
  kisin?: string[];
  locale?: 'ko' | 'en';
  // Astrology data (from precompute-chart)
  astroChart?: AstroChartData;
  advancedAstro?: AdvancedAstroData;
}

export interface MultiYearRequest extends BaseRequest {
  type: 'multi-year';
  startYear: number;
  endYear: number;
}

export interface PastAnalysisRequest extends BaseRequest {
  type: 'past-analysis';
  targetDate?: string;  // YYYY-MM-DD
  startDate?: string;   // for period analysis
  endDate?: string;     // for period analysis
}

export interface EventTimingRequest extends BaseRequest {
  type: 'event-timing';
  eventType: EventType;
  startYear: number;
  endYear: number;
}

export interface ComprehensiveRequest extends BaseRequest {
  type: 'comprehensive';
  yearsRange?: number;
}

export interface WeeklyTimingRequest extends BaseRequest {
  type: 'weekly-timing';
  eventType: EventType;
  startDate?: string;  // YYYY-MM-DD
  endDate?: string;    // YYYY-MM-DD (default 3 months)
}

export type PredictionRequest =
  | MultiYearRequest
  | PastAnalysisRequest
  | EventTimingRequest
  | ComprehensiveRequest
  | WeeklyTimingRequest;
