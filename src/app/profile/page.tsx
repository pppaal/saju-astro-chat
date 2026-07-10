'use client'

export const dynamic = 'force-dynamic'

import { useSession } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthGate from '@/components/auth/AuthGate'
import BrandSplash from '@/components/branding/BrandSplash'
import { useI18n } from '@/i18n/I18nProvider'
import { buildSignInUrl } from '@/lib/auth/signInUrl'
import { logger } from '@/lib/logger'
import { ProfileEditModal } from './components/ProfileEditModal'
import { CircleAddModal } from './components/CircleAddModal'
import { ProfileHero } from './components/ProfileHero'
import { MyInfoSection } from './components/MyInfoSection'
import { CircleSection } from './components/CircleSection'
import { CreditsSection } from './components/CreditsSection'
import { PurchasesSection } from './components/PurchasesSection'
import { ReferralSection } from './components/ReferralSection'
import { AccountDangerZone } from './components/AccountDangerZone'
import {
  type CreditsResponse,
  type Locale,
  type MeProfile,
  type PurchasesResponse,
  type ReferralResponse,
  type SavedPerson,
  inkBtnCls,
} from './components/profileShared'
// Firebase 직접 업로드는 NextAuth/Firebase Auth 분리로 인한 CORS·규칙
// 문제로 60초 timeout 빈발. 이제 /api/me/upload-photo (Vercel Blob 서버측
// 업로드) 로 대체. uploadProfilePhoto import 제거.

