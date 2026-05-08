// Tarot timing engine — probabilistic "when" calculator.
//
// Mirrors saju's decisiveTimings (7 life events with age windows) and
// astrology's lifecycleTiming (11 outer-planet milestones). Tarot's
// equivalent is card-based traditional timing windows aggregated across
// the spread to produce a probabilistic timeframe.
//
// Pure / no-LLM. Inputs = drawn cards. Output = primary window + confidence
// + trigger description.
//
// Method:
//  - Each card maps to a base window (immediate / weeks / months / quarters / year+).
//  - Major arcana = long-arc / karmic timing (months to years).
//  - Aces = imminent.
//  - Court cards = "via a person" trigger.
//  - Reversed cards = delay (shift one window slower).
//  - Aggregate: pick median window weighted by Major×2.

import type { DrawnCard } from '../tarot.types'

export type TimingWindow =
  | 'immediate'   // 0-3 weeks
  | 'short'       // 1-3 months
  | 'medium'      // 3-6 months
  | 'long'        // 6-12 months
  | 'extended'    // 12+ months / karmic

export const WINDOW_LABEL: Record<TimingWindow, string> = {
  immediate: '즉시 (0~3주)',
  short: '단기 (1~3개월)',
  medium: '중기 (3~6개월)',
  long: '장기 (6~12개월)',
  extended: '확장 (12개월 이상 · 큰 흐름)',
}

const WINDOW_ORDER: TimingWindow[] = ['immediate', 'short', 'medium', 'long', 'extended']

export type TimingTrigger = 'self_action' | 'external_event' | 'person_arrives' | 'inner_readiness'

export const TRIGGER_LABEL: Record<TimingTrigger, string> = {
  self_action: '나의 행동이 트리거',
  external_event: '외부 사건이 트리거',
  person_arrives: '특정 인물의 등장이 트리거',
  inner_readiness: '내면 준비가 완성될 때 트리거',
}

export interface CardTimingHint {
  cardName: string
  isReversed: boolean
  window: TimingWindow
  trigger: TimingTrigger
  reason: string
}

export interface TarotTimingOutput {
  /** Most-weighted window across the spread. */
  primaryWindow: TimingWindow
  primaryLabel: string
  /** 0..1 confidence that primaryWindow is the answer (vs. spread spans many windows). */
  confidence: number
  /** Most-weighted trigger across the spread. */
  primaryTrigger: TimingTrigger
  primaryTriggerLabel: string
  /** Per-card breakdown for evidence. */
  perCard: CardTimingHint[]
  /** Plain-language summary. */
  summary: string
  /** Concrete advice for the timing diagnosis. */
  advice: string
}

// ---------------- helpers ----------------

function getRank(card: { id: number; suit: string; arcana: string }): number {
  if (card.arcana === 'major') return card.id
  const start =
    card.suit === 'wands' ? 22 :
    card.suit === 'cups' ? 36 :
    card.suit === 'swords' ? 50 :
    64
  return card.id - start + 1
}

/** Major arcana base windows (per traditional timing systems — Greer/Pollack). */
const MAJOR_WINDOW: Record<number, TimingWindow> = {
  0: 'immediate',   // Fool — leap right now
  1: 'short',       // Magician — when you act
  2: 'medium',      // High Priestess — answer reveals slowly
  3: 'long',        // Empress — gestation
  4: 'long',        // Emperor — built over time
  5: 'extended',    // Hierophant — institutional / long
  6: 'short',       // Lovers — choice point soon
  7: 'short',       // Chariot — momentum
  8: 'medium',      // Strength — patience
  9: 'long',        // Hermit — withdrawal period
  10: 'short',      // Wheel — turn arriving
  11: 'medium',     // Justice — legal/arbitration
  12: 'long',       // Hanged Man — wait it out
  13: 'extended',   // Death — full transformation
  14: 'medium',     // Temperance — gradual blending
  15: 'extended',   // Devil — long entanglement
  16: 'immediate',  // Tower — sudden
  17: 'long',       // Star — slow healing
  18: 'long',       // Moon — confused interval
  19: 'short',      // Sun — fast clarity
  20: 'medium',     // Judgement — call comes
  21: 'extended',   // World — full cycle
}

