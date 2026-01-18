/**
 * Element Utility Functions for Saju Analysis
 * Shared helper functions for element-based calculations
 */

import { FiveElement } from '../../Saju/types';

/**
 * Normalize FiveElement to English keys
 */
export const normalizeElement = (el: FiveElement | string): string => {
  const map: Record<string, string> = {
    '목': 'wood',
    '화': 'fire',
    '토': 'earth',
    '금': 'metal',
    '수': 'water',
  };
  return map[el] ?? (el as string);
};

/**
 * Get Korean name for element
 */
export const getElementKorean = (element: string): string => {
  const map: Record<string, string> = {
    wood: '목',
    fire: '화',
    earth: '토',
    metal: '금',
    water: '수',
  };
  return map[element] || element;
};

/**
 * Check if two elements are harmonious (generating relationship)
 */
export const areElementsHarmonious = (el1: string, el2: string): boolean => {
  const harmonious: Record<string, string[]> = {
    wood: ['water', 'fire'],
    fire: ['wood', 'earth'],
    earth: ['fire', 'metal'],
    metal: ['earth', 'water'],
    water: ['metal', 'wood'],
  };
  return harmonious[el1]?.includes(el2) ?? false;
};

/**
 * Check if two elements are clashing (controlling relationship)
 */
export const areElementsClashing = (el1: string, el2: string): boolean => {
  const clashing: Record<string, string> = {
    wood: 'metal',
    fire: 'water',
    earth: 'wood',
    metal: 'fire',
    water: 'earth',
  };
  return clashing[el1] === el2 || clashing[el2] === el1;
};

/**
 * Map heavenly stems to elements
 */
export const stemElements: Record<string, string> = {
  '甲': 'wood', '乙': 'wood',
  '丙': 'fire', '丁': 'fire',
  '戊': 'earth', '己': 'earth',
  '庚': 'metal', '辛': 'metal',
  '壬': 'water', '癸': 'water',
};

/**
 * Get element from stem
 */
export const getElementFromStem = (stem: string): string => {
  return stemElements[stem] || 'earth';
};

/**
 * Get element strength from profile
 */
export const getElementStrength = (
  elements: Record<string, number>,
  element: string
): number => {
  return elements[element as keyof typeof elements] || 0;
};