// 페이지 = 데이터 페치/상태 오케스트레이션만. 섹션 UI 와 그 지역 상태
// (사진 업로드, 이름 편집, 환불, 추천 복사, 계정 삭제 확인)는 전부
// ./components/* 섹션 컴포넌트 안에 있다.
export default function ProfilePage() {
  const { status } = useSession()
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
  // 섹션별 loading 분리 — 이전엔 single `loading` 이 5개 endpoint 의 Promise.all
  // 끝까지 묶여 있어 가장 느린 한 곳이 전체 페이지를 멈추고 BrandSplash 전체
  // 화면 splash 만 노출했다 (사용자: "프로필 로딩 길다"). 분리 후엔 가장 빠른
  // /api/me/profile 도착 즉시 splash 제거되고 메인 사용자 정보 노출, 나머지
  // 섹션은 자기 자신의 스켈레톤만 띄우다 도착하는 대로 채워진다.
  const [profileLoading, setProfileLoading] = useState(true)
  const [circleLoading, setCircleLoading] = useState(true)
  const [creditsLoading, setCreditsLoading] = useState(true)
  const [purchasesLoading, setPurchasesLoading] = useState(true)
  const [referralLoading, setReferralLoading] = useState(true)
  // 전체 페이지 splash 는 메인 user 데이터만 기준 — 나머지는 인라인 스켈레톤.
  const loading = profileLoading
  const [editOpen, setEditOpen] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [circleOpen, setCircleOpen] = useState(false)

  const loadAll = useCallback(async () => {
    setProfileLoading(true)
    setCircleLoading(true)
    setCreditsLoading(true)
    setPurchasesLoading(true)
    setReferralLoading(true)
    setLoadError(false)
    // 5개 endpoint 를 *독립적으로* 병렬 fire. 이전 Promise.all 패턴은 가장
    // 느린 endpoint 가 끝날 때까지 전체 페이지가 BrandSplash 로 가려져 사용자
    // 가 1~2 초간 빈 화면을 봤다. 각 fetch 가 자기 state 만 갱신하므로 가장
    // 빨리 도착하는 섹션 (보통 /api/me/profile) 부터 즉시 노출된다.
    // loadError 는 *critical 경로 (/api/me/profile)* 실패만으로 켠다 — 다른
    // 섹션은 빈 채로 둬도 페이지 자체는 의미 있게 보이므로 전체 에러 배너로
    // 가리지 않는다.

    fetch('/api/me/profile')
      .then(async (r) => {
        if (!r.ok) {
          setLoadError(true)
          return null
        }
        return r.json()
      })
      .then((data) => {
        // /api/me/profile returns { user: {...} } directly (no envelope).
        if (data?.user) setProfile(data.user)
      })
      .catch((err) => {
        logger.warn('[profile] /me/profile failed', err)
        setLoadError(true)
      })
      .finally(() => setProfileLoading(false))

    // The other endpoints all flow through withApiMiddleware, so the
    // envelope is { success: true, data: {...} }.
    fetch('/api/me/circle')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const people = data?.data?.people || data?.people || []
        setCircle(Array.isArray(people) ? people : [])
      })
      .catch((err) => logger.warn('[profile] /me/circle failed', err))
      .finally(() => setCircleLoading(false))

    fetch('/api/me/credits')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const cr = data?.data || data
        if (cr && typeof cr === 'object' && 'plan' in cr) setCredits(cr as CreditsResponse)
      })
      .catch((err) => logger.warn('[profile] /me/credits failed', err))
      .finally(() => setCreditsLoading(false))

    fetch('/api/me/purchases')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const pr = data?.data || data
        if (pr && typeof pr === 'object' && 'purchases' in pr) {
          setPurchases(pr as PurchasesResponse)
        }
      })
      .catch((err) => logger.warn('[profile] /me/purchases failed', err))
      .finally(() => setPurchasesLoading(false))

    fetch('/api/referral/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const rr = data?.data || data
        if (rr && typeof rr === 'object' && 'referralCode' in rr) {
          setReferral(rr as ReferralResponse)
        }
      })
      .catch((err) => logger.warn('[profile] /referral/me failed', err))
      .finally(() => setReferralLoading(false))

    // 도시 인덱스 prewarm — /api/cities 의 16 MB JSON 첫 파싱이 500~800ms
    // spike 인데, 사용자가 "내 정보 수정" 모달을 열고 도시 이름 타이핑할
    // 시점에 그 spike 가 첫 keystroke 응답을 막아 "내정보 입력하면 로딩"
    // 으로 보인다. 프로필 페이지 mount 와 동시에 fire-and-forget 으로
    // 백그라운드 워밍 → 모달 열 즈음엔 캐시 따뜻함. q=a&limit=1 은 라우트
    // 의 짧은 경로(인덱스 로드 + 단일 행 매칭) 만 트리거하고 응답은 작음.
    fetch('/api/cities?q=a&limit=1').catch(() => {
      // fire-and-forget — 실패해도 사용자가 직접 입력할 때 정상 fallback.
    })
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

  useEffect(() => {
    if (status === 'authenticated') void loadAll()
  }, [status, loadAll])

  return (
    <AuthGate
      statusOverride={status}
      callbackUrl="/profile"
      fallback={
        // 비로그인 fallback — 자동 redirect 가 거의 즉시 일어나므로 빈 화면.
        // 깜빡임 줄이려고 배경색만 라이트 서피스와 맞춤.
        <div className="min-h-[100svh] bg-[#fafaf9]" aria-hidden="true" />
      }
    >
      <div className="relative min-h-[100svh] bg-[#fafaf9] text-[#1c1917]">
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
            <ProfileHero
              profile={profile}
              locale={locale}
              onProfileChange={(patch) =>
                setProfile((prev) => (prev ? { ...prev, ...patch } : prev))
              }
            />

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

            <MyInfoSection
              profile={profile}
              locale={locale}
              loading={loading}
              onEdit={() => setEditOpen(true)}
            />

            <CircleSection
              circle={circle}
              loading={circleLoading}
              locale={locale}
              onAdd={() => setCircleOpen(true)}
              onRemoved={(id) => setCircle((prev) => prev.filter((p) => p.id !== id))}
            />

            <CreditsSection
              credits={credits}
              loading={creditsLoading}
              purchases={purchases}
              locale={locale}
            />

            <PurchasesSection
              purchases={purchases}
              loading={purchasesLoading}
              locale={locale}
              onRefunded={async () => {
                await Promise.all([refreshPurchases(), refreshCredits()])
              }}
            />

            <ReferralSection referral={referral} loading={referralLoading} locale={locale} />

            <AccountDangerZone locale={locale} email={profile?.email} />
          </div>
        </div>

        <ProfileEditModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          initial={{
            name: profile?.name ?? null,
            birthDate: profile?.birthDate ?? null,
            birthTime: profile?.birthTime ?? null,
            birthTimeUnknown: profile?.birthTimeUnknown ?? null,
            gender: profile?.gender ?? null,
            birthCity: profile?.birthCity ?? null,
            latitude: profile?.latitude ?? null,
            longitude: profile?.longitude ?? null,
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
