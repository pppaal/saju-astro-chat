// src/components/destiny-map/fun-insights/tabs/fortune/components/MonthFortuneSection.tsx
"use client";

import type { MonthFortune } from '../types';

interface MonthFortuneSectionProps {
  monthFortune: MonthFortune;
  isKo: boolean;
}

export default function MonthFortuneSection({ monthFortune, isKo }: MonthFortuneSectionProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-emerald-900/20 border border-emerald-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{monthFortune.fortune.emoji}</span>
        <h3 className="text-lg font-bold text-emerald-300">
          {isKo ? `${monthFortune.monthName} 운세` : `${monthFortune.monthName} Fortune`}
        </h3>
        {monthFortune.ganji && <span className="text-sm text-gray-400">({monthFortune.ganji})</span>}
      </div>

      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-emerald-300 font-bold text-base mb-2">{monthFortune.fortune.theme}</p>
          <p className="text-gray-300 text-sm leading-relaxed">{monthFortune.fortune.advice}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-emerald-400 font-bold text-xs mb-1 flex items-center gap-1">
              <span>💼</span> {isKo ? "일/학업" : "Work"}
            </p>
            <p className="text-gray-300 text-xs leading-relaxed">{monthFortune.detail.work}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-pink-400 font-bold text-xs mb-1 flex items-center gap-1">
              <span>💕</span> {isKo ? "연애/관계" : "Love"}
            </p>
            <p className="text-gray-300 text-xs leading-relaxed">{monthFortune.detail.love}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-yellow-400 font-bold text-xs mb-1 flex items-center gap-1">
              <span>💰</span> {isKo ? "재물" : "Money"}
            </p>
            <p className="text-gray-300 text-xs leading-relaxed">{monthFortune.detail.money}</p>
          </div>
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <p className="text-red-400 font-bold text-xs mb-1 flex items-center gap-1">
              <span>❤️‍🩹</span> {isKo ? "건강" : "Health"}
            </p>
            <p className="text-gray-300 text-xs leading-relaxed">{monthFortune.detail.health}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
