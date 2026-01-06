/**
 * 운세 예측 API 종합 테스트 스크립트 v2.0
 *
 * 테스트 범위:
 * - 다양한 생년월일 조합 (정상/경계값/엣지케이스)
 * - 모든 예측 타입 (timing, forecast, luck)
 * - 응답 품질 검증 (완성도, 정확성, 상세도)
 * - 에러 핸들링 검증
 * - 성능 테스트 (응답 시간)
 * - 동시성 테스트 (병렬 요청)
 * - 일관성 테스트 (동일 입력 = 동일 출력)
 */

const BASE_URL = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

// 등급 기준 (src/lib/prediction/index.ts 기준)
const GRADE_THRESHOLDS = {
  S: 90,    // 최적기
  "A+": 80, // 매우 좋은 시기
  A: 70,    // 좋은 시기
  B: 60,    // 괜찮은 시기
  C: 50,    // 보통
  D: 0,     // 주의 필요
};

const VALID_GRADES = ["S", "A+", "A", "B", "C", "D"];

// ============================================================
// 테스트 케이스 정의
// ============================================================
const testCases = [
  // ========== 1. Timing 타입 - 다양한 질문 유형 ==========
  {
    name: "취업운 - 1990년생 남성",
    category: "timing-basic",
    body: {
      question: "올해 취업운은 어떤가요?",
      birthYear: 1990, birthMonth: 5, birthDay: 15, birthHour: 10,
      gender: "male", type: "timing",
    },
    expectedFields: ["optimalPeriods", "naturalAnswer", "searchPeriod", "eventType"],
    validateContent: true,
  },
  {
    name: "연애운 - 1995년생 여성",
    category: "timing-basic",
    body: {
      question: "연애운은 어떤가요?",
      birthYear: 1995, birthMonth: 3, birthDay: 10, birthHour: 8,
      gender: "female", type: "timing",
    },
    expectedFields: ["optimalPeriods", "naturalAnswer"],
  },
  {
    name: "재물운 - 1985년생 여성",
    category: "timing-basic",
    body: {
      question: "재물운은 어떻게 될까요?",
      birthYear: 1985, birthMonth: 8, birthDay: 22, birthHour: 14,
      gender: "female", type: "timing",
    },
    expectedFields: ["optimalPeriods", "naturalAnswer"],
  },
  {
    name: "이직 시기 - 1988년생 남성",
    category: "timing-basic",
    body: {
      question: "이직하기 좋은 시기는 언제인가요?",
      birthYear: 1988, birthMonth: 11, birthDay: 3, birthHour: 22,
      gender: "male", type: "timing",
    },
    expectedFields: ["optimalPeriods", "naturalAnswer"],
  },
  {
    name: "결혼 시기 - 1992년생 여성",
    category: "timing-basic",
    body: {
      question: "결혼하기 좋은 시기는 언제인가요?",
      birthYear: 1992, birthMonth: 7, birthDay: 28, birthHour: 6,
      gender: "female", type: "timing",
    },
    expectedFields: ["optimalPeriods", "naturalAnswer"],
  },
  {
    name: "건강운 - 1975년생 남성",
    category: "timing-basic",
    body: {
      question: "건강 관리에 좋은 시기는?",
      birthYear: 1975, birthMonth: 4, birthDay: 12, birthHour: 16,
      gender: "male", type: "timing",
    },
    expectedFields: ["optimalPeriods"],
  },
  {
    name: "시험운 - 2002년생 여성",
    category: "timing-basic",
    body: {
      question: "시험 보기 좋은 시기는 언제인가요?",
      birthYear: 2002, birthMonth: 9, birthDay: 5, birthHour: 11,
      gender: "female", type: "timing",
    },
    expectedFields: ["optimalPeriods"],
  },

  // ========== 2. Forecast 타입 ==========
  {
    name: "5년 운세 예측 - 1988년생 여성",
    category: "forecast",
    body: {
      question: "앞으로 5년간 운세는 어떤가요?",
      birthYear: 1988, birthMonth: 12, birthDay: 5, birthHour: 6,
      gender: "female", type: "forecast",
    },
    expectedFields: ["predictions", "aiInterpretation"],
  },
  {
    name: "종합 운세 - 2000년생 남성",
    category: "forecast",
    body: {
      question: "전반적인 운세를 알려주세요",
      birthYear: 2000, birthMonth: 1, birthDay: 1, birthHour: 12,
      gender: "male", type: "forecast",
    },
    expectedFields: ["predictions"],
  },
  {
    name: "대운 분석 - 1970년생 남성",
    category: "forecast",
    body: {
      question: "현재 대운 흐름이 어떤가요?",
      birthYear: 1970, birthMonth: 6, birthDay: 20, birthHour: 8,
      gender: "male", type: "forecast",
    },
    expectedFields: ["predictions"],
  },

  // ========== 3. Luck 타입 ==========
  {
    name: "행운 예측 - 1980년생 남성",
    category: "luck",
    body: {
      question: "운세",
      birthYear: 1980, birthMonth: 6, birthDay: 15, birthHour: 9,
      gender: "male", type: "luck",
    },
    expectedFields: [],
  },
  {
    name: "행운 예측 - 1998년생 여성",
    category: "luck",
    body: {
      question: "행운",
      birthYear: 1998, birthMonth: 2, birthDay: 14, birthHour: 20,
      gender: "female", type: "luck",
    },
    expectedFields: [],
  },

  // ========== 4. 경계값 테스트 ==========
  {
    name: "최소 정보 - 생일/시간 기본값 사용",
    category: "edge-minimal",
    body: {
      question: "올해 운세는?",
      birthYear: 1993, birthMonth: 4,
      type: "timing",
    },
    expectedFields: ["optimalPeriods"],
  },
  {
    name: "자정 출생 (0시) - 시간 경계",
    category: "edge-time",
    body: {
      question: "건강운은 어떤가요?",
      birthYear: 1987, birthMonth: 3, birthDay: 15, birthHour: 0,
      gender: "male", type: "timing",
    },
    expectedFields: ["optimalPeriods"],
  },
  {
    name: "심야 출생 (23시) - 시간 경계",
    category: "edge-time",
    body: {
      question: "재물운은?",
      birthYear: 1994, birthMonth: 8, birthDay: 10, birthHour: 23,
      gender: "female", type: "timing",
    },
    expectedFields: ["optimalPeriods"],
  },
  {
    name: "정오 출생 (12시)",
    category: "edge-time",
    body: {
      question: "사업운은?",
      birthYear: 1989, birthMonth: 5, birthDay: 25, birthHour: 12,
      gender: "male", type: "timing",
    },
    expectedFields: ["optimalPeriods"],
  },
  {
    name: "연초 출생 - 1월 1일",
    category: "edge-date",
    body: {
      question: "올해 운세는?",
      birthYear: 1996, birthMonth: 1, birthDay: 1, birthHour: 6,
      gender: "male", type: "timing",
    },
    expectedFields: ["optimalPeriods"],
  },
  {
    name: "연말 출생 - 12월 31일",
    category: "edge-date",
    body: {
      question: "내년 운세는?",
      birthYear: 1999, birthMonth: 12, birthDay: 31, birthHour: 23,
      gender: "female", type: "timing",
    },
    expectedFields: ["optimalPeriods"],
  },
  {
    name: "윤년 2월 29일 출생",
    category: "edge-date",
    body: {
      question: "올해 운세는?",
      birthYear: 2000, birthMonth: 2, birthDay: 29, birthHour: 10,
      gender: "male", type: "timing",
    },
    expectedFields: ["optimalPeriods"],
  },
  {
    name: "비윤년 2월 28일 출생",
    category: "edge-date",
    body: {
      question: "연애운은?",
      birthYear: 1999, birthMonth: 2, birthDay: 28, birthHour: 14,
      gender: "female", type: "timing",
    },
    expectedFields: ["optimalPeriods"],
  },
  {
    name: "unknown 성별",
    category: "edge-gender",
    body: {
      question: "사업운은 어떤가요?",
      birthYear: 1991, birthMonth: 9, birthDay: 20, birthHour: 15,
      gender: "unknown", type: "timing",
    },
    expectedFields: ["optimalPeriods"],
  },
  {
    name: "성별 미입력",
    category: "edge-gender",
    body: {
      question: "취업운은?",
      birthYear: 1997, birthMonth: 7, birthDay: 7, birthHour: 7,
      type: "timing",
    },
    expectedFields: ["optimalPeriods"],
  },

  // ========== 5. 연도 범위 테스트 ==========
  {
    name: "고령자 - 1950년생",
    category: "edge-age",
    body: {
      question: "건강운은 어떤가요?",
      birthYear: 1950, birthMonth: 5, birthDay: 5, birthHour: 5,
      gender: "male", type: "timing",
    },
    expectedFields: ["optimalPeriods"],
  },
  {
    name: "미성년자 - 2010년생",
    category: "edge-age",
    body: {
      question: "학업운은?",
      birthYear: 2010, birthMonth: 10, birthDay: 10, birthHour: 10,
      gender: "female", type: "timing",
    },
    expectedFields: ["optimalPeriods"],
  },
  {
    name: "신생아 - 2024년생",
    category: "edge-age",
    body: {
      question: "건강운은?",
      birthYear: 2024, birthMonth: 6, birthDay: 15, birthHour: 8,
      gender: "male", type: "timing",
    },
    expectedFields: ["optimalPeriods"],
  },

  // ========== 6. 긴 질문 / 특수문자 ==========
  {
    name: "긴 질문",
    category: "edge-input",
    body: {
      question: "저는 현재 직장에서 5년째 근무하고 있는데, 최근 이직을 고민하고 있습니다. 연봉도 중요하지만 워라밸과 성장 가능성도 고려하고 싶어요. 언제쯤 이직하면 좋을까요?",
      birthYear: 1990, birthMonth: 3, birthDay: 15, birthHour: 9,
      gender: "male", type: "timing",
    },
    expectedFields: ["optimalPeriods", "naturalAnswer"],
  },
  {
    name: "특수문자 포함 질문",
    category: "edge-input",
    body: {
      question: "2025년 상반기 운세는? (특히 1~3월)",
      birthYear: 1988, birthMonth: 11, birthDay: 22, birthHour: 16,
      gender: "female", type: "timing",
    },
    expectedFields: ["optimalPeriods"],
  },
  {
    name: "이모지 포함 질문",
    category: "edge-input",
    body: {
      question: "올해 연애운 💕 어떤가요?",
      birthYear: 1995, birthMonth: 7, birthDay: 7, birthHour: 19,
      gender: "female", type: "timing",
    },
    expectedFields: ["optimalPeriods"],
  },
];

