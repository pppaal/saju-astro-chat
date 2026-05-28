'use client'

/**
 * Year tier dashboard.
 *
 * 구성:
 *   1. Premium Hero — 한 해 평균 점수 + verdict
 *   2. Flow Chart — 12 개월 area + 베스트/주의/수렴 reference dots
 *   3. LifeTimeline — 큰 사건 위치 (대운 + astro milestones)
 *
 * 데이터: yearlyMonthly(점수 12개). 없으면(로딩 전) 폴백은 부모.
 */

import { useMemo } from 'react'
import type { ImportantDate } from '../types'
import type { YearMonthly } from '../DestinyMatrixPlanner'
import { getGrade } from '../scoreGrade'
import PremiumHero from './shared/PremiumHero'
import FlowChart, { type FlowPoint } from './shared/FlowChart'
import LifeTimeline from './shared/LifeTimeline'
import { computeLifeTimeline } from './shared/lifeTimeline'
import { getCalLabels, type CalLocale } from './labels'

interface Props {
  year: number
  /** 전체 ImportantDate (현재 미사용 — 호환성 위해 유지). */
  allDates?: ImportantDate[]
  yearlyMonthly?: YearMonthly[]
  /** "올해 큰 날" — convergence events (planner 가 lazy 로 채움). bothSystems 만 사용. */
  yearlyConvergence?: NonNullable<
    NonNullable<ImportantDate['monthlyInterpretation']>['yearlyConvergence']
  >
  /** 사용자 출생일 — life timeline 계산용 */
  birthDate?: string | null
  /** engine 현재 대운 라벨 — life timeline 의 active 항목 */
  currentPhaseLabel?: string | null
  /** UI 라벨 locale */
  locale?: CalLocale
  /** 달 클릭 → 그 달 monthly 뷰로 (0-indexed) */
  onMonthClick: (monthIdx: number) => void
}

export default function YearDashboard({
  year,
  yearlyMonthly,
  yearlyConvergence,
  birthDate,
  currentPhaseLabel,
  locale,
  onMonthClick,
}: Props) {
  const t = getCalLabels(locale)

  const lifeEntries = useMemo(
    () => computeLifeTimeline({ birthDate, currentPhaseLabel, thisYear: year }),
    [birthDate, currentPhaseLabel, year]
  )

  if (!yearlyMonthly || yearlyMonthly.length === 0) return null

  // 평균 점수 + grade
  const yearScore = Math.round(
    yearlyMonthly.reduce((a, m) => a + m.score, 0) / yearlyMonthly.length
  )
  const yearGrade = getGrade(yearScore)

  // verdict — best/worst 달로 자동 생성
  const sorted = [...yearlyMonthly].sort((a, b) => b.score - a.score)
  const bestM = sorted[0]
  const worstM = sorted[sorted.length - 1]
  const verdict =
    bestM && worstM && bestM.month !== worstM.month
      ? t.yearVerdict(bestM.month, worstM.month)
      : t.yearVerdictFlat

  // 수렴 달 — bothSystems 만
  const convergenceMonths = new Set<number>()
  if (yearlyConvergence?.keyDays) {
    for (const day of yearlyConvergence.keyDays.filter((d) => d.bothSystems)) {
      const m = parseInt(day.date.slice(5, 7), 10)
      if (m >= 1 && m <= 12) convergenceMonths.add(m)
    }
  }

  // Flow chart 데이터
  const flowData: FlowPoint[] = yearlyMonthly.map((m) => {
    let type: FlowPoint['type'] = 'normal'
    if (bestM && m.month === bestM.month) type = 'best'
    else if (worstM && m.month === worstM.month) type = 'caution'
    else if (convergenceMonths.has(m.month)) type = 'convergence'
    return {
      label: locale === 'en' ? `M${m.month}` : `${m.month}월`,
      score: m.score,
      type,
      fullLabel: locale === 'en' ? `${year} M${m.month}` : `${year}년 ${m.month}월`,
    }
  })

  return (
    <div className="space-y-6">
      <PremiumHero
        periodLabel={t.yearLabel(year)}
        verdict={verdict}
        score={yearScore}
        grade={yearGrade}
        locale={locale}
      />

      <FlowChart
        data={flowData}
        title={locale === 'en' ? 'Monthly flow' : '월별 에너지 흐름'}
        subtitle={t.flowSubtitle}
        xInterval={0}
        locale={locale}
        onPointClick={(label) => {
          const m = parseInt(label.replace(/[^0-9]/g, ''), 10)
          if (m >= 1 && m <= 12) onMonthClick(m - 1)
        }}
      />

      {lifeEntries.length > 0 && <LifeTimeline entries={lifeEntries} locale={locale} />}
    </div>
  )
}
