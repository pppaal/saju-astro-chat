/**
 * Score calculation system types
 * Provides transparent, configurable scoring mechanism
 */

import type { BilingualText } from './core';

// ========== Score Component Types ==========

/**
 * Individual score component showing contribution breakdown
 */
export interface ScoreComponent {
  /** Identifier for this scoring factor, e.g., "도화살", "venus_in_libra" */
  source: string;
  /** Category of the scoring factor, e.g., "shinsal", "planet_placement", "aspect" */
  category: 'saju' | 'astrology' | 'synergy' | 'shinsal' | 'sibsin' | 'element';
  /** Points contributed by this component */
  points: number;
  /** Weight multiplier (0-1), used for partial matches */
  weight: number;
  /** Human-readable explanation of why this component contributes */
  reason: BilingualText;
}

/**
 * Complete score result with breakdown
 */
export interface ScoreResult {
  /** Final calculated score */
  total: number;
  /** Individual components that contributed to the score */
  components: ScoreComponent[];
  /** Base score before any bonuses */
  baseScore: number;
  /** Total bonus points added */
  bonusScore: number;
  /** Maximum possible score */
  maxPossible: number;
  /** Minimum possible score */
  minPossible: number;
}

// ========== Score Configuration Types ==========

/**
 * Score domain types
 */
export type ScoreDomain = 'charm' | 'wealth' | 'karma' | 'health' | 'career';

/**
 * Individual component configuration
 */
export interface ComponentConfig {
  /** Unique identifier for this component */
  id: string;
  /** Maximum points this component can contribute */
  points: number;
  /** Human-readable condition description */
  condition: BilingualText;
  /** Condition type for evaluation */
  conditionType:
    | 'has_shinsal'      // Check if shinsal exists
    | 'planet_in_sign'   // Check planet is in specific sign(s)
    | 'planet_in_house'  // Check planet is in specific house(s)
    | 'has_aspect'       // Check if aspect exists between planets
    | 'sibsin_dominant'  // Check if specific sibsin is dominant
    | 'sibsin_count'     // Check sibsin count threshold
    | 'element_strong'   // Check if element is strong
    | 'day_master'       // Check specific day master
    | 'has_geokguk'      // Check specific geokguk type
    | 'custom';          // Custom evaluation function
  /** Parameters for the condition check */
  params?: {
    shinsal?: string[];
    planet?: string;
    signs?: string[];
    houses?: number[];
    planet1?: string;
    planet2?: string;
    aspectTypes?: string[];
    sibsin?: string[];
    threshold?: number;
    element?: string;
    dayMasters?: string[];
    geokgukTypes?: string[];
  };
}

/**
 * Category configuration grouping related components
 */
export interface CategoryConfig {
  /** Category name */
  name: string;
  /** Maximum contribution from this category */
  maxContribution: number;
  /** Components in this category */
  components: ComponentConfig[];
}

/**
 * Complete scoring configuration
 */
export interface ScoringConfig {
  /** Domain this config applies to */
  domain: ScoreDomain;
  /** Base score everyone starts with */
  baseScore: number;
  /** Maximum achievable score */
  maxScore: number;
  /** Minimum score (floor) */
  minScore: number;
  /** Categories of scoring factors */
  categories: CategoryConfig[];
}

// ========== Default Score Configurations ==========

/**
 * Charm Score configuration (매력 점수)
 * Used in love analysis
 */
export const CHARM_SCORE_CONFIG: ScoringConfig = {
  domain: 'charm',
  baseScore: 60,
  maxScore: 100,
  minScore: 60,
  categories: [
    {
      name: 'saju',
      maxContribution: 25,
      components: [
        {
          id: 'dohwa',
          points: 12,
          condition: { ko: '도화살이 있어요', en: 'Has Dohwa (Peach Blossom)' },
          conditionType: 'has_shinsal',
          params: { shinsal: ['도화'] }
        },
        {
          id: 'hongyeom',
          points: 8,
          condition: { ko: '홍염살이 있어요', en: 'Has Hongyeom (Romantic Fire)' },
          conditionType: 'has_shinsal',
          params: { shinsal: ['홍염'] }
        },
        {
          id: 'daymaster_charm',
          points: 5,
          condition: { ko: '매력적인 일간이에요', en: 'Charming day master' },
          conditionType: 'day_master',
          params: { dayMasters: ['병', '정', '계'] }
        }
      ]
    },
    {
      name: 'astrology',
      maxContribution: 25,
      components: [
        {
          id: 'venus_dignity',
          points: 10,
          condition: { ko: '금성이 좋은 위치에 있어요', en: 'Venus in dignity' },
          conditionType: 'planet_in_sign',
          params: { planet: 'venus', signs: ['taurus', 'libra', 'pisces'] }
        },
        {
          id: 'venus_house',
          points: 8,
          condition: { ko: '금성이 관계 하우스에 있어요', en: 'Venus in relationship houses' },
          conditionType: 'planet_in_house',
          params: { planet: 'venus', houses: [1, 5, 7] }
        },
        {
          id: 'venus_mars_harmony',
          points: 7,
          condition: { ko: '금성-화성 조화 애스펙트', en: 'Venus-Mars harmonious aspect' },
          conditionType: 'has_aspect',
          params: { planet1: 'venus', planet2: 'mars', aspectTypes: ['conjunction', 'trine', 'sextile'] }
        }
      ]
    },
    {
      name: 'synergy',
      maxContribution: 10,
      components: [
        {
          id: 'dohwa_venus_combo',
          points: 5,
          condition: { ko: '도화살 + 금성 조합', en: 'Dohwa + Venus combo' },
          conditionType: 'custom'
        },
        {
          id: 'moon_venus_harmony',
          points: 5,
          condition: { ko: '달-금성 조화 애스펙트', en: 'Moon-Venus harmonious aspect' },
          conditionType: 'has_aspect',
          params: { planet1: 'moon', planet2: 'venus', aspectTypes: ['conjunction', 'trine', 'sextile'] }
        }
      ]
    }
  ]
};

