/**
 * Couple Matrix — cell-level cross between two people's saju + astrology.
 *
 * The single-person destiny matrix runs 10 layers of saju × astrology
 * cells. Compatibility historically aggregated per-system scores and
 * weighted them, which gives a grade but not cell-level evidence. This
 * module mirrors the matrix philosophy for two people: 6 compatibility-
 * specific layers, each returning cells that pair a saju basis from one
 * person with an astro/saju basis from the other.
 *
 * Layers
 *  L1 element resonance   — A 5요소 × B 4원소 climate
 *  L2 sibsin × planet     — A 일간/십성 × B Venus/Mars/Sun (and reverse)
 *  L3 stem combination    — A 4 stems × B 4 stems → 천간합 5종
 *  L4 branch interaction  — A 4 branches × B 4 branches → 합/충/형/파/해
 *  L5 aspect bridge       — A natal Venus/Mars × B natal Venus/Mars
 *  L6 daewoon sync        — A current 대운 × B current 대운 element flow
 */

import type { CalculateSajuDataResult, FiveElement } from '@/lib/Saju/types'

// ──────────────────────────────────────────────────────────────────────
// Shared types
// ──────────────────────────────────────────────────────────────────────

export interface CoupleMatrixCell {
  layer: 1 | 2 | 3 | 4 | 5 | 6
  rowKey: string
  colKey: string
  score: number // 0-10, deterministic
  sajuBasis: string
  astroBasis: string
  description: string
  polarity: 'positive' | 'negative' | 'neutral'
}

export interface CoupleSajuInput {
  saju: CalculateSajuDataResult
  natal?: {
    planets: Array<{ name: string; sign: string; longitude: number; degree: number; house: number }>
    ascendant?: { sign: string; longitude: number }
  }
  /** Korean age (한국나이) — used for current daewoon resolution. */
  koreanAge: number
}

export interface CoupleMatrixResult {
  layers: {
    L1_element: CoupleMatrixCell[]
    L2_sibsin_planet: CoupleMatrixCell[]
    L3_stem_combination: CoupleMatrixCell[]
    L4_branch_interaction: CoupleMatrixCell[]
    L5_aspect_bridge: CoupleMatrixCell[]
    L6_daewoon_sync: CoupleMatrixCell[]
  }
  summary: {
    totalScore: number
    overlapStrength: number // 0-1
    polarityBalance: { positive: number; negative: number; neutral: number }
    topPositiveCells: CoupleMatrixCell[]
    topCautionCells: CoupleMatrixCell[]
    drivers: string[]
    cautions: string[]
    /** Score 0-100 per couple-specific domain. */
    domainScores: {
      attraction: number // chemistry, magnetic pull
      stability: number // long-term reliability
      growth: number // mutual evolution
      conflict: number // friction tolerance
      timing: number // life-stage sync
    }
  }
}

// ──────────────────────────────────────────────────────────────────────
// L1 element resonance
// 사주 일간/오행 분포(생-극) × 점성 dominant 4원소 (fire/earth/air/water)
// ──────────────────────────────────────────────────────────────────────

const SAJU_TO_WESTERN: Record<FiveElement, 'fire' | 'earth' | 'air' | 'water'> = {
  목: 'air',
  화: 'fire',
  토: 'earth',
  금: 'air',
  수: 'water',
}

const FIVE_ELEMENT_GENERATING: Record<FiveElement, FiveElement> = {
  목: '화',
  화: '토',
  토: '금',
  금: '수',
  수: '목',
}

const FIVE_ELEMENT_OVERCOMING: Record<FiveElement, FiveElement> = {
  목: '토',
  화: '금',
  토: '수',
  금: '목',
  수: '화',
}

