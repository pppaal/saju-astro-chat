/**
 * Tier 2 — Medium Match Score
 *
 * Run when user taps a card to view detail (~50-100 candidates per
 * minute max). Adds Venus-Mars / Sun-Moon / Mercury sign-aspect math
 * and surfaces top attraction + top friction signals.
 */

import type { MatchProfile, Element } from './matchProfile'
import { tier1QuickScore, type MatchBand } from './tier1Quick'

const ZODIAC_ORDER = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const

function signDistance(s1: string, s2: string): number {
  const i1 = ZODIAC_ORDER.indexOf(s1 as (typeof ZODIAC_ORDER)[number])
  const i2 = ZODIAC_ORDER.indexOf(s2 as (typeof ZODIAC_ORDER)[number])
  if (i1 < 0 || i2 < 0) return -1
  const diff = Math.abs(i1 - i2) % 12
  return Math.min(diff, 12 - diff)
}

type Aspect = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition' | null

function aspectFromDistance(dist: number): Aspect {
  if (dist === 0) return 'conjunction'
  if (dist === 2) return 'sextile'
  if (dist === 3) return 'square'
  if (dist === 4) return 'trine'
  if (dist === 6) return 'opposition'
  return null
}

const ASPECT_SCORE: Record<NonNullable<Aspect>, number> = {
  conjunction: 90,
  trine: 85,
  sextile: 70,
  opposition: 60,
  square: 35,
}

const ELEMENT_GENERATES: Record<Element, Element> = {
  wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
}
const ELEMENT_CONTROLS: Record<Element, Element> = {
  wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood',
}

function elementRel(a: Element, b: Element): 'same' | 'support' | 'drain' | 'control' | 'controlled' {
  if (a === b) return 'same'
  if (ELEMENT_GENERATES[b] === a) return 'support'
  if (ELEMENT_GENERATES[a] === b) return 'drain'
  if (ELEMENT_CONTROLS[a] === b) return 'control'
  return 'controlled'
}

export interface MediumMatchResult {
  score: number
  band: MatchBand
  sajuScore: number
  astroScore: number
  topAttraction: string
  topFriction: string | null
  matchTagline: string
  matchReasons: string[]
}

