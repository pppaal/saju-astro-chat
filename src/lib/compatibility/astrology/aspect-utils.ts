/**
 * @file Aspect calculation utility functions
 */

import type { ExtendedAspectType } from './types';

/**
 * Determine aspect type from angle
 */
export function determineAspectType(angle: number): { type: ExtendedAspectType | null; orb: number } {
  const aspectDefinitions: { type: ExtendedAspectType; angle: number; maxOrb: number }[] = [
    { type: 'conjunction', angle: 0, maxOrb: 10 },
    { type: 'semisextile', angle: 30, maxOrb: 2 },
    { type: 'semisquare', angle: 45, maxOrb: 2 },
    { type: 'sextile', angle: 60, maxOrb: 6 },
    { type: 'square', angle: 90, maxOrb: 8 },
    { type: 'trine', angle: 120, maxOrb: 8 },
    { type: 'sesquiquadrate', angle: 135, maxOrb: 2 },
    { type: 'quincunx', angle: 150, maxOrb: 3 },
    { type: 'opposition', angle: 180, maxOrb: 10 },
  ];

  for (const def of aspectDefinitions) {
    const orb = Math.abs(angle - def.angle);
    if (orb <= def.maxOrb) {
      return { type: def.type, orb };
    }
  }

  return { type: null, orb: 0 };
}

/**
 * Check if aspect type is harmonious
 */
export function isAspectHarmonious(type: ExtendedAspectType): boolean {
  const harmonious: ExtendedAspectType[] = ['conjunction', 'sextile', 'trine', 'semisextile'];
  return harmonious.includes(type);
}

/**
 * Calculate aspect strength based on orb
 */
export function calculateAspectStrength(orb: number, maxOrb: number): number {
  return Math.max(0, Math.round(100 * (1 - orb / maxOrb)));
}

/**
 * Get aspect interpretation for planet pair
 */
export function getAspectInterpretation(
  planet1: string,
  planet2: string,
  type: ExtendedAspectType,
  language: 'ko' | 'en' = 'ko'
): string {
  const interpretations: Record<string, Record<ExtendedAspectType, { ko: string; en: string }>> = {
    'Sun-Moon': {
      conjunction: {
        ko: '태양과 달이 합하여 의식과 감정이 하나로 융합됩니다',
        en: 'Sun and Moon conjunct, merging consciousness and emotions'
      },
      sextile: {
        ko: '태양과 달이 섹스타일로 조화로운 에너지 교류가 있습니다',
        en: 'Sun-Moon sextile creates harmonious energy exchange'
      },
      square: {
        ko: '태양과 달의 스퀘어로 내면의 긴장이 있으나 성장을 촉진합니다',
        en: 'Sun-Moon square creates inner tension but promotes growth'
      },
      trine: {
        ko: '태양과 달의 트라인으로 자연스러운 조화가 있습니다',
        en: 'Sun-Moon trine brings natural harmony'
      },
      opposition: {
        ko: '태양과 달의 대립으로 균형을 찾는 과정이 필요합니다',
        en: 'Sun-Moon opposition requires finding balance'
      },
      quincunx: {
        ko: '태양과 달의 인콘점트로 조정이 필요합니다',
        en: 'Sun-Moon quincunx requires adjustment'
      },
      semisextile: {
        ko: '태양과 달의 세미섹스타일로 미묘한 연결이 있습니다',
        en: 'Sun-Moon semi-sextile creates subtle connection'
      },
      semisquare: {
        ko: '태양과 달의 세미스퀘어로 작은 긴장이 있습니다',
        en: 'Sun-Moon semi-square creates minor tension'
      },
      sesquiquadrate: {
        ko: '태양과 달의 세스퀴스퀘어로 지속적인 조정이 필요합니다',
        en: 'Sun-Moon sesquiquadrate requires ongoing adjustment'
      },
    },
    'Venus-Mars': {
      conjunction: {
        ko: '금성과 화성이 합하여 강한 로맨틱 케미스트리가 있습니다',
        en: 'Venus-Mars conjunction creates strong romantic chemistry'
      },
      sextile: {
        ko: '금성-화성 섹스타일로 조화로운 매력이 흐릅니다',
        en: 'Venus-Mars sextile brings harmonious attraction'
      },
      square: {
        ko: '금성-화성 스퀘어로 열정적이지만 때때로 충돌합니다',
        en: 'Venus-Mars square is passionate but can clash'
      },
      trine: {
        ko: '금성-화성 트라인으로 자연스러운 로맨스가 흐릅니다',
        en: 'Venus-Mars trine brings natural romance'
      },
      opposition: {
        ko: '금성-화성 대립으로 끌림과 반발이 공존합니다',
        en: 'Venus-Mars opposition creates attraction and repulsion'
      },
      quincunx: {
        ko: '금성-화성 인콘점트로 욕구 조정이 필요합니다',
        en: 'Venus-Mars quincunx requires desire adjustment'
      },
      semisextile: {
        ko: '금성-화성 세미섹스타일로 미묘한 끌림이 있습니다',
        en: 'Venus-Mars semi-sextile creates subtle attraction'
      },
      semisquare: {
        ko: '금성-화성 세미스퀘어로 작은 마찰이 있습니다',
        en: 'Venus-Mars semi-square creates minor friction'
      },
      sesquiquadrate: {
        ko: '금성-화성 세스퀴스퀘어로 지속적인 긴장이 있습니다',
        en: 'Venus-Mars sesquiquadrate creates ongoing tension'
      },
    },
  };

  const key = `${planet1}-${planet2}`;
  const reverseKey = `${planet2}-${planet1}`;
  const interp = interpretations[key]?.[type] || interpretations[reverseKey]?.[type];

  if (interp) {
    return interp[language];
  }

  // Default interpretation
  return language === 'ko'
    ? `${planet1}과 ${planet2}의 ${type} 애스펙트`
    : `${planet1}-${planet2} ${type} aspect`;
}

/**
 * Detect aspect patterns (Grand Trine, T-Square, etc.)
 */
export function detectAspectPattern(aspects: { type: ExtendedAspectType; planet1: string; planet2: string }[]): string | null {
  // Check for Grand Trine (3 trines forming triangle)
  const trines = aspects.filter(a => a.type === 'trine');
  if (trines.length >= 3) {
    const planets = new Set<string>();
    trines.forEach(t => {
      planets.add(t.planet1);
      planets.add(t.planet2);
    });
    if (planets.size === 3) {
      return 'Grand Trine';
    }
  }

  // Check for T-Square (2 squares and 1 opposition)
  const squares = aspects.filter(a => a.type === 'square');
  const oppositions = aspects.filter(a => a.type === 'opposition');
  if (squares.length >= 2 && oppositions.length >= 1) {
    return 'T-Square';
  }

  // Check for Grand Cross (4 squares and 2 oppositions)
  if (squares.length >= 4 && oppositions.length >= 2) {
    return 'Grand Cross';
  }

  // Check for Yod (2 quincunxes and 1 sextile)
  const quincunxes = aspects.filter(a => a.type === 'quincunx');
  const sextiles = aspects.filter(a => a.type === 'sextile');
  if (quincunxes.length >= 2 && sextiles.length >= 1) {
    return 'Yod (Finger of God)';
  }

  return null;
}
