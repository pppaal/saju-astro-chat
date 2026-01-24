/**
 * Specialized Types Tests
 * Tests for domain-specific analysis result types
 */

import { describe, it, expect } from 'vitest';
import type {
  HealthMatrixResult,
  KarmaMatrixResult,
  CareerAdvancedResult,
  LoveTimingResult,
  ShadowPersonalityResult,
  TimingMatrixResult,
  ExtendedSajuData,
} from '@/components/destiny-map/fun-insights/analyzers/types/specialized.types';

// Type validation helpers
function isValidHealthMatrixResult(obj: unknown): obj is HealthMatrixResult {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.vitalityScore === 'number' &&
    Array.isArray(o.elementBalance) &&
    Array.isArray(o.vulnerableAreas) &&
    Array.isArray(o.shinsalHealth)
  );
}

function isValidKarmaMatrixResult(obj: unknown): obj is KarmaMatrixResult {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.karmaScore === 'number' &&
    Array.isArray(o.karmicRelations) &&
    Array.isArray(o.pastLifeHints)
  );
}

function isValidCareerAdvancedResult(obj: unknown): obj is CareerAdvancedResult {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.careerScore === 'number' &&
    Array.isArray(o.houseCareerMap) &&
    Array.isArray(o.careerTiming)
  );
}

function isValidLoveTimingResult(obj: unknown): obj is LoveTimingResult {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.loveScore === 'number' &&
    o.currentLuck !== undefined &&
    Array.isArray(o.shinsalLoveTiming) &&
    Array.isArray(o.luckyPeriods)
  );
}

function isValidShadowPersonalityResult(obj: unknown): obj is ShadowPersonalityResult {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.shadowScore === 'number' &&
    Array.isArray(o.shinsalShadows) &&
    Array.isArray(o.projection)
  );
}

function isValidTimingMatrixResult(obj: unknown): obj is TimingMatrixResult {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.overallScore === 'number' &&
    o.overallMessage !== undefined &&
    Array.isArray(o.daeunTimeline) &&
    Array.isArray(o.majorTransits) &&
    Array.isArray(o.retrogrades) &&
    o.periodLuck !== undefined &&
    Array.isArray(o.luckyPeriods)
  );
}

