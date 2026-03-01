'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Heart, Briefcase, Coins, HeartPulse, Users } from 'lucide-react'
import { analytics } from '@/components/analytics/GoogleAnalytics'
import UnifiedServiceLoading from '@/components/ui/UnifiedServiceLoading'
import { useUserProfile } from '@/hooks/useUserProfile'
import PremiumPageScaffold from '@/app/premium-reports/_components/PremiumPageScaffold'
import {
  ReportProfileForm,
  type ReportProfileInput,
} from '@/app/premium-reports/_components/ReportProfileForm'
import { savePremiumReportSnapshot } from '@/lib/premium-reports/reportSnapshot'

interface SajuData {
  dayMasterElement: string
}

type ThemeType = 'love' | 'career' | 'wealth' | 'health' | 'family'
type ReportTier = 'free' | 'premium'

const THEME_INFO: Record<
  ThemeType,
  {
    label: string
    description: string
    credits: number
    color: string
    icon: typeof Heart
    sections: string[]
  }
> = {
  love: {
    label: '연애/결혼 심화',
    description: '관계 패턴, 궁합 흐름, 감정 리듬까지 깊게 분석합니다.',
    credits: 3,
    color: 'from-pink-500 to-rose-500',
    icon: Heart,
    sections: ['연애 성향', '궁합 포인트', '시기 분석', '실행 전략'],
  },
  career: {
    label: '커리어 전략',
    description: '직무 적성, 성장 경로, 전환 타이밍을 구체적으로 제시합니다.',
    credits: 3,
    color: 'from-blue-500 to-indigo-500',
    icon: Briefcase,
    sections: ['성장 곡선', '전환 시기', '강점 활용', '실행 계획'],
  },
  wealth: {
    label: '재무 전략',
    description: '수입/지출 패턴과 투자 리듬을 기반으로 재무 전략을 설계합니다.',
    credits: 3,
    color: 'from-amber-500 to-orange-500',
    icon: Coins,
    sections: ['현금흐름', '리스크 구간', '투자 성향', '실행 원칙'],
  },
  health: {
    label: '건강 밸런스',
    description: '체력 흐름, 소진 신호, 회복 루틴을 함께 분석합니다.',
    credits: 3,
    color: 'from-emerald-500 to-teal-500',
    icon: HeartPulse,
    sections: ['체력 리듬', '취약 구간', '회복 전략', '생활 습관'],
  },
  family: {
    label: '가족/관계 심화',
    description: '관계 역학, 갈등 포인트, 대화 전략을 정리해드립니다.',
    credits: 3,
    color: 'from-violet-500 to-purple-500',
    icon: Users,
    sections: ['관계 구조', '갈등 패턴', '회복 포인트', '대화 전략'],
  },
}

function toTheme(value: string | null): ThemeType | null {
  if (!value) {
    return null
  }
  if (
    value === 'love' ||
    value === 'career' ||
    value === 'wealth' ||
    value === 'health' ||
    value === 'family'
  ) {
    return value
  }
  return null
}

function toTier(value: string | null): ReportTier {
  return value === 'free' ? 'free' : 'premium'
}

