// src/components/destiny-map/fun-insights/tabs/fortune/components/ActionPlanSection.tsx
"use client";

import type { FortuneActionPlan, ElementKey } from '../types';

const ELEMENT_META: Record<ElementKey, { icon: string; ko: string; en: string }> = {
  wood: { icon: '🌱', ko: '목', en: 'Wood' },
  fire: { icon: '🔥', ko: '화', en: 'Fire' },
  earth: { icon: '🏔️', ko: '토', en: 'Earth' },
  metal: { icon: '⚔️', ko: '금', en: 'Metal' },
  water: { icon: '💧', ko: '수', en: 'Water' }
};

interface ActionPlanSectionProps {
  actionPlan: FortuneActionPlan;
  isKo: boolean;
}

export default function ActionPlanSection({ actionPlan, isKo }: ActionPlanSectionProps) {
  const todayMeta = ELEMENT_META[actionPlan.today.element];
  const weekMeta = ELEMENT_META[actionPlan.week.element];

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-emerald-900/20 border border-emerald-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">✅</span>
        <h3 className="text-lg font-bold text-emerald-300">
          {isKo ? '행동 플랜' : 'Action Plan'}
        </h3>
        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200">
          {isKo ? '오늘/이번 주 체크리스트' : 'Today/This Week Checklist'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-emerald-300 font-bold text-sm">{isKo ? '오늘 체크리스트' : 'Today Checklist'}</p>
            <span className="text-xs text-emerald-200">{todayMeta.icon} {isKo ? todayMeta.ko : todayMeta.en}</span>
          </div>
          {actionPlan.today.focus && (
            <p className="text-emerald-200/90 text-xs mb-3">
              {isKo ? '포커스' : 'Focus'}: {actionPlan.today.focus}
            </p>
          )}
          <ul className="space-y-2 text-sm">
            {actionPlan.today.items.map((item, idx) => (
              <li key={idx} className="flex gap-2 text-gray-200">
                <span className="text-emerald-400">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {actionPlan.today.timing && (
            <p className="text-xs text-amber-300 mt-3">
              ⏰ {isKo ? '추천 시간' : 'Best Timing'}: {actionPlan.today.timing}
            </p>
          )}
        </div>

        <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-teal-300 font-bold text-sm">{isKo ? '이번 주 체크리스트' : 'This Week Checklist'}</p>
            <span className="text-xs text-teal-200">{weekMeta.icon} {isKo ? weekMeta.ko : weekMeta.en}</span>
          </div>
          {actionPlan.week.focus && (
            <p className="text-teal-200/90 text-xs mb-3">
              {isKo ? '포커스' : 'Focus'}: {actionPlan.week.focus}
            </p>
          )}
          <ul className="space-y-2 text-sm">
            {actionPlan.week.items.map((item, idx) => (
              <li key={idx} className="flex gap-2 text-gray-200">
                <span className="text-teal-400">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {actionPlan.week.caution && (
            <p className="text-xs text-rose-300 mt-3">
              ⚠ {isKo ? '주의' : 'Caution'}: {actionPlan.week.caution}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
