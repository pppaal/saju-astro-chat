'use client'

import type { LifeReport } from '@/lib/fusion/lifeReport'
import HeadlineCard from './HeadlineCard'
import LifeStagesSection from './LifeStagesSection'
import DecisiveTimingCard from './DecisiveTimingCard'
import KarmaCard from './KarmaCard'
import DomainSection from './DomainSection'

interface LifeReportViewProps {
  report: LifeReport
  isKo: boolean
}

/**
 * Top-level renderer for a deterministic LifeReport. Each child is
 * defensive about empty data and returns null when its slice has no
 * paragraphs, so the whole page collapses gracefully on partial input.
 */
export default function LifeReportView({ report, isKo }: LifeReportViewProps) {
  return (
    <div className="space-y-6">
      <HeadlineCard headline={report.headline} isKo={isKo} />
      <LifeStagesSection stages={report.lifeStages} isKo={isKo} />
      <DecisiveTimingCard timing={report.decisiveTiming} isKo={isKo} />
      <KarmaCard karma={report.karma} isKo={isKo} />
      <DomainSection domains={report.domains} isKo={isKo} />
    </div>
  )
}
