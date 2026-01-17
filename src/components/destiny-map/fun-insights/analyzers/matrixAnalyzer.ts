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
  };
}

// ============================
// 헬퍼 함수
// ============================

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
