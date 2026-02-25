import type { PersonalityAnalysis } from './types';
import { ensureMinSentenceText } from '../shared/textDepth';

interface PersonalityAnalysisSectionProps {
  personalityAnalysis: PersonalityAnalysis;
  isKo: boolean;
}

export default function PersonalityAnalysisSection({ personalityAnalysis, isKo }: PersonalityAnalysisSectionProps) {
  const enrich = (text?: string, min = 4) =>
    ensureMinSentenceText(text || '', isKo, 'personality', min);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-amber-900/20 border border-amber-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🌟</span>
        <h3 className="text-lg font-bold text-amber-300">{isKo ? "나는 어떤 사람인가" : "Who Am I"}</h3>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-amber-300 font-bold mb-3 text-base">{personalityAnalysis.title}</p>
          <p className="text-gray-200 text-sm leading-relaxed mb-3">{enrich(personalityAnalysis.description, 5)}</p>
          <div className="flex flex-wrap gap-2">
            {personalityAnalysis.traits.map((trait, i) => (
              <span key={i} className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs">
                {trait}
              </span>
            ))}
          </div>
        </div>

        {/* 2x2 그리드: 이런점이좋아요, 조심하면더좋아요, 첫인상, 사고방식 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 min-h-[100px]">
            <p className="text-green-300 font-bold text-sm mb-2">✓ {isKo ? "이런 점이 좋아요" : "Your Strengths"}</p>
            <p className="text-gray-300 text-sm leading-relaxed">
              {enrich(personalityAnalysis.strengths.join(', '), 4)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 min-h-[100px]">
            <p className="text-orange-300 font-bold text-sm mb-2">⚡ {isKo ? "조심하면 더 좋아요" : "Watch Out For"}</p>
            <p className="text-gray-300 text-sm leading-relaxed">
              {enrich(personalityAnalysis.challenges.join(', '), 4)}
            </p>
          </div>
          {personalityAnalysis.socialImage && (
            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 min-h-[100px]">
              <p className="text-indigo-300 font-bold text-sm mb-2">👤 {isKo ? "첫인상" : "First Impression"}</p>
              <p className="text-gray-300 text-sm leading-relaxed">{enrich(personalityAnalysis.socialImage, 4)}</p>
            </div>
          )}
          {personalityAnalysis.thinkingStyle && (
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 min-h-[100px]">
              <p className="text-cyan-300 font-bold text-sm mb-2">🧠 {isKo ? "사고방식" : "Thinking Style"}</p>
              <p className="text-gray-300 text-sm leading-relaxed">{enrich(personalityAnalysis.thinkingStyle, 4)}</p>
            </div>
          )}
        </div>

        {/* 에너지 패턴 - 전체 너비 */}
        {personalityAnalysis.sibsinProfile && (
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <p className="text-purple-300 font-bold text-sm mb-2">🔮 {isKo ? "에너지 패턴" : "Energy Pattern"}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{enrich(personalityAnalysis.sibsinProfile, 4)}</p>
          </div>
        )}

        {/* 2x2 그리드: 현재생명력, 내면과외면조화, 의사결정스타일, 스트레스대응 */}
        {(personalityAnalysis.lifeStage || personalityAnalysis.sunMoonHarmony || personalityAnalysis.decisionMaking || personalityAnalysis.stressResponse) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {personalityAnalysis.lifeStage && (
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 min-h-[100px]">
                <p className="text-blue-300 font-bold text-sm mb-2">🌊 {isKo ? "현재 생명력" : "Current Vitality"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{enrich(personalityAnalysis.lifeStage, 4)}</p>
              </div>
            )}
            {personalityAnalysis.sunMoonHarmony && (
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 min-h-[100px]">
                <p className="text-yellow-300 font-bold text-sm mb-2">☀️🌙 {isKo ? "내면과 외면의 조화" : "Inner-Outer Harmony"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{enrich(personalityAnalysis.sunMoonHarmony, 4)}</p>
              </div>
            )}
            {personalityAnalysis.decisionMaking && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 min-h-[100px]">
                <p className="text-emerald-300 font-bold text-sm mb-2">🎯 {isKo ? "의사결정 스타일" : "Decision Making Style"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{enrich(personalityAnalysis.decisionMaking, 4)}</p>
              </div>
            )}
            {personalityAnalysis.stressResponse && (
              <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20 min-h-[100px]">
                <p className="text-pink-300 font-bold text-sm mb-2">🌀 {isKo ? "스트레스 대응" : "Stress Response"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{enrich(personalityAnalysis.stressResponse, 4)}</p>
              </div>
            )}
          </div>
        )}

        {/* 의사소통 스타일 - 전체 너비 */}
        {personalityAnalysis.communicationStyle && (
          <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
            <p className="text-teal-300 font-bold text-sm mb-2">💬 {isKo ? "의사소통 스타일" : "Communication Style"}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{enrich(personalityAnalysis.communicationStyle, 4)}</p>
          </div>
        )}

        {/* 내면 갈등 패턴 - 전체 너비 */}
        {personalityAnalysis.innerConflict && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <p className="text-rose-300 font-bold text-sm mb-2">💭 {isKo ? "내면 갈등 패턴" : "Inner Conflict Pattern"}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{enrich(personalityAnalysis.innerConflict, 4)}</p>
          </div>
        )}

        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <p className="text-sm flex items-start gap-3">
            <span className="text-xl">💫</span>
            <span className="text-amber-200 leading-relaxed">{enrich(personalityAnalysis.advice, 5)}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
