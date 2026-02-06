/**
 * astrology/moonPhase.ts - 달 위상 계산
 */

import type { LunarPhaseResult, MoonPhaseResult, MoonPhaseType } from './types';
import { getPlanetPosition } from './planetPosition';

/**
 * 달의 위상 계산 (0-29.5일 주기)
 */
export function getLunarPhase(date: Date): LunarPhaseResult {
  const knownNewMoon = Date.UTC(2000, 0, 6, 12, 0, 0);
  const lunarCycle = 29.53058867;

  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const diffMs = dateUtc - knownNewMoon;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  const phase = ((diffDays % lunarCycle) + lunarCycle) % lunarCycle;

  let phaseName: string;
  let phaseScore: number;

  if (phase < 1.85) {
    phaseName = "newMoon";
    phaseScore = 10;
  } else if (phase < 7.38) {
    phaseName = "waxingCrescent";
    phaseScore = 5;
  } else if (phase < 9.23) {
    phaseName = "firstQuarter";
    phaseScore = -3;
  } else if (phase < 14.77) {
    phaseName = "waxingGibbous";
    phaseScore = 7;
  } else if (phase < 16.61) {
    phaseName = "fullMoon";
    phaseScore = 12;
  } else if (phase < 22.15) {
    phaseName = "waningGibbous";
    phaseScore = 3;
  } else if (phase < 24.00) {
    phaseName = "lastQuarter";
    phaseScore = -5;
  } else {
    phaseName = "waningCrescent";
    phaseScore = -2;
  }

  return { phase, phaseName, phaseScore };
}

/**
 * 정밀 Moon Phase 계산 (8위상)
 */
export function getMoonPhaseDetailed(date: Date): MoonPhaseResult {
  const sunPos = getPlanetPosition(date, "sun");
  const moonPos = getPlanetPosition(date, "moon");

  const angle = (moonPos.longitude - sunPos.longitude + 360) % 360;
  const illumination = Math.round((1 - Math.cos(angle * Math.PI / 180)) / 2 * 100);
  const isWaxing = angle < 180;

  let phase: MoonPhaseType;
  let phaseName: string;
  let factorKey: string;
  let score: number;

  if (angle < 22.5 || angle >= 337.5) {
    phase = "new_moon";
    phaseName = "삭 (새달)";
    factorKey = "moonPhaseNew";
    score = 8;
  } else if (angle < 67.5) {
    phase = "waxing_crescent";
    phaseName = "초승달";
    factorKey = "moonPhaseWaxingCrescent";
    score = 10;
  } else if (angle < 112.5) {
    phase = "first_quarter";
    phaseName = "상현달";
    factorKey = "moonPhaseFirstQuarter";
    score = 5;
  } else if (angle < 157.5) {
    phase = "waxing_gibbous";
    phaseName = "차오르는 달";
    factorKey = "moonPhaseWaxingGibbous";
    score = 7;
  } else if (angle < 202.5) {
    phase = "full_moon";
    phaseName = "보름달";
    factorKey = "moonPhaseFull";
    score = 12;
  } else if (angle < 247.5) {
    phase = "waning_gibbous";
    phaseName = "기우는 달";
    factorKey = "moonPhaseWaningGibbous";
    score = 4;
  } else if (angle < 292.5) {
    phase = "last_quarter";
    phaseName = "하현달";
    factorKey = "moonPhaseLastQuarter";
    score = 0;
  } else {
    phase = "waning_crescent";
    phaseName = "그믐달";
    factorKey = "moonPhaseWaningCrescent";
    score = -3;
  }

  return { phase, phaseName, illumination, isWaxing, factorKey, score };
}
