'use client'

/**
 * Month tier minimal dashboard (사용자 cut 요청 후 단순화).
 *
 * 구성:
 *   1. Premium Hero — 이달 평균 점수 + verdict
 *   2. Flow Chart — 일별 area + 베스트/주의/수렴 reference dots
 *
 * 제거됨 (정보 중복):
 *   - ThemeRadar (5축 일별 평균)
 *   - Highlights 3 카드 (Flow chart dot 으로 충분)
 *
 * 달력 그리드는 부모(DestinyMatrixPlanner)에서 분리 렌더 — 그리드는 actionable surface.
 */

import { useMemo } from 'react'
import type { ImportantDate } from '../types'
import { getGrade } from '../scoreGrade'
import PremiumHero, { type ScoreBreakdown } from './shared/PremiumHero'
import FlowChart, { type FlowPoint } from './shared/FlowChart'
import { getCalLabels, type CalLocale } from './labels'

interface Props {
  year: number
  /** 0-indexed */
  month: number
  /** "MAY 2026" 같은 헤더 라벨 */
  monthLabel: string
  monthDates: ImportantDate[]
  monthScore: number
  /** engine monthSummary.summary 또는 oneLineSummary */
  monthSummary?: string | null
  /** UI 라벨 locale */
  locale?: CalLocale
  onDayClick: (day: number) => void
}

export default function MonthDashboard({
  year,
  month,
  monthLabel,
  monthDates,
  monthScore,
  monthSummary,
  locale,
  onDayClick,
}: Props) {
  const t = getCalLabels(locale)
  const data = useMemo(() => {
    if (monthDates.length === 0) return null

    const grade = getGrade(monthScore)
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // 점수 분포 (Hero chip 용) — sajuAxisRaw 우선, 없으면 shifted axis.
    let sajuSum = 0
    let astroSum = 0
    let sajuRawSum = 0
    let astroRawSum = 0
    let sajuRawCount = 0
    let astroRawCount = 0
    let agreeSum = 0
    let sbCount = 0
    let agreeCount = 0
    for (const d of monthDates) {
      if (d.scoreBreakdown) {
        sajuSum += d.scoreBreakdown.sajuAxis
        astroSum += d.scoreBreakdown.astroAxis
        if (typeof d.scoreBreakdown.sajuAxisRaw === 'number') {
          sajuRawSum += d.scoreBreakdown.sajuAxisRaw
          sajuRawCount += 1
        }
        if (typeof d.scoreBreakdown.astroAxisRaw === 'number') {
          astroRawSum += d.scoreBreakdown.astroAxisRaw
          astroRawCount += 1
        }
        sbCount += 1
      }
      const a = d.evidence?.crossAgreementPercent
      if (typeof a === 'number') {
        agreeSum += a
        agreeCount += 1
      }
    }
    const breakdown: ScoreBreakdown | null =
      sbCount > 0
        ? {
            sajuAxis: sajuSum / sbCount,
            astroAxis: astroSum / sbCount,
            sajuAxisRaw: sajuRawCount > 0 ? sajuRawSum / sajuRawCount : null,
            astroAxisRaw: astroRawCount > 0 ? astroRawSum / astroRawCount : null,
            agreementPercent: agreeCount > 0 ? agreeSum / agreeCount : null,
          }
        : null

    // 일자별 점수 맵 + best/worst (FlowChart dot type 결정용)
    const byDay = new Map<number, number>()
    for (const d of monthDates) {
      const day = parseInt(d.date.slice(8, 10), 10)
      const s = d.displayScore ?? d.score
      if (typeof s === 'number' && day >= 1 && day <= daysInMonth) {
        byDay.set(day, s)
      }
    }
    const dayScoreList = Array.from(byDay.entries()).sort((a, b) => b[1] - a[1])
    const bestEntry = dayScoreList[0]
    const worstEntry = dayScoreList[dayScoreList.length - 1]

    // 수렴 날 — interp.convergence.keyDays (점성·사주 양쪽 무거운 날) bothSystems 만.
    const convergenceDays = new Set<number>()
    const interp = monthDates[0]?.monthlyInterpretation
    const monthKeyDays = interp?.convergence?.keyDays ?? []
    const bothSysDays = monthKeyDays.filter((d) => d.bothSystems)
    for (const day of bothSysDays) {
      const dayNum = parseInt(day.date.slice(8, 10), 10)
      if (dayNum >= 1 && dayNum <= daysInMonth) convergenceDays.add(dayNum)
    }

    // Flow chart 데이터
    const flowData: FlowPoint[] = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      const score = byDay.get(day) ?? null
      let type: FlowPoint['type'] = 'normal'
      if (bestEntry && day === bestEntry[0]) type = 'best'
      else if (worstEntry && day === worstEntry[0]) type = 'caution'
      else if (convergenceDays.has(day)) type = 'convergence'
      return {
        label: locale === 'en' ? `${day}` : `${day}일`,
        score,
        type,
        fullLabel:
          locale === 'en'
            ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            : `${year}년 ${month + 1}월 ${day}일`,
      }
    })

    // "지금" 가이드 라벨 — 이 달이 현재 달일 때만
    const today = new Date()
    const nowDayLabel =
      today.getFullYear() === year && today.getMonth() === month
        ? locale === 'en'
          ? `${today.getDate()}`
          : `${today.getDate()}일`
        : null

    return { grade, flowData, daysInMonth, nowDayLabel, breakdown }
  }, [year, month, monthDates, monthScore, locale])

  if (!data) return null

  const verdict = monthSummary?.trim() || t.monthVerdictFallback(t.gradeLabel(data.grade.key))

  return (
    <div className="space-y-6">
      <PremiumHero
        periodLabel={monthLabel}
        verdict={verdict}
        score={monthScore}
        grade={data.grade}
        breakdown={data.breakdown}
        locale={locale}
      />

      <FlowChart
        data={data.flowData}
        title={locale === 'en' ? 'Daily flow' : '일별 에너지 흐름'}
        subtitle={t.flowSubtitle}
        xInterval={4}
        nowLabel={data.nowDayLabel}
        locale={locale}
        onPointClick={(label) => {
          const day = parseInt(label.replace(/[^0-9]/g, ''), 10)
          if (day >= 1 && day <= data.daysInMonth) onDayClick(day)
        }}
      />
    </div>
  )
}
