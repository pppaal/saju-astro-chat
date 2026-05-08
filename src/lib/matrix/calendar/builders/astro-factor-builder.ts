/**
 * Astro Factor Builder - 점성술 요소 키 생성 모듈
 *
 * 점성술 분석 결과를 factorKeys로 변환합니다.
 */

import { ELEMENT_RELATIONS } from '../constants';

export interface AstroFactorBuilderInput {
  transitSunElement: string;
  natalSunElement: string;
  lunarPhaseName: string;
  retrogradePlanets: string[];
  hasVoidOfCourse: boolean;
  eclipseImpact: {
    hasImpact: boolean;
    type?: string;
    intensity?: string;
  };
  planetaryHourDayRuler: string;
  planetTransitFactorKeys: string[];
  solarReturnFactorKeys: string[];
  progressionFactorKeys: string[];
  moonPhaseFactorKey: string;
  moonPhaseScore: number;
  ganzhiStemElement: string;
  crossVerified: boolean;
  sajuPositive: boolean;
  astroPositive: boolean;
  sajuNegative: boolean;
  astroNegative: boolean;
}

export interface AstroFactorBuilderResult {
  factorKeys: string[];
}

/**
 * 점성술 요소 키 생성
 */
export function buildAstroFactorKeys(input: AstroFactorBuilderInput): AstroFactorBuilderResult {
  const {
    transitSunElement,
    natalSunElement,
    lunarPhaseName,
    retrogradePlanets,
    hasVoidOfCourse,
    eclipseImpact,
    planetaryHourDayRuler,
    planetTransitFactorKeys,
    solarReturnFactorKeys,
    progressionFactorKeys,
    moonPhaseFactorKey,
    ganzhiStemElement,
    crossVerified,
    sajuPositive,
    astroPositive,
    sajuNegative,
    astroNegative,
  } = input;

  const factorKeys: string[] = [];

  // 트랜짓 태양과 본명 태양의 관계
  if (transitSunElement === natalSunElement) {
    factorKeys.push('sameElement');
  } else if (ELEMENT_RELATIONS[natalSunElement]?.generatedBy === transitSunElement) {
    factorKeys.push('supportElement');
  } else if (ELEMENT_RELATIONS[natalSunElement]?.generates === transitSunElement) {
    factorKeys.push('givingElement');
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controlledBy === transitSunElement) {
    factorKeys.push('conflictElement');
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controls === transitSunElement) {
    factorKeys.push('controlElement');
  }

  // 달의 위상
  if (lunarPhaseName === 'newMoon') {
    factorKeys.push('lunarNewMoon');
  } else if (lunarPhaseName === 'fullMoon') {
    factorKeys.push('lunarFullMoon');
  } else if (lunarPhaseName === 'firstQuarter') {
    factorKeys.push('lunarFirstQuarter');
  } else if (lunarPhaseName === 'lastQuarter') {
    factorKeys.push('lunarLastQuarter');
  }

  // 시간별 분석 결과
  factorKeys.push(...planetTransitFactorKeys);
  factorKeys.push(...solarReturnFactorKeys);
  factorKeys.push(...progressionFactorKeys);

  // 고급 달 위상
  factorKeys.push(moonPhaseFactorKey);

  // 역행 행성
  for (const planet of retrogradePlanets) {
    factorKeys.push(`retrograde${planet.charAt(0).toUpperCase() + planet.slice(1)}`);
  }

  // Void of Course Moon
  if (hasVoidOfCourse) {
    factorKeys.push('voidOfCourse');
  }

  // 일/월식
  if (eclipseImpact.hasImpact) {
    if (eclipseImpact.type === 'solar') {
      factorKeys.push(`solarEclipse${eclipseImpact.intensity}`);
    } else {
      factorKeys.push(`lunarEclipse${eclipseImpact.intensity}`);
    }
  }

  // 행성 시간
  factorKeys.push(`dayRuler${planetaryHourDayRuler}`);

  // 교차 검증
  if (crossVerified) {
    factorKeys.push('crossVerified');
  }

  if (sajuNegative && astroNegative) {
    factorKeys.push('crossNegative');
  }

  if (ganzhiStemElement === transitSunElement) {
    factorKeys.push('alignedElement');
  }

  if ((sajuPositive && astroNegative) || (sajuNegative && astroPositive)) {
    factorKeys.push('mixedSignals');
  }

  return { factorKeys };
}
