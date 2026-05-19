// src/lib/fusion/lifeReport/pools/iljuPool.ts
//
// 60갑자 일주 (day pillar) variation pools.
//
// Source: src/lib/saju/iljuDictionary.ts — orthodox 60-갑자 archetypes
// (character / strengths / weaknesses / career / relationship).
//
// Rather than duplicating all 60 entries, this pool wraps the existing
// dictionary and exposes a small per-domain variation pattern (3
// natural-language framings) so the LifeReport can pick a stable but
// varied line per ilju. The phrasings are deliberately generic enough
// to combine cleanly with character / strengths / career fields.

import { ILJU_ARCHETYPES, type IljuArchetype } from '@/lib/saju/iljuDictionary'

export type IljuDomain = 'career' | 'love' | 'headline'

export function getIljuArchetype(ilju: string | undefined): IljuArchetype | undefined {
  if (!ilju) return undefined
  return ILJU_ARCHETYPES[ilju]
}

/**
 * Variation phrasings that wrap an ilju's strongest signal. Each entry
 * is a `(archetype) => string` so we can inject the right substring
 * from the dictionary.
 *
 * 3 variations per domain × 3 domains = 9 framings; combined with 60
 * iljus yields 540 distinct sentences without us hand-writing each one.
 */
const CAREER_FRAMINGS: Array<(a: IljuArchetype) => string> = [
  (a) => `타고난 결은 ${a.character}이라, ${formatList(a.career)} 분야에서 자질이 가장 잘 살아요`,
  (a) => `${a.character}의 결을 가진 사람이라, ${formatList(a.career)} 쪽 일이 자연스럽게 풀려요`,
  (a) => `핵심 자질이 ${formatList(a.strengths)}이라, ${formatList(a.career)} 분야가 본인다움을 키워줘요`,
]

const LOVE_FRAMINGS: Array<(a: IljuArchetype) => string> = [
  (a) => `관계의 결은 ${a.relationship}한 톤이라, 서로의 결을 존중할 때 가장 깊어져요`,
  (a) => `사랑의 결이 ${a.relationship}이라, 본인다움을 지키며 다가갈 때 사이가 단단해져요`,
  (a) => `${a.character}의 결이라, 관계에선 ${a.relationship} 흐름이 자연스럽게 따라와요`,
]

const HEADLINE_FRAMINGS: Array<(a: IljuArchetype) => string> = [
  (a) => `${a.character}의 결을 타고난 사람이에요`,
  (a) => `${formatList(a.strengths)}이 본인다움의 핵심 결이에요`,
  (a) => `${a.character}이라는 큰 자질이 인생의 토대가 돼요`,
]

const FRAMINGS_BY_DOMAIN: Record<IljuDomain, Array<(a: IljuArchetype) => string>> = {
  career: CAREER_FRAMINGS,
  love: LOVE_FRAMINGS,
  headline: HEADLINE_FRAMINGS,
}

function formatList(items: readonly string[] | undefined): string {
  if (!items || items.length === 0) return '본연의 결'
  return items.slice(0, 3).join('·')
}

/**
 * Returns the array of fully-formed variation strings for a given
 * (ilju, domain). Empty when the ilju is unknown.
 */
export function iljuPool(
  ilju: string | undefined,
  domain: IljuDomain,
): readonly string[] {
  const archetype = getIljuArchetype(ilju)
  if (!archetype) return []
  const framings = FRAMINGS_BY_DOMAIN[domain]
  if (!framings || framings.length === 0) return []
  return framings.map((f) => f(archetype))
}
