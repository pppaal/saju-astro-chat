/**
 * ichingPatterns.ts - 주역 64괘 관계 패턴 분석 (1000% 레벨)
 *
 * 괘 그룹, 서괘전 순서, 착종/호체 관계, 대소성괘 분석
 */

// ============================================================================
// 타입 정의
// ============================================================================

export interface HexagramPair {
  hex1: { number: number; name: string; binary: string };
  hex2: { number: number; name: string; binary: string };
  relationship: PairRelationship;
  meaning: string;
}

export type PairRelationship =
  | '착종' | '호체' | '상반' | '상응'
  | '선후' | '시종' | '대대' | '보완';

export interface HexagramGroup {
  groupName: string;
  theme: string;
  hexagrams: { number: number; name: string; role: string }[];
  groupMeaning: string;
  lifecycle: string;
}

export interface SequenceAnalysis {
  position: number;
  hexagram: { number: number; name: string };
  前괘?: { number: number; name: string; transition: string };
  後괘?: { number: number; name: string; transition: string };
  sequenceMeaning: string;
  lifecycleStage: string;
}

export interface OppositePairs {
  complementary: HexagramPair[];  // 상호 보완
  conflicting: HexagramPair[];    // 상호 대립
  transforming: HexagramPair[];   // 상호 전환
}

export interface SeasonalHexagram {
  season: '춘' | '하' | '추' | '동';
  month: number;
  hexagram: { number: number; name: string; binary: string };
  energy: string;
  advice: string;
}

export interface ElementalGroup {
  element: '목' | '화' | '토' | '금' | '수';
  hexagrams: { number: number; name: string; role: string }[];
  groupCharacteristic: string;
}

export interface PatternMatch {
  pattern: string;
  matchedHexagrams: number[];
  significance: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare';
}

// ============================================================================
// 64괘 기본 데이터
// ============================================================================

const HEXAGRAM_DATA: Record<number, { name: string; korean: string; binary: string }> = {
  1: { name: 'Qian', korean: '건', binary: '111111' },
  2: { name: 'Kun', korean: '곤', binary: '000000' },
  3: { name: 'Zhun', korean: '둔', binary: '010001' },
  4: { name: 'Meng', korean: '몽', binary: '100010' },
  5: { name: 'Xu', korean: '수', binary: '010111' },
  6: { name: 'Song', korean: '송', binary: '111010' },
  7: { name: 'Shi', korean: '사', binary: '000010' },
  8: { name: 'Bi', korean: '비', binary: '010000' },
  9: { name: 'Xiao Xu', korean: '소축', binary: '110111' },
  10: { name: 'Lu', korean: '리', binary: '111011' },
  11: { name: 'Tai', korean: '태', binary: '000111' },
  12: { name: 'Pi', korean: '비', binary: '111000' },
  13: { name: 'Tong Ren', korean: '동인', binary: '111101' },
  14: { name: 'Da You', korean: '대유', binary: '101111' },
  15: { name: 'Qian', korean: '겸', binary: '000100' },
  16: { name: 'Yu', korean: '예', binary: '001000' },
  17: { name: 'Sui', korean: '수', binary: '011001' },
  18: { name: 'Gu', korean: '고', binary: '100110' },
  19: { name: 'Lin', korean: '임', binary: '000011' },
  20: { name: 'Guan', korean: '관', binary: '110000' },
  21: { name: 'Shi He', korean: '서합', binary: '101001' },
  22: { name: 'Bi', korean: '비', binary: '100101' },
  23: { name: 'Bo', korean: '박', binary: '100000' },
  24: { name: 'Fu', korean: '복', binary: '000001' },
  25: { name: 'Wu Wang', korean: '무망', binary: '111001' },
  26: { name: 'Da Xu', korean: '대축', binary: '100111' },
  27: { name: 'Yi', korean: '이', binary: '100001' },
  28: { name: 'Da Guo', korean: '대과', binary: '011110' },
  29: { name: 'Kan', korean: '감', binary: '010010' },
  30: { name: 'Li', korean: '리', binary: '101101' },
  31: { name: 'Xian', korean: '함', binary: '011100' },
  32: { name: 'Heng', korean: '항', binary: '001110' },
  33: { name: 'Dun', korean: '둔', binary: '111100' },
  34: { name: 'Da Zhuang', korean: '대장', binary: '001111' },
  35: { name: 'Jin', korean: '진', binary: '101000' },
  36: { name: 'Ming Yi', korean: '명이', binary: '000101' },
  37: { name: 'Jia Ren', korean: '가인', binary: '110101' },
  38: { name: 'Kui', korean: '규', binary: '101011' },
  39: { name: 'Jian', korean: '건', binary: '010100' },
  40: { name: 'Jie', korean: '해', binary: '001010' },
  41: { name: 'Sun', korean: '손', binary: '100011' },
  42: { name: 'Yi', korean: '익', binary: '110001' },
  43: { name: 'Guai', korean: '쾌', binary: '011111' },
  44: { name: 'Gou', korean: '구', binary: '111110' },
  45: { name: 'Cui', korean: '췌', binary: '011000' },
  46: { name: 'Sheng', korean: '승', binary: '000110' },
  47: { name: 'Kun', korean: '곤', binary: '011010' },
  48: { name: 'Jing', korean: '정', binary: '010110' },
  49: { name: 'Ge', korean: '혁', binary: '011101' },
  50: { name: 'Ding', korean: '정', binary: '101110' },
  51: { name: 'Zhen', korean: '진', binary: '001001' },
  52: { name: 'Gen', korean: '간', binary: '100100' },
  53: { name: 'Jian', korean: '점', binary: '110100' },
  54: { name: 'Gui Mei', korean: '귀매', binary: '001011' },
  55: { name: 'Feng', korean: '풍', binary: '001101' },
  56: { name: 'Lu', korean: '려', binary: '101100' },
  57: { name: 'Xun', korean: '손', binary: '110110' },
  58: { name: 'Dui', korean: '태', binary: '011011' },
  59: { name: 'Huan', korean: '환', binary: '110010' },
  60: { name: 'Jie', korean: '절', binary: '010011' },
  61: { name: 'Zhong Fu', korean: '중부', binary: '110011' },
  62: { name: 'Xiao Guo', korean: '소과', binary: '001100' },
  63: { name: 'Ji Ji', korean: '기제', binary: '010101' },
  64: { name: 'Wei Ji', korean: '미제', binary: '101010' }
};

