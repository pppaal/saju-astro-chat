/**
 * @file Comprehensive Saju Analysis
 * 종합 사주 궁합 분석 - 모든 분석을 통합하여 최종 결과 도출
 */

import type { SajuProfile } from '../cosmicCompatibility';
import type { ComprehensiveSajuCompatibility, ExtendedSajuCompatibility } from './types';
import { analyzeTenGods } from './ten-gods';
import { analyzeShinsals } from './shinsals';
import { analyzeHap, analyzeConflicts } from './harmonies-conflicts';
import { analyzeYongsinCompatibility } from './yongsin';
import { analyzeDaeunCompatibility, analyzeSeunCompatibility } from './daeun-seun';
import { analyzeGongmang } from './gongmang';
import { analyzeGanHap } from './ganhap';
import { analyzeGyeokguk } from './gyeokguk';
import { analyzeTwelveStates } from './twelve-states';

// ============================================================
// 종합 고급 사주 궁합 분석
// ============================================================

export function performComprehensiveSajuAnalysis(
  p1: SajuProfile,
  p2: SajuProfile
): ComprehensiveSajuCompatibility {
  const tenGods = analyzeTenGods(p1, p2);
  const shinsals = analyzeShinsals(p1, p2);
  const harmonies = analyzeHap(p1, p2);
  const conflicts = analyzeConflicts(p1, p2);

  // 종합 점수 계산
  const tenGodScore = tenGods.interaction.balance;
  const shinsalScore = shinsals.overallImpact === 'very_positive' ? 90
    : shinsals.overallImpact === 'positive' ? 75
    : shinsals.overallImpact === 'neutral' ? 50 : 30;
  const harmonyScore = harmonies.score;
  const conflictPenalty = conflicts.severity === 'severe' ? -30
    : conflicts.severity === 'moderate' ? -15
    : conflicts.severity === 'mild' ? -5 : 0;

  const overallScore = Math.max(0, Math.min(100,
    tenGodScore * 0.35 +
    shinsalScore * 0.25 +
    harmonyScore * 0.25 +
    conflictPenalty + 15
  ));

  let grade: ComprehensiveSajuCompatibility['grade'];
  if (overallScore >= 95) {grade = 'S+';}
  else if (overallScore >= 85) {grade = 'S';}
  else if (overallScore >= 75) {grade = 'A';}
  else if (overallScore >= 65) {grade = 'B';}
  else if (overallScore >= 50) {grade = 'C';}
  else if (overallScore >= 35) {grade = 'D';}
  else {grade = 'F';}

  // 요약 - 더 생생하고 매력적으로
  let summary = '';
  if (grade === 'S+') {
    summary = `🌟 와! 전설의 궁합이에요! 사주의 모든 요소가 마치 교향곡처럼 완벽하게 어우러지고 있어요. 십성은 서로를 빛나게 하고, 천을귀인이 두 분을 보호하며, 합의 마법이 펼쳐지고 있어요. 운명이 "이 사람이야!"라고 손짓하는 것 같지 않나요? 이 특별한 인연을 소중히 여기세요!`;
  } else if (grade === 'S') {
    summary = `✨ 드라마에 나올 법한 환상적인 궁합이에요! 사주의 조각들이 아름답게 맞물리면서 서로를 더 빛나게 해주고 있어요. 함께하면 시너지가 폭발하고, 각자의 꿈도 더 가까워지는 '윈-윈' 관계예요. 이런 궁합은 정말 흔치 않아요!`;
  } else if (grade === 'A') {
    summary = `💖 매우 좋은 궁합이에요! 사주의 대부분이 조화롭게 어우러지고 있어요. 작은 파도는 있을 수 있지만, 큰 흐름은 같은 방향을 향하고 있어요. 서로에 대한 믿음을 바탕으로 오래오래 함께할 수 있는 든든한 인연이에요!`;
  } else if (grade === 'B') {
    summary = `💫 괜찮은 궁합이에요! 완벽하진 않지만, 함께 맞춰가면 점점 더 좋아질 수 있는 관계예요. 마치 처음엔 서먹했던 듀엣이 연습을 통해 환상의 호흡을 갖추게 되는 것처럼요. 서로를 이해하려는 노력이 빛을 발할 거예요!`;
  } else if (grade === 'C') {
    summary = `⭐ 노력이 필요한 궁합이에요! 사주상 다른 점이 좀 있지만, 그게 꼭 나쁜 건 아니에요. 다름은 배움의 기회가 될 수 있어요. 서로의 다른 점을 인정하고, 소통하며, 맞춰가면 의외로 좋은 팀이 될 수 있어요!`;
  } else if (grade === 'D') {
    summary = `🌱 도전적인 궁합이에요! 사주가 다른 방향을 가리키고 있지만, 진짜 사랑은 이런 차이도 극복하잖아요? 더 많은 대화, 더 깊은 이해, 그리고 서로를 향한 노력이 필요해요. 어려운 만큼 성공하면 더 깊은 유대감을 느낄 수 있어요!`;
  } else {
    summary = `🔥 상당히 도전적인 궁합이에요! 사주상 맞지 않는 부분이 많지만, 사주가 모든 걸 결정하진 않아요. 서로의 의지와 노력, 그리고 사랑의 힘은 어떤 운명도 바꿀 수 있어요. 이 관계를 원한다면 더 많은 소통과 이해가 필요해요!`;
  }

  // 상세 인사이트 - 더 풍부한 설명
  const detailedInsights: string[] = [
    tenGods.relationshipDynamics,
    shinsals.luckyInteractions[0] || (shinsals.unluckyInteractions[0] ? `주의: ${shinsals.unluckyInteractions[0]}` : '✨ 특별한 신살 상호작용은 없지만, 기본적으로 안정적인 에너지 흐름을 가지고 있어요!'),
    harmonies.description,
  ];

  if (conflicts.totalConflicts > 0) {
    detailedInsights.push(`⚡ ${conflicts.totalConflicts}개의 충형파해가 있어요! 하지만 걱정 마세요 - 알고 대비하면 충분히 극복할 수 있어요. 아래의 조언을 참고해보세요!`);
  } else {
    detailedInsights.push(`🌈 충형파해가 없어요! 사주 간의 마찰이 없어서 자연스럽게 흐르는 관계랍니다.`);
  }

  return {
    tenGods,
    shinsals,
    harmonies,
    conflicts,
    overallScore: Math.round(overallScore),
    grade,
    summary,
    detailedInsights,
  };
}

