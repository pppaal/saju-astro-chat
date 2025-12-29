/**
 * 프로필 D 상세 분석 - 1월 천운 9개 문제
 */

import { calculateYearlyImportantDates } from '../src/lib/destiny-map/destinyCalendar';
import type { UserSajuProfile, UserAstroProfile } from '../src/lib/destiny-map/calendar/types';

const profileD = {
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
};

function analyzeProfileD() {
  console.log("=== 프로필 D 1월 상세 분석 ===\n");
  console.log("사주: 乙卯일주 (목 일간), 년지: 未");
  console.log("점성: Virgo (earth)\n");

  const result = calculateYearlyImportantDates(2025, profileD.saju, profileD.astro);

  // 1월 날짜만 추출
  const jan = result.filter(r => r.date.startsWith("2025-01"));

  console.log("1월 전체 날짜 점수:");
  console.log("날짜     | 점수 | 등급 | 일진 | 사주요소 | 점성요소");
  console.log("-".repeat(80));

  for (const day of jan) {
    const gradeSymbols = ["★★★", "◎◎", "○", "△", "▽"];
    const factors = day.sajuFactorKeys.slice(0, 3).join(",");
    const astro = day.astroFactorKeys.slice(0, 3).join(",");
    console.log(
      `${day.date} |  ${day.score.toString().padStart(2)}  |  ${gradeSymbols[day.grade]}  | ${day.ganzhi} | ${factors.substring(0, 25).padEnd(25)} | ${astro.substring(0, 20)}`
    );
  }

  // Grade 0 상세 분석
  console.log("\n\n=== Grade 0 (천운) 날짜 상세 ===");
  const grade0 = jan.filter(r => r.grade === 0);

  for (const day of grade0) {
    console.log(`\n${day.date} - ${day.score}점`);
    console.log(`  일진: ${day.ganzhi}`);
    console.log(`  사주 요소: ${day.sajuFactorKeys.join(", ")}`);
    console.log(`  점성 요소: ${day.astroFactorKeys.join(", ")}`);
    console.log(`  추천: ${day.recommendationKeys.slice(0, 5).join(", ")}`);
  }

  // 점수 분포 확인
  console.log("\n\n=== 1월 점수 분포 ===");
  const scoreCounts: Record<number, number> = {};
  for (const day of jan) {
    scoreCounts[day.score] = (scoreCounts[day.score] || 0) + 1;
  }

  const sorted = Object.entries(scoreCounts).sort((a, b) => parseInt(b[0]) - parseInt(a[0]));
  for (const [score, count] of sorted) {
    const bar = "█".repeat(count);
    console.log(`  ${score.toString().padStart(2)}점: ${count}일 ${bar}`);
  }
}

analyzeProfileD();
