/**
 * Other Event Timing Strategies
 * 기타 이벤트 시기 분석 전략들
 */

import { BaseEventStrategy, type ScoringContext, type ScoreResult } from './types';
import { EVENT_SCORING } from '../constants/scoring';

/**
 * 관계/연애 전략
 */
export class RelationshipStrategy extends BaseEventStrategy {
  readonly eventType = 'relationship';

  applySibsinBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableSibsin = ['정재', '편재', '정관', '편관'];
    if (favorableSibsin.includes(context.sibsin)) {
      result.score += EVENT_SCORING.MARRIAGE_FAVORABLE_SIBSIN;
      result.reasons.push(`${context.sibsin}운 - 관계 발전`);
    }
  }

  applyTwelveStageBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableStages = ['목욕', '관대', '건록'];
    if (favorableStages.includes(context.twelveStage.stage)) {
      result.score += 12;
      result.reasons.push(`${context.twelveStage.stage} - 사교운 상승`);
    }
  }

  applyElementBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableElements: any[] = ['水', '木'];
    if (favorableElements.includes(context.monthElement)) {
      result.score += 10;
      result.reasons.push(`${context.monthElement} 기운 - 감정 조화`);
    }
  }
}

/**
 * 이사 전략
 */
export class MoveStrategy extends BaseEventStrategy {
  readonly eventType = 'move';

  applySibsinBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableSibsin = ['식신', '상관', '정재'];
    if (favorableSibsin.includes(context.sibsin)) {
      result.score += 15;
      result.reasons.push(`${context.sibsin}운 - 변화 적기`);
    }
  }

  applyTwelveStageBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableStages = ['장생', '목욕', '관대'];
    if (favorableStages.includes(context.twelveStage.stage)) {
      result.score += 12;
      result.reasons.push(`${context.twelveStage.stage} - 새로운 시작`);
    }
  }

  applyElementBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableElements: any[] = ['土', '木'];
    if (favorableElements.includes(context.monthElement)) {
      result.score += 10;
      result.reasons.push(`${context.monthElement} 기운 - 안정 정착`);
    }
  }
}

/**
 * 학업 전략
 */
export class StudyStrategy extends BaseEventStrategy {
  readonly eventType = 'study';

  applySibsinBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableSibsin = ['정인', '편인', '식신'];
    if (favorableSibsin.includes(context.sibsin)) {
      result.score += EVENT_SCORING.CAREER_FAVORABLE_SIBSIN;
      result.reasons.push(`${context.sibsin}운 - 학습 집중력 향상`);
    }
  }

  applyTwelveStageBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableStages = ['장생', '양', '건록'];
    if (favorableStages.includes(context.twelveStage.stage)) {
      result.score += 12;
      result.reasons.push(`${context.twelveStage.stage} - 흡수력 증가`);
    }
  }

  applyElementBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableElements: any[] = ['水', '木'];
    if (favorableElements.includes(context.monthElement)) {
      result.score += 10;
      result.reasons.push(`${context.monthElement} 기운 - 지혜 증진`);
    }
  }
}

/**
 * 건강 전략
 */
export class HealthStrategy extends BaseEventStrategy {
  readonly eventType = 'health';

  applySibsinBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableSibsin = ['정인', '편인', '비견'];
    const avoidSibsin = ['식상', '상관', '겁재'];

    if (favorableSibsin.includes(context.sibsin)) {
      result.score += 12;
      result.reasons.push(`${context.sibsin}운 - 건강 회복기`);
    }

