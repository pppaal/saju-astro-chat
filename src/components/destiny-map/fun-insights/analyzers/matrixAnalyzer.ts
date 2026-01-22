// matrixAnalyzer.ts
// Destiny Fusion Matrix™ 데이터를 활용한 고급 분석
// Main orchestrator - delegates to layer modules and provides specialized analyses

// Re-export all layer analyzers and types from matrix subfolder
export {
  // Main analysis functions
  getMatrixAnalysis,
  getFullMatrixAnalysis,
  getLoveMatrixAnalysis,
  getCareerMatrixAnalysis,
  getTimingOverlayAnalysis,
  getRelationAspectAnalysis,
  getAdvancedAnalysisResult,
  getExtraPointAnalysis,
  // Description helpers
  getElementFusionDescription,
  getSibsinPlanetDescription,
  getLifeCycleDescription,
  // Types
  type MatrixFusion,
  type ElementFusionResult,
  type SibsinPlanetResult,
  type LifeCycleResult,
  type MatrixSynergyResult,
  type ShinsalPlanetResult,
  type AsteroidHouseResult,
  type SibsinHouseResult,
  type MatrixAnalysisResult,
  type LoveMatrixResult,
  type CareerMatrixResult,
  type TimingOverlayResult,
  type RelationAspectResult,
  type AdvancedAnalysisResult,
  type ExtraPointResult,
  type FullMatrixAnalysisResult,
} from './matrix';

// Import dependencies for specialized functions
import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { ELEMENT_CORE_GRID, SIGN_TO_ELEMENT } from '@/lib/destiny-matrix/data/layer1-element-core';
import { SIBSIN_PLANET_MATRIX } from '@/lib/destiny-matrix/data/layer2-sibsin-planet';
import { TWELVE_STAGE_HOUSE_MATRIX, TWELVE_STAGE_INFO } from '@/lib/destiny-matrix/data/layer6-stage-house';
import { SHINSAL_PLANET_MATRIX, SHINSAL_INFO } from '@/lib/destiny-matrix/data/layer8-shinsal-planet';
import { RELATION_ASPECT_MATRIX } from '@/lib/destiny-matrix/data/layer5-relation-aspect';
import { ADVANCED_ANALYSIS_MATRIX } from '@/lib/destiny-matrix/data/layer7-advanced-analysis';
import { EXTRAPOINT_INFO } from '@/lib/destiny-matrix/data/layer10-extrapoint-element';
import type { WesternElement, HouseNumber, PlanetName, ShinsalKind, ProgressionType } from '@/lib/destiny-matrix/types';
import type { FiveElement, SibsinKind, TwelveStage, TwelveStageStandard } from '@/lib/Saju/types';
import { findPlanetSign } from '../utils/helpers';
import type { SajuData, AstroData } from '../types';
import type { MatrixFusion } from './matrix/types';

// ============================
// Specialized Analysis Types
// ============================

export interface HealthMatrixResult {
  vitalityScore: number;
  elementBalance: Array<{ element: string; score: number; status: 'excess' | 'balanced' | 'deficient' }>;
  vulnerableAreas: Array<{
    organ: string;
    element: string;
    risk: 'high' | 'medium' | 'low';
    advice: string;
    icon: string;
  }>;
  lifeCycleStage: {
    stage: string;
    description: { ko: string; en: string };
    vitalityLevel: number;
    advice: string;
  } | null;
  shinsalHealth: Array<{
    shinsal: string;
    planet: string;
    fusion: MatrixFusion;
    healthWarning: { ko: string; en: string };
  }>;
  chironHealing: {
    woundArea: { ko: string; en: string };
    healingPath: { ko: string; en: string };
    healerPotential: { ko: string; en: string };
    score: number;
    icon: string;
  } | null;
}

