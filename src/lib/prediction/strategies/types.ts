/**
 * Event Timing Strategy Pattern Types
 * 이벤트별 타이밍 분석 전략 타입 정의
 */

import type { FiveElement, PreciseTwelveStage } from '../advancedTimingEngine';

/**
 * 점수 계산 컨텍스트
 */
export interface ScoringContext {
  year: number;
  month: number;
  age: number;
  dayStem: string;
  dayBranch: string;
  monthBranch: string;
  yearBranch: string;
  monthElement: FiveElement;
  twelveStage: PreciseTwelveStage;
  sibsin: string;
  yongsin?: FiveElement[];
  kisin?: FiveElement[];
  daeun?: {
    stem: string;
    branch: string;
    element: FiveElement;
    startAge: number;
    endAge: number;
  };
  solarTerm?: {
    name: string;
    nameKo: string;
    element: FiveElement;
  } | null;
  progression?: {
    sun: { house: number };
    moon: { phase: string };
    venus: { sign: string };
  };
}

/**
 * 점수 계산 결과
 */
export interface ScoreResult {
  score: number;
  reasons: string[];
  avoidReasons: string[];
}

/**
 * 이벤트 타이밍 전략 인터페이스
 */
export interface EventTimingStrategy {
  /**
   * 이벤트 타입
   */
  readonly eventType: string;

  /**
   * 기본 점수 계산
   */
  calculateBaseScore(context: ScoringContext): ScoreResult;

  /**
   * 십성 점수 가산
   */
  applySibsinBonus(context: ScoringContext, result: ScoreResult): void;

  /**
   * 십이운성 점수 가산
   */
  applyTwelveStageBonus(context: ScoringContext, result: ScoreResult): void;

  /**
   * 오행 조화 점수 가산
   */
  applyElementBonus(context: ScoringContext, result: ScoreResult): void;

  /**
   * 용신/기신 점수 가산
   */
  applyYongsinKisinBonus(context: ScoringContext, result: ScoreResult): void;

  /**
   * 절기 점수 가산
   */
  applySolarTermBonus(context: ScoringContext, result: ScoreResult): void;

  /**
   * 프로그레션 점수 가산
   */
  applyProgressionBonus(context: ScoringContext, result: ScoreResult): void;

  /**
   * 대운 점수 가산
   */
  applyDaeunBonus(context: ScoringContext, result: ScoreResult): void;
}

/**
 * 기본 전략 추상 클래스
 */
export abstract class BaseEventStrategy implements EventTimingStrategy {
  abstract readonly eventType: string;

  calculateBaseScore(context: ScoringContext): ScoreResult {
    return {
      score: 50,
      reasons: [],
      avoidReasons: [],
    };
  }

  abstract applySibsinBonus(context: ScoringContext, result: ScoreResult): void;
  abstract applyTwelveStageBonus(context: ScoringContext, result: ScoreResult): void;
  abstract applyElementBonus(context: ScoringContext, result: ScoreResult): void;

  applyYongsinKisinBonus(context: ScoringContext, result: ScoreResult): void {
    if (context.yongsin?.includes(context.monthElement)) {
      result.score += 15;
      result.reasons.push('용신 월');
    }
    if (context.kisin?.includes(context.monthElement)) {
      result.score -= 12;
      result.avoidReasons.push('기신 월');
    }
  }

  applySolarTermBonus(context: ScoringContext, result: ScoreResult): void {
    if (!context.solarTerm) return;

    if (context.yongsin?.includes(context.solarTerm.element)) {
      result.score += 8;
      result.reasons.push(`절기 용신 활성 (${context.solarTerm.element})`);
    }
  }

  applyProgressionBonus(context: ScoringContext, result: ScoreResult): void {
    // 기본 구현: 하위 클래스에서 오버라이드 가능
  }

  applyDaeunBonus(context: ScoringContext, result: ScoreResult): void {
    if (!context.daeun) return;

    // 기본 대운 점수는 모든 이벤트에 공통 적용
    if (context.solarTerm && context.daeun.element === context.solarTerm.element) {
      result.score += 12;
      result.reasons.push(`대운-절기 동기화 (${context.daeun.element})`);
    }
  }
}
