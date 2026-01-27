/**
 * Health Matrix Analysis
 * Specialized health analysis combining Saju and Astrology data
 */

import { logger } from '@/lib/logger';
import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { TWELVE_STAGE_INFO } from '@/lib/destiny-matrix/data/layer6-stage-house';
import { SHINSAL_PLANET_MATRIX } from '@/lib/destiny-matrix/data/layer8-shinsal-planet';
import { EXTRAPOINT_INFO } from '@/lib/destiny-matrix/data/layer10-extrapoint-element';
import type { HouseNumber, ShinsalKind } from '@/lib/destiny-matrix/types';
import type { FiveElement, TwelveStage, TwelveStageStandard } from '@/lib/Saju/types';
import type { SajuData, AstroData } from '../../types';
import type { HealthMatrixResult, ExtendedSajuData } from '../types/specialized.types';
import { ElementRelations } from '../shared/elementRelations';
import { ELEMENT_HEALTH_MAP, HEALTH_SHINSALS } from '../shared/constants';
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

function mapTwelveStageToStandard(stage: TwelveStage): TwelveStageStandard | null {
  const mapping: Record<TwelveStage, TwelveStageStandard> = {
    '장생': '장생', '목욕': '목욕', '관대': '관대', '건록': '임관', '제왕': '왕지',
    '쇠': '쇠', '병': '병', '사': '사', '묘': '묘', '절': '절', '태': '태', '양': '양',
    '임관': '임관', '왕지': '왕지',
  };
  return mapping[stage] || null;
}

// Element relation helpers
const getGeneratedElement = ElementRelations.getGenerated.bind(ElementRelations);
const getControlledElement = ElementRelations.getControlled.bind(ElementRelations);
const getControllerElement = ElementRelations.getController.bind(ElementRelations);
const getGeneratorElement = ElementRelations.getGenerator.bind(ElementRelations);

/**
 * Analyze health aspects using destiny matrix
 * Combines Saju element balance with astrological health indicators
 */
