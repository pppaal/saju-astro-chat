/**
 * 월별 등급 분포 테스트
 * 천운이 월별로 몇 개씩 나오는지 확인
 * Run with: npx tsx scripts/test-monthly-dist.ts
 */

import { calculateYearlyImportantDates } from '../src/lib/destiny-map/destinyCalendar';
import type { UserSajuProfile, UserAstroProfile } from '../src/lib/destiny-map/calendar/types';

// 다양한 프로필 테스트
const profiles = [
  {
    name: "프로필 A",
    saju: { dayMaster: "甲", dayMasterElement: "wood", dayBranch: "子", yearBranch: "寅", birthYear: 1990 },
    astro: { sunSign: "Leo", sunElement: "fire", birthMonth: 8, birthDay: 15, sunLongitude: 142.5 },
  },
  {
    name: "프로필 B",
    saju: { dayMaster: "丙", dayMasterElement: "fire", dayBranch: "午", yearBranch: "戌", birthYear: 1985 },
    astro: { sunSign: "Aries", sunElement: "fire", birthMonth: 4, birthDay: 5, sunLongitude: 15.0 },
  },
  {
    name: "프로필 C",
    saju: { dayMaster: "庚", dayMasterElement: "metal", dayBranch: "寅", yearBranch: "申", birthYear: 1992 },
    astro: { sunSign: "Scorpio", sunElement: "water", birthMonth: 11, birthDay: 15, sunLongitude: 223.0 },
  },
  {
    name: "프로필 D",
    saju: { dayMaster: "乙", dayMasterElement: "wood", dayBranch: "卯", yearBranch: "未", birthYear: 1988 },
    astro: { sunSign: "Virgo", sunElement: "earth", birthMonth: 9, birthDay: 10, sunLongitude: 167.0 },
  },
];

function testMonthlyDistribution() {
  console.log("=== 월별 등급 분포 테스트 ===\n");

  for (const profile of profiles) {
    console.log(`\n### ${profile.name} ###`);
    console.log(`일간: ${profile.saju.dayMaster} (${profile.saju.dayMasterElement}), 태양: ${profile.astro.sunSign}\n`);

    const result = calculateYearlyImportantDates(2025, profile.saju as any, profile.astro as any);

    // 월별 등급 카운트
    const monthlyGrades: Record<number, Record<number, number>> = {};
    for (let m = 1; m <= 12; m++) {
      monthlyGrades[m] = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    }

    for (const date of result) {
      const month = parseInt(date.date.split("-")[1]);
      monthlyGrades[month][date.grade]++;
    }

    // 테이블 출력
    console.log("월   | 천운 | 아주좋음 | 좋음 | 보통 | 나쁨 | 합계");
    console.log("-".repeat(55));

    let totalGrade0 = 0;
    let maxGrade0InMonth = 0;

    for (let m = 1; m <= 12; m++) {
      const g = monthlyGrades[m];
      const total = g[0] + g[1] + g[2] + g[3] + g[4];
      const warning = g[0] > 3 ? " ⚠️" : "";

      totalGrade0 += g[0];
      maxGrade0InMonth = Math.max(maxGrade0InMonth, g[0]);

      console.log(
        `${m.toString().padStart(2)}월 |  ${g[0].toString().padStart(2)}${warning}  |    ${g[1].toString().padStart(2)}    |  ${g[2].toString().padStart(2)}  |  ${g[3].toString().padStart(2)}  |  ${g[4].toString().padStart(2)}  |  ${total}`
      );
    }

    console.log("-".repeat(55));
    console.log(`연간 천운: ${totalGrade0}일, 월 최대 천운: ${maxGrade0InMonth}일`);

    // 문제 감지
    if (maxGrade0InMonth > 5) {
      console.log(`⚠️ 경고: 천운이 한 달에 ${maxGrade0InMonth}개로 너무 많습니다!`);
    }
  }

  // 점수 분포 상세 확인
  console.log("\n\n=== 점수 분포 상세 ===");
  const profile = profiles[0];
  const result = calculateYearlyImportantDates(2025, profile.saju as any, profile.astro as any);

  // 점수별 카운트
  const scoreCounts: Record<number, number> = {};
  for (const date of result) {
    scoreCounts[date.score] = (scoreCounts[date.score] || 0) + 1;
  }

  // 70점 이상 분포
  console.log("\n70점 이상 점수 분포:");
  const highScores = Object.entries(scoreCounts)
    .filter(([score]) => parseInt(score) >= 70)
    .sort((a, b) => parseInt(b[0]) - parseInt(a[0]));

  for (const [score, count] of highScores) {
    console.log(`  ${score}점: ${count}일`);
  }

  // 74점 이상 날짜 목록 (Grade 0)
  console.log("\n\n=== Grade 0 날짜 전체 목록 ===");
  const grade0Days = result.filter(r => r.grade === 0);
  console.log(`총 ${grade0Days.length}일:`);

  // 월별로 그룹핑
  const byMonth: Record<number, typeof grade0Days> = {};
  for (const day of grade0Days) {
    const month = parseInt(day.date.split("-")[1]);
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(day);
  }

  for (const [month, days] of Object.entries(byMonth)) {
    console.log(`  ${month}월: ${days.map(d => `${d.date.split("-")[2]}일(${d.score}점)`).join(", ")}`);
  }
}

testMonthlyDistribution();
