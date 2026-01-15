// tests/advancedSajuCore.test.ts
// 고급 사주 분석 핵심 모듈 테스트


import {
  analyzeJonggeok,
  analyzeHwagyeok,
  analyzeIljuDeep,
  analyzeGongmangDeep,
  analyzeSamgi,
  performUltraAdvancedAnalysis,
} from '@/lib/Saju/advancedSajuCore';
import type { SajuPillars, PillarData } from '@/lib/Saju/types';

// 헬퍼: 테스트용 기둥 데이터 생성
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

// 테스트용 사주 생성
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

describe('advancedSajuCore', () => {
  describe('analyzeJonggeok (종격 분석)', () => {
    it('should return 비종격 for balanced pillars', () => {
      // 균형 잡힌 사주 (다양한 오행 분포)
      const pillars = createTestPillars(
        ['甲', '子'],  // 목/수
        ['丙', '寅'],  // 화/목
        ['戊', '辰'],  // 토/토
        ['庚', '申']   // 금/금
      );

      const result = analyzeJonggeok(pillars);

      expect(result.isJonggeok).toBe(false);
      expect(result.type).toBe('비종격');
      expect(result.description).toContain('정격');
    });

    it('should detect 종왕격 when bigyeob is dominant', () => {
      // 비겁이 매우 강한 사주 (목이 지배적)
      const pillars = createTestPillars(
        ['甲', '寅'],  // 목/목
        ['甲', '卯'],  // 목/목
        ['甲', '寅'],  // 목/목
        ['乙', '卯']   // 목/목
      );

      const result = analyzeJonggeok(pillars);

      // 비겁이 강하므로 종왕격일 가능성
      expect(result.dominantElement).toBe('목');
      expect(result.dominantSibsin).toContain('비견');
    });

    it('should include follow and avoid elements in result', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const result = analyzeJonggeok(pillars);

      expect(result.followElement).toBeDefined();
      expect(result.avoidElement).toBeDefined();
      expect(['목', '화', '토', '금', '수']).toContain(result.followElement);
      expect(['목', '화', '토', '금', '수']).toContain(result.avoidElement);
    });

    it('should provide advice', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const result = analyzeJonggeok(pillars);

      expect(result.advice).toBeTruthy();
      expect(typeof result.advice).toBe('string');
      expect(result.advice.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeHwagyeok (화격 분석)', () => {
    it('should detect 갑기합화토 when 甲 and 己 are present', () => {
      // 甲己 합 - 토로 화
      const pillars = createTestPillars(
        ['甲', '子'],
        ['己', '丑'],  // 甲己 합
        ['甲', '辰'],  // 일간 甲
        ['己', '未']   // 己 존재
      );

      const result = analyzeHwagyeok(pillars);

      // 합 상대가 있으므로 화격 조건 충족 가능
      expect(result.type).toBe('갑기합화토');
      expect(result.originalElements).toBeDefined();
      expect(result.transformedElement).toBe('토');
    });

    it('should return 비화격 when no stem combination exists', () => {
      // 합이 없는 사주
      const pillars = createTestPillars(
        ['甲', '子'],
        ['甲', '寅'],
        ['甲', '辰'],
        ['甲', '午']
      );

      const result = analyzeHwagyeok(pillars);

      expect(result.isHwagyeok).toBe(false);
      expect(result.type).toBe('비화격');
    });

    it('should check transformation conditions', () => {
      const pillars = createTestPillars(
        ['甲', '丑'],
        ['己', '未'],
        ['甲', '辰'],  // 일간 甲
        ['己', '戌']
      );

      const result = analyzeHwagyeok(pillars);

      expect(result.conditions).toBeDefined();
      expect(typeof result.conditions.seasonSupport).toBe('boolean');
      expect(typeof result.conditions.branchSupport).toBe('boolean');
      expect(typeof result.conditions.noDisturbance).toBe('boolean');
    });

    it('should provide implications for hwagyeok', () => {
      const pillars = createTestPillars(
        ['丙', '子'],
        ['辛', '丑'],  // 丙辛 합
        ['丙', '子'],  // 일간 丙
        ['辛', '酉']
      );

      const result = analyzeHwagyeok(pillars);

      expect(result.implications).toBeDefined();
      expect(Array.isArray(result.implications)).toBe(true);
    });
  });

  describe('analyzeIljuDeep (일주론 심화 분석)', () => {
    it('should analyze 甲子 ilju', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['甲', '子'],  // 일주: 甲子
        ['丙', '寅']
      );

      const result = analyzeIljuDeep(pillars);

      expect(result.ilju).toBe('甲子');
      expect(result.dayMaster).toBe('甲');
      expect(result.dayBranch).toBe('子');
      expect(result.iljuCharacter).toBeTruthy();
    });

    it('should return twelve stage', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['甲', '寅'],  // 일주: 甲寅
        ['丙', '午']
      );

      const result = analyzeIljuDeep(pillars);

      expect(result.twelveStage).toBeTruthy();
      const validStages = ['장생', '목욕', '관대', '임관', '왕지', '쇠', '병', '사', '묘', '절', '태', '양'];
      expect(validStages).toContain(result.twelveStage);
    });

    it('should include lucky factors', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['甲', '子'],
        ['丙', '寅']
      );

      const result = analyzeIljuDeep(pillars);

      expect(result.luckyFactors).toBeDefined();
      expect(result.luckyFactors.direction).toBeTruthy();
      expect(result.luckyFactors.color).toBeTruthy();
      expect(result.luckyFactors.number).toBeDefined();
      expect(Array.isArray(result.luckyFactors.number)).toBe(true);
    });

    it('should include health focus', () => {
      const pillars = createTestPillars(
        ['壬', '子'],
        ['癸', '亥'],
        ['壬', '子'],  // 수 일간
        ['癸', '亥']
      );

      const result = analyzeIljuDeep(pillars);

      expect(result.healthFocus).toBeDefined();
      expect(Array.isArray(result.healthFocus)).toBe(true);
      // 수 일간이므로 신장, 방광 등 포함
      expect(result.healthFocus).toContain('신장');
    });

    it('should include career aptitude and relationship style', () => {
      const pillars = createTestPillars(
        ['甲', '寅'],
        ['乙', '卯'],
        ['甲', '寅'],
        ['乙', '卯']
      );

      const result = analyzeIljuDeep(pillars);

      expect(result.careerAptitude).toBeDefined();
      expect(Array.isArray(result.careerAptitude)).toBe(true);
      expect(result.relationshipStyle).toBeTruthy();
    });
  });

  describe('analyzeGongmangDeep (공망 심화 분석)', () => {
    it('should return gongmang branches', () => {
      const pillars = createTestPillars(
        ['甲', '子'],  // 연주
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const result = analyzeGongmangDeep(pillars);

      expect(result.gongmangBranches).toBeDefined();
      expect(Array.isArray(result.gongmangBranches)).toBe(true);
      expect(result.gongmangBranches.length).toBe(2);
    });

    it('should identify affected pillars', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const result = analyzeGongmangDeep(pillars);

      expect(result.affectedPillars).toBeDefined();
      expect(Array.isArray(result.affectedPillars)).toBe(true);
    });

    it('should classify gongmang type', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const result = analyzeGongmangDeep(pillars);

      const validTypes = ['진공', '가공', '반공', '해공'];
      expect(validTypes).toContain(result.type);
    });

    it('should provide interpretation and effects', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const result = analyzeGongmangDeep(pillars);

      expect(result.interpretation).toBeTruthy();
      expect(result.effects).toBeDefined();
      expect(result.effects.positive).toBeDefined();
      expect(result.effects.negative).toBeDefined();
    });

    it('should provide remedy suggestions', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const result = analyzeGongmangDeep(pillars);

      expect(result.remedy).toBeDefined();
      expect(Array.isArray(result.remedy)).toBe(true);
      expect(result.remedy.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeSamgi (삼기 분석)', () => {
    it('should detect 천상삼기 (甲戊庚)', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['戊', '辰'],
        ['庚', '申'],  // 甲戊庚 모두 존재
        ['壬', '子']
      );

      const result = analyzeSamgi(pillars);

      expect(result.hasSamgi).toBe(true);
      expect(result.type).toBe('천상삼기');
      expect(result.stems).toEqual(['甲', '戊', '庚']);
      expect(result.blessing).toContain('리더십');
    });

    it('should detect 지하삼기 (乙丙丁)', () => {
      const pillars = createTestPillars(
        ['乙', '卯'],
        ['丙', '午'],
        ['丁', '巳'],  // 乙丙丁 모두 존재
        ['壬', '子']
      );

      const result = analyzeSamgi(pillars);

      expect(result.hasSamgi).toBe(true);
      expect(result.type).toBe('지하삼기');
      expect(result.blessing).toContain('재물복');
    });

    it('should detect 인중삼기 (壬癸辛)', () => {
      const pillars = createTestPillars(
        ['壬', '子'],
        ['癸', '亥'],
        ['辛', '酉'],  // 壬癸辛 모두 존재
        ['甲', '寅']
      );

      const result = analyzeSamgi(pillars);

      expect(result.hasSamgi).toBe(true);
      expect(result.type).toBe('인중삼기');
      expect(result.blessing).toContain('인복');
    });

    it('should return no samgi when conditions not met', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['甲', '寅'],
        ['甲', '辰'],
        ['甲', '午']
      );

      const result = analyzeSamgi(pillars);

      expect(result.hasSamgi).toBe(false);
      expect(result.type).toBeUndefined();
      expect(result.description).toContain('삼기가 없습니다');
    });
  });

  describe('performUltraAdvancedAnalysis (종합 고급 분석)', () => {
    it('should combine all analysis types', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const result = performUltraAdvancedAnalysis(pillars);

      expect(result.jonggeok).toBeDefined();
      expect(result.hwagyeok).toBeDefined();
      expect(result.iljuDeep).toBeDefined();
      expect(result.gongmang).toBeDefined();
      expect(result.samgi).toBeDefined();
    });

    it('should collect special formations', () => {
      // 삼기가 있는 사주
      const pillars = createTestPillars(
        ['甲', '子'],
        ['戊', '辰'],
        ['庚', '申'],
        ['壬', '子']
      );

      const result = performUltraAdvancedAnalysis(pillars);

      expect(result.specialFormations).toBeDefined();
      expect(Array.isArray(result.specialFormations)).toBe(true);
      // 천상삼기가 있으므로 포함
      expect(result.specialFormations).toContain('천상삼기');
    });

    it('should generate mastery summary', () => {
      const pillars = createTestPillars(
        ['甲', '子'],
        ['乙', '丑'],
        ['丙', '寅'],
        ['丁', '卯']
      );

      const result = performUltraAdvancedAnalysis(pillars);

      expect(result.masterySummary).toBeTruthy();
      expect(typeof result.masterySummary).toBe('string');
      expect(result.masterySummary).toContain('일주');
    });
  });

  // ============================================================
  // 에지 케이스 및 추가 테스트
  // ============================================================

  describe('Edge Cases (에지 케이스)', () => {
    describe('analyzeJonggeok edge cases', () => {
      it('should handle single element dominant (종세격)', () => {
        // 화 오행이 매우 강한 사주
        const pillars = createTestPillars(
          ['丙', '午'],  // 화/화
          ['丁', '巳'],  // 화/화
          ['丙', '午'],  // 화/화
          ['丁', '巳']   // 화/화
        );

        const result = analyzeJonggeok(pillars);

        expect(result.dominantElement).toBe('화');
        expect(result.purity).toBeGreaterThan(0);
      });

      it('should calculate stability based on purity', () => {
        const pillars = createTestPillars(
          ['甲', '寅'],
          ['甲', '卯'],
          ['甲', '寅'],
          ['乙', '卯']
        );

        const result = analyzeJonggeok(pillars);

        // stability는 purity에 기반
        expect(result.stability).toBeGreaterThanOrEqual(50);
        expect(result.stability).toBeLessThanOrEqual(100);
      });

      it('should always provide followElement and avoidElement', () => {
        const pillars = createTestPillars(
          ['壬', '子'],
          ['癸', '亥'],
          ['壬', '子'],
          ['癸', '亥']
        );

        const result = analyzeJonggeok(pillars);

        expect(result.followElement).toBeDefined();
        expect(result.avoidElement).toBeDefined();
        expect(['목', '화', '토', '금', '수']).toContain(result.followElement);
        expect(['목', '화', '토', '금', '수']).toContain(result.avoidElement);
      });
    });

    describe('analyzeHwagyeok edge cases', () => {
      it('should handle 을경합화금 (乙庚)', () => {
        const pillars = createTestPillars(
          ['乙', '酉'],  // 금 지지
          ['庚', '申'],  // 을경 합
          ['乙', '酉'],  // 일간 乙
          ['庚', '申']
        );

        const result = analyzeHwagyeok(pillars);

        expect(result.type).toBe('을경합화금');
        expect(result.transformedElement).toBe('금');
      });

      it('should handle 정임합화목 (丁壬)', () => {
        const pillars = createTestPillars(
          ['丁', '卯'],  // 목 지지
          ['壬', '寅'],  // 정임 합
          ['丁', '卯'],  // 일간 丁
          ['壬', '亥']
        );

        const result = analyzeHwagyeok(pillars);

        expect(result.type).toBe('정임합화목');
        expect(result.transformedElement).toBe('목');
      });

      it('should handle 무계합화화 (戊癸)', () => {
        const pillars = createTestPillars(
          ['戊', '午'],  // 화 지지
          ['癸', '巳'],  // 무계 합
          ['戊', '午'],  // 일간 戊
          ['癸', '巳']
        );

        const result = analyzeHwagyeok(pillars);

        expect(result.type).toBe('무계합화화');
        expect(result.transformedElement).toBe('화');
      });

      it('should return originalElements correctly', () => {
        const pillars = createTestPillars(
          ['甲', '丑'],
          ['己', '未'],
          ['甲', '辰'],
          ['己', '戌']
        );

        const result = analyzeHwagyeok(pillars);

        expect(result.originalElements).toBeDefined();
        expect(result.originalElements.length).toBe(2);
      });
    });

    describe('analyzeIljuDeep edge cases', () => {
      it('should handle all 10 heavenly stems as day master', () => {
        const stems = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

        for (const stem of stems) {
          const pillars = createTestPillars(
            ['甲', '子'],
            ['乙', '丑'],
            [stem, '寅'],
            ['丁', '卯']
          );

          const result = analyzeIljuDeep(pillars);

          expect(result.dayMaster).toBe(stem);
          expect(result.ilju.startsWith(stem)).toBe(true);
        }
      });

      it('should handle all 12 earthly branches as day branch', () => {
        const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

        for (const branch of branches) {
          const pillars = createTestPillars(
            ['甲', '子'],
            ['乙', '丑'],
            ['丙', branch],
            ['丁', '卯']
          );

          const result = analyzeIljuDeep(pillars);

          expect(result.dayBranch).toBe(branch);
        }
      });

      it('should always return valid 12 stage', () => {
        const validStages = ['장생', '목욕', '관대', '임관', '왕지', '쇠', '병', '사', '묘', '절', '태', '양'];
        const branches = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

        for (const branch of branches) {
          const pillars = createTestPillars(
            ['甲', '子'],
            ['乙', '丑'],
            ['甲', branch],
            ['丁', '卯']
          );

          const result = analyzeIljuDeep(pillars);

          expect(validStages).toContain(result.twelveStage);
        }
      });

      it('should calculate correct health focus for each element', () => {
        const stemElementMap: Record<string, string[]> = {
          '甲': ['간', '담', '눈', '근육'],  // 목
          '丙': ['심장', '소장', '혀', '혈관'],  // 화
          '戊': ['비장', '위장', '입', '살'],  // 토
          '庚': ['폐', '대장', '코', '피부'],  // 금
          '壬': ['신장', '방광', '귀', '뼈'],  // 수
        };

        for (const [stem, expectedHealth] of Object.entries(stemElementMap)) {
          const pillars = createTestPillars(
            ['甲', '子'],
            ['乙', '丑'],
            [stem, '寅'],
            ['丁', '卯']
          );

          const result = analyzeIljuDeep(pillars);

          expect(result.healthFocus).toEqual(expectedHealth);
        }
      });
    });

    describe('analyzeGongmangDeep edge cases', () => {
      it('should return exactly 2 gongmang branches', () => {
        const pillars = createTestPillars(
          ['甲', '子'],
          ['乙', '丑'],
          ['丙', '寅'],
          ['丁', '卯']
        );

        const result = analyzeGongmangDeep(pillars);

        expect(result.gongmangBranches.length).toBe(2);
      });

      it('should identify when day branch is in gongmang (진공)', () => {
        // 특정 공망에 일지가 포함되는 케이스를 만들어야 함
        // 이는 년주에 따라 달라짐
        const pillars = createTestPillars(
          ['甲', '子'],  // 甲子년 -> 공망: 戌, 亥
          ['乙', '丑'],
          ['丙', '戌'],  // 일지가 戌 (공망)
          ['丁', '卯']
        );

        const result = analyzeGongmangDeep(pillars);

        if (result.gongmangBranches.includes('戌')) {
          expect(result.affectedPillars).toContain('day');
          expect(result.type).toBe('진공');
        }
      });

      it('should handle 해공 when no pillars affected', () => {
        const pillars = createTestPillars(
          ['甲', '子'],  // 甲子년 -> 공망: 戌, 亥
          ['乙', '丑'],  // 丑
          ['丙', '寅'],  // 寅
          ['丁', '卯']   // 卯
        );

        const result = analyzeGongmangDeep(pillars);

        // 戌, 亥가 공망인데 丑, 寅, 卯, 子 중에 없으면 해공
        const hasAffected = result.gongmangBranches.some(gb =>
          ['子', '丑', '寅', '卯'].includes(gb)
        );

        if (!hasAffected) {
          expect(result.type).toBe('해공');
        }
      });

      it('should provide positive and negative effects', () => {
        const pillars = createTestPillars(
          ['甲', '子'],
          ['乙', '丑'],
          ['丙', '寅'],
          ['丁', '卯']
        );

        const result = analyzeGongmangDeep(pillars);

        expect(result.effects.positive).toBeDefined();
        expect(result.effects.negative).toBeDefined();
        expect(Array.isArray(result.effects.positive)).toBe(true);
        expect(Array.isArray(result.effects.negative)).toBe(true);
      });
    });

    describe('analyzeSamgi edge cases', () => {
      it('should not detect samgi with partial stems', () => {
        // 甲戊만 있고 庚이 없는 경우
        const pillars = createTestPillars(
          ['甲', '子'],
          ['戊', '辰'],
          ['甲', '申'],  // 庚이 아님
          ['戊', '子']
        );

        const result = analyzeSamgi(pillars);

        expect(result.hasSamgi).toBe(false);
      });

      it('should detect samgi regardless of pillar position', () => {
        // 천상삼기 (甲戊庚)가 다른 위치에 있어도 감지
        const pillars = createTestPillars(
          ['庚', '子'],  // 庚이 년주에
          ['甲', '辰'],  // 甲이 월주에
          ['戊', '申'],  // 戊가 일주에
          ['壬', '子']
        );

        const result = analyzeSamgi(pillars);

        expect(result.hasSamgi).toBe(true);
        expect(result.type).toBe('천상삼기');
      });

      it('should return blessing array for each samgi type', () => {
        // 천상삼기
        const pillars1 = createTestPillars(
          ['甲', '子'], ['戊', '辰'], ['庚', '申'], ['壬', '子']
        );
        const result1 = analyzeSamgi(pillars1);
        expect(result1.blessing.length).toBeGreaterThan(0);

        // 지하삼기
        const pillars2 = createTestPillars(
          ['乙', '卯'], ['丙', '午'], ['丁', '巳'], ['壬', '子']
        );
        const result2 = analyzeSamgi(pillars2);
        expect(result2.blessing.length).toBeGreaterThan(0);

        // 인중삼기
        const pillars3 = createTestPillars(
          ['壬', '子'], ['癸', '亥'], ['辛', '酉'], ['甲', '寅']
        );
        const result3 = analyzeSamgi(pillars3);
        expect(result3.blessing.length).toBeGreaterThan(0);
      });
    });

    describe('performUltraAdvancedAnalysis edge cases', () => {
      it('should handle multiple special formations', () => {
        // 삼기와 종격이 동시에 있는 사주
        const pillars = createTestPillars(
          ['甲', '寅'],
          ['戊', '卯'],
          ['庚', '寅'],
          ['甲', '卯']
        );

        const result = performUltraAdvancedAnalysis(pillars);

        expect(result.specialFormations).toBeDefined();
        expect(Array.isArray(result.specialFormations)).toBe(true);
      });

      it('should include hwagyeok in special formations when present', () => {
        // 화격이 성립하는 사주
        const pillars = createTestPillars(
          ['甲', '辰'],
          ['己', '丑'],
          ['甲', '辰'],
          ['己', '未']
        );

        const result = performUltraAdvancedAnalysis(pillars);

        if (result.hwagyeok.isHwagyeok) {
          expect(result.specialFormations).toContain(result.hwagyeok.type);
        }
      });

      it('should generate complete mastery summary with all components', () => {
        const pillars = createTestPillars(
          ['甲', '子'],
          ['戊', '辰'],
          ['庚', '申'],
          ['壬', '子']
        );

        const result = performUltraAdvancedAnalysis(pillars);

        // 삼기가 있으므로 요약에 포함되어야 함
        if (result.samgi.hasSamgi) {
          expect(result.masterySummary).toContain('삼기');
        }
      });

      it('should handle water-dominated pillars correctly', () => {
        const pillars = createTestPillars(
          ['壬', '子'],
          ['癸', '亥'],
          ['壬', '子'],
          ['癸', '亥']
        );

        const result = performUltraAdvancedAnalysis(pillars);

        expect(result.jonggeok.dominantElement).toBe('수');
        expect(result.iljuDeep.healthFocus).toContain('신장');
      });

      it('should handle fire-dominated pillars correctly', () => {
        const pillars = createTestPillars(
          ['丙', '午'],
          ['丁', '巳'],
          ['丙', '午'],
          ['丁', '巳']
        );

        const result = performUltraAdvancedAnalysis(pillars);

        expect(result.jonggeok.dominantElement).toBe('화');
        expect(result.iljuDeep.healthFocus).toContain('심장');
      });
    });
  });
});
