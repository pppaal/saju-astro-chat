'use client'

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DateTimePicker from '@/components/ui/DateTimePicker'
import { analytics } from '@/components/analytics/GoogleAnalytics'
import UnifiedServiceLoading from '@/components/ui/UnifiedServiceLoading'
import { useUserProfile } from '@/hooks/useUserProfile'
import PremiumPageScaffold from '@/app/premium-reports/_components/PremiumPageScaffold'
import {
  ReportProfileForm,
  type ReportProfileInput,
} from '@/app/premium-reports/_components/ReportProfileForm'
import { savePremiumReportSnapshot } from '@/lib/premium-reports/reportSnapshot'
import { REPORT_CREDIT_COSTS } from '@/lib/destiny-matrix/ai-report'

interface SajuData {
  dayMasterElement: string
}

type PeriodType = 'daily' | 'monthly' | 'yearly'

type ReportTier = 'free' | 'premium'

const PERIOD_INFO: Record<
  PeriodType,
  {
    label: string
    description: string
    credits: number
    color: string
  }
> = {
  daily: {
    label: '?? ??? ???',
    description: '??? ??? ?? ??? ?? ???? ?????.',
    credits: REPORT_CREDIT_COSTS.daily,
    color: 'from-yellow-500 to-orange-500',
  },
  monthly: {
    label: '?? ??? ???',
    description: '??? ?? ?? ??? ??? ?????.',
    credits: REPORT_CREDIT_COSTS.monthly,
    color: 'from-blue-500 to-cyan-500',
  },
  yearly: {
    label: '?? ??? ???',
    description: '?? ??? ??? ??? ???? ?????.',
    credits: REPORT_CREDIT_COSTS.yearly,
    color: 'from-purple-500 to-pink-500',
  },
}

function toPeriod(value: string | null): PeriodType {
  if (value === 'monthly' || value === 'yearly') {
    return value
  }
  return 'daily'
}

function toTier(value: string | null): ReportTier {
  return value === 'free' ? 'free' : 'premium'
}

function TimingReportContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const redirectedRef = useRef(false)
  const { profile, isLoading: profileLoading } = useUserProfile()

  const period = toPeriod(searchParams?.get('period') ?? null)
  const reportTier = toTier(searchParams?.get('tier') ?? null)
  const periodInfo = PERIOD_INFO[period]

  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [profileInput, setProfileInput] = useState<ReportProfileInput | null>(null)
  const [sajuData, setSajuData] = useState<SajuData | null>(null)
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

  useEffect(() => {
    if (!profile.birthDate || profileInput) {
      return
    }

    setProfileInput({
      name: profile.name || '???',
      birthDate: profile.birthDate,
      birthTime: profile.birthTime || '12:00',
      birthCity: profile.birthCity,
      gender: profile.gender === 'Female' ? 'F' : profile.gender === 'Male' ? 'M' : undefined,
      timezone: profile.timezone,
      latitude: profile.latitude,
      longitude: profile.longitude,
    })
  }, [profile, profileInput])

  const loadSajuData = useCallback(async () => {
    if (status !== 'authenticated') {
      return
    }

    setSajuLoading(true)
    try {
      const response = await fetch('/api/me/saju')
      const data = await response.json()
      if (data.success && data.hasSaju) {
        setSajuData(data.saju)
      }
    } catch {
      // ignore and use fallback
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
      setError('???? ??? ?? ??????.')
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
          name: profileInput?.name || profile.name || '???',
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
        throw new Error(data.error?.message || '??? ??? ??????.')
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
      setError(err instanceof Error ? err.message : '? ? ?? ??? ??????.')
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
        <header className="px-4 py-10">
          <div className="mx-auto max-w-5xl">
            <Link
              href="/premium-reports"
              className="inline-flex items-center rounded-full border border-white/15 bg-slate-900/60 px-3 py-1 text-sm text-slate-300 backdrop-blur-xl hover:border-cyan-300/60 hover:text-white"
            >
              ??? ???? ????
            </Link>
            <div className="mt-5 rounded-3xl border border-white/15 bg-slate-900/60 p-7 backdrop-blur-xl">
              <div className="inline-flex rounded-full border border-cyan-300/40 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                Timing
              </div>
              <h1 className="mt-3 text-3xl font-black text-white">{periodInfo.label}</h1>
              <p className="mt-2 text-sm text-slate-200">{periodInfo.description}</p>
              <p className="mt-3 text-xs font-semibold text-cyan-200">
                {periodInfo.credits} credits ? Premium ??
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto grid max-w-5xl gap-6 px-4 pb-20 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-white">?? ??</h2>
            <div className="mt-4">
              <DateTimePicker
                value={targetDate}
                onChange={setTargetDate}
                label=""
                locale="ko"
                minDate="1900-01-01"
                maxDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .slice(0, 10)}
              />
            </div>
            <p className="mt-3 text-sm text-slate-300">
              {period === 'daily' && '??? ?? ???? ?? ??? ?????.'}
              {period === 'monthly' && '??? ??? ??? ?? ??? ?????.'}
              {period === 'yearly' && '??? ??? ??? ??? ??? ?????.'}
            </p>

            <div className="mt-4 rounded-xl border border-white/15 bg-slate-950/40 p-3 text-xs text-slate-300">
              ?? ??? ?? ????? ?????.
              <button
                onClick={() => router.push('/premium-reports/comprehensive?tier=free')}
                className="ml-2 font-semibold text-emerald-300 hover:text-emerald-200"
              >
                ?? ?? ??
              </button>
            </div>
          </section>

          <section className="space-y-4 rounded-3xl border border-white/15 bg-slate-900/55 p-5 backdrop-blur-xl">
            <ReportProfileForm locale="ko" initialName={profile.name} onSubmit={setProfileInput} />

            {error && (
              <div className="rounded-xl border border-red-500/60 bg-red-500/15 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={`w-full rounded-xl px-4 py-4 text-sm font-semibold text-white transition ${
                canGenerate
                  ? `bg-gradient-to-r ${periodInfo.color} hover:brightness-110`
                  : 'cursor-not-allowed bg-slate-700'
              }`}
            >
              {isGenerating ? '??? ?? ?...' : `${periodInfo.label} ????`}
            </button>
          </section>
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
