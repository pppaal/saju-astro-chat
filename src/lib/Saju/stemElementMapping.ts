// Centralized stem to element mapping
// Used across multiple components to convert heavenly stems to five elements

import type { FiveElement } from './types';

/**
 * Maps Chinese heavenly stems (天干) to Korean five elements (오행)
 * Supports both Chinese characters and Korean pronunciation
 */
export const STEM_TO_ELEMENT: Record<string, FiveElement> = {
  // Chinese characters
  "甲": "목", "乙": "목", "丙": "화", "丁": "화",
  "戊": "토", "己": "토", "庚": "금", "辛": "금",
  "壬": "수", "癸": "수",
  // Korean pronunciation
  "갑": "목", "을": "목", "병": "화", "정": "화",
  "무": "토", "기": "토", "경": "금", "신": "금",
  "임": "수", "계": "수",
};

/**
 * Maps Korean five elements to English names
 */
export const ELEMENT_KO_TO_EN: Record<string, string> = {
  "목": "Wood", "화": "Fire", "토": "Earth", "금": "Metal", "수": "Water"
};

/**
 * Maps English five elements to Korean names
 */
export const ELEMENT_EN_TO_KO: Record<string, string> = {
  "wood": "목", "fire": "화", "earth": "토", "metal": "금", "water": "수",
  "Wood": "목", "Fire": "화", "Earth": "토", "Metal": "금", "Water": "수"
};

/**
 * Get element from a heavenly stem (supports Chinese or Korean)
 */
export function getElementFromStem(stem: string): FiveElement | null {
  return STEM_TO_ELEMENT[stem] || null;
}

/**
 * Get English element name from Korean
 */
export function getElementEnglish(koreanElement: string): string {
  return ELEMENT_KO_TO_EN[koreanElement] || koreanElement;
}

/**
 * Get Korean element name from English
 */
export function getElementKorean(englishElement: string): string {
  return ELEMENT_EN_TO_KO[englishElement.toLowerCase()] || englishElement;
}

/**
 * Maps Chinese heavenly stems (天干) directly to English five elements
 * For use in contexts that need English element names
 */
export const STEM_TO_ELEMENT_EN: Record<string, string> = {
  "甲": "wood", "乙": "wood", "丙": "fire", "丁": "fire",
  "戊": "earth", "己": "earth", "庚": "metal", "辛": "metal",
  "壬": "water", "癸": "water",
  "갑": "wood", "을": "wood", "병": "fire", "정": "fire",
  "무": "earth", "기": "earth", "경": "metal", "신": "metal",
  "임": "water", "계": "water",
};

/**
 * Get English element from a heavenly stem (supports Chinese or Korean)
 */
export function getElementEnFromStem(stem: string): string | null {
  return STEM_TO_ELEMENT_EN[stem] || null;
}
