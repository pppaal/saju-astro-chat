'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DateTimePicker from '@/components/ui/DateTimePicker'
import { analytics } from '@/components/analytics/GoogleAnalytics'
import UnifiedServiceLoading from '@/components/ui/UnifiedServiceLoading'
import { useUserProfile } from '@/hooks/useUserProfile'
import {
  PremiumPageScaffold,
  ReportBuilderActionPanel,
  ReportBuilderHero,
  ReportSurfaceSection,
} from '@/app/premium-reports/_components'
import {
  fetchPremiumSajuData,
  type PeriodType,
  type PremiumSajuData,
  toPeriodType,
  toReportTier,
} from '@/app/premium-reports/_lib/shared'
import { usePremiumReportProfile } from '@/app/premium-reports/_lib/usePremiumReportProfile'
import { savePremiumReportSnapshot } from '@/lib/premium-reports/reportSnapshot'
import { REPORT_CREDIT_COSTS } from '@/lib/destiny-matrix/ai-report'

const PERIOD_INFO: Record<
  PeriodType,
  {
    label: string
    description: string
    credits: number
    color: string
    note: string
  }
> = {
  daily: {
    label: '일간 타이밍 분석',
    description: '하루 단위로 집중과 주의 구간을 정밀하게 점검합니다.',
    credits: REPORT_CREDIT_COSTS.daily,
    color: 'from-yellow-500 to-orange-500',
    note: '선택한 날짜의 집중 포인트와 주의 신호를 짧고 선명하게 정리합니다.',
  },
  monthly: {
    label: '월간 타이밍 분석',
    description: '한 달의 흐름과 전환 포인트를 입체적으로 읽습니다.',
    credits: REPORT_CREDIT_COSTS.monthly,
    color: 'from-blue-500 to-cyan-500',
    note: '선택한 달의 상승 구간, 조정 구간, 실전 타이밍을 한 번에 정리합니다.',
  },
  yearly: {
    label: '연간 타이밍 분석',
    description: '연간 핵심 구간과 변곡점을 길게 조망합니다.',
    credits: REPORT_CREDIT_COSTS.yearly,
    color: 'from-purple-500 to-pink-500',
    note: '선택한 해의 큰 방향, 전환 시점, 밀어야 할 창을 중심으로 정리합니다.',
  },
}

function TimingReportContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const redirectedRef = useRef(false)
  const { profile, isLoading: profileLoading } = useUserProfile()

  const period = toPeriodType(searchParams?.get('period') ?? null)
  const reportTier = toReportTier(searchParams?.get('tier') ?? null)
  const periodInfo = PERIOD_INFO[period]

  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().slice(0, 10))
  const { profileInput, setProfileInput } = usePremiumReportProfile(profile)
  const [sajuData, setSajuData] = useState<PremiumSajuData | null>(null)
  const [sajuLoading, setSajuLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated' && !redirectedRef.current) {
      redirectedRef.current = true
      router.push(`/auth/signin?callbackUrl=/premium-reports/timing?period=${period}`)
    }
    if (status === 'authenticated') {
      redirectedRef.current = false
    }
  }, [status, router, period])

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
    () =>
      Boolean(
        (profileInput?.birthDate || profile.birthDate) && !isGenerating && reportTier === 'premium'
      ),
    [profileInput?.birthDate, profile.birthDate, isGenerating, reportTier]
  )

  const handleGenerate = async () => {
    if (reportTier !== 'premium') {
      router.push('/premium-reports/comprehensive?tier=free')
      return
    }

    const finalBirthDate = profileInput?.birthDate || profile.birthDate
    if (!finalBirthDate) {
      setError('생년월일 정보를 확인해 주세요.')
      return
    }

    setError(null)
    setIsGenerating(true)

    try {
      const response = await fetch('/api/destiny-matrix/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportTier: 'premium',
          period,
          targetDate,
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
          reportType: 'timing',
          period,
          createdAt: new Date().toISOString(),
          report: data.report,
        })
      }

      analytics.matrixGenerate('premium-reports/timing')
      router.push(`/premium-reports/result/${data.report.id}?type=timing`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청 처리 중 오류가 발생했습니다.')
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
      <PremiumPageScaffold accent="cyan">
        <ReportBuilderHero
          accent="cyan"
          badge="Timing Report"
          title={periodInfo.label}
          description={periodInfo.description}
          meta={`${periodInfo.credits} credits · Premium 전용`}
        />

        <main className="mx-auto grid max-w-5xl gap-6 px-4 pb-20 lg:grid-cols-[1fr_1fr]">
          <ReportSurfaceSection title="분석 시점" eyebrow="Timing Window" tone="cyan">
            <DateTimePicker
              value={targetDate}
              onChange={setTargetDate}
              label=""
              locale="ko"
              minDate="1900-01-01"
              maxDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
            />
            <p className="mt-4 text-sm leading-6 text-slate-300">{periodInfo.note}</p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
              무료 버전은 종합 요약까지만 제공합니다.
              <button
                onClick={() => router.push('/premium-reports/comprehensive?tier=free')}
                className="ml-2 font-semibold text-emerald-300 transition hover:text-emerald-200"
              >
                무료 요약 보기
              </button>
            </div>
          </ReportSurfaceSection>

          <ReportBuilderActionPanel
            accent="cyan"
            initialName={profile.name}
            onProfileSubmit={setProfileInput}
            actionLabel={isGenerating ? '리포트 생성 중...' : `${periodInfo.label} 생성`}
            onAction={handleGenerate}
            disabled={!canGenerate}
            error={error}
            helperText="생성 후 My Journey에서 다시 확인할 수 있습니다."
          >
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-200">
              <p className="font-medium text-white">선택된 시점 · {targetDate}</p>
              <p className="mt-2 leading-6 text-slate-300">{periodInfo.note}</p>
            </div>
          </ReportBuilderActionPanel>
        </main>
      </PremiumPageScaffold>
    </>
  )
}

export default function TimingReportPage() {
  return (
    <Suspense fallback={<UnifiedServiceLoading kind="aiReport" locale="ko" />}>
      <TimingReportContent />
    </Suspense>
  )
}
