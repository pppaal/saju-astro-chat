/**
 * advancedIChingCore.ts - 주역 고급 핵심 분석 엔진 (1000% 레벨)
 *
 * 호괘, 착괘, 도괘, 상반괘, 복괘, 핵괘, 효위 분석
 */

// ============================================================================
// 타입 정의
// ============================================================================

export interface Trigram {
  name: string;
  korean: string;
  hanja: string;
  binary: string;  // 3자리 (예: '111')
  element: string;
  nature: string;
  direction: string;
  family: string;
  body: string;
  animal: string;
}

export interface HexagramBasic {
  number: number;
  binary: string;  // 6자리
  name: string;
  korean?: string;
}

export interface HoGwaAnalysis {
  호괘: HexagramBasic;           // 2,3,4,5효로 만든 괘
  explanation: string;
  innerMeaning: string;
}

export interface ChakGwaAnalysis {
  착괘: HexagramBasic;           // 1,2,3,4,5,6 → 2,1,4,3,6,5
  explanation: string;
  relationship: string;
}

export interface DoGwaAnalysis {
  도괘: HexagramBasic;           // 180도 뒤집기
  explanation: string;
  reverseViewpoint: string;
}

export interface SangbanGwaAnalysis {
  상반괘: HexagramBasic;         // 음양 반전
  explanation: string;
  oppositeForce: string;
}

export interface BokGwaAnalysis {
  복괘: HexagramBasic;           // 상괘/하괘 교환
  explanation: string;
  transformation: string;
}

export interface HaekGwaAnalysis {
  상핵: { binary: string; name: string };  // 3,4,5효
  하핵: { binary: string; name: string };  // 2,3,4효
  explanation: string;
  coreEnergy: string;
}

export interface TrigramAnalysis {
  상괘: Trigram;
  하괘: Trigram;
  interaction: string;
  dynamicMeaning: string;
}

export interface YaoPositionAnalysis {
  position: number;
  name: string;       // 초효, 이효, 삼효, 사효, 오효, 상효
  nature: '양' | '음';
  isCorrect: boolean;  // 위치와 음양 일치 여부
  isResonant: boolean; // 상응 관계 (1-4, 2-5, 3-6)
  meaning: string;
  advice: string;
}

export interface ChangingLineAnalysis {
  fromHexagram: HexagramBasic;
  toHexagram: HexagramBasic;
  changingLines: number[];
  interpretation: string;
  transitionAdvice: string;
  keyMoment: string;
}

export interface ComprehensiveHexagramAnalysis {
  본괘: HexagramBasic;
  trigrams: TrigramAnalysis;
  hoGwa: HoGwaAnalysis;
  chakGwa: ChakGwaAnalysis;
  doGwa: DoGwaAnalysis;
  sangbanGwa: SangbanGwaAnalysis;
  bokGwa: BokGwaAnalysis;
  haekGwa: HaekGwaAnalysis;
  yaoPositions: YaoPositionAnalysis[];
  overallInsight: string;
  actionAdvice: string[];
}

// ============================================================================
// 팔괘 (8 Trigrams) 데이터
// ============================================================================

export const TRIGRAMS: Record<string, Trigram> = {
  '111': {
    name: 'Qian', korean: '건', hanja: '乾',
    binary: '111', element: '금', nature: '하늘',
    direction: '서북', family: '부', body: '머리', animal: '말'
  },
  '000': {
    name: 'Kun', korean: '곤', hanja: '坤',
    binary: '000', element: '토', nature: '땅',
    direction: '서남', family: '모', body: '배', animal: '소'
  },
  '001': {
    name: 'Zhen', korean: '진', hanja: '震',
    binary: '001', element: '목', nature: '우레',
    direction: '동', family: '장남', body: '발', animal: '용'
  },
  '010': {
    name: 'Kan', korean: '감', hanja: '坎',
    binary: '010', element: '수', nature: '물',
    direction: '북', family: '중남', body: '귀', animal: '돼지'
  },
  '011': {
    name: 'Gen', korean: '간', hanja: '艮',
    binary: '011', element: '토', nature: '산',
    direction: '동북', family: '소남', body: '손', animal: '개'
  },
  '100': {
    name: 'Xun', korean: '손', hanja: '巽',
    binary: '100', element: '목', nature: '바람',
    direction: '동남', family: '장녀', body: '다리', animal: '닭'
  },
  '101': {
    name: 'Li', korean: '리', hanja: '離',
    binary: '101', element: '화', nature: '불',
    direction: '남', family: '중녀', body: '눈', animal: '꿩'
  },
  '110': {
    name: 'Dui', korean: '태', hanja: '兌',
    binary: '110', element: '금', nature: '연못',
    direction: '서', family: '소녀', body: '입', animal: '양'
  }
};

