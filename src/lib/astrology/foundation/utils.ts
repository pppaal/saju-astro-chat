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

export function angleDiff(a: number, b: number) {
  const d = Math.abs(((a - b) % 360 + 540) % 360 - 180);
  return 180 - d;
}

export function normalize360(x: number) {
  return ((x % 360) + 360) % 360;
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
