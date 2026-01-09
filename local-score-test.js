/**
 * grading.ts 로직 로컬 테스트
 */

// grading.ts의 calculateGrade 로직 복제
function calculateGrade(input) {
  let gradeBonus = 0;

  // 보너스 조건
  if (input.isBirthdaySpecial) gradeBonus += 3;
  if (input.crossVerified && input.sajuPositive && input.astroPositive) gradeBonus += 2;
  if (input.totalStrengthCount >= 5 && input.sajuBadCount === 0) gradeBonus += 2;

  // 페널티 조건
  if (input.hasChung && input.hasXing) gradeBonus -= 4;
  else if (input.hasChung || input.hasXing) gradeBonus -= 2;
  if (input.totalBadCount >= 3) gradeBonus -= 3;
  else if (input.totalBadCount >= 2) gradeBonus -= 1;
  if (!input.hasNoMajorRetrograde && input.retrogradeCount >= 2) gradeBonus -= 2;

  // 제한
  gradeBonus = Math.max(-7, Math.min(5, gradeBonus));

  const adjustedScore = input.score + gradeBonus;
  const hasChungOrXing = input.hasChung || input.hasXing;

  let grade;
  if (adjustedScore >= 68 && !hasChungOrXing) {
    grade = 0; // 최고의날
  } else if (adjustedScore >= 62) {
    grade = 1; // 좋은날
  } else if (adjustedScore >= 48) {
    grade = 2; // 보통날
  } else if (adjustedScore >= 38) {
    grade = 3; // 안좋은날
  } else {
    grade = 4; // 최악의날
  }

  return { grade, adjustedScore, gradeBonus };
}

// 365일 시뮬레이션 (실제 점수 분포는 40~80 사이 정규분포 가정)
function simulateYear() {
  const gradeCount = [0, 0, 0, 0, 0];
  const scoreRanges = [];

  for (let i = 0; i < 365; i++) {
    // 실제 점수는 정규분포로 평균 55, 표준편차 12 가정
    const baseScore = Math.round(55 + (Math.random() - 0.5) * 24 + (Math.random() - 0.5) * 24);
    const score = Math.max(20, Math.min(90, baseScore));

    // 랜덤 조건들
    const hasChung = Math.random() < 0.15;  // 15% 확률
    const hasXing = Math.random() < 0.10;   // 10% 확률
    const crossVerified = Math.random() < 0.3;
    const sajuPositive = Math.random() < 0.4;
    const astroPositive = Math.random() < 0.4;
    const totalBadCount = Math.floor(Math.random() * 5);
    const retrogradeCount = Math.floor(Math.random() * 4);

    const result = calculateGrade({
      score,
      isBirthdaySpecial: i === 100,  // 생일
      crossVerified,
      sajuPositive,
      astroPositive,
      totalStrengthCount: Math.floor(Math.random() * 8),
      sajuBadCount: Math.floor(Math.random() * 3),
      hasChung,
      hasXing,
      hasNoMajorRetrograde: retrogradeCount === 0,
      retrogradeCount,
      totalBadCount,
    });

    gradeCount[result.grade]++;
    scoreRanges.push({ score, adjustedScore: result.adjustedScore, grade: result.grade });
  }

  console.log('\n📊 시뮬레이션 결과 (365일):\n');

  const labels = ['최고', '좋음', '보통', '나쁨', '최악'];
  for (let i = 0; i < 5; i++) {
    const pct = ((gradeCount[i] / 365) * 100).toFixed(1);
    console.log(`Grade ${i} (${labels[i]}): ${gradeCount[i]}개 (${pct}%)`);
  }

  // 조정점수 범위
  const adjustedScores = scoreRanges.map(r => r.adjustedScore);
  console.log(`\n조정점수 범위: ${Math.min(...adjustedScores)} ~ ${Math.max(...adjustedScores)}`);
  console.log(`조정점수 평균: ${(adjustedScores.reduce((a, b) => a + b, 0) / adjustedScores.length).toFixed(1)}`);

  // 조정점수 구간별 분포
  console.log('\n조정점수 구간별 분포:');
  const ranges = [
    { min: 0, max: 15, label: '0-14' },
    { min: 15, max: 38, label: '15-37' },
    { min: 38, max: 58, label: '38-57' },
    { min: 58, max: 70, label: '58-69' },
    { min: 70, max: 100, label: '70+' },
  ];

  for (const range of ranges) {
    const count = adjustedScores.filter(s => s >= range.min && s < (range.max === 100 ? 200 : range.max)).length;
    const pct = ((count / 365) * 100).toFixed(1);
    console.log(`  ${range.label}: ${count}개 (${pct}%)`);
  }
}

simulateYear();
