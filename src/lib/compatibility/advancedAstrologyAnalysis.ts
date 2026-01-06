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

// ============================================================
// Degree-Based Aspect Calculation (정확한 경도 기반 계산)
// ============================================================

// 황도대 사인별 시작 경도
const SIGN_START_DEGREES: Record<string, number> = {
  Aries: 0, Taurus: 30, Gemini: 60, Cancer: 90,
  Leo: 120, Virgo: 150, Libra: 180, Scorpio: 210,
  Sagittarius: 240, Capricorn: 270, Aquarius: 300, Pisces: 330,
};

// Aspect별 허용 오차(Orb)
const ASPECT_ORBS: Record<AspectType, number> = {
  conjunction: 10,
  sextile: 6,
  square: 8,
  trine: 8,
  opposition: 10,
};

// 추가 Aspect 타입
export type ExtendedAspectType =
  | AspectType
  | 'semisextile'    // 30°
  | 'semisquare'     // 45°
  | 'sesquiquadrate' // 135°
  | 'quincunx'       // 150° (inconjunct)
  | 'quintile'       // 72°
  | 'biquintile';    // 144°

export interface DegreeBasedAspect {
  planet1: string;
  planet2: string;
  planet1Degree: number;
  planet2Degree: number;
  exactAngle: number;
  aspectType: ExtendedAspectType | null;
  orb: number;
  isApplying: boolean; // 접근 중인지 분리 중인지
  strength: number; // 0-100 (orb가 좁을수록 강함)
  isHarmonious: boolean;
  interpretation: string;
}

export interface DegreeAspectAnalysis {
  allAspects: DegreeBasedAspect[];
  majorAspects: DegreeBasedAspect[]; // conjunction, square, trine, opposition, sextile
  minorAspects: DegreeBasedAspect[]; // semisextile, quincunx, etc.
  tightestAspect: DegreeBasedAspect | null;
  harmonyScore: number;
  tensionScore: number;
  overallBalance: number;
}

// 사인과 경도로부터 황도 경도 계산
export function calculateEclipticDegree(sign: string, degreeInSign: number = 15): number {
  const startDegree = SIGN_START_DEGREES[sign] ?? 0;
  return startDegree + degreeInSign;
}

