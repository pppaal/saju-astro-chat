'use client'

import { useState } from 'react'
import type { CalculationDetails } from '@/lib/destiny-matrix/ai-report/qualityAudit'
import ReportSurfaceSection from './ReportSurfaceSection'

type CalculationDetailsSectionProps = {
  calculationDetails: CalculationDetails
  className?: string
}

export default function CalculationDetailsSection({
  calculationDetails,
  className = '',
}: CalculationDetailsSectionProps) {
  const [showRawJson, setShowRawJson] = useState(false)

  return (
    <ReportSurfaceSection title="사주/점성 계산 근거 전체 상세" className={className}>
      <details className="mb-3">
        <summary className="cursor-pointer text-slate-200">입력 스냅샷 (사주 + 점성)</summary>
        <pre className="mt-2 overflow-auto rounded bg-slate-900/60 p-3 text-xs text-slate-300">
          {JSON.stringify(calculationDetails.inputSnapshot, null, 2)}
        </pre>
      </details>

      <details className="mb-3">
        <summary className="cursor-pointer text-slate-200">타이밍 데이터</summary>
        <pre className="mt-2 overflow-auto rounded bg-slate-900/60 p-3 text-xs text-slate-300">
          {JSON.stringify(calculationDetails.timingData, null, 2)}
        </pre>
      </details>

      <details className="mb-3" open>
        <summary className="cursor-pointer text-slate-200">Matrix Summary</summary>
        <pre className="mt-2 overflow-auto rounded bg-slate-900/60 p-3 text-xs text-slate-300">
          {JSON.stringify(calculationDetails.matrixSummary, null, 2)}
        </pre>
      </details>

      <details className="mb-3">
        <summary className="cursor-pointer text-slate-200">Top Insights + Sources</summary>
        <pre className="mt-2 overflow-auto rounded bg-slate-900/60 p-3 text-xs text-slate-300">
          {JSON.stringify(calculationDetails.topInsightsWithSources, null, 2)}
        </pre>
      </details>

      <button
        onClick={() => setShowRawJson((prev) => !prev)}
        className="mt-2 rounded bg-slate-700 px-3 py-2 text-xs text-white hover:bg-slate-600"
      >
        {showRawJson ? 'Raw JSON 숨기기' : 'Raw JSON 전체 보기'}
      </button>

      {showRawJson && (
        <pre className="mt-3 max-h-[420px] overflow-auto rounded bg-slate-900/60 p-3 text-xs text-slate-300">
          {JSON.stringify(calculationDetails, null, 2)}
        </pre>
      )}
    </ReportSurfaceSection>
  )
}
