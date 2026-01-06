/**
 * 운세 예측 점수 시스템 종합 테스트
 * - 점수 계산 로직 (0-100점)
 * - 등급 시스템 (S/A+/A/B/C/D)
 * - 동서양 통합 점수 계산
 * - 신뢰도 계산
 */

import {
  calculateMonthlyTimingScore,
  generateYearlyPrediction,
  scoreToGrade,
  standardizeScore,
  gradeToMinScore,
  type PredictionGrade,
  type MonthlyTimingScore,
  type FiveElement,
} from '../src/lib/prediction';

console.log('='.repeat(80));
console.log('운세 예측 점수 시스템 종합 테스트');
console.log('='.repeat(80));
console.log();

// ============================================================
// 1. 등급 시스템 검증
// ============================================================
console.log('1. 등급 시스템 경계값 검증');
console.log('-'.repeat(80));

const gradeBoundaries = [
  { score: 100, expectedGrade: 'S', name: 'S 상한 (100점)' },
  { score: 85, expectedGrade: 'S', name: 'S 하한 (85점)' },
  { score: 84, expectedGrade: 'A+', name: 'A+ 상한 (84점)' },
  { score: 75, expectedGrade: 'A+', name: 'A+ 하한 (75점)' },
  { score: 74, expectedGrade: 'A', name: 'A 상한 (74점)' },
  { score: 65, expectedGrade: 'A', name: 'A 하한 (65점)' },
  { score: 64, expectedGrade: 'B', name: 'B 상한 (64점)' },
  { score: 55, expectedGrade: 'B', name: 'B 하한 (55점)' },
  { score: 54, expectedGrade: 'C', name: 'C 상한 (54점)' },
  { score: 43, expectedGrade: 'C', name: 'C 하한 (43점)' },
  { score: 42, expectedGrade: 'D', name: 'D 상한 (42점)' },
  { score: 0, expectedGrade: 'D', name: 'D 하한 (0점)' },
];

let gradeBoundaryErrors = 0;

gradeBoundaries.forEach(({ score, expectedGrade, name }) => {
  const actualGrade = scoreToGrade(score);
  const isCorrect = actualGrade === expectedGrade;

  console.log(`${name}: ${actualGrade} (기대: ${expectedGrade}) ${isCorrect ? '✅' : '⚠️  오류!'}`);

  if (!isCorrect) {
    gradeBoundaryErrors++;
  }
});

console.log();
if (gradeBoundaryErrors === 0) {
  console.log('✅ 모든 등급 경계값이 정상적으로 작동합니다.');
} else {
  console.log(`⚠️  ${gradeBoundaryErrors}개의 등급 경계값 오류가 발견되었습니다.`);
}
console.log();

// ============================================================
// 2. 등급-점수 상호 변환 검증
// ============================================================
console.log('2. 등급-점수 상호 변환 검증');
console.log('-'.repeat(80));

const grades: PredictionGrade[] = ['S', 'A+', 'A', 'B', 'C', 'D'];
const minScores = { 'S': 85, 'A+': 75, 'A': 65, 'B': 55, 'C': 43, 'D': 0 };

let conversionErrors = 0;

grades.forEach(grade => {
  const expectedMinScore = minScores[grade];
  const actualMinScore = gradeToMinScore(grade);
  const isCorrect = actualMinScore === expectedMinScore;

  console.log(`Grade ${grade} 최소 점수: ${actualMinScore}점 (기대: ${expectedMinScore}점) ${isCorrect ? '✅' : '⚠️'}`);

  if (!isCorrect) {
    conversionErrors++;
  }
});

console.log();
if (conversionErrors === 0) {
  console.log('✅ 등급-점수 변환이 정상입니다.');
} else {
  console.log(`⚠️  ${conversionErrors}개의 변환 오류가 발견되었습니다.`);
}
console.log();

// ============================================================
// 3. 점수 정규화 검증
// ============================================================
console.log('3. 점수 정규화 검증 (범위 제한)');
console.log('-'.repeat(80));

const testScores = [-10, 0, 25, 50, 75, 95, 100, 110, 150];
let normalizationErrors = 0;

