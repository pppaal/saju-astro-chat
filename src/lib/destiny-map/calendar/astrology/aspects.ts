/**
 * astrology/aspects.ts - 어스펙트 계산
 */

import type { AspectResult } from './types';

/**
 * 어스펙트(각도 관계) 계산
 */
export function getAspect(longitude1: number, longitude2: number): AspectResult {
  let diff = Math.abs(longitude1 - longitude2);
  if (diff > 180) { diff = 360 - diff; }

  if (diff <= 8) { return { aspect: "conjunction", orb: diff }; }
  if (Math.abs(diff - 60) <= 6) { return { aspect: "sextile", orb: Math.abs(diff - 60) }; }
  if (Math.abs(diff - 90) <= 8) { return { aspect: "square", orb: Math.abs(diff - 90) }; }
  if (Math.abs(diff - 120) <= 8) { return { aspect: "trine", orb: Math.abs(diff - 120) }; }
  if (Math.abs(diff - 180) <= 8) { return { aspect: "opposition", orb: Math.abs(diff - 180) }; }

  return { aspect: null, orb: diff };
}
