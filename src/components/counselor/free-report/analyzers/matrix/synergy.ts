/**
 * Synergy Calculation Module
 * 시너지 종합 분석
 */

import type { MatrixFusion, MatrixSynergyResult } from './types';

/**
 * Calculate synergy from multiple fusion results
 */
export function calculateSynergy(
  fusions: MatrixFusion[],
  lang: string
): MatrixSynergyResult {
  const isKo = lang === 'ko';

  const fusionSummary = {
    extreme: fusions.filter((f) => f.level === 'extreme').length,
    amplify: fusions.filter((f) => f.level === 'amplify').length,
    balance: fusions.filter((f) => f.level === 'balance').length,
    clash: fusions.filter((f) => f.level === 'clash').length,
    conflict: fusions.filter((f) => f.level === 'conflict').length,
  };

  const totalScore = fusions.reduce((sum, f) => sum + f.score, 0);
  const avgScore = fusions.length > 0 ? Math.round((totalScore / fusions.length) * 10) / 10 : 5;

  // 강점 추출
  const topStrengths = fusions
    .filter((f) => f.level === 'extreme' || (f.level === 'amplify' && f.score >= 8))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((f) => ({
      area: isKo ? f.keyword.ko : f.keyword.en,
      score: f.score,
      icon: f.icon,
      description: f.description,
    }));

  // 주의점 추출
  const topCautions = fusions
    .filter((f) => f.level === 'conflict' || (f.level === 'clash' && f.score <= 4))
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map((f) => ({
      area: isKo ? f.keyword.ko : f.keyword.en,
      score: f.score,
      icon: f.icon,
      description: f.description,
    }));

  // 지배적 에너지
  let dominantEnergy = { ko: '균형', en: 'Balance' };
  if (fusionSummary.extreme >= 2) {
    dominantEnergy = { ko: '극강 시너지', en: 'Extreme Synergy' };
  } else if (fusionSummary.amplify >= 3) {
    dominantEnergy = { ko: '증폭 에너지', en: 'Amplified Energy' };
  } else if (fusionSummary.conflict >= 2) {
    dominantEnergy = { ko: '변혁 에너지', en: 'Transformative Energy' };
  }

  return {
    topStrengths,
    topCautions,
    overallScore: avgScore,
    dominantEnergy,
  };
}

/**
 * Get fusion summary from multiple fusion results
 */
export function getFusionSummary(fusions: MatrixFusion[]) {
  return {
    extreme: fusions.filter((f) => f.level === 'extreme').length,
    amplify: fusions.filter((f) => f.level === 'amplify').length,
    balance: fusions.filter((f) => f.level === 'balance').length,
    clash: fusions.filter((f) => f.level === 'clash').length,
    conflict: fusions.filter((f) => f.level === 'conflict').length,
  };
}