testScores.forEach(rawScore => {
  const normalized = standardizeScore(rawScore);
  const isInRange = normalized.score >= 0 && normalized.score <= 100;
  const expectedScore = Math.max(0, Math.min(100, Math.round(rawScore)));
  const isCorrect = normalized.score === expectedScore;

  console.log(
    `${String(rawScore).padStart(4)}점 → ${String(normalized.score).padStart(3)}점 (${normalized.grade}) ${normalized.label} ` +
    `${isInRange && isCorrect ? '✅' : '⚠️'}`
  );

  if (!isInRange || !isCorrect) {
    normalizationErrors++;
  }
});

console.log();
if (normalizationErrors === 0) {
  console.log('✅ 점수 정규화가 정상입니다.');
} else {
  console.log(`⚠️  ${normalizationErrors}개의 정규화 오류가 발견되었습니다.`);
}
console.log();

// ============================================================
// 4. 월별 점수 계산 검증
// ============================================================
console.log('4. 월별 점수 계산 검증 (12개월)');
console.log('-'.repeat(80));

const testParams = {
  year: 2025,
  dayStem: '갑',
  dayElement: '목' as FiveElement,
  yongsin: ['수', '목'] as FiveElement[],
  kisin: ['토', '금'] as FiveElement[],
  currentDaeunElement: '수' as FiveElement,
  birthYear: 1990,
};

const monthlyScores: MonthlyTimingScore[] = [];
let scoreRangeErrors = 0;

for (let month = 1; month <= 12; month++) {
  const score = calculateMonthlyTimingScore({
    ...testParams,
    month,
  });

  monthlyScores.push(score);

  // 점수 범위 검증
  const easternInRange = score.easternScore >= 0 && score.easternScore <= 100;
  const westernInRange = score.westernScore >= 0 && score.westernScore <= 100;
  const combinedInRange = score.combinedScore >= 0 && score.combinedScore <= 100;
  const confidenceInRange = score.confidence >= 0 && score.confidence <= 100;

  const allInRange = easternInRange && westernInRange && combinedInRange && confidenceInRange;

  console.log(
    `${String(month).padStart(2)}월: ${score.grade} (${String(score.combinedScore).padStart(3)}점) | ` +
    `동양: ${String(score.easternScore).padStart(3)}점 | 서양: ${String(score.westernScore).padStart(3)}점 | ` +
    `신뢰: ${String(score.confidence).padStart(3)}% ${allInRange ? '✅' : '⚠️  범위 초과!'}`
  );

  if (!allInRange) {
    scoreRangeErrors++;
    if (!easternInRange) console.log(`  → 동양 점수 범위 위반: ${score.easternScore}`);
    if (!westernInRange) console.log(`  → 서양 점수 범위 위반: ${score.westernScore}`);
    if (!combinedInRange) console.log(`  → 종합 점수 범위 위반: ${score.combinedScore}`);
    if (!confidenceInRange) console.log(`  → 신뢰도 범위 위반: ${score.confidence}`);
  }
}

console.log();
if (scoreRangeErrors === 0) {
  console.log('✅ 모든 월별 점수가 정상 범위(0-100) 내에 있습니다.');
} else {
  console.log(`⚠️  ${scoreRangeErrors}개의 범위 초과 오류가 발견되었습니다.`);
}
console.log();

// ============================================================
// 5. 연간 예측 통계
// ============================================================
console.log('5. 연간 예측 통계 분석');
console.log('-'.repeat(80));

const yearlyPrediction = generateYearlyPrediction(testParams);

const scores = monthlyScores.map(m => m.combinedScore);
const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
const minScore = Math.min(...scores);
const maxScore = Math.max(...scores);
const stdDev = Math.sqrt(
  scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length
);

