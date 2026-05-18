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
