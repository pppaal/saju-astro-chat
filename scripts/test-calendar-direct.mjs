/**
 * 직접 캘린더 계산 함수 테스트
 * destinyCalendar.ts의 calculateYearlyImportantDates를 직접 호출
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// TypeScript 모듈을 직접 import하기 어려우므로
// 대신 scoring.ts의 calculateTotalScore 로직을 테스트

// 실제 점수 분포를 시뮬레이션하기 위해
// 더 현실적인 요소 조합을 생성

console.log('='.repeat(70));
console.log('캘린더 점수 분포 테스트 (현실적 시뮬레이션)');
console.log('='.repeat(70));

// 점수 계산 (v5)
function calculateAdjustedScore(categoryMax, adjustments) {
  const baseScore = categoryMax * 0.40;
  const totalAdj = adjustments.reduce((a, b) => a + b, 0);
  const amplifiedAdj = totalAdj * 3.2;
  const adjScore = amplifiedAdj * categoryMax;
  return Math.round(Math.max(0, Math.min(categoryMax, baseScore + adjScore)) * 10) / 10;
}

// 등급 결정 (6등급 v7 임계값)
function getGrade(score) {
  if (score >= 74) return 0;  // 천운
  if (score >= 66) return 1;  // 아주좋음
  if (score >= 56) return 2;  // 좋음
  if (score >= 45) return 3;  // 보통
  if (score >= 35) return 4;  // 나쁨
  return 5;                   // 아주나쁨
}

// 카테고리 최대 점수
const MAX = {
  daeun: 8, seun: 12, wolun: 12, iljin: 13, yongsin: 5,
  transitSun: 8, transitMoon: 12, majorPlanets: 15, lunarPhase: 8, solarReturn: 7,
};

// 점수 설정값들
const SCORES = {
  sipsin: {
    jeongyin: 0.18, pyeonyin: 0.12, jeongchaae: 0.15, pyeonchaae: 0.10,
    sikshin: 0.12, sanggwan: -0.10, jeongwan: 0.14, pyeonwan: -0.12,
    bijeon: 0.05, gyeobjae: -0.06, inseong: 0.15, jaeseong: 0.12,
  },
  branch: { yukhap: 0.15, samhap: 0.20, chung: -0.18, xing: -0.12, hai: -0.08 },
  special: { cheoneul: 0.35, taeguk: 0.30, cheondeok: 0.25, woldeok: 0.20, geonrok: 0.25, sonEomneun: 0.15 },
  negative: { gongmang: -0.15, wonjin: -0.12, yangin: -0.10, backho: -0.10, guimungwan: -0.12 },
  element: { same: 0.30, generated: 0.22, generates: 0.08, controlled: -0.15, controls: 0.12 },
  aspect: { conjunction: 0.50, trine: 0.45, sextile: 0.30, square: -0.35, opposition: -0.25 },
  lunar: { newMoon: 0.35, fullMoon: 0.45, waxing: 0.18, waning: -0.05, quarter: -0.10 },
};

// 1년 365일 시뮬레이션
const DAYS = 365;
const grades = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
const scores = [];

// 월별 특성 (실제 달력처럼)
const monthlyBase = [0, 0.02, 0.05, 0.08, 0.10, 0.08, 0.05, 0.03, 0.05, 0.08, 0.05, 0.02];

for (let day = 0; day < DAYS; day++) {
  const month = Math.floor(day / 30) % 12;
  const dayOfWeek = day % 7;
  const lunarDay = day % 30; // 음력 날짜 시뮬레이션

  // 대운 (고정 - 10년 주기)
  const daeunAdj = [0.10]; // 기본적으로 약간 긍정

  // 세운 (연간)
  const seunAdj = [monthlyBase[month]];
  if (Math.random() < 0.12) seunAdj.push(SCORES.branch.chung);
  if (Math.random() < 0.15) seunAdj.push(SCORES.branch.yukhap);

  // 월운
  const wolunAdj = [];
  const sibsinRoll = Math.random();
  if (sibsinRoll < 0.10) wolunAdj.push(0.15);
  else if (sibsinRoll < 0.20) wolunAdj.push(0.12);
  else if (sibsinRoll < 0.30) wolunAdj.push(-0.10);
  else if (sibsinRoll < 0.40) wolunAdj.push(-0.08);

  // 일진 (매일 변화)
  const iljinAdj = [];

  // 십신
  const sipsinKeys = Object.keys(SCORES.sipsin);
  const randomSipsin = sipsinKeys[Math.floor(Math.random() * sipsinKeys.length)];
  iljinAdj.push(SCORES.sipsin[randomSipsin]);

  // 지지 상호작용 (확률적)
  if (Math.random() < 0.08) iljinAdj.push(SCORES.branch.yukhap);
  if (Math.random() < 0.05) iljinAdj.push(SCORES.branch.samhap);
  if (Math.random() < 0.08) iljinAdj.push(SCORES.branch.chung);
  if (Math.random() < 0.06) iljinAdj.push(SCORES.branch.xing);

  // 특수 길일 (드물게)
  if (Math.random() < 0.02) iljinAdj.push(SCORES.special.cheoneul);
  if (Math.random() < 0.03) iljinAdj.push(SCORES.special.taeguk);
  if (Math.random() < 0.08) iljinAdj.push(SCORES.special.geonrok);

  // 흉신 (확률적)
  if (Math.random() < 0.10) iljinAdj.push(SCORES.negative.gongmang);
  if (Math.random() < 0.08) iljinAdj.push(SCORES.negative.wonjin);
  if (Math.random() < 0.05) iljinAdj.push(SCORES.negative.backho);

  // 용신
  const yongsinAdj = [];
  if (Math.random() < 0.10) yongsinAdj.push(0.25);
  if (Math.random() < 0.10) yongsinAdj.push(-0.20);

  // 트랜짓 태양 (계절별)
  const sunAdj = [];
  const elementRoll = Math.random();
  if (elementRoll < 0.20) sunAdj.push(SCORES.element.same);
  else if (elementRoll < 0.40) sunAdj.push(SCORES.element.generated);
  else if (elementRoll < 0.60) sunAdj.push(SCORES.element.generates);
  else if (elementRoll < 0.80) sunAdj.push(SCORES.element.controls);
  else sunAdj.push(SCORES.element.controlled);

  // 트랜짓 달
  const moonAdj = [];
  const moonRoll = Math.random();
  if (moonRoll < 0.20) moonAdj.push(SCORES.element.same);
  else if (moonRoll < 0.40) moonAdj.push(SCORES.element.generated);
  else if (moonRoll < 0.60) moonAdj.push(SCORES.element.generates);
  else if (moonRoll < 0.80) moonAdj.push(SCORES.element.controls);
  else moonAdj.push(SCORES.element.controlled);
  if (Math.random() < 0.12) moonAdj.push(-0.15); // void of course

  // 주요 행성
  const planetAdj = [];
  // 목성 (가장 중요)
  const jupiterRoll = Math.random();
  if (jupiterRoll < 0.08) planetAdj.push(SCORES.aspect.trine * 0.4);
  else if (jupiterRoll < 0.15) planetAdj.push(SCORES.aspect.sextile * 0.4);
  else if (jupiterRoll < 0.20) planetAdj.push(SCORES.aspect.square * 0.4);

  // 토성
  const saturnRoll = Math.random();
  if (saturnRoll < 0.08) planetAdj.push(SCORES.aspect.square * 0.25);
  if (Math.random() < 0.30) planetAdj.push(-0.08); // 역행

  // 수성 역행 (연 3회, 각 3주)
  if ((day > 30 && day < 50) || (day > 150 && day < 170) || (day > 280 && day < 300)) {
    if (Math.random() < 0.7) planetAdj.push(-0.20);
  }

  // 달 위상
  const lunarAdj = [];
  if (lunarDay === 0 || lunarDay === 1) lunarAdj.push(SCORES.lunar.newMoon);
  else if (lunarDay === 14 || lunarDay === 15) lunarAdj.push(SCORES.lunar.fullMoon);
  else if (lunarDay === 7 || lunarDay === 22) lunarAdj.push(SCORES.lunar.quarter);
  else if (lunarDay < 14) lunarAdj.push(SCORES.lunar.waxing * 0.5);
  else lunarAdj.push(SCORES.lunar.waning * 0.5);

  // 생일 (1일만)
  const solarReturnAdj = [];
  if (day === 135) solarReturnAdj.push(0.50); // 5월 15일생 시뮬레이션
  else if (day === 134 || day === 136) solarReturnAdj.push(0.35);

  // 각 카테고리 점수 계산
  const daeun = calculateAdjustedScore(MAX.daeun, daeunAdj);
  const seun = calculateAdjustedScore(MAX.seun, seunAdj);
  const wolun = calculateAdjustedScore(MAX.wolun, wolunAdj);
  const iljin = calculateAdjustedScore(MAX.iljin, iljinAdj);
  const yongsin = calculateAdjustedScore(MAX.yongsin, yongsinAdj);

  const transitSun = calculateAdjustedScore(MAX.transitSun, sunAdj);
  const transitMoon = calculateAdjustedScore(MAX.transitMoon, moonAdj);
  const majorPlanets = calculateAdjustedScore(MAX.majorPlanets, planetAdj);
  const lunarPhase = calculateAdjustedScore(MAX.lunarPhase, lunarAdj);
  const solarReturn = calculateAdjustedScore(MAX.solarReturn, solarReturnAdj);

  const sajuScore = daeun + seun + wolun + iljin + yongsin;
  const astroScore = transitSun + transitMoon + majorPlanets + lunarPhase + solarReturn;

  // 교차검증
  let crossBonus = 0;
  if (sajuScore > 25 && astroScore > 25) crossBonus = 5;
  else if (sajuScore < 20 && astroScore < 20) crossBonus = -4;

  const totalScore = Math.round(Math.max(0, Math.min(100, sajuScore + astroScore + crossBonus)));
  const grade = getGrade(totalScore);

  grades[grade]++;
  scores.push(totalScore);
}

// 결과 출력
scores.sort((a, b) => a - b);
const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
const min = scores[0];
const max = scores[scores.length - 1];
const median = scores[Math.floor(scores.length / 2)];

console.log(`\n📊 점수 분포 (총 ${DAYS}일):`);
console.log(`   평균: ${avg.toFixed(1)} | 중앙값: ${median} | 최저: ${min} | 최고: ${max}`);

console.log(`\n📈 등급 분포 (6등급 시스템 v7):`);
console.log(`   천운 (74+):      ${grades[0]}일 (${(grades[0]/DAYS*100).toFixed(1)}%) - 목표: ~3%`);
console.log(`   아주좋음 (66-73): ${grades[1]}일 (${(grades[1]/DAYS*100).toFixed(1)}%) - 목표: ~12%`);
console.log(`   좋음 (56-65):    ${grades[2]}일 (${(grades[2]/DAYS*100).toFixed(1)}%) - 목표: ~25%`);
console.log(`   보통 (45-55):    ${grades[3]}일 (${(grades[3]/DAYS*100).toFixed(1)}%) - 목표: ~35%`);
console.log(`   나쁨 (35-44):    ${grades[4]}일 (${(grades[4]/DAYS*100).toFixed(1)}%) - 목표: ~17%`);
console.log(`   아주나쁨 (0-34): ${grades[5]}일 (${(grades[5]/DAYS*100).toFixed(1)}%) - 목표: ~5%`);

console.log(`\n📉 히스토그램:`);
const ranges = [
  { label: '74-100', min: 74, max: 100, icon: '🟡' },
  { label: '66-73', min: 66, max: 73, icon: '🟢' },
  { label: '56-65', min: 56, max: 65, icon: '🔵' },
  { label: '45-55', min: 45, max: 55, icon: '⚪' },
  { label: '35-44', min: 35, max: 44, icon: '🟠' },
  { label: '0-34', min: 0, max: 34, icon: '🔴' },
];

for (const range of ranges) {
  const count = scores.filter(s => s >= range.min && s <= range.max).length;
  const bar = '█'.repeat(Math.round(count / DAYS * 50));
  console.log(`   ${range.icon} ${range.label.padStart(6)}: ${bar} ${count}`);
}

// 평가
console.log('\n' + '='.repeat(70));
console.log('📋 평가:');

const checks = [
  { name: '천운', actual: grades[0]/DAYS*100, target: [2, 5] },
  { name: '아주좋음', actual: grades[1]/DAYS*100, target: [10, 15] },
  { name: '좋음', actual: grades[2]/DAYS*100, target: [25, 32] },
  { name: '보통', actual: grades[3]/DAYS*100, target: [30, 40] },
  { name: '나쁨', actual: grades[4]/DAYS*100, target: [12, 18] },
  { name: '아주나쁨', actual: grades[5]/DAYS*100, target: [3, 8] },
];

for (const check of checks) {
  const inRange = check.actual >= check.target[0] && check.actual <= check.target[1];
  const status = inRange ? '✅' : (check.actual < check.target[0] ? '⬇️ 부족' : '⬆️ 초과');
  console.log(`   ${check.name}: ${check.actual.toFixed(1)}% (목표: ${check.target[0]}-${check.target[1]}%) ${status}`);
}

console.log('='.repeat(70));
