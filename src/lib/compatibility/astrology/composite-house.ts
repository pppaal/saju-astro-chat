/**
 * @file Composite Chart and House Overlay Analysis
 * 합성 차트 및 하우스 분석
 */

import type { AstrologyProfile } from '../cosmicCompatibility';
import { isCompatibleElement, isIncompatibleElement } from './element-utils';

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

// ============================================================
// Sign-based aspect helpers (no degree data required)
// ============================================================

const SIGN_ORDER = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;

function signIndex(sign: string): number {
  return SIGN_ORDER.indexOf(sign as (typeof SIGN_ORDER)[number]);
}

/** Returns minimum step distance between signs in [0..6]. */
function signDistance(s1: string, s2: string): number {
  const i1 = signIndex(s1);
  const i2 = signIndex(s2);
  if (i1 < 0 || i2 < 0) return -1;
  const diff = Math.abs(i1 - i2) % 12;
  return Math.min(diff, 12 - diff);
}

function isOpposite(s1: string, s2: string): boolean {
  return signDistance(s1, s2) === 6;
}
function isConjunct(s1: string, s2: string): boolean {
  return signDistance(s1, s2) === 0;
}
function isTrine(s1: string, s2: string): boolean {
  return signDistance(s1, s2) === 4;
}
function isSquare(s1: string, s2: string): boolean {
  return signDistance(s1, s2) === 3;
}
function isSextile(s1: string, s2: string): boolean {
  return signDistance(s1, s2) === 2;
}

type Impact = 'very_positive' | 'positive' | 'neutral' | 'challenging';

function impactFromScore(score: number): Impact {
  if (score >= 5) return 'very_positive';
  if (score >= 2) return 'positive';
  if (score >= -1) return 'neutral';
  return 'challenging';
}

/**
 * Analyze house overlays using sign-based synastry proxies.
 *
 * True house overlay requires per-planet degree + natal house cusps,
 * which the AstrologyProfile shape doesn't carry. Instead we score each
 * "house theme" from real synastry signals between sun/moon/venus/mars
 * (+ saturn/jupiter when present) — this gives a non-stub answer that
 * differs per couple instead of always returning very_positive.
 */
