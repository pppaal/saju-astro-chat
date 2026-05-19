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
  daily: { ko: '오늘은', en: 'today' },
  monthly: { ko: '이번 달은', en: 'this month' },
  yearly: { ko: '이번 해는', en: 'this year' },
  decadal: { ko: '이 대운은', en: 'this decade' },
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
    // 자연 어순: "이번 달은 [character] 의 에너지가 흐르는 시기예요."
    // character 가 이미 한국어 명사구 ("창의적 리더형, 지혜와 결단") 라
    // 조사 처리를 깔끔하게 하기 위해 끝 마침표만 떼고 그대로 임베드.
    // 어미는 layer 별로 분리해 wolun/sewoon 룰 body 의 "시기예요" 와 cadence
    // 중복되지 않게 함. (e.g. wolun rule body 가 "...강해지는 시기예요." 로
    // 닫고 곧장 monthGanjiText 가 "...시기예요. 강점:..." 로 또 닫으면 시기예요
    // 두 번 — Patch 1.)
    const characterTrim = archetype.character.replace(/[.,。、]\s*$/u, '')
    const strengths = archetype.strengths.join('·')
    const TAIL: Record<GanjiTransitLayer, string> = {
      daily: '에너지가 흐르는 하루예요',
      monthly: '결이 함께 흘러요',
      yearly: '흐름을 띠어요',
      decadal: '결로 길게 펼쳐져요',
    }
    return `${period} ${characterTrim}의 ${TAIL[layer]}. 강점: ${strengths}.`
  }

  const characterEn = archetype.character
  const strengths = archetype.strengths.join(', ')
  return `${period} carries the signature of ${characterEn}. Strengths: ${strengths}.`
}
