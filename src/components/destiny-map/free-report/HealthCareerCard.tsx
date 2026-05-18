'use client'

import { HeartPulse } from 'lucide-react'

interface OrganHealthLike {
  organ?: string
  status?: string
  description?: string
  risks?: string[]
  prevention?: string[]
}
interface HealthLike {
  overallScore?: number
  constitution?: string
  organHealth?: OrganHealthLike[]
  preventionAdvice?: string[]
  lifestyleRecommendations?: string[]
}
interface CareerFieldLike {
  category?: string
  jobs?: string[]
  fitScore?: number
  description?: string
}
interface WorkStyleLike {
  type?: string
  description?: string
  strengths?: string[]
}
interface CareerLike {
  primaryFields?: CareerFieldLike[]
  workStyle?: WorkStyleLike
  entrepreneurialScore?: number
  leadershipScore?: number
  creativityScore?: number
  careerAdvice?: string[]
}
interface HealthCareerLike {
  health?: HealthLike
  career?: CareerLike
  synergy?: string[]
  warnings?: string[]
}

interface Props {
  data?: HealthCareerLike | null
  isKo: boolean
}

const STATUS_TONE: Record<string, string> = {
  strong: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
  normal: 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10',
  weak: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  vulnerable: 'text-rose-300 border-rose-400/30 bg-rose-500/10',
}

export default function HealthCareerCard({ data, isKo }: Props) {
  if (!data) return null
  const { health, career, synergy, warnings } = data
  if (!health && !career && !synergy?.length && !warnings?.length) return null

  return (
    <section className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/40 p-5 md:p-6">
      <div className="flex items-center gap-2 mb-3">
        <HeartPulse className="w-4 h-4 text-rose-300" />
        <h3 className="text-sm font-bold text-white">
          {isKo ? '건강 × 직업 적성' : 'Health × Career'}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {health && (
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
            <div className="flex items-baseline justify-between mb-2">
              <h4 className="text-sm font-semibold text-white">
                {isKo ? '건강' : 'Health'}
              </h4>
              {typeof health.overallScore === 'number' && (
                <span className="text-[11px] font-mono text-rose-300">
                  {health.overallScore}/100
                </span>
              )}
            </div>
            {health.constitution && (
              <p className="text-sm text-slate-300 leading-relaxed mb-2">{health.constitution}</p>
            )}
            {(health.organHealth?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {health.organHealth!.slice(0, 5).map((o, i) => {
                  const tone = STATUS_TONE[o.status || ''] || 'text-slate-300 border-white/10 bg-white/5'
                  return (
                    <span
                      key={i}
                      className={`text-[11px] px-2 py-0.5 rounded-full border ${tone}`}
                    >
                      {o.organ}
                    </span>
                  )
                })}
              </div>
            )}
            {(health.preventionAdvice?.length ?? 0) > 0 && (
              <ul className="space-y-1">
                {health.preventionAdvice!.slice(0, 3).map((p, i) => (
                  <li key={i} className="text-xs text-slate-300 flex gap-1.5">
                    <span className="text-rose-300">·</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {career && (
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
            <h4 className="text-sm font-semibold text-white mb-2">
              {isKo ? '직업 적성' : 'Career'}
            </h4>
            {career.workStyle && (
              <div className="mb-2">
                {career.workStyle.type && (
                  <p className="text-sm text-white">{career.workStyle.type}</p>
                )}
                {career.workStyle.description && (
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    {career.workStyle.description}
                  </p>
                )}
              </div>
            )}
            {(career.primaryFields?.length ?? 0) > 0 && (
              <div className="space-y-1.5 mb-2">
                {career.primaryFields!.slice(0, 3).map((f, i) => (
                  <div key={i}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm text-white">{f.category}</span>
                      {typeof f.fitScore === 'number' && (
                        <span className="text-[10px] font-mono text-cyan-300">
                          {f.fitScore}
                        </span>
                      )}
                    </div>
                    {(f.jobs?.length ?? 0) > 0 && (
                      <p className="text-xs text-slate-400">{f.jobs!.slice(0, 4).join(' · ')}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {typeof career.entrepreneurialScore === 'number' && (
                <div className="text-[10px] text-slate-400">
                  {isKo ? '창업' : 'Biz'}{' '}
                  <span className="text-white font-mono">{career.entrepreneurialScore}</span>
                </div>
              )}
              {typeof career.leadershipScore === 'number' && (
                <div className="text-[10px] text-slate-400">
                  {isKo ? '리더십' : 'Lead'}{' '}
                  <span className="text-white font-mono">{career.leadershipScore}</span>
                </div>
              )}
              {typeof career.creativityScore === 'number' && (
                <div className="text-[10px] text-slate-400">
                  {isKo ? '창의' : 'Creat'}{' '}
                  <span className="text-white font-mono">{career.creativityScore}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {(synergy?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3 mb-2">
          <div className="text-[11px] font-mono uppercase tracking-widest text-emerald-300 mb-1.5">
            {isKo ? '시너지' : 'Synergy'}
          </div>
          <ul className="space-y-1">
            {synergy!.map((s, i) => (
              <li key={i} className="text-sm text-slate-200 flex gap-1.5">
                <span className="text-emerald-400">+</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(warnings?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3">
          <div className="text-[11px] font-mono uppercase tracking-widest text-amber-300 mb-1.5">
            {isKo ? '주의' : 'Warnings'}
          </div>
          <ul className="space-y-1">
            {warnings!.map((w, i) => (
              <li key={i} className="text-sm text-slate-200 flex gap-1.5">
                <span className="text-amber-400">!</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
