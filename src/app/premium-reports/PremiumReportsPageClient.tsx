'use client'

/**
 * Apple-tier Premium Reports Hub.
 *
 * 3 카드 — Free / 인생총운 / 테마별.
 * 큰 헤드라인 / 절제된 카드 / smooth interaction.
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Crown, Sparkles, Compass } from 'lucide-react'

const ROUTES = {
  free: '/destiny-map',
  comprehensive: '/premium-reports/comprehensive?tier=premium',
  themed: '/premium-reports/themed?tier=premium',
} as const

interface ReportCard {
  key: 'free' | 'comprehensive' | 'themed'
  badge: string
  title: string
  subtitle: string
  description: string
  features: string[]
  Icon: typeof Crown
  accent: string
  glow: string
  cta: string
  authRequired: boolean
}

const CARDS: ReportCard[] = [
  {
    key: 'free',
    badge: 'Free',
    title: '운명 지도',
    subtitle: '사주·점성 종합 무료 분석',
    description: '본인 사주·점성 결을 시기 운세·영역 운세로 풀어보고 핵심 흐름까지 확인할 수 있어요.',
    features: [
      '사주·점성 종합 시각',
      '테마별 풀이 (관계·커리어 등)',
      '인생 예측 + 성향 분석',
      '주요 영역 한눈에',
    ],
    Icon: Compass,
    accent: '#94a3b8',
    glow: 'rgba(148,163,184,0.15)',
    cta: '무료로 시작',
    authRequired: false,
  },
  {
    key: 'comprehensive',
    badge: 'Premium',
    title: '인생 총운',
    subtitle: '모든 영역 통합 깊이 분석',
    description:
      '연애·커리어·재물·건강·가족·이동까지 6 영역을 한 번에 8천자+ 깊이로 풀어드려요.',
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
    authRequired: true,
  },
  {
    key: 'themed',
    badge: 'Premium',
    title: '테마 심층',
    subtitle: '한 영역만 집중적으로',
    description:
      '연애·커리어·재물·건강·가족·이동 중 하나를 인생/연/월 시기로 깊이.',
    features: [
      '6 테마 × 3 시기 = 18 조합',
      '한 테마 8000자 집중',
      '시기 scope (인생/연/월)',
      'Cross map 시각',
    ],
    Icon: Sparkles,
    accent: '#a78bfa',
    glow: 'rgba(167,139,250,0.22)',
    cta: '테마 선택',
    authRequired: true,
  },
]

export default function PremiumReportsPageClient() {
  const router = useRouter()
  const { status } = useSession()

  const handleClick = (card: ReportCard) => {
    if (card.authRequired && status === 'unauthenticated') {
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-cyan-300/70">
            Destiny Reports
          </p>
          <h1
            className="text-balance bg-[linear-gradient(135deg,#fff_0%,#a89fcf_100%)] bg-clip-text text-4xl font-semibold leading-[1.1] text-transparent sm:text-6xl"
            style={{ letterSpacing: '-0.025em', wordBreak: 'keep-all' }}
          >
            사주와 점성으로 읽는<br />
            지금 가장 알고 싶은 결
          </h1>
          <p className="mx-auto max-w-md pt-2 text-[15px] leading-relaxed text-slate-400">
            맛보기·인생총운·테마 심층 — 원하는 깊이로 받아보세요.
          </p>
        </header>

        {/* 3 cards */}
        <section className="mt-16 grid gap-5 lg:grid-cols-3">
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
                  className="mt-5 text-[14px] leading-[1.7] text-slate-300/90"
                  style={{ wordBreak: 'keep-all' }}
                >
                  {card.description}
                </p>

                {/* Features */}
                <ul className="mt-5 space-y-1.5">
                  {card.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2 text-[13px] leading-[1.5] text-slate-300/80"
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

        {/* Footer hint */}
        <p className="mt-12 text-center text-[12px] text-slate-500">
          모든 분석은 사주명리·점성술 전통에 기반한 <em className="not-italic text-slate-400">참고 자료</em>이며 미래를 단정하지 않습니다.{' '}
          <Link
            href="/premium-reports/preview"
            className="text-cyan-300/80 underline-offset-2 hover:underline"
          >
            샘플 미리보기
          </Link>
        </p>
      </div>
    </div>
  )
}
