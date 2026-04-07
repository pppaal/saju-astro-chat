'use client'

import type { QualityAudit } from '@/lib/destiny-matrix/ai-report/qualityAudit'
import ReportSurfaceSection from './ReportSurfaceSection'

type QualityAuditSectionProps = {
  qualityAudit: QualityAudit
  className?: string
}

export default function QualityAuditSection({
  qualityAudit,
  className = '',
}: QualityAuditSectionProps) {
  return (
    <ReportSurfaceSection title="품질 점검" className={className}>
      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
        <div className="rounded p-3 text-slate-200 bg-slate-900/60">
          Overall: {qualityAudit.overallQualityScore}
        </div>
        <div className="rounded p-3 text-slate-200 bg-slate-900/60">
          완성도: {qualityAudit.completenessScore}
        </div>
        <div className="rounded p-3 text-slate-200 bg-slate-900/60">
          교차근거: {qualityAudit.crossEvidenceScore}
        </div>
        <div className="rounded p-3 text-slate-200 bg-slate-900/60">
          실행성: {qualityAudit.actionabilityScore}
        </div>
        <div className="rounded p-3 text-slate-200 bg-slate-900/60">
          명확성: {qualityAudit.clarityScore}
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-green-300">Strengths</h3>
          <ul className="space-y-1 text-xs text-slate-300">
            {qualityAudit.strengths.map((item, idx) => (
              <li key={`${item}-${idx}`}>• {item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-amber-300">Issues</h3>
          <ul className="space-y-1 text-xs text-slate-300">
            {qualityAudit.issues.map((item, idx) => (
              <li key={`${item}-${idx}`}>• {item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-cyan-300">Recommendations</h3>
          <ul className="space-y-1 text-xs text-slate-300">
            {qualityAudit.recommendations.map((item, idx) => (
              <li key={`${item}-${idx}`}>• {item}</li>
            ))}
          </ul>
        </div>
      </div>
    </ReportSurfaceSection>
  )
}
