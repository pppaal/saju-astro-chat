// Astrology/Saju glyphs that occasionally leak into a counselor answer when
// the LLM ignores the prompt's "spell the meaning out in plain words" rule.
// On screen they render as tofu boxes (□) or unreadable symbols (☌ ♂ ℞), so
// this is a presentation-layer safety net: swap each glyph for its plain-
// language meaning, in the answer's own language. Applied to assistant text
// only — a symbol the *user* typed is left as-is (debug/test input).
//
// This is intentionally a dumb 1:1 substitution. It can produce a clumsy
// particle now and then ("태양와"); that is still vastly better than a broken
// glyph, and the real fix lives in the system prompt. Kept pure + exported so
// the contract is unit-tested.

type SymbolEntry = [pattern: RegExp, ko: string, en: string]

// Order matters: aspect glyphs first (the original set), then bodies, signs,
// and modifiers. The lookalike tension glyphs (□ ☐ ⚺) collapse to one meaning.
const ASTRO_SYMBOL_MAP: SymbolEntry[] = [
  // Aspects
  [/□/g, '긴장 결', 'tension aspect'],
  [/☐/g, '긴장 결', 'tension aspect'],
  [/⚺/g, '긴장 결', 'tension aspect'],
  [/☌/g, '결합', 'conjunction'],
  [/⚹/g, '협력', 'sextile'],
  [/△/g, '조화', 'trine'],
  [/☍/g, '대립', 'opposition'],
  [/⚻/g, '미세 조정', 'quincunx'],
  [/⚼/g, '반육각', 'semisextile'],
  // Planets / luminaries / nodes
  [/☉/g, '태양', 'the Sun'],
  [/☽/g, '달', 'the Moon'],
  [/☿/g, '수성', 'Mercury'],
  [/♀/g, '금성', 'Venus'],
  [/♂/g, '화성', 'Mars'],
  [/♃/g, '목성', 'Jupiter'],
  [/♄/g, '토성', 'Saturn'],
  [/♅/g, '천왕성', 'Uranus'],
  [/♆/g, '해왕성', 'Neptune'],
  [/♇/g, '명왕성', 'Pluto'],
  [/☊/g, '북교점', 'North Node'],
  [/☋/g, '남교점', 'South Node'],
  // Zodiac signs ("자리" reads naturally in Korean)
  [/♈/g, '양자리', 'Aries'],
  [/♉/g, '황소자리', 'Taurus'],
  [/♊/g, '쌍둥이자리', 'Gemini'],
  [/♋/g, '게자리', 'Cancer'],
  [/♌/g, '사자자리', 'Leo'],
  [/♍/g, '처녀자리', 'Virgo'],
  [/♎/g, '천칭자리', 'Libra'],
  [/♏/g, '전갈자리', 'Scorpio'],
  [/♐/g, '사수자리', 'Sagittarius'],
  [/♑/g, '염소자리', 'Capricorn'],
  [/♒/g, '물병자리', 'Aquarius'],
  [/♓/g, '물고기자리', 'Pisces'],
  // Retrograde
  [/℞/g, '역행', 'retrograde'],
]

// Pick the answer's language from its own text rather than a UI flag: the
// counselor is single-language per message, so this is reliable and keeps the
// helper independent of theme/locale plumbing. Default Korean (the product's
// primary language) when neither script is present.
function detectLang(text: string): 'ko' | 'en' {
  if (/[가-힣]/.test(text)) return 'ko'
  if (/[A-Za-z]/.test(text)) return 'en'
  return 'ko'
}

// Degree/arcminute/arcsecond notation. The prime (′) and double-prime (″)
// glyphs render inconsistently across fonts. Korean: spell out 도/분/초.
// English: normalize the primes to plain ASCII ' and " so they always render.
function naturalizeDegrees(text: string, lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    return text.replace(/(\d+)°(?:\s*(\d+)′)?(?:\s*(\d+)″)?/g, (_m, d, m, s) => {
      let out = `${d}도`
      if (m) out += ` ${m}분`
      if (s) out += ` ${s}초`
      return out
    })
  }
  return text.replace(/(\d+)°(?:\s*(\d+)′)?(?:\s*(\d+)″)?/g, (_m, d, m, s) => {
    let out = `${d}°`
    if (m) out += `${m}'`
    if (s) out += `${s}"`
    return out
  })
}

/**
 * Replace leaked astrology/Saju glyphs with plain-language words in the text's
 * own language. Safe to run on every assistant message; a no-op when no glyphs
 * are present.
 */
export function naturalizeAstroSymbols(text: string): string {
  const lang = detectLang(text)
  let result = text
  for (const [pattern, ko, en] of ASTRO_SYMBOL_MAP) {
    result = result.replace(pattern, lang === 'en' ? en : ko)
  }
  result = naturalizeDegrees(result, lang)
  return result
}
