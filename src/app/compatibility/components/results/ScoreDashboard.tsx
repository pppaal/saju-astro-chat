'use client'

/**
 * Friendly score dashboard. Default view shows 3 grouped scores users can
 * read at a glance; "더 자세히" expands the full 11-row breakdown.
 *
 * Terminology kept plain Korean throughout — "Venus-Mars" → "끌림의 별",
 * "Mercury" → "대화의 별", etc. Each label has an InfoTooltip so curious
 * users can see the technical meaning.
 */

import { memo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { getScoreContext } from '@/lib/compatibility/scoreContext'
import { InfoTooltip } from '@/components/ui/InfoTooltip'

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

const ACCENT_TO_CSS: Record<string, { text: string; bg: string; border: string; bar: string }> = {
  emerald: {
    text: 'text-emerald-200',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-300/30',
    bar: '#34d399',
  },
  cyan: {
    text: 'text-cyan-200',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-300/30',
    bar: '#22d3ee',
  },
  slate: {
    text: 'text-slate-300',
    bg: 'bg-white/[0.04]',
    border: 'border-white/15',
    bar: 'rgba(148,163,184,0.5)',
  },
  amber: {
    text: 'text-amber-200',
    bg: 'bg-amber-400/10',
    border: 'border-amber-300/30',
    bar: '#fbbf24',
  },
}

function avg(...vals: Array<number | null | undefined>): number | null {
  const ns = vals.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (ns.length === 0) return null
  return Math.round(ns.reduce((a, b) => a + b, 0) / ns.length)
}

interface RowProps {
  label: string
  hint?: string
  tooltip?: string
  score: number | null
  kind: Parameters<typeof getScoreContext>[1]
}

function ScoreRow({ label, hint, tooltip, score, kind }: RowProps) {
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
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="text-[13.5px] font-medium text-slate-200">{label}</span>
          {hint && <span className="text-[11px] text-slate-500">{hint}</span>}
          {tooltip && <InfoTooltip text={tooltip} size="xs" />}
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
            style={{ width: `${safe}%`, background: accent.bar }}
          />
          <div
            className="absolute top-1/2 h-3 w-px -translate-y-1/2 bg-white/30"
            style={{ left: '65%' }}
            title="평균 65점"
          />
        </div>
        <span className="w-[64px] flex-shrink-0 text-right text-[10.5px] text-slate-500">
          {ctx.vsAverage}
        </span>
      </div>
    </div>
  )
}

interface BigGroupCardProps {
  label: string
  tooltip: string
  score: number | null
  kind: Parameters<typeof getScoreContext>[1]
  description: string
}

