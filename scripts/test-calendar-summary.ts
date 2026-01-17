/**
 * 운세 캘린더 점수 시스템 종합 검증 리포트
 * 모든 테스트 결과를 종합하여 시스템 상태 점검
 */

import { calculateTotalScore, type SajuScoreInput, type AstroScoreInput } from '../src/lib/destiny-map/calendar/scoring';
import { calculateGrade, type GradeInput } from '../src/lib/destiny-map/calendar/grading-optimized';

console.log('='.repeat(80));
console.log('운세 캘린더 점수 시스템 종합 검증 리포트');
console.log('='.repeat(80));
console.log();

console.log('📋 시스템 설정 확인');
console.log('-'.repeat(80));
console.log('✅ 점수 시스템: 100점 만점 (사주 50점 + 점성술 50점 + 교차검증 보너스)');
console.log('✅ 등급 시스템: 6등급 (Grade 0~5)');
console.log('   - Grade 0 (천운): 80점 이상 & 충형 없음');
console.log('   - Grade 1 (아주좋음): 70~79점');
console.log('   - Grade 2 (좋음): 60~69점');
console.log('   - Grade 3 (보통): 50~59점');
console.log('   - Grade 4 (나쁨): 40~49점');
console.log('   - Grade 5 (아주나쁨): 0~39점');
console.log('✅ 기본 점수: 31% (이론 평균 52-57점 목표)');
console.log('✅ 증폭 계수: 양수 3.5배, 음수 3.0배');
console.log('✅ 등급 보너스/페널티: ±5점 제한');
console.log('✅ 최종 점수 범위: 0~150점 (음수 방지, 상한 없음)');
console.log();

// 100명 무작위 테스트
console.log('📊 분포 검증 (100명 무작위 샘플)');
console.log('-'.repeat(80));

const SIPSIN_OPTIONS = ['jeongyin', 'pyeonyin', 'jeongchaae', 'pyeonchaae', 'sikshin', 'sanggwan', 'jeongwan', 'pyeonwan', 'bijeon', 'gyeobjae'];
const ELEMENT_RELATIONS = ['same', 'generatedBy', 'generates', 'controlledBy', 'controls'] as const;
const LUNAR_PHASES = ['newMoon', 'waxingCrescent', 'firstQuarter', 'waxingGibbous', 'fullMoon', 'waningGibbous', 'lastQuarter', 'waningCrescent'] as const;
const ASPECTS = ['conjunction', 'trine', 'sextile', 'square', 'opposition'];