export function getHealthMatrixAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): HealthMatrixResult | null {
  const isKo = lang === 'ko';

  // Validate inputs
  if (!saju && !astro) {
    logger.warn('[HealthMatrix] No saju or astro data provided');
    return null;
  }

  const extSaju = saju as ExtendedSajuData | undefined;

  // Ensure dayMaster element exists, default to 'wood' with warning
  const dayElement = saju?.dayMaster?.element;
  if (!dayElement) {
    logger.warn('[HealthMatrix] No dayMaster element found, defaulting to "wood"');
  }
  const sajuEl = mapSajuElementToKo(dayElement || 'wood');

  // 1. 오행 균형 분석
  const elementBalance: HealthMatrixResult['elementBalance'] = [];
  const fiveElements: FiveElement[] = ['목', '화', '토', '금', '수'];
  const elementDist = extSaju?.advancedAnalysis?.sibsin?.sibsinDistribution || {};
  const sibsinToElement: Record<string, FiveElement> = {
    '비견': sajuEl, '겁재': sajuEl,
    '식신': getGeneratedElement(sajuEl), '상관': getGeneratedElement(sajuEl),
    '편재': getControlledElement(sajuEl), '정재': getControlledElement(sajuEl),
    '편관': getControllerElement(sajuEl), '정관': getControllerElement(sajuEl),
    '편인': getGeneratorElement(sajuEl), '정인': getGeneratorElement(sajuEl),
  };

  const elementCounts: Record<FiveElement, number> = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };
  for (const [sibsin, count] of Object.entries(elementDist)) {
    const el = sibsinToElement[sibsin];
    if (el) {elementCounts[el] += count as number;}
  }

  const totalCount = Object.values(elementCounts).reduce((a, b) => a + b, 0) || 1;
  for (const el of fiveElements) {
    const ratio = elementCounts[el] / totalCount;
    let status: 'excess' | 'balanced' | 'deficient' = 'balanced';
    if (ratio > 0.3) {status = 'excess';}
    else if (ratio < 0.1) {status = 'deficient';}
    elementBalance.push({ element: el, score: Math.round(ratio * 100), status });
  }

  // 2. 취약 부위 분석
  const vulnerableAreas: HealthMatrixResult['vulnerableAreas'] = [];
  const deficientElements = elementBalance.filter(e => e.status === 'deficient');
  const excessElements = elementBalance.filter(e => e.status === 'excess');

  for (const el of deficientElements) {
    const healthInfo = ELEMENT_HEALTH_MAP[el.element];
    if (healthInfo) {
      vulnerableAreas.push({
        organ: isKo ? healthInfo.organs.join(', ') : healthInfo.organEn.join(', '),
        element: el.element,
        risk: 'high',
        advice: isKo ? healthInfo.warning : healthInfo.warningEn,
        icon: '⚠️',
      });
    }
  }

  for (const el of excessElements) {
    const healthInfo = ELEMENT_HEALTH_MAP[el.element];
    if (healthInfo) {
      vulnerableAreas.push({
        organ: isKo ? healthInfo.organs.join(', ') : healthInfo.organEn.join(', '),
        element: el.element,
        risk: 'medium',
        advice: isKo ? `${el.element} 기운이 과해요. 균형이 필요해요.` : `${el.element} energy is excessive. Balance needed.`,
        icon: '⚡',
      });
    }
  }

  // 3. 생명력 단계 (L6 - 12운성)
  let lifeCycleStage: HealthMatrixResult['lifeCycleStage'] = null;
  const dayStage = extSaju?.twelveStages?.day;
  if (dayStage) {
    const stageStd = mapTwelveStageToStandard(dayStage);
    if (stageStd) {
      const stageData = TWELVE_STAGE_INFO[stageStd];
      const vitalityMap: Record<string, number> = {
        '장생': 90, '목욕': 70, '관대': 85, '임관': 95, '제왕': 100,
        '쇠': 60, '병': 40, '사': 30, '묘': 50, '절': 35, '태': 75, '양': 80,
      };
      lifeCycleStage = {
        stage: stageStd,
        description: { ko: stageData.ko, en: stageData.en },
        vitalityLevel: vitalityMap[stageStd] || 50,
        advice: isKo
          ? `현재 ${stageData.ko} 단계로 생명력이 ${vitalityMap[stageStd] || 50}% 수준입니다.`
          : `Currently at ${stageData.en} stage with ${vitalityMap[stageStd] || 50}% vitality.`,
      };
    }
  }

  // 4. 건강 관련 신살 (L8)
  const shinsalHealth: HealthMatrixResult['shinsalHealth'] = [];
  const shinsalList = extractShinsals(extSaju, HEALTH_SHINSALS);

  for (const shinsal of shinsalList.slice(0, 3)) {
    const saturnData = SHINSAL_PLANET_MATRIX[shinsal as ShinsalKind]?.['Saturn'];
    if (saturnData) {
      shinsalHealth.push({
        shinsal: shinsal as ShinsalKind,
        planet: 'Saturn',
        fusion: {
          level: saturnData.level,
          score: saturnData.score,
          icon: saturnData.icon,
          color: getInteractionColor(saturnData.level),
          keyword: { ko: saturnData.keyword, en: saturnData.keywordEn },
          description: { ko: saturnData.keyword, en: saturnData.keywordEn },
        },
        healthWarning: {
          ko: `${shinsal}이 건강에 영향을 줄 수 있어요. 주의가 필요합니다.`,
          en: `${shinsal} may affect health. Caution needed.`,
        },
      });
    }
  }

  // 5. 키론 힐링 (L10)
  let chironHealing: HealthMatrixResult['chironHealing'] = null;
  const chironInfo = EXTRAPOINT_INFO['Chiron'];
  if (chironInfo && astro?.planets && Array.isArray(astro.planets)) {
    const chironPlanet = astro.planets.find(p => p.name?.toLowerCase() === 'chiron');
    if (chironPlanet?.house) {
      const house = chironPlanet.house as HouseNumber;
      const houseAreas: Record<number, { ko: string; en: string }> = {
        1: { ko: '자아', en: 'Self' },
        2: { ko: '재물', en: 'Wealth' },
        3: { ko: '소통', en: 'Communication' },
        4: { ko: '가정', en: 'Home' },
        5: { ko: '창조', en: 'Creativity' },
        6: { ko: '건강', en: 'Health' },
        7: { ko: '관계', en: 'Relationships' },
        8: { ko: '변혁', en: 'Transformation' },
        9: { ko: '확장', en: 'Expansion' },
        10: { ko: '커리어', en: 'Career' },
        11: { ko: '네트워크', en: 'Network' },
        12: { ko: '영성', en: 'Spirituality' },
      };
      chironHealing = {
        woundArea: houseAreas[house] || { ko: '영역', en: 'Area' },
        healingPath: {
          ko: `${houseAreas[house]?.ko || '이'} 영역의 상처가 당신의 치유 능력의 원천입니다.`,
          en: `Wounds in ${houseAreas[house]?.en || 'this'} area are the source of your healing power.`,
        },
        healerPotential: {
          ko: '당신의 아픔을 통해 다른 이를 치유할 수 있어요.',
          en: 'You can heal others through your own pain.',
        },
        score: 75,
        icon: '⚕️',
      };
    }
  }

  // 종합 점수 계산
  const balanceScore = elementBalance.filter(e => e.status === 'balanced').length * 20;
  const vitalityScore = lifeCycleStage?.vitalityLevel || 50;
  const healthRisk = vulnerableAreas.length * 10;
  const overallVitality = Math.max(0, Math.min(100, (balanceScore + vitalityScore) / 2 - healthRisk));

  return {
    vitalityScore: Math.round(overallVitality),
    elementBalance,
    vulnerableAreas,
    lifeCycleStage,
    shinsalHealth,
    chironHealing,
  };
}