/** Detailed score with structured signals — intended for card detail view. */
export function tier2MediumScore(me: MatchProfile, other: MatchProfile): MediumMatchResult {
  // Start from tier 1 baseline
  const t1 = tier1QuickScore(me, other)

  // === Saju sub-score ===
  const dmRel = elementRel(me.saju.dayMasterEl, other.saju.dayMasterEl)
  let sajuScore = 60
  if (dmRel === 'support' || dmRel === 'drain') sajuScore += 15
  else if (dmRel === 'same') sajuScore += 5
  else if (dmRel === 'control' || dmRel === 'controlled') sajuScore -= 12
  if (me.saju.yinYang !== other.saju.yinYang) sajuScore += 6

  // 5행 complement
  const allEl: Element[] = ['wood', 'fire', 'earth', 'metal', 'water']
  let fillCount = 0
  for (const el of allEl) {
    const a = me.saju.elements[el] || 0
    const b = other.saju.elements[el] || 0
    if (a <= 1 && b >= 3) fillCount += 1
    if (b <= 1 && a >= 3) fillCount += 1
  }
  sajuScore += Math.min(fillCount * 3, 9)
  sajuScore = Math.max(0, Math.min(100, sajuScore))

  // === Astro sub-score with sign aspects ===
  const sunMoonDist = Math.min(
    signDistance(me.astro.sun.sign, other.astro.moon.sign),
    signDistance(other.astro.sun.sign, me.astro.moon.sign)
  )
  const sunMoonAspect = aspectFromDistance(sunMoonDist)

  const venusMarsDist = Math.min(
    signDistance(me.astro.venus.sign, other.astro.mars.sign),
    signDistance(other.astro.venus.sign, me.astro.mars.sign)
  )
  const venusMarsAspect = aspectFromDistance(venusMarsDist)

  const mercuryDist =
    me.astro.mercury && other.astro.mercury
      ? signDistance(me.astro.mercury.sign, other.astro.mercury.sign)
      : -1
  const mercuryAspect = aspectFromDistance(mercuryDist)

  let astroScore = 60
  if (sunMoonAspect) astroScore += (ASPECT_SCORE[sunMoonAspect] - 60) * 0.25
  if (venusMarsAspect) astroScore += (ASPECT_SCORE[venusMarsAspect] - 60) * 0.3
  if (mercuryAspect) astroScore += (ASPECT_SCORE[mercuryAspect] - 60) * 0.2
  if (me.astro.sun.element === other.astro.sun.element) astroScore += 4
  astroScore = Math.max(0, Math.min(100, Math.round(astroScore)))

  // === Combined score (weighted blend with tier 1 as ground) ===
  const score = Math.round(t1.score * 0.4 + sajuScore * 0.3 + astroScore * 0.3)
  const band: MatchBand =
    score >= 88
      ? 'soulmate'
      : score >= 78
        ? 'strong'
        : score >= 68
          ? 'compatible'
          : score >= 56
            ? 'worth'
            : 'different'

  // === Top attraction signal ===
  let topAttraction = '두 분의 결이 자연스럽게 어울리는 자리예요.'
  if (venusMarsAspect === 'conjunction') {
    topAttraction = '금성과 화성이 같은 자리에 만나 첫인상부터 강한 케미가 흐릅니다.'
  } else if (venusMarsAspect === 'trine') {
    topAttraction = '금성과 화성이 부드럽게 만나 자연스러운 끌림이 흐르는 결입니다.'
  } else if (venusMarsAspect === 'opposition') {
    topAttraction = '금성과 화성이 정반대로 마주쳐 "정반대에 끌리는" 강한 호기심이 발동합니다.'
  } else if (sunMoonAspect === 'conjunction') {
    topAttraction = '한쪽의 본질과 다른쪽의 정서가 같은 자리에 놓여 고향처럼 편안한 결이에요.'
  } else if (sunMoonAspect === 'trine') {
    topAttraction = '태양과 달이 부드럽게 만나 마음이 같은 방향을 향하는 결이에요.'
  } else if (dmRel === 'support') {
    topAttraction = `사주 본성이 상생하는 자리예요. 함께 있으면 한쪽이 더 빛나는 결입니다.`
  } else if (me.saju.yinYang !== other.saju.yinYang) {
    topAttraction = '음양이 서로 보완되는 자연스러운 끌림이 흐릅니다.'
  } else if (venusMarsAspect === 'sextile') {
    topAttraction = '금성과 화성이 잔잔히 호응하는 결 — 시간이 지날수록 매력이 깊어져요.'
  }

  // === Top friction (only if real friction exists) ===
  let topFriction: string | null = null
  if (sunMoonDist === 3 || venusMarsAspect === 'square') {
    topFriction =
      venusMarsAspect === 'square'
        ? '금성과 화성이 팽팽하게 마주쳐 끌림은 강하지만 마찰이 자주 일어날 수 있어요.'
        : '의지와 감정이 다른 방향을 향해 큰 결정에서 충돌이 나타날 수 있습니다.'
  } else if (dmRel === 'control' || dmRel === 'controlled') {
    topFriction =
      '사주 본성이 한쪽을 누르는 결이라 의식적인 존중과 균형이 필요해요.'
  } else if (me.saju.yinYang === other.saju.yinYang) {
    topFriction =
      me.saju.yinYang === 'yang'
        ? '둘 다 양의 본성이라 주도권 충돌이 생길 수 있어 역할 분담이 필요해요.'
        : '둘 다 음의 본성이라 결정 미루기 패턴이 쌓일 수 있어요.'
  }

  // === Tagline (1 sentence card label) ===
  let matchTagline = '맞춰가면 좋아질 결'
  if (band === 'soulmate') matchTagline = '천생연분의 결'
  else if (band === 'strong') {
    if (venusMarsAspect === 'conjunction' || venusMarsAspect === 'trine') {
      matchTagline = '끌림과 케미가 강한 결'
    } else if (sunMoonAspect === 'conjunction' || sunMoonAspect === 'trine') {
      matchTagline = '마음이 잘 통하는 결'
    } else {
      matchTagline = '안정적으로 좋은 결'
    }
  } else if (band === 'compatible') {
    matchTagline = '편안하게 통하는 결'
  } else if (band === 'worth') {
    matchTagline = '맞춰가는 재미가 있는 결'
  } else {
    matchTagline = '서로 다름을 배우는 결'
  }

  // === Match reasons (top 2-3 bullet-ready) ===
  const reasons: string[] = []
  if (dmRel === 'support' || dmRel === 'drain') {
    reasons.push('사주 본성 상생')
  } else if (dmRel === 'same') {
    reasons.push(`같은 ${me.saju.dayMasterEl} 본성`)
  }
  if (me.saju.yinYang !== other.saju.yinYang) {
    reasons.push('음양 보완')
  }
  if (fillCount >= 2) reasons.push('5행 보완')
  if (venusMarsAspect === 'conjunction' || venusMarsAspect === 'trine') {
    reasons.push('금성·화성 조화')
  }
  if (sunMoonAspect === 'conjunction' || sunMoonAspect === 'trine') {
    reasons.push('태양·달 조화')
  }
  if (mercuryAspect === 'conjunction' || mercuryAspect === 'trine') {
    reasons.push('수성 합치 — 대화 잘 통함')
  }

  return {
    score,
    band,
    sajuScore,
    astroScore,
    topAttraction,
    topFriction,
    matchTagline,
    matchReasons: reasons.slice(0, 3),
  }
}
