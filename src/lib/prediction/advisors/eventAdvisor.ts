/**
 * Event Advisor
 * 이벤트별 조언 생성 모듈
 */

import type { PeriodClassifierResult, OptimalPeriod, AvoidPeriod } from '../analyzers/periodClassifier';
import { EVENT_TYPE_NAMES_KO } from '../life-prediction-constants';

/**
 * 조언 생성 컨텍스트
 */
export interface AdvisorContext {
  eventType: string;
  periods: PeriodClassifierResult;
  searchRange: {
    startYear: number;
    endYear: number;
  };
}

/**
 * 이벤트 조언 생성기
 */
export class EventAdvisor {
  /**
   * 종합 조언 생성
   */
  static generateAdvice(context: AdvisorContext): string {
    const { eventType, periods } = context;
    const { optimalPeriods, avoidPeriods, candidatePeriods } = periods;

    const eventName = EVENT_TYPE_NAMES_KO[eventType] || eventType;

    // 최적 기간이 있는 경우
    if (optimalPeriods.length > 0) {
      return this.generateOptimalAdvice(eventName, optimalPeriods);
    }

    // 후보 기간만 있는 경우
    if (candidatePeriods.length > 0) {
      return this.generateCandidateAdvice(eventName, candidatePeriods);
    }

    // 회피 기간만 있는 경우
    if (avoidPeriods.length > 0) {
      return this.generateAvoidOnlyAdvice(eventName, avoidPeriods);
    }

    // 아무 기간도 없는 경우
    return this.generateNoPeriodsAdvice(eventName, context.searchRange);
  }

  /**
   * 최적 기간 조언
   */
  private static generateOptimalAdvice(
    eventName: string,
    optimalPeriods: OptimalPeriod[]
  ): string {
    const bestPeriod = optimalPeriods[0];
    const count = optimalPeriods.length;

    if (count === 1) {
      return `${eventName}을(를) 위한 최적 시기는 ${this.formatPeriodRange(bestPeriod)}입니다. ${bestPeriod.advice}`;
    } else if (count === 2) {
      const secondPeriod = optimalPeriods[1];
      return `${eventName}을(를) 위한 최적 시기는 ${this.formatPeriodRange(bestPeriod)}와 ${this.formatPeriodRange(secondPeriod)}입니다. 첫 번째 기간이 가장 유리합니다.`;
    } else {
      return `${eventName}을(를) 위한 최적 시기가 ${count}개 발견되었습니다. 가장 좋은 시기는 ${this.formatPeriodRange(bestPeriod)}입니다. 이 기간에 집중하세요.`;
    }
  }

  /**
   * 후보 기간 조언
   */
  private static generateCandidateAdvice(
    eventName: string,
    candidatePeriods: OptimalPeriod[]
  ): string {
    const bestCandidate = candidatePeriods[0];
    return `${eventName}을(를) 위한 적합한 시기는 ${this.formatPeriodRange(bestCandidate)}입니다. 충분한 준비와 함께 진행하시면 좋은 결과를 기대할 수 있습니다.`;
  }

  /**
   * 회피 기간만 있는 경우 조언
   */
  private static generateAvoidOnlyAdvice(
    eventName: string,
    avoidPeriods: AvoidPeriod[]
  ): string {
    return `검색 기간 내에 ${eventName}을(를) 위한 최적의 시기를 찾기 어렵습니다. 신중한 준비와 시기를 더 확장하여 검토해보시기 바랍니다.`;
  }

  /**
   * 기간 없음 조언
   */
  private static generateNoPeriodsAdvice(
    eventName: string,
    searchRange: { startYear: number; endYear: number }
  ): string {
    return `${searchRange.startYear}년부터 ${searchRange.endYear}년까지 ${eventName}을(를) 위한 특별히 유리한 시기가 발견되지 않았습니다. 개인의 노력과 준비가 더욱 중요합니다.`;
  }

  /**
   * 다음 최선의 시기 찾기
   */
  static findNextBestWindow(
    periods: PeriodClassifierResult
  ): OptimalPeriod | null {
    const { optimalPeriods, candidatePeriods } = periods;

    // 최적 기간이 있으면 첫 번째 반환
    if (optimalPeriods.length > 0) {
      return optimalPeriods[0];
    }

    // 후보 기간이 있으면 첫 번째 반환
    if (candidatePeriods.length > 0) {
      return candidatePeriods[0];
    }

    return null;
  }

  /**
   * 기간 범위 포맷팅
   */
  private static formatPeriodRange(period: OptimalPeriod): string {
    const start = new Date(period.startDate);
    const year = start.getFullYear();
    const month = start.getMonth() + 1;

    return `${year}년 ${month}월`;
  }

  /**
   * 상세 조언 생성
   */
  static generateDetailedAdvice(
    context: AdvisorContext
  ): {
    summary: string;
    bestPeriodAdvice: string | null;
    avoidanceAdvice: string | null;
    preparationTips: string[];
  } {
    const { eventType, periods } = context;
    const { optimalPeriods, avoidPeriods } = periods;
    const eventName = EVENT_TYPE_NAMES_KO[eventType] || eventType;

    const summary = this.generateAdvice(context);

    const bestPeriodAdvice =
      optimalPeriods.length > 0
        ? `${this.formatPeriodRange(optimalPeriods[0])}가 가장 유리합니다. ${optimalPeriods[0].reasons.slice(0, 3).join(', ')}`
        : null;

    const avoidanceAdvice =
      avoidPeriods.length > 0
        ? `${avoidPeriods.length}개의 회피 기간이 있습니다. 특히 ${this.formatPeriodRange({ startDate: avoidPeriods[0].startDate } as OptimalPeriod)}는 주의가 필요합니다.`
        : null;

    const preparationTips = this.generatePreparationTips(eventType);

    return {
      summary,
      bestPeriodAdvice,
      avoidanceAdvice,
      preparationTips,
    };
  }

  /**
   * 준비 팁 생성
   */
  private static generatePreparationTips(eventType: string): string[] {
    const tips: Record<string, string[]> = {
      marriage: [
        '상대방과의 충분한 소통과 이해가 중요합니다',
        '양가 부모님의 의견을 존중하세요',
        '재정 계획을 미리 세우는 것이 좋습니다',
      ],
      business: [
        '시장 조사와 사업 계획서를 철저히 준비하세요',
        '충분한 자금을 확보하고 리스크를 분석하세요',
        '전문가의 조언을 구하는 것이 도움이 됩니다',
      ],
      relocation: [
        '새로운 환경을 미리 답사하고 정보를 수집하세요',
        '이사 비용과 정착 자금을 준비하세요',
        '가족 구성원의 의견을 충분히 들으세요',
      ],
      investment: [
        '투자 대상에 대한 철저한 분석이 필요합니다',
        '분산 투자를 통해 리스크를 줄이세요',
        '장기적인 관점에서 접근하세요',
      ],
      career: [
        '자기개발과 역량 강화에 힘쓰세요',
        '네트워킹을 강화하고 인맥을 관리하세요',
        '목표를 명확히 하고 계획을 세우세요',
      ],
    };

    return tips[eventType] || [
      '충분한 준비와 계획이 성공의 열쇠입니다',
      '전문가의 조언을 구하세요',
      '긍정적인 마음가짐을 유지하세요',
    ];
  }
}
