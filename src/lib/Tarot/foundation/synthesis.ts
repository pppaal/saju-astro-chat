// Tarot spread synthesis — deterministic spread-level diagnosis.
// Mirrors saju's comprehensiveReport and astrology's foundation/synthesis.ts:
// pre-computes structural features (suit/element balance, major-minor ratio,
// reversal load, numerology, court-card presence, archetype themes) so
// the LLM (and the UI) can ground on real evidence rather than card-by-card
// rambling.
//
// Pure / no-LLM. Input = drawn cards + spread metadata.

import type { DrawnCard, Suit } from '../tarot.types'

export type Element = 'fire' | 'water' | 'air' | 'earth' | 'spirit'

export interface ElementBalance {
  fire: number    // wands
  water: number   // cups
  air: number     // swords
  earth: number   // pentacles
  spirit: number  // major arcana
  /** Highest-count element. */
  dominant: Element
  /** Elements absent from the spread (count = 0). */
  missing: Element[]
}

export interface MajorMinorRatio {
  majorCount: number
  minorCount: number
  /** 0..1 — share of cards that are Major Arcana. */
  majorShare: number
  /** Diagnosis label. */
  flavor: 'fated' | 'practical' | 'balanced'
  flavorMeaning: string
}

export interface ReversalLoad {
  reversedCount: number
  uprightCount: number
  /** 0..1 — share of reversed cards. */
  reversedShare: number
  flavor: 'flowing' | 'mixed' | 'blocked'
  flavorMeaning: string
}

export interface NumerologyReading {
  /** Sum of card numbers (Major: id; Minor: rank 1..14 where Page=11/Knight=12/Queen=13/King=14). */
  totalSum: number
  /** Reduced single digit (1-9) of totalSum. */
  reducedNumber: number
  /** Meaning of the reduced single-digit life-path-style number. */
  meaning: string
  /** Most-frequent rank across minor arcana (or null if none repeats). */
  dominantRank: number | null
}

export type CourtRole = 'page' | 'knight' | 'queen' | 'king'

export interface CourtPresence {
  page: number
  knight: number
  queen: number
  king: number
  /** True if any court card present — signals other people / roles in querent's life. */
  hasCourt: boolean
  /** Plain-language summary. */
  meaning: string
}

export type ArchetypeTheme =
  | 'transformation'
  | 'love'
  | 'crisis'
  | 'manifestation'
  | 'shadow'
  | 'completion'
  | 'beginnings'
  | 'reflection'
  | 'conflict'
  | 'abundance'

export interface ArchetypeHit {
  theme: ArchetypeTheme
  label: string
  weight: number
  evidence: string[]  // card names that triggered it
}

export type SpreadShape = 'concentrated' | 'balanced' | 'fragmented'

export interface SpreadShapeReading {
  shape: SpreadShape
  meaning: string
}

export interface TarotSynthesis {
  cardCount: number
  elementBalance: ElementBalance
  majorMinorRatio: MajorMinorRatio
  reversalLoad: ReversalLoad
  numerology: NumerologyReading
  court: CourtPresence
  archetypes: ArchetypeHit[]
  shape: SpreadShapeReading
  /** One-paragraph deterministic synthesis of the above. */
  summary: string
}

// ---------------- helpers ----------------

const SUIT_ELEMENT: Record<Suit, Element> = {
  major: 'spirit',
  wands: 'fire',
  cups: 'water',
  swords: 'air',
  pentacles: 'earth',
}

const ELEMENT_KO: Record<Element, string> = {
  fire: '불 (열정·행동)',
  water: '물 (감정·관계)',
  air: '공기 (사고·소통)',
  earth: '땅 (현실·물질)',
  spirit: '영 (운명·각성)',
}

/** Card id ranges:
 *  Major: 0..21
 *  Wands: 22..35  (Ace=22, 2=23, ..., 10=31, Page=32, Knight=33, Queen=34, King=35)
 *  Cups:  36..49  (Ace=36, ..., King=49)
 *  Swords:50..63
 *  Pentacles:64..77
 *  Within a suit: rank = (id - suitStart) + 1; Page=11, Knight=12, Queen=13, King=14
 */
