'use client'

export const dynamic = 'force-dynamic'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Calendar,
  Sparkles,
  MessageCircle,
  Wand2,
  ArrowRight,
  Coins,
  Clock,
  ScrollText,
} from 'lucide-react'
import BackButton from '@/components/ui/BackButton'
import AuthGate from '@/components/auth/AuthGate'
import { useI18n } from '@/i18n/I18nProvider'
import { buildSignInUrl } from '@/lib/auth/signInUrl'
import { logger } from '@/lib/logger'

type ServiceKey = 'calendar' | 'report' | 'counselor' | 'tarot'

interface ServiceRecord {
  id: string
  date: string
  service: string
  theme?: string | null
  summary?: string | null
  type: string
}

interface DailyHistory {
  date: string
  records: ServiceRecord[]
}

interface CreditsBalance {
  credits?: { remaining?: number; total?: number; monthly?: number; bonus?: number }
}

interface ProfileMeta {
  createdAt?: string
}

const SERVICE_LABELS: Record<ServiceKey, { ko: string; Icon: typeof Calendar; accent: string }> = {
  calendar: { ko: '캘린더', Icon: Calendar, accent: '#22d3ee' },
  report: { ko: '리포트', Icon: Sparkles, accent: '#a78bfa' },
  counselor: { ko: '카운슬러', Icon: MessageCircle, accent: '#f59e0b' },
  tarot: { ko: '타로', Icon: Wand2, accent: '#f472b6' },
}

function classifyService(serviceId: string): ServiceKey {
  if (serviceId === 'tarot') return 'tarot'
  if (serviceId === 'destiny-calendar' || serviceId === 'daily-fortune') return 'calendar'
  if (serviceId === 'destiny-counselor' || serviceId === 'compatibility') return 'counselor'
  return 'report'
}

