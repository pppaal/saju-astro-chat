'use client'

/**
 * 사주 ↔ 점성 — 두 흐름의 만남.
 *
 * 정적 "메시지 두 줄" 카드에서 흐름 톤 카드로 재디자인:
 *   1. FlowSummary (한 줄) — 두 흐름이 함께 차오르는 / 엇갈리는 구간
 *   2. CrossLineChart — 사주 amber + 점성 cyan dual line + 교차 지점 마커
 *   3. CrossingSpot (aligned) — emerald + ✨ + bridges 풀텍스트
 *   4. CrossingSpot (opposed) — rose + ⚠️ + bridges
 *   5. MessageBlock saju / astro — 기존 자연어 빈도 1위 (유지)
 *
 * convergenceDays (bothSystems 일자) 가 prop 으로 들어오면 차트 마커 + Spot
 * 후보로 활용. 들어오지 않으면 차트는 axisAgreement 만으로 그림.
 */

import { Compass } from 'lucide-react'
import type { ImportantDate } from '../../types'
import { getCalLabels, type CalLocale } from '../labels'
import CrossLineChart, { type CrossLinePoint } from './CrossLineChart'

interface Props {
  dates: ImportantDate[]
  locale?: CalLocale
  /** monthlyInterpretation.convergence.keyDays 의 bothSystems 일자 */
  convergenceDays?: Array<{ date: string; bothSystems: boolean }>
  /**
   * BigTurnsCard / YearBigDaysCard 가 같은 화면에서 정렬 수렴일을 이미
   * 보여줄 때 true. 그 경우 aligned CrossingSpot 만 숨겨 중복을 없앤다.
   * (opposed 스팟·차트·메시지는 유지)
   */
  suppressAlignedSpot?: boolean
}

interface SignalRank {
  text: string
  count: number
}

interface AggDay {
  date: string
  saju: number | null
  astro: number | null
  agreement: 'aligned' | 'mixed' | 'opposed' | null
  bothSystems: boolean
  bridges: string[]
  sajuDetails: string[]
  astroDetails: string[]
}

interface SpotPick {
  date: string
  bridges: string[]
  sajuDetails: string[]
  astroDetails: string[]
}

interface WindowPick {
  start: string
  end: string
  peak: string
  kind: 'aligned' | 'opposed'
}

