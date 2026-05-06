/**
 * Career Analyzer Tests
 * 커리어 분석 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCareerAnalysis } from '@/components/destiny-map/free-report/analyzers/careerAnalyzer';
import type { SajuData, AstroData } from '@/components/destiny-map/free-report/types';

// Mock dependencies
vi.mock('@/components/destiny-map/free-report/data/dayMasterTraits', () => ({
  dayMasterCareerTraits: {
    '갑': {
      workStyle: { ko: '리더십이 강해요', en: 'Strong leadership' },
      avoid: { ko: '복잡한 규칙', en: 'Complex rules' },
      growth: { ko: '꾸준한 성장', en: 'Steady growth' },
    },
    '을': {
      workStyle: { ko: '유연하게 일해요', en: 'Works flexibly' },
      avoid: { ko: '강압적 환경', en: 'Oppressive environment' },
      growth: { ko: '협력 성장', en: 'Collaborative growth' },
    },
  },
}));

vi.mock('@/components/destiny-map/free-report/data/zodiacTraits', () => ({
  zodiacCareerTraits: {
    aries: {
      style: { ko: '개척자', en: 'Pioneer' },
      strength: { ko: '추진력', en: 'Drive' },
    },
    taurus: {
      style: { ko: '안정 추구', en: 'Stability seeker' },
      strength: { ko: '끈기', en: 'Persistence' },
    },
    leo: {
      style: { ko: '리더', en: 'Leader' },
      strength: { ko: '카리스마', en: 'Charisma' },
    },
  },
}));

vi.mock('@/components/destiny-map/free-report/data/elementAnalysisTraits', () => ({
  elementCareerTraits: {
    wood: {
      strength: { ko: '창의력', en: 'Creativity' },
      field: { ko: ['교육', '의료'], en: ['Education', 'Healthcare'] },
    },
    fire: {
      strength: { ko: '열정', en: 'Passion' },
      field: { ko: ['엔터테인먼트'], en: ['Entertainment'] },
    },
    metal: {
      strength: { ko: '분석력', en: 'Analytical skills' },
      field: { ko: ['금융', 'IT'], en: ['Finance', 'IT'] },
    },
  },
}));

vi.mock('@/components/destiny-map/free-report/data/career', () => ({
  HOUSE10_PATTERNS: {
    aries: {
      role: { ko: '선구자 역할', en: 'Pioneer role' },
      leadership: { ko: '용감한 리더십', en: 'Brave leadership' },
    },
    leo: {
      role: { ko: '주목받는 역할', en: 'Center stage role' },
      leadership: { ko: '카리스마 리더십', en: 'Charismatic leadership' },
    },
  },
  SATURN_CAREER_PATH: {
    capricorn: { ko: '구조적 성공', en: 'Structured success' },
    aries: { ko: '독립적 길', en: 'Independent path' },
  },
  SIBSIN_CAREER_TRAITS: {
    '관성': {
      description: { ko: '리더십과 관리', en: 'Leadership and management' },
      fields: { ko: ['관리직', '공무원'], en: ['Management', 'Government'] },
    },
    '재성': {
      description: { ko: '재물 관리', en: 'Financial management' },
      fields: { ko: ['금융', '사업'], en: ['Finance', 'Business'] },
    },
  },
  JUPITER_HOUSE_BLESSINGS: {
    10: { ko: '커리어에서 행운', en: 'Fortune in career' },
    2: { ko: '재물에서 행운', en: 'Fortune in wealth' },
  },
  SATURN_MC_ASPECTS: {
    conjunction: { ko: '커리어 책임감', en: 'Career responsibility' },
    trine: { ko: '순조로운 성장', en: 'Smooth growth' },
  },
  SUN_SATURN_ASPECTS: {
    conjunction: { ko: '권위와 조화', en: 'Harmony with authority' },
    square: { ko: '권위와 도전', en: 'Challenge with authority' },
  },
  DECISION_STYLES: {
    virgo: { ko: '분석적 결정', en: 'Analytical decisions' },
    aries: { ko: '빠른 결정', en: 'Quick decisions' },
  },
  TEAMWORK_STYLES: {
    cancer: { ko: '배려하는 팀원', en: 'Caring team member' },
    leo: { ko: '팀을 이끄는', en: 'Leading the team' },
  },
}));

vi.mock('@/components/destiny-map/free-report/utils/planets', () => ({
  getPlanetSign: vi.fn((astro, planet) => {
    if (!astro?.planets) return null;
    const planetData = astro.planets.find((p: { name: string }) => p.name.toLowerCase() === planet);
    return planetData?.sign?.toLowerCase() || null;
  }),
}));

vi.mock('@/components/destiny-map/free-report/utils/aspects', () => ({
  findAspect: vi.fn((astro, planet1, planet2) => {
    if (planet1 === 'saturn' && planet2 === 'mc') {
      return astro?.aspects?.saturnMc || null;
    }
    if (planet1 === 'sun' && planet2 === 'saturn') {
      return astro?.aspects?.sunSaturn || null;
    }
    return null;
  }),
}));

vi.mock('@/components/destiny-map/free-report/utils/houses', () => ({
  getHouseSign: vi.fn((astro, house) => {
    if (!astro?.houses) return null;
    return astro.houses[house]?.sign || null;
  }),
  getPlanetHouse: vi.fn((astro, planet) => {
    if (!astro?.planets) return null;
    const planetData = astro.planets.find((p: { name: string }) => p.name.toLowerCase() === planet);
    return planetData?.house || null;
  }),
  getPlanetsInHouse: vi.fn((astro, house) => {
    if (!astro?.planets) return [];
    return astro.planets
      .filter((p: { house: number }) => p.house === house)
      .map((p: { name: string }) => p.name);
  }),
}));

vi.mock('@/components/destiny-map/free-report/scoring', () => ({
  calculateWealthScore: vi.fn(() => ({
    score: 75,
    components: [],
    grade: { ko: '상', en: 'Good' },
    emoji: '💰',
  })),
}));

describe('getCareerAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createBasicSaju = (dayMaster: string = '갑'): SajuData => ({
    dayMaster: { name: dayMaster, heavenlyStem: dayMaster },
    fiveElements: { wood: 3, fire: 2, earth: 1, metal: 1, water: 1 },
  } as unknown as SajuData);

  const createBasicAstro = (): AstroData => ({
    planets: [
      { name: 'sun', sign: 'aries', house: 1 },
      { name: 'moon', sign: 'cancer', house: 4 },
      { name: 'mercury', sign: 'virgo', house: 6 },
      { name: 'saturn', sign: 'capricorn', house: 10 },
      { name: 'jupiter', sign: 'leo', house: 5 },
    ],
    mc: { sign: 'leo' },
    houses: {
      9: { sign: 'sagittarius' },
      10: { sign: 'aries' },
    },
  } as unknown as AstroData);

  describe('basic analysis', () => {
    it('should return null if dayMaster is not available', () => {
      const result = getCareerAnalysis({} as SajuData, undefined, 'ko');
      expect(result).toBeNull();
    });

    it('should return analysis with dayMaster traits', () => {
      const saju = createBasicSaju('갑');
      const result = getCareerAnalysis(saju, undefined, 'ko');

      expect(result).not.toBeNull();
      expect(result?.workStyle).toContain('리더십이 강해요');
      expect(result?.avoidEnvironment).toContain('복잡한 규칙');
      expect(result?.growthTip).toContain('꾸준한 성장');
    });

    it('should return English text when lang is en', () => {
      const saju = createBasicSaju('갑');
      const result = getCareerAnalysis(saju, undefined, 'en');

      expect(result).not.toBeNull();
      expect(result?.workStyle).toContain('Strong leadership');
      expect(result?.avoidEnvironment).toContain('Complex rules');
    });

    it('should fall back to default dayMaster if not found', () => {
      const saju = { dayMaster: { name: '알수없음' } } as unknown as SajuData;
      const result = getCareerAnalysis(saju, undefined, 'ko');

      expect(result).not.toBeNull();
      expect(result?.workStyle).toContain('리더십');
    });
  });

  describe('five elements integration', () => {
    it('should include strengths from strongest element', () => {
      const saju = createBasicSaju();
      saju.fiveElements = { wood: 5, fire: 2, earth: 1, metal: 1, water: 1 };

      const result = getCareerAnalysis(saju, undefined, 'ko');

      expect(result?.strengths).toContain('창의력');
      expect(result?.suggestedFields).toContain('교육');
    });

    it('should include fields from second strongest element', () => {
      const saju = createBasicSaju();
      saju.fiveElements = { wood: 5, fire: 4, earth: 1, metal: 1, water: 1 };

      const result = getCareerAnalysis(saju, undefined, 'ko');

      expect(result?.suggestedFields).toContain('엔터테인먼트');
    });
  });

  describe('astrology integration', () => {
    it('should add sun sign traits to workStyle', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getCareerAnalysis(saju, astro, 'ko');

      expect(result?.workStyle).toContain('개척자');
      expect(result?.strengths).toContain('추진력');
    });

    it('should add MC sign to public image', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getCareerAnalysis(saju, astro, 'ko');

      expect(result?.publicImage).toContain('리더');
      expect(result?.idealEnvironment).toContain('리더');
    });

    it('should add house 10 sign leadership style', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getCareerAnalysis(saju, astro, 'ko');

      expect(result?.leadershipStyle).toBe('용감한 리더십');
      expect(result?.workStyle).toContain('선구자 역할');
    });

    it('should include saturn career path', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        ...createBasicAstro(),
        planets: [
          ...createBasicAstro().planets!,
          { name: 'saturn', sign: 'capricorn', house: 10 },
        ],
      } as unknown as AstroData;

      const result = getCareerAnalysis(saju, astro, 'ko');

      expect(result?.careerPath).toBe('구조적 성공');
    });
  });

  describe('sibsin integration', () => {
    it('should include sibsin career traits when present', () => {
      const saju = createBasicSaju();
      saju.advancedAnalysis = {
        sibsin: {
          sibsinDistribution: { '정관': 3, '편관': 2, '식신': 1 },
        },
      } as unknown as SajuData['advancedAnalysis'];

      const result = getCareerAnalysis(saju, undefined, 'ko');

      expect(result?.sibsinCareer).toBe('리더십과 관리');
      expect(result?.suggestedFields).toContain('관리직');
    });

    it('should map individual sibsin to categories', () => {
      const saju = createBasicSaju();
      saju.advancedAnalysis = {
        sibsin: {
          sibsinDistribution: { '정재': 4, '편재': 2 },
        },
      } as unknown as SajuData['advancedAnalysis'];

      const result = getCareerAnalysis(saju, undefined, 'ko');

      expect(result?.sibsinCareer).toBe('재물 관리');
    });
  });

  describe('daeun (대운) integration', () => {
    it('should include current phase from daeun', () => {
      const saju = createBasicSaju();
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - 35;

      saju.facts = { birthDate: `${birthYear}-01-01` };
      saju.unse = {
        daeun: [
          { age: 30, heavenlyStem: '갑' },
          { age: 40, heavenlyStem: '병' },
        ],
      } as unknown as SajuData['unse'];

      const result = getCareerAnalysis(saju, undefined, 'ko');

      expect(result?.currentPhase).toContain('성장과 확장');
    });

    it('should handle fire element daeun', () => {
      const saju = createBasicSaju();
      const currentYear = new Date().getFullYear();
      const birthYear = currentYear - 35;

      saju.facts = { birthDate: `${birthYear}-01-01` };
      saju.unse = {
        daeun: [
          { age: 30, heavenlyStem: '병' },
        ],
      } as unknown as SajuData['unse'];

      const result = getCareerAnalysis(saju, undefined, 'ko');

      expect(result?.currentPhase).toContain('빛나고 인정받는');
    });
  });

  describe('jupiter blessings', () => {
    it('should include jupiter house blessings', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [
          { name: 'jupiter', sign: 'leo', house: 10 },
        ],
      } as unknown as AstroData;

      const result = getCareerAnalysis(saju, astro, 'ko');

      expect(result?.jupiterBlessings).toBe('커리어에서 행운');
    });
  });

  describe('aspects', () => {
    it('should include saturn-MC aspect', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        ...createBasicAstro(),
        aspects: { saturnMc: { type: 'conjunction' } },
      } as unknown as AstroData;

      const result = getCareerAnalysis(saju, astro, 'ko');

      expect(result?.saturnMcAspect).toBe('커리어 책임감');
    });

    it('should include sun-saturn aspect', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        ...createBasicAstro(),
        aspects: { sunSaturn: { type: 'square' } },
      } as unknown as AstroData;

      const result = getCareerAnalysis(saju, astro, 'ko');

      expect(result?.sunSaturnAspect).toBe('권위와 도전');
    });
  });

  describe('overseas fortune (해외운)', () => {
    it('should include overseas fortune from 9th house', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        ...createBasicAstro(),
        houses: {
          9: { sign: 'sagittarius' },
        },
      } as unknown as AstroData;

      const result = getCareerAnalysis(saju, astro, 'ko');

      expect(result?.overseasFortune).toContain('해외');
    });

    it('should include yeokma (역마) in overseas fortune', () => {
      const saju = createBasicSaju();
      saju.sinsal = {
        luckyList: [{ name: '역마살' }],
        unluckyList: [],
      } as unknown as SajuData['sinsal'];

      const result = getCareerAnalysis(saju, undefined, 'ko');

      expect(result?.overseasFortune).toContain('역마살');
    });

    it('should include jupiter in 9th house for overseas fortune', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [
          { name: 'jupiter', sign: 'sagittarius', house: 9 },
        ],
        houses: {
          9: { sign: 'sagittarius' },
        },
      } as unknown as AstroData;

      const result = getCareerAnalysis(saju, astro, 'ko');

      expect(result?.overseasFortune).toContain('목성');
    });
  });

  describe('wealth style (재물운)', () => {
    it('should indicate stable wealth type with jeongjae', () => {
      const saju = createBasicSaju();
      saju.advancedAnalysis = {
        sibsin: {
          sibsinDistribution: { '정재': 3, '편재': 1 },
        },
      } as unknown as SajuData['advancedAnalysis'];

      const result = getCareerAnalysis(saju, undefined, 'ko');

      expect(result?.wealthStyle).toContain('안정적');
    });

    it('should indicate diverse income with pyeonjae', () => {
      const saju = createBasicSaju();
      saju.advancedAnalysis = {
        sibsin: {
          sibsinDistribution: { '정재': 1, '편재': 3 },
        },
      } as unknown as SajuData['advancedAnalysis'];

      const result = getCareerAnalysis(saju, undefined, 'ko');

      expect(result?.wealthStyle).toContain('투자');
    });

    it('should include 2nd house planets for wealth style', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [
          { name: 'venus', sign: 'taurus', house: 2 },
        ],
      } as unknown as AstroData;

      const result = getCareerAnalysis(saju, astro, 'ko');

      expect(result?.wealthStyle).toContain('2하우스');
    });

    it('should include 8th house for wealth style', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [
          { name: 'pluto', sign: 'scorpio', house: 8 },
        ],
      } as unknown as AstroData;

      const result = getCareerAnalysis(saju, astro, 'ko');

      expect(result?.wealthStyle).toContain('8하우스');
    });
  });

  describe('success timing (성공 시기)', () => {
    it('should return success timing based on yongsin', () => {
      const saju = createBasicSaju();
      const currentYear = new Date().getFullYear();

      saju.advancedAnalysis = {
        yongsin: {
          yongsinList: [{ element: 'fire' }],
        },
      } as unknown as SajuData['advancedAnalysis'];
      saju.unse = {
        annual: [
          { year: currentYear + 1, stem: { element: 'fire' } },
          { year: currentYear + 3, stem: { element: 'fire' } },
        ],
      } as unknown as SajuData['unse'];

      const result = getCareerAnalysis(saju, undefined, 'ko');

      expect(result?.successTiming).toContain('용신');
    });

    it('should return fire year timing when no yongsin match', () => {
      const saju = createBasicSaju();
      const currentYear = new Date().getFullYear();

      saju.unse = {
        annual: [
          { year: currentYear + 2, stem: { element: 'fire' } },
        ],
      } as unknown as SajuData['unse'];

      const result = getCareerAnalysis(saju, undefined, 'ko');

      expect(result?.successTiming).toContain('빛날');
    });
  });

  describe('decision and teamwork styles', () => {
    it('should include mercury-based decision style', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getCareerAnalysis(saju, astro, 'ko');

      expect(result?.decisionStyle).toBe('분석적 결정');
    });

    it('should include moon-based teamwork style', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getCareerAnalysis(saju, astro, 'ko');

      expect(result?.teamworkStyle).toBe('배려하는 팀원');
    });
  });

  describe('wealth score', () => {
    it('should include wealth score from calculator', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getCareerAnalysis(saju, astro, 'ko');

      expect(result?.wealthScore).toBe(75);
    });
  });

  describe('strengths and suggested fields', () => {
    it('should return unique strengths (max 4)', () => {
      const saju = createBasicSaju();
      saju.fiveElements = { wood: 5, fire: 4, earth: 3, metal: 2, water: 1 };
      const astro = createBasicAstro();

      const result = getCareerAnalysis(saju, astro, 'ko');

      expect(result?.strengths.length).toBeLessThanOrEqual(4);
      expect(new Set(result?.strengths).size).toBe(result?.strengths.length);
    });

    it('should return unique suggested fields (max 6)', () => {
      const saju = createBasicSaju();
      saju.fiveElements = { wood: 5, fire: 4, earth: 3, metal: 2, water: 1 };
      saju.advancedAnalysis = {
        sibsin: {
          sibsinDistribution: { '정관': 3 },
        },
      } as unknown as SajuData['advancedAnalysis'];

      const result = getCareerAnalysis(saju, undefined, 'ko');

      expect(result?.suggestedFields.length).toBeLessThanOrEqual(6);
      expect(new Set(result?.suggestedFields).size).toBe(result?.suggestedFields.length);
    });
  });

  describe('default values', () => {
    it('should provide default ideal environment when MC not available', () => {
      const saju = createBasicSaju();

      const result = getCareerAnalysis(saju, undefined, 'ko');

      expect(result?.idealEnvironment).toContain('강점');
    });

    it('should provide English default environment', () => {
      const saju = createBasicSaju();

      const result = getCareerAnalysis(saju, undefined, 'en');

      expect(result?.idealEnvironment).toContain('strengths');
    });
  });

  describe('edge cases', () => {
    it('should handle empty saju data', () => {
      const result = getCareerAnalysis(undefined, undefined, 'ko');
      expect(result).toBeNull();
    });

    it('should handle empty astro data gracefully', () => {
      const saju = createBasicSaju();
      const result = getCareerAnalysis(saju, {} as AstroData, 'ko');

      expect(result).not.toBeNull();
      expect(result?.publicImage).toBeUndefined();
    });

    it('should handle missing planets array', () => {
      const saju = createBasicSaju();
      const astro = { mc: { sign: 'leo' } } as AstroData;

      const result = getCareerAnalysis(saju, astro, 'ko');

      expect(result).not.toBeNull();
    });

    it('should handle dayMaster as string', () => {
      const saju = { dayMaster: '을' } as unknown as SajuData;

      const result = getCareerAnalysis(saju, undefined, 'ko');

      expect(result).not.toBeNull();
      expect(result?.workStyle).toContain('유연하게');
    });

    it('should handle empty sinsal lists', () => {
      const saju = createBasicSaju();
      saju.sinsal = { luckyList: [], unluckyList: [] } as unknown as SajuData['sinsal'];

      const result = getCareerAnalysis(saju, undefined, 'ko');

      expect(result).not.toBeNull();
      // overseasFortune is undefined when there's no yeokma and no 9th house data
      expect(result?.overseasFortune === undefined || !result?.overseasFortune.includes('역마살')).toBe(true);
    });
  });
});
