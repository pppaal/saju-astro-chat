/**
 * 꿈 해몽 전체 플로우 테스트 (사용자 관점)
 * 생년월일 입력 → 꿈 내용 입력 → RAG 결과 검증
 */

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";
const FRONTEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// 테스트 시나리오: 실제 사용자들이 입력할 법한 데이터
const testScenarios = [
  {
    name: "🐉 용꿈 (전통 길몽 + 사주 운세)",
    user: {
      name: "김미래",
      birth: {
        date: "1990-03-15",
        time: "14:30",
        timezone: "Asia/Seoul",
        gender: "female"
      }
    },
    dream: {
      dreamText: "어젯밤 꿈에 황금빛 용이 구름 사이로 나타났어요. 용이 저를 향해 날아와서 여의주를 건네주더니 하늘로 올라갔습니다. 그 순간 하늘이 환하게 빛나면서 무지개가 나타났어요. 깨어나서도 생생하게 기억나네요.",
      symbols: ["용", "황금", "여의주", "하늘", "무지개"],
      emotions: ["경이로움", "행복", "평화"],
      themes: ["길몽", "예지몽"],
      koreanTypes: ["용꿈", "하늘꿈"],
      koreanLucky: ["여의주", "무지개"]
    },
    expectedRag: {
      shouldContain: ["용", "길몽", "여의주", "재물", "승진"],
      minimumSummaryLength: 400,
      shouldHaveLuckyNumbers: true,
      shouldHaveCulturalNotes: true
    }
  },
  {
    name: "🐷 돼지꿈 (재물운 + 로또 번호)",
    user: {
      name: "박부자",
      birth: {
        date: "1985-07-22",
        time: "09:00",
        timezone: "Asia/Seoul",
        gender: "male"
      }
    },
    dream: {
      dreamText: "새벽에 꿈에서 커다란 검은 돼지가 우리 집으로 걸어 들어왔어요. 돼지가 입에 돈다발을 물고 있었는데, 그걸 제 앞에 떨어뜨리고 갔습니다. 돈을 세어보니 정확히 7뭉치였어요. 그 후 연꽃이 핀 연못에서 돼지가 헤엄치는 모습을 봤습니다.",
      symbols: ["돼지", "돈", "집", "연꽃", "연못"],
      emotions: ["놀라움", "기쁨", "설렘"],
      themes: ["재물꿈", "길몽"],
      koreanTypes: ["돼지꿈", "재물꿈"],
      koreanLucky: ["돈", "연꽃"],
      context: ["새벽 꿈", "생생한 꿈"]
    },
    expectedRag: {
      shouldContain: ["돼지", "재물", "돈", "행운", "로또"],
      minimumSummaryLength: 400,
      shouldHaveLuckyNumbers: true,
      shouldHaveSajuAnalysis: true
    }
  },
  {
    name: "🌊 물속 꿈 (심리 분석)",
    user: {
      name: "이평화",
      birth: {
        date: "1995-11-08",
        time: "23:45",
        timezone: "Asia/Seoul",
        gender: "female"
      }
    },
    dream: {
      dreamText: "깊은 바다 속을 헤엄치고 있었어요. 숨을 쉴 수 있어서 전혀 두렵지 않았습니다. 주변에 형형색색의 물고기들이 헤엄치고, 아름다운 산호초가 펼쳐져 있었어요. 물 밑바닥에서 진주를 발견했고, 그것을 주우려는 순간 거대한 거북이가 나타나 등에 태워줬어요.",
      symbols: ["바다", "물고기", "산호초", "진주", "거북이"],
      emotions: ["평화", "자유", "호기심"],
      themes: ["잠재의식", "탐험"],
      western: ["water", "sea", "turtle"],
      context: ["평온한 꿈", "색채가 선명한 꿈"]
    },
    expectedRag: {
      shouldContain: ["물", "잠재의식", "감정", "무의식"],
      minimumSummaryLength: 300,
      shouldHaveJungianAnalysis: true
    }
  },
  {
    name: "😰 추락하는 꿈 (불안 심리)",
    user: {
      name: "최불안",
      birth: {
        date: "1988-05-30",
        time: "16:20",
        timezone: "Asia/Seoul",
        gender: "male"
      }
    },
    dream: {
      dreamText: "높은 빌딩 옥상에 서 있었는데 갑자기 바닥이 무너지면서 떨어지기 시작했어요. 계속 떨어지는데 끝이 없었습니다. 주변에서 사람들이 소리치는 게 들렸지만 도와줄 수 없었어요. 땅에 닿기 직전 깨어났는데 심장이 엄청 빠르게 뛰고 있었습니다.",
      symbols: ["빌딩", "추락", "땅", "높이"],
      emotions: ["공포", "불안", "무력감"],
      themes: ["악몽", "불안"],
      western: ["falling", "nightmare"],
      context: ["반복되는 꿈"]
    },
    expectedRag: {
      shouldContain: ["불안", "통제", "스트레스"],
      minimumSummaryLength: 300,
      shouldHaveRecommendations: true
    }
  },
  {
    name: "👶 태몽 (임신 관련)",
    user: {
      name: "정희망",
      birth: {
        date: "1992-12-25",
        time: "11:11",
        timezone: "Asia/Seoul",
        gender: "female"
      }
    },
    dream: {
      dreamText: "꿈에서 산 정상에 올라갔는데 거기에 호랑이가 앉아 있었어요. 무섭지 않고 오히려 위엄있고 아름다워 보였습니다. 호랑이가 다가와서 제 손을 핥더니, 새끼 호랑이 한 마리를 제게 안겨줬어요. 그 새끼가 저를 보고 웃는 것 같았습니다.",
      symbols: ["호랑이", "산", "새끼", "하늘"],
      emotions: ["경외", "따뜻함", "기쁨"],
      themes: ["태몽", "길몽"],
      koreanTypes: ["호랑이꿈", "태몽"],
      koreanLucky: ["산", "새끼"],
      context: ["아침 꿈", "선명한 꿈"]
    },
    expectedRag: {
      shouldContain: ["태몽", "호랑이", "아들", "리더십"],
      minimumSummaryLength: 400,
      shouldHaveTaemongAnalysis: true,
      shouldHaveCelebExamples: true
    }
  }
];

