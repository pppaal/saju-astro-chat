'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

type Accent = 'violet' | 'cyan' | 'amber' | 'emerald'

type ReportBuilderHeroProps = {
  accent?: Accent
  badge: string
  title: string
  description: string
  meta: string
  backHref?: string
  backLabel?: string
  actions?: ReactNode
}

const BADGE_CLASSES: Record<Accent, string> = {
  violet: 'border-violet-300/35 bg-violet-400/10 text-violet-100',
  cyan: 'border-cyan-300/35 bg-cyan-400/10 text-cyan-100',
  amber: 'border-amber-300/35 bg-amber-400/10 text-amber-100',
  emerald: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100',
}

const META_CLASSES: Record<Accent, string> = {
  violet: 'text-violet-100/90',
  cyan: 'text-cyan-100/90',
  amber: 'text-amber-100/90',
  emerald: 'text-emerald-100/90',
}

export default function ReportBuilderHero({
  accent = 'violet',
  badge,
  title,
  description,
  meta,
  backHref = '/premium-reports',
  backLabel = '프리미엄 리포트',
  actions,
}: ReportBuilderHeroProps) {
  return (
    <header className="px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center rounded-full border border-white/15 bg-slate-950/55 px-4 text-sm text-slate-300 backdrop-blur-xl transition hover:border-white/25 hover:text-white"
        >
          {backLabel}
        </Link>

        <div className="mt-5 rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(10,16,28,0.88),rgba(5,9,17,0.82))] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
          <div
            className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${BADGE_CLASSES[accent]}`}
          >
            {badge}
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200 sm:text-[15px]">
            {description}
          </p>
          <p
            className={`mt-4 text-xs font-semibold tracking-[0.14em] uppercase ${META_CLASSES[accent]}`}
          >
            {meta}
          </p>
          {actions ? <div className="mt-5">{actions}</div> : null}
        </div>
      </div>
    </header>
  )
}
