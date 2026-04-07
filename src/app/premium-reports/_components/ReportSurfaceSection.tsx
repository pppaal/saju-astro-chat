'use client'

import type { ReactNode } from 'react'

type Tone = 'cyan' | 'emerald' | 'amber'

const TONE_CLASS: Record<Tone, string> = {
  cyan: 'border-white/10 bg-white/[0.03]',
  emerald: 'border-emerald-300/30 bg-gradient-to-br from-emerald-500/12 to-teal-500/8',
  amber: 'border-amber-300/20 bg-amber-950/18',
}

type ReportSurfaceSectionProps = {
  title?: string
  eyebrow?: string
  tone?: Tone
  className?: string
  children: ReactNode
}

export default function ReportSurfaceSection({
  title,
  eyebrow,
  tone = 'cyan',
  className = '',
  children,
}: ReportSurfaceSectionProps) {
  return (
    <section
      className={`rounded-[28px] border p-6 backdrop-blur-xl ${TONE_CLASS[tone]} ${className}`.trim()}
    >
      {(eyebrow || title) && (
        <div className="mb-4">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              {eyebrow}
            </p>
          )}
          {title && <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2>}
        </div>
      )}
      {children}
    </section>
  )
}
