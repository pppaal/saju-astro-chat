// Single-person astrology chart synthesis.
//
// Equivalent to lib/Saju/comprehensiveReport.ts but for the western
// chart. Combines element/modality/hemisphere balance, dominant planet
// detection, chart shape (bowl/bucket/locomotive/seesaw/splash),
// aspect-pattern detection, and Sun×ASC archetype lookup into a single
// deterministic narrative bundle.
//
// All calculation is pure — no LLM. Drives the free report's astro
// section depth so it matches the saju side.

import type { Chart, PlanetBase } from './types'
import { findNatalAspects } from './aspects'
import { detectAspectPattern } from '@/lib/compatibility/astrology/aspect-utils'

// ============================================================
// Types
// ============================================================

export type Element = 'fire' | 'earth' | 'air' | 'water'
export type Modality = 'cardinal' | 'fixed' | 'mutable'

export type ChartShape =
  | 'bundle'      // all planets within 120° (4 signs)
  | 'bowl'        // all planets within 180° (6 signs)
  | 'bucket'      // bowl + a single "handle" opposite
  | 'locomotive'  // 240° span (8 signs), one empty third
  | 'seesaw'      // two clusters opposing
  | 'splay'       // 3 clusters
  | 'splash'      // evenly distributed

export interface ElementBalance {
  fire: number
  earth: number
  air: number
  water: number
  /** Dominant element (highest %). */
  dominant: Element
  /** Lacking element (lowest %, < 15%). null if balanced. */
  lacking: Element | null
}

export interface ModalityBalance {
  cardinal: number
  fixed: number
  mutable: number
  dominant: Modality
}

export interface HemisphereBalance {
  /** Day chart = Sun above horizon (Houses 7-12). */
  daytime: number
  nighttime: number
  /** Eastern (self) vs Western (other). H 1-6 vs 7-12 — wait that's also day/night. */
  eastern: number  // H 10/11/12/1/2/3
  western: number  // H 4/5/6/7/8/9
}

export interface DominantPlanet {
  /** Planet receiving the most aspect score. */
  name: string
  totalScore: number
  /** How many aspects involve this planet. */
  aspectCount: number
}

export interface ChartSynthesis {
  /** Sun×Moon×ASC headline ("물병 1H × 쌍둥이 4H × 물병"). */
  signature: string
  /** 1~2 sentence persona derived from Sun×ASC. */
  archetype: string
  /** Element / modality / hemisphere distribution. */
  balance: {
    element: ElementBalance
    modality: ModalityBalance
    hemisphere: HemisphereBalance
  }
  /** Most-aspected planet. */
  dominant: DominantPlanet | null
  /** bowl / bucket / locomotive / seesaw / splash / splay / bundle. */
  shape: ChartShape
  /** Detected aspect patterns (Grand Trine / T-Square / Grand Cross / Stellium). */
  patterns: string[]
  /** "1H" / "10H" type — house with the most planets. */
  emphasizedHouse: number | null
}

// ============================================================
// Sign metadata
// ============================================================

const SIGN_ORDER = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const

const SIGN_TO_ELEMENT: Record<string, Element> = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
}

const SIGN_TO_MODALITY: Record<string, Modality> = {
  Aries: 'cardinal', Cancer: 'cardinal', Libra: 'cardinal', Capricorn: 'cardinal',
  Taurus: 'fixed', Leo: 'fixed', Scorpio: 'fixed', Aquarius: 'fixed',
  Gemini: 'mutable', Virgo: 'mutable', Sagittarius: 'mutable', Pisces: 'mutable',
}

const SIGN_KO: Record<string, string> = {
  Aries: '양자리', Taurus: '황소', Gemini: '쌍둥이', Cancer: '게',
  Leo: '사자', Virgo: '처녀', Libra: '천칭', Scorpio: '전갈',
  Sagittarius: '사수', Capricorn: '염소', Aquarius: '물병', Pisces: '물고기',
}

// ============================================================
// Sun × ASC archetype dictionary — saju 60갑자 일주 archetype과 같은 결.
// 12 sun signs × 12 asc = 144개. 일단 12 ASC base archetype (sun과 합치는 톤).
// ============================================================

const ASC_ARCHETYPE: Record<string, string> = {
  Aries: '개척자형 — 첫인상이 강하고 맞붙는 결. 도전을 기다리지 않고 만들어냅니다.',
  Taurus: '안정 자형 — 천천히 단단해지는 결. 가까운 사람에겐 느긋하고 든든한 인상.',
  Gemini: '소통자형 — 말과 호기심으로 풀어가는 결. 정보·관계의 다리 역할이 자연스러움.',
  Cancer: '돌봄자형 — 분위기를 읽고 감싸안는 결. 안정된 공간을 만드는 데 강합니다.',
  Leo: '주역형 — 자신감 있게 빛나는 결. 인정받고 표현할 때 가장 살아납니다.',
  Virgo: '정밀자형 — 세부와 시스템을 다듬는 결. 신뢰는 디테일에서 나옵니다.',
  Libra: '조율자형 — 균형과 우아함이 무기. 관계 안에서 자기 색을 찾는 결.',
  Scorpio: '심층 탐구형 — 깊이 보고 진짜를 캐내는 결. 표면 대화는 잘 안 통합니다.',
  Sagittarius: '확장자형 — 의미와 큰 그림에 끌리는 결. 자유와 비전이 산소입니다.',
  Capricorn: '구축자형 — 시간과 책임으로 쌓아가는 결. 인정은 결과로 받습니다.',
  Aquarius: '혁신자형 — 거리를 두고 다르게 보는 결. 시스템 밖에서 답을 가져옵니다.',
  Pisces: '감응자형 — 경계가 부드러운 결. 예술·치유·영적 영역에서 진가가 드러남.',
}

