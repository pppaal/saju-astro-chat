'use client'

/**
 * Year tier premium dashboard.
 *
 * 구성:
 *   1. Premium Hero — 한 해 평균 점수 + verdict
 *   2. Theme Radar — 5 테마 12개월 평균
 *   3. Flow Chart — 12 개월 area + 베스트/주의/수렴 reference dots
 *   4. Highlights — 베스트/주의/수렴 달 3 카드 (클릭 시 그 달로 점프)
 *   5. Life Timeline — 대운 + astro milestones (birthDate 기반)
 *   6. (접힘) 전통 사주 한 해 흐름 — seunText 가 있을 때만
 *
 * 데이터: yearlyMonthly(점수·테마 12개) + allDates(전통 사주 텍스트 검색용).
 * yearlyMonthly 가 없으면(로딩 전) 렌더 안 함 — 폴백은 부모(YearHighlightsCard).
 */

import { useMemo, useState } from 'react'
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import type { ImportantDate } from '../types'
import type { YearMonthly } from '../DestinyMatrixPlanner'
import { getGrade } from '../scoreGrade'
import PremiumHero, { type ScoreBreakdown } from './shared/PremiumHero'
import ThemeRadar, { type ThemeScore } from './shared/ThemeRadar'
import FlowChart, { type FlowPoint } from './shared/FlowChart'
import Highlights from './shared/Highlights'
import LifeTimeline, { type TimelineEntry } from './shared/LifeTimeline'
import { computeLifeTimeline } from './shared/lifeTimeline'
import { getCalLabels, type CalLocale } from './labels'

// 5축 순서 — 모든 tier 통일 (성장/직업/재물/연애/건강).
const THEME_ORDER: Array<'growth' | 'career' | 'money' | 'love' | 'health'> = [
  'growth',
  'career',
  'money',
  'love',
  'health',
]

