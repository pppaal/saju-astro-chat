/**
 * 극단 케이스 점수 테스트
 * Run with: npx tsx scripts/test-extreme-scores.ts
 */

import { calculateTotalScore, SAMPLE_INPUTS } from '../src/lib/destiny-map/calendar/scoring';

console.log('=== 극단 케이스 시뮬레이션 ===\n');

const bestResult = calculateTotalScore(SAMPLE_INPUTS.bestDay.saju, SAMPLE_INPUTS.bestDay.astro);
console.log('최고의 날 (Best Day):');
console.log('  사주 점수:', bestResult.sajuScore);
console.log('  점성 점수:', bestResult.astroScore);
console.log('  교차 보너스:', bestResult.crossBonus);
console.log('  총점:', bestResult.totalScore, '점');
console.log('  등급:', bestResult.grade);
console.log('  세부:', bestResult.breakdown);

const worstResult = calculateTotalScore(SAMPLE_INPUTS.worstDay.saju, SAMPLE_INPUTS.worstDay.astro);
console.log('\n최악의 날 (Worst Day):');
console.log('  사주 점수:', worstResult.sajuScore);
console.log('  점성 점수:', worstResult.astroScore);
console.log('  교차 보너스:', worstResult.crossBonus);
console.log('  총점:', worstResult.totalScore, '점');
console.log('  등급:', worstResult.grade);
console.log('  세부:', worstResult.breakdown);

const normalResult = calculateTotalScore(SAMPLE_INPUTS.normalDay.saju, SAMPLE_INPUTS.normalDay.astro);
console.log('\n평범한 날 (Normal Day):');
console.log('  총점:', normalResult.totalScore, '점');
console.log('  등급:', normalResult.grade);

console.log('\n=== 점수 범위 달성 ===');
console.log('최고:', bestResult.totalScore, '점 (목표: 95+)');
console.log('최저:', worstResult.totalScore, '점 (목표: 20 이하)');
console.log('범위:', bestResult.totalScore - worstResult.totalScore, '점');
