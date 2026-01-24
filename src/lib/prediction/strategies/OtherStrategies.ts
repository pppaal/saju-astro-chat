/**
 * Other Event Timing Strategies
 * 기타 이벤트 시기 분석 전략들 (설정 기반)
 */

import { ConfigurableEventStrategy, type StrategyConfig } from './types';
import { EVENT_SCORING } from '../constants/scoring';
import type { FiveElement } from '@/lib/Saju/types';

/**
 * 전략 설정 정의
 */
const STRATEGY_CONFIGS: Record<string, StrategyConfig> = {
  relationship: {
    eventType: 'relationship',
    sibsin: {
      favorable: ['정재', '편재', '정관', '편관'],
      favorableScore: EVENT_SCORING.MARRIAGE_FAVORABLE_SIBSIN,
      favorableReason: '{value}운 - 관계 발전',
    },
    twelveStage: {
      favorable: ['목욕', '관대', '건록'],
      favorableScore: EVENT_SCORING.FAVORABLE_TWELVE_STAGE,
      favorableReason: '{value} - 사교운 상승',
    },
    element: {
      favorable: ['수', '목'] as FiveElement[],
      favorableScore: EVENT_SCORING.FAVORABLE_ELEMENT,
      favorableReason: '{value} 기운 - 감정 조화',
    },
    daeun: {
      favorable: ['수', '금'] as FiveElement[],
      favorableScore: EVENT_SCORING.DAEUN_FAVORABLE_MINOR,
      favorableReason: '대운 {value} - 관계운 상승',
    },
  },

  move: {
    eventType: 'move',
    sibsin: {
      favorable: ['식신', '상관', '정재'],
      favorableScore: EVENT_SCORING.MOVE_FAVORABLE_SIBSIN,
      favorableReason: '{value}운 - 변화 적기',
    },
    twelveStage: {
      favorable: ['장생', '목욕', '관대'],
      favorableScore: EVENT_SCORING.FAVORABLE_TWELVE_STAGE,
      favorableReason: '{value} - 새로운 시작',
    },
    element: {
      favorable: ['토', '목'] as FiveElement[],
      favorableScore: EVENT_SCORING.FAVORABLE_ELEMENT,
      favorableReason: '{value} 기운 - 안정 정착',
    },
    daeun: {
      favorable: ['토', '목'] as FiveElement[],
      favorableScore: EVENT_SCORING.DAEUN_FAVORABLE_MINOR,
      favorableReason: '대운 {value} - 정착운 상승',
    },
  },

  study: {
    eventType: 'study',
    sibsin: {
      favorable: ['정인', '편인', '식신'],
      favorableScore: EVENT_SCORING.CAREER_FAVORABLE_SIBSIN,
      favorableReason: '{value}운 - 학습 집중력 향상',
    },
    twelveStage: {
      favorable: ['장생', '양', '건록'],
      favorableScore: EVENT_SCORING.FAVORABLE_TWELVE_STAGE,
      favorableReason: '{value} - 흡수력 증가',
    },
    element: {
      favorable: ['수', '목'] as FiveElement[],
      favorableScore: EVENT_SCORING.FAVORABLE_ELEMENT,
      favorableReason: '{value} 기운 - 지혜 증진',
    },
    daeun: {
      favorable: ['수', '목'] as FiveElement[],
      favorableScore: EVENT_SCORING.DAEUN_FAVORABLE,
      favorableReason: '대운 {value} - 학업운 상승',
    },
  },

  health: {
    eventType: 'health',
    sibsin: {
      favorable: ['정인', '편인', '비견'],
      avoid: ['식신', '상관', '겁재'],
      favorableScore: EVENT_SCORING.HEALTH_FAVORABLE_SIBSIN,
      avoidScore: EVENT_SCORING.HEALTH_UNFAVORABLE_SIBSIN,
      favorableReason: '{value}운 - 건강 회복기',
      avoidReason: '{value}운 - 과로 주의',
    },
    twelveStage: {
      favorable: ['건록', '제왕', '양'],
      avoid: ['사', '묘', '병'],
      favorableScore: EVENT_SCORING.HEALTH_FAVORABLE_STAGE,
      avoidScore: EVENT_SCORING.HEALTH_UNFAVORABLE_STAGE,
      favorableReason: '{value} - 체력 충만',
      avoidReason: '{value} - 건강 주의',
    },
    element: {
      favorable: ['토', '목'] as FiveElement[],
      favorableScore: EVENT_SCORING.FAVORABLE_ELEMENT,
      favorableReason: '{value} 기운 - 생명력 강화',
    },
    daeun: {
      favorable: ['토', '목'] as FiveElement[],
      avoid: ['화'] as FiveElement[],
      favorableScore: EVENT_SCORING.DAEUN_FAVORABLE,
      avoidScore: EVENT_SCORING.HEALTH_UNFAVORABLE_SIBSIN,
      favorableReason: '대운 {value} - 건강운 상승',
      avoidReason: '대운 {value} - 과열 주의',
    },
  },

  business: {
    eventType: 'business',
    sibsin: {
      favorable: ['식신', '상관', '정재', '편재'],
      favorableScore: EVENT_SCORING.BUSINESS_FAVORABLE,
      favorableReason: '{value}운 - 사업 확장기',
    },
    twelveStage: {
      favorable: ['장생', '건록', '제왕'],
      favorableScore: EVENT_SCORING.BUSINESS_FAVORABLE_STAGE,
      favorableReason: '{value} - 사업 활력',
    },
    element: {
      favorable: ['화', '토'] as FiveElement[],
      favorableScore: EVENT_SCORING.BUSINESS_FAVORABLE_ELEMENT,
      favorableReason: '{value} 기운 - 사업 번창',
    },
    daeun: {
      favorable: ['화', '토'] as FiveElement[],
      favorableScore: EVENT_SCORING.DAEUN_FAVORABLE,
      favorableReason: '대운 {value} - 사업운 상승',
    },
  },

  travel: {
    eventType: 'travel',
    sibsin: {
      favorable: ['식신', '상관', '편재'],
      favorableScore: EVENT_SCORING.TRAVEL_FAVORABLE_SIBSIN,
      favorableReason: '{value}운 - 변화와 경험',
    },
    twelveStage: {
      favorable: ['목욕', '관대', '장생'],
      favorableScore: EVENT_SCORING.FAVORABLE_TWELVE_STAGE,
      favorableReason: '{value} - 활동 적기',
    },
    element: {
      favorable: ['목', '화'] as FiveElement[],
      favorableScore: EVENT_SCORING.FAVORABLE_ELEMENT,
      favorableReason: '{value} 기운 - 이동 활력',
    },
    daeun: {
      favorable: ['목', '화'] as FiveElement[],
      favorableScore: EVENT_SCORING.DAEUN_FAVORABLE_MINOR,
      favorableReason: '대운 {value} - 여행운 상승',
    },
  },

  surgery: {
    eventType: 'surgery',
    sibsin: {
      favorable: ['정인', '비견'],
      avoid: ['겁재', '양인'],
      favorableScore: EVENT_SCORING.SURGERY_FAVORABLE_SIBSIN,
      avoidScore: EVENT_SCORING.SURGERY_UNFAVORABLE_SIBSIN,
      favorableReason: '{value}운 - 회복력 양호',
      avoidReason: '{value}운 - 수술 연기 권장',
    },
    twelveStage: {
      favorable: ['건록', '제왕', '양'],
      avoid: ['사', '묘', '절', '태'],
      favorableScore: EVENT_SCORING.SURGERY_FAVORABLE_STAGE,
      avoidScore: EVENT_SCORING.SURGERY_UNFAVORABLE_STAGE,
      favorableReason: '{value} - 회복 최적기',
      avoidReason: '{value} - 수술 부적합',
    },
    element: {
      favorable: ['토', '금'] as FiveElement[],
      avoid: ['화'] as FiveElement[],
      favorableScore: EVENT_SCORING.SURGERY_FAVORABLE_ELEMENT,
      avoidScore: EVENT_SCORING.SURGERY_UNFAVORABLE_ELEMENT,
      favorableReason: '{value} 기운 - 안정 회복',
      avoidReason: '{value} 기운 - 염증 주의',
    },
    daeun: {
      favorable: ['토', '금'] as FiveElement[],
      avoid: ['화'] as FiveElement[],
      favorableScore: EVENT_SCORING.DAEUN_FAVORABLE,
      avoidScore: EVENT_SCORING.SURGERY_UNFAVORABLE_ELEMENT,
      favorableReason: '대운 {value} - 회복운 상승',
      avoidReason: '대운 {value} - 염증 위험',
    },
  },
} as const;

