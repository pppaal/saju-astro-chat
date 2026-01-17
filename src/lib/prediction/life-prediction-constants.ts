/**
 * 생애 예측 엔진 상수 정의
 * lifePredictionEngine.ts에서 분리된 상수들
 */

import type { FiveElement, TwelveStage } from './advancedTimingEngine';
import type { EventType } from './life-prediction-types';

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

export const EVENT_FAVORABLE_CONDITIONS: Record<EventType, {
  favorableSibsin: string[];
  favorableStages: TwelveStage[];
  favorableElements: FiveElement[];
  avoidSibsin: string[];
  avoidStages: TwelveStage[];
}> = {
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
    favorableStages: ['건록', '제왕', '장생'],
    favorableElements: ['토', '금'],
    avoidSibsin: ['편관', '상관'],
    avoidStages: ['병', '사', '묘'],
  },
  relationship: {
    favorableSibsin: ['정재', '정관', '식신', '비견'],
    favorableStages: ['건록', '관대', '장생'],
    favorableElements: ['화', '목'],
    avoidSibsin: ['겁재', '편관'],
    avoidStages: ['사', '묘', '절'],
  },
};

// ============================================================
// 점성술 이벤트 조건
// ============================================================

export const ASTRO_EVENT_CONDITIONS: Record<EventType, {
  favorableSigns: string[];
  keyPlanets: string[];
  favorableHouses: number[];
  avoidRetrogrades: string[];
  moonPhaseBonus: Record<string, number>;
}> = {
  marriage: {
    favorableSigns: ['Libra', 'Taurus', 'Cancer', 'Leo'],
    keyPlanets: ['Venus', 'Moon', 'Jupiter'],
    favorableHouses: [7, 5, 1],
    avoidRetrogrades: ['Venus'],
    moonPhaseBonus: { 'full_moon': 8, 'waxing_gibbous': 5, 'first_quarter': 3 },
  },
  career: {
    favorableSigns: ['Capricorn', 'Leo', 'Aries', 'Virgo'],
    keyPlanets: ['Sun', 'Saturn', 'Jupiter', 'Mars'],
    favorableHouses: [10, 6, 1, 2],
    avoidRetrogrades: ['Mercury', 'Saturn'],
    moonPhaseBonus: { 'waxing_gibbous': 6, 'first_quarter': 4, 'full_moon': 5 },
  },
  investment: {
    favorableSigns: ['Taurus', 'Scorpio', 'Capricorn', 'Virgo'],
    keyPlanets: ['Jupiter', 'Venus', 'Pluto'],
    favorableHouses: [2, 8, 11],
    avoidRetrogrades: ['Mercury', 'Jupiter'],
    moonPhaseBonus: { 'new_moon': 5, 'waxing_crescent': 6, 'first_quarter': 4 },
  },
  move: {
    favorableSigns: ['Sagittarius', 'Cancer', 'Gemini'],
    keyPlanets: ['Moon', 'Mercury', 'Jupiter'],
    favorableHouses: [4, 9, 3],
    avoidRetrogrades: ['Mercury'],
    moonPhaseBonus: { 'new_moon': 7, 'waxing_crescent': 5 },
  },
  study: {
    favorableSigns: ['Gemini', 'Virgo', 'Sagittarius', 'Aquarius'],
    keyPlanets: ['Mercury', 'Jupiter', 'Uranus'],
    favorableHouses: [3, 9, 5],
    avoidRetrogrades: ['Mercury'],
    moonPhaseBonus: { 'waxing_crescent': 6, 'first_quarter': 5, 'waxing_gibbous': 4 },
  },
  health: {
    favorableSigns: ['Virgo', 'Scorpio', 'Capricorn'],
    keyPlanets: ['Sun', 'Mars', 'Saturn'],
    favorableHouses: [6, 1, 8],
    avoidRetrogrades: ['Mars'],
    moonPhaseBonus: { 'waning_gibbous': 5, 'last_quarter': 4, 'new_moon': 6 },
  },
  relationship: {
    favorableSigns: ['Libra', 'Taurus', 'Leo', 'Pisces'],
    keyPlanets: ['Venus', 'Moon', 'Mars'],
    favorableHouses: [5, 7, 11],
    avoidRetrogrades: ['Venus', 'Mars'],
    moonPhaseBonus: { 'full_moon': 7, 'waxing_gibbous': 5, 'first_quarter': 3 },
  },
};

