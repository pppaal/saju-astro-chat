/**
 * 같은 점수인데 등급이 다른 케이스 확인
 * Run with: npx tsx scripts/test-grade-consistency.ts
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

console.log("=== 점수-등급 일관성 테스트 ===\n");

const result: ImportantDate[] = calculateYearlyImportantDates(2025, testProfile.saju, testProfile.astro);

// 점수별로 그룹화
const scoreGroups = new Map<number, ImportantDate[]>();
for (const day of result) {
  const score = day.score;
  if (!scoreGroups.has(score)) {
    scoreGroups.set(score, []);
  }
  scoreGroups.get(score)!.push(day);
}

// 같은 점수인데 등급이 다른 케이스 찾기
console.log("=== 같은 점수, 다른 등급 케이스 ===\n");

let inconsistentCount = 0;
for (const [score, days] of scoreGroups) {
  const grades = new Set(days.map(d => d.grade));
  if (grades.size > 1) {
    inconsistentCount++;
    console.log("점수 " + score + "점: " + days.length + "일");
    console.log("  등급 분포: " + [...grades].join(", "));

    // 각 등급별 첫 번째 예시
    for (const grade of grades) {
      const example = days.find(d => d.grade === grade)!;
      console.log("  Grade " + grade + " 예시: " + example.date + " (" + example.ganzhi + ")");

      // 충/형 여부 확인
      const hasChung = example.sajuFactorKeys.some(k => k.includes('Chung') || k.includes('충'));
      const hasXing = example.sajuFactorKeys.some(k => k.includes('Xing') || k.includes('형'));
      console.log("    충: " + hasChung + ", 형: " + hasXing);
    }
    console.log("");
  }
}

if (inconsistentCount === 0) {
  console.log("불일치 케이스 없음 - 모든 같은 점수는 같은 등급\n");
}

// 78-80점대 날짜들 상세 확인
console.log("=== 78-80점 상세 분석 ===\n");
const highScoreDays = result.filter(d => d.score >= 78 && d.score <= 80);
console.log("78-80점 날: " + highScoreDays.length + "일");

for (const day of highScoreDays.slice(0, 10)) {
  console.log(day.date + " (" + day.ganzhi + "): " + day.score + "점, Grade " + day.grade);
  const chungXing = day.sajuFactorKeys.filter(k =>
    k.toLowerCase().includes('chung') ||
    k.toLowerCase().includes('xing') ||
    k.includes('충') ||
    k.includes('형')
  );
  if (chungXing.length > 0) {
    console.log("  충/형 요소: " + chungXing.join(", "));
  }
}

// 등급별 점수 범위 확인
console.log("\n=== 등급별 점수 범위 ===\n");
for (let grade = 0; grade <= 4; grade++) {
  const gradeDays = result.filter(d => d.grade === grade);
  if (gradeDays.length > 0) {
    const scores = gradeDays.map(d => d.score);
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);
    console.log("Grade " + grade + ": " + minScore + "~" + maxScore + "점 (" + gradeDays.length + "일)");
  }
}
