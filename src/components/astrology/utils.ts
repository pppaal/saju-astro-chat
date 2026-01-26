// src/components/astrology/utils.ts
// Utility functions for ResultDisplay component

import type { LocaleKey } from './types';
import { SIGNS, PLANET_LABELS, ASPECT_LABELS, PLANET_IMAGES } from './constants';

/**
 * Normalize locale string to supported locale key
 */
export function normalizeLocale(l?: string): LocaleKey {
  const k = (l || 'en').split('-')[0] as LocaleKey;
  return (SIGNS)[k] ? k : 'en';
}

/**
 * Split formatted position into sign and degree parts
 */
export function splitSignAndDegree(text: string): { signPart: string; degreePart: string } {
  const s = String(text || '').trim();
  const m = s.match(/^(\S+)\s+(.*)$/);
  if (!m) {return { signPart: s, degreePart: '' };}
  return { signPart: m[1], degreePart: m[2] };
}

/**
 * Find index of a sign name across all locales
 */
export function findSignIndex(name: string): number {
  for (const list of Object.values(SIGNS)) {
    const idx = (list as readonly string[]).indexOf(name);
    if (idx >= 0) {return idx;}
  }
  const cleaned = name.replace(/[^\p{L}]/gu, '').toLowerCase();
  for (const list of Object.values(SIGNS)) {
    const idx = (list as readonly string[]).findIndex(
      (s) => s.replace(/[^\p{L}]/gu, '').toLowerCase() === cleaned
    );
    if (idx >= 0) {return idx;}
  }
  return -1;
}

/**
 * Localize a sign label to target locale
 */
export function localizeSignLabel(inputSign: string, target: LocaleKey): string {
  const idx = findSignIndex(inputSign);
  if (idx >= 0) {return SIGNS[target][idx] || SIGNS.en[idx];}
  const { signPart } = splitSignAndDegree(inputSign);
  const idx2 = findSignIndex(signPart);
  if (idx2 >= 0) {return SIGNS[target][idx2] || SIGNS.en[idx2];}
  return inputSign;
}

/**
 * Localize a planet label to target locale
 */
export function localizePlanetLabel(inputName: string, target: LocaleKey): string {
  const enKeys = Object.keys(PLANET_LABELS.en) as (keyof typeof PLANET_LABELS.en)[];
  if (enKeys.includes(inputName as keyof typeof PLANET_LABELS.en)) {
    return PLANET_LABELS[target][inputName as keyof typeof PLANET_LABELS.en] || String(inputName);
  }
  for (const labels of Object.values(PLANET_LABELS)) {
    for (const enKey of enKeys) {
      if (labels[enKey] === inputName) {
        return (PLANET_LABELS)[target][enKey] || (PLANET_LABELS).en[enKey];
      }
    }
  }
  return inputName;
}

/**
 * Localize an aspect type to target locale
 */
export function localizeAspectType(type: string, loc: LocaleKey): string {
  const key = String(type || '').toLowerCase() as keyof typeof ASPECT_LABELS.en;
  return (ASPECT_LABELS)[loc]?.[key] || type;
}

/**
 * Get planet image path from planet name
 */
export function getPlanetImage(planetName: string): string | null {
  // Direct match
  if (PLANET_IMAGES[planetName]) {return PLANET_IMAGES[planetName];}

  // Map localized names to English
  const nameMap: Record<string, string> = {
    '태양': 'Sun', '달': 'Moon', '수성': 'Mercury', '금성': 'Venus',
    '화성': 'Mars', '목성': 'Jupiter', '토성': 'Saturn', '천왕성': 'Uranus',
    '해왕성': 'Neptune', '명왕성': 'Pluto', '진월교점': 'True Node',
    '키론': 'Chiron', '행운점': 'Fortune',
    // Chinese
    '太阳': 'Sun', '月亮': 'Moon', '水星': 'Mercury', '金星': 'Venus',
    '火星': 'Mars', '木星': 'Jupiter', '土星': 'Saturn', '天王星': 'Uranus',
    '海王星': 'Neptune', '冥王星': 'Pluto',
  };

  const englishName = nameMap[planetName];
  if (englishName && PLANET_IMAGES[englishName]) {
    return PLANET_IMAGES[englishName];
  }

  return null;
}

/**
 * Get original English planet name from localized name
 */
export function getOriginalPlanetName(localizedName: string): string {
  for (const [_locale, labels] of Object.entries(PLANET_LABELS)) {
    for (const [key, value] of Object.entries(labels)) {
      if (value === localizedName) {return key;}
    }
  }
  return localizedName;
}

/**
 * Get CSS color classes for aspect types
 */
export function getAspectColor(type: string): string {
  const t = type.toLowerCase();
  if (t === 'conjunction') {return 'text-amber-300 bg-amber-500/10 border-amber-500/30';}
  if (t === 'trine') {return 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30';}
  if (t === 'sextile') {return 'text-blue-300 bg-blue-500/10 border-blue-500/30';}
  if (t === 'square') {return 'text-red-300 bg-red-500/10 border-red-500/30';}
  if (t === 'opposition') {return 'text-orange-300 bg-orange-500/10 border-orange-500/30';}
  return 'text-purple-300 bg-purple-500/10 border-purple-500/30';
}

/**
 * Log content access for analytics
 */
export async function logContentAccess(params: {
  service: string;
  contentType: string;
  locale: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await fetch('/api/content-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch {
    // Silently ignore logging failures
  }
}
