/**
 * Life Prediction Constants
 * 인생 예측 엔진 상수 정의
 */

import type { FiveElement, TwelveStage } from '../advancedTimingEngine';
import type { EventType, EventFavorableConditions, AstroEventConditions, TransitEventConditions } from './types';

// ============================================================
// 기본 상수
// ============================================================
export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export const STEM_ELEMENT: Record<string, FiveElement> = {
  '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
  '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
};

// ============================================================
// 이벤트별 유리한 조건
// ============================================================
export const EVENT_FAVORABLE_CONDITIONS: Record<EventType, EventFavorableConditions> = {
  marriage: {
    favorableSibsin: ['정관', '정재', '정인', '식신'],
    favorableStages: ['건록', '제왕', '관대', '장생'],
    favorableElements: ['화', '목'],
    avoidSibsin: ['겁재', '상관', '편관'],
    avoidStages: ['사', '묘', '절'],
  },
  career: {
    favorableSibsin: ['정관', '편관', '정인', '식신'],
    favorableStages: ['건록', '제왕', '관대'],
    favorableElements: ['금', '토'],
    avoidSibsin: ['겁재', '상관'],
    avoidStages: ['사', '묘', '병'],
  },
  investment: {
    favorableSibsin: ['정재', '편재', '식신'],
    favorableStages: ['건록', '제왕', '장생', '관대'],
    favorableElements: ['토', '금'],
    avoidSibsin: ['겁재', '상관', '편인'],
    avoidStages: ['사', '묘', '절', '병'],
  },
  move: {
    favorableSibsin: ['편인', '식신', '편재'],
    favorableStages: ['장생', '관대', '목욕'],
    favorableElements: ['목', '수'],
    avoidSibsin: ['정관'],
    avoidStages: ['묘', '사'],
  },
  study: {
    favorableSibsin: ['정인', '편인', '식신'],
    favorableStages: ['장생', '관대', '목욕', '양'],
    favorableElements: ['수', '목'],
    avoidSibsin: ['편재', '겁재'],
    avoidStages: ['사', '묘'],
  },
  health: {
    favorableSibsin: ['정인', '비견', '식신'],
    favorableStages: ['장생', '관대', '목욕', '건록'],
    favorableElements: ['목', '수'],
    avoidSibsin: ['편관', '상관'],
    avoidStages: ['사', '묘', '병', '절'],
  },
  relationship: {
    favorableSibsin: ['정재', '정관', '식신', '정인'],
    favorableStages: ['관대', '건록', '제왕', '장생'],
    favorableElements: ['화', '목'],
    avoidSibsin: ['겁재', '편관', '상관'],
    avoidStages: ['사', '묘', '절'],
  },
};

// ============================================================
// 점성술 이벤트 조건 (TIER 3)
// ============================================================
export const ASTRO_EVENT_CONDITIONS: Record<EventType, AstroEventConditions> = {
  marriage: {
    ...EVENT_FAVORABLE_CONDITIONS.marriage,
    beneficSigns: ['Libra', 'Taurus', 'Cancer', 'Pisces'],
    beneficPlanets: ['Venus', 'Jupiter', 'Moon'],
    maleficPlanets: ['Saturn', 'Uranus'],
    moonPhaseBonus: { 'full_moon': 8, 'waxing_gibbous': 5, 'first_quarter': 3 },
  },
  career: {
    ...EVENT_FAVORABLE_CONDITIONS.career,
    beneficSigns: ['Capricorn', 'Leo', 'Aries', 'Virgo'],
    beneficPlanets: ['Sun', 'Mars', 'Jupiter', 'Saturn'],
    maleficPlanets: ['Neptune'],
    moonPhaseBonus: { 'waxing_crescent': 6, 'first_quarter': 5, 'waxing_gibbous': 4 },
  },
  investment: {
    ...EVENT_FAVORABLE_CONDITIONS.investment,
    beneficSigns: ['Taurus', 'Scorpio', 'Capricorn'],
    beneficPlanets: ['Jupiter', 'Venus', 'Pluto'],
    maleficPlanets: ['Neptune', 'Uranus'],
    moonPhaseBonus: { 'new_moon': 7, 'waxing_crescent': 6, 'first_quarter': 4 },
  },
  move: {
    ...EVENT_FAVORABLE_CONDITIONS.move,
    beneficSigns: ['Cancer', 'Sagittarius', 'Gemini'],
    beneficPlanets: ['Moon', 'Mercury', 'Jupiter'],
    maleficPlanets: ['Saturn'],
    moonPhaseBonus: { 'new_moon': 8, 'waxing_crescent': 6, 'waning_crescent': 4 },
  },
  study: {
    ...EVENT_FAVORABLE_CONDITIONS.study,
    beneficSigns: ['Gemini', 'Virgo', 'Sagittarius', 'Aquarius'],
    beneficPlanets: ['Mercury', 'Jupiter', 'Uranus'],
    maleficPlanets: ['Neptune'],
    moonPhaseBonus: { 'waxing_crescent': 7, 'first_quarter': 5, 'waxing_gibbous': 4 },
  },
  health: {
    ...EVENT_FAVORABLE_CONDITIONS.health,
    beneficSigns: ['Virgo', 'Scorpio', 'Aries'],
    beneficPlanets: ['Sun', 'Mars', 'Jupiter'],
    maleficPlanets: ['Saturn', 'Neptune', 'Pluto'],
    moonPhaseBonus: { 'full_moon': 6, 'waxing_gibbous': 5, 'new_moon': 4 },
  },
  relationship: {
    ...EVENT_FAVORABLE_CONDITIONS.relationship,
    beneficSigns: ['Libra', 'Leo', 'Sagittarius', 'Aquarius'],
    beneficPlanets: ['Venus', 'Jupiter', 'Sun'],
    maleficPlanets: ['Saturn'],
    moonPhaseBonus: { 'full_moon': 7, 'waxing_gibbous': 5, 'first_quarter': 4 },
  },
};

