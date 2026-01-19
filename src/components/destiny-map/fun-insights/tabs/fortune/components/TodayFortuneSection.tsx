// src/components/destiny-map/fun-insights/tabs/fortune/components/TodayFortuneSection.tsx
"use client";

import type { TodayFortune } from '../types';

interface TodayFortuneSectionProps {
  todayFortune: TodayFortune;
  isKo: boolean;
}

export default function TodayFortuneSection({ todayFortune, isKo }: TodayFortuneSectionProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-indigo-900/20 border border-indigo-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{todayFortune.fortune.emoji}</span>
        <h3 className="text-lg font-bold text-indigo-300">{isKo ? "오늘의 운세" : "Today's Fortune"}</h3>
        {todayFortune.ganji && <span className="text-sm text-gray-400">({todayFortune.ganji})</span>}
      </div>

      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <p className="text-indigo-300 font-bold text-sm mb-2">{todayFortune.fortune.mood}</p>
          <p className="text-gray-300 text-sm leading-relaxed">{todayFortune.fortune.tip}</p>
        </div>

        <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-yellow-300 font-bold text-xs flex items-center gap-2">
            <span>⏰</span> {isKo ? "행운의 시간" : "Lucky Time"}: {todayFortune.fortune.luckyTime}
          </p>
        </div>
      </div>
    </div>
  );
}
