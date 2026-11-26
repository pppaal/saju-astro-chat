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
import { stepStemBranch } from './cycles'

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
interface PreDaeun {
  startsAtAge: number
}

export interface CurrentDaeunResult<T> {
  /** 지금 걸린 대운. 첫 대운 전(만 나이 < 첫 대운 나이)이거나 list 가 비면 null. */
  current: T | null
  /** 첫 대운 전이면 { startsAtAge }, 대운이 이미 시작했거나 list 가 비면 null. */
  preDaeun: PreDaeun | null
}

/** 대운 한 칸의 길이(년, 만 나이). */
export const DAEUN_SPAN_YEARS = 10

/**
 * 대운 목록 최소 길이 — 10칸(100년). 만 나이가 그 너머(시작 나이 + 100 이상)면
 * daeunListLength 가 지금 걸린 대운까지 늘린다.
 */
export const DAEUN_LIST_MIN_LENGTH = 10

/**
 * 만 나이 age 에 걸린 대운의 0-based 순번 — 첫 대운 전(age < startAge)이면 −1.
 * 목록 길이와 무관한 산술이다: 대운은 startAge 부터 10년씩 끝없이 이어진다
 * (재감사 SP-1·SI-5 — 예전엔 10칸 목록이 끝나면 마지막 칸을 '현재'라 했다).
 */
export function daeunIndexAtAge(startAge: number, age: number): number {
  if (!Number.isFinite(age) || !Number.isFinite(startAge) || age < startAge) return -1
  return Math.floor((age - startAge) / DAEUN_SPAN_YEARS)
}

/**
 * 대운 목록 길이 — 최소 10칸, 만 나이가 그 너머면 지금 걸린 대운까지 덮는다
 * (1920년생 시작 1세, 만 106세 → 11칸: …戊子@91, 己丑@101).
 */
export function daeunListLength(startAge: number, age: number): number {
  return Math.max(DAEUN_LIST_MIN_LENGTH, daeunIndexAtAge(startAge, age) + 1)
}

/** 만 나이 — 출생지 시간대의 *민용* 생일 기준(currentManAge, CONVENTIONS §14). */
export function daeunManAge(
  civilBirth: { year: number; month: number; day: number },
  birthTimeZone: string,
  now: Date = new Date()
): number {
  return currentManAge({
    birthYear: civilBirth.year,
    birthMonth: civilBirth.month,
    birthDate: civilBirth.day,
    birthTimeZone,
    now,
  })
}

/**
 * 목록에서 만 나이 age 에 걸린 대운의 순번 — 칸 i 는 [list[i].age, 다음 칸 age) 구간
 * (마지막 칸은 + 10년)을 맡는다. 첫 대운 전이면 −1, 목록이 age 를 덮지 못하면 null
 * (끝난 대운을 '현재'라 부르지 않는다 — 호출자가 목록을 늘려야 한다).
 * 현재 대운 표시(currentDaeun)와 Life 티어 now 플래그(toLifetime)가 같은 규칙을 쓴다.
 */
export function runningDaeunIndex(startAges: readonly number[], age: number): number | null {
  if (!startAges.length || !Number.isFinite(age)) return null
  if (age < startAges[0]) return -1
  for (let i = 0; i < startAges.length; i++) {
    const end = i + 1 < startAges.length ? startAges[i + 1] : startAges[i] + DAEUN_SPAN_YEARS
    if (age >= startAges[i] && age < end) return i
  }
  return null
}

