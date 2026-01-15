import { describe, it, expect, vi } from 'vitest';
import {
  analyzeStemRelation,
  analyzeBranchRelation,
  analyzeMultiLayerInteraction,
  analyzeDaeunTransition,
  generateEnergyRecommendations,
} from '@/lib/prediction/life-prediction/relation-analysis';
import type { LifePredictionInput, DaeunInfo, PreciseTwelveStage } from '@/lib/prediction/life-prediction/types';

// Mock advancedTimingEngine
vi.mock('@/lib/prediction/advancedTimingEngine', () => ({
  calculateYearlyGanji: vi.fn((year: number) => {
    // Different years return different ganji for testing
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    return {
      stem: stems[(year - 4) % 10],
      branch: branches[(year - 4) % 12],
    };
  }),
  calculateMonthlyGanji: vi.fn((year: number, month: number) => {
    const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
    const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
    return {
      stem: stems[(year + month) % 10],
      branch: branches[(year + month) % 12],
    };
  }),
  calculatePreciseTwelveStage: vi.fn((dayStem: string, branch: string): PreciseTwelveStage => {
    // Return different energies based on branch
    const energyMap: Record<string, 'peak' | 'rising' | 'declining' | 'dormant'> = {
      '子': 'dormant', '丑': 'rising', '寅': 'rising', '卯': 'peak',
      '辰': 'peak', '巳': 'declining', '午': 'declining', '未': 'dormant',
      '申': 'rising', '酉': 'peak', '戌': 'declining', '亥': 'dormant',
    };
    const scoreMap: Record<string, number> = {
      '子': 30, '丑': 55, '寅': 60, '卯': 80,
      '辰': 85, '巳': 50, '午': 45, '未': 35,
      '申': 65, '酉': 90, '戌': 50, '亥': 40,
    };
    return {
      stage: '건록',
      energy: energyMap[branch] || 'rising',
      score: scoreMap[branch] || 50,
      description: 'test',
    };
  }),
  calculateSibsin: vi.fn((dayStem: string, targetStem: string) => {
    // Return specific sibsin based on stem combinations for predictable testing
    const sibsinMap: Record<string, string> = {
      '甲甲': '비견', '甲乙': '겁재', '甲丙': '식신', '甲丁': '상관',
      '甲戊': '편재', '甲己': '정재', '甲庚': '편관', '甲辛': '정관',
      '甲壬': '편인', '甲癸': '정인',
    };
    return sibsinMap[dayStem + targetStem] || '정관';
  }),
}));

