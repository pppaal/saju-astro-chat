'use client'

export const dynamic = 'force-dynamic'

import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Heart,
  ChevronRight,
  Plus,
  Star,
  Moon,
  Pencil,
  Check,
  X,
  Trash2,
  CalendarDays,
  Wand2,
  MessageCircle,
  Users,
} from 'lucide-react'
import AuthGate from '@/components/auth/AuthGate'
import { useI18n } from '@/i18n/I18nProvider'
import { buildSignInUrl } from '@/lib/auth/signInUrl'
import { logger } from '@/lib/logger'
import BirthInfoModal from '@/app/(main)/components/BirthInfoModal'
import {
  getStoredBirthInfo,
  type StoredBirthInfo,
} from '@/app/(main)/birthInfoStorage'
import { searchCities } from '@/lib/cities'

type ServiceKey = 'tarot' | 'compatibility' | 'report' | 'calendar' | 'counselor'

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

interface ProfileUser {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
  createdAt?: string
  birthDate?: string | null
  birthTime?: string | null
  gender?: string | null
  birthCity?: string | null
}

interface CreditsResponse {
  credits?: {
    remaining?: number
    total?: number
    monthly?: number
    bonus?: number
    used?: number
  }
}

interface CirclePerson {
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

function classifyService(serviceId: string): ServiceKey {
  if (serviceId === 'tarot') return 'tarot'
  if (serviceId === 'compatibility') return 'compatibility'
  if (serviceId === 'destiny-calendar' || serviceId === 'daily-fortune') return 'calendar'
  if (serviceId === 'destiny-counselor') return 'counselor'
  return 'report'
}

const SERVICE_META: Record<
  ServiceKey,
  { label: string; href: string; bar: string }
> = {
  tarot: { label: '타로 리딩', href: '/tarot', bar: 'bg-purple-500' },
  compatibility: { label: '궁합/관계', href: '/compatibility', bar: 'bg-fuchsia-400' },
  report: { label: '운세 리포트', href: '/premium-reports', bar: 'bg-violet-400' },
  calendar: { label: '데스티니 캘린더', href: '/calendar', bar: 'bg-indigo-400' },
  counselor: { label: '카운슬러', href: '/destiny-counselor', bar: 'bg-pink-400' },
}

// Canonical relation keys match the values CircleDropdown + useCompatibilityForm
// already understand. Korean labels are display-only.
type RelationKey = 'partner' | 'crush' | 'friend' | 'family' | 'colleague'

const RELATION_PRESETS: ReadonlyArray<{ key: RelationKey; label: string }> = [
  { key: 'partner', label: '연인' },
  { key: 'crush', label: '썸/관심' },
  { key: 'friend', label: '친구' },
  { key: 'family', label: '가족' },
  { key: 'colleague', label: '동료' },
]

const RELATION_LABEL: Record<string, string> = {
  partner: '연인',
  lover: '연인',
  crush: '썸/관심',
  friend: '친구',
  family: '가족',
  colleague: '동료',
}

function relationDisplay(rel: string): string {
  return RELATION_LABEL[rel] || rel
}

function cityLabel(c: CitySuggestion): string {
  return c.displayKr || c.displayEn || `${c.name}, ${c.country}`
}

interface CitySuggestion {
  name: string
  country: string
  lat: number
  lon: number
  nameKr?: string
  countryKr?: string
  displayKr?: string
  displayEn?: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] } },
} as const

