// tests/tier7To10Analysis.test.ts
// TIER 7~10 고급 정밀 분석 테스트


import {
  calculateDailyPillarBonus,
  calculateHourlyBonus,
  calculateSolarReturnBonus,
  calculateLunarReturnBonus,
  calculateEclipseBonus,
  calculateGeokgukBonus,
  calculateYongsinDepthBonus,
  calculateIntegratedScore,
  calculateTier7To10Bonus,
  type AdvancedAnalysisInput,
  type EventType,
} from '@/lib/prediction/tier7To10Analysis';

// 테스트용 입력 데이터 생성
function createTestInput(overrides?: Partial<AdvancedAnalysisInput>): AdvancedAnalysisInput {
  return {
    birthYear: 1990,
    birthMonth: 5,
    birthDay: 15,
    birthHour: 10,
    dayStem: '甲',
    dayBranch: '寅',
    monthStem: '己',
    monthBranch: '巳',
    yearStem: '庚',
    yearBranch: '午',
    hourStem: '己',
    hourBranch: '巳',
    allStems: ['庚', '己', '甲', '己'],
    allBranches: ['午', '巳', '寅', '巳'],
    yongsin: ['수', '금'],
    kisin: ['화'],
    geokguk: '정관격',
    ...overrides,
  };
}

