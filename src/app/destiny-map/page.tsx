import Link from 'next/link'
import { Compass, Sparkles } from 'lucide-react'

export default function DestinyMapPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#1a1c2e_0%,#0a0a14_60%)] text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-20 sm:py-28">
        {/* Hero */}
        <header className="space-y-5 text-center">
          <div className="flex justify-center">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.32em]"
              style={{
                borderColor: 'rgba(148,163,184,0.4)',
                color: '#cbd5e1',
                background: 'rgba(148,163,184,0.1)',
              }}
            >
              Free · 운명 지도
            </span>
          </div>

          <h1
            className="text-balance bg-[linear-gradient(135deg,#fff_0%,#a89fcf_100%)] bg-clip-text text-4xl font-semibold leading-[1.1] text-transparent sm:text-6xl"
            style={{ letterSpacing: '-0.025em', wordBreak: 'keep-all' }}
          >
            사주와 점성으로
            <br />
            지금의 결을 비춰드려요
          </h1>

          <p
            className="mx-auto max-w-xl pt-2 text-[15px] leading-[1.7] text-slate-400"
            style={{ wordBreak: 'keep-all' }}
          >
            관심 영역 하나만 골라주시면 본인 사주·점성 데이터를 교차 분석해
            성향·시기·핵심 결을 무료로 풀어드려요.
          </p>
        </header>

        {/* Feature pills */}
        <section className="mx-auto mt-12 grid max-w-2xl gap-3 sm:grid-cols-2">
          {[
            { Icon: Sparkles, label: '사주 + 점성 통합 시각' },
            { Icon: Compass, label: '관심 테마별 풀이' },
            { Icon: Sparkles, label: '인생·시기 흐름 예측' },
            { Icon: Compass, label: '핵심 영역 한눈에' },
          ].map((f, i) => {
            const Icon = f.Icon
            return (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-md"
              >
                <Icon className="h-4 w-4 flex-shrink-0 text-cyan-300/70" strokeWidth={1.5} />
                <span className="text-[13.5px] text-slate-300" style={{ wordBreak: 'keep-all' }}>
                  {f.label}
                </span>
              </div>
            )
          })}
        </section>

        {/* CTAs */}
        <section className="mt-12 flex flex-col items-center gap-4">
          <Link
            href="/destiny-map/theme"
            className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#7c5cff_0%,#9b7fff_100%)] px-8 py-4 text-[15px] font-semibold text-white shadow-[0_20px_60px_rgba(124,92,255,0.4)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_22px_70px_rgba(124,92,255,0.5)]"
          >
            관심 테마 고르기
            <span className="text-[18px] transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>

          <Link
            href="/premium-reports"
            className="text-[13px] text-slate-400 underline-offset-4 transition hover:text-cyan-300/80 hover:underline"
          >
            더 깊이 보고 싶다면 — Premium 리포트
          </Link>
        </section>

        {/* Bottom hint */}
        <p className="mx-auto mt-16 max-w-md text-center text-[11.5px] leading-relaxed text-slate-500">
          모든 분석은 사주명리·점성술 전통에 기반한 *참고 자료*이며 미래를 단정하지 않습니다.
        </p>
      </div>
    </div>
  )
}