function dominantWesternElement(natal: CoupleSajuInput['natal']): 'fire' | 'earth' | 'air' | 'water' | null {
  if (!natal) return null
  const SIGN_ELEM: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
    Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
    Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
    Gemini: 'air', Libra: 'air', Aquarius: 'air',
    Cancer: 'water', Scorpio: 'water', Pisces: 'water',
  }
  const sun = natal.planets.find((p) => p.name === 'Sun')
  const moon = natal.planets.find((p) => p.name === 'Moon')
  const tally: Record<string, number> = {}
  for (const sig of [sun?.sign, moon?.sign, natal.ascendant?.sign]) {
    const e = sig ? SIGN_ELEM[sig] : ''
    if (e) tally[e] = (tally[e] || 0) + 1
  }
  const winner = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0]
  return (winner as 'fire' | 'earth' | 'air' | 'water') || null
}

function analyzeL1ElementResonance(
  a: CoupleSajuInput,
  b: CoupleSajuInput
): CoupleMatrixCell[] {
  const cells: CoupleMatrixCell[] = []
  const aDayElem = a.saju.dayMaster?.element as FiveElement
  const bDayElem = b.saju.dayMaster?.element as FiveElement
  const aWestern = dominantWesternElement(a.natal)
  const bWestern = dominantWesternElement(b.natal)

  // A's day-master vs B's day-master
  if (aDayElem && bDayElem) {
    let score = 5
    let polarity: CoupleMatrixCell['polarity'] = 'neutral'
    let desc = `A 일간 ${aDayElem} ↔ B 일간 ${bDayElem}`
    if (aDayElem === bDayElem) {
      score = 7
      polarity = 'positive'
      desc += ' — 동일 오행 (이해/정체성 일치)'
    } else if (FIVE_ELEMENT_GENERATING[aDayElem] === bDayElem) {
      score = 9
      polarity = 'positive'
      desc += ` — A가 B를 생함 (지지·후원 관계)`
    } else if (FIVE_ELEMENT_GENERATING[bDayElem] === aDayElem) {
      score = 9
      polarity = 'positive'
      desc += ` — B가 A를 생함 (지지·후원 관계)`
    } else if (FIVE_ELEMENT_OVERCOMING[aDayElem] === bDayElem) {
      score = 3
      polarity = 'negative'
      desc += ` — A가 B를 극함 (긴장)`
    } else if (FIVE_ELEMENT_OVERCOMING[bDayElem] === aDayElem) {
      score = 3
      polarity = 'negative'
      desc += ` — B가 A를 극함 (긴장)`
    }
    cells.push({
      layer: 1,
      rowKey: 'A.dayMaster',
      colKey: 'B.dayMaster',
      score,
      sajuBasis: `A 일간 ${aDayElem}`,
      astroBasis: `B 일간 ${bDayElem}`,
      description: desc,
      polarity,
    })
  }

  // A's day-master saju element ↔ B's western dominant element (and vice versa)
  if (aDayElem && bWestern) {
    const aWesternEquiv = SAJU_TO_WESTERN[aDayElem]
    const same = aWesternEquiv === bWestern
    cells.push({
      layer: 1,
      rowKey: 'A.dayMasterElement',
      colKey: 'B.dominantWestern',
      score: same ? 8 : 5,
      sajuBasis: `A 일간 ${aDayElem} (${aWesternEquiv})`,
      astroBasis: `B dominant ${bWestern}`,
      description: same ? '에너지 결 일치' : '에너지 결 보완',
      polarity: same ? 'positive' : 'neutral',
    })
  }
  if (bDayElem && aWestern) {
    const bWesternEquiv = SAJU_TO_WESTERN[bDayElem]
    const same = bWesternEquiv === aWestern
    cells.push({
      layer: 1,
      rowKey: 'B.dayMasterElement',
      colKey: 'A.dominantWestern',
      score: same ? 8 : 5,
      sajuBasis: `B 일간 ${bDayElem} (${bWesternEquiv})`,
      astroBasis: `A dominant ${aWestern}`,
      description: same ? '에너지 결 일치' : '에너지 결 보완',
      polarity: same ? 'positive' : 'neutral',
    })
  }

  return cells
}