// ============================================================
// 트랜짓 이벤트 조건
// ============================================================

export const TRANSIT_EVENT_CONDITIONS: Record<EventType, {
  beneficPlanets: string[];
  maleficPlanets: string[];
  keyNatalPoints: string[];
  beneficAspects: string[];
  maleficAspects: string[];
  favorableHouses: number[];
}> = {
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
// 이벤트 하우스 설정
// ============================================================

export const EVENT_HOUSES: Record<EventType, { primary: number[]; secondary: number[]; avoid: number[] }> = {
  marriage: { primary: [7], secondary: [5, 1], avoid: [12, 8] },
  career: { primary: [10, 6], secondary: [2, 1], avoid: [12] },
  investment: { primary: [2, 8], secondary: [11], avoid: [12, 6] },
  move: { primary: [4, 9], secondary: [3], avoid: [12] },
  study: { primary: [9, 3], secondary: [5], avoid: [12] },
  health: { primary: [6, 1], secondary: [8], avoid: [12] },
  relationship: { primary: [7, 5], secondary: [11, 1], avoid: [12, 8] },
};

// ============================================================
// 달 위상 이름
// ============================================================

export const MOON_PHASE_NAMES: Record<string, string> = {
  'new_moon': '새달',
  'waxing_crescent': '초승달',
  'first_quarter': '상현달',
  'waxing_gibbous': '차오르는달',
  'full_moon': '보름달',
  'waning_gibbous': '기우는달',
  'last_quarter': '하현달',
  'waning_crescent': '그믐달',
};

// ============================================================
// 십신 점수
// ============================================================

export const SIBSIN_SCORES: Record<string, number> = {
  '비견': 55, '겁재': 45, '식신': 70, '상관': 50,
  '편재': 60, '정재': 75, '편관': 55, '정관': 80,
  '편인': 60, '정인': 75,
};

// ============================================================
// 이벤트 이름 (한글)
// ============================================================

export const EVENT_NAMES: Record<EventType, string> = {
  marriage: '결혼',
  career: '커리어',
  investment: '투자',
  move: '이사',
  study: '학업',
  health: '건강',
  relationship: '인간관계',
};

// ============================================================
// 중요도 가중치
// ============================================================

export const IMPORTANCE_WEIGHT = {
  daeun: 0.25,
  seun: 0.35,
  wolun: 0.20,
  iljin: 0.20,
};

// ============================================================
// 천간 관계 상수
// ============================================================

/** 천간합 */
export const STEM_COMBINATIONS: Record<string, string> = {
  '甲己': '토로 변화', '己甲': '토로 변화',
  '乙庚': '금으로 변화', '庚乙': '금으로 변화',
  '丙辛': '수로 변화', '辛丙': '수로 변화',
  '丁壬': '목으로 변화', '壬丁': '목으로 변화',
  '戊癸': '화로 변화', '癸戊': '화로 변화',
};

/** 천간충 */
export const STEM_CLASHES = ['甲庚', '庚甲', '乙辛', '辛乙', '丙壬', '壬丙', '丁癸', '癸丁'];

// ============================================================
// 지지 관계 상수
// ============================================================

/** 육합 */
export const SIX_COMBOS: Record<string, string> = {
  '子丑': '육합', '丑子': '육합', '寅亥': '육합', '亥寅': '육합',
  '卯戌': '육합', '戌卯': '육합', '辰酉': '육합', '酉辰': '육합',
  '巳申': '육합', '申巳': '육합', '午未': '육합', '未午': '육합',
};

/** 삼합 (부분) */
export const PARTIAL_TRINES: Record<string, string> = {
  '寅午': '화국 삼합', '午戌': '화국 삼합', '寅戌': '화국 삼합',
  '申子': '수국 삼합', '子辰': '수국 삼합', '申辰': '수국 삼합',
  '巳酉': '금국 삼합', '酉丑': '금국 삼합', '巳丑': '금국 삼합',
  '亥卯': '목국 삼합', '卯未': '목국 삼합', '亥未': '목국 삼합',
};

/** 충 */
export const CLASHES: Record<string, string> = {
  '子午': '충', '午子': '충', '丑未': '충', '未丑': '충',
  '寅申': '충', '申寅': '충', '卯酉': '충', '酉卯': '충',
  '辰戌': '충', '戌辰': '충', '巳亥': '충', '亥巳': '충',
};

/** 형 */
export const PUNISHMENTS: Record<string, string> = {
  '寅巳': '형', '巳寅': '형', '巳申': '형', '申巳': '형',
  '丑戌': '형', '戌丑': '형', '戌未': '형', '未戌': '형',
  '子卯': '형', '卯子': '형',
};

// ============================================================
// 신살 맵핑
// ============================================================

/** 천을귀인 */
export const CHEONEL_MAP: Record<string, string[]> = {
  '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
  '乙': ['子', '申'], '己': ['子', '申'],
  '丙': ['亥', '酉'], '丁': ['亥', '酉'],
  '壬': ['卯', '巳'], '癸': ['卯', '巳'],
  '辛': ['午', '寅'],
};

/** 역마 */
export const YEOKMA_MAP: Record<string, string> = {
  '寅': '申', '午': '申', '戌': '申',
  '申': '寅', '子': '寅', '辰': '寅',
  '亥': '巳', '卯': '巳', '未': '巳',
  '巳': '亥', '酉': '亥', '丑': '亥',
};

/** 문창 */
export const MUNCHANG_MAP: Record<string, string> = {
  '甲': '巳', '乙': '午', '丙': '申', '戊': '申',
  '丁': '酉', '己': '酉', '庚': '亥', '辛': '子',
  '壬': '寅', '癸': '卯',
};

/** 겁살 */
export const GEOPSAL_MAP: Record<string, string> = {
  '寅': '亥', '午': '亥', '戌': '亥',
  '申': '巳', '子': '巳', '辰': '巳',
  '亥': '申', '卯': '申', '未': '申',
  '巳': '寅', '酉': '寅', '丑': '寅',
};

// ============================================================
// 12운성 사건별 효과
// ============================================================

export const STAGE_EVENT_EFFECTS: Record<string, Record<string, string>> = {
  '장생': {
    career: '새로운 시작에 유리',
    finance: '투자 시작 적기',
    relationship: '새로운 인연 가능',
    health: '건강 회복기',
  },
  '목욕': {
    career: '변화와 도전',
    education: '학습 의욕 상승',
    relationship: '감정 변화 주의',
  },
  '관대': {
    career: '성장과 발전',
    finance: '자산 증가 기회',
    education: '시험 합격 유리',
  },
  '건록': {
    career: '전성기 진입',
    finance: '재물 증가',
    relationship: '인복 상승',
    health: '활력 충만',
  },
  '제왕': {
    career: '최고 전성기',
    finance: '최대 수익 가능',
    relationship: '리더십 발휘',
  },
  '쇠': {
    career: '현상 유지 권장',
    finance: '보수적 투자',
    health: '건강 관리 필요',
  },
  '병': {
    career: '휴식 권장',
    finance: '손실 주의',
    health: '건강 검진 필요',
    travel: '이동 자제',
  },
  '사': {
    career: '중요 결정 보류',
    finance: '투자 보류',
    relationship: '갈등 주의',
    health: '휴식 필수',
  },
  '묘': {
    career: '은둔기',
    finance: '저축 권장',
    relationship: '혼자 시간 필요',
    health: '요양 필요',
  },
  '절': {
    career: '새 출발 준비',
    finance: '리셋 필요',
    relationship: '정리 필요',
  },
  '태': {
    career: '아이디어 구상',
    finance: '계획 수립',
    education: '학습 계획',
  },
  '양': {
    career: '준비 단계',
    finance: '자금 마련',
    relationship: '관계 형성 초기',
  },
};
