/**
 * 운세 캘린더 점수 시스템 심층 검증
 * 실제 사용 시나리오와 논리적 일관성 검증
 */

import { calculateTotalScore, type SajuScoreInput, type AstroScoreInput } from '../src/lib/destiny-map/calendar/scoring';
import { calculateGrade, type GradeInput } from '../src/lib/destiny-map/calendar/grading';

console.log('='.repeat(80));
console.log('운세 캘린더 점수 시스템 심층 검증');
console.log('='.repeat(80));
console.log();

let issueCount = 0;

// 1. 교차검증 로직 일관성 검증
console.log('1. 교차검증 로직 일관성 검증');
console.log('-'.repeat(80));

const testCases = [
  {
    name: '사주 긍정 + 점성 긍정 + 오행 일치',
    expectedBonus: 7, // bothPositive(+5) + elementAlign(+2)
    saju: 26,
    astro: 26,
    elementSame: true,
  },
  {
    name: '사주 긍정 + 점성 긍정 + 오행 불일치',
    expectedBonus: 5, // bothPositive(+5)
    saju: 26,
    astro: 26,
    elementSame: false,
  },
  {
    name: '사주 부정 + 점성 부정',
    expectedBonus: -4, // bothNegative(-4)
    saju: 19,
    astro: 19,
    elementSame: false,
  },
  {
    name: '사주 중립 + 점성 중립',
    expectedBonus: 0,
    saju: 22,
    astro: 22,
    elementSame: false,
  },
  {
    name: '사주 긍정 + 점성 부정 + 오행 일치',
    expectedBonus: 2, // elementAlign(+2)만 적용
    saju: 26,
    astro: 19,
    elementSame: true,
  },
];

testCases.forEach(tc => {
  const sajuInput: SajuScoreInput = {
    daeun: { sibsin: 'inseong', hasYukhap: false, hasSamhapPositive: false, hasChung: false, hasGwansal: false, hasSamhapNegative: false },
    seun: { sibsin: 'jaeseong', hasYukhap: false, hasSamhapPositive: false, hasChung: false, hasGwansal: false, hasSamhapNegative: false, isSamjaeYear: false, hasGwiin: false },
    wolun: { sibsin: 'bijeon', hasYukhap: false, hasSamhapPositive: false, hasChung: false, hasGwansal: false, hasSamhapNegative: false },
    iljin: {
      sibsin: 'siksang', hasYukhap: false, hasSamhapPositive: false, hasSamhapNegative: false,
      hasChung: false, hasXing: false, hasHai: false, hasCheoneulGwiin: false, hasGeonrok: false,
      hasSonEomneun: false, hasYeokma: false, hasDohwa: false, hasGongmang: false, hasWonjin: false,
      hasYangin: false, hasGoegang: false, hasHwagae: false, hasBackho: false, hasGuimungwan: false,
      hasTaegukGwiin: false, hasCheondeokGwiin: false, hasWoldeokGwiin: false,
    },
    yongsin: {
      hasPrimaryMatch: tc.saju > 25, hasSecondaryMatch: false, hasBranchMatch: false,
      hasSupport: false, hasKibsinMatch: false, hasKibsinBranch: false, hasHarm: tc.saju < 20,
      geokgukFavor: false, geokgukAvoid: false, strengthBalance: false, strengthImbalance: false,
    },
  };

  const astroInput: AstroScoreInput = {
    transitSun: { elementRelation: tc.elementSame ? 'same' : 'controls' },
    transitMoon: { elementRelation: tc.astro > 25 ? 'generatedBy' : 'controlledBy', isVoidOfCourse: false },
    majorPlanets: {
      mercury: tc.astro > 25 ? { aspect: 'trine', isRetrograde: false } : { aspect: 'opposition', isRetrograde: true },
      venus: undefined,
      mars: undefined,
      jupiter: undefined,
      saturn: undefined,
    },
    outerPlanets: undefined,
    specialPoints: undefined,
    eclipse: undefined,
    lunarPhase: 'fullMoon',
    solarReturn: { daysFromBirthday: 180, progressionSupport: false, progressionChallenge: false },
  };

  const result = calculateTotalScore(sajuInput, astroInput);

  const matches = result.crossBonus === tc.expectedBonus;
  console.log(`${tc.name}`);
  console.log(`   기대: ${tc.expectedBonus >= 0 ? '+' : ''}${tc.expectedBonus}점 | 실제: ${result.crossBonus >= 0 ? '+' : ''}${result.crossBonus}점 ${matches ? '✅' : '⚠️  불일치!'}`);

  if (!matches) {
    issueCount++;
    console.log(`   → 사주: ${result.sajuScore}점, 점성: ${result.astroScore}점`);
    console.log(`   → sajuPositive: ${result.sajuPositive}, astroPositive: ${result.astroPositive}`);
    console.log(`   → elementAligned: ${result.elementAligned}`);
  }
});

