'use client'

import type {
  AdapterPersonModel,
  AdapterSingleSubjectView,
} from '@/lib/destiny-matrix/core/adaptersTypes'
import ReportSurfaceSection from '@/app/premium-reports/_components/ReportSurfaceSection'

type SingleSubjectViewSectionProps = {
  view: AdapterSingleSubjectView
  personModel?: AdapterPersonModel
  className?: string
}

const WINDOW_LABELS: Record<string, string> = {
  now: '지금',
  '1-3m': '1-3개월',
  '3-6m': '3-6개월',
  '6-12m': '6-12개월',
}

const STATUS_LABELS: Record<'open' | 'mixed' | 'blocked', string> = {
  open: '열림',
  mixed: '혼합',
  blocked: '보류',
}

const STATUS_CLASSES: Record<'open' | 'mixed' | 'blocked', string> = {
  open: 'border-emerald-300/30 bg-emerald-500/10 text-emerald-100',
  mixed: 'border-amber-300/30 bg-amber-500/10 text-amber-100',
  blocked: 'border-rose-300/30 bg-rose-500/10 text-rose-100',
}

function labelDomain(personModel: AdapterPersonModel | undefined, domain: string): string {
  return personModel?.dimensions.find((item) => item.domain === domain)?.label || domain
}

function labelWindow(window?: string): string {
  if (!window) return '-'
  return WINDOW_LABELS[window] || window
}

export default function SingleSubjectViewSection({
  view,
  personModel,
  className = '',
}: SingleSubjectViewSectionProps) {
  return (
    <section className={`mx-auto mt-6 max-w-6xl px-4 ${className}`.trim()}>
      <ReportSurfaceSection title="단일 해석 뷰" eyebrow="Single Subject View" tone="cyan">
        <div className="rounded-[24px] border border-cyan-300/18 bg-[linear-gradient(135deg,rgba(10,41,61,0.9),rgba(8,12,22,0.92))] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100/75">
            Direct Answer
          </p>
          <p className="mt-3 text-lg font-semibold leading-8 text-white">{view.directAnswer}</p>
          {view.nextMove && (
            <p className="mt-3 text-sm leading-6 text-cyan-50/85">다음 행동: {view.nextMove}</p>
          )}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <article className="rounded-[22px] border border-white/10 bg-[#090f1b]/88 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Structure Axis</p>
            <p className="mt-2 text-base font-semibold text-white">{view.structureAxis.label}</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">{view.structureAxis.thesis}</p>
            {view.structureAxis.topAxes.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {view.structureAxis.topAxes.slice(0, 4).map((axis) => (
                  <span
                    key={axis}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-200"
                  >
                    {axis}
                  </span>
                ))}
              </div>
            )}
          </article>

          <article className="rounded-[22px] border border-white/10 bg-[#090f1b]/88 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Action Axis</p>
            <p className="mt-2 text-base font-semibold text-white">{view.actionAxis.label}</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">{view.actionAxis.whyThisFirst}</p>
            <p className="mt-4 text-sm font-medium text-cyan-100">
              지금 먼저: {view.actionAxis.nowAction}
            </p>
          </article>

          <article className="rounded-[22px] border border-white/10 bg-[#090f1b]/88 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Risk Axis</p>
            <p className="mt-2 text-base font-semibold text-white">{view.riskAxis.label}</p>
            <p className="mt-3 text-sm leading-6 text-slate-300">{view.riskAxis.warning}</p>
            {view.riskAxis.hardStops.length > 0 && (
              <ul className="mt-4 space-y-1 text-sm text-rose-100/88">
                {view.riskAxis.hardStops.slice(0, 3).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            )}
          </article>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[22px] border border-white/10 bg-[#090f1b]/88 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Timing State</p>
                <p className="mt-2 text-base font-semibold text-white">
                  가장 중요한 창: {labelWindow(view.timingState.bestWindow)}
                </p>
              </div>
              {typeof view.timingState.confidence === 'number' && (
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
                  신뢰도 {Math.round(view.timingState.confidence * 100)}%
                </span>
              )}
            </div>
            {view.timingState.whyNow && (
              <p className="mt-3 text-sm leading-6 text-slate-300">{view.timingState.whyNow}</p>
            )}
            {view.timingState.whyNotYet && (
              <p className="mt-3 text-sm leading-6 text-amber-100/88">
                {view.timingState.whyNotYet}
              </p>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {view.timingState.windows.map((window) => (
                <div
                  key={window.timescale}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">
                      {labelWindow(window.timescale)}
                    </p>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] ${STATUS_CLASSES[window.status]}`}
                    >
                      {STATUS_LABELS[window.status]}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{window.summary}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[22px] border border-white/10 bg-[#090f1b]/88 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
              Competing Pressures
            </p>
            <div className="mt-4 space-y-3">
              {view.competingPressures.slice(0, 4).map((pressure) => (
                <div
                  key={pressure.domain}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-white">
                      {labelDomain(personModel, pressure.domain)}
                    </p>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] ${STATUS_CLASSES[pressure.status]}`}
                    >
                      {STATUS_LABELS[pressure.status]}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{pressure.summary}</p>
                  {pressure.nextWindow && (
                    <p className="mt-2 text-xs text-slate-400">
                      다음 창: {labelWindow(pressure.nextWindow)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </article>
        </div>

        {view.branches.length > 0 && (
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {view.branches.slice(0, 3).map((branch, index) => (
              <article
                key={`${branch.label}-${index}`}
                className="rounded-[22px] border border-white/10 bg-[#090f1b]/88 p-5"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                  Branch {index + 1}
                </p>
                <p className="mt-2 text-base font-semibold text-white">{branch.label}</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">{branch.summary}</p>
                {branch.entryConditions.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">
                      Entry Conditions
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-300">
                      {branch.entryConditions.slice(0, 2).map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {branch.abortConditions.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-rose-100/70">
                      Abort Conditions
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-400">
                      {branch.abortConditions.slice(0, 2).map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="mt-4 text-sm font-medium text-cyan-100">
                  다음 행동: {branch.nextMove}
                </p>
              </article>
            ))}
          </div>
        )}
      </ReportSurfaceSection>
    </section>
  )
}
