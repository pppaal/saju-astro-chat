/**
 * Layer 3: Sibsin-House Fusion Analysis
 * 십신-하우스 융합 분석
 */

import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { SIBSIN_HOUSE_MATRIX, HOUSE_KEYWORDS } from '@/lib/destiny-matrix/data/layer3-sibsin-house';
import { SIBSIN_KEYWORDS } from '@/lib/destiny-matrix/data/layer2-sibsin-planet';
import type { HouseNumber } from '@/lib/destiny-matrix/types';
import type { SibsinKind } from '@/lib/Saju/types';
import type { SajuData } from '../../types';
import type { SibsinHouseResult } from './types';

interface ExtendedSajuData extends SajuData {
  sibsin?: {
    year?: SibsinKind;
    month?: SibsinKind;
    day?: SibsinKind;
    hour?: SibsinKind;
  };
}

/**
 * 십신-하우스 융합 분석
 */
export function analyzeSibsinHouseFusion(
  saju: SajuData | undefined,
  targetHouses?: HouseNumber[]
): SibsinHouseResult[] {
  const sibsinHouseFusions: SibsinHouseResult[] = [];

  if (!saju) return sibsinHouseFusions;

  const extSaju = saju as ExtendedSajuData;
  const sibsinList = extSaju?.sibsin || {};

  // 모든 십신 수집
  const allSibsin: SibsinKind[] = [];
  if (sibsinList.year) allSibsin.push(sibsinList.year);
  if (sibsinList.month) allSibsin.push(sibsinList.month);
  if (sibsinList.day) allSibsin.push(sibsinList.day);
  if (sibsinList.hour) allSibsin.push(sibsinList.hour);

  // 분석 대상 하우스 (기본값: 전체)
  const houses = targetHouses || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as HouseNumber[];

  // 십신-하우스 매트릭스 분석
  for (const sibsin of allSibsin) {
    for (const house of houses) {
      const interaction = SIBSIN_HOUSE_MATRIX[sibsin]?.[house];
      const sibsinKw = SIBSIN_KEYWORDS[sibsin];
      const houseKw = HOUSE_KEYWORDS[house];

      if (interaction && sibsinKw && houseKw) {
        sibsinHouseFusions.push({
          sibsin,
          sibsinKeyword: sibsinKw,
          house,
          houseKeyword: houseKw,
          fusion: {
            level: interaction.level,
            score: interaction.score,
            icon: interaction.icon,
            color: getInteractionColor(interaction.level),
            keyword: { ko: interaction.keyword, en: interaction.keywordEn },
            description: {
              ko: `${sibsin} × ${house}하우스 = ${interaction.keyword}`,
              en: `${sibsin} × House ${house} = ${interaction.keywordEn}`,
            },
          },
        });
      }
    }
  }

  return sibsinHouseFusions;
}
