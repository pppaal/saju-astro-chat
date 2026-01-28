/**
 * Tests for src/lib/destiny-map/calendar/date-analysis-factors.ts
 * 사주/점성 요소 키 생성 테스트 (실제 함수 호출)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/destiny-map/calendar/utils', () => ({
  approximateLunarDay: vi.fn(() => 15),
  isCheoneulGwiin: vi.fn(() => false),
  isDohwaDay: vi.fn(() => false),
  isGeonrokDay: vi.fn(() => false),
  isSamjaeYear: vi.fn(() => false),
  isSonEomneunDay: vi.fn(() => false),
  isYeokmaDay: vi.fn(() => false),
}));

vi.mock('@/lib/destiny-map/calendar/temporal-scoring', () => ({
  getYearGanzhi: vi.fn(() => ({ stem: '甲', branch: '辰' })),
}));

vi.mock('@/lib/destiny-map/calendar/constants', () => ({
  ELEMENT_RELATIONS: {
    '木': { generatedBy: '水', controls: '土', generates: '火', controlledBy: '金' },
    '火': { generatedBy: '木', controls: '金', generates: '土', controlledBy: '水' },
    '土': { generatedBy: '火', controls: '水', generates: '金', controlledBy: '木' },
    '金': { generatedBy: '土', controls: '木', generates: '水', controlledBy: '火' },
    '水': { generatedBy: '金', controls: '火', generates: '木', controlledBy: '土' },
  },
}));

import {
  calculateSpecialDayFlags,
  generateSajuFactorKeys,
  filterConflictingRecommendations,
  generateAstroFactorKeys,
} from '@/lib/destiny-map/calendar/date-analysis-factors';
import {
  isCheoneulGwiin,
  isGeonrokDay,
  isSonEomneunDay,
  isYeokmaDay,
  isDohwaDay,
  isSamjaeYear,
} from '@/lib/destiny-map/calendar/utils';

describe('date-analysis-factors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock return values to defaults (clearAllMocks doesn't reset mockReturnValue)
    (isCheoneulGwiin as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (isGeonrokDay as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (isSonEomneunDay as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (isYeokmaDay as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (isDohwaDay as ReturnType<typeof vi.fn>).mockReturnValue(false);
    (isSamjaeYear as ReturnType<typeof vi.fn>).mockReturnValue(false);
  });

  // ═══════════════════════════════════════
  // calculateSpecialDayFlags
  // ═══════════════════════════════════════
  describe('calculateSpecialDayFlags', () => {
    it('should detect cheoneulGwiin when mock returns true', () => {
      (isCheoneulGwiin as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const flags = calculateSpecialDayFlags('甲', '子', { branch: '丑' }, new Date(2024, 5, 15), 2024);
      expect(flags.hasCheoneulGwiin).toBe(true);
    });

    it('should detect geonrok when mock returns true', () => {
      (isGeonrokDay as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const flags = calculateSpecialDayFlags('甲', '子', { branch: '寅' }, new Date(2024, 5, 15), 2024);
      expect(flags.hasGeonrok).toBe(true);
    });

    it('should detect sonEomneun when mock returns true', () => {
      (isSonEomneunDay as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const flags = calculateSpecialDayFlags('甲', '子', { branch: '午' }, new Date(2024, 5, 15), 2024);
      expect(flags.hasSonEomneun).toBe(true);
    });

    it('should detect yeokma when mock returns true', () => {
      (isYeokmaDay as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const flags = calculateSpecialDayFlags('甲', '子', { branch: '申' }, new Date(2024, 5, 15), 2024);
      expect(flags.hasYeokma).toBe(true);
    });

    it('should detect dohwa when mock returns true', () => {
      (isDohwaDay as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const flags = calculateSpecialDayFlags('甲', '子', { branch: '卯' }, new Date(2024, 5, 15), 2024);
      expect(flags.hasDohwa).toBe(true);
    });

    it('should detect samjaeYear when mock returns true', () => {
      (isSamjaeYear as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const flags = calculateSpecialDayFlags('甲', '子', { branch: '午' }, new Date(2024, 5, 15), 2024);
      expect(flags.isSamjaeYearFlag).toBe(true);
    });

    it('should return false for cheoneulGwiin/geonrok when dayMasterStem is undefined', () => {
      (isCheoneulGwiin as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (isGeonrokDay as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const flags = calculateSpecialDayFlags(undefined, '子', { branch: '丑' }, new Date(2024, 5, 15), 2024);
      expect(flags.hasCheoneulGwiin).toBe(false);
      expect(flags.hasGeonrok).toBe(false);
    });

    it('should return false for yeokma/dohwa when yearBranch is undefined', () => {
      (isYeokmaDay as ReturnType<typeof vi.fn>).mockReturnValue(true);
      (isDohwaDay as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const flags = calculateSpecialDayFlags('甲', undefined, { branch: '申' }, new Date(2024, 5, 15), 2024);
      expect(flags.hasYeokma).toBe(false);
      expect(flags.hasDohwa).toBe(false);
    });

    it('should return all false when no conditions met', () => {
      const flags = calculateSpecialDayFlags('甲', '子', { branch: '午' }, new Date(2024, 5, 15), 2024);
      expect(Object.values(flags).every(v => v === false)).toBe(true);
    });
  });

  // ═══════════════════════════════════════
  // generateSajuFactorKeys
  // ═══════════════════════════════════════
  describe('generateSajuFactorKeys', () => {
    const baseInput = {
      dayMasterStem: '甲',
      yearBranch: '子',
      ganzhi: { stem: '丙', branch: '午', stemElement: '火' },
      date: new Date(2024, 5, 15),
      dayMasterElement: '木',
      relations: { generatedBy: '水', controls: '土', generates: '火', controlledBy: '金' },
    };

    it('should detect siksang relation (generates)', () => {
      const result = generateSajuFactorKeys(baseInput);
      // stemElement '火' === relations.generates '火'
      expect(result.sajuFactorKeys).toContain('stemSiksang');
      expect(result.titleKey).toBe('calendar.siksang');
    });

    it('should detect bijeon relation (same element)', () => {
      const result = generateSajuFactorKeys({
        ...baseInput,
        ganzhi: { stem: '乙', branch: '午', stemElement: '木' },
      });
      expect(result.sajuFactorKeys).toContain('stemBijeon');
      expect(result.categories).toContain('career');
    });

    it('should detect inseong relation (generatedBy)', () => {
      const result = generateSajuFactorKeys({
        ...baseInput,
        ganzhi: { stem: '壬', branch: '午', stemElement: '水' },
      });
      expect(result.sajuFactorKeys).toContain('stemInseong');
      expect(result.categories).toContain('study');
    });

    it('should detect jaeseong relation (controls)', () => {
      const result = generateSajuFactorKeys({
        ...baseInput,
        ganzhi: { stem: '戊', branch: '午', stemElement: '土' },
      });
      expect(result.sajuFactorKeys).toContain('stemJaeseong');
      expect(result.categories).toContain('wealth');
    });

    it('should detect gwansal relation (controlledBy)', () => {
      const result = generateSajuFactorKeys({
        ...baseInput,
        ganzhi: { stem: '庚', branch: '午', stemElement: '金' },
      });
      expect(result.sajuFactorKeys).toContain('stemGwansal');
      expect(result.warningKeys).toContain('avoidAuthority');
    });

    it('should detect neutral when no element relation matches', () => {
      const result = generateSajuFactorKeys({
        ...baseInput,
        dayMasterElement: '木',
        ganzhi: { stem: '甲', branch: '午', stemElement: 'UNKNOWN' },
        relations: { generatedBy: '水', controls: '土', generates: '火', controlledBy: '金' },
      });
      expect(result.sajuFactorKeys).toContain('stemNeutral');
    });

    it('should add cheoneulGwiin keys when flag is set', () => {
      (isCheoneulGwiin as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const result = generateSajuFactorKeys(baseInput);
      expect(result.sajuFactorKeys).toContain('cheoneulGwiin');
      expect(result.recommendationKeys).toContain('majorDecision');
      expect(result.titleKey).toBe('calendar.cheoneulGwiin');
    });

    it('should add sonEomneun keys when flag is set', () => {
      (isSonEomneunDay as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const result = generateSajuFactorKeys(baseInput);
      expect(result.sajuFactorKeys).toContain('sonEomneunDay');
      expect(result.recommendationKeys).toContain('moving');
    });

    it('should add geonrok keys when flag is set', () => {
      (isGeonrokDay as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const result = generateSajuFactorKeys(baseInput);
      expect(result.sajuFactorKeys).toContain('geonrokDay');
      expect(result.recommendationKeys).toContain('career');
    });

    it('should add samjae warning when flag is set', () => {
      (isSamjaeYear as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const result = generateSajuFactorKeys(baseInput);
      expect(result.sajuFactorKeys).toContain('samjaeYear');
      expect(result.warningKeys).toContain('samjae');
    });

    it('should add yeokma keys when flag is set', () => {
      (isYeokmaDay as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const result = generateSajuFactorKeys(baseInput);
      expect(result.sajuFactorKeys).toContain('yeokmaDay');
      expect(result.recommendationKeys).toContain('travel');
      expect(result.warningKeys).toContain('instability');
    });

    it('should add dohwa keys when flag is set', () => {
      (isDohwaDay as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const result = generateSajuFactorKeys(baseInput);
      expect(result.sajuFactorKeys).toContain('dohwaDay');
      expect(result.recommendationKeys).toContain('dating');
      expect(result.categories).toContain('love');
    });

    it('should process shinsal active results', () => {
      const result = generateSajuFactorKeys({
        ...baseInput,
        shinsalResult: {
          active: [
            { name: '태극귀인', type: 'lucky', affectedArea: 'general' },
            { name: '공망', type: 'unlucky', affectedArea: 'general' },
          ],
        },
      });
      expect(result.sajuFactorKeys).toContain('shinsal_taegukGwiin');
      expect(result.sajuFactorKeys).toContain('shinsal_gongmang');
      expect(result.recommendationKeys).toContain('majorLuck');
      expect(result.warningKeys).toContain('emptiness');
    });

    it('should handle all known shinsal names', () => {
      const result = generateSajuFactorKeys({
        ...baseInput,
        shinsalResult: {
          active: [
            { name: '천덕귀인', type: 'lucky', affectedArea: 'general' },
            { name: '월덕', type: 'lucky', affectedArea: 'general' },
            { name: '화개', type: 'special', affectedArea: 'spiritual' },
            { name: '원진', type: 'unlucky', affectedArea: 'relationship' },
            { name: '양인', type: 'unlucky', affectedArea: 'safety' },
            { name: '괴강', type: 'unlucky', affectedArea: 'emotion' },
            { name: '백호', type: 'unlucky', affectedArea: 'health' },
            { name: '귀문관', type: 'unlucky', affectedArea: 'mental' },
            { name: '역마', type: 'special', affectedArea: 'movement' },
            { name: '재살', type: 'unlucky', affectedArea: 'legal' },
          ],
        },
      });
      expect(result.sajuFactorKeys).toContain('shinsal_cheondeokGwiin');
      expect(result.sajuFactorKeys).toContain('shinsal_woldeokGwiin');
      expect(result.sajuFactorKeys).toContain('shinsal_hwagae');
      expect(result.sajuFactorKeys).toContain('shinsal_wonjin');
      expect(result.sajuFactorKeys).toContain('shinsal_yangin');
      expect(result.sajuFactorKeys).toContain('shinsal_goegang');
      expect(result.sajuFactorKeys).toContain('shinsal_backho');
      expect(result.sajuFactorKeys).toContain('shinsal_guimungwan');
      expect(result.sajuFactorKeys).toContain('shinsal_yeokma');
      expect(result.sajuFactorKeys).toContain('shinsal_jaesal');
    });
  });

  // ═══════════════════════════════════════
  // filterConflictingRecommendations
  // ═══════════════════════════════════════
  describe('filterConflictingRecommendations', () => {
    it('should remove travel when conflict warning', () => {
      const result = filterConflictingRecommendations(
        ['travel', 'change', 'study'], ['conflict']
      );
      expect(result).not.toContain('travel');
      expect(result).not.toContain('change');
      expect(result).toContain('study');
    });

    it('should remove contract when legal warning', () => {
      const result = filterConflictingRecommendations(
        ['contract', 'bigDecision', 'partnership', 'study'], ['legal']
      );
      expect(result).not.toContain('contract');
      expect(result).toContain('study');
    });

    it('should remove networking when betrayal warning', () => {
      const result = filterConflictingRecommendations(
        ['networking', 'socializing', 'career'], ['betrayal']
      );
      expect(result).not.toContain('networking');
      expect(result).toContain('career');
    });

    it('should remove authority when avoidAuthority warning', () => {
      const result = filterConflictingRecommendations(
        ['authority', 'promotion', 'interview', 'career'], ['avoidAuthority']
      );
      expect(result).not.toContain('authority');
      expect(result).toContain('career');
    });

    it('should remove communication items during mercury retrograde', () => {
      const result = filterConflictingRecommendations(
        ['contract', 'documents', 'interview', 'career'], ['mercuryRetrograde']
      );
      expect(result).not.toContain('contract');
      expect(result).toContain('career');
    });

    it('should remove love/finance during venus retrograde', () => {
      const result = filterConflictingRecommendations(
        ['dating', 'love', 'finance', 'investment', 'shopping', 'career'], ['venusRetrograde']
      );
      expect(result).toEqual(['career']);
    });

    it('should return all when no matching warnings', () => {
      const result = filterConflictingRecommendations(['career', 'study'], ['random']);
      expect(result).toEqual(['career', 'study']);
    });

    it('should not mutate original array', () => {
      const recs = ['travel', 'career'];
      filterConflictingRecommendations(recs, ['conflict']);
      expect(recs).toEqual(['travel', 'career']);
    });
  });

  // ═══════════════════════════════════════
  // generateAstroFactorKeys
  // ═══════════════════════════════════════
  describe('generateAstroFactorKeys', () => {
    const baseAstroInput = {
      transitSunElement: '木',
      natalSunElement: '木',
      lunarPhaseName: 'newMoon',
      moonPhaseDetailed: { phaseName: 'newMoon', score: 5, factorKey: 'moonNewMoon' },
      retrogradePlanets: [] as string[],
      voidOfCourse: { isVoid: false },
      eclipseImpact: { hasImpact: false },
      planetaryHour: { dayRuler: 'Sun' },
      solarReturnAnalysis: { isBirthday: false, daysFromBirthday: 100 },
      crossVerified: false,
      sajuNegative: false,
      astroNegative: false,
      sajuPositive: false,
      astroPositive: false,
      ganzhiStemElement: '木',
    };

    it('should detect same element', () => {
      const result = generateAstroFactorKeys(baseAstroInput);
      expect(result.astroFactorKeys).toContain('sameElement');
    });

    it('should detect support element', () => {
      const result = generateAstroFactorKeys({
        ...baseAstroInput, transitSunElement: '水',
      });
      expect(result.astroFactorKeys).toContain('supportElement');
    });

    it('should detect giving element', () => {
      const result = generateAstroFactorKeys({
        ...baseAstroInput, transitSunElement: '火',
      });
      expect(result.astroFactorKeys).toContain('givingElement');
    });

    it('should detect conflict element', () => {
      const result = generateAstroFactorKeys({
        ...baseAstroInput, transitSunElement: '金',
      });
      expect(result.astroFactorKeys).toContain('conflictElement');
      expect(result.warningKeys).toContain('stress');
    });

    it('should detect control element', () => {
      const result = generateAstroFactorKeys({
        ...baseAstroInput, transitSunElement: '土',
      });
      expect(result.astroFactorKeys).toContain('controlElement');
    });

    it('should detect new moon', () => {
      const result = generateAstroFactorKeys(baseAstroInput);
      expect(result.astroFactorKeys).toContain('lunarNewMoon');
      expect(result.recommendationKeys).toContain('newBeginning');
    });

    it('should detect full moon', () => {
      const result = generateAstroFactorKeys({
        ...baseAstroInput, lunarPhaseName: 'fullMoon',
      });
      expect(result.astroFactorKeys).toContain('lunarFullMoon');
      expect(result.recommendationKeys).toContain('completion');
    });

    it('should detect first quarter', () => {
      const result = generateAstroFactorKeys({
        ...baseAstroInput, lunarPhaseName: 'firstQuarter',
      });
      expect(result.astroFactorKeys).toContain('lunarFirstQuarter');
      expect(result.warningKeys).toContain('tension');
    });

    it('should detect last quarter', () => {
      const result = generateAstroFactorKeys({
        ...baseAstroInput, lunarPhaseName: 'lastQuarter',
      });
      expect(result.astroFactorKeys).toContain('lunarLastQuarter');
    });

    it('should set astroPositive when moon score > 10', () => {
      const result = generateAstroFactorKeys({
        ...baseAstroInput,
        moonPhaseDetailed: { phaseName: 'full', score: 15, factorKey: 'moonFull' },
      });
      expect(result.astroPositive).toBe(true);
    });

    it('should set astroNegative when moon score < -2', () => {
      const result = generateAstroFactorKeys({
        ...baseAstroInput,
        moonPhaseDetailed: { phaseName: 'dark', score: -5, factorKey: 'moonDark' },
      });
      expect(result.astroNegative).toBe(true);
    });

    it('should add retrograde planet keys', () => {
      const result = generateAstroFactorKeys({
        ...baseAstroInput,
        retrogradePlanets: ['mercury', 'venus', 'mars'],
      });
      expect(result.astroFactorKeys).toContain('retrogradeMercury');
      expect(result.warningKeys).toContain('mercuryRetrograde');
      expect(result.warningKeys).toContain('venusRetrograde');
      expect(result.warningKeys).toContain('marsRetrograde');
    });

    it('should detect void of course', () => {
      const result = generateAstroFactorKeys({
        ...baseAstroInput, voidOfCourse: { isVoid: true },
      });
      expect(result.astroFactorKeys).toContain('voidOfCourse');
    });

    it('should detect eclipse with strong intensity', () => {
      const result = generateAstroFactorKeys({
        ...baseAstroInput,
        eclipseImpact: { hasImpact: true, type: 'solar', intensity: 'strong' },
      });
      expect(result.warningKeys).toContain('eclipseDay');
    });

    it('should detect eclipse with medium intensity', () => {
      const result = generateAstroFactorKeys({
        ...baseAstroInput,
        eclipseImpact: { hasImpact: true, type: 'lunar', intensity: 'medium' },
      });
      expect(result.warningKeys).toContain('eclipseNear');
    });

    it('should add Jupiter day ruler bonus', () => {
      const result = generateAstroFactorKeys({
        ...baseAstroInput, planetaryHour: { dayRuler: 'Jupiter' },
      });
      expect(result.recommendationKeys).toContain('expansion');
    });

    it('should add Venus day ruler bonus', () => {
      const result = generateAstroFactorKeys({
        ...baseAstroInput, planetaryHour: { dayRuler: 'Venus' },
      });
      expect(result.recommendationKeys).toContain('love');
    });

    it('should detect cross verified', () => {
      const result = generateAstroFactorKeys({
        ...baseAstroInput, crossVerified: true,
      });
      expect(result.astroFactorKeys).toContain('crossVerified');
    });

    it('should detect cross negative', () => {
      const result = generateAstroFactorKeys({
        ...baseAstroInput, sajuNegative: true, astroNegative: true,
      });
      expect(result.astroFactorKeys).toContain('crossNegative');
      expect(result.warningKeys).toContain('extremeCaution');
    });

    it('should detect aligned element', () => {
      const result = generateAstroFactorKeys({
        ...baseAstroInput, ganzhiStemElement: '木', transitSunElement: '木',
      });
      expect(result.astroFactorKeys).toContain('alignedElement');
    });

    it('should detect mixed signals', () => {
      const result = generateAstroFactorKeys({
        ...baseAstroInput, sajuPositive: true, astroNegative: true,
      });
      expect(result.astroFactorKeys).toContain('mixedSignals');
      expect(result.warningKeys).toContain('confusion');
    });
  });
});