const SUN_THEME: Record<string, string> = {
  Aries: '주도와 개척',
  Taurus: '안정과 감각',
  Gemini: '호기심과 소통',
  Cancer: '돌봄과 정서',
  Leo: '자기표현과 자존감',
  Virgo: '정밀과 봉사',
  Libra: '조화와 미',
  Scorpio: '깊이와 변용',
  Sagittarius: '의미와 모험',
  Capricorn: '책임과 성취',
  Aquarius: '독립과 혁신',
  Pisces: '감응과 초월',
}

function buildArchetype(sunSign: string, ascSign: string, moonSign: string): string {
  const sunTheme = SUN_THEME[sunSign] || ''
  const ascText = ASC_ARCHETYPE[ascSign] || ''
  const moonKo = SIGN_KO[moonSign] || moonSign
  return `태양 ${SIGN_KO[sunSign] || sunSign}의 ${sunTheme} 결. ${ascText} 감정은 ${moonKo}의 흐름으로 풀립니다.`
}

// ============================================================
// Element / Modality balance
// ============================================================

function elementBalance(planets: PlanetBase[]): ElementBalance {
  const counts: Record<Element, number> = { fire: 0, earth: 0, air: 0, water: 0 }
  let total = 0
  for (const p of planets) {
    if (!p.sign) continue
    const el = SIGN_TO_ELEMENT[p.sign]
    if (el) {
      counts[el]++
      total++
    }
  }
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)
  const fire = pct(counts.fire)
  const earth = pct(counts.earth)
  const air = pct(counts.air)
  const water = pct(counts.water)
  const entries: Array<[Element, number]> = [
    ['fire', fire], ['earth', earth], ['air', air], ['water', water],
  ]
  const sorted = [...entries].sort((a, b) => b[1] - a[1])
  const dominant = sorted[0][0]
  const lacking = sorted[3][1] < 15 ? sorted[3][0] : null
  return { fire, earth, air, water, dominant, lacking }
}

function modalityBalance(planets: PlanetBase[]): ModalityBalance {
  const counts: Record<Modality, number> = { cardinal: 0, fixed: 0, mutable: 0 }
  let total = 0
  for (const p of planets) {
    if (!p.sign) continue
    const m = SIGN_TO_MODALITY[p.sign]
    if (m) {
      counts[m]++
      total++
    }
  }
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)
  const cardinal = pct(counts.cardinal)
  const fixed = pct(counts.fixed)
  const mutable = pct(counts.mutable)
  const entries: Array<[Modality, number]> = [
    ['cardinal', cardinal], ['fixed', fixed], ['mutable', mutable],
  ]
  const dominant = entries.sort((a, b) => b[1] - a[1])[0][0]
  return { cardinal, fixed, mutable, dominant }
}

function hemisphereBalance(planets: PlanetBase[]): HemisphereBalance {
  let day = 0, night = 0, east = 0, west = 0
  for (const p of planets) {
    const h = (p as { house?: number }).house
    if (!h) continue
    if (h >= 7 && h <= 12) day++
    else night++
    if ((h >= 10 && h <= 12) || (h >= 1 && h <= 3)) east++
    else west++
  }
  return {
    daytime: day,
    nighttime: night,
    eastern: east,
    western: west,
  }
}

// ============================================================
// Dominant planet (highest aspect score)
// ============================================================

function dominantPlanet(chart: Chart): DominantPlanet | null {
  const aspects = findNatalAspects(chart, { orbs: { default: 8 } })
  const score: Record<string, { total: number; count: number }> = {}
  for (const a of aspects) {
    const fromName = (a.from as { name?: string })?.name || String(a.from)
    const toName = (a.to as { name?: string })?.name || String(a.to)
    const s = a.score ?? 1 - (a.orb ?? 0) / 8
    if (!score[fromName]) score[fromName] = { total: 0, count: 0 }
    if (!score[toName]) score[toName] = { total: 0, count: 0 }
    score[fromName].total += s
    score[fromName].count++
    score[toName].total += s
    score[toName].count++
  }
  const sorted = Object.entries(score).sort((a, b) => b[1].total - a[1].total)
  if (sorted.length === 0) return null
  const [name, info] = sorted[0]
  return { name, totalScore: Number(info.total.toFixed(2)), aspectCount: info.count }
}

// ============================================================
// Chart shape (Marc Edmund Jones)
// ============================================================

