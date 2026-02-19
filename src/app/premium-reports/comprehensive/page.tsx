'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { analytics } from '@/components/analytics/GoogleAnalytics'
import { useUserProfile } from '@/hooks/useUserProfile'
import UnifiedServiceLoading from '@/components/ui/UnifiedServiceLoading'
import {
  ReportProfileForm,
  type ReportProfileInput,
} from '@/app/premium-reports/_components/ReportProfileForm'

interface SajuData {
  dayMasterElement: string
}

const FEATURES = [
  '성향/기질 핵심 분석',
  '커리어/재물 흐름 분석',
  '관계/가족 역학 분석',
  '건강/에너지 리듬 분석',
  '강점/리스크 요인 정리',
  '실행 가능한 행동 가이드',
]

export default function ComprehensiveReportPage() {
  const router = useRouter()
  const { status } = useSession()
  const { profile, isLoading: profileLoading } = useUserProfile()

  const [profileInput, setProfileInput] = useState<ReportProfileInput | null>(null)
  const [sajuData, setSajuData] = useState<SajuData | null>(null)
  const [sajuLoading, setSajuLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/premium-reports/comprehensive')
    }
  }, [status, router])

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
          period: 'comprehensive',
          dayMasterElement: sajuData?.dayMasterElement || '목',
          name: profileInput?.name || profile.name || '사용자',
          birthDate: finalBirthDate,
          birthTime: profileInput?.birthTime || profile.birthTime || undefined,
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

      analytics.matrixGenerate('premium-reports/comprehensive')
      router.push(`/premium-reports/result/${data.report.id}?type=comprehensive`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
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
      <div className="min-h-[100svh] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <header className="px-4 py-8">
          <div className="mx-auto max-w-5xl">
            <Link
              href="/premium-reports"
              className="inline-flex items-center text-sm text-slate-400 hover:text-slate-100"
            >
              ← 리포트 선택으로 돌아가기
            </Link>
            <div className="mt-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 p-6">
              <h1 className="text-2xl font-bold text-white">종합 리포트</h1>
              <p className="mt-2 text-sm text-white/90">
                사주와 점성의 핵심 시그널을 통합해 장기 전략을 제시합니다.
              </p>
              <p className="mt-2 text-xs text-white/80">3 credits</p>
            </div>
          </div>
        </header>

        <main className="mx-auto grid max-w-5xl gap-6 px-4 pb-20 lg:grid-cols-[1fr_1fr]">
          <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-6">
            <h2 className="text-lg font-semibold text-white">포함 내용</h2>
            <ul className="mt-4 space-y-2">
              {FEATURES.map((feature) => (
                <li key={feature} className="text-sm text-slate-200">
                  • {feature}
                </li>
              ))}
            </ul>
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
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-90'
                  : 'cursor-not-allowed bg-slate-700'
              }`}
            >
              {isGenerating ? '리포트 생성 중...' : '종합 리포트 생성하기'}
            </button>

            <p className="text-center text-xs text-slate-500">
              생성된 리포트는 My Journey에서 다시 확인할 수 있습니다.
            </p>
          </section>
        </main>
      </div>
    </>
  )
}
