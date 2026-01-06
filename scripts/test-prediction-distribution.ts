/**
 * 운세 예측 점수 분포 대규모 테스트
 * 100명의 무작위 사용자 데이터로 점수 분포 및 통계 검증
 */

import {
  calculateMonthlyTimingScore,
  type FiveElement,
  type PredictionGrade,
} from '../src/lib/prediction';

console.log('='.repeat(80));
console.log('운세 예측 점수 분포 대규모 테스트 - 100명 무작위 검사');
console.log('='.repeat(80));
console.log();

// 무작위 생성 함수
function randomBool(probability = 0.5): boolean {
  return Math.random() < probability;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomElement(): FiveElement {
  const elements: FiveElement[] = ['목', '화', '토', '금', '수'];
  return randomItem(elements);
}

// 100명의 데이터 생성
const users = Array.from({ length: 100 }, (_, i) => ({
  id: i + 1,
  birthYear: 1970 + Math.floor(Math.random() * 40), // 1970-2009
  dayElement: randomElement(),
  yongsin: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => randomElement()),
  kisin: Array.from({ length: Math.floor(Math.random() * 2) }, () => randomElement()),
  currentDaeunElement: randomBool(0.8) ? randomElement() : undefined,
}));

console.log(`⏳ ${users.length}명 사용자 데이터 생성 완료...`);
console.log();

// 각 사용자의 연간 평균 점수 계산
const userResults = users.map(user => {
  const monthlyScores: number[] = [];
  const monthlyGrades: PredictionGrade[] = [];

  for (let month = 1; month <= 12; month++) {
    const score = calculateMonthlyTimingScore({
      year: 2025,
      month,
      dayStem: '갑', // 간단히 고정
      dayElement: user.dayElement,
      yongsin: user.yongsin,
      kisin: user.kisin,
      currentDaeunElement: user.currentDaeunElement,
      birthYear: user.birthYear,
    });

    monthlyScores.push(score.combinedScore);
    monthlyGrades.push(score.grade);
  }

  const avgScore = monthlyScores.reduce((a, b) => a + b, 0) / monthlyScores.length;
  const minScore = Math.min(...monthlyScores);
  const maxScore = Math.max(...monthlyScores);

  return {
    userId: user.id,
    avgScore,
    minScore,
    maxScore,
    scores: monthlyScores,
    grades: monthlyGrades,
  };
});

console.log('='.repeat(80));
console.log('통계 요약');
console.log('='.repeat(80));
console.log();

// 전체 평균
const allAvgScores = userResults.map(r => r.avgScore);
const globalAvg = allAvgScores.reduce((a, b) => a + b, 0) / allAvgScores.length;
const globalMin = Math.min(...allAvgScores);
const globalMax = Math.max(...allAvgScores);
const sortedAvgs = [...allAvgScores].sort((a, b) => a - b);
const median = sortedAvgs[Math.floor(sortedAvgs.length / 2)];

console.log('📊 연간 평균 점수 분포:');
console.log(`   전체 평균: ${globalAvg.toFixed(1)}점`);
console.log(`   중앙값: ${median.toFixed(1)}점`);
console.log(`   최소: ${globalMin.toFixed(1)}점`);
console.log(`   최대: ${globalMax.toFixed(1)}점`);
console.log(`   범위: ${(globalMax - globalMin).toFixed(1)}점`);

// 표준편차
const variance = allAvgScores.reduce((sum, score) => sum + Math.pow(score - globalAvg, 2), 0) / allAvgScores.length;
const stdDev = Math.sqrt(variance);
console.log(`   표준편차: ${stdDev.toFixed(1)}점`);
console.log();

// 등급 분포 (월별 전체)
console.log('🎯 등급 분포 (전체 1,200개 월 데이터):');
const allGrades = userResults.flatMap(r => r.grades);
const gradeDistribution: Record<PredictionGrade, number> = { 'S': 0, 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0 };
allGrades.forEach(g => gradeDistribution[g]++);

const grades: PredictionGrade[] = ['S', 'A+', 'A', 'B', 'C', 'D'];
const gradeEmojis = { 'S': '🌟', 'A+': '😊', 'A': '🙂', 'B': '😐', 'C': '😕', 'D': '😰' };

grades.forEach(grade => {
  const count = gradeDistribution[grade];
  const percentage = ((count / allGrades.length) * 100).toFixed(1);
  const barLength = Math.floor(count / 10);
  const bar = '█'.repeat(barLength);
  console.log(
    `   Grade ${grade.padEnd(2)} ${gradeEmojis[grade]} │ ` +
    `${String(count).padStart(4)}개월 (${String(percentage).padStart(5)}%) ${bar}`
  );
});
console.log();

// 점수 구간별 분포
console.log('📉 점수 구간별 분포 (연간 평균 기준):');
const scoreRanges = [
  { min: 0, max: 29, label: '0-29 (매우 낮음)' },
  { min: 30, max: 39, label: '30-39 (낮음)' },
  { min: 40, max: 49, label: '40-49 (보통 이하)' },
  { min: 50, max: 59, label: '50-59 (보통)' },
  { min: 60, max: 69, label: '60-69 (양호)' },
  { min: 70, max: 79, label: '70-79 (좋음)' },
  { min: 80, max: 89, label: '80-89 (매우 좋음)' },
  { min: 90, max: 100, label: '90-100 (최고)' },
];

