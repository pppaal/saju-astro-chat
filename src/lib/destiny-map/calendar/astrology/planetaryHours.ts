/**
 * astrology/planetaryHours.ts - 행성 시간
 */

import type { PlanetaryHourResult } from './types';
import { DAY_RULERS, PLANETARY_HOUR_SEQUENCE, PLANETARY_HOUR_USES } from './constants';

/**
 * 현재 행성 시간 계산
 */
export function getPlanetaryHourForDate(date: Date): PlanetaryHourResult {
  const dayOfWeek = date.getDay();
  const dayRuler = DAY_RULERS[dayOfWeek];
  const hour = date.getHours();

  const isDay = hour >= 6 && hour < 18;

  let hourIndex: number;
  if (isDay) {
    hourIndex = Math.floor((hour - 6) / 1);
  } else {
    hourIndex = hour >= 18 ? (hour - 18) + 12 : (hour + 6) + 12;
  }
  hourIndex = hourIndex % 24;

  const dayRulerIndex = PLANETARY_HOUR_SEQUENCE.indexOf(dayRuler);
  const planetIndex = (dayRulerIndex + hourIndex) % 7;
  const planet = PLANETARY_HOUR_SEQUENCE[planetIndex];

  return {
    planet,
    dayRuler,
    isDay,
    goodFor: PLANETARY_HOUR_USES[planet],
  };
}
