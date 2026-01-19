// src/components/destiny-map/fun-insights/tabs/fortune/components/YearFortuneSection.tsx
"use client";

import type { YearFortune } from '../types';

interface YearFortuneSectionProps {
  yearFortune: YearFortune;
  dayMaster: string;
  isKo: boolean;
}

export default function YearFortuneSection({ yearFortune, dayMaster, isKo }: YearFortuneSectionProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-fuchsia-900/20 border border-fuchsia-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{yearFortune.fortune.emoji}</span>
        <h3 className="text-lg font-bold text-fuchsia-300">
          {isKo ? `${yearFortune.year}년 운세` : `${yearFortune.year} Fortune`}
        </h3>
        {yearFortune.ganji && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-400">
            {yearFortune.ganji}
          </span>
        )}
        {dayMaster && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
            {isKo ? `${dayMaster} 일간` : `Day: ${dayMaster}`}
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="p-4 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20">
          <p className="text-fuchsia-300 font-bold text-base mb-2">{yearFortune.fortune.theme}</p>
          <p className="text-gray-300 text-sm leading-relaxed mb-2">{yearFortune.fortune.desc}</p>
          <p className="text-fuchsia-200 text-sm">{yearFortune.fortune.advice}</p>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-fuchsia-400 font-bold text-sm mb-2">📌 {yearFortune.relation.relation}</p>
          <p className="text-gray-300 text-sm leading-relaxed mb-3">{yearFortune.relation.impact}</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-fuchsia-500/10">
              <span className="text-fuchsia-300 font-medium">{isKo ? "집중할 것" : "Focus"}</span>
              <p className="text-gray-400 mt-1">{yearFortune.relation.focus}</p>
            </div>
            <div className="p-2 rounded-lg bg-red-500/10">
              <span className="text-red-300 font-medium">{isKo ? "주의할 것" : "Caution"}</span>
              <p className="text-gray-400 mt-1">{yearFortune.relation.caution}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