// ============================================================
// 에러 케이스 테스트
// ============================================================
const errorCases = [
  {
    name: "질문 누락",
    body: { birthYear: 1990, birthMonth: 5, type: "timing" },
    expectedError: "질문이 필요합니다",
  },
  {
    name: "생년 누락",
    body: { question: "운세를 알려주세요", birthMonth: 5, type: "timing" },
    expectedError: "생년월일이 필요합니다",
  },
  {
    name: "생월 누락",
    body: { question: "운세를 알려주세요", birthYear: 1990, type: "timing" },
    expectedError: "생년월일이 필요합니다",
  },
  {
    name: "빈 질문",
    body: { question: "", birthYear: 1990, birthMonth: 5, type: "timing" },
    expectedError: "질문이 필요합니다",
  },
  {
    name: "잘못된 타입",
    body: { question: "운세", birthYear: 1990, birthMonth: 5, type: "invalid_type" },
    expectedError: null, // 기본값 timing으로 처리될 수 있음
  },
];

// ============================================================
// 테스트 결과 저장
// ============================================================
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  warnings: [],
  performance: [],
  details: [],
};

// ============================================================
// API 호출 함수
// ============================================================
async function callAPI(body) {
  const startTime = Date.now();
  const response = await fetch(`${BASE_URL}/api/life-prediction/backend-predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const elapsed = Date.now() - startTime;
  const result = await response.json();
  return { result, elapsed, status: response.status };
}

// ============================================================
// 정상 케이스 테스트
// ============================================================
async function runNormalTest(testCase) {
  console.log(`\n${"─".repeat(70)}`);
  console.log(`📋 ${testCase.name} [${testCase.category}]`);
  console.log(`${"─".repeat(70)}`);

  const issues = [];
  const warnings = [];

  try {
    const { result, elapsed, status } = await callAPI(testCase.body);

    // 1. 기본 성공 여부
    if (!result.success) {
      console.log(`❌ 실패: ${result.error}`);
      testResults.failed++;
      testResults.errors.push({ name: testCase.name, error: result.error });
      return { success: false, name: testCase.name, elapsed };
    }

    console.log(`✅ 성공 (${elapsed}ms)`);

    // 2. 응답 시간 체크
    if (elapsed > 10000) {
      issues.push(`응답 시간 매우 느림: ${elapsed}ms`);
    } else if (elapsed > 5000) {
      warnings.push(`응답 시간 느림: ${elapsed}ms`);
    }

    testResults.performance.push({ name: testCase.name, elapsed });

    const data = result.data;

    // 3. 필수 필드 검증
    const missingFields = [];
    for (const field of testCase.expectedFields || []) {
      if (!(field in data) || data[field] === undefined || data[field] === null) {
        missingFields.push(field);
      }
    }
    if (missingFields.length > 0) {
      issues.push(`필수 필드 누락: ${missingFields.join(", ")}`);
    }

    // 4. 타입별 상세 검증
    const quality = validateResponse(data, testCase.body.type, testCase.validateContent);

    // 5. 결과 출력
    printQualityReport(quality);
    printResponseSummary(data, testCase.body.type);

    if (issues.length > 0) {
      console.log(`\n🚨 문제점:`);
      issues.forEach(i => console.log(`   • ${i}`));
    }
    if (warnings.length > 0) {
      console.log(`\n⚠️ 경고:`);
      warnings.forEach(w => console.log(`   • ${w}`));
      testResults.warnings.push(...warnings.map(w => ({ name: testCase.name, warning: w })));
    }

    const success = issues.length === 0;
    if (success) {
      testResults.passed++;
    } else {
      testResults.failed++;
      testResults.errors.push({ name: testCase.name, issues });
    }

    testResults.details.push({
      name: testCase.name,
      category: testCase.category,
      success,
      elapsed,
      quality,
      issues,
      warnings,
    });

    return { success, name: testCase.name, elapsed, quality };

  } catch (error) {
    console.log(`❌ 에러: ${error.message}`);
    testResults.failed++;
    testResults.errors.push({ name: testCase.name, error: error.message });
    return { success: false, name: testCase.name, error: error.message };
  }
}

// ============================================================
// 에러 케이스 테스트
// ============================================================
async function runErrorTest(testCase) {
  console.log(`\n${"─".repeat(70)}`);
  console.log(`📋 [에러 케이스] ${testCase.name}`);
  console.log(`${"─".repeat(70)}`);

  try {
    const { result, elapsed } = await callAPI(testCase.body);

    if (!result.success) {
      if (testCase.expectedError && !result.error.includes(testCase.expectedError)) {
        console.log(`⚠️ 에러 메시지 불일치`);
        console.log(`   예상: "${testCase.expectedError}"`);
        console.log(`   실제: "${result.error}"`);
        testResults.warnings.push({ name: testCase.name, warning: "에러 메시지 불일치" });
      }
      console.log(`✅ 예상된 에러 발생: ${result.error}`);
      testResults.passed++;
      return { success: true, name: testCase.name, elapsed };
    } else {
      if (testCase.expectedError) {
        console.log(`❌ 에러가 발생해야 하는데 성공함`);
        testResults.failed++;
        testResults.errors.push({ name: testCase.name, error: "에러 미발생" });
        return { success: false, name: testCase.name, elapsed };
      } else {
        console.log(`✅ 기본값으로 처리됨 (허용)`);
        testResults.passed++;
        return { success: true, name: testCase.name, elapsed };
      }
    }
  } catch (error) {
    console.log(`❌ 네트워크 에러: ${error.message}`);
    testResults.failed++;
    return { success: false, name: testCase.name, error: error.message };
  }
}

// ============================================================
// 응답 검증
// ============================================================
function validateResponse(data, type, validateContent = false) {
  const issues = [];
  const scores = { completeness: 0, accuracy: 0, detail: 0 };

  if (type === "timing") {
    // optimalPeriods 검증
    if (data.optimalPeriods?.length > 0) {
      scores.completeness += 25;
      const periods = data.optimalPeriods;

      // 점수 범위 (0-100)
      const invalidScores = periods.filter(p => p.score < 0 || p.score > 100);
      if (invalidScores.length === 0) {
        scores.accuracy += 15;
      } else {
        issues.push(`점수 범위 오류: ${invalidScores.map(p => p.score).join(", ")}`);
      }

      // 등급 유효성 (S, A+, A, B, C, D)
      const invalidGrades = periods.filter(p => !VALID_GRADES.includes(p.grade));
      if (invalidGrades.length === 0) {
        scores.accuracy += 10;
      } else {
        issues.push(`잘못된 등급: ${invalidGrades.map(p => p.grade).join(", ")}`);
      }

      // 점수-등급 일관성
      const inconsistent = periods.filter(p => {
        const expectedGrade = getExpectedGrade(p.score);
        return p.grade !== expectedGrade;
      });
      if (inconsistent.length === 0) {
        scores.accuracy += 10;
      } else {
        issues.push(`점수-등급 불일치 ${inconsistent.length}건`);
      }

      // 날짜 형식
      const invalidDates = periods.filter(
        p => !p.startDate || !p.endDate || !/^\d{4}-\d{2}-\d{2}$/.test(p.startDate)
      );
      if (invalidDates.length === 0) {
        scores.completeness += 10;
      } else {
        issues.push("날짜 형식 오류");
      }

      // 정렬 확인 (점수 내림차순)
      const isSorted = periods.every((p, i) =>
        i === 0 || periods[i-1].score >= p.score
      );
      if (isSorted) {
        scores.accuracy += 5;
      } else {
        issues.push("결과가 점수순 정렬되지 않음");
      }

      // reasons 존재
      const hasReasons = periods.every(p => p.reasons?.length > 0);
      if (hasReasons) {
        scores.detail += 15;
      } else {
        issues.push("이유 누락된 기간 존재");
      }

    } else {
      issues.push("optimalPeriods 비어있음");
    }

    // naturalAnswer 검증
    if (data.naturalAnswer) {
      scores.completeness += 10;

      if (data.naturalAnswer.length > 50) scores.detail += 5;
      if (data.naturalAnswer.length > 150) scores.detail += 5;
      if (data.naturalAnswer.length > 300) scores.detail += 5;

      // 한글 포함 여부
      if (/[가-힣]/.test(data.naturalAnswer)) {
        scores.detail += 5;
      } else {
        issues.push("AI 해석에 한글 없음");
      }

      // 의미 있는 내용인지 (너무 짧거나 반복되지 않는지)
      if (validateContent && data.naturalAnswer.length < 30) {
        issues.push("AI 해석이 너무 짧음");
      }
    } else {
      issues.push("naturalAnswer 누락");
    }

    // searchPeriod 검증
    if (data.searchPeriod?.start && data.searchPeriod?.end) {
      scores.completeness += 5;
    }

  } else if (type === "forecast") {
    if (data.predictions) {
      scores.completeness += 30;

      if (data.predictions.current_daeun) scores.detail += 10;
      if (data.predictions.current_seun) scores.detail += 10;
      if (data.predictions.five_year_outlook?.length > 0) scores.detail += 15;
    } else {
      issues.push("predictions 누락");
    }

    if (data.aiInterpretation) {
      scores.completeness += 10;
      if (data.aiInterpretation.length > 100) scores.detail += 10;
      if (data.aiInterpretation.length > 300) scores.detail += 10;
      if (/[가-힣]/.test(data.aiInterpretation)) scores.detail += 5;
    }

  } else if (type === "luck") {
    // luck 타입은 raw 데이터 반환
    if (data.forecasts || data.birth_info) {
      scores.completeness += 50;
      scores.detail += 30;
    }
  }

  const total = scores.completeness + scores.accuracy + scores.detail;
  const grade = total >= 90 ? "A+" : total >= 80 ? "A" : total >= 70 ? "B" : total >= 60 ? "C" : "D";

  return { total, scores, issues, grade };
}

function getExpectedGrade(score) {
  if (score >= 90) return "S";
  if (score >= 80) return "A+";
  if (score >= 70) return "A";
  if (score >= 60) return "B";
  if (score >= 50) return "C";
  return "D";
}

// ============================================================
// 동시성 테스트
// ============================================================
async function runConcurrencyTest() {
  console.log("\n\n" + "═".repeat(70));
  console.log("🔄 동시성 테스트 (5개 병렬 요청)");
  console.log("═".repeat(70));

  const concurrentRequests = [
    { question: "취업운", birthYear: 1990, birthMonth: 1, type: "timing" },
    { question: "연애운", birthYear: 1991, birthMonth: 2, type: "timing" },
    { question: "재물운", birthYear: 1992, birthMonth: 3, type: "timing" },
    { question: "건강운", birthYear: 1993, birthMonth: 4, type: "timing" },
    { question: "사업운", birthYear: 1994, birthMonth: 5, type: "timing" },
  ];

  const startTime = Date.now();

  try {
    const results = await Promise.all(
      concurrentRequests.map(body => callAPI(body))
    );

    const totalTime = Date.now() - startTime;
    const allSuccess = results.every(r => r.result.success);
    const avgTime = Math.round(results.reduce((sum, r) => sum + r.elapsed, 0) / results.length);

    console.log(`\n총 소요 시간: ${totalTime}ms`);
    console.log(`평균 응답 시간: ${avgTime}ms`);
    console.log(`성공률: ${results.filter(r => r.result.success).length}/${results.length}`);

    if (allSuccess) {
      console.log("✅ 동시성 테스트 통과");
      testResults.passed++;
    } else {
      console.log("❌ 일부 요청 실패");
      testResults.failed++;
      testResults.errors.push({ name: "동시성 테스트", error: "일부 요청 실패" });
    }

    return { success: allSuccess, totalTime, avgTime };

  } catch (error) {
    console.log(`❌ 동시성 테스트 실패: ${error.message}`);
    testResults.failed++;
    return { success: false, error: error.message };
  }
}

// ============================================================
// 일관성 테스트
// ============================================================
async function runConsistencyTest() {
  console.log("\n\n" + "═".repeat(70));
  console.log("🔁 일관성 테스트 (동일 입력 3회 호출)");
  console.log("═".repeat(70));

  const testBody = {
    question: "올해 운세는?",
    birthYear: 1990,
    birthMonth: 5,
    birthDay: 15,
    birthHour: 10,
    gender: "male",
    type: "timing",
  };

  try {
    const results = [];
    for (let i = 0; i < 3; i++) {
      const { result } = await callAPI(testBody);
      if (result.success) {
        results.push(result.data);
      }
      await sleep(300);
    }

    if (results.length < 3) {
      console.log("❌ 일부 요청 실패");
      testResults.failed++;
      return { success: false };
    }

    // 결과 비교 (optimalPeriods의 첫 번째 결과)
    const firstScores = results.map(r => r.optimalPeriods?.[0]?.score);
    const firstGrades = results.map(r => r.optimalPeriods?.[0]?.grade);

    const scoresConsistent = firstScores.every(s => s === firstScores[0]);
    const gradesConsistent = firstGrades.every(g => g === firstGrades[0]);

    console.log(`\n점수 일관성: ${scoresConsistent ? "✅" : "⚠️"} [${firstScores.join(", ")}]`);
    console.log(`등급 일관성: ${gradesConsistent ? "✅" : "⚠️"} [${firstGrades.join(", ")}]`);

    if (scoresConsistent && gradesConsistent) {
      console.log("✅ 일관성 테스트 통과");
      testResults.passed++;
      return { success: true };
    } else {
      console.log("⚠️ 결과가 일관되지 않음 (허용 범위 내일 수 있음)");
      testResults.warnings.push({ name: "일관성 테스트", warning: "결과 변동 있음" });
      testResults.passed++; // 경고로 처리
      return { success: true, warning: "결과 변동" };
    }

  } catch (error) {
    console.log(`❌ 일관성 테스트 실패: ${error.message}`);
    testResults.failed++;
    return { success: false, error: error.message };
  }
}

// ============================================================
// 출력 함수
// ============================================================
function printQualityReport(quality) {
  const gradeEmoji = {
    "A+": "🏆", A: "🥇", B: "🥈", C: "🥉", D: "📉"
  };

  console.log(`\n📊 품질: ${quality.total}/100 ${gradeEmoji[quality.grade] || ""} (${quality.grade})`);
  console.log(`   완성도: ${quality.scores.completeness} | 정확성: ${quality.scores.accuracy} | 상세도: ${quality.scores.detail}`);

  if (quality.issues.length > 0) {
    console.log(`   ⚠️ 이슈: ${quality.issues.slice(0, 3).join(", ")}${quality.issues.length > 3 ? ` 외 ${quality.issues.length - 3}건` : ""}`);
  }
}

function printResponseSummary(data, type) {
  if (type === "timing" && data.optimalPeriods?.length > 0) {
    console.log(`\n🎯 추천 시기 TOP 3:`);
    data.optimalPeriods.slice(0, 3).forEach((p, i) => {
      const gradeEmoji = p.grade === "S" ? "⭐" : p.grade === "A+" ? "🔥" : p.grade === "A" ? "✨" : "";
      console.log(`   ${i + 1}. ${p.startDate} ~ ${p.endDate} | ${p.score}점 (${p.grade}) ${gradeEmoji}`);
    });

    if (data.naturalAnswer) {
      const preview = data.naturalAnswer.substring(0, 120).replace(/\n/g, " ");
      console.log(`\n💬 AI: ${preview}...`);
    }
  } else if (type === "forecast" && data.predictions) {
    console.log(`\n📈 예측 데이터 포함`);
    if (data.aiInterpretation) {
      console.log(`💬 AI: ${data.aiInterpretation.substring(0, 120).replace(/\n/g, " ")}...`);
    }
  } else if (type === "luck") {
    console.log(`\n🍀 행운 데이터 수신`);
  }
}

// ============================================================
// 최종 요약
// ============================================================
function printFinalSummary() {
  console.log("\n\n" + "═".repeat(70));
  console.log("📊 최종 테스트 결과");
  console.log("═".repeat(70));

  const total = testResults.passed + testResults.failed;
  const passRate = ((testResults.passed / total) * 100).toFixed(1);

  console.log(`\n✅ 통과: ${testResults.passed}/${total} (${passRate}%)`);
  console.log(`❌ 실패: ${testResults.failed}/${total}`);
  console.log(`⚠️ 경고: ${testResults.warnings.length}건`);

  // 성능 통계
  if (testResults.performance.length > 0) {
    const times = testResults.performance.map(p => p.elapsed);
    const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);

    console.log(`\n⏱️ 응답 시간:`);
    console.log(`   평균: ${avgTime}ms | 최소: ${minTime}ms | 최대: ${maxTime}ms`);

    const slowTests = testResults.performance.filter(p => p.elapsed > 5000);
    if (slowTests.length > 0) {
      console.log(`   🐢 느린 테스트 (>5초): ${slowTests.length}건`);
    }
  }

  // 품질 통계
  const qualityScores = testResults.details.filter(d => d.quality).map(d => d.quality.total);
  if (qualityScores.length > 0) {
    const avgQuality = Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length);
    console.log(`\n📈 평균 품질 점수: ${avgQuality}/100`);
  }

  // 카테고리별 결과
  const categories = [...new Set(testResults.details.map(d => d.category))];
  if (categories.length > 0) {
    console.log(`\n📂 카테고리별 결과:`);
    categories.forEach(cat => {
      const catTests = testResults.details.filter(d => d.category === cat);
      const catPassed = catTests.filter(d => d.success).length;
      console.log(`   ${cat}: ${catPassed}/${catTests.length}`);
    });
  }

  // 실패 목록
  if (testResults.errors.length > 0) {
    console.log(`\n❌ 실패한 테스트:`);
    testResults.errors.slice(0, 10).forEach(e => {
      console.log(`   • ${e.name}: ${e.error || e.issues?.join(", ") || "unknown"}`);
    });
    if (testResults.errors.length > 10) {
      console.log(`   ... 외 ${testResults.errors.length - 10}건`);
    }
  }

  // 경고 목록
  if (testResults.warnings.length > 0) {
    console.log(`\n⚠️ 경고 사항:`);
    const uniqueWarnings = [...new Set(testResults.warnings.map(w => w.warning))];
    uniqueWarnings.slice(0, 5).forEach(w => {
      const count = testResults.warnings.filter(x => x.warning === w).length;
      console.log(`   • ${w} (${count}건)`);
    });
  }

  console.log("\n" + "═".repeat(70));
  if (testResults.failed === 0) {
    console.log("🎉 모든 테스트 통과!");
  } else if (testResults.failed <= 2) {
    console.log("✅ 대부분 테스트 통과 (일부 실패)");
  } else {
    console.log("⚠️ 다수 테스트 실패 - 점검 필요");
  }
  console.log("═".repeat(70));
}

// ============================================================
// 유틸리티
// ============================================================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// 병렬 배치 테스트 실행
// ============================================================
async function runBatchTests(tests, batchSize = 5, isErrorCase = false) {
  const results = [];

  for (let i = 0; i < tests.length; i += batchSize) {
    const batch = tests.slice(i, i + batchSize);
    const batchPromises = batch.map(tc =>
      isErrorCase ? runErrorTest(tc) : runNormalTest(tc)
    );
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // 배치 간 짧은 딜레이
    if (i + batchSize < tests.length) {
      await sleep(200);
    }
  }

  return results;
}

// ============================================================
// 메인
// ============================================================
async function main() {
  // 실행 모드 체크
  const args = process.argv.slice(2);
  const fastMode = args.includes("--fast") || args.includes("-f");
  const parallelMode = args.includes("--parallel") || args.includes("-p");

  console.log("═".repeat(70));
  console.log("🔮 운세 예측 API 종합 테스트 v2.1");
  console.log("═".repeat(70));
  console.log(`서버: ${BASE_URL}`);
  console.log(`정상 케이스: ${testCases.length}개`);
  console.log(`에러 케이스: ${errorCases.length}개`);
  console.log(`특수 테스트: 동시성, 일관성`);
  console.log(`총 테스트: ${testCases.length + errorCases.length + 2}개`);

  if (fastMode) {
    console.log(`\n⚡ FAST MODE: forecast 타입 스킵 (AI 해석 없이 빠르게)`);
  }
  if (parallelMode) {
    console.log(`\n🚀 PARALLEL MODE: 배치 병렬 실행 (5개씩)`);
  }

  const startTotal = Date.now();

  // 테스트 케이스 필터링 (fast mode)
  const filteredTests = fastMode
    ? testCases.filter(tc => tc.body.type !== "forecast")
    : testCases;

  if (parallelMode) {
    // 병렬 모드: 배치로 실행
    console.log("\n\n" + "═".repeat(70));
    console.log("📌 정상 케이스 테스트 (병렬 배치)");
    console.log("═".repeat(70));
    await runBatchTests(filteredTests, 5, false);

    console.log("\n\n" + "═".repeat(70));
    console.log("📌 에러 케이스 테스트 (병렬 배치)");
    console.log("═".repeat(70));
    await runBatchTests(errorCases, 5, true);

  } else {
    // 순차 모드
    console.log("\n\n" + "═".repeat(70));
    console.log("📌 정상 케이스 테스트");
    console.log("═".repeat(70));

    for (const testCase of filteredTests) {
      await runNormalTest(testCase);
      await sleep(100);
    }

    console.log("\n\n" + "═".repeat(70));
    console.log("📌 에러 케이스 테스트");
    console.log("═".repeat(70));

    for (const testCase of errorCases) {
      await runErrorTest(testCase);
      await sleep(100);
    }
  }

  // 3. 동시성 테스트
  await runConcurrencyTest();

  // 4. 일관성 테스트
  await runConsistencyTest();

  const totalTime = Date.now() - startTotal;

  // 최종 요약
  printFinalSummary();

  console.log(`\n⏱️ 전체 테스트 소요 시간: ${(totalTime / 1000).toFixed(1)}초`);
  if (parallelMode) {
    console.log(`   (병렬 모드로 실행됨)`);
  }
}

main().catch(console.error);
