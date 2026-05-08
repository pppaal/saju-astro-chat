import type { ShadowPersonalityResult } from '../../analyzers/matrixAnalyzer';

interface ShadowSelfSectionProps {
  shadowAnalysis: ShadowPersonalityResult;
  isKo: boolean;
}

export default function ShadowSelfSection({ shadowAnalysis, isKo }: ShadowSelfSectionProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-gray-900/50 border border-gray-600/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🌑</span>
        <div>
          <h3 className="text-lg font-bold text-gray-300">{isKo ? '숨겨진 나 (그림자 자아)' : 'Hidden Self (Shadow)'}</h3>
          <p className="text-gray-500 text-xs">{isKo ? '무의식 속 억압된 에너지와 잠재력' : 'Suppressed energy and potential in the unconscious'}</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Lilith 분석 (L10) */}
        {shadowAnalysis.lilithShadow && (
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{shadowAnalysis.lilithShadow.fusion?.icon}</span>
              <p className="text-purple-300 font-bold text-sm">{isKo ? '억압된 욕구 (Lilith)' : 'Suppressed Desires (Lilith)'}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">L10</span>
            </div>
            <div className="mb-2">
              <span className="text-white font-medium">Lilith × {shadowAnalysis.lilithShadow.element}</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-2">
              {isKo ? shadowAnalysis.lilithShadow.shadowSelf?.ko : shadowAnalysis.lilithShadow.shadowSelf?.en}
            </p>
            <p className="text-purple-400 text-xs">
              {isKo ? shadowAnalysis.lilithShadow.integration?.ko : shadowAnalysis.lilithShadow.integration?.en}
            </p>
          </div>
        )}

        {/* Part of Fortune 숨겨진 잠재력 (L10) */}
        {shadowAnalysis.hiddenPotential && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{shadowAnalysis.hiddenPotential.fusion?.icon}</span>
              <p className="text-amber-300 font-bold text-sm">{isKo ? '숨겨진 잠재력 (Part of Fortune)' : 'Hidden Potential (Part of Fortune)'}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">L10</span>
            </div>
            <div className="mb-2">
              <span className="text-white font-medium">Part of Fortune × {shadowAnalysis.hiddenPotential.element}</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              {isKo ? shadowAnalysis.hiddenPotential.potential?.ko : shadowAnalysis.hiddenPotential.potential?.en}
            </p>
          </div>
        )}
      </div>

      <p className="text-gray-500 text-xs mt-4">
        {isKo
          ? "* 그림자 자아를 인정하면 진정한 통합과 성장이 가능해요."
          : "* Acknowledging your shadow self enables true integration and growth."}
      </p>
    </div>
  );
}
