/**
 * 점수 분포 시뮬레이션 테스트
 * scoring-config.ts의 로직을 복제하여 순수 JS로 테스트
 */

// 등급 임계값 (scoring-config.ts v9에서 복사)
const GRADE_THRESHOLDS = {
  grade0: 78,  // 천운: 78점 이상 (~3%)
  grade1: 68,  // 아주좋음: 68~77점 (~12%)
  grade2: 56,  // 좋음: 56~67점 (~25%)
  grade3: 45,  // 보통: 45~55점 (~35%)
  grade4: 33,  // 나쁨: 33~44점 (~17%)
  // grade5: 33 미만 (아주나쁨) (~5%)
};

// 카테고리 최대 점수
const CATEGORY_MAX_SCORES = {
  saju: {
    daeun: 8,
    seun: 12,
    wolun: 12,
    iljin: 13,
    yongsin: 5,
    total: 50,
  },
  astro: {
    transitSun: 8,
    transitMoon: 12,
    majorPlanets: 15,
    lunarPhase: 8,
    solarReturn: 7,
    total: 50,
  },
  crossBonus: 3,
  grandTotal: 100,
};

/**
 * 점수 계산 함수 (scoring-config.ts v9에서 복사)
 * 기본값 52%에서 시작, 비대칭 증폭 (양수 3.5배, 음수 3.0배)
 */
function calculateAdjustedScore(categoryMax, adjustments) {
  const baseScore = categoryMax * 0.52;
  const totalAdj = adjustments.reduce((a, b) => a + b, 0);
  // 비대칭 증폭: 양수는 3.5배, 음수는 3.0배
  const amplifiedAdj = totalAdj >= 0 ? totalAdj * 3.5 : totalAdj * 3.0;
  const adjScore = amplifiedAdj * categoryMax;
  return Math.round(Math.max(0, Math.min(categoryMax, baseScore + adjScore)) * 10) / 10;
}

/**
 * 등급 결정 함수
 */
function getGrade(score) {
  if (score >= GRADE_THRESHOLDS.grade0) return 0;
  if (score >= GRADE_THRESHOLDS.grade1) return 1;
  if (score >= GRADE_THRESHOLDS.grade2) return 2;
  if (score >= GRADE_THRESHOLDS.grade3) return 3;
  if (score >= GRADE_THRESHOLDS.grade4) return 4;
  return 5;
}

/**
 * 실제 사주/점성 조정값 시뮬레이션
 * 실제 시스템의 조정값 범위를 모방
 */
function simulateRealAdjustments() {
  // 대운: 장기적 영향, 작은 변동
  const daeunAdj = (Math.random() - 0.5) * 0.3;

  // 세운: 연간 영향
  const seunAdj = (Math.random() - 0.5) * 0.4;

  // 월운: 월간 영향
  const wolunAdj = (Math.random() - 0.5) * 0.35;

  // 일진: 일일 영향, 가장 큰 변동
  const iljinAdj = (Math.random() - 0.5) * 0.5;

  // 용신: 개인 특성
  const yongsinAdj = (Math.random() - 0.5) * 0.3;

  // 점성술 조정값들
  const transitSunAdj = (Math.random() - 0.5) * 0.3;
  const transitMoonAdj = (Math.random() - 0.5) * 0.4;
  const majorPlanetsAdj = (Math.random() - 0.5) * 0.5;
  const lunarPhaseAdj = (Math.random() - 0.5) * 0.35;
  const solarReturnAdj = (Math.random() - 0.5) * 0.25;

  return {
    saju: [daeunAdj, seunAdj, wolunAdj, iljinAdj, yongsinAdj],
    astro: [transitSunAdj, transitMoonAdj, majorPlanetsAdj, lunarPhaseAdj, solarReturnAdj],
  };
}

/**
 * 단일 날짜 점수 계산
 */
