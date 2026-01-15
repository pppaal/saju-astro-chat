// tests/lib/Saju/astrologyengine.test.ts

import {
  analyzeStrength,
  analyzeGeokguk,
  analyzeYongsin,
  analyzeAdvancedSaju,
  evaluateElementInfluence,
  scoreUnseElement,
  analyzeRoot,
  getSeasonFromMonthBranch,
  analyzeJohuYongsin,
  analyzeExtendedSaju,
  StrengthLevel,
  GeokgukType,
  DaymasterStrengthAnalysis,
  GeokgukAnalysis,
  YongsinAnalysis,
  RootAnalysis,
  JohuYongsinAnalysis,
  Season,
} from '@/lib/Saju/astrologyengine';
import { FiveElement, YinYang } from '@/lib/Saju/types';

// 테스트용 헬퍼 함수
function createDayMaster(name: string, element: FiveElement, yin_yang: YinYang) {
  return { name, element, yin_yang };
}

function createPillarInput(
  stemName: string,
  stemElement: FiveElement,
  branchName: string,
  branchElement: FiveElement
) {
  return {
    heavenlyStem: { name: stemName, element: stemElement },
    earthlyBranch: { name: branchName, element: branchElement },
  };
}

function createTestPillars() {
  return {
    yearPillar: createPillarInput('甲', '목', '子', '수'),
    monthPillar: createPillarInput('丙', '화', '寅', '목'),
    dayPillar: createPillarInput('戊', '토', '午', '화'),
    timePillar: createPillarInput('庚', '금', '申', '금'),
  };
}

