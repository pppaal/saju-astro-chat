/**
 * ichingNumerology.ts - 주역 수리/시간 기반 괘 분석 (1000% 레벨)
 *
 * 매화역수(梅花易數), 생년월일 기반 괘, 시간점, 수비점
 */

// ============================================================================
// 타입 정의
// ============================================================================

export interface MeihuaReading {
  상괘Number: number;
  하괘Number: number;
  변효: number;
  본괘Binary: string;
  지괘Binary: string;
  호괘Binary: string;
  체괘: string;
  용괘: string;
  interpretation: string;
  timing: string;
}

export interface BirthHexagram {
  선천괘: { number: number; binary: string; name: string };
  후천괘: { number: number; binary: string; name: string };
  본명괘: { number: number; binary: string; name: string };
  lifeTheme: string;
  coreChallenge: string;
  hiddenTalent: string;
}

export interface TimeHexagram {
  연괘: { number: number; name: string };
  월괘: { number: number; name: string };
  일괘: { number: number; name: string };
  시괘: { number: number; name: string };
  종합괘: { number: number; binary: string; name: string };
  변효: number;
  currentEnergy: string;
  advice: string;
}

export interface NumberHexagram {
  입력수: number[];
  상괘: number;
  하괘: number;
  변효: number;
  hexagramBinary: string;
  hexagramNumber: number;
  meaning: string;
}

export interface YearlyFortune {
  year: number;
  hexagram: { number: number; binary: string; name: string };
  theme: string;
  opportunities: string[];
  challenges: string[];
  advice: string;
}

export interface DirectionalHexagram {
  direction: string;
  trigram: string;
  element: string;
  favorability: 'excellent' | 'good' | 'neutral' | 'caution' | 'avoid';
  explanation: string;
}

// ============================================================================
// 상수
// ============================================================================

// 선천팔괘 순서 (복희팔괘)
const XIANTIAN_ORDER = ['건', '태', '리', '진', '손', '감', '간', '곤'];
const XIANTIAN_NUMBER: Record<string, number> = {
  '건': 1, '태': 2, '리': 3, '진': 4, '손': 5, '감': 6, '간': 7, '곤': 8
};

// 후천팔괘 순서 (문왕팔괘)
const HOUTIAN_ORDER = ['감', '곤', '진', '손', '건', '태', '간', '리'];
const HOUTIAN_NUMBER: Record<string, number> = {
  '감': 1, '곤': 2, '진': 3, '손': 4, '건': 6, '태': 7, '간': 8, '리': 9
};

// 괘 binary 매핑
const TRIGRAM_BINARY: Record<string, string> = {
  '건': '111', '태': '110', '리': '101', '진': '001',
  '손': '100', '감': '010', '간': '011', '곤': '000'
};

const BINARY_TO_TRIGRAM: Record<string, string> = {
  '111': '건', '110': '태', '101': '리', '001': '진',
  '100': '손', '010': '감', '011': '간', '000': '곤'
};

// 오행
const TRIGRAM_ELEMENT: Record<string, string> = {
  '건': '금', '태': '금', '리': '화', '진': '목',
  '손': '목', '감': '수', '간': '토', '곤': '토'
};

// 방위
const TRIGRAM_DIRECTION: Record<string, string> = {
  '건': '서북', '태': '서', '리': '남', '진': '동',
  '손': '동남', '감': '북', '간': '동북', '곤': '서남'
};

