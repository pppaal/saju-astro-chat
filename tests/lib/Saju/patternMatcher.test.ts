// tests/lib/Saju/patternMatcher.test.ts
// 패턴 매칭 엔진 테스트


import {
  matchAllPatterns,
  matchPatternsByCategory,
  analyzePatterns,
  comparePatterns,
  getPatternRecommendations,
  createCustomPattern,
  searchPatterns,
  getPatternsByRarity,
  getPatternStatistics,
  PatternCategory,
  PatternMatch,
} from '@/lib/Saju/patternMatcher';
import type { SajuPillars, PillarData } from '@/lib/Saju/types';

// 테스트 헬퍼 함수
function createPillarData(stemName: string, branchName: string, sibsin?: string): PillarData {
  const stemElementMap: Record<string, '목' | '화' | '토' | '금' | '수'> = {
    '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
    '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
  };
  const branchElementMap: Record<string, '목' | '화' | '토' | '금' | '수'> = {
    '子': '수', '丑': '토', '寅': '목', '卯': '목', '辰': '토', '巳': '화',
    '午': '화', '未': '토', '申': '금', '酉': '금', '戌': '토', '亥': '수',
  };
  const stemYinYangMap: Record<string, '양' | '음'> = {
    '甲': '양', '乙': '음', '丙': '양', '丁': '음', '戊': '양',
    '己': '음', '庚': '양', '辛': '음', '壬': '양', '癸': '음',
  };

  return {
    heavenlyStem: {
      name: stemName,
      element: stemElementMap[stemName] || '토',
      yin_yang: stemYinYangMap[stemName] || '양',
      sibsin: sibsin || '비견',
    },
    earthlyBranch: {
      name: branchName,
      element: branchElementMap[branchName] || '토',
      yin_yang: '양',
      sibsin: sibsin || '비견',
    },
    jijanggan: {},
  };
}

function createTestPillars(
  year: [string, string, string?],
  month: [string, string, string?],
  day: [string, string, string?],
  time: [string, string, string?]
): SajuPillars {
  return {
    year: createPillarData(year[0], year[1], year[2]),
    month: createPillarData(month[0], month[1], month[2]),
    day: createPillarData(day[0], day[1], day[2]),
    time: createPillarData(time[0], time[1], time[2]),
  };
}

