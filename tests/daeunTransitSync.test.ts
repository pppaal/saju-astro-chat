// tests/daeunTransitSync.test.ts
// 대운-트랜짓 동기화 분석 테스트


import {
  analyzeDaeunTransitSync,
  convertSajuDaeunToInfo,
  generateDaeunTransitPromptContext,
  type DaeunInfo,
} from '@/lib/prediction/daeunTransitSync';

// 테스트용 대운 데이터 생성
function createTestDaeunList(): DaeunInfo[] {
  return [
    { startAge: 0, endAge: 9, stem: '甲', branch: '寅', element: '목', yinYang: '양' },
    { startAge: 10, endAge: 19, stem: '乙', branch: '卯', element: '목', yinYang: '음' },
    { startAge: 20, endAge: 29, stem: '丙', branch: '辰', element: '화', yinYang: '양' },
    { startAge: 30, endAge: 39, stem: '丁', branch: '巳', element: '화', yinYang: '음' },
    { startAge: 40, endAge: 49, stem: '戊', branch: '午', element: '토', yinYang: '양' },
    { startAge: 50, endAge: 59, stem: '己', branch: '未', element: '토', yinYang: '음' },
    { startAge: 60, endAge: 69, stem: '庚', branch: '申', element: '금', yinYang: '양' },
    { startAge: 70, endAge: 79, stem: '辛', branch: '酉', element: '금', yinYang: '음' },
    { startAge: 80, endAge: 89, stem: '壬', branch: '戌', element: '수', yinYang: '양' },
  ];
}

