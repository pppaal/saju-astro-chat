// src/lib/Saju/relations.ts

import { STEMS } from './constants'
import type { FiveElement, PillarKind, RelationHit } from './types'
import {
  STEM_COMBINE,
  STEM_CLASH_4,
  STEM_CLASH_5_EXTRA,
  STEM_CLASH_10,
  SIX_HARMONY,
  THREE_HARMONY,
  BRANCH_CLASH,
  BREAK_PAIRS,
  HARM_PAIRS,
  RESENTMENT_PAIRS,
  PUNISHMENT_TRIOS,
  PUNISHMENT_PAIR,
  ALL_BRANCHES,
  toBidiRecord,
  toPairKeySet,
  halfHarmonyPairs,
} from './relationTables'
import { getGongmang as getGongmangByPillar } from './pillarLookup'

/* ========== 옵션/유틸 ========== */
export interface AnalyzeRelationsOptions {
  includeHeavenly: boolean // 천간 관계 포함
  includeEarthly: boolean // 지지 관계 포함
  includeGongmang: boolean // 공망 포함
  includeHeavenlyTransformNote?: boolean // 천간 합화 오행 표기
  includeTrineElementNote?: boolean // 삼합/방합 변국 오행 표기
  includeSelfPunish?: boolean // 자기형 포함(子子, 午午 등)

  // 공망 산정 기준
  // - 'dayPillar-60jiazi': 일주(60갑자) 기준 공망표 사용(권장, 첨부표와 일치)
  // - 'dayMaster-basic'  : 일간만으로 6패턴 반복(종전 방식)
  // - 'yearPillar-basic' : 연간만으로 6패턴 반복
  gongmangPolicy?: 'dayPillar-60jiazi' | 'dayMaster-basic' | 'yearPillar-basic'

  // 천간충 판정 폭
  // - '4'  : 갑-경, 을-신, 병-임, 정-계 (기존)
  // - '5'  : 위 4쌍 + 무-갑, 기-을
  // - '10' : 양간↔양간, 음간↔음간 전부(갑↔경, 병↔임, 무↔갑… 등 10쌍)
  heavenlyClashMode?: '4' | '5' | '10'
}

export const DEFAULT_RELATION_OPTIONS: AnalyzeRelationsOptions = {
  includeHeavenly: true,
  includeEarthly: true,
  includeGongmang: true,
  includeHeavenlyTransformNote: true,
  includeTrineElementNote: true,
  includeSelfPunish: true,
  gongmangPolicy: 'dayPillar-60jiazi',
  heavenlyClashMode: '5',
}

const stemIndex = (name: string) => STEMS.findIndex((s) => s.name === name)
const inSetPair = (a: string, b: string, set: Set<string>) => set.has(`${a}-${b}`)

/* 공통: 한글 지지 → 한자 */
const BRANCH_KO_TO_HAN: Record<string, string> = {
  자: '子',
  축: '丑',
  인: '寅',
  묘: '卯',
  진: '辰',
  사: '巳',
  오: '午',
  미: '未',
  신: '申',
  유: '酉',
  술: '戌',
  해: '亥',
}
export function normalizeBranchName(n: string): string {
  const t = String(n || '').trim()
  return BRANCH_KO_TO_HAN[t] || t
}

/* ========== 천간 관계 — relationTables.ts(SSOT)에서 파생 ========== */
// 천간합(합화 오행). canon STEM_COMBINE 의 첫 천간 기준 5키.
const HEAVENLY_COMBINES: Record<string, { pair: string; transform?: FiveElement }> = (() => {
  const r: Record<string, { pair: string; transform?: FiveElement }> = {}
  for (const { pair, element } of STEM_COMBINE) {
    r[pair[0]] = { pair: pair[1], transform: element }
  }
  return r
})()

// 천간충 세트(모드별)
const HEAVENLY_CLASH_SETS = {
  '4': toPairKeySet(STEM_CLASH_4),
  '5': toPairKeySet([...STEM_CLASH_4, ...STEM_CLASH_5_EXTRA]),
  // 10쌍: 양간끼리/음간끼리 상충 전부
  '10': toPairKeySet(STEM_CLASH_10),
}

