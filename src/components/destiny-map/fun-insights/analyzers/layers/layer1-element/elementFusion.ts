// Layer 1: Element Fusion Analysis
// Analyzes the fusion between Saju Five Elements and Western Four Elements

import { ELEMENT_CORE_GRID } from '@/lib/destiny-matrix/data/layer1-element-core';
import type { FiveElement } from '@/lib/Saju/types';
import type { WesternElement } from '@/lib/destiny-matrix/types';
import { getLevelDescription } from '../../utils';

/**
 * Gets a description of the fusion between Saju and Western elements
 * @param sajuElement - The Five Element from Saju (木/火/土/金/水)
 * @param westElement - The Western element (fire/earth/air/water)
 * @param lang - Language code ('ko' or 'en')
 * @returns Formatted description string or null if no interaction found
 */
export function getElementFusionDescription(
  sajuElement: FiveElement,
  westElement: WesternElement,
  lang: string
): string | null {
  const isKo = lang === 'ko';
  const interaction = ELEMENT_CORE_GRID[sajuElement]?.[westElement];
  if (!interaction) {return null;}

  const levelDesc = getLevelDescription(interaction.level, isKo);
  return isKo
    ? `${sajuElement}(사주) × ${westElement}(서양) = ${interaction.keyword} (${levelDesc}, 점수: ${interaction.score}/10)`
    : `${sajuElement}(Saju) × ${westElement}(Western) = ${interaction.keywordEn} (${levelDesc}, Score: ${interaction.score}/10)`;
}
