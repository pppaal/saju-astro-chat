// matrixAnalyzer.ts
// Destiny Fusion Matrix™ 데이터를 활용한 고급 분석

import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { ELEMENT_CORE_GRID, SIGN_TO_ELEMENT } from '@/lib/destiny-matrix/data/layer1-element-core';
import { SIBSIN_PLANET_MATRIX, PLANET_KEYWORDS, SIBSIN_KEYWORDS } from '@/lib/destiny-matrix/data/layer2-sibsin-planet';
import { TWELVE_STAGE_HOUSE_MATRIX, TWELVE_STAGE_INFO } from '@/lib/destiny-matrix/data/layer6-stage-house';
import { SHINSAL_PLANET_MATRIX, SHINSAL_INFO } from '@/lib/destiny-matrix/data/layer8-shinsal-planet';
import { ASTEROID_HOUSE_MATRIX, ASTEROID_INFO } from '@/lib/destiny-matrix/data/layer9-asteroid-house';
import { SIBSIN_HOUSE_MATRIX, HOUSE_KEYWORDS } from '@/lib/destiny-matrix/data/layer3-sibsin-house';
// Layer 4, 5, 7, 10 추가
import { TIMING_OVERLAY_MATRIX } from '@/lib/destiny-matrix/data/layer4-timing-overlay';
import { RELATION_ASPECT_MATRIX } from '@/lib/destiny-matrix/data/layer5-relation-aspect';
import { ADVANCED_ANALYSIS_MATRIX } from '@/lib/destiny-matrix/data/layer7-advanced-analysis';
import { EXTRAPOINT_ELEMENT_MATRIX, EXTRAPOINT_SIBSIN_MATRIX, EXTRAPOINT_INFO } from '@/lib/destiny-matrix/data/layer10-extrapoint-element';
import type { WesternElement, HouseNumber, PlanetName, ShinsalKind, AsteroidName, TimingCycleRow, TransitCycle, BranchRelation, ExtraPointName, AdvancedAnalysisRow, ProgressionType, InteractionCode } from '@/lib/destiny-matrix/types';
import type { FiveElement, SibsinKind, TwelveStage, TwelveStageStandard } from '@/lib/Saju/types';
import { findPlanetSign } from '../utils/helpers';
import type { SajuData, AstroData } from '../types';

// ============================
// 타입 정의
// ============================

export interface MatrixFusion {
  level: string;
  score: number;
  icon: string;
  color: string;
  keyword: { ko: string; en: string };
  description: { ko: string; en: string };
}

export interface ElementFusionResult {
  sajuElement: string;
  westElement: string;
  fusion: MatrixFusion;
}

export interface SibsinPlanetResult {
  sibsin: string;
  planet: string;
  fusion: MatrixFusion;
  planetKeyword: { ko: string; en: string };
  sibsinKeyword: { ko: string; en: string };
}

export interface LifeCycleResult {
  stage: string;
  house: number;
  fusion: MatrixFusion;
  stageInfo: { ko: string; en: string };
  lifeArea: string;
}

export interface MatrixSynergyResult {
  topStrengths: Array<{
    area: string;
    score: number;
    icon: string;
    description: { ko: string; en: string };
  }>;
  topCautions: Array<{
    area: string;
    score: number;
    icon: string;
    description: { ko: string; en: string };
  }>;
  overallScore: number;
  dominantEnergy: { ko: string; en: string };
}

// 신살-행성 융합 결과
export interface ShinsalPlanetResult {
  shinsal: string;
  shinsalInfo: { ko: string; en: string; effect: string; effectEn: string };
  planet: string;
  fusion: MatrixFusion;
  category: 'lucky' | 'challenging' | 'special';
}

// 소행성-하우스 융합 결과
export interface AsteroidHouseResult {
  asteroid: string;
  asteroidInfo: { ko: string; en: string; theme: string; themeEn: string };
  house: number;
  fusion: MatrixFusion;
  lifeArea: string;
}

// 십신-하우스 융합 결과
export interface SibsinHouseResult {
  sibsin: string;
  sibsinKeyword: { ko: string; en: string };
  house: number;
  houseKeyword: { ko: string; en: string };
  fusion: MatrixFusion;
}

export interface MatrixAnalysisResult {
  elementFusions: ElementFusionResult[];
  sibsinPlanetFusions: SibsinPlanetResult[];
  lifeCycles: LifeCycleResult[];
  synergy: MatrixSynergyResult;
  fusionSummary: {
    extreme: number;
    amplify: number;
    balance: number;
    clash: number;
    conflict: number;
  };
}

// 사랑 관련 매트릭스 결과
export interface LoveMatrixResult {
  shinsalLove: ShinsalPlanetResult[];  // 도화살, 홍염살 등
  asteroidLove: AsteroidHouseResult[];  // Juno 등 결혼/연애 관련
  loveScore: number;
  loveMessage: { ko: string; en: string };
}

// 커리어 관련 매트릭스 결과
export interface CareerMatrixResult {
  sibsinCareer: SibsinHouseResult[];  // 10하우스 중심
  careerStrengths: Array<{ area: string; score: number; icon: string }>;
  careerScore: number;
  careerMessage: { ko: string; en: string };
}

// ============================
// Layer 4: 타이밍 오버레이 결과
// ============================
export interface TimingOverlayResult {
  timingCycle: string;  // daeunTransition, 목, 화, etc.
  transitCycle: string;  // saturnReturn, jupiterReturn, etc.
  fusion: MatrixFusion;
  timingInfo: { ko: string; en: string };
  transitInfo: { ko: string; en: string };
  advice?: string;
}

// ============================
// Layer 5: 관계-애스펙트 결과
// ============================
export interface RelationAspectResult {
  relation: string;  // samhap, yukhap, chung, etc.
  aspect: string;  // conjunction, trine, square, etc.
  fusion: MatrixFusion;
  relationInfo: { ko: string; en: string };
  aspectInfo: { ko: string; en: string };
  advice?: string;
}

// ============================
// Layer 7: 고급분석 (격국 × 프로그레션) 결과
// ============================
export interface AdvancedAnalysisResult {
  pattern: string;  // jeonggwan, pyeongwan, etc. (격국)
  progression: string;  // secondary, solarArc, solarReturn, etc.
  fusion: MatrixFusion;
  patternInfo: { ko: string; en: string };
  progressionInfo: { ko: string; en: string };
  advice?: string;
}

// ============================
// Layer 10: 엑스트라포인트 결과
// ============================
export interface ExtraPointResult {
  extraPoint: string;  // Chiron, Lilith, PartOfFortune, etc.
  element?: string;  // 오행 연결
  sibsin?: string;  // 십신 연결
  fusion: MatrixFusion;
  pointInfo: { ko: string; en: string; theme: string; themeEn: string };
  advice?: string;
}

// ============================
// 종합 Layer 분석 결과
// ============================
export interface FullMatrixAnalysisResult {
  // 기존 레이어 (1, 2, 3, 6, 8, 9)
  elementFusions: ElementFusionResult[];
  sibsinPlanetFusions: SibsinPlanetResult[];
  lifeCycles: LifeCycleResult[];
  synergy: MatrixSynergyResult;
  fusionSummary: {
    extreme: number;
    amplify: number;
    balance: number;
    clash: number;
    conflict: number;
  };
  // 새로운 레이어 (4, 5, 7, 10)
  timingOverlays?: TimingOverlayResult[];
  relationAspects?: RelationAspectResult[];
  advancedAnalysis?: AdvancedAnalysisResult[];
  extraPoints?: ExtraPointResult[];
}

// 사주 데이터 확장 타입 (sibsin, twelveStages 포함)
// SajuData와 별도 인터페이스로 정의 (확장 아닌 독립 타입)
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
  // 고급 분석 데이터 (SajuData와 동일 구조)
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
// 헬퍼 함수
// ============================

// 오행(한글) → 서양 원소 매핑
function mapSajuElementToWestern(element: string): 'fire' | 'earth' | 'air' | 'water' {
  const mapping: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
    '목': 'air',    // 목 → 바람 (성장, 확장)
    '화': 'fire',   // 화 → 불
    '토': 'earth',  // 토 → 흙
    '금': 'air',    // 금 → 바람 (날카로움, 결단)
    '수': 'water',  // 수 → 물
    'wood': 'air',
    'fire': 'fire',
    'earth': 'earth',
    'metal': 'air',
    'water': 'water',
  };
  return mapping[element] || 'earth';
}

function getLevelDescription(level: string, isKo: boolean): string {
  const descriptions: Record<string, { ko: string; en: string }> = {
    extreme: { ko: '극강 시너지', en: 'Extreme Synergy' },
    amplify: { ko: '증폭 효과', en: 'Amplified Effect' },
    balance: { ko: '균형 상태', en: 'Balanced State' },
    clash: { ko: '긴장 관계', en: 'Tension' },
    conflict: { ko: '상충 에너지', en: 'Conflicting Energy' },
  };
  return isKo ? descriptions[level]?.ko || level : descriptions[level]?.en || level;
}

// 오행 한글명
const elementNameKo: Record<string, string> = {
  '목': '나무',
  '화': '불',
  '토': '흙',
  '금': '쇠',
  '수': '물',
};

// 서양 원소 한글명
const westElementNameKo: Record<string, string> = {
  'fire': '불',
  'earth': '흙',
  'air': '바람',
  'water': '물',
};

// 융합 설명 생성 (한국어)
function getFusionDescriptionKo(sajuEl: string, westEl: string, planet: string, level: string): string {
  const sajuName = elementNameKo[sajuEl] || sajuEl;
  const westName = westElementNameKo[westEl] || westEl;

  const levelMessages: Record<string, string> = {
    extreme: `당신의 ${sajuName} 기운과 ${planet}의 ${westName} 에너지가 완벽하게 공명해요!`,
    amplify: `${sajuName} 기운이 ${planet}의 ${westName} 에너지와 만나 더욱 강해져요.`,
    balance: `${sajuName} 기운과 ${planet}의 ${westName} 에너지가 조화롭게 균형을 이뤄요.`,
    clash: `${sajuName} 기운과 ${planet}의 ${westName} 에너지 사이에 약간의 긴장감이 있어요.`,
    conflict: `${sajuName} 기운과 ${planet}의 ${westName} 에너지가 서로 다른 방향을 향해요.`,
  };

  return levelMessages[level] || `${sajuName} 기운과 ${planet}의 ${westName} 에너지가 만났어요.`;
}

