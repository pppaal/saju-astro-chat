import Link from 'next/link'
import { Compass, Sparkles } from 'lucide-react'
import { getServerLocale } from '@/components/seo/SEO'

export default async function DestinyMapPage() {
  const locale = await getServerLocale()
  const isKo = locale === 'ko'

  const labels = {
    badge: isKo ? 'Free · 운명 지도' : 'Free · Destiny Map',
    title: isKo ? (
      <>
        사주와 점성으로
        <br />
        지금의 결을 비춰드려요
      </>
    ) : (
      <>
        Where Saju and astrology
        <br />
        light up your current path
      </>
    ),
    intro: isKo
      ? '관심 영역 하나만 골라주시면 본인 사주·점성 데이터를 교차 분석해 성향·시기·핵심 결을 무료로 풀어드려요.'
      : 'Pick one area you care about and we cross-read your Saju and astrology charts to surface your traits, timing, and core threads — free.',
    features: isKo
      ? [
          { Icon: Sparkles, label: '사주 + 점성 통합 시각' },
          { Icon: Compass, label: '관심 테마별 풀이' },
          { Icon: Sparkles, label: '인생·시기 흐름 예측' },
          { Icon: Compass, label: '핵심 영역 한눈에' },
        ]
      : [
          { Icon: Sparkles, label: 'Saju + astrology fused view' },
          { Icon: Compass, label: 'Theme-by-theme breakdown' },
          { Icon: Sparkles, label: 'Life-stage timing forecast' },
          { Icon: Compass, label: 'Core areas at a glance' },
        ],
    cta: isKo ? '리포트 시작' : 'Start report',
    disclaimerHead: isKo
      ? '모든 분석은 사주명리·점성술 전통에 기반한 '
      : 'All readings are grounded in classical Saju and astrology as ',
    disclaimerEm: isKo ? '참고 자료' : 'reference material',
    disclaimerTail: isKo ? '이며 미래를 단정하지 않습니다.' : ' — not predictions of fate.',
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#1a1c2e_0%,#0a0a14_60%)] text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28">
        {/* Hero */}
        <header className="space-y-5 text-center">
          <div className="flex justify-center">
            <span
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.32em]"
              style={{
                borderColor: 'rgba(148,163,184,0.4)',
                color: '#cbd5e1',
                background: 'rgba(148,163,184,0.1)',
              }}
            >
              {labels.badge}
            </span>
          </div>

          <h1
            className="text-balance bg-[linear-gradient(135deg,#fff_0%,#a89fcf_100%)] bg-clip-text text-4xl font-semibold leading-[1.1] text-transparent md:text-5xl lg:text-6xl"
            style={{ letterSpacing: '-0.025em', wordBreak: 'keep-all' }}
          >
            {labels.title}
          </h1>

          <p
            className="mx-auto max-w-xl pt-2 text-[15px] leading-[1.7] text-slate-400"
            style={{ wordBreak: 'keep-all' }}
          >
            {labels.intro}
          </p>
        </header>

        {/* Feature pills */}
        <section className="mx-auto mt-12 grid max-w-2xl gap-3 sm:grid-cols-2">
          {labels.features.map((f, i) => {
            const Icon = f.Icon
            return (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-md"
              >
                <Icon className="h-4 w-4 flex-shrink-0 text-cyan-300" strokeWidth={1.5} />
                <span className="text-[14px] text-slate-300" style={{ wordBreak: 'keep-all' }}>
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
            {labels.cta}
            <span className="text-[18px] transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </section>

        {/* Bottom hint */}
        <p className="mx-auto mt-16 max-w-md text-center text-[12px] leading-relaxed text-slate-500">
          {labels.disclaimerHead}
          <em className="not-italic text-slate-400">{labels.disclaimerEm}</em>
          {labels.disclaimerTail}
        </p>
      </div>
    </div>
  )
}
