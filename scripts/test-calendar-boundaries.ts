/**
 * 운세 캘린더 경계값 테스트
 * 점수 시스템의 상한/하한 및 경계 조건 검증
 */

import { calculateTotalScore, type SajuScoreInput, type AstroScoreInput } from '../src/lib/destiny-map/calendar/scoring';
import { calculateGrade, type GradeInput } from '../src/lib/destiny-map/calendar/grading-optimized';

console.log('='.repeat(80));
console.log('운세 캘린더 경계값 테스트');
console.log('='.repeat(80));
console.log();

// 1. 점수 상한 테스트 (100점 초과 방지)
console.log('1. 점수 상한 테스트 (100점 초과 여부 확인)');
console.log('-'.repeat(80));

const maxSajuInput: SajuScoreInput = {
  daeun: {
    sibsin: 'inseong',
    hasYukhap: true,
    hasSamhapPositive: true,
    hasChung: false,
    hasGwansal: false,
    hasSamhapNegative: false,
  },
  seun: {
    sibsin: 'jaeseong',
    hasYukhap: true,
    hasSamhapPositive: true,
    hasChung: false,
    hasGwansal: false,
    hasSamhapNegative: false,
    isSamjaeYear: false,
    hasGwiin: true,
  },
  wolun: {
    sibsin: 'bijeon',
    hasYukhap: true,
    hasSamhapPositive: true,
    hasChung: false,
    hasGwansal: false,
    hasSamhapNegative: false,
  },
  iljin: {
    sibsin: 'siksang',
    hasYukhap: true,
    hasSamhapPositive: true,
    hasSamhapNegative: false,
    hasChung: false,
    hasXing: false,
    hasHai: false,
    hasCheoneulGwiin: true,
    hasGeonrok: true,
    hasSonEomneun: false,
    hasYeokma: false,
    hasDohwa: false,
    hasGongmang: false,
    hasWonjin: false,
    hasYangin: false,
    hasGoegang: false,
    hasHwagae: false,
    hasBackho: false,
    hasGuimungwan: true,
    hasTaegukGwiin: true,
    hasCheondeokGwiin: true,
    hasWoldeokGwiin: true,
  },
  yongsin: {
    hasPrimaryMatch: true,
    hasSecondaryMatch: true,
    hasBranchMatch: true,
    hasSupport: true,
    hasKibsinMatch: true,
    hasKibsinBranch: true,
    hasHarm: false,
    geokgukFavor: true,
    geokgukAvoid: false,
    strengthBalance: true,
    strengthImbalance: false,
  },
};

const maxAstroInput: AstroScoreInput = {
  transitSun: {
    elementRelation: 'same',
  },
  transitMoon: {
    elementRelation: 'generatedBy',
    isVoidOfCourse: false,
  },
  majorPlanets: {
    mercury: { aspect: 'trine', isRetrograde: false },
    venus: { aspect: 'trine', isRetrograde: false },
    mars: { aspect: 'sextile', isRetrograde: false },
    jupiter: { aspect: 'trine', isRetrograde: false },
    saturn: { aspect: 'sextile', isRetrograde: false },
  },
  outerPlanets: {
    uranus: { aspect: 'trine' },
    neptune: { aspect: 'sextile' },
    pluto: { aspect: 'trine' },
  },
  specialPoints: {
    chiron: { aspect: 'sextile' },
    northNode: { aspect: 'trine' },
    southNode: undefined,
    lilith: { aspect: 'sextile' },
  },
  eclipse: {
    isEclipseDay: false,
    isNearEclipse: false,
    eclipseType: 'solar',
  },
  lunarPhase: 'fullMoon',
  solarReturn: {
    daysFromBirthday: 0,
    progressionSupport: true,
    progressionChallenge: false,
  },
};

const maxScoreResult = calculateTotalScore(maxSajuInput, maxAstroInput);

console.log(`사주 점수: ${maxScoreResult.sajuScore}점 / 50점 (${maxScoreResult.sajuScore > 50 ? '⚠️  50점 초과!' : '✅ 정상'})`);
console.log(`점성술 점수: ${maxScoreResult.astroScore}점 / 50점 (${maxScoreResult.astroScore > 50 ? '⚠️  50점 초과!' : '✅ 정상'})`);
console.log(`교차검증 보너스: ${maxScoreResult.crossBonus >= 0 ? '+' : ''}${maxScoreResult.crossBonus}점`);
console.log(`기본 총점: ${maxScoreResult.totalScore}점 (${maxScoreResult.totalScore > 150 ? '⚠️  비정상적으로 높음!' : maxScoreResult.totalScore > 100 ? '⚠️  100점 초과' : '✅ 정상'})`);