// 서괘전(序卦傳) 순서 - 32쌍
const XUGUA_PAIRS: [number, number][] = [
  [1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13, 14], [15, 16],
  [17, 18], [19, 20], [21, 22], [23, 24], [25, 26], [27, 28], [29, 30],
  [31, 32], [33, 34], [35, 36], [37, 38], [39, 40], [41, 42], [43, 44],
  [45, 46], [47, 48], [49, 50], [51, 52], [53, 54], [55, 56], [57, 58],
  [59, 60], [61, 62], [63, 64]
];

// 상경/하경 분류
const UPPER_CANON = Array.from({ length: 30 }, (_, i) => i + 1);  // 1-30
const LOWER_CANON = Array.from({ length: 34 }, (_, i) => i + 31); // 31-64

// ============================================================================
// 헬퍼 함수
// ============================================================================

function getHexData(num: number) {
  return HEXAGRAM_DATA[num] || { name: 'Unknown', korean: '미상', binary: '000000' };
}

function flipBinary(binary: string): string {
  return binary.split('').map(b => b === '1' ? '0' : '1').join('');
}

function reverseBinary(binary: string): string {
  return binary.split('').reverse().join('');
}

const BINARY_HEX_LOOKUP: Record<string, number> = Object.fromEntries(
  Object.entries(HEXAGRAM_DATA).map(([num, data]) => [data.binary, Number(num)])
);

function findHexByBinary(binary: string): number {
  return BINARY_HEX_LOOKUP[binary] ?? 0;
}

// ============================================================================
// 착종/호체 관계 분석
// ============================================================================

/**
 * 착종괘(錯綜卦) 분석
 * 착괘: 음양 반전 / 종괘: 상하 도전
 */
export function analyzeInversionRelations(hexNum: number): {
  착괘: { number: number; name: string };
  종괘: { number: number; name: string };
  설명: string;
} {
  const data = getHexData(hexNum);

  // 착괘: 모든 효 반전
  const 착Binary = flipBinary(data.binary);
  const 착Num = findHexByBinary(착Binary);
  const 착Data = getHexData(착Num);

  // 종괘: 상하 도전
  const 종Binary = reverseBinary(data.binary);
  const 종Num = findHexByBinary(종Binary);
  const 종Data = getHexData(종Num);

  return {
    착괘: { number: 착Num, name: 착Data.korean },
    종괘: { number: 종Num, name: 종Data.korean },
    설명: `${data.korean}의 착괘는 ${착Data.korean}, 종괘는 ${종Data.korean}입니다. ` +
          `착괘는 반대 관점, 종괘는 상황 전환을 의미합니다.`
  };
}

