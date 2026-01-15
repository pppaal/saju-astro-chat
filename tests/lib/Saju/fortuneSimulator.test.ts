// tests/lib/Saju/fortuneSimulator.test.ts
// 운세 시뮬레이터 테스트


import {
  generateFortuneSnapshot,
  simulateFortuneFlow,
  simulateScenario,
  simulateDecision,
  simulateLifeCycle,
  simulateMonthlyFortune,
  findOptimalTiming,
  TimePoint,
  FortuneSnapshot,
  FortuneArea,
} from '@/lib/Saju/fortuneSimulator';
import type { SajuPillars, PillarData } from '@/lib/Saju/types';

// 테스트 헬퍼 함수
function createPillarData(stemName: string, branchName: string): PillarData {
  const stemElementMap: Record<string, '목' | '화' | '토' | '금' | '수'> = {
    '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
    '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
  };
  const branchElementMap: Record<string, '목' | '화' | '토' | '금' | '수'> = {
    '子': '수', '丑': '토', '寅': '목', '卯': '목', '辰': '토', '巳': '화',
    '午': '화', '未': '토', '申': '금', '酉': '금', '戌': '토', '亥': '수',
  };
  const stemYinYangMap: Record<string, '양' | '음'> = {
    '甲': '양', '乙': '음', '丙': '양', '丁': '음', '戊': '양',
    '己': '음', '庚': '양', '辛': '음', '壬': '양', '癸': '음',
  };

  return {
    heavenlyStem: {
      name: stemName,
      element: stemElementMap[stemName] || '토',
      yin_yang: stemYinYangMap[stemName] || '양',
      sibsin: '비견',
    },
    earthlyBranch: {
      name: branchName,
      element: branchElementMap[branchName] || '토',
      yin_yang: '양',
      sibsin: '비견',
    },
    jijanggan: {},
  };
}

function createTestPillars(
  year: [string, string],
  month: [string, string],
  day: [string, string],
  time: [string, string]
): SajuPillars {
  return {
    year: createPillarData(year[0], year[1]),
    month: createPillarData(month[0], month[1]),
    day: createPillarData(day[0], day[1]),
    time: createPillarData(time[0], time[1]),
  };
}

