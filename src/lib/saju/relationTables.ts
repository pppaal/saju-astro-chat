// src/lib/saju/relationTables.ts
//
// 지지(地支)·천간(天干) 관계 도그마의 SINGLE SOURCE OF TRUTH.
//
// 합(合)·충(沖)·형(刑)·파(破)·해(害)·원진(怨嗔)·삼합(三合)·방합(方合)·
// 천간합(天干合)·천간충(天干沖) 표를 여기서 단 한 번만 정의한다.
// 다른 모든 모듈은 반드시 이 파일에서 import/파생해 사용해야 한다 (로컬 복제 금지).
//
// 배경 — 과거에는 동일한 표가 10여 개 파일에 흩어져 복제돼 있었고, 한 곳만
// 수정하면 나머지가 드리프트하는 버그가 반복됐다. 대표 사례: 원진(怨嗔) 표가
// 여러 파일에서 해(害) 표로 잘못 복붙되어, cycleRelations 만 맞고 relations/
// hyeongchung/shinsal 은 틀린 값을 보고하던 모순. 이 모듈로 통합하면 그 부류의
// 버그가 구조적으로 재발 불가능해진다.
//
// 잠금장치 — relationTables.consistency.test.ts 가 각 소비 모듈의 파생본이 이
// canon 과 정확히 일치함을 강제한다. 누가 어디서 한 곳만 바꿔도 CI가 즉시 잡는다.
//
// 어댑터(toBidiRecord / toPairKeySet)는 canon 의 쌍(pair) 목록을 기존 소비자들이
// 쓰던 Record<string,string> / Set<"a-b"> 형태로 변환한다. canon 쌍의 나열 순서는
// 기존 literal 들의 키 삽입 순서와 일치하도록 맞춰져 있어, 변환 결과가 옛 값과
// 바이트 동일하다(결정성 골든 테스트 보존). 단 원진만 올바른 값으로 교정된다.

import type { FiveElement } from './types'

/** 방향 무관 지지/천간 쌍. */
export type Pair = readonly [string, string]

/** 12지지 정순(子→亥). */
export const ALL_BRANCHES: ReadonlyArray<string> = [
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
]

/** 오행 한글 → 한자 (일부 소비자는 한자 표기 MergedElement 를 요구). */
export const ELEMENT_HANJA: Record<FiveElement, '木' | '火' | '土' | '金' | '水'> = {
  목: '木',
  화: '火',
  토: '土',
  금: '金',
  수: '水',
}

/* ========================= 천간(天干) ========================= */

/** 천간합(天干合): 甲己→토, 乙庚→금, 丙辛→수, 丁壬→목, 戊癸→화. */
export const STEM_COMBINE: ReadonlyArray<{ pair: Pair; element: FiveElement }> = [
  { pair: ['甲', '己'], element: '토' },
  { pair: ['乙', '庚'], element: '금' },
  { pair: ['丙', '辛'], element: '수' },
  { pair: ['丁', '壬'], element: '목' },
  { pair: ['戊', '癸'], element: '화' },
]

/** 천간충(天干沖) 4쌍(기본): 甲庚 乙辛 丙壬 丁癸. */
export const STEM_CLASH_4: ReadonlyArray<Pair> = [
  ['甲', '庚'],
  ['乙', '辛'],
  ['丙', '壬'],
  ['丁', '癸'],
]

/** 천간충 5: 4쌍 + 戊甲, 己乙. */
export const STEM_CLASH_5_EXTRA: ReadonlyArray<Pair> = [
  ['戊', '甲'],
  ['己', '乙'],
]

/** 천간충 10: 양간끼리/음간끼리 상충 전부. */
export const STEM_CLASH_10: ReadonlyArray<Pair> = [
  // 양간: 甲丙戊庚壬
  ['甲', '丙'],
  ['甲', '戊'],
  ['甲', '庚'],
  ['甲', '壬'],
  ['丙', '戊'],
  ['丙', '庚'],
  ['丙', '壬'],
  ['戊', '庚'],
  ['戊', '壬'],
  ['庚', '壬'],
  // 음간: 乙丁己辛癸
  ['乙', '丁'],
  ['乙', '己'],
  ['乙', '辛'],
  ['乙', '癸'],
  ['丁', '己'],
  ['丁', '辛'],
  ['丁', '癸'],
  ['己', '辛'],
  ['己', '癸'],
  ['辛', '癸'],
]

/* ========================= 지지(地支) ========================= */

/** 지지육합(六合): 子丑→토, 寅亥→목, 卯戌→화, 辰酉→금, 巳申→수, 午未→토. */
export const SIX_HARMONY: ReadonlyArray<{ pair: Pair; element: FiveElement }> = [
  { pair: ['子', '丑'], element: '토' },
  { pair: ['寅', '亥'], element: '목' },
  { pair: ['卯', '戌'], element: '화' },
  { pair: ['辰', '酉'], element: '금' },
  { pair: ['巳', '申'], element: '수' },
  { pair: ['午', '未'], element: '토' },
]

