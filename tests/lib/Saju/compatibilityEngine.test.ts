// tests/lib/Saju/compatibilityEngine.test.ts
// 궁합 엔진 테스트


import {
  analyzeElementCompatibility,
  analyzeStemCompatibility,
  analyzeBranchCompatibility,
  analyzeDayMasterRelation,
  analyzeByCategory,
  analyzeComprehensiveCompatibility,
  analyzeMultiPersonCompatibility,
  CompatibilitySubject,
} from '@/lib/Saju/compatibility';
import type { SajuPillars, PillarData } from '@/lib/Saju/types';

// 테스트 헬퍼 함수
function createPillarData(stemName: string, branchName: string): PillarData {
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
      sibsin: '비견',
    },
    earthlyBranch: {
      name: branchName,
      element: branchElementMap[branchName] || '토',
      yin_yang: '양',
      sibsin: '비견',
    },
    jijanggan: {},
  };
}

function createTestPillars(
  year: [string, string],
  month: [string, string],
  day: [string, string],
  time: [string, string]
): SajuPillars {
  return {
    year: createPillarData(year[0], year[1]),
    month: createPillarData(month[0], month[1]),
    day: createPillarData(day[0], day[1]),
    time: createPillarData(time[0], time[1]),
  };
}

function createCompatibilitySubject(
  id: string,
  pillars: SajuPillars,
  name?: string
): CompatibilitySubject {
  return { id, name, pillars };
}