// 64괘 매핑
const HEXAGRAM_MAP: Record<string, { number: number; name: string; korean: string }> = {
  '111111': { number: 1, name: 'Qian', korean: '건괘' },
  '000000': { number: 2, name: 'Kun', korean: '곤괘' },
  '010001': { number: 3, name: 'Zhun', korean: '둔괘' },
  '100010': { number: 4, name: 'Meng', korean: '몽괘' },
  '010111': { number: 5, name: 'Xu', korean: '수괘' },
  '111010': { number: 6, name: 'Song', korean: '송괘' },
  '000010': { number: 7, name: 'Shi', korean: '사괘' },
  '010000': { number: 8, name: 'Bi', korean: '비괘' },
  '110111': { number: 9, name: 'Xiao Xu', korean: '소축괘' },
  '111011': { number: 10, name: 'Lu', korean: '리괘' },
  '000111': { number: 11, name: 'Tai', korean: '태괘' },
  '111000': { number: 12, name: 'Pi', korean: '비괘' },
  '111101': { number: 13, name: 'Tong Ren', korean: '동인괘' },
  '101111': { number: 14, name: 'Da You', korean: '대유괘' },
  '000100': { number: 15, name: 'Qian', korean: '겸괘' },
  '001000': { number: 16, name: 'Yu', korean: '예괘' },
  '011001': { number: 17, name: 'Sui', korean: '수괘' },
  '100110': { number: 18, name: 'Gu', korean: '고괘' },
  '000011': { number: 19, name: 'Lin', korean: '임괘' },
  '110000': { number: 20, name: 'Guan', korean: '관괘' },
  '101001': { number: 21, name: 'Shi He', korean: '서합괘' },
  '100101': { number: 22, name: 'Bi', korean: '비괘' },
  '100000': { number: 23, name: 'Bo', korean: '박괘' },
  '000001': { number: 24, name: 'Fu', korean: '복괘' },
  '111001': { number: 25, name: 'Wu Wang', korean: '무망괘' },
  '100111': { number: 26, name: 'Da Xu', korean: '대축괘' },
  '100001': { number: 27, name: 'Yi', korean: '이괘' },
  '011110': { number: 28, name: 'Da Guo', korean: '대과괘' },
  '010010': { number: 29, name: 'Kan', korean: '감괘' },
  '101101': { number: 30, name: 'Li', korean: '리괘' },
  '011100': { number: 31, name: 'Xian', korean: '함괘' },
  '001110': { number: 32, name: 'Heng', korean: '항괘' },
  '111100': { number: 33, name: 'Dun', korean: '둔괘' },
  '001111': { number: 34, name: 'Da Zhuang', korean: '대장괘' },
  '101000': { number: 35, name: 'Jin', korean: '진괘' },
  '000101': { number: 36, name: 'Ming Yi', korean: '명이괘' },
  '110101': { number: 37, name: 'Jia Ren', korean: '가인괘' },
  '101011': { number: 38, name: 'Kui', korean: '규괘' },
  '010100': { number: 39, name: 'Jian', korean: '건괘' },
  '001010': { number: 40, name: 'Jie', korean: '해괘' },
  '100011': { number: 41, name: 'Sun', korean: '손괘' },
  '110001': { number: 42, name: 'Yi', korean: '익괘' },
  '011111': { number: 43, name: 'Guai', korean: '쾌괘' },
  '111110': { number: 44, name: 'Gou', korean: '구괘' },
  '011000': { number: 45, name: 'Cui', korean: '췌괘' },
  '000110': { number: 46, name: 'Sheng', korean: '승괘' },
  '011010': { number: 47, name: 'Kun', korean: '곤괘' },
  '010110': { number: 48, name: 'Jing', korean: '정괘' },
  '011101': { number: 49, name: 'Ge', korean: '혁괘' },
  '101110': { number: 50, name: 'Ding', korean: '정괘' },
  '001001': { number: 51, name: 'Zhen', korean: '진괘' },
  '100100': { number: 52, name: 'Gen', korean: '간괘' },
  '110100': { number: 53, name: 'Jian', korean: '점괘' },
  '001011': { number: 54, name: 'Gui Mei', korean: '귀매괘' },
  '001101': { number: 55, name: 'Feng', korean: '풍괘' },
  '101100': { number: 56, name: 'Lu', korean: '려괘' },
  '110110': { number: 57, name: 'Xun', korean: '손괘' },
  '011011': { number: 58, name: 'Dui', korean: '태괘' },
  '110010': { number: 59, name: 'Huan', korean: '환괘' },
  '010011': { number: 60, name: 'Jie', korean: '절괘' },
  '110011': { number: 61, name: 'Zhong Fu', korean: '중부괘' },
  '001100': { number: 62, name: 'Xiao Guo', korean: '소과괘' },
  '010101': { number: 63, name: 'Ji Ji', korean: '기제괘' },
  '101010': { number: 64, name: 'Wei Ji', korean: '미제괘' }
};

// ============================================================================
// 헬퍼 함수
// ============================================================================

function mod8(n: number): number {
  const m = n % 8;
  return m === 0 ? 8 : m;
}

function mod6(n: number): number {
  const m = n % 6;
  return m === 0 ? 6 : m;
}

function numberToTrigram(n: number): string {
  const normalized = mod8(n);
  return XIANTIAN_ORDER[normalized - 1];
}