interface Props {
  year: number
  allDates: ImportantDate[]
  yearlyMonthly?: YearMonthly[]
  /** "올해 큰 날" — convergence events (planner 가 lazy 로 채움). events[].date 로
   *  진짜 수렴 달 추출 — keyEvents(같은 텍스트 365일 broadcast)와 다른 source. */
  yearlyConvergence?: NonNullable<
    NonNullable<ImportantDate['monthlyInterpretation']>['yearlyConvergence']
  >
  /** 사용자 출생일 — life timeline 계산용 */
  birthDate?: string | null
  /** engine 현재 대운 라벨 */
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
  birthDate,
  currentPhaseLabel,
  locale,
  onMonthClick,
}: Props) {
  const [showTrad, setShowTrad] = useState(false)
  const t = getCalLabels(locale)

  // 전통 사주 한 해 흐름 — seun section 텍스트 추출
  const seunText = useMemo(() => {
    for (const d of allDates) {
      const sec = d.monthlyInterpretation?.sections?.find((s) => s.section === 'seun')
      if (sec?.text) return sec.text.replace(/\*\*(.+?)\*\*/g, '$1').trim()
    }
    return null
  }, [allDates])

  // 엔진 lifetimePivots — early return 위에 둬야 hooks 순서 일정.
  const engineLifetimePivots = useMemo(() => {
    for (const d of allDates) {
      const p = d.monthlyInterpretation?.lifetimePivots?.pivots
      if (p && p.length > 0) return p
    }
    return null
  }, [allDates])

  // yearlyMonthly 없으면 렌더 안 함 (부모가 폴백)
  if (!yearlyMonthly || yearlyMonthly.length === 0) return null

  // 1. 평균 점수 + grade
  const yearScore = Math.round(
    yearlyMonthly.reduce((a, m) => a + m.score, 0) / yearlyMonthly.length
  )
  const yearGrade = getGrade(yearScore)

  // 1a. 점수 분포 — raw (실제 신호 강도) 우선. shifted axis 는 final 정렬값이라
  // chip 표시에 misleading. Raw 가 있으면 그쪽 평균, 없으면 shifted 폴백.
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

  // 2. verdict — best/worst 달로 자동 생성
  const sorted = [...yearlyMonthly].sort((a, b) => b.score - a.score)
  const bestM = sorted[0]
  const worstM = sorted[sorted.length - 1]
  const verdict =
    bestM && worstM && bestM.month !== worstM.month
      ? t.yearVerdict(bestM.month, worstM.month)
      : t.yearVerdictFlat

  // 3. Theme radar — 12개월 테마 평균. 신호 없는 테마는 fabricate(50) 대신
  //    가능한 축들 평균으로 fallback + caption disclose. (Audit 회귀: 풀 펜타곤.)
  const yearThemeStats = THEME_ORDER.map((key) => {
    let sum = 0
    let cnt = 0
    for (const m of yearlyMonthly) {
      const t = m.themes.find((x) => x.theme === key)
      if (t && typeof t.score === 'number') {
        sum += t.score
        cnt += 1
      }
    }
    return { name: t.themeName(key), present: cnt > 0, score: cnt > 0 ? sum / cnt : null }
  })
  const yearPresentScores = yearThemeStats
    .filter((s) => s.score != null)
    .map((s) => s.score as number)
  const yearFallback = yearPresentScores.length
    ? yearPresentScores.reduce((a, b) => a + b, 0) / yearPresentScores.length
    : 50
  const themes: ThemeScore[] = yearThemeStats.map((s) => ({
    name: s.name,
    score: Math.round(s.present ? (s.score as number) : yearFallback),
  }))
  const missingYearThemes = yearThemeStats.filter((s) => !s.present).map((s) => s.name)
  const yearThemeCaption =
    missingYearThemes.length > 0 ? t.themeMissingCaption(missingYearThemes) : undefined

  // 4. Flow chart — 12개월 + reference dot 타입.
  // best = 점수 1위, caution = 점수 12위, convergence = 양쪽 수렴(점성·사주
  // 둘 다 무거운) 큰 날의 월. bothSystems=false (단일축 heavy) 는 "양쪽 수렴"
  // 의미에 부합 안 해 제외 — 카드 카피와 데이터 의미 일치.
  const convergenceMonths = new Set<number>()
  if (yearlyConvergence?.keyDays) {
    const bothSysDays = yearlyConvergence.keyDays.filter((d) => d.bothSystems)
    for (const day of bothSysDays) {
      const m = parseInt(day.date.slice(5, 7), 10)
      if (m >= 1 && m <= 12) convergenceMonths.add(m)
    }
  }

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

  // 5. Highlights 3 카드
  const bestCard = bestM
    ? {
        value: locale === 'en' ? `M${bestM.month}` : `${bestM.month}월`,
        description: t.bestMonthDesc(bestM.score),
      }
    : undefined
  const cautionCard = worstM
    ? {
        value: locale === 'en' ? `M${worstM.month}` : `${worstM.month}월`,
        description: t.cautionMonthDesc(worstM.score),
      }
    : undefined
  const convergenceLabel =
    convergenceMonths.size > 0
      ? Array.from(convergenceMonths)
          .sort((a, b) => a - b)
          .slice(0, 4)
          .map((m) => (locale === 'en' ? `M${m}` : `${m}월`))
          .join(', ')
      : null
  const convergenceCard = convergenceLabel
    ? {
        value: convergenceLabel,
        description: t.convergenceDesc,
      }
    : undefined

  // 6. Life timeline — engine 의 lifetimePivots(점성 라이프사이클 + 사주 대운 병합)
  // 가 있으면 우선 사용. 엔진은 ±2년 안에 점성·사주가 겹치면 bothSystems 로 묶고
  // current/past/upcoming phase 까지 결정. 없을 때만 birthDate 기반 폴백.
  let timelineEntries: TimelineEntry[]
  if (engineLifetimePivots && engineLifetimePivots.length > 0) {
    // Astro milestones(Saturn return·Jupiter return 등 명명 분기점)는 절대 누락
    // 금지가 derivation 원칙. 단순 slice(0,6) 하면 daeun 이 6슬롯을 다 차지해
    // astro 가 잘리는 회귀 — 그래서 astro 4 + daeun 2 reserve 후 age 정렬.
    const future = engineLifetimePivots.filter((p) => p.phase !== 'past')
    const bothSys = future.filter((p) => p.bothSystems)
    const astroOnly = future.filter((p) => p.astro && !p.bothSystems)
    const daeunOnly = future.filter((p) => p.saju && !p.astro && !p.bothSystems)
    // 양쪽 수렴(가장 강한 신호) 먼저 → astro 4개 reserve → daeun 2개 reserve → 나머지
    const selected = [...bothSys.slice(0, 3), ...astroOnly.slice(0, 4), ...daeunOnly.slice(0, 2)]
      .filter((p, i, arr) => arr.findIndex((x) => x.age === p.age) === i)
      .sort((a, b) => a.age - b.age)
      .slice(0, 6)
    timelineEntries = selected.map((p) => ({
      ageLabel: locale === 'en' ? `Age ${p.age}` : `${p.age}세`,
      year: p.year,
      title: p.label,
      description:
        p.meaning ??
        (p.bothSystems ? t.pivotBothSystems : p.astro ? t.pivotAstroOnly : t.pivotDaeunOnly),
      active: p.phase === 'current',
    }))
  } else {
    timelineEntries = computeLifeTimeline({
      birthDate,
      currentPhaseLabel,
      thisYear: year,
    })
  }

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

      {yearPresentScores.length > 0 ? (
        <ThemeRadar themes={themes} caption={yearThemeCaption} locale={locale} />
      ) : (
        <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-5 text-center text-sm text-zinc-400">
          {t.yearThemeEmpty}
        </div>
      )}

      <FlowChart
        data={flowData}
        title={locale === 'en' ? 'Monthly flow' : '월별 에너지 흐름'}
        subtitle={t.flowSubtitle}
        xInterval={0}
        locale={locale}
        onPointClick={(label) => {
          // M{N} (en) 또는 N월 (ko) — 둘 다 숫자만 추출.
          const m = parseInt(label.replace(/[^0-9]/g, ''), 10)
          if (m >= 1 && m <= 12) onMonthClick(m - 1)
        }}
      />

      <Highlights
        best={bestCard}
        caution={cautionCard}
        convergence={convergenceCard}
        bestLabel={t.bestMonth}
        cautionLabel={t.cautionMonth}
        convergenceLabel={t.convergenceMonth}
        onBestClick={bestM ? () => onMonthClick(bestM.month - 1) : undefined}
        onCautionClick={worstM ? () => onMonthClick(worstM.month - 1) : undefined}
        locale={locale}
      />

      {timelineEntries.length > 0 && <LifeTimeline entries={timelineEntries} locale={locale} />}

      {seunText && (
        <div className="bg-zinc-900/40 rounded-2xl border border-white/10">
          <button
            onClick={() => setShowTrad((v) => !v)}
            className="w-full flex items-center gap-2 px-5 py-3 text-zinc-300 text-sm font-semibold"
          >
            <Sparkles className="w-4 h-4 text-amber-300/80" />
            {t.traditionalSajuYear}
            <span className="text-[11px] text-zinc-500 font-normal ml-2">
              {t.traditionalSajuYearCaveat}
            </span>
            {showTrad ? (
              <ChevronUp className="w-4 h-4 ml-auto" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-auto" />
            )}
          </button>
          {showTrad && (
            <p className="px-5 pb-5 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {seunText}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
