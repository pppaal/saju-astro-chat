/**
 * 사주 시너스트리 구조화 추출 — 차트(시각)용. formatSajuSynastry(텍스트)와 *같은
 * 모듈 헬퍼·canon 표*(sajuSynastryData)를 재사용해 동일 계산을 구조화 객체로 반환한다.
 * "차트 = 상담사" 정합(점성의 calculateSynastry 와 동일 SSOT 정책)을 보장한다.
 */

import { HYEONG_PAIR_TRIO, BRANCH_HYEONG_PAIR, SELF_HYEONG } from '@/lib/saju/hyeong'
import {
  type SajuPillarInput,
  type SajuSynastryInput,
  STEM_HAP,
  STEM_CHUNG,
  BRANCH_HAP,
  BRANCH_CHUNG,
  BRANCH_HAE,
  BRANCH_PA,
  STEM_EL,
  BRANCH_MAIN_STEM,
  sibseongFor,
  BRANCH_EL,
  EL_CONTROLS,
  sibsinOf,
  PILLAR_LABELS,
} from './sajuSynastryData'

export interface SajuCompatDayMaster {
  aStem: string
  aEl: string
  bStem: string
  bEl: string
  /** A→B 오행 관계 */
  relation: 'same' | 'aControlsB' | 'bControlsA' | 'generate'
  relationLabel: string
  /** B 가 A 에게 무슨 십성인가 */
  bToA: string | null
  /** A 가 B 에게 무슨 십성인가 */
  aToB: string | null
}

export interface SajuCompatSpouseStar {
  /** 누구 일간 기준인가 */
  from: 'A' | 'B'
  sibsin: string
  role: string
  pillar: '년' | '월' | '일' | '시'
  isDayPillar: boolean
  source: 'stem' | 'branch'
  char: string
}

export interface SajuCompatPillarRel {
  aPillar: '년' | '월' | '일' | '시'
  bPillar: '년' | '월' | '일' | '시'
  aChar: string
  bChar: string
  layer: 'stem' | 'branch'
  tags: string[]
  element?: string
  tone: 'bond' | 'clash' | 'friction' | 'minor'
  isDayInvolved: boolean
}

export interface SajuCompatElementBalance {
  merged: Record<string, number>
  a: Record<string, number>
  b: Record<string, number>
  range: number
  balanced: boolean
  strongest: string
  weakest: string
}

export interface SajuCompatFacts {
  dayMaster: SajuCompatDayMaster | null
  spouseStars: SajuCompatSpouseStar[]
  pillarRelations: SajuCompatPillarRel[]
  elementBalance: SajuCompatElementBalance | null
}

const SPOUSE_STARS = new Set(['정재', '편재', '정관', '편관'])
const SPOUSE_ROLE: Record<string, string> = {
  정재: '처성(안정·가정)',
  편재: '처성(활달·자유)',
  정관: '부성(책임·안정)',
  편관: '부성(열정·자극)',
}

