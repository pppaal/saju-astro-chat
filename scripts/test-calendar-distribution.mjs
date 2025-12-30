/**
 * 캘린더 점수 분포 테스트 스크립트
 * 실제 1년치 데이터로 등급 분포를 확인합니다.
 */

// 점수 계산 로직 시뮬레이션 (scoring-config.ts 기반 - v5)
function calculateAdjustedScore(categoryMax, adjustments) {
  const baseScore = categoryMax * 0.45;
  const totalAdj = adjustments.reduce((a, b) => a + b, 0);
  const amplifiedAdj = totalAdj * 2.8;
  const adjScore = amplifiedAdj * categoryMax;
  return Math.round(Math.max(0, Math.min(categoryMax, baseScore + adjScore)) * 10) / 10;
}

// 랜덤 요소 생성 (실제 사주/점성술 요소 시뮬레이션)
function generateRandomSajuInput() {
  const sibsinOptions = ['inseong', 'jaeseong', 'bijeon', 'siksang', 'gwansal', 'jeongyin', 'pyeonyin', 'jeongwan', 'pyeonwan', null];

  return {
    daeun: {
      sibsin: sibsinOptions[Math.floor(Math.random() * sibsinOptions.length)],
      hasYukhap: Math.random() < 0.15,
      hasSamhapPositive: Math.random() < 0.1,
      hasChung: Math.random() < 0.12,
      hasGwansal: Math.random() < 0.08,
    },
    seun: {
      sibsin: sibsinOptions[Math.floor(Math.random() * sibsinOptions.length)],
      hasYukhap: Math.random() < 0.15,
      hasSamhapPositive: Math.random() < 0.1,
      hasChung: Math.random() < 0.12,
      isSamjaeYear: Math.random() < 0.33, // 3년에 1년
      hasGwiin: Math.random() < 0.2,
    },
    wolun: {
      sibsin: sibsinOptions[Math.floor(Math.random() * sibsinOptions.length)],
      hasYukhap: Math.random() < 0.15,
      hasChung: Math.random() < 0.12,
    },
    iljin: {
      sibsin: sibsinOptions[Math.floor(Math.random() * sibsinOptions.length)],
      hasYukhap: Math.random() < 0.08,
      hasSamhapPositive: Math.random() < 0.05,
      hasChung: Math.random() < 0.08,
      hasXing: Math.random() < 0.06,
      hasCheoneulGwiin: Math.random() < 0.03,
      hasGeonrok: Math.random() < 0.08,
      hasGongmang: Math.random() < 0.1,
      hasBackho: Math.random() < 0.05,
    },
    yongsin: {
      hasPrimaryMatch: Math.random() < 0.1,
      hasKibsinMatch: Math.random() < 0.1,
    },
  };
}

function generateRandomAstroInput() {
  const elementRelations = ['same', 'generatedBy', 'generates', 'controlledBy', 'controls'];
  const aspects = ['conjunction', 'trine', 'sextile', 'square', 'opposition', null];
  const lunarPhases = ['newMoon', 'waxingCrescent', 'firstQuarter', 'waxingGibbous', 'fullMoon', 'waningGibbous', 'lastQuarter', 'waningCrescent'];

  return {
    transitSun: {
      elementRelation: elementRelations[Math.floor(Math.random() * elementRelations.length)],
    },
    transitMoon: {
      elementRelation: elementRelations[Math.floor(Math.random() * elementRelations.length)],
      isVoidOfCourse: Math.random() < 0.12,
    },
    majorPlanets: {
      jupiter: {
        aspect: aspects[Math.floor(Math.random() * aspects.length)],
        isRetrograde: Math.random() < 0.3,
      },
      saturn: {
        aspect: aspects[Math.floor(Math.random() * aspects.length)],
        isRetrograde: Math.random() < 0.3,
      },
      mercury: {
        aspect: aspects[Math.floor(Math.random() * aspects.length)],
        isRetrograde: Math.random() < 0.2,
      },
    },
    lunarPhase: lunarPhases[Math.floor(Math.random() * lunarPhases.length)],
    solarReturn: {
      daysFromBirthday: Math.floor(Math.random() * 365),
    },
  };
}

