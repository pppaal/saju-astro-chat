/**
 * Scoring configuration
 * 점수 계산의 구성 요소와 가중치를 정의
 */

import type { BilingualText } from '../types/core';

// ========== Local Config Types ==========

export interface ScoreItemConfig {
  weight: number;
  description: BilingualText;
}

export interface ScoreCategoryConfig {
  maxBonus: number;
  items: Record<string, ScoreItemConfig>;
}

export interface LocalScoringConfig {
  baseScore: number;
  maxScore: number;
  components: {
    saju: ScoreCategoryConfig;
    astrology: ScoreCategoryConfig;
    synergy: ScoreCategoryConfig;
  };
}

/**
 * 매력 점수 설정 (연애/대인관계)
 * 기본 점수: 60 (누구나 기본적인 매력이 있음)
 * 최대 점수: 100
 */
export const CHARM_SCORE_CONFIG: LocalScoringConfig = {
  baseScore: 60,
  maxScore: 100,
  components: {
    // 사주 요소 (최대 +25)
    saju: {
      maxBonus: 25,
      items: {
        dohwa: { weight: 12, description: { ko: '도화살 - 이성에게 자연스러운 매력', en: 'Dohwa - Natural charm to opposite sex' } },
        hongyeom: { weight: 8, description: { ko: '홍염살 - 열정적인 매력', en: 'Hongyeom - Passionate charm' } },
        dayMasterCharm: { weight: 5, description: { ko: '일간 매력 (병/정/계)', en: 'Day master charm (Byeong/Jeong/Gye)' } },
      },
    },
    // 점성학 요소 (최대 +25)
    astrology: {
      maxBonus: 25,
      items: {
        venusDignity: { weight: 10, description: { ko: '금성 본좌/고양 (황소/천칭/물고기)', en: 'Venus dignity (Taurus/Libra/Pisces)' } },
        venusHouse: { weight: 8, description: { ko: '금성 1/5/7하우스', en: 'Venus in 1st/5th/7th house' } },
        venusMarsAspect: { weight: 7, description: { ko: '금성-화성 조화 애스펙트', en: 'Venus-Mars harmonious aspect' } },
        house7Planets: { weight: 5, description: { ko: '7하우스 행성 있음', en: 'Planets in 7th house' } },
      },
    },
    // 조합 보너스 (최대 +10)
    synergy: {
      maxBonus: 10,
      items: {
        dohwaVenus: { weight: 5, description: { ko: '도화 + 금성 좋음', en: 'Dohwa + Good Venus' } },
        moonVenus: { weight: 5, description: { ko: '달-금성 조화', en: 'Moon-Venus harmony' } },
      },
    },
  },
};

/**
 * 재물운 점수 설정
 * 기본 점수: 60
 * 최대 점수: 100
 */
export const WEALTH_SCORE_CONFIG: LocalScoringConfig = {
  baseScore: 60,
  maxScore: 100,
  components: {
    // 사주 요소 (최대 +25)
    saju: {
      maxBonus: 25,
      items: {
        jaeSung: { weight: 10, description: { ko: '재성 강함', en: 'Strong wealth element' } },
        sikSang: { weight: 8, description: { ko: '식상생재', en: 'Food god generating wealth' } },
        tonggeun: { weight: 7, description: { ko: '통근 점수', en: 'Tonggeun score' } },
      },
    },
    // 점성학 요소 (최대 +20)
    astrology: {
      maxBonus: 20,
      items: {
        jupiterHouse: { weight: 8, description: { ko: '목성 2/8/10하우스', en: 'Jupiter in 2nd/8th/10th house' } },
        house2Planets: { weight: 6, description: { ko: '2하우스 행성', en: '2nd house planets' } },
        saturnTrine: { weight: 6, description: { ko: '토성 조화 애스펙트', en: 'Saturn harmonious aspect' } },
      },
    },
    // 조합 보너스 (최대 +5)
    synergy: {
      maxBonus: 5,
      items: {
        wealthCombo: { weight: 5, description: { ko: '재성 + 목성 조합', en: 'Wealth + Jupiter combination' } },
      },
    },
  },
};

/**
 * 카르마 점수 설정
 * 기본 점수: 65 (영적 성장 잠재력)
 * 최대 점수: 100
 */
export const KARMA_SCORE_CONFIG: LocalScoringConfig = {
  baseScore: 65,
  maxScore: 100,
  components: {
    // 점성학 요소 (최대 +20)
    astrology: {
      maxBonus: 20,
      items: {
        northNode: { weight: 8, description: { ko: 'North Node 강함', en: 'Strong North Node' } },
        chiron: { weight: 6, description: { ko: 'Chiron 치유 위치', en: 'Chiron healing position' } },
        pluto: { weight: 6, description: { ko: 'Pluto 변환', en: 'Pluto transformation' } },
      },
    },
    // 사주 요소 (최대 +10)
    saju: {
      maxBonus: 10,
      items: {
        geokguk: { weight: 6, description: { ko: '격국 명확', en: 'Clear Geokguk' } },
        yongsin: { weight: 4, description: { ko: '용신 명확', en: 'Clear Yongsin' } },
      },
    },
    // 조합 보너스 (최대 +5)
    synergy: {
      maxBonus: 5,
      items: {
        soulCombo: { weight: 5, description: { ko: '영혼 타입 조합', en: 'Soul type combination' } },
      },
    },
  },
};

/**
 * 점수 등급 정의
 */
export interface ScoreGrade {
  min: number;
  max: number;
  label: BilingualText;
  emoji: string;
}

export const SCORE_GRADES: ScoreGrade[] = [
  { min: 90, max: 100, label: { ko: '최상', en: 'Excellent' }, emoji: '🌟' },
  { min: 80, max: 89, label: { ko: '상', en: 'Great' }, emoji: '✨' },
  { min: 70, max: 79, label: { ko: '중상', en: 'Good' }, emoji: '💫' },
  { min: 60, max: 69, label: { ko: '중', en: 'Average' }, emoji: '⭐' },
  { min: 50, max: 59, label: { ko: '중하', en: 'Below Average' }, emoji: '☆' },
  { min: 0, max: 49, label: { ko: '하', en: 'Low' }, emoji: '○' },
];

/**
 * 점수 등급 가져오기
 */
export function getScoreGrade(score: number): ScoreGrade {
  const clamped = Math.max(0, Math.min(100, score));
  return SCORE_GRADES.find(g => clamped >= g.min && clamped <= g.max) || SCORE_GRADES[SCORE_GRADES.length - 1];
}
