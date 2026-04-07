'use client'

import { Clock3, Compass, Layers3 } from 'lucide-react'
import type { AdapterPersonModel } from '@/lib/destiny-matrix/core/adaptersTypes'

type PersonModelOverviewProps = {
  personModel: AdapterPersonModel
  variant?: 'digest' | 'full'
  className?: string
}

const WINDOW_LABELS: Record<string, string> = {
  now: '지금',
  '1-3m': '1-3개월',
  '3-6m': '3-6개월',
  '6-12m': '6-12개월',
  '12m+': '12개월 이후',
}

function labelWindow(window?: string): string {
  if (!window) return '현재'
  return WINDOW_LABELS[window] || window
}

function labelDomain(personModel: AdapterPersonModel, domain?: string): string {
  if (!domain) return '-'
  return personModel.dimensions.find((item) => item.domain === domain)?.label || domain
}

export default function PersonModelOverview({
  personModel,
  variant = 'full',
  className = '',
}: PersonModelOverviewProps) {
  const primaryWindow = personModel.timeProfile.windows[0]
  const primaryBranch = personModel.futureBranches[0]

  if (variant === 'digest') {
    return (
      <div className={`grid gap-3 md:grid-cols-3 ${className}`.trim()}>
        <article className="rounded-2xl border border-emerald-200/25 bg-emerald-950/30 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/75">구조 핵심</p>
          <p className="mt-2 font-semibold text-emerald-50">
            {personModel.structuralCore.overview}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-200/20 bg-emerald-900/40 px-2.5 py-1 text-[11px] text-emerald-100">
              등급 {personModel.structuralCore.gradeLabel}
            </span>
            <span className="rounded-full border border-emerald-200/20 bg-emerald-900/40 px-2.5 py-1 text-[11px] text-emerald-100">
              국면 {personModel.structuralCore.phaseLabel}
            </span>
          </div>
        </article>

        <article className="rounded-2xl border border-emerald-200/25 bg-emerald-950/30 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/75">현재 상태</p>
          <p className="mt-2 font-semibold text-emerald-50">
            {personModel.states[0]?.label || '기본 상태'}
          </p>
          <p className="mt-2 leading-6 text-emerald-100/85">
            {personModel.timeProfile.timingNarrative}
          </p>
          {primaryWindow && (
            <p className="mt-3 text-xs text-emerald-200/85">
              집중 구간 {labelWindow(primaryWindow.window)}
            </p>
          )}
        </article>

        <article className="rounded-2xl border border-emerald-200/25 bg-emerald-950/30 p-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/75">다음 분기</p>
          <p className="mt-2 font-semibold text-emerald-50">
            {primaryBranch?.label || '핵심 분기 추적'}
          </p>
          <p className="mt-2 leading-6 text-emerald-100/85">
            {primaryBranch?.summary || '현재 구조와 타이밍을 바탕으로 다음 열림 조건을 추적합니다.'}
          </p>
        </article>
      </div>
    )
  }

  return (
    <section className={`mx-auto grid max-w-6xl gap-4 px-4 lg:grid-cols-4 ${className}`.trim()}>
      <article className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl lg:col-span-2">
        <div className="flex items-center gap-2 text-cyan-100">
          <Layers3 className="h-4 w-4" />
          <p className="text-sm font-semibold">구조 핵심</p>
        </div>
        <p className="mt-3 text-xl font-semibold text-white">
          {personModel.structuralCore.overview}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
            등급 {personModel.structuralCore.gradeLabel}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
            국면 {personModel.structuralCore.phaseLabel}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
            리스크 축 {labelDomain(personModel, personModel.structuralCore.riskAxisDomain)}
          </span>
        </div>
        {personModel.structuralCore.latentAxes.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {personModel.structuralCore.latentAxes.slice(0, 6).map((axis) => (
              <span
                key={axis}
                className="rounded-full border border-cyan-300/20 bg-cyan-400/8 px-3 py-1 text-xs text-cyan-100"
              >
                {axis}
              </span>
            ))}
          </div>
        )}
      </article>

      <article className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-cyan-100">
          <Clock3 className="h-4 w-4" />
          <p className="text-sm font-semibold">현재 타이밍</p>
        </div>
        <p className="mt-3 text-lg font-semibold text-white">
          {primaryWindow ? labelWindow(primaryWindow.window) : '현재'}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          {personModel.timeProfile.timingNarrative}
        </p>
        {primaryWindow && (
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            <p>도메인 {primaryWindow.label}</p>
            <p>신뢰도 {Math.round(primaryWindow.confidence * 100)}%</p>
            <p className="text-slate-400">{primaryWindow.whyNow}</p>
          </div>
        )}
      </article>

      <article className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-cyan-100">
          <Compass className="h-4 w-4" />
          <p className="text-sm font-semibold">다음 분기</p>
        </div>
        <p className="mt-3 text-lg font-semibold text-white">
          {primaryBranch?.label || '핵심 분기 추적'}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          {primaryBranch?.summary || '현재 구조와 타이밍을 기준으로 다음 열림 구간을 추적합니다.'}
        </p>
        {primaryBranch?.window && (
          <p className="mt-4 text-sm text-slate-400">시기 {labelWindow(primaryBranch.window)}</p>
        )}
      </article>
    </section>
  )
}
