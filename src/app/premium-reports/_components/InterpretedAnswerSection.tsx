'use client'

import type { InterpretedAnswerContract } from '@/lib/destiny-matrix/interpretedAnswer'
import ReportSurfaceSection from './ReportSurfaceSection'

const FRAME_LABELS: Record<InterpretedAnswerContract['questionFrame'], string> = {
  relationship_repair: '관계 정렬',
  relationship_commitment: '관계 확정',
  career_decision: '커리어 판단',
  wealth_planning: '재정 판단',
  health_recovery: '회복 판단',
  move_lease: '계약/거주 판단',
  move_relocation: '이동/거점 판단',
  timing_window: '타이밍 판단',
  identity_reflection: '인물 해석',
  open_counseling: '상담 해석',
}

const DOMAIN_LABELS: Record<InterpretedAnswerContract['primaryDomain'], string> = {
  personality: '인물',
  career: '커리어',
  relationship: '관계',
  wealth: '재정',
  health: '건강',
  spirituality: '정신축',
  timing: '타이밍',
  move: '이동',
}

const WINDOW_LABELS: Record<string, string> = {
  now: '지금',
  '1-3m': '1-3개월',
  '3-6m': '3-6개월',
  '6-12m': '6-12개월',
  '12m+': '12개월 이후',
}

function labelWindow(window?: string): string {
  if (!window) return '-'
  return WINDOW_LABELS[window] || window
}

type InterpretedAnswerSectionProps = {
  interpretedAnswer: InterpretedAnswerContract
}

export default function InterpretedAnswerSection({
  interpretedAnswer,
}: InterpretedAnswerSectionProps) {
  return (
    <section className="mx-auto mt-6 max-w-6xl px-4">
      <ReportSurfaceSection
        eyebrow={FRAME_LABELS[interpretedAnswer.questionFrame]}
        title="질문 해석 계약"
      >
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-cyan-300/20 bg-cyan-400/8 px-3 py-1 text-xs font-medium text-cyan-100">
                핵심 분야 · {DOMAIN_LABELS[interpretedAnswer.primaryDomain]}
              </span>
              {interpretedAnswer.timing.bestWindow && (
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs font-medium text-slate-300">
                  강한 창 · {labelWindow(interpretedAnswer.timing.bestWindow)}
                </span>
              )}
            </div>
            <p className="mt-4 text-base font-semibold leading-7 text-white">
              {interpretedAnswer.directAnswer}
            </p>

            {interpretedAnswer.why.length > 0 && (
              <div className="mt-5">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">Why</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                  {interpretedAnswer.why.slice(0, 4).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {interpretedAnswer.timing.now && (
                <div className="rounded-2xl border border-white/10 bg-[#090f1b]/88 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Now</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {interpretedAnswer.timing.now}
                  </p>
                </div>
              )}
              {interpretedAnswer.timing.next && (
                <div className="rounded-2xl border border-white/10 bg-[#090f1b]/88 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Next</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {interpretedAnswer.timing.next}
                  </p>
                </div>
              )}
              {interpretedAnswer.timing.later && (
                <div className="rounded-2xl border border-white/10 bg-[#090f1b]/88 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Later</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {interpretedAnswer.timing.later}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-300/12 bg-emerald-400/[0.05] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">
                Entry Conditions
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {interpretedAnswer.conditions.entry.slice(0, 3).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-amber-300/12 bg-amber-400/[0.05] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-amber-100/70">
                Abort Conditions
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {interpretedAnswer.conditions.abort.slice(0, 3).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-cyan-300/16 bg-cyan-400/[0.05] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">Next Move</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">{interpretedAnswer.nextMove}</p>
            </div>
          </div>
        </div>

        {interpretedAnswer.branches.length > 0 && (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {interpretedAnswer.branches.slice(0, 3).map((branch) => (
              <article
                key={`${branch.label}-${branch.summary}`}
                className="rounded-[22px] border border-white/10 bg-[#090f1b]/88 p-5"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                  {branch.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{branch.summary}</p>
                <p className="mt-4 text-sm font-medium text-white">{branch.nextMove}</p>
              </article>
            ))}
          </div>
        )}

        {interpretedAnswer.uncertainty.length > 0 && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Uncertainty</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-300">
              {interpretedAnswer.uncertainty.slice(0, 3).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        )}
      </ReportSurfaceSection>
    </section>
  )
}
