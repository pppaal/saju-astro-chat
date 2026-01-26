/**
 * Geokguk (격국) type mapping utilities
 * Provides robust pattern matching for geokguk names
 */

import type { GeokgukType } from '../types/core';

// ========== Geokguk Pattern Definitions ==========

interface GeokgukPattern {
  patterns: string[];
  type: GeokgukType;
}

/**
 * Ordered patterns for geokguk matching
 * More specific patterns come first to prevent false matches
 * e.g., "종살" should not match "종강" through partial matching
 */
const GEOKGUK_PATTERNS: GeokgukPattern[] = [
  // 관성 (Official stars)
  { patterns: ['정관격', '정관'], type: 'jeonggwan' },
  { patterns: ['편관격', '편관', '칠살격', '칠살', '7살격'], type: 'pyeongwan' },

  // 인성 (Seal stars)
  { patterns: ['정인격', '정인'], type: 'jeongin' },
  { patterns: ['편인격', '편인', '효신격', '효신'], type: 'pyeongin' },

  // 식상 (Output stars)
  { patterns: ['식신격', '식신'], type: 'siksin' },
  { patterns: ['상관격', '상관'], type: 'sanggwan' },

  // 재성 (Wealth stars)
  { patterns: ['정재격', '정재'], type: 'jeongjae' },
  { patterns: ['편재격', '편재'], type: 'pyeonjae' },

  // 비겁 (Sibling stars)
  { patterns: ['건록격', '건록', '녹'], type: 'geonrok' },
  { patterns: ['양인격', '양인', '겁재격'], type: 'yangin' },

  // 종격 (Following patterns) - Order matters here!
  { patterns: ['종아격', '종아'], type: 'jonga' },         // 종아 first
  { patterns: ['종재격', '종재'], type: 'jongjae' },       // 종재 before 종
  { patterns: ['종살격', '종살'], type: 'jongsal' },       // 종살 specific
  { patterns: ['종강격', '종강'], type: 'jonggang' },      // 종강 specific
  { patterns: ['종혁격', '종혁'], type: 'jonghyeok' },     // 종혁 specific

  // 오행격 (Element patterns)
  { patterns: ['곡직격', '곡직'], type: 'gokjik' },
  { patterns: ['염상격', '염상'], type: 'yeomsang' },
  { patterns: ['가색격', '가색', '가색인수격'], type: 'gasaek' },
  { patterns: ['윤하격', '윤하'], type: 'yunha' },
];

/**
 * Maps geokguk name to standardized type
 * Uses exact matching first, then pattern matching as fallback
 *
 * @param name - Geokguk name (Korean)
 * @returns Standardized geokguk type or null
 */
export function getGeokgukType(name: string | undefined | null): GeokgukType | null {
  if (!name || typeof name !== 'string') {return null;}

  const normalized = name.toLowerCase().trim();
  if (!normalized) {return null;}

  // First pass: exact match (highest priority)
  for (const { patterns, type } of GEOKGUK_PATTERNS) {
    if (patterns.some(p => normalized === p)) {
      return type;
    }
  }

  // Second pass: pattern match (for names with extra characters like "XX격")
  for (const { patterns, type } of GEOKGUK_PATTERNS) {
    if (patterns.some(p => normalized.includes(p))) {
      return type;
    }
  }

  return null;
}

/**
 * Checks if a geokguk type is valid
 */
export function isValidGeokgukType(type: unknown): type is GeokgukType {
  if (typeof type !== 'string') {return false;}

  const validTypes: GeokgukType[] = [
    'jeonggwan', 'pyeongwan', 'jeongin', 'pyeongin',
    'siksin', 'sanggwan', 'jeongjae', 'pyeonjae',
    'geonrok', 'yangin', 'jonga', 'jongjae', 'jongsal', 'jonggang',
    'gokjik', 'yeomsang', 'gasaek', 'jonghyeok', 'yunha',
  ];

  return validTypes.includes(type as GeokgukType);
}

// ========== Geokguk Category Helpers ==========

/**
 * Get geokguk category
 */