describe('Specialized Types', () => {
  describe('HealthMatrixResult', () => {
    const validHealthResult: HealthMatrixResult = {
      vitalityScore: 75,
      elementBalance: [
        { element: '목', score: 20, status: 'balanced' },
        { element: '화', score: 30, status: 'excess' },
        { element: '토', score: 20, status: 'balanced' },
        { element: '금', score: 15, status: 'balanced' },
        { element: '수', score: 15, status: 'balanced' },
      ],
      vulnerableAreas: [
        {
          organ: '간',
          element: '목',
          risk: 'high',
          advice: '간 건강에 주의하세요',
          icon: '⚠️',
        },
      ],
      lifeCycleStage: {
        stage: '건록',
        description: { ko: '건록 단계', en: 'Gunrok stage' },
        vitalityLevel: 90,
        advice: '활동적인 시기입니다',
      },
      shinsalHealth: [],
      chironHealing: {
        woundArea: { ko: '건강', en: 'Health' },
        healingPath: { ko: '치유의 길', en: 'Healing path' },
        healerPotential: { ko: '치유 능력', en: 'Healer potential' },
        score: 80,
        icon: '⚕️',
      },
    };

    it('validates complete HealthMatrixResult', () => {
      expect(isValidHealthMatrixResult(validHealthResult)).toBe(true);
    });

    it('has correct vitalityScore range', () => {
      expect(validHealthResult.vitalityScore).toBeGreaterThanOrEqual(0);
      expect(validHealthResult.vitalityScore).toBeLessThanOrEqual(100);
    });

    it('elementBalance contains all five elements', () => {
      const elements = validHealthResult.elementBalance.map(e => e.element);
      expect(elements).toContain('목');
      expect(elements).toContain('화');
      expect(elements).toContain('토');
      expect(elements).toContain('금');
      expect(elements).toContain('수');
    });

    it('elementBalance status values are valid', () => {
      validHealthResult.elementBalance.forEach(item => {
        expect(['excess', 'balanced', 'deficient']).toContain(item.status);
      });
    });

    it('vulnerableAreas risk values are valid', () => {
      validHealthResult.vulnerableAreas.forEach(area => {
        expect(['high', 'medium', 'low']).toContain(area.risk);
      });
    });

    it('lifeCycleStage has bilingual descriptions', () => {
      expect(validHealthResult.lifeCycleStage?.description.ko).toBeDefined();
      expect(validHealthResult.lifeCycleStage?.description.en).toBeDefined();
    });

    it('allows null for optional fields', () => {
      const resultWithNulls: HealthMatrixResult = {
        ...validHealthResult,
        lifeCycleStage: null,
        chironHealing: null,
      };
      expect(isValidHealthMatrixResult(resultWithNulls)).toBe(true);
    });
  });

  describe('KarmaMatrixResult', () => {
    const validKarmaResult: KarmaMatrixResult = {
      karmaScore: 65,
      soulPattern: {
        geokguk: '식신격',
        progression: 'secondary',
        fusion: {
          level: 'amplify',
          score: 75,
          icon: '✨',
          color: '#4CAF50',
          keyword: { ko: '성장', en: 'Growth' },
          description: { ko: '성장 에너지', en: 'Growth energy' },
        },
        soulTheme: { ko: '영혼 테마', en: 'Soul theme' },
      },
      nodeAxis: {
        northNode: {
          element: '화',
          fusion: {
            level: 'extreme',
            score: 90,
            icon: '🔥',
            color: '#FFD700',
            keyword: { ko: '열정', en: 'Passion' },
            description: { ko: '열정적 에너지', en: 'Passionate energy' },
          },
          direction: { ko: '앞으로 나아가세요', en: 'Move forward' },
          lesson: { ko: '배움의 길', en: 'Path of learning' },
        },
        southNode: {
          element: '수',
          fusion: {
            level: 'balance',
            score: 60,
            icon: '💧',
            color: '#2196F3',
            keyword: { ko: '유연', en: 'Flexible' },
            description: { ko: '유연한 에너지', en: 'Flexible energy' },
          },
          pastPattern: { ko: '과거 패턴', en: 'Past pattern' },
          release: { ko: '놓아주기', en: 'Release' },
        },
      },
      karmicRelations: [],
      pastLifeHints: [],
    };

    it('validates complete KarmaMatrixResult', () => {
      expect(isValidKarmaMatrixResult(validKarmaResult)).toBe(true);
    });

    it('karmaScore is within valid range', () => {
      expect(validKarmaResult.karmaScore).toBeGreaterThanOrEqual(0);
      expect(validKarmaResult.karmaScore).toBeLessThanOrEqual(100);
    });

    it('nodeAxis contains northNode and southNode', () => {
      expect(validKarmaResult.nodeAxis).toHaveProperty('northNode');
      expect(validKarmaResult.nodeAxis).toHaveProperty('southNode');
    });

    it('fusion levels are valid', () => {
      const validLevels = ['extreme', 'amplify', 'balance', 'clash', 'conflict'];
      expect(validLevels).toContain(validKarmaResult.soulPattern?.fusion.level);
      expect(validLevels).toContain(validKarmaResult.nodeAxis?.northNode.fusion.level);
    });

    it('allows null for optional fields', () => {
      const resultWithNulls: KarmaMatrixResult = {
        ...validKarmaResult,
        soulPattern: null,
        nodeAxis: null,
      };
      expect(isValidKarmaMatrixResult(resultWithNulls)).toBe(true);
    });
  });

  describe('CareerAdvancedResult', () => {
    const validCareerResult: CareerAdvancedResult = {
      careerScore: 80,
      geokgukCareer: {
        geokguk: '정관격',
        pattern: 'secondary',
        fusion: {
          level: 'extreme',
          score: 85,
          icon: '👔',
          color: '#FFD700',
          keyword: { ko: '리더십', en: 'Leadership' },
          description: { ko: '리더십 에너지', en: 'Leadership energy' },
        },
        careerDirection: { ko: '관리직', en: 'Management' },
      },
      houseCareerMap: [
        {
          house: 10,
          planets: ['Saturn', 'Sun'],
          careerArea: { ko: '경영', en: 'Management' },
          strength: 'strong',
          icon: '🏆',
        },
      ],
      midheaven: {
        sign: 'Capricorn',
        element: 'earth',
        sajuAlignment: {
          level: 'amplify',
          score: 75,
          icon: '🌍',
          color: '#4CAF50',
          keyword: { ko: '안정', en: 'Stability' },
          description: { ko: '안정적 에너지', en: 'Stable energy' },
        },
        publicImage: { ko: '공적 이미지', en: 'Public image' },
      },
      careerTiming: [
        {
          period: '30세~40세',
          icon: '🌟',
          strength: 'strong',
          score: 85,
          description: { ko: '전성기', en: 'Prime period' },
          goodFor: ['승진', '사업 확장'],
        },
      ],
    };

    it('validates complete CareerAdvancedResult', () => {
      expect(isValidCareerAdvancedResult(validCareerResult)).toBe(true);
    });

    it('careerScore is within valid range', () => {
      expect(validCareerResult.careerScore).toBeGreaterThanOrEqual(0);
      expect(validCareerResult.careerScore).toBeLessThanOrEqual(100);
    });

    it('houseCareerMap strength values are valid', () => {
      validCareerResult.houseCareerMap.forEach(item => {
        expect(['strong', 'moderate', 'weak']).toContain(item.strength);
      });
    });

    it('careerTiming strength values are valid', () => {
      validCareerResult.careerTiming.forEach(item => {
        expect(['strong', 'moderate', 'weak']).toContain(item.strength);
      });
    });

    it('supports legacy compatibility properties', () => {
      const resultWithLegacy: CareerAdvancedResult = {
        ...validCareerResult,
        wealthPattern: { ko: '재물 패턴', en: 'Wealth pattern' },
        successTiming: [],
        careerProgression: {
          phase: 'growth',
          description: { ko: '성장기', en: 'Growth phase' },
          fusion: validCareerResult.geokgukCareer!.fusion,
          geokguk: '정관격',
          progression: 'secondary',
          direction: { ko: '방향', en: 'Direction' },
        },
      };
      expect(resultWithLegacy.wealthPattern).toBeDefined();
      expect(resultWithLegacy.successTiming).toBeDefined();
    });
  });

  describe('LoveTimingResult', () => {
    const validLoveResult: LoveTimingResult = {
      loveScore: 70,
      currentLuck: {
        icon: '💖',
        score: 75,
        message: { ko: '좋은 시기예요', en: 'Good period' },
        timing: 'good',
      },
      venusTiming: {
        sign: 'Libra',
        element: 'air',
        fusion: {
          level: 'extreme',
          score: 90,
          icon: '♀️',
          color: '#FFD700',
          keyword: { ko: '조화', en: 'Harmony' },
          description: { ko: '조화로운 에너지', en: 'Harmonious energy' },
        },
        loveStyle: { ko: '로맨틱', en: 'Romantic' },
      },
      shinsalLoveTiming: [],
      luckyPeriods: [
        {
          period: '2024년 봄',
          icon: '🌸',
          strength: 'strong',
          score: 85,
          description: { ko: '만남의 시기', en: 'Meeting period' },
          goodFor: ['새로운 만남', '고백'],
        },
      ],
    };

    it('validates complete LoveTimingResult', () => {
      expect(isValidLoveTimingResult(validLoveResult)).toBe(true);
    });

    it('loveScore is within valid range', () => {
      expect(validLoveResult.loveScore).toBeGreaterThanOrEqual(0);
      expect(validLoveResult.loveScore).toBeLessThanOrEqual(100);
    });

    it('currentLuck timing values are valid', () => {
      expect(['excellent', 'good', 'neutral', 'challenging']).toContain(
        validLoveResult.currentLuck.timing
      );
    });

    it('luckyPeriods strength values are valid', () => {
      validLoveResult.luckyPeriods.forEach(period => {
        expect(['strong', 'moderate', 'weak']).toContain(period.strength);
      });
    });

    it('allows null for venusTiming', () => {
      const resultWithNull: LoveTimingResult = {
        ...validLoveResult,
        venusTiming: null,
      };
      expect(isValidLoveTimingResult(resultWithNull)).toBe(true);
    });

    it('supports optional extended properties', () => {
      const resultWithExtended: LoveTimingResult = {
        ...validLoveResult,
        timingScore: 80,
        timingMessage: { ko: '타이밍 메시지', en: 'Timing message' },
        romanticTiming: [],
        relationshipPattern: [],
      };
      expect(resultWithExtended.timingScore).toBe(80);
    });
  });

  describe('ShadowPersonalityResult', () => {
    const validShadowResult: ShadowPersonalityResult = {
      shadowScore: 55,
      shinsalShadows: [
        {
          shinsal: '겁살',
          planet: 'Pluto',
          fusion: {
            level: 'conflict',
            score: 40,
            icon: '⚫',
            color: '#F44336',
            keyword: { ko: '그림자', en: 'Shadow' },
            description: { ko: '그림자 에너지', en: 'Shadow energy' },
          },
          shadowTrait: { ko: '두려움', en: 'Fear' },
          integration: { ko: '통합 방법', en: 'Integration method' },
        },
      ],
      chironWound: {
        area: { ko: '자아', en: 'Self' },
        manifestation: { ko: '발현 방식', en: 'Manifestation' },
        healing: { ko: '치유 방법', en: 'Healing method' },
        gift: { ko: '선물', en: 'Gift' },
      },
      lilithEnergy: {
        element: '수',
        fusion: {
          level: 'clash',
          score: 45,
          icon: '🌑',
          color: '#FF9800',
          keyword: { ko: '억압', en: 'Suppression' },
          description: { ko: '억압된 에너지', en: 'Suppressed energy' },
        },
        suppressed: { ko: '억압된 것', en: 'Suppressed' },
        expression: { ko: '표현 방법', en: 'Expression' },
      },
      projection: [
        {
          pattern: '충',
          from: '자신',
          to: '타인',
          recognition: { ko: '인식', en: 'Recognition' },
          integration: { ko: '통합', en: 'Integration' },
        },
      ],
    };

    it('validates complete ShadowPersonalityResult', () => {
      expect(isValidShadowPersonalityResult(validShadowResult)).toBe(true);
    });

    it('shadowScore is within valid range', () => {
      expect(validShadowResult.shadowScore).toBeGreaterThanOrEqual(0);
      expect(validShadowResult.shadowScore).toBeLessThanOrEqual(100);
    });

    it('allows null for optional fields', () => {
      const resultWithNulls: ShadowPersonalityResult = {
        ...validShadowResult,
        chironWound: null,
        lilithEnergy: null,
      };
      expect(isValidShadowPersonalityResult(resultWithNulls)).toBe(true);
    });

    it('supports optional lilithShadow property', () => {
      const resultWithLilith: ShadowPersonalityResult = {
        ...validShadowResult,
        lilithShadow: {
          ko: '릴리스 그림자',
          en: 'Lilith shadow',
          shadowSelf: { ko: '그림자 자아', en: 'Shadow self' },
        },
      };
      expect(resultWithLilith.lilithShadow).toBeDefined();
    });
  });

  describe('TimingMatrixResult', () => {
    const validTimingResult: TimingMatrixResult = {
      overallScore: 72,
      overallMessage: { ko: '좋은 시기입니다', en: 'Good timing' },
      daeunTimeline: [
        {
          startAge: 30,
          endAge: 40,
          isCurrent: true,
          element: '화',
          score: 80,
          description: { ko: '화 대운', en: 'Fire Daeun' },
          icon: '🔥',
        },
      ],
      majorTransits: [
        {
          transit: 'Saturn Return',
          planet: 'Saturn',
          timing: '29세',
          score: 85,
          description: { ko: '토성회귀', en: 'Saturn Return' },
          icon: '🪐',
        },
      ],
      retrogrades: [
        {
          planet: 'Mercury',
          element: 'air',
          fusion: {
            level: 'balance',
            score: 60,
            icon: '☿',
            color: '#2196F3',
            keyword: { ko: '소통', en: 'Communication' },
            description: { ko: '소통 에너지', en: 'Communication energy' },
          },
          effect: { ko: '효과', en: 'Effect' },
          advice: { ko: '조언', en: 'Advice' },
        },
      ],
      periodLuck: {
        year: {
          element: '화',
          score: 75,
          description: { ko: '2024년 운세', en: '2024 fortune' },
        },
        month: {
          element: '토',
          score: 65,
          description: { ko: '이번 달 운세', en: 'This month fortune' },
        },
        day: {
          element: '금',
          score: 70,
          description: { ko: '오늘 운세', en: 'Today fortune' },
        },
      },
      luckyPeriods: [],
    };

    it('validates complete TimingMatrixResult', () => {
      expect(isValidTimingMatrixResult(validTimingResult)).toBe(true);
    });

    it('overallScore is within valid range', () => {
      expect(validTimingResult.overallScore).toBeGreaterThanOrEqual(0);
      expect(validTimingResult.overallScore).toBeLessThanOrEqual(100);
    });

    it('daeunTimeline has isCurrent indicator', () => {
      const currentDaeun = validTimingResult.daeunTimeline.find(d => d.isCurrent);
      expect(currentDaeun).toBeDefined();
    });

    it('periodLuck contains year, month, day', () => {
      expect(validTimingResult.periodLuck).toHaveProperty('year');
      expect(validTimingResult.periodLuck).toHaveProperty('month');
      expect(validTimingResult.periodLuck).toHaveProperty('day');
    });

    it('daeunTimeline supports optional properties', () => {
      const resultWithOptional: TimingMatrixResult = {
        ...validTimingResult,
        daeunTimeline: [
          {
            ...validTimingResult.daeunTimeline[0],
            period: '30세~40세',
            heavenlyStem: '丙',
            earthlyBranch: '寅',
            advice: { ko: '조언', en: 'Advice' },
          },
        ],
      };
      expect(resultWithOptional.daeunTimeline[0].period).toBe('30세~40세');
    });
  });

  describe('ExtendedSajuData', () => {
    const validExtendedSaju: ExtendedSajuData = {
      dayMaster: {
        element: 'wood',
        name: '甲',
        heavenlyStem: '甲',
      },
      sibsin: {
        year: '편인',
        month: '정관',
        day: '비견',
        hour: '식신',
      },
      twelveStages: {
        year: '장생',
        month: '관대',
        day: '건록',
        hour: '목욕',
      },
      shinsal: ['천을귀인', '문창귀인'],
      sinsal: {
        luckyList: [{ name: '천을귀인' }],
        unluckyList: [{ name: '겁살' }],
      },
      advancedAnalysis: {
        sibsin: { sibsinDistribution: { '비견': 2, '식신': 1 } },
        geokguk: { name: '식신격', type: 'food' },
        yongsin: { element: 'fire', name: '화' },
      },
      daeun: [
        {
          current: true,
          element: 'fire',
          startAge: 30,
        },
      ],
      birthYear: 1990,
    };

    it('has correct dayMaster structure', () => {
      expect(validExtendedSaju.dayMaster?.element).toBe('wood');
      expect(validExtendedSaju.dayMaster?.heavenlyStem).toBe('甲');
    });

    it('sibsin contains all pillars', () => {
      expect(validExtendedSaju.sibsin?.year).toBeDefined();
      expect(validExtendedSaju.sibsin?.month).toBeDefined();
      expect(validExtendedSaju.sibsin?.day).toBeDefined();
      expect(validExtendedSaju.sibsin?.hour).toBeDefined();
    });

    it('twelveStages contains all pillars', () => {
      expect(validExtendedSaju.twelveStages?.year).toBeDefined();
      expect(validExtendedSaju.twelveStages?.month).toBeDefined();
      expect(validExtendedSaju.twelveStages?.day).toBeDefined();
      expect(validExtendedSaju.twelveStages?.hour).toBeDefined();
    });

    it('shinsal supports both array and string formats', () => {
      const withStringArray: ExtendedSajuData = {
        ...validExtendedSaju,
        shinsal: ['천을귀인', '문창귀인'],
      };
      expect(Array.isArray(withStringArray.shinsal)).toBe(true);

      const withObjectArray: ExtendedSajuData = {
        ...validExtendedSaju,
        shinsal: [{ name: '천을귀인' }, { shinsal: '문창귀인' }],
      };
      expect(Array.isArray(withObjectArray.shinsal)).toBe(true);
    });

    it('advancedAnalysis contains analysis components', () => {
      expect(validExtendedSaju.advancedAnalysis?.sibsin).toBeDefined();
      expect(validExtendedSaju.advancedAnalysis?.geokguk).toBeDefined();
      expect(validExtendedSaju.advancedAnalysis?.yongsin).toBeDefined();
    });

    it('daeun array contains current indicator', () => {
      const currentDaeun = validExtendedSaju.daeun?.find(d => d.current || d.isCurrent);
      expect(currentDaeun).toBeDefined();
    });

    it('allows all fields to be optional', () => {
      const minimalSaju: ExtendedSajuData = {};
      expect(minimalSaju.dayMaster).toBeUndefined();
      expect(minimalSaju.sibsin).toBeUndefined();
    });
  });
});