/**
 * 현재 대운 — 순수 함수 SSOT (엔진 감사 E14 · SAJU-7 · SAJU-8, OD-12; 재감사 SP-1 · SI-5).
 *
 * list 는 시작 나이(만 나이, 오름차순) 대운 목록. 만 나이는 출생지 시간대의 *민용* 생일
 * 기준(currentManAge, CONVENTIONS §14). 칸 i 는 [list[i].age, list[i].age + 10) 을 맡고,
 * 만 나이가 든 칸이 current.
 *
 * 첫 대운 전에는 월주(月柱)가 그 시기를 맡으므로 대운을 current 로 부르지 않는다 —
 * current = null, preDaeun = { startsAtAge: list[0].age }. 예전엔 `|| list[0]` 폴백으로
 * 만 4세 아이에게 7세 대운을 '현재 대운'이라 했다.
 *
 * 목록이 만 나이를 덮지 못하면(시작 나이 + 100세 이상인데 10칸뿐인 옛/캐시 목록) current =
 * null — 예전엔 마지막 칸(이미 끝난 91~100세 대운)을 돌려줬다(재감사 SP-1). 목록은
 * calculateSajuData / resolveDaeunAt(saju.ts)이 daeunListLength 로 지금 대운까지 늘린다.
 *
 * calculateSajuData 와 /api/saju 가 같은 함수를 쓴다 — /api/saju 는 캐시된(계산 시점의)
 * 목록·current 를 버리고 요청마다 resolveDaeunAt 으로 다시 맞춘다.
 */
export function currentDaeun<T extends { age: number }>(
  list: readonly T[],
  civilBirth: { year: number; month: number; day: number },
  birthTimeZone: string,
  now: Date = new Date()
): CurrentDaeunResult<T> {
  if (!list.length) return { current: null, preDaeun: null }
  const age = daeunManAge(civilBirth, birthTimeZone, now)
  const idx = runningDaeunIndex(
    list.map((d) => d.age),
    age
  )
  if (idx === -1) return { current: null, preDaeun: { startsAtAge: list[0].age } }
  if (idx === null) return { current: null, preDaeun: null }
  return { current: list[idx], preDaeun: null }
}

/** 대운 칸의 최소 형상 — 시작 만 나이 + 간지 이름(NatalContext.saju.daeun 과 같은 키). */
export interface DaeunCell {
  startAge: number
  stem: string
  branch: string
}

/**
 * 목록이 만 나이 age 의 대운을 덮지 못할 때 뒤에 이어 붙일 칸들(덮으면 []).
 * 방향(순행/역행)은 목록 첫 두 칸에서 읽고 같은 60갑자 순서열을 10년 간격으로 잇는다 —
 * 엔진 목록(saju.ts)과 같은 산술(cycles.stepStemBranch). 영구 캐시된 본명 컨텍스트
 * (NatalContextCache)가 계산 이후 100세+ 다음 대운으로 넘어가도 Life 티어가 현재
 * 대운을 잃지 않게 한다. 칸이 2개 미만이거나 간지를 읽을 수 없으면 [].
 */
export function daeunCellsToCover(cells: readonly DaeunCell[], age: number): DaeunCell[] {
  if (cells.length < 2) return []
  const startAge = cells[0].startAge
  const need = daeunIndexAtAge(startAge, age) + 1
  if (need <= cells.length) return []
  const fwd = stepStemBranch(cells[0].stem, cells[0].branch, 1)
  const isForward = !!fwd && fwd.stem.name === cells[1].stem && fwd.branch.name === cells[1].branch
  if (!isForward) {
    const back = stepStemBranch(cells[0].stem, cells[0].branch, -1)
    if (!back || back.stem.name !== cells[1].stem || back.branch.name !== cells[1].branch) {
      return []
    }
  }
  const dir = isForward ? 1 : -1
  const out: DaeunCell[] = []
  for (let i = cells.length; i < need; i++) {
    const sb = stepStemBranch(cells[0].stem, cells[0].branch, dir * i)
    if (!sb) return []
    out.push({
      startAge: startAge + i * DAEUN_SPAN_YEARS,
      stem: sb.stem.name,
      branch: sb.branch.name,
    })
  }
  return out
}

/** 'YYYY-MM-DD'(양력 민용 날짜) → { year, month, day }. 형식이 틀리면 null. */
export function parseCivilDate(s: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s ?? '').trim())
  if (!m) return null
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}
