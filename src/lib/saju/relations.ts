// src/lib/Saju/relations.ts

import { STEMS } from './constants'
import type { FiveElement, PillarKind, RelationHit } from './types'
import {
  STEM_COMBINE,
  STEM_CLASH_BY_MODE,
  STEM_CLASH_MODE,
  SIX_HARMONY,
  THREE_HARMONY,
  DIRECTIONAL_HARMONY,
  BRANCH_CLASH,
  BREAK_PAIRS,
  HARM_PAIRS,
  RESENTMENT_PAIRS,
  toBidiRecord,
  toPairKeySet,
  halfHarmonyPairs,
  type StemClashMode,
} from './relationTables'
import { isHyeong } from './hyeong'
import { getGongmang as getGongmangByPillar } from './pillarLookup'
import { presentPillars } from './stemBranchUtils'

/* ========== 옵션/유틸 ========== */
export interface AnalyzeRelationsOptions {
  includeHeavenly: boolean // 천간 관계 포함
  includeEarthly: boolean // 지지 관계 포함
  includeGongmang: boolean // 공망 포함
  includeHeavenlyTransformNote?: boolean // 천간 합화 오행 표기
  includeTrineElementNote?: boolean // 삼합/방합 변국 오행 표기
  includeSelfPunish?: boolean // 자형(自刑) 포함 — 辰辰·午午·酉酉·亥亥 4지만(hyeong.isHyeong)

  // 공망 산정 기준
  // - 'dayPillar-60jiazi': 일주(60갑자) 기준 공망표 사용(권장, 첨부표와 일치)
  // - 'dayMaster-basic'  : 일간만으로 6패턴 반복(종전 방식)
  // - 'yearPillar-basic' : 연간만으로 6패턴 반복
  gongmangPolicy?: 'dayPillar-60jiazi' | 'dayMaster-basic' | 'yearPillar-basic'

  // 천간충 판정 폭 — 기본값은 엔진 공통 STEM_CLASH_MODE('4', relationTables).
  // 운·캘린더·궁합이 같은 4쌍만 보므로 본명도 기본은 4쌍이다(SD-11).
  // - '4'  : 갑-경, 을-신, 병-임, 정-계 (기본)
  // - '5'  : 위 4쌍 + 무-갑, 기-을 (옵션 전용)
  // - '10' : 양간↔양간, 음간↔음간 전부 (옵션 전용)
  heavenlyClashMode?: StemClashMode
}

