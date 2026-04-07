'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Briefcase, Coins, Heart, HeartPulse, Users } from 'lucide-react'
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
  type PremiumSajuData,
  type ThemeType,
  toReportTier,
  toThemeType,
} from '@/app/premium-reports/_lib/shared'
import { usePremiumReportProfile } from '@/app/premium-reports/_lib/usePremiumReportProfile'
import { savePremiumReportSnapshot } from '@/lib/premium-reports/reportSnapshot'

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
    label: '연애 흐름과 관계 확정',
    description: '썸, 재접근, 관계 확정, 결혼 조건까지 감정선과 속도를 함께 읽습니다.',
    credits: 3,
    color: 'from-pink-500 to-rose-500',
    icon: Heart,
    sections: ['연애 속도와 감정선', '재접근 가능성', '관계 확정과 결혼 조건', '실행 전략'],
  },
  career: {
    label: '커리어 전략',
    description: '직무 적성, 성장 경로, 전환 타이밍을 구체적으로 정리합니다.',
    credits: 3,
    color: 'from-blue-500 to-indigo-500',
    icon: Briefcase,
    sections: ['성장 곡선', '전환 시기', '강점 활용', '실행 계획'],
  },
  wealth: {
    label: '재무 전략',
    description: '수입, 지출, 투자 리듬을 바탕으로 재무 운영 원칙을 설계합니다.',
    credits: 3,
    color: 'from-amber-500 to-orange-500',
    icon: Coins,
    sections: ['현금 흐름', '리스크 구간', '투자 성향', '실행 원칙'],
  },
  health: {
    label: '건강 밸런스',
    description: '체력 흐름, 소진 신호, 회복 루틴을 함께 정리합니다.',
    credits: 3,
    color: 'from-emerald-500 to-teal-500',
    icon: HeartPulse,
    sections: ['체력 리듬', '취약 구간', '회복 전략', '생활 습관'],
  },
  family: {
    label: '가족 구조와 돌봄 전략',
    description: '부모, 형제, 자녀 역학과 경계선, 돌봄 부담까지 함께 해석합니다.',
    credits: 3,
    color: 'from-violet-500 to-purple-500',
    icon: Users,
    sections: ['가족 역할 구조', '경계선과 갈등', '돌봄과 경제 분담', '세대 패턴'],
  },
}

export default function ThemedReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const redirectedRef = useRef(false)
  const { profile, isLoading: profileLoading } = useUserProfile()

  const reportTier = toReportTier(searchParams?.get('tier') ?? null)

  const [selectedTheme, setSelectedTheme] = useState<ThemeType | null>(null)
  const { profileInput, setProfileInput } = usePremiumReportProfile(profile)
  const [sajuData, setSajuData] = useState<PremiumSajuData | null>(null)
  const [sajuLoading, setSajuLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const themeFromQuery = toThemeType(searchParams?.get('theme') ?? null)
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
      setError('테마를 먼저 선택해 주세요.')
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
        <ReportBuilderHero
          accent="violet"
          badge="Themed Report"
          title="테마 심화 리포트"
          description="하나의 영역을 골라 깊게 읽습니다. 연애, 커리어, 재무, 건강, 가족 중 지금 가장 중요한 질문에 맞춰 사주와 점성의 교차 근거를 집중적으로 정리합니다."
          meta="3 credits · Premium 전용"
        />

        <main className="mx-auto grid max-w-5xl gap-6 px-4 pb-20 lg:grid-cols-[1.1fr_1fr]">
          <ReportSurfaceSection title="테마 선택" eyebrow="Focus Area" tone="cyan">
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
                          : 'border-white/10 bg-slate-950/50 hover:border-white/20'
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <Icon className="h-6 w-6 text-white" />
                        <span className="rounded-full bg-slate-950/40 px-2 py-1 text-xs text-slate-200">
                          {theme.credits} credits
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-white">{theme.label}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-100/90">
                        {theme.description}
                      </p>
                    </button>
                  )
                }
              )}
            </div>

            {selectedTheme ? (
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/45 p-5">
                <h3 className="text-base font-semibold text-white">
                  {THEME_INFO[selectedTheme].label} 포함 내용
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {THEME_INFO[selectedTheme].sections.map((section) => (
                    <span
                      key={section}
                      className="rounded-full border border-slate-600 bg-slate-950/50 px-3 py-1 text-xs text-slate-200"
                    >
                      {section}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

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
            accent="violet"
            initialName={profile.name}
            onProfileSubmit={setProfileInput}
            actionLabel={
              isGenerating
                ? '리포트 생성 중...'
                : selectedTheme
                  ? `${THEME_INFO[selectedTheme].label} 생성`
                  : '테마를 먼저 선택해 주세요'
            }
            onAction={handleGenerate}
            disabled={!canGenerate}
            error={error}
            helperText="생성 후 My Journey에서 다시 확인할 수 있습니다."
          >
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-200">
              <p className="font-medium text-white">
                {selectedTheme
                  ? `선택된 영역 · ${THEME_INFO[selectedTheme].label}`
                  : '집중할 영역을 먼저 고르세요'}
              </p>
              <p className="mt-2 leading-6 text-slate-300">
                {selectedTheme
                  ? THEME_INFO[selectedTheme].description
                  : '같은 출생 프로필을 바탕으로 지금 가장 중요한 질문 하나를 깊게 파고드는 구조입니다.'}
              </p>
            </div>
          </ReportBuilderActionPanel>
        </main>
      </PremiumPageScaffold>
    </>
  )
}