/**
 * 전략 인스턴스 생성 팩토리
 */
function createStrategy(configKey: string): ConfigurableEventStrategy {
  const config = STRATEGY_CONFIGS[configKey];
  if (!config) {
    throw new Error(`Unknown strategy config: ${configKey}`);
  }
  return new ConfigurableEventStrategy(config);
}

// 전략 클래스 export (하위 호환성 유지)
export class RelationshipStrategy extends ConfigurableEventStrategy {
  constructor() {
    super(STRATEGY_CONFIGS.relationship);
  }
}

export class MoveStrategy extends ConfigurableEventStrategy {
  constructor() {
    super(STRATEGY_CONFIGS.move);
  }
}

export class StudyStrategy extends ConfigurableEventStrategy {
  constructor() {
    super(STRATEGY_CONFIGS.study);
  }
}

export class HealthStrategy extends ConfigurableEventStrategy {
  constructor() {
    super(STRATEGY_CONFIGS.health);
  }
}

export class BusinessStrategy extends ConfigurableEventStrategy {
  constructor() {
    super(STRATEGY_CONFIGS.business);
  }
}

export class TravelStrategy extends ConfigurableEventStrategy {
  constructor() {
    super(STRATEGY_CONFIGS.travel);
  }
}

export class SurgeryStrategy extends ConfigurableEventStrategy {
  constructor() {
    super(STRATEGY_CONFIGS.surgery);
  }
}

// 설정 및 팩토리 export
export { STRATEGY_CONFIGS, createStrategy };
