/**
 * Investment Event Timing Strategy
 * 투자 시기 분석 전략
 */

import { BaseEventStrategy, type ScoringContext, type ScoreResult } from './types';
import { EVENT_SCORING } from '../constants/scoring';
import type { FiveElement } from '@/lib/Saju/types';

export class InvestmentStrategy extends BaseEventStrategy {
  readonly eventType = 'investment';

  applySibsinBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableSibsin = ['정재', '편재', '식신']; // 재물운, 수익 창출
    const avoidSibsin = ['겁재', '양인']; // 재물 손실

    if (favorableSibsin.includes(context.sibsin)) {
      result.score += EVENT_SCORING.BUSINESS_FAVORABLE;
      result.reasons.push(`${context.sibsin}운 - 재물운 상승`);
    }

    if (avoidSibsin.includes(context.sibsin)) {
      result.score -= EVENT_SCORING.BUSINESS_UNFAVORABLE;
      result.avoidReasons.push(`${context.sibsin}운 - 재물 손실 주의`);
    }
  }

  applyTwelveStageBonus(context: ScoringContext, result: ScoreResult): void {
    const favorableStages = ['건록', '제왕', '관대'];
    const avoidStages = ['사', '묘', '절'];

    if (favorableStages.includes(context.twelveStage.stage)) {
      result.score += EVENT_SCORING.BUSINESS_FAVORABLE;
      result.reasons.push(`${context.twelveStage.stage} - 재물 증식기`);
    }

    if (avoidStages.includes(context.twelveStage.stage)) {
      result.score -= EVENT_SCORING.BUSINESS_UNFAVORABLE;
      result.avoidReasons.push(`${context.twelveStage.stage} - 투자 위험`);
    }
  }

  applyElementBonus(context: ScoringContext, result: ScoreResult): void {
    // 토(土), 금(金) - 안정과 축적
    const favorableElements: FiveElement[] = ['토', '금'];

    if (favorableElements.includes(context.monthElement)) {
      result.score += EVENT_SCORING.FAVORABLE_STAGE;
      result.reasons.push(`${context.monthElement} 기운 - 안정적 수익`);
    }
  }
}
