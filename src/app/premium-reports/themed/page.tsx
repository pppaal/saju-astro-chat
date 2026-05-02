'use client'

/**
 * Apple-tier Themed × Period Report Builder.
 *
 * 한 페이지에서 6 테마 × 3 시기를 우아하게 선택 → 리포트 생성.
 * 큰 헤드라인 / 절제된 카드 / smooth transition / 의미 있는 시각.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Briefcase, Coins, Heart, HeartPulse, Users, MapPin } from 'lucide-react'
import { analytics } from '@/components/analytics/GoogleAnalytics'
import UnifiedServiceLoading from '@/components/ui/UnifiedServiceLoading'
import { useUserProfile } from '@/hooks/useUserProfile'
import {
  fetchPremiumSajuData,
  type PremiumSajuData,
  type ThemeType,
  toReportTier,
  toThemeType,
} from '@/app/premium-reports/_lib/shared'
import { usePremiumReportProfile } from '@/app/premium-reports/_lib/usePremiumReportProfile'
import { savePremiumReportSnapshot } from '@/lib/premium-reports/reportSnapshot'

type Period = 'lifetime' | 'yearly' | 'monthly'

interface ThemeMeta {
  key: ThemeType
  label: string
  english: string
  blurb: string
  Icon: typeof Heart
  accent: string
  glow: string
}

const THEMES: ThemeMeta[] = [
  {
    key: 'love',
    label: '연애',
    english: 'Love',
    blurb: '관계의 결, 끌림의 패턴, 깊어지는 속도',
    Icon: Heart,
    accent: '#f472b6',
    glow: 'rgba(244,114,182,0.22)',
  },
  {
    key: 'career',
    label: '커리어',
    english: 'Career',
    blurb: '진로의 흐름, 전환 시기, 강점이 빛나는 자리',
    Icon: Briefcase,
    accent: '#60a5fa',
    glow: 'rgba(96,165,250,0.22)',
  },
  {
    key: 'wealth',
    label: '재물',
    english: 'Wealth',
    blurb: '돈의 흐름, 투자 리듬, 지키고 키우는 원칙',
    Icon: Coins,
    accent: '#fbbf24',
    glow: 'rgba(251,191,36,0.22)',
  },
  {
    key: 'health',
    label: '건강',
    english: 'Health',
    blurb: '체력 리듬, 회복 톤, 균형의 결',
    Icon: HeartPulse,
    accent: '#34d399',
    glow: 'rgba(52,211,153,0.22)',
  },
  {
    key: 'family',
    label: '가족',
    english: 'Family',
    blurb: '뿌리의 결, 세대 패턴, 돌봄의 균형',
    Icon: Users,
    accent: '#a78bfa',
    glow: 'rgba(167,139,250,0.22)',
  },
  {
    key: 'move' as ThemeType,
    label: '이동',
    english: 'Move',
    blurb: '이주·여정의 결, 환경 변동, 정착의 자리',
    Icon: MapPin,
    accent: '#22d3ee',
    glow: 'rgba(34,211,238,0.22)',
  },
]

const PERIOD_META: Record<Period, { label: string; sub: string; en: string }> = {
  lifetime: { label: '인생 전반', sub: '평생 흐름·변곡점·핵심 결', en: 'Lifetime' },
  yearly: { label: '한 해', sub: '연 단위 분기·월별 핵심 흐름', en: 'Year' },
  monthly: { label: '한 달', sub: '주차별·상순중순하순 흐름', en: 'Month' },
}

function ThemedBuilderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const redirectedRef = useRef(false)
  const { profile, isLoading: profileLoading } = useUserProfile()

  const reportTier = toReportTier(searchParams?.get('tier') ?? null)

  const [theme, setTheme] = useState<ThemeType | null>(null)
  const [period, setPeriod] = useState<Period>('lifetime')
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().slice(0, 10))
  const { profileInput, setProfileInput: _setProfileInput } = usePremiumReportProfile(profile)
  const [sajuData, setSajuData] = useState<PremiumSajuData | null>(null)
  const [sajuLoading, setSajuLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = toThemeType(searchParams?.get('theme') ?? null)
    if (t) setTheme(t)
  }, [searchParams])

  useEffect(() => {
    if (status === 'unauthenticated' && !redirectedRef.current) {
      redirectedRef.current = true
      router.push('/auth/signin?callbackUrl=/premium-reports/themed')
    }
    if (status === 'authenticated') redirectedRef.current = false
  }, [status, router])

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
    () =>
      Boolean(
        theme &&
          (profileInput?.birthDate || profile.birthDate) &&
          !isGenerating &&
          reportTier === 'premium'
      ),
    [theme, profileInput?.birthDate, profile.birthDate, isGenerating, reportTier]
  )

  const handleGenerate = async () => {
    if (reportTier !== 'premium') {
      router.push('/destiny-map')
      return
    }
    if (!theme) {
      setError('테마를 먼저 선택해주세요.')
      return
    }
    const finalBirthDate = profileInput?.birthDate || profile.birthDate
    if (!finalBirthDate) {
      setError('생년월일 정보를 확인해주세요.')
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
          theme,
          period: period === 'lifetime' ? undefined : period,
          targetDate: period === 'lifetime' ? undefined : targetDate,
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
          theme,
          createdAt: new Date().toISOString(),
          report: data.report,
        })
      }
      analytics.matrixGenerate('premium-reports/themed')
      router.push(`/premium-reports/result/${data.report.id}?type=themed`)
    } catch (err) {
      const raw = err instanceof Error ? err.message : ''
      const looksKorean = /[가-힣]/.test(raw)
      setError(looksKorean ? raw : 'AI 리포트 생성 중 일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsGenerating(false)
    }
  }

  if (status === 'loading' || profileLoading || sajuLoading) {
    return <UnifiedServiceLoading kind="aiReport" locale="ko" />
  }

  const selectedThemeMeta = theme ? THEMES.find((t) => t.key === theme) : null
  const periodLabel = PERIOD_META[period].label
  const heroTitle = (() => {
    if (!selectedThemeMeta) return '리포트 만들기'
    if (period === 'lifetime') return `인생 전반 ${selectedThemeMeta.label} 리포트`
    if (period === 'yearly') {
      const y = new Date(targetDate).getFullYear()
      return `${y}년 ${selectedThemeMeta.label} 리포트`
    }
    const dt = new Date(targetDate)
    return `${dt.getFullYear()}년 ${dt.getMonth() + 1}월 ${selectedThemeMeta.label} 리포트`
  })()

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#1a1c2e_0%,#0a0a14_60%)] text-slate-100">
      {isGenerating && (
        <div className="fixed inset-0 z-[120]">
          <UnifiedServiceLoading kind="aiReport" locale="ko" />
        </div>
      )}

      <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        {/* Hero */}
        <header className="space-y-4 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-cyan-300">
            Themed Report
          </p>
          <h1
            className="text-balance bg-[linear-gradient(135deg,#fff_0%,#a89fcf_100%)] bg-clip-text text-4xl font-semibold leading-[1.15] text-transparent transition-all duration-500 md:text-5xl lg:text-6xl"
            style={{ letterSpacing: '-0.025em', wordBreak: 'keep-all' }}
          >
            {heroTitle}
          </h1>
          <p className="mx-auto max-w-md text-[15px] leading-relaxed text-slate-400">
            6 테마 × 3 시기 조합으로 지금 가장 알고 싶은 결을 깊이 풀어드려요.
          </p>
        </header>

        {/* Theme grid */}
        <section className="mt-16">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              1. 테마 선택
            </h2>
            <span className="text-[11px] text-slate-500">{theme ? '✓' : `${THEMES.length}개`}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {THEMES.map((t) => {
              const selected = theme === t.key
              const Icon = t.Icon
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTheme(t.key)}
                  className={`group relative overflow-hidden rounded-3xl border p-5 text-left transition-all duration-300 ${
                    selected
                      ? 'border-white/30 bg-white/[0.06]'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                  }`}
                  style={{
                    boxShadow: selected ? `0 0 40px ${t.glow}` : undefined,
                  }}
                >
                  <div
                    className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full transition-all"
                    style={{
                      background: selected ? t.accent : 'transparent',
                      boxShadow: selected ? `0 0 12px ${t.accent}` : undefined,
                      border: selected ? 'none' : '1px solid rgba(255,255,255,0.2)',
                    }}
                  />
                  <Icon
                    className="h-7 w-7 transition-all duration-300"
                    style={{ color: selected ? t.accent : 'rgba(255,255,255,0.5)' }}
                    strokeWidth={1.5}
                  />
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {t.english}
                  </p>
                  <h3 className="mt-1 text-[1.4rem] font-semibold tracking-tight text-white">
                    {t.label}
                  </h3>
                  <p
                    className="mt-2 text-[13px] leading-relaxed text-slate-400"
                    style={{ wordBreak: 'keep-all' }}
                  >
                    {t.blurb}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        {/* Period selector */}
        <section className="mt-16">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              2. 분석 시기
            </h2>
            <span className="text-[11px] text-slate-500">{periodLabel}</span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {(Object.keys(PERIOD_META) as Period[]).map((p) => {
              const meta = PERIOD_META[p]
              const selected = period === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded-2xl border px-5 py-4 text-left transition-all duration-300 ${
                    selected
                      ? 'border-white/25 bg-white/[0.06]'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {meta.en}
                  </p>
                  <p className="mt-1 text-[1.05rem] font-semibold text-white">{meta.label}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-slate-400">{meta.sub}</p>
                </button>
              )
            })}
          </div>

          {/* Date picker — period가 yearly/monthly일 때만 부드럽게 등장 */}
          <div
            className="overflow-hidden transition-all duration-500 ease-out"
            style={{
              maxHeight: period !== 'lifetime' ? '120px' : '0',
              opacity: period !== 'lifetime' ? 1 : 0,
              marginTop: period !== 'lifetime' ? '20px' : '0',
            }}
          >
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <label className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                {period === 'yearly' ? '대상 연도' : '대상 달'}
              </label>
              <input
                type={period === 'yearly' ? 'number' : 'month'}
                value={
                  period === 'yearly'
                    ? new Date(targetDate).getFullYear()
                    : targetDate.slice(0, 7)
                }
                onChange={(e) => {
                  if (period === 'yearly') {
                    const y = Math.max(1900, Math.min(2100, Number(e.target.value)))
                    setTargetDate(`${y}-01-01`)
                  } else {
                    setTargetDate(`${e.target.value}-01`)
                  }
                }}
                min={period === 'yearly' ? 1900 : '1900-01'}
                max={period === 'yearly' ? 2100 : '2100-12'}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2.5 text-base font-medium text-white outline-none ring-0 transition focus:border-cyan-400/50"
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-16 flex flex-col items-center gap-4">
          {error && (
            <div className="w-full rounded-2xl border border-rose-400/30 bg-rose-500/10 px-5 py-3 text-center text-[14px] text-rose-200">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="group relative w-full overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#7c5cff_0%,#9b7fff_100%)] px-8 py-5 text-base font-semibold text-white shadow-[0_20px_60px_rgba(124,92,255,0.4)] transition-all duration-300 enabled:hover:scale-[1.01] enabled:hover:shadow-[0_22px_70px_rgba(124,92,255,0.5)] disabled:opacity-40 disabled:cursor-not-allowed sm:w-auto sm:min-w-[300px]"
          >
            <span className="relative z-10">
              {!theme
                ? '테마를 선택하세요'
                : reportTier !== 'premium'
                  ? '무료 운명 지도로 가기'
                  : `${heroTitle} 만들기 →`}
            </span>
          </button>
          <p className="text-[11px] text-slate-500">
            ※ 8,000~10,000자 long-form · 사주·점성 50:50 · Tier 1-4 깊이
          </p>
        </section>
      </div>
    </div>
  )
}

export default function ThemedBuilderPage() {
  return (
    <Suspense fallback={<UnifiedServiceLoading kind="aiReport" locale="ko" />}>
      <ThemedBuilderContent />
    </Suspense>
  )
}
