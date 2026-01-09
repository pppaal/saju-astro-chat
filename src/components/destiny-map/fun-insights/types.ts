// Common type definitions for fun-insights analyzers

export interface DayMasterInfo {
  name?: string;
  heavenlyStem?: string;
  element?: string;
}

export interface PillarInfo {
  heavenlyStem?: string | { name?: string; sibsin?: string | { name?: string; kind?: string } };
  earthlyBranch?: string | { name?: string; sibsin?: string | { name?: string; kind?: string } };
  branch?: string;
}

export interface UnseItem {
  year?: number;
  month?: number;
  day?: number | string;
  age?: number;
  heavenlyStem?: string;
  earthlyBranch?: string;
  sibsin?: { cheon?: string; ji?: string } | string;
  ganji?: string;
  stem?: { name?: string; element?: string };
  branch?: { name?: string; element?: string };
  element?: string;
  score?: number;
  summary?: string;
  advice?: string;
  [key: string]: unknown;
}

export interface ShinsalItem {
  name?: string;
  kind?: string;
}

export interface SajuData {
  dayMaster?: DayMasterInfo;
  pillars?: {
    year?: PillarInfo;
    month?: PillarInfo;
    day?: PillarInfo;
    time?: PillarInfo;
  };
  yearPillar?: PillarInfo;
  monthPillar?: PillarInfo;
  dayPillar?: PillarInfo;
  timePillar?: PillarInfo;
  fiveElements?: Record<string, number>;
  elements?: Record<string, number>;
  unse?: {
    daeun?: UnseItem[];
    annual?: UnseItem[];
    monthly?: UnseItem[];
    iljin?: UnseItem[];
    daeunsu?: number;
  };
  sinsal?: {
    luckyList?: { name: string }[];
    unluckyList?: { name: string }[];
    twelveAll?: { name: string }[];
  };
  shinsal?: ShinsalItem[];
  specialStars?: ShinsalItem[];
  twelveStage?: string;
  twelveStages?: { day?: string };
  advancedAnalysis?: {
    sibsin?: { sibsinDistribution?: Record<string, number> };
    geokguk?: { name?: string; type?: string; description?: string };
    yongsin?: { element?: string; name?: string; type?: string; reason?: string };
    tonggeun?: { score?: number; totalScore?: number; details?: unknown[] };
    hyungChungHoeHap?: {
      chung?: string[];
      conflicts?: string[];
      hap?: string[];
      harmony?: string[];
    };
    score?: Record<string, number>;
    extended?: {
      strength?: { strength?: number; total?: number; score?: number; level?: string; type?: string };
      geokguk?: Record<string, unknown>;
      yongsin?: Record<string, unknown>;
    };
    elementScores?: Array<{ element?: string; ratio?: number; score?: number }>;
    [key: string]: unknown;
  };
  facts?: { birthDate?: string };
  birthDate?: string;
}

export interface PlanetData {
  name?: string;
  sign?: string;
  degree?: number;
  house?: number;
  formatted?: string;
  speed?: number;
  retrograde?: boolean;
  longitude?: number;
}

export interface AspectData {
  from?: string;
  to?: string;
  type?: string;
  orb?: number;
}

export interface ExtraPointData {
  sign?: string;
  house?: number;
}

export interface FixedStarData {
  name?: string;
  orb?: number;
  conjunct?: string;
}

export interface HarmonicData {
  harmonic?: number;
  planets?: PlanetData[];
}

export interface AsteroidData {
  name?: string;
  sign?: string;
  house?: number;
}

export interface HouseData {
  index?: number;
  cusp?: number;
  sign?: string;
}

export interface EclipseData {
  type?: string;
  date?: string;
  sign?: string;
}

export interface HarmonicsProfile {
  harmonic?: number;
  emphasis?: boolean;
}

export interface AsteroidsData {
  juno?: { sign?: string };
  ceres?: { sign?: string };
  pallas?: { sign?: string };
  vesta?: { sign?: string };
}

export interface EclipsesInfo {
  nextImpact?: boolean;
}

export interface SolarReturnData {
  chart?: Record<string, unknown>;
  summary?: string | { theme?: string; [key: string]: unknown };
}

export interface LunarReturnData {
  chart?: Record<string, unknown>;
  summary?: string | { theme?: string; [key: string]: unknown };
}

