import type { CareerAnalysis } from './types';

interface WealthTimingSectionProps {
  careerAnalysis: CareerAnalysis;
  isKo: boolean;
}

export default function WealthTimingSection({ careerAnalysis, isKo }: WealthTimingSectionProps) {
  if (!(careerAnalysis.wealthScore || careerAnalysis.wealthStyle || careerAnalysis.successTiming)) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-amber-900/20 border border-amber-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">💰</span>
        <h3 className="text-lg font-bold text-amber-300">{isKo ? "재물운 & 성공 타이밍" : "Wealth & Success Timing"}</h3>
      </div>

      <div className="space-y-4">
        {/* 재물운 점수 */}
        {careerAnalysis.wealthScore && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center justify-between mb-2">
              <p className="text-amber-300 font-bold text-sm">💎 {isKo ? "재물운 점수" : "Wealth Fortune Score"}</p>
              <span className="text-2xl font-bold text-amber-400">{careerAnalysis.wealthScore}점</span>
            </div>
            <div className="h-3 bg-gray-800/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-700"
                style={{ width: `${careerAnalysis.wealthScore}%` }}
              />
            </div>
            <p className="text-gray-400 text-xs mt-2">
              {isKo
                ? careerAnalysis.wealthScore >= 80 ? "타고난 재물복이 있어요!"
                  : careerAnalysis.wealthScore >= 60 ? "꾸준한 노력으로 부를 쌓아요."
                  : "전략적인 재테크가 필요해요."
                : careerAnalysis.wealthScore >= 80 ? "You have natural wealth fortune!"
                  : careerAnalysis.wealthScore >= 60 ? "Build wealth through steady effort."
                  : "Strategic financial planning is key."}
            </p>
          </div>
        )}

        {/* 재물 스타일 */}
        {careerAnalysis.wealthStyle && (
          <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-yellow-300 font-bold text-sm mb-2">🏦 {isKo ? "재물 스타일" : "Wealth Style"}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{careerAnalysis.wealthStyle}</p>
          </div>
        )}

        {/* 성공 시기 */}
        {careerAnalysis.successTiming && (
          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <p className="text-orange-300 font-bold text-sm mb-2">⏰ {isKo ? "성공 시기" : "Success Timing"}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{careerAnalysis.successTiming}</p>
          </div>
        )}
      </div>
    </div>
  );
}
