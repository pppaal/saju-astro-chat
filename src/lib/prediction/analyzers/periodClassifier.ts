/**
 * Period Classifier
 * 점수 기반 기간 분류 모듈
 */

import type { MonthData } from '../helpers/monthDataCalculator';
import type { ScoringResult } from '../scoring/eventScorer';

/**
 * 최적 기간
 */
export interface OptimalPeriod {
  startDate: string;
  endDate: string;
  score: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  reasons: string[];
  advice: string;
}

/**
 * 회피 기간
 */
export interface AvoidPeriod {
  startDate: string;
  endDate: string;
  score: number;
  reasons: string[];
  warning: string;
}

/**
 * 분류 결과
 */
export interface PeriodClassifierResult {
  optimalPeriods: OptimalPeriod[];
  avoidPeriods: AvoidPeriod[];
  candidatePeriods: OptimalPeriod[];
}

/**
 * 분류 임계값
 */
export interface ClassificationThresholds {
  optimal: number;
  avoid: number;
}

/**
 * 기간 분류기
 */
export class PeriodClassifier {
  private optimalPeriods: OptimalPeriod[] = [];
  private avoidPeriods: AvoidPeriod[] = [];
  private candidatePeriods: OptimalPeriod[] = [];

  constructor(
    private thresholds: ClassificationThresholds = {
      optimal: 70,
      avoid: 40,
    }
  ) {}

  /**
   * 기간 추가 및 분류
   */
  addPeriod(monthData: MonthData, scoringResult: ScoringResult): void {
    const { score, reasons, avoidReasons } = scoringResult;
    const { year, month } = monthData;

    const startDate = this.formatDate(year, month, 1);
    const endDate = this.formatDate(year, month, this.getLastDay(year, month));

    if (score >= this.thresholds.optimal) {
      // 최적 기간
      this.optimalPeriods.push({
        startDate,
        endDate,
        score,
        grade: this.scoreToGrade(score),
        reasons,
        advice: this.generateAdvice(score, reasons),
      });
    } else if (score < this.thresholds.avoid) {
      // 회피 기간
      this.avoidPeriods.push({
        startDate,
        endDate,
        score,
        reasons: avoidReasons,
        warning: this.generateWarning(avoidReasons),
      });
    } else if (score >= 60) {
      // 후보 기간
      this.candidatePeriods.push({
        startDate,
        endDate,
        score,
        grade: this.scoreToGrade(score),
        reasons,
        advice: this.generateAdvice(score, reasons),
      });
    }
  }

  /**
   * 결과 조회
   */
  getResult(): PeriodClassifierResult {
    // 점수순 정렬
    this.optimalPeriods.sort((a, b) => b.score - a.score);
    this.candidatePeriods.sort((a, b) => b.score - a.score);
    this.avoidPeriods.sort((a, b) => a.score - b.score);

    return {
      optimalPeriods: this.optimalPeriods,
      avoidPeriods: this.avoidPeriods,
      candidatePeriods: this.candidatePeriods,
    };
  }

  /**
   * 최적 기간 조회
   */
  getOptimalPeriods(): OptimalPeriod[] {
    return [...this.optimalPeriods];
  }

  /**
   * 회피 기간 조회
   */
  getAvoidPeriods(): AvoidPeriod[] {
    return [...this.avoidPeriods];
  }

  /**
   * 후보 기간 조회
   */
  getCandidatePeriods(): OptimalPeriod[] {
    return [...this.candidatePeriods];
  }

  /**
   * 점수를 등급으로 변환
   */
  private scoreToGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
    if (score >= 85) return 'S';
    if (score >= 75) return 'A';
    if (score >= 65) return 'B';
    if (score >= 55) return 'C';
    return 'D';
  }

  /**
   * 조언 생성
   */
  private generateAdvice(score: number, reasons: string[]): string {
    if (score >= 85) {
      return '최고의 타이밍입니다. 적극적으로 진행하세요.';
    } else if (score >= 75) {
      return '매우 좋은 시기입니다. 계획을 실행에 옮기기 좋습니다.';
    } else if (score >= 65) {
      return '긍정적인 시기입니다. 신중하게 준비하면 좋은 결과를 얻을 수 있습니다.';
    } else {
      return '적절한 준비가 필요한 시기입니다.';
    }
  }

  /**
   * 경고 생성
   */
  private generateWarning(reasons: string[]): string {
    if (reasons.length === 0) {
      return '이 기간은 신중한 접근이 필요합니다.';
    }
    return `주의: ${reasons[0]}`;
  }

  /**
   * 날짜 포맷팅
   */
  private formatDate(year: number, month: number, day: number): string {
    const monthStr = String(month).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${monthStr}-${dayStr}`;
  }

  /**
   * 월의 마지막 날 조회
   */
  private getLastDay(year: number, month: number): number {
    return new Date(year, month, 0).getDate();
  }

  /**
   * 통계 조회
   */
  getStatistics(): {
    totalPeriods: number;
    optimalCount: number;
    avoidCount: number;
    candidateCount: number;
    averageOptimalScore: number;
  } {
    const optimalCount = this.optimalPeriods.length;
    const averageOptimalScore =
      optimalCount > 0
        ? this.optimalPeriods.reduce((sum, p) => sum + p.score, 0) / optimalCount
        : 0;

    return {
      totalPeriods: optimalCount + this.avoidPeriods.length + this.candidatePeriods.length,
      optimalCount,
      avoidCount: this.avoidPeriods.length,
      candidateCount: this.candidatePeriods.length,
      averageOptimalScore,
    };
  }

  /**
   * 리셋
   */
  reset(): void {
    this.optimalPeriods = [];
    this.avoidPeriods = [];
    this.candidatePeriods = [];
  }
}
