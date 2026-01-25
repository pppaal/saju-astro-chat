/**
 * Factor Generator Tests
 * 요소 키 및 카테고리 생성 모듈 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import {
  generateFactors,
  type FactorGeneratorInput,
  type FactorGeneratorResult,
} from '@/lib/destiny-map/calendar/analyzers/factor-generator';

// Mock dependencies
vi.mock('@/lib/destiny-map/calendar/utils/recommendation-filter', () => ({
  filterByScenario: vi.fn(),
}));

vi.mock('@/lib/destiny-map/calendar/utils/shinsal-mapper', () => ({
  processShinsals: vi.fn(() => ({
    factorKeys: ['shinsal_cheoneul'],
    recommendations: ['contract'],
    warnings: [],
  })),
}));

vi.mock('@/lib/destiny-map/calendar/utils/branch-relationship-analyzer', () => ({
  analyzeBranchRelationships: vi.fn(() => ({
    factorKeys: ['samhap_water'],
    recommendations: ['teamwork'],
    warnings: [],
    categories: ['career'],
    titleKey: '',
    descKey: '',
    filterScenarios: [],
  })),
}));

vi.mock('@/lib/destiny-map/calendar/category-scoring', () => ({
  calculateAreaScoresForCategories: vi.fn(() => ({
    career: 75,
    wealth: 60,
    love: 55,
    health: 50,
  })),
  getBestAreaCategory: vi.fn(() => 'career'),
}));

describe('FactorGenerator', () => {
  const createMockInput = (overrides: Partial<FactorGeneratorInput> = {}): FactorGeneratorInput => ({
    ganzhi: { stem: '甲', branch: '子', stemElement: 'wood', branchElement: 'water' },
    dayMasterElement: 'wood',
    dayMasterStem: '甲',
    dayBranch: '寅',
    yearBranch: '午',
    sajuResult: {
      specialFactors: {
        hasCheoneulGwiin: false,
        hasSonEomneun: false,
        hasGeonrok: false,
        isSamjaeYear: false,
        hasYeokma: false,
      },
      shinsalForScoring: { active: [] },
      seunAnalysis: { score: 70, factorKeys: ['seunPositive'] },
      wolunAnalysis: { score: 65, factorKeys: ['wolunNeutral'] },
      iljinAnalysis: { factorKeys: ['iljinGood'] },
      daeunAnalysis: { factorKeys: ['daeunStrong'] },
      yongsinAnalysis: { factorKeys: [] },
      geokgukAnalysis: { factorKeys: [] },
    },
    astroResult: {
      lunarPhase: { phaseName: 'waxingCrescent' },
      moonPhaseDetailed: { factorKey: 'waxingCrescent' },
      planetTransits: { factorKeys: ['jupiterTrine'] },
      solarReturnAnalysis: { factorKeys: [] },
      progressionAnalysis: { factorKeys: [] },
      retrogradePlanets: [],
      voidOfCourse: { isVoid: false },
      eclipseImpact: { hasImpact: false },
      planetaryHour: { dayRuler: 'Sun' },
    },
    advancedBranchInteractions: [],
    transitSunElement: 'fire',
    natalSunElement: 'wood',
    crossVerified: false,
    sajuPositive: true,
    sajuNegative: false,
    astroPositive: true,
    astroNegative: false,
    ...overrides,
  });

  describe('generateFactors', () => {
    describe('basic structure', () => {
      it('should return all required fields', () => {
        const input = createMockInput();
        const result = generateFactors(input);

        expect(result).toHaveProperty('categories');
        expect(result).toHaveProperty('titleKey');
        expect(result).toHaveProperty('descKey');
        expect(result).toHaveProperty('sajuFactorKeys');
        expect(result).toHaveProperty('astroFactorKeys');
        expect(result).toHaveProperty('recommendationKeys');
        expect(result).toHaveProperty('warningKeys');
      });

      it('should return arrays for factor keys', () => {
        const input = createMockInput();
        const result = generateFactors(input);

        expect(Array.isArray(result.categories)).toBe(true);
        expect(Array.isArray(result.sajuFactorKeys)).toBe(true);
        expect(Array.isArray(result.astroFactorKeys)).toBe(true);
        expect(Array.isArray(result.recommendationKeys)).toBe(true);
        expect(Array.isArray(result.warningKeys)).toBe(true);
      });

      it('should add general category if none specified', () => {
        const input = createMockInput({
          ganzhi: { stem: '壬', branch: '亥', stemElement: 'water', branchElement: 'water' },
        });
        const result = generateFactors(input);

        expect(result.categories.length).toBeGreaterThan(0);
      });
    });

    describe('special factors - 천을귀인', () => {
      it('should add cheoneulGwiin factor when present', () => {
        const input = createMockInput({
          sajuResult: {
            ...createMockInput().sajuResult,
            specialFactors: {
              ...createMockInput().sajuResult.specialFactors,
              hasCheoneulGwiin: true,
            },
          },
        });
        const result = generateFactors(input);

        expect(result.sajuFactorKeys).toContain('cheoneulGwiin');
        expect(result.recommendationKeys).toContain('majorDecision');
        expect(result.recommendationKeys).toContain('contract');
        // Note: titleKey may be overwritten by stem element relationships
      });
    });

    describe('special factors - 손없는날', () => {
      it('should add sonEomneunDay factor when present', () => {
        const input = createMockInput({
          sajuResult: {
            ...createMockInput().sajuResult,
            specialFactors: {
              ...createMockInput().sajuResult.specialFactors,
              hasSonEomneun: true,
            },
          },
        });
        const result = generateFactors(input);

        expect(result.sajuFactorKeys).toContain('sonEomneunDay');
        expect(result.recommendationKeys).toContain('moving');
        expect(result.categories).toContain('general');
      });
    });

    describe('special factors - 건록', () => {
      it('should add geonrokDay factor when present', () => {
        const input = createMockInput({
          sajuResult: {
            ...createMockInput().sajuResult,
            specialFactors: {
              ...createMockInput().sajuResult.specialFactors,
              hasGeonrok: true,
            },
          },
        });
        const result = generateFactors(input);

        expect(result.sajuFactorKeys).toContain('geonrokDay');
        expect(result.recommendationKeys).toContain('career');
        expect(result.categories).toContain('career');
      });
    });

    describe('special factors - 삼재', () => {
      it('should add samjaeYear warning when present', () => {
        const input = createMockInput({
          sajuResult: {
            ...createMockInput().sajuResult,
            specialFactors: {
              ...createMockInput().sajuResult.specialFactors,
              isSamjaeYear: true,
            },
          },
        });
        const result = generateFactors(input);

        expect(result.sajuFactorKeys).toContain('samjaeYear');
        expect(result.warningKeys).toContain('samjae');
      });
    });

    describe('special factors - 역마', () => {
      it('should add yeokmaDay factor when present', () => {
        const input = createMockInput({
          sajuResult: {
            ...createMockInput().sajuResult,
            specialFactors: {
              ...createMockInput().sajuResult.specialFactors,
              hasYeokma: true,
            },
          },
        });
        const result = generateFactors(input);

        expect(result.sajuFactorKeys).toContain('yeokmaDay');
        expect(result.recommendationKeys).toContain('travel');
        expect(result.categories).toContain('travel');
      });
    });

    describe('branch interactions', () => {
      it('should add positive branch interaction factors', () => {
        const input = createMockInput({
          advancedBranchInteractions: [
            { type: '육합', impact: 'positive', element: 'water' },
          ],
        });
        const result = generateFactors(input);

        expect(result.sajuFactorKeys).toContain('advanced_육합');
        expect(result.recommendationKeys).toContain('partnership');
      });

      it('should add negative branch interaction factors', () => {
        const input = createMockInput({
          advancedBranchInteractions: [
            { type: '충', impact: 'negative', element: 'fire' },
          ],
        });
        const result = generateFactors(input);

        expect(result.sajuFactorKeys).toContain('advanced_충');
        expect(result.warningKeys).toContain('conflict');
      });

      it('should add samhap recommendations', () => {
        const input = createMockInput({
          advancedBranchInteractions: [
            { type: '삼합', impact: 'positive', element: 'water' },
          ],
        });
        const result = generateFactors(input);

        expect(result.recommendationKeys).toContain('collaboration');
        expect(result.recommendationKeys).toContain('synergy');
      });

      it('should add xing warnings', () => {
        const input = createMockInput({
          advancedBranchInteractions: [
            { type: '형', impact: 'negative', element: 'fire' },
          ],
        });
        const result = generateFactors(input);

        expect(result.warningKeys).toContain('tension');
      });
    });

    describe('stem element relationships', () => {
      it('should detect bijeon (same element)', () => {
        const input = createMockInput({
          ganzhi: { stem: '甲', branch: '子', stemElement: 'wood', branchElement: 'water' },
          dayMasterElement: 'wood',
        });
        const result = generateFactors(input);

        expect(result.sajuFactorKeys).toContain('stemBijeon');
        expect(result.categories).toContain('career');
      });

      it('should detect inseong (generated by element)', () => {
        const input = createMockInput({
          ganzhi: { stem: '壬', branch: '子', stemElement: 'water', branchElement: 'water' },
          dayMasterElement: 'wood',
        });
        const result = generateFactors(input);

        expect(result.sajuFactorKeys).toContain('stemInseong');
        expect(result.categories).toContain('study');
      });

      it('should detect jaeseong (controls element)', () => {
        const input = createMockInput({
          ganzhi: { stem: '戊', branch: '辰', stemElement: 'earth', branchElement: 'earth' },
          dayMasterElement: 'wood',
        });
        const result = generateFactors(input);

        expect(result.sajuFactorKeys).toContain('stemJaeseong');
        expect(result.categories).toContain('wealth');
      });

      it('should detect siksang (generates element)', () => {
        const input = createMockInput({
          ganzhi: { stem: '丙', branch: '午', stemElement: 'fire', branchElement: 'fire' },
          dayMasterElement: 'wood',
        });
        const result = generateFactors(input);

        expect(result.sajuFactorKeys).toContain('stemSiksang');
        expect(result.categories).toContain('love');
      });

      it('should detect gwansal (controlled by element)', () => {
        const input = createMockInput({
          ganzhi: { stem: '庚', branch: '申', stemElement: 'metal', branchElement: 'metal' },
          dayMasterElement: 'wood',
        });
        const result = generateFactors(input);

        expect(result.sajuFactorKeys).toContain('stemGwansal');
        expect(result.warningKeys).toContain('conflict');
      });
    });

    describe('lunar phase analysis', () => {
      it('should detect new moon', () => {
        const input = createMockInput({
          astroResult: {
            ...createMockInput().astroResult,
            lunarPhase: { phaseName: 'newMoon' },
          },
        });
        const result = generateFactors(input);

        expect(result.astroFactorKeys).toContain('lunarNewMoon');
        expect(result.recommendationKeys).toContain('newBeginning');
      });

      it('should detect full moon', () => {
        const input = createMockInput({
          astroResult: {
            ...createMockInput().astroResult,
            lunarPhase: { phaseName: 'fullMoon' },
          },
        });
        const result = generateFactors(input);

        expect(result.astroFactorKeys).toContain('lunarFullMoon');
        expect(result.recommendationKeys).toContain('completion');
      });

      it('should detect first quarter with warning', () => {
        const input = createMockInput({
          astroResult: {
            ...createMockInput().astroResult,
            lunarPhase: { phaseName: 'firstQuarter' },
          },
        });
        const result = generateFactors(input);

        expect(result.astroFactorKeys).toContain('lunarFirstQuarter');
        expect(result.warningKeys).toContain('tension');
      });
    });

    describe('retrograde planets', () => {
      it('should add mercury retrograde warning', () => {
        const input = createMockInput({
          astroResult: {
            ...createMockInput().astroResult,
            retrogradePlanets: ['mercury'],
          },
        });
        const result = generateFactors(input);

        expect(result.astroFactorKeys).toContain('retrogradeMercury');
        expect(result.warningKeys).toContain('mercuryRetrograde');
      });

      it('should add venus retrograde warning', () => {
        const input = createMockInput({
          astroResult: {
            ...createMockInput().astroResult,
            retrogradePlanets: ['venus'],
          },
        });
        const result = generateFactors(input);

        expect(result.astroFactorKeys).toContain('retrogradeVenus');
        expect(result.warningKeys).toContain('venusRetrograde');
      });

      it('should add mars retrograde warning', () => {
        const input = createMockInput({
          astroResult: {
            ...createMockInput().astroResult,
            retrogradePlanets: ['mars'],
          },
        });
        const result = generateFactors(input);

        expect(result.astroFactorKeys).toContain('retrogradeMars');
        expect(result.warningKeys).toContain('marsRetrograde');
      });
    });

    describe('void of course moon', () => {
      it('should add void of course warning', () => {
        const input = createMockInput({
          astroResult: {
            ...createMockInput().astroResult,
            voidOfCourse: { isVoid: true },
          },
        });
        const result = generateFactors(input);

        expect(result.astroFactorKeys).toContain('voidOfCourse');
        expect(result.warningKeys).toContain('voidOfCourse');
      });
    });

    describe('eclipse impact', () => {
      it('should add solar eclipse factor', () => {
        const input = createMockInput({
          astroResult: {
            ...createMockInput().astroResult,
            eclipseImpact: { hasImpact: true, type: 'solar', intensity: 'strong' },
          },
        });
        const result = generateFactors(input);

        expect(result.astroFactorKeys).toContain('solarEclipsestrong');
        expect(result.warningKeys).toContain('eclipseDay');
      });

      it('should add lunar eclipse factor', () => {
        const input = createMockInput({
          astroResult: {
            ...createMockInput().astroResult,
            eclipseImpact: { hasImpact: true, type: 'lunar', intensity: 'medium' },
          },
        });
        const result = generateFactors(input);

        expect(result.astroFactorKeys).toContain('lunarEclipsemedium');
        expect(result.warningKeys).toContain('eclipseNear');
      });
    });

    describe('planetary day ruler', () => {
      it('should add Jupiter day ruler benefits', () => {
        const input = createMockInput({
          astroResult: {
            ...createMockInput().astroResult,
            planetaryHour: { dayRuler: 'Jupiter' },
          },
        });
        const result = generateFactors(input);

        expect(result.astroFactorKeys).toContain('dayRulerJupiter');
        expect(result.recommendationKeys).toContain('expansion');
        expect(result.recommendationKeys).toContain('luck');
      });

      it('should add Venus day ruler benefits', () => {
        const input = createMockInput({
          astroResult: {
            ...createMockInput().astroResult,
            planetaryHour: { dayRuler: 'Venus' },
          },
        });
        const result = generateFactors(input);

        expect(result.astroFactorKeys).toContain('dayRulerVenus');
        expect(result.recommendationKeys).toContain('love');
        expect(result.recommendationKeys).toContain('beauty');
      });
    });

    describe('cross verification', () => {
      it('should add cross verified factor', () => {
        const input = createMockInput({
          crossVerified: true,
        });
        const result = generateFactors(input);

        expect(result.astroFactorKeys).toContain('crossVerified');
        expect(result.recommendationKeys).toContain('majorDecision');
      });

      it('should add cross negative warning', () => {
        const input = createMockInput({
          sajuNegative: true,
          astroNegative: true,
        });
        const result = generateFactors(input);

        expect(result.astroFactorKeys).toContain('crossNegative');
        expect(result.warningKeys).toContain('extremeCaution');
      });

      it('should detect mixed signals', () => {
        const input = createMockInput({
          sajuPositive: true,
          sajuNegative: false,
          astroPositive: false,
          astroNegative: true,
        });
        const result = generateFactors(input);

        expect(result.astroFactorKeys).toContain('mixedSignals');
        expect(result.warningKeys).toContain('confusion');
      });
    });

    describe('transit sun element relationships', () => {
      it('should detect same element', () => {
        const input = createMockInput({
          transitSunElement: 'wood',
          natalSunElement: 'wood',
        });
        const result = generateFactors(input);

        expect(result.astroFactorKeys).toContain('sameElement');
        expect(result.recommendationKeys).toContain('confidence');
      });

      it('should detect support element', () => {
        const input = createMockInput({
          transitSunElement: 'water',
          natalSunElement: 'wood',
        });
        const result = generateFactors(input);

        expect(result.astroFactorKeys).toContain('supportElement');
        expect(result.recommendationKeys).toContain('learning');
      });

      it('should detect giving element', () => {
        const input = createMockInput({
          transitSunElement: 'fire',
          natalSunElement: 'wood',
        });
        const result = generateFactors(input);

        expect(result.astroFactorKeys).toContain('givingElement');
        expect(result.recommendationKeys).toContain('giving');
      });

      it('should detect conflict element', () => {
        const input = createMockInput({
          transitSunElement: 'metal',
          natalSunElement: 'wood',
        });
        const result = generateFactors(input);

        expect(result.astroFactorKeys).toContain('conflictElement');
        expect(result.warningKeys).toContain('stress');
      });

      it('should detect control element', () => {
        const input = createMockInput({
          transitSunElement: 'earth',
          natalSunElement: 'wood',
        });
        const result = generateFactors(input);

        expect(result.astroFactorKeys).toContain('controlElement');
        expect(result.recommendationKeys).toContain('achievement');
      });
    });
  });
});
