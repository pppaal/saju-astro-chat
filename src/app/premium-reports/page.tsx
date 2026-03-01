'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  Coins,
  Crown,
  Heart,
  HeartPulse,
  Sparkles,
  Users,
} from 'lucide-react'
import { analytics } from '@/components/analytics/GoogleAnalytics'
import UnifiedServiceLoading from '@/components/ui/UnifiedServiceLoading'
import PremiumPageScaffold from '@/app/premium-reports/_components/PremiumPageScaffold'
import {
  ReportProfileForm,
  type ReportProfileInput,
} from '@/app/premium-reports/_components/ReportProfileForm'
import { savePremiumReportSnapshot } from '@/lib/premium-reports/reportSnapshot'

type ReportMode = 'free' | 'premium'
type ReportTheme = 'love' | 'career' | 'wealth' | 'health' | 'family'
type PremiumSelectionType = 'theme' | 'comprehensive' | 'timing'

type PremiumOption = {
  key: string
  type: PremiumSelectionType
  label: string
  description: string
  color: string
  icon: typeof Heart
  sections: string[]
  theme?: ReportTheme
  period?: 'yearly'
}

const FALLBACK_CITY = 'Seoul, South Korea'
const FALLBACK_LAT = 37.5665
const FALLBACK_LON = 126.978

const PREMIUM_OPTIONS: PremiumOption[] = [
  {
    key: 'comprehensive',
    type: 'comprehensive',
    label: '인생총운',
    description: '전체 흐름, 전환점, 장기 실행 전략을 종합 리포트로 제공합니다.',
    color: 'from-amber-500 to-orange-500',
    icon: Crown,
    sections: ['전체 흐름', '장기 전환점', '핵심 과제', '종합 실행안'],
  },
  {
    key: 'yearly',
    type: 'timing',
    period: 'yearly',
    label: '신년운',
    description: '올해의 기회 구간, 주의 시점, 영역별 타이밍을 집중 분석합니다.',
    color: 'from-cyan-500 to-blue-500',
    icon: CalendarDays,
    sections: ['연간 흐름', '기회 시점', '주의 구간', '올해 행동 가이드'],
  },
  {
    key: 'love',
    type: 'theme',
    theme: 'love',
    label: '연애/관계',
    description: '감정 리듬, 소통 포인트, 관계 안정성과 전환 타이밍을 분석합니다.',
    color: 'from-pink-500 to-rose-500',
    icon: Heart,
    sections: ['관계 흐름', '소통 포인트', '리스크 신호', '실행 가이드'],
  },
  {
    key: 'career',
    type: 'theme',
    theme: 'career',
    label: '커리어/직업',
    description: '일의 방향성, 기회 창, 협업 패턴, 의사결정 타이밍을 제시합니다.',
    color: 'from-blue-500 to-indigo-500',
    icon: Briefcase,
    sections: ['일의 방향', '성장 구간', '협업 전략', '행동 플랜'],
  },
  {
    key: 'wealth',
    type: 'theme',
    theme: 'wealth',
    label: '재물/자산',
    description: '현금흐름, 투자 시기, 소비 리스크, 자산 운영 힌트를 제공합니다.',
    color: 'from-amber-500 to-orange-500',
    icon: Coins,
    sections: ['수입/지출', '투자 타이밍', '주의 구간', '현실 실행안'],
  },
  {
    key: 'health',
    type: 'theme',
    theme: 'health',
    label: '건강/컨디션',
    description: '에너지 변동, 회복 루틴, 과부하 신호, 생활 패턴 최적화를 분석합니다.',
    color: 'from-emerald-500 to-teal-500',
    icon: HeartPulse,
    sections: ['에너지 리듬', '회복 루틴', '주의 지표', '실천 체크'],
  },
  {
    key: 'family',
    type: 'theme',
    theme: 'family',
    label: '가족/생활',
    description: '가정 내 역할, 정서 흐름, 갈등 완화 포인트를 제안합니다.',
    color: 'from-violet-500 to-purple-500',
    icon: Users,
    sections: ['관계 역학', '정서 흐름', '갈등 완화', '현실 조정안'],
  },
]

function normalizeGender(value?: ReportProfileInput['gender']): 'male' | 'female' {
  if (value === 'F' || value === 'Female') return 'female'
  return 'male'
}

