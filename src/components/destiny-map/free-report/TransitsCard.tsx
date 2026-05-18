'use client'

import { Orbit } from 'lucide-react'

interface AspectEndLike {
  name?: string
  kind?: string
  sign?: string
  longitude?: number
  house?: number
}
interface TransitAspectLike {
  from?: AspectEndLike | string
  to?: AspectEndLike | string
  transitPlanet?: string
  natalPoint?: string
  type?: string
  aspectType?: string
  orb?: number
  applying?: boolean
  isApplying?: boolean
}

interface Props {
  transits?: TransitAspectLike[] | null
  isKo: boolean
}

const ASPECT_TONE: Record<string, string> = {
  conjunction: 'text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-500/10',
  trine: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
  sextile: 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10',
  square: 'text-rose-300 border-rose-400/30 bg-rose-500/10',
  opposition: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
}

function endName(end: AspectEndLike | string | undefined): string {
  if (!end) return '?'
  if (typeof end === 'string') return end
  return end.name || '?'
}

export default function TransitsCard({ transits, isKo }: Props) {
  if (!transits || transits.length === 0) return null

  const items = transits
    .map((t) => {
      const transitPlanet = t.transitPlanet || endName(t.from)
      const natalPoint = t.natalPoint || endName(t.to)
      const type = t.type || t.aspectType || ''
      const orb = typeof t.orb === 'number' ? t.orb : undefined
      const applying = t.isApplying ?? t.applying
      return { transitPlanet, natalPoint, type, orb, applying }
    })
    .filter((t) => t.transitPlanet && t.natalPoint && t.type)
    .sort((a, b) => (a.orb ?? 99) - (b.orb ?? 99))

  if (items.length === 0) return null

  return (
    <section className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/40 p-5 md:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Orbit className="w-4 h-4 text-fuchsia-300" />
        <h3 className="text-sm font-bold text-white">
          {isKo ? '현재 트랜짓' : 'Current Transits'}
        </h3>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        {isKo
          ? '지금 하늘의 행성이 출생 차트에 접촉하는 어스펙트'
          : 'Active aspects from current planets to natal points'}
      </p>

      <ul className="space-y-1.5">
        {items.slice(0, 12).map((t, i) => {
          const tone = ASPECT_TONE[t.type] || 'text-slate-200 border-white/10 bg-white/5'
          return (
            <li
              key={i}
              className="flex items-center gap-2 flex-wrap rounded-lg border border-white/5 bg-slate-900/40 px-3 py-2"
            >
              <span className="text-sm font-mono text-fuchsia-200">{t.transitPlanet}</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full border ${tone}`}
              >
                {t.type}
              </span>
              <span className="text-sm font-mono text-cyan-200">{t.natalPoint}</span>
              {typeof t.orb === 'number' && (
                <span className="text-[10px] font-mono text-slate-500 ml-auto">
                  orb {t.orb.toFixed(2)}°
                </span>
              )}
              {typeof t.applying === 'boolean' && (
                <span className="text-[10px] font-mono text-slate-500">
                  {t.applying ? (isKo ? '접근' : 'applying') : isKo ? '분리' : 'separating'}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
