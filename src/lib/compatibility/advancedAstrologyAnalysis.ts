/**
 * Advanced Astrology Analysis for Compatibility
 * 심화 점성학 분석: Aspects, Synastry, Composite Chart, Progressed Charts
 */

import { AstrologyProfile } from './cosmicCompatibility';

// ============================================================
// Planetary Aspects (행성 각도) 분석
// ============================================================

export type AspectType =
  | 'conjunction'     // 0° - 합
  | 'sextile'         // 60° - 육분
  | 'square'          // 90° - 사분
  | 'trine'           // 120° - 삼분
  | 'opposition';     // 180° - 대립

export interface Aspect {
  planet1: string;
  planet2: string;
  type: AspectType;
  angle: number;
  orb: number;
  isHarmonious: boolean;
  strength: 'strong' | 'moderate' | 'weak';
  interpretation: string;
}

export interface AspectAnalysis {
  majorAspects: Aspect[];
  harmoniousCount: number;
  challengingCount: number;
  overallHarmony: number; // 0-100
  keyInsights: string[];
}

export function analyzeAspects(p1: AstrologyProfile, p2: AstrologyProfile): AspectAnalysis {
  const aspects: Aspect[] = [];

  // Person1의 Sun과 Person2의 모든 행성
  aspects.push(...calculateAspectsForPlanet('Sun', p1.sun, p2));

  // Person1의 Moon과 Person2의 모든 행성
  aspects.push(...calculateAspectsForPlanet('Moon', p1.moon, p2));

  // Person1의 Venus와 Person2의 Mars (로맨스)
  const venusMarsAspect = calculateSingleAspect('Venus', 'Mars', p1.venus, p2.mars);
  if (venusMarsAspect) aspects.push(venusMarsAspect);

  // Person2의 Venus와 Person1의 Mars
  const marsVenusAspect = calculateSingleAspect('Venus', 'Mars', p2.venus, p1.mars);
  if (marsVenusAspect) aspects.push(marsVenusAspect);

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

  // 실제로는 정확한 경도 필요하지만 여기서는 sign 기반 간이 계산
  const aspect1 = calculateSingleAspect(planetName, 'Sun', planet1, person2.sun);
  if (aspect1) aspects.push(aspect1);

  const aspect2 = calculateSingleAspect(planetName, 'Moon', planet1, person2.moon);
  if (aspect2) aspects.push(aspect2);

  return aspects;
}

function calculateSingleAspect(
  planet1Name: string,
  planet2Name: string,
  planet1: { sign: string; element: string },
  planet2: { sign: string; element: string }
): Aspect | null {
  // 간이 계산: 같은 원소면 trine, 호환 원소면 sextile, 불화 원소면 square
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
    orb: 5, // 기본 orb
    isHarmonious,
    strength: 'moderate',
    interpretation,
  };
}

function isCompatibleElement(el1: string, el2: string): boolean {
  const compatible: Record<string, string[]> = {
    fire: ['air', 'fire'],
    earth: ['water', 'earth'],
    air: ['fire', 'air'],
    water: ['earth', 'water'],
  };
  return compatible[el1]?.includes(el2) ?? false;
}

function isNeutralElement(el1: string, el2: string): boolean {
  // 중립적인 원소 조합
  return !isCompatibleElement(el1, el2) && !isIncompatibleElement(el1, el2);
}

