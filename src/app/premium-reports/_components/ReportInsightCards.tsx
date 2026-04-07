'use client'

import ReportSurfaceSection from './ReportSurfaceSection'

type InsightCardItem = {
  title: string
  body: string
  footer?: string
}

type ReportInsightCardsProps = {
  title: string
  items: InsightCardItem[]
  tone?: 'cyan' | 'emerald'
  className?: string
}

export default function ReportInsightCards({
  title,
  items,
  tone = 'cyan',
  className = '',
}: ReportInsightCardsProps) {
  if (!items.length) return null

  return (
    <ReportSurfaceSection title={title} tone={tone} className={className}>
      <div className="grid gap-3">
        {items.map((item) => (
          <article
            key={`${item.title}-${item.body}-${item.footer || ''}`}
            className={`rounded-2xl p-4 ${
              tone === 'emerald'
                ? 'border border-emerald-200/25 bg-emerald-950/35'
                : 'border border-white/10 bg-[#090f1b]/88'
            }`}
          >
            <p className="text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{item.body}</p>
            {item.footer && (
              <p
                className={`mt-3 text-xs font-semibold uppercase tracking-[0.14em] ${
                  tone === 'emerald' ? 'text-emerald-200' : 'text-cyan-100/80'
                }`}
              >
                {item.footer}
              </p>
            )}
          </article>
        ))}
      </div>
    </ReportSurfaceSection>
  )
}
