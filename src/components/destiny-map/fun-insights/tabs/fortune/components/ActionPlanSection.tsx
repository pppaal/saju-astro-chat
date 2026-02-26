// src/components/destiny-map/fun-insights/tabs/fortune/components/ActionPlanSection.tsx
'use client'

import { repairMojibakeText } from '@/lib/text/mojibake'
import { ensureMinSentenceText } from '../../shared/textDepth'
import type { FortuneActionPlan, ElementKey } from '../types'

const ELEMENT_META: Record<ElementKey, { icon: string; ko: string; en: string; tone: string }> = {
  wood: { icon: '🌱', ko: '목', en: 'Wood', tone: 'from-emerald-500/25 to-emerald-900/10' },
  fire: { icon: '🔥', ko: '화', en: 'Fire', tone: 'from-rose-500/25 to-rose-900/10' },
  earth: { icon: '🏔️', ko: '토', en: 'Earth', tone: 'from-amber-500/25 to-amber-900/10' },
  metal: { icon: '⚔️', ko: '금', en: 'Metal', tone: 'from-slate-400/25 to-slate-900/10' },
  water: { icon: '💧', ko: '수', en: 'Water', tone: 'from-cyan-500/25 to-cyan-900/10' },
}

interface ActionPlanSectionProps {
  actionPlan: FortuneActionPlan
  isKo: boolean
}

export default function ActionPlanSection({ actionPlan, isKo }: ActionPlanSectionProps) {
  const todayMeta = ELEMENT_META[actionPlan.today.element]
  const weekMeta = ELEMENT_META[actionPlan.week.element]
  const enrich = (text: string, topic: 'fortune' | 'warning' = 'fortune', min = 3) =>
    ensureMinSentenceText(repairMojibakeText(text), isKo, topic, min)

  return (
    <section className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-slate-900/85 to-slate-950/95 p-6 shadow-[0_10px_40px_rgba(16,185,129,0.12)]">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="text-2xl">✅</span>
        <h3 className="text-xl font-extrabold tracking-tight text-emerald-200">
          {isKo ? '행동 플랜' : 'Action Plan'}
        </h3>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">
          {isKo ? '오늘 · 이번 주 실행' : 'Today · This Week'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article
          className={`rounded-xl border border-emerald-400/25 bg-gradient-to-br ${todayMeta.tone} p-4`}
        >
          <header className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-extrabold text-emerald-100">
                {isKo ? '오늘 체크리스트' : 'Today Checklist'}
              </p>
              <p className="mt-1 text-xs text-emerald-200/90">
                {isKo ? '포커스' : 'Focus'}: {enrich(actionPlan.today.focus, 'fortune', 3)}
              </p>
            </div>
            <span className="rounded-full border border-emerald-300/30 bg-emerald-200/10 px-2 py-1 text-xs font-bold text-emerald-100">
              {todayMeta.icon} {isKo ? todayMeta.ko : todayMeta.en}
            </span>
          </header>

          <ol className="space-y-2 text-sm text-slate-100">
            {actionPlan.today.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-[11px] font-bold text-emerald-200">
                  {idx + 1}
                </span>
                <span>{repairMojibakeText(item)}</span>
              </li>
            ))}
          </ol>

          {actionPlan.today.timing && (
            <p className="mt-4 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200">
              ⏰ {isKo ? '추천 시간' : 'Best Timing'}: {repairMojibakeText(actionPlan.today.timing)}
            </p>
          )}
        </article>

        <article
          className={`rounded-xl border border-teal-400/25 bg-gradient-to-br ${weekMeta.tone} p-4`}
        >
          <header className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-extrabold text-teal-100">
                {isKo ? '이번 주 체크리스트' : 'This Week Checklist'}
              </p>
              <p className="mt-1 text-xs text-teal-200/90">
                {isKo ? '포커스' : 'Focus'}: {enrich(actionPlan.week.focus, 'fortune', 3)}
              </p>
            </div>
            <span className="rounded-full border border-teal-300/30 bg-teal-200/10 px-2 py-1 text-xs font-bold text-teal-100">
              {weekMeta.icon} {isKo ? weekMeta.ko : weekMeta.en}
            </span>
          </header>

          <ol className="space-y-2 text-sm text-slate-100">
            {actionPlan.week.items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-400/20 text-[11px] font-bold text-teal-200">
                  {idx + 1}
                </span>
                <span>{repairMojibakeText(item)}</span>
              </li>
            ))}
          </ol>

          {actionPlan.week.caution && (
            <p className="mt-4 rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-xs font-semibold text-rose-200">
              ⚠ {isKo ? '주의' : 'Caution'}: {enrich(actionPlan.week.caution, 'warning', 3)}
            </p>
          )}
        </article>
      </div>
    </section>
  )
}
