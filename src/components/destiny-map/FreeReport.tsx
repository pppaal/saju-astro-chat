'use client'

import { useMemo, memo } from 'react'
import { repairMojibakeDeep } from '@/lib/text/mojibake'
import { buildLifeReport, type LifeReport } from '@/lib/fusion/lifeReport'
import LifeReportView from './free-report/LifeReportView/LifeReportView'

// ── Loose input shapes (the /api/destiny-map response is widened)
//   — the builder tolerates missing fields, so we only declare what
//   page.tsx threads through here.

interface SajuData {
  [key: string]: unknown
}

interface AstroData {
  [key: string]: unknown
}

interface FusionFragmentItem {
  id: string
  meaning: string
  narrative: string
  intensity: string
}

export interface FusionFragments {
  generatedAt?: string
  byDomain?: Partial<
    Record<
      'self' | 'love' | 'money' | 'career' | 'health' | 'family',
      {
        tone: string
        confirms: FusionFragmentItem[]
        conflicts: FusionFragmentItem[]
      }
    >
  >
  themes?: Array<{ id: string; meaning: string; narrative: string }>
}

interface Props {
  saju?: SajuData
  astro?: AstroData
  lang?: string
  className?: string
  /** Threaded through from page.tsx; not consumed here directly — the
   *  lifeReport builder derives everything from saju + astro. */
  birthInfo?: {
    birthDate?: string
    birthTime?: string
    gender?: string
    timezone?: string
  }
  /** Rule-matched narrative fragments — bundled into the fusion input
   *  so the deterministic builder can fold confirms/conflicts into the
   *  six-domain narratives. */
  fusionFragments?: FusionFragments | null
}

// ============================================================
// FreeReport — thin wrapper around buildLifeReport + LifeReportView.
// Logic and API calls live in page.tsx; this component just composes
// the deterministic LifeReport from inputs and renders it.
// ============================================================

const FreeReport = memo(function FreeReport({
  saju,
  astro,
  lang = 'ko',
  className = '',
  fusionFragments,
}: Props) {
  const isKo = lang === 'ko'

  const report = useMemo<LifeReport | null>(() => {
    if (!saju || !astro) return null
    try {
      const built = buildLifeReport({
        saju: saju as never,
        astro: astro as never,
        fusion: (fusionFragments ?? undefined) as never,
      })
      return repairMojibakeDeep(built) as LifeReport
    } catch {
      return null
    }
  }, [saju, astro, fusionFragments])

  if (!report) return null

  return (
    <div
      className={`mt-8 [&_p]:text-[1.02rem] md:[&_p]:text-[1.06rem] [&_li]:text-[1.02rem] md:[&_li]:text-[1.06rem] ${className}`}
    >
      <LifeReportView report={report} isKo={isKo} />
      <p className="text-center text-xs text-gray-500 mt-8">
        {isKo
          ? '동양 + 서양 운세 시스템 통합 분석'
          : 'Eastern + Western fortune analysis combined'}
      </p>
    </div>
  )
})

export default FreeReport
