/**
 * Saju Element Constants
 * 오행 색상 및 매핑 상수
 */

export type ElementEN = 'Wood' | 'Fire' | 'Earth' | 'Metal' | 'Water';

// 오행 색상 클래스 (Tailwind)
export const ELEMENT_COLOR_CLASSES: Record<ElementEN, string> = {
  Wood: 'bg-emerald-500',
  Fire: 'bg-red-400',
  Earth: 'bg-amber-500',
  Metal: 'bg-blue-500',
  Water: 'bg-indigo-500',
};

// 오행 바 색상 (차트용)
export const ELEMENT_BAR_COLORS: Record<ElementEN, string> = {
  Wood: 'bg-emerald-500',
  Fire: 'bg-red-400',
  Earth: 'bg-amber-500',
  Metal: 'bg-blue-500',
  Water: 'bg-indigo-500',
};

// 천간 오행 매핑
export const STEM_ELEMENT: Record<string, ElementEN> = {
  // 한글
  갑: 'Wood', 을: 'Wood',
  병: 'Fire', 정: 'Fire',
  무: 'Earth', 기: 'Earth',
  경: 'Metal', 신: 'Metal',
  임: 'Water', 계: 'Water',
  // 한자
  甲: 'Wood', 乙: 'Wood',
  丙: 'Fire', 丁: 'Fire',
  戊: 'Earth', 己: 'Earth',
  庚: 'Metal', 辛: 'Metal',
  壬: 'Water', 癸: 'Water',
};

// 지지 오행 매핑
export const BRANCH_ELEMENT: Record<string, ElementEN> = {
  // 한글
  자: 'Water', 축: 'Earth', 인: 'Wood', 묘: 'Wood',
  진: 'Earth', 사: 'Fire', 오: 'Fire', 미: 'Earth',
  신: 'Metal', 유: 'Metal', 술: 'Earth', 해: 'Water',
  // 한자
  子: 'Water', 丑: 'Earth', 寅: 'Wood', 卯: 'Wood',
  辰: 'Earth', 巳: 'Fire', 午: 'Fire', 未: 'Earth',
  申: 'Metal', 酉: 'Metal', 戌: 'Earth', 亥: 'Water',
};

/**
 * 천간/지지 글자에서 오행 추출
 */
export function getElementOfChar(ch: string): ElementEN | null {
  if (STEM_ELEMENT[ch]) {return STEM_ELEMENT[ch];}
  if (BRANCH_ELEMENT[ch]) {return BRANCH_ELEMENT[ch];}
  return null;
}