// ──────────────────────────────────────────────────────────────────────
// L2 sibsin × planet  (A's 일간 → B's Venus/Mars/Sun, and reverse)
// 명리학에서 일간이 상대 행성을 어떻게 받아들이는지
// ──────────────────────────────────────────────────────────────────────

function analyzeL2SibsinPlanet(
  a: CoupleSajuInput,
  b: CoupleSajuInput
): CoupleMatrixCell[] {
  const cells: CoupleMatrixCell[] = []
  const targets = ['Venus', 'Mars', 'Sun', 'Moon']
  for (const dir of ['A→B', 'B→A'] as const) {
    const self = dir === 'A→B' ? a : b
    const other = dir === 'A→B' ? b : a
    const selfDay = self.saju.dayMaster?.element as FiveElement | undefined
    if (!selfDay || !other.natal) continue
    const otherNatal = other.natal
    for (const planetName of targets) {
      const planet = otherNatal.planets.find((p) => p.name === planetName)
      if (!planet) continue
      // Score by sign element vs self day master
      const SIGN_TO_FIVE: Record<string, FiveElement> = {
        Aries: '화', Leo: '화', Sagittarius: '화',
        Taurus: '토', Virgo: '토', Capricorn: '토',
        Gemini: '목', Libra: '금', Aquarius: '금',
        Cancer: '수', Scorpio: '수', Pisces: '수',
      }
      const planetElem = SIGN_TO_FIVE[planet.sign]
      if (!planetElem) continue
      let score = 5
      let polarity: CoupleMatrixCell['polarity'] = 'neutral'
      let note = ''
      if (planetElem === selfDay) {
        score = 7
        polarity = 'positive'
        note = '자기 정체성 강화'
      } else if (FIVE_ELEMENT_GENERATING[planetElem] === selfDay) {
        score = 9
        polarity = 'positive'
        note = '상대가 자기를 받쳐줌'
      } else if (FIVE_ELEMENT_GENERATING[selfDay] === planetElem) {
        score = 7
        polarity = 'positive'
        note = '자기가 상대 에너지를 풀어줌'
      } else if (FIVE_ELEMENT_OVERCOMING[planetElem] === selfDay) {
        score = 3
        polarity = 'negative'
        note = '상대 행성이 자기를 누름'
      } else if (FIVE_ELEMENT_OVERCOMING[selfDay] === planetElem) {
        score = 4
        polarity = 'negative'
        note = '자기가 상대 행성을 통제'
      }
      cells.push({
        layer: 2,
        rowKey: `${dir}.dayMaster`,
        colKey: `${dir.split('→')[1]}.${planetName}`,
        score,
        sajuBasis: `${dir.split('→')[0]} 일간 ${selfDay}`,
        astroBasis: `${dir.split('→')[1]} ${planetName} in ${planet.sign} (${planetElem})`,
        description: `${dir} 일간 vs ${planetName} — ${note}`,
        polarity,
      })
    }
  }
  return cells
}

// ──────────────────────────────────────────────────────────────────────
// L3 stem combination  (천간합 5종 cross)
// ──────────────────────────────────────────────────────────────────────

const STEM_PAIRS: Array<[string, string, FiveElement, string]> = [
  ['甲', '己', '토', '갑기합화토'],
  ['乙', '庚', '금', '을경합화금'],
  ['丙', '辛', '수', '병신합화수'],
  ['丁', '壬', '목', '정임합화목'],
  ['戊', '癸', '화', '무계합화화'],
]

