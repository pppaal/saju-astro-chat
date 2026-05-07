'use client'

/**
 * 올해 운세 (Premium Yearly) — 현재 연도 자동 분석.
 * 사용자는 별도로 연도를 고르지 않고, 항상 "올해"를 받습니다.
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
  '현재 연도 자동 분석 (선택 불필요)',
  '월별 핵심 흐름 12개월',
  '연 전체 분기·변곡점 매핑',
  '4 영역 종합 점수 (연애·커리어·재물·건강)',
  '결정적 타이밍 캘린더',
  '본인 사주·점성 기반 personalized',
]

export default function YearlyReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const redirectedRef = useRef(false)
  const { profile, isLoading: profileLoading } = useUserProfile()

  // 올해 1월 1일을 targetDate로 — period='yearly'와 함께 보내면 그 해의 리포트가 생성됨
  const todayIso = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-01-01`
  }, [])
  const yearLabel = useMemo(() => `${new Date().getFullYear()}년`, [])

  useEffect(() => {
    if (searchParams?.get('tier') === 'free') {
      router.replace('/destiny-map/theme')
    }
  }, [searchParams, router])

  const queryProfileInput = useMemo<ReportProfileInput | null>(
    () => buildQueryReportProfileInput(searchParams, profile),
    [profile, searchParams]
  )
  const { profileInput, setProfileInput } = usePremiumReportProfile(profile, queryProfileInput, profileLoading)

  const [sajuData, setSajuData] = useState<PremiumSajuData | null>(null)
  const [sajuLoading, setSajuLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated' && !redirectedRef.current) {
      redirectedRef.current = true
      router.push('/auth/signin?callbackUrl=/premium-reports/yearly')
    }
    if (status === 'authenticated') {
      redirectedRef.current = false
    }
  }, [router, status])

  const loadSajuData = useCallback(async () => {
    if (status !== 'authenticated') return
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
    analytics.premiumReportStart('yearly')

    try {
      const response = await fetch('/api/destiny-matrix/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportTier: 'premium',
          period: 'yearly',
          targetDate: todayIso,
          ...(sajuData?.dayMasterElement ? { dayMasterElement: sajuData.dayMasterElement } : {}),
          name: profileInput?.name || profile.name || '사용자',
          birthDate: finalBirthDate,
          birthTime: profileInput?.birthTime || profile.birthTime || undefined,
          timezone: profileInput?.timezone || profile.timezone || undefined,
          birthCity: profileInput?.birthCity || profile.birthCity || undefined,
          gender: profileInput?.gender || undefined,
          latitude: profileInput?.latitude ?? profile.latitude ?? undefined,
          longitude: profileInput?.longitude ?? profile.longitude ?? undefined,
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
          reportType: 'yearly',
          period: 'yearly',
          createdAt: new Date().toISOString(),
          report: data.report,
        })
      }

      analytics.matrixGenerate('premium-reports/yearly')
      router.push(`/premium-reports/result/${data.report.id}?type=yearly`)
    } catch (err) {
      const raw = err instanceof Error ? err.message : ''
      const looksKorean = /[가-힣]/.test(raw)
      setError(
        looksKorean
          ? raw
          : 'AI 리포트 생성 중 일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.'
      )
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
          <header className="space-y-5 text-center">
            <div className="flex justify-center">
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em]"
                style={{
                  borderColor: 'rgba(167,139,250,0.4)',
                  color: '#a78bfa',
                  background: 'rgba(167,139,250,0.12)',
                }}
              >
                Premium · Yearly
              </span>
            </div>
            <h1
              className="text-balance bg-[linear-gradient(135deg,#fff_0%,#a89fcf_100%)] bg-clip-text text-4xl font-semibold leading-[1.1] text-transparent md:text-5xl"
              style={{ letterSpacing: '-0.025em', wordBreak: 'keep-all' }}
            >
              {yearLabel} 한 해의 흐름과 변곡점
            </h1>
            <p className="mx-auto max-w-xl text-[15px] leading-relaxed text-slate-400">
              올해 자동 분석 · 월별 12개 흐름 · 분기·변곡점 · 결정적 타이밍 캘린더
            </p>
            <p className="mx-auto mt-4 text-[12px] text-slate-500">
              가볍게 먼저 보고 싶으세요?{' '}
              <button
                onClick={() => router.push('/destiny-map/theme')}
                className="font-medium text-cyan-300 underline-offset-2 hover:underline"
              >
                무료 인사이트로 시작
              </button>
            </p>
          </header>

          <main className="mt-12 grid gap-5 lg:grid-cols-[1fr_1fr]">
            <ReportSurfaceSection title="포함 내용" tone="emerald">
              <ul className="space-y-2.5">
                {FEATURES.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-[14px] leading-[1.6] text-slate-300"
                  >
                    <span
                      className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full"
                      style={{ background: '#a78bfa' }}
                      aria-hidden
                    />
                    <span style={{ wordBreak: 'keep-all' }}>{feature}</span>
                  </li>
                ))}
              </ul>
            </ReportSurfaceSection>

            <ReportBuilderActionPanel
              accent="violet"
              initialName={profile.name}
              onProfileSubmit={setProfileInput}
              actionLabel={
                isGenerating
                  ? '리포트 생성 중...'
                  : `${yearLabel} 운세 생성 (${REPORT_CREDIT_COSTS.yearly} credits)`
              }
              onAction={handleGenerate}
              disabled={!canGenerate}
              error={error}
              helperText={`${yearLabel} 기준으로 자동 분석됩니다.`}
              hasProfile={Boolean(profileInput?.birthDate || profile.birthDate)}
              profileSummary={
                (profileInput?.birthDate || profile.birthDate)
                  ? `${profileInput?.birthDate || profile.birthDate}${
                      (profileInput?.birthTime || profile.birthTime)
                        ? ` · ${profileInput?.birthTime || profile.birthTime}`
                        : ''
                    }${
                      (profileInput?.birthCity || profile.birthCity)
                        ? ` · ${profileInput?.birthCity || profile.birthCity}`
                        : ''
                    }`
                  : undefined
              }
            >
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-200">
                <p className="font-medium text-white">올해 자동 적용</p>
                <p className="mt-2 leading-6 text-slate-300" style={{ wordBreak: 'keep-all' }}>
                  현재 연도({yearLabel}) 기준으로 사주 세운(歲運)·점성 행성 트랜짓을 결합해
                  월별 흐름과 한 해의 변곡점·결정적 타이밍을 풀어드립니다.
                </p>
              </div>
            </ReportBuilderActionPanel>
          </main>
        </div>
      </div>
    </>
  )
}
