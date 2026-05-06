/**
 * Karma Analyzer Tests
 * 카르마 분석기 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getKarmaAnalysis, type KarmaAnalysisResult } from '@/components/destiny-map/free-report/analyzers/karmaAnalyzer';
import type { SajuData, AstroData } from '@/components/destiny-map/free-report/types';

// Mock utils/geokguk
vi.mock('@/components/destiny-map/free-report/utils/geokguk', () => ({
  getGeokgukType: vi.fn((name) => {
    if (!name) return null;
    const mapping: Record<string, string> = {
      '식신격': 'siksin',
      '상관격': 'sanggwan',
      '정관격': 'jeonggwan',
      '편관격': 'pyeongwan',
      '정재격': 'jeongjae',
      '편재격': 'pyeonjae',
      '정인격': 'jeongin',
      '편인격': 'pyeongin',
    };
    return mapping[name] || null;
  }),
}));

// Mock utils/planets
vi.mock('@/components/destiny-map/free-report/utils/planets', () => ({
  getChironData: vi.fn((astro) => {
    if (!astro?.planets) return null;
    const planets = Array.isArray(astro.planets) ? astro.planets : [];
    const chiron = planets.find((p: { name?: string }) => p.name?.toLowerCase() === 'chiron');
    return chiron || null;
  }),
}));

// Mock utils/houses
vi.mock('@/components/destiny-map/free-report/utils/houses', () => ({
  getPlanetHouse: vi.fn((astro, planetName) => {
    if (!astro?.planets) return null;
    const planets = Array.isArray(astro.planets) ? astro.planets : [];
    const planet = planets.find((p: { name?: string }) =>
      p.name?.toLowerCase() === planetName?.toLowerCase()
    );
    return (planet as { house?: number })?.house || null;
  }),
}));

// Mock scoring
vi.mock('@/components/destiny-map/free-report/scoring', () => ({
  calculateKarmaScore: vi.fn(() => ({ score: 75 })),
}));

// Mock karma data
vi.mock('@/components/destiny-map/free-report/data/karma', () => ({
  GEOKGUK_TO_DRACONIC_SOUL: {
    siksin: {
      title: { ko: '창조자 영혼', en: 'Creator Soul' },
      emoji: '🎨',
      description: { ko: '창조와 표현의 영혼', en: 'Soul of creation and expression' },
      traits: { ko: ['창의력', '표현력'], en: ['Creativity', 'Expression'] },
    },
    jeonggwan: {
      title: { ko: '지도자 영혼', en: 'Leader Soul' },
      emoji: '👑',
      description: { ko: '질서와 통제의 영혼', en: 'Soul of order and control' },
      traits: { ko: ['리더십', '책임감'], en: ['Leadership', 'Responsibility'] },
    },
  },
  NODE_HOUSE_GROWTH_PATH: {
    1: {
      direction: { ko: '자아 발견', en: 'Self-discovery' },
      pastPattern: { ko: '타인 의존', en: 'Dependence on others' },
      lesson: { ko: '독립심 기르기', en: 'Develop independence' },
      advice: { ko: ['자기 주장하기'], en: ['Assert yourself'] },
    },
    10: {
      direction: { ko: '커리어 성취', en: 'Career achievement' },
      pastPattern: { ko: '가정에만 집중', en: 'Focus only on home' },
      lesson: { ko: '사회적 성취', en: 'Social achievement' },
      advice: { ko: ['목표 설정하기'], en: ['Set goals'] },
    },
  },
  CHIRON_HEALING_PATH: {
    aries: {
      wound: { ko: '정체성 상처', en: 'Identity wound' },
      healing: { ko: '자기 수용', en: 'Self-acceptance' },
      gift: { ko: '용기', en: 'Courage' },
    },
    cancer: {
      wound: { ko: '가족 상처', en: 'Family wound' },
      healing: { ko: '내면 치유', en: 'Inner healing' },
      gift: { ko: '공감력', en: 'Empathy' },
    },
  },
  SATURN_LIFE_LESSON: {
    1: {
      lesson: { ko: '자아 성숙', en: 'Self-maturity' },
      timing: { ko: '29세', en: 'Age 29' },
      mastery: { ko: '진정한 자아', en: 'True self' },
    },
    10: {
      lesson: { ko: '커리어 책임', en: 'Career responsibility' },
      timing: { ko: '30대', en: 'In 30s' },
      mastery: { ko: '전문성', en: 'Expertise' },
    },
  },
  DAY_MASTER_SOUL_MISSION: {
    '갑': {
      core: { ko: '성장과 진취', en: 'Growth and progress' },
      expression: { ko: '리더십 발휘', en: 'Exercise leadership' },
      fulfillment: { ko: '새로운 시작', en: 'New beginnings' },
    },
    '병': {
      core: { ko: '열정과 빛', en: 'Passion and light' },
      expression: { ko: '밝은 에너지', en: 'Bright energy' },
      fulfillment: { ko: '영감 주기', en: 'Give inspiration' },
    },
  },
}));

describe('getKarmaAnalysis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createBasicSaju = (): SajuData => ({
    dayMaster: {
      name: '갑',
      heavenlyStem: '갑',
    },
    advancedAnalysis: {
      geokguk: { name: '식신격', type: 'siksin' },
      sinsal: {
        luckyList: [],
        unluckyList: [],
      },
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
      { name: 'Chiron', sign: 'aries', house: 4 },
      { name: 'Saturn', house: 10 },
      { name: 'Pluto', house: 8 },
      { name: 'NorthNode', house: 10 },
    ],
  } as unknown as AstroData);

  describe('basic functionality', () => {
    it('should return null when no data is provided', () => {
      const result = getKarmaAnalysis(undefined, undefined, 'ko');
      expect(result).toBeNull();
    });

    it('should return analysis with saju data only', () => {
      const saju = createBasicSaju();
      const result = getKarmaAnalysis(saju, undefined, 'ko');

      expect(result).not.toBeNull();
      expect(result?.soulType).toBeDefined();
      expect(result?.soulMission).toBeDefined();
    });

    it('should return analysis with astro data only', () => {
      const astro = createBasicAstro();
      const result = getKarmaAnalysis(undefined, astro, 'ko');

      expect(result).not.toBeNull();
      expect(result?.growthPath).toBeDefined();
      expect(result?.woundToHeal).toBeDefined();
    });

    it('should return complete analysis with both data', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();
      const result = getKarmaAnalysis(saju, astro, 'ko');

      expect(result).not.toBeNull();
      expect(result?.soulType).toBeDefined();
      expect(result?.growthPath).toBeDefined();
      expect(result?.woundToHeal).toBeDefined();
      expect(result?.saturnLesson).toBeDefined();
      expect(result?.soulMission).toBeDefined();
      expect(result?.pastLifeTheme).toBeDefined();
      expect(result?.karmaScore).toBeGreaterThanOrEqual(65);
    });
  });

  describe('soul type analysis', () => {
    it('should use geokguk to determine soul type', () => {
      const saju = createBasicSaju();
      const result = getKarmaAnalysis(saju, undefined, 'ko');

      expect(result?.soulType.title).toBe('창조자 영혼');
      expect(result?.soulType.emoji).toBe('🎨');
      expect(result?.soulType.description).toContain('창조');
    });

    it('should return default soul type when geokguk not available', () => {
      const saju: SajuData = {
        dayMaster: { name: '갑' },
      } as unknown as SajuData;

      const result = getKarmaAnalysis(saju, undefined, 'ko');

      expect(result?.soulType.title).toBe('탐험가 영혼');
    });

    it('should return English soul type', () => {
      const saju = createBasicSaju();
      const result = getKarmaAnalysis(saju, undefined, 'en');

      expect(result?.soulType.title).toBe('Creator Soul');
    });
  });

  describe('growth path analysis', () => {
    it('should analyze north node house for growth path', () => {
      const astro = createBasicAstro();
      const result = getKarmaAnalysis(undefined, astro, 'ko');

      expect(result?.growthPath.direction).toBe('커리어 성취');
      expect(result?.growthPath.pastPattern).toBe('가정에만 집중');
    });

    it('should return default growth path when north node not available', () => {
      const astro: AstroData = {
        planets: [{ name: 'Sun', sign: 'aries' }],
      } as unknown as AstroData;

      const result = getKarmaAnalysis(undefined, astro, 'ko');

      expect(result?.growthPath.direction).toBe('자기 발견의 여정');
    });
  });

  describe('wound to heal analysis', () => {
    it('should analyze chiron sign for healing path', () => {
      const astro = createBasicAstro();
      const result = getKarmaAnalysis(undefined, astro, 'ko');

      expect(result?.woundToHeal.wound).toBe('정체성 상처');
      expect(result?.woundToHeal.gift).toBe('용기');
    });

    it('should return English healing path', () => {
      const astro = createBasicAstro();
      const result = getKarmaAnalysis(undefined, astro, 'en');

      expect(result?.woundToHeal.wound).toBe('Identity wound');
      expect(result?.woundToHeal.healingPath).toBe('Self-acceptance');
    });
  });

  describe('saturn lesson analysis', () => {
    it('should analyze saturn house for life lesson', () => {
      const astro = createBasicAstro();
      const result = getKarmaAnalysis(undefined, astro, 'ko');

      expect(result?.saturnLesson.lesson).toBe('커리어 책임');
      expect(result?.saturnLesson.mastery).toBe('전문성');
    });
  });

  describe('pluto transformation', () => {
    it('should analyze pluto house for transformation', () => {
      const astro = createBasicAstro();
      const result = getKarmaAnalysis(undefined, astro, 'ko');

      expect(result?.plutoTransform).toBeDefined();
      expect(result?.plutoTransform?.area).toBe('변환과 공유 자원');
    });

    it('should return undefined when pluto house not available', () => {
      const astro: AstroData = {
        planets: [{ name: 'Sun', sign: 'aries' }],
      } as unknown as AstroData;

      const result = getKarmaAnalysis(undefined, astro, 'ko');

      expect(result?.plutoTransform).toBeUndefined();
    });
  });

  describe('fated connections', () => {
    it('should detect romantic fate with 홍염', () => {
      const saju: SajuData = {
        dayMaster: { name: '갑' },
        advancedAnalysis: {
          sinsal: {
            luckyList: [{ name: '홍염살' }],
            unluckyList: [],
          },
        },
      } as unknown as SajuData;

      const result = getKarmaAnalysis(saju, undefined, 'ko');

      const romanticConnection = result?.fatedConnections.find(c => c.type.includes('연인'));
      expect(romanticConnection).toBeDefined();
    });

    it('should detect overseas fate with 역마', () => {
      const saju: SajuData = {
        dayMaster: { name: '갑' },
        advancedAnalysis: {
          sinsal: {
            luckyList: [{ name: '역마살' }],
            unluckyList: [],
          },
        },
      } as unknown as SajuData;

      const result = getKarmaAnalysis(saju, undefined, 'ko');

      const overseasConnection = result?.fatedConnections.find(c => c.type.includes('해외'));
      expect(overseasConnection).toBeDefined();
    });

    it('should detect spiritual mentor fate with 귀문', () => {
      const saju: SajuData = {
        dayMaster: { name: '갑' },
        advancedAnalysis: {
          sinsal: {
            luckyList: [],
            unluckyList: [{ name: '귀문관살' }],
          },
        },
      } as unknown as SajuData;

      const result = getKarmaAnalysis(saju, undefined, 'ko');

      const spiritualConnection = result?.fatedConnections.find(c => c.type.includes('영적'));
      expect(spiritualConnection).toBeDefined();
    });

    it('should return empty array when no special sinsal', () => {
      const saju = createBasicSaju();
      const result = getKarmaAnalysis(saju, undefined, 'ko');

      expect(result?.fatedConnections).toEqual([]);
    });
  });

  describe('soul mission', () => {
    it('should use day master for soul mission', () => {
      const saju = createBasicSaju();
      const result = getKarmaAnalysis(saju, undefined, 'ko');

      expect(result?.soulMission.core).toBe('성장과 진취');
      expect(result?.soulMission.expression).toBe('리더십 발휘');
    });

    it('should return default soul mission for unknown day master', () => {
      const saju: SajuData = {
        dayMaster: { name: '?' },
      } as unknown as SajuData;

      const result = getKarmaAnalysis(saju, undefined, 'ko');

      expect(result?.soulMission.core).toBe('당신만의 빛으로 세상을 밝히세요.');
    });

    it('should extract day master from pillars', () => {
      const saju: SajuData = {
        pillars: {
          day: {
            heavenlyStem: '병',
          },
        },
      } as unknown as SajuData;

      const result = getKarmaAnalysis(saju, undefined, 'ko');

      expect(result?.soulMission.core).toBe('열정과 빛');
    });

    it('should extract day master from dayPillar', () => {
      const saju: SajuData = {
        dayPillar: {
          heavenlyStem: '병',
        },
      } as unknown as SajuData;

      const result = getKarmaAnalysis(saju, undefined, 'ko');

      expect(result?.soulMission.core).toBe('열정과 빛');
    });
  });

  describe('past life theme', () => {
    it('should use geokguk for past life theme', () => {
      const saju = createBasicSaju();
      const result = getKarmaAnalysis(saju, undefined, 'ko');

      expect(result?.pastLifeTheme.likely).toContain('예술가');
    });

    it('should return default theme when geokguk not available', () => {
      const saju: SajuData = {
        dayMaster: { name: '갑' },
      } as unknown as SajuData;

      const result = getKarmaAnalysis(saju, undefined, 'ko');

      expect(result?.pastLifeTheme.likely).toBe('다양한 경험을 한 영혼');
    });
  });

  describe('karma score', () => {
    it('should return karma score within bounds', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getKarmaAnalysis(saju, astro, 'ko');

      expect(result?.karmaScore).toBeGreaterThanOrEqual(65);
      expect(result?.karmaScore).toBeLessThanOrEqual(100);
    });
  });

  describe('soul journey', () => {
    it('should include soul journey when geokguk or north node available', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getKarmaAnalysis(saju, astro, 'ko');

      expect(result?.soulJourney).toBeDefined();
      expect(result?.soulJourney?.pastLife).toBeDefined();
      expect(result?.soulJourney?.currentLife).toBeDefined();
      expect(result?.soulJourney?.futurePotential).toBeDefined();
      expect(result?.soulJourney?.keyTransition).toBeDefined();
    });
  });

  describe('karma release', () => {
    it('should include karma release when chiron or pluto available', () => {
      const astro = createBasicAstro();

      const result = getKarmaAnalysis(undefined, astro, 'ko');

      expect(result?.karmaRelease).toBeDefined();
      expect(result?.karmaRelease?.blockage).toBeDefined();
      expect(result?.karmaRelease?.healing).toBeDefined();
      expect(result?.karmaRelease?.breakthrough).toBeDefined();
    });
  });

  describe('language support', () => {
    it('should return all Korean text', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getKarmaAnalysis(saju, astro, 'ko');

      expect(result?.soulType.title).not.toContain('Soul');
      expect(result?.growthPath.direction).not.toContain('achievement');
    });

    it('should return all English text', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getKarmaAnalysis(saju, astro, 'en');

      expect(result?.soulType.title).toBe('Creator Soul');
      expect(result?.growthPath.direction).toBe('Career achievement');
      expect(result?.woundToHeal.wound).toBe('Identity wound');
    });
  });

  describe('return structure', () => {
    it('should have all required fields', () => {
      const saju = createBasicSaju();
      const astro = createBasicAstro();

      const result = getKarmaAnalysis(saju, astro, 'ko') as KarmaAnalysisResult;

      expect(result).toHaveProperty('soulType');
      expect(result).toHaveProperty('growthPath');
      expect(result).toHaveProperty('woundToHeal');
      expect(result).toHaveProperty('saturnLesson');
      expect(result).toHaveProperty('fatedConnections');
      expect(result).toHaveProperty('soulMission');
      expect(result).toHaveProperty('pastLifeTheme');
      expect(result).toHaveProperty('karmaScore');

      expect(result.soulType).toHaveProperty('title');
      expect(result.soulType).toHaveProperty('emoji');
      expect(result.soulType).toHaveProperty('description');
      expect(result.soulType).toHaveProperty('traits');

      expect(result.growthPath).toHaveProperty('direction');
      expect(result.growthPath).toHaveProperty('pastPattern');
      expect(result.growthPath).toHaveProperty('lesson');
      expect(result.growthPath).toHaveProperty('practicalAdvice');
    });
  });

  describe('edge cases', () => {
    it('should handle sinsal as string array', () => {
      const saju: SajuData = {
        dayMaster: { name: '갑' },
        advancedAnalysis: {
          sinsal: {
            luckyList: ['홍염살', '도화살'],
            unluckyList: ['역마살'],
          },
        },
      } as unknown as SajuData;

      const result = getKarmaAnalysis(saju, undefined, 'ko');

      expect(result?.fatedConnections.length).toBeGreaterThan(0);
    });

    it('should handle missing advancedAnalysis', () => {
      const saju: SajuData = {
        dayMaster: { name: '갑' },
      } as unknown as SajuData;

      const result = getKarmaAnalysis(saju, undefined, 'ko');

      expect(result).not.toBeNull();
      expect(result?.fatedConnections).toEqual([]);
    });

    it('should handle empty planets array', () => {
      const astro: AstroData = {
        planets: [],
      } as unknown as AstroData;

      const result = getKarmaAnalysis(undefined, astro, 'ko');

      expect(result).not.toBeNull();
    });
  });
});
