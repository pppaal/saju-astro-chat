/**
 * astrology/retrograde.ts - 역행 계산
 */

import type { RetrogradePlanet } from './types';
import { getDaysSinceJ2000 } from './helpers';

/**
 * 행성 역행 여부 확인 (근사 계산)
 */
export function isRetrograde(date: Date, planet: RetrogradePlanet): boolean {
  const daysSinceJ2000 = getDaysSinceJ2000(date);

  switch (planet) {
    case "mercury":
      const mercuryCycle = daysSinceJ2000 % 116;
      return mercuryCycle >= 0 && mercuryCycle < 21;

    case "venus":
      const venusCycle = daysSinceJ2000 % 584;
      return venusCycle >= 0 && venusCycle < 40;

    case "mars":
      const marsCycle = daysSinceJ2000 % 780;
      return marsCycle >= 0 && marsCycle < 72;

    case "jupiter":
      const jupiterCycle = daysSinceJ2000 % 399;
      return jupiterCycle >= 0 && jupiterCycle < 121;

    case "saturn":
      const saturnCycle = daysSinceJ2000 % 378;
      return saturnCycle >= 0 && saturnCycle < 138;
  }
}

/**
 * 모든 역행 행성 목록 반환
 */
export function getRetrogradePlanetsForDate(date: Date): RetrogradePlanet[] {
  const planets: RetrogradePlanet[] = ["mercury", "venus", "mars", "jupiter", "saturn"];
  return planets.filter(p => isRetrograde(date, p));
}