// ============================================================
// 확장된 종합 사주 궁합 분석
// ============================================================

export function performExtendedSajuAnalysis(
  p1: SajuProfile,
  p2: SajuProfile,
  p1Age: number = 30,
  p2Age: number = 30,
  currentYear: number = new Date().getFullYear()
): ExtendedSajuCompatibility {
  // 기존 분석
  const baseAnalysis = performComprehensiveSajuAnalysis(p1, p2);

  // 확장 분석
  const yongsin = analyzeYongsinCompatibility(p1, p2);
  const daeun = analyzeDaeunCompatibility(p1, p2, p1Age, p2Age);
  const seun = analyzeSeunCompatibility(p1, p2, currentYear);
  const gongmang = analyzeGongmang(p1, p2);
  const ganHap = analyzeGanHap(p1, p2);
  const gyeokguk = analyzeGyeokguk(p1, p2);
  const twelveStates = analyzeTwelveStates(p1, p2);

  // 확장된 점수 계산
  const extendedScore =
    baseAnalysis.overallScore * 0.4 +
    yongsin.compatibility * 0.15 +
    daeun.currentSynergy * 0.1 +
    ganHap.totalHarmony * 0.1 +
    (gyeokguk.compatibility === 'excellent' ? 100 :
      gyeokguk.compatibility === 'good' ? 75 :
      gyeokguk.compatibility === 'neutral' ? 50 : 30) * 0.1 +
    twelveStates.energyCompatibility * 0.1 +
    (gongmang.impact === 'positive' ? 80 :
      gongmang.impact === 'neutral' ? 50 : 30) * 0.05;

  // 등급 재계산
  let grade: ComprehensiveSajuCompatibility['grade'];
  if (extendedScore >= 95) {grade = 'S+';}
  else if (extendedScore >= 85) {grade = 'S';}
  else if (extendedScore >= 75) {grade = 'A';}
  else if (extendedScore >= 65) {grade = 'B';}
  else if (extendedScore >= 50) {grade = 'C';}
  else if (extendedScore >= 35) {grade = 'D';}
  else {grade = 'F';}

  // 상세 인사이트 확장
  const detailedInsights = [
    ...baseAnalysis.detailedInsights,
    `용신 궁합: ${yongsin.mutualSupport ? '서로의 용신 충족 (최상)' : '부분적 용신 보완'}`,
    `대운 시너지: ${daeun.futureOutlook}`,
    `올해 전망: ${seun.combinedOutlook}`,
    `천간합: ${ganHap.significance}`,
    `격국 조화: ${gyeokguk.dynamics}`,
    ...gongmang.interpretation.slice(0, 1),
    ...twelveStates.interpretation.slice(0, 1),
  ];

  return {
    ...baseAnalysis,
    overallScore: Math.round(extendedScore),
    grade,
    detailedInsights,
    yongsin,
    daeun,
    seun,
    gongmang,
    ganHap,
    gyeokguk,
    twelveStates,
  };
}
