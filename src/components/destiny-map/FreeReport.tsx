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

// The /api/destiny-map response ships a *compact* fusion projection
// ({ id, meaning, narrative, intensity }), but buildLifeReport's domain
// builders read the rich cross-match shape (m.rule.id /
// m.rule.narrative.confirm). Without this remap the builder throws on the
// first fusion confirm and the whole report renders blank. Rehydrate the
// nesting the builder expects.
type BuilderFusion = NonNullable<Parameters<typeof buildLifeReport>[0]['fusion']>

export function toBuilderFusion(f?: FusionFragments | null): BuilderFusion | undefined {
  if (!f?.byDomain) return undefined
  const toMatch = (m: FusionFragmentItem) => ({
    intensity: m.intensity,
    rule: { id: m.id, meaning: m.meaning, narrative: { confirm: m.narrative, conflict: m.narrative } },
  })
  const byDomain = Object.fromEntries(
    Object.entries(f.byDomain).map(([domain, agg]) => [
      domain,
      {
        tone: agg?.tone,
        confirms: (agg?.confirms ?? []).map(toMatch),
        conflicts: (agg?.conflicts ?? []).map(toMatch),
      },
    ])
  )
  const themes = (f.themes ?? []).map((t) => ({
    rule: { id: t.id, meaning: t.meaning, narrative: t.narrative },
  }))
  return { generatedAt: f.generatedAt, byDomain, themes } as unknown as BuilderFusion
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
  birthInfo,
  fusionFragments,
}: Props) {
  const isKo = lang === 'ko'

  const report = useMemo<LifeReport | null>(() => {
    if (!saju || !astro) return null
    try {
      // API 응답의 saju 는 직렬화 과정에서 `input`(생년월일·성별 등)을 잃는다.
      // 빌더가 saju.input 을 읽으므로(타이밍·성별별 연애 등), birthInfo 로
      // input 을 복원해 넣는다. 누락 시 빌더가 throw → 리포트 전체가 비는 걸 방지.
      const s = saju as Record<string, unknown>
      let sajuForBuild = saju
      if (!s.input) {
        const [y, m, d] = (birthInfo?.birthDate ?? '').split('-').map((n: string) => Number(n))
        sajuForBuild = {
          ...s,
          input: {
            birthDate: birthInfo?.birthDate,
            birthTime: birthInfo?.birthTime,
            gender: birthInfo?.gender,
            timezone: birthInfo?.timezone,
            ...(Number.isFinite(y) ? { year: y, month: m, date: d } : {}),
          },
        } as SajuData
      }
      const built = buildLifeReport({
        saju: sajuForBuild as never,
        astro: astro as never,
        fusion: toBuilderFusion(fusionFragments),
      })
      return repairMojibakeDeep(built) as LifeReport
    } catch {
      return null
    }
  }, [saju, astro, fusionFragments, birthInfo])

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
