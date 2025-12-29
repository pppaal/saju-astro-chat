/**
 * 새 점수 시스템 분포 테스트
 * Run with: npx tsx scripts/test-scoring-dist.ts
 */

import { calculateYearlyImportantDates } from '../src/lib/destiny-map/destinyCalendar';
import type { UserSajuProfile, UserAstroProfile } from '../src/lib/destiny-map/calendar/types';

// 테스트 사주 프로필
const testSajuProfile: UserSajuProfile = {
  dayMaster: "甲",
  dayMasterElement: "wood",
  dayBranch: "子",
  yearBranch: "寅",
  birthYear: 1990,
};

// 테스트 점성술 프로필
const testAstroProfile: UserAstroProfile = {
  sunSign: "Leo",
  sunElement: "fire",
  birthMonth: 8,
  birthDay: 15,
  sunLongitude: 142.5,
};

function testGradeDistribution() {
  console.log("Testing New Scoring System Distribution...\n");

  const year = 2025;
  const result = calculateYearlyImportantDates(year, testSajuProfile, testAstroProfile);

  // 등급별 카운트
  const gradeCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  const gradeDates: Record<number, string[]> = { 0: [], 1: [], 2: [], 3: [], 4: [] };
  const scoreRanges: Record<number, { min: number; max: number; sum: number }> = {
    0: { min: 100, max: 0, sum: 0 },
    1: { min: 100, max: 0, sum: 0 },
    2: { min: 100, max: 0, sum: 0 },
    3: { min: 100, max: 0, sum: 0 },
    4: { min: 100, max: 0, sum: 0 },
  };

  for (const date of result) {
    gradeCount[date.grade]++;
    scoreRanges[date.grade].min = Math.min(scoreRanges[date.grade].min, date.score);
    scoreRanges[date.grade].max = Math.max(scoreRanges[date.grade].max, date.score);
    scoreRanges[date.grade].sum += date.score;

    if (gradeDates[date.grade].length < 5) {
      gradeDates[date.grade].push(`${date.date} (${date.score}점)`);
    }
  }

  const totalDays = result.length;

  console.log(`총 분석 일수: ${totalDays}일\n`);
  console.log("=== 등급별 분포 ===");

  const gradeNames = ["천운의 날", "아주 좋음", "좋음", "보통", "나쁨"];
  for (let g = 0; g <= 4; g++) {
    const count = gradeCount[g];
    const percent = (count / totalDays * 100).toFixed(1);
    const range = scoreRanges[g];
    const avg = count > 0 ? (range.sum / count).toFixed(1) : 0;
    console.log(`Grade ${g} (${gradeNames[g].padEnd(6)}): ${count.toString().padStart(3)}일 (${percent.padStart(5)}%) | 점수: ${range.min}~${range.max} (평균: ${avg})`);
  }

  console.log("\n=== 등급별 샘플 날짜 (최대 5개) ===");
  for (let g = 0; g <= 4; g++) {
    console.log(`\n[Grade ${g} - ${gradeNames[g]}]`);
    if (gradeDates[g].length === 0) {
      console.log("  (없음)");
    } else {
      gradeDates[g].forEach(d => console.log(`  ${d}`));
    }
  }

  // 이상적인 분포 체크
  console.log("\n=== 분포 평가 ===");
  const idealRatios: Record<number, { min: number; max: number; name: string }> = {
    0: { min: 0.5, max: 5, name: "천운의 날" },
    1: { min: 8, max: 20, name: "아주 좋음" },
    2: { min: 20, max: 35, name: "좋음" },
    3: { min: 25, max: 45, name: "보통" },
    4: { min: 10, max: 30, name: "나쁨" },
  };

  let allGood = true;
  for (let grade = 0; grade <= 4; grade++) {
    const ideal = idealRatios[grade];
    const ratio = (gradeCount[grade] / totalDays) * 100;
    const status = ratio >= ideal.min && ratio <= ideal.max ? "✅" : "⚠️";
    if (ratio < ideal.min || ratio > ideal.max) allGood = false;
    console.log(`${status} ${ideal.name.padEnd(8)}: ${ratio.toFixed(1).padStart(5)}% (이상: ${ideal.min}~${ideal.max}%)`);
  }

  if (allGood) {
    console.log("\n✅ 모든 등급이 이상적인 분포 범위 내에 있습니다!");
  } else {
    console.log("\n⚠️ 일부 등급이 조정이 필요할 수 있습니다.");
  }

  // 점수 분포 히스토그램
  console.log("\n=== 점수 분포 히스토그램 ===");
  const scoreBuckets: Record<string, number> = {};
  for (let i = 0; i <= 100; i += 10) {
    scoreBuckets[`${i}-${i+9}`] = 0;
  }
  for (const date of result) {
    const bucket = Math.floor(date.score / 10) * 10;
    const key = `${bucket}-${bucket + 9}`;
    scoreBuckets[key]++;
  }

  for (const [range, count] of Object.entries(scoreBuckets)) {
    const bar = "█".repeat(Math.round(count / 5));
    console.log(`${range.padStart(6)}: ${count.toString().padStart(3)}일 ${bar}`);
  }
}

testGradeDistribution();
