import type { HiddenSelfAnalysis } from './types';

interface ShadowEnergyScoreProps {
  hiddenSelf: HiddenSelfAnalysis;
  isKo: boolean;
}

export default function ShadowEnergyScore({ hiddenSelf, isKo }: ShadowEnergyScoreProps) {
  return (
    <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/30 mb-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-gray-300 font-bold text-sm">{isKo ? '숨겨진 자아 에너지' : 'Hidden Self Energy'}</p>
        <span className="text-2xl font-bold text-gray-400">{hiddenSelf.shadowScore}{isKo ? '점' : 'pts'}</span>
      </div>
      <div className="h-3 bg-gray-900/50 rounded-full overflow-hidden mb-2">
        <div
          className="h-full rounded-full bg-gradient-to-r from-purple-600 to-gray-500 transition-all duration-700"
          style={{ width: `${hiddenSelf.shadowScore}%` }}
        />
      </div>
      <p className="text-gray-400 text-sm leading-relaxed">
        {isKo ? hiddenSelf.shadowMessage.ko : hiddenSelf.shadowMessage.en}
      </p>
    </div>
  );
}
