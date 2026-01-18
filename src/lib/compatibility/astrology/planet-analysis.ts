/**
 * @file Planetary Analysis - Mercury, Jupiter, Saturn
 * 행성별 분석: 수성, 목성, 토성
 */

import { isCompatibleElement, isIncompatibleElement } from './element-utils';

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