function calculateDayScore() {
  const adj = simulateRealAdjustments();

  // 각 카테고리별 점수 계산
  const daeunScore = calculateAdjustedScore(CATEGORY_MAX_SCORES.saju.daeun, [adj.saju[0]]);
  const seunScore = calculateAdjustedScore(CATEGORY_MAX_SCORES.saju.seun, [adj.saju[1]]);
  const wolunScore = calculateAdjustedScore(CATEGORY_MAX_SCORES.saju.wolun, [adj.saju[2]]);
  const iljinScore = calculateAdjustedScore(CATEGORY_MAX_SCORES.saju.iljin, [adj.saju[3]]);
  const yongsinScore = calculateAdjustedScore(CATEGORY_MAX_SCORES.saju.yongsin, [adj.saju[4]]);

  const transitSunScore = calculateAdjustedScore(CATEGORY_MAX_SCORES.astro.transitSun, [adj.astro[0]]);
  const transitMoonScore = calculateAdjustedScore(CATEGORY_MAX_SCORES.astro.transitMoon, [adj.astro[1]]);
  const majorPlanetsScore = calculateAdjustedScore(CATEGORY_MAX_SCORES.astro.majorPlanets, [adj.astro[2]]);
  const lunarPhaseScore = calculateAdjustedScore(CATEGORY_MAX_SCORES.astro.lunarPhase, [adj.astro[3]]);
  const solarReturnScore = calculateAdjustedScore(CATEGORY_MAX_SCORES.astro.solarReturn, [adj.astro[4]]);

  const sajuTotal = daeunScore + seunScore + wolunScore + iljinScore + yongsinScore;
  const astroTotal = transitSunScore + transitMoonScore + majorPlanetsScore + lunarPhaseScore + solarReturnScore;

  // 교차검증 보너스 (간단히 시뮬레이션)
  const crossBonus = (Math.random() - 0.5) * 6; // -3 ~ +3

  const totalScore = Math.round(Math.max(0, Math.min(100, sajuTotal + astroTotal + crossBonus)));

  return {
    score: totalScore,
    grade: getGrade(totalScore),
    sajuTotal: Math.round(sajuTotal * 10) / 10,
    astroTotal: Math.round(astroTotal * 10) / 10,
  };
}

// 메인 테스트
console.log('='.repeat(70));
console.log('운세 캘린더 점수 분포 시뮬레이션');
console.log('10명 x 730일 (2년) = 7,300일 시뮬레이션');
console.log('='.repeat(70));
console.log('');

console.log('[ 설정 확인 ]');
console.log('-'.repeat(50));
console.log(`천운 (Grade 0): ${GRADE_THRESHOLDS.grade0}점 이상`);
console.log(`아주좋음 (Grade 1): ${GRADE_THRESHOLDS.grade1}~${GRADE_THRESHOLDS.grade0 - 1}점`);
console.log(`좋음 (Grade 2): ${GRADE_THRESHOLDS.grade2}~${GRADE_THRESHOLDS.grade1 - 1}점`);
console.log(`보통 (Grade 3): ${GRADE_THRESHOLDS.grade3}~${GRADE_THRESHOLDS.grade2 - 1}점`);
console.log(`나쁨 (Grade 4): ${GRADE_THRESHOLDS.grade4}~${GRADE_THRESHOLDS.grade3 - 1}점`);
console.log(`아주나쁨 (Grade 5): 0~${GRADE_THRESHOLDS.grade4 - 1}점`);
console.log('');

// 10명 x 730일 시뮬레이션
const allScores = [];
const gradeCount = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
const personStats = [];

const testPersons = [
  '사람1', '사람2', '사람3', '사람4', '사람5',
  '사람6', '사람7', '사람8', '사람9', '사람10',
];

