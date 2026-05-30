// src/lib/Saju/unse.ts

import { logger } from '@/lib/logger'
import { STEMS, BRANCHES, MONTH_STEM_LOOKUP, getSolarTermKST } from './constants'
import { isCheoneulGwiin } from './stemBranchUtils'
// 십신 / 정기 매핑은 core 모듈이 single source — saju.ts/unse.ts 둘 다 같은 것 사용.
import { getSibseong as getSibseongCore, getBranchSibsin } from './core/sibsin'
import type { BirthInstant } from '@/lib/datetime'
import {
  FiveElement,
  YinYang,
  DayMaster,
  DaeunData,
  YeonunData,
  WolunData,
  IljinData,
  StemBranchInfo,
  SajuPillars as SajuPillarsAll,
} from './types'
import { CALCULATION_STANDARDS } from '@/lib/config/calculationStandards'

// 내부 유틸: 로컬 타임존 영향 제거용 UTC Date 생성
const utcDate = (y: number, m1to12: number, d: number, hh = 0, mm = 0, ss = 0, ms = 0) =>
  new Date(Date.UTC(y, m1to12 - 1, d, hh, mm, ss, ms))

// 지지(branch)/천간(stem) 양쪽 인자를 받는 호환 wrapper — 옛 호출자가 stem/branch
// 객체 둘 다 들어오는 패턴이라 그대로 유지. 지지면 정기 자동 lookup 으로 음양
// 뒤집힘 (S3) 자동 fix. 천간이면 core getSibseong 호출.
function getSibseong(
  dayMaster: { element: FiveElement; yin_yang: YinYang },
  target: StemBranchInfo & { name?: string }
): string {
  if (!dayMaster || !target) return ''
  // BRANCHES 안에 있으면 지지 — 정기 매핑.
  if (target.name && BRANCHES.some((b) => b.name === target.name)) {
    return getBranchSibsin(dayMaster, target.name)
  }
  // 천간 — core 직접 호출.
  return getSibseongCore(dayMaster, target)
}

// 옛 코드의 normalizeBirthToUTC 는 birthDate (이미 UTC instant) 를 server-local
// accessor 로 재분해 → timezone 으로 재해석 하는 두 번 변환 패턴이라 UTC 서버
// (Vercel) 에서 ±tzOffset 어긋났다 (S1). 사주 계산의 single source 는 UTC
// instant 라서 그냥 그대로 사용. 변환 helper 자체를 제거.

/* === 대운 라운딩 정책 === */
const DAEUN_ROUNDING = CALCULATION_STANDARDS.saju.daeunRounding
function daysToDaeunAge(days: number): number {
  const v = days / 3
  let age: number
  if (DAEUN_ROUNDING === 'ceil') {
    age = Math.ceil(v)
  } else if (DAEUN_ROUNDING === 'floor') {
    age = Math.floor(v)
  } else {
    age = Math.round(v)
  }
  // Display in Korean age (한국나이): everyone counts age 1 at birth and
  // gains a year on Jan 1, so the "days/3" man-nai value is bumped by 1.
  return Math.max(1, age) + 1
}