    if (avoidSibsin.includes(context.sibsin)) {
      result.score -= 10;
      result.avoidReasons.push(`${context.sibsin}운 - 과로 주의`);
    }
  }

  applyTwelveStageBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableStages = ['건록', '제왕', '양'];
    const avoidStages = ['사', '묘', '병'];

    if (favorableStages.includes(context.twelveStage.stage)) {
      result.score += 15;
      result.reasons.push(`${context.twelveStage.stage} - 체력 충만`);
    }

    if (avoidStages.includes(context.twelveStage.stage)) {
      result.score -= 12;
      result.avoidReasons.push(`${context.twelveStage.stage} - 건강 주의`);
    }
  }

  applyElementBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableElements: any[] = ['土', '木'];
    if (favorableElements.includes(context.monthElement)) {
      result.score += 10;
      result.reasons.push(`${context.monthElement} 기운 - 생명력 강화`);
    }
  }
}

/**
 * 사업 시작 전략
 */
export class BusinessStrategy extends BaseEventStrategy {
  readonly eventType = 'business';

  applySibsinBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableSibsin = ['식신', '상관', '정재', '편재'];
    if (favorableSibsin.includes(context.sibsin)) {
      result.score += EVENT_SCORING.BUSINESS_FAVORABLE;
      result.reasons.push(`${context.sibsin}운 - 사업 확장기`);
    }
  }

  applyTwelveStageBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableStages = ['장생', '건록', '제왕'];
    if (favorableStages.includes(context.twelveStage.stage)) {
      result.score += 15;
      result.reasons.push(`${context.twelveStage.stage} - 사업 활력`);
    }
  }

  applyElementBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableElements: any[] = ['火', '土'];
    if (favorableElements.includes(context.monthElement)) {
      result.score += 12;
      result.reasons.push(`${context.monthElement} 기운 - 사업 번창`);
    }
  }
}

/**
 * 여행 전략
 */
export class TravelStrategy extends BaseEventStrategy {
  readonly eventType = 'travel';

  applySibsinBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableSibsin = ['식신', '상관', '편재'];
    if (favorableSibsin.includes(context.sibsin)) {
      result.score += 12;
      result.reasons.push(`${context.sibsin}운 - 변화와 경험`);
    }
  }

  applyTwelveStageBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableStages = ['목욕', '관대', '장생'];
    if (favorableStages.includes(context.twelveStage.stage)) {
      result.score += 12;
      result.reasons.push(`${context.twelveStage.stage} - 활동 적기`);
    }
  }

  applyElementBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableElements: any[] = ['木', '火'];
    if (favorableElements.includes(context.monthElement)) {
      result.score += 10;
      result.reasons.push(`${context.monthElement} 기운 - 이동 활력`);
    }
  }
}

/**
 * 수술 전략
 */
export class SurgeryStrategy extends BaseEventStrategy {
  readonly eventType = 'surgery';

  applySibsinBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableSibsin = ['정인', '비견'];
    const avoidSibsin = ['겁재', '양인'];

    if (favorableSibsin.includes(context.sibsin)) {
      result.score += 15;
      result.reasons.push(`${context.sibsin}운 - 회복력 양호`);
    }

    if (avoidSibsin.includes(context.sibsin)) {
      result.score -= 15;
      result.avoidReasons.push(`${context.sibsin}운 - 수술 연기 권장`);
    }
  }

  applyTwelveStageBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableStages = ['건록', '제왕', '양'];
    const avoidStages = ['사', '묘', '절', '태'];

    if (favorableStages.includes(context.twelveStage.stage)) {
      result.score += 18;
      result.reasons.push(`${context.twelveStage.stage} - 회복 최적기`);
    }

    if (avoidStages.includes(context.twelveStage.stage)) {
      result.score -= 20;
      result.avoidReasons.push(`${context.twelveStage.stage} - 수술 부적합`);
    }
  }

  applyElementBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableElements: any[] = ['土', '金'];
    const avoidElements: any[] = ['火'];

    if (favorableElements.includes(context.monthElement)) {
      result.score += 12;
      result.reasons.push(`${context.monthElement} 기운 - 안정 회복`);
    }

    if (avoidElements.includes(context.monthElement)) {
      result.score -= 10;
      result.avoidReasons.push(`${context.monthElement} 기운 - 염증 주의`);
    }
  }
}
