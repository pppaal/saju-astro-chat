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
import { iga } from '@/lib/i18n/koParticle'

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

  // character 는 이제 ilju-60.json 의 *완성 문장* (예: "양털 위 보석 — 우아하고
  // 까다로운 감식안. 당신은 …"). 그 첫 마디(첫 문장/대시 앞)만 뽑아 그 시기의
  // 결로 제시한다 — 옛 "의 기운으로 펼쳐져요" 래핑은 완성 문장과 안 맞아 폐기.
  const firstClause = (s: string): string =>
    s
      .split(/[.。!?]/)[0]
      .split(/\s+[—–-]\s+/)[0]
      .trim()

  if (lang === 'ko') {
    const flavor = firstClause(archetype.character)
    const strength = archetype.strengths[0] ?? ''
    const TAIL: Record<GanjiTransitLayer, string> = {
      daily: '결이 함께 흐르는 하루예요',
      monthly: '결이 함께 흐르는 달이에요',
      yearly: '결이 한 해를 물들여요',
      decadal: '결이 대운 내내 길게 흘러요',
    }
    const head = `${period} ‘${flavor}’ ${TAIL[layer]}.`
    return strength ? `${head} ${strength}` : head
  }

  let flavorEn = firstClause(archetype.character_en)
  flavorEn = flavorEn.replace(/^(The|A|An)\s+/, '')
  flavorEn = flavorEn.charAt(0).toLowerCase() + flavorEn.slice(1)
  const strengthEn = archetype.strengths_en[0] ?? ''
  const TAIL_EN: Record<GanjiTransitLayer, string> = {
    daily: 'runs through the day',
    monthly: 'runs through the month',
    yearly: 'colours the year',
    decadal: 'runs long through the decade',
  }
  const headEn = `${period} a ${flavorEn} grain ${TAIL_EN[layer]}.`
  return strengthEn ? `${headEn} ${strengthEn}` : headEn
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

/**
 * 십신이 운(運)으로 들어오는 기간의 에너지 — 흐름(flow) voice 한 줄.
 *
 * pillar-sibsin 신호(대운·세운·월운·일진)의 `korean` 표시에 사용. DAY_SIBSIN_LINE
 * 과 같은 의미축을 층(layer) 라벨로 감싸 일진 외 월·해·대운까지 커버한다 —
 * 캘린더 voice("그 사람이 어떤 사람" 아니라 "지금 무엇이 흐르는가").
 *
 * `korean` 필드는 KO 전용(EN 은 name + signalI18n 치환)이라 KO 한 줄만 반환.
 */
const SIBSIN_FLOW_PHRASE: Record<string, { ko: string; en: string }> = {
  비견: { ko: '내 힘과 동료·경쟁의 기운', en: 'your own strength and the pull of peers' },
  겁재: { ko: '경쟁심과 추진력', en: 'drive and a competitive edge' },
  식신: { ko: '표현과 아이디어의 기운', en: 'expression and flowing ideas' },
  상관: { ko: '재치와 자기 색을 드러내는 기운', en: 'wit and the urge to show your colour' },
  정재: { ko: '실속과 안정의 감각', en: 'a sense for substance and stability' },
  편재: { ko: '재물 감각과 기회 포착', en: 'a sharp eye for money and opportunity' },
  정관: {
    ko: '책임과 자리가 또렷해지는 기운',
    en: 'responsibility and standing coming into focus',
  },
  편관: { ko: '압박과 추진력', en: 'pressure and drive together' },
  정인: { ko: '배움과 도움이 들어오는 기운', en: 'learning and support coming in' },
  편인: { ko: '직관과 깊은 사유', en: 'intuition and deep thought' },
}

const SIBSIN_FLOW_TAIL: Record<GanjiTransitLayer, { ko: string; en: string }> = {
  daily: { ko: '흐르는 하루예요', en: 'runs through the day' },
  monthly: { ko: '흐르는 한 달이에요', en: 'runs through the month' },
  yearly: { ko: '흐르는 한 해예요', en: 'colours the year' },
  decadal: { ko: '길게 흐르는 대운이에요', en: 'runs long through this decade' },
}

export function sibsinFlowLine(
  sibsin: string | undefined,
  layer: GanjiTransitLayer,
  lang: Lang = 'ko'
): string {
  if (!sibsin) return ''
  const phrase = SIBSIN_FLOW_PHRASE[sibsin]
  const tail = SIBSIN_FLOW_TAIL[layer]
  if (!phrase || !tail) return ''
  if (lang === 'en') return `${phrase.en} ${tail.en}`
  return `${phrase.ko}${iga(phrase.ko)} ${tail.ko}`
}
