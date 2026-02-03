/**
 * Past Life Analyzer Test Constants
 * Extracted from analyzer.test.ts for reusability
 */

export const KARMA_SCORE = {
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
} as const

export const DEFAULT_SOUL_PATTERN = {
  ko: { type: '탐험가 영혼', emoji: '🌟' },
  en: { type: 'Explorer Soul', emoji: '🌟' },
} as const

export const REGEX_PATTERNS = {
  KOREAN: /[\uAC00-\uD7AF]/,
  ENGLISH: /[A-Za-z]/,
} as const

export const GEOKGUK_TYPES = [
  '식신',
  '상관',
  '정관',
  '편관',
  '정재',
  '편재',
  '정인',
  '편인',
] as const
export const DAY_MASTER_STEMS = [
  '갑',
  '을',
  '병',
  '정',
  '무',
  '기',
  '경',
  '신',
  '임',
  '계',
] as const
export const HOUSE_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const

export const GEOKGUK_MAPPINGS = [
  { name: '식신', expectedType: '창조자 영혼', emoji: '🎨', koTheme: '예술가', enTheme: 'artist' },
  {
    name: '상관',
    expectedType: '변혁가 영혼',
    emoji: '⚡',
    koTheme: '혁명가',
    enTheme: 'entertainer',
  },
  {
    name: '정관',
    expectedType: '지도자 영혼',
    emoji: '👑',
    koTheme: '관리',
    enTheme: 'administrator',
  },
  { name: '편관', expectedType: '전사 영혼', emoji: '⚔️', koTheme: '군인', enTheme: 'soldier' },
  { name: '정재', expectedType: '보존자 영혼', emoji: '🏛️', koTheme: '상인', enTheme: 'merchant' },
  { name: '편재', expectedType: '모험가 영혼', emoji: '🧭', koTheme: '무역상', enTheme: 'trader' },
  { name: '정인', expectedType: '현자 영혼', emoji: '📚', koTheme: '학자', enTheme: 'scholar' },
  { name: '편인', expectedType: '신비가 영혼', emoji: '🔮', koTheme: '무당', enTheme: 'shaman' },
] as const

export const SINSAL_TYPES = {
  WONJIN: { ko: '원진', en: 'Relationship Karma', koDesc: '관계 카르마' },
  GONGMANG: { ko: '공망', en: 'Emptiness Karma', koDesc: '공허 카르마' },
  GEOPSAL: { ko: '겁살', en: 'Challenge Karma', koDesc: '도전 카르마' },
} as const

export const DEFAULT_MESSAGES = {
  ko: {
    pastLife: '다양한 역할을 경험한 영혼입니다.',
    journey: '전생의 패턴',
    saturn: '인생의 중요한 교훈',
    mission: '당신만의 빛',
  },
  en: {
    soulType: 'Explorer Soul',
  },
} as const

export const NODE_HOUSE_TEST_CASES = [
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
] as const

export const SATURN_HOUSE_TEST_CASES = [
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
] as const
