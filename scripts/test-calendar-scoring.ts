/**
 * 운세 캘린더 점수 시스템 테스트
 * 20명의 무작위 사용자 데이터로 점수 분포 확인
 */

import { calculateTotalScore, type SajuScoreInput, type AstroScoreInput } from '../src/lib/destiny-map/calendar/scoring';
import { calculateGrade, type GradeInput } from '../src/lib/destiny-map/calendar/grading-optimized';

// 무작위 사주 요소 생성
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
      isSamjaeYear: randomBool(0.08), // 삼재년 확률 낮게
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
      hasCheoneulGwiin: randomBool(0.05), // 천을귀인 희귀
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
      hasTaegukGwiin: randomBool(0.03), // 태극귀인 매우 희귀
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
    eclipse: randomBool(0.03) ? { // 일식/월식 매우 희귀
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

// 테스트 실행
console.log('='.repeat(80));
console.log('운세 캘린더 점수 시스템 테스트 - 20명 무작위 검사');
console.log('='.repeat(80));
console.log();

const results: Array<{
  name: string;
  totalScore: number;
  grade: number;
  sajuScore: number;
  astroScore: number;
  crossBonus: number;
}> = [];

const gradeDistribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

for (let i = 1; i <= 20; i++) {
  const sajuInput = generateRandomSajuInput();
  const astroInput = generateRandomAstroInput();

  const scoreResult = calculateTotalScore(sajuInput, astroInput);

  // GradeInput 생성
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

  const name = `사용자${i}`;

  results.push({
    name,
    totalScore: gradeResult.adjustedScore,
    grade: gradeResult.grade,
    sajuScore: scoreResult.sajuScore,
    astroScore: scoreResult.astroScore,
    crossBonus: scoreResult.crossBonus,
  });

  gradeDistribution[gradeResult.grade as keyof typeof gradeDistribution]++;

  const gradeLabel = ['천운', '아주좋음', '좋음', '보통', '나쁨', '아주나쁨'][gradeResult.grade];
  const gradeEmoji = ['🌟', '😊', '🙂', '😐', '😟', '😰'][gradeResult.grade];

  console.log(`${name.padEnd(8)} │ 총점: ${String(gradeResult.adjustedScore).padStart(5)}점 │ 등급: Grade ${gradeResult.grade} ${gradeEmoji} ${gradeLabel.padEnd(8)} │ 사주: ${String(scoreResult.sajuScore).padStart(4)}점 │ 점성: ${String(scoreResult.astroScore).padStart(4)}점 │ 보너스: ${gradeResult.gradeBonus >= 0 ? '+' : ''}${gradeResult.gradeBonus}점`);
}

console.log();
console.log('='.repeat(80));
console.log('통계 요약');
console.log('='.repeat(80));
console.log();

// 점수 통계
const scores = results.map(r => r.totalScore);
const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
const minScore = Math.min(...scores);
const maxScore = Math.max(...scores);

console.log('📊 점수 분포:');
console.log(`   평균: ${avgScore}점`);
console.log(`   최소: ${minScore}점`);
console.log(`   최대: ${maxScore}점`);
console.log();

// 등급 분포
console.log('🎯 등급 분포:');
const gradeLabels = ['천운', '아주좋음', '좋음', '보통', '나쁨', '아주나쁨'];
const gradeEmojis = ['🌟', '😊', '🙂', '😐', '😟', '😰'];

for (let grade = 0; grade <= 5; grade++) {
  const count = gradeDistribution[grade as keyof typeof gradeDistribution];
  const percentage = ((count / 20) * 100).toFixed(1);
  const bar = '█'.repeat(Math.floor(count));
  console.log(`   Grade ${grade} ${gradeEmojis[grade]} ${gradeLabels[grade].padEnd(8)} │ ${String(count).padStart(2)}명 (${String(percentage).padStart(5)}%) ${bar}`);
}

console.log();

// 이론적 분포와 비교
console.log('📈 이론적 분포와 비교:');
const theoreticalDistribution = [1.3, 13.7, 25.9, 33.3, 20.6, 5.3];
for (let grade = 0; grade <= 5; grade++) {
  const actual = ((gradeDistribution[grade as keyof typeof gradeDistribution] / 20) * 100).toFixed(1);
  const theoretical = theoreticalDistribution[grade].toFixed(1);
  const diff = (parseFloat(actual) - parseFloat(theoretical)).toFixed(1);
  const diffSign = parseFloat(diff) >= 0 ? '+' : '';
  console.log(`   Grade ${grade} ${gradeEmojis[grade]} ${gradeLabels[grade].padEnd(8)} │ 실제: ${String(actual).padStart(5)}% │ 이론: ${String(theoretical).padStart(5)}% │ 차이: ${diffSign}${diff}%`);
}

console.log();

// 사주/점성술 평균
const avgSaju = (results.reduce((a, b) => a + b.sajuScore, 0) / results.length).toFixed(1);
const avgAstro = (results.reduce((a, b) => a + b.astroScore, 0) / results.length).toFixed(1);
const avgCross = (results.reduce((a, b) => a + b.crossBonus, 0) / results.length).toFixed(1);

console.log('⚖️  점수 구성 평균:');
console.log(`   사주 점수: ${avgSaju}점 / 50점`);
console.log(`   점성술 점수: ${avgAstro}점 / 50점`);
console.log(`   교차검증 보너스: ${avgCross >= '0' ? '+' : ''}${avgCross}점`);

console.log();
console.log('='.repeat(80));
console.log('✅ 테스트 완료!');
console.log('='.repeat(80));