export const DEFAULT_RELATION_OPTIONS: AnalyzeRelationsOptions = {
  includeHeavenly: true,
  includeEarthly: true,
  includeGongmang: true,
  includeHeavenlyTransformNote: true,
  includeTrineElementNote: true,
  includeSelfPunish: true,
  gongmangPolicy: 'dayPillar-60jiazi',
  heavenlyClashMode: STEM_CLASH_MODE,
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

// 천간충 세트(모드별) — canon STEM_CLASH_BY_MODE 파생
const HEAVENLY_CLASH_SETS: Record<StemClashMode, Set<string>> = {
  '4': toPairKeySet(STEM_CLASH_BY_MODE['4']),
  '5': toPairKeySet(STEM_CLASH_BY_MODE['5']),
  '10': toPairKeySet(STEM_CLASH_BY_MODE['10']),
}

function analyzeHeavenly(
  p: PillarInput,
  includeTransformNote: boolean,
  clashMode: AnalyzeRelationsOptions['heavenlyClashMode']
): RelationHit[] {
  const hits: RelationHit[] = []
  const pairs: Array<[PillarKind, string]> = presentPillars(p).map(([k, x]) => [k, x.heavenlyStem])
  const CLASH = HEAVENLY_CLASH_SETS[clashMode || STEM_CLASH_MODE]

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
  THREE_HARMONY.map((t) => ({
    set: [...t.members] as [string, string, string],
    element: t.element,
  }))

// 방합(방국) — 寅卯辰·巳午未·申酉戌·亥子丑
const EARTHLY_DIRECTIONALS: Array<{ set: [string, string, string]; element: FiveElement }> =
  DIRECTIONAL_HARMONY.map((d) => ({
    set: [...d.members] as [string, string, string],
    element: d.element,
  }))

// 반합 — 삼합 트리오에서 왕지(子卯午酉)를 포함한 2지지 쌍
const EARTHLY_HALF_TRINES: Array<{ pair: [string, string]; element: FiveElement }> =
  halfHarmonyPairs().map((h) => ({ pair: [...h.pair] as [string, string], element: h.element }))

// 충(정충)
const EARTHLY_CLASH_PAIRS = toPairKeySet(BRANCH_CLASH)

// 형(刑) — hyeong.isHyeong 단일 교리(SD-07). 삼형 세트 안의 寅申·丑未 는 충이지
// 형이 아니고, 자형은 辰午酉亥 4지만이다. 옛 코드는 trio 의 임의 두 지지와 12지 전부의
// 자형을 형으로 잡아 상담사·캘린더와 다른 형 목록을 냈다.

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
  const pairs: Array<[PillarKind, string]> = presentPillars(p).map(([k, x]) => [
    k,
    normalizeBranchName(x.earthlyBranch),
  ])

  const allBranches = pairs.map(([, v]) => v)
  // 국(局)은 서로 다른 세 지지가 모두 있어야 성립 — 같은 지지가 두 번 있어도 한 멤버다
  // (SD-01: 亥·亥·未 를 亥卯未 삼합으로 잡던 버그).
  const hasAllMembers = (set: readonly string[]) => set.every((z) => allBranches.includes(z))

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
      // 형 (자형은 includeSelfPunish 일 때만)
      if ((a !== b || includeSelfPunish) && isHyeong(a, b)) {
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
      // 반합(半合) — 삼합 트리오의 왕지 포함 2지지(같은 원소 팀의 절반). 삼합이 이미
      // 성립하면 동일 세트 반합은 숨김(중복 방지). 옛 코드는 이를 '지지방합(같은 계절)'로
      // 잘못 표기했으나, 亥-卯·申-子·寅-午 등은 교차 계절 삼합쌍이라 방합이 아니다(R2).
      const half = EARTHLY_HALF_TRINES.find(
        ({ pair }) => (pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a)
      )
      if (half) {
        const sameSet = EARTHLY_TRINES.find(
          (tri) => tri.set.includes(half.pair[0]) && tri.set.includes(half.pair[1])
        )
        if (!sameSet || !hasAllMembers(sameSet.set)) {
          hits.push({
            kind: '지지삼합',
            pillars: [ak, bk],
            detail: includeTrineNote ? `${a}-${b} 반합(${half.element})` : `${a}-${b} 반합`,
          })
        }
      }
    }
  }

  // 삼합·방합 — 서로 다른 세 멤버가 모두 있을 때만. pillars 는 멤버 지지를 가진
  // 기둥 전부(기둥 순서) — 같은 멤버가 두 기둥에 있으면 둘 다 국에 참여한다.
  const pushTrio = (
    kind: '지지삼합' | '지지방합',
    word: '삼합' | '방합',
    tri: { set: [string, string, string]; element: FiveElement }
  ) => {
    if (!hasAllMembers(tri.set)) return
    const ps = pairs.filter(([, v]) => tri.set.includes(v)).map(([k]) => k)
    const label = `${tri.set.join('·')} ${word}`
    hits.push({
      kind,
      pillars: ps,
      detail: includeTrineNote ? `${label}(${tri.element})` : label,
    })
  }
  for (const tri of EARTHLY_TRINES) pushTrio('지지삼합', '삼합', tri)
  for (const tri of EARTHLY_DIRECTIONALS) pushTrio('지지방합', '방합', tri)

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

  const map: Array<[PillarKind, string]> = presentPillars(p).map(([k, x]) => [
    k,
    normalizeBranchName(x.earthlyBranch),
  ])

  for (const [k, v] of map) {
    if (v === b1 || v === b2) {
      hits.push({ kind: '공망', pillars: [k], detail: `공망(${v})` })
    }
  }
  return hits
}

/* ========== 외부 API ========== */
/** 관계 분석 입력 — time 이 null/생략이면(출생시각 미상) 년·월·일 삼주끼리만 본다(CONVENTIONS §5). */
export interface PillarInput {
  year: { heavenlyStem: string; earthlyBranch: string }
  month: { heavenlyStem: string; earthlyBranch: string }
  day: { heavenlyStem: string; earthlyBranch: string }
  time?: { heavenlyStem: string; earthlyBranch: string } | null
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
// time 이 null/생략이면(출생시각 미상) 삼주 입력으로 넘긴다.
export function toAnalyzeInputFromSaju(
  p: {
    year: { heavenlyStem: { name: string }; earthlyBranch: { name: string } }
    month: { heavenlyStem: { name: string }; earthlyBranch: { name: string } }
    day: { heavenlyStem: { name: string }; earthlyBranch: { name: string } }
    time?: { heavenlyStem: { name: string }; earthlyBranch: { name: string } } | null
  },
  dayMasterStemName?: string,
  options?: Partial<AnalyzeRelationsOptions>
): AnalyzeInput {
  return {
    pillars: {
      year: { heavenlyStem: p.year.heavenlyStem.name, earthlyBranch: p.year.earthlyBranch.name },
      month: { heavenlyStem: p.month.heavenlyStem.name, earthlyBranch: p.month.earthlyBranch.name },
      day: { heavenlyStem: p.day.heavenlyStem.name, earthlyBranch: p.day.earthlyBranch.name },
      time: p.time
        ? { heavenlyStem: p.time.heavenlyStem.name, earthlyBranch: p.time.earthlyBranch.name }
        : null,
    },
    dayMasterStem: dayMasterStemName,
    options,
  }
}
