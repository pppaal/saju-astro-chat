'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowRight, Clock3, FileText, Layers, Sparkles } from 'lucide-react'
import PremiumPageScaffold from '@/app/premium-reports/_components/PremiumPageScaffold'

type ReportType = {
  id: 'timing' | 'themed' | 'comprehensive'
  title: string
  description: string
  credits: string
  href: string
  color: string
  icon: typeof Clock3
  options?: { label: string; href: string; credits: string }[]
}

const REPORT_TYPES: ReportType[] = [
  {
    id: 'timing',
    title: '타이밍 리포트',
    description: '일간/월간/연간 흐름과 이벤트 구간을 빠르게 확인합니다.',
    credits: '1~3 credits',
    href: '/premium-reports/timing?period=daily',
    color: 'from-cyan-500 to-blue-500',
    icon: Clock3,
    options: [
      { label: '일간', href: '/premium-reports/timing?period=daily', credits: '1 credit' },
      { label: '월간', href: '/premium-reports/timing?period=monthly', credits: '2 credits' },
      { label: '연간', href: '/premium-reports/timing?period=yearly', credits: '3 credits' },
    ],
  },
  {
    id: 'themed',
    title: '테마 리포트',
    description: '사랑, 커리어, 재물, 건강, 가족 주제를 선택해 집중 분석합니다.',
    credits: '2 credits',
    href: '/premium-reports/themed',
    color: 'from-violet-500 to-fuchsia-500',
    icon: Layers,
  },
  {
    id: 'comprehensive',
    title: '종합 리포트',
    description: '사주+점성 핵심 신호를 통합해 장기 전략을 한 번에 정리합니다.',
    credits: '3 credits',
    href: '/premium-reports/comprehensive',
    color: 'from-amber-500 to-orange-500',
    icon: FileText,
  },
]

const HIGHLIGHTS = [
  { label: '분석 모드', value: 'Timing / Themed / Comprehensive' },
  { label: '입력 폼', value: '통합 생년월일 + 도시 + 시간' },
  { label: '결과 형식', value: 'HTML + PDF 다운로드' },
]

export default function PremiumReportsPage() {
  const router = useRouter()
  const { status } = useSession()

  const isAuthed = useMemo(() => status === 'authenticated', [status])

  const openRoute = (href: string) => {
    if (!isAuthed) {
      router.push('/auth/signin?callbackUrl=/premium-reports')
      return
    }
    router.push(href)
  }

  return (
    <PremiumPageScaffold accent="violet">
      <header className="px-4 pb-8 pt-12">
        <div className="mx-auto max-w-6xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-400/10 px-4 py-1 text-xs font-semibold tracking-wide text-cyan-200">
            <Sparkles className="h-3.5 w-3.5" />
            AI PREMIUM REPORT
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-5xl">
            Premium AI Report Center
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
            Destiny Matrix + GraphRAG 기반으로 타이밍, 테마, 종합 리포트를 생성합니다. 결과는
            화면에서 바로 읽고 PDF로 내려받아 저장할 수 있습니다.
          </p>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {HIGHLIGHTS.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/15 bg-slate-900/55 px-4 py-3 backdrop-blur-xl"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-cyan-200/90">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          {REPORT_TYPES.map((report) => {
            const Icon = report.icon

            return (
              <article
                key={report.id}
                className="group relative overflow-hidden rounded-3xl border border-white/15 bg-slate-900/55 p-6 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-300/60 hover:shadow-[0_18px_50px_rgba(14,165,233,0.25)]"
              >
                <div
                  className={`absolute -right-10 -top-12 h-32 w-32 rounded-full bg-gradient-to-br ${report.color} opacity-35 blur-2xl`}
                />

                <div className="relative z-10">
                  <div
                    className={`inline-flex rounded-xl bg-gradient-to-r p-2.5 text-white shadow-lg shadow-black/40 ${report.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <h2 className="mt-4 text-lg font-bold text-white">{report.title}</h2>
                  <p className="mt-2 min-h-[54px] text-sm leading-6 text-slate-300">
                    {report.description}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-cyan-200">{report.credits}</p>

                  {report.options ? (
                    <div className="mt-4 space-y-2">
                      {report.options.map((option) => (
                        <button
                          key={option.href}
                          onClick={() => openRoute(option.href)}
                          className="flex w-full items-center justify-between rounded-xl border border-slate-600/80 bg-slate-950/55 px-3 py-2 text-left text-sm text-slate-100 transition hover:border-cyan-300/70 hover:bg-slate-900"
                        >
                          <span>{option.label}</span>
                          <span className="text-xs text-slate-400">{option.credits}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={() => openRoute(report.href)}
                      className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 ${report.color}`}
                    >
                      시작하기
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-white/15 bg-slate-900/50 p-5 text-sm text-slate-300 backdrop-blur-xl">
          <p>생성된 리포트는 My Journey에서 다시 확인할 수 있습니다.</p>
          <Link
            href="/myjourney"
            className="mt-2 inline-flex items-center gap-1 font-semibold text-cyan-200 hover:text-cyan-100"
          >
            My Journey로 이동
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </PremiumPageScaffold>
  )
}