/**
 * 호체괘(互體卦) 분석
 */
export function analyzeNuclearHexagram(hexNum: number): {
  호괘: { number: number; name: string; binary: string };
  내적의미: string;
} {
  const data = getHexData(hexNum);

  // 2,3,4효 → 하괘, 3,4,5효 → 상괘
  const 호Lower = data.binary.slice(1, 4);
  const 호Upper = data.binary.slice(2, 5);
  const 호Binary = 호Lower + 호Upper;
  const 호Num = findHexByBinary(호Binary);
  const 호Data = getHexData(호Num);

  return {
    호괘: { number: 호Num, name: 호Data.korean, binary: 호Binary },
    내적의미: `${data.korean}의 내면(호괘)은 ${호Data.korean}로, 숨겨진 본질을 나타냅니다.`
  };
}

// ============================================================================
// 서괘전 순서 분석
// ============================================================================

/**
 * 서괘전 순서에서의 위치 분석
 */
export function analyzeSequencePosition(hexNum: number): SequenceAnalysis {
  const data = getHexData(hexNum);

  const 前Num = hexNum > 1 ? hexNum - 1 : 64;
  const 後Num = hexNum < 64 ? hexNum + 1 : 1;
  const 前Data = getHexData(前Num);
  const 後Data = getHexData(後Num);

  // 라이프사이클 단계
  let lifecycleStage: string;
  if (hexNum <= 10) {lifecycleStage = '시작과 기초';}
  else if (hexNum <= 20) {lifecycleStage = '성장과 발전';}
  else if (hexNum <= 30) {lifecycleStage = '완성과 전환';}
  else if (hexNum <= 40) {lifecycleStage = '관계와 조화';}
  else if (hexNum <= 50) {lifecycleStage = '변혁과 정립';}
  else if (hexNum <= 60) {lifecycleStage = '성숙과 안정';}
  else {lifecycleStage = '완성과 새 시작';}

  return {
    position: hexNum,
    hexagram: { number: hexNum, name: data.korean },
    前괘: { number: 前Num, name: 前Data.korean, transition: `${前Data.korean}에서 ${data.korean}으로의 발전` },
    後괘: { number: 後Num, name: 後Data.korean, transition: `${data.korean}에서 ${後Data.korean}으로의 전환` },
    sequenceMeaning: getSequenceMeaning(hexNum),
    lifecycleStage
  };
}

function getSequenceMeaning(num: number): string {
  const meanings: Record<number, string> = {
    1: '만물의 시작, 순수한 창조력',
    2: '수용과 포용의 완성',
    11: '천지가 교감하는 조화',
    12: '천지가 막힌 시련',
    29: '험난함 속의 지혜',
    30: '밝음의 확산',
    63: '완성의 시점',
    64: '미완성의 가능성'
  };
  return meanings[num] || `${num}번째 변화의 단계`;
}

/**
 * 서괘전 32쌍 분석
 */
export function getXuguaPair(hexNum: number): HexagramPair | null {
  for (const [a, b] of XUGUA_PAIRS) {
    if (a === hexNum || b === hexNum) {
      const dataA = getHexData(a);
      const dataB = getHexData(b);

      return {
        hex1: { number: a, name: dataA.korean, binary: dataA.binary },
        hex2: { number: b, name: dataB.korean, binary: dataB.binary },
        relationship: '선후',
        meaning: `${dataA.korean}과 ${dataB.korean}은 서괘전에서 짝을 이루며, 상보적 관계입니다.`
      };
    }
  }
  return null;
}

// ============================================================================
// 8대 그룹 분류
// ============================================================================

/**
 * 팔궁(八宮) 분류 - 건궁, 곤궁 등 8개 궁으로 분류
 */
export function classifyByPalace(hexNum: number): {
  palace: string;
  position: number;
  meaning: string;
} {
  // 팔궁 분류 (세효 변화 기준)
  const palaces: Record<string, number[]> = {
    '건궁': [1, 44, 33, 12, 20, 23, 35, 14],
    '곤궁': [2, 24, 19, 11, 34, 43, 5, 8],
    '진궁': [51, 16, 40, 32, 46, 48, 28, 17],
    '손궁': [57, 9, 37, 42, 25, 21, 27, 18],
    '감궁': [29, 60, 3, 63, 49, 55, 36, 7],
    '리궁': [30, 56, 50, 64, 4, 59, 6, 13],
    '간궁': [52, 22, 26, 41, 38, 10, 61, 53],
    '태궁': [58, 47, 45, 31, 39, 15, 62, 54]
  };

  for (const [palace, hexList] of Object.entries(palaces)) {
    const pos = hexList.indexOf(hexNum);
    if (pos !== -1) {
      return {
        palace,
        position: pos + 1,
        meaning: getPalaceMeaning(palace, pos + 1)
      };
    }
  }

  return { palace: '미상', position: 0, meaning: '분류 불가' };
}