scoreRanges.forEach(range => {
  const count = allAvgScores.filter(s => s >= range.min && s <= range.max).length;
  const percentage = ((count / 100) * 100).toFixed(1);
  const bar = '█'.repeat(Math.floor(count / 2));
  console.log(`   ${range.label.padEnd(20)} │ ${String(count).padStart(3)}명 (${String(percentage).padStart(5)}%) ${bar}`);
});
console.log();

// 변동성 분석
console.log('📈 점수 변동성 분석:');
const userVariances = userResults.map(r => {
  const avg = r.avgScore;
  const variance = r.scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / r.scores.length;
  return Math.sqrt(variance);
});
const avgVariance = userVariances.reduce((a, b) => a + b, 0) / userVariances.length;
const minVariance = Math.min(...userVariances);
const maxVariance = Math.max(...userVariances);

console.log(`   평균 변동성 (개인별 표준편차): ${avgVariance.toFixed(1)}점`);
console.log(`   최소 변동성: ${minVariance.toFixed(1)}점`);
console.log(`   최대 변동성: ${maxVariance.toFixed(1)}점`);
console.log();

// 극단값 분석
console.log('🔍 극단값 분석:');
const topUsers = userResults.sort((a, b) => b.avgScore - a.avgScore).slice(0, 3);
const bottomUsers = userResults.sort((a, b) => a.avgScore - b.avgScore).slice(0, 3);

console.log('   최고 평균 점수:');
topUsers.forEach((u, i) => {
  console.log(`      ${i + 1}. 사용자 ${u.userId}: 평균 ${u.avgScore.toFixed(1)}점 (범위: ${u.minScore}-${u.maxScore}점)`);
});

console.log('   최저 평균 점수:');
bottomUsers.forEach((u, i) => {
  console.log(`      ${i + 1}. 사용자 ${u.userId}: 평균 ${u.avgScore.toFixed(1)}점 (범위: ${u.minScore}-${u.maxScore}점)`);
});
console.log();

// 품질 지표
console.log('='.repeat(80));
console.log('품질 지표');
console.log('='.repeat(80));
console.log();

const issues: string[] = [];

// 평균 점수 범위 체크 (40-60점이 이상적)
if (globalAvg < 35) {
  issues.push(`전체 평균이 너무 낮습니다 (${globalAvg.toFixed(1)}점 < 35점)`);
} else if (globalAvg > 65) {
  issues.push(`전체 평균이 너무 높습니다 (${globalAvg.toFixed(1)}점 > 65점)`);
} else {
  console.log(`✅ 전체 평균 점수: ${globalAvg.toFixed(1)}점 (목표 범위: 40-60점)`);
}

// 표준편차 체크 (10-20점이 이상적)
if (stdDev < 8) {
  issues.push(`표준편차가 너무 작습니다 (${stdDev.toFixed(1)}점 < 8점) - 변별력 부족`);
} else if (stdDev > 25) {
  issues.push(`표준편차가 너무 큽니다 (${stdDev.toFixed(1)}점 > 25점) - 과도한 변동`);
} else {
  console.log(`✅ 표준편차: ${stdDev.toFixed(1)}점 (목표 범위: 10-20점)`);
}

// S등급 희귀도 체크 (5% 이하가 이상적)
const sGradePercentage = (gradeDistribution['S'] / allGrades.length) * 100;
if (sGradePercentage > 10) {
  issues.push(`S등급 비율이 너무 높습니다 (${sGradePercentage.toFixed(1)}% > 10%)`);
} else {
  console.log(`✅ S등급 희귀도: ${sGradePercentage.toFixed(1)}% (목표: <5%)`);
}

// D등급 비율 체크 (20% 이하가 이상적)
const dGradePercentage = (gradeDistribution['D'] / allGrades.length) * 100;
if (dGradePercentage > 25) {
  issues.push(`D등급 비율이 너무 높습니다 (${dGradePercentage.toFixed(1)}% > 25%)`);
} else {
  console.log(`✅ D등급 비율: ${dGradePercentage.toFixed(1)}% (목표: <20%)`);
}

// 변동성 체크 (8-15점이 이상적)
if (avgVariance < 5) {
  issues.push(`개인별 변동성이 너무 작습니다 (${avgVariance.toFixed(1)}점 < 5점) - 월별 차이 부족`);
} else if (avgVariance > 20) {
  issues.push(`개인별 변동성이 너무 큽니다 (${avgVariance.toFixed(1)}점 > 20점) - 예측 불안정`);
} else {
  console.log(`✅ 개인별 변동성: ${avgVariance.toFixed(1)}점 (목표 범위: 8-15점)`);
}

console.log();

// 최종 평가
if (issues.length === 0) {
  console.log('🎉 모든 품질 지표를 통과했습니다!');
  console.log();
  console.log('시스템이 적절한 분포와 변별력을 가지고 있습니다. 🌟');
} else {
  console.log('⚠️  다음 이슈들이 발견되었습니다:');
  issues.forEach(issue => console.log(`   - ${issue}`));
  console.log();
  console.log('시스템 파라미터 조정이 필요할 수 있습니다.');
}

console.log();
console.log('='.repeat(80));
console.log('✅ 테스트 완료!');
console.log('='.repeat(80));
