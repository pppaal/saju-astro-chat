'use client'

export const dynamic = 'force-dynamic'

import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
  Coins,
  Crown,
  Receipt,
  Gift,
  Share2,
  Copy,
  Check,
  UserPlus,
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

type PlanId = 'free' | 'starter' | 'pro' | 'premium'

interface CreditsResponse {
  plan: PlanId
  credits: {
    monthly: number
    used: number
    bonus: number
    remaining: number
    total: number
  }
  compatibility: { used: number; limit: number; remaining: number }
  followUp: { used: number; limit: number; remaining: number }
  periodEnd: string | null
  historyRetention: number
}

interface SubscriptionSummary {
  status: string
  plan: string
  billingCycle: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  canceledAt: string | null
  paymentMethod: string | null
  createdAt: string
}

interface PurchaseRow {
  id: string
  createdAt: string
  amount: number
  remaining: number
  expiresAt: string
  expired: boolean
  source: string
}

interface PurchasesResponse {
  subscription: SubscriptionSummary | null
  purchases: PurchaseRow[]
}

interface ReferralResponse {
  referralCode: string
  stats: {
    total: number
    completed: number
    pending: number
    creditsEarned: number
  }
  referralUrl: string
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
      // Enter via the /compatibility form (carries 지인 불러오기 / 직접 입력)
      // so two people are picked before the counselor, which has no
      // person-picker of its own.
      key: 'compatibility',
      href: '/compatibility',
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

const PLAN_DISPLAY: Record<PlanId, { ko: string; en: string; accent: string }> = {
  free: { ko: 'Free', en: 'Free', accent: '#94a3b8' },
  starter: { ko: 'Starter', en: 'Starter', accent: '#22d3ee' },
  pro: { ko: 'Pro', en: 'Pro', accent: '#a78bfa' },
  premium: { ko: 'Premium', en: 'Premium', accent: '#f59e0b' },
}

function planDisplay(plan: string, locale: Locale): { label: string; accent: string } {
  const key = (plan as PlanId) in PLAN_DISPLAY ? (plan as PlanId) : 'free'
  const entry = PLAN_DISPLAY[key]
  return { label: locale === 'ko' ? entry.ko : entry.en, accent: entry.accent }
}

function formatDateOnly(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return locale === 'ko' ? '—' : '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function purchaseSourceLabel(source: string, locale: Locale): string {
  if (locale === 'en') {
    const m: Record<string, string> = {
      purchase: 'Purchased',
      referral: 'Referral',
      promotion: 'Promotion',
      gift: 'Gift',
    }
    return m[source] ?? source
  }
  const m: Record<string, string> = {
    purchase: '구매',
    referral: '추천 보상',
    promotion: '프로모션',
    gift: '선물',
  }
  return m[source] ?? source
}

function relationLabel(r: string, locale: Locale): string {
  // Keep in sync with CircleAddModal options + compatibility Relation
  // union. 'partner' stays in the map for backward compatibility with
  // rows saved before we standardized on 'lover'.
  if (locale === 'en') {
    const m: Record<string, string> = {
      lover: 'Lover',
      spouse: 'Spouse',
      family: 'Family',
      sibling: 'Sibling',
      friend: 'Friend',
      colleague: 'Colleague',
      other: 'Other',
      partner: 'Lover',
    }
    return m[r] ?? r
  }
  const m: Record<string, string> = {
    lover: '연인',
    spouse: '배우자',
    family: '가족',
    sibling: '형제자매',
    friend: '친구',
    colleague: '동료',
    other: '기타',
    partner: '연인',
  }
  return m[r] ?? r
}

export default function ProfilePage() {
  const { status } = useSession()
  const { locale: rawLocale } = useI18n()
  const locale: Locale = rawLocale === 'en' ? 'en' : 'ko'
  const signInUrl = buildSignInUrl('/profile')
  const router = useRouter()

  // 비로그인 = 자동 sign-in 페이지로 redirect. AuthGate fallback 의 다크
  // 로그인 wall 은 노출 안 됨 (잠깐 빈 화면만 보임). 로그인 끝나면
  // signInUrl 의 callbackUrl(/profile) 로 돌아옴.
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(signInUrl)
    }
  }, [status, router, signInUrl])

  const [profile, setProfile] = useState<MeProfile | null>(null)
  const [circle, setCircle] = useState<SavedPerson[]>([])
  const [history, setHistory] = useState<DailyHistory[]>([])
  const [credits, setCredits] = useState<CreditsResponse | null>(null)
  const [purchases, setPurchases] = useState<PurchasesResponse | null>(null)
  const [referral, setReferral] = useState<ReferralResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [circleOpen, setCircleOpen] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [profileRes, circleRes, historyRes, creditsRes, purchasesRes, referralRes] =
        await Promise.all([
          fetch('/api/me/profile').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/me/circle').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/me/history?limit=20').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/me/credits').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/me/purchases').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/referral/me').then((r) => (r.ok ? r.json() : null)),
        ])

      // /api/me/profile returns { user: {...} } directly (no envelope).
      if (profileRes?.user) setProfile(profileRes.user)

      // The other endpoints all flow through withApiMiddleware, so the
      // envelope is { success: true, data: {...} }.
      const people = circleRes?.data?.people || circleRes?.people || []
      setCircle(Array.isArray(people) ? people : [])

      const days = historyRes?.data?.history || historyRes?.history || []
      setHistory(Array.isArray(days) ? days : [])

      const cr = creditsRes?.data || creditsRes
      if (cr && typeof cr === 'object' && 'plan' in cr) setCredits(cr as CreditsResponse)

      const pr = purchasesRes?.data || purchasesRes
      if (pr && typeof pr === 'object' && 'purchases' in pr) {
        setPurchases(pr as PurchasesResponse)
      }

      const rr = referralRes?.data || referralRes
      if (rr && typeof rr === 'object' && 'referralCode' in rr) {
        setReferral(rr as ReferralResponse)
      }
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

  const handleCopyReferral = async () => {
    if (!referral?.referralUrl) return
    try {
      await navigator.clipboard.writeText(referral.referralUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch (err) {
      logger.warn('[profile/referral] clipboard failed', err)
    }
  }

  const handleShareReferral = async () => {
    if (!referral?.referralUrl) return
    const text =
      locale === 'ko'
        ? `데스티니팔에서 함께해요! ${referral.referralUrl}`
        : `Join me on DestinyPal! ${referral.referralUrl}`
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (navigator as Navigator & { share: (data: ShareData) => Promise<void> }).share({
          title: 'DestinyPal',
          text,
          url: referral.referralUrl,
        })
        return
      } catch {
        // user cancelled or share not supported — fall through to copy
      }
    }
    void handleCopyReferral()
  }

  const flatRecords = history.flatMap((d) => d.records).slice(0, 8)

  return (
    <AuthGate
      statusOverride={status}
      callbackUrl="/profile"
      fallback={
        // 비로그인 fallback — 자동 redirect 가 거의 즉시 일어나므로 빈 화면.
        // 깜빡임 줄이려고 배경색만 메인 다크와 맞춤.
        <div className="min-h-[100svh] bg-[#03060d]" aria-hidden="true" />
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

            {/* Credits */}
            <section className="mt-7 rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                  <Coins className="h-3.5 w-3.5" />
                  {locale === 'ko' ? '크레딧' : 'Credits'}
                </h2>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1 text-[12px] text-slate-300 transition hover:text-white"
                >
                  {locale === 'ko' ? '크레딧 충전' : 'Top up'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {loading ? (
                <p className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-center text-[13px] text-slate-500">
                  {locale === 'ko' ? '불러오는 중...' : 'Loading...'}
                </p>
              ) : !credits ? (
                <p className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-center text-[13px] text-slate-500">
                  {locale === 'ko' ? '크레딧 정보를 불러올 수 없어요' : 'Could not load credit info'}
                </p>
              ) : (
                <>
                  <div className="mt-4 flex items-end justify-between gap-4 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-amber-500/[0.08] to-fuchsia-500/[0.04] px-4 py-4">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-200/70">
                        {locale === 'ko' ? '남은 크레딧' : 'Remaining'}
                      </p>
                      <p className="mt-1 text-[2rem] font-semibold leading-none text-white">
                        {credits.credits.remaining}
                      </p>
                      <p className="mt-1.5 text-[11.5px] text-slate-400">
                        {locale === 'ko'
                          ? `이번 달 ${credits.credits.monthly} · 보너스 ${credits.credits.bonus}`
                          : `Monthly ${credits.credits.monthly} · Bonus ${credits.credits.bonus}`}
                      </p>
                    </div>
                    <div className="text-right text-[11px] text-slate-400">
                      <p>{locale === 'ko' ? '다음 갱신' : 'Resets'}</p>
                      <p className="mt-0.5 text-[12px] text-slate-200">
                        {formatDateOnly(credits.periodEnd, locale)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <UsageMini
                      label={locale === 'ko' ? '궁합 상담' : 'Compatibility'}
                      used={credits.compatibility.used}
                      limit={credits.compatibility.limit}
                      accent="#fb7185"
                    />
                    <UsageMini
                      label={locale === 'ko' ? '추가 질문' : 'Follow-ups'}
                      used={credits.followUp.used}
                      limit={credits.followUp.limit}
                      accent="#22d3ee"
                    />
                  </div>
                </>
              )}
            </section>

            {/* Membership */}
            <section className="mt-7 rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md sm:p-6">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                  <Crown className="h-3.5 w-3.5" />
                  {locale === 'ko' ? '멤버십' : 'Membership'}
                </h2>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1 text-[12px] text-slate-300 transition hover:text-white"
                >
                  {credits?.plan && credits.plan !== 'free'
                    ? locale === 'ko'
                      ? '관리'
                      : 'Manage'
                    : locale === 'ko'
                      ? '플랜 보기'
                      : 'View plans'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {loading ? (
                <p className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-center text-[13px] text-slate-500">
                  {locale === 'ko' ? '불러오는 중...' : 'Loading...'}
                </p>
              ) : (
                <div className="mt-4 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-4 py-4">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const pd = planDisplay(credits?.plan ?? 'free', locale)
                      return (
                        <span
                          className="rounded-full border px-3 py-1 text-[12px] font-semibold tracking-wide"
                          style={{
                            color: pd.accent,
                            borderColor: `${pd.accent}55`,
                            background: `${pd.accent}10`,
                          }}
                        >
                          {pd.label}
                        </span>
                      )
                    })()}
                    {purchases?.subscription?.billingCycle && (
                      <span className="text-[12px] text-slate-400">
                        {purchases.subscription.billingCycle === 'annual'
                          ? locale === 'ko'
                            ? '연 결제'
                            : 'Annual'
                          : locale === 'ko'
                            ? '월 결제'
                            : 'Monthly'}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
                    <div>
                      <p className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-slate-500">
                        {locale === 'ko' ? '다음 갱신일' : 'Next renewal'}
                      </p>
                      <p className="mt-1 text-slate-200">
                        {formatDateOnly(
                          purchases?.subscription?.currentPeriodEnd ?? credits?.periodEnd,
                          locale,
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-slate-500">
                        {locale === 'ko' ? '히스토리 보관' : 'History retention'}
                      </p>
                      <p className="mt-1 text-slate-200">
                        {credits?.historyRetention
                          ? `${credits.historyRetention}${locale === 'ko' ? '일' : ' days'}`
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {purchases?.subscription?.cancelAtPeriodEnd && (
                    <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11.5px] text-amber-200">
                      {locale === 'ko'
                        ? '다음 갱신일에 멤버십이 종료됩니다.'
                        : 'Membership will end at the next renewal date.'}
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* Purchases */}
            <section className="mt-7 rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md sm:p-6">
              <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                <Receipt className="h-3.5 w-3.5" />
                {locale === 'ko' ? '구매 내역' : 'Purchase history'}
              </h2>

              {loading ? (
                <p className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-center text-[13px] text-slate-500">
                  {locale === 'ko' ? '불러오는 중...' : 'Loading...'}
                </p>
              ) : !purchases || purchases.purchases.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center">
                  <p className="text-[14px] text-slate-300">
                    {locale === 'ko' ? '아직 구매 내역이 없어요' : 'No purchases yet'}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500">
                    {locale === 'ko'
                      ? '추천 보상이나 프로모션 크레딧도 여기에 표시돼요'
                      : 'Referral and promotion credits will also show up here'}
                  </p>
                </div>
              ) : (
                <ul className="mt-4 space-y-2">
                  {purchases.purchases.map((p) => {
                    const isPaid = p.source === 'purchase'
                    return (
                      <li
                        key={p.id}
                        className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-3"
                      >
                        <div
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                          style={{
                            background: isPaid ? '#a78bfa1f' : '#22d3ee1f',
                            color: isPaid ? '#a78bfa' : '#22d3ee',
                          }}
                        >
                          {isPaid ? (
                            <Coins className="h-4 w-4" />
                          ) : (
                            <Gift className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 truncate text-[13.5px] font-medium text-white">
                            +{p.amount} {locale === 'ko' ? '크레딧' : 'credits'}
                            <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10.5px] font-normal uppercase tracking-wider text-slate-300">
                              {purchaseSourceLabel(p.source, locale)}
                            </span>
                          </p>
                          <p className="mt-0.5 truncate text-[11.5px] text-slate-500">
                            {formatDateOnly(p.createdAt, locale)} ·{' '}
                            {p.expired
                              ? locale === 'ko'
                                ? '만료됨'
                                : 'expired'
                              : `${locale === 'ko' ? '남은' : 'remaining'} ${p.remaining}`}
                          </p>
                        </div>
                        {!p.expired && (
                          <span className="flex-shrink-0 text-[11px] text-slate-500">
                            {locale === 'ko' ? '만료' : 'exp'}{' '}
                            {formatDateOnly(p.expiresAt, locale)}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {/* Referral */}
            <section className="mt-7 rounded-3xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md sm:p-6">
              <h2 className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                <UserPlus className="h-3.5 w-3.5" />
                {locale === 'ko' ? '친구 추천' : 'Refer a friend'}
              </h2>

              {loading ? (
                <p className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-center text-[13px] text-slate-500">
                  {locale === 'ko' ? '불러오는 중...' : 'Loading...'}
                </p>
              ) : !referral ? (
                <p className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-center text-[13px] text-slate-500">
                  {locale === 'ko'
                    ? '추천 정보를 불러올 수 없어요'
                    : 'Could not load referral info'}
                </p>
              ) : (
                <>
                  <p className="mt-3 text-[12.5px] leading-relaxed text-slate-400">
                    {locale === 'ko'
                      ? '친구가 코드로 가입하고 첫 분석을 받으면, 둘 다 보너스 크레딧을 받아요.'
                      : 'When a friend signs up with your code and finishes their first reading, you both get bonus credits.'}
                  </p>

                  <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-400/[0.06] to-violet-500/[0.04] p-3.5 sm:flex-row sm:items-center sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-cyan-200/70">
                        {locale === 'ko' ? '내 추천 코드' : 'My code'}
                      </p>
                      <p className="mt-1 truncate font-mono text-[1.1rem] font-semibold tracking-wider text-white">
                        {referral.referralCode}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCopyReferral}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[12px] text-slate-200 transition hover:border-cyan-300/40 hover:text-white"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-300" />
                            {locale === 'ko' ? '복사됨' : 'Copied'}
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            {locale === 'ko' ? '링크 복사' : 'Copy link'}
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleShareReferral}
                        className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-[12px] text-cyan-100 transition hover:border-cyan-300/50 hover:bg-cyan-300/15"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                        {locale === 'ko' ? '공유' : 'Share'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2.5">
                    <ReferralStat
                      label={locale === 'ko' ? '가입' : 'Joined'}
                      value={referral.stats.total}
                      accent="#22d3ee"
                    />
                    <ReferralStat
                      label={locale === 'ko' ? '분석 완료' : 'Completed'}
                      value={referral.stats.completed}
                      accent="#a78bfa"
                    />
                    <ReferralStat
                      label={locale === 'ko' ? '받은 크레딧' : 'Credits earned'}
                      value={`+${referral.stats.creditsEarned}`}
                      accent="#f59e0b"
                    />
                  </div>
                </>
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

function ReferralStat({
  label,
  value,
  accent,
}: {
  label: string
  value: number | string
  accent: string
}) {
  return (
    <div
      className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-center"
      style={{ borderColor: `${accent}22` }}
    >
      <p className="text-[1.25rem] font-semibold leading-none" style={{ color: accent }}>
        {value}
      </p>
      <p className="mt-1.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
    </div>
  )
}

function UsageMini({
  label,
  used,
  limit,
  accent,
}: {
  label: string
  used: number
  limit: number
  accent: string
}) {
  // limit === -1 is the "unlimited" sentinel in PLAN_CONFIG.
  const unlimited = limit < 0
  const pct = unlimited ? 0 : limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100))
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-[13px] text-white">
        {unlimited ? `${used} / ∞` : `${used} / ${limit}`}
      </p>
      {!unlimited && limit > 0 && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: accent }}
          />
        </div>
      )}
    </div>
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
