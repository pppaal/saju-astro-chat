/**
 * 형(刑) 판정 — 한국 명리 표준 교리, 단일 소스(single source of truth).
 *
 * 삼형 세트(寅巳申 / 丑戌未)에서 실제 "형"이 되는 쌍만 인정한다. trio 안의 두
 * 지지가 만났다고 무조건 형이 아니라, 충에 해당하는 쌍(寅申·丑未)은 충이지
 * 형이 아니다. 자형(自刑)은 辰辰/午午/酉酉/亥亥 4쌍만, 상형은 子卯.
 *
 * 이전엔 이 교리가 destiny/counselorContext 와 compatibility/sajuSynastryFormatter
 * 두 곳에 똑같이 복붙돼 있어 한쪽만 고치면 드리프트가 났다. 엔진(saju/relations)
 * 은 삼형 세트의 임의 두 지지를 형으로 잡고(丑未/寅申 포함) 자형도 12지 전부를
 * 인정하는 다른(완화된) 동작을 하므로, 표시 계층은 이 모듈을 단일 소스로 써서
 * 일관된 보정 교리를 적용한다.
 */

import {
  PUNISHMENT_TRIOS,
  PUNISHMENT_PAIR,
  SELF_PUNISHMENT_STRICT,
  BRANCH_CLASH,
  toBidiRecord,
  toPairKeySet,
} from './relationTables'

// 삼형(寅巳申·丑戌未) 중 실제 "형" 쌍 — 충 페어(寅申·丑未)는 제외. canon 파생.
export const HYEONG_PAIR_TRIO: Set<string> = (() => {
  const clash = toPairKeySet(BRANCH_CLASH, '') // "寅申"/"申寅" 형태
  const s = new Set<string>()
  for (const [a, b, c] of PUNISHMENT_TRIOS) {
    for (const [x, y] of [
      [a, b],
      [a, c],
      [b, c],
    ] as const) {
      if (clash.has(`${x}${y}`)) {
        continue // 충 페어(寅申·丑未)는 형이 아니다
      }
      s.add(`${x}${y}`)
      s.add(`${y}${x}`)
    }
  }
  return s
})()

// 상형(서로 형): 子卯. canon 파생.
export const BRANCH_HYEONG_PAIR: Record<string, string> = toBidiRecord([PUNISHMENT_PAIR])

// 자형(自刑): 같은 지지끼리 — 표준 4쌍(canon).
export const SELF_HYEONG = new Set(SELF_PUNISHMENT_STRICT)

/** 두 지지(한자)가 형(자형 포함) 관계인지. a===b 면 자형 여부로 판정. */
export function isHyeong(a: string, b: string): boolean {
  return a === b
    ? SELF_HYEONG.has(a)
    : BRANCH_HYEONG_PAIR[a] === b || HYEONG_PAIR_TRIO.has(a + b)
}
