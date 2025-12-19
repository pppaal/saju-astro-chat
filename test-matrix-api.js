// test-matrix-api.js - 데이터 양에 따른 점수 비교

async function testAPI(label, data) {
  const response = await fetch("http://localhost:3000/api/destiny-matrix/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json();

  if (result.success) {
    const os = result.report.overallScore;
    console.log(`\n${label}`);
    console.log(`  📊 Overall: ${os.total}/100 (${os.grade})`);
    console.log(`  📈 Data Quality: ${os.dataCompleteness || 0}% complete, ${os.insightCount || 0} insights`);
    console.log(`  🎯 Top Insights: ${result.report.topInsights?.length || 0}개`);

    // 데이터 있는 도메인만 표시
    const domainsWithData = result.report.domainAnalysis?.filter(d => d.hasData) || [];
    const domainsWithoutData = result.report.domainAnalysis?.filter(d => !d.hasData) || [];

    console.log(`  ✅ With Data (${domainsWithData.length}):`, domainsWithData.map(d => `${d.domain}:${d.score}`).join(', ') || 'none');
    console.log(`  ⚠️  No Data (${domainsWithoutData.length}):`, domainsWithoutData.map(d => d.domain).join(', ') || 'none');
  } else {
    console.log(`\n${label}: ERROR -`, result.error?.message);
  }
}

async function main() {
  console.log("=== 데이터 양에 따른 점수 비교 ===");

  // 1. 최소 데이터 (일간만)
  await testAPI("1️⃣ 최소 (일간만)", {
    dayMasterElement: "목",
    lang: "ko"
  });

  // 2. 기본 데이터 (일간 + 격국)
  await testAPI("2️⃣ 기본 (일간+격국)", {
    dayMasterElement: "목",
    geokguk: "jeonggwan",
    lang: "ko"
  });

  // 3. 중간 데이터 (사주 기본)
  await testAPI("3️⃣ 중간 (사주 기본)", {
    dayMasterElement: "목",
    geokguk: "jeonggwan",
    yongsin: "화",
    sibsinDistribution: { "정관": 2, "정인": 1, "식신": 1 },
    shinsalList: ["천을귀인", "역마"],
    lang: "ko"
  });

  // 4. 풍부한 데이터 (사주 + 점성)
  await testAPI("4️⃣ 풍부 (사주+점성)", {
    dayMasterElement: "목",
    geokguk: "jeonggwan",
    yongsin: "화",
    sibsinDistribution: { "정관": 2, "정인": 1, "식신": 1, "비견": 1 },
    twelveStages: { "장생": 1, "건록": 1, "제왕": 1 },
    shinsalList: ["천을귀인", "역마", "문창귀인"],
    planetHouses: { Sun: 10, Moon: 4, Mercury: 9, Venus: 7, Mars: 1 },
    planetSigns: { Sun: "염소자리", Moon: "게자리" },
    activeTransits: ["jupiterReturn", "saturnReturn"],
    dominantWesternElement: "fire",
    lang: "ko"
  });

  // 5. 완전 데이터 (모든 필드 + aspects + relations)
  await testAPI("5️⃣ 완전+조합", {
    dayMasterElement: "목",
    pillarElements: ["목", "화", "토", "금"],
    geokguk: "jeonggwan",
    yongsin: "화",
    currentDaeunElement: "화",
    currentSaeunElement: "토",
    sibsinDistribution: { "정관": 2, "정인": 1, "식신": 1, "비견": 1, "편재": 1 },
    twelveStages: { "장생": 1, "건록": 1, "제왕": 1, "관대": 1 },
    shinsalList: ["천을귀인", "역마", "문창귀인", "학당귀인", "금여록"],
    planetHouses: { Sun: 10, Moon: 4, Mercury: 9, Venus: 7, Mars: 1, Jupiter: 2, Saturn: 8 },
    planetSigns: { Sun: "염소자리", Moon: "게자리", Mercury: "물병자리", Venus: "물고기자리" },
    activeTransits: ["jupiterReturn", "saturnReturn", "mercuryRetrograde"],
    dominantWesternElement: "fire",
    asteroidHouses: { Ceres: 6, Juno: 7 },
    // Layer 5 조합 추가
    aspects: [
      { planet1: "Sun", planet2: "Moon", type: "trine" },
      { planet1: "Venus", planet2: "Mars", type: "conjunction" },
      { planet1: "Jupiter", planet2: "Saturn", type: "square" }
    ],
    relations: [
      { kind: "지지삼합", pillars: ["년지", "일지", "시지"], detail: "인-오-술 삼합" },
      { kind: "지지육합", pillars: ["월지", "시지"], detail: "자-축 육합" }
    ],
    lang: "ko"
  });

  console.log("\n=== 테스트 완료 ===");
}

main();
