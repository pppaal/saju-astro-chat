'use client'

/**
 * Apple-tier Premium Reports Hub.
 *
 * 3 프리미엄 카드 — 월별 / 년별 / 인생총운.
 * Free 운명 지도는 보조 링크로 분리.
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Calendar, CalendarDays, Crown } from 'lucide-react'
import { analytics } from '@/components/analytics/GoogleAnalytics'

const ROUTES = {
  monthly: '/premium-reports/monthly?tier=premium',
  yearly: '/premium-reports/yearly?tier=premium',
  comprehensive: '/premium-reports/comprehensive?tier=premium',
} as const

type CardKey = keyof typeof ROUTES

interface ReportCard {
  key: CardKey
  badge: string
  title: string
  subtitle: string
  description: string
  features: string[]
  Icon: typeof Crown
  accent: string
  glow: string
  cta: string
}

const CARDS: ReportCard[] = [
  {
    key: 'monthly',
    badge: 'Premium · Monthly',
    title: '이번달 운세',
    subtitle: '이번 달 흐름·기회·주의 시기',
    description:
      '현재 달의 에너지 흐름을 사주·점성 결합으로 풀어드려요. 주차별 포인트와 결정적 타이밍까지.',
    features: [
      '현재 달 자동 분석',
      '주차별 흐름 + 길흉 일자',
      '연애·커리어·재물·건강 4 영역',
      '실천 가이드 + 행운 메타',
    ],
    Icon: Calendar,
    accent: '#60a5fa',
    glow: 'rgba(96,165,250,0.22)',
    cta: '이번달 운세 시작',
  },
  {
    key: 'yearly',
    badge: 'Premium · Yearly',
    title: '올해 운세',
    subtitle: '한 해 전체 흐름·월별 예측',
    description:
      '올해 전체의 큰 흐름과 월별 변곡점을 짚어드려요. 한 해 농사 계획 짜기에 가장 좋아요.',
    features: [
      '현재 연도 자동 분석',
      '월별 핵심 흐름 12개',
      '4 영역 종합 점수',
      '결정적 타이밍 캘린더',
    ],
    Icon: CalendarDays,
    accent: '#a78bfa',
    glow: 'rgba(167,139,250,0.22)',
    cta: '올해 운세 시작',
  },
  {
    key: 'comprehensive',
    badge: 'Premium · Lifetime',
    title: '인생 총운',
    subtitle: '평생 흐름·핵심 변곡점 통합',
    description:
      '연애·커리어·재물·건강·가족·이동까지 6 영역을 인생 단위로 한 번에 깊이 풀어드려요.',
    features: [
      '8000자+ long-form',
      '6 영역 통합 분석',
      '5행 도넛 + 합의 강도 시각',
      'Tier 1-4 깊이 KB',
    ],
    Icon: Crown,
    accent: '#fbbf24',
    glow: 'rgba(251,191,36,0.22)',
    cta: '인생총운 시작',
  },
]

export default function PremiumReportsPageClient() {
  const router = useRouter()
  const { status } = useSession()

  const handleClick = (card: ReportCard) => {
    analytics.premiumCtaClick('premium-hub', card.key)
    if (status === 'unauthenticated') {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(ROUTES[card.key])}`)
      return
    }
    router.push(ROUTES[card.key])
  }

  return (
    <div className="min-h-[100svh] bg-[radial-gradient(ellipse_at_top,#1a1c2e_0%,#0a0a14_60%)] text-slate-100 flex flex-col">
      <div className="mx-auto w-full max-w-3xl flex-1 flex flex-col px-5 pt-16 pb-6 sm:pt-20">
        {/* Hero — compact so the 3 cards fit on one screen without scroll */}
        <header className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-cyan-300">
            Destiny Reports
          </p>
          <h1
            className="mt-2 text-balance bg-[linear-gradient(135deg,#fff_0%,#a89fcf_100%)] bg-clip-text text-2xl font-semibold leading-[1.2] text-transparent sm:text-3xl"
            style={{ letterSpacing: '-0.02em', wordBreak: 'keep-all' }}
          >
            원하는 시간 폭으로 받아보세요
          </h1>
        </header>

        {/* 3 cards — compact rows on mobile, 3-column grid on lg+ */}
        <section className="mt-5 grid flex-1 gap-2.5 lg:grid-cols-3 lg:gap-4">
          {CARDS.map((card) => {
            const Icon = card.Icon
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => handleClick(card)}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all duration-300 hover:border-white/25 hover:bg-white/[0.06] lg:p-5"
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 18px 50px ${card.glow}`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 0 transparent`
                }}
              >
                <div
                  className="absolute -right-12 -top-12 h-28 w-28 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: card.glow }}
                  aria-hidden
                />

                <div className="flex items-center gap-3 lg:flex-col lg:items-start lg:gap-2">
                  {/* Icon + badge column */}
                  <div className="flex flex-shrink-0 items-center justify-center rounded-xl border lg:order-1"
                    style={{
                      width: 40,
                      height: 40,
                      borderColor: card.accent + '40',
                      background: card.accent + '14',
                      color: card.accent,
                    }}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.6} />
                  </div>

                  {/* Title + subtitle */}
                  <div className="min-w-0 flex-1 lg:order-3">
                    <h2
                      className="text-[15px] font-semibold leading-tight tracking-tight text-white sm:text-base lg:text-lg"
                      style={{ wordBreak: 'keep-all', letterSpacing: '-0.01em' }}
                    >
                      {card.title}
                    </h2>
                    <p
                      className="mt-0.5 text-[11.5px] leading-snug text-slate-400 lg:text-[12.5px]"
                      style={{ wordBreak: 'keep-all' }}
                    >
                      {card.subtitle}
                    </p>
                  </div>

                  {/* CTA arrow */}
                  <span
                    className="flex-shrink-0 text-[16px] transition-transform duration-300 group-hover:translate-x-1 lg:order-4 lg:self-end"
                    style={{ color: card.accent }}
                    aria-hidden
                  >
                    →
                  </span>
                </div>
              </button>
            )
          })}
        </section>

        {/* Free entry */}
        <div className="mt-4 flex justify-center">
          <Link
            href="/destiny-map/theme"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-[12px] text-slate-300 transition hover:border-white/25 hover:bg-white/[0.06]"
          >
            <span className="text-slate-500">처음이신가요?</span>
            <span className="font-medium text-cyan-300">무료 운명 지도 →</span>
          </Link>
        </div>

        {/* Footer hint */}
        <p className="mt-3 text-center text-[10.5px] leading-snug text-slate-500">
          사주명리·점성술 전통에 기반한 <em className="not-italic text-slate-400">참고 자료</em>입니다.{' '}
          <Link
            href="/premium-reports/preview"
            className="text-cyan-300 underline-offset-2 hover:underline"
          >
            샘플
          </Link>
        </p>
      </div>
    </div>
  )
}
