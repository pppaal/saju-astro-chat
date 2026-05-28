'use client'

/**
 * 사주 ↔ 점성 시그널 카드 — 추상 메트릭 (% / "결론" / "일치도") 다 제거.
 * 정직한 두 가지만:
 *  1. 사주가 보낸 신호 top 3 / 점성이 보낸 신호 top 3 (빈도 일 수)
 *  2. 대표 일 자연어 (엔진 bridges) — 두 시스템 함께 작용한 날 사주 + 점성 톤
 *
 * 비교는 사용자가 두 박스 + 자연어 읽고 직접 판단. 메타 메트릭 없음.
 */

import { Compass } from 'lucide-react'
import type { ImportantDate } from '../../types'
import { getCalLabels, type CalLocale } from '../labels'

interface Props {
  dates: ImportantDate[]
  locale?: CalLocale
}

interface SignalCount {
  label: string
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

  // 시그널 빈도 집계 — 같은 텍스트 카운트.
  const sajuCounts = new Map<string, number>()
  const astroCounts = new Map<string, number>()

  // 가장 강한 합치 일 + 가장 큰 엇갈림 일 — bridges 자연어 노출용.
  let bestAligned: { date: string; score: number } | null = null
  let biggestOpposed: { date: string; gap: number } | null = null

  for (const d of dates) {
    const sajuList = d.evidence?.cross?.sajuDetails ?? []
    const astroList = d.evidence?.cross?.astroDetails ?? []
    for (const s of sajuList) {
      const label = s.trim()
      if (!label) continue
      sajuCounts.set(label, (sajuCounts.get(label) ?? 0) + 1)
    }
    for (const a of astroList) {
      const label = a.trim()
      if (!label) continue
      astroCounts.set(label, (astroCounts.get(label) ?? 0) + 1)
    }

    const sb = d.scoreBreakdown
    if (!sb) continue
    if (sb.axisAgreement === 'aligned') {
      const s = d.displayScore ?? d.score
      if (!bestAligned || s > bestAligned.score) {
        bestAligned = { date: d.date, score: s }
      }
    } else if (sb.axisAgreement === 'opposed') {
      const sajuRaw = typeof sb.sajuAxisRaw === 'number' ? sb.sajuAxisRaw : sb.sajuAxis
      const astroRaw = typeof sb.astroAxisRaw === 'number' ? sb.astroAxisRaw : sb.astroAxis
      const gap = Math.abs(sajuRaw - astroRaw)
      if (!biggestOpposed || gap > biggestOpposed.gap) {
        biggestOpposed = { date: d.date, gap }
      }
    }
  }

  const topSaju: SignalCount[] = [...sajuCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
  const topAstro: SignalCount[] = [...astroCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  if (topSaju.length === 0 && topAstro.length === 0) return null

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
  const alignedSample = extractSample(bestAligned)
  const opposedSample = extractSample(biggestOpposed)

  return (
    <div className="relative bg-gradient-to-br from-zinc-900/55 via-zinc-900/40 to-emerald-950/15 backdrop-blur-sm border border-emerald-500/15 rounded-2xl p-6 overflow-hidden">
      <div className="pointer-events-none absolute -top-12 -right-10 w-32 h-32 bg-emerald-500/8 blur-3xl rounded-full" />
      <h3 className="relative text-base font-semibold text-emerald-200 flex items-center gap-2 mb-1 group">
        <Compass className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition" />
        {t.crossInsightTitle}
      </h3>
      <p className="relative text-[11px] text-zinc-500 mb-4 leading-snug">
        {t.crossInsightSubtitle}
      </p>

      {/* 시그널 출처 — 사주 / 점성 각각 top 3 */}
      {(topSaju.length > 0 || topAstro.length > 0) && (
        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {topSaju.length > 0 && (
            <SignalBlock
              tone="saju"
              title={t.crossSignalSajuTitle}
              items={topSaju}
              unitLabel={t.crossSignalDaysUnit}
            />
          )}
          {topAstro.length > 0 && (
            <SignalBlock
              tone="astro"
              title={t.crossSignalAstroTitle}
              items={topAstro}
              unitLabel={t.crossSignalDaysUnit}
            />
          )}
        </div>
      )}

      {/* 대표 일 자연어 (bridges) — '결론' 같은 추상 라벨 없이 날짜 + bridges 만 */}
      {(alignedSample || opposedSample) && (
        <div className="relative pt-3 border-t border-white/5 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
            {t.crossInsightEvidenceLabel}
          </p>
          {alignedSample && (
            <EvidenceBlock
              dateLabel={formatDate(alignedSample.date, locale)}
              bridge={alignedSample.bridge}
              saju={alignedSample.saju}
              astro={alignedSample.astro}
              sajuLabel={t.dayWhySajuLabel}
              astroLabel={t.dayWhyAstroLabel}
            />
          )}
          {opposedSample && (
            <EvidenceBlock
              dateLabel={formatDate(opposedSample.date, locale)}
              bridge={opposedSample.bridge}
              saju={opposedSample.saju}
              astro={opposedSample.astro}
              sajuLabel={t.dayWhySajuLabel}
              astroLabel={t.dayWhyAstroLabel}
            />
          )}
        </div>
      )}
    </div>
  )
}

function SignalBlock({
  tone,
  title,
  items,
  unitLabel,
}: {
  tone: 'saju' | 'astro'
  title: string
  items: SignalCount[]
  unitLabel: (n: number) => string
}) {
  const titleClass = tone === 'saju' ? 'text-amber-300' : 'text-cyan-300'
  const borderClass = tone === 'saju' ? 'border-amber-500/20' : 'border-cyan-500/20'
  const bgClass = tone === 'saju' ? 'bg-amber-950/10' : 'bg-cyan-950/10'
  return (
    <div className={`rounded-lg border ${borderClass} ${bgClass} p-3`}>
      <p className={`text-[10px] uppercase tracking-widest font-bold mb-2 ${titleClass}`}>
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((it) => (
          <li
            key={it.label}
            className="flex items-baseline gap-2 text-[11px] text-zinc-200 leading-snug"
          >
            <span className="flex-1 min-w-0 truncate">{it.label}</span>
            <span className="text-zinc-400 tabular-nums text-[10px] shrink-0">
              {unitLabel(it.count)}
            </span>
          </li>
        ))}
      </ul>
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
      <span className="text-[11px] text-zinc-200 font-bold tabular-nums">{dateLabel}</span>
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