function getPalaceMeaning(palace: string, position: number): string {
  const posNames = ['본궁', '일세', '이세', '삼세', '사세', '오세', '유혼', '귀혼'];
  return `${palace}의 ${posNames[position - 1] || '특별'} 위치`;
}

// ============================================================================
// 오행 기반 그룹
// ============================================================================

/**
 * 오행별 괘 분류
 */
export function classifyByElement(): ElementalGroup[] {
  const groups: ElementalGroup[] = [
    {
      element: '목',
      hexagrams: [
        { number: 3, name: '둔', role: '시작의 어려움' },
        { number: 4, name: '몽', role: '배움의 시작' },
        { number: 42, name: '익', role: '성장과 증가' },
        { number: 51, name: '진', role: '움직임의 시작' },
        { number: 57, name: '손', role: '부드러운 침투' }
      ],
      groupCharacteristic: '성장, 시작, 발전의 에너지'
    },
    {
      element: '화',
      hexagrams: [
        { number: 30, name: '리', role: '밝음과 명확' },
        { number: 49, name: '혁', role: '변혁과 개혁' },
        { number: 55, name: '풍', role: '풍요와 번성' },
        { number: 13, name: '동인', role: '화합과 협력' }
      ],
      groupCharacteristic: '밝음, 문명, 변화의 에너지'
    },
    {
      element: '토',
      hexagrams: [
        { number: 2, name: '곤', role: '수용과 포용' },
        { number: 15, name: '겸', role: '겸손함' },
        { number: 16, name: '예', role: '기쁨의 준비' },
        { number: 23, name: '박', role: '깎임과 변화' },
        { number: 52, name: '간', role: '멈춤과 안정' }
      ],
      groupCharacteristic: '안정, 중용, 신뢰의 에너지'
    },
    {
      element: '금',
      hexagrams: [
        { number: 1, name: '건', role: '창조와 강건' },
        { number: 43, name: '쾌', role: '결단과 돌파' },
        { number: 44, name: '구', role: '만남과 대응' },
        { number: 58, name: '태', role: '기쁨과 소통' }
      ],
      groupCharacteristic: '결단, 수렴, 완성의 에너지'
    },
    {
      element: '수',
      hexagrams: [
        { number: 29, name: '감', role: '험난과 지혜' },
        { number: 59, name: '환', role: '흩어짐과 소통' },
        { number: 60, name: '절', role: '절제와 균형' },
        { number: 6, name: '송', role: '다툼과 해결' }
      ],
      groupCharacteristic: '지혜, 유연, 흐름의 에너지'
    }
  ];

  return groups;
}

// ============================================================================
// 계절별 괘
// ============================================================================

/**
 * 12개월별 벽괘(辟卦) - 음양 소장 표현
 */
export function getMonthlyHexagrams(): SeasonalHexagram[] {
  const monthly: SeasonalHexagram[] = [
    { season: '동', month: 11, hexagram: { number: 2, name: '곤', binary: '000000' }, energy: '음이 극에 달함', advice: '깊은 휴식과 준비' },
    { season: '동', month: 12, hexagram: { number: 24, name: '복', binary: '000001' }, energy: '양이 처음 돌아옴', advice: '작은 시작을 소중히' },
    { season: '춘', month: 1, hexagram: { number: 19, name: '임', binary: '000011' }, energy: '양이 성장 시작', advice: '적극적 접근 가능' },
    { season: '춘', month: 2, hexagram: { number: 11, name: '태', binary: '000111' }, energy: '천지가 교감', advice: '조화와 발전의 시기' },
    { season: '춘', month: 3, hexagram: { number: 34, name: '대장', binary: '001111' }, energy: '양이 강해짐', advice: '힘이 넘치나 절제 필요' },
    { season: '하', month: 4, hexagram: { number: 43, name: '쾌', binary: '011111' }, energy: '양이 거의 완성', advice: '결단과 마무리' },
    { season: '하', month: 5, hexagram: { number: 1, name: '건', binary: '111111' }, energy: '양이 극에 달함', advice: '최고조의 활동력' },
    { season: '하', month: 6, hexagram: { number: 44, name: '구', binary: '111110' }, energy: '음이 처음 생김', advice: '변화 조짐 인식' },
    { season: '추', month: 7, hexagram: { number: 33, name: '둔', binary: '111100' }, energy: '음이 성장', advice: '물러남이 지혜' },
    { season: '추', month: 8, hexagram: { number: 12, name: '비', binary: '111000' }, energy: '천지가 막힘', advice: '인내와 자중' },
    { season: '추', month: 9, hexagram: { number: 20, name: '관', binary: '110000' }, energy: '음이 강해짐', advice: '관찰과 반성' },
    { season: '동', month: 10, hexagram: { number: 23, name: '박', binary: '100000' }, energy: '양이 거의 소멸', advice: '정리와 대비' }
  ];

  return monthly;
}

