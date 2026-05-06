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
import { Calendar, CalendarDays, Crown, HeartHandshake } from 'lucide-react'
import { analytics } from '@/components/analytics/GoogleAnalytics'

const ROUTES = {
  monthly: '/premium-reports/monthly?tier=premium',
  yearly: '/premium-reports/yearly?tier=premium',
  comprehensive: '/premium-reports/comprehensive?tier=premium',
  compatibility: '/premium-reports/compatibility',
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
  {
    key: 'compatibility',
    badge: 'Premium · Compatibility',
    title: '두 사람 궁합',
    subtitle: '사주 정합도 + 점성 시너스트리 + 컴포지트',
    description:
      '두 사람의 사주·점성을 3-layer로 분석하고, 매거진 톤으로 풀어드립니다. 끌림과 갈등 지점을 함께.',
    features: [
      '3-layer 깊이 분석',
      '영역별 4개 인사이트',
      '결정적 시점 타임라인',
      '관계 행동 처방전',
    ],
    Icon: HeartHandshake,
    accent: '#f472b6',
    glow: 'rgba(244,114,182,0.22)',
    cta: '궁합 분석 시작',
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
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#1a1c2e_0%,#0a0a14_60%)] text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
        {/* Hero */}
        <header className="space-y-4 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-cyan-300">
            Destiny Reports
          </p>
          <h1
            className="text-balance bg-[linear-gradient(135deg,#fff_0%,#a89fcf_100%)] bg-clip-text text-4xl font-semibold leading-[1.1] text-transparent md:text-5xl lg:text-6xl"
            style={{ letterSpacing: '-0.025em', wordBreak: 'keep-all' }}
          >
            사주와 점성으로 읽는<br />
            지금 가장 알고 싶은 결
          </h1>
          <p className="mx-auto max-w-md pt-2 text-[15px] leading-relaxed text-slate-400">
            이번달·올해·인생총운 — 원하는 시간 폭으로 받아보세요.
          </p>
        </header>

        {/* 3 cards */}
        <section className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
          {CARDS.map((card) => {
            const Icon = card.Icon
            return (
              <button
                key={card.key}
                type="button"
                onClick={() => handleClick(card)}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-left transition-all duration-500 hover:border-white/25 hover:bg-white/[0.06] hover:scale-[1.01]"
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 30px 80px ${card.glow}`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 0 transparent`
                }}
              >
                {/* Glow background */}
                <div
                  className="absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: card.glow }}
                  aria-hidden
                />

                {/* Badge */}
                <div className="flex items-center justify-between">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]"
                    style={{
                      borderColor: card.accent + '50',
                      color: card.accent,
                      background: card.accent + '14',
                    }}
                  >
                    {card.badge}
                  </span>
                  <Icon
                    className="h-6 w-6 transition-colors duration-300"
                    style={{ color: card.accent }}
                    strokeWidth={1.5}
                  />
                </div>

                {/* Title */}
                <h2
                  className="mt-6 text-[1.75rem] font-semibold leading-tight tracking-tight text-white"
                  style={{ wordBreak: 'keep-all', letterSpacing: '-0.015em' }}
                >
                  {card.title}
                </h2>
                <p className="mt-1 text-[14px] text-slate-400" style={{ wordBreak: 'keep-all' }}>
                  {card.subtitle}
                </p>

                {/* Description */}
                <p
                  className="mt-5 text-[14px] leading-[1.7] text-slate-300"
                  style={{ wordBreak: 'keep-all' }}
                >
                  {card.description}
                </p>

                {/* Features */}
                <ul className="mt-5 space-y-1.5">
                  {card.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-[13px] leading-[1.5] text-slate-300"
                    >
                      <span
                        className="mt-[7px] h-1 w-1 flex-shrink-0 rounded-full"
                        style={{ background: card.accent }}
                        aria-hidden
                      />
                      <span style={{ wordBreak: 'keep-all' }}>{f}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="mt-7 flex items-center justify-between border-t border-white/[0.07] pt-5">
                  <span className="text-[14px] font-medium text-white">{card.cta}</span>
                  <span
                    className="text-[18px] transition-transform duration-300 group-hover:translate-x-1"
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
        <div className="mt-12 flex justify-center">
          <Link
            href="/destiny-map/theme"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[13px] text-slate-300 transition hover:border-white/25 hover:bg-white/[0.06]"
          >
            <span className="text-slate-500">처음이신가요?</span>
            <span className="font-medium text-cyan-300">무료 운명 지도로 맛보기 →</span>
          </Link>
        </div>

        {/* Footer hint */}
        <p className="mt-8 text-center text-[12px] text-slate-500">
          모든 분석은 사주명리·점성술 전통에 기반한 <em className="not-italic text-slate-400">참고 자료</em>이며 미래를 단정하지 않습니다.{' '}
          <Link
            href="/premium-reports/preview"
            className="text-cyan-300 underline-offset-2 hover:underline"
          >
            샘플 미리보기
          </Link>
        </p>
      </div>
    </div>
  )
}
