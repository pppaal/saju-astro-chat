/**
 * Event Category Analysis Module
 * Extracted from lifePredictionEngine.ts
 *
 * Functions for generating detailed event-specific analysis across different life categories
 * (career, finance, relationship, health, travel, education)
 */

import type {
  CausalFactor,
  EventCategoryScores,
  SolarTerm,
  LunarMansion,
} from '../../precisionEngine';
import type { PastRetrospective } from '../../life-prediction-types';

/**
 * Generate detailed analysis for each event category based on causal factors and conditions
 * @param scores - Scores for each event category
 * @param causalFactors - Array of causal factors affecting the date
 * @param sibsin - The ten god (sibsin) for the day
 * @param twelveStage - The twelve stage for the day
 * @param solarTerm - Solar term information
 * @param lunarMansion - Lunar mansion (28 constellations) information
 * @returns Detailed analysis breakdown by category
 */
export function generateDetailedEventAnalysis(
  scores: EventCategoryScores,
  causalFactors: CausalFactor[],
  sibsin: string,
  twelveStage: string,
  solarTerm: SolarTerm,
  lunarMansion: LunarMansion
): PastRetrospective['detailedAnalysis'] {
  const generateCategoryAnalysis = (
    category: keyof EventCategoryScores,
    categoryName: string
  ) => {
    const score = scores[category];
    const factors: string[] = [];
    const whyHappened: string[] = [];

    // 십신 영향
    const sibsinEffect = getSibsinEffect(sibsin, category);
    if (sibsinEffect) factors.push(sibsinEffect);

    // 12운성 영향
    const stageEffect = getStageEffect(twelveStage, category);
    if (stageEffect) factors.push(stageEffect);

    // 인과 요인 중 해당 영역 관련
    for (const cf of causalFactors) {
      if (cf.affectedAreas.some(a =>
        a.includes(categoryName) ||
        (category === 'career' && (a.includes('커리어') || a.includes('사업'))) ||
        (category === 'finance' && (a.includes('재물') || a.includes('재정'))) ||
        (category === 'relationship' && (a.includes('관계') || a.includes('대인'))) ||
        (category === 'health' && a.includes('건강')) ||
        (category === 'travel' && (a.includes('여행') || a.includes('이동'))) ||
        (category === 'education' && (a.includes('학업') || a.includes('교육')))
      )) {
        factors.push(cf.factor);
        whyHappened.push(cf.description);
      }
    }

    // 28수 영향
    if (category === 'relationship' && lunarMansion.goodFor.includes('결혼')) {
      factors.push(`${lunarMansion.nameKo}수 - 관계에 길`);
    }

    // 절기 영향
    if (category === 'health' && solarTerm.element === '토') {
      factors.push(`${solarTerm.nameKo} - 건강 안정기`);
    }

    return { score, factors: factors.slice(0, 5), whyHappened: whyHappened.slice(0, 3) };
  };

  return {
    career: generateCategoryAnalysis('career', '직업'),
    finance: generateCategoryAnalysis('finance', '재정'),
    relationship: generateCategoryAnalysis('relationship', '관계'),
    health: generateCategoryAnalysis('health', '건강'),
    travel: generateCategoryAnalysis('travel', '여행'),
    education: generateCategoryAnalysis('education', '교육'),
  };
}

/**
 * Get the effect of a sibsin (ten god) on a specific event category
 * @param sibsin - The ten god name
 * @param category - The event category
 * @returns A description of the effect, or null if not applicable
 */
export function getSibsinEffect(sibsin: string, category: keyof EventCategoryScores): string | null {
  const effects: Record<string, Partial<Record<keyof EventCategoryScores, string>>> = {
    '정관': { career: '정관운 - 승진/안정', relationship: '정관운 - 귀인 만남' },
    '편관': { career: '편관운 - 경쟁/도전', health: '편관운 - 스트레스 주의' },
    '정재': { finance: '정재운 - 안정적 수입', relationship: '정재운 - 좋은 인연' },
    '편재': { finance: '편재운 - 투자 기회', travel: '편재운 - 활동적' },
    '정인': { education: '정인운 - 학업 성취', health: '정인운 - 건강 양호' },
    '편인': { education: '편인운 - 창의적 학습', travel: '편인운 - 이동운' },
    '식신': { health: '식신운 - 건강 좋음', finance: '식신운 - 수입 증가' },
    '상관': { career: '상관운 - 변화 가능', education: '상관운 - 학업 진전' },
    '비견': { relationship: '비견운 - 협력 기회' },
    '겁재': { finance: '겁재운 - 지출 주의', relationship: '겁재운 - 경쟁 관계' },
  };

  return effects[sibsin]?.[category] || null;
}

/**
 * Get the effect of a twelve stage on a specific event category
 * @param stage - The twelve stage name
 * @param category - The event category
 * @returns A description of the effect, or null if not applicable
 */
export function getStageEffect(stage: string, category: keyof EventCategoryScores): string | null {
  const effects: Record<string, Partial<Record<keyof EventCategoryScores, string>>> = {
    '장생': { education: '장생 - 새로운 시작', health: '장생 - 에너지 충만' },
    '목욕': { relationship: '목욕 - 새로운 만남', travel: '목욕 - 이동 활발' },
    '관대': { career: '관대 - 성장기', relationship: '관대 - 인기 상승' },
    '건록': { career: '건록 - 직업 안정', finance: '건록 - 수입 증가' },
    '제왕': { career: '제왕 - 전성기', finance: '제왕 - 재물 최고조' },
    '쇠': { health: '쇠 - 건강 관리', career: '쇠 - 현상 유지' },
    '병': { health: '병 - 건강 주의', career: '병 - 활동 제한' },
    '사': { health: '사 - 재충전 필요', finance: '사 - 지출 주의' },
    '묘': { career: '묘 - 휴식기', health: '묘 - 회복 필요' },
    '절': { career: '절 - 전환기', relationship: '절 - 관계 정리' },
    '태': { education: '태 - 잉태기', relationship: '태 - 새 인연' },
    '양': { education: '양 - 성장 준비', health: '양 - 회복 중' },
  };

  return effects[stage]?.[category] || null;
}