// 융합 설명 생성 (영어)
function getFusionDescriptionEn(sajuEl: string, westEl: string, planet: string, level: string): string {
  const levelMessages: Record<string, string> = {
    extreme: `Your ${sajuEl} energy and ${planet}'s ${westEl} element resonate perfectly!`,
    amplify: `Your ${sajuEl} energy is amplified by ${planet}'s ${westEl} element.`,
    balance: `Your ${sajuEl} energy harmonizes with ${planet}'s ${westEl} element.`,
    clash: `There's some tension between your ${sajuEl} energy and ${planet}'s ${westEl} element.`,
    conflict: `Your ${sajuEl} energy and ${planet}'s ${westEl} element pull in different directions.`,
  };

  return levelMessages[level] || `Your ${sajuEl} energy meets ${planet}'s ${westEl} element.`;
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

// ============================
// 메인 분석 함수
// ============================

export function getMatrixAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): MatrixAnalysisResult | null {
  const isKo = lang === 'ko';

  if (!saju && !astro) return null;

  // 타입 캐스팅
  const extSaju = saju as ExtendedSajuData | undefined;

  // 1. 오행-서양원소 융합 분석
  const elementFusions: ElementFusionResult[] = [];
  const dayElement = saju?.dayMaster?.element || 'wood';
  const sajuEl = mapSajuElementToKo(dayElement);
  const sunSign = findPlanetSign(astro, 'sun');
  const moonSign = findPlanetSign(astro, 'moon');

  // 일간 vs 태양 별자리 원소
  if (sunSign) {
    const westEl = getWestElementFromSign(sunSign);
    const interaction = ELEMENT_CORE_GRID[sajuEl]?.[westEl];
    if (interaction) {
      elementFusions.push({
        sajuElement: sajuEl,
        westElement: westEl,
        fusion: {
          level: interaction.level,
          score: interaction.score,
          icon: interaction.icon,
          color: getInteractionColor(interaction.level),
          keyword: { ko: interaction.keyword, en: interaction.keywordEn },
          description: {
            ko: getFusionDescriptionKo(sajuEl, westEl, '태양', interaction.level),
            en: getFusionDescriptionEn(sajuEl, westEl, 'Sun', interaction.level),
          },
        },
      });
    }
  }

  // 일간 vs 달 별자리 원소
  if (moonSign) {
    const westEl = getWestElementFromSign(moonSign);
    const interaction = ELEMENT_CORE_GRID[sajuEl]?.[westEl];
    if (interaction) {
      elementFusions.push({
        sajuElement: sajuEl,
        westElement: westEl,
        fusion: {
          level: interaction.level,
          score: interaction.score,
          icon: interaction.icon,
          color: getInteractionColor(interaction.level),
          keyword: { ko: interaction.keyword, en: interaction.keywordEn },
          description: {
            ko: getFusionDescriptionKo(sajuEl, westEl, '달', interaction.level),
            en: getFusionDescriptionEn(sajuEl, westEl, 'Moon', interaction.level),
          },
        },
      });
    }
  }

  // 2. 십신-행성 융합 분석
  const sibsinPlanetFusions: SibsinPlanetResult[] = [];
  const sibsinList = extSaju?.sibsin || {};
  const planets: Array<{ name: PlanetName; signKey: string }> = [
    { name: 'Sun', signKey: 'sun' },
    { name: 'Moon', signKey: 'moon' },
    { name: 'Mercury', signKey: 'mercury' },
    { name: 'Venus', signKey: 'venus' },
    { name: 'Mars', signKey: 'mars' },
    { name: 'Jupiter', signKey: 'jupiter' },
    { name: 'Saturn', signKey: 'saturn' },
  ];

  // 주요 십신 3개 선택
  const mainSibsin: SibsinKind[] = [];
  if (sibsinList.year) mainSibsin.push(sibsinList.year);
  if (sibsinList.month) mainSibsin.push(sibsinList.month);
  if (sibsinList.hour) mainSibsin.push(sibsinList.hour);

  for (const sibsin of mainSibsin.slice(0, 3)) {
    for (const planet of planets.slice(0, 4)) {
      const interaction = SIBSIN_PLANET_MATRIX[sibsin]?.[planet.name];
      if (interaction && (interaction.level === 'extreme' || interaction.level === 'amplify' || interaction.level === 'conflict')) {
        const planetKw = PLANET_KEYWORDS[planet.name];
        const sibsinKw = SIBSIN_KEYWORDS[sibsin];
        sibsinPlanetFusions.push({
          sibsin,
          planet: planet.name,
          fusion: {
            level: interaction.level,
            score: interaction.score,
            icon: interaction.icon,
            color: getInteractionColor(interaction.level),
            keyword: { ko: interaction.keyword, en: interaction.keywordEn },
            description: {
              ko: `${sibsin} × ${planet.name} = ${interaction.keyword}`,
              en: `${sibsin} × ${planet.name} = ${interaction.keywordEn}`,
            },
          },
          planetKeyword: planetKw,
          sibsinKeyword: sibsinKw,
        });
      }
    }
  }

  // 3. 12운성-하우스 생명력 분석
  const lifeCycles: LifeCycleResult[] = [];
  const twelveStages = extSaju?.twelveStages || {};
  const planetHouses: Partial<Record<PlanetName, number>> = {};

  // 행성 하우스 매핑
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

  // 4. 시너지 종합
  const allFusions = [
    ...elementFusions.map((f) => f.fusion),
    ...sibsinPlanetFusions.map((f) => f.fusion),
    ...lifeCycles.map((f) => f.fusion),
  ];

  const fusionSummary = {
    extreme: allFusions.filter((f) => f.level === 'extreme').length,
    amplify: allFusions.filter((f) => f.level === 'amplify').length,
    balance: allFusions.filter((f) => f.level === 'balance').length,
    clash: allFusions.filter((f) => f.level === 'clash').length,
    conflict: allFusions.filter((f) => f.level === 'conflict').length,
  };

  const totalScore = allFusions.reduce((sum, f) => sum + f.score, 0);
  const avgScore = allFusions.length > 0 ? Math.round((totalScore / allFusions.length) * 10) / 10 : 5;

  // 강점 추출
  const topStrengths = allFusions
    .filter((f) => f.level === 'extreme' || (f.level === 'amplify' && f.score >= 8))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((f) => ({
      area: isKo ? f.keyword.ko : f.keyword.en,
      score: f.score,
      icon: f.icon,
      description: f.description,
    }));

  // 주의점 추출
  const topCautions = allFusions
    .filter((f) => f.level === 'conflict' || (f.level === 'clash' && f.score <= 4))
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map((f) => ({
      area: isKo ? f.keyword.ko : f.keyword.en,
      score: f.score,
      icon: f.icon,
      description: f.description,
    }));

  // 지배적 에너지
  let dominantEnergy = { ko: '균형', en: 'Balance' };
  if (fusionSummary.extreme >= 2) {
    dominantEnergy = { ko: '극강 시너지', en: 'Extreme Synergy' };
  } else if (fusionSummary.amplify >= 3) {
    dominantEnergy = { ko: '증폭 에너지', en: 'Amplified Energy' };
  } else if (fusionSummary.conflict >= 2) {
    dominantEnergy = { ko: '변혁 에너지', en: 'Transformative Energy' };
  }

  return {
    elementFusions,
    sibsinPlanetFusions,
    lifeCycles,
    synergy: {
      topStrengths,
      topCautions,
      overallScore: avgScore,
      dominantEnergy,
    },
    fusionSummary,
  };
}

// ============================
// 개별 조회 함수
// ============================

export function getElementFusionDescription(
  sajuElement: FiveElement,
  westElement: WesternElement,
  lang: string
): string | null {
  const isKo = lang === 'ko';
  const interaction = ELEMENT_CORE_GRID[sajuElement]?.[westElement];
  if (!interaction) return null;

  const levelDesc = getLevelDescription(interaction.level, isKo);
  return isKo
    ? `${sajuElement}(사주) × ${westElement}(서양) = ${interaction.keyword} (${levelDesc}, 점수: ${interaction.score}/10)`
    : `${sajuElement}(Saju) × ${westElement}(Western) = ${interaction.keywordEn} (${levelDesc}, Score: ${interaction.score}/10)`;
}

export function getSibsinPlanetDescription(
  sibsin: SibsinKind,
  planet: PlanetName,
  lang: string
): string | null {
  const isKo = lang === 'ko';
  const interaction = SIBSIN_PLANET_MATRIX[sibsin]?.[planet];
  if (!interaction) return null;

  const sibsinKw = SIBSIN_KEYWORDS[sibsin];
  const planetKw = PLANET_KEYWORDS[planet];

  return isKo
    ? `${sibsin}(${sibsinKw.ko}) × ${planet}(${planetKw.ko}) = ${interaction.keyword} ${interaction.icon}`
    : `${sibsin}(${sibsinKw.en}) × ${planet}(${planetKw.en}) = ${interaction.keywordEn} ${interaction.icon}`;
}

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

// ============================
// 사랑 매트릭스 분석 (LoveTab용)
// ============================

export function getLoveMatrixAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): LoveMatrixResult | null {
  const isKo = lang === 'ko';

  if (!saju && !astro) return null;

  const extSaju = saju as ExtendedSajuData | undefined;
  const shinsalLove: ShinsalPlanetResult[] = [];
  const asteroidLove: AsteroidHouseResult[] = [];

  // 1. 신살-행성 분석 (사랑 관련: 도화, 홍염살 중심)
  const loveShinsals: ShinsalKind[] = ['도화', '홍염살', '천을귀인', '월덕귀인', '반안'];
  const lovePlanets: PlanetName[] = ['Venus', 'Mars', 'Moon', 'Neptune'];
  const shinsalList = extSaju?.shinsal || saju?.sinsal || [];

  // 사주에서 신살 추출 (배열 또는 객체 형태 처리)
  const userShinsals: ShinsalKind[] = [];
  if (Array.isArray(shinsalList)) {
    for (const s of shinsalList) {
      const name = typeof s === 'string' ? s : (s as { name?: string; shinsal?: string })?.name || (s as { shinsal?: string })?.shinsal;
      if (name && loveShinsals.includes(name as ShinsalKind)) {
        userShinsals.push(name as ShinsalKind);
      }
    }
  } else if (typeof shinsalList === 'object' && shinsalList !== null) {
    for (const key of Object.keys(shinsalList as Record<string, unknown>)) {
      const val = (shinsalList as Record<string, unknown>)[key];
      if (Array.isArray(val)) {
        for (const v of val) {
          const name = typeof v === 'string' ? v : (v as { name?: string })?.name;
          if (name && loveShinsals.includes(name as ShinsalKind)) {
            userShinsals.push(name as ShinsalKind);
          }
        }
      }
    }
  }

  // 신살-행성 매트릭스 분석
  for (const shinsal of userShinsals) {
    for (const planet of lovePlanets) {
      const interaction = SHINSAL_PLANET_MATRIX[shinsal]?.[planet];
      const info = SHINSAL_INFO[shinsal];
      if (interaction && info) {
        shinsalLove.push({
          shinsal,
          shinsalInfo: { ko: info.ko, en: info.en, effect: info.effect, effectEn: info.effectEn },
          planet,
          fusion: {
            level: interaction.level,
            score: interaction.score,
            icon: interaction.icon,
            color: getInteractionColor(interaction.level),
            keyword: { ko: interaction.keyword, en: interaction.keywordEn },
            description: {
              ko: `${shinsal} × ${planet} = ${interaction.keyword}`,
              en: `${shinsal} × ${planet} = ${interaction.keywordEn}`,
            },
          },
          category: info.category,
        });
      }
    }
  }

  // 2. 소행성-하우스 분석 (Juno 중심)
  const loveAsteroids: AsteroidName[] = ['Juno', 'Ceres'];

  // astro에서 소행성 정보 추출
  const astroWithAsteroids = astro as AstroData & { asteroids?: Array<{ name?: string; house?: number }> };
  if (astroWithAsteroids?.asteroids || astro?.planets) {
    const asteroidData = astroWithAsteroids?.asteroids || [];
    const planetData = astro?.planets || [];

    for (const asteroid of loveAsteroids) {
      // asteroids 배열에서 찾기
      let asteroidInfo = Array.isArray(asteroidData) ? asteroidData.find((a) =>
        a?.name?.toLowerCase() === asteroid.toLowerCase()
      ) : undefined;

      // planets 배열에서도 찾기 (일부 시스템에서 소행성을 planets에 포함)
      if (!asteroidInfo && Array.isArray(planetData)) {
        asteroidInfo = planetData.find((p) =>
          p?.name?.toLowerCase() === asteroid.toLowerCase()
        );
      }

      if (asteroidInfo?.house) {
        const house = asteroidInfo.house as HouseNumber;
        const interaction = ASTEROID_HOUSE_MATRIX[asteroid]?.[house];
        const info = ASTEROID_INFO[asteroid];

        if (interaction && info) {
          asteroidLove.push({
            asteroid,
            asteroidInfo: { ko: info.ko, en: info.en, theme: info.theme, themeEn: info.themeEn },
            house,
            fusion: {
              level: interaction.level,
              score: interaction.score,
              icon: interaction.icon,
              color: getInteractionColor(interaction.level),
              keyword: { ko: interaction.keyword, en: interaction.keywordEn },
              description: {
                ko: `${info.ko} × ${house}하우스 = ${interaction.keyword}`,
                en: `${info.en} × House ${house} = ${interaction.keywordEn}`,
              },
            },
            lifeArea: getHouseLifeArea(house, isKo),
          });
        }
      }
    }
  }

  // 3. 점수 및 메시지 계산
  const allScores = [
    ...shinsalLove.map(s => s.fusion.score),
    ...asteroidLove.map(a => a.fusion.score),
  ];

  const loveScore = allScores.length > 0
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length * 10)
    : 65;

  // 사랑 메시지 생성
  const hasDoHwa = userShinsals.includes('도화' as ShinsalKind);
  const hasHongYeom = userShinsals.includes('홍염살' as ShinsalKind);
  const hasJuno7H = asteroidLove.some(a => a.asteroid === 'Juno' && a.house === 7);

  let loveMessage = { ko: '균형 잡힌 연애 에너지를 가지고 있어요.', en: 'You have balanced romantic energy.' };

  if (hasDoHwa && hasHongYeom) {
    loveMessage = {
      ko: '강렬한 연애 에너지! 이성에게 매우 매력적이지만 감정 조절이 필요해요.',
      en: 'Intense romantic energy! Very attractive but needs emotional control.',
    };
  } else if (hasDoHwa) {
    loveMessage = {
      ko: '도화살의 매력! 자연스러운 이성 인연이 많아요.',
      en: 'Peach blossom charm! Natural romantic connections abound.',
    };
  } else if (hasJuno7H) {
    loveMessage = {
      ko: '결혼 운이 강해요! 파트너십에서 헌신과 충실함을 발휘해요.',
      en: 'Strong marriage luck! You excel in partnership devotion and loyalty.',
    };
  }

  return {
    shinsalLove,
    asteroidLove,
    loveScore,
    loveMessage,
  };
}

