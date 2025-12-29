/**
 * 여러 프로필로 점수 비교 테스트
 * 사람마다 다르게 계산되는지 확인
 * Run with: npx tsx scripts/test-multi-profiles.ts
 */

import { calculateYearlyImportantDates } from '../src/lib/destiny-map/destinyCalendar';
import type { UserSajuProfile, UserAstroProfile } from '../src/lib/destiny-map/calendar/types';

// 테스트 프로필 4명
const profiles = [
  {
    name: "사용자 A (甲子일주, 목 일간, 레오)",
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
      sunLongitude: 142.5,
    } as UserAstroProfile,
  },
  {
    name: "사용자 B (丙午일주, 화 일간, 양자리)",
    saju: {
      dayMaster: "丙",
      dayMasterElement: "fire",
      dayBranch: "午",
      yearBranch: "戌",
      birthYear: 1985,
    } as UserSajuProfile,
    astro: {
      sunSign: "Aries",
      sunElement: "fire",
      birthMonth: 4,
      birthDay: 5,
      sunLongitude: 15.0,
    } as UserAstroProfile,
  },
  {
    name: "사용자 C (壬申일주, 수 일간, 물고기)",
    saju: {
      dayMaster: "壬",
      dayMasterElement: "water",
      dayBranch: "申",
      yearBranch: "子",
      birthYear: 1996,
    } as UserSajuProfile,
    astro: {
      sunSign: "Pisces",
      sunElement: "water",
      birthMonth: 3,
      birthDay: 10,
      sunLongitude: 350.0,
    } as UserAstroProfile,
  },
  {
    name: "사용자 D (乙卯일주, 목 일간, 처녀)",
    saju: {
      dayMaster: "乙",
      dayMasterElement: "wood",
      dayBranch: "卯",
      yearBranch: "未",
      birthYear: 1988,
    } as UserSajuProfile,
    astro: {
      sunSign: "Virgo",
      sunElement: "earth",
      birthMonth: 9,
      birthDay: 10,
      sunLongitude: 167.0,
    } as UserAstroProfile,
  },
];

// 특정 날짜들 비교
const testDates = [
  "2025-01-15",
  "2025-03-21",
  "2025-06-15",
  "2025-08-15",
  "2025-12-25",
];

function testMultiProfiles() {
  console.log("=== 여러 프로필 점수 비교 테스트 ===\n");

  const allResults: Record<string, Record<string, { score: number; grade: number }>> = {};

  for (const profile of profiles) {
    console.log(`\n### ${profile.name} ###`);
    const result = calculateYearlyImportantDates(2025, profile.saju, profile.astro);

    // 등급 분포
    const gradeCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const date of result) {
      gradeCount[date.grade]++;
    }

    console.log("등급 분포:");
    const gradeNames = ["천운", "아주좋음", "좋음", "보통", "나쁨"];
    for (let g = 0; g <= 4; g++) {
      const pct = (gradeCount[g] / result.length * 100).toFixed(1);
      console.log(`  Grade ${g} (${gradeNames[g]}): ${gradeCount[g]}일 (${pct}%)`);
    }

    // 특정 날짜 점수 저장
    allResults[profile.name] = {};
    for (const dateStr of testDates) {
      const found = result.find(r => r.date === dateStr);
      if (found) {
        allResults[profile.name][dateStr] = { score: found.score, grade: found.grade };
      }
    }
  }

  // 날짜별 비교 테이블
  console.log("\n\n=== 날짜별 점수 비교 ===");
  console.log("날짜       | 사용자A | 사용자B | 사용자C | 차이");
  console.log("-".repeat(60));

  for (const dateStr of testDates) {
    const scores = profiles.map(p => allResults[p.name][dateStr]?.score ?? 0);
    const grades = profiles.map(p => allResults[p.name][dateStr]?.grade ?? 3);
    const diff = Math.max(...scores) - Math.min(...scores);

    const gradeSymbols = ["★", "◎", "○", "△", "▽"];
    const gradeStrs = grades.map(g => gradeSymbols[g]);

    console.log(
      `${dateStr} |  ${scores[0].toString().padStart(2)}${gradeStrs[0]}  |  ${scores[1].toString().padStart(2)}${gradeStrs[1]}  |  ${scores[2].toString().padStart(2)}${gradeStrs[2]}  | ±${diff}`
    );
  }

  // 가장 좋은 날 비교
  console.log("\n\n=== 각 프로필별 천운의 날 (Grade 0) ===");
  for (const profile of profiles) {
    const result = calculateYearlyImportantDates(2025, profile.saju, profile.astro);
    const grade0Days = result.filter(r => r.grade === 0).slice(0, 5);

    console.log(`\n${profile.name}:`);
    if (grade0Days.length === 0) {
      console.log("  (없음)");
    } else {
      for (const day of grade0Days) {
        console.log(`  ${day.date} - ${day.score}점`);
      }
    }
  }

  // 가장 나쁜 날 비교
  console.log("\n\n=== 각 프로필별 나쁜 날 (Grade 4) 상위 5개 ===");
  for (const profile of profiles) {
    const result = calculateYearlyImportantDates(2025, profile.saju, profile.astro);
    const grade4Days = result.filter(r => r.grade === 4).slice(0, 5);

    console.log(`\n${profile.name}:`);
    if (grade4Days.length === 0) {
      console.log("  (없음)");
    } else {
      for (const day of grade4Days) {
        console.log(`  ${day.date} - ${day.score}점`);
      }
    }
  }

  // 특정 날짜 상세 분석
  console.log("\n\n=== 2025-01-15 상세 분석 ===");
  for (const profile of profiles) {
    const result = calculateYearlyImportantDates(2025, profile.saju, profile.astro);
    const day = result.find(r => r.date === "2025-01-15");

    console.log(`\n${profile.name}:`);
    if (day) {
      console.log(`  점수: ${day.score}점, 등급: ${day.grade}`);
      console.log(`  일진: ${day.ganzhi}`);
      console.log(`  사주 요소: ${day.sajuFactorKeys.slice(0, 5).join(", ")}`);
      console.log(`  점성 요소: ${day.astroFactorKeys.slice(0, 5).join(", ")}`);
    }
  }
}

testMultiProfiles();