// 64괘 기본 정보 (number와 binary 매핑)
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

function getHexagramFromBinary(binary: string): HexagramBasic {
  const info = HEXAGRAM_MAP[binary];
  if (info) {
    return { number: info.number, binary, name: info.name, korean: info.korean };
  }
  return { number: 0, binary, name: 'Unknown', korean: '미상' };
}

function getUpperTrigram(binary: string): string {
  return binary.slice(3, 6);
}

function getLowerTrigram(binary: string): string {
  return binary.slice(0, 3);
}

function flipBit(bit: string): string {
  return bit === '1' ? '0' : '1';
}

function flipBinary(binary: string): string {
  return binary.split('').map(flipBit).join('');
}

function reverseBinary(binary: string): string {
  return binary.split('').reverse().join('');
}

// ============================================================================
// 핵심 분석 함수
// ============================================================================

/**
 * 호괘 분석 - 2,3,4,5효로 새 괘 생성
 */
export function analyzeHoGwa(binary: string): HoGwaAnalysis {
  // 2,3,4효 → 하괘, 3,4,5효 → 상괘
  const lowerHo = binary.slice(1, 4);  // 2,3,4효
  const upperHo = binary.slice(2, 5);  // 3,4,5효
  const hoBinary = lowerHo + upperHo;

  const 호괘 = getHexagramFromBinary(hoBinary);

  return {
    호괘,
    explanation: `본괘의 내부 핵심(2-5효)에서 추출한 괘로, 상황의 본질과 핵심 에너지를 나타냅니다.`,
    innerMeaning: getHoGwaMeaning(호괘.number)
  };
}

function getHoGwaMeaning(num: number): string {
  const meanings: Record<number, string> = {
    1: '내면에 강한 창조력과 추진력이 숨어있습니다.',
    2: '유연함과 수용성이 상황의 핵심입니다.',
    11: '내면적으로 조화와 균형을 이루고 있습니다.',
    12: '막힘이 있지만 변화의 씨앗이 있습니다.',
    29: '어려움 속에서도 지혜가 흐르고 있습니다.',
    30: '밝음과 명확함이 핵심 에너지입니다.'
  };
  return meanings[num] || '본질적인 변화의 에너지가 작용합니다.';
}

/**
 * 착괘 분석 - 효 쌍 교환 (1↔2, 3↔4, 5↔6)
 */
export function analyzeChakGwa(binary: string): ChakGwaAnalysis {
  const chars = binary.split('');
  const chakBinary = [chars[1], chars[0], chars[3], chars[2], chars[5], chars[4]].join('');

  const 착괘 = getHexagramFromBinary(chakBinary);

  return {
    착괘,
    explanation: '효 쌍을 교환한 괘로, 관계와 상호작용의 다른 측면을 보여줍니다.',
    relationship: getChakGwaRelationship(착괘.number)
  };
}

function getChakGwaRelationship(num: number): string {
  return '상호 보완적 관계에서의 역할 전환을 의미합니다.';
}

/**
 * 도괘 분석 - 180도 뒤집기
 */
