// Essential dignities (Lilly + modern rulers).
//
// Single source of truth for which sign each planet rules / is exalted /
// is in detriment / falls in. Both English and Korean sign names are
// included so callers can pass either form.
//
// Used by:
// - cross-rules astro adapter (essential dignity + mutual reception)
// - any direct consumer of the astrology library that needs dignity
//   without going through the rule engine

export type DignityStatus = 'domicile' | 'exaltation' | 'detriment' | 'fall' | 'peregrine'

export const DOMICILE: Record<string, string[]> = {
  Sun: ['Leo', '사자자리'],
  Moon: ['Cancer', '게자리'],
  Mercury: ['Gemini', '쌍둥이자리', 'Virgo', '처녀자리'],
  Venus: ['Taurus', '황소자리', 'Libra', '천칭자리'],
  Mars: ['Aries', '양자리', 'Scorpio', '전갈자리'],
  Jupiter: ['Sagittarius', '사수자리', 'Pisces', '물고기자리'],
  Saturn: ['Capricorn', '염소자리', 'Aquarius', '물병자리'],
  Uranus: ['Aquarius', '물병자리'],
  Neptune: ['Pisces', '물고기자리'],
  Pluto: ['Scorpio', '전갈자리'],
}

export const EXALTATION: Record<string, string[]> = {
  Sun: ['Aries', '양자리'],
  Moon: ['Taurus', '황소자리'],
  Mercury: ['Virgo', '처녀자리'],
  Venus: ['Pisces', '물고기자리'],
  Mars: ['Capricorn', '염소자리'],
  Jupiter: ['Cancer', '게자리'],
  Saturn: ['Libra', '천칭자리'],
}

export const DETRIMENT: Record<string, string[]> = {
  Sun: ['Aquarius', '물병자리'],
  Moon: ['Capricorn', '염소자리'],
  Mercury: ['Sagittarius', '사수자리', 'Pisces', '물고기자리'],
  Venus: ['Aries', '양자리', 'Scorpio', '전갈자리'],
  Mars: ['Libra', '천칭자리', 'Taurus', '황소자리'],
  Jupiter: ['Gemini', '쌍둥이자리', 'Virgo', '처녀자리'],
  Saturn: ['Cancer', '게자리', 'Leo', '사자자리'],
}

export const FALL: Record<string, string[]> = {
  Sun: ['Libra', '천칭자리'],
  Moon: ['Scorpio', '전갈자리'],
  Mercury: ['Pisces', '물고기자리'],
  Venus: ['Virgo', '처녀자리'],
  Mars: ['Cancer', '게자리'],
  Jupiter: ['Capricorn', '염소자리'],
  Saturn: ['Aries', '양자리'],
}

export function dignityOf(planet: string, sign: string): DignityStatus {
  if (DOMICILE[planet]?.includes(sign)) return 'domicile'
  if (EXALTATION[planet]?.includes(sign)) return 'exaltation'
  if (DETRIMENT[planet]?.includes(sign)) return 'detriment'
  if (FALL[planet]?.includes(sign)) return 'fall'
  return 'peregrine'
}
