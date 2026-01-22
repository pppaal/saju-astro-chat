/**
 * Layer 6: Life Cycle Analysis
 * 생애주기-하우스 분석
 */

import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { TWELVE_STAGE_HOUSE_MATRIX, TWELVE_STAGE_INFO } from '@/lib/destiny-matrix/data/layer6-stage-house';
import type { HouseNumber, PlanetName } from '@/lib/destiny-matrix/types';
import type { TwelveStage, TwelveStageStandard } from '@/lib/Saju/types';
import type { SajuData, AstroData } from '../../types';
import type { LifeCycleResult } from './types';

interface ExtendedSajuData extends SajuData {
  twelveStages?: {
    year?: TwelveStage;
    month?: TwelveStage;
    day?: TwelveStage;
    hour?: TwelveStage;
  };
}

function getHouseLifeArea(house: number, isKo: boolean): string {
  const areas: Record<number, { ko: string; en: string }> = {
    1: { ko: '자아/외모', en: 'Self/Appearance' },
    2: { ko: '재물/가치', en: 'Money/Values' },
    3: { ko: '소통/학습', en: 'Communication/Learning' },
    4: { ko: '가정/뿌리', en: 'Home/Roots' },
    5: { ko: '창조/연애', en: 'Creativity/Romance' },
    6: { ko: '건강/일상', en: 'Health/Daily Work' },
    7: { ko: '관계/파트너', en: 'Relationships/Partner' },
    8: { ko: '변혁/깊이', en: 'Transformation/Depth' },
    9: { ko: '확장/철학', en: 'Expansion/Philosophy' },
    10: { ko: '커리어/명예', en: 'Career/Status' },
    11: { ko: '희망/네트워크', en: 'Hopes/Network' },
    12: { ko: '영성/무의식', en: 'Spirituality/Unconscious' },
  };
  return isKo ? areas[house]?.ko || '' : areas[house]?.en || '';
}

/**
 * 12운성-하우스 생명력 분석
 */
export function analyzeLifeCycle(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): LifeCycleResult[] {
  const isKo = lang === 'ko';
  const lifeCycles: LifeCycleResult[] = [];

  if (!saju) return lifeCycles;

  const extSaju = saju as ExtendedSajuData;
  const twelveStages = extSaju?.twelveStages || {};

  // 행성 하우스 매핑
  const planetHouses: Partial<Record<PlanetName, number>> = {};
  if (astro?.planets && Array.isArray(astro.planets)) {
    for (const p of astro.planets) {
      if (p.name && p.house) {
        const pName = p.name.charAt(0).toUpperCase() + p.name.slice(1).toLowerCase();
        planetHouses[pName as PlanetName] = p.house as HouseNumber;
      }
    }
  }

  // 12운성별 분석
  const stageKeys = Object.keys(twelveStages) as Array<'year' | 'month' | 'day' | 'hour'>;
  for (const pillar of stageKeys) {
    const stage = twelveStages[pillar] as TwelveStage | undefined;
    if (!stage) continue;

    // 건록/제왕 변환 (TwelveStage -> TwelveStageStandard)
    const normalizedStage: TwelveStageStandard =
      stage === '건록' ? '임관' : stage === '제왕' ? '왕지' : stage as TwelveStageStandard;

    // 해당 기둥에 연결된 하우스 찾기 (예: 월주 → 4하우스)
    const pillarHouseMap: Record<string, HouseNumber> = {
      year: 9,
      month: 4,
      day: 1,
      hour: 10,
    };
    const house = pillarHouseMap[pillar] || 1;

    const interaction = TWELVE_STAGE_HOUSE_MATRIX[normalizedStage]?.[house];
    const stageInfo = TWELVE_STAGE_INFO[normalizedStage];
    if (interaction && stageInfo) {
      lifeCycles.push({
        stage: normalizedStage,
        house,
        fusion: {
          level: interaction.level,
          score: interaction.score,
          icon: interaction.icon,
          color: getInteractionColor(interaction.level),
          keyword: { ko: interaction.keyword, en: interaction.keywordEn },
          description: {
            ko: `${normalizedStage}(${pillar}주) × ${house}하우스`,
            en: `${normalizedStage}(${pillar} pillar) × House ${house}`,
          },
        },
        stageInfo: { ko: stageInfo.ko, en: stageInfo.en },
        lifeArea: getHouseLifeArea(house, isKo),
      });
    }
  }

  return lifeCycles;
}

/**
 * 개별 12운성-하우스 융합 설명 조회
 */
export function getLifeCycleDescription(
  stage: TwelveStageStandard,
  house: HouseNumber,
  lang: string
): string | null {
  const isKo = lang === 'ko';
  const interaction = TWELVE_STAGE_HOUSE_MATRIX[stage]?.[house];
  const stageInfo = TWELVE_STAGE_INFO[stage];
  if (!interaction || !stageInfo) return null;

  const lifeArea = getHouseLifeArea(house, isKo);

  return isKo
    ? `${stage}(${stageInfo.ko.split(' - ')[1] || ''}) × ${house}하우스(${lifeArea}) = ${interaction.keyword} ${interaction.icon}`
    : `${stage}(${stageInfo.en.split(' - ')[1] || ''}) × House ${house}(${lifeArea}) = ${interaction.keywordEn} ${interaction.icon}`;
}
