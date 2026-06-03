// Single source for self-harm / crisis detection + the crisis response message
// (suicide-prevention hotlines). Shared by the tarot interpreter and the
// destiny/compatibility counselors so a distressed user ALWAYS gets the
// hotline — not a dry "restricted topic" refusal, and not (worse) a normal
// reading. Bilingual (KO + EN): the old counselor guard only matched English
// self-harm phrases via textGuards, so Korean distress slipped through.

export const SELF_HARM_KEYWORDS = [
  // Korean
  '자살',
  '죽고 싶',
  '죽을래',
  '살기 싫',
  '끝내고 싶',
  '죽어버릴',
  '자해',
  '목숨',
  '생을 마감',
  '세상 떠나',
  '사라지고 싶',
  // English
  'suicide',
  'kill myself',
  'end my life',
  'want to die',
  'harm myself',
  'self-harm',
]

/** True if the text shows self-harm / suicidal intent (KO or EN). */
export function isSelfHarm(text: string): boolean {
  const n = (text || '').toLowerCase()
  return SELF_HARM_KEYWORDS.some((kw) => n.includes(kw.toLowerCase()))
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
