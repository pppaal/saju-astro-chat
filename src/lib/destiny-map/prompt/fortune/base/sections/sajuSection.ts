/**
 * sajuSection.ts - 사주 데이터 섹션 빌더
 */

import type { SajuData } from '@/lib/destiny-map/astrology/types'
import type { PillarData, DaeunItem, AnnualItem, MonthlyItem } from '../prompt-types'
import { formatGanjiEasy, parseGanjiEasy, formatPillar } from '../formatters/ganjiFormatter'

interface SajuSectionData {
  pillars?: {
    year?: PillarData
    month?: PillarData
    day?: PillarData
    time?: PillarData
  }
  dayMaster?: { name?: string; element?: string }
  unse?: {
    daeun?: DaeunItem[]
    annual?: AnnualItem[]
    monthly?: MonthlyItem[]
  }
  sinsal?: {
    luckyList?: Array<{ name: string }>
    unluckyList?: Array<{ name: string }>
  }
  advancedAnalysis?: Record<string, unknown>
}

/**
 * 사주 기본 정보 추출
 */
export function extractSajuBasics(saju: SajuData) {
  const { pillars, dayMaster } = saju

  const pillarText =
    [
      formatPillar(pillars?.year),
      formatPillar(pillars?.month),
      formatPillar(pillars?.day),
      formatPillar(pillars?.time),
    ]
      .filter(Boolean)
      .join(' / ') || '-'

  const dayPillarStem = pillars?.day?.heavenlyStem?.name
  const dayPillarElement = pillars?.day?.heavenlyStem?.element
  const actualDayMaster = dayMaster?.name || dayPillarStem || '-'
  const actualDayMasterElement = dayMaster?.element || dayPillarElement || '-'

  return {
    pillarText,
    actualDayMaster,
    actualDayMasterElement,
  }
}

/**
 * 대운/세운/월운 현재 흐름 계산
 */
export function calculateCurrentLuck(
  saju: SajuData,
  currentYear: number,
  currentMonth: number,
  currentAge: number
) {
  const daeunList = (saju.unse?.daeun ?? []) as DaeunItem[]
  const annualList = (saju.unse?.annual ?? []) as AnnualItem[]
  const monthlyList = (saju.unse?.monthly ?? []) as MonthlyItem[]

  // 현재 대운 찾기
  const currentDaeun = daeunList.find((d) => {
    const startAge = d.age ?? 0
    const endAge = startAge + 9
    return currentAge >= startAge && currentAge <= endAge
  })

  // 현재 세운
  const currentAnnual = annualList.find((a) => a.year === currentYear)

  // 현재 월운
  const currentMonthly = monthlyList.find((m) => m.year === currentYear && m.month === currentMonth)

  // 대운 텍스트
  const daeunText = currentDaeun
    ? `${currentDaeun.age}-${(currentDaeun.age ?? 0) + 9}세: ${formatGanjiEasy(currentDaeun.heavenlyStem, currentDaeun.earthlyBranch)}`
    : daeunList
        .slice(0, 3)
        .map(
          (u) =>
            `${u.age}-${(u.age ?? 0) + 9}세: ${formatGanjiEasy(u.heavenlyStem, u.earthlyBranch)}`
        )
        .join('; ')

  return {
    currentDaeun,
    currentAnnual,
    currentMonthly,
    daeunText,
  }
}

/**
 * 미래 운세 데이터 생성
 */
export function buildFutureLuckData(
  saju: SajuData,
  currentYear: number,
  currentMonth: number,
  currentAge: number
) {
  const daeunList = (saju.unse?.daeun ?? []) as DaeunItem[]
  const annualList = (saju.unse?.annual ?? []) as AnnualItem[]
  const monthlyList = (saju.unse?.monthly ?? []) as MonthlyItem[]

  // 전체 대운 흐름
  const allDaeunText = daeunList
    .map((d) => {
      const startAge = d.age ?? 0
      const endAge = startAge + 9
      const isCurrent = currentAge >= startAge && currentAge <= endAge
      const marker = isCurrent ? '★현재★' : ''
      const easyGanji = formatGanjiEasy(d.heavenlyStem, d.earthlyBranch)
      return `${startAge}-${endAge}세: ${easyGanji} ${marker}`
    })
    .join('\n  ')

  // 향후 연운
  const futureAnnualList = annualList
    .filter((a) => (a.year ?? 0) >= currentYear && (a.year ?? 0) <= currentYear + 5)
    .map((a) => {
      const isCurrent = a.year === currentYear
      const marker = isCurrent ? '★현재★' : ''
      const easyGanji = parseGanjiEasy(a.ganji ?? (a as { name?: string }).name)
      return `${a.year}년: ${easyGanji} ${marker}`
    })
    .join('\n  ')

  // 향후 월운
  const futureMonthlyList = monthlyList
    .filter((m) => {
      if ((m.year ?? 0) > currentYear) return true
      if ((m.year ?? 0) === currentYear && (m.month ?? 0) >= currentMonth) return true
      return false
    })
    .slice(0, 12)
    .map((m) => {
      const isCurrent = m.year === currentYear && m.month === currentMonth
      const marker = isCurrent ? '★현재★' : ''
      const easyGanji = parseGanjiEasy(m.ganji ?? (m as { name?: string }).name)
      return `${m.year}년 ${m.month}월: ${easyGanji} ${marker}`
    })
    .join('\n  ')

  return {
    allDaeunText,
    futureAnnualList,
    futureMonthlyList,
  }
}

/**
 * 신살 정보 추출
 */
export function extractSinsal(saju: SajuData) {
  type SinsalRecord = { luckyList?: Array<{ name: string }>; unluckyList?: Array<{ name: string }> }
  const sinsalRecord = saju.sinsal as SinsalRecord | undefined
  const lucky = (sinsalRecord?.luckyList ?? []).map((x) => x.name).join(', ')
  const unlucky = (sinsalRecord?.unluckyList ?? []).map((x) => x.name).join(', ')

  return { lucky, unlucky }
}
