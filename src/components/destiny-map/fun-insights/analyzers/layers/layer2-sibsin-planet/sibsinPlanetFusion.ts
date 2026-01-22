// Layer 2: Sibsin-Planet Fusion Analysis
// Analyzes the fusion between Saju Sibsin (12 earthly branches) and Planets

import { SIBSIN_PLANET_MATRIX, PLANET_KEYWORDS, SIBSIN_KEYWORDS } from '@/lib/destiny-matrix/data/layer2-sibsin-planet';
import type { SibsinKind } from '@/lib/Saju/types';
import type { PlanetName } from '@/lib/destiny-matrix/types';

/**
 * Gets a description of the fusion between Sibsin and Planet
 * @param sibsin - The Sibsin (earthly branch) from Saju
 * @param planet - The planet name
 * @param lang - Language code ('ko' or 'en')
 * @returns Formatted description string or null if no interaction found
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