function isIncompatibleElement(el1: string, el2: string): boolean {
  const incompatible: Record<string, string[]> = {
    fire: ['water'],
    water: ['fire'],
    air: ['earth'],
    earth: ['air'],
  };
  return incompatible[el1]?.includes(el2) ?? false;
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

// ============================================================
// Synastry Chart Analysis (시너지 차트)
// ============================================================

export interface SynastryAnalysis {
  emotionalConnection: number; // Moon aspects
  intellectualConnection: number; // Mercury aspects (가정)
  romanticConnection: number; // Venus-Mars
  compatibilityIndex: number; // 종합
  strengths: string[];
  challenges: string[];
}

export function analyzeSynastry(
  p1: AstrologyProfile,
  p2: AstrologyProfile
): SynastryAnalysis {
  const strengths: string[] = [];
  const challenges: string[] = [];

  // Emotional Connection (Moon)
  const moonCompatibility = calculateMoonCompatibility(p1.moon, p2.moon);
  let emotionalConnection = moonCompatibility;

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
  if (moon1.sign === moon2.sign) return 90;
  if (moon1.element === moon2.element) return 75;
  if (isCompatibleElement(moon1.element, moon2.element)) return 65;
  if (isIncompatibleElement(moon1.element, moon2.element)) return 35;
  return 50;
}

// ============================================================
// Composite Chart Analysis (합성 차트)
// ============================================================

export interface CompositeChartAnalysis {
  relationshipPurpose: string;
  coreTheme: string;
  strengths: string[];
  growthAreas: string[];
  longevityPotential: number; // 0-100
}

export function analyzeCompositeChart(
  p1: AstrologyProfile,
  p2: AstrologyProfile
): CompositeChartAnalysis {
  // 합성 차트는 두 사람의 중간점
  // 간단히 원소 조합으로 관계 테마 파악

  const elements = [p1.sun.element, p1.moon.element, p2.sun.element, p2.moon.element];
  const elementCounts: Record<string, number> = {};

  for (const el of elements) {
    elementCounts[el] = (elementCounts[el] || 0) + 1;
  }

  const dominantElement = Object.entries(elementCounts)
    .sort((a, b) => b[1] - a[1])[0][0];

  let relationshipPurpose = '';
  let coreTheme = '';
  const strengths: string[] = [];
  const growthAreas: string[] = [];

  switch (dominantElement) {
    case 'fire':
      relationshipPurpose = '열정과 창조성을 통한 상호 영감';
      coreTheme = '모험, 성장, 자기표현';
      strengths.push('함께 새로운 것에 도전하는 용기');
      growthAreas.push('인내와 깊이 발전');
      break;

    case 'earth':
      relationshipPurpose = '안정성과 실질적 성취';
      coreTheme = '신뢰, 책임, 물질적 안정';
      strengths.push('믿을 수 있는 든든한 파트너십');
      growthAreas.push('융통성과 spontaneity 증진');
      break;

    case 'air':
      relationshipPurpose = '지적 교류와 소통';
      coreTheme = '아이디어, 대화, 사회적 연결';
      strengths.push('활발한 대화와 정신적 자극');
      growthAreas.push('감정적 깊이 발전');
      break;

    case 'water':
      relationshipPurpose = '감정적 치유와 영적 연결';
      coreTheme = '직관, 공감, 깊은 유대';
      strengths.push('강한 감정적 유대감');
      growthAreas.push('객관성과 경계 설정');
      break;
  }

  // 원소 균형도로 longevity 계산
  const balance = Object.values(elementCounts).length;
  const longevityPotential = balance >= 3 ? 85 : balance === 2 ? 70 : 60;

  return {
    relationshipPurpose,
    coreTheme,
    strengths,
    growthAreas,
    longevityPotential,
  };
}

// ============================================================
// House Overlays (하우스 중첩)
// ============================================================

export interface HouseOverlayAnalysis {
  description: string;
  areas: {
    area: string;
    impact: 'very_positive' | 'positive' | 'neutral' | 'challenging';
    description: string;
  }[];
}

export function analyzeHouseOverlays(
  p1: AstrologyProfile,
  p2: AstrologyProfile
): HouseOverlayAnalysis {
  // Ascendant 기반 간이 하우스 분석
  const areas = [];

  // 7th house (파트너십)
  areas.push({
    area: '파트너십',
    impact: 'very_positive' as const,
    description: '서로를 이상적인 파트너로 인식하며 강한 commitment',
  });

  // 5th house (로맨스/창조성)
  if (p1.venus.element === p2.sun.element) {
    areas.push({
      area: '로맨스',
      impact: 'very_positive' as const,
      description: '강한 로맨틱 끌림과 즐거운 시간',
    });
  }

  // 4th house (가정/안정)
  if (p1.moon.element === p2.moon.element) {
    areas.push({
      area: '가정생활',
      impact: 'positive' as const,
      description: '편안하고 안정적인 가정 환경 조성',
    });
  }

  // 10th house (사회적 지위)
  areas.push({
    area: '공동 목표',
    impact: 'positive' as const,
    description: '함께 사회적 성공을 추구할 수 있음',
  });

  return {
    description: '하우스 중첩이 관계의 주요 활동 영역을 결정합니다',
    areas,
  };
}

// ============================================================
// 종합 고급 점성학 궁합 분석
// ============================================================

export interface ComprehensiveAstrologyCompatibility {
  aspects: AspectAnalysis;
  synastry: SynastryAnalysis;
  compositeChart: CompositeChartAnalysis;
  houseOverlays: HouseOverlayAnalysis;
  overallScore: number;
  grade: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
  detailedInsights: string[];
}

export function performComprehensiveAstrologyAnalysis(
  p1: AstrologyProfile,
  p2: AstrologyProfile
): ComprehensiveAstrologyCompatibility {
  const aspects = analyzeAspects(p1, p2);
  const synastry = analyzeSynastry(p1, p2);
  const compositeChart = analyzeCompositeChart(p1, p2);
  const houseOverlays = analyzeHouseOverlays(p1, p2);

  // 종합 점수
  const overallScore = Math.round(
    aspects.overallHarmony * 0.3 +
    synastry.compatibilityIndex * 0.4 +
    compositeChart.longevityPotential * 0.3
  );

  let grade: ComprehensiveAstrologyCompatibility['grade'];
  if (overallScore >= 95) grade = 'S+';
  else if (overallScore >= 85) grade = 'S';
  else if (overallScore >= 75) grade = 'A';
  else if (overallScore >= 65) grade = 'B';
  else if (overallScore >= 50) grade = 'C';
  else if (overallScore >= 35) grade = 'D';
  else grade = 'F';

  // 요약
  let summary = '';
  if (grade === 'S+' || grade === 'S') {
    summary = '점성학적으로 매우 이상적인 궁합입니다. Aspects, Synastry, Composite Chart 모두 조화롭습니다.';
  } else if (grade === 'A' || grade === 'B') {
    summary = '점성학적으로 좋은 궁합입니다. 자연스러운 흐름 속에서 관계가 발전합니다.';
  } else if (grade === 'C') {
    summary = '점성학적으로 보통의 궁합입니다. 노력으로 좋은 관계를 만들 수 있습니다.';
  } else {
    summary = '점성학적으로 도전적인 궁합입니다. 깊은 이해와 조율이 필요합니다.';
  }

  // 상세 인사이트
  const detailedInsights = [
    ...aspects.keyInsights,
    ...synastry.strengths,
    `관계 목적: ${compositeChart.relationshipPurpose}`,
    `핵심 테마: ${compositeChart.coreTheme}`,
  ];

  return {
    aspects,
    synastry,
    compositeChart,
    houseOverlays,
    overallScore,
    grade,
    summary,
    detailedInsights,
  };
}
