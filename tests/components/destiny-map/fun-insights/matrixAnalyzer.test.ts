// tests/components/destiny-map/fun-insights/matrixAnalyzer.test.ts
// matrixAnalyzer 함수들에 대한 테스트

import { describe, it, expect } from 'vitest';
import {
  getMatrixAnalysis,
  getTimingOverlayAnalysis,
  getRelationAspectAnalysis,
  getAdvancedAnalysisResult,
  getExtraPointAnalysis,
  getFullMatrixAnalysis,
  getLoveMatrixAnalysis,
  getCareerMatrixAnalysis,
  getElementFusionDescription,
  getSibsinPlanetDescription,
  getLifeCycleDescription,
} from '@/components/destiny-map/fun-insights/analyzers/matrixAnalyzer';
import type { SajuData, AstroData } from '@/components/destiny-map/fun-insights/types';

// 테스트용 목 데이터
const mockSajuData: SajuData = {
  dayMaster: {
    name: '갑목',
    element: 'wood',
    heavenlyStem: '甲',
  },
  pillars: {
    year: { heavenlyStem: '甲', earthlyBranch: '子' },
    month: { heavenlyStem: '丙', earthlyBranch: '寅' },
    day: { heavenlyStem: '甲', earthlyBranch: '午' },
    time: { heavenlyStem: '戊', earthlyBranch: '申' },
  },
  fiveElements: {
    wood: 3,
    fire: 2,
    earth: 1,
    metal: 2,
    water: 2,
  },
  sinsal: {
    luckyList: [{ name: '천을귀인' }, { name: '도화' }],
    unluckyList: [{ name: '홍염살' }],
  },
  advancedAnalysis: {
    geokguk: { name: 'jeongin', type: '정인격' },
    yongsin: { element: 'water', name: '수' },
  },
};

const mockExtendedSajuData = {
  ...mockSajuData,
  sibsin: {
    year: '비견' as const,
    month: '식신' as const,
    day: '비견' as const,
    hour: '편재' as const,
  },
  twelveStages: {
    year: '장생' as const,
    month: '왕지' as const,
    day: '건록' as const,
    hour: '병' as const,
  },
};

const mockAstroData: AstroData = {
  sunSign: 'Aries',
  moonSign: 'Cancer',
  risingSign: 'Leo',
  planets: [
    { name: 'sun', sign: 'Aries', house: 1, degree: 15 },
    { name: 'moon', sign: 'Cancer', house: 4, degree: 22 },
    { name: 'mercury', sign: 'Aries', house: 1, degree: 10 },
    { name: 'venus', sign: 'Taurus', house: 2, degree: 5 },
    { name: 'mars', sign: 'Gemini', house: 3, degree: 18 },
    { name: 'jupiter', sign: 'Leo', house: 5, degree: 12 },
    { name: 'saturn', sign: 'Aquarius', house: 11, degree: 25 },
  ],
  aspects: [
    { from: 'sun', to: 'moon', type: 'trine', orb: 2.5 },
    { from: 'sun', to: 'mars', type: 'conjunction', orb: 5 },
    { from: 'moon', to: 'venus', type: 'sextile', orb: 3 },
  ],
  houses: [
    { index: 1, sign: 'Leo', cusp: 0 },
    { index: 10, sign: 'Taurus', cusp: 270 },
  ],
};