// 점수 설정 (scoring-config.ts에서 가져옴)
const CATEGORY_MAX = {
  daeun: 8, seun: 12, wolun: 12, iljin: 13, yongsin: 5,
  transitSun: 8, transitMoon: 12, majorPlanets: 15, lunarPhase: 8, solarReturn: 7,
};

const DAEUN_SCORES = {
  inseong: 0.25, jaeseong: 0.22, bijeon: 0.15, siksang: 0.12,
  yukhap: 0.15, samhapPositive: 0.20,
  chung: -0.20, gwansal: -0.18,
};

const SEUN_SCORES = {
  inseong: 0.22, jaeseong: 0.18, bijeon: 0.12, siksang: 0.10,
  yukhap: 0.15, samhapPositive: 0.20,
  chung: -0.18, gwansal: -0.15,
  samjaeBase: -0.05, samjaeWithChung: -0.12, samjaeWithGwiin: 0.05,
};

const ILJIN_SCORES = {
  sipsin: {
    jeongyin: 0.18, pyeonyin: 0.12, jeongchaae: 0.15, pyeonchaae: 0.10,
    sikshin: 0.12, sanggwan: -0.10, jeongwan: 0.14, pyeonwan: -0.12,
    bijeon: 0.05, gyeobjae: -0.06, inseong: 0.15, jaeseong: 0.12,
  },
  branch: { yukhap: 0.15, samhapPositive: 0.20, chung: -0.18, xing: -0.12 },
  special: { cheoneulGwiin: 0.35, geonrok: 0.25 },
  negative: { gongmang: -0.15, backho: -0.10 },
};

const TRANSIT_SUN_SCORES = {
  same: 0.30, generatedBy: 0.22, generates: 0.08, controlledBy: -0.15, controls: 0.12,
};

const TRANSIT_MOON_SCORES = {
  same: 0.28, generatedBy: 0.20, generates: 0.05, controlledBy: -0.12, controls: 0.08,
  voidOfCourse: -0.15,
};

const MAJOR_PLANETS_SCORES = {
  aspects: { conjunction: 0.50, trine: 0.45, sextile: 0.30, square: -0.35, opposition: -0.25 },
  retrograde: { mercury: -0.20, jupiter: -0.08, saturn: -0.08 },
  weights: { mercury: 0.20, jupiter: 0.40, saturn: 0.25 },
};

const LUNAR_PHASE_SCORES = {
  newMoon: 0.35, waxingCrescent: 0.18, firstQuarter: -0.08, waxingGibbous: 0.25,
  fullMoon: 0.45, waningGibbous: 0.15, lastQuarter: -0.12, waningCrescent: -0.05,
};

// 점수 계산 함수들
function calcDaeunScore(input) {
  const adj = [];
  if (input.sibsin && DAEUN_SCORES[input.sibsin]) adj.push(DAEUN_SCORES[input.sibsin]);
  if (input.hasYukhap) adj.push(DAEUN_SCORES.yukhap);
  if (input.hasSamhapPositive) adj.push(DAEUN_SCORES.samhapPositive);
  if (input.hasChung) adj.push(DAEUN_SCORES.chung);
  if (input.hasGwansal) adj.push(DAEUN_SCORES.gwansal);
  return calculateAdjustedScore(CATEGORY_MAX.daeun, adj);
}

function calcSeunScore(input) {
  const adj = [];
  if (input.sibsin && SEUN_SCORES[input.sibsin]) adj.push(SEUN_SCORES[input.sibsin]);
  if (input.hasYukhap) adj.push(SEUN_SCORES.yukhap);
  if (input.hasSamhapPositive) adj.push(SEUN_SCORES.samhapPositive);
  if (input.hasChung) adj.push(SEUN_SCORES.chung);
  if (input.isSamjaeYear) {
    if (input.hasGwiin) adj.push(SEUN_SCORES.samjaeWithGwiin);
    else if (input.hasChung) adj.push(SEUN_SCORES.samjaeWithChung);
    else adj.push(SEUN_SCORES.samjaeBase);
  }
  return calculateAdjustedScore(CATEGORY_MAX.seun, adj);
}

