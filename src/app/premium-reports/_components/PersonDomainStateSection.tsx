'use client'

import type { AdapterPersonModel } from '@/lib/destiny-matrix/core/adaptersTypes'
import ReportSurfaceSection from '@/app/premium-reports/_components/ReportSurfaceSection'

type PersonDomainStateSectionProps = {
  personModel: AdapterPersonModel
  className?: string
}

const STATUS_LABELS: Record<string, string> = {
  expansion: '확장',
  stable: '안정',
  mixed: '혼합',
  defensive: '방어',
  blocked: '보류',
  open: '열림',
}

const STATUS_CLASSES: Record<string, string> = {
  expansion: 'border-emerald-300/30 bg-emerald-500/10 text-emerald-100',
  stable: 'border-cyan-300/30 bg-cyan-500/10 text-cyan-100',
  mixed: 'border-amber-300/30 bg-amber-500/10 text-amber-100',
  defensive: 'border-orange-300/30 bg-orange-500/10 text-orange-100',
  blocked: 'border-rose-300/30 bg-rose-500/10 text-rose-100',
  open: 'border-emerald-300/30 bg-emerald-500/10 text-emerald-100',
}

const WINDOW_LABELS: Record<string, string> = {
  now: '지금',
  '1-3m': '1-3개월',
  '3-6m': '3-6개월',
  '6-12m': '6-12개월',
}

function labelWindow(value?: string): string {
  if (!value) return '-'
  return WINDOW_LABELS[value] || value
}

export default function PersonDomainStateSection({
  personModel,
  className = '',
}: PersonDomainStateSectionProps) {
  const leadStates = personModel.domainStateGraph.slice(0, 4)
  const eventOutlook = personModel.eventOutlook.slice(0, 5)

  if (leadStates.length === 0 && eventOutlook.length === 0) return null

  return (
    <section className={`mx-auto mt-6 max-w-6xl px-4 ${className}`.trim()}>
      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        {leadStates.length > 0 && (
          <ReportSurfaceSection title="도메인 상태 그래프" eyebrow="Domain State Graph" tone="cyan">
            <div className="grid gap-4 xl:grid-cols-2">
              {leadStates.map((state) => (
                <article
                  key={state.domain}
                  className="rounded-[22px] border border-white/10 bg-[#090f1b]/88 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-white">{state.label}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        현재 창 {labelWindow(state.currentWindow)} · 다음 변화{' '}
                        {labelWindow(state.nextShift)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] ${
                        STATUS_CLASSES[state.currentState] || STATUS_CLASSES.mixed
                      }`}
                    >
                      {STATUS_LABELS[state.currentState] || state.currentState}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-300">{state.thesis}</p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-300/12 bg-emerald-400/[0.05] p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">
                        Support Signals
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-slate-300">
                        {state.supportSignals.slice(0, 3).map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-amber-300/12 bg-amber-400/[0.05] p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-amber-100/70">
                        Pressure Signals
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-slate-300">
                        {state.pressureSignals.slice(0, 3).map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                        First Move
                      </p>
                      <p className="mt-2 text-sm text-slate-300">{state.firstMove}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-rose-100/70">
                        Hold Move
                      </p>
                      <p className="mt-2 text-sm text-slate-400">{state.holdMove}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {state.timescales.slice(0, 4).map((timescale) => (
                      <div
                        key={`${state.domain}-${timescale.timescale}`}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-white">
                            {labelWindow(timescale.timescale)}
                          </p>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] ${
                              STATUS_CLASSES[timescale.status] || STATUS_CLASSES.mixed
                            }`}
                          >
                            {STATUS_LABELS[timescale.status] || timescale.status}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-400">{timescale.thesis}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </ReportSurfaceSection>
        )}

        {eventOutlook.length > 0 && (
          <ReportSurfaceSection title="사건 전망" eyebrow="Event Outlook" tone="cyan">
            <div className="space-y-3">
              {eventOutlook.map((event) => (
                <article
                  key={event.key}
                  className="rounded-[22px] border border-white/10 bg-[#090f1b]/88 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{event.label}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        준비도 {Math.round(event.readiness * 100)}% · 창{' '}
                        {labelWindow(event.bestWindow)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[11px] ${
                        STATUS_CLASSES[event.status] || STATUS_CLASSES.mixed
                      }`}
                    >
                      {STATUS_LABELS[event.status] || event.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{event.summary}</p>
                  {event.entryConditions.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">
                        Entry Conditions
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-slate-300">
                        {event.entryConditions.slice(0, 3).map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {event.abortConditions.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-amber-100/70">
                        Abort Conditions
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-slate-400">
                        {event.abortConditions.slice(0, 3).map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="mt-4 text-sm font-medium text-cyan-100">
                    다음 행동: {event.nextMove}
                  </p>
                </article>
              ))}
            </div>
          </ReportSurfaceSection>
        )}
      </div>
    </section>
  )
}
