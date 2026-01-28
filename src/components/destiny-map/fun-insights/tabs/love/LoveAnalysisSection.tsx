import type { LoveAnalysis } from './types';

interface LoveAnalysisSectionProps {
  loveAnalysis: LoveAnalysis;
  isKo: boolean;
}

export default function LoveAnalysisSection({ loveAnalysis, isKo }: LoveAnalysisSectionProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-pink-900/20 border border-pink-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">💕</span>
        <h3 className="text-lg font-bold text-pink-300">{isKo ? "나는 사랑에서 어떤 사람인가" : "How I Love"}</h3>
      </div>

      <div className="space-y-4">
        {/* 연애 스타일 */}
        <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
          <p className="text-pink-300 font-bold mb-2 text-sm">💗 {isKo ? "당신의 사랑 스타일" : "Your Love Style"}</p>
          <p className="text-gray-200 text-sm leading-relaxed">{loveAnalysis.style}</p>
        </div>

        {/* 끌리는 타입 & 이상적인 파트너 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <p className="text-rose-300 font-bold mb-2 text-sm">✨ {isKo ? "끌리는 사람" : "Who Attracts You"}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.attract}</p>
          </div>
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <p className="text-purple-300 font-bold mb-2 text-sm">💜 {isKo ? "이상적인 파트너" : "Ideal Partner"}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.ideal}</p>
          </div>
        </div>

        {/* 연애 주의사항 */}
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <p className="text-orange-300 font-bold mb-2 text-sm">⚡ {isKo ? "연애 위험 신호" : "Love Danger Signs"}</p>
          <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.danger}</p>
        </div>

        {/* 궁합 좋은 타입 */}
        {loveAnalysis.compatibility.length > 0 && (
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-indigo-300 font-bold mb-2 text-sm">💫 {isKo ? "궁합 좋은 오행" : "Compatible Elements"}</p>
            <div className="flex flex-wrap gap-2">
              {loveAnalysis.compatibility.map((el, i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-sm">{el}</span>
              ))}
            </div>
          </div>
        )}

        {/* 7하우스 기반 파트너 패턴 & 십신 연애 에너지 */}
        {(loveAnalysis.lovePattern || loveAnalysis.sibsinLove) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {loveAnalysis.lovePattern && (
              <div className="p-4 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20">
                <p className="text-fuchsia-300 font-bold text-sm mb-2">🏠 {isKo ? "파트너 패턴" : "Partner Pattern"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.lovePattern}</p>
              </div>
            )}
            {loveAnalysis.sibsinLove && (
              <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <p className="text-violet-300 font-bold text-sm mb-2">🔮 {isKo ? "연애 에너지" : "Love Energy"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.sibsinLove}</p>
              </div>
            )}
          </div>
        )}

        {/* 금성 하우스 & 화성 스타일 */}
        {(loveAnalysis.venusHouse || loveAnalysis.marsStyle) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {loveAnalysis.venusHouse && (
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <p className="text-cyan-300 font-bold text-sm mb-2">📍 {isKo ? "인연 만나는 곳" : "Where to Meet Love"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.venusHouse}</p>
              </div>
            )}
            {loveAnalysis.marsStyle && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-red-300 font-bold text-sm mb-2">🔥 {isKo ? "표현 스타일" : "Expression Style"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.marsStyle}</p>
              </div>
            )}
          </div>
        )}

        {/* 감정적 니즈 & 금성 스타일 */}
        {(loveAnalysis.emotionalNeeds || loveAnalysis.venusStyle) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {loveAnalysis.emotionalNeeds && (
              <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20">
                <p className="text-pink-300 font-bold text-sm mb-2">💞 {isKo ? "감정적 니즈" : "Emotional Needs"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.emotionalNeeds}</p>
              </div>
            )}
            {loveAnalysis.venusStyle && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <p className="text-rose-300 font-bold text-sm mb-2">💎 {isKo ? "사랑 표현법" : "Love Expression"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.venusStyle}</p>
              </div>
            )}
          </div>
        )}

        {/* 애착 스타일 & 사랑의 언어 */}
        {(loveAnalysis.attachmentStyle || loveAnalysis.loveLanguage) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {loveAnalysis.attachmentStyle && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <p className="text-purple-300 font-bold text-sm mb-2">🔗 {isKo ? "애착 스타일" : "Attachment Style"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.attachmentStyle}</p>
              </div>
            )}
            {loveAnalysis.loveLanguage && (
              <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <p className="text-violet-300 font-bold text-sm mb-2">💬 {isKo ? "사랑의 언어" : "Love Language"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.loveLanguage}</p>
              </div>
            )}
          </div>
        )}

        {/* 갈등 해결 스타일 */}
        {loveAnalysis.conflictStyle && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-300 font-bold text-sm mb-2">⚡ {isKo ? "갈등 해결 스타일" : "Conflict Resolution Style"}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.conflictStyle}</p>
          </div>
        )}

        {/* 연애 조언 */}
        {loveAnalysis.advice && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/20">
            <p className="text-sm flex items-start gap-3">
              <span className="text-xl">💌</span>
              <span className="text-pink-200 leading-relaxed">{loveAnalysis.advice}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
