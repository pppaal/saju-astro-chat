'use client'

export const dynamic = 'force-dynamic'

import { useSession, signOut } from 'next-auth/react'
import { useCallback, useEffect, useState, useRef } from 'react'
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
  ArrowRight,
  Users,
  Coins,
  Receipt,
  Gift,
  Share2,
  Copy,
  Check,
  UserPlus,
  LogOut,
  Camera,
} from 'lucide-react'
import AuthGate from '@/components/auth/AuthGate'
import BrandSplash from '@/components/branding/BrandSplash'
import { useI18n } from '@/i18n/I18nProvider'
import { buildSignInUrl } from '@/lib/auth/signInUrl'
import { logger } from '@/lib/logger'
import { ProfileEditModal } from './components/ProfileEditModal'
import { CircleAddModal } from './components/CircleAddModal'
import { uploadProfilePhoto } from '@/lib/firebase/storage'

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

// Single restrained accent for the light/premium surface — a deep
// champagne gold that stays legible on white (unlike the old neon cyan).
const GOLD = '#a07a3c'
const INK = '#1c1917'

// Shared surface classes, kept here so every section reads identically.
const cardCls =
  'rounded-3xl border border-[#e7e4df] bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.04)] sm:p-6'
const sectionLabelCls =
  'flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a09a90]'
const linkCls =
  'inline-flex items-center gap-1 text-[12px] font-medium text-[#78716c] transition hover:text-[#1c1917]'
const ghostBtnCls =
  'inline-flex items-center gap-1.5 rounded-full border border-[#e0ddd7] bg-white px-3 py-1.5 text-[12px] font-medium text-[#44403c] transition hover:border-[#c9c4bc] hover:bg-[#faf9f7]'
const inkBtnCls =
  'inline-flex items-center gap-1.5 rounded-full bg-[#1c1917] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-[#3a3530]'
const rowCls =
  'flex items-center gap-3 rounded-2xl border border-[#ebe8e3] bg-[#fcfbfa] px-3.5 py-3'
const emptyCls = 'mt-4 rounded-2xl border border-[#ebe8e3] bg-[#faf9f7] px-4 py-6 text-center'
const loadingCls =
  'mt-4 rounded-2xl border border-[#ebe8e3] bg-[#faf9f7] px-4 py-5 text-center text-[13px] text-[#a8a29e]'
const serifStyle = { fontFamily: 'var(--font-cinzel), Georgia, serif' } as const

function formatBirthDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return locale === 'ko' ? '미입력' : 'Not set'
  // birthDate is stored as 'YYYY-MM-DD' string. Display nicely without
  // letting Date() reinterpret in the local timezone.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const [, y, mo, d] = m
  return locale === 'ko' ? `${y}년 ${Number(mo)}월 ${Number(d)}일` : `${mo}/${d}/${y}`
}

function genderLabel(g: string | null | undefined, locale: Locale): string {
  if (!g) return locale === 'ko' ? '미입력' : 'Not set'
  const norm = g.toLowerCase()
  if (norm === 'm' || norm === 'male') return locale === 'ko' ? '남성' : 'Male'
  if (norm === 'f' || norm === 'female') return locale === 'ko' ? '여성' : 'Female'
  return locale === 'ko' ? '미입력' : 'Not set'
}

