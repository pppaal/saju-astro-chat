/**
 * 타로 스프레드 선택 로직 테스트
 * 실제 사용자가 엉망으로 질문할 법한 시나리오 테스트
 */

interface TestCase {
  question: string;
  expectedTheme: string;
  expectedSpread: string;
  category: string;
  notes?: string;
}

const testCases: TestCase[] = [
  // ============================================================
  // Category 1: Yes/No 질문 (가장 많은 케이스)
  // ============================================================
  {
    question: "오늘 운동갈까?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "yes-no-why",
    category: "Yes/No - 명확한 케이스",
  },
  {
    question: "이 옷 살까?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "yes-no-why",
    category: "Yes/No - 명확한 케이스",
  },
  {
    question: "그 사람한테 연락할까?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "yes-no-why",
    category: "Yes/No - 명확한 케이스",
  },
  {
    question: "개한테 뽀뽀할까?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "yes-no-why",
    category: "Yes/No - 장난스러운 질문",
    notes: "장난 질문도 yes/no 패턴이면 yes-no-why"
  },
  {
    question: "라면 먹을까?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "yes-no-why",
    category: "Yes/No - 일상 질문",
  },
  {
    question: "술 마실까?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "yes-no-why",
    category: "Yes/No - 일상 질문",
  },

  // ============================================================
  // Category 2: 띄어쓰기/맞춤법 오류 (현실적 케이스)
  // ============================================================
  {
    question: "오늘운동갈까",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "yes-no-why",
    category: "Yes/No - 띄어쓰기 오류",
    notes: "띄어쓰기 없어도 패턴 인식해야 함"
  },
  {
    question: "이옷살까",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "yes-no-why",
    category: "Yes/No - 띄어쓰기 오류",
  },
  {
    question: "개한테뽀뽀할까",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "yes-no-why",
    category: "Yes/No - 띄어쓰기 오류",
  },
  {
    question: "라면먹을까",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "yes-no-why",
    category: "Yes/No - 띄어쓰기 오류",
  },
  {
    question: "술마실까",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "yes-no-why",
    category: "Yes/No - 띄어쓰기 오류",
  },
  {
    question: "머리염색할까",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "yes-no-why",
    category: "Yes/No - 띄어쓰기 오류",
  },

  // ============================================================
  // Category 3: 혼동하기 쉬운 케이스 (Yes/No vs 다른 스프레드)
  // ============================================================
  {
    question: "언제 운동할까?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "timing-window",
    category: "혼동 케이스 - 타이밍 질문",
    notes: "'할까'가 있어도 '언제'가 있으면 timing-window"
  },
  {
    question: "언제 이직할까?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "timing-window",
    category: "혼동 케이스 - 타이밍 질문",
  },
  {
    question: "그 사람 나 좋아해?",
    expectedTheme: "love-relationships",
    expectedSpread: "crush-feelings",
    category: "혼동 케이스 - 상대 마음",
    notes: "'좋아해?'는 crush-feelings, '좋아할까?'는 yes-no-why"
  },
  {
    question: "그 사람 나 좋아할까?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "yes-no-why",
    category: "Yes/No - 상대 마음",
    notes: "'좋아할까?'는 yes-no-why"
  },
  {
    question: "오늘 운세 어때?",
    expectedTheme: "daily-reading",
    expectedSpread: "day-card",
    category: "혼동 케이스 - 오늘 운세",
    notes: "'오늘 ~할까?'와 구분해야 함"
  },
  {
    question: "오늘 하루 어떨까?",
    expectedTheme: "daily-reading",
    expectedSpread: "day-card",
    category: "혼동 케이스 - 오늘 운세",
    notes: "일반적인 운세 질문"
  },

  // ============================================================
  // Category 4: A vs B 비교 질문
  // ============================================================
  {
    question: "A회사 갈까 B회사 갈까",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "two-paths",
    category: "비교 질문",
    notes: "두 선택지가 명확하면 two-paths"
  },
  {
    question: "서울 vs 부산",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "two-paths",
    category: "비교 질문",
  },
  {
    question: "이직할까 남을까",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "two-paths",
    category: "비교 질문",
  },
  {
    question: "A랑 B 중에 어떤 게 나아?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "two-paths",
    category: "비교 질문",
  },

  // ============================================================
  // Category 5: 타이밍/시기 질문
  // ============================================================
  {
    question: "언제 이직해?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "timing-window",
    category: "타이밍 질문",
  },
  {
    question: "결혼 시기가 언제야?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "timing-window",
    category: "타이밍 질문",
  },
  {
    question: "몇 월에 사업 시작할까?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "timing-window",
    category: "타이밍 질문",
  },
  {
    question: "타이밍 언제가 좋아?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "timing-window",
    category: "타이밍 질문",
  },

  // ============================================================
  // Category 6: 연애 관련
  // ============================================================
  {
    question: "그 사람 마음이 어때?",
    expectedTheme: "love-relationships",
    expectedSpread: "crush-feelings",
    category: "연애 - 상대 마음",
  },
  {
    question: "헤어진 사람 다시 만날 수 있어?",
    expectedTheme: "love-relationships",
    expectedSpread: "reconciliation",
    category: "연애 - 재회",
  },
  {
    question: "언제쯤 좋은 사람 만날까?",
    expectedTheme: "love-relationships",
    expectedSpread: "finding-a-partner",
    category: "연애 - 인연 찾기",
  },
  {
    question: "우리 관계 괜찮아?",
    expectedTheme: "love-relationships",
    expectedSpread: "relationship-check-in",
    category: "연애 - 관계 점검",
  },

  // ============================================================
  // Category 7: 직장/시험
  // ============================================================
  {
    question: "면접 붙을까?",
    expectedTheme: "career-work",
    expectedSpread: "interview-result",
    category: "직장 - 면접",
    notes: "'붙을까?'는 결과 확인이므로 interview-result"
  },
  {
    question: "시험 합격할까?",
    expectedTheme: "career-work",
    expectedSpread: "exam-pass",
    category: "직장 - 시험",
    notes: "'합격할까?'는 결과 확인이므로 exam-pass"
  },
  {
    question: "이직해도 돼?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "yes-no-why",
    category: "직장 - 이직 yes/no",
    notes: "'해도 돼?'는 yes/no 질문"
  },
  {
    question: "이직하면 어떻게 될까?",
    expectedTheme: "career-work",
    expectedSpread: "job-change",
    category: "직장 - 이직 상황 분석",
    notes: "상황 분석은 job-change"
  },

  // ============================================================
  // Category 8: 장난/이상한 질문 (실제 사용자 패턴)
  // ============================================================
  {
    question: "개한테 키스할까?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "yes-no-why",
    category: "장난 질문",
    notes: "장난이지만 yes/no 패턴"
  },
  {
    question: "고양이한테 뽀뽀할까?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "yes-no-why",
    category: "장난 질문",
  },
  {
    question: "로또 살까?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "yes-no-why",
    category: "장난 질문",
  },
  {
    question: "머리 염색할까?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "yes-no-why",
    category: "일상 질문",
  },
  {
    question: "문신할까?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "yes-no-why",
    category: "일상 질문",
  },
  {
    question: "담배 피울까?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "yes-no-why",
    category: "일상 질문",
  },

  // ============================================================
  // Category 9: 복합 질문 (어려운 케이스)
  // ============================================================
  {
    question: "오늘 운동갈까 말까?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "yes-no-why",
    category: "복합 질문",
    notes: "'할까 말까' 패턴"
  },
  {
    question: "그 사람한테 고백할까 말까?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "yes-no-why",
    category: "복합 질문",
  },
  {
    question: "이직할까 말까 언제가 좋을까?",
    expectedTheme: "decisions-crossroads",
    expectedSpread: "timing-window",
    category: "복합 질문",
    notes: "'언제'가 있으면 timing-window 우선"
  },
];

