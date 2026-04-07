'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { analytics } from '@/components/analytics/GoogleAnalytics'
import { useUserProfile } from '@/hooks/useUserProfile'
import UnifiedServiceLoading from '@/components/ui/UnifiedServiceLoading'
import {
  PremiumPageScaffold,
  PersonModelOverview,
  ReportBuilderActionPanel,
  ReportBuilderHero,
  ReportBulletListSection,
  ReportFocusGridSection,
  ReportInsightCards,
  ReportSummarySection,
  ReportSurfaceSection,
  type ReportProfileInput,
} from '@/app/premium-reports/_components'
import {
  buildQueryReportProfileInput,
  fetchPremiumSajuData,
  type PremiumSajuData,
  toReportTier,
} from '@/app/premium-reports/_lib/shared'
import { usePremiumReportProfile } from '@/app/premium-reports/_lib/usePremiumReportProfile'
import { savePremiumReportSnapshot } from '@/lib/premium-reports/reportSnapshot'
import { REPORT_CREDIT_COSTS } from '@/lib/destiny-matrix/ai-report'
import type { AdapterPersonModel } from '@/lib/destiny-matrix/core/adaptersTypes'

interface FreeDigestReport {
  tier: 'free'
  headline: string
  summary: string
  overallScore: number
  grade: string
  personModel?: AdapterPersonModel
  topInsights?: Array<{ title: string; reason: string; action: string }>
  focusAreas?: Array<{ domain: string; score: number; summary: string }>
  caution?: string[]
  nextSteps?: string[]
}

const FEATURES = [
  '사주·점성 교차 기반 구조 요약',
  '현재 타이밍과 핵심 흐름 정리',
  '연애·커리어·재정·건강 포커스 영역 표시',
  '강점, 주의점, 다음 단계 제안',
  '무료는 빠른 요약, 프리미엄은 심화 해석',
  '같은 출생 프로필로 무료/프리미엄 공통 분석',
]

