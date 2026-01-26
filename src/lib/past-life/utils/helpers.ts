/**
 * Helper functions for past-life analysis
 * Basic utility functions for language selection and type checking
 */

import type { BilingualText, GeokgukType, HeavenlyStem, HouseNumber } from '../data/types';
import { GEOKGUK_NAME_MAPPING, VALID_HEAVENLY_STEMS } from '../data/constants';

/**
 * Select the appropriate language from bilingual text
 */
export function selectLang(isKo: boolean, text: BilingualText): string {
  return isKo ? text.ko : text.en;
}

/**
 * Select the appropriate language from an array of bilingual items
 */
export function selectLangFromArray<T extends { ko: string; en: string }>(
  isKo: boolean,
  items: readonly T[]
): string[] {
  return items.map(item => isKo ? item.ko : item.en);
}

/**
 * Check if a character is a valid heavenly stem
 */
export function isValidHeavenlyStem(char: string): char is HeavenlyStem {
  return (VALID_HEAVENLY_STEMS as readonly string[]).includes(char);
}

/**
 * Get the GeokgukType from a geokguk name string
 */
export function getGeokgukType(geokName: string | undefined): GeokgukType | null {
  if (!geokName) {
    return null;
  }
  return GEOKGUK_NAME_MAPPING[geokName] || null;
}