export function getDaeunCycles(
  birthDate: BirthInstant,
  gender: 'male' | 'female',
  sajuPillars: SajuPillarsAll,
  dayMaster: DayMaster,
  timezone: string
): { daeunsu: number; cycles: DaeunData[] } {
  // timezone 인자는 더 이상 사용 안 함 (절기 lookup 은 KASI KST 데이터). 호환성
  // 위해 시그니처는 유지 — 호출자가 인자 빼면 BC 깨짐.
  void timezone
  if (!birthDate || !sajuPillars || !dayMaster) {
    logger.error('getDaeunCycles: 유효하지 않은 인자')
    return { daeunsu: 0, cycles: [] }
  }

  const yearStemYinYang = sajuPillars.year.heavenlyStem.yin_yang
  const isForward =
    (yearStemYinYang === '양' && gender === 'male') ||
    (yearStemYinYang === '음' && gender === 'female')

  // birthDate 는 이미 UTC instant — saju.ts 의 toDate(..., {timeZone}) 결과.
  // 재해석 없이 직접 KASI 절기 lookup (KST 변환은 getSolarTermKST 내부).
  const birthUTC = birthDate
  const y = birthUTC.getUTCFullYear()
  const m = birthUTC.getUTCMonth() + 1

  // 주의: getSolarTermKST가 KST 기준 Date를 반환한다고 가정
  const cur = getSolarTermKST(y, m)
  if (!cur) {
    return { daeunsu: 0, cycles: [] }
  }

  let previousTerm: Date, nextTerm: Date
  if (birthUTC.getTime() >= cur.getTime()) {
    const nm = m === 12 ? 1 : m + 1
    const ny = m === 12 ? y + 1 : y
    previousTerm = cur
    const nt = getSolarTermKST(ny, nm)
    if (!nt) {
      return { daeunsu: 0, cycles: [] }
    }
    nextTerm = nt
  } else {
    const pm = m === 1 ? 12 : m - 1
    const py = m === 1 ? y - 1 : y
    const pt = getSolarTermKST(py, pm)
    if (!pt) {
      return { daeunsu: 0, cycles: [] }
    }
    previousTerm = pt
    nextTerm = cur
  }

  const diffMs = isForward
    ? nextTerm.getTime() - birthUTC.getTime()
    : birthUTC.getTime() - previousTerm.getTime()
  const diffDays = diffMs / 86400000
  const daeunsu = daysToDaeunAge(diffDays)

  const cycles: DaeunData[] = []
  const startStemIndex = STEMS.findIndex((s) => s.name === sajuPillars.month.heavenlyStem.name)
  const startBranchIndex = BRANCHES.findIndex(
    (b) => b.name === sajuPillars.month.earthlyBranch.name
  )
  if (startStemIndex === -1 || startBranchIndex === -1) {
    logger.error('대운 시작 간지 탐색 실패')
    return { daeunsu: 0, cycles: [] }
  }

  const direction = isForward ? 1 : -1
  for (let i = 0; i < 10; i++) {
    const age = daeunsu + i * 10
    const step = i + 1
    const stemIndex = (startStemIndex + step * direction + 1000) % 10
    const branchIndex = (startBranchIndex + step * direction + 1200) % 12
    const stem = STEMS[stemIndex]
    const branch = BRANCHES[branchIndex]
    if (stem && branch) {
      cycles.push({
        age,
        heavenlyStem: stem.name,
        earthlyBranch: branch.name,
        sibsin: {
          cheon: getSibseong(dayMaster, stem),
          ji: getSibseong(dayMaster, branch),
        },
      })
    }
  }

  return { daeunsu, cycles }
}

export function getAnnualCycles(
  startYear: number,
  count: number,
  dayMaster: DayMaster
): YeonunData[] {
  const cycles: YeonunData[] = []
  // 연도순으로 정렬: startYear, startYear+1, startYear+2, ...
  for (let i = 0; i < count; i++) {
    const year = startYear + i
    const gapja_index = (year - 4 + 6000) % 60
    const stem = STEMS[gapja_index % 10]
    const branch = BRANCHES[gapja_index % 12]
    if (stem && branch) {
      cycles.push({
        year,
        heavenlyStem: stem.name,
        earthlyBranch: branch.name,
        sibsin: { cheon: getSibseong(dayMaster, stem), ji: getSibseong(dayMaster, branch) },
      })
    }
  }
  return cycles
}

// 절기(월) → 지지 매핑: 절기월 2=寅, 3=卯, ... 12=子, 1=丑
const SOLAR_TERM_MONTH_TO_BRANCH: Record<number, string> = {
  2: '寅',
  3: '卯',
  4: '辰',
  5: '巳',
  6: '午',
  7: '未',
  8: '申',
  9: '酉',
  10: '戌',
  11: '亥',
  12: '子',
  1: '丑',
}

export interface WolunDataExtended extends WolunData {
  solarTermStart?: Date // 절입일 (절기 시작)
  solarTermEnd?: Date // 다음 절입일 전까지
}

