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
 * 조건부 점수 설정
 */
export interface ConditionalScoreConfig {
  /** 유리한 조건 목록 */
  favorable?: readonly string[];
  /** 불리한 조건 목록 */
  avoid?: readonly string[];
  /** 유리한 조건 점수 */
  favorableScore: number;
  /** 불리한 조건 점수 (양수로 입력, 내부에서 감산) */
  avoidScore?: number;
  /** 유리한 조건 사유 템플릿 */
  favorableReason: string;
  /** 불리한 조건 사유 템플릿 */
  avoidReason?: string;
}

/**
 * 전략 설정 인터페이스
 */
export interface StrategyConfig {
  /** 이벤트 타입 */
  eventType: string;
  /** 십성 설정 */
  sibsin: ConditionalScoreConfig;
  /** 십이운성 설정 */
  twelveStage: ConditionalScoreConfig;
  /** 오행 설정 */
  element: ConditionalScoreConfig;
  /** 대운 설정 */
  daeun?: ConditionalScoreConfig;
}

/**
 * 기본 전략 추상 클래스
 */
export abstract class BaseEventStrategy implements EventTimingStrategy {
  abstract readonly eventType: string;

  calculateBaseScore(_context: ScoringContext): ScoreResult {
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
    if (!context.solarTerm) {return;}

    if (context.yongsin?.includes(context.solarTerm.element)) {
      result.score += 8;
      result.reasons.push(`절기 용신 활성 (${context.solarTerm.element})`);
    }
  }

  applyProgressionBonus(_context: ScoringContext, _result: ScoreResult): void {
    // 기본 구현: 하위 클래스에서 오버라이드 가능
  }

  applyDaeunBonus(context: ScoringContext, result: ScoreResult): void {
    if (!context.daeun) {return;}

    // 기본 대운 점수는 모든 이벤트에 공통 적용
    if (context.solarTerm && context.daeun.element === context.solarTerm.element) {
      result.score += 12;
      result.reasons.push(`대운-절기 동기화 (${context.daeun.element})`);
    }
  }
}

/**
 * 설정 기반 전략 클래스
 * 설정 객체를 통해 전략 로직을 선언적으로 정의
 */
export class ConfigurableEventStrategy extends BaseEventStrategy {
  readonly eventType: string;

  constructor(private readonly config: StrategyConfig) {
    super();
    this.eventType = config.eventType;
  }

  applySibsinBonus(context: ScoringContext, result: ScoreResult): void {
    this.applyConditionalScore(
      context.sibsin,
      this.config.sibsin,
      result
    );
  }

  applyTwelveStageBonus(context: ScoringContext, result: ScoreResult): void {
    this.applyConditionalScore(
      context.twelveStage.stage,
      this.config.twelveStage,
      result
    );
  }

  applyElementBonus(context: ScoringContext, result: ScoreResult): void {
    this.applyConditionalScore(
      context.monthElement,
      this.config.element,
      result
    );
  }

  applyDaeunBonus(context: ScoringContext, result: ScoreResult): void {
    super.applyDaeunBonus(context, result);

    if (!context.daeun || !this.config.daeun) {return;}

    this.applyConditionalScore(
      context.daeun.element,
      this.config.daeun,
      result
    );
  }

  /**
   * 조건부 점수 적용 헬퍼
   */
  private applyConditionalScore(
    value: string,
    config: ConditionalScoreConfig,
    result: ScoreResult
  ): void {
    if (config.favorable?.includes(value)) {
      result.score += config.favorableScore;
      result.reasons.push(config.favorableReason.replace('{value}', value));
    }

    if (config.avoid?.includes(value) && config.avoidScore) {
      result.score -= config.avoidScore;
      result.avoidReasons.push(
        (config.avoidReason ?? '').replace('{value}', value)
      );
    }
  }
}
