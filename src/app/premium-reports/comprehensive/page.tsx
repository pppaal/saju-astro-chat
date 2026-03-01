'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { analytics } from '@/components/analytics/GoogleAnalytics'
import { useUserProfile } from '@/hooks/useUserProfile'
import UnifiedServiceLoading from '@/components/ui/UnifiedServiceLoading'
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

type ReportTier = 'free' | 'premium'

interface FreeDigestReport {
  tier: 'free'
  headline: string
  summary: string
  overallScore: number
  grade: string
  topInsights?: Array<{ title: string; reason: string; action: string }>
  focusAreas?: Array<{ domain: string; score: number; summary: string }>
  caution?: string[]
  nextSteps?: string[]
}

const FEATURES = [
  '사주·점성 통합 성향 분석',
  '대운/세운 기반 타이밍 분석',
  '연애/커리어/재무/건강 요약',
  '강점·주의점·실행전략 제안',
  '교차 근거 기반 해석 흐름',
  '실행 가능한 체크리스트 제공',
]

function toTier(value: string | null): ReportTier {
  return value === 'free' ? 'free' : 'premium'
}

export default function ComprehensiveReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const redirectedRef = useRef(false)
  const { profile, isLoading: profileLoading } = useUserProfile()

  const reportTier = toTier(searchParams?.get('tier') ?? null)
  const queryProfileInput = useMemo<ReportProfileInput | null>(() => {
    const birthDate = searchParams?.get('birthDate') || ''
    if (!birthDate) return null

    const name = searchParams?.get('name') || profile.name || '사용자'
    const birthTime = searchParams?.get('birthTime') || profile.birthTime || '12:00'
    const birthCity = searchParams?.get('birthCity') || profile.birthCity || undefined
    const timezone = searchParams?.get('timezone') || profile.timezone || 'Asia/Seoul'
    const genderParam = searchParams?.get('gender')
    const latitudeParam = searchParams?.get('lat')
    const longitudeParam = searchParams?.get('lon')

    const latitude = latitudeParam ? Number(latitudeParam) : profile.latitude
    const longitude = longitudeParam ? Number(longitudeParam) : profile.longitude
    const gender =
      genderParam === 'F' || genderParam === 'Female'
        ? 'F'
        : genderParam === 'M' || genderParam === 'Male'
          ? 'M'
          : profile.gender === 'Female'
            ? 'F'
            : profile.gender === 'Male'
              ? 'M'
              : undefined

    return {
      name,
      birthDate,
      birthTime,
      birthCity,
      gender,
      timezone,
      latitude: Number.isFinite(latitude as number) ? (latitude as number) : undefined,
      longitude: Number.isFinite(longitude as number) ? (longitude as number) : undefined,
    }
  }, [profile, searchParams])

  const { profileInput, setProfileInput } = useReportProfileState(profile, queryProfileInput)

  const [sajuData, setSajuData] = useState<SajuData | null>(null)
  const [sajuLoading, setSajuLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [freeReport, setFreeReport] = useState<FreeDigestReport | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated' && !redirectedRef.current) {
      redirectedRef.current = true
      router.push('/auth/signin?callbackUrl=/premium-reports/comprehensive')
    }
    if (status === 'authenticated') {
      redirectedRef.current = false
    }
  }, [status, router])

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

  if (status === 'loading' || profileLoading || sajuLoading) {
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
        <header className="px-4 py-10">
          <div className="mx-auto max-w-5xl">
            <Link
              href="/premium-reports"
              className="inline-flex items-center rounded-full border border-white/15 bg-slate-900/60 px-3 py-1 text-sm text-slate-300 backdrop-blur-xl hover:border-cyan-300/60 hover:text-white"
            >
              프리미엄 리포트
            </Link>
            <div className="mt-5 rounded-3xl border border-white/15 bg-slate-900/60 p-7 backdrop-blur-xl">
              <div className="inline-flex rounded-full border border-amber-300/35 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
                Comprehensive
              </div>
              <h1 className="mt-3 text-3xl font-black text-white">종합 리포트</h1>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                사주·점성·매트릭스 근거를 한 번에 통합해 전체 흐름을 해석합니다.
              </p>

              <div className="mt-5 inline-flex rounded-xl border border-white/15 bg-slate-950/50 p-1">
                <button
                  onClick={() => router.replace('/premium-reports/comprehensive?tier=free')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    reportTier === 'free'
                      ? 'bg-emerald-500 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  FREE VERSION
                </button>
                <button
                  onClick={() => router.replace('/premium-reports/comprehensive?tier=premium')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    reportTier === 'premium'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  PREMIUM VERSION
                </button>
              </div>

              <p className="mt-3 text-xs font-semibold text-amber-200">
                {reportTier === 'premium'
                  ? `${REPORT_CREDIT_COSTS.comprehensive} credits - Premium report + PDF`
                  : '0 credits - Free digest report'}
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto grid max-w-5xl gap-6 px-4 pb-20 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-3xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur-xl">
            <h2 className="text-lg font-semibold text-white">포함 내용</h2>
            <ul className="mt-4 space-y-2">
              {FEATURES.map((feature) => (
                <li key={feature} className="text-sm text-slate-200">
                  ? {feature}
                </li>
              ))}
            </ul>
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
                  ? reportTier === 'premium'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110'
                  : 'cursor-not-allowed bg-slate-700'
              }`}
            >
              {isGenerating
                ? '리포트 생성 중...'
                : reportTier === 'premium'
                  ? '프리미엄 종합 리포트 생성'
                  : '무료 요약 리포트 생성'}
            </button>

            <p className="text-center text-xs text-slate-500">
              {reportTier === 'premium'
                ? '프리미엄 리포트는 My Journey에서 다시 확인할 수 있습니다.'
                : '무료 요약은 저장되지 않으니 필요한 내용은 메모해 주세요.'}
            </p>

            {freeReport && (
              <section className="rounded-2xl border border-emerald-300/35 bg-emerald-500/10 p-4 text-sm text-emerald-50">
                <h3 className="text-base font-bold text-emerald-100">{freeReport.headline}</h3>
                <p className="mt-2 leading-6 text-emerald-100/90">{freeReport.summary}</p>
                <p className="mt-3 font-semibold">
                  종합 점수 {freeReport.overallScore}점 · 등급 {freeReport.grade}
                </p>

                {freeReport.topInsights && freeReport.topInsights.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {freeReport.topInsights.map((item) => (
                      <article
                        key={`${item.title}-${item.action}`}
                        className="rounded-xl border border-emerald-200/35 bg-emerald-950/35 p-3"
                      >
                        <p className="font-semibold text-emerald-50">{item.title}</p>
                        <p className="mt-1 text-emerald-100/85">{item.reason}</p>
                        <p className="mt-2 text-xs font-semibold text-emerald-200">
                          실행: {item.action}
                        </p>
                      </article>
                    ))}
                  </div>
                )}

                {freeReport.nextSteps && freeReport.nextSteps.length > 0 && (
                  <div className="mt-4 rounded-xl border border-emerald-200/35 bg-emerald-950/25 p-3">
                    <p className="font-semibold text-emerald-100">다음 단계</p>
                    <ul className="mt-2 space-y-1 text-emerald-100/90">
                      {freeReport.nextSteps.map((step) => (
                        <li key={step}>? {step}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}
          </section>
        </main>
      </PremiumPageScaffold>
    </>
  )
}

function useReportProfileState(
  profile: {
    birthDate?: string
    birthTime?: string
    birthCity?: string
    timezone?: string
    latitude?: number
    longitude?: number
    name?: string
    gender?: string
  },
  queryProfileInput: ReportProfileInput | null
) {
  const [profileInput, setProfileInput] = useState<ReportProfileInput | null>(null)

  useEffect(() => {
    if (queryProfileInput && !profileInput) {
      setProfileInput(queryProfileInput)
      return
    }

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
  }, [profile, profileInput, queryProfileInput])

  return { profileInput, setProfileInput }
}
