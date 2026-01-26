// Layer 5: Relation-Aspect Analysis
// Analyzes the fusion between Saju branch relations and Western aspects

import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { RELATION_ASPECT_MATRIX } from '@/lib/destiny-matrix/data/layer5-relation-aspect';
import type { BranchRelation, InteractionCode } from '@/lib/destiny-matrix/types';
import type { SajuData, AstroData } from '../../../types';
import type { RelationAspectResult } from '../../types';

// Branch relation localized names
const RELATION_NAMES: Record<string, { ko: string; en: string }> = {
  samhap: { ko: '삼합', en: 'Triple Combination' },
  yukhap: { ko: '육합', en: 'Six Harmony' },
  banghap: { ko: '방합', en: 'Directional Combination' },
  chung: { ko: '충', en: 'Clash' },
  hyeong: { ko: '형', en: 'Punishment' },
  pa: { ko: '파', en: 'Break' },
  hae: { ko: '해', en: 'Harm' },
  wonjin: { ko: '원진', en: 'Resentment' },
};

// Aspect localized names
const ASPECT_NAMES: Record<string, { ko: string; en: string }> = {
  conjunction: { ko: '합(0°)', en: 'Conjunction (0°)' },
  sextile: { ko: '육분(60°)', en: 'Sextile (60°)' },
  square: { ko: '사각(90°)', en: 'Square (90°)' },
  trine: { ko: '삼각(120°)', en: 'Trine (120°)' },
  opposition: { ko: '충(180°)', en: 'Opposition (180°)' },
  semisextile: { ko: '반육분(30°)', en: 'Semisextile (30°)' },
  quincunx: { ko: '인컨정트(150°)', en: 'Quincunx (150°)' },
  quintile: { ko: '퀸타일(72°)', en: 'Quintile (72°)' },
  biquintile: { ko: '바이퀸타일(144°)', en: 'Biquintile (144°)' },
};

// Extended Saju data type for internal use
interface ExtendedSajuData {
  dayMaster?: { element?: string; name?: string; heavenlyStem?: string };
  advancedAnalysis?: {
    hyungChungHoeHap?: {
      chung?: unknown[];
      conflicts?: unknown[];
      hap?: unknown[];
      harmony?: unknown[];
    };
  };
}

/**
 * Analyzes relation-aspect combinations between Saju and Western astrology
 * @param saju - Saju birth data
 * @param astro - Western astrology data
 * @param lang - Language code ('ko' or 'en')
 * @returns Array of relation-aspect analysis results (max 6)
 */
export function getRelationAspectAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): RelationAspectResult[] {
  const isKo = lang === 'ko';
  const results: RelationAspectResult[] = [];

  if (!saju && !astro) {return results;}

  // 실제 사주 데이터에서 지지 관계 추출
  const sajuRelations: BranchRelation[] = [];
  const extSaju = saju as ExtendedSajuData | undefined;

  // advancedAnalysis.hyungChungHoeHap에서 실제 관계 추출
  const hyungChungHoeHap = extSaju?.advancedAnalysis?.hyungChungHoeHap;
  if (hyungChungHoeHap) {
    // 충 관계
    if (hyungChungHoeHap.chung && hyungChungHoeHap.chung.length > 0) {
      sajuRelations.push('chung');
    }
    if (hyungChungHoeHap.conflicts && hyungChungHoeHap.conflicts.length > 0) {
      sajuRelations.push('chung');
    }
    // 합 관계 (삼합, 육합 추정)
    if (hyungChungHoeHap.hap && hyungChungHoeHap.hap.length > 0) {
      sajuRelations.push('samhap');
      if (hyungChungHoeHap.hap.length > 1) {
        sajuRelations.push('yukhap');
      }
    }
    if (hyungChungHoeHap.harmony && hyungChungHoeHap.harmony.length > 0) {
      sajuRelations.push('yukhap');
    }
  }

  // 데이터가 없으면 기본 관계 사용
  const useRelations: BranchRelation[] = sajuRelations.length > 0
    ? [...new Set(sajuRelations)] // 중복 제거
    : ['samhap', 'yukhap', 'chung'];

  // 천체 애스펙트 추출 (astro 데이터에서)
  const aspects: string[] = [];
  if (astro?.aspects && Array.isArray(astro.aspects)) {
    for (const asp of astro.aspects.slice(0, 5)) {
      const aspectType = asp.type;
      if (aspectType) {
        aspects.push(aspectType.toLowerCase());
      }
    }
  }

  // 기본 애스펙트 (데이터가 없을 경우)
  const defaultAspects = ['trine', 'conjunction', 'square'];
  const useAspects = aspects.length > 0 ? aspects : defaultAspects;

  // 관계 × 애스펙트 조합 분석
  for (const relation of useRelations) {
    for (const aspect of useAspects.slice(0, 2)) {
      const relationData = RELATION_ASPECT_MATRIX[relation];
      if (relationData && relationData[aspect as keyof typeof relationData]) {
        const interaction = relationData[aspect as keyof typeof relationData];
        const relationInfo = RELATION_NAMES[relation] || { ko: relation, en: relation };
        const aspectInfo = ASPECT_NAMES[aspect] || { ko: aspect, en: aspect };

        results.push({
          relation,
          aspect,
          fusion: {
            level: interaction.level,
            score: interaction.score,
            icon: interaction.icon,
            color: getInteractionColor(interaction.level),
            keyword: { ko: interaction.keyword, en: interaction.keywordEn },
            description: {
              ko: `${relationInfo.ko} × ${aspectInfo.ko} = ${interaction.keyword}`,
              en: `${relationInfo.en} × ${aspectInfo.en} = ${interaction.keywordEn}`,
            },
          },
          relationInfo,
          aspectInfo,
          advice: (interaction as InteractionCode & { advice?: string }).advice,
        });
      }
    }
  }

  return results.slice(0, 6); // 최대 6개
}
