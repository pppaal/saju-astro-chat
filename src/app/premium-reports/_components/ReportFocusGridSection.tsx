'use client'

import ReportSurfaceSection from './ReportSurfaceSection'

type FocusItem = {
  domain: string
  score: number
  summary: string
}

type ReportFocusGridSectionProps = {
  title?: string
  items: FocusItem[]
  tone?: 'cyan' | 'emerald'
  className?: string
}

export default function ReportFocusGridSection({
  title = '포커스 영역',
  items,
  tone = 'cyan',
  className = '',
}: ReportFocusGridSectionProps) {
  if (!items.length) return null

  return (
    <ReportSurfaceSection title={title} tone={tone} className={className}>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <article
            key={`${item.domain}-${item.score}-${item.summary}`}
            className={`rounded-2xl p-4 ${
              tone === 'emerald'
                ? 'border border-emerald-200/25 bg-emerald-950/30'
                : 'border border-white/10 bg-[#090f1b]/88'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-white">{item.domain}</p>
              <span
                className={`text-xs font-semibold ${
                  tone === 'emerald' ? 'text-emerald-200' : 'text-cyan-100'
                }`}
              >
                {item.score}점
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.summary}</p>
          </article>
        ))}
      </div>
    </ReportSurfaceSection>
  )
}
