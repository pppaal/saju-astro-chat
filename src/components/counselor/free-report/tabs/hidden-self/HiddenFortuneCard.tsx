import type { HiddenSelfAnalysis } from './types';
import { ensureMinSentenceText } from '../shared/textDepth';

interface HiddenFortuneCardProps {
  hiddenPotential: NonNullable<HiddenSelfAnalysis['hiddenPotential']>;
  isKo: boolean;
}

export default function HiddenFortuneCard({ hiddenPotential, isKo }: HiddenFortuneCardProps) {
  const enrich = (text?: string, min = 4) =>
    ensureMinSentenceText(text || '', isKo, 'hidden', min);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-amber-900/20 border border-amber-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{hiddenPotential.icon}</span>
        <div>
          <h3 className="text-lg font-bold text-amber-300">{isKo ? '숨겨진 행운 (Part of Fortune)' : 'Hidden Fortune (Part of Fortune)'}</h3>
          <p className="text-gray-500 text-xs">{isKo ? '물질적 성공과 행운이 숨어있는 영역' : 'Area where material success and luck hide'}</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 ml-auto">L10</span>
      </div>

      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{hiddenPotential.fusion?.icon}</span>
          <span className="text-white font-medium">Part of Fortune × {hiddenPotential.element}</span>
        </div>
        <p className="text-gray-300 text-sm leading-relaxed mb-3">
          {enrich(isKo ? hiddenPotential.description?.ko : hiddenPotential.description?.en, 4)}
        </p>
        <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/25">
          <p className="text-amber-300 text-xs font-bold mb-1">{isKo ? '✨ 활성화 방법' : '✨ Activation'}</p>
          <p className="text-gray-300 text-xs">
            {enrich(isKo ? hiddenPotential.activation?.ko : hiddenPotential.activation?.en, 4)}
          </p>
        </div>
      </div>
    </div>
  );
}
