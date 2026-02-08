/**
 * Tests for Past Life Analyzer
 * src/lib/past-life/analyzer.ts
 */
import { describe, it, expect } from 'vitest';
import { analyzePastLife } from '@/lib/past-life/analyzer';

// ============================================================
// Test Constants
// ============================================================
const KARMA_SCORE = {
  BASE: 65,
  MIN: 40,
  MAX: 100,
  GEOKGUK_BONUS: 10,
  NORTH_NODE_BONUS: 8,
  SATURN_BONUS: 5,
  DAY_MASTER_BONUS: 5,
  KARMIC_DEBT_BONUS: 3,
  MAX_KARMIC_DEBTS: 4,
  EXPECTED_HIGH_SCORE: 80,
} as const;

const DEFAULT_SOUL_PATTERN = {
  ko: { type: '탐험가 영혼', emoji: '🌟' },
  en: { type: 'Explorer Soul', emoji: '🌟' },
} as const;

const REGEX_PATTERNS = {
  KOREAN: /[\uAC00-\uD7AF]/,
  ENGLISH: /[A-Za-z]/,
} as const;

const GEOKGUK_TYPES = ['식신', '상관', '정관', '편관', '정재', '편재', '정인', '편인'] as const;
const DAY_MASTER_STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
const HOUSE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

// Geokguk mapping with expected values
const GEOKGUK_MAPPINGS = [
  { name: '식신', expectedType: '창조자 영혼', emoji: '🎨', koTheme: '예술가', enTheme: 'artist' },
  { name: '상관', expectedType: '변혁가 영혼', emoji: '⚡', koTheme: '혁명가', enTheme: 'entertainer' },
  { name: '정관', expectedType: '지도자 영혼', emoji: '👑', koTheme: '관리', enTheme: 'administrator' },
  { name: '편관', expectedType: '전사 영혼', emoji: '⚔️', koTheme: '군인', enTheme: 'soldier' },
  { name: '정재', expectedType: '보존자 영혼', emoji: '🏛️', koTheme: '상인', enTheme: 'merchant' },
  { name: '편재', expectedType: '모험가 영혼', emoji: '🧭', koTheme: '무역상', enTheme: 'trader' },
  { name: '정인', expectedType: '현자 영혼', emoji: '📚', koTheme: '학자', enTheme: 'scholar' },
  { name: '편인', expectedType: '신비가 영혼', emoji: '🔮', koTheme: '무당', enTheme: 'shaman' },
] as const;

// Sinsal (karmic debt) types
const SINSAL_TYPES = {
  WONJIN: { ko: '원진', en: 'Relationship Karma', koDesc: '관계 카르마' },
  GONGMANG: { ko: '공망', en: 'Emptiness Karma', koDesc: '공허 카르마' },
  GEOPSAL: { ko: '겁살', en: 'Challenge Karma', koDesc: '도전 카르마' },
} as const;

// Default messages
const DEFAULT_MESSAGES = {
  ko: {
    pastLife: '다양한 역할을 경험한 영혼입니다.',
    journey: '전생의 패턴',
    saturn: '인생의 중요한 교훈',
    mission: '당신만의 빛',
  },
  en: {
    soulType: 'Explorer Soul',
  },
} as const;

// Test case data
const NODE_HOUSE_TEST_CASES = [
  { house: 1, pastPattern: '다른 사람을 먼저 생각하며' },
  { house: 2, pastPattern: '타인의 자원, 돈, 권력에 의존하며' },
  { house: 3, pastPattern: '큰 그림, 철학, 종교' },
  { house: 4, pastPattern: '사회적 성공, 명예, 지위' },
  { house: 5, pastPattern: '집단의 일원으로' },
  { house: 6, pastPattern: '환상과 도피의 세계' },
  { house: 7, pastPattern: '혼자서 모든 것을 해결' },
  { house: 8, pastPattern: '물질적 안정과 소유' },
  { house: 9, pastPattern: '사소한 디테일에 매몰' },
  { house: 10, pastPattern: '가정에만 갇혀' },
  { house: 11, pastPattern: '개인적 욕망과 드라마' },
  { house: 12, pastPattern: '물질과 일에만 집중' },
] as const;

const SATURN_HOUSE_TEST_CASES = [
  { house: 1, lesson: '자기 정체성' },
  { house: 2, lesson: '물질적 안정' },
  { house: 3, lesson: '소통' },
  { house: 4, lesson: '감정적 안정' },
  { house: 5, lesson: '자기를 표현' },
  { house: 6, lesson: '건강' },
  { house: 7, lesson: '파트너십' },
  { house: 8, lesson: '친밀감' },
  { house: 9, lesson: '의미' },
  { house: 10, lesson: '역할' },
  { house: 11, lesson: '커뮤니티' },
  { house: 12, lesson: '영적' },
] as const;

const DAY_MASTER_TEST_CASES = [
  { stem: '갑', core: '새로운 시작을 이끄는 개척자가 되세요' },
  { stem: '을', core: '부드러운 힘으로 세상을 변화시키세요' },
  { stem: '병', core: '빛과 열정으로 세상을 밝히세요' },
  { stem: '정', core: '따뜻한 빛으로 가까운 이들을 돌보세요' },
  { stem: '무', core: '든든한 터전을 만들어 모든 것을 지지하세요' },
  { stem: '기', core: '기름진 땅처럼 모든 것을 키우세요' },
  { stem: '경', core: '정의와 원칙으로 세상을 바로잡으세요' },
  { stem: '신', core: '섬세함으로 가치를 정제하세요' },
  { stem: '임', core: '지혜의 바다처럼 모든 것을 품으세요' },
  { stem: '계', core: '생명의 근원처럼 필요한 곳을 적시세요' },
] as const;

const GEOKGUK_VARIATIONS_WITH_SUFFIX = [
  '식신격', '상관격', '정관격', '편관격',
  '정재격', '편재격', '정인격', '편인격',
] as const;

const PLANET_NAME_VARIATIONS = {
  SATURN: ['Saturn', 'SATURN', 'saturn', 'SaTuRn'],
  NORTH_NODE: ['North Node', 'NorthNode', 'north node'],
} as const;

const PERFORMANCE_THRESHOLDS = {
  MAX_BATCH_DURATION_MS: 1000,
  BATCH_SIZE: 100,
  RAPID_CALL_COUNT: 50,
} as const;

const ADDITIONAL_GEOKGUK_TEST_CASES = [
  { geokguk: '편재', soulType: '모험가 영혼', emoji: '🧭', theme: '무역상' },
  { geokguk: '정재', soulType: '보존자 영혼', emoji: '🏛️', theme: '상인' },
  { geokguk: '편관', soulType: '전사 영혼', emoji: '⚔️', theme: '군인' },
  { geokguk: '정인', soulType: '현자 영혼', emoji: '📚', theme: '학자' },
] as const;

const SINSAL_CHINESE_CHARS_TEST_CASES = [
  { name: '空亡', expectedArea: SINSAL_TYPES.GONGMANG.koDesc },
  { name: '劫殺', expectedArea: SINSAL_TYPES.GEOPSAL.koDesc },
] as const;

