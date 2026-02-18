'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Clock3, Layers, FileText } from 'lucide-react'

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
    description: '일간/월간/연간 흐름을 빠르게 확인합니다.',
    credits: '1~3 credits',
    href: '/premium-reports/timing?period=daily',
    color: 'from-blue-500 to-cyan-500',
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
    description: '사랑, 커리어, 재물, 건강, 가족 주제로 깊게 분석합니다.',
    credits: '2 credits',
    href: '/premium-reports/themed',
    color: 'from-violet-500 to-pink-500',
    icon: Layers,
  },
  {
    id: 'comprehensive',
    title: '종합 리포트',
    description: '핵심 전 영역을 한 번에 정리한 프리미엄 종합 분석입니다.',
    credits: '3 credits',
    href: '/premium-reports/comprehensive',
    color: 'from-amber-500 to-orange-500',
    icon: FileText,
  },
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
    <div className="min-h-[100svh] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <header className="px-4 py-12 text-center">
        <h1 className="text-3xl font-bold text-white md:text-4xl">Premium AI Report Center</h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-300">
          통합 생년월일 폼 기반으로 타이밍, 테마, 종합 리포트를 생성할 수 있습니다.
        </p>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          {REPORT_TYPES.map((report) => {
            const Icon = report.icon
            return (
              <article
                key={report.id}
                className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-5"
              >
                <div className={`inline-flex rounded-lg bg-gradient-to-r ${report.color} p-2`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-white">{report.title}</h2>
                <p className="mt-2 min-h-[48px] text-sm text-slate-300">{report.description}</p>
                <p className="mt-2 text-xs text-cyan-300">{report.credits}</p>

                {report.options ? (
                  <div className="mt-4 grid gap-2">
                    {report.options.map((option) => (
                      <button
                        key={option.href}
                        onClick={() => openRoute(option.href)}
                        className="rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-left text-sm text-slate-100 hover:border-cyan-400"
                      >
                        <span>{option.label}</span>
                        <span className="ml-2 text-xs text-slate-400">{option.credits}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => openRoute(report.href)}
                    className={`mt-4 w-full rounded-lg bg-gradient-to-r px-3 py-2 text-sm font-semibold text-white ${report.color}`}
                  >
                    시작하기
                  </button>
                )}
              </article>
            )
          })}
        </div>

        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-5 text-sm text-slate-300">
          <p>리포트 생성 후 결과는 My Journey에서 다시 확인할 수 있습니다.</p>
          <Link href="/myjourney" className="mt-2 inline-block text-cyan-300 hover:text-cyan-200">
            My Journey로 이동
          </Link>
        </div>
      </main>
    </div>
  )
}
