/**
 * advancedIChingCore.ts - 주역 고급 핵심 분석 엔진 (1000% 레벨)
 *
 * 호괘, 착괘, 도괘, 상반괘, 복괘, 핵괘, 효위 분석
 */

import { DICTS } from '@/i18n/I18nProvider';

type Locale = 'en' | 'ko';

/** Helper to get an iching.analysis translation key (with cache) */
const _taCache: Record<string, string> = {};

function ta(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  const cacheKey = `${locale}:${key}`;
  let val = _taCache[cacheKey];
  if (val === undefined) {
    const dict = DICTS[locale] as Record<string, any>;
    val = dict?.iching?.analysis?.[key] ?? key;
    _taCache[cacheKey] = val;
  }
  if (vars) {
    let result = val;
    for (const [k, v] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
    return result;
  }
  return val;
}

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

function getHexagramFromBinary(binary: string, locale: Locale = 'ko'): HexagramBasic {
  const info = HEXAGRAM_MAP[binary];
  if (info) {
    return { number: info.number, binary, name: info.name, korean: info.korean };
  }
  return { number: 0, binary, name: 'Unknown', korean: ta(locale, 'unknown') };
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
export function analyzeHoGwa(binary: string, locale: Locale = 'ko'): HoGwaAnalysis {
  // 2,3,4효 → 하괘, 3,4,5효 → 상괘
  const lowerHo = binary.slice(1, 4);  // 2,3,4효
  const upperHo = binary.slice(2, 5);  // 3,4,5효
  const hoBinary = lowerHo + upperHo;

  const 호괘 = getHexagramFromBinary(hoBinary, locale);

  return {
    호괘,
    explanation: ta(locale, 'hoGwaExplanation'),
    innerMeaning: getHoGwaMeaning(호괘.number, locale)
  };
}

function getHoGwaMeaning(num: number, locale: Locale): string {
  const key = `hoGwaMeaning${num}`;
  const dict = DICTS[locale] as Record<string, any>;
  const val = dict?.iching?.analysis?.[key];
  return val || ta(locale, 'hoGwaMeaningDefault');
}

/**
 * 착괘 분석 - 효 쌍 교환 (1↔2, 3↔4, 5↔6)
 */
export function analyzeChakGwa(binary: string, locale: Locale = 'ko'): ChakGwaAnalysis {
  const chars = binary.split('');
  const chakBinary = [chars[1], chars[0], chars[3], chars[2], chars[5], chars[4]].join('');

  const 착괘 = getHexagramFromBinary(chakBinary, locale);

  return {
    착괘,
    explanation: ta(locale, 'chakGwaExplanation'),
    relationship: ta(locale, 'chakGwaRelationship')
  };
}

/**
 * 도괘 분석 - 180도 뒤집기
 */
export function analyzeDoGwa(binary: string, locale: Locale = 'ko'): DoGwaAnalysis {
  const doBinary = reverseBinary(binary);
  const 도괘 = getHexagramFromBinary(doBinary, locale);

  return {
    도괘,
    explanation: ta(locale, 'doGwaExplanation'),
    reverseViewpoint: ta(locale, 'doGwaViewpoint')
  };
}

/**
 * 상반괘 분석 - 모든 효 음양 반전
 */
export function analyzeSangbanGwa(binary: string, locale: Locale = 'ko'): SangbanGwaAnalysis {
  const sangbanBinary = flipBinary(binary);
  const 상반괘 = getHexagramFromBinary(sangbanBinary, locale);

  return {
    상반괘,
    explanation: ta(locale, 'sangbanGwaExplanation'),
    oppositeForce: ta(locale, 'sangbanForce')
  };
}

/**
 * 복괘 분석 - 상괘/하괘 교환
 */
export function analyzeBokGwa(binary: string, locale: Locale = 'ko'): BokGwaAnalysis {
  const upper = getUpperTrigram(binary);
  const lower = getLowerTrigram(binary);
  const bokBinary = upper + lower;  // 상하 교환

  const 복괘 = getHexagramFromBinary(bokBinary, locale);

  return {
    복괘,
    explanation: ta(locale, 'bokGwaExplanation'),
    transformation: ta(locale, 'bokTransformation')
  };
}

/**
 * 핵괘 분석 - 상핵(3,4,5효), 하핵(2,3,4효)
 */
export function analyzeHaekGwa(binary: string, locale: Locale = 'ko'): HaekGwaAnalysis {
  const 하핵 = binary.slice(1, 4);  // 2,3,4효
  const 상핵 = binary.slice(2, 5);  // 3,4,5효

  const 하핵Trigram = TRIGRAMS[하핵];
  const 상핵Trigram = TRIGRAMS[상핵];

  return {
    상핵: { binary: 상핵, name: 상핵Trigram?.korean || ta(locale, 'unknown') },
    하핵: { binary: 하핵, name: 하핵Trigram?.korean || ta(locale, 'unknown') },
    explanation: ta(locale, 'haekGwaExplanation'),
    coreEnergy: getHaekEnergy(하핵Trigram, 상핵Trigram, locale)
  };
}

function getHaekEnergy(lower: Trigram | undefined, upper: Trigram | undefined, locale: Locale): string {
  if (!lower || !upper) {return ta(locale, 'haekEnergyAnalyzing');}
  return ta(locale, 'haekEnergyTemplate', {
    lower: lower.korean, lowerNature: lower.nature,
    upper: upper.korean, upperNature: upper.nature
  });
}

/**
 * 상하괘(소성괘) 분석
 */
export function analyzeTrigramInteraction(binary: string, locale: Locale = 'ko'): TrigramAnalysis {
  const upperBinary = getUpperTrigram(binary);
  const lowerBinary = getLowerTrigram(binary);

  const 상괘 = TRIGRAMS[upperBinary] || TRIGRAMS['000'];
  const 하괘 = TRIGRAMS[lowerBinary] || TRIGRAMS['000'];

  return {
    상괘,
    하괘,
    interaction: ta(locale, 'trigramInteraction', {
      lowerNature: 하괘.nature, lowerKo: 하괘.korean,
      upperNature: 상괘.nature, upperKo: 상괘.korean
    }),
    dynamicMeaning: getTrigramDynamic(하괘, 상괘, locale)
  };
}

function getTrigramDynamic(lower: Trigram, upper: Trigram, locale: Locale): string {
  const key = lower.korean + upper.korean;
  const dynamicKey = `trigramDynamic_${key}`;
  const dict = DICTS[locale] as Record<string, any>;
  const val = dict?.iching?.analysis?.[dynamicKey];
  if (val) return val;
  return ta(locale, 'trigramDynamicDefault', {
    lowerNature: lower.nature, upperNature: upper.nature
  });
}

/**
 * 효위(爻位) 분석
 */
export function analyzeYaoPositions(binary: string, locale: Locale = 'ko'): YaoPositionAnalysis[] {
  const positions: YaoPositionAnalysis[] = [];
  const yaoNameKeys = ['yaoName1', 'yaoName2', 'yaoName3', 'yaoName4', 'yaoName5', 'yaoName6'];

  for (let i = 0; i < 6; i++) {
    const bit = binary[i];
    const isYang = bit === '1';
    const nature: '양' | '음' = isYang ? '양' : '음';
    const positionNumber = i + 1;

    // 양효는 홀수 위치, 음효는 짝수 위치가 정위
    const isCorrect = (isYang && positionNumber % 2 === 1) ||
                      (!isYang && positionNumber % 2 === 0);

    // 상응 관계: 1-4, 2-5, 3-6
    const correspondingPos = positionNumber <= 3 ? positionNumber + 3 : positionNumber - 3;
    const correspondingBit = binary[correspondingPos - 1];
    const isResonant = bit !== correspondingBit;  // 음양이 달라야 상응

    positions.push({
      position: positionNumber,
      name: ta(locale, yaoNameKeys[i]),
      nature,
      isCorrect,
      isResonant,
      meaning: getYaoMeaning(positionNumber, isCorrect, locale),
      advice: getYaoAdvice(positionNumber, isResonant, locale)
    });
  }

  return positions;
}

function getYaoMeaning(pos: number, isCorrect: boolean, locale: Locale): string {
  const posMeaning = ta(locale, `yaoPos${pos}`);
  const correctness = isCorrect ? ta(locale, 'yaoPosCorrect') : ta(locale, 'yaoPosIncorrect');
  return `${posMeaning} - ${correctness}`;
}

function getYaoAdvice(pos: number, isResonant: boolean, locale: Locale): string {
  if (isResonant) {
    return ta(locale, 'yaoResonant', { pos });
  }
  return ta(locale, 'yaoNotResonant', { pos });
}

/**
 * 변효 분석 (전통 주역 규칙 준수)
 */
export function analyzeChangingLines(
  fromBinary: string,
  changingLines: number[],
  locale: Locale = 'ko'
): ChangingLineAnalysis {
  // 변효 적용
  const toBinaryArr = fromBinary.split('');
  for (const line of changingLines) {
    const idx = line - 1;
    toBinaryArr[idx] = flipBit(toBinaryArr[idx]);
  }
  const toBinary = toBinaryArr.join('');

  const fromHexagram = getHexagramFromBinary(fromBinary, locale);
  const toHexagram = getHexagramFromBinary(toBinary, locale);

  return {
    fromHexagram,
    toHexagram,
    changingLines,
    interpretation: getChangingInterpretation(changingLines, fromHexagram.number, toHexagram.number, locale),
    transitionAdvice: getTransitionAdvice(changingLines, fromHexagram.number, toHexagram.number, locale),
    keyMoment: getKeyMoment(changingLines, fromHexagram, toHexagram, locale)
  };
}

function getChangingInterpretation(lines: number[], fromNum: number, toNum: number, locale: Locale): string {
  const lineCount = lines.length;

  if (lineCount === 0) {
    return ta(locale, 'changingNone');
  }
  if (lineCount === 1) {
    return ta(locale, 'changingSingle', { line: lines[0] });
  }
  if (lineCount === 2) {
    const sortedLines = [...lines].sort((a, b) => a - b);
    const upperLine = sortedLines[sortedLines.length - 1];
    return ta(locale, 'changingDouble', { lines: sortedLines.join(', '), upper: upperLine });
  }
  if (lineCount === 3) {
    return ta(locale, 'changingTriple');
  }
  if (lineCount === 4) {
    const unchangedLines = [1, 2, 3, 4, 5, 6].filter(n => !lines.includes(n)).sort((a, b) => a - b);
    const lowerUnchanged = unchangedLines[0];
    return ta(locale, 'changingQuadruple', { unchanged: unchangedLines.join(', '), lower: lowerUnchanged });
  }
  if (lineCount === 5) {
    const unchangedLine = [1, 2, 3, 4, 5, 6].find(n => !lines.includes(n));
    return ta(locale, 'changingQuintuple', { line: unchangedLine ?? 0 });
  }
  if (lineCount === 6) {
    if (fromNum === 1 && toNum === 2) {
      return ta(locale, 'changingSixYongJiu');
    }
    if (fromNum === 2 && toNum === 1) {
      return ta(locale, 'changingSixYongYuk');
    }
    return ta(locale, 'changingSix');
  }
  return '';
}

function getTransitionAdvice(lines: number[], fromNum: number, toNum: number, locale: Locale): string {
  const lineCount = lines.length;

  if (lineCount === 0) {return ta(locale, 'transitionAdvice0');}
  if (lineCount === 1) {return ta(locale, 'transitionAdvice1');}
  if (lineCount === 2) {return ta(locale, 'transitionAdvice2');}
  if (lineCount === 3) {return ta(locale, 'transitionAdvice3');}
  if (lineCount === 4) {return ta(locale, 'transitionAdvice4');}
  if (lineCount === 5) {return ta(locale, 'transitionAdvice5');}
  if (lineCount === 6) {
    if (fromNum === 1 && toNum === 2) {return ta(locale, 'transitionAdvice6YongJiu');}
    if (fromNum === 2 && toNum === 1) {return ta(locale, 'transitionAdvice6YongYuk');}
    return ta(locale, 'transitionAdvice6Default');
  }
  return ta(locale, 'transitionAdvice0');
}

function getKeyMoment(lines: number[], fromHex: HexagramBasic, toHex: HexagramBasic, locale: Locale): string {
  const lineCount = lines.length;

  if (lineCount === 0) {
    return ta(locale, 'keyMomentStable', { name: fromHex.korean || '' });
  }
  if (lineCount === 6) {
    if (fromHex.number === 1 && toHex.number === 2) {
      return ta(locale, 'keyMomentYongJiu');
    }
    if (fromHex.number === 2 && toHex.number === 1) {
      return ta(locale, 'keyMomentYongYuk');
    }
    return ta(locale, 'keyMomentFull', { from: fromHex.korean || '', to: toHex.korean || '' });
  }
  return ta(locale, 'keyMomentPartial', { count: lineCount, from: fromHex.korean || '', to: toHex.korean || '' });
}

/**
 * 종합 괘 분석
 */
export function performComprehensiveHexagramAnalysis(binary: string, locale: Locale = 'ko'): ComprehensiveHexagramAnalysis {
  const 본괘 = getHexagramFromBinary(binary, locale);

  // 한 번만 계산하여 중복 호출 제거
  const trigrams = analyzeTrigramInteraction(binary, locale);
  const hoGwa = analyzeHoGwa(binary, locale);
  const yaoPositions = analyzeYaoPositions(binary, locale);

  return {
    본괘,
    trigrams,
    hoGwa,
    chakGwa: analyzeChakGwa(binary, locale),
    doGwa: analyzeDoGwa(binary, locale),
    sangbanGwa: analyzeSangbanGwa(binary, locale),
    bokGwa: analyzeBokGwa(binary, locale),
    haekGwa: analyzeHaekGwa(binary, locale),
    yaoPositions,
    overallInsight: generateOverallInsightFromData(trigrams, hoGwa, locale),
    actionAdvice: generateActionAdviceFromData(yaoPositions, locale)
  };
}

function generateOverallInsightFromData(trigrams: TrigramAnalysis, hoGwa: HoGwaAnalysis, locale: Locale): string {
  return ta(locale, 'overallInsight', {
    lowerNature: trigrams.하괘.nature, lowerKo: trigrams.하괘.korean,
    upperNature: trigrams.상괘.nature, upperKo: trigrams.상괘.korean,
    hoGwa: hoGwa.호괘.korean || ''
  });
}

function generateOverallInsight(binary: string, locale: Locale): string {
  const trigrams = analyzeTrigramInteraction(binary, locale);
  const hoGwa = analyzeHoGwa(binary, locale);
  return generateOverallInsightFromData(trigrams, hoGwa, locale);
}

function generateActionAdviceFromData(yaoPositions: YaoPositionAnalysis[], locale: Locale): string[] {
  const advice: string[] = [];

  // 5효(군위) 분석
  const fifthYao = yaoPositions[4];
  if (fifthYao.isCorrect && fifthYao.isResonant) {
    advice.push(ta(locale, 'adviceLeader'));
  }

  // 정위/부정위 비율
  const correctCount = yaoPositions.filter(y => y.isCorrect).length;
  if (correctCount >= 4) {
    advice.push(ta(locale, 'adviceStable'));
  } else if (correctCount <= 2) {
    advice.push(ta(locale, 'adviceUnstable'));
  }

  // 상응 관계 분석
  const resonantCount = yaoPositions.filter(y => y.isResonant).length;
  if (resonantCount >= 2) {
    advice.push(ta(locale, 'adviceCooperate'));
  }

  if (advice.length === 0) {
    advice.push(ta(locale, 'adviceDefault'));
  }

  return advice;
}

function generateActionAdvice(binary: string, locale: Locale): string[] {
  return generateActionAdviceFromData(analyzeYaoPositions(binary, locale), locale);
}

/**
 * 두 괘 비교 분석
 */
export function compareHexagrams(binary1: string, binary2: string, locale: Locale = 'ko'): {
  similarity: number;
  relationship: string;
  commonEnergy: string;
  differenceAnalysis: string;
} {
  let matchCount = 0;
  for (let i = 0; i < 6; i++) {
    if (binary1[i] === binary2[i]) {matchCount++;}
  }

  const similarity = (matchCount / 6) * 100;

  let relationship: string;
  if (binary1 === binary2) {
    relationship = ta(locale, 'compareSame');
  } else if (flipBinary(binary1) === binary2) {
    relationship = ta(locale, 'compareSangban');
  } else if (reverseBinary(binary1) === binary2) {
    relationship = ta(locale, 'compareDo');
  } else if (matchCount >= 5) {
    relationship = ta(locale, 'compareSimilar');
  } else if (matchCount <= 1) {
    relationship = ta(locale, 'compareOpposite');
  } else {
    relationship = ta(locale, 'compareGeneral');
  }

  return {
    similarity,
    relationship,
    commonEnergy: ta(locale, 'compareCommon', { count: matchCount, pct: Math.round(similarity) }),
    differenceAnalysis: ta(locale, 'compareDifference', { count: 6 - matchCount })
  };
}
