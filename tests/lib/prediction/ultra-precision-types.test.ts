/**
 * Ultra Precision Types Tests
 * Type definitions validation tests
 */
import { describe, it, expect } from 'vitest';
import type {
  FiveElement,
  TwelveStage,
  DailyPillarAnalysis,
  GongmangAnalysis,
  ShinsalAnalysis,
  ShinsalHit,
  ShinsalRule,
  EnergyFlowAnalysis,
  TonggeunResult,
  TuechulResult,
} from '@/lib/prediction/ultra-precision-types';

describe('Ultra Precision Types', () => {
  describe('FiveElement type', () => {
    it('should accept valid five elements', () => {
      const elements: FiveElement[] = ['목', '화', '토', '금', '수'];
      expect(elements).toHaveLength(5);
      expect(elements).toContain('목');
      expect(elements).toContain('화');
      expect(elements).toContain('토');
      expect(elements).toContain('금');
      expect(elements).toContain('수');
    });
  });

  describe('TwelveStage type', () => {
    it('should accept valid twelve stages', () => {
      const stages: TwelveStage[] = [
        '장생', '목욕', '관대', '건록', '제왕', '쇠',
        '병', '사', '묘', '절', '태', '양'
      ];
      expect(stages).toHaveLength(12);
    });
  });

  describe('DailyPillarAnalysis interface', () => {
    it('should accept valid daily pillar analysis', () => {
      const analysis: DailyPillarAnalysis = {
        stem: '甲',
        branch: '子',
        element: '목',
        sibsin: '정관',
        twelveStage: { stage: '장생', strength: 'strong', position: 'day' },
        branchInteractions: [],
        score: 85,
        description: '좋은 날입니다',
      };

      expect(analysis.stem).toBe('甲');
      expect(analysis.branch).toBe('子');
      expect(analysis.element).toBe('목');
      expect(analysis.score).toBe(85);
    });
  });

  describe('GongmangAnalysis interface', () => {
    it('should accept valid gongmang analysis', () => {
      const analysis: GongmangAnalysis = {
        emptyBranches: ['戌', '亥'],
        isToday空: false,
        affectedAreas: ['재물', '사업'],
        score: 0,
        advice: '공망이 아닌 날입니다',
      };

      expect(analysis.emptyBranches).toHaveLength(2);
      expect(analysis.isToday空).toBe(false);
      expect(analysis.score).toBe(0);
    });

    it('should handle gongmang day', () => {
      const analysis: GongmangAnalysis = {
        emptyBranches: ['戌', '亥'],
        isToday空: true,
        affectedAreas: ['재물'],
        score: -20,
        advice: '중요한 일은 피하세요',
      };

      expect(analysis.isToday空).toBe(true);
      expect(analysis.score).toBeLessThan(0);
    });
  });

  describe('ShinsalHit interface', () => {
    it('should accept valid shinsal hit', () => {
      const hit: ShinsalHit = {
        name: '천을귀인',
        type: 'lucky',
        description: '귀인의 도움을 받는 날',
        score: 20,
        affectedArea: '전반적 행운',
      };

      expect(hit.name).toBe('천을귀인');
      expect(hit.type).toBe('lucky');
      expect(hit.score).toBeGreaterThan(0);
    });

    it('should accept unlucky type', () => {
      const hit: ShinsalHit = {
        name: '화개살',
        type: 'unlucky',
        description: '고독하고 외로운 기운',
        score: -10,
        affectedArea: '대인관계',
      };

      expect(hit.type).toBe('unlucky');
      expect(hit.score).toBeLessThan(0);
    });

    it('should accept special type', () => {
      const hit: ShinsalHit = {
        name: '도화살',
        type: 'special',
        description: '매력이 빛나는 날',
        score: 5,
        affectedArea: '연애',
      };

      expect(hit.type).toBe('special');
    });
  });

  describe('ShinsalRule interface', () => {
    it('should accept valid shinsal rule', () => {
      const rule: ShinsalRule = {
        name: '역마',
        type: 'special',
        check: (day, target) => day === '寅' && target === '申',
        score: 10,
        description: '이동, 변화가 활발한 날',
        affectedArea: '이동/변화',
      };

      expect(rule.name).toBe('역마');
      expect(rule.check('寅', '申')).toBe(true);
      expect(rule.check('子', '丑')).toBe(false);
    });
  });

  describe('ShinsalAnalysis interface', () => {
    it('should accept valid shinsal analysis', () => {
      const analysis: ShinsalAnalysis = {
        active: [
          { name: '천을귀인', type: 'lucky', description: '귀인', score: 20, affectedArea: '행운' },
        ],
        score: 20,
        interpretation: '귀인의 도움이 있는 날입니다',
      };

      expect(analysis.active).toHaveLength(1);
      expect(analysis.score).toBe(20);
    });

    it('should handle multiple active shinsals', () => {
      const analysis: ShinsalAnalysis = {
        active: [
          { name: '천을귀인', type: 'lucky', description: '귀인', score: 20, affectedArea: '행운' },
          { name: '역마', type: 'special', description: '이동', score: 10, affectedArea: '변화' },
        ],
        score: 30,
        interpretation: '좋은 기운이 여러 개 있습니다',
      };

      expect(analysis.active).toHaveLength(2);
      expect(analysis.score).toBe(30);
    });
  });

  describe('EnergyFlowAnalysis interface', () => {
    it('should accept valid energy flow analysis', () => {
      const analysis: EnergyFlowAnalysis = {
        tonggeun: [],
        tuechul: [],
        energyStrength: 'moderate',
        dominantElement: '목',
        score: 50,
        description: '에너지가 균형잡힌 상태입니다',
      };

      expect(analysis.energyStrength).toBe('moderate');
      expect(analysis.dominantElement).toBe('목');
    });

    it('should accept all energy strength levels', () => {
      const strengths: EnergyFlowAnalysis['energyStrength'][] = [
        'very_strong', 'strong', 'moderate', 'weak', 'very_weak'
      ];

      for (const strength of strengths) {
        const analysis: EnergyFlowAnalysis = {
          tonggeun: [],
          tuechul: [],
          energyStrength: strength,
          dominantElement: '화',
          score: 50,
          description: 'test',
        };
        expect(analysis.energyStrength).toBe(strength);
      }
    });
  });

  describe('TonggeunResult interface', () => {
    it('should accept valid tonggeun result', () => {
      const result: TonggeunResult = {
        stem: '甲',
        rootBranch: '寅',
        strength: 85,
        description: '甲木이 寅에 뿌리를 두고 있습니다',
      };

      expect(result.stem).toBe('甲');
      expect(result.rootBranch).toBe('寅');
      expect(result.strength).toBe(85);
    });

    it('strength should be between 0 and 100', () => {
      const result: TonggeunResult = {
        stem: '乙',
        rootBranch: '卯',
        strength: 100,
        description: '완전한 통근',
      };

      expect(result.strength).toBeGreaterThanOrEqual(0);
      expect(result.strength).toBeLessThanOrEqual(100);
    });
  });

  describe('TuechulResult interface', () => {
    it('should accept valid tuechul result', () => {
      const result: TuechulResult = {
        hiddenStem: '丙',
        fromBranch: '寅',
        revealedIn: '천간',
        significance: '화기가 드러나고 있습니다',
      };

      expect(result.hiddenStem).toBe('丙');
      expect(result.fromBranch).toBe('寅');
      expect(result.revealedIn).toBe('천간');
    });
  });

  describe('Type compatibility', () => {
    it('FiveElement should work in DailyPillarAnalysis', () => {
      const elements: FiveElement[] = ['목', '화', '토', '금', '수'];

      for (const element of elements) {
        const analysis: DailyPillarAnalysis = {
          stem: '甲',
          branch: '子',
          element,
          sibsin: '비견',
          twelveStage: { stage: '장생', strength: 'strong', position: 'day' },
          branchInteractions: [],
          score: 50,
          description: 'test',
        };
        expect(analysis.element).toBe(element);
      }
    });

    it('FiveElement should work in EnergyFlowAnalysis', () => {
      const elements: FiveElement[] = ['목', '화', '토', '금', '수'];

      for (const element of elements) {
        const analysis: EnergyFlowAnalysis = {
          tonggeun: [],
          tuechul: [],
          energyStrength: 'moderate',
          dominantElement: element,
          score: 50,
          description: 'test',
        };
        expect(analysis.dominantElement).toBe(element);
      }
    });
  });
});