function BigGroupCard({ label, tooltip, score, kind, description }: BigGroupCardProps) {
  const ctx = getScoreContext(score, kind)
  const accent = ctx ? ACCENT_TO_CSS[ctx.accent] : ACCENT_TO_CSS.slate
  const safe = score != null ? Math.max(0, Math.min(100, score)) : 0

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
      <div className="flex items-center gap-1.5">
        <span className="text-[12.5px] font-medium text-slate-300">{label}</span>
        <InfoTooltip text={tooltip} size="xs" align="left" />
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className="text-[2rem] font-semibold leading-none tabular-nums"
          style={{ color: accent.bar }}
        >
          {score != null ? Math.round(safe) : '—'}
        </span>
        {ctx && (
          <span
            className={`rounded-full border ${accent.border} ${accent.bg} px-2 py-0.5 text-[10.5px] font-medium ${accent.text}`}
          >
            {ctx.rankLabel}
          </span>
        )}
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${safe}%`, background: accent.bar }}
        />
      </div>
      <p className="mt-1 text-[11.5px] leading-relaxed text-slate-500">{description}</p>
    </div>
  )
}

export const ScoreDashboard = memo(function ScoreDashboard(props: ScoreDashboardProps) {
  const [expanded, setExpanded] = useState(false)

  // Three friendly grouped scores
  const heartScore = avg(props.sunMoon, props.venusMars) // 감정·끌림
  const characterScore = avg(props.dayMaster, props.intellectual, props.spiritual) // 본성·소통
  const futureScore = avg(props.marriage, props.longevity) // 장기 안정

  return (
    <section className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,28,0.94),rgba(7,11,19,0.86))] p-6 backdrop-blur-2xl sm:p-7">
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
        궁합 한눈에
      </h2>

      {/* Three big groups — most users only need this */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <BigGroupCard
          label="감정·끌림"
          tooltip="두 분 사이의 케미와 감정이 얼마나 잘 통하는지 — 점성술의 태양·달·금성·화성 결을 합산."
          score={heartScore}
          kind="overall"
          description="첫인상부터 일상까지 마음이 흐르는 결"
        />
        <BigGroupCard
          label="본성·소통"
          tooltip="두 분의 타고난 성격(사주 일간)과 대화·세계관이 잘 맞는지를 평가."
          score={characterScore}
          kind="overall"
          description="시간이 만드는 신뢰와 대화의 결"
        />
        <BigGroupCard
          label="장기 안정"
          tooltip="결혼·동거 같은 장기 약속을 맺을 준비가 됐는지, 관계가 오래 지속될 가능성이 얼마나 되는지."
          score={futureScore}
          kind="overall"
          description="결혼·약속·시간이 지나도 단단해질 가능성"
        />
      </div>

      {/* Expand toggle */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-slate-300 transition hover:border-cyan-300/35 hover:text-white"
      >
        {expanded ? (
          <>
            간단히 보기 <ChevronUp className="h-3.5 w-3.5" />
          </>
        ) : (
          <>
            상세 점수 11개 더 보기 <ChevronDown className="h-3.5 w-3.5" />
          </>
        )}
      </button>

      {expanded && (
        <>
          <div className="my-4 h-px bg-white/[0.06]" />

          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            동양 vs 서양
          </p>
          <div className="grid gap-1 sm:grid-cols-2 sm:gap-x-6">
            <ScoreRow
              label="사주"
              tooltip="동양 사주명리학으로 본 두 분의 본성 결 — 일간·오행·십성 상호작용."
              score={props.saju}
              kind="saju"
            />
            <ScoreRow
              label="점성"
              tooltip="서양 점성술 차트로 본 시너스트리 — Sun·Moon·Venus·Mars 등 행성 결."
              score={props.astro}
              kind="astro"
            />
          </div>

          <div className="my-4 h-px bg-white/[0.06]" />

          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            5 차원 디테일
          </p>
          <div className="grid gap-1 sm:grid-cols-2 sm:gap-x-6">
            <ScoreRow
              label="본성"
              hint="(사주 일간)"
              tooltip="태어난 날 천간(일간) 결의 상호작용 — 본성이 얼마나 자연스럽게 맞는지."
              score={props.dayMaster ?? null}
              kind="dayMaster"
            />
            <ScoreRow
              label="마음"
              hint="(태양·달)"
              tooltip="의식(태양)과 감정(달)이 같은 결로 흐르는지."
              score={props.sunMoon ?? null}
              kind="sunMoon"
            />
            <ScoreRow
              label="끌림"
              hint="(금성·화성)"
              tooltip="로맨틱·신체적 케미스트리 — 금성(끌림)과 화성(추진)의 만남."
              score={props.venusMars ?? null}
              kind="venusMars"
            />
            <ScoreRow
              label="대화"
              hint="(수성)"
              tooltip="소통 스타일과 사고방식이 잘 맞는지 — 수성 결."
              score={props.intellectual ?? null}
              kind="intellectual"
            />
            <ScoreRow
              label="유대"
              hint="(영적)"
              tooltip="가치관·세계관·삶의 의미 등 깊은 정렬."
              score={props.spiritual ?? null}
              kind="spiritual"
            />
          </div>

          <div className="my-4 h-px bg-white/[0.06]" />

          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            장기 전망
          </p>
          <div className="grid gap-1 sm:grid-cols-2 sm:gap-x-6">
            <ScoreRow
              label="결혼·약속 준비도"
              tooltip="장기 약속(결혼·동거)의 토대가 얼마나 단단한지."
              score={props.marriage}
              kind="marriage"
            />
            <ScoreRow
              label="관계 지속력"
              tooltip="시간이 지나도 관계가 깊어지고 안정될 가능성."
              score={props.longevity}
              kind="longevity"
            />
          </div>

          <p className="mt-5 text-[11px] leading-relaxed text-slate-500">
            막대의 흰 선은 일반 커플 평균 (65점). 백분위는 비슷한 사주·점성 분포 가정 하에 산출됩니다.
          </p>
        </>
      )}
    </section>
  )
})