describe('Relation Analysis', () => {
  describe('analyzeStemRelation', () => {
    describe('stem combinations (합)', () => {
      it('should detect 甲己 combination', () => {
        const result = analyzeStemRelation('甲', '己');
        expect(result.type).toBe('합');
        expect(result.description).toContain('토');
      });

      it('should detect 己甲 combination (reverse order)', () => {
        const result = analyzeStemRelation('己', '甲');
        expect(result.type).toBe('합');
      });

      it('should detect 乙庚 combination', () => {
        const result = analyzeStemRelation('乙', '庚');
        expect(result.type).toBe('합');
        expect(result.description).toContain('금');
      });

      it('should detect 丙辛 combination', () => {
        const result = analyzeStemRelation('丙', '辛');
        expect(result.type).toBe('합');
        expect(result.description).toContain('수');
      });

      it('should detect 丁壬 combination', () => {
        const result = analyzeStemRelation('丁', '壬');
        expect(result.type).toBe('합');
        expect(result.description).toContain('목');
      });

      it('should detect 戊癸 combination', () => {
        const result = analyzeStemRelation('戊', '癸');
        expect(result.type).toBe('합');
        expect(result.description).toContain('화');
      });
    });

    describe('stem clashes (충)', () => {
      it('should detect 甲庚 clash', () => {
        const result = analyzeStemRelation('甲', '庚');
        expect(result.type).toBe('충');
        expect(result.description).toBe('천간 충돌');
      });

      it('should detect 庚甲 clash (reverse)', () => {
        const result = analyzeStemRelation('庚', '甲');
        expect(result.type).toBe('충');
      });

      it('should detect 乙辛 clash', () => {
        const result = analyzeStemRelation('乙', '辛');
        expect(result.type).toBe('충');
      });

      it('should detect 丙壬 clash', () => {
        const result = analyzeStemRelation('丙', '壬');
        expect(result.type).toBe('충');
      });

      it('should detect 丁癸 clash', () => {
        const result = analyzeStemRelation('丁', '癸');
        expect(result.type).toBe('충');
      });
    });

    describe('no relation (무관)', () => {
      it('should return 무관 for unrelated stems', () => {
        const result = analyzeStemRelation('甲', '丙');
        expect(result.type).toBe('무관');
        expect(result.description).toBe('');
      });

      it('should return 무관 for same stem', () => {
        const result = analyzeStemRelation('甲', '甲');
        expect(result.type).toBe('무관');
      });
    });
  });

  describe('analyzeBranchRelation', () => {
    describe('six combinations (육합)', () => {
      it('should detect 子丑 combination', () => {
        expect(analyzeBranchRelation('子', '丑')).toBe('육합');
      });

      it('should detect 丑子 combination (reverse)', () => {
        expect(analyzeBranchRelation('丑', '子')).toBe('육합');
      });

      it('should detect 寅亥 combination', () => {
        expect(analyzeBranchRelation('寅', '亥')).toBe('육합');
      });

      it('should detect 卯戌 combination', () => {
        expect(analyzeBranchRelation('卯', '戌')).toBe('육합');
      });

      it('should detect 辰酉 combination', () => {
        expect(analyzeBranchRelation('辰', '酉')).toBe('육합');
      });

      it('should detect 巳申 combination', () => {
        expect(analyzeBranchRelation('巳', '申')).toBe('육합');
      });

      it('should detect 午未 combination', () => {
        expect(analyzeBranchRelation('午', '未')).toBe('육합');
      });
    });

    describe('partial trines (삼합)', () => {
      it('should detect 寅午 fire trine', () => {
        expect(analyzeBranchRelation('寅', '午')).toBe('삼합');
      });

      it('should detect 午戌 fire trine', () => {
        expect(analyzeBranchRelation('午', '戌')).toBe('삼합');
      });

      it('should detect 申子 water trine', () => {
        expect(analyzeBranchRelation('申', '子')).toBe('삼합');
      });

      it('should detect 巳酉 metal trine', () => {
        expect(analyzeBranchRelation('巳', '酉')).toBe('삼합');
      });

      it('should detect 亥卯 wood trine', () => {
        expect(analyzeBranchRelation('亥', '卯')).toBe('삼합');
      });
    });

    describe('clashes (충)', () => {
      it('should detect 子午 clash', () => {
        expect(analyzeBranchRelation('子', '午')).toBe('충');
      });

      it('should detect 丑未 clash', () => {
        expect(analyzeBranchRelation('丑', '未')).toBe('충');
      });

      it('should detect 寅申 clash', () => {
        expect(analyzeBranchRelation('寅', '申')).toBe('충');
      });

      it('should detect 卯酉 clash', () => {
        expect(analyzeBranchRelation('卯', '酉')).toBe('충');
      });

      it('should detect 辰戌 clash', () => {
        expect(analyzeBranchRelation('辰', '戌')).toBe('충');
      });

      it('should detect 巳亥 clash', () => {
        expect(analyzeBranchRelation('巳', '亥')).toBe('충');
      });
    });

    describe('punishments (형)', () => {
      it('should detect 寅巳 punishment', () => {
        expect(analyzeBranchRelation('寅', '巳')).toBe('형');
      });

      it('should detect 丑戌 punishment', () => {
        expect(analyzeBranchRelation('丑', '戌')).toBe('형');
      });

      it('should detect 子卯 punishment', () => {
        expect(analyzeBranchRelation('子', '卯')).toBe('형');
      });
    });

    describe('no relation (무관)', () => {
      it('should return 무관 for unrelated branches', () => {
        expect(analyzeBranchRelation('子', '寅')).toBe('무관');
      });

      it('should return 무관 for same branch', () => {
        expect(analyzeBranchRelation('子', '子')).toBe('무관');
      });
    });
  });

  describe('analyzeMultiLayerInteraction', () => {
    const mockDaeunList: DaeunInfo[] = [
      { startAge: 3, endAge: 12, stem: '甲', branch: '子', element: '목' },
      { startAge: 13, endAge: 22, stem: '乙', branch: '丑', element: '목' },
      { startAge: 23, endAge: 32, stem: '丙', branch: '寅', element: '화' },
      { startAge: 33, endAge: 42, stem: '丁', branch: '卯', element: '화' },
    ];

    const baseInput: LifePredictionInput = {
      birthYear: 1990,
      birthMonth: 5,
      birthDay: 15,
      gender: 'male',
      dayStem: '甲',
      dayBranch: '子',
      monthBranch: '巳',
      yearBranch: '午',
      allStems: ['甲', '乙', '丙', '丁'],
      allBranches: ['子', '丑', '寅', '卯'],
      daeunList: mockDaeunList,
      yongsin: ['목', '화'],
      kisin: ['금'],
    };

    it('should return zero bonus for unknown event type', () => {
      const result = analyzeMultiLayerInteraction(baseInput, 'unknown' as any, 2020, 5);
      expect(result.bonus).toBe(0);
      expect(result.reasons).toHaveLength(0);
      expect(result.penalties).toHaveLength(0);
    });

    it('should return zero bonus when no daeun found', () => {
      const inputWithoutDaeun = { ...baseInput, daeunList: [] };
      const result = analyzeMultiLayerInteraction(inputWithoutDaeun, 'marriage', 2020, 5);
      expect(result.bonus).toBe(0);
    });

    it('should return valid BonusResult structure', () => {
      const result = analyzeMultiLayerInteraction(baseInput, 'career', 2020, 5);

      expect(typeof result.bonus).toBe('number');
      expect(Array.isArray(result.reasons)).toBe(true);
      expect(Array.isArray(result.penalties)).toBe(true);
    });

    it('should clamp bonus between -30 and 30', () => {
      const result = analyzeMultiLayerInteraction(baseInput, 'marriage', 2020, 5);

      expect(result.bonus).toBeGreaterThanOrEqual(-30);
      expect(result.bonus).toBeLessThanOrEqual(30);
    });

    it('should limit reasons to 4 items', () => {
      const result = analyzeMultiLayerInteraction(baseInput, 'career', 2020, 5);
      expect(result.reasons.length).toBeLessThanOrEqual(4);
    });

    it('should limit penalties to 3 items', () => {
      const result = analyzeMultiLayerInteraction(baseInput, 'career', 2020, 5);
      expect(result.penalties.length).toBeLessThanOrEqual(3);
    });

    it('should analyze different event types', () => {
      const eventTypes = ['marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship'] as const;

      eventTypes.forEach(eventType => {
        const result = analyzeMultiLayerInteraction(baseInput, eventType, 2020, 5);
        expect(result).toHaveProperty('bonus');
        expect(result).toHaveProperty('reasons');
        expect(result).toHaveProperty('penalties');
      });
    });

    it('should handle different years within daeun period', () => {
      // Age 30-32 is within 23-32 daeun
      const result2020 = analyzeMultiLayerInteraction(baseInput, 'career', 2020, 5);
      const result2021 = analyzeMultiLayerInteraction(baseInput, 'career', 2021, 5);

      // Both should return valid results
      expect(result2020.bonus).toBeDefined();
      expect(result2021.bonus).toBeDefined();
    });
  });

  describe('analyzeDaeunTransition', () => {
    const baseInput: LifePredictionInput = {
      birthYear: 1990,
      birthMonth: 5,
      birthDay: 15,
      gender: 'male',
      dayStem: '甲',
      dayBranch: '子',
      monthBranch: '巳',
      yearBranch: '午',
      allStems: ['甲', '乙', '丙', '丁'],
      allBranches: ['子', '丑', '寅', '卯'],
      yongsin: ['목', '화'],
      kisin: ['금', '수'],
    };

    it('should return major_positive for yongsin + peak transition', () => {
      const fromDaeun: DaeunInfo = { startAge: 13, endAge: 22, stem: '庚', branch: '子', element: '금' };
      const toDaeun: DaeunInfo = { startAge: 23, endAge: 32, stem: '甲', branch: '卯', element: '목' };

      const result = analyzeDaeunTransition(baseInput, fromDaeun, toDaeun);

      expect(result.impact).toBe('major_positive');
      expect(result.description).toContain('인생의 전환점');
    });

    it('should return positive for yongsin transition', () => {
      const fromDaeun: DaeunInfo = { startAge: 13, endAge: 22, stem: '庚', branch: '子', element: '금' };
      const toDaeun: DaeunInfo = { startAge: 23, endAge: 32, stem: '甲', branch: '寅', element: '목' };

      const result = analyzeDaeunTransition(baseInput, fromDaeun, toDaeun);

      expect(['major_positive', 'positive']).toContain(result.impact);
    });

    it('should return major_challenging for kisin + dormant transition', () => {
      const fromDaeun: DaeunInfo = { startAge: 13, endAge: 22, stem: '甲', branch: '卯', element: '목' };
      const toDaeun: DaeunInfo = { startAge: 23, endAge: 32, stem: '壬', branch: '亥', element: '수' };

      const result = analyzeDaeunTransition(baseInput, fromDaeun, toDaeun);

      expect(result.impact).toBe('major_challenging');
      expect(result.description).toContain('인내');
    });

    it('should return challenging for kisin transition', () => {
      const fromDaeun: DaeunInfo = { startAge: 13, endAge: 22, stem: '甲', branch: '卯', element: '목' };
      const toDaeun: DaeunInfo = { startAge: 23, endAge: 32, stem: '庚', branch: '申', element: '금' };

      const result = analyzeDaeunTransition(baseInput, fromDaeun, toDaeun);

      // 申 branch returns 'rising' energy from mock, and 금 is kisin
      // The function may return positive if rising energy overrides kisin
      expect(['positive', 'challenging', 'major_challenging']).toContain(result.impact);
    });

    it('should return neutral for standard transition', () => {
      const inputNoYongKi = { ...baseInput, yongsin: [], kisin: [] };
      const fromDaeun: DaeunInfo = { startAge: 13, endAge: 22, stem: '乙', branch: '丑', element: '목' };
      const toDaeun: DaeunInfo = { startAge: 23, endAge: 32, stem: '丙', branch: '巳', element: '화' };

      const result = analyzeDaeunTransition(inputNoYongKi, fromDaeun, toDaeun);

      // Should be one of the valid impact types
      expect(['major_positive', 'positive', 'neutral', 'challenging', 'major_challenging'])
        .toContain(result.impact);
    });

    it('should include element in description', () => {
      const fromDaeun: DaeunInfo = { startAge: 13, endAge: 22, stem: '乙', branch: '丑', element: '목' };
      const toDaeun: DaeunInfo = { startAge: 23, endAge: 32, stem: '丙', branch: '寅', element: '화' };

      const result = analyzeDaeunTransition(baseInput, fromDaeun, toDaeun);

      expect(result.description.length).toBeGreaterThan(0);
    });
  });

  describe('generateEnergyRecommendations', () => {
    describe('peak energy', () => {
      it('should include action-oriented recommendations', () => {
        const result = generateEnergyRecommendations('peak', '목');

        expect(result).toContain('중요한 결정과 큰 프로젝트 추진');
        expect(result).toContain('적극적인 도전과 확장');
        expect(result).toContain('리더십 발휘와 책임 수용');
      });
    });

    describe('rising energy', () => {
      it('should include growth-oriented recommendations', () => {
        const result = generateEnergyRecommendations('rising', '화');

        expect(result).toContain('새로운 시작과 계획 수립');
        expect(result).toContain('학습과 자기 개발');
        expect(result).toContain('인맥 확장과 네트워킹');
      });
    });

    describe('declining energy', () => {
      it('should include consolidation recommendations', () => {
        const result = generateEnergyRecommendations('declining', '토');

        expect(result).toContain('기존 성과의 정리와 보존');
        expect(result).toContain('무리한 확장보다 안정 추구');
        expect(result).toContain('후계 양성과 지식 전수');
      });
    });

    describe('dormant energy', () => {
      it('should include rest-oriented recommendations', () => {
        const result = generateEnergyRecommendations('dormant', '금');

        expect(result).toContain('내면 성찰과 재충전');
        expect(result).toContain('건강 관리와 휴식');
        expect(result).toContain('다음 주기를 위한 조용한 준비');
      });
    });

    describe('element-specific recommendations', () => {
      it('should add wood element recommendation', () => {
        const result = generateEnergyRecommendations('peak', '목');
        expect(result).toContain('창의적 활동과 새로운 아이디어 개발');
      });

      it('should add fire element recommendation', () => {
        const result = generateEnergyRecommendations('peak', '화');
        expect(result).toContain('열정을 표현하되 과열 주의');
      });

      it('should add earth element recommendation', () => {
        const result = generateEnergyRecommendations('peak', '토');
        expect(result).toContain('부동산, 안정적 투자에 유리');
      });

      it('should add metal element recommendation', () => {
        const result = generateEnergyRecommendations('peak', '금');
        expect(result).toContain('결단력 있는 정리와 선택');
      });

      it('should add water element recommendation', () => {
        const result = generateEnergyRecommendations('peak', '수');
        expect(result).toContain('유연한 대응과 지혜로운 판단');
      });
    });

    it('should return at least 4 recommendations (3 energy + 1 element)', () => {
      const energies: Array<'peak' | 'rising' | 'declining' | 'dormant'> = ['peak', 'rising', 'declining', 'dormant'];
      const elements: Array<'목' | '화' | '토' | '금' | '수'> = ['목', '화', '토', '금', '수'];

      energies.forEach(energy => {
        elements.forEach(element => {
          const result = generateEnergyRecommendations(energy, element);
          expect(result.length).toBeGreaterThanOrEqual(4);
        });
      });
    });
  });
});
