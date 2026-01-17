/**
 * Quick Tarot Spread Selection Test
 * Tests the most important cases to verify the Korean text normalization works
 */

const testCases = [
  // Yes/No 질문 - 띄어쓰기 정상
  {
    question: "오늘 운동갈까?",
    expected: "yes-no-why",
    category: "Yes/No - 정상"
  },
  // Yes/No 질문 - 띄어쓰기 없음
  {
    question: "오늘운동갈까",
    expected: "yes-no-why",
    category: "Yes/No - 띄어쓰기 오류"
  },
  // Yes/No 질문 - 장난스러운 질문
  {
    question: "개한테뽀뽀할까",
    expected: "yes-no-why",
    category: "Yes/No - 장난 질문"
  },
  // 비교 질문
  {
    question: "A회사 갈까 B회사 갈까",
    expected: "two-paths",
    category: "비교 질문"
  },
  // 타이밍 질문
  {
    question: "언제 이직할까?",
    expected: "timing-window",
    category: "타이밍 질문"
  },
];

async function runQuickTest() {
  console.log('🧪 빠른 타로 스프레드 테스트\n');
  console.log(`총 ${testCases.length}개 핵심 테스트\n`);

  let passCount = 0;
  let failCount = 0;

  for (const testCase of testCases) {
    console.log(`\n📝 테스트: "${testCase.question}" (${testCase.category})`);

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
        console.log(`❌ API Error: ${response.status}`);
        failCount++;
        continue;
      }

      const result = await response.json();

      if (result.spreadId === testCase.expected) {
        console.log(`✅ PASS: ${result.spreadId}`);
        passCount++;
      } else {
        console.log(`❌ FAIL: Expected ${testCase.expected}, got ${result.spreadId}`);
        console.log(`   Reason: ${result.reason}`);
        failCount++;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      failCount++;
    }

    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 테스트 결과');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`총 테스트:   ${testCases.length}개`);
  console.log(`✅ 통과:     ${passCount}개`);
  console.log(`❌ 실패:     ${failCount}개`);
  console.log(`📈 성공률:   ${((passCount / testCases.length) * 100).toFixed(1)}%`);

  if (failCount === 0) {
    console.log('\n🎉 모든 핵심 테스트 통과!');
  } else {
    console.log(`\n⚠️  ${failCount}개 테스트 실패`);
  }
}

runQuickTest().catch(console.error);