console.log();

// 2. 점수 범위 일관성 검증
console.log('2. 점수 범위 일관성 검증');
console.log('-'.repeat(80));

// 100번 무작위 테스트에서 범위 체크
function randomBool(p: number) { return Math.random() < p; }
function randomItem<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const SIPSIN_OPTIONS = ['jeongyin', 'pyeonyin', 'jeongchaae', 'pyeonchaae', 'sikshin', 'sanggwan', 'jeongwan', 'pyeonwan', 'bijeon', 'gyeobjae'];
const ELEMENT_RELATIONS = ['same', 'generatedBy', 'generates', 'controlledBy', 'controls'] as const;
const LUNAR_PHASES = ['newMoon', 'waxingCrescent', 'firstQuarter', 'waxingGibbous', 'fullMoon', 'waningGibbous', 'lastQuarter', 'waningCrescent'] as const;
const ASPECTS = ['conjunction', 'trine', 'sextile', 'square', 'opposition'];

let sajuOutOfRange = 0;
let astroOutOfRange = 0;
let totalOutOfRange = 0;

for (let i = 0; i < 100; i++) {
  const sajuInput: SajuScoreInput = {
    daeun: {
      sibsin: randomBool(0.4) ? randomItem(['inseong', 'jaeseong', 'bijeon', 'siksang']) : undefined,
      hasYukhap: randomBool(0.2), hasSamhapPositive: randomBool(0.15), hasChung: randomBool(0.15),
      hasGwansal: randomBool(0.1), hasSamhapNegative: randomBool(0.1),
    },
    seun: {
      sibsin: randomBool(0.4) ? randomItem(['inseong', 'jaeseong', 'bijeon', 'siksang']) : undefined,
      hasYukhap: randomBool(0.2), hasSamhapPositive: randomBool(0.15), hasChung: randomBool(0.15),
      hasGwansal: randomBool(0.1), hasSamhapNegative: randomBool(0.1), isSamjaeYear: randomBool(0.08),
      hasGwiin: randomBool(0.3),
    },
    wolun: {
      sibsin: randomBool(0.4) ? randomItem(['inseong', 'jaeseong', 'bijeon', 'siksang']) : undefined,
      hasYukhap: randomBool(0.2), hasSamhapPositive: randomBool(0.15), hasChung: randomBool(0.15),
      hasGwansal: randomBool(0.1), hasSamhapNegative: randomBool(0.1),
    },
    iljin: {
      sibsin: randomBool(0.6) ? randomItem(SIPSIN_OPTIONS) : undefined,
      hasYukhap: randomBool(0.2), hasSamhapPositive: randomBool(0.15), hasSamhapNegative: randomBool(0.1),
      hasChung: randomBool(0.15), hasXing: randomBool(0.1), hasHai: randomBool(0.1),
      hasCheoneulGwiin: randomBool(0.05), hasGeonrok: randomBool(0.08), hasSonEomneun: randomBool(0.1),
      hasYeokma: randomBool(0.12), hasDohwa: randomBool(0.12), hasGongmang: randomBool(0.08),
      hasWonjin: randomBool(0.08), hasYangin: randomBool(0.06), hasGoegang: randomBool(0.05),
      hasHwagae: randomBool(0.08), hasBackho: randomBool(0.06), hasGuimungwan: randomBool(0.05),
      hasTaegukGwiin: randomBool(0.03), hasCheondeokGwiin: randomBool(0.04), hasWoldeokGwiin: randomBool(0.04),
    },
    yongsin: {
      hasPrimaryMatch: randomBool(0.2), hasSecondaryMatch: randomBool(0.15), hasBranchMatch: randomBool(0.15),
      hasSupport: randomBool(0.2), hasKibsinMatch: randomBool(0.15), hasKibsinBranch: randomBool(0.1),
      hasHarm: randomBool(0.1), geokgukFavor: randomBool(0.2), geokgukAvoid: randomBool(0.15),
      strengthBalance: randomBool(0.25), strengthImbalance: randomBool(0.15),
    },
  };

  const astroInput: AstroScoreInput = {
    transitSun: { elementRelation: randomItem(ELEMENT_RELATIONS) },
    transitMoon: { elementRelation: randomItem(ELEMENT_RELATIONS), isVoidOfCourse: randomBool(0.08) },
    majorPlanets: {
      mercury: randomBool(0.3) ? { aspect: randomItem(ASPECTS), isRetrograde: randomBool(0.2) } : undefined,
      venus: randomBool(0.3) ? { aspect: randomItem(ASPECTS), isRetrograde: randomBool(0.15) } : undefined,
      mars: randomBool(0.3) ? { aspect: randomItem(ASPECTS), isRetrograde: randomBool(0.15) } : undefined,
      jupiter: randomBool(0.3) ? { aspect: randomItem(ASPECTS), isRetrograde: randomBool(0.1) } : undefined,
      saturn: randomBool(0.3) ? { aspect: randomItem(ASPECTS), isRetrograde: randomBool(0.1) } : undefined,
    },
    outerPlanets: randomBool(0.2) ? {
      uranus: randomBool(0.5) ? { aspect: randomItem(ASPECTS) } : undefined,
      neptune: randomBool(0.5) ? { aspect: randomItem(ASPECTS) } : undefined,
      pluto: randomBool(0.5) ? { aspect: randomItem(ASPECTS) } : undefined,
    } : undefined,
    specialPoints: randomBool(0.15) ? {
      chiron: randomBool(0.5) ? { aspect: randomItem(ASPECTS) } : undefined,
      northNode: randomBool(0.3) ? { aspect: randomItem(ASPECTS) } : undefined,
      southNode: randomBool(0.3) ? { aspect: randomItem(ASPECTS) } : undefined,
      lilith: randomBool(0.3) ? { aspect: randomItem(ASPECTS) } : undefined,
    } : undefined,
    eclipse: randomBool(0.03) ? {
      isEclipseDay: randomBool(0.3), isNearEclipse: randomBool(0.7),
      eclipseType: randomBool(0.5) ? 'solar' : 'lunar',
    } : undefined,
    lunarPhase: randomItem(LUNAR_PHASES),
    solarReturn: {
      daysFromBirthday: Math.floor(Math.random() * 365),
      progressionSupport: randomBool(0.2), progressionChallenge: randomBool(0.15),
    },
  };

  const result = calculateTotalScore(sajuInput, astroInput);

  if (result.sajuScore < 0 || result.sajuScore > 50) sajuOutOfRange++;
  if (result.astroScore < 0 || result.astroScore > 50) astroOutOfRange++;
  if (result.totalScore < 0 || result.totalScore > 120) totalOutOfRange++;
}

