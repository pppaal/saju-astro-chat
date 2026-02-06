// src/lib/Saju/compatibility/categoryAnalysis.ts
// 카테고리별 궁합 분석 모듈

import { SajuPillars } from '../types';
import { CATEGORY_WEIGHTS, CATEGORY_ADVICE } from './constants';
import { analyzeElementCompatibility } from './elementAnalysis';
import { analyzeStemCompatibility, analyzeBranchCompatibility } from './stemBranchAnalysis';
import { analyzeDayMasterRelation } from './dayMasterAnalysis';
import type {
  CompatibilityCategory,
  CategoryCompatibility,
  ElementCompatibility,
  StemCompatibility,
  BranchCompatibility,
  DayMasterRelation,
} from './types';

/**
 * 카테고리별 인사이트 생성
 */
function generateCategoryInsights(
  category: CompatibilityCategory,
  element: ElementCompatibility,
  stem: StemCompatibility,
  branch: BranchCompatibility,
  dayMaster: DayMasterRelation
): { strengths: string[]; challenges: string[]; advice: string } {
  const strengths: string[] = [];
  const challenges: string[] = [];

  if (element.harmony.length > 0) {
    strengths.push(`${element.harmony.join(', ')} 오행의 조화`);
  }
  if (stem.hapPairs.length > 0) {
    strengths.push('천간합으로 인한 끌림');
  }
  if (branch.yukhapPairs.length > 0 || branch.samhapGroups.length > 0) {
    strengths.push('지지 합으로 인한 깊은 인연');
  }
  if (dayMaster.relation === '생조') {
    strengths.push('일간이 서로 도움을 주는 관계');
  }

  if (element.conflict.length > 0) {
    challenges.push(`${element.conflict.join(', ')} 오행 충돌 가능성`);
  }
  if (stem.chungPairs.length > 0) {
    challenges.push('천간충으로 인한 의견 대립');
  }
  if (branch.chungPairs.length > 0) {
    challenges.push('지지충으로 인한 갈등 가능성');
  }
  if (dayMaster.relation === '극입') {
    challenges.push('일간 관계에서 압박감');
  }

  return { strengths, challenges, advice: CATEGORY_ADVICE[category] };
}

/**
 * 카테고리별 궁합 분석
 */
export function analyzeByCategory(
  person1: SajuPillars,
  person2: SajuPillars,
  category: CompatibilityCategory
): CategoryCompatibility {
  const element = analyzeElementCompatibility(person1, person2);
  const stem = analyzeStemCompatibility(person1, person2);
  const branch = analyzeBranchCompatibility(person1, person2);
  const dayMaster = analyzeDayMasterRelation(person1, person2);

  const w = CATEGORY_WEIGHTS[category];
  const score = Math.round(
    element.score * w.element +
    stem.score * w.stem +
    branch.score * w.branch +
    dayMaster.score * w.dayMaster
  );

  const { strengths, challenges, advice } = generateCategoryInsights(category, element, stem, branch, dayMaster);

  return { category, score, strengths, challenges, advice };
}