/**
 * 현재 계절의 괘 반환
 */
export function getCurrentSeasonalHexagram(date: Date = new Date()): SeasonalHexagram {
  const month = date.getMonth() + 1;
  const monthly = getMonthlyHexagrams();

  // 음력 월 대응 (간략화: 양력 기준)
  const adjustedMonth = month <= 2 ? month + 10 : month - 2;
  const idx = (adjustedMonth - 1) % 12;

  return monthly[idx];
}

// ============================================================================
// 대대괘 / 상반괘 쌍
// ============================================================================

/**
 * 상반/대대 괘 쌍 분석
 */
export function findOppositePairs(): OppositePairs {
  const complementary: HexagramPair[] = [];
  const conflicting: HexagramPair[] = [];
  const transforming: HexagramPair[] = [];

  // 대표적인 대대괘 쌍
  const opposites: [number, number][] = [
    [1, 2], [11, 12], [17, 18], [23, 24], [27, 28],
    [29, 30], [31, 32], [41, 42], [53, 54], [63, 64]
  ];

  for (const [a, b] of opposites) {
    const dataA = getHexData(a);
    const dataB = getHexData(b);

    if (flipBinary(dataA.binary) === dataB.binary) {
      complementary.push({
        hex1: { number: a, name: dataA.korean, binary: dataA.binary },
        hex2: { number: b, name: dataB.korean, binary: dataB.binary },
        relationship: '상반',
        meaning: `${dataA.korean}과 ${dataB.korean}은 완전한 음양 반전 관계`
      });
    } else {
      transforming.push({
        hex1: { number: a, name: dataA.korean, binary: dataA.binary },
        hex2: { number: b, name: dataB.korean, binary: dataB.binary },
        relationship: '대대',
        meaning: `${dataA.korean}과 ${dataB.korean}은 상호 전환하는 관계`
      });
    }
  }

  // 충돌 쌍 (개념적 대립)
  conflicting.push({
    hex1: { number: 47, name: '곤', binary: HEXAGRAM_DATA[47].binary },
    hex2: { number: 48, name: '정', binary: HEXAGRAM_DATA[48].binary },
    relationship: '대대',
    meaning: '곤궁함과 우물의 대비 - 고갈과 풍요'
  });

  return { complementary, conflicting, transforming };
}

// ============================================================================
// 패턴 매칭
// ============================================================================

/**
 * 특정 패턴을 가진 괘들 찾기
 */
export function findHexagramsByPattern(pattern: string): PatternMatch {
  const matches: number[] = [];

  for (const [numStr, data] of Object.entries(HEXAGRAM_DATA)) {
    if (matchesPattern(data.binary, pattern)) {
      matches.push(Number(numStr));
    }
  }

  return {
    pattern,
    matchedHexagrams: matches,
    significance: getPatternSignificance(pattern),
    rarity: getPatternRarity(matches.length)
  };
}

function matchesPattern(binary: string, pattern: string): boolean {
  if (pattern.length !== 6) {return false;}

  for (let i = 0; i < 6; i++) {
    if (pattern[i] !== '?' && pattern[i] !== binary[i]) {
      return false;
    }
  }
  return true;
}

function getPatternSignificance(pattern: string): string {
  const yangCount = (pattern.match(/1/g) || []).length;
  const yinCount = (pattern.match(/0/g) || []).length;

  if (pattern === '111111') {return '순양의 극강한 창조력';}
  if (pattern === '000000') {return '순음의 극대한 수용력';}
  if (yangCount === yinCount) {return '음양 균형의 조화';}
  if (yangCount > yinCount) {return '양기 우세의 진취성';}
  return '음기 우세의 수용성';
}