export function getMonthlyCycles(
  year: number,
  dayMaster: DayMaster,
  options?: { useSolarTerms?: boolean }
): WolunDataExtended[] {
  const cycles: WolunDataExtended[] = []
  const useSolarTerms =
    options?.useSolarTerms ?? CALCULATION_STANDARDS.saju.useSolarTermsForMonthlyCycles

  // 해당 연도의 년간 찾기 (입춘 기준, 간편화: 양력 연도 사용)
  const year_gapja_index = (year - 4 + 6000) % 60
  const yearStemName = STEMS[year_gapja_index % 10]?.name
  if (!yearStemName) {
    return []
  }

  const firstMonthStemName = MONTH_STEM_LOOKUP[yearStemName] // 寅월의 월간
  const firstMonthStemIndex = STEMS.findIndex((s) => s.name === firstMonthStemName)
  const TIGER_INDEX = BRANCHES.findIndex((b) => b.name === '寅')

  // 절기 기반: 월 2~12, 다음해 1 (입춘~소한)
  // 양력 기준: 월 1~12 (간편화 모드)
  if (useSolarTerms) {
    // 절기 기반 정밀 모드: 절기월 2(입춘)~1(소한) 순환
    const solarMonths = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1]

    for (let i = 0; i < 12; i++) {
      const solarMonth = solarMonths[i]
      const isNextYear = solarMonth === 1 // 1월(소한)은 다음해에 속함
      const actualYear = isNextYear ? year + 1 : year

      const branchName = SOLAR_TERM_MONTH_TO_BRANCH[solarMonth]
      const branchIndex = BRANCHES.findIndex((b) => b.name === branchName)
      const offsetFromTiger = (branchIndex - TIGER_INDEX + 12) % 12
      const stem = STEMS[(firstMonthStemIndex + offsetFromTiger) % 10]
      const branch = BRANCHES[branchIndex]

      // 절입일 계산
      const termStart = getSolarTermKST(actualYear, solarMonth)
      const nextSolarMonth = solarMonths[(i + 1) % 12]
      const nextActualYear =
        nextSolarMonth <= solarMonth && nextSolarMonth !== 1
          ? actualYear + 1
          : nextSolarMonth === 1 && solarMonth !== 12
            ? actualYear + 1
            : actualYear
      const termEnd = getSolarTermKST(nextActualYear, nextSolarMonth)

      cycles.push({
        year: actualYear,
        month: solarMonth,
        heavenlyStem: stem.name,
        earthlyBranch: branch.name,
        sibsin: { cheon: getSibseong(dayMaster, stem), ji: getSibseong(dayMaster, branch) },
        solarTermStart: termStart ?? undefined,
        solarTermEnd: termEnd ?? undefined,
      })
    }
  } else {
    // 간편 모드: 양력월 1~12 → 지지 丑~子 순서
    const G_BRANCH: ReadonlyArray<string> = [
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
      '子',
    ]

    for (let i = 0; i < 12; i++) {
      const month = i + 1
      const branchName = G_BRANCH[i]
      const branchIndex = BRANCHES.findIndex((b) => b.name === branchName)
      const offsetFromTiger = (branchIndex - TIGER_INDEX + 12) % 12
      const stem = STEMS[(firstMonthStemIndex + offsetFromTiger) % 10]
      const branch = BRANCHES[branchIndex]

      cycles.push({
        year,
        month,
        heavenlyStem: stem.name,
        earthlyBranch: branch.name,
        sibsin: { cheon: getSibseong(dayMaster, stem), ji: getSibseong(dayMaster, branch) },
      })
    }
  }

  return cycles.sort((a, b) => a.month - b.month)
}

/* ===================== 일진(KST 기준) 확정 ===================== */
export function getIljinCalendar(year: number, month: number, dayMaster: DayMaster): IljinData[] {
  const calendar: IljinData[] = []

  const kstMidnightUTC = (Y: number, M: number, D: number): number =>
    Date.UTC(Y, M - 1, D, -9, 0, 0, 0)

  // 1984-02-04 00:00 KST == 1984-02-03 15:00 UTC
  const BASE_UTC_MS = Date.UTC(1984, 1, 3, 15, 0, 0, 0)
  const BASE_EPOCH_DAYS = Math.floor(BASE_UTC_MS / 86400000)
  const DAY_MS = 86400000

  const firstUTC = kstMidnightUTC(year, month, 1)
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const nextFirstUTC = kstMidnightUTC(nextYear, nextMonth, 1)

  let d = 1
  for (let ms = firstUTC; ms < nextFirstUTC; ms += DAY_MS, d++) {
    const curDays = Math.floor(ms / DAY_MS)
    const offset = curDays - BASE_EPOCH_DAYS + 4 // 포함 보정

    const stemIndex = ((offset % 10) + 10) % 10
    const branchIndex = ((offset % 12) + 12) % 12

    const stem = STEMS[stemIndex]
    const branch = BRANCHES[branchIndex]
    if (!stem || !branch) {
      continue
    }

    calendar.push({
      year,
      month,
      day: d,
      heavenlyStem: stem.name,
      earthlyBranch: branch.name,
      sibsin: {
        cheon: getSibseong(dayMaster, stem),
        ji: getSibseong(dayMaster, branch),
      },
      isCheoneulGwiin: isCheoneulGwiin(dayMaster.name, branch.name),
    })
  }

  return calendar
}
