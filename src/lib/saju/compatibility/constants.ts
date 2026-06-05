// src/lib/Saju/compatibility/constants.ts
// 궁합 분석 상수

import { FiveElement } from '../types'
// 지지/천간 관계 도그마는 relationTables.ts(SSOT)에서 파생. 로컬 복제 금지.
import {
  STEM_COMBINE,
  STEM_CLASH_4,
  SIX_HARMONY,
  THREE_HARMONY,
  BRANCH_CLASH,
  HARM_PAIRS,
  PUNISHMENT_TRIOS,
  PUNISHMENT_PAIR,
  SELF_PUNISHMENT_STRICT,
  toBidiRecord,
} from '../relationTables'

/** 천간합 */
export const STEM_HAP: Record<string, { partner: string; result: FiveElement }> = (() => {
  const r: Record<string, { partner: string; result: FiveElement }> = {}
  for (const { pair, element } of STEM_COMBINE) {
    r[pair[0]] = { partner: pair[1], result: element }
    r[pair[1]] = { partner: pair[0], result: element }
  }
  return r
})()

/** 천간충 */
export const STEM_CHUNG: Record<string, string> = toBidiRecord(STEM_CLASH_4)

/** 지지육합 */
export const BRANCH_YUKHAP: Record<string, { partner: string; result: FiveElement }> = (() => {
  const r: Record<string, { partner: string; result: FiveElement }> = {}
  for (const { pair, element } of SIX_HARMONY) {
    r[pair[0]] = { partner: pair[1], result: element }
    r[pair[1]] = { partner: pair[0], result: element }
  }
  return r
})()

/** 지지삼합 (표시 순서 화·금·수·목 보존) */
export const BRANCH_SAMHAP: Array<{ branches: string[]; result: FiveElement }> = (
  ['화', '금', '수', '목'] as const
).map((el) => {
  const t = THREE_HARMONY.find((x) => x.element === el)!
  return { branches: [...t.members], result: el }
})

/** 지지충 */
export const BRANCH_CHUNG: Record<string, string> = toBidiRecord(BRANCH_CLASH)

/** 지지형 */
export const BRANCH_HYEONG: Array<{ branches: string[]; type: string }> = [
  { branches: [...PUNISHMENT_TRIOS[0]], type: '무은지형' },
  { branches: [...PUNISHMENT_TRIOS[1]], type: '지세지형' },
  { branches: [...PUNISHMENT_PAIR], type: '무례지형' },
  ...SELF_PUNISHMENT_STRICT.map((b) => ({ branches: [b, b], type: '자형' })),
]

/** 지지해 */
export const BRANCH_HAE: Record<string, string> = toBidiRecord(HARM_PAIRS)

/** 일간 관계별 기본 점수 */
export const DAY_MASTER_RELATION_SCORES: Record<string, number> = {
  비화: 70,
  생조: 85,
  설기: 65,
  극출: 55,
  극입: 45,
}

/** 카테고리별 가중치 */
export const CATEGORY_WEIGHTS: Record<
  string,
  { element: number; stem: number; branch: number; dayMaster: number }
> = {
  love: { element: 0.2, stem: 0.2, branch: 0.3, dayMaster: 0.3 },
  business: { element: 0.3, stem: 0.25, branch: 0.25, dayMaster: 0.2 },
  friendship: { element: 0.25, stem: 0.2, branch: 0.3, dayMaster: 0.25 },
  family: { element: 0.2, stem: 0.2, branch: 0.35, dayMaster: 0.25 },
  work: { element: 0.3, stem: 0.25, branch: 0.2, dayMaster: 0.25 },
}

/** 카테고리별 조언 */
export const CATEGORY_ADVICE: Record<string, string> = {
  love: '서로의 다름을 인정하고 소통을 많이 하세요.',
  business: '역할 분담을 명확히 하고 각자의 강점을 살리세요.',
  friendship: '적당한 거리감을 유지하면서 깊은 우정을 나누세요.',
  family: '세대 차이를 이해하고 존중하는 마음을 가지세요.',
  work: '업무적 관계를 우선하고 감정적 충돌을 피하세요.',
}
