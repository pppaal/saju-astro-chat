/**
 * 극단적 엣지 케이스 테스트
 * 실제 사용자가 입력할 수 있는 최악의 시나리오들
 */

const extremeCases = [
  // ============================================================
  // Category 1: 극단적 띄어쓰기 오류
  // ============================================================
  {
    question: '오늘운동갈까',
    expectedPattern: '할까',
    category: '띄어쓰기 없음',
    shouldMatch: true,
  },
  {
    question: '이옷살까',
    expectedPattern: '살까',
    category: '띄어쓰기 없음',
    shouldMatch: true,
  },
  {
    question: '개한테뽀뽀할까',
    expectedPattern: '할까',
    category: '띄어쓰기 없음 + 장난',
    shouldMatch: true,
  },

  // ============================================================
  // Category 2: 초성만
  // ============================================================
  {
    question: 'ㅇㄷㅇㄷㄱㄹㄲ',
    expectedPattern: '오늘운동갈까',
    category: '초성 - 오늘운동갈까',
    shouldMatch: true,
  },
  {
    question: 'ㄹㅁㄴㅁㅇㄹㄲ',
    expectedPattern: '라면먹을까',
    category: '초성 - 라면먹을까',
    shouldMatch: true,
  },
  {
    question: 'ㅅㅁㅅㄹㄲ',
    expectedPattern: '술마실까',
    category: '초성 - 술마실까',
    shouldMatch: true,
  },
  {
    question: 'ㅁㄹㅇㅅㅎㄹㄲ',
    expectedPattern: '머리염색할까',
    category: '초성 - 머리염색할까',
    shouldMatch: true,
  },
  {
    question: 'ㄱㅎㅌㅋㅅㅎㄹㄲ',
    expectedPattern: '개한테키스할까',
    category: '초성 - 개한테키스할까',
    shouldMatch: true,
  },

  // ============================================================
  // Category 3: 구두점 과다
  // ============================================================
  {
    question: '할까???',
    expectedPattern: '할까',
    category: '구두점 과다',
    shouldMatch: true,
  },
  {
    question: '갈까!!!!',
    expectedPattern: '갈까',
    category: '구두점 과다',
    shouldMatch: true,
  },
  {
    question: '먹을까...???',
    expectedPattern: '먹을까',
    category: '구두점 과다',
    shouldMatch: true,
  },

  // ============================================================
  // Category 4: 맞춤법 오류
  // ============================================================
  {
    question: '해도되요',
    expectedPattern: '해도돼요',
    category: '맞춤법 오류',
    shouldMatch: true,
  },
  {
    question: '안되요',
    expectedPattern: '안돼요',
    category: '맞춤법 오류',
    shouldMatch: true,
  },
  {
    question: '운동할려고',
    expectedPattern: '운동하려고',
    category: '맞춤법 오류',
    shouldMatch: true,
  },

  // ============================================================
  // Category 5: 복합 오류 (띄어쓰기 + 맞춤법)
  // ============================================================
  {
    question: '오늘운동해도되요',
    expectedPattern: '해도돼요',
    category: '띄어쓰기 + 맞춤법',
    shouldMatch: true,
  },
  {
    question: '이거할려고하는데',
    expectedPattern: '하려고',
    category: '띄어쓰기 + 맞춤법',
    shouldMatch: true,
  },

  // ============================================================
  // Category 6: 대소문자 혼용 (영어)
  // ============================================================
  {
    question: 'Should I GO?',
    expectedPattern: 'should i go',
    category: '영어 대소문자',
    shouldMatch: true,
  },
  {
    question: 'CaN I dO iT?',
    expectedPattern: 'can i do it',
    category: '영어 대소문자',
    shouldMatch: true,
  },

  // ============================================================
  // Category 7: 이모지/특수문자
  // ============================================================
  {
    question: '오늘 운동 갈까 🏋️',
    expectedPattern: '할까',
    category: '이모지 포함',
    shouldMatch: true,
  },
  {
    question: '🍜 라면 먹을까?',
    expectedPattern: '먹을까',
    category: '이모지 포함',
    shouldMatch: true,
  },
  {
    question: '술 마실까...? 😅',
    expectedPattern: '마실까',
    category: '이모지 포함',
    shouldMatch: true,
  },

  // ============================================================
  // Category 8: 극단적 오타
  // ============================================================
  {
    question: '오늘ㄹ운동갈까',
    expectedPattern: '갈까',
    category: '극단적 오타',
    shouldMatch: true,
  },
  {
    question: '라면ㅁ먹을까',
    expectedPattern: '먹을까',
    category: '극단적 오타',
    shouldMatch: true,
  },

  // ============================================================
  // Category 9: 중복 공백
  // ============================================================
  {
    question: '오늘     운동     갈까',
    expectedPattern: '할까',
    category: '중복 공백',
    shouldMatch: true,
  },
  {
    question: '   할까   ',
    expectedPattern: '할까',
    category: '양쪽 공백',
    shouldMatch: true,
  },

  // ============================================================
  // Category 10: 혼합 (최악의 케이스)
  // ============================================================
  {
    question: '오늘운동해도되요???  🏋️',
    expectedPattern: '해도돼요',
    category: '띄어쓰기+맞춤법+구두점+이모지',
    shouldMatch: true,
  },
  {
    question: 'ㅇㄷㅇㄷㄱㄹㄲ???',
    expectedPattern: 'ㅇㄷㅇㄷㄱㄹㄲ',
    category: '초성+구두점',
    shouldMatch: true,
  },
  {
    question: '개한테뽀뽀할까말까???',
    expectedPattern: '할까',
    category: '띄어쓰기없음+장난+구두점',
    shouldMatch: true,
  },
];

