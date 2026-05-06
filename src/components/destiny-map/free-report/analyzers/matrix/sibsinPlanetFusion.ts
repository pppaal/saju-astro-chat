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
 * Analyzes the fusion between Saju Sibsin (十神) and Western planets
 *
 * This function examines how the Ten Gods (Sibsin) from a person's Saju interact
 * with major Western astrological planets. It identifies significant interactions
 * (extreme synergies, amplifications, or conflicts) between the Sibsin in the year,
 * month, and hour pillars and the first four major planets.
 *
 * @param saju - Saju birth data containing Sibsin information for each pillar
 * @returns Array of Sibsin-Planet fusion results with interaction details and keywords
 *
 * @example
 * ```typescript
 * const fusions = analyzeSibsinPlanetFusion(sajuData);
 * // Returns: [{ sibsin: '비견', planet: 'Sun', fusion: {...}, planetKeyword: {...} }]
 * ```
 */
export function analyzeSibsinPlanetFusion(
  saju: SajuData | undefined
): SibsinPlanetResult[] {
  const sibsinPlanetFusions: SibsinPlanetResult[] = [];

  if (!saju) {return sibsinPlanetFusions;}

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
  if (sibsinList.year) {mainSibsin.push(sibsinList.year);}
  if (sibsinList.month) {mainSibsin.push(sibsinList.month);}
  if (sibsinList.hour) {mainSibsin.push(sibsinList.hour);}

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
 * Retrieves a formatted description for a specific Sibsin-Planet combination
 *
 * This function looks up the interaction data between a specific Sibsin (Ten God)
 * and a Western planet, returning a formatted string with keywords and symbols
 * in the requested language.
 *
 * @param sibsin - The Sibsin (Ten God) from Saju (e.g., '비견', '정관')
 * @param planet - The Western planet name (e.g., 'Sun', 'Moon', 'Venus')
 * @param lang - Language code ('ko' for Korean, 'en' for English)
 * @returns Formatted description string with keywords and icon, or null if no interaction found
 *
 * @example
 * ```typescript
 * const desc = getSibsinPlanetDescription('비견', 'Sun', 'ko');
 * // Returns: "비견(나를 돕는 자) × Sun(자아) = 자기확장 ⭐"
 * ```
 */
export function getSibsinPlanetDescription(
  sibsin: SibsinKind,
  planet: PlanetName,
  lang: string
): string | null {
  const isKo = lang === 'ko';
  const interaction = SIBSIN_PLANET_MATRIX[sibsin]?.[planet];
  if (!interaction) {return null;}

  const sibsinKw = SIBSIN_KEYWORDS[sibsin];
  const planetKw = PLANET_KEYWORDS[planet];

  return isKo
    ? `${sibsin}(${sibsinKw.ko}) × ${planet}(${planetKw.ko}) = ${interaction.keyword} ${interaction.icon}`
    : `${sibsin}(${sibsinKw.en}) × ${planet}(${planetKw.en}) = ${interaction.keywordEn} ${interaction.icon}`;
}
