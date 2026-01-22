/**
 * Layer 2: Sibsin-Planet Fusion Analysis
 * 십신-행성 융합 분석
 */

import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { SIBSIN_PLANET_MATRIX, PLANET_KEYWORDS, SIBSIN_KEYWORDS } from '@/lib/destiny-matrix/data/layer2-sibsin-planet';
import type { PlanetName } from '@/lib/destiny-matrix/types';
import type { SibsinKind } from '@/lib/Saju/types';
import type { SajuData } from '../../types';
import type { SibsinPlanetResult } from './types';

interface ExtendedSajuData extends SajuData {
  sibsin?: {
    year?: SibsinKind;
    month?: SibsinKind;
    day?: SibsinKind;
    hour?: SibsinKind;
  };
}

/**
 * 십신-행성 융합 분석
 */
export function analyzeSibsinPlanetFusion(
  saju: SajuData | undefined
): SibsinPlanetResult[] {
  const sibsinPlanetFusions: SibsinPlanetResult[] = [];

  if (!saju) return sibsinPlanetFusions;

  const extSaju = saju as ExtendedSajuData;
  const sibsinList = extSaju?.sibsin || {};

  const planets: Array<{ name: PlanetName; signKey: string }> = [
    { name: 'Sun', signKey: 'sun' },
    { name: 'Moon', signKey: 'moon' },
    { name: 'Mercury', signKey: 'mercury' },
    { name: 'Venus', signKey: 'venus' },
    { name: 'Mars', signKey: 'mars' },
    { name: 'Jupiter', signKey: 'jupiter' },
    { name: 'Saturn', signKey: 'saturn' },
  ];

  // 주요 십신 3개 선택
  const mainSibsin: SibsinKind[] = [];
  if (sibsinList.year) mainSibsin.push(sibsinList.year);
  if (sibsinList.month) mainSibsin.push(sibsinList.month);
  if (sibsinList.hour) mainSibsin.push(sibsinList.hour);

  for (const sibsin of mainSibsin.slice(0, 3)) {
    for (const planet of planets.slice(0, 4)) {
      const interaction = SIBSIN_PLANET_MATRIX[sibsin]?.[planet.name];
      if (interaction && (interaction.level === 'extreme' || interaction.level === 'amplify' || interaction.level === 'conflict')) {
        const planetKw = PLANET_KEYWORDS[planet.name];
        const sibsinKw = SIBSIN_KEYWORDS[sibsin];
        sibsinPlanetFusions.push({
          sibsin,
          planet: planet.name,
          fusion: {
            level: interaction.level,
            score: interaction.score,
            icon: interaction.icon,
            color: getInteractionColor(interaction.level),
            keyword: { ko: interaction.keyword, en: interaction.keywordEn },
            description: {
              ko: `${sibsin} × ${planet.name} = ${interaction.keyword}`,
              en: `${sibsin} × ${planet.name} = ${interaction.keywordEn}`,
            },
          },
          planetKeyword: planetKw,
          sibsinKeyword: sibsinKw,
        });
      }
    }
  }

  return sibsinPlanetFusions;
}

/**
 * 개별 십신-행성 융합 설명 조회
 */
export function getSibsinPlanetDescription(
  sibsin: SibsinKind,
  planet: PlanetName,
  lang: string
): string | null {
  const isKo = lang === 'ko';
  const interaction = SIBSIN_PLANET_MATRIX[sibsin]?.[planet];
  if (!interaction) return null;

  const sibsinKw = SIBSIN_KEYWORDS[sibsin];
  const planetKw = PLANET_KEYWORDS[planet];

  return isKo
    ? `${sibsin}(${sibsinKw.ko}) × ${planet}(${planetKw.ko}) = ${interaction.keyword} ${interaction.icon}`
    : `${sibsin}(${sibsinKw.en}) × ${planet}(${planetKw.en}) = ${interaction.keywordEn} ${interaction.icon}`;
}
