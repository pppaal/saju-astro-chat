'use client'

import { TrendingUp } from 'lucide-react'

interface PlanetLike {
  name?: string
  sign?: string
  degree?: number
  formatted?: string
  house?: number
}
interface ProgressedChartLike {
  planets?: PlanetLike[]
  ascendant?: { sign?: string; formatted?: string }
  mc?: { sign?: string; formatted?: string }
  progressedDate?: string
  yearsProgressed?: number
}
interface ProgressionSummaryLike {
  asc?: string
  mc?: string
  progressedDate?: string
  type?: string
}
interface ProgressionsLike {
  secondary?: {
    chart?: ProgressedChartLike
    summary?: ProgressionSummaryLike
    moonPhase?: string
  }
  solarArc?: {
    chart?: ProgressedChartLike
    summary?: ProgressionSummaryLike
  }
}

interface Props {
  progressions?: ProgressionsLike | null
  isKo: boolean
}

function findPlanet(chart: ProgressedChartLike | undefined, name: string): PlanetLike | undefined {
  return chart?.planets?.find(
    (p) => String(p.name || '').toLowerCase() === name.toLowerCase()
  )
}

function formatPlanet(p: PlanetLike | undefined, isKo: boolean): string | null {
  if (!p) return null
  if (p.formatted) return p.formatted
  if (p.sign) {
    const deg = typeof p.degree === 'number' ? `${Math.floor(p.degree)}°` : ''
    return `${p.sign} ${deg}${p.house ? ` · ${isKo ? 'H' : 'H'}${p.house}` : ''}`.trim()
  }
  return null
}

export default function ProgressionsCard({ progressions, isKo }: Props) {
  if (!progressions) return null
  const secondary = progressions.secondary
  const solarArc = progressions.solarArc

  if (!secondary && !solarArc) return null

  const progSun = formatPlanet(findPlanet(secondary?.chart, 'Sun'), isKo)
  const progMoon = formatPlanet(findPlanet(secondary?.chart, 'Moon'), isKo)
  const progAsc =
    secondary?.chart?.ascendant?.formatted ||
    secondary?.summary?.asc ||
    secondary?.chart?.ascendant?.sign ||
    null

  const saSun = formatPlanet(findPlanet(solarArc?.chart, 'Sun'), isKo)
  const saMoon = formatPlanet(findPlanet(solarArc?.chart, 'Moon'), isKo)
  const saAsc =
    solarArc?.chart?.ascendant?.formatted ||
    solarArc?.summary?.asc ||
    solarArc?.chart?.ascendant?.sign ||
    null

  if (!progSun && !progMoon && !progAsc && !saSun && !saMoon && !saAsc) return null

  return (
    <section className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/40 p-5 md:p-6">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-cyan-300" />
        <h3 className="text-sm font-bold text-white">
          {isKo ? '진행도 (Progressions)' : 'Progressions'}
        </h3>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        {isKo
          ? '출생 후 시간에 따른 내면 발달 — Secondary Progressions × Solar Arc'
          : 'Inner development over time — Secondary × Solar Arc'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(progSun || progMoon || progAsc) && (
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3">
            <h4 className="text-sm font-semibold text-white mb-2">
              {isKo ? 'Secondary 진행' : 'Secondary Progressions'}
              {secondary?.chart?.progressedDate && (
                <span className="ml-2 text-[10px] font-mono text-cyan-300">
                  {String(secondary.chart.progressedDate).slice(0, 10)}
                </span>
              )}
            </h4>
            <ul className="space-y-1.5">
              {progSun && (
                <li className="text-sm text-slate-200">
                  <span className="text-amber-300 font-medium">{isKo ? '진행 태양' : 'Prog. Sun'}</span>
                  <span className="text-slate-400"> — </span>
                  {progSun}
                </li>
              )}
              {progMoon && (
                <li className="text-sm text-slate-200">
                  <span className="text-fuchsia-300 font-medium">
                    {isKo ? '진행 달' : 'Prog. Moon'}
                  </span>
                  <span className="text-slate-400"> — </span>
                  {progMoon}
                </li>
              )}
              {progAsc && (
                <li className="text-sm text-slate-200">
                  <span className="text-cyan-300 font-medium">
                    {isKo ? '진행 ASC' : 'Prog. ASC'}
                  </span>
                  <span className="text-slate-400"> — </span>
                  {progAsc}
                </li>
              )}
            </ul>
            {secondary?.moonPhase && (
              <p className="text-[11px] text-slate-400 mt-2 font-mono">
                {isKo ? '진행 달의 위상' : 'Moon Phase'}: {secondary.moonPhase}
              </p>
            )}
          </div>
        )}

        {(saSun || saMoon || saAsc) && (
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3">
            <h4 className="text-sm font-semibold text-white mb-2">
              {isKo ? 'Solar Arc' : 'Solar Arc'}
              {solarArc?.chart?.progressedDate && (
                <span className="ml-2 text-[10px] font-mono text-amber-300">
                  {String(solarArc.chart.progressedDate).slice(0, 10)}
                </span>
              )}
            </h4>
            <ul className="space-y-1.5">
              {saSun && (
                <li className="text-sm text-slate-200">
                  <span className="text-amber-300 font-medium">{isKo ? 'SA 태양' : 'SA Sun'}</span>
                  <span className="text-slate-400"> — </span>
                  {saSun}
                </li>
              )}
              {saMoon && (
                <li className="text-sm text-slate-200">
                  <span className="text-fuchsia-300 font-medium">{isKo ? 'SA 달' : 'SA Moon'}</span>
                  <span className="text-slate-400"> — </span>
                  {saMoon}
                </li>
              )}
              {saAsc && (
                <li className="text-sm text-slate-200">
                  <span className="text-cyan-300 font-medium">{isKo ? 'SA ASC' : 'SA ASC'}</span>
                  <span className="text-slate-400"> — </span>
                  {saAsc}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