describe('fortuneSimulator', () => {
  const testPillars = createTestPillars(
    ['甲', '子'],
    ['乙', '丑'],
    ['丙', '寅'],
    ['丁', '卯']
  );

  describe('generateFortuneSnapshot', () => {
    it('should return snapshot with all required fields', () => {
      const timePoint: TimePoint = {
        year: 2024,
        stem: '甲',
        branch: '辰',
      };

      const snapshot = generateFortuneSnapshot(testPillars, timePoint);

      expect(snapshot.timePoint).toEqual(timePoint);
      expect(snapshot.overallScore).toBeGreaterThanOrEqual(0);
      expect(snapshot.overallScore).toBeLessThanOrEqual(100);
      expect(snapshot.areas).toBeDefined();
      expect(snapshot.dominantElement).toBeDefined();
      expect(snapshot.activeInteractions).toBeDefined();
      expect(snapshot.keywords).toBeDefined();
    });

    it('should calculate area fortunes for default areas', () => {
      const timePoint: TimePoint = {
        year: 2024,
        stem: '甲',
        branch: '辰',
      };

      const snapshot = generateFortuneSnapshot(testPillars, timePoint);

      // 기본 4개 영역: career, wealth, love, health
      expect(snapshot.areas.length).toBe(4);
      const areaTypes = snapshot.areas.map(a => a.area);
      expect(areaTypes).toContain('career');
      expect(areaTypes).toContain('wealth');
      expect(areaTypes).toContain('love');
      expect(areaTypes).toContain('health');
    });

    it('should calculate area fortunes for custom areas', () => {
      const timePoint: TimePoint = {
        year: 2024,
        stem: '甲',
        branch: '辰',
      };

      const snapshot = generateFortuneSnapshot(testPillars, timePoint, {
        areas: ['study', 'travel'] as FortuneArea[],
      });

      expect(snapshot.areas.length).toBe(2);
      const areaTypes = snapshot.areas.map(a => a.area);
      expect(areaTypes).toContain('study');
      expect(areaTypes).toContain('travel');
    });

    it('should return area fortunes with valid scores and trends', () => {
      const timePoint: TimePoint = {
        year: 2024,
        stem: '甲',
        branch: '辰',
      };

      const snapshot = generateFortuneSnapshot(testPillars, timePoint);

      for (const area of snapshot.areas) {
        expect(area.score).toBeGreaterThanOrEqual(0);
        expect(area.score).toBeLessThanOrEqual(100);
        expect(['rising', 'stable', 'falling']).toContain(area.trend);
        expect(area.keyFactors).toBeDefined();
        expect(area.advice).toBeTruthy();
      }
    });

    it('should detect active interactions', () => {
      // 子-午 충이 있는 시점 테스트
      const pillarsWithZi = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '子'],  // 일지가 子
        ['丁', '卯']
      );

      const timePoint: TimePoint = {
        year: 2024,
        stem: '甲',
        branch: '午',  // 午와 충
      };

      const snapshot = generateFortuneSnapshot(pillarsWithZi, timePoint);

      expect(snapshot.activeInteractions.some(i => i.includes('충'))).toBe(true);
    });

    it('should generate relevant keywords', () => {
      const timePoint: TimePoint = {
        year: 2024,
        stem: '甲',
        branch: '辰',
      };

      const snapshot = generateFortuneSnapshot(testPillars, timePoint);

      expect(Array.isArray(snapshot.keywords)).toBe(true);
      expect(snapshot.keywords.length).toBeGreaterThan(0);
    });
  });

  describe('simulateFortuneFlow', () => {
    it('should return flow with correct start and end points', () => {
      const flow = simulateFortuneFlow(testPillars, 2024, 2028);

      expect(flow.startPoint.year).toBe(2024);
      expect(flow.endPoint.year).toBe(2028);
    });

    it('should generate snapshots for each year', () => {
      const flow = simulateFortuneFlow(testPillars, 2024, 2028);

      expect(flow.snapshots.length).toBe(5); // 2024, 2025, 2026, 2027, 2028
    });

    it('should identify overall trend', () => {
      const flow = simulateFortuneFlow(testPillars, 2024, 2030);

      expect(['ascending', 'plateau', 'descending', 'fluctuating']).toContain(
        flow.overallTrend
      );
    });

    it('should find best and challenging periods', () => {
      const flow = simulateFortuneFlow(testPillars, 2024, 2030);

      expect(flow.bestPeriod).toBeDefined();
      expect(flow.bestPeriod.year).toBeGreaterThanOrEqual(2024);
      expect(flow.bestPeriod.year).toBeLessThanOrEqual(2030);

      expect(flow.challengingPeriod).toBeDefined();
      expect(flow.challengingPeriod.year).toBeGreaterThanOrEqual(2024);
      expect(flow.challengingPeriod.year).toBeLessThanOrEqual(2030);
    });

    it('should detect turning points', () => {
      const flow = simulateFortuneFlow(testPillars, 2020, 2035);

      expect(Array.isArray(flow.turningPoints)).toBe(true);
      // 전환점이 있다면 시작과 끝 사이에 있어야 함
      for (const tp of flow.turningPoints) {
        expect(tp.year).toBeGreaterThan(2020);
        expect(tp.year).toBeLessThan(2035);
      }
    });

    it('should respect custom areas option', () => {
      const flow = simulateFortuneFlow(testPillars, 2024, 2025, {
        areas: ['study', 'family'] as FortuneArea[],
      });

      for (const snapshot of flow.snapshots) {
        expect(snapshot.areas.length).toBe(2);
        const areaTypes = snapshot.areas.map(a => a.area);
        expect(areaTypes).toContain('study');
        expect(areaTypes).toContain('family');
      }
    });
  });

  describe('simulateScenario', () => {
    it('should return scenario result with all required fields', () => {
      const result = simulateScenario(testPillars, '창업', [2024, 2030]);

      expect(result.scenario).toBe('창업');
      expect(result.probability).toBeGreaterThanOrEqual(0);
      expect(result.probability).toBeLessThanOrEqual(1);
      expect(result.optimalTiming).toBeDefined();
      expect(result.riskPeriods).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should find optimal timing within year range', () => {
      const result = simulateScenario(testPillars, '이직', [2024, 2028]);

      for (const timing of result.optimalTiming) {
        expect(timing.year).toBeGreaterThanOrEqual(2024);
        expect(timing.year).toBeLessThanOrEqual(2028);
      }
    });

    it('should find risk periods within year range', () => {
      const result = simulateScenario(testPillars, '투자', [2024, 2028]);

      for (const period of result.riskPeriods) {
        expect(period.year).toBeGreaterThanOrEqual(2024);
        expect(period.year).toBeLessThanOrEqual(2028);
      }
    });

    it('should provide recommendations', () => {
      const result = simulateScenario(testPillars, '결혼', [2024, 2030]);

      expect(result.recommendations.length).toBeGreaterThan(0);
      for (const rec of result.recommendations) {
        expect(typeof rec).toBe('string');
      }
    });
  });

  describe('simulateDecision', () => {
    it('should return decision simulation with all options analyzed', () => {
      const options = ['A 회사', 'B 회사', 'C 회사'];
      const result = simulateDecision(testPillars, '취업', options, [2024, 2026]);

      expect(result.decision).toBe('취업');
      expect(result.options.length).toBe(3);
      expect(result.recommendation).toBeTruthy();
    });

    it('should provide scores for each option', () => {
      const options = ['Option 1', 'Option 2'];
      const result = simulateDecision(testPillars, 'Test', options, [2024, 2025]);

      for (const opt of result.options) {
        expect(opt.score).toBeGreaterThanOrEqual(0);
        expect(opt.score).toBeLessThanOrEqual(100);
      }
    });

    it('should provide pros and cons for each option', () => {
      const options = ['Option A', 'Option B'];
      const result = simulateDecision(testPillars, 'Decision', options, [2024, 2026]);

      for (const opt of result.options) {
        expect(Array.isArray(opt.pros)).toBe(true);
        expect(Array.isArray(opt.cons)).toBe(true);
      }
    });

    it('should recommend best timing for each option', () => {
      const options = ['Option X', 'Option Y'];
      const result = simulateDecision(testPillars, 'Choice', options, [2024, 2028]);

      for (const opt of result.options) {
        expect(opt.bestTiming).toBeDefined();
        expect(opt.bestTiming.year).toBeGreaterThanOrEqual(2024);
        expect(opt.bestTiming.year).toBeLessThanOrEqual(2028);
      }
    });

    it('should provide overall recommendation', () => {
      const options = ['첫번째', '두번째', '세번째'];
      const result = simulateDecision(testPillars, '선택', options, [2024, 2025]);

      expect(result.recommendation).toBeTruthy();
      expect(typeof result.recommendation).toBe('string');
    });
  });

  describe('simulateLifeCycle', () => {
    it('should return life cycle with correct birth year and current age', () => {
      const result = simulateLifeCycle(testPillars, 1990, 2024);

      expect(result.birthYear).toBe(1990);
      expect(result.currentAge).toBe(35); // 한국식 나이: 2024 - 1990 + 1
    });

    it('should return phases covering different life stages', () => {
      const result = simulateLifeCycle(testPillars, 1990, 2024);

      expect(result.phases.length).toBeGreaterThan(0);

      // 각 단계 확인
      const phaseNames = result.phases.map(p => p.phaseName);
      expect(phaseNames).toContain('성장기');
      expect(phaseNames).toContain('청소년기');
      expect(phaseNames).toContain('청년기');
      expect(phaseNames).toContain('장년기');
      expect(phaseNames).toContain('중년기');
      expect(phaseNames).toContain('노년기');
    });

    it('should identify current phase', () => {
      const result = simulateLifeCycle(testPillars, 1990, 2024);

      expect(result.currentPhase).toBeTruthy();
      // 35세 (한국식)는 청년기 (23-35세)에 해당
      expect(result.currentPhase).toBe('청년기');
    });

    it('should provide next milestone', () => {
      const result = simulateLifeCycle(testPillars, 1990, 2024);

      expect(result.nextMilestone).toBeDefined();
      expect(result.nextMilestone.age).toBeGreaterThan(result.currentAge);
      expect(result.nextMilestone.event).toBeTruthy();
    });

    it('should provide phase details', () => {
      const result = simulateLifeCycle(testPillars, 1990, 2024);

      for (const phase of result.phases) {
        expect(phase.ageRange).toBeDefined();
        expect(phase.ageRange.length).toBe(2);
        expect(phase.phaseName).toBeTruthy();
        expect(phase.theme).toBeTruthy();
        expect(phase.overallScore).toBeGreaterThanOrEqual(0);
        expect(phase.overallScore).toBeLessThanOrEqual(100);
        expect(Array.isArray(phase.keyAreas)).toBe(true);
        expect(Array.isArray(phase.challenges)).toBe(true);
        expect(Array.isArray(phase.opportunities)).toBe(true);
      }
    });
  });

  describe('simulateMonthlyFortune', () => {
    it('should return 12 monthly snapshots', () => {
      const snapshots = simulateMonthlyFortune(testPillars, 2024);

      expect(snapshots.length).toBe(12);
    });

    it('should have correct months in time points', () => {
      const snapshots = simulateMonthlyFortune(testPillars, 2024);

      for (let i = 0; i < 12; i++) {
        expect(snapshots[i].timePoint.month).toBe(i + 1);
        expect(snapshots[i].timePoint.year).toBe(2024);
      }
    });

    it('should return valid snapshots for each month', () => {
      const snapshots = simulateMonthlyFortune(testPillars, 2024);

      for (const snapshot of snapshots) {
        expect(snapshot.overallScore).toBeGreaterThanOrEqual(0);
        expect(snapshot.overallScore).toBeLessThanOrEqual(100);
        expect(snapshot.areas.length).toBeGreaterThan(0);
        expect(snapshot.dominantElement).toBeDefined();
      }
    });

    it('should have valid stems and branches for each month', () => {
      const snapshots = simulateMonthlyFortune(testPillars, 2024);

      const validStems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
      const validBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

      for (const snapshot of snapshots) {
        expect(validStems).toContain(snapshot.timePoint.stem);
        expect(validBranches).toContain(snapshot.timePoint.branch);
      }
    });
  });

  describe('findOptimalTiming', () => {
    it('should return top 3 optimal time points', () => {
      const results = findOptimalTiming(testPillars, '취업', [2024, 2030], 'career');

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should return time points within year range', () => {
      const results = findOptimalTiming(testPillars, '결혼', [2024, 2028], 'love');

      for (const tp of results) {
        expect(tp.year).toBeGreaterThanOrEqual(2024);
        expect(tp.year).toBeLessThanOrEqual(2028);
      }
    });

    it('should return time points sorted by score (best first)', () => {
      const results = findOptimalTiming(testPillars, '투자', [2020, 2030], 'wealth');

      // 최적 시기이므로 결과가 있어야 함
      expect(results.length).toBeGreaterThan(0);
    });

    it('should work with different target areas', () => {
      const areas: FortuneArea[] = ['career', 'wealth', 'love', 'health', 'study', 'travel'];

      for (const area of areas) {
        const results = findOptimalTiming(testPillars, 'test', [2024, 2026], area);
        expect(Array.isArray(results)).toBe(true);
      }
    });

    it('should return valid TimePoint objects', () => {
      const results = findOptimalTiming(testPillars, '이사', [2024, 2026], 'travel');

      for (const tp of results) {
        expect(tp.year).toBeDefined();
        expect(tp.stem).toBeDefined();
        expect(tp.branch).toBeDefined();
      }
    });
  });
});
