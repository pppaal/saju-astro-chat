/**
 * @file Davison Chart and Progressed Chart Analysis
 * 데이비슨 차트(관계 출생 차트)와 프로그레스 차트 분석
 */

import type { AstrologyProfile } from '../cosmicCompatibility';
import { isCompatibleElement } from './element-utils';

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

export function analyzeDavisonChart(
  p1: AstrologyProfile,
  p2: AstrologyProfile
): DavisonChartAnalysis {
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

  const idx1 = signOrder.indexOf(sign1);
  const idx2 = signOrder.indexOf(sign2);

  if (idx1 === -1 || idx2 === -1) {
    return { sign: sign1, element: getElement(sign1) };
  }

  let midIdx = Math.floor((idx1 + idx2) / 2);
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

  if (fireSign.includes(sign)) {return 'fire';}
  if (earthSign.includes(sign)) {return 'earth';}
  if (airSign.includes(sign)) {return 'air';}
  if (waterSign.includes(sign)) {return 'water';}
  return 'fire';
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

export function analyzeProgressedChart(
  p1: AstrologyProfile,
  p2: AstrologyProfile,
  yearsInRelationship: number = 0
): ProgressedChartAnalysis {
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
