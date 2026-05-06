'use client'

import React from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Sparkles, Lock, MessageSquare, Star } from 'lucide-react'

interface CompatibilityPaywallProps {
  /** Overall compatibility score (0-100). Always shown free as the teaser. */
  overallScore: number | null
  /** Couple labels for the counselor link. */
  pairLabels: [string, string]
  /** Birth profiles to thread into the counselor URL. */
  persons: Array<{
    name?: string
    date: string
    time?: string
    gender?: string
    cityQuery?: string
    relation?: string
  }>
  /** Children render only when unlocked. The locked state shows a blur preview. */
  children: React.ReactNode
}

/**
 * Gates the full compatibility report behind a paywall. Free preview =
 * overall score + a teaser strip; unlocked = full rich report. Logged-in
 * users with any premium tier (or 'pro'/'plus') unlock automatically;
 * everyone else sees the lock with paths to /pricing and to the AI
 * counselor entry.
 */
export default function CompatibilityPaywall({
  overallScore,
  pairLabels,
  persons,
  children,
}: CompatibilityPaywallProps) {
  const { data: session } = useSession()
  // For now treat any authenticated user as unlocked. Tier-aware checks
  // can replace this with `session?.user?.plan !== 'free'` once the
  // premium-tier signal is reliably populated for compatibility.
  const unlocked = Boolean(session?.user)

  const counselorHref = (() => {
    const sp = new URLSearchParams()
    persons.slice(0, 2).forEach((p, i) => {
      const idx = i + 1
      if (p.name) sp.set(`p${idx}Name`, p.name)
      if (p.date) sp.set(`p${idx}Date`, p.date)
      if (p.time) sp.set(`p${idx}Time`, p.time)
      if (p.gender) sp.set(`p${idx}Gender`, p.gender)
      if (p.cityQuery) sp.set(`p${idx}City`, p.cityQuery)
      if (p.relation) sp.set(`p${idx}Relation`, p.relation)
    })
    return `/compatibility/counselor?${sp.toString()}`
  })()

  if (unlocked) {
    return (
      <div className="space-y-6">
        {/* Always-visible counselor CTA above the report */}
        <Link
          href={counselorHref}
          className="flex items-center justify-between gap-4 rounded-2xl border border-fuchsia-400/30
            bg-gradient-to-br from-fuchsia-500/10 to-purple-500/10 px-5 py-4
            hover:border-fuchsia-400/60 hover:bg-fuchsia-500/15 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white">
              <MessageSquare className="w-5 h-5" />
            </span>
            <div>
              <div className="text-white font-semibold">AI 궁합 상담사</div>
              <div className="text-xs text-slate-300/80">
                {pairLabels[0]} × {pairLabels[1]} — 실시간으로 매트릭스·타이밍 답변
              </div>
            </div>
          </div>
          <span className="text-fuchsia-300 text-sm">시작하기 →</span>
        </Link>

        {children}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Score teaser */}
      <div className="rounded-3xl border border-amber-300/30 bg-gradient-to-br from-rose-500/10 via-amber-500/10 to-fuchsia-500/10 p-8 md:p-10 text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-amber-200/80 font-mono mb-3">
          Free Preview
        </div>
        <div className="text-6xl md:text-7xl font-extrabold text-white tracking-tight mb-2">
          {overallScore ?? '?'}
          <span className="text-2xl md:text-3xl text-slate-400 ml-1">/100</span>
        </div>
        <p className="text-slate-200 max-w-xl mx-auto leading-relaxed">
          {pairLabels[0]} × {pairLabels[1]} 종합 점수만 무료로 공개합니다. 9-레이어 셀-단위 분석,
          이상형 일치도, 5년 흐름, 결혼 적기, 대운 동기화 같은 풀 리포트는 잠금 상태입니다.
        </p>
      </div>

      {/* Locked preview — blurred children */}
      <div className="relative">
        <div className="pointer-events-none select-none blur-md opacity-50">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-3xl border border-fuchsia-400/40 bg-slate-900/80 backdrop-blur-md p-8 shadow-[0_30px_80px_rgba(168,85,247,0.25)] text-center space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold text-white">전체 리포트는 프리미엄</h3>
            <ul className="text-left text-slate-200 text-sm space-y-2 max-w-xs mx-auto">
              <li className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-fuchsia-300 mt-0.5 shrink-0" />
                9 레이어 × 셀-단위 사주×점성 교차
              </li>
              <li className="flex items-start gap-2">
                <Star className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
                결혼/사업/갈등/시기 5도메인 점수
              </li>
              <li className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-300 mt-0.5 shrink-0" />
                실시간 AI 상담사 (매트릭스 컨텍스트 기반)
              </li>
            </ul>
            <div className="flex flex-col gap-2 pt-2">
              <Link
                href="/pricing"
                className="block rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-400 hover:to-purple-500
                  text-white font-bold py-3 transition-colors shadow-lg shadow-fuchsia-500/30"
              >
                프리미엄 잠금 해제
              </Link>
              <Link
                href={counselorHref}
                className="block rounded-xl border border-white/15 bg-white/5 hover:bg-white/10
                  text-slate-100 font-medium py-3 transition-colors"
              >
                AI 상담사 먼저 체험
              </Link>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              로그인 후 프리미엄 결제 시 자동 해제됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
