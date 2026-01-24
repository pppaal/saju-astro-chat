/**
 * Saju Factor Builder Tests
 * 사주 요소 키 생성 모듈 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import {
  buildSajuFactorKeys,
  type SajuFactorBuilderInput,
  type SajuFactorBuilderResult,
} from '@/lib/destiny-map/calendar/builders/saju-factor-builder';
import type { BranchInteraction } from '@/lib/prediction/advancedTimingEngine';

// Mock getSipsin
vi.mock('@/lib/destiny-map/calendar/utils', () => ({
  getSipsin: vi.fn((dayMaster: string, targetStem: string) => {
    if (dayMaster === targetStem) return '비견';
    if (dayMaster === '甲' && targetStem === '丙') return '식신';
    if (dayMaster === '甲' && targetStem === '戊') return '편재';
    if (dayMaster === '甲' && targetStem === '庚') return '편관';
    if (dayMaster === '甲' && targetStem === '壬') return '편인';
    return '비견';
  }),
}));

describe('SajuFactorBuilder', () => {
  // Create default input
  const createDefaultInput = (overrides: Partial<SajuFactorBuilderInput> = {}): SajuFactorBuilderInput => ({
    ganzhi: { stem: '甲', branch: '子' },
    dayMasterStem: '甲',
    dayBranch: '寅',
    dayMasterElement: 'wood',
    relations: {
      generates: 'fire',
      generatedBy: 'water',
      controls: 'earth',
      controlledBy: 'metal',
    },
    specialFlags: {
      hasCheoneulGwiin: false,
      hasSonEomneun: false,
      hasGeonrok: false,
      isSamjaeYear: false,
      hasYeokma: false,
      hasDohwa: false,
    },
    branchInteractions: [],
    shinsalActive: [],
    daeunFactorKeys: [],
    seunFactorKeys: [],
    wolunFactorKeys: [],
    iljinFactorKeys: [],
    yongsinFactorKeys: [],
    geokgukFactorKeys: [],
    ...overrides,
  });

  describe('buildSajuFactorKeys', () => {
    describe('basic functionality', () => {
      it('should return factorKeys array', () => {
        const input = createDefaultInput();
        const result = buildSajuFactorKeys(input);

        expect(result).toHaveProperty('factorKeys');
        expect(Array.isArray(result.factorKeys)).toBe(true);
      });

      it('should return empty array when no factors detected', () => {
        const input = createDefaultInput({
          ganzhi: { stem: 'X', branch: 'Y' }, // Unknown values
          dayMasterStem: '',
          dayBranch: '',
        });
        const result = buildSajuFactorKeys(input);

        // Should have minimal or no factors
        expect(Array.isArray(result.factorKeys)).toBe(true);
      });
    });

    describe('branch interactions', () => {
      it('should add advanced interaction keys', () => {
        const branchInteractions: BranchInteraction[] = [
          { type: '육합', branches: ['子', '丑'], impact: 'positive', score: 15, description: 'test' },
          { type: '삼합', branches: ['申', '子', '辰'], impact: 'positive', score: 20, description: 'test' },
        ];
        const input = createDefaultInput({ branchInteractions });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('advanced_육합');
        expect(result.factorKeys).toContain('advanced_삼합');
      });

      it('should add chung interaction key', () => {
        const branchInteractions: BranchInteraction[] = [
          { type: '충', branches: ['子', '午'], impact: 'negative', score: -20, description: 'test' },
        ];
        const input = createDefaultInput({ branchInteractions });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('advanced_충');
      });
    });

    describe('special flags', () => {
      it('should add cheoneulGwiin key when flag is true', () => {
        const input = createDefaultInput({
          specialFlags: {
            hasCheoneulGwiin: true,
            hasSonEomneun: false,
            hasGeonrok: false,
            isSamjaeYear: false,
            hasYeokma: false,
            hasDohwa: false,
          },
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('cheoneulGwiin');
      });

      it('should add sonEomneunDay key when flag is true', () => {
        const input = createDefaultInput({
          specialFlags: {
            hasCheoneulGwiin: false,
            hasSonEomneun: true,
            hasGeonrok: false,
            isSamjaeYear: false,
            hasYeokma: false,
            hasDohwa: false,
          },
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('sonEomneunDay');
      });

      it('should add geonrokDay key when flag is true', () => {
        const input = createDefaultInput({
          specialFlags: {
            hasCheoneulGwiin: false,
            hasSonEomneun: false,
            hasGeonrok: true,
            isSamjaeYear: false,
            hasYeokma: false,
            hasDohwa: false,
          },
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('geonrokDay');
      });

      it('should add samjaeYear key when flag is true', () => {
        const input = createDefaultInput({
          specialFlags: {
            hasCheoneulGwiin: false,
            hasSonEomneun: false,
            hasGeonrok: false,
            isSamjaeYear: true,
            hasYeokma: false,
            hasDohwa: false,
          },
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('samjaeYear');
      });

      it('should add yeokmaDay key when flag is true', () => {
        const input = createDefaultInput({
          specialFlags: {
            hasCheoneulGwiin: false,
            hasSonEomneun: false,
            hasGeonrok: false,
            isSamjaeYear: false,
            hasYeokma: true,
            hasDohwa: false,
          },
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('yeokmaDay');
      });

      it('should add dohwaDay key when flag is true', () => {
        const input = createDefaultInput({
          specialFlags: {
            hasCheoneulGwiin: false,
            hasSonEomneun: false,
            hasGeonrok: false,
            isSamjaeYear: false,
            hasYeokma: false,
            hasDohwa: true,
          },
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('dohwaDay');
      });

      it('should add multiple flags when multiple are true', () => {
        const input = createDefaultInput({
          specialFlags: {
            hasCheoneulGwiin: true,
            hasSonEomneun: true,
            hasGeonrok: true,
            isSamjaeYear: false,
            hasYeokma: true,
            hasDohwa: false,
          },
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('cheoneulGwiin');
        expect(result.factorKeys).toContain('sonEomneunDay');
        expect(result.factorKeys).toContain('geonrokDay');
        expect(result.factorKeys).toContain('yeokmaDay');
      });
    });

    describe('shinsal analysis', () => {
      it('should add taegukGwiin key', () => {
        const input = createDefaultInput({
          shinsalActive: [{ name: '태극귀인', type: 'lucky' }],
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('shinsal_taegukGwiin');
      });

      it('should add cheondeokGwiin key for 천덕귀인', () => {
        const input = createDefaultInput({
          shinsalActive: [{ name: '천덕귀인', type: 'lucky' }],
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('shinsal_cheondeokGwiin');
      });

      it('should add cheondeokGwiin key for 천덕 (alias)', () => {
        const input = createDefaultInput({
          shinsalActive: [{ name: '천덕', type: 'lucky' }],
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('shinsal_cheondeokGwiin');
      });

      it('should add hwagae key', () => {
        const input = createDefaultInput({
          shinsalActive: [{ name: '화개', type: 'mixed' }],
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('shinsal_hwagae');
      });

      it('should add gongmang key', () => {
        const input = createDefaultInput({
          shinsalActive: [{ name: '공망', type: 'unlucky' }],
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('shinsal_gongmang');
      });

      it('should add multiple shinsal keys', () => {
        const input = createDefaultInput({
          shinsalActive: [
            { name: '천덕', type: 'lucky' },
            { name: '역마', type: 'mixed' },
            { name: '화개', type: 'mixed' },
          ],
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('shinsal_cheondeokGwiin');
        expect(result.factorKeys).toContain('shinsal_yeokma');
        expect(result.factorKeys).toContain('shinsal_hwagae');
      });

      it('should handle all known shinsal types', () => {
        const shinsals = [
          { name: '태극귀인', expected: 'shinsal_taegukGwiin' },
          { name: '천덕귀인', expected: 'shinsal_cheondeokGwiin' },
          { name: '월덕귀인', expected: 'shinsal_woldeokGwiin' },
          { name: '화개', expected: 'shinsal_hwagae' },
          { name: '공망', expected: 'shinsal_gongmang' },
          { name: '원진', expected: 'shinsal_wonjin' },
          { name: '양인', expected: 'shinsal_yangin' },
          { name: '괴강', expected: 'shinsal_goegang' },
          { name: '백호', expected: 'shinsal_backho' },
          { name: '귀문관', expected: 'shinsal_guimungwan' },
          { name: '역마', expected: 'shinsal_yeokma' },
          { name: '재살', expected: 'shinsal_jaesal' },
        ];

        shinsals.forEach(({ name, expected }) => {
          const input = createDefaultInput({
            shinsalActive: [{ name, type: 'test' }],
          });
          const result = buildSajuFactorKeys(input);

          expect(result.factorKeys).toContain(expected);
        });
      });
    });

    describe('sipsin analysis', () => {
      it('should add sipsin key when dayMasterStem is provided', () => {
        const input = createDefaultInput({
          dayMasterStem: '甲',
          ganzhi: { stem: '甲', branch: '子' },
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys.some((k) => k.startsWith('sipsin_'))).toBe(true);
      });

      it('should not add sipsin key when dayMasterStem is empty', () => {
        const input = createDefaultInput({
          dayMasterStem: '',
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys.filter((k) => k.startsWith('sipsin_')).length).toBe(0);
      });
    });

    describe('stem relations', () => {
      it('should add stemBijeon when stem matches dayMasterElement', () => {
        const input = createDefaultInput({
          ganzhi: { stem: 'wood', branch: '子' },
          dayMasterElement: 'wood',
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('stemBijeon');
      });

      it('should add stemInseong when stem matches generatedBy', () => {
        const input = createDefaultInput({
          ganzhi: { stem: 'water', branch: '子' },
          dayMasterElement: 'wood',
          relations: {
            generates: 'fire',
            generatedBy: 'water',
            controls: 'earth',
            controlledBy: 'metal',
          },
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('stemInseong');
      });

      it('should add stemJaeseong when stem matches controls', () => {
        const input = createDefaultInput({
          ganzhi: { stem: 'earth', branch: '子' },
          dayMasterElement: 'wood',
          relations: {
            generates: 'fire',
            generatedBy: 'water',
            controls: 'earth',
            controlledBy: 'metal',
          },
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('stemJaeseong');
      });

      it('should add stemSiksang when stem matches generates', () => {
        const input = createDefaultInput({
          ganzhi: { stem: 'fire', branch: '子' },
          dayMasterElement: 'wood',
          relations: {
            generates: 'fire',
            generatedBy: 'water',
            controls: 'earth',
            controlledBy: 'metal',
          },
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('stemSiksang');
      });

      it('should add stemGwansal when stem matches controlledBy', () => {
        const input = createDefaultInput({
          ganzhi: { stem: 'metal', branch: '子' },
          dayMasterElement: 'wood',
          relations: {
            generates: 'fire',
            generatedBy: 'water',
            controls: 'earth',
            controlledBy: 'metal',
          },
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('stemGwansal');
      });
    });

    describe('branch relations', () => {
      it('should add branchYukhap when branches form 육합', () => {
        // 子-丑 is a 육합 pair
        const input = createDefaultInput({
          dayBranch: '子',
          ganzhi: { stem: '甲', branch: '丑' },
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('branchYukhap');
      });

      it('should add branchChung when branches form 충', () => {
        // 子-午 is a 충 pair
        const input = createDefaultInput({
          dayBranch: '子',
          ganzhi: { stem: '甲', branch: '午' },
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('branchChung');
      });

      it('should add branchHai when branches form 해', () => {
        // 子-未 is a 해 pair
        const input = createDefaultInput({
          dayBranch: '子',
          ganzhi: { stem: '甲', branch: '未' },
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('branchHai');
      });
    });

    describe('time-based factor keys', () => {
      it('should include daeun factor keys', () => {
        const input = createDefaultInput({
          daeunFactorKeys: ['daeun_positive', 'daeun_wood'],
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('daeun_positive');
        expect(result.factorKeys).toContain('daeun_wood');
      });

      it('should include seun factor keys', () => {
        const input = createDefaultInput({
          seunFactorKeys: ['seun_fire', 'seun_clash'],
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('seun_fire');
        expect(result.factorKeys).toContain('seun_clash');
      });

      it('should include wolun factor keys', () => {
        const input = createDefaultInput({
          wolunFactorKeys: ['wolun_harmony'],
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('wolun_harmony');
      });

      it('should include iljin factor keys', () => {
        const input = createDefaultInput({
          iljinFactorKeys: ['iljin_good'],
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('iljin_good');
      });

      it('should include yongsin factor keys', () => {
        const input = createDefaultInput({
          yongsinFactorKeys: ['yongsin_match'],
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('yongsin_match');
      });

      it('should include geokguk factor keys', () => {
        const input = createDefaultInput({
          geokgukFactorKeys: ['geokguk_active'],
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('geokguk_active');
      });

      it('should combine all time-based factor keys', () => {
        const input = createDefaultInput({
          daeunFactorKeys: ['daeun_1'],
          seunFactorKeys: ['seun_1'],
          wolunFactorKeys: ['wolun_1'],
          iljinFactorKeys: ['iljin_1'],
          yongsinFactorKeys: ['yongsin_1'],
          geokgukFactorKeys: ['geokguk_1'],
        });
        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('daeun_1');
        expect(result.factorKeys).toContain('seun_1');
        expect(result.factorKeys).toContain('wolun_1');
        expect(result.factorKeys).toContain('iljin_1');
        expect(result.factorKeys).toContain('yongsin_1');
        expect(result.factorKeys).toContain('geokguk_1');
      });
    });

    describe('comprehensive input', () => {
      it('should handle full input with all factors', () => {
        const input = createDefaultInput({
          ganzhi: { stem: '甲', branch: '子' },
          dayMasterStem: '甲',
          dayBranch: '子',
          dayMasterElement: 'wood',
          specialFlags: {
            hasCheoneulGwiin: true,
            hasSonEomneun: false,
            hasGeonrok: true,
            isSamjaeYear: false,
            hasYeokma: true,
            hasDohwa: false,
          },
          branchInteractions: [
            { type: '육합', branches: ['子', '丑'], impact: 'positive', score: 15, description: 'test' },
          ],
          shinsalActive: [
            { name: '천덕', type: 'lucky' },
            { name: '역마', type: 'mixed' },
          ],
          daeunFactorKeys: ['daeun_wood'],
          seunFactorKeys: ['seun_fire'],
          wolunFactorKeys: [],
          iljinFactorKeys: [],
          yongsinFactorKeys: ['yongsin_match'],
          geokgukFactorKeys: [],
        });

        const result = buildSajuFactorKeys(input);

        expect(result.factorKeys).toContain('cheoneulGwiin');
        expect(result.factorKeys).toContain('geonrokDay');
        expect(result.factorKeys).toContain('yeokmaDay');
        expect(result.factorKeys).toContain('advanced_육합');
        expect(result.factorKeys).toContain('shinsal_cheondeokGwiin');
        expect(result.factorKeys).toContain('shinsal_yeokma');
        expect(result.factorKeys).toContain('daeun_wood');
        expect(result.factorKeys).toContain('seun_fire');
        expect(result.factorKeys).toContain('yongsin_match');
      });
    });
  });
});
