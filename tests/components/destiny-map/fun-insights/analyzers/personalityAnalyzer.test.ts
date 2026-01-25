/**
 * Personality Analyzer Tests
 * 성격 분석 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPersonalityAnalysis } from '@/components/destiny-map/fun-insights/analyzers/personalityAnalyzer';
import type { SajuData, AstroData } from '@/components/destiny-map/fun-insights/types';

// Mock utils
vi.mock('@/components/destiny-map/fun-insights/analyzers/utils', () => ({
  extractDayMaster: vi.fn((saju) => {
    if (!saju?.dayMaster) return null;
    return typeof saju.dayMaster === 'string' ? saju.dayMaster : saju.dayMaster.name;
  }),
  extractFiveElementsSorted: vi.fn((saju) => {
    if (!saju?.fiveElements) return [];
    return Object.entries(saju.fiveElements).sort(([, a], [, b]) => (b as number) - (a as number));
  }),
  extractPlanetSign: vi.fn((astro, planet) => {
    if (!astro?.planets) return null;
    const planetData = astro.planets.find((p: { name: string }) => p.name.toLowerCase() === planet);
    return planetData?.sign?.toLowerCase() || null;
  }),
  selectLang: vi.fn((isKo, obj) => isKo ? obj.ko : obj.en),
  uniqueArray: vi.fn((arr) => [...new Set(arr)]),
}));

// Mock data modules
vi.mock('@/components/destiny-map/fun-insights/data/dayMasterTraits', () => ({
  dayMasterPersonalityTraits: {
    '갑': {
      title: { ko: '리더 유형', en: 'Leader Type' },
      core: { ko: '정직하고 강한 성격', en: 'Honest and strong personality' },
      traits: { ko: ['리더십', '정직'], en: ['Leadership', 'Honesty'] },
      strength: { ko: '추진력', en: 'Drive' },
      challenge: { ko: '융통성 부족', en: 'Lack of flexibility' },
    },
    '을': {
      title: { ko: '조화 유형', en: 'Harmony Type' },
      core: { ko: '유연하고 적응력 있는', en: 'Flexible and adaptable' },
      traits: { ko: ['유연성', '협력'], en: ['Flexibility', 'Cooperation'] },
      strength: { ko: '적응력', en: 'Adaptability' },
      challenge: { ko: '우유부단', en: 'Indecisiveness' },
    },
  },
}));

vi.mock('@/components/destiny-map/fun-insights/data/zodiacTraits', () => ({
  zodiacPersonalityTraits: {
    aries: {
      trait: { ko: '열정적', en: 'Passionate' },
      strength: { ko: '용기', en: 'Courage' },
    },
    cancer: {
      trait: { ko: '감성적', en: 'Emotional' },
      strength: { ko: '공감력', en: 'Empathy' },
    },
    leo: {
      trait: { ko: '당당한', en: 'Confident' },
      strength: { ko: '카리스마', en: 'Charisma' },
    },
    virgo: {
      trait: { ko: '분석적', en: 'Analytical' },
      strength: { ko: '세심함', en: 'Attention to detail' },
    },
  },
}));

vi.mock('@/components/destiny-map/fun-insights/data/elementAnalysisTraits', () => ({
  elementPersonalityTraits: {
    wood: { ko: '성장과 확장을 추구해요', en: 'Pursue growth and expansion' },
    fire: { ko: '열정과 표현을 중시해요', en: 'Value passion and expression' },
    metal: { ko: '결단력과 정확성을 갖췄어요', en: 'Have decisiveness and precision' },
  },
  elementAdvice: {
    water: { ko: '유연성을 키우세요', en: 'Develop flexibility' },
    wood: { ko: '끈기를 가지세요', en: 'Have persistence' },
  },
}));

describe('getPersonalityAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createBasicSaju = (dayMaster: string = '갑'): SajuData => ({
    dayMaster: { name: dayMaster },
    fiveElements: { wood: 3, fire: 2, earth: 1, metal: 2, water: 2 },
  } as unknown as SajuData);

  const createBasicAstro = (): AstroData => ({
    planets: [
      { name: 'sun', sign: 'aries', house: 1 },
      { name: 'moon', sign: 'cancer', house: 4 },
      { name: 'mercury', sign: 'virgo', house: 6 },
      { name: 'venus', sign: 'leo', house: 5 },
      { name: 'mars', sign: 'aries', house: 1 },
    ],
    ascendant: { sign: 'leo' },
    aspects: [],
  } as unknown as AstroData);

  describe('basic analysis', () => {
    it('should return null if dayMaster is not available', () => {
      const result = getPersonalityAnalysis({} as SajuData, undefined, 'ko');
      expect(result).toBeNull();
    });

    it('should return analysis with dayMaster traits', () => {
      const saju = createBasicSaju('갑');
      const result = getPersonalityAnalysis(saju, undefined, 'ko');

      expect(result).not.toBeNull();
      expect(result?.title).toBe('리더 유형');
      expect(result?.description).toContain('정직하고 강한');
      expect(result?.strengths).toContain('추진력');
      expect(result?.challenges).toContain('융통성 부족');
    });

    it('should return English text when lang is en', () => {
      const saju = createBasicSaju('갑');
      const result = getPersonalityAnalysis(saju, undefined, 'en');

      expect(result).not.toBeNull();
      expect(result?.title).toBe('Leader Type');
      expect(result?.description).toContain('Honest and strong');
    });

    it('should fall back to default dayMaster if not found', () => {
      const saju = { dayMaster: { name: '알수없음' } } as unknown as SajuData;
      const result = getPersonalityAnalysis(saju, undefined, 'ko');

      expect(result).not.toBeNull();
      expect(result?.title).toBe('리더 유형');
    });
  });

  describe('zodiac integration', () => {
    it('should add sun sign traits to description', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getPersonalityAnalysis(saju, astro, 'ko');

      expect(result?.description).toContain('열정적');
      expect(result?.strengths).toContain('용기');
    });

    it('should add moon sign emotion to description', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getPersonalityAnalysis(saju, astro, 'ko');

      expect(result?.description).toContain('감성적');
    });
  });

  describe('element integration', () => {
    it('should include strongest element personality', () => {
      const saju = createBasicSaju();
      saju.fiveElements = { wood: 5, fire: 2, earth: 1, metal: 1, water: 1 };

      const result = getPersonalityAnalysis(saju, undefined, 'ko');

      expect(result?.description).toContain('성장과 확장');
    });

    it('should provide advice based on weakest element', () => {
      const saju = createBasicSaju();
      saju.fiveElements = { wood: 1, fire: 5, earth: 3, metal: 3, water: 3 };

      const result = getPersonalityAnalysis(saju, undefined, 'ko');

      expect(result?.advice).toContain('끈기');
    });
  });

  describe('sibsin integration', () => {
    it('should include sibsin profile when present', () => {
      const saju = createBasicSaju();
      saju.advancedAnalysis = {
        sibsin: {
          sibsinDistribution: { '비겁': 3, '식상': 2 },
        },
      } as unknown as SajuData['advancedAnalysis'];

      const result = getPersonalityAnalysis(saju, undefined, 'ko');

      expect(result?.sibsinProfile).toContain('독립적');
      expect(result?.traits).toContain('독립성');
    });

    it('should handle 식상 dominant sibsin', () => {
      const saju = createBasicSaju();
      saju.advancedAnalysis = {
        sibsin: {
          sibsinDistribution: { '식상': 4, '비겁': 1 },
        },
      } as unknown as SajuData['advancedAnalysis'];

      const result = getPersonalityAnalysis(saju, undefined, 'ko');

      expect(result?.sibsinProfile).toContain('표현력');
    });

    it('should handle 관성 dominant sibsin', () => {
      const saju = createBasicSaju();
      saju.advancedAnalysis = {
        sibsin: {
          sibsinDistribution: { '관성': 4, '비겁': 1 },
        },
      } as unknown as SajuData['advancedAnalysis'];

      const result = getPersonalityAnalysis(saju, undefined, 'ko');

      expect(result?.sibsinProfile).toContain('책임감');
    });
  });

  describe('twelve stage integration', () => {
    it('should include life stage from twelveStages.day', () => {
      const saju = createBasicSaju();
      saju.twelveStages = { day: '장생' } as unknown as SajuData['twelveStages'];

      const result = getPersonalityAnalysis(saju, undefined, 'ko');

      expect(result?.lifeStage).toContain('새로운 시작');
    });

    it('should include life stage from twelveStage', () => {
      const saju = createBasicSaju();
      saju.twelveStage = '제왕' as unknown as SajuData['twelveStage'];

      const result = getPersonalityAnalysis(saju, undefined, 'ko');

      expect(result?.lifeStage).toContain('정점');
    });

    it('should handle 건록 stage', () => {
      const saju = createBasicSaju();
      saju.twelveStages = { day: '건록' } as unknown as SajuData['twelveStages'];

      const result = getPersonalityAnalysis(saju, undefined, 'ko');

      expect(result?.lifeStage).toContain('안정적');
    });
  });

  describe('ascendant integration', () => {
    it('should include social image from ascendant', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getPersonalityAnalysis(saju, astro, 'ko');

      expect(result?.socialImage).toContain('화려');
    });

    it('should handle different ascendant signs', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        ...createBasicAstro(),
        ascendant: { sign: 'virgo' },
      } as unknown as AstroData;

      const result = getPersonalityAnalysis(saju, astro, 'ko');

      expect(result?.socialImage).toContain('깔끔');
    });
  });

  describe('sun-moon aspect', () => {
    it('should include sun-moon harmony from aspects', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        ...createBasicAstro(),
        aspects: [
          { from: 'sun', to: 'moon', type: 'trine' },
        ],
      } as unknown as AstroData;

      const result = getPersonalityAnalysis(saju, astro, 'ko');

      expect(result?.sunMoonHarmony).toContain('조화');
    });

    it('should handle aspect with object from/to', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        ...createBasicAstro(),
        aspects: [
          { from: { name: 'sun' }, to: { name: 'moon' }, type: 'conjunction' },
        ],
      } as unknown as AstroData;

      const result = getPersonalityAnalysis(saju, astro, 'ko');

      expect(result?.sunMoonHarmony).toContain('일치');
    });

    it('should handle opposition aspect', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        ...createBasicAstro(),
        aspects: [
          { from: 'moon', to: 'sun', type: 'opposition' },
        ],
      } as unknown as AstroData;

      const result = getPersonalityAnalysis(saju, astro, 'ko');

      expect(result?.sunMoonHarmony).toContain('긴장');
    });
  });

  describe('mercury thinking style', () => {
    it('should include thinking style from mercury sign', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getPersonalityAnalysis(saju, astro, 'ko');

      expect(result?.thinkingStyle).toContain('분석적');
    });

    it('should handle aries mercury', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [{ name: 'mercury', sign: 'aries', house: 1 }],
      } as unknown as AstroData;

      const result = getPersonalityAnalysis(saju, astro, 'ko');

      expect(result?.thinkingStyle).toContain('빠르고');
    });
  });

  describe('element conflict', () => {
    it('should identify fire-water conflict', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [
          { name: 'sun', sign: 'aries', house: 1 }, // fire
          { name: 'moon', sign: 'cancer', house: 4 }, // water
        ],
      } as unknown as AstroData;

      const result = getPersonalityAnalysis(saju, astro, 'ko');

      expect(result?.innerConflict).toContain('열정과 감정');
    });

    it('should identify air-earth conflict', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [
          { name: 'sun', sign: 'gemini', house: 3 }, // air
          { name: 'moon', sign: 'taurus', house: 2 }, // earth
        ],
      } as unknown as AstroData;

      const result = getPersonalityAnalysis(saju, astro, 'ko');

      expect(result?.innerConflict).toContain('아이디어와 현실');
    });

    it('should not identify conflict for same element', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [
          { name: 'sun', sign: 'aries', house: 1 }, // fire
          { name: 'moon', sign: 'leo', house: 5 }, // fire
        ],
      } as unknown as AstroData;

      const result = getPersonalityAnalysis(saju, astro, 'ko');

      expect(result?.innerConflict).toBeUndefined();
    });
  });

  describe('communication style', () => {
    it('should include communication style from venus sign', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getPersonalityAnalysis(saju, astro, 'ko');

      expect(result?.communicationStyle).toContain('열정적');
    });
  });

  describe('decision making', () => {
    it('should include decision making from mars sign', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getPersonalityAnalysis(saju, astro, 'ko');

      expect(result?.decisionMaking).toContain('빠르고 과감');
    });
  });

  describe('stress response', () => {
    it('should include stress response from moon sign', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getPersonalityAnalysis(saju, astro, 'ko');

      expect(result?.stressResponse).toContain('가까운 사람');
    });
  });

  describe('traits and strengths limits', () => {
    it('should limit traits to 5', () => {
      const saju = createBasicSaju();
      saju.advancedAnalysis = {
        sibsin: {
          sibsinDistribution: { '비겁': 3, '식상': 2 },
        },
      } as unknown as SajuData['advancedAnalysis'];
      const astro = createBasicAstro();

      const result = getPersonalityAnalysis(saju, astro, 'ko');

      expect(result?.traits.length).toBeLessThanOrEqual(5);
    });

    it('should limit strengths to 4', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getPersonalityAnalysis(saju, astro, 'ko');

      expect(result?.strengths.length).toBeLessThanOrEqual(4);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined saju', () => {
      const result = getPersonalityAnalysis(undefined, undefined, 'ko');
      expect(result).toBeNull();
    });

    it('should handle empty astro data', () => {
      const saju = createBasicSaju();
      const result = getPersonalityAnalysis(saju, {} as AstroData, 'ko');

      expect(result).not.toBeNull();
      expect(result?.socialImage).toBeUndefined();
    });

    it('should provide default advice when no weakest element', () => {
      const saju = { dayMaster: { name: '갑' } } as unknown as SajuData;
      const result = getPersonalityAnalysis(saju, undefined, 'ko');

      expect(result?.advice).toContain('당신다운');
    });

    it('should handle missing aspects array', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: createBasicAstro().planets,
        ascendant: { sign: 'leo' },
      } as unknown as AstroData;

      const result = getPersonalityAnalysis(saju, astro, 'ko');

      expect(result).not.toBeNull();
      expect(result?.sunMoonHarmony).toBeUndefined();
    });
  });
});