export interface ProgressionsData {
  secondary?: { chart?: Record<string, unknown>; moonPhase?: string; summary?: string };
  solarArc?: { chart?: Record<string, unknown>; summary?: string };
}

export interface DraconicData {
  chart?: Record<string, unknown>;
  comparison?: Record<string, unknown>;
  sun?: { sign?: string };
  moon?: { sign?: string };
}

export interface ElectionalData {
  moonPhase?: string;
  voidOfCourse?: boolean | { isVoid?: boolean };
  retrograde?: string[];
}

export interface MidpointsData {
  sunMoon?: { point?: number; formatted?: string };
  ascMc?: { point?: number; formatted?: string };
  all?: Array<{ planet1: string; planet2: string; point?: number; formatted?: string }>;
  activations?: Array<{ midpoint?: string; activator?: string; aspect?: string }>;
}

export interface AstroData {
  planets?: PlanetData[] | Record<string, { sign?: string }>;
  ascendant?: { sign?: string; formatted?: string };
  mc?: { sign?: string; formatted?: string };
  houses?: { index?: number; cusp?: number; sign?: string }[];
  aspects?: AspectData[];
  extraPoints?: {
    chiron?: ExtraPointData;
    partOfFortune?: ExtraPointData;
    vertex?: ExtraPointData;
    lilith?: ExtraPointData;
  };
  advancedAstrology?: {
    chiron?: ExtraPointData;
    partOfFortune?: ExtraPointData;
    vertex?: ExtraPointData;
    draconic?: { sun?: { sign?: string }; moon?: { sign?: string } };
    harmonics?: HarmonicData[];
    lilith?: ExtraPointData;
    asteroids?: AsteroidData[];
    fixedStars?: FixedStarData[];
    eclipses?: EclipseData[];
    [key: string]: unknown;
  };
  harmonics?: {
    profile?: HarmonicsProfile[];
    h5?: Record<string, unknown>;
    h7?: Record<string, unknown>;
    h9?: Record<string, unknown>;
  };
  fixedStars?: FixedStarData[];
  asteroids?: AsteroidsData;
  eclipses?: string | EclipsesInfo;
  facts?: Record<string, { sign?: string }>;
  // Advanced astrology data merged at top level
  solarReturn?: SolarReturnData;
  lunarReturn?: LunarReturnData;
  progressions?: ProgressionsData;
  draconic?: DraconicData;
  electional?: ElectionalData;
  midpoints?: MidpointsData;
  [key: string]: unknown;
}

// ============================
// Tab Component Types
// ============================

export interface BilingualText {
  ko?: string;
  en?: string;
  koDetail?: string;
  enDetail?: string;
}

export interface DestinyNarrative {
  relationshipStyle?: BilingualText;
  careerStyle?: BilingualText;
  healthStyle?: BilingualText;
  personalityStyle?: BilingualText;
  fortuneStyle?: BilingualText;
  karmaStyle?: BilingualText;
  careerDestiny?: BilingualText;
  emotionPattern?: BilingualText;
  [key: string]: unknown;
}

// Tab에서 사용하는 data 객체의 타입
export interface TabData {
  personalityAnalysis?: Record<string, unknown> | null;
  loveAnalysis?: Record<string, unknown> | null;
  careerAnalysis?: Record<string, unknown> | null;
  fortuneAnalysis?: Record<string, unknown> | null;
  healthAnalysis?: Record<string, unknown> | null;
  karmaAnalysis?: Record<string, unknown> | null;
  normalizedElements?: Array<{ element: string; value: number }> | null;
  strongest?: string[] | null;
  weakest?: string[] | null;
  luckyItems?: Array<{ item: string }> | null;
  dayMasterName?: string;
  dayElement?: string;
  [key: string]: unknown;
}

export interface TabProps {
  saju?: SajuData | null;
  astro?: AstroData | null;
  lang: string;
  isKo: boolean;
  data: TabData;
  destinyNarrative?: DestinyNarrative | null;
  combinedLifeTheme?: (BilingualText & { detail?: BilingualText }) | null;
}

// 탭 ID 타입
export type TabId = 'personality' | 'love' | 'career' | 'fortune' | 'health' | 'karma';

// 탭 정의 타입
export interface TabDefinition {
  id: TabId;
  label: string;
  emoji: string;
  desc: string;
}
