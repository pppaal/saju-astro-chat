// src/lib/Saju/compatibility/elementAnalysis.ts
// 오행 궁합 분석 모듈

import { FiveElement, SajuPillars } from '../types';
import { FIVE_ELEMENT_RELATIONS } from '../constants';
import { getStemElement, getBranchElement } from '../stemBranchUtils';
import type { ElementCompatibility } from './types';

const ALL_ELEMENTS: FiveElement[] = ['목', '화', '토', '금', '수'];

/**
 * 사주에서 오행 개수 계산
 */
export function countElements(pillars: SajuPillars): Record<FiveElement, number> {
  const counts: Record<FiveElement, number> = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };
  const allPillars = [pillars.year, pillars.month, pillars.day, pillars.time];

  for (const pillar of allPillars) {
    const stemElement = getStemElement(pillar.heavenlyStem.name);
    const branchElement = getBranchElement(pillar.earthlyBranch.name);
    counts[stemElement]++;
    counts[branchElement]++;
  }

  return counts;
}

/**
 * 오행 분석 텍스트 생성
 */
function generateElementAnalysis(
  harmony: FiveElement[],
  conflict: FiveElement[],
  complementary: FiveElement[],
  missing: FiveElement[]
): string {
  const parts: string[] = [];

  if (harmony.length > 0) {
    parts.push(`${harmony.join(', ')} 오행에서 강한 조화를 이룹니다`);
  }
  if (complementary.length > 0) {
    parts.push(`${complementary.join(', ')} 오행에서 서로 보완합니다`);
  }
  if (conflict.length > 0) {
    parts.push(`${conflict.join(', ')} 오행에서 충돌 가능성이 있습니다`);
  }
  if (missing.length > 0) {
    parts.push(`${missing.join(', ')} 오행이 둘 다 부족하여 함께 보강이 필요합니다`);
  }

  return parts.join('. ') + '.';
}

/**
 * 오행 궁합 분석
 */
export function analyzeElementCompatibility(
  person1: SajuPillars,
  person2: SajuPillars
): ElementCompatibility {
  const elements1 = countElements(person1);
  const elements2 = countElements(person2);

  const harmony: FiveElement[] = [];
  const conflict: FiveElement[] = [];
  const missing: FiveElement[] = [];
  const complementary: FiveElement[] = [];

  for (const element of ALL_ELEMENTS) {
    const count1 = elements1[element];
    const count2 = elements2[element];

    // 둘 다 강한 오행 = 조화
    if (count1 >= 2 && count2 >= 2) {
      harmony.push(element);
    }

    // 한쪽은 많고 한쪽은 부족 = 보완
    if ((count1 >= 2 && count2 <= 1) || (count1 <= 1 && count2 >= 2)) {
      complementary.push(element);
    }

    // 둘 다 부족 = 부족
    if (count1 === 0 && count2 === 0) {
      missing.push(element);
    }

    // 상극 관계 확인
    const geukElement = FIVE_ELEMENT_RELATIONS['극하는관계'][element];
    if (count1 >= 2 && elements2[geukElement] >= 2) {
      conflict.push(element);
    }
  }

  // 점수 계산
  let score = 50;
  score += harmony.length * 10;
  score += complementary.length * 8;
  score -= conflict.length * 10;
  score -= missing.length * 5;
  score = Math.max(0, Math.min(100, score));

  const analysis = generateElementAnalysis(harmony, conflict, complementary, missing);

  return { score, harmony, conflict, missing, complementary, analysis };
}
