'use client'

import { Clock3 } from 'lucide-react'

interface VoidOfCourseLike {
  isVoid?: boolean
  moonSign?: string
  description?: string
}
interface PlanetaryHourLike {
  planet?: string
  dayRuler?: string
  isDay?: boolean
  goodFor?: string[]
}
interface ElectionalAnalysisLike {
  recommendations?: string[]
  warnings?: string[]
  beneficAspects?: string[]
  maleficAspects?: string[]
}
interface ElectionalLike {
  moonPhase?: string
  voidOfCourse?: VoidOfCourseLike | boolean | null
  planetaryHour?: PlanetaryHourLike | string
  retrograde?: string[]
  analysis?: ElectionalAnalysisLike
}

interface Props {
  electional?: ElectionalLike | null
  isKo: boolean
}

export default function ElectionalCard({ electional, isKo }: Props) {
  if (!electional) return null

  const moonPhase = electional.moonPhase
  const voc = electional.voidOfCourse
  const vocObj =
    typeof voc === 'object' && voc !== null ? (voc as VoidOfCourseLike) : null
  const isVoid =
    typeof voc === 'boolean'
      ? voc
      : typeof voc === 'object' && voc !== null
        ? Boolean((voc as VoidOfCourseLike).isVoid)
        : false

  const ph = electional.planetaryHour
  const phObj = typeof ph === 'object' && ph !== null ? (ph as PlanetaryHourLike) : null
  const phLabel = typeof ph === 'string' ? ph : phObj?.planet

  const retrograde = electional.retrograde
  const analysis = electional.analysis

  if (
    !moonPhase &&
    !vocObj &&
    !phLabel &&
    !(retrograde?.length ?? 0) &&
    !analysis
  )
    return null

  return (
    <section className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/40 p-5 md:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Clock3 className="w-4 h-4 text-cyan-300" />
        <h3 className="text-sm font-bold text-white">
          {isKo ? '오늘의 택일 (Electional)' : "Today's Electional"}
        </h3>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        {isKo
          ? '의사결정·약속·시작에 좋은 시간 가이드'
          : 'Timing guide for decisions, starts, and contracts'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3 space-y-2">
          {moonPhase && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-fuchsia-300">
                {isKo ? '달의 위상' : 'Moon Phase'}
              </div>
              <p className="text-sm text-white mt-0.5">{moonPhase}</p>
            </div>
          )}

          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-300">
              {isKo ? '공망 (Void of Course)' : 'Void of Course'}
            </div>
            <p className="text-sm text-white mt-0.5">
              {isVoid
                ? isKo
                  ? '⚠ 공망 중 — 새 일 미루기'
                  : '⚠ Void — defer new starts'
                : isKo
                  ? '✓ 정상'
                  : '✓ Normal'}
            </p>
            {vocObj?.description && (
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                {vocObj.description}
              </p>
            )}
          </div>

          {phLabel && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300">
                {isKo ? '행성 시간' : 'Planetary Hour'}
              </div>
              <p className="text-sm text-white mt-0.5">
                {phLabel}
                {phObj?.isDay !== undefined && (
                  <span className="ml-2 text-[11px] text-slate-400">
                    {phObj.isDay ? (isKo ? '낮' : 'Day') : isKo ? '밤' : 'Night'}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3 space-y-2">
          {(retrograde?.length ?? 0) > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-rose-300 mb-1">
                {isKo ? '역행 행성' : 'Retrograde'}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {retrograde!.map((r, i) => (
                  <span
                    key={i}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-400/30 text-rose-200"
                  >
                    ℞ {r}
                  </span>
                ))}
              </div>
            </div>
          )}

          {analysis && (analysis.recommendations?.length ?? 0) > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-300 mb-1">
                {isKo ? '권고' : 'Recommendations'}
              </div>
              <ul className="space-y-1">
                {analysis.recommendations!.slice(0, 3).map((r, i) => (
                  <li key={i} className="text-xs text-slate-200 flex gap-1.5">
                    <span className="text-emerald-400">·</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {analysis && (analysis.warnings?.length ?? 0) > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300 mb-1">
                {isKo ? '주의' : 'Warnings'}
              </div>
              <ul className="space-y-1">
                {analysis.warnings!.slice(0, 3).map((r, i) => (
                  <li key={i} className="text-xs text-slate-200 flex gap-1.5">
                    <span className="text-amber-400">!</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