function calcWolunScore(input) {
  const adj = [];
  if (input.sibsin && SEUN_SCORES[input.sibsin]) adj.push(SEUN_SCORES[input.sibsin] * 0.8);
  if (input.hasYukhap) adj.push(0.12);
  if (input.hasChung) adj.push(-0.15);
  return calculateAdjustedScore(CATEGORY_MAX.wolun, adj);
}

function calcIljinScore(input) {
  const adj = [];
  if (input.sibsin && ILJIN_SCORES.sipsin[input.sibsin]) adj.push(ILJIN_SCORES.sipsin[input.sibsin]);
  if (input.hasYukhap) adj.push(ILJIN_SCORES.branch.yukhap);
  if (input.hasSamhapPositive) adj.push(ILJIN_SCORES.branch.samhapPositive);
  if (input.hasChung) adj.push(ILJIN_SCORES.branch.chung);
  if (input.hasXing) adj.push(ILJIN_SCORES.branch.xing);
  if (input.hasCheoneulGwiin) adj.push(ILJIN_SCORES.special.cheoneulGwiin);
  if (input.hasGeonrok) adj.push(ILJIN_SCORES.special.geonrok);
  if (input.hasGongmang) adj.push(ILJIN_SCORES.negative.gongmang);
  if (input.hasBackho) adj.push(ILJIN_SCORES.negative.backho);
  return calculateAdjustedScore(CATEGORY_MAX.iljin, adj);
}

function calcYongsinScore(input) {
  const adj = [];
  if (input.hasPrimaryMatch) adj.push(0.30);
  if (input.hasKibsinMatch) adj.push(-0.25);
  return calculateAdjustedScore(CATEGORY_MAX.yongsin, adj);
}

function calcTransitSunScore(input) {
  const adj = [];
  if (input.elementRelation && TRANSIT_SUN_SCORES[input.elementRelation]) {
    adj.push(TRANSIT_SUN_SCORES[input.elementRelation]);
  }
  return calculateAdjustedScore(CATEGORY_MAX.transitSun, adj);
}

function calcTransitMoonScore(input) {
  const adj = [];
  if (input.elementRelation && TRANSIT_MOON_SCORES[input.elementRelation]) {
    adj.push(TRANSIT_MOON_SCORES[input.elementRelation]);
  }
  if (input.isVoidOfCourse) adj.push(TRANSIT_MOON_SCORES.voidOfCourse);
  return calculateAdjustedScore(CATEGORY_MAX.transitMoon, adj);
}

function calcMajorPlanetsScore(input) {
  const adj = [];
  for (const [planet, data] of Object.entries(input)) {
    if (!data) continue;
    const weight = MAJOR_PLANETS_SCORES.weights[planet] || 1.0;
    if (data.aspect && MAJOR_PLANETS_SCORES.aspects[data.aspect]) {
      adj.push(MAJOR_PLANETS_SCORES.aspects[data.aspect] * weight);
    }
    if (data.isRetrograde && MAJOR_PLANETS_SCORES.retrograde[planet]) {
      adj.push(MAJOR_PLANETS_SCORES.retrograde[planet]);
    }
  }
  return calculateAdjustedScore(CATEGORY_MAX.majorPlanets, adj);
}

function calcLunarPhaseScore(phase) {
  const adj = [];
  if (phase && LUNAR_PHASE_SCORES[phase]) {
    adj.push(LUNAR_PHASE_SCORES[phase]);
  }
  return calculateAdjustedScore(CATEGORY_MAX.lunarPhase, adj);
}

function calcSolarReturnScore(input) {
  const adj = [];
  const days = input.daysFromBirthday ?? 365;
  if (days === 0) adj.push(0.50);
  else if (days <= 1) adj.push(0.35);
  else if (days <= 3) adj.push(0.20);
  else if (days <= 7) adj.push(0.10);
  return calculateAdjustedScore(CATEGORY_MAX.solarReturn, adj);
}