function trigramToBinary(trigram: string): string {
  return TRIGRAM_BINARY[trigram] || '000';
}

function binaryToHexagram(binary: string): { number: number; name: string; korean: string } {
  return HEXAGRAM_MAP[binary] || { number: 0, name: 'Unknown', korean: '미상' };
}

function flipBit(bit: string): string {
  return bit === '1' ? '0' : '1';
}

function applyChangingLine(binary: string, line: number): string {
  const arr = binary.split('');
  arr[line - 1] = flipBit(arr[line - 1]);
  return arr.join('');
}

// ============================================================================
// 매화역수 (梅花易數)
// ============================================================================

/**
 * 매화역수 - 시간 기반 점
 */
export function castMeihuaByTime(date: Date = new Date()): MeihuaReading {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();

  // 상괘: (년 + 월 + 일) / 8
  const upperNum = mod8(year + month + day);
  // 하괘: (년 + 월 + 일 + 시) / 8
  const lowerNum = mod8(year + month + day + hour);
  // 변효: (년 + 월 + 일 + 시) / 6
  const changingLine = mod6(year + month + day + hour);

  const upperTrigram = numberToTrigram(upperNum);
  const lowerTrigram = numberToTrigram(lowerNum);

  const upperBinary = trigramToBinary(upperTrigram);
  const lowerBinary = trigramToBinary(lowerTrigram);
  const 본괘Binary = lowerBinary + upperBinary;

  const 지괘Binary = applyChangingLine(본괘Binary, changingLine);

  // 호괘: 2,3,4효 → 하괘, 3,4,5효 → 상괘
  const 호괘Lower = 본괘Binary.slice(1, 4);
  const 호괘Upper = 본괘Binary.slice(2, 5);
  const 호괘Binary = 호괘Lower + 호괘Upper;

  // 체용 판단: 변효가 있는 괘가 용괘, 없는 괘가 체괘
  const 체괘 = changingLine <= 3 ? upperTrigram : lowerTrigram;
  const 용괘 = changingLine <= 3 ? lowerTrigram : upperTrigram;

  return {
    상괘Number: upperNum,
    하괘Number: lowerNum,
    변효: changingLine,
    본괘Binary,
    지괘Binary,
    호괘Binary,
    체괘,
    용괘,
    interpretation: generateMeihuaInterpretation(체괘, 용괘, changingLine),
    timing: calculateTiming(체괘, 용괘)
  };
}

/**
 * 매화역수 - 숫자 기반 점
 */
export function castMeihuaByNumbers(num1: number, num2: number): MeihuaReading {
  const upperNum = mod8(num1);
  const lowerNum = mod8(num2);
  const changingLine = mod6(num1 + num2);

  const upperTrigram = numberToTrigram(upperNum);
  const lowerTrigram = numberToTrigram(lowerNum);

  const upperBinary = trigramToBinary(upperTrigram);
  const lowerBinary = trigramToBinary(lowerTrigram);
  const 본괘Binary = lowerBinary + upperBinary;

  const 지괘Binary = applyChangingLine(본괘Binary, changingLine);

  const 호괘Lower = 본괘Binary.slice(1, 4);
  const 호괘Upper = 본괘Binary.slice(2, 5);
  const 호괘Binary = 호괘Lower + 호괘Upper;

  const 체괘 = changingLine <= 3 ? upperTrigram : lowerTrigram;
  const 용괘 = changingLine <= 3 ? lowerTrigram : upperTrigram;

  return {
    상괘Number: upperNum,
    하괘Number: lowerNum,
    변효: changingLine,
    본괘Binary,
    지괘Binary,
    호괘Binary,
    체괘,
    용괘,
    interpretation: generateMeihuaInterpretation(체괘, 용괘, changingLine),
    timing: calculateTiming(체괘, 용괘)
  };
}