const maxGradeInput: GradeInput = {
  score: maxScoreResult.totalScore,
  isBirthdaySpecial: true,
  crossVerified: maxScoreResult.crossVerified,
  sajuPositive: maxScoreResult.sajuPositive,
  astroPositive: maxScoreResult.astroPositive,
  totalStrengthCount: 5,
  sajuBadCount: 0,
  hasChung: false,
  hasXing: false,
  hasNoMajorRetrograde: true,
  retrogradeCount: 0,
  totalBadCount: 0,
};

const maxGradeResult = calculateGrade(maxGradeInput);

console.log(`등급 보너스: ${maxGradeResult.gradeBonus >= 0 ? '+' : ''}${maxGradeResult.gradeBonus}점 (제한: ±5점)`);
console.log(`최종 점수: ${maxGradeResult.adjustedScore}점`);
console.log(`등급: Grade ${maxGradeResult.grade}`);
console.log();

// 2. 점수 하한 테스트 (음수 방지)
console.log('2. 점수 하한 테스트 (음수 방지 확인)');
console.log('-'.repeat(80));

const minSajuInput: SajuScoreInput = {
  daeun: {
    sibsin: undefined,
    hasYukhap: false,
    hasSamhapPositive: false,
    hasChung: true,
    hasGwansal: true,
    hasSamhapNegative: true,
  },
  seun: {
    sibsin: undefined,
    hasYukhap: false,
    hasSamhapPositive: false,
    hasChung: true,
    hasGwansal: true,
    hasSamhapNegative: true,
    isSamjaeYear: true,
    hasGwiin: false,
  },
  wolun: {
    sibsin: undefined,
    hasYukhap: false,
    hasSamhapPositive: false,
    hasChung: true,
    hasGwansal: true,
    hasSamhapNegative: true,
  },
  iljin: {
    sibsin: undefined,
    hasYukhap: false,
    hasSamhapPositive: false,
    hasSamhapNegative: true,
    hasChung: true,
    hasXing: true,
    hasHai: true,
    hasCheoneulGwiin: false,
    hasGeonrok: false,
    hasSonEomneun: true,
    hasYeokma: true,
    hasDohwa: true,
    hasGongmang: true,
    hasWonjin: true,
    hasYangin: true,
    hasGoegang: true,
    hasHwagae: true,
    hasBackho: true,
    hasGuimungwan: false,
    hasTaegukGwiin: false,
    hasCheondeokGwiin: false,
    hasWoldeokGwiin: false,
  },
  yongsin: {
    hasPrimaryMatch: false,
    hasSecondaryMatch: false,
    hasBranchMatch: false,
    hasSupport: false,
    hasKibsinMatch: false,
    hasKibsinBranch: false,
    hasHarm: true,
    geokgukFavor: false,
    geokgukAvoid: true,
    strengthBalance: false,
    strengthImbalance: true,
  },
};

const minAstroInput: AstroScoreInput = {
  transitSun: {
    elementRelation: 'controlledBy',
  },
  transitMoon: {
    elementRelation: 'controlledBy',
    isVoidOfCourse: true,
  },
  majorPlanets: {
    mercury: { aspect: 'opposition', isRetrograde: true },
    venus: { aspect: 'square', isRetrograde: true },
    mars: { aspect: 'opposition', isRetrograde: true },
    jupiter: { aspect: 'square', isRetrograde: true },
    saturn: { aspect: 'opposition', isRetrograde: true },
  },
  outerPlanets: {
    uranus: { aspect: 'square' },
    neptune: { aspect: 'opposition' },
    pluto: { aspect: 'square' },
  },
  specialPoints: {
    chiron: { aspect: 'opposition' },
    northNode: undefined,
    southNode: { aspect: 'square' },
    lilith: { aspect: 'opposition' },
  },
  eclipse: {
    isEclipseDay: true,
    isNearEclipse: true,
    eclipseType: 'lunar',
  },
  lunarPhase: 'newMoon',
  solarReturn: {
    daysFromBirthday: 182,
    progressionSupport: false,
    progressionChallenge: true,
  },
};