// ============================
// 커리어 매트릭스 분석 (CareerTab용)
// ============================

export function getCareerMatrixAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): CareerMatrixResult | null {
  const isKo = lang === 'ko';

  if (!saju && !astro) return null;

  const extSaju = saju as ExtendedSajuData | undefined;
  const sibsinCareer: SibsinHouseResult[] = [];
  const careerStrengths: Array<{ area: string; score: number; icon: string }> = [];

  // 1. 십신-하우스 분석 (10하우스 중심)
  const careerHouses: HouseNumber[] = [10, 6, 2]; // 커리어, 직장, 재물
  const sibsinList = extSaju?.sibsin || {};

  // 각 기둥의 십신 추출
  const allSibsin: SibsinKind[] = [];
  if (sibsinList.year) allSibsin.push(sibsinList.year);
  if (sibsinList.month) allSibsin.push(sibsinList.month);
  if (sibsinList.day) allSibsin.push(sibsinList.day);
  if (sibsinList.hour) allSibsin.push(sibsinList.hour);

  // 십신-하우스 매트릭스 분석
  for (const sibsin of allSibsin) {
    for (const house of careerHouses) {
      const interaction = SIBSIN_HOUSE_MATRIX[sibsin]?.[house];
      const sibsinKw = SIBSIN_KEYWORDS[sibsin];
      const houseKw = HOUSE_KEYWORDS[house];

      if (interaction && sibsinKw && houseKw) {
        sibsinCareer.push({
          sibsin,
          sibsinKeyword: sibsinKw,
          house,
          houseKeyword: houseKw,
          fusion: {
            level: interaction.level,
            score: interaction.score,
            icon: interaction.icon,
            color: getInteractionColor(interaction.level),
            keyword: { ko: interaction.keyword, en: interaction.keywordEn },
            description: {
              ko: `${sibsin}(${sibsinKw.ko}) × ${house}H = ${interaction.keyword}`,
              en: `${sibsin}(${sibsinKw.en}) × H${house} = ${interaction.keywordEn}`,
            },
          },
        });
      }
    }
  }

  // 2. 커리어 강점 추출
  const strengthMap = new Map<string, { score: number; icon: string }>();

  for (const item of sibsinCareer) {
    if (item.fusion.level === 'extreme' || item.fusion.level === 'amplify') {
      const key = isKo ? item.fusion.keyword.ko : item.fusion.keyword.en;
      const existing = strengthMap.get(key);
      if (!existing || existing.score < item.fusion.score) {
        strengthMap.set(key, { score: item.fusion.score, icon: item.fusion.icon });
      }
    }
  }

  for (const [area, data] of strengthMap) {
    careerStrengths.push({ area, score: data.score, icon: data.icon });
  }
  careerStrengths.sort((a, b) => b.score - a.score);

  // 3. 점수 및 메시지 계산
  const careerScores = sibsinCareer.filter(s => s.house === 10).map(s => s.fusion.score);
  const careerScore = careerScores.length > 0
    ? Math.round(careerScores.reduce((a, b) => a + b, 0) / careerScores.length * 10)
    : 65;

  // 커리어 메시지 생성
  const has10HExtreme = sibsinCareer.some(s => s.house === 10 && s.fusion.level === 'extreme');
  const has10HConflict = sibsinCareer.some(s => s.house === 10 && s.fusion.level === 'conflict');
  const hasJeongGwan10H = sibsinCareer.some(s => s.sibsin === '정관' && s.house === 10);
  const hasPyeonJae10H = sibsinCareer.some(s => s.sibsin === '편재' && s.house === 10);

  let careerMessage = { ko: '균형 잡힌 직업 에너지를 가지고 있어요.', en: 'You have balanced career energy.' };

  if (hasJeongGwan10H) {
    careerMessage = {
      ko: '정관의 권위! 조직에서 인정받고 승진하기 좋은 구조예요.',
      en: 'Authority of proper official! Great structure for recognition and promotion.',
    };
  } else if (hasPyeonJae10H) {
    careerMessage = {
      ko: '편재의 사업운! 자영업이나 투자에서 성공 가능성이 높아요.',
      en: 'Business luck! High potential for success in self-employment or investment.',
    };
  } else if (has10HExtreme) {
    careerMessage = {
      ko: '커리어에서 극강의 에너지가 흐르고 있어요! 적극적으로 도전하세요.',
      en: 'Extreme energy flows in your career! Challenge actively.',
    };
  } else if (has10HConflict) {
    careerMessage = {
      ko: '커리어에 긴장이 있어요. 이것은 성장의 기회! 신중하게 접근하세요.',
      en: 'Tension in career. This is a growth opportunity! Approach carefully.',
    };
  }

  return {
    sibsinCareer: sibsinCareer.slice(0, 12), // 최대 12개
    careerStrengths: careerStrengths.slice(0, 5),
    careerScore,
    careerMessage,
  };
}

// ============================
// Layer 4: 타이밍 오버레이 분석
// ============================

// 타이밍 주기 한글/영어명
const TIMING_CYCLE_NAMES: Record<string, { ko: string; en: string }> = {
  daeunTransition: { ko: '대운 전환기', en: 'Major Luck Transition' },
  '목': { ko: '목(木) 세운', en: 'Wood Year' },
  '화': { ko: '화(火) 세운', en: 'Fire Year' },
  '토': { ko: '토(土) 세운', en: 'Earth Year' },
  '금': { ko: '금(金) 세운', en: 'Metal Year' },
  '수': { ko: '수(水) 세운', en: 'Water Year' },
  shortTerm: { ko: '단기운', en: 'Short-term' },
  wolun: { ko: '월운', en: 'Monthly Luck' },
  ilun: { ko: '일운', en: 'Daily Luck' },
};

// 트랜짓 주기 한글/영어명
const TRANSIT_CYCLE_NAMES: Record<string, { ko: string; en: string }> = {
  saturnReturn: { ko: '토성회귀', en: 'Saturn Return' },
  jupiterReturn: { ko: '목성회귀', en: 'Jupiter Return' },
  uranusSquare: { ko: '천왕성스퀘어', en: 'Uranus Square' },
  neptuneSquare: { ko: '해왕성스퀘어', en: 'Neptune Square' },
  plutoTransit: { ko: '명왕성트랜짓', en: 'Pluto Transit' },
  nodeReturn: { ko: '노드회귀', en: 'Node Return' },
  eclipse: { ko: '일식/월식', en: 'Eclipse' },
  mercuryRetrograde: { ko: '수성역행', en: 'Mercury Retrograde' },
  venusRetrograde: { ko: '금성역행', en: 'Venus Retrograde' },
  marsRetrograde: { ko: '화성역행', en: 'Mars Retrograde' },
  jupiterRetrograde: { ko: '목성역행', en: 'Jupiter Retrograde' },
  saturnRetrograde: { ko: '토성역행', en: 'Saturn Retrograde' },
};

export function getTimingOverlayAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): TimingOverlayResult[] {
  const isKo = lang === 'ko';
  const results: TimingOverlayResult[] = [];

  if (!saju && !astro) return results;

  const extSaju = saju as ExtendedSajuData | undefined;

  // 일간 오행으로 세운 결정
  const dayElement = saju?.dayMaster?.element || 'wood';
  const sajuEl = mapSajuElementToKo(dayElement);

  // 주요 트랜짓 주기 분석 (Saturn Return, Jupiter Return, Eclipse 중심)
  const mainTransits: TransitCycle[] = ['saturnReturn', 'jupiterReturn', 'eclipse', 'mercuryRetrograde'];

  for (const transit of mainTransits) {
    // 세운 오행과 트랜짓의 조합 분석
    const timingData = TIMING_OVERLAY_MATRIX[sajuEl as TimingCycleRow];
    if (timingData && timingData[transit]) {
      const interaction = timingData[transit];
      const timingInfo = TIMING_CYCLE_NAMES[sajuEl] || { ko: sajuEl, en: sajuEl };
      const transitInfo = TRANSIT_CYCLE_NAMES[transit] || { ko: transit, en: transit };

      results.push({
        timingCycle: sajuEl,
        transitCycle: transit,
        fusion: {
          level: interaction.level,
          score: interaction.score,
          icon: interaction.icon,
          color: getInteractionColor(interaction.level),
          keyword: { ko: interaction.keyword, en: interaction.keywordEn },
          description: {
            ko: `${timingInfo.ko} × ${transitInfo.ko} = ${interaction.keyword}`,
            en: `${timingInfo.en} × ${transitInfo.en} = ${interaction.keywordEn}`,
          },
        },
        timingInfo,
        transitInfo,
        advice: (interaction as InteractionCode & { advice?: string }).advice,
      });
    }
  }

  return results.slice(0, 6); // 최대 6개
}