function chartShape(planets: PlanetBase[]): ChartShape {
  const longs = planets
    .map((p) => p.longitude)
    .filter((l): l is number => typeof l === 'number')
    .sort((a, b) => a - b)
  if (longs.length === 0) return 'splash'

  // Largest gap between consecutive planets (wrapping the circle).
  const gaps: number[] = []
  for (let i = 0; i < longs.length; i++) {
    const next = (i + 1) % longs.length
    const gap = i + 1 < longs.length
      ? longs[next] - longs[i]
      : 360 - longs[i] + longs[0]
    gaps.push(gap)
  }
  gaps.sort((a, b) => b - a)
  const largestGap = gaps[0]
  const span = 360 - largestGap

  if (span <= 120) return 'bundle'
  if (span <= 180) {
    // Bowl unless one planet sits on the opposite side → bucket
    return 'bowl'
  }
  if (span <= 240) return 'locomotive'
  // Seesaw vs splay vs splash
  // Two big gaps with planets in two clusters opposite each other = seesaw
  if (gaps[1] >= 60) return 'seesaw'
  if (gaps[1] >= 40) return 'splay'
  return 'splash'
}

// ============================================================
// Stellium detection (3+ planets in same sign)
// ============================================================

function detectStelliums(planets: PlanetBase[]): string[] {
  const bySign: Record<string, string[]> = {}
  for (const p of planets) {
    if (!p.sign || !p.name) continue
    if (!bySign[p.sign]) bySign[p.sign] = []
    bySign[p.sign].push(p.name)
  }
  const out: string[] = []
  for (const [sign, names] of Object.entries(bySign)) {
    if (names.length >= 3) {
      out.push(`Stellium in ${SIGN_KO[sign] || sign} (${names.join(', ')})`)
    }
  }
  return out
}

// ============================================================
// Emphasized house (most planets)
// ============================================================

function emphasizedHouse(planets: PlanetBase[]): number | null {
  const counts: Record<number, number> = {}
  for (const p of planets) {
    const h = (p as { house?: number }).house
    if (!h) continue
    counts[h] = (counts[h] || 0) + 1
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (sorted.length === 0 || sorted[0][1] < 2) return null
  return Number(sorted[0][0])
}

// ============================================================
// Main
// ============================================================

export function synthesizeChart(chart: Chart): ChartSynthesis {
  const planets = chart.planets || []
  const sun = planets.find((p) => p.name === 'Sun')
  const moon = planets.find((p) => p.name === 'Moon')
  const ascSign = chart.ascendant?.sign || 'Aries'
  const sunSign = sun?.sign || 'Aries'
  const moonSign = moon?.sign || 'Aries'

  const sunHouse = (sun as { house?: number } | undefined)?.house
  const sigParts: string[] = []
  if (sun) sigParts.push(`태양 ${SIGN_KO[sunSign] || sunSign}${sunHouse ? ` ${sunHouse}H` : ''}`)
  if (moon) {
    const mh = (moon as { house?: number }).house
    sigParts.push(`달 ${SIGN_KO[moonSign] || moonSign}${mh ? ` ${mh}H` : ''}`)
  }
  sigParts.push(`ASC ${SIGN_KO[ascSign] || ascSign}`)
  const signature = sigParts.join(' · ')

  // Aspect patterns from compatibility's detectAspectPattern (re-used).
  const allAspects = findNatalAspects(chart, { orbs: { default: 6 } })
  const patterns: string[] = []
  // Convert to the shape detectAspectPattern expects.
  const shaped = allAspects
    .map((a) => {
      const p1 = (a.from as { name?: string })?.name || String(a.from)
      const p2 = (a.to as { name?: string })?.name || String(a.to)
      // Cast type to ExtendedAspectType via known set
      const t = String(a.type)
      if (
        t === 'conjunction' || t === 'opposition' || t === 'trine' ||
        t === 'square' || t === 'sextile'
      ) {
        return { type: t as 'trine' | 'square' | 'opposition' | 'conjunction' | 'sextile', planet1: p1, planet2: p2 }
      }
      return null
    })
    .filter((x): x is { type: 'trine' | 'square' | 'opposition' | 'conjunction' | 'sextile'; planet1: string; planet2: string } => !!x)

  // detectAspectPattern only returns one — we call it once but also
  // surface stelliums separately.
  const pattern = detectAspectPattern(shaped as Parameters<typeof detectAspectPattern>[0])
  if (pattern) patterns.push(pattern)
  patterns.push(...detectStelliums(planets))

  return {
    signature,
    archetype: buildArchetype(sunSign, ascSign, moonSign),
    balance: {
      element: elementBalance(planets),
      modality: modalityBalance(planets),
      hemisphere: hemisphereBalance(planets),
    },
    dominant: dominantPlanet(chart),
    shape: chartShape(planets),
    patterns,
    emphasizedHouse: emphasizedHouse(planets),
  }
}

// Allow importing the sign metadata for downstream renderers.
export { SIGN_KO, SIGN_TO_ELEMENT, SIGN_TO_MODALITY, SIGN_ORDER }
