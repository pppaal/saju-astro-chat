import type { CareerMatrixResult } from '../../analyzers';

interface CareerMatrixSectionProps {
  careerMatrix: CareerMatrixResult | null;
  isKo: boolean;
}

export default function CareerMatrixSection({ careerMatrix, isKo }: CareerMatrixSectionProps) {
  if (!careerMatrix || careerMatrix.sibsinCareer.length === 0) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-indigo-900/20 border border-indigo-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🎯</span>
        <h3 className="text-lg font-bold text-indigo-300">{isKo ? "동서양 커리어 매트릭스" : "East-West Career Matrix"}</h3>
      </div>

      {/* 커리어 점수 & 메시지 */}
      <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-indigo-300 font-bold text-sm">{isKo ? "커리어 에너지 점수" : "Career Energy Score"}</p>
          <span className="text-2xl font-bold text-indigo-400">{careerMatrix.careerScore}점</span>
        </div>
        <div className="h-3 bg-gray-800/50 rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-400 transition-all duration-700"
            style={{ width: `${careerMatrix.careerScore}%` }}
          />
        </div>
        <p className="text-gray-300 text-sm leading-relaxed">
          {isKo ? careerMatrix.careerMessage.ko : careerMatrix.careerMessage.en}
        </p>
      </div>

      {/* 커리어 강점 */}
      {careerMatrix.careerStrengths.length > 0 && (
        <div className="mb-4">
          <p className="text-blue-300 font-bold text-sm flex items-center gap-2 mb-3">
            <span>⚡</span>
            {isKo ? "핵심 커리어 강점" : "Core Career Strengths"}
          </p>
          <div className="flex flex-wrap gap-2">
            {careerMatrix.careerStrengths.map((item, idx) => (
              <span
                key={idx}
                className="px-3 py-2 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm flex items-center gap-2"
              >
                <span>{item.icon}</span>
                <span>{item.area}</span>
                <span className="text-xs text-blue-400">({item.score}점)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 십신-하우스 매트릭스 그리드 */}
      <div className="space-y-3">
        <p className="text-cyan-300 font-bold text-sm flex items-center gap-2">
          <span>🔮</span>
          {isKo ? "십신 × 하우스 시너지" : "Sibsin × House Synergy"}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {careerMatrix.sibsinCareer.slice(0, 9).map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border ${
                item.fusion.level === 'extreme'
                  ? 'bg-indigo-500/15 border-indigo-500/30'
                  : item.fusion.level === 'amplify'
                  ? 'bg-blue-500/15 border-blue-500/30'
                  : item.fusion.level === 'conflict'
                  ? 'bg-orange-500/15 border-orange-500/30'
                  : item.fusion.level === 'clash'
                  ? 'bg-red-500/15 border-red-500/30'
                  : 'bg-gray-500/15 border-gray-500/30'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{item.fusion.icon}</span>
                <span className="text-white font-bold text-sm">{item.sibsin}</span>
                <span className="text-gray-400">×</span>
                <span className="text-cyan-300 text-sm">{item.house}H</span>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed mb-1">
                {isKo ? item.fusion.keyword.ko : item.fusion.keyword.en}
              </p>
              <div className="flex items-center gap-1 text-gray-500 text-xs">
                <span>{isKo ? item.sibsinKeyword.ko : item.sibsinKeyword.en}</span>
                <span>+</span>
                <span>{isKo ? item.houseKeyword.ko : item.houseKeyword.en}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-gray-500 text-xs mt-4">
        {isKo
          ? "* 동양 십신과 서양 하우스의 융합 분석으로 커리어 에너지를 파악해요."
          : "* Fusion analysis of Eastern Sibsin and Western Houses reveals career energy."}
      </p>
    </div>
  );
}
