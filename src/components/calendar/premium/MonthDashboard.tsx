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

const THEME_KOREAN: Record<string, string> = {
  growth: '성장',
  career: '직업',
  money: '재물',
  love: '연애',
  health: '건강',
}

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
  onDayClick: (day: number) => void
}

export default function MonthDashboard({
  year,
  month,
  monthLabel,
  monthDates,
  monthScore,
  monthSummary,
  onDayClick,
}: Props) {
  const data = useMemo(() => {
    if (monthDates.length === 0) return null

    const grade = getGrade(monthScore)
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    // 0. 점수 분포 — 사주축·점성축·합치도 평균. 엔진 scoreBreakdown 이 일별로
    //    부착돼 있으므로 그 달 평균. "이 54점이 어떻게 나왔는지" 한눈에.
    let sajuSum = 0
    let astroSum = 0
    let agreeSum = 0
    let sbCount = 0
    let agreeCount = 0
    for (const d of monthDates) {
      if (d.scoreBreakdown) {
        sajuSum += d.scoreBreakdown.sajuAxis
        astroSum += d.scoreBreakdown.astroAxis
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
      return { key, name: THEME_KOREAN[key], present: cnt > 0, score: cnt > 0 ? sum / cnt : null }
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
      missingThemeNames.length > 0
        ? `${missingThemeNames.join('·')} 신호 부족 — 다른 축 평균으로 표시했어요.`
        : undefined

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

    // 3. 수렴 날 — interp.convergence.keyDays (점성·사주 양쪽 무거운 날) 우선.
    // 이전엔 keyEvents.window/best (단순 점수 기반) 를 "수렴" 으로 잘못 라벨링.
    // bothSystems=true 만 사용해 카드 카피("점성·사주 겹치며") 와 의미 일치.
    const convergenceDays = new Set<number>()
    let monthConvergenceMeaning: string | null = null
    const interp = monthDates[0]?.monthlyInterpretation
    const monthKeyDays = interp?.convergence?.keyDays ?? []
    const bothSysDays = monthKeyDays.filter((d) => d.bothSystems)
    for (const day of bothSysDays) {
      const dayNum = parseInt(day.date.slice(8, 10), 10)
      if (dayNum >= 1 && dayNum <= daysInMonth) convergenceDays.add(dayNum)
    }
    monthConvergenceMeaning = bothSysDays[0]?.meaning ?? null

    // 4. Flow chart 데이터
    const flowData: FlowPoint[] = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      const score = byDay.get(day) ?? null
      let type: FlowPoint['type'] = 'normal'
      if (bestEntry && day === bestEntry[0]) type = 'best'
      else if (worstEntry && day === worstEntry[0]) type = 'caution'
      else if (convergenceDays.has(day)) type = 'convergence'
      return {
        label: `${day}일`,
        score,
        type,
        fullLabel: `${year}년 ${month + 1}월 ${day}일`,
      }
    })

    // 5. Highlights 카드
    const bestCard = bestEntry
      ? {
          value: `${month + 1}월 ${bestEntry[0]}일`,
          description: `${bestEntry[1]}점 — 큰 결정·시작에 우호적`,
        }
      : undefined
    const cautionCard = worstEntry
      ? {
          value: `${month + 1}월 ${worstEntry[0]}일`,
          description: `${worstEntry[1]}점 — 보류·일상 유지`,
        }
      : undefined
    const convergenceList = Array.from(convergenceDays)
      .sort((a, b) => a - b)
      .slice(0, 4)
    const convergenceCard =
      convergenceList.length > 0
        ? {
            value: convergenceList.map((d) => `${d}일`).join(', '),
            // tone-aware — engine 합성 meaning 있으면 그대로 ("기회/시험/전환").
            // 하드코딩 "큰 기회" 는 caution-toned 수렴일에 거짓말.
            description: monthConvergenceMeaning ?? '점성·사주가 같은 시기를 가리키는 큰 흐름',
          }
        : undefined

    // 6. "지금" 가이드 라벨 — 이 달이 현재 달일 때만
    const today = new Date()
    const nowDayLabel =
      today.getFullYear() === year && today.getMonth() === month ? `${today.getDate()}일` : null

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
  }, [year, month, monthDates, monthScore])

  if (!data) return null

  const verdict = monthSummary?.trim() || `이번 달은 ${data.grade.label} 흐름이에요.`

  return (
    <div className="space-y-6">
      <PremiumHero
        periodLabel={monthLabel}
        verdict={verdict}
        score={monthScore}
        grade={data.grade}
        breakdown={data.breakdown}
      />

      {/* 모든 테마 신호 0이면 radar 안 그림 (풀 펜타곤 회귀 방지) */}
      {data.hasAnyTheme ? (
        <ThemeRadar themes={data.themes} caption={data.themeCaption} />
      ) : (
        <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-5 text-center text-sm text-zinc-400">
          이달 테마 신호가 부족해요.
        </div>
      )}

      <FlowChart
        data={data.flowData}
        title="일별 에너지 흐름"
        subtitle="베스트(녹) · 주의(분홍) · 양쪽 수렴(보라)"
        xInterval={4}
        nowLabel={data.nowDayLabel}
        onPointClick={(label) => {
          const day = parseInt(label.replace('일', ''), 10)
          if (day >= 1 && day <= data.daysInMonth) onDayClick(day)
        }}
      />

      <Highlights
        best={data.bestCard}
        caution={data.cautionCard}
        convergence={data.convergenceCard}
        bestLabel="베스트 데이 (추진)"
        cautionLabel="주의 데이 (보류)"
        convergenceLabel="수렴 데이 (전환)"
        onBestClick={data.bestDay ? () => onDayClick(data.bestDay!) : undefined}
        onCautionClick={data.cautionDay ? () => onDayClick(data.cautionDay!) : undefined}
      />
    </div>
  )
}