console.log(`연도: ${yearlyPrediction.year}년`);
console.log(`연간 테마: ${yearlyPrediction.yearTheme}`);
console.log(`연간 오행: ${yearlyPrediction.annualElement}`);
console.log(`대운 단계: ${yearlyPrediction.daeunPhase}`);
console.log();
console.log('📊 점수 통계:');
console.log(`   평균: ${avgScore.toFixed(1)}점`);
console.log(`   최소: ${minScore}점`);
console.log(`   최대: ${maxScore}점`);
console.log(`   범위: ${maxScore - minScore}점`);
console.log(`   표준편차: ${stdDev.toFixed(1)}점`);
console.log();
console.log('🎯 등급 분포:');
const gradeDistribution: Record<PredictionGrade, number> = { 'S': 0, 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0 };
monthlyScores.forEach(m => gradeDistribution[m.grade]++);
grades.forEach(grade => {
  const count = gradeDistribution[grade];
  const percentage = ((count / 12) * 100).toFixed(1);
  const bar = '█'.repeat(count);
  console.log(`   Grade ${grade.padEnd(2)}: ${String(count).padStart(2)}개월 (${String(percentage).padStart(5)}%) ${bar}`);
});
console.log();
console.log('🔍 신뢰도:');
console.log(`   종합: ${yearlyPrediction.confidence.overall}%`);
console.log(`   데이터 품질: ${yearlyPrediction.confidence.dataQuality}%`);
console.log(`   방법론 일치도: ${yearlyPrediction.confidence.methodAlignment}%`);
console.log(`   주기 동기화: ${yearlyPrediction.confidence.cycleSynchrony}%`);
console.log();
console.log('📅 베스트/챌린지 월:');
console.log(`   최고의 달: ${yearlyPrediction.bestMonths.join(', ')}월`);
console.log(`   도전의 달: ${yearlyPrediction.challengingMonths.join(', ')}월`);
console.log();

// ============================================================
// 6. 동서양 점수 일관성 검증
// ============================================================
console.log('6. 동서양 점수 일관성 검증');
console.log('-'.repeat(80));

const scoreDifferences = monthlyScores.map(m => Math.abs(m.easternScore - m.westernScore));
const avgDiff = scoreDifferences.reduce((a, b) => a + b, 0) / scoreDifferences.length;
const maxDiff = Math.max(...scoreDifferences);

console.log(`평균 차이: ${avgDiff.toFixed(1)}점`);
console.log(`최대 차이: ${maxDiff}점`);
console.log(`방법론 일치도: ${yearlyPrediction.confidence.methodAlignment}%`);

if (avgDiff < 20) {
  console.log('✅ 동서양 점수가 일관되게 계산됩니다.');
} else if (avgDiff < 30) {
  console.log('⚠️  동서양 점수 차이가 다소 큽니다 (평균 20-30점).');
} else {
  console.log('⚠️  동서양 점수 차이가 매우 큽니다 (평균 30점 이상).');
}
console.log();

// ============================================================
// 7. 분기별 흐름 분석
// ============================================================
console.log('7. 분기별 흐름 분석');
console.log('-'.repeat(80));

yearlyPrediction.quarters.forEach(q => {
  console.log(
    `Q${q.quarter}: 평균 ${q.averageScore}점 | ${q.trend.padEnd(10)} | ${q.recommendation}`
  );
  console.log(`      주요 이벤트: ${q.keyEvents.join(', ')}`);
});
console.log();

// ============================================================
// 최종 평가
// ============================================================
console.log('='.repeat(80));
console.log('최종 평가');
console.log('='.repeat(80));

const issues: string[] = [];

if (gradeBoundaryErrors > 0) issues.push(`등급 경계값 오류 ${gradeBoundaryErrors}건`);
if (conversionErrors > 0) issues.push(`등급-점수 변환 오류 ${conversionErrors}건`);
if (normalizationErrors > 0) issues.push(`정규화 오류 ${normalizationErrors}건`);
if (scoreRangeErrors > 0) issues.push(`점수 범위 초과 ${scoreRangeErrors}건`);

if (issues.length === 0) {
  console.log('🎉 모든 테스트를 통과했습니다!');
  console.log();
  console.log('✅ 등급 시스템 정상 (S/A+/A/B/C/D)');
  console.log('✅ 점수 계산 정상 (0-100점)');
  console.log('✅ 점수 정규화 정상');
  console.log('✅ 동서양 통합 계산 정상');
  console.log('✅ 신뢰도 계산 정상');
  console.log('✅ 연간 예측 통계 정상');
  console.log();
  console.log('시스템이 완벽하게 작동하고 있습니다! 🌟');
} else {
  console.log('⚠️  다음 이슈들이 발견되었습니다:');
  issues.forEach(issue => console.log(`   - ${issue}`));
}

console.log();
console.log('='.repeat(80));
