// src/lib/Saju/unse.ts

import { STEMS, BRANCHES, MONTH_STEM_LOOKUP, getSolarTermKST } from './constants'
// 연운/일진 산술의 single source.
import {
  getAnnualCycles as getAnnualCyclesCanonical,
  getIljinCalendar as getIljinCalendarCanonical,
} from './cycles'
// 십신 / 정기 매핑은 core 모듈이 single source — saju.ts/unse.ts 둘 다 같은 것 사용.
import { getSibseong as getSibseongCore, getBranchSibsin } from './core/sibsin'
import {
  FiveElement,
  YinYang,
  DayMaster,
  YeonunData,
  WolunData,
  IljinData,
  StemBranchInfo,
} from './types'
import { CALCULATION_STANDARDS } from '@/lib/config/calculationStandards'

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

// 연운 산술은 cycles.ts(single source) 로 위임 — 출력 byte 동일.
export function getAnnualCycles(
  startYear: number,
  count: number,
  dayMaster: DayMaster
): YeonunData[] {
  return getAnnualCyclesCanonical(startYear, count, dayMaster)
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
// 일간/일지 산정은 dayPillar.ts(computeDayPillarIndices, JDN+49) 가 single
// source. 이전엔 여기서 1984-02-04 KST 기준 epoch-days 공식을 따로 들고 있어
// calculateSajuData/dayPillar 와 갈라질 위험이 있었다. 두 공식은 1940~2050
// 전 구간에서 byte-단위로 동일함을 확인했고(테스트 saju-singlesource.iljin),
// 이제 JDN 한 곳으로 위임한다 — 출력 변화 없음.
// 일진 산술은 cycles.ts(single source) 로 위임 — 출력 byte 동일.
export function getIljinCalendar(year: number, month: number, dayMaster: DayMaster): IljinData[] {
  return getIljinCalendarCanonical(year, month, dayMaster)
}
