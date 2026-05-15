'use client'

export const dynamic = 'force-dynamic'

import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  MapPin,
  User as UserIcon,
  Pencil,
  Plus,
  Trash2,
  Heart,
  MessageCircle,
  Wand2,
  ArrowRight,
  Users,
} from 'lucide-react'
import AuthGate from '@/components/auth/AuthGate'
import { useI18n } from '@/i18n/I18nProvider'
import { buildSignInUrl } from '@/lib/auth/signInUrl'
import { logger } from '@/lib/logger'
import { ProfileEditModal } from './components/ProfileEditModal'
import { CircleAddModal } from './components/CircleAddModal'

type Locale = 'ko' | 'en'

interface MeProfile {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
  createdAt?: string
  profilePhoto?: string | null
  birthDate?: string | null
  birthTime?: string | null
  gender?: string | null
  birthCity?: string | null
  tzId?: string | null
}

interface SavedPerson {
  id: string
  name: string
  relation: string
  birthDate?: string | null
  birthTime?: string | null
  gender?: string | null
  birthCity?: string | null
  latitude?: number | null
  longitude?: number | null
  tzId?: string | null
}

interface HistoryRecord {
  id: string
  date: string
  service: string
  theme?: string | null
  summary?: string | null
  type: string
}

interface DailyHistory {
  date: string
  records: HistoryRecord[]
}

function classifyService(serviceId: string): {
  key: 'counselor' | 'compatibility' | 'tarot' | 'other'
  href: string
  Icon: typeof Calendar
  accent: string
} {
  if (serviceId === 'tarot')
    return { key: 'tarot', href: '/tarot', Icon: Wand2, accent: '#f472b6' }
  if (serviceId === 'compatibility' || serviceId === 'compat-counselor')
    return {
      key: 'compatibility',
      href: '/compatibility/counselor',
      Icon: Heart,
      accent: '#fb7185',
    }
  if (
    serviceId === 'destiny-counselor' ||
    serviceId === 'counselor' ||
    serviceId === 'destiny-map'
  )
    return {
      key: 'counselor',
      href: '/destiny-counselor',
      Icon: MessageCircle,
      accent: '#f59e0b',
    }
  return { key: 'other', href: '/profile', Icon: Calendar, accent: '#22d3ee' }
}

function formatBirthDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return locale === 'ko' ? '미입력' : 'Not set'
  // birthDate is stored as 'YYYY-MM-DD' string. Display nicely without
  // letting Date() reinterpret in the local timezone.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const [, y, mo, d] = m
  return locale === 'ko' ? `${y}년 ${Number(mo)}월 ${Number(d)}일` : `${mo}/${d}/${y}`
}

function formatRelative(iso: string, locale: Locale): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return locale === 'ko' ? '방금 전' : 'just now'
  if (min < 60) return locale === 'ko' ? `${min}분 전` : `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return locale === 'ko' ? `${hr}시간 전` : `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return locale === 'ko' ? `${day}일 전` : `${day}d ago`
  return new Date(iso).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function genderLabel(g: string | null | undefined, locale: Locale): string {
  if (!g) return locale === 'ko' ? '미입력' : 'Not set'
  const norm = g.toLowerCase()
  if (norm === 'm' || norm === 'male') return locale === 'ko' ? '남성' : 'Male'
  if (norm === 'f' || norm === 'female') return locale === 'ko' ? '여성' : 'Female'
  return locale === 'ko' ? '미입력' : 'Not set'
}

function relationLabel(r: string, locale: Locale): string {
  if (locale === 'en') {
    const m: Record<string, string> = {
      family: 'Family',
      friend: 'Friend',
      partner: 'Partner',
      colleague: 'Colleague',
    }
    return m[r] ?? r
  }
  const m: Record<string, string> = {
    family: '가족',
    friend: '친구',
    partner: '연인',
    colleague: '동료',
  }
  return m[r] ?? r
}