const DAY_MASTER_SOURCES_TEST_CASES = [
  { source: 'dayMaster.name', saju: { dayMaster: { name: '갑' } }, expected: '갑' },
  { source: 'dayMaster.heavenlyStem', saju: { dayMaster: { heavenlyStem: '을' } }, expected: '을' },
  { source: 'pillars.day.heavenlyStem', saju: { pillars: { day: { heavenlyStem: '병화' } } }, expected: '병' },
  { source: 'fourPillars.day.heavenlyStem', saju: { fourPillars: { day: { heavenlyStem: '정' } } }, expected: '정' },
] as const;

const SINSAL_TRANSLATION_TEST_CASES = [
  { ko: SINSAL_TYPES.WONJIN.ko, en: SINSAL_TYPES.WONJIN.en },
  { ko: SINSAL_TYPES.GONGMANG.ko, en: SINSAL_TYPES.GONGMANG.en },
  { ko: SINSAL_TYPES.GEOPSAL.ko, en: SINSAL_TYPES.GEOPSAL.en },
] as const;

const KARMA_SCORE_BONUS_TEST_CASES = [
  {
    name: 'geokguk',
    createInput: () => ({ saju: createSajuWithGeokguk('식신'), astro: null }),
    expectedBonus: KARMA_SCORE.GEOKGUK_BONUS,
  },
  {
    name: 'North Node house',
    createInput: () => ({ saju: null, astro: createAstroWithPlanet('North Node', 1) }),
    expectedBonus: KARMA_SCORE.NORTH_NODE_BONUS,
  },
  {
    name: 'Saturn house',
    createInput: () => ({ saju: null, astro: createAstroWithPlanet('Saturn', 7) }),
    expectedBonus: KARMA_SCORE.SATURN_BONUS,
  },
  {
    name: 'day master',
    createInput: () => ({ saju: createSajuWithDayMaster('갑'), astro: null }),
    expectedBonus: KARMA_SCORE.DAY_MASTER_BONUS,
  },
] as const;

// ============================================================
// Types
// ============================================================
type SajuData = {
  advancedAnalysis?: {
    geokguk?: { name?: string; type?: string };
    sinsal?: { unluckyList?: Array<{ name?: string; shinsal?: string } | string> };
  };
  dayMaster?: { name?: string; heavenlyStem?: string };
  pillars?: { day?: { heavenlyStem?: string } };
  fourPillars?: { day?: { heavenlyStem?: string } };
};

type AstroData = {
  planets?: Array<{ name?: string | null; house?: number }>;
};

type KarmicDebt = {
  area: string;
  description: string;
};

// ============================================================
// Test Helpers
// ============================================================
const createSajuWithGeokguk = (name: string): SajuData => ({
  advancedAnalysis: { geokguk: { name } },
});

const createSajuWithGeokgukType = (type: string): SajuData => ({
  advancedAnalysis: { geokguk: { type } },
});

const createSajuWithDayMaster = (name: string): SajuData => ({
  dayMaster: { name },
});

const createSajuWithSinsal = (
  unluckyList: Array<{ name?: string; shinsal?: string } | string>
): SajuData => ({
  advancedAnalysis: { sinsal: { unluckyList } },
});

const createAstroWithPlanet = (name: string, house: number): AstroData => ({
  planets: [{ name, house }],
});

const createAstroWithPlanets = (planets: Array<{ name: string; house: number }>): AstroData => ({
  planets,
});

const analyzeKorean = (saju: SajuData | null = null, astro: AstroData | null = null) =>
  analyzePastLife(saju, astro, true);

const analyzeEnglish = (saju: SajuData | null = null, astro: AstroData | null = null) =>
  analyzePastLife(saju, astro, false);

// Additional builder helpers for complex scenarios
const createSajuWithPillarsDay = (heavenlyStem: string): SajuData => ({
  pillars: { day: { heavenlyStem } },
});

const createSajuWithFourPillarsDay = (heavenlyStem: string): SajuData => ({
  fourPillars: { day: { heavenlyStem } },
});

const createSajuWithDayMasterHeavenlyStem = (heavenlyStem: string): SajuData => ({
  dayMaster: { heavenlyStem },
});

const createEmptySinsal = (): SajuData => ({
  advancedAnalysis: { sinsal: { unluckyList: [] } },
});

const createSinsalWithoutName = (): SajuData => ({
  advancedAnalysis: { sinsal: { unluckyList: [{}] } },
});

// Complex builder for full saju objects
const createFullSaju = (options: {
  geokgukName?: string;
  geokgukType?: string;
  dayMasterName?: string;
  sinsalList?: Array<{ name?: string; shinsal?: string } | string>;
}): SajuData => ({
  advancedAnalysis: {
    geokguk: options.geokgukName || options.geokgukType
      ? {
          name: options.geokgukName,
          type: options.geokgukType
        }
      : undefined,
    sinsal: options.sinsalList
      ? { unluckyList: options.sinsalList }
      : undefined,
  },
  dayMaster: options.dayMasterName
    ? { name: options.dayMasterName }
    : undefined,
});

// Helper for complex astro edge cases
const createAstroWithNullPlanet = (): AstroData => ({
  planets: [{ name: null, house: 5 }],
});

const createAstroWithMissingHouse = (): AstroData => ({
  planets: [{ name: 'Saturn' }, { name: 'North Node' }],
});

const createAstroWithInvalidHouses = (): AstroData => ({
  planets: [
    { name: 'North Node', house: 0 },
    { name: 'Saturn', house: 13 },
  ],
});

// Test assertion helpers
const expectKarmicDebtArea = (debts: KarmicDebt[], area: string) => {
  expect(debts.some((d) => d.area === area)).toBe(true);
};

const expectScoreInRange = (score: number, min: number, max: number) => {
  expect(score).toBeGreaterThanOrEqual(min);
  expect(score).toBeLessThanOrEqual(max);
};

const expectLanguageMatch = (text: string, isKorean: boolean) => {
  expect(text).toMatch(isKorean ? REGEX_PATTERNS.KOREAN : REGEX_PATTERNS.ENGLISH);
};

const expectAllFieldsDefined = (result: any) => {
  expect(result.soulPattern.type).toBeTruthy();
  expect(result.pastLife.likely).toBeTruthy();
  expect(result.soulJourney.pastPattern).toBeTruthy();
  expect(result.saturnLesson.lesson).toBeTruthy();
  expect(result.thisLifeMission.core).toBeTruthy();
  expect(result.karmicDebts).toBeInstanceOf(Array);
  expect(result.talentsCarried).toBeInstanceOf(Array);
  expect(typeof result.karmaScore).toBe('number');
};

const expectSoulPattern = (result: any, type: string, emoji: string) => {
  expect(result.soulPattern.type).toBe(type);
  expect(result.soulPattern.emoji).toBe(emoji);
};

const expectHouseNumbers = (result: any, northNode?: number, saturn?: number) => {
  if (northNode !== undefined) {
    expect(result.northNodeHouse).toBe(northNode);
  }
  if (saturn !== undefined) {
    expect(result.saturnHouse).toBe(saturn);
  }
};

const expectUndefinedHouses = (result: any) => {
  expect(result.northNodeHouse).toBeUndefined();
  expect(result.saturnHouse).toBeUndefined();
};

const expectPastLifeTheme = (result: any, theme: string, era?: string) => {
  expect(result.pastLife.likely).toContain(theme);
  if (era) {
    expect(result.pastLife.era).toContain(era);
  }
};

