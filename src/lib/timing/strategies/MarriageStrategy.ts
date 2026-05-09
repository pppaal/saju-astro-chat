/**
 * Marriage Event Timing Strategy
 * 결혼 시기 분석 전략
 */

import { BaseEventStrategy, type ScoringContext, type ScoreResult } from './types';
import { EVENT_SCORING } from '../constants/scoring';
import type { FiveElement } from '@/lib/Saju/types';

export class MarriageStrategy extends BaseEventStrategy {
  readonly eventType = 'marriage';

  applySibsinBonus(context: ScoringContext, result: ScoreResult): void {
    // 결혼에 유리한 십성: 재성(재산), 관성(배우자)
    const favorableSibsin = ['정재', '편재', '정관', '편관'];
    const avoidSibsin = ['겁재', '양인'];

    if (favorableSibsin.includes(context.sibsin)) {
      result.score += EVENT_SCORING.MARRIAGE_FAVORABLE_SIBSIN;
      result.reasons.push(`${context.sibsin}운 - 결혼에 유리`);
    }

    if (avoidSibsin.includes(context.sibsin)) {
      result.score -= EVENT_SCORING.MARRIAGE_UNFAVORABLE_SIBSIN;
      result.avoidReasons.push(`${context.sibsin}운 - 결혼에 불리`);
    }
  }

  applyTwelveStageBonus(context: ScoringContext, result: ScoreResult): void {
    // 결혼에 유리한 십이운성: 건록, 제왕, 관대
    const favorableStages = ['건록', '제왕', '관대', '목욕'];
    const avoidStages = ['사', '묘', '절'];

    if (favorableStages.includes(context.twelveStage.stage)) {
      result.score += EVENT_SCORING.CAREER_FAVORABLE_SIBSIN;
      result.reasons.push(`${context.twelveStage.stage} - 에너지 상승기`);
    }

    if (avoidStages.includes(context.twelveStage.stage)) {
      result.score -= EVENT_SCORING.CAREER_UNFAVORABLE_SIBSIN;
      result.avoidReasons.push(`${context.twelveStage.stage} - 에너지 저하기`);
    }
  }

  applyElementBonus(context: ScoringContext, result: ScoreResult): void {
    // 결혼에 유리한 오행: 수(水), 금(金) - 조화와 안정
    const favorableElements: FiveElement[] = ['수', '금'];

    if (favorableElements.includes(context.monthElement)) {
      result.score += EVENT_SCORING.FAVORABLE_STAGE;
      result.reasons.push(`${context.monthElement} 기운 - 조화`);
    }
  }

  applyProgressionBonus(context: ScoringContext, result: ScoreResult): void {
    if (!context.progression) {return;}

    // 결혼: 금성이 천칭자리 또는 황소자리에 있을 때 유리
    if (
      context.progression.venus.sign === 'Libra' ||
      context.progression.venus.sign === 'Taurus'
    ) {
      result.score += 8;
      result.reasons.push(
        `진행 금성 ${context.progression.venus.sign} - 관계 길`
      );
    }

    // 보름달: 결실기
    if (context.progression.moon.phase === 'Full') {
      result.score += 10;
      result.reasons.push('진행 보름달 - 결실기');
    }

    // 초승달: 새 시작
    if (context.progression.moon.phase === 'New') {
      result.score += 6;
      result.reasons.push('진행 초승달 - 새 시작');
    }
  }

  applyDaeunBonus(context: ScoringContext, result: ScoreResult): void {
    super.applyDaeunBonus(context, result);

    if (!context.daeun) {return;}

    // 결혼: 대운이 재성 또는 관성일 때 유리
    const favorableDaeunElements: FiveElement[] = ['수', '금'];
    if (favorableDaeunElements.includes(context.daeun.element)) {
      result.score += 10;
      result.reasons.push(`대운 ${context.daeun.element} - 결혼운 상승`);
    }
  }
}