// ============================================================
// 정규화 함수 (간단 버전)
// ============================================================
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[?!.,;~🏋️🍜😅💪🎉]/g, '') // 이모지 제거
    .replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ]/g, '') // 특수문자 제거
    .trim();
}

function fixCommonTypos(text) {
  const typoMap = [
    [/되요/g, '돼요'],
    [/안되/g, '안돼'],
    [/할려고/g, '하려고'],
    [/갈려고/g, '가려고'],
  ];

  let fixed = text;
  for (const [pattern, replacement] of typoMap) {
    fixed = fixed.replace(pattern, replacement);
  }
  return fixed;
}

// ============================================================
// 테스트 실행
// ============================================================
let passCount = 0;
let failCount = 0;

console.log('🔥 극단적 엣지 케이스 테스트\n');
console.log(`총 ${extremeCases.length}개 테스트\n`);

// 카테고리별로 그룹화
const categoryGroups = new Map();
for (const testCase of extremeCases) {
  if (!categoryGroups.has(testCase.category)) {
    categoryGroups.set(testCase.category, []);
  }
  categoryGroups.get(testCase.category).push(testCase);
}

for (const [category, cases] of categoryGroups) {
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📂 ${category} (${cases.length}개)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  for (const testCase of cases) {
    // 정규화 + 맞춤법 보정
    let normalized = normalizeText(testCase.question);
    normalized = fixCommonTypos(normalized);

    // 예상 패턴도 정규화
    const expectedNormalized = normalizeText(testCase.expectedPattern);

    // 패턴이 포함되어 있는지 확인
    const passed = normalized.includes(expectedNormalized) ||
                   testCase.question.includes(testCase.expectedPattern);

    if (passed) {
      console.log(`✅ "${testCase.question}"`);
      console.log(`   → 정규화: "${normalized}"`);
      if (normalized !== testCase.question.replace(/\s+/g, '')) {
        console.log(`   💡 변환 성공!`);
      }
      passCount++;
    } else {
      console.log(`❌ "${testCase.question}"`);
      console.log(`   예상: "${expectedNormalized}" 포함`);
      console.log(`   실제: "${normalized}"`);
      failCount++;
    }
  }
  console.log('');
}

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 테스트 결과');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(`총 테스트:   ${extremeCases.length}개`);
console.log(`✅ 통과:     ${passCount}개`);
console.log(`❌ 실패:     ${failCount}개`);
console.log(`📈 성공률:   ${((passCount / extremeCases.length) * 100).toFixed(1)}%`);

if (failCount === 0) {
  console.log('\n🎉 모든 극단적 케이스 통과!');
  console.log('💪 어떤 엉망진창 질문도 처리 가능!');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failCount}개 케이스 실패`);
  process.exit(1);
}