for (const person of testPersons) {
  const personScores = [];
  let personGrade0 = 0;

  // 730일 (2년) 시뮬레이션
  for (let day = 0; day < 730; day++) {
    const result = calculateDayScore();
    allScores.push(result.score);
    personScores.push(result.score);
    gradeCount[result.grade]++;
    if (result.grade === 0) personGrade0++;
  }

  const avg = personScores.reduce((a, b) => a + b, 0) / personScores.length;
  const min = Math.min(...personScores);
  const max = Math.max(...personScores);

  personStats.push({
    name: person,
    avg: Math.round(avg * 10) / 10,
    min,
    max,
    grade0: personGrade0,
  });
}

// 결과 출력
console.log('[ 개인별 통계 (730일/2년) ]');
console.log('-'.repeat(70));
console.log('이름\t\t평균\t최저\t최고\t천운일수');
console.log('-'.repeat(70));
for (const stat of personStats) {
  console.log(`${stat.name}\t\t${stat.avg}\t${stat.min}\t${stat.max}\t${stat.grade0}일`);
}

console.log('');
console.log('[ 전체 통계 ]');
console.log('-'.repeat(70));
const totalAvg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
const totalMin = Math.min(...allScores);
const totalMax = Math.max(...allScores);
console.log(`총 분석 일수: ${allScores.length.toLocaleString()}일`);
console.log(`평균 점수: ${Math.round(totalAvg * 10) / 10}점`);
console.log(`최저 점수: ${totalMin}점`);
console.log(`최고 점수: ${totalMax}점`);

console.log('');
console.log('[ 등급별 분포 ]');
console.log('-'.repeat(70));
const total = allScores.length;
const gradeInfo = [
  { name: '천운(78+)', target: 3 },
  { name: '아주좋음(68-77)', target: 12 },
  { name: '좋음(56-67)', target: 25 },
  { name: '보통(45-55)', target: 35 },
  { name: '나쁨(33-44)', target: 17 },
  { name: '아주나쁨(0-32)', target: 5 },
];

console.log('등급\t\t\t일수\t\t비율\t\t목표\t\t차이');
console.log('-'.repeat(70));
for (let i = 0; i <= 5; i++) {
  const count = gradeCount[i];
  const pct = (count / total * 100);
  const diff = pct - gradeInfo[i].target;
  const diffStr = diff >= 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1);
  const status = Math.abs(diff) <= 3 ? '✓' : (diff > 0 ? '↑' : '↓');
  console.log(`${gradeInfo[i].name}\t\t${count.toLocaleString()}일\t\t${pct.toFixed(1)}%\t\t~${gradeInfo[i].target}%\t\t${diffStr}% ${status}`);
}

// 점수 구간별 분포
console.log('');
console.log('[ 점수 구간별 분포 ]');
console.log('-'.repeat(70));
const ranges = [
  { label: '90-100', min: 90, max: 100 },
  { label: '80-89', min: 80, max: 89 },
  { label: '70-79', min: 70, max: 79 },
  { label: '60-69', min: 60, max: 69 },
  { label: '50-59', min: 50, max: 59 },
  { label: '40-49', min: 40, max: 49 },
  { label: '30-39', min: 30, max: 39 },
  { label: '20-29', min: 20, max: 29 },
  { label: '10-19', min: 10, max: 19 },
  { label: '0-9', min: 0, max: 9 },
];

for (const range of ranges) {
  const count = allScores.filter(s => s >= range.min && s <= range.max).length;
  const pct = (count / total * 100).toFixed(1);
  const bar = '█'.repeat(Math.round(parseFloat(pct) / 2));
  console.log(`${range.label}점: ${pct.padStart(5)}% ${bar} (${count.toLocaleString()}일)`);
}

console.log('');
console.log('='.repeat(70));
console.log('시뮬레이션 완료');
console.log('');
console.log('참고: 이 시뮬레이션은 실제 사주/점성술 계산 없이');
console.log('점수 분포 알고리즘만 테스트한 결과입니다.');
console.log('실제 결과는 개인의 사주와 점성 데이터에 따라 다릅니다.');
