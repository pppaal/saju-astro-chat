/**
 * 프로필 D 점수 브레이크다운 분석
 */

import { calculateTotalScore, type SajuScoreInput, type AstroScoreInput } from '../src/lib/destiny-map/calendar/scoring';

// 프로필 D: 乙卯일주 (목 일간)
// 1월의 좋은 날 vs 나쁜 날 비교

console.log("=== 프로필 D 점수 브레이크다운 ===\n");

// 좋은 날 (1월 11일, 78점) 시뮬레이션
const goodDaySaju: SajuScoreInput = {
  daeun: { sibsin: 'bijeon' },  // 대운에서 비견
  seun: { sibsin: 'bijeon' },   // 세운에서 비견
  wolun: { sibsin: 'jaeseong' }, // 월운에서 재성
  iljin: {
    sibsin: 'jeongwan',  // 일진에서 정관
    hasCheoneulGwiin: true,  // 천을귀인
    hasXing: true,  // 형
  },
  yongsin: {},
};

const goodDayAstro: AstroScoreInput = {
  transitSun: { elementRelation: 'same' },  // 같은 원소 (Virgo=earth, 1월 태양=Capricorn=earth)
  transitMoon: {},
  majorPlanets: {
    mercury: { aspect: 'trine' },  // 수성 트라인
    mars: { aspect: 'sextile' },   // 화성 섹스타일
    jupiter: { aspect: 'square' }, // 목성 스퀘어
    saturn: { isRetrograde: true },
  },
  lunarPhase: 'waxingGibbous',
  solarReturn: { daysFromBirthday: 250 },
};

console.log("=== 1월 11일 (78점 예상) ===");
const goodResult = calculateTotalScore(goodDaySaju, goodDayAstro);
console.log(`총점: ${goodResult.totalScore}점, 등급: ${goodResult.grade}`);
console.log(`사주: ${goodResult.sajuScore}점, 점성: ${goodResult.astroScore}점, 보너스: ${goodResult.crossBonus}`);
console.log("세부:");
console.log(`  대운: ${goodResult.breakdown.daeun}`);
console.log(`  세운: ${goodResult.breakdown.seun}`);
console.log(`  월운: ${goodResult.breakdown.wolun}`);
console.log(`  일진: ${goodResult.breakdown.iljin}`);
console.log(`  용신: ${goodResult.breakdown.yongsin}`);
console.log(`  트랜짓 태양: ${goodResult.breakdown.transitSun}`);
console.log(`  트랜짓 달: ${goodResult.breakdown.transitMoon}`);
console.log(`  주요 행성: ${goodResult.breakdown.majorPlanets}`);
console.log(`  달 위상: ${goodResult.breakdown.lunarPhase}`);
console.log(`  Solar Return: ${goodResult.breakdown.solarReturn}`);

// 나쁜 날 시뮬레이션
console.log("\n\n=== 나쁜 날 시뮬레이션 ===");
const badDaySaju: SajuScoreInput = {
  daeun: { hasChung: true },
  seun: { hasChung: true, isSamjaeYear: true },
  wolun: { hasChung: true },
  iljin: {
    sibsin: 'pyeonwan',  // 편관
    hasChung: true,
    hasXing: true,
  },
  yongsin: { hasKibsinMatch: true },
};

const badDayAstro: AstroScoreInput = {
  transitSun: { elementRelation: 'controlledBy' },
  transitMoon: { elementRelation: 'controlledBy', isVoidOfCourse: true },
  majorPlanets: {
    saturn: { aspect: 'square', isRetrograde: true },
    mercury: { isRetrograde: true },
  },
  lunarPhase: 'lastQuarter',
  solarReturn: { daysFromBirthday: 180 },
};

const badResult = calculateTotalScore(badDaySaju, badDayAstro);
console.log(`총점: ${badResult.totalScore}점, 등급: ${badResult.grade}`);
console.log(`사주: ${badResult.sajuScore}점, 점성: ${badResult.astroScore}점, 보너스: ${badResult.crossBonus}`);
console.log("세부:");
console.log(`  대운: ${badResult.breakdown.daeun}`);
console.log(`  세운: ${badResult.breakdown.seun}`);
console.log(`  월운: ${badResult.breakdown.wolun}`);
console.log(`  일진: ${badResult.breakdown.iljin}`);
console.log(`  용신: ${badResult.breakdown.yongsin}`);
console.log(`  트랜짓 태양: ${badResult.breakdown.transitSun}`);
console.log(`  트랜짓 달: ${badResult.breakdown.transitMoon}`);
console.log(`  주요 행성: ${badResult.breakdown.majorPlanets}`);
console.log(`  달 위상: ${badResult.breakdown.lunarPhase}`);
console.log(`  Solar Return: ${badResult.breakdown.solarReturn}`);

// 평범한 날 시뮬레이션
console.log("\n\n=== 평범한 날 시뮬레이션 ===");
const normalDaySaju: SajuScoreInput = {
  daeun: {},
  seun: {},
  wolun: {},
  iljin: { sibsin: 'bijeon' },
  yongsin: {},
};

const normalDayAstro: AstroScoreInput = {
  transitSun: { elementRelation: 'generates' },
  transitMoon: {},
  majorPlanets: {},
  lunarPhase: 'waxingCrescent',
  solarReturn: { daysFromBirthday: 100 },
};

const normalResult = calculateTotalScore(normalDaySaju, normalDayAstro);
console.log(`총점: ${normalResult.totalScore}점, 등급: ${normalResult.grade}`);
console.log(`사주: ${normalResult.sajuScore}점, 점성: ${normalResult.astroScore}점, 보너스: ${normalResult.crossBonus}`);

// 점수 범위 확인
console.log("\n\n=== 점수 범위 확인 ===");
console.log("카테고리별 최대 점수:");
console.log("  사주: 대운(5) + 세운(10) + 월운(10) + 일진(20) + 용신(5) = 50점");
console.log("  점성: 태양(10) + 달(10) + 행성(15) + 달위상(10) + SR(5) = 50점");
console.log("  교차검증 보너스: +5점");
console.log("  이론상 최대: 105점, 하지만 100점으로 제한");
console.log(`  실제 좋은 날: ${goodResult.totalScore}점`);
console.log(`  실제 나쁜 날: ${badResult.totalScore}점`);
console.log(`  실제 평범한 날: ${normalResult.totalScore}점`);
