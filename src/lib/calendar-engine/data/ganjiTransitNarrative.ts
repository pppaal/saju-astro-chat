/**
 * 60갑자 transit narrative — reuse of natal 일주 archetype DB.
 *
 * Background: the pillar-sibsin signal's display line is keyed on 십신
 * (sibsin), which is derived from `(day master, transit stem)`. So if two
 * consecutive years/months land on the *same* sibsin (very common —
 * adjacent ganji often share polarity), the same flow line renders twice
 * in a row and the user sees identical narrative text behind two
 * different ganji prefixes ("甲辰 — 재성이 들어오는 해" then "乙巳 —
 * 재성이 들어오는 해").
 *
 * Fix: every ganji also gets its own per-ganji texture. We don't write 60
 * new narratives from scratch — `ILJU_ARCHETYPES` (자평진전 / 적천수 /
 * 명리정종 출처, ilju-60.json SSOT, 60/60 coverage) already describes the
 * *energy signature* of each ganji. The natal voice ("큰 들판의 거목")
 * becomes a transit grain appended to the flow line ("… 흐르는 한 해예요
 * — ‘큰 들판의 거목’의 결이 함께해요").
 *
 * `sibsinFlowLine` still supplies the sibsin-keyed flow voice (and drives
 * nothing about polarity/score — that lives in saju-pillar). `pillarFlowLine`
 * composes the generic sibsin flow with the *ganji-specific* texture so
 * same-sibsin adjacent ganji read differently. Wired in
 * `extractors/saju-pillar.ts` (`buildSignal`).
 */

import { ILJU_ARCHETYPES } from '@/lib/saju/iljuDictionary'
import { iga } from '@/lib/i18n/koParticle'

export type GanjiTransitLayer = 'daily' | 'monthly' | 'yearly' | 'decadal'
export type Lang = 'ko' | 'en'

/**
 * 십신이 운(運)으로 들어오는 기간의 에너지 — 흐름(flow) voice 한 줄.
 *
 * pillar-sibsin 신호(대운·세운·월운·일진)의 generic flow 절. 십신 의미축을
 * 층(layer) 라벨로 감싸 일진·월·해·대운까지 커버한다 — 캘린더 voice("그 사람이
 * 어떤 사람" 아니라 "지금 무엇이 흐르는가"). `pillarFlowLine` 이 이 절에 갑자
 * 결을 더해 같은 십신 인접 갑자를 구분한다.
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

function sibsinFlowLine(
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

// 한 갑자의 *결(grain)* 한 마디 — archetype 의 첫 마디(character 첫 절)만 뽑아
// 운(運) voice 로 짧게 제시. sibsinFlowLine 의 tail("흐르는 하루예요")과 겹치지
// 않도록 자체 tail 없이 명사구로만 끝맺는다. 미지 갑자면 "".
function ganjiGrainClause(ganji: string, lang: Lang): string {
  const archetype = ILJU_ARCHETYPES[ganji]
  if (!archetype) return ''
  const firstClause = (s: string): string =>
    s
      .split(/[.。!?]/)[0]
      .split(/\s+[—–-]\s+/)[0]
      .trim()
  if (lang === 'ko') {
    const flavor = firstClause(archetype.character)
    return flavor ? `‘${flavor}’의 결` : ''
  }
  let flavorEn = firstClause(archetype.character_en).replace(/^(The|A|An)\s+/, '')
  flavorEn = flavorEn.charAt(0).toLowerCase() + flavorEn.slice(1)
  return flavorEn ? `a ${flavorEn} grain` : ''
}

/**
 * pillar-sibsin 신호의 표시 한 줄. 일반 십신 flow(sibsinFlowLine)에 그 갑자의
 * 결(ganjiGrainClause)을 더해, 같은 십신이라도 인접 갑자가 다르게 읽히게 한다.
 *
 * - 갑자 결이 있으면: "<십신 flow> — <갑자 결>이 함께해요." (KO) /
 *   "<sibsin flow> — <ganji> grain woven through." (EN)
 * - 미지 갑자(결 "")면 sibsinFlowLine 만 그대로 반환 (additive·비파괴).
 * - sibsin 자체가 없으면 "" (호출 측이 폴백).
 *
 * 결정론적·ko/en 페어. polarity/score 와 무관(순수 narrative copy).
 */
export function pillarFlowLine(
  ganji: string,
  sibsin: string | undefined,
  layer: GanjiTransitLayer,
  lang: Lang = 'ko'
): string {
  const base = sibsinFlowLine(sibsin, layer, lang)
  if (!base) return ''
  const grain = ganjiGrainClause(ganji, lang)
  if (!grain) return base
  if (lang === 'en') return `${base} — ${grain} woven through`
  return `${base} — ${grain}이 함께해요`
}
