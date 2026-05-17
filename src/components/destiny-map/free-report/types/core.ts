/**
 * Core type definitions for free-report analyzers
 * Provides strict typing for all analyzers
 */

// ========== Standardized Domain Types ==========

/**
 * Standardized planet names (canonical lowercase form)
 * All planet name matching should normalize to these values
 */
export type StandardPlanetName =
  | 'sun' | 'moon' | 'mercury' | 'venus' | 'mars'
  | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto'
  | 'northnode' | 'southnode' | 'chiron' | 'lilith'
  | 'juno' | 'ceres' | 'pallas' | 'vesta'
  | 'ascendant' | 'mc'; // Chart points

/**
 * Standardized aspect types (lowercase)
 */
export type AspectType =
  | 'conjunction' | 'opposition' | 'square' | 'trine' | 'sextile'
  | 'quincunx' | 'semisextile' | 'semisquare' | 'sesquiquadrate';

/**
 * Zodiac signs (always lowercase)
 */
export type ZodiacSign =
  | 'aries' | 'taurus' | 'gemini' | 'cancer' | 'leo' | 'virgo'
  | 'libra' | 'scorpio' | 'sagittarius' | 'capricorn' | 'aquarius' | 'pisces';

/**
 * Five elements (always lowercase English)
 */
export type FiveElement = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

/**
 * Korean heavenly stems (천간)
 */
export type HeavenlyStem = '갑' | '을' | '병' | '정' | '무' | '기' | '경' | '신' | '임' | '계';

/**
 * Chinese heavenly stems (for mapping)
 */
export type ChineseHeavenlyStem = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';

/**
 * Sibsin categories (십신 대분류)
 */
export type SibsinCategory = '비겁' | '식상' | '재성' | '관성' | '인성';

/**
 * Individual sibsin types (십신) including categories (대분류)
 */
export type SibsinType =
  | '비겁' | '비견' | '겁재'       // 비겁
  | '식상' | '식신' | '상관'       // 식상
  | '재성' | '정재' | '편재'       // 재성
  | '관성' | '정관' | '편관'       // 관성
  | '인성' | '정인' | '편인';      // 인성

/**
 * Geokguk types (격국)
 */
export type GeokgukType =
  | 'jeonggwan' | 'pyeongwan' | 'jeongin' | 'pyeongin'
  | 'siksin' | 'sanggwan' | 'jeongjae' | 'pyeonjae'
  | 'geonrok' | 'yangin' | 'jonga' | 'jongjae' | 'jongsal' | 'jonggang'
  | 'gokjik' | 'yeomsang' | 'gasaek' | 'jonghyeok' | 'yunha';

/**
 * Twelve stages (12운성)
 */
export type TwelveStage =
  | '장생' | '목욕' | '관대' | '건록' | '제왕' | '쇠'
  | '병' | '사' | '묘' | '절' | '태' | '양';

/**
 * House numbers (1-12)
 */
export type HouseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

// ========== Bilingual Text Types ==========

/**
 * Bilingual text object for Korean and English
 */
export interface BilingualText {
  ko: string;
  en: string;
}

/**
 * Bilingual array for Korean and English
 */
export interface BilingualArray {
  ko: string[];
  en: string[];
}

// ========== Lookup Table Types ==========

/**
 * Base entry with bilingual description
 */
export interface BaseBilingualEntry {
  description?: BilingualText;
}

/**
 * Zodiac trait entry for various domains
 */
export interface ZodiacTraitEntry extends BaseBilingualEntry {
  style?: BilingualText;
  attract?: BilingualText;
  strength?: BilingualText;
  danger?: BilingualText;
  ideal?: BilingualText;
  emoji?: string;
}

/**
 * Day master trait entry
 */
export interface DayMasterTraitEntry extends BaseBilingualEntry {
  core?: BilingualText;
  danger?: BilingualText;
  ideal?: BilingualText;
  workStyle?: BilingualText;
  growth?: BilingualText;
  avoid?: BilingualText;
  field?: BilingualArray;
}

/**
 * Sibsin trait entry for various domains
 */
export interface SibsinTraitEntry extends BaseBilingualEntry {
  personality?: BilingualText;
  loveStyle?: BilingualText;
  careerStyle?: BilingualText;
  fields?: BilingualArray;
}

/**
 * House pattern entry
 */
export interface HousePatternEntry extends BaseBilingualEntry {
  pattern?: BilingualText;
  leadership?: BilingualText;
  emoji?: string;
}

/**
 * Aspect interpretation entry
 */
export interface AspectInterpretation {
  description: BilingualText;
  effect: 'positive' | 'challenging' | 'neutral';
  score?: number;
}

// ========== Helper type for element mapping ==========

/**
 * Korean to English element mapping
 */
const KOREAN_ELEMENT_MAP: Record<string, FiveElement> = {
  '목': 'wood',
  '화': 'fire',
  '토': 'earth',
  '금': 'metal',
  '수': 'water',
  'wood': 'wood',
  'fire': 'fire',
  'earth': 'earth',
  'metal': 'metal',
  'water': 'water',
};

/**
 * Chinese heavenly stem to Korean mapping
 */
const CHINESE_TO_KOREAN_STEM: Record<ChineseHeavenlyStem | string, HeavenlyStem> = {
  '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무',
  '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계',
};

/**
 * Heavenly stem to element mapping
 */
const STEM_ELEMENT_MAP: Record<HeavenlyStem, FiveElement> = {
  '갑': 'wood', '을': 'wood',
  '병': 'fire', '정': 'fire',
  '무': 'earth', '기': 'earth',
  '경': 'metal', '신': 'metal',
  '임': 'water', '계': 'water',
};

// ========== Zodiac Sign Helpers ==========

export const ZODIAC_SIGNS: readonly ZodiacSign[] = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'
] as const;

export const ZODIAC_ELEMENTS: Record<ZodiacSign, 'fire' | 'earth' | 'air' | 'water'> = {
  aries: 'fire', taurus: 'earth', gemini: 'air', cancer: 'water',
  leo: 'fire', virgo: 'earth', libra: 'air', scorpio: 'water',
  sagittarius: 'fire', capricorn: 'earth', aquarius: 'air', pisces: 'water',
};

const ZODIAC_MODALITIES: Record<ZodiacSign, 'cardinal' | 'fixed' | 'mutable'> = {
  aries: 'cardinal', taurus: 'fixed', gemini: 'mutable', cancer: 'cardinal',
  leo: 'fixed', virgo: 'mutable', libra: 'cardinal', scorpio: 'fixed',
  sagittarius: 'mutable', capricorn: 'cardinal', aquarius: 'fixed', pisces: 'mutable',
};
