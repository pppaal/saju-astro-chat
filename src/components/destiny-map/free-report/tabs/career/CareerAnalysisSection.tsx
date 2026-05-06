import type { CareerAnalysis } from './types';
import { ensureMinSentenceText } from '../shared/textDepth';

interface CareerAnalysisSectionProps {
  careerAnalysis: CareerAnalysis;
  isKo: boolean;
}

export default function CareerAnalysisSection({ careerAnalysis, isKo }: CareerAnalysisSectionProps) {
  const enrich = (text?: string, min = 4) =>
    ensureMinSentenceText(text || '', isKo, 'career', min);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-emerald-900/20 border border-emerald-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">📈</span>
        <h3 className="text-lg font-bold text-emerald-300">{isKo ? "나는 어떤 일에서 빛나나" : "Where I Shine"}</h3>
      </div>

      <div className="space-y-4">
        {/* 강점 & 스타일 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-emerald-300 font-bold mb-2 text-sm">💪 {isKo ? "직업적 강점" : "Career Strength"}</p>
            <ul className="text-gray-200 text-sm leading-relaxed space-y-1">
              {careerAnalysis.strengths?.map((s, i) => (
                <li key={i}>• {enrich(s, 3)}</li>
              ))}
            </ul>
          </div>
          <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
            <p className="text-teal-300 font-bold mb-2 text-sm">🎯 {isKo ? "일하는 스타일" : "Work Style"}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{enrich(careerAnalysis.workStyle, 4)}</p>
          </div>
        </div>

        {/* 이상적인 직업 */}
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
          <p className="text-cyan-300 font-bold mb-2 text-sm">✨ {isKo ? "잘 맞는 일" : "Ideal Work"}</p>
          <p className="text-gray-300 text-sm leading-relaxed">{enrich(careerAnalysis.idealEnvironment, 4)}</p>
        </div>

        {/* 주의사항 */}
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <p className="text-orange-300 font-bold mb-2 text-sm">⚠️ {isKo ? "주의할 점" : "Watch Out"}</p>
          <p className="text-gray-300 text-sm leading-relaxed">{enrich(careerAnalysis.avoidEnvironment, 4)}</p>
        </div>

        {/* 추천 산업 */}
        {careerAnalysis.suggestedFields?.length > 0 && (
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-indigo-300 font-bold mb-2 text-sm">🏢 {isKo ? "추천 분야" : "Recommended Fields"}</p>
            <div className="flex flex-wrap gap-2">
              {careerAnalysis.suggestedFields.map((field, i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-sm">{field}</span>
              ))}
            </div>
          </div>
        )}

        {/* 공식 이미지 & 목성 축복 */}
        {(careerAnalysis.publicImage || careerAnalysis.jupiterBlessings) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {careerAnalysis.publicImage && (
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <p className="text-purple-300 font-bold text-sm mb-2">🎯 {isKo ? "공식 이미지" : "Public Image"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{enrich(careerAnalysis.publicImage, 4)}</p>
              </div>
            )}
            {careerAnalysis.jupiterBlessings && (
              <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-yellow-300 font-bold text-sm mb-2">🌟 {isKo ? "행운의 분야" : "Lucky Field"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{enrich(careerAnalysis.jupiterBlessings, 4)}</p>
              </div>
            )}
          </div>
        )}

        {/* 십신 커리어 */}
        {careerAnalysis.sibsinCareer && (
          <div className="p-4 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20">
            <p className="text-fuchsia-300 font-bold text-sm mb-2">🔮 {isKo ? "에너지 활용법" : "Energy Utilization"}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{enrich(careerAnalysis.sibsinCareer, 4)}</p>
          </div>
        )}

        {/* 리더십 & 팀워크 스타일 */}
        {(careerAnalysis.leadershipStyle || careerAnalysis.teamworkStyle) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {careerAnalysis.leadershipStyle && (
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-blue-300 font-bold text-sm mb-2">👑 {isKo ? "리더십 스타일" : "Leadership Style"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{enrich(careerAnalysis.leadershipStyle, 4)}</p>
              </div>
            )}
            {careerAnalysis.teamworkStyle && (
              <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <p className="text-cyan-300 font-bold text-sm mb-2">🤝 {isKo ? "협업 스타일" : "Teamwork Style"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{enrich(careerAnalysis.teamworkStyle, 4)}</p>
              </div>
            )}
          </div>
        )}

        {/* 커리어 경로 & 현재 단계 */}
        {(careerAnalysis.careerPath || careerAnalysis.currentPhase) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {careerAnalysis.careerPath && (
              <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <p className="text-violet-300 font-bold text-sm mb-2">🛤️ {isKo ? "커리어 패스" : "Career Path"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{enrich(careerAnalysis.careerPath, 4)}</p>
              </div>
            )}
            {careerAnalysis.currentPhase && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <p className="text-rose-300 font-bold text-sm mb-2">📍 {isKo ? "현재 단계" : "Current Phase"}</p>
                <p className="text-gray-300 text-sm leading-relaxed">{enrich(careerAnalysis.currentPhase, 4)}</p>
              </div>
            )}
          </div>
        )}

        {/* 의사결정 스타일 */}
        {careerAnalysis.decisionStyle && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-300 font-bold text-sm mb-2">🧠 {isKo ? "의사결정 스타일" : "Decision Making Style"}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{enrich(careerAnalysis.decisionStyle, 4)}</p>
          </div>
        )}

        {/* 성장 팁 */}
        {careerAnalysis.growthTip && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
            <p className="text-sm flex items-start gap-3">
              <span className="text-xl">💡</span>
              <span className="text-emerald-200 leading-relaxed">{enrich(careerAnalysis.growthTip, 5)}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
