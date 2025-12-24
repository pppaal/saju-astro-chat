/**
 * src/lib/destiny-map/types.ts
 * 타입 정의 전용 — DestinyMap 내부 데이터 구조 타입 선언
 */

export interface Pillar {
  heavenlyStem?: string;
  earthlyBranch?: string;
  ganji?: string;
}

export interface ShinsalHit {
  name: string;
  hanja?: string;
  type?: string;
  description?: string;
  position?: string;
}

export interface AdvancedSajuAnalysis {
  geokguk?: {
    type?: string;
    description?: string;
  };
  yongsin?: {
    element?: string;
    description?: string;
  };
  strengthLevel?: string;
  twelveStages?: Record<string, string>;
}

export interface SajuResult {
  dayMaster?: { name?: string; element?: string; yin_yang?: string };
  fiveElements?: Record<string, number>;
  pillars?: { year?: Pillar; month?: Pillar; day?: Pillar; time?: Pillar };
  unse?: {
    daeun?: Array<{ age?: number; ganji?: string; element?: string }>;
    annual?: Array<{ year?: number; ganji?: string }>;
    monthly?: Array<{ month?: number; ganji?: string }>;
    iljin?: Array<{ date?: string; ganji?: string }>;
    startAge?: number;
  };
  sinsal?: ShinsalHit[] | null;
  advancedAnalysis?: AdvancedSajuAnalysis;
}

export interface AstrologyResult {
  facts?: {
    sun?: { sign?: string; degree?: number };
    moon?: { sign?: string; degree?: number };
    venus?: { sign?: string };
    mars?: { sign?: string };
    mercury?: { sign?: string };
    jupiter?: { sign?: string };
    saturn?: { sign?: string };
    elementRatios?: Record<string, number>;
  };
  planets?: Array<{
    name: string;
    sign?: string;
    degree?: number;
    retrograde?: boolean;
  }>;
  ascendant?: { sign?: string; degree?: number };
  houses?: Array<{ number: number; sign?: string; degree?: number }>;
  aspects?: Array<{
    planet1: string;
    planet2: string;
    type: string;
    orb?: number;
  }>;
  dominantElement?: string;
  dominantPlanet?: string;
}

// 고급 점성술 데이터 타입
export interface AdvancedAstrologyData {
  extraPoints?: {
    chiron?: { sign?: string; degree?: number };
    lilith?: { sign?: string; degree?: number };
    partOfFortune?: { sign?: string; degree?: number };
    vertex?: { sign?: string; degree?: number };
  };
  solarReturn?: {
    date?: string;
    ascendant?: { sign?: string };
    planets?: Array<{ name: string; sign?: string; degree?: number }>;
  };
  lunarReturn?: {
    date?: string;
    moonSign?: string;
    moonPhase?: string;
  };
  progressions?: {
    progressedSun?: { sign?: string; degree?: number };
    progressedMoon?: { sign?: string; degree?: number };
    progressedAscendant?: { sign?: string; degree?: number };
  };
  draconic?: {
    planets?: Array<{ name: string; sign?: string; degree?: number }>;
    ascendant?: { sign?: string };
  };
  harmonics?: {
    harmonic?: number;
    planets?: Array<{ name: string; degree?: number }>;
  };
  asteroids?: Array<{
    name: string;
    sign?: string;
    degree?: number;
  }>;
  fixedStars?: Array<{
    name: string;
    conjunction?: string;
    orb?: number;
  }>;
  eclipses?: Array<{
    type: 'solar' | 'lunar';
    date?: string;
    sign?: string;
    degree?: number;
  }>;
  electional?: {
    moonPhase?: string;
    voidOfCourse?: boolean;
    planetaryHour?: string;
    score?: number;
  };
  midpoints?: Array<{
    planets: [string, string];
    degree?: number;
    sign?: string;
  }>;
}

export interface CombinedResult {
  saju: SajuResult;
  astrology: AstrologyResult;
  advancedAstrology?: AdvancedAstrologyData;
  summary?: string;
}
