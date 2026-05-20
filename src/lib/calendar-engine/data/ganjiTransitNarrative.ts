/**
 * 60갑자 transit narrative — reuse of natal 일주 archetype DB.
 *
 * Background: rules in `interpretation/rules.ts` match on 십신 (sibsin),
 * which is derived from `(day master, transit stem)`. So if two
 * consecutive years/months land on the *same* sibsin (very common —
 * adjacent ganji often share polarity), the same rule fires twice in a
 * row and the user sees identical narrative text behind two different
 * ganji prefixes ("甲辰 — 재성이 들어오는 해" then "乙巳 — 재성이
 * 들어오는 해").
 *
 * Fix: every ganji has its own per-ganji body too. We don't need to
 * write 60 new narratives from scratch — `ILJU_ARCHETYPES` (자평진전 /
 * 적천수 / 명리정종 출처) already describes the *energy signature* of
 * each ganji. The natal voice ("창의적 리더형") becomes the transit
 * voice ("창의적 결단의 에너지가 들어오는 흐름") with a thin
 * formatting wrapper, layer-aware ("이번 달" vs "이번 해").
 *
 * The sibsin-keyed rule body still drives polarity and score; this
 * helper supplies the *ganji-specific* texture appended (or
 * substituted) via `{yearGanjiText}` / `{monthGanjiText}` template
 * variables.
 */

import { ILJU_ARCHETYPES } from '@/lib/saju/iljuDictionary'

export type GanjiTransitLayer = 'daily' | 'monthly' | 'yearly' | 'decadal'
export type Lang = 'ko' | 'en'

// 한국어 조사: '달'/'대운'/'오늘' 은 종성 있음 → '은', '해' 는 종성 없음 → '는'.
// 라벨에 조사까지 묶어 자연어 처리.
const PERIOD_LABEL: Record<GanjiTransitLayer, Record<Lang, string>> = {
  daily: { ko: '오늘은', en: 'Today' },
  monthly: { ko: '이번 달은', en: 'This month' },
  yearly: { ko: '이번 해는', en: 'This year' },
  decadal: { ko: '이 대운은', en: 'This decade' },
}

/**
 * Compose a one-sentence transit-flavored body from a ganji archetype.
 *
 * Returns an empty string when the ganji is unknown — callers should
 * treat the result as additive (appended to the sibsin-based rule
 * narrative) rather than load-bearing.
 */
export function getGanjiTransitNarrative(
  ganji: string,
  layer: GanjiTransitLayer,
  lang: Lang = 'ko'
): string {
  const archetype = ILJU_ARCHETYPES[ganji]
  if (!archetype) return ''
  const period = PERIOD_LABEL[layer][lang]

  if (lang === 'ko') {
    // character 는 두 형태가 섞여 있음:
    //  (a) 명사 끝 — "창의적 리더형, 지혜와 결단"
    //  (b) 관형형(형용사) 끝 — "재치 있고 두뇌가 빠른 차분한 물 같은"
    // TAIL 이 "기운"(명사)으로 시작하게 통일하고, character 가 명사로 끝나면
    // "의 기운", 관형형으로 끝나면 (의 없이) " 기운" 으로 이어 자연스럽게 함.
    // ("부드러운의 기운" 댕글링 / "결의 결" 이중 결 둘 다 회피.)
    const characterTrim = archetype.character.replace(/[.,。、]\s*$/u, '').trim()
    const attributive = /(같은|운|은|는|ㄴ|한|던|린|난|른|큰|긴)$/.test(characterTrim)
    const link = attributive ? '' : '의'
    const strengths = archetype.strengths.join('·')
    const TAIL: Record<GanjiTransitLayer, string> = {
      daily: '기운이 흐르는 하루예요',
      monthly: '기운이 함께 흘러요',
      yearly: '기운을 띠어요',
      decadal: '기운으로 길게 펼쳐져요',
    }
    return `${period} ${characterTrim}${link} ${TAIL[layer]}. 강점: ${strengths}.`
  }

  // ILJU_ARCHETYPES 는 character_en / strengths_en 영어 필드를 이미 보유
  // 했으나, 이전엔 한국어 필드(character / strengths) 가 그대로 박혀
  // "this month carries the signature of 창의적 리더형, 지혜와 결단" 같이
  // 한·영 혼합으로 leak 됐음. _en 필드를 사용해 정상 영문 narrative 생성.
  // archetype.character_en 이 "The broad..." 처럼 article 로 시작하거나
  // 첫 글자가 대문자면 wrapper 의 "the grain of The broad..." 처럼 대소문자
  // 충돌 + double article. 첫 article 떼고 첫 글자 lowercase.
  let characterEn = archetype.character_en.replace(/[.!?]\s*$/u, '')
  characterEn = characterEn.replace(/^(The|A|An)\s+/, '')
  characterEn = characterEn.charAt(0).toLowerCase() + characterEn.slice(1)
  const strengthsEn = archetype.strengths_en.join(', ')
  const TAIL_EN: Record<GanjiTransitLayer, string> = {
    daily: 'carries the signature of',
    monthly: 'moves with the grain of',
    yearly: 'wears the colour of',
    decadal: 'unfolds along the long arc of',
  }
  return `${period} ${TAIL_EN[layer]} ${characterEn}. Strengths: ${strengthsEn}.`
}

