/**
 * 형(刑) 판정 — 한국 명리 표준 교리, 단일 소스(single source of truth).
 *
 * 삼형 세트(寅巳申 / 丑戌未)에서 실제 "형"이 되는 쌍만 인정한다. trio 안의 두
 * 지지가 만났다고 무조건 형이 아니라, 충에 해당하는 쌍(寅申·丑未)은 충이지
 * 형이 아니다. 자형(自刑)은 辰辰/午午/酉酉/亥亥 4쌍만, 상형은 子卯.
 *
 * 이전엔 이 교리가 destiny/counselorContext 와 compatibility/sajuSynastryFormatter
 * 두 곳에 똑같이 복붙돼 있었고, 본명 엔진(saju/relations)은 삼형 세트의 임의 두
 * 지지(丑未/寅申 포함)와 12지 전부의 자형을 형으로 잡는 별도 교리, 캘린더 추출기
 * (saju-hyeongchung)는 또 다른 표를 써서 같은 사용자에게 표면마다 다른 형 목록이
 * 나왔다(SD-07). 이제 본명 relations·캘린더 추출기·상담사·궁합 모두 isHyeong 을
 * 쓴다 — relationTables.consistency.test 가 78쌍 전부의 일치를 잠근다.
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
  return a === b ? SELF_HYEONG.has(a) : BRANCH_HYEONG_PAIR[a] === b || HYEONG_PAIR_TRIO.has(a + b)
}
