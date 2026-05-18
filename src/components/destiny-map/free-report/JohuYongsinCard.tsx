'use client'

import { Sun } from 'lucide-react'

interface JohuLike {
  season?: string
  primary?: string
  secondary?: string
  description?: string
}
interface TuechulPillarLike {
  branch?: string
  pillar?: string
  hiddenStems?: Array<{
    stem?: string
    type?: string
    transparent?: boolean
    transparentPillar?: string
  }>
}
interface HoegukLike {
  type?: string
  branches?: string[]
  resultElement?: string
  complete?: boolean
  strength?: number
}
interface DeukryeongLike {
  daymaster?: string
  monthBranch?: string
  status?: string
  strength?: number
  description?: string
}

interface Props {
  johuYongsin?: JohuLike | null
  tuechul?: TuechulPillarLike[] | null
  hoeguk?: HoegukLike[] | null
  deukryeong?: DeukryeongLike | null
  isKo: boolean
}

export default function JohuYongsinCard({
  johuYongsin,
  tuechul,
  hoeguk,
  deukryeong,
  isKo,
}: Props) {
  const hasJohu = Boolean(johuYongsin?.primary || johuYongsin?.description)
  const hasTuechul =
    Array.isArray(tuechul) &&
    tuechul.some((t) => (t.hiddenStems?.some((h) => h.transparent) ?? false))
  const hasHoeguk = Array.isArray(hoeguk) && hoeguk.length > 0
  const hasDeukryeong = Boolean(deukryeong?.status)

  if (!hasJohu && !hasTuechul && !hasHoeguk && !hasDeukryeong) return null

  return (
    <section className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/40 p-5 md:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Sun className="w-4 h-4 text-amber-300" />
        <h3 className="text-sm font-bold text-white">
          {isKo ? '명리학 기본 분석' : 'Classical Saju Analysis'}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {hasJohu && johuYongsin && (
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
            <h4 className="text-sm font-semibold text-white mb-1.5">
              {isKo ? '조후용신' : 'Johu Yongsin'}
              {johuYongsin.season && (
                <span className="ml-2 text-[11px] font-mono text-amber-300">
                  {johuYongsin.season}
                </span>
              )}
            </h4>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {johuYongsin.primary && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-200">
                  {isKo ? '주' : 'Primary'} · {johuYongsin.primary}
                </span>
              )}
              {johuYongsin.secondary && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/30 text-cyan-200">
                  {isKo ? '부' : 'Secondary'} · {johuYongsin.secondary}
                </span>
              )}
            </div>
            {johuYongsin.description && (
              <p className="text-sm text-slate-300 leading-relaxed">{johuYongsin.description}</p>
            )}
          </div>
        )}

        {hasDeukryeong && deukryeong && (
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
            <h4 className="text-sm font-semibold text-white mb-1.5">
              {isKo ? '득령' : 'Deukryeong'}
              {deukryeong.status && (
                <span className="ml-2 text-[11px] font-mono text-fuchsia-300">
                  {deukryeong.status}
                </span>
              )}
            </h4>
            {typeof deukryeong.strength === 'number' && (
              <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-400">
                <span>{isKo ? '강도' : 'Strength'}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-fuchsia-400/60"
                    style={{
                      width: `${Math.max(0, Math.min(100, Math.abs(deukryeong.strength)))}%`,
                    }}
                  />
                </div>
                <span className="font-mono text-slate-300">{deukryeong.strength}</span>
              </div>
            )}
            {deukryeong.description && (
              <p className="text-sm text-slate-300 leading-relaxed">{deukryeong.description}</p>
            )}
          </div>
        )}

        {hasTuechul && (
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
            <h4 className="text-sm font-semibold text-white mb-1.5">
              {isKo ? '투출' : 'Tuechul'}
            </h4>
            <ul className="space-y-1">
              {tuechul!
                .flatMap((t) =>
                  (t.hiddenStems || [])
                    .filter((h) => h.transparent)
                    .map((h) => ({ t, h }))
                )
                .slice(0, 6)
                .map(({ t, h }, i) => (
                  <li
                    key={i}
                    className="text-xs text-slate-300 flex items-center gap-1.5 flex-wrap"
                  >
                    <span className="font-mono text-amber-200">{h.stem}</span>
                    <span className="text-slate-500">
                      ({t.pillar}/{t.branch} {h.type})
                    </span>
                    {h.transparentPillar && (
                      <span className="text-slate-500">
                        → {isKo ? '천간' : 'stem'} {h.transparentPillar}
                      </span>
                    )}
                  </li>
                ))}
            </ul>
          </div>
        )}

        {hasHoeguk && (
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
            <h4 className="text-sm font-semibold text-white mb-1.5">
              {isKo ? '회국' : 'Hoeguk'}
            </h4>
            <ul className="space-y-1.5">
              {hoeguk!.slice(0, 4).map((h, i) => (
                <li key={i} className="text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/30 text-cyan-200">
                      {h.type}
                    </span>
                    {(h.branches?.length ?? 0) > 0 && (
                      <span className="font-mono text-slate-200">{h.branches!.join('·')}</span>
                    )}
                    {h.resultElement && (
                      <span className="text-slate-500">→ {h.resultElement}</span>
                    )}
                    {typeof h.strength === 'number' && (
                      <span className="text-[10px] font-mono text-cyan-300">
                        {h.strength}
                      </span>
                    )}
                    {typeof h.complete === 'boolean' && (
                      <span className="text-[10px] text-slate-500">
                        {h.complete
                          ? isKo
                            ? '완전'
                            : 'complete'
                          : isKo
                            ? '부분'
                            : 'partial'}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
