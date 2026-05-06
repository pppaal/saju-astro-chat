'use client'

/**
 * ThemeAnglesSection
 *
 * Renders a theme as 24 short Korean prose paragraphs (8 angles ×
 * Lifetime/Yearly/Monthly), with a tab toggle so the reader can flip
 * the same chart through three time scales without paying again.
 *
 * Inputs come straight from the report payload — normalizedSignals,
 * timing pillars, birthYear — so the component is fully driven by the
 * deterministic engine output and needs no extra API calls.
 */

import { useMemo, useState } from 'react'
import { Clock, Sparkles, AlertTriangle, TrendingUp, Users, Coins, Heart, Target } from 'lucide-react'
import { CAREER_ANGLES, renderTheme, type RenderedAngle } from '@/lib/destiny-matrix/ai-report/themeAngles'
import { buildPeriodActivationContext, type ReportPeriodScope } from '@/lib/destiny-matrix/ai-report/periodSignalContext'
import type { NormalizedSignal } from '@/lib/destiny-matrix/ai-report/signalSynthesizer'
import type { TimingData } from '@/lib/destiny-matrix/ai-report/types'
import type { ActiveTransit } from '@/lib/destiny-matrix/interpreter/types'

const ANGLE_ICONS: Record<string, typeof Sparkles> = {
  essence: Sparkles,
  strength: TrendingUp,
  weakness: AlertTriangle,
  timing: Clock,
  people: Users,
  moneyVsMeaning: Coins,
  recovery: Heart,
  nextAction: Target,
}

const PERIOD_LABELS: Record<ReportPeriodScope, { label: string; sub: string }> = {
  lifetime: { label: '평생', sub: '본명 기반 — 평생 변하지 않는 결' },
  yearly: { label: '올해', sub: '세운 + 대운 — 1년 흐름' },
  monthly: { label: '이번 달', sub: '월운 + 일진 — 30일 정밀' },
}

const POLARITY_BADGE: Record<string, { label: string; color: string }> = {
  strength: { label: '강점', color: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
  caution: { label: '주의', color: 'text-rose-300 bg-rose-500/10 border-rose-500/30' },
  balance: { label: '균형', color: 'text-cyan-200 bg-cyan-500/10 border-cyan-500/30' },
}

interface ThemeAnglesSectionProps {
  /** Engine signal pool from the report payload (signalSynthesis.normalizedSignals). */
  signals: NormalizedSignal[]
  /** Per-pillar timing context (TimingData). */
  timing?: TimingData
  /** Currently flagged transit cycles for the target date. */
  activeTransits?: ActiveTransit[]
  /** Birth year to bound the daeun age window properly. */
  birthYear?: number
  /** Date the report is rendered against (defaults to today). */
  targetDate?: string
  /** Theme key — only 'career' is wired in this MVP; others fall back to career. */
  theme?: 'career' | 'love' | 'wealth' | 'health' | 'family' | 'move'
}

export function ThemeAnglesSection({
  signals,
  timing,
  activeTransits,
  birthYear,
  targetDate,
  theme = 'career',
}: ThemeAnglesSectionProps) {
  const [period, setPeriod] = useState<ReportPeriodScope>('lifetime')
  const date = targetDate || new Date().toISOString().slice(0, 10)

  const angles = useMemo<RenderedAngle[]>(() => {
    if (!signals || signals.length === 0) return []
    const ctx = buildPeriodActivationContext(
      { period, targetDate: date, timingData: timing, activeTransits },
      { birthYear }
    )
    // MVP: Career angles only. Other themes fall back to career until
    // their angle definitions land (Step 3.6).
    void theme
    return renderTheme(CAREER_ANGLES, signals, ctx, period)
  }, [signals, period, date, timing, activeTransits, birthYear, theme])

  if (angles.length === 0) {
    return null
  }

  return (
    <section className="mx-auto mt-6 max-w-6xl px-4">
      <div className="rounded-[28px] border border-cyan-300/15 bg-gradient-to-br from-slate-900/85 to-slate-950/70 p-6 shadow-[0_20px_60px_rgba(8,145,178,0.12)] backdrop-blur-xl">
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-200/80">
              Multi-period reading
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-white">8가지 각도로 다시 읽기</h2>
            <p className="mt-1 text-sm text-slate-400">
              같은 사주를 시기별로 다른 렌즈로 다시 봄. 시점만 바꿔도 본문이 바뀜.
            </p>
          </div>
          <div
            className="inline-flex rounded-full border border-white/10 bg-slate-950/60 p-1"
            role="tablist"
            aria-label="시기 선택"
          >
            {(Object.keys(PERIOD_LABELS) as ReportPeriodScope[]).map((p) => {
              const meta = PERIOD_LABELS[p]
              const selected = period === p
              return (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setPeriod(p)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    selected
                      ? 'bg-white/10 text-white shadow-[0_2px_10px_rgba(99,210,255,0.18)]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {meta.label}
                </button>
              )
            })}
          </div>
        </header>

        <p className="mb-5 text-[13px] text-cyan-100/70">{PERIOD_LABELS[period].sub}</p>

        <div className="grid gap-4 lg:grid-cols-2">
          {angles.map((angle, idx) => {
            const Icon = ANGLE_ICONS[angle.angle] || Sparkles
            return (
              <article
                key={angle.angle}
                className="rounded-[22px] border border-white/10 bg-[#090f1b]/80 p-5 transition-colors hover:border-white/20"
              >
                <div className="flex items-center gap-2.5 text-cyan-200/90">
                  <Icon className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em]">
                    {String(idx + 1).padStart(2, '0')} · {angle.label}
                  </span>
                </div>
                <p
                  className="mt-3 text-[15px] leading-[1.75] text-slate-100"
                  style={{ wordBreak: 'keep-all' }}
                >
                  {angle.prose}
                </p>
                {angle.evidence.length > 0 && (
                  <div className="mt-4 space-y-1.5 border-t border-white/5 pt-3">
                    {angle.evidence.map((ev) => {
                      const badge = ev.polarity ? POLARITY_BADGE[ev.polarity] : null
                      return (
                        <div
                          key={ev.id}
                          className="flex flex-wrap items-center gap-2 text-[12px] text-slate-400"
                        >
                          {badge && (
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${badge.color}`}
                            >
                              {badge.label}
                            </span>
                          )}
                          <span className="font-medium text-slate-300">{ev.keyword}</span>
                          {(ev.sajuBasis || ev.astroBasis) && (
                            <span className="text-slate-500">
                              · {[ev.sajuBasis, ev.astroBasis].filter(Boolean).join(' / ')}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
