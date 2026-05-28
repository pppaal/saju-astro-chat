'use client'

/**
 * Month tier insights — 엔진 이미 계산한 themeRanking / themeBreakdown /
 * keyEvents / convergence 를 3개 직관 카드로. raw sections jargon 대체.
 *
 *   1. ThemeFocus  — 이번 달 어느 영역? (themeRanking 5개 bar + top 1-2 의 themeBreakdown chip)
 *   2. KeyDates    — 추진 / 강한 구간 / 보류 (keyEvents)
 *   3. BigTurns    — 양쪽 수렴 큰 날 + meaning (convergence.keyDays bothSystems)
 *
 * 각 카드는 엔진 데이터 없으면 자체 렌더 스킵 (UI 노이즈 0).
 */

import { Sparkles, CalendarRange, Compass } from 'lucide-react'
import type { ImportantDate } from '../../types'
import { getCalLabels, type CalLocale } from '../labels'

type Interpretation = NonNullable<ImportantDate['monthlyInterpretation']>
type ThemeKey = 'love' | 'money' | 'career' | 'health' | 'growth'

interface Props {
  interp: Interpretation | undefined
  /** 0-indexed month — 날짜 라벨 변환용 */
  month: number
  locale?: CalLocale
  /** 날짜 클릭 → 일자 뷰 */
  onDayClick?: (day: number) => void
}

export default function MonthInsights({ interp, month, locale, onDayClick }: Props) {
  if (!interp) return null
  return (
    <div className="space-y-4">
      <ThemeFocusCard interp={interp} locale={locale} />
      <KeyDatesCard interp={interp} month={month} locale={locale} onDayClick={onDayClick} />
      <BigTurnsCard interp={interp} locale={locale} onDayClick={onDayClick} />
    </div>
  )
}

