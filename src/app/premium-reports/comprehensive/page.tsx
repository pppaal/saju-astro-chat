'use client'

/**
 * 인생 총운 (Premium Comprehensive) — 6 영역 통합 깊이 분석.
 * 무료는 /destiny-map으로 분리됨 (이 페이지는 premium 전용).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { analytics } from '@/components/analytics/GoogleAnalytics'
import { useUserProfile } from '@/hooks/useUserProfile'
import UnifiedServiceLoading from '@/components/ui/UnifiedServiceLoading'
import {
  ReportBuilderActionPanel,
  ReportSurfaceSection,
  type ReportProfileInput,
} from '@/app/premium-reports/_components'
import {
  buildQueryReportProfileInput,
  fetchPremiumSajuData,
  type PremiumSajuData,
} from '@/app/premium-reports/_lib/shared'
import { usePremiumReportProfile } from '@/app/premium-reports/_lib/usePremiumReportProfile'
import { savePremiumReportSnapshot } from '@/lib/premium-reports/reportSnapshot'
import { REPORT_CREDIT_COSTS } from '@/lib/destiny-matrix/ai-report'

const FEATURES = [
  '연애·커리어·재물·건강·가족·이동 6 영역 통합',
  '24,000자 long-form 깊이 분석',
  '5행 도넛 + 합의 강도 + cross map 시각',
  'Tier 1-4 KB (격국·신살·60갑자·소행성·용신)',
  '본인 사주·점성 기반 personalized',
  'PDF 내보내기 가능',
]

export default function ComprehensiveReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const redirectedRef = useRef(false)
  const { profile, isLoading: profileLoading } = useUserProfile()

  // tier=free 흔적 진입 시 → /destiny-map으로 redirect (URL 보존)
  useEffect(() => {
    if (searchParams?.get('tier') === 'free') {
      router.replace('/destiny-map')
    }
  }, [searchParams, router])

  const queryProfileInput = useMemo<ReportProfileInput | null>(
    () => buildQueryReportProfileInput(searchParams, profile),
    [profile, searchParams]
  )
  const { profileInput, setProfileInput } = usePremiumReportProfile(profile, queryProfileInput)

  const [sajuData, setSajuData] = useState<PremiumSajuData | null>(null)
  const [sajuLoading, setSajuLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated' && !redirectedRef.current) {
      redirectedRef.current = true
      router.push('/auth/signin?callbackUrl=/premium-reports/comprehensive')
    }
    if (status === 'authenticated') {
      redirectedRef.current = false
    }
  }, [router, status])

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
    analytics.premiumReportStart('comprehensive')

    try {
      const response = await fetch('/api/destiny-matrix/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportTier: 'premium',
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
          detailLevel: 'comprehensive',
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
      const raw = err instanceof Error ? err.message : ''
      const looksKorean = /[가-힣]/.test(raw)
      setError(looksKorean ? raw : 'AI 리포트 생성 중 일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (status === 'loading' || profileLoading || sajuLoading) {
    return <UnifiedServiceLoading kind="aiReport" locale="ko" />
  }

  return (
    <>
      {isGenerating && (
        <div className="fixed inset-0 z-[120]">
          <UnifiedServiceLoading kind="aiReport" locale="ko" />
        </div>
      )}
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#1a1c2e_0%,#0a0a14_60%)] text-slate-100">
        <div className="mx-auto max-w-5xl px-6 pb-20 pt-16 sm:pt-24">
          {/* Apple-tier Hero */}
          <header className="space-y-5 text-center">
            <div className="flex justify-center">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em]"
                style={{
                  borderColor: 'rgba(251,191,36,0.4)',
                  color: '#fbbf24',
                  background: 'rgba(251,191,36,0.12)',
                }}
              >
                Premium · 인생 총운
              </span>
            </div>
            <h1
              className="text-balance bg-[linear-gradient(135deg,#fff_0%,#a89fcf_100%)] bg-clip-text text-4xl font-semibold leading-[1.1] text-transparent md:text-5xl"
              style={{ letterSpacing: '-0.025em', wordBreak: 'keep-all' }}
            >
              연애·커리어·재물·건강·가족·이동까지 한 번에
            </h1>
            <p className="mx-auto max-w-xl text-[15px] leading-relaxed text-slate-400">
              6 영역 통합 인생 전반 분석 · 24,000자 long-form · 5행 도넛/합의 강도/cross map 시각
            </p>

            {/* 무료 옵션 안내 */}
            <p className="mx-auto mt-4 text-[12px] text-slate-500">
              가볍게 먼저 보고 싶으세요?{' '}
              <button
                onClick={() => router.push('/destiny-map')}
                className="font-medium text-cyan-300 underline-offset-2 hover:underline"
              >
                무료 운명 지도로 시작
              </button>
            </p>
          </header>

          <main className="mt-12 grid gap-5 lg:grid-cols-[1fr_1fr]">
            <ReportSurfaceSection title="포함 내용" tone="amber">
              <ul className="space-y-2.5">
                {FEATURES.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-[14px] leading-[1.6] text-slate-300"
                  >
                    <span
                      className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full"
                      style={{ background: '#fbbf24' }}
                      aria-hidden
                    />
                    <span style={{ wordBreak: 'keep-all' }}>{feature}</span>
                  </li>
                ))}
              </ul>
            </ReportSurfaceSection>

            <ReportBuilderActionPanel
              accent="amber"
              initialName={profile.name}
              onProfileSubmit={setProfileInput}
              actionLabel={
                isGenerating
                  ? '리포트 생성 중...'
                  : `인생총운 생성 (${REPORT_CREDIT_COSTS.comprehensive} credits)`
              }
              onAction={handleGenerate}
              disabled={!canGenerate}
              error={error}
              helperText="생성 후 My Journey에서 다시 확인할 수 있습니다."
            >
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-200">
                <p className="font-medium text-white">심화 해석 모드</p>
                <p className="mt-2 leading-6 text-slate-300" style={{ wordBreak: 'keep-all' }}>
                  인물 구조, 현재 활성 상태, 핵심 분기, 적용 가이드와 PDF까지 한 번에 생성합니다.
                </p>
              </div>
            </ReportBuilderActionPanel>
          </main>
        </div>
      </div>
    </>
  )
}