/** Suit modifier on minor arcana — fire/swords are faster, earth/water slower. */
function suitWindowAdjust(suit: string, baseRank: number): TimingWindow {
  // Aces always immediate
  if (baseRank === 1) return 'immediate'
  // Court cards — depend on rank: page=short, knight=immediate, queen=medium, king=long
  if (baseRank === 11) return 'short'
  if (baseRank === 12) return 'immediate'
  if (baseRank === 13) return 'medium'
  if (baseRank === 14) return 'long'
  // Pip cards 2-10
  // wands (fire) = days to weeks
  // swords (air) = weeks to months
  // cups (water) = months
  // pentacles (earth) = months to seasons
  if (suit === 'wands') {
    if (baseRank <= 4) return 'short'
    if (baseRank <= 7) return 'medium'
    return 'long'
  }
  if (suit === 'swords') {
    if (baseRank <= 4) return 'short'
    if (baseRank <= 7) return 'medium'
    return 'long'
  }
  if (suit === 'cups') {
    if (baseRank <= 4) return 'medium'
    if (baseRank <= 7) return 'long'
    return 'extended'
  }
  // pentacles
  if (baseRank <= 4) return 'medium'
  if (baseRank <= 7) return 'long'
  return 'extended'
}

function shiftSlower(w: TimingWindow): TimingWindow {
  const i = WINDOW_ORDER.indexOf(w)
  return WINDOW_ORDER[Math.min(i + 1, WINDOW_ORDER.length - 1)]
}

/** Trigger inferred per card. */
function inferTrigger(card: { id: number; suit: string; arcana: string }, rank: number): TimingTrigger {
  // Court cards = person trigger
  if (rank >= 11 && rank <= 14) return 'person_arrives'
  // Major arcana — depends on card
  if (card.arcana === 'major') {
    // Tower / Wheel / Death / Judgement = external events
    if ([10, 13, 16, 20].includes(card.id)) return 'external_event'
    // Hermit / Hanged Man / High Priestess / Moon = inner readiness
    if ([2, 9, 12, 18].includes(card.id)) return 'inner_readiness'
    // Magician / Chariot / Sun / Star = self action
    if ([1, 7, 17, 19].includes(card.id)) return 'self_action'
    return 'external_event'
  }
  // Pip cards: wands/swords = self action; cups/pentacles = inner readiness or external
  if (card.suit === 'wands' || card.suit === 'swords') return 'self_action'
  if (card.suit === 'cups') return 'inner_readiness'
  return 'external_event'
}

/** Reason text for each card's timing. */
function reasonFor(card: { id: number; suit: string; arcana: string }, rank: number, isReversed: boolean): string {
  const orient = isReversed ? '역방향 → 한 단계 늦춰짐' : '정방향'
  if (card.arcana === 'major') return `메이저 ${card.id}번 (${orient})`
  if (rank === 1) return `에이스 (${orient}) — 새 시작 즉시 발화`
  if (rank >= 11) {
    const role = rank === 11 ? 'Page' : rank === 12 ? 'Knight' : rank === 13 ? 'Queen' : 'King'
    return `코트 카드 ${role} (${orient}) — 인물 매개`
  }
  return `${card.suit} ${rank} (${orient})`
}

// ---------------- entry point ----------------