export interface KarmaMatrixResult {
  karmaScore: number;
  soulPattern: {
    geokguk: string;
    progression: string;
    fusion: MatrixFusion;
    soulTheme: { ko: string; en: string };
  } | null;
  nodeAxis: {
    northNode: {
      element: FiveElement;
      fusion: MatrixFusion;
      direction: { ko: string; en: string };
      lesson: { ko: string; en: string };
    };
    southNode: {
      element: FiveElement;
      fusion: MatrixFusion;
      pastPattern: { ko: string; en: string };
      release: { ko: string; en: string };
    };
  } | null;
  karmicRelations: Array<{
    relation: string;
    aspect: string;
    fusion: MatrixFusion;
    meaning: { ko: string; en: string };
  }>;
  pastLifeHints: Array<{
    shinsal: string;
    planet: string;
    fusion: MatrixFusion;
    hint: { ko: string; en: string };
  }>;
}

export interface CareerAdvancedResult {
  careerScore: number;
  geokgukCareer: {
    geokguk: string;
    pattern: string;
    fusion: MatrixFusion;
    careerDirection: { ko: string; en: string };
  } | null;
  houseCareerMap: Array<{
    house: number;
    planets: string[];
    careerArea: { ko: string; en: string };
    strength: 'strong' | 'moderate' | 'weak';
    icon: string;
  }>;
  midheaven: {
    sign: string;
    element: WesternElement;
    sajuAlignment: MatrixFusion;
    publicImage: { ko: string; en: string };
  } | null;
  careerTiming: Array<{
    period: string;
    icon: string;
    strength: 'strong' | 'moderate' | 'weak';
    score: number;
    description: { ko: string; en: string };
    goodFor: string[];
  }>;
}

export interface LoveTimingResult {
  loveScore: number;
  currentLuck: {
    icon: string;
    score: number;
    message: { ko: string; en: string };
    timing: 'excellent' | 'good' | 'neutral' | 'challenging';
  };
  venusTiming: {
    sign: string;
    element: WesternElement;
    fusion: MatrixFusion;
    loveStyle: { ko: string; en: string };
  } | null;
  shinsalLoveTiming: Array<{
    shinsal: string;
    planet: string;
    fusion: MatrixFusion;
    timing: { ko: string; en: string };
  }>;
  luckyPeriods: Array<{
    period: string;
    icon: string;
    strength: 'strong' | 'moderate' | 'weak';
    score: number;
    description: { ko: string; en: string };
    goodFor: string[];
  }>;
}

export interface ShadowPersonalityResult {
  shadowScore: number;
  shinsalShadows: Array<{
    shinsal: string;
    planet: string;
    fusion: MatrixFusion;
    shadowTrait: { ko: string; en: string };
    integration: { ko: string; en: string };
  }>;
  chironWound: {
    area: { ko: string; en: string };
    manifestation: { ko: string; en: string };
    healing: { ko: string; en: string };
    gift: { ko: string; en: string };
  } | null;
  lilithEnergy: {
    element: FiveElement;
    fusion: MatrixFusion;
    suppressed: { ko: string; en: string };
    expression: { ko: string; en: string };
  } | null;
  projection: Array<{
    pattern: string;
    from: string;
    to: string;
    recognition: { ko: string; en: string };
    integration: { ko: string; en: string };
  }>;
}

export interface TimingMatrixResult {
  overallScore: number;
  overallMessage: { ko: string; en: string };
  daeunTimeline: Array<{
    startAge: number;
    endAge?: number;
    isCurrent: boolean;
    element: FiveElement;
    score: number;
    description: { ko: string; en: string };
    icon: string;
  }>;
  majorTransits: Array<{
    transit: string;
    planet: string;
    timing: string;
    score: number;
    description: { ko: string; en: string };
    icon: string;
  }>;
  retrogrades: Array<{
    planet: string;
    element: WesternElement;
    fusion: MatrixFusion;
    effect: { ko: string; en: string };
    advice: { ko: string; en: string };
  }>;
  periodLuck: {
    year: { element: string; score: number; description: { ko: string; en: string } };
    month: { element: string; score: number; description: { ko: string; en: string } };
    day: { element: string; score: number; description: { ko: string; en: string } };
  };
  luckyPeriods: Array<{
    icon: string;
    period: string;
    strength: 'strong' | 'moderate' | 'weak';
    score: number;
    description: { ko: string; en: string };
    goodFor: string[];
  }>;
}

// ============================
// Saju Data Extended Type
// ============================