export default function ComprehensiveReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const redirectedRef = useRef(false)
  const { profile, isLoading: profileLoading } = useUserProfile()

  const reportTier = toReportTier(searchParams?.get('tier') ?? null)
  const queryProfileInput = useMemo<ReportProfileInput | null>(
    () => buildQueryReportProfileInput(searchParams, profile),
    [profile, searchParams]
  )
  const { profileInput, setProfileInput } = usePremiumReportProfile(profile, queryProfileInput)

  const [sajuData, setSajuData] = useState<PremiumSajuData | null>(null)
  const [sajuLoading, setSajuLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [freeReport, setFreeReport] = useState<FreeDigestReport | null>(null)

  useEffect(() => {
    if (reportTier === 'premium' && status === 'unauthenticated' && !redirectedRef.current) {
      redirectedRef.current = true
      router.push('/auth/signin?callbackUrl=/premium-reports/comprehensive')
    }
    if (status === 'authenticated' || reportTier === 'free') {
      redirectedRef.current = false
    }
  }, [reportTier, router, status])

  const loadSajuData = useCallback(async () => {
    if (status !== 'authenticated') {
      return
    }

    setSajuLoading(true)
    try {
      setSajuData(await fetchPremiumSajuData())
    } finally {
      setSajuLoading(false)
    }
  }, [status])

  useEffect(() => {
    void loadSajuData()
  }, [loadSajuData])

  const canGenerate = useMemo(
    () => Boolean((profileInput?.birthDate || profile.birthDate) && !isGenerating),
    [profileInput?.birthDate, profile.birthDate, isGenerating]
  )

  const handleGenerate = async () => {
    const finalBirthDate = profileInput?.birthDate || profile.birthDate
    if (!finalBirthDate) {
      setError('생년월일 정보를 확인해 주세요.')
      return
    }

    setError(null)
    setIsGenerating(true)
    setFreeReport(null)

    try {
      const response = await fetch('/api/destiny-matrix/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportTier,
          period: 'comprehensive',
          ...(sajuData?.dayMasterElement ? { dayMasterElement: sajuData.dayMasterElement } : {}),
          name: profileInput?.name || profile.name || '사용자',
          birthDate: finalBirthDate,
          birthTime: profileInput?.birthTime || profile.birthTime || undefined,
          timezone: profileInput?.timezone || profile.timezone || undefined,
          birthCity: profileInput?.birthCity || profile.birthCity || undefined,
          gender: profileInput?.gender || undefined,
          latitude: profileInput?.latitude ?? profile.latitude ?? undefined,
          longitude: profileInput?.longitude ?? profile.longitude ?? undefined,
          detailLevel: reportTier === 'premium' ? 'comprehensive' : 'standard',
          lang: 'ko',
        }),
      })

      const data = await response.json()

      if (!data.success) {
        if (data.error?.code === 'INSUFFICIENT_CREDITS') {
          router.push('/pricing?reason=credits')
          return
        }
        throw new Error(data.error?.message || '리포트 생성에 실패했습니다.')
      }

      if (reportTier === 'free') {
        setFreeReport(data.report as FreeDigestReport)
        return
      }

      if (data.report?.id) {
        savePremiumReportSnapshot({
          reportId: data.report.id,
          reportType: 'comprehensive',
          period: 'comprehensive',
          createdAt: new Date().toISOString(),
          report: data.report,
        })
      }

      analytics.matrixGenerate('premium-reports/comprehensive')
      router.push(`/premium-reports/result/${data.report.id}?type=comprehensive`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청 처리 중 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  if ((reportTier === 'premium' && status === 'loading') || profileLoading || sajuLoading) {
    return <UnifiedServiceLoading kind="aiReport" locale="ko" />
  }

  return (
    <>
      {isGenerating && reportTier === 'premium' && (
        <div className="fixed inset-0 z-[120]">
          <UnifiedServiceLoading kind="aiReport" locale="ko" />
        </div>
      )}
      <PremiumPageScaffold accent="amber">
        <ReportBuilderHero
          accent="amber"
          badge="Persona Report"
          title="종합 리포트"
          description="무료는 핵심 구조와 현재 흐름을 먼저 보여주는 빠른 요약입니다. 프리미엄은 같은 출생 프로필을 바탕으로 더 깊은 인물 해석, 타이밍, 적용 가이드, PDF까지 확장합니다."
          meta={
            reportTier === 'premium'
              ? `${REPORT_CREDIT_COSTS.comprehensive} credits · 프리미엄 리포트 + PDF`
              : '0 credits · 무료 종합 요약'
          }
          actions={
            <div className="inline-flex rounded-xl border border-white/15 bg-slate-950/50 p-1">
              <button
                onClick={() => router.replace('/premium-reports/comprehensive?tier=free')}
                className={`min-h-10 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  reportTier === 'free'
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                빠른 요약
              </button>
              <button
                onClick={() => router.replace('/premium-reports/comprehensive?tier=premium')}
                className={`min-h-10 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  reportTier === 'premium'
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                프리미엄
              </button>
            </div>
          }
        />

        <main className="mx-auto grid max-w-5xl gap-6 px-4 pb-20 lg:grid-cols-[1fr_1fr]">
          <ReportSurfaceSection
            title="포함 내용"
            tone={reportTier === 'premium' ? 'amber' : 'emerald'}
          >
            <ul className="space-y-2">
              {FEATURES.map((feature) => (
                <li key={feature} className="text-sm text-slate-200">
                  • {feature}
                </li>
              ))}
            </ul>
          </ReportSurfaceSection>

          <ReportBuilderActionPanel
            accent={reportTier === 'premium' ? 'amber' : 'emerald'}
            initialName={profile.name}
            onProfileSubmit={setProfileInput}
            actionLabel={
              isGenerating
                ? '리포트 생성 중...'
                : reportTier === 'premium'
                  ? '프리미엄 종합 리포트 생성'
                  : '무료 요약 리포트 생성'
            }
            onAction={handleGenerate}
            disabled={!canGenerate}
            error={error}
            helperText={
              reportTier === 'premium'
                ? '프리미엄 리포트는 My Journey에서 다시 확인할 수 있습니다.'
                : '무료 요약은 세션 기준으로만 유지되며 저장되지 않습니다.'
            }
          >
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-200">
              <p className="font-medium text-white">
                {reportTier === 'premium' ? '심화 해석 모드' : '빠른 요약 모드'}
              </p>
              <p className="mt-2 leading-6 text-slate-300">
                {reportTier === 'premium'
                  ? '인물 구조, 현재 활성 상태, 핵심 분기, 적용 가이드와 PDF까지 한 번에 생성합니다.'
                  : '핵심 구조, 현재 흐름, 상위 포커스 영역과 다음 단계를 짧고 선명하게 정리합니다.'}
              </p>
            </div>

            {freeReport && (
              <section className="rounded-3xl border border-emerald-300/30 bg-gradient-to-br from-emerald-500/12 to-teal-500/8 p-5 text-sm text-emerald-50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-200/80">
                      Free Digest
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-emerald-50">
                      {freeReport.headline}
                    </h3>
                  </div>
                  <div className="rounded-2xl border border-emerald-200/30 bg-emerald-950/35 px-4 py-3 text-right">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-200/70">
                      Score
                    </p>
                    <p className="mt-1 text-2xl font-black text-emerald-50">
                      {freeReport.overallScore}점
                    </p>
                    <p className="text-xs text-emerald-100/80">등급 {freeReport.grade}</p>
                  </div>
                </div>

                <ReportSummarySection
                  summary={freeReport.summary}
                  tone="emerald"
                  className="mt-4 border-0 p-0 bg-transparent backdrop-blur-0"
                />

                {freeReport.personModel && (
                  <PersonModelOverview
                    personModel={freeReport.personModel}
                    variant="digest"
                    className="mt-5"
                  />
                )}

                <ReportFocusGridSection
                  title="포커스 영역"
                  tone="emerald"
                  className="mt-5"
                  items={(freeReport.focusAreas || []).slice(0, 4)}
                />

                <ReportInsightCards
                  title="핵심 인사이트"
                  tone="emerald"
                  className="mt-5"
                  items={(freeReport.topInsights || []).map((item) => ({
                    title: item.title,
                    body: item.reason,
                    footer: `Next · ${item.action}`,
                  }))}
                />

                {(freeReport.caution && freeReport.caution.length > 0) ||
                (freeReport.nextSteps && freeReport.nextSteps.length > 0) ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <ReportBulletListSection
                      title="주의 포인트"
                      tone="amber"
                      items={(freeReport.caution || []).slice(0, 4)}
                      className="h-full"
                    />

                    <ReportBulletListSection
                      title="다음 단계"
                      tone="emerald"
                      items={freeReport.nextSteps || []}
                      className="h-full"
                    />
                  </div>
                ) : null}
              </section>
            )}
          </ReportBuilderActionPanel>
        </main>
      </PremiumPageScaffold>
    </>
  )
}
