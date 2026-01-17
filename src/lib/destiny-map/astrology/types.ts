/**
 * Destiny Map Astrology Types
 * 운명 지도 점성술 타입 정의
 *
 * Shared type definitions for the Destiny Map engine modules.
 * All types used across multiple modules are centralized here.
 */

import type {
  AstrologyChartFacts,
  PlanetData,
  AspectHit,
  ExtraPoint,
  ReturnChart,
  ProgressedChart,
  DraconicChart,
  DraconicComparison,
  HarmonicChart,
  HarmonicProfile,
  FixedStarConjunction,
  Eclipse,
  EclipseImpact,
  MoonPhase,
  VoidOfCourseInfo,
  PlanetaryHour,
  ElectionalAnalysis,
  Midpoint,
  MidpointActivation,
  Asteroid,
} from '@/lib/astrology';

import type {
  SajuFacts,
  ExtendedAdvancedAnalysis,
  GeokgukResult,
  YongsinResult,
  TonggeunResult,
  TuechulResult,
  HoegukResult,
  DeukryeongResult,
  HyeongchungAnalysis,
  SibsinComprehensiveAnalysis,
  HealthCareerComprehensive,
  ComprehensiveScore,
  UltraAdvancedAnalysis,
} from '@/lib/Saju';

import type { SajuPillarsAdapterInput } from '@/lib/Saju/shinsal';

// ======================================================
// House & Chart Types
// ======================================================

export interface HouseCusp {
  cusp: number;
  formatted: string;
}

// ======================================================
// Saju Pillar Types
// ======================================================

export type SajuPillar = SajuPillarsAdapterInput['yearPillar'];

export interface SajuPillars {
  year?: SajuPillar;
  month?: SajuPillar;
  day?: SajuPillar;
  time?: SajuPillar;
}

// ======================================================
// Transit Types
// ======================================================

export interface TransitAspect {
  type: string;
  from: { name: string; longitude: number };
  to: { name: string; longitude: number };
  orb: string;
}

// ======================================================
// Astrology Data Types
// ======================================================

export interface AstrologyData {
  facts: AstrologyChartFacts;
  planets: PlanetData[];
  houses: HouseCusp[];
  ascendant: PlanetData;
  mc: PlanetData;
  aspects: AspectHit[];
  meta: unknown;
  options: unknown;
  transits: TransitAspect[];
}

// ======================================================
// Saju Data Types (with Advanced Analysis)
// ======================================================

export interface AdvancedSajuAnalysis {
  extended?: ExtendedAdvancedAnalysis;
  geokguk?: GeokgukResult;
  yongsin?: YongsinResult;
  tonggeun?: TonggeunResult;
  tuechul?: TuechulResult[];
  hoeguk?: HoegukResult[];
  deukryeong?: DeukryeongResult;
  hyeongchung?: HyeongchungAnalysis;
  sibsin?: SibsinComprehensiveAnalysis;
  healthCareer?: HealthCareerComprehensive;
  score?: ComprehensiveScore;
  ultraAdvanced?: UltraAdvancedAnalysis;
}

export interface SajuData {
  facts: SajuFacts | Record<string, unknown>;
  pillars: SajuPillars;
  dayMaster: Record<string, unknown>;
  unse: {
    daeun: unknown[];
    annual: unknown[];
    monthly: unknown[];
    iljin: unknown[];
  };
  sinsal: unknown;
  advancedAnalysis?: AdvancedSajuAnalysis;
}

// ======================================================
// Input Types
// ======================================================

export interface CombinedInput {
  name?: string;
  gender?: 'male' | 'female';
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  theme?: string;
  tz?: string;
  userTimezone?: string;
}

// ======================================================
// Result Types
// ======================================================

export interface CombinedResult {
  meta: {
    generator: string;
    generatedAt: string;
    name?: string;
    gender?: string;
  };
  astrology: AstrologyData | Record<string, unknown>;
  saju: SajuData;
  summary: string;
  userTimezone?: string;
  analysisDate?: string;

  // Advanced Astrology Data
  extraPoints?: {
    chiron?: ExtraPoint;
    lilith?: ExtraPoint;
    partOfFortune?: ExtraPoint;
    vertex?: ExtraPoint;
  };