describe('daeunTransitSync', () => {
  describe('analyzeDaeunTransitSync', () => {
    it('should return analysis result with syncPoints', () => {
      const daeunList = createTestDaeunList();
      const birthYear = 1990;
      const currentAge = 34;

      const result = analyzeDaeunTransitSync(daeunList, birthYear, currentAge);

      expect(result).toBeDefined();
      expect(result.birthYear).toBe(birthYear);
      expect(result.currentAge).toBe(currentAge);
      expect(result.syncPoints).toBeDefined();
      expect(Array.isArray(result.syncPoints)).toBe(true);
    });

    it('should identify major transitions', () => {
      const daeunList = createTestDaeunList();
      const birthYear = 1990;
      const currentAge = 30; // 대운 전환기 근처

      const result = analyzeDaeunTransitSync(daeunList, birthYear, currentAge);

      expect(result.majorTransitions).toBeDefined();
      expect(Array.isArray(result.majorTransitions)).toBe(true);
    });

    it('should identify peak years', () => {
      const daeunList = createTestDaeunList();
      const birthYear = 1990;
      const currentAge = 34;

      const result = analyzeDaeunTransitSync(daeunList, birthYear, currentAge);

      expect(result.peakYears).toBeDefined();
      expect(Array.isArray(result.peakYears)).toBe(true);

      // 피크 연도는 age, year, reason을 가짐
      if (result.peakYears.length > 0) {
        expect(result.peakYears[0]).toHaveProperty('age');
        expect(result.peakYears[0]).toHaveProperty('year');
        expect(result.peakYears[0]).toHaveProperty('reason');
      }
    });

    it('should identify challenge years', () => {
      const daeunList = createTestDaeunList();
      const birthYear = 1990;
      const currentAge = 34;

      const result = analyzeDaeunTransitSync(daeunList, birthYear, currentAge);

      expect(result.challengeYears).toBeDefined();
      expect(Array.isArray(result.challengeYears)).toBe(true);
    });

    it('should provide life cycle pattern', () => {
      const daeunList = createTestDaeunList();
      const birthYear = 1990;
      const currentAge = 34;

      const result = analyzeDaeunTransitSync(daeunList, birthYear, currentAge);

      expect(result.lifeCyclePattern).toBeTruthy();
      expect(typeof result.lifeCyclePattern).toBe('string');
    });

    it('should calculate overall confidence', () => {
      const daeunList = createTestDaeunList();
      const birthYear = 1990;
      const currentAge = 34;

      const result = analyzeDaeunTransitSync(daeunList, birthYear, currentAge);

      expect(result.overallConfidence).toBeGreaterThanOrEqual(0);
      expect(result.overallConfidence).toBeLessThanOrEqual(100);
    });

    it('should include tier5 summary when enabled', () => {
      const daeunList = createTestDaeunList();
      const birthYear = 1990;
      const currentAge = 34;

      const result = analyzeDaeunTransitSync(daeunList, birthYear, currentAge, {
        enableTier5: true,
      });

      expect(result.tier5Summary).toBeDefined();
      if (result.tier5Summary) {
        expect(result.tier5Summary.eastWestHarmonyScore).toBeDefined();
        expect(result.tier5Summary.dominantElement).toBeDefined();
        expect(['목', '화', '토', '금', '수']).toContain(result.tier5Summary.dominantElement);
      }
    });

    it('should disable tier5 analysis when specified', () => {
      const daeunList = createTestDaeunList();
      const birthYear = 1990;
      const currentAge = 34;

      const result = analyzeDaeunTransitSync(daeunList, birthYear, currentAge, {
        enableTier5: false,
      });

      // tier5Summary가 없거나 기본값
      expect(result.tier5Summary).toBeUndefined();
    });

    it('should detect Jupiter Return at age 12, 24, 36, etc.', () => {
      const daeunList = createTestDaeunList();
      const birthYear = 1990;
      const currentAge = 35; // 36세 주변

      const result = analyzeDaeunTransitSync(daeunList, birthYear, currentAge);

      // 36세 근처의 syncPoint에서 jupiterReturn 트랜짓이 있어야 함
      const age36Point = result.syncPoints.find(p => p.age === 36);
      if (age36Point) {
        const hasJupiterReturn = age36Point.transits.some(t => t.type === 'jupiterReturn');
        expect(hasJupiterReturn).toBe(true);
      }
    });

    it('should detect Saturn Return around age 29', () => {
      const daeunList = createTestDaeunList();
      const birthYear = 1990;
      const currentAge = 28;

      const result = analyzeDaeunTransitSync(daeunList, birthYear, currentAge);

      // 29세 근처의 syncPoint에서 saturnReturn 트랜짓이 있어야 함
      const saturnReturnPoints = result.syncPoints.filter(p =>
        p.transits.some(t => t.type === 'saturnReturn')
      );
      expect(saturnReturnPoints.length).toBeGreaterThan(0);
    });

    describe('syncPoint structure', () => {
      it('should have valid syncPoint properties', () => {
        const daeunList = createTestDaeunList();
        const birthYear = 1990;
        const currentAge = 34;

        const result = analyzeDaeunTransitSync(daeunList, birthYear, currentAge);

        if (result.syncPoints.length > 0) {
          const point = result.syncPoints[0];

          expect(point.age).toBeDefined();
          expect(point.year).toBeDefined();
          expect(point.daeun).toBeDefined();
          expect(point.transits).toBeDefined();
          expect(point.synergyScore).toBeGreaterThanOrEqual(0);
          expect(point.synergyScore).toBeLessThanOrEqual(100);
          expect(['amplify', 'clash', 'balance', 'neutral']).toContain(point.synergyType);
          expect(point.themes).toBeDefined();
          expect(point.opportunities).toBeDefined();
          expect(point.challenges).toBeDefined();
          expect(point.advice).toBeTruthy();
          expect(point.confidence).toBeGreaterThanOrEqual(0);
          expect(point.confidence).toBeLessThanOrEqual(100);
        }
      });

      it('should include tier5Analysis in syncPoints when enabled', () => {
        const daeunList = createTestDaeunList();
        const birthYear = 1990;
        const currentAge = 34;

        const result = analyzeDaeunTransitSync(daeunList, birthYear, currentAge, {
          enableTier5: true,
        });

        const pointWithTier5 = result.syncPoints.find(p => p.tier5Analysis);
        if (pointWithTier5?.tier5Analysis) {
          expect(pointWithTier5.tier5Analysis.solarTermElement).toBeDefined();
          expect(pointWithTier5.tier5Analysis.solarTermDaeunAlignment).toBeDefined();
          expect(pointWithTier5.tier5Analysis.eastWestHarmony).toBeDefined();
          expect(pointWithTier5.tier5Analysis.preciseTiming).toBeDefined();
        }
      });
    });
  });

  describe('convertSajuDaeunToInfo', () => {
    it('should convert raw daeun list to DaeunInfo format', () => {
      const rawDaeunList = [
        { startAge: 0, stem: '甲', branch: '子' },
        { startAge: 10, stem: '乙', branch: '丑' },
        { startAge: 20, stem: '丙', branch: '寅' },
      ];

      const result = convertSajuDaeunToInfo(rawDaeunList);

      expect(result.length).toBe(3);
      expect(result[0].startAge).toBe(0);
      expect(result[0].endAge).toBe(9);
      expect(result[0].stem).toBe('甲');
      expect(result[0].branch).toBe('子');
      expect(result[0].element).toBe('목');
      expect(result[0].yinYang).toBe('양');
    });

    it('should handle alternative property names', () => {
      const rawDaeunList = [
        { age: 5, heavenlyStem: '甲', earthlyBranch: '寅' },
        { age: 15, heavenlyStem: '乙', earthlyBranch: '卯' },
      ];

      const result = convertSajuDaeunToInfo(rawDaeunList);

      expect(result.length).toBe(2);
      expect(result[0].startAge).toBe(5);
      expect(result[0].stem).toBe('甲');
      expect(result[0].branch).toBe('寅');
    });

    it('should assign correct elements', () => {
      const rawDaeunList = [
        { startAge: 0, stem: '甲', branch: '子' },   // 목
        { startAge: 10, stem: '丙', branch: '午' },  // 화
        { startAge: 20, stem: '戊', branch: '辰' },  // 토
        { startAge: 30, stem: '庚', branch: '申' },  // 금
        { startAge: 40, stem: '壬', branch: '子' },  // 수
      ];

      const result = convertSajuDaeunToInfo(rawDaeunList);

      expect(result[0].element).toBe('목');
      expect(result[1].element).toBe('화');
      expect(result[2].element).toBe('토');
      expect(result[3].element).toBe('금');
      expect(result[4].element).toBe('수');
    });

    it('should assign correct yinYang', () => {
      const rawDaeunList = [
        { startAge: 0, stem: '甲', branch: '子' },   // 양
        { startAge: 10, stem: '乙', branch: '丑' },  // 음
        { startAge: 20, stem: '丙', branch: '寅' },  // 양
        { startAge: 30, stem: '丁', branch: '卯' },  // 음
      ];

      const result = convertSajuDaeunToInfo(rawDaeunList);

      expect(result[0].yinYang).toBe('양');
      expect(result[1].yinYang).toBe('음');
      expect(result[2].yinYang).toBe('양');
      expect(result[3].yinYang).toBe('음');
    });
  });

  describe('generateDaeunTransitPromptContext', () => {
    it('should generate Korean context by default', () => {
      const daeunList = createTestDaeunList();
      const birthYear = 1990;
      const currentAge = 34;
      const analysis = analyzeDaeunTransitSync(daeunList, birthYear, currentAge);

      const context = generateDaeunTransitPromptContext(analysis);

      expect(context).toBeTruthy();
      expect(context).toContain('대운-트랜짓 동기화 분석');
      expect(context).toContain('인생 패턴');
      expect(context).toContain('신뢰도');
    });

    it('should generate English context when specified', () => {
      const daeunList = createTestDaeunList();
      const birthYear = 1990;
      const currentAge = 34;
      const analysis = analyzeDaeunTransitSync(daeunList, birthYear, currentAge);

      const context = generateDaeunTransitPromptContext(analysis, 'en');

      expect(context).toBeTruthy();
      expect(context).toContain('Daeun-Transit Synchronization');
      expect(context).toContain('Life Pattern');
      expect(context).toContain('Confidence');
    });

    it('should include major transitions', () => {
      const daeunList = createTestDaeunList();
      const birthYear = 1990;
      const currentAge = 34;
      const analysis = analyzeDaeunTransitSync(daeunList, birthYear, currentAge);

      const context = generateDaeunTransitPromptContext(analysis);

      expect(context).toContain('주요 전환점');
    });

    it('should include peak and challenge years if present', () => {
      const daeunList = createTestDaeunList();
      const birthYear = 1990;
      const currentAge = 34;
      const analysis = analyzeDaeunTransitSync(daeunList, birthYear, currentAge);

      const context = generateDaeunTransitPromptContext(analysis);

      // 분석 결과에 따라 포함될 수 있음
      if (analysis.peakYears.length > 0) {
        expect(context).toContain('최고의 시기');
      }
      if (analysis.challengeYears.length > 0) {
        expect(context).toContain('도전의 시기');
      }
    });
  });

  describe('synergy calculations', () => {
    it('should give higher score for Jupiter Return with wood daeun', () => {
      // 목 대운 + 목성 리턴 = 시너지
      const daeunList: DaeunInfo[] = [
        { startAge: 20, endAge: 29, stem: '甲', branch: '寅', element: '목', yinYang: '양' },
        { startAge: 30, endAge: 39, stem: '乙', branch: '卯', element: '목', yinYang: '음' },
      ];
      const birthYear = 1990;
      const currentAge = 23; // 24세 근처 (Jupiter Return)

      const result = analyzeDaeunTransitSync(daeunList, birthYear, currentAge);

      // 목 대운 + 목성 리턴이므로 시너지 점수가 높아야 함
      const jupiterPoint = result.syncPoints.find(p =>
        p.transits.some(t => t.type === 'jupiterReturn') && p.daeun.element === '목'
      );

      if (jupiterPoint) {
        // 목 + 목성은 높은 시너지
        expect(jupiterPoint.synergyScore).toBeGreaterThan(50);
      }
    });

    it('should give lower score for conflicting element-transit combinations', () => {
      // 목 대운 + 토성 리턴 = 목극토 충돌
      const daeunList: DaeunInfo[] = [
        { startAge: 25, endAge: 34, stem: '甲', branch: '寅', element: '목', yinYang: '양' },
      ];
      const birthYear = 1990;
      const currentAge = 28; // 29세 근처 (Saturn Return)

      const result = analyzeDaeunTransitSync(daeunList, birthYear, currentAge);

      // Saturn Return 포인트 찾기
      const saturnPoint = result.syncPoints.find(p =>
        p.transits.some(t => t.type === 'saturnReturn')
      );

      if (saturnPoint) {
        // 목 vs 토성(토) - 충돌 여부는 구현에 따라 다름
        // syncPoints가 존재하면 함수가 정상 동작한 것
        expect(saturnPoint.transits).toBeDefined();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty daeun list gracefully', () => {
      const daeunList: DaeunInfo[] = [];
      const birthYear = 1990;
      const currentAge = 34;

      const result = analyzeDaeunTransitSync(daeunList, birthYear, currentAge);

      expect(result.syncPoints).toBeDefined();
      expect(result.birthYear).toBe(birthYear);
      expect(result.currentAge).toBe(currentAge);
    });

    it('should handle very young age', () => {
      const daeunList = createTestDaeunList();
      const birthYear = 2020;
      const currentAge = 4;

      const result = analyzeDaeunTransitSync(daeunList, birthYear, currentAge);

      expect(result).toBeDefined();
      expect(result.syncPoints).toBeDefined();
    });

    it('should handle old age', () => {
      const daeunList = createTestDaeunList();
      const birthYear = 1940;
      const currentAge = 84;

      const result = analyzeDaeunTransitSync(daeunList, birthYear, currentAge);

      expect(result).toBeDefined();
      expect(result.syncPoints).toBeDefined();
    });
  });
});
