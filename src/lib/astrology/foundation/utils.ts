// src/lib/astrology/foundation/utils.ts
import { ZodiacKo } from "./types";

export const ZODIAC_SIGNS: ZodiacKo[] = [
  "양자리","황소자리","쌍둥이자리","게자리","사자자리","처녀자리",
  "천칭자리","전갈자리","사수자리","염소자리","물병자리","물고기자리",
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
    formatted: `${sign} ${degree}° ${String(minute).padStart(2, "0")}'`,
    norm,
  };
}

export function angleDiff(a: number, b: number) {
  // 0~180 사이의 최소 분리각
  const d = Math.abs(((a - b) % 360 + 540) % 360 - 180);
  return 180 - d;
}

export function normalize360(x: number) {
  return ((x % 360) + 360) % 360;
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}