export default function CrossInsightCard({
  dates,
  locale,
  convergenceDays,
  suppressAlignedSpot,
}: Props) {
  const t = getCalLabels(locale)

  // ── 일자별 집계 ──────────────────────────────────────────────────
  const bothSystemsSet = new Set<string>(
    (convergenceDays ?? []).filter((d) => d.bothSystems).map((d) => d.date)
  )
  const sortedDates = [...dates].sort((a, b) => a.date.localeCompare(b.date))
  const agg: AggDay[] = sortedDates.map((d) => {
    const sb = d.scoreBreakdown
    const saju = sb
      ? Math.round(typeof sb.sajuAxisRaw === 'number' ? sb.sajuAxisRaw : sb.sajuAxis)
      : null
    const astro = sb
      ? Math.round(typeof sb.astroAxisRaw === 'number' ? sb.astroAxisRaw : sb.astroAxis)
      : null
    return {
      date: d.date,
      saju,
      astro,
      agreement: sb?.axisAgreement ?? null,
      bothSystems: bothSystemsSet.has(d.date),
      bridges: d.evidence?.cross?.bridges ?? [],
      sajuDetails: d.evidence?.cross?.sajuDetails ?? [],
      astroDetails: d.evidence?.cross?.astroDetails ?? [],
    }
  })

  // ── 자연어 풀 빈도 집계 (기존 유지) ──────────────────────────────
  const sajuCounts = new Map<string, number>()
  const astroCounts = new Map<string, number>()
  for (const d of agg) {
    if (d.sajuDetails[0]) {
      const text = d.sajuDetails[0].trim()
      if (text) sajuCounts.set(text, (sajuCounts.get(text) ?? 0) + 1)
    }
    if (d.astroDetails[0]) {
      const text = d.astroDetails[0].trim()
      if (text) astroCounts.set(text, (astroCounts.get(text) ?? 0) + 1)
    }
  }
  const topSaju: SignalRank | null = pickTop(sajuCounts)
  const topAstro: SignalRank | null = pickTop(astroCounts)

  // ── FlowSummary 윈도우 — aligned/opposed 연속 묶음 ──────────────
  const flowAligned = pickWindow(agg, 'aligned')
  const flowOpposed = pickWindow(agg, 'opposed')

  // ── CrossingSpot — bridges 풀텍스트 보유 day 우선 ───────────────
  // suppressAlignedSpot 일 때 aligned 스팟은 숨긴다 (BigTurns/YearBigDays 중복 제거).
  const bestSpot = suppressAlignedSpot ? null : pickSpot(agg, 'aligned')
  const worstSpot = pickSpot(agg, 'opposed')

  // 아무것도 보여줄 게 없으면 카드 자체 렌더 X
  if (
    !topSaju &&
    !topAstro &&
    !flowAligned &&
    !flowOpposed &&
    !bestSpot &&
    !worstSpot &&
    agg.length === 0
  ) {
    return null
  }

  // ── 차트 데이터 빌드 ─────────────────────────────────────────────
  const chartData: CrossLinePoint[] = agg.map((d) => {
    const day = parseInt(d.date.slice(8, 10), 10)
    return {
      label: locale === 'en' ? `${day}` : `${day}일`,
      fullLabel: formatDate(d.date, locale),
      saju: d.saju,
      astro: d.astro,
      agreement: d.agreement,
      bothSystems: d.bothSystems,
    }
  })

  // ── FlowSummary 한 줄 텍스트 결정 ────────────────────────────────
  // aligned 윈도우 우선, 없으면 opposed, 없으면 단일 peak
  const flowSummary = (() => {
    if (flowAligned) {
      if (flowAligned.start === flowAligned.end) {
        return { tone: 'aligned' as const, text: t.crossFlowSummaryPeak(flowAligned.peak) }
      }
      return {
        tone: 'aligned' as const,
        text: t.crossFlowSummaryAligned(flowAligned.start, flowAligned.end),
      }
    }
    if (flowOpposed) {
      if (flowOpposed.start === flowOpposed.end) {
        return { tone: 'opposed' as const, text: t.crossFlowSummaryPeak(flowOpposed.peak) }
      }
      return {
        tone: 'opposed' as const,
        text: t.crossFlowSummaryOpposed(flowOpposed.start, flowOpposed.end),
      }
    }
    return null
  })()

  return (
    <div className="relative bg-gradient-to-br from-zinc-900/55 via-zinc-900/40 to-emerald-950/15 backdrop-blur-sm border border-emerald-500/15 rounded-2xl p-6 overflow-hidden">
      <div className="pointer-events-none absolute -top-12 -right-10 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full" />
      <h3 className="relative text-base font-semibold text-emerald-200 flex items-center gap-2 mb-3">
        <Compass className="w-4 h-4 text-emerald-400" />
        {t.crossInsightTitle}
      </h3>

      {/* Hero: FlowSummary 한 줄 */}
      {flowSummary && (
        <p
          className={`relative text-sm leading-relaxed mb-4 ${
            flowSummary.tone === 'aligned' ? 'text-emerald-100/90' : 'text-rose-100/90'
          }`}
        >
          {flowSummary.text}
        </p>
      )}

      {/* CrossLineChart — dual line + 교차 마커 */}
      {chartData.length > 0 && (
        <div className="relative mb-4">
          <div className="flex items-center gap-3 mb-2 text-[10px] uppercase tracking-widest font-bold">
            <span className="inline-flex items-center gap-1.5 text-amber-300">
              <span className="w-2 h-0.5 bg-amber-400 rounded-full" />
              {t.dayWhySajuLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 text-cyan-300">
              <span className="w-2 h-0.5 bg-cyan-400 rounded-full" />
              {t.dayWhyAstroLabel}
            </span>
          </div>
          <CrossLineChart
            data={chartData}
            xInterval={Math.max(0, Math.floor(chartData.length / 8))}
            locale={locale}
          />
        </div>
      )}

      {/* CrossingSpot — aligned (emerald, ✨) */}
      {bestSpot && (
        <CrossingSpot
          tone="aligned"
          header={t.crossSpotAlignedHeader}
          dateLabel={formatDate(bestSpot.date, locale)}
          bridges={bestSpot.bridges}
          sajuDetails={bestSpot.sajuDetails}
          astroDetails={bestSpot.astroDetails}
          sajuLabel={t.dayWhySajuLabel}
          astroLabel={t.dayWhyAstroLabel}
        />
      )}

      {/* CrossingSpot — opposed (rose, ⚠️) */}
      {worstSpot && (
        <div className={bestSpot ? 'mt-3' : ''}>
          <CrossingSpot
            tone="opposed"
            header={t.crossSpotOpposedHeader}
            dateLabel={formatDate(worstSpot.date, locale)}
            bridges={worstSpot.bridges}
            sajuDetails={worstSpot.sajuDetails}
            astroDetails={worstSpot.astroDetails}
            sajuLabel={t.dayWhySajuLabel}
            astroLabel={t.dayWhyAstroLabel}
          />
        </div>
      )}

      {/* 사주 메시지 풀 텍스트 (유지) */}
      {topSaju && (
        <div className={bestSpot || worstSpot ? 'mt-4' : ''}>
          <MessageBlock
            tone="saju"
            title={t.crossSignalSajuTitle}
            text={topSaju.text}
            frequency={t.crossSignalFrequency(topSaju.count)}
          />
        </div>
      )}

      {/* 점성 메시지 풀 텍스트 (유지) */}
      {topAstro && (
        <div className="mt-3">
          <MessageBlock
            tone="astro"
            title={t.crossSignalAstroTitle}
            text={topAstro.text}
            frequency={t.crossSignalFrequency(topAstro.count)}
          />
        </div>
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────

function pickTop(counts: Map<string, number>): SignalRank | null {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  if (sorted.length === 0) return null
  return { text: sorted[0][0], count: sorted[0][1] }
}

/**
 * agg 에서 같은 agreement 가 연속 ≥3 일 묶음 중 가장 긴 윈도우.
 * 없으면 가장 강한 단일 일 (그 agreement 인 day 중 score 최고/최저).
 * aligned 의 경우 bothSystems 가 있는 day 의 윈도우를 우선 (있을 때만).
 */
function pickWindow(agg: AggDay[], kind: 'aligned' | 'opposed'): WindowPick | null {
  const filtered = agg.filter((d) => d.agreement === kind)
  if (filtered.length === 0) return null

  // 연속 묶음 찾기 (date 인덱스 기반 — agg 이미 정렬됨)
  let bestRun: AggDay[] = []
  let curRun: AggDay[] = []
  for (let i = 0; i < agg.length; i++) {
    const d = agg[i]
    if (d.agreement === kind) {
      curRun.push(d)
      if (curRun.length > bestRun.length) bestRun = [...curRun]
    } else {
      curRun = []
    }
  }

  if (bestRun.length >= 3) {
    // 가장 강한 day (saju+astro 합) 를 peak 으로
    const peak = [...bestRun].sort((a, b) => totalScore(b) - totalScore(a))[0]
    return {
      start: formatDateShort(bestRun[0].date),
      end: formatDateShort(bestRun[bestRun.length - 1].date),
      peak: formatDateShort(peak.date),
      kind,
    }
  }

  // 단일 day fallback — 가장 강한 day
  const single = [...filtered].sort((a, b) => totalScore(b) - totalScore(a))[0]
  return {
    start: formatDateShort(single.date),
    end: formatDateShort(single.date),
    peak: formatDateShort(single.date),
    kind,
  }
}

/** bridges 가 있는 day 우선, 없으면 score 기준 picks */
function pickSpot(agg: AggDay[], kind: 'aligned' | 'opposed'): SpotPick | null {
  const filtered = agg.filter((d) => d.agreement === kind)
  if (filtered.length === 0) return null

  // aligned 일 땐 bothSystems 인 day 우선
  let candidates = filtered
  if (kind === 'aligned') {
    const both = filtered.filter((d) => d.bothSystems)
    if (both.length > 0) candidates = both
  }

  // bridges 보유 day 우선
  const withBridges = candidates.filter((d) => d.bridges.length > 0)
  const pool = withBridges.length > 0 ? withBridges : candidates

  const sorted =
    kind === 'aligned'
      ? [...pool].sort((a, b) => totalScore(b) - totalScore(a))
      : [...pool].sort((a, b) => totalScore(a) - totalScore(b))

  const top = sorted[0]
  if (!top) return null
  return {
    date: top.date,
    bridges: top.bridges,
    sajuDetails: top.sajuDetails,
    astroDetails: top.astroDetails,
  }
}

function totalScore(d: AggDay): number {
  return (d.saju ?? 50) + (d.astro ?? 50)
}

function formatDateShort(iso: string): string {
  const m = iso.match(/^\d{4}-(\d{2})-(\d{2})$/)
  if (!m) return iso
  return `${Number(m[1])}/${Number(m[2])}`
}

function formatDate(iso: string, locale?: CalLocale): string {
  const m = iso.match(/^\d{4}-(\d{2})-(\d{2})$/)
  if (!m) return iso
  const month = Number(m[1])
  const day = Number(m[2])
  if (locale === 'en') {
    const monthsEn = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]
    return `${monthsEn[month - 1]} ${day}`
  }
  return `${month}/${day}`
}

// ── Sub-components ─────────────────────────────────────────────────

function CrossingSpot({
  tone,
  header,
  dateLabel,
  bridges,
  sajuDetails,
  astroDetails,
  sajuLabel,
  astroLabel,
}: {
  tone: 'aligned' | 'opposed'
  header: string
  dateLabel: string
  bridges: string[]
  sajuDetails: string[]
  astroDetails: string[]
  sajuLabel: string
  astroLabel: string
}) {
  const borderClass = tone === 'aligned' ? 'border-emerald-500/30' : 'border-rose-500/30'
  const bgClass = tone === 'aligned' ? 'bg-emerald-950/20' : 'bg-rose-950/20'
  const headerClass = tone === 'aligned' ? 'text-emerald-300' : 'text-rose-300'
  const icon = tone === 'aligned' ? '✨' : '⚠️'
  const bridge = bridges[0]
  return (
    <div className={`rounded-lg border ${borderClass} ${bgClass} p-3`}>
      <div className="flex items-center gap-2 mb-2">
        <span aria-hidden className="text-sm leading-none">
          {icon}
        </span>
        <p className={`text-[10px] uppercase tracking-widest font-bold ${headerClass}`}>{header}</p>
        <span className="ml-auto text-[11px] text-zinc-200 font-bold tabular-nums">
          {dateLabel}
        </span>
      </div>
      {bridge ? (
        <p className="text-[12px] text-zinc-200 leading-relaxed">{bridge}</p>
      ) : (
        <p className="text-[11px] text-zinc-300 leading-snug">
          {sajuDetails[0] && (
            <>
              <span className="text-amber-300/80 font-semibold">{sajuLabel}</span>{' '}
              <span>{sajuDetails[0]}</span>
            </>
          )}
          {sajuDetails[0] && astroDetails[0] && <span className="text-zinc-600"> · </span>}
          {astroDetails[0] && (
            <>
              <span className="text-cyan-300/80 font-semibold">{astroLabel}</span>{' '}
              <span>{astroDetails[0]}</span>
            </>
          )}
        </p>
      )}
    </div>
  )
}

function MessageBlock({
  tone,
  title,
  text,
  frequency,
}: {
  tone: 'saju' | 'astro'
  title: string
  text: string
  frequency: string
}) {
  const titleClass = tone === 'saju' ? 'text-amber-300' : 'text-cyan-300'
  const borderClass = tone === 'saju' ? 'border-amber-500/25' : 'border-cyan-500/25'
  const bgClass = tone === 'saju' ? 'bg-amber-950/15' : 'bg-cyan-950/15'
  return (
    <div className={`rounded-lg border ${borderClass} ${bgClass} p-3`}>
      <p className={`text-[10px] uppercase tracking-widest font-bold mb-1.5 ${titleClass}`}>
        {title}
      </p>
      <p className="text-[12px] text-zinc-200 leading-relaxed">{text}</p>
      <p className="text-[10px] text-zinc-500 mt-1.5">{frequency}</p>
    </div>
  )
}
