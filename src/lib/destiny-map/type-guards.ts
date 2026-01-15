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
