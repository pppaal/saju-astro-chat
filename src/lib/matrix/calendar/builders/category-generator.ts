/**
 * Category Generator - 카테고리 생성 모듈
 *
 * 분석 결과를 바탕으로 EventCategory를 생성합니다.
 */

import type { EventCategory } from '../types';
import { ELEMENT_RELATIONS } from '../constants';
import { calculateAreaScoresForCategories, getBestAreaCategory } from '../category-scoring';

export interface CategoryGeneratorInput {
  ganzhi: { stem: string; branch: string; stemElement: string; branchElement: string };
  dayMasterElement: string;
  dayBranch: string;
  relations: {
    generates: string;
    generatedBy: string;
    controls: string;
    controlledBy: string;
  };
  seunScore: number;
  wolunScore: number;
  specialFlags: {
    hasCheoneulGwiin: boolean;
    hasSonEomneun: boolean;
    hasGeonrok: boolean;
    hasYeokma: boolean;
    hasDohwa: boolean;
  };
}

export interface CategoryGeneratorResult {
  categories: EventCategory[];
}

/**
 * 카테고리 생성
 */
export function generateCategories(input: CategoryGeneratorInput): CategoryGeneratorResult {
  const { ganzhi, dayMasterElement, dayBranch, relations, seunScore, wolunScore, specialFlags } =
    input;

  const categories: EventCategory[] = [];

  // 영역별 점수 기반 카테고리
  const areaScores = calculateAreaScoresForCategories(ganzhi, seunScore, wolunScore);
  const bestAreaCategory = getBestAreaCategory(areaScores);
  if (bestAreaCategory) {
    categories.push(bestAreaCategory);
  }

  // 손없는 날
  if (specialFlags.hasSonEomneun && !categories.includes('general')) {
    categories.push('general');
  }

  // 건록 - 직업운
  if (specialFlags.hasGeonrok && !categories.includes('career')) {
    categories.push('career');
  }

  // 역마살 - 여행운
  if (specialFlags.hasYeokma && !categories.includes('travel')) {
    categories.push('travel');
  }

  // 도화살 - 연애운
  if (specialFlags.hasDohwa && !categories.includes('love')) {
    categories.push('love');
  }

  // 천간 관계에 따른 카테고리
  if (ganzhi.stemElement === dayMasterElement) {
    // 비견
    if (!categories.includes('career')) {categories.push('career');}
  } else if (ganzhi.stemElement === relations.generatedBy) {
    // 인성
    if (!categories.includes('study')) {categories.push('study');}
    if (!categories.includes('career')) {categories.push('career');}
  } else if (ganzhi.stemElement === relations.controls) {
    // 재성
    if (!categories.includes('wealth')) {categories.push('wealth');}
    if (!categories.includes('love')) {categories.push('love');}
  } else if (ganzhi.stemElement === relations.generates) {
    // 식상
    if (!categories.includes('love')) {categories.push('love');}
    if (!categories.includes('career')) {categories.push('career');}
  } else if (ganzhi.stemElement === relations.controlledBy) {
    // 관살
    if (!categories.includes('health')) {categories.push('health');}
    if (!categories.includes('career')) {categories.push('career');}
  }

  // 카테고리가 비어있으면 general 추가
  if (categories.length === 0) {
    categories.push('general');
  }

  return { categories };
}
