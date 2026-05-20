// src/lib/fusion/lifeReport/pools/iljuPool.ts
//
// 60갑자 일주 (day pillar) variation pools.
//
// Sources (no content duplication — both DBs already exist in src/lib/saju):
// 1. src/lib/saju/iljuDictionary.ts → ILJU_ARCHETYPES
// Broken-out trait fields (character / strengths / weaknesses /
// career[] / relationship). Good for composing variations on the
// fly because the lists slot into different framings.
// 2. src/lib/saju/pillar-lookup/ilju-data.ts → ILJU_DATA
// Pre-written narrative sentences per domain (personality / career
// / love / wealth / health / famousPeople). Good as a single rich
// sentence the LifeReport can drop in verbatim.
//
// The two DBs are *complementary*, not duplicate: ARCHETYPES gives
// structured traits, ILJU_DATA gives finished narrative prose. The pool
// emits both kinds of framings so each domain section can mix natural
// variations with the orthodox one-liner.

import { ILJU_ARCHETYPES, type IljuArchetype } from '@/lib/saju/iljuDictionary'
import { ILJU_DATA } from '@/lib/saju/pillar-lookup/ilju-data'
import type { IljuInfo } from '@/lib/saju/pillar-lookup/types'

export type IljuDomain = 'career' | 'love' | 'headline' | 'money' | 'wealth' | 'health'

export function getIljuArchetype(ilju: string | undefined): IljuArchetype | undefined {
  if (!ilju) return undefined
  return ILJU_ARCHETYPES[ilju]
}

/**
 * Lookup the richer pre-written narrative entry. Complementary to
 * archetypes: provides finished sentences for personality/career/love/
 * wealth/health — ideal when a domain section wants ONE orthodox line
 * rather than a synthesised variation.
 */
export function getIljuData(ilju: string | undefined): IljuInfo | undefined {
  if (!ilju) return undefined
  return ILJU_DATA[ilju]
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
  (a) => `타고난 성격은 ${a.character}이라, ${formatList(a.career)} 분야에서 자질이 가장 잘 살아요`,
  (a) => `${a.character} 성격이라, ${formatList(a.career)} 쪽 일이 자연스럽게 풀려요`,
  (a) =>
    `핵심 자질이 ${formatList(a.strengths)}이라, ${formatList(a.career)} 분야가 당신의 색을 키워줘요`,
]

const LOVE_FRAMINGS: Array<(a: IljuArchetype) => string> = [
  (a) => `관계 스타일은 ${a.relationship}한 분위기라, 서로를 존중할 때 가장 깊어져요`,
  (a) => `사랑의 스타일이 ${a.relationship}이라, 자기 색을 지키며 다가갈 때 사이가 단단해져요`,
  (a) => `${a.character} 성격이라, 관계에선 ${a.relationship} 흐름이 자연스럽게 따라와요`,
]

const HEADLINE_FRAMINGS: Array<(a: IljuArchetype) => string> = [
  (a) => `${a.character} 성격을 타고났어요`,
  (a) => `${formatList(a.strengths)}이 당신 색의 핵심이에요`,
  (a) => `${a.character}이라는 큰 자질이 인생의 토대가 돼요`,
]

const FRAMINGS_BY_DOMAIN: Record<
  'career' | 'love' | 'headline',
  Array<(a: IljuArchetype) => string>
> = {
  career: CAREER_FRAMINGS,
  love: LOVE_FRAMINGS,
  headline: HEADLINE_FRAMINGS,
}

// ILJU_DATA framings (pre-written orthodox narratives) — money / wealth /
// health / love. We expose them as the first variation in the pool so
// callers always get the canonical 자평진전 phrasing if they want it.
const ILJU_DATA_FIELD_BY_DOMAIN: Record<
  'money' | 'wealth' | 'health' | 'love' | 'career',
  keyof IljuInfo
> = {
  money: 'wealth',
  wealth: 'wealth',
  health: 'health',
  love: 'love',
  career: 'career',
}

function formatList(items: readonly string[] | undefined): string {
  if (!items || items.length === 0) return '자기 본연의 특징'
  return items.slice(0, 3).join('·')
}

/**
 * Returns variation strings for a given (ilju, domain). Combines:
 * • ILJU_DATA orthodox one-liner (when the field exists for the
 * domain) — first entry, deterministic
 * • ILJU_ARCHETYPES synthesised framings — 3 entries
 *
 * Empty when the ilju is unknown.
 *
 * Domain → ILJU_DATA field mapping:
 * - career → ILJU_DATA.career
 * - love → ILJU_DATA.love
 * - money, wealth → ILJU_DATA.wealth
 * - health → ILJU_DATA.health
 * - headline → archetype-only (no ILJU_DATA equivalent)
 */
export function iljuPool(ilju: string | undefined, domain: IljuDomain): readonly string[] {
  const archetype = getIljuArchetype(ilju)
  const data = getIljuData(ilju)
  if (!archetype && !data) return []

  const variations: string[] = []

  // 1. Pre-written orthodox one-liner from ILJU_DATA
  if (data) {
    const field = ILJU_DATA_FIELD_BY_DOMAIN[domain as keyof typeof ILJU_DATA_FIELD_BY_DOMAIN]
    if (field) {
      const raw = data[field]
      if (typeof raw === 'string' && raw.trim().length > 0) {
        variations.push(raw)
      }
    }
  }

  // 2. Synthesised framings from ILJU_ARCHETYPES (career/love/headline only)
  if (archetype) {
    const framings =
      domain === 'career'
        ? CAREER_FRAMINGS
        : domain === 'love'
          ? LOVE_FRAMINGS
          : domain === 'headline'
            ? HEADLINE_FRAMINGS
            : []
    for (const f of framings) variations.push(f(archetype))
  }

  return variations
}
