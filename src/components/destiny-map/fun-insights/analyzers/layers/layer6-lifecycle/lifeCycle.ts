// Layer 6: Life Cycle Analysis
// Analyzes the fusion between Twelve Stage (lifecycle stage) and Astrological House

import { TWELVE_STAGE_HOUSE_MATRIX, TWELVE_STAGE_INFO } from '@/lib/destiny-matrix/data/layer6-stage-house';
import type { TwelveStageStandard } from '@/lib/Saju/types';
import type { HouseNumber } from '@/lib/destiny-matrix/types';
import { getHouseLifeArea } from '../../utils';

/**
 * Gets a description of the fusion between a lifecycle stage and astrological house
 * @param stage - The Twelve Stage from Saju (lifecycle stage)
 * @param house - The astrological house number (1-12)
 * @param lang - Language code ('ko' or 'en')
 * @returns Formatted description string or null if no interaction found
 */
export function getLifeCycleDescription(
  stage: TwelveStageStandard,
  house: HouseNumber,
  lang: string
): string | null {
  const isKo = lang === 'ko';
  const interaction = TWELVE_STAGE_HOUSE_MATRIX[stage]?.[house];
  const stageInfo = TWELVE_STAGE_INFO[stage];
  if (!interaction || !stageInfo) {return null;}

  const lifeArea = getHouseLifeArea(house, isKo);

  return isKo
    ? `${stage}(${stageInfo.ko.split(' - ')[1] || ''}) × ${house}하우스(${lifeArea}) = ${interaction.keyword} ${interaction.icon}`
    : `${stage}(${stageInfo.en.split(' - ')[1] || ''}) × House ${house}(${lifeArea}) = ${interaction.keywordEn} ${interaction.icon}`;
}