describe('astrologyengine', () => {
  describe('analyzeStrength', () => {
    it('should return StrengthAnalysis with all required fields', () => {
      const dayMaster = createDayMaster('戊', '토', '양');
      const pillars = createTestPillars();

      const result = analyzeStrength(dayMaster, pillars);

      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('helpingScore');
      expect(result).toHaveProperty('drainingScore');
      expect(result).toHaveProperty('monthBranchHelps');
      expect(result).toHaveProperty('seasonHelps');
      expect(result).toHaveProperty('details');
    });

    it('should have correct details structure', () => {
      const dayMaster = createDayMaster('戊', '토', '양');
      const pillars = createTestPillars();

      const result = analyzeStrength(dayMaster, pillars);

      expect(result.details).toHaveProperty('비겁');
      expect(result.details).toHaveProperty('인성');
      expect(result.details).toHaveProperty('식상');
      expect(result.details).toHaveProperty('재성');
      expect(result.details).toHaveProperty('관성');
    });

    describe('strength levels', () => {
      const levels: StrengthLevel[] = ['극신강', '신강', '중화', '신약', '극신약'];

      it('should return valid strength level', () => {
        const dayMaster = createDayMaster('戊', '토', '양');
        const pillars = createTestPillars();

        const result = analyzeStrength(dayMaster, pillars);

        expect(levels).toContain(result.level);
      });
    });

    describe('score range', () => {
      it('should return score between -100 and 100', () => {
        const dayMaster = createDayMaster('戊', '토', '양');
        const pillars = createTestPillars();

        const result = analyzeStrength(dayMaster, pillars);

        expect(result.score).toBeGreaterThanOrEqual(-100);
        expect(result.score).toBeLessThanOrEqual(100);
      });
    });

    describe('helping vs draining', () => {
      it('should correctly identify helping elements (비겁 + 인성)', () => {
        const dayMaster = createDayMaster('甲', '목', '양');
        const pillars = {
          yearPillar: createPillarInput('甲', '목', '寅', '목'), // 비겁
          monthPillar: createPillarInput('壬', '수', '子', '수'), // 인성
          dayPillar: createPillarInput('甲', '목', '卯', '목'),
          timePillar: createPillarInput('癸', '수', '亥', '수'), // 인성
        };

        const result = analyzeStrength(dayMaster, pillars);

        expect(result.helpingScore).toBeGreaterThan(0);
        expect(result.details.비겁 + result.details.인성).toBeGreaterThan(0);
      });

      it('should correctly identify draining elements (식상 + 재성 + 관성)', () => {
        const dayMaster = createDayMaster('甲', '목', '양');
        const pillars = {
          yearPillar: createPillarInput('丙', '화', '巳', '화'), // 식상
          monthPillar: createPillarInput('庚', '금', '申', '금'), // 관성
          dayPillar: createPillarInput('甲', '목', '午', '화'),
          timePillar: createPillarInput('戊', '토', '戌', '토'), // 재성
        };

        const result = analyzeStrength(dayMaster, pillars);

        expect(result.drainingScore).toBeGreaterThan(0);
      });
    });

    describe('month branch influence', () => {
      it('should detect when month branch helps day master', () => {
        const dayMaster = createDayMaster('甲', '목', '양');
        const pillars = {
          yearPillar: createPillarInput('甲', '목', '子', '수'),
          monthPillar: createPillarInput('甲', '목', '寅', '목'), // 목 월지가 목 일간을 도움
          dayPillar: createPillarInput('甲', '목', '午', '화'),
          timePillar: createPillarInput('甲', '목', '申', '금'),
        };

        const result = analyzeStrength(dayMaster, pillars);

        expect(result.monthBranchHelps).toBe(true);
      });
    });
  });

  describe('analyzeGeokguk', () => {
    it('should return GeokgukAnalysis with all required fields', () => {
      const dayMaster = createDayMaster('戊', '토', '양');
      const pillars = createTestPillars();
      const strength = analyzeStrength(dayMaster, pillars);

      const result = analyzeGeokguk(dayMaster, pillars, strength);

      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('basis');
    });

    describe('geokguk types', () => {
      const geokgukTypes: GeokgukType[] = [
        '정관격',
        '편관격',
        '정재격',
        '편재격',
        '정인격',
        '편인격',
        '식신격',
        '상관격',
        '건록격',
        '양인격',
        '종왕격',
        '종강격',
        '종아격',
        '종재격',
        '종살격',
        '화기격',
        '잡격',
      ];

      it('should return valid geokguk type', () => {
        const dayMaster = createDayMaster('戊', '토', '양');
        const pillars = createTestPillars();
        const strength = analyzeStrength(dayMaster, pillars);

        const result = analyzeGeokguk(dayMaster, pillars, strength);

        expect(geokgukTypes).toContain(result.type);
      });
    });

    describe('건록격 detection', () => {
      it('should detect 건록격 when month branch is geonrok', () => {
        const dayMaster = createDayMaster('甲', '목', '양');
        const pillars = {
          yearPillar: createPillarInput('甲', '목', '子', '수'),
          monthPillar: createPillarInput('丙', '화', '寅', '목'), // 寅 is 甲's 건록
          dayPillar: createPillarInput('甲', '목', '午', '화'),
          timePillar: createPillarInput('庚', '금', '申', '금'),
        };
        const strength = analyzeStrength(dayMaster, pillars);

        const result = analyzeGeokguk(dayMaster, pillars, strength);

        expect(result.type).toBe('건록격');
        expect(result.basis).toContain('건록');
      });
    });

    describe('양인격 detection', () => {
      it('should detect 양인격 when month branch is yangin', () => {
        const dayMaster = createDayMaster('甲', '목', '양');
        const pillars = {
          yearPillar: createPillarInput('甲', '목', '子', '수'),
          monthPillar: createPillarInput('乙', '목', '卯', '목'), // 卯 is 甲's 양인
          dayPillar: createPillarInput('甲', '목', '午', '화'),
          timePillar: createPillarInput('庚', '금', '申', '금'),
        };
        const strength = analyzeStrength(dayMaster, pillars);

        const result = analyzeGeokguk(dayMaster, pillars, strength);

        expect(result.type).toBe('양인격');
        expect(result.basis).toContain('양인');
      });
    });
  });

  describe('analyzeYongsin', () => {
    it('should return YongsinAnalysis with all required fields', () => {
      const dayMaster = createDayMaster('戊', '토', '양');
      const pillars = createTestPillars();
      const strength = analyzeStrength(dayMaster, pillars);
      const geokguk = analyzeGeokguk(dayMaster, pillars, strength);

      const result = analyzeYongsin(dayMaster, strength, geokguk);

      expect(result).toHaveProperty('primary');
      expect(result).toHaveProperty('basis');
      expect(result).toHaveProperty('favorable');
      expect(result).toHaveProperty('unfavorable');
    });

    it('should return valid FiveElement for primary yongsin', () => {
      const elements: FiveElement[] = ['목', '화', '토', '금', '수'];
      const dayMaster = createDayMaster('戊', '토', '양');
      const pillars = createTestPillars();
      const strength = analyzeStrength(dayMaster, pillars);
      const geokguk = analyzeGeokguk(dayMaster, pillars, strength);

      const result = analyzeYongsin(dayMaster, strength, geokguk);

      expect(elements).toContain(result.primary);
    });

    it('should return arrays for favorable and unfavorable', () => {
      const dayMaster = createDayMaster('戊', '토', '양');
      const pillars = createTestPillars();
      const strength = analyzeStrength(dayMaster, pillars);
      const geokguk = analyzeGeokguk(dayMaster, pillars, strength);

      const result = analyzeYongsin(dayMaster, strength, geokguk);

      expect(Array.isArray(result.favorable)).toBe(true);
      expect(Array.isArray(result.unfavorable)).toBe(true);
    });

    describe('종격 yongsin', () => {
      it('should handle 종왕격 correctly', () => {
        const dayMaster = createDayMaster('甲', '목', '양');
        const strength: DaymasterStrengthAnalysis = {
          level: '극신강',
          score: 60,
          helpingScore: 10,
          drainingScore: 2,
          monthBranchHelps: true,
          seasonHelps: true,
          details: { 비겁: 8, 인성: 2, 식상: 1, 재성: 0.5, 관성: 0.5 },
        };
        const geokguk: GeokgukAnalysis = {
          type: '종왕격',
          basis: '비겁이 태과하여 종왕',
        };

        const result = analyzeYongsin(dayMaster, strength, geokguk);

        expect(result.primary).toBe('목'); // 일간 오행
        expect(result.favorable).toContain('목');
      });
    });
  });

  describe('analyzeAdvancedSaju', () => {
    it('should return AdvancedSajuAnalysis with all required fields', () => {
      const dayMaster = createDayMaster('戊', '토', '양');
      const pillars = createTestPillars();

      const result = analyzeAdvancedSaju(dayMaster, pillars);

      expect(result).toHaveProperty('strength');
      expect(result).toHaveProperty('geokguk');
      expect(result).toHaveProperty('yongsin');
    });

    it('should have consistent analysis across components', () => {
      const dayMaster = createDayMaster('戊', '토', '양');
      const pillars = createTestPillars();

      const result = analyzeAdvancedSaju(dayMaster, pillars);

      // Verify that the analysis is internally consistent
      expect(result.strength.level).toBeTruthy();
      expect(result.geokguk.type).toBeTruthy();
      expect(result.yongsin.primary).toBeTruthy();
    });
  });

  describe('evaluateElementInfluence', () => {
    const yongsin: YongsinAnalysis = {
      primary: '수',
      secondary: '금',
      basis: 'Test basis',
      favorable: ['수', '금'],
      unfavorable: ['화', '토'],
    };

    it('should return 용신 for primary element', () => {
      expect(evaluateElementInfluence('수', yongsin)).toBe('용신');
    });

    it('should return 희신 for favorable elements', () => {
      expect(evaluateElementInfluence('금', yongsin)).toBe('희신');
    });

    it('should return 기신 for unfavorable elements', () => {
      expect(evaluateElementInfluence('화', yongsin)).toBe('기신');
      expect(evaluateElementInfluence('토', yongsin)).toBe('기신');
    });

    it('should return 한신 for neutral elements', () => {
      expect(evaluateElementInfluence('목', yongsin)).toBe('한신');
    });
  });

  describe('scoreUnseElement', () => {
    const yongsin: YongsinAnalysis = {
      primary: '수',
      secondary: '금',
      basis: 'Test basis',
      favorable: ['수', '금'],
      unfavorable: ['화', '토'],
    };

    it('should give highest score for primary yongsin elements', () => {
      const score = scoreUnseElement('수', '수', yongsin);
      expect(score).toBeGreaterThan(0);
    });

    it('should give positive score for favorable elements', () => {
      const score = scoreUnseElement('금', '금', yongsin);
      expect(score).toBeGreaterThan(0);
    });

    it('should give negative score for unfavorable elements', () => {
      const score = scoreUnseElement('화', '토', yongsin);
      expect(score).toBeLessThan(0);
    });
  });

  describe('analyzeRoot', () => {
    it('should return RootAnalysis with all required fields', () => {
      const dayMaster = createDayMaster('戊', '토', '양');
      const pillars = createTestPillars();

      const result = analyzeRoot(dayMaster, pillars);

      expect(result).toHaveProperty('hasRoot');
      expect(result).toHaveProperty('rootBranches');
      expect(result).toHaveProperty('deukryeong');
      expect(result).toHaveProperty('deukji');
      expect(result).toHaveProperty('deukse');
      expect(result).toHaveProperty('totalRootScore');
    });

    it('should detect roots in branches', () => {
      const dayMaster = createDayMaster('甲', '목', '양');
      const pillars = {
        yearPillar: createPillarInput('甲', '목', '寅', '목'), // 寅 has 甲 as hidden stem
        monthPillar: createPillarInput('丙', '화', '卯', '목'), // 卯 has 乙 as hidden stem
        dayPillar: createPillarInput('甲', '목', '午', '화'),
        timePillar: createPillarInput('庚', '금', '申', '금'),
      };

      const result = analyzeRoot(dayMaster, pillars);

      expect(result.hasRoot).toBe(true);
      expect(result.rootBranches.length).toBeGreaterThan(0);
    });

    describe('득령 (deukryeong)', () => {
      it('should detect 득령 when month branch helps day master', () => {
        const dayMaster = createDayMaster('甲', '목', '양');
        const pillars = {
          yearPillar: createPillarInput('甲', '목', '子', '수'),
          monthPillar: createPillarInput('甲', '목', '寅', '목'), // 목 helps 목
          dayPillar: createPillarInput('甲', '목', '午', '화'),
          timePillar: createPillarInput('庚', '금', '申', '금'),
        };

        const result = analyzeRoot(dayMaster, pillars);

        expect(result.deukryeong).toBe(true);
      });
    });

    describe('득지 (deukji)', () => {
      it('should detect 득지 when day branch helps day master', () => {
        const dayMaster = createDayMaster('甲', '목', '양');
        const pillars = {
          yearPillar: createPillarInput('甲', '목', '子', '수'),
          monthPillar: createPillarInput('丙', '화', '巳', '화'),
          dayPillar: createPillarInput('甲', '목', '寅', '목'), // 목 helps 목
          timePillar: createPillarInput('庚', '금', '申', '금'),
        };

        const result = analyzeRoot(dayMaster, pillars);

        expect(result.deukji).toBe(true);
      });
    });
  });

  describe('getSeasonFromMonthBranch', () => {
    describe('spring branches', () => {
      it('should return 춘 for 寅', () => {
        expect(getSeasonFromMonthBranch('寅')).toBe('춘');
      });

      it('should return 춘 for 卯', () => {
        expect(getSeasonFromMonthBranch('卯')).toBe('춘');
      });

      it('should return 춘 for 辰', () => {
        expect(getSeasonFromMonthBranch('辰')).toBe('춘');
      });
    });

    describe('summer branches', () => {
      it('should return 하 for 巳', () => {
        expect(getSeasonFromMonthBranch('巳')).toBe('하');
      });

      it('should return 하 for 午', () => {
        expect(getSeasonFromMonthBranch('午')).toBe('하');
      });

      it('should return 하 for 未', () => {
        expect(getSeasonFromMonthBranch('未')).toBe('하');
      });
    });

    describe('autumn branches', () => {
      it('should return 추 for 申', () => {
        expect(getSeasonFromMonthBranch('申')).toBe('추');
      });

      it('should return 추 for 酉', () => {
        expect(getSeasonFromMonthBranch('酉')).toBe('추');
      });

      it('should return 추 for 戌', () => {
        expect(getSeasonFromMonthBranch('戌')).toBe('추');
      });
    });

    describe('winter branches', () => {
      it('should return 동 for 亥', () => {
        expect(getSeasonFromMonthBranch('亥')).toBe('동');
      });

      it('should return 동 for 子', () => {
        expect(getSeasonFromMonthBranch('子')).toBe('동');
      });

      it('should return 동 for 丑', () => {
        expect(getSeasonFromMonthBranch('丑')).toBe('동');
      });
    });
  });

  describe('analyzeJohuYongsin', () => {
    it('should return JohuYongsinAnalysis with all required fields', () => {
      const result = analyzeJohuYongsin('甲', '寅');

      expect(result).toHaveProperty('season');
      expect(result).toHaveProperty('primary');
      expect(result).toHaveProperty('secondary');
      expect(result).toHaveProperty('description');
    });

    describe('all day masters', () => {
      const dayMasters = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
      const monthBranches = ['寅', '巳', '申', '亥']; // Representative branches for each season

      dayMasters.forEach((dm) => {
        monthBranches.forEach((mb) => {
          it(`should return valid analysis for ${dm} in ${mb}`, () => {
            const result = analyzeJohuYongsin(dm, mb);

            expect(['목', '화', '토', '금', '수']).toContain(result.primary);
            expect(['목', '화', '토', '금', '수']).toContain(result.secondary);
            expect(['춘', '하', '추', '동']).toContain(result.season);
          });
        });
      });
    });

    describe('seasonal johu patterns', () => {
      it('should recommend 화 for 甲 in winter (cold season)', () => {
        const result = analyzeJohuYongsin('甲', '子'); // Winter
        expect(result.primary).toBe('화');
      });

      it('should recommend 수 for 丙 in summer (hot season)', () => {
        const result = analyzeJohuYongsin('丙', '午'); // Summer
        expect(result.primary).toBe('수');
      });
    });

    it('should include description', () => {
      const result = analyzeJohuYongsin('甲', '寅');
      expect(result.description).toBeTruthy();
    });
  });

  describe('analyzeExtendedSaju', () => {
    it('should return ExtendedAdvancedAnalysis with all required fields', () => {
      const dayMaster = createDayMaster('戊', '토', '양');
      const pillars = createTestPillars();

      const result = analyzeExtendedSaju(dayMaster, pillars);

      expect(result).toHaveProperty('strength');
      expect(result).toHaveProperty('geokguk');
      expect(result).toHaveProperty('yongsin');
      expect(result).toHaveProperty('root');
      expect(result).toHaveProperty('johu');
      expect(result).toHaveProperty('finalYongsin');
      expect(result).toHaveProperty('finalYongsinBasis');
    });

    it('should include root analysis', () => {
      const dayMaster = createDayMaster('戊', '토', '양');
      const pillars = createTestPillars();

      const result = analyzeExtendedSaju(dayMaster, pillars);

      expect(result.root).toHaveProperty('hasRoot');
      expect(result.root).toHaveProperty('deukryeong');
    });

    it('should include johu analysis', () => {
      const dayMaster = createDayMaster('戊', '토', '양');
      const pillars = createTestPillars();

      const result = analyzeExtendedSaju(dayMaster, pillars);

      expect(result.johu).toHaveProperty('season');
      expect(result.johu).toHaveProperty('primary');
    });

    it('should determine final yongsin', () => {
      const dayMaster = createDayMaster('戊', '토', '양');
      const pillars = createTestPillars();

      const result = analyzeExtendedSaju(dayMaster, pillars);

      expect(['목', '화', '토', '금', '수']).toContain(result.finalYongsin);
      expect(result.finalYongsinBasis).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle all ten day masters', () => {
      const dayMasters: Array<{ name: string; element: FiveElement; yin_yang: YinYang }> = [
        { name: '甲', element: '목', yin_yang: '양' },
        { name: '乙', element: '목', yin_yang: '음' },
        { name: '丙', element: '화', yin_yang: '양' },
        { name: '丁', element: '화', yin_yang: '음' },
        { name: '戊', element: '토', yin_yang: '양' },
        { name: '己', element: '토', yin_yang: '음' },
        { name: '庚', element: '금', yin_yang: '양' },
        { name: '辛', element: '금', yin_yang: '음' },
        { name: '壬', element: '수', yin_yang: '양' },
        { name: '癸', element: '수', yin_yang: '음' },
      ];

      dayMasters.forEach((dm) => {
        const pillars = createTestPillars();
        expect(() => analyzeAdvancedSaju(dm, pillars)).not.toThrow();
      });
    });

    it('should handle extreme imbalance cases', () => {
      const dayMaster = createDayMaster('甲', '목', '양');
      const allWoodPillars = {
        yearPillar: createPillarInput('甲', '목', '寅', '목'),
        monthPillar: createPillarInput('甲', '목', '卯', '목'),
        dayPillar: createPillarInput('甲', '목', '寅', '목'),
        timePillar: createPillarInput('乙', '목', '卯', '목'),
      };

      const result = analyzeAdvancedSaju(dayMaster, allWoodPillars);

      expect(['극신강', '신강']).toContain(result.strength.level);
    });
  });
});