function analyzeHeavenly(
  p: PillarInput,
  includeTransformNote: boolean,
  clashMode: AnalyzeRelationsOptions['heavenlyClashMode']
): RelationHit[] {
  const hits: RelationHit[] = []
  const pairs: Array<[PillarKind, string]> = [
    ['year', p.year.heavenlyStem],
    ['month', p.month.heavenlyStem],
    ['day', p.day.heavenlyStem],
    ['time', p.time.heavenlyStem],
  ]
  const CLASH = HEAVENLY_CLASH_SETS[clashMode || '5']

  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      const [ak, a] = pairs[i]
      const [bk, b] = pairs[j]

      // 합
      const c1 = HEAVENLY_COMBINES[a]
      const c2 = HEAVENLY_COMBINES[b]
      if (c1?.pair === b || c2?.pair === a) {
        const tr = c1?.pair === b ? c1.transform : c2?.transform
        const d = includeTransformNote && tr ? `${a}-${b} 합화${tr}` : `${a}-${b} 합`
        hits.push({ kind: '천간합', pillars: [ak, bk], detail: d })
      }

      // 충
      if (CLASH.has(`${a}-${b}`)) {
        hits.push({ kind: '천간충', pillars: [ak, bk], detail: `${a}-${b} 충` })
      }
    }
  }
  return hits
}

/* ========== 지지 관계 — relationTables.ts(SSOT)에서 파생 ========== */
// 육합
const EARTHLY_SIX_COMBINES: Record<string, string> = toBidiRecord(SIX_HARMONY.map((h) => h.pair))

// 삼합(삼합국)
const EARTHLY_TRINES: Array<{ set: [string, string, string]; element: FiveElement }> =
  THREE_HARMONY.map((t) => ({ set: [...t.members] as [string, string, string], element: t.element }))

// 방합(반합) — 삼합 트리오의 인접 2지지 반합 쌍
const EARTHLY_HALF_TRINES: Array<{ pair: [string, string]; element: FiveElement }> =
  halfHarmonyPairs().map((h) => ({ pair: [...h.pair] as [string, string], element: h.element }))

// 충(정충)
const EARTHLY_CLASH_PAIRS = toPairKeySet(BRANCH_CLASH)

// 형(삼형 + 특수형 + 자기형 옵션). 자형은 엔진 정책상 12지지 전부 인정(완화판).
const EARTHLY_PUNISH_SETS: Array<Set<string>> = PUNISHMENT_TRIOS.map((t) => new Set(t))
const EARTHLY_PUNISH_PAIRS = toPairKeySet([PUNISHMENT_PAIR])
const SELF_PUNISH_PAIRS = new Set(ALL_BRANCHES.map((b) => `${b}-${b}`))

// 파
const EARTHLY_BREAK_PAIRS = toPairKeySet(BREAK_PAIRS)

// 해
const EARTHLY_HARM_PAIRS = toPairKeySet(HARM_PAIRS)

// 원진 — 표준 6쌍(canon). 과거 해(害) 표로 잘못 복제되던 버그를 SSOT로 제거.
const EARTHLY_YUANJIN_PAIRS = toPairKeySet(RESENTMENT_PAIRS)

