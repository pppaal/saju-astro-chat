/**
 * Canonical Western zodiac sign labels — single source of truth.
 *
 * The EN(PascalCase) → KO map was previously duplicated across the fusion
 * engine, counselor context, and compatibility formatters. Import from here
 * instead of re-declaring it.
 */

export type SignLang = 'ko' | 'en'

export const SIGN_KO: Record<string, string> = {
  Aries: '양자리',
  Taurus: '황소자리',
  Gemini: '쌍둥이자리',
  Cancer: '게자리',
  Leo: '사자자리',
  Virgo: '처녀자리',
  Libra: '천칭자리',
  Scorpio: '전갈자리',
  Sagittarius: '사수자리',
  Capricorn: '염소자리',
  Aquarius: '물병자리',
  Pisces: '물고기자리',
}

/**
 * Label a sign for display. Unknown signs pass through unchanged; an empty
 * sign falls back to "하늘"/"the sky" (matches the prior fusion behavior).
 */
export function signLabel(sign: string | undefined, lang: SignLang): string {
  if (!sign) return lang === 'ko' ? '하늘' : 'the sky'
  return lang === 'ko' ? (SIGN_KO[sign] ?? sign) : sign
}