console.log(`100회 무작위 테스트 결과:`);
console.log(`   사주 점수 범위 위반 (0-50): ${sajuOutOfRange}건 ${sajuOutOfRange === 0 ? '✅' : '⚠️'}`);
console.log(`   점성술 점수 범위 위반 (0-50): ${astroOutOfRange}건 ${astroOutOfRange === 0 ? '✅' : '⚠️'}`);
console.log(`   총점 범위 위반 (0-120): ${totalOutOfRange}건 ${totalOutOfRange === 0 ? '✅' : '⚠️'}`);

if (sajuOutOfRange > 0) issueCount++;
if (astroOutOfRange > 0) issueCount++;
if (totalOutOfRange > 0) issueCount++;

console.log();

// 3. 등급 보너스 적용 후 음수 체크
console.log('3. 등급 보너스 적용 후 음수 방지 검증');
console.log('-'.repeat(80));

let negativeScoreCount = 0;

for (let i = 0; i < 100; i++) {
  const randomScore = Math.floor(Math.random() * 10); // 0-9점 (매우 낮은 점수)

  const gradeInput: GradeInput = {
    score: randomScore,
    isBirthdaySpecial: false,
    crossVerified: false,
    sajuPositive: false,
    astroPositive: false,
    totalStrengthCount: 0,
    sajuBadCount: 3,
    hasChung: true,
    hasXing: true,
    hasNoMajorRetrograde: false,
    retrogradeCount: 5,
    totalBadCount: 5,
  };

  const result = calculateGrade(gradeInput);

  if (result.adjustedScore < 0) {
    negativeScoreCount++;
    console.log(`⚠️  음수 발생: 기본 ${randomScore}점 + 보너스 ${result.gradeBonus}점 = ${result.adjustedScore}점`);
  }
}