interface ExtendedSajuData {
  dayMaster?: { element?: string; name?: string; heavenlyStem?: string };
  sibsin?: {
    year?: SibsinKind;
    month?: SibsinKind;
    day?: SibsinKind;
    hour?: SibsinKind;
  };
  twelveStages?: {
    year?: TwelveStage;
    month?: TwelveStage;
    day?: TwelveStage;
    hour?: TwelveStage;
  };
  shinsal?: Array<{ name?: string; shinsal?: string } | string> | Record<string, unknown>;
  sinsal?: {
    luckyList?: Array<{ name?: string } | string>;
    unluckyList?: Array<{ name?: string } | string>;
    twelveAll?: Array<{ name?: string }>;
  };
  advancedAnalysis?: {
    sibsin?: { sibsinDistribution?: Record<string, number> };
    geokguk?: { name?: string; type?: string; description?: string };
    yongsin?: { element?: string; name?: string; type?: string; reason?: string };
    hyungChungHoeHap?: {
      chung?: string[];
      conflicts?: string[];
      hap?: string[];
      harmony?: string[];
    };
    sinsal?: {
      luckyList?: Array<{ name?: string } | string>;
      unluckyList?: Array<{ name?: string } | string>;
    };
  };
  daeun?: Array<{
    current?: boolean;
    isCurrent?: boolean;
    element?: string;
    heavenlyStem?: string;
    earthlyBranch?: string;
    startAge?: number;
  }>;
  birthYear?: number;
}

// ============================
// Helper Functions
// ============================

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

// Import element relations from shared utilities
import { ElementRelations } from './shared/elementRelations';

// Backward compatibility: expose static methods as functions
const getGeneratedElement = ElementRelations.getGenerated.bind(ElementRelations);
const getControlledElement = ElementRelations.getControlled.bind(ElementRelations);
const getControllerElement = ElementRelations.getController.bind(ElementRelations);
const getGeneratorElement = ElementRelations.getGenerator.bind(ElementRelations);

function mapTwelveStageToStandard(stage: TwelveStage): TwelveStageStandard | null {
  const mapping: Record<TwelveStage, TwelveStageStandard> = {
    '장생': '장생', '목욕': '목욕', '관대': '관대', '건록': '임관', '제왕': '제왕',
    '쇠': '쇠', '병': '병', '사': '사', '묘': '묘', '절': '절', '태': '태', '양': '양',
    '임관': '임관',
  };
  return mapping[stage] || null;
}

// ============================
// HealthTab Analysis
// ============================

// Import constants and utilities from shared
import {
  ELEMENT_HEALTH_MAP,
  HEALTH_SHINSALS,
  KARMA_SHINSALS,
  LOVE_SHINSALS,
  SHADOW_SHINSALS
} from './shared/constants';
import { extractShinsals } from './shared/shinsalFilter';