export default function ProfilePage() {
  const { status } = useSession()
  const { t } = useI18n()
  const signInUrl = buildSignInUrl('/profile')

  const [user, setUser] = useState<ProfileUser | null>(null)
  const [credits, setCredits] = useState<CreditsResponse | null>(null)
  const [history, setHistory] = useState<DailyHistory[]>([])
  const [circle, setCircle] = useState<CirclePerson[]>([])
  const [loading, setLoading] = useState(true)
  const [savingName, setSavingName] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [showBirthModal, setShowBirthModal] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated') return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const [profileRes, creditsRes, historyRes, circleRes] = await Promise.all([
          fetch('/api/me/profile', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
          fetch('/api/me/credits', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
          fetch('/api/me/history?limit=60', { cache: 'no-store' }).then((r) =>
            r.ok ? r.json() : null
          ),
          fetch('/api/me/circle?limit=50', { cache: 'no-store' }).then((r) =>
            r.ok ? r.json() : null
          ),
        ])
        if (cancelled) return

        const u: ProfileUser | null = profileRes?.user || null
        setUser(u)
        setDraftName(u?.name || '')

        setCredits(creditsRes?.data || creditsRes || null)

        const days = historyRes?.data?.history || historyRes?.history || []
        setHistory(Array.isArray(days) ? days : [])

        const people = circleRes?.data?.people || circleRes?.people || []
        setCircle(Array.isArray(people) ? people : [])
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

  const counts = useMemo(() => {
    const c: Record<ServiceKey, number> = {
      tarot: 0,
      compatibility: 0,
      report: 0,
      calendar: 0,
      counselor: 0,
    }
    for (const day of history) {
      for (const rec of day.records || []) {
        c[classifyService(rec.service)] += 1
      }
    }
    return c
  }, [history])

  const totalReadings = counts.tarot + counts.compatibility + counts.report + counts.calendar + counts.counselor
  const usageMax = Math.max(20, ...Object.values(counts))
  const remainingCredits = credits?.credits?.remaining ?? 0

  const saveName = async () => {
    const next = draftName.trim()
    if (!next || next === user?.name) {
      setEditingName(false)
      return
    }
    setSavingName(true)
    try {
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: next }),
      })
      if (res.ok) {
        const json = await res.json()
        const updated: ProfileUser | null = json?.user || null
        if (updated) setUser(updated)
        setEditingName(false)
      }
    } catch (err) {
      logger.warn('[profile] rename failed', err)
    } finally {
      setSavingName(false)
    }
  }

  const handleAddPerson = async (payload: {
    name: string
    relation: RelationKey
    birthDate?: string
    birthTime?: string
    gender?: 'male' | 'female'
    birthCity?: string
    latitude?: number | null
    longitude?: number | null
  }) => {
    try {
      const res = await fetch('/api/me/circle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) return false
      const json = await res.json()
      const person: CirclePerson | undefined = json?.data?.person || json?.person
      if (person) setCircle((prev) => [person, ...prev])
      setShowAddPerson(false)
      return true
    } catch (err) {
      logger.warn('[profile] add person failed', err)
      return false
    }
  }

  const handleDeletePerson = async (id: string) => {
    try {
      const res = await fetch(`/api/me/circle?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (res.ok) setCircle((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      logger.warn('[profile] delete person failed', err)
    }
  }

  return (
    <AuthGate
      statusOverride={status}
      callbackUrl="/profile"
      fallback={
        <div className="relative min-h-[100svh] overflow-hidden bg-slate-50 text-slate-800">
          <div className="pointer-events-none absolute -top-20 -right-20 h-96 w-96 rounded-full bg-purple-300/30 blur-3xl" />
          <div className="pointer-events-none absolute top-40 -left-20 h-80 w-80 rounded-full bg-fuchsia-200/30 blur-3xl" />
          <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
            <h1 className="text-balance text-3xl font-semibold leading-[1.15] tracking-tight text-slate-800">
              {t('profile.loginRequired', '로그인하면 나의 여정이 시작돼요')}
            </h1>
            <p className="text-[15px] leading-relaxed text-slate-500">
              {t(
                'profile.loginDesc',
                '리딩 기록, 결정 일지, 크레딧 사용 내역을 한곳에서 볼 수 있어요.'
              )}
            </p>
            <Link
              href={signInUrl}
              className="mt-3 rounded-2xl bg-gradient-to-tr from-purple-500 to-fuchsia-500 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition hover:opacity-90"
            >
              {t('common.login', '로그인')}
            </Link>
          </div>
        </div>
      }
    >
      <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-800 selection:bg-purple-200">
        {/* Bright purple background glows */}
        <div className="pointer-events-none absolute top-0 left-0 h-96 w-full bg-gradient-to-b from-purple-200/50 via-fuchsia-100/30 to-transparent" />
        <div className="pointer-events-none absolute -top-20 -right-20 h-96 w-96 rounded-full bg-purple-300/30 blur-3xl" />
        <div className="pointer-events-none absolute top-40 -left-20 h-80 w-80 rounded-full bg-fuchsia-200/30 blur-3xl" />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col">
          {/* Page label (the global header lives above this) */}
          <header className="flex items-center justify-between px-6 pt-20 pb-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-purple-900/60">
              My Space
            </span>
            <Link
              href="/pricing"
              className="rounded-full p-2 text-slate-500 transition-colors hover:bg-purple-100/50 hover:text-purple-700"
              aria-label="요금제"
            >
              <Star size={18} />
            </Link>
          </header>

          <motion.div
            className="flex flex-1 flex-col gap-9 px-6 pb-24"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Profile header */}
            <motion.section variants={itemVariants} className="mt-2 flex flex-col items-center">
              <div className="group relative mb-5 cursor-default">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-300 to-fuchsia-300 opacity-60 blur-md transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative z-10 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-purple-100 bg-white shadow-xl shadow-purple-900/5">
                  {user?.image ? (
                    <Image
                      src={user.image}
                      alt={user?.name || 'User'}
                      width={80}
                      height={80}
                      className="h-20 w-20 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-purple-400">
                      {user?.name?.[0]?.toUpperCase() || '·'}
                    </span>
                  )}
                </div>
              </div>

              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveName()
                      if (e.key === 'Escape') {
                        setDraftName(user?.name || '')
                        setEditingName(false)
                      }
                    }}
                    maxLength={50}
                    className="rounded-xl border border-purple-200 bg-white/80 px-3 py-1.5 text-center text-xl font-bold tracking-wide text-slate-800 outline-none ring-purple-300 backdrop-blur focus:ring-2"
                    placeholder="이름"
                  />
                  <button
                    type="button"
                    onClick={saveName}
                    disabled={savingName}
                    className="rounded-full bg-purple-500 p-1.5 text-white shadow hover:bg-purple-600 disabled:opacity-50"
                    aria-label="저장"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftName(user?.name || '')
                      setEditingName(false)
                    }}
                    className="rounded-full bg-white/80 p-1.5 text-slate-500 shadow hover:bg-white"
                    aria-label="취소"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="group/name flex items-center gap-1.5 rounded-xl px-2 py-0.5 transition-colors hover:bg-purple-100/50"
                >
                  <h1 className="text-2xl font-bold tracking-wide text-slate-800">
                    {user?.name || '게스트'}
                  </h1>
                  <Pencil size={14} className="text-purple-400 opacity-0 transition-opacity group-hover/name:opacity-100" />
                </button>
              )}
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-purple-600/70">
                운명의 여행자
              </p>
            </motion.section>

            {/* Stats: credits + total readings */}
            <motion.section variants={itemVariants} className="grid grid-cols-2 gap-4">
              <StatCard
                Icon={Sparkles}
                title="보유 크레딧"
                value={loading ? '·' : String(remainingCredits)}
                label="C"
                iconBg="bg-purple-100"
                iconColor="text-purple-600"
                href="/pricing"
              />
              <StatCard
                Icon={Moon}
                title="총 리딩 횟수"
                value={loading ? '·' : String(totalReadings)}
                label="회"
                iconBg="bg-fuchsia-100"
                iconColor="text-fuchsia-600"
              />
            </motion.section>

            {/* Birth info card */}
            <motion.section variants={itemVariants}>
              <BirthInfoCard
                user={user}
                loading={loading}
                onEdit={() => setShowBirthModal(true)}
              />
            </motion.section>

            {/* Saved connections — usable in compatibility readings */}
            <motion.section variants={itemVariants} className="flex flex-col gap-4">
              <div className="flex items-end justify-between px-1">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">나의 인연</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    궁합 리딩 시 바로 불러올 수 있습니다
                  </p>
                </div>
                <Link
                  href="/compatibility"
                  className="text-xs font-bold text-purple-600 transition-colors hover:text-purple-800"
                >
                  궁합 보기 →
                </Link>
              </div>

              <div className="hide-scrollbar -mx-6 flex snap-x gap-3 overflow-x-auto px-6 pb-4">
                {/* Add new */}
                <button
                  type="button"
                  onClick={() => setShowAddPerson(true)}
                  className="group flex h-32 w-28 shrink-0 cursor-pointer snap-start flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/50 transition-colors hover:border-purple-300 hover:bg-purple-100/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-purple-100 bg-white shadow-sm transition-transform group-hover:scale-110">
                    <Plus size={18} className="text-purple-400 transition-colors group-hover:text-purple-600" />
                  </div>
                  <span className="text-xs font-semibold text-purple-600/70">새 인연 추가</span>
                </button>

                {circle.length === 0 && !loading && (
                  <div className="flex h-32 shrink-0 snap-start items-center px-3 text-xs text-slate-400">
                    아직 저장된 인연이 없어요
                  </div>
                )}

                {circle.map((person) => (
                  <PersonCard key={person.id} person={person} onDelete={handleDeletePerson} />
                ))}
              </div>
            </motion.section>

            {/* Service usage breakdown */}
            <motion.section
              variants={itemVariants}
              className="rounded-3xl border border-white bg-white/70 p-6 shadow-lg shadow-purple-900/5 backdrop-blur-xl"
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-800">리딩 분석</h2>
                <Link
                  href="/profile/decisions"
                  className="flex items-center text-xs font-medium text-slate-400 transition-colors hover:text-purple-600"
                >
                  전체보기 <ChevronRight size={14} className="ml-0.5" />
                </Link>
              </div>

              <div className="space-y-5">
                {(Object.keys(SERVICE_META) as ServiceKey[]).map((key) => {
                  const meta = SERVICE_META[key]
                  const count = counts[key]
                  const pct = Math.min(100, (count / usageMax) * 100)
                  return (
                    <Link
                      key={key}
                      href={meta.href}
                      className="block"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-600">{meta.label}</span>
                          <span className="font-medium text-slate-500">
                            {loading ? '·' : `${count}회`}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-purple-100">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1.1, delay: 0.25, ease: 'easeOut' }}
                            className={`h-full rounded-full ${meta.bar}`}
                          />
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </motion.section>

            {/* Quick service shortcuts */}
            <motion.section variants={itemVariants} className="grid grid-cols-4 gap-3">
              <ShortcutTile Icon={Wand2} label="타로" href="/tarot" tint="text-purple-600" bg="bg-purple-100" />
              <ShortcutTile Icon={Users} label="궁합" href="/compatibility" tint="text-fuchsia-600" bg="bg-fuchsia-100" />
              <ShortcutTile Icon={Sparkles} label="리포트" href="/premium-reports" tint="text-violet-600" bg="bg-violet-100" />
              <ShortcutTile Icon={MessageCircle} label="상담" href="/destiny-counselor" tint="text-pink-600" bg="bg-pink-100" />
            </motion.section>
          </motion.div>
        </div>

        {/* Add person modal */}
        {showAddPerson && (
          <AddPersonModal
            onClose={() => setShowAddPerson(false)}
            onSubmit={handleAddPerson}
          />
        )}

        {/* Birth info modal — saves locally + syncs to /api/me/profile */}
        <BirthInfoModal
          open={showBirthModal}
          initial={birthInfoFromUser(user) || (typeof window !== 'undefined' ? getStoredBirthInfo() : null)}
          onClose={() => setShowBirthModal(false)}
          onSaved={async (info: StoredBirthInfo) => {
            try {
              const res = await fetch('/api/me/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  birthDate: info.birthDate,
                  birthTime: info.birthTime,
                  gender: info.gender,
                  birthCity: info.city,
                }),
              })
              if (res.ok) {
                const json = await res.json()
                if (json?.user) setUser(json.user)
              }
            } catch (err) {
              logger.warn('[profile] birth info API sync failed', err)
            }
            setShowBirthModal(false)
          }}
        />

        <style jsx global>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      </div>
    </AuthGate>
  )
}

function StatCard({
  Icon,
  title,
  value,
  label,
  iconBg,
  iconColor,
  href,
}: {
  Icon: typeof Sparkles
  title: string
  value: string
  label: string
  iconBg: string
  iconColor: string
  href?: string
}) {
  const inner = (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-white bg-white/70 p-5 shadow-lg shadow-purple-900/5 backdrop-blur-xl transition-colors hover:bg-white/90">
      <div className="mb-4 flex items-center gap-2">
        <div className={`rounded-lg p-1.5 ${iconBg}`}>
          <Icon size={14} className={iconColor} />
        </div>
        <span className="text-xs font-semibold text-slate-500">{title}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold tracking-tight text-slate-800">{value}</span>
        <span className="text-xs font-medium text-slate-400">{label}</span>
      </div>
    </div>
  )
  return href ? <Link href={href}>{inner}</Link> : <div>{inner}</div>
}

function birthInfoFromUser(user: ProfileUser | null): StoredBirthInfo | null {
  if (!user?.birthDate) return null
  const gender =
    user.gender === 'male' || user.gender === 'Male'
      ? 'male'
      : user.gender === 'female' || user.gender === 'Female'
        ? 'female'
        : null
  if (!gender) return null
  const birthTime = user.birthTime || '00:00'
  return {
    birthDate: user.birthDate,
    birthTime,
    birthTimeUnknown: birthTime === '00:00',
    gender,
    city: user.birthCity || undefined,
    savedAt: new Date().toISOString(),
  }
}

function BirthInfoCard({
  user,
  loading,
  onEdit,
}: {
  user: ProfileUser | null
  loading: boolean
  onEdit: () => void
}) {
  const hasBirth = Boolean(user?.birthDate)
  return (
    <div className="rounded-2xl border border-white bg-white/70 p-5 shadow-lg shadow-purple-900/5 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-indigo-100 p-1.5">
            <CalendarDays size={14} className="text-indigo-600" />
          </div>
          <span className="text-xs font-semibold text-slate-500">내 사주 정보</span>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-bold text-purple-600 transition-colors hover:text-purple-800"
        >
          {hasBirth ? '수정' : '입력하기'}
        </button>
      </div>
      {loading ? (
        <p className="text-sm text-slate-400">불러오는 중...</p>
      ) : hasBirth ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm">
          <BirthChip label="생년월일" value={user?.birthDate || '-'} />
          <BirthChip
            label="시간"
            value={
              user?.birthTime
                ? user.birthTime === '00:00'
                  ? '모름'
                  : user.birthTime
                : '-'
            }
          />
          <BirthChip
            label="성별"
            value={
              user?.gender === 'male' || user?.gender === 'Male'
                ? '남'
                : user?.gender === 'female' || user?.gender === 'Female'
                  ? '여'
                  : '-'
            }
          />
          {user?.birthCity && <BirthChip label="출생지" value={user.birthCity} />}
        </div>
      ) : (
        <p className="text-sm text-slate-400">
          아직 사주 정보가 없어요. 한 번 입력하면 모든 서비스에서 자동으로 쓰여요.
        </p>
      )}
    </div>
  )
}

function BirthChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-sm">
      <span className="mr-1 text-xs font-semibold text-slate-400">{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </span>
  )
}

function PersonCard({
  person,
  onDelete,
}: {
  person: CirclePerson
  onDelete: (id: string) => void
}) {
  const [confirming, setConfirming] = useState(false)
  return (
    <div className="relative flex h-32 w-32 shrink-0 cursor-pointer snap-start flex-col items-center justify-center overflow-hidden rounded-2xl border border-white bg-white/80 p-4 shadow-md shadow-purple-900/5 backdrop-blur-md transition-all hover:shadow-lg hover:shadow-purple-900/10">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          if (confirming) {
            onDelete(person.id)
          } else {
            setConfirming(true)
            setTimeout(() => setConfirming(false), 2000)
          }
        }}
        className={`absolute right-1.5 top-1.5 rounded-full p-1 transition-colors ${
          confirming
            ? 'bg-red-100 text-red-500'
            : 'text-fuchsia-400/70 hover:bg-fuchsia-100 hover:text-fuchsia-600'
        }`}
        aria-label={confirming ? '삭제 확인' : '삭제'}
      >
        {confirming ? <Trash2 size={12} /> : <Heart size={12} />}
      </button>
      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-purple-100 bg-purple-50">
        <span className="text-sm font-bold text-purple-600">{person.name.charAt(0)}</span>
      </div>
      <span className="text-sm font-bold text-slate-700">{person.name}</span>
      <span className="mt-1 rounded-full bg-purple-100/50 px-2.5 py-0.5 text-[10px] font-medium text-purple-600/80">
        {relationDisplay(person.relation)}
      </span>
    </div>
  )
}

function ShortcutTile({
  Icon,
  label,
  href,
  tint,
  bg,
}: {
  Icon: typeof Sparkles
  label: string
  href: string
  tint: string
  bg: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-2xl border border-white bg-white/70 p-3 shadow-md shadow-purple-900/5 backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-purple-900/10"
    >
      <div className={`rounded-xl p-2 ${bg}`}>
        <Icon size={16} className={tint} />
      </div>
      <span className="text-[11px] font-semibold text-slate-600">{label}</span>
    </Link>
  )
}

function AddPersonModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (payload: {
    name: string
    relation: RelationKey
    birthDate?: string
    birthTime?: string
    gender?: 'male' | 'female'
    birthCity?: string
    latitude?: number | null
    longitude?: number | null
  }) => Promise<boolean>
}) {
  const [name, setName] = useState('')
  const [relation, setRelation] = useState<RelationKey>('partner')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [timeUnknown, setTimeUnknown] = useState(false)
  const [gender, setGender] = useState<'male' | 'female' | ''>('')
  const [cityQuery, setCityQuery] = useState('')
  const [cityFocused, setCityFocused] = useState(false)
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([])
  const [pickedCity, setPickedCity] = useState<CitySuggestion | null>(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const canSave = name.trim().length > 0 && !saving

  // Debounced city search (mirrors BirthInfoModal pattern)
  useEffect(() => {
    if (!cityFocused) return
    if (pickedCity && cityQuery === cityLabel(pickedCity)) return
    const q = cityQuery.trim()
    if (q.length < 1) {
      setCitySuggestions([])
      return
    }
    const id = setTimeout(async () => {
      try {
        const hits = (await searchCities(q, { limit: 8 })) as CitySuggestion[]
        setCitySuggestions(hits || [])
      } catch {
        setCitySuggestions([])
      }
    }, 150)
    return () => clearTimeout(id)
  }, [cityQuery, cityFocused, pickedCity])

  const submit = async () => {
    if (!canSave) return
    setSaving(true)
    setErrorMsg(null)
    const ok = await onSubmit({
      name: name.trim(),
      relation,
      birthDate: birthDate || undefined,
      birthTime: timeUnknown ? '00:00' : birthTime || undefined,
      gender: gender || undefined,
      birthCity: pickedCity ? cityLabel(pickedCity) : cityQuery.trim() || undefined,
      latitude: pickedCity?.lat ?? null,
      longitude: pickedCity?.lon ?? null,
    })
    setSaving(false)
    if (!ok) {
      setErrorMsg('저장에 실패했어요. 입력값을 다시 확인해 주세요.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 px-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-t-3xl border border-purple-100 bg-white p-6 shadow-2xl shadow-purple-900/20 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">새 인연 추가</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="예: 이도현"
              className="w-full rounded-xl border border-purple-100 bg-purple-50/40 px-3.5 py-2.5 text-sm text-slate-800 outline-none ring-purple-300 focus:ring-2"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">관계</label>
            <div className="flex flex-wrap gap-1.5">
              {RELATION_PRESETS.map((r) => (
                <button
                  type="button"
                  key={r.key}
                  onClick={() => setRelation(r.key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    relation === r.key
                      ? 'bg-purple-500 text-white'
                      : 'bg-purple-100/60 text-purple-700 hover:bg-purple-200/60'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">생년월일</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                min="1900-01-01"
                max="2100-12-31"
                className="w-full rounded-xl border border-purple-100 bg-purple-50/40 px-3 py-2.5 text-sm text-slate-800 outline-none ring-purple-300 focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">출생 시간</label>
              <input
                type="time"
                value={birthTime}
                onChange={(e) => {
                  setBirthTime(e.target.value)
                  if (e.target.value) setTimeUnknown(false)
                }}
                disabled={timeUnknown}
                className="w-full rounded-xl border border-purple-100 bg-purple-50/40 px-3 py-2.5 text-sm text-slate-800 outline-none ring-purple-300 focus:ring-2 disabled:opacity-60"
              />
              <label className="mt-1 flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-500">
                <input
                  type="checkbox"
                  checked={timeUnknown}
                  onChange={(e) => {
                    setTimeUnknown(e.target.checked)
                    if (e.target.checked) setBirthTime('')
                  }}
                  className="accent-purple-500"
                />
                시간 모름
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">성별</label>
              <div className="flex gap-2">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    type="button"
                    key={g}
                    onClick={() => setGender(g)}
                    className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      gender === g
                        ? 'bg-purple-500 text-white'
                        : 'bg-purple-100/60 text-purple-700 hover:bg-purple-200/60'
                    }`}
                  >
                    {g === 'male' ? '남' : '여'}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <label className="mb-1 block text-xs font-semibold text-slate-600">출생 도시</label>
              <input
                type="text"
                value={cityQuery}
                onChange={(e) => {
                  setCityQuery(e.target.value)
                  setPickedCity(null)
                  setCityFocused(true)
                }}
                onFocus={() => setCityFocused(true)}
                onBlur={() => setTimeout(() => setCityFocused(false), 150)}
                placeholder="예: 서울"
                autoComplete="off"
                className="w-full rounded-xl border border-purple-100 bg-purple-50/40 px-3 py-2.5 text-sm text-slate-800 outline-none ring-purple-300 focus:ring-2"
              />
              {cityFocused && citySuggestions.length > 0 && (
                <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-44 overflow-y-auto rounded-xl border border-purple-200 bg-white p-1 shadow-xl shadow-purple-900/10">
                  {citySuggestions.map((s, i) => (
                    <li key={`${s.name}-${s.country}-${i}`}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setPickedCity(s)
                          setCityQuery(cityLabel(s))
                          setCitySuggestions([])
                          setCityFocused(false)
                        }}
                        className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-purple-100"
                      >
                        {cityLabel(s)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {pickedCity && (
                <p className="mt-1 text-[10px] text-purple-600/80">
                  ✓ {pickedCity.lat.toFixed(2)}, {pickedCity.lon.toFixed(2)} 좌표 저장됨
                </p>
              )}
            </div>
          </div>
          {errorMsg && (
            <p className="text-xs font-medium text-red-500">{errorMsg}</p>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSave}
            className="flex-1 rounded-xl bg-gradient-to-tr from-purple-500 to-fuchsia-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 hover:opacity-90 disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
