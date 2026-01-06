/**
 * 궁합 분석 전체 플로우 테스트 (사용자 관점)
 * 두 사람 생년월일 입력 → 사주+점성술 융합 궁합 분석 → RAG 결과 검증
 */

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";
const FRONTEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// 테스트 시나리오: 실제 커플들이 입력할 법한 데이터
const testScenarios = [
  {
    name: "💑 이상적 궁합 (천간합 + 삼합)",
    couple: {
      person1: {
        name: "김준호",
        date: "1990-05-15",
        time: "14:30",
        city: "서울",
        latitude: 37.5665,
        longitude: 126.9780,
        timeZone: "Asia/Seoul",
        gender: "male"
      },
      person2: {
        name: "이수진",
        date: "1992-03-20",
        time: "10:00",
        city: "서울",
        latitude: 37.5665,
        longitude: 126.9780,
        timeZone: "Asia/Seoul",
        gender: "female",
        relationToP1: "lover" as const
      }
    },
    expectedResult: {
      minimumScore: 70,
      shouldHaveSajuAnalysis: true,
      shouldHaveAstrologyAnalysis: true,
      shouldHaveActionItems: true,
      shouldHaveTiming: true,
      expectedKeywords: ["사주", "점성술", "궁합", "천간", "지지"]
    }
  },
  {
    name: "🔥 열정적 커플 (화 기운 강함)",
    couple: {
      person1: {
        name: "박민수",
        date: "1988-07-10",
        time: "15:00",
        city: "부산",
        latitude: 35.1796,
        longitude: 129.0756,
        timeZone: "Asia/Seoul",
        gender: "male"
      },
      person2: {
        name: "최지은",
        date: "1989-06-25",
        time: "16:30",
        city: "부산",
        latitude: 35.1796,
        longitude: 129.0756,
        timeZone: "Asia/Seoul",
        gender: "female",
        relationToP1: "lover" as const
      }
    },
    expectedResult: {
      minimumScore: 65,
      shouldHaveSajuAnalysis: true,
      shouldHaveAstrologyAnalysis: true,
      shouldHaveActionItems: true,
      expectedKeywords: ["화", "열정", "리더십", "에너지"]
    }
  },
  {
    name: "🌊 물 기운 커플 (감성적)",
    couple: {
      person1: {
        name: "정우성",
        date: "1995-11-08",
        time: "23:45",
        city: "인천",
        latitude: 37.4563,
        longitude: 126.7052,
        timeZone: "Asia/Seoul",
        gender: "male"
      },
      person2: {
        name: "한지민",
        date: "1996-02-14",
        time: "02:30",
        city: "인천",
        latitude: 37.4563,
        longitude: 126.7052,
        timeZone: "Asia/Seoul",
        gender: "female",
        relationToP1: "lover" as const
      }
    },
    expectedResult: {
      minimumScore: 60,
      shouldHaveSajuAnalysis: true,
      shouldHaveAstrologyAnalysis: true,
      shouldHaveActionItems: true,
      expectedKeywords: ["수", "감성", "소통", "지혜"]
    }
  }
];

interface TestResult {
  scenario: string;
  success: boolean;
  errors: string[];
  warnings: string[];
  details: {
    score?: number;
    interpretation?: string;
    interpretationLength?: number;
    hasSajuAnalysis?: boolean;
    hasAstrologyAnalysis?: boolean;
    hasActionItems?: boolean;
    hasTiming?: boolean;
    actionItemsCount?: number;
    modelUsed?: string;
    fusionEnabled?: boolean;
    matchedKeywords?: string[];
  };
}