export default function ProfilePage() {
  const { status } = useSession()
  const { t, locale: rawLocale } = useI18n()
  const locale: Locale = rawLocale === 'en' ? 'en' : 'ko'
  const signInUrl = buildSignInUrl('/profile')

  const [profile, setProfile] = useState<MeProfile | null>(null)
  const [circle, setCircle] = useState<SavedPerson[]>([])
  const [history, setHistory] = useState<DailyHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [circleOpen, setCircleOpen] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [profileRes, circleRes, historyRes] = await Promise.all([
        fetch('/api/me/profile').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/me/circle').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/me/history?limit=20').then((r) => (r.ok ? r.json() : null)),
      ])

      // /api/me/profile returns { user: {...} } directly (no envelope).
      if (profileRes?.user) setProfile(profileRes.user)

      // /api/me/circle goes through withApiMiddleware, so the envelope is
      // { success: true, data: { people, pagination } }.
      const people =
        circleRes?.data?.people || circleRes?.people || []
      setCircle(Array.isArray(people) ? people : [])

      const days = historyRes?.data?.history || historyRes?.history || []
      setHistory(Array.isArray(days) ? days : [])
    } catch (err) {
      logger.warn('[profile] load failed', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') void loadAll()
  }, [status, loadAll])

  const handleDeletePerson = async (id: string, name: string) => {
    const ok = window.confirm(
      locale === 'ko'
        ? `'${name}' 을(를) 지인 목록에서 삭제할까요?`
        : `Remove '${name}' from your circle?`,
    )
    if (!ok) return
    try {
      const res = await fetch(`/api/me/circle?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setCircle((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      logger.warn('[profile/circle] delete failed', err)
      window.alert(
        locale === 'ko'
          ? '삭제에 실패했어요. 잠시 후 다시 시도해 주세요.'
          : 'Failed to delete. Please try again in a moment.',
      )
    }
  }

  const flatRecords = history.flatMap((d) => d.records).slice(0, 8)

  return (
    <AuthGate
      statusOverride={status}
      callbackUrl="/profile"
      fallback={
        <div className="relative min-h-[100svh] overflow-hidden bg-[#03060d] text-slate-100">
          <div className="mx-auto flex min-h-[100svh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
            <h1 className="text-balance text-3xl font-semibold leading-[1.15] tracking-[-0.025em] text-white">
              {t('profile.loginRequired', '로그인하면 나의 여정이 시작돼요')}
            </h1>
            <p className="text-[15px] leading-relaxed text-slate-400">
              {t(
                'profile.loginDesc',
                '내 정보, 지인 목록, 최근 상담 기록을 한 곳에서 볼 수 있어요.',
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
          <div className="mx-auto max-w-3xl px-5 pb-24 pt-20 sm:px-6 sm:pt-24">
            {/* Hero */}
            <header className="flex flex-col items-center gap-4 text-center">
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
                  {profile?.name?.[0]?.toUpperCase() || '·'}
                </div>
              )}
              <div>
                <h1 className="text-balance text-[1.85rem] font-semibold leading-[1.15] tracking-[-0.025em] text-white">
                  {profile?.name ||
                    (locale === 'ko' ? '이름을 알려주세요' : 'Set your name')}
                </h1>
                {profile?.email && (
                  <p className="mt-1 text-[13px] text-slate-400">{profile.email}</p>
                )}
              </div>
            </header>

            {/* My Info */}
            <section className="mt-9 rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                  {locale === 'ko' ? '내 정보' : 'My info'}
                </h2>
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] text-slate-200 transition hover:border-cyan-300/40 hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {locale === 'ko' ? '수정' : 'Edit'}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <InfoRow
                  Icon={Calendar}
                  label={locale === 'ko' ? '생년월일' : 'Birth date'}
                  value={formatBirthDate(profile?.birthDate, locale)}
                  loading={loading}
                />
                <InfoRow
                  Icon={Clock}
                  label={locale === 'ko' ? '출생 시간' : 'Birth time'}
                  value={
                    profile?.birthTime || (locale === 'ko' ? '미입력' : 'Not set')
                  }
                  loading={loading}
                />
                <InfoRow
                  Icon={MapPin}
                  label={locale === 'ko' ? '출생 도시' : 'Birth city'}
                  value={
                    profile?.birthCity || (locale === 'ko' ? '미입력' : 'Not set')
                  }
                  loading={loading}
                />
                <InfoRow
                  Icon={UserIcon}
                  label={locale === 'ko' ? '성별' : 'Gender'}
                  value={genderLabel(profile?.gender, locale)}
                  loading={loading}
                />
              </div>
            </section>

            {/* My Circle */}
            <section className="mt-7 rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                  <Users className="h-3.5 w-3.5" />
                  {locale === 'ko' ? '내 지인' : 'My circle'}
                </h2>
                <button
                  type="button"
                  onClick={() => setCircleOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-[12px] text-cyan-100 transition hover:border-cyan-300/50 hover:bg-cyan-300/15"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {locale === 'ko' ? '추가' : 'Add'}
                </button>
              </div>

              {loading ? (
                <p className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-center text-[13px] text-slate-500">
                  {locale === 'ko' ? '불러오는 중...' : 'Loading...'}
                </p>
              ) : circle.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center">
                  <p className="text-[14px] text-slate-300">
                    {locale === 'ko'
                      ? '아직 등록한 지인이 없어요'
                      : 'No one in your circle yet'}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500">
                    {locale === 'ko'
                      ? '지인의 생년월일을 저장해두면 궁합 상담을 더 빠르게 받을 수 있어요'
                      : 'Save birth info to speed up compatibility readings'}
                  </p>
                </div>
              ) : (
                <ul className="mt-4 space-y-2">
                  {circle.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-3"
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[13px] font-semibold text-white">
                        {p.name[0]?.toUpperCase() || '·'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-[14px] font-medium text-white">
                          {p.name}
                          <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10.5px] font-normal uppercase tracking-wider text-slate-300">
                            {relationLabel(p.relation, locale)}
                          </span>
                        </p>
                        <p className="mt-0.5 truncate text-[11.5px] text-slate-500">
                          {[
                            formatBirthDate(p.birthDate, locale),
                            p.birthTime ?? null,
                            p.birthCity ?? null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeletePerson(p.id, p.name)}
                        className="rounded-full p-1.5 text-slate-500 transition hover:bg-rose-500/15 hover:text-rose-300"
                        aria-label={locale === 'ko' ? '삭제' : 'Delete'}
                        title={locale === 'ko' ? '삭제' : 'Delete'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Recent activity */}
            <section className="mt-7 rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                  {locale === 'ko' ? '최근 활동' : 'Recent activity'}
                </h2>
                <Link
                  href="/profile/decisions"
                  className="inline-flex items-center gap-1 text-[12px] text-slate-300 transition hover:text-white"
                >
                  {locale === 'ko' ? '결정 기록' : 'Decision log'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {loading ? (
                <p className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-center text-[13px] text-slate-500">
                  {locale === 'ko' ? '불러오는 중...' : 'Loading...'}
                </p>
              ) : flatRecords.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center">
                  <p className="text-[14px] text-slate-300">
                    {locale === 'ko'
                      ? '아직 활동 기록이 없어요'
                      : 'No activity yet'}
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <Link
                      href="/destiny-counselor"
                      className="rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-[12px] text-slate-200 transition hover:border-cyan-300/40"
                    >
                      {locale === 'ko' ? '운명 상담사' : 'Destiny counselor'}
                    </Link>
                    <Link
                      href="/compatibility"
                      className="rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-[12px] text-slate-200 transition hover:border-cyan-300/40"
                    >
                      {locale === 'ko' ? '궁합' : 'Compatibility'}
                    </Link>
                    <Link
                      href="/tarot"
                      className="rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-[12px] text-slate-200 transition hover:border-cyan-300/40"
                    >
                      {locale === 'ko' ? '타로' : 'Tarot'}
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className="mt-4 space-y-2">
                  {flatRecords.map((rec) => {
                    const meta = classifyService(rec.service)
                    const ServiceIcon = meta.Icon
                    return (
                      <li key={rec.id}>
                        <Link
                          href={meta.href}
                          className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-3 transition hover:border-white/15 hover:bg-white/[0.04]"
                        >
                          <div
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                            style={{
                              background: `${meta.accent}1f`,
                              color: meta.accent,
                            }}
                          >
                            <ServiceIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13.5px] font-medium text-white">
                              {rec.theme || rec.service}
                            </p>
                            {rec.summary && (
                              <p className="mt-0.5 truncate text-[12px] text-slate-400">
                                {rec.summary}
                              </p>
                            )}
                          </div>
                          <span className="flex-shrink-0 text-[11px] text-slate-500">
                            {formatRelative(rec.date, locale)}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>

        <ProfileEditModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          initial={{
            name: profile?.name ?? null,
            birthDate: profile?.birthDate ?? null,
            birthTime: profile?.birthTime ?? null,
            gender: profile?.gender ?? null,
            birthCity: profile?.birthCity ?? null,
            tzId: profile?.tzId ?? null,
          }}
          locale={locale}
          onSaved={() => void loadAll()}
        />

        <CircleAddModal
          open={circleOpen}
          onClose={() => setCircleOpen(false)}
          locale={locale}
          onAdded={() => void loadAll()}
        />
      </div>
    </AuthGate>
  )
}

function InfoRow({
  Icon,
  label,
  value,
  loading,
}: {
  Icon: typeof Calendar
  label: string
  value: string
  loading: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-slate-300">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 truncate text-[13.5px] text-white">
          {loading ? '·' : value}
        </p>
      </div>
    </div>
  )
}
