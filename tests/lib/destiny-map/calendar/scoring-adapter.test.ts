import { describe, it, expect } from 'vitest';
import {
  adaptDaeunResult,
  adaptSeunResult,
  adaptWolunResult,
  adaptIljinResult,
  adaptYongsinResult,
  adaptPlanetTransits,
  getElementRelation,
  type LegacyAnalysisResult,
  type LegacyYongsinResult,
  type LegacyGeokgukResult,
  type LegacyPlanetTransitsResult,
  type LegacyBranchInteraction,
  type ShinsalAnalysisResult,
  type EclipseImpact,
} from '@/lib/destiny-map/calendar/scoring-adapter';

describe('scoring-adapter', () => {
  describe('adaptDaeunResult', () => {
    it('should adapt inseong factor', () => {
      const result: LegacyAnalysisResult = {
        score: 10,
        factorKeys: ['Inseong'],
        positive: true,
        negative: false,
      };
      const adapted = adaptDaeunResult(result);
      expect(adapted.sibsin).toBe('inseong');
    });

    it('should adapt Korean inseong factor', () => {
      const result: LegacyAnalysisResult = {
        score: 10,
        factorKeys: ['인성'],
        positive: true,
        negative: false,
      };
      const adapted = adaptDaeunResult(result);
      expect(adapted.sibsin).toBe('inseong');
    });

    it('should adapt jaeseong factor', () => {
      const result: LegacyAnalysisResult = {
        score: 10,
        factorKeys: ['Jaeseong'],
        positive: true,
        negative: false,
      };
      const adapted = adaptDaeunResult(result);
      expect(adapted.sibsin).toBe('jaeseong');
    });

    it('should adapt bijeon factor', () => {
      const result: LegacyAnalysisResult = {
        score: 10,
        factorKeys: ['Bijeon'],
        positive: true,
        negative: false,
      };
      const adapted = adaptDaeunResult(result);
      expect(adapted.sibsin).toBe('bijeon');
    });

    it('should adapt siksang factor', () => {
      const result: LegacyAnalysisResult = {
        score: 10,
        factorKeys: ['Siksang'],
        positive: true,
        negative: false,
      };
      const adapted = adaptDaeunResult(result);
      expect(adapted.sibsin).toBe('siksang');
    });

    it('should detect gwansal', () => {
      const result: LegacyAnalysisResult = {
        score: -5,
        factorKeys: ['Gwansal'],
        positive: false,
        negative: true,
      };
      const adapted = adaptDaeunResult(result);
      expect(adapted.hasGwansal).toBe(true);
    });

    it('should detect yukhap', () => {
      const result: LegacyAnalysisResult = {
        score: 5,
        factorKeys: ['yukhap'],
        positive: true,
        negative: false,
      };
      const adapted = adaptDaeunResult(result);
      expect(adapted.hasYukhap).toBe(true);
    });

    it('should detect positive samhap', () => {
      const result: LegacyAnalysisResult = {
        score: 8,
        factorKeys: ['samhap'],
        positive: true,
        negative: false,
      };
      const adapted = adaptDaeunResult(result);
      expect(adapted.hasSamhapPositive).toBe(true);
    });

    it('should detect negative samhap', () => {
      const result: LegacyAnalysisResult = {
        score: -8,
        factorKeys: ['samhap'],
        positive: false,
        negative: true,
      };
      const adapted = adaptDaeunResult(result);
      expect(adapted.hasSamhapNegative).toBe(true);
    });

    it('should detect chung', () => {
      const result: LegacyAnalysisResult = {
        score: -10,
        factorKeys: ['chung'],
        positive: false,
        negative: true,
      };
      const adapted = adaptDaeunResult(result);
      expect(adapted.hasChung).toBe(true);
    });

    it('should handle empty factorKeys', () => {
      const result: LegacyAnalysisResult = {
        score: 0,
        factorKeys: [],
        positive: false,
        negative: false,
      };
      const adapted = adaptDaeunResult(result);
      expect(adapted).toEqual({});
    });

    it('should handle multiple factors', () => {
      const result: LegacyAnalysisResult = {
        score: 10,
        factorKeys: ['Inseong', 'yukhap', 'samhap'],
        positive: true,
        negative: false,
      };
      const adapted = adaptDaeunResult(result);
      expect(adapted.sibsin).toBe('inseong');
      expect(adapted.hasYukhap).toBe(true);
      expect(adapted.hasSamhapPositive).toBe(true);
    });
  });

  describe('adaptSeunResult', () => {
    it('should handle samjae year without gwiin', () => {
      const result: LegacyAnalysisResult = {
        score: -5,
        factorKeys: [],
        positive: false,
        negative: false,
      };
      const adapted = adaptSeunResult(result, true, false);
      expect(adapted.isSamjaeYear).toBe(true);
      expect(adapted.hasGwiin).toBe(false);
    });

    it('should handle samjae year with gwiin', () => {
      const result: LegacyAnalysisResult = {
        score: 0,
        factorKeys: [],
        positive: false,
        negative: false,
      };
      const adapted = adaptSeunResult(result, true, true);
      expect(adapted.isSamjaeYear).toBe(true);
      expect(adapted.hasGwiin).toBe(true);
    });

    it('should handle non-samjae year', () => {
      const result: LegacyAnalysisResult = {
        score: 5,
        factorKeys: ['Inseong'],
        positive: true,
        negative: false,
      };
      const adapted = adaptSeunResult(result, false, false);
      expect(adapted.isSamjaeYear).toBe(false);
      expect(adapted.sibsin).toBe('inseong');
    });

    it('should handle undefined samjae parameters', () => {
      const result: LegacyAnalysisResult = {
        score: 5,
        factorKeys: ['Jaeseong'],
        positive: true,
        negative: false,
      };
      const adapted = adaptSeunResult(result);
      expect(adapted.isSamjaeYear).toBeUndefined();
      expect(adapted.hasGwiin).toBeUndefined();
      expect(adapted.sibsin).toBe('jaeseong');
    });
  });

  describe('adaptWolunResult', () => {
    it('should adapt all sibsin types', () => {
      const result: LegacyAnalysisResult = {
        score: 10,
        factorKeys: ['Inseong'],
        positive: true,
        negative: false,
      };
      const adapted = adaptWolunResult(result);
      expect(adapted.sibsin).toBe('inseong');
    });

    it('should handle Korean factor keys', () => {
      const result: LegacyAnalysisResult = {
        score: 10,
        factorKeys: ['재성', '육합'],
        positive: true,
        negative: false,
      };
      const adapted = adaptWolunResult(result);
      expect(adapted.sibsin).toBe('jaeseong');
      expect(adapted.hasYukhap).toBe(true);
    });
  });

  describe('adaptIljinResult', () => {
    it('should detect cheoneul gwiin', () => {
      const result: LegacyAnalysisResult = {
        score: 15,
        factorKeys: [],
        positive: true,
        negative: false,
      };
      const adapted = adaptIljinResult(result, { hasCheoneulGwiin: true });
      expect(adapted.hasCheoneulGwiin).toBe(true);
    });

    it('should detect geonrok', () => {
      const result: LegacyAnalysisResult = {
        score: 10,
        factorKeys: [],
        positive: true,
        negative: false,
      };
      const adapted = adaptIljinResult(result, { hasGeonrok: true });
      expect(adapted.hasGeonrok).toBe(true);
    });

    it('should detect son eomneun', () => {
      const result: LegacyAnalysisResult = {
        score: 8,
        factorKeys: [],
        positive: true,
        negative: false,
      };
      const adapted = adaptIljinResult(result, { hasSonEomneun: true });
      expect(adapted.hasSonEomneun).toBe(true);
    });

    it('should detect yeokma', () => {
      const result: LegacyAnalysisResult = {
        score: 5,
        factorKeys: [],
        positive: true,
        negative: false,
      };
      const adapted = adaptIljinResult(result, { hasYeokma: true });
      expect(adapted.hasYeokma).toBe(true);
    });

    it('should detect dohwa', () => {
      const result: LegacyAnalysisResult = {
        score: 5,
        factorKeys: [],
        positive: true,
        negative: false,
      };
      const adapted = adaptIljinResult(result, { hasDohwa: true });
      expect(adapted.hasDohwa).toBe(true);
    });

    it('should detect taeguk gwiin from shinsal', () => {
      const result: LegacyAnalysisResult = {
        score: 10,
        factorKeys: [],
        positive: true,
        negative: false,
      };
      const shinsalResult: ShinsalAnalysisResult = {
        active: [{ name: '태극귀인', type: 'lucky', affectedArea: 'general' }],
      };
      const adapted = adaptIljinResult(result, { shinsalResult });
      expect(adapted.hasTaegukGwiin).toBe(true);
    });

    it('should detect cheondek gwiin from shinsal', () => {
      const result: LegacyAnalysisResult = {
        score: 10,
        factorKeys: [],
        positive: true,
        negative: false,
      };
      const shinsalResult: ShinsalAnalysisResult = {
        active: [{ name: '천덕귀인', type: 'lucky', affectedArea: 'general' }],
      };
      const adapted = adaptIljinResult(result, { shinsalResult });
      expect(adapted.hasCheondeokGwiin).toBe(true);
    });

    it('should detect woldeok gwiin from shinsal', () => {
      const result: LegacyAnalysisResult = {
        score: 10,
        factorKeys: [],
        positive: true,
        negative: false,
      };
      const shinsalResult: ShinsalAnalysisResult = {
        active: [{ name: '월덕귀인', type: 'lucky', affectedArea: 'general' }],
      };
      const adapted = adaptIljinResult(result, { shinsalResult });
      expect(adapted.hasWoldeokGwiin).toBe(true);
    });

    it('should detect hwagae from shinsal', () => {
      const result: LegacyAnalysisResult = {
        score: 5,
        factorKeys: [],
        positive: true,
        negative: false,
      };
      const shinsalResult: ShinsalAnalysisResult = {
        active: [{ name: '화개', type: 'special', affectedArea: 'spiritual' }],
      };
      const adapted = adaptIljinResult(result, { shinsalResult });
      expect(adapted.hasHwagae).toBe(true);
    });

    it('should detect gongmang from shinsal', () => {
      const result: LegacyAnalysisResult = {
        score: -10,
        factorKeys: [],
        positive: false,
        negative: true,
      };
      const shinsalResult: ShinsalAnalysisResult = {
        active: [{ name: '공망', type: 'unlucky', affectedArea: 'general' }],
      };
      const adapted = adaptIljinResult(result, { shinsalResult });
      expect(adapted.hasGongmang).toBe(true);
    });

    it('should detect wonjin from shinsal', () => {
      const result: LegacyAnalysisResult = {
        score: -8,
        factorKeys: [],
        positive: false,
        negative: true,
      };
      const shinsalResult: ShinsalAnalysisResult = {
        active: [{ name: '원진', type: 'unlucky', affectedArea: 'relationships' }],
      };
      const adapted = adaptIljinResult(result, { shinsalResult });
      expect(adapted.hasWonjin).toBe(true);
    });

    it('should detect yangin from shinsal', () => {
      const result: LegacyAnalysisResult = {
        score: -8,
        factorKeys: [],
        positive: false,
        negative: true,
      };
      const shinsalResult: ShinsalAnalysisResult = {
        active: [{ name: '양인', type: 'unlucky', affectedArea: 'danger' }],
      };
      const adapted = adaptIljinResult(result, { shinsalResult });
      expect(adapted.hasYangin).toBe(true);
    });

    it('should detect goegang from shinsal', () => {
      const result: LegacyAnalysisResult = {
        score: -6,
        factorKeys: [],
        positive: false,
        negative: true,
      };
      const shinsalResult: ShinsalAnalysisResult = {
        active: [{ name: '괴강', type: 'unlucky', affectedArea: 'extreme' }],
      };
      const adapted = adaptIljinResult(result, { shinsalResult });
      expect(adapted.hasGoegang).toBe(true);
    });

    it('should detect backho from shinsal', () => {
      const result: LegacyAnalysisResult = {
        score: -8,
        factorKeys: [],
        positive: false,
        negative: true,
      };
      const shinsalResult: ShinsalAnalysisResult = {
        active: [{ name: '백호', type: 'unlucky', affectedArea: 'accident' }],
      };
      const adapted = adaptIljinResult(result, { shinsalResult });
      expect(adapted.hasBackho).toBe(true);
    });

    it('should detect guimungwan from shinsal', () => {
      const result: LegacyAnalysisResult = {
        score: -10,
        factorKeys: [],
        positive: false,
        negative: true,
      };
      const shinsalResult: ShinsalAnalysisResult = {
        active: [{ name: '귀문관', type: 'unlucky', affectedArea: 'mental' }],
      };
      const adapted = adaptIljinResult(result, { shinsalResult });
      expect(adapted.hasGuimungwan).toBe(true);
    });

    it('should detect jeongyin from factorKeys', () => {
      const result: LegacyAnalysisResult = {
        score: 10,
        factorKeys: ['jeongyin'],
        positive: true,
        negative: false,
      };
      const adapted = adaptIljinResult(result);
      expect(adapted.sibsin).toBe('jeongyin');
    });

    it('should detect pyeonyin from factorKeys', () => {
      const result: LegacyAnalysisResult = {
        score: 8,
        factorKeys: ['pyeonyin'],
        positive: true,
        negative: false,
      };
      const adapted = adaptIljinResult(result);
      expect(adapted.sibsin).toBe('pyeonyin');
    });

    it('should detect jeongchaae from factorKeys', () => {
      const result: LegacyAnalysisResult = {
        score: 10,
        factorKeys: ['jeongchaae'],
        positive: true,
        negative: false,
      };
      const adapted = adaptIljinResult(result);
      expect(adapted.sibsin).toBe('jeongchaae');
    });

    it('should detect pyeonchaae from factorKeys', () => {
      const result: LegacyAnalysisResult = {
        score: 8,
        factorKeys: ['pyeonchaae'],
        positive: true,
        negative: false,
      };
      const adapted = adaptIljinResult(result);
      expect(adapted.sibsin).toBe('pyeonchaae');
    });

    it('should detect sikshin from factorKeys', () => {
      const result: LegacyAnalysisResult = {
        score: 8,
        factorKeys: ['sikshin'],
        positive: true,
        negative: false,
      };
      const adapted = adaptIljinResult(result);
      expect(adapted.sibsin).toBe('sikshin');
    });

    it('should detect sanggwan from factorKeys', () => {
      const result: LegacyAnalysisResult = {
        score: -5,
        factorKeys: ['sanggwan'],
        positive: false,
        negative: true,
      };
      const adapted = adaptIljinResult(result);
      expect(adapted.sibsin).toBe('sanggwan');
    });

    it('should detect jeongwan from factorKeys', () => {
      const result: LegacyAnalysisResult = {
        score: 10,
        factorKeys: ['jeongwan'],
        positive: true,
        negative: false,
      };
      const adapted = adaptIljinResult(result);
      expect(adapted.sibsin).toBe('jeongwan');
    });

    it('should detect pyeonwan from factorKeys', () => {
      const result: LegacyAnalysisResult = {
        score: -8,
        factorKeys: ['pyeonwan'],
        positive: false,
        negative: true,
      };
      const adapted = adaptIljinResult(result);
      expect(adapted.sibsin).toBe('pyeonwan');
    });

    it('should detect bijeon from factorKeys', () => {
      const result: LegacyAnalysisResult = {
        score: 5,
        factorKeys: ['bijeon'],
        positive: true,
        negative: false,
      };
      const adapted = adaptIljinResult(result);
      expect(adapted.sibsin).toBe('bijeon');
    });

    it('should detect gyeobjae from factorKeys', () => {
      const result: LegacyAnalysisResult = {
        score: -5,
        factorKeys: ['gyeobjae'],
        positive: false,
        negative: true,
      };
      const adapted = adaptIljinResult(result);
      expect(adapted.sibsin).toBe('gyeobjae');
    });

    it('should detect yukhap from branch interactions', () => {
      const result: LegacyAnalysisResult = {
        score: 10,
        factorKeys: [],
        positive: true,
        negative: false,
      };
      const branchInteractions: LegacyBranchInteraction[] = [
        { type: '육합', impact: 'positive' },
      ];
      const adapted = adaptIljinResult(result, { branchInteractions });
      expect(adapted.hasYukhap).toBe(true);
    });

    it('should detect positive samhap from branch interactions', () => {
      const result: LegacyAnalysisResult = {
        score: 12,
        factorKeys: [],
        positive: true,
        negative: false,
      };
      const branchInteractions: LegacyBranchInteraction[] = [
        { type: '삼합', impact: 'positive', element: '木' },
      ];
      const adapted = adaptIljinResult(result, { branchInteractions });
      expect(adapted.hasSamhapPositive).toBe(true);
    });

    it('should detect negative samhap from branch interactions', () => {
      const result: LegacyAnalysisResult = {
        score: -8,
        factorKeys: [],
        positive: false,
        negative: true,
      };
      const branchInteractions: LegacyBranchInteraction[] = [
        { type: '삼합', impact: 'negative' },
      ];
      const adapted = adaptIljinResult(result, { branchInteractions });
      expect(adapted.hasSamhapNegative).toBe(true);
    });

    it('should detect chung from branch interactions', () => {
      const result: LegacyAnalysisResult = {
        score: -12,
        factorKeys: [],
        positive: false,
        negative: true,
      };
      const branchInteractions: LegacyBranchInteraction[] = [
        { type: '충', impact: 'negative' },
      ];
      const adapted = adaptIljinResult(result, { branchInteractions });
      expect(adapted.hasChung).toBe(true);
    });

    it('should detect xing from branch interactions', () => {
      const result: LegacyAnalysisResult = {
        score: -8,
        factorKeys: [],
        positive: false,
        negative: true,
      };
      const branchInteractions: LegacyBranchInteraction[] = [
        { type: '형', impact: 'negative' },
      ];
      const adapted = adaptIljinResult(result, { branchInteractions });
      expect(adapted.hasXing).toBe(true);
    });

    it('should detect hai from branch interactions', () => {
      const result: LegacyAnalysisResult = {
        score: -6,
        factorKeys: [],
        positive: false,
        negative: true,
      };
      const branchInteractions: LegacyBranchInteraction[] = [
        { type: '해', impact: 'negative' },
      ];
      const adapted = adaptIljinResult(result, { branchInteractions });
      expect(adapted.hasHai).toBe(true);
    });

    it('should handle multiple shinsal and branch interactions', () => {
      const result: LegacyAnalysisResult = {
        score: 15,
        factorKeys: ['jeongyin', 'yukhap'],
        positive: true,
        negative: false,
      };
      const shinsalResult: ShinsalAnalysisResult = {
        active: [
          { name: '태극귀인', type: 'lucky', affectedArea: 'general' },
          { name: '천덕귀인', type: 'lucky', affectedArea: 'general' },
        ],
      };
      const branchInteractions: LegacyBranchInteraction[] = [
        { type: '육합', impact: 'positive' },
        { type: '삼합', impact: 'positive', element: '木' },
      ];
      const adapted = adaptIljinResult(result, { shinsalResult, branchInteractions });
      expect(adapted.hasTaegukGwiin).toBe(true);
      expect(adapted.hasCheondeokGwiin).toBe(true);
      expect(adapted.sibsin).toBe('jeongyin');
      expect(adapted.hasYukhap).toBe(true);
      expect(adapted.hasSamhapPositive).toBe(true);
    });
  });

  describe('adaptYongsinResult', () => {
    it('should detect primary yongsin match', () => {
      const yongsinResult: LegacyYongsinResult = {
        score: 15,
        factorKeys: ['PrimaryMatch'],
        positive: true,
        negative: false,
      };
      const geokgukResult: LegacyGeokgukResult = {
        score: 0,
        factorKeys: [],
        positive: false,
        negative: false,
      };
      const adapted = adaptYongsinResult(yongsinResult, geokgukResult);
      expect(adapted.hasPrimaryMatch).toBe(true);
    });

    it('should detect secondary yongsin match', () => {
      const yongsinResult: LegacyYongsinResult = {
        score: 10,
        factorKeys: ['SecondaryMatch'],
        positive: true,
        negative: false,
      };
      const geokgukResult: LegacyGeokgukResult = {
        score: 0,
        factorKeys: [],
        positive: false,
        negative: false,
      };
      const adapted = adaptYongsinResult(yongsinResult, geokgukResult);
      expect(adapted.hasSecondaryMatch).toBe(true);
    });

    it('should detect branch yongsin match', () => {
      const yongsinResult: LegacyYongsinResult = {
        score: 12,
        factorKeys: ['BranchMatch'],
        positive: true,
        negative: false,
      };
      const geokgukResult: LegacyGeokgukResult = {
        score: 0,
        factorKeys: [],
        positive: false,
        negative: false,
      };
      const adapted = adaptYongsinResult(yongsinResult, geokgukResult);
      expect(adapted.hasBranchMatch).toBe(true);
    });

    it('should detect yongsin support', () => {
      const yongsinResult: LegacyYongsinResult = {
        score: 8,
        factorKeys: ['Support'],
        positive: true,
        negative: false,
      };
      const geokgukResult: LegacyGeokgukResult = {
        score: 0,
        factorKeys: [],
        positive: false,
        negative: false,
      };
      const adapted = adaptYongsinResult(yongsinResult, geokgukResult);
      expect(adapted.hasSupport).toBe(true);
    });

    it('should detect kibsin match', () => {
      const yongsinResult: LegacyYongsinResult = {
        score: -12,
        factorKeys: ['kibsin'],
        positive: false,
        negative: true,
      };
      const geokgukResult: LegacyGeokgukResult = {
        score: 0,
        factorKeys: [],
        positive: false,
        negative: false,
      };
      const adapted = adaptYongsinResult(yongsinResult, geokgukResult);
      expect(adapted.hasKibsinMatch).toBe(true);
    });

    it('should detect kibsin branch match', () => {
      const yongsinResult: LegacyYongsinResult = {
        score: -10,
        factorKeys: ['kibsinBranch'],
        positive: false,
        negative: true,
      };
      const geokgukResult: LegacyGeokgukResult = {
        score: 0,
        factorKeys: [],
        positive: false,
        negative: false,
      };
      const adapted = adaptYongsinResult(yongsinResult, geokgukResult);
      expect(adapted.hasKibsinBranch).toBe(true);
    });

    it('should detect yongsin harm', () => {
      const yongsinResult: LegacyYongsinResult = {
        score: -8,
        factorKeys: ['Harm'],
        positive: false,
        negative: true,
      };
      const geokgukResult: LegacyGeokgukResult = {
        score: 0,
        factorKeys: [],
        positive: false,
        negative: false,
      };
      const adapted = adaptYongsinResult(yongsinResult, geokgukResult);
      expect(adapted.hasHarm).toBe(true);
    });

    it('should detect geokguk favor', () => {
      const yongsinResult: LegacyYongsinResult = {
        score: 0,
        factorKeys: [],
        positive: false,
        negative: false,
      };
      const geokgukResult: LegacyGeokgukResult = {
        score: 10,
        factorKeys: ['Favor'],
        positive: true,
        negative: false,
      };
      const adapted = adaptYongsinResult(yongsinResult, geokgukResult);
      expect(adapted.geokgukFavor).toBe(true);
    });

    it('should detect geokguk avoid', () => {
      const yongsinResult: LegacyYongsinResult = {
        score: 0,
        factorKeys: [],
        positive: false,
        negative: false,
      };
      const geokgukResult: LegacyGeokgukResult = {
        score: -10,
        factorKeys: ['Avoid'],
        positive: false,
        negative: true,
      };
      const adapted = adaptYongsinResult(yongsinResult, geokgukResult);
      expect(adapted.geokgukAvoid).toBe(true);
    });

    it('should detect strength balance', () => {
      const yongsinResult: LegacyYongsinResult = {
        score: 0,
        factorKeys: [],
        positive: false,
        negative: false,
      };
      const geokgukResult: LegacyGeokgukResult = {
        score: 8,
        factorKeys: ['Balance'],
        positive: true,
        negative: false,
      };
      const adapted = adaptYongsinResult(yongsinResult, geokgukResult);
      expect(adapted.strengthBalance).toBe(true);
    });

    it('should detect strength imbalance', () => {
      const yongsinResult: LegacyYongsinResult = {
        score: 0,
        factorKeys: [],
        positive: false,
        negative: false,
      };
      const geokgukResult: LegacyGeokgukResult = {
        score: -5,
        factorKeys: ['strengthImbalance', 'Excess'],
        positive: false,
        negative: true,
      };
      const adapted = adaptYongsinResult(yongsinResult, geokgukResult);
      expect(adapted.strengthImbalance).toBe(true);
    });
  });

  describe('getElementRelation', () => {
    const elementRelations = {
      Wood: { generates: 'Fire', controls: 'Earth', generatedBy: 'Water', controlledBy: 'Metal' },
      Fire: { generates: 'Earth', controls: 'Metal', generatedBy: 'Wood', controlledBy: 'Water' },
      Earth: { generates: 'Metal', controls: 'Water', generatedBy: 'Fire', controlledBy: 'Wood' },
      Metal: { generates: 'Water', controls: 'Wood', generatedBy: 'Earth', controlledBy: 'Fire' },
      Water: { generates: 'Wood', controls: 'Fire', generatedBy: 'Metal', controlledBy: 'Earth' },
    };

    it('should return same when elements are identical', () => {
      expect(getElementRelation('Wood', 'Wood', elementRelations)).toBe('same');
      expect(getElementRelation('Fire', 'Fire', elementRelations)).toBe('same');
    });

    it('should return generatedBy when natal is generated by transit', () => {
      expect(getElementRelation('Wood', 'Water', elementRelations)).toBe('generatedBy');
      expect(getElementRelation('Fire', 'Wood', elementRelations)).toBe('generatedBy');
    });

    it('should return generates when natal generates transit', () => {
      expect(getElementRelation('Wood', 'Fire', elementRelations)).toBe('generates');
      expect(getElementRelation('Fire', 'Earth', elementRelations)).toBe('generates');
    });

    it('should return controlledBy when natal is controlled by transit', () => {
      expect(getElementRelation('Wood', 'Metal', elementRelations)).toBe('controlledBy');
      expect(getElementRelation('Fire', 'Water', elementRelations)).toBe('controlledBy');
    });

    it('should return controls when natal controls transit', () => {
      expect(getElementRelation('Wood', 'Earth', elementRelations)).toBe('controls');
      expect(getElementRelation('Fire', 'Metal', elementRelations)).toBe('controls');
    });

    it('should return undefined for non-existent natal element', () => {
      expect(getElementRelation('NonExistent', 'Fire', elementRelations)).toBeUndefined();
    });

    it('should handle all five elements correctly', () => {
      expect(getElementRelation('Earth', 'Fire', elementRelations)).toBe('generatedBy');
      expect(getElementRelation('Metal', 'Earth', elementRelations)).toBe('generatedBy');
      expect(getElementRelation('Water', 'Metal', elementRelations)).toBe('generatedBy');
    });
  });

  describe('adaptPlanetTransits', () => {
    it('should set void of course moon', () => {
      const transitResult: LegacyPlanetTransitsResult = {
        score: -5,
        factorKeys: [],
        positive: false,
        negative: false,
      };
      const result = adaptPlanetTransits(transitResult, { voidOfCourse: true });
      expect(result.transitMoon.isVoidOfCourse).toBe(true);
    });

    it('should set days from birthday', () => {
      const transitResult: LegacyPlanetTransitsResult = {
        score: 10,
        factorKeys: [],
        positive: true,
        negative: false,
      };
      const result = adaptPlanetTransits(transitResult, { daysFromBirthday: 0 });
      expect(result.solarReturn.daysFromBirthday).toBe(0);
    });

    it('should default days from birthday to 365', () => {
      const transitResult: LegacyPlanetTransitsResult = {
        score: 0,
        factorKeys: [],
        positive: false,
        negative: false,
      };
      const result = adaptPlanetTransits(transitResult);
      expect(result.solarReturn.daysFromBirthday).toBe(365);
    });

    it('should set transit sun element relation', () => {
      const transitResult: LegacyPlanetTransitsResult = {
        score: 5,
        factorKeys: [],
        positive: true,
        negative: false,
      };
      const elementRelations = {
        Wood: { generates: 'Fire', controls: 'Earth', generatedBy: 'Water', controlledBy: 'Metal' },
      };
      const result = adaptPlanetTransits(transitResult, {
        natalSunElement: 'Wood',
        transitSunElement: 'Water',
        elementRelations,
      });
      expect(result.transitSun.elementRelation).toBe('generatedBy');
    });

    it('should set transit moon element relation', () => {
      const transitResult: LegacyPlanetTransitsResult = {
        score: 5,
        factorKeys: [],
        positive: true,
        negative: false,
      };
      const elementRelations = {
        Wood: { generates: 'Fire', controls: 'Earth', generatedBy: 'Water', controlledBy: 'Metal' },
      };
      const result = adaptPlanetTransits(transitResult, {
        natalSunElement: 'Wood',
        transitMoonElement: 'Fire',
        elementRelations,
      });
      expect(result.transitMoon.elementRelation).toBe('generates');
    });

    it('should detect retrograde mercury', () => {
      const transitResult: LegacyPlanetTransitsResult = {
        score: -5,
        factorKeys: [],
        positive: false,
        negative: true,
      };
      const result = adaptPlanetTransits(transitResult, {
        retrogradePlanets: ['mercury'],
      });
      expect(result.majorPlanets.mercury?.isRetrograde).toBe(true);
    });

    it('should detect multiple retrograde planets', () => {
      const transitResult: LegacyPlanetTransitsResult = {
        score: -8,
        factorKeys: [],
        positive: false,
        negative: true,
      };
      const result = adaptPlanetTransits(transitResult, {
        retrogradePlanets: ['mercury', 'venus', 'mars'],
      });
      expect(result.majorPlanets.mercury?.isRetrograde).toBe(true);
      expect(result.majorPlanets.venus?.isRetrograde).toBe(true);
      expect(result.majorPlanets.mars?.isRetrograde).toBe(true);
    });

    it('should detect trine aspect from factorKeys', () => {
      const transitResult: LegacyPlanetTransitsResult = {
        score: 12,
        factorKeys: ['jupiter-trine'],
        positive: true,
        negative: false,
      };
      const result = adaptPlanetTransits(transitResult);
      expect(result.majorPlanets.jupiter?.aspect).toBe('trine');
    });

    it('should detect sextile aspect from factorKeys', () => {
      const transitResult: LegacyPlanetTransitsResult = {
        score: 8,
        factorKeys: ['venus-sextile'],
        positive: true,
        negative: false,
      };
      const result = adaptPlanetTransits(transitResult);
      expect(result.majorPlanets.venus?.aspect).toBe('sextile');
    });

    it('should detect square aspect from factorKeys', () => {
      const transitResult: LegacyPlanetTransitsResult = {
        score: -10,
        factorKeys: ['saturn-square'],
        positive: false,
        negative: true,
      };
      const result = adaptPlanetTransits(transitResult);
      expect(result.majorPlanets.saturn?.aspect).toBe('square');
    });

    it('should detect opposition aspect from factorKeys', () => {
      const transitResult: LegacyPlanetTransitsResult = {
        score: -8,
        factorKeys: ['mars-opposition'],
        positive: false,
        negative: true,
      };
      const result = adaptPlanetTransits(transitResult);
      expect(result.majorPlanets.mars?.aspect).toBe('opposition');
    });

    it('should detect conjunction aspect from factorKeys', () => {
      const transitResult: LegacyPlanetTransitsResult = {
        score: 10,
        factorKeys: ['jupiter-conjunction'],
        positive: true,
        negative: false,
      };
      const result = adaptPlanetTransits(transitResult);
      expect(result.majorPlanets.jupiter?.aspect).toBe('conjunction');
    });

    it('should map new moon phase', () => {
      const transitResult: LegacyPlanetTransitsResult = {
        score: 8,
        factorKeys: [],
        positive: true,
        negative: false,
      };
      const result = adaptPlanetTransits(transitResult, { lunarPhase: 'new' });
      expect(result.lunarPhase).toBe('newMoon');
    });

    it('should map full moon phase', () => {
      const transitResult: LegacyPlanetTransitsResult = {
        score: 10,
        factorKeys: [],
        positive: true,
        negative: false,
      };
      const result = adaptPlanetTransits(transitResult, { lunarPhase: 'full' });
      expect(result.lunarPhase).toBe('fullMoon');
    });

    it('should map waxing crescent phase', () => {
      const transitResult: LegacyPlanetTransitsResult = {
        score: 6,
        factorKeys: [],
        positive: true,
        negative: false,
      };
      const result = adaptPlanetTransits(transitResult, { lunarPhase: 'waxingCrescent' });
      expect(result.lunarPhase).toBe('waxingCrescent');
    });

    it('should set strong eclipse impact', () => {
      const transitResult: LegacyPlanetTransitsResult = {
        score: 15,
        factorKeys: [],
        positive: true,
        negative: false,
      };
      const eclipseImpact: EclipseImpact = {
        hasImpact: true,
        type: 'solar',
        intensity: 'strong',
        daysFromEclipse: 0,
      };
      const result = adaptPlanetTransits(transitResult, { eclipseImpact });
      expect(result.eclipse?.isEclipseDay).toBe(true);
      expect(result.eclipse?.eclipseType).toBe('solar');
    });

    it('should set medium eclipse impact', () => {
      const transitResult: LegacyPlanetTransitsResult = {
        score: 10,
        factorKeys: [],
        positive: true,
        negative: false,
      };
      const eclipseImpact: EclipseImpact = {
        hasImpact: true,
        type: 'lunar',
        intensity: 'medium',
        daysFromEclipse: 3,
      };
      const result = adaptPlanetTransits(transitResult, { eclipseImpact });
      expect(result.eclipse?.isNearEclipse).toBe(true);
      expect(result.eclipse?.eclipseType).toBe('lunar');
    });

    it('should set weak eclipse impact', () => {
      const transitResult: LegacyPlanetTransitsResult = {
        score: 5,
        factorKeys: [],
        positive: true,
        negative: false,
      };
      const eclipseImpact: EclipseImpact = {
        hasImpact: true,
        type: 'solar',
        intensity: 'weak',
        daysFromEclipse: 7,
      };
      const result = adaptPlanetTransits(transitResult, { eclipseImpact });
      expect(result.eclipse?.isNearEclipse).toBe(true);
    });

    it('should handle no eclipse impact', () => {
      const transitResult: LegacyPlanetTransitsResult = {
        score: 5,
        factorKeys: [],
        positive: true,
        negative: false,
      };
      const eclipseImpact: EclipseImpact = {
        hasImpact: false,
        type: null,
        intensity: null,
        daysFromEclipse: null,
      };
      const result = adaptPlanetTransits(transitResult, { eclipseImpact });
      expect(result.eclipse).toBeUndefined();
    });
  });
});
