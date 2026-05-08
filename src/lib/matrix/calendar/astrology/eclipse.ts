/**
 * astrology/eclipse.ts - 일/월식 영향
 */

import type { EclipseImpact } from './types';
import { ECLIPSES } from './constants';

/**
 * 주어진 날짜에 일/월식 영향이 있는지 확인
 */
export function checkEclipseImpact(date: Date): EclipseImpact {
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  for (const eclipse of ECLIPSES) {
    const eclipseUtc = Date.UTC(eclipse.date.getFullYear(), eclipse.date.getMonth(), eclipse.date.getDate());
    const diffMs = Math.abs(dateUtc - eclipseUtc);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays <= 1) {
      return { hasImpact: true, type: eclipse.type, intensity: "strong", sign: eclipse.sign, daysFromEclipse: Math.round(diffDays) };
    } else if (diffDays <= 3) {
      return { hasImpact: true, type: eclipse.type, intensity: "medium", sign: eclipse.sign, daysFromEclipse: Math.round(diffDays) };
    } else if (diffDays <= 7) {
      return { hasImpact: true, type: eclipse.type, intensity: "weak", sign: eclipse.sign, daysFromEclipse: Math.round(diffDays) };
    }
  }

  return { hasImpact: false, type: null, intensity: null, sign: null, daysFromEclipse: null };
}
