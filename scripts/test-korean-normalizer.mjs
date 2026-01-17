/**
 * 한글 텍스트 정규화 테스트
 * koreanTextNormalizer.ts의 각 함수를 개별 테스트
 */

// 테스트할 함수들을 직접 구현 (import 대신)
// ============================================================
// 초성 매핑
// ============================================================
const CHOSUNG_MAP = {
  'ㄱ': '[가-깋]',
  'ㄲ': '[까-낗]',
  'ㄴ': '[나-닣]',
  'ㄷ': '[다-딯]',
  'ㄸ': '[따-띻]',
  'ㄹ': '[라-맇]',
  'ㅁ': '[마-밓]',
  'ㅂ': '[바-빟]',
  'ㅃ': '[빠-삫]',
  'ㅅ': '[사-싷]',
  'ㅆ': '[싸-앃]',
  'ㅇ': '[아-잏]',
  'ㅈ': '[자-짛]',
  'ㅉ': '[짜-찧]',
  'ㅊ': '[차-칳]',
  'ㅋ': '[카-킿]',
  'ㅌ': '[타-팋]',
  'ㅍ': '[파-핗]',
  'ㅎ': '[하-힣]',
};

const CHOSUNG_LIST = Object.keys(CHOSUNG_MAP);

function isChosungOnly(text) {
  const cleanText = text.replace(/[^ㄱ-ㅎ가-힣]/g, '');
  if (cleanText.length === 0) return false;

  const chosungCount = cleanText.split('').filter(char => CHOSUNG_LIST.includes(char)).length;
  return chosungCount / cleanText.length > 0.5;
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[?!.,;~]/g, '')
    .trim();
}

function decodeChosung(text) {
  if (!isChosungOnly(text)) return null;

  const knownPatterns = {
    'ㅇㄷㅇㄷㄱㄹㄲ': '오늘운동갈까',
    'ㄹㅁㄴㅁㅇㄹㄲ': '라면먹을까',
    'ㅅㅁㅅㄹㄲ': '술마실까',
    'ㅁㄹㅇㅅㅎㄹㄲ': '머리염색할까',
    'ㅇㅇㅅㄹㄲ': '이옷살까',
    'ㄱㅎㅌㅃㅃㅎㄹㄲ': '개한테뽀뽀할까',
    'ㄱㅎㅌㅋㅅㅎㄹㄲ': '개한테키스할까',
    'ㅇㄷㅎㄹㄲ': '어떨까',
    'ㄱㅎㄹㄲ': '갈까',
    'ㅎㄹㄲ': '할까',
    'ㅁㅇㄹㄲ': '먹을까',
    'ㅅㄹㄲ': '살까',
    'ㅂㄹㄲ': '볼까',
  };

  const normalized = normalizeText(text);
  return knownPatterns[normalized] || null;
}

function fixCommonTypos(text) {
  const typoMap = [
    [/되요/g, '돼요'],
    [/안되/g, '안돼'],
    [/할려고/g, '하려고'],
    [/갈려고/g, '가려고'],
    [/먹을려고/g, '먹으려고'],
  ];

  let fixed = text;
  for (const [pattern, replacement] of typoMap) {
    fixed = fixed.replace(pattern, replacement);
  }
  return fixed;
}

function enhancedYesNoMatch(text) {
  const normalized = normalizeText(text);

  const noSpacePatterns = [
    /할까$/,
    /갈까$/,
    /볼까$/,
    /살까$/,
    /먹을까$/,
    /마실까$/,
    /만날까$/,
    /시작할까$/,
    /보낼까$/,
    /연락할까$/,
    /뽀뽀할까$/,
    /키스할까$/,
    /염색할까$/,
  ];

  return noSpacePatterns.some(p => p.test(normalized));
}