/**
 * Wealth Score configuration (재물운 점수)
 * Used in career analysis
 */
export const WEALTH_SCORE_CONFIG: ScoringConfig = {
  domain: 'wealth',
  baseScore: 60,
  maxScore: 100,
  minScore: 60,
  categories: [
    {
      name: 'saju',
      maxContribution: 25,
      components: [
        {
          id: 'jaeseong_strong',
          points: 12,
          condition: { ko: '재성이 강해요 (3개 이상)', en: 'Strong wealth stars (3+)' },
          conditionType: 'sibsin_count',
          params: { sibsin: ['정재', '편재'], threshold: 3 }
        },
        {
          id: 'jaeseong_moderate',
          points: 6,
          condition: { ko: '재성이 있어요 (2개)', en: 'Has wealth stars (2)' },
          conditionType: 'sibsin_count',
          params: { sibsin: ['정재', '편재'], threshold: 2 }
        },
        {
          id: 'siksang_jaeseong',
          points: 8,
          condition: { ko: '식상생재 구조', en: 'Food god generates wealth structure' },
          conditionType: 'custom'
        },
        {
          id: 'gwanseong',
          points: 5,
          condition: { ko: '관성 있음 (안정적 직장운)', en: 'Has official stars (stable career)' },
          conditionType: 'sibsin_count',
          params: { sibsin: ['정관', '편관'], threshold: 2 }
        }
      ]
    },
    {
      name: 'astrology',
      maxContribution: 20,
      components: [
        {
          id: 'jupiter_wealth_houses',
          points: 10,
          condition: { ko: '목성이 재물 하우스에', en: 'Jupiter in wealth houses' },
          conditionType: 'planet_in_house',
          params: { planet: 'jupiter', houses: [2, 8, 10] }
        },
        {
          id: 'saturn_stability',
          points: 6,
          condition: { ko: '토성이 안정 하우스에', en: 'Saturn in stability houses' },
          conditionType: 'planet_in_house',
          params: { planet: 'saturn', houses: [2, 10] }
        },
        {
          id: 'planets_in_2nd',
          points: 4,
          condition: { ko: '2하우스에 행성 있음', en: 'Planets in 2nd house' },
          conditionType: 'custom'
        }
      ]
    },
    {
      name: 'synergy',
      maxContribution: 5,
      components: [
        {
          id: 'jaeseong_jupiter_combo',
          points: 5,
          condition: { ko: '재성 + 목성 조합', en: 'Wealth stars + Jupiter combo' },
          conditionType: 'custom'
        }
      ]
    }
  ]
};

/**
 * Karma Score configuration (카르마 점수)
 * Used in karma analysis - measures depth of karmic insight available
 */
export const KARMA_SCORE_CONFIG: ScoringConfig = {
  domain: 'karma',
  baseScore: 65,
  maxScore: 100,
  minScore: 65,
  categories: [
    {
      name: 'astrology',
      maxContribution: 20,
      components: [
        {
          id: 'north_node',
          points: 8,
          condition: { ko: '노스노드 데이터 있음', en: 'North Node data available' },
          conditionType: 'custom'
        },
        {
          id: 'chiron',
          points: 6,
          condition: { ko: '카이론 데이터 있음', en: 'Chiron data available' },
          conditionType: 'custom'
        },
        {
          id: 'saturn_house',
          points: 4,
          condition: { ko: '토성 하우스 데이터', en: 'Saturn house data' },
          conditionType: 'custom'
        },
        {
          id: 'pluto_house',
          points: 2,
          condition: { ko: '명왕성 하우스 데이터', en: 'Pluto house data' },
          conditionType: 'custom'
        }
      ]
    },
    {
      name: 'saju',
      maxContribution: 10,
      components: [
        {
          id: 'geokguk',
          points: 5,
          condition: { ko: '격국 타입 있음', en: 'Geokguk type available' },
          conditionType: 'custom'
        },
        {
          id: 'day_master',
          points: 3,
          condition: { ko: '일간 데이터 있음', en: 'Day master data available' },
          conditionType: 'custom'
        },
        {
          id: 'fated_connections',
          points: 2,
          condition: { ko: '운명적 인연 신살', en: 'Fated connection shinsal' },
          conditionType: 'has_shinsal',
          params: { shinsal: ['홍염', '역마', '귀문', '도화'] }
        }
      ]
    },
    {
      name: 'synergy',
      maxContribution: 5,
      components: [
        {
          id: 'rich_data_combo',
          points: 5,
          condition: { ko: '점성 + 사주 데이터 풍부', en: 'Rich astro + saju data' },
          conditionType: 'custom'
        }
      ]
    }
  ]
};
