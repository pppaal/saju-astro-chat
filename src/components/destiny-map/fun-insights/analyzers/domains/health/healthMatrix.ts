// Health Domain: Matrix Analysis
// Analyzes health patterns through element balance, shinsal-planet combinations, and Chiron healing

import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { SHINSAL_PLANET_MATRIX } from '@/lib/destiny-matrix/data/layer8-shinsal-planet';
import { TWELVE_STAGE_HOUSE_MATRIX, TWELVE_STAGE_INFO } from '@/lib/destiny-matrix/data/layer6-stage-house';
import { EXTRAPOINT_ELEMENT_MATRIX, EXTRAPOINT_SIBSIN_MATRIX } from '@/lib/destiny-matrix/data/layer10-extrapoint-element';
import type { ShinsalKind, PlanetName, InteractionCode } from '@/lib/destiny-matrix/types';
import type { FiveElement, TwelveStage, TwelveStageStandard, SibsinKind } from '@/lib/Saju/types';
import type { SajuData, AstroData } from '../../../types';
import {
  getGeneratedElement,
  getControlledElement,
  getControllerElement,
  getGeneratorElement,
  ELEMENT_HEALTH_MAP,
  HEALTH_SHINSALS
} from '../../shared';
import type { HealthMatrixResult } from '../../types';

// Extended Saju data type for internal use
interface ExtendedSajuData {
  dayMaster?: { element?: string; name?: string; heavenlyStem?: string };
  advancedAnalysis?: {
    sibsin?: {
      sibsinDistribution?: Record<string, number>;
    };
    sinsal?: {
      unluckyList?: Array<{ name?: string } | string>;
    };
  };
  twelveStages?: {
    year?: TwelveStage;
    month?: TwelveStage;
    day?: TwelveStage;
    hour?: TwelveStage;
  };
  shinsal?: Array<{ name?: string; shinsal?: string } | string> | Record<string, unknown>;
  sibsin?: {
    month?: SibsinKind;
    hour?: SibsinKind;
  };
}

/**
 * Analyzes health patterns through matrix combinations
 * @param saju - Saju birth data
 * @param astro - Western astrology data
 * @param lang - Language code ('ko' or 'en')
 * @returns Health matrix analysis result or null
 */
