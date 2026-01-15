// tests/lib/prediction/advancedTimingEngine.test.ts
import { describe, it, expect } from 'vitest';
import {
  calculatePreciseTwelveStage,
  analyzeBranchInteractions,
  calculateSibsin,
  analyzeMultiLayer,
  calculateMonthlyGanji,
  calculateYearlyGanji,
  calculateAdvancedMonthlyScore,
  generateAdvancedTimingPromptContext,
  type PreciseTwelveStage,
  type BranchInteraction,
  type LayeredTimingScore,
} from '@/lib/prediction/advancedTimingEngine';

describe('advancedTimingEngine', () => {
  describe('calculatePreciseTwelveStage', () => {
    const validStages = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
    const validEnergies = ['rising', 'peak', 'declining', 'dormant'];

    it('should return valid PreciseTwelveStage structure', () => {
      const result = calculatePreciseTwelveStage('甲', '子');

      expect(result).toBeDefined();
      expect(result.stage).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.energy).toBeDefined();
      expect(result.score).toBeDefined();
    });

    it('should return valid stage name', () => {
      const result = calculatePreciseTwelveStage('甲', '寅');

      expect(validStages).toContain(result.stage);
    });

    it('should return valid energy level', () => {
      const result = calculatePreciseTwelveStage('甲', '午');

      expect(validEnergies).toContain(result.energy);
    });

    it('should return score between 0 and 100', () => {
      const result = calculatePreciseTwelveStage('乙', '卯');

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should include lifePhase and advice', () => {
      const result = calculatePreciseTwelveStage('丙', '巳');

      expect(result.lifePhase).toBeDefined();
      expect(result.advice).toBeDefined();
      expect(typeof result.lifePhase).toBe('string');
      expect(typeof result.advice).toBe('string');
    });

    it('should return consistent results for same input', () => {
      const result1 = calculatePreciseTwelveStage('甲', '子');
      const result2 = calculatePreciseTwelveStage('甲', '子');

      expect(result1.stage).toBe(result2.stage);
      expect(result1.score).toBe(result2.score);
    });

    it('should return different results for different stems', () => {
      const resultJia = calculatePreciseTwelveStage('甲', '子');
      const resultYi = calculatePreciseTwelveStage('乙', '子');

      // Different day stems should have different stages
      const isDifferent = resultJia.stage !== resultYi.stage || resultJia.score !== resultYi.score;
      expect(isDifferent).toBe(true);
    });

    it('should handle all 10 heavenly stems', () => {
      const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

      stems.forEach((stem) => {
        const result = calculatePreciseTwelveStage(stem, '子');
        expect(result).toBeDefined();
        expect(validStages).toContain(result.stage);
      });
    });

    it('should handle all 12 earthly branches', () => {
      const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

      branches.forEach((branch) => {
        const result = calculatePreciseTwelveStage('甲', branch);
        expect(result).toBeDefined();
        expect(validStages).toContain(result.stage);
      });
    });
  });

  describe('analyzeBranchInteractions', () => {
    it('should return array of BranchInteraction', () => {
      const result = analyzeBranchInteractions(['子', '丑', '寅']);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should detect 육합 (six harmony)', () => {
      // 子丑合 is a classic 육합
      const result = analyzeBranchInteractions(['子', '丑']);

      const hasHarmony = result.some((r) => r.type === '육합');
      expect(hasHarmony).toBe(true);
    });

    it('should detect 충 (clash)', () => {
      // 子午충 is a classic clash
      const result = analyzeBranchInteractions(['子', '午']);

      const hasClash = result.some((r) => r.type === '충');
      expect(hasClash).toBe(true);
    });

    it('should detect 삼합 (three harmony)', () => {
      // 申子辰 삼합 (water)
      const result = analyzeBranchInteractions(['申', '子', '辰']);

      const hasTriple = result.some((r) => r.type === '삼합');
      expect(hasTriple).toBe(true);
    });

    it('should return interactions with valid impact', () => {
      const result = analyzeBranchInteractions(['子', '午', '卯']);
      const validImpacts = ['positive', 'negative', 'transformative'];

      result.forEach((interaction) => {
        expect(validImpacts).toContain(interaction.impact);
      });
    });

    it('should include score for each interaction', () => {
      const result = analyzeBranchInteractions(['子', '丑']);

      result.forEach((interaction) => {
        expect(interaction.score).toBeDefined();
        expect(typeof interaction.score).toBe('number');
      });
    });

    it('should include description for each interaction', () => {
      const result = analyzeBranchInteractions(['子', '丑']);

      result.forEach((interaction) => {
        expect(interaction.description).toBeDefined();
        expect(typeof interaction.description).toBe('string');
      });
    });

    it('should handle empty array', () => {
      const result = analyzeBranchInteractions([]);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should handle single branch', () => {
      const result = analyzeBranchInteractions(['子']);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('calculateSibsin', () => {
    const validSibsin = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];

    it('should return valid sibsin name', () => {
      const result = calculateSibsin('甲', '甲');

      expect(validSibsin).toContain(result);
    });

    it('should return 비견 for same stem', () => {
      const result = calculateSibsin('甲', '甲');

      expect(result).toBe('비견');
    });

    it('should return 겁재 for same element different polarity', () => {
      const result = calculateSibsin('甲', '乙');

      expect(result).toBe('겁재');
    });

    it('should calculate correctly for all stem combinations', () => {
      const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

      stems.forEach((dayStem) => {
        stems.forEach((targetStem) => {
          const result = calculateSibsin(dayStem, targetStem);
          expect(validSibsin).toContain(result);
        });
      });
    });

    it('should produce consistent results', () => {
      const result1 = calculateSibsin('甲', '丙');
      const result2 = calculateSibsin('甲', '丙');

      expect(result1).toBe(result2);
    });
  });

  describe('analyzeMultiLayer', () => {
    const validInput = {
      dayStem: '甲',
      dayBranch: '子',
      daeun: { stem: '丙', branch: '寅' },
      saeun: { stem: '戊', branch: '辰' },
      wolun: { stem: '庚', branch: '午' },
    };

    it('should return multi-layer analysis result', () => {
      const result = analyzeMultiLayer(validInput);

      expect(result).toBeDefined();
      expect(result.layers).toBeDefined();
      expect(Array.isArray(result.layers)).toBe(true);
    });

    it('should include layer analyses with sibsin', () => {
      const result = analyzeMultiLayer(validInput);

      result.layers.forEach((layer) => {
        expect(layer.sibsin).toBeDefined();
        expect(layer.stem).toBeDefined();
        expect(layer.branch).toBeDefined();
      });
    });

    it('should include interactions array', () => {
      const result = analyzeMultiLayer(validInput);

      expect(result.interactions).toBeDefined();
      expect(Array.isArray(result.interactions)).toBe(true);
    });

    it('should include branchInteractions array', () => {
      const result = analyzeMultiLayer(validInput);

      expect(result.branchInteractions).toBeDefined();
      expect(Array.isArray(result.branchInteractions)).toBe(true);
    });

    it('should handle input without daeun', () => {
      const inputWithoutDaeun = {
        dayStem: '甲',
        dayBranch: '子',
        saeun: { stem: '戊', branch: '辰' },
        wolun: { stem: '庚', branch: '午' },
      };

      const result = analyzeMultiLayer(inputWithoutDaeun);
      expect(result).toBeDefined();
      expect(result.layers.length).toBeGreaterThanOrEqual(2); // saeun + wolun
    });
  });

  describe('calculateMonthlyGanji', () => {
    it('should return stem and branch for given year and month', () => {
      const result = calculateMonthlyGanji(2024, 6);

      expect(result).toBeDefined();
      expect(result.stem).toBeDefined();
      expect(result.branch).toBeDefined();
    });

    it('should return valid stem', () => {
      const validStems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
      const result = calculateMonthlyGanji(2024, 1);

      expect(validStems).toContain(result.stem);
    });

    it('should return valid branch', () => {
      const validBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
      const result = calculateMonthlyGanji(2024, 1);

      expect(validBranches).toContain(result.branch);
    });

    it('should be consistent for same year and month', () => {
      const result1 = calculateMonthlyGanji(2024, 6);
      const result2 = calculateMonthlyGanji(2024, 6);

      expect(result1.stem).toBe(result2.stem);
      expect(result1.branch).toBe(result2.branch);
    });

    it('should differ for different months', () => {
      const jan = calculateMonthlyGanji(2024, 1);
      const feb = calculateMonthlyGanji(2024, 2);

      const isDifferent = jan.stem !== feb.stem || jan.branch !== feb.branch;
      expect(isDifferent).toBe(true);
    });

    it('should handle all 12 months', () => {
      for (let month = 1; month <= 12; month++) {
        const result = calculateMonthlyGanji(2024, month);
        expect(result.stem).toBeDefined();
        expect(result.branch).toBeDefined();
      }
    });
  });

  describe('calculateYearlyGanji', () => {
    it('should return stem and branch for given year', () => {
      const result = calculateYearlyGanji(2024);

      expect(result).toBeDefined();
      expect(result.stem).toBeDefined();
      expect(result.branch).toBeDefined();
    });

    it('should return valid stem', () => {
      const validStems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
      const result = calculateYearlyGanji(2024);

      expect(validStems).toContain(result.stem);
    });

    it('should return valid branch', () => {
      const validBranches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
      const result = calculateYearlyGanji(2024);

      expect(validBranches).toContain(result.branch);
    });

    it('should calculate 2024 as 甲辰 year', () => {
      const result = calculateYearlyGanji(2024);

      expect(result.stem).toBe('甲');
      expect(result.branch).toBe('辰');
    });

    it('should cycle through 60-year cycle', () => {
      const year2024 = calculateYearlyGanji(2024);
      const year2084 = calculateYearlyGanji(2084); // 60 years later

      expect(year2024.stem).toBe(year2084.stem);
      expect(year2024.branch).toBe(year2084.branch);
    });

    it('should differ year to year', () => {
      const year2024 = calculateYearlyGanji(2024);
      const year2025 = calculateYearlyGanji(2025);

      const isDifferent = year2024.stem !== year2025.stem || year2024.branch !== year2025.branch;
      expect(isDifferent).toBe(true);
    });
  });

  describe('calculateAdvancedMonthlyScore', () => {
    // Use AdvancedTimingInput format
    const validInput = {
      year: 2024,
      month: 6,
      dayStem: '甲',
      dayBranch: '子',
      daeun: { stem: '丙', branch: '寅' },
    };

    it('should return LayeredTimingScore structure', () => {
      const result = calculateAdvancedMonthlyScore(validInput);

      expect(result).toBeDefined();
      expect(result.year).toBe(2024);
      expect(result.month).toBe(6);
    });

    it('should include all layer analyses', () => {
      const result = calculateAdvancedMonthlyScore(validInput);

      expect(result.daeunLayer).toBeDefined();
      expect(result.saeunLayer).toBeDefined();
      expect(result.wolunLayer).toBeDefined();
    });

    it('should have valid scores', () => {
      const result = calculateAdvancedMonthlyScore(validInput);

      expect(result.rawScore).toBeGreaterThanOrEqual(0);
      expect(result.rawScore).toBeLessThanOrEqual(100);
      expect(result.weightedScore).toBeGreaterThanOrEqual(0);
      expect(result.weightedScore).toBeLessThanOrEqual(100);
    });

    it('should have valid confidence', () => {
      const result = calculateAdvancedMonthlyScore(validInput);

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should include grade', () => {
      const result = calculateAdvancedMonthlyScore(validInput);
      const validGrades = ['S', 'A', 'B', 'C', 'D', 'F'];

      expect(validGrades).toContain(result.grade);
    });

    it('should include energy balance', () => {
      const result = calculateAdvancedMonthlyScore(validInput);

      expect(result.energyBalance).toBeDefined();
      expect(result.energyBalance['목']).toBeDefined();
      expect(result.energyBalance['화']).toBeDefined();
      expect(result.energyBalance['토']).toBeDefined();
      expect(result.energyBalance['금']).toBeDefined();
      expect(result.energyBalance['수']).toBeDefined();
    });

    it('should include themes and opportunities', () => {
      const result = calculateAdvancedMonthlyScore(validInput);

      expect(Array.isArray(result.themes)).toBe(true);
      expect(Array.isArray(result.opportunities)).toBe(true);
      expect(Array.isArray(result.cautions)).toBe(true);
    });

    it('should include timing advice', () => {
      const result = calculateAdvancedMonthlyScore(validInput);

      expect(result.timing).toBeDefined();
      expect(Array.isArray(result.timing.bestActions)).toBe(true);
      expect(Array.isArray(result.timing.avoidActions)).toBe(true);
    });

    it('should work without daeun', () => {
      const inputWithoutDaeun = {
        year: 2024,
        month: 6,
        dayStem: '甲',
        dayBranch: '子',
      };
      const result = calculateAdvancedMonthlyScore(inputWithoutDaeun);

      expect(result).toBeDefined();
      expect(result.weightedScore).toBeGreaterThanOrEqual(0);
    });

    it('should work with yongsin and kisin', () => {
      const inputWithYongKi = {
        ...validInput,
        yongsin: ['목' as const, '화' as const],
        kisin: ['금' as const],
      };
      const result = calculateAdvancedMonthlyScore(inputWithYongKi);

      expect(result).toBeDefined();
      expect(result.weightedScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateAdvancedTimingPromptContext', () => {
    const getTestScore = () => {
      return calculateAdvancedMonthlyScore({
        year: 2024,
        month: 6,
        dayStem: '甲',
        dayBranch: '子',
        daeun: { stem: '丙', branch: '寅' },
      });
    };

    it('should return string context', () => {
      const score = getTestScore();
      const result = generateAdvancedTimingPromptContext([score]);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include layer information', () => {
      const score = getTestScore();
      const result = generateAdvancedTimingPromptContext([score]);

      // Should mention layers (daeun/saeun/wolun or their translations)
      const hasLayerInfo =
        result.includes('대운') ||
        result.includes('세운') ||
        result.includes('월운') ||
        result.includes('layer') ||
        result.includes('Layer') ||
        result.includes('레이어');

      expect(hasLayerInfo).toBe(true);
    });

    it('should include grade or score', () => {
      const score = getTestScore();
      const result = generateAdvancedTimingPromptContext([score]);

      // Should include grade or score info
      const hasScoreInfo =
        result.includes('점') ||
        result.includes('score') ||
        result.includes('Score') ||
        /[SABCDF]등급/.test(result);

      expect(hasScoreInfo).toBe(true);
    });

    it('should support English language', () => {
      const score = getTestScore();
      const result = generateAdvancedTimingPromptContext([score], 'en');

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle multiple scores', () => {
      const score1 = calculateAdvancedMonthlyScore({
        year: 2024,
        month: 6,
        dayStem: '甲',
        dayBranch: '子',
      });
      const score2 = calculateAdvancedMonthlyScore({
        year: 2024,
        month: 7,
        dayStem: '甲',
        dayBranch: '子',
      });
      const result = generateAdvancedTimingPromptContext([score1, score2]);

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('6월');
      expect(result).toContain('7월');
    });
  });

  describe('type exports', () => {
    it('should export PreciseTwelveStage type', () => {
      const stage: PreciseTwelveStage = {
        stage: '장생',
        description: 'test',
        energy: 'rising',
        score: 80,
        lifePhase: 'test',
        advice: 'test',
      };

      expect(stage).toBeDefined();
    });

    it('should export BranchInteraction type', () => {
      const interaction: BranchInteraction = {
        branches: ['子', '丑'],
        type: '육합',
        impact: 'positive',
        score: 85,
        description: 'test',
      };

      expect(interaction).toBeDefined();
    });
  });
});
