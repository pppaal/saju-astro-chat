/**
 * Career Event Timing Strategy
 * 커리어(취업/이직/승진) 시기 분석 전략
 */

import { BaseEventStrategy, type ScoringContext, type ScoreResult } from './types';
import { EVENT_SCORING } from '../constants/scoring';
import type { FiveElement } from '@/lib/Saju/types';

export class CareerStrategy extends BaseEventStrategy {
  readonly eventType = 'career';

  applySibsinBonus(context: ScoringContext, result: ScoreResult): void {
    // 커리어에 유리한 십성: 관성(직장), 인성(학습), 식상(능력 발휘)
    const favorableSibsin = ['정관', '편관', '정인', '편인', '식신', '상관'];
    const avoidSibsin = ['겁재'];

    if (favorableSibsin.includes(context.sibsin)) {
      result.score += EVENT_SCORING.CAREER_FAVORABLE_SIBSIN;
      result.reasons.push(`${context.sibsin}운 - 커리어 발전`);
    }

    if (avoidSibsin.includes(context.sibsin)) {
      result.score -= EVENT_SCORING.CAREER_UNFAVORABLE_SIBSIN;
      result.avoidReasons.push(`${context.sibsin}운 - 경쟁 심화`);
    }
  }

  applyTwelveStageBonus(context: ScoringContext, result: ScoreResult): void {
    // 커리어에 유리한 십이운성: 관대, 건록, 제왕
    const favorableStages = ['관대', '건록', '제왕', '장생'];
    const avoidStages = ['사', '묘', '절', '태'];

    if (favorableStages.includes(context.twelveStage.stage)) {
      result.score += EVENT_SCORING.CAREER_FAVORABLE_SIBSIN;
      result.reasons.push(`${context.twelveStage.stage} - 왕성한 활동기`);
    }

    if (avoidStages.includes(context.twelveStage.stage)) {
      result.score -= EVENT_SCORING.CAREER_UNFAVORABLE_SIBSIN;
      result.avoidReasons.push(`${context.twelveStage.stage} - 에너지 부족`);
    }
  }

  applyElementBonus(context: ScoringContext, result: ScoreResult): void {
    // 커리어에 유리한 오행: 목(木), 화(火) - 성장과 활동
    const favorableElements: FiveElement[] = ['목', '화'];

    if (favorableElements.includes(context.monthElement)) {
      result.score += EVENT_SCORING.FAVORABLE_STAGE;
      result.reasons.push(`${context.monthElement} 기운 - 활동력 증가`);
    }
  }

  applyProgressionBonus(context: ScoringContext, result: ScoreResult): void {
    if (!context.progression) {return;}

    // 커리어: 태양이 10하우스(커리어) 또는 1하우스(자아)에 있을 때 유리
    if (
      context.progression.sun.house === 10 ||
      context.progression.sun.house === 1
    ) {
      result.score += 10;
      result.reasons.push(
        `진행 태양 ${context.progression.sun.house}하우스 - 커리어 상승`
      );
    }

    // 보름달: 성과 가시화
    if (context.progression.moon.phase === 'Full') {
      result.score += 8;
      result.reasons.push('진행 보름달 - 성과 결실기');
    }
  }

  applyDaeunBonus(context: ScoringContext, result: ScoreResult): void {
    super.applyDaeunBonus(context, result);

    if (!context.daeun) {return;}

    // 커리어: 대운이 목화 기운일 때 유리
    const favorableDaeunElements: FiveElement[] = ['목', '화'];
    if (favorableDaeunElements.includes(context.daeun.element)) {
      result.score += 12;
      result.reasons.push(`대운 ${context.daeun.element} - 커리어 확장기`);
    }
  }
}
