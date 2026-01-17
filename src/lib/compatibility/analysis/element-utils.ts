/**
 * @file Element utility functions for Saju analysis
 */

import type { FiveElement } from './types';

/**
 * Normalize FiveElement to English keys
 */
export function normalizeElement(el: FiveElement | string): string {
  const map: Record<string, string> = {
    '목': 'wood',
    '화': 'fire',
    '토': 'earth',
    '금': 'metal',
    '수': 'water',
  };
  return map[el] ?? (el as string);
}

/**
 * Get Korean name for element
 */
export function getElementKorean(element: string): string {
  const map: Record<string, string> = {
    wood: '목',
    fire: '화',
    earth: '토',
    metal: '금',
    water: '수',
  };
  return map[element] || element;
}

/**
 * Check if two elements are harmonious (generating cycle)
 */
export function areElementsHarmonious(e1: string, e2: string): boolean {
  const generating: Record<string, string> = {
    wood: 'fire',
    fire: 'earth',
    earth: 'metal',
    metal: 'water',
    water: 'wood',
  };
  const n1 = normalizeElement(e1);
  const n2 = normalizeElement(e2);
  return generating[n1] === n2 || generating[n2] === n1 || n1 === n2;
}

/**
 * Check if two elements are clashing (controlling cycle)
 */
export function areElementsClashing(e1: string, e2: string): boolean {
  const controlling: Record<string, string> = {
    wood: 'earth',
    earth: 'water',
    water: 'fire',
    fire: 'metal',
    metal: 'wood',
  };
  const n1 = normalizeElement(e1);
  const n2 = normalizeElement(e2);
  return controlling[n1] === n2 || controlling[n2] === n1;
}

/**
 * Get element relationship type
 */
export function getElementRelation(e1: string, e2: string): 'same' | 'generating' | 'controlling' | 'neutral' {
  const n1 = normalizeElement(e1);
  const n2 = normalizeElement(e2);

  if (n1 === n2) return 'same';

  const generating: Record<string, string> = {
    wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
  };

  const controlling: Record<string, string> = {
    wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood',
  };

  if (generating[n1] === n2 || generating[n2] === n1) return 'generating';
  if (controlling[n1] === n2 || controlling[n2] === n1) return 'controlling';

  return 'neutral';
}

/**
 * Calculate element strength score
 */
export function getElementStrength(profile: { elementBalance?: Record<string, number> }, element: string): number {
  const normalized = normalizeElement(element);
  return profile.elementBalance?.[normalized] || 0;
}
