// 프로필 페이지 섹션들이 공유하는 타입·스타일 상수·포맷터.
// page.tsx 와 섹션 컴포넌트들(ProfileHero, CircleSection, …)이 함께 쓴다.

export type Locale = 'ko' | 'en'

export interface MeProfile {
  id?: string
  name?: string | null
  email?: string | null
  image?: string | null
  createdAt?: string
  profilePhoto?: string | null
  birthDate?: string | null
  birthTime?: string | null
  /** 시각 미상 명시 플래그 — null/미존재 = 레거시('00:00'=미상 휴리스틱 폴백). */
  birthTimeUnknown?: boolean | null
  gender?: string | null
  birthCity?: string | null
  latitude?: number | null
  longitude?: number | null
  tzId?: string | null
}

export interface SavedPerson {
  id: string
  name: string
  relation: string
  birthDate?: string | null
  birthTime?: string | null
  /** 시각 미상 명시 플래그 — null/미존재 = 레거시('00:00'=미상 휴리스틱 폴백). */
  birthTimeUnknown?: boolean | null
  gender?: string | null
  birthCity?: string | null
  latitude?: number | null
  longitude?: number | null
  tzId?: string | null
}

export type PlanId = 'free' | 'starter' | 'pro' | 'premium'

export interface CreditsResponse {
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

// 옛 SubscriptionSummary — 프리미엄 개념 폐기 (2026-06-06) 와 함께 제거.

export interface PurchaseRow {
  id: string
  createdAt: string
  amount: number
  remaining: number
  expiresAt: string
  expired: boolean
  source: string
}

export interface PurchasesResponse {
  purchases: PurchaseRow[]
}

export interface ReferralResponse {
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
export const GOLD = '#a07a3c'
export const INK = '#1c1917'

// Shared surface classes, kept here so every section reads identically.
export const cardCls =
  'rounded-3xl border border-[#e7e5e4] bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.04)] sm:p-6'
export const sectionLabelCls =
  'flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a09a90]'
export const linkCls =
  'inline-flex items-center gap-1 text-[12px] font-medium text-[#78716c] transition hover:text-[#1c1917]'
export const ghostBtnCls =
  'inline-flex items-center gap-1.5 rounded-full border border-[#e0ddd7] bg-white px-3 py-1.5 text-[12px] font-medium text-[#44403c] transition hover:border-[#c9c4bc] hover:bg-[#faf9f7]'
export const inkBtnCls =
  'inline-flex items-center gap-1.5 rounded-full bg-[#1c1917] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-[#3a3530]'
export const rowCls =
  'flex items-center gap-3 rounded-2xl border border-[#e7e5e4] bg-[#fcfbfa] px-3.5 py-3'
export const emptyCls =
  'mt-4 rounded-2xl border border-[#e7e5e4] bg-[#faf9f7] px-4 py-6 text-center'
export const loadingCls =
  'mt-4 rounded-2xl border border-[#e7e5e4] bg-[#faf9f7] px-4 py-5 text-center text-[13px] text-[#a8a29e]'

export const serifStyle = { fontFamily: 'var(--font-cinzel), Georgia, serif' } as const

// 섹션 로딩 스켈레톤 — 3 row pulse. 텍스트 "불러오는 중..." 가 frozen UI 처럼
// 느껴지던 부분을 자연스러운 pulse 로 대체. prefers-reduced-motion 도 존중.
export function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mt-4 space-y-2.5" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-[42px] rounded-xl bg-gradient-to-r from-[#f5f4f1] via-[#ecebe7] to-[#f5f4f1] motion-safe:animate-pulse"
          style={{ animationDelay: `${i * 80}ms` }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

export function formatBirthDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return locale === 'ko' ? '미입력' : 'Not set'
  // birthDate is stored as 'YYYY-MM-DD' string. Display nicely without
  // letting Date() reinterpret in the local timezone.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const [, y, mo, d] = m
  return locale === 'ko' ? `${y}년 ${Number(mo)}월 ${Number(d)}일` : `${mo}/${d}/${y}`
}

export function genderLabel(g: string | null | undefined, locale: Locale): string {
  if (!g) return locale === 'ko' ? '미입력' : 'Not set'
  const norm = g.toLowerCase()
  if (norm === 'm' || norm === 'male') return locale === 'ko' ? '남성' : 'Male'
  if (norm === 'f' || norm === 'female') return locale === 'ko' ? '여성' : 'Female'
  return locale === 'ko' ? '미입력' : 'Not set'
}

export function formatDateOnly(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function purchaseSourceLabel(source: string, locale: Locale): string {
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

export function relationLabel(r: string, locale: Locale): string {
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
