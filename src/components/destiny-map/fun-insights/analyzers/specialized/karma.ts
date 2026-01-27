/**
 * Karma Matrix Analysis
 * Specialized karma and soul pattern analysis combining Saju and Astrology data
 */

import { logger } from '@/lib/logger';
import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { ELEMENT_CORE_GRID, SIGN_TO_ELEMENT } from '@/lib/destiny-matrix/data/layer1-element-core';
import { RELATION_ASPECT_MATRIX } from '@/lib/destiny-matrix/data/layer5-relation-aspect';
import { ADVANCED_ANALYSIS_MATRIX } from '@/lib/destiny-matrix/data/layer7-advanced-analysis';
import { SHINSAL_PLANET_MATRIX } from '@/lib/destiny-matrix/data/layer8-shinsal-planet';
import type { WesternElement, ProgressionType, ShinsalKind } from '@/lib/destiny-matrix/types';
import type { FiveElement } from '@/lib/Saju/types';
import type { SajuData, AstroData } from '../../types';
import type { KarmaMatrixResult, ExtendedSajuData } from '../types/specialized.types';
import { KARMA_SHINSALS } from '../shared/constants';
import { extractShinsals } from '../shared/shinsalFilter';

// Helper functions
function mapSajuElementToKo(el: string): FiveElement {
  const map: Record<string, FiveElement> = {
    wood: '목',
    fire: '화',
    earth: '토',
    metal: '금',
    water: '수',
  };
  return map[el] || '토';
}

function getWestElementFromSign(sign: string): WesternElement {
  const normalized = sign?.charAt(0).toUpperCase() + sign?.slice(1).toLowerCase();
  return SIGN_TO_ELEMENT[normalized] || 'earth';
}

/**
 * Analyze karmic patterns using destiny matrix
 * Combines Saju soul patterns with astrological karmic indicators
 */
