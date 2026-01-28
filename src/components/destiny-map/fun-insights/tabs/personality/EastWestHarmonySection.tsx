import type { MatrixAnalysisResult } from '../../analyzers/matrixAnalyzer';

interface EastWestHarmonySectionProps {
  matrixAnalysis: MatrixAnalysisResult;
  isKo: boolean;
}

export default function EastWestHarmonySection({ matrixAnalysis, isKo }: EastWestHarmonySectionProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-fuchsia-900/20 border border-fuchsia-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🌏🌍</span>
        <div>
          <h3 className="text-lg font-bold text-fuchsia-300">{isKo ? "동양 + 서양 에너지 조화" : "East + West Energy Harmony"}</h3>
          <p className="text-gray-400 text-xs">{isKo ? "사주(동양)와 별자리(서양)가 어떻게 어울리는지 알아봐요!" : "See how your Saju (East) and Zodiac (West) work together!"}</p>
        </div>
      </div>

      {/* 쉬운 설명 */}
      <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 border border-fuchsia-500/20">
        <p className="text-fuchsia-200 text-sm leading-relaxed mb-3">
          {isKo
            ? "🎭 당신은 동양 사주와 서양 별자리, 두 가지 에너지를 가지고 있어요. 이 두 에너지가 서로 도와주면 더 강해지고, 부딪히면 성장의 기회가 돼요!"
            : "🎭 You have two types of energy - Eastern Saju and Western Zodiac. When they help each other, you become stronger. When they clash, it's a chance to grow!"}
        </p>

        {/* 점수를 이모지로 표현 */}
        <div className="flex items-center justify-center gap-2 py-2">
          {matrixAnalysis.synergy.overallScore >= 7 ? (
            <>
              <span className="text-3xl">🤝</span>
              <span className="text-green-400 font-bold">{isKo ? "찰떡궁합!" : "Perfect Match!"}</span>
            </>
          ) : matrixAnalysis.synergy.overallScore >= 5 ? (
            <>
              <span className="text-3xl">⚖️</span>
              <span className="text-blue-400 font-bold">{isKo ? "균형 잡힌 조화" : "Balanced Harmony"}</span>
            </>
          ) : (
            <>
              <span className="text-3xl">🔥</span>
              <span className="text-amber-400 font-bold">{isKo ? "역동적인 에너지!" : "Dynamic Energy!"}</span>
            </>
          )}
        </div>
      </div>

      {/* 오행-서양원소 융합 - 쉬운 버전 */}
      {matrixAnalysis.elementFusions.length > 0 && (
        <div className="mb-5">
          <p className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
            <span>✨</span> {isKo ? "내 안의 두 에너지" : "Two Energies Inside Me"}
          </p>
          <div className="space-y-3">
            {matrixAnalysis.elementFusions.map((fusion, idx) => {
              // 쉬운 설명으로 변환
              const getEasyExplanation = () => {
                const level = fusion.fusion.level;
                const planet = idx === 0 ? (isKo ? '태양' : 'Sun') : (isKo ? '달' : 'Moon');
                const planetEmoji = idx === 0 ? '☀️' : '🌙';

                if (level === 'extreme' || level === 'amplify') {
                  return {
                    emoji: '💪',
                    text: isKo
                      ? `${planetEmoji} ${planet} 별자리와 사주가 서로 힘을 줘요! 시너지 폭발!`
                      : `${planetEmoji} Your ${planet} sign and Saju boost each other! Synergy explosion!`,
                    color: 'text-green-400',
                    bg: 'bg-green-500/10 border-green-500/20'
                  };
                } else if (level === 'balance') {
                  return {
                    emoji: '🤝',
                    text: isKo
                      ? `${planetEmoji} ${planet} 별자리와 사주가 평화롭게 공존해요`
                      : `${planetEmoji} Your ${planet} sign and Saju coexist peacefully`,
                    color: 'text-blue-400',
                    bg: 'bg-blue-500/10 border-blue-500/20'
                  };
                } else {
                  return {
                    emoji: '⚡',
                    text: isKo
                      ? `${planetEmoji} ${planet} 별자리와 사주 사이에 긴장감이 있어요. 하지만 이게 성장의 힘이에요!`
                      : `${planetEmoji} There's tension between your ${planet} sign and Saju. But this is the power to grow!`,
                    color: 'text-amber-400',
                    bg: 'bg-amber-500/10 border-amber-500/20'
                  };
                }
              };

              const easy = getEasyExplanation();

              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-4 rounded-xl ${easy.bg} border`}
                >
                  <span className="text-2xl">{easy.emoji}</span>
                  <p className={`text-sm ${easy.color} leading-relaxed`}>
                    {easy.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 강점 & 주의점 - 쉬운 버전 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {matrixAnalysis.synergy.topStrengths.length > 0 && (
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <p className="text-green-300 font-bold text-sm mb-3 flex items-center gap-2">
              <span className="text-xl">🌟</span> {isKo ? "이런 점이 좋아요!" : "Your Strengths!"}
            </p>
            <div className="space-y-2">
              {matrixAnalysis.synergy.topStrengths.slice(0, 3).map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-lg">{s.icon}</span>
                  <span className="text-gray-200 text-sm">{s.area}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {matrixAnalysis.synergy.topCautions.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-300 font-bold text-sm mb-3 flex items-center gap-2">
              <span className="text-xl">💡</span> {isKo ? "이것만 조심하면 더 좋아요!" : "Watch out for these!"}
            </p>
            <div className="space-y-2">
              {matrixAnalysis.synergy.topCautions.slice(0, 3).map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-lg">{c.icon}</span>
                  <span className="text-gray-200 text-sm">{c.area}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 팁 */}
      <div className="mt-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
        <p className="text-purple-300 text-xs text-center">
          {isKo
            ? "💜 동양과 서양, 두 지혜가 만나 더 풍부한 통찰을 줘요!"
            : "💜 Eastern and Western wisdom combine for richer insights!"}
        </p>
      </div>
    </div>
  );
}
