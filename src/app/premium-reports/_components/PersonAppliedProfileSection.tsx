'use client'

import type { AdapterPersonModel } from '@/lib/destiny-matrix/core/adaptersTypes'
import ReportSurfaceSection from '@/app/premium-reports/_components/ReportSurfaceSection'

type PersonAppliedProfileSectionProps = {
  personModel: AdapterPersonModel
  className?: string
}

type AppliedCard = {
  key: string
  title: string
  summary: string
  primary: string[]
  secondary: string[]
  tertiary?: string[]
}

function buildCards(personModel: AdapterPersonModel): AppliedCard[] {
  const profile = personModel.appliedProfile

  return [
    {
      key: 'food',
      title: '음식과 소화 리듬',
      summary: profile.foodProfile.summary,
      primary: profile.foodProfile.helpfulFoods,
      secondary: profile.foodProfile.cautionFoods,
      tertiary: profile.foodProfile.rhythmGuidance,
    },
    {
      key: 'life-rhythm',
      title: '생활 리듬',
      summary: profile.lifeRhythmProfile.summary,
      primary: profile.lifeRhythmProfile.peakWindows,
      secondary: profile.lifeRhythmProfile.recoveryWindows,
      tertiary: profile.lifeRhythmProfile.regulationMoves,
    },
    {
      key: 'relationship-style',
      title: '관계 스타일',
      summary: profile.relationshipStyleProfile.summary,
      primary: profile.relationshipStyleProfile.attractionPatterns,
      secondary: profile.relationshipStyleProfile.ruptureTriggers,
      tertiary: profile.relationshipStyleProfile.repairMoves,
    },
    {
      key: 'work-style',
      title: '일 스타일',
      summary: profile.workStyleProfile.summary,
      primary: profile.workStyleProfile.bestRoles,
      secondary: profile.workStyleProfile.bestConditions,
      tertiary: profile.workStyleProfile.leverageMoves,
    },
    {
      key: 'money-style',
      title: '돈 흐름 스타일',
      summary: profile.moneyStyleProfile.summary,
      primary: profile.moneyStyleProfile.earningPattern,
      secondary: profile.moneyStyleProfile.leakageRisks,
      tertiary: profile.moneyStyleProfile.controlRules,
    },
    {
      key: 'environment',
      title: '환경과 회복',
      summary: profile.environmentProfile.summary,
      primary: profile.environmentProfile.preferredSettings,
      secondary: profile.environmentProfile.drainSignals,
      tertiary: profile.environmentProfile.resetActions,
    },
  ]
}

export default function PersonAppliedProfileSection({
  personModel,
  className = '',
}: PersonAppliedProfileSectionProps) {
  const cards = buildCards(personModel)
  const uncertainty = personModel.uncertaintyEnvelope

  return (
    <section className={`mx-auto mt-6 max-w-6xl px-4 ${className}`.trim()}>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <ReportSurfaceSection title="생활 적용 프로필" eyebrow="Applied Profile" tone="cyan">
          <div className="grid gap-4 xl:grid-cols-2">
            {cards.map((card) => (
              <article
                key={card.key}
                className="rounded-[22px] border border-white/10 bg-[#090f1b]/88 p-5"
              >
                <p className="text-base font-semibold text-white">{card.title}</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">{card.summary}</p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-300/12 bg-emerald-400/[0.05] p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">
                      Core Fit
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-300">
                      {card.primary.slice(0, 3).map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-amber-300/12 bg-amber-400/[0.05] p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-amber-100/70">
                      Watchouts
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-300">
                      {card.secondary.slice(0, 3).map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {card.tertiary && card.tertiary.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                      Next Calibration
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-300">
                      {card.tertiary.slice(0, 3).map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>
        </ReportSurfaceSection>

        <ReportSurfaceSection title="해석 불확실성" eyebrow="Uncertainty Envelope" tone="amber">
          <p className="text-sm leading-6 text-slate-300">{uncertainty.summary}</p>

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-100/70">
                Reliable Areas
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {uncertainty.reliableAreas.slice(0, 4).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-amber-100/70">
                Conditional Areas
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {uncertainty.conditionalAreas.slice(0, 4).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-rose-100/70">
                Unresolved Areas
              </p>
              <ul className="mt-2 space-y-1 text-sm text-slate-400">
                {uncertainty.unresolvedAreas.slice(0, 4).map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </ReportSurfaceSection>
      </div>
    </section>
  )
}
