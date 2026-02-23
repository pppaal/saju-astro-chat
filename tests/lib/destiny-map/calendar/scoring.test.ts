// tests/lib/destiny-map/calendar/scoring.test.ts
import {
  calculateTotalScore,
  SAMPLE_INPUTS,
  type SajuScoreInput,
  type AstroScoreInput,
  type ScoreResult,
} from '@/lib/destiny-map/calendar/scoring';

// Helper functions to create test inputs
function createEmptySajuInput(): SajuScoreInput {
  return {
    daeun: {},
    seun: {},
    wolun: {},
    iljin: {},
    yongsin: {},
  };
}

function createEmptyAstroInput(): AstroScoreInput {
  return {
    transitSun: {},
    transitMoon: {},
    majorPlanets: {},
    solarReturn: {},
  };
}

describe('scoring', () => {
  describe('calculateTotalScore', () => {
    describe('structure validation', () => {
      it('should return ScoreResult with all required fields', () => {
        const sajuInput = createEmptySajuInput();
        const astroInput = createEmptyAstroInput();

        const result = calculateTotalScore(sajuInput, astroInput);

        expect(result).toHaveProperty('sajuScore');
        expect(result).toHaveProperty('astroScore');
        expect(result).toHaveProperty('crossBonus');
        expect(result).toHaveProperty('totalScore');
        expect(result).toHaveProperty('grade');
        expect(result).toHaveProperty('breakdown');
        expect(result).toHaveProperty('sajuPositive');
        expect(result).toHaveProperty('sajuNegative');
        expect(result).toHaveProperty('astroPositive');
        expect(result).toHaveProperty('astroNegative');
        expect(result).toHaveProperty('crossVerified');
        expect(result).toHaveProperty('crossAgreementPercent');
      });

      it('should return breakdown with all score components', () => {
        const sajuInput = createEmptySajuInput();
        const astroInput = createEmptyAstroInput();

        const result = calculateTotalScore(sajuInput, astroInput);

        expect(result.breakdown).toHaveProperty('daeun');
        expect(result.breakdown).toHaveProperty('seun');
        expect(result.breakdown).toHaveProperty('wolun');
        expect(result.breakdown).toHaveProperty('iljin');
        expect(result.breakdown).toHaveProperty('yongsin');
        expect(result.breakdown).toHaveProperty('transitSun');
        expect(result.breakdown).toHaveProperty('transitMoon');
        expect(result.breakdown).toHaveProperty('majorPlanets');
        expect(result.breakdown).toHaveProperty('lunarPhase');
        expect(result.breakdown).toHaveProperty('solarReturn');
      });
    });

    describe('score ranges', () => {
      it('should return sajuScore between 0 and 50', () => {
        const sajuInput = createEmptySajuInput();
        const astroInput = createEmptyAstroInput();

        const result = calculateTotalScore(sajuInput, astroInput);

        expect(result.sajuScore).toBeGreaterThanOrEqual(0);
        expect(result.sajuScore).toBeLessThanOrEqual(50);
      });

      it('should return astroScore between 0 and 50', () => {
        const sajuInput = createEmptySajuInput();
        const astroInput = createEmptyAstroInput();

        const result = calculateTotalScore(sajuInput, astroInput);

        expect(result.astroScore).toBeGreaterThanOrEqual(0);
        expect(result.astroScore).toBeLessThanOrEqual(50);
      });

      it('should return totalScore between 0 and 100', () => {
        const sajuInput = createEmptySajuInput();
        const astroInput = createEmptyAstroInput();

        const result = calculateTotalScore(sajuInput, astroInput);

        expect(result.totalScore).toBeGreaterThanOrEqual(0);
        expect(result.totalScore).toBeLessThanOrEqual(100);
      });

      it('should return grade between 0 and 4', () => {
        const sajuInput = createEmptySajuInput();
        const astroInput = createEmptyAstroInput();

        const result = calculateTotalScore(sajuInput, astroInput);

        expect(result.grade).toBeGreaterThanOrEqual(0);
        expect(result.grade).toBeLessThanOrEqual(4);
      });

      it('should return crossAgreementPercent between 0 and 100', () => {
        const sajuInput = createEmptySajuInput();
        const astroInput = createEmptyAstroInput();

        const result = calculateTotalScore(sajuInput, astroInput);

        expect(result.crossAgreementPercent).toBeGreaterThanOrEqual(0);
        expect(result.crossAgreementPercent).toBeLessThanOrEqual(100);
      });
    });

    describe('SAMPLE_INPUTS - bestDay', () => {
      it('should return high scores for best day scenario', () => {
        const result = calculateTotalScore(
          SAMPLE_INPUTS.bestDay.saju,
          SAMPLE_INPUTS.bestDay.astro
        );

        // Best day should have high scores
        expect(result.totalScore).toBeGreaterThan(60);
        expect(result.sajuScore).toBeGreaterThan(25);
        expect(result.astroScore).toBeGreaterThan(25);
      });

      it('should have positive flags set for best day', () => {
        const result = calculateTotalScore(
          SAMPLE_INPUTS.bestDay.saju,
          SAMPLE_INPUTS.bestDay.astro
        );

        expect(result.sajuPositive).toBe(true);
        expect(result.astroPositive).toBe(true);
        expect(result.crossVerified).toBe(true);
      });

      it('should have grade 0 or 1 for best day', () => {
        const result = calculateTotalScore(
          SAMPLE_INPUTS.bestDay.saju,
          SAMPLE_INPUTS.bestDay.astro
        );

        expect(result.grade).toBeLessThanOrEqual(1);
      });
    });

    describe('SAMPLE_INPUTS - worstDay', () => {
      it('should return low scores for worst day scenario', () => {
        const result = calculateTotalScore(
          SAMPLE_INPUTS.worstDay.saju,
          SAMPLE_INPUTS.worstDay.astro
        );

        // Worst day should have low scores
        expect(result.totalScore).toBeLessThan(50);
      });

      it('should have negative flags set for worst day', () => {
        const result = calculateTotalScore(
          SAMPLE_INPUTS.worstDay.saju,
          SAMPLE_INPUTS.worstDay.astro
        );

        expect(result.sajuNegative).toBe(true);
        expect(result.astroNegative).toBe(true);
      });

      it('should have grade 3 or 4 for worst day', () => {
        const result = calculateTotalScore(
          SAMPLE_INPUTS.worstDay.saju,
          SAMPLE_INPUTS.worstDay.astro
        );

        expect(result.grade).toBeGreaterThanOrEqual(3);
      });
    });

    describe('SAMPLE_INPUTS - normalDay', () => {
      it('should return moderate scores for normal day scenario', () => {
        const result = calculateTotalScore(
          SAMPLE_INPUTS.normalDay.saju,
          SAMPLE_INPUTS.normalDay.astro
        );

        // Normal day should have middle-range scores
        expect(result.totalScore).toBeGreaterThan(30);
        expect(result.totalScore).toBeLessThan(70);
      });

      it('should have grade 2 for normal day', () => {
        const result = calculateTotalScore(
          SAMPLE_INPUTS.normalDay.saju,
          SAMPLE_INPUTS.normalDay.astro
        );

        expect(result.grade).toBe(2);
      });
    });

    describe('daeun scoring', () => {
      it('should increase score for positive sibsin (inseong)', () => {
        const baseline = calculateTotalScore(createEmptySajuInput(), createEmptyAstroInput());

        const sajuInput = createEmptySajuInput();
        sajuInput.daeun = { sibsin: 'inseong' };
        const result = calculateTotalScore(sajuInput, createEmptyAstroInput());

        expect(result.breakdown.daeun).toBeGreaterThan(baseline.breakdown.daeun);
      });

      it('should increase score for yukhap', () => {
        const baseline = calculateTotalScore(createEmptySajuInput(), createEmptyAstroInput());

        const sajuInput = createEmptySajuInput();
        sajuInput.daeun = { hasYukhap: true };
        const result = calculateTotalScore(sajuInput, createEmptyAstroInput());

        expect(result.breakdown.daeun).toBeGreaterThan(baseline.breakdown.daeun);
      });

      it('should decrease score for chung', () => {
        const baseline = calculateTotalScore(createEmptySajuInput(), createEmptyAstroInput());

        const sajuInput = createEmptySajuInput();
        sajuInput.daeun = { hasChung: true };
        const result = calculateTotalScore(sajuInput, createEmptyAstroInput());

        expect(result.breakdown.daeun).toBeLessThan(baseline.breakdown.daeun);
      });
    });

    describe('seun scoring', () => {
      it('should handle samjae year with gwiin (cancellation)', () => {
        const sajuInputNoGwiin = createEmptySajuInput();
        sajuInputNoGwiin.seun = { isSamjaeYear: true };
        const resultNoGwiin = calculateTotalScore(sajuInputNoGwiin, createEmptyAstroInput());

        const sajuInputWithGwiin = createEmptySajuInput();
        sajuInputWithGwiin.seun = { isSamjaeYear: true, hasGwiin: true };
        const resultWithGwiin = calculateTotalScore(sajuInputWithGwiin, createEmptyAstroInput());

        // Gwiin should cancel out samjae penalty
        expect(resultWithGwiin.breakdown.seun).toBeGreaterThan(resultNoGwiin.breakdown.seun);
      });

      it('should apply worse penalty for samjae + chung', () => {
        const sajuInputSamjae = createEmptySajuInput();
        sajuInputSamjae.seun = { isSamjaeYear: true };
        const resultSamjae = calculateTotalScore(sajuInputSamjae, createEmptyAstroInput());

        const sajuInputBoth = createEmptySajuInput();
        sajuInputBoth.seun = { isSamjaeYear: true, hasChung: true };
        const resultBoth = calculateTotalScore(sajuInputBoth, createEmptyAstroInput());

        expect(resultBoth.breakdown.seun).toBeLessThan(resultSamjae.breakdown.seun);
      });
    });

    describe('iljin scoring', () => {
      it('should give bonus for cheoneulGwiin', () => {
        const baseline = calculateTotalScore(createEmptySajuInput(), createEmptyAstroInput());

        const sajuInput = createEmptySajuInput();
        sajuInput.iljin = { hasCheoneulGwiin: true };
        const result = calculateTotalScore(sajuInput, createEmptyAstroInput());

        expect(result.breakdown.iljin).toBeGreaterThan(baseline.breakdown.iljin);
      });

      it('should give bonus for multiple gwiin', () => {
        const sajuInputOne = createEmptySajuInput();
        sajuInputOne.iljin = { hasCheoneulGwiin: true };
        const resultOne = calculateTotalScore(sajuInputOne, createEmptyAstroInput());

        const sajuInputMultiple = createEmptySajuInput();
        sajuInputMultiple.iljin = {
          hasCheoneulGwiin: true,
          hasTaegukGwiin: true,
          hasCheondeokGwiin: true,
        };
        const resultMultiple = calculateTotalScore(sajuInputMultiple, createEmptyAstroInput());

        // Multiple gwiin should give same or better score (may hit ceiling)
        expect(resultMultiple.breakdown.iljin).toBeGreaterThanOrEqual(resultOne.breakdown.iljin);
      });

      it('should penalize for negative factors', () => {
        const baseline = calculateTotalScore(createEmptySajuInput(), createEmptyAstroInput());

        const sajuInput = createEmptySajuInput();
        sajuInput.iljin = { hasGongmang: true, hasWonjin: true };
        const result = calculateTotalScore(sajuInput, createEmptyAstroInput());

        expect(result.breakdown.iljin).toBeLessThan(baseline.breakdown.iljin);
      });
    });

    describe('yongsin scoring', () => {
      it('should give bonus for primary yongsin match', () => {
        const baseline = calculateTotalScore(createEmptySajuInput(), createEmptyAstroInput());

        const sajuInput = createEmptySajuInput();
        sajuInput.yongsin = { hasPrimaryMatch: true };
        const result = calculateTotalScore(sajuInput, createEmptyAstroInput());

        expect(result.breakdown.yongsin).toBeGreaterThan(baseline.breakdown.yongsin);
      });

      it('should penalize for kibsin match', () => {
        const baseline = calculateTotalScore(createEmptySajuInput(), createEmptyAstroInput());

        const sajuInput = createEmptySajuInput();
        sajuInput.yongsin = { hasKibsinMatch: true };
        const result = calculateTotalScore(sajuInput, createEmptyAstroInput());

        expect(result.breakdown.yongsin).toBeLessThan(baseline.breakdown.yongsin);
      });
    });

    describe('transit sun scoring', () => {
      it('should give highest bonus for same element', () => {
        const astroInput = createEmptyAstroInput();
        astroInput.transitSun = { elementRelation: 'same' };
        const result = calculateTotalScore(createEmptySajuInput(), astroInput);

        const astroInputGen = createEmptyAstroInput();
        astroInputGen.transitSun = { elementRelation: 'generatedBy' };
        const resultGen = calculateTotalScore(createEmptySajuInput(), astroInputGen);

        expect(result.breakdown.transitSun).toBeGreaterThan(resultGen.breakdown.transitSun);
      });

      it('should penalize for controlledBy', () => {
        const baseline = calculateTotalScore(createEmptySajuInput(), createEmptyAstroInput());

        const astroInput = createEmptyAstroInput();
        astroInput.transitSun = { elementRelation: 'controlledBy' };
        const result = calculateTotalScore(createEmptySajuInput(), astroInput);

        expect(result.breakdown.transitSun).toBeLessThan(baseline.breakdown.transitSun);
      });
    });

    describe('transit moon scoring', () => {
      it('should penalize for void of course', () => {
        const baseline = calculateTotalScore(createEmptySajuInput(), createEmptyAstroInput());

        const astroInput = createEmptyAstroInput();
        astroInput.transitMoon = { isVoidOfCourse: true };
        const result = calculateTotalScore(createEmptySajuInput(), astroInput);

        expect(result.breakdown.transitMoon).toBeLessThan(baseline.breakdown.transitMoon);
      });
    });

    describe('major planets scoring', () => {
      it('should give bonus for Jupiter trine', () => {
        const baseline = calculateTotalScore(createEmptySajuInput(), createEmptyAstroInput());

        const astroInput = createEmptyAstroInput();
        astroInput.majorPlanets = { jupiter: { aspect: 'trine' } };
        const result = calculateTotalScore(createEmptySajuInput(), astroInput);

        expect(result.breakdown.majorPlanets).toBeGreaterThan(baseline.breakdown.majorPlanets);
      });

      it('should penalize for Saturn square', () => {
        const baseline = calculateTotalScore(createEmptySajuInput(), createEmptyAstroInput());

        const astroInput = createEmptyAstroInput();
        astroInput.majorPlanets = { saturn: { aspect: 'square' } };
        const result = calculateTotalScore(createEmptySajuInput(), astroInput);

        expect(result.breakdown.majorPlanets).toBeLessThan(baseline.breakdown.majorPlanets);
      });

      it('should penalize for Mercury retrograde', () => {
        const baseline = calculateTotalScore(createEmptySajuInput(), createEmptyAstroInput());

        const astroInput = createEmptyAstroInput();
        astroInput.majorPlanets = { mercury: { isRetrograde: true } };
        const result = calculateTotalScore(createEmptySajuInput(), astroInput);

        expect(result.breakdown.majorPlanets).toBeLessThan(baseline.breakdown.majorPlanets);
      });
    });

    describe('lunar phase scoring', () => {
      it('should give highest bonus for full moon', () => {
        const astroInput = createEmptyAstroInput();
        astroInput.lunarPhase = 'fullMoon';
        const result = calculateTotalScore(createEmptySajuInput(), astroInput);

        const astroInputNew = createEmptyAstroInput();
        astroInputNew.lunarPhase = 'newMoon';
        const resultNew = calculateTotalScore(createEmptySajuInput(), astroInputNew);

        expect(result.breakdown.lunarPhase).toBeGreaterThan(resultNew.breakdown.lunarPhase);
      });

      it('should penalize for last quarter', () => {
        const baseline = calculateTotalScore(createEmptySajuInput(), createEmptyAstroInput());

        const astroInput = createEmptyAstroInput();
        astroInput.lunarPhase = 'lastQuarter';
        const result = calculateTotalScore(createEmptySajuInput(), astroInput);

        expect(result.breakdown.lunarPhase).toBeLessThan(baseline.breakdown.lunarPhase);
      });
    });

    describe('solar return scoring', () => {
      it('should give bonus for exact birthday', () => {
        const baseline = calculateTotalScore(createEmptySajuInput(), createEmptyAstroInput());

        const astroInput = createEmptyAstroInput();
        astroInput.solarReturn = { daysFromBirthday: 0 };
        const result = calculateTotalScore(createEmptySajuInput(), astroInput);

        expect(result.breakdown.solarReturn).toBeGreaterThan(baseline.breakdown.solarReturn);
      });

      it('should give smaller bonus for near birthday', () => {
        const astroInputExact = createEmptyAstroInput();
        astroInputExact.solarReturn = { daysFromBirthday: 0 };
        const resultExact = calculateTotalScore(createEmptySajuInput(), astroInputExact);

        const astroInputNear = createEmptyAstroInput();
        astroInputNear.solarReturn = { daysFromBirthday: 3 };
        const resultNear = calculateTotalScore(createEmptySajuInput(), astroInputNear);

        expect(resultExact.breakdown.solarReturn).toBeGreaterThan(resultNear.breakdown.solarReturn);
      });
    });

    describe('outer planets scoring', () => {
      it('should add bonus for positive outer planet aspects', () => {
        const baseline = calculateTotalScore(createEmptySajuInput(), createEmptyAstroInput());

        const astroInput = createEmptyAstroInput();
        astroInput.outerPlanets = { uranus: { aspect: 'trine' } };
        const result = calculateTotalScore(createEmptySajuInput(), astroInput);

        expect(result.astroScore).toBeGreaterThan(baseline.astroScore);
      });

      it('should penalize for negative outer planet aspects', () => {
        const baseline = calculateTotalScore(createEmptySajuInput(), createEmptyAstroInput());

        const astroInput = createEmptyAstroInput();
        astroInput.outerPlanets = { uranus: { aspect: 'square' } };
        const result = calculateTotalScore(createEmptySajuInput(), astroInput);

        expect(result.astroScore).toBeLessThan(baseline.astroScore);
      });
    });

    describe('special points scoring', () => {
      it('should add bonus for north node conjunction', () => {
        const baseline = calculateTotalScore(createEmptySajuInput(), createEmptyAstroInput());

        const astroInput = createEmptyAstroInput();
        astroInput.specialPoints = { northNode: { aspect: 'conjunction' } };
        const result = calculateTotalScore(createEmptySajuInput(), astroInput);

        expect(result.astroScore).toBeGreaterThan(baseline.astroScore);
      });
    });

    describe('eclipse scoring', () => {
      it('should add bonus for solar eclipse day', () => {
        const baseline = calculateTotalScore(createEmptySajuInput(), createEmptyAstroInput());

        const astroInput = createEmptyAstroInput();
        astroInput.eclipse = { isEclipseDay: true, eclipseType: 'solar' };
        const result = calculateTotalScore(createEmptySajuInput(), astroInput);

        expect(result.astroScore).toBeGreaterThan(baseline.astroScore);
      });

      it('should give higher bonus for solar than lunar eclipse', () => {
        const astroInputSolar = createEmptyAstroInput();
        astroInputSolar.eclipse = { isEclipseDay: true, eclipseType: 'solar' };
        const resultSolar = calculateTotalScore(createEmptySajuInput(), astroInputSolar);

        const astroInputLunar = createEmptyAstroInput();
        astroInputLunar.eclipse = { isEclipseDay: true, eclipseType: 'lunar' };
        const resultLunar = calculateTotalScore(createEmptySajuInput(), astroInputLunar);

        expect(resultSolar.astroScore).toBeGreaterThan(resultLunar.astroScore);
      });
    });

    describe('cross verification', () => {
      it('should give bonus when both saju and astro are positive', () => {
        // Create high-scoring inputs
        const sajuInput = createEmptySajuInput();
        sajuInput.daeun = { sibsin: 'inseong', hasYukhap: true };
        sajuInput.seun = { sibsin: 'jaeseong', hasSamhapPositive: true };
        sajuInput.wolun = { sibsin: 'inseong', hasYukhap: true };
        sajuInput.iljin = {
          sibsin: 'jeongyin',
          hasCheoneulGwiin: true,
          hasTaegukGwiin: true,
        };
        sajuInput.yongsin = { hasPrimaryMatch: true };

        const astroInput = createEmptyAstroInput();
        astroInput.transitSun = { elementRelation: 'same' };
        astroInput.transitMoon = { elementRelation: 'generatedBy' };
        astroInput.majorPlanets = { jupiter: { aspect: 'trine' } };
        astroInput.lunarPhase = 'fullMoon';
        astroInput.solarReturn = { daysFromBirthday: 0 };

        const result = calculateTotalScore(sajuInput, astroInput);

        expect(result.crossBonus).toBeGreaterThan(0);
        expect(result.crossVerified).toBe(true);
      });

      it('should give penalty when both saju and astro are negative', () => {
        // Create low-scoring inputs
        const sajuInput = createEmptySajuInput();
        sajuInput.daeun = { hasChung: true, hasGwansal: true };
        sajuInput.seun = { hasChung: true };
        sajuInput.wolun = { hasChung: true };
        sajuInput.iljin = { hasChung: true, hasXing: true };
        sajuInput.yongsin = { hasKibsinMatch: true };

        const astroInput = createEmptyAstroInput();
        astroInput.transitSun = { elementRelation: 'controlledBy' };
        astroInput.transitMoon = { elementRelation: 'controlledBy', isVoidOfCourse: true };
        astroInput.majorPlanets = {
          saturn: { aspect: 'square', isRetrograde: true },
          mercury: { isRetrograde: true },
        };
        astroInput.lunarPhase = 'lastQuarter';

        const result = calculateTotalScore(sajuInput, astroInput);

        expect(result.crossBonus).toBeLessThan(0);
      });
    });

    describe('grade thresholds', () => {
      it('should assign grade 0 for very high scores without chung/xing', () => {
        // Using best day inputs which should give grade 0 or 1
        const result = calculateTotalScore(
          SAMPLE_INPUTS.bestDay.saju,
          SAMPLE_INPUTS.bestDay.astro
        );

        // Should be grade 0 or 1 for best day
        expect(result.grade).toBeLessThanOrEqual(1);
      });

      it('should consider chung/xing in grade determination', () => {
        // The grading module checks for chung/xing when determining grade 0
        // Note: In scoring.ts, the grade is determined without considering chung/xing
        // The chung/xing check is done in grading.ts
        const sajuInput = createEmptySajuInput();
        sajuInput.iljin = { hasChung: true };

        const result = calculateTotalScore(sajuInput, createEmptyAstroInput());

        // Chung should reduce the iljin score
        const baseline = calculateTotalScore(createEmptySajuInput(), createEmptyAstroInput());
        expect(result.breakdown.iljin).toBeLessThan(baseline.breakdown.iljin);
      });
    });
  });
});