export function analyzeDoGwa(binary: string): DoGwaAnalysis {
  const doBinary = reverseBinary(binary);
  const 도괘 = getHexagramFromBinary(doBinary);

  return {
    도괘,
    explanation: '괘를 뒤집은 것으로, 반대 입장이나 역방향에서 본 관점을 나타냅니다.',
    reverseViewpoint: getDoGwaViewpoint(도괘.number)
  };
}

function getDoGwaViewpoint(num: number): string {
  return '상대방 관점 또는 시간이 흐른 후의 상황을 암시합니다.';
}

/**
 * 상반괘 분석 - 모든 효 음양 반전
 */
export function analyzeSangbanGwa(binary: string): SangbanGwaAnalysis {
  const sangbanBinary = flipBinary(binary);
  const 상반괘 = getHexagramFromBinary(sangbanBinary);

  return {
    상반괘,
    explanation: '모든 효의 음양을 반전시킨 괘로, 완전히 반대되는 상황이나 힘을 나타냅니다.',
    oppositeForce: getSangbanForce(상반괘.number)
  };
}

function getSangbanForce(num: number): string {
  return '상반된 에너지와의 균형이 필요한 시점을 암시합니다.';
}

/**
 * 복괘 분석 - 상괘/하괘 교환
 */
export function analyzeBokGwa(binary: string): BokGwaAnalysis {
  const upper = getUpperTrigram(binary);
  const lower = getLowerTrigram(binary);
  const bokBinary = upper + lower;  // 상하 교환

  const 복괘 = getHexagramFromBinary(bokBinary);

  return {
    복괘,
    explanation: '상괘와 하괘를 교환한 괘로, 내외의 전환이나 위치 변화를 의미합니다.',
    transformation: getBokTransformation(복괘.number)
  };
}

function getBokTransformation(num: number): string {
  return '내면과 외면, 원인과 결과의 위치가 바뀔 수 있음을 암시합니다.';
}

/**
 * 핵괘 분석 - 상핵(3,4,5효), 하핵(2,3,4효)
 */
export function analyzeHaekGwa(binary: string): HaekGwaAnalysis {
  const 하핵 = binary.slice(1, 4);  // 2,3,4효
  const 상핵 = binary.slice(2, 5);  // 3,4,5효

  const 하핵Trigram = TRIGRAMS[하핵];
  const 상핵Trigram = TRIGRAMS[상핵];

  return {
    상핵: { binary: 상핵, name: 상핵Trigram?.korean || '미상' },
    하핵: { binary: 하핵, name: 하핵Trigram?.korean || '미상' },
    explanation: '괘의 핵심 에너지를 나타내는 중심부 소성괘입니다.',
    coreEnergy: getHaekEnergy(하핵Trigram, 상핵Trigram)
  };
}

function getHaekEnergy(lower: Trigram | undefined, upper: Trigram | undefined): string {
  if (!lower || !upper) return '핵심 에너지 분석 중';
  return `하핵 ${lower.korean}(${lower.nature})과 상핵 ${upper.korean}(${upper.nature})의 조합이 상황의 본질입니다.`;
}

/**
 * 상하괘(소성괘) 분석
 */
export function analyzeTrigramInteraction(binary: string): TrigramAnalysis {
  const upperBinary = getUpperTrigram(binary);
  const lowerBinary = getLowerTrigram(binary);

  const 상괘 = TRIGRAMS[upperBinary] || TRIGRAMS['000'];
  const 하괘 = TRIGRAMS[lowerBinary] || TRIGRAMS['000'];

  return {
    상괘,
    하괘,
    interaction: `${하괘.nature}(${하괘.korean}) 위에 ${상괘.nature}(${상괘.korean})가 있습니다.`,
    dynamicMeaning: getTrigramDynamic(하괘, 상괘)
  };
}