export function analyzeHouseOverlays(
  p1: AstrologyProfile,
  p2: AstrologyProfile
): HouseOverlayAnalysis {
  const areas: HouseOverlayAnalysis['areas'] = [];

  // ───── 7H — 파트너십 (commitment, contracts) ─────
  // Strong: ASC opposition (literally each other's DSC), Sun-Moon trine/sextile,
  //         Saturn supporting Sun (commitment).
  // Weak: Sun-Saturn square/opposition (resentment in commitment).
  {
    let score = 0
    const reasons: string[] = []

    if (p1.ascendant && p2.ascendant && isOpposite(p1.ascendant.sign, p2.ascendant.sign)) {
      score += 4
      reasons.push('ASC 대립축 (서로의 DSC에 위치)')
    }
    if (isTrine(p1.sun.sign, p2.moon.sign) || isTrine(p2.sun.sign, p1.moon.sign)) {
      score += 3
      reasons.push('Sun-Moon trine')
    }
    if (isSextile(p1.sun.sign, p2.moon.sign) || isSextile(p2.sun.sign, p1.moon.sign)) {
      score += 2
      reasons.push('Sun-Moon sextile')
    }
    if (isOpposite(p1.sun.sign, p2.sun.sign)) {
      score += 2
      reasons.push('Sun 대립 (relationship axis)')
    }
    if (p1.saturn && p2.sun && isTrine(p1.saturn.sign, p2.sun.sign)) {
      score += 2
      reasons.push('Saturn-Sun trine (안정적 약속)')
    }
    if (p1.saturn && p2.sun && (isSquare(p1.saturn.sign, p2.sun.sign) || isOpposite(p1.saturn.sign, p2.sun.sign))) {
      score -= 2
      reasons.push('Saturn-Sun 긴장 (의무감 부담)')
    }
    if (isSquare(p1.sun.sign, p2.sun.sign)) {
      score -= 1
      reasons.push('Sun square (의지 충돌)')
    }

    areas.push({
      area: '파트너십',
      impact: impactFromScore(score),
      description: reasons.length > 0
        ? reasons.slice(0, 2).join(', ')
        : '특별한 7H 활성화 신호 없음 — 일상적 파트너십 흐름',
    })
  }

  // ───── 5H — 로맨스 / 즐거움 / 창조성 ─────
  // Strong: Venus-Mars conjunction/trine/sextile, Sun-Venus harmony,
  //         Mars in fire-leo theme.
  {
    let score = 0
    const reasons: string[] = []

    if (isConjunct(p1.venus.sign, p2.mars.sign) || isConjunct(p1.mars.sign, p2.venus.sign)) {
      score += 5
      reasons.push('Venus-Mars 합 (강한 로맨틱 케미스트리)')
    } else if (isTrine(p1.venus.sign, p2.mars.sign) || isTrine(p1.mars.sign, p2.venus.sign)) {
      score += 4
      reasons.push('Venus-Mars trine')
    } else if (isSextile(p1.venus.sign, p2.mars.sign) || isSextile(p1.mars.sign, p2.venus.sign)) {
      score += 2
      reasons.push('Venus-Mars sextile')
    }
    if (isCompatibleElement(p1.venus.element, p2.sun.element) || isCompatibleElement(p2.venus.element, p1.sun.element)) {
      score += 2
      reasons.push('Sun-Venus 원소 조화')
    }
    if (isOpposite(p1.venus.sign, p2.mars.sign) || isOpposite(p1.mars.sign, p2.venus.sign)) {
      score += 1
      reasons.push('Venus-Mars 대립 (강한 끌림 + 마찰)')
    }
    if (isSquare(p1.venus.sign, p2.venus.sign)) {
      score -= 1
      reasons.push('Venus square (취향 충돌)')
    }

    areas.push({
      area: '로맨스',
      impact: impactFromScore(score),
      description: reasons.length > 0
        ? reasons.slice(0, 2).join(', ')
        : '로맨스 영역 신호가 약함 — 깊이는 천천히 쌓임',
    })
  }

  // ───── 4H — 가정 / 안정 / 정서적 토대 ─────
  // Strong: Moon-Moon harmony (same element / trine), Moon-Saturn support,
  //         Cancer/Capricorn sign emphasis.
  {
    let score = 0
    const reasons: string[] = []

    if (isConjunct(p1.moon.sign, p2.moon.sign)) {
      score += 4
      reasons.push('Moon 합 (같은 정서 패턴)')
    } else if (isTrine(p1.moon.sign, p2.moon.sign)) {
      score += 4
      reasons.push('Moon trine')
    } else if (isSextile(p1.moon.sign, p2.moon.sign)) {
      score += 2
      reasons.push('Moon sextile')
    } else if (isCompatibleElement(p1.moon.element, p2.moon.element)) {
      score += 2
      reasons.push('Moon 원소 조화')
    }
    if (isSquare(p1.moon.sign, p2.moon.sign) || isOpposite(p1.moon.sign, p2.moon.sign)) {
      score -= 2
      reasons.push('Moon 긴장 (정서 리듬 차이)')
    }
    if (p1.saturn && p2.moon && isTrine(p1.saturn.sign, p2.moon.sign)) {
      score += 2
      reasons.push('Saturn-Moon trine (안정적 정서 토대)')
    }
    if (isIncompatibleElement(p1.moon.element, p2.moon.element)) {
      score -= 1
      reasons.push('Moon 원소 불일치')
    }

    areas.push({
      area: '가정생활',
      impact: impactFromScore(score),
      description: reasons.length > 0
        ? reasons.slice(0, 2).join(', ')
        : '가정 영역에서 강한 신호 없음 — 의식적 노력 필요',
    })
  }

  // ───── 10H — 공동 목표 / 사회적 성취 ─────
  // Strong: Saturn-Sun trine, Jupiter-Sun harmony, MC-themed shared
  //         (using Saturn/Capricorn-leaning sign + Sun harmonic).
  {
    let score = 0
    const reasons: string[] = []

    if (p1.jupiter && p2.sun && (isTrine(p1.jupiter.sign, p2.sun.sign) || isConjunct(p1.jupiter.sign, p2.sun.sign))) {
      score += 3
      reasons.push('Jupiter-Sun 조화 (확장적 공동 비전)')
    }
    if (p1.saturn && p2.sun && isTrine(p1.saturn.sign, p2.sun.sign)) {
      score += 3
      reasons.push('Saturn-Sun trine (장기 빌드)')
    }
    if (p1.saturn && p2.saturn && (isTrine(p1.saturn.sign, p2.saturn.sign) || isConjunct(p1.saturn.sign, p2.saturn.sign))) {
      score += 2
      reasons.push('Saturn-Saturn 조화 (책임 공유)')
    }
    if (isCompatibleElement(p1.sun.element, p2.sun.element)) {
      score += 1
      reasons.push('Sun 원소 호환')
    }
    if (p1.saturn && p2.sun && isSquare(p1.saturn.sign, p2.sun.sign)) {
      score -= 2
      reasons.push('Saturn-Sun square (공동 목표 압박)')
    }

    areas.push({
      area: '공동 목표',
      impact: impactFromScore(score),
      description: reasons.length > 0
        ? reasons.slice(0, 2).join(', ')
        : '커리어/사회적 영역 시너지가 중립적',
    })
  }

  // ───── 11H — 우정 / 비전 공유 (bonus when outer planets present) ─────
  if (p1.uranus && p2.sun) {
    let score = 0
    const reasons: string[] = []
    if (isTrine(p1.uranus.sign, p2.sun.sign) || isSextile(p1.uranus.sign, p2.sun.sign)) {
      score += 3
      reasons.push('Uranus-Sun 조화 (자유로운 우정 토대)')
    } else if (isSquare(p1.uranus.sign, p2.sun.sign) || isOpposite(p1.uranus.sign, p2.sun.sign)) {
      score -= 2
      reasons.push('Uranus-Sun 긴장 (예측 불가 변수)')
    }
    if (reasons.length > 0) {
      areas.push({
        area: '우정·비전',
        impact: impactFromScore(score),
        description: reasons.join(', '),
      })
    }
  }

  return {
    description: areas.length === 0
      ? '하우스 활성화 신호가 매우 약함'
      : '각 영역의 시너지 강도가 사인 기반 시너스트리로 산출됨',
    areas,
  };
}
