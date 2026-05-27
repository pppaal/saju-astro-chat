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
import PremiumHero from './shared/PremiumHero'
import ThemeRadar, { type ThemeScore } from './shared/ThemeRadar'
import FlowChart, { type FlowPoint } from './shared/FlowChart'
import Highlights from './shared/Highlights'
import LifeTimeline, { type TimelineEntry } from './shared/LifeTimeline'
import { computeLifeTimeline } from './shared/lifeTimeline'

const THEME_KOREAN: Record<string, string> = {
  growth: '성장',
  career: '직업',
  money: '재물',
  love: '연애',
  health: '건강',
}

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
  /** 사용자 출생일 — life timeline 계산용 */
  birthDate?: string | null
  /** engine 현재 대운 라벨 */
  currentPhaseLabel?: string | null
  /** 달 클릭 → 그 달 monthly 뷰로 (0-indexed) */
  onMonthClick: (monthIdx: number) => void
}

export default function YearDashboard({
  year,
  allDates,
  yearlyMonthly,
  birthDate,
  currentPhaseLabel,
  onMonthClick,
}: Props) {
  const [showTrad, setShowTrad] = useState(false)

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

  // 2. verdict — best/worst 달로 자동 생성
  const sorted = [...yearlyMonthly].sort((a, b) => b.score - a.score)
  const bestM = sorted[0]
  const worstM = sorted[sorted.length - 1]
  const verdict =
    bestM && worstM && bestM.month !== worstM.month
      ? `${bestM.month}월 무렵 흐름이 가장 좋고, ${worstM.month}월은 숨 고르기 좋은 시기예요.`
      : '한 해 흐름이 비교적 고른 편이에요.'

  // 3. Theme radar — 12개월 테마 평균
  const themes: ThemeScore[] = THEME_ORDER.map((key) => {
    const sum = yearlyMonthly.reduce((acc, m) => {
      const t = m.themes.find((x) => x.theme === key)
      return acc + (t?.score ?? 50)
    }, 0)
    return { name: THEME_KOREAN[key], score: Math.round(sum / yearlyMonthly.length) }
  })

  // 4. Flow chart — 12개월 + reference dot 타입.
  // best = 점수 1위, caution = 점수 12위, convergence = engine 수렴 신호
  // (allDates 의 keyEvents 안에 convergence 가 있는 달).
  const convergenceMonths = new Set<number>()
  for (const d of allDates) {
    const ke = d.monthlyInterpretation?.keyEvents
    if (ke?.window) {
      // window 시작 월을 수렴 월로 표시 (시작점이 흐름 전환점)
      const m = parseInt(ke.window.start.split('-')[0], 10)
      if (m >= 1 && m <= 12) convergenceMonths.add(m)
    }
  }

  const flowData: FlowPoint[] = yearlyMonthly.map((m) => {
    let type: FlowPoint['type'] = 'normal'
    if (bestM && m.month === bestM.month) type = 'best'
    else if (worstM && m.month === worstM.month) type = 'caution'
    else if (convergenceMonths.has(m.month)) type = 'convergence'
    return {
      label: `${m.month}월`,
      score: m.score,
      type,
      fullLabel: `${year}년 ${m.month}월`,
    }
  })

  // 5. Highlights 3 카드
  const bestCard = bestM
    ? {
        value: `${bestM.month}월`,
        description: `평균 ${bestM.score}점 — 큰 결정·시작에 우호적`,
      }
    : undefined
  const cautionCard = worstM
    ? {
        value: `${worstM.month}월`,
        description: `평균 ${worstM.score}점 — 숨 고르기·정리에 좋음`,
      }
    : undefined
  const convergenceLabel =
    convergenceMonths.size > 0
      ? Array.from(convergenceMonths)
          .sort((a, b) => a - b)
          .slice(0, 4)
          .map((m) => `${m}월`)
          .join(', ')
      : null
  const convergenceCard = convergenceLabel
    ? {
        value: convergenceLabel,
        description: '점성·사주가 겹치며 큰 기회가 열리는 시기',
      }
    : undefined

  // 6. Life timeline — engine 의 lifetimePivots(점성 라이프사이클 + 사주 대운 병합)
  // 가 있으면 우선 사용. 엔진은 ±2년 안에 점성·사주가 겹치면 bothSystems 로 묶고
  // current/past/upcoming phase 까지 결정. 없을 때만 birthDate 기반 폴백.
  let timelineEntries: TimelineEntry[]
  if (engineLifetimePivots && engineLifetimePivots.length > 0) {
    timelineEntries = engineLifetimePivots
      .filter((p) => p.phase !== 'past') // 과거는 timeline 에서 숨김 (현재+미래만)
      .slice(0, 6)
      .map((p) => ({
        ageLabel: `${p.age}세`,
        year: p.year,
        title: p.label,
        description:
          p.meaning ??
          (p.bothSystems
            ? '점성·사주 양쪽이 같은 시기를 가리키는 큰 전환'
            : p.astro
              ? '점성 라이프사이클 분기점'
              : '대운 전환 — 10년 흐름의 시작'),
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
        periodLabel={`${year} 한 해`}
        verdict={verdict}
        score={yearScore}
        grade={yearGrade}
      />

      <ThemeRadar themes={themes} />

      <FlowChart
        data={flowData}
        title="월별 에너지 흐름"
        subtitle="베스트(녹) · 주의(분홍) · 양쪽 수렴(보라)"
        xInterval={0}
        onPointClick={(label) => {
          const m = parseInt(label.replace('월', ''), 10)
          if (m >= 1 && m <= 12) onMonthClick(m - 1)
        }}
      />

      <Highlights
        best={bestCard}
        caution={cautionCard}
        convergence={convergenceCard}
        bestLabel="베스트 달 (추진)"
        cautionLabel="주의 달 (보류)"
        convergenceLabel="수렴 달 (전환)"
        onBestClick={bestM ? () => onMonthClick(bestM.month - 1) : undefined}
        onCautionClick={worstM ? () => onMonthClick(worstM.month - 1) : undefined}
      />

      {timelineEntries.length > 0 && <LifeTimeline entries={timelineEntries} />}

      {seunText && (
        <div className="bg-zinc-900/40 rounded-2xl border border-white/10">
          <button
            onClick={() => setShowTrad((v) => !v)}
            className="w-full flex items-center gap-2 px-5 py-3 text-zinc-300 text-sm font-semibold"
          >
            <Sparkles className="w-4 h-4 text-amber-300/80" />
            전통 사주 한 해 흐름
            <span className="text-[11px] text-zinc-500 font-normal ml-2">
              위 분석과 다를 수 있어요
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
