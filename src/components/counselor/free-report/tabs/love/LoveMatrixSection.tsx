import type { LoveMatrixResult } from '../../analyzers/matrixAnalyzer';

interface LoveMatrixSectionProps {
  loveMatrix: LoveMatrixResult;
  isKo: boolean;
}

export default function LoveMatrixSection({ loveMatrix, isKo }: LoveMatrixSectionProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-fuchsia-900/20 border border-fuchsia-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">🔮</span>
        <h3 className="text-lg font-bold text-fuchsia-300">{isKo ? "동서양 사랑 매트릭스" : "East-West Love Matrix"}</h3>
      </div>

      {/* 사랑 점수 & 메시지 */}
      <div className="p-4 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-fuchsia-300 font-bold text-sm">{isKo ? "사랑 에너지 점수" : "Love Energy Score"}</p>
          <span className="text-2xl font-bold text-fuchsia-400">{loveMatrix.loveScore}점</span>
        </div>
        <div className="h-3 bg-gray-800/50 rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-400 transition-all duration-700"
            style={{ width: `${loveMatrix.loveScore}%` }}
          />
        </div>
        <p className="text-gray-300 text-sm leading-relaxed">
          {isKo ? loveMatrix.loveMessage.ko : loveMatrix.loveMessage.en}
        </p>
      </div>

      {/* 신살-행성 분석 (도화살, 홍염살 etc) */}
      {loveMatrix.shinsalLove.length > 0 && (
        <div className="space-y-3 mb-4">
          <p className="text-pink-300 font-bold text-sm flex items-center gap-2">
            <span>✧</span>
            {isKo ? "사랑 운명의 별" : "Stars of Love Destiny"}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {loveMatrix.shinsalLove.slice(0, 6).map((item, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border ${
                  item.fusion.level === 'extreme'
                    ? 'bg-pink-500/15 border-pink-500/30'
                    : item.fusion.level === 'amplify'
                    ? 'bg-rose-500/15 border-rose-500/30'
                    : item.fusion.level === 'conflict'
                    ? 'bg-orange-500/15 border-orange-500/30'
                    : 'bg-gray-500/15 border-gray-500/30'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{item.fusion.icon}</span>
                  <span className="text-white font-bold text-sm">{item.shinsal}</span>
                  <span className="text-gray-400">×</span>
                  <span className="text-pink-300 text-sm">{item.planet}</span>
                </div>
                <p className="text-gray-300 text-xs leading-relaxed mb-1">
                  {isKo ? item.fusion.keyword.ko : item.fusion.keyword.en}
                </p>
                <p className="text-gray-500 text-xs">
                  {isKo ? item.shinsalInfo.effect : item.shinsalInfo.effectEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 소행성-하우스 분석 (Juno, Ceres) */}
      {loveMatrix.asteroidLove.length > 0 && (
        <div className="space-y-3">
          <p className="text-purple-300 font-bold text-sm flex items-center gap-2">
            <span>☄️</span>
            {isKo ? "결혼/헌신 소행성" : "Marriage & Devotion Asteroids"}
          </p>
          <div className="space-y-3">
            {loveMatrix.asteroidLove.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{item.fusion.icon}</span>
                  <span className="text-white font-bold text-sm">
                    {isKo ? item.asteroidInfo.ko : item.asteroidInfo.en}
                  </span>
                  <span className="text-gray-400">×</span>
                  <span className="text-purple-300 text-sm">{item.house}{isKo ? '하우스' : 'H'}</span>
                  <span className="text-gray-500 text-xs">({item.lifeArea})</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-1">
                  {isKo ? item.fusion.keyword.ko : item.fusion.keyword.en}
                </p>
                <p className="text-gray-400 text-xs">
                  {isKo ? item.asteroidInfo.theme : item.asteroidInfo.themeEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-gray-500 text-xs mt-4">
        {isKo
          ? "* 동양 신살(도화살 등)과 서양 행성/소행성의 융합 분석입니다."
          : "* Fusion analysis of Eastern Shinsal and Western planets/asteroids."}
      </p>
    </div>
  );
}
