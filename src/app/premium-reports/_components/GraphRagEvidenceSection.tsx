'use client'

import ReportSurfaceSection from './ReportSurfaceSection'

type GraphRagEvidenceAnchor = {
  id: string
  section: string
  sajuEvidence: string
  astrologyEvidence: string
  crossConclusion: string
  crossEvidenceSets?: Array<{
    id: string
    astrologyEvidence: string
    sajuEvidence: string
    overlapDomains?: string[]
    overlapScore?: number
    combinedConclusion?: string
  }>
}

type GraphRagEvidenceBundle = {
  mode: 'comprehensive' | 'timing' | 'themed'
  theme?: string
  period?: string
  anchors: GraphRagEvidenceAnchor[]
}

type GraphRagEvidenceSectionProps = {
  evidence: GraphRagEvidenceBundle
  className?: string
}

export default function GraphRagEvidenceSection({
  evidence,
  className = '',
}: GraphRagEvidenceSectionProps) {
  if (!evidence.anchors?.length) return null

  return (
    <ReportSurfaceSection title="GraphRAG 교차 근거" className={className}>
      <p className="mb-4 text-xs text-slate-400">
        mode: {evidence.mode}
        {evidence.theme ? ` / theme: ${evidence.theme}` : ''}
        {evidence.period ? ` / period: ${evidence.period}` : ''}
      </p>

      <div className="space-y-3">
        {evidence.anchors.map((anchor) => (
          <details
            key={anchor.id}
            className="rounded-lg border border-white/15 bg-slate-950/45 p-3"
          >
            <summary className="cursor-pointer text-sm font-semibold text-slate-200">
              [{anchor.id}] {anchor.section}
            </summary>
            <div className="mt-3 space-y-2 text-xs leading-relaxed">
              <div>
                <p className="font-semibold text-amber-300">Saju Basis</p>
                <p className="text-slate-300">{anchor.sajuEvidence}</p>
              </div>
              <div>
                <p className="font-semibold text-cyan-300">Astrology Basis</p>
                <p className="text-slate-300">{anchor.astrologyEvidence}</p>
              </div>
              <div>
                <p className="font-semibold text-emerald-300">Cross Conclusion</p>
                <p className="text-slate-300">{anchor.crossConclusion}</p>
              </div>
              {Array.isArray(anchor.crossEvidenceSets) && anchor.crossEvidenceSets.length > 0 && (
                <div>
                  <p className="mb-2 font-semibold text-violet-300">Paired Cross Evidence Sets</p>
                  <div className="space-y-2">
                    {anchor.crossEvidenceSets.map((set) => (
                      <div
                        key={`${anchor.id}-${set.id}`}
                        className="rounded border border-violet-300/20 bg-violet-900/20 p-2"
                      >
                        <p className="font-semibold text-violet-200">
                          {set.id}
                          {typeof set.overlapScore === 'number'
                            ? ` · overlap ${Math.round(set.overlapScore * 100)}%`
                            : ''}
                        </p>
                        <p className="mt-1 text-cyan-200">
                          Astrology (angle/orb): {set.astrologyEvidence}
                        </p>
                        <p className="mt-1 text-amber-200">Saju 대응 근거: {set.sajuEvidence}</p>
                        {set.overlapDomains && set.overlapDomains.length > 0 && (
                          <p className="mt-1 text-slate-300">
                            Overlap domains: {set.overlapDomains.join(', ')}
                          </p>
                        )}
                        {set.combinedConclusion && (
                          <p className="mt-1 text-emerald-200">{set.combinedConclusion}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </ReportSurfaceSection>
  )
}
