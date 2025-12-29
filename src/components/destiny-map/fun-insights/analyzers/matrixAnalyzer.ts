// matrixAnalyzer.ts
// Destiny Fusion Matrix™ 데이터를 활용한 고급 분석

import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { ELEMENT_CORE_GRID, SIGN_TO_ELEMENT } from '@/lib/destiny-matrix/data/layer1-element-core';
import { SIBSIN_PLANET_MATRIX, PLANET_KEYWORDS, SIBSIN_KEYWORDS } from '@/lib/destiny-matrix/data/layer2-sibsin-planet';
import { TWELVE_STAGE_HOUSE_MATRIX, TWELVE_STAGE_INFO } from '@/lib/destiny-matrix/data/layer6-stage-house';
import { SHINSAL_PLANET_MATRIX, SHINSAL_INFO } from '@/lib/destiny-matrix/data/layer8-shinsal-planet';
import { ASTEROID_HOUSE_MATRIX, ASTEROID_INFO } from '@/lib/destiny-matrix/data/layer9-asteroid-house';
import { SIBSIN_HOUSE_MATRIX, HOUSE_KEYWORDS } from '@/lib/destiny-matrix/data/layer3-sibsin-house';
import type { WesternElement, HouseNumber, PlanetName, ShinsalKind, AsteroidName } from '@/lib/destiny-matrix/types';
import type { FiveElement, SibsinKind, TwelveStage, TwelveStageStandard } from '@/lib/Saju/types';
import { findPlanetSign } from '../utils/helpers';

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
  saju: any,
  astro: any,
  lang: string
): MatrixAnalysisResult | null {
  const isKo = lang === 'ko';

  if (!saju && !astro) return null;

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
  const sibsinList = saju?.sibsin || {};
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
  const twelveStages = saju?.twelveStages || {};
  const planetHouses: Partial<Record<PlanetName, number>> = {};

  // 행성 하우스 매핑
  if (astro?.planets) {
    for (const p of astro.planets) {
      if (p.name && p.house) {
        const pName = p.name.charAt(0).toUpperCase() + p.name.slice(1).toLowerCase();
        planetHouses[pName as PlanetName] = p.house as HouseNumber;
      }
    }
  }

  // 12운성별 분석
  const stageKeys = Object.keys(twelveStages) as Array<keyof typeof twelveStages>;
  for (const pillar of stageKeys) {
    const stage = twelveStages[pillar] as TwelveStage;
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
    const house = pillarHouseMap[String(pillar)] || 1;

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
            ko: `${normalizedStage}(${String(pillar)}주) × ${house}하우스`,
            en: `${normalizedStage}(${String(pillar)} pillar) × House ${house}`,
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
  saju: any,
  astro: any,
  lang: string
): LoveMatrixResult | null {
  const isKo = lang === 'ko';

  if (!saju && !astro) return null;

  const shinsalLove: ShinsalPlanetResult[] = [];
  const asteroidLove: AsteroidHouseResult[] = [];

  // 1. 신살-행성 분석 (사랑 관련: 도화, 홍염살 중심)
  const loveShinsals: ShinsalKind[] = ['도화', '홍염살', '천을귀인', '월덕귀인', '반안'];
  const lovePlanets: PlanetName[] = ['Venus', 'Mars', 'Moon', 'Neptune'];
  const shinsalList = saju?.shinsal || saju?.sinsal || [];

  // 사주에서 신살 추출 (배열 또는 객체 형태 처리)
  const userShinsals: ShinsalKind[] = [];
  if (Array.isArray(shinsalList)) {
    for (const s of shinsalList) {
      const name = typeof s === 'string' ? s : s?.name || s?.shinsal;
      if (name && loveShinsals.includes(name as ShinsalKind)) {
        userShinsals.push(name as ShinsalKind);
      }
    }
  } else if (typeof shinsalList === 'object') {
    for (const key of Object.keys(shinsalList)) {
      const val = shinsalList[key];
      if (Array.isArray(val)) {
        for (const v of val) {
          const name = typeof v === 'string' ? v : v?.name;
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
  if (astro?.asteroids || astro?.planets) {
    const asteroidData = astro.asteroids || [];
    const planetData = astro.planets || [];

    for (const asteroid of loveAsteroids) {
      // asteroids 배열에서 찾기
      let asteroidInfo = asteroidData.find((a: any) =>
        a.name?.toLowerCase() === asteroid.toLowerCase()
      );

      // planets 배열에서도 찾기 (일부 시스템에서 소행성을 planets에 포함)
      if (!asteroidInfo) {
        asteroidInfo = planetData.find((p: any) =>
          p.name?.toLowerCase() === asteroid.toLowerCase()
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
  const hasDoHwa = userShinsals.includes('도화');
  const hasHongYeom = userShinsals.includes('홍염살');
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
  saju: any,
  astro: any,
  lang: string
): CareerMatrixResult | null {
  const isKo = lang === 'ko';

  if (!saju && !astro) return null;

  const sibsinCareer: SibsinHouseResult[] = [];
  const careerStrengths: Array<{ area: string; score: number; icon: string }> = [];

  // 1. 십신-하우스 분석 (10하우스 중심)
  const careerHouses: HouseNumber[] = [10, 6, 2]; // 커리어, 직장, 재물
  const sibsinList = saju?.sibsin || {};

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
