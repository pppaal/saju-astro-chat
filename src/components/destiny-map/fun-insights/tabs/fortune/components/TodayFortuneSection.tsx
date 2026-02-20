// src/components/destiny-map/fun-insights/tabs/fortune/components/TodayFortuneSection.tsx
'use client'

import { repairMojibakeText } from '@/lib/text/mojibake'
import type { TodayFortune } from '../types'

interface TodayFortuneSectionProps {
  todayFortune: TodayFortune
  isKo: boolean
}

export default function TodayFortuneSection({ todayFortune, isKo }: TodayFortuneSectionProps) {
  return (
    <section className="rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-slate-900/85 to-indigo-950/25 p-6 shadow-[0_8px_32px_rgba(99,102,241,0.15)]">
      <header className="mb-4 flex items-center gap-3">
        <span className="text-2xl">{repairMojibakeText(todayFortune.fortune.emoji)}</span>
        <h3 className="text-xl font-extrabold text-indigo-200">
          {isKo ? '오늘의 운세' : "Today's Fortune"}
        </h3>
        {todayFortune.ganji && (
          <span className="rounded-full border border-indigo-300/30 bg-indigo-300/10 px-2 py-1 text-xs font-medium text-indigo-100">
            {repairMojibakeText(todayFortune.ganji)}
          </span>
        )}
      </header>

      <div className="space-y-3">
        <article className="rounded-xl border border-indigo-400/25 bg-indigo-500/10 p-4">
          <p className="mb-2 text-sm font-bold text-indigo-200">
            {repairMojibakeText(todayFortune.fortune.mood)}
          </p>
          <p className="text-sm leading-relaxed text-slate-100">
            {repairMojibakeText(todayFortune.fortune.tip)}
          </p>
        </article>

        <p className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200">
          ⏰ {isKo ? '행운의 시간' : 'Lucky Time'}:{' '}
          {repairMojibakeText(todayFortune.fortune.luckyTime)}
        </p>
      </div>
    </section>
  )
}
