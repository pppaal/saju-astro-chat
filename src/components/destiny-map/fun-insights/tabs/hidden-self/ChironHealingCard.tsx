import type { HiddenSelfAnalysis } from './types';
import { ensureMinSentenceText } from '../shared/textDepth';

interface ChironHealingCardProps {
  chiron: NonNullable<HiddenSelfAnalysis['chiron']>;
  isKo: boolean;
}

export default function ChironHealingCard({ chiron, isKo }: ChironHealingCardProps) {
  const enrich = (text?: string, topic: 'healing' | 'hidden' = 'healing', min = 4) =>
    ensureMinSentenceText(text || '', isKo, topic, min);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-teal-900/20 border border-teal-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{chiron.icon}</span>
        <div>
          <h3 className="text-lg font-bold text-teal-300">{isKo ? '치유 포인트 (Chiron)' : 'Healing Point (Chiron)'}</h3>
          <p className="text-gray-500 text-xs">{isKo ? '상처와 치유, 그리고 치유자의 선물' : 'Wound, healing, and the healer\'s gift'}</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 ml-auto">L10</span>
      </div>

      <div className="space-y-3">
        {/* 상처 */}
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💔</span>
            <p className="text-rose-300 font-bold text-sm">{isKo ? '핵심 상처' : 'Core Wound'}</p>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            {enrich(isKo ? chiron.wound.ko : chiron.wound.en, 'healing', 4)}
          </p>
        </div>

        {/* 치유 */}
        <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🌿</span>
            <p className="text-teal-300 font-bold text-sm">{isKo ? '치유 경로' : 'Healing Path'}</p>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            {enrich(isKo ? chiron.healing.ko : chiron.healing.en, 'healing', 4)}
          </p>
        </div>

        {/* 선물 */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🎁</span>
            <p className="text-amber-300 font-bold text-sm">{isKo ? '치유자의 선물' : 'Healer\'s Gift'}</p>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            {enrich(isKo ? chiron.gift.ko : chiron.gift.en, 'hidden', 4)}
          </p>
        </div>
      </div>
    </div>
  );
}