export function getHealthMatrixAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): HealthMatrixResult | null {
  const isKo = lang === 'ko';
  if (!saju && !astro) {return null;}

  const extSaju = saju as ExtendedSajuData | undefined;
  const dayElement = saju?.dayMaster?.element || 'wood';

  // Map English element to Korean element
  const elementMap: Record<string, FiveElement> = {
    'wood': '목', 'fire': '화', 'earth': '토', 'metal': '금', 'water': '수'
  };
  const sajuEl: FiveElement = elementMap[dayElement] || '목';

  // 1. 오행 균형 분석 (L1 기반)
  const elementBalance: HealthMatrixResult['elementBalance'] = {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0,
  };
  const fiveElements: FiveElement[] = ['목', '화', '토', '금', '수'];

  // 사주에서 오행 분포 추출
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

  // Map Korean elements to English keys
  const elKeyMap: Record<FiveElement, keyof HealthMatrixResult['elementBalance']> = {
    '목': 'wood', '화': 'fire', '토': 'earth', '금': 'metal', '수': 'water'
  };

  for (const el of fiveElements) {
    const ratio = elementCounts[el] / totalCount;
    elementBalance[elKeyMap[el]] = Math.round(ratio * 100);
  }

  // Keep track of deficient/excess for vulnerableAreas
  const deficientElements = fiveElements.filter(el => elementBalance[elKeyMap[el]] < 10);
  const excessElements = fiveElements.filter(el => elementBalance[elKeyMap[el]] > 30);

  // 2. 취약 부위 분석
  const vulnerableAreas: HealthMatrixResult['vulnerableAreas'] = [];

  for (const el of deficientElements) {
    const healthInfo = ELEMENT_HEALTH_MAP[el];
    if (healthInfo) {
      vulnerableAreas.push({
        organ: healthInfo.organEn[0],
        organKo: healthInfo.organs[0],
        element: el,
        risk: 'high',
        advice: {
          ko: `${el} 기운 부족: ${healthInfo.warning}`,
          en: `${el} energy deficient: ${healthInfo.warningEn}`
        },
      });
    }
  }

  for (const el of excessElements) {
    const healthInfo = ELEMENT_HEALTH_MAP[el];
    if (healthInfo) {
      vulnerableAreas.push({
        organ: healthInfo.organEn[0],
        organKo: healthInfo.organs[0],
        element: el,
        risk: 'medium',
        advice: {
          ko: `${el} 기운 과다: 에너지 분산이 필요해요`,
          en: `${el} energy excess: Energy distribution needed`
        },
      });
    }
  }

  // 3. 생명력 사이클 (L6 - 12운성) - removed from final type
  let lifeCycleStage: {
    stage: TwelveStageStandard;
    description: { ko: string; en: string };
    vitalityLevel: number;
    advice: string;
  } | null = null;
  const twelveStages = extSaju?.twelveStages;
  if (twelveStages?.day) {
    const stage = twelveStages.day as TwelveStage;
    const normalizedStage: TwelveStageStandard = stage === '건록' ? '임관' : stage === '제왕' ? '왕지' : stage as TwelveStageStandard;
    const stageInfo = TWELVE_STAGE_INFO[normalizedStage];

    // 6하우스와의 상호작용
    const interaction = TWELVE_STAGE_HOUSE_MATRIX[normalizedStage]?.[6];

    if (stageInfo) {
      const vitalityScores: Record<string, number> = {
        '장생': 8, '목욕': 5, '관대': 7, '임관': 9, '왕지': 10,
        '쇠': 4, '병': 3, '사': 2, '묘': 3, '절': 1, '태': 6, '양': 7,
      };

      lifeCycleStage = {
        stage: normalizedStage,
        description: { ko: stageInfo.ko, en: stageInfo.en },
        vitalityLevel: vitalityScores[normalizedStage] || 5,
        advice: interaction?.advice || (isKo ? '균형 잡힌 생활이 중요해요' : 'Balanced lifestyle is important'),
      };
    }
  }

  // 4. 신살-행성 건강 분석 (L8) - removed from final type
  const shinsalHealth: Array<{
    shinsal: ShinsalKind;
    planet: PlanetName;
    fusion: {
      level: string;
      score: number;
      icon: string;
      color: string;
      keyword: { ko: string; en: string };
      description: { ko: string; en: string };
    };
    healthWarning: { ko: string; en: string };
  }> = [];
  const shinsalList = extSaju?.shinsal || extSaju?.advancedAnalysis?.sinsal?.unluckyList || [];
  const healthPlanets: PlanetName[] = ['Neptune', 'Pluto', 'Saturn'];

  const userHealthShinsals: ShinsalKind[] = [];
  if (Array.isArray(shinsalList)) {
    for (const s of shinsalList) {
      const name = typeof s === 'string' ? s : (s as { name?: string })?.name;
      if (name && HEALTH_SHINSALS.includes(name as ShinsalKind)) {
        userHealthShinsals.push(name as ShinsalKind);
      }
    }
  }

  for (const shinsal of userHealthShinsals.slice(0, 3)) {
    for (const planet of healthPlanets.slice(0, 2)) {
      const interaction = SHINSAL_PLANET_MATRIX[shinsal]?.[planet];
      if (interaction) {
        shinsalHealth.push({
          shinsal,
          planet,
          fusion: {
            level: interaction.level,
            score: interaction.score,
            icon: interaction.icon,
            color: getInteractionColor(interaction.level),
            keyword: { ko: interaction.keyword, en: interaction.keywordEn },
            description: { ko: `${shinsal} × ${planet}`, en: `${shinsal} × ${planet}` },
          },
          healthWarning: {
            ko: (interaction as InteractionCode & { advice?: string }).advice || `${shinsal}의 영향으로 건강 관리가 필요해요`,
            en: (interaction as InteractionCode & { advice?: string }).advice || `Health management needed due to ${shinsal}`,
          },
        });
      }
    }
  }

  // 5. Chiron 치유 분석 (L10) - removed from final type
  let chironHealing: {
    woundArea: { ko: string; en: string };
    healingPath: { ko: string; en: string };
    healerPotential: { ko: string; en: string };
    score: number;
    icon: string;
  } | null = null;
  const chironElementInteraction = EXTRAPOINT_ELEMENT_MATRIX['Chiron']?.[sajuEl];

  if (chironElementInteraction) {
    const mainSibsin = extSaju?.sibsin?.month || extSaju?.sibsin?.hour;
    const chironSibsinInteraction = mainSibsin ? EXTRAPOINT_SIBSIN_MATRIX['Chiron']?.[mainSibsin] : null;

    const woundAreas: Record<FiveElement, { ko: string; en: string }> = {
      '목': { ko: '성장과 시작에 대한 두려움', en: 'Fear of growth and new beginnings' },
      '화': { ko: '열정 표현과 인정받는 것', en: 'Expressing passion and being recognized' },
      '토': { ko: '안정감과 소속감', en: 'Sense of stability and belonging' },
      '금': { ko: '관계의 단절과 상실', en: 'Relationship severance and loss' },
      '수': { ko: '감정 표현과 친밀감', en: 'Emotional expression and intimacy' },
    };

    const healingPaths: Record<FiveElement, { ko: string; en: string }> = {
      '목': { ko: '작은 도전부터 시작해 자신감을 키우세요', en: 'Start with small challenges to build confidence' },
      '화': { ko: '안전한 환경에서 자기 표현을 연습하세요', en: 'Practice self-expression in safe environments' },
      '토': { ko: '자신만의 안전한 공간을 만드세요', en: 'Create your own safe space' },
      '금': { ko: '이별도 성장의 과정임을 받아들이세요', en: 'Accept that parting is also part of growth' },
      '수': { ko: '신뢰할 수 있는 사람에게 마음을 열어보세요', en: 'Open your heart to someone you trust' },
    };

    chironHealing = {
      woundArea: woundAreas[sajuEl] || { ko: '내면의 상처', en: 'Inner wounds' },
      healingPath: healingPaths[sajuEl] || { ko: '자기 돌봄을 실천하세요', en: 'Practice self-care' },
      healerPotential: {
        ko: chironSibsinInteraction ? `${mainSibsin}의 에너지로 타인을 치유할 수 있어요` : '당신의 상처가 타인을 치유하는 힘이 됩니다',
        en: chironSibsinInteraction ? `You can heal others with ${mainSibsin} energy` : 'Your wounds become power to heal others',
      },
      score: chironElementInteraction.score,
      icon: chironElementInteraction.icon,
    };
  }

  // 6. 종합 생명력 점수 계산
  const baseScore = 60;
  // Count balanced elements (between 15-25%)
  const balancedCount = Object.values(elementBalance).filter(score => score >= 15 && score <= 25).length;
  const balanceBonus = balancedCount * 5;
  const deficitPenalty = deficientElements.length * 8;
  const excessPenalty = excessElements.length * 3;
  const lifeCycleBonus = 0; // lifeCycleStage not in final type
  const chironBonus = 0; // chironHealing not in final type

  const vitalityScore = Math.min(100, Math.max(30, baseScore + balanceBonus - deficitPenalty - excessPenalty + lifeCycleBonus + chironBonus));

  // Generate health message based on score
  const healthMessage = {
    ko: vitalityScore >= 80 ? '전반적으로 건강한 상태입니다' :
        vitalityScore >= 60 ? '균형 잡힌 관리가 필요합니다' :
        '건강에 특별한 주의가 필요합니다',
    en: vitalityScore >= 80 ? 'Overall healthy state' :
        vitalityScore >= 60 ? 'Balanced care needed' :
        'Special attention to health required'
  };

  return {
    vitalityScore: Math.round(vitalityScore),
    elementBalance,
    vulnerableAreas,
    healthMessage,
  } as HealthMatrixResult;
}
