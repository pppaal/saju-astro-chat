// Single source for self-harm / crisis detection + the crisis response message
// (suicide-prevention hotlines). Shared by the tarot interpreter and the
// destiny/compatibility counselors so a distressed user ALWAYS gets the
// hotline — not a dry "restricted topic" refusal, and not (worse) a normal
// reading. Bilingual (KO + EN): the old counselor guard only matched English
// self-harm phrases via textGuards, so Korean distress slipped through.

export const SELF_HARM_KEYWORDS = [
  // Korean
  '자살',
  '죽고 싶', // also matches no-space `죽고싶` via whitespace-stripped matching
  '죽을래',
  '살기 싫',
  '끝내고 싶',
  '죽어버릴',
  '자해',
  '뒤지고 싶',
  '없어지고 싶',
  '사라지고 싶',
  '목숨을 끊',
  '목숨 끊',
  '생을 마감',
  '세상 떠나',
  // English
  'suicide',
  'kill myself',
  'kill me',
  'end my life',
  'end it all',
  'want to die',
  "don't want to live",
  'dont want to live',
  'harm myself',
  'self-harm',
  'kms',
]

// Collapse all whitespace so spaced/no-space Korean phrasings collapse to the
// same string. Korean is written without word spaces, so users freely type
// `죽고싶어` or `죽고 싶어` — both must match the `죽고 싶` stem. Doing this for
// English too would fuse multi-word phrases (`want to die`), but the English
// keywords below are matched as substrings of the despaced text, which is fine
// for them since they contain no internal optional spacing we care about; the
// space variants are listed explicitly where it matters.
function despace(s: string): string {
  return s.replace(/\s+/g, '')
}

/** True if the text shows self-harm / suicidal intent (KO or EN). */
export function isSelfHarm(text: string): boolean {
  const n = (text || '').toLowerCase()
  const despaced = despace(n)
  return SELF_HARM_KEYWORDS.some((kw) => {
    const k = kw.toLowerCase()
    // Match either with original spacing or with all whitespace removed, so
    // `죽고싶어`/`죽고 싶어` and `kill me`/`killme` both trip the same keyword.
    return n.includes(k) || despaced.includes(despace(k))
  })
}

/** Plain-text crisis reply with suicide-prevention hotlines (KR 1393 / US 988). */
export function crisisMessage(locale: string): string {
  const ko = String(locale || 'en')
    .toLowerCase()
    .startsWith('ko')
  return ko
    ? '많이 힘드신 것 같아요. 지금 마음이 무겁다면 운세 풀이보다 먼저 1393(자살예방상담전화, 24시간 무료)으로 연락해 주세요. 혼자 견디지 않으셔도 돼요 — 지금 한 통의 전화가 큰 도움이 됩니다.'
    : "It sounds like you're carrying a lot right now. If things feel heavy, please reach out before anything else — call or text 988 (US) or 1393 (KR), free and available 24/7. You don't have to go through this alone; one call right now can really help."
}
