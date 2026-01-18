/**
 * @file Degree-Based Aspect Calculation
 * 정확한 경도 기반 애스펙트 계산
 */

import type { AspectType, ExtendedAspectType } from './types';
import { calculateEclipticDegree, calculateExactAngle } from './element-utils';
import { determineAspectType, isAspectHarmonious, calculateAspectStrength } from './aspect-utils';

// 황도대 사인별 시작 경도
export const SIGN_START_DEGREES: Record<string, number> = {
  Aries: 0, Taurus: 30, Gemini: 60, Cancer: 90,
  Leo: 120, Virgo: 150, Libra: 180, Scorpio: 210,
  Sagittarius: 240, Capricorn: 270, Aquarius: 300, Pisces: 330,
};

// Aspect별 허용 오차(Orb)
export const ASPECT_ORBS: Record<AspectType, number> = {
  conjunction: 10,
  sextile: 6,
  square: 8,
  trine: 8,
  opposition: 10,
};

export interface DegreeBasedAspect {
  planet1: string;
  planet2: string;
  planet1Degree: number;
  planet2Degree: number;
  exactAngle: number;
  aspectType: ExtendedAspectType | null;
  orb: number;
  isApplying: boolean;
  strength: number;
  isHarmonious: boolean;
  interpretation: string;
}

export interface DegreeAspectAnalysis {
  allAspects: DegreeBasedAspect[];
  majorAspects: DegreeBasedAspect[];
  minorAspects: DegreeBasedAspect[];
  tightestAspect: DegreeBasedAspect | null;
  harmonyScore: number;
  tensionScore: number;
  overallBalance: number;
}

/**
 * Analyze degree-based aspects between planets
 */
export function analyzeDegreeBasedAspects(
  p1Planets: { name: string; sign: string; degree?: number }[],
  p2Planets: { name: string; sign: string; degree?: number }[]
): DegreeAspectAnalysis {
  const allAspects: DegreeBasedAspect[] = [];

  for (const planet1 of p1Planets) {
    for (const planet2 of p2Planets) {
      const degree1 = calculateEclipticDegree(planet1.sign, planet1.degree ?? 15);
      const degree2 = calculateEclipticDegree(planet2.sign, planet2.degree ?? 15);
      const exactAngle = calculateExactAngle(degree1, degree2);
      const { type, orb } = determineAspectType(exactAngle);

      if (type) {
        const maxOrb = ASPECT_ORBS[type as AspectType] ?? 5;
        const strength = calculateAspectStrength(orb, maxOrb);
        const harmonious = isAspectHarmonious(type);

        allAspects.push({
          planet1: planet1.name,
          planet2: planet2.name,
          planet1Degree: degree1,
          planet2Degree: degree2,
          exactAngle,
          aspectType: type,
          orb: Math.round(orb * 100) / 100,
          isApplying: degree1 < degree2,
          strength,
          isHarmonious: harmonious,
          interpretation: generateDegreeAspectInterpretation(planet1.name, planet2.name, type, harmonious),
        });
      }
    }
  }

  const majorAspects = allAspects.filter(a =>
    ['conjunction', 'sextile', 'square', 'trine', 'opposition'].includes(a.aspectType!)
  );
  const minorAspects = allAspects.filter(a =>
    !['conjunction', 'sextile', 'square', 'trine', 'opposition'].includes(a.aspectType!)
  );

  const tightestAspect = allAspects.length > 0
    ? allAspects.reduce((min, a) => a.orb < min.orb ? a : min)
    : null;

  const harmoniousAspects = allAspects.filter(a => a.isHarmonious);
  const challengingAspects = allAspects.filter(a => !a.isHarmonious);

  const harmonyScore = harmoniousAspects.reduce((sum, a) => sum + a.strength, 0) / Math.max(harmoniousAspects.length, 1);
  const tensionScore = challengingAspects.reduce((sum, a) => sum + a.strength, 0) / Math.max(challengingAspects.length, 1);

  const overallBalance = allAspects.length > 0
    ? Math.round((harmoniousAspects.length / allAspects.length) * 100)
    : 50;

  return {
    allAspects,
    majorAspects,
    minorAspects,
    tightestAspect,
    harmonyScore: Math.round(harmonyScore),
    tensionScore: Math.round(tensionScore),
    overallBalance,
  };
}

function generateDegreeAspectInterpretation(
  planet1: string,
  planet2: string,
  type: ExtendedAspectType,
  isHarmonious: boolean
): string {
  const aspectNames: Record<ExtendedAspectType, string> = {
    conjunction: '합',
    sextile: '육분',
    square: '사분',
    trine: '삼분',
    opposition: '대립',
    semisextile: '반육분',
    semisquare: '반사분',
    sesquiquadrate: '세스퀴사분',
    quincunx: '인컨정트',
  };

  const aspectName = aspectNames[type] || type;

  if (isHarmonious) {
    return `${planet1}과 ${planet2}의 ${aspectName}(${type})이 에너지의 자연스러운 흐름을 만듭니다`;
  } else {
    return `${planet1}과 ${planet2}의 ${aspectName}(${type})이 성장을 위한 긴장을 제공합니다`;
  }
}