// 테스트 실행 함수
async function runTest(testCase: TestCase): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:3000/api/tarot/analyze-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: testCase.question,
        language: 'ko'
      })
    });

    if (!response.ok) {
      console.error(`❌ API Error for "${testCase.question}": ${response.status}`);
      return false;
    }

    const result = await response.json();

    const passed =
      result.themeId === testCase.expectedTheme &&
      result.spreadId === testCase.expectedSpread;

    if (passed) {
      console.log(`✅ PASS: "${testCase.question}"`);
      console.log(`   → ${result.themeId}/${result.spreadId}`);
      if (testCase.notes) {
        console.log(`   📝 ${testCase.notes}`);
      }
    } else {
      console.log(`❌ FAIL: "${testCase.question}"`);
      console.log(`   Expected: ${testCase.expectedTheme}/${testCase.expectedSpread}`);
      console.log(`   Got:      ${result.themeId}/${result.spreadId}`);
      console.log(`   Reason:   ${result.reason}`);
      if (testCase.notes) {
        console.log(`   📝 ${testCase.notes}`);
      }
    }

    return passed;
  } catch (error) {
    console.error(`❌ ERROR for "${testCase.question}":`, error);
    return false;
  }
}

// 메인 테스트 러너
async function main() {
  console.log('🧪 타로 스프레드 선택 테스트 시작\n');
  console.log(`총 ${testCases.length}개 테스트 케이스\n`);

  let passCount = 0;
  let failCount = 0;

  // 카테고리별로 그룹화
  const categoryGroups = new Map<string, TestCase[]>();
  for (const testCase of testCases) {
    if (!categoryGroups.has(testCase.category)) {
      categoryGroups.set(testCase.category, []);
    }
    categoryGroups.get(testCase.category)!.push(testCase);
  }

  // 카테고리별로 테스트 실행
  for (const [category, cases] of categoryGroups) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📂 ${category} (${cases.length}개)`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    for (const testCase of cases) {
      const passed = await runTest(testCase);
      if (passed) {
        passCount++;
      } else {
        failCount++;
      }
      // API 부하 방지를 위해 잠깐 대기
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // 최종 결과
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 테스트 결과');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`총 테스트:   ${testCases.length}개`);
  console.log(`✅ 통과:     ${passCount}개`);
  console.log(`❌ 실패:     ${failCount}개`);
  console.log(`📈 성공률:   ${((passCount / testCases.length) * 100).toFixed(1)}%`);

  if (failCount === 0) {
    console.log('\n🎉 모든 테스트 통과!');
  } else {
    console.log(`\n⚠️  ${failCount}개 테스트 실패 - 로직 개선 필요`);
  }
}

// 실행
if (require.main === module) {
  main().catch(console.error);
}

export { testCases, runTest };
