/**
 * sibsin.ts - 십신 계산
 */

import type { FiveElement } from './types';
import { STEMS } from './constants/stemData';

const SIBSIN_NAMES = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'] as const;

export function calculateSibsin(dayStem: string, targetStem: string): string {
  const dayInfo = STEMS[dayStem];
  const targetInfo = STEMS[targetStem];

  if (!dayInfo || !targetInfo) { return '비견'; }

  const elements: FiveElement[] = ['목', '화', '토', '금', '수'];
  const dayIdx = elements.indexOf(dayInfo.element);
  const targetIdx = elements.indexOf(targetInfo.element);
  const samePolarity = dayInfo.yinYang === targetInfo.yinYang;

  const diff = (targetIdx - dayIdx + 5) % 5;
  const baseIndex = diff * 2;
  const sibsinIndex = samePolarity ? baseIndex : (baseIndex + 1) % 10;

  return SIBSIN_NAMES[sibsinIndex];
}