function formatDateOnly(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return '—'
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
  const { data: session, status, update: updateSession } = useSession()
  const { locale: rawLocale } = useI18n()
  const locale: Locale = rawLocale === 'en' ? 'en' : 'ko'
  const signInUrl = buildSignInUrl('/profile')
  const router = useRouter()

  // 비로그인 = 자동 sign-in 페이지로 redirect. AuthGate fallback 의 로그인
  // wall 은 노출 안 됨 (잠깐 빈 화면만 보임). 로그인 끝나면 signInUrl 의
  // callbackUrl(/profile) 로 돌아옴.
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(signInUrl)
    }
  }, [status, router, signInUrl])

  const [profile, setProfile] = useState<MeProfile | null>(null)
  const [circle, setCircle] = useState<SavedPerson[]>([])
  const [credits, setCredits] = useState<CreditsResponse | null>(null)
  const [purchases, setPurchases] = useState<PurchasesResponse | null>(null)
  const [referral, setReferral] = useState<ReferralResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoProgress, setPhotoProgress] = useState(0)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [refundError, setRefundError] = useState<string | null>(null)
  const [circleOpen, setCircleOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const [profileRes, circleRes, creditsRes, purchasesRes, referralRes] = await Promise.all([
        fetch('/api/me/profile').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/me/circle').then((r) => (r.ok ? r.json() : null)),
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
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // 지인 추가/변경 후 전체 페이지를 다시 로드하면 전역 loading 이 켜져
  // 모든 섹션이 '불러오는 중...'으로 깜빡인다. 지인 목록만 조용히 갱신한다.
  const refreshCircle = useCallback(async () => {
    try {
      const res = await fetch('/api/me/circle')
      if (!res.ok) return
      const json = await res.json()
      const people = json?.data?.people || json?.people || []
      setCircle(Array.isArray(people) ? people : [])
    } catch (err) {
      logger.warn('[profile/circle] refresh failed', err)
    }
  }, [])

  // 환불 후 조용한 갱신 — 전역 loading 안 건드림.
  const refreshPurchases = useCallback(async () => {
    try {
      const res = await fetch('/api/me/purchases')
      if (!res.ok) return
      const json = await res.json()
      const pr = json?.data || json
      if (pr && typeof pr === 'object' && 'purchases' in pr) {
        setPurchases(pr as PurchasesResponse)
      }
    } catch (err) {
      logger.warn('[profile/purchases] refresh failed', err)
    }
  }, [])

  const refreshCredits = useCallback(async () => {
    try {
      const res = await fetch('/api/me/credits')
      if (!res.ok) return
      const json = await res.json()
      const cr = json?.data || json
      if (cr && typeof cr === 'object' && 'plan' in cr) {
        setCredits(cr as CreditsResponse)
      }
    } catch (err) {
      logger.warn('[profile/credits] refresh failed', err)
    }
  }, [])

  const handleRefundPurchase = async (purchaseId: string, packAmount: number) => {
    const ok = window.confirm(
      locale === 'ko'
        ? `${packAmount} 크레딧 팩을 환불하시겠어요?\n• 결제수수료(약 3.5% + ₩300)는 차감 후 환불됩니다.\n• 남은 크레딧은 자동으로 회수됩니다.`
        : `Refund ${packAmount}-credit pack?\n• Payment processing fee (~3.5% + ₩300) is withheld.\n• Remaining credits are automatically revoked.`
    )
    if (!ok) return

    setRefundError(null)
    setRefundingId(purchaseId)
    try {
      const res = await fetch('/api/me/refund-credit-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId }),
      })
      const data = await res.json()
      if (!res.ok) {
        const errMsg = data?.error?.message || data?.error?.code || `요청 실패 (${res.status})`
        setRefundError(String(errMsg))
        return
      }
      const result = (data?.data || data) as { refundedKrw: number; feeWithheld: number }
      window.alert(
        locale === 'ko'
          ? `환불 완료\n실제 환불액: ₩${result.refundedKrw.toLocaleString()}\n차감 수수료: ₩${result.feeWithheld.toLocaleString()}`
          : `Refunded\nAmount: ₩${result.refundedKrw.toLocaleString()}\nFee withheld: ₩${result.feeWithheld.toLocaleString()}`
      )
      await Promise.all([refreshPurchases(), refreshCredits()])
    } catch (err) {
      logger.warn('[profile/refund] failed', err)
      setRefundError(
        locale === 'ko'
          ? '환불 처리에 실패했어요. 잠시 후 다시 시도해 주세요.'
          : 'Refund failed. Please try again later.'
      )
    } finally {
      setRefundingId(null)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') void loadAll()
  }, [status, loadAll])

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (e.target) e.target.value = '' // 같은 파일 재선택 가능하게
    if (!file) return

    const userId = session?.user?.id
    if (!userId) {
      setPhotoError(locale === 'ko' ? '로그인이 필요합니다.' : 'Login required.')
      return
    }

    // Firebase Storage 가 설정되지 않으면 업로드 함수가 'service unavailable' 을
    // 던지는데, 사용자는 '왜 안 되지' 모름. 환경변수 누락이면 즉시 명확한
    // 메시지 표시(관리자가 NEXT_PUBLIC_FIREBASE_CONFIG 만 설정하면 동작).
    if (!process.env.NEXT_PUBLIC_FIREBASE_CONFIG) {
      logger.warn('[profile/photo] NEXT_PUBLIC_FIREBASE_CONFIG missing — upload disabled')
      setPhotoError(
        locale === 'ko'
          ? '사진 업로드 서비스가 설정되지 않았어요. (관리자: NEXT_PUBLIC_FIREBASE_CONFIG 환경변수 필요)'
          : 'Photo upload is not configured. (Admin: set NEXT_PUBLIC_FIREBASE_CONFIG env var)'
      )
      return
    }

    setPhotoError(null)
    setPhotoUploading(true)
    setPhotoProgress(0)
    try {
      const { url } = await uploadProfilePhoto(file, userId, (p) => {
        setPhotoProgress(p.progress)
      })
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: url }),
      })
      if (!res.ok) {
        throw new Error('save_failed')
      }
      setProfile((prev) => (prev ? { ...prev, image: url } : prev))
    } catch (err) {
      logger.warn('[profile/photo] upload failed', err)
      setPhotoError(
        err instanceof Error && err.message !== 'save_failed'
          ? err.message
          : locale === 'ko'
            ? '사진 업로드에 실패했어요. 다시 시도해 주세요.'
            : 'Photo upload failed. Please try again.'
      )
    } finally {
      setPhotoUploading(false)
      setPhotoProgress(0)
    }
  }

  const handleDeletePerson = async (id: string, name: string) => {
    const ok = window.confirm(
      locale === 'ko'
        ? `'${name}' 을(를) 지인 목록에서 삭제할까요?`
        : `Remove '${name}' from your circle?`
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
          : 'Failed to delete. Please try again in a moment.'
      )
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/me/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: deleteConfirm.trim() }),
      })
      if (res.ok) {
        await signOut({ callbackUrl: '/' })
        return
      }
      const data = await res.json().catch(() => null)
      if (data?.error?.code === 'VALIDATION_ERROR') {
        setDeleteError(
          locale === 'ko' ? '확인 문구가 일치하지 않아요.' : 'Confirmation does not match.'
        )
      } else {
        setDeleteError(
          locale === 'ko'
            ? '삭제에 실패했어요. 잠시 후 다시 시도해 주세요.'
            : 'Failed to delete. Please try again in a moment.'
        )
      }
    } catch (err) {
      logger.warn('[profile] account delete failed', err)
      setDeleteError(
        locale === 'ko'
          ? '삭제에 실패했어요. 잠시 후 다시 시도해 주세요.'
          : 'Failed to delete. Please try again in a moment.'
      )
    } finally {
      setDeleting(false)
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

  // 계정 삭제 확인 문구: 이메일이 있으면 이메일, 없으면 "DELETE".
  const expectedConfirm = profile?.email || 'DELETE'
  const confirmMatches = deleteConfirm.trim().toLowerCase() === expectedConfirm.toLowerCase()

  return (
    <AuthGate
      statusOverride={status}
      callbackUrl="/profile"
      fallback={
        // 비로그인 fallback — 자동 redirect 가 거의 즉시 일어나므로 빈 화면.
        // 깜빡임 줄이려고 배경색만 라이트 서피스와 맞춤.
        <div className="min-h-[100svh] bg-[#f5f4f1]" aria-hidden="true" />
      }
    >
      <div className="relative min-h-[100svh] bg-[#f5f4f1] text-[#1c1917]">
        {/* 초기 데이터 로딩 동안 기본 로딩 페이지로 덮어 섹션별 스피너가
            우르르 보이는 느린 인상을 없앤다. (BrandSplash 는 fixed 전체화면) */}
        {loading && (
          <BrandSplash
            message={locale === 'ko' ? '프로필 불러오는 중…' : 'Loading your profile…'}
          />
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[340px] bg-[radial-gradient(120%_100%_at_50%_0%,rgba(160,122,60,0.07)_0%,rgba(245,244,241,0)_72%)]" />

        <div className="relative z-10">
          <div className="mx-auto max-w-2xl px-5 pb-24 pt-16 sm:px-6 sm:pt-20">
            {/* Hero */}
            <header className="flex flex-col items-center gap-4 text-center">
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
                className="relative rounded-full bg-gradient-to-br from-[#d8b878] to-[#a07a3c] p-[2px] shadow-[0_10px_30px_rgba(160,122,60,0.22)] disabled:cursor-default"
                aria-label={locale === 'ko' ? '프로필 사진 변경' : 'Change profile photo'}
                title={locale === 'ko' ? '프로필 사진 변경' : 'Change profile photo'}
              >
                {profile?.image ? (
                  <Image
                    src={profile.image}
                    alt={profile.name || 'User'}
                    width={92}
                    height={92}
                    className="block rounded-full border-2 border-white"
                  />
                ) : (
                  <div
                    className="flex h-[92px] w-[92px] items-center justify-center rounded-full border-2 border-white bg-white text-[1.7rem] font-semibold text-[#1c1917]"
                    style={serifStyle}
                  >
                    {profile?.name?.[0]?.toUpperCase() || '·'}
                  </div>
                )}
                {photoUploading ? (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-xs font-medium text-white">
                    {photoProgress > 0
                      ? `${photoProgress}%`
                      : locale === 'ko'
                        ? '업로드 중…'
                        : 'Uploading…'}
                  </span>
                ) : (
                  <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#1c1917] text-white shadow">
                    <Camera className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              {photoError && <p className="text-[12px] text-red-600">{photoError}</p>}
              <div>
                {editingName ? (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault()
                      const next = nameDraft.trim()
                      if (!next) {
                        setNameError(
                          locale === 'ko' ? '이름을 입력해 주세요.' : 'Please enter a name.'
                        )
                        return
                      }
                      setNameError(null)
                      setSavingName(true)
                      try {
                        const res = await fetch('/api/me/profile', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name: next }),
                        })
                        if (res.ok) {
                          setProfile((prev) => (prev ? { ...prev, name: next } : prev))
                          // 햄버거 등 useSession 으로 name 읽는 컴포넌트에 즉시 반영
                          // (next-auth JWT trigger='update' → jwt 콜백 → 다음 useSession 갱신).
                          try {
                            await updateSession({ name: next })
                          } catch (err) {
                            logger.warn('[profile] session update failed', err)
                          }
                          setEditingName(false)
                        } else {
                          setNameError(
                            locale === 'ko'
                              ? '저장에 실패했어요. 잠시 후 다시 시도해 주세요.'
                              : 'Save failed. Please try again in a moment.'
                          )
                        }
                      } catch (err) {
                        logger.warn('[profile] name save failed', err)
                        setNameError(
                          locale === 'ko'
                            ? '저장에 실패했어요. 잠시 후 다시 시도해 주세요.'
                            : 'Save failed. Please try again in a moment.'
                        )
                      } finally {
                        setSavingName(false)
                      }
                    }}
                    className="flex flex-wrap items-center justify-center gap-2"
                  >
                    <input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => {
                        setNameDraft(e.target.value)
                        if (nameError) setNameError(null)
                      }}
                      maxLength={40}
                      aria-label={locale === 'ko' ? '이름' : 'Name'}
                      aria-invalid={nameError ? true : undefined}
                      placeholder={locale === 'ko' ? '이름' : 'Name'}
                      className="w-[12ch] rounded-lg border border-[#d8b878] bg-white px-2 py-1 text-center text-[1.4rem] font-semibold text-[#1c1917] outline-none"
                    />
                    <button type="submit" disabled={savingName} className={inkBtnCls}>
                      {savingName
                        ? locale === 'ko'
                          ? '저장 중…'
                          : 'Saving…'
                        : locale === 'ko'
                          ? '저장'
                          : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingName(false)
                        setNameError(null)
                      }}
                      className={ghostBtnCls}
                    >
                      {locale === 'ko' ? '취소' : 'Cancel'}
                    </button>
                    {nameError && (
                      <p className="basis-full text-center text-[12px] text-red-600" role="alert">
                        {nameError}
                      </p>
                    )}
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(profile?.name || '')
                      setNameError(null)
                      setEditingName(true)
                    }}
                    className="group inline-flex items-center gap-1.5"
                    title={locale === 'ko' ? '이름 수정' : 'Edit name'}
                  >
                    <h1
                      className="text-balance text-[1.9rem] font-semibold leading-[1.12] tracking-[-0.01em] text-[#1c1917]"
                      style={serifStyle}
                    >
                      {profile?.name || (locale === 'ko' ? '이름을 알려주세요' : 'Set your name')}
                    </h1>
                    <Pencil className="h-3.5 w-3.5 text-[#a8a29e] opacity-0 transition group-hover:opacity-100" />
                  </button>
                )}
                {profile?.email && (
                  <p className="mt-1.5 text-[13px] text-[#8b857d]">{profile.email}</p>
                )}
                <button
                  type="button"
                  onClick={() => void signOut({ callbackUrl: '/' })}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#e0ddd7] bg-white px-3.5 py-1.5 text-[12px] font-medium text-[#78716c] transition hover:border-[#c9c4bc] hover:text-[#1c1917]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {locale === 'ko' ? '로그아웃' : 'Log out'}
                </button>
              </div>
            </header>

            {loadError && !loading && (
              <div
                className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-[#e7c9c9] bg-[#fcf4f4] px-4 py-4 text-center"
                role="alert"
              >
                <p className="text-[13px] text-[#9a4b4b]">
                  {locale === 'ko'
                    ? '정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'
                    : 'Failed to load your info. Please try again in a moment.'}
                </p>
                <button type="button" onClick={() => void loadAll()} className={inkBtnCls}>
                  {locale === 'ko' ? '다시 시도' : 'Retry'}
                </button>
              </div>
            )}

            {/* My Info */}
            <section className={`mt-9 ${cardCls}`}>
              <div className="flex items-center justify-between">
                <h2 className={sectionLabelCls}>{locale === 'ko' ? '내 정보' : 'My info'}</h2>
                <button type="button" onClick={() => setEditOpen(true)} className={ghostBtnCls}>
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
                  value={profile?.birthTime || (locale === 'ko' ? '미입력' : 'Not set')}
                  loading={loading}
                />
                <InfoRow
                  Icon={MapPin}
                  label={locale === 'ko' ? '출생 도시' : 'Birth city'}
                  value={profile?.birthCity || (locale === 'ko' ? '미입력' : 'Not set')}
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
            <section className={`mt-6 ${cardCls}`}>
              <div className="flex items-center justify-between">
                <h2 className={sectionLabelCls}>
                  <Users className="h-3.5 w-3.5 text-[#a07a3c]" />
                  {locale === 'ko' ? '내 지인' : 'My circle'}
                </h2>
                <button type="button" onClick={() => setCircleOpen(true)} className={inkBtnCls}>
                  <Plus className="h-3.5 w-3.5" />
                  {locale === 'ko' ? '추가' : 'Add'}
                </button>
              </div>

              {loading ? (
                <p className={loadingCls}>{locale === 'ko' ? '불러오는 중...' : 'Loading...'}</p>
              ) : circle.length === 0 ? (
                <div className={emptyCls}>
                  <p className="text-[14px] text-[#57534e]">
                    {locale === 'ko' ? '아직 등록한 지인이 없어요' : 'No one in your circle yet'}
                  </p>
                  <p className="mt-1 text-[12px] text-[#a8a29e]">
                    {locale === 'ko'
                      ? '지인의 생년월일을 저장해두면 궁합 상담을 더 빠르게 받을 수 있어요'
                      : 'Save birth info to speed up compatibility readings'}
                  </p>
                </div>
              ) : (
                <ul className="mt-4 space-y-2">
                  {circle.map((p) => (
                    <li key={p.id} className={rowCls}>
                      <div
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#e7e4df] bg-white text-[13px] font-semibold text-[#1c1917]"
                        style={serifStyle}
                      >
                        {p.name[0]?.toUpperCase() || '·'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-[14px] font-medium text-[#1c1917]">
                          {p.name}
                          <span className="rounded-full bg-[#f1efeb] px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-[#78716c]">
                            {relationLabel(p.relation, locale)}
                          </span>
                        </p>
                        <p className="mt-0.5 truncate text-[11.5px] text-[#a8a29e]">
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
                        className="rounded-full p-1.5 text-[#a8a29e] transition hover:bg-rose-50 hover:text-rose-500"
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
            <section className={`mt-6 ${cardCls}`}>
              <div className="flex items-center justify-between">
                <h2 className={sectionLabelCls}>
                  <Coins className="h-3.5 w-3.5 text-[#a07a3c]" />
                  {locale === 'ko' ? '크레딧' : 'Credits'}
                </h2>
                <Link href="/pricing" className={linkCls}>
                  {locale === 'ko' ? '크레딧 충전' : 'Top up'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {loading ? (
                <p className={loadingCls}>{locale === 'ko' ? '불러오는 중...' : 'Loading...'}</p>
              ) : !credits ? (
                <p className={loadingCls}>
                  {locale === 'ko'
                    ? '크레딧 정보를 불러올 수 없어요'
                    : 'Could not load credit info'}
                </p>
              ) : (
                <>
                  {(() => {
                    // 가장 빨리 만료될 (아직 만료 안 됐고 남은 게 있는) 구매분의 만료일을
                    // 우측에 안내. purchases 가 아직 로드 안 됐거나 없으면 안내만 표시.
                    const upcoming = (purchases?.purchases || [])
                      .filter((p) => !p.expired && p.remaining > 0 && p.expiresAt)
                      .sort(
                        (a, b) =>
                          new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime()
                      )[0]
                    return (
                      <div className="mt-4 flex items-end justify-between gap-4 rounded-2xl border border-[#ece4d4] bg-gradient-to-br from-[#faf6ee] to-[#fcfbf9] px-4 py-4">
                        <div>
                          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#a07a3c]">
                            {locale === 'ko' ? '남은 크레딧' : 'Remaining'}
                          </p>
                          <p
                            className="mt-1.5 text-[2.1rem] font-semibold leading-none text-[#1c1917]"
                            style={serifStyle}
                          >
                            {credits.credits.remaining}
                          </p>
                          <p className="mt-2 text-[11.5px] text-[#8b857d]">
                            {locale === 'ko'
                              ? '구매 후 3개월간 사용 가능'
                              : 'Valid for 3 months after purchase'}
                          </p>
                        </div>
                        {upcoming && (
                          <div className="text-right text-[11px] text-[#a8a29e]">
                            <p>{locale === 'ko' ? '다음 만료' : 'Next expiry'}</p>
                            <p className="mt-0.5 text-[12px] font-medium text-[#57534e]">
                              {formatDateOnly(upcoming.expiresAt, locale)}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </>
              )}
            </section>

            {/* Purchases */}
            <section className={`mt-6 ${cardCls}`}>
              <h2 className={sectionLabelCls}>
                <Receipt className="h-3.5 w-3.5 text-[#a07a3c]" />
                {locale === 'ko' ? '구매 내역' : 'Purchase history'}
              </h2>

              {loading ? (
                <p className={loadingCls}>{locale === 'ko' ? '불러오는 중...' : 'Loading...'}</p>
              ) : !purchases || purchases.purchases.length === 0 ? (
                <div className={emptyCls}>
                  <p className="text-[14px] text-[#57534e]">
                    {locale === 'ko' ? '아직 구매 내역이 없어요' : 'No purchases yet'}
                  </p>
                  <p className="mt-1 text-[12px] text-[#a8a29e]">
                    {locale === 'ko'
                      ? '추천 보상이나 프로모션 크레딧도 여기에 표시돼요'
                      : 'Referral and promotion credits will also show up here'}
                  </p>
                </div>
              ) : (
                <ul className="mt-4 space-y-2">
                  {purchases.purchases.map((p) => {
                    const isPaid = p.source === 'purchase'
                    const within7Days =
                      Date.now() - new Date(p.createdAt).getTime() <= 7 * 24 * 60 * 60 * 1000
                    const isUnused = p.remaining === p.amount
                    const canRefund = isPaid && !p.expired && isUnused && within7Days
                    return (
                      <li key={p.id} className={rowCls}>
                        <div
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
                          style={
                            isPaid
                              ? { background: '#f1efeb', color: '#57534e' }
                              : { background: 'rgba(160,122,60,0.10)', color: GOLD }
                          }
                        >
                          {isPaid ? <Coins className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 truncate text-[13.5px] font-medium text-[#1c1917]">
                            +{p.amount} {locale === 'ko' ? '크레딧' : 'credits'}
                            <span className="rounded-full bg-[#f1efeb] px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wider text-[#78716c]">
                              {purchaseSourceLabel(p.source, locale)}
                            </span>
                          </p>
                          <p className="mt-0.5 truncate text-[11.5px] text-[#a8a29e]">
                            {formatDateOnly(p.createdAt, locale)} ·{' '}
                            {p.expired
                              ? locale === 'ko'
                                ? '만료됨'
                                : 'expired'
                              : `${locale === 'ko' ? '남은' : 'remaining'} ${p.remaining}`}
                          </p>
                        </div>
                        {!p.expired && (
                          <span className="flex-shrink-0 text-[11px] text-[#a8a29e]">
                            {locale === 'ko' ? '만료' : 'exp'} {formatDateOnly(p.expiresAt, locale)}
                          </span>
                        )}
                        {canRefund && (
                          <button
                            type="button"
                            onClick={() => void handleRefundPurchase(p.id, p.amount)}
                            disabled={refundingId === p.id}
                            className="ml-1 flex-shrink-0 rounded-full border border-[#e7e5e4] px-2.5 py-1 text-[11px] font-medium text-[#57534e] hover:border-[#a8a29e] hover:text-[#1c1917] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {refundingId === p.id
                              ? locale === 'ko'
                                ? '처리 중…'
                                : 'Refunding…'
                              : locale === 'ko'
                                ? '환불'
                                : 'Refund'}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
              {refundError && <p className="mt-3 text-[12px] text-red-600">{refundError}</p>}
            </section>

            {/* Referral */}
            <section className={`mt-6 ${cardCls}`}>
              <h2 className={sectionLabelCls}>
                <UserPlus className="h-3.5 w-3.5 text-[#a07a3c]" />
                {locale === 'ko' ? '친구 추천' : 'Refer a friend'}
              </h2>

              {loading ? (
                <p className={loadingCls}>{locale === 'ko' ? '불러오는 중...' : 'Loading...'}</p>
              ) : !referral ? (
                <p className={loadingCls}>
                  {locale === 'ko'
                    ? '추천 정보를 불러올 수 없어요'
                    : 'Could not load referral info'}
                </p>
              ) : (
                <>
                  <p className="mt-3 text-[12.5px] leading-relaxed text-[#78716c]">
                    {locale === 'ko'
                      ? '친구가 내 추천 링크로 가입한 뒤 첫 크레딧을 구매하면, 추천한 회원님이 보너스 크레딧을 받아요.'
                      : 'When a friend signs up through your referral link and makes their first credit purchase, you get bonus credits.'}
                  </p>

                  <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#ece4d4] bg-gradient-to-br from-[#faf6ee] to-[#fcfbf9] p-3.5 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-[#a07a3c]">
                        {locale === 'ko' ? '내 추천 코드' : 'My code'}
                      </p>
                      <p className="mt-1 truncate font-mono text-[1.1rem] font-semibold tracking-wider text-[#1c1917]">
                        {referral.referralCode}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={handleCopyReferral} className={ghostBtnCls}>
                        {copied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            {locale === 'ko' ? '복사됨' : 'Copied'}
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            {locale === 'ko' ? '링크 복사' : 'Copy link'}
                          </>
                        )}
                      </button>
                      <button type="button" onClick={handleShareReferral} className={inkBtnCls}>
                        <Share2 className="h-3.5 w-3.5" />
                        {locale === 'ko' ? '공유' : 'Share'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <ReferralStat
                      label={locale === 'ko' ? '가입' : 'Joined'}
                      value={referral.stats.total}
                    />
                    <ReferralStat
                      label={locale === 'ko' ? '받은 크레딧' : 'Credits earned'}
                      value={`+${referral.stats.creditsEarned}`}
                      gold
                    />
                  </div>
                </>
              )}
            </section>

            {/* 계정 — 위험 구역 */}
            <section className={`mt-9 rounded-3xl border border-[#e7c9c9] bg-white p-5 sm:p-6`}>
              <div className={sectionLabelCls}>
                <Trash2 className="h-3.5 w-3.5" />
                {locale === 'ko' ? '계정' : 'Account'}
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-[#78716c]">
                {locale === 'ko'
                  ? '계정을 삭제하면 프로필·지인·기록·크레딧 등 모든 데이터가 영구 삭제되며 되돌릴 수 없습니다.'
                  : 'Deleting your account permanently removes all your data (profile, circle, history, credits) and cannot be undone.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirm('')
                  setDeleteError(null)
                  setDeleteOpen(true)
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[#e0a3a3] bg-white px-3.5 py-1.5 text-[12px] font-medium text-[#b04242] transition hover:bg-[#fcf4f4]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {locale === 'ko' ? '계정 삭제' : 'Delete account'}
              </button>
            </section>
          </div>
        </div>

        {deleteOpen && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(28,25,23,0.45)] p-4"
            onClick={() => {
              if (!deleting) setDeleteOpen(false)
            }}
            role="dialog"
            aria-modal="true"
            aria-label={locale === 'ko' ? '계정 삭제 확인' : 'Confirm account deletion'}
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-[#e7e4df] bg-white p-5 shadow-[0_24px_48px_rgba(28,25,23,0.18)]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[16px] font-semibold text-[#1c1917]" style={serifStyle}>
                {locale === 'ko' ? '정말 계정을 삭제할까요?' : 'Delete your account?'}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#57534e]">
                {locale === 'ko'
                  ? '이 작업은 되돌릴 수 없어요. 모든 데이터가 영구적으로 삭제됩니다.'
                  : 'This cannot be undone. All your data will be permanently deleted.'}
              </p>
              <p className="mt-3 text-[12px] text-[#78716c]">
                {locale === 'ko' ? (
                  <>
                    확인을 위해 <b className="text-[#1c1917]">{expectedConfirm}</b> 를 입력하세요.
                  </>
                ) : (
                  <>
                    Type <b className="text-[#1c1917]">{expectedConfirm}</b> to confirm.
                  </>
                )}
              </p>
              <input
                value={deleteConfirm}
                onChange={(e) => {
                  setDeleteConfirm(e.target.value)
                  if (deleteError) setDeleteError(null)
                }}
                placeholder={expectedConfirm}
                aria-label={locale === 'ko' ? '확인 문구' : 'Confirmation text'}
                className="mt-2 w-full rounded-lg border border-[#d8d5cf] bg-white px-3 py-2 text-[14px] text-[#1c1917] outline-none focus:border-[#a07a3c]"
              />
              {deleteError && (
                <p className="mt-2 text-[12px] text-red-600" role="alert">
                  {deleteError}
                </p>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleting}
                  className={ghostBtnCls}
                >
                  {locale === 'ko' ? '취소' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteAccount()}
                  disabled={deleting || !confirmMatches}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#b04242] px-3.5 py-1.5 text-[12px] font-medium text-white transition hover:bg-[#963636] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting
                    ? locale === 'ko'
                      ? '삭제 중…'
                      : 'Deleting…'
                    : locale === 'ko'
                      ? '영구 삭제'
                      : 'Delete forever'}
                </button>
              </div>
            </div>
          </div>
        )}

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
          onAdded={() => void refreshCircle()}
        />
      </div>
    </AuthGate>
  )
}

function ReferralStat({
  label,
  value,
  gold,
}: {
  label: string
  value: number | string
  gold?: boolean
}) {
  return (
    <div className="rounded-2xl border border-[#ebe8e3] bg-[#fcfbfa] px-3 py-3 text-center">
      <p
        className="text-[1.3rem] font-semibold leading-none"
        style={{ color: gold ? GOLD : INK, ...serifStyle }}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-[#a8a29e]">
        {label}
      </p>
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
    <div className="flex items-center gap-3 rounded-2xl border border-[#ebe8e3] bg-[#fcfbfa] px-3.5 py-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#f1efeb] text-[#a07a3c]">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-medium uppercase tracking-[0.16em] text-[#a8a29e]">
          {label}
        </p>
        <p className="mt-0.5 truncate text-[13.5px] font-medium text-[#292524]">
          {loading ? '·' : value}
        </p>
      </div>
    </div>
  )
}
