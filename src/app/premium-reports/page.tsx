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
    title: '??? ???',
    description: '??/??/?? ??? ??? ??? ??? ?????.',
    credits: '1~3 credits',
    href: '/premium-reports/timing?period=daily&tier=premium',
    color: 'from-cyan-500 to-blue-500',
    icon: Clock3,
    options: [
      { label: '??', href: '/premium-reports/timing?period=daily&tier=premium', credits: '1 credit' },
      { label: '??', href: '/premium-reports/timing?period=monthly&tier=premium', credits: '2 credits' },
      { label: '??', href: '/premium-reports/timing?period=yearly&tier=premium', credits: '3 credits' },
    ],
  },
  {
    id: 'themed',
    title: '?? ???',
    description: '??, ???, ??, ??, ?? ??? ??? ?? ?????.',
    credits: '3 credits',
    href: '/premium-reports/themed?tier=premium',
    color: 'from-violet-500 to-fuchsia-500',
    icon: Layers,
  },
  {
    id: 'comprehensive',
    title: '?? ???',
    description: '??+?? ?? ??? ??? ?? ??? ? ?? ?????.',
    credits: '3 credits',
    href: '/premium-reports/comprehensive?tier=premium',
    color: 'from-amber-500 to-orange-500',
    icon: FileText,
  },
]

const HIGHLIGHTS = [
  { label: '?? ??', value: 'Free / Premium' },
  { label: '?? ?', value: '??? ? ?? ??? ?' },
  { label: '?? ??', value: '?? ?? + ???? ??/PDF' },
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
            AI REPORT CENTER
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-5xl">
            AI Report Free / Premium
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
            ?? ??? ?? ??? ???? ??? ????, ???? ??? ?? ??,
            ?? ?? ??, PDF ???? ?????.
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

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <article className="rounded-3xl border border-emerald-300/35 bg-gradient-to-br from-emerald-500/15 to-teal-500/10 p-5 backdrop-blur-xl">
              <p className="text-xs font-semibold text-emerald-200">FREE VERSION</p>
              <h2 className="mt-1 text-xl font-extrabold text-white">?? ?? ???</h2>
              <p className="mt-2 text-sm text-slate-200">
                ?? ??, ?? ????, ?? ?? ??? ?? ??? ???? ?????.
              </p>
              <button
                onClick={() => openRoute('/premium-reports/comprehensive?tier=free')}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-bold text-white hover:brightness-110"
              >
                ?? ?? ??
                <ArrowRight className="h-4 w-4" />
              </button>
            </article>

            <article className="rounded-3xl border border-cyan-300/35 bg-gradient-to-br from-cyan-500/15 to-indigo-500/10 p-5 backdrop-blur-xl">
              <p className="text-xs font-semibold text-cyan-200">PREMIUM VERSION</p>
              <h2 className="mt-1 text-xl font-extrabold text-white">?? AI ???</h2>
              <p className="mt-2 text-sm text-slate-200">
                ??/???/?? ???? ?? ?? ?? ?? ??, ?? ??, PDF? ?????.
              </p>
              <button
                onClick={() => openRoute('/premium-reports/comprehensive?tier=premium')}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-sm font-bold text-white hover:brightness-110"
              >
                ???? ??
                <ArrowRight className="h-4 w-4" />
              </button>
            </article>
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
                      ????
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-white/15 bg-slate-900/50 p-5 text-sm text-slate-300 backdrop-blur-xl">
          <p>??? ???? My Journey?? ?? ??? ? ????.</p>
          <Link
            href="/myjourney"
            className="mt-2 inline-flex items-center gap-1 font-semibold text-cyan-200 hover:text-cyan-100"
          >
            My Journey? ??
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    </PremiumPageScaffold>
  )
}