// 전체 점수 계산
function calculateTotalScore(sajuInput, astroInput) {
  const daeun = calcDaeunScore(sajuInput.daeun);
  const seun = calcSeunScore(sajuInput.seun);
  const wolun = calcWolunScore(sajuInput.wolun);
  const iljin = calcIljinScore(sajuInput.iljin);
  const yongsin = calcYongsinScore(sajuInput.yongsin);

  const transitSun = calcTransitSunScore(astroInput.transitSun);
  const transitMoon = calcTransitMoonScore(astroInput.transitMoon);
  const majorPlanets = calcMajorPlanetsScore(astroInput.majorPlanets);
  const lunarPhase = calcLunarPhaseScore(astroInput.lunarPhase);
  const solarReturn = calcSolarReturnScore(astroInput.solarReturn);

  const sajuScore = daeun + seun + wolun + iljin + yongsin;
  const astroScore = transitSun + transitMoon + majorPlanets + lunarPhase + solarReturn;

  // 교차검증 보너스
  const sajuPositive = sajuScore > 25;
  const astroPositive = astroScore > 25;
  const sajuNegative = sajuScore < 20;
  const astroNegative = astroScore < 20;

  let crossBonus = 0;
  if (sajuPositive && astroPositive) crossBonus = 5;
  else if (sajuNegative && astroNegative) crossBonus = -4;

  const totalScore = Math.round(Math.max(0, Math.min(100, sajuScore + astroScore + crossBonus)));

  return { totalScore, sajuScore, astroScore, crossBonus };
}

// 등급 결정 (새 임계값 v2)
function getGrade(score) {
  if (score >= 85) return 0; // 천운
  if (score >= 72) return 1; // 아주좋음
  if (score >= 58) return 2; // 좋음
  if (score >= 45) return 3; // 보통
  return 4; // 나쁨
}

// 테스트 실행
console.log('='.repeat(60));
console.log('캘린더 점수 분포 테스트 (v4 - 기본값 50%)');
console.log('='.repeat(60));

const DAYS = 365;
const grades = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
const scores = [];

for (let i = 0; i < DAYS; i++) {
  const sajuInput = generateRandomSajuInput();
  const astroInput = generateRandomAstroInput();
  const result = calculateTotalScore(sajuInput, astroInput);
  const grade = getGrade(result.totalScore);

  grades[grade]++;
  scores.push(result.totalScore);
}

// 통계
scores.sort((a, b) => a - b);
const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
const min = scores[0];
const max = scores[scores.length - 1];
const median = scores[Math.floor(scores.length / 2)];

console.log('\n📊 점수 분포:');
console.log(`  평균: ${avg.toFixed(1)}`);
console.log(`  중앙값: ${median}`);
console.log(`  최저: ${min}`);
console.log(`  최고: ${max}`);

console.log('\n📈 등급 분포:');
console.log(`  천운 (85+):     ${grades[0]}일 (${(grades[0]/DAYS*100).toFixed(1)}%) - 목표: 2-5%`);
console.log(`  아주좋음 (72-84): ${grades[1]}일 (${(grades[1]/DAYS*100).toFixed(1)}%) - 목표: 10-15%`);
console.log(`  좋음 (58-71):    ${grades[2]}일 (${(grades[2]/DAYS*100).toFixed(1)}%) - 목표: 25-30%`);
console.log(`  보통 (45-57):    ${grades[3]}일 (${(grades[3]/DAYS*100).toFixed(1)}%) - 목표: 35-40%`);
console.log(`  나쁨 (0-44):     ${grades[4]}일 (${(grades[4]/DAYS*100).toFixed(1)}%) - 목표: 10-15%`);

console.log('\n📉 점수 구간별 분포:');
const ranges = [
  { label: '85-100', min: 85, max: 100 },
  { label: '72-84', min: 72, max: 84 },
  { label: '58-71', min: 58, max: 71 },
  { label: '45-57', min: 45, max: 57 },
  { label: '0-44', min: 0, max: 44 },
];

for (const range of ranges) {
  const count = scores.filter(s => s >= range.min && s <= range.max).length;
  const bar = '█'.repeat(Math.round(count / DAYS * 50));
  console.log(`  ${range.label.padStart(6)}: ${bar} ${count}`);
}

console.log('\n' + '='.repeat(60));