export function computeSajuSynastryFacts(input: SajuSynastryInput): SajuCompatFacts {
  const A = input.pillarsA ?? []
  const B = input.pillarsB ?? []
  const aDay = A[2]
  const bDay = B[2]

  // 1. 일간 — formatSajuSynastry 의 일간 cross 와 동일 규칙.
  let dayMaster: SajuCompatDayMaster | null = null
  if (aDay?.stem && bDay?.stem) {
    const elA = STEM_EL[aDay.stem]
    const elB = STEM_EL[bDay.stem]
    if (elA && elB) {
      let relation: SajuCompatDayMaster['relation']
      let relationLabel: string
      if (elA === elB) {
        relation = 'same'
        relationLabel = `같은 오행 (${elA}) — 비화`
      } else if (EL_CONTROLS[elA] === elB) {
        relation = 'aControlsB'
        relationLabel = `${elA}극${elB}, 다듬어주는 흐름`
      } else if (EL_CONTROLS[elB] === elA) {
        relation = 'bControlsA'
        relationLabel = `${elB}극${elA}, 다듬어주는 흐름`
      } else {
        relation = 'generate'
        relationLabel = '상생 — 서로 보완'
      }
      dayMaster = {
        aStem: aDay.stem,
        aEl: elA,
        bStem: bDay.stem,
        bEl: elB,
        relation,
        relationLabel,
        bToA: sibsinOf(aDay.stem, bDay.stem),
        aToB: sibsinOf(bDay.stem, aDay.stem),
      }
    }
  }

  // 2. 배우자성 — findSpouseSignals 와 동일 (stem + 지지 본기).
  const spouseStars: SajuCompatSpouseStar[] = []
  const collectSpouse = (from: 'A' | 'B', dayStem: string, other: SajuPillarInput[]) => {
    other.forEach((p, idx) => {
      if (p.stem) {
        const s = sibseongFor(dayStem, p.stem)
        if (SPOUSE_STARS.has(s)) {
          spouseStars.push({
            from,
            sibsin: s,
            role: SPOUSE_ROLE[s],
            pillar: PILLAR_LABELS[idx],
            isDayPillar: idx === 2,
            source: 'stem',
            char: p.stem,
          })
        }
      }
      const branchStem = BRANCH_MAIN_STEM[p.branch]
      if (branchStem) {
        const sBr = sibseongFor(dayStem, branchStem)
        if (SPOUSE_STARS.has(sBr)) {
          spouseStars.push({
            from,
            sibsin: sBr,
            role: SPOUSE_ROLE[sBr],
            pillar: PILLAR_LABELS[idx],
            isDayPillar: idx === 2,
            source: 'branch',
            char: p.branch,
          })
        }
      }
    })
  }
  if (aDay?.stem && bDay?.stem) {
    collectSpouse('A', aDay.stem, B)
    collectSpouse('B', bDay.stem, A)
  }

  // 3. 기둥 관계 — 천간합/충 + 지지 합/충/형/자형/해/파 (동일 표·규칙).
  const pillarRelations: SajuCompatPillarRel[] = []
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const aS = A[i]?.stem
      const bS = B[j]?.stem
      if (aS && bS) {
        const hap = STEM_HAP[aS]
        if (hap && hap.other === bS) {
          pillarRelations.push({
            aPillar: PILLAR_LABELS[i],
            bPillar: PILLAR_LABELS[j],
            aChar: aS,
            bChar: bS,
            layer: 'stem',
            tags: ['천간합'],
            element: hap.element,
            tone: 'bond',
            isDayInvolved: i === 2 || j === 2,
          })
        }
        if (STEM_CHUNG[aS] === bS) {
          pillarRelations.push({
            aPillar: PILLAR_LABELS[i],
            bPillar: PILLAR_LABELS[j],
            aChar: aS,
            bChar: bS,
            layer: 'stem',
            tags: ['천간충'],
            tone: 'clash',
            isDayInvolved: i === 2 || j === 2,
          })
        }
      }
      const aBr = A[i]?.branch
      const bBr = B[j]?.branch
      if (!aBr || !bBr) continue
      const tags: string[] = []
      let element: string | undefined
      if (BRANCH_HAP[aBr]?.other === bBr) {
        tags.push('육합')
        element = BRANCH_HAP[aBr]?.element
      }
      if (BRANCH_CHUNG[aBr] === bBr) tags.push('충')
      if (BRANCH_HYEONG_PAIR[aBr] === bBr || HYEONG_PAIR_TRIO.has(aBr + bBr)) tags.push('형')
      if (SELF_HYEONG.has(aBr) && aBr === bBr) tags.push('자형')
      if (BRANCH_HAE[aBr] === bBr) tags.push('해')
      if (BRANCH_PA[aBr] === bBr) tags.push('파')
      if (tags.length === 0) continue
      const hasClash = tags.some((t) => t === '충' || t === '형' || t === '자형')
      const tone: SajuCompatPillarRel['tone'] = hasClash
        ? 'clash'
        : tags.includes('육합')
          ? 'bond'
          : tags.includes('해')
            ? 'friction'
            : 'minor'
      pillarRelations.push({
        aPillar: PILLAR_LABELS[i],
        bPillar: PILLAR_LABELS[j],
        aChar: aBr,
        bChar: bBr,
        layer: 'branch',
        tags,
        element,
        tone,
        isDayInvolved: i === 2 || j === 2,
      })
    }
  }

  // 4. 오행 균형 — 동일 집계 (천간 + 지지, 두 사람 합산).
  let elementBalance: SajuCompatElementBalance | null = null
  if (A.length && B.length) {
    const els = ['목', '화', '토', '금', '수']
    const countsA: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
    const countsB: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
    for (const p of A) {
      if (STEM_EL[p.stem]) countsA[STEM_EL[p.stem]]++
      if (BRANCH_EL[p.branch]) countsA[BRANCH_EL[p.branch]]++
    }
    for (const p of B) {
      if (STEM_EL[p.stem]) countsB[STEM_EL[p.stem]]++
      if (BRANCH_EL[p.branch]) countsB[BRANCH_EL[p.branch]]++
    }
    const merged: Record<string, number> = {}
    for (const e of els) merged[e] = countsA[e] + countsB[e]
    const sorted = [...els].sort((x, y) => merged[y] - merged[x])
    const range = merged[sorted[0]] - merged[sorted[4]]
    elementBalance = {
      merged,
      a: countsA,
      b: countsB,
      range,
      balanced: range < 4,
      strongest: sorted[0],
      weakest: sorted[4],
    }
  }

  return { dayMaster, spouseStars, pillarRelations, elementBalance }
}
