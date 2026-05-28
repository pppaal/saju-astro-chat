'use client'

/**
 * 사주 ↔ 점성 — 이번 기간 두 시스템이 보낸 메시지를 자연어 풀로 노출.
 *
 * 추상 메트릭 (% 일치도, 결론 등) 다 제거. DB 의 자연어 자원을 정직하게:
 *  1. 사주가 자주 보낸 메시지 (top 1) — evidence.cross.sajuDetails 빈도 1위
 *  2. 점성이 자주 보낸 메시지 (top 1) — evidence.cross.astroDetails 빈도 1위
 *  3. 대표 일 자연어 — 가장 강한 일 / 가장 낮은 일의 bridges
 *
 * 신호명 jargon ('정인 합' 같은) 없이 일상어 풀 텍스트만.
 */

import { Compass } from 'lucide-react'
import type { ImportantDate } from '../../types'
import { getCalLabels, type CalLocale } from '../labels'

interface Props {
  dates: ImportantDate[]
  locale?: CalLocale
}

interface SignalRank {
  text: string
  count: number
}

interface SampleDay {
  date: string
  bridge: string | null
  saju: string | null
  astro: string | null
}

export default function CrossInsightCard({ dates, locale }: Props) {
  const t = getCalLabels(locale)

  // 풀 텍스트 빈도 집계 — 같은 자연어 한 줄을 일자별로 카운트.
  const sajuCounts = new Map<string, number>()
  const astroCounts = new Map<string, number>()

  // 가장 점수 높은 일 / 가장 낮은 일 — bridges 자연어 노출용.
  let bestDay: { date: string; score: number } | null = null
  let worstDay: { date: string; score: number } | null = null

  for (const d of dates) {
    const sajuList = d.evidence?.cross?.sajuDetails ?? []
    const astroList = d.evidence?.cross?.astroDetails ?? []
    // 첫 번째만 카운트 — compactText 가 한 줄 자연어로 압축한 것.
    if (sajuList[0]) {
      const text = sajuList[0].trim()
      if (text) sajuCounts.set(text, (sajuCounts.get(text) ?? 0) + 1)
    }
    if (astroList[0]) {
      const text = astroList[0].trim()
      if (text) astroCounts.set(text, (astroCounts.get(text) ?? 0) + 1)
    }

    const s = d.displayScore ?? d.score
    if (typeof s === 'number') {
      if (!bestDay || s > bestDay.score) bestDay = { date: d.date, score: s }
      if (!worstDay || s < worstDay.score) worstDay = { date: d.date, score: s }
    }
  }

  const topSaju: SignalRank | null = (() => {
    const sorted = [...sajuCounts.entries()].sort((a, b) => b[1] - a[1])
    if (sorted.length === 0) return null
    return { text: sorted[0][0], count: sorted[0][1] }
  })()
  const topAstro: SignalRank | null = (() => {
    const sorted = [...astroCounts.entries()].sort((a, b) => b[1] - a[1])
    if (sorted.length === 0) return null
    return { text: sorted[0][0], count: sorted[0][1] }
  })()

  if (!topSaju && !topAstro && !bestDay && !worstDay) return null

  const extractSample = (target: { date: string } | null): SampleDay | null => {
    if (!target) return null
    const d = dates.find((x) => x.date === target.date)
    if (!d) return null
    return {
      date: d.date,
      bridge: d.evidence?.cross?.bridges?.[0] ?? null,
      saju: d.evidence?.cross?.sajuDetails?.[0] ?? null,
      astro: d.evidence?.cross?.astroDetails?.[0] ?? null,
    }
  }
  const bestSample = extractSample(bestDay)
  // worstSample 은 bestSample 과 다른 날일 때만
  const worstSample = worstDay && worstDay.date !== bestDay?.date ? extractSample(worstDay) : null

  return (
    <div className="relative bg-gradient-to-br from-zinc-900/55 via-zinc-900/40 to-emerald-950/15 backdrop-blur-sm border border-emerald-500/15 rounded-2xl p-6 overflow-hidden">
      <div className="pointer-events-none absolute -top-12 -right-10 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full" />
      <h3 className="relative text-base font-semibold text-emerald-200 flex items-center gap-2 mb-4">
        <Compass className="w-4 h-4 text-emerald-400" />
        {t.crossInsightTitle}
      </h3>

      {/* 사주 메시지 풀 텍스트 */}
      {topSaju && (
        <MessageBlock
          tone="saju"
          title={t.crossSignalSajuTitle}
          text={topSaju.text}
          frequency={t.crossSignalFrequency(topSaju.count)}
        />
      )}

      {/* 점성 메시지 풀 텍스트 */}
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

      {/* 대표 일 — 가장 높은 점수 / 가장 낮은 점수 일의 bridges */}
      {(bestSample || worstSample) && (
        <div className="relative mt-4 pt-3 border-t border-white/5 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
            {t.crossInsightEvidenceLabel}
          </p>
          {bestSample && (
            <EvidenceBlock
              dateLabel={formatDate(bestSample.date, locale)}
              bridge={bestSample.bridge}
              saju={bestSample.saju}
              astro={bestSample.astro}
              sajuLabel={t.dayWhySajuLabel}
              astroLabel={t.dayWhyAstroLabel}
            />
          )}
          {worstSample && (
            <EvidenceBlock
              dateLabel={formatDate(worstSample.date, locale)}
              bridge={worstSample.bridge}
              saju={worstSample.saju}
              astro={worstSample.astro}
              sajuLabel={t.dayWhySajuLabel}
              astroLabel={t.dayWhyAstroLabel}
            />
          )}
        </div>
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

function EvidenceBlock({
  dateLabel,
  bridge,
  saju,
  astro,
  sajuLabel,
  astroLabel,
}: {
  dateLabel: string
  bridge: string | null
  saju: string | null
  astro: string | null
  sajuLabel: string
  astroLabel: string
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-zinc-950/30 p-2.5 space-y-1.5">
      <span className="block text-[11px] text-zinc-200 font-bold tabular-nums">{dateLabel}</span>
      {bridge ? (
        <p className="text-[11px] text-zinc-300 leading-relaxed">{bridge}</p>
      ) : (
        <p className="text-[11px] text-zinc-400 leading-snug">
          {saju && (
            <>
              <span className="text-amber-300/80 font-semibold">{sajuLabel}</span>{' '}
              <span className="text-zinc-300">{saju}</span>
            </>
          )}
          {saju && astro && <span className="text-zinc-600"> · </span>}
          {astro && (
            <>
              <span className="text-cyan-300/80 font-semibold">{astroLabel}</span>{' '}
              <span className="text-zinc-300">{astro}</span>
            </>
          )}
        </p>
      )}
    </div>
  )
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