function getSuitStart(suit: Suit): number {
  switch (suit) {
    case 'wands': return 22
    case 'cups': return 36
    case 'swords': return 50
    case 'pentacles': return 64
    case 'major': return 0
  }
}

/** Returns 1..14 for minors, or the major's id (0..21) for majors. */
function getRank(card: { id: number; suit: Suit; arcana: 'major' | 'minor' }): number {
  if (card.arcana === 'major') return card.id
  return card.id - getSuitStart(card.suit) + 1
}

function getCourtRole(rank: number): CourtRole | null {
  if (rank === 11) return 'page'
  if (rank === 12) return 'knight'
  if (rank === 13) return 'queen'
  if (rank === 14) return 'king'
  return null
}

function reduceToSingleDigit(n: number): number {
  let v = Math.abs(n)
  while (v > 9) {
    v = String(v).split('').reduce((s, d) => s + Number(d), 0)
  }
  return v
}

const NUMEROLOGY_MEANING: Record<number, string> = {
  1: '시작·독립·주도. 첫 발을 내딛는 자리.',
  2: '균형·관계·선택. 두 힘 사이의 조율.',
  3: '확장·창조·표현. 결실이 모이는 시기.',
  4: '구조·안정·기반. 토대를 다지는 흐름.',
  5: '변화·도전·자유. 흔들림 속의 재배치.',
  6: '조화·책임·돌봄. 관계와 가치의 정렬.',
  7: '내면·통찰·시험. 답이 안에서 올라옴.',
  8: '힘·결과·재구축. 외적 실현의 시기.',
  9: '완결·지혜·통합. 한 사이클의 마무리.',
}

// ---------------- archetype detection ----------------

/** id → triggered themes. Pulled from traditional rider-waite associations. */
const CARD_THEMES: Record<number, ArchetypeTheme[]> = {
  // Major
  0: ['beginnings'],                             // Fool
  1: ['manifestation'],                          // Magician
  2: ['reflection', 'shadow'],                   // High Priestess
  3: ['abundance', 'love'],                      // Empress
  4: ['manifestation'],                          // Emperor
  5: ['reflection'],                             // Hierophant
  6: ['love'],                                   // Lovers
  7: ['manifestation'],                          // Chariot
  8: ['shadow', 'transformation'],               // Strength
  9: ['reflection'],                             // Hermit
  10: ['transformation'],                        // Wheel
  11: ['reflection'],                            // Justice
  12: ['reflection', 'transformation'],          // Hanged Man
  13: ['transformation', 'completion'],          // Death
  14: ['reflection'],                            // Temperance
  15: ['shadow'],                                // Devil
  16: ['crisis', 'transformation'],              // Tower
  17: ['beginnings', 'reflection'],              // Star
  18: ['shadow', 'reflection'],                  // Moon
  19: ['abundance', 'completion'],               // Sun
  20: ['transformation', 'completion'],          // Judgement
  21: ['completion'],                            // World
  // Minor highlights (only most archetypal — others fall through to default)
  37: ['love'],     // Two of Cups
  38: ['love', 'abundance'], // Three of Cups
  41: ['shadow', 'reflection'], // Six of Cups (nostalgia/shadow lite)
  46: ['love', 'completion'],   // Ten of Cups
  52: ['crisis'],               // Three of Swords
  54: ['crisis'],               // Five of Swords
  59: ['crisis'],               // Ten of Swords (= id 50 + 9)
  64: ['beginnings', 'abundance'], // Ace of Pentacles
  73: ['abundance', 'completion'], // Ten of Pentacles
  22: ['beginnings'], // Ace of Wands
  36: ['beginnings'], // Ace of Cups
  50: ['beginnings'], // Ace of Swords
}

const THEME_LABEL: Record<ArchetypeTheme, string> = {
  transformation: '변용',
  love: '사랑·관계',
  crisis: '위기·정리',
  manifestation: '실현·주도',
  shadow: '그림자·내면',
  completion: '완결·통합',
  beginnings: '시작·씨앗',
  reflection: '성찰·내면',
  conflict: '충돌·분기',
  abundance: '풍요·결실',
}