console.log(`100회 저점수 테스트 결과:`);
console.log(`   음수 발생: ${negativeScoreCount}건 ${negativeScoreCount === 0 ? '✅' : '⚠️'}`);

if (negativeScoreCount > 0) issueCount++;

console.log();

// 4. 충형 조건 Grade 0 차단 검증
console.log('4. 충형 조건 Grade 0 차단 100% 검증');
console.log('-'.repeat(80));

const chungXingTests = [
  { score: 85, hasChung: true, hasXing: false, shouldNotBeGrade0: true },
  { score: 90, hasChung: false, hasXing: true, shouldNotBeGrade0: true },
  { score: 95, hasChung: true, hasXing: true, shouldNotBeGrade0: true },
  { score: 100, hasChung: false, hasXing: false, shouldNotBeGrade0: false },
];

let chungXingFailures = 0;

chungXingTests.forEach(test => {
  const gradeInput: GradeInput = {
    score: test.score,
    isBirthdaySpecial: false,
    crossVerified: false,
    sajuPositive: false,
    astroPositive: false,
    totalStrengthCount: 0,
    sajuBadCount: 0,
    hasChung: test.hasChung,
    hasXing: test.hasXing,
    hasNoMajorRetrograde: true,
    retrogradeCount: 0,
    totalBadCount: 0,
  };

  const result = calculateGrade(gradeInput);
  const isGrade0 = result.grade === 0;

  if (test.shouldNotBeGrade0 && isGrade0) {
    console.log(`⚠️  ${test.score}점 충:${test.hasChung} 형:${test.hasXing} → Grade ${result.grade} (Grade 0이면 안됨!)`);
    chungXingFailures++;
  } else if (!test.shouldNotBeGrade0 && !isGrade0) {
    console.log(`⚠️  ${test.score}점 충:${test.hasChung} 형:${test.hasXing} → Grade ${result.grade} (Grade 0이어야 함!)`);
    chungXingFailures++;
  } else {
    console.log(`✅ ${test.score}점 충:${test.hasChung} 형:${test.hasXing} → Grade ${result.grade}`);
  }
});

if (chungXingFailures > 0) issueCount++;

console.log();

// 5. 점수 분포 표준편차 및 변동성 체크
console.log('5. 점수 분포 통계 검증');
console.log('-'.repeat(80));

const scores: number[] = [];