// ============================================================
// 트랜짓 이벤트 조건 (TIER 4)
// ============================================================
export const TRANSIT_EVENT_CONDITIONS: Record<EventType, TransitEventConditions> = {
  marriage: {
    beneficPlanets: ['Jupiter', 'Venus'],
    maleficPlanets: ['Saturn', 'Uranus'],
    keyNatalPoints: ['Venus', 'Moon', 'Sun', 'Ascendant'],
    beneficAspects: ['conjunction', 'trine', 'sextile'],
    maleficAspects: ['square', 'opposition'],
    favorableHouses: [7, 5, 1],
  },
  career: {
    beneficPlanets: ['Jupiter', 'Saturn'],
    maleficPlanets: ['Neptune', 'Pluto'],
    keyNatalPoints: ['Sun', 'Saturn', 'MC', 'Mars'],
    beneficAspects: ['conjunction', 'trine', 'sextile'],
    maleficAspects: ['square', 'opposition'],
    favorableHouses: [10, 6, 2, 1],
  },
  investment: {
    beneficPlanets: ['Jupiter', 'Pluto'],
    maleficPlanets: ['Neptune', 'Saturn'],
    keyNatalPoints: ['Jupiter', 'Venus', 'Pluto', 'Sun'],
    beneficAspects: ['conjunction', 'trine', 'sextile'],
    maleficAspects: ['square', 'opposition'],
    favorableHouses: [2, 8, 11],
  },
  move: {
    beneficPlanets: ['Jupiter', 'Uranus'],
    maleficPlanets: ['Saturn'],
    keyNatalPoints: ['Moon', 'Mercury', 'Ascendant'],
    beneficAspects: ['conjunction', 'trine', 'sextile'],
    maleficAspects: ['square', 'opposition'],
    favorableHouses: [4, 9, 3],
  },
  study: {
    beneficPlanets: ['Jupiter', 'Mercury'],
    maleficPlanets: ['Neptune', 'Saturn'],
    keyNatalPoints: ['Mercury', 'Jupiter', 'Moon'],
    beneficAspects: ['conjunction', 'trine', 'sextile'],
    maleficAspects: ['square', 'opposition'],
    favorableHouses: [3, 9, 5],
  },
  health: {
    beneficPlanets: ['Jupiter', 'Venus'],
    maleficPlanets: ['Saturn', 'Neptune', 'Pluto'],
    keyNatalPoints: ['Sun', 'Moon', 'Mars', 'Ascendant'],
    beneficAspects: ['conjunction', 'trine', 'sextile'],
    maleficAspects: ['square', 'opposition'],
    favorableHouses: [6, 1, 8],
  },
  relationship: {
    beneficPlanets: ['Jupiter', 'Venus'],
    maleficPlanets: ['Saturn', 'Uranus'],
    keyNatalPoints: ['Venus', 'Moon', 'Mars', 'Ascendant'],
    beneficAspects: ['conjunction', 'trine', 'sextile'],
    maleficAspects: ['square', 'opposition'],
    favorableHouses: [5, 7, 11],
  },
};