function getTrigramDynamic(lower: Trigram, upper: Trigram): string {
  const dynamics: Record<string, string> = {
    '건건': '하늘이 거듭되니 강건함이 최고조입니다.',
    '곤곤': '땅이 거듭되니 수용과 포용의 극치입니다.',
    '감감': '물이 거듭되니 깊은 지혜와 시련이 있습니다.',
    '리리': '불이 거듭되니 밝음과 명석함이 강조됩니다.',
    '건곤': '하늘과 땅이 만나니 평화와 조화입니다.',
    '곤건': '땅과 하늘이 막히니 어려움이 있습니다.'
  };

  const key = lower.korean + upper.korean;
  return dynamics[key] || `${lower.nature}과 ${upper.nature}의 상호작용이 핵심입니다.`;
}

/**
 * 효위(爻位) 분석
 */
export function analyzeYaoPositions(binary: string): YaoPositionAnalysis[] {
  const positions: YaoPositionAnalysis[] = [];
  const yaoNames = ['초효', '이효', '삼효', '사효', '오효', '상효'];

  for (let i = 0; i < 6; i++) {
    const bit = binary[i];
    const nature: '양' | '음' = bit === '1' ? '양' : '음';
    const positionNumber = i + 1;

    // 양효는 홀수 위치, 음효는 짝수 위치가 정위
    const isCorrect = (nature === '양' && positionNumber % 2 === 1) ||
                      (nature === '음' && positionNumber % 2 === 0);

    // 상응 관계: 1-4, 2-5, 3-6
    const correspondingPos = positionNumber <= 3 ? positionNumber + 3 : positionNumber - 3;
    const correspondingBit = binary[correspondingPos - 1];
    const isResonant = bit !== correspondingBit;  // 음양이 달라야 상응

    positions.push({
      position: positionNumber,
      name: yaoNames[i],
      nature,
      isCorrect,
      isResonant,
      meaning: getYaoMeaning(positionNumber, nature, isCorrect),
      advice: getYaoAdvice(positionNumber, nature, isResonant)
    });
  }

  return positions;
}

function getYaoMeaning(pos: number, nature: '양' | '음', isCorrect: boolean): string {
  const positionMeanings: Record<number, string> = {
    1: '시작 단계, 잠재력의 시기',
    2: '성장 단계, 내적 발전',
    3: '전환점, 내외의 경계',
    4: '근신의 위치, 조심스러운 전진',
    5: '군위, 최고의 위치',
    6: '극한, 끝과 새로운 시작'
  };

  return `${positionMeanings[pos]} - ${isCorrect ? '정위(正位)로 안정적' : '부정위로 변화 필요'}`;
}

function getYaoAdvice(pos: number, nature: '양' | '음', isResonant: boolean): string {
  if (isResonant) {
    return `${pos}효와 상응하는 효가 조화를 이루어 협력이 가능합니다.`;
  }
  return `${pos}효의 상응 관계가 약하여 독자적 노력이 필요합니다.`;
}

/**
 * 변효 분석
 */
export function analyzeChangingLines(
  fromBinary: string,
  changingLines: number[]
): ChangingLineAnalysis {
  // 변효 적용
  const toBinaryArr = fromBinary.split('');
  for (const line of changingLines) {
    const idx = line - 1;
    toBinaryArr[idx] = flipBit(toBinaryArr[idx]);
  }
  const toBinary = toBinaryArr.join('');

  const fromHexagram = getHexagramFromBinary(fromBinary);
  const toHexagram = getHexagramFromBinary(toBinary);

  return {
    fromHexagram,
    toHexagram,
    changingLines,
    interpretation: getChangingInterpretation(changingLines),
    transitionAdvice: getTransitionAdvice(fromHexagram.number, toHexagram.number),
    keyMoment: `${changingLines.length}개의 변효가 작용하여 상황이 ${fromHexagram.korean}에서 ${toHexagram.korean}으로 전환됩니다.`
  };
}

function getChangingInterpretation(lines: number[]): string {
  if (lines.length === 0) return '변효가 없어 현 상황이 안정적입니다.';
  if (lines.length === 1) return `${lines[0]}효가 변하여 핵심적인 변화가 일어납니다.`;
  if (lines.length === 2) return `${lines.join(', ')}효가 변하여 복합적인 변화가 진행됩니다.`;
  if (lines.length >= 3) return '다수의 변효로 근본적인 전환기입니다.';
  return '';
}

