// src/lib/Saju/compatibility/index.ts
// 궁합 분석 모듈 통합 (리팩토링된 버전)

export * from './types';
export * from './constants';
export { analyzeElementCompatibility, countElements } from './elementAnalysis';
export { analyzeStemCompatibility, analyzeBranchCompatibility } from './stemBranchAnalysis';
export { analyzeDayMasterRelation } from './dayMasterAnalysis';
export { analyzeByCategory } from './categoryAnalysis';

import type {
  CompatibilitySubject,
  CompatibilityCategory,
  ComprehensiveCompatibility,
  MultiPersonCompatibility,
} from './types';
import { analyzeElementCompatibility } from './elementAnalysis';
import { analyzeStemCompatibility, analyzeBranchCompatibility } from './stemBranchAnalysis';
import { analyzeDayMasterRelation } from './dayMasterAnalysis';
import { analyzeByCategory } from './categoryAnalysis';

/**
 * 종합 궁합 분석
 */
export function analyzeComprehensiveCompatibility(
  person1: CompatibilitySubject,
  person2: CompatibilitySubject,
  options?: {
    categories?: CompatibilityCategory[];
    includeTemporalAnalysis?: boolean;
  }
): ComprehensiveCompatibility {
  const elementCompatibility = analyzeElementCompatibility(person1.pillars, person2.pillars);
  const stemCompatibility = analyzeStemCompatibility(person1.pillars, person2.pillars);
  const branchCompatibility = analyzeBranchCompatibility(person1.pillars, person2.pillars);
  const dayMasterRelation = analyzeDayMasterRelation(person1.pillars, person2.pillars);

  // 카테고리별 점수
  const categories = options?.categories || ['love', 'business', 'friendship'] as CompatibilityCategory[];
  const categoryScores = categories.map(cat => analyzeByCategory(person1.pillars, person2.pillars, cat));

  // 종합 점수
  const overallScore = Math.round(
    elementCompatibility.score * 0.25 +
    stemCompatibility.score * 0.2 +
    branchCompatibility.score * 0.3 +
    dayMasterRelation.score * 0.25
  );

  // 등급
  let grade: ComprehensiveCompatibility['grade'];
  if (overallScore >= 85) { grade = 'S'; }
  else if (overallScore >= 75) { grade = 'A'; }
  else if (overallScore >= 65) { grade = 'B'; }
  else if (overallScore >= 55) { grade = 'C'; }
  else if (overallScore >= 45) { grade = 'D'; }
  else { grade = 'F'; }

  // 강점/약점 수집
  const strengths: string[] = [];
  const challenges: string[] = [];
  const recommendations: string[] = [];

  for (const cat of categoryScores) {
    strengths.push(...cat.strengths);
    challenges.push(...cat.challenges);
  }

  // 추천 생성
  if (branchCompatibility.yukhapPairs.length > 0) {
    recommendations.push('육합의 인연을 살려 깊은 관계를 맺어보세요.');
  }
  if (branchCompatibility.chungPairs.length > 0) {
    recommendations.push('충 관계가 있으니 갈등 상황에서 한 발 물러서세요.');
  }
  if (elementCompatibility.missing.length > 0) {
    recommendations.push(`함께 ${elementCompatibility.missing.join(', ')} 오행을 보강하는 활동을 해보세요.`);
  }

  const summary = `종합 궁합 ${overallScore}점(${grade}등급). ${dayMasterRelation.dynamics}`;

  return {
    overallScore,
    grade,
    elementCompatibility,
    stemCompatibility,
    branchCompatibility,
    dayMasterRelation,
    categoryScores,
    summary,
    strengths: Array.from(new Set(strengths)),
    challenges: Array.from(new Set(challenges)),
    recommendations,
  };
}

/**
 * 다자간 궁합 분석 (3인 이상)
 */
export function analyzeMultiPersonCompatibility(
  participants: CompatibilitySubject[]
): MultiPersonCompatibility {
  if (participants.length < 2) {
    throw new Error('최소 2명 이상의 참가자가 필요합니다.');
  }

  const pairwiseScores: Array<{ person1: string; person2: string; score: number }> = [];

  // 모든 쌍에 대해 궁합 분석
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      const result = analyzeComprehensiveCompatibility(participants[i], participants[j]);
      pairwiseScores.push({
        person1: participants[i].id,
        person2: participants[j].id,
        score: result.overallScore,
      });
    }
  }

  // 그룹 조화도 (평균)
  const groupHarmony = Math.round(
    pairwiseScores.reduce((sum, p) => sum + p.score, 0) / pairwiseScores.length
  );

  // 최고/최저 쌍
  const sortedPairs = [...pairwiseScores].sort((a, b) => b.score - a.score);
  const bestPairs = sortedPairs.slice(0, 2).map(p => `${p.person1}-${p.person2} (${p.score}점)`);
  const challengingPairs = sortedPairs.slice(-2).map(p => `${p.person1}-${p.person2} (${p.score}점)`);

  const groupDynamics = groupHarmony >= 70
    ? '전체적으로 조화로운 그룹입니다. 함께 활동할 때 시너지가 발휘됩니다.'
    : groupHarmony >= 50
    ? '보통 수준의 그룹 조화입니다. 일부 관계에서 조율이 필요합니다.'
    : '그룹 내 갈등 요소가 있습니다. 중재자 역할이 필요합니다.';

  const recommendations = [
    '정기적인 소통으로 오해를 방지하세요.',
    '각자의 강점을 살리는 역할 분담을 하세요.',
  ];

  return {
    participants,
    pairwiseScores,
    groupHarmony,
    groupDynamics,
    bestPairs,
    challengingPairs,
    recommendations,
  };
}
