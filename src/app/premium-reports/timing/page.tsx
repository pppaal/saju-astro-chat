'use client'

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import DateTimePicker from '@/components/ui/DateTimePicker'
import { analytics } from '@/components/analytics/GoogleAnalytics'
import { useUserProfile } from '@/hooks/useUserProfile'
import {
  ReportProfileForm,
  type ReportProfileInput,
} from '@/app/premium-reports/_components/ReportProfileForm'

interface SajuData {
  dayMasterElement: string
}

type PeriodType = 'daily' | 'monthly' | 'yearly'

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
    label: '일간 타이밍 리포트',
    description: '선택한 날짜의 핵심 흐름과 행동 포인트를 제안합니다.',
    credits: 1,
    color: 'from-yellow-500 to-orange-500',
  },
  monthly: {
    label: '월간 타이밍 리포트',
    description: '선택한 달의 주요 이벤트 흐름을 정리합니다.',
    credits: 2,
    color: 'from-blue-500 to-cyan-500',
  },
  yearly: {
    label: '연간 타이밍 리포트',
    description: '해당 연도의 흐름과 분기별 포인트를 안내합니다.',
    credits: 3,
    color: 'from-purple-500 to-pink-500',
  },
}

function toPeriod(value: string | null): PeriodType {
  if (value === 'monthly' || value === 'yearly') {
    return value
  }
  return 'daily'
}

function TimingReportContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const { profile, isLoading: profileLoading } = useUserProfile()

  const period = toPeriod(searchParams?.get('period') ?? null)
  const periodInfo = PERIOD_INFO[period]

  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [profileInput, setProfileInput] = useState<ReportProfileInput | null>(null)
  const [sajuData, setSajuData] = useState<SajuData | null>(null)
  const [sajuLoading, setSajuLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=/premium-reports/timing?period=${period}`)
    }
  }, [status, router, period])

  useEffect(() => {
    if (!profile.birthDate || profileInput) {
      return
    }

    setProfileInput({
      name: profile.name || '사용자',
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
    () => Boolean((profileInput?.birthDate || profile.birthDate) && !isGenerating),
    [profileInput?.birthDate, profile.birthDate, isGenerating]
  )

  const handleGenerate = async () => {
    const finalBirthDate = profileInput?.birthDate || profile.birthDate
    if (!finalBirthDate) {
      setError('생년월일 정보를 먼저 저장해주세요.')
      return
    }

    setError(null)
    setIsGenerating(true)

    try {
      const response = await fetch('/api/destiny-matrix/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period,
          targetDate,
          dayMasterElement: sajuData?.dayMasterElement || '목',
          name: profileInput?.name || profile.name || '사용자',
          birthDate: finalBirthDate,
          birthTime: profileInput?.birthTime || profile.birthTime || undefined,
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

      analytics.matrixGenerate('premium-reports/timing')
      router.push(`/premium-reports/result/${data.report.id}?type=timing`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (status === 'loading' || profileLoading || sajuLoading) {
    return (
      <div className="flex min-h-[100svh] items-center justify-center bg-slate-950">
        <div className="text-slate-200">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="min-h-[100svh] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <header className="px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/premium-reports"
            className="inline-flex items-center text-sm text-slate-400 hover:text-slate-100"
          >
            ← 리포트 선택으로 돌아가기
          </Link>
          <div className={`mt-4 rounded-2xl bg-gradient-to-r ${periodInfo.color} p-6`}>
            <h1 className="text-2xl font-bold text-white">{periodInfo.label}</h1>
            <p className="mt-2 text-sm text-white/90">{periodInfo.description}</p>
            <p className="mt-2 text-xs text-white/80">{periodInfo.credits} credits</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-4 pb-20 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-6">
          <h2 className="text-lg font-semibold text-white">기준 날짜</h2>
          <div className="mt-4">
            <DateTimePicker
              value={targetDate}
              onChange={setTargetDate}
              label=""
              locale="ko"
              minDate="1900-01-01"
              maxDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}
            />
          </div>
          <p className="mt-3 text-sm text-slate-300">
            {period === 'daily' && '선택한 날짜 기준으로 당일 흐름을 분석합니다.'}
            {period === 'monthly' && '선택한 날짜가 포함된 달의 흐름을 분석합니다.'}
            {period === 'yearly' && '선택한 날짜가 포함된 연도의 흐름을 분석합니다.'}
          </p>
        </section>

        <section className="space-y-4">
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
                ? `bg-gradient-to-r ${periodInfo.color} hover:opacity-90`
                : 'cursor-not-allowed bg-slate-700'
            }`}
          >
            {isGenerating ? '리포트 생성 중...' : `${periodInfo.label} 생성하기`}
          </button>
        </section>
      </main>
    </div>
  )
}

export default function TimingReportPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100svh] items-center justify-center bg-slate-950">
          <div className="text-slate-200">로딩 중...</div>
        </div>
      }
    >
      <TimingReportContent />
    </Suspense>
  )
}