function detectArchetypes(drawn: DrawnCard[]): ArchetypeHit[] {
  const hits = new Map<ArchetypeTheme, { weight: number; evidence: string[] }>()
  for (const dc of drawn) {
    const themes = CARD_THEMES[dc.card.id]
    if (!themes) continue
    // Major arcana weighs 2x, reversed shadow themes get extra
    const baseWeight = dc.card.arcana === 'major' ? 2 : 1
    for (const theme of themes) {
      const adj = dc.isReversed && (theme === 'shadow' || theme === 'crisis') ? baseWeight + 1 : baseWeight
      const cur = hits.get(theme) ?? { weight: 0, evidence: [] }
      cur.weight += adj
      cur.evidence.push(dc.card.nameKo || dc.card.name)
      hits.set(theme, cur)
    }
  }
  return Array.from(hits.entries())
    .map(([theme, v]) => ({ theme, label: THEME_LABEL[theme], weight: v.weight, evidence: v.evidence }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4)
}

// ---------------- core synthesizers ----------------

function buildElementBalance(drawn: DrawnCard[]): ElementBalance {
  const counts: Record<Element, number> = { fire: 0, water: 0, air: 0, earth: 0, spirit: 0 }
  for (const dc of drawn) counts[SUIT_ELEMENT[dc.card.suit]]++
  let dominant: Element = 'spirit'
  let max = -1
  ;(Object.keys(counts) as Element[]).forEach((el) => {
    if (counts[el] > max) {
      max = counts[el]
      dominant = el
    }
  })
  const missing = (Object.keys(counts) as Element[]).filter((el) => counts[el] === 0)
  return { ...counts, dominant, missing }
}

function buildMajorMinorRatio(drawn: DrawnCard[]): MajorMinorRatio {
  const majorCount = drawn.filter((dc) => dc.card.arcana === 'major').length
  const minorCount = drawn.length - majorCount
  const majorShare = drawn.length === 0 ? 0 : majorCount / drawn.length
  let flavor: MajorMinorRatio['flavor']
  let flavorMeaning: string
  if (majorShare >= 0.5) {
    flavor = 'fated'
    flavorMeaning =
      '메이저 비중이 높음 — 운명적·전환적 흐름이 강합니다. 일상보다 인생 단계의 큰 결을 다루는 자리.'
  } else if (majorShare <= 0.2) {
    flavor = 'practical'
    flavorMeaning =
      '마이너 위주 — 일상·실무·조율의 영역입니다. 매일의 선택과 행동이 결과를 만드는 결.'
  } else {
    flavor = 'balanced'
    flavorMeaning = '메이저·마이너가 섞여 있음 — 큰 흐름 속에서 매일의 결정도 실제로 영향을 줍니다.'
  }
  return { majorCount, minorCount, majorShare, flavor, flavorMeaning }
}

function buildReversalLoad(drawn: DrawnCard[]): ReversalLoad {
  const reversedCount = drawn.filter((dc) => dc.isReversed).length
  const uprightCount = drawn.length - reversedCount
  const reversedShare = drawn.length === 0 ? 0 : reversedCount / drawn.length
  let flavor: ReversalLoad['flavor']
  let flavorMeaning: string
  if (reversedShare >= 0.6) {
    flavor = 'blocked'
    flavorMeaning =
      '역방향 비중이 높음 — 막힘·내면화·미해결 에너지가 우세합니다. 외부 행동보다 내적 정리가 먼저.'
  } else if (reversedShare <= 0.2) {
    flavor = 'flowing'
    flavorMeaning = '거의 정방향 — 흐름이 외부에서 매끄럽게 진행되는 상태. 행동의 시기.'
  } else {
    flavor = 'mixed'
    flavorMeaning = '정방향과 역방향이 섞여 있음 — 일부는 흐르고 일부는 정체. 영역을 분리해 다루세요.'
  }
  return { reversedCount, uprightCount, reversedShare, flavor, flavorMeaning }
}

function buildNumerology(drawn: DrawnCard[]): NumerologyReading {
  let totalSum = 0
  const rankCounts = new Map<number, number>()
  for (const dc of drawn) {
    const rank = getRank({ id: dc.card.id, suit: dc.card.suit, arcana: dc.card.arcana })
    if (dc.card.arcana === 'minor') {
      rankCounts.set(rank, (rankCounts.get(rank) ?? 0) + 1)
    }
    totalSum += rank
  }
  const reducedNumber = drawn.length === 0 ? 0 : reduceToSingleDigit(totalSum)
  let dominantRank: number | null = null
  let dominantCount = 1
  rankCounts.forEach((c, r) => {
    if (c > dominantCount) {
      dominantCount = c
      dominantRank = r
    }
  })
  return {
    totalSum,
    reducedNumber,
    meaning: NUMEROLOGY_MEANING[reducedNumber] ?? '숫자 의미 미정.',
    dominantRank,
  }
}

function buildCourtPresence(drawn: DrawnCard[]): CourtPresence {
  const counts = { page: 0, knight: 0, queen: 0, king: 0 }
  for (const dc of drawn) {
    if (dc.card.arcana !== 'minor') continue
    const rank = getRank({ id: dc.card.id, suit: dc.card.suit, arcana: dc.card.arcana })
    const role = getCourtRole(rank)
    if (role) counts[role]++
  }
  const total = counts.page + counts.knight + counts.queen + counts.king
  const hasCourt = total > 0
  let meaning: string
  if (!hasCourt) {
    meaning = '코트 카드 없음 — 외부 인물보다 자기 자신의 흐름이 중심.'
  } else if (counts.king + counts.queen >= counts.page + counts.knight) {
    meaning = '왕·여왕 비중 — 성숙한 권위/멘토/책임자 인물이 흐름에 관여합니다.'
  } else {
    meaning = '시동/기사 비중 — 새 인물·메시지·전령 또는 빠른 행동력이 작동합니다.'
  }
  return { ...counts, hasCourt, meaning }
}

function buildShape(elementBalance: ElementBalance, total: number): SpreadShapeReading {
  if (total === 0) return { shape: 'fragmented', meaning: '카드 없음.' }
  const counts = [elementBalance.fire, elementBalance.water, elementBalance.air, elementBalance.earth, elementBalance.spirit]
  const max = Math.max(...counts)
  const nonZero = counts.filter((c) => c > 0).length
  if (max / total >= 0.6) {
    return {
      shape: 'concentrated',
      meaning: '한 원소가 압도 — 단일 주제가 강력히 지배합니다. 그 영역의 정렬이 핵심.',
    }
  }
  if (nonZero <= 2 && total >= 4) {
    return {
      shape: 'fragmented',
      meaning: '원소가 2종 이내로 쏠려 있음 — 다른 영역의 자원/관점을 잠시 빌릴 시기.',
    }
  }
  return {
    shape: 'balanced',
    meaning: '원소가 고르게 분포 — 여러 영역이 동시에 움직이고 있습니다. 균형 잡힌 접근 가능.',
  }
}

function buildSummary(synth: Omit<TarotSynthesis, 'summary'>): string {
  const parts: string[] = []
  parts.push(
    `${synth.cardCount}장 스프레드 · ${ELEMENT_KO[synth.elementBalance.dominant]} 우세 · 메이저 ${synth.majorMinorRatio.majorCount}/${synth.cardCount}장`,
  )
  if (synth.archetypes.length > 0) {
    parts.push(`핵심 테마: ${synth.archetypes.slice(0, 3).map((a) => a.label).join(' · ')}`)
  }
  parts.push(`구조: ${synth.shape.meaning}`)
  parts.push(`흐름: ${synth.reversalLoad.flavorMeaning}`)
  return parts.join('  |  ')
}

// ---------------- entry point ----------------

export function synthesizeTarotSpread(drawn: DrawnCard[]): TarotSynthesis {
  const elementBalance = buildElementBalance(drawn)
  const majorMinorRatio = buildMajorMinorRatio(drawn)
  const reversalLoad = buildReversalLoad(drawn)
  const numerology = buildNumerology(drawn)
  const court = buildCourtPresence(drawn)
  const archetypes = detectArchetypes(drawn)
  const shape = buildShape(elementBalance, drawn.length)
  const partial = {
    cardCount: drawn.length,
    elementBalance,
    majorMinorRatio,
    reversalLoad,
    numerology,
    court,
    archetypes,
    shape,
  }
  return { ...partial, summary: buildSummary(partial) }
}

export const __ELEMENT_KO = ELEMENT_KO
