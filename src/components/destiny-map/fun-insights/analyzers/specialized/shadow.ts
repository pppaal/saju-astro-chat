/**
 * Shadow Personality Analysis
 * Specialized shadow and hidden self analysis combining Saju and Astrology data
 */

import { logger } from '@/lib/logger';
import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { ELEMENT_CORE_GRID, SIGN_TO_ELEMENT } from '@/lib/destiny-matrix/data/layer1-element-core';
import { RELATION_ASPECT_MATRIX } from '@/lib/destiny-matrix/data/layer5-relation-aspect';
import { SHINSAL_PLANET_MATRIX } from '@/lib/destiny-matrix/data/layer8-shinsal-planet';
import type { WesternElement, ShinsalKind } from '@/lib/destiny-matrix/types';
import type { FiveElement } from '@/lib/Saju/types';
import type { SajuData, AstroData } from '../../types';
import type { ShadowPersonalityResult, ExtendedSajuData } from '../types/specialized.types';
import { SHADOW_SHINSALS } from '../shared/constants';
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
 * Analyze shadow personality using destiny matrix
 * Combines Saju shadow patterns with astrological shadow indicators
 */
export function getShadowPersonalityAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): ShadowPersonalityResult | null {
  const isKo = lang === 'ko';
  if (!saju && !astro) {return null;}

  const extSaju = saju as ExtendedSajuData | undefined;
  const dayElement = saju?.dayMaster?.element || 'wood';
  const sajuEl = mapSajuElementToKo(dayElement);

  // 1. 신살 그림자 (L8)
  const shinsalShadows: ShadowPersonalityResult['shinsalShadows'] = [];
  const shinsalList = extractShinsals(extSaju, SHADOW_SHINSALS);

  for (const shinsal of shinsalList.slice(0, 3)) {
    const plutoData = SHINSAL_PLANET_MATRIX[shinsal as ShinsalKind]?.['Pluto'];
    if (plutoData) {
      shinsalShadows.push({
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
        shadowTrait: {
          ko: `${shinsal}의 그림자 특성`,
          en: `Shadow trait of ${shinsal}`,
        },
        integration: {
          ko: '이 그림자를 인식하고 통합하세요',
          en: 'Recognize and integrate this shadow',
        },
      });
    }
  }

  // 2. 키론 상처 (L10)
  let chironWound: ShadowPersonalityResult['chironWound'] = null;
  if (astro?.planets && Array.isArray(astro.planets)) {
    const chiron = astro.planets.find(p => p.name?.toLowerCase() === 'chiron');
    if (chiron?.house) {
      const house = chiron.house as number;
      const houseAreas: Record<number, { ko: string; en: string }> = {
        1: { ko: '자아 정체성', en: 'Self-identity' },
        4: { ko: '가족과 뿌리', en: 'Family and roots' },
        7: { ko: '관계와 타인', en: 'Relationships' },
        10: { ko: '사회적 성공', en: 'Social success' },
      };
      const area = houseAreas[house] || { ko: '특정 영역', en: 'Specific area' };
      chironWound = {
        area,
        manifestation: {
          ko: `${area.ko} 영역에서 깊은 상처가 있어요`,
          en: `Deep wound in ${area.en} area`,
        },
        healing: {
          ko: '이 상처를 치유하면 당신의 가장 큰 선물이 됩니다',
          en: 'Healing this wound becomes your greatest gift',
        },
        gift: {
          ko: '상처받은 치유자로서 다른 이를 도울 수 있어요',
          en: 'As a wounded healer, you can help others',
        },
      };
    }
  }

  // 3. 릴리스 에너지 (L10)
  let lilithEnergy: ShadowPersonalityResult['lilithEnergy'] = null;
  if (astro?.planets && Array.isArray(astro.planets)) {
    const lilith = astro.planets.find(p => p.name?.toLowerCase() === 'lilith' || p.name?.toLowerCase() === 'black moon lilith');
    if (lilith?.sign) {
      const lilithEl = getWestElementFromSign(lilith.sign);
      const lilithSajuEl = mapSajuElementToKo(lilithEl);
      const interaction = ELEMENT_CORE_GRID[sajuEl]?.[lilithEl];
      if (interaction) {
        lilithEnergy = {
          element: lilithSajuEl,
          fusion: {
            level: interaction.level,
            score: interaction.score,
            icon: interaction.icon,
            color: getInteractionColor(interaction.level),
            keyword: { ko: interaction.keyword, en: interaction.keywordEn },
            description: { ko: interaction.keyword, en: interaction.keywordEn },
          },
          suppressed: {
            ko: `${lilithSajuEl} 에너지가 억압되어 있어요`,
            en: `${lilithSajuEl} energy is suppressed`,
          },
          expression: {
            ko: '이 어두운 여성성을 표현하고 통합하세요',
            en: 'Express and integrate this dark feminine energy',
          },
        };
      }
    }
  }

  // 4. 투사 패턴 (L5 - 관계)
  const projection: ShadowPersonalityResult['projection'] = [];
  const conflictRelations = ['chung', 'hyeong', 'wonjin'] as const;
  for (const relation of conflictRelations.slice(0, 2)) {
    const relationData = RELATION_ASPECT_MATRIX[relation as keyof typeof RELATION_ASPECT_MATRIX];
    if (relationData && relationData.opposition) {
      const interaction = relationData.opposition;
      projection.push({
        pattern: relation,
        from: '자신',
        to: '타인',
        recognition: {
          ko: `${relation} 관계에서 투사가 일어날 수 있어요`,
          en: `Projection may occur in ${relation} relationships`,
        },
        integration: {
          ko: '자신의 그림자를 타인에게서 보고 있는지 확인하세요',
          en: 'Check if you are seeing your shadow in others',
        },
      });
    }
  }

  // 종합 점수
  const shadowCount = shinsalShadows.length;
  const woundDepth = chironWound ? 80 : 0;
  const suppressionLevel = lilithEnergy ? lilithEnergy.fusion.score : 0;
  const shadowScore = Math.round((shadowCount * 20 + woundDepth + suppressionLevel) / 3);

  return {
    shadowScore,
    shinsalShadows,
    chironWound,
    lilithEnergy,
    projection,
  };
}
