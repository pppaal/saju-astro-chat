/**
 * @file Basic Aspect and Synastry Analysis
 * 기본 애스펙트 및 시나스트리 분석
 */

import type { AstrologyProfile } from '../cosmicCompatibility';
import type { Aspect, AspectType, AspectAnalysis, SynastryAnalysis } from './types';
import { isCompatibleElement, isIncompatibleElement } from './element-utils';

/**
 * Analyze aspects between two profiles
 */
export function analyzeAspects(p1: AstrologyProfile, p2: AstrologyProfile): AspectAnalysis {
  const aspects: Aspect[] = [];

  // Person1의 Sun과 Person2의 모든 행성
  aspects.push(...calculateAspectsForPlanet('Sun', p1.sun, p2));

  // Person1의 Moon과 Person2의 모든 행성
  aspects.push(...calculateAspectsForPlanet('Moon', p1.moon, p2));

  // Person1의 Venus와 Person2의 Mars (로맨스)
  const venusMarsAspect = calculateSingleAspect('Venus', 'Mars', p1.venus, p2.mars);
  if (venusMarsAspect) {aspects.push(venusMarsAspect);}

  // Person2의 Venus와 Person1의 Mars
  const marsVenusAspect = calculateSingleAspect('Venus', 'Mars', p2.venus, p1.mars);
  if (marsVenusAspect) {aspects.push(marsVenusAspect);}

  const harmoniousCount = aspects.filter(a => a.isHarmonious).length;
  const challengingCount = aspects.filter(a => !a.isHarmonious).length;

  const overallHarmony = Math.round(
    (harmoniousCount / Math.max(aspects.length, 1)) * 100
  );

  const keyInsights = generateAspectInsights(aspects);

  return {
    majorAspects: aspects.filter(a => a.strength === 'strong' || a.strength === 'moderate'),
    harmoniousCount,
    challengingCount,
    overallHarmony,
    keyInsights,
  };
}

function calculateAspectsForPlanet(
  planetName: string,
  planet1: { sign: string; element: string },
  person2: AstrologyProfile
): Aspect[] {
  const aspects: Aspect[] = [];

  const aspect1 = calculateSingleAspect(planetName, 'Sun', planet1, person2.sun);
  if (aspect1) {aspects.push(aspect1);}

  const aspect2 = calculateSingleAspect(planetName, 'Moon', planet1, person2.moon);
  if (aspect2) {aspects.push(aspect2);}

  return aspects;
}

function calculateSingleAspect(
  planet1Name: string,
  planet2Name: string,
  planet1: { sign: string; element: string },
  planet2: { sign: string; element: string }
): Aspect | null {
  const element1 = planet1.element;
  const element2 = planet2.element;

  let type: AspectType;
  let isHarmonious: boolean;
  let interpretation: string;

  if (element1 === element2) {
    type = 'conjunction';
    isHarmonious = true;
    interpretation = `${planet1Name}과 ${planet2Name}이 조화롭게 융합됩니다`;
  } else if (isCompatibleElement(element1, element2)) {
    type = 'trine';
    isHarmonious = true;
    interpretation = `${planet1Name}과 ${planet2Name}이 서로를 쉽게 지원합니다`;
  } else if (isNeutralElement(element1, element2)) {
    type = 'sextile';
    isHarmonious = true;
    interpretation = `${planet1Name}과 ${planet2Name}이 창의적으로 협력합니다`;
  } else {
    type = 'square';
    isHarmonious = false;
    interpretation = `${planet1Name}과 ${planet2Name} 간 긴장이 있으나 성장 기회가 됩니다`;
  }

  return {
    planet1: planet1Name,
    planet2: planet2Name,
    type,
    angle: type === 'conjunction' ? 0 : type === 'sextile' ? 60 : type === 'square' ? 90 : type === 'trine' ? 120 : 180,
    orb: 5,
    isHarmonious,
    strength: 'moderate',
    interpretation,
  };
}

