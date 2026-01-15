// src/lib/destiny-map/calendar/scoring-factory-config.ts
/**
 * Configuration objects for score calculators
 */

import { ScorerConfig } from './scoring-factory';
import { SajuScoreInput } from './scoring';
import {
  CATEGORY_MAX_SCORES,
  DAEUN_SCORES,
  SEUN_SCORES,
  WOLUN_SCORES,
  ILJIN_SCORES,
} from './scoring-config';

/**
 * Daeun (대운 - 10-year cycle) scorer configuration
 */
export const DAEUN_CONFIG: ScorerConfig<SajuScoreInput['daeun']> = {
  categoryName: 'daeun',
  maxScore: CATEGORY_MAX_SCORES.saju.daeun, // 8
  maxRaw: DAEUN_SCORES.maxRaw,

  sibsinScores: {
    positive: {
      inseong: DAEUN_SCORES.positive.inseong,
      jaeseong: DAEUN_SCORES.positive.jaeseong,
      bijeon: DAEUN_SCORES.positive.bijeon,
      siksang: DAEUN_SCORES.positive.siksang,
      hasYukhap: DAEUN_SCORES.positive.yukhap,
      hasSamhapPositive: DAEUN_SCORES.positive.samhapPositive,
    },
    negative: {
      gwansal: DAEUN_SCORES.negative.gwansal,
      hasChung: DAEUN_SCORES.negative.chung,
      hasGwansal: DAEUN_SCORES.negative.gwansal,
      hasSamhapNegative: DAEUN_SCORES.negative.samhapNegative,
    },
  },

  booleanPropertyMap: {
    positive: ['hasYukhap', 'hasSamhapPositive'],
    negative: ['hasChung', 'hasGwansal', 'hasSamhapNegative'],
  },
};

/**
 * Seun (세운 - 1-year cycle) scorer configuration
 */
export const SEUN_CONFIG: ScorerConfig<SajuScoreInput['seun']> = {
  categoryName: 'seun',
  maxScore: CATEGORY_MAX_SCORES.saju.seun, // 12
  maxRaw: SEUN_SCORES.maxRaw,

  sibsinScores: {
    positive: {
      inseong: SEUN_SCORES.positive.inseong,
      jaeseong: SEUN_SCORES.positive.jaeseong,
      bijeon: SEUN_SCORES.positive.bijeon,
      siksang: SEUN_SCORES.positive.siksang,
      hasYukhap: SEUN_SCORES.positive.yukhap,
      hasSamhapPositive: SEUN_SCORES.positive.samhapPositive,
    },
    negative: {
      gwansal: SEUN_SCORES.negative.gwansal,
      hasChung: SEUN_SCORES.negative.chung,
      hasGwansal: SEUN_SCORES.negative.gwansal,
      hasSamhapNegative: SEUN_SCORES.negative.samhapNegative,
    },
  },

  booleanPropertyMap: {
    positive: ['hasYukhap', 'hasSamhapPositive'],
    negative: ['hasChung', 'hasGwansal', 'hasSamhapNegative'],
  },

  samjaeConfig: {
    base: SEUN_SCORES.samjae.base,
    withChung: SEUN_SCORES.samjae.withChung,
    withGwiin: SEUN_SCORES.samjae.withGwiin,
  },
};

/**
 * Wolun (월운 - 1-month cycle) scorer configuration
 */
export const WOLUN_CONFIG: ScorerConfig<SajuScoreInput['wolun']> = {
  categoryName: 'wolun',
  maxScore: CATEGORY_MAX_SCORES.saju.wolun, // 12
  maxRaw: WOLUN_SCORES.maxRaw,

  sibsinScores: {
    positive: {
      inseong: WOLUN_SCORES.positive.inseong,
      jaeseong: WOLUN_SCORES.positive.jaeseong,
      bijeon: WOLUN_SCORES.positive.bijeon,
      siksang: WOLUN_SCORES.positive.siksang,
      hasYukhap: WOLUN_SCORES.positive.yukhap,
      hasSamhapPositive: WOLUN_SCORES.positive.samhapPositive,
    },
    negative: {
      gwansal: WOLUN_SCORES.negative.gwansal,
      hasChung: WOLUN_SCORES.negative.chung,
      hasGwansal: WOLUN_SCORES.negative.gwansal,
      hasSamhapNegative: WOLUN_SCORES.negative.samhapNegative,
    },
  },

  booleanPropertyMap: {
    positive: ['hasYukhap', 'hasSamhapPositive'],
    negative: ['hasChung', 'hasGwansal', 'hasSamhapNegative'],
  },
};

/**
 * Iljin (일진 - daily cycle) scorer configuration
 */
export const ILJIN_CONFIG: ScorerConfig<SajuScoreInput['iljin']> = {
  categoryName: 'iljin',
  maxScore: CATEGORY_MAX_SCORES.saju.iljin, // 13
  maxRaw: ILJIN_SCORES.maxRaw,

  // Iljin uses sipsin (not sibsin)
  sipsinScores: ILJIN_SCORES.sipsin,

  branchScores: ILJIN_SCORES.branch,

  specialScores: ILJIN_SCORES.special,

  negativeScores: ILJIN_SCORES.negative,

  booleanPropertyMap: {
    branch: [
      'hasYukhap',
      'hasSamhapPositive',
      'hasSamhapNegative',
      'hasChung',
      'hasXing',
      'hasHai',
    ],
    special: [
      'hasCheoneulGwiin',
      'hasGeonrok',
      'hasSonEomneun',
      'hasYeokma',
      'hasDohwa',
      'hasTaegukGwiin',
      'hasCheondeokGwiin',
      'hasWoldeokGwiin',
      'hasHwagae',
    ],
    negative: [
      'hasGongmang',
      'hasWonjin',
      'hasYangin',
      'hasGoegang',
      'hasBackho',
      'hasGuimungwan',
    ],
  },
};
