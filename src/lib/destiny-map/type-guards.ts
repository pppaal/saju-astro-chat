// src/lib/destiny-map/type-guards.ts
/**
 * Type guard functions for destiny-map types
 * Eliminates need for 'as unknown as' casts
 */

import type { Chart } from '@/lib/astrology/foundation/types';

/**
 * Type guard for Chart objects
 */
export function isChart(obj: unknown): obj is Chart {
  if (typeof obj !== 'object' || obj === null) return false;

  const candidate = obj as Record<string, unknown>;

  return (
    Array.isArray(candidate.planets) &&
    typeof candidate.houses === 'object' &&
    typeof candidate.aspects === 'object'
  );
}

/**
 * Type guard for AstrologyChartFacts
 */
export interface AstrologyChartFacts {
  sunSign: string;
  moonSign: string;
  ascendant: string;
  [key: string]: unknown;
}

export function isAstrologyChartFacts(obj: unknown): obj is AstrologyChartFacts {
  if (typeof obj !== 'object' || obj === null) return false;

  const candidate = obj as Record<string, unknown>;

  return (
    typeof candidate.sunSign === 'string' &&
    typeof candidate.moonSign === 'string' &&
    typeof candidate.ascendant === 'string'
  );
}

/**
 * Type guard for Pillar objects
 */
export interface SajuPillar {
  heavenlyStem: { name: string };
  earthlyBranch: { name: string };
}

export function isSajuPillar(obj: unknown): obj is SajuPillar {
  if (typeof obj !== 'object' || obj === null) return false;

  const candidate = obj as Record<string, unknown>;

  if (typeof candidate.heavenlyStem !== 'object' || candidate.heavenlyStem === null) {
    return false;
  }
  if (typeof candidate.earthlyBranch !== 'object' || candidate.earthlyBranch === null) {
    return false;
  }

  const stem = candidate.heavenlyStem as Record<string, unknown>;
  const branch = candidate.earthlyBranch as Record<string, unknown>;

  return (
    typeof stem.name === 'string' &&
    typeof branch.name === 'string'
  );
}

/**
 * Normalize unknown pillar format to standard SajuPillar
 */
export function normalizePillar(raw: unknown): SajuPillar | null {
  if (!raw || typeof raw !== 'object') return null;

  const candidate = raw as Record<string, unknown>;

  // Already in correct format
  if (isSajuPillar(candidate)) {
    return candidate;
  }

  // Try to extract from alternative formats
  let stemName: string | undefined;
  let branchName: string | undefined;

  // Format 1: { heavenlyStem: "甲", earthlyBranch: "子" }
  if (typeof candidate.heavenlyStem === 'string') {
    stemName = candidate.heavenlyStem;
  }
  if (typeof candidate.earthlyBranch === 'string') {
    branchName = candidate.earthlyBranch;
  }

  // Format 2: { stem: { name: "甲" }, branch: { name: "子" } }
  if (typeof candidate.stem === 'object' && candidate.stem !== null) {
    const stem = candidate.stem as Record<string, unknown>;
    if (typeof stem.name === 'string') {
      stemName = stem.name;
    }
  }
  if (typeof candidate.branch === 'object' && candidate.branch !== null) {
    const branch = candidate.branch as Record<string, unknown>;
    if (typeof branch.name === 'string') {
      branchName = branch.name;
    }
  }

  if (stemName && branchName) {
    return {
      heavenlyStem: { name: stemName },
      earthlyBranch: { name: branchName },
    };
  }

  return null;
}

/**
 * Type guard for Planet objects
 */
export interface Planet {
  name: string;
  longitude: number;
  latitude?: number;
  speed?: number;
  [key: string]: unknown;
}

export function isPlanet(obj: unknown): obj is Planet {
  if (typeof obj !== 'object' || obj === null) return false;

  const candidate = obj as Record<string, unknown>;

  return (
    typeof candidate.name === 'string' &&
    typeof candidate.longitude === 'number'
  );
}

/**
 * Type guard for array of planets
 */
export function isPlanetArray(arr: unknown): arr is Planet[] {
  if (!Array.isArray(arr)) return false;

  return arr.every(item => isPlanet(item));
}

/**
 * Safe getter for nested properties
 */
export function getNestedProperty<T = unknown>(
  obj: unknown,
  path: string,
  defaultValue: T
): T {
  if (typeof obj !== 'object' || obj === null) return defaultValue;

  const keys = path.split('.');
  let current: any = obj;

  for (const key of keys) {
    if (typeof current !== 'object' || current === null || !(key in current)) {
      return defaultValue;
    }
    current = current[key];
  }

  return current as T;
}

/**
 * Type assertion with runtime check
 */
export function assertType<T>(
  value: unknown,
  guard: (val: unknown) => val is T,
  errorMessage: string
): T {
  if (!guard(value)) {
    throw new TypeError(errorMessage);
  }
  return value;
}

// ============================
// SajuData Type Guards
// ============================

export interface SajuDayMaster {
  name?: string;
  heavenlyStem?: string;
  element?: string;
  yin_yang?: string;
}

export interface SajuDataStructure {
  dayMaster?: SajuDayMaster;
  pillars?: {
    year?: { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } };
    month?: { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } };
    day?: { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } };
    time?: { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } };
  };
  unse?: { daeun?: unknown[] };
  advancedAnalysis?: Record<string, unknown>;
  [key: string]: unknown;
}