function generateMeihuaInterpretation(체: string, 용: string, 변효: number): string {
  const 체Element = TRIGRAM_ELEMENT[체];
  const 용Element = TRIGRAM_ELEMENT[용];

  const relation = getElementRelation(체Element, 용Element);

  let interpretation = `체괘(${체})는 ${체Element}, 용괘(${용})는 ${용Element}입니다. `;

  switch (relation) {
    case '생':
      interpretation += '용괘가 체괘를 생하니 일이 순조롭게 이루어집니다.';
      break;
    case '극':
      interpretation += '용괘가 체괘를 극하니 어려움이 있으나 극복이 가능합니다.';
      break;
    case '비화':
      interpretation += '체용이 같은 기운이니 평탄하나 변화가 적습니다.';
      break;
    case '설':
      interpretation += '체괘가 용괘를 생하니 소모가 있으나 결실이 있습니다.';
      break;
    case '재':
      interpretation += '체괘가 용괘를 극하니 노력으로 얻는 바가 있습니다.';
      break;
    default:
      interpretation += '복합적인 기운이 작용합니다.';
  }

  return interpretation;
}

function getElementRelation(체: string, 용: string): string {
  const cycle = { '목': '화', '화': '토', '토': '금', '금': '수', '수': '목' };
  const control = { '목': '토', '토': '수', '수': '화', '화': '금', '금': '목' };

  if (체 === 용) return '비화';
  if (cycle[용 as keyof typeof cycle] === 체) return '생';
  if (cycle[체 as keyof typeof cycle] === 용) return '설';
  if (control[용 as keyof typeof control] === 체) return '극';
  if (control[체 as keyof typeof control] === 용) return '재';
  return '복합';
}

function calculateTiming(체: string, 용: string): string {
  const 체Num = XIANTIAN_NUMBER[체];
  const 용Num = XIANTIAN_NUMBER[용];

  const relation = getElementRelation(TRIGRAM_ELEMENT[체], TRIGRAM_ELEMENT[용]);

  if (relation === '생' || relation === '비화') {
    return `${체Num}일 또는 ${체Num}개월 내 성사`;
  } else if (relation === '극') {
    return `${용Num}일 또는 ${용Num}개월 후 변화`;
  } else {
    return `${체Num + 용Num}일 내외로 결과 확인`;
  }
}

// ============================================================================
// 생년월일 기반 괘
// ============================================================================

/**
 * 생년월일로 본명괘 계산
 */
export function calculateBirthHexagram(
  year: number,
  month: number,
  day: number,
  hour?: number
): BirthHexagram {
  // 선천괘 (복희팔괘 기반)
  const 선천상 = mod8(year);
  const 선천하 = mod8(year + month);
  const 선천Upper = trigramToBinary(numberToTrigram(선천상));
  const 선천Lower = trigramToBinary(numberToTrigram(선천하));
  const 선천Binary = 선천Lower + 선천Upper;
  const 선천 = binaryToHexagram(선천Binary);

  // 후천괘 (문왕팔괘 기반)
  const 후천상 = mod8(month + day);
  const 후천하 = mod8(year + month + day);
  const 후천Upper = trigramToBinary(numberToTrigram(후천상));
  const 후천Lower = trigramToBinary(numberToTrigram(후천하));
  const 후천Binary = 후천Lower + 후천Upper;
  const 후천 = binaryToHexagram(후천Binary);

  // 본명괘 (종합)
  const total = year + month + day + (hour || 0);
  const 본명상 = mod8(total);
  const 본명하 = mod8(total + year);
  const 본명Upper = trigramToBinary(numberToTrigram(본명상));
  const 본명Lower = trigramToBinary(numberToTrigram(본명하));
  const 본명Binary = 본명Lower + 본명Upper;
  const 본명 = binaryToHexagram(본명Binary);

  return {
    선천괘: { number: 선천.number, binary: 선천Binary, name: 선천.korean },
    후천괘: { number: 후천.number, binary: 후천Binary, name: 후천.korean },
    본명괘: { number: 본명.number, binary: 본명Binary, name: 본명.korean },
    lifeTheme: getLifeTheme(본명.number),
    coreChallenge: getCoreChallenge(선천.number, 후천.number),
    hiddenTalent: getHiddenTalent(본명Binary)
  };
}

function getLifeTheme(hexNum: number): string {
  const themes: Record<number, string> = {
    1: '창조와 리더십의 삶',
    2: '수용과 조화의 삶',
    11: '평화와 번영의 삶',
    12: '인내와 극복의 삶',
    29: '지혜와 유연함의 삶',
    30: '밝음과 문화의 삶',
    63: '완성을 향한 삶',
    64: '끊임없는 도전의 삶'
  };
  return themes[hexNum] || '변화와 성장의 삶';
}

