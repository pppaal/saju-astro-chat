'use client'

/**
 * 사주↔점성 교차 카드 — 사용자 피드백 ("교차가 안 와닿아, 어떤 쪽으로 시그널이
 * 오는지") 반영. 추상 % / 일치도 메트릭 제거. 실제 시그널 출처 + 자연어 근거.
 *
 *  1. 사주 시그널 top N — 이 기간 동안 자주 등장한 사주 신호 (빈도 카운트)
 *  2. 점성 시그널 top N — 자주 등장한 점성 신호
 *  3. 두 시스템 같은 방향 N일 / 다른 방향 M일 단순 카운트 + 합의 분포 막대
 *  4. 대표 일자 자연어 — 가장 강한 합치 / 엇갈림 일의 bridges 자연어 한 줄
 *
 * 데이터: evidence.cross.{sajuDetails, astroDetails, bridges} +
 *        scoreBreakdown.axisAgreement. 없으면 카드 스킵.
 */

import { Compass } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ImportantDate } from '../../types'
import { getCalLabels, type CalLocale } from '../labels'

interface Props {
  dates: ImportantDate[]
  locale?: CalLocale
}

type AgreementKind = 'aligned' | 'mixed' | 'opposed'

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
  let alignedDays = 0
  let mixedDays = 0
  let opposedDays = 0

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
    const ag: AgreementKind = sb.axisAgreement
    if (ag === 'aligned') {
      alignedDays += 1
      const s = d.displayScore ?? d.score
      if (!bestAligned || s > bestAligned.score) {
        bestAligned = { date: d.date, score: s }
      }
    } else if (ag === 'opposed') {
      opposedDays += 1
      const sajuRaw = typeof sb.sajuAxisRaw === 'number' ? sb.sajuAxisRaw : sb.sajuAxis
      const astroRaw = typeof sb.astroAxisRaw === 'number' ? sb.astroAxisRaw : sb.astroAxis
      const gap = Math.abs(sajuRaw - astroRaw)
      if (!biggestOpposed || gap > biggestOpposed.gap) {
        biggestOpposed = { date: d.date, gap }
      }
    } else if (ag === 'mixed') {
      mixedDays += 1
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

  const total = alignedDays + mixedDays + opposedDays
  if (total === 0 && topSaju.length === 0 && topAstro.length === 0) return null

  const alignedPct = total > 0 ? (alignedDays / total) * 100 : 0
  const mixedPct = total > 0 ? (mixedDays / total) * 100 : 0
  const opposedPct = total > 0 ? (opposedDays / total) * 100 : 0

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

      {/* 같은 방향 / 다른 방향 카운트 + 막대 */}
      {total > 0 && (
        <div className="relative space-y-2 mb-4">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-300 font-semibold">{t.crossDirectionLabel}</span>
            <span className="text-zinc-500 text-[10px]">{t.crossDirectionTotal(total)}</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-zinc-800/60">
            {alignedDays > 0 && (
              <motion.div
                className="bg-emerald-400/80"
                initial={{ width: 0 }}
                animate={{ width: `${alignedPct}%` }}
                transition={{ duration: 0.5 }}
              />
            )}
            {mixedDays > 0 && (
              <motion.div
                className="bg-zinc-500/70"
                initial={{ width: 0 }}
                animate={{ width: `${mixedPct}%` }}
                transition={{ duration: 0.5, delay: 0.1 }}
              />
            )}
            {opposedDays > 0 && (
              <motion.div
                className="bg-rose-400/80"
                initial={{ width: 0 }}
                animate={{ width: `${opposedPct}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <CountChip
              color="emerald"
              label={t.crossDirSame}
              hint={t.crossDirSameHint}
              count={alignedDays}
            />
            <CountChip
              color="zinc"
              label={t.crossDirMixed}
              hint={t.crossDirMixedHint}
              count={mixedDays}
            />
            <CountChip
              color="rose"
              label={t.crossDirOpposed}
              hint={t.crossDirOpposedHint}
              count={opposedDays}
            />
          </div>
        </div>
      )}

      {/* 대표 일 자연어 (bridges) */}
      {(alignedSample || opposedSample) && (
        <div className="relative pt-3 border-t border-white/5 space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
            {t.crossInsightEvidenceLabel}
          </p>
          {alignedSample && (
            <EvidenceBlock
              tone="aligned"
              dateLabel={formatDate(alignedSample.date, locale)}
              kindLabel={t.crossDirSame}
              bridge={alignedSample.bridge}
              saju={alignedSample.saju}
              astro={alignedSample.astro}
              sajuLabel={t.dayWhySajuLabel}
              astroLabel={t.dayWhyAstroLabel}
            />
          )}
          {opposedSample && (
            <EvidenceBlock
              tone="opposed"
              dateLabel={formatDate(opposedSample.date, locale)}
              kindLabel={t.crossDirOpposed}
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

function CountChip({
  color,
  label,
  hint,
  count,
}: {
  color: 'emerald' | 'zinc' | 'rose'
  label: string
  hint: string
  count: number
}) {
  const dotClass =
    color === 'emerald' ? 'bg-emerald-400' : color === 'rose' ? 'bg-rose-400' : 'bg-zinc-500'
  const countClass =
    color === 'emerald' ? 'text-emerald-300' : color === 'rose' ? 'text-rose-300' : 'text-zinc-300'
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
        <span className="text-zinc-400">{label}</span>
        <span className={`font-bold tabular-nums ml-auto ${countClass}`}>{count}</span>
      </div>
      <p className="text-[9px] text-zinc-600 leading-snug">{hint}</p>
    </div>
  )
}

function EvidenceBlock({
  tone,
  dateLabel,
  kindLabel,
  bridge,
  saju,
  astro,
  sajuLabel,
  astroLabel,
}: {
  tone: 'aligned' | 'opposed'
  dateLabel: string
  kindLabel: string
  bridge: string | null
  saju: string | null
  astro: string | null
  sajuLabel: string
  astroLabel: string
}) {
  const kindColor = tone === 'aligned' ? 'text-emerald-300' : 'text-rose-300'
  const borderColor = tone === 'aligned' ? 'border-emerald-500/20' : 'border-rose-500/20'
  return (
    <div className={`rounded-lg border ${borderColor} bg-zinc-950/30 p-2.5 space-y-1.5`}>
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-zinc-200 font-bold tabular-nums">{dateLabel}</span>
        <span className={`font-bold uppercase tracking-wider text-[9px] ${kindColor}`}>
          {kindLabel}
        </span>
      </div>
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
