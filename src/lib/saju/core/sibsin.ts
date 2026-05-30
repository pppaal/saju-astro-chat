// src/lib/saju/core/sibsin.ts
//
// 사주 십신(十神) 계산 — SINGLE SOURCE OF TRUTH.
//
// 옛 코드는 같은 로직 (정기 매핑 + getSibseong) 이 saju.ts 와 unse.ts 에 따로
// 살아 saju.ts 만 fix 했더니 unse 의 대운/연운/월운/일진 십신이 음양 뒤집힌
// 채 남았다 (子=壬 양수로 잘못 매핑 → 일간 戊 + 子 → 편재 vs 정재 같은 분류
// 오류). 이 파일이 십신 계산의 단일 source.
//
// 호출자가 가져갈 수 있는 것:
//   - BRANCH_MAIN_QI: 지지 → 정기 천간 이름 매핑 (Readonly)
//   - getBranchMainStem(branchName): 지지 → 정기 Stem 객체
//   - getSibseong(dayMaster, target): 일간 vs 목표 → 십신 문자열
//   - getBranchSibsin(dayMaster, branchName): 위 두 함수 합친 편의
//
// 어디서든 정기/십신 매핑이 필요하면 반드시 이 모듈에서만 가져간다.

import { STEMS, FIVE_ELEMENT_RELATIONS } from '../constants'
import type { FiveElement, YinYang, StemBranchInfo } from '../types'

type Stem = StemBranchInfo

/**
 * 지지 → 정기 천간 이름. 한국 정통 명리 기준 (JIJANGGAN[*].정기 와 일치).
 *   子=癸 (음수)   丑=己 (음토)   寅=甲 (양목)   卯=乙 (음목)
 *   辰=戊 (양토)   巳=丙 (양화)   午=丁 (음화)   未=己 (음토)
 *   申=庚 (양금)   酉=辛 (음금)   戌=戊 (양토)   亥=壬 (양수)
 */
export const BRANCH_MAIN_QI: Readonly<Record<string, string>> = {
  子: '癸',
  丑: '己',
  寅: '甲',
  卯: '乙',
  辰: '戊',
  巳: '丙',
  午: '丁',
  未: '己',
  申: '庚',
  酉: '辛',
  戌: '戊',
  亥: '壬',
}

/** 지지 이름 → 정기 천간 Stem 객체. unknown branch 면 undefined. */
export function getBranchMainStem(branchName: string): Stem | undefined {
  const stemName = BRANCH_MAIN_QI[branchName]
  if (!stemName) return undefined
  return STEMS.find((s) => s.name === stemName)
}

/**
 * 일간(dayMaster) vs 목표 간지(target) → 십신 문자열.
 *   같은 오행 + 같은 음양 = 비견 / 다른 음양 = 겁재
 *   일간이 생하는 오행 + 같은 음양 = 식신 / 다른 = 상관
 *   일간이 극하는 오행 + 같은 음양 = 편재 / 다른 = 정재
 *   일간이 극받는 오행 + 같은 음양 = 편관 / 다른 = 정관
 *   일간이 생받는 오행 + 같은 음양 = 편인 / 다른 = 정인
 */
export function getSibseong(
  dayMaster: { element: FiveElement; yin_yang: YinYang },
  target: { element: FiveElement; yin_yang: YinYang }
): string {
  if (dayMaster.element === target.element) {
    return dayMaster.yin_yang === target.yin_yang ? '비견' : '겁재'
  }
  if (FIVE_ELEMENT_RELATIONS.생하는관계[dayMaster.element] === target.element) {
    return dayMaster.yin_yang === target.yin_yang ? '식신' : '상관'
  }
  if (FIVE_ELEMENT_RELATIONS.극하는관계[dayMaster.element] === target.element) {
    return dayMaster.yin_yang === target.yin_yang ? '편재' : '정재'
  }
  if (FIVE_ELEMENT_RELATIONS.극받는관계[dayMaster.element] === target.element) {
    return dayMaster.yin_yang === target.yin_yang ? '편관' : '정관'
  }
  if (FIVE_ELEMENT_RELATIONS.생받는관계[dayMaster.element] === target.element) {
    return dayMaster.yin_yang === target.yin_yang ? '편인' : '정인'
  }
  return ''
}

/**
 * 일간 + 지지 이름 → 십신.
 * 지지의 정기 천간을 자동으로 lookup 해 getSibseong 호출. 호출자가 직접 지지
 * 객체로 호출해 음양 뒤집힘 버그 (S3) 가 재발하지 않도록 한 helper.
 */
export function getBranchSibsin(
  dayMaster: { element: FiveElement; yin_yang: YinYang },
  branchName: string
): string {
  const mainStem = getBranchMainStem(branchName)
  if (!mainStem) return ''
  return getSibseong(dayMaster, mainStem)
}