describe('matrixAnalyzer', () => {
  describe('getMatrixAnalysis', () => {
    it('사주와 천문 데이터로 분석 결과를 반환해야 함', () => {
      const result = getMatrixAnalysis(mockSajuData, mockAstroData, 'ko');

      expect(result).not.toBeNull();
      expect(result?.elementFusions).toBeDefined();
      expect(result?.sibsinPlanetFusions).toBeDefined();
      expect(result?.lifeCycles).toBeDefined();
      expect(result?.synergy).toBeDefined();
      expect(result?.fusionSummary).toBeDefined();
    });

    it('사주 데이터만 있어도 분석 결과를 반환해야 함', () => {
      const result = getMatrixAnalysis(mockSajuData, undefined, 'ko');

      expect(result).not.toBeNull();
      expect(result?.synergy).toBeDefined();
    });

    it('천문 데이터만 있어도 분석 결과를 반환해야 함', () => {
      const result = getMatrixAnalysis(undefined, mockAstroData, 'ko');

      expect(result).not.toBeNull();
    });

    it('데이터가 없으면 null을 반환해야 함', () => {
      const result = getMatrixAnalysis(undefined, undefined, 'ko');

      expect(result).toBeNull();
    });

    it('영어 언어 설정시 영어 설명을 반환해야 함', () => {
      const result = getMatrixAnalysis(mockSajuData, mockAstroData, 'en');

      expect(result).not.toBeNull();
      if (result && result.elementFusions.length > 0) {
        expect(result.elementFusions[0].fusion.description.en).toBeDefined();
      }
    });

    it('오행-서양원소 융합이 포함되어야 함', () => {
      const result = getMatrixAnalysis(mockSajuData, mockAstroData, 'ko');

      expect(result).not.toBeNull();
      expect(result?.elementFusions.length).toBeGreaterThanOrEqual(0);
      if (result && result.elementFusions.length > 0) {
        expect(result.elementFusions[0].sajuElement).toBeDefined();
        expect(result.elementFusions[0].westElement).toBeDefined();
        expect(result.elementFusions[0].fusion.level).toBeDefined();
        expect(result.elementFusions[0].fusion.score).toBeGreaterThanOrEqual(1);
        expect(result.elementFusions[0].fusion.score).toBeLessThanOrEqual(10);
      }
    });

    it('시너지 요약에 모든 레벨이 포함되어야 함', () => {
      const result = getMatrixAnalysis(mockExtendedSajuData, mockAstroData, 'ko');

      expect(result).not.toBeNull();
      expect(result?.fusionSummary).toHaveProperty('extreme');
      expect(result?.fusionSummary).toHaveProperty('amplify');
      expect(result?.fusionSummary).toHaveProperty('balance');
      expect(result?.fusionSummary).toHaveProperty('clash');
      expect(result?.fusionSummary).toHaveProperty('conflict');
    });
  });

  describe('getTimingOverlayAnalysis (Layer 4)', () => {
    it('타이밍 오버레이 분석 결과를 반환해야 함', () => {
      const result = getTimingOverlayAnalysis(mockSajuData, mockAstroData, 'ko');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('일간 오행 기반으로 세운 타이밍을 분석해야 함', () => {
      const result = getTimingOverlayAnalysis(mockSajuData, mockAstroData, 'ko');

      if (result.length > 0) {
        expect(result[0].timingCycle).toBeDefined();
        expect(result[0].transitCycle).toBeDefined();
        expect(result[0].fusion).toBeDefined();
        expect(result[0].timingInfo).toBeDefined();
        expect(result[0].transitInfo).toBeDefined();
      }
    });

    it('최대 6개 결과를 반환해야 함', () => {
      const result = getTimingOverlayAnalysis(mockSajuData, mockAstroData, 'ko');

      expect(result.length).toBeLessThanOrEqual(6);
    });

    it('데이터가 없으면 빈 배열을 반환해야 함', () => {
      const result = getTimingOverlayAnalysis(undefined, undefined, 'ko');

      expect(result).toEqual([]);
    });

    it('영어 언어 설정시 영어 정보를 포함해야 함', () => {
      const result = getTimingOverlayAnalysis(mockSajuData, mockAstroData, 'en');

      if (result.length > 0) {
        expect(result[0].timingInfo.en).toBeDefined();
        expect(result[0].transitInfo.en).toBeDefined();
      }
    });
  });

  describe('getRelationAspectAnalysis (Layer 5)', () => {
    it('관계-애스펙트 분석 결과를 반환해야 함', () => {
      const result = getRelationAspectAnalysis(mockSajuData, mockAstroData, 'ko');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('지지 관계와 애스펙트 조합을 분석해야 함', () => {
      const result = getRelationAspectAnalysis(mockSajuData, mockAstroData, 'ko');

      if (result.length > 0) {
        expect(result[0].relation).toBeDefined();
        expect(result[0].aspect).toBeDefined();
        expect(result[0].fusion).toBeDefined();
        expect(result[0].relationInfo).toBeDefined();
        expect(result[0].aspectInfo).toBeDefined();
      }
    });

    it('최대 6개 결과를 반환해야 함', () => {
      const result = getRelationAspectAnalysis(mockSajuData, mockAstroData, 'ko');

      expect(result.length).toBeLessThanOrEqual(6);
    });

    it('astro aspects 데이터를 활용해야 함', () => {
      const result = getRelationAspectAnalysis(mockSajuData, mockAstroData, 'ko');

      // 기본 관계들 (samhap, yukhap, chung)과 애스펙트가 조합되어야 함
      expect(result.length).toBeGreaterThan(0);
    });

    it('데이터가 없으면 빈 배열을 반환해야 함', () => {
      const result = getRelationAspectAnalysis(undefined, undefined, 'ko');

      expect(result).toEqual([]);
    });
  });

  describe('getAdvancedAnalysisResult (Layer 7)', () => {
    it('고급분석 결과를 반환해야 함', () => {
      const result = getAdvancedAnalysisResult(mockSajuData, mockAstroData, 'ko');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('격국과 프로그레션 조합을 분석해야 함', () => {
      const result = getAdvancedAnalysisResult(mockSajuData, mockAstroData, 'ko');

      if (result.length > 0) {
        expect(result[0].pattern).toBeDefined();
        expect(result[0].progression).toBeDefined();
        expect(result[0].fusion).toBeDefined();
        expect(result[0].patternInfo).toBeDefined();
        expect(result[0].progressionInfo).toBeDefined();
      }
    });

    it('최대 5개 결과를 반환해야 함', () => {
      const result = getAdvancedAnalysisResult(mockSajuData, mockAstroData, 'ko');

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('일간 오행에 따라 다른 격국을 추정해야 함', () => {
      // geokguk이 없는 데이터로 테스트하여 일간 오행 기반 추정 검증
      const woodData: SajuData = { dayMaster: { element: 'wood' } };
      const metalData: SajuData = { dayMaster: { element: 'metal' } };

      const woodResult = getAdvancedAnalysisResult(woodData, mockAstroData, 'ko');
      const metalResult = getAdvancedAnalysisResult(metalData, mockAstroData, 'ko');

      // 결과가 있으면 패턴이 정의되어 있어야 함
      if (woodResult.length > 0) {
        expect(woodResult[0].pattern).toBeDefined();
      }
      if (metalResult.length > 0) {
        expect(metalResult[0].pattern).toBeDefined();
      }
    });

    it('데이터가 없으면 빈 배열을 반환해야 함', () => {
      const result = getAdvancedAnalysisResult(undefined, undefined, 'ko');

      expect(result).toEqual([]);
    });
  });

  describe('getExtraPointAnalysis (Layer 10)', () => {
    it('엑스트라포인트 분석 결과를 반환해야 함', () => {
      const result = getExtraPointAnalysis(mockSajuData, mockAstroData, 'ko');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('오행 기반 엑스트라포인트 분석이 포함되어야 함', () => {
      const result = getExtraPointAnalysis(mockSajuData, mockAstroData, 'ko');

      if (result.length > 0) {
        const elementBasedResult = result.find(r => r.element);
        if (elementBasedResult) {
          expect(elementBasedResult.extraPoint).toBeDefined();
          expect(elementBasedResult.element).toBeDefined();
          expect(elementBasedResult.fusion).toBeDefined();
          expect(elementBasedResult.pointInfo).toBeDefined();
        }
      }
    });

    it('십신 기반 분석도 포함될 수 있어야 함', () => {
      const result = getExtraPointAnalysis(mockExtendedSajuData, mockAstroData, 'ko');

      // 십신 데이터가 있으면 십신 기반 분석도 포함
      const sibsinBasedResult = result.find(r => r.sibsin);
      // sibsin 데이터가 있으면 추가 결과가 있을 수 있음
      expect(result.length).toBeGreaterThan(0);
    });

    it('주요 엑스트라포인트들을 분석해야 함', () => {
      const result = getExtraPointAnalysis(mockSajuData, mockAstroData, 'ko');
      const extraPointNames = result.map(r => r.extraPoint);

      // Chiron, Lilith, PartOfFortune, NorthNode, Vertex 중 일부가 포함되어야 함
      const validPoints = ['Chiron', 'Lilith', 'PartOfFortune', 'NorthNode', 'Vertex'];
      const hasValidPoints = extraPointNames.some(name => validPoints.includes(name));
      expect(hasValidPoints).toBe(true);
    });

    it('최대 8개 결과를 반환해야 함', () => {
      const result = getExtraPointAnalysis(mockExtendedSajuData, mockAstroData, 'ko');

      expect(result.length).toBeLessThanOrEqual(8);
    });

    it('점수순으로 정렬되어야 함', () => {
      const result = getExtraPointAnalysis(mockSajuData, mockAstroData, 'ko');

      if (result.length > 1) {
        for (let i = 0; i < result.length - 1; i++) {
          expect(result[i].fusion.score).toBeGreaterThanOrEqual(result[i + 1].fusion.score);
        }
      }
    });

    it('데이터가 없으면 빈 배열을 반환해야 함', () => {
      const result = getExtraPointAnalysis(undefined, undefined, 'ko');

      expect(result).toEqual([]);
    });
  });

  describe('getFullMatrixAnalysis', () => {
    it('모든 레이어를 통합한 전체 분석 결과를 반환해야 함', () => {
      const result = getFullMatrixAnalysis(mockExtendedSajuData, mockAstroData, 'ko');

      expect(result).not.toBeNull();

      // 기존 레이어 (1, 2, 3, 6, 8, 9)
      expect(result?.elementFusions).toBeDefined();
      expect(result?.sibsinPlanetFusions).toBeDefined();
      expect(result?.lifeCycles).toBeDefined();
      expect(result?.synergy).toBeDefined();
      expect(result?.fusionSummary).toBeDefined();

      // 새로운 레이어 (4, 5, 7, 10)
      expect(result?.timingOverlays).toBeDefined();
      expect(result?.relationAspects).toBeDefined();
      expect(result?.advancedAnalysis).toBeDefined();
      expect(result?.extraPoints).toBeDefined();
    });

    it('10개 레이어 모두에서 데이터가 있어야 함', () => {
      const result = getFullMatrixAnalysis(mockExtendedSajuData, mockAstroData, 'ko');

      expect(result).not.toBeNull();

      // 새로운 레이어들의 데이터 확인
      expect(result?.timingOverlays?.length).toBeGreaterThan(0);
      expect(result?.relationAspects?.length).toBeGreaterThan(0);
      expect(result?.advancedAnalysis?.length).toBeGreaterThan(0);
      expect(result?.extraPoints?.length).toBeGreaterThan(0);
    });

    it('데이터가 없으면 null을 반환해야 함', () => {
      const result = getFullMatrixAnalysis(undefined, undefined, 'ko');

      expect(result).toBeNull();
    });
  });

  describe('getLoveMatrixAnalysis', () => {
    it('사랑 관련 매트릭스 분석 결과를 반환해야 함', () => {
      const result = getLoveMatrixAnalysis(mockExtendedSajuData, mockAstroData, 'ko');

      expect(result).not.toBeNull();
      expect(result?.loveScore).toBeDefined();
      expect(result?.loveMessage).toBeDefined();
    });

    it('데이터가 없으면 null을 반환해야 함', () => {
      const result = getLoveMatrixAnalysis(undefined, undefined, 'ko');

      expect(result).toBeNull();
    });
  });

  describe('getCareerMatrixAnalysis', () => {
    it('커리어 관련 매트릭스 분석 결과를 반환해야 함', () => {
      const result = getCareerMatrixAnalysis(mockExtendedSajuData, mockAstroData, 'ko');

      expect(result).not.toBeNull();
      expect(result?.careerScore).toBeDefined();
      expect(result?.careerMessage).toBeDefined();
      expect(result?.sibsinCareer).toBeDefined();
    });

    it('데이터가 없으면 null을 반환해야 함', () => {
      const result = getCareerMatrixAnalysis(undefined, undefined, 'ko');

      expect(result).toBeNull();
    });
  });

  describe('개별 조회 함수들', () => {
    describe('getElementFusionDescription', () => {
      it('오행-서양원소 융합 설명을 반환해야 함', () => {
        const result = getElementFusionDescription('목', 'fire', 'ko');

        expect(result).not.toBeNull();
        expect(typeof result).toBe('string');
      });

      it('영어 설명을 반환할 수 있어야 함', () => {
        const result = getElementFusionDescription('목', 'fire', 'en');

        expect(result).not.toBeNull();
        expect(typeof result).toBe('string');
      });

      it('유효하지 않은 조합은 null을 반환해야 함', () => {
        const result = getElementFusionDescription('invalid' as any, 'fire', 'ko');

        expect(result).toBeNull();
      });
    });

    describe('getSibsinPlanetDescription', () => {
      it('십신-행성 융합 설명을 반환해야 함', () => {
        const result = getSibsinPlanetDescription('비견', 'Sun', 'ko');

        expect(result).not.toBeNull();
        expect(typeof result).toBe('string');
      });
    });

    describe('getLifeCycleDescription', () => {
      it('생명주기 융합 설명을 반환해야 함', () => {
        const result = getLifeCycleDescription('장생', 1, 'ko');

        expect(result).not.toBeNull();
        expect(typeof result).toBe('string');
      });
    });
  });

  describe('fusion 결과 유효성', () => {
    it('모든 fusion 결과는 유효한 level을 가져야 함', () => {
      const result = getFullMatrixAnalysis(mockExtendedSajuData, mockAstroData, 'ko');
      const validLevels = ['extreme', 'amplify', 'balance', 'clash', 'conflict'];

      expect(result).not.toBeNull();

      // 기존 레이어 융합 결과 검증
      result?.elementFusions.forEach(f => {
        expect(validLevels).toContain(f.fusion.level);
      });

      // 새로운 레이어 융합 결과 검증
      result?.timingOverlays?.forEach(f => {
        expect(validLevels).toContain(f.fusion.level);
      });

      result?.relationAspects?.forEach(f => {
        expect(validLevels).toContain(f.fusion.level);
      });

      result?.advancedAnalysis?.forEach(f => {
        expect(validLevels).toContain(f.fusion.level);
      });

      result?.extraPoints?.forEach(f => {
        expect(validLevels).toContain(f.fusion.level);
      });
    });

    it('모든 fusion 점수는 1-10 범위여야 함', () => {
      const result = getFullMatrixAnalysis(mockExtendedSajuData, mockAstroData, 'ko');

      expect(result).not.toBeNull();

      const allFusions = [
        ...(result?.elementFusions || []).map(f => f.fusion),
        ...(result?.timingOverlays || []).map(f => f.fusion),
        ...(result?.relationAspects || []).map(f => f.fusion),
        ...(result?.advancedAnalysis || []).map(f => f.fusion),
        ...(result?.extraPoints || []).map(f => f.fusion),
      ];

      allFusions.forEach(fusion => {
        expect(fusion.score).toBeGreaterThanOrEqual(1);
        expect(fusion.score).toBeLessThanOrEqual(10);
      });
    });

    it('모든 fusion에는 아이콘이 있어야 함', () => {
      const result = getFullMatrixAnalysis(mockExtendedSajuData, mockAstroData, 'ko');

      expect(result).not.toBeNull();

      result?.timingOverlays?.forEach(f => {
        expect(f.fusion.icon).toBeDefined();
        expect(f.fusion.icon.length).toBeGreaterThan(0);
      });

      result?.extraPoints?.forEach(f => {
        expect(f.fusion.icon).toBeDefined();
        expect(f.fusion.icon.length).toBeGreaterThan(0);
      });
    });
  });

  describe('사람마다 다른 결과 검증', () => {
    // 서로 다른 사주 데이터
    const personA: SajuData = {
      dayMaster: { name: '갑목', element: 'wood', heavenlyStem: '甲' },
      pillars: {
        year: { heavenlyStem: '甲', earthlyBranch: '子' },
        month: { heavenlyStem: '丙', earthlyBranch: '寅' },
        day: { heavenlyStem: '甲', earthlyBranch: '午' },
        time: { heavenlyStem: '戊', earthlyBranch: '申' },
      },
      fiveElements: { wood: 4, fire: 2, earth: 1, metal: 2, water: 1 },
      advancedAnalysis: {
        geokguk: { name: '정인격', type: 'jeongin' },
        hyungChungHoeHap: { hap: ['인오술 삼합'], chung: [] },
      },
    };

    const personB: SajuData = {
      dayMaster: { name: '경금', element: 'metal', heavenlyStem: '庚' },
      pillars: {
        year: { heavenlyStem: '庚', earthlyBranch: '申' },
        month: { heavenlyStem: '壬', earthlyBranch: '子' },
        day: { heavenlyStem: '庚', earthlyBranch: '辰' },
        time: { heavenlyStem: '丙', earthlyBranch: '午' },
      },
      fiveElements: { wood: 0, fire: 2, earth: 2, metal: 4, water: 2 },
      advancedAnalysis: {
        geokguk: { name: '편관격', type: 'pyeongwan' },
        hyungChungHoeHap: { chung: ['자오충'], hap: [] },
      },
    };

    const personC: SajuData = {
      dayMaster: { name: '병화', element: 'fire', heavenlyStem: '丙' },
      pillars: {
        year: { heavenlyStem: '丙', earthlyBranch: '午' },
        month: { heavenlyStem: '戊', earthlyBranch: '辰' },
        day: { heavenlyStem: '丙', earthlyBranch: '寅' },
        time: { heavenlyStem: '甲', earthlyBranch: '寅' },
      },
      fiveElements: { wood: 3, fire: 4, earth: 2, metal: 0, water: 1 },
      advancedAnalysis: {
        geokguk: { name: '식신격', type: 'siksin' },
        hyungChungHoeHap: { hap: ['인오술 삼합', '진술축미 방합'], chung: [] },
      },
    };

    // 서로 다른 천문 데이터
    const astroA: AstroData = {
      sunSign: 'Aries',
      moonSign: 'Cancer',
      risingSign: 'Leo',
      planets: [
        { name: 'sun', sign: 'Aries', house: 1, degree: 15 },
        { name: 'moon', sign: 'Cancer', house: 4, degree: 22 },
        { name: 'venus', sign: 'Taurus', house: 2, degree: 5 },
      ],
      aspects: [
        { from: 'sun', to: 'moon', type: 'trine', orb: 2.5 },
        { from: 'sun', to: 'mars', type: 'conjunction', orb: 5 },
      ],
    };

    const astroB: AstroData = {
      sunSign: 'Capricorn',
      moonSign: 'Scorpio',
      risingSign: 'Virgo',
      planets: [
        { name: 'sun', sign: 'Capricorn', house: 5, degree: 8 },
        { name: 'moon', sign: 'Scorpio', house: 3, degree: 17 },
        { name: 'venus', sign: 'Aquarius', house: 6, degree: 22 },
      ],
      aspects: [
        { from: 'sun', to: 'saturn', type: 'conjunction', orb: 3 },
        { from: 'moon', to: 'pluto', type: 'square', orb: 4 },
      ],
    };

    const astroC: AstroData = {
      sunSign: 'Leo',
      moonSign: 'Sagittarius',
      risingSign: 'Aries',
      planets: [
        { name: 'sun', sign: 'Leo', house: 5, degree: 20 },
        { name: 'moon', sign: 'Sagittarius', house: 9, degree: 10 },
        { name: 'venus', sign: 'Leo', house: 5, degree: 25 },
      ],
      aspects: [
        { from: 'sun', to: 'moon', type: 'trine', orb: 1 },
        { from: 'venus', to: 'jupiter', type: 'conjunction', orb: 2 },
      ],
    };

    it('Layer 1 (오행 융합): 일간 오행이 다르면 다른 결과가 나와야 함', () => {
      const resultA = getMatrixAnalysis(personA, astroA, 'ko');
      const resultB = getMatrixAnalysis(personB, astroB, 'ko');
      const resultC = getMatrixAnalysis(personC, astroC, 'ko');

      expect(resultA).not.toBeNull();
      expect(resultB).not.toBeNull();
      expect(resultC).not.toBeNull();

      // 일간 오행이 다르면 elementFusions도 달라야 함
      const aElements = resultA?.elementFusions.map(f => f.sajuElement).sort();
      const bElements = resultB?.elementFusions.map(f => f.sajuElement).sort();
      const cElements = resultC?.elementFusions.map(f => f.sajuElement).sort();

      // A(wood), B(metal), C(fire) 가 다르므로 결과도 달라야 함
      expect(aElements?.[0]).not.toBe(bElements?.[0]);
      expect(bElements?.[0]).not.toBe(cElements?.[0]);
    });

    it('Layer 4 (타이밍 오버레이): 일간 오행에 따라 다른 타이밍 분석이 나와야 함', () => {
      const resultA = getTimingOverlayAnalysis(personA, astroA, 'ko');
      const resultB = getTimingOverlayAnalysis(personB, astroB, 'ko');
      const resultC = getTimingOverlayAnalysis(personC, astroC, 'ko');

      expect(resultA.length).toBeGreaterThan(0);
      expect(resultB.length).toBeGreaterThan(0);
      expect(resultC.length).toBeGreaterThan(0);

      // 타이밍 주기가 다른 오행에 따라 달라야 함
      const aTiming = resultA[0]?.timingCycle;
      const bTiming = resultB[0]?.timingCycle;
      const cTiming = resultC[0]?.timingCycle;

      expect(aTiming).not.toBe(bTiming);
      expect(bTiming).not.toBe(cTiming);
    });

    it('Layer 5 (관계-애스펙트): 실제 합/충 데이터에 따라 다른 결과가 나와야 함', () => {
      const resultA = getRelationAspectAnalysis(personA, astroA, 'ko');
      const resultB = getRelationAspectAnalysis(personB, astroB, 'ko');

      expect(resultA.length).toBeGreaterThan(0);
      expect(resultB.length).toBeGreaterThan(0);

      // A는 삼합(hap)이 있고, B는 충(chung)이 있음
      const aRelations = resultA.map(r => r.relation);
      const bRelations = resultB.map(r => r.relation);

      // A는 삼합 포함, B는 충 포함
      expect(aRelations).toContain('samhap');
      expect(bRelations).toContain('chung');
    });

    it('Layer 7 (고급분석): 격국이 다르면 다른 분석 패턴이 나와야 함', () => {
      const resultA = getAdvancedAnalysisResult(personA, astroA, 'ko');
      const resultB = getAdvancedAnalysisResult(personB, astroB, 'ko');
      const resultC = getAdvancedAnalysisResult(personC, astroC, 'ko');

      expect(resultA.length).toBeGreaterThan(0);
      expect(resultB.length).toBeGreaterThan(0);
      expect(resultC.length).toBeGreaterThan(0);

      // 격국이 다르면 pattern도 달라야 함
      const aPattern = resultA[0]?.pattern;
      const bPattern = resultB[0]?.pattern;
      const cPattern = resultC[0]?.pattern;

      // A: 정인격, B: 편관격, C: 식신격 모두 다름
      expect(aPattern).not.toBe(bPattern);
      expect(bPattern).not.toBe(cPattern);
      expect(aPattern).not.toBe(cPattern);
    });

    it('Layer 10 (엑스트라포인트): 일간 오행에 따라 다른 융합 결과가 나와야 함', () => {
      const resultA = getExtraPointAnalysis(personA, astroA, 'ko');
      const resultB = getExtraPointAnalysis(personB, astroB, 'ko');
      const resultC = getExtraPointAnalysis(personC, astroC, 'ko');

      expect(resultA.length).toBeGreaterThan(0);
      expect(resultB.length).toBeGreaterThan(0);
      expect(resultC.length).toBeGreaterThan(0);

      // 동일한 엑스트라포인트(Chiron)의 오행 융합이 다르게 나와야 함
      const aChiron = resultA.find(r => r.extraPoint === 'Chiron' && r.element);
      const bChiron = resultB.find(r => r.extraPoint === 'Chiron' && r.element);
      const cChiron = resultC.find(r => r.extraPoint === 'Chiron' && r.element);

      if (aChiron && bChiron && cChiron) {
        // wood, metal, fire 오행이 다르므로 element도 달라야 함
        expect(aChiron.element).not.toBe(bChiron.element);
        expect(bChiron.element).not.toBe(cChiron.element);
      }
    });

    it('전체 시너지 점수가 사람마다 다르게 계산되어야 함', () => {
      const resultA = getMatrixAnalysis(personA, astroA, 'ko');
      const resultB = getMatrixAnalysis(personB, astroB, 'ko');
      const resultC = getMatrixAnalysis(personC, astroC, 'ko');

      expect(resultA?.synergy.overallScore).toBeDefined();
      expect(resultB?.synergy.overallScore).toBeDefined();
      expect(resultC?.synergy.overallScore).toBeDefined();

      // 시너지 점수나 dominantEnergy가 최소한 일부는 달라야 함
      const energies = [
        resultA?.synergy.dominantEnergy.ko,
        resultB?.synergy.dominantEnergy.ko,
        resultC?.synergy.dominantEnergy.ko,
      ];
      const uniqueEnergies = new Set(energies);
      // 세 사람 중 최소 2개는 다른 에너지를 가져야 함
      expect(uniqueEnergies.size).toBeGreaterThanOrEqual(2);
    });

    it('동일한 사람에게는 일관된 결과가 나와야 함', () => {
      const result1 = getFullMatrixAnalysis(personA, astroA, 'ko');
      const result2 = getFullMatrixAnalysis(personA, astroA, 'ko');

      expect(result1).toEqual(result2);
    });
  });
});