describe('patternMatcher', () => {
  describe('matchAllPatterns', () => {
    it('should return array of matched patterns', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const matches = matchAllPatterns(pillars);

      expect(Array.isArray(matches)).toBe(true);
    });

    it('should return patterns sorted by score descending', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const matches = matchAllPatterns(pillars);

      for (let i = 0; i < matches.length - 1; i++) {
        expect(matches[i].matchScore).toBeGreaterThanOrEqual(matches[i + 1].matchScore);
      }
    });

    it('should return patterns with all required fields', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const matches = matchAllPatterns(pillars);

      for (const match of matches) {
        expect(match.patternId).toBeTruthy();
        expect(match.patternName).toBeTruthy();
        expect(match.category).toBeTruthy();
        expect(match.matchScore).toBeGreaterThanOrEqual(0);
        expect(match.description).toBeTruthy();
        expect(match.interpretation).toBeTruthy();
        expect(Array.isArray(match.keywords)).toBe(true);
        expect(['common', 'uncommon', 'rare', 'very_rare', 'legendary']).toContain(match.rarity);
      }
    });

    it('should detect all_stems_different pattern when stems are unique', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const matches = matchAllPatterns(pillars);

      expect(matches.some(m => m.patternId === 'all_stems_different')).toBe(true);
    });

    it('should detect pure_element pattern when one element is dominant', () => {
      // 목이 매우 강한 사주
      const pillars = createTestPillars(
        ['甲', '寅'],
        ['甲', '卯'],
        ['甲', '寅'],
        ['乙', '卯']
      );

      const matches = matchAllPatterns(pillars);

      expect(matches.some(m => m.patternId === 'pure_element')).toBe(true);
    });

    it('should detect samhap_formation pattern', () => {
      // 寅午戌 삼합
      const pillars = createTestPillars(
        ['甲', '寅'],
        ['丙', '午'],
        ['戊', '戌'],
        ['庚', '子']
      );

      const matches = matchAllPatterns(pillars);

      expect(matches.some(m => m.patternId === 'samhap_formation')).toBe(true);
    });

    it('should detect yang_dominant pattern when all stems are yang', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['丙', '寅'],
        ['戊', '辰'],
        ['庚', '午']
      );

      const matches = matchAllPatterns(pillars);

      expect(matches.some(m => m.patternId === 'yang_dominant')).toBe(true);
    });

    it('should detect yin_dominant pattern when all stems are yin', () => {
      const pillars = createTestPillars(
        ['乙', '丑'],
        ['丁', '卯'],
        ['己', '巳'],
        ['辛', '未']
      );

      const matches = matchAllPatterns(pillars);

      expect(matches.some(m => m.patternId === 'yin_dominant')).toBe(true);
    });
  });

  describe('matchPatternsByCategory', () => {
    it('should return only patterns in specified category', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const matches = matchPatternsByCategory(pillars, 'special_structure');

      for (const match of matches) {
        expect(match.category).toBe('special_structure');
      }
    });

    it('should work with interaction category', () => {
      const pillars = createTestPillars(
        ['甲', '寅'],
        ['丙', '午'],
        ['戊', '戌'],
        ['庚', '子']
      );

      const matches = matchPatternsByCategory(pillars, 'interaction');

      for (const match of matches) {
        expect(match.category).toBe('interaction');
      }
    });

    it('should work with sibsin category', () => {
      const pillars = createTestPillars(
        ['甲', '子', '정관'],
        ['乙', '丑', '편관'],
        ['丙', '寅', '정관'],
        ['丁', '卯', '편관']
      );

      const matches = matchPatternsByCategory(pillars, 'sibsin');

      for (const match of matches) {
        expect(match.category).toBe('sibsin');
      }
    });

    it('should return sorted by score', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const matches = matchPatternsByCategory(pillars, 'element_balance');

      for (let i = 0; i < matches.length - 1; i++) {
        expect(matches[i].matchScore).toBeGreaterThanOrEqual(matches[i + 1].matchScore);
      }
    });
  });

  describe('analyzePatterns', () => {
    it('should return comprehensive pattern analysis', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const analysis = analyzePatterns(pillars);

      expect(analysis.pillars).toBeDefined();
      expect(analysis.matchedPatterns).toBeDefined();
      expect(analysis.patternSummary).toBeTruthy();
      expect(Array.isArray(analysis.uniqueTraits)).toBe(true);
      expect(Array.isArray(analysis.compatiblePatterns)).toBe(true);
    });

    it('should identify top pattern', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const analysis = analyzePatterns(pillars);

      if (analysis.matchedPatterns.length > 0) {
        expect(analysis.topPattern).toBeDefined();
        expect(analysis.topPattern?.matchScore).toBe(analysis.matchedPatterns[0].matchScore);
      } else {
        expect(analysis.topPattern).toBeNull();
      }
    });

    it('should identify unique traits from rare patterns', () => {
      // 희귀 패턴이 있는 사주
      const pillars = createTestPillars(
        ['甲', '寅'],
        ['甲', '卯'],
        ['甲', '寅'],
        ['乙', '卯']
      );

      const analysis = analyzePatterns(pillars);

      // uniqueTraits는 rare, very_rare, legendary 패턴의 이름들
      for (const trait of analysis.uniqueTraits) {
        const pattern = analysis.matchedPatterns.find(p => p.patternName === trait);
        if (pattern) {
          expect(['rare', 'very_rare', 'legendary']).toContain(pattern.rarity);
        }
      }
    });

    it('should generate pattern summary', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const analysis = analyzePatterns(pillars);

      expect(analysis.patternSummary).toBeTruthy();
      expect(typeof analysis.patternSummary).toBe('string');
    });
  });

  describe('comparePatterns', () => {
    it('should find common patterns between two pillars', () => {
      const pillars1 = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );
      const pillars2 = createTestPillars(
        ['甲', '辰'],
        ['乙', '巳'],
        ['丙', '午'],
        ['丁', '未']
      );

      const comparison = comparePatterns(pillars1, pillars2);

      expect(Array.isArray(comparison.commonPatterns)).toBe(true);
      expect(Array.isArray(comparison.uniqueToFirst)).toBe(true);
      expect(Array.isArray(comparison.uniqueToSecond)).toBe(true);
    });

    it('should calculate compatibility bonus based on common patterns', () => {
      const pillars1 = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );
      const pillars2 = createTestPillars(
        ['甲', '辰'],
        ['乙', '巳'],
        ['丙', '午'],
        ['丁', '未']
      );

      const comparison = comparePatterns(pillars1, pillars2);

      expect(comparison.compatibilityBonus).toBe(comparison.commonPatterns.length * 10);
    });

    it('should correctly separate unique patterns', () => {
      const pillars1 = createTestPillars(
        ['甲', '寅'],
        ['甲', '卯'],
        ['甲', '寅'],
        ['乙', '卯']
      );
      const pillars2 = createTestPillars(
        ['庚', '申'],
        ['辛', '酉'],
        ['庚', '申'],
        ['辛', '酉']
      );

      const comparison = comparePatterns(pillars1, pillars2);

      // uniqueToFirst에 있는 패턴은 pillars2에서 나온 패턴에 없어야 함
      const patterns2 = matchAllPatterns(pillars2).map(p => p.patternId);
      for (const patternId of comparison.uniqueToFirst) {
        expect(patterns2).not.toContain(patternId);
      }
    });
  });

  describe('getPatternRecommendations', () => {
    it('should return recommendations based on pattern keywords', () => {
      const patterns: PatternMatch[] = [
        {
          patternId: 'test1',
          patternName: 'Test Pattern 1',
          category: 'sibsin',
          matchScore: 80,
          description: 'Test',
          interpretation: 'Test interpretation',
          keywords: ['창의', '표현'],
          rarity: 'common',
        },
      ];

      const recommendations = getPatternRecommendations(patterns);

      expect(recommendations.careers).toContain('예술가');
      expect(recommendations.activities).toContain('창작 활동');
    });

    it('should recommend leadership careers for leadership keywords', () => {
      const patterns: PatternMatch[] = [
        {
          patternId: 'test2',
          patternName: 'Test Pattern 2',
          category: 'special_structure',
          matchScore: 90,
          description: 'Test',
          interpretation: 'Test interpretation',
          keywords: ['리더십', '권력'],
          rarity: 'rare',
        },
      ];

      const recommendations = getPatternRecommendations(patterns);

      expect(recommendations.careers).toContain('경영자');
      expect(recommendations.activities).toContain('팀 활동');
    });

    it('should recommend academic careers for 학문 keywords', () => {
      const patterns: PatternMatch[] = [
        {
          patternId: 'test3',
          patternName: 'Test Pattern 3',
          category: 'sibsin',
          matchScore: 75,
          description: 'Test',
          interpretation: 'Test interpretation',
          keywords: ['학문', '지혜'],
          rarity: 'common',
        },
      ];

      const recommendations = getPatternRecommendations(patterns);

      expect(recommendations.careers).toContain('연구원');
      expect(recommendations.activities).toContain('독서');
    });

    it('should add cautions for 변화 keywords', () => {
      const patterns: PatternMatch[] = [
        {
          patternId: 'test4',
          patternName: 'Test Pattern 4',
          category: 'interaction',
          matchScore: 70,
          description: 'Test',
          interpretation: 'Test interpretation',
          keywords: ['변화', '역동'],
          rarity: 'uncommon',
        },
      ];

      const recommendations = getPatternRecommendations(patterns);

      expect(recommendations.cautions.length).toBeGreaterThan(0);
    });

    it('should return unique values without duplicates', () => {
      const patterns: PatternMatch[] = [
        {
          patternId: 'test5',
          patternName: 'Test Pattern 5',
          category: 'sibsin',
          matchScore: 80,
          description: 'Test',
          interpretation: 'Test interpretation',
          keywords: ['창의', '표현'],
          rarity: 'common',
        },
        {
          patternId: 'test6',
          patternName: 'Test Pattern 6',
          category: 'sibsin',
          matchScore: 75,
          description: 'Test',
          interpretation: 'Test interpretation',
          keywords: ['창의', '리더십'],
          rarity: 'common',
        },
      ];

      const recommendations = getPatternRecommendations(patterns);

      // 중복 없어야 함
      const uniqueCareers = new Set(recommendations.careers);
      expect(recommendations.careers.length).toBe(uniqueCareers.size);
    });
  });

  describe('createCustomPattern', () => {
    it('should create pattern with element condition', () => {
      const pattern = createCustomPattern({
        id: 'custom_wood_strong',
        name: '목 강세 커스텀',
        category: 'element_balance',
        description: '목 오행이 강한 구조',
        rarity: 'uncommon',
        conditions: [
          { type: 'element', target: '목', count: 3, operator: '>=' },
        ],
        interpretation: '목 기운이 강합니다',
        keywords: ['목', '성장'],
      });

      expect(pattern.id).toBe('custom_wood_strong');
      expect(pattern.name).toBe('목 강세 커스텀');
      expect(pattern.matchFunction).toBeDefined();
    });

    it('should correctly match custom pattern', () => {
      const pattern = createCustomPattern({
        id: 'custom_metal_strong',
        name: '금 강세',
        category: 'element_balance',
        description: '금 오행이 강한 구조',
        rarity: 'uncommon',
        conditions: [
          { type: 'element', target: '금', count: 4, operator: '>=' },
        ],
        interpretation: '금 기운이 강합니다',
        keywords: ['금', '결단'],
      });

      // 금이 강한 사주
      const strongMetalPillars = createTestPillars(
        ['庚', '申'],
        ['辛', '酉'],
        ['庚', '申'],
        ['辛', '酉']
      );

      const result = pattern.matchFunction(strongMetalPillars);

      expect(result.matched).toBe(true);
    });
  });

  describe('searchPatterns', () => {
    it('should find patterns by name', () => {
      const results = searchPatterns('삼합');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(p => p.name.includes('삼합'))).toBe(true);
    });

    it('should find patterns by keyword', () => {
      const results = searchPatterns('창의');

      expect(results.length).toBeGreaterThan(0);
      for (const pattern of results) {
        const hasKeyword = pattern.keywords.some(k => k.includes('창의')) ||
          pattern.name.includes('창의') ||
          pattern.description.includes('창의');
        expect(hasKeyword).toBe(true);
      }
    });

    it('should be case insensitive for English', () => {
      const results1 = searchPatterns('balance');
      const results2 = searchPatterns('BALANCE');

      expect(results1.length).toBe(results2.length);
    });

    it('should return empty array when no match', () => {
      const results = searchPatterns('존재하지않는패턴xyz123');

      expect(results).toEqual([]);
    });
  });

  describe('getPatternsByRarity', () => {
    it('should return patterns filtered by rarity', () => {
      const rarePatterns = getPatternsByRarity('rare');

      for (const pattern of rarePatterns) {
        expect(pattern.rarity).toBe('rare');
      }
    });

    it('should return patterns for common rarity', () => {
      const commonPatterns = getPatternsByRarity('common');

      expect(commonPatterns.length).toBeGreaterThan(0);
      for (const pattern of commonPatterns) {
        expect(pattern.rarity).toBe('common');
      }
    });

    it('should return patterns for uncommon rarity', () => {
      const uncommonPatterns = getPatternsByRarity('uncommon');

      for (const pattern of uncommonPatterns) {
        expect(pattern.rarity).toBe('uncommon');
      }
    });
  });

  describe('getPatternStatistics', () => {
    it('should return correct total count', () => {
      const patterns: PatternMatch[] = [
        { patternId: '1', patternName: 'P1', category: 'sibsin', matchScore: 80, description: '', interpretation: '', keywords: [], rarity: 'common' },
        { patternId: '2', patternName: 'P2', category: 'interaction', matchScore: 70, description: '', interpretation: '', keywords: [], rarity: 'rare' },
        { patternId: '3', patternName: 'P3', category: 'sibsin', matchScore: 60, description: '', interpretation: '', keywords: [], rarity: 'common' },
      ];

      const stats = getPatternStatistics(patterns);

      expect(stats.totalCount).toBe(3);
    });

    it('should count patterns by category', () => {
      const patterns: PatternMatch[] = [
        { patternId: '1', patternName: 'P1', category: 'sibsin', matchScore: 80, description: '', interpretation: '', keywords: [], rarity: 'common' },
        { patternId: '2', patternName: 'P2', category: 'sibsin', matchScore: 70, description: '', interpretation: '', keywords: [], rarity: 'rare' },
        { patternId: '3', patternName: 'P3', category: 'interaction', matchScore: 60, description: '', interpretation: '', keywords: [], rarity: 'common' },
      ];

      const stats = getPatternStatistics(patterns);

      expect(stats.byCategory.sibsin).toBe(2);
      expect(stats.byCategory.interaction).toBe(1);
    });

    it('should count patterns by rarity', () => {
      const patterns: PatternMatch[] = [
        { patternId: '1', patternName: 'P1', category: 'sibsin', matchScore: 80, description: '', interpretation: '', keywords: [], rarity: 'common' },
        { patternId: '2', patternName: 'P2', category: 'sibsin', matchScore: 70, description: '', interpretation: '', keywords: [], rarity: 'common' },
        { patternId: '3', patternName: 'P3', category: 'interaction', matchScore: 60, description: '', interpretation: '', keywords: [], rarity: 'rare' },
      ];

      const stats = getPatternStatistics(patterns);

      expect(stats.byRarity.common).toBe(2);
      expect(stats.byRarity.rare).toBe(1);
    });

    it('should calculate average score', () => {
      const patterns: PatternMatch[] = [
        { patternId: '1', patternName: 'P1', category: 'sibsin', matchScore: 80, description: '', interpretation: '', keywords: [], rarity: 'common' },
        { patternId: '2', patternName: 'P2', category: 'sibsin', matchScore: 60, description: '', interpretation: '', keywords: [], rarity: 'rare' },
        { patternId: '3', patternName: 'P3', category: 'interaction', matchScore: 100, description: '', interpretation: '', keywords: [], rarity: 'common' },
      ];

      const stats = getPatternStatistics(patterns);

      expect(stats.averageScore).toBe(80); // (80 + 60 + 100) / 3
    });

    it('should handle empty patterns array', () => {
      const stats = getPatternStatistics([]);

      expect(stats.totalCount).toBe(0);
      expect(stats.averageScore).toBe(0);
    });
  });
});
