/**
 * 같은 점수인데 등급이 다른 케이스 상세 분석
 * Run with: npx tsx scripts/test-grade-detail.ts
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

const result: ImportantDate[] = calculateYearlyImportantDates(2025, testProfile.saju, testProfile.astro);

// 66점 날짜들 상세 비교
console.log("=== 66점 날짜들 상세 분석 ===\n");

const score66 = result.filter(d => d.score === 66);
console.log("총 " + score66.length + "일\n");

for (const day of score66.slice(0, 6)) {
  console.log(day.date + " (" + day.ganzhi + "): Grade " + day.grade);
  console.log("  crossVerified: " + day.crossVerified);

  // 충/형 확인
  const hasChung = day.sajuFactorKeys.some(k =>
    k.toLowerCase().includes('chung') || k.includes('충')
  );
  const hasXing = day.sajuFactorKeys.some(k =>
    k.toLowerCase().includes('xing') || k.includes('형')
  );
  console.log("  충: " + hasChung + ", 형: " + hasXing);

  // 관련 요소들
  const relevantFactors = day.sajuFactorKeys.filter(k =>
    k.toLowerCase().includes('chung') ||
    k.toLowerCase().includes('xing') ||
    k.includes('충') ||
    k.includes('형') ||
    k.includes('retrograde')
  );
  if (relevantFactors.length > 0) {
    console.log("  관련 요소: " + relevantFactors.join(", "));
  }

  // 역행 확인
  const retrograde = day.astroFactorKeys.filter(k =>
    k.toLowerCase().includes('retrograde')
  );
  if (retrograde.length > 0) {
    console.log("  역행: " + retrograde.join(", "));
  }

  console.log("");
}