function isNeutralElement(el1: string, el2: string): boolean {
  return !isCompatibleElement(el1, el2) && !isIncompatibleElement(el1, el2);
}

function generateAspectInsights(aspects: Aspect[]): string[] {
  const insights: string[] = [];

  // Sun-Moon aspects
  const sunMoon = aspects.find(a =>
    (a.planet1 === 'Sun' && a.planet2 === 'Moon') ||
    (a.planet1 === 'Moon' && a.planet2 === 'Sun')
  );

  if (sunMoon?.isHarmonious) {
    insights.push('태양-달의 조화로 의식과 무의식이 자연스럽게 연결됩니다');
  } else if (sunMoon && !sunMoon.isHarmonious) {
    insights.push('태양-달의 긴장으로 가치관과 감정 표현에 차이가 있을 수 있습니다');
  }

  // Venus-Mars aspects
  const venusMars = aspects.find(a =>
    (a.planet1 === 'Venus' && a.planet2 === 'Mars') ||
    (a.planet1 === 'Mars' && a.planet2 === 'Venus')
  );

  if (venusMars?.isHarmonious) {
    insights.push('금성-화성의 조화로 강한 로맨틱 케미스트리가 있습니다');
  } else if (venusMars?.type === 'square') {
    insights.push('금성-화성 스퀘어로 열정적이지만 때때로 충돌할 수 있습니다');
  }

  // 전체 조화
  const harmoniousRatio = aspects.filter(a => a.isHarmonious).length / aspects.length;
  if (harmoniousRatio > 0.7) {
    insights.push('대부분의 행성 배치가 조화로워 자연스러운 관계를 만듭니다');
  } else if (harmoniousRatio < 0.4) {
    insights.push('도전적인 aspects가 많아 성장을 위한 노력이 필요합니다');
  }

  return insights;
}

/**
 * Analyze synastry between two profiles
 */
export function analyzeSynastry(
  p1: AstrologyProfile,
  p2: AstrologyProfile
): SynastryAnalysis {
  const strengths: string[] = [];
  const challenges: string[] = [];

  // Emotional Connection (Moon)
  const moonCompatibility = calculateMoonCompatibility(p1.moon, p2.moon);
  const emotionalConnection = moonCompatibility;

  if (moonCompatibility >= 75) {
    strengths.push('깊은 감정적 이해와 공감');
  } else if (moonCompatibility < 50) {
    challenges.push('감정 표현 방식의 차이');
  }

  // Romantic Connection (Venus-Mars)
  let romanticConnection = 50;
  if (p1.venus.element === p2.mars.element || p2.venus.element === p1.mars.element) {
    romanticConnection = 85;
    strengths.push('강렬한 로맨틱 끌림');
  } else if (isCompatibleElement(p1.venus.element, p2.mars.element)) {
    romanticConnection = 70;
    strengths.push('부드러운 로맨틱 조화');
  }

  // Intellectual Connection (Sun 기반 간이 계산)
  const intellectualConnection = p1.sun.sign === p2.sun.sign ? 80 :
    p1.sun.element === p2.sun.element ? 70 : 50;

  if (intellectualConnection >= 70) {
    strengths.push('가치관과 세계관이 유사');
  } else if (intellectualConnection < 50) {
    challenges.push('관점과 접근 방식의 차이');
  }

  const compatibilityIndex = Math.round(
    (emotionalConnection * 0.4 +
    romanticConnection * 0.35 +
    intellectualConnection * 0.25)
  );

  return {
    emotionalConnection,
    intellectualConnection,
    romanticConnection,
    compatibilityIndex,
    strengths,
    challenges,
  };
}

function calculateMoonCompatibility(
  moon1: { sign: string; element: string },
  moon2: { sign: string; element: string }
): number {
  if (moon1.sign === moon2.sign) {return 90;}
  if (moon1.element === moon2.element) {return 75;}
  if (isCompatibleElement(moon1.element, moon2.element)) {return 65;}
  if (isIncompatibleElement(moon1.element, moon2.element)) {return 35;}
  return 50;
}
