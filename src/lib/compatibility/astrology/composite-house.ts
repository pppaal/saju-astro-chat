/**
 * @file Composite Chart and House Overlay Analysis
 * 합성 차트 및 하우스 분석
 */

import type { AstrologyProfile } from '../cosmicCompatibility';

export interface CompositeChartAnalysis {
  relationshipPurpose: string;
  coreTheme: string;
  strengths: string[];
  growthAreas: string[];
  longevityPotential: number;
}

export interface HouseOverlayAnalysis {
  description: string;
  areas: {
    area: string;
    impact: 'very_positive' | 'positive' | 'neutral' | 'challenging';
    description: string;
  }[];
}

/**
 * Analyze composite chart (relationship midpoint)
 */
export function analyzeCompositeChart(
  p1: AstrologyProfile,
  p2: AstrologyProfile
): CompositeChartAnalysis {
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

/**
 * Analyze house overlays
 */
export function analyzeHouseOverlays(
  p1: AstrologyProfile,
  p2: AstrologyProfile
): HouseOverlayAnalysis {
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
