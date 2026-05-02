'use client'

/**
 * Apple-tier score dashboard — combines all 11+ compatibility scores
 * (overall + saju + astro + fusion + cross + 5 차원 + marriage + longevity)
 * into a single readable card with comparison context vs typical couples.
 */

import { memo } from 'react'
import { getScoreContext } from '@/lib/compatibility/scoreContext'

interface ScoreDashboardProps {
  overall: number | null
  saju: number | null
  astro: number | null
  fusion: number | null
  cross: number | null
  marriage: number | null
  longevity: number | null
  dayMaster?: number | null
  sunMoon?: number | null
  venusMars?: number | null
  intellectual?: number | null
  spiritual?: number | null
}

const ACCENT_TO_CSS: Record<string, { text: string; bg: string; border: string }> = {
  emerald: {
    text: 'text-emerald-200',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-300/30',
  },
  cyan: { text: 'text-cyan-200', bg: 'bg-cyan-400/10', border: 'border-cyan-300/30' },
  slate: { text: 'text-slate-300', bg: 'bg-white/[0.04]', border: 'border-white/15' },
  amber: { text: 'text-amber-200', bg: 'bg-amber-400/10', border: 'border-amber-300/30' },
}

interface RowProps {
  label: string
  score: number | null
  kind: Parameters<typeof getScoreContext>[1]
  hint?: string
}

function ScoreRow({ label, score, kind, hint }: RowProps) {
  const ctx = getScoreContext(score, kind)
  if (!ctx || score == null) {
    return (
      <div className="flex items-center justify-between gap-3 py-2">
        <span className="text-[13px] text-slate-500">{label}</span>
        <span className="text-[12px] text-slate-600">측정 불가</span>
      </div>
    )
  }
  const accent = ACCENT_TO_CSS[ctx.accent] || ACCENT_TO_CSS.slate
  const safe = Math.max(0, Math.min(100, score))
  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-[13.5px] font-medium text-slate-200">{label}</span>
          {hint && <span className="ml-1.5 text-[11px] text-slate-500">{hint}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold tabular-nums text-white">
            {Math.round(safe)}
          </span>
          <span
            className={`rounded-full border ${accent.border} ${accent.bg} px-2 py-0.5 text-[10.5px] font-medium ${accent.text}`}
          >
            {ctx.rankLabel}
          </span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${safe}%`,
              background:
                ctx.accent === 'emerald'
                  ? '#34d399'
                  : ctx.accent === 'cyan'
                    ? '#22d3ee'
                    : ctx.accent === 'amber'
                      ? '#fbbf24'
                      : 'rgba(148,163,184,0.5)',
            }}
          />
          {/* avg marker */}
          <div
            className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-white/30"
            style={{ left: '65%' }}
            title="평균"
          />
        </div>
        <span className="w-[64px] flex-shrink-0 text-right text-[10.5px] text-slate-500">
          {ctx.vsAverage}
        </span>
      </div>
    </div>
  )
}

export const ScoreDashboard = memo(function ScoreDashboard(props: ScoreDashboardProps) {
  const overallCtx = getScoreContext(props.overall, 'overall')

  return (
    <section className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,28,0.94),rgba(7,11,19,0.86))] p-6 backdrop-blur-2xl sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
          종합 점수 보드
        </h2>
        {overallCtx && (
          <span className="text-[11px] text-slate-400">
            평균 65점 기준 · {overallCtx.percentile}백분위
          </span>
        )}
      </div>

      {/* Top group — 4 main scores */}
      <div className="mt-4 grid gap-1 sm:grid-cols-2 sm:gap-x-6">
        <ScoreRow label="사주 본성" score={props.saju} kind="saju" />
        <ScoreRow label="점성 별" score={props.astro} kind="astro" />
        <ScoreRow label="융합" score={props.fusion} kind="fusion" hint="(saju+astro)" />
        <ScoreRow label="교차" score={props.cross} kind="cross" hint="(같은 방향?)" />
      </div>

      {/* Divider */}
      <div className="my-4 h-px bg-white/[0.06]" />

      {/* 5 dimensions */}
      <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        5 차원 분석
      </p>
      <div className="grid gap-1 sm:grid-cols-2 sm:gap-x-6">
        <ScoreRow label="성격 (일간)" score={props.dayMaster ?? null} kind="dayMaster" />
        <ScoreRow label="감정 (Sun-Moon)" score={props.sunMoon ?? null} kind="sunMoon" />
        <ScoreRow label="친밀 (Venus-Mars)" score={props.venusMars ?? null} kind="venusMars" />
        <ScoreRow label="소통 (Mercury)" score={props.intellectual ?? null} kind="intellectual" />
        <ScoreRow label="유대 (영적)" score={props.spiritual ?? null} kind="spiritual" />
      </div>

      {/* Divider */}
      <div className="my-4 h-px bg-white/[0.06]" />

      {/* Marriage + Longevity */}
      <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        장기 전망
      </p>
      <div className="grid gap-1 sm:grid-cols-2 sm:gap-x-6">
        <ScoreRow label="결혼·약속 준비도" score={props.marriage} kind="marriage" />
        <ScoreRow label="관계 지속력" score={props.longevity} kind="longevity" />
      </div>

      <p className="mt-5 text-[11px] leading-relaxed text-slate-500">
        막대의 흰 선은 일반 커플 평균 (65점). 백분위는 비슷한 사주·점성 분포 가정 하에 산출됩니다.
      </p>
    </section>
  )
})