function analyzeL3StemCombination(
  a: CoupleSajuInput,
  b: CoupleSajuInput
): CoupleMatrixCell[] {
  const cells: CoupleMatrixCell[] = []
  const aStems = [
    { pos: '년', name: a.saju.yearPillar.heavenlyStem.name },
    { pos: '월', name: a.saju.monthPillar.heavenlyStem.name },
    { pos: '일', name: a.saju.dayPillar.heavenlyStem.name },
    { pos: '시', name: a.saju.timePillar.heavenlyStem.name },
  ]
  const bStems = [
    { pos: '년', name: b.saju.yearPillar.heavenlyStem.name },
    { pos: '월', name: b.saju.monthPillar.heavenlyStem.name },
    { pos: '일', name: b.saju.dayPillar.heavenlyStem.name },
    { pos: '시', name: b.saju.timePillar.heavenlyStem.name },
  ]
  for (const ai of aStems) {
    for (const bi of bStems) {
      for (const [x, y, elem, label] of STEM_PAIRS) {
        if ((ai.name === x && bi.name === y) || (ai.name === y && bi.name === x)) {
          const score = ai.pos === '일' && bi.pos === '일' ? 10 : 8
          cells.push({
            layer: 3,
            rowKey: `A.${ai.pos}주`,
            colKey: `B.${bi.pos}주`,
            score,
            sajuBasis: `A ${ai.pos}주 천간 ${ai.name}`,
            astroBasis: `B ${bi.pos}주 천간 ${bi.name}`,
            description: `${label} (${elem}) — ${ai.pos === '일' && bi.pos === '일' ? '일주합 (최강 결속)' : '천간합'}`,
            polarity: 'positive',
          })
        }
      }
    }
  }
  return cells
}

// ──────────────────────────────────────────────────────────────────────
// L4 branch interaction  (지지 합/충/형/파/해 cross)
// ──────────────────────────────────────────────────────────────────────

const SAMHAP: Array<[string[], FiveElement, string]> = [
  [['寅', '午', '戌'], '화', '인오술 화국'],
  [['申', '子', '辰'], '수', '신자진 수국'],
  [['亥', '卯', '未'], '목', '해묘미 목국'],
  [['巳', '酉', '丑'], '금', '사유축 금국'],
]
const YUKHAP: Array<[string, string, string]> = [
  ['子', '丑', '자축합'],
  ['寅', '亥', '인해합'],
  ['卯', '戌', '묘술합'],
  ['辰', '酉', '진유합'],
  ['巳', '申', '사신합'],
  ['午', '未', '오미합'],
]
const CHUNG: Array<[string, string]> = [
  ['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥'],
]
const HYEONG: Array<[string, string]> = [
  ['寅', '巳'], ['巳', '申'], ['申', '寅'], ['丑', '戌'], ['戌', '未'], ['未', '丑'], ['子', '卯'],
]
const PA: Array<[string, string]> = [
  ['子', '酉'], ['寅', '亥'], ['辰', '丑'], ['午', '卯'], ['申', '巳'], ['戌', '未'],
]
const HAE: Array<[string, string]> = [
  ['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌'],
]

function pairMatch(arr: Array<[string, string]>, x: string, y: string): boolean {
  return arr.some((p) => (p[0] === x && p[1] === y) || (p[0] === y && p[1] === x))
}