// ============================================================
// 하우스 관련 상수
// ============================================================
export const EVENT_HOUSES: Record<EventType, { primary: number[]; secondary: number[]; avoid: number[] }> = {
  marriage: { primary: [7], secondary: [5, 1], avoid: [12, 8] },
  career: { primary: [10, 6], secondary: [2, 1], avoid: [12] },
  investment: { primary: [2, 8], secondary: [11], avoid: [12, 6] },
  move: { primary: [4, 9], secondary: [3], avoid: [12] },
  study: { primary: [9, 3], secondary: [5], avoid: [12] },
  health: { primary: [6, 1], secondary: [8], avoid: [12] },
  relationship: { primary: [7, 11], secondary: [5], avoid: [12, 8] },
};

// ============================================================
// 십신 점수
// ============================================================
export const SIBSIN_SCORES: Record<string, number> = {
  '정관': 15, '정재': 12, '정인': 10, '식신': 8,
  '편관': 5, '편재': 5, '편인': 3, '상관': 0,
  '비견': -3, '겁재': -8,
};

// ============================================================
// 천간/지지 관계
// ============================================================

// 천간합 (甲己, 乙庚, 丙辛, 丁壬, 戊癸)
export const STEM_COMBINATIONS: Record<string, string> = {
  '甲己': '토로 변화', '己甲': '토로 변화',
  '乙庚': '금으로 변화', '庚乙': '금으로 변화',
  '丙辛': '수로 변화', '辛丙': '수로 변화',
  '丁壬': '목으로 변화', '壬丁': '목으로 변화',
  '戊癸': '화로 변화', '癸戊': '화로 변화',
};

// 천간충 (甲庚, 乙辛, 丙壬, 丁癸)
export const STEM_CLASHES = ['甲庚', '庚甲', '乙辛', '辛乙', '丙壬', '壬丙', '丁癸', '癸丁'];

// 육합
export const SIX_COMBOS: Record<string, string> = {
  '子丑': '육합', '丑子': '육합', '寅亥': '육합', '亥寅': '육합',
  '卯戌': '육합', '戌卯': '육합', '辰酉': '육합', '酉辰': '육합',
  '巳申': '육합', '申巳': '육합', '午未': '육합', '未午': '육합',
};

// 삼합 (부분 - 두 지지만 체크)
export const PARTIAL_TRINES: Record<string, string> = {
  '寅午': '화국 삼합', '午戌': '화국 삼합', '寅戌': '화국 삼합',
  '申子': '수국 삼합', '子辰': '수국 삼합', '申辰': '수국 삼합',
  '巳酉': '금국 삼합', '酉丑': '금국 삼합', '巳丑': '금국 삼합',
  '亥卯': '목국 삼합', '卯未': '목국 삼합', '亥未': '목국 삼합',
};

// 충
export const BRANCH_CLASHES: Record<string, string> = {
  '子午': '충', '午子': '충', '丑未': '충', '未丑': '충',
  '寅申': '충', '申寅': '충', '卯酉': '충', '酉卯': '충',
  '辰戌': '충', '戌辰': '충', '巳亥': '충', '亥巳': '충',
};

// 형 (주요)
export const BRANCH_PUNISHMENTS: Record<string, string> = {
  '寅巳': '형', '巳寅': '형', '巳申': '형', '申巳': '형',
  '丑戌': '형', '戌丑': '형', '戌未': '형', '未戌': '형',
  '子卯': '형', '卯子': '형',
};

// ============================================================
// 이벤트 이름 (다국어)
// ============================================================
export const EVENT_NAMES: Record<EventType, { ko: string; en: string }> = {
  marriage: { ko: '결혼', en: 'Marriage' },
  career: { ko: '취업/이직', en: 'Career' },
  investment: { ko: '투자', en: 'Investment' },
  move: { ko: '이사', en: 'Move' },
  study: { ko: '학업/시험', en: 'Study' },
  health: { ko: '건강관리', en: 'Health' },
  relationship: { ko: '인간관계', en: 'Relationship' },
};
