// Test script for DestinyCalendar grade distribution
// Run with: node --experimental-vm-modules scripts/test-calendar-grades.mjs

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Register ts-node for TypeScript files
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    target: 'ES2020',
    esModuleInterop: true,
  },
});

const { calculateYearlyImportantDates } = require('../src/lib/destiny-map/destinyCalendar.ts');

// 테스트 사주 프로필
const testSajuProfile = {
  dayMaster: "甲",
  dayMasterElement: "wood",
  dayBranch: "子",
  yearBranch: "寅",
  birthYear: 1990,
};

// 테스트 점성술 프로필
const testAstroProfile = {
  sunSign: "Leo",
  sunElement: "fire",
  birthMonth: 8,
  birthDay: 15,
};

async function testGradeDistribution() {
  console.log("Testing DestinyCalendar Grade Distribution...\n");

  const year = 2025;
  const result = await calculateYearlyImportantDates(year, testSajuProfile, testAstroProfile);

  // 등급별 카운트
  const gradeCount = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  const gradeDates = { 0: [], 1: [], 2: [], 3: [], 4: [] };

  for (const date of result.dates) {
    gradeCount[date.grade]++;
    if (gradeDates[date.grade].length < 5) {
      gradeDates[date.grade].push(`${date.date} (${date.score}점)`);
    }
  }

  const totalDays = result.dates.length;

  console.log(`총 분석 일수: ${totalDays}일\n`);
  console.log("=== 등급별 분포 ===");
  console.log(`Grade 0 (천운의 날): ${gradeCount[0]}일 (${(gradeCount[0]/totalDays*100).toFixed(1)}%)`);
  console.log(`Grade 1 (아주 좋음): ${gradeCount[1]}일 (${(gradeCount[1]/totalDays*100).toFixed(1)}%)`);
  console.log(`Grade 2 (좋음):      ${gradeCount[2]}일 (${(gradeCount[2]/totalDays*100).toFixed(1)}%)`);
  console.log(`Grade 3 (보통):      ${gradeCount[3]}일 (${(gradeCount[3]/totalDays*100).toFixed(1)}%)`);
  console.log(`Grade 4 (나쁨):      ${gradeCount[4]}일 (${(gradeCount[4]/totalDays*100).toFixed(1)}%)`);

  console.log("\n=== 등급별 샘플 날짜 (최대 5개) ===");
  console.log("\n[Grade 0 - 천운의 날]");
  gradeDates[0].forEach(d => console.log(`  ${d}`));

  console.log("\n[Grade 1 - 아주 좋은 날]");
  gradeDates[1].forEach(d => console.log(`  ${d}`));

  console.log("\n[Grade 2 - 좋은 날]");
  gradeDates[2].forEach(d => console.log(`  ${d}`));

  console.log("\n[Grade 3 - 보통 날]");
  gradeDates[3].forEach(d => console.log(`  ${d}`));

  console.log("\n[Grade 4 - 나쁜 날]");
  gradeDates[4].forEach(d => console.log(`  ${d}`));

  // 이상적인 분포 체크
  console.log("\n=== 분포 평가 ===");
  const idealRatios = {
    0: { min: 0.5, max: 3, name: "천운의 날" },
    1: { min: 5, max: 15, name: "아주 좋음" },
    2: { min: 15, max: 35, name: "좋음" },
    3: { min: 40, max: 60, name: "보통" },
    4: { min: 5, max: 20, name: "나쁨" },
  };

  let allGood = true;
  for (const [grade, ideal] of Object.entries(idealRatios)) {
    const ratio = (gradeCount[parseInt(grade)] / totalDays) * 100;
    const status = ratio >= ideal.min && ratio <= ideal.max ? "✅" : "⚠️";
    if (ratio < ideal.min || ratio > ideal.max) allGood = false;
    console.log(`${status} ${ideal.name}: ${ratio.toFixed(1)}% (이상: ${ideal.min}~${ideal.max}%)`);
  }

  if (allGood) {
    console.log("\n✅ 모든 등급이 이상적인 분포 범위 내에 있습니다!");
  } else {
    console.log("\n⚠️ 일부 등급이 이상적인 분포를 벗어났습니다.");
  }
}

testGradeDistribution().catch(console.error);
