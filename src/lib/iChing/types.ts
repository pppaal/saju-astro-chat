// Enhanced I Ching Types with Modern Interpretations

export interface Hexagram {
  number: number;
  binary: string;
  name: string;
  symbol: string;
  judgment: string;
  image: string;
  lines: string[];

  // Enhanced fields for better UX
  enhanced?: EnhancedHexagramData;
}

export interface EnhancedHexagramData {
  // 1. Visual Imagery
  visualImagery: {
    scene: string; // 장면 묘사 (예: "높은 산 위에 맑은 물이 흐른다")
    symbolism: string; // 상징 설명
    colors: string[]; // 연관 색상
    emoji: string; // 대표 이모지
  };

  // 2. Quick Summary
  quickSummary: {
    oneLiner: string; // 한 줄 요약 (예: "아직 때가 아니니 배우고 기다려라")
    keywords: string[]; // 핵심 키워드 (예: ["학습", "인내", "준비"])
    essence: string; // 핵심 메시지 (쉬운 말로)
  };

  // 3. Actionable Advice
  actionableAdvice: {
    dos: string[]; // 해야 할 것들
    donts: string[]; // 하지 말아야 할 것들
    timing: string; // 타이밍 조언
    nextSteps: string[]; // 다음 단계 행동
  };

  // 4. Situation Templates
  situationTemplates: {
    career: SituationAdvice;
    love: SituationAdvice;
    health: SituationAdvice;
    wealth: SituationAdvice;
    decision: SituationAdvice;
    timing: SituationAdvice;
  };

  // 5. Plain Language Explanation
  plainLanguage: {
    traditionalText: string; // 기존 한자/전통 표현
    modernExplanation: string; // 현대적 풀어쓰기
    realLifeExample: string; // 실생활 예시
    metaphor: string; // 비유적 설명
  };

  // Additional helpful data
  relatedConcepts: string[]; // 관련 개념
  difficulty: 'easy' | 'medium' | 'hard'; // 이해 난이도
  favorability: number; // 길흉 점수 (-10 ~ +10)
}

export interface SituationAdvice {
  question: string; // 질문 예시
  advice: string; // 구체적 조언
  warning?: string; // 주의사항
  timeline?: string; // 예상 타임라인
  actionItems: string[]; // 실천 항목
}

// Korean-specific enhanced data
export interface EnhancedHexagramDataKo extends EnhancedHexagramData {
  hanja: {
    name: string; // 한자 이름 (예: "山水蒙")
    meaning: string; // 한자 의미 풀이
  };
  traditional: {
    judgment: string; // 단사(彖辭)
    image: string; // 상사(象辭)
    lines: string[]; // 효사(爻辭)
  };
}

// Hexagram with full enhancement
export interface FullHexagram extends Hexagram {
  enhanced: EnhancedHexagramData;
  enhancedKo?: EnhancedHexagramDataKo;
}

// ============================================================
// Shared Constants - 64괘 공통 데이터 (중복 방지)
// ============================================================

/**
 * 64괘 binary 매핑 (번호 → binary)
 * binary[0]=6효(상), binary[5]=1효(하)
 */
export const HEXAGRAM_BINARY_MAP: Record<number, string> = {
  1: '111111', 2: '000000', 3: '010001', 4: '100010', 5: '010111',
  6: '111010', 7: '000010', 8: '010000', 9: '110111', 10: '111011',
  11: '000111', 12: '111000', 13: '111101', 14: '101111', 15: '000100',
  16: '001000', 17: '011001', 18: '100110', 19: '000011', 20: '110000',
  21: '101001', 22: '100101', 23: '100000', 24: '000001', 25: '111001',
  26: '100111', 27: '100001', 28: '011110', 29: '010010', 30: '101101',
  31: '011100', 32: '001110', 33: '111100', 34: '001111', 35: '101000',
  36: '000101', 37: '110101', 38: '101011', 39: '010100', 40: '001010',
  41: '100011', 42: '110001', 43: '011111', 44: '111110', 45: '011000',
  46: '000110', 47: '011010', 48: '010110', 49: '011101', 50: '101110',
  51: '001001', 52: '100100', 53: '110100', 54: '001011', 55: '001101',
  56: '101100', 57: '110110', 58: '011011', 59: '110010', 60: '010011',
  61: '110011', 62: '001100', 63: '010101', 64: '101010'
};

/**
 * 64괘 한글 이름 매핑
 */
export const HEXAGRAM_NAMES_KO: Record<number, string> = {
  1: '건', 2: '곤', 3: '둔', 4: '몽', 5: '수', 6: '송', 7: '사', 8: '비',
  9: '소축', 10: '리', 11: '태', 12: '비', 13: '동인', 14: '대유', 15: '겸', 16: '예',
  17: '수', 18: '고', 19: '임', 20: '관', 21: '서합', 22: '비', 23: '박', 24: '복',
  25: '무망', 26: '대축', 27: '이', 28: '대과', 29: '감', 30: '리', 31: '함', 32: '항',
  33: '둔', 34: '대장', 35: '진', 36: '명이', 37: '가인', 38: '규', 39: '건', 40: '해',
  41: '손', 42: '익', 43: '쾌', 44: '구', 45: '췌', 46: '승', 47: '곤', 48: '정',
  49: '혁', 50: '정', 51: '진', 52: '간', 53: '점', 54: '귀매', 55: '풍', 56: '려',
  57: '손', 58: '태', 59: '환', 60: '절', 61: '중부', 62: '소과', 63: '기제', 64: '미제'
};

/**
 * Binary → 괘 번호 역방향 룩업 맵 (O(1) 검색)
 */
export const BINARY_TO_HEXAGRAM_MAP: Record<string, number> = Object.fromEntries(
  Object.entries(HEXAGRAM_BINARY_MAP).map(([num, bin]) => [bin, parseInt(num)])
);

/**
 * Binary에서 괘 번호 찾기
 */
export function findHexagramNumberByBinary(binary: string): number | null {
  return BINARY_TO_HEXAGRAM_MAP[binary] ?? null;
}

/**
 * 괘 번호에서 Binary 가져오기
 */
export function getHexagramBinary(hexagramNumber: number): string | null {
  return HEXAGRAM_BINARY_MAP[hexagramNumber] || null;
}

/**
 * 괘 번호에서 한글 이름 가져오기
 */
export function getHexagramNameKo(hexagramNumber: number): string {
  return HEXAGRAM_NAMES_KO[hexagramNumber] || `제${hexagramNumber}괘`;
}