// ============================
// Layer 5: 관계-애스펙트 분석
// ============================

// 지지 관계 한글/영어명
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

// 애스펙트 한글/영어명
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

export function getRelationAspectAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): RelationAspectResult[] {
  const isKo = lang === 'ko';
  const results: RelationAspectResult[] = [];

  if (!saju && !astro) return results;

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

// ============================
// Layer 7: 고급분석 (격국 × 프로그레션)
// ============================

// 격국 한글/영어명
const PATTERN_NAMES: Record<string, { ko: string; en: string }> = {
  jeonggwan: { ko: '정관격', en: 'Proper Authority' },
  pyeongwan: { ko: '편관격', en: 'Partial Authority' },
  jeongin: { ko: '정인격', en: 'Proper Seal' },
  pyeonin: { ko: '편인격', en: 'Partial Seal' },
  siksin: { ko: '식신격', en: 'Eating God' },
  sanggwan: { ko: '상관격', en: 'Hurting Officer' },
  jeongjae: { ko: '정재격', en: 'Proper Wealth' },
  pyeonjae: { ko: '편재격', en: 'Partial Wealth' },
};

// 프로그레션 한글/영어명
const PROGRESSION_NAMES: Record<string, { ko: string; en: string }> = {
  secondary: { ko: '세컨더리', en: 'Secondary Progression' },
  solarArc: { ko: '솔라아크', en: 'Solar Arc' },
  solarReturn: { ko: '솔라리턴', en: 'Solar Return' },
  lunarReturn: { ko: '루나리턴', en: 'Lunar Return' },
  draconic: { ko: '드라코닉', en: 'Draconic' },
  harmonics: { ko: '하모닉스', en: 'Harmonics' },
};

export function getAdvancedAnalysisResult(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): AdvancedAnalysisResult[] {
  const isKo = lang === 'ko';
  const results: AdvancedAnalysisResult[] = [];

  if (!saju && !astro) return results;

  const extSaju = saju as ExtendedSajuData | undefined;

  // 실제 격국 데이터에서 추출 시도
  const geokgukData = extSaju?.advancedAnalysis?.geokguk;
  const geokgukName = geokgukData?.name || geokgukData?.type || '';

  // 격국 이름에서 패턴 매핑
  const geokgukToPattern: Record<string, AdvancedAnalysisRow> = {
    '정관격': 'jeonggwan', '정관': 'jeonggwan', 'jeonggwan': 'jeonggwan',
    '편관격': 'pyeongwan', '편관': 'pyeongwan', 'pyeongwan': 'pyeongwan',
    '정인격': 'jeongin', '정인': 'jeongin', 'jeongin': 'jeongin',
    '편인격': 'pyeongin', '편인': 'pyeongin', 'pyeongin': 'pyeongin',
    '식신격': 'siksin', '식신': 'siksin', 'siksin': 'siksin',
    '상관격': 'sanggwan', '상관': 'sanggwan', 'sanggwan': 'sanggwan',
    '정재격': 'jeongjae', '정재': 'jeongjae', 'jeongjae': 'jeongjae',
    '편재격': 'pyeonjae', '편재': 'pyeonjae', 'pyeonjae': 'pyeonjae',
  };

  // 실제 격국 데이터가 있으면 사용, 없으면 일간 오행 기반 추정
  let pattern: AdvancedAnalysisRow;
  if (geokgukName && geokgukToPattern[geokgukName]) {
    pattern = geokgukToPattern[geokgukName];
  } else {
    // 일간 오행 기반 기본 격국 추정
    const dayElement = saju?.dayMaster?.element || 'wood';
    const elementToPattern: Record<string, AdvancedAnalysisRow> = {
      wood: 'jeongin',
      fire: 'siksin',
      earth: 'jeongjae',
      metal: 'jeonggwan',
      water: 'pyeongin',
    };
    pattern = elementToPattern[dayElement] || 'jeonggwan';
  }

  // 실제 프로그레션 데이터 확인
  const progressions: ProgressionType[] = [];

  // astro 데이터에서 프로그레션 정보 추출
  if (astro?.solarReturn) progressions.push('solarReturn');
  if (astro?.lunarReturn) progressions.push('lunarReturn');
  if (astro?.progressions?.secondary) progressions.push('secondary');
  if (astro?.progressions?.solarArc) progressions.push('solarArc');
  if (astro?.draconic) progressions.push('draconic');
  if (astro?.harmonics) progressions.push('harmonics');

  // 프로그레션 데이터가 없으면 기본값 사용
  const useProgressions: ProgressionType[] = progressions.length > 0
    ? progressions
    : ['solarReturn', 'secondary', 'harmonics'];

  for (const prog of useProgressions) {
    const patternData = ADVANCED_ANALYSIS_MATRIX[pattern];
    if (patternData && patternData[prog]) {
      const interaction = patternData[prog];
      const patternInfo = PATTERN_NAMES[pattern] || { ko: pattern, en: pattern };
      const progressionInfo = PROGRESSION_NAMES[prog] || { ko: prog, en: prog };

      results.push({
        pattern,
        progression: prog,
        fusion: {
          level: interaction.level,
          score: interaction.score,
          icon: interaction.icon,
          color: getInteractionColor(interaction.level),
          keyword: { ko: interaction.keyword, en: interaction.keywordEn },
          description: {
            ko: `${patternInfo.ko} × ${progressionInfo.ko} = ${interaction.keyword}`,
            en: `${patternInfo.en} × ${progressionInfo.en} = ${interaction.keywordEn}`,
          },
        },
        patternInfo,
        progressionInfo,
        advice: (interaction as InteractionCode & { advice?: string }).advice,
      });
    }
  }

  return results.slice(0, 5); // 최대 5개
}

// ============================
// Layer 10: 엑스트라포인트 분석
// ============================

export function getExtraPointAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): ExtraPointResult[] {
  const isKo = lang === 'ko';
  const results: ExtraPointResult[] = [];

  if (!saju && !astro) return results;

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

  if (extraPointsData?.chiron) availablePoints.push('Chiron');
  if (extraPointsData?.lilith) availablePoints.push('Lilith');
  if (extraPointsData?.partOfFortune) availablePoints.push('PartOfFortune');
  if (extraPointsData?.vertex) availablePoints.push('Vertex');

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
    if (!pointInfo) continue;

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

// ============================
// 전체 레이어 통합 분석 함수
// ============================

export function getFullMatrixAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): FullMatrixAnalysisResult | null {
  // 기존 분석 결과
  const baseResult = getMatrixAnalysis(saju, astro, lang);
  if (!baseResult) return null;

  // 새로운 레이어 분석 추가
  const timingOverlays = getTimingOverlayAnalysis(saju, astro, lang);
  const relationAspects = getRelationAspectAnalysis(saju, astro, lang);
  const advancedAnalysis = getAdvancedAnalysisResult(saju, astro, lang);
  const extraPoints = getExtraPointAnalysis(saju, astro, lang);

  return {
    ...baseResult,
    timingOverlays,
    relationAspects,
    advancedAnalysis,
    extraPoints,
  };
}

// ============================
// HealthTab용 분석 함수들
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

// 오행별 건강 취약 부위 매핑
const ELEMENT_HEALTH_MAP: Record<string, { organs: string[]; organEn: string[]; warning: string; warningEn: string }> = {
  '목': { organs: ['간', '담낭', '눈', '근육', '신경'], organEn: ['Liver', 'Gallbladder', 'Eyes', 'Muscles', 'Nerves'], warning: '스트레스와 분노 조절이 중요해요', warningEn: 'Stress and anger management is important' },
  '화': { organs: ['심장', '소장', '혈압', '혀'], organEn: ['Heart', 'Small intestine', 'Blood pressure', 'Tongue'], warning: '과로와 흥분을 피하세요', warningEn: 'Avoid overwork and excitement' },
  '토': { organs: ['위장', '비장', '소화기', '입술'], organEn: ['Stomach', 'Spleen', 'Digestive system', 'Lips'], warning: '규칙적인 식사가 중요해요', warningEn: 'Regular meals are important' },
  '금': { organs: ['폐', '대장', '피부', '코'], organEn: ['Lungs', 'Large intestine', 'Skin', 'Nose'], warning: '호흡기와 피부 관리가 필요해요', warningEn: 'Respiratory and skin care needed' },
  '수': { organs: ['신장', '방광', '귀', '뼈'], organEn: ['Kidneys', 'Bladder', 'Ears', 'Bones'], warning: '충분한 수분 섭취와 휴식이 필요해요', warningEn: 'Adequate hydration and rest needed' },
};

// 건강 관련 신살 목록
const HEALTH_SHINSALS: ShinsalKind[] = ['병부', '효신살', '상문살', '백호', '귀문관'];

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

// 헬퍼 함수들
function getGeneratedElement(el: FiveElement): FiveElement {
  const map: Record<FiveElement, FiveElement> = { '목': '화', '화': '토', '토': '금', '금': '수', '수': '목' };
  return map[el];
}

function getControlledElement(el: FiveElement): FiveElement {
  const map: Record<FiveElement, FiveElement> = { '목': '토', '화': '금', '토': '수', '금': '목', '수': '화' };
  return map[el];
}

function getControllerElement(el: FiveElement): FiveElement {
  const map: Record<FiveElement, FiveElement> = { '목': '금', '화': '수', '토': '목', '금': '화', '수': '토' };
  return map[el];
}

function getGeneratorElement(el: FiveElement): FiveElement {
  const map: Record<FiveElement, FiveElement> = { '목': '수', '화': '목', '토': '화', '금': '토', '수': '금' };
  return map[el];
}

// ============================
// KarmaTab용 분석 함수들
// ============================

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

