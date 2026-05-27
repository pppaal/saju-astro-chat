'use client'

/**
 * Year tier minimal dashboard (사용자 cut 요청 후 단순화).
 *
 * 구성:
 *   1. Premium Hero — 한 해 평균 점수 + verdict + 사주/점성/합치 분포 chip
 *   2. Flow Chart — 12 개월 area + 베스트/주의/수렴 reference dots
 *
 * 제거됨 (정보 중복):
 *   - ThemeRadar (월별 평균이라 평평한 경향)
 *   - Highlights 3 카드 (Flow chart dot 으로 충분)
 *   - LifeTimeline (인생 호기심, 매일 안 봄)
 *   - "전통 사주" collapsed (engine 이 곧 fusion 이라 별도 라벨 무의미)
 *
 * 데이터: yearlyMonthly(점수·테마 12개). 없으면(로딩 전) 폴백은 부모.
 */

import type { ImportantDate } from '../types'
import type { YearMonthly } from '../DestinyMatrixPlanner'
import { getGrade } from '../scoreGrade'
import PremiumHero, { type ScoreBreakdown } from './shared/PremiumHero'
import FlowChart, { type FlowPoint } from './shared/FlowChart'
import { getCalLabels, type CalLocale } from './labels'

interface Props {
  year: number
  allDates: ImportantDate[]
  yearlyMonthly?: YearMonthly[]
  /** "올해 큰 날" — convergence events (planner 가 lazy 로 채움). bothSystems 만 사용. */
  yearlyConvergence?: NonNullable<
    NonNullable<ImportantDate['monthlyInterpretation']>['yearlyConvergence']
  >
  /** 사용자 출생일 — life timeline 계산용 (현재 미사용, 향후 추가 가능) */
  birthDate?: string | null
  /** engine 현재 대운 라벨 — 향후 hero context strip 에 사용 가능 */
  currentPhaseLabel?: string | null
  /** UI 라벨 locale */
  locale?: CalLocale
  /** 달 클릭 → 그 달 monthly 뷰로 (0-indexed) */
  onMonthClick: (monthIdx: number) => void
}

export default function YearDashboard({
  year,
  allDates,
  yearlyMonthly,
  yearlyConvergence,
  locale,
  onMonthClick,
}: Props) {
  const t = getCalLabels(locale)

  if (!yearlyMonthly || yearlyMonthly.length === 0) return null

  // 평균 점수 + grade
  const yearScore = Math.round(
    yearlyMonthly.reduce((a, m) => a + m.score, 0) / yearlyMonthly.length
  )
  const yearGrade = getGrade(yearScore)

  // 점수 분포 — raw 우선
  let sajuSum = 0
  let astroSum = 0
  let sajuRawSum = 0
  let astroRawSum = 0
  let sajuRawCount = 0
  let astroRawCount = 0
  let agreeSum = 0
  let sbCount = 0
  let agreeCount = 0
  for (const d of allDates) {
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
  const yearBreakdown: ScoreBreakdown | null =
    sbCount > 0
      ? {
          sajuAxis: sajuSum / sbCount,
          astroAxis: astroSum / sbCount,
          sajuAxisRaw: sajuRawCount > 0 ? sajuRawSum / sajuRawCount : null,
          astroAxisRaw: astroRawCount > 0 ? astroRawSum / astroRawCount : null,
          agreementPercent: agreeCount > 0 ? agreeSum / agreeCount : null,
        }
      : null

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
        breakdown={yearBreakdown}
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
    </div>
  )
}