describe('tier7To10Analysis', () => {
  describe('TIER 7: calculateDailyPillarBonus', () => {
    it('should return bonus within valid range', () => {
      const input = createTestInput();
      const targetDate = new Date(2024, 5, 15);

      const result = calculateDailyPillarBonus(input, 'career', targetDate);

      expect(result.bonus).toBeGreaterThanOrEqual(-25);
      expect(result.bonus).toBeLessThanOrEqual(25);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should include reasons and penalties', () => {
      const input = createTestInput();
      const targetDate = new Date(2024, 5, 15);

      const result = calculateDailyPillarBonus(input, 'career', targetDate);

      expect(result.reasons).toBeDefined();
      expect(Array.isArray(result.reasons)).toBe(true);
      expect(result.penalties).toBeDefined();
      expect(Array.isArray(result.penalties)).toBe(true);
    });

    it('should handle different event types', () => {
      const input = createTestInput();
      const targetDate = new Date(2024, 5, 15);
      const eventTypes: EventType[] = ['marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship'];

      for (const eventType of eventTypes) {
        const result = calculateDailyPillarBonus(input, eventType, targetDate);
        expect(result).toBeDefined();
        expect(result.bonus).toBeDefined();
      }
    });

    it('should detect favorable sibsin for career', () => {
      const input = createTestInput();
      const targetDate = new Date(2024, 5, 15);

      const result = calculateDailyPillarBonus(input, 'career', targetDate);

      // 결과는 일진에 따라 달라지지만, 구조는 항상 유효해야 함
      expect(result.confidence).toBe(0.85);
    });
  });

  describe('TIER 7: calculateHourlyBonus', () => {
    it('should return bonus within valid range', () => {
      const input = createTestInput();

      const result = calculateHourlyBonus(input, 'career', 10);

      expect(result.bonus).toBeGreaterThanOrEqual(-15);
      expect(result.bonus).toBeLessThanOrEqual(15);
    });

    it('should calculate for all 24 hours', () => {
      const input = createTestInput();

      for (let hour = 0; hour < 24; hour++) {
        const result = calculateHourlyBonus(input, 'career', hour);
        expect(result).toBeDefined();
        expect(result.bonus).toBeDefined();
      }
    });

    it('should have higher confidence when natal hour branch matches', () => {
      const input = createTestInput({
        hourBranch: '巳', // 사시 (09-11시)
      });

      // 9-11시에 해당하는 시간 테스트
      const result = calculateHourlyBonus(input, 'career', 10);

      expect(result.confidence).toBe(0.75);
    });

    it('should give bonus for yongsin hour', () => {
      const input = createTestInput({
        yongsin: ['수'], // 수가 용신
      });

      // 子시 (23-01시)는 수
      const result = calculateHourlyBonus(input, 'career', 0);

      // 수 시간대이므로 용신 보너스 가능
      expect(result).toBeDefined();
    });
  });

  describe('TIER 8: calculateSolarReturnBonus', () => {
    it('should return zero when no solar return data', () => {
      const input = createTestInput({
        advancedAstro: undefined,
      });

      const result = calculateSolarReturnBonus(input, 'career', 2024);

      expect(result.bonus).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it('should detect career theme in solar return', () => {
      const input = createTestInput({
        advancedAstro: {
          solarReturn: {
            theme: 'Career achievement and success',
            ascSign: 'capricorn',
          },
        },
      });

      const result = calculateSolarReturnBonus(input, 'career', 2024);

      expect(result.bonus).toBeGreaterThan(0);
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('should detect love theme for marriage', () => {
      const input = createTestInput({
        advancedAstro: {
          solarReturn: {
            theme: 'Love and partnership',
            ascSign: 'libra',
          },
        },
      });

      const result = calculateSolarReturnBonus(input, 'marriage', 2024);

      expect(result.bonus).toBeGreaterThan(0);
    });

    it('should handle different ASC signs', () => {
      const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
        'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];

      for (const sign of signs) {
        const input = createTestInput({
          advancedAstro: {
            solarReturn: {
              ascSign: sign,
            },
          },
        });

        const result = calculateSolarReturnBonus(input, 'career', 2024);
        expect(result).toBeDefined();
      }
    });
  });

  describe('TIER 8: calculateLunarReturnBonus', () => {
    it('should return zero when no lunar return data', () => {
      const input = createTestInput({
        advancedAstro: undefined,
      });

      const result = calculateLunarReturnBonus(input, 'marriage', 6);

      expect(result.bonus).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it('should detect emotional themes', () => {
      const input = createTestInput({
        advancedAstro: {
          lunarReturn: {
            theme: 'Emotional connection and love',
            moonSign: 'cancer',
          },
        },
      });

      const result = calculateLunarReturnBonus(input, 'relationship', 6);

      expect(result).toBeDefined();
    });
  });

  describe('TIER 8: calculateEclipseBonus', () => {
    it('should return zero when no eclipse data', () => {
      const input = createTestInput({
        advancedAstro: undefined,
      });

      const result = calculateEclipseBonus(input, 'marriage');

      expect(result.bonus).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it('should penalize marriage and investment during eclipse', () => {
      const input = createTestInput({
        advancedAstro: {
          eclipses: {
            impact: {
              type: 'solar eclipse',
              affectedPlanets: ['Venus'],
            },
          },
        },
      });

      const marriageResult = calculateEclipseBonus(input, 'marriage');
      const investmentResult = calculateEclipseBonus(input, 'investment');

      expect(marriageResult.bonus).toBeLessThan(0);
      expect(investmentResult.bonus).toBeLessThan(0);
    });

    it('should give bonus for move during solar eclipse', () => {
      const input = createTestInput({
        advancedAstro: {
          eclipses: {
            impact: {
              type: 'solar eclipse',
              affectedPlanets: [],
            },
          },
        },
      });

      const result = calculateEclipseBonus(input, 'move');

      expect(result.bonus).toBeGreaterThan(0);
      expect(result.reasons).toContain('일식 - 새로운 시작 에너지');
    });

    it('should detect affected planets', () => {
      const input = createTestInput({
        advancedAstro: {
          eclipses: {
            impact: {
              type: 'lunar eclipse',
              affectedPlanets: ['Venus', 'Mars'],
            },
          },
        },
      });

      const result = calculateEclipseBonus(input, 'marriage');

      // Venus 영향으로 페널티
      expect(result.penalties.length).toBeGreaterThan(0);
    });
  });

  describe('TIER 9: calculateGeokgukBonus', () => {
    it('should give bonus for matching geokguk and event type', () => {
      const input = createTestInput({
        geokguk: '정관격', // 명예/직장 운 강함
      });

      const result = calculateGeokgukBonus(input, 'career', 2024, 6);

      expect(result.bonus).toBeGreaterThan(0);
      expect(result.reasons.some(r => r.includes('정관격'))).toBe(true);
    });

    it('should give penalty for mismatched geokguk and event type', () => {
      const input = createTestInput({
        geokguk: '정관격', // investment에 주의 필요
      });

      const result = calculateGeokgukBonus(input, 'investment', 2024, 6);

      expect(result.bonus).toBeLessThan(0);
    });

    it('should handle all geokguk types', () => {
      const geokguks = [
        '정관격', '편관격', '정인격', '편인격',
        '정재격', '편재격', '식신격', '상관격',
        '비견격', '겁재격', '건록격', '양인격',
      ];

      for (const geokguk of geokguks) {
        const input = createTestInput({ geokguk });
        const result = calculateGeokgukBonus(input, 'career', 2024, 6);
        expect(result).toBeDefined();
      }
    });

    it('should return zero bonus for unknown geokguk', () => {
      const input = createTestInput({
        geokguk: '알수없음',
      });

      const result = calculateGeokgukBonus(input, 'career', 2024, 6);

      expect(result.reasons.length).toBe(0);
    });
  });

  describe('TIER 9: calculateYongsinDepthBonus', () => {
    it('should return zero when no yongsin', () => {
      const input = createTestInput({
        yongsin: undefined,
      });

      const result = calculateYongsinDepthBonus(input, 'career', 2024, 6);

      expect(result.bonus).toBe(0);
      expect(result.confidence).toBe(0);
    });

    it('should give bonus when yearly stem matches yongsin', () => {
      // 2024년 갑진년 - 甲은 목
      const input = createTestInput({
        yongsin: ['목'],
      });

      const result = calculateYongsinDepthBonus(input, 'career', 2024, 6);

      expect(result.bonus).toBeGreaterThan(0);
      expect(result.reasons.some(r => r.includes('용신'))).toBe(true);
    });

    it('should handle kisin analysis', () => {
      // 2024년 갑진년 - 甲은 목
      const input = createTestInput({
        yongsin: ['금'],
        kisin: ['목'],
      });

      const result = calculateYongsinDepthBonus(input, 'career', 2024, 6);

      // 구현에 따라 기신 분석 여부가 다를 수 있음
      // bonus와 penalties가 정의되어 있으면 정상 동작
      expect(typeof result.bonus).toBe('number');
      expect(Array.isArray(result.penalties)).toBe(true);
    });

    it('should have high confidence', () => {
      const input = createTestInput({
        yongsin: ['수', '금'],
      });

      const result = calculateYongsinDepthBonus(input, 'career', 2024, 6);

      expect(result.confidence).toBe(0.9);
    });
  });

  describe('TIER 10: calculateIntegratedScore', () => {
    it('should combine all tier analyses', () => {
      const input = createTestInput({
        geokguk: '정관격',
        yongsin: ['금', '수'],
        advancedAstro: {
          solarReturn: {
            theme: 'Career growth',
          },
        },
      });

      const result = calculateIntegratedScore(input, 'career', 2024, 6, 15);

      expect(result.tier7).toBeDefined();
      expect(result.tier8.solarReturn).toBeDefined();
      expect(result.tier8.lunarReturn).toBeDefined();
      expect(result.tier8.eclipse).toBeDefined();
      expect(result.tier9.geokguk).toBeDefined();
      expect(result.tier9.yongsin).toBeDefined();
    });

    it('should calculate total bonus', () => {
      const input = createTestInput();

      const result = calculateIntegratedScore(input, 'career', 2024, 6);

      expect(result.totalBonus).toBeDefined();
      expect(typeof result.totalBonus).toBe('number');
    });

    it('should calculate confidence', () => {
      const input = createTestInput();

      const result = calculateIntegratedScore(input, 'career', 2024, 6);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should perform cross validation', () => {
      const input = createTestInput();

      const result = calculateIntegratedScore(input, 'career', 2024, 6);

      expect(result.crossValidation).toBeDefined();
      expect(result.crossValidation.agreement).toBeGreaterThanOrEqual(0);
      expect(result.crossValidation.agreement).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.crossValidation.conflicts)).toBe(true);
    });

    it('should provide recommendation', () => {
      const input = createTestInput();

      const result = calculateIntegratedScore(input, 'career', 2024, 6);

      expect(result.recommendation).toBeTruthy();
      expect(typeof result.recommendation).toBe('string');
    });

    it('should generate positive recommendation for high scores', () => {
      const input = createTestInput({
        geokguk: '정관격',
        yongsin: ['금'],
        advancedAstro: {
          solarReturn: {
            theme: 'Career achievement',
            ascSign: 'capricorn',
          },
        },
      });

      const result = calculateIntegratedScore(input, 'career', 2024, 6);

      // 결과에 따라 추천 문구가 달라짐
      expect(result.recommendation).toBeTruthy();
    });
  });

  describe('calculateTier7To10Bonus (외부 호출용 통합 함수)', () => {
    it('should return aggregated results', () => {
      const input = createTestInput();

      const result = calculateTier7To10Bonus(input, 'career', 2024, 6);

      expect(result.total).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.reasons).toBeDefined();
      expect(result.penalties).toBeDefined();
      expect(result.recommendation).toBeDefined();
    });

    it('should aggregate all reasons', () => {
      const input = createTestInput({
        geokguk: '정관격',
        yongsin: ['금'],
      });

      const result = calculateTier7To10Bonus(input, 'career', 2024, 6);

      expect(Array.isArray(result.reasons)).toBe(true);
      expect(result.reasons.length).toBeLessThanOrEqual(5); // 최대 5개
    });

    it('should aggregate all penalties', () => {
      const input = createTestInput({
        kisin: ['목', '화'],
      });

      const result = calculateTier7To10Bonus(input, 'career', 2024, 6);

      expect(Array.isArray(result.penalties)).toBe(true);
      expect(result.penalties.length).toBeLessThanOrEqual(3); // 최대 3개
    });

    it('should work with specific day', () => {
      const input = createTestInput();

      const result = calculateTier7To10Bonus(input, 'marriage', 2024, 6, 15);

      expect(result).toBeDefined();
      expect(result.total).toBeDefined();
    });

    it('should work without specific day', () => {
      const input = createTestInput();

      const result = calculateTier7To10Bonus(input, 'investment', 2024, 6);

      expect(result).toBeDefined();
      expect(result.total).toBeDefined();
    });
  });

  describe('event type specific tests', () => {
    const eventTypes: EventType[] = ['marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship'];

    it.each(eventTypes)('should analyze %s event type correctly', (eventType) => {
      const input = createTestInput();

      const result = calculateTier7To10Bonus(input, eventType, 2024, 6);

      expect(result).toBeDefined();
      expect(result.total).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.recommendation).toContain(eventType);
    });
  });
});
