import type { LoveTimingResult } from '../../analyzers/matrixAnalyzer';

interface LoveTimingSectionProps {
  loveTiming: LoveTimingResult;
  isKo: boolean;
}

export default function LoveTimingSection({ loveTiming, isKo }: LoveTimingSectionProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-pink-900/20 border border-pink-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">⏰</span>
        <h3 className="text-lg font-bold text-pink-300">{isKo ? '연애 타이밍 매트릭스' : 'Love Timing Matrix'}</h3>
      </div>

      {/* 종합 연애 타이밍 점수 */}
      <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/20 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-pink-300 font-bold text-sm">{isKo ? '현재 연애 타이밍 점수' : 'Current Love Timing Score'}</p>
          <span className="text-2xl font-bold text-pink-400">{loveTiming.timingScore}{isKo ? '점' : 'pts'}</span>
        </div>
        <div className="h-3 bg-gray-800/50 rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400 transition-all duration-700"
            style={{ width: `${loveTiming.timingScore}%` }}
          />
        </div>
        <p className="text-gray-300 text-sm leading-relaxed">
          {isKo ? loveTiming.timingMessage?.ko : loveTiming.timingMessage?.en}
        </p>
      </div>

      <div className="space-y-4">
        {/* 연애 타이밍 분석 (L4) */}
        {loveTiming.romanticTiming && loveTiming.romanticTiming.length > 0 && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💕</span>
              <p className="text-rose-300 font-bold text-sm">{isKo ? '연애 타이밍 흐름' : 'Romantic Timing Flow'}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">L4</span>
            </div>
            <div className="space-y-3">
              {loveTiming.romanticTiming.slice(0, 3).map((timing, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-gray-800/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{timing.fusion.icon}</span>
                    <span className="text-white font-medium text-sm">{timing.timing}</span>
                    <span className="text-gray-400">×</span>
                    <span className="text-rose-300 text-sm">{timing.transit}</span>
                  </div>
                  <p className="text-gray-300 text-xs leading-relaxed mb-1">
                    {isKo ? timing.fusion.keyword.ko : timing.fusion.keyword.en}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {isKo ? timing.advice.ko : timing.advice.en}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 관계 패턴 분석 (L5) */}
        {loveTiming.relationshipPattern && loveTiming.relationshipPattern.length > 0 && (
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🔗</span>
              <p className="text-purple-300 font-bold text-sm">{isKo ? '관계 패턴 매트릭스' : 'Relationship Pattern Matrix'}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">L5</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {loveTiming.relationshipPattern.slice(0, 4).map((pattern, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-gray-800/30">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{pattern.fusion.icon}</span>
                    <span className="text-white font-medium text-sm">{pattern.relation}</span>
                    <span className="text-gray-400">×</span>
                    <span className="text-purple-300 text-sm">{pattern.aspect}</span>
                  </div>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    {isKo ? pattern.meaning.ko : pattern.meaning.en}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Vertex 운명적 만남 (L10) */}
        {loveTiming.destinyMeeting && (
          <div className="p-4 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{loveTiming.destinyMeeting.fusion.icon}</span>
              <p className="text-fuchsia-300 font-bold text-sm">{isKo ? '운명의 만남 포인트' : 'Fated Meeting Point'}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300">L10</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white font-medium">Vertex × {loveTiming.destinyMeeting.element}</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed mb-2">
              {isKo ? loveTiming.destinyMeeting.fusion.keyword.ko : loveTiming.destinyMeeting.fusion.keyword.en}
            </p>
            <p className="text-fuchsia-400 text-xs">
              {isKo ? loveTiming.destinyMeeting.prediction.ko : loveTiming.destinyMeeting.prediction.en}
            </p>
          </div>
        )}
      </div>

      <p className="text-gray-500 text-xs mt-4">
        {isKo
          ? "* 역행, 지지관계, 운명점 등 복합 분석입니다."
          : "* Complex analysis of retrogrades, relations, and fate points."}
      </p>
    </div>
  );
}