function daysSince(iso?: string): number {
  if (!iso) return 0
  const ms = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}일 전`
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

export default function ProfilePage() {
  const { status } = useSession()
  const { t } = useI18n()
  const signInUrl = buildSignInUrl('/profile')

  const [profile, setProfile] = useState<{ name?: string; email?: string; image?: string } | null>(
    null
  )
  const [meta, setMeta] = useState<ProfileMeta>({})
  const [history, setHistory] = useState<DailyHistory[]>([])
  const [credits, setCredits] = useState<CreditsBalance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false

    const load = async () => {
      try {
        const [profileRes, historyRes, creditsRes] = await Promise.all([
          fetch('/api/me/profile').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/me/history?limit=30').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/me/credits').then((r) => (r.ok ? r.json() : null)),
        ])
        if (cancelled) return

        if (profileRes?.data) {
          setProfile({
            name: profileRes.data.name,
            email: profileRes.data.email,
            image: profileRes.data.image,
          })
          setMeta({ createdAt: profileRes.data.createdAt })
        }

        const days = historyRes?.data?.history || historyRes?.history || []
        setHistory(Array.isArray(days) ? days : [])

        setCredits(creditsRes?.data || creditsRes || null)
      } catch (err) {
        logger.warn('[profile] load failed', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [status])

  const counts: Record<ServiceKey, number> = { calendar: 0, report: 0, counselor: 0, tarot: 0 }
  for (const day of history) {
    for (const rec of day.records || []) {
      counts[classifyService(rec.service)] += 1
    }
  }
  const totalReadings = counts.calendar + counts.report + counts.counselor + counts.tarot
  const memberDays = daysSince(meta.createdAt)
  const remainingCredits = credits?.credits?.remaining ?? 0

  return (
    <AuthGate
      statusOverride={status}
      callbackUrl="/profile"
      fallback={
        <div className="relative min-h-[100svh] overflow-hidden bg-[#03060d] text-slate-100">
          <div className="fixed left-4 top-4 z-30">
            <BackButton />
          </div>
          <div className="mx-auto flex min-h-[100svh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
            <h1 className="text-balance text-3xl font-semibold leading-[1.15] tracking-[-0.025em] text-white">
              {t('profile.loginRequired', '로그인하면 나의 여정이 시작돼요')}
            </h1>
            <p className="text-[15px] leading-relaxed text-slate-400">
              {t(
                'profile.loginDesc',
                '리딩 기록, 결정 일지, 크레딧 사용 내역을 한곳에서 볼 수 있어요.'
              )}
            </p>
            <Link
              href={signInUrl}
              className="mt-3 rounded-2xl bg-[linear-gradient(135deg,#7c5cff_0%,#9b7fff_100%)] px-7 py-3 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(124,92,255,0.35)] transition hover:opacity-90"
            >
              {t('common.login', '로그인')}
            </Link>
          </div>
        </div>
      }
    >
      <div className="relative min-h-[100svh] overflow-hidden bg-[#03060d] text-slate-100">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-[-180px] h-[420px] w-[420px] rounded-full bg-gradient-to-br from-violet-500/16 to-fuchsia-500/0 blur-3xl" />
          <div className="absolute bottom-[-220px] right-[-110px] h-[460px] w-[460px] rounded-full bg-gradient-to-br from-cyan-400/14 to-blue-500/0 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(18,28,44,0.52)_0%,rgba(3,6,13,0.96)_58%,rgba(3,6,13,1)_100%)]" />
        </div>

        <div className="relative z-10">
          <div className="fixed left-4 top-4 z-30">
            <BackButton />
          </div>

          <div className="mx-auto max-w-4xl px-5 pb-20 pt-12 sm:px-6 sm:pt-16">
            {/* Hero */}
            <header className="space-y-5 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300">
                나의 여정
              </p>
              <div className="flex flex-col items-center gap-4">
                {profile?.image ? (
                  <Image
                    src={profile.image}
                    alt={profile.name || 'User'}
                    width={88}
                    height={88}
                    className="rounded-full border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
                  />
                ) : (
                  <div className="flex h-[88px] w-[88px] items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-2xl font-semibold text-white">
                    {profile?.name?.[0] || '·'}
                  </div>
                )}
                <div>
                  <h1 className="text-balance text-3xl font-semibold leading-[1.15] tracking-[-0.025em] text-white sm:text-4xl">
                    {profile?.name || '게스트'}
                  </h1>
                  {profile?.email && (
                    <p className="mt-1 text-[13px] text-slate-400">{profile.email}</p>
                  )}
                </div>
              </div>
            </header>

            {/* Stat Cards */}
            <section className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                Icon={ScrollText}
                value={loading ? '·' : String(totalReadings)}
                label="총 리딩"
                accent="#22d3ee"
              />
              <StatCard
                Icon={Coins}
                value={loading ? '·' : String(remainingCredits)}
                label="남은 크레딧"
                accent="#a78bfa"
              />
              <StatCard
                Icon={Clock}
                value={loading ? '·' : `${memberDays}일`}
                label="함께한 날"
                accent="#f59e0b"
              />
              <StatCard
                Icon={Sparkles}
                value={loading ? '·' : String(history.length)}
                label="활동 일자"
                accent="#f472b6"
              />
            </section>

            {/* Service breakdown */}
            <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                  서비스별 이용
                </h2>
                <Link
                  href="/profile/decisions"
                  className="inline-flex items-center gap-1 text-[12px] text-slate-300 transition hover:text-white"
                >
                  결정 기록 <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {(Object.keys(SERVICE_LABELS) as ServiceKey[]).map((key) => {
                  const sm = SERVICE_LABELS[key]
                  const ServiceIcon = sm.Icon
                  const count = counts[key]
                  return (
                    <div
                      key={key}
                      className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-lg"
                          style={{ background: `${sm.accent}1f`, color: sm.accent }}
                        >
                          <ServiceIcon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[12px] font-medium text-slate-300">{sm.ko}</span>
                      </div>
                      <p className="mt-2.5 text-[1.5rem] font-semibold leading-none text-white">
                        {loading ? '·' : count}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">회 이용</p>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Recent activity */}
            <section className="mt-8">
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                최근 활동
              </h2>
              <div className="mt-3 space-y-2">
                {loading && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-center text-[13px] text-slate-500">
                    불러오는 중...
                  </div>
                )}
                {!loading && history.length === 0 && (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center">
                    <p className="text-[14px] text-slate-300">아직 활동 기록이 없어요</p>
                    <p className="mt-1 text-[12px] text-slate-500">
                      4개 서비스 중 하나를 시작해보세요
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <Link
                        href="/destiny-counselor"
                        className="rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-[12px] text-slate-200 transition hover:border-cyan-300/40"
                      >
                        카운슬러
                      </Link>
                      <Link
                        href="/calendar"
                        className="rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-[12px] text-slate-200 transition hover:border-cyan-300/40"
                      >
                        캘린더
                      </Link>
                      <Link
                        href="/tarot"
                        className="rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-[12px] text-slate-200 transition hover:border-cyan-300/40"
                      >
                        타로
                      </Link>
                      <Link
                        href="/premium-reports"
                        className="rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-[12px] text-slate-200 transition hover:border-cyan-300/40"
                      >
                        리포트
                      </Link>
                    </div>
                  </div>
                )}
                {!loading &&
                  history.slice(0, 8).flatMap((day) =>
                    day.records.slice(0, 3).map((rec) => {
                      const key = classifyService(rec.service)
                      const sm = SERVICE_LABELS[key]
                      const ServiceIcon = sm.Icon
                      return (
                        <div
                          key={`${day.date}-${rec.id}`}
                          className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3.5"
                        >
                          <div
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                            style={{ background: `${sm.accent}1f`, color: sm.accent }}
                          >
                            <ServiceIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13.5px] font-medium text-white">
                              {sm.ko}
                              {rec.theme ? ` · ${rec.theme}` : ''}
                            </p>
                            {rec.summary && (
                              <p className="mt-0.5 truncate text-[12px] text-slate-400">
                                {rec.summary}
                              </p>
                            )}
                          </div>
                          <span className="flex-shrink-0 text-[11px] text-slate-500">
                            {formatRelative(rec.date)}
                          </span>
                        </div>
                      )
                    })
                  )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </AuthGate>
  )
}

function StatCard({
  Icon,
  value,
  label,
  accent,
}: {
  Icon: typeof Calendar
  value: string
  label: string
  accent: string
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-md">
      <div
        className="flex h-7 w-7 items-center justify-center rounded-lg"
        style={{ background: `${accent}1f`, color: accent }}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <p className="mt-3 text-[1.5rem] font-semibold leading-none text-white">{value}</p>
      <p className="mt-1 text-[11.5px] text-slate-500">{label}</p>
    </div>
  )
}
