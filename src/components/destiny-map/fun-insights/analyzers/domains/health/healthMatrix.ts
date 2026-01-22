// Health Domain: Matrix Analysis
// Analyzes health patterns through element balance, shinsal-planet combinations, and Chiron healing

import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { SHINSAL_PLANET_MATRIX } from '@/lib/destiny-matrix/data/layer8-shinsal-planet';
import { TWELVE_STAGE_HOUSE_MATRIX, TWELVE_STAGE_INFO } from '@/lib/destiny-matrix/data/layer6-stage-house';
import { EXTRAPOINT_ELEMENT_MATRIX, EXTRAPOINT_SIBSIN_MATRIX } from '@/lib/destiny-matrix/data/layer10-extrapoint-element';
import type { ShinsalKind, PlanetName, InteractionCode } from '@/lib/destiny-matrix/types';
import type { FiveElement, TwelveStage, TwelveStageStandard, SibsinKind } from '@/lib/Saju/types';
import type { SajuData, AstroData } from '../../../types';
import { mapSajuElementToKo, getGeneratedElement, getControlledElement, getControllerElement, getGeneratorElement } from '../../utils';
import type { HealthMatrixResult } from '../../types';

// Five Element health mapping
const ELEMENT_HEALTH_MAP: Record<string, { organs: string[]; organEn: string[]; warning: string; warningEn: string }> = {
  '목': { organs: ['간', '담낭', '눈', '근육', '신경'], organEn: ['Liver', 'Gallbladder', 'Eyes', 'Muscles', 'Nerves'], warning: '스트레스와 분노 조절이 중요해요', warningEn: 'Stress and anger management is important' },
  '화': { organs: ['심장', '소장', '혈압', '혀'], organEn: ['Heart', 'Small intestine', 'Blood pressure', 'Tongue'], warning: '과로와 흥분을 피하세요', warningEn: 'Avoid overwork and excitement' },
  '토': { organs: ['위장', '비장', '소화기', '입술'], organEn: ['Stomach', 'Spleen', 'Digestive system', 'Lips'], warning: '규칙적인 식사가 중요해요', warningEn: 'Regular meals are important' },
  '금': { organs: ['폐', '대장', '피부', '코'], organEn: ['Lungs', 'Large intestine', 'Skin', 'Nose'], warning: '호흡기와 피부 관리가 필요해요', warningEn: 'Respiratory and skin care needed' },
  '수': { organs: ['신장', '방광', '귀', '뼈'], organEn: ['Kidneys', 'Bladder', 'Ears', 'Bones'], warning: '충분한 수분 섭취와 휴식이 필요해요', warningEn: 'Adequate hydration and rest needed' },
};

// Health-related Shinsal list
const HEALTH_SHINSALS: ShinsalKind[] = ['병부', '효신살', '상문살', '백호', '귀문관'];

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
  if (!saju && !astro) return null;

  const extSaju = saju as ExtendedSajuData | undefined;
  const dayElement = saju?.dayMaster?.element || 'wood';
  const sajuEl = mapSajuElementToKo(dayElement);

  // 1. 오행 균형 분석 (L1 기반)
  const elementBalance: HealthMatrixResult['elementBalance'] = [];
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
    if (el) elementCounts[el] += count as number;
  }

  const totalCount = Object.values(elementCounts).reduce((a, b) => a + b, 0) || 1;
  for (const el of fiveElements) {
    const ratio = elementCounts[el] / totalCount;
    let status: 'excess' | 'balanced' | 'deficient' = 'balanced';
    if (ratio > 0.3) status = 'excess';
    else if (ratio < 0.1) status = 'deficient';
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
        organ: isKo ? healthInfo.organs[0] : healthInfo.organEn[0],
        element: el.element,
        risk: 'high',
        advice: isKo ? `${el.element} 기운 부족: ${healthInfo.warning}` : `${el.element} energy deficient: ${healthInfo.warningEn}`,
        icon: el.element === '목' ? '🌳' : el.element === '화' ? '🔥' : el.element === '토' ? '🏔️' : el.element === '금' ? '⚔️' : '💧',
      });
    }
  }

  for (const el of excessElements) {
    const healthInfo = ELEMENT_HEALTH_MAP[el.element];
    if (healthInfo) {
      vulnerableAreas.push({
        organ: isKo ? healthInfo.organs[0] : healthInfo.organEn[0],
        element: el.element,
        risk: 'medium',
        advice: isKo ? `${el.element} 기운 과다: 에너지 분산이 필요해요` : `${el.element} energy excess: Energy distribution needed`,
        icon: el.element === '목' ? '🌳' : el.element === '화' ? '🔥' : el.element === '토' ? '🏔️' : el.element === '금' ? '⚔️' : '💧',
      });
    }
  }

  // 3. 생명력 사이클 (L6 - 12운성)
  let lifeCycleStage: HealthMatrixResult['lifeCycleStage'] = null;
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

  // 4. 신살-행성 건강 분석 (L8)
  const shinsalHealth: HealthMatrixResult['shinsalHealth'] = [];
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

  // 5. Chiron 치유 분석 (L10)
  let chironHealing: HealthMatrixResult['chironHealing'] = null;
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
  const balanceBonus = elementBalance.filter(e => e.status === 'balanced').length * 5;
  const deficitPenalty = deficientElements.length * 8;
  const excessPenalty = excessElements.length * 3;
  const lifeCycleBonus = lifeCycleStage ? (lifeCycleStage.vitalityLevel - 5) * 3 : 0;
  const chironBonus = chironHealing ? (chironHealing.score - 5) * 2 : 0;

  const vitalityScore = Math.min(100, Math.max(30, baseScore + balanceBonus - deficitPenalty - excessPenalty + lifeCycleBonus + chironBonus));

  return {
    vitalityScore: Math.round(vitalityScore),
    elementBalance,
    vulnerableAreas,
    lifeCycleStage,
    shinsalHealth,
    chironHealing,
  };
}