/** 지지삼합(三合): 申子辰→수, 亥卯未→목, 寅午戌→화, 巳酉丑→금. */
export const THREE_HARMONY: ReadonlyArray<{
  members: readonly [string, string, string]
  element: FiveElement
}> = [
  { members: ['申', '子', '辰'], element: '수' },
  { members: ['亥', '卯', '未'], element: '목' },
  { members: ['寅', '午', '戌'], element: '화' },
  { members: ['巳', '酉', '丑'], element: '금' },
]

/** 지지방합(方合): 寅卯辰→목(동), 巳午未→화(남), 申酉戌→금(서), 亥子丑→수(북). */
export const DIRECTIONAL_HARMONY: ReadonlyArray<{
  members: readonly [string, string, string]
  element: FiveElement
  direction: '동방' | '남방' | '서방' | '북방'
}> = [
  { members: ['寅', '卯', '辰'], element: '목', direction: '동방' },
  { members: ['巳', '午', '未'], element: '화', direction: '남방' },
  { members: ['申', '酉', '戌'], element: '금', direction: '서방' },
  { members: ['亥', '子', '丑'], element: '수', direction: '북방' },
]

/** 지지충(沖): 子午 丑未 寅申 卯酉 辰戌 巳亥. */
export const BRANCH_CLASH: ReadonlyArray<Pair> = [
  ['子', '午'],
  ['丑', '未'],
  ['寅', '申'],
  ['卯', '酉'],
  ['辰', '戌'],
  ['巳', '亥'],
]

/** 지지파(破): 子酉 丑辰 寅亥 卯午 巳申 未戌. */
export const BREAK_PAIRS: ReadonlyArray<Pair> = [
  ['子', '酉'],
  ['丑', '辰'],
  ['寅', '亥'],
  ['卯', '午'],
  ['巳', '申'],
  ['未', '戌'],
]

/** 지지해(害): 子未 丑午 寅巳 卯辰 申亥 酉戌. */
export const HARM_PAIRS: ReadonlyArray<Pair> = [
  ['子', '未'],
  ['丑', '午'],
  ['寅', '巳'],
  ['卯', '辰'],
  ['申', '亥'],
  ['酉', '戌'],
]

/**
 * 원진(怨嗔) 표준 6쌍: 子未 丑午 寅酉 卯申 辰亥 巳戌.
 *
 * ⚠️ 해(害)와 혼동 주의 — 子未·丑午 두 쌍만 공통이고 寅·卯·辰·巳 짝은 다르다.
 *    (해: 寅巳 卯辰 申亥 酉戌 / 원진: 寅酉 卯申 辰亥 巳戌)
 *    과거 다수 파일이 이 둘을 혼동해 원진을 해 표로 잘못 채웠다.
 */
export const RESENTMENT_PAIRS: ReadonlyArray<Pair> = [
  ['子', '未'],
  ['丑', '午'],
  ['寅', '酉'],
  ['卯', '申'],
  ['辰', '亥'],
  ['巳', '戌'],
]

/* --------- 형(刑) --------- */

/** 삼형(三刑) 두 조: 寅巳申, 丑戌未. */
export const PUNISHMENT_TRIOS: ReadonlyArray<readonly [string, string, string]> = [
  ['寅', '巳', '申'],
  ['丑', '戌', '未'],
]

/** 상형(相刑)/무례지형: 子卯. */
export const PUNISHMENT_PAIR: Pair = ['子', '卯']

/** 자형(自刑) 표준 4지지: 辰 午 酉 亥. */
export const SELF_PUNISHMENT_STRICT: ReadonlyArray<string> = ['辰', '午', '酉', '亥']

/* ========================= 어댑터 ========================= */

/**
 * 쌍 목록 → 양방향 Record (a→b, b→a). 키 삽입 순서는 입력 쌍 순서를 따른다
 * (각 쌍마다 a, 그다음 b). canon 쌍 순서가 기존 literal 키 순서와 일치하므로
 * 결과 Record 의 키 순서도 옛 정의와 동일하다.
 */
export function toBidiRecord(pairs: ReadonlyArray<Pair>): Record<string, string> {
  const r: Record<string, string> = {}
  for (const [a, b] of pairs) {
    r[a] = b
    r[b] = a
  }
  return r
}

/**
 * 쌍 목록 → "a{sep}b" / "b{sep}a" 양방향 키 Set. 삽입 순서는 입력 쌍 순서를 따른다
 * (각 쌍마다 a-b, 그다음 b-a).
 */
export function toPairKeySet(pairs: ReadonlyArray<Pair>, sep = '-'): Set<string> {
  const s = new Set<string>()
  for (const [a, b] of pairs) {
    s.add(`${a}${sep}${b}`)
    s.add(`${b}${sep}${a}`)
  }
  return s
}

/** 삼합 트리오들의 인접 2지지 반합(半合) 쌍 목록(왕지 포함). */
export function halfHarmonyPairs(): ReadonlyArray<{ pair: Pair; element: FiveElement }> {
  const out: Array<{ pair: Pair; element: FiveElement }> = []
  for (const { members, element } of THREE_HARMONY) {
    out.push({ pair: [members[0], members[1]], element })
    out.push({ pair: [members[1], members[2]], element })
  }
  return out
}
