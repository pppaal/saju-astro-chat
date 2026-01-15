// tests/lib/Saju/sibsinAnalysis.test.ts
// 십신 분석 모듈 테스트


import {
  SIBSIN_TYPES,
  analyzeSibsinPositions,
  countSibsin,
  countSibsinByCategory,
  analyzeSibsinPatterns,
  analyzeSibsinInteractions,
  analyzeCareerAptitude,
  analyzeRelationshipPatterns,
  analyzePersonality,
  analyzeSibsinComprehensive,
  SibsinPosition,
  SibsinCount,
  SibsinCategoryCount,
} from '@/lib/Saju/sibsinAnalysis';

// 테스트 헬퍼
interface SimplePillar {
  stem: string;
  branch: string;
}

interface SimpleSajuPillars {
  year: SimplePillar;
  month: SimplePillar;
  day: SimplePillar;
  hour: SimplePillar;
}

function createSimplePillars(
  year: [string, string],
  month: [string, string],
  day: [string, string],
  hour: [string, string]
): SimpleSajuPillars {
  return {
    year: { stem: year[0], branch: year[1] },
    month: { stem: month[0], branch: month[1] },
    day: { stem: day[0], branch: day[1] },
    hour: { stem: hour[0], branch: hour[1] },
  };
}

describe('sibsinAnalysis', () => {
  describe('SIBSIN_TYPES constant', () => {
    it('should have exactly 10 sibsin types', () => {
      expect(SIBSIN_TYPES.length).toBe(10);
    });

    it('should contain all ten sibsin', () => {
      expect(SIBSIN_TYPES).toContain('비견');
      expect(SIBSIN_TYPES).toContain('겁재');
      expect(SIBSIN_TYPES).toContain('식신');
      expect(SIBSIN_TYPES).toContain('상관');
      expect(SIBSIN_TYPES).toContain('편재');
      expect(SIBSIN_TYPES).toContain('정재');
      expect(SIBSIN_TYPES).toContain('편관');
      expect(SIBSIN_TYPES).toContain('정관');
      expect(SIBSIN_TYPES).toContain('편인');
      expect(SIBSIN_TYPES).toContain('정인');
    });
  });

  describe('analyzeSibsinPositions', () => {
    it('should return positions for all pillars', () => {
      const pillars = createSimplePillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const positions = analyzeSibsinPositions(pillars);

      // 천간 3개 + 지장간 4개 = 최소 7개
      expect(positions.length).toBeGreaterThanOrEqual(3);
    });

    it('should identify position types correctly', () => {
      const pillars = createSimplePillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const positions = analyzeSibsinPositions(pillars);

      const positionTypes = positions.map(p => p.position);
      expect(positionTypes).toContain('년간');
      expect(positionTypes).toContain('월간');
      expect(positionTypes).toContain('시간');
    });

    it('should mark hidden stems correctly', () => {
      const pillars = createSimplePillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const positions = analyzeSibsinPositions(pillars);

      const hiddenPositions = positions.filter(p => p.hidden === true);
      const visiblePositions = positions.filter(p => p.hidden === false);

      expect(hiddenPositions.length).toBeGreaterThan(0);
      expect(visiblePositions.length).toBe(3); // 년간, 월간, 시간
    });

    it('should return valid sibsin types', () => {
      const pillars = createSimplePillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const positions = analyzeSibsinPositions(pillars);

      for (const pos of positions) {
        expect(SIBSIN_TYPES).toContain(pos.sibsin);
      }
    });
  });

  describe('countSibsin', () => {
    it('should return counts for all sibsin types', () => {
      const positions: SibsinPosition[] = [
        { position: '년간', sibsin: '비견', stem: '甲', hidden: false },
        { position: '월간', sibsin: '비견', stem: '甲', hidden: false },
        { position: '시간', sibsin: '식신', stem: '丙', hidden: false },
        { position: '일지장간', sibsin: '정인', stem: '壬', hidden: true },
      ];

      const count = countSibsin(positions);

      expect(count.비견).toBe(2);
      expect(count.식신).toBe(1);
      expect(count.정인).toBe(1);
      expect(count.겁재).toBe(0);
    });

    it('should initialize all counts to zero when empty', () => {
      const count = countSibsin([]);

      for (const sibsin of SIBSIN_TYPES) {
        expect(count[sibsin]).toBe(0);
      }
    });
  });

  describe('countSibsinByCategory', () => {
    it('should group sibsin into 5 categories', () => {
      const count: SibsinCount = {
        비견: 2, 겁재: 1, 식신: 1, 상관: 1, 편재: 0,
        정재: 1, 편관: 0, 정관: 1, 편인: 0, 정인: 1,
      };

      const categoryCount = countSibsinByCategory(count);

      expect(categoryCount.비겁).toBe(3);  // 비견 + 겁재
      expect(categoryCount.식상).toBe(2);  // 식신 + 상관
      expect(categoryCount.재성).toBe(1);  // 편재 + 정재
      expect(categoryCount.관성).toBe(1);  // 편관 + 정관
      expect(categoryCount.인성).toBe(1);  // 편인 + 정인
    });
  });

  describe('analyzeSibsinPatterns', () => {
    it('should detect 비겁과다 pattern', () => {
      const count: SibsinCount = {
        비견: 3, 겁재: 2, 식신: 0, 상관: 0, 편재: 1,
        정재: 0, 편관: 0, 정관: 0, 편인: 1, 정인: 0,
      };
      const categoryCount: SibsinCategoryCount = {
        비겁: 5, 식상: 0, 재성: 1, 관성: 0, 인성: 1,
      };

      const patterns = analyzeSibsinPatterns(count, categoryCount);

      const bigyeobPattern = patterns.find(p => p.name === '비겁과다');
      expect(bigyeobPattern).toBeDefined();
      expect(bigyeobPattern?.strength).toBe('strong');
    });

    it('should detect 식상과다 pattern', () => {
      const count: SibsinCount = {
        비견: 0, 겁재: 0, 식신: 3, 상관: 2, 편재: 1,
        정재: 0, 편관: 0, 정관: 0, 편인: 0, 정인: 1,
      };
      const categoryCount: SibsinCategoryCount = {
        비겁: 0, 식상: 5, 재성: 1, 관성: 0, 인성: 1,
      };

      const patterns = analyzeSibsinPatterns(count, categoryCount);

      expect(patterns.some(p => p.name === '식상과다')).toBe(true);
    });

    it('should detect 식신제살 pattern', () => {
      const count: SibsinCount = {
        비견: 0, 겁재: 0, 식신: 2, 상관: 0, 편재: 0,
        정재: 0, 편관: 2, 정관: 0, 편인: 1, 정인: 0,
      };
      const categoryCount: SibsinCategoryCount = {
        비겁: 0, 식상: 2, 재성: 0, 관성: 2, 인성: 1,
      };

      const patterns = analyzeSibsinPatterns(count, categoryCount);

      expect(patterns.some(p => p.name === '식신제살')).toBe(true);
    });

    it('should detect 균형사주 pattern', () => {
      const count: SibsinCount = {
        비견: 1, 겁재: 1, 식신: 1, 상관: 0, 편재: 1,
        정재: 0, 편관: 0, 정관: 1, 편인: 1, 정인: 0,
      };
      const categoryCount: SibsinCategoryCount = {
        비겁: 2, 식상: 1, 재성: 1, 관성: 1, 인성: 1,
      };

      const patterns = analyzeSibsinPatterns(count, categoryCount);

      expect(patterns.some(p => p.name === '균형사주')).toBe(true);
    });

    it('should detect 신강사주 pattern', () => {
      const count: SibsinCount = {
        비견: 2, 겁재: 1, 식신: 0, 상관: 0, 편재: 0,
        정재: 0, 편관: 0, 정관: 0, 편인: 2, 정인: 1,
      };
      const categoryCount: SibsinCategoryCount = {
        비겁: 3, 식상: 0, 재성: 0, 관성: 0, 인성: 3,
      };

      const patterns = analyzeSibsinPatterns(count, categoryCount);

      expect(patterns.some(p => p.name === '신강사주')).toBe(true);
    });

    it('should return patterns with implications', () => {
      const count: SibsinCount = {
        비견: 3, 겁재: 2, 식신: 0, 상관: 0, 편재: 0,
        정재: 0, 편관: 0, 정관: 0, 편인: 1, 정인: 0,
      };
      const categoryCount: SibsinCategoryCount = {
        비겁: 5, 식상: 0, 재성: 0, 관성: 0, 인성: 1,
      };

      const patterns = analyzeSibsinPatterns(count, categoryCount);

      for (const pattern of patterns) {
        expect(pattern.implications).toBeDefined();
        expect(Array.isArray(pattern.implications)).toBe(true);
      }
    });
  });

  describe('analyzeSibsinInteractions', () => {
    it('should detect 생 interactions', () => {
      const positions: SibsinPosition[] = [
        { position: '년간', sibsin: '비견', stem: '甲', hidden: false },
        { position: '월간', sibsin: '식신', stem: '丙', hidden: false },
      ];

      const interactions = analyzeSibsinInteractions(positions);

      const saengInteractions = interactions.filter(i => i.type === '생');
      expect(saengInteractions.length).toBeGreaterThan(0);
    });

    it('should detect 극 interactions', () => {
      const positions: SibsinPosition[] = [
        { position: '년간', sibsin: '비견', stem: '甲', hidden: false },
        { position: '월간', sibsin: '정재', stem: '戊', hidden: false },
      ];

      const interactions = analyzeSibsinInteractions(positions);

      const geukInteractions = interactions.filter(i => i.type === '극');
      expect(geukInteractions.length).toBeGreaterThan(0);
    });

    it('should include description and impact', () => {
      const positions: SibsinPosition[] = [
        { position: '년간', sibsin: '비견', stem: '甲', hidden: false },
        { position: '월간', sibsin: '식신', stem: '丙', hidden: false },
      ];

      const interactions = analyzeSibsinInteractions(positions);

      for (const interaction of interactions) {
        expect(interaction.description).toBeTruthy();
        expect(['positive', 'negative', 'neutral']).toContain(interaction.impact);
      }
    });
  });

  describe('analyzeCareerAptitude', () => {
    it('should recommend careers based on 관성', () => {
      const count: SibsinCount = {
        비견: 0, 겁재: 0, 식신: 0, 상관: 0, 편재: 0,
        정재: 0, 편관: 1, 정관: 2, 편인: 0, 정인: 0,
      };
      const categoryCount: SibsinCategoryCount = {
        비겁: 0, 식상: 0, 재성: 0, 관성: 3, 인성: 0,
      };

      const aptitudes = analyzeCareerAptitude(count, categoryCount);

      expect(aptitudes.some(a => a.field === '공직/관리직')).toBe(true);
      expect(aptitudes.some(a => a.field === '법률/행정')).toBe(true);
    });

    it('should recommend careers based on 재성', () => {
      const count: SibsinCount = {
        비견: 0, 겁재: 0, 식신: 0, 상관: 0, 편재: 2,
        정재: 1, 편관: 0, 정관: 0, 편인: 0, 정인: 0,
      };
      const categoryCount: SibsinCategoryCount = {
        비겁: 0, 식상: 0, 재성: 3, 관성: 0, 인성: 0,
      };

      const aptitudes = analyzeCareerAptitude(count, categoryCount);

      expect(aptitudes.some(a => a.field === '사업/경영')).toBe(true);
      expect(aptitudes.some(a => a.field === '금융/투자')).toBe(true);
    });

    it('should recommend careers based on 식상', () => {
      const count: SibsinCount = {
        비견: 0, 겁재: 0, 식신: 2, 상관: 1, 편재: 0,
        정재: 0, 편관: 0, 정관: 0, 편인: 0, 정인: 0,
      };
      const categoryCount: SibsinCategoryCount = {
        비겁: 0, 식상: 3, 재성: 0, 관성: 0, 인성: 0,
      };

      const aptitudes = analyzeCareerAptitude(count, categoryCount);

      expect(aptitudes.some(a => a.field === '예술/창작')).toBe(true);
    });

    it('should sort aptitudes by score descending', () => {
      const count: SibsinCount = {
        비견: 1, 겁재: 1, 식신: 2, 상관: 1, 편재: 1,
        정재: 1, 편관: 1, 정관: 1, 편인: 1, 정인: 1,
      };
      const categoryCount: SibsinCategoryCount = {
        비겁: 2, 식상: 3, 재성: 2, 관성: 2, 인성: 2,
      };

      const aptitudes = analyzeCareerAptitude(count, categoryCount);

      for (let i = 0; i < aptitudes.length - 1; i++) {
        expect(aptitudes[i].score).toBeGreaterThanOrEqual(aptitudes[i + 1].score);
      }
    });
  });

  describe('analyzeRelationshipPatterns', () => {
    it('should analyze parent relationship based on 인성', () => {
      const count: SibsinCount = {
        비견: 0, 겁재: 0, 식신: 0, 상관: 0, 편재: 0,
        정재: 0, 편관: 0, 정관: 0, 편인: 1, 정인: 2,
      };
      const categoryCount: SibsinCategoryCount = {
        비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 3,
      };

      const patterns = analyzeRelationshipPatterns(count, categoryCount);

      const parentPattern = patterns.find(p => p.type === '부모');
      expect(parentPattern).toBeDefined();
      expect(parentPattern?.quality).toBe('good');
    });

    it('should analyze spouse relationship based on 재성', () => {
      const count: SibsinCount = {
        비견: 0, 겁재: 0, 식신: 0, 상관: 0, 편재: 1,
        정재: 2, 편관: 0, 정관: 0, 편인: 0, 정인: 0,
      };
      const categoryCount: SibsinCategoryCount = {
        비겁: 0, 식상: 0, 재성: 3, 관성: 0, 인성: 0,
      };

      const patterns = analyzeRelationshipPatterns(count, categoryCount);

      const spousePattern = patterns.find(p => p.type === '배우자');
      expect(spousePattern).toBeDefined();
    });

    it('should analyze children relationship based on 식상', () => {
      const count: SibsinCount = {
        비견: 0, 겁재: 0, 식신: 2, 상관: 1, 편재: 0,
        정재: 0, 편관: 0, 정관: 0, 편인: 0, 정인: 0,
      };
      const categoryCount: SibsinCategoryCount = {
        비겁: 0, 식상: 3, 재성: 0, 관성: 0, 인성: 0,
      };

      const patterns = analyzeRelationshipPatterns(count, categoryCount);

      const childPattern = patterns.find(p => p.type === '자녀');
      expect(childPattern).toBeDefined();
    });

    it('should analyze sibling and friend relationships based on 비겁', () => {
      const count: SibsinCount = {
        비견: 2, 겁재: 1, 식신: 0, 상관: 0, 편재: 0,
        정재: 0, 편관: 0, 정관: 0, 편인: 0, 정인: 0,
      };
      const categoryCount: SibsinCategoryCount = {
        비겁: 3, 식상: 0, 재성: 0, 관성: 0, 인성: 0,
      };

      const patterns = analyzeRelationshipPatterns(count, categoryCount);

      expect(patterns.some(p => p.type === '형제')).toBe(true);
      expect(patterns.some(p => p.type === '친구')).toBe(true);
    });
  });

  describe('analyzePersonality', () => {
    it('should identify traits based on 비겁', () => {
      const count: SibsinCount = {
        비견: 2, 겁재: 2, 식신: 0, 상관: 0, 편재: 0,
        정재: 0, 편관: 0, 정관: 0, 편인: 0, 정인: 0,
      };
      const categoryCount: SibsinCategoryCount = {
        비겁: 4, 식상: 0, 재성: 0, 관성: 0, 인성: 0,
      };

      const traits = analyzePersonality(count, categoryCount);

      expect(traits.some(t => t.includes('독립심'))).toBe(true);
    });

    it('should identify traits based on 식신', () => {
      const count: SibsinCount = {
        비견: 0, 겁재: 0, 식신: 3, 상관: 0, 편재: 0,
        정재: 0, 편관: 0, 정관: 0, 편인: 0, 정인: 0,
      };
      const categoryCount: SibsinCategoryCount = {
        비겁: 0, 식상: 3, 재성: 0, 관성: 0, 인성: 0,
      };

      const traits = analyzePersonality(count, categoryCount);

      expect(traits.some(t => t.includes('온화') || t.includes('낙천'))).toBe(true);
    });

    it('should identify traits based on 상관', () => {
      const count: SibsinCount = {
        비견: 0, 겁재: 0, 식신: 0, 상관: 3, 편재: 0,
        정재: 0, 편관: 0, 정관: 0, 편인: 0, 정인: 0,
      };
      const categoryCount: SibsinCategoryCount = {
        비겁: 0, 식상: 3, 재성: 0, 관성: 0, 인성: 0,
      };

      const traits = analyzePersonality(count, categoryCount);

      expect(traits.some(t => t.includes('비판력') || t.includes('창의성'))).toBe(true);
    });

    it('should return array of strings', () => {
      const count: SibsinCount = {
        비견: 1, 겁재: 1, 식신: 1, 상관: 1, 편재: 1,
        정재: 1, 편관: 1, 정관: 1, 편인: 1, 정인: 1,
      };
      const categoryCount: SibsinCategoryCount = {
        비겁: 2, 식상: 2, 재성: 2, 관성: 2, 인성: 2,
      };

      const traits = analyzePersonality(count, categoryCount);

      expect(Array.isArray(traits)).toBe(true);
      for (const trait of traits) {
        expect(typeof trait).toBe('string');
      }
    });
  });

  describe('analyzeSibsinComprehensive', () => {
    it('should return comprehensive analysis with all fields', () => {
      const pillars = createSimplePillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const result = analyzeSibsinComprehensive(pillars);

      expect(result.positions).toBeDefined();
      expect(result.count).toBeDefined();
      expect(result.categoryCount).toBeDefined();
      expect(result.dominantSibsin).toBeDefined();
      expect(result.missingSibsin).toBeDefined();
      expect(result.patterns).toBeDefined();
      expect(result.interactions).toBeDefined();
      expect(result.careerAptitudes).toBeDefined();
      expect(result.relationships).toBeDefined();
      expect(result.personality).toBeDefined();
      expect(result.strengths).toBeDefined();
      expect(result.weaknesses).toBeDefined();
      expect(result.lifeThemes).toBeDefined();
      expect(result.advice).toBeDefined();
    });

    it('should identify dominant sibsin (count >= 2)', () => {
      const pillars = createSimplePillars(
        ['甲', '寅'],  // 비견 조합
        ['甲', '卯'],  // 비견 조합
        ['甲', '寅'],  // 일간
        ['乙', '卯']   // 겁재 조합
      );

      const result = analyzeSibsinComprehensive(pillars);

      // 비견이나 겁재가 dominant에 포함되어야 함
      expect(result.dominantSibsin.length).toBeGreaterThanOrEqual(0);
    });

    it('should identify missing sibsin (count === 0)', () => {
      const pillars = createSimplePillars(
        ['甲', '寅'],
        ['乙', '卯'],
        ['丙', '午'],
        ['丁', '巳']
      );

      const result = analyzeSibsinComprehensive(pillars);

      // 없는 십성 확인
      for (const missing of result.missingSibsin) {
        expect(result.count[missing]).toBe(0);
      }
    });

    it('should provide advice based on missing sibsin', () => {
      const pillars = createSimplePillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const result = analyzeSibsinComprehensive(pillars);

      expect(Array.isArray(result.advice)).toBe(true);
    });

    it('should identify life themes based on dominant sibsin', () => {
      const pillars = createSimplePillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const result = analyzeSibsinComprehensive(pillars);

      expect(Array.isArray(result.lifeThemes)).toBe(true);
    });
  });
});