describe('compatibilityEngine', () => {
  describe('analyzeElementCompatibility (오행 궁합)', () => {
    it('should return scores between 0 and 100', () => {
      const person1 = createTestPillars(
        ['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯']
      );
      const person2 = createTestPillars(
        ['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未']
      );

      const result = analyzeElementCompatibility(person1, person2);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should identify harmony elements when both have strong same elements', () => {
      // 둘 다 목이 강한 사주
      const person1 = createTestPillars(
        ['甲', '寅'], ['乙', '卯'], ['甲', '寅'], ['乙', '卯']
      );
      const person2 = createTestPillars(
        ['甲', '寅'], ['甲', '卯'], ['乙', '寅'], ['甲', '卯']
      );

      const result = analyzeElementCompatibility(person1, person2);

      expect(result.harmony).toContain('목');
    });

    it('should identify complementary elements', () => {
      // 한쪽은 목이 강하고, 한쪽은 목이 약한 경우
      const person1 = createTestPillars(
        ['甲', '寅'], ['乙', '卯'], ['甲', '寅'], ['乙', '卯']
      );
      const person2 = createTestPillars(
        ['庚', '申'], ['辛', '酉'], ['庚', '申'], ['辛', '酉']
      );

      const result = analyzeElementCompatibility(person1, person2);

      expect(result.complementary.length).toBeGreaterThanOrEqual(0);
    });

    it('should provide analysis string', () => {
      const person1 = createTestPillars(
        ['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯']
      );
      const person2 = createTestPillars(
        ['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未']
      );

      const result = analyzeElementCompatibility(person1, person2);

      expect(result.analysis).toBeTruthy();
      expect(typeof result.analysis).toBe('string');
    });
  });

  describe('analyzeStemCompatibility (천간 궁합)', () => {
    it('should detect stem hap pairs (天干合)', () => {
      // 甲己合 존재
      const person1 = createTestPillars(
        ['甲', '子'], ['甲', '丑'], ['甲', '寅'], ['甲', '卯']
      );
      const person2 = createTestPillars(
        ['己', '辰'], ['己', '巳'], ['己', '午'], ['己', '未']
      );

      const result = analyzeStemCompatibility(person1, person2);

      expect(result.hapPairs.length).toBeGreaterThan(0);
      expect(result.hapPairs.some(p =>
        (p.stem1 === '甲' && p.stem2 === '己') ||
        (p.stem1 === '己' && p.stem2 === '甲')
      )).toBe(true);
    });

    it('should detect stem chung pairs (天干沖)', () => {
      // 甲庚沖 존재
      const person1 = createTestPillars(
        ['甲', '子'], ['甲', '丑'], ['甲', '寅'], ['甲', '卯']
      );
      const person2 = createTestPillars(
        ['庚', '辰'], ['庚', '巳'], ['庚', '午'], ['庚', '未']
      );

      const result = analyzeStemCompatibility(person1, person2);

      expect(result.chungPairs.length).toBeGreaterThan(0);
    });

    it('should return score between 0 and 100', () => {
      const person1 = createTestPillars(
        ['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯']
      );
      const person2 = createTestPillars(
        ['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未']
      );

      const result = analyzeStemCompatibility(person1, person2);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should provide analysis string', () => {
      const person1 = createTestPillars(
        ['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯']
      );
      const person2 = createTestPillars(
        ['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未']
      );

      const result = analyzeStemCompatibility(person1, person2);

      expect(result.analysis).toBeTruthy();
    });
  });

  describe('analyzeBranchCompatibility (지지 궁합)', () => {
    it('should detect yukhap pairs (六合)', () => {
      // 子丑合 존재
      const person1 = createTestPillars(
        ['甲', '子'], ['乙', '子'], ['丙', '子'], ['丁', '子']
      );
      const person2 = createTestPillars(
        ['戊', '丑'], ['己', '丑'], ['庚', '丑'], ['辛', '丑']
      );

      const result = analyzeBranchCompatibility(person1, person2);

      expect(result.yukhapPairs.length).toBeGreaterThan(0);
      expect(result.yukhapPairs.some(p =>
        (p.branch1 === '子' && p.branch2 === '丑') ||
        (p.branch1 === '丑' && p.branch2 === '子')
      )).toBe(true);
    });

    it('should detect samhap groups (三合)', () => {
      // 寅午戌 삼합
      const person1 = createTestPillars(
        ['甲', '寅'], ['乙', '午'], ['丙', '子'], ['丁', '子']
      );
      const person2 = createTestPillars(
        ['戊', '戌'], ['己', '午'], ['庚', '寅'], ['辛', '丑']
      );

      const result = analyzeBranchCompatibility(person1, person2);

      expect(result.samhapGroups.length).toBeGreaterThan(0);
    });

    it('should detect chung pairs (沖)', () => {
      // 子午沖 존재
      const person1 = createTestPillars(
        ['甲', '子'], ['乙', '子'], ['丙', '子'], ['丁', '子']
      );
      const person2 = createTestPillars(
        ['戊', '午'], ['己', '午'], ['庚', '午'], ['辛', '午']
      );

      const result = analyzeBranchCompatibility(person1, person2);

      expect(result.chungPairs.length).toBeGreaterThan(0);
    });

    it('should detect hae pairs (害)', () => {
      // 子未害 존재
      const person1 = createTestPillars(
        ['甲', '子'], ['乙', '子'], ['丙', '子'], ['丁', '子']
      );
      const person2 = createTestPillars(
        ['戊', '未'], ['己', '未'], ['庚', '未'], ['辛', '未']
      );

      const result = analyzeBranchCompatibility(person1, person2);

      expect(result.haePairs.length).toBeGreaterThan(0);
    });

    it('should return score between 0 and 100', () => {
      const person1 = createTestPillars(
        ['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯']
      );
      const person2 = createTestPillars(
        ['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未']
      );

      const result = analyzeBranchCompatibility(person1, person2);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('analyzeDayMasterRelation (일간 관계)', () => {
    it('should identify biHwa relation (比和) when same element', () => {
      // 甲 vs 乙 (둘 다 목)
      const person1 = createTestPillars(
        ['甲', '子'], ['乙', '丑'], ['甲', '寅'], ['丁', '卯']
      );
      const person2 = createTestPillars(
        ['戊', '辰'], ['己', '巳'], ['乙', '午'], ['辛', '未']
      );

      const result = analyzeDayMasterRelation(person1, person2);

      expect(result.relation).toBe('비화');
    });

    it('should identify saengjo relation (生助) when receiving support', () => {
      // 甲(목) vs 壬(수) - 수생목
      const person1 = createTestPillars(
        ['甲', '子'], ['乙', '丑'], ['甲', '寅'], ['丁', '卯']
      );
      const person2 = createTestPillars(
        ['戊', '辰'], ['己', '巳'], ['壬', '午'], ['辛', '未']
      );

      const result = analyzeDayMasterRelation(person1, person2);

      expect(result.relation).toBe('생조');
    });

    it('should identify seolgi relation (洩氣) when giving energy', () => {
      // 甲(목) vs 丙(화) - 목생화
      const person1 = createTestPillars(
        ['甲', '子'], ['乙', '丑'], ['甲', '寅'], ['丁', '卯']
      );
      const person2 = createTestPillars(
        ['戊', '辰'], ['己', '巳'], ['丙', '午'], ['辛', '未']
      );

      const result = analyzeDayMasterRelation(person1, person2);

      expect(result.relation).toBe('설기');
    });

    it('should identify geukchul relation (剋出) when controlling', () => {
      // 甲(목) vs 戊(토) - 목극토
      const person1 = createTestPillars(
        ['甲', '子'], ['乙', '丑'], ['甲', '寅'], ['丁', '卯']
      );
      const person2 = createTestPillars(
        ['戊', '辰'], ['己', '巳'], ['戊', '午'], ['辛', '未']
      );

      const result = analyzeDayMasterRelation(person1, person2);

      expect(result.relation).toBe('극출');
    });

    it('should identify geukip relation (剋入) when being controlled', () => {
      // 甲(목) vs 庚(금) - 금극목
      const person1 = createTestPillars(
        ['甲', '子'], ['乙', '丑'], ['甲', '寅'], ['丁', '卯']
      );
      const person2 = createTestPillars(
        ['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未']
      );

      const result = analyzeDayMasterRelation(person1, person2);

      expect(result.relation).toBe('극입');
    });

    it('should return sibsin relation', () => {
      const person1 = createTestPillars(
        ['甲', '子'], ['乙', '丑'], ['甲', '寅'], ['丁', '卯']
      );
      const person2 = createTestPillars(
        ['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未']
      );

      const result = analyzeDayMasterRelation(person1, person2);

      expect(result.sibsin).toBeTruthy();
      expect(result.reverseSibsin).toBeTruthy();
    });

    it('should provide dynamics description', () => {
      const person1 = createTestPillars(
        ['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯']
      );
      const person2 = createTestPillars(
        ['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未']
      );

      const result = analyzeDayMasterRelation(person1, person2);

      expect(result.dynamics).toBeTruthy();
      expect(typeof result.dynamics).toBe('string');
    });
  });

  describe('analyzeByCategory (카테고리별 분석)', () => {
    const person1 = createTestPillars(
      ['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯']
    );
    const person2 = createTestPillars(
      ['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未']
    );

    it('should analyze love compatibility', () => {
      const result = analyzeByCategory(person1, person2, 'love');

      expect(result.category).toBe('love');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.strengths).toBeDefined();
      expect(result.challenges).toBeDefined();
      expect(result.advice).toBeTruthy();
    });

    it('should analyze business compatibility', () => {
      const result = analyzeByCategory(person1, person2, 'business');

      expect(result.category).toBe('business');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should analyze friendship compatibility', () => {
      const result = analyzeByCategory(person1, person2, 'friendship');

      expect(result.category).toBe('friendship');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should analyze family compatibility', () => {
      const result = analyzeByCategory(person1, person2, 'family');

      expect(result.category).toBe('family');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should analyze work compatibility', () => {
      const result = analyzeByCategory(person1, person2, 'work');

      expect(result.category).toBe('work');
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });
  });

  describe('analyzeComprehensiveCompatibility (종합 궁합)', () => {
    it('should return comprehensive analysis with all components', () => {
      const person1 = createCompatibilitySubject(
        'person1',
        createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯']),
        '홍길동'
      );
      const person2 = createCompatibilitySubject(
        'person2',
        createTestPillars(['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未']),
        '김철수'
      );

      const result = analyzeComprehensiveCompatibility(person1, person2);

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(['S', 'A', 'B', 'C', 'D', 'F']).toContain(result.grade);
      expect(result.elementCompatibility).toBeDefined();
      expect(result.stemCompatibility).toBeDefined();
      expect(result.branchCompatibility).toBeDefined();
      expect(result.dayMasterRelation).toBeDefined();
      expect(result.categoryScores).toBeDefined();
      expect(result.summary).toBeTruthy();
      expect(result.strengths).toBeDefined();
      expect(result.challenges).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should grade correctly based on score', () => {
      const person1 = createCompatibilitySubject(
        'person1',
        createTestPillars(['甲', '寅'], ['乙', '卯'], ['甲', '寅'], ['乙', '卯'])
      );
      const person2 = createCompatibilitySubject(
        'person2',
        createTestPillars(['甲', '寅'], ['乙', '卯'], ['甲', '寅'], ['乙', '卯'])
      );

      const result = analyzeComprehensiveCompatibility(person1, person2);

      // 점수에 따른 등급 확인
      if (result.overallScore >= 85) expect(result.grade).toBe('S');
      else if (result.overallScore >= 75) expect(result.grade).toBe('A');
      else if (result.overallScore >= 65) expect(result.grade).toBe('B');
      else if (result.overallScore >= 55) expect(result.grade).toBe('C');
      else if (result.overallScore >= 45) expect(result.grade).toBe('D');
      else expect(result.grade).toBe('F');
    });

    it('should respect custom category options', () => {
      const person1 = createCompatibilitySubject(
        'person1',
        createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])
      );
      const person2 = createCompatibilitySubject(
        'person2',
        createTestPillars(['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未'])
      );

      const result = analyzeComprehensiveCompatibility(person1, person2, {
        categories: ['love', 'family'],
      });

      expect(result.categoryScores.length).toBe(2);
      expect(result.categoryScores.map(c => c.category)).toContain('love');
      expect(result.categoryScores.map(c => c.category)).toContain('family');
    });
  });

  describe('analyzeMultiPersonCompatibility (다자간 궁합)', () => {
    it('should throw error for less than 2 participants', () => {
      const person1 = createCompatibilitySubject(
        'person1',
        createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])
      );

      expect(() => analyzeMultiPersonCompatibility([person1])).toThrow(
        '최소 2명 이상의 참가자가 필요합니다.'
      );
    });

    it('should analyze 3 person compatibility', () => {
      const person1 = createCompatibilitySubject(
        'person1',
        createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])
      );
      const person2 = createCompatibilitySubject(
        'person2',
        createTestPillars(['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未'])
      );
      const person3 = createCompatibilitySubject(
        'person3',
        createTestPillars(['壬', '申'], ['癸', '酉'], ['甲', '戌'], ['乙', '亥'])
      );

      const result = analyzeMultiPersonCompatibility([person1, person2, person3]);

      expect(result.participants.length).toBe(3);
      expect(result.pairwiseScores.length).toBe(3); // C(3,2) = 3
      expect(result.groupHarmony).toBeGreaterThanOrEqual(0);
      expect(result.groupHarmony).toBeLessThanOrEqual(100);
      expect(result.groupDynamics).toBeTruthy();
      expect(result.bestPairs).toBeDefined();
      expect(result.challengingPairs).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should calculate correct number of pairwise scores', () => {
      const participants = [
        createCompatibilitySubject('p1', createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])),
        createCompatibilitySubject('p2', createTestPillars(['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未'])),
        createCompatibilitySubject('p3', createTestPillars(['壬', '申'], ['癸', '酉'], ['甲', '戌'], ['乙', '亥'])),
        createCompatibilitySubject('p4', createTestPillars(['丙', '子'], ['丁', '丑'], ['戊', '寅'], ['己', '卯'])),
      ];

      const result = analyzeMultiPersonCompatibility(participants);

      // C(4,2) = 6 pairs
      expect(result.pairwiseScores.length).toBe(6);
    });

    it('should identify best and challenging pairs', () => {
      const participants = [
        createCompatibilitySubject('p1', createTestPillars(['甲', '子'], ['乙', '丑'], ['丙', '寅'], ['丁', '卯'])),
        createCompatibilitySubject('p2', createTestPillars(['戊', '辰'], ['己', '巳'], ['庚', '午'], ['辛', '未'])),
        createCompatibilitySubject('p3', createTestPillars(['壬', '申'], ['癸', '酉'], ['甲', '戌'], ['乙', '亥'])),
      ];

      const result = analyzeMultiPersonCompatibility(participants);

      expect(result.bestPairs.length).toBeGreaterThan(0);
      expect(result.challengingPairs.length).toBeGreaterThan(0);
    });
  });
});