export type GeokgukCategory =
  | 'official'  // 관성격 (정관, 편관)
  | 'seal'      // 인성격 (정인, 편인)
  | 'output'    // 식상격 (식신, 상관)
  | 'wealth'    // 재성격 (정재, 편재)
  | 'sibling'   // 비겁격 (건록, 양인)
  | 'follow'    // 종격 (종아, 종재, 종살, 종강, 종혁)
  | 'element';  // 오행격 (곡직, 염상, 가색, 윤하)

const GEOKGUK_CATEGORIES: Record<GeokgukType, GeokgukCategory> = {
  jeonggwan: 'official',
  pyeongwan: 'official',
  jeongin: 'seal',
  pyeongin: 'seal',
  siksin: 'output',
  sanggwan: 'output',
  jeongjae: 'wealth',
  pyeonjae: 'wealth',
  geonrok: 'sibling',
  yangin: 'sibling',
  jonga: 'follow',
  jongjae: 'follow',
  jongsal: 'follow',
  jonggang: 'follow',
  jonghyeok: 'follow',
  gokjik: 'element',
  yeomsang: 'element',
  gasaek: 'element',
  yunha: 'element',
};

/**
 * Get category for a geokguk type
 */
export function getGeokgukCategory(type: GeokgukType): GeokgukCategory {
  return GEOKGUK_CATEGORIES[type];
}

/**
 * Check if geokguk is a "following" type (종격)
 */
export function isFollowingGeokguk(type: GeokgukType): boolean {
  return GEOKGUK_CATEGORIES[type] === 'follow';
}

/**
 * Check if geokguk is an "element" type (오행격)
 */
export function isElementGeokguk(type: GeokgukType): boolean {
  return GEOKGUK_CATEGORIES[type] === 'element';
}

// ========== Geokguk Display Helpers ==========

/**
 * Geokguk display names (bilingual)
 */
export const GEOKGUK_NAMES: Record<GeokgukType, { ko: string; en: string }> = {
  jeonggwan: { ko: '정관격', en: 'Jeonggwan (Proper Official)' },
  pyeongwan: { ko: '편관격', en: 'Pyeongwan (Biased Official)' },
  jeongin: { ko: '정인격', en: 'Jeongin (Proper Seal)' },
  pyeongin: { ko: '편인격', en: 'Pyeongin (Biased Seal)' },
  siksin: { ko: '식신격', en: 'Siksin (Food God)' },
  sanggwan: { ko: '상관격', en: 'Sanggwan (Hurting Official)' },
  jeongjae: { ko: '정재격', en: 'Jeongjae (Proper Wealth)' },
  pyeonjae: { ko: '편재격', en: 'Pyeonjae (Biased Wealth)' },
  geonrok: { ko: '건록격', en: 'Geonrok (Established Prosperity)' },
  yangin: { ko: '양인격', en: 'Yangin (Blade)' },
  jonga: { ko: '종아격', en: 'Jonga (Following Child)' },
  jongjae: { ko: '종재격', en: 'Jongjae (Following Wealth)' },
  jongsal: { ko: '종살격', en: 'Jongsal (Following Killer)' },
  jonggang: { ko: '종강격', en: 'Jonggang (Following Strength)' },
  jonghyeok: { ko: '종혁격', en: 'Jonghyeok (Following Reform)' },
  gokjik: { ko: '곡직격', en: 'Gokjik (Curved and Straight)' },
  yeomsang: { ko: '염상격', en: 'Yeomsang (Flame Rising)' },
  gasaek: { ko: '가색격', en: 'Gasaek (Fine Color)' },
  yunha: { ko: '윤하격', en: 'Yunha (Flowing Down)' },
};

/**
 * Get display name for a geokguk type
 */
export function getGeokgukDisplayName(type: GeokgukType, isKo: boolean): string {
  return isKo ? GEOKGUK_NAMES[type].ko : GEOKGUK_NAMES[type].en;
}

// ========== Saju Data Extraction ==========

import type { SajuData } from '../types';

/**
 * Extract geokguk type from saju data
 */
export function extractGeokgukType(saju: SajuData | undefined): GeokgukType | null {
  if (!saju?.advancedAnalysis?.geokguk) {return null;}

  const geokguk = saju.advancedAnalysis.geokguk;
  const geokName = geokguk.name || geokguk.type;

  if (!geokName) {return null;}

  return getGeokgukType(geokName);
}