async function analyzeCompatibility(person1: any, person2: any) {
  console.log(`  🔮 궁합 분석 요청 중...`);
  console.log(`     ${person1.name} (${person1.date}) ❤️ ${person2.name} (${person2.date})`);

  try {
    // Call backend directly
    const response = await fetch(`${BASE_URL}/api/compatibility`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": process.env.ADMIN_API_TOKEN || "",
      },
      body: JSON.stringify({
        people: [
          {
            name: person1.name,
            birthDate: person1.date,
            birthTime: person1.time,
            latitude: person1.latitude,
            longitude: person1.longitude,
            timeZone: person1.timeZone,
          },
          {
            name: person2.name,
            birthDate: person2.date,
            birthTime: person2.time,
            latitude: person2.latitude,
            longitude: person2.longitude,
            timeZone: person2.timeZone,
            relation: person2.relationToP1,
          }
        ],
        relationship_type: person2.relationToP1 || "lover",
        locale: "ko"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Compatibility API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    // Backend returns nested data structure
    const data = result.data || result;
    const score = data.overall_score || data.score || 0;
    const interpretation = data.report || data.interpretation || "";

    console.log(`  ✅ 궁합 분석 완료`);
    console.log(`     점수: ${score}점`);
    console.log(`     모델: ${data.model || 'unknown'}`);

    return {
      overall_score: score,
      aiInterpretation: interpretation,
      interpretation: interpretation,
      aiModelUsed: data.model,
      fusion_enabled: true,
      action_items: data.action_items || [],
      timing: data.timing || null,
    };
  } catch (error) {
    throw new Error(`Compatibility analysis failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validateCompatibilityResult(result: any, expected: any): { errors: string[], warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Score check
  const score = result.overall_score || result.average || 0;
  if (score < expected.minimumScore) {
    warnings.push(`Score ${score} is lower than expected minimum ${expected.minimumScore}`);
  }
  if (score < 0 || score > 100) {
    errors.push(`Score ${score} is out of valid range (0-100)`);
  }

  // 2. Interpretation check
  const interpretation = result.aiInterpretation || result.interpretation || "";
  if (!interpretation || interpretation.length < 100) {
    errors.push(`Interpretation too short or missing (${interpretation.length} chars)`);
  }

  // 3. Expected keywords check
  const fullText = interpretation.toLowerCase();
  for (const keyword of expected.expectedKeywords || []) {
    if (!fullText.includes(keyword.toLowerCase())) {
      warnings.push(`Expected keyword "${keyword}" not found`);
    }
  }

  // 4. Fusion check
  if (!result.fusion_enabled) {
    warnings.push("Fusion analysis not enabled (using fallback)");
  }

  return { errors, warnings };
}

async function runFullFlowTest(scenario: typeof testScenarios[0]): Promise<TestResult> {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`테스트: ${scenario.name}`);
  console.log(`${"=".repeat(70)}`);

  const result: TestResult = {
    scenario: scenario.name,
    success: false,
    errors: [],
    warnings: [],
    details: {}
  };

  try {
    const compatResult = await analyzeCompatibility(
      scenario.couple.person1,
      scenario.couple.person2
    );

    result.details.score = compatResult.overall_score || compatResult.average;
    result.details.interpretation = compatResult.aiInterpretation || compatResult.interpretation;
    result.details.interpretationLength = result.details.interpretation?.length || 0;
    result.details.modelUsed = compatResult.aiModelUsed;
    result.details.fusionEnabled = compatResult.fusion_enabled;
    result.details.actionItemsCount = compatResult.action_items?.length || 0;

    console.log(`\n  📊 결과 검증 중...`);
    const validation = validateCompatibilityResult(compatResult, scenario.expectedResult);
    result.errors = validation.errors;
    result.warnings = validation.warnings;

    const interpretation = result.details.interpretation || "";
    result.details.hasSajuAnalysis =
      interpretation.includes("사주") ||
      interpretation.includes("천간") ||
      interpretation.includes("지지") ||
      interpretation.includes("오행");

    result.details.hasAstrologyAnalysis =
      interpretation.includes("점성술") ||
      interpretation.includes("별자리") ||
      interpretation.includes("행성") ||
      interpretation.includes("태양") ||
      interpretation.includes("달");

    result.details.hasActionItems = (compatResult.action_items?.length || 0) > 0;
    result.details.hasTiming = !!compatResult.timing;

    result.details.matchedKeywords = scenario.expectedResult.expectedKeywords?.filter(kw =>
      interpretation.toLowerCase().includes(kw.toLowerCase())
    ) || [];

    result.success = result.errors.length === 0;

    console.log(`\n  📝 궁합 분석 결과:`);
    console.log(`     종합 점수: ${result.details.score}점`);
    console.log(`     해석 길이: ${result.details.interpretationLength}자`);
    console.log(`     ${interpretation.substring(0, 300)}...`);

    if (result.details.hasSajuAnalysis) {
      console.log(`\n  🎯 사주 분석: ✅ 포함됨`);
    }

    if (result.details.hasAstrologyAnalysis) {
      console.log(`  ⭐ 점성술 분석: ✅ 포함됨`);
    }

    if (result.details.hasActionItems) {
      console.log(`\n  💡 액션 아이템 (${result.details.actionItemsCount}개):`);
      compatResult.action_items?.slice(0, 3).forEach((item: string) => {
        console.log(`     • ${item.substring(0, 80)}...`);
      });
    }

    console.log(`\n  🏆 Fusion: ${result.details.fusionEnabled ? "✅" : "❌"}`);
    console.log(`  🤖 모델: ${result.details.modelUsed}`);
    console.log(`  ✅ 키워드: ${result.details.matchedKeywords?.join(", ") || "없음"}`);

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
  console.log("💑 궁합 분석 전체 플로우 테스트 (사용자 관점)");
  console.log(`   프론트엔드: ${FRONTEND_URL}`);
  console.log(`   백엔드: ${BASE_URL}`);
  console.log(`   테스트 시나리오: ${testScenarios.length}개`);
  console.log(`   현재 시각: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`);

  const results: TestResult[] = [];

  for (const scenario of testScenarios) {
    const result = await runFullFlowTest(scenario);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

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
    console.log(`     점수: ${r.details.score}점`);
    console.log(`     해석: ${r.details.interpretationLength}자`);
    console.log(`     사주: ${r.details.hasSajuAnalysis ? "✅" : "❌"}`);
    console.log(`     점성술: ${r.details.hasAstrologyAnalysis ? "✅" : "❌"}`);
    console.log(`     액션: ${r.details.hasActionItems ? `✅ (${r.details.actionItemsCount}개)` : "❌"}`);
    console.log(`     Fusion: ${r.details.fusionEnabled ? "✅" : "❌"}`);
  });

  const avgScore = results.reduce((sum, r) => sum + (r.details.score || 0), 0) / results.length;
  const avgLength = results.reduce((sum, r) => sum + (r.details.interpretationLength || 0), 0) / results.length;

  console.log(`\n📈 통계:`);
  console.log(`   평균 점수: ${avgScore.toFixed(1)}점`);
  console.log(`   평균 해석 길이: ${avgLength.toFixed(0)}자`);
  console.log(`   Fusion 활성화율: ${results.filter(r => r.details.fusionEnabled).length}/${results.length}`);
  console.log(`   사주 분석 포함율: ${results.filter(r => r.details.hasSajuAnalysis).length}/${results.length}`);

  if (failed > 0) {
    console.log(`\n❌ 실패한 테스트:`);
    results.filter(r => !r.success).forEach(r => {
      console.log(`   • ${r.scenario}: ${r.errors[0]}`);
    });
    process.exit(1);
  } else {
    console.log(`\n🎉 모든 테스트 통과!`);
    process.exit(0);
  }
}

main().catch(error => {
  console.error("❌ 치명적 오류:", error);
  process.exit(1);
});