// 카르마 관련 신살
const KARMA_SHINSALS: ShinsalKind[] = ['원진', '역마', '화개', '천라지망', '공망'];

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

  // 1. 영혼 패턴 (L7 - 격국 × 드라코닉)
  let soulPattern: KarmaMatrixResult['soulPattern'] = null;
  const geokgukData = extSaju?.advancedAnalysis?.geokguk;
  const geokgukName = geokgukData?.name || geokgukData?.type || '';

  if (geokgukName) {
    const geokgukToPattern: Record<string, AdvancedAnalysisRow> = {
      '정관격': 'jeonggwan', '정관': 'jeonggwan',
      '편관격': 'pyeongwan', '편관': 'pyeongwan',
      '정인격': 'jeongin', '정인': 'jeongin',
      '편인격': 'pyeongin', '편인': 'pyeongin',
      '식신격': 'siksin', '식신': 'siksin',
      '상관격': 'sanggwan', '상관': 'sanggwan',
      '정재격': 'jeongjae', '정재': 'jeongjae',
      '편재격': 'pyeonjae', '편재': 'pyeonjae',
    };

    const pattern = geokgukToPattern[geokgukName];
    if (pattern) {
      const draconicInteraction = ADVANCED_ANALYSIS_MATRIX[pattern]?.draconic;
      if (draconicInteraction) {
        const soulThemes: Record<string, { ko: string; en: string }> = {
          'jeonggwan': { ko: '정의와 질서를 세우는 영혼', en: 'Soul establishing justice and order' },
          'pyeongwan': { ko: '도전을 통해 성장하는 전사 영혼', en: 'Warrior soul growing through challenges' },
          'jeongin': { ko: '지혜를 나누는 스승 영혼', en: 'Teacher soul sharing wisdom' },
          'pyeongin': { ko: '신비로운 통찰의 영혼', en: 'Soul of mystical insight' },
          'siksin': { ko: '풍요와 창조를 가져오는 영혼', en: 'Soul bringing abundance and creation' },
          'sanggwan': { ko: '혁신과 표현의 천재 영혼', en: 'Genius soul of innovation and expression' },
          'jeongjae': { ko: '안정과 풍요를 쌓는 영혼', en: 'Soul building stability and abundance' },
          'pyeonjae': { ko: '기회를 포착하는 사업가 영혼', en: 'Entrepreneur soul seizing opportunities' },
        };

        soulPattern = {
          geokguk: geokgukName,
          progression: 'draconic',
          fusion: {
            level: draconicInteraction.level,
            score: draconicInteraction.score,
            icon: draconicInteraction.icon,
            color: getInteractionColor(draconicInteraction.level),
            keyword: { ko: draconicInteraction.keyword, en: draconicInteraction.keywordEn },
            description: { ko: `${geokgukName} × 드라코닉`, en: `${geokgukName} × Draconic` },
          },
          soulTheme: soulThemes[pattern] || { ko: '고유한 영혼의 여정', en: 'Unique soul journey' },
        };
      }
    }
  }

  // 2. 노드 축 분석 (L10)
  let nodeAxis: KarmaMatrixResult['nodeAxis'] = null;
  const northNodeInteraction = EXTRAPOINT_ELEMENT_MATRIX['NorthNode']?.[sajuEl];
  const southNodeInteraction = EXTRAPOINT_ELEMENT_MATRIX['SouthNode']?.[sajuEl];

  if (northNodeInteraction && southNodeInteraction) {
    const nodeDirections: Record<FiveElement, { ko: string; en: string }> = {
      '목': { ko: '새로운 시작과 성장을 향해', en: 'Towards new beginnings and growth' },
      '화': { ko: '열정과 자기 표현을 향해', en: 'Towards passion and self-expression' },
      '토': { ko: '안정과 책임감을 향해', en: 'Towards stability and responsibility' },
      '금': { ko: '결단력과 정리를 향해', en: 'Towards decisiveness and organization' },
      '수': { ko: '지혜와 깊은 이해를 향해', en: 'Towards wisdom and deep understanding' },
    };

    const nodeLessons: Record<FiveElement, { ko: string; en: string }> = {
      '목': { ko: '도전하고 성장하는 법을 배워요', en: 'Learn to challenge and grow' },
      '화': { ko: '자신을 드러내고 빛나는 법을 배워요', en: 'Learn to shine and express yourself' },
      '토': { ko: '기반을 다지고 책임지는 법을 배워요', en: 'Learn to build foundation and take responsibility' },
      '금': { ko: '선택하고 결단하는 법을 배워요', en: 'Learn to choose and decide' },
      '수': { ko: '흐름을 따르고 지혜를 얻는 법을 배워요', en: 'Learn to flow and gain wisdom' },
    };

    const pastPatterns: Record<FiveElement, { ko: string; en: string }> = {
      '목': { ko: '과거에 너무 많이 시작만 했어요', en: 'In the past, you only started too many things' },
      '화': { ko: '과거에 열정에만 의존했어요', en: 'In the past, you relied only on passion' },
      '토': { ko: '과거에 안전지대에만 머물렀어요', en: 'In the past, you stayed only in comfort zones' },
      '금': { ko: '과거에 너무 냉철했어요', en: 'In the past, you were too cold' },
      '수': { ko: '과거에 생각만 하고 행동하지 않았어요', en: 'In the past, you only thought without action' },
    };

    nodeAxis = {
      northNode: {
        element: sajuEl,
        fusion: {
          level: northNodeInteraction.level,
          score: northNodeInteraction.score,
          icon: northNodeInteraction.icon,
          color: getInteractionColor(northNodeInteraction.level),
          keyword: { ko: northNodeInteraction.keyword, en: northNodeInteraction.keywordEn },
          description: { ko: `노스노드 × ${sajuEl}`, en: `North Node × ${sajuEl}` },
        },
        direction: nodeDirections[sajuEl],
        lesson: nodeLessons[sajuEl],
      },
      southNode: {
        element: sajuEl,
        fusion: {
          level: southNodeInteraction.level,
          score: southNodeInteraction.score,
          icon: southNodeInteraction.icon,
          color: getInteractionColor(southNodeInteraction.level),
          keyword: { ko: southNodeInteraction.keyword, en: southNodeInteraction.keywordEn },
          description: { ko: `사우스노드 × ${sajuEl}`, en: `South Node × ${sajuEl}` },
        },
        pastPattern: pastPatterns[sajuEl],
        release: { ko: '과거의 패턴을 인식하고 내려놓으세요', en: 'Recognize and release past patterns' },
      },
    };
  }

  // 3. 카르마적 관계 패턴 (L5)
  const karmicRelations: KarmaMatrixResult['karmicRelations'] = [];
  const hyungChungHoeHap = extSaju?.advancedAnalysis?.hyungChungHoeHap;

  const relationMeanings: Record<string, { ko: string; en: string }> = {
    'samhap': { ko: '전생부터 이어진 깊은 인연', en: 'Deep connection from past life' },
    'yukhap': { ko: '자연스럽게 맺어진 인연', en: 'Naturally formed connection' },
    'chung': { ko: '갈등을 통해 배우는 카르마', en: 'Karma learned through conflict' },
    'hyeong': { ko: '시련을 통해 성장하는 관계', en: 'Relationship growing through trials' },
  };

  const karmicRelationTypes: BranchRelation[] = [];
  if (hyungChungHoeHap?.hap?.length) karmicRelationTypes.push('samhap');
  if (hyungChungHoeHap?.harmony?.length) karmicRelationTypes.push('yukhap');
  if (hyungChungHoeHap?.chung?.length || hyungChungHoeHap?.conflicts?.length) karmicRelationTypes.push('chung');

  for (const rel of karmicRelationTypes.slice(0, 3)) {
    const conjunctionInteraction = RELATION_ASPECT_MATRIX[rel]?.conjunction;
    if (conjunctionInteraction) {
      karmicRelations.push({
        relation: rel,
        aspect: 'conjunction',
        fusion: {
          level: conjunctionInteraction.level,
          score: conjunctionInteraction.score,
          icon: conjunctionInteraction.icon,
          color: getInteractionColor(conjunctionInteraction.level),
          keyword: { ko: conjunctionInteraction.keyword, en: conjunctionInteraction.keywordEn },
          description: { ko: `${rel} × 합`, en: `${rel} × Conjunction` },
        },
        meaning: relationMeanings[rel] || { ko: '인연의 패턴', en: 'Connection pattern' },
      });
    }
  }

  // 4. 전생 힌트 (L8)
  const pastLifeHints: KarmaMatrixResult['pastLifeHints'] = [];
  const allShinsals = [
    ...(extSaju?.advancedAnalysis?.sinsal?.luckyList || []),
    ...(extSaju?.advancedAnalysis?.sinsal?.unluckyList || []),
  ];

  const userKarmaShinsals: ShinsalKind[] = [];
  for (const s of allShinsals) {
    const name = typeof s === 'string' ? s : (s as { name?: string })?.name;
    if (name && KARMA_SHINSALS.includes(name as ShinsalKind)) {
      userKarmaShinsals.push(name as ShinsalKind);
    }
  }

  const karmaHintMessages: Record<string, { ko: string; en: string }> = {
    '원진': { ko: '전생에서 해결하지 못한 원한이 있어요', en: 'There is unresolved resentment from past life' },
    '역마': { ko: '전생에서 여행자/탐험가였어요', en: 'You were a traveler/explorer in past life' },
    '화개': { ko: '전생에서 영적 수행자였어요', en: 'You were a spiritual practitioner in past life' },
    '천라지망': { ko: '전생에서 큰 시련을 겪었어요', en: 'You experienced great trials in past life' },
    '공망': { ko: '전생에서 무언가를 잃었어요', en: 'You lost something in past life' },
  };

  for (const shinsal of userKarmaShinsals.slice(0, 3)) {
    const plutoInteraction = SHINSAL_PLANET_MATRIX[shinsal]?.Pluto;
    if (plutoInteraction) {
      pastLifeHints.push({
        shinsal,
        planet: 'Pluto',
        fusion: {
          level: plutoInteraction.level,
          score: plutoInteraction.score,
          icon: plutoInteraction.icon,
          color: getInteractionColor(plutoInteraction.level),
          keyword: { ko: plutoInteraction.keyword, en: plutoInteraction.keywordEn },
          description: { ko: `${shinsal} × 명왕성`, en: `${shinsal} × Pluto` },
        },
        hint: karmaHintMessages[shinsal] || { ko: '전생의 에너지가 남아있어요', en: 'Energy from past life remains' },
      });
    }
  }

  // 5. 카르마 점수 계산
  let karmaScore = 50;
  if (soulPattern) karmaScore += soulPattern.fusion.score * 2;
  if (nodeAxis) karmaScore += (nodeAxis.northNode.fusion.score + nodeAxis.southNode.fusion.score);
  karmaScore += karmicRelations.length * 5;
  karmaScore += pastLifeHints.length * 5;
  karmaScore = Math.min(100, Math.max(30, karmaScore));

  return {
    karmaScore: Math.round(karmaScore),
    soulPattern,
    nodeAxis,
    karmicRelations,
    pastLifeHints,
  };
}

// ============================
// CareerTab 고급 분석
// ============================