function analyzeL4BranchInteraction(
  a: CoupleSajuInput,
  b: CoupleSajuInput
): CoupleMatrixCell[] {
  const cells: CoupleMatrixCell[] = []
  const aBranches = [
    { pos: '년', name: a.saju.yearPillar.earthlyBranch.name },
    { pos: '월', name: a.saju.monthPillar.earthlyBranch.name },
    { pos: '일', name: a.saju.dayPillar.earthlyBranch.name },
    { pos: '시', name: a.saju.timePillar.earthlyBranch.name },
  ]
  const bBranches = [
    { pos: '년', name: b.saju.yearPillar.earthlyBranch.name },
    { pos: '월', name: b.saju.monthPillar.earthlyBranch.name },
    { pos: '일', name: b.saju.dayPillar.earthlyBranch.name },
    { pos: '시', name: b.saju.timePillar.earthlyBranch.name },
  ]

  for (const ai of aBranches) {
    for (const bi of bBranches) {
      // 육합
      for (const [x, y, label] of YUKHAP) {
        if ((ai.name === x && bi.name === y) || (ai.name === y && bi.name === x)) {
          cells.push({
            layer: 4, rowKey: `A.${ai.pos}지`, colKey: `B.${bi.pos}지`,
            score: ai.pos === '일' && bi.pos === '일' ? 10 : 8,
            sajuBasis: `A ${ai.pos}지 ${ai.name}`, astroBasis: `B ${bi.pos}지 ${bi.name}`,
            description: `${label} — 친밀한 결속`, polarity: 'positive',
          })
        }
      }
      // 충
      if (pairMatch(CHUNG, ai.name, bi.name)) {
        cells.push({
          layer: 4, rowKey: `A.${ai.pos}지`, colKey: `B.${bi.pos}지`,
          score: ai.pos === '일' && bi.pos === '일' ? 1 : 3,
          sajuBasis: `A ${ai.pos}지 ${ai.name}`, astroBasis: `B ${bi.pos}지 ${bi.name}`,
          description: `${ai.name}-${bi.name} 충 — 충돌·이별 신호`, polarity: 'negative',
        })
      }
      // 형
      if (pairMatch(HYEONG, ai.name, bi.name)) {
        cells.push({
          layer: 4, rowKey: `A.${ai.pos}지`, colKey: `B.${bi.pos}지`,
          score: 3,
          sajuBasis: `A ${ai.pos}지 ${ai.name}`, astroBasis: `B ${bi.pos}지 ${bi.name}`,
          description: `${ai.name}-${bi.name} 형 — 갈등·소송`, polarity: 'negative',
        })
      }
      // 파
      if (pairMatch(PA, ai.name, bi.name)) {
        cells.push({
          layer: 4, rowKey: `A.${ai.pos}지`, colKey: `B.${bi.pos}지`,
          score: 4,
          sajuBasis: `A ${ai.pos}지 ${ai.name}`, astroBasis: `B ${bi.pos}지 ${bi.name}`,
          description: `${ai.name}-${bi.name} 파 — 균열`, polarity: 'negative',
        })
      }
      // 해
      if (pairMatch(HAE, ai.name, bi.name)) {
        cells.push({
          layer: 4, rowKey: `A.${ai.pos}지`, colKey: `B.${bi.pos}지`,
          score: 4,
          sajuBasis: `A ${ai.pos}지 ${ai.name}`, astroBasis: `B ${bi.pos}지 ${bi.name}`,
          description: `${ai.name}-${bi.name} 해 — 방해·헐뜯음`, polarity: 'negative',
        })
      }
    }
  }
  // 삼합 — 두 사람 합쳐 3개 모이는 경우
  for (const [trio, elem, label] of SAMHAP) {
    const aSet = new Set(aBranches.map((x) => x.name))
    const bSet = new Set(bBranches.map((x) => x.name))
    const inA = trio.filter((b) => aSet.has(b))
    const inB = trio.filter((b) => bSet.has(b))
    if (inA.length + inB.length >= 3 && inA.length > 0 && inB.length > 0) {
      cells.push({
        layer: 4, rowKey: 'A.지지', colKey: 'B.지지',
        score: 10, sajuBasis: `A ${inA.join(',')}`, astroBasis: `B ${inB.join(',')}`,
        description: `${label} 완성 — 강력한 공동 목적 (${elem})`, polarity: 'positive',
      })
    }
  }
  return cells
}

// ──────────────────────────────────────────────────────────────────────
// L5 aspect bridge  (점성 어스펙트 cross — A's Venus × B's Mars 등)
// ──────────────────────────────────────────────────────────────────────

const SIGN_START: Record<string, number> = {
  Aries: 0, Taurus: 30, Gemini: 60, Cancer: 90, Leo: 120, Virgo: 150,
  Libra: 180, Scorpio: 210, Sagittarius: 240, Capricorn: 270, Aquarius: 300, Pisces: 330,
}

