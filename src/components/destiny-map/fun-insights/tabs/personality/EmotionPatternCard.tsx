import type { TabProps } from '../types';

interface EmotionPatternCardProps {
  destinyNarrative: TabProps['destinyNarrative'];
  isKo: boolean;
}

export default function EmotionPatternCard({ destinyNarrative, isKo }: EmotionPatternCardProps) {
  if (!destinyNarrative?.emotionPattern) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-cyan-900/20 border border-cyan-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">💭</span>
        <h3 className="text-lg font-bold text-cyan-300">{isKo ? "내 마음은 이렇게 움직여요" : "How My Heart Moves"}</h3>
      </div>
      <p className="text-gray-200 text-sm leading-relaxed mb-3">
        {isKo ? destinyNarrative.emotionPattern.ko : destinyNarrative.emotionPattern.en}
      </p>
      <p className="text-gray-400 text-xs leading-relaxed">
        {isKo ? destinyNarrative.emotionPattern.koDetail : destinyNarrative.emotionPattern.enDetail}
      </p>
    </div>
  );
}