function getTransitionAdvice(from: number, to: number): string {
  if (from === to) return '변화 속에서도 본질은 유지됩니다.';
  return '변화를 수용하고 새로운 국면에 대비하세요.';
}

/**
 * 종합 괘 분석
 */
export function performComprehensiveHexagramAnalysis(binary: string): ComprehensiveHexagramAnalysis {
  const 본괘 = getHexagramFromBinary(binary);

  return {
    본괘,
    trigrams: analyzeTrigramInteraction(binary),
    hoGwa: analyzeHoGwa(binary),
    chakGwa: analyzeChakGwa(binary),
    doGwa: analyzeDoGwa(binary),
    sangbanGwa: analyzeSangbanGwa(binary),
    bokGwa: analyzeBokGwa(binary),
    haekGwa: analyzeHaekGwa(binary),
    yaoPositions: analyzeYaoPositions(binary),
    overallInsight: generateOverallInsight(binary),
    actionAdvice: generateActionAdvice(binary)
  };
}

function generateOverallInsight(binary: string): string {
  const trigrams = analyzeTrigramInteraction(binary);
  const hoGwa = analyzeHoGwa(binary);

  return `본괘는 ${trigrams.하괘.nature}(${trigrams.하괘.korean}) 위에 ${trigrams.상괘.nature}(${trigrams.상괘.korean})가 있는 형상입니다. ` +
         `내면의 핵심(호괘)은 ${hoGwa.호괘.korean}의 에너지를 담고 있습니다.`;
}

function generateActionAdvice(binary: string): string[] {
  const yaoPositions = analyzeYaoPositions(binary);
  const advice: string[] = [];

  // 5효(군위) 분석
  const fifthYao = yaoPositions[4];
  if (fifthYao.isCorrect && fifthYao.isResonant) {
    advice.push('지도자적 위치에서 조화를 이룰 수 있습니다.');
  }

  // 정위/부정위 비율
  const correctCount = yaoPositions.filter(y => y.isCorrect).length;
  if (correctCount >= 4) {
    advice.push('전반적으로 안정적인 구조이니 현 상태를 유지하세요.');
  } else if (correctCount <= 2) {
    advice.push('불안정한 요소가 많으니 변화에 유연하게 대응하세요.');
  }

  // 상응 관계 분석
  const resonantCount = yaoPositions.filter(y => y.isResonant).length;
  if (resonantCount >= 2) {
    advice.push('협력과 조화의 기회가 있으니 관계를 활용하세요.');
  }

  if (advice.length === 0) {
    advice.push('중도를 지키며 때를 기다리세요.');
  }

  return advice;
}

/**
 * 두 괘 비교 분석
 */
export function compareHexagrams(binary1: string, binary2: string): {
  similarity: number;
  relationship: string;
  commonEnergy: string;
  differenceAnalysis: string;
} {
  let matchCount = 0;
  for (let i = 0; i < 6; i++) {
    if (binary1[i] === binary2[i]) matchCount++;
  }

  const similarity = (matchCount / 6) * 100;

  let relationship: string;
  if (binary1 === binary2) {
    relationship = '동일괘';
  } else if (flipBinary(binary1) === binary2) {
    relationship = '상반괘 관계';
  } else if (reverseBinary(binary1) === binary2) {
    relationship = '도괘 관계';
  } else if (matchCount >= 5) {
    relationship = '유사괘';
  } else if (matchCount <= 1) {
    relationship = '대립괘';
  } else {
    relationship = '일반 관계';
  }

  return {
    similarity,
    relationship,
    commonEnergy: `${matchCount}개 효가 동일하여 ${Math.round(similarity)}%의 유사성을 보입니다.`,
    differenceAnalysis: `${6 - matchCount}개 효가 다르며 이 부분에서 변화와 대조가 나타납니다.`
  };
}