interface TestResult {
  scenario: string;
  success: boolean;
  errors: string[];
  warnings: string[];
  details: {
    sajuData?: any;
    dreamResult?: any;
    ragQuality?: string;
    summaryLength?: number;
    hasLuckyNumbers?: boolean;
    hasSajuAnalysis?: boolean;
    hasTaemongAnalysis?: boolean;
    hasRecommendations?: boolean;
    matchedSymbols?: string[];
  };
}

async function calculateSajuForUser(birth: any) {
  console.log(`  📅 사주 계산 중... (생년월일: ${birth.date} ${birth.time})`);

  try {
    const response = await fetch(`${BASE_URL}/api/saju`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ADMIN_API_TOKEN || ""}`,
      },
      body: JSON.stringify({
        birth_date: birth.date,
        birth_time: birth.time,
        timezone: birth.timezone || "Asia/Seoul",
        gender: birth.gender
      })
    });

    if (!response.ok) {
      throw new Error(`Saju API returned ${response.status}`);
    }

    const result = await response.json();

    if (result.status === "success" && result.data) {
      console.log(`  ✅ 사주 계산 완료`);
      console.log(`     - 일간: ${result.data.dayMaster?.stem || 'N/A'}`);
      console.log(`     - 대운: ${result.data.daeun?.[0]?.stem || 'N/A'} ${result.data.daeun?.[0]?.branch || 'N/A'}`);
      return result.data;
    } else {
      throw new Error("Invalid saju response format");
    }
  } catch (error) {
    console.log(`  ⚠️  사주 계산 실패 (선택 기능): ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function interpretDreamWithRag(dream: any, sajuData: any = null) {
  console.log(`  🌙 꿈 해석 요청 중...`);

  try {
    // Prepare saju influence data if available
    let sajuInfluence = null;
    if (sajuData) {
      sajuInfluence = {
        pillars: sajuData.pillars,
        dayMaster: sajuData.dayMaster,
        currentDaeun: sajuData.daeun?.[0] || null,
        currentSaeun: sajuData.saeun?.[0] || null,
        currentWolun: sajuData.wolun?.[0] || null,
        todayIljin: sajuData.todayIljin || null
      };
    }

    const response = await fetch(`${BASE_URL}/api/dream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ADMIN_API_TOKEN || ""}`,
      },
      body: JSON.stringify({
        dream: dream.dreamText,
        symbols: dream.symbols,
        emotions: dream.emotions,
        themes: dream.themes,
        context: dream.context || [],
        locale: "ko",
        koreanTypes: dream.koreanTypes || [],
        koreanLucky: dream.koreanLucky || [],
        chinese: dream.chinese || [],
        islamicTypes: dream.islamicTypes || [],
        western: dream.western || [],
        hindu: dream.hindu || [],
        japanese: dream.japanese || [],
        sajuInfluence: sajuInfluence
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Dream API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    if (result.status === "success" && result.data) {
      console.log(`  ✅ 꿈 해석 완료`);
      return result.data;
    } else if (result.data) {
      // Some backends return data directly
      console.log(`  ✅ 꿈 해석 완료`);
      return result.data;
    } else {
      throw new Error("Invalid dream response format");
    }
  } catch (error) {
    throw new Error(`Dream interpretation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validateRagResult(result: any, expected: any): { errors: string[], warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Summary length check
  const summary = result.summary || "";
  if (summary.length < expected.minimumSummaryLength) {
    errors.push(`Summary too short: ${summary.length} chars (expected >= ${expected.minimumSummaryLength})`);
  }

  // 2. Expected keywords in summary or symbols
  const fullText = (summary + JSON.stringify(result.dreamSymbols || [])).toLowerCase();
  for (const keyword of expected.shouldContain || []) {
    if (!fullText.includes(keyword.toLowerCase())) {
      warnings.push(`Expected keyword "${keyword}" not found in result`);
    }
  }

  // 3. Lucky numbers check
  if (expected.shouldHaveLuckyNumbers) {
    if (!result.luckyElements?.luckyNumbers || result.luckyElements.luckyNumbers.length === 0) {
      warnings.push("Expected lucky numbers but none found");
    }
  }

  // 4. Saju analysis check
  if (expected.shouldHaveSajuAnalysis) {
    if (!result.sajuAnalysis) {
      warnings.push("Expected saju analysis section but not found");
    }
  }

  // 5. Taemong analysis check
  if (expected.shouldHaveTaemongAnalysis) {
    if (!result.premium_features?.taemong) {
      warnings.push("Expected taemong analysis but not found");
    }
  }

  // 6. Recommendations check
  if (expected.shouldHaveRecommendations) {
    if (!result.recommendations || result.recommendations.length < 3) {
      warnings.push(`Expected at least 3 recommendations, got ${result.recommendations?.length || 0}`);
    }
  }

  // 7. Cultural notes check
  if (expected.shouldHaveCulturalNotes) {
    if (!result.culturalNotes || !result.culturalNotes.korean) {
      warnings.push("Expected Korean cultural notes but not found");
    }
  }

  // 8. Dream symbols check
  if (!result.dreamSymbols || result.dreamSymbols.length === 0) {
    errors.push("No dream symbols found in result");
  }

  // 9. Themes check
  if (!result.themes || result.themes.length === 0) {
    warnings.push("No themes found in result");
  }

  return { errors, warnings };
}

async function runFullFlowTest(scenario: typeof testScenarios[0]): Promise<TestResult> {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`테스트: ${scenario.name}`);
  console.log(`사용자: ${scenario.user.name}`);
  console.log(`${"=".repeat(70)}`);

  const result: TestResult = {
    scenario: scenario.name,
    success: false,
    errors: [],
    warnings: [],
    details: {}
  };

  try {
    // Step 1: Calculate Saju
    const sajuData = await calculateSajuForUser(scenario.user.birth);
    result.details.sajuData = sajuData;

    // Step 2: Interpret Dream with RAG
    const dreamResult = await interpretDreamWithRag(scenario.dream, sajuData);
    result.details.dreamResult = dreamResult;

    // Step 3: Validate RAG quality
    console.log(`\n  📊 RAG 결과 검증 중...`);
    const validation = validateRagResult(dreamResult, scenario.expectedRag);
    result.errors = validation.errors;
    result.warnings = validation.warnings;

    // Step 4: Extract metrics
    result.details.summaryLength = dreamResult.summary?.length || 0;
    result.details.hasLuckyNumbers = !!(dreamResult.luckyElements?.luckyNumbers?.length > 0);
    result.details.hasSajuAnalysis = !!dreamResult.sajuAnalysis;
    result.details.hasTaemongAnalysis = !!dreamResult.premium_features?.taemong;
    result.details.hasRecommendations = (dreamResult.recommendations?.length || 0) >= 3;
    result.details.ragQuality = dreamResult.matched_rules?.match_quality || "unknown";
    result.details.matchedSymbols = dreamResult.dreamSymbols?.map((s: any) => s.label) || [];

    // Success if no critical errors
    result.success = result.errors.length === 0;

    // Print results
    console.log(`\n  📝 결과 요약:`);
    console.log(`     길이: ${result.details.summaryLength}자`);
    console.log(`     ${dreamResult.summary?.substring(0, 200)}...`);

    if (dreamResult.dreamSymbols?.length > 0) {
      console.log(`\n  🔮 꿈 상징 (${dreamResult.dreamSymbols.length}개):`);
      dreamResult.dreamSymbols.slice(0, 3).forEach((s: any) => {
        console.log(`     • ${s.label}: ${s.meaning?.substring(0, 100)}...`);
      });
    }

    if (dreamResult.sajuAnalysis) {
      console.log(`\n  🎯 사주 분석:`);
      console.log(`     왜 지금?: ${dreamResult.sajuAnalysis.whyNow?.substring(0, 100)}...`);
    }

    if (dreamResult.luckyElements?.luckyNumbers) {
      console.log(`\n  🍀 행운의 숫자: ${dreamResult.luckyElements.luckyNumbers.join(", ")}`);
    }

    if (dreamResult.premium_features?.taemong) {
      console.log(`\n  👶 태몽 분석: ${dreamResult.premium_features.taemong.is_taemong ? "예" : "아니오"}`);
      if (dreamResult.premium_features.taemong.primary_symbol) {
        console.log(`     주 상징: ${dreamResult.premium_features.taemong.primary_symbol.symbol}`);
      }
    }

    if (dreamResult.recommendations?.length > 0) {
      console.log(`\n  💡 추천 (${dreamResult.recommendations.length}개):`);
      dreamResult.recommendations.slice(0, 2).forEach((r: any) => {
        const text = typeof r === 'string' ? r : (r.title || r.detail || JSON.stringify(r));
        console.log(`     • ${text.substring(0, 100)}...`);
      });
    }

    console.log(`\n  🏆 RAG 품질: ${result.details.ragQuality}`);
    console.log(`  ✅ 매칭된 심볼: ${result.details.matchedSymbols.join(", ")}`);

    if (result.warnings.length > 0) {
      console.log(`\n  ⚠️  경고 (${result.warnings.length}개):`);
      result.warnings.forEach(w => console.log(`     - ${w}`));
    }

    if (result.errors.length > 0) {
      console.log(`\n  ❌ 오류 (${result.errors.length}개):`);
      result.errors.forEach(e => console.log(`     - ${e}`));
    } else {
      console.log(`\n  ✅ 모든 검증 통과!`);
    }

  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : String(error));
    console.log(`\n  ❌ 테스트 실패: ${result.errors[0]}`);
  }

  return result;
}

async function main() {
  console.log("🌙 꿈 해몽 전체 플로우 테스트 (사용자 관점)");
  console.log(`   백엔드: ${BASE_URL}`);
  console.log(`   테스트 시나리오: ${testScenarios.length}개`);
  console.log(`   현재 시각: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`);

  const results: TestResult[] = [];

  for (const scenario of testScenarios) {
    const result = await runFullFlowTest(scenario);
    results.push(result);

    // Rate limit: 요청 간 딜레이
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Final summary
  console.log(`\n${"=".repeat(70)}`);
  console.log("📊 전체 테스트 결과 요약");
  console.log(`${"=".repeat(70)}`);

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

  console.log(`✅ 성공: ${successful}/${results.length}`);
  console.log(`❌ 실패: ${failed}/${results.length}`);
  console.log(`⚠️  총 경고: ${totalWarnings}개`);

  console.log(`\n상세 결과:`);
  results.forEach(r => {
    const status = r.success ? "✅" : "❌";
    console.log(`  ${status} ${r.scenario}`);
    console.log(`     Summary: ${r.details.summaryLength}자`);
    console.log(`     RAG Quality: ${r.details.ragQuality}`);
    console.log(`     Lucky Numbers: ${r.details.hasLuckyNumbers ? "예" : "아니오"}`);
    console.log(`     Saju Analysis: ${r.details.hasSajuAnalysis ? "예" : "아니오"}`);
    console.log(`     Recommendations: ${r.details.hasRecommendations ? "3개 이상" : "부족"}`);
    if (r.errors.length > 0) {
      console.log(`     Errors: ${r.errors.join("; ")}`);
    }
    if (r.warnings.length > 0) {
      console.log(`     Warnings: ${r.warnings.length}개`);
    }
  });

  if (failed > 0) {
    console.log(`\n❌ 실패한 테스트:`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`   • ${r.scenario}: ${r.errors[0]}`);
    });
    process.exit(1);
  } else {
    console.log(`\n🎉 모든 테스트 통과!`);
    console.log(`   RAG 시스템이 사용자 관점에서 정상 작동합니다.`);
    process.exit(0);
  }
}

main().catch(error => {
  console.error("❌ 치명적 오류:", error);
  process.exit(1);
});