function analyzeL5AspectBridge(
  a: CoupleSajuInput,
  b: CoupleSajuInput
): CoupleMatrixCell[] {
  const cells: CoupleMatrixCell[] = []
  if (!a.natal || !b.natal) return cells
  const targets = ['Venus', 'Mars', 'Sun', 'Moon', 'Jupiter']
  for (const aName of targets) {
    for (const bName of targets) {
      const ap = a.natal.planets.find((p) => p.name === aName)
      const bp = b.natal.planets.find((p) => p.name === bName)
      if (!ap || !bp) continue
      let diff = Math.abs(ap.longitude - bp.longitude)
      if (diff > 180) diff = 360 - diff
      const aspects: Array<[string, number, number, CoupleMatrixCell['polarity'], number]> = [
        ['conjunction', 0, 8, 'positive', 9],
        ['sextile', 60, 5, 'positive', 7],
        ['trine', 120, 7, 'positive', 9],
        ['opposition', 180, 8, 'negative', 4],
        ['square', 90, 7, 'negative', 4],
      ]
      for (const [name, target, orb, polarity, baseScore] of aspects) {
        const orbDiff = Math.abs(diff - target)
        if (orbDiff <= orb) {
          const tightness = 1 - orbDiff / orb
          const score = Math.round(baseScore * (0.6 + 0.4 * tightness))
          cells.push({
            layer: 5,
            rowKey: `A.${aName}`,
            colKey: `B.${bName}`,
            score,
            sajuBasis: `A ${aName} ${ap.sign}`,
            astroBasis: `B ${bName} ${bp.sign}`,
            description: `${aName} ${name} ${bName} (orb ${orbDiff.toFixed(1)}°)`,
            polarity,
          })
          break
        }
      }
    }
  }
  return cells
}

// ──────────────────────────────────────────────────────────────────────
// L6 daewoon sync  (현재 대운 element 흐름)
// ──────────────────────────────────────────────────────────────────────

const STEM_TO_ELEM: Record<string, FiveElement> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토',
  庚: '금', 辛: '금', 壬: '수', 癸: '수',
}

function analyzeL6DaewoonSync(
  a: CoupleSajuInput,
  b: CoupleSajuInput
): CoupleMatrixCell[] {
  const cells: CoupleMatrixCell[] = []
  const aDaeun = ((a.saju as any).unse?.daeun || []) as Array<{ age: number; heavenlyStem: string }>
  const bDaeun = ((b.saju as any).unse?.daeun || []) as Array<{ age: number; heavenlyStem: string }>
  const aCur = [...aDaeun].reverse().find((d) => a.koreanAge >= d.age)
  const bCur = [...bDaeun].reverse().find((d) => b.koreanAge >= d.age)
  if (!aCur || !bCur) return cells
  const aElem = STEM_TO_ELEM[aCur.heavenlyStem]
  const bElem = STEM_TO_ELEM[bCur.heavenlyStem]
  if (!aElem || !bElem) return cells
  let score = 5
  let polarity: CoupleMatrixCell['polarity'] = 'neutral'
  let note = ''
  if (aElem === bElem) {
    score = 9
    polarity = 'positive'
    note = '동일 대운 흐름 — 같은 시기 같은 결'
  } else if (FIVE_ELEMENT_GENERATING[aElem] === bElem || FIVE_ELEMENT_GENERATING[bElem] === aElem) {
    score = 8
    polarity = 'positive'
    note = '상생 대운 — 서로의 시기를 키워줌'
  } else if (FIVE_ELEMENT_OVERCOMING[aElem] === bElem || FIVE_ELEMENT_OVERCOMING[bElem] === aElem) {
    score = 3
    polarity = 'negative'
    note = '상극 대운 — 시기 차이로 마찰 가능'
  }
  cells.push({
    layer: 6,
    rowKey: 'A.currentDaeun',
    colKey: 'B.currentDaeun',
    score,
    sajuBasis: `A ${aCur.heavenlyStem} 대운 (${aElem})`,
    astroBasis: `B ${bCur.heavenlyStem} 대운 (${bElem})`,
    description: `현재 대운 흐름 — ${note}`,
    polarity,
  })
  return cells
}

