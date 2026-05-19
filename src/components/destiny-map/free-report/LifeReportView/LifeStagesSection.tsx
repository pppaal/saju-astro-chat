'use client'

import { Compass } from 'lucide-react'
import type { LifeStage, LifeStages } from '@/lib/fusion/lifeReport'

interface LifeStagesSectionProps {
  stages: LifeStages
  isKo: boolean
}

const STAGE_ORDER: ReadonlyArray<keyof LifeStages> = ['early', 'young', 'middle', 'late']

const STAGE_ACCENT: Record<keyof LifeStages, string> = {
  early: 'border-emerald-400/30 from-emerald-500/10',
  young: 'border-amber-400/30 from-amber-500/10',
  middle: 'border-rose-400/30 from-rose-500/10',
  late: 'border-indigo-400/30 from-indigo-500/10',
}

const DOT_ACCENT: Record<keyof LifeStages, string> = {
  early: 'bg-emerald-300',
  young: 'bg-amber-300',
  middle: 'bg-rose-300',
  late: 'bg-indigo-300',
}

function hasContent(stage: LifeStage): boolean {
  return stage.paragraphs.some((p) => (p.ko || p.en || '').trim().length > 0)
}

/**
 * Vertical timeline of 4 life stages (early / young / middle / late).
 * Silent when every stage is empty.
 */
export default function LifeStagesSection({ stages, isKo }: LifeStagesSectionProps) {
  const visible = STAGE_ORDER.filter((id) => hasContent(stages[id]))
  if (visible.length === 0) return null

  return (
    <section className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/40 p-5 md:p-6">
      <header className="flex items-center gap-2 mb-4">
        <Compass className="w-4 h-4 text-cyan-300" aria-hidden />
        <h2 className="text-sm md:text-base font-bold text-white">
          {isKo ? '인생 4단계' : 'Four Life Stages'}
        </h2>
      </header>

      <ol className="relative space-y-5 pl-5 before:content-[''] before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-700/60">
        {visible.map((id) => {
          const stage = stages[id]
          const title = isKo ? stage.title.ko : stage.title.en
          const accent = STAGE_ACCENT[id]
          const dot = DOT_ACCENT[id]
          return (
            <li key={id} className="relative">
              <span
                className={`absolute -left-[18px] top-1.5 inline-block h-3 w-3 rounded-full ${dot} ring-2 ring-slate-900`}
                aria-hidden
              />
              <article
                className={`rounded-xl border bg-gradient-to-br to-transparent p-4 ${accent}`}
              >
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <h3 className="text-sm md:text-base font-bold text-white">{title}</h3>
                  <span className="text-[11px] font-mono uppercase tracking-widest text-slate-400">
                    {stage.years}
                  </span>
                </div>
                <div className="space-y-2.5">
                  {stage.paragraphs.map((p, i) => {
                    const text = isKo ? p.ko : p.en
                    if (!text) return null
                    return (
                      <p
                        key={i}
                        className="text-sm leading-relaxed text-slate-200 whitespace-pre-line"
                      >
                        {text}
                      </p>
                    )
                  })}
                </div>
              </article>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