export function buildTarotTiming(drawn: DrawnCard[]): TarotTimingOutput | null {
  if (drawn.length === 0) return null

  const perCard: CardTimingHint[] = []
  const windowVotes = new Map<TimingWindow, number>()
  const triggerVotes = new Map<TimingTrigger, number>()

  for (const dc of drawn) {
    const rank = getRank({ id: dc.card.id, suit: dc.card.suit, arcana: dc.card.arcana })
    let window: TimingWindow
    if (dc.card.arcana === 'major') {
      window = MAJOR_WINDOW[dc.card.id] ?? 'medium'
    } else {
      window = suitWindowAdjust(dc.card.suit, rank)
    }
    if (dc.isReversed) window = shiftSlower(window)

    const trigger = inferTrigger({ id: dc.card.id, suit: dc.card.suit, arcana: dc.card.arcana }, rank)

    perCard.push({
      cardName: dc.card.nameKo || dc.card.name,
      isReversed: dc.isReversed,
      window,
      trigger,
      reason: reasonFor({ id: dc.card.id, suit: dc.card.suit, arcana: dc.card.arcana }, rank, dc.isReversed),
    })

    const weight = dc.card.arcana === 'major' ? 2 : 1
    windowVotes.set(window, (windowVotes.get(window) ?? 0) + weight)
    triggerVotes.set(trigger, (triggerVotes.get(trigger) ?? 0) + weight)
  }

  // Pick highest-weight window
  let primaryWindow: TimingWindow = 'medium'
  let topWindowVotes = -1
  let totalWindowVotes = 0
  windowVotes.forEach((v, w) => {
    totalWindowVotes += v
    if (v > topWindowVotes) {
      topWindowVotes = v
      primaryWindow = w
    }
  })
  const confidence = totalWindowVotes === 0 ? 0 : topWindowVotes / totalWindowVotes

  // Pick highest-weight trigger
  let primaryTrigger: TimingTrigger = 'self_action'
  let topTriggerVotes = -1
  triggerVotes.forEach((v, t) => {
    if (v > topTriggerVotes) {
      topTriggerVotes = v
      primaryTrigger = t
    }
  })

  const summary = buildSummary(primaryWindow, confidence, primaryTrigger, drawn.length)
  const advice = buildAdvice(primaryWindow, primaryTrigger)

  return {
    primaryWindow,
    primaryLabel: WINDOW_LABEL[primaryWindow],
    confidence,
    primaryTrigger,
    primaryTriggerLabel: TRIGGER_LABEL[primaryTrigger],
    perCard,
    summary,
    advice,
  }
}

function buildSummary(
  window: TimingWindow,
  confidence: number,
  trigger: TimingTrigger,
  cardCount: number,
): string {
  const confLabel = confidence >= 0.6 ? '높은 확신' : confidence >= 0.4 ? '중간 확신' : '낮은 확신 (시기가 분산됨)'
  return `${cardCount}장 카드 종합: 결정적 시기는 ${WINDOW_LABEL[window]}. 신뢰도 ${confLabel} (${Math.round(confidence * 100)}%). 트리거: ${TRIGGER_LABEL[trigger]}.`
}

function buildAdvice(window: TimingWindow, trigger: TimingTrigger): string {
  const triggerHint: Record<TimingTrigger, string> = {
    self_action: '내가 먼저 움직여야 시계가 작동합니다. 첫 행동을 오늘 정하세요.',
    external_event: '외부 신호를 기다려도 좋습니다. 단, 신호가 올 때 받을 준비는 미리 해두세요.',
    person_arrives: '특정 인물의 등장이 변곡점. 사람과의 약속/연결을 소홀히 하지 마세요.',
    inner_readiness: '내면이 준비되어야 외부가 움직입니다. 내적 정리 우선.',
  }
  const windowHint: Record<TimingWindow, string> = {
    immediate: '지금 망설이는 결정이라면 그냥 진행하세요. 시간이 지원합니다.',
    short: '한 분기 안에 결판납니다. 단기 계획에 집중하세요.',
    medium: '반년 정도의 시간 지평으로 보고 인내하세요. 중간 점검 권장.',
    long: '한 해의 흐름. 장기 시선과 중간 보상 시스템을 같이 두세요.',
    extended: '한 해를 넘는 큰 흐름 — 즉답을 기대하지 말고 결을 따라가세요.',
  }
  return `${windowHint[window]} ${triggerHint[trigger]}`
}
