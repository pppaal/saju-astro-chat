/**
 * astrology/voidOfCourse.ts - Void of Course Moon
 */

import type { VoidOfCourseResult } from './types';
import { getPlanetPosition } from './planetPosition';

/**
 * Void of Course Moon 체크
 */
export function checkVoidOfCourseMoon(date: Date): VoidOfCourseResult {
  const moonPos = getPlanetPosition(date, "moon");
  const moonDegree = moonPos.degree;

  const sunPos = getPlanetPosition(date, "sun");
  const mercuryPos = getPlanetPosition(date, "mercury");
  const venusPos = getPlanetPosition(date, "venus");
  const marsPos = getPlanetPosition(date, "mars");
  const jupiterPos = getPlanetPosition(date, "jupiter");
  const saturnPos = getPlanetPosition(date, "saturn");

  const planets = [sunPos, mercuryPos, venusPos, marsPos, jupiterPos, saturnPos];
  const degreesToSignEnd = 30 - moonDegree;
  let hasUpcomingAspect = false;

  for (const planet of planets) {
    if (planet.sign === moonPos.sign && planet.degree > moonDegree) {
      hasUpcomingAspect = true;
      break;
    }

    const aspectAngles = [60, 90, 120, 180];
    for (const angle of aspectAngles) {
      const targetLon = (moonPos.longitude + angle) % 360;
      const targetSign = Math.floor(targetLon / 30);
      const moonCurrentSign = Math.floor(moonPos.longitude / 30);

      if (targetSign === moonCurrentSign) {
        const targetDegree = targetLon % 30;
        if (targetDegree > moonDegree) {
          const diff = Math.abs(planet.longitude - targetLon);
          if (diff <= 3 || diff >= 357) {
            hasUpcomingAspect = true;
            break;
          }
        }
      }
    }
    if (hasUpcomingAspect) { break; }
  }

  const hoursRemaining = degreesToSignEnd / 0.54;

  return {
    isVoid: !hasUpcomingAspect,
    moonSign: moonPos.sign,
    hoursRemaining: Math.round(hoursRemaining),
  };
}