  solarReturn?: {
    chart: ReturnChart;
    summary: ReturnType<typeof import('@/lib/astrology').getSolarReturnSummary>;
  };

  lunarReturn?: {
    chart: ReturnChart;
    summary: ReturnType<typeof import('@/lib/astrology').getLunarReturnSummary>;
  };

  progressions?: {
    secondary: {
      chart: ProgressedChart;
      moonPhase: unknown;
      summary: ReturnType<typeof import('@/lib/astrology').getProgressionSummary>;
    };
    solarArc?: {
      chart: ProgressedChart;
      summary: ReturnType<typeof import('@/lib/astrology').getProgressionSummary>;
    };
  };

  draconic?: {
    chart: DraconicChart;
    comparison: DraconicComparison;
  };

  harmonics?: {
    h5: HarmonicChart;
    h7: HarmonicChart;
    h9: HarmonicChart;
    profile: HarmonicProfile;
  };

  asteroids?: {
    ceres?: Asteroid;
    pallas?: Asteroid;
    juno?: Asteroid;
    vesta?: Asteroid;
    aspects?: ReturnType<typeof import('@/lib/astrology').findAllAsteroidAspects>;
  };

  fixedStars?: FixedStarConjunction[];

  eclipses?: {
    impact: EclipseImpact | null;
    upcoming: Eclipse[];
  };

  electional?: {
    moonPhase: MoonPhase;
    voidOfCourse: VoidOfCourseInfo | null;
    planetaryHour: PlanetaryHour;
    retrograde: string[];
    analysis?: ElectionalAnalysis;
  };

  midpoints?: {
    sunMoon?: Midpoint;
    ascMc?: Midpoint;
    all: Midpoint[];
    activations?: MidpointActivation[];
  };
}

// ======================================================
// Date/Time Types
// ======================================================

export interface DateComponents {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface MaskedInput {
  name?: string;
  birthDate?: string;
  birthTime?: string;
  latitude: number;
  longitude: number;
  gender?: string;
  tz?: string;
  theme?: string;
  userTimezone?: string;
}

// ======================================================
// Light Point Types (for transit calculations)
// ======================================================

export interface LightPoint {
  name: string;
  longitude: number;
}

// ======================================================
// Electional Result Types
// ======================================================

export interface ElectionalResult {
  moonPhase: MoonPhase;
  voidOfCourse: VoidOfCourseInfo | null;
  planetaryHour: PlanetaryHour;
  retrograde: string[];
  analysis?: ElectionalAnalysis;
}

// ======================================================
// Midpoints Result Types
// ======================================================

export interface MidpointsResult {
  sunMoon?: Midpoint;
  ascMc?: Midpoint;
  all: Midpoint[];
  activations?: MidpointActivation[];
}

// ======================================================
// Summary Input Types
// ======================================================

export interface SummaryInput {
  name?: string;
  planets: PlanetData[];
  ascendant: { sign?: string };
  mc: { sign?: string };
  astrologyFacts: AstrologyChartFacts;
  dayMaster: {
    name?: string;
    element?: string;
  };
}

// ======================================================
// Re-export astrology types for convenience
// ======================================================

export type {
  AstrologyChartFacts,
  PlanetData,
  AspectHit,
  ExtraPoint,
  ReturnChart,
  ProgressedChart,
  DraconicChart,
  DraconicComparison,
  HarmonicChart,
  HarmonicProfile,
  FixedStarConjunction,
  Eclipse,
  EclipseImpact,
  MoonPhase,
  VoidOfCourseInfo,
  PlanetaryHour,
  ElectionalAnalysis,
  Midpoint,
  MidpointActivation,
  Asteroid,
};

// ======================================================
// Re-export Saju types for convenience
// ======================================================

export type {
  SajuFacts,
  ExtendedAdvancedAnalysis,
  GeokgukResult,
  YongsinResult,
  TonggeunResult,
  TuechulResult,
  HoegukResult,
  DeukryeongResult,
  HyeongchungAnalysis,
  SibsinComprehensiveAnalysis,
  HealthCareerComprehensive,
  ComprehensiveScore,
  UltraAdvancedAnalysis,
};
