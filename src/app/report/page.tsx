import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Report | DestinyPal',
  description: 'Explore premium AI reports with timing, themed, and comprehensive insights.',
  alternates: {
    canonical: '/report',
  },
}

export default function ReportPage() {
  return (
    <main className="min-h-[100svh] bg-slate-950 text-slate-100">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-widest text-slate-400">DestinyPal Report</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Premium AI Report</h1>
          <p className="max-w-2xl text-slate-300">
            Choose timing, themed, or comprehensive reports to get practical, personalized insights.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-medium">Generate a report</h2>
            <p className="mt-2 text-sm text-slate-300">
              Start a new report from the full report center.
            </p>
            <Link
              href="/premium-reports"
              className="mt-4 inline-flex rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
            >
              Open report center
            </Link>
          </article>
          <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
            <h2 className="text-lg font-medium">View report history</h2>
            <p className="mt-2 text-sm text-slate-300">
              Revisit your past readings and saved results in My Journey.
            </p>
            <Link
              href="/myjourney"
              className="mt-4 inline-flex rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 hover:border-slate-500"
            >
              Go to My Journey
            </Link>
          </article>
        </div>
      </section>
    </main>
  )
}