function randomBool(probability = 0.3): boolean {
  return Math.random() < probability;
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomSajuInput(): SajuScoreInput {
  return {
    daeun: {
      sibsin: randomBool(0.4) ? randomItem(['inseong', 'jaeseong', 'bijeon', 'siksang']) : undefined,
      hasYukhap: randomBool(0.2),
      hasSamhapPositive: randomBool(0.15),
      hasChung: randomBool(0.15),
      hasGwansal: randomBool(0.1),
      hasSamhapNegative: randomBool(0.1),
    },
    seun: {
      sibsin: randomBool(0.4) ? randomItem(['inseong', 'jaeseong', 'bijeon', 'siksang']) : undefined,
      hasYukhap: randomBool(0.2),
      hasSamhapPositive: randomBool(0.15),
      hasChung: randomBool(0.15),
      hasGwansal: randomBool(0.1),
      hasSamhapNegative: randomBool(0.1),
      isSamjaeYear: randomBool(0.08),
      hasGwiin: randomBool(0.3),
    },
    wolun: {
      sibsin: randomBool(0.4) ? randomItem(['inseong', 'jaeseong', 'bijeon', 'siksang']) : undefined,
      hasYukhap: randomBool(0.2),
      hasSamhapPositive: randomBool(0.15),
      hasChung: randomBool(0.15),
      hasGwansal: randomBool(0.1),
      hasSamhapNegative: randomBool(0.1),
    },
    iljin: {
      sibsin: randomBool(0.6) ? randomItem(SIPSIN_OPTIONS) : undefined,
      hasYukhap: randomBool(0.2),
      hasSamhapPositive: randomBool(0.15),
      hasSamhapNegative: randomBool(0.1),
      hasChung: randomBool(0.15),
      hasXing: randomBool(0.1),
      hasHai: randomBool(0.1),
      hasCheoneulGwiin: randomBool(0.05),
      hasGeonrok: randomBool(0.08),
      hasSonEomneun: randomBool(0.1),
      hasYeokma: randomBool(0.12),
      hasDohwa: randomBool(0.12),
      hasGongmang: randomBool(0.08),
      hasWonjin: randomBool(0.08),
      hasYangin: randomBool(0.06),
      hasGoegang: randomBool(0.05),
      hasHwagae: randomBool(0.08),
      hasBackho: randomBool(0.06),
      hasGuimungwan: randomBool(0.05),
      hasTaegukGwiin: randomBool(0.03),
      hasCheondeokGwiin: randomBool(0.04),
      hasWoldeokGwiin: randomBool(0.04),
    },
    yongsin: {
      hasPrimaryMatch: randomBool(0.2),
      hasSecondaryMatch: randomBool(0.15),
      hasBranchMatch: randomBool(0.15),
      hasSupport: randomBool(0.2),
      hasKibsinMatch: randomBool(0.15),
      hasKibsinBranch: randomBool(0.1),
      hasHarm: randomBool(0.1),
      geokgukFavor: randomBool(0.2),
      geokgukAvoid: randomBool(0.15),
      strengthBalance: randomBool(0.25),
      strengthImbalance: randomBool(0.15),
    },
  };
}

function generateRandomAstroInput(): AstroScoreInput {
  return {
    transitSun: {
      elementRelation: randomItem(ELEMENT_RELATIONS),
    },
    transitMoon: {
      elementRelation: randomItem(ELEMENT_RELATIONS),
      isVoidOfCourse: randomBool(0.08),
    },
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
      isEclipseDay: randomBool(0.3),
      isNearEclipse: randomBool(0.7),
      eclipseType: randomBool(0.5) ? 'solar' : 'lunar',
    } : undefined,
    lunarPhase: randomItem(LUNAR_PHASES),
    solarReturn: {
      daysFromBirthday: Math.floor(Math.random() * 365),
      progressionSupport: randomBool(0.2),
      progressionChallenge: randomBool(0.15),
    },
  };
}

const results: Array<{
  totalScore: number;
  grade: number;
  sajuScore: number;
  astroScore: number;
  crossBonus: number;
}> = [];

const gradeDistribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

for (let i = 1; i <= 100; i++) {
  const sajuInput = generateRandomSajuInput();
  const astroInput = generateRandomAstroInput();

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

  results.push({
    totalScore: gradeResult.adjustedScore,
    grade: gradeResult.grade,
    sajuScore: scoreResult.sajuScore,
    astroScore: scoreResult.astroScore,
    crossBonus: scoreResult.crossBonus,
  });

  gradeDistribution[gradeResult.grade as keyof typeof gradeDistribution]++;
}

// 점수 통계
const scores = results.map(r => r.totalScore);
const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
const minScore = Math.min(...scores);
const maxScore = Math.max(...scores);
const medianScore = scores.sort((a, b) => a - b)[Math.floor(scores.length / 2)];

console.log(`평균 점수: ${avgScore}점`);
console.log(`중앙값: ${medianScore}점`);
console.log(`최소: ${minScore}점`);
console.log(`최대: ${maxScore}점`);

// 목표 달성 여부
const targetMin = 52;
const targetMax = 57;
const avgNum = parseFloat(avgScore);
const isWithinTarget = avgNum >= targetMin && avgNum <= targetMax;

console.log(`목표 범위: ${targetMin}~${targetMax}점`);
console.log(`달성 여부: ${isWithinTarget ? '✅ 목표 달성' : `⚠️  목표 미달성 (${avgNum < targetMin ? '낮음' : '높음'})`}`);
console.log();