export function getKarmaMatrixAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): KarmaMatrixResult | null {
  const isKo = lang === 'ko';
  if (!saju && !astro) {return null;}

  const extSaju = saju as ExtendedSajuData | undefined;
  const dayElement = saju?.dayMaster?.element || 'wood';
  const sajuEl = mapSajuElementToKo(dayElement);

  // 1. 영혼 패턴 (L7 - 격국 × Draconic)
  let soulPattern: KarmaMatrixResult['soulPattern'] = null;
  const geokguk = extSaju?.advancedAnalysis?.geokguk?.name;
  if (geokguk) {
    const progressions: ProgressionType[] = ['secondary', 'draconic'];
    const prog = progressions[0];
    const geokData = ADVANCED_ANALYSIS_MATRIX[geokguk as keyof typeof ADVANCED_ANALYSIS_MATRIX];
    if (geokData && geokData[prog]) {
      const interaction = geokData[prog];
      soulPattern = {
        geokguk,
        progression: prog,
        fusion: {
          level: interaction.level,
          score: interaction.score,
          icon: interaction.icon,
          color: getInteractionColor(interaction.level),
          keyword: { ko: interaction.keyword, en: interaction.keywordEn },
          description: { ko: interaction.keyword, en: interaction.keywordEn },
        },
        soulTheme: {
          ko: `${geokguk} 격국의 영혼 패턴`,
          en: `Soul pattern of ${geokguk}`,
        },
      };
    }
  }

  // 2. 노드 축 분석
  let nodeAxis: KarmaMatrixResult['nodeAxis'] = null;
  if (astro?.planets && Array.isArray(astro.planets)) {
    const northNode = astro.planets.find(p => p.name?.toLowerCase() === 'north node' || p.name?.toLowerCase() === 'northnode');
    const southNode = astro.planets.find(p => p.name?.toLowerCase() === 'south node' || p.name?.toLowerCase() === 'southnode');

    if (northNode?.sign && southNode?.sign) {
      const northEl = getWestElementFromSign(northNode.sign);
      const southEl = getWestElementFromSign(southNode.sign);
      const northSajuEl = mapSajuElementToKo(northEl);
      const southSajuEl = mapSajuElementToKo(southEl);

      const northInteraction = ELEMENT_CORE_GRID[sajuEl]?.[northEl];
      const southInteraction = ELEMENT_CORE_GRID[sajuEl]?.[southEl];

      if (northInteraction && southInteraction) {
        nodeAxis = {
          northNode: {
            element: northSajuEl,
            fusion: {
              level: northInteraction.level,
              score: northInteraction.score,
              icon: northInteraction.icon,
              color: getInteractionColor(northInteraction.level),
              keyword: { ko: northInteraction.keyword, en: northInteraction.keywordEn },
              description: { ko: northInteraction.keyword, en: northInteraction.keywordEn },
            },
            direction: {
              ko: `${northSajuEl} 에너지로 나아가세요`,
              en: `Move toward ${northSajuEl} energy`,
            },
            lesson: {
              ko: '이생의 과제와 성장 방향',
              en: 'Life lessons and growth direction',
            },
          },
          southNode: {
            element: southSajuEl,
            fusion: {
              level: southInteraction.level,
              score: southInteraction.score,
              icon: southInteraction.icon,
              color: getInteractionColor(southInteraction.level),
              keyword: { ko: southInteraction.keyword, en: southInteraction.keywordEn },
              description: { ko: southInteraction.keyword, en: southInteraction.keywordEn },
            },
            pastPattern: {
              ko: `${southSajuEl} 에너지의 과거 패턴`,
              en: `Past patterns of ${southSajuEl} energy`,
            },
            release: {
              ko: '놓아야 할 과거의 습관',
              en: 'Past habits to release',
            },
          },
        };
      }
    }
  }

  // 3. 카르마 관계 (L5)
  const karmicRelations: KarmaMatrixResult['karmicRelations'] = [];
  const karmicBranchRelations = ['원진', 'chung', 'hyeong'] as const;
  for (const relation of karmicBranchRelations) {
    const relationData = RELATION_ASPECT_MATRIX[relation as keyof typeof RELATION_ASPECT_MATRIX];
    if (relationData && relationData.conjunction) {
      const interaction = relationData.conjunction;
      karmicRelations.push({
        relation,
        aspect: 'conjunction',
        fusion: {
          level: interaction.level,
          score: interaction.score,
          icon: interaction.icon,
          color: getInteractionColor(interaction.level),
          keyword: { ko: interaction.keyword, en: interaction.keywordEn },
          description: { ko: interaction.keyword, en: interaction.keywordEn },
        },
        meaning: {
          ko: `${relation} 관계의 카르마적 의미`,
          en: `Karmic meaning of ${relation}`,
        },
      });
    }
  }

  // 4. 전생 힌트 (L8 - 카르마 신살)
  const pastLifeHints: KarmaMatrixResult['pastLifeHints'] = [];
  const shinsalList = extractShinsals(extSaju, KARMA_SHINSALS);

  for (const shinsal of shinsalList.slice(0, 3)) {
    const plutoData = SHINSAL_PLANET_MATRIX[shinsal as ShinsalKind]?.['Pluto'];
    if (plutoData) {
      pastLifeHints.push({
        shinsal,
        planet: 'Pluto',
        fusion: {
          level: plutoData.level,
          score: plutoData.score,
          icon: plutoData.icon,
          color: getInteractionColor(plutoData.level),
          keyword: { ko: plutoData.keyword, en: plutoData.keywordEn },
          description: { ko: plutoData.keyword, en: plutoData.keywordEn },
        },
        hint: {
          ko: `${shinsal}이 전생의 흔적을 보여줍니다`,
          en: `${shinsal} reveals past life traces`,
        },
      });
    }
  }

  // 종합 점수
  const soulScore = soulPattern ? soulPattern.fusion.score : 0;
  const nodeScore = nodeAxis ? (nodeAxis.northNode.fusion.score + nodeAxis.southNode.fusion.score) / 2 : 0;
  const relationScore = karmicRelations.length > 0 ? karmicRelations.reduce((sum, r) => sum + r.fusion.score, 0) / karmicRelations.length : 0;
  const karmaScore = Math.round((soulScore + nodeScore + relationScore) / 3);

  return {
    karmaScore,
    soulPattern,
    nodeAxis,
    karmicRelations,
    pastLifeHints,
  };
}
