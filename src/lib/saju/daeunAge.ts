/**
 * daeunAge — 대운 시작 나이 (만 나이) 계산 + 현재 대운 선택 단일 출처.
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
import { currentManAge } from '@/lib/datetime/currentAge'

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

/** 첫 대운 전 상태 — 대운이 아직 시작하지 않았고 startsAtAge(만 나이)에 시작한다. */
export interface PreDaeun {
  startsAtAge: number
}

export interface CurrentDaeunResult<T> {
  /** 지금 걸린 대운. 첫 대운 전(만 나이 < 첫 대운 나이)이거나 list 가 비면 null. */
  current: T | null
  /** 첫 대운 전이면 { startsAtAge }, 대운이 이미 시작했거나 list 가 비면 null. */
  preDaeun: PreDaeun | null
}

/**
 * 현재 대운 — 순수 함수 SSOT (엔진 감사 E14 · SAJU-7 · SAJU-8, OD-12).
 *
 * list 는 시작 나이(만 나이, 오름차순) 대운 목록. 만 나이는 출생지 시간대의 *민용* 생일
 * 기준(currentManAge, CONVENTIONS §14). 만 나이 ≥ d.age 인 마지막 대운이 current.
 *
 * 첫 대운 전에는 월주(月柱)가 그 시기를 맡으므로 대운을 current 로 부르지 않는다 —
 * current = null, preDaeun = { startsAtAge: list[0].age }. 예전엔 `|| list[0]` 폴백으로
 * 만 4세 아이에게 7세 대운을 '현재 대운'이라 했다.
 *
 * calculateSajuData 와 /api/saju 가 같은 함수를 쓴다 — /api/saju 는 캐시된(계산 시점의)
 * current 를 버리고 요청마다 이 함수로 다시 고른다.
 */
export function currentDaeun<T extends { age: number }>(
  list: readonly T[],
  civilBirth: { year: number; month: number; day: number },
  birthTimeZone: string,
  now: Date = new Date()
): CurrentDaeunResult<T> {
  if (!list.length) return { current: null, preDaeun: null }
  const age = currentManAge({
    birthYear: civilBirth.year,
    birthMonth: civilBirth.month,
    birthDate: civilBirth.day,
    birthTimeZone,
    now,
  })
  let current: T | null = null
  for (const d of list) {
    if (age >= d.age) current = d
  }
  return current
    ? { current, preDaeun: null }
    : { current: null, preDaeun: { startsAtAge: list[0].age } }
}

/** 'YYYY-MM-DD'(양력 민용 날짜) → { year, month, day }. 형식이 틀리면 null. */
export function parseCivilDate(s: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s ?? '').trim())
  if (!m) return null
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}