function getCoreChallenge(xiantian: number, houtian: number): string {
  const diff = Math.abs(xiantian - houtian);
  if (diff <= 2) return '내면과 외면의 조화가 주요 과제입니다.';
  if (diff <= 4) return '환경 적응과 자기 발전의 균형이 과제입니다.';
  return '근본적 변화와 성장이 요구됩니다.';
}

function getHiddenTalent(binary: string): string {
  const yangCount = (binary.match(/1/g) || []).length;
  if (yangCount >= 5) return '강한 추진력과 리더십';
  if (yangCount <= 1) return '깊은 통찰력과 수용력';
  if (yangCount === 3) return '균형 잡힌 판단력';
  return '유연한 적응력';
}

// ============================================================================
// 현재 시간 괘
// ============================================================================

/**
 * 현재 시간의 운세 괘 계산
 */
export function calculateTimeHexagram(date: Date = new Date()): TimeHexagram {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();

  // 각 시간 단위별 괘
  const 연괘Num = mod8(year);
  const 월괘Num = mod8(month);
  const 일괘Num = mod8(day);
  const 시괘Num = mod8(hour + 1);  // 자시(23-01)부터

  const 연괘 = numberToTrigram(연괘Num);
  const 월괘 = numberToTrigram(월괘Num);
  const 일괘 = numberToTrigram(일괘Num);
  const 시괘 = numberToTrigram(시괘Num);

  // 종합괘
  const 상괘Num = mod8(year + month);
  const 하괘Num = mod8(day + hour);
  const 변효 = mod6(year + month + day + hour);

  const 상괘Binary = trigramToBinary(numberToTrigram(상괘Num));
  const 하괘Binary = trigramToBinary(numberToTrigram(하괘Num));
  const 종합Binary = 하괘Binary + 상괘Binary;
  const 종합 = binaryToHexagram(종합Binary);

  return {
    연괘: { number: 연괘Num, name: 연괘 },
    월괘: { number: 월괘Num, name: 월괘 },
    일괘: { number: 일괘Num, name: 일괘 },
    시괘: { number: 시괘Num, name: 시괘 },
    종합괘: { number: 종합.number, binary: 종합Binary, name: 종합.korean },
    변효,
    currentEnergy: getCurrentEnergy(시괘),
    advice: getTimeAdvice(종합.number, 변효)
  };
}

function getCurrentEnergy(시괘: string): string {
  const energies: Record<string, string> = {
    '건': '활발하고 역동적인 에너지',
    '곤': '안정적이고 수용적인 에너지',
    '진': '새로운 시작의 에너지',
    '손': '유연하고 침투적인 에너지',
    '감': '깊고 지혜로운 에너지',
    '리': '밝고 명확한 에너지',
    '간': '고요하고 집중된 에너지',
    '태': '기쁘고 소통하는 에너지'
  };
  return energies[시괘] || '복합적인 에너지';
}

function getTimeAdvice(hexNum: number, 변효: number): string {
  if (변효 === 5) return '지금이 가장 좋은 타이밍입니다.';
  if (변효 === 6) return '정점을 지났으니 마무리에 집중하세요.';
  if (변효 === 1) return '시작 단계이니 신중하게 준비하세요.';
  return '현재 상황에 집중하며 기회를 살피세요.';
}

// ============================================================================
// 연간 운세 괘
// ============================================================================

/**
 * 특정 연도의 운세 괘 계산
 */
export function calculateYearlyFortune(
  birthYear: number,
  birthMonth: number,
  birthDay: number,
  targetYear: number
): YearlyFortune {
  const age = targetYear - birthYear;
  const cyclePosition = age % 12;

  const 상괘Num = mod8(targetYear + birthMonth);
  const 하괘Num = mod8(targetYear + birthDay);
  const 변효 = mod6(targetYear + age);

  const 상괘Binary = trigramToBinary(numberToTrigram(상괘Num));
  const 하괘Binary = trigramToBinary(numberToTrigram(하괘Num));
  const binary = 하괘Binary + 상괘Binary;
  const hexagram = binaryToHexagram(binary);

  return {
    year: targetYear,
    hexagram: { number: hexagram.number, binary, name: hexagram.korean },
    theme: getYearTheme(hexagram.number, cyclePosition),
    opportunities: getYearOpportunities(hexagram.number),
    challenges: getYearChallenges(hexagram.number),
    advice: getYearAdvice(hexagram.number, 변효)
  };
}