export interface CareerAdvancedResult {
  wealthPattern: {
    style: { ko: string; en: string };
    score: number;
    sibsinWealth: Array<{
      sibsin: SibsinKind;
      planet: string;
      fusion: MatrixFusion;
    }>;
  };
  successTiming: Array<{
    timing: string;
    transit: string;
    fusion: MatrixFusion;
    advice: { ko: string; en: string };
  }>;
  careerProgression: {
    geokguk: string;
    progression: string;
    fusion: MatrixFusion;
    direction: { ko: string; en: string };
  } | null;
  nobleHelp: Array<{
    shinsal: string;
    planet: string;
    fusion: MatrixFusion;
    blessing: { ko: string; en: string };
  }>;
  fortunePoint: {
    element: FiveElement;
    fusion: MatrixFusion;
    luckyArea: { ko: string; en: string };
  } | null;
}

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

  // 1. 재물 패턴 (L2 - 정재/편재 × Jupiter/Saturn)
  const wealthSibsin: SibsinKind[] = ['정재', '편재', '식신'];
  const wealthPlanets: PlanetName[] = ['Jupiter', 'Saturn', 'Venus'];
  const sibsinWealth: CareerAdvancedResult['wealthPattern']['sibsinWealth'] = [];

  const userSibsin = extSaju?.sibsin || {};
  const userWealthSibsin: SibsinKind[] = [];
  for (const [, sibsin] of Object.entries(userSibsin)) {
    if (sibsin && wealthSibsin.includes(sibsin as SibsinKind)) {
      userWealthSibsin.push(sibsin as SibsinKind);
    }
  }

  let wealthScore = 60;
  for (const sibsin of [...new Set(userWealthSibsin)].slice(0, 2)) {
    for (const planet of wealthPlanets.slice(0, 2)) {
      const interaction = SIBSIN_PLANET_MATRIX[sibsin]?.[planet];
      if (interaction && (interaction.level === 'extreme' || interaction.level === 'amplify')) {
        sibsinWealth.push({
          sibsin,
          planet,
          fusion: {
            level: interaction.level,
            score: interaction.score,
            icon: interaction.icon,
            color: getInteractionColor(interaction.level),
            keyword: { ko: interaction.keyword, en: interaction.keywordEn },
            description: { ko: `${sibsin} × ${planet}`, en: `${sibsin} × ${planet}` },
          },
        });
        wealthScore += interaction.score;
      }
    }
  }

  const wealthStyles: Record<FiveElement, { ko: string; en: string }> = {
    '목': { ko: '성장하는 투자형 - 미래 가치에 투자해요', en: 'Growth investor - Invest in future value' },
    '화': { ko: '열정적 사업형 - 좋아하는 일로 돈을 벌어요', en: 'Passionate entrepreneur - Make money doing what you love' },
    '토': { ko: '안정적 저축형 - 꾸준히 모아 큰 부를 이뤄요', en: 'Steady saver - Build wealth through consistent saving' },
    '금': { ko: '전략적 재테크형 - 분석하고 투자해요', en: 'Strategic investor - Analyze and invest' },
    '수': { ko: '유동적 트레이딩형 - 흐름을 타고 수익을 내요', en: 'Fluid trader - Profit by riding the flow' },
  };

  // 2. 성공 타이밍 (L4)
  const successTiming: CareerAdvancedResult['successTiming'] = [];
  const careerTransits: TransitCycle[] = ['jupiterReturn', 'saturnReturn'];
  const currentDaeunElement = extSaju?.daeun?.find((d: { current?: boolean }) => d.current)?.element || sajuEl;

  for (const transit of careerTransits) {
    const timingData = TIMING_OVERLAY_MATRIX[currentDaeunElement as TimingCycleRow]?.[transit];
    if (timingData) {
      const transitNames: Record<string, { ko: string; en: string }> = {
        'jupiterReturn': { ko: '목성 회귀 (12년 주기)', en: 'Jupiter Return (12-year cycle)' },
        'saturnReturn': { ko: '토성 회귀 (29.5년 주기)', en: 'Saturn Return (29.5-year cycle)' },
      };

      successTiming.push({
        timing: currentDaeunElement,
        transit,
        fusion: {
          level: timingData.level,
          score: timingData.score,
          icon: timingData.icon,
          color: getInteractionColor(timingData.level),
          keyword: { ko: timingData.keyword, en: timingData.keywordEn },
          description: { ko: `${currentDaeunElement} × ${transit}`, en: `${currentDaeunElement} × ${transit}` },
        },
        advice: {
          ko: (timingData as InteractionCode & { advice?: string }).advice || '이 시기에 중요한 커리어 결정을 내리세요',
          en: (timingData as InteractionCode & { advice?: string }).advice || 'Make important career decisions during this period',
        },
      });
    }
  }

  // 3. 커리어 프로그레션 (L7)
  let careerProgression: CareerAdvancedResult['careerProgression'] = null;
  const geokgukData = extSaju?.advancedAnalysis?.geokguk;
  const geokgukName = geokgukData?.name || geokgukData?.type || '';

  if (geokgukName) {
    const geokgukToPattern: Record<string, AdvancedAnalysisRow> = {
      '정관격': 'jeonggwan', '정관': 'jeonggwan',
      '편관격': 'pyeongwan', '편관': 'pyeongwan',
      '정인격': 'jeongin', '정인': 'jeongin',
      '편인격': 'pyeongin', '편인': 'pyeongin',
      '식신격': 'siksin', '식신': 'siksin',
      '상관격': 'sanggwan', '상관': 'sanggwan',
      '정재격': 'jeongjae', '정재': 'jeongjae',
      '편재격': 'pyeonjae', '편재': 'pyeonjae',
    };

    const pattern = geokgukToPattern[geokgukName];
    if (pattern) {
      const solarReturnInteraction = ADVANCED_ANALYSIS_MATRIX[pattern]?.solarReturn;
      if (solarReturnInteraction) {
        const careerDirections: Record<string, { ko: string; en: string }> = {
          'jeonggwan': { ko: '조직에서의 안정적 승진', en: 'Stable promotion in organization' },
          'pyeongwan': { ko: '도전적 프로젝트로 인정받기', en: 'Recognition through challenging projects' },
          'jeongin': { ko: '전문성으로 신뢰 쌓기', en: 'Building trust through expertise' },
          'pyeongin': { ko: '특수 분야에서 두각 나타내기', en: 'Standing out in specialized fields' },
          'siksin': { ko: '창작과 표현으로 성공하기', en: 'Success through creation and expression' },
          'sanggwan': { ko: '혁신으로 기존 틀 깨기', en: 'Breaking conventions through innovation' },
          'jeongjae': { ko: '꾸준한 성과 축적하기', en: 'Accumulating steady achievements' },
          'pyeonjae': { ko: '기회 포착해 확장하기', en: 'Seizing opportunities to expand' },
        };

        careerProgression = {
          geokguk: geokgukName,
          progression: 'solarReturn',
          fusion: {
            level: solarReturnInteraction.level,
            score: solarReturnInteraction.score,
            icon: solarReturnInteraction.icon,
            color: getInteractionColor(solarReturnInteraction.level),
            keyword: { ko: solarReturnInteraction.keyword, en: solarReturnInteraction.keywordEn },
            description: { ko: `${geokgukName} × 솔라리턴`, en: `${geokgukName} × Solar Return` },
          },
          direction: careerDirections[pattern] || { ko: '자신만의 길을 개척하세요', en: 'Pioneer your own path' },
        };
      }
    }
  }

  // 4. 귀인운 (L8)
  const nobleShinsals: ShinsalKind[] = ['천을귀인', '태극귀인', '월덕귀인', '역마'];
  const nobleHelp: CareerAdvancedResult['nobleHelp'] = [];

  const allShinsals = [
    ...(extSaju?.advancedAnalysis?.sinsal?.luckyList || []),
  ];

  for (const s of allShinsals) {
    const name = typeof s === 'string' ? s : (s as { name?: string })?.name;
    if (name && nobleShinsals.includes(name as ShinsalKind)) {
      const jupiterInteraction = SHINSAL_PLANET_MATRIX[name as ShinsalKind]?.Jupiter;
      if (jupiterInteraction) {
        const blessings: Record<string, { ko: string; en: string }> = {
          '천을귀인': { ko: '귀인이 커리어를 도와줘요', en: 'Noble people help your career' },
          '태극귀인': { ko: '만사가 잘 풀리는 행운', en: 'Good fortune in all matters' },
          '월덕귀인': { ko: '하늘이 돕는 복', en: 'Heaven-sent blessings' },
          '역마': { ko: '해외/이동으로 기회가 와요', en: 'Opportunities through travel/overseas' },
        };

        nobleHelp.push({
          shinsal: name,
          planet: 'Jupiter',
          fusion: {
            level: jupiterInteraction.level,
            score: jupiterInteraction.score,
            icon: jupiterInteraction.icon,
            color: getInteractionColor(jupiterInteraction.level),
            keyword: { ko: jupiterInteraction.keyword, en: jupiterInteraction.keywordEn },
            description: { ko: `${name} × 목성`, en: `${name} × Jupiter` },
          },
          blessing: blessings[name] || { ko: '귀인의 도움이 있어요', en: 'Noble help is available' },
        });
      }
    }
  }

  // 5. Fortune Point (L10)
  let fortunePoint: CareerAdvancedResult['fortunePoint'] = null;
  const pofInteraction = EXTRAPOINT_ELEMENT_MATRIX['PartOfFortune']?.[sajuEl];

  if (pofInteraction) {
    const luckyAreas: Record<FiveElement, { ko: string; en: string }> = {
      '목': { ko: '교육, 창업, 스타트업에서 행운', en: 'Fortune in education, startups' },
      '화': { ko: '엔터, 마케팅, 리더십에서 행운', en: 'Fortune in entertainment, marketing, leadership' },
      '토': { ko: '부동산, 농업, 안정적 투자에서 행운', en: 'Fortune in real estate, agriculture, stable investments' },
      '금': { ko: '금융, 귀금속, 기술에서 행운', en: 'Fortune in finance, precious metals, technology' },
      '수': { ko: '무역, 유통, 해외사업에서 행운', en: 'Fortune in trade, distribution, overseas business' },
    };

    fortunePoint = {
      element: sajuEl,
      fusion: {
        level: pofInteraction.level,
        score: pofInteraction.score,
        icon: pofInteraction.icon,
        color: getInteractionColor(pofInteraction.level),
        keyword: { ko: pofInteraction.keyword, en: pofInteraction.keywordEn },
        description: { ko: `행운점 × ${sajuEl}`, en: `Part of Fortune × ${sajuEl}` },
      },
      luckyArea: luckyAreas[sajuEl],
    };
  }

  return {
    wealthPattern: {
      style: wealthStyles[sajuEl],
      score: Math.min(100, wealthScore),
      sibsinWealth,
    },
    successTiming,
    careerProgression,
    nobleHelp,
    fortunePoint,
  };
}

// ============================
// LoveTab 타이밍 분석
// ============================

