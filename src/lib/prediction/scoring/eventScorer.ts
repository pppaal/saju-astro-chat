/**
 * Event Scorer
 * 이벤트별 점수 계산 모듈
 */

import type { MonthData } from '../helpers/monthDataCalculator';
import type { FiveElement, BranchInteraction } from '../advancedTimingEngine';
import { analyzeBranchInteractions } from '../advancedTimingEngine';
import { calculatePreciseTwelveStage } from '../advancedTimingEngine';
import {
  EVENT_SCORING,
  SCORING_WEIGHTS,
} from '../constants/scoring';
import { STEM_ELEMENT } from '../life-prediction-constants';

/**
 * 이벤트 조건
 */
export interface EventConditions {
  favorableSibsin: string[];
  avoidSibsin: string[];
  favorableStages: string[];
  avoidStages: string[];
  favorableElements: FiveElement[];
}

/**
 * 점수 계산 컨텍스트
 */
export interface ScoringContext {
  monthData: MonthData;
  conditions: EventConditions;
  eventType: string;
  // 사주 정보
  dayBranch: string;
  monthBranch?: string;
  yongsin?: FiveElement[];
  kisin?: FiveElement[];
  daeunList?: Array<{
    startAge: number;
    endAge: number;
    branch: string;
    element: FiveElement;
  }>;
}

/**
 * 점수 계산 결과
 */
export interface ScoringResult {
  score: number;
  reasons: string[];
  avoidReasons: string[];
}

/**
 * 이벤트 점수 계산기
 */
export class EventScorer {
  private context: ScoringContext;
  private score: number = 50;
  private reasons: string[] = [];
  private avoidReasons: string[] = [];

  constructor(context: ScoringContext) {
    this.context = context;
  }

  /**
   * 전체 점수 계산
   */
  calculate(): ScoringResult {
    this.score = 50; // 기본 점수
    this.reasons = [];
    this.avoidReasons = [];

    this.applySibsinScore();
    this.applyStageScore();
    this.applyElementScore();
    this.applyYongsinKisinScore();
    this.applySolarTermBonus();
    this.applyBranchInteractions();
    this.applyDaeunEffect();

    return {
      score: this.score,
      reasons: [...this.reasons],
      avoidReasons: [...this.avoidReasons],
    };
  }

  /**
   * 십신 점수 적용
   */
  private applySibsinScore(): void {
    const { sibsin } = this.context.monthData;
    const { conditions, eventType } = this.context;

    if (conditions.favorableSibsin.includes(sibsin)) {
      this.score += EVENT_SCORING.MARRIAGE_FAVORABLE_SIBSIN;
      this.reasons.push(`${sibsin}운 - ${eventType}에 유리`);
    }

    if (conditions.avoidSibsin.includes(sibsin)) {
      this.score -= EVENT_SCORING.MARRIAGE_UNFAVORABLE_SIBSIN;
      this.avoidReasons.push(`${sibsin}운 - ${eventType}에 불리`);
    }
  }

  /**
   * 12운성 점수 적용
   */
  private applyStageScore(): void {
    const { twelveStage } = this.context.monthData;
    const { conditions } = this.context;

    if (conditions.favorableStages.includes(twelveStage.stage)) {
      this.score += EVENT_SCORING.CAREER_FAVORABLE_SIBSIN;
      this.reasons.push(`${twelveStage.stage} - 에너지 상승기`);
    }

    if (conditions.avoidStages.includes(twelveStage.stage)) {
      this.score -= EVENT_SCORING.CAREER_UNFAVORABLE_SIBSIN;
      this.avoidReasons.push(`${twelveStage.stage} - 에너지 저하기`);
    }
  }

  /**
   * 오행 점수 적용
   */
  private applyElementScore(): void {
    const { monthGanji } = this.context.monthData;
    const { conditions } = this.context;

    const monthElement = STEM_ELEMENT[monthGanji.stem];

    if (conditions.favorableElements.includes(monthElement)) {
      this.score += EVENT_SCORING.FAVORABLE_STAGE;
      this.reasons.push(`${monthElement} 기운 - 조화`);
    }
  }

  /**
   * 용신/기신 점수 적용
   */
  private applyYongsinKisinScore(): void {
    const { monthGanji } = this.context.monthData;
    const { yongsin, kisin } = this.context;

    const monthElement = STEM_ELEMENT[monthGanji.stem];

    if (yongsin?.includes(monthElement)) {
      this.score += EVENT_SCORING.BUSINESS_FAVORABLE;
      this.reasons.push('용신 월');
    }

    if (kisin?.includes(monthElement)) {
      this.score -= EVENT_SCORING.BUSINESS_UNFAVORABLE;
      this.avoidReasons.push('기신 월');
    }
  }

  /**
   * 절기 보너스 적용
   */
  private applySolarTermBonus(): void {
    const { solarTerm } = this.context.monthData;
    const { conditions, yongsin } = this.context;

    if (!solarTerm) return;

    if (conditions.favorableElements.includes(solarTerm.element)) {
      this.score += SCORING_WEIGHTS.SOLAR_TERM_MATCH + 1;
      this.reasons.push(`${solarTerm.nameKo} 절기 - ${solarTerm.element} 기운`);
    }

    if (yongsin?.includes(solarTerm.element)) {
      this.score += SCORING_WEIGHTS.SOLAR_TERM_MATCH;
      this.reasons.push(`절기 용신 활성 (${solarTerm.element})`);
    }
  }

  /**
   * 지지 상호작용 점수 적용
   */
  private applyBranchInteractions(): void {
    const { monthGanji, yearGanji } = this.context.monthData;
    const { dayBranch, monthBranch } = this.context;

    const allBranches = [
      dayBranch,
      monthBranch || '',
      yearGanji.branch,
      monthGanji.branch,
    ].filter(Boolean);

    const interactions = analyzeBranchInteractions(allBranches);

    for (const inter of interactions) {
      if (inter.impact === 'positive') {
        this.score += inter.score * 0.3;
        if (inter.type === '삼합' || inter.type === '육합') {
          this.reasons.push(inter.description);
        }
      } else if (inter.impact === 'negative') {
        this.score += inter.score * 0.3;
        if (inter.type === '충') {
          this.avoidReasons.push(inter.description);
        }
      }
    }
  }

  /**
   * 대운 영향 적용
   */
  private applyDaeunEffect(): void {
    const { age, solarTerm } = this.context.monthData;
    const { daeunList, conditions } = this.context;

    if (!daeunList) return;

    const daeun = daeunList.find(
      (d) => age >= d.startAge && age <= d.endAge
    );

    if (!daeun) return;

    const daeunStage = calculatePreciseTwelveStage(
      this.context.monthData.monthGanji.stem,
      daeun.branch
    );

    if (conditions.favorableStages.includes(daeunStage.stage)) {
      this.score += 8;
      this.reasons.push(`대운 ${daeunStage.stage} - 장기적 지원`);
    }

    // 대운-절기 동기화
    if (solarTerm && daeun.element === solarTerm.element) {
      this.score += 7;
      this.reasons.push(`대운-절기 동기화 (${daeun.element})`);
    }
  }

  /**
   * 현재 점수 조회
   */
  getScore(): number {
    return this.score;
  }

  /**
   * 현재 이유 조회
   */
  getReasons(): string[] {
    return [...this.reasons];
  }

  /**
   * 현재 회피 이유 조회
   */
  getAvoidReasons(): string[] {
    return [...this.avoidReasons];
  }
}