export function isSajuDataStructure(obj: unknown): obj is SajuDataStructure {
  if (typeof obj !== 'object' || obj === null) return false;

  const candidate = obj as Record<string, unknown>;

  // Must have dayMaster or pillars to be considered valid saju data
  if (candidate.dayMaster !== undefined) {
    if (typeof candidate.dayMaster !== 'object') return false;
  }

  if (candidate.pillars !== undefined) {
    if (typeof candidate.pillars !== 'object') return false;
  }

  return candidate.dayMaster !== undefined || candidate.pillars !== undefined;
}

/**
 * Safely convert calculateSajuData result to SajuDataStructure
 */
export function toSajuDataStructure(raw: unknown): SajuDataStructure | null {
  if (!raw || typeof raw !== 'object') return null;

  if (isSajuDataStructure(raw)) {
    return raw;
  }

  return null;
}

// ============================
// CombinedResult Type Guards
// ============================

export interface CombinedResult {
  saju?: unknown;
  astrology?: unknown;
  extraPoints?: unknown;
  asteroids?: unknown;
  solarReturn?: unknown;
  lunarReturn?: unknown;
  progressions?: unknown;
  draconic?: unknown;
  harmonics?: unknown;
  fixedStars?: unknown;
  eclipses?: unknown;
  electional?: unknown;
  midpoints?: unknown;
  meta?: { generator?: string; generatedAt?: string };
  summary?: string;
}

export function isCombinedResult(obj: unknown): obj is CombinedResult {
  if (typeof obj !== 'object' || obj === null) return false;
  // CombinedResult is a loose structure, just check it's an object
  return true;
}

export function toCombinedResult(data: {
  saju?: unknown;
  astrology?: unknown;
  extraPoints?: unknown;
  asteroids?: unknown;
  solarReturn?: unknown;
  lunarReturn?: unknown;
  progressions?: unknown;
  draconic?: unknown;
  harmonics?: unknown;
  fixedStars?: unknown;
  eclipses?: unknown;
  electional?: unknown;
  midpoints?: unknown;
  meta?: { generator?: string; generatedAt?: string };
  summary?: string;
}): CombinedResult {
  return data;
}

// ============================
// MatrixCalculationInput Type Guards
// ============================

export interface MatrixCalculationInput {
  dayMaster?: { element?: string };
  fiveElements?: Record<string, number>;
  sibsin?: Record<string, string>;
  twelveStages?: Record<string, string>;
  sinsal?: { luckyList?: unknown[]; unluckyList?: unknown[] };
  pillars?: Record<string, unknown>;
  planets?: unknown[];
  houses?: unknown[];
  aspects?: unknown[];
  sunSign?: string;
  moonSign?: string;
  risingSign?: string;
  [key: string]: unknown;
}

export function isMatrixCalculationInput(obj: unknown): obj is MatrixCalculationInput {
  if (typeof obj !== 'object' || obj === null) return false;

  // MatrixCalculationInput is flexible, just ensure it's an object
  // with at least some expected properties
  const candidate = obj as Record<string, unknown>;

  // Should have at least one saju or astro related property
  return (
    candidate.dayMaster !== undefined ||
    candidate.fiveElements !== undefined ||
    candidate.planets !== undefined ||
    candidate.sunSign !== undefined
  );
}

export function toMatrixCalculationInput(obj: Record<string, unknown>): MatrixCalculationInput | null {
  if (isMatrixCalculationInput(obj)) {
    return obj;
  }
  return null;
}

// ============================
// PlanetData & HouseCusp Type Guards
// ============================

export interface PlanetData {
  name: string;
  sign?: string;
  house?: number;
  degree?: number;
  longitude?: number;
  latitude?: number;
  speed?: number;
  retrograde?: boolean;
  [key: string]: unknown;
}

export function isPlanetData(obj: unknown): obj is PlanetData {
  if (typeof obj !== 'object' || obj === null) return false;

  const candidate = obj as Record<string, unknown>;
  return typeof candidate.name === 'string';
}

export function isPlanetDataArray(arr: unknown): arr is PlanetData[] {
  if (!Array.isArray(arr)) return false;
  return arr.every(isPlanetData);
}

export function toPlanetDataArray(arr: unknown[]): PlanetData[] {
  return arr.filter(isPlanetData);
}

export interface HouseCusp {
  house?: number;
  sign?: string;
  degree?: number;
  longitude?: number;
  [key: string]: unknown;
}

export function isHouseCusp(obj: unknown): obj is HouseCusp {
  if (typeof obj !== 'object' || obj === null) return false;
  return true; // HouseCusp is flexible
}

export function toHouseCuspArray(arr: unknown[]): HouseCusp[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter(isHouseCusp);
}

// ============================
// Headers Type Guard
// ============================

export function isHeaders(obj: unknown): obj is Headers {
  if (typeof obj !== 'object' || obj === null) return false;

  const candidate = obj as Record<string, unknown>;
  return (
    typeof candidate.get === 'function' &&
    typeof candidate.has === 'function'
  );
}

export function toHeaders(obj: unknown): Headers | null {
  if (isHeaders(obj)) {
    return obj;
  }
  return null;
}

// ============================
// Record<string, unknown> Safe Cast
// ============================

export function toRecord(obj: unknown): Record<string, unknown> | null {
  if (typeof obj !== 'object' || obj === null) return null;
  return obj as Record<string, unknown>;
}

export function safeRecord(obj: unknown): Record<string, unknown> {
  if (typeof obj !== 'object' || obj === null) return {};
  return obj as Record<string, unknown>;
}
