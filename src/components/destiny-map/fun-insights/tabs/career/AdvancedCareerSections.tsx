import type { CareerAdvancedResult } from '../../analyzers/matrixAnalyzer';

interface AdvancedCareerSectionsProps {
  advancedCareer: CareerAdvancedResult | null;
  isKo: boolean;
}

export default function AdvancedCareerSections({ advancedCareer, isKo }: AdvancedCareerSectionsProps) {
  if (!advancedCareer) return null;

  return (
    <>
      {/* ============================================================ */}
      {/* 고급 분석: 재물 패턴 (L2 기반) */}
      {/* ============================================================ */}
      {advancedCareer.wealthPattern && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-amber-900/20 border border-amber-500/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">💰</span>
              <h3 className="text-lg font-bold text-amber-300">
                {isKo ? "재물 패턴 매트릭스" : "Wealth Pattern Matrix"}
              </h3>
            </div>
            {advancedCareer.wealthPattern.score != null && (
              <div className="text-2xl font-bold text-amber-400">
                {advancedCareer.wealthPattern.score}<span className="text-sm text-amber-500">/10</span>
              </div>
            )}
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
            <p className="text-gray-300 text-sm leading-relaxed">
              {isKo ? advancedCareer.wealthPattern.style?.ko : advancedCareer.wealthPattern.style?.en}
            </p>
          </div>

          {advancedCareer.wealthPattern.sibsinWealth && advancedCareer.wealthPattern.sibsinWealth.length > 0 && (
            <div className="space-y-3">
              <p className="text-yellow-300 font-bold text-sm">
                🔮 {isKo ? "십신 × 행성 재물 분석" : "Sibsin × Planet Wealth Analysis"}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {advancedCareer.wealthPattern.sibsinWealth.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{item.fusion.icon}</span>
                      <span className="font-bold text-yellow-300">{item.sibsin}</span>
                      <span className="text-gray-400">×</span>
                      <span className="text-gray-300">{item.planet}</span>
                    </div>
                    <p className="text-gray-400 text-xs">
                      {isKo ? item.fusion.keyword.ko : item.fusion.keyword.en}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 고급 분석: 성공 타이밍 (L4 기반) */}
      {/* ============================================================ */}
      {advancedCareer.successTiming && advancedCareer.successTiming.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-blue-900/20 border border-blue-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">⏰</span>
            <h3 className="text-lg font-bold text-blue-300">
              {isKo ? "성공 타이밍 분석" : "Success Timing Analysis"}
            </h3>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            {isKo
              ? "대운과 트랜짓을 조합해 최적의 성공 시기를 분석했어요."
              : "Analyzed optimal success timing by combining Daeun and transits."}
          </p>

          <div className="space-y-3">
            {advancedCareer.successTiming?.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{item.fusion.icon}</span>
                  <span className="font-bold text-blue-300">{item.timing}</span>
                  <span className="text-gray-400">×</span>
                  <span className="text-gray-300">{item.transit}</span>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                    item.fusion.score >= 7 ? 'bg-green-500/30 text-green-300' :
                    item.fusion.score >= 4 ? 'bg-yellow-500/30 text-yellow-300' : 'bg-red-500/30 text-red-300'
                  }`}>
                    {item.fusion.level}
                  </span>
                </div>
                <p className="text-gray-300 text-sm">
                  {isKo ? item.advice.ko : item.advice.en}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 고급 분석: 커리어 프로그레션 (L7 기반) */}
      {/* ============================================================ */}
      {advancedCareer.careerProgression && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-violet-900/20 border border-violet-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🎯</span>
            <h3 className="text-lg font-bold text-violet-300">
              {isKo ? "커리어 프로그레션" : "Career Progression"}
            </h3>
          </div>

          <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{advancedCareer.careerProgression.fusion.icon}</span>
              <span className="font-bold text-violet-300">{advancedCareer.careerProgression.geokguk}</span>
              <span className="text-gray-400">×</span>
              <span className="text-gray-300">{advancedCareer.careerProgression.progression}</span>
            </div>
            <p className="text-gray-300 text-sm mb-2">
              {isKo ? advancedCareer.careerProgression.fusion.keyword.ko : advancedCareer.careerProgression.fusion.keyword.en}
            </p>
            <p className="text-violet-200 text-sm font-medium">
              {isKo ? advancedCareer.careerProgression.direction.ko : advancedCareer.careerProgression.direction.en}
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 고급 분석: 귀인운 (L8 기반) */}
      {/* ============================================================ */}
      {advancedCareer.nobleHelp && advancedCareer.nobleHelp.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-green-900/20 border border-green-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🤝</span>
            <h3 className="text-lg font-bold text-green-300">
              {isKo ? "귀인운 & 도움운" : "Noble Help & Support Fortune"}
            </h3>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            {isKo
              ? "당신에게 도움을 주는 귀인의 패턴이에요. 어려울 때 나타나는 도움이에요."
              : "Patterns of noble helpers who support you. Help that appears in difficult times."}
          </p>

          <div className="space-y-3">
            {advancedCareer.nobleHelp?.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{item.fusion.icon}</span>
                  <span className="font-bold text-green-300">{item.shinsal}</span>
                  <span className="text-gray-400">×</span>
                  <span className="text-gray-300">{item.planet}</span>
                </div>
                <p className="text-gray-300 text-sm">
                  {isKo ? item.blessing.ko : item.blessing.en}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 고급 분석: 행운 포인트 (L10 기반) */}
      {/* ============================================================ */}
      {advancedCareer.fortunePoint && (
        <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-yellow-900/20 border border-yellow-500/30 p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🍀</span>
            <h3 className="text-lg font-bold text-yellow-300">
              {isKo ? "행운의 포인트" : "Fortune Point"}
            </h3>
          </div>

          <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{advancedCareer.fortunePoint.fusion.icon}</span>
              <span className="font-bold text-yellow-300 text-lg">Part of Fortune × {advancedCareer.fortunePoint.element}</span>
            </div>
            <p className="text-gray-300 text-sm mb-2">
              {isKo ? advancedCareer.fortunePoint.fusion.keyword.ko : advancedCareer.fortunePoint.fusion.keyword.en}
            </p>
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-yellow-200 text-sm">
                ✨ {isKo ? advancedCareer.fortunePoint.luckyArea.ko : advancedCareer.fortunePoint.luckyArea.en}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