// ──────────────────────────────────────────────────────────────────────
// Aggregator
// ──────────────────────────────────────────────────────────────────────

export function buildCoupleMatrix(
  a: CoupleSajuInput,
  b: CoupleSajuInput
): CoupleMatrixResult {
  const L1 = analyzeL1ElementResonance(a, b)
  const L2 = analyzeL2SibsinPlanet(a, b)
  const L3 = analyzeL3StemCombination(a, b)
  const L4 = analyzeL4BranchInteraction(a, b)
  const L5 = analyzeL5AspectBridge(a, b)
  const L6 = analyzeL6DaewoonSync(a, b)
  const all = [...L1, ...L2, ...L3, ...L4, ...L5, ...L6]

  const polCount = { positive: 0, negative: 0, neutral: 0 }
  let scoreSum = 0
  for (const c of all) {
    polCount[c.polarity] += 1
    scoreSum += c.score
  }
  const total = all.length || 1
  const avgScore = scoreSum / total
  const overlapStrength = Math.min(1, all.filter((c) => c.polarity !== 'neutral').length / 12)

  const sortedDesc = [...all].sort((a, b) => b.score - a.score)
  const topPositive = sortedDesc.filter((c) => c.polarity === 'positive').slice(0, 5)
  const topCaution = [...all].filter((c) => c.polarity === 'negative').sort((a, b) => a.score - b.score).slice(0, 5)

  // Domain scores
  const clamp01_100 = (v: number) => Math.max(0, Math.min(100, v))
  const attraction = Math.round(
    clamp01_100(
      avgScoreOfLayers(all, [3, 5]) * 12 + // stem-combo + venus-mars aspect
        Math.max(0, polCount.positive - polCount.negative) * 2
    )
  )
  const stability = Math.round(
    clamp01_100(avgScoreOfLayers(all, [1, 4]) * 11 - polCount.negative * 3)
  )
  const growth = Math.round(clamp01_100(avgScoreOfLayers(all, [1, 2, 6]) * 11))
  const conflict = Math.round(
    Math.max(0, Math.min(100, 100 - polCount.negative * 12 + polCount.positive * 2))
  )
  const timing = Math.round(
    clamp01_100(avgScoreOfLayers(all, [6]) * 12 + avgScoreOfLayers(all, [4]) * 5)
  )

  const drivers: string[] = []
  if (topPositive[0]) drivers.push(topPositive[0].description)
  if (L3.length > 0) drivers.push(`천간합 ${L3.length}건 — 화학적 끌림`)
  if (L4.filter((c) => c.polarity === 'positive').length >= 2) drivers.push('지지 합/삼합 다수 — 강한 결속')

  const cautions: string[] = []
  if (topCaution[0]) cautions.push(topCaution[0].description)
  const chungs = L4.filter((c) => c.description.includes('충'))
  if (chungs.length > 0) cautions.push(`지지 충 ${chungs.length}건 — 충돌 신호`)

  return {
    layers: {
      L1_element: L1,
      L2_sibsin_planet: L2,
      L3_stem_combination: L3,
      L4_branch_interaction: L4,
      L5_aspect_bridge: L5,
      L6_daewoon_sync: L6,
    },
    summary: {
      totalScore: Math.round(avgScore * 10),
      overlapStrength: Number(overlapStrength.toFixed(2)),
      polarityBalance: polCount,
      topPositiveCells: topPositive,
      topCautionCells: topCaution,
      drivers,
      cautions,
      domainScores: { attraction, stability, growth, conflict, timing },
    },
  }
}

function avgScoreOfLayers(cells: CoupleMatrixCell[], layers: number[]): number {
  const filtered = cells.filter((c) => layers.includes(c.layer))
  if (filtered.length === 0) return 0
  return filtered.reduce((s, c) => s + c.score, 0) / filtered.length
}
