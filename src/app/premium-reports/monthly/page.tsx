'use client'

/**
 * 이번달 운세 (Premium Monthly) — 현재 달 자동 분석.
 * 사용자는 별도로 달을 고르지 않고, 항상 "지금 이 달"을 받습니다.
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
  '현재 달 자동 분석 (선택 불필요)',
  '주차별 흐름 + 결정적 일자',
  '연애·커리어·재물·건강 4 영역',
  '이달의 기회·주의 시기 매핑',
  '실천 가이드 + 행운 메타데이터',
  '본인 사주·점성 기반 personalized',
]

function formatMonthLabel(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`
}

export default function MonthlyReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const redirectedRef = useRef(false)
  const { profile, isLoading: profileLoading } = useUserProfile()

  // 현재 달의 1일을 targetDate로 사용 — period='monthly'와 함께 보내면 그 달의 리포트가 생성됨
  const todayIso = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  }, [])
  const monthLabel = useMemo(() => formatMonthLabel(new Date()), [])

  useEffect(() => {
    if (searchParams?.get('tier') === 'free') {
      router.replace('/destiny-map/theme')
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
      router.push('/auth/signin?callbackUrl=/premium-reports/monthly')
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
    analytics.premiumReportStart('monthly')

    try {
      const response = await fetch('/api/destiny-matrix/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportTier: 'premium',
          period: 'monthly',
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
          reportType: 'monthly',
          period: 'monthly',
          createdAt: new Date().toISOString(),
          report: data.report,
        })
      }

      analytics.matrixGenerate('premium-reports/monthly')
      router.push(`/premium-reports/result/${data.report.id}?type=monthly`)
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
                  borderColor: 'rgba(96,165,250,0.4)',
                  color: '#60a5fa',
                  background: 'rgba(96,165,250,0.12)',
                }}
              >
                Premium · Monthly
              </span>
            </div>
            <h1
              className="text-balance bg-[linear-gradient(135deg,#fff_0%,#a89fcf_100%)] bg-clip-text text-4xl font-semibold leading-[1.1] text-transparent md:text-5xl"
              style={{ letterSpacing: '-0.025em', wordBreak: 'keep-all' }}
            >
              {monthLabel}의 흐름과 타이밍
            </h1>
            <p className="mx-auto max-w-xl text-[15px] leading-relaxed text-slate-400">
              현재 달 자동 분석 · 주차별 흐름 · 결정적 일자 · 실천 가이드
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
            <ReportSurfaceSection title="포함 내용" tone="cyan">
              <ul className="space-y-2.5">
                {FEATURES.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-[14px] leading-[1.6] text-slate-300"
                  >
                    <span
                      className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full"
                      style={{ background: '#60a5fa' }}
                      aria-hidden
                    />
                    <span style={{ wordBreak: 'keep-all' }}>{feature}</span>
                  </li>
                ))}
              </ul>
            </ReportSurfaceSection>

            <ReportBuilderActionPanel
              accent="cyan"
              initialName={profile.name}
              onProfileSubmit={setProfileInput}
              actionLabel={
                isGenerating
                  ? '리포트 생성 중...'
                  : `${monthLabel} 운세 생성 (${REPORT_CREDIT_COSTS.monthly} credits)`
              }
              onAction={handleGenerate}
              disabled={!canGenerate}
              error={error}
              helperText={`${monthLabel} 기준으로 자동 분석됩니다.`}
            >
              <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-200">
                <p className="font-medium text-white">이번 달 자동 적용</p>
                <p className="mt-2 leading-6 text-slate-300" style={{ wordBreak: 'keep-all' }}>
                  현재 달({monthLabel}) 기준으로 사주 월운(月運)·점성 트랜짓을 결합해 주차별
                  흐름과 결정적 타이밍을 풀어드립니다.
                </p>
              </div>
            </ReportBuilderActionPanel>
          </main>
        </div>
      </div>
    </>
  )
}
