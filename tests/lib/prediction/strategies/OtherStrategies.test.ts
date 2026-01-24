/**
 * OtherStrategies Unit Tests
 * 기타 이벤트 시기 분석 전략들 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  RelationshipStrategy,
  MoveStrategy,
  StudyStrategy,
  HealthStrategy,
  BusinessStrategy,
  TravelStrategy,
  SurgeryStrategy,
} from '@/lib/prediction/strategies/OtherStrategies';
import type { ScoringContext, ScoreResult } from '@/lib/prediction/strategies/types';
import { EVENT_SCORING } from '@/lib/prediction/constants/scoring';

const createBaseContext = (overrides: Partial<ScoringContext> = {}): ScoringContext => ({
  year: 2024,
  month: 6,
  age: 30,
  dayStem: '갑',
  dayBranch: '자',
  monthBranch: '오',
  yearBranch: '진',
  monthElement: '목',
  twelveStage: { stage: '건록', energy: 0.8 },
  sibsin: '정재',
  ...overrides,
});

const createBaseResult = (): ScoreResult => ({
  score: 50,
  reasons: [],
  avoidReasons: [],
});

describe('RelationshipStrategy', () => {
  const strategy = new RelationshipStrategy();

  describe('eventType', () => {
    it('should have eventType as "relationship"', () => {
      expect(strategy.eventType).toBe('relationship');
    });
  });

  describe('applySibsinBonus', () => {
    it.each(['정재', '편재', '정관', '편관'])(
      'should add bonus for favorable sibsin: %s',
      (sibsin) => {
        const context = createBaseContext({ sibsin });
        const result = createBaseResult();

        strategy.applySibsinBonus(context, result);

        expect(result.score).toBe(50 + EVENT_SCORING.MARRIAGE_FAVORABLE_SIBSIN);
        expect(result.reasons).toContain(`${sibsin}운 - 관계 발전`);
      }
    );
  });

  describe('applyTwelveStageBonus', () => {
    it.each(['목욕', '관대', '건록'])('should add bonus for favorable stage: %s', (stage) => {
      const context = createBaseContext({
        twelveStage: { stage, energy: 0.8 },
      });
      const result = createBaseResult();

      strategy.applyTwelveStageBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.FAVORABLE_TWELVE_STAGE);
      expect(result.reasons).toContain(`${stage} - 사교운 상승`);
    });
  });

  describe('applyElementBonus', () => {
    it.each(['수', '목'] as const)('should add bonus for favorable element: %s', (element) => {
      const context = createBaseContext({ monthElement: element });
      const result = createBaseResult();

      strategy.applyElementBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.FAVORABLE_ELEMENT);
      expect(result.reasons).toContain(`${element} 기운 - 감정 조화`);
    });
  });

  describe('applyDaeunBonus', () => {
    it.each(['수', '금'] as const)('should add bonus for favorable daeun element: %s', (element) => {
      const context = createBaseContext({
        daeun: {
          stem: '임',
          branch: '자',
          element,
          startAge: 25,
          endAge: 35,
        },
      });
      const result = createBaseResult();

      strategy.applyDaeunBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.DAEUN_FAVORABLE_MINOR);
      expect(result.reasons).toContain(`대운 ${element} - 관계운 상승`);
    });
  });
});

describe('MoveStrategy', () => {
  const strategy = new MoveStrategy();

  describe('eventType', () => {
    it('should have eventType as "move"', () => {
      expect(strategy.eventType).toBe('move');
    });
  });

  describe('applySibsinBonus', () => {
    it.each(['식신', '상관', '정재'])('should add bonus for favorable sibsin: %s', (sibsin) => {
      const context = createBaseContext({ sibsin });
      const result = createBaseResult();

      strategy.applySibsinBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.MOVE_FAVORABLE_SIBSIN);
      expect(result.reasons).toContain(`${sibsin}운 - 변화 적기`);
    });
  });

  describe('applyTwelveStageBonus', () => {
    it.each(['장생', '목욕', '관대'])('should add bonus for favorable stage: %s', (stage) => {
      const context = createBaseContext({
        twelveStage: { stage, energy: 0.8 },
      });
      const result = createBaseResult();

      strategy.applyTwelveStageBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.FAVORABLE_TWELVE_STAGE);
      expect(result.reasons).toContain(`${stage} - 새로운 시작`);
    });
  });

  describe('applyElementBonus', () => {
    it.each(['토', '목'] as const)('should add bonus for favorable element: %s', (element) => {
      const context = createBaseContext({ monthElement: element });
      const result = createBaseResult();

      strategy.applyElementBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.FAVORABLE_ELEMENT);
      expect(result.reasons).toContain(`${element} 기운 - 안정 정착`);
    });
  });

  describe('applyDaeunBonus', () => {
    it.each(['토', '목'] as const)('should add bonus for favorable daeun element: %s', (element) => {
      const context = createBaseContext({
        daeun: {
          stem: '갑',
          branch: '인',
          element,
          startAge: 25,
          endAge: 35,
        },
      });
      const result = createBaseResult();

      strategy.applyDaeunBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.DAEUN_FAVORABLE_MINOR);
      expect(result.reasons).toContain(`대운 ${element} - 정착운 상승`);
    });
  });
});

describe('StudyStrategy', () => {
  const strategy = new StudyStrategy();

  describe('eventType', () => {
    it('should have eventType as "study"', () => {
      expect(strategy.eventType).toBe('study');
    });
  });

  describe('applySibsinBonus', () => {
    it.each(['정인', '편인', '식신'])('should add bonus for favorable sibsin: %s', (sibsin) => {
      const context = createBaseContext({ sibsin });
      const result = createBaseResult();

      strategy.applySibsinBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.CAREER_FAVORABLE_SIBSIN);
      expect(result.reasons).toContain(`${sibsin}운 - 학습 집중력 향상`);
    });
  });

  describe('applyTwelveStageBonus', () => {
    it.each(['장생', '양', '건록'])('should add bonus for favorable stage: %s', (stage) => {
      const context = createBaseContext({
        twelveStage: { stage, energy: 0.8 },
      });
      const result = createBaseResult();

      strategy.applyTwelveStageBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.FAVORABLE_TWELVE_STAGE);
      expect(result.reasons).toContain(`${stage} - 흡수력 증가`);
    });
  });

  describe('applyElementBonus', () => {
    it.each(['수', '목'] as const)('should add bonus for favorable element: %s', (element) => {
      const context = createBaseContext({ monthElement: element });
      const result = createBaseResult();

      strategy.applyElementBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.FAVORABLE_ELEMENT);
      expect(result.reasons).toContain(`${element} 기운 - 지혜 증진`);
    });
  });

  describe('applyDaeunBonus', () => {
    it.each(['수', '목'] as const)('should add stronger bonus for favorable daeun element: %s', (element) => {
      const context = createBaseContext({
        daeun: {
          stem: '갑',
          branch: '인',
          element,
          startAge: 15,
          endAge: 25,
        },
      });
      const result = createBaseResult();

      strategy.applyDaeunBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.DAEUN_FAVORABLE);
      expect(result.reasons).toContain(`대운 ${element} - 학업운 상승`);
    });
  });
});

describe('HealthStrategy', () => {
  const strategy = new HealthStrategy();

  describe('eventType', () => {
    it('should have eventType as "health"', () => {
      expect(strategy.eventType).toBe('health');
    });
  });

  describe('applySibsinBonus', () => {
    it.each(['정인', '편인', '비견'])('should add bonus for favorable sibsin: %s', (sibsin) => {
      const context = createBaseContext({ sibsin });
      const result = createBaseResult();

      strategy.applySibsinBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.HEALTH_FAVORABLE_SIBSIN);
      expect(result.reasons).toContain(`${sibsin}운 - 건강 회복기`);
    });

    it.each(['식신', '상관', '겁재'])(
      'should subtract penalty for unfavorable sibsin: %s',
      (sibsin) => {
        const context = createBaseContext({ sibsin });
        const result = createBaseResult();

        strategy.applySibsinBonus(context, result);

        expect(result.score).toBe(50 - EVENT_SCORING.HEALTH_UNFAVORABLE_SIBSIN);
        expect(result.avoidReasons).toContain(`${sibsin}운 - 과로 주의`);
      }
    );
  });

  describe('applyTwelveStageBonus', () => {
    it.each(['건록', '제왕', '양'])('should add bonus for favorable stage: %s', (stage) => {
      const context = createBaseContext({
        twelveStage: { stage, energy: 0.9 },
      });
      const result = createBaseResult();

      strategy.applyTwelveStageBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.HEALTH_FAVORABLE_STAGE);
      expect(result.reasons).toContain(`${stage} - 체력 충만`);
    });

    it.each(['사', '묘', '병'])('should subtract penalty for unfavorable stage: %s', (stage) => {
      const context = createBaseContext({
        twelveStage: { stage, energy: 0.2 },
      });
      const result = createBaseResult();

      strategy.applyTwelveStageBonus(context, result);

      expect(result.score).toBe(50 - EVENT_SCORING.HEALTH_UNFAVORABLE_STAGE);
      expect(result.avoidReasons).toContain(`${stage} - 건강 주의`);
    });
  });

  describe('applyDaeunBonus', () => {
    it.each(['토', '목'] as const)('should add bonus for favorable daeun element: %s', (element) => {
      const context = createBaseContext({
        daeun: {
          stem: '갑',
          branch: '인',
          element,
          startAge: 40,
          endAge: 50,
        },
      });
      const result = createBaseResult();

      strategy.applyDaeunBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.DAEUN_FAVORABLE);
      expect(result.reasons).toContain(`대운 ${element} - 건강운 상승`);
    });

    it('should subtract penalty for unfavorable daeun element: 화', () => {
      const context = createBaseContext({
        daeun: {
          stem: '병',
          branch: '오',
          element: '화',
          startAge: 40,
          endAge: 50,
        },
      });
      const result = createBaseResult();

      strategy.applyDaeunBonus(context, result);

      expect(result.score).toBe(50 - EVENT_SCORING.HEALTH_UNFAVORABLE_SIBSIN);
      expect(result.avoidReasons).toContain('대운 화 - 과열 주의');
    });
  });
});

describe('BusinessStrategy', () => {
  const strategy = new BusinessStrategy();

  describe('eventType', () => {
    it('should have eventType as "business"', () => {
      expect(strategy.eventType).toBe('business');
    });
  });

  describe('applySibsinBonus', () => {
    it.each(['식신', '상관', '정재', '편재'])(
      'should add bonus for favorable sibsin: %s',
      (sibsin) => {
        const context = createBaseContext({ sibsin });
        const result = createBaseResult();

        strategy.applySibsinBonus(context, result);

        expect(result.score).toBe(50 + EVENT_SCORING.BUSINESS_FAVORABLE);
        expect(result.reasons).toContain(`${sibsin}운 - 사업 확장기`);
      }
    );
  });

  describe('applyTwelveStageBonus', () => {
    it.each(['장생', '건록', '제왕'])('should add bonus for favorable stage: %s', (stage) => {
      const context = createBaseContext({
        twelveStage: { stage, energy: 0.9 },
      });
      const result = createBaseResult();

      strategy.applyTwelveStageBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.BUSINESS_FAVORABLE_STAGE);
      expect(result.reasons).toContain(`${stage} - 사업 활력`);
    });
  });

  describe('applyElementBonus', () => {
    it.each(['화', '토'] as const)('should add bonus for favorable element: %s', (element) => {
      const context = createBaseContext({ monthElement: element });
      const result = createBaseResult();

      strategy.applyElementBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.BUSINESS_FAVORABLE_ELEMENT);
      expect(result.reasons).toContain(`${element} 기운 - 사업 번창`);
    });
  });

  describe('applyDaeunBonus', () => {
    it.each(['화', '토'] as const)('should add bonus for favorable daeun element: %s', (element) => {
      const context = createBaseContext({
        daeun: {
          stem: '병',
          branch: '오',
          element,
          startAge: 35,
          endAge: 45,
        },
      });
      const result = createBaseResult();

      strategy.applyDaeunBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.DAEUN_FAVORABLE);
      expect(result.reasons).toContain(`대운 ${element} - 사업운 상승`);
    });
  });
});

describe('TravelStrategy', () => {
  const strategy = new TravelStrategy();

  describe('eventType', () => {
    it('should have eventType as "travel"', () => {
      expect(strategy.eventType).toBe('travel');
    });
  });

  describe('applySibsinBonus', () => {
    it.each(['식신', '상관', '편재'])('should add bonus for favorable sibsin: %s', (sibsin) => {
      const context = createBaseContext({ sibsin });
      const result = createBaseResult();

      strategy.applySibsinBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.TRAVEL_FAVORABLE_SIBSIN);
      expect(result.reasons).toContain(`${sibsin}운 - 변화와 경험`);
    });
  });

  describe('applyTwelveStageBonus', () => {
    it.each(['목욕', '관대', '장생'])('should add bonus for favorable stage: %s', (stage) => {
      const context = createBaseContext({
        twelveStage: { stage, energy: 0.7 },
      });
      const result = createBaseResult();

      strategy.applyTwelveStageBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.FAVORABLE_TWELVE_STAGE);
      expect(result.reasons).toContain(`${stage} - 활동 적기`);
    });
  });

  describe('applyElementBonus', () => {
    it.each(['목', '화'] as const)('should add bonus for favorable element: %s', (element) => {
      const context = createBaseContext({ monthElement: element });
      const result = createBaseResult();

      strategy.applyElementBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.FAVORABLE_ELEMENT);
      expect(result.reasons).toContain(`${element} 기운 - 이동 활력`);
    });
  });

  describe('applyDaeunBonus', () => {
    it.each(['목', '화'] as const)('should add minor bonus for favorable daeun element: %s', (element) => {
      const context = createBaseContext({
        daeun: {
          stem: '갑',
          branch: '인',
          element,
          startAge: 25,
          endAge: 35,
        },
      });
      const result = createBaseResult();

      strategy.applyDaeunBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.DAEUN_FAVORABLE_MINOR);
      expect(result.reasons).toContain(`대운 ${element} - 여행운 상승`);
    });
  });
});

describe('SurgeryStrategy', () => {
  const strategy = new SurgeryStrategy();

  describe('eventType', () => {
    it('should have eventType as "surgery"', () => {
      expect(strategy.eventType).toBe('surgery');
    });
  });

  describe('applySibsinBonus', () => {
    it.each(['정인', '비견'])('should add bonus for favorable sibsin: %s', (sibsin) => {
      const context = createBaseContext({ sibsin });
      const result = createBaseResult();

      strategy.applySibsinBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.SURGERY_FAVORABLE_SIBSIN);
      expect(result.reasons).toContain(`${sibsin}운 - 회복력 양호`);
    });

    it.each(['겁재', '양인'])('should subtract penalty for unfavorable sibsin: %s', (sibsin) => {
      const context = createBaseContext({ sibsin });
      const result = createBaseResult();

      strategy.applySibsinBonus(context, result);

      expect(result.score).toBe(50 - EVENT_SCORING.SURGERY_UNFAVORABLE_SIBSIN);
      expect(result.avoidReasons).toContain(`${sibsin}운 - 수술 연기 권장`);
    });
  });

  describe('applyTwelveStageBonus', () => {
    it.each(['건록', '제왕', '양'])('should add bonus for favorable stage: %s', (stage) => {
      const context = createBaseContext({
        twelveStage: { stage, energy: 0.9 },
      });
      const result = createBaseResult();

      strategy.applyTwelveStageBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.SURGERY_FAVORABLE_STAGE);
      expect(result.reasons).toContain(`${stage} - 회복 최적기`);
    });

    it.each(['사', '묘', '절', '태'])(
      'should subtract penalty for unfavorable stage: %s',
      (stage) => {
        const context = createBaseContext({
          twelveStage: { stage, energy: 0.2 },
        });
        const result = createBaseResult();

        strategy.applyTwelveStageBonus(context, result);

        expect(result.score).toBe(50 - EVENT_SCORING.SURGERY_UNFAVORABLE_STAGE);
        expect(result.avoidReasons).toContain(`${stage} - 수술 부적합`);
      }
    );
  });

  describe('applyElementBonus', () => {
    it.each(['토', '금'] as const)('should add bonus for favorable element: %s', (element) => {
      const context = createBaseContext({ monthElement: element });
      const result = createBaseResult();

      strategy.applyElementBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.SURGERY_FAVORABLE_ELEMENT);
      expect(result.reasons).toContain(`${element} 기운 - 안정 회복`);
    });

    it('should subtract penalty for unfavorable element: 화', () => {
      const context = createBaseContext({ monthElement: '화' });
      const result = createBaseResult();

      strategy.applyElementBonus(context, result);

      expect(result.score).toBe(50 - EVENT_SCORING.SURGERY_UNFAVORABLE_ELEMENT);
      expect(result.avoidReasons).toContain('화 기운 - 염증 주의');
    });
  });

  describe('applyDaeunBonus', () => {
    it.each(['토', '금'] as const)('should add bonus for favorable daeun element: %s', (element) => {
      const context = createBaseContext({
        daeun: {
          stem: '경',
          branch: '신',
          element,
          startAge: 50,
          endAge: 60,
        },
      });
      const result = createBaseResult();

      strategy.applyDaeunBonus(context, result);

      expect(result.score).toBe(50 + EVENT_SCORING.DAEUN_FAVORABLE);
      expect(result.reasons).toContain(`대운 ${element} - 회복운 상승`);
    });

    it('should subtract penalty for unfavorable daeun element: 화', () => {
      const context = createBaseContext({
        daeun: {
          stem: '병',
          branch: '오',
          element: '화',
          startAge: 50,
          endAge: 60,
        },
      });
      const result = createBaseResult();

      strategy.applyDaeunBonus(context, result);

      expect(result.score).toBe(50 - EVENT_SCORING.SURGERY_UNFAVORABLE_ELEMENT);
      expect(result.avoidReasons).toContain('대운 화 - 염증 위험');
    });
  });

  describe('combined critical scenarios', () => {
    it('should calculate very high score for optimal surgery conditions', () => {
      const context = createBaseContext({
        sibsin: '정인',
        twelveStage: { stage: '제왕', energy: 1.0 },
        monthElement: '토',
        yongsin: ['토'],
        daeun: {
          stem: '기',
          branch: '축',
          element: '토',
          startAge: 50,
          endAge: 60,
        },
        solarTerm: {
          name: 'grain-rain',
          nameKo: '곡우',
          element: '토',
        },
      });
      const result = createBaseResult();

      strategy.applySibsinBonus(context, result);
      strategy.applyTwelveStageBonus(context, result);
      strategy.applyElementBonus(context, result);
      strategy.applyYongsinKisinBonus(context, result);
      strategy.applyDaeunBonus(context, result);

      // Base 50 + sibsin 15 + stage 18 + element 12 + yongsin 15 + daeun sync 12 + daeun element 12
      expect(result.score).toBe(134);
    });

    it('should calculate very low score for risky surgery conditions', () => {
      const context = createBaseContext({
        sibsin: '겁재',
        twelveStage: { stage: '절', energy: 0.1 },
        monthElement: '화',
        kisin: ['화'],
        daeun: {
          stem: '병',
          branch: '오',
          element: '화',
          startAge: 50,
          endAge: 60,
        },
      });
      const result = createBaseResult();

      strategy.applySibsinBonus(context, result);
      strategy.applyTwelveStageBonus(context, result);
      strategy.applyElementBonus(context, result);
      strategy.applyYongsinKisinBonus(context, result);
      strategy.applyDaeunBonus(context, result);

      // Base 50 - sibsin 15 - stage 20 - element 10 - kisin 12 - daeun 10
      expect(result.score).toBe(-17);
      expect(result.avoidReasons.length).toBeGreaterThanOrEqual(5);
    });
  });
});