function getYearTheme(hexNum: number, cycle: number): string {
  const baseThemes: Record<number, string> = {
    1: '창조와 도전', 2: '수용과 안정', 11: '조화와 발전',
    12: '인내와 준비', 29: '지혜와 학습', 30: '밝음과 성취'
  };
  return baseThemes[hexNum] || '변화와 성장';
}

function getYearOpportunities(hexNum: number): string[] {
  if (hexNum <= 10) return ['새로운 시작', '리더십 발휘'];
  if (hexNum <= 30) return ['관계 개선', '내면 성장'];
  if (hexNum <= 50) return ['실질적 성과', '안정 구축'];
  return ['마무리와 정리', '지혜 축적'];
}

function getYearChallenges(hexNum: number): string[] {
  if (hexNum === 29 || hexNum === 47) return ['어려움 극복', '인내 필요'];
  if (hexNum === 12 || hexNum === 23) return ['막힘 해소', '방향 전환'];
  return ['균형 유지', '과욕 경계'];
}

function getYearAdvice(hexNum: number, 변효: number): string {
  if (변효 <= 2) return '기초를 다지고 준비하는 시기입니다.';
  if (변효 <= 4) return '적극적으로 행동하되 신중함을 잃지 마세요.';
  return '성과를 거두고 다음을 준비하세요.';
}

// ============================================================================
// 방위 길흉 분석
// ============================================================================

/**
 * 방위별 길흉 분석
 */
export function analyzeDirectionalFortune(
  birthYear: number,
  currentYear: number = new Date().getFullYear()
): DirectionalHexagram[] {
  const yearDiff = currentYear - birthYear;
  const baseNum = mod8(yearDiff);

  const directions: DirectionalHexagram[] = [];

  for (const [trigram, direction] of Object.entries(TRIGRAM_DIRECTION)) {
    const trigramNum = XIANTIAN_NUMBER[trigram];
    const relation = getElementRelation(
      TRIGRAM_ELEMENT[numberToTrigram(baseNum)],
      TRIGRAM_ELEMENT[trigram]
    );

    let favorability: DirectionalHexagram['favorability'];
    switch (relation) {
      case '생': favorability = 'excellent'; break;
      case '비화': favorability = 'good'; break;
      case '설': favorability = 'neutral'; break;
      case '재': favorability = 'caution'; break;
      case '극': favorability = 'avoid'; break;
      default: favorability = 'neutral';
    }

    directions.push({
      direction,
      trigram,
      element: TRIGRAM_ELEMENT[trigram],
      favorability,
      explanation: getDirectionExplanation(direction, favorability)
    });
  }

  return directions;
}

function getDirectionExplanation(direction: string, favorability: DirectionalHexagram['favorability']): string {
  const explanations: Record<DirectionalHexagram['favorability'], string> = {
    excellent: `${direction} 방향은 매우 길하여 중요한 일에 활용하세요.`,
    good: `${direction} 방향은 좋은 기운이 있어 일상에 유리합니다.`,
    neutral: `${direction} 방향은 평범하니 특별한 주의는 불필요합니다.`,
    caution: `${direction} 방향은 주의가 필요하니 중요한 결정은 피하세요.`,
    avoid: `${direction} 방향은 피하는 것이 좋습니다.`
  };
  return explanations[favorability];
}

// ============================================================================
// 숫자로 괘 뽑기
// ============================================================================

/**
 * 임의의 숫자들로 괘 생성
 */
export function castHexagramByNumbers(numbers: number[]): NumberHexagram {
  const sum = numbers.reduce((a, b) => a + b, 0);

  const 상괘 = mod8(sum);
  const 하괘 = mod8(numbers.length > 1 ? numbers[0] + numbers[1] : sum);
  const 변효 = mod6(sum + numbers.length);

  const 상괘Binary = trigramToBinary(numberToTrigram(상괘));
  const 하괘Binary = trigramToBinary(numberToTrigram(하괘));
  const hexagramBinary = 하괘Binary + 상괘Binary;
  const hexagram = binaryToHexagram(hexagramBinary);

  return {
    입력수: numbers,
    상괘,
    하괘,
    변효,
    hexagramBinary,
    hexagramNumber: hexagram.number,
    meaning: `입력된 수의 합(${sum})에서 ${hexagram.korean}(${hexagram.number}번)가 도출되었습니다.`
  };
}
