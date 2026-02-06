/**
 * astrology/transits.ts - 행성 트랜짓 분석
 */

import type { PlanetTransitResult } from './types';
import { ZODIAC_TO_ELEMENT, ELEMENT_RELATIONS } from '../constants';
import { getPlanetPosition } from './planetPosition';
import { getAspect } from './aspects';
import { normalizeElement } from './helpers';

/**
 * 행성 트랜짓 분석
 */
export function analyzePlanetTransits(
  date: Date,
  natalSunSign: string,
  natalSunElement: string,
  natalSunLongitude?: number
): PlanetTransitResult {
  let score = 0;
  const factorKeys: string[] = [];
  let positive = false;
  let negative = false;

  const sunPos = getPlanetPosition(date, "sun");
  const moonPos = getPlanetPosition(date, "moon");
  const mercuryPos = getPlanetPosition(date, "mercury");
  const venusPos = getPlanetPosition(date, "venus");
  const marsPos = getPlanetPosition(date, "mars");
  const jupiterPos = getPlanetPosition(date, "jupiter");
  const saturnPos = getPlanetPosition(date, "saturn");

  const mercuryElement = normalizeElement(ZODIAC_TO_ELEMENT[mercuryPos.sign] || "fire");
  const venusElement = normalizeElement(ZODIAC_TO_ELEMENT[venusPos.sign] || "earth");
  const marsElement = normalizeElement(ZODIAC_TO_ELEMENT[marsPos.sign] || "fire");
  const jupiterElement = normalizeElement(ZODIAC_TO_ELEMENT[jupiterPos.sign] || "fire");
  const saturnElement = normalizeElement(ZODIAC_TO_ELEMENT[saturnPos.sign] || "earth");
  const sunElement = normalizeElement(ZODIAC_TO_ELEMENT[sunPos.sign] || "fire");
  const moonElement = normalizeElement(ZODIAC_TO_ELEMENT[moonPos.sign] || "water");

  // 수성 트랜짓
  if (mercuryPos.sign === natalSunSign) {
    score += 8;
    factorKeys.push("mercuryConjunct");
    positive = true;
  } else if (mercuryElement === natalSunElement) {
    score += 4;
    factorKeys.push("mercuryHarmony");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controlledBy === mercuryElement) {
    score -= 3;
    factorKeys.push("mercuryTension");
  }

  // 금성 트랜짓
  if (venusPos.sign === natalSunSign) {
    score += 10;
    factorKeys.push("venusConjunct");
    positive = true;
  } else if (venusElement === natalSunElement) {
    score += 5;
    factorKeys.push("venusHarmony");
    positive = true;
  } else if (ELEMENT_RELATIONS[natalSunElement]?.generatedBy === venusElement) {
    score += 7;
    factorKeys.push("venusSupport");
    positive = true;
  }

  // 화성 트랜짓
  if (marsPos.sign === natalSunSign) {
    score += 5;
    factorKeys.push("marsConjunct");
  } else if (marsElement === natalSunElement) {
    score += 3;
    factorKeys.push("marsHarmony");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controlledBy === marsElement) {
    score -= 8;
    factorKeys.push("marsConflict");
    negative = true;
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controls === marsElement) {
    score += 6;
    factorKeys.push("marsVictory");
    positive = true;
  }

  // 목성 트랜짓
  if (jupiterPos.sign === natalSunSign) {
    score += 15;
    factorKeys.push("jupiterConjunct");
    positive = true;
  } else if (jupiterElement === natalSunElement) {
    score += 8;
    factorKeys.push("jupiterHarmony");
    positive = true;
  } else if (ELEMENT_RELATIONS[natalSunElement]?.generatedBy === jupiterElement) {
    score += 10;
    factorKeys.push("jupiterGrowth");
    positive = true;
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controlledBy === jupiterElement) {
    score -= 4;
    factorKeys.push("jupiterExcess");
  }

  // 토성 트랜짓
  if (saturnPos.sign === natalSunSign) {
    score -= 10;
    factorKeys.push("saturnConjunct");
    negative = true;
  } else if (saturnElement === natalSunElement) {
    score -= 3;
    factorKeys.push("saturnDiscipline");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controls === saturnElement) {
    score += 5;
    factorKeys.push("saturnOvercome");
    positive = true;
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controlledBy === saturnElement) {
    score -= 12;
    factorKeys.push("saturnLesson");
    negative = true;
  } else if (ELEMENT_RELATIONS[natalSunElement]?.generatedBy === saturnElement) {
    score += 3;
    factorKeys.push("saturnStructure");
  }

  // 태양 트랜짓
  if (sunPos.sign === natalSunSign) {
    score += 12;
    factorKeys.push("solarReturn");
    positive = true;
  } else if (sunElement === natalSunElement) {
    score += 4;
    factorKeys.push("sunHarmony");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.generatedBy === sunElement) {
    score += 6;
    factorKeys.push("sunEnergize");
    positive = true;
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controlledBy === sunElement) {
    score -= 4;
    factorKeys.push("sunChallenge");
  }

  // 달 트랜짓
  if (moonPos.sign === natalSunSign) {
    score += 8;
    factorKeys.push("moonConjunct");
    positive = true;
  } else if (moonElement === natalSunElement) {
    score += 4;
    factorKeys.push("moonHarmony");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.generatedBy === moonElement) {
    score += 5;
    factorKeys.push("moonNurture");
    positive = true;
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controlledBy === moonElement) {
    score -= 3;
    factorKeys.push("moonEmotional");
  }

  // 어스펙트 분석
  if (natalSunLongitude !== undefined) {
    const jupiterAspect = getAspect(jupiterPos.longitude, natalSunLongitude);
    if (jupiterAspect.aspect) {
      switch (jupiterAspect.aspect) {
        case "trine":
          score += 12;
          factorKeys.push("jupiterTrine");
          positive = true;
          break;
        case "sextile":
          score += 8;
          factorKeys.push("jupiterSextile");
          positive = true;
          break;
        case "square":
          score -= 5;
          factorKeys.push("jupiterSquare");
          break;
        case "opposition":
          score -= 3;
          factorKeys.push("jupiterOpposition");
          break;
      }
    }

    const saturnAspect = getAspect(saturnPos.longitude, natalSunLongitude);
    if (saturnAspect.aspect) {
      switch (saturnAspect.aspect) {
        case "trine":
          score += 6;
          factorKeys.push("saturnTrine");
          positive = true;
          break;
        case "sextile":
          score += 4;
          factorKeys.push("saturnSextile");
          break;
        case "square":
          score -= 10;
          factorKeys.push("saturnSquare");
          negative = true;
          break;
        case "opposition":
          score -= 8;
          factorKeys.push("saturnOpposition");
          negative = true;
          break;
      }
    }

    const marsAspect = getAspect(marsPos.longitude, natalSunLongitude);
    if (marsAspect.aspect && marsAspect.aspect !== "conjunction") {
      switch (marsAspect.aspect) {
        case "trine":
          score += 5;
          factorKeys.push("marsTrine");
          positive = true;
          break;
        case "sextile":
          score += 3;
          factorKeys.push("marsSextile");
          break;
        case "square":
          score -= 6;
          factorKeys.push("marsSquare");
          negative = true;
          break;
        case "opposition":
          score -= 4;
          factorKeys.push("marsOpposition");
          break;
      }
    }

    const venusAspect = getAspect(venusPos.longitude, natalSunLongitude);
    if (venusAspect.aspect && venusAspect.aspect !== "conjunction") {
      switch (venusAspect.aspect) {
        case "trine":
          score += 8;
          factorKeys.push("venusTrine");
          positive = true;
          break;
        case "sextile":
          score += 5;
          factorKeys.push("venusSextile");
          positive = true;
          break;
        case "square":
          score -= 2;
          factorKeys.push("venusSquare");
          break;
        case "opposition":
          score += 2;
          factorKeys.push("venusOpposition");
          break;
      }
    }
  }

  return { score, factorKeys, positive, negative };
}
