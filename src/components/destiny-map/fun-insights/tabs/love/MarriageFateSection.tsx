import type { LoveAnalysis } from './types';

interface MarriageFateSectionProps {
  loveAnalysis: LoveAnalysis;
  isKo: boolean;
}

export default function MarriageFateSection({ loveAnalysis, isKo }: MarriageFateSectionProps) {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-purple-900/20 border border-purple-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">💍</span>
        <h3 className="text-lg font-bold text-purple-300">{isKo ? "결혼 & 운명적 만남" : "Marriage & Fated Meetings"}</h3>
      </div>

      <div className="space-y-4">
        {/* Juno - 결혼 이상형 */}
        {loveAnalysis.junoPartner && (
          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <p className="text-purple-300 font-bold text-sm mb-2">👰 {isKo ? "결혼 이상형 (Juno)" : "Marriage Ideal (Juno)"}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.junoPartner}</p>
          </div>
        )}

        {/* Vertex - 운명적 만남 장소 */}
        {loveAnalysis.vertexMeeting && (
          <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-indigo-300 font-bold text-sm mb-2">🌟 {isKo ? "운명적 만남이 오는 곳" : "Where Fate Awaits"}</p>
            <p className="text-gray-300 text-sm leading-relaxed">{loveAnalysis.vertexMeeting}</p>
          </div>
        )}
      </div>
    </div>
  );
}