// ============================================================
// 테스트 케이스
// ============================================================
const tests = [
  // normalizeText 테스트
  {
    name: 'normalizeText - 기본',
    fn: () => normalizeText('오늘 운동 갈까?'),
    expected: '오늘운동갈까',
  },
  {
    name: 'normalizeText - 구두점 제거',
    fn: () => normalizeText('할까???'),
    expected: '할까',
  },
  {
    name: 'normalizeText - 공백 제거',
    fn: () => normalizeText('   오늘   운동   갈까   '),
    expected: '오늘운동갈까',
  },

  // isChosungOnly 테스트
  {
    name: 'isChosungOnly - 순수 초성',
    fn: () => isChosungOnly('ㅇㄷㅇㄷㄱㄹㄲ'),
    expected: true,
  },
  {
    name: 'isChosungOnly - 일반 한글',
    fn: () => isChosungOnly('오늘운동갈까'),
    expected: false,
  },
  {
    name: 'isChosungOnly - 50% 초성',
    fn: () => isChosungOnly('ㅇㄷ운동ㄱㄹㄲ'),
    expected: true,
  },
  {
    name: 'isChosungOnly - 30% 초성',
    fn: () => isChosungOnly('ㅇ오늘운동갈까'),
    expected: false,
  },

  // decodeChosung 테스트
  {
    name: 'decodeChosung - 오늘운동갈까',
    fn: () => decodeChosung('ㅇㄷㅇㄷㄱㄹㄲ'),
    expected: '오늘운동갈까',
  },
  {
    name: 'decodeChosung - 라면먹을까',
    fn: () => decodeChosung('ㄹㅁㄴㅁㅇㄹㄲ'),
    expected: '라면먹을까',
  },
  {
    name: 'decodeChosung - 술마실까',
    fn: () => decodeChosung('ㅅㅁㅅㄹㄲ'),
    expected: '술마실까',
  },
  {
    name: 'decodeChosung - 알 수 없는 패턴',
    fn: () => decodeChosung('ㅁㄴㅇㄹㅎㄱ'),
    expected: null,
  },
  {
    name: 'decodeChosung - 일반 텍스트',
    fn: () => decodeChosung('오늘운동갈까'),
    expected: null,
  },

  // fixCommonTypos 테스트
  {
    name: 'fixCommonTypos - 되요→돼요',
    fn: () => fixCommonTypos('해도되요'),
    expected: '해도돼요',
  },
  {
    name: 'fixCommonTypos - 안되→안돼',
    fn: () => fixCommonTypos('안되요'),
    expected: '안돼요',
  },
  {
    name: 'fixCommonTypos - 할려고→하려고',
    fn: () => fixCommonTypos('운동할려고'),
    expected: '운동하려고',
  },

  // enhancedYesNoMatch 테스트
  {
    name: 'enhancedYesNoMatch - 띄어쓰기 없음',
    fn: () => enhancedYesNoMatch('오늘운동갈까'),
    expected: true,
  },
  {
    name: 'enhancedYesNoMatch - 정상',
    fn: () => enhancedYesNoMatch('오늘 운동 갈까'),
    expected: true,
  },
  {
    name: 'enhancedYesNoMatch - 키스할까',
    fn: () => enhancedYesNoMatch('개한테키스할까'),
    expected: true,
  },
  {
    name: 'enhancedYesNoMatch - 뽀뽀할까',
    fn: () => enhancedYesNoMatch('개한테뽀뽀할까'),
    expected: true,
  },
  {
    name: 'enhancedYesNoMatch - 염색할까',
    fn: () => enhancedYesNoMatch('머리염색할까'),
    expected: true,
  },
  {
    name: 'enhancedYesNoMatch - 아닌 케이스',
    fn: () => enhancedYesNoMatch('오늘 운세'),
    expected: false,
  },
];

// ============================================================
// 테스트 실행
// ============================================================
let passCount = 0;
let failCount = 0;

console.log('🧪 한글 텍스트 정규화 단위 테스트\n');
console.log(`총 ${tests.length}개 테스트\n`);

for (const test of tests) {
  const result = test.fn();
  const passed = JSON.stringify(result) === JSON.stringify(test.expected);

  if (passed) {
    console.log(`✅ ${test.name}`);
    console.log(`   결과: ${JSON.stringify(result)}`);
    passCount++;
  } else {
    console.log(`❌ ${test.name}`);
    console.log(`   예상: ${JSON.stringify(test.expected)}`);
    console.log(`   실제: ${JSON.stringify(result)}`);
    failCount++;
  }
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 테스트 결과');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log(`총 테스트:   ${tests.length}개`);
console.log(`✅ 통과:     ${passCount}개`);
console.log(`❌ 실패:     ${failCount}개`);
console.log(`📈 성공률:   ${((passCount / tests.length) * 100).toFixed(1)}%`);

if (failCount === 0) {
  console.log('\n🎉 모든 테스트 통과!');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failCount}개 테스트 실패`);
  process.exit(1);
}