function analyzeEarthly(
  p: PillarInput,
  includeTrineNote: boolean,
  includeSelfPunish: boolean
): RelationHit[] {
  const hits: RelationHit[] = []
  const pairs: Array<[PillarKind, string]> = [
    ['year', normalizeBranchName(p.year.earthlyBranch)],
    ['month', normalizeBranchName(p.month.earthlyBranch)],
    ['day', normalizeBranchName(p.day.earthlyBranch)],
    ['time', normalizeBranchName(p.time.earthlyBranch)],
  ]

  // 2지지 관계
  for (let i = 0; i < pairs.length; i++) {
    for (let j = i + 1; j < pairs.length; j++) {
      const [ak, a] = pairs[i]
      const [bk, b] = pairs[j]

      // 육합
      if (EARTHLY_SIX_COMBINES[a] === b) {
        hits.push({ kind: '지지육합', pillars: [ak, bk], detail: `${a}-${b} 육합` })
      }
      // 충
      if (inSetPair(a, b, EARTHLY_CLASH_PAIRS)) {
        hits.push({ kind: '지지충', pillars: [ak, bk], detail: `${a}-${b} 충` })
      }
      // 형
      if (
        EARTHLY_PUNISH_SETS.some((set) => set.has(a) && set.has(b)) ||
        inSetPair(a, b, EARTHLY_PUNISH_PAIRS) ||
        (includeSelfPunish && inSetPair(a, b, SELF_PUNISH_PAIRS))
      ) {
        hits.push({ kind: '지지형', pillars: [ak, bk], detail: `${a}-${b} 형` })
      }
      // 파
      if (inSetPair(a, b, EARTHLY_BREAK_PAIRS)) {
        hits.push({ kind: '지지파', pillars: [ak, bk], detail: `${a}-${b} 파` })
      }
      // 해
      if (inSetPair(a, b, EARTHLY_HARM_PAIRS)) {
        hits.push({ kind: '지지해', pillars: [ak, bk], detail: `${a}-${b} 해` })
      }
      // 원진
      if (inSetPair(a, b, EARTHLY_YUANJIN_PAIRS)) {
        hits.push({ kind: '원진', pillars: [ak, bk], detail: `${a}-${b} 원진` })
      }
      // 방합(반합) — 삼합이 이미 성립하면 동일 세트 방합은 숨김(중복 방지)
      const half = EARTHLY_HALF_TRINES.find(
        ({ pair }) => (pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a)
      )
      if (half) {
        const sameSet = EARTHLY_TRINES.find(
          (tri) => tri.set.includes(half.pair[0]) && tri.set.includes(half.pair[1])
        )
        const allBranches = pairs.map(([_, v]) => v)
        const triSatisfied = !!sameSet && sameSet.set.every((z) => allBranches.includes(z))
        if (!triSatisfied) {
          hits.push({
            kind: '지지방합',
            pillars: [ak, bk],
            detail: includeTrineNote ? `${a}-${b} 방합(${half.element})` : `${a}-${b} 방합`,
          })
        }
      }
    }
  }

  // 삼합(3지지 충족 시)
  const all = pairs.map(([k, v]) => ({ k, v }))
  for (const tri of EARTHLY_TRINES) {
    const present = all.filter((x) => tri.set.includes(x.v))
    if (present.length >= 3) {
      const ps = present.slice(0, 3).map((x) => x.k) as PillarKind[]
      hits.push({
        kind: '지지삼합',
        pillars: ps,
        detail: includeTrineNote
          ? `${tri.set.join('·')} 삼합(${tri.element})`
          : `${tri.set.join('·')} 삼합`,
      })
    }
  }

  return hits
}

/* ========== 공망(空亡) ========== */
// 60갑자 일주 기준 공망표 — pillarLookup.getGongmang(SSOT, 旬空 규칙)에 위임.
// 과거 여기 60칸을 손으로 들고 있었으나(드리프트 위험) 제거.

// 종전: 일간/연간만으로 6패턴 반복
const GONGMANG_BY_STEM_INDEX: Record<number, [string, string]> = {
  // 0=甲,1=乙,2=丙,3=丁,4=戊,5=己,6=庚,7=辛,8=壬,9=癸
  0: ['戌', '亥'],
  1: ['申', '酉'],
  2: ['午', '未'],
  3: ['辰', '巳'],
  4: ['寅', '卯'],
  5: ['子', '丑'],
  6: ['戌', '亥'],
  7: ['申', '酉'],
  8: ['午', '未'],
  9: ['辰', '巳'],
}