// ── 1. ThemeFocus ────────────────────────────────────────────────────
function ThemeFocusCard({ interp, locale }: { interp: Interpretation; locale?: CalLocale }) {
  const t = getCalLabels(locale)
  const ranking = interp.themeRanking ?? []
  if (ranking.length === 0) return null

  const top = ranking[0]
  const topBreakdown = interp.themeBreakdown?.[top.theme] ?? []
  const positiveContribs = topBreakdown.filter((c) => c.dir === 'up').slice(0, 3)
  const negativeContribs = topBreakdown.filter((c) => c.dir === 'down').slice(0, 2)

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl">
      <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2 mb-5">
        <Sparkles className="w-4 h-4 text-amber-400" />
        {t.themeFocusTitle}
      </h3>
      <div className="space-y-2.5">
        {ranking.map((r) => (
          <ThemeBar
            key={r.theme}
            theme={r.theme}
            score={r.score}
            isTop={r.theme === top.theme}
            t={t}
          />
        ))}
      </div>
      {(positiveContribs.length > 0 || negativeContribs.length > 0) && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-[11px] text-zinc-500 mb-2 tracking-wider uppercase">
            {t.themeName(top.theme)} {Math.round(top.score)} ←
          </p>
          <div className="flex flex-wrap gap-1.5">
            {positiveContribs.map((c, i) => (
              <span
                key={`p-${i}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-300 text-[11px]"
              >
                <span className="font-medium">{c.label}</span>
                <span className="font-bold">+{Math.round(c.delta)}</span>
              </span>
            ))}
            {negativeContribs.map((c, i) => (
              <span
                key={`n-${i}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-500/10 text-rose-300 text-[11px]"
              >
                <span className="font-medium">{c.label}</span>
                <span className="font-bold">−{Math.round(Math.abs(c.delta))}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ThemeBar({
  theme,
  score,
  isTop,
  t,
}: {
  theme: ThemeKey
  score: number
  isTop: boolean
  t: ReturnType<typeof getCalLabels>
}) {
  const pct = Math.max(0, Math.min(100, Math.round(score)))
  return (
    <div className="flex items-center gap-3">
      <span
        className={`w-12 text-xs font-semibold shrink-0 ${isTop ? 'text-amber-200' : 'text-zinc-400'}`}
      >
        {t.themeName(theme)}
      </span>
      <div className="flex-1 h-2 rounded-full bg-zinc-800/70 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isTop
              ? 'bg-gradient-to-r from-amber-400 to-amber-500'
              : 'bg-gradient-to-r from-zinc-500 to-zinc-600'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`text-xs font-bold w-8 text-right shrink-0 tabular-nums ${
          isTop ? 'text-amber-200' : 'text-zinc-400'
        }`}
      >
        {pct}
      </span>
    </div>
  )
}

// ── 2. KeyDates ──────────────────────────────────────────────────────
function KeyDatesCard({
  interp,
  month,
  locale,
  onDayClick,
}: {
  interp: Interpretation
  month: number
  locale?: CalLocale
  onDayClick?: (day: number) => void
}) {
  const t = getCalLabels(locale)
  const ke = interp.keyEvents
  if (!ke || (!ke.best && !ke.window && (!ke.avoid || ke.avoid.dates.length === 0))) return null

  const fmtDay = (mmdd: string) => {
    const d = parseInt(mmdd.slice(3, 5), 10)
    if (!Number.isFinite(d)) return mmdd
    return locale === 'en' ? `${month + 1}/${d}` : `${month + 1}월 ${d}일`
  }
  const handleClick = (mmdd: string) => {
    if (!onDayClick) return
    const d = parseInt(mmdd.slice(3, 5), 10)
    if (Number.isFinite(d)) onDayClick(d)
  }

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl">
      <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2 mb-5">
        <CalendarRange className="w-4 h-4 text-amber-400" />
        {t.keyDatesTitle}
      </h3>
      <div className="space-y-3">
        {ke.best && (
          <KeyRow
            label={t.keyDatesBestLabel}
            tone="best"
            primary={fmtDay(ke.best.date)}
            secondary={t.keyDatesScoreSuffix(Math.round(ke.best.score))}
            onClick={onDayClick ? () => handleClick(ke.best!.date) : undefined}
          />
        )}
        {ke.window && (
          <KeyRow
            label={t.keyDatesWindowLabel}
            tone="window"
            primary={t.keyDatesWindowFmt(
              fmtDay(ke.window.start),
              fmtDay(ke.window.end),
              Math.round(ke.window.avg)
            )}
            onClick={onDayClick ? () => handleClick(ke.window!.start) : undefined}
          />
        )}
        {ke.avoid && ke.avoid.dates.length > 0 && (
          <KeyRow
            label={t.keyDatesAvoidLabel}
            tone="avoid"
            primary={ke.avoid.dates.map(fmtDay).join(' · ')}
            onClick={onDayClick ? () => handleClick(ke.avoid!.dates[0]) : undefined}
          />
        )}
      </div>
    </div>
  )
}

function KeyRow({
  label,
  primary,
  secondary,
  tone,
  onClick,
}: {
  label: string
  primary: string
  secondary?: string
  tone: 'best' | 'window' | 'avoid'
  onClick?: () => void
}) {
  const dotClass =
    tone === 'best'
      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.55)]'
      : tone === 'avoid'
        ? 'bg-rose-400'
        : 'bg-violet-400'
  const Wrapper: React.ElementType = onClick ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={`flex items-center gap-3 w-full text-left ${
        onClick ? 'hover:bg-white/[0.03] -mx-2 px-2 py-1.5 rounded-lg transition' : ''
      }`}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
      <span className="text-xs font-semibold text-zinc-400 w-20 shrink-0">{label}</span>
      <span className="text-sm text-zinc-100 font-medium flex-1 min-w-0 truncate">{primary}</span>
      {secondary && (
        <span className="text-xs text-zinc-500 font-bold tabular-nums shrink-0">{secondary}</span>
      )}
    </Wrapper>
  )
}

// ── 3. BigTurns ──────────────────────────────────────────────────────
function BigTurnsCard({
  interp,
  locale,
  onDayClick,
}: {
  interp: Interpretation
  locale?: CalLocale
  onDayClick?: (day: number) => void
}) {
  const t = getCalLabels(locale)
  const days = (interp.convergence?.keyDays ?? [])
    .filter((d) => d.bothSystems && d.meaning)
    .slice(0, 2)
  if (days.length === 0) return null

  const fmtDate = (iso: string) => {
    const m = parseInt(iso.slice(5, 7), 10)
    const d = parseInt(iso.slice(8, 10), 10)
    return locale === 'en' ? `${m}/${d}` : `${m}월 ${d}일`
  }
  const handleClick = (iso: string) => {
    if (!onDayClick) return
    const d = parseInt(iso.slice(8, 10), 10)
    if (Number.isFinite(d)) onDayClick(d)
  }

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl">
      <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2 mb-5">
        <Compass className="w-4 h-4 text-violet-400" />
        {t.bigTurnsTitle}
      </h3>
      <div className="space-y-4">
        {days.map((d) => {
          const Wrapper: React.ElementType = onDayClick ? 'button' : 'div'
          return (
            <Wrapper
              key={d.date}
              onClick={onDayClick ? () => handleClick(d.date) : undefined}
              className={`block w-full text-left ${
                onDayClick ? 'hover:bg-white/[0.03] -mx-2 px-2 py-1.5 rounded-lg transition' : ''
              }`}
            >
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="text-base font-bold text-violet-200">{fmtDate(d.date)}</span>
                {d.meaning && (
                  <span className="text-sm text-zinc-300 leading-snug">— {d.meaning}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {d.astro.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-cyan-500/10 text-cyan-200 text-[11px]">
                    <span className="font-semibold opacity-70">{t.bigTurnsAstroLabel}</span>
                    <span className="font-medium">{d.astro.join(' · ')}</span>
                  </span>
                )}
                {d.saju.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 text-amber-200 text-[11px]">
                    <span className="font-semibold opacity-70">{t.bigTurnsSajuLabel}</span>
                    <span className="font-medium">{d.saju.join(' · ')}</span>
                  </span>
                )}
              </div>
            </Wrapper>
          )
        })}
      </div>
    </div>
  )
}
