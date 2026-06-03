// src/lib/saju/cycles.ts
//
// 연운(年運)/월운(月運)/일진(日辰) 사이클 계산 — SINGLE SOURCE OF TRUTH.
//
// 옛 코드는 같은 stem-branch 산술이 saju.ts(standalone export + calculateSajuData
// 내부 inline 블록) 와 unse.ts 에 각각 따로 복제돼 있었다. 이 모듈이 그 산술의
// 단일 source 다.
//
// 주의 — 두 가지 "월운" convention 이 공존한다(의도적으로 분리 유지):
//   (A) 사주월(寅-first) convention: 월 1 → 寅. saju.ts 의 standalone
//       getMonthlyCycles 와 calculateSajuData 내부 inline 월운 블록이 사용.
//       => getSajuMonthlyCycles / buildSajuMonthEntry.
//   (B) 양력월(丑-first) + 절기 모드: unse.ts 의 getMonthlyCycles 가 사용.
//       값 자체가 (A)와 다르므로 합치지 않는다. unse.ts 에 그대로 남겨둠.
//
// 어떤 변경도 출력 바이트가 동일하게 유지되어야 한다(golden/determinism 테스트가
// 잠금). 이 파일은 기존 식(expression)을 그대로 추출한 것이다 — 재작성 아님.

import { STEMS, BRANCHES, MONTH_STEM_LOOKUP } from './constants'
import { isCheoneulGwiin } from './stemBranchUtils'
import { computeDayPillarIndices } from './dayPillar'
// 십신 / 정기 매핑은 core 모듈이 single source.
import { getBranchMainStem, getSibseong } from './core/sibsin'
import type { FiveElement, YinYang, IljinData, StemBranchInfo } from './types'

type DayMaster = { name: string; element: FiveElement; yin_yang: YinYang }

/* ===================== 저수준 primitive ===================== */

/** 연도 → 60갑자 인덱스 기반 (천간, 지지) 객체. */
export function annualStemBranch(year: number): { stem: StemBranchInfo; branch: StemBranchInfo } {
  const idx60 = (year - 4 + 6000) % 60
  return { stem: STEMS[idx60 % 10], branch: BRANCHES[idx60 % 12] }
}

// 사주월(寅-first): 월(1~12) → 지지. branchOrder[i] = 그 달의 BRANCHES 인덱스.
// [2,3,..,11,0,1] => 월1=BRANCHES[2]=寅, 월11=子, 월12=丑.
const SAJU_MONTH_BRANCH_ORDER = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1]

/**
 * 사주월(寅-first) convention 의 (천간, 지지). monthIndex0 는 0~11 (월-1).
 * 연간(year stem)으로 寅월 월간을 정하고 거기서부터 순행.
 */
export function sajuMonthStemBranch(
  year: number,
  monthIndex0: number
): { stem: StemBranchInfo; branch: StemBranchInfo } {
  const idx60 = (year - 4 + 6000) % 60
  const yearStemName = STEMS[idx60 % 10].name
  const firstMonthStemName = MONTH_STEM_LOOKUP[yearStemName]
  const firstMonthStemIndex = STEMS.findIndex((s) => s.name === firstMonthStemName)
  const stem = STEMS[(firstMonthStemIndex + monthIndex0) % 10]
  const branch = BRANCHES[SAJU_MONTH_BRANCH_ORDER[monthIndex0 % 12]]
  return { stem, branch }
}

/** 연운 1개의 십신 ({cheon, ji}) — 지지는 정기(main qi) 기준. */
function cycleSibsin(dayMaster: DayMaster, stem: StemBranchInfo, branch: StemBranchInfo) {
  const mainForB = getBranchMainStem(branch.name)
  return {
    cheon: getSibseong(dayMaster, stem),
    ji: getSibseong(dayMaster, mainForB ?? branch),
  }
}

/* ===================== 연운(年運) ===================== */

/**
 * 연운: startYear 부터 count 년치. saju.ts standalone 과 unse.ts 가 byte-동일하게
 * 산출하던 형식 — {year, heavenlyStem, earthlyBranch, sibsin}.
 */
export function getAnnualCycles(startYear: number, count: number, dayMaster: DayMaster) {
  const cycles: Array<{
    year: number
    heavenlyStem: string
    earthlyBranch: string
    sibsin: { cheon: string; ji: string }
  }> = []
  for (let i = 0; i < count; i++) {
    const year = startYear + i
    const { stem, branch } = annualStemBranch(year)
    cycles.push({
      year,
      heavenlyStem: stem.name,
      earthlyBranch: branch.name,
      sibsin: cycleSibsin(dayMaster, stem, branch),
    })
  }
  return cycles
}

/* ===================== 월운(月運): 사주월(寅-first) ===================== */

/**
 * 사주월(寅-first) 월운: 월 1~12, 지지 寅~丑. saju.ts standalone getMonthlyCycles
 * 가 산출하던 형식 — {month, heavenlyStem, earthlyBranch, sibsin}. (year/ganji/element
 * 필드 없음 — 기존 출력과 동일하게 유지.)
 */
export function getSajuMonthlyCycles(year: number, dayMaster: DayMaster) {
  const cycles: Array<{
    month: number
    heavenlyStem: string
    earthlyBranch: string
    sibsin: { cheon: string; ji: string }
  }> = []
  for (let i = 0; i < 12; i++) {
    const { stem, branch } = sajuMonthStemBranch(year, i)
    cycles.push({
      month: i + 1,
      heavenlyStem: stem.name,
      earthlyBranch: branch.name,
      sibsin: cycleSibsin(dayMaster, stem, branch),
    })
  }
  return cycles.sort((a, b) => (a.month ?? 0) - (b.month ?? 0))
}

/* ===================== 일진(日辰): KST 자정 경계 ===================== */

/**
 * 일진 달력. 일간/일지는 computeDayPillarIndices(JDN+49) single source 로 위임.
 * saju.ts / unse.ts 양쪽이 byte-동일하게 산출하던 형식.
 */
export function getIljinCalendar(year: number, month: number, dayMaster: DayMaster): IljinData[] {
  const calendar: IljinData[] = []
  // 월의 일수 — 그레고리력(윤년 포함). day=0 trick 으로 말일. UTC 로 로컬 tz 영향 제거.
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  for (let day = 1; day <= daysInMonth; day++) {
    const { stemIndex, branchIndex } = computeDayPillarIndices(year, month, day)
    const stem = STEMS[stemIndex]
    const branch = BRANCHES[branchIndex]
    if (!stem || !branch) {
      continue
    }
    calendar.push({
      year,
      month,
      day,
      heavenlyStem: stem.name,
      earthlyBranch: branch.name,
      sibsin: cycleSibsin(dayMaster, stem, branch),
      isCheoneulGwiin: isCheoneulGwiin(dayMaster.name, branch.name),
    })
  }
  return calendar
}
