/**
 * 신살 및 일식/월식 점수 연동 테스트
 * Run with: npx tsx scripts/test-shinsal-integration.ts
 */

import { calculateYearlyImportantDates } from '../src/lib/destiny-map/destinyCalendar';
import type { UserSajuProfile, UserAstroProfile, ImportantDate } from '../src/lib/destiny-map/calendar/types';

const testProfile = {
  saju: {
    dayMaster: "甲",
    dayMasterElement: "wood",
    dayBranch: "子",
    yearBranch: "寅",
    birthYear: 1990,
  } as UserSajuProfile,
  astro: {
    sunSign: "Leo",
    sunElement: "fire",
    birthMonth: 8,
    birthDay: 15,
    sunLongitude: 142.0,
  } as UserAstroProfile,
};

console.log("=== 신살 및 일식/월식 점수 연동 테스트 ===\n");

// 연간 데이터 분석 (year, sajuProfile, astroProfile 순서)
const result: ImportantDate[] = calculateYearlyImportantDates(2025, testProfile.saju, testProfile.astro);

console.log("반환된 날 수: " + result.length);
if (result.length > 0) {
  console.log("첫 날: " + result[0].date + ", 점수: " + result[0].score);
}

// 전체 연간 통계
let shinsalDays = 0;
let eclipseFactorDays = 0;
const shinsalTypes = new Set<string>();
const eclipseTypes = new Set<string>();

for (const day of result) {
  const shinsalKeys = day.sajuFactorKeys.filter(f => f.includes('shinsal_'));
  if (shinsalKeys.length > 0) {
    shinsalDays++;
    shinsalKeys.forEach(k => shinsalTypes.add(k));
  }

  const eclipseKeys = day.astroFactorKeys.filter(f =>
    f.toLowerCase().includes('eclipse')
  );
  if (eclipseKeys.length > 0) {
    eclipseFactorDays++;
    eclipseKeys.forEach(k => eclipseTypes.add(k));
  }
}

console.log("\n=== 연간 신살/일식 통계 ===\n");
console.log("신살 감지된 날: " + shinsalDays + "일");
console.log("신살 종류: " + ([...shinsalTypes].join(', ') || '없음'));
console.log("\n일식/월식 감지된 날: " + eclipseFactorDays + "일");
console.log("일식 종류: " + ([...eclipseTypes].join(', ') || '없음'));

// 샘플 출력
if (result.length > 0) {
  console.log("\n=== 샘플 데이터 (첫 5일) ===\n");
  for (const day of result.slice(0, 5)) {
    console.log(day.date + " (" + day.ganzhi + "): 점수=" + day.score + ", 등급=" + day.grade);
    console.log("  사주요소: " + day.sajuFactorKeys.slice(0, 10).join(', '));
    console.log("  점성요소: " + day.astroFactorKeys.slice(0, 10).join(', '));
  }
}

// 3월 일식 근처 날짜 확인
console.log("\n=== 3월 일식 근처 날짜 ===\n");
const eclipseDays = result.filter(d =>
  d.date === '2025-03-14' || d.date === '2025-03-29' ||
  d.date === '2025-03-13' || d.date === '2025-03-15' ||
  d.date === '2025-03-28' || d.date === '2025-03-30'
);
if (eclipseDays.length > 0) {
  for (const day of eclipseDays) {
    console.log(day.date + " (" + day.ganzhi + "): 점수=" + day.score + ", 등급=" + day.grade);
    console.log("  점성요소: " + day.astroFactorKeys.join(', '));
  }
} else {
  console.log("(일식 근처 날짜가 결과에 없음)");
}

// 신살 감지된 날 샘플
console.log("\n=== 신살 감지된 날 샘플 (최대 5개) ===\n");
const shinsalSamples = result.filter(d => d.sajuFactorKeys.some(f => f.includes('shinsal_'))).slice(0, 5);
if (shinsalSamples.length > 0) {
  for (const day of shinsalSamples) {
    const shinsals = day.sajuFactorKeys.filter(f => f.includes('shinsal_'));
    console.log(day.date + " (" + day.ganzhi + "): 점수=" + day.score);
    console.log("  신살: " + shinsals.join(', '));
  }
} else {
  console.log("(신살 감지된 날 없음)");
}
