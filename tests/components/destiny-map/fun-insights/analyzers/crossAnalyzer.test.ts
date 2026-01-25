/**
 * Cross Analyzer Tests
 * 동서양 교차 분석 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCrossAnalysis } from '@/components/destiny-map/fun-insights/analyzers/crossAnalyzer';
import type { SajuData, AstroData } from '@/components/destiny-map/fun-insights/types';

// Mock data modules
vi.mock('@/components/destiny-map/fun-insights/data', () => ({
  elementTraits: {
    wood: { ko: '목', en: 'Wood', emoji: '🌿' },
    fire: { ko: '화', en: 'Fire', emoji: '🔥' },
    earth: { ko: '토', en: 'Earth', emoji: '🏔️' },
    metal: { ko: '금', en: 'Metal', emoji: '⚔️' },
    water: { ko: '수', en: 'Water', emoji: '💧' },
  },
  dayMasterData: {
    '갑': { ko: '갑목', en: 'Jia Wood', element: 'wood', personality: { ko: '창의적이고 진취적', en: 'creative and progressive' } },
    '을': { ko: '을목', en: 'Yi Wood', element: 'wood', personality: { ko: '유연하고 적응력 강한', en: 'flexible and adaptable' } },
    '병': { ko: '병화', en: 'Bing Fire', element: 'fire', personality: { ko: '열정적이고 밝은', en: 'passionate and bright' } },
    '정': { ko: '정화', en: 'Ding Fire', element: 'fire', personality: { ko: '섬세하고 따뜻한', en: 'delicate and warm' } },
    '무': { ko: '무토', en: 'Wu Earth', element: 'earth', personality: { ko: '안정적이고 든든한', en: 'stable and reliable' } },
    '기': { ko: '기토', en: 'Ji Earth', element: 'earth', personality: { ko: '포용력 있고 현실적인', en: 'inclusive and practical' } },
    '경': { ko: '경금', en: 'Geng Metal', element: 'metal', personality: { ko: '강인하고 결단력 있는', en: 'strong and decisive' } },
    '신': { ko: '신금', en: 'Xin Metal', element: 'metal', personality: { ko: '정교하고 예리한', en: 'refined and sharp' } },
    '임': { ko: '임수', en: 'Ren Water', element: 'water', personality: { ko: '지혜롭고 유동적인', en: 'wise and fluid' } },
    '계': { ko: '계수', en: 'Gui Water', element: 'water', personality: { ko: '온화하고 직관적인', en: 'gentle and intuitive' } },
  },
  zodiacData: {
    aries: { ko: '양자리', en: 'Aries', element: 'fire', trait: { ko: '용감하고 적극적인', en: 'brave and proactive' } },
    taurus: { ko: '황소자리', en: 'Taurus', element: 'earth', trait: { ko: '안정적이고 끈기 있는', en: 'stable and persistent' } },
    gemini: { ko: '쌍둥이자리', en: 'Gemini', element: 'air', trait: { ko: '호기심 많고 사교적인', en: 'curious and social' } },
    cancer: { ko: '게자리', en: 'Cancer', element: 'water', trait: { ko: '보호적이고 감성적인', en: 'protective and emotional' } },
    leo: { ko: '사자자리', en: 'Leo', element: 'fire', trait: { ko: '자신감 있고 관대한', en: 'confident and generous' } },
    virgo: { ko: '처녀자리', en: 'Virgo', element: 'earth', trait: { ko: '분석적이고 실용적인', en: 'analytical and practical' } },
    libra: { ko: '천칭자리', en: 'Libra', element: 'air', trait: { ko: '조화롭고 공정한', en: 'harmonious and fair' } },
    scorpio: { ko: '전갈자리', en: 'Scorpio', element: 'water', trait: { ko: '강렬하고 통찰력 있는', en: 'intense and insightful' } },
    sagittarius: { ko: '궁수자리', en: 'Sagittarius', element: 'fire', trait: { ko: '낙관적이고 탐험적인', en: 'optimistic and explorative' } },
    capricorn: { ko: '염소자리', en: 'Capricorn', element: 'earth', trait: { ko: '야심 있고 실용적인', en: 'ambitious and practical' } },
    aquarius: { ko: '물병자리', en: 'Aquarius', element: 'air', trait: { ko: '독창적이고 진보적인', en: 'original and progressive' } },
    pisces: { ko: '물고기자리', en: 'Pisces', element: 'water', trait: { ko: '상상력 풍부하고 공감적인', en: 'imaginative and empathetic' } },
  },
  elementKeyMap: {
    '木': 'wood',
    '火': 'fire',
    '土': 'earth',
    '金': 'metal',
    '水': 'water',
  },
  tianGanMap: {
    '甲': '갑',
    '乙': '을',
    '丙': '병',
    '丁': '정',
    '戊': '무',
    '己': '기',
    '庚': '경',
    '辛': '신',
    '壬': '임',
    '癸': '계',
  },
  elementRelations: {
    generates: { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' },
    supportedBy: { wood: 'water', fire: 'wood', earth: 'fire', metal: 'earth', water: 'metal' },
  },
  astroToSaju: {
    fire: 'fire',
    earth: 'earth',
    air: 'metal',
    water: 'water',
  },
}));

// Mock utils
vi.mock('@/components/destiny-map/fun-insights/utils', () => ({
  findPlanetSign: vi.fn((astro, planet) => {
    if (!astro?.planets) return null;
    const planets = Array.isArray(astro.planets) ? astro.planets : [];
    const found = planets.find((p: { name?: string }) => p.name?.toLowerCase() === planet?.toLowerCase());
    return found?.sign?.toLowerCase() || null;
  }),
}));

// Mock matrixAnalyzer
vi.mock('@/components/destiny-map/fun-insights/analyzers/matrixAnalyzer', () => ({
  getMatrixAnalysis: vi.fn(() => null),
}));

import { getMatrixAnalysis } from '@/components/destiny-map/fun-insights/analyzers/matrixAnalyzer';

describe('getCrossAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMatrixAnalysis).mockReturnValue(null);
  });

  const createBasicSaju = (): SajuData => ({
    dayMaster: {
      name: '갑',
      element: '木',
    },
    fiveElements: {
      wood: 30,
      fire: 25,
      earth: 20,
      metal: 15,
      water: 10,
    },
  } as unknown as SajuData);

  const createBasicAstro = (): AstroData => ({
    planets: [
      { name: 'Sun', sign: 'aries' },
      { name: 'Moon', sign: 'cancer' },
    ],
  } as unknown as AstroData);

  describe('day master × sun sign analysis', () => {
    it('should analyze day master and sun sign combination', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getCrossAnalysis(saju, astro, 'ko');

      const dayMasterSunInsight = result.find(r => r.title === '기본 성격과 겉모습');
      expect(dayMasterSunInsight).toBeDefined();
      expect(dayMasterSunInsight?.summary).toContain('갑목');
      expect(dayMasterSunInsight?.summary).toContain('양자리');
    });

    it('should show harmony emoji when elements match', () => {
      // 갑 is wood, aries is fire, wood generates fire = harmony
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getCrossAnalysis(saju, astro, 'ko');

      const insight = result.find(r => r.title === '기본 성격과 겉모습');
      expect(insight?.emoji).toBe('✨');
      expect(insight?.insight).toContain('자연스럽게 어울려요');
    });

    it('should show different sides emoji when elements do not match', () => {
      // 갑 is wood, capricorn is earth (air->metal in astroToSaju)
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [
          { name: 'Sun', sign: 'libra' }, // air -> metal, wood doesn't generate or support metal
          { name: 'Moon', sign: 'cancer' },
        ],
      } as unknown as AstroData;

      const result = getCrossAnalysis(saju, astro, 'ko');

      const insight = result.find(r => r.title === '기본 성격과 겉모습');
      expect(insight?.emoji).toBe('🔄');
      expect(insight?.insight).toContain('다른 모습을 보여줘요');
    });

    it('should return English text when lang is en', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getCrossAnalysis(saju, astro, 'en');

      const insight = result.find(r => r.title === 'Inner Nature & Outer Self');
      expect(insight).toBeDefined();
      expect(insight?.summary).toContain('Jia Wood');
      expect(insight?.summary).toContain('Aries');
    });

    it('should handle heavenlyStem property for day master', () => {
      const saju: SajuData = {
        dayMaster: {
          heavenlyStem: '병',
        },
        fiveElements: { wood: 20, fire: 30, earth: 20, metal: 15, water: 15 },
      } as unknown as SajuData;
      const astro = createBasicAstro();

      const result = getCrossAnalysis(saju, astro, 'ko');

      const insight = result.find(r => r.title === '기본 성격과 겉모습');
      expect(insight?.summary).toContain('병화');
    });

    it('should handle Chinese character day master name', () => {
      const saju: SajuData = {
        dayMaster: {
          name: '甲', // Chinese character
        },
        fiveElements: { wood: 30, fire: 25, earth: 20, metal: 15, water: 10 },
      } as unknown as SajuData;
      const astro = createBasicAstro();

      const result = getCrossAnalysis(saju, astro, 'ko');

      const insight = result.find(r => r.title === '기본 성격과 겉모습');
      expect(insight?.summary).toContain('갑목');
    });
  });

  describe('five elements × moon sign analysis', () => {
    it('should analyze strongest element and moon sign', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getCrossAnalysis(saju, astro, 'ko');

      const moonInsight = result.find(r => r.title === '속마음과 감정');
      expect(moonInsight).toBeDefined();
      expect(moonInsight?.emoji).toBe('🌙');
      expect(moonInsight?.summary).toContain('목');
      expect(moonInsight?.summary).toContain('게자리');
    });

    it('should use element emotion descriptions', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getCrossAnalysis(saju, astro, 'ko');

      const moonInsight = result.find(r => r.title === '속마음과 감정');
      expect(moonInsight?.insight).toContain('추진력 있고 성장 지향적인');
    });

    it('should show different emotion for fire element', () => {
      const saju: SajuData = {
        fiveElements: { wood: 15, fire: 35, earth: 20, metal: 15, water: 15 },
      } as unknown as SajuData;
      const astro = createBasicAstro();

      const result = getCrossAnalysis(saju, astro, 'ko');

      const moonInsight = result.find(r => r.title === '속마음과 감정');
      expect(moonInsight?.insight).toContain('열정적이고 표현력 강한');
    });

    it('should return English text when lang is en', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getCrossAnalysis(saju, astro, 'en');

      const moonInsight = result.find(r => r.title === 'Inner Feelings & Emotions');
      expect(moonInsight).toBeDefined();
      expect(moonInsight?.summary).toContain('Wood');
      expect(moonInsight?.summary).toContain('Cancer');
    });
  });

  describe('destiny fusion matrix synergy', () => {
    it('should include matrix synergy when available', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      vi.mocked(getMatrixAnalysis).mockReturnValue({
        synergy: {
          dominantEnergy: { ko: '균형 잡힌 에너지', en: 'Balanced energy' },
          overallScore: 75,
          topStrengths: [{ icon: '🌟', name: { ko: '창의력', en: 'Creativity' } }],
        },
        elementFusions: [
          {
            sajuElement: '목',
            westElement: '화',
            fusion: { score: 8, keyword: { ko: '성장과 열정', en: 'Growth and passion' } },
          },
          {
            sajuElement: '화',
            westElement: '토',
            fusion: { score: 7, keyword: { ko: '변화와 안정', en: 'Change and stability' } },
          },
        ],
      } as ReturnType<typeof getMatrixAnalysis>);

      const result = getCrossAnalysis(saju, astro, 'ko');

      const matrixInsight = result.find(r => r.title === '운명 융합 시너지');
      expect(matrixInsight).toBeDefined();
      expect(matrixInsight?.summary).toContain('균형 잡힌 에너지');
      expect(matrixInsight?.insight).toContain('목 × 화');
      expect(matrixInsight?.insight).toContain('75점');
    });

    it('should filter fusions with score < 7', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      vi.mocked(getMatrixAnalysis).mockReturnValue({
        synergy: {
          dominantEnergy: { ko: '에너지', en: 'Energy' },
          overallScore: 60,
          topStrengths: [],
        },
        elementFusions: [
          {
            sajuElement: '목',
            westElement: '화',
            fusion: { score: 6, keyword: { ko: '낮은 점수', en: 'Low score' } }, // filtered out
          },
        ],
      } as ReturnType<typeof getMatrixAnalysis>);

      const result = getCrossAnalysis(saju, astro, 'ko');

      const matrixInsight = result.find(r => r.title === '운명 융합 시너지');
      expect(matrixInsight).toBeUndefined();
    });

    it('should not include matrix insight when matrix analysis is null', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      vi.mocked(getMatrixAnalysis).mockReturnValue(null);

      const result = getCrossAnalysis(saju, astro, 'ko');

      const matrixInsight = result.find(r => r.title === '운명 융합 시너지');
      expect(matrixInsight).toBeUndefined();
    });

    it('should return English matrix synergy', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      vi.mocked(getMatrixAnalysis).mockReturnValue({
        synergy: {
          dominantEnergy: { ko: '균형 잡힌 에너지', en: 'Balanced energy' },
          overallScore: 75,
          topStrengths: [{ icon: '🌟', name: { ko: '창의력', en: 'Creativity' } }],
        },
        elementFusions: [
          {
            sajuElement: 'Wood',
            westElement: 'Fire',
            fusion: { score: 8, keyword: { ko: '성장과 열정', en: 'Growth and passion' } },
          },
        ],
      } as ReturnType<typeof getMatrixAnalysis>);

      const result = getCrossAnalysis(saju, astro, 'en');

      const matrixInsight = result.find(r => r.title === 'Destiny Fusion Synergy');
      expect(matrixInsight).toBeDefined();
      expect(matrixInsight?.summary).toBe('Balanced energy');
    });
  });

  describe('edge cases', () => {
    it('should return empty array when no data available', () => {
      const result = getCrossAnalysis(undefined, undefined, 'ko');
      expect(result).toEqual([]);
    });

    it('should handle missing day master', () => {
      const saju: SajuData = {
        fiveElements: { wood: 30, fire: 25, earth: 20, metal: 15, water: 10 },
      } as unknown as SajuData;
      const astro = createBasicAstro();

      const result = getCrossAnalysis(saju, astro, 'ko');

      // Should still have moon insight but no day master insight
      const dayMasterInsight = result.find(r => r.title === '기본 성격과 겉모습');
      const moonInsight = result.find(r => r.title === '속마음과 감정');

      expect(dayMasterInsight).toBeUndefined();
      expect(moonInsight).toBeDefined();
    });

    it('should handle missing fiveElements', () => {
      const saju: SajuData = {
        dayMaster: { name: '갑', element: '木' },
      } as unknown as SajuData;
      const astro = createBasicAstro();

      const result = getCrossAnalysis(saju, astro, 'ko');

      const moonInsight = result.find(r => r.title === '속마음과 감정');
      expect(moonInsight).toBeUndefined();
    });

    it('should handle missing sun sign', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [{ name: 'Moon', sign: 'cancer' }],
      } as unknown as AstroData;

      const result = getCrossAnalysis(saju, astro, 'ko');

      const dayMasterInsight = result.find(r => r.title === '기본 성격과 겉모습');
      expect(dayMasterInsight).toBeUndefined();
    });

    it('should handle missing moon sign', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [{ name: 'Sun', sign: 'aries' }],
      } as unknown as AstroData;

      const result = getCrossAnalysis(saju, astro, 'ko');

      const moonInsight = result.find(r => r.title === '속마음과 감정');
      expect(moonInsight).toBeUndefined();
    });

    it('should handle unknown zodiac sign', () => {
      const saju = createBasicSaju();
      const astro: AstroData = {
        planets: [
          { name: 'Sun', sign: 'unknown' },
          { name: 'Moon', sign: 'cancer' },
        ],
      } as unknown as AstroData;

      const result = getCrossAnalysis(saju, astro, 'ko');

      const dayMasterInsight = result.find(r => r.title === '기본 성격과 겉모습');
      expect(dayMasterInsight).toBeUndefined();
    });
  });

  describe('all zodiac signs', () => {
    const zodiacSigns = [
      'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
      'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
    ];

    zodiacSigns.forEach((sign) => {
      it(`should handle ${sign} as sun sign`, () => {
        const saju = createBasicSaju();
        const astro: AstroData = {
          planets: [
            { name: 'Sun', sign },
            { name: 'Moon', sign: 'cancer' },
          ],
        } as unknown as AstroData;

        const result = getCrossAnalysis(saju, astro, 'ko');

        const insight = result.find(r => r.title === '기본 성격과 겉모습');
        expect(insight).toBeDefined();
      });
    });
  });

  describe('all day masters', () => {
    const dayMasters = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];

    dayMasters.forEach((master) => {
      it(`should handle ${master} as day master`, () => {
        const saju: SajuData = {
          dayMaster: { name: master },
          fiveElements: { wood: 20, fire: 20, earth: 20, metal: 20, water: 20 },
        } as unknown as SajuData;
        const astro = createBasicAstro();

        const result = getCrossAnalysis(saju, astro, 'ko');

        const insight = result.find(r => r.title === '기본 성격과 겉모습');
        expect(insight).toBeDefined();
      });
    });
  });
});