export interface LoveTimingResult {
  timingScore: number;
  timingMessage: { ko: string; en: string };
  romanticTiming: Array<{
    timing: string;
    transit: string;
    fusion: MatrixFusion;
    advice: { ko: string; en: string };
  }>;
  relationshipPattern: Array<{
    relation: string;
    aspect: string;
    fusion: MatrixFusion;
    meaning: { ko: string; en: string };
  }>;
  destinyMeeting: {
    element: FiveElement;
    fusion: MatrixFusion;
    prediction: { ko: string; en: string };
  } | null;
}

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

  // 1. 연애 타이밍 (L4)
  const romanticTiming: LoveTimingResult['romanticTiming'] = [];
  const loveTransits: TransitCycle[] = ['venusRetrograde', 'marsRetrograde'];
  const currentDaeunElement = sajuEl;

  for (const transit of loveTransits) {
    const timingData = TIMING_OVERLAY_MATRIX[currentDaeunElement as TimingCycleRow]?.[transit];
    if (timingData) {
      const transitAdvice: Record<string, { ko: string; en: string }> = {
        'venusRetrograde': { ko: '과거 연인을 돌아보는 시기, 새 시작보다 관계 점검이 좋아요', en: 'Time to reflect on past relationships, review rather than new starts' },
        'marsRetrograde': { ko: '열정이 내면으로 향하는 시기, 성급한 고백은 피하세요', en: 'Passion turns inward, avoid hasty confessions' },
      };

      romanticTiming.push({
        timing: currentDaeunElement,
        transit,
        fusion: {
          level: timingData.level,
          score: timingData.score,
          icon: timingData.icon,
          color: getInteractionColor(timingData.level),
          keyword: { ko: timingData.keyword, en: timingData.keywordEn },
          description: { ko: `${currentDaeunElement} × ${transit}`, en: `${currentDaeunElement} × ${transit}` },
        },
        advice: transitAdvice[transit] || { ko: '연애운의 변화가 있어요', en: 'Changes in romantic fortune' },
      });
    }
  }

  // 2. 관계 패턴 (L5)
  const relationshipPattern: LoveTimingResult['relationshipPattern'] = [];
  const loveRelations: BranchRelation[] = ['yukhap', 'samhap', 'chung'];

  const patternMeanings: Record<string, { ko: string; en: string }> = {
    'yukhap': { ko: '자연스럽게 끌리는 인연이에요', en: 'Naturally attracted connection' },
    'samhap': { ko: '운명적으로 이어진 깊은 인연', en: 'Destined deep connection' },
    'chung': { ko: '밀고 당기는 강렬한 관계', en: 'Intense push-pull relationship' },
  };

  for (const rel of loveRelations) {
    const trineInteraction = RELATION_ASPECT_MATRIX[rel]?.trine;
    if (trineInteraction) {
      relationshipPattern.push({
        relation: rel,
        aspect: 'trine',
        fusion: {
          level: trineInteraction.level,
          score: trineInteraction.score,
          icon: trineInteraction.icon,
          color: getInteractionColor(trineInteraction.level),
          keyword: { ko: trineInteraction.keyword, en: trineInteraction.keywordEn },
          description: { ko: `${rel} × 삼각`, en: `${rel} × Trine` },
        },
        meaning: patternMeanings[rel] || { ko: '인연의 패턴', en: 'Connection pattern' },
      });
    }
  }

  // 3. 운명의 만남 (L10 - Vertex)
  let destinyMeeting: LoveTimingResult['destinyMeeting'] = null;
  const vertexInteraction = EXTRAPOINT_ELEMENT_MATRIX['Vertex']?.[sajuEl];

  if (vertexInteraction) {
    const predictions: Record<FiveElement, { ko: string; en: string }> = {
      '목': { ko: '새로운 환경에서 운명의 사람을 만나요', en: 'Meet your destined person in new environments' },
      '화': { ko: '열정적인 첫 만남이 운명으로 이어져요', en: 'Passionate first meeting leads to destiny' },
      '토': { ko: '오래 알던 사람이 운명의 인연이에요', en: 'Someone you\'ve known long is your destiny' },
      '금': { ko: '공식적인 자리에서 인연을 만나요', en: 'Meet your connection at formal occasions' },
      '수': { ko: '직감으로 알아보는 운명의 만남', en: 'Destined meeting recognized by intuition' },
    };

    destinyMeeting = {
      element: sajuEl,
      fusion: {
        level: vertexInteraction.level,
        score: vertexInteraction.score,
        icon: vertexInteraction.icon,
        color: getInteractionColor(vertexInteraction.level),
        keyword: { ko: vertexInteraction.keyword, en: vertexInteraction.keywordEn },
        description: { ko: `버텍스 × ${sajuEl}`, en: `Vertex × ${sajuEl}` },
      },
      prediction: predictions[sajuEl],
    };
  }

  // Calculate overall timing score based on romantic timing analysis
  const timingScore = romanticTiming.length > 0
    ? Math.round(romanticTiming.reduce((sum, t) => sum + t.fusion.score, 0) / romanticTiming.length * 10)
    : 50;

  // Generate timing message based on score
  const timingMessage = timingScore >= 70
    ? { ko: '지금은 연애운이 좋은 시기입니다! 적극적으로 인연을 찾아보세요.', en: 'This is a great time for love! Actively seek connections.' }
    : timingScore >= 50
    ? { ko: '연애운이 안정적인 시기입니다. 자연스러운 만남을 기대해보세요.', en: 'Your love timing is stable. Look forward to natural encounters.' }
    : { ko: '지금은 내면의 성장에 집중하는 시기입니다. 서두르지 마세요.', en: 'Focus on inner growth now. Don\'t rush into relationships.' };

  return {
    timingScore,
    timingMessage,
    romanticTiming,
    relationshipPattern,
    destinyMeeting,
  };
}

// ============================
// PersonalityTab 그림자 분석
// ============================

export interface ShadowPersonalityResult {
  lilithShadow: {
    element: FiveElement;
    fusion: MatrixFusion;
    shadowSelf: { ko: string; en: string };
    integration: { ko: string; en: string };
  } | null;
  hiddenPotential: {
    element: FiveElement;
    fusion: MatrixFusion;
    potential: { ko: string; en: string };
  } | null;
}

export function getShadowPersonalityAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): ShadowPersonalityResult | null {
  const isKo = lang === 'ko';
  if (!saju && !astro) return null;

  const dayElement = saju?.dayMaster?.element || 'wood';
  const sajuEl = mapSajuElementToKo(dayElement);

  // 1. Lilith 그림자 자아 (L10)
  let lilithShadow: ShadowPersonalityResult['lilithShadow'] = null;
  const lilithInteraction = EXTRAPOINT_ELEMENT_MATRIX['Lilith']?.[sajuEl];

  if (lilithInteraction) {
    const shadowSelves: Record<FiveElement, { ko: string; en: string }> = {
      '목': { ko: '인정받고 싶은 욕망이 과도해질 수 있어요', en: 'Desire for recognition can become excessive' },
      '화': { ko: '강렬한 열정이 파괴적으로 변할 수 있어요', en: 'Intense passion can turn destructive' },
      '토': { ko: '안정에 대한 집착이 성장을 막을 수 있어요', en: 'Obsession with stability can block growth' },
      '금': { ko: '냉철한 판단이 무자비함으로 변할 수 있어요', en: 'Cold judgment can turn ruthless' },
      '수': { ko: '깊은 감정이 어둠에 빠질 수 있어요', en: 'Deep emotions can fall into darkness' },
    };

    const integrations: Record<FiveElement, { ko: string; en: string }> = {
      '목': { ko: '자기 인정을 먼저 하면 외부 인정이 따라와요', en: 'Self-recognition brings external recognition' },
      '화': { ko: '열정을 창조적으로 승화시키세요', en: 'Channel passion into creativity' },
      '토': { ko: '안전지대를 벗어날 용기를 가지세요', en: 'Have courage to leave comfort zone' },
      '금': { ko: '판단에 자비를 더하세요', en: 'Add compassion to your judgment' },
      '수': { ko: '감정을 표현하되 휩쓸리지 마세요', en: 'Express emotions without being overwhelmed' },
    };

    lilithShadow = {
      element: sajuEl,
      fusion: {
        level: lilithInteraction.level,
        score: lilithInteraction.score,
        icon: lilithInteraction.icon,
        color: getInteractionColor(lilithInteraction.level),
        keyword: { ko: lilithInteraction.keyword, en: lilithInteraction.keywordEn },
        description: { ko: `릴리스 × ${sajuEl}`, en: `Lilith × ${sajuEl}` },
      },
      shadowSelf: shadowSelves[sajuEl],
      integration: integrations[sajuEl],
    };
  }

  // 2. 숨겨진 잠재력 (L10 - Part of Fortune)
  let hiddenPotential: ShadowPersonalityResult['hiddenPotential'] = null;
  const pofInteraction = EXTRAPOINT_ELEMENT_MATRIX['PartOfFortune']?.[sajuEl];

  if (pofInteraction) {
    const potentials: Record<FiveElement, { ko: string; en: string }> = {
      '목': { ko: '새로운 것을 시작하고 성장시키는 잠재력', en: 'Potential to start and grow new things' },
      '화': { ko: '사람들을 이끌고 영감을 주는 잠재력', en: 'Potential to lead and inspire people' },
      '토': { ko: '견고한 기반을 만들고 유지하는 잠재력', en: 'Potential to build and maintain solid foundation' },
      '금': { ko: '가치를 알아보고 선별하는 잠재력', en: 'Potential to recognize and select value' },
      '수': { ko: '깊은 통찰과 지혜를 얻는 잠재력', en: 'Potential to gain deep insight and wisdom' },
    };

    hiddenPotential = {
      element: sajuEl,
      fusion: {
        level: pofInteraction.level,
        score: pofInteraction.score,
        icon: pofInteraction.icon,
        color: getInteractionColor(pofInteraction.level),
        keyword: { ko: pofInteraction.keyword, en: pofInteraction.keywordEn },
        description: { ko: `행운점 × ${sajuEl}`, en: `Part of Fortune × ${sajuEl}` },
      },
      potential: potentials[sajuEl],
    };
  }

  return {
    lilithShadow,
    hiddenPotential,
  };
}

// ============================
// 타이밍 매트릭스 분석 (TimingTab용)
// L4: 타이밍-트랜짓, L7: 격국-프로그레션
// ============================

interface DaeunInfo {
  icon: string;
  period: string;
  heavenlyStem: string;
  earthlyBranch: string;
  element: string;
  description: { ko: string; en: string };
  advice: { ko: string; en: string };
}

interface DaeunSequenceItem {
  stem: string;
  branch: string;
  element: string;
  ageRange: string;
  isCurrent: boolean;
  isPast: boolean;
}

interface TransitInfo {
  icon: string;
  name: string;
  period: string;
  isActive: boolean;
  isUpcoming: boolean;
  description: { ko: string; en: string };
  advice: { ko: string; en: string };
}

interface RetrogradeInfo {
  icon: string;
  name: string;
  isRetrograde: boolean;
  period?: string;
}

interface PeriodLuckInfo {
  icon: string;
  stem: string;
  branch: string;
  element: string;
  score: number;
  description: { ko: string; en: string };
}

interface LuckyPeriodInfo {
  icon: string;
  period: string;
  strength: 'strong' | 'moderate' | 'mild';
  score: number;
  description: { ko: string; en: string };
  goodFor: string[];
}

export interface TimingMatrixResult {
  overallScore: number;
  overallMessage: { ko: string; en: string };
  daeunTimeline: {
    current: DaeunInfo | null;
    sequence: DaeunSequenceItem[];
    transition: { ko: string; en: string } | null;
  } | null;
  majorTransits: TransitInfo[];
  retrogrades: {
    planets: RetrogradeInfo[];
    upcoming: RetrogradeInfo[];
  } | null;
  periodLuck: {
    year: PeriodLuckInfo | null;
    month: PeriodLuckInfo | null;
    day: PeriodLuckInfo | null;
  } | null;
  luckyPeriods: LuckyPeriodInfo[];
}

