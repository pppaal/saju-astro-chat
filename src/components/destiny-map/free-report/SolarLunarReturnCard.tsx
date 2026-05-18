'use client'

import { CalendarHeart } from 'lucide-react'

interface PlanetLike {
  name?: string
  sign?: string
  formatted?: string
  house?: number
}
interface ReturnChartLike {
  planets?: PlanetLike[]
  ascendant?: { sign?: string; formatted?: string }
  returnYear?: number
  returnMonth?: number
  exactReturnTime?: string
}
interface SolarReturnSummaryLike {
  year?: number
  ascSign?: string
  sunHouse?: number
  moonSign?: string
  moonHouse?: number
  theme?: string
}
interface LunarReturnSummaryLike {
  year?: number
  month?: number
  ascSign?: string
  moonHouse?: number
  sunSign?: string
  theme?: string
}
interface SolarReturnLike {
  chart?: ReturnChartLike
  summary?: SolarReturnSummaryLike | string
  date?: string
}
interface LunarReturnLike {
  chart?: ReturnChartLike
  summary?: LunarReturnSummaryLike | string
  date?: string
  moonPhase?: string
}

interface Props {
  solarReturn?: SolarReturnLike | null
  lunarReturn?: LunarReturnLike | null
  isKo: boolean
}

function findPlanet(chart: ReturnChartLike | undefined, name: string): PlanetLike | undefined {
  return chart?.planets?.find(
    (p) => String(p.name || '').toLowerCase() === name.toLowerCase()
  )
}

function asObject<T>(s: T | string | undefined): T | null {
  if (!s || typeof s === 'string') return null
  return s as T
}

export default function SolarLunarReturnCard({ solarReturn, lunarReturn, isKo }: Props) {
  const srSummary = asObject<SolarReturnSummaryLike>(solarReturn?.summary)
  const lrSummary = asObject<LunarReturnSummaryLike>(lunarReturn?.summary)

  const srAsc =
    solarReturn?.chart?.ascendant?.formatted ||
    solarReturn?.chart?.ascendant?.sign ||
    srSummary?.ascSign ||
    null
  const srSun = findPlanet(solarReturn?.chart, 'Sun')
  const srMoon = findPlanet(solarReturn?.chart, 'Moon')

  const lrMoonPhase = lunarReturn?.moonPhase
  const lrAsc =
    lunarReturn?.chart?.ascendant?.formatted ||
    lunarReturn?.chart?.ascendant?.sign ||
    lrSummary?.ascSign ||
    null
  const lrMoon = findPlanet(lunarReturn?.chart, 'Moon')

  if (!srAsc && !srSun && !srMoon && !lrMoonPhase && !lrAsc && !lrMoon) return null

  return (
    <section className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/40 p-5 md:p-6">
      <div className="flex items-center gap-2 mb-3">
        <CalendarHeart className="w-4 h-4 text-amber-300" />
        <h3 className="text-sm font-bold text-white">
          {isKo ? '회귀도 — 올해 × 이달' : 'Returns — Year × Month'}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(srAsc || srSun || srMoon || srSummary?.theme) && (
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3">
            <h4 className="text-sm font-semibold text-white mb-2">
              {isKo ? '올해의 솔라 리턴' : "This Year's Solar Return"}
              {srSummary?.year && (
                <span className="ml-2 text-[10px] font-mono text-amber-300">{srSummary.year}</span>
              )}
            </h4>
            <ul className="space-y-1.5 mb-2">
              {srAsc && (
                <li className="text-sm text-slate-200">
                  <span className="text-cyan-300 font-medium">SR ASC</span>
                  <span className="text-slate-400"> — </span>
                  {srAsc}
                </li>
              )}
              {srSun && (
                <li className="text-sm text-slate-200">
                  <span className="text-amber-300 font-medium">SR {isKo ? '태양' : 'Sun'}</span>
                  <span className="text-slate-400"> — </span>
                  {srSun.formatted || srSun.sign}
                  {srSun.house ? ` · H${srSun.house}` : ''}
                </li>
              )}
              {srMoon && (
                <li className="text-sm text-slate-200">
                  <span className="text-fuchsia-300 font-medium">SR {isKo ? '달' : 'Moon'}</span>
                  <span className="text-slate-400"> — </span>
                  {srMoon.formatted || srMoon.sign}
                  {srMoon.house ? ` · H${srMoon.house}` : ''}
                </li>
              )}
            </ul>
            {srSummary?.theme && (
              <p className="text-xs text-amber-200 leading-relaxed">💡 {srSummary.theme}</p>
            )}
          </div>
        )}

        {(lrMoonPhase || lrAsc || lrMoon || lrSummary?.theme) && (
          <div className="rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-3">
            <h4 className="text-sm font-semibold text-white mb-2">
              {isKo ? '이달의 루나 리턴' : "This Month's Lunar Return"}
              {lrSummary?.month && (
                <span className="ml-2 text-[10px] font-mono text-fuchsia-300">
                  M{lrSummary.month}
                </span>
              )}
            </h4>
            <ul className="space-y-1.5 mb-2">
              {lrAsc && (
                <li className="text-sm text-slate-200">
                  <span className="text-cyan-300 font-medium">LR ASC</span>
                  <span className="text-slate-400"> — </span>
                  {lrAsc}
                </li>
              )}
              {lrMoon && (
                <li className="text-sm text-slate-200">
                  <span className="text-fuchsia-300 font-medium">LR {isKo ? '달' : 'Moon'}</span>
                  <span className="text-slate-400"> — </span>
                  {lrMoon.formatted || lrMoon.sign}
                  {lrMoon.house ? ` · H${lrMoon.house}` : ''}
                </li>
              )}
              {lrMoonPhase && (
                <li className="text-sm text-slate-200">
                  <span className="text-cyan-300 font-medium">
                    {isKo ? '달의 위상' : 'Moon Phase'}
                  </span>
                  <span className="text-slate-400"> — </span>
                  {lrMoonPhase}
                </li>
              )}
            </ul>
            {lrSummary?.theme && (
              <p className="text-xs text-fuchsia-200 leading-relaxed">💡 {lrSummary.theme}</p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
