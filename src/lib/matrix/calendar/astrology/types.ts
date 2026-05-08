/**
 * astrology/types.ts - 점성술 타입 정의
 */

export type PlanetName = "sun" | "moon" | "mercury" | "venus" | "mars" | "jupiter" | "saturn";
export type RetrogradePlanet = "mercury" | "venus" | "mars" | "jupiter" | "saturn";
export type PlanetaryHourPlanet = "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn";
export type MoonPhaseType =
  | "new_moon"        // 삭 (새달)
  | "waxing_crescent" // 초승달
  | "first_quarter"   // 상현달
  | "waxing_gibbous"  // 차오르는 달
  | "full_moon"       // 보름달
  | "waning_gibbous"  // 기우는 달
  | "last_quarter"    // 하현달
  | "waning_crescent";// 그믐달

export interface PlanetPosition {
  sign: string;
  longitude: number;
  degree: number;
}

export interface EclipseData {
  date: Date;
  type: "solar" | "lunar";
  sign: string;
  degree: number;
}

export interface EclipseImpact {
  hasImpact: boolean;
  type: "solar" | "lunar" | null;
  intensity: "strong" | "medium" | "weak" | null;
  sign: string | null;
  daysFromEclipse: number | null;
}

export interface VoidOfCourseResult {
  isVoid: boolean;
  moonSign: string;
  hoursRemaining: number;
}

export interface MoonPhaseResult {
  phase: MoonPhaseType;
  phaseName: string;
  illumination: number;
  isWaxing: boolean;
  factorKey: string;
  score: number;
}

export interface LunarPhaseResult {
  phase: number;
  phaseName: string;
  phaseScore: number;
}

export interface PlanetaryHourResult {
  planet: PlanetaryHourPlanet;
  dayRuler: PlanetaryHourPlanet;
  isDay: boolean;
  goodFor: string[];
}

export interface AspectResult {
  aspect: string | null;
  orb: number;
}

export interface PlanetTransitResult {
  score: number;
  factorKeys: string[];
  positive: boolean;
  negative: boolean;
}
