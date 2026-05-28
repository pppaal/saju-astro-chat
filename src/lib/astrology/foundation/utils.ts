// src/lib/astrology/foundation/utils.ts
import { ZodiacKo } from "./types";

export const ZODIAC_SIGNS: ZodiacKo[] = [
  "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
  "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces",
];

export function formatLongitude(lon: number) {
  const norm = ((lon % 360) + 360) % 360;
  const signIndex = Math.floor(norm / 30);
  const posInSign = norm % 30;
  const degree = Math.floor(posInSign);
  const minute = Math.floor((posInSign - degree) * 60);
  const sign = ZODIAC_SIGNS[signIndex];
  return {
    sign,
    degree,
    minute,
    formatted: `${sign} ${degree}deg ${String(minute).padStart(2, "0")}'`,
    norm,
  };
}

/**
 * Shortest angular distance between two longitudes (0..180).
 *
 * 과거에 이 함수가 `180 - shortest` 를 반환하던 inverted 구현이었는데
 * 호출처(transit.ts findTransitAspects)는 standard target angle (conjunction=0,
 * sextile=60, square=90, trine=120, opposition=180) 으로 비교하고 있었음 →
 * conjunction ↔ opposition, sextile ↔ trine 가 통째로 swap 돼 표시되던 회귀.
 * 표준 의미(conj=0)로 통일.
 */
export function angleDiff(a: number, b: number) {
  return Math.abs(((a - b) % 360 + 540) % 360 - 180);
}

/**
 * Returns the shortest angular distance between two angles (0-180)
 */
export function shortestAngle(a: number, b: number) {
  return Math.abs(((a - b) % 360 + 540) % 360 - 180);
}

export function normalize360(x: number) {
  return ((x % 360) + 360) % 360;
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