function getPatternRarity(count: number): PatternMatch['rarity'] {
  if (count === 1) {return 'very_rare';}
  if (count <= 4) {return 'rare';}
  if (count <= 10) {return 'uncommon';}
  return 'common';
}

/**
 * 특수 패턴 괘 목록
 */
export function getSpecialPatternHexagrams(): Record<string, PatternMatch> {
  return {
    '순양': findHexagramsByPattern('111111'),
    '순음': findHexagramsByPattern('000000'),
    '일양': findHexagramsByPattern('?????1').matchedHexagrams.length > 0
      ? findHexagramsByPattern('000001')
      : findHexagramsByPattern('000001'),
    '일음': findHexagramsByPattern('111110'),
    '교제': findHexagramsByPattern('010101'),  // 기제
    '미제': findHexagramsByPattern('101010'),
    '중허': findHexagramsByPattern('11??11'),  // 가운데 비어있음
    '중실': findHexagramsByPattern('00??00')   // 가운데 차있음
  };
}

// ============================================================================
// 종합 관계 분석
// ============================================================================

/**
 * 두 괘의 종합 관계 분석
 */
export function analyzeHexagramRelationship(hex1: number, hex2: number): {
  relationship: string;
  similarity: number;
  compatibility: 'excellent' | 'good' | 'neutral' | 'challenging';
  advice: string;
} {
  const data1 = getHexData(hex1);
  const data2 = getHexData(hex2);

  // 유사도 계산
  let sameCount = 0;
  for (let i = 0; i < 6; i++) {
    if (data1.binary[i] === data2.binary[i]) {sameCount++;}
  }
  const similarity = (sameCount / 6) * 100;

  // 관계 유형 판단
  let relationship: string;
  let compatibility: 'excellent' | 'good' | 'neutral' | 'challenging';

  if (hex1 === hex2) {
    relationship = '동일괘';
    compatibility = 'excellent';
  } else if (flipBinary(data1.binary) === data2.binary) {
    relationship = '상반괘 (음양 반전)';
    compatibility = 'challenging';
  } else if (reverseBinary(data1.binary) === data2.binary) {
    relationship = '도괘 (상하 도전)';
    compatibility = 'neutral';
  } else if (similarity >= 80) {
    relationship = '유사괘';
    compatibility = 'good';
  } else if (similarity <= 20) {
    relationship = '대립괘';
    compatibility = 'challenging';
  } else {
    relationship = '일반 관계';
    compatibility = 'neutral';
  }

  return {
    relationship,
    similarity: Math.round(similarity),
    compatibility,
    advice: getRelationshipAdvice(compatibility, data1.korean, data2.korean)
  };
}

function getRelationshipAdvice(
  compatibility: 'excellent' | 'good' | 'neutral' | 'challenging',
  name1: string,
  name2: string
): string {
  switch (compatibility) {
    case 'excellent':
      return '매우 조화로운 관계입니다.';
    case 'good':
      return '순조로운 협력이 가능합니다.';
    case 'neutral':
      return '상황에 따라 유연하게 대응하세요.';
    case 'challenging':
      return `${name1}과 ${name2}은 대조적이니 균형점을 찾으세요.`;
  }
}

/**
 * 전체 64괘 관계망 생성 (결과 캐싱)
 */
let _networkCache: { nodes: { id: number; name: string; group: string }[]; edges: { source: number; target: number; type: string }[] } | null = null;

export function generateHexagramNetwork(): {
  nodes: { id: number; name: string; group: string }[];
  edges: { source: number; target: number; type: string }[];
} {
  if (_networkCache) return _networkCache;

  const nodes = Object.entries(HEXAGRAM_DATA).map(([num, data]) => ({
    id: Number(num),
    name: data.korean,
    group: classifyByPalace(Number(num)).palace
  }));

  const edges: { source: number; target: number; type: string }[] = [];

  // 서괘전 순서 연결
  for (let i = 1; i < 64; i++) {
    edges.push({ source: i, target: i + 1, type: 'sequence' });
  }

  // 상반괘 연결
  for (let i = 1; i <= 64; i++) {
    const data = getHexData(i);
    const opposite = findHexByBinary(flipBinary(data.binary));
    if (opposite > i) {
      edges.push({ source: i, target: opposite, type: 'opposite' });
    }
  }

  _networkCache = { nodes, edges };
  return _networkCache;
}