const calculateExpectedScore = (bonuses: {
  geokguk?: boolean;
  northNode?: boolean;
  saturn?: boolean;
  dayMaster?: boolean;
  karmicDebts?: number;
}) => {
  let score = KARMA_SCORE.BASE;
  if (bonuses.geokguk) score += KARMA_SCORE.GEOKGUK_BONUS;
  if (bonuses.northNode) score += KARMA_SCORE.NORTH_NODE_BONUS;
  if (bonuses.saturn) score += KARMA_SCORE.SATURN_BONUS;
  if (bonuses.dayMaster) score += KARMA_SCORE.DAY_MASTER_BONUS;
  if (bonuses.karmicDebts) score += KARMA_SCORE.KARMIC_DEBT_BONUS * bonuses.karmicDebts;
  return Math.min(score, KARMA_SCORE.MAX);
};

const expectSoulPatternComplete = (soulPattern: any) => {
  expect(soulPattern.type).toBeTruthy();
  expect(soulPattern.emoji).toBeTruthy();
  expect(soulPattern.title).toBeTruthy();
  expect(soulPattern.description).toBeTruthy();
  expect(soulPattern.traits).toBeInstanceOf(Array);
  expect(soulPattern.traits.length).toBe(5);
};

const expectPastLifeComplete = (pastLife: any, shouldHaveEra = true) => {
  expect(pastLife.likely).toBeTruthy();
  expect(pastLife.talents).toBeTruthy();
  expect(pastLife.lessons).toBeTruthy();
  if (shouldHaveEra) {
    expect(pastLife.era).toBeTruthy();
  }
};

const expectJourneyComplete = (journey: any) => {
  expect(journey.pastPattern).toBeTruthy();
  expect(journey.releasePattern).toBeTruthy();
  expect(journey.currentDirection).toBeTruthy();
  expect(journey.lessonToLearn).toBeTruthy();
};

const expectLessonComplete = (lesson: any) => {
  expect(lesson.lesson).toBeTruthy();
  expect(lesson.challenge).toBeTruthy();
  expect(lesson.mastery).toBeTruthy();
};

const expectMissionComplete = (mission: any) => {
  expect(mission.core).toBeTruthy();
  expect(mission.expression).toBeTruthy();
  expect(mission.fulfillment).toBeTruthy();
};

const expectUniqueValues = <T>(
  items: readonly T[],
  extractValue: (item: T, result: any) => string,
  createInput: (item: T) => any,
  expectedCount: number
) => {
  const values = new Set<string>();
  items.forEach((item) => {
    const result = createInput(item);
    values.add(extractValue(item, result));
  });
  expect(values.size).toBe(expectedCount);
};