// 일진(그 날 60갑자)의 천간이 본명 일간과 만나 만드는 십신 관계를 자연어
// 한 줄로. 60갑자 archetype 은 그 날 모두에게 같지만, 이 줄은 *본명 일간
// 기준* 이라 사람마다 달라짐 — 일진 narrative 의 개인화 축.
// 십신 raw 용어는 노출하지 않고 의미만 풀어씀.
const DAY_SIBSIN_LINE: Record<string, { ko: string; en: string }> = {
  비견: {
    ko: '당신에게는 내 힘과 동료의 기운이 강해지는 하루라, 주도적으로 움직이기 좋아요.',
    en: 'For you it is a day when your own strength and your allies run strong — a good day to take the lead.',
  },
  겁재: {
    ko: '당신에게는 경쟁심과 추진력이 올라오는 하루라, 함께 겨루거나 나누는 일이 잘 풀려요.',
    en: 'For you it is a day when drive and a competitive edge rise — sharing or competing alongside others goes well.',
  },
  식신: {
    ko: '당신에게는 표현과 아이디어가 잘 나오는 하루라, 만들고 풀어내는 일에 좋아요.',
    en: 'For you it is a day when expression and ideas flow easily — good for making and putting things out.',
  },
  상관: {
    ko: '당신에게는 재치와 표현력이 살아나는 하루라, 본인 색을 드러내는 일이 잘 통해요.',
    en: 'For you it is a day when wit and expression come alive — showing your own colour lands well.',
  },
  정재: {
    ko: '당신에게는 실속과 안정 감각이 살아나는 하루라, 차곡차곡 챙기는 일에 좋아요.',
    en: 'For you it is a day when a sense for substance and stability comes alive — good for steady, careful gains.',
  },
  편재: {
    ko: '당신에게는 재물 감각과 기회 포착이 빨라지는 하루라, 흐름을 타기 좋아요.',
    en: 'For you it is a day when your sense for money and opportunity sharpens — a good day to ride the flow.',
  },
  정관: {
    ko: '당신에게는 책임과 자리가 또렷해지는 하루라, 공적인 일·약속에 좋아요.',
    en: 'For you it is a day when responsibility and standing come into focus — good for official matters and commitments.',
  },
  편관: {
    ko: '당신에게는 압박과 추진력이 동시에 커지는 하루라, 정면 돌파에 어울려요.',
    en: 'For you it is a day when pressure and drive both rise — suited to meeting things head-on.',
  },
  정인: {
    ko: '당신에게는 배움과 도움이 들어오는 하루라, 공부·정리·기대기에 좋아요.',
    en: 'For you it is a day when learning and support come in — good for study, tidying up, and leaning on others.',
  },
  편인: {
    ko: '당신에게는 직관과 깊은 사유가 살아나는 하루라, 혼자 파고드는 일에 좋아요.',
    en: 'For you it is a day when intuition and deep thought come alive — good for going deep on your own.',
  },
}

/**
 * 일진 천간 × 본명 일간 = 십신 한 줄 (개인화). sibsin 이 없거나 미지면 "".
 * 호출 측에서 getGanjiTransitNarrative('daily') 뒤에 이어붙여 사용.
 */
export function dailyIljinSibsinLine(sibsin: string | undefined, lang: Lang = 'ko'): string {
  if (!sibsin) return ''
  const entry = DAY_SIBSIN_LINE[sibsin]
  if (!entry) return ''
  return entry[lang]
}