for (let i = 0; i < 1000; i++) {
  const sajuInput: SajuScoreInput = {
    daeun: {
      sibsin: randomBool(0.4) ? randomItem(['inseong', 'jaeseong', 'bijeon', 'siksang']) : undefined,
      hasYukhap: randomBool(0.2), hasSamhapPositive: randomBool(0.15), hasChung: randomBool(0.15),
      hasGwansal: randomBool(0.1), hasSamhapNegative: randomBool(0.1),
    },
    seun: {
      sibsin: randomBool(0.4) ? randomItem(['inseong', 'jaeseong', 'bijeon', 'siksang']) : undefined,
      hasYukhap: randomBool(0.2), hasSamhapPositive: randomBool(0.15), hasChung: randomBool(0.15),
      hasGwansal: randomBool(0.1), hasSamhapNegative: randomBool(0.1), isSamjaeYear: randomBool(0.08),
      hasGwiin: randomBool(0.3),
    },
    wolun: {
      sibsin: randomBool(0.4) ? randomItem(['inseong', 'jaeseong', 'bijeon', 'siksang']) : undefined,
      hasYukhap: randomBool(0.2), hasSamhapPositive: randomBool(0.15), hasChung: randomBool(0.15),
      hasGwansal: randomBool(0.1), hasSamhapNegative: randomBool(0.1),
    },
    iljin: {
      sibsin: randomBool(0.6) ? randomItem(SIPSIN_OPTIONS) : undefined,
      hasYukhap: randomBool(0.2), hasSamhapPositive: randomBool(0.15), hasSamhapNegative: randomBool(0.1),
      hasChung: randomBool(0.15), hasXing: randomBool(0.1), hasHai: randomBool(0.1),
      hasCheoneulGwiin: randomBool(0.05), hasGeonrok: randomBool(0.08), hasSonEomneun: randomBool(0.1),
      hasYeokma: randomBool(0.12), hasDohwa: randomBool(0.12), hasGongmang: randomBool(0.08),
      hasWonjin: randomBool(0.08), hasYangin: randomBool(0.06), hasGoegang: randomBool(0.05),
      hasHwagae: randomBool(0.08), hasBackho: randomBool(0.06), hasGuimungwan: randomBool(0.05),
      hasTaegukGwiin: randomBool(0.03), hasCheondeokGwiin: randomBool(0.04), hasWoldeokGwiin: randomBool(0.04),
    },
    yongsin: {
      hasPrimaryMatch: randomBool(0.2), hasSecondaryMatch: randomBool(0.15), hasBranchMatch: randomBool(0.15),
      hasSupport: randomBool(0.2), hasKibsinMatch: randomBool(0.15), hasKibsinBranch: randomBool(0.1),
      hasHarm: randomBool(0.1), geokgukFavor: randomBool(0.2), geokgukAvoid: randomBool(0.15),
      strengthBalance: randomBool(0.25), strengthImbalance: randomBool(0.15),
    },
  };

  const astroInput: AstroScoreInput = {
    transitSun: { elementRelation: randomItem(ELEMENT_RELATIONS) },
    transitMoon: { elementRelation: randomItem(ELEMENT_RELATIONS), isVoidOfCourse: randomBool(0.08) },
    majorPlanets: {
      mercury: randomBool(0.3) ? { aspect: randomItem(ASPECTS), isRetrograde: randomBool(0.2) } : undefined,
      venus: randomBool(0.3) ? { aspect: randomItem(ASPECTS), isRetrograde: randomBool(0.15) } : undefined,
      mars: randomBool(0.3) ? { aspect: randomItem(ASPECTS), isRetrograde: randomBool(0.15) } : undefined,
      jupiter: randomBool(0.3) ? { aspect: randomItem(ASPECTS), isRetrograde: randomBool(0.1) } : undefined,
      saturn: randomBool(0.3) ? { aspect: randomItem(ASPECTS), isRetrograde: randomBool(0.1) } : undefined,
    },
    outerPlanets: randomBool(0.2) ? {
      uranus: randomBool(0.5) ? { aspect: randomItem(ASPECTS) } : undefined,
      neptune: randomBool(0.5) ? { aspect: randomItem(ASPECTS) } : undefined,
      pluto: randomBool(0.5) ? { aspect: randomItem(ASPECTS) } : undefined,
    } : undefined,
    specialPoints: randomBool(0.15) ? {
      chiron: randomBool(0.5) ? { aspect: randomItem(ASPECTS) } : undefined,
      northNode: randomBool(0.3) ? { aspect: randomItem(ASPECTS) } : undefined,
      southNode: randomBool(0.3) ? { aspect: randomItem(ASPECTS) } : undefined,
      lilith: randomBool(0.3) ? { aspect: randomItem(ASPECTS) } : undefined,
    } : undefined,
    eclipse: randomBool(0.03) ? {
      isEclipseDay: randomBool(0.3), isNearEclipse: randomBool(0.7),
      eclipseType: randomBool(0.5) ? 'solar' : 'lunar',
    } : undefined,
    lunarPhase: randomItem(LUNAR_PHASES),
    solarReturn: {
      daysFromBirthday: Math.floor(Math.random() * 365),
      progressionSupport: randomBool(0.2), progressionChallenge: randomBool(0.15),
    },
  };

  const scoreResult = calculateTotalScore(sajuInput, astroInput);

  const gradeInput: GradeInput = {
    score: scoreResult.totalScore,
    isBirthdaySpecial: astroInput.solarReturn.daysFromBirthday !== undefined && astroInput.solarReturn.daysFromBirthday <= 1,
    crossVerified: scoreResult.crossVerified,
    sajuPositive: scoreResult.sajuPositive,
    astroPositive: scoreResult.astroPositive,
    totalStrengthCount: (
      (sajuInput.iljin.hasCheoneulGwiin ? 1 : 0) +
      (sajuInput.iljin.hasGeonrok ? 1 : 0) +
      (sajuInput.iljin.hasTaegukGwiin ? 1 : 0) +
      (sajuInput.iljin.hasCheondeokGwiin ? 1 : 0) +
      (sajuInput.iljin.hasWoldeokGwiin ? 1 : 0)
    ),
    sajuBadCount: (
      (sajuInput.iljin.hasGongmang ? 1 : 0) +
      (sajuInput.iljin.hasWonjin ? 1 : 0) +
      (sajuInput.iljin.hasBackho ? 1 : 0)
    ),
    hasChung: sajuInput.iljin.hasChung || false,
    hasXing: sajuInput.iljin.hasXing || false,
    hasNoMajorRetrograde: !(
      astroInput.majorPlanets.mercury?.isRetrograde ||
      astroInput.majorPlanets.venus?.isRetrograde ||
      astroInput.majorPlanets.mars?.isRetrograde
    ),
    retrogradeCount: (
      (astroInput.majorPlanets.mercury?.isRetrograde ? 1 : 0) +
      (astroInput.majorPlanets.venus?.isRetrograde ? 1 : 0) +
      (astroInput.majorPlanets.mars?.isRetrograde ? 1 : 0) +
      (astroInput.majorPlanets.jupiter?.isRetrograde ? 1 : 0) +
      (astroInput.majorPlanets.saturn?.isRetrograde ? 1 : 0)
    ),
    totalBadCount: (
      (sajuInput.iljin.hasChung ? 1 : 0) +
      (sajuInput.iljin.hasXing ? 1 : 0) +
      (sajuInput.iljin.hasGongmang ? 1 : 0) +
      (sajuInput.iljin.hasWonjin ? 1 : 0) +
      (sajuInput.iljin.hasBackho ? 1 : 0)
    ),
  };

  const gradeResult = calculateGrade(gradeInput);
  scores.push(gradeResult.adjustedScore);
}

