/**
 * Layer 8: Shinsal-Planet Analysis
 * 신살-행성 분석
 */

import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { SHINSAL_PLANET_MATRIX, SHINSAL_INFO } from '@/lib/destiny-matrix/data/layer8-shinsal-planet';
import type { ShinsalKind, PlanetName } from '@/lib/destiny-matrix/types';
import type { SajuData } from '../../types';
import type { ShinsalPlanetResult } from './types';

interface ExtendedSajuData extends SajuData {
  shinsal?: Array<{ name?: string; shinsal?: string } | string> | Record<string, unknown>;
  sinsal?: {
    luckyList?: Array<{ name?: string } | string>;
    unluckyList?: Array<{ name?: string } | string>;
    twelveAll?: Array<{ name?: string }>;
  };
}

/**
 * Extract shinsals from saju data
 */
function extractShinsals(saju: SajuData | undefined, targetShinsals?: ShinsalKind[]): ShinsalKind[] {
  if (!saju) return [];

  const extSaju = saju as ExtendedSajuData;
  const shinsalList = extSaju?.shinsal || extSaju?.sinsal || [];
  const userShinsals: ShinsalKind[] = [];

  // 사주에서 신살 추출 (배열 또는 객체 형태 처리)
  if (Array.isArray(shinsalList)) {
    for (const s of shinsalList) {
      const name = typeof s === 'string' ? s : (s as { name?: string; shinsal?: string })?.name || (s as { shinsal?: string })?.shinsal;
      if (name) {
        if (!targetShinsals || targetShinsals.includes(name as ShinsalKind)) {
          userShinsals.push(name as ShinsalKind);
        }
      }
    }
  } else if (typeof shinsalList === 'object' && shinsalList !== null) {
    for (const key of Object.keys(shinsalList as Record<string, unknown>)) {
      const val = (shinsalList as Record<string, unknown>)[key];
      if (Array.isArray(val)) {
        for (const v of val) {
          const name = typeof v === 'string' ? v : (v as { name?: string })?.name;
          if (name) {
            if (!targetShinsals || targetShinsals.includes(name as ShinsalKind)) {
              userShinsals.push(name as ShinsalKind);
            }
          }
        }
      }
    }
  }

  return userShinsals;
}

/**
 * 신살-행성 융합 분석
 */
export function analyzeShinsalPlanet(
  saju: SajuData | undefined,
  targetShinsals?: ShinsalKind[],
  targetPlanets?: PlanetName[]
): ShinsalPlanetResult[] {
  const shinsalPlanetResults: ShinsalPlanetResult[] = [];

  if (!saju) return shinsalPlanetResults;

  const userShinsals = extractShinsals(saju, targetShinsals);
  const planets = targetPlanets || ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'] as PlanetName[];

  // 신살-행성 매트릭스 분석
  for (const shinsal of userShinsals) {
    for (const planet of planets) {
      const interaction = SHINSAL_PLANET_MATRIX[shinsal]?.[planet];
      const info = SHINSAL_INFO[shinsal];
      if (interaction && info) {
        shinsalPlanetResults.push({
          shinsal,
          shinsalInfo: { ko: info.ko, en: info.en, effect: info.effect, effectEn: info.effectEn },
          planet,
          fusion: {
            level: interaction.level,
            score: interaction.score,
            icon: interaction.icon,
            color: getInteractionColor(interaction.level),
            keyword: { ko: interaction.keyword, en: interaction.keywordEn },
            description: {
              ko: `${shinsal} × ${planet} = ${interaction.keyword}`,
              en: `${shinsal} × ${planet} = ${interaction.keywordEn}`,
            },
          },
          category: info.category,
        });
      }
    }
  }

  return shinsalPlanetResults;
}