export default function ThemedReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const redirectedRef = useRef(false)
  const { profile, isLoading: profileLoading } = useUserProfile()

  const reportTier = toTier(searchParams?.get('tier') ?? null)

  const [selectedTheme, setSelectedTheme] = useState<ThemeType | null>(null)
  const [profileInput, setProfileInput] = useState<ReportProfileInput | null>(null)
  const [sajuData, setSajuData] = useState<SajuData | null>(null)
  const [sajuLoading, setSajuLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const themeFromQuery = toTheme(searchParams?.get('theme') ?? null)
    if (themeFromQuery) {
      setSelectedTheme(themeFromQuery)
    }
  }, [searchParams])

  useEffect(() => {
    if (status === 'unauthenticated' && !redirectedRef.current) {
      redirectedRef.current = true
      router.push('/auth/signin?callbackUrl=/premium-reports/themed')
    }
    if (status === 'authenticated') {
      redirectedRef.current = false
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
    () =>
      Boolean(
        selectedTheme &&
        (profileInput?.birthDate || profile.birthDate) &&
        !isGenerating &&
        reportTier === 'premium'
      ),
    [selectedTheme, profileInput?.birthDate, profile.birthDate, isGenerating, reportTier]
  )

  const handleGenerate = async () => {
    if (reportTier !== 'premium') {
      router.push('/premium-reports/comprehensive?tier=free')
      return
    }

    if (!selectedTheme) {
      setError('테마를 선택해 주세요.')
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
          theme: selectedTheme,
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
          reportType: 'themed',
          theme: selectedTheme,
          createdAt: new Date().toISOString(),
          report: data.report,
        })
      }

      analytics.matrixGenerate('premium-reports/themed')
      router.push(`/premium-reports/result/${data.report.id}?type=themed`)
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
      <PremiumPageScaffold accent="violet">
        <header className="px-4 py-10">
          <div className="mx-auto max-w-5xl">
            <Link
              href="/premium-reports"
              className="inline-flex items-center rounded-full border border-white/15 bg-slate-900/60 px-3 py-1 text-sm text-slate-300 backdrop-blur-xl hover:border-cyan-300/60 hover:text-white"
            >
              프리미엄 리포트
            </Link>
            <div className="mt-5 rounded-3xl border border-white/15 bg-slate-900/60 p-7 backdrop-blur-xl">
              <div className="inline-flex rounded-full border border-violet-300/40 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-200">
                Themed
              </div>
              <h1 className="mt-3 text-3xl font-black text-white">테마 심화 리포트</h1>
              <p className="mt-2 text-slate-300">
                원하는 테마를 선택하면 사주+점성 교차 근거로 깊이 있게 해석합니다.
              </p>
              <p className="mt-3 text-xs font-semibold text-violet-200">3 credits · Premium 전용</p>
            </div>
          </div>
        </header>

        <main className="mx-auto grid max-w-5xl gap-6 px-4 pb-20 lg:grid-cols-[1.1fr_1fr]">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-white">테마 선택</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {(Object.entries(THEME_INFO) as [ThemeType, (typeof THEME_INFO)[ThemeType]][]).map(
                ([themeKey, theme]) => {
                  const Icon = theme.icon
                  const isSelected = selectedTheme === themeKey

                  return (
                    <button
                      key={themeKey}
                      onClick={() => setSelectedTheme(themeKey)}
                      className={`rounded-2xl border p-5 text-left transition ${
                        isSelected
                          ? `border-cyan-300 bg-gradient-to-br ${theme.color} shadow-lg shadow-cyan-500/20`
                          : 'border-slate-700 bg-slate-800/40 hover:border-slate-500'
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <Icon className="h-6 w-6 text-white" />
                        <span className="rounded-full bg-slate-900/40 px-2 py-1 text-xs text-slate-200">
                          {theme.credits} credits
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-white">{theme.label}</h3>
                      <p className="mt-2 text-sm text-slate-100/90">{theme.description}</p>
                    </button>
                  )
                }
              )}
            </div>

            {selectedTheme && (
              <div className="rounded-2xl border border-white/15 bg-slate-900/55 p-5 backdrop-blur-xl">
                <h3 className="text-base font-semibold text-white">
                  {THEME_INFO[selectedTheme].label} 포함 내용
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {THEME_INFO[selectedTheme].sections.map((section) => (
                    <span
                      key={section}
                      className="rounded-full border border-slate-600 bg-slate-900/50 px-3 py-1 text-xs text-slate-200"
                    >
                      {section}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-white/15 bg-slate-950/40 p-3 text-xs text-slate-300">
              무료 버전은 종합 요약만 제공합니다.
              <button
                onClick={() => router.push('/premium-reports/comprehensive?tier=free')}
                className="ml-2 font-semibold text-emerald-300 hover:text-emerald-200"
              >
                무료 버전 보기
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
              className={`w-full rounded-xl px-4 py-4 text-center text-sm font-semibold text-white transition ${
                canGenerate
                  ? `bg-gradient-to-r ${selectedTheme ? THEME_INFO[selectedTheme].color : 'from-cyan-500 to-blue-500'} hover:brightness-110`
                  : 'cursor-not-allowed bg-slate-700'
              }`}
            >
              {isGenerating
                ? '리포트 생성 중...'
                : selectedTheme
                  ? `${THEME_INFO[selectedTheme].label} 생성하기`
                  : '테마를 선택해 주세요'}
            </button>

            <p className="text-center text-xs text-slate-500">
              생성 후 My Journey에서 다시 확인할 수 있습니다.
            </p>
          </section>
        </main>
      </PremiumPageScaffold>
    </>
  )
}