export function getTimingMatrixAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): TimingMatrixResult | null {
  const isKo = lang === 'ko';
  if (!saju && !astro) return null;

  const dayElement = saju?.dayMaster?.element || 'wood';
  const sajuEl = mapSajuElementToKo(dayElement);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // 오행별 에너지 아이콘
  const elementIcons: Record<string, string> = {
    '목': '🌳', '화': '🔥', '토': '🏔️', '금': '⚔️', '수': '💧',
    'wood': '🌳', 'fire': '🔥', 'earth': '🏔️', 'metal': '⚔️', 'water': '💧',
  };

  // 천간/지지 오행 매핑
  const stemElements: Record<string, string> = {
    '갑': '목', '을': '목', '병': '화', '정': '화', '무': '토',
    '기': '토', '경': '금', '신': '금', '임': '수', '계': '수',
  };
  // branchElements는 향후 지지 분석 시 사용 예정
  // const branchElements: Record<string, string> = {
  //   '자': '수', '축': '토', '인': '목', '묘': '목', '진': '토', '사': '화',
  //   '오': '화', '미': '토', '신': '금', '유': '금', '술': '토', '해': '수',
  // };

  // 대운 정보 추출 (ExtendedSajuData에서)
  let daeunTimeline: TimingMatrixResult['daeunTimeline'] = null;
  const extSaju = saju as ExtendedSajuData | undefined;

  if (extSaju?.daeun && extSaju.daeun.length > 0) {
    const daeunList = extSaju.daeun;
    const currentDaeun = daeunList.find((d) => d.isCurrent || d.current);

    if (currentDaeun) {
      const stem = currentDaeun.heavenlyStem || '';
      const branch = currentDaeun.earthlyBranch || '';
      const daeunEl = stemElements[stem] || '토';

      // 일간과 대운 오행 관계 분석
      const westernEl = mapSajuElementToWestern(daeunEl);
      const relationScore = ELEMENT_CORE_GRID[sajuEl]?.[westernEl]?.score || 50;

      daeunTimeline = {
        current: {
          icon: elementIcons[daeunEl] || '🌟',
          period: currentDaeun.startAge ? `${currentDaeun.startAge}세~${(currentDaeun.startAge || 0) + 9}세` : '',
          heavenlyStem: stem,
          earthlyBranch: branch,
          element: elementIcons[daeunEl] || '🌟',
          description: {
            ko: relationScore >= 60
              ? `${daeunEl} 대운이 당신의 ${sajuEl} 에너지를 도와줍니다. 성장의 시기입니다.`
              : relationScore >= 40
              ? `${daeunEl} 대운이 안정적인 흐름을 제공합니다. 꾸준히 노력하세요.`
              : `${daeunEl} 대운이 도전을 주지만, 성장의 기회이기도 합니다.`,
            en: relationScore >= 60
              ? `The ${daeunEl} major luck supports your ${sajuEl} energy. A time of growth.`
              : relationScore >= 40
              ? `The ${daeunEl} major luck provides stable flow. Keep steady efforts.`
              : `The ${daeunEl} major luck brings challenges but also growth opportunities.`,
          },
          advice: {
            ko: relationScore >= 60
              ? '적극적으로 기회를 잡으세요'
              : relationScore >= 40
              ? '기본에 충실하면서 기회를 기다리세요'
              : '내면의 성장에 집중하세요',
            en: relationScore >= 60
              ? 'Actively seize opportunities'
              : relationScore >= 40
              ? 'Stay focused on basics while waiting for chances'
              : 'Focus on inner growth',
          },
        },
        sequence: daeunList.slice(0, 8).map((d) => {
          const dStem = d.heavenlyStem || '';
          const dBranch = d.earthlyBranch || '';
          const dEl = stemElements[dStem] || '토';
          const age = d.startAge || 0;
          return {
            stem: dStem,
            branch: dBranch,
            element: elementIcons[dEl] || '🌟',
            ageRange: `${age}-${age + 9}`,
            isCurrent: !!(d.isCurrent || d.current),
            isPast: age < (currentYear - (extSaju?.birthYear || currentYear)),
          };
        }),
        transition: null,
      };
    }
  }

  // 중요 트랜짓 (목성회귀, 토성회귀, 노드회귀)
  const majorTransits: TransitInfo[] = [];
  const birthYear = extSaju?.birthYear || currentYear - 30;
  const age = currentYear - birthYear;

  // 토성회귀 (약 29.5년 주기)
  const saturnReturnAge = Math.floor(age / 29.5) * 29.5 + 29.5;
  const saturnReturnYear = birthYear + saturnReturnAge;
  const isSaturnReturn = age >= 27 && age <= 31;

  majorTransits.push({
    icon: '🪐',
    name: isKo ? '토성회귀' : 'Saturn Return',
    period: `${Math.round(saturnReturnAge)}세 (${saturnReturnYear}년경)`,
    isActive: isSaturnReturn,
    isUpcoming: age < 27,
    description: {
      ko: isSaturnReturn
        ? '인생의 책임감과 성숙함을 요구받는 시기입니다. 진짜 어른이 되는 관문이에요.'
        : '약 29년 주기로 찾아오는 성숙의 관문입니다.',
      en: isSaturnReturn
        ? "A time demanding responsibility and maturity. The gateway to true adulthood."
        : "A gateway to maturity that comes every ~29 years.",
    },
    advice: {
      ko: isSaturnReturn ? '장기적 계획을 세우고 기반을 다지세요' : '이 시기를 준비하며 성장하세요',
      en: isSaturnReturn ? 'Make long-term plans and build foundations' : 'Prepare for this period while growing',
    },
  });

  // 목성회귀 (약 12년 주기)
  const jupiterReturnAge = Math.floor(age / 12) * 12 + 12;
  const isJupiterReturn = age % 12 === 0 || age % 12 === 11;

  majorTransits.push({
    icon: '🟠',
    name: isKo ? '목성회귀' : 'Jupiter Return',
    period: `${jupiterReturnAge}세`,
    isActive: isJupiterReturn,
    isUpcoming: (jupiterReturnAge - age) <= 2 && (jupiterReturnAge - age) > 0,
    description: {
      ko: isJupiterReturn
        ? '확장과 행운의 에너지가 찾아옵니다. 새로운 기회를 잡을 시기예요.'
        : '약 12년 주기로 찾아오는 확장과 행운의 시기입니다.',
      en: isJupiterReturn
        ? "Expansion and luck energy arrives. Time to seize new opportunities."
        : "A period of expansion and luck that comes every ~12 years.",
    },
    advice: {
      ko: isJupiterReturn ? '새로운 도전을 시작하기 좋은 시기예요' : '다음 기회를 위해 준비하세요',
      en: isJupiterReturn ? "Great time to start new ventures" : "Prepare for the next opportunity",
    },
  });

  // 역행 정보 (시뮬레이션)
  const retrogrades: TimingMatrixResult['retrogrades'] = {
    planets: [
      { icon: '☿️', name: isKo ? '수성' : 'Mercury', isRetrograde: currentMonth === 4 || currentMonth === 8 || currentMonth === 12 },
      { icon: '♀️', name: isKo ? '금성' : 'Venus', isRetrograde: false },
      { icon: '♂️', name: isKo ? '화성' : 'Mars', isRetrograde: false },
    ],
    upcoming: [
      { icon: '☿️', name: isKo ? '수성역행' : 'Mercury Rx', isRetrograde: true, period: isKo ? '4월, 8월, 12월' : 'Apr, Aug, Dec' },
      { icon: '♀️', name: isKo ? '금성역행' : 'Venus Rx', isRetrograde: true, period: isKo ? '7-8월' : 'Jul-Aug' },
    ],
  };

  // 세운/월운/일운 분석
  // 간단한 시뮬레이션 (실제로는 만세력 계산 필요)
  const yearStems = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
  const yearBranches = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
  const yearStemIdx = (currentYear - 4) % 10;
  const yearBranchIdx = (currentYear - 4) % 12;
  const yearStem = yearStems[yearStemIdx];
  const yearBranch = yearBranches[yearBranchIdx];
  const yearEl = stemElements[yearStem] || '토';

  const monthStemIdx = ((currentYear - 4) * 12 + currentMonth + 1) % 10;
  const monthBranchIdx = (currentMonth + 1) % 12;
  const monthStem = yearStems[monthStemIdx];
  const monthBranch = yearBranches[monthBranchIdx];
  const monthEl = stemElements[monthStem] || '토';

  const dayStemIdx = Math.floor(Date.now() / 86400000) % 10;
  const dayBranchIdx = Math.floor(Date.now() / 86400000) % 12;
  const dayStem = yearStems[dayStemIdx];
  const dayBranch = yearBranches[dayBranchIdx];
  const dayEl = stemElements[dayStem] || '토';

  const yearWestEl = mapSajuElementToWestern(yearEl);
  const monthWestEl = mapSajuElementToWestern(monthEl);
  const dayWestEl = mapSajuElementToWestern(dayEl);
  const yearScore = ELEMENT_CORE_GRID[sajuEl]?.[yearWestEl]?.score || 50;
  const monthScore = ELEMENT_CORE_GRID[sajuEl]?.[monthWestEl]?.score || 50;
  const dayScore = ELEMENT_CORE_GRID[sajuEl]?.[dayWestEl]?.score || 50;

  const periodLuck: TimingMatrixResult['periodLuck'] = {
    year: {
      icon: elementIcons[yearEl] || '🌟',
      stem: yearStem,
      branch: yearBranch,
      element: elementIcons[yearEl] || '🌟',
      score: yearScore,
      description: {
        ko: yearScore >= 60 ? `${yearEl} 에너지가 당신을 도와주는 해입니다` : `${yearEl} 에너지와 조화를 이루어야 하는 해입니다`,
        en: yearScore >= 60 ? `A year where ${yearEl} energy supports you` : `A year to harmonize with ${yearEl} energy`,
      },
    },
    month: {
      icon: elementIcons[monthEl] || '🌟',
      stem: monthStem,
      branch: monthBranch,
      element: elementIcons[monthEl] || '🌟',
      score: monthScore,
      description: {
        ko: monthScore >= 60 ? `이번 달은 활발한 에너지가 흐릅니다` : `이번 달은 신중하게 움직이세요`,
        en: monthScore >= 60 ? `Active energy flows this month` : `Move carefully this month`,
      },
    },
    day: {
      icon: elementIcons[dayEl] || '🌟',
      stem: dayStem,
      branch: dayBranch,
      element: elementIcons[dayEl] || '🌟',
      score: dayScore,
      description: {
        ko: dayScore >= 60 ? `오늘은 행운이 함께합니다` : `오늘은 차분하게 보내세요`,
        en: dayScore >= 60 ? `Luck is with you today` : `Take it easy today`,
      },
    },
  };

  // 행운의 시기 예측
  const luckyPeriods: LuckyPeriodInfo[] = [];

  // 목성회귀 전후
  if ((jupiterReturnAge - age) <= 3 && (jupiterReturnAge - age) >= 0) {
    luckyPeriods.push({
      icon: '🟠',
      period: `${currentYear + (jupiterReturnAge - age)}년`,
      strength: 'strong',
      score: 85,
      description: {
        ko: '목성회귀 시기로 확장과 성장의 에너지가 강합니다',
        en: 'Jupiter return period with strong expansion and growth energy',
      },
      goodFor: isKo ? ['새로운 시작', '해외', '학업', '투자'] : ['New starts', 'Travel', 'Study', 'Investment'],
    });
  }

  // 세운 기반 행운 예측
  if (yearScore >= 65) {
    luckyPeriods.push({
      icon: elementIcons[yearEl] || '🍀',
      period: `${currentYear}년`,
      strength: 'moderate',
      score: yearScore,
      description: {
        ko: `${yearEl} 에너지가 당신과 조화를 이루는 해입니다`,
        en: `A year where ${yearEl} energy harmonizes with you`,
      },
      goodFor: isKo ? ['전반적 운세', '계획 실행'] : ['Overall luck', 'Execute plans'],
    });
  }

  // 종합 점수 계산
  const overallScore = Math.round((yearScore + monthScore + dayScore) / 3);
  const overallMessage = {
    ko: overallScore >= 70
      ? '현재 전반적으로 좋은 타이밍입니다. 적극적으로 움직이세요!'
      : overallScore >= 50
      ? '안정적인 시기입니다. 꾸준히 노력하면 좋은 결과가 있을 거예요.'
      : '신중하게 움직이는 것이 좋습니다. 내면 성장에 집중하세요.',
    en: overallScore >= 70
      ? "Overall good timing now. Move proactively!"
      : overallScore >= 50
      ? "A stable period. Steady efforts will bring good results."
      : "Better to move carefully. Focus on inner growth.",
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