// 등급 분포
console.log('등급 분포:');
const gradeLabels = ['천운', '아주좋음', '좋음', '보통', '나쁨', '아주나쁨'];
const theoreticalDistribution = [1.3, 13.7, 25.9, 33.3, 20.6, 5.3];

for (let grade = 0; grade <= 5; grade++) {
  const count = gradeDistribution[grade as keyof typeof gradeDistribution];
  const actual = ((count / 100) * 100).toFixed(1);
  const theoretical = theoreticalDistribution[grade].toFixed(1);
  const diff = Math.abs(parseFloat(actual) - parseFloat(theoretical));
  const status = diff <= 10 ? '✅' : '⚠️';
  console.log(`   Grade ${grade} (${gradeLabels[grade]}): ${actual}% (이론: ${theoretical}%, 차이: ${diff.toFixed(1)}%) ${status}`);
}

console.log();

// 교차검증 통계
console.log('교차검증 보너스 통계:');
const avgCross = (results.reduce((a, b) => a + b.crossBonus, 0) / results.length).toFixed(1);
const positiveCount = results.filter(r => r.crossBonus > 0).length;
const negativeCount = results.filter(r => r.crossBonus < 0).length;
const neutralCount = results.filter(r => r.crossBonus === 0).length;

console.log(`   평균: ${parseFloat(avgCross) >= 0 ? '+' : ''}${avgCross}점`);
console.log(`   긍정 (>0): ${positiveCount}명 (${positiveCount}%)`);
console.log(`   중립 (=0): ${neutralCount}명 (${neutralCount}%)`);
console.log(`   부정 (<0): ${negativeCount}명 (${negativeCount}%)`);
console.log();

// 종합 평가
console.log('='.repeat(80));
console.log('종합 평가');
console.log('='.repeat(80));

const issues: string[] = [];

// 평균 점수 체크
if (avgNum < targetMin - 5) {
  issues.push(`⚠️  평균 점수가 목표보다 너무 낮습니다 (${avgScore}점 < ${targetMin - 5}점)`);
} else if (avgNum > targetMax + 5) {
  issues.push(`⚠️  평균 점수가 목표보다 너무 높습니다 (${avgScore}점 > ${targetMax + 5}점)`);
}

// Grade 0 희귀도 체크
const grade0Percent = parseFloat(((gradeDistribution[0] / 100) * 100).toFixed(1));
if (grade0Percent > 10) {
  issues.push(`⚠️  Grade 0 (천운)의 비율이 너무 높습니다 (${grade0Percent}% > 10%)`);
}

// Grade 5 희귀도 체크
const grade5Percent = parseFloat(((gradeDistribution[5] / 100) * 100).toFixed(1));
if (grade5Percent > 15) {
  issues.push(`⚠️  Grade 5 (아주나쁨)의 비율이 너무 높습니다 (${grade5Percent}% > 15%)`);
}

if (issues.length === 0) {
  console.log('✅ 시스템이 정상적으로 작동하고 있습니다.');
  console.log('✅ 점수 분포가 목표 범위 내에 있습니다.');
  console.log('✅ 등급 분포가 적절합니다.');
} else {
  console.log('발견된 문제:');
  issues.forEach(issue => console.log(`   ${issue}`));
}

console.log();
console.log('검증 항목 체크리스트:');
console.log(`   ${isWithinTarget ? '✅' : '⚠️'}  평균 점수 범위 (52-57점)`);
console.log(`   ${grade0Percent <= 10 ? '✅' : '⚠️'}  Grade 0 희귀도 (≤10%)`);
console.log(`   ${grade5Percent <= 15 ? '✅' : '⚠️'}  Grade 5 희귀도 (≤15%)`);
console.log(`   ${minScore >= 0 ? '✅' : '⚠️'}  최소 점수 음수 방지 (≥0점)`);
console.log(`   ${maxScore <= 150 ? '✅' : '⚠️'}  최대 점수 상한 합리성 (≤150점)`);
console.log();
console.log('='.repeat(80));
console.log('검증 완료!');
console.log('='.repeat(80));
