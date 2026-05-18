'use client'

import { Crosshair } from 'lucide-react'

interface MidpointLike {
  planet1?: string
  planet2?: string
  id?: string
  sign?: string
  formatted?: string
  name_ko?: string
  keywords?: string[]
}
interface MidpointActivationLike {
  midpoint?: MidpointLike
  activator?: string
  aspectType?: string
  orb?: number
  description?: string
}
interface MidpointsLike {
  sunMoon?: MidpointLike
  ascMc?: MidpointLike
  all?: MidpointLike[]
  activations?: MidpointActivationLike[]
}

interface Props {
  midpoints?: MidpointsLike | null
  isKo: boolean
}

function MidpointRow({ m, isKo }: { m: MidpointLike; isKo: boolean }) {
  const label = m.id || `${m.planet1}/${m.planet2}`
  return (
    <div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-sm font-mono text-cyan-200">{label}</span>
        {m.formatted && <span className="text-xs text-slate-400">{m.formatted}</span>}
        {m.sign && (
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/30 text-cyan-200">
            {m.sign}
          </span>
        )}
      </div>
      {isKo && m.name_ko && (
        <p className="text-xs text-slate-300 mt-0.5">{m.name_ko}</p>
      )}
      {(m.keywords?.length ?? 0) > 0 && (
        <p className="text-[11px] text-slate-500 mt-0.5">{m.keywords!.slice(0, 3).join(' · ')}</p>
      )}
    </div>
  )
}

export default function MidpointsCard({ midpoints, isKo }: Props) {
  if (!midpoints) return null
  const { sunMoon, ascMc, activations } = midpoints
  if (!sunMoon && !ascMc && !(activations?.length ?? 0)) return null

  return (
    <section className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/40 p-5 md:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Crosshair className="w-4 h-4 text-cyan-300" />
        <h3 className="text-sm font-bold text-white">
          {isKo ? '미드포인트' : 'Midpoints'}
        </h3>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        {isKo
          ? '두 행성 사이의 감응점 — 활성화된 미드포인트는 인생의 민감한 주제'
          : 'Sensitive points between planets — activated midpoints are live themes'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        {sunMoon && (
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3">
            <h4 className="text-xs font-mono uppercase tracking-widest text-amber-300 mb-1.5">
              Sun / Moon
            </h4>
            <MidpointRow m={sunMoon} isKo={isKo} />
          </div>
        )}
        {ascMc && (
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3">
            <h4 className="text-xs font-mono uppercase tracking-widest text-cyan-300 mb-1.5">
              ASC / MC
            </h4>
            <MidpointRow m={ascMc} isKo={isKo} />
          </div>
        )}
      </div>

      {(activations?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
          <div className="text-[11px] font-mono uppercase tracking-widest text-fuchsia-300 mb-2">
            {isKo ? '활성화된 미드포인트' : 'Activated Midpoints'}
          </div>
          <ul className="space-y-1.5">
            {activations!.slice(0, 6).map((a, i) => {
              const m = a.midpoint
              const label = m?.id || `${m?.planet1}/${m?.planet2}`
              return (
                <li key={i} className="text-sm text-slate-200">
                  <span className="font-mono text-cyan-200">{label}</span>
                  {a.activator && (
                    <>
                      <span className="text-slate-500"> ← </span>
                      <span className="text-fuchsia-300 font-mono">{a.activator}</span>
                    </>
                  )}
                  {a.aspectType && (
                    <span className="text-[10px] ml-2 text-slate-400">({a.aspectType})</span>
                  )}
                  {typeof a.orb === 'number' && (
                    <span className="text-[10px] ml-1 text-slate-500 font-mono">
                      orb {a.orb.toFixed(2)}°
                    </span>
                  )}
                  {a.description && (
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      {a.description}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
