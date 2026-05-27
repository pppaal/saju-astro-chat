'use client'

/**
 * Month tier premium dashboard.
 *
 * 구성:
 *   1. Premium Hero — 이달 평균 점수 + verdict
 *   2. Theme Radar — 5 테마 일별 평균
 *   3. Flow Chart — 일별 area + 베스트(녹)/주의(분홍)/수렴(보라) reference dots
 *   4. Highlights — 베스트/주의/수렴 날 3 카드 (클릭 시 daily 뷰)
 *
 * 달력 그리드와 MonthlyInterpretationCard 본문은 부모(DestinyMatrixPlanner)에서
 * 분리 렌더 — 그리드는 actionable surface, interp 는 deep narrative.
 */

import { useMemo } from 'react'
import type { ImportantDate } from '../types'
import { getGrade } from '../scoreGrade'
import PremiumHero, { type ScoreBreakdown } from './shared/PremiumHero'
import ThemeRadar, { type ThemeScore } from './shared/ThemeRadar'
import FlowChart, { type FlowPoint } from './shared/FlowChart'
import Highlights from './shared/Highlights'
import { getCalLabels, type CalLocale } from './labels'

const THEME_ORDER: Array<'growth' | 'career' | 'money' | 'love' | 'health'> = [
  'growth',
  'career',
  'money',
  'love',
  'health',
]

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

    // 0. 점수 분포 — 사주축·점성축·합치도 평균. 엔진 scoreBreakdown 이 일별로
    //    부착돼 있으므로 그 달 평균. "이 54점이 어떻게 나왔는지" 한눈에.
    // raw (실제 신호 강도) 우선 집계 — sajuAxis 는 v2 override 시프트값이라
    // 사용자 chip 표시에 misleading. Raw 가 있으면 그쪽 평균을, 없으면 shifted 폴백.
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

    // 1. 테마 radar — 5축 일별 평균.
    //    신호 없는 테마(cnt===0)를 50으로 fabricate 하면 radar 모양이 거짓말이
    //    되므로(전 축 50 → 풀 펜타곤), 평균이 가능한 축들의 평균을 fallback 으로
    //    사용해 형태는 정직하게. missing 목록은 caption 에 disclose.
    const themeStats = THEME_ORDER.map((key) => {
      let sum = 0
      let cnt = 0
      for (const d of monthDates) {
        const v = d.themeScores?.[key]
        if (typeof v === 'number') {
          sum += v
          cnt += 1
        }
      }
      return { key, name: t.themeName(key), present: cnt > 0, score: cnt > 0 ? sum / cnt : null }
    })
    const presentScores = themeStats.filter((s) => s.score != null).map((s) => s.score as number)
    const fallbackScore = presentScores.length
      ? presentScores.reduce((a, b) => a + b, 0) / presentScores.length
      : 50
    const themes: ThemeScore[] = themeStats.map((s) => ({
      name: s.name,
      score: Math.round(s.present ? (s.score as number) : fallbackScore),
    }))
    const missingThemeNames = themeStats.filter((s) => !s.present).map((s) => s.name)
    const themeCaption =
      missingThemeNames.length > 0 ? t.themeMissingCaption(missingThemeNames) : undefined

    // 2. 일자별 점수 맵 + best/worst
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

    // 3. 수렴 날 — interp.convergence.keyDays (점성·사주 양쪽 무거운 날, bothSystems
    // 만). 이전 keyEvents (단순 점수 기반) 와 다른 source — 의미 일치.
    const convergenceDays = new Set<number>()
    const interp = monthDates[0]?.monthlyInterpretation
    const monthKeyDays = interp?.convergence?.keyDays ?? []
    const bothSysDays = monthKeyDays.filter((d) => d.bothSystems)
    for (const day of bothSysDays) {
      const dayNum = parseInt(day.date.slice(8, 10), 10)
      if (dayNum >= 1 && dayNum <= daysInMonth) convergenceDays.add(dayNum)
    }

    // 4. Flow chart 데이터
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

    // 5. Highlights 카드
    const dayLabel = (d: number) =>
      locale === 'en' ? `${month + 1}/${d}` : `${month + 1}월 ${d}일`
    const bestCard = bestEntry
      ? { value: dayLabel(bestEntry[0]), description: t.bestDayDesc(bestEntry[1]) }
      : undefined
    const cautionCard = worstEntry
      ? { value: dayLabel(worstEntry[0]), description: t.cautionDayDesc(worstEntry[1]) }
      : undefined
    const convergenceList = Array.from(convergenceDays)
      .sort((a, b) => a - b)
      .slice(0, 4)
    const convergenceCard =
      convergenceList.length > 0
        ? {
            value: convergenceList.map((d) => (locale === 'en' ? `${d}` : `${d}일`)).join(', '),
            description: t.convergenceDesc,
          }
        : undefined

    // 6. "지금" 가이드 라벨 — 이 달이 현재 달일 때만
    const today = new Date()
    const nowDayLabel =
      today.getFullYear() === year && today.getMonth() === month
        ? locale === 'en'
          ? `${today.getDate()}`
          : `${today.getDate()}일`
        : null

    return {
      grade,
      themes,
      themeCaption,
      hasAnyTheme: presentScores.length > 0,
      flowData,
      bestCard,
      cautionCard,
      convergenceCard,
      bestDay: bestEntry?.[0],
      cautionDay: worstEntry?.[0],
      nowDayLabel,
      daysInMonth,
      breakdown,
    }
  }, [year, month, monthDates, monthScore, locale, t])

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

      {data.hasAnyTheme ? (
        <ThemeRadar themes={data.themes} caption={data.themeCaption} locale={locale} />
      ) : (
        <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-5 text-center text-sm text-zinc-400">
          {t.monthThemeEmpty}
        </div>
      )}

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

      <Highlights
        best={data.bestCard}
        caution={data.cautionCard}
        convergence={data.convergenceCard}
        bestLabel={t.bestDay}
        cautionLabel={t.cautionDay}
        convergenceLabel={t.convergenceDay}
        onBestClick={data.bestDay ? () => onDayClick(data.bestDay!) : undefined}
        onCautionClick={data.cautionDay ? () => onDayClick(data.cautionDay!) : undefined}
        locale={locale}
      />
    </div>
  )
}