// ============================================================
// Tests
// ============================================================
describe('Past Life Analyzer', () => {
  describe('analyzePastLife', () => {
    describe('Basic functionality', () => {
      it('should return a valid PastLifeResult structure', () => {
        const result = analyzeKorean();

        expect(result).toBeDefined();
        expectAllFieldsDefined(result);
      });

      it('should return Korean text when isKo is true', () => {
        const result = analyzeKorean();

        expectLanguageMatch(result.soulPattern.type, true);
        expectLanguageMatch(result.soulPattern.title, true);
      });

      it('should return English text when isKo is false', () => {
        const result = analyzeEnglish();

        expectLanguageMatch(result.soulPattern.type, false);
        expectLanguageMatch(result.soulPattern.title, false);
      });

      it('should return default values when no data is provided', () => {
        const result = analyzeKorean();

        expect(result.soulPattern.type).toBe(DEFAULT_SOUL_PATTERN.ko.type);
        expect(result.soulPattern.emoji).toBe(DEFAULT_SOUL_PATTERN.ko.emoji);
        expectScoreInRange(result.karmaScore, KARMA_SCORE.MIN, KARMA_SCORE.MAX);
      });
    });

    describe('Soul Pattern based on Geokguk', () => {
      GEOKGUK_MAPPINGS.forEach(({ name, expectedType, emoji }) => {
        it(`should return ${expectedType} for ${name} geokguk`, () => {
          const result = analyzeKorean(createSajuWithGeokguk(name));

          expectSoulPattern(result, expectedType, emoji);
          expect(result.geokguk).toBe(name);
        });
      });

      it('should handle geokguk with "격" suffix', () => {
        const result = analyzeKorean(createSajuWithGeokguk('식신격'));

        expect(result.soulPattern.type).toBe('창조자 영혼');
      });

      it('should handle geokguk with type field', () => {
        const result = analyzeKorean(createSajuWithGeokgukType('정관'));

        expect(result.soulPattern.type).toBe('지도자 영혼');
      });
    });

    describe('Past Life Theme', () => {
      it('should return specific past life theme for geokguk', () => {
        const result = analyzeKorean(createSajuWithGeokguk('식신'));

        expectPastLifeTheme(result, '예술가', '르네상스');
      });

      it('should return English theme when isKo is false', () => {
        const result = analyzeEnglish(createSajuWithGeokguk('상관'));

        expectPastLifeTheme(result, 'entertainer', 'French Revolution');
      });

      it('should return default theme when no geokguk', () => {
        const result = analyzeKorean();

        expect(result.pastLife.likely).toBe(DEFAULT_MESSAGES.ko.pastLife);
      });
    });

    describe('Soul Journey (Node Houses)', () => {
      NODE_HOUSE_TEST_CASES.forEach(({ house, pastPattern }) => {
        it(`should return correct soul journey for North Node in house ${house}`, () => {
          const result = analyzeKorean(null, createAstroWithPlanet('North Node', house));

          expect(result.soulJourney.pastPattern).toContain(pastPattern);
          expectHouseNumbers(result, house);
        });
      });

      it('should handle lowercase planet names', () => {
        const result = analyzeKorean(null, createAstroWithPlanet('north node', 5));

        expectHouseNumbers(result, 5);
        expect(result.soulJourney.pastPattern).toContain('집단의 일원으로');
      });

      it('should return default journey when no North Node', () => {
        const result = analyzeKorean();

        expect(result.soulJourney.pastPattern).toContain(DEFAULT_MESSAGES.ko.journey);
      });
    });

    describe('Saturn Lesson', () => {
      SATURN_HOUSE_TEST_CASES.forEach(({ house, lesson }) => {
        it(`should return correct Saturn lesson for house ${house}`, () => {
          const result = analyzeKorean(null, createAstroWithPlanet('Saturn', house));

          expect(result.saturnLesson.lesson).toContain(lesson);
          expectHouseNumbers(result, undefined, house);
        });
      });

      it('should return default Saturn lesson when not found', () => {
        const result = analyzeKorean();

        expect(result.saturnLesson.lesson).toContain(DEFAULT_MESSAGES.ko.saturn);
      });
    });

    describe('Day Master Mission', () => {
      DAY_MASTER_TEST_CASES.forEach(({ stem, core }) => {
        it(`should return correct mission for day master ${stem}`, () => {
          const result = analyzeKorean(createSajuWithDayMaster(stem));

          expect(result.thisLifeMission.core).toContain(core);
          expect(result.dayMaster).toBe(stem);
        });
      });

      it('should extract day master from pillars.day', () => {
        const result = analyzeKorean(createSajuWithPillarsDay('갑목'));

        expect(result.dayMaster).toBe('갑');
      });

      it('should extract day master from fourPillars.day', () => {
        const result = analyzeKorean(createSajuWithFourPillarsDay('병'));

        expect(result.dayMaster).toBe('병');
      });

      it('should return default mission when no day master', () => {
        const result = analyzeKorean();

        expect(result.thisLifeMission.core).toContain(DEFAULT_MESSAGES.ko.mission);
      });
    });

    describe('Karmic Debts', () => {
      it('should detect 원진 karmic debt', () => {
        const result = analyzeKorean(createSajuWithSinsal([{ name: '원진살' }]));

        expect(result.karmicDebts.length).toBeGreaterThan(0);
        expect(result.karmicDebts[0].area).toBe(SINSAL_TYPES.WONJIN.koDesc);
      });

      it('should detect 공망 karmic debt', () => {
        const result = analyzeKorean(createSajuWithSinsal([{ name: SINSAL_TYPES.GONGMANG.ko }]));

        expectKarmicDebtArea(result.karmicDebts, SINSAL_TYPES.GONGMANG.koDesc);
      });

      it('should detect 겁살 karmic debt', () => {
        const result = analyzeKorean(createSajuWithSinsal([{ name: SINSAL_TYPES.GEOPSAL.ko }]));

        expectKarmicDebtArea(result.karmicDebts, SINSAL_TYPES.GEOPSAL.koDesc);
      });

      it('should limit karmic debts to max allowed', () => {
        const result = analyzeKorean(createSajuWithSinsal([
          { name: SINSAL_TYPES.WONJIN.ko },
          { name: SINSAL_TYPES.GONGMANG.ko },
          { name: SINSAL_TYPES.GEOPSAL.ko },
          { name: SINSAL_TYPES.WONJIN.ko },
          { name: SINSAL_TYPES.GONGMANG.ko },
        ]));

        expect(result.karmicDebts.length).toBeLessThanOrEqual(KARMA_SCORE.MAX_KARMIC_DEBTS);
      });

      it('should return empty array when no sinsal', () => {
        const result = analyzeKorean();

        expect(result.karmicDebts).toEqual([]);
      });
    });

    describe('Talents Carried', () => {
      it('should return talents based on geokguk', () => {
        const result = analyzeKorean(createSajuWithGeokguk('식신'));

        expect(result.talentsCarried).toContain('창작 능력');
        expect(result.talentsCarried).toContain('미적 감각');
      });

      it('should return English talents when isKo is false', () => {
        const result = analyzeEnglish(createSajuWithGeokguk('정관'));

        expect(result.talentsCarried).toContain('Organization');
        expect(result.talentsCarried).toContain('Leadership');
      });

      it('should return default talents when no geokguk', () => {
        const result = analyzeKorean();

        expect(result.talentsCarried).toContain('적응력');
        expect(result.talentsCarried).toContain('학습 능력');
      });
    });

    describe('Karma Score Calculation', () => {
      it('should return base score with no data', () => {
        const result = analyzeKorean();

        expect(result.karmaScore).toBe(KARMA_SCORE.BASE);
      });

      KARMA_SCORE_BONUS_TEST_CASES.forEach(({ name, createInput, expectedBonus }) => {
        it(`should add points for ${name}`, () => {
          const { saju, astro } = createInput();
          const result = analyzeKorean(saju, astro);

          expect(result.karmaScore).toBeGreaterThanOrEqual(KARMA_SCORE.BASE + expectedBonus);
        });
      });

      it('should add points per karmic debt', () => {
        const result = analyzeKorean(createSajuWithSinsal([
          { name: '원진' },
          { name: '공망' },
        ]));

        expect(result.karmaScore).toBeGreaterThanOrEqual(KARMA_SCORE.BASE + KARMA_SCORE.KARMIC_DEBT_BONUS * 2);
      });

      it('should cap score at max', () => {
        const saju = createFullSaju({
          geokgukName: '식신',
          dayMasterName: '갑',
          sinsalList: [{ name: '원진' }, { name: '공망' }, { name: '겁살' }],
        });
        const astro = createAstroWithPlanets([
          { name: 'North Node', house: 1 },
          { name: 'Saturn', house: 7 },
        ]);

        const result = analyzeKorean(saju, astro);

        expect(result.karmaScore).toBeLessThanOrEqual(KARMA_SCORE.MAX);
      });

      it('should have minimum score', () => {
        const result = analyzeKorean();

        expectScoreInRange(result.karmaScore, KARMA_SCORE.MIN, KARMA_SCORE.MAX);
      });
    });

    describe('Combined Analysis', () => {
      it('should process full saju and astro data', () => {
        const saju = createFullSaju({
          geokgukName: '정관',
          dayMasterName: '갑',
          sinsalList: [{ name: '원진' }],
        });
        const astro = createAstroWithPlanets([
          { name: 'North Node', house: 10 },
          { name: 'Saturn', house: 4 },
        ]);

        const result = analyzeKorean(saju, astro);

        expect(result.soulPattern.type).toBe('지도자 영혼');
        expectHouseNumbers(result, 10, 4);
        expect(result.dayMaster).toBe('갑');
        expect(result.karmicDebts.length).toBeGreaterThan(0);
        expect(result.karmaScore).toBeGreaterThan(KARMA_SCORE.EXPECTED_HIGH_SCORE);
      });

      it('should work with English output', () => {
        const result = analyzeEnglish(createSajuWithGeokguk('편인'));

        expect(result.soulPattern.type).toBe('Mystic Soul');
        expect(result.soulPattern.title).toBe("Seer's Soul");
        expect(result.pastLife.likely).toContain('shaman');
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty saju object', () => {
        const result = analyzeKorean({});

        expect(result).toBeDefined();
        expect(result.soulPattern.type).toBe(DEFAULT_SOUL_PATTERN.ko.type);
      });

      it('should handle empty astro object', () => {
        const result = analyzeKorean(null, {});

        expect(result).toBeDefined();
        expectHouseNumbers(result, undefined);
      });

      it('should handle invalid house numbers', () => {
        const result = analyzeKorean(null, createAstroWithInvalidHouses());

        expectUndefinedHouses(result);
      });

      it('should handle unknown geokguk names', () => {
        const result = analyzeKorean(createSajuWithGeokguk('unknown'));

        expect(result.soulPattern.type).toBe(DEFAULT_SOUL_PATTERN.ko.type);
      });

      it('should handle planet names with different formats', () => {
        const astro = createAstroWithPlanets([
          { name: 'SATURN', house: 5 },
          { name: 'NorthNode', house: 3 },
        ]);

        const result = analyzeKorean(null, astro);

        // Should find Saturn (case insensitive)
        expect(result.saturnHouse).toBe(5);
      });

      it('should handle 칠살 as pyeongwan geokguk', () => {
        const result = analyzeKorean(createSajuWithGeokguk('칠살'));

        expectSoulPattern(result, '전사 영혼', '⚔️');
      });

      it('should handle missing planets array', () => {
        const result = analyzeKorean(null, { planets: undefined });

        expectUndefinedHouses(result);
      });

      it('should handle empty planets array', () => {
        const result = analyzeKorean(null, { planets: [] });

        expectUndefinedHouses(result);
      });

      it('should handle planets without house property', () => {
        const result = analyzeKorean(null, createAstroWithMissingHouse());

        expectUndefinedHouses(result);
      });

      it('should handle planets with null/undefined names', () => {
        const result = analyzeKorean(null, createAstroWithNullPlanet());

        expectUndefinedHouses(result);
      });

      it('should handle empty sinsal unluckyList', () => {
        const result = analyzeKorean(createEmptySinsal());

        expect(result.karmicDebts).toEqual([]);
      });

      it('should handle sinsal items without name property', () => {
        const result = analyzeKorean(createSinsalWithoutName());

        expect(result.karmicDebts).toEqual([]);
      });

      it('should handle string items in unluckyList', () => {
        const result = analyzeKorean(createFullSaju({
          sinsalList: [SINSAL_TYPES.WONJIN.ko, SINSAL_TYPES.GONGMANG.ko]
        }));

        expect(result.karmicDebts.length).toBeGreaterThan(0);
      });

      it('should handle mixed case geokguk names', () => {
        const result = analyzeKorean(createSajuWithGeokguk('정관격'));

        expect(result.soulPattern.type).toBe('지도자 영혼');
      });
    });


    describe('Additional Geokguk Coverage', () => {
      ADDITIONAL_GEOKGUK_TEST_CASES.forEach(({ geokguk, soulType, emoji, theme }) => {
        it(`should handle ${geokguk} geokguk`, () => {
          const result = analyzeKorean(createSajuWithGeokguk(geokguk));

          expectSoulPattern(result, soulType, emoji);
          expectPastLifeTheme(result, theme);
        });
      });

      it('should handle all geokguk variations with 격 suffix', () => {
        GEOKGUK_VARIATIONS_WITH_SUFFIX.forEach((geokguk) => {
          const result = analyzeKorean(createSajuWithGeokguk(geokguk));
          expect(result.soulPattern.type).not.toBe(DEFAULT_SOUL_PATTERN.ko.type);
        });
      });
    });

    describe('Additional Sinsal Coverage', () => {
      SINSAL_CHINESE_CHARS_TEST_CASES.forEach(({ name, expectedArea }) => {
        it(`should detect ${name} karmic debt with Chinese characters`, () => {
          const result = analyzeKorean(createSajuWithSinsal([{ name }]));

          expectKarmicDebtArea(result.karmicDebts, expectedArea);
        });
      });

      it('should detect multiple 원진 entries but limit total to max', () => {
        const result = analyzeKorean(createSajuWithSinsal([
          { name: '원진살' },
          { name: SINSAL_TYPES.WONJIN.ko },
          { name: SINSAL_TYPES.GONGMANG.ko },
          { name: SINSAL_TYPES.GEOPSAL.ko },
        ]));

        expect(result.karmicDebts.length).toBe(KARMA_SCORE.MAX_KARMIC_DEBTS);
      });

      it('should skip sinsal items with empty names', () => {
        const result = analyzeKorean(createSajuWithSinsal([
          { name: '' },
          { name: SINSAL_TYPES.WONJIN.ko },
          { name: null as unknown as string },
        ]));

        expect(result.karmicDebts.length).toBe(1);
        expect(result.karmicDebts[0].area).toBe(SINSAL_TYPES.WONJIN.koDesc);
      });

      it('should handle sinsal with shinsal property', () => {
        const saju = createFullSaju({
          sinsalList: [{ shinsal: SINSAL_TYPES.WONJIN.ko }, { shinsal: SINSAL_TYPES.GONGMANG.ko }],
        });
        const result = analyzeKorean(saju);

        expect(result.karmicDebts.length).toBeGreaterThan(0);
      });

      it('should return English karmic debt descriptions', () => {
        const result = analyzeEnglish(createSajuWithSinsal([{ name: SINSAL_TYPES.WONJIN.ko }]));

        expect(result.karmicDebts[0].area).toBe(SINSAL_TYPES.WONJIN.en);
        expect(result.karmicDebts[0].description).toContain('past lives');
      });
    });

    describe('Additional Day Master Coverage', () => {
      it('should extract day master from heavenlyStem.name', () => {
        const result = analyzeKorean(createSajuWithDayMasterHeavenlyStem('을'));

        expect(result.dayMaster).toBe('을');
        expect(result.thisLifeMission.core).toContain('부드러운 힘');
      });

      it('should handle day master with multiple characters', () => {
        const result = analyzeKorean(createSajuWithPillarsDay('정화'));

        expect(result.dayMaster).toBe('정');
      });

      it('should handle invalid day master characters', () => {
        const result = analyzeKorean(createFullSaju({ dayMasterName: 'xyz' }));

        expect(result.dayMaster).toBeUndefined();
        expect(result.thisLifeMission.core).toContain(DEFAULT_MESSAGES.ko.mission);
      });

      it('should handle all day master stems', () => {
        DAY_MASTER_STEMS.forEach((stem) => {
          const result = analyzeKorean(createSajuWithDayMaster(stem));
          expect(result.dayMaster).toBe(stem);
          expect(result.thisLifeMission.core).toBeTruthy();
        });
      });
    });

    describe('Karma Score Edge Cases', () => {
      it('should ensure minimum score', () => {
        const result = analyzeKorean(null, null);

        expectScoreInRange(result.karmaScore, KARMA_SCORE.MIN, KARMA_SCORE.MAX);
      });

      it('should not exceed maximum score', () => {
        const saju = createFullSaju({
          geokgukName: '식신',
          dayMasterName: '갑',
          sinsalList: Array(10).fill({ name: '원진' }),
        });
        const astro = createAstroWithPlanets([
          { name: 'North Node', house: 1 },
          { name: 'Saturn', house: 7 },
        ]);

        const result = analyzeKorean(saju, astro);

        expect(result.karmaScore).toBeLessThanOrEqual(KARMA_SCORE.MAX);
      });

      it('should calculate correct score with partial data', () => {
        const result = analyzeKorean(createSajuWithGeokguk('식신'));
        const expected = calculateExpectedScore({ geokguk: true });

        expect(result.karmaScore).toBe(expected);
      });

      it('should add score for each karmic debt correctly', () => {
        const result = analyzeKorean(createSajuWithSinsal([{ name: '원진' }]));
        const expected = calculateExpectedScore({ karmicDebts: 1 });

        expect(result.karmaScore).toBe(expected);
      });
    });

    describe('Talents Carried Edge Cases', () => {
      it('should return English talents for all geokguk types', () => {
        GEOKGUK_TYPES.forEach((geokguk) => {
          const result = analyzeEnglish(createSajuWithGeokguk(geokguk));
          expect(result.talentsCarried.length).toBeGreaterThan(0);
          expectLanguageMatch(result.talentsCarried[0], false);
        });
      });
    });

    describe('Past Life Era Coverage', () => {
      it('should not include era when no geokguk', () => {
        const result = analyzeKorean();

        expect(result.pastLife.era).toBeUndefined();
      });
    });

    describe('Planet Name Variations', () => {
      it('should find North Node with space', () => {
        const result = analyzeKorean(null, createAstroWithPlanet('North Node', 5));

        expect(result.northNodeHouse).toBe(5);
      });

      it('should find North Node without space', () => {
        const result = analyzeKorean(null, createAstroWithPlanet('NorthNode', 5));

        expect(result.northNodeHouse).toBe(5);
      });

      it('should find Saturn with any case', () => {
        PLANET_NAME_VARIATIONS.SATURN.forEach((name) => {
          const result = analyzeKorean(null, createAstroWithPlanet(name, 3));
          expectHouseNumbers(result, undefined, 3);
        });
      });

      it('should prioritize north search over northnode', () => {
        const astro = { planets: [{ name: 'North Node', house: 5 }] };
        const result = analyzeKorean(null, astro);

        expect(result.northNodeHouse).toBe(5);
      });
    });

    describe('Language Consistency', () => {
      it('should return all Korean text for Korean mode', () => {
        const saju = createSajuWithGeokguk('식신');
        const astro = createAstroWithPlanets([
          { name: 'North Node', house: 1 },
          { name: 'Saturn', house: 7 },
        ]);
        const result = analyzeKorean(saju, astro);

        expectLanguageMatch(result.soulPattern.type, true);
        expectLanguageMatch(result.soulPattern.title, true);
        expectLanguageMatch(result.pastLife.likely, true);
        expectLanguageMatch(result.thisLifeMission.core, true);
      });

      it('should return all English text for English mode', () => {
        const saju = createSajuWithGeokguk('식신');
        const astro = createAstroWithPlanets([
          { name: 'North Node', house: 1 },
          { name: 'Saturn', house: 7 },
        ]);
        const result = analyzeEnglish(saju, astro);

        expectLanguageMatch(result.soulPattern.type, false);
        expectLanguageMatch(result.soulPattern.title, false);
        expectLanguageMatch(result.pastLife.likely, false);
        expectLanguageMatch(result.thisLifeMission.core, false);
      });
    });

    describe('Soul Pattern Traits Coverage', () => {
      it('should return 5 traits for each soul pattern', () => {
        GEOKGUK_TYPES.forEach((geokguk) => {
          const result = analyzeKorean(createSajuWithGeokguk(geokguk));
          expect(result.soulPattern.traits.length).toBe(5);
        });
      });
    });

    describe('Complete Result Structure', () => {
      it('should have all required fields populated', () => {
        const saju = createSajuWithGeokguk('정관');
        const astro = createAstroWithPlanets([
          { name: 'North Node', house: 10 },
          { name: 'Saturn', house: 4 },
        ]);
        const result = analyzeKorean(saju, astro);

        expect(result.soulPattern.type).toBeTruthy();
        expect(result.pastLife.likely).toBeTruthy();
        expect(result.soulJourney.pastPattern).toBeTruthy();
        expect(result.saturnLesson.lesson).toBeTruthy();
        expect(result.thisLifeMission.core).toBeTruthy();
        expect(result.karmicDebts).toBeInstanceOf(Array);
        expect(result.talentsCarried).toBeInstanceOf(Array);
        expect(typeof result.karmaScore).toBe('number');
      });
    });

    describe('English Language Comprehensive Coverage', () => {
      it('should return English soul journey for all node houses', () => {
        HOUSE_NUMBERS.forEach((house) => {
          const result = analyzeEnglish(null, createAstroWithPlanet('North Node', house));
          expectLanguageMatch(result.soulJourney.pastPattern, false);
        });
      });

      it('should return English Saturn lesson for all houses', () => {
        HOUSE_NUMBERS.forEach((house) => {
          const result = analyzeEnglish(null, createAstroWithPlanet('Saturn', house));
          expectLanguageMatch(result.saturnLesson.lesson, false);
        });
      });
    });

    describe('Karma Score Boundary Testing', () => {
      it('should handle score near maximum', () => {
        const saju = createFullSaju({
          geokgukName: '식신',
          dayMasterName: '갑',
          sinsalList: [{ name: '원진' }, { name: '공망' }, { name: '겁살' }],
        });
        const astro = createAstroWithPlanets([
          { name: 'North Node', house: 1 },
          { name: 'Saturn', house: 7 },
        ]);

        const result = analyzeKorean(saju, astro);

        expect(result.karmaScore).toBeGreaterThan(KARMA_SCORE.EXPECTED_HIGH_SCORE);
        expectScoreInRange(result.karmaScore, KARMA_SCORE.MIN, KARMA_SCORE.MAX);
      });
    });

    describe('Multiple Karmic Debts Deduplication', () => {
      it('should handle multiple karmic debt entries respecting max limit', () => {
        const result = analyzeKorean(
          createSajuWithSinsal([
            { name: '원진' },
            { name: '원진살' },
            { name: '원진' },
          ])
        );

        // Each unique sinsal type creates a karmic debt, limited to 4 total
        expect(result.karmicDebts.length).toBeLessThanOrEqual(KARMA_SCORE.MAX_KARMIC_DEBTS);
      });
    });

    describe('Comprehensive Integration Tests', () => {
      it('should handle complex saju with all fields populated', () => {
        const saju = createFullSaju({
          geokgukName: '식신격',
          geokgukType: '식신',
          dayMasterName: '갑',
          sinsalList: [
            { name: '원진살', shinsal: '원진' },
            { name: '공망' },
            '겁살',
          ],
        });
        const astro = createAstroWithPlanets([
          { name: 'North Node', house: 10 },
          { name: 'Saturn', house: 4 },
          { name: 'Sun', house: 1 },
        ]);

        const result = analyzeKorean(saju, astro);

        expect(result.soulPattern.type).toBe('창조자 영혼');
        expect(result.geokguk).toBe('식신격');
        expect(result.northNodeHouse).toBe(10);
        expect(result.saturnHouse).toBe(4);
        expect(result.dayMaster).toBe('갑');
        expect(result.karmicDebts.length).toBe(3);
        expect(result.karmaScore).toBeGreaterThan(KARMA_SCORE.EXPECTED_HIGH_SCORE);
      });

      it('should handle mixed Korean and English planet names', () => {
        const astro = createAstroWithPlanets([
          { name: 'NORTH NODE', house: 3 },
          { name: 'saturn', house: 9 },
        ]);

        const result = analyzeKorean(null, astro);

        expect(result.northNodeHouse).toBe(3);
        expect(result.saturnHouse).toBe(9);
      });

      it('should validate all fields exist in full analysis', () => {
        const saju = createSajuWithGeokguk('정관');
        const astro = createAstroWithPlanets([
          { name: 'North Node', house: 1 },
          { name: 'Saturn', house: 7 },
        ]);

        const result = analyzeKorean(saju, astro);

        // Use helper for basic validation
        expectAllFieldsDefined(result);

        // Use complete validation helpers
        expectSoulPatternComplete(result.soulPattern);
        expectPastLifeComplete(result.pastLife);
        expectJourneyComplete(result.soulJourney);
        expectLessonComplete(result.saturnLesson);
        expectMissionComplete(result.thisLifeMission);

        // Metadata
        expect(result.geokguk).toBeTruthy();
        expect(result.northNodeHouse).toBe(1);
        expect(result.saturnHouse).toBe(7);
      });
    });

    describe('Geokguk Suffix Variations', () => {
      it('should handle all geokguk types with 격 suffix', () => {
        GEOKGUK_VARIATIONS_WITH_SUFFIX.forEach((geokguk) => {
          const result = analyzeKorean(createSajuWithGeokguk(geokguk));
          expect(result.soulPattern.type).not.toBe(DEFAULT_SOUL_PATTERN.ko.type);
          expect(result.geokguk).toBe(geokguk);
        });
      });

      it('should handle geokguk without 격 suffix', () => {
        GEOKGUK_TYPES.forEach((geokguk) => {
          const result = analyzeKorean(createSajuWithGeokguk(geokguk));
          expect(result.soulPattern.type).not.toBe(DEFAULT_SOUL_PATTERN.ko.type);
          expect(result.geokguk).toBe(geokguk);
        });
      });
    });

    describe('Soul Journey All Houses', () => {
      it('should have unique past patterns for all 12 houses', () => {
        expectUniqueValues(
          HOUSE_NUMBERS,
          (_house, result) => result.soulJourney.pastPattern,
          (house) => analyzeKorean(null, createAstroWithPlanet('North Node', house)),
          12
        );
      });

      it('should have all required journey fields for each house', () => {
        HOUSE_NUMBERS.forEach((house) => {
          const result = analyzeKorean(null, createAstroWithPlanet('North Node', house));
          expectJourneyComplete(result.soulJourney);
        });
      });
    });

    describe('Saturn Lesson All Houses', () => {
      it('should have unique lessons for all 12 houses', () => {
        expectUniqueValues(
          HOUSE_NUMBERS,
          (_house, result) => result.saturnLesson.lesson,
          (house) => analyzeKorean(null, createAstroWithPlanet('Saturn', house)),
          12
        );
      });

      it('should have all required lesson fields for each house', () => {
        HOUSE_NUMBERS.forEach((house) => {
          const result = analyzeKorean(null, createAstroWithPlanet('Saturn', house));
          expectLessonComplete(result.saturnLesson);
        });
      });
    });

    describe('All Geokguk Types Coverage', () => {
      it('should have unique soul patterns for all geokguk types', () => {
        expectUniqueValues(
          GEOKGUK_TYPES,
          (_geokguk, result) => result.soulPattern.type,
          (geokguk) => analyzeKorean(createSajuWithGeokguk(geokguk)),
          8
        );
      });

      it('should have unique emojis for all geokguk types', () => {
        expectUniqueValues(
          GEOKGUK_TYPES,
          (_geokguk, result) => result.soulPattern.emoji,
          (geokguk) => analyzeKorean(createSajuWithGeokguk(geokguk)),
          8
        );
      });

      it('should have past life era for all geokguk types', () => {
        GEOKGUK_TYPES.forEach((geokguk) => {
          const result = analyzeKorean(createSajuWithGeokguk(geokguk));
          expect(result.pastLife.era).toBeTruthy();
        });
      });

      it('should have talents for all geokguk types', () => {
        GEOKGUK_TYPES.forEach((geokguk) => {
          const result = analyzeKorean(createSajuWithGeokguk(geokguk));
          expect(result.talentsCarried.length).toBeGreaterThan(0);
        });
      });
    });

    describe('All Day Master Stems Coverage', () => {
      it('should have unique missions for all day master stems', () => {
        expectUniqueValues(
          DAY_MASTER_STEMS,
          (_stem, result) => result.thisLifeMission.core,
          (stem) => analyzeKorean(createSajuWithDayMaster(stem)),
          10
        );
      });

      DAY_MASTER_SOURCES_TEST_CASES.forEach(({ source, saju, expected }) => {
        it(`should extract day master from ${source}`, () => {
          const result = analyzeKorean(saju as any);
          expect(result.dayMaster).toBe(expected);
        });
      });
    });

    describe('Karma Score Calculation Precision', () => {
      it('should calculate exact score with all bonuses', () => {
        const saju = createFullSaju({
          geokgukName: '식신',
          dayMasterName: '갑',
          sinsalList: [{ name: '원진' }],
        });
        const astro = createAstroWithPlanets([
          { name: 'North Node', house: 1 },
          { name: 'Saturn', house: 7 },
        ]);

        const result = analyzeKorean(saju, astro);

        const expected = calculateExpectedScore({
          geokguk: true,
          northNode: true,
          saturn: true,
          dayMaster: true,
          karmicDebts: 1,
        });
        expect(result.karmaScore).toBe(expected);
      });

      it('should calculate exact score with no bonuses', () => {
        const result = analyzeKorean(null, null);

        expect(result.karmaScore).toBe(KARMA_SCORE.BASE);
      });

      it('should calculate score with only geokguk', () => {
        const result = analyzeKorean(createSajuWithGeokguk('정관'));
        const expected = calculateExpectedScore({ geokguk: true });

        expect(result.karmaScore).toBe(expected);
      });

      it('should calculate score with multiple karmic debts', () => {
        const result = analyzeKorean(
          createSajuWithSinsal([{ name: '원진' }, { name: '공망' }, { name: '겁살' }])
        );
        const expected = calculateExpectedScore({ karmicDebts: 3 });

        expect(result.karmaScore).toBe(expected);
      });
    });

    describe('English Language Complete Coverage', () => {
      it('should return complete English result for all geokguk types', () => {
        GEOKGUK_TYPES.forEach((geokguk) => {
          const result = analyzeEnglish(createSajuWithGeokguk(geokguk));

          expectLanguageMatch(result.soulPattern.type, false);
          expectLanguageMatch(result.soulPattern.title, false);
          expectLanguageMatch(result.pastLife.likely, false);
          expectLanguageMatch(result.talentsCarried[0], false);
        });
      });

      it('should return complete English result for all day masters', () => {
        DAY_MASTER_STEMS.forEach((stem) => {
          const result = analyzeEnglish(createSajuWithDayMaster(stem));

          expectLanguageMatch(result.thisLifeMission.core, false);
          expectLanguageMatch(result.thisLifeMission.expression, false);
          expectLanguageMatch(result.thisLifeMission.fulfillment, false);
        });
      });

      SINSAL_TRANSLATION_TEST_CASES.forEach(({ ko, en }) => {
        it(`should return English sinsal description for ${ko}`, () => {
          const result = analyzeEnglish(createSajuWithSinsal([{ name: ko }]));
          expect(result.karmicDebts[0].area).toBe(en);
          expectLanguageMatch(result.karmicDebts[0].description, false);
        });
      });
    });

    describe('Result Metadata Validation', () => {
      it('should store raw data correctly', () => {
        const saju = createSajuWithGeokguk('식신격');
        const astro = createAstroWithPlanets([
          { name: 'North Node', house: 5 },
          { name: 'Saturn', house: 11 },
        ]);

        const result = analyzeKorean(saju, astro);

        expect(result.geokguk).toBe('식신격');
        expect(result.northNodeHouse).toBe(5);
        expect(result.saturnHouse).toBe(11);
        expect(result.dayMaster).toBeUndefined();
      });

      it('should not include dayMaster when not provided', () => {
        const result = analyzeKorean(createSajuWithGeokguk('정관'));

        expect(result.dayMaster).toBeUndefined();
      });

      it('should not include house numbers when planets not found', () => {
        const result = analyzeKorean(createSajuWithGeokguk('식신'));

        expect(result.northNodeHouse).toBeUndefined();
        expect(result.saturnHouse).toBeUndefined();
      });
    });

    describe('Combined Narrative', () => {
      it('should generate combinedNarrative when full data is provided', () => {
        const saju = createFullSaju({
          geokgukName: '식신',
          dayMasterName: '갑',
        });
        const astro = createAstroWithPlanets([
          { name: 'North Node', house: 5 },
          { name: 'Saturn', house: 7 },
        ]);

        const result = analyzeKorean(saju, astro);

        expect(result.combinedNarrative).toBeDefined();
        expect(result.combinedNarrative).toBeTruthy();
        expect(typeof result.combinedNarrative).toBe('string');
      });

      it('should return Korean narrative when isKo is true', () => {
        const saju = createFullSaju({
          geokgukName: '정관',
          dayMasterName: '을',
        });
        const astro = createAstroWithPlanets([
          { name: 'North Node', house: 10 },
          { name: 'Saturn', house: 4 },
        ]);

        const result = analyzeKorean(saju, astro);

        expect(result.combinedNarrative).toBeDefined();
        expectLanguageMatch(result.combinedNarrative!, true);
      });

      it('should return English narrative when isKo is false', () => {
        const saju = createFullSaju({
          geokgukName: '상관',
          dayMasterName: '병',
        });
        const astro = createAstroWithPlanets([
          { name: 'North Node', house: 3 },
          { name: 'Saturn', house: 9 },
        ]);

        const result = analyzeEnglish(saju, astro);

        expect(result.combinedNarrative).toBeDefined();
        expectLanguageMatch(result.combinedNarrative!, false);
      });

      it('should generate different narratives for different geokguk types', () => {
        const astro = createAstroWithPlanets([
          { name: 'North Node', house: 1 },
          { name: 'Saturn', house: 7 },
        ]);

        const result1 = analyzeKorean(createSajuWithGeokguk('식신'), astro);
        const result2 = analyzeKorean(createSajuWithGeokguk('정관'), astro);

        expect(result1.combinedNarrative).not.toBe(result2.combinedNarrative);
      });

      it('should generate different narratives for different North Node houses', () => {
        const saju = createSajuWithGeokguk('정재');

        const result1 = analyzeKorean(saju, createAstroWithPlanet('North Node', 1));
        const result2 = analyzeKorean(saju, createAstroWithPlanet('North Node', 7));

        expect(result1.combinedNarrative).not.toBe(result2.combinedNarrative);
      });

      it('should generate different narratives for different Saturn houses', () => {
        const saju = createSajuWithGeokguk('편인');

        const result1 = analyzeKorean(saju, createAstroWithPlanet('Saturn', 4));
        const result2 = analyzeKorean(saju, createAstroWithPlanet('Saturn', 10));

        expect(result1.combinedNarrative).not.toBe(result2.combinedNarrative);
      });

      it('should generate different narratives for different day masters', () => {
        const astro = createAstroWithPlanets([
          { name: 'North Node', house: 5 },
          { name: 'Saturn', house: 8 },
        ]);

        const saju1 = createFullSaju({ geokgukName: '편재', dayMasterName: '갑' });
        const saju2 = createFullSaju({ geokgukName: '편재', dayMasterName: '임' });

        const result1 = analyzeKorean(saju1, astro);
        const result2 = analyzeKorean(saju2, astro);

        expect(result1.combinedNarrative).not.toBe(result2.combinedNarrative);
      });

      it('should generate narrative with minimum length', () => {
        const saju = createFullSaju({
          geokgukName: '식신',
          dayMasterName: '갑',
        });
        const astro = createAstroWithPlanets([
          { name: 'North Node', house: 1 },
          { name: 'Saturn', house: 7 },
        ]);

        const result = analyzeKorean(saju, astro);

        // Narrative should have significant content (minimum 500 characters for 20+ lines)
        expect(result.combinedNarrative!.length).toBeGreaterThan(500);
      });

      it('should handle partial data gracefully', () => {
        // Only geokguk
        const result1 = analyzeKorean(createSajuWithGeokguk('식신'));
        expect(result1.combinedNarrative).toBeDefined();

        // Only astro
        const result2 = analyzeKorean(null, createAstroWithPlanet('North Node', 5));
        expect(result2.combinedNarrative).toBeDefined();

        // No data at all
        const result3 = analyzeKorean();
        expect(result3.combinedNarrative).toBeDefined();
      });

      it('should generate consistent narratives for same input', () => {
        const saju = createFullSaju({
          geokgukName: '정관',
          dayMasterName: '병',
        });
        const astro = createAstroWithPlanets([
          { name: 'North Node', house: 10 },
          { name: 'Saturn', house: 4 },
        ]);

        const result1 = analyzeKorean(saju, astro);
        const result2 = analyzeKorean(saju, astro);

        expect(result1.combinedNarrative).toBe(result2.combinedNarrative);
      });

      it('should generate narrative for all geokguk types', () => {
        GEOKGUK_TYPES.forEach((geokguk) => {
          const result = analyzeKorean(createSajuWithGeokguk(geokguk));
          expect(result.combinedNarrative).toBeDefined();
          expect(result.combinedNarrative!.length).toBeGreaterThan(100);
        });
      });

      it('should generate narrative for all 12 North Node houses', () => {
        HOUSE_NUMBERS.forEach((house) => {
          const result = analyzeKorean(
            createSajuWithGeokguk('식신'),
            createAstroWithPlanet('North Node', house)
          );
          expect(result.combinedNarrative).toBeDefined();
          expect(result.combinedNarrative!.length).toBeGreaterThan(100);
        });
      });

      it('should generate narrative for all 12 Saturn houses', () => {
        HOUSE_NUMBERS.forEach((house) => {
          const result = analyzeKorean(
            createSajuWithGeokguk('정관'),
            createAstroWithPlanet('Saturn', house)
          );
          expect(result.combinedNarrative).toBeDefined();
          expect(result.combinedNarrative!.length).toBeGreaterThan(100);
        });
      });

      it('should generate narrative for all day master stems', () => {
        DAY_MASTER_STEMS.forEach((stem) => {
          const result = analyzeKorean(createSajuWithDayMaster(stem));
          expect(result.combinedNarrative).toBeDefined();
          expect(result.combinedNarrative!.length).toBeGreaterThan(100);
        });
      });
    });

    describe('Performance and Consistency', () => {
      it('should complete analysis in reasonable time', () => {
        const start = Date.now();

        for (let i = 0; i < PERFORMANCE_THRESHOLDS.BATCH_SIZE; i++) {
          analyzeKorean(createSajuWithGeokguk('식신'));
        }

        const duration = Date.now() - start;
        expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.MAX_BATCH_DURATION_MS);
      });

      it('should return consistent results for same input', () => {
        const saju = createSajuWithGeokguk('정관');
        const astro = createAstroWithPlanet('North Node', 7);

        const result1 = analyzeKorean(saju, astro);
        const result2 = analyzeKorean(saju, astro);

        expect(result1.soulPattern.type).toBe(result2.soulPattern.type);
        expect(result1.karmaScore).toBe(result2.karmaScore);
        expect(result1.northNodeHouse).toBe(result2.northNodeHouse);
      });

      it('should handle rapid successive calls', () => {
        const results = Array.from({ length: PERFORMANCE_THRESHOLDS.RAPID_CALL_COUNT }, (_, i) => {
          return analyzeKorean(
            createSajuWithGeokguk(GEOKGUK_TYPES[i % GEOKGUK_TYPES.length]),
            createAstroWithPlanet('Saturn', (i % 12) + 1)
          );
        });

        expect(results.length).toBe(PERFORMANCE_THRESHOLDS.RAPID_CALL_COUNT);
        results.forEach((result) => {
          expect(result).toBeDefined();
          expectScoreInRange(result.karmaScore, KARMA_SCORE.MIN, KARMA_SCORE.MAX);
        });
      });
    });
  });
});