// 두 행성 사이의 정확한 각도 계산
export function calculateExactAngle(degree1: number, degree2: number): number {
  let diff = Math.abs(degree1 - degree2);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

// 각도로부터 Aspect 타입 결정
export function determineAspectType(angle: number): { type: ExtendedAspectType | null; orb: number } {
  const aspectAngles: { type: ExtendedAspectType; angle: number; orb: number }[] = [
    { type: 'conjunction', angle: 0, orb: 10 },
    { type: 'semisextile', angle: 30, orb: 3 },
    { type: 'semisquare', angle: 45, orb: 3 },
    { type: 'sextile', angle: 60, orb: 6 },
    { type: 'quintile', angle: 72, orb: 2 },
    { type: 'square', angle: 90, orb: 8 },
    { type: 'trine', angle: 120, orb: 8 },
    { type: 'sesquiquadrate', angle: 135, orb: 3 },
    { type: 'biquintile', angle: 144, orb: 2 },
    { type: 'quincunx', angle: 150, orb: 4 },
    { type: 'opposition', angle: 180, orb: 10 },
  ];

  for (const aspect of aspectAngles) {
    const diff = Math.abs(angle - aspect.angle);
    if (diff <= aspect.orb) {
      return { type: aspect.type, orb: diff };
    }
  }

  return { type: null, orb: 0 };
}

// Aspect의 조화성 판단
export function isAspectHarmonious(type: ExtendedAspectType): boolean {
  const harmonious: ExtendedAspectType[] = ['conjunction', 'sextile', 'trine', 'quintile', 'biquintile'];
  return harmonious.includes(type);
}

// Aspect 강도 계산 (orb가 좁을수록 강함)
export function calculateAspectStrength(orb: number, maxOrb: number): number {
  return Math.round((1 - orb / maxOrb) * 100);
}

// 경도 기반 Aspect 분석
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
        const isHarmonious = isAspectHarmonious(type);

        allAspects.push({
          planet1: planet1.name,
          planet2: planet2.name,
          planet1Degree: degree1,
          planet2Degree: degree2,
          exactAngle,
          aspectType: type,
          orb: Math.round(orb * 100) / 100,
          isApplying: degree1 < degree2, // 간이 계산
          strength,
          isHarmonious,
          interpretation: generateDegreeAspectInterpretation(planet1.name, planet2.name, type, isHarmonious),
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
    quintile: '퀸타일',
    biquintile: '바이퀸타일',
  };

  const aspectName = aspectNames[type];

  if (isHarmonious) {
    return `${planet1}과 ${planet2}의 ${aspectName}(${type})이 에너지의 자연스러운 흐름을 만듭니다`;
  } else {
    return `${planet1}과 ${planet2}의 ${aspectName}(${type})이 성장을 위한 긴장을 제공합니다`;
  }
}

// ============================================================
// Mercury Aspects (소통과 지성)
// ============================================================

export interface MercuryAspectAnalysis {
  mercuryCompatibility: number;
  communicationStyle: string;
  intellectualSynergy: string;
  potentialMiscommunications: string[];
  strengths: string[];
}

export function analyzeMercuryAspects(
  p1Mercury: { sign: string; element: string; degree?: number },
  p2Mercury: { sign: string; element: string; degree?: number },
  p1Sun: { sign: string; element: string },
  p2Sun: { sign: string; element: string }
): MercuryAspectAnalysis {
  let mercuryCompatibility = 50;
  let communicationStyle = '';
  let intellectualSynergy = '';
  const potentialMiscommunications: string[] = [];
  const strengths: string[] = [];

  // Mercury-Mercury 호환성
  if (p1Mercury.sign === p2Mercury.sign) {
    mercuryCompatibility = 95;
    communicationStyle = '같은 방식으로 생각하고 소통합니다';
    strengths.push('말하지 않아도 통하는 이해');
  } else if (p1Mercury.element === p2Mercury.element) {
    mercuryCompatibility = 85;
    communicationStyle = '유사한 사고 패턴으로 쉽게 대화합니다';
    strengths.push('지적 공감대가 강함');
  } else if (isCompatibleElement(p1Mercury.element, p2Mercury.element)) {
    mercuryCompatibility = 75;
    communicationStyle = '서로를 보완하는 대화 스타일';
    strengths.push('다양한 관점에서 풍부한 대화');
  } else {
    mercuryCompatibility = 45;
    communicationStyle = '서로 다른 방식으로 정보를 처리합니다';
    potentialMiscommunications.push('말의 의도가 다르게 해석될 수 있음');
  }

  // Mercury-Sun 상호작용
  if (p1Mercury.element === p2Sun.element || p2Mercury.element === p1Sun.element) {
    mercuryCompatibility += 10;
    intellectualSynergy = '한 사람의 아이디어가 다른 사람의 정체성과 공명';
    strengths.push('상대의 생각을 자연스럽게 이해');
  } else {
    intellectualSynergy = '서로의 사고방식에 새로운 자극을 줌';
  }

  // 원소별 특성
  const elementPair = [p1Mercury.element, p2Mercury.element].sort().join('-');
  switch (elementPair) {
    case 'fire-fire':
      strengths.push('열정적이고 빠른 아이디어 교환');
      potentialMiscommunications.push('성급한 결론으로 오해 가능');
      break;
    case 'earth-earth':
      strengths.push('실용적이고 구체적인 대화');
      potentialMiscommunications.push('새로운 아이디어에 보수적');
      break;
    case 'air-air':
      strengths.push('끝없는 지적 토론 가능');
      potentialMiscommunications.push('감정적 소통이 부족할 수 있음');
      break;
    case 'water-water':
      strengths.push('직관적이고 감정적인 이해');
      potentialMiscommunications.push('논리적 설명이 부족할 수 있음');
      break;
    case 'fire-water':
    case 'water-fire':
      potentialMiscommunications.push('직접적 vs 간접적 소통 차이');
      break;
    case 'air-earth':
    case 'earth-air':
      potentialMiscommunications.push('이론적 vs 실용적 접근 차이');
      break;
  }

  return {
    mercuryCompatibility: Math.min(100, mercuryCompatibility),
    communicationStyle,
    intellectualSynergy,
    potentialMiscommunications,
    strengths,
  };
}

// ============================================================
// Jupiter Aspects (성장과 확장)
// ============================================================

export interface JupiterAspectAnalysis {
  expansionCompatibility: number;
  sharedBeliefs: string;
  growthAreas: string[];
  potentialConflicts: string[];
  blessingAreas: string[];
}

export function analyzeJupiterAspects(
  p1Jupiter: { sign: string; element: string },
  p2Jupiter: { sign: string; element: string },
  p1Sun: { sign: string; element: string },
  p2Sun: { sign: string; element: string }
): JupiterAspectAnalysis {
  let expansionCompatibility = 50;
  let sharedBeliefs = '';
  const growthAreas: string[] = [];
  const potentialConflicts: string[] = [];
  const blessingAreas: string[] = [];

  // Jupiter-Jupiter 호환성
  if (p1Jupiter.sign === p2Jupiter.sign) {
    expansionCompatibility = 95;
    sharedBeliefs = '같은 철학과 신념 체계를 공유';
    blessingAreas.push('함께하면 행운이 따름');
  } else if (p1Jupiter.element === p2Jupiter.element) {
    expansionCompatibility = 85;
    sharedBeliefs = '비슷한 가치관과 성장 방향';
    blessingAreas.push('서로의 꿈을 지원');
  } else if (isCompatibleElement(p1Jupiter.element, p2Jupiter.element)) {
    expansionCompatibility = 70;
    sharedBeliefs = '보완적인 세계관';
    growthAreas.push('서로에게 새로운 시야를 열어줌');
  } else {
    expansionCompatibility = 40;
    sharedBeliefs = '서로 다른 철학적 기반';
    potentialConflicts.push('인생 목표와 방향에 대한 의견 차이');
  }

  // Jupiter-Sun 상호작용
  if (p1Jupiter.element === p2Sun.element) {
    expansionCompatibility += 10;
    blessingAreas.push('Person1이 Person2의 성장을 축복');
    growthAreas.push('Person2가 Person1을 통해 확장');
  }
  if (p2Jupiter.element === p1Sun.element) {
    expansionCompatibility += 10;
    blessingAreas.push('Person2가 Person1의 성장을 축복');
    growthAreas.push('Person1이 Person2를 통해 확장');
  }

  // 원소별 성장 테마
  switch (p1Jupiter.element) {
    case 'fire':
      growthAreas.push('모험, 자신감, 영감을 통한 성장');
      break;
    case 'earth':
      growthAreas.push('물질적 안정, 실용적 지혜를 통한 성장');
      break;
    case 'air':
      growthAreas.push('지식, 소통, 사회적 연결을 통한 성장');
      break;
    case 'water':
      growthAreas.push('감정적 깊이, 직관, 영성을 통한 성장');
      break;
  }

  return {
    expansionCompatibility: Math.min(100, expansionCompatibility),
    sharedBeliefs,
    growthAreas,
    potentialConflicts,
    blessingAreas,
  };
}

// ============================================================
// Saturn Aspects (책임과 카르마)
// ============================================================

export interface SaturnAspectAnalysis {
  stabilityCompatibility: number;
  karmicLesson: string;
  structureInRelationship: string;
  challenges: string[];
  maturityAreas: string[];
  longTermPotential: number;
}

export function analyzeSaturnAspects(
  p1Saturn: { sign: string; element: string },
  p2Saturn: { sign: string; element: string },
  p1Sun: { sign: string; element: string },
  p2Sun: { sign: string; element: string },
  p1Moon: { sign: string; element: string },
  p2Moon: { sign: string; element: string }
): SaturnAspectAnalysis {
  let stabilityCompatibility = 50;
  let karmicLesson = '';
  let structureInRelationship = '';
  const challenges: string[] = [];
  const maturityAreas: string[] = [];
  let longTermPotential = 50;

  // Saturn-Saturn 호환성
  if (p1Saturn.element === p2Saturn.element) {
    stabilityCompatibility = 80;
    karmicLesson = '비슷한 인생 과제를 함께 극복';
    structureInRelationship = '관계에서 비슷한 책임감과 구조를 추구';
    longTermPotential = 85;
  } else if (isCompatibleElement(p1Saturn.element, p2Saturn.element)) {
    stabilityCompatibility = 65;
    karmicLesson = '서로의 약점을 보완하는 성장';
    structureInRelationship = '다른 방식이지만 조화로운 책임 분담';
    longTermPotential = 75;
  } else {
    stabilityCompatibility = 40;
    karmicLesson = '서로 다른 삶의 교훈을 배움';
    structureInRelationship = '책임과 의무에 대한 관점 차이';
    challenges.push('서로의 제한 방식에 대한 갈등 가능');
    longTermPotential = 55;
  }

  // Saturn-Sun 상호작용 (권위와 책임)
  if (p1Saturn.element === p2Sun.element) {
    challenges.push('Person1이 Person2에게 제한적으로 느껴질 수 있음');
    maturityAreas.push('Person2가 Person1을 통해 자기 훈련을 배움');
  }
  if (p2Saturn.element === p1Sun.element) {
    challenges.push('Person2가 Person1에게 제한적으로 느껴질 수 있음');
    maturityAreas.push('Person1이 Person2를 통해 자기 훈련을 배움');
  }

  // Saturn-Moon 상호작용 (감정적 안정)
  if (p1Saturn.element === p2Moon.element) {
    if (isCompatibleElement(p1Saturn.element, p2Moon.element)) {
      maturityAreas.push('Person1이 Person2에게 감정적 안정감을 제공');
      longTermPotential += 5;
    } else {
      challenges.push('Person1이 Person2의 감정을 억압할 수 있음');
    }
  }
  if (p2Saturn.element === p1Moon.element) {
    if (isCompatibleElement(p2Saturn.element, p1Moon.element)) {
      maturityAreas.push('Person2가 Person1에게 감정적 안정감을 제공');
      longTermPotential += 5;
    } else {
      challenges.push('Person2가 Person1의 감정을 억압할 수 있음');
    }
  }

  // 세대적 토성 테마
  maturityAreas.push('시간이 지날수록 관계가 성숙해짐');

  return {
    stabilityCompatibility,
    karmicLesson,
    structureInRelationship,
    challenges,
    maturityAreas,
    longTermPotential: Math.min(100, longTermPotential),
  };
}

// ============================================================
// Outer Planets Analysis (외행성 - 초월적 영향)
// ============================================================

export interface OuterPlanetAnalysis {
  uranusInfluence: {
    changeCompatibility: number;
    revolutionaryEnergy: string;
    unexpectedEvents: string[];
  };
  neptuneInfluence: {
    spiritualConnection: number;
    dreamyQualities: string;
    illusionWarnings: string[];
  };
  plutoInfluence: {
    transformationPotential: number;
    powerDynamics: string;
    deepHealingAreas: string[];
  };
  generationalThemes: string[];
  overallTranscendentScore: number;
}

export function analyzeOuterPlanets(
  p1Outer: { uranus?: { sign: string; element: string }; neptune?: { sign: string; element: string }; pluto?: { sign: string; element: string } },
  p2Outer: { uranus?: { sign: string; element: string }; neptune?: { sign: string; element: string }; pluto?: { sign: string; element: string } },
  p1Sun: { sign: string; element: string },
  p2Sun: { sign: string; element: string }
): OuterPlanetAnalysis {
  const generationalThemes: string[] = [];
  let totalScore = 0;
  let scoreCount = 0;

  // Uranus 분석 (변화, 혁신, 자유)
  let changeCompatibility = 50;
  let revolutionaryEnergy = '각자의 방식으로 변화를 추구';
  const unexpectedEvents: string[] = [];

  if (p1Outer.uranus && p2Outer.uranus) {
    if (p1Outer.uranus.sign === p2Outer.uranus.sign) {
      changeCompatibility = 90;
      revolutionaryEnergy = '같은 세대적 변화 에너지를 공유';
      generationalThemes.push('비슷한 시대적 혁명 경험');
    } else if (p1Outer.uranus.element === p2Outer.uranus.element) {
      changeCompatibility = 75;
      revolutionaryEnergy = '비슷한 방식으로 자유를 추구';
    }

    // Uranus-Sun 상호작용
    if (p1Outer.uranus.element === p2Sun.element || p2Outer.uranus.element === p1Sun.element) {
      unexpectedEvents.push('관계에서 예상치 못한 자극과 변화');
      changeCompatibility += 5;
    }
  }
  totalScore += changeCompatibility;
  scoreCount++;

  // Neptune 분석 (영성, 환상, 직관)
  let spiritualConnection = 50;
  let dreamyQualities = '각자의 영적 세계를 가짐';
  const illusionWarnings: string[] = [];

  if (p1Outer.neptune && p2Outer.neptune) {
    if (p1Outer.neptune.sign === p2Outer.neptune.sign) {
      spiritualConnection = 90;
      dreamyQualities = '같은 세대적 영적 갈망을 공유';
      generationalThemes.push('비슷한 이상과 꿈');
    } else if (p1Outer.neptune.element === p2Outer.neptune.element) {
      spiritualConnection = 75;
      dreamyQualities = '영적 연결이 자연스러움';
    }

    // Neptune-Sun 상호작용
    if (p1Outer.neptune.element === p2Sun.element || p2Outer.neptune.element === p1Sun.element) {
      illusionWarnings.push('상대방을 이상화할 가능성');
      spiritualConnection += 10;
    }
  }
  totalScore += spiritualConnection;
  scoreCount++;

  // Pluto 분석 (변환, 권력, 재생)
  let transformationPotential = 50;
  let powerDynamics = '권력의 균형을 찾아가는 관계';
  const deepHealingAreas: string[] = [];

  if (p1Outer.pluto && p2Outer.pluto) {
    if (p1Outer.pluto.sign === p2Outer.pluto.sign) {
      transformationPotential = 90;
      powerDynamics = '같은 세대적 변환 에너지';
      generationalThemes.push('비슷한 심층적 변화 경험');
      deepHealingAreas.push('함께 깊은 치유와 변환 가능');
    } else if (p1Outer.pluto.element === p2Outer.pluto.element) {
      transformationPotential = 75;
      powerDynamics = '비슷한 방식으로 권력을 이해';
      deepHealingAreas.push('서로의 그림자를 치유');
    }

    // Pluto-Sun 상호작용
    if (p1Outer.pluto.element === p2Sun.element) {
      deepHealingAreas.push('Person1이 Person2를 근본적으로 변환');
      transformationPotential += 10;
    }
    if (p2Outer.pluto.element === p1Sun.element) {
      deepHealingAreas.push('Person2가 Person1을 근본적으로 변환');
      transformationPotential += 10;
    }
  }
  totalScore += transformationPotential;
  scoreCount++;

  const overallTranscendentScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 50;

  return {
    uranusInfluence: {
      changeCompatibility: Math.min(100, changeCompatibility),
      revolutionaryEnergy,
      unexpectedEvents,
    },
    neptuneInfluence: {
      spiritualConnection: Math.min(100, spiritualConnection),
      dreamyQualities,
      illusionWarnings,
    },
    plutoInfluence: {
      transformationPotential: Math.min(100, transformationPotential),
      powerDynamics,
      deepHealingAreas,
    },
    generationalThemes,
    overallTranscendentScore,
  };
}

// ============================================================
// North/South Node Analysis (카르마적 운명)
// ============================================================

export interface NodeAnalysis {
  northNodeConnection: {
    compatibility: number;
    destinyAlignment: string;
    growthDirection: string;
  };
  southNodeConnection: {
    compatibility: number;
    pastLifeIndicators: string;
    comfortZone: string;
  };
  karmicRelationshipType: 'soulmate' | 'karmic' | 'dharmic' | 'neutral';
  lifeLessons: string[];
  evolutionaryPurpose: string;
}

export function analyzeNodes(
  p1NorthNode: { sign: string; element: string } | undefined,
  p1SouthNode: { sign: string; element: string } | undefined,
  p2NorthNode: { sign: string; element: string } | undefined,
  p2SouthNode: { sign: string; element: string } | undefined,
  p1Sun: { sign: string; element: string },
  p2Sun: { sign: string; element: string },
  p1Moon: { sign: string; element: string },
  p2Moon: { sign: string; element: string }
): NodeAnalysis {
  let northNodeCompatibility = 50;
  let southNodeCompatibility = 50;
  let destinyAlignment = '';
  let growthDirection = '';
  let pastLifeIndicators = '';
  let comfortZone = '';
  let karmicRelationshipType: NodeAnalysis['karmicRelationshipType'] = 'neutral';
  const lifeLessons: string[] = [];
  let evolutionaryPurpose = '';

  // North Node 연결 분석
  if (p1NorthNode && p2NorthNode) {
    if (p1NorthNode.sign === p2NorthNode.sign) {
      northNodeCompatibility = 95;
      destinyAlignment = '같은 영혼적 목적지를 향해 진화';
      karmicRelationshipType = 'soulmate';
      lifeLessons.push('함께 영혼의 진화를 경험');
    } else if (p1NorthNode.element === p2NorthNode.element) {
      northNodeCompatibility = 80;
      destinyAlignment = '비슷한 삶의 방향성을 추구';
      karmicRelationshipType = 'dharmic';
    }

    // Person1의 North Node와 Person2의 Sun/Moon
    if (p1NorthNode.element === p2Sun.element) {
      northNodeCompatibility += 15;
      growthDirection = 'Person2가 Person1의 영혼적 성장을 촉진';
      karmicRelationshipType = 'soulmate';
      lifeLessons.push('Person2가 Person1에게 운명적 역할');
    }
    if (p1NorthNode.element === p2Moon.element) {
      northNodeCompatibility += 10;
      lifeLessons.push('Person2가 Person1에게 감정적 성장의 기회');
    }

    // Person2의 North Node와 Person1의 Sun/Moon
    if (p2NorthNode.element === p1Sun.element) {
      northNodeCompatibility += 15;
      if (!growthDirection) growthDirection = 'Person1이 Person2의 영혼적 성장을 촉진';
      karmicRelationshipType = 'soulmate';
      lifeLessons.push('Person1이 Person2에게 운명적 역할');
    }
    if (p2NorthNode.element === p1Moon.element) {
      northNodeCompatibility += 10;
      lifeLessons.push('Person1이 Person2에게 감정적 성장의 기회');
    }
  }

  // South Node 연결 분석 (전생의 연결)
  if (p1SouthNode && p2SouthNode) {
    if (p1SouthNode.sign === p2SouthNode.sign) {
      southNodeCompatibility = 95;
      pastLifeIndicators = '같은 과거생 패턴을 공유';
      comfortZone = '함께 있으면 익숙하고 편안함';
      if (karmicRelationshipType === 'neutral') karmicRelationshipType = 'karmic';
    } else if (p1SouthNode.element === p2SouthNode.element) {
      southNodeCompatibility = 80;
      pastLifeIndicators = '비슷한 과거 경험의 에너지';
      comfortZone = '자연스럽게 서로를 이해';
    }

    // Person1의 South Node와 Person2의 Sun/Moon
    if (p1SouthNode?.element === p2Sun.element) {
      southNodeCompatibility += 15;
      pastLifeIndicators = '전생에서의 깊은 연결 가능성';
      if (karmicRelationshipType === 'neutral') karmicRelationshipType = 'karmic';
      lifeLessons.push('과거의 패턴을 인식하고 넘어서야 함');
    }

    // Person2의 South Node와 Person1의 Sun/Moon
    if (p2SouthNode?.element === p1Sun.element) {
      southNodeCompatibility += 15;
      if (!pastLifeIndicators) pastLifeIndicators = '전생에서의 깊은 연결 가능성';
      if (karmicRelationshipType === 'neutral') karmicRelationshipType = 'karmic';
      lifeLessons.push('익숙함에 안주하지 않고 성장해야 함');
    }
  }

  // 진화적 목적 결정
  if (karmicRelationshipType === 'soulmate') {
    evolutionaryPurpose = '서로의 영혼 진화를 돕는 운명적 만남';
  } else if (karmicRelationshipType === 'karmic') {
    evolutionaryPurpose = '과거의 카르마를 정산하고 배움을 얻는 관계';
  } else if (karmicRelationshipType === 'dharmic') {
    evolutionaryPurpose = '함께 삶의 사명을 수행하는 파트너십';
  } else {
    evolutionaryPurpose = '서로에게 새로운 경험을 제공하는 관계';
  }

  return {
    northNodeConnection: {
      compatibility: Math.min(100, northNodeCompatibility),
      destinyAlignment,
      growthDirection,
    },
    southNodeConnection: {
      compatibility: Math.min(100, southNodeCompatibility),
      pastLifeIndicators,
      comfortZone,
    },
    karmicRelationshipType,
    lifeLessons,
    evolutionaryPurpose,
  };
}

// ============================================================
// Lilith (Black Moon) Analysis (그림자와 욕망)
// ============================================================

export interface LilithAnalysis {
  lilithCompatibility: number;
  shadowDynamics: string;
  repressedDesires: string[];
  magneticAttraction: number;
  potentialChallenges: string[];
  healingOpportunities: string[];
}

export function analyzeLilith(
  p1Lilith: { sign: string; element: string } | undefined,
  p2Lilith: { sign: string; element: string } | undefined,
  p1Sun: { sign: string; element: string },
  p2Sun: { sign: string; element: string },
  p1Mars: { sign: string; element: string },
  p2Mars: { sign: string; element: string },
  p1Venus: { sign: string; element: string },
  p2Venus: { sign: string; element: string }
): LilithAnalysis {
  let lilithCompatibility = 50;
  let shadowDynamics = '';
  const repressedDesires: string[] = [];
  let magneticAttraction = 50;
  const potentialChallenges: string[] = [];
  const healingOpportunities: string[] = [];

  if (!p1Lilith || !p2Lilith) {
    return {
      lilithCompatibility: 50,
      shadowDynamics: 'Lilith 데이터가 불완전하여 분석 제한적',
      repressedDesires: [],
      magneticAttraction: 50,
      potentialChallenges: [],
      healingOpportunities: [],
    };
  }

  // Lilith-Lilith 연결
  if (p1Lilith.sign === p2Lilith.sign) {
    lilithCompatibility = 90;
    shadowDynamics = '같은 그림자 영역을 공유하며 서로를 깊이 이해';
    magneticAttraction = 95;
    healingOpportunities.push('함께 그림자를 직면하고 치유');
  } else if (p1Lilith.element === p2Lilith.element) {
    lilithCompatibility = 75;
    shadowDynamics = '비슷한 방식으로 억압된 면을 표현';
    magneticAttraction = 80;
    healingOpportunities.push('서로의 숨겨진 면을 수용');
  } else if (isIncompatibleElement(p1Lilith.element, p2Lilith.element)) {
    lilithCompatibility = 40;
    shadowDynamics = '서로 다른 그림자 영역이 충돌할 수 있음';
    magneticAttraction = 60;
    potentialChallenges.push('억압된 욕구가 갈등으로 표면화');
  }

  // Lilith-Mars 연결 (성적 자기력)
  if (p1Lilith.element === p2Mars.element) {
    magneticAttraction += 20;
    repressedDesires.push('Person1의 숨겨진 욕망이 Person2의 행동으로 자극됨');
  }
  if (p2Lilith.element === p1Mars.element) {
    magneticAttraction += 20;
    repressedDesires.push('Person2의 숨겨진 욕망이 Person1의 행동으로 자극됨');
  }

  // Lilith-Venus 연결 (매혹적 끌림)
  if (p1Lilith.element === p2Venus.element) {
    magneticAttraction += 15;
    repressedDesires.push('Person1이 Person2의 매력에 깊이 이끌림');
    healingOpportunities.push('Person2가 Person1의 자기 수용을 도움');
  }
  if (p2Lilith.element === p1Venus.element) {
    magneticAttraction += 15;
    repressedDesires.push('Person2가 Person1의 매력에 깊이 이끌림');
    healingOpportunities.push('Person1이 Person2의 자기 수용을 도움');
  }

  // Lilith-Sun 연결 (정체성과 그림자)
  if (p1Lilith.element === p2Sun.element) {
    potentialChallenges.push('Person1의 그림자가 Person2의 정체성에 도전');
    healingOpportunities.push('Person2를 통해 Person1이 억압된 면을 통합');
  }
  if (p2Lilith.element === p1Sun.element) {
    potentialChallenges.push('Person2의 그림자가 Person1의 정체성에 도전');
    healingOpportunities.push('Person1을 통해 Person2가 억압된 면을 통합');
  }

  // 원소별 Lilith 테마
  switch (p1Lilith.element) {
    case 'fire':
      repressedDesires.push('Person1: 자신감과 주도권에 대한 억압된 욕구');
      break;
    case 'earth':
      repressedDesires.push('Person1: 물질적 안정과 감각적 쾌락에 대한 억압된 욕구');
      break;
    case 'air':
      repressedDesires.push('Person1: 지적 자유와 소통에 대한 억압된 욕구');
      break;
    case 'water':
      repressedDesires.push('Person1: 감정적 깊이와 친밀감에 대한 억압된 욕구');
      break;
  }

  return {
    lilithCompatibility,
    shadowDynamics,
    repressedDesires,
    magneticAttraction: Math.min(100, magneticAttraction),
    potentialChallenges,
    healingOpportunities,
  };
}

// ============================================================
// Davison Chart Analysis (관계의 출생 차트)
// ============================================================

export interface DavisonChartAnalysis {
  relationshipSun: { sign: string; element: string };
  relationshipMoon: { sign: string; element: string };
  relationshipAscendant: { sign: string; element: string };
  relationshipIdentity: string;
  emotionalFoundation: string;
  publicImage: string;
  coreStrengths: string[];
  growthChallenges: string[];
  relationshipPurpose: string;
}

// Davison Chart는 두 사람의 출생 차트의 시공간 중간점
export function analyzeDavisonChart(
  p1: AstrologyProfile,
  p2: AstrologyProfile
): DavisonChartAnalysis {
  // 간이 계산: 두 사인의 중간 원소와 modality를 사용
  const sunMidpoint = calculateMidpointSign(p1.sun.sign, p2.sun.sign);
  const moonMidpoint = calculateMidpointSign(p1.moon.sign, p2.moon.sign);
  const ascMidpoint = calculateMidpointSign(
    p1.ascendant?.sign ?? p1.sun.sign,
    p2.ascendant?.sign ?? p2.sun.sign
  );

  let relationshipIdentity = '';
  let emotionalFoundation = '';
  let publicImage = '';
  const coreStrengths: string[] = [];
  const growthChallenges: string[] = [];
  let relationshipPurpose = '';

  // Sun Midpoint - 관계의 정체성
  switch (sunMidpoint.element) {
    case 'fire':
      relationshipIdentity = '열정적이고 창조적인 관계';
      coreStrengths.push('함께 새로운 것을 시작하는 에너지');
      break;
    case 'earth':
      relationshipIdentity = '안정적이고 실용적인 관계';
      coreStrengths.push('신뢰할 수 있는 든든한 파트너십');
      break;
    case 'air':
      relationshipIdentity = '지적이고 소통이 활발한 관계';
      coreStrengths.push('끊임없는 대화와 아이디어 교환');
      break;
    case 'water':
      relationshipIdentity = '깊고 감정적인 유대의 관계';
      coreStrengths.push('직관적인 상호 이해');
      break;
  }

  // Moon Midpoint - 감정적 기반
  switch (moonMidpoint.element) {
    case 'fire':
      emotionalFoundation = '열정적인 감정 표현';
      growthChallenges.push('감정적 안정감 발전 필요');
      break;
    case 'earth':
      emotionalFoundation = '안정적이고 실용적인 감정 교류';
      coreStrengths.push('감정적 신뢰와 안정');
      break;
    case 'air':
      emotionalFoundation = '대화를 통한 감정 소통';
      growthChallenges.push('더 깊은 감정적 친밀감 개발');
      break;
    case 'water':
      emotionalFoundation = '깊은 감정적 공감과 직관';
      coreStrengths.push('비언어적 감정 이해');
      break;
  }

  // Ascendant Midpoint - 관계의 외부 이미지
  switch (ascMidpoint.element) {
    case 'fire':
      publicImage = '활기차고 눈에 띄는 커플';
      break;
    case 'earth':
      publicImage = '안정적이고 신뢰감 있는 커플';
      break;
    case 'air':
      publicImage = '사교적이고 지적인 커플';
      break;
    case 'water':
      publicImage = '친밀하고 서로에게 헌신적인 커플';
      break;
  }

  // 관계 목적 결정
  const elements = [sunMidpoint.element, moonMidpoint.element, ascMidpoint.element];
  const elementCount: Record<string, number> = {};
  for (const el of elements) {
    elementCount[el] = (elementCount[el] || 0) + 1;
  }
  const dominantElement = Object.entries(elementCount).sort((a, b) => b[1] - a[1])[0][0];

  switch (dominantElement) {
    case 'fire':
      relationshipPurpose = '서로에게 영감을 주고 함께 모험하는 것';
      break;
    case 'earth':
      relationshipPurpose = '안정적인 기반을 만들고 함께 목표를 달성하는 것';
      break;
    case 'air':
      relationshipPurpose = '지적 성장과 사회적 연결을 함께 추구하는 것';
      break;
    case 'water':
      relationshipPurpose = '감정적 치유와 영적 성장을 함께 경험하는 것';
      break;
  }

  return {
    relationshipSun: sunMidpoint,
    relationshipMoon: moonMidpoint,
    relationshipAscendant: ascMidpoint,
    relationshipIdentity,
    emotionalFoundation,
    publicImage,
    coreStrengths,
    growthChallenges,
    relationshipPurpose,
  };
}

function calculateMidpointSign(sign1: string, sign2: string): { sign: string; element: string } {
  const signOrder = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const elements = ['fire', 'earth', 'air', 'water'];

  const idx1 = signOrder.indexOf(sign1);
  const idx2 = signOrder.indexOf(sign2);

  if (idx1 === -1 || idx2 === -1) {
    return { sign: sign1, element: getElement(sign1) };
  }

  // 중간점 계산
  let midIdx = Math.floor((idx1 + idx2) / 2);
  // 만약 차이가 6 이상이면 반대쪽 중간점 선택
  if (Math.abs(idx1 - idx2) > 6) {
    midIdx = (midIdx + 6) % 12;
  }

  const midSign = signOrder[midIdx];
  return { sign: midSign, element: getElement(midSign) };
}

function getElement(sign: string): string {
  const fireSign = ['Aries', 'Leo', 'Sagittarius'];
  const earthSign = ['Taurus', 'Virgo', 'Capricorn'];
  const airSign = ['Gemini', 'Libra', 'Aquarius'];
  const waterSign = ['Cancer', 'Scorpio', 'Pisces'];

  if (fireSign.includes(sign)) return 'fire';
  if (earthSign.includes(sign)) return 'earth';
  if (airSign.includes(sign)) return 'air';
  if (waterSign.includes(sign)) return 'water';
  return 'fire'; // default
}

// ============================================================
// Progressed Chart Analysis (진행 차트)
// ============================================================

export interface ProgressedChartAnalysis {
  progressedSunPhase: string;
  progressedMoonPhase: string;
  currentRelationshipTheme: string;
  timedInfluences: string[];
  upcomingTrends: string[];
  synchronicityIndicators: string[];
}

// Secondary Progression 기반 분석
export function analyzeProgressedChart(
  p1: AstrologyProfile,
  p2: AstrologyProfile,
  yearsInRelationship: number = 0
): ProgressedChartAnalysis {
  // Progressed Sun은 1년에 약 1도 이동 (30년에 1사인)
  // Progressed Moon은 약 2.5년에 1사인

  const signOrder = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

  // Person1의 Progressed Sun 계산 (간이)
  const p1SunIdx = signOrder.indexOf(p1.sun.sign);
  const p1ProgressedSunIdx = (p1SunIdx + Math.floor(yearsInRelationship / 30)) % 12;
  const p1ProgressedSun = signOrder[p1ProgressedSunIdx];

  // Person2의 Progressed Sun 계산
  const p2SunIdx = signOrder.indexOf(p2.sun.sign);
  const p2ProgressedSunIdx = (p2SunIdx + Math.floor(yearsInRelationship / 30)) % 12;
  const p2ProgressedSun = signOrder[p2ProgressedSunIdx];

  // Progressed Moon Phase 계산 (간이)
  const p1MoonIdx = signOrder.indexOf(p1.moon.sign);
  const p1ProgressedMoonIdx = (p1MoonIdx + Math.floor(yearsInRelationship / 2.5)) % 12;
  const p1ProgressedMoon = signOrder[p1ProgressedMoonIdx];

  const p2MoonIdx = signOrder.indexOf(p2.moon.sign);
  const p2ProgressedMoonIdx = (p2MoonIdx + Math.floor(yearsInRelationship / 2.5)) % 12;
  const p2ProgressedMoon = signOrder[p2ProgressedMoonIdx];

  let progressedSunPhase = '';
  let progressedMoonPhase = '';
  let currentRelationshipTheme = '';
  const timedInfluences: string[] = [];
  const upcomingTrends: string[] = [];
  const synchronicityIndicators: string[] = [];

  // Sun Phase 해석
  if (getElement(p1ProgressedSun) === getElement(p2ProgressedSun)) {
    progressedSunPhase = '두 사람의 진행 태양이 같은 원소에서 조화';
    timedInfluences.push('현재 시기에 의식적 목표가 일치');
  } else if (isCompatibleElement(getElement(p1ProgressedSun), getElement(p2ProgressedSun))) {
    progressedSunPhase = '진행 태양이 호환되는 에너지로 이동';
    timedInfluences.push('서로의 성장을 지원하는 시기');
  } else {
    progressedSunPhase = '진행 태양이 다른 방향으로 이동 중';
    timedInfluences.push('각자의 개인적 성장에 집중하는 시기');
  }

  // Moon Phase 해석
  if (getElement(p1ProgressedMoon) === getElement(p2ProgressedMoon)) {
    progressedMoonPhase = '감정적 사이클이 동기화됨';
    timedInfluences.push('감정적으로 같은 페이지에 있음');
  } else {
    progressedMoonPhase = '각자의 감정적 사이클을 경험 중';
    timedInfluences.push('서로의 감정 상태에 대한 이해가 필요');
  }

  // 현재 관계 테마
  const combinedElement = [
    getElement(p1ProgressedSun),
    getElement(p2ProgressedSun),
    getElement(p1ProgressedMoon),
    getElement(p2ProgressedMoon),
  ];
  const elementCounts: Record<string, number> = {};
  for (const el of combinedElement) {
    elementCounts[el] = (elementCounts[el] || 0) + 1;
  }
  const dominantEl = Object.entries(elementCounts).sort((a, b) => b[1] - a[1])[0][0];

  switch (dominantEl) {
    case 'fire':
      currentRelationshipTheme = '열정과 새로운 시작의 시기';
      upcomingTrends.push('함께 새로운 프로젝트나 모험 가능');
      break;
    case 'earth':
      currentRelationshipTheme = '안정화와 구체화의 시기';
      upcomingTrends.push('장기적 계획과 물질적 안정 추구');
      break;
    case 'air':
      currentRelationshipTheme = '소통과 사회적 확장의 시기';
      upcomingTrends.push('새로운 아이디어와 사람들을 만날 기회');
      break;
    case 'water':
      currentRelationshipTheme = '감정적 심화와 직관의 시기';
      upcomingTrends.push('깊은 감정적 연결과 치유의 기회');
      break;
  }

  // 동시성 지표
  if (yearsInRelationship > 0) {
    const samePhase = Math.abs(p1ProgressedMoonIdx - p2ProgressedMoonIdx) <= 1;
    if (samePhase) {
      synchronicityIndicators.push('Progressed Moon이 동기화되어 감정적 공명');
    }

    const sunConjunct = Math.abs(p1ProgressedSunIdx - p2ProgressedSunIdx) <= 1;
    if (sunConjunct) {
      synchronicityIndicators.push('Progressed Sun이 가까워 운명적 동행');
    }
  } else {
    synchronicityIndicators.push('관계 시작 시점에서의 에너지 분석');
  }

  return {
    progressedSunPhase,
    progressedMoonPhase,
    currentRelationshipTheme,
    timedInfluences,
    upcomingTrends,
    synchronicityIndicators,
  };
}

// ============================================================
// Extended Astrology Profile (확장 프로필)
// ============================================================

export interface ExtendedAstrologyProfile extends AstrologyProfile {
  mercury?: { sign: string; element: string; degree?: number };
  jupiter?: { sign: string; element: string };
  saturn?: { sign: string; element: string };
  uranus?: { sign: string; element: string };
  neptune?: { sign: string; element: string };
  pluto?: { sign: string; element: string };
  northNode?: { sign: string; element: string };
  southNode?: { sign: string; element: string };
  lilith?: { sign: string; element: string };
}

// ============================================================
// Extended Comprehensive Astrology Compatibility
// ============================================================

export interface ExtendedAstrologyCompatibility extends ComprehensiveAstrologyCompatibility {
  degreeBasedAspects?: DegreeAspectAnalysis;
  mercuryAnalysis?: MercuryAspectAnalysis;
  jupiterAnalysis?: JupiterAspectAnalysis;
  saturnAnalysis?: SaturnAspectAnalysis;
  outerPlanetsAnalysis?: OuterPlanetAnalysis;
  nodeAnalysis?: NodeAnalysis;
  lilithAnalysis?: LilithAnalysis;
  davisonChart?: DavisonChartAnalysis;
  progressedChart?: ProgressedChartAnalysis;
  extendedScore: number;
  extendedGrade: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  extendedSummary: string;
  extendedInsights: string[];
}

export function performExtendedAstrologyAnalysis(
  p1: ExtendedAstrologyProfile,
  p2: ExtendedAstrologyProfile,
  yearsInRelationship: number = 0
): ExtendedAstrologyCompatibility {
  // 기본 분석
  const baseAnalysis = performComprehensiveAstrologyAnalysis(p1, p2);

  // 확장 분석
  let degreeBasedAspects: DegreeAspectAnalysis | undefined;
  let mercuryAnalysis: MercuryAspectAnalysis | undefined;
  let jupiterAnalysis: JupiterAspectAnalysis | undefined;
  let saturnAnalysis: SaturnAspectAnalysis | undefined;
  let outerPlanetsAnalysis: OuterPlanetAnalysis | undefined;
  let nodeAnalysis: NodeAnalysis | undefined;
  let lilithAnalysis: LilithAnalysis | undefined;
  let davisonChart: DavisonChartAnalysis | undefined;
  let progressedChart: ProgressedChartAnalysis | undefined;

  const scores: number[] = [baseAnalysis.overallScore];
  const extendedInsights: string[] = [...baseAnalysis.detailedInsights];

  // Degree-based Aspects
  const p1Planets: { name: string; sign: string; degree?: number }[] = [
    { name: 'Sun', sign: p1.sun.sign },
    { name: 'Moon', sign: p1.moon.sign },
    { name: 'Venus', sign: p1.venus.sign },
    { name: 'Mars', sign: p1.mars.sign },
  ];
  const p2Planets: { name: string; sign: string; degree?: number }[] = [
    { name: 'Sun', sign: p2.sun.sign },
    { name: 'Moon', sign: p2.moon.sign },
    { name: 'Venus', sign: p2.venus.sign },
    { name: 'Mars', sign: p2.mars.sign },
  ];

  if (p1.mercury) p1Planets.push({ name: 'Mercury', sign: p1.mercury.sign, degree: p1.mercury.degree });
  if (p2.mercury) p2Planets.push({ name: 'Mercury', sign: p2.mercury.sign, degree: p2.mercury.degree });

  degreeBasedAspects = analyzeDegreeBasedAspects(p1Planets, p2Planets);
  scores.push(degreeBasedAspects.overallBalance);

  if (degreeBasedAspects.tightestAspect) {
    extendedInsights.push(`가장 강한 Aspect: ${degreeBasedAspects.tightestAspect.planet1}-${degreeBasedAspects.tightestAspect.planet2} ${degreeBasedAspects.tightestAspect.aspectType}`);
  }

  // Mercury Analysis
  if (p1.mercury && p2.mercury) {
    mercuryAnalysis = analyzeMercuryAspects(p1.mercury, p2.mercury, p1.sun, p2.sun);
    scores.push(mercuryAnalysis.mercuryCompatibility);
    extendedInsights.push(`소통 스타일: ${mercuryAnalysis.communicationStyle}`);
  }

  // Jupiter Analysis
  if (p1.jupiter && p2.jupiter) {
    jupiterAnalysis = analyzeJupiterAspects(p1.jupiter, p2.jupiter, p1.sun, p2.sun);
    scores.push(jupiterAnalysis.expansionCompatibility);
    extendedInsights.push(`공유 신념: ${jupiterAnalysis.sharedBeliefs}`);
  }

  // Saturn Analysis
  if (p1.saturn && p2.saturn) {
    saturnAnalysis = analyzeSaturnAspects(p1.saturn, p2.saturn, p1.sun, p2.sun, p1.moon, p2.moon);
    scores.push(saturnAnalysis.longTermPotential);
    extendedInsights.push(`카르마 교훈: ${saturnAnalysis.karmicLesson}`);
  }

  // Outer Planets Analysis
  outerPlanetsAnalysis = analyzeOuterPlanets(
    { uranus: p1.uranus, neptune: p1.neptune, pluto: p1.pluto },
    { uranus: p2.uranus, neptune: p2.neptune, pluto: p2.pluto },
    p1.sun, p2.sun
  );
  scores.push(outerPlanetsAnalysis.overallTranscendentScore);

  if (outerPlanetsAnalysis.generationalThemes.length > 0) {
    extendedInsights.push(`세대적 테마: ${outerPlanetsAnalysis.generationalThemes[0]}`);
  }

  // Node Analysis
  nodeAnalysis = analyzeNodes(
    p1.northNode, p1.southNode,
    p2.northNode, p2.southNode,
    p1.sun, p2.sun, p1.moon, p2.moon
  );
  scores.push(nodeAnalysis.northNodeConnection.compatibility);
  extendedInsights.push(`카르마 관계 유형: ${nodeAnalysis.karmicRelationshipType}`);
  extendedInsights.push(`진화적 목적: ${nodeAnalysis.evolutionaryPurpose}`);

  // Lilith Analysis
  lilithAnalysis = analyzeLilith(p1.lilith, p2.lilith, p1.sun, p2.sun, p1.mars, p2.mars, p1.venus, p2.venus);
  scores.push(lilithAnalysis.magneticAttraction);

  if (lilithAnalysis.shadowDynamics) {
    extendedInsights.push(`그림자 역학: ${lilithAnalysis.shadowDynamics}`);
  }

  // Davison Chart
  davisonChart = analyzeDavisonChart(p1, p2);
  extendedInsights.push(`관계 정체성: ${davisonChart.relationshipIdentity}`);
  extendedInsights.push(`관계 목적: ${davisonChart.relationshipPurpose}`);

  // Progressed Chart
  progressedChart = analyzeProgressedChart(p1, p2, yearsInRelationship);
  extendedInsights.push(`현재 관계 테마: ${progressedChart.currentRelationshipTheme}`);

  // 종합 확장 점수
  const extendedScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

  let extendedGrade: ExtendedAstrologyCompatibility['extendedGrade'];
  if (extendedScore >= 95) extendedGrade = 'S+';
  else if (extendedScore >= 85) extendedGrade = 'S';
  else if (extendedScore >= 75) extendedGrade = 'A';
  else if (extendedScore >= 65) extendedGrade = 'B';
  else if (extendedScore >= 50) extendedGrade = 'C';
  else if (extendedScore >= 35) extendedGrade = 'D';
  else extendedGrade = 'F';

  // 확장 요약
  let extendedSummary = baseAnalysis.summary;
  if (nodeAnalysis.karmicRelationshipType === 'soulmate') {
    extendedSummary += ' 노드 분석에서 소울메이트 연결이 발견되었습니다.';
  } else if (nodeAnalysis.karmicRelationshipType === 'karmic') {
    extendedSummary += ' 전생의 인연이 있을 가능성이 높습니다.';
  }

  if (lilithAnalysis.magneticAttraction >= 80) {
    extendedSummary += ' 강한 자기적 끌림이 존재합니다.';
  }

  if (saturnAnalysis && saturnAnalysis.longTermPotential >= 80) {
    extendedSummary += ' 장기적 안정성이 높은 관계입니다.';
  }

  return {
    ...baseAnalysis,
    degreeBasedAspects,
    mercuryAnalysis,
    jupiterAnalysis,
    saturnAnalysis,
    outerPlanetsAnalysis,
    nodeAnalysis,
    lilithAnalysis,
    davisonChart,
    progressedChart,
    extendedScore,
    extendedGrade,
    extendedSummary,
    extendedInsights,
  };
}
