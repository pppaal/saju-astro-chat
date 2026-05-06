import type { LoveAnalysis } from './types';

interface CharmTimingSectionProps {
  loveAnalysis: LoveAnalysis;
  isKo: boolean;
}

export default function CharmTimingSection({ loveAnalysis, isKo }: CharmTimingSectionProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-rose-900/20 border border-rose-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">💘</span>
        <h3 className="text-lg font-bold text-rose-300">{isKo ? "연애 매력 & 타이밍" : "Love Charm & Timing"}</h3>
      </div>

      <div className="space-y-4">
        {/* 매력도 점수 */}
        {loveAnalysis.charmScore && (
          <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-pink-300 font-bold text-sm">✨ {isKo ? "연애 매력도" : "Love Charm Score"}</p>
              <span className="text-2xl font-bold text-pink-400">{loveAnalysis.charmScore}점</span>
            </div>
            <div className="h-3 bg-gray-800/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-700"
                style={{ width: `${loveAnalysis.charmScore}%` }}
              />
            </div>
            <p className="text-gray-400 text-xs mt-2">
              {isKo
                ? loveAnalysis.charmScore >= 80 ? "이성에게 매우 매력적으로 보여요!"
                  : loveAnalysis.charmScore >= 60 ? "자연스러운 매력이 있어요."
                  : "내면의 매력을 더 표현해보세요."
                : loveAnalysis.charmScore >= 80 ? "You're very attractive to others!"
                  : loveAnalysis.charmScore >= 60 ? "You have natural charm."
                  : "Try expressing your inner charm more."}
            </p>
          </div>
        )}

        {/* 연애 타이밍 */}
        {loveAnalysis.romanceTiming && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <p className="text-rose-300 font-bold text-sm mb-2">⏰ {isKo ? "연애 타이밍" : "Love Timing"}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.romanceTiming}</p>
          </div>
        )}
      </div>
    </div>
  );
}
