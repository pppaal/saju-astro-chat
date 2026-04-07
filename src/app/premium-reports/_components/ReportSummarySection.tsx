'use client'

import ReportSurfaceSection from './ReportSurfaceSection'

type ReportSummarySectionProps = {
  title?: string
  summary: string
  keywords?: string[]
  tone?: 'cyan' | 'emerald'
  className?: string
}

export default function ReportSummarySection({
  title = '핵심 요약',
  summary,
  keywords,
  tone = 'cyan',
  className = '',
}: ReportSummarySectionProps) {
  return (
    <ReportSurfaceSection title={title} tone={tone} className={className}>
      <p className="whitespace-pre-line text-sm leading-7 text-slate-300">{summary}</p>
      {keywords && keywords.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {keywords.map((keyword) => (
            <span
              key={keyword}
              className={`rounded-full px-3 py-1 text-sm ${
                tone === 'emerald'
                  ? 'border border-emerald-200/20 bg-emerald-950/35 text-emerald-100'
                  : 'border border-cyan-300/20 bg-cyan-400/8 text-cyan-100'
              }`}
            >
              #{keyword}
            </span>
          ))}
        </div>
      )}
    </ReportSurfaceSection>
  )
}
