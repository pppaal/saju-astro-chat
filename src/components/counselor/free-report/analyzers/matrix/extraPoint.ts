/**
 * Layer 10: Extra Point Analysis
 * 엑스트라 포인트 분석
 */

import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { EXTRAPOINT_ELEMENT_MATRIX, EXTRAPOINT_SIBSIN_MATRIX, EXTRAPOINT_INFO } from '@/lib/destiny-matrix/data/layer10-extrapoint-element';
import type { ExtraPointName } from '@/lib/destiny-matrix/types';
import type { FiveElement, SibsinKind } from '@/lib/Saju/types';
import type { SajuData, AstroData } from '../../types';
import type { ExtraPointResult } from './types';

interface ExtendedSajuData extends SajuData {
  sibsin?: {
    year?: SibsinKind;
    month?: SibsinKind;
    day?: SibsinKind;
    hour?: SibsinKind;
  };
  advancedAnalysis?: {
    sibsin?: { sibsinDistribution?: Record<string, number> };
  };
}

// 오행 한글명
const elementNameKo: Record<string, string> = {
  '목': '나무',
  '화': '불',
  '토': '흙',
  '금': '쇠',
  '수': '물',
};

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

/**
 * 엑스트라 포인트 분석
 */
export function analyzeExtraPoint(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): ExtraPointResult[] {
  const _isKo = lang === 'ko';
  const results: ExtraPointResult[] = [];

  if (!saju && !astro) {return results;}

  const extSaju = saju as ExtendedSajuData | undefined;

  // 일간 오행
  const dayElement = saju?.dayMaster?.element || 'wood';
  const sajuEl = mapSajuElementToKo(dayElement);

  // 주요 십신 (advancedAnalysis에서 추출)
  const sibsinDist = extSaju?.advancedAnalysis?.sibsin?.sibsinDistribution;
  let mainSibsin: SibsinKind | undefined = extSaju?.sibsin?.month || extSaju?.sibsin?.hour;

  // sibsinDistribution에서 가장 강한 십신 찾기
  if (!mainSibsin && sibsinDist) {
    const sortedSibsin = Object.entries(sibsinDist)
      .sort(([, a], [, b]) => (b as number) - (a as number));
    if (sortedSibsin.length > 0) {
      mainSibsin = sortedSibsin[0][0] as SibsinKind;
    }
  }

  // 실제 존재하는 엑스트라포인트 확인
  const availablePoints: ExtraPointName[] = [];
  const extraPointsData = astro?.extraPoints || astro?.advancedAstrology;

  if (extraPointsData?.chiron) {availablePoints.push('Chiron');}
  if (extraPointsData?.lilith) {availablePoints.push('Lilith');}
  if (extraPointsData?.partOfFortune) {availablePoints.push('PartOfFortune');}
  if (extraPointsData?.vertex) {availablePoints.push('Vertex');}

  // advancedAstrology에서 노드 정보 찾기
  if (astro?.advancedAstrology) {
    availablePoints.push('NorthNode');
    availablePoints.push('SouthNode');
  }

  // 데이터가 없으면 기본 포인트 사용
  const extraPoints: ExtraPointName[] = availablePoints.length > 0
    ? availablePoints
    : ['Chiron', 'Lilith', 'PartOfFortune', 'NorthNode', 'Vertex'];

  for (const point of extraPoints) {
    const pointInfo = EXTRAPOINT_INFO[point];
    if (!pointInfo) {continue;}

    // 오행 기반 분석
    const elementData = EXTRAPOINT_ELEMENT_MATRIX[point];
    if (elementData && elementData[sajuEl]) {
      const interaction = elementData[sajuEl];

      results.push({
        extraPoint: point,
        element: sajuEl,
        fusion: {
          level: interaction.level,
          score: interaction.score,
          icon: interaction.icon,
          color: getInteractionColor(interaction.level),
          keyword: { ko: interaction.keyword, en: interaction.keywordEn },
          description: {
            ko: `${pointInfo.ko} × ${sajuEl}(${elementNameKo[sajuEl] || sajuEl}) = ${interaction.keyword}`,
            en: `${pointInfo.en} × ${sajuEl} Element = ${interaction.keywordEn}`,
          },
        },
        pointInfo: {
          ko: pointInfo.ko,
          en: pointInfo.en,
          theme: pointInfo.theme,
          themeEn: pointInfo.themeEn,
        },
        advice: interaction.advice,
      });
    }

    // 십신 기반 분석 (주요 십신이 있을 경우)
    if (mainSibsin) {
      const sibsinData = EXTRAPOINT_SIBSIN_MATRIX[point];
      if (sibsinData && sibsinData[mainSibsin]) {
        const interaction = sibsinData[mainSibsin]!;

        results.push({
          extraPoint: point,
          sibsin: mainSibsin,
          fusion: {
            level: interaction.level,
            score: interaction.score,
            icon: interaction.icon,
            color: getInteractionColor(interaction.level),
            keyword: { ko: interaction.keyword, en: interaction.keywordEn },
            description: {
              ko: `${pointInfo.ko} × ${mainSibsin} = ${interaction.keyword}`,
              en: `${pointInfo.en} × ${mainSibsin} = ${interaction.keywordEn}`,
            },
          },
          pointInfo: {
            ko: pointInfo.ko,
            en: pointInfo.en,
            theme: pointInfo.theme,
            themeEn: pointInfo.themeEn,
          },
          advice: interaction.advice,
        });
      }
    }
  }

  // 중복 제거 및 점수순 정렬
  const uniqueResults = results.reduce((acc, item) => {
    const key = `${item.extraPoint}-${item.element || ''}-${item.sibsin || ''}`;
    if (!acc.find((r) => `${r.extraPoint}-${r.element || ''}-${r.sibsin || ''}` === key)) {
      acc.push(item);
    }
    return acc;
  }, [] as ExtraPointResult[]);

  return uniqueResults
    .sort((a, b) => b.fusion.score - a.fusion.score)
    .slice(0, 8); // 최대 8개
}