function analyzeGongmang(
  p: PillarInput,
  policy: AnalyzeRelationsOptions['gongmangPolicy'],
  dayMasterStem?: string
): RelationHit[] {
  const hits: RelationHit[] = []

  let gm: [string, string] | undefined

  if (policy === 'dayPillar-60jiazi') {
    const dayPillar = `${p.day.heavenlyStem}${normalizeBranchName(p.day.earthlyBranch)}`
    gm = getGongmangByPillar(dayPillar) ?? undefined
  } else {
    // basic 모드: 일간/연간의 천간으로 공망 계산
    let baseStem = dayMasterStem ?? p.day.heavenlyStem
    if (policy === 'yearPillar-basic') {
      baseStem = p.year.heavenlyStem
    }
    const idx = stemIndex(baseStem)
    if (idx >= 0) {
      gm = GONGMANG_BY_STEM_INDEX[idx]
    }
  }

  if (!gm) {
    return hits
  }
  const [b1, b2] = gm

  const map: Array<[PillarKind, string]> = [
    ['year', normalizeBranchName(p.year.earthlyBranch)],
    ['month', normalizeBranchName(p.month.earthlyBranch)],
    ['day', normalizeBranchName(p.day.earthlyBranch)],
    ['time', normalizeBranchName(p.time.earthlyBranch)],
  ]

  for (const [k, v] of map) {
    if (v === b1 || v === b2) {
      hits.push({ kind: '공망', pillars: [k], detail: `공망(${v})` })
    }
  }
  return hits
}

/* ========== 외부 API ========== */
export interface PillarInput {
  year: { heavenlyStem: string; earthlyBranch: string }
  month: { heavenlyStem: string; earthlyBranch: string }
  day: { heavenlyStem: string; earthlyBranch: string }
  time: { heavenlyStem: string; earthlyBranch: string }
}
export interface AnalyzeInput {
  pillars: PillarInput
  dayMasterStem?: string
  options?: Partial<AnalyzeRelationsOptions>
}

export function analyzeRelations(input: AnalyzeInput): RelationHit[] {
  const { pillars, dayMasterStem, options } = input
  const opt: AnalyzeRelationsOptions = { ...DEFAULT_RELATION_OPTIONS, ...(options || {}) }

  const hits: RelationHit[] = []
  if (opt.includeHeavenly) {
    hits.push(
      ...analyzeHeavenly(pillars, !!opt.includeHeavenlyTransformNote, opt.heavenlyClashMode)
    )
  }
  if (opt.includeEarthly) {
    hits.push(...analyzeEarthly(pillars, !!opt.includeTrineElementNote, !!opt.includeSelfPunish))
  }
  if (opt.includeGongmang && opt.gongmangPolicy) {
    hits.push(...analyzeGongmang(pillars, opt.gongmangPolicy, dayMasterStem))
  }

  // 정렬: kind, 기둥 수, detail
  return hits.sort(
    (a, b) =>
      a.kind.localeCompare(b.kind) ||
      a.pillars.length - b.pillars.length ||
      (a.detail || '').localeCompare(b.detail || '')
  )
}

/* ========== 어댑터: 기존 Pillars 구조 → AnalyzeInput ========== */
export function toAnalyzeInputFromSaju(
  p: {
    year: { heavenlyStem: { name: string }; earthlyBranch: { name: string } }
    month: { heavenlyStem: { name: string }; earthlyBranch: { name: string } }
    day: { heavenlyStem: { name: string }; earthlyBranch: { name: string } }
    time: { heavenlyStem: { name: string }; earthlyBranch: { name: string } }
  },
  dayMasterStemName?: string,
  options?: Partial<AnalyzeRelationsOptions>
): AnalyzeInput {
  return {
    pillars: {
      year: { heavenlyStem: p.year.heavenlyStem.name, earthlyBranch: p.year.earthlyBranch.name },
      month: { heavenlyStem: p.month.heavenlyStem.name, earthlyBranch: p.month.earthlyBranch.name },
      day: { heavenlyStem: p.day.heavenlyStem.name, earthlyBranch: p.day.earthlyBranch.name },
      time: { heavenlyStem: p.time.heavenlyStem.name, earthlyBranch: p.time.earthlyBranch.name },
    },
    dayMasterStem: dayMasterStemName,
    options,
  }
}