function createDestinyMapUrl(profile: ReportProfileInput): string {
  const latitude = Number.isFinite(profile.latitude) ? profile.latitude : FALLBACK_LAT
  const longitude = Number.isFinite(profile.longitude) ? profile.longitude : FALLBACK_LON
  const params = new URLSearchParams({
    name: profile.name || '사용자',
    birthDate: profile.birthDate,
    birthTime: profile.birthTime || '12:00',
    city: profile.birthCity?.trim() || FALLBACK_CITY,
    lat: String(latitude),
    lon: String(longitude),
    userTz: profile.timezone || 'Asia/Seoul',
    gender: normalizeGender(profile.gender),
    lang: 'ko',
    theme: 'focus_overall',
  })
  return `/destiny-map/result?${params.toString()}`
}

export default function PremiumReportsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()

  const [mode, setMode] = useState<ReportMode>('free')
  const [selectedOptionKey, setSelectedOptionKey] = useState<string>('comprehensive')
  const [profileInput, setProfileInput] = useState<ReportProfileInput | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initialName = useMemo(() => {
    const fromSession = session?.user?.name
    return typeof fromSession === 'string' ? fromSession : ''
  }, [session])

  const hasProfile = Boolean(profileInput?.birthDate)
  const canRun = !isGenerating
  const selectedOption =
    PREMIUM_OPTIONS.find((option) => option.key === selectedOptionKey) ?? PREMIUM_OPTIONS[0]

  const handleStartFree = () => {
    if (!profileInput || !hasProfile) {
      setError('출생 정보를 입력한 뒤 분석하기를 눌러주세요.')
      return
    }
    setError(null)
    router.push(createDestinyMapUrl(profileInput))
  }

  const handleGeneratePremium = async () => {
    if (status !== 'authenticated') {
      router.push('/auth/signin?callbackUrl=/premium-reports')
      return
    }

    if (!profileInput || !hasProfile) {
      setError('출생 정보를 입력한 뒤 분석하기를 눌러주세요.')
      return
    }

    setError(null)
    setIsGenerating(true)

    try {
      const payload: Record<string, unknown> = {
        reportTier: 'premium',
        detailLevel: selectedOption.type === 'timing' ? 'detailed' : 'comprehensive',
        lang: 'ko',
        name: profileInput.name || '사용자',
        birthDate: profileInput.birthDate,
        birthTime: profileInput.birthTime || '12:00',
        birthCity: profileInput.birthCity || FALLBACK_CITY,
        timezone: profileInput.timezone || 'Asia/Seoul',
        gender: profileInput.gender,
        latitude: Number.isFinite(profileInput.latitude) ? profileInput.latitude : FALLBACK_LAT,
        longitude: Number.isFinite(profileInput.longitude) ? profileInput.longitude : FALLBACK_LON,
      }

      if (selectedOption.type === 'theme' && selectedOption.theme) {
        payload.theme = selectedOption.theme
      } else if (selectedOption.type === 'timing' && selectedOption.period) {
        payload.period = selectedOption.period
        payload.targetDate = `${new Date().getFullYear()}-01-01`
      } else {
        payload.period = 'comprehensive'
      }

      const response = await fetch('/api/destiny-matrix/ai-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = (await response.json()) as {
        success?: boolean
        report?: { id?: string; reportType?: 'timing' | 'themed' | 'comprehensive' }
        error?: { code?: string; message?: string }
      }

      if (!data.success) {
        if (data.error?.code === 'INSUFFICIENT_CREDITS') {
          router.push('/pricing?reason=credits')
          return
        }
        throw new Error(data.error?.message || '리포트 생성에 실패했습니다.')
      }

      const reportId = data.report?.id
      if (!reportId) {
        throw new Error('리포트 ID를 받지 못했습니다.')
      }

      const reportType: 'timing' | 'themed' | 'comprehensive' =
        data.report?.reportType ||
        (selectedOption.type === 'theme'
          ? 'themed'
          : selectedOption.type === 'timing'
            ? 'timing'
            : 'comprehensive')

      savePremiumReportSnapshot({
        reportId,
        reportType,
        period:
          selectedOption.type === 'timing'
            ? selectedOption.period
            : reportType === 'comprehensive'
              ? 'comprehensive'
              : undefined,
        theme: selectedOption.type === 'theme' ? selectedOption.theme : undefined,
        createdAt: new Date().toISOString(),
        report: (data.report ?? {}) as Record<string, unknown>,
      })

      analytics.matrixGenerate('premium-reports')
      router.push(`/premium-reports/result/${reportId}?type=${reportType}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '리포트 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      {isGenerating && (
        <div className="fixed inset-0 z-[120]">
          <UnifiedServiceLoading kind="aiReport" locale="ko" />
        </div>
      )}

      <PremiumPageScaffold accent="violet">
        <header className="px-4 pb-7 pt-12">
          <div className="mx-auto max-w-6xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/40 bg-violet-500/15 px-4 py-1 text-xs font-semibold tracking-wide text-violet-100">
              <Sparkles className="h-3.5 w-3.5" />
              AI REPORT
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-5xl">
              공통 입력 후 Free / Premium 선택
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
              캘린더처럼 공통 폼 한 번 입력하고, Free 또는 Premium을 선택해 바로 분석합니다.
            </p>
          </div>
        </header>

        <main className="mx-auto grid max-w-6xl gap-6 px-4 pb-20 lg:grid-cols-[1.05fr_1fr]">
          <section className="space-y-4">
            <ReportProfileForm locale="ko" initialName={initialName} onSubmit={setProfileInput} />

            {error && (
              <div className="rounded-xl border border-red-500/50 bg-red-500/15 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <article className="rounded-3xl border border-white/15 bg-slate-900/60 p-5 backdrop-blur-xl">
              <div className="inline-flex rounded-xl border border-white/15 bg-slate-950/50 p-1">
                <button
                  onClick={() => setMode('free')}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                    mode === 'free'
                      ? 'bg-emerald-500 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  FREE
                </button>
                <button
                  onClick={() => setMode('premium')}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                    mode === 'premium'
                      ? 'bg-violet-500 text-white'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  PREMIUM
                </button>
              </div>

              {mode === 'free' ? (
                <div className="mt-4 rounded-2xl border border-emerald-300/35 bg-gradient-to-br from-emerald-500/15 to-teal-500/10 p-5">
                  <p className="text-xs font-semibold text-emerald-200">FREE INSIGHTS</p>
                  <h2 className="mt-1 text-xl font-extrabold text-white">
                    Destiny-Map Free Insights
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-100">
                    무료 인사이트로 이동해 기본 성향, 흐름, 핵심 포인트를 확인합니다.
                  </p>
                </div>
              ) : (
                <div className="mt-4">
                  <div className="mb-3 flex items-center gap-2 text-violet-100">
                    <Crown className="h-4 w-4" />
                    <span className="text-sm font-semibold">테마를 선택하세요</span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {PREMIUM_OPTIONS.map((option) => {
                      const Icon = option.icon
                      const isSelected = selectedOption.key === option.key

                      return (
                        <button
                          key={option.key}
                          onClick={() => setSelectedOptionKey(option.key)}
                          className={`rounded-2xl border p-4 text-left transition ${
                            isSelected
                              ? `border-violet-300 bg-gradient-to-br ${option.color} shadow-lg shadow-violet-500/25`
                              : 'border-slate-700 bg-slate-800/40 hover:border-slate-500'
                          }`}
                        >
                          <div className="mb-2 inline-flex rounded-lg bg-black/25 p-2 text-white">
                            <Icon className="h-4 w-4" />
                          </div>
                          <p className="text-sm font-bold text-white">{option.label}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-100/90">
                            {option.description}
                          </p>
                        </button>
                      )
                    })}
                  </div>

                  <div className="mt-3 rounded-xl border border-violet-300/30 bg-violet-500/10 p-3">
                    <p className="text-xs font-semibold text-violet-100">
                      선택된 리포트: {selectedOption.label}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedOption.sections.map((section) => (
                        <span
                          key={section}
                          className="rounded-full border border-violet-300/40 bg-slate-950/50 px-3 py-1 text-[11px] text-violet-100"
                        >
                          {section}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={mode === 'free' ? handleStartFree : handleGeneratePremium}
                disabled={!canRun || !hasProfile}
                className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition ${
                  canRun && hasProfile
                    ? mode === 'free'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110'
                      : `bg-gradient-to-r ${selectedOption.color} hover:brightness-110`
                    : 'cursor-not-allowed bg-slate-700'
                }`}
              >
                {mode === 'free' ? 'Free 분석하기' : 'Premium 분석하기'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </article>

            <article className="rounded-2xl border border-white/15 bg-slate-900/50 p-4 text-xs leading-6 text-slate-300 backdrop-blur-xl">
              <p>프리미엄 생성은 로그인 및 크레딧이 필요합니다.</p>
              <Link
                href="/pricing"
                className="mt-1 inline-flex items-center gap-1 font-semibold text-cyan-200 hover:text-cyan-100"
              >
                요금제 보기
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </article>
          </section>
        </main>
      </PremiumPageScaffold>
    </>
  )
}
