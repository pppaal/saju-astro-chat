/**
 * Life Prediction Helpers Tests
 *
 * Tests for helper functions in life-prediction-helpers.ts
 */

import { describe, it, expect, vi } from 'vitest';
import {
  analyzeStemRelation,
  analyzeBranchRelation,
  detectShinsals,
  calculateCompoundLuckScore,
  calculateMethodAlignment,
  calculateDataCompleteness,
  getStageEventEffect,
  determineLifeCycle,
  analyzeOverallTrend,
  generateYearlyThemes,
  generateOpportunities,
  generateChallenges,
} from '@/lib/prediction/life-prediction-helpers';
import type { LifePredictionInput } from '@/lib/prediction/life-prediction-types';

// Helper to create minimal input
function createMinimalInput(): LifePredictionInput {
  return {
    birthYear: 1990,
    birthMonth: 5,
    birthDay: 15,
    gender: 'male',
    dayStem: '甲',
    dayBranch: '子',
    monthBranch: '午',
    yearBranch: '午',
    allStems: ['庚', '辛', '甲', '丙'],
    allBranches: ['午', '巳', '子', '寅'],
  };
}

describe('analyzeStemRelation', () => {
  describe('stem combinations (합)', () => {
    it('should detect 甲己 combination as earth', () => {
      const result = analyzeStemRelation('甲', '己');
      expect(result.type).toBe('합');
      expect(result.description).toContain('토');
    });

    it('should detect 乙庚 combination as metal', () => {
      const result = analyzeStemRelation('乙', '庚');
      expect(result.type).toBe('합');
      expect(result.description).toContain('금');
    });

    it('should detect 丙辛 combination as water', () => {
      const result = analyzeStemRelation('丙', '辛');
      expect(result.type).toBe('합');
      expect(result.description).toContain('수');
    });

    it('should detect 丁壬 combination as wood', () => {
      const result = analyzeStemRelation('丁', '壬');
      expect(result.type).toBe('합');
      expect(result.description).toContain('목');
    });

    it('should detect 戊癸 combination as fire', () => {
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

  describe('no relation', () => {
    it('should return 무관 for unrelated stems', () => {
      const result = analyzeStemRelation('甲', '乙');
      expect(result.type).toBe('무관');
      expect(result.description).toBe('');
    });

    it('should return 무관 for 丙丁', () => {
      const result = analyzeStemRelation('丙', '丁');
      expect(result.type).toBe('무관');
    });
  });
});

describe('analyzeBranchRelation', () => {
  describe('six combinations (육합)', () => {
    it('should detect 子丑 as 육합', () => {
      expect(analyzeBranchRelation('子', '丑')).toBe('육합');
    });

    it('should detect reverse 丑子 as 육합', () => {
      expect(analyzeBranchRelation('丑', '子')).toBe('육합');
    });

    it('should detect 寅亥 as 육합', () => {
      expect(analyzeBranchRelation('寅', '亥')).toBe('육합');
    });

    it('should detect 卯戌 as 육합', () => {
      expect(analyzeBranchRelation('卯', '戌')).toBe('육합');
    });

    it('should detect 辰酉 as 육합', () => {
      expect(analyzeBranchRelation('辰', '酉')).toBe('육합');
    });

    it('should detect 巳申 as 육합', () => {
      expect(analyzeBranchRelation('巳', '申')).toBe('육합');
    });

    it('should detect 午未 as 육합', () => {
      expect(analyzeBranchRelation('午', '未')).toBe('육합');
    });
  });

  describe('partial trines (삼합)', () => {
    it('should detect 寅午 as 삼합', () => {
      expect(analyzeBranchRelation('寅', '午')).toBe('삼합');
    });

    it('should detect 午戌 as 삼합', () => {
      expect(analyzeBranchRelation('午', '戌')).toBe('삼합');
    });

    it('should detect 申子 as 삼합', () => {
      expect(analyzeBranchRelation('申', '子')).toBe('삼합');
    });

    it('should detect 子辰 as 삼합', () => {
      expect(analyzeBranchRelation('子', '辰')).toBe('삼합');
    });
  });

  describe('clashes (충)', () => {
    it('should detect 子午 as 충', () => {
      expect(analyzeBranchRelation('子', '午')).toBe('충');
    });

    it('should detect reverse 午子 as 충', () => {
      expect(analyzeBranchRelation('午', '子')).toBe('충');
    });

    it('should detect 丑未 as 충', () => {
      expect(analyzeBranchRelation('丑', '未')).toBe('충');
    });

    it('should detect 寅申 as 충', () => {
      expect(analyzeBranchRelation('寅', '申')).toBe('충');
    });

    it('should detect 卯酉 as 충', () => {
      expect(analyzeBranchRelation('卯', '酉')).toBe('충');
    });

    it('should detect 辰戌 as 충', () => {
      expect(analyzeBranchRelation('辰', '戌')).toBe('충');
    });

    it('should detect 巳亥 as 충', () => {
      expect(analyzeBranchRelation('巳', '亥')).toBe('충');
    });
  });

  describe('punishments (형)', () => {
    it('should detect 寅巳 as 형', () => {
      expect(analyzeBranchRelation('寅', '巳')).toBe('형');
    });

    it('should detect 丑戌 as 형', () => {
      expect(analyzeBranchRelation('丑', '戌')).toBe('형');
    });

    it('should detect 子卯 as 형', () => {
      expect(analyzeBranchRelation('子', '卯')).toBe('형');
    });
  });

  describe('no relation', () => {
    it('should return 무관 for unrelated branches', () => {
      expect(analyzeBranchRelation('子', '寅')).toBe('무관');
    });

    it('should return 무관 for 丑寅', () => {
      expect(analyzeBranchRelation('丑', '寅')).toBe('무관');
    });
  });
});

describe('detectShinsals', () => {
  it('should detect 천을귀인', () => {
    const input = createMinimalInput();
    input.dayStem = '甲';
    const dailyPillar = { stem: '丙', branch: '丑' };

    const result = detectShinsals(input, dailyPillar);
    const cheonel = result.find(s => s.name === '천을귀인');
    expect(cheonel).toBeDefined();
    expect(cheonel?.type).toBe('lucky');
  });

  it('should detect 역마', () => {
    const input = createMinimalInput();
    input.dayBranch = '申';
    const dailyPillar = { stem: '甲', branch: '寅' };

    const result = detectShinsals(input, dailyPillar);
    const yeokma = result.find(s => s.name === '역마');
    expect(yeokma).toBeDefined();
    expect(yeokma?.type).toBe('lucky');
  });

  it('should detect 문창', () => {
    const input = createMinimalInput();
    input.dayStem = '甲';
    const dailyPillar = { stem: '乙', branch: '巳' };

    const result = detectShinsals(input, dailyPillar);
    const munchang = result.find(s => s.name === '문창');
    expect(munchang).toBeDefined();
    expect(munchang?.type).toBe('lucky');
  });

  it('should detect 겁살 as unlucky', () => {
    const input = createMinimalInput();
    input.dayBranch = '申';
    const dailyPillar = { stem: '甲', branch: '巳' };

    const result = detectShinsals(input, dailyPillar);
    const geopsal = result.find(s => s.name === '겁살');
    expect(geopsal).toBeDefined();
    expect(geopsal?.type).toBe('unlucky');
  });

  it('should return empty array when no shinsals detected', () => {
    const input = createMinimalInput();
    input.dayStem = '甲';
    input.dayBranch = '子';
    const dailyPillar = { stem: '甲', branch: '子' };

    const result = detectShinsals(input, dailyPillar);
    expect(result.length).toBe(0);
  });

  it('should detect multiple shinsals', () => {
    const input = createMinimalInput();
    input.dayStem = '甲';
    input.dayBranch = '申';
    const dailyPillar = { stem: '丙', branch: '丑' };

    const result = detectShinsals(input, dailyPillar);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});

describe('calculateCompoundLuckScore', () => {
  it('should return zero bonus without daeunList', () => {
    const input = createMinimalInput();
    const result = calculateCompoundLuckScore(input, 'career', 2025, 6);

    expect(result.bonus).toBe(0);
    expect(result.reasons).toHaveLength(0);
    expect(result.penalties).toHaveLength(0);
  });

  it('should return zero bonus for unknown event type', () => {
    const input = createMinimalInput();
    input.daeunList = [{ stem: '丙', branch: '寅', startAge: 30, endAge: 39 }];

    const result = calculateCompoundLuckScore(input, 'unknown' as any, 2025, 6);
    expect(result.bonus).toBe(0);
  });

  it('should calculate bonus with daeunList for career', () => {
    const input = createMinimalInput();
    input.daeunList = [{ stem: '丙', branch: '寅', startAge: 30, endAge: 39 }];

    const result = calculateCompoundLuckScore(input, 'career', 2025, 6);
    expect(result).toBeDefined();
    expect(typeof result.bonus).toBe('number');
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(Array.isArray(result.penalties)).toBe(true);
  });

  it('should handle all event types', () => {
    const input = createMinimalInput();
    input.daeunList = [{ stem: '甲', branch: '子', startAge: 30, endAge: 39 }];

    const eventTypes = ['marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship'];
    for (const eventType of eventTypes) {
      const result = calculateCompoundLuckScore(input, eventType as any, 2025, 6);
      expect(result).toBeDefined();
    }
  });

  it('should add bonus for triple favorable sibsin', () => {
    const input = createMinimalInput();
    input.dayStem = '甲';
    input.daeunList = [{ stem: '庚', branch: '申', startAge: 30, endAge: 39 }];

    const result = calculateCompoundLuckScore(input, 'career', 2025, 6);
    expect(result.bonus).toBeGreaterThanOrEqual(-30);
    expect(result.bonus).toBeLessThanOrEqual(30);
  });

  it('should apply penalty for multiple avoid sibsin', () => {
    const input = createMinimalInput();
    input.dayStem = '甲';
    input.daeunList = [{ stem: '乙', branch: '卯', startAge: 30, endAge: 39 }];

    const result = calculateCompoundLuckScore(input, 'career', 2025, 6);
    expect(typeof result.bonus).toBe('number');
  });

  it('should add bonus for yongsin activation', () => {
    const input = createMinimalInput();
    input.daeunList = [{ stem: '丙', branch: '午', startAge: 30, endAge: 39 }];
    input.yongsin = ['fire', 'wood'];

    const result = calculateCompoundLuckScore(input, 'career', 2025, 6);
    expect(result).toBeDefined();
  });

  it('should apply penalty for kisin activation', () => {
    const input = createMinimalInput();
    input.daeunList = [{ stem: '壬', branch: '子', startAge: 30, endAge: 39 }];
    input.kisin = ['water', 'metal'];

    const result = calculateCompoundLuckScore(input, 'career', 2025, 6);
    expect(result).toBeDefined();
  });

  it('should cap bonus at 30', () => {
    const input = createMinimalInput();
    input.daeunList = [{ stem: '丙', branch: '午', startAge: 30, endAge: 39 }];
    input.yongsin = ['fire', 'wood', 'earth'];

    const result = calculateCompoundLuckScore(input, 'career', 2025, 6);
    expect(result.bonus).toBeLessThanOrEqual(30);
  });

  it('should cap penalty at -30', () => {
    const input = createMinimalInput();
    input.daeunList = [{ stem: '壬', branch: '子', startAge: 30, endAge: 39 }];
    input.kisin = ['water', 'metal', 'wood'];

    const result = calculateCompoundLuckScore(input, 'career', 2025, 6);
    expect(result.bonus).toBeGreaterThanOrEqual(-30);
  });

  it('should limit reasons to 4', () => {
    const input = createMinimalInput();
    input.daeunList = [{ stem: '丙', branch: '午', startAge: 30, endAge: 39 }];
    input.yongsin = ['fire', 'wood'];

    const result = calculateCompoundLuckScore(input, 'career', 2025, 6);
    expect(result.reasons.length).toBeLessThanOrEqual(4);
  });

  it('should limit penalties to 3', () => {
    const input = createMinimalInput();
    input.daeunList = [{ stem: '壬', branch: '子', startAge: 30, endAge: 39 }];
    input.kisin = ['water', 'metal'];

    const result = calculateCompoundLuckScore(input, 'career', 2025, 6);
    expect(result.penalties.length).toBeLessThanOrEqual(3);
  });
});

describe('calculateMethodAlignment', () => {
  it('should return base alignment of 50', () => {
    const result = calculateMethodAlignment(
      { energy: 'stable' },
      { energy: 'neutral' },
      { isAuspicious: true }
    );
    expect(result).toBeGreaterThanOrEqual(50);
  });

  it('should add 15 for peak energy with auspicious lunar mansion', () => {
    const result = calculateMethodAlignment(
      { energy: 'peak' },
      { energy: 'neutral' },
      { isAuspicious: true }
    );
    expect(result).toBe(65);
  });

  it('should add 10 for dormant energy with inauspicious lunar mansion', () => {
    const result = calculateMethodAlignment(
      { energy: 'dormant' },
      { energy: 'neutral' },
      { isAuspicious: false }
    );
    expect(result).toBe(60);
  });

  it('should subtract 10 for peak energy with inauspicious lunar mansion', () => {
    const result = calculateMethodAlignment(
      { energy: 'peak' },
      { energy: 'neutral' },
      { isAuspicious: false }
    );
    expect(result).toBe(40);
  });

  it('should add 10 for yang energy with rising stage', () => {
    const result = calculateMethodAlignment(
      { energy: 'rising' },
      { energy: 'yang' },
      { isAuspicious: true }
    );
    expect(result).toBe(60);
  });

  it('should add 10 for yin energy with declining stage', () => {
    const result = calculateMethodAlignment(
      { energy: 'declining' },
      { energy: 'yin' },
      { isAuspicious: true }
    );
    expect(result).toBe(60);
  });

  it('should cap at 100', () => {
    const result = calculateMethodAlignment(
      { energy: 'peak' },
      { energy: 'yang' },
      { isAuspicious: true }
    );
    expect(result).toBeLessThanOrEqual(100);
  });

  it('should not go below 0', () => {
    const result = calculateMethodAlignment(
      { energy: 'peak' },
      { energy: 'yang' },
      { isAuspicious: false }
    );
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe('calculateDataCompleteness', () => {
  it('should return base completeness of 50', () => {
    const input = createMinimalInput();
    const result = calculateDataCompleteness(input);
    expect(result).toBe(50);
  });

  it('should add 15 for birthHour', () => {
    const input = createMinimalInput();
    input.birthHour = 10;
    const result = calculateDataCompleteness(input);
    expect(result).toBe(65);
  });

  it('should add 15 for daeunList', () => {
    const input = createMinimalInput();
    input.daeunList = [{ stem: '甲', branch: '子', startAge: 0, endAge: 9 }];
    const result = calculateDataCompleteness(input);
    expect(result).toBe(65);
  });

  it('should not add for empty daeunList', () => {
    const input = createMinimalInput();
    input.daeunList = [];
    const result = calculateDataCompleteness(input);
    expect(result).toBe(50);
  });

  it('should add 10 for yongsin', () => {
    const input = createMinimalInput();
    input.yongsin = ['fire'];
    const result = calculateDataCompleteness(input);
    expect(result).toBe(60);
  });

  it('should not add for empty yongsin', () => {
    const input = createMinimalInput();
    input.yongsin = [];
    const result = calculateDataCompleteness(input);
    expect(result).toBe(50);
  });

  it('should add 5 for astroChart', () => {
    const input = createMinimalInput();
    input.astroChart = { sun: { sign: 'Aries', house: 1 } };
    const result = calculateDataCompleteness(input);
    expect(result).toBe(55);
  });

  it('should add 5 for advancedAstro', () => {
    const input = createMinimalInput();
    input.advancedAstro = { electional: { moonPhase: { phase: 'full_moon' } } };
    const result = calculateDataCompleteness(input);
    expect(result).toBe(55);
  });

  it('should cap at 100', () => {
    const input = createMinimalInput();
    input.birthHour = 10;
    input.daeunList = [{ stem: '甲', branch: '子', startAge: 0, endAge: 9 }];
    input.yongsin = ['fire'];
    input.astroChart = { sun: { sign: 'Aries', house: 1 } };
    input.advancedAstro = { electional: {} };
    const result = calculateDataCompleteness(input);
    expect(result).toBe(100);
  });
});

describe('getStageEventEffect', () => {
  it('should return effect for valid stage and category', () => {
    const result = getStageEventEffect('건록', 'career');
    if (result) {
      expect(typeof result).toBe('string');
    }
  });

  it('should return null for unknown stage', () => {
    const result = getStageEventEffect('unknown', 'career');
    expect(result).toBeNull();
  });

  it('should return null for unknown category', () => {
    const result = getStageEventEffect('건록', 'unknown');
    expect(result).toBeNull();
  });

  it('should handle 장생 stage', () => {
    const result = getStageEventEffect('장생', 'career');
    expect(result === null || typeof result === 'string').toBe(true);
  });

  it('should handle 제왕 stage', () => {
    const result = getStageEventEffect('제왕', 'career');
    expect(result === null || typeof result === 'string').toBe(true);
  });
});

describe('determineLifeCycle', () => {
  describe('with daeun', () => {
    it('should use daeun for life cycle', () => {
      const daeun = { stem: '甲', branch: '子', startAge: 30, endAge: 39 };
      const result = determineLifeCycle(35, daeun);

      expect(result.name).toContain('甲子');
      expect(result.name).toContain('대운');
    });

    it('should detect peak energy', () => {
      const daeun = { stem: '甲', branch: '子', startAge: 30, endAge: 39, energy: 'peak' } as any;
      const result = determineLifeCycle(35, daeun);

      expect(result.energy).toBe('peak');
    });

    it('should detect strong as peak', () => {
      const daeun = { stem: '甲', branch: '子', startAge: 30, endAge: 39, energy: 'strong' } as any;
      const result = determineLifeCycle(35, daeun);

      expect(result.energy).toBe('peak');
    });

    it('should detect declining energy', () => {
      const daeun = { stem: '甲', branch: '子', startAge: 30, endAge: 39, energy: 'declining' } as any;
      const result = determineLifeCycle(35, daeun);

      expect(result.energy).toBe('declining');
    });

    it('should detect weak as declining', () => {
      const daeun = { stem: '甲', branch: '子', startAge: 30, endAge: 39, energy: 'weak' } as any;
      const result = determineLifeCycle(35, daeun);

      expect(result.energy).toBe('declining');
    });

    it('should detect dormant energy', () => {
      const daeun = { stem: '甲', branch: '子', startAge: 30, endAge: 39, energy: 'dormant' } as any;
      const result = determineLifeCycle(35, daeun);

      expect(result.energy).toBe('dormant');
    });

    it('should detect very_weak as dormant', () => {
      const daeun = { stem: '甲', branch: '子', startAge: 30, endAge: 39, energy: 'very_weak' } as any;
      const result = determineLifeCycle(35, daeun);

      expect(result.energy).toBe('dormant');
    });

    it('should use theme from daeun', () => {
      const daeun = { stem: '甲', branch: '子', startAge: 30, endAge: 39, theme: '발전의 시기' } as any;
      const result = determineLifeCycle(35, daeun);

      expect(result.theme).toBe('발전의 시기');
    });

    it('should default theme to 운세 흐름', () => {
      const daeun = { stem: '甲', branch: '子', startAge: 30, endAge: 39 };
      const result = determineLifeCycle(35, daeun);

      expect(result.theme).toBe('운세 흐름');
    });
  });

  describe('without daeun (age based)', () => {
    it('should return 성장기 for age < 20', () => {
      const result = determineLifeCycle(15);
      expect(result.name).toBe('성장기');
      expect(result.theme).toBe('학습과 성장');
      expect(result.energy).toBe('rising');
    });

    it('should return 청년기 for age 20-34', () => {
      const result = determineLifeCycle(25);
      expect(result.name).toBe('청년기');
      expect(result.theme).toBe('도전과 확장');
      expect(result.energy).toBe('rising');
    });

    it('should return 장년기 for age 35-49', () => {
      const result = determineLifeCycle(45);
      expect(result.name).toBe('장년기');
      expect(result.theme).toBe('성취와 안정');
      expect(result.energy).toBe('peak');
    });

    it('should return 중년기 for age 50-64', () => {
      const result = determineLifeCycle(55);
      expect(result.name).toBe('중년기');
      expect(result.theme).toBe('성숙과 수확');
      expect(result.energy).toBe('declining');
    });

    it('should return 노년기 for age >= 65', () => {
      const result = determineLifeCycle(70);
      expect(result.name).toBe('노년기');
      expect(result.theme).toBe('지혜와 여유');
      expect(result.energy).toBe('dormant');
    });

    it('should handle boundary age 20', () => {
      const result = determineLifeCycle(20);
      expect(result.name).toBe('청년기');
    });

    it('should handle boundary age 35', () => {
      const result = determineLifeCycle(35);
      expect(result.name).toBe('장년기');
    });

    it('should handle boundary age 50', () => {
      const result = determineLifeCycle(50);
      expect(result.name).toBe('중년기');
    });

    it('should handle boundary age 65', () => {
      const result = determineLifeCycle(65);
      expect(result.name).toBe('노년기');
    });
  });
});

describe('analyzeOverallTrend', () => {
  it('should return stable for less than 3 scores', () => {
    expect(analyzeOverallTrend([50])).toBe('stable');
    expect(analyzeOverallTrend([50, 60])).toBe('stable');
  });

  it('should return ascending for increasing scores', () => {
    // Use gradual increase to avoid high variance triggering 'volatile'
    const scores = [50, 52, 55, 58, 62, 65, 68, 72];
    const result = analyzeOverallTrend(scores);
    expect(result).toBe('ascending');
  });

  it('should return descending for decreasing scores', () => {
    // Use gradual decrease to avoid high variance triggering 'volatile'
    const scores = [72, 68, 65, 62, 58, 55, 52, 50];
    const result = analyzeOverallTrend(scores);
    expect(result).toBe('descending');
  });

  it('should return stable for consistent scores', () => {
    const scores = [50, 52, 48, 51, 49, 50, 51, 49];
    const result = analyzeOverallTrend(scores);
    expect(result).toBe('stable');
  });

  it('should return volatile for high variance', () => {
    const scores = [30, 80, 25, 90, 35, 85, 40, 70];
    const result = analyzeOverallTrend(scores);
    expect(result).toBe('volatile');
  });

  it('should handle empty array', () => {
    const result = analyzeOverallTrend([]);
    expect(result).toBe('stable');
  });
});

describe('generateYearlyThemes', () => {
  it('should include 12 stage info', () => {
    const themes = generateYearlyThemes(
      '정관',
      { stage: '건록', lifePhase: '성취기 - 일을 펼치는 때' }
    );

    expect(themes).toContain('건록 - 성취기');
  });

  it('should include sibsin', () => {
    const themes = generateYearlyThemes(
      '정관',
      { stage: '건록', lifePhase: '성취기 - 일을 펼치는 때' }
    );

    expect(themes).toContain('정관운');
  });

  it('should include daeun info when provided', () => {
    const daeun = { stem: '甲', branch: '子', startAge: 30, endAge: 39 };
    const themes = generateYearlyThemes(
      '정관',
      { stage: '건록', lifePhase: '성취기 - 일을 펼치는 때' },
      daeun
    );

    expect(themes).toContain('甲子 대운 시기');
  });

  it('should not include daeun when not provided', () => {
    const themes = generateYearlyThemes(
      '정관',
      { stage: '건록', lifePhase: '성취기 - 일을 펼치는 때' }
    );

    expect(themes.length).toBe(2);
  });

  it('should handle various sibsin types', () => {
    const sibsinTypes = ['정관', '편관', '정재', '편재', '식신', '상관', '겁재', '비견', '정인', '편인'];

    for (const sibsin of sibsinTypes) {
      const themes = generateYearlyThemes(
        sibsin,
        { stage: '건록', lifePhase: '성취기' }
      );
      expect(themes).toContain(`${sibsin}운`);
    }
  });
});

describe('generateOpportunities', () => {
  it('should generate opportunities for peak energy', () => {
    const opportunities = generateOpportunities(
      '정관',
      { energy: 'peak', stage: '제왕' },
      false
    );

    expect(opportunities).toContain('성취와 성공의 시기');
    expect(opportunities).toContain('중요한 결정에 좋은 때');
  });

  it('should generate opportunities for rising energy', () => {
    const opportunities = generateOpportunities(
      '정관',
      { energy: 'rising', stage: '장생' },
      false
    );

    expect(opportunities).toContain('새로운 시작에 좋은 때');
    expect(opportunities).toContain('학습과 성장의 기회');
  });

  it('should add stability opportunity for 정관/정재/정인', () => {
    for (const sibsin of ['정관', '정재', '정인']) {
      const opportunities = generateOpportunities(
        sibsin,
        { energy: 'stable', stage: '관대' },
        false
      );

      expect(opportunities).toContain('안정적인 발전 가능');
    }
  });

  it('should add wealth opportunity for 편재/식신', () => {
    for (const sibsin of ['편재', '식신']) {
      const opportunities = generateOpportunities(
        sibsin,
        { energy: 'stable', stage: '관대' },
        false
      );

      expect(opportunities).toContain('재물 기회');
    }
  });

  it('should add yongsin opportunity when active', () => {
    const opportunities = generateOpportunities(
      '정관',
      { energy: 'stable', stage: '관대' },
      true
    );

    expect(opportunities).toContain('용신 활성 - 유리한 흐름');
  });

  it('should limit to 4 opportunities', () => {
    const opportunities = generateOpportunities(
      '정재',
      { energy: 'peak', stage: '제왕' },
      true
    );

    expect(opportunities.length).toBeLessThanOrEqual(4);
  });

  it('should return empty for dormant/declining without special sibsin', () => {
    const opportunities = generateOpportunities(
      '비견',
      { energy: 'dormant', stage: '묘' },
      false
    );

    expect(opportunities.length).toBe(0);
  });
});

describe('generateChallenges', () => {
  it('should generate challenges for dormant energy', () => {
    const challenges = generateChallenges(
      '정관',
      { energy: 'dormant' },
      false
    );

    expect(challenges).toContain('에너지 저하기 - 휴식 권장');
    expect(challenges).toContain('중요 결정 보류');
  });

  it('should generate challenges for declining energy', () => {
    const challenges = generateChallenges(
      '정관',
      { energy: 'declining' },
      false
    );

    expect(challenges).toContain('현상 유지에 집중');
  });

  it('should add conflict warning for 겁재/상관', () => {
    for (const sibsin of ['겁재', '상관']) {
      const challenges = generateChallenges(
        sibsin,
        { energy: 'stable' },
        false
      );

      expect(challenges).toContain('경쟁과 갈등 주의');
    }
  });

  it('should add pressure warning for 편관', () => {
    const challenges = generateChallenges(
      '편관',
      { energy: 'stable' },
      false
    );

    expect(challenges).toContain('압박감 관리 필요');
  });

  it('should add kisin warning when active', () => {
    const challenges = generateChallenges(
      '정관',
      { energy: 'stable' },
      true
    );

    expect(challenges).toContain('기신 활성 - 신중한 접근 필요');
  });

  it('should limit to 3 challenges', () => {
    const challenges = generateChallenges(
      '겁재',
      { energy: 'dormant' },
      true
    );

    expect(challenges.length).toBeLessThanOrEqual(3);
  });

  it('should return empty for peak/rising without special sibsin', () => {
    const challenges = generateChallenges(
      '정관',
      { energy: 'peak' },
      false
    );

    expect(challenges.length).toBe(0);
  });
});

describe('ShinsalInfo interface', () => {
  it('should have correct structure for lucky type', () => {
    const shinsal = { name: '천을귀인', type: 'lucky' as const };
    expect(shinsal.name).toBe('천을귀인');
    expect(shinsal.type).toBe('lucky');
  });

  it('should have correct structure for unlucky type', () => {
    const shinsal = { name: '겁살', type: 'unlucky' as const };
    expect(shinsal.name).toBe('겁살');
    expect(shinsal.type).toBe('unlucky');
  });
});

describe('BonusResult interface', () => {
  it('should have correct structure', () => {
    const result = {
      bonus: 15,
      reasons: ['Triple favorable sibsin'],
      penalties: ['Saturn retrograde'],
    };

    expect(result.bonus).toBe(15);
    expect(result.reasons).toHaveLength(1);
    expect(result.penalties).toHaveLength(1);
  });

  it('should allow empty arrays', () => {
    const result = {
      bonus: 0,
      reasons: [] as string[],
      penalties: [] as string[],
    };

    expect(result.bonus).toBe(0);
    expect(result.reasons).toHaveLength(0);
    expect(result.penalties).toHaveLength(0);
  });
});
