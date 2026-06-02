/**
 * Decide which language a counselor should reply in, based on the language the
 * user actually typed — NOT the browser Accept-Language header or a UI i18n
 * flag, which often disagree with what the user is writing right now (e.g. a
 * Korean browser locale while the user switched the app to English and asks an
 * English question).
 *
 * Rule:
 *  - Any Hangul in the message → Korean. Korean users routinely sprinkle
 *    English loanwords/terms ("내 Sun sign 뭐야?"), so a single English word
 *    shouldn't flip them to English.
 *  - Otherwise, any Latin letter → English.
 *  - No script signal at all (numbers / emoji / punctuation only) → null, so
 *    the caller falls back to the requested locale.
 */
const HANGUL_RE = /[가-힣ᄀ-ᇿ㄰-㆏ꥠ-꥿]/
const LATIN_RE = /[A-Za-z]/

export function detectMessageLang(text: string | null | undefined): 'ko' | 'en' | null {
  if (!text) return null
  if (HANGUL_RE.test(text)) return 'ko'
  if (LATIN_RE.test(text)) return 'en'
  return null
}
