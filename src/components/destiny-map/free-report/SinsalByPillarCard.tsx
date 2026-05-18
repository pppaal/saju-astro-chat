'use client'

import { Sparkle } from 'lucide-react'

interface PillarSinsal {
  twelveShinsal?: string[]
  generalShinsal?: string[]
  lucky?: string[]
}
interface SinsalLike {
  byPillar?: {
    year?: PillarSinsal
    month?: PillarSinsal
    day?: PillarSinsal
    time?: PillarSinsal
  }
}

interface Props {
  sinsal?: SinsalLike | null
  isKo: boolean
}

const PILLAR_LABEL_KO: Record<string, string> = {
  year: '년주',
  month: '월주',
  day: '일주',
  time: '시주',
}
const PILLAR_LABEL_EN: Record<string, string> = {
  year: 'Year',
  month: 'Month',
  day: 'Day',
  time: 'Time',
}

export default function SinsalByPillarCard({ sinsal, isKo }: Props) {
  const byPillar = sinsal?.byPillar
  if (!byPillar) return null

  const pillars: Array<'year' | 'month' | 'day' | 'time'> = ['year', 'month', 'day', 'time']
  const labelMap = isKo ? PILLAR_LABEL_KO : PILLAR_LABEL_EN

  const hasAny = pillars.some((k) => {
    const p = byPillar[k]
    return (
      (p?.twelveShinsal?.length ?? 0) > 0 ||
      (p?.generalShinsal?.length ?? 0) > 0 ||
      (p?.lucky?.length ?? 0) > 0
    )
  })
  if (!hasAny) return null

  return (
    <section className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/40 p-5 md:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Sparkle className="w-4 h-4 text-fuchsia-300" />
        <h3 className="text-sm font-bold text-white">
          {isKo ? '기둥별 신살' : 'Sinsal by Pillar'}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {pillars.map((k) => {
          const p = byPillar[k]
          if (!p) return null
          const hasContent =
            (p.twelveShinsal?.length ?? 0) > 0 ||
            (p.generalShinsal?.length ?? 0) > 0 ||
            (p.lucky?.length ?? 0) > 0
          if (!hasContent) return null

          return (
            <div key={k} className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
              <h4 className="text-sm font-semibold text-white mb-2">{labelMap[k]}</h4>

              {(p.twelveShinsal?.length ?? 0) > 0 && (
                <div className="mb-2">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-fuchsia-300 mb-1">
                    {isKo ? '12신살' : '12 Sinsal'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.twelveShinsal!.map((s, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-fuchsia-500/15 border border-fuchsia-400/30 text-fuchsia-200"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(p.generalShinsal?.length ?? 0) > 0 && (
                <div className="mb-2">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-1">
                    {isKo ? '일반신살' : 'General Sinsal'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.generalShinsal!.map((s, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-slate-700/40 border border-slate-500/30 text-slate-200"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(p.lucky?.length ?? 0) > 0 && (
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300 mb-1">
                    {isKo ? '길신' : 'Lucky'}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.lucky!.map((s, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-200"
                      >
                        ✦ {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