const minScoreResult = calculateTotalScore(minSajuInput, minAstroInput);

console.log(`사주 점수: ${minScoreResult.sajuScore}점 / 50점 (${minScoreResult.sajuScore < 0 ? '⚠️  음수!' : '✅ 정상'})`);
console.log(`점성술 점수: ${minScoreResult.astroScore}점 / 50점 (${minScoreResult.astroScore < 0 ? '⚠️  음수!' : '✅ 정상'})`);
console.log(`교차검증 보너스: ${minScoreResult.crossBonus >= 0 ? '+' : ''}${minScoreResult.crossBonus}점`);
console.log(`기본 총점: ${minScoreResult.totalScore}점 (${minScoreResult.totalScore < 0 ? '⚠️  음수!' : '✅ 정상'})`);

const minGradeInput: GradeInput = {
  score: minScoreResult.totalScore,
  isBirthdaySpecial: false,
  crossVerified: minScoreResult.crossVerified,
  sajuPositive: minScoreResult.sajuPositive,
  astroPositive: minScoreResult.astroPositive,
  totalStrengthCount: 0,
  sajuBadCount: 3,
  hasChung: true,
  hasXing: true,
  hasNoMajorRetrograde: false,
  retrogradeCount: 5,
  totalBadCount: 5,
};

const minGradeResult = calculateGrade(minGradeInput);

console.log(`등급 보너스: ${minGradeResult.gradeBonus >= 0 ? '+' : ''}${minGradeResult.gradeBonus}점 (제한: ±5점)`);
console.log(`최종 점수: ${minGradeResult.adjustedScore}점 (${minGradeResult.adjustedScore < 0 ? '⚠️  음수!' : '✅ 정상'})`);
console.log(`등급: Grade ${minGradeResult.grade}`);
console.log();

// 3. 등급 경계값 테스트
console.log('3. 등급 경계값 테스트');
console.log('-'.repeat(80));

const gradeBoundaries = [
  { boundary: 80, expectedGrade: 0, name: 'Grade 0 하한 (80점)' },
  { boundary: 79, expectedGrade: 1, name: 'Grade 1 상한 (79점)' },
  { boundary: 70, expectedGrade: 1, name: 'Grade 1 하한 (70점)' },
  { boundary: 69, expectedGrade: 2, name: 'Grade 2 상한 (69점)' },
  { boundary: 60, expectedGrade: 2, name: 'Grade 2 하한 (60점)' },
  { boundary: 59, expectedGrade: 3, name: 'Grade 3 상한 (59점)' },
  { boundary: 50, expectedGrade: 3, name: 'Grade 3 하한 (50점)' },
  { boundary: 49, expectedGrade: 4, name: 'Grade 4 상한 (49점)' },
  { boundary: 40, expectedGrade: 4, name: 'Grade 4 하한 (40점)' },
  { boundary: 39, expectedGrade: 5, name: 'Grade 5 상한 (39점)' },
  { boundary: 0, expectedGrade: 5, name: 'Grade 5 하한 (0점)' },
];

const boundaryTestInput: GradeInput = {
  score: 0, // 이 값을 변경하며 테스트
  isBirthdaySpecial: false,
  crossVerified: false,
  sajuPositive: false,
  astroPositive: false,
  totalStrengthCount: 0,
  sajuBadCount: 0,
  hasChung: false,
  hasXing: false,
  hasNoMajorRetrograde: true,
  retrogradeCount: 0,
  totalBadCount: 0,
};

let boundaryErrors = 0;

gradeBoundaries.forEach(({ boundary, expectedGrade, name }) => {
  boundaryTestInput.score = boundary;
  const result = calculateGrade(boundaryTestInput);
  const isCorrect = result.grade === expectedGrade;

  console.log(`${name}: Grade ${result.grade} (기대: Grade ${expectedGrade}) ${isCorrect ? '✅' : '⚠️  오류!'}`);

  if (!isCorrect) {
    boundaryErrors++;
  }
});

