import type { HiddenSelfAnalysis } from './types';
import { ensureMinSentenceText } from '../shared/textDepth';

interface UnconsciousPatternCardProps {
  twelfthHouse: NonNullable<HiddenSelfAnalysis['twelfthHouse']>;
  isKo: boolean;
}

export default function UnconsciousPatternCard({ twelfthHouse, isKo }: UnconsciousPatternCardProps) {
  const enrich = (text?: string, topic: 'hidden' | 'healing' = 'hidden', min = 4) =>
    ensureMinSentenceText(text || '', isKo, topic, min);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-cyan-900/20 border border-cyan-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{twelfthHouse.icon}</span>
        <div>
          <h3 className="text-lg font-bold text-cyan-300">{isKo ? '무의식 패턴 (12하우스)' : 'Unconscious Pattern (12th House)'}</h3>
          <p className="text-gray-500 text-xs">{isKo ? '숨겨진 두려움과 영적 잠재력' : 'Hidden fears and spiritual potential'}</p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
        <p className="text-gray-300 text-sm leading-relaxed mb-3">
          {enrich(isKo ? twelfthHouse.description.ko : twelfthHouse.description.en, 'hidden', 4)}
        </p>
        <div className="p-3 rounded-lg bg-cyan-500/15 border border-cyan-500/25">
          <p className="text-cyan-300 text-xs font-bold mb-1">{isKo ? '🌊 접근 방법' : '🌊 Approach'}</p>
          <p className="text-gray-300 text-xs">
            {enrich(isKo ? twelfthHouse.advice.ko : twelfthHouse.advice.en, 'healing', 4)}
          </p>
        </div>
      </div>
    </div>
  );
}
