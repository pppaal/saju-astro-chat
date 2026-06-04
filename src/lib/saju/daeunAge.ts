/**
 * daeunAge — 대운 시작 나이 (만 나이) 계산 단일 출처.
 *
 * 정책 변경 (2026-06): 옛 코드는 마지막에 +1 해서 *한국 나이* 로 반환했다.
 * 2023년 한국 법 개정으로 만 나이가 공식 표준이 됐고, 사주/점성 화면 전체를
 * 만 나이 한 컨벤션으로 통일하면서 +1 제거 — 이제 글로벌(한국·미국·아프리카)
 * 사용자가 동일 숫자를 본다. 대운 *전환 연도* 자체는 변하지 않고 라벨만 변함.
 *
 * 정책 메모:
 *  - days/3 → ceil/floor/round (CALCULATION_STANDARDS.saju.daeunRounding)
 *  - 결과 < 1 이면 1 로 clamp (출생 직후 첫 대운은 만 1세부터 표기 — 만 0
 *    근방은 의미가 약해 묶음)
 */

import { CALCULATION_STANDARDS } from '@/lib/config/calculationStandards'

const DAEUN_ROUNDING = CALCULATION_STANDARDS.saju.daeunRounding

export function daysToDaeunAge(days: number): number {
  const v = days / 3
  let age: number
  if (DAEUN_ROUNDING === 'ceil') {
    age = Math.ceil(v)
  } else if (DAEUN_ROUNDING === 'floor') {
    age = Math.floor(v)
  } else {
    age = Math.round(v)
  }
  return Math.max(1, age)
}