console.log();
if (boundaryErrors === 0) {
  console.log('✅ 모든 등급 경계값이 정상적으로 작동합니다.');
} else {
  console.log(`⚠️  ${boundaryErrors}개의 등급 경계값 오류가 발견되었습니다.`);
}
console.log();

// 4. 천운(Grade 0) 조건 검증
console.log('4. 천운(Grade 0) 조건 검증');
console.log('-'.repeat(80));

// 4-1. 80점 이상, 충형 없음 → Grade 0
const case1Input: GradeInput = {
  score: 80,
  isBirthdaySpecial: false,
  crossVerified: false,
  sajuPositive: false,
  astroPositive: false,
  totalStrengthCount: 0,
  sajuBadCount: 0,
  hasChung: false,
  hasXing: false,
  hasNoMajorRetrograde: true,
  retrogradeCount: 0,
  totalBadCount: 0,
};
const case1Result = calculateGrade(case1Input);
console.log(`케이스 1: 80점, 충 없음, 형 없음 → Grade ${case1Result.grade} ${case1Result.grade === 0 ? '✅' : '⚠️  Grade 0이어야 함!'}`);

// 4-2. 80점 이상, 충 있음 → Grade 1
const case2Input: GradeInput = {
  ...case1Input,
  hasChung: true,
};
const case2Result = calculateGrade(case2Input);
console.log(`케이스 2: 80점, 충 있음, 형 없음 → Grade ${case2Result.grade} ${case2Result.grade !== 0 ? '✅' : '⚠️  Grade 0이 아니어야 함!'}`);

// 4-3. 80점 이상, 형 있음 → Grade 1
const case3Input: GradeInput = {
  ...case1Input,
  hasXing: true,
};
const case3Result = calculateGrade(case3Input);
console.log(`케이스 3: 80점, 충 없음, 형 있음 → Grade ${case3Result.grade} ${case3Result.grade !== 0 ? '✅' : '⚠️  Grade 0이 아니어야 함!'}`);

// 4-4. 80점 이상, 충+형 모두 있음 → Grade 1
const case4Input: GradeInput = {
  ...case1Input,
  hasChung: true,
  hasXing: true,
};
const case4Result = calculateGrade(case4Input);
console.log(`케이스 4: 80점, 충 있음, 형 있음 → Grade ${case4Result.grade} ${case4Result.grade !== 0 ? '✅' : '⚠️  Grade 0이 아니어야 함!'}`);

console.log();

// 5. 보너스/페널티 제한 검증 (±5점)
console.log('5. 보너스/페널티 제한 검증 (±5점)');
console.log('-'.repeat(80));

const bonusTestInput: GradeInput = {
  score: 50,
  isBirthdaySpecial: true, // +3
  crossVerified: true,
  sajuPositive: true,
  astroPositive: true, // +2
  totalStrengthCount: 5,
  sajuBadCount: 0, // +2
  hasChung: false,
  hasXing: false,
  hasNoMajorRetrograde: true,
  retrogradeCount: 0,
  totalBadCount: 0,
};
const bonusTestResult = calculateGrade(bonusTestInput);
console.log(`최대 보너스 테스트 (생일+교차검증+강함): ${bonusTestResult.gradeBonus >= 0 ? '+' : ''}${bonusTestResult.gradeBonus}점 ${Math.abs(bonusTestResult.gradeBonus) <= 5 ? '✅' : '⚠️  ±5점 초과!'}`);

const penaltyTestInput: GradeInput = {
  score: 50,
  isBirthdaySpecial: false,
  crossVerified: false,
  sajuPositive: false,
  astroPositive: false,
  totalStrengthCount: 0,
  sajuBadCount: 0,
  hasChung: true,
  hasXing: true, // -3
  hasNoMajorRetrograde: false,
  retrogradeCount: 3, // -2
  totalBadCount: 3, // -2
};
const penaltyTestResult = calculateGrade(penaltyTestInput);
console.log(`최대 페널티 테스트 (충형+역행+나쁨): ${penaltyTestResult.gradeBonus >= 0 ? '+' : ''}${penaltyTestResult.gradeBonus}점 ${Math.abs(penaltyTestResult.gradeBonus) <= 5 ? '✅' : '⚠️  ±5점 초과!'}`);

console.log();
console.log('='.repeat(80));
console.log('경계값 테스트 완료!');
console.log('='.repeat(80));