export function getHealthMatrixAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): HealthMatrixResult | null {
  const isKo = lang === 'ko';

  // Validate inputs
  if (!saju && !astro) {
    console.warn('[HealthMatrix] No saju or astro data provided');
    return null;
  }

  const extSaju = saju as ExtendedSajuData | undefined;

  // Ensure dayMaster element exists, default to 'wood' with warning
  const dayElement = saju?.dayMaster?.element;
  if (!dayElement) {
    console.warn('[HealthMatrix] No dayMaster element found, defaulting to "wood"');
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

  // 4. 건강 관련 신살 (L8) - Using shared utility
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
  if (chironInfo && astro?.planets) {
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

// ============================
// KarmaTab Analysis
// ============================

// Removed duplicate constant - now using shared KARMA_SHINSALS

export function getKarmaMatrixAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): KarmaMatrixResult | null {
  const isKo = lang === 'ko';
  if (!saju && !astro) return null;

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
  if (astro?.planets) {
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

  // 4. 전생 힌트 (L8 - 카르마 신살) - Using shared utility
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

// ============================
// CareerTab Advanced Analysis
// ============================

const HOUSE_CAREER_AREAS: Record<number, { ko: string; en: string }> = {
  2: { ko: '재물 관리, 금융', en: 'Wealth management, Finance' },
  3: { ko: '소통, 글쓰기, 마케팅', en: 'Communication, Writing, Marketing' },
  6: { ko: '서비스, 건강 관리', en: 'Service, Healthcare' },
  7: { ko: '협상, 파트너십', en: 'Negotiation, Partnership' },
  8: { ko: '연구, 심리, 금융', en: 'Research, Psychology, Finance' },
  9: { ko: '교육, 출판, 해외', en: 'Education, Publishing, International' },
  10: { ko: '리더십, 경영, 공직', en: 'Leadership, Management, Public service' },
  11: { ko: '네트워크, IT, 혁신', en: 'Networking, IT, Innovation' },
};

export function getCareerAdvancedAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): CareerAdvancedResult | null {
  const isKo = lang === 'ko';
  if (!saju && !astro) return null;

  const extSaju = saju as ExtendedSajuData | undefined;
  const dayElement = saju?.dayMaster?.element || 'wood';
  const sajuEl = mapSajuElementToKo(dayElement);

  // 1. 격국 기반 커리어 방향 (L7)
  let geokgukCareer: CareerAdvancedResult['geokgukCareer'] = null;
  const geokguk = extSaju?.advancedAnalysis?.geokguk?.name;
  if (geokguk) {
    const geokData = ADVANCED_ANALYSIS_MATRIX[geokguk as keyof typeof ADVANCED_ANALYSIS_MATRIX];
    if (geokData && geokData.secondary) {
      const interaction = geokData.secondary;
      geokgukCareer = {
        geokguk,
        pattern: 'secondary',
        fusion: {
          level: interaction.level,
          score: interaction.score,
          icon: interaction.icon,
          color: getInteractionColor(interaction.level),
          keyword: { ko: interaction.keyword, en: interaction.keywordEn },
          description: { ko: interaction.keyword, en: interaction.keywordEn },
        },
        careerDirection: {
          ko: `${geokguk} 격국에 맞는 커리어 방향`,
          en: `Career direction for ${geokguk} pattern`,
        },
      };
    }
  }

  // 2. 하우스별 커리어 맵
  const houseCareerMap: CareerAdvancedResult['houseCareerMap'] = [];
  if (astro?.planets && Array.isArray(astro.planets)) {
    const housePlanets: Record<number, string[]> = {};
    for (const p of astro.planets) {
      if (p.house && p.name) {
        const house = p.house as number;
        if (!housePlanets[house]) housePlanets[house] = [];
        housePlanets[house].push(p.name);
      }
    }

    for (const [houseStr, planets] of Object.entries(housePlanets)) {
      const house = parseInt(houseStr);
      if (HOUSE_CAREER_AREAS[house]) {
        const planetCount = planets.length;
        const strength: 'strong' | 'moderate' | 'weak' = planetCount >= 3 ? 'strong' : planetCount >= 2 ? 'moderate' : 'weak';
        houseCareerMap.push({
          house,
          planets,
          careerArea: HOUSE_CAREER_AREAS[house],
          strength,
          icon: house === 10 ? '🏆' : house === 6 ? '💼' : house === 2 ? '💰' : '⭐',
        });
      }
    }
  }

  // 3. MC (Midheaven) 분석
  let midheaven: CareerAdvancedResult['midheaven'] = null;
  if (astro?.houses && Array.isArray(astro.houses)) {
    const mc = astro.houses.find(h => h.number === 10);
    if (mc?.sign) {
      const mcElement = getWestElementFromSign(mc.sign);
      const interaction = ELEMENT_CORE_GRID[sajuEl]?.[mcElement];
      if (interaction) {
        midheaven = {
          sign: mc.sign,
          element: mcElement,
          sajuAlignment: {
            level: interaction.level,
            score: interaction.score,
            icon: interaction.icon,
            color: getInteractionColor(interaction.level),
            keyword: { ko: interaction.keyword, en: interaction.keywordEn },
            description: { ko: interaction.keyword, en: interaction.keywordEn },
          },
          publicImage: {
            ko: `${mc.sign} MC - 대중적 이미지`,
            en: `${mc.sign} MC - Public image`,
          },
        };
      }
    }
  }

  // 4. 커리어 타이밍
  const careerTiming: CareerAdvancedResult['careerTiming'] = [];
  const currentYear = new Date().getFullYear();
  const daeunList = extSaju?.daeun || [];
  const currentDaeun = daeunList.find(d => d.current || d.isCurrent);

  if (currentDaeun?.element) {
    const daeunEl = mapSajuElementToKo(currentDaeun.element);
    const interaction = ELEMENT_CORE_GRID[sajuEl]?.[getWestElementFromSign(daeunEl)];
    if (interaction) {
      careerTiming.push({
        period: `${currentDaeun.startAge || currentYear}세~`,
        icon: '🌟',
        strength: interaction.score >= 70 ? 'strong' : interaction.score >= 50 ? 'moderate' : 'weak',
        score: interaction.score,
        description: {
          ko: `${daeunEl} 대운 시기 - ${interaction.keyword}`,
          en: `${daeunEl} Daeun period - ${interaction.keywordEn}`,
        },
        goodFor: isKo ? ['커리어 발전', '새로운 도전'] : ['Career growth', 'New challenges'],
      });
    }
  }

  // 종합 점수
  const geokScore = geokgukCareer?.fusion.score || 0;
  const houseScore = houseCareerMap.length > 0 ? houseCareerMap.reduce((sum, h) => sum + (h.strength === 'strong' ? 80 : h.strength === 'moderate' ? 60 : 40), 0) / houseCareerMap.length : 0;
  const mcScore = midheaven?.sajuAlignment.score || 0;
  const careerScore = Math.round((geokScore + houseScore + mcScore) / 3);

  return {
    careerScore,
    geokgukCareer,
    houseCareerMap,
    midheaven,
    careerTiming,
  };
}

// ============================
// LoveTab Timing Analysis
// ============================

// Removed duplicate constant - now using shared LOVE_SHINSALS

export function getLoveTimingAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): LoveTimingResult | null {
  const isKo = lang === 'ko';
  if (!saju && !astro) return null;

  const extSaju = saju as ExtendedSajuData | undefined;
  const dayElement = saju?.dayMaster?.element || 'wood';
  const sajuEl = mapSajuElementToKo(dayElement);

  // 1. 현재 연애운
  const currentYear = new Date().getFullYear();
  const yearEl = mapSajuElementToKo('wood'); // 간단히 기본값 사용
  const yearInteraction = ELEMENT_CORE_GRID[sajuEl]?.[getWestElementFromSign(yearEl)];
  const loveScore = yearInteraction?.score || 50;

  const currentLuck = {
    icon: loveScore >= 70 ? '💖' : loveScore >= 50 ? '💕' : '💔',
    score: loveScore,
    message: {
      ko: loveScore >= 70 ? '연애운이 매우 좋아요!' : loveScore >= 50 ? '안정적인 연애 시기예요' : '내면 성장에 집중하세요',
      en: loveScore >= 70 ? 'Excellent love luck!' : loveScore >= 50 ? 'Stable love period' : 'Focus on inner growth',
    },
    timing: (loveScore >= 70 ? 'excellent' : loveScore >= 50 ? 'good' : 'neutral') as 'excellent' | 'good' | 'neutral',
  };

  // 2. 금성 타이밍
  let venusTiming: LoveTimingResult['venusTiming'] = null;
  if (astro?.planets) {
    const venus = astro.planets.find(p => p.name?.toLowerCase() === 'venus');
    if (venus?.sign) {
      const venusEl = getWestElementFromSign(venus.sign);
      const interaction = ELEMENT_CORE_GRID[sajuEl]?.[venusEl];
      if (interaction) {
        venusTiming = {
          sign: venus.sign,
          element: venusEl,
          fusion: {
            level: interaction.level,
            score: interaction.score,
            icon: interaction.icon,
            color: getInteractionColor(interaction.level),
            keyword: { ko: interaction.keyword, en: interaction.keywordEn },
            description: { ko: interaction.keyword, en: interaction.keywordEn },
          },
          loveStyle: {
            ko: `${venus.sign} 금성 - 당신의 사랑 스타일`,
            en: `Venus in ${venus.sign} - Your love style`,
          },
        };
      }
    }
  }

  // 3. 신살 연애 타이밍 (L8)
  const shinsalLoveTiming: LoveTimingResult['shinsalLoveTiming'] = [];
  // Using shared utility for shinsal extraction
  const shinsalList = extractShinsals(extSaju, LOVE_SHINSALS);

  for (const shinsal of shinsalList.slice(0, 3)) {
    const venusData = SHINSAL_PLANET_MATRIX[shinsal as ShinsalKind]?.['Venus'];
    if (venusData) {
      shinsalLoveTiming.push({
        shinsal,
        planet: 'Venus',
        fusion: {
          level: venusData.level,
          score: venusData.score,
          icon: venusData.icon,
          color: getInteractionColor(venusData.level),
          keyword: { ko: venusData.keyword, en: venusData.keywordEn },
          description: { ko: venusData.keyword, en: venusData.keywordEn },
        },
        timing: {
          ko: `${shinsal}이 연애운에 영향을 줍니다`,
          en: `${shinsal} affects love timing`,
        },
      });
    }
  }

  // 4. 행운의 시기
  const luckyPeriods: LoveTimingResult['luckyPeriods'] = [];
  const daeunList = extSaju?.daeun || [];
  const currentDaeun = daeunList.find(d => d.current || d.isCurrent);

  if (currentDaeun?.element) {
    const daeunEl = mapSajuElementToKo(currentDaeun.element);
    const interaction = ELEMENT_CORE_GRID[sajuEl]?.[getWestElementFromSign(daeunEl)];
    if (interaction && interaction.score >= 60) {
      luckyPeriods.push({
        period: `${currentDaeun.startAge || currentYear}세~`,
        icon: '💫',
        strength: interaction.score >= 70 ? 'strong' : 'moderate',
        score: interaction.score,
        description: {
          ko: `${daeunEl} 대운 - 좋은 연애 시기`,
          en: `${daeunEl} Daeun - Good love period`,
        },
        goodFor: isKo ? ['새로운 만남', '관계 발전'] : ['New meetings', 'Relationship growth'],
      });
    }
  }

  return {
    loveScore,
    currentLuck,
    venusTiming,
    shinsalLoveTiming,
    luckyPeriods,
  };
}

// ============================
// HiddenSelfTab Shadow Analysis
// ============================

// Removed duplicate constant - now using shared SHADOW_SHINSALS

export function getShadowPersonalityAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): ShadowPersonalityResult | null {
  const isKo = lang === 'ko';
  if (!saju && !astro) return null;

  const extSaju = saju as ExtendedSajuData | undefined;
  const dayElement = saju?.dayMaster?.element || 'wood';
  const sajuEl = mapSajuElementToKo(dayElement);

  // 1. 신살 그림자 (L8)
  const shinsalShadows: ShadowPersonalityResult['shinsalShadows'] = [];
  // Using shared utility for shinsal extraction
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
  if (astro?.planets) {
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
  if (astro?.planets) {
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

// ============================
// TimingTab Matrix Analysis
// ============================

export function getTimingMatrixAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): TimingMatrixResult | null {
  const isKo = lang === 'ko';
  if (!saju && !astro) return null;

  const extSaju = saju as ExtendedSajuData | undefined;
  const dayElement = saju?.dayMaster?.element || 'wood';
  const sajuEl = mapSajuElementToKo(dayElement);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentDay = new Date().getDate();

  // 1. 대운 타임라인
  const daeunTimeline: TimingMatrixResult['daeunTimeline'] = [];
  const daeunList = extSaju?.daeun || [];
  for (const daeun of daeunList.slice(0, 5)) {
    if (daeun.element && daeun.startAge !== undefined) {
      const daeunEl = mapSajuElementToKo(daeun.element);
      const interaction = ELEMENT_CORE_GRID[sajuEl]?.[getWestElementFromSign(daeunEl)];
      if (interaction) {
        daeunTimeline.push({
          startAge: daeun.startAge,
          endAge: daeun.startAge + 10,
          isCurrent: daeun.current || daeun.isCurrent || false,
          element: daeunEl,
          score: interaction.score,
          description: {
            ko: `${daeunEl} 대운 - ${interaction.keyword}`,
            en: `${daeunEl} Daeun - ${interaction.keywordEn}`,
          },
          icon: interaction.icon,
        });
      }
    }
  }

  // 2. 주요 트랜짓
  const majorTransits: TimingMatrixResult['majorTransits'] = [];
  const birthYear = extSaju?.birthYear || 1990;
  const age = currentYear - birthYear;

  if (age >= 28 && age <= 30) {
    majorTransits.push({
      transit: 'Saturn Return',
      planet: 'Saturn',
      timing: `${age}세`,
      score: 85,
      description: {
        ko: '토성회귀 - 중요한 전환기',
        en: 'Saturn Return - Major transition',
      },
      icon: '🪐',
    });
  }

  // 3. 역행 분석
  const retrogrades: TimingMatrixResult['retrogrades'] = [];
  const mercurySign = findPlanetSign(astro, 'mercury');
  if (mercurySign) {
    const mercuryEl = getWestElementFromSign(mercurySign);
    const interaction = ELEMENT_CORE_GRID[sajuEl]?.[mercuryEl];
    if (interaction) {
      retrogrades.push({
        planet: 'Mercury',
        element: mercuryEl,
        fusion: {
          level: interaction.level,
          score: interaction.score,
          icon: interaction.icon,
          color: getInteractionColor(interaction.level),
          keyword: { ko: interaction.keyword, en: interaction.keywordEn },
          description: { ko: interaction.keyword, en: interaction.keywordEn },
        },
        effect: {
          ko: '수성역행 시 소통과 기술에 주의',
          en: 'Be careful with communication and technology during Mercury retrograde',
        },
        advice: {
          ko: '중요한 계약이나 결정은 미루세요',
          en: 'Postpone important contracts or decisions',
        },
      });
    }
  }

  // 4. 시기별 행운
  const yearEl = mapSajuElementToKo('wood');
  const yearInteraction = ELEMENT_CORE_GRID[sajuEl]?.[getWestElementFromSign(yearEl)];
  const yearScore = yearInteraction?.score || 50;

  const periodLuck = {
    year: {
      element: yearEl,
      score: yearScore,
      description: {
        ko: `${currentYear}년 - ${yearInteraction?.keyword || '균형'}`,
        en: `Year ${currentYear} - ${yearInteraction?.keywordEn || 'Balance'}`,
      },
    },
    month: {
      element: mapSajuElementToKo('fire'),
      score: 60,
      description: {
        ko: `${currentMonth}월 운세`,
        en: `Month ${currentMonth} fortune`,
      },
    },
    day: {
      element: mapSajuElementToKo('earth'),
      score: 55,
      description: {
        ko: `${currentDay}일 운세`,
        en: `Day ${currentDay} fortune`,
      },
    },
  };

  // 5. 행운의 시기
  const luckyPeriods: TimingMatrixResult['luckyPeriods'] = [];
  const currentDaeun = daeunList.find(d => d.current || d.isCurrent);
  if (currentDaeun?.element) {
    const daeunEl = mapSajuElementToKo(currentDaeun.element);
    const interaction = ELEMENT_CORE_GRID[sajuEl]?.[getWestElementFromSign(daeunEl)];
    if (interaction && interaction.score >= 60) {
      luckyPeriods.push({
        icon: '⭐',
        period: `${currentDaeun.startAge}세~`,
        strength: interaction.score >= 70 ? 'strong' : 'moderate',
        score: interaction.score,
        description: {
          ko: `${daeunEl} 대운 - 좋은 시기`,
          en: `${daeunEl} Daeun - Good period`,
        },
        goodFor: isKo ? ['새로운 시작', '중요한 결정'] : ['New beginnings', 'Important decisions'],
      });
    }
  }

  // 종합 점수
  const daeunScore = currentDaeun && currentDaeun.element ? ELEMENT_CORE_GRID[sajuEl]?.[getWestElementFromSign(mapSajuElementToKo(currentDaeun.element))]?.score || 50 : 50;
  const overallScore = Math.round((yearScore + daeunScore) / 2);
  const overallMessage = {
    ko: overallScore >= 70
      ? '현재 전반적으로 좋은 타이밍입니다!'
      : overallScore >= 50
      ? '안정적인 시기입니다.'
      : '신중하게 움직이세요.',
    en: overallScore >= 70
      ? 'Overall good timing now!'
      : overallScore >= 50
      ? 'A stable period.'
      : 'Move carefully.',
  };

  return {
    overallScore,
    overallMessage,
    daeunTimeline,
    majorTransits,
    retrogrades,
    periodLuck,
    luckyPeriods,
  };
}