const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
const variance = scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scores.length;
const stdDev = Math.sqrt(variance);
const min = Math.min(...scores);
const max = Math.max(...scores);

console.log(`1,000회 테스트 통계 (등급 보너스 포함):`);
console.log(`   평균: ${avg.toFixed(2)}점`);
console.log(`   표준편차: ${stdDev.toFixed(2)}점`);
console.log(`   최소: ${min}점`);
console.log(`   최대: ${max}점`);
console.log(`   범위: ${max - min}점`);

// 표준편차가 너무 작거나 크면 문제
if (stdDev < 10) {
  console.log(`   ⚠️  표준편차가 너무 작습니다. 점수 변동성이 부족합니다.`);
  issueCount++;
} else if (stdDev > 25) {
  console.log(`   ⚠️  표준편차가 너무 큽니다. 점수 변동성이 과도합니다.`);
  issueCount++;
} else {
  console.log(`   ✅ 표준편차가 적절한 범위입니다 (10-25).`);
}

console.log();

// 최종 평가
console.log('='.repeat(80));
console.log('최종 평가');
console.log('='.repeat(80));

if (issueCount === 0) {
  console.log('🎉 모든 심층 검증을 통과했습니다!');
  console.log('✅ 교차검증 로직 일관성 확인');
  console.log('✅ 점수 범위 제한 확인');
  console.log('✅ 음수 방지 확인');
  console.log('✅ 충형 조건 Grade 0 차단 확인');
  console.log('✅ 점수 분포 통계 적절성 확인');
  console.log();
  console.log('시스템이 완벽하게 작동하고 있습니다! 🌟');
} else {
  console.log(`⚠️  ${issueCount}개의 이슈가 발견되었습니다.`);
  console.log('위 로그를 확인하여 문제를 해결해주세요.');
}

console.log();
console.log('='.repeat(80));
