/**
 * SajuResultDisplay Utils
 * 사주 결과 표시를 위한 유틸리티 함수
 */

import type { ElementEN, GanjiValue } from './SajuResultDisplay.types';

// ===== 오행 색상 매핑 =====

export const elementColorClasses: Record<ElementEN, string> = {
  Wood: 'bg-emerald-500',
  Fire: 'bg-red-400',
  Earth: 'bg-amber-500',
  Metal: 'bg-blue-500',
  Water: 'bg-indigo-500',
};

export const elementBarColors: Record<ElementEN, string> = {
  Wood: 'bg-emerald-500',
  Fire: 'bg-red-400',
  Earth: 'bg-amber-500',
  Metal: 'bg-blue-500',
  Water: 'bg-indigo-500',
};

// ===== 천간/지지 오행 매핑 =====

const stemElement: Record<string, ElementEN> = {
  갑: 'Wood',
  을: 'Wood',
  병: 'Fire',
  정: 'Fire',
  무: 'Earth',
  기: 'Earth',
  경: 'Metal',
  신: 'Metal',
  임: 'Water',
  계: 'Water',
  甲: 'Wood',
  乙: 'Wood',
  丙: 'Fire',
  丁: 'Fire',
  戊: 'Earth',
  己: 'Earth',
  庚: 'Metal',
  辛: 'Metal',
  壬: 'Water',
  癸: 'Water',
};

const branchElement: Record<string, ElementEN> = {
  자: 'Water',
  축: 'Earth',
  인: 'Wood',
  묘: 'Wood',
  진: 'Earth',
  사: 'Fire',
  오: 'Fire',
  미: 'Earth',
  신: 'Metal',
  유: 'Metal',
  술: 'Earth',
  해: 'Water',
  子: 'Water',
  丑: 'Earth',
  寅: 'Wood',
  卯: 'Wood',
  辰: 'Earth',
  巳: 'Fire',
  午: 'Fire',
  未: 'Earth',
  申: 'Metal',
  酉: 'Metal',
  戌: 'Earth',
  亥: 'Water',
};

// ===== 유틸리티 함수 =====

/**
 * 천간/지지 값에서 이름 추출
 * string | { name: string } 처리
 */
export function getGanjiName(val: GanjiValue): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object' && 'name' in val) return val.name;
  return '';
}

/**
 * 글자의 오행 조회
 */
export function getElementOfChar(ch: string): ElementEN | null {
  if (stemElement[ch]) return stemElement[ch];
  if (branchElement[ch]) return branchElement[ch];
  return null;
}

/**
 * 오행별 색상 클래스 조회
 */
export function getElementColorClass(element: ElementEN): string {
  return elementColorClasses[element] || 'bg-gray-500';
}

/**
 * 오행별 바 색상 클래스 조회
 */
export function getElementBarColor(element: ElementEN): string {
  return elementBarColors[element] || 'bg-gray-500';
}

/**
 * 문자열 배열을 쉼표로 연결
 */
export function joinArray(arr?: string[]): string {
  if (!arr || arr.length === 0) return '-';
  return arr.join(', ');
}

/**
 * 점수를 등급으로 변환
 */
export function scoreToGrade(score?: number): string {
  if (!score) return '-';
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

/**
 * 숫자를 퍼센트 문자열로 변환
 */
export function toPercentString(value?: number): string {
  if (value === undefined || value === null) return '-';
  return `${Math.round(value)}%`;
}