'use client'

import type { AdapterPersonModel } from '@/lib/destiny-matrix/core/adaptersTypes'
import ReportSurfaceSection from '@/app/premium-reports/_components/ReportSurfaceSection'

type PersonInterpretationStabilitySectionProps = {
  personModel: AdapterPersonModel
  className?: string
}

const STATUS_LABELS: Record<string, string> = {
  aligned: 'Aligned',
  'saju-leading': 'Saju Leading',
  'astro-leading': 'Astro Leading',
  contested: 'Contested',
  anchored: 'Anchored',
  conditional: 'Conditional',
  'current-best': 'Current Best',
  plausible: 'Plausible',
  'low-fit': 'Low Fit',
}

function labelStatus(value?: string): string {
  if (!value) return '-'
  return STATUS_LABELS[value] || value
}

export default function PersonInterpretationStabilitySection({
  personModel,
  className = '',
}: PersonInterpretationStabilitySectionProps) {
  const birthHypotheses = personModel.birthTimeHypotheses.slice(0, 3)
  const conflicts = personModel.crossConflictMap.slice(0, 3)
  const markers = personModel.pastEventReconstruction.markers.slice(0, 3)

  if (birthHypotheses.length === 0 && conflicts.length === 0 && markers.length === 0) return null

  return (
    <section className={`mx-auto mt-6 max-w-6xl px-4 ${className}`.trim()}>
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_0.9fr]">
        <ReportSurfaceSection
          title="생시 민감도"
          eyebrow="Birth-Time Hypotheses"
          tone="amber"
          className="h-full"
        >
          <div className="space-y-3">
            {birthHypotheses.map((item) => (
              <article
                key={`${item.birthTime}-${item.label}`}
                className="rounded-[22px] border border-white/10 bg-[#090f1b]/88 p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {item.label} · {item.birthTime}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      적합도 {Math.round(item.fitScore * 100)}% · 신뢰도{' '}
                      {Math.round(item.confidence * 100)}%
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-amber-100">
                    {labelStatus(item.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.summary}</p>
                {item.coreDiff && (
                  <div className="mt-4 rounded-2xl border border-cyan-300/12 bg-cyan-400/[0.05] p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                      Core Diff
                    </p>
                    <div className="mt-2 space-y-1 text-sm text-slate-300">
                      {item.coreDiff.directAnswer ? <p>• {item.coreDiff.directAnswer}</p> : null}
                      {item.coreDiff.actionDomain ? (
                        <p>• Action axis: {item.coreDiff.actionDomain}</p>
                      ) : null}
                      {item.coreDiff.riskDomain ? (
                        <p>• Risk axis: {item.coreDiff.riskDomain}</p>
                      ) : null}
                      {item.coreDiff.bestWindow ? (
                        <p>• Best window: {item.coreDiff.bestWindow}</p>
                      ) : null}
                      {item.coreDiff.branchSummary ? (
                        <p>• Branch: {item.coreDiff.branchSummary}</p>
                      ) : null}
                    </div>
                  </div>
                )}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-300/12 bg-emerald-400/[0.05] p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">
                      Support
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-300">
                      {item.supportSignals.slice(0, 3).map((line) => (
                        <li key={line}>• {line}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-amber-300/12 bg-amber-400/[0.05] p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-amber-100/70">Caution</p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-300">
                      {item.cautionSignals.slice(0, 3).map((line) => (
                        <li key={line}>• {line}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </ReportSurfaceSection>

        <ReportSurfaceSection
          title="교차 충돌 지도"
          eyebrow="Cross-Conflict Map"
          tone="amber"
          className="h-full"
        >
          <div className="space-y-3">
            {conflicts.map((item) => (
              <article
                key={`${item.domain}-${item.label}`}
                className="rounded-[22px] border border-white/10 bg-[#090f1b]/88 p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.strongestTimescale || 'window n/a'}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-amber-100">
                    {labelStatus(item.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.summary}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-cyan-300/12 bg-cyan-400/[0.05] p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                      Saju View
                    </p>
                    <p className="mt-2 text-sm text-slate-300">{item.sajuView}</p>
                  </div>
                  <div className="rounded-2xl border border-indigo-300/12 bg-indigo-400/[0.05] p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-indigo-100/70">
                      Astro View
                    </p>
                    <p className="mt-2 text-sm text-slate-300">{item.astroView}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm font-medium text-amber-100">
                  Resolution Move: {item.resolutionMove}
                </p>
              </article>
            ))}
          </div>
        </ReportSurfaceSection>

        <ReportSurfaceSection
          title="과거 복원 단서"
          eyebrow="Past Reconstruction"
          tone="amber"
          className="h-full"
        >
          <p className="text-sm leading-6 text-slate-300">
            {personModel.pastEventReconstruction.summary}
          </p>
          <div className="mt-4 space-y-3">
            {markers.map((item) => (
              <article
                key={`${item.key}-${item.ageWindow}`}
                className="rounded-[22px] border border-white/10 bg-[#090f1b]/88 p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{item.label}</p>
                    <p className="mt-1 text-xs text-slate-400">{item.ageWindow}</p>
                  </div>
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-amber-100">
                    {labelStatus(item.status)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{item.summary}</p>
                {item.evidence.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-slate-400">
                    {item.evidence.slice(0, 3).map((line) => (
                      <li key={line}>• {line}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </ReportSurfaceSection>
      </div>
    </section>
  )
}
