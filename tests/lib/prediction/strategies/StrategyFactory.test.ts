/**
 * StrategyFactory Unit Tests
 * 이벤트 타입에 따른 전략 객체 생성 팩토리 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EventTimingStrategyFactory } from '@/lib/prediction/strategies/StrategyFactory';
import { MarriageStrategy } from '@/lib/prediction/strategies/MarriageStrategy';
import { CareerStrategy } from '@/lib/prediction/strategies/CareerStrategy';
import { InvestmentStrategy } from '@/lib/prediction/strategies/InvestmentStrategy';
import {
  RelationshipStrategy,
  MoveStrategy,
  StudyStrategy,
  HealthStrategy,
  BusinessStrategy,
  TravelStrategy,
  SurgeryStrategy,
} from '@/lib/prediction/strategies/OtherStrategies';

describe('EventTimingStrategyFactory', () => {
  describe('getStrategy', () => {
    it('should return MarriageStrategy for "marriage"', () => {
      const strategy = EventTimingStrategyFactory.getStrategy('marriage');

      expect(strategy).toBeInstanceOf(MarriageStrategy);
      expect(strategy?.eventType).toBe('marriage');
    });

    it('should return RelationshipStrategy for "relationship"', () => {
      const strategy = EventTimingStrategyFactory.getStrategy('relationship');

      expect(strategy).toBeInstanceOf(RelationshipStrategy);
      expect(strategy?.eventType).toBe('relationship');
    });

    it('should return CareerStrategy for "career"', () => {
      const strategy = EventTimingStrategyFactory.getStrategy('career');

      expect(strategy).toBeInstanceOf(CareerStrategy);
      expect(strategy?.eventType).toBe('career');
    });

    it('should return InvestmentStrategy for "investment"', () => {
      const strategy = EventTimingStrategyFactory.getStrategy('investment');

      expect(strategy).toBeInstanceOf(InvestmentStrategy);
      expect(strategy?.eventType).toBe('investment');
    });

    it('should return MoveStrategy for "move"', () => {
      const strategy = EventTimingStrategyFactory.getStrategy('move');

      expect(strategy).toBeInstanceOf(MoveStrategy);
      expect(strategy?.eventType).toBe('move');
    });

    it('should return StudyStrategy for "study"', () => {
      const strategy = EventTimingStrategyFactory.getStrategy('study');

      expect(strategy).toBeInstanceOf(StudyStrategy);
      expect(strategy?.eventType).toBe('study');
    });

    it('should return HealthStrategy for "health"', () => {
      const strategy = EventTimingStrategyFactory.getStrategy('health');

      expect(strategy).toBeInstanceOf(HealthStrategy);
      expect(strategy?.eventType).toBe('health');
    });

    it('should return BusinessStrategy for "business"', () => {
      const strategy = EventTimingStrategyFactory.getStrategy('business');

      expect(strategy).toBeInstanceOf(BusinessStrategy);
      expect(strategy?.eventType).toBe('business');
    });

    it('should return TravelStrategy for "travel"', () => {
      const strategy = EventTimingStrategyFactory.getStrategy('travel');

      expect(strategy).toBeInstanceOf(TravelStrategy);
      expect(strategy?.eventType).toBe('travel');
    });

    it('should return SurgeryStrategy for "surgery"', () => {
      const strategy = EventTimingStrategyFactory.getStrategy('surgery');

      expect(strategy).toBeInstanceOf(SurgeryStrategy);
      expect(strategy?.eventType).toBe('surgery');
    });

    it('should return null for unknown event type', () => {
      const strategy = EventTimingStrategyFactory.getStrategy('unknown');

      expect(strategy).toBeNull();
    });

    it('should return null for empty string', () => {
      const strategy = EventTimingStrategyFactory.getStrategy('');

      expect(strategy).toBeNull();
    });

    it('should return same instance for same event type (singleton pattern)', () => {
      const strategy1 = EventTimingStrategyFactory.getStrategy('career');
      const strategy2 = EventTimingStrategyFactory.getStrategy('career');

      expect(strategy1).toBe(strategy2);
    });
  });

  describe('getAllStrategies', () => {
    it('should return all 10 strategies', () => {
      const strategies = EventTimingStrategyFactory.getAllStrategies();

      expect(strategies.size).toBe(10);
    });

    it('should contain all expected event types', () => {
      const strategies = EventTimingStrategyFactory.getAllStrategies();
      const expectedTypes = [
        'marriage',
        'relationship',
        'career',
        'investment',
        'move',
        'study',
        'health',
        'business',
        'travel',
        'surgery',
      ];

      expectedTypes.forEach((type) => {
        expect(strategies.has(type)).toBe(true);
      });
    });

    it('should return a new Map instance (defensive copy)', () => {
      const strategies1 = EventTimingStrategyFactory.getAllStrategies();
      const strategies2 = EventTimingStrategyFactory.getAllStrategies();

      expect(strategies1).not.toBe(strategies2);
      expect(strategies1.size).toBe(strategies2.size);
    });

    it('should return strategies with correct event types', () => {
      const strategies = EventTimingStrategyFactory.getAllStrategies();

      strategies.forEach((strategy, eventType) => {
        expect(strategy.eventType).toBe(eventType);
      });
    });
  });

  describe('strategy interface compliance', () => {
    it('all strategies should implement calculateBaseScore', () => {
      const strategies = EventTimingStrategyFactory.getAllStrategies();

      strategies.forEach((strategy) => {
        expect(typeof strategy.calculateBaseScore).toBe('function');
      });
    });

    it('all strategies should implement applySibsinBonus', () => {
      const strategies = EventTimingStrategyFactory.getAllStrategies();

      strategies.forEach((strategy) => {
        expect(typeof strategy.applySibsinBonus).toBe('function');
      });
    });

    it('all strategies should implement applyTwelveStageBonus', () => {
      const strategies = EventTimingStrategyFactory.getAllStrategies();

      strategies.forEach((strategy) => {
        expect(typeof strategy.applyTwelveStageBonus).toBe('function');
      });
    });

    it('all strategies should implement applyElementBonus', () => {
      const strategies = EventTimingStrategyFactory.getAllStrategies();

      strategies.forEach((strategy) => {
        expect(typeof strategy.applyElementBonus).toBe('function');
      });
    });

    it('all strategies should implement applyYongsinKisinBonus', () => {
      const strategies = EventTimingStrategyFactory.getAllStrategies();

      strategies.forEach((strategy) => {
        expect(typeof strategy.applyYongsinKisinBonus).toBe('function');
      });
    });

    it('all strategies should implement applySolarTermBonus', () => {
      const strategies = EventTimingStrategyFactory.getAllStrategies();

      strategies.forEach((strategy) => {
        expect(typeof strategy.applySolarTermBonus).toBe('function');
      });
    });

    it('all strategies should implement applyProgressionBonus', () => {
      const strategies = EventTimingStrategyFactory.getAllStrategies();

      strategies.forEach((strategy) => {
        expect(typeof strategy.applyProgressionBonus).toBe('function');
      });
    });

    it('all strategies should implement applyDaeunBonus', () => {
      const strategies = EventTimingStrategyFactory.getAllStrategies();

      strategies.forEach((strategy) => {
        expect(typeof strategy.applyDaeunBonus).toBe('function');
      });
    });
  });

  describe('base score consistency', () => {
    it('all strategies should return base score of 50', () => {
      const strategies = EventTimingStrategyFactory.getAllStrategies();
      const mockContext = {
        year: 2024,
        month: 6,
        age: 30,
        dayStem: '갑',
        dayBranch: '자',
        monthBranch: '오',
        yearBranch: '진',
        monthElement: '목' as const,
        twelveStage: { stage: '건록', energy: 0.8 },
        sibsin: '정관',
      };

      strategies.forEach((strategy) => {
        const result = strategy.calculateBaseScore(mockContext);
        expect(result.score).toBe(50);
        expect(result.reasons).toEqual([]);
        expect(result.avoidReasons).toEqual([]);
      });
    });
  });
});
