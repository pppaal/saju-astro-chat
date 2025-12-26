// 간단한 등급 판정 시뮬레이션
// 실제 로직을 기반으로 등급 분포 예상

// 등급 조건 분석
const conditions = {
  grade0: {
    name: "천운의 날",
    conditions: [
      "score >= 87 && crossVerified && sajuPositive && astroPositive && sajuStrengthCount >= 1 && hasNoMajorRetrograde",
      "OR isBirthdaySpecial && score >= 78"
    ],
    expectedMonthly: "1-2일",
    expectedYearly: "12-24일 (3-7%)"
  },
  grade1: {
    name: "아주 좋은 날",
    conditions: [
      "score >= 80 && crossVerified && sajuPositive && astroPositive && hasNoMajorRetrograde"
    ],
    expectedMonthly: "3-5일",
    expectedYearly: "36-60일 (10-16%)"
  },
  grade2: {
    name: "좋은 날",
    conditions: [
      "score >= 72 && crossVerified && (sajuPositive || astroPositive) && hasNoMajorRetrograde",
      "OR score >= 78 && crossVerified && (sajuPositive || astroPositive) && retrogradeCount <= 1"
    ],
    expectedMonthly: "6-8일",
    expectedYearly: "72-96일 (20-26%)"
  },
  grade3: {
    name: "보통 날",
    conditions: ["나머지 전부"],
    expectedMonthly: "대부분",
    expectedYearly: "약 150-200일 (40-55%)"
  },
  grade4: {
    name: "나쁜 날",
    conditions: [
      "score <= 35",
      "OR score <= 45 && sajuNegative",
      "OR score <= 45 && astroNegative",
      "OR hasChung && hasXing",
      "OR hasChung && astroNegative",
      "OR hasXing && astroNegative",
      "OR sajuBadCount >= 1 && astroBadCount >= 2",
      "OR totalBadCount >= 3 && score <= 50"
    ],
    expectedMonthly: "3-5일",
    expectedYearly: "36-60일 (10-16%)"
  }
};

console.log("=== DestinyCalendar 5등급 시스템 분석 ===\n");

for (const [grade, info] of Object.entries(conditions)) {
  console.log(`📊 ${grade.toUpperCase()}: ${info.name}`);
  console.log(`   예상 월간: ${info.expectedMonthly}`);
  console.log(`   예상 연간: ${info.expectedYearly}`);
  console.log(`   조건:`);
  info.conditions.forEach(c => console.log(`     - ${c}`));
  console.log();
}

// 이상적인 분포 vs 예상 분포
console.log("=== 이상적인 분포 분석 ===\n");
const totalDays = 365;

const distribution = [
  { grade: 0, name: "천운의 날", minPercent: 0.5, maxPercent: 3, idealPercent: 2 },
  { grade: 1, name: "아주 좋음", minPercent: 5, maxPercent: 15, idealPercent: 10 },
  { grade: 2, name: "좋음", minPercent: 15, maxPercent: 30, idealPercent: 22 },
  { grade: 3, name: "보통", minPercent: 40, maxPercent: 60, idealPercent: 50 },
  { grade: 4, name: "나쁨", minPercent: 5, maxPercent: 20, idealPercent: 12 }
];

let totalIdeal = 0;
console.log("등급    | 이름         | 범위(%)     | 이상(%) | 일수");
console.log("--------|--------------|-------------|---------|-----");
distribution.forEach(d => {
  const idealDays = Math.round(totalDays * d.idealPercent / 100);
  totalIdeal += d.idealPercent;
  console.log(`Grade ${d.grade} | ${d.name.padEnd(12)} | ${d.minPercent.toString().padStart(4)}~${d.maxPercent.toString().padEnd(4)}% | ${d.idealPercent.toString().padStart(5)}%  | ${idealDays.toString().padStart(3)}일`);
});
console.log("--------|--------------|-------------|---------|-----");
console.log(`합계    |              |             | ${totalIdeal.toString().padStart(5)}%  | 365일\n`);

// 등급 판정 키 포인트
console.log("=== 등급 판정 핵심 요소 ===\n");
console.log("🔑 crossVerified: 사주+점성술 모두 확인 (Grade 0,1,2 필수)");
console.log("🔑 sajuPositive/astroPositive: 동양/서양 긍정 요소 존재");
console.log("🔑 hasNoMajorRetrograde: 수성/금성/화성 역행 없음");
console.log("🔑 score: 종합 점수 (0-100)");
console.log("🔑 sajuStrengthCount: 사주 강점 개수");
console.log("🔑 hasChung/hasXing: 충/형 존재");
console.log();

console.log("=== 점수 임계값 ===\n");
console.log("✅ Grade 0: score >= 87 (또는 생일 78)");
console.log("✅ Grade 1: score >= 80");
console.log("✅ Grade 2: score >= 72 (역행시 78)");
console.log("❌ Grade 4: score <= 35 (또는 45+부정요소)");
console.log("➖ Grade 3: 나머지\n");

console.log("✅ 분석 완료!");
