'use client'

/**
 * Month tier dashboard.
 *
 * 구성:
 *   1. Premium Hero — 이달 평균 점수 + verdict
 *   2. Month Insights — 엔진 themeRanking + keyEvents + convergence 3 카드
 *   3. Flow Chart — 일별 area + 베스트/주의/수렴 reference dots
 *
 * 달력 그리드는 부모(DestinyMatrixPlanner)에서 분리 렌더 — 그리드는 actionable surface.
 */

import { useMemo } from 'react'
import type { ImportantDate } from '../types'
import { getGrade } from '../scoreGrade'
import PremiumHero from './shared/PremiumHero'
import FlowChart, { type FlowPoint } from './shared/FlowChart'
import MonthInsights from './shared/MonthInsights'
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

    return { grade, flowData, daysInMonth, nowDayLabel }
  }, [year, month, monthDates, monthScore, locale])

  if (!data) return null

  const verdict = monthSummary?.trim() || t.monthVerdictFallback(t.gradeLabel(data.grade.key))
  const monthInterp = monthDates[0]?.monthlyInterpretation

  return (
    <div className="space-y-6">
      <PremiumHero
        periodLabel={monthLabel}
        verdict={verdict}
        score={monthScore}
        grade={data.grade}
        locale={locale}
      />

      <MonthInsights interp={monthInterp} month={month} locale={locale} onDayClick={onDayClick} />

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
