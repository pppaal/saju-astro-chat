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
    label: '??/?? ???',
    description: '?? ??, ?? ??, ?? ???? ?? ?????.',
    credits: 3,
    color: 'from-pink-500 to-rose-500',
    icon: Heart,
    sections: ['?? ??', '?? ??', '?? ??', '?? ???'],
  },
  career: {
    label: '??? ???',
    description: '?? ??, ?? ???, ???? ??? ?????.',
    credits: 3,
    color: 'from-blue-500 to-indigo-500',
    icon: Briefcase,
    sections: ['?? ???', '??? ??', '?? ???', '?? ??'],
  },
  wealth: {
    label: '?? ???',
    description: '??/?? ??? ?? ???? ??? ?????.',
    credits: 3,
    color: 'from-amber-500 to-orange-500',
    icon: Coins,
    sections: ['?? ??', '?? ??', '?? ??', '?? ??'],
  },
  health: {
    label: '?? ???',
    description: '?? ??, ?? ??, ?? ?? ???? ?????.',
    credits: 3,
    color: 'from-emerald-500 to-teal-500',
    icon: HeartPulse,
    sections: ['??? ??', '?? ??', '?? ??', '?? ??'],
  },
  family: {
    label: '??/?? ???',
    description: '?? ? ??, ?? ??, ?? ?? ???? ?????.',
    credits: 3,
    color: 'from-violet-500 to-purple-500',
    icon: Users,
    sections: ['?? ??', '?? ??', '?? ??', '?? ??'],
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
      setError('??? ??????.')
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
          theme: selectedTheme,
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
          reportType: 'themed',
          theme: selectedTheme,
          createdAt: new Date().toISOString(),
          report: data.report,
        })
      }

      analytics.matrixGenerate('premium-reports/themed')
      router.push(`/premium-reports/result/${data.report.id}?type=themed`)
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
      <PremiumPageScaffold accent="violet">
        <header className="px-4 py-10">
          <div className="mx-auto max-w-5xl">
            <Link
              href="/premium-reports"
              className="inline-flex items-center rounded-full border border-white/15 bg-slate-900/60 px-3 py-1 text-sm text-slate-300 backdrop-blur-xl hover:border-cyan-300/60 hover:text-white"
            >
              ??? ???? ????
            </Link>
            <div className="mt-5 rounded-3xl border border-white/15 bg-slate-900/60 p-7 backdrop-blur-xl">
              <div className="inline-flex rounded-full border border-violet-300/40 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-200">
                Themed
              </div>
              <h1 className="mt-3 text-3xl font-black text-white">?? ???</h1>
              <p className="mt-2 text-slate-300">??? ??? ??? ??? ?? ???? ?? ?????.</p>
              <p className="mt-3 text-xs font-semibold text-violet-200">3 credits ? Premium ??</p>
            </div>
          </div>
        </header>

        <main className="mx-auto grid max-w-5xl gap-6 px-4 pb-20 lg:grid-cols-[1.1fr_1fr]">
          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-white">?? ??</h2>
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
                  {THEME_INFO[selectedTheme].label} ?? ??
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
              className={`w-full rounded-xl px-4 py-4 text-center text-sm font-semibold text-white transition ${
                canGenerate
                  ? `bg-gradient-to-r ${selectedTheme ? THEME_INFO[selectedTheme].color : 'from-cyan-500 to-blue-500'} hover:brightness-110`
                  : 'cursor-not-allowed bg-slate-700'
              }`}
            >
              {isGenerating
                ? '??? ?? ?...'
                : selectedTheme
                  ? `${THEME_INFO[selectedTheme].label} ????`
                  : '??? ??????'}
            </button>

            <p className="text-center text-xs text-slate-500">
              ??? ???? My Journey?? ?? ??? ? ????.
            </p>
          </section>
        </main>
      </PremiumPageScaffold>
    </>
  )
}
