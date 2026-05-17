/**
 * Event Timing Strategy Factory
 * 이벤트 타입에 따른 전략 객체 생성
 */

import type { EventType } from '../lifePredictionEngine';
import type { EventTimingStrategy } from './types';
import { MarriageStrategy } from './MarriageStrategy';
import { CareerStrategy } from './CareerStrategy';
import { InvestmentStrategy } from './InvestmentStrategy';
import {
  RelationshipStrategy,
  MoveStrategy,
  StudyStrategy,
  HealthStrategy,
  BusinessStrategy,
  TravelStrategy,
  SurgeryStrategy,
} from './OtherStrategies';

/**
 * 전략 팩토리 클래스
 */
export class EventTimingStrategyFactory {
  private static strategies: Map<string, EventTimingStrategy> = new Map();

  /**
   * 전략 초기화
   */
  private static initialize(): void {
    if (this.strategies.size > 0) {return;}

    this.strategies.set('marriage', new MarriageStrategy());
    this.strategies.set('relationship', new RelationshipStrategy());
    this.strategies.set('career', new CareerStrategy());
    this.strategies.set('investment', new InvestmentStrategy());
    this.strategies.set('move', new MoveStrategy());
    this.strategies.set('study', new StudyStrategy());
    this.strategies.set('health', new HealthStrategy());
    this.strategies.set('business', new BusinessStrategy());
    this.strategies.set('travel', new TravelStrategy());
    this.strategies.set('surgery', new SurgeryStrategy());
  }

  /**
   * 이벤트 타입에 맞는 전략 가져오기
   */
  static getStrategy(eventType: EventType | string): EventTimingStrategy | null {
    this.initialize();
    return this.strategies.get(eventType) || null;
  }

  /**
   * 모든 전략 목록 가져오기
   */
  static getAllStrategies(): Map<string, EventTimingStrategy> {
    this.initialize();
    return new Map(this.strategies);
  }
